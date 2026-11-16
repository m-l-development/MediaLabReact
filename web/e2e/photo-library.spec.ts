import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/**
 * Ferdige maler fra designsamlingen i Photo Design (docs/maler-og-fonter.md, fase 5): startsiden viser malene per
 * kategori, en mal blir et prosjekt i malens format med vanlige lag, bildefeltet tar et bilde, og prosjektet lagres,
 * åpnes igjen og eksporteres.
 */
test('ferdig mal: velg fra kategorien, legg inn bilde, lagre, åpne igjen og eksporter', async ({ page }, info) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (info.project.name !== 'mobil') await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  // ett malbibliotek på siden: «Alle maler» + de fem kategoriene; Photos egne maler er fordelt i dem
  await page.locator('[data-pd-lib-open]').click()
  const lib = page.locator('[data-tpl-picker] [data-tpl-lib]')
  await expect(lib.locator('[data-tpl-cats] button')).toHaveCount(6)
  await expect(lib.locator('[data-tpl-item]')).toHaveCount(118)
  const nums = await lib.locator('[data-tpl-cats] button span').allTextContents()
  expect(nums.slice(1).reduce((s, x) => s + Number(x), 0)).toBe(Number(nums[0]))
  // «Tomt» (ny mal) står for seg, utenfor biblioteket
  await expect(lib.locator('[data-tpl-item="blank"]')).toHaveCount(0)
  await expect(page.locator('[data-pd-new] [data-tpl="blank"]')).toHaveCount(1)
  await lib.locator('[data-tpl-cats] button', { hasText: 'Program, ukeplan og kalender' }).click()
  await expect(lib.locator('[data-tpl-item="week"]')).toHaveCount(1)
  await expect(lib.locator('[data-tpl-item]')).toHaveCount(23)
  await expect(lib.locator('[data-tpl-item]').first()).toBeVisible()
  await lib.locator('[data-tpl-cats] button', { hasText: 'Festival og konsert' }).click()
  await expect(lib.locator('[data-tpl-item]')).toHaveCount(21)
  await lib.locator('[data-tpl-cats] button', { hasText: 'Arrangement og plakater' }).click()
  await lib.locator('[data-tpl-item="001"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  // malens format (Instagram 4:5) og lag: teksten fra designet er et vanlig tekstlag
  await dock(page, 'layers')
  await expect(page.getByText('SØNDAG').first()).toBeVisible()
  // et bilde i det første bildefeltet (Bytt bilde via bildefeltet)
  await dock(page, 'add')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'g.png', mimeType: 'image/png', buffer: png(300, 400, () => [20, 200, 40, 255]) })
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  // eksport: 1080 × 1350 med det grønne bildet og gullbåndet fra designet
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  const file = info.outputPath('mal.png')
  await (await dl).saveAs(file)
  const r = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height }))
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let green = 0
    let gold = 0
    for (let i = 0; i < d.length; i += 64) {
      if (Math.abs((d[i] ?? 0) - 20) < 40 && Math.abs((d[i + 1] ?? 0) - 200) < 40 && Math.abs((d[i + 2] ?? 0) - 40) < 40) green++
      if (Math.abs((d[i] ?? 0) - 214) < 30 && Math.abs((d[i + 1] ?? 0) - 162) < 30 && (d[i + 2] ?? 0) < 80) gold++
    }
    return { w: bmp.width, h: bmp.height, green: green / (d.length / 64), gold: gold / (d.length / 64) }
  }, fs.readFileSync(file).toString('base64'))
  expect([r.w, r.h]).toEqual([1080, 1350])
  expect(r.green).toBeGreaterThan(0.02)
  expect(r.gold).toBeGreaterThan(0.02)
  expect(errors).toEqual([])
})
