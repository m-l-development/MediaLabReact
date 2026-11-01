import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/** Bildeserie (batchredigering) i Photo Design: import, filmstrip, egne innstillinger per bilde, batchhandlinger, ZIP og lagring. */

const COLORS: [number, number, number][] = Array.from({ length: 12 }, (_, i) => [60 + i * 10, 120, 190 - i * 8])
const NAMES = [...Array.from({ length: 10 }, (_, i) => `img${String(i + 1).padStart(2, '0')}.png`), 'same.png', 'same.png']
const files = () => NAMES.map((name, i) => ({ name, mimeType: 'image/png', buffer: png(240, 160, () => [...(COLORS[i] as [number, number, number]), 255]) }))

/** Filene i et ZIP-arkiv uten komprimering (slik ZipWriter lager dem). */
function unzip(buf: Buffer): { name: string; data: Buffer }[] {
  const out: { name: string; data: Buffer }[] = []
  let o = 0
  while (buf.readUInt32LE(o) === 0x04034b50) {
    expect(buf.readUInt16LE(o + 8), 'lagret uten komprimering').toBe(0)
    const size = buf.readUInt32LE(o + 18)
    const nl = buf.readUInt16LE(o + 26)
    const xl = buf.readUInt16LE(o + 28)
    const name = buf.subarray(o + 30, o + 30 + nl).toString('utf8')
    out.push({ name, data: buf.subarray(o + 30 + nl + xl, o + 30 + nl + xl + size) })
    o += 30 + nl + xl + size
  }
  return out
}

/** Gjennomsnittsfarge og mål for et bilde (dekodes i nettleseren). */
async function avg(page: Page, data: Buffer, mime: string): Promise<{ w: number; h: number; c: [number, number, number] }> {
  return page.evaluate(async ({ b64, kind }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:${kind};base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    const s = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] = (s[k] ?? 0) + (d[i + k] ?? 0)
    const n = d.length / 4
    return { w: bmp.width, h: bmp.height, c: s.map((x) => Math.round(x / n)) as [number, number, number] }
  }, { b64: data.toString('base64'), kind: mime })
}

const props = (page: Page) => page.locator('[data-pd-batch-props]')
const slider = (page: Page, label: string) => props(page).getByRole('slider', { name: label }).first()
const pos = (page: Page) => page.locator('[data-pd-batch-pos]')
const item = (page: Page, i: number) => page.locator('[data-pd-batch-item]').nth(i)

async function addImages(page: Page, list: { name: string; mimeType: string; buffer: Buffer }[]) {
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-pd-batch-add]').click()
  await (await chooser).setFiles(list)
}

