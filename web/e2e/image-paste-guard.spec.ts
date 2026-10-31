import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { logoPng, png } from './png'

/**
 * Innliming og slipp av bilder (shared/lib/paste.ts, 402f756): et bilde limt inn i et felt, en dialog eller
 * tilbakemeldingen (role=dialog + data-chfb, som det ekte skjemaet – se paste.test.ts) erstatter ikke arbeidsbildet.
 * Isolate Subject spør før et åpent bilde erstattes; avbrutt erstatning beholder bilde, maske og eksport. Hinteksten er
 * aldri i eksporten, og «Bruk i Thumbnail Studio» sender de eksporterte pikslene.
 */
test.skip(({ isMobile }) => isMobile, 'innliming og slipp testes på PC')

/** «Skjermbildet» som limes inn: 100 × 50, rødt. */
const SHOT = png(100, 50, () => [200, 30, 30, 255]).toString('base64')
const SHOT_NAME = 'Screenshot 2026-10-31 at 12.56.36.png'

/** Fokuserer og limer inn et bilde i elementet (CSS-velger), eller på siden når `sel` er null. */
async function pasteImage(page: Page, sel: string | null) {
  await page.evaluate(async ({ b64, name, sel: s }) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const dt = new DataTransfer()
    dt.items.add(new File([blob], name, { type: 'image/png' }))
    const el = s ? document.querySelector(s) : document.body
    if (!el) throw new Error('fant ikke ' + s)
    if (s) (el as HTMLElement).focus()
    else (document.activeElement as HTMLElement | null)?.blur()
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, { b64: SHOT, name: SHOT_NAME, sel })
}

/** Slipper et bilde på elementet. */
async function dropImage(page: Page, sel: string) {
  await page.evaluate(async ({ b64, name, sel: s }) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const dt = new DataTransfer()
    dt.items.add(new File([blob], name, { type: 'image/png' }))
    const el = document.querySelector(s)
    if (!el) throw new Error('fant ikke ' + s)
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, { b64: SHOT, name: SHOT_NAME, sel })
}

/** Felt og dialog som etterligner tilbakemeldingsskjemaet og et vanlig tekstfelt. */
async function addFields(page: Page) {
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.innerHTML = '<div role="dialog" data-chfb="" aria-label="Send tilbakemelding (test)"><textarea id="fb-text"></textarea><input id="fb-line"></div><input id="plain-input" aria-label="vanlig felt">'
    document.body.append(host)
  })
}

/** Leser størrelse og alfa i en PNG (andeler av bredde og høyde). */
async function pngInfo(page: Page, file: string, points: [number, number][]) {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, pts }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    return { w: bmp.width, h: bmp.height, a: pts.map(([x, y]) => d[(Math.floor(y * bmp.height) * bmp.width + Math.floor(x * bmp.width)) * 4 + 3] ?? -1) }
  }, { data: b64, pts: points })
}

async function download(page: Page, file: string) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const thanks = page.getByRole('button', { name: 'Nei takk' })
  if (await thanks.isVisible().catch(() => false)) await thanks.click()
}

async function isolateWithLogo(page: Page) {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logoPng() })
  await page.getByRole('button', { name: 'Hopp over' }).click()
}

const meta = (page: Page) => page.getByText(/^logo · 240 × 160$/)

test('Isolate: hinteksten er bare grensesnitt – eksporten har motivets piksler, gjennomsiktig der hintet står', async ({ page }, info) => {
  await isolateWithLogo(page)
  const hint = page.getByText('Trykk eller dra en firkant i bildet, eller velg type')
  await expect(hint).toBeVisible()
  // Hintet ligger over bildet nederst på midten; det er et eget element, ikke en del av lerretet.
  expect(await hint.evaluate((el) => el.tagName !== 'CANVAS' && !el.closest('canvas'))).toBe(true)
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(hint).toHaveCount(0)
  const file = info.outputPath('logo.png')
  await download(page, file)
  // logoPng: motivet i midten, ensfarget bakgrunn → gjennomsiktig. Nederste stripe (der hintet sto) skal være helt
  // gjennomsiktig, ikke en mørk «pille» med tekst.
  const band: [number, number][] = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7].flatMap((x) => [[x, 0.88], [x, 0.93], [x, 0.97]] as [number, number][])
  const r = await pngInfo(page, file, [[0.5, 0.5], ...band])
  expect([r.w, r.h]).toEqual([240, 160])
  expect(r.a[0]).toBe(255)
  expect(r.a.slice(1).every((a) => a === 0)).toBe(true)
})

