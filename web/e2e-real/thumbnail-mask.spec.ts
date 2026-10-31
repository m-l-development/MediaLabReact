import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Thumbnail Studio → «Finjuster utklippet» (den felles maskeredigeringen, ekte modell): utklipp med «Objekt» av
 * hendene i torsdag.png, fingertuppene fjernes med rektangel + Fjern, «Bruk». Alfa leses i det lagrede utklippet
 * (bildet laget bruker), ikke i knappene.
 */
const PHOTO = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images', 'torsdag.png'))

async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-ts-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}

test('Finjuster utklippet: redigeringen lagres i utklippet laget bruker', async ({ page }) => {
  test.setTimeout(400_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await chooser).setFiles({ name: 'hender.png', mimeType: 'image/png', buffer: PHOTO })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Objekt', exact: true }).first().click()
  await expect(page.locator('[data-ts-mask-open]')).toBeVisible({ timeout: 240_000 })

  await page.locator('[data-ts-mask-open]').click()
  await expect(page.locator('[data-ts-mask] [data-mask-canvas]')).toBeVisible({ timeout: 30_000 })
  await page.locator('[data-ts-mask] [data-mask-tool="rect"]').click()
  await page.locator('[data-ts-mask] [data-mask-keep="0"]').click()
  const a = await scr(page, 2100, 200)
  const b = await scr(page, 2340, 440)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-ts-mask-apply]').click()
  await expect(page.locator('[data-ts-mask]')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByText('Utklippet er oppdatert.')).toBeVisible()

  // det lagrede utklippet (bildet i laget)
  const alpha = await page.locator('img[src^="blob:"]').first().evaluate(async (img: HTMLImageElement, pts) => {
    const bmp = await createImageBitmap(await (await fetch(img.src)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return { w: bmp.width, h: bmp.height, a: pts.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1) }
  }, [[2200, 280], [2270, 370], [1800, 1050], [1650, 1300], [2350, 800], [384, 422]] as [number, number][])
  console.log('[thumbnail-maske]', JSON.stringify(alpha))
  expect([alpha.w, alpha.h]).toEqual([2560, 1707])
  expect(alpha.a.slice(0, 2), 'fingertuppene fjernet').toEqual([0, 0])
  expect(alpha.a[2], 'håndbak beholdt').toBeGreaterThan(200)
  expect(alpha.a[3], 'underarm beholdt').toBeGreaterThan(200)
  expect(alpha.a.slice(4), 'bakgrunn og tekst fjernet').toEqual([0, 0])
  expect(errors).toEqual([])
})