test('bildeserie: import, egne innstillinger per bilde, batchhandlinger, ZIP-eksport og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'hele flyten på PC; mobil har egen test')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-batch-new]').click()
  await expect(page.locator('[data-pd-batch-strip]')).toBeVisible()
  await expect(pos(page)).toHaveText('Ingen bilder ennå')

  // tom serie: forståelig melding, ingen nedlasting
  await page.locator('[data-pd-batch-zip]').click()
  await expect(page.getByRole('status').filter({ hasText: 'Bildeserien er tom. Legg til bilder først.' })).toBeVisible()

  // import: 12 bilder + én fil som ikke kan leses
  await addImages(page, [...files(), { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('ikke et bilde') }])
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('12 bilder · 0 redigert · 12 uendret', { timeout: 30_000 })
  await expect(page.locator('[data-pd-batch-failed]')).toContainText('bad.png')
  await expect(page.locator('[data-pd-batch-item]')).toHaveCount(12)
  await expect(item(page, 0).locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
  await expect(pos(page)).toHaveText('Bilde 1 av 12')
  await expect(item(page, 0)).toHaveAttribute('data-active', '1')

  // bilde 1: eksponering; bilde 2: Svart-hvitt
  await slider(page, 'Eksponering').fill('60')
  await expect(item(page, 0)).toHaveAttribute('data-edited', '1')
  await page.locator('[data-pd-batch-next]').click()
  await expect(pos(page)).toHaveText('Bilde 2 av 12')
  await expect(item(page, 1)).toHaveAttribute('data-active', '1')
  await expect(slider(page, 'Eksponering')).toHaveValue('0')
  await props(page).getByRole('button', { name: 'Svart-hvitt', exact: true }).click()

  // piltastene bytter bilde; ingenting går tapt
  await page.locator('[data-pd-batch-pos]').click()
  await page.keyboard.press('ArrowLeft')
  await expect(pos(page)).toHaveText('Bilde 1 av 12')
  await expect(slider(page, 'Eksponering')).toHaveValue('60')
  await page.keyboard.press('ArrowRight')
  await expect(pos(page)).toHaveText('Bilde 2 av 12')
  await expect(props(page).getByRole('button', { name: 'Svart-hvitt', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('12 bilder · 2 redigert · 10 uendret')
  await expect(page.locator('[data-pd-batch-item][data-edited]')).toHaveCount(2)

  // batch: forhåndsvalg bare på de valgte (bilde 5 og 6)
  await page.locator('[data-pd-batch-apply]').isDisabled()
  await item(page, 4).locator('input[type="checkbox"]').check()
  await item(page, 5).locator('input[type="checkbox"]').check()
  await expect(page.locator('[data-pd-batch-selcount]')).toHaveText('2 av 12 valgt')
  await page.locator('[data-pd-batch-look]').selectOption('warm')
  await page.locator('[data-pd-batch-apply]').click()
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('12 bilder · 4 redigert · 8 uendret')
  await expect(item(page, 6)).not.toHaveAttribute('data-edited', '1')

  // kopier innstillingene fra bilde 1 til bilde 8
  await item(page, 0).locator('button').click()
  await expect(pos(page)).toHaveText('Bilde 1 av 12')
  await page.locator('[data-pd-batch-none]').click()
  await expect(page.locator('[data-pd-batch-selcount]')).toHaveText('0 av 12 valgt')
  await item(page, 7).locator('input[type="checkbox"]').check()
  await page.locator('[data-pd-batch-copy]').click()
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('12 bilder · 5 redigert · 7 uendret')
  await page.locator('[data-pd-batch-all]').click()
  await expect(page.locator('[data-pd-batch-selcount]')).toHaveText('12 av 12 valgt')
  await page.locator('[data-pd-batch-none]').click()

  // ZIP (PNG): ett bilde per fil, unike navn, hvert bilde med egne innstillinger
  await page.locator('[data-pd-batch-fmt="png"]').click()
  const dl = page.waitForEvent('download')
  await page.locator('[data-pd-batch-zip]').click()
  const d = await dl
  expect(d.suggestedFilename()).toMatch(/\.zip$/)
  const zip = unzip(fs.readFileSync(await d.path()))
  expect(zip.map((f) => f.name)).toEqual([...NAMES.slice(0, 10), 'same.png', 'same (2).png'])
  await expect(page.locator('[data-pd-batch-job="done"]')).toContainText('12 av 12 bilder eksportert.')
  const px = await Promise.all(zip.map((f) => avg(page, f.data, 'image/png')))
  const [o1, o2, o5, o7, o8] = [COLORS[0], COLORS[1], COLORS[4], COLORS[6], COLORS[7]] as [number, number, number][]
  expect([px[0]?.w, px[0]?.h], 'full oppløsning').toEqual([240, 160])
  const lum = (c: number[]) => (c[0] ?? 0) + (c[1] ?? 0) + (c[2] ?? 0)
  expect(lum(px[0]!.c), 'bilde 1: lysere').toBeGreaterThan(lum(o1!) + 30)
  expect(Math.max(...px[1]!.c) - Math.min(...px[1]!.c), 'bilde 2: svart-hvitt').toBeLessThan(4)
  expect(Math.max(...px[1]!.c.map((v, k) => Math.abs(v - (o2![k] ?? 0)))), 'bilde 2 er endret').toBeGreaterThan(10)
  // «Varm»: rødt øker i forhold til blått (bilde 5 og 6, ikke 7)
  const warm = (c: number[]) => (c[0] ?? 0) - (c[2] ?? 0)
  expect(warm(px[4]!.c), 'bilde 5: varmere').toBeGreaterThan(warm(o5!) + 2)
  expect(warm(px[5]!.c), 'bilde 6: varmere').toBeGreaterThan(warm(COLORS[5]!) + 2)
  expect(px[6]!.c.map((v, k) => Math.abs(v - (o7![k] ?? 0))).every((x) => x <= 2), 'bilde 7: uendret').toBe(true)
  expect(lum(px[7]!.c), 'bilde 8: fikk innstillingene fra bilde 1').toBeGreaterThan(lum(o8!) + 30)

  // lagre, last inn på nytt og åpne serien: alt er der
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.reload()
  await page.locator('[data-project="Bildeserie"] button').first().click()
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('12 bilder · 5 redigert · 7 uendret')
  await expect(pos(page)).toHaveText('Bilde 1 av 12')
  await expect(slider(page, 'Eksponering')).toHaveValue('60')
  await item(page, 1).locator('button').click()
  await expect(pos(page)).toHaveText('Bilde 2 av 12')
  await expect(props(page).getByRole('button', { name: 'Svart-hvitt', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // flere bilder senere, og ZIP som JPEG etter omlasting (originalene hentes fra lagringen)
  await addImages(page, [{ name: 'senere.png', mimeType: 'image/png', buffer: png(120, 90, () => [200, 40, 40, 255]) }])
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('13 bilder · 5 redigert · 8 uendret')
  await page.locator('[data-pd-batch-fmt="jpg"]').click()
  const dl2 = page.waitForEvent('download')
  await page.locator('[data-pd-batch-zip]').click()
  const zip2 = unzip(fs.readFileSync(await (await dl2).path()))
  expect(zip2).toHaveLength(13)
  expect(zip2.every((f) => f.name.endsWith('.jpg') && f.data[0] === 0xff && f.data[1] === 0xd8)).toBe(true)
  const last = await avg(page, zip2[12]!.data, 'image/jpeg')
  expect([last.w, last.h]).toEqual([120, 90])
  expect(errors).toEqual([])
})

test('bildeserie på mobil: filmstrip og forrige/neste uten vannrett rulling', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'mobilvisningen')
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-batch-new]').click()
  await addImages(page, files().slice(0, 3))
  await expect(page.locator('[data-pd-batch-item]')).toHaveCount(3, { timeout: 20_000 })
  await expect(pos(page)).toHaveText('Bilde 1 av 3')
  await page.locator('[data-pd-batch-next]').click()
  await expect(pos(page)).toHaveText('Bilde 2 av 3')
  await expect(page.locator('[data-pd-batch-strip]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('bildeserie med 120 bilder: import i bakgrunnen, grensesnittet svarer, navigering til siste bilde', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'ytelse måles på PC')
  test.slow()
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-batch-new]').click()
  const many = Array.from({ length: 120 }, (_, i) => ({ name: `foto-${i + 1}.png`, mimeType: 'image/png', buffer: png(64, 48, () => [i * 2, 100, 200 - i, 255]) }))
  const t0 = Date.now()
  await addImages(page, many)
  // mens importen pågår: fremdrift vises og knappene svarer
  await expect(page.getByText(/Legger til \d+ av 120/)).toBeVisible()
  await expect(pos(page)).toHaveText(/Bilde 1 av \d+/)
  await page.locator('[data-pd-batch-all]').click()
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('120 bilder · 0 redigert · 120 uendret', { timeout: 90_000 })
  console.log(`import av 120 bilder: ${Date.now() - t0} ms`)
  await expect(page.locator('[data-pd-batch-item]')).toHaveCount(120)
  // siste bilde via filmstripen, deretter tilbake med piltasten
  await item(page, 119).locator('button').click()
  await expect(pos(page)).toHaveText('Bilde 120 av 120')
  await expect(page.locator('[data-pd-batch-next]')).toBeDisabled()
  await page.locator('[data-pd-batch-pos]').click()
  await page.keyboard.press('ArrowLeft')
  await expect(pos(page)).toHaveText('Bilde 119 av 120')
})

test('startsiden: «Mange bilder» står over malene og åpner bildeserien', async ({ page }) => {
  await page.goto('/app/photo-design')
  const sec = page.locator('[data-pd-batch-home]')
  await expect(sec).toContainText('Mange bilder')
  await expect(sec).toContainText('Rediger mange separate bilder i én serie')
  await expect(page.locator('[data-pd-batch-new]')).toHaveCount(1)
  const a = await sec.boundingBox()
  const t = await page.locator('[data-tpl]').first().boundingBox()
  expect(a && t && a.y + a.height <= t.y, 'før den første malen').toBe(true)
  await expect(page.locator('[data-tpl]')).toHaveCount(19)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'ingen vannrett rulling').toBe(true)
  await page.locator('[data-pd-batch-new]').click()
  await expect(page.locator('[data-pd-batch-strip]')).toBeVisible()
  await expect(page.locator('[data-pd-batch-add]')).toBeVisible()
})

test('bildeserie: slett valgte (før det aktive, det aktive, avbryt, ZIP, lagring, alle)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'flyten på PC; knappen vises også på mobil (egen test)')
  test.slow()
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-batch-new]').click()
  await addImages(page, files().slice(0, 6))
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('6 bilder · 0 redigert · 6 uendret', { timeout: 30_000 })
  const names = () => page.locator('[data-pd-batch-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-pd-batch-item')))
  const del = page.locator('[data-pd-batch-del]')
  await expect(del).toBeDisabled()
  await expect(del).toHaveText('Slett valgte')

  // bilde 4 er åpent og redigert; bilde 1 og 2 (før det) slettes
  await item(page, 3).locator('button').click()
  await expect(pos(page)).toHaveText('Bilde 4 av 6')
  await slider(page, 'Eksponering').fill('60')
  await item(page, 0).locator('input[type="checkbox"]').check()
  await item(page, 1).locator('input[type="checkbox"]').check()
  await expect(del).toHaveText('Slett valgte (2)')
  page.once('dialog', (d) => void d.accept())
  await del.click()
  expect(await names()).toEqual(['img03.png', 'img04.png', 'img05.png', 'img06.png'])
  await expect(pos(page)).toHaveText('Bilde 2 av 4')
  await expect(item(page, 1)).toHaveAttribute('data-active', '1')
  await expect(slider(page, 'Eksponering')).toHaveValue('60')
  await expect(page.locator('[data-pd-batch-selcount]')).toHaveText('0 av 4 valgt')

  // avbryt i bekreftelsen: ingenting slettes
  await item(page, 3).locator('input[type="checkbox"]').check()
  page.once('dialog', (d) => void d.dismiss())
  await del.click()
  expect(await names()).toHaveLength(4)
  await page.locator('[data-pd-batch-none]').click()

  // det aktive bildet (img04) slettes: neste gjenværende åpnes
  await item(page, 1).locator('input[type="checkbox"]').check()
  page.once('dialog', (d) => void d.accept())
  await del.click()
  expect(await names()).toEqual(['img03.png', 'img05.png', 'img06.png'])
  await expect(pos(page)).toHaveText('Bilde 2 av 3')
  await expect(page.locator('[data-pd-batch-props]')).toContainText('img05.png')
  await expect(slider(page, 'Eksponering')).toHaveValue('0')
  await expect(page.locator('[data-pd-batch-count]')).toHaveText('3 bilder · 0 redigert · 3 uendret')

  // ZIP: bare bildene som er igjen
  const dl = page.waitForEvent('download')
  await page.locator('[data-pd-batch-zip]').click()
  expect(unzip(fs.readFileSync(await (await dl).path())).map((f) => f.name)).toEqual(['img03.jpg', 'img05.jpg', 'img06.jpg'])

  // lagre og åpne igjen: de slettede er fortsatt borte
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-project="Bildeserie"]')).toContainText('Bildeserie · 3 bilder')
  await page.locator('[data-project="Bildeserie"] button').first().click()
  expect(await names()).toEqual(['img03.png', 'img05.png', 'img06.png'])
  await expect(pos(page)).toHaveText('Bilde 2 av 3')

  // alle: tom tilstand med import
  await page.locator('[data-pd-batch-all]').click()
  await expect(del).toHaveText('Slett valgte (3)')
  page.once('dialog', (d) => void d.accept())
  await del.click()
  await expect(page.locator('[data-pd-batch-item]')).toHaveCount(0)
  await expect(pos(page)).toHaveText('Ingen bilder ennå')
  await expect(page.locator('[data-pd-batch-props]')).toContainText('Legg til bilder for å begynne')
  await expect(page.locator('[data-pd-batch-add]')).toBeVisible()
  await page.locator('[data-pd-batch-zip]').click()
  await expect(page.getByRole('status').filter({ hasText: 'Bildeserien er tom.' })).toBeVisible()
  await addImages(page, files().slice(0, 1))
  await expect(pos(page)).toHaveText('Bilde 1 av 1', { timeout: 20_000 })
})
