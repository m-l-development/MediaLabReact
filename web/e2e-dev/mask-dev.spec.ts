import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { png } from '../e2e/png'

/**
 * Den felles maskeredigeringen i Dev (produksjonsbygg), innlogget med den syntetiske testkontoen: Isolate Subject
 * (verktøyene, eksportert PNG), Photo Design («Finjuster masken …», tegningen) og Thumbnail Studio («Finjuster
 * utklippet» etter AI-utklipp, det lagrede utklippet). Lagrer ingen prosjekter eller maler.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'pekerverktøy testes på PC'))

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
  const v = (await page.evaluate(async () => (await (await fetch('/app/version.json', { cache: 'no-store' })).json()) as { v: string })).v.slice(0, 7)
  console.log(`[maske-dev] Dev-versjon: ${v}`)
}
async function scr(page: Page, scope: string, x: number, y: number) {
  return page.locator(`${scope} [data-mask-canvas]`).evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}
async function rect(page: Page, scope: string, a: [number, number], b: [number, number]) {
  await page.locator(`${scope} [data-mask-tool="rect"]`).click()
  await page.locator(`${scope} [data-mask-keep="0"]`).click()
  const p = await scr(page, scope, ...a)
  const q = await scr(page, scope, ...b)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(q.x, q.y, { steps: 6 })
  await page.mouse.up()
}

test('Isolate Subject: «Finjuster masken» endrer eksporten', async ({ page }, info) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'kvadrat.png', mimeType: 'image/png', buffer: png(400, 300, (x, y) => (x >= 100 && x < 300 && y >= 50 && y < 250 ? [220, 30, 30, 255] : [255, 255, 255, 255])) })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await page.locator('[data-mask-open]').click()
  await rect(page, 'main', [150, 100], [250, 200])
  await page.locator('[data-mask-done]').click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('isolate.png')
  await (await dl).saveAs(file)
  const a = await page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return [[200, 150], [120, 70], [50, 150]].map(([x, y]) => g.getImageData(x ?? 0, y ?? 0, 1, 1).data[3] ?? -1)
  }, fs.readFileSync(file).toString('base64'))
  console.log(`[maske-dev] Isolate: ${JSON.stringify(a)}`)
  expect(a).toEqual([0, 255, 0])
})

test('Photo Design: «Finjuster masken …» skrives til laget', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await chooser).setFiles({ name: 'gronn.png', mimeType: 'image/png', buffer: png(400, 300, () => [30, 200, 60, 255]) })
  await page.locator('[data-layer]').filter({ hasText: 'gronn' }).first().click()
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await page.locator('[data-pd-mask-open]').click()
  await rect(page, '[data-pd-mask]', [-5, -5], [200, 305])
  await page.locator('[data-pd-mask-apply]').click()
  const at = (fx: number) => page.locator('[data-pd-view="edit"] canvas').first().evaluate((c: HTMLCanvasElement, x) => {
    const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(Math.floor(c.width * x), Math.floor(c.height / 2), 1, 1).data
    return (d[1] ?? 0) > 150 && (d[0] ?? 0) < 90
  }, fx)
  await expect.poll(() => at(0.25)).toBe(false)
  expect(await at(0.75)).toBe(true)
  console.log('[maske-dev] Photo: venstre halvdel fjernet, høyre står')
})

test('Thumbnail Studio: «Finjuster utklippet» etter AI-utklipp lagres i utklippet', async ({ page }) => {
  test.setTimeout(400_000)
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await chooser).setFiles({ name: 'hender.png', mimeType: 'image/png', buffer: fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images', 'torsdag.png')) })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Objekt', exact: true }).first().click()
  await expect(page.locator('[data-ts-mask-open]')).toBeVisible({ timeout: 240_000 })
  await page.locator('[data-ts-mask-open]').click()
  await rect(page, '[data-ts-mask]', [2100, 200], [2340, 440])
  await page.locator('[data-ts-mask-apply]').click()
  await expect(page.getByText('Utklippet er oppdatert.')).toBeVisible({ timeout: 60_000 })
  const a = await page.locator('img[src^="blob:"]').first().evaluate(async (img: HTMLImageElement) => {
    const bmp = await createImageBitmap(await (await fetch(img.src)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return [[2200, 280], [1800, 1050], [2350, 800]].map(([x, y]) => g.getImageData(x ?? 0, y ?? 0, 1, 1).data[3] ?? -1)
  })
  console.log(`[maske-dev] Thumbnail: ${JSON.stringify(a)}`)
  expect(a[0]).toBe(0)
  expect(a[1]).toBeGreaterThan(200)
  expect(a[2]).toBe(0)
})
