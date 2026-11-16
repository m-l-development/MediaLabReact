/**
 * Photo Design → Avansert framkalling → Objektivkorreksjon: på et ekte fotografi med lagt-til objektivfeil (mørke hjørner
 * og fargekanter mot hjørnene). «Auto» finner dem og retter dem på lerretet; fortegningen stilles for hånd og synes;
 * verdiene lagres med prosjektet.
 */
import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC (samme panel som avansert framkalling)'))

const PHOTO = fs.readFileSync(new URL('../../media-lab/public/images/mockups/tv-livingroom.jpg', import.meta.url))

/** Fotografiet med vignettering (hjørnene ≈ 0,5 ×) og kromatisk aberrasjon (rød 1,004 ×, blå 0,996 × radialt). */
async function flawed(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async (src) => {
    const im = new Image()
    im.src = src
    await im.decode()
    const W = 1200, H = Math.round((1200 * im.naturalHeight) / im.naturalWidth)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.drawImage(im, 0, 0, W, H)
    const s = g.getImageData(0, 0, W, H).data, o = g.createImageData(W, H)
    const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy)
    const at = (x: number, y: number, ch: number) => {
      const X = Math.max(0, Math.min(W - 1, x)), Y = Math.max(0, Math.min(H - 1, y))
      const x0 = Math.floor(X), y0 = Math.floor(Y), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), tx = X - x0, ty = Y - y0
      return (s[(y0 * W + x0) * 4 + ch]! * (1 - tx) + s[(y0 * W + x1) * 4 + ch]! * tx) * (1 - ty) + (s[(y1 * W + x0) * 4 + ch]! * (1 - tx) + s[(y1 * W + x1) * 4 + ch]! * tx) * ty
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy) / R
      const v = 1 - 0.5 * Math.max(0, (r - 0.3) / 0.7) ** 2
      const q = (y * W + x) * 4
      o.data[q] = at(cx + dx / 1.004 - 0.5, cy + dy / 1.004 - 0.5, 0) * v
      o.data[q + 1] = at(x, y, 1) * v
      o.data[q + 2] = at(cx + dx / 0.996 - 0.5, cy + dy / 0.996 - 0.5, 2) * v
      o.data[q + 3] = 255
    }
    g.putImageData(o, 0, 0)
    return c.toDataURL('image/png').split(',')[1]!
  }, 'data:image/jpeg;base64,' + PHOTO.toString('base64'))
  return Buffer.from(b64, 'base64')
}

/** Lysstyrke i hjørnene mot midten, og fargekant (rød–grønn) i venstre kant, på lerretet. */
const measure = (page: Page) => page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height
  const lum = (x0: number, y0: number, w: number, h: number) => {
    let s = 0, n = 0
    for (let y = y0; y < y0 + h; y += 2) for (let x = x0; x < x0 + w; x += 2) { const q = (y * W + x) * 4; s += d[q]! + d[q + 1]! + d[q + 2]!; n++ }
    return s / n / 3
  }
  const k = Math.round(Math.min(W, H) * 0.08)
  const corners = (lum(2, 2, k, k) + lum(W - k - 2, 2, k, k) + lum(2, H - k - 2, k, k) + lum(W - k - 2, H - k - 2, k, k)) / 4
  const mid = lum(Math.round(W / 2 - k), Math.round(H / 2 - k), 2 * k, 2 * k)
  return { ratio: corners / mid, sig: Array.from(d.slice(d.length / 3, d.length / 3 + 200)).join(',') }
})

test('objektivkorreksjon: Auto retter mørke hjørner og fargekanter, fortegning for hånd, lagres', async ({ page }, info) => {
  test.setTimeout(180_000)
  await page.goto('/app/photo-design')
  const img = await flawed(page)
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'objektiv.png', mimeType: 'image/png', buffer: img })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: /objektiv|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  const lens = page.locator('[data-pd-lens]')
  await expect(lens).toBeVisible()
  // (lerretet er hele malen; forholdet hjørner/midte måles før og etter)
  const m0 = await measure(page)
  await page.locator('[data-pd-wrap] canvas').first().screenshot({ path: info.outputPath('lens-for.png') })
  await lens.locator('[data-pd-lens-auto]').click()
  // tre glidebrytere har fått verdier (rød, blå, vignettering), og hjørnene er nesten like lyse som midten igjen
  const ranges = lens.locator('input[type="range"]')
  await expect.poll(async () => Number(await ranges.nth(1).inputValue())).toBeGreaterThan(20) // rød/cyan (1,004 ×)
  await expect.poll(async () => Number(await ranges.nth(2).inputValue())).toBeLessThan(-20) // blå/gul (0,996 ×)
  await expect.poll(async () => Number(await ranges.nth(3).inputValue())).toBeGreaterThan(10) // vignettering
  await expect.poll(async () => (await measure(page)).ratio).toBeGreaterThan(m0.ratio * 1.05)
  await page.locator('[data-pd-wrap] canvas').first().screenshot({ path: info.outputPath('lens-etter.png') })
  // fortegning for hånd: bildet endres
  const s0 = (await measure(page)).sig
  await ranges.nth(0).fill('40')
  await expect.poll(async () => (await measure(page)).sig).not.toBe(s0)
  const vals = await Promise.all([0, 1, 2, 3].map((i) => ranges.nth(i).inputValue()))
  // lagres med prosjektet
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: /objektiv|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  for (const [i, v] of vals.entries()) await expect(lens.locator('input[type="range"]').nth(i)).toHaveValue(v)
})
