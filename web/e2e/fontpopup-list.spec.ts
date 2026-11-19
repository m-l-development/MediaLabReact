import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'

/**
 * Fontpopupen (Thumbnail Studio): fontlisten får plass. Popupen åpnes under feltet (tekstboksen over synes), med
 * verktøylinjen, fanene, søket og filtrene øverst. Popupen er ett rulleområde: kategoriene står fast øverst og
 * bunnlinjen nederst, og listen kan rulles helt til bunnen. Før fikk listen ~12 px (bare «Archivo» synlig).
 */
async function openPicker(page: Page) {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await dock(page, 'add')
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
  await dock(page, 'edit')
  await page.locator('.fp-trigger').first().click()
  await expect(page.locator('.fp-pop')).toBeVisible()
}

const fullyIn = (page: Page, sel: string) => page.evaluate((s) => {
  const pop = document.querySelector('.fp-pop')!.getBoundingClientRect()
  const b = document.querySelector(s)!.getBoundingClientRect()
  return b.top >= pop.top - 1 && b.bottom <= pop.bottom + 1
}, sel)

for (const [w, h] of [[1280, 640], [1440, 900]] as const) {
  test(`fontlisten er synlig og kan rulles helt ned (${w}×${h})`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'skjermstørrelsene gjelder PC; mobil testes under')
    await page.setViewportSize({ width: w, height: h })
    await openPicker(page)
    // tekstboksen over feltet er ikke dekket av popupen
    const covered = await page.evaluate(() => {
      const ta = [...document.querySelectorAll('textarea')].find((t) => t.offsetParent && !t.closest('.fp-pop'))
      if (!ta) return 'ingen'
      const r = ta.getBoundingClientRect()
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + 20)
      return !!el?.closest('.fp-pop')
    })
    expect(covered, 'tekstboksen er dekket').toBe(false)
    // ved åpning: verktøylinjen, fanene, søket og filtrene er synlige
    for (const s of ['.fp-top', '.fp-head', '.fp-search', '.fp-seg', '.fp-cats']) expect(await fullyIn(page, s), s).toBe(true)
    // rull: minst fire fonter synlige samtidig, og listen når bunnen
    await page.locator('.fp-pop').evaluate((e) => { e.scrollTop = 400 })
    const rows = await page.evaluate(() => {
      const pop = document.querySelector('.fp-pop')!.getBoundingClientRect()
      return [...document.querySelectorAll('.fp-list .fp-row')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= pop.top && b.bottom <= pop.bottom }).length
    })
    expect(rows, 'synlige fonter etter rulling').toBeGreaterThanOrEqual(4)
    expect(await fullyIn(page, '.fp-cats'), 'kategoriene står fast').toBe(true)
    expect(await fullyIn(page, '.fp-foot'), 'bunnlinjen står fast').toBe(true)
    await page.locator('.fp-pop').evaluate((e) => { e.scrollTop = e.scrollHeight })
    const last = await page.locator('.fp-list .fp-row').last()
    await expect(last).toBeInViewport()
  })
}

test('popupen åpnes alltid med toppen synlig, også når valgt font ligger langt nede; søk og kategorier virker', async ({ page }) => {
  await openPicker(page)
  await page.locator('.fp-pop').evaluate((e) => { e.scrollTop = e.scrollHeight })
  await page.locator('.fp-list .fp-row').last().click()
  await expect(page.locator('.fp-pop')).toHaveCount(0)
  await page.locator('.fp-trigger').first().click()
  await expect(page.locator('.fp-pop')).toBeVisible()
  await expect.poll(() => page.locator('.fp-pop').evaluate((e) => e.scrollTop)).toBe(0)
  expect(await fullyIn(page, '.fp-top')).toBe(true)
  await page.getByPlaceholder(/Søk/).fill('bebas')
  await expect(page.locator('.fp-list .fp-row', { hasText: /Bebas/i }).first()).toBeVisible()
  await page.getByPlaceholder(/Søk/).fill('')
  await page.locator('.fp-cats button', { hasText: /^Skilt/ }).click()
  await expect(page.locator('.fp-cats button.on', { hasText: /^Skilt/ })).toBeVisible()
  expect(await page.locator('.fp-list .fp-row').count()).toBeGreaterThan(0)
})
