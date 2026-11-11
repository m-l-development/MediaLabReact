import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * «Fyll med omgivelser» og «Gjør uskarp» i Isolate Subject: to separate valg. Bildet har loddrette striper med en gul
 * «tekst» over. AI-modellen stenges ute (ingen nedlasting i testene), så den innholdsbevisste utfyllingen brukes, og
 * meldingen om det vises. Resultatet leses fra den nedlastede PNG-en: den gule teksten er borte og stripene fortsetter
 * (ikke en uskarp flekk); uskarp gjør bare området uskarpt. Avbryt, Angre og Gjør om gir riktige bilder.
 */
const W = 240, H = 160
const stripe = (x: number) => ((x >> 2) % 2 ? 150 : 50)
const inText = (x: number, y: number) => x >= 80 && x < 160 && y >= 70 && y < 90

async function pixels(page: Page, file: string): Promise<number[]> {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
    const g = c.getContext('2d') as CanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return [...g.getImageData(0, 0, bmp.width, bmp.height).data]
  }, b64)
}

async function exportPng(page: Page, file: string): Promise<number[]> {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const nei = page.getByRole('button', { name: 'Nei takk' })
  if (await nei.isVisible().catch(() => false)) await nei.click()
  return pixels(page, file)
}

/** Andel av tekstområdet som følger stripene (±40), og antall gule piksler. */
function check(d: number[]) {
  let right = 0, n = 0, yellow = 0
  for (let y = 72; y < 88; y++) {
    for (let x = 84; x < 156; x++) {
      const p = (y * W + x) * 4
      const r = d[p] ?? 0, g = d[p + 1] ?? 0, b = d[p + 2] ?? 0
      if (r > 200 && g > 180 && b < 90) yellow++
      if (Math.abs(r - stripe(x)) < 40) right++
      n++
    }
  }
  return { follows: right / n, yellow }
}

async function markText(page: Page, mode: 'Fyll med omgivelser' | 'Gjør uskarp') {
  await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'tekst.png', mimeType: 'image/png', buffer: png(W, H, (x, y) => (inText(x, y) ? [250, 210, 20, 255] : [stripe(x), stripe(x), stripe(x), 255])) })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await page.locator('[data-fill-mode]').getByRole('button', { name: mode, exact: true }).click()
  const canvas = page.locator('main canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('fant ikke lerretet')
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 })
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 5 })
  await page.mouse.up()
  await page.locator('[data-mark-apply]').click()
}

test('Fyll med omgivelser: teksten er borte og stripene fortsetter; Bruk, Angre og Gjør om', async ({ page }, info) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await markText(page, 'Fyll med omgivelser')
  await expect(page.locator('[data-effect="fill"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/AI-modellen kunne ikke lastes/)).toBeVisible()
  const filled = check(await exportPng(page, info.outputPath('fylt.png')))
  expect(filled.yellow).toBe(0)
  expect(filled.follows).toBeGreaterThan(0.8)
  await page.locator('[data-effect-apply]').click()
  await expect(page.locator('[data-effect]')).toHaveCount(0)
  // Angre: originalen (med teksten) er tilbake; Gjør om: resultatet igjen
  await expect(page.locator('[data-redo]')).toBeDisabled()
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  await expect(page.locator('[data-redo]')).toBeEnabled()
  await page.locator('[data-redo]').click()
  const again = check(await exportPng(page, info.outputPath('gjort-om.png')))
  expect(again.yellow).toBe(0)
  expect(errors).toEqual([])
})

test('Gjør uskarp er eget valg: bare området blir uskarpt, styrken virker, Avbryt gir originalen', async ({ page }, info) => {
  test.setTimeout(120_000)
  await markText(page, 'Gjør uskarp')
  await expect(page.locator('[data-effect="blur"]')).toBeVisible()
  await page.locator('[data-blur-strength]').fill('100')
  const d = await exportPng(page, info.outputPath('uskarp.png'))
  // stripene inne i området er visket ut (lite kontrast), langt utenfor er de urørt
  let lo = 255, hi = 0
  for (let x = 110; x < 130; x++) { const v = d[(80 * W + x) * 4] ?? 0; lo = Math.min(lo, v); hi = Math.max(hi, v) }
  expect(hi - lo).toBeLessThan(40)
  expect([d[(10 * W + 3) * 4], d[(10 * W + 4) * 4]]).toEqual([50, 150])
  await page.locator('[data-effect-cancel]').click()
  await expect(page.locator('[data-effect]')).toHaveCount(0)
  await expect(page.locator('[data-redo]')).toBeDisabled()
})
