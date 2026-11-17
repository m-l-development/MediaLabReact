import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Photo Design, fase 4 (docs/maler-og-fonter.md): funksjonene malene trenger – glød, bakgrunnsboks, slitt tekst,
 * sirkelbane, bilde i teksten, mønster på former (strekkode …), stiplet kant og slagskygge. Hver endrer det som
 * tegnes, og alt er med etter lagring og omlasting. Enkel modus viser dem ikke før laget bruker dem.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC (samme panel på mobil)'))

const C = '[data-pd-wrap] canvas'
const print = (page: Page) => page.locator(C).first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4 * 97) h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]! * 7 + d[i + 3]!) | 0
  return h
})
const settle = (page: Page) => page.waitForTimeout(350)

/** Fontpopupen: velg en effekt (Effekter) eller form (Stil) for tekstlaget, og lukk popupen. */
async function popPick(page: Page, tab: 'Effekter' | 'Stil', name: string) {
  const P = page.getByRole('dialog', { name: 'Velg font' })
  if (!(await P.count())) await page.locator('[data-fontpop] .fp-trigger').first().click()
  await P.getByRole('tab', { name: tab, exact: true }).click()
  const re = new RegExp('^' + name + '$')
  if (tab === 'Stil') await P.locator('.fp-shapes button', { hasText: re }).click()
  else await P.locator('.fp-fx:not(.fp-presets-grid):not(.fp-shapes) > button').filter({ has: page.locator('small', { hasText: re }) }).click()
  await page.keyboard.press('Escape')
}

test('tekst og former: glød, bakgrunnsboks, slitt tekst, sirkelbane, bilde i teksten, mønster, stiplet kant og skygge', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
  await expect(page.locator('[data-pd-selbox]')).toBeVisible()
  // Enkel modus: de nye kontrollene vises ikke
  await expect(page.locator('[data-pd-extras]')).toHaveCount(0)
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-pd-extras]')).toBeVisible()
  let p = await print(page)
  const changed = async (what: string) => {
    await settle(page)
    const q = await print(page)
    expect(q, what).not.toBe(p)
    p = q
  }
  // glød, bakgrunnsboks, slitt tekst og sirkelbane er effekter/former i fontpopupen
  await popPick(page, 'Effekter', 'Glød')
  await changed('Glød')
  await popPick(page, 'Effekter', 'Boks')
  await changed('Bakgrunnsboks')
  await popPick(page, 'Effekter', 'Slitt')
  await changed('Slitt tekst')
  await popPick(page, 'Stil', 'Sirkel')
  await changed('Sirkelbane')
  const ch = page.waitForEvent('filechooser')
  await page.locator('[data-pd-textfill]').getByRole('button', { name: 'Velg bilde' }).click()
  await (await ch).setFiles({ name: 'g.png', mimeType: 'image/png', buffer: png(200, 100, () => [20, 200, 40, 255]) })
  await expect(page.locator('[data-pd-textfill]').getByRole('button', { name: 'Fjern bildet' })).toBeVisible()
  await changed('Bilde i teksten')

  // korn over hele bildet (Legg til → Korn)
  await page.keyboard.press('Escape')
  p = await print(page)
  await page.getByRole('button', { name: 'Korn', exact: true }).first().click()
  await changed('Korn')

  // form: strekkode-mønster, stiplet kant og slagskygge
  await page.keyboard.press('Escape')
  await page.locator('[data-shape="rect"]').first().click()
  await expect(page.locator('[data-pd-selbox]')).toBeVisible()
  p = await print(page)
  await page.getByRole('combobox', { name: 'Mønster' }).selectOption('barcode')
  await changed('Strekkode')
  await page.getByRole('slider', { name: 'Kontur', exact: true }).first().fill('6')
  await changed('Kontur')
  await page.getByRole('switch', { name: 'Stiplet kant' }).click()
  await changed('Stiplet kant')
  await page.getByRole('switch', { name: 'Slagskygge' }).click()
  await changed('Slagskygge')

  // lagres og er med etter omlasting (samme tegning)
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(page.locator(C)).toBeVisible()
  await expect.poll(() => print(page), { timeout: 15_000 }).toBe(p)
  expect(errors).toEqual([])
})
