import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/** Motion Design → Avansert tidslinje: autopanorering, zoom, «Tilpass hele tidslinjen», visningsstart og prosjektvarighet. */

const tc = (page: Page) => page.locator('[data-md-tc]')
const start = (page: Page) => page.locator('[data-md-timing] [data-md-tm="start"]')
const ov = (page: Page) => page.locator('[data-row="ov"] [data-block="ov"]')
const scroller = (page: Page) => page.locator('[data-row="ov"]').locator('xpath=ancestor::*[contains(@class,"_tl_")][1]')

async function setup(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([
    { name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) },
    { name: 'gronn.png', mimeType: 'image/png', buffer: png(160, 90, () => [20, 210, 40, 255]) },
  ])
  await expect(page.locator('[data-md-bin-item]')).toHaveCount(2, { timeout: 20_000 })
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await tc(page).click()
  await page.keyboard.press('Home')
  await page.locator('[data-md-bin-item="gronn.png"] [data-md-to="v"]').click()
  await expect(start(page)).toHaveValue('0.00')
}

test('autopanorering, zoom, tilpass, visningsstart, prosjektvarighet og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  await setup(page)

  // «Tilpass hele tidslinjen»: hele prosjektet synlig fra 0
  await page.locator('[data-md-fit]').click()
  await expect(page.locator('[data-md-field="view"]')).toHaveValue('00:00:00')
  const inView = () => page.evaluate(() => {
    const b = document.querySelector('[data-row="ov"] [data-block="ov"]')!.getBoundingClientRect()
    const t = document.querySelector('[data-row="ov"]')!.closest('[class*="_tl_"]')!.getBoundingClientRect()
    return b.left >= t.left - 1 && b.right <= t.right + 1
  })
  expect(await inView(), 'klippet er synlig etter «Tilpass hele tidslinjen»').toBe(true)

  // zoom langt inn og ut: tidene står stille
  await page.locator('[data-md-zoom]').fill('950')
  await page.locator('[data-md-zoom]').fill('50')
  await expect(start(page)).toHaveValue('0.00')
  await expect(page.locator('[data-md-timing] [data-md-tm="dur"]')).toHaveValue('4.00')

  // autopanorering: dra til høyre kant og hold
  await page.locator('[data-md-fit]').click()
  await page.locator('[data-md-zoom]').fill('700')
  const b = await ov(page).boundingBox()
  const area = await scroller(page).boundingBox()
  if (!b || !area) throw new Error('mangler')
  await page.mouse.move(b.x + 10, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(area.x + area.width - 6, b.y + b.height / 2, { steps: 8 })
  const sl0 = await scroller(page).evaluate((e) => e.scrollLeft)
  await page.waitForTimeout(900)
  const sl1 = await scroller(page).evaluate((e) => e.scrollLeft)
  expect(sl1, 'tidslinjen panorerer mot høyre').toBeGreaterThan(sl0 + 100)
  const vis = await ov(page).boundingBox()
  expect(vis && vis.x + vis.width > area.x && vis.x < area.x + area.width, 'klippet følger pekeren mens tidslinjen ruller').toBe(true)
  await page.mouse.up()
  const moved = Number(await start(page).inputValue())
  expect(moved, 'klippet er flyttet langt fram i tid').toBeGreaterThan(5)

  // tiden står i prosjektet: angre gir 0, gjør om gir tiden tilbake
  await tc(page).click()
  await page.keyboard.press('Control+z')
  await ov(page).click()
  await expect(start(page)).toHaveValue('0.00')
  await page.keyboard.press('Control+Shift+z')
  await ov(page).click()
  await expect(start(page)).toHaveValue(moved.toFixed(2))

  // avbrutt draing (Escape): klippet står der det var
  await page.locator('[data-md-fit]').click()
  const b2 = await ov(page).boundingBox()
  if (!b2) throw new Error('mangler')
  await page.mouse.move(b2.x + 4, b2.y + b2.height / 2)
  await page.mouse.down()
  await page.mouse.move(b2.x - 120, b2.y + b2.height / 2, { steps: 6 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(start(page)).toHaveValue(moved.toFixed(2))

  // visningsstart flytter bare visningen
  const view = page.locator('[data-md-field="view"]')
  await view.fill('00:00:03')
  await view.press('Enter')
  await expect(view).toHaveValue(/^00:00:0[23]/)
  await expect(start(page)).toHaveValue(moved.toFixed(2))
  await view.fill('tull')
  await view.press('Enter')
  await expect(page.locator('[data-md-field-err="view"]')).toContainText('Ugyldig tid')

  // prosjektvarighet før innholdets slutt: advarsel og sluttmarkering, ingen klipp endres
  const dur = page.locator('[data-md-field="dur"]')
  await dur.fill('00:00:02')
  await dur.press('Enter')
  await expect(page.locator('[data-md-end]')).toHaveCount(1)
  await expect(page.locator('[data-md-dur-warn]')).toBeVisible()
  await expect(page.locator('[data-row="video"] [data-block="clip"]')).toHaveCount(1)
  await expect(start(page)).toHaveValue(moved.toFixed(2))
  await dur.fill('00:10:00')
  await dur.press('Enter')
  await expect(page.locator('[data-md-dur-warn]')).toHaveCount(0)

  // eksporten følger prosjektvarigheten (og sier fra om svart slutt)
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await expect(page.locator('[data-md-exp-len]')).toContainText('10:00.0')
  await expect(page.locator('[data-md-exp-len]')).toContainText('følger prosjektvarigheten')
  await expect(page.locator('[data-md-exp-tail]')).toBeVisible()
  await page.getByRole('button', { name: 'Lukk', exact: true }).click()

  // lagre og last inn: varighet og tider er bevart
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  // etter omlasting åpnes prosjektet direkte igjen (adressen husker det)
  await page.reload()
  await expect(page.locator('[data-md-field="dur"]')).toHaveValue('00:10:00')
  await page.locator('[data-md-fit]').click()
  await ov(page).click()
  await expect(start(page)).toHaveValue(moved.toFixed(2))
})
