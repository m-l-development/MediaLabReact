import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * «Legg til på sliden → + Bilde» i Loop Studio når valgt slide ikke finnes: uten slides, og etter «Angre» som byttet ut
 * slidene. Før gikk bildet gjennom filvelger og beskjæring og ble så stille forkastet (eller knappen gjorde ingenting).
 */
const PNG = png(400, 300, (x) => [x % 255, 120, 200, 255])
const PROGRAM = 'Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen'

async function open(page: Page, mobile: boolean) {
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  if (mobile) await page.getByRole('button', { name: 'Rediger', exact: true }).click()
}

async function program(page: Page, text: string) {
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder(PROGRAM).fill(text)
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(900) // nye endringer havner i eget angre-steg (700 ms)
}

test('uten slides: «+ Bilde» forklarer hva som mangler i stedet for å gjøre ingenting', async ({ page }, info) => {
  await open(page, info.project.name === 'mobil')
  await page.getByRole('button', { name: /^Slides/ }).first().click()
  await expect(page.getByText('Ingen slides', { exact: true })).toBeVisible()
  const msg = page.waitForEvent('dialog', { timeout: 10_000 }).then(async (d) => { const m = d.message(); await d.accept(); return m })
  const chooser = page.waitForEvent('filechooser', { timeout: 3000 }).then(() => true, () => false)
  await page.getByRole('button', { name: /^\+ Bilde/ }).click()
  expect(await msg).toBe('Legg til en slide først.')
  expect(await chooser).toBe(false)
})

test('etter «Angre» som bytter ut slidene: «+ Bilde» legger bildet på en slide som finnes', async ({ page }, info) => {
  const mobile = info.project.name === 'mobil'
  await open(page, mobile)
  await program(page, 'Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await program(page, 'Fredag kl 18 Ungdom\nLørdag kl 12 Dugnad') // nye slides; den valgte er fra dette settet
  await page.keyboard.press('Control+z')
  await page.getByRole('button', { name: /^Slides/ }).first().click()
  await expect(page.getByText('Ingen slides', { exact: true })).toHaveCount(0)
  const before = await page.getByRole('button', { name: 'Bytt bilde', exact: true }).count()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /^\+ Bilde/ }).click()
  await (await chooser).setFiles({ name: 'pip.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('dialog').getByRole('button', { name: /Bruk|Ferdig|OK/ }).last().click()
  await expect.poll(() => page.getByRole('button', { name: 'Bytt bilde', exact: true }).count(), { timeout: 30_000 }).toBeGreaterThan(before) // bildebehandlingen kan ta tid under last
})
