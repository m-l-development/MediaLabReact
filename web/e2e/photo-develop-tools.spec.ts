import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Photo Design → Avansert framkalling (#170): tekstur, støyreduksjon, perspektiv, HSL per fargeområde, fargegradering,
 * lokale lineære/radiale gradientmasker (av/på, snu, slett), metadata (EXIF), HDR-sammenslåing av valgte bilder.
 * Alt virker på lerretet, eksporten er lik forhåndsvisningen, og innstillingene lagres med prosjektet.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

const C = '[data-pd-wrap] canvas'
const GRAD = png(320, 240, (x, y) => [Math.round((x / 319) * 200) + 20, Math.round((y / 239) * 120) + 60, 90 + ((x * 7 + y * 13) % 9), 255])

const means = (page: Page) => page.locator(C).first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  const m = [0, 0, 0]
  let n = 0
  for (let i = 0; i < d.length; i += 4 * 53) { m[0]! += d[i]!; m[1]! += d[i + 1]!; m[2]! += d[i + 2]!; n++ }
  return m.map((v) => v / n)
})
const print = (page: Page) => page.locator(C).first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4 * 97) h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]! * 7) | 0
  return h
})

async function diffToExport(page: Page, file: string): Promise<number> {
  return page.evaluate(async ({ b64, sel }) => {
    const cv = document.querySelector(sel) as HTMLCanvasElement
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const W = 240, H = Math.round((W * bmp.height) / bmp.width)
    const a = new OffscreenCanvas(W, H).getContext('2d') as OffscreenCanvasRenderingContext2D
    const b = new OffscreenCanvas(W, H).getContext('2d') as OffscreenCanvasRenderingContext2D
    a.drawImage(bmp, 0, 0, W, H)
    b.drawImage(cv, 0, 0, W, H)
    const A = a.getImageData(0, 0, W, H).data, B = b.getImageData(0, 0, W, H).data
    let s = 0
    for (let i = 0; i < A.length; i += 4) s += (Math.abs(A[i]! - B[i]!) + Math.abs(A[i + 1]! - B[i + 1]!) + Math.abs(A[i + 2]! - B[i + 2]!)) / 3
    return s / (A.length / 4)
  }, { b64: fs.readFileSync(file).toString('base64'), sel: C })
}

async function exportPng(page: Page, path: string) {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  await (await dl).saveAs(path)
  await page.keyboard.press('Escape')
  const close = page.getByRole('button', { name: /^(Lukk|Ferdig|Avbryt)$/ }).filter({ visible: true })
  if (await page.getByRole('button', { name: 'Last ned', exact: true }).filter({ visible: true }).count()) await close.first().click().catch(() => undefined)
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).filter({ visible: true })).toHaveCount(0)
}

/** JPEG laget i nettleseren, med en EXIF-blokk (Make «TestCam», ISO 200) satt inn rett etter SOI. */
async function jpegWithExif(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 320; c.height = 240
    const g = c.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 320, 240)
    gr.addColorStop(0, '#305080'); gr.addColorStop(1, '#e0a040')
    g.fillStyle = gr; g.fillRect(0, 0, 320, 240)
    return c.toDataURL('image/jpeg', 0.92).split(',')[1]!
  })
  const jpg = Buffer.from(b64, 'base64')
  const t = Buffer.alloc(8 + 2 + 2 * 12 + 4 + 8)
  t.write('II', 0); t.writeUInt16LE(42, 2); t.writeUInt32LE(8, 4)
  t.writeUInt16LE(2, 8)
  // Make (ASCII, 8 byte) → data etter IFD-en
  t.writeUInt16LE(0x010f, 10); t.writeUInt16LE(2, 12); t.writeUInt32LE(8, 14); t.writeUInt32LE(38, 18)
  // ISO (SHORT, i oppføringen) – står normalt i Exif-IFD, men leseren tar den der den finnes
  t.writeUInt16LE(0x8827, 22); t.writeUInt16LE(3, 24); t.writeUInt32LE(1, 26); t.writeUInt16LE(200, 30)
  t.writeUInt32LE(0, 34)
  t.write('TestCam\0', 38, 'latin1')
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([((t.length + 8) >> 8) & 255, (t.length + 8) & 255]), Buffer.from('Exif\0\0', 'latin1'), t])
  return Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)])
}