test('Isolate: innliming i felt og dialoger erstatter ikke bildet; avbrutt erstatning beholder bilde, maske og eksport', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await isolateWithLogo(page)
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(meta(page)).toBeVisible()
  const before = info.outputPath('foer.png')
  await download(page, before)
  const pts: [number, number][] = [[0.02, 0.02], [0.5, 0.5], [0.9, 0.9]]
  const ref = await pngInfo(page, before, pts)
  expect(ref).toEqual({ w: 240, h: 160, a: [0, 255, 0] })

  const dialogs: string[] = []
  let answer = false
  page.on('dialog', (d) => {
    dialogs.push(d.message())
    void (answer ? d.accept() : d.dismiss())
  })

  // 1. Felt, tilbakemeldingsdialog: ingenting skjer, ingen spørsmål
  await addFields(page)
  for (const sel of ['#fb-text', '#fb-line', '#plain-input']) await pasteImage(page, sel)
  await page.waitForTimeout(400)
  expect(dialogs).toEqual([])
  await expect(meta(page)).toBeVisible()

  // 2. På siden: spørsmål med begge navnene; «Avbryt» beholder alt
  await pasteImage(page, null)
  await expect.poll(() => dialogs.length).toBe(1)
  expect(dialogs[0]).toContain('«logo»')
  expect(dialogs[0]).toContain(SHOT_NAME)
  await expect(meta(page)).toBeVisible()
  await expect(page.getByText('Beskjær bildet', { exact: true })).toHaveCount(0)

  // 3. Slipp på verktøyet: samme spørsmål; «Avbryt» beholder alt
  await dropImage(page, 'section[aria-label="logo"] canvas')
  await expect.poll(() => dialogs.length).toBe(2)
  await expect(meta(page)).toBeVisible()

  // Masken og eksporten er uendret etter de avbrutte erstatningene
  const after = info.outputPath('etter.png')
  await download(page, after)
  expect(await pngInfo(page, after, pts)).toEqual(ref)
  expect(fs.readFileSync(after).equals(fs.readFileSync(before))).toBe(true)

  // 4. Bekreftet erstatning: det nye bildet lastes (navn og størrelse fra filen), og beskjæringen starter
  answer = true
  await pasteImage(page, null)
  await expect.poll(() => dialogs.length).toBe(3)
  await expect(page.getByText('Beskjær bildet', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await expect(page.getByText(/^Screenshot 2026-10-31 at 12\.56\.36 · 100 × 50$/)).toBeVisible()
  expect(errors).toEqual([])
})

test('Isolate: «Nytt bilde» (eksplisitt valg) tømmer og lar deg velge et nytt bilde uten spørsmål, som før', async ({ page }) => {
  await isolateWithLogo(page)
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(meta(page)).toBeVisible()
  const dialogs: string[] = []
  page.on('dialog', (d) => {
    dialogs.push(d.message())
    void d.dismiss()
  })
  await page.getByRole('button', { name: 'Nytt bilde' }).first().click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'neste.png', mimeType: 'image/png', buffer: png(80, 60, () => [10, 10, 200, 255]) })
  await expect(page.getByText('Beskjær bildet', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await expect(page.getByText(/^neste · 80 × 60$/)).toBeVisible()
  expect(dialogs).toEqual([])
})

test('Isolate → «Bruk i Thumbnail Studio»: Thumbnail får de eksporterte pikslene (samme PNG som nedlastingen)', async ({ page }, info) => {
  await isolateWithLogo(page)
  await page.getByRole('button', { name: /^Logo/ }).click()
  const file = info.outputPath('eksport.png')
  await download(page, file)
  await page.getByRole('button', { name: 'Bruk i Thumbnail Studio' }).click()
  await expect(page).toHaveURL(/\/app\/thumbnail-studio\?asset=/)
  const id = new URL(page.url()).searchParams.get('asset')
  expect(id).toBeTruthy()
  // Thumbnail tar imot bildet og venter på en mal
  await expect(page.getByText('Velg en mal, så legges bildet inn.')).toBeVisible()
  // Det Thumbnail åpner (assets.open(id)), er nøyaktig den eksporterte PNG-en: les den fra appens lokale mediebase
  const got = await page.evaluate(async (assetId) => {
    const dbs = (await indexedDB.databases()).map((d) => d.name).filter((n): n is string => !!n && n.startsWith('medialab@'))
    for (const name of dbs) {
      const db = await new Promise<IDBDatabase>((ok, no) => { const r = indexedDB.open(name); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error) })
      const get = <T,>(store: string, key: IDBValidKey) => new Promise<T | undefined>((ok, no) => { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => ok(r.result as T); r.onerror = () => no(r.error) })
      const asset = await get<{ name: string; content: { hash: string; mime?: string } }>('assets', assetId)
      if (!asset) continue
      const stored = await get<unknown>('blobs', asset.content.hash)
      // media-db.ts: Blob, eller { bytes, type } der Blob ikke kan lagres
      const blob = stored instanceof Blob ? stored : stored && typeof stored === 'object' && 'bytes' in stored ? new Blob([(stored as { bytes: ArrayBuffer }).bytes]) : null
      if (!blob) return { name: asset.name, b64: null }
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of bytes) s += String.fromCharCode(b)
      return { name: asset.name, b64: btoa(s) }
    }
    return null
  }, id ?? '')
  expect(got?.name).toBe('logo-isolert.png')
  expect(got?.b64).toBeTruthy()
  const sent = Buffer.from(got?.b64 ?? '', 'base64')
  fs.writeFileSync(info.outputPath('sendt.png'), sent)
  const a = await pngInfo(page, file, [[0.02, 0.02], [0.5, 0.5], [0.5, 0.95]])
  const b = await pngInfo(page, info.outputPath('sendt.png'), [[0.02, 0.02], [0.5, 0.5], [0.5, 0.95]])
  expect(b).toEqual(a)
  expect(b).toEqual({ w: 240, h: 160, a: [0, 255, 0] })
})

