/**
 * Alfa-masker for Isolate Subject. Rene funksjoner over piksler (ingen DOM), så de kan testes.
 * Samme regler og terskler som dagens verktøy (media-lab/src/pages/isolate-subject/logic.js), slik at resultatet blir likt.
 * En maske er én byte per piksel: 0 = fjernet, 255 = beholdt.
 */

export type Mask = Uint8ClampedArray

import { separable } from '../../../shared/mask/morph'
export { separable }

/**
 * Logo/Tekst: fjerner bakgrunnsfargen når kanten av bildet er (nesten) ensfarget.
 * Returnerer null hvis bakgrunnen ikke er ensfarget – da brukes AI-modellen i stedet.
 */
export function colorKey(rgba: Uint8ClampedArray, W: number, H: number): Mask | null {
  const R: number[] = []
  const G: number[] = []
  const B: number[] = []
  const step = Math.max(1, Math.round((W + H) / 800))
  const add = (i: number) => {
    if ((rgba[i + 3] ?? 0) < 8) return
    R.push(rgba[i] ?? 0)
    G.push(rgba[i + 1] ?? 0)
    B.push(rgba[i + 2] ?? 0)
  }
  for (let x = 0; x < W; x += step) {
    add(x * 4)
    add(((H - 1) * W + x) * 4)
  }
  for (let y = 0; y < H; y += step) {
    add(y * W * 4)
    add((y * W + W - 1) * 4)
  }
  if (R.length < 8) return null
  const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1] ?? 0
  const r = median(R)
  const g = median(G)
  const b = median(B)
  let near = 0
  for (let i = 0; i < R.length; i++) {
    const dr = (R[i] ?? 0) - r
    const dg = (G[i] ?? 0) - g
    const db = (B[i] ?? 0) - b
    if (dr * dr + dg * dg + db * db < 1600) near++
  }
  if (near / R.length < 0.7) return null
  const a = new Uint8ClampedArray(W * H)
  const t0 = 22
  const t1 = 90
  for (let i = 0, p = 0; i < a.length; i++, p += 4) {
    const alpha = rgba[p + 3] ?? 0
    const dr = (rgba[p] ?? 0) - r
    const dg = (rgba[p + 1] ?? 0) - g
    const db = (rgba[p + 2] ?? 0) - b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    a[i] = alpha < 8 ? 0 : dist <= t0 ? 0 : dist >= t1 ? alpha : Math.round(((dist - t0) * alpha) / (t1 - t0))
  }
  return a
}

/** En maske som er nesten helt tom eller helt full, er et tegn på at modellen feilet (f.eks. fp16 på enkelte GPU-er). */
export function isDegenerate(a: Mask): boolean {
  let n = 0
  for (let i = 0; i < a.length; i += 7) if ((a[i] ?? 0) > 128) n++
  const f = n / Math.ceil(a.length / 7)
  return f < 0.002 || f > 0.998
}

export function maxMask(a: Mask, b: Mask): Mask {
  const o = new Uint8ClampedArray(a.length)
  for (let i = 0; i < a.length; i++) o[i] = Math.max(a[i] ?? 0, b[i] ?? 0)
  return o
}

/** Fjerner `remove` fra `alpha` (eller fra et helt synlig bilde): resultatet er det minste av alfa og (255 − fjern). */
export function subtractMask(alpha: Mask | null, remove: Mask): Mask {
  const o = new Uint8ClampedArray(remove.length)
  for (let i = 0; i < o.length; i++) {
    const base = alpha ? (alpha[i] ?? 0) : 255
    const keep = 255 - (remove[i] ?? 0)
    o[i] = base < keep ? base : keep
  }
  return o
}

export const hasContent = (m: Mask | null): m is Mask => !!m && m.some((v) => v > 127)

