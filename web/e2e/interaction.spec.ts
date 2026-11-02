import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Samhandlingen på tvers av appene (snarveipanel, avbryt draing, kopier/lim inn lag, forrige visning, tastaturmeny,
 * Mockups-meny og gjør om, tidslinjezoom med Alt + hjul, menyen i Dine medier). Se docs/samhandling.md.
 */
test.skip(({ isMobile }) => isMobile, 'mus og tastatur testes på PC')

const box = async (loc: Locator) => (await loc.boundingBox()) as { x: number; y: number; width: number; height: number }

async function photo(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
}

test('snarveipanelet: «?» åpner, søket filtrerer, Escape lukker; ikke mens man skriver', async ({ page }) => {
  await photo(page)
  await page.locator('[data-pd-wrap]').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Shift+?')
  const panel = page.getByRole('dialog', { name: 'Hurtigtaster' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('searchbox')).toBeFocused()
  await expect(panel).toContainText('Mellomrom + dra')
  await page.keyboard.type('forrige visning')
  await expect(panel.locator('dt')).toHaveText(['Forrige visning'])
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  // knappen nederst til høyre åpner det samme panelet
  await page.locator('[data-ml-shortcuts]').click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  // i et tekstfelt er «?» bare et tegn
  await page.evaluate(() => {
    const i = document.createElement('input')
    i.id = 'skriv'
    document.body.append(i)
  })
  await page.locator('#skriv').fill('')
  await page.locator('#skriv').press('Shift+?')
  await expect(page.locator('#skriv')).toHaveValue('?')
  await expect(panel).toHaveCount(0)
})

test('Photo Design: Escape under draing legger laget tilbake; kopier og lim inn lag; forrige visning; Shift+F10 åpner menyen', async ({ page }) => {
  await photo(page)
  const wrap = page.locator('[data-pd-wrap]')
  const n0 = await page.locator('[data-layer]').count()
  // velg et tekstlag (lagpanelet) og dra det – Escape før slipp
  await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
  const sel = page.locator('[class*="selBox"], [data-pd-sel]').first()
  const b0 = await box(sel)
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2)
  await page.mouse.down()
  await page.mouse.move(b0.x + b0.width / 2 + 120, b0.y + b0.height / 2 + 60, { steps: 6 })
  await expect.poll(async () => (await box(sel)).x).toBeGreaterThan(b0.x + 60)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect.poll(async () => Math.round((await box(sel)).x)).toBe(Math.round(b0.x))
  await expect(page.getByRole('button', { name: 'Angre', exact: true }).first()).toBeDisabled()

  // Ctrl+C, Ctrl+V: en kopi av laget
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Control+v')
  await expect(page.locator('[data-layer]')).toHaveCount(n0 + 1)
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-layer]')).toHaveCount(n0)

  // forrige visning: 100 % (Shift+0), så Alt+0 tilbake til tilpasset, og Alt+0 igjen til 100 %
  const w0 = (await box(wrap)).width
  await page.mouse.move((await box(wrap)).x + 10, (await box(wrap)).y + 10)
  await page.keyboard.press('Shift+Digit0')
  await expect.poll(async () => (await box(wrap)).width).not.toBeCloseTo(w0, 0)
  const w100 = (await box(wrap)).width
  await page.keyboard.press('Alt+Digit0')
  await expect.poll(async () => Math.round((await box(wrap)).width)).toBe(Math.round(w0))
  await page.keyboard.press('Alt+Digit0')
  await expect.poll(async () => Math.round((await box(wrap)).width)).toBe(Math.round(w100))
  await page.keyboard.press('0')

  // Shift+F10 med arbeidsflaten i fokus: menyen, med Kopier og Lim inn
  await page.locator('section[aria-label="Arbeidsflate"]').focus()
  await page.keyboard.press('Shift+F10')
  const menu = page.getByRole('menu', { name: 'Lagmeny' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Lim inn/ })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: /Forrige visning/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  expect(await page.locator('[data-layer]').count()).toBe(n0)
})

