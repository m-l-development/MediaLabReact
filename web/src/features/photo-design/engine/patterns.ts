import type { Paint, Stop } from '../../thumbnail-studio/engine/paint'

/**
 * Mønstre for former i Photo Design (fase 4, Photo-guiden punkt 4 og 6): korn, striper, rutenett, prikker, bølgelinjer,
 * strekkode og stjernehimmel – som maling (engine/paint.ts) i formens størrelse. Oppskriftene er de samme som i
 * materialets CSS (repeating-linear-/radial-gradient, feTurbulence-korn); fargen er formens kantfarge.
 */
export const PATTERNS = [
  ['none', 'Ingen'], ['grain', 'Korn'], ['stripes', 'Striper'], ['grid', 'Rutenett'], ['dots', 'Prikker'], ['waves', 'Bølgelinjer'], ['barcode', 'Strekkode'], ['stars', 'Stjernehimmel'],
] as const
export type PatternKey = (typeof PATTERNS)[number][0]

const T = 'rgba(0,0,0,0)'

/** Mønsteret som maling for en flate w × h; `c` = farge, `s` = rutestørrelse (px). */
export function patternPaint(k: string, c: string, w: number, h: number, s = 24): Paint[] {
  const st = (...v: [number, string][]): Stop[] => v
  if (k === 'grain') return [{ k: 'grain', sc: Math.max(0.5, w / 1280) }]
  if (k === 'stripes') return [{ k: 'lin', x1: 0, y1: 0, x2: s, y2: s, rep: true, st: st([0, c], [0.25, c], [0.25, T], [1, T]) }]
  if (k === 'grid') {
    return [
      { k: 'lin', x1: 0, y1: 0, x2: 0, y2: s, st: st([0, c], [1.5 / s, c], [1.5 / s, T], [1, T]), tile: [s, s, 0, 0] },
      { k: 'lin', x1: 0, y1: 0, x2: s, y2: 0, st: st([0, c], [1.5 / s, c], [1.5 / s, T], [1, T]), tile: [s, s, 0, 0] },
    ]
  }
  if (k === 'dots') return [{ k: 'rad', cx: s / 2, cy: s / 2, rx: s / 2, ry: s / 2, st: st([0, c], [0.18, c], [0.24, T], [1, T]), tile: [s, s, 0, 0] }]
  if (k === 'waves') return [{ k: 'rad', cx: w / 2, cy: h, rx: s, ry: s, rep: true, st: st([0, T], [0.8, T], [0.8, c], [1, c]) }]
  if (k === 'barcode') {
    // strek og mellomrom i ujevne bredder (som en ekte strekkode), gjentatt
    const u = Math.max(1, w / 120)
    const bars = [2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1]
    const sum = bars.reduce((a, b) => a + b, 0) * u
    const out: Stop[] = []
    let x = 0
    bars.forEach((b, i) => {
      const col = i % 2 ? T : c
      out.push([x / sum, col], [(x + b * u) / sum, col])
      x += b * u
    })
    return [{ k: 'lin', x1: 0, y1: 0, x2: sum, y2: 0, rep: true, st: out }]
  }
  if (k === 'stars') {
    return [
      { k: 'rad', cx: s * 0.3, cy: s * 0.4, rx: s * 0.06, ry: s * 0.06, st: st([0, c], [1, T]), tile: [s * 2.2, s * 2.2, 0, 0] },
      { k: 'rad', cx: s * 1.4, cy: s * 1.5, rx: s * 0.04, ry: s * 0.04, st: st([0, c], [1, T]), tile: [s * 2.2, s * 2.2, 0, 0] },
      { k: 'rad', cx: s * 2.6, cy: s * 0.9, rx: s * 0.05, ry: s * 0.05, st: st([0, c], [1, T]), tile: [s * 3.1, s * 3.1, 0, 0] },
    ]
  }
  return []
}
