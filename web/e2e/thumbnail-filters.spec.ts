import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/**
 * Bildefiltre F01–F13 i Thumbnail Studio (docs/maler-og-fonter.md, fase 2): legges til på et bildelag, tegnes på
 * lerretet, kan slås av/på, flyttes og fjernes, lagres med malen og er med i eksporten. Originalbildet endres ikke.
 */
const GREEN: [number, number, number] = [20, 200, 40]
const IMG = png(400, 300, () => [...GREEN, 255])

/** Andelen grønne piksler (bildets farge) i lerretet eller en nedlastet fil. */
async function greenShare(page: Page, file?: string): Promise<number> {
  const data = file ? fs.readFileSync(file).toString('base64') : null
  return page.evaluate(async ({ data, rgb }) => {
    let src: CanvasImageSource
    let w: number, h: number
    if (data) {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
      src = bmp; w = bmp.width; h = bmp.height
    } else {
      const cv = document.querySelector('[data-ts-canvas]') as HTMLCanvasElement
      src = cv; w = cv.width; h = cv.height
    }
    const c = new OffscreenCanvas(w, h)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(src, 0, 0)
    const d = g.getImageData(0, 0, w, h).data
    let n = 0
    for (let i = 0; i < d.length; i += 64) if (Math.abs((d[i] ?? 0) - rgb[0]) < 40 && Math.abs((d[i + 1] ?? 0) - rgb[1]) < 40 && Math.abs((d[i + 2] ?? 0) - rgb[2]) < 40) n++
    return n / (d.length / 64)
  }, { data, rgb: GREEN })
}

const heads = (page: Page) => page.locator('[class*="ctrlHead"]')
const addFilter = (page: Page, id: string) => page.getByRole('combobox', { name: 'Legg til filter …' }).selectOption(id)

test('PC: filtre på et bildelag – tegnes, av/på, rekkefølge, lagres og eksporteres', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC (mobil: egen test)')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'g.png', mimeType: 'image/png', buffer: IMG })
  await expect(page.locator('[data-ts-sel]')).toBeVisible()
  await expect(page.getByText('Ingen filtre på bildet.', { exact: false })).toBeVisible()
  await expect.poll(() => greenShare(page)).toBeGreaterThan(0.05)
  const before = await greenShare(page)

  // F06 svart-hvitt: det grønne forsvinner fra lerretet
  await addFilter(page, 'F06')
  await expect(heads(page).filter({ hasText: 'Svart-hvitt' })).toHaveCount(1)
  await expect.poll(() => greenShare(page)).toBeLessThan(0.005)
  // av: bildet er som før (originalen er urørt); på igjen
  await page.getByRole('button', { name: 'Slå av' }).click()
  await expect.poll(() => greenShare(page)).toBeCloseTo(before, 2)
  await page.getByRole('button', { name: 'Slå på' }).click()
  await expect.poll(() => greenShare(page)).toBeLessThan(0.005)

  // F04 fargelag og F10 korn; flytt kornet øverst
  await addFilter(page, 'F04')
  await addFilter(page, 'F10')
  const order = async () => (await heads(page).allInnerTexts()).filter((t) => ['Svart-hvitt', 'Fargelag', 'Korn'].includes(t.trim()))
  await expect.poll(order).toEqual(['Svart-hvitt', 'Fargelag', 'Korn'])
  await page.getByRole('button', { name: 'Flytt opp' }).nth(2).click()
  await page.getByRole('button', { name: 'Flytt opp' }).nth(1).click()
  await expect.poll(order).toEqual(['Korn', 'Svart-hvitt', 'Fargelag'])
  // fjern fargelaget
  await page.getByRole('button', { name: 'Fjern filteret' }).nth(2).click()
  await expect.poll(order).toEqual(['Korn', 'Svart-hvitt'])

  // lagre, last inn på nytt: filtrene er der i samme rekkefølge
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  const layers = page.locator('[data-layer]')
  await expect(layers.first()).toBeVisible()
  for (let i = 0; i < (await layers.count()); i++) {
    await layers.nth(i).click()
    if (await page.getByRole('combobox', { name: 'Legg til filter …' }).count()) break
  }
  await expect.poll(order).toEqual(['Korn', 'Svart-hvitt'])
  await expect.poll(() => greenShare(page)).toBeLessThan(0.005)

  // eksporten har filtrene
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  const file = info.outputPath('filtre.png')
  await (await dl).saveAs(file)
  expect(await greenShare(page, file)).toBeLessThan(0.005)
  expect(errors).toEqual([])
})

test('mobil: filter på personbildet i Rediger-skuffen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'mobil')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await dock(page, 'edit')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await ch).setFiles({ name: 'p.png', mimeType: 'image/png', buffer: png(200, 300, () => [...GREEN, 255]) })
  await expect.poll(() => greenShare(page)).toBeGreaterThan(0.01)
  // velg personlaget i laglisten, og legg til filteret i Rediger
  await dock(page, 'layers')
  await page.locator('[data-layer]').filter({ hasText: 'Person' }).first().click()
  await dock(page, 'edit')
  await addFilter(page, 'F06')
  await expect(heads(page).filter({ hasText: 'Svart-hvitt' })).toHaveCount(1)
  await expect.poll(() => greenShare(page)).toBeLessThan(0.002)
  expect(errors).toEqual([])
})

test('PC: hvert av de 13 filtrene endrer bildet, og fjerning gir originalen tilbake', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  // striper og forløp, så også uskarphet og korn synes
  await (await ch).setFiles({ name: 's.png', mimeType: 'image/png', buffer: png(400, 300, (x, y) => (x % 20 < 10 ? [200, 120 + (y % 60), 60, 255] : [40, 90, 160 + (x % 80), 255])) })
  await expect(page.locator('[data-ts-sel]')).toBeVisible()
  const sig = () => page.evaluate(() => {
    const cv = document.querySelector('[data-ts-canvas]') as HTMLCanvasElement
    const d = (cv.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, cv.width, cv.height).data
    let a = 0
    for (let i = 0; i < d.length; i += 4 * 7) a = (a * 31 + (d[i] ?? 0) + (d[i + 1] ?? 0) * 3 + (d[i + 2] ?? 0) * 7) >>> 0
    return a
  })
  await page.waitForTimeout(300)
  const orig = await sig()
  for (const id of ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13']) {
    await addFilter(page, id)
    await expect.poll(sig, { message: id }).not.toBe(orig)
    await page.getByRole('button', { name: 'Fjern filteret' }).click()
    await expect.poll(sig, { message: id + ' fjernet' }).toBe(orig)
  }
  expect(errors).toEqual([])
})
