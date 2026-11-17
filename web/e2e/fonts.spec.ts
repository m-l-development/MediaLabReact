import { expect, test, type Locator, type Page } from '@playwright/test'
import { dock } from './dock'

/**
 * Det felles fontbiblioteket (docs/maler-og-fonter.md, fase 1) i fontpopupen (components/fontpicker): Photo Design, Thumbnail Studio, Motion
 * Design og Loop Studio. En font fra biblioteket velges, stilarket hentes ved bruk og fonten er faktisk lastet (så
 * lerretet og eksporten tegner med den). Vekter og kursiv bare der fonten har dem. Valget overlever lagring.
 */
const desktopOnly = () => test.skip(test.info().project.name === 'mobil', 'PC (velgeren er den samme komponenten på mobil; se mobiltesten)')

/** Fontpopupen (components/fontpicker): søk i «Alle» og velg raden med fonten. */
const rowOf = (page: Page, name: string) => page.getByRole('dialog', { name: 'Velg font' }).locator('.fp-row').filter({ has: page.locator('.fp-sample', { hasText: new RegExp(`^${name}$`) }) }).first()
async function openPop(scope: Locator, page: Page, name: string) {
  const P = page.getByRole('dialog', { name: 'Velg font' })
  if (!(await P.count())) await scope.locator('[data-fontpop] .fp-trigger').first().click()
  await P.getByRole('tab', { name: 'Font', exact: true }).click()
  await P.getByRole('tab', { name: 'Alle' }).click()
  await P.getByPlaceholder(/Søk/).fill(name)
}
async function pickFont(scope: Locator, page: Page, name: string) {
  await openPop(scope, page, name)
  await rowOf(page, name).click()
  await expect(scope.locator('[data-fontpop] .fp-trigger').first()).toContainText(name)
}
/** Verktøylinjens Fet/Kursiv i popupen: aktiv bare når fonten har snittet. */
async function cut(page: Page, scope: Locator, title: 'Fet' | 'Kursiv'): Promise<boolean> {
  if (!(await page.getByRole('dialog', { name: 'Velg font' }).count())) await scope.locator('[data-fontpop] .fp-trigger').first().click()
  const b = page.getByRole('dialog', { name: 'Velg font' }).locator('.fp-top button[title]').filter({ hasText: title === 'Fet' ? 'B' : 'I' }).first()
  const on = (await b.getAttribute('title')) === title
  await page.keyboard.press('Escape')
  return on
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
  const panel = page.locator('body')
  await pickFont(panel, page, 'Fraunces')
  await loaded(page, '400 40px "Fraunces"')
  await expect(page.locator('link[href$="fonts/fraunces.css"]').first()).toBeAttached()
  // Bebas Neue har bare én vekt: Fet er av (ingen kunstig fet)
  await pickFont(panel, page, 'Bebas Neue')
  expect(await cut(page, panel, 'Fet')).toBe(false)
  await pickFont(panel, page, 'Six Caps')
  await loaded(page, '400 40px "Six Caps"')
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await page.locator('[data-layer]').filter({ hasText: /Tekst/ }).first().click().catch(() => undefined)
  await expect(page.locator('[data-fontpop] .fp-trigger').first()).toContainText('Six Caps')
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
  await expect(page.locator('[data-fontpop] .fp-trigger').first()).toBeVisible()
  await pickFont(page.locator('body'), page, 'Unbounded')
  await loaded(page, '400 40px "Unbounded"')
  // Unbounded har ekte fet: Fet er på i verktøylinjen
  expect(await cut(page, page.locator('body'), 'Fet')).toBe(true)
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
  expect(await cut(page, page.locator('body'), 'Kursiv')).toBe(false)
  await pickFont(page.locator('body'), page, 'Playfair Display')
  expect(await cut(page, page.locator('body'), 'Kursiv')).toBe(true)
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
  const panel = page.locator('body')
  await pickFont(panel, page, 'Uncut Sans')
  await loaded(page, '400 40px "Uncut Sans"')
  await expect(page.locator('link[href$="fonts/uncut-sans.css"]').first()).toBeAttached()
  // Bagnard mangler Æ, Ø og Å: merket «Uten ÆØÅ» i popupen
  await openPop(panel, page, 'Bagnard')
  await expect(rowOf(page, 'Bagnard').locator('.fp-warn')).toBeVisible()
  await page.getByRole('dialog', { name: 'Velg font' }).getByPlaceholder(/Søk/).fill('Uncut Sans')
  await expect(rowOf(page, 'Uncut Sans').locator('.fp-warn')).toHaveCount(0)
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
