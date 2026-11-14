import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Ferdige maler med flere bildefelt enn grensen på 5 egne bilder (trl-22: 12 portretter): grensen blir antall felt i
 * malen, så alle feltene kan fylles. Andre maler beholder grensen på 5.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

/** 12 tydelig ulike farger (én per felt). */
const COLORS: [number, number, number][] = [[230, 30, 30], [30, 200, 40], [30, 60, 230], [240, 200, 20], [200, 30, 200], [20, 200, 210], [250, 130, 20], [120, 60, 20], [140, 140, 140], [255, 160, 200], [20, 90, 60], [120, 20, 160]]

async function newFrom(page: Page, cat: string, code: string) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  await dlg.locator('[data-lib-cats] button', { hasText: cat }).click()
  await dlg.locator(`[data-lib="${code}"]`).click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
}

async function fill(page: Page, i: number) {
  await page.locator('[data-layer]').filter({ hasText: /^BILDE\s*Bilde/i }).nth(i).getByText('Bilde', { exact: true }).last().click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /^(Velg bilde|Bytt bilde)$/ }).first().click()
  const v = 20 + i * 19
  await (await ch).setFiles({ name: `p${i}.png`, mimeType: 'image/png', buffer: png(120, 90, () => [v, v, v, 255]) })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
}

test('trl-22: alle 12 bildefeltene kan fylles, og alle er med i eksporten', async ({ page }, info) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newFrom(page, 'Trailer', 'trl-22')
  await expect(page.locator('[data-layer]').filter({ hasText: /^BILDE\s*Bilde/i })).toHaveCount(12)
  for (let i = 0; i < 12; i++) await fill(page, i)
  await expect(page.getByText('Maks 5 bilder per mal')).toHaveCount(0)
  // lagres og åpnes igjen med alle bildene
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30_000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  const file = info.outputPath('trl22.png')
  await (await dl).saveAs(file)
  // malen har F06 Svart-hvitt på feltene (materialet): bildene er 12 gråtoner i stigende lyshet, lagt inn fra øverst i
  // laglisten (siste felt først); feltene i eksporten må ha nøyaktig den rekkefølgen – da står hvert bilde i sitt felt
  const lum = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const out: number[] = []
    for (let i = 0; i < 12; i++) {
      const d = g.getImageData(30 + (i % 4) * 468 + 24, 30 + Math.floor(i / 4) * 348 + 24, 40, 40).data
      let s = 0
      for (let j = 0; j < d.length; j += 4) s += (d[j] ?? 0) * 0.3 + (d[j + 1] ?? 0) * 0.59 + (d[j + 2] ?? 0) * 0.11
      out.push(s / (d.length / 4))
    }
    return out
  }, fs.readFileSync(file).toString('base64'))
  // midtraden ligger under en lys flate i designet (bildene skinner svakt gjennom): synkende innen hver rad
  const why = JSON.stringify(lum.map((v) => Math.round(v * 10) / 10))
  for (let i = 1; i < 12; i++) if (i % 4) expect(lum[i] ?? 0, why).toBeLessThan((lum[i - 1] ?? 0) - 0.4)
  expect(Math.min(...lum.slice(0, 4)), why).toBeGreaterThan(Math.max(...lum.slice(8)))
  expect(errors).toEqual([])
})

test('andre maler beholder grensen på 5 egne bilder', async ({ page }) => {
  await newFrom(page, 'Trailer', 'trl-22')
  // samme flyt i en vanlig, tom mal: det sjette bildet avvises
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  for (let i = 0; i < 6; i++) {
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
    const [r, g, b] = COLORS[i] ?? [0, 0, 0]
    await (await ch).setFiles({ name: `q${i}.png`, mimeType: 'image/png', buffer: png(60, 40, () => [r, g, b, 255]) })
    if (i < 5) await expect(page.locator('[data-layer]').filter({ hasText: /^BILDE/i })).toHaveCount(i + 1)
  }
  await expect(page.getByText('Maks 5 bilder per mal. Fjern et bilde først.')).toBeVisible()
  await expect(page.locator('[data-layer]').filter({ hasText: /^BILDE/i })).toHaveCount(5)
})