/** Utvider (r > 0) eller trekker sammen (r < 0) masken med |r| piksler. */
export function growMask(a: Mask, W: number, H: number, r: number): Mask {
  const n = Math.round(Math.abs(r))
  return n ? separable(a, W, H, n, r > 0 ? 'max' : 'min') : new Uint8ClampedArray(a)
}

/** Inverterer masken (beholdt ↔ fjernet). */
export function invertMask(a: Mask): Mask {
  const o = new Uint8ClampedArray(a.length)
  for (let i = 0; i < a.length; i++) o[i] = 255 - (a[i] ?? 0)
  return o
}

export interface RefinedMask {
  mask: Mask
  /** Ytterkantene av motivet [x0, y0, x1, y1], eller null hvis masken er tom. */
  box: [number, number, number, number] | null
}

/**
 * Finjustering (IS-10): «Stram inn kantene» krymper masken, «Myke kanter» gjør overgangen mykere uten å vokse utover.
 * `tight` og `soft` er i samme skala som glidebryterne i dag (piksler per 1000 px bildestørrelse).
 */
export function refineMask(alpha: Mask, W: number, H: number, tight: number, soft: number): RefinedMask {
  const sc = Math.max(W, H) / 1000
  const N = W * H
  const h = new Uint8ClampedArray(N)
  for (let i = 0; i < N; i++) {
    const v = alpha[i] ?? 0
    h[i] = v <= 24 ? 0 : v >= 232 ? 255 : ((v - 24) * 255) / 208
  }
  const r = Math.round(tight * sc)
  const eroded = r > 0 ? separable(h, W, H, r, 'min') : h
  const fr = Math.round(soft * sc * 1.5)
  let fin = eroded
  if (fr > 0) {
    const b = separable(separable(eroded, W, H, fr, 'blur'), W, H, fr, 'blur')
    fin = new Uint8ClampedArray(N)
    for (let i = 0; i < N; i++) fin[i] = Math.min(b[i] ?? 0, eroded[i] ?? 0)
  }
  let x0 = W
  let y0 = H
  let x1 = -1
  let y1 = -1
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      if ((fin[i] ?? 0) > 24) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        y1 = y
      }
    }
  }
  return { mask: fin, box: x1 >= 0 ? [x0, y0, x1, y1] : null }
}

/** Utsnitt rundt motivet med 4 % luft (IS-10 «Beskjær til motivet»). */
export function cropBox(box: [number, number, number, number], W: number, H: number): { x: number; y: number; w: number; h: number } {
  const [x0, y0, x1, y1] = box
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04)
  const x = Math.max(0, x0 - pad)
  const y = Math.max(0, y0 - pad)
  return { x, y, w: Math.min(W, x1 + pad + 1) - x, h: Math.min(H, y1 + pad + 1) - y }
}

/**
 * Er det maskerte en grafikk (logo/tekst: få flate farger) og ikke et foto? Minst 80 % av pikslene i masken skal ha en
 * av de 16 vanligste fargene (4 bit per kanal). Brukes før «Fjern logo/tekst» fjerner det fargenøkkelen fant.
 */
export function isGraphic(rgba: Uint8ClampedArray, mask: Mask): boolean {
  const counts = new Map<number, number>()
  let n = 0
  for (let i = 0; i < mask.length; i++) {
    if ((mask[i] as number) < 128) continue
    const p = i * 4
    const k = (((rgba[p] as number) >> 4) << 8) | (((rgba[p + 1] as number) >> 4) << 4) | ((rgba[p + 2] as number) >> 4)
    counts.set(k, (counts.get(k) ?? 0) + 1)
    n++
  }
  if (!n) return false
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 16).reduce((a, b) => a + b, 0)
  return top >= 0.8 * n
}

/**
 * Tekst i en firkant (Fjern tekst/logo i et foto): bare bokstavstrekene, ikke alt i firkanten. Strøk som er tydelig
 * lysere (eller mørkere) enn omgivelsene og smalere enn `r` piksler, finnes med morfologisk «top-hat» på lysstyrken
 * (lysstyrken minus en åpning med radius r). Utvides med 3 piksler (kantutjevning). null hvis det ikke ligner tekst
 * (under 0,5 % eller over 60 % av firkanten).
 */