test('Thumbnail Studio: Escape under draing legger laget tilbake uten angresteg', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  const ov = await box(page.locator('[data-ts-overlay]'))
  // klikk midt på for å velge et lag, så dra
  await page.mouse.click(ov.x + ov.width * 0.3, ov.y + ov.height * 0.35)
  const sel = page.locator('[data-ts-sel]')
  await expect(sel).toBeVisible()
  const s0 = await box(sel)
  await page.mouse.move(s0.x + s0.width / 2, s0.y + s0.height / 2)
  await page.mouse.down()
  await page.mouse.move(s0.x + s0.width / 2 + 100, s0.y + s0.height / 2 + 40, { steps: 6 })
  await expect.poll(async () => (await box(sel)).x).toBeGreaterThan(s0.x + 50)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect.poll(async () => Math.round((await box(sel)).x)).toBe(Math.round(s0.x))
})

test('Mockups: høyreklikk gir designets meny (roter), og Ctrl+Shift+Z gjør om', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/mockups?mockup=tv-wall')
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 })
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: png(320, 200, (x) => (x < 160 ? [20, 40, 230, 255] : [230, 20, 20, 255])) })
  await expect(page.getByText('design.png')).toBeVisible()
  const angle = page.getByRole('slider', { name: /Rotasjon|vinkel/i }).first()
  const a0 = await angle.inputValue()
  const w = await box(page.locator('[data-mk-wrap]'))
  await page.mouse.click(w.x + w.width / 2, w.y + w.height / 2, { button: 'right' })
  const menu = page.getByRole('menu', { name: 'Mockup' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Roter 90° mot høyre' }).click()
  await expect(menu).toHaveCount(0)
  await expect(angle).not.toHaveValue(a0)
  const a1 = await angle.inputValue()
  await page.keyboard.press('Control+z')
  await expect(angle).toHaveValue(a0)
  await page.keyboard.press('Control+Shift+z')
  await expect(angle).toHaveValue(a1)
  // tastatur: Shift+F10 på arbeidsflaten
  await page.locator('section[aria-label="Mockup"]').focus()
  await page.keyboard.press('Shift+F10')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('Motion Design: Alt + hjul og Ctrl + hjul zoomer tidslinjen, vanlig hjul gjør det ikke', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const zoom = page.locator('[data-md-zoom]')
  await zoom.fill('500')
  const tl = page.locator('[data-row="ov"]').locator('xpath=ancestor::*[contains(@class,"_tl_")][1]')
  const b = await box(tl)
  const wheel = (init: Record<string, unknown>) => tl.evaluate((el, a) => el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y, ...(a.init as object) } as WheelEventInit)), { x: b.x + b.width / 2, y: b.y + 20, init })
  const z0 = Number(await zoom.inputValue())
  await wheel({ deltaY: 100 })
  await page.waitForTimeout(100)
  expect(Number(await zoom.inputValue())).toBe(z0)
  await wheel({ deltaY: -100, altKey: true })
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(z0)
  const z1 = Number(await zoom.inputValue())
  await wheel({ deltaY: 100, ctrlKey: true })
  await expect.poll(async () => Number(await zoom.inputValue())).toBeLessThan(z1)
})

test('Dine medier: høyreklikk og Shift+F10 på et kort gir handlingene; Escape lukker', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/medier')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Last opp' }).click()
  await (await ch).setFiles({ name: 'kort.png', mimeType: 'image/png', buffer: png(64, 48, () => [200, 120, 40, 255]) })
  const card = page.locator('[data-media-card]').filter({ hasText: 'kort.png' })
  await expect(card).toBeVisible({ timeout: 20_000 })
  await card.click({ button: 'right', position: { x: 20, y: 20 } })
  const menu = page.getByRole('menu', { name: 'kort.png' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Åpne i/ }).first()).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Last ned' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await card.focus()
  await page.keyboard.press('Shift+F10')
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(card).toBeVisible() // ingenting slettet
})
