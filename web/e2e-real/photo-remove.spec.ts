import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Photo «Fjern objekt» med EKTE AI (LaMa, lokalt i nettleseren) på ekte fotografier, og AI-motivmaske (ormbg) som
 * lokal justering. Lagrer et før/etter-ark i test-results/real for visuell kontroll.
 *   npx playwright test -c e2e-real photo-remove
 */
const PHOTO = fs.readFileSync(new URL('../../media-lab/public/images/mockups/tv-livingroom.jpg', import.meta.url))
const MIRROR = [0.735, 0.04, 0.875, 0.255] as const
/** Plantene på hylla til høyre for TV-en (et mer krevende område: struktur bak). */
const VASE = [0.665, 0.26, 0.885, 0.73] as const

async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}
const snap = (page: Page) => page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.85))
async function stats(page: Page, iw: number, ih: number, box: readonly [number, number, number, number]) {
  const a = await scr(page, box[0] * iw, box[1] * ih)
  const b = await scr(page, box[2] * iw, box[3] * ih)
  return page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [ax, ay, bx, by]) => {
    const r = c.getBoundingClientRect()
    const k = c.width / r.width
    const x0 = Math.round((ax! - r.left) * k), y0 = Math.round((ay! - r.top) * k)
    const w = Math.max(2, Math.round((bx! - ax!) * k)), h = Math.max(2, Math.round((by! - ay!) * k))
    const d = c.getContext('2d')!.getImageData(x0, y0, w, h).data
    let dark = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3; if (l < 175 || d[i]! - d[i + 2]! > 45) dark++; n++ }
    return { dark: dark / n }
  }, [a.x, a.y, b.x, b.y])
}

test('ekte LaMa: speilet og plantene fjernes, bakgrunnen rekonstrueres', async ({ page }, info) => {
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/photo-design')
  const [W, H] = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob())
    return [bmp.width, bmp.height]
  }, PHOTO.toString('base64'))
  const k = Math.min(1, 2048 / Math.max(W!, H!))
  const iw = Math.round(W! * k), ih = Math.round(H! * k)
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'stue.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.locator('[data-layer]').filter({ hasText: 'stue' }).first().click()
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  const shots: string[] = []
  for (const box of [MIRROR, VASE]) {
    await page.locator('[data-pd-remove-open]').click()
    await page.waitForTimeout(600)
    if (!shots.length) shots.push(await snap(page))
    await page.locator('[data-pd-mask] [data-mask-tool="rect"]').click()
    const a = await scr(page, box[0] * iw, box[1] * ih)
    const b = await scr(page, box[2] * iw, box[3] * ih)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 6 })
    await page.mouse.up()
    await page.locator('[data-pd-remove-ai]').click()
    await expect(page.getByText('Objektet er fjernet og bakgrunnen fylt inn med AI. Angre henter originalen tilbake.')).toBeVisible({ timeout: 480_000 })
  }
  await page.locator('[data-pd-remove-open]').click()
  await page.waitForTimeout(600)
  shots.push(await snap(page))
  expect((await stats(page, iw, ih, MIRROR)).dark, 'speilet er borte').toBeLessThan(0.05)
  // før/etter-ark
  const sheet = await page.evaluate(async (list) => {
    const ims = await Promise.all(list.map((u) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u })))
    const c = document.createElement('canvas')
    c.width = ims[0]!.width * 2 + 8
    c.height = ims[0]!.height
    const g = c.getContext('2d')!
    ims.forEach((im, i) => g.drawImage(im, i * (im.width + 8), 0))
    return c.toDataURL('image/jpeg', 0.85)
  }, shots)
  fs.writeFileSync(info.outputPath('lama-for-etter.jpg'), Buffer.from(sheet.split(',')[1]!, 'base64'))
  expect(errors).toEqual([])
})

test('ekte AI-motivmaske som lokal justering (+ Motiv (AI))', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'stue.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: 'stue' }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  const panel = page.locator('[data-pd-adv-dev]')
  await panel.locator('[data-pd-loc-add="subject"]').click()
  await expect(page.getByText(/Motivet er valgt med AI/)).toBeVisible({ timeout: 480_000 })
  await expect(panel.locator('[data-pd-loc-item="0"]')).toContainText('Pensel 1')
})
