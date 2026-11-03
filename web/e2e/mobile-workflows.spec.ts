import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test'

/**
 * Mobil: lag flyttes med fingeren (ekte berøringshendelser), angre/gjør om gjenoppretter posisjonen, og knip zoomer
 * arbeidsflaten uten å flytte laget. PC dekkes av interaction-, thumbnail-place- og workspace-nav-testene.
 */
test.skip(({ isMobile }) => !isMobile, 'bare mobil')

async function fingerDrag(cdp: CDPSession, from: { x: number; y: number }, dx: number, dy: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] })
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (dx * i) / 8, y: from.y + (dy * i) / 8, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
/**
 * Knappetrykk rett etter et CDP-fingerdrag: Chromium mister det første tappet etter et syntetisk drag (også på en tom side
 * uten app-kode), så knappen trykkes med en pekerhendelse. Selve draget over er ekte berøring.
 */
async function fingerTap(page: Page, l: Locator) {
  const p = await mid(l)
  await page.mouse.click(p.x, p.y)
}
async function pinch(cdp: CDPSession, c: { x: number; y: number }) {
  const pts = (d: number) => [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) })
  for (const d of [45, 60, 80, 100]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const mid = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
/** Gripepunkt på laget: til venstre for midten, bort fra kanthåndtakene (midt på ligger «⋯»-knappen på mobil). */
const grip = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: b.x + b.width * 0.3, y: b.y + b.height / 2 } }
/** «Angre» er synlig på skjermen uten å sveipe verktøylinjen. */
async function undoInView(page: Page) {
  const b = (await page.getByRole('button', { name: 'Angre' }).first().boundingBox())!
  const vw = page.viewportSize()!.width
  expect(b.x >= 0 && b.x + b.width <= vw, 'Angre er synlig uten å sveipe').toBe(true)
}
async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test('Photo Design: dra laget med fingeren, angre og gjør om, knip zoomer', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').tap()
  await page.locator('[data-dock-tab="add"]').tap()
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().tap()
  const sel = page.locator('[data-pd-selbox]')
  await expect(sel).toBeVisible()
  const cdp = await page.context().newCDPSession(page)
  const a = await mid(sel)
  await fingerDrag(cdp, await grip(sel), 40, 50)
  const b = await mid(sel)
  expect(Math.abs(b.x - a.x - 40) + Math.abs(b.y - a.y - 50), 'laget følger fingeren').toBeLessThan(8)
  await undoInView(page)
  await fingerTap(page, page.getByRole('button', { name: 'Angre' }).first())
  await expect.poll(async () => Math.abs((await mid(sel)).x - a.x) + Math.abs((await mid(sel)).y - a.y)).toBeLessThan(2)
  await fingerTap(page, page.getByRole('button', { name: 'Gjør om' }).first())
  await expect.poll(async () => Math.abs((await mid(sel)).x - b.x) + Math.abs((await mid(sel)).y - b.y)).toBeLessThan(2)
  // knip på arbeidsflaten: zoomen øker, laget blir liggende i dokumentet (større på skjermen, ikke flyttet)
  const wrap = page.locator('[data-pd-wrap]')
  const ww0 = (await wrap.boundingBox())!.width
  const w0 = (await sel.boundingBox())!.width
  await pinch(cdp, await mid(wrap))
  await expect.poll(async () => (await wrap.boundingBox())!.width).toBeGreaterThan(ww0 + 10)
  expect((await sel.boundingBox())!.width).toBeGreaterThan(w0)
  expect(errors).toEqual([])
})

test('Thumbnail Studio: dra laget med fingeren, angre og gjør om', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  await page.evaluate(() => localStorage.setItem('medialab.snap', '0'))
  await page.reload()
  await page.getByRole('button', { name: /Ungdomsmøte/ }).first().tap()
  await page.getByRole('button', { name: /Ny mal/ }).tap()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').tap()
  await page.locator('[data-dock-tab="add"]').tap()
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().tap()
  const sel = page.locator('[data-ts-sel]')
  await expect(sel).toBeVisible()
  const cdp = await page.context().newCDPSession(page)
  const a = await mid(sel)
  await fingerDrag(cdp, await grip(sel), 30, 40)
  const b = await mid(sel)
  expect(Math.abs(b.x - a.x - 30) + Math.abs(b.y - a.y - 40), 'laget følger fingeren').toBeLessThan(8)
  await undoInView(page)
  await fingerTap(page, page.getByRole('button', { name: 'Angre' }).first())
  await expect.poll(async () => Math.abs((await mid(sel)).x - a.x) + Math.abs((await mid(sel)).y - a.y)).toBeLessThan(2)
  await fingerTap(page, page.getByRole('button', { name: 'Gjør om' }).first())
  await expect.poll(async () => Math.abs((await mid(sel)).x - b.x) + Math.abs((await mid(sel)).y - b.y)).toBeLessThan(2)
  expect(errors).toEqual([])
})

test('Motion Design: angre og gjør om er synlige i verktøylinjen', async ({ page }) => {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).tap()
  await page.locator('[data-format="wide"]').tap()
  await page.locator('[data-tpl="blank"]').tap()
  await undoInView(page)
})
