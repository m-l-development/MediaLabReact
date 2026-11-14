import { expect, test, type Locator, type Page } from '@playwright/test'
import { dock } from './dock'

/**
 * Det felles fontbiblioteket (docs/maler-og-fonter.md, fase 1): fontvelgeren i Photo Design, Thumbnail Studio, Motion
 * Design og Loop Studio. En font fra biblioteket velges, stilarket hentes ved bruk og fonten er faktisk lastet (så
 * lerretet og eksporten tegner med den). Vekter og kursiv bare der fonten har dem. Valget overlever lagring.
 */
const desktopOnly = () => test.skip(test.info().project.name === 'mobil', 'PC (velgeren er den samme komponenten på mobil; se mobiltesten)')

async function pickFont(scope: Locator, page: Page, name: string) {
  await scope.locator('[data-font-picker] > button').first().click()
  await page.locator('[data-font-search]').fill(name)
  await page.locator(`[data-font-option="${name}"]`).click()
  await expect(scope.locator('[data-font-picker] > button').first()).toHaveAttribute('data-font-value', name)
}

async function loaded(page: Page, css: string) {
  await expect.poll(() => page.evaluate((c) => document.fonts.check(c), css), { timeout: 15_000 }).toBe(true)
}

test('Photo Design: fontvelgeren laster fonten, viser bare ekte vekter og beholder valget etter lagring', async ({ page }) => {
  desktopOnly()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  const panel = page.locator('[data-pd-text]').locator('xpath=ancestor::*[.//*[@data-font-picker]][1]')
  await pickFont(panel, page, 'Fraunces')
  await loaded(page, '400 40px "Fraunces"')
  await expect(page.locator('link[data-font="fraunces"]')).toHaveCount(1)
  // Bebas Neue har bare én vekt: tykkelsen viser bare den (ingen kunstig fet)
  await pickFont(panel, page, 'Bebas Neue')
  const weights = panel.getByRole('combobox', { name: 'Tykkelse' })
  await expect(weights.locator('option')).toHaveCount(1)
  await pickFont(panel, page, 'Six Caps')
  await loaded(page, '400 40px "Six Caps"')
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await page.locator('[data-layer]').filter({ hasText: /Tekst/ }).first().click().catch(() => undefined)
  await expect(page.locator('[data-font-picker] > button').first()).toHaveAttribute('data-font-value', 'Six Caps')
  await loaded(page, '400 40px "Six Caps"')
  expect(errors).toEqual([])
})

test('Thumbnail Studio: tekstlagets font fra biblioteket, med fontens egne vekter', async ({ page }) => {
  desktopOnly()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  // et tekstlag i laglisten (grunnoppsettets navn)
  await page.locator('[data-layer]').first().getByText('Fornavn Etternavn').click()
  const picker = page.locator('[data-font-picker]').first()
  await expect(picker).toBeVisible()
  await pickFont(page.locator('body'), page, 'Unbounded')
  await loaded(page, '400 40px "Unbounded"')
  const w = page.getByRole('combobox', { name: 'Tykkelse' })
  await expect(w.locator('option[value="900"]')).toHaveCount(1)
})

test('Motion Design: tekstens font fra biblioteket; kursiv av når fonten ikke har kursiv', async ({ page }) => {
  desktopOnly()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  // tekstfanen i venstre panel (Avansert modus, som de andre tekstestene)
  await page.locator('[data-adv-toggle]').click()
  await page.locator('[data-md-tab="text"]').click()
  await page.locator('[data-md-add-text]').click()
  await pickFont(page.locator('body'), page, 'Bebas Neue')
  await loaded(page, '400 40px "Bebas Neue"')
  await expect(page.getByRole('switch', { name: 'Kursiv' })).toBeDisabled()
  await pickFont(page.locator('body'), page, 'Playfair Display')
  await expect(page.getByRole('switch', { name: 'Kursiv' })).toBeEnabled()
  await pickFont(page.locator('body'), page, 'Fraunces')
  await loaded(page, '700 40px "Fraunces"')
})

test('Loop Studio: skriften fra biblioteket lastes og brukes', async ({ page }) => {
  desktopOnly()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Stil', exact: true }).first().click()
  await pickFont(page.locator('body'), page, 'Josefin Sans')
  await loaded(page, '600 40px "Josefin Sans"')
})

test('åpne fonter utenfor Google (Fontsource med lisensfil): lastes, og fonter uten ÆØÅ er merket', async ({ page }) => {
  desktopOnly()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  const panel = page.locator('[data-pd-text]').locator('xpath=ancestor::*[.//*[@data-font-picker]][1]')
  await pickFont(panel, page, 'Uncut Sans')
  await loaded(page, '400 40px "Uncut Sans"')
  await expect(page.locator('link[data-font="uncut-sans"]')).toHaveCount(1)
  // Bagnard mangler Æ, Ø og Å: merket i velgeren
  await panel.locator('[data-font-picker] > button').first().click()
  await page.locator('[data-font-search]').fill('Bagnard')
  await expect(page.locator('[data-font-option="Bagnard"] [data-font-noaeoa]')).toBeVisible()
  await expect(page.locator('[data-font-option="Uncut Sans"] [data-font-noaeoa]')).toHaveCount(0)
})

test('mobil: fontvelgeren i Rediger-skuffen i Photo Design', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobil', 'mobil')
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Legg til' }).last().click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await dock(page, 'edit') // åpen allerede etter at teksten er lagt til
  await pickFont(page.locator('body'), page, 'Caveat')
  await loaded(page, '400 40px "Caveat"')
})
