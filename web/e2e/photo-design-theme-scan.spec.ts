import { expect, test } from '@playwright/test'
import { check } from './theme-scan'

/**
 * TB-905D74 (forts.): lys modus gjennom hele Photo Design – startsiden, editoren, lagpanelet, eksportmenyen,
 * fargedialogen, effektvelgeren (Avansert) og bildeserien. I hver tilstand skannes all synlig tekst (kontrast mot den
 * faktiske bakgrunnen, WCAG AA: 4,5:1, stor tekst 3:1) og store flater (ingen mørke paneler i lys modus). Lerretet
 * (designet) er unntatt: det skal se likt ut i begge temaer.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'skannes på PC (mobil har egen test for lagverktøy)'))

test('lys modus i hele Photo Design: tekst lesbar og ingen mørke paneler (startside, editor, menyer, dialoger, serie)', async ({ page }) => {
  test.slow()
  const problems: string[] = []
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.evaluate(() => localStorage.setItem('medialab.theme', 'light'))
  await page.reload()
  await expect(page.locator('[data-tpl="photo"]')).toBeVisible()
  await check(page, 'startside', problems)

  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await check(page, 'editor', problems)
  // et tekstlag valgt (egenskaper)
  await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
  await check(page, 'tekstlag valgt', problems)
  // venstre faner: Stil (bakgrunn/fyll, også fargeovergang) og Effekter
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await check(page, 'stil', problems)
  const lin = page.getByRole('button', { name: 'Lineær', exact: true })
  if (await lin.count()) {
    await lin.first().click()
    await check(page, 'stil: fargeovergang', problems)
  }
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await check(page, 'effekter', problems)
  await page.getByRole('button', { name: 'Lag', exact: true }).click()
  // eksportmenyen
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await check(page, 'eksportmeny', problems)
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  // fargedialogen
  if (await page.locator('[data-pd-roles-btn]').count()) {
    await page.locator('[data-pd-roles-btn]').first().click()
    await expect(page.locator('[data-pd-roles]')).toBeVisible()
    await check(page, 'farger i malen', problems)
    await page.keyboard.press('Escape')
    await page.locator('[data-pd-roles-btn]').first().click().catch(() => undefined)
  }
  // Avansert og effektvelgeren
  const adv = page.locator('[data-adv-toggle]')
  if (await adv.count()) {
    await adv.click()
    await check(page, 'avansert', problems)
    if (await page.locator('[data-pd-fx-open]').count()) {
      await page.locator('[data-pd-fx-open]').first().click()
      await expect(page.locator('[data-pd-fxpicker]')).toBeVisible()
      await check(page, 'effektvelger', problems)
      await page.keyboard.press('Escape')
    }
  }
  // bildeserien («Mange bilder»)
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-batch-new]').click()
  await expect(page.locator('[data-pd-batch-strip]')).toBeVisible()
  await check(page, 'bildeserie', problems)
  console.log(problems.join('\n') || '(ingen funn)')
  expect(problems).toEqual([])
})
