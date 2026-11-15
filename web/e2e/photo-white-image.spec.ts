import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Photo «hvitt bilde» – reproduksjon. iOS Safari (og andre nettlesere med lite minne) tegner ingenting på et lerret som
 * er større enn grensen (iOS: 16 777 216 piksler = 4096²) – uten feilmelding. Et bilde fra et 48 MP-kamera
 * (8064 × 6048) ble tegnet på et lerret i full størrelse (eksport/avansert framkalling opptil 8192 px) og ble da tomt,
 * dvs. hvitt på den hvite siden. Testen etterligner grensen i Chrome (tegning og avlesning på for store lerret gjør
 * ingenting / gir nuller, slik iOS gjør) og legger inn et 48 MP JPEG med «Bytt bilde».
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

const LIMIT = 16_777_216

async function emulateCanvasLimit(page: Page) {
  await page.addInitScript((limit: number) => {
    const big = (c: { width: number; height: number } | null | undefined) => !!c && c.width * c.height > limit
    const P = CanvasRenderingContext2D.prototype
    for (const k of ['drawImage', 'fillRect', 'putImageData', 'clearRect'] as const) {
      const f = P[k] as (...a: unknown[]) => unknown
      ;(P as unknown as Record<string, unknown>)[k] = function (this: CanvasRenderingContext2D, ...a: unknown[]) { return big(this.canvas) ? undefined : f.apply(this, a) }
    }
    const gid = P.getImageData
    P.getImageData = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s?: ImageDataSettings) {
      return big(this.canvas) ? new ImageData(Math.max(1, w), Math.max(1, h)) : gid.call(this, x, y, w, h, s)
    }
    ;(window as unknown as { __canvasLimit: number }).__canvasLimit = limit
  }, LIMIT)
}

/** Et bilde fra et 48 MP-kamera (8064 × 6048 JPEG): himmel, hav og en rød båt (tydelig farge, ikke hvitt). */
async function photo48(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 8064
    c.height = 6048
    const g = c.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, 3000)
    sky.addColorStop(0, '#3a6fb0')
    sky.addColorStop(1, '#9cc3e6')
    g.fillStyle = sky
    g.fillRect(0, 0, 8064, 3000)
    g.fillStyle = '#1d4e6e'
    g.fillRect(0, 3000, 8064, 3048)
    g.fillStyle = '#c8281e'
    g.fillRect(2400, 2400, 3200, 1400)
    const b = await new Promise<Blob>((r) => c.toBlob((x) => r(x!), 'image/jpeg', 0.85))
    const u = new Uint8Array(await b.arrayBuffer())
    let s = ''
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
    return btoa(s)
  })
  return Buffer.from(b64, 'base64')
}

/** Snittfarge og andel nesten hvite piksler i bildeplassen (midten av lerretet). */
const look = (page: Page) => page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d')!
  const w = Math.round(c.width * 0.4), h = Math.round(c.height * 0.3)
  const d = g.getImageData(Math.round(c.width * 0.3), Math.round(c.height * 0.2), w, h).data
  let r = 0, gg = 0, b = 0, white = 0, n = 0
  for (let i = 0; i < d.length; i += 4 * 13) { r += d[i]!; gg += d[i + 1]!; b += d[i + 2]!; if (d[i]! > 235 && d[i + 1]! > 235 && d[i + 2]! > 235) white++; n++ }
  return { r: r / n, g: gg / n, b: b / n, white: white / n }
})

test('«Bytt bilde» med et 48 MP-bilde når nettleseren har en lerretsgrense (som iOS): bildet vises, ikke hvitt', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'samme kode; PC holder')
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const gen = await context.newPage()
  await gen.goto('/app/')
  const big = await photo48(gen)
  await gen.close()
  if (!process.env.ML_NO_LIMIT) await emulateCanvasLimit(page)
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl-picker] [data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'kamera-48mp.jpg', mimeType: 'image/jpeg', buffer: big })
  // bildet vises (blått/rødt motiv), ikke hvitt
  await expect.poll(async () => (await look(page)).b, { timeout: 30_000, message: 'bildet (blå himmel) vises i bildeplassen' }).toBeGreaterThan(60)
  expect((await look(page)).white, 'ikke hvitt').toBeLessThan(0.1)
  // eksport (PNG, full oppløsning) har også bildet – her ble lerretet i full størrelse tomt
  await page.getByRole('button', { name: 'Eksporter', exact: true }).first().click()
  const dl = page.waitForEvent('download', { timeout: 90_000 })
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  const b64 = fs.readFileSync(await (await dl).path()).toString('base64')
  const E = await page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = document.createElement('canvas')
    c.width = 200
    c.height = 200
    const g = c.getContext('2d')!
    g.drawImage(bmp, 0, 0, 200, 200)
    // rød båt midt i bildet (over tittelen)
    const d = g.getImageData(80, 70, 40, 20).data
    let red = 0
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 140 && d[i + 1]! < 90 && d[i + 2]! < 90) red++
    return red / (d.length / 4)
  }, b64)
  expect(E, 'den eksporterte PNG-en viser bildet (rød båt)').toBeGreaterThan(0.5)
  expect(errors).toEqual([])
})
