import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Photo Design → Avansert: avansert framkalling (hvit-/svartpunkt, vibrance, klarhet, skarphet, auto-tone, histogram,
 * før/etter). Vises bare i Avansert modus; standardmodus er uendret. Endringen synes på lerretet og lagres med prosjektet.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

const GRAD = png(320, 240, (x, y) => [Math.round((x / 319) * 200) + 20, Math.round((y / 239) * 120) + 60, 90, 255])
const mean = (page: Page) => page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let s = 0
  for (let i = 0; i < d.length; i += 4 * 97) s += d[i]! + d[i + 1]! + d[i + 2]!
  return s / (d.length / (4 * 97))
})

async function open(page: Page) {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'grad.png', mimeType: 'image/png', buffer: GRAD })
  await page.waitForTimeout(1200)
}

test('avansert framkalling: bare i Avansert modus, virker på lerretet, før/etter, auto-tone og lagring', async ({ page }) => {
  await open(page)
  const panel = page.locator('[data-pd-adv-dev]')
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(page.getByText('Looks')).toBeVisible()
  await expect(panel, 'standardmodus: ingen avansert framkalling').toHaveCount(0)

  // slå på Avansert modus (Effekter-fanen), tilbake til bildelaget
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).or(page.getByRole('button', { name: 'Avansert modus' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(panel).toBeVisible()
  await expect(panel.locator('[data-pd-hist]')).toBeVisible()

  const m0 = await mean(page)
  await panel.locator('input[type="range"]').nth(0).fill('90') // hvitpunkt
  await expect.poll(() => mean(page), { message: 'hvitpunktet gjør bildet lysere' }).toBeGreaterThan(m0 + 2)
  const m1 = await mean(page)

  // før/etter: mens knappen holdes, vises originalen
  const before = panel.locator('[data-pd-before]')
  await before.hover()
  await page.mouse.down()
  await expect.poll(() => mean(page)).toBeLessThan(m1 - 2)
  await page.mouse.up()
  await expect.poll(() => mean(page)).toBeGreaterThan(m1 - 1)

  // auto-tone setter svartpunkt/hvitpunkt ut fra bildet
  await panel.locator('[data-pd-auto]').click()
  await expect.poll(async () => panel.locator('input[type="range"]').nth(1).inputValue()).not.toBe('0')

  // lagring og gjenåpning
  const saved = await panel.locator('input[type="range"]').nth(0).inputValue()
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await expect(panel).toBeVisible()
  await expect(panel.locator('input[type="range"]').nth(0)).toHaveValue(saved)
})

const channelMeans = (page: Page) => page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let r = 0, g = 0, n = 0
  for (let i = 0; i < d.length; i += 4 * 97) { r += d[i]!; g += d[i + 1]!; n++ }
  return { r: r / n, g: g / n }
})

test('Standard viser bare grunnleggende justeringer; Avansert har kanalkurver som virker på bildet og lagres', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  // Standard: fem enkle justeringer, ingen kurve; før/etter virker
  const ranges = page.locator('[data-pd-view="edit"] input[type="range"]')
  await expect(page.locator('[data-pd-curves]')).toHaveCount(0)
  await expect(page.getByText('Høylys', { exact: true })).toHaveCount(0)
  for (const l of ['Eksponering', 'Lysstyrke', 'Kontrast', 'Metning', 'Temperatur']) await expect(page.getByText(l, { exact: true }).first()).toBeVisible()
  const m0 = await mean(page)
  await page.getByText('Lysstyrke', { exact: true }).first().locator('xpath=ancestor::*[.//input[@type="range"]][1]').locator('input[type="range"]').fill('60')
  await expect.poll(() => mean(page)).toBeGreaterThan(m0 + 2)
  const lit = await mean(page)
  await page.locator('[data-pd-before-std]').hover()
  await page.mouse.down()
  await expect.poll(() => mean(page)).toBeLessThan(lit - 2)
  await page.mouse.up()
  expect(await ranges.count()).toBeLessThanOrEqual(8)

  // Avansert: kanalkurve (rød) løfter rødt mer enn grønt
  await page.locator('[data-adv-toggle]').click()
  const curves = page.locator('[data-pd-curves]')
  await expect(curves).toBeVisible()
  await expect(page.getByText('Høylys', { exact: true }).first()).toBeVisible()
  const c0 = await channelMeans(page)
  await curves.locator('[data-pd-ch="curveR"]').click()
  const svg = curves.locator('[data-pd-curve-svg]')
  const b = (await svg.boundingBox())!
  // ny punkt midt på diagonalen, dra det opp
  const px = b.x + b.width * (3 + 50) / 106, py = b.y + b.height * (3 + 50) / 106
  await page.mouse.move(px, py)
  await page.mouse.down()
  await page.mouse.move(px, py - b.height * 0.25, { steps: 5 })
  await page.mouse.up()
  await expect(curves.locator('[data-pd-curve-read]')).toContainText('→')
  await expect.poll(async () => { const c1 = await channelMeans(page); return (c1.r - c0.r) - (c1.g - c0.g) }, { message: 'rødkurven løfter rødt mer enn grønt' }).toBeGreaterThan(8)

  // lagring og gjenåpning: kanalkurven er der fortsatt
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await page.locator('[data-layer]').filter({ hasText: /grad|Bakgrunnsbilde/ }).first().click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await page.locator('[data-pd-curves] [data-pd-ch="curveR"]').click()
  await expect(page.locator('[data-pd-curve-svg] circle')).toHaveCount(6) // 3 punkter × (treffsone + punkt)
})

