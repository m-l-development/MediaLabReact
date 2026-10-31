import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Photo Design → Motiv → «Finjuster masken …» (den felles maskeredigeringen): venstre halvdel av et grønt bilde fjernes
 * med rektangel + Fjern, «Bruk» skriver masken til laget. Kontrolleres i Photo Designs egen tegning av designet, og
 * «Angre» i editoren tar det tilbake (samme historikk som penselen).
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'pekerverktøy testes på PC'))

const IMG = png(400, 300, () => [30, 200, 60, 255])

async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-pd-mask] [data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}
/** Fargen i designet (Photo Designs lerret) ved andeler av bredden/høyden. */
const at = (page: Page, fx: number, fy: number) => page.locator('[data-pd-view="edit"] canvas').first().evaluate((c: HTMLCanvasElement, [x, y]) => {
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const d = g.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]
}, [fx, fy] as [number, number])
const green = (c: number[]) => (c[1] ?? 0) > 150 && (c[0] ?? 0) < 90

test('Finjuster masken: endringen skrives til laget og kan angres', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await chooser).setFiles({ name: 'gronn.png', mimeType: 'image/png', buffer: IMG })
  await page.locator('[data-layer]').filter({ hasText: 'gronn' }).first().click()
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await expect.poll(async () => green(await at(page, 0.25, 0.5))).toBe(true)

  await page.locator('[data-pd-mask-open]').click()
  await expect(page.locator('[data-pd-mask] [data-mask-canvas]')).toBeVisible()
  await page.locator('[data-pd-mask] [data-mask-tool="rect"]').click()
  await page.locator('[data-pd-mask] [data-mask-keep="0"]').click()
  const a = await scr(page, -5, -5)
  const b = await scr(page, 200, 305)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-pd-mask-apply]').click()
  await expect(page.locator('[data-pd-mask]')).toHaveCount(0)

  // bildet dekker designet: venstre del er borte, høyre er grønn
  await expect.poll(async () => green(await at(page, 0.25, 0.5)), { message: 'venstre halvdel fjernet' }).toBe(false)
  expect(green(await at(page, 0.75, 0.5)), 'høyre halvdel står').toBe(true)
  // angre i editoren: hele bildet tilbake
  await page.keyboard.press('Control+z')
  await expect.poll(async () => green(await at(page, 0.25, 0.5)), { message: 'angret' }).toBe(true)
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(async () => green(await at(page, 0.25, 0.5)), { message: 'gjort om' }).toBe(false)

  // lagring og ny innlasting: masken følger prosjektet
  await page.getByLabel('Prosjektnavn').fill('Maske-test')
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText(/^Lagret/).first()).toBeVisible()
  await page.reload()
  const card = page.locator('[data-project="Maske-test"]')
  await expect(card.or(page.locator('[data-pd-view="edit"]')).first()).toBeVisible({ timeout: 20_000 })
  if (await card.count()) await card.getByRole('button', { name: 'Maske-test' }).click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await expect.poll(async () => green(await at(page, 0.75, 0.5)), { message: 'høyre halvdel etter innlasting' }).toBe(true)
  expect(green(await at(page, 0.25, 0.5)), 'venstre halvdel fortsatt fjernet etter innlasting').toBe(false)
  expect(errors).toEqual([])
})
