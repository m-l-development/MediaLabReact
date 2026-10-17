import { keyRegion } from './keybox'
import type { KeyMask } from './marks'
import type { Mask } from './mask'

/** Canvas-hjelpere (nettleser). Holdes adskilt fra de rene funksjonene i mask.ts/keybox.ts/inpaint.ts. */

export const MAX_SIDE = 8192
export const MAX_BYTES = 40 * 1024 * 1024
export const ACCEPT = /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w)
  c.height = Math.max(1, h)
  return c
}

function ctx(c: HTMLCanvasElement, willRead = false): CanvasRenderingContext2D {
  const g = c.getContext('2d', willRead ? { willReadFrequently: true } : undefined)
  if (!g) throw new Error('Canvas er ikke tilgjengelig')
  return g
}

/** Leser et bilde til et lerret, nedskalert til maks 8192 px på lengste side. */
export async function loadToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob)
  try {
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const c = makeCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k))
    ctx(c).drawImage(bmp, 0, 0, c.width, c.height)
    return c
  } finally {
    bmp.close()
  }
}

export function rgbaOf(c: HTMLCanvasElement): Uint8ClampedArray {
  return ctx(c, true).getImageData(0, 0, c.width, c.height).data
}

export function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w, h)
  ctx(c).drawImage(src, x, y, w, h, 0, 0, w, h)
  return c
}

export function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height)
  ctx(c).drawImage(src, 0, 0)
  return c
}

export function putRgba(c: HTMLCanvasElement, rgba: Uint8ClampedArray): void {
  const g = ctx(c)
  const id = g.createImageData(c.width, c.height)
  id.data.set(rgba)
  g.putImageData(id, 0, 0)
}

/** Maske → lerret med hvit farge og masken som alfa (til `destination-in`). */
export function maskCanvas(mask: Mask, W: number, H: number, into?: HTMLCanvasElement): HTMLCanvasElement {
  const c = into ?? makeCanvas(W, H)
  c.width = W
  c.height = H
  const g = ctx(c)
  const id = g.createImageData(W, H)
  const d = id.data
  for (let i = 0; i < mask.length; i++) {
    d[i * 4] = 255
    d[i * 4 + 1] = 255
    d[i * 4 + 2] = 255
    d[i * 4 + 3] = mask[i] ?? 0
  }
  g.putImageData(id, 0, 0)
  return c
}

export function toBlob(c: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Bildet kunne ikke lagres'))), type))
}

/** Skalerer et lerret til et annet lerrets størrelse og leser alfa-kanalen. */
export function alphaAtSize(src: CanvasImageSource, W: number, H: number, channel: 0 | 3 = 3): Mask {
  const t = makeCanvas(W, H)
  const g = ctx(t, true)
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, W, H)
  const d = g.getImageData(0, 0, W, H).data
  const a = new Uint8ClampedArray(W * H)
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + channel] ?? 0
  return a
}

/** «Merk i bildet» med firkant uten AI: utsnitt rundt firkanten, nedskalert til maks 520 px og lett uskarpt. */
export function keyBox(src: HTMLCanvasElement, box: { x0: number; y0: number; x1: number; y1: number }): KeyMask | null {
  const W = src.width
  const H = src.height
  const bx0 = Math.max(0, Math.floor(box.x0 * W))
  const bx1 = Math.min(W, Math.ceil(box.x1 * W))
  const by0 = Math.max(0, Math.floor(box.y0 * H))
  const by1 = Math.min(H, Math.ceil(box.y1 * H))
  if (bx1 - bx0 < 4 || by1 - by0 < 4) return null
  const pd = Math.max(8, Math.round(Math.max(bx1 - bx0, by1 - by0) * 0.08))
  const X0 = Math.max(0, bx0 - pd)
  const X1 = Math.min(W, bx1 + pd)
  const Y0 = Math.max(0, by0 - pd)
  const Y1 = Math.min(H, by1 + pd)
  const w = X1 - X0
  const h = Y1 - Y0
  const k = Math.min(1, 520 / Math.max(w, h))
  const sw = Math.max(4, Math.round(w * k))
  const sh = Math.max(4, Math.round(h * k))
  const sc = makeCanvas(sw, sh)
  const sg = ctx(sc, true)
  sg.imageSmoothingQuality = 'high'
  sg.filter = `blur(${Math.max(0.6, Math.min(2, Math.max(sw, sh) / 320))}px)`
  sg.drawImage(src, X0, Y0, w, h, 0, 0, sw, sh)
  sg.filter = 'none'
  const r = keyRegion(sg.getImageData(0, 0, sw, sh).data, sw, sh, {
    x0: Math.floor((bx0 - X0) * k), x1: Math.ceil((bx1 - X0) * k), y0: Math.floor((by0 - Y0) * k), y1: Math.ceil((by1 - Y0) * k),
  }, k)
  if (r.kind === 'none') return null
  if (r.kind === 'full') {
    const bw = bx1 - bx0
    const bh = by1 - by0
    return { X0: bx0, Y0: by0, w: bw, h: bh, a: new Uint8ClampedArray(bw * bh).fill(255) }
  }
  // Tilbake til full størrelse med myk kant.
  const mc = maskCanvas(r.mask, sw, sh)
  const oc = makeCanvas(w, h)
  const og = ctx(oc, true)
  const pad = Math.max(1, Math.round(1 / k))
  og.imageSmoothingEnabled = true
  og.imageSmoothingQuality = 'high'
  og.filter = `blur(${Math.min(3, pad * 0.6)}px)`
  og.drawImage(mc, 0, 0, w, h)
  og.filter = 'none'
  const od = og.getImageData(0, 0, w, h).data
  const a = new Uint8ClampedArray(w * h)
  for (let i = 0; i < a.length; i++) {
    const v = od[i * 4 + 3] ?? 0
    a[i] = v > 90 ? 255 : v < 12 ? 0 : Math.round(((v - 12) / 78) * 255)
  }
  return { X0, Y0, w, h, a }
}
