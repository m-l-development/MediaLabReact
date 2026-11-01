import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Isolate Subject → «Finjuster masken» rett etter opplasting (ingen type valgt): bildet vises i redigereren (før: tom
 * maske = bare rutemønster), også når verktøyet byttes; «Ferdig» uten endringer gir hele bildet. Flytting og zoom med
 * mus, styreflate, mellomrom, midtknapp og to fingre endrer visningen uten å tegne (Fjern er valgt, så et utilsiktet
 * strøk ville synes i eksporten).
 */
test.skip(({ isMobile }) => isMobile, 'maskeredigering testes på PC')

const W = 400
const H = 300
// blå bakgrunn med en oransje skive i midten: skiller seg fra rutemønsteret (hvitt/grått)
const IMG = png(W, H, (x, y) => (Math.hypot(x - 200, y - 150) < 70 ? [210, 110, 30, 255] : [40, 80, 170, 255]))

async function openDirect(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'skive.png', mimeType: 'image/png', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  // rett til «Finjuster masken», uten å velge Person/Objekt/Logo/Tekst
  await page.locator('[data-mask-open]').click()
  await expect(page.locator('[data-mask-canvas]')).toBeVisible()
}

type View = { s: number; ox: number; oy: number; left: number; top: number }
const viewOf = (page: Page): Promise<View> => page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement & { mlMaskView?: { s: number; ox: number; oy: number } }) => {
  const r = c.getBoundingClientRect()
  const v = c.mlMaskView ?? { s: 0, ox: 0, oy: 0 }
  return { ...v, left: r.left, top: r.top }
})
/** Skjermpunktet for et bildepunkt. */
const scr = async (page: Page, x: number, y: number) => {
  const v = await viewOf(page)
  return { x: v.left + v.ox + x * v.s, y: v.top + v.oy + y * v.s, v }
}
/** Fargen redigereren viser ved et bildepunkt (lerretets egne piksler). */
async function shown(page: Page, x: number, y: number): Promise<number[]> {
  await page.waitForTimeout(80) // tegnes i neste bilde
  return page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement & { mlMaskView?: { s: number; ox: number; oy: number } }, [ix, iy]) => {
    const v = c.mlMaskView!
    const d = devicePixelRatio || 1
    const g = c.getContext('2d') as CanvasRenderingContext2D
    return [...g.getImageData(Math.round((v.ox + (ix as number) * v.s) * d), Math.round((v.oy + (iy as number) * v.s) * d), 1, 1).data]
  }, [x, y])
}
const near = (a: number[], b: number[], tol = 30) => a.slice(0, 3).every((v, i) => Math.abs(v - (b[i] ?? 0)) <= tol)
const ORANGE = [210, 110, 30]
const BLUE = [40, 80, 170]

async function exported(page: Page, file: string, pts: [number, number][]) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const thanks = page.getByRole('button', { name: 'Nei takk' })
  if (await thanks.isVisible().catch(() => false)) await thanks.click()
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, list }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return { w: bmp.width, h: bmp.height, a: list.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1) }
  }, { data: b64, list: pts })
}

test('«Finjuster masken» rett etter opplasting: bildet vises, også ved bytte av verktøy; Ferdig gir hele bildet', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openDirect(page)
  expect(near(await shown(page, 200, 150), ORANGE), 'skiven vises (ikke rutemønster)').toBe(true)
  expect(near(await shown(page, 30, 30), BLUE), 'bakgrunnen vises').toBe(true)
  for (const tool of ['rect', 'ellipse', 'lasso', 'select', 'brush']) {
    await page.locator(`[data-mask-tool="${tool}"]`).click()
    expect(near(await shown(page, 200, 150), ORANGE), `skiven vises med ${tool}`).toBe(true)
    expect(near(await shown(page, 370, 270), BLUE), `bakgrunnen vises med ${tool}`).toBe(true)
  }
  await page.locator('[data-mask-done]').click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled()
  const r = await exported(page, info.outputPath('hele.png'), [[200, 150], [10, 10], [390, 290], [100, 250]])
  expect(r).toEqual({ w: W, h: H, a: [255, 255, 255, 255] })
  expect(errors).toEqual([])
})

