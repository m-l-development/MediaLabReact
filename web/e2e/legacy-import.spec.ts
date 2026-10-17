import fs from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { png } from './png'

/*
 * Import av prosjekter og filer fra forrige versjon (dagens app, media-lab) – i ekte Chrome med ekte IndexedDB.
 * Dataene lages slik dagens app lagrer dem: Photo Design og Thumbnail Studio via sikkerhetskopien i dagens format
 * (`app: 'photodesign'|'thumbstudio', v: 1`), som legges inn i de gamle databasene; Motion, Mockups og Dine medier
 * med postformatet fra media-lab/src/legacy/*. Hver gamle database får også en ugyldig post.
 * Kontrollerer: import ved åpning (eller tilbud med knapp), innholdet kan åpnes og redigeres, ingen dobling ved ny
 * åpning, originalene er urørt, ugyldige poster hoppes over uten feil.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'Testes på PC'))

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Ny, tom nettleserprofil med gamle data lagt inn før den nye appen åpnes. */
async function legacyPage(browser: Browser, baseURL: string, seed: (arg: unknown) => Promise<void>, arg: unknown) {
  const ctx = await browser.newContext({ baseURL })
  const page = await ctx.newPage()
  await page.goto('/app/')
  await page.evaluate(seed, arg)
  return { ctx, page }
}

/** Antall poster i en gammel database (originalene skal være urørt). */
const count = (page: Page, db: string, store: string) =>
  page.evaluate(([d, s]) => new Promise<number>((res, rej) => {
    const r = indexedDB.open(d as string)
    r.onsuccess = () => { const q = r.result.transaction(s as string).objectStore(s as string).count(); q.onsuccess = () => { res(q.result); r.result.close() }; q.onerror = () => rej(q.error) }
    r.onerror = () => rej(r.error)
  }), [db, store])

const dataUrlToBytes = (u: string) => [...Buffer.from(u.split(',')[1] ?? '', 'base64')]

test('Photo Design: prosjekt fra forrige versjon hentes, kan åpnes og redigeres, ingen dobling, originalen urørt', async ({ page, browser }, info) => {
  test.slow()
  // 1. lag et ekte prosjekt og hent sikkerhetskopien i dagens format
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await chooser).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(300, 300, () => [230, 20, 20, 255]) })
  await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
  await page.locator('textarea[data-pd-text]').fill('Gammel overskrift')
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.goto('/app/photo-design')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned sikkerhetskopi' }).click()
  const backup = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8')) as { app: string; projects: Record<string, unknown>[]; media: Record<string, string> }
  expect(backup.app).toBe('photodesign')
  expect(backup.projects).toHaveLength(1)
  const name = String(backup.projects[0]?.name)
  const media = Object.fromEntries(Object.entries(backup.media).map(([k, v]) => [k, { type: v.slice(5, v.indexOf(';')), bytes: dataUrlToBytes(v) }]))

  // 2. ny nettleserprofil: dagens database med prosjektet (+ en ugyldig post)
  const { ctx, page: p } = await legacyPage(browser, info.project.use.baseURL as string, async (a) => {
    const { projects, media } = a as { projects: Record<string, unknown>[]; media: Record<string, { type: string; bytes: number[] }> }
    await new Promise<void>((res, rej) => {
      const r = indexedDB.open('photodesign', 1)
      r.onupgradeneeded = () => { r.result.createObjectStore('projects', { keyPath: 'id' }); r.result.createObjectStore('media') }
      r.onsuccess = () => {
        const tx = r.result.transaction(['projects', 'media'], 'readwrite')
        for (const pr of projects) tx.objectStore('projects').put(pr)
        tx.objectStore('projects').put({ id: 'ugyldig', name: 'Ødelagt' })
        for (const [k, m] of Object.entries(media)) tx.objectStore('media').put(new Blob([new Uint8Array(m.bytes)], { type: m.type }), k)
        tx.oncomplete = () => { r.result.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
      r.onerror = () => rej(r.error)
    })
  }, { projects: backup.projects, media })
  const errors = await errorsOf(p)
  await p.goto('/app/photo-design')
  await expect(p.getByText(/1 prosjekter er hentet fra forrige versjon/)).toBeVisible({ timeout: 20_000 })
  await expect(p.locator('[data-project]')).toHaveCount(1)
  await expect(p.locator(`[data-project="${name}"]`)).toBeVisible()
  // åpnes og redigeres
  await p.getByRole('button', { name, exact: true }).click()
  await expect(p.locator('[data-pd-view="edit"]')).toBeVisible()
  const text = p.locator('textarea[data-pd-text]')
  if (!(await text.isVisible())) await p.locator('[data-layer]').filter({ hasText: 'Gammel overskrift' }).first().click()
  await expect(text).toHaveValue('Gammel overskrift')
  await text.fill('Redigert etter import')
  await p.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(p.getByText('Prosjektet er lagret.')).toBeVisible()
  // bildet fulgte med (rødt i lerretet)
  const red = await p.locator('canvas').evaluateAll((cs) => cs.some((el) => { const c = el as HTMLCanvasElement; const g = c.getContext('2d'); if (!g || !c.width) return false; for (let y = 1; y < 10; y++) for (let x = 1; x < 10; x++) { const d = g.getImageData(Math.floor((c.width * x) / 10), Math.floor((c.height * y) / 10), 1, 1).data; if ((d[0] ?? 0) > 150 && (d[1] ?? 0) < 90 && (d[2] ?? 0) < 90) return true } return false }))
  expect(red).toBe(true)
  // ingen dobling ved ny åpning, originalen urørt
  await p.goto('/app/photo-design')
  await p.waitForTimeout(1500)
  await expect(p.locator('[data-project]')).toHaveCount(1)
  expect(await count(p, 'photodesign', 'projects')).toBe(2)
  expect(await count(p, 'photodesign', 'media')).toBe(Object.keys(media).length)
  expect(errors).toEqual([])
  await ctx.close()
})

