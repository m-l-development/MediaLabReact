import type { Mask } from './mask'

/**
 * «Fyll med omgivelser» (IS-07): fyller områder som fjernes, med farger fra omgivelsene (push-pull-pyramide)
 * og litt støy i samme styrke som bildets egen tekstur. Dette er den eneste operasjonen som endrer piksler i motivet,
 * og den kjøres bare når brukeren uttrykkelig har valgt den.
 *
 * Endrer `rgba` (hele bildet, W×H) på stedet innenfor området rundt masken. Returnerer false hvis masken er tom.
 * `random` kan låses i tester.
 */
export function inpaint(rgba: Uint8ClampedArray, W: number, H: number, remove: Mask, random: () => number = Math.random): boolean {
  let x0 = W
  let y0 = H
  let x1 = -1
  let y1 = -1
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      if ((remove[i] ?? 0) > 20) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return false
  const mg = Math.max(24, Math.round(Math.max(x1 - x0, y1 - y0) * 0.15))
  const X0 = Math.max(0, x0 - mg)
  const Y0 = Math.max(0, y0 - mg)
  const X1 = Math.min(W, x1 + mg + 1)
  const Y1 = Math.min(H, y1 + mg + 1)
  const w = X1 - X0
  const h = Y1 - Y0
  const n = w * h
  const px = (lx: number, ly: number) => ((Y0 + ly) * W + X0 + lx) * 4

  // 2 = skal fylles helt, 1 = overgangssone (blandes 60 %), 0 = urørt.
  let M = new Uint8Array(n)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) M[y * w + x] = (remove[(Y0 + y) * W + X0 + x] ?? 0) > 20 ? 2 : 0
  const grow = Math.max(2, Math.round(Math.min(W, H) / 400))
  for (let p = 0; p < grow; p++) {
    const next = M.slice()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (M[i]) continue
        if ((x > 0 && M[i - 1]) || (x < w - 1 && M[i + 1]) || (y > 0 && M[i - w]) || (y < h - 1 && M[i + w])) next[i] = 1
      }
    }
    M = next
  }

  const lum = (lx: number, ly: number) => {
    const p = px(lx, ly)
    return (rgba[p] ?? 0) * 0.3 + (rgba[p + 1] ?? 0) * 0.59 + (rgba[p + 2] ?? 0) * 0.11
  }
  let hs = 0
  let hn = 0
  const c = new Float32Array(n * 3)
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (M[i]) continue
    const lx = i % w
    const ly = (i / w) | 0
    const p = px(lx, ly)
    a[i] = 1
    c[i * 3] = rgba[p] ?? 0
    c[i * 3 + 1] = rgba[p + 1] ?? 0
    c[i * 3 + 2] = rgba[p + 2] ?? 0
    if (lx < w - 1 && !M[i + 1]) {
      hs += Math.abs(lum(lx, ly) - lum(lx + 1, ly))
      hn++
    }
  }

  // Push: halver oppløsningen til 1×1 og ta gjennomsnittet av kjente piksler.
  type Level = { w: number; h: number; c: Float32Array; a: Float32Array }
  const L: Level[] = [{ w, h, c, a }]
  for (let top = L[0] as Level; top.w > 1 || top.h > 1; top = L[L.length - 1] as Level) {
    const w2 = Math.ceil(top.w / 2)
    const h2 = Math.ceil(top.h / 2)
    const c2 = new Float32Array(w2 * h2 * 3)
    const a2 = new Float32Array(w2 * h2)
    for (let y = 0; y < top.h; y++) {
      for (let x = 0; x < top.w; x++) {
        const i = y * top.w + x
        const j = (y >> 1) * w2 + (x >> 1)
        a2[j] = (a2[j] ?? 0) + (top.a[i] ?? 0)
        for (let ch = 0; ch < 3; ch++) c2[j * 3 + ch] = (c2[j * 3 + ch] ?? 0) + (top.c[i * 3 + ch] ?? 0)
      }
    }
    for (let j = 0; j < a2.length; j++) {
      if ((a2[j] ?? 0) > 1) {
        const s = 1 / (a2[j] ?? 1)
        for (let ch = 0; ch < 3; ch++) c2[j * 3 + ch] = (c2[j * 3 + ch] ?? 0) * s
        a2[j] = 1
      }
    }
    L.push({ w: w2, h: h2, c: c2, a: a2 })
  }

  // Pull: fyll ukjente piksler fra nivået over med bilineær interpolasjon.
  for (let l = L.length - 2; l >= 0; l--) {
    const p = L[l] as Level
    const q = L[l + 1] as Level
    const Q = (j: number, ch: number) => (q.c[j * 3 + ch] ?? 0) / Math.max(q.a[j] ?? 0, 1e-6)
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const i = y * p.w + x
        if ((p.a[i] ?? 0) >= 1) continue
        const fx = Math.min(q.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5))
        const fy = Math.min(q.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5))
        const xa = fx | 0
        const ya = fy | 0
        const xb = Math.min(q.w - 1, xa + 1)
        const yb = Math.min(q.h - 1, ya + 1)
        const tx = fx - xa
        const ty = fy - ya
        const k = 1 - (p.a[i] ?? 0)
        for (let ch = 0; ch < 3; ch++) {
          const v = (Q(ya * q.w + xa, ch) * (1 - tx) + Q(ya * q.w + xb, ch) * tx) * (1 - ty)
            + (Q(yb * q.w + xa, ch) * (1 - tx) + Q(yb * q.w + xb, ch) * tx) * ty
          p.c[i * 3 + ch] = (p.c[i * 3 + ch] ?? 0) + k * v
        }
        p.a[i] = 1
      }
    }
  }

  const amp = Math.min(14, (hn ? hs / hn : 0) * 0.9)
  for (let i = 0; i < n; i++) {
    const m = M[i] ?? 0
    if (!m) continue
    const t = m === 2 ? 1 : 0.6
    const noise = (random() * 2 - 1) * amp
    const p = px(i % w, (i / w) | 0)
    for (let ch = 0; ch < 3; ch++) rgba[p + ch] = Math.round((rgba[p + ch] ?? 0) * (1 - t) + ((c[i * 3 + ch] ?? 0) + noise) * t)
  }
  return true
}
