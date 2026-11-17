import { expect, test, type Locator, type Page } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/**
 * «Isoler motiv …» i editorene: hele Isolate Subject i en popup. Bildet (240 × 160: grønn bakgrunn, rødt kvadrat
 * 80–160 × 40–120) isoleres med «Logo» (fargenøkkel, ingen AI-nedlasting) og settes inn med «Ferdig – sett inn».
 * Avbryt lar editoren være uendret. Editoren reagerer ikke på taster mens popupen er åpen.
 */
const W = 240
const H = 160
export const LOGO = png(W, H, (x, y) => (x >= 80 && x < 160 && y >= 40 && y < 120 ? [220, 30, 30, 255] : [40, 160, 60, 255]))

/** I popupen: hopp over beskjæring, Behold logo, Gjennomfør, Ferdig – sett inn. */
export async function isolateInPopup(page: Page) {
  const pop = page.locator('[data-ml-popup]')
  await expect(pop).toBeVisible()
  await pop.getByRole('button', { name: 'Hopp over' }).click()
  await pop.locator('[data-target="logo"]').click()
  await pop.locator('[data-run]').click()
  await expect(pop.locator('[data-embed-insert]')).toBeEnabled({ timeout: 30_000 })
  await pop.locator('[data-embed-insert]').click()
  await expect(pop).toHaveCount(0)
}

/** Avbryt: popupen lukkes og ingenting endres. Delete i popupen sletter ikke noe i editoren bak. */
export async function cancelPopup(page: Page) {
  const pop = page.locator('[data-ml-popup]')
  await expect(pop).toBeVisible()
  await page.keyboard.press('Delete')
  await page.keyboard.press('Backspace')
  await pop.locator('[data-embed-cancel]').click()
  await expect(pop).toHaveCount(0)
}

/** Fargen på skjermen i et punkt av et element (andeler av bredde/høyde). */
export async function shot(page: Page, el: Locator, fx: number, fy: number): Promise<number[]> {
  const b64 = (await el.screenshot()).toString('base64')
  return page.evaluate(async ([d, x, y]) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${d}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return [...g.getImageData(Math.floor(bmp.width * (x as number)), Math.floor(bmp.height * (y as number)), 1, 1).data]
  }, [b64, fx, fy] as const)
}
const green = (p: number[]) => Math.abs((p[0] ?? 0) - 40) < 25 && Math.abs((p[1] ?? 0) - 160) < 25 && Math.abs((p[2] ?? 0) - 60) < 25

test.beforeEach(async ({ page }) => {
  await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
})

test('Mockups: Isoler motiv på designet, Avbryt endrer ingenting, Ferdig – sett inn bytter designet', async ({ page }) => {
  await page.goto('/app/mockups')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO })
  await expect(page.getByText('logo.png').first()).toBeVisible()
  await page.locator('[data-isolate-open]').first().click()
  await cancelPopup(page)
  await expect(page.getByText('logo.png').first()).toBeVisible()
  await page.locator('[data-isolate-open]').first().click()
  await isolateInPopup(page)
  await expect(page.getByText('logo-isolert.png').first()).toBeVisible()
})

test('Thumbnail Studio: Isoler motiv på et bildelag; Delete i popupen sletter ikke laget; resultatet erstatter bildet', async ({ page }) => {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await dock(page, 'add')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO })
  await expect(page.locator('[data-ts-sel]')).toBeVisible()
  await dock(page, 'edit')
  const thumb = page.locator('[data-isolate-open]').locator('xpath=ancestor::div[2]').locator('img, canvas').first()
  await expect(thumb).toBeVisible()
  expect(green(await shot(page, thumb, 0.2, 0.15)), 'før: grønn bakgrunn').toBe(true)
  await page.locator('[data-isolate-open]').click()
  await cancelPopup(page)
  await expect(page.locator('[data-ts-sel]'), 'laget finnes fortsatt').toBeVisible()
  await dock(page, 'edit')
  await page.locator('[data-isolate-open]').click()
  await isolateInPopup(page)
  await expect.poll(async () => green(await shot(page, thumb, 0.2, 0.15)), { message: 'etter: bakgrunnen er gjennomsiktig' }).toBe(false)
})

