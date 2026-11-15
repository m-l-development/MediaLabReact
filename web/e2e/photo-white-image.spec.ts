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

/** Et kamerabilde (JPEG) i w × h: himmel, hav og en rød båt (tydelig farge, ikke hvitt). */
async function photo(page: Page, w: number, h: number, top = '#3a6fb0'): Promise<Buffer> {
  const b64 = await page.evaluate(async ([w, h, top]) => {
    const c = document.createElement('canvas')
    c.width = w as number
    c.height = h as number
    const g = c.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, (h as number) * 0.5)
    sky.addColorStop(0, top as string)
    sky.addColorStop(1, '#9cc3e6')
    g.fillStyle = sky
    g.fillRect(0, 0, (w as number), (h as number) * 0.5)
    g.fillStyle = '#1d4e6e'
    g.fillRect(0, (h as number) * 0.5, (w as number), (h as number) * 0.5)
    g.fillStyle = '#c8281e'
    g.fillRect((w as number) * 0.3, (h as number) * 0.4, (w as number) * 0.4, (h as number) * 0.23)
    const b = await new Promise<Blob>((r) => c.toBlob((x) => r(x!), 'image/jpeg', 0.85))
    c.width = 0
    const u = new Uint8Array(await b.arrayBuffer())
    let s = ''
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
    return btoa(s)
  }, [w, h, top] as const)
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

/** Eksporterer PNG og gir andelen røde piksler der båten står (midt i bildet, over tittelen). */
async function exportRed(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).first().click()
  const dl = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  const b64 = fs.readFileSync(await (await dl).path()).toString('base64')
  await page.keyboard.press('Escape')
  const close = page.getByRole('button', { name: /^(Lukk|Ferdig|Avbryt)$/ }).filter({ visible: true })
  if (await page.getByRole('button', { name: 'Last ned', exact: true }).filter({ visible: true }).count()) await close.first().click().catch(() => undefined)
  return page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = document.createElement('canvas')
    c.width = 200
    c.height = 200
    const g = c.getContext('2d')!
    g.drawImage(bmp, 0, 0, 200, 200)
    const d = g.getImageData(85, 85, 30, 15).data
    let red = 0
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 140 && d[i + 1]! < 90 && d[i + 2]! < 90) red++
    return red / (d.length / 4)
  }, b64)
}

async function openPhoto(page: Page) {
  if (!process.env.ML_NO_LIMIT) await emulateCanvasLimit(page)
  await page.goto('/app/photo-design')
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl-picker] [data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
}
async function swap(page: Page, name: string, buf: Buffer) {
  // bakgrunnsbildet (nederst i lagslisten) velges om knappen ikke vises (f.eks. etter eksporten)
  if (!(await page.getByRole('button', { name: 'Bytt bilde' }).isVisible())) await page.locator('[data-layer]').last().click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name, mimeType: 'image/jpeg', buffer: buf })
  // laget beholder navnet når bildeplassen allerede har et bilde; første gang får det filnavnet
  const L = page.locator('[data-layer]').filter({ hasText: name.slice(0, -4) }).first()
  if (await L.isVisible({ timeout: 15_000 }).catch(() => false)) await L.click()
}

// 12 MP (iPhone), 48 MP (iPhone Pro, over iOS-grensen), 108 MP (Android)
for (const [mp, w, h] of [[12, 4032, 3024], [48, 8064, 6048], [108, 12000, 9000]] as const) {
  test(`«Bytt bilde» med ${mp} MP (${w} × ${h}) under en lerretsgrense som iOS: forhåndsvisning og eksport viser bildet`, async ({ page, context }, info) => {
    test.skip(info.project.name === 'mobil', 'PC (WebKit: kjør med en WebKit-konfig)')
    test.setTimeout(300_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const gen = await context.newPage()
    await gen.goto('/app/')
    const big = await photo(gen, w, h)
    await gen.close()
    await openPhoto(page)
    await swap(page, `kamera-${mp}mp.jpg`, big)
    await expect.poll(async () => (await look(page)).b, { timeout: 60_000, message: 'bildet (blå himmel) vises i bildeplassen' }).toBeGreaterThan(60)
    expect((await look(page)).white, 'ikke hvitt').toBeLessThan(0.1)
    expect(await exportRed(page), 'eksporten (full oppløsning) viser bildet').toBeGreaterThan(0.5)
    expect(errors).toEqual([])
  })
}

test('flere «Bytt bilde» etter hverandre med store bilder (48 → 12 → 48 MP): hvert bilde vises, eksporten har det siste', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.setTimeout(420_000)
  const gen = await context.newPage()
  await gen.goto('/app/')
  // ulik himmel, så hvert bytte kan ses i forhåndsvisningen (blå → grønn → rød)
  const a = await photo(gen, 8064, 6048, '#2f6fd0'), b = await photo(gen, 4032, 3024, '#2fa050'), c = await photo(gen, 8064, 6048, '#d0503a')
  await gen.close()
  await openPhoto(page)
  const sky = (p: Page) => p.locator('[data-pd-wrap] canvas').first().evaluate((cv: HTMLCanvasElement) => { const d = cv.getContext('2d')!.getImageData(Math.round(cv.width * 0.5), Math.round(cv.height * 0.12), 1, 1).data; return [d[0]!, d[1]!, d[2]!] })
  for (const [n, buf, want] of [['stor-a.jpg', a, 'b'], ['liten.jpg', b, 'g'], ['stor-b.jpg', c, 'r']] as const) {
    await swap(page, n, buf)
    // himmelen øverst i bildet har den nye fargen (sterkeste kanal), og er ikke hvit
    await expect.poll(async () => { const [r, g, bb] = await sky(page); const m = Math.max(r, g, bb); return m > 235 && Math.min(r, g, bb) > 235 ? 'hvit' : m === bb ? 'b' : m === g ? 'g' : 'r' }, { timeout: 120_000, message: `${n} vises` }).toBe(want)
  }
  expect(await exportRed(page)).toBeGreaterThan(0.5)
})

