/**
 * Felles navigering på arbeidsflater (lerret, maskeredigering, slide-forhåndsvisning): én forutsigbar tolkning av hjul og
 * styreflate i alle verktøyene. Gjelder bare over selve arbeidsflaten – paneler, lister, menyer og sider ruller som vanlig.
 *
 * - Shift + hjul zoomer rundt punktet under pekeren: musehjul med hakk = faste trinn på 1,25× (samme som −/+),
 *   styreflate = jevn zoom som følger bevegelsen. Uten Shift zoomer hjulet aldri (vanlig redigering forstyrres ikke).
 * - Knip på styreflaten (hjul med ctrlKey) og Ctrl/⌘ + hjul zoomer også (ellers ville nettleseren zoomet hele siden).
 * - Vanlig rulling (loddrett og sidelengs) ruller flaten som en vanlig side.
 * - Alt + hjul er ledig for verktøyet (f.eks. penselstørrelse).
 * På berøringsskjerm: knip med to fingre zoomer rundt punktet mellom fingrene; én finger redigerer som vanlig.
 * Panorering i alle retninger: mellomrom + dra eller dra med midtknappen (ikke hjulet).
 */
export type WheelAction = { kind: 'zoom'; f: number } | { kind: 'pan'; dx: number; dy: number } | { kind: 'alt'; f: number } | { kind: 'none' }

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
  // Shift + hjul kommer ofte som sidelengs rulling (deltaX) fra nettleseren
  const d = e.deltaY || e.deltaX
  return (e.deltaX === 0 || e.deltaY === 0) && Number.isInteger(d) && Math.abs(d) >= 50
}

export function wheelAction(e: WheelLike, pageHeight: number): WheelAction {
  const unit = e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? Math.max(1, pageHeight) : 1
  const dx = e.deltaX * unit
  const dy = e.deltaY * unit
  if (e.altKey) return { kind: 'alt', f: Math.exp(-Math.max(-200, Math.min(200, dy || dx)) * 0.002) }
  // uten Shift (og uten knip/Ctrl/⌘): vanlig rulling, aldri zoom
  if (!e.shiftKey && !e.ctrlKey && !e.metaKey) return dx === 0 && dy === 0 ? { kind: 'none' } : { kind: 'pan', dx, dy }
  // Shift + hjul (nettlesere sender det som deltaY eller deltaX), knip på styreflaten eller Ctrl/⌘ + hjul: zoom
  const d = dy || dx
  if (d === 0) return { kind: 'none' }
  if (isNotchedWheel(e)) {
    // ett trinn per hakk (Windows: 100–120 px per hakk); store sprang begrenses til 3 trinn
    const steps = Math.max(1, Math.min(3, Math.round(Math.abs(d) / 100)))
    return { kind: 'zoom', f: Math.pow(ZOOM_STEP, -Math.sign(d) * steps) }
  }
  // styreflate (knip eller Shift + to fingre): jevn zoom, begrenset per hendelse
  return { kind: 'zoom', f: Math.exp(-Math.max(-60, Math.min(60, d)) * 0.01) }
}

/** To fingre (berøring): ny skala og forskyvning slik at punktet mellom fingrene følger fingrene. */
export function pinchView(start: { s: number; ox: number; oy: number; mx: number; my: number; dist: number }, now: { mx: number; my: number; dist: number }, min = 0.02, max = 32): { s: number; ox: number; oy: number } {
  const s = Math.max(min, Math.min(max, start.s * (now.dist / Math.max(1, start.dist))))
  const ix = (start.mx - start.ox) / start.s
  const iy = (start.my - start.oy) / start.s
  return { s, ox: now.mx - ix * s, oy: now.my - iy * s }
}

/**
 * Zoom i en rullbar beholder (lerretet ligger i et element med overflow: auto og størrelse = skala): rullingen etter at
 * den nye størrelsen er lagt ut, slik at dokumentpunktet under pekeren står stille. `before` er innholdets rektangel og
 * pekeren før zoom; kalles etter at layout har den nye størrelsen.
 */
export function anchorScroll(scroller: HTMLElement, content: HTMLElement, before: { left: number; top: number; width: number; height: number; px: number; py: number }): void {
  const fx = (before.px - before.left) / Math.max(1, before.width)
  const fy = (before.py - before.top) / Math.max(1, before.height)
  const r = content.getBoundingClientRect()
  scroller.scrollLeft += r.left + fx * r.width - before.px
  scroller.scrollTop += r.top + fy * r.height - before.py
}

/** Er hendelsens mål et sted der tastetrykk og innliming tilhører brukeren (tekst, valg, redigerbart)? */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false
  if (t.closest('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]), textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')) return true
  return false
}
