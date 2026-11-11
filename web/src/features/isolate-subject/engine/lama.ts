import { defaultGrow, distance } from './inpaint'
import type { Mask } from './mask'

/**
 * «Fyll med omgivelser» med AI (IS-07): LaMa (Large Mask Inpainting, Suvorov m.fl. 2022, Apache 2.0), ONNX-eksporten
 * Carve/LaMa-ONNX, lokalt i nettleseren via transformers.js (samme som de andre AI-modellene; bildet sendes aldri ut).
 * Modellen tegner det som sannsynligvis er bak objektet (struktur, lys, perspektiv), ikke bare farger fra kanten.
 *
 * Her er alt rundt selve modellkallet (rent og testbart): utsnittet rundt området, 512×512-inndata, og innsettingen
 * tilbake i full oppløsning bare i området som fjernes, med fargejustering mot kanten og myk overgang på 2 piksler.
 */
export const LAMA_ID = 'Carve/LaMa-ONNX'
export const LAMA_FILE = 'lama_fp32'
export const SIZE = 512

/** Modellkallet: bilde (1×3×512×512, 0–1) og maske (1×1×512×512, 1 = fjern) → bilde (1×3×512×512, 0–255). */
export type LamaRun = (image: Float32Array, mask: Float32Array) => Promise<Float32Array>

interface Box { x0: number; y0: number; x1: number; y1: number }

function bounds(remove: Mask, W: number, H: number): Box | null {
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
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

/** Utsnittet modellen ser: området med god margin rundt (helst kvadratisk, så bildet ikke strekkes). */
export function lamaCrop(b: Box, W: number, H: number, grow: number): { x: number; y: number; w: number; h: number } {
  const bw = b.x1 - b.x0 + 1 + 2 * grow, bh = b.y1 - b.y0 + 1 + 2 * grow
  const side = Math.max(256, Math.round(Math.max(bw, bh) * 1.4 + 32))
  const w = Math.min(W, side), h = Math.min(H, side)
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2
  const x = Math.round(Math.min(W - w, Math.max(0, cx - w / 2)))
  const y = Math.round(Math.min(H - h, Math.max(0, cy - h / 2)))
  return { x, y, w, h }
}

/** Skalerer et bilde med `ch` kanaler: gjennomsnitt over flaten ved nedskalering, bilineært ved oppskalering. */
export function resample(src: Float32Array, sw: number, sh: number, dw: number, dh: number, ch: number): Float32Array {
  const out = new Float32Array(dw * dh * ch)
  const kx = sw / dw, ky = sh / dh
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const o = (y * dw + x) * ch
      if (kx > 1 || ky > 1) {
        const xa = Math.floor(x * kx), xb = Math.max(xa + 1, Math.min(sw, Math.floor((x + 1) * kx)))
        const ya = Math.floor(y * ky), yb = Math.max(ya + 1, Math.min(sh, Math.floor((y + 1) * ky)))
        const n = (xb - xa) * (yb - ya)
        for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) for (let c = 0; c < ch; c++) out[o + c] = (out[o + c] as number) + (src[(yy * sw + xx) * ch + c] as number) / n
      } else {
        const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) * kx - 0.5)), fy = Math.min(sh - 1, Math.max(0, (y + 0.5) * ky - 0.5))
        const xa = fx | 0, ya = fy | 0, xb = Math.min(sw - 1, xa + 1), yb = Math.min(sh - 1, ya + 1), tx = fx - xa, ty = fy - ya
        for (let c = 0; c < ch; c++) {
          const v = (q: number, r: number) => src[(r * sw + q) * ch + c] as number
          out[o + c] = (v(xa, ya) * (1 - tx) + v(xb, ya) * tx) * (1 - ty) + (v(xa, yb) * (1 - tx) + v(xb, yb) * tx) * ty
        }
      }
    }
  }
  return out
}

/**
 * Fyller området med LaMa. Endrer `rgba` bare i området (masken utvidet med `grow`) og 2 piksler myk overgang utenfor.
 * Returnerer false hvis masken er tom.
 */
export async function lamaFill(rgba: Uint8ClampedArray, W: number, H: number, remove: Mask, run: LamaRun, grow = defaultGrow(W, H)): Promise<boolean> {
  const b = bounds(remove, W, H)
  if (!b) return false
  const c = lamaCrop(b, W, H, grow)
  const n = c.w * c.h
  // området i utsnittet, utvidet med `grow` (kantutjevning og skygger rundt objektet)
  const seed = new Uint8Array(n)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) seed[y * c.w + x] = (remove[(c.y + y) * W + c.x + x] ?? 0) > 20 ? 1 : 0
  const out = distance(seed, c.w, c.h) // avstand til området (0 inni)
  const hole = new Uint8Array(n)
  for (let i = 0; i < n; i++) hole[i] = (out[i] as number) <= grow ? 1 : 0

  const img = new Float32Array(n * 3)
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const p = ((c.y + y) * W + c.x + x) * 4, i = (y * c.w + x) * 3
      img[i] = rgba[p] as number; img[i + 1] = rgba[p + 1] as number; img[i + 2] = rgba[p + 2] as number
    }
  }
  const small = resample(img, c.w, c.h, SIZE, SIZE, 3)
  const smallMask = resample(Float32Array.from(hole), c.w, c.h, SIZE, SIZE, 1)
  const S2 = SIZE * SIZE
  const image = new Float32Array(3 * S2), mask = new Float32Array(S2)
  for (let i = 0; i < S2; i++) {
    for (let ch = 0; ch < 3; ch++) image[ch * S2 + i] = (small[i * 3 + ch] as number) / 255
    // hele området skal med: også piksler som bare delvis ligger i det
    mask[i] = (smallMask[i] as number) > 0.01 ? 1 : 0
  }
  const res = await run(image, mask)
  const back = new Float32Array(S2 * 3)
  for (let i = 0; i < S2; i++) for (let ch = 0; ch < 3; ch++) back[i * 3 + ch] = res[ch * S2 + i] as number
  const up = resample(back, SIZE, SIZE, c.w, c.h, 3)

  // fargejustering: modellen kan forskyve fargene litt; gjennomsnittet i en ring rett utenfor området skal stemme
  const near = distance(hole, c.w, c.h)
  const off = [0, 0, 0]
  let cnt = 0
  for (let i = 0; i < n; i++) {
    const d = near[i] as number
    if (hole[i] || d > 8) continue
    for (let ch = 0; ch < 3; ch++) off[ch] = (off[ch] as number) + (img[i * 3 + ch] as number) - (up[i * 3 + ch] as number)
    cnt++
  }
  if (cnt) for (let ch = 0; ch < 3; ch++) off[ch] = (off[ch] as number) / cnt
  for (let i = 0; i < n; i++) {
    const d = near[i] as number
    // inni: modellens bilde; 1–2 piksler utenfor: myk overgang mot originalen
    const t = hole[i] ? 1 : d <= 1 ? 0.5 : d <= 2 ? 0.25 : 0
    if (!t) continue
    const x = i % c.w, y = (i / c.w) | 0
    const p = ((c.y + y) * W + c.x + x) * 4
    for (let ch = 0; ch < 3; ch++) rgba[p + ch] = Math.round((rgba[p + ch] as number) * (1 - t) + ((up[i * 3 + ch] as number) + (off[ch] as number)) * t)
  }
  return true
}
