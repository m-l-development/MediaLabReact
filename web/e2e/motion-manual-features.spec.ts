import { expect, test, type Page } from '@playwright/test'
import { importFiles, insp as inspTab, leftTab, main, newAdvProject, saveAndReload, seekTo, solid } from './motion-helpers'

/**
 * Arbeidsflyt B (uten mal): funksjonene malene bygger på finnes i de vanlige verktøyene – tallrull, opptelling med «{n}»,
 * tekstmaske (farge rundt / dugget glass), penselstrøk, bane, rulletekst, filmstriper (effekt) og nye easing-kurver.
 */
const props = (page: Page) => page.locator('[data-md-props]')
const sig = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0, dark = 0, n = 0
  for (let i = 0; i < d.length; i += 4 * 37) { h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]!) | 0; n++; if (d[i]! + d[i + 1]! + d[i + 2]! < 40) dark++ }
  return { h, dark: dark / n }
})
/** Andel svarte piksler i øverste 8 % av bildet (filmstriper). */
const topDark = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, Math.max(1, Math.floor(c.height * 0.08))).data
  let dark = 0, n = 0
  for (let i = 0; i < d.length; i += 16) { n++; if (d[i]! + d[i + 1]! + d[i + 2]! < 20) dark++ }
  return dark / n
})

test('tekstmaske, tallrull, opptelling, bane, rulletekst, penselstrøk og filmstriper uten mal', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  // et grønt bilde på hovedsporet
  await importFiles(page, [solid('gronn.png', [30, 200, 60])], 1)
  await page.locator('[data-md-bin-item="gronn.png"] [data-md-to="v1"]').click()
  await seekTo(page, 1)
  await leftTab(page, 'text')
  await page.locator('[data-md-add-text]').click()
  const P = props(page)
  const openSec = async (name: string) => {
    const b = P.getByRole('button', { name: new RegExp('^' + name) }).first()
    if ((await b.getAttribute('aria-expanded')) === 'false') await b.click()
  }
  await openSec('Tekstmaske')
  // animasjonene finnes i den vanlige listen
  const anim = P.getByLabel('Animasjon')
  for (const v of ['roll', 'scroll', 'orbit', 'brush']) await expect(anim.locator(`option[value="${v}"]`)).toHaveCount(1)

  // tekstmaske: farge rundt teksten → mest svart, bildet synes bare i bokstavene
  const s0 = await sig(page)
  await P.getByRole('button', { name: 'Farge rundt', exact: true }).click()
  await expect.poll(async () => (await sig(page)).dark, { message: 'svart rundt teksten' }).toBeGreaterThan(0.6)
  // dugget glass: ikke svart lenger
  await P.getByRole('button', { name: 'Dugget glass', exact: true }).click()
  await expect.poll(async () => (await sig(page)).dark).toBeLessThan(0.2)
  await P.getByRole('button', { name: 'Av', exact: true }).click()
  await expect.poll(async () => (await sig(page)).h).toBe(s0.h)

  // tallrull fra et tall
  await P.locator('textarea').first().fill('2027')
  await anim.selectOption('roll')
  const rf = P.getByLabel('Ruller fra (tall)', { exact: true })
  await expect(rf).toBeVisible()
  await rf.fill('2026')
  // bane og rulletekst har egne innstillinger / forklaring
  await anim.selectOption('orbit')
  await expect(P.getByRole('slider', { name: 'Banens radius' })).toBeVisible()
  await anim.selectOption('scroll')
  await expect(P.getByText(/ruller fra under bildet/)).toBeVisible()
  await anim.selectOption('brush')

  // opptelling med «{n}»
  await P.getByRole('switch', { name: 'Nedtelling' }).or(P.getByLabel('Nedtelling')).first().click()
  await P.getByRole('switch', { name: 'Tell mellom to tall' }).or(P.getByLabel('Tell mellom to tall')).first().click()
  await openSec('Tell fra og til')
  await expect(P.getByLabel('Til', { exact: true })).toBeVisible()

  // filmstriper som effekt på klippet
  await main(page).first().click()
  await inspTab(page, 'fx')
  await page.locator('[data-md-fx-pick]').selectOption('bars')
  await page.locator('[data-md-fx-add]').click()
  await seekTo(page, 2)
  await expect.poll(() => topDark(page), { message: 'svarte striper øverst' }).toBeGreaterThan(0.9)

  // lagres med prosjektet
  await saveAndReload(page)
  await main(page).first().click()
  await inspTab(page, 'fx')
  await expect(page.locator('[data-md-fx-kind="bars"]').or(page.getByText('Filmstriper')).first()).toBeVisible()
  expect(errors).toEqual([])
})
