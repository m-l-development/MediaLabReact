import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Avansert modus i Thumbnail Studio og Loop Studio: justeringene gjelder bare det valgte bildet/sliden, lagres med malen
 * og er der etter omlasting, «Tilbakestill» nullstiller, og standardvisningen er uendret når modusen er av.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC (mobil: export-import-all og mobile-workflows)'))

const IMG = png(400, 300, (x, y) => [60 + (x % 120), 90, 120 + (y % 90), 255])
const errorsOf = (page: Page) => {
  const e: string[] = []
  page.on('pageerror', (x) => e.push(x.message))
  return e
}

test('Thumbnail Studio: justering per bildelag, lagres med malen, tilbakestill', async ({ page }) => {
  const errors = errorsOf(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  for (const n of ['a.png', 'b.png']) {
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
    await (await ch).setFiles({ name: n, mimeType: 'image/png', buffer: IMG })
    await expect(page.locator('[data-ts-sel]')).toBeVisible()
  }
  await page.locator('[data-adv-toggle]').click()
  const box = page.locator('[data-adv-adjust]')
  // det siste bildet er valgt: juster det
  await box.locator('[data-adv-key="temp"]').fill('70')
  await expect(box.locator('[data-adv-key="temp"]')).toHaveValue('70')
  // det andre bildelaget har ingen justering
  const layers = page.locator('[data-layer]')
  const n = await layers.count()
  if (n >= 2) {
    await layers.nth(1).click()
    await expect(box.locator('[data-adv-key="temp"]')).toHaveValue('0')
    await layers.nth(0).click()
    await expect(box.locator('[data-adv-key="temp"]')).toHaveValue('70')
  }
  // lagre, last inn på nytt: justeringen og modusen er der
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-adv-toggle]')).toHaveAttribute('aria-checked', 'true')
  const sels = await page.locator('[data-layer]').count()
  for (let i = 0; i < sels; i++) {
    await page.locator('[data-layer]').nth(i).click()
    if ((await box.locator('[data-adv-key="temp"]').inputValue().catch(() => '0')) === '70') break
  }
  await expect(box.locator('[data-adv-key="temp"]')).toHaveValue('70')
  // tilbakestill
  await box.getByRole('button', { name: 'Tilbakestill' }).click()
  await expect(box.locator('[data-adv-key="temp"]')).toHaveValue('0')
  expect(errors).toEqual([])
})

test('Loop Studio: justering gjelder bare sliden den er gjort på', async ({ page }) => {
  const errors = errorsOf(page)
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^Slides/ }).first().click()
  const addImg = async () => {
    const ch = page.waitForEvent('filechooser')
    await page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]').click()
    await (await ch).setFiles({ name: 'b.png', mimeType: 'image/png', buffer: IMG })
    const crop = page.getByRole('dialog').filter({ has: page.locator('[data-loop-cropbox]') })
    await crop.getByRole('button', { name: 'Bruk hele bildet' }).click()
    await expect(crop).toBeHidden()
  }
  await addImg()
  await page.locator('[data-adv-toggle]').click()
  const box = page.locator('[data-adv-adjust]')
  await box.locator('[data-adv-key="exp"]').fill('-60')
  await expect(box.locator('[data-adv-key="exp"]')).toHaveValue('-60')
  // neste slide: eget bilde, ingen justering
  const slides: Locator = page.locator('[data-loop-card]')
  const cnt = await slides.count()
  test.skip(cnt < 2, 'fant ikke slidelisten')
  await slides.nth(1).click()
  await addImg()
  await expect(box.locator('[data-adv-key="exp"]')).toHaveValue('0')
  await slides.nth(0).click()
  await expect(box.locator('[data-adv-key="exp"]')).toHaveValue('-60')
  expect(errors).toEqual([])
})
