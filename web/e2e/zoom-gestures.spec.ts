import { expect, test, type Locator, type Page } from '@playwright/test'
import { dock } from './dock'
import { fingerDrag, pinchOut } from './touch'

/**
 * Zoom i alle editorene (shared/lib/workspace-nav, useStageNav, Loop, Motions tidslinje):
 * - PC: bare Shift + hjul zoomer ved pekeren; vanlig hjul zoomer aldri (Thumbnail, Photo og Loop: workspace-nav.spec.ts).
 * - Mobil: knip med to fingre zoomer rundt punktet mellom fingrene; én finger flytter et element uten å zoome.
 */
const width = async (l: Locator) => (await l.boundingBox())?.width ?? 0

test('Motion: Shift + hjul zoomer tidslinjen ved pekeren, vanlig hjul zoomer ikke', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'mus og tastatur på PC')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const zoom = page.locator('[data-md-zoom]')
  const z0 = Number(await zoom.inputValue())
  const tb = (await page.locator('[data-row="video"]').boundingBox())!
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(200)
  expect(Number(await zoom.inputValue()), 'hjulet uten Shift zoomet').toBe(z0)
  await page.keyboard.down('Shift')
  await page.mouse.wheel(0, -120)
  await page.keyboard.up('Shift')
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(z0)
})

/** Mobil: knip zoomer, én finger flytter laget uten å zoome. */
async function pinchAndDrag(page: Page, area: Locator, sizeOf: () => Promise<number>, grip?: Locator) {
  if (grip) {
    const z0 = await sizeOf()
    const g = (await grip.boundingBox())!
    const before = { x: g.x, y: g.y }
    await fingerDrag(page, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, 30, 25)
    await page.waitForTimeout(200)
    const after = (await grip.boundingBox())!
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y), 'én finger flyttet ikke laget').toBeGreaterThan(10)
    expect(Math.abs((await sizeOf()) - z0), 'én finger zoomet').toBeLessThan(2)
  }
  const s0 = await sizeOf()
  const b = (await area.boundingBox())!
  await pinchOut(page, { x: b.x + b.width / 2, y: b.y + b.height / 2 })
  await expect.poll(sizeOf, { message: 'knip med to fingre zoomet ikke' }).toBeGreaterThan(s0 * 1.1)
}

test.describe('mobil: knip med to fingre zoomer', () => {
  test.beforeEach(({ browserName }, info) => {
    test.skip(info.project.name !== 'mobil', 'berøring på mobil')
    test.skip(browserName !== 'chromium', 'ekte berøring via CDP (WebKit-emuleringen mangler TouchEvent)')
  })

  test('Thumbnail Studio', async ({ page }) => {
    await page.goto('/app/thumbnail-studio')
    await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
    await page.getByRole('button', { name: /Ny mal/ }).click()
    await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
    await dock(page, 'add')
    await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
    const overlay = page.locator('[data-ts-overlay]')
    await pinchAndDrag(page, overlay, () => width(overlay), page.locator('[data-ts-sel]').first())
  })

  test('Photo Design', async ({ page }) => {
    await page.goto('/app/photo-design')
    await page.locator('[data-tpl="blank"]').click()
    await dock(page, 'add')
    await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
    const wrap = page.locator('[data-pd-wrap]')
    await pinchAndDrag(page, wrap, () => width(wrap), page.locator('[data-pd-selbox]').first())
  })

  test('Motion Design (tidslinjen)', async ({ page }) => {
    await page.goto('/app/motion-design')
    await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
    await page.locator('[data-format="wide"]').click()
    await page.locator('[data-tpl="blank"]').click()
    await page.locator('[data-adv-toggle]').click()
    const zoom = page.locator('[data-md-zoom]')
    await pinchAndDrag(page, page.locator('[data-row="video"]'), async () => Number(await zoom.inputValue()))
  })

  test('Loop Studio', async ({ page }) => {
    await page.goto('/app/loop-studio?mal=week')
    const cv = page.locator('[data-loop-canvas]')
    await expect(cv).toBeVisible()
    await pinchAndDrag(page, cv, () => width(cv))
  })
})
