import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Felles navigering på arbeidsflatene (shared/lib/workspace-nav, useStageNav, shared/ui/ContextMenu):
 * - loddrett rulling over arbeidsflaten zoomer rundt pekeren (mus i trinn, styreflate/knip jevnt) og ruller ikke flaten;
 * - mellomrom + dra / midtknapp panorerer uten å endre innhold;
 * - høyreklikk gir en meny som kan brukes med tastatur og lukkes med Escape;
 * - paneler ruller som vanlig, og snarveier griper ikke inn i tekstfelt;
 * - maskedialogen tar sine egne taster (Delete/Ctrl+Z i dialogen rører ikke dokumentet bak).
 */
test.skip(({ isMobile }) => isMobile, 'mus og tastatur testes på PC')

const wheelAt = (loc: Locator, x: number, y: number, init: { deltaX?: number; deltaY?: number; shiftKey?: boolean; ctrlKey?: boolean }) =>
  loc.evaluate((el, a) => el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y, ...a.init } as WheelEventInit)), { x, y, init })
const box = async (loc: Locator) => (await loc.boundingBox()) as { x: number; y: number; width: number; height: number }

// ---------- Photo Design ----------
async function photo(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'bilde.png', mimeType: 'image/png', buffer: png(800, 600, (x, y) => [40 + (x % 200), 80, 150 + (y % 100), 255]) })
  await page.waitForTimeout(800)
}

