import { expect, test, type Page } from '@playwright/test'

/**
 * TB-2D9264 (Thumbnail Studio): lag kan plasseres fritt og presist. Med snapping av blir laget liggende der det slippes,
 * piltastene flytter nøyaktig 1 px (Shift: 10 px) i lerretets koordinater, et klikk uten draing flytter ingenting,
 * og plasseringen er den samme etter lagring og omlasting.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'mobil har ikke lagverktøy med peker'))

const sel = (page: Page) => page.locator('[data-ts-sel]')
const canvas = (page: Page) => page.locator('[data-ts-overlay]')
/** Lagets venstre/øvre kant i forhold til lerretet, i skjermpunkter. */
async function pos(page: Page) {
  const b = (await sel(page).boundingBox())!
  const c = (await canvas(page).boundingBox())!
  return { x: b.x - c.x, y: b.y - c.y, w: c.width }
}

test('fri og presis plassering: av-snapping, piltaster, klikk uten draing, lagring og omlasting', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.evaluate(() => localStorage.setItem('medialab.snap', '0'))
  await page.reload()
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await expect(sel(page)).toBeVisible()
  await expect(page.locator('[data-snap-toggle]')).toHaveAttribute('aria-pressed', 'false')

  // dra til en «skjev» plass nær midtlinjen: med snapping av blir laget liggende nøyaktig der det slippes
  const b = (await sel(page).boundingBox())!
  const c = (await canvas(page).boundingBox())!
  const sx = b.x + b.width / 2
  const sy = b.y + b.height / 2
  const tx = c.x + c.width / 2 + 7 // 7 skjermpunkter fra midtlinjen
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(tx, sy + 23, { steps: 8 })
  await page.mouse.up()
  const a = await pos(page)
  expect(Math.abs(a.x + b.width / 2 - c.width / 2 - 7), 'ikke festet til midtlinjen').toBeLessThan(1.5)

  // klikk uten å dra: laget flytter seg ikke
  const s2 = (await sel(page).boundingBox())!
  await page.mouse.click(s2.x + s2.width / 2, s2.y + s2.height / 2)
  await page.waitForTimeout(150)
  const a2 = await pos(page)
  expect(Math.abs(a2.x - a.x) + Math.abs(a2.y - a.y), 'klikk flytter ikke laget').toBeLessThan(0.6)

  // piltaster: 1 px og 10 px i lerretets koordinater (1920 px bredt), uavhengig av visningsstørrelsen
  const k = a.w / 1920
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  const a3 = await pos(page)
  expect(Math.abs(a3.x - a2.x - 5 * k), '5 × → = 5 px').toBeLessThan(0.6)
  await page.keyboard.press('Shift+ArrowDown')
  const a4 = await pos(page)
  expect(Math.abs(a4.y - a3.y - 10 * k), 'Shift+↓ = 10 px').toBeLessThan(0.6)
  expect(Math.abs(a4.x - a3.x)).toBeLessThan(0.3)

  // lagre som ny mal, last inn på nytt: samme plassering (andel av lerretet)
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await expect(page).toHaveURL(/tpl=/)
  const before = { x: a4.x / a4.w, y: a4.y / a4.w }
  await page.reload()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  const c2 = (await canvas(page).boundingBox())!
  await page.mouse.click(c2.x + before.x * c2.width + 6, c2.y + before.y * c2.width + 6)
  await expect(sel(page)).toBeVisible()
  const r = await pos(page)
  expect(Math.abs(r.x / r.w - before.x) * 1920, 'x etter omlasting (px)').toBeLessThan(1.01)
  expect(Math.abs(r.y / r.w - before.y) * 1920, 'y etter omlasting (px)').toBeLessThan(1.01)
  expect(errors).toEqual([])
})
