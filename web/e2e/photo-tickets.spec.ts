import { expect, test } from '@playwright/test'
import { png } from './png'

/**
 * TB-6D1979: glidere med tall – tallet kan skrives inn, dobbeltklikk på glideren (eller ↺) nullstiller.
 * TB-7204A6: «Slett alle» (etter bekreftelse, kan angres) og «Velg flere» (trykk velger flere lag uten Shift).
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

test('TB-6D1979: tall i glideren kan skrives inn, dobbeltklikk og ↺ nullstiller', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'g.png', mimeType: 'image/png', buffer: png(160, 120, (x) => [x, 120, 200 - x, 255]) })
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  const slider = page.getByRole('slider').first()
  const name = (await slider.getAttribute('aria-label')) as string
  const row = slider.locator('xpath=..')
  // skriv inn et tall
  await row.locator('[data-num-field]').click()
  await row.locator('[data-num-input]').fill('25')
  await row.locator('[data-num-input]').press('Enter')
  await expect(slider).toHaveValue('25')
  // dobbeltklikk på glideren nullstiller
  await slider.dblclick()
  await expect(slider).toHaveValue('0')
  // ↺ nullstiller også
  await slider.fill('40')
  await expect(slider).toHaveValue('40')
  await page.getByRole('button', { name: new RegExp(`: ${name}$`) }).filter({ has: page.locator(':scope[data-range-reset]') }).or(row.locator('[data-range-reset]')).first().click()
  await expect(slider).toHaveValue('0')
})

test('TB-7204A6: «Velg flere» velger lag uten Shift; «Slett alle» spør, sletter ulåste lag og kan angres', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  const layers = page.locator('[data-layer]')
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await page.locator('[data-pd-shapes] [data-shape="rect"]').click()
  await page.locator('[data-pd-shapes] [data-shape="ellipse"]').click().catch(() => page.locator('[data-pd-shapes] [data-shape]').nth(1).click())
  const n = await layers.count()
  expect(n).toBeGreaterThanOrEqual(3)

  // Velg flere: vanlige klikk legger til i valget (først ingenting valgt)
  await page.locator('[data-pd-wrap]').click({ position: { x: 3, y: 3 } })
  await page.keyboard.press('Escape')
  await page.locator('[data-pd-pick-many]').click()
  await expect(page.locator('[data-pd-pick-many]')).toHaveAttribute('aria-pressed', 'true')
  await layers.nth(0).click({ position: { x: 6, y: 6 } })
  await layers.nth(1).click({ position: { x: 6, y: 6 } })
  await expect(page.getByText(/2 lag valgt/)).toBeVisible()
  await page.locator('[data-pd-pick-many]').click()

  // Slett alle: avbryt i dialogen gjør ingenting
  page.once('dialog', (d) => void d.dismiss())
  await page.locator('[data-pd-del-all]').click()
  await expect(layers).toHaveCount(n)
  // bekreft: alle lag slettes, Ctrl+Z henter dem tilbake
  page.once('dialog', (d) => void d.accept())
  await page.locator('[data-pd-del-all]').click()
  await expect(layers).toHaveCount(0)
  await page.locator('[data-pd-wrap]').click({ position: { x: 3, y: 3 } })
  await page.keyboard.press('Control+z')
  await expect(layers).toHaveCount(n)
})
