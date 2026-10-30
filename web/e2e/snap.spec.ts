import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * TB-2D9264: snapping kan slås av og på (felles valg for Thumbnail Studio og Photo Design, huskes etter omlasting),
 * Alt snur valget mens man drar, og ingenting flytter seg etter at museknappen er sluppet.
 * Laget dras slik at venstre kant havner ~3 skjermpunkter fra lerretets kant: med snapping fester det seg til kanten,
 * uten blir det liggende der det slippes.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'mobil har ikke lagverktøy med peker'))

async function moveAway(page: Page, sel: Locator) {
  const b = (await sel.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 4 })
  await page.mouse.up()
}

async function dragNearLeft(page: Page, sel: Locator, canvas: Locator, alt = false) {
  const b = (await sel.boundingBox())!, c = (await canvas.boundingBox())!
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2
  const dx = c.x + 3 - b.x
  if (alt) await page.keyboard.down('Alt')
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + dx / 2, sy, { steps: 4 })
  await page.mouse.move(sx + dx, sy, { steps: 4 })
  const held = (await sel.boundingBox())!.x
  await page.mouse.up()
  if (alt) await page.keyboard.up('Alt')
  await page.waitForTimeout(200)
  const out = (await sel.boundingBox())!.x
  expect(Math.abs(out - held), 'ingenting flytter seg etter at museknappen er sluppet').toBeLessThan(0.6)
  return out - c.x // avstand fra lerretets venstre kant i skjermpunkter
}

const cases = [
  {
    name: 'Thumbnail Studio',
    open: async (page: Page) => {
      await page.goto('/app/thumbnail-studio')
      await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
      await page.getByRole('button', { name: /Ny mal/ }).click()
      await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
      await page.getByRole('button', { name: 'Tekst', exact: true }).click()
      return { sel: page.locator('[data-ts-sel]'), canvas: page.locator('[data-ts-overlay]') }
    },
  },
  {
    name: 'Photo Design',
    open: async (page: Page) => {
      await page.goto('/app/photo-design')
      await page.locator('[data-tpl="photo"]').click()
      await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
      await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
      return { sel: page.locator('[class*="selBox"]').first(), canvas: page.locator('[data-pd-wrap]').first() }
    },
  },
]

for (const k of cases) {
  test(`${k.name}: snapping av/på, Alt snur valget, valget huskes`, async ({ page }) => {
    const { sel, canvas } = await k.open(page)
    const toggle = page.locator('[data-snap-toggle]')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true') // standard: på (som før)
    await expect(sel).toBeVisible()

    expect(await dragNearLeft(page, sel, canvas), 'på: festet til venstre kant').toBeLessThan(0.75)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await moveAway(page, sel)
    const free = await dragNearLeft(page, sel, canvas)
    expect(free, 'av: fri plassering, ikke festet til kanten').toBeGreaterThan(1.5)

    await moveAway(page, sel)
    expect(await dragNearLeft(page, sel, canvas, true), 'av + Alt: snapping for dette draget').toBeLessThan(0.75)

    await page.reload()
    expect(await page.evaluate(() => localStorage.getItem('medialab.snap'))).toBe('0')
  })
}
