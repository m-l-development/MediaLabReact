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
  // ett bibliotek: «Alle maler» + 12 felles kategorier; alle 178 ferdige maler (27 oppsett + 151 fra designsamlingen)
  await expect(dlg.locator('[data-tpl-cats] button')).toHaveCount(13)
  await expect(dlg.locator('[data-tpl-item]')).toHaveCount(178)
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Generell video' }).click()
  await expect(dlg.locator('[data-tpl-item]')).toHaveCount(28)
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Teaser' }).click()
  await expect(dlg.locator('[data-tpl-item]')).toHaveCount(24)
  // oppsett og designsamlingen i samme kategori (Promo: 3 oppsett + designsamlingens promo-maler)
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Promo' }).click()
  await expect(dlg.locator('[data-tpl-item="promo"]')).toHaveCount(1)
  expect(await dlg.locator('[data-tpl-item]').count()).toBeGreaterThan(3)
  // summen av kategoriene = hele biblioteket (hver mal i nøyaktig én kategori, ingen duplikater)
  const nums = await dlg.locator('[data-tpl-cats] button span').allTextContents()
  expect(nums.slice(1).reduce((s, x) => s + Number(x), 0)).toBe(Number(nums[0]))
  // «Ny mal» (grunnoppsett + blank) står utenfor biblioteket
  await expect(dlg.locator('[data-tpl-lib] [data-layout^="base:"], [data-tpl-lib] [data-layout="blank"]')).toHaveCount(0)
  await expect(dlg.locator('[data-layout="blank"]')).toHaveCount(1)
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Generell video' }).click()
  await expect(dlg.locator('[data-tpl-item="GEN-01"] img')).toBeVisible({ timeout: 30_000 })
  await dlg.locator('[data-tpl-item="GEN-01"]').click()
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
  await dlg.locator('[data-tpl-cats] button', { hasText: 'Teaser' }).click()
  await dlg.locator('[data-tpl-item="tsr-07"]').click()
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

test('skisser: grunnoppsettene og alle ferdige maler får forhåndsvisning (ingen blir stående på «Lager skisse …»)', async ({ page }, info) => {
  test.slow()
  const errors = errorsOf(page)
  if (info.project.name !== 'mobil') await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  // grunnoppsettet (feilen: køen for biblioteket avbrøt grunnoppsettene)
  await expect(dlg.locator('[data-layout="base:main"] img')).toBeVisible({ timeout: 20_000 })
  const lib = dlg.locator('[data-tpl-lib]')
  // hver kategori: rull gjennom alle kortene; hvert kort får et bilde
  const cats = await lib.locator('[data-tpl-cats] button').evaluateAll((els) => els.map((e) => e.getAttribute('data-tpl-cat')!))
  for (const cat of cats.filter((x) => x !== '*').slice(0, info.project.name === 'mobil' ? 4 : 12)) {
    await lib.locator(`[data-tpl-cat="${cat}"]`).click()
    const items = lib.locator('[data-tpl-item]')
    const n = await items.count()
    // de første kortene og det siste (etter rulling til bunnen): synlige først, resten når man ruller
    for (const i of [...new Set([...Array(Math.min(n, 8)).keys(), n - 1])]) {
      const it = items.nth(i)
      await it.scrollIntoViewIfNeeded()
      await expect(it.locator('img'), `${cat} nr. ${i + 1}`).toBeVisible({ timeout: 20_000 })
    }
  }
  // «Alle maler»: hvert 15. kort gjennom hele biblioteket
  await lib.locator('[data-tpl-cat="*"]').click()
  const all = lib.locator('[data-tpl-item]')
  const total = await all.count()
  for (let i = 0; i < total; i += 15) {
    await all.nth(i).scrollIntoViewIfNeeded()
    await expect(all.nth(i).locator('img'), `alle nr. ${i + 1}`).toBeVisible({ timeout: 20_000 })
  }
  await expect(dlg.locator('[data-prev-err]')).toHaveCount(0)
  expect(errors).toEqual([])
})
