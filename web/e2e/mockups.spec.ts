import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/** Et helt rødt design, så vi kan se det i skjermen på mockupen. */
const redDesign = () => png(320, 200, () => [230, 20, 20, 255])

async function uploadDesign(page: Page) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await chooser).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: redDesign() })
}

/** Andel røde piksler i et bilde (fra fil). */
async function redShare(page: Page, file: string): Promise<{ w: number; h: number; red: number }> {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let red = 0
    for (let i = 0; i < d.length; i += 16) if ((d[i] ?? 0) > 150 && (d[i + 1] ?? 0) < 90 && (d[i + 2] ?? 0) < 90) red++
    return { w: bmp.width, h: bmp.height, red: red / (d.length / 16) }
  }, b64)
}

test('galleri med de innebygde mockupene, kategorier og design i alle', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/mockups')
  await expect(page.getByRole('heading', { level: 1, name: 'Mockups' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Media Lab/ })).toHaveAttribute('href', '/app/')
  await expect(page.locator('main li').first()).toBeVisible()
  expect(await page.locator('main li').count()).toBeGreaterThanOrEqual(12)
  await page.getByRole('button', { name: /^Mobil/ }).click()
  const phones = await page.locator('main li').count()
  expect(phones).toBeGreaterThanOrEqual(3)
  await page.getByRole('button', { name: /^Alle/ }).click()
  await uploadDesign(page)
  await expect(page.getByText('Designet er lagt inn i alle mockupene. Velg den du vil bruke.')).toBeVisible()
  expect(errors).toEqual([])
})

test('åpne en mockup, juster, eksporter i full oppløsning med designet i skjermen', async ({ page }, info) => {
  test.slow() // eksport i full oppløsning (1600×2400) med maske og lys
  await page.goto('/app/mockups')
  await uploadDesign(page)
  await page.getByRole('button', { name: /Imac Desk|iMac på skrivebord/ }).click()
  await expect(page).toHaveURL(/mockup=imac-desk/)
  await expect(page.getByRole('button', { name: /Alle mockups/ })).toBeVisible()

  // Innstillinger lagres per mockup under samme nøkkel som dagens app.
  await page.getByRole('button', { name: 'Vis hele' }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}'))
  expect(saved['imac-desk']?.fit).toBe('contain')
  await page.getByRole('button', { name: 'Fyll skjermen' }).click()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const file = info.outputPath('mockup.png')
  await (await dl).saveAs(file)
  const r = await redShare(page, file)
  expect(r.w).toBeGreaterThan(1000)
  expect(r.red).toBeGreaterThan(0.05)

  // Piltaster bytter mockup, Esc går tilbake til galleriet.
  await page.keyboard.press('ArrowRight')
  await expect(page).not.toHaveURL(/mockup=imac-desk/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { level: 1, name: 'Mockups' })).toBeVisible()
})

test('juster hjørnene, finn automatisk og tilbakestill', async ({ page }) => {
  await page.goto('/app/mockups?mockup=tv-wall')
  await page.getByRole('button', { name: 'Juster hjørnene' }).click()
  const handle = page.getByRole('button', { name: 'Øverst til venstre' })
  await handle.scrollIntoViewIfNeeded()
  await expect(handle).toBeVisible()
  const b = await handle.boundingBox()
  if (!b) throw new Error('fant ikke håndtaket')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + 40, b.y + 30, { steps: 4 })
  await page.mouse.up()
  const corners = await page.evaluate(() => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')['tv-wall']?.corners)
  expect(Array.isArray(corners) && corners.length === 4).toBe(true)
  await page.getByRole('button', { name: 'Tilbakestill' }).click()
  const reset = await page.evaluate(() => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')['tv-wall']?.corners)
  expect(reset).toBeNull()
})

test('egne mockup-bilder og lagring av resultatet i Dine medier', async ({ page }) => {
  await page.goto('/app/mockups')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Legg til egne mockup-bilder/ }).click()
  await (await chooser).setFiles({ name: 'iphone-min.png', mimeType: 'image/png', buffer: png(300, 200, (x, y) => (x > 80 && x < 220 && y > 40 && y < 160 ? [250, 250, 250, 255] : [90, 90, 90, 255])) })
  await expect(page.getByText('1 mockup-bilde(r) lagt til.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Iphone Min/ })).toBeVisible()

  await uploadDesign(page)
  await page.getByRole('button', { name: /Iphone Min/ }).click()
  await page.getByRole('button', { name: 'Lagre i Dine medier' }).click()
  await expect(page.getByText('Mockupen er lagret i Dine medier.')).toBeVisible()
  await page.goto('/app/medier')
  const item = page.locator('li', { hasText: /mockup-own-/ })
  await expect(item).toBeVisible()
  await expect(item.getByText('Ny versjon')).toBeVisible()
})