test('effektvelger (popup): forhåndsvisning på bildet, Avbryt/Escape forkaster, «Legg til effekt» gir ett lag som kan angres', async ({ page }) => {
  await open(page)
  await page.locator('[data-adv-toggle]').click()
  const layers = page.locator('[data-layer]')
  const n0 = await layers.count()
  const m0 = await mean(page)
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.locator('[data-pd-fx-open]').click()
  const pop = page.locator('[data-pd-fxpicker]')
  await expect(pop).toBeVisible()
  await expect(pop.locator('[data-pd-fx-add]')).toBeDisabled()
  // søk og kategori
  await pop.getByRole('textbox').fill('lys')
  await expect(pop.locator('[data-fx]').first()).toBeVisible()
  await pop.getByRole('textbox').fill('')
  // forhåndsvisning endrer lerretet, men lager ikke lag; nytt valg erstatter
  await pop.locator('[data-fx]').nth(0).click()
  await expect.poll(() => mean(page).then((m) => Math.abs(m - m0))).toBeGreaterThan(1)
  await pop.locator('[data-fx]').nth(1).click()
  await expect(pop.locator('[data-fx][aria-pressed="true"]')).toHaveCount(1)
  expect(await layers.count()).toBe(n0)
  // synlighet påvirker forhåndsvisningen
  await pop.locator('input[type="range"]').last().fill('0')
  await expect.poll(() => mean(page).then((m) => Math.abs(m - m0))).toBeLessThan(0.6)
  await pop.locator('input[type="range"]').last().fill('100')
  // Escape forkaster
  await pop.locator('[data-fx]').nth(1).focus()
  await page.keyboard.press('Escape')
  await expect(pop).toHaveCount(0)
  await expect.poll(() => mean(page).then((m) => Math.abs(m - m0))).toBeLessThan(0.6)
  expect(await layers.count()).toBe(n0)
  // bekreft: ett nytt lag, effekten ligger på bildet
  await page.locator('[data-pd-fx-open]').click()
  await pop.locator('[data-fx]').nth(0).click()
  await pop.locator('[data-pd-fx-add]').click()
  await expect(pop).toHaveCount(0)
  await expect(layers).toHaveCount(n0 + 1)
  await expect.poll(() => mean(page).then((m) => Math.abs(m - m0))).toBeGreaterThan(1)
  // angre fjerner laget
  await page.getByRole('button', { name: 'Angre' }).first().click()
  await expect(layers).toHaveCount(n0)
})

test('«Legg til»: fire grupper uten duplikater; hver knapp lager riktig, redigerbart lag', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  for (const g of ['Innhold', 'Former og grafikk', 'Lys og effekter', 'Medier']) await expect(page.getByRole('group', { name: g })).toBeVisible()
  for (const old of ['Form', 'Former']) await expect(page.getByRole('button', { name: old, exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sirkel', exact: true }), 'Sirkel finnes én gang: som form i rutenettet').toHaveCount(1)
  const layers = page.locator('[data-layer]')
  await page.getByRole('group', { name: 'Innhold' }).getByRole('button', { name: 'Tekst' }).click()
  await expect(layers).toHaveCount(1)
  await expect(page.locator('textarea[data-pd-text]')).toBeVisible()
  await page.locator('[data-pd-shapes] [data-shape="ellipse"]').click()
  await expect(layers).toHaveCount(2)
  await page.getByRole('group', { name: 'Lys og effekter' }).getByRole('button', { name: 'Lys' }).click()
  await page.getByRole('group', { name: 'Lys og effekter' }).getByRole('button', { name: 'Toning' }).click()
  await expect(layers).toHaveCount(4)
  await expect(page.getByRole('group', { name: 'Lys og effekter' }).getByRole('button', { name: 'Effekt …' })).toHaveCount(0) // bare i Avansert
})
