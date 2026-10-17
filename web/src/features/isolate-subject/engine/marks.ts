import type { Mask } from './mask'

/** Et lokalt maskeutsnitt (fra keyBox) i bildets fulle koordinater. */
export interface KeyMask {
  X0: number
  Y0: number
  w: number
  h: number
  a: Mask
}

/**
 * En markering i «Merk i bildet». Koordinater er andeler av bildet (0–1).
 * `keep` = grønn (behold), ellers rød (fjern). `km` finnes når firkanten ble løst uten AI.
 */
export type Mark =
  | { type: 'point'; x: number; y: number; keep: boolean }
  | { type: 'box'; x0: number; y0: number; x1: number; y1: number; keep: boolean; km: KeyMask | null }

/** Legger et lokalt utsnitt inn i en fullstørrelse maske: «fjern» tar maks, «behold» kutter bort. */
export function applyKeyMask(P: Mask, W: number, k: KeyMask, keep: boolean): void {
  for (let y = 0; y < k.h; y++) {
    for (let x = 0; x < k.w; x++) {
      const i = (k.Y0 + y) * W + k.X0 + x
      const v = k.a[y * k.w + x] ?? 0
      if (keep) {
        const c = 255 - v
        if (c < (P[i] ?? 0)) P[i] = c
      } else if (v > (P[i] ?? 0)) P[i] = v
    }
  }
}

/** Forhåndsvisningen av det som skal fjernes (rødt), fra markeringer som allerede er løst uten AI. */
export function pendingMask(marks: readonly Mark[], W: number, H: number): Mask | null {
  let P: Mask | null = null
  for (const m of marks) {
    if (m.type === 'box' && m.km && !m.keep) applyKeyMask((P ??= new Uint8ClampedArray(W * H)), W, m.km, false)
  }
  if (P) for (const m of marks) if (m.type === 'box' && m.km && m.keep) applyKeyMask(P, W, m.km, true)
  return P && P.some((v) => v > 127) ? P : null
}

/**
 * Finner markeringen brukeren trykket på (siste først), så den kan fjernes igjen.
 * @param radius  treffradius for punkter, i bildepiksler
 */
export function hitMark(marks: readonly Mark[], x: number, y: number, W: number, H: number, radius: number): number {
  const px = Math.floor(x * W)
  const py = Math.floor(y * H)
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i]
    if (!m) continue
    if (m.type === 'box') {
      const k = m.km
      const hit = k
        ? px >= k.X0 && px < k.X0 + k.w && py >= k.Y0 && py < k.Y0 + k.h && (k.a[(py - k.Y0) * k.w + (px - k.X0)] ?? 0) > 127
        : x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1
      if (hit) return i
    } else if (Math.hypot((m.x - x) * W, (m.y - y) * H) <= radius) return i
  }
  return -1
}
