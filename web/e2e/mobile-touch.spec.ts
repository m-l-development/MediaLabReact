import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Mobil (berøring): handlingene som på PC ligger i høyreklikkmenyen, nås med «⋯» (shared/ui/MoreButton) på lag,
 * kort og valgte objekter; menyvalgene er store nok for fingre; Thumbnail kan redigere lag på mobil.
 * På PC med mus er «⋯» skjult, så desktop er uendret.
 */
const more = (page: Page) => page.locator('[data-more]')

test.describe('mobil', () => {
  test.skip(({ isMobile }) => !isMobile, 'bare mobil')

  test('Photo Design: «⋯» på det valgte laget og i lagpanelet åpner lagmenyen; menyvalgene er fingerstore', async ({ page }) => {
    await page.goto('/app/photo-design')
    await page.locator('[data-tpl="photo"]').tap()
    const row = page.locator('[data-layer]').first()
    await row.tap()
    const sel = page.locator('[data-pd-selbox] [data-more]')
    await expect(sel).toBeVisible()
    const sb = (await sel.boundingBox())!
    expect(sb.width).toBeGreaterThanOrEqual(44)
    await sel.tap()
    const menu = page.getByRole('menu', { name: 'Lagmeny' })
    await expect(menu).toBeVisible()
    const item = (await menu.getByRole('menuitem').first().boundingBox())!
    expect(item.height).toBeGreaterThanOrEqual(44)
    await menu.getByRole('menuitem', { name: /^Dupliser/ }).tap()
    await expect(menu).toHaveCount(0)
    // lagpanelets «⋯»
    await row.locator('[data-more]').tap()
    await expect(menu).toBeVisible()
  })

  test('Thumbnail Studio: lag kan velges og redigeres på mobil, «⋯» gir lagmenyen', async ({ page }) => {
    await page.goto('/app/thumbnail-studio')
    await page.getByRole('button', { name: /Søndagsmøte/ }).tap()
    await page.getByRole('button', { name: /Ny mal/ }).tap()
    await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').tap()
    const ov = page.locator('[data-ts-overlay]')
    await expect(ov).toBeVisible()
    const b = (await ov.boundingBox())!
    await page.touchscreen.tap(b.x + b.width * 0.3, b.y + b.height * 0.35)
    const sel = page.locator('[data-ts-sel]')
    await expect(sel).toBeVisible()
    await sel.locator('[data-more]').tap()
    await expect(page.getByRole('menu', { name: 'Lagmeny' })).toBeVisible()
  })

  test('Dine medier og Motion: «⋯» på kortet og i avspillingslinjen', async ({ page }) => {
    await page.goto('/app/medier')
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Last opp' }).tap()
    await (await ch).setFiles({ name: 'kort.png', mimeType: 'image/png', buffer: png(64, 48, () => [200, 120, 40, 255]) })
    const card = page.locator('[data-media-card]').filter({ hasText: 'kort.png' })
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.locator('[data-more]').tap()
    await expect(page.getByRole('menu', { name: 'kort.png' }).getByRole('menuitem', { name: 'Last ned' })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto('/app/motion-design')
    await page.getByRole('button', { name: 'Nytt prosjekt' }).tap()
    await page.locator('[data-format="wide"]').tap()
    await page.locator('[data-tpl="blank"]').tap()
    await page.getByRole('button', { name: 'Handlinger for tidslinjen' }).tap()
    await expect(page.getByRole('menu').getByRole('menuitem').first()).toBeVisible()
  })
})

test('PC med mus: «⋯» er skjult (desktop uendret)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'bare PC')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').first().click()
  await expect(more(page).first()).toBeHidden()
  expect(await more(page).evaluateAll((els) => els.every((e) => getComputedStyle(e).display === 'none'))).toBe(true)
})
