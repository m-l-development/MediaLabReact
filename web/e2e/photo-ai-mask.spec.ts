import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Photo: «Fjern objekt» og pikselmasker (pensel / AI) for lokale justeringer – på et ekte fotografi (stue med et rundt
 * speil på en hvit vegg). AI-modellen (LaMa) stenges ute her (ingen nedlasting i testene), så den innholdsbevisste
 * utfyllingen brukes og meldingen om det vises; ekte LaMa testes i e2e-real/photo-remove.spec.ts.
 * - Fyll: speilet (mørk ramme) er borte og området ser ut som veggen; Angre henter speilet tilbake.
 * - Gjør uskarp: eget valg – området blir bare uskarpt (detaljene borte, fargene blir).
 * - Pensel som lokal maske: eksponering virker bare der det er malt.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'pekerverktøy testes på PC'))
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

const PHOTO = fs.readFileSync(new URL('../../media-lab/public/images/mockups/tv-livingroom.jpg', import.meta.url))
/** Speilet øverst til høyre (andeler av bildet) og en flate av veggen ved siden av. */
const MIRROR = [0.735, 0.04, 0.875, 0.255] as const
const WALL = [0.56, 0.04, 0.64, 0.17] as const

async function dims(page: Page): Promise<[number, number]> {
  return page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob())
    return [bmp.width, bmp.height] as [number, number]
  }, PHOTO.toString('base64'))
}

/** Bildepiksel → skjermpunkt i maskeredigeringen. */
async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}

/** Statistikk i et område av bildet slik maskeredigeringen viser det: andel mørke/brune piksler og kantstyrke. */
async function stats(page: Page, iw: number, ih: number, box: readonly [number, number, number, number]) {
  const a = await scr(page, box[0] * iw, box[1] * ih)
  const b = await scr(page, box[2] * iw, box[3] * ih)
  return page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [ax, ay, bx, by]) => {
    const r = c.getBoundingClientRect()
    const k = c.width / r.width
    const x0 = Math.round((ax! - r.left) * k), y0 = Math.round((ay! - r.top) * k)
    const w = Math.max(2, Math.round((bx! - ax!) * k)), h = Math.max(2, Math.round((by! - ay!) * k))
    const d = c.getContext('2d')!.getImageData(x0, y0, w, h).data
    let dark = 0, edge = 0, warm = 0, n = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) {
      const i = (y * w + x) * 4
      const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3
      if (l < 175 || d[i]! - d[i + 2]! > 45) dark++
      warm += d[i]! - d[i + 2]!
      edge += Math.abs(l - (d[i + 4]! + d[i + 5]! + d[i + 6]!) / 3)
      n++
    }
    return { dark: dark / n, edge: edge / n, warm: warm / n }
  }, [a.x, a.y, b.x, b.y])
}

async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'stue.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.locator('[data-layer]').filter({ hasText: 'stue' }).first().click()
}

async function markMirror(page: Page, iw: number, ih: number) {
  await page.locator('[data-pd-mask] [data-mask-tool="rect"]').click()
  await expect(page.locator('[data-pd-mask] [data-mask-keep="0"]'), 'starter med «Fjern» (rødt = det som fjernes)').toHaveAttribute('aria-pressed', 'true')
  const a = await scr(page, MIRROR[0] * iw, MIRROR[1] * ih)
  const b = await scr(page, MIRROR[2] * iw, MIRROR[3] * ih)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
}

test('Fjern objekt: speilet fylles med veggen (ikke uskarpt), Angre henter det tilbake', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const [W, H] = await dims(page)
  const k = Math.min(1, 2048 / Math.max(W, H))
  const iw = Math.round(W * k), ih = Math.round(H * k)
  await open(page)
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await page.locator('[data-pd-remove-open]').click()
  await expect(page.locator('[data-pd-mask="remove"] [data-mask-canvas]')).toBeVisible()
  await page.waitForTimeout(500)
  const before = await stats(page, iw, ih, MIRROR)
  expect(before.dark, `speilet synes før (${JSON.stringify(before)})`).toBeGreaterThan(0.12)
  await markMirror(page, iw, ih)
  await page.locator('[data-pd-remove-ai]').click()
  await expect(page.getByText(/AI-modellen kunne ikke lastes – området er fylt med omgivelsene|AI-fylling støttes ikke på denne enheten/)).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('[data-pd-mask]')).toHaveCount(0)
  // åpne igjen og se på resultatet i bildet
  await page.locator('[data-pd-remove-open]').click()
  await page.waitForTimeout(500)
  const after = await stats(page, iw, ih, MIRROR)
  expect(after.dark, `speilet er borte (${JSON.stringify(after)})`).toBeLessThan(0.04)
  expect(after.edge, 'flaten er jevn vegg, ikke et speil').toBeLessThan(before.edge * 0.5)
  await page.locator('[data-pd-mask]').getByRole('button', { name: 'Avbryt' }).click()
  // Angre: originalen tilbake
  await page.keyboard.press('Control+z')
  await page.locator('[data-pd-remove-open]').click()
  await page.waitForTimeout(500)
  expect((await stats(page, iw, ih, MIRROR)).dark, 'angret: speilet er tilbake').toBeGreaterThan(0.12)
  expect(errors).toEqual([])
})

