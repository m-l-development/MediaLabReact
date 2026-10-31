import { expect, test } from '@playwright/test'

/** «← Media Lab» og «← SoMe-mappen» i verktøyene i SoMe-mappen (Photo Design, Motion Design). */

test('Photo Design: «← SoMe-mappen» går til SoMe-oversikten, «← Media Lab» til forsiden', async ({ page }) => {
  await page.goto('/app/photo-design')
  const some = page.getByRole('link', { name: /SoMe-mappen/ })
  const lab = page.getByRole('link', { name: 'Media Lab' })
  await expect(some).toBeVisible()
  await expect(lab).toBeVisible()
  await expect(some).toHaveAttribute('href', '/app/#some')
  // side om side uten overlapp, og ingen vannrett rulling
  const a = await lab.boundingBox()
  const b = await some.boundingBox()
  expect(a && b && (a.x + a.width <= b.x || a.y + a.height <= b.y), 'knappene overlapper ikke').toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

  await some.click()
  await expect(page).toHaveURL(/\/app\/#some$/)
  await expect(page.getByRole('heading', { level: 1, name: 'SoMe' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Photo design/i }).first()).toBeVisible()

  // fra editoren (undersiden) og tilbake til forsiden
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await expect(page.getByRole('link', { name: /SoMe-mappen/ })).toBeVisible()
  await page.getByRole('link', { name: 'Media Lab' }).click()
  await expect(page).toHaveURL(/\/app\/$/)
})

test('Motion Design har den samme; andre verktøy har bare «← Media Lab»', async ({ page }) => {
  await page.goto('/app/motion-design')
  await expect(page.getByRole('link', { name: /SoMe-mappen/ })).toHaveAttribute('href', '/app/#some')
  for (const tool of ['thumbnail-studio', 'mockups', 'isolate-subject']) {
    await page.goto(`/app/${tool}`)
    await expect(page.getByRole('link', { name: 'Media Lab' })).toBeVisible()
    await expect(page.getByRole('link', { name: /SoMe-mappen/ })).toHaveCount(0)
  }
})
