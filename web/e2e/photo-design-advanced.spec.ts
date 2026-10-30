import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Photo Design → Avansert: avansert framkalling (hvit-/svartpunkt, vibrance, klarhet, skarphet, auto-tone, histogram,
 * før/etter). Vises bare i Avansert modus; standardmodus er uendret. Endringen synes på lerretet og lagres med prosjektet.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

const GRAD = png(320, 240, (x, y) => [Math.round((x / 319) * 200) + 20, Math.round((y / 239) * 120) + 60, 90, 255])
const mean = (page: Page) => page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let s = 0
  for (let i = 0; i < d.length; i += 4 * 97) s += d[i]! + d[i + 1]! + d[i + 2]!
  return s / (d.length / (4 * 97))
})

async function open(page: Page) {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'grad.png', mimeType: 'image/png', buffer: GRAD })
  await page.waitForTimeout(1200)
}

test('avansert framkalling: bare i Avansert modus, virker på lerretet, før/etter, auto-tone og lagring', async ({ page }) => {
  await open(page)
  const panel = page.locator('[data-pd-adv-dev]')
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(page.getByText('Looks')).toBeVisible()
  await expect(panel, 'standardmodus: ingen avansert framkalling').toHaveCount(0)

  // slå på Avansert modus (Effekter-fanen), tilbake til bildelaget
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(panel).toBeVisible()
  await expect(panel.locator('[data-pd-hist]')).toBeVisible()

  const m0 = await mean(page)
  await panel.locator('input[type="range"]').nth(0).fill('90') // hvitpunkt
  await expect.poll(() => mean(page), { message: 'hvitpunktet gjør bildet lysere' }).toBeGreaterThan(m0 + 2)
  const m1 = await mean(page)

  // før/etter: mens knappen holdes, vises originalen
  const before = panel.locator('[data-pd-before]')
  await before.hover()
  await page.mouse.down()
  await expect.poll(() => mean(page)).toBeLessThan(m1 - 2)
  await page.mouse.up()
  await expect.poll(() => mean(page)).toBeGreaterThan(m1 - 1)

  // auto-tone setter svartpunkt/hvitpunkt ut fra bildet
  await panel.locator('[data-pd-auto]').click()
  await expect.poll(async () => panel.locator('input[type="range"]').nth(1).inputValue()).not.toBe('0')

  // lagring og gjenåpning
  const saved = await panel.locator('input[type="range"]').nth(0).inputValue()
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(panel).toBeVisible()
  await expect(panel.locator('input[type="range"]').nth(0)).toHaveValue(saved)
})
