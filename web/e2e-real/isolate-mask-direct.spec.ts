import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from '../e2e/png'

/**
 * Ekte SlimSAM: «Finjuster masken» rett etter opplasting (hele bildet beholdt) → «Velg objekt» med Behold på skiven gir
 * bare skiven (bakgrunnen fjernet). Med Fjern etterpå på en del av skiven fjernes bare den delen.
 */
const IMG = png(400, 300, (x, y) => (Math.hypot(x - 200, y - 150) < 70 ? [210, 110, 30, 255] : [40, 80, 170, 255]))

async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement & { mlMaskView?: { s: number; ox: number; oy: number } }, [ix, iy]) => {
    const r = c.getBoundingClientRect()
    const v = c.mlMaskView!
    return { x: r.left + v.ox + (ix as number) * v.s, y: r.top + v.oy + (iy as number) * v.s }
  }, [x, y])
}

async function alpha(page: Page, file: string, pts: [number, number][]) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, list }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return list.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1)
  }, { data: b64, list: pts })
}

test('«Velg objekt» rett etter opplasting: Behold på skiven gir bare skiven', async ({ page }, info) => {
  test.setTimeout(600_000)
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'skive.png', mimeType: 'image/png', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.locator('[data-mask-open]').click()
  await page.locator('[data-mask-tool="select"]').click()
  await page.locator('[data-mask-keep="1"]').click()
  const p = await scr(page, 200, 150)
  await page.mouse.click(p.x, p.y)
  await expect(page.getByText('Velger objektet …')).toHaveCount(0, { timeout: 300_000 })
  await expect(page.getByText('Fant ikke noe objekt')).toHaveCount(0)
  await page.locator('[data-mask-done]').click()
  const pts: [number, number][] = [[200, 150], [170, 130], [240, 175], [20, 20], [380, 280], [200, 40], [60, 150]]
  const a = await alpha(page, info.outputPath('skive.png'), pts)
  console.log('alfa', JSON.stringify(a))
  expect(a.slice(0, 3), 'skiven beholdes').toEqual([255, 255, 255])
  expect(a.slice(3), 'bakgrunnen fjernes').toEqual([0, 0, 0, 0])
})
