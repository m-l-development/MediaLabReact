import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

/**
 * TB-7BF5C1 – Isolate Subject: AI-en skal bli ferdig og ikke laste ned modellen flere ganger (ekte Chrome, ekte
 * modeller fra Hugging Face, ny nettleserprofil per test). Gjør kontrollene fra 2026-10-12 til en permanent test:
 * Objekt (ormbg) fra kald start blir ferdig, hver modellfil hentes én gang, ny åpning henter ingenting på nytt,
 * og Person (MODNet) blir ferdig.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../media-lab/public/images/mockups')
const IMG = fs.readFileSync(path.join(ROOT, 'iphone-hand.jpg'))

function modelRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (r) => { if (/\.onnx(\?|$)|onnx_data/.test(r.url())) urls.push(r.url()) })
  return urls
}
async function run(page: Page, kind: 'Objekt' | 'Person') {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'mobil-i-hand.jpg', mimeType: 'image/jpeg', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  const t0 = Date.now()
  await page.getByRole('button', { name: new RegExp('^' + kind) }).click()
  // ferdig når resultatet kan lastes ned (statusen kan komme litt etter klikket)
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 180_000 })
  return Date.now() - t0
}

test('Objekt: ferdig fra kald start, hver modellfil hentes én gang, ny åpning henter ingenting på nytt', async ({ page }) => {
  test.setTimeout(400_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const urls = modelRequests(page)
  const cold = await run(page, 'Objekt')
  const files = [...new Set(urls)]
  console.log(`Objekt kald start: ${Math.round(cold / 100) / 10} s, modellfiler: ${files.map((u) => u.split('/').slice(-1)[0]).join(', ')}`)
  expect(files.length).toBeGreaterThan(0)
  expect(urls.length).toBe(files.length) // ingen fil hentet to ganger
  const before = urls.length
  const warm = await run(page, 'Objekt') // ny åpning av siden
  console.log(`Objekt ny åpning: ${Math.round(warm / 100) / 10} s, nye modellforespørsler: ${urls.length - before}`)
  expect(urls.length - before).toBe(0)
  await expect(page.getByText(/Klarte ikke|feil/i)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Person: ferdig, én nedlasting', async ({ page }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const urls = modelRequests(page)
  const ms = await run(page, 'Person')
  console.log(`Person: ${Math.round(ms / 100) / 10} s, modellfiler: ${[...new Set(urls)].length}`)
  expect(urls.length).toBe(new Set(urls).size)
  expect(errors).toEqual([])
})
