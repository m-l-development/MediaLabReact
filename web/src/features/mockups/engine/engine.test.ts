import { describe, expect, it } from 'vitest'
import { categoryOf, loadFolder, niceName } from './catalog'
import { detectScreen, edgeMatte, occlusionMask, refineQuad, type Pixels } from './detect'
import { area, aspectOf, growQuad, homography, inQuad, insetQuad, order, project, type Quad } from './geometry'

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps)

describe('geometri', () => {
  const q: Quad = [[10, 20], [110, 30], [100, 90], [5, 80]]

  it('homografien sender hjørnene i enhetskvadratet til skjermens hjørner', () => {
    const h = homography(q)
    if (!h) throw new Error('ingen homografi')
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
    corners.forEach(([u, v], i) => {
      const [x, y] = project(h, u, v)
      close(x, (q[i] as [number, number])[0])
      close(y, (q[i] as [number, number])[1])
    })
  })

  it('sorterer hjørnene med klokka fra øverst til venstre', () => {
    expect(order([[100, 90], [5, 80], [110, 30], [10, 20]])).toEqual(q)
  })

  it('areal, punkt-i-firkant, sideforhold og forstørrelse', () => {
    expect(area([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(50)
    expect(inQuad(q, 50, 50)).toBe(true)
    expect(inQuad(q, 0, 0)).toBe(false)
    close(aspectOf([[0, 0], [160, 0], [160, 90], [0, 90]]), 16 / 9)
    expect(growQuad([[0, 0], [10, 0], [10, 10], [0, 10]], 2)).toEqual([[-5, -5], [15, -5], [15, 15], [-5, 15]])
  })
})

/** Grå bakgrunn med en hvit «skjerm» (og valgfritt en mørk «finger» over kanten). */
function photo(w: number, h: number, finger = false): Pixels {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const screen = x >= w * 0.25 && x < w * 0.75 && y >= h * 0.2 && y < h * 0.7
      const f = finger && x >= w * 0.45 && x < w * 0.55 && y >= h * 0.55
      const v = f ? 40 : screen ? 250 : 120
      d.set([v, v, v, 255], (y * w + x) * 4)
    }
  }
  return { w, h, d }
}

describe('skjermgjenkjenning', () => {
  it('finner den lyse skjermen i bildet', () => {
    const q = detectScreen(photo(200, 150))
    expect(q).not.toBeNull()
    if (!q) return
    close(q[0][0], 0.25, 0.02)
    close(q[0][1], 0.2, 0.02)
    close(q[2][0], 0.745, 0.02)
    close(q[2][1], 0.695, 0.02)
  })

  it('gir null når det ikke finnes noen tydelig skjerm', () => {
    const w = 120
    const h = 90
    const d = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const v = (i * 97) % 256
      d.set([v, (v * 3) % 256, (v * 7) % 256, 255], i * 4)
    }
    expect(detectScreen({ w, h, d })).toBeNull()
  })

  it('maske med okklusjon: fingeren foran skjermen er ikke en del av skjermen', () => {
    const P = photo(200, 150, true)
    const qn: Quad = [[0.25, 0.2], [0.75, 0.2], [0.75, 0.7], [0.25, 0.7]]
    const m = occlusionMask(P, qn, true)
    expect(m).not.toBeNull()
    if (!m) return
    const at = (x: number, y: number) => m[Math.round(y * (P.h - 1)) * P.w + Math.round(x * (P.w - 1))]
    expect(at(0.3, 0.3)).toBe(1)
    expect(at(0.5, 0.66)).toBe(0)
    expect(at(0.1, 0.1)).toBe(0)
  })
})

/**
 * Syntetisk foto med myke (antialiaserte) kanter: `cover(x, y)` = andel flate i pikselen (4×4 delpunkter),
 * flaten har fargen `inV`, resten `outV` (eller `other(x, y)` der den gir en farge, f.eks. en finger).
 */
function soft(w: number, h: number, inside: (x: number, y: number) => boolean, inV: number, outV: number, other?: (x: number, y: number) => number | null): Pixels {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = 0
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (inside(x + (i + 0.5) / 4, y + (j + 0.5) / 4)) c++
      const o = other?.(x + 0.5, y + 0.5)
      const v = o ?? inV * (c / 16) + outV * (1 - c / 16)
      d.set([v, v, v, 255], (y * w + x) * 4)
    }
  }
  return { w, h, d }
}

/** Rektangel med avrundede hjørner (radius r), i piksler. */
const rounded = (x0: number, y0: number, x1: number, y1: number, r: number) => (x: number, y: number) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return Math.hypot(x - cx, y - cy) <= r
}