async function openAdv(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click() // malene står i den felles malpopupen (som i Thumbnail)
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles(file)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: /grad|kamera|Bakgrunnsbilde/i }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(page.locator('[data-pd-adv-dev]')).toBeVisible()
}

test('nye framkallingsverktøy virker på lerretet, eksporten er lik forhåndsvisningen, og alt lagres', async ({ page }, info) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openAdv(page, { name: 'grad.png', mimeType: 'image/png', buffer: GRAD })
  const panel = page.locator('[data-pd-adv-dev]')
  const sl = (scope: string, name: string) => panel.locator(scope).getByRole('slider', { name, exact: true })

  // tekstur og støyreduksjon
  let p0 = await print(page)
  await panel.getByRole('slider', { name: 'Tekstur', exact: true }).fill('100')
  await expect.poll(() => print(page), { message: 'tekstur endrer bildet' }).not.toBe(p0)
  p0 = await print(page)
  await panel.getByRole('slider', { name: 'Støyreduksjon', exact: true }).fill('100')
  await expect.poll(() => print(page), { message: 'støyreduksjon endrer bildet' }).not.toBe(p0)

  // perspektiv
  p0 = await print(page)
  await sl('[data-pd-persp]', 'Vertikalt').fill('60')
  await expect.poll(() => print(page), { message: 'perspektiv endrer bildet' }).not.toBe(p0)

  // HSL: oransje/gult område mettes ned → mindre forskjell mellom rød og blå
  const m0 = await means(page)
  for (const r of ['Orange', 'Yellow', 'Red']) {
    await panel.locator(`[data-pd-hsl-range="${r}"]`).click()
    await sl('[data-pd-hsl]', 'Metning').fill('-100')
  }
  await expect.poll(async () => { const m = await means(page); return m[0]! - m[2]! }, { message: 'HSL-metning virker' }).toBeLessThan(m0[0]! - m0[2]! - 10)

  // fargegradering: blå skygger
  const m1 = await means(page)
  await panel.locator('[data-pd-grade-zone="s"]').click()
  await sl('[data-pd-grade]', 'Fargetone').fill('220')
  await sl('[data-pd-grade]', 'Styrke').fill('100')
  await expect.poll(async () => (await means(page))[2]!, { message: 'fargegradering gir blåere skygger' }).toBeGreaterThan(m1[2]! + 3)

  // lokal radial maske: lysere i midten; av/på, snu, slett
  const m2 = await means(page)
  await panel.locator('[data-pd-loc-add="rad"]').click()
  const item = panel.locator('[data-pd-loc-item="0"]')
  await expect(item).toBeVisible()
  await item.getByRole('slider', { name: 'Eksponering', exact: true }).fill('80')
  await expect.poll(async () => (await means(page))[1]!, { message: 'radial maske gjør bildet lysere' }).toBeGreaterThan(m2[1]! + 3)
  const on = await print(page)
  await item.locator('[data-pd-loc-on]').click()
  await expect(item.locator('[data-pd-loc-on]')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => Math.abs((await means(page))[1]! - m2[1]!), { message: 'maske av = som før' }).toBeLessThan(0.5)
  await item.locator('[data-pd-loc-on]').click()
  await expect.poll(() => print(page)).toBe(on)
  await item.locator('[data-pd-loc-inv]').click()
  await expect.poll(() => print(page), { message: 'snudd maske endrer bildet' }).not.toBe(on)
  // lineær maske i tillegg, så slettes den radiale
  await panel.locator('[data-pd-loc-add="lin"]').click()
  await expect(panel.locator('[data-pd-loc-item]')).toHaveCount(2)
  await item.locator('[data-pd-loc-del]').click()
  await expect(panel.locator('[data-pd-loc-item]')).toHaveCount(1)
  await expect(panel.locator('[data-pd-loc-item="0"]')).toContainText('Lineær')

  // flekkfjerning: legges til, endrer bildet, kan slettes
  const pS = await print(page)
  await panel.locator('[data-pd-loc-add="spot"]').click()
  const spot = panel.locator('[data-pd-loc-item="1"]')
  await expect(spot).toContainText('Flekkfjerning')
  await expect(spot.getByRole('slider', { name: 'Kilde vannrett', exact: true })).toBeVisible()
  await spot.getByRole('slider', { name: 'Kilde vannrett', exact: true }).fill('10')
  await expect.poll(() => print(page), { message: 'flekkfjerning endrer bildet' }).not.toBe(pS)
  await spot.locator('[data-pd-loc-del]').click()
  await expect(panel.locator('[data-pd-loc-item]')).toHaveCount(1)
  await expect.poll(() => print(page)).toBe(pS)

  // metadata: PNG har ingen EXIF
  await expect(panel.locator('[data-pd-exif]')).toContainText('ingen EXIF')

  // eksport = forhåndsvisning
  const file = info.outputPath('dev.png')
  await exportPng(page, file)
  expect(await diffToExport(page, file), 'eksporten er lik forhåndsvisningen').toBeLessThan(6)

  // lagring og gjenåpning
  const before = await print(page)
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(panel.getByRole('slider', { name: 'Tekstur', exact: true })).toHaveValue('100')
  await expect(sl('[data-pd-persp]', 'Vertikalt')).toHaveValue('60')
  await expect(panel.locator('[data-pd-loc-item]')).toHaveCount(1)
  await expect.poll(() => print(page), { message: 'samme bilde etter gjenåpning' }).toBe(before)
  expect(errors).toEqual([])
})

