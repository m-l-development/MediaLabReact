/**
 * Panorama – trekkpunkter og samsvar. Harris-hjørner (jevnt fordelt over bildet med et rutenett), binære
 * BRIEF-deskriptorer (256 lysstyrkesammenligninger i et glattet felt – tåler ulik eksponering, siden bare
 * rekkefølgen av lysstyrker teller) og gjensidig beste samsvar med forholdstest (Lowe).
 */
import { rng } from './geometry'

export interface Img { w: number; h: number; data: Uint8ClampedArray }
export interface Feats { n: number; x: Float32Array; y: Float32Array; d: Uint32Array }

/** Lysstyrke 0–1. */
export function gray(im: Img): Float32Array {
  const n = im.w * im.h, g = new Float32Array(n), d = im.data
  for (let i = 0, p = 0; i < n; i++, p += 4) g[i] = (0.299 * d[p]! + 0.587 * d[p + 1]! + 0.114 * d[p + 2]!) / 255
  return g
}

/** Boksuskarphet (radius r) i begge retninger, kantene forlenget. */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 1 / (2 * r + 1)
  for (let y = 0; y < h; y++) {
    const o = y * w
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))]!
    for (let x = 0; x < w; x++) {
      tmp[o + x] = acc * k
      acc += src[o + Math.min(w - 1, x + r + 1)]! - src[o + Math.max(0, x - r)]!
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!
    }
  }
  return out
}
const gauss = (s: Float32Array, w: number, h: number, r: number) => boxBlur(boxBlur(s, w, h, r), w, h, r)

const PATCH = 15
/** De 256 sammenligningsparene (faste, gaussisk fordelt i feltet). */
const PAIRS: Int8Array = (() => {
  const rand = rng(12345)
  const g = () => {
    // Box–Muller, σ = PATCH / 2.5, klippet til feltet
    const u = Math.max(1e-9, rand()), v = rand()
    return Math.max(-PATCH, Math.min(PATCH, Math.round(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * (PATCH / 2.5))))
  }
  const p = new Int8Array(256 * 4)
  for (let i = 0; i < p.length; i++) p[i] = g()
  return p
})()

