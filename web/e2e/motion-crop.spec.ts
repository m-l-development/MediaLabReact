import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Motion: beskjæring av et overlegg ved å dra i kantene (meldt som ødelagt to ganger). Beskjær åpnes fra høyremenyen
 * i forhåndsvisningen; venstre kant dras innover → beskjæringen (Venstre) øker, bildet forsvinner til venstre for den
 * nye kanten, og Esc går tilbake til vanlig flytting med beskjæringen beholdt.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

/** Farge i forhåndsvisningen ved (fx, fy) som andel av bredde/høyde. */
const px = (page: Page, fx: number, fy: number) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement, [x, y]) => Array.from(c.getContext('2d')!.getImageData(Math.round(c.width * x!), Math.round(c.height * y!), 1, 1).data), [fx, fy])

test('overlegg: Beskjær fra høyremenyen, dra venstre kant innover', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'mus og høyreklikk (PC)')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="sq"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Last opp video, bilder eller lyd' }).click()
  // blått bakgrunnsklipp og et rødt overlegg
  await (await chooser).setFiles([{ name: 'bla.png', mimeType: 'image/png', buffer: png(200, 200, () => [20, 40, 200, 255]) }, { name: 'rod.png', mimeType: 'image/png', buffer: png(200, 200, () => [230, 20, 20, 255]) }])
  await expect(page.locator('[data-media="image"]')).toHaveCount(2)
  await page.locator('[data-media="image"]').nth(0).getByRole('button', { name: 'Legg til' }).click()
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1)
  await page.locator('[data-media="image"]').nth(1).getByRole('button', { name: 'Overlegg' }).click()
  await expect(page.locator('[data-block="ov"]')).toHaveCount(1)
  // overlegget toner inn: spillehodet til 1 s. Overlegget: 36 % av bredden, x 0,54–0,90, y 0,52–0,88
  await page.locator('[data-md-canvas]').focus()
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await px(page, 0.57, 0.7))[0]).toBeGreaterThan(180)
  const box = (await page.locator('[data-md-canvas]').boundingBox())!
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy })
  await page.mouse.click(at(0.72, 0.7).x, at(0.72, 0.7).y, { button: 'right' })
  await page.getByRole('menuitem', { name: 'Beskjær' }).click()
  await expect(page.getByText(/Beskjær: dra i kantene/)).toBeVisible()
  // dra venstre kant innover
  await page.mouse.move(at(0.54, 0.7).x, at(0.54, 0.7).y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(at(0.54 + 0.01 * i, 0.7).x, at(0.54, 0.7).y)
  await page.mouse.up()
  // bildet er borte til venstre for den nye kanten (bakgrunnen synes), men står igjen til høyre
  await expect.poll(async () => (await px(page, 0.57, 0.7))[0]).toBeLessThan(80)
  expect((await px(page, 0.8, 0.7))[0]).toBeGreaterThan(180)
  // verdien i panelet (seksjonen «Beskjær»)
  await page.locator('[data-md-props]').getByRole('button', { name: /Beskjær/i }).click()
  const left = page.locator('[data-md-props]').getByRole('slider', { name: 'Venstre' })
  await expect.poll(async () => Number(await left.inputValue())).toBeGreaterThan(0.15)
  // Esc: tilbake til flytting, beskjæringen beholdes
  await page.keyboard.press('Escape')
  expect(Number(await left.inputValue())).toBeGreaterThan(0.15)
  expect(errors).toEqual([])
})
