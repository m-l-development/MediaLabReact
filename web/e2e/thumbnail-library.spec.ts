import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/**
 * Ferdige maler fra designsamlingen i Thumbnail Studio (docs/maler-og-fonter.md, fase 3): «Ny mal» viser malene per
 * kategori, en mal blir en vanlig mal med egne lag, bildefeltet tar et bilde, og malen lagres, åpnes og eksporteres.
 */
const errorsOf = (page: Page) => {
  const e: string[] = []
  page.on('pageerror', (x) => e.push(x.message))
  return e
}

test('ferdig mal: velg fra kategorien, bytt bilde, lagre, åpne igjen og eksporter', async ({ page }, info) => {
  test.slow()
  const errors = errorsOf(page)
  if (info.project.name !== 'mobil') await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  // seks kategorier fra materialet; Generell video har 28 maler
  await expect(dlg.locator('[data-lib-cats] button')).toHaveCount(6)
  await expect(dlg.locator('[data-lib]')).toHaveCount(28)
  await dlg.locator('[data-lib-cats] button', { hasText: 'Teaser' }).click()
  await expect(dlg.locator('[data-lib]')).toHaveCount(24)
  await dlg.locator('[data-lib-cats] button', { hasText: 'Generell video' }).click()
  await expect(dlg.locator('[data-lib="GEN-01"] img')).toBeVisible({ timeout: 30_000 })
  await dlg.locator('[data-lib="GEN-01"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  // malens lag: teksten fra designet er et vanlig tekstlag
  await dock(page, 'layers')
  await expect(page.locator('[data-layer]').filter({ hasText: 'HVERDAGEN' })).toHaveCount(1)
  // bildefeltet (person, bue-topp) tar et bilde
  await page.locator('[data-layer]').filter({ hasText: /Person/ }).first().click()
  await dock(page, 'edit')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await ch).setFiles({ name: 'p.png', mimeType: 'image/png', buffer: png(200, 300, () => [20, 200, 40, 255]) })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
  // lagre og åpne igjen
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await dock(page, 'layers')
  await expect(page.locator('[data-layer]').filter({ hasText: 'HVERDAGEN' })).toHaveCount(1)
  // eksport 1080p: det grønne bildet og den gule markøren fra designet er med
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30_000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  const file = info.outputPath('mal.png')
  await (await dl).saveAs(file)
  const share = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let green = 0
    let yellow = 0
    for (let i = 0; i < d.length; i += 64) {
      if (Math.abs((d[i] ?? 0) - 20) < 40 && Math.abs((d[i + 1] ?? 0) - 200) < 40 && Math.abs((d[i + 2] ?? 0) - 40) < 40) green++
      if (Math.abs((d[i] ?? 0) - 245) < 25 && Math.abs((d[i + 1] ?? 0) - 217) < 25 && (d[i + 2] ?? 0) < 60) yellow++
    }
    return { w: bmp.width, green: green / (d.length / 64), yellow: yellow / (d.length / 64) }
  }, fs.readFileSync(file).toString('base64'))
  expect(share.w).toBe(1920)
  expect(share.green).toBeGreaterThan(0.1)
  expect(share.yellow).toBeGreaterThan(0.01)
  expect(errors).toEqual([])
})

test('bilde i teksten: malens bokstaver fylles med et valgt bilde', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC (samme panel på mobil)')
  const errors = errorsOf(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  await dlg.locator('[data-lib-cats] button', { hasText: 'Teaser' }).click()
  await dlg.locator('[data-lib="tsr-07"]').click()
  await page.locator('[data-layer]').getByText('HÅP', { exact: true }).click()
  await expect(page.getByText('Bilde i teksten')).toBeVisible()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await ch).setFiles({ name: 'b.png', mimeType: 'image/png', buffer: png(300, 200, () => [20, 200, 40, 255]) })
  await expect(page.getByRole('button', { name: 'Fjern bildet' })).toBeVisible()
  // bokstavene er grønne på lerretet
  await expect.poll(() => page.evaluate(() => {
    const cv = document.querySelector('[data-ts-canvas]') as HTMLCanvasElement
    const d = (cv.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, cv.width, cv.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 64) if (Math.abs((d[i] ?? 0) - 20) < 40 && Math.abs((d[i + 1] ?? 0) - 200) < 40 && Math.abs((d[i + 2] ?? 0) - 40) < 40) n++
    return n / (d.length / 64)
  }), { timeout: 15_000 }).toBeGreaterThan(0.03)
  expect(errors).toEqual([])
})
