import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Mockups: Backspace/Delete fjerner det valgte objektet (design eller logo), Angre (knapp og Ctrl+Z) går trinnvis
 * tilbake – én draging er ett steg – og tallene ved sliderne kan skrives inn (Enter lagrer, Esc avbryter, grensene
 * holdes, ugyldig tekst endrer ingenting).
 */
const design = () => png(320, 200, (x, y) => (x < 80 && y < 60 ? [20, 40, 230, 255] : [230, 20, 20, 255]))
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#00ff00"/></svg>'
const saved = (page: Page, id: string) => page.evaluate((k) => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')[k] ?? {}, id)
const redCentroid = (page: Page, b64: string | null) => page.evaluate(async (data) => {
  let W: number, H: number, d: Uint8ClampedArray
  if (data) {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0); W = bmp.width; H = bmp.height; d = g.getImageData(0, 0, W, H).data
  } else {
    const c = document.querySelector('[class*="stageCanvas"]') as HTMLCanvasElement
    W = c.width; H = c.height; d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, W, H).data
  }
  let x = 0, y = 0, n = 0
  const step = Math.max(1, Math.round(W / 500))
  for (let j = 0; j < H; j += step) for (let i = 0; i < W; i += step) { const k = (j * W + i) * 4; if ((d[k] ?? 0) > 140 && (d[k + 1] ?? 0) < 90 && (d[k + 2] ?? 0) < 90) { x += i / W; y += j / H; n++ } }
  return { x: x / (n || 1), y: y / (n || 1), n }
}, b64)

async function setup(page: Page, id: string) {
  await page.goto(`/app/mockups?mockup=${id}`)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  await expect(page.locator('[data-mk-undo]')).toBeDisabled() // ingenting å angre ennå
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: design() })
  await expect(page.getByText('design.png')).toBeVisible()
}
/** Midten av designet (snitt av de 8 håndtakene) i redigeringsmodus. */
async function designMid(page: Page) {
  // Håndtakene tegnes etter klikket på «Rediger design»; uten ventingen ble snittet av null håndtak NaN (ustabil test).
  await expect(page.locator('[class*="designHandle"]').first()).toBeVisible()
  const h = await page.locator('[class*="designHandle"]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] }))
  return [h.reduce((s, p) => s + p[0]!, 0) / h.length, h.reduce((s, p) => s + p[1]!, 0) / h.length] as const
}

test('sletting med Backspace/Delete, beskyttede inputfelt og angre etter sletting', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'tastatur og peker testes på desktop')
  test.setTimeout(150_000)
  await setup(page, 'tv-wall')
  const lc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo' }).click()
  await (await lc).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) })
  const logo = page.locator('[data-mk-logo]')
  await expect(logo).toBeVisible()

  // ingenting valgt: Backspace gjør ingenting
  await page.locator('body').press('Backspace')
  await expect(page.getByText('design.png')).toBeVisible()
  await expect(logo).toBeVisible()

  // designet valgt, men et tallfelt redigeres: Backspace sletter bare tekst i feltet
  await page.locator('[data-mk-design-edit]').click()
  const m = await designMid(page)
  await page.mouse.click(m[0], m[1])
  await page.getByRole('button', { name: /^Zoom:/ }).click()
  const field = page.getByRole('textbox', { name: 'Zoom' })
  await expect(field).toBeFocused()
  await field.press('Backspace')
  await field.press('Escape')
  await expect(page.getByText('design.png')).toBeVisible()

  // designet valgt: Delete fjerner det; Angre (knapp) henter det tilbake med samme plassering
  await page.mouse.click(m[0], m[1])
  const before = await redCentroid(page, null)
  await page.keyboard.press('Delete')
  await expect(page.getByText('Ingen design valgt ennå')).toBeVisible()
  await expect(page.locator('[data-mk-design]')).toHaveCount(0) // utvalget er borte
  await expect(page.locator('[data-mk-undo]')).toBeEnabled()
  await page.locator('[data-mk-undo]').click()
  await expect(page.getByText('design.png')).toBeVisible()
  await page.waitForTimeout(500)
  const after = await redCentroid(page, null)
  expect(after.n).toBeGreaterThan(100)
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeLessThan(0.005)

  // logoen valgt: Backspace fjerner den; Ctrl+Z henter den tilbake
  await logo.click()
  await logo.press('Backspace')
  await expect(logo).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-mk-logo]')).toBeVisible()
})

