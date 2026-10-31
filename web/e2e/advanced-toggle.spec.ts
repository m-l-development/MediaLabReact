import { expect, test, type Page } from '@playwright/test'

/** «Avansert modus» står på samme linje som «Autolagring» i Photo Design og Motion Design, og valget virker og huskes. */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'verktøylinjen på PC/nettbrett'))

async function sameRow(page: Page) {
  const auto = await page.getByRole('switch', { name: 'Autolagring' }).boundingBox()
  const adv = await page.locator('[data-adv-toggle]').boundingBox()
  expect(auto && adv, 'begge kontrollene vises').toBeTruthy()
  expect(Math.abs(auto!.y + auto!.height / 2 - (adv!.y + adv!.height / 2)), 'samme horisontale linje').toBeLessThan(3)
  expect(adv!.x >= auto!.x + auto!.width - 1, 'ved siden av, uten overlapp').toBe(true)
}

for (const width of [1440, 1024]) {
  test(`Photo Design (${width} px): Avansert ved Autolagring, slår på effektbiblioteket`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app/photo-design')
    await page.locator('[data-tpl="photo"]').click()
    await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
    await sameRow(page)
    const sw = page.locator('[data-adv-toggle]')
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await page.getByRole('button', { name: 'Effekter', exact: true }).click()
    await expect(page.locator('[data-pd-fx-open]')).toHaveCount(0)
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-pd-fx-open]')).toBeVisible()
  })

  test(`Motion Design (${width} px): Avansert ved Autolagring, huskes etter omlasting`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app/motion-design')
    await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
    await page.locator('[data-format="wide"]').click()
    await page.locator('[data-tpl="blank"]').click()
    await sameRow(page)
    const sw = page.locator('[data-adv-toggle]')
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(await page.evaluate(() => localStorage.getItem('motiondesign.advanced'))).toBe('1')
  })
}