test('Thumbnail Studio: mal og kategori fra forrige versjon hentes, kan åpnes og redigeres, ingen dobling', async ({ page, browser }, info) => {
  test.slow()
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await page.getByRole('textbox', { name: 'Navn', exact: true }).fill('Kari\nGammel')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await chooser).setFiles({ name: 'person.png', mimeType: 'image/png', buffer: png(200, 300, () => [20, 200, 40, 255]) })
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.goto('/app/thumbnail-studio')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned sikkerhetskopi' }).click()
  const backup = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8')) as { app: string; cats: unknown[]; tpls: Record<string, unknown>[]; images: Record<string, string> }
  expect(backup.app).toBe('thumbstudio')
  expect(backup.tpls).toHaveLength(1)
  const tplName = String(backup.tpls[0]?.name)
  const images = Object.fromEntries(Object.entries(backup.images).map(([k, v]) => [k, { type: v.slice(5, v.indexOf(';')), bytes: dataUrlToBytes(v) }]))
  expect(Object.keys(images).length).toBeGreaterThan(0)

  const { ctx, page: p } = await legacyPage(browser, info.project.use.baseURL as string, async (a) => {
    const { cats, tpls, images } = a as { cats: unknown[]; tpls: unknown[]; images: Record<string, { type: string; bytes: number[] }> }
    await new Promise<void>((res, rej) => {
      const r = indexedDB.open('thumbstudio', 1)
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('img') }
      r.onsuccess = () => {
        const tx = r.result.transaction(['kv', 'img'], 'readwrite')
        tx.objectStore('kv').put(cats, 'cats')
        tx.objectStore('kv').put([...tpls, { id: 'ugyldig' }], 'tpls')
        for (const [k, m] of Object.entries(images)) tx.objectStore('img').put(new Blob([new Uint8Array(m.bytes)], { type: m.type }), k)
        tx.oncomplete = () => { r.result.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
      r.onerror = () => rej(r.error)
    })
  }, { cats: backup.cats, tpls: backup.tpls, images })
  const errors = await errorsOf(p)
  await p.goto('/app/thumbnail-studio')
  await expect(p.getByText(/1 maler er hentet fra forrige versjon/)).toBeVisible({ timeout: 20_000 })
  await p.getByRole('button', { name: /Søndagsmøte/ }).click()
  await expect(p.getByRole('button', { name: tplName, exact: true })).toHaveCount(1)
  await p.getByRole('button', { name: tplName, exact: true }).click()
  await expect(p.locator('[data-ts-view="edit"]')).toBeVisible()
  await expect(p.getByRole('textbox', { name: 'Navn', exact: true })).toHaveValue('Kari\nGammel')
  await p.getByRole('textbox', { name: 'Navn', exact: true }).fill('Kari\nRedigert')
  await p.getByRole('button', { name: 'Lagre mal' }).click()
  await p.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: /Lagre( endringene| over)?/ }).first().click()
  await expect(p.getByText('Malen er lagret.')).toBeVisible()
  await p.goto('/app/thumbnail-studio?cat=sunday')
  await p.waitForTimeout(1500)
  await expect(p.getByRole('button', { name: tplName, exact: true })).toHaveCount(1)
  expect(await count(p, 'thumbstudio', 'img')).toBe(Object.keys(images).length)
  expect(errors).toEqual([])
  await ctx.close()
})