test('angre trinnvis: én draging er ett steg, separate endringer hver sitt; andre mockups røres ikke; forhåndsvisning = eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'tastatur og peker testes på desktop')
  test.setTimeout(150_000)
  // en annen mockup har egne innstillinger som ikke skal røres
  await page.goto('/app/mockups')
  await page.evaluate(() => localStorage.setItem('mockups.settings', JSON.stringify({ 'imac-desk': { zoom: 1.7 } })))
  await setup(page, 'tv-wall')
  await page.getByRole('button', { name: 'Vis hele' }).click() // steg 1
  await page.locator('[data-mk-design-edit]').click()
  const wrap = (await page.locator('[data-mk-wrap]').boundingBox())!
  const drag = async (dx: number) => {
    const m = await designMid(page)
    await page.mouse.move(m[0], m[1])
    await page.mouse.down()
    // mange små bevegelser i samme draging
    for (let i = 1; i <= 8; i++) await page.mouse.move(m[0] + (dx * wrap.width * i) / 8, m[1], { steps: 2 })
    await page.mouse.up()
  }
  await drag(0.08) // steg 2
  const a = (await saved(page, 'tv-wall')).ox
  await drag(0.06) // steg 3 (rett etter – likevel eget steg)
  const b = (await saved(page, 'tv-wall')).ox
  expect(b).toBeGreaterThan(a)
  await page.getByRole('button', { name: 'Roter 90° mot høyre' }).click() // steg 4
  expect((await saved(page, 'tv-wall')).rot).toBe(90)

  await page.keyboard.press('Control+z') // angrer rotasjonen
  expect((await saved(page, 'tv-wall')).rot ?? 0).toBe(0)
  expect((await saved(page, 'tv-wall')).ox).toBeCloseTo(b, 9)
  await page.locator('[data-mk-undo]').click() // angrer hele den andre dragingen på én gang
  expect((await saved(page, 'tv-wall')).ox).toBeCloseTo(a, 9)
  await page.locator('[data-mk-undo]').click() // angrer den første dragingen
  expect((await saved(page, 'tv-wall')).ox ?? 0).toBeCloseTo(0, 9)
  expect((await saved(page, 'tv-wall')).fit).toBe('contain')
  await page.locator('[data-mk-undo]').click() // angrer «Vis hele»
  expect((await saved(page, 'tv-wall')).fit ?? 'cover').toBe('cover')
  expect((await saved(page, 'imac-desk')).zoom).toBe(1.7) // andre mockups er urørt

  // etter angring: forhåndsvisning og eksport samsvarer
  await drag(0.05)
  await page.waitForTimeout(500)
  const pre = await redCentroid(page, null)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const ex = await redCentroid(page, fs.readFileSync(await (await dl).path()).toString('base64'))
  expect(Math.abs(ex.x - pre.x)).toBeLessThan(0.01)
  expect(Math.abs(ex.y - pre.y)).toBeLessThan(0.01)
})

test('skriv inn sliderverdier: Enter lagrer, grensene holdes, Esc avbryter, ugyldig tekst endrer ingenting', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'tastatur testes på desktop')
  test.setTimeout(120_000)
  await setup(page, 'tv-wall')
  const type = async (name: RegExp, label: string, text: string, key: 'Enter' | 'Escape' = 'Enter') => {
    await page.getByRole('button', { name }).click()
    const f = page.getByRole('textbox', { name: label })
    await f.fill(text)
    await f.press(key)
  }
  await type(/^Zoom:/, 'Zoom', '150')
  expect((await saved(page, 'tv-wall')).zoom).toBeCloseTo(1.5, 9)
  await expect(page.getByRole('slider', { name: /Zoom/ })).toHaveValue('1.5') // slideren følger med
  await type(/^Zoom:/, 'Zoom', '99999')
  expect((await saved(page, 'tv-wall')).zoom).toBe(6) // maks
  await type(/^Zoom:/, 'Zoom', '-5')
  expect((await saved(page, 'tv-wall')).zoom).toBe(0.1) // min
  // ugyldig eller tomt: en beskjed, feltet blir stående til Escape, verdien er uendret
  for (const bad of ['abc', '']) {
    await type(/^Zoom:/, 'Zoom', bad)
    await expect(page.getByRole('alert').filter({ hasText: 'Skriv et tall' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Zoom' }).press('Escape')
    expect((await saved(page, 'tv-wall')).zoom).toBe(0.1)
  }
  await type(/^Zoom:/, 'Zoom', '200', 'Escape')
  expect((await saved(page, 'tv-wall')).zoom).toBe(0.1) // Esc avbryter
  await expect(page.getByText('design.png')).toBeVisible() // Esc i feltet går ikke til galleriet
  await type(/^Rotasjon:/, 'Rotasjon', '45,6')
  expect((await saved(page, 'tv-wall')).rot).toBe(46) // grader, avrundet
  await expect(page.getByRole('button', { name: /^Rotasjon:/ })).toHaveText('46°')
  await type(/^Flytt vannrett:/, 'Flytt vannrett', '12')
  expect((await saved(page, 'tv-wall')).ox).toBeCloseTo(0.12, 9)
  // hver innskrevet verdi er ett angresteg
  await page.locator('[data-mk-undo]').click()
  expect((await saved(page, 'tv-wall')).ox ?? 0).toBeCloseTo(0, 9)
  expect((await saved(page, 'tv-wall')).rot).toBe(46)
})
