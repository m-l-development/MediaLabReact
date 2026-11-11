import { distance } from './inpaint'
import type { Mask } from './mask'

/**
 * «Gjør uskarp» (egen funksjon, ikke en del av «Fyll med omgivelser»): gjør det merkede området uskarpt med valgt
 * styrke (1–100). Tilnærmet gaussisk uskarphet (tre boksfiltre etter hverandre) innenfor området, med myk kant, så
 * resten av bildet er urørt. Endrer `rgba` på stedet. Returnerer false hvis masken er tom.
 */
export function blurRadius(strength: number, W: number, H: number): number {
  const s = Math.min(100, Math.max(1, strength))
  return Math.max(1, Math.round((s / 100) * Math.max(8, Math.min(W, H) / 25)))
}

function boxPass(src: Float32Array, w: number, h: number, r: number, horizontal: boolean): Float32Array<ArrayBuffer> {
  const out = new Float32Array(src.length)
  const len = horizontal ? w : h, lines = horizontal ? h : w
  const at = (line: number, k: number) => (horizontal ? line * w + k : k * w + line) * 3
  const span = 2 * r + 1
  for (let line = 0; line < lines; line++) {
    for (let c = 0; c < 3; c++) {
      let acc = 0
      for (let k = -r; k <= r; k++) acc += src[at(line, Math.min(len - 1, Math.max(0, k))) + c] as number
      for (let k = 0; k < len; k++) {
        out[at(line, k) + c] = acc / span
        acc += (src[at(line, Math.min(len - 1, k + r + 1)) + c] as number) - (src[at(line, Math.max(0, k - r)) + c] as number)
      }
    }
  }
  return out
}

export function blurArea(rgba: Uint8ClampedArray, W: number, H: number, remove: Mask, strength: number, grow = 0): boolean {
  let x0 = W, y0 = H, x1 = -1, y1 = -1
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
  const r = blurRadius(strength, W, H)
  const feather = Math.max(1, Math.round(r / 3))
  const pad = 3 * r + grow + feather + 1
  const X0 = Math.max(0, x0 - pad), Y0 = Math.max(0, y0 - pad)
  const w = Math.min(W, x1 + pad + 1) - X0, h = Math.min(H, y1 + pad + 1) - Y0
  const n = w * h
  let img: Float32Array<ArrayBuffer> = new Float32Array(n * 3)
  const seed = new Uint8Array(n)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, p = ((Y0 + y) * W + X0 + x) * 4
      img[i * 3] = rgba[p] as number; img[i * 3 + 1] = rgba[p + 1] as number; img[i * 3 + 2] = rgba[p + 2] as number
      seed[i] = (remove[(Y0 + y) * W + X0 + x] ?? 0) > 20 ? 1 : 0
    }
  }
  const orig = img
  for (let k = 0; k < 3; k++) img = boxPass(boxPass(img, w, h, r, true), w, h, r, false)
  const d = distance(seed, w, h)
  for (let i = 0; i < n; i++) {
    const di = (d[i] as number) - grow
    const t = di <= 0 ? 1 : di >= feather ? 0 : 1 - di / feather
    if (!t) continue
    const x = i % w, y = (i / w) | 0, p = ((Y0 + y) * W + X0 + x) * 4
    for (let c = 0; c < 3; c++) rgba[p + c] = Math.round((orig[i * 3 + c] as number) * (1 - t) + (img[i * 3 + c] as number) * t)
  }
  return true
}