test('Photo Design: rulling zoomer rundt pekeren, Shift+hjul ruller sideveis, mellomrom+dra panorerer uten å flytte laget', async ({ page }) => {
  await photo(page)
  const wrap = page.locator('[data-pd-wrap]')
  const stage = wrap.locator('xpath=..')
  // mens bildet er mindre enn flaten står det sentrert (som i Photoshop); forankringen gjelder når det er større
  const sb = await box(stage)
  const p0x = sb.x + sb.width * 0.4
  const p0y = sb.y + sb.height * 0.45
  for (let i = 0; i < 2; i++) await wheelAt(stage, p0x, p0y, { deltaY: -120 })
  await page.waitForTimeout(150)
  const w0 = (await box(wrap)).width
  const b = await box(wrap)
  expect(b.width, 'større enn flaten').toBeGreaterThan(sb.width)
  const px = sb.x + sb.width * 0.3
  const py = sb.y + sb.height * 0.4
  // dokumentpunktet under pekeren før zoom (andel av bredde/høyde)
  const fx = (px - b.x) / b.width
  const fy = (py - b.y) / b.height
  for (let i = 0; i < 3; i++) await wheelAt(stage, px, py, { deltaY: -120 })
  await page.waitForTimeout(150)
  const b1 = await box(wrap)
  expect(b1.width / w0, '3 hakk = 1,25³').toBeCloseTo(Math.pow(1.25, 3), 1)
  // punktet under pekeren står stille
  expect(Math.abs(b1.x + fx * b1.width - px)).toBeLessThan(3)
  expect(Math.abs(b1.y + fy * b1.height - py)).toBeLessThan(3)
  const st0 = await stage.evaluate((e) => [e.scrollLeft, e.scrollTop])
  // styreflate loddrett: zoomer (ruller ikke)
  await wheelAt(stage, px, py, { deltaY: 8.5 })
  await page.waitForTimeout(100)
  expect((await box(wrap)).width).toBeLessThan(b1.width)
  // Shift + hjul: sideveis
  const before = await stage.evaluate((e) => e.scrollLeft)
  await wheelAt(stage, px, py, { deltaY: 120, shiftKey: true })
  expect(await stage.evaluate((e) => e.scrollLeft)).toBeGreaterThan(before)
  // mellomrom + dra: panorerer, laget står stille i dokumentet (ingen angre-historikk)
  const layers0 = await page.locator('[data-layer]').count()
  const sc0 = await stage.evaluate((e) => [e.scrollLeft, e.scrollTop])
  await page.mouse.move(px, py)
  await page.keyboard.down(' ')
  await page.mouse.down()
  await page.mouse.move(px - 120, py - 80, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up(' ')
  const sc1 = await stage.evaluate((e) => [e.scrollLeft, e.scrollTop])
  expect(sc1[0]! - sc0[0]!, 'panorert sideveis').toBeGreaterThan(60)
  expect(await page.locator('[data-layer]').count()).toBe(layers0)
  await expect(page.getByRole('button', { name: 'Angre', exact: true }).first()).toBeVisible()
  expect(st0.length).toBe(2)
})

test('Photo Design: høyreklikk på et lag gir lagmeny med tastatur; Escape lukker; tekstfelt beholder tastene', async ({ page }) => {
  await photo(page)
  const wrap = page.locator('[data-pd-wrap]')
  const b = await box(wrap)
  const n0 = await page.locator('[data-layer]').count()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' })
  const menu = page.getByRole('menu', { name: 'Lagmeny' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  // Escape lukker uten å gjøre noe
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  expect(await page.locator('[data-layer]').count()).toBe(n0)
  // åpne igjen og velg «Dupliser» med tastatur (første valg, Enter)
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' })
  // Kopier, Klipp ut (Lim inn er inaktivt og hoppes over), Dupliser
  await expect(menu.getByRole('menuitem', { name: /Kopier/ })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: /Dupliser/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-layer]')).toHaveCount(n0 + 1)
  // + / 0 zoomer, men ikke i et tekstfelt
  const w0 = (await box(wrap)).width
  await page.keyboard.press('+')
  await expect.poll(async () => (await box(wrap)).width).toBeGreaterThan(w0 * 1.2)
  await page.keyboard.press('0')
  await expect.poll(async () => Math.round((await box(wrap)).width)).toBe(Math.round(w0))
  await page.evaluate(() => {
    const i = document.createElement('input')
    i.id = 'skriv'
    document.body.append(i)
  })
  await page.locator('#skriv').focus()
  await page.keyboard.type('+0-')
  await expect(page.locator('#skriv')).toHaveValue('+0-')
  expect(Math.round((await box(wrap)).width)).toBe(Math.round(w0))
})

test('Photo Design: med «Finjuster masken» åpen sletter Delete og Ctrl+Z ikke i dokumentet bak (snarveier i aktivt panel)', async ({ page }) => {
  await photo(page)
  const n0 = await page.locator('[data-layer]').count()
  await page.locator('[data-layer]').filter({ hasText: 'bilde' }).first().click()
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await page.locator('[data-pd-mask-open]').click()
  await expect(page.locator('[data-mask-canvas]')).toBeVisible()
  await page.locator('[data-mask-canvas]').hover()
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+z')
  await page.locator('[data-mask-done], [data-pd-mask-cancel], button:has-text("Avbryt")').first().click()
  await expect(page.locator('[data-mask-canvas]')).toHaveCount(0)
  expect(await page.locator('[data-layer]').count(), 'laget er ikke slettet').toBe(n0)
})

// ---------- Thumbnail Studio ----------
async function thumb(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
}

test('Thumbnail Studio: rulling zoomer rundt pekeren; lagmenyen kan brukes med tastatur; panelet ruller som vanlig', async ({ page }) => {
  await thumb(page)
  const overlay = page.locator('[data-ts-overlay]')
  const stage = overlay.locator('xpath=../..')
  const b = await box(overlay)
  const px = b.x + b.width * 0.7
  const py = b.y + b.height * 0.3
  const fx = (px - b.x) / b.width
  for (let i = 0; i < 3; i++) await wheelAt(stage, px, py, { deltaY: -100 })
  await page.waitForTimeout(150)
  const b1 = await box(overlay)
  expect(b1.width / b.width).toBeCloseTo(Math.pow(1.25, 3), 1)
  expect(Math.abs(b1.x + fx * b1.width - px)).toBeLessThan(4)
  // høyreklikk: lagmeny med fokus og piltaster; Escape lukker
  await page.mouse.click(px, py, { button: 'right' })
  const menu = page.getByRole('menu', { name: 'Lagmeny' })
  await expect(menu).toBeVisible()
  const first = menu.getByRole('menuitem').first()
  await expect(first).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(first).not.toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  // et panel med egen rulling (kontrollpanelet) ruller som vanlig, zoomen er uendret
  const panel = page.locator('[class*="panel"]').filter({ has: page.getByText('Lag', { exact: true }) }).first()
  if (await panel.count()) {
    const z0 = (await box(overlay)).width
    const pb = await box(panel)
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2)
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(100)
    expect(Math.round((await box(overlay)).width)).toBe(Math.round(z0))
  }
})

// ---------- Loop Studio ----------
test('Loop Studio: rulling over forhåndsvisningen zoomer uten Ctrl', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/loop-studio?mal=week')
  const view = page.locator('div[style*="transform-origin"]').first()
  await expect(view).toBeVisible()
  const b = await box(view)
  const tf = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('div')].map((d) => d.style.transform).find((t) => /scale\(/.test(t)) ?? '')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.wheel(0, -120)
  await expect.poll(tf).toMatch(/scale\(1\.2/)
})
