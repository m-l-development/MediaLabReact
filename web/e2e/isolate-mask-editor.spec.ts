import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Isolate Subject → «Finjuster masken» (felles maskeredigering, shared/mask): pensel med Behold/Fjern og størrelse i
 * bildepiksler (også etter zoom), rektangel, ellipse, lasso, kantfølging, angre/gjør om, inverter, utvid/trekk inn og
 * visning. Alt kontrolleres i den nedlastede PNG-en (det som eksporteres), ikke i knappene.
 * Bildet (400 × 300): hvit bakgrunn, rødt kvadrat 100–300 × 50–250. «Logo» gir masken uten AI (ensfarget bakgrunn).
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'pekerverktøy testes på PC'))

const W = 400
const H = 300
const IMG = png(W, H, (x, y) => (x >= 100 && x < 300 && y >= 50 && y < 250 ? [220, 30, 30, 255] : [255, 255, 255, 255]))

/** Skjermpunkt for et bildepunkt i redigeringen (bildet tilpasses lerretet, 96 %, midtstilt), med gjeldende zoom. */
async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    const s = z?.s ?? Math.min(r.width / 400, r.height / 300) * 0.96
    const ox = z?.ox ?? (r.width - 400 * s) / 2
    const oy = z?.oy ?? (r.height - 300 * s) / 2
    return { x: r.left + ox + px * s, y: r.top + oy + py * s, s }
  }, [x, y] as [number, number])
}
async function drag(page: Page, pts: [number, number][]) {
  const first = await scr(page, ...pts[0]!)
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  for (const p of pts.slice(1)) {
    const q = await scr(page, ...p)
    await page.mouse.move(q.x, q.y, { steps: 6 })
  }
  await page.mouse.up()
}
/** Alfa i den nedlastede PNG-en i bildepunktene. */
async function exported(page: Page, file: string, pts: [number, number][]) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const close = page.getByRole('button', { name: 'Nei takk' })
  if (await close.count()) await close.click()
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, list }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return list.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1)
  }, { data: b64, list: pts })
}

