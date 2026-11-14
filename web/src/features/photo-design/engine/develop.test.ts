import { describe, expect, it } from 'vitest'
import { applyDev, cleanDev, DEV, devNeutral, hdrMerge, LOC, locWeight, type Dev, type Px } from './develop'
import { readExif } from './exif'

/** Lite testbilde: f(x, y) → [r, g, b]. */
const img = (W: number, H: number, f: (x: number, y: number) => [number, number, number]): Px => {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = f(x, y), p = (y * W + x) * 4
    data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255
  }
  return { data, width: W, height: H }
}
const run = (im: Px, d: Partial<Dev>) => {
  const c = { ...im, data: new Uint8ClampedArray(im.data) }
  applyDev(c as unknown as ImageData, { ...DEV, ...d })
  return c
}
const px = (im: Px, x: number, y: number) => Array.from(im.data.slice((y * im.width + x) * 4, (y * im.width + x) * 4 + 3))
const diff = (a: Px, b: Px) => { let s = 0; for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i]! - b.data[i]!); return s / a.data.length }

describe('avansert framkalling: nye verktøy (#170)', () => {
  it('cleanDev: gamle prosjekter er uendret, nye felt avgrenses, nøytralt = null', () => {
    expect(cleanDev({ whites: 10 })).toEqual({ ...DEV, whites: 10 })
    expect(cleanDev({ texture: 500, nr: -5, hRed: 40, gsh: 400, gss: 30, pv: -20 })).toEqual({ ...DEV, texture: 100, hRed: 40, gsh: 360, gss: 30, pv: -20 })
    expect(cleanDev({ gsh: 200 }), 'bare fargetone uten styrke gjør ingenting').toBeNull()
    expect(cleanDev({ loc: [{ k: 'rad', exp: 20, x: 9 }] })?.loc?.[0]).toMatchObject({ k: 'rad', on: true, exp: 20, x: 1.5 })
    expect(devNeutral(cleanDev({}))).toBe(true)
  })

  const noisy = img(48, 48, (x, y) => { const n = ((x * 7919 + y * 104729) % 23) - 11; return [128 + n, 128 + n, 128 + n] })
  const edges = img(48, 48, (x) => (x % 6 < 3 ? [90, 90, 90] : [170, 170, 170]))
  const color = img(8, 8, () => [220, 40, 40])

  it('støyreduksjon glatter støy; tekstur øker/demper fine detaljer', () => {
    // standardavvik i lysheten (min/maks påvirkes av bildekanten)
    const spread = (im: Px) => { let s = 0, q = 0, n = 0; for (let i = 0; i < im.data.length; i += 4) { s += im.data[i]!; q += im.data[i]! ** 2; n++ } return Math.sqrt(q / n - (s / n) ** 2) }
    expect(spread(run(noisy, { nr: 100 }))).toBeLessThan(spread(noisy) * 0.6)
    expect(spread(run(edges, { texture: 100 }))).toBeGreaterThan(spread(edges) * 1.15)
    expect(spread(run(edges, { texture: -100 }))).toBeLessThan(spread(edges) * 0.85)
  })

  it('HSL: rødt område endrer rødt, ikke blått; grått røres ikke', () => {
    const r = px(run(color, { sRed: -100 }), 3, 3)
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(5)
    const blue = img(4, 4, () => [40, 40, 220])
    expect(diff(run(blue, { sRed: -100, lRed: 50 }), blue)).toBeLessThan(0.5)
    const grey = img(4, 4, () => [128, 128, 128])
    expect(diff(run(grey, { hRed: 100, sRed: 100 }), grey)).toBe(0)
    const shifted = px(run(color, { hRed: 100 }), 3, 3)
    expect(shifted[1]!).toBeGreaterThan(60) // rødt mot oransje
  })

  it('fargegradering farger skygger og høylys hver for seg', () => {
    const ramp = img(32, 1, (x) => [x * 8, x * 8, x * 8])
    const g = run(ramp, { gsh: 220, gss: 100, ghh: 40, ghs: 100 })
    const dark = px(g, 3, 0), light = px(g, 28, 0)
    expect(dark[2]!).toBeGreaterThan(dark[0]! + 5) // blå skygger
    expect(light[0]!).toBeGreaterThan(light[2]! + 5) // varme høylys
  })

  it('perspektiv flytter innholdet og fyller hele flaten', () => {
    const grid = img(40, 40, (x, y) => (x % 10 < 5 !== y % 10 < 5 ? [255, 255, 255] : [0, 0, 0]))
    const p = run(grid, { pv: 80 })
    expect(diff(p, grid)).toBeGreaterThan(10)
    for (let i = 3; i < p.data.length; i += 4) expect(p.data[i]).toBe(255)
  })

  it('lokale masker: lineær og radial virker bare innenfor masken, kan slås av og snus', () => {
    const flat = img(40, 40, () => [100, 100, 100])
    const rad = { k: 'rad' as const, ...LOC, r: 0.2, exp: 100 }
    const out = run(flat, { loc: [rad] })
    expect(px(out, 20, 20)[0]!).toBeGreaterThan(150)
    expect(px(out, 1, 1)[0]!).toBe(100)
    expect(diff(run(flat, { loc: [{ ...rad, on: false }] }), flat)).toBe(0)
    const inv = run(flat, { loc: [{ ...rad, inv: true }] })
    expect(px(inv, 20, 20)[0]!).toBe(100)
    expect(px(inv, 1, 1)[0]!).toBeGreaterThan(150)
    const lin = { k: 'lin' as const, ...LOC, y: 0.5, r: 0.1, a: 90, exp: -100 }
    expect(locWeight(lin, 0.5, 0.1, 1)).toBe(0)
    expect(locWeight(lin, 0.5, 0.9, 1)).toBe(1)
  })

  it('flekkfjerning: en mørk flekk dekkes av kildeområdet; av = urørt', () => {
    const im = img(60, 60, (x, y) => (Math.hypot(x - 20, y - 30) < 4 ? [20, 20, 20] : [150, 160, 170]))
    const sp = { k: 'spot' as const, ...LOC, x: 20 / 60, y: 0.5, r: 0.4, f: 0.3, sx: 45 / 60, sy: 0.5 }
    const out = run(im, { loc: [sp] })
    const c = px(out, 20, 30)
    expect(Math.abs(c[0]! - 150)).toBeLessThan(6)
    expect(px(out, 45, 30)).toEqual([150, 160, 170])
    expect(diff(run(im, { loc: [{ ...sp, on: false }] }), im)).toBe(0)
  })

  it('HDR: velger de godt eksponerte delene fra hvert bilde', () => {
    // bilde a: venstre del godt eksponert, høyre utbrent; bilde b omvendt
    const a = img(40, 20, (x) => (x < 20 ? [120 + (x % 3) * 20, 90, 60] : [255, 255, 255]))
    const b = img(40, 20, (x) => (x >= 20 ? [60, 100 + (x % 3) * 20, 140] : [0, 0, 0]))
    const m = hdrMerge([a, b])
    expect(px(m, 5, 10)[0]!).toBeGreaterThan(90)
    const right = px(m, 35, 10)
    expect(right[0]!).toBeLessThan(200)
    expect(right[2]!).toBeGreaterThan(right[0]!)
  })
})