test('Photo Design: Isoler motiv på et bildelag; Avbryt beholder bildet; resultatet erstatter bildet', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await dock(page, 'add')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO })
  const sel = page.locator('[data-pd-selbox]').first()
  await expect(sel).toBeVisible()
  expect(green(await shot(page, sel, 0.1, 0.1)), 'før: grønn bakgrunn').toBe(true)
  await dock(page, 'edit')
  await page.locator('[data-isolate-open]').click()
  await cancelPopup(page)
  await expect(sel, 'laget finnes fortsatt').toBeVisible()
  await dock(page, 'edit')
  await page.locator('[data-isolate-open]').click()
  await isolateInPopup(page)
  await page.waitForTimeout(800)
  await expect.poll(async () => green(await shot(page, sel, 0.1, 0.1)), { message: 'etter: bakgrunnen er gjennomsiktig' }).toBe(false)
})

/** Motion på mobil: egenskapene ligger bak «Egenskaper». */
async function mdProps(page: Page) {
  const b = page.getByRole('button', { name: 'Egenskaper', exact: true })
  if (await b.isVisible()) await b.click()
}

test('Motion Design: Isoler motiv på et bildeklipp; resultatet erstatter bildet i klippet', async ({ page }) => {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([{ name: 'logo.png', mimeType: 'image/png', buffer: LOGO }])
  const item = page.locator('[data-md-bin-item="logo.png"]')
  await expect(item).toBeVisible({ timeout: 20_000 })
  await item.click({ button: 'right' })
  await page.getByRole('menu').getByRole('menuitem', { name: 'Legg på hovedsporet (V1)' }).click()
  await page.locator('[data-row="video"] > *').first().click()
  await mdProps(page)
  const open = page.getByRole('button', { name: 'Isoler motiv …' })
  await open.click()
  await cancelPopup(page)
  await expect(page.locator('[data-md-bin-item="logo-isolert.png"]')).toHaveCount(0)
  await mdProps(page)
  await open.click()
  await isolateInPopup(page)
  await expect(page.locator('[data-md-bin-item="logo-isolert.png"]')).toHaveCount(1, { timeout: 20_000 })
  await expect(page.locator('[data-row="video"] > *')).toHaveCount(1)
})

/** Grønnaktig (Loop legger en mørk tone over bakgrunnen). */
const greenish = (p: number[]) => (p[1] ?? 0) > 30 && (p[1] ?? 0) > 1.6 * (p[0] ?? 0) && (p[1] ?? 0) > 1.6 * (p[2] ?? 0)

/** Loop: miniatyren av valgt slides bakgrunn i panelet (svart bak et gjennomsiktig bilde). */
async function loopPx(page: Page, _cv: Locator): Promise<number[]> {
  const thumb = page.getByText('Bakgrunnsbilde', { exact: true }).locator('xpath=following::div[contains(@style,"aspect-ratio")][1]')
  await thumb.scrollIntoViewIfNeeded()
  return shot(page, thumb, 0.1, 0.5)
}
async function editMode(page: Page) {
  const ed = page.getByRole('button', { name: 'Rediger', exact: true })
  if (await ed.isVisible()) await ed.click()
}

test('Loop Studio: Isoler motiv på bakgrunnsbildet; Avbryt beholder bildet; resultatet blir ny bakgrunn', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  const cv = page.locator('[data-loop-canvas]')
  await expect(cv).toBeVisible()
  // mobil: redigeringspanelet ligger bak «Rediger»
  const ed = page.getByRole('button', { name: 'Rediger', exact: true })
  if (await ed.isVisible()) await ed.click()
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^Slides/ }).first().click()
  const ch = page.waitForEvent('filechooser')
  await page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]').click()
  await (await ch).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO })
  const crop = page.getByRole('dialog').filter({ has: page.locator('[data-loop-cropbox]') })
  await crop.getByRole('button', { name: 'Bruk hele bildet' }).click()
  await expect(crop).toBeHidden()
  await expect.poll(async () => greenish(await loopPx(page, cv)), { message: 'før: grønn bakgrunn', timeout: 30_000 }).toBe(true)
  await editMode(page)
  await page.locator('[data-isolate-open]').click()
  await cancelPopup(page)
  await expect.poll(async () => greenish(await loopPx(page, cv)), { message: 'Avbryt: uendret', timeout: 30_000 }).toBe(true)
  await editMode(page)
  await page.locator('[data-isolate-open]').click()
  await isolateInPopup(page)
  await expect.poll(async () => greenish(await loopPx(page, cv)), { message: 'etter: bakgrunnen er fjernet', timeout: 30_000 }).toBe(false)
})
