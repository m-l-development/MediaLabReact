import { expect, test } from '@playwright/test'
import { EMAIL, expectHub, injectBackend, PASSWORD, signInPassword } from './helpers'

/**
 * Loop Studio «Legg til på sliden → + Bilde» innlogget mot connecthub-dev (kjøres av run-dev.mjs i løpet «admin»):
 * filvelgeren åpnes, bildet beskjæres og legges som eget bildelag på sliden. Bildet lagres bare lokalt i nettleseren.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

// 2×2 PNG, ugjennomsiktig rød
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAwMDAwMAAAAAP/wEAcX8VAAAAAElFTkSuQmCC', 'base64')

test('Loop Studio: «+ Bilde» på sliden (innlogget)', async ({ page }, info) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('konsoll: ' + m.text().slice(0, 200)) })
  await signInPassword(page)
  await expectHub(page)
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  const mobile = info.project.name === 'mobil'
  const edit = () => page.getByRole('button', { name: 'Rediger', exact: true }).click()   // mobil: redigeringspanelet er en egen visning
  if (mobile) await edit()
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(800)
  if (mobile) await page.getByRole('button', { name: 'Forhåndsvis', exact: true }).click()
  await page.getByText(/^Bønnemøte$/i).last().click()
  if (mobile) await edit()
  const add = page.getByRole('button', { name: /^\+ Bilde/ })
  await expect(add).toBeVisible({ timeout: 20_000 })
  const before = await page.getByRole('button', { name: 'Bytt bilde' }).count()
  const chooser = page.waitForEvent('filechooser', { timeout: 10_000 }).catch(() => null)
  await add.click()
  const fc = await chooser
  await page.screenshot({ path: info.outputPath('etter-klikk.png') })
  expect(fc, 'filvelgeren åpnes').not.toBeNull()
  await fc!.setFiles({ name: 'pip.png', mimeType: 'image/png', buffer: PNG })
  const crop = page.getByRole('dialog')
  await expect(crop).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: info.outputPath('beskjaer.png') })
  await crop.getByRole('button', { name: /Bruk|Ferdig|OK/ }).last().click()
  await expect.poll(() => page.getByRole('button', { name: 'Bytt bilde' }).count(), { timeout: 20_000 }).toBeGreaterThan(before)
  await page.screenshot({ path: info.outputPath('etter.png') })
  expect(errors, errors.join('\n')).toEqual([])
})
