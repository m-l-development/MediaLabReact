/**
 * Hjul og fingre i maskeredigeringen (MaskEditor): én forutsigbar tolkning for mus og styreflate.
 *
 * - Musehjul (trinn: deltaMode linje/side, eller hele trinn ≥ 50 px uten sidebevegelse) zoomer i faste trinn på 1,25×
 *   ved markøren – samme trinn som −/+ i verktøylinjen.
 * - Styreflate: to fingre flytter (deltaX/deltaY); knip kommer som hjul med ctrlKey og zoomer jevnt.
 * - Ctrl/⌘ + hjul zoomer alltid; Shift + hjul flytter sideveis; Alt + hjul endrer penselstørrelsen.
 */
export type WheelAction = { kind: 'zoom'; f: number } | { kind: 'pan'; dx: number; dy: number } | { kind: 'size'; f: number }

export interface WheelLike {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export const ZOOM_STEP = 1.25
const LINE = 16

/** Hjul fra en mus med hakk (ikke en styreflate eller en mus med jevn rulling). */
export function isNotchedWheel(e: WheelLike): boolean {
  if (e.deltaMode !== 0) return true
  return e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50
}

export function wheelAction(e: WheelLike, pageHeight: number): WheelAction {
  const unit = e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? Math.max(1, pageHeight) : 1
  const dx = e.deltaX * unit
  const dy = e.deltaY * unit
  if (e.altKey) return { kind: 'size', f: Math.exp(-Math.max(-200, Math.min(200, dy)) * 0.002) }
  const notched = isNotchedWheel(e)
  if (e.ctrlKey || e.metaKey || (notched && !e.shiftKey)) {
    if (dy === 0) return { kind: 'pan', dx: 0, dy: 0 }
    if (notched) {
      // ett trinn per hakk (Windows: 100–120 px per hakk); store sprang begrenses til 3 trinn
      const steps = Math.max(1, Math.min(3, Math.round(Math.abs(dy) / 100)))
      return { kind: 'zoom', f: Math.pow(ZOOM_STEP, -Math.sign(dy) * steps) }
    }
    // knip/jevn rulling: små, kontinuerlige verdier; begrens sprang så én hendelse aldri gir mer enn ca. 1,8×
    return { kind: 'zoom', f: Math.exp(-Math.max(-60, Math.min(60, dy)) * 0.01) }
  }
  if (e.shiftKey && dx === 0) return { kind: 'pan', dx: dy, dy: 0 }
  return { kind: 'pan', dx, dy }
}

/** To fingre: ny skala og forskyvning slik at punktet mellom fingrene følger fingrene. */
export function pinchView(start: { s: number; ox: number; oy: number; mx: number; my: number; dist: number }, now: { mx: number; my: number; dist: number }, min = 0.02, max = 32): { s: number; ox: number; oy: number } {
  const s = Math.max(min, Math.min(max, start.s * (now.dist / Math.max(1, start.dist))))
  // bildepunktet under startmidtpunktet skal ligge under det nye midtpunktet
  const ix = (start.mx - start.ox) / start.s
  const iy = (start.my - start.oy) / start.s
  return { s, ox: now.mx - ix * s, oy: now.my - iy * s }
}
