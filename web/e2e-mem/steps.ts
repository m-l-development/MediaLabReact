/** Stegene i minnemålingene: hver editor åpnes og brukes med store bilder (navigering i appen, ingen omlasting). */
import { expect, type Page } from '@playwright/test'
import { png } from '../e2e/png'

export const BIG = png(4000, 3000, (x, y) => [(x * 7 + y) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255, 255])
export const TALL = png(2400, 3600, (x, y) => [(x * 3) & 255, (x + y * 2) & 255, (y * 7) & 255, 255])

/** Navigerer i appen som en lenke gjør (ingen omlasting). */
export async function nav(page: Page, path: string) {
  await page.evaluate((p) => { history.pushState(null, '', p); dispatchEvent(new PopStateEvent('popstate')) }, path)
  await page.waitForTimeout(300)
}

export async function photo(page: Page) {
  await nav(page, '/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await expect(page.locator('[data-layer]').filter({ hasText: 'stort' })).toBeVisible({ timeout: 30_000 })
  // flere lag og en gradient, og mange angre/gjør om
  for (let i = 0; i < 4; i++) await page.locator('[data-shape]').first().click().catch(() => undefined)
  await page.keyboard.press('Escape')
  await page.locator('[data-cg-create]').click().catch(() => undefined)
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Angre', exact: true }).click().catch(() => undefined)
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Gjør om', exact: true }).click().catch(() => undefined)
}

export async function thumbnail(page: Page) {
  await nav(page, '/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await ch).setFiles({ name: 'person.png', mimeType: 'image/png', buffer: TALL })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible({ timeout: 30_000 })
}

export async function motion(page: Page) {
  await nav(page, '/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  // Avansert modus huskes mellom åpningene: slås bare på når mediebiblioteket ikke vises
  if (!(await page.locator('[data-md-bin-import]').isVisible())) await page.locator('[data-adv-toggle]').click()
  const ch = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await ch).setFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await expect(page.locator('[data-md-bin-item]')).not.toHaveCount(0, { timeout: 30_000 })
  // avspilling og stopp
  await page.locator('[data-md-canvas]').click()
  await page.keyboard.press('Space')
  await page.waitForTimeout(1500)
  await page.keyboard.press('Space')
}

export async function loop(page: Page) {
  await nav(page, '/app/loop-studio?mal=week&demo=1')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(2500)
}

export async function isolate(page: Page) {
  await nav(page, '/app/isolate-subject')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await ch).setFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await page.locator('[data-fill-mode]').getByRole('button', { name: 'Gjør uskarp', exact: true }).click()
  const b = await page.locator('main canvas').first().boundingBox()
  if (!b) throw new Error('lerret')
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-mark-apply]').click()
  await expect(page.locator('[data-effect="blur"]')).toBeVisible({ timeout: 30_000 })
  await page.locator('[data-effect-apply]').click()
}

