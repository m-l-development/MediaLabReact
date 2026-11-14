import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Det felles malbiblioteket og fargesystemet (shared/templates) i Thumbnail, Photo, Motion og Loop: «Alle maler»,
 * kategorier, søk og sortering i samme popup, felles fargevelger (Standard + 10 temaer + egne farger), og at temaet
 * faktisk gir malen nye farger i editoren (Standard beholder originalen). Kjøres på PC og mobil.
 */

/** Andel piksler nær en farge (avstand < 40) i et lerret. */
async function share(loc: Locator, hex: string, tol = 40): Promise<number> {
  return loc.evaluate((c: HTMLCanvasElement, [h, tl]: [string, number]) => {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0, t = 0
    for (let i = 0; i < d.length; i += 4 * 13) { t++; if (Math.abs(d[i]! - r) + Math.abs(d[i + 1]! - g) + Math.abs(d[i + 2]! - b) < tl) n++ }
    return n / t
  }, [hex, tol] as [string, number])
}

async function pickerOptions(page: Page, scope: Locator) {
  await scope.locator('[data-theme-btn]').click()
  await expect(page.locator('[data-theme-opt]')).toHaveCount(12) // Standard, 10 temaer, Egne farger
}

async function libraryWorks(lib: Locator, first: string, total: number) {
  await expect(lib.locator('[data-tpl-cat="*"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(lib.locator('[data-tpl-item]')).toHaveCount(total)
  // søk
  await lib.locator('[data-tpl-search]').fill(first)
  await expect(lib.locator('[data-tpl-item]').first()).toBeVisible()
  expect(await lib.locator('[data-tpl-item]').count()).toBeLessThan(total)
  await lib.locator('[data-tpl-search]').fill('zzzz-finnes-ikke')
  await expect(lib.locator('[data-tpl-none]')).toBeVisible()
  await lib.locator('[data-tpl-search]').fill('')
  // sortering: navn gir alfabetisk rekkefølge
  await lib.locator('[data-tpl-sort]').selectOption('name')
  const names = await lib.locator('[data-tpl-item] b').allTextContents()
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'nb')))
  await lib.locator('[data-tpl-sort]').selectOption('std')
}

test('Thumbnail: alle maler, søk, sortering, fargetema og egne farger på en ferdig mal', async ({ page }) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny mal' })
  const lib = dlg.locator('[data-tpl-lib]')
  await libraryWorks(lib, 'GEN-01', 151)
  await pickerOptions(page, dlg)
  await page.locator('[data-theme-opt="wbl"]').click()
  await expect(dlg.locator('[data-theme-name]')).toHaveText('Hvit og blå')
  await lib.locator('[data-tpl-search]').fill('GEN-01')
  await expect(lib.locator('[data-tpl-item="GEN-01"] img')).toBeVisible({ timeout: 30_000 })
  await lib.locator('[data-tpl-item="GEN-01"]').click()
  const cv = page.locator('[data-ts-view="edit"] canvas').first()
  await expect.poll(() => share(cv, '#0b4fd6'), { message: 'blått tema i editoren', timeout: 15_000 }).toBeGreaterThan(0.05)
  // egne farger
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await dlg.locator('[data-theme-btn]').click()
  await page.locator('[data-theme-opt="custom"]').click()
  await page.locator('[data-theme-color="0"]').fill('#118844')
  await expect(dlg.locator('[data-theme-name]')).toHaveText('Egne farger')
  await page.keyboard.press('Escape')
  await dlg.locator('[data-tpl-search]').fill('GEN-01')
  await dlg.locator('[data-tpl-item="GEN-01"]').click()
  await expect.poll(() => share(cv, '#118844'), { message: 'egen bakgrunnsfarge i editoren', timeout: 15_000 }).toBeGreaterThan(0.05)
  expect(errors).toEqual([])
})

test('Photo: popup med alle maler (grunnmaler + designsamlingen), søk, sortering og fargetema', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  const lib = page.locator('[data-tpl-lib]')
  const total = await lib.locator('[data-tpl-item]').count()
  expect(total).toBeGreaterThan(100)
  await libraryWorks(lib, '001', total)
  await page.locator('[data-tpl-modal] [data-pd-pal-btn]').click()
  await page.locator('[data-pd-pal="wbl"]').click()
  await lib.locator('[data-tpl-cat="Grunnmaler"]').click()
  await lib.locator('[data-tpl-item="bold"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await expect.poll(() => share(page.locator('[data-pd-wrap] canvas').first(), '#0b4fd6'), { timeout: 15_000 }).toBeGreaterThan(0.2)
  // en ferdig mal fra designsamlingen får også temaet
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  await lib.locator('[data-tpl-search]').fill('001')
  await lib.locator('[data-tpl-item="001"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await expect.poll(() => share(page.locator('[data-pd-wrap] canvas').first(), '#0b4fd6', 60), { message: 'ferdig mal i blått tema', timeout: 15_000 }).toBeGreaterThan(0.03)
  expect(errors).toEqual([])
})

test('Motion: malbibliotek med kategorier, felles fargevelger; tema gir nye farger, Standard beholder originalen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator('[data-format]').first().click()
  const lib = page.locator('[data-tpl-lib]')
  await expect(lib.locator('[data-tpl-cats] button')).toHaveCount(10) // Alle + 9 kategorier
  await libraryWorks(lib, 'Sitat', 20)
  await lib.locator('[data-tpl-cat="Tekst og budskap"]').click()
  await expect(lib.locator('[data-tpl-item]')).toHaveCount(2)
  await pickerOptions(page, lib)
  await page.locator('[data-theme-opt="wg"]').click()
  await expect(lib.locator('[data-tpl="announce"] img')).toBeVisible({ timeout: 15_000 })
  await lib.locator('[data-tpl="announce"]').click()
  const cv = page.locator('[data-md-canvas]')
  await expect.poll(() => share(cv, '#0f6b3f'), { message: 'grønt tema', timeout: 15_000 }).toBeGreaterThan(0.2)
  // Standard: malens egne (gule) farger
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator('[data-format]').first().click()
  await lib.locator('[data-theme-btn]').click()
  await page.locator('[data-theme-opt="std"]').click()
  await lib.locator('[data-tpl="announce"]').click()
  await expect.poll(() => share(cv, '#f59a10', 70), { message: 'originalfargene', timeout: 15_000 }).toBeGreaterThan(0.3)
  expect(errors).toEqual([])
})

test('Loop: alle maler i popup, fargetema følger med til den nye serien', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/loop-studio')
  await page.locator('[data-loop-tpl-open]').click()
  const lib = page.locator('[data-tpl-lib]')
  await libraryWorks(lib, 'Søndag', 4)
  await pickerOptions(page, page.locator('[data-tpl-modal]'))
  await page.locator('[data-theme-opt="wr"]').click()
  await expect(lib.locator('[data-loop-tpl-preview]').first()).toBeVisible()
  await lib.locator('[data-tpl-item="sunday"]').click()
  await expect(page.locator('[data-loop-view="edit"]')).toBeVisible()
  await expect(page).toHaveURL(/tema=wr/)
  expect(errors).toEqual([])
})