export function textStrokes(rgba: Uint8ClampedArray, W: number, H: number, box: { x0: number; y0: number; x1: number; y1: number }): Mask | null {
  const X0 = Math.max(0, Math.floor(box.x0)), Y0 = Math.max(0, Math.floor(box.y0))
  const w = Math.min(W, Math.ceil(box.x1)) - X0, h = Math.min(H, Math.ceil(box.y1)) - Y0
  if (w < 8 || h < 8) return null
  const L = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = ((Y0 + y) * W + X0 + x) * 4
    L[y * w + x] = Math.round(0.299 * (rgba[p] as number) + 0.587 * (rgba[p + 1] as number) + 0.114 * (rgba[p + 2] as number))
  }
  const r = Math.max(4, Math.round(Math.min(w, h) / 12))
  const open = growMask(growMask(L, w, h, -r), w, h, r)
  const close = growMask(growMask(L, w, h, r), w, h, -r)
  // bakgrunnen: lysstyrken langs kanten av firkanten (median). Lys tekst er lysere enn den, mørk tekst mørkere.
  const hist = new Array<number>(256).fill(0)
  let edge = 0
  for (let x = 0; x < w; x++) { hist[L[x] as number]!++; hist[L[(h - 1) * w + x] as number]!++; edge += 2 }
  for (let y = 1; y < h - 1; y++) { hist[L[y * w] as number]!++; hist[L[y * w + w - 1] as number]!++; edge += 2 }
  let bgL = 0
  let acc = hist[0] as number
  while (bgL < 255 && acc < edge / 2) acc += hist[++bgL] as number
  const hatB = (i: number) => (L[i] as number) - (open[i] as number)
  const hatD = (i: number) => (close[i] as number) - (L[i] as number)
  let bright = 0
  let dark = 0
  for (let i = 0; i < L.length; i++) {
    if (hatB(i) > 50 && (L[i] as number) > bgL + 50) bright++
    if (hatD(i) > 50 && (L[i] as number) < bgL - 50) dark++
  }
  const useBright = bright >= dark
  const hat = useBright ? hatB : hatD
  const strong = (i: number) => hat(i) > 50 && (useBright ? (L[i] as number) > bgL + 50 : (L[i] as number) < bgL - 50)
  // tekstens farge (gjennomsnittet av de tydelige strekene); svakere strek i samme farge tas også med (tekst over lys flate)
  const col = [0, 0, 0]
  let cn = 0
  for (let i = 0; i < L.length; i++) {
    if (!strong(i)) continue
    const p = ((Y0 + ((i / w) | 0)) * W + X0 + (i % w)) * 4
    for (let c = 0; c < 3; c++) col[c] = (col[c] as number) + (rgba[p + c] as number)
    cn++
  }
  if (!cn) return null
  for (let c = 0; c < 3; c++) col[c] = (col[c] as number) / cn
  const k = new Uint8ClampedArray(w * h)
  let n = 0
  for (let i = 0; i < L.length; i++) {
    let on = strong(i)
    if (!on && hat(i) > 15) {
      const p = ((Y0 + ((i / w) | 0)) * W + X0 + (i % w)) * 4
      on = Math.hypot((rgba[p] as number) - (col[0] as number), (rgba[p + 1] as number) - (col[1] as number), (rgba[p + 2] as number) - (col[2] as number)) < 45
    }
    if (on) {
      k[i] = 255
      n++
    }
  }
  if (n < 0.005 * w * h || n > 0.6 * w * h) return null
  const g = growMask(k, w, h, 3)
  const out = new Uint8ClampedArray(W * H)
  for (let y = 0; y < h; y++) out.set(g.subarray(y * w, y * w + w), (Y0 + y) * W + X0)
  return out
}