/**
 * iOS har også en grense for samlet lerretsminne (ca. 256–384 MB): over den blir nye lerreter tomme («hvitt bilde»).
 * Lerretene som fortsatt lever etter søppeltømming, summeres (registrert ved opprettelse, svake referanser).
 */
async function trackCanvases(page: Page) {
  await page.addInitScript(() => {
    const live: WeakRef<HTMLCanvasElement>[] = []
    const make = Document.prototype.createElement
    Document.prototype.createElement = function (this: Document, tag: string, o?: ElementCreationOptions) {
      const el = make.call(this, tag, o)
      if (String(tag).toLowerCase() === 'canvas') live.push(new WeakRef(el as HTMLCanvasElement))
      return el
    } as typeof Document.prototype.createElement
    ;(window as unknown as { __canvasMB: () => number }).__canvasMB = () => {
      let px = 0
      for (const r of live) { const c = r.deref(); if (c) px += c.width * c.height }
      return Math.round((px * 4) / 1048576)
    }
  })
}
const canvasMB = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page)
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  await cdp.detach()
  return page.evaluate(() => (window as unknown as { __canvasMB: () => number }).__canvasMB())
}

test('lerretsminnet etter 48 MP-eksport og to «Bytt bilde» holder seg under iOS-grensen for samlet lerretsminne', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil' || !!process.env.ML_WEBKIT, 'PC (Chrome: søppeltømming via DevTools)')
  test.setTimeout(420_000)
  const gen = await context.newPage()
  await gen.goto('/app/')
  const a = await photo(gen, 8064, 6048, '#2f6fd0'), b = await photo(gen, 8064, 6048, '#2fa050')
  await gen.close()
  await trackCanvases(page)
  await openPhoto(page)
  await swap(page, 'stor-a.jpg', a)
  await expect.poll(async () => (await look(page)).b, { timeout: 60_000 }).toBeGreaterThan(60)
  expect(await exportRed(page)).toBeGreaterThan(0.5)
  await swap(page, 'stor-b.jpg', b)
  await page.waitForTimeout(1500)
  expect(await exportRed(page)).toBeGreaterThan(0.5)
  await swap(page, 'stor-c.jpg', a)
  await page.waitForTimeout(1500)
  const mb = await canvasMB(page)
  console.log(`LERRET levende lerretsminne etter to eksporter og tre bytter: ${mb} MB`)
  expect(mb, 'samlet lerretsminne').toBeLessThan(200)
})

test('raskt «Bytt bilde» to ganger (stort, så lite): det siste valget vinner selv om det første blir ferdig senere', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.setTimeout(300_000)
  const gen = await context.newPage()
  await gen.goto('/app/')
  const big = await photo(gen, 12000, 9000, '#2f6fd0'), small = await photo(gen, 1200, 900, '#2fa050')
  await gen.close()
  await openPhoto(page)
  for (const [n, buf] of [['stor.jpg', big], ['liten.jpg', small]] as const) {
    if (!(await page.getByRole('button', { name: 'Bytt bilde' }).isVisible())) await page.locator('[data-layer]').last().click()
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Bytt bilde' }).click()
    await (await ch).setFiles({ name: n, mimeType: 'image/jpeg', buffer: buf })
  }
  // vent til det store bildet uansett er ferdig behandlet, og se at det lille (grønn himmel) står igjen
  await page.waitForTimeout(8000)
  const sky = await page.locator('[data-pd-wrap] canvas').first().evaluate((cv: HTMLCanvasElement) => { const d = cv.getContext('2d')!.getImageData(Math.round(cv.width * 0.5), Math.round(cv.height * 0.12), 1, 1).data; return [d[0]!, d[1]!, d[2]!] })
  expect(Math.max(...sky) === sky[1], `grønn himmel (det siste bildet), fikk ${sky}`).toBe(true)
})