describe('skjermkanter (Mac og kort)', () => {
  // svart glass med avrundede hjørner på en lys vegg, som iMac-en med svart skjerm
  const W = 400, H = 300
  const glass = soft(W, H, rounded(80, 50, 320, 230, 14), 10, 225)
  const truth: Quad = [[80 / W, 50 / H], [320 / W, 50 / H], [320 / W, 230 / H], [80 / W, 230 / H]]
  const px = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot((p[0] - b[i]![0]) * W, (p[1] - b[i]![1]) * H)))

  it('mørk skjerm: gjenkjenningen alene havner innenfor kanten; kantsøket flytter sidene helt ut til glassets kant', () => {
    const q = detectScreen(glass)
    expect(q).not.toBeNull()
    if (!q) return
    expect(px(q, truth)).toBeGreaterThan(2) // de avrundede hjørnene trekker firkanten innover (striper av svart glass)
    const r = refineQuad(glass, q)
    expect(px(r, truth)).toBeLessThan(0.75) // hjørnene i skjæringen mellom sidene, utenfor avrundingen
  })

  it('en finger over kanten flytter ikke siden (avvikere tas bort), og uten tydelig kant beholdes firkanten', () => {
    const finger = soft(W, H, rounded(80, 50, 320, 230, 14), 10, 225, (x, y) => (Math.hypot(x - 200, y - 245) < 30 ? 120 : null))
    const r = refineQuad(finger, [[0.205, 0.17], [0.795, 0.17], [0.795, 0.765], [0.205, 0.765]])
    expect(px(r, truth)).toBeLessThan(1)
    const flat = soft(W, H, () => false, 0, 128)
    const q: Quad = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]
    expect(px(refineQuad(flat, q), q)).toBeLessThan(1e-6)
  })

  it('innfelling i perspektiv: rammen blir stående, det aktive skjermområdet ligger innenfor', () => {
    expect(insetQuad([[0, 0], [100, 0], [100, 50], [0, 50]], [0.1, 0.05, 0.2, 0.05])).toEqual([[5, 5], [95, 5], [95, 40], [5, 40]])
    // i perspektiv: innfellingen følger flaten (lik andel i flatens egne koordinater, ikke i bildet)
    const p: Quad = [[10, 20], [110, 30], [100, 90], [5, 80]]
    const h = homography(p)
    if (!h) throw new Error('ingen homografi')
    const r = insetQuad(p, [0.1, 0.1, 0.1, 0.1])
    const want = project(h, 0.1, 0.1)
    close(r[0][0], want[0])
    close(r[0][1], want[1])
    expect(insetQuad(p, [0, 0, 0, 0]).map((v) => v.map((n) => +n.toFixed(9)))).toEqual(p)
  })

  it('mørkt kort: overgangen mot bakgrunnen får ingen svart stripe (flatens egen farge trekkes ut)', () => {
    const w = 160, h = 100
    const card = soft(w, h, (x, y) => x >= 40.3 && x <= 119.6 && y >= 25.4 && y <= 74.7, 12, 150)
    const qn: Quad = [[40 / w, 25 / h], [120 / w, 25 / h], [120 / w, 75 / h], [40 / w, 75 / h]]
    const m = occlusionMask(card, qn, false)
    expect(m).not.toBeNull()
    if (!m) return
    const surf = new Uint8ClampedArray(w * h * 4)
    const a = edgeMatte(card, m, card.d, 0, 0, w, h, w, h, qn, surf)
    const D = 240 // lyst design
    // langs sidene; selve hjørnepikselen (én per hjørne) har en grovere maske og får egen, litt lavere grense
    const corner = (x: number, y: number) => (x === 40 || x === 119) && (y === 25 || y === 74)
    let oldMin = 255, newMin = 255, cornerMin = 255, n = 0
    for (let p = 0; p < w * h; p++) {
      const al = (a[p] ?? 0) / 255, I = card.d[p * 4] ?? 0
      if (al <= 0 || al >= 250 / 255 || !surf[p * 4 + 3]) continue
      const S = surf[p * 4] ?? 0
      const v = al * Math.min(255, D + I - S) + (1 - al) * I
      if (corner(p % w, (p / w) | 0)) { cornerMin = Math.min(cornerMin, v); continue }
      oldMin = Math.min(oldMin, al * D + (1 - al) * I)
      newMin = Math.min(newMin, v)
      n++
    }
    expect(n).toBeGreaterThan(20) // det finnes overgangspiksler langs kanten
    expect(oldMin).toBeLessThan(145) // før: fotoets svarte kort ble med i blandingen (mørkere enn både design og bakgrunn)
    expect(newMin).toBeGreaterThanOrEqual(145) // nå: aldri mørkere enn bakgrunnen rundt kortet
    expect(cornerMin).toBeGreaterThanOrEqual(125)
  })
})

describe('katalog', () => {
  it('innfelling fra config.json (svart skjerm i svart ramme); ugyldige verdier ignoreres', async () => {
    const files: Record<string, unknown> = {
      '/m/index.json': { files: ['imac-a.jpg', 'imac-b.jpg', 'imac-c.jpg'] },
      '/m/config.json': { 'imac-a.jpg': { inset: [0.07, 0.04, 0.06, 0.04] }, 'imac-b.jpg': { inset: [0.07, 0.9, 0, 0] } },
    }
    const real = globalThis.fetch
    globalThis.fetch = (async (u: string) => ({ ok: u in files, json: async () => files[u] })) as unknown as typeof fetch
    try {
      const list = await loadFolder('/m/', 'folder')
      expect(list.map((m) => m.inset ?? null)).toEqual([[0.07, 0.04, 0.06, 0.04], null, null])
    } finally {
      globalThis.fetch = real
    }
  })

  it('kategori og navn fra filnavnet, som i dag', () => {
    expect(categoryOf('iphone-hand.jpg')).toBe('phone')
    expect(categoryOf('MacBook-Air.jpg')).toBe('laptop')
    expect(categoryOf('tv-wall.jpg')).toBe('screen')
    expect(categoryOf('card-white.jpg')).toBe('print')
    expect(categoryOf('vase.jpg')).toBe('other')
    expect(niceName('iphone-hand.jpg')).toBe('Iphone Hand')
  })
})