describe('EXIF', () => {
  it('leser kamera, lukker, blender, ISO og brennvidde fra en JPEG (APP1)', () => {
    // bygg en minimal JPEG med TIFF (little endian): IFD0 Make/Model + peker til Exif-IFD
    const ent: number[][] = []
    const strs: number[] = []
    const B = new DataView(new ArrayBuffer(512))
    let o = 0
    const w16 = (v: number) => { B.setUint16(o, v, true); o += 2 }
    const w32 = (v: number) => { B.setUint32(o, v, true); o += 4 }
    void ent; void strs
    // TIFF-hode
    w16(0x4949); w16(42); w32(8)
    // IFD0 ved 8: 3 oppføringer
    const data0 = 8 + 2 + 3 * 12 + 4 // 50
    w16(3)
    w16(0x010f); w16(2); w32(6); w32(data0) // Make «Canon\0»
    w16(0x0110); w16(2); w32(4); 'R6\0\0'.split('').forEach((ch) => B.setUint8(o++, ch.charCodeAt(0))) // Model «R6» (4 byte: ligger i oppføringen)
    w16(0x8769); w16(4); w32(1); w32(data0 + 10) // Exif-IFD
    w32(0)
    'Canon\0'.split('').forEach((ch) => B.setUint8(o++, ch.charCodeAt(0)))
    o += 4 // ubrukt plass (Exif-IFD skal ligge ved 60)
    // Exif-IFD ved 60: 4 oppføringer
    const dataE = 60 + 2 + 4 * 12 + 4 // 114
    w16(4)
    w16(0x829a); w16(5); w32(1); w32(dataE) // 1/250
    w16(0x829d); w16(5); w32(1); w32(dataE + 8) // f/2.8
    w16(0x8827); w16(3); w32(1); w16(400); w16(0) // ISO 400
    w16(0x920a); w16(5); w32(1); w32(dataE + 16) // 50 mm
    w32(0)
    w32(1); w32(250); w32(28); w32(10); w32(50); w32(1)
    const tiff = new Uint8Array(B.buffer, 0, o)
    const app1 = [0xff, 0xe1, ((tiff.length + 8) >> 8) & 255, (tiff.length + 8) & 255, 0x45, 0x78, 0x69, 0x66, 0, 0]
    const jpg = new Uint8Array([0xff, 0xd8, ...app1, ...tiff, 0xff, 0xd9])
    expect(readExif(jpg.buffer)).toEqual({ make: 'Canon', model: 'R6', exposure: '1/250 s', fnumber: 'f/2.8', iso: 400, focal: '50 mm' })
    expect(readExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer), 'PNG har ingen EXIF').toBeNull()
  })
})
