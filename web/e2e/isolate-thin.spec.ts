import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Tynne ledninger (som mikrofon- og headsetledninger): et rødt «motiv» på hvit bakgrunn med en mørk ledning på 2 px som
 * går ut fra motivet. Etterbehandlingen skal ikke fjerne ledningen (standard «Stram inn» = 0), og i redigeringen skal
 * «Behold» med «Følg kantene» ta med ledningen uten den hvite bakgrunnen rundt, og «Fjern» ta bort et stykke av den.
 * Kontrollert i eksportert PNG.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'pekerverktøy testes på PC'))

const W = 1000
const H = 600
// ledningen: x 600–900 ved y = 300–301 (vannrett, 2 px), festet til motivet (x 300–600, y 150–450)
const IMG = png(W, H, (x, y) => (x >= 300 && x < 600 && y >= 150 && y < 450 ? [210, 40, 40, 255] : x >= 600 && x < 900 && (y === 300 || y === 301) ? [25, 25, 25, 255] : [255, 255, 255, 255]))

async function exported(page: Page, file: string, list: [number, number][]) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const close = page.getByRole('button', { name: 'Nei takk' })
  if (await close.count()) await close.click()
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, pts }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return pts.map(([x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? -1)
  }, { data: b64, pts: list })
}
async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s }
  }, [x, y] as [number, number])
}
async function stroke(page: Page, a: [number, number], b: [number, number]) {
  const p = await scr(page, ...a)
  const q = await scr(page, ...b)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(q.x, q.y, { steps: 10 })
  await page.mouse.up()
}

test('tynn ledning: beholdes av etterbehandlingen, «Følg kantene» tar den uten bakgrunnen, «Fjern» tar et stykke', async ({ page }, info) => {
  test.slow()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'ledning.png', mimeType: 'image/png', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Logo/ }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled()
  let a = await exported(page, info.outputPath('0.png'), [[450, 300], [750, 300], [750, 301], [750, 298], [950, 300]])
  expect(a, 'motiv og ledning beholdes, bakgrunnen ved ledningen fjernes').toEqual([255, 255, 255, 0, 0])

  // start fra tom maske: fjern alt (inverter to ganger er ikke nødvendig – Fjern med rektangel over hele bildet)
  await page.locator('[data-mask-open]').click()
  await page.locator('[data-mask-tool="rect"]').click()
  await page.locator('[data-mask-keep="0"]').click()
  await stroke(page, [-5, -5], [W + 5, H + 5])
  // Behold med «Følg kantene», stor pensel (24 px) langs ledningen fra den mørke ledningen: bare ledningen tas med
  await page.locator('[data-mask-tool="brush"]').click()
  await page.locator('[data-mask-keep="1"]').click()
  await page.locator('[data-mask-size]').fill('24')
  await page.locator('[data-mask-hard]').fill('1')
  await page.locator('[data-mask-snap]').check()
  await stroke(page, [610, 300.5], [890, 300.5])
  // Fjern et stykke av ledningen (uten kantfølging)
  await page.locator('[data-mask-snap]').uncheck()
  await page.locator('[data-mask-keep="0"]').click()
  await page.locator('[data-mask-size]').fill('10')
  await stroke(page, [800, 290], [800, 312])
  await page.locator('[data-mask-done]').click()
  a = await exported(page, info.outputPath('1.png'), [[700, 300], [700, 301], [700, 297], [700, 305], [700, 290], [800, 300], [850, 300]])
  expect(a.slice(0, 2), 'ledningen tatt med').toEqual([255, 255])
  expect(a.slice(2, 5), 'hvit bakgrunn rundt ledningen ikke tatt med').toEqual([0, 0, 0])
  expect(a[5], 'stykket som ble fjernet').toBe(0)
  expect(a[6], 'resten av ledningen står').toBe(255)
})
