import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { logoPng } from './png'

/** Leser alfa-verdien i gitte punkter (andeler) av en PNG i nettleseren. */
async function alphaAt(page: Page, file: string, points: [number, number][]): Promise<{ w: number; h: number; a: number[] }> {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ b64, points }) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
    const bmp = await createImageBitmap(blob)
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    return { w: bmp.width, h: bmp.height, a: points.map(([x, y]) => d[(Math.floor(y * bmp.height) * bmp.width + Math.floor(x * bmp.width)) * 4 + 3] ?? -1) }
  }, { b64, points })
}

async function upload(page: Page) {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logoPng() })
  await expect(page.getByText('Beskjær bildet', { exact: true })).toBeVisible()
}

test('Logo: fargenøkkel → gjennomsiktig PNG i full oppløsning, motivet uendret', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await upload(page)
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(page.getByText('Fjerner bakgrunnsfargen. Ingen AI-modell trengs.')).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('logo-isolert.png')
  await (await dl).saveAs(file)
  const r = await alphaAt(page, file, [[0.02, 0.02], [0.5, 0.5], [0.9, 0.9]])
  expect(r.w).toBe(240)
  expect(r.h).toBe(160)
  expect(r.a).toEqual([0, 255, 0])
  await expect(page.getByRole('heading', { name: 'Bildet er lastet ned' })).toBeVisible()
  await page.getByRole('button', { name: 'Nei takk' }).click()
  expect(errors).toEqual([])
})

test('Beskjær til motivet og farget bakgrunn', async ({ page }, info) => {
  await upload(page)
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await page.getByRole('button', { name: /Beskjær til motivet/ }).click()
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  await page.getByRole('button', { name: 'Svart' }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('beskaaret.png')
  await (await dl).saveAs(file)
  const r = await alphaAt(page, file, [[0.01, 0.01], [0.5, 0.5]])
  // Motivet er 72×64 px; med 4 % luft blir resultatet litt større, og hele flaten er dekket (farget bakgrunn).
  expect(r.w).toBeGreaterThanOrEqual(72)
  expect(r.w).toBeLessThan(90)
  expect(r.a).toEqual([255, 255])
})

test('Merk i bildet uten AI: firkant over objektet → fjernet (gjennomsiktig), angre gir det tilbake', async ({ page }, info) => {
  await upload(page)
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await page.getByRole('button', { name: 'Gjennomsiktig', exact: true }).first().click()
  const canvas = page.locator('main canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('fant ikke lerretet')
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.25)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 })
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.75, { steps: 5 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Fjern', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('fjernet.png')
  await (await dl).saveAs(file)
  const r = await alphaAt(page, file, [[0.5, 0.5], [0.05, 0.05]])
  expect(r.a).toEqual([0, 255])
  await page.getByRole('button', { name: 'Nei takk' }).click()
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeDisabled()
})

test('Lagre i Dine medier: originalen og den nye versjonen, uten ny opplasting i neste verktøy', async ({ page }) => {
  await upload(page)
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await page.getByRole('button', { name: 'Lagre i Dine medier' }).click()
  await expect(page.getByText('Lagret i Dine medier som ny versjon. Originalen er uendret.')).toBeVisible()
  await page.goto('/app/medier')
  await expect(page.locator('li', { hasText: 'logo.png' })).toBeVisible()
  const derived = page.locator('li', { hasText: 'logo-isolert.png' })
  await expect(derived).toBeVisible()
  await expect(derived.getByText('Ny versjon')).toBeVisible()
  // Åpne originalen i Isolate Subject direkte fra biblioteket (?asset=…)
  await page.locator('li', { hasText: 'logo.png' }).first().getByRole('button', { name: /Åpne i Isolate Subject/ }).click()
  await expect(page).toHaveURL(/\/app\/isolate-subject\?asset=/)
  await expect(page.getByText('Beskjær bildet', { exact: true })).toBeVisible()
})