test('Gjør uskarp er et eget valg: området blir uskarpt, men fylles ikke inn', async ({ page }) => {
  test.setTimeout(120_000)
  const [W, H] = await dims(page)
  const k = Math.min(1, 2048 / Math.max(W, H))
  const iw = Math.round(W * k), ih = Math.round(H * k)
  await open(page)
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await page.locator('[data-pd-remove-open]').click()
  await page.waitForTimeout(500)
  const before = await stats(page, iw, ih, MIRROR)
  await markMirror(page, iw, ih)
  await page.locator('[data-pd-remove-blur]').click()
  await expect(page.getByText('Området er gjort uskarpt. Angre henter originalen tilbake.')).toBeVisible({ timeout: 60_000 })
  await page.locator('[data-pd-remove-open]').click()
  await page.waitForTimeout(500)
  const after = await stats(page, iw, ih, MIRROR)
  expect(after.edge, 'detaljene er borte (uskarpt)').toBeLessThan(before.edge * 0.6)
  const wall = await stats(page, iw, ih, WALL)
  expect(after.warm, `fargene fra speilet blir igjen, ikke fylt med vegg (${after.warm.toFixed(1)} mot veggen ${wall.warm.toFixed(1)})`).toBeGreaterThan(wall.warm + 3)
})

test('Pensel som lokal maske: eksponeringen virker bare der det er malt', async ({ page }) => {
  test.setTimeout(120_000)
  const [W, H] = await dims(page)
  const k = Math.min(1, 2048 / Math.max(W, H))
  const iw = Math.round(W * k), ih = Math.round(H * k)
  await open(page)
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: 'stue' }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  const panel = page.locator('[data-pd-adv-dev]')
  await expect(panel).toBeVisible()
  const half = (page2: Page, right: boolean) => page2.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement, r) => {
    const d = c.getContext('2d')!.getImageData(Math.round(c.width * (r ? 0.7 : 0.1)), Math.round(c.height * 0.3), Math.round(c.width * 0.2), Math.round(c.height * 0.2)).data
    let s = 0, n = 0
    for (let i = 0; i < d.length; i += 4 * 7) { s += d[i]! + d[i + 1]! + d[i + 2]!; n++ }
    return s / n / 3
  }, right)
  const L0 = await half(page, false), R0 = await half(page, true)
  await panel.locator('[data-pd-loc-add="px"]').click()
  await expect(page.locator('[data-pd-mask="local"] [data-mask-canvas]')).toBeVisible()
  // høyre halvdel av bildet merkes (rødt)
  await page.locator('[data-pd-mask] [data-mask-tool="rect"]').click()
  const a = await scr(page, iw * 0.5, -5)
  const b = await scr(page, iw + 5, ih + 5)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-pd-mask-apply]').click()
  const item = panel.locator('[data-pd-loc-item="0"]')
  await expect(item).toContainText('Pensel 1')
  await item.getByRole('slider', { name: 'Eksponering', exact: true }).fill('-80')
  await expect.poll(async () => await half(page, true), { message: 'malt område mørkere' }).toBeLessThan(R0 - 20)
  expect(Math.abs((await half(page, false)) - L0), 'umalt område uendret').toBeLessThan(2)
  // «Mal på masken …» åpner masken igjen med det malte området
  await item.locator('[data-pd-loc-paint]').click()
  await expect(page.locator('[data-pd-mask="local"]')).toBeVisible()
  await page.locator('[data-pd-mask]').getByRole('button', { name: 'Avbryt' }).click()
})
