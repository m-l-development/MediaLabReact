/**
 * Alfa-masker for Isolate Subject. Rene funksjoner over piksler (ingen DOM), så de kan testes.
 * Samme regler og terskler som dagens verktøy (media-lab/src/pages/isolate-subject/logic.js), slik at resultatet blir likt.
 * En maske er én byte per piksel: 0 = fjernet, 255 = beholdt.
 */

export type Mask = Uint8ClampedArray

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

/** Separabelt minimumsfilter (krymper masken) – glidende vindu med deque, O(n). */
function minLine(inp: Mask, out: Mask, base: number, step: number, len: number, r: number, q: Int32Array) {
  let h = 0
  let t = 0
  for (let k = 0; k < len + r; k++) {
    if (k < len) {
      const v = inp[base + k * step] ?? 0
      while (t > h && (inp[base + (q[t - 1] ?? 0) * step] ?? 0) >= v) t--
      q[t++] = k
    }
    const c = k - r
    if (c >= 0) {
      while ((q[h] ?? 0) < c - r) h++
      out[base + c * step] = inp[base + (q[h] ?? 0) * step] ?? 0
    }
  }
}

/** Separabel boksuskarphet. */
function blurLine(inp: Mask, out: Mask, base: number, step: number, len: number, r: number) {
  let s = 0
  let n = 0
  for (let k = 0; k < Math.min(len, r + 1); k++) {
    s += inp[base + k * step] ?? 0
    n++
  }
  for (let c = 0; c < len; c++) {
    out[base + c * step] = s / n
    const a = c + r + 1
    if (a < len) {
      s += inp[base + a * step] ?? 0
      n++
    }
    const b = c - r
    if (b >= 0) {
      s -= inp[base + b * step] ?? 0
      n--
    }
  }
}

export function separable(src: Mask, W: number, H: number, r: number, kind: 'min' | 'blur'): Mask {
  const tmp = new Uint8ClampedArray(W * H)
  const out = new Uint8ClampedArray(W * H)
  const q = new Int32Array(Math.max(W, H))
  if (kind === 'min') {
    for (let y = 0; y < H; y++) minLine(src, tmp, y * W, 1, W, r, q)
    for (let x = 0; x < W; x++) minLine(tmp, out, x, W, H, r, q)
  } else {
    for (let y = 0; y < H; y++) blurLine(src, tmp, y * W, 1, W, r)
    for (let x = 0; x < W; x++) blurLine(tmp, out, x, W, H, r)
  }
  return out
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