test('flytting og zoom: mus, styreflate, knip, midtknapp, mellomrom og to fingre tegner aldri', async ({ page }, info) => {
  await openDirect(page)
  await page.locator('[data-mask-keep="0"]').click() // Fjern: et utilsiktet strøk ville bli synlig
  const v0 = await viewOf(page)

  // musehjul (hakk) zoomer 1,25× per hakk, og bildepunktet under markøren står stille
  const a = await scr(page, 120, 90)
  await page.mouse.move(a.x, a.y)
  await page.mouse.wheel(0, -120)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(80)
  const v1 = await viewOf(page)
  expect(v1.s / v0.s).toBeCloseTo(1.5625, 3)
  const a1 = await scr(page, 120, 90)
  expect(Math.abs(a1.x - a.x) + Math.abs(a1.y - a.y)).toBeLessThan(1.5)

  // styreflate: to fingre (brøkdeler, sidebevegelse) flytter uten å zoome
  await page.locator('[data-mask-canvas]').evaluate((c) => c.dispatchEvent(new WheelEvent('wheel', { deltaX: 30.5, deltaY: 20.25, clientX: 700, clientY: 400, bubbles: true, cancelable: true })))
  await page.waitForTimeout(80)
  const v2 = await viewOf(page)
  expect(v2.s).toBeCloseTo(v1.s, 6)
  expect(v2.ox).toBeCloseTo(v1.ox - 30.5, 3)
  expect(v2.oy).toBeCloseTo(v1.oy - 20.25, 3)

  // knip (ctrlKey + små verdier): jevn zoom ved punktet
  const b = await scr(page, 200, 150)
  await page.locator('[data-mask-canvas]').evaluate((c, [x, y]) => c.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, ctrlKey: true, clientX: x, clientY: y, bubbles: true, cancelable: true })), [b.x, b.y])
  await page.waitForTimeout(80)
  const v3 = await viewOf(page)
  expect(v3.s / v2.s).toBeCloseTo(Math.exp(0.1), 4)
  const b1 = await scr(page, 200, 150)
  expect(Math.abs(b1.x - b.x) + Math.abs(b1.y - b.y)).toBeLessThan(1.5)

  // midtknappen: flytter, tegner ikke
  await page.mouse.move(b1.x, b1.y)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(b1.x + 60, b1.y + 25, { steps: 6 })
  await page.mouse.up({ button: 'middle' })
  const v4 = await viewOf(page)
  expect(v4.ox - v3.ox).toBeCloseTo(60, 0)
  expect(v4.oy - v3.oy).toBeCloseTo(25, 0)

  // mellomrom + dra: flytter, tegner ikke
  const c0 = await scr(page, 150, 120)
  await page.mouse.move(c0.x, c0.y)
  await page.keyboard.down(' ')
  await page.mouse.down()
  await page.mouse.move(c0.x - 40, c0.y - 30, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up(' ')
  const v5 = await viewOf(page)
  expect(v5.ox - v4.ox).toBeCloseTo(-40, 0)

  // to fingre (berøring): første finger begynner et strøk, andre finger gjør det om til knip – strøket angres
  const f = await scr(page, 200, 150)
  await page.locator('[data-mask-canvas]').evaluate((c, [x, y]) => {
    const pe = (type: string, id: number, cx: number, cy: number) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: cx, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }))
    pe('pointerdown', 11, x, y)
    pe('pointermove', 11, x + 15, y + 10)
    pe('pointerdown', 12, x + 80, y)
    for (let i = 1; i <= 5; i++) {
      pe('pointermove', 11, x + 15 - i * 10, y + 10)
      pe('pointermove', 12, x + 80 + i * 10, y)
    }
    pe('pointerup', 12, x + 130, y)
    pe('pointermove', 11, x - 60, y + 40) // gjenværende finger: tegner ikke
    pe('pointerup', 11, x - 60, y + 40)
  }, [f.x, f.y])
  await page.waitForTimeout(80)
  const v6 = await viewOf(page)
  expect(v6.s, 'knipet zoomet').toBeGreaterThan(v5.s * 1.3)

  // ingenting er tegnet: hele bildet er fortsatt beholdt langs alle bevegelsene
  await page.locator('[data-mask-done]').click()
  const r = await exported(page, info.outputPath('ingen-strok.png'), [[120, 90], [200, 150], [215, 160], [150, 120], [110, 130], [60, 160], [330, 150], [10, 10]])
  expect(r.a, 'ingen utilsiktede strøk').toEqual([255, 255, 255, 255, 255, 255, 255, 255])
})
