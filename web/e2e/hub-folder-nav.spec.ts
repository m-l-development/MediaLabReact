import { expect, test, type Page } from '@playwright/test'

/** SoMe-mappen på forsiden: «← Tilbake» går alltid til hovedmenyen, uansett hvordan mappen ble åpnet. */

const mainMenu = (page: Page) => expect(page.getByRole('button', { name: /SoMe/ })).toBeVisible()
const someMenu = async (page: Page) => {
  await expect(page.getByRole('heading', { level: 1, name: 'SoMe' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Motion design/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Photo design/i })).toBeVisible()
}
const back = (page: Page) => page.getByRole('button', { name: 'Tilbake', exact: true })

test('fra hovedmenyen: åpne SoMe, «← Tilbake», og nettleserens tilbake/fram', async ({ page }) => {
  await page.goto('/app/')
  await mainMenu(page)
  await page.getByRole('button', { name: /SoMe/ }).click()
  await expect(page).toHaveURL(/\/app\/#some$/)
  await someMenu(page)
  await back(page).click()
  await expect(page).toHaveURL(/\/app\/$/)
  await mainMenu(page)
  // nettleserens fram og tilbake
  await page.goForward()
  await someMenu(page)
  await page.goBack()
  await mainMenu(page)
})

test('fra «← SoMe-mappen» i Motion Design og Photo Design: «← Tilbake» går til hovedmenyen, ikke inn i appen', async ({ page }) => {
  for (const tool of ['motion-design', 'photo-design']) {
    await page.goto('/app/')
    await page.getByRole('button', { name: /SoMe/ }).click()
    await page.getByRole('link', { name: new RegExp(tool.replace('-', ' '), 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/app/${tool}`))
    await page.getByRole('link', { name: /SoMe-mappen/ }).click()
    await someMenu(page)
    await back(page).click()
    await expect(page).toHaveURL(/\/app\/$/)
    await mainMenu(page)
  }
  // «← Media Lab» går fortsatt til forsiden
  await page.goto('/app/photo-design')
  await page.getByRole('link', { name: 'Media Lab' }).click()
  await expect(page).toHaveURL(/\/app\/$/)
  await mainMenu(page)
})

test('direkte på #some (og etter oppdatering): «← Tilbake» går til hovedmenyen', async ({ page }) => {
  await page.goto('/app/#some')
  await someMenu(page)
  await page.reload()
  await someMenu(page)
  await back(page).click()
  await expect(page).toHaveURL(/\/app\/$/)
  await mainMenu(page)
})
