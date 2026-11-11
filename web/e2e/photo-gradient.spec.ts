import { expect, test, type Page } from '@playwright/test'

/**
 * Photo Design: fargekurve-gradienten på bakgrunnen. Ingen gradient lages av å åpne panelet eller bevege en glider;
 * den lages bare med «Lag gradient». Kontrollene endrer den som finnes (retning, plassering, fargestyrke), av/på beholder
 * innstillingene, «Fjern gradient» tar den bort, og alt følger med gjennom lagring/omlasting og Angre/Gjør om.
 * Resultatet leses fra lerretet (svart → hvit gradient fra standardkurvene, hvit bakgrunn under).
 */

/** Lysstyrke (0–255) i punkter av lerretet (andeler). */
async function lum(page: Page, pts: [number, number][]): Promise<number[]> {
  return page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement, p) => {
    const g = c.getContext('2d') as CanvasRenderingContext2D
    return p.map(([x, y]) => { const d = g.getImageData(Math.floor(x * (c.width - 1)), Math.floor(y * (c.height - 1)), 1, 1).data; return Math.round(((d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0)) / 3) })
  }, pts)
}
const L = 0.08, R = 0.92, M = 0.5
const row = (page: Page) => lum(page, [[L, M], [M, M], [R, M]])
const col = (page: Page) => lum(page, [[M, L], [M, M], [M, R]])
const settle = (page: Page) => page.waitForTimeout(250)

test('gradient: lages bare med «Lag gradient»; retning, plassering, fargestyrke, av/på, fjern, lagring og angre', async ({ page }) => {
  test.skip(test.info().project.name === 'mobil', 'mobil: egen test under')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  const box = page.locator('[data-curve-gradient]')
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  const white = await row(page)
  expect(white).toEqual([255, 255, 255])
  // åpent panel uten gradient: ingen glidere å bevege, og lerretet er urørt
  await expect(box.locator('[data-cg-angle]')).toHaveCount(0)
  await expect(box.locator('[data-cg-int]')).toHaveCount(0)

  await box.locator('[data-cg-create]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await settle(page)
  // standard: 90° = mot høyre, mørk til venstre, lys til høyre
  const [l0, , r0] = await row(page)
  expect((r0 ?? 0) - (l0 ?? 0)).toBeGreaterThan(150)

  // retning: 180° = nedover (mørk øverst), samme gradient (ingen ny opprettes)
  await box.locator('[data-cg-angle]').fill('180')
  await settle(page)
  const [t1, , b1] = await col(page)
  expect((b1 ?? 0) - (t1 ?? 0)).toBeGreaterThan(150)
  const [l1, , r1] = await row(page)
  expect(Math.abs((r1 ?? 0) - (l1 ?? 0))).toBeLessThan(20)
  await box.locator('[data-cg-angle]').fill('90')

  // plassering: midten flyttet til venstre → midtpunktet blir lysere
  await settle(page)
  const mid0 = (await row(page))[1] ?? 0
  await box.locator('[data-cg-pos="x"]').fill('20')
  await settle(page)
  const mid1 = (await row(page))[1] ?? 0
  expect(mid1 - mid0).toBeGreaterThan(40)
  await box.locator('[data-cg-pos="x"]').fill('50')

  // fargestyrke (virker også på gråtoner): 0 % = flat, 200 % = sterkere enn 100 %
  await box.locator('[data-cg-int]').fill('0')
  await settle(page)
  const flat = await row(page)
  expect(Math.max(...flat) - Math.min(...flat)).toBeLessThan(6)
  await box.locator('[data-cg-int]').fill('40')
  await settle(page)
  const weak = await lum(page, [[0.3, M], [0.7, M]])
  await box.locator('[data-cg-int]').fill('100')
  await settle(page)
  const normal = await lum(page, [[0.3, M], [0.7, M]])
  await box.locator('[data-cg-int]').fill('200')
  await settle(page)
  const strong = await lum(page, [[0.3, M], [0.7, M]])
  const span = (v: number[]) => (v[1] ?? 0) - (v[0] ?? 0)
  expect(span(weak)).toBeLessThan(span(normal))
  expect(span(strong)).toBeGreaterThan(span(normal))

  // av: bakgrunnen er hvit igjen, innstillingene beholdes; på: samme gradient som før
  const onSig = await row(page)
  await box.locator('[data-cg-toggle]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await settle(page)
  expect(await row(page)).toEqual(white)
  await expect(page.locator('[data-pd-fillpin]')).toHaveCount(0)

  // lagring og omlasting: fortsatt av, med innstillingene
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await settle(page)
  expect(await row(page)).toEqual(white)
  await box.locator('[data-cg-toggle]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await expect(box.locator('[data-cg-int]')).toHaveValue('200')
  await settle(page)
  expect(await row(page)).toEqual(onSig)

  // tilbakestill: retning, plassering og fargestyrke til standard (kurvene beholdes)
  await box.locator('[data-cg-angle]').fill('30')
  await box.locator('[data-cg-reset]').click()
  await expect(box.locator('[data-cg-angle]')).toHaveValue('90')
  await expect(box.locator('[data-cg-int]')).toHaveValue('100')
  await expect(box.locator('[data-cg-pos="x"]')).toHaveValue('50')

  // fjern: borte straks; Angre gir den tilbake, Gjør om fjerner den igjen
  await box.locator('[data-cg-remove]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  expect(await row(page)).toEqual(white)
  await page.getByRole('button', { name: 'Angre', exact: true }).click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await page.getByRole('button', { name: 'Gjør om', exact: true }).click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  expect(await row(page)).toEqual(white)
  expect(errors).toEqual([])
})

test('mobil: gradienten i Rediger-skuffen lages, endres, slås av og fjernes uten Angre', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobil', 'PC: testen over')
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Rediger' }).last().click()
  const box = page.locator('[data-curve-gradient]')
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await expect(box.locator('[data-cg-int]')).toHaveCount(0)
  await settle(page)
  const white = await row(page)
  await box.locator('[data-cg-create]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await box.locator('[data-cg-int]').fill('0')
  await settle(page)
  const flat = await row(page)
  expect(Math.max(...flat) - Math.min(...flat)).toBeLessThan(6)
  await box.locator('[data-cg-int]').fill('100')
  await box.locator('[data-cg-toggle]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await settle(page)
  expect(await row(page)).toEqual(white)
  await box.locator('[data-cg-toggle]').click()
  await settle(page)
  const [l, , r] = await row(page)
  expect((r ?? 0) - (l ?? 0)).toBeGreaterThan(150)
  await box.locator('[data-cg-remove]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  expect(await row(page)).toEqual(white)
})
