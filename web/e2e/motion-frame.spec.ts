import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { framesAt } from './media-probe'
import { importFiles, isColor, newAdvProject, saveAndReload, seekTo, solid } from './motion-helpers'

/**
 * Bilde-i-bilde som redigerbar form: en ramme legges til, får fyllfarge, bytter inn et bilde (fyller rammen, samme
 * plassering og størrelse), lagres med prosjektet og eksporteres likt forhåndsvisningen.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })
const at = (page: Page, fx: number, fy: number) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement, [x, y]: number[]) => {
  const d = c.getContext('2d')!.getImageData(Math.round(c.width * x!), Math.round(c.height * y!), 1, 1).data
  return [d[0]!, d[1]!, d[2]!]
}, [fx, fy])
const near = (c: number[], r: number, g: number, b: number) => Math.abs(c[0]! - r) + Math.abs(c[1]! - g) + Math.abs(c[2]! - b) < 60

test('ramme: legg til, fyllfarge, bytt inn bilde (fyller rammen), lagres og eksporteres likt', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  await importFiles(page, [solid('rod.png', [220, 30, 30])], 1)
  await page.locator('[data-md-add-frame]').click()
  await seekTo(page, 1)
  const P = page.locator('[data-md-props]')
  const sec = P.getByRole('button', { name: 'Ramme (bilde-i-bilde)' }).first()
  if ((await sec.getAttribute('aria-expanded')) === 'false') await sec.click()
  await P.locator('label', { hasText: 'Fyllfarge' }).locator('input[type="color"]').fill('#22aa44')
  await expect.poll(async () => near(await at(page, 0.5, 0.5), 0x22, 0xaa, 0x44), { message: 'grønn ramme i midten' }).toBe(true)
  // utenfor rammen: bakgrunnen (svart)
  expect(near(await at(page, 0.15, 0.5), 0, 0, 0)).toBe(true)
  // bytt inn bilde: rammen fylles, samme plassering og størrelse
  await P.getByRole('button', { name: 'Bytt inn bilde eller video' }).click()
  await expect(page.locator('[data-md-bin-item="rod.png"] [data-md-use]')).toBeVisible()
  await page.locator('[data-md-bin-item="rod.png"] [data-md-use]').click()
  await expect.poll(async () => isColor(await at(page, 0.5, 0.5), 0), { message: 'rødt bilde i rammen' }).toBe(true)
  expect(isColor(await at(page, 0.65, 0.5), 0)).toBe(true)
  expect(near(await at(page, 0.15, 0.5), 0, 0, 0)).toBe(true)
  await saveAndReload(page)
  await seekTo(page, 1)
  await expect.poll(async () => isColor(await at(page, 0.5, 0.5), 0), { message: 'etter gjenåpning' }).toBe(true)
  // eksport: samme bilde som forhåndsvisningen
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-range="custom"]').click()
  await page.locator('[data-md-field="exp-from"]').fill('00:00:00')
  await page.locator('[data-md-field="exp-from"]').press('Enter')
  await page.locator('[data-md-field="exp-to"]').fill('00:00:02')
  await page.locator('[data-md-field="exp-to"]').press('Enter')
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const buf = fs.readFileSync(await (await dl).path())
  const px = (await framesAt(page, buf, [1.02])).px[0]!
  expect(isColor(px, 0), `rødt i midten av eksporten (${px})`).toBe(true)
  expect(errors).toEqual([])
})
