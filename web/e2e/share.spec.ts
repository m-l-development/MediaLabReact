import { expect, test, type Page } from '@playwright/test'

/**
 * «Bruk i …» (SHR-02): resultatet lagres i Dine medier og åpnes i et annet verktøy (`?asset=`), uten ny opplasting –
 * som «Send til» i dagens delte mappe. Isolate Subject → Mockups dekkes i isolate-subject.spec.ts.
 */
async function arrivesInIsolate(page: Page) {
  await expect(page).toHaveURL(/\/app\/isolate-subject\?asset=/)
  await expect(page.getByText('Beskjær bildet', { exact: true })).toBeVisible({ timeout: 20000 })
}

test('Photo Design: eksporten «Bruk i Isolate Subject»', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.getByRole('button', { name: 'Bruk i Isolate Subject' }).click()
  await arrivesInIsolate(page)
})

test('Thumbnail Studio: eksporten «Bruk i Mockups»', async ({ page }) => {
  test.slow()
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30000 })
  await exp.getByRole('button', { name: 'Bruk i Mockups' }).click()
  await expect(page).toHaveURL(/\/app\/mockups\?asset=/)
  await expect(page.getByRole('button', { name: /Bytt design/ }).first()).toBeVisible({ timeout: 20000 })
})

test('Motion design: stillbildet «Bruk i Isolate Subject»; videovalgene vises først når en video er eksportert', async ({ page }) => {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Eksporter video' })
  await expect(dialog.getByRole('button', { name: 'Bruk i Photo design' })).toBeVisible()
  // ingen eksportert video ennå: ingen «(video)»-valg
  await expect(dialog.getByRole('button', { name: /\(video\)/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Bruk i Isolate Subject' }).click()
  await arrivesInIsolate(page)
})

