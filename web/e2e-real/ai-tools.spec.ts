import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Pensel på masken (Photo Design, PD-10), grønn «Behold», flere punkter, fjerne et merke og «Fyll med omgivelser»
 * (Isolate Subject, IS-06/IS-07) med ekte SlimSAM- og ormbg-modeller. Bildet: hånd som holder en mobil.
 */
const PHOTO = fs.readFileSync(new URL('../../media-lab/public/images/mockups/iphone-hand.jpg', import.meta.url))
// Andeler av bildet (1600×2400): midt på mobilskjermen, på hånden, bakgrunn
const SCREEN: [number, number] = [0.58, 0.3]
const SCREEN2: [number, number] = [0.58, 0.55]
const SCREEN3: [number, number] = [0.6, 0.42]
const HAND: [number, number] = [0.28, 0.62]
const BG: [number, number] = [0.12, 0.12]

async function pngAlpha(page: Page, file: string, pts: [number, number][]) {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, points }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return points.map(([x, y]) => Array.from(g.getImageData(Math.floor(x * bmp.width), Math.floor(y * bmp.height), 1, 1).data))
  }, { data: b64, points: pts })
}

async function openMark(page: Page) {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'mobil.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
}
async function clickAt(page: Page, [x, y]: [number, number]) {
  const box = await page.locator('main canvas').first().boundingBox()
  if (!box) throw new Error('fant ikke lerretet')
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}
const removeBtn = (page: Page) => page.getByRole('button', { name: 'Fjern', exact: true }).last()
async function applyAndDownload(page: Page, file: string) {
  await removeBtn(page).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 240_000 })
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const close = page.getByRole('button', { name: 'Nei takk' })
  if (await close.count()) await close.click()
}

test('SlimSAM: rød på mobilen + grønn «Behold» på hånden → mobilen fjernes, hånden og bakgrunnen blir', async ({ page }, info) => {
  await openMark(page)
  await page.getByRole('button', { name: 'Gjennomsiktig', exact: true }).first().click()
  await clickAt(page, SCREEN)
  await page.getByRole('button', { name: 'Behold', exact: true }).click()
  await clickAt(page, HAND)
  const file = info.outputPath('behold.png')
  await applyAndDownload(page, file)
  const [screen, hand, bg] = await pngAlpha(page, file, [SCREEN, HAND, BG])
  expect(screen?.[3], 'mobilskjermen fjernet').toBe(0)
  expect(hand?.[3], 'hånden (grønn) beholdt').toBe(255)
  expect(bg?.[3], 'bakgrunnen urørt').toBe(255)
})

test('SlimSAM: tre punkter på samme objekt fjerner hele objektet; trykk på et rødt merke fjerner merket', async ({ page }, info) => {
  await openMark(page)
  await page.getByRole('button', { name: 'Gjennomsiktig', exact: true }).first().click()
  // ett punkt, så trykk på det samme stedet igjen: merket forsvinner og «Fjern» blir sperret
  await clickAt(page, BG)
  await expect(removeBtn(page)).toBeEnabled()
  await clickAt(page, BG)
  await expect(removeBtn(page)).toBeDisabled({ timeout: 30_000 })
  // tre punkter på mobilen
  for (const p of [SCREEN, SCREEN2, SCREEN3]) await clickAt(page, p)
  const file = info.outputPath('tre-punkter.png')
  await applyAndDownload(page, file)
  const [a, b, c, bg] = await pngAlpha(page, file, [SCREEN, SCREEN2, SCREEN3, BG])
  expect([a?.[3], b?.[3], c?.[3]], 'alle tre punktene fjernet').toEqual([0, 0, 0])
  expect(bg?.[3], 'bakgrunnen urørt').toBe(255)
})

test('SlimSAM: «Fyll med omgivelser» fyller hullet i stedet for gjennomsiktig', async ({ page }, info) => {
  await openMark(page)
  await page.getByRole('button', { name: 'Fyll med omgivelser' }).click()
  await clickAt(page, SCREEN)
  const file = info.outputPath('fyll.png')
  await applyAndDownload(page, file)
  const [screen, bg] = await pngAlpha(page, file, [SCREEN, BG])
  expect(screen?.[3], 'ingen gjennomsiktighet').toBe(255)
  // mobilskjermen var nesten hvit; etter utfylling er den farget av omgivelsene (mørkere)
  expect((screen?.[0] ?? 255) + (screen?.[1] ?? 255) + (screen?.[2] ?? 255), 'skjermen er fylt med omgivelser').toBeLessThan(600)
  expect(bg?.[3]).toBe(255)
})

test('Photo Design: pensel «Fjern» skjuler bildet der det males, «Gjenopprett» henter det tilbake', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await chooser).setFiles({ name: 'mobil.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.locator('[data-layer]').filter({ hasText: 'mobil' }).first().click()
  await page.getByRole('button', { name: 'Motiv', exact: true }).click()
  await page.getByRole('button', { name: 'Mal på masken' }).click()
  await page.getByRole('button', { name: 'Fjern', exact: true }).click()
  const canvas = page.locator('[data-pd-view="edit"] canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('fant ikke lerretet')
  // midt på mobilskjermen (lys) – bakgrunnen bak bildet er mørk (#111)
  const px = () => canvas.evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext('2d') as CanvasRenderingContext2D
    const d = g.getImageData(Math.floor(c.width * 0.6), Math.floor(c.height * 0.35), 1, 1).data
    return (d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0)
  })
  const before = await px()
  const stroke = async () => {
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.35)
    await page.mouse.down()
    for (let i = 0; i <= 10; i++) await page.mouse.move(box.x + box.width * (0.45 + i * 0.03), box.y + box.height * 0.35)
    await page.mouse.up()
    await page.waitForTimeout(400)
  }
  await stroke()
  const erased = await px()
  await page.getByRole('button', { name: 'Gjenopprett', exact: true }).click()
  await stroke()
  const restored = await px()
  expect(before, 'mobilskjermen er lys før').toBeGreaterThan(500)
  expect(erased, 'malt bort: bakgrunnen (mørk) vises').toBeLessThan(150)
  expect(restored, 'gjenopprettet: lyst igjen').toBeGreaterThan(500)
  await page.getByRole('button', { name: 'Ferdig med penselen' }).click()
})
