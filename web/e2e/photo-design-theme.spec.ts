import { expect, test, type Page } from '@playwright/test'

/**
 * TB-905D74: lys modus i Photo Design-editoren. Verktøylinje, paneler, felt og lagliste blir lyse med lesbar kontrast,
 * temaet kan byttes mens editoren er åpen og huskes ved omlasting og navigering, og selve designet (lerretet) er likt i
 * begge temaer.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'kjøres én gang (PC)'))

/** Relativ luminans og kontrast (WCAG) for elementets tekst mot bakgrunnen nærmest bak den. */
const look = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => {
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0', '0']).map(Number)
  const lum = (c: number[]) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!) }
  let n: Element | null = el, bg = [0, 0, 0, 0]
  while (n && (bg = rgb(getComputedStyle(n).backgroundColor)).length >= 4 && bg[3] === 0) n = n.parentElement
  const fg = rgb(getComputedStyle(el).color), L1 = lum(fg), L2 = lum(bg)
  return { bg: lum(bg), contrast: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) }
})

async function openEditor(page: Page) {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
  await expect(page.locator('textarea[data-pd-text]')).toBeVisible()
}

test('lys modus i editoren: lyse flater, lesbar tekst, designet uendret, huskes etter omlasting og navigering', async ({ page }) => {
  await openEditor(page)
  const editor = '[data-pd-view="edit"]'
  expect((await look(page, editor)).bg, 'mørk modus: mørk editor').toBeLessThan(0.05)
  const pixels = () => page.locator('[data-pd-wrap] canvas').evaluateAll((cs) => cs.map((c) => (c as HTMLCanvasElement).toDataURL()))
  const darkCanvas = await pixels()
  expect(darkCanvas.length).toBeGreaterThan(0)

  // bytt tema mens editoren er åpen
  await page.getByRole('button', { name: 'Bytt mellom lys og mørk' }).click()
  await expect.poll(async () => (await look(page, editor)).bg, { message: 'lys modus: lys editor' }).toBeGreaterThan(0.6)
  for (const sel of ['textarea[data-pd-text]', '[data-layer]', 'button[aria-label="Angre"]', '[aria-label="Prosjektnavn"]']) {
    expect((await look(page, sel)).contrast, `${sel}: kontrast i lys modus`).toBeGreaterThanOrEqual(4.5)
  }
  await page.waitForTimeout(300)
  expect(await pixels(), 'designet (lerretets piksler) er likt i begge temaer').toEqual(darkCanvas)

  // omlasting og navigering
  await page.reload()
  await openEditor(page)
  expect((await look(page, editor)).bg).toBeGreaterThan(0.6)
  await page.goto('/app/')
  await openEditor(page)
  expect((await look(page, editor)).bg).toBeGreaterThan(0.6)

  // tilbake til mørk
  await page.getByRole('button', { name: 'Bytt mellom lys og mørk' }).click()
  await expect.poll(async () => (await look(page, editor)).bg).toBeLessThan(0.05)
})
