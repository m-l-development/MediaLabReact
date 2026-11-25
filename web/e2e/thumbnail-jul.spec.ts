import fs from 'node:fs'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/**
 * De 20 julemalene i Thumbnail Studio (kategori «Jul», tools/maler/jul-maler.mjs): de vises i malbiblioteket, åpnes som
 * vanlige maler med egne lag, tekst endres, bilder byttes, lag flyttes og skaleres, malen lagres og åpnes igjen, og
 * eksporten (1080p) er et ferdig bilde. Eksportene lagres i testens utdata for visuell kontroll.
 */
const JUL = Array.from({ length: 20 }, (_, i) => `JUL-${String(i + 1).padStart(2, '0')}`)

async function openJul(page: Page, code: string) {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Jul' }).click()
  await dlg.locator(`[data-tpl-item="${code}"]`).click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
}

/** Eksporterer 1080p PNG og gir målene, lysstyrkespredningen og andelen av en farge (± 40). */
async function exportPng(page: Page, info: TestInfo, name: string, rgb: [number, number, number] = [0, 0, 0]) {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30_000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  const file = info.outputPath(name)
  await (await dl).saveAs(file)
  return page.evaluate(async ({ b64, rgb }) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height }))
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let n = 0, s = 0, s2 = 0, hit = 0
    for (let i = 0; i < d.length; i += 64) {
      const y = 0.3 * (d[i] ?? 0) + 0.59 * (d[i + 1] ?? 0) + 0.11 * (d[i + 2] ?? 0)
      n++; s += y; s2 += y * y
      if (Math.abs((d[i] ?? 0) - rgb[0]) < 40 && Math.abs((d[i + 1] ?? 0) - rgb[1]) < 40 && Math.abs((d[i + 2] ?? 0) - rgb[2]) < 40) hit++
    }
    return { w: bmp.width, h: bmp.height, std: Math.sqrt(s2 / n - (s / n) ** 2), share: hit / n }
  }, { b64: fs.readFileSync(file).toString('base64'), rgb })
}

test('julemalene: kategorien «Jul» har 20 maler med skisser', async ({ page }) => {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Jul' }).click()
  await expect(dlg.locator('[data-tpl-item]')).toHaveCount(20)
  for (const code of JUL) await expect(dlg.locator(`[data-tpl-item="${code}"]`)).toHaveCount(1)
  await expect(dlg.locator('[data-tpl-item="JUL-01"] img')).toBeVisible({ timeout: 30_000 })
  await expect(dlg.getByText('Første søndag i advent')).toBeVisible()
})

test('julemalene: alle 20 åpnes og eksporteres som ferdige bilder i full oppløsning', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'alle malene på PC; mobil har egen test')
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const code of JUL) {
    await openJul(page, code)
    await dock(page, 'layers')
    expect(await page.locator('[data-layer]').count(), code).toBeGreaterThan(3)
    const r = await exportPng(page, info, `${code}.png`)
    expect([r.w, r.h], code).toEqual([1920, 1080])
    // ikke et tomt eller ensfarget bilde: tekst, former og lys gir variasjon
    expect(r.std, code).toBeGreaterThan(12)
  }
  expect(errors).toEqual([])
})

test('julemal: endre tekst, bytte bilde, flytte og skalere, lagre og åpne igjen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'pekerdraging testes på PC')
  test.setTimeout(180_000)
  await openJul(page, 'JUL-17')
  // bildefeltet (person) tar et bilde: «Mal»-panelet viser bildefeltene når ingen lag er valgt
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await ch).setFiles({ name: 'p.png', mimeType: 'image/png', buffer: png(200, 300, () => [20, 200, 40, 255]) })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
  // teksten er et vanlig tekstlag
  await dock(page, 'layers')
  await page.locator('[data-layer]').filter({ hasText: 'GOD JUL' }).first().getByText('GOD JUL', { exact: true }).click()
  await dock(page, 'edit')
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('GOD JUL HELE BYGDA')
  await dock(page, 'layers')
  await expect(page.locator('[data-layer]').filter({ hasText: 'GOD JUL HELE BYGDA' })).toHaveCount(1)
  // flytt tekstlaget og skaler det med hjørnehåndtaket
  const sel = page.locator('[data-ts-sel]')
  const b0 = (await sel.boundingBox())!
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2)
  await page.mouse.down()
  await page.mouse.move(b0.x + b0.width / 2 + 60, b0.y + b0.height / 2, { steps: 6 })
  await page.mouse.up()
  const b1 = (await sel.boundingBox())!
  expect(b1.x - b0.x).toBeGreaterThan(30)
  await page.mouse.move(b1.x + b1.width - 1, b1.y + b1.height - 1)
  await page.mouse.down()
  await page.mouse.move(b1.x + b1.width - 41, b1.y + b1.height - 41, { steps: 6 })
  await page.mouse.up()
  const b2 = (await sel.boundingBox())!
  expect(b2.width).toBeLessThan(b1.width - 10)
  // lagre og åpne igjen
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await dock(page, 'layers')
  await expect(page.locator('[data-layer]').filter({ hasText: 'GOD JUL HELE BYGDA' })).toHaveCount(1)
  // eksporten har bildet (grønt) og den røde mastheaden
  const r = await exportPng(page, info, 'JUL-17-redigert.png', [20, 200, 40])
  expect([r.w, r.h]).toEqual([1920, 1080])
  expect(r.share).toBeGreaterThan(0.01)
})

test('julemal på mobil: åpnes og eksporteres', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'mobil')
  test.setTimeout(180_000)
  await openJul(page, 'JUL-10')
  const r = await exportPng(page, info, 'JUL-10-mobil.png')
  expect([r.w, r.h]).toEqual([1920, 1080])
  expect(r.std).toBeGreaterThan(12)
  // ingen sideveis rulling på siden
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
})
