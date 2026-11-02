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
    await page.locator('[data-dock-tab="layers"]').tap()
    const row = page.locator('[data-layer]').first()
    await row.tap()
    const sel = page.locator('[data-pd-selbox] [data-more]')
    await expect(sel).toBeVisible()
    const sb = (await sel.boundingBox())!
    expect(sb.width).toBeGreaterThanOrEqual(40)
    await sel.tap()
    const menu = page.getByRole('menu', { name: 'Lagmeny' })
    await expect(menu).toBeVisible()
    const item = (await menu.getByRole('menuitem').first().boundingBox())!
    expect(item.height).toBeGreaterThanOrEqual(44)
    await menu.getByRole('menuitem', { name: /^Dupliser/ }).tap()
    await expect(menu).toHaveCount(0)
    // lagpanelets «⋯»
    await page.locator('[data-dock-tab="layers"]').tap() // Dupliser åpnet «Rediger» for det nye laget
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

test.describe('mobil: Motion-tidslinjen', () => {
  test.skip(({ isMobile }) => !isMobile, 'bare mobil')
  test('trykk velger et klipp uten å flytte det; knip med to fingre zoomer tidslinjen', async ({ page }) => {
    await page.goto('/app/motion-design')
    await page.getByRole('button', { name: 'Nytt prosjekt' }).tap()
    await page.locator('[data-format="wide"]').tap()
    await page.locator('[data-tpl="blank"]').tap()
    await page.locator('[data-adv-toggle]').tap()
    const ch = page.waitForEvent('filechooser')
    await page.locator('[data-md-bin-import]').tap()
    await (await ch).setFiles([{ name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) }])
    await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').tap()
    await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').tap()
    const clip = page.locator('[data-row="video"] [data-block]').nth(1)
    await clip.scrollIntoViewIfNeeded()
    const left0 = await clip.evaluate((e) => (e as HTMLElement).style.left)
    await clip.tap()
    await expect(clip).toHaveAttribute('data-sel', '')
    expect(await clip.evaluate((e) => (e as HTMLElement).style.left)).toBe(left0) // samme tid i tidslinjen
    // knip: to fingre fra hverandre over tidslinjen
    const zoom = page.locator('[data-md-zoom]')
    const z0 = Number(await zoom.inputValue())
    const tl = page.locator('[data-row="video"]')
    const tb = (await tl.boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const y = tb.y + tb.height / 2
    const cx = tb.x + tb.width / 2
    const pts = (d: number) => [{ x: cx - d, y, id: 1 }, { x: cx + d, y, id: 2 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) })
    for (const d of [45, 60, 80, 100]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(z0)
  })
})
