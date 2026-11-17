import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { canvasUrl, diffScaled, pop, settled, watchErrors } from './fontpopup-kit'

/**
 * Fontpopupen i Loop Studio: overskrift og kicker har hver sin stil (cfg.ts.title / cfg.ts.kicker), tegnet med
 * <StyledText> i forhåndsvisningen og lagt ferdig inn i den frittstående HTML-spilleren. Gamle loop-er er uendret.
 */
const CV = '[data-loop-canvas]'

test('fontpopupen i Loop: overskrift og kicker hver for seg, forhåndsvisning, lagring og HTML-spiller lik forhåndsvisningen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'HTML-spilleren testes på PC')
  test.setTimeout(600_000)
  const errors = watchErrors(page)
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator(CV)).toBeVisible()
  // et program med møter (slides med tittel og kicker), og første slide vist
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await expect(page.locator('[data-loop-card]').first()).toBeVisible()
  await page.locator('[data-loop-card]').first().click()
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'Stil', exact: true }).first().click()
  const P = pop(page)

  // statisk font for hele loopen
  await page.locator('[data-fontpop="title"] .fp-trigger').click()
  await P.getByRole('tab', { name: 'Alle' }).click()
  await P.getByPlaceholder(/Søk/).fill('anton')
  await P.locator('.fp-row', { hasText: 'Anton' }).first().click()

  // overskrift: effekt
  const base0 = await settled(page, CV)
  await page.locator('[data-fontpop="title"] .fp-trigger').click()
  await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
  await P.locator('.fp-fx:not(.fp-presets-grid) > button').filter({ has: page.locator('small', { hasText: /^Glød$/ }) }).click()
  const t1 = await settled(page, CV, base0)
  expect(await diffScaled(page, base0, t1, 480, 30), 'overskriftens stil endret ikke forhåndsvisningen').toBeGreaterThan(0.0005)
  await page.keyboard.press('Escape')

  // kicker: egen stil (overskriften uendret)
  await page.locator('[data-fontpop="kicker"] .fp-trigger').click()
  await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
  await P.locator('.fp-fx:not(.fp-presets-grid) > button').filter({ has: page.locator('small', { hasText: /^Boks$/ }) }).click()
  const t2 = await settled(page, CV, t1)
  expect(await diffScaled(page, t1, t2, 480, 30), 'kickerens stil endret ikke forhåndsvisningen').toBeGreaterThan(0.0003)

  // forhåndsvisning av font og Esc
  await P.getByRole('tab', { name: 'Font', exact: true }).click()
  await P.getByRole('tab', { name: 'Alle' }).click()
  await P.getByPlaceholder(/Søk/).fill('pacifico')
  await P.locator('.fp-row', { hasText: 'Pacifico' }).first().hover()
  const hov = await settled(page, CV, t2)
  expect(await diffScaled(page, t2, hov, 480, 30)).toBeGreaterThan(0.0005)
  await page.keyboard.press('Escape')
  const back = await settled(page, CV, hov)
  expect(await diffScaled(page, t2, back, 480, 30)).toBeLessThan(0.003)

  // lagring og innlasting (loop-en lagres automatisk i nettleseren)
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.locator(CV)).toBeVisible()
  const re = await settled(page, CV)
  expect(await diffScaled(page, back, re, 480, 30), 'stilen kom ikke tilbake etter innlasting').toBeLessThan(0.01)

  // HTML-spilleren: tekstbildene ligger i filen, og spilleren tegner det samme som forhåndsvisningen
  await page.getByRole('button', { name: 'Eksport', exact: true }).first().click()
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Last ned HTML-spiller' }).click()
  const html = fs.readFileSync(await (await dl).path(), 'utf8')
  expect(html).toContain('"sty":')
  const file = info.outputPath('spiller.html')
  fs.writeFileSync(file, html)
  const player = await page.context().newPage()
  const perr: string[] = []
  player.on('pageerror', (e) => perr.push(e.message))
  await player.goto('file:///' + file.replace(/\\/g, '/'))
  await player.waitForTimeout(3000)
  const pl = await canvasUrl(player, '#c')
  expect(await diffScaled(page, re, pl, 480, 60), 'spilleren er ikke lik forhåndsvisningen').toBeLessThan(0.08)
  expect(perr).toEqual([])
  await player.close()
  expect(errors, errors.join('\n')).toEqual([])
})