test('Motion design: prosjekt fra forrige versjon hentes med bilde og tekst, manglende video beholdes som tomt klipp', async ({ browser }, info) => {
  const img = [...png(64, 36, () => [30, 90, 220, 255])]
  const { ctx, page: p } = await legacyPage(browser, info.project.use.baseURL as string, async (a) => {
    const { img } = a as { img: number[] }
    await new Promise<void>((res, rej) => {
      const r = indexedDB.open('motiondesign', 1)
      r.onupgradeneeded = () => { r.result.createObjectStore('projects', { keyPath: 'id' }); r.result.createObjectStore('media') }
      r.onsuccess = () => {
        const tx = r.result.transaction(['projects', 'media'], 'readwrite')
        tx.objectStore('projects').put({
          id: 'p-gammel', name: 'Gammel promo', fmt: 'wide', w: 1920, h: 1080, created: 100, updated: 200,
          media: [{ id: 'm-a1', name: 'logo.png', kind: 'image', w: 64, h: 36 }, { id: 'm-borte', name: 'borte.mp4', kind: 'video', dur: 3 }],
          clips: [{ id: 'c1', kind: 'image', media: 'm-a1', dur: 3 }, { id: 'c2', kind: 'video', media: 'm-borte', in: 0, out: 3 }],
          texts: [{ id: 't1', text: 'Hei fra forrige versjon', start: 0, dur: 2 }],
          logo: { src: 'm-a1', on: true },
        })
        tx.objectStore('projects').put({ id: 'ugyldig' })
        tx.objectStore('media').put({ blob: new Blob([new Uint8Array(img)], { type: 'image/png' }), name: 'logo.png', type: 'image/png' }, 'm-a1')
        tx.oncomplete = () => { r.result.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
      r.onerror = () => rej(r.error)
    })
  }, { img })
  const errors = await errorsOf(p)
  await p.goto('/app/motion-design')
  await expect(p.getByText(/1 prosjekter er hentet fra forrige versjon/)).toBeVisible({ timeout: 20_000 })
  await expect(p.getByText('Gammel promo')).toHaveCount(1)
  await p.locator('div').filter({ hasText: /^Gammel promo/ }).getByRole('button', { name: 'Åpne', exact: true }).first().click()
  await expect(p.locator('[data-md-canvas]')).toBeVisible()
  await expect(p.locator('[data-block="clip"]')).toHaveCount(2)
  await p.getByRole('tab', { name: 'Tekst', exact: true }).first().click()
  await expect(p.getByText('Hei fra forrige versjon').first()).toBeVisible()
  await p.goto('/app/motion-design')
  await p.waitForTimeout(1500)
  await expect(p.getByText('Gammel promo')).toHaveCount(1)
  expect(await count(p, 'motiondesign', 'projects')).toBe(2)
  expect(await count(p, 'motiondesign', 'media')).toBe(1)
  expect(errors).toEqual([])
  await ctx.close()
})

test('Mockups og Dine medier: tilbud om å hente, hentes én gang, originalene urørt, ugyldige poster hoppes over', async ({ browser }, info) => {
  const mock = [...png(400, 300, () => [240, 240, 240, 255])]
  const file = [...png(120, 80, () => [200, 120, 20, 255])]
  const { ctx, page: p } = await legacyPage(browser, info.project.use.baseURL as string, async (a) => {
    const { mock, file } = a as { mock: number[]; file: number[] }
    const put = (db: string, store: string, rows: unknown[]) => new Promise<void>((res, rej) => {
      const r = indexedDB.open(db, 1)
      r.onupgradeneeded = () => r.result.createObjectStore(store, { keyPath: 'id' })
      r.onsuccess = () => { const tx = r.result.transaction(store, 'readwrite'); for (const x of rows) tx.objectStore(store).put(x); tx.oncomplete = () => { r.result.close(); res() }; tx.onerror = () => rej(tx.error) }
      r.onerror = () => rej(r.error)
    })
    await put('mockuplib', 'imgs', [
      { id: 'mk1', name: 'Min mockup', file: 'min-mockup.png', blob: new Blob([new Uint8Array(mock)], { type: 'image/png' }), t: 1 },
      { id: 'mk-bad', name: 'Uten bilde', t: 2 },
    ])
    await put('medialab-share', 'items', [
      { id: 'sh1', name: 'plakat.png', type: 'image/png', size: file.length, from: 'Photo design', created: 1700000000000, thumb: '', blob: new Blob([new Uint8Array(file)], { type: 'image/png' }) },
      { id: 'sh-bad', name: 'mangler.png', type: 'image/png', size: 0, created: 1 },
    ])
  }, { mock, file })
  const errors = await errorsOf(p)

  // Dine medier
  await p.goto('/app/medier')
  await expect(p.getByText(/har 1 fil\(er\) som ikke er hentet hit/)).toBeVisible({ timeout: 20_000 })
  await p.getByRole('button', { name: 'Hent filene' }).click()
  await expect(p.getByText(/1 fil\(er\) hentet\. 0 feilet/)).toBeVisible()
  await expect(p.getByText('plakat.png').first()).toBeVisible()
  await p.reload()
  await p.waitForTimeout(1500)
  await expect(p.getByText(/som ikke er hentet hit/)).toHaveCount(0)
  expect(await count(p, 'medialab-share', 'items')).toBe(2)

  // Mockups
  await p.goto('/app/mockups')
  await expect(p.getByText(/Dagens Mockups har 1 egne mockup-bilder/)).toBeVisible({ timeout: 20_000 })
  await p.getByRole('button', { name: 'Hent dem' }).click()
  await expect(p.getByText('1 mockup-bilde(r) lagt til.')).toBeVisible({ timeout: 20_000 })
  await expect(p.getByRole('button', { name: 'Fjern mockup-bildet' })).toHaveCount(1)
  await p.reload()
  await p.waitForTimeout(1500)
  await expect(p.getByText(/Dagens Mockups har/)).toHaveCount(0)
  await expect(p.getByRole('button', { name: 'Fjern mockup-bildet' })).toHaveCount(1)
  expect(await count(p, 'mockuplib', 'imgs')).toBe(2)
  expect(errors).toEqual([])
  await ctx.close()
})

test('når dagens data ikke kan leses, får brukeren en forståelig melding (Photo, Thumbnail, Motion)', async ({ page }) => {
  // de gamle databasene «finnes», men kan ikke åpnes (f.eks. blokkert av en annen fane)
  await page.addInitScript(() => {
    const names = ['photodesign', 'thumbstudio', 'motiondesign']
    const idb = indexedDB as IDBFactory & { databases: () => Promise<IDBDatabaseInfo[]> }
    const dbs = idb.databases.bind(idb), open = idb.open.bind(idb)
    idb.databases = async () => [...(await dbs()), ...names.map((name) => ({ name, version: 1 }))]
    idb.open = ((name: string, v?: number) => { if (names.includes(name)) throw new DOMException('blokkert', 'UnknownError'); return open(name, v) }) as typeof idb.open
  })
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  await expect(page.getByText(/Prosjektene fra forrige versjon kunne ikke hentes nå/)).toBeVisible({ timeout: 20_000 })
  await page.goto('/app/thumbnail-studio')
  await expect(page.getByText(/Malene fra forrige versjon kunne ikke hentes nå/)).toBeVisible({ timeout: 20_000 })
  await page.goto('/app/motion-design')
  await expect(page.getByText(/Prosjektene fra forrige versjon kunne ikke hentes nå/)).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})