/** Harris-hjørner + BRIEF. `max` = høyst så mange punkter (fordelt i et rutenett). */
export function detect(im: Img, max = 2000): Feats {
  const { w, h } = im
  const g0 = gray(im)
  // lik kontrast uansett eksponering: normaliser til middel 0 og standardavvik 1
  let m = 0
  for (let i = 0; i < g0.length; i++) m += g0[i]!
  m /= g0.length
  let v = 0
  for (let i = 0; i < g0.length; i++) v += (g0[i]! - m) ** 2
  const sd = Math.sqrt(v / g0.length) || 1
  for (let i = 0; i < g0.length; i++) g0[i] = (g0[i]! - m) / sd
  const g = gauss(g0, w, h, 1)
  const xx = new Float32Array(w * h), yy = new Float32Array(w * h), xy = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const ix = (g[i + 1]! - g[i - 1]!) * 0.5, iy = (g[i + w]! - g[i - w]!) * 0.5
    xx[i] = ix * ix; yy[i] = iy * iy; xy[i] = ix * iy
  }
  const sxx = gauss(xx, w, h, 2), syy = gauss(yy, w, h, 2), sxy = gauss(xy, w, h, 2)
  const R = new Float32Array(w * h)
  let rmax = 0
  for (let i = 0; i < R.length; i++) {
    const a = sxx[i]!, b = syy[i]!, c = sxy[i]!
    const r = a * b - c * c - 0.04 * (a + b) * (a + b)
    R[i] = r
    if (r > rmax) rmax = r
  }
  const B = PATCH + 4
  // svak terskel: Harris-responsen skalerer med kontrasten i fjerde potens; rutenettet velger de sterkeste per celle
  const thr = rmax * 1e-7
  // rutenett: de sterkeste lokale maksimaene i hver celle
  const cell = Math.max(16, Math.round(Math.sqrt((w * h) / (max / 3))))
  const gx = Math.ceil(w / cell), gy = Math.ceil(h / cell)
  const per = Math.max(2, Math.ceil(max / (gx * gy)))
  const cand: { i: number; r: number }[][] = Array.from({ length: gx * gy }, () => [])
  for (let y = B; y < h - B; y++) for (let x = B; x < w - B; x++) {
    const i = y * w + x, r = R[i]!
    if (r <= thr) continue
    if (r < R[i - 1]! || r < R[i + 1]! || r < R[i - w]! || r < R[i + w]! || r < R[i - w - 1]! || r < R[i - w + 1]! || r < R[i + w - 1]! || r < R[i + w + 1]!) continue
    cand[Math.floor(y / cell) * gx + Math.floor(x / cell)]!.push({ i, r })
  }
  const pts: number[] = []
  for (const c of cand) {
    c.sort((a, b) => b.r - a.r)
    for (let k = 0; k < Math.min(per, c.length); k++) pts.push(c[k]!.i)
  }
  // BRIEF på et glattere bilde (mindre støyfølsomt)
  const s = gauss(g0, w, h, 2)
  const n = pts.length
  const f: Feats = { n, x: new Float32Array(n), y: new Float32Array(n), d: new Uint32Array(n * 8) }
  for (let k = 0; k < n; k++) {
    const i = pts[k]!, x = i % w, y = (i - x) / w
    f.x[k] = x
    f.y[k] = y
    for (let b = 0; b < 256; b++) {
      const a = (y + PAIRS[b * 4 + 1]!) * w + x + PAIRS[b * 4]!
      const c = (y + PAIRS[b * 4 + 3]!) * w + x + PAIRS[b * 4 + 2]!
      if (s[a]! < s[c]!) f.d[k * 8 + (b >> 5)]! |= 1 << (b & 31)
    }
  }
  return f
}

const pop = (v: number) => {
  v -= (v >>> 1) & 0x55555555
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333)
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/** Beste og nest beste i B for hvert punkt i A (Hamming-avstand). */
function nearest(A: Feats, B: Feats): { best: Int32Array; d1: Int32Array; d2: Int32Array } {
  const best = new Int32Array(A.n).fill(-1), d1 = new Int32Array(A.n).fill(999), d2 = new Int32Array(A.n).fill(999)
  const a = A.d, b = B.d
  for (let i = 0; i < A.n; i++) {
    const o = i * 8
    let b1 = 999, b2 = 999, bi = -1
    for (let j = 0; j < B.n; j++) {
      const q = j * 8
      let d = pop(a[o]! ^ b[q]!) + pop(a[o + 1]! ^ b[q + 1]!) + pop(a[o + 2]! ^ b[q + 2]!) + pop(a[o + 3]! ^ b[q + 3]!)
      if (d >= b2) continue
      d += pop(a[o + 4]! ^ b[q + 4]!) + pop(a[o + 5]! ^ b[q + 5]!) + pop(a[o + 6]! ^ b[q + 6]!) + pop(a[o + 7]! ^ b[q + 7]!)
      if (d < b1) { b2 = b1; b1 = d; bi = j } else if (d < b2) b2 = d
    }
    best[i] = bi
    d1[i] = b1
    d2[i] = b2
  }
  return { best, d1, d2 }
}

/** Gjensidig beste samsvar som også består forholdstesten. Retur: indekspar [i i A, j i B]. */
export function match(A: Feats, B: Feats, ratio = 0.82, maxDist = 80): [number, number][] {
  if (!A.n || !B.n) return []
  const ab = nearest(A, B), ba = nearest(B, A)
  const out: [number, number][] = []
  for (let i = 0; i < A.n; i++) {
    const j = ab.best[i]!
    if (j < 0 || ba.best[j] !== i) continue
    if (ab.d1[i]! > maxDist || ab.d1[i]! > ratio * ab.d2[i]!) continue
    out.push([i, j])
  }
  return out
}