test('maskeredigering: verktøyene endrer den faktiske masken, og eksporten følger', async ({ page }, info) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'kvadrat.png', mimeType: 'image/png', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled()

  // utgangspunkt: kvadratet beholdes, bakgrunnen fjernes
  let a = await exported(page, info.outputPath('0.png'), [[200, 150], [50, 150]])
  expect(a).toEqual([255, 0])

  await page.locator('[data-mask-open]').click()
  await expect(page.locator('[data-mask-canvas]')).toBeVisible()
  // standard: pensel og Behold
  await expect(page.locator('[data-mask-tool="brush"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-mask-keep="1"]')).toHaveAttribute('aria-pressed', 'true')

  // pensel Fjern, 20 px, hard: en vannrett stripe gjennom kvadratet ved y = 150
  await page.locator('[data-mask-keep="0"]').click()
  await page.locator('[data-mask-size]').fill('20')
  await expect(page.locator('[data-mask-size-val]')).toHaveText('20 px')
  await page.locator('[data-mask-hard]').fill('1')
  await drag(page, [[120, 150], [280, 150]])
  // tastene [ og ] endrer størrelsen
  await page.keyboard.press(']')
  await expect(page.locator('[data-mask-size-val]')).toHaveText('24 px')
  await page.keyboard.press('[')
  await expect(page.locator('[data-mask-size-val]')).toHaveText('20 px')

  // zoom 2× (Ctrl + hjul) og en prikk med Behold på bakgrunnen ved (50, 60): radius 10 bildepiksler, ikke 10 skjermpiksler
  await page.locator('[data-mask-keep="1"]').click()
  const c0 = await scr(page, 50, 60)
  await page.mouse.move(c0.x, c0.y)
  await page.keyboard.down('Control')
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120)
  await page.keyboard.up('Control')
  await expect(page.locator('[data-mask-zoom]')).not.toHaveText('Tilpass')
  const z = await scr(page, 50, 60)
  expect(z.s).toBeGreaterThan(c0.s * 1.5)
  await page.mouse.click(z.x, z.y)
  await page.locator('[data-mask-zoom]').click() // tilpass igjen
  await expect(page.locator('[data-mask-zoom]')).toHaveText('Tilpass')

  // rektangel Behold oppe til høyre i bakgrunnen
  await page.locator('[data-mask-tool="rect"]').click()
  await drag(page, [[320, 20], [380, 80]])
  // ellipse Fjern midt i kvadratets nedre del
  await page.locator('[data-mask-tool="ellipse"]').click()
  await page.locator('[data-mask-keep="0"]').click()
  await drag(page, [[180, 190], [220, 230]])
  // lasso Behold: trekant nede til venstre i bakgrunnen
  await page.locator('[data-mask-tool="lasso"]').click()
  await page.locator('[data-mask-keep="1"]').click()
  await drag(page, [[10, 290], [60, 290], [10, 260]])
  // angre lassoen, gjør den om igjen
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+Shift+z')

  // kantfølging: Behold-strøk som starter på det røde nær kanten og går 15 px ut i det hvite: det hvite tas ikke med
  await page.locator('[data-mask-tool="brush"]').click()
  await page.locator('[data-mask-snap]').check()
  await page.locator('[data-mask-keep="0"]').click()
  await drag(page, [[110, 100], [110, 100]]) // lag et hull i det røde nær venstre kant (x 100–120)
  await page.locator('[data-mask-keep="1"]').click()
  await drag(page, [[112, 100], [112, 100]]) // fyll hullet igjen med kantfølging; penselen rekker til x = 102…122 og 2 px ut
  await drag(page, [[105, 120], [85, 120]]) // fra det røde ut i det hvite: bare det røde påvirkes
  await page.locator('[data-mask-snap]').uncheck()

  // visning: originalen med rødt der det er fjernet
  await page.locator('[data-mask-view]').selectOption('original')
  await page.locator('[data-mask-view]').selectOption('checker')

  await page.locator('[data-mask-done]').click()
  await expect(page.locator('[data-mask-canvas]')).toHaveCount(0)
  a = await exported(page, info.outputPath('1.png'), [
    [200, 150], [200, 158], [200, 165], [200, 100], // stripe fjernet (±10), utenfor stripen beholdt
    [50, 60], [50, 72], // prikken (radius 10 bildepiksler)
    [350, 50], [310, 50], // rektangelet
    [200, 210], [150, 210], // ellipsen
    [20, 285], [80, 285], // lassoen
    [110, 100], // hullet fylt igjen
    [90, 120], [100, 120], // kantfølging: det hvite ved siden av ble ikke med; kanten av det røde står
  ])
  expect(a.slice(0, 4), 'stripen er fjernet, resten av kvadratet beholdt').toEqual([0, 0, 255, 255])
  expect(a.slice(4, 6), 'prikken: radius 10 bildepiksler også med zoom').toEqual([255, 0])
  expect(a.slice(6, 8), 'rektangelet').toEqual([255, 0])
  expect(a.slice(8, 10), 'ellipsen').toEqual([0, 255])
  expect(a.slice(10, 12), 'lassoen (angret og gjort om)').toEqual([255, 0])
  expect(a[12], 'hullet er fylt igjen').toBe(255)
  expect(a[13], 'kantfølging: det hvite ble ikke med').toBe(0)
  expect(a[14], 'kanten av det røde står').toBe(255)
  // forhåndsvisningen viser det samme som eksporten (samme punkter i resultatlerretet, uten beskjæring)
  const pts: [number, number][] = [[200, 150], [200, 165], [50, 60], [50, 72], [350, 50], [200, 210], [20, 285], [110, 100], [90, 120]]
  const prev = await page.locator('main canvas').first().evaluate((c: HTMLCanvasElement, list) => {
    const g = c.getContext('2d') as CanvasRenderingContext2D
    return list.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1)
  }, pts)
  const exp = await exported(page, info.outputPath('1b.png'), pts)
  expect(prev, 'forhåndsvisning = eksport').toEqual(exp)

  // inverter og tilbake, utvid / trekk inn
  await page.locator('[data-mask-open]').click()
  await page.locator('[data-mask-invert]').click()
  await page.locator('[data-mask-done]').click()
  a = await exported(page, info.outputPath('2.png'), [[200, 100], [50, 150]])
  expect(a, 'invertert').toEqual([0, 255])
  await page.locator('[data-mask-open]').click()
  await page.locator('[data-mask-invert]').click()
  for (let i = 0; i < 3; i++) await page.locator('[data-mask-grow]').click()
  await page.locator('[data-mask-done]').click()
  a = await exported(page, info.outputPath('3.png'), [[98, 70], [96, 70]])
  expect(a, 'utvidet 3 px (1 px per klikk ved 400 px)').toEqual([255, 0])
  await page.locator('[data-mask-open]').click()
  for (let i = 0; i < 5; i++) await page.locator('[data-mask-shrink]').click()
  // angre i redigeringen (knappen) tar siste innstramming tilbake
  await page.locator('[data-mask-undo]').click()
  await page.locator('[data-mask-done]').click()
  a = await exported(page, info.outputPath('4.png'), [[100, 70], [101, 70], [102, 70]])
  expect(a, 'trukket inn 4 px fra 97: kanten står ved x = 101').toEqual([0, 255, 255])
  expect(errors).toEqual([])
})