test('metadata (EXIF) fra en JPEG vises', async ({ page }) => {
  await page.goto('/app/photo-design')
  const jpg = await jpegWithExif(page)
  await openAdv(page, { name: 'kamera.jpg', mimeType: 'image/jpeg', buffer: jpg })
  const ex = page.locator('[data-pd-exif]')
  await expect(ex.locator('[data-pd-exif-row="Kamera"]')).toHaveText('TestCam')
  await expect(ex.locator('[data-pd-exif-row="ISO"]')).toHaveText('200')
})

test('HDR-sammenslåing av to valgte bilder gir et nytt bilde; originalene er urørt', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  // undereksponert (detaljer i høylys) og overeksponert (detaljer i skygger)
  const dark = png(200, 150, (x, y) => [Math.round(x / 4), Math.round(y / 4) + 10, 30, 255])
  const light = png(200, 150, (x, y) => [Math.min(255, 180 + Math.round(x / 3)), Math.min(255, 190 + Math.round(y / 3)), 220, 255])
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles([{ name: 'mork.png', mimeType: 'image/png', buffer: dark }, { name: 'lys.png', mimeType: 'image/png', buffer: light }])
  const layers = page.locator('[data-layer]')
  await expect(layers.filter({ hasText: 'mork' })).toBeVisible()
  await expect(layers.filter({ hasText: 'lys' })).toBeVisible()
  const n = await layers.count()
  await layers.filter({ hasText: 'mork' }).click()
  await layers.filter({ hasText: 'lys' }).click({ modifiers: ['Shift'] })
  const hdr = page.locator('[data-pd-hdr]')
  await expect(hdr).toBeVisible()
  await expect(hdr).toContainText('(2)')
  await hdr.click()
  await expect(layers).toHaveCount(n + 1)
  await expect(layers.filter({ hasText: /HDR/ })).toBeVisible()
  await expect(layers.filter({ hasText: 'mork' })).toBeVisible()
  await expect(layers.filter({ hasText: 'lys' })).toBeVisible()
  expect(errors).toEqual([])
})