test('Thumbnail, Mockups og Photo: innliming i felt og dialoger ignoreres; på siden tas bildet imot som før', async ({ page }) => {
  // Thumbnail Studio (startsiden: bildet venter på en mal)
  await page.goto('/app/thumbnail-studio')
  await addFields(page)
  for (const sel of ['#fb-text', '#plain-input']) await pasteImage(page, sel)
  await page.waitForTimeout(400)
  await expect(page.getByText('Velg en mal, så legges bildet inn.')).toHaveCount(0)
  await pasteImage(page, null)
  await expect(page.getByText('Velg en mal, så legges bildet inn.')).toBeVisible()

  // Mockups (innlimt bilde = design i alle mockupene)
  await page.goto('/app/mockups')
  await expect(page.getByRole('button', { name: /Bytt design|Velg design|Last opp/ }).first()).toBeVisible()
  await addFields(page)
  for (const sel of ['#fb-text', '#plain-input']) await pasteImage(page, sel)
  await page.waitForTimeout(600)
  await expect(page.getByText('Designet er lagt inn i alle mockupene. Velg den du vil bruke.')).toHaveCount(0)
  await pasteImage(page, null)
  await expect(page.getByText('Designet er lagt inn i alle mockupene. Velg den du vil bruke.')).toBeVisible()

  // Photo Design (innlimt bilde på startsiden = nytt prosjekt)
  await page.goto('/app/photo-design')
  await expect(page.locator('[data-pd-view="home"]')).toBeVisible()
  await addFields(page)
  for (const sel of ['#fb-text', '#plain-input']) await pasteImage(page, sel)
  await page.waitForTimeout(600)
  await expect(page.locator('[data-pd-view="home"]')).toBeVisible()
  await pasteImage(page, null)
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
})
