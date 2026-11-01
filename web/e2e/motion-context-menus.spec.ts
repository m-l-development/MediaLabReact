import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Motion Design: høyreklikk i forhåndsvisningen og i tidslinjen er to forskjellige menyer (controller.canvasCtx,
 * ctxFor, rowMenu, markerMenu). Forhåndsvisningen bruker objektet under pekeren; tidslinjen tiden og sporet som ble
 * klikket; låste spor gir bare ufarlige valg; høyreklikk alene endrer ingenting.
 */
test.skip(({ isMobile }) => isMobile, 'høyreklikk testes på PC')

const menu = (page: Page) => page.getByRole('menu')
const items = async (page: Page) => (await menu(page).getByRole('menuitem').allTextContents()).map((x) => x.trim())

async function setup(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([{ name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) }])
  await expect(page.locator('[data-md-bin-item]')).toHaveCount(1, { timeout: 20_000 })
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
}

test('forhåndsvisning og tidslinje har hver sin meny; låst spor og markører', async ({ page }) => {
  await setup(page)
  const canvas = page.locator('[data-md-canvas]')
  const cb = (await canvas.boundingBox())!

  // forhåndsvisning, på klippet: objektets handlinger – ingen tidslinjehandlinger
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2, { button: 'right' })
  await expect(menu(page)).toBeVisible()
  let it = await items(page)
  expect(it.some((x) => x.startsWith('Bytt media'))).toBe(true)
  expect(it.some((x) => x.startsWith('Del ved spillehodet'))).toBe(false)
  expect(it.some((x) => x.startsWith('Flytt spillehodet hit'))).toBe(false)
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)

  // tidslinjen, på klippet: klippets handlinger (del ved spillehodet)
  const clip = page.locator('[data-row="video"] > *').first()
  await clip.click({ button: 'right', position: { x: 20, y: 20 } })
  it = await items(page)
  expect(it.some((x) => x.startsWith('Del ved spillehodet'))).toBe(true)
  await page.keyboard.press('Escape')

  // tidslinjen, tomt område i et spor: tid og spor – ikke klipp
  const row = page.locator('[data-row="text"]')
  const rb = (await row.boundingBox())!
  await page.mouse.click(rb.x + rb.width * 0.6, rb.y + rb.height / 2, { button: 'right' })
  it = await items(page)
  expect(it).toContain('Flytt spillehodet hit')
  expect(it).toContain('Lås sporet')
  expect(it.some((x) => x.startsWith('Slett'))).toBe(false)
  // legg til markør her (ved den klikkede tiden), og markørens meny sletter ikke ved høyreklikk alene
  await menu(page).getByRole('menuitem', { name: /Legg til markør her/ }).click()
  const marker = page.locator('[data-md-ruler] button').first()
  await expect(marker).toBeVisible()
  await marker.click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await expect(marker).toBeVisible()
  await page.keyboard.press('Escape')

  // lås videosporet: klippets meny har bare kopier og lås opp
  const vrow = page.locator('[data-row="video"]')
  const vb = (await vrow.boundingBox())!
  // sporets tomme flate (selve raden er målet, ikke et klipp)
  await vrow.evaluate((el, p) => el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2 })), { x: vb.x + vb.width - 6, y: vb.y + vb.height / 2 })
  await menu(page).getByRole('menuitem', { name: 'Lås sporet' }).click()
  await clip.click({ button: 'right', position: { x: 20, y: 20 } })
  it = await items(page)
  expect(it.map((x) => x.replace(/(Ctrl\+|⌘)\w$/, '').trim())).toEqual(['Kopier', 'Lås opp sporet'])
  await page.keyboard.press('Escape')
})
