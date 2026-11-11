import { describe, expect, it } from 'vitest'
import { curvePoint, onCurve } from './curve'
import { curveStops, fillOn } from './fill'

/** TB-D8AE3F: punktet i kurveflaten skal havne der pekeren er (rutenettet 0–100 i viewBox -3 -3 106 106). */
describe('kurveflaten', () => {
  const svg = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 212, height: 212 }) } as unknown as SVGSVGElement
  it('rutenettets hjørner og midte gir 0, 1 og 0,5 (ikke hele SVG-en)', () => {
    expect(curvePoint(svg, { clientX: 6, clientY: 206 })).toEqual([0, 0])
    expect(curvePoint(svg, { clientX: 206, clientY: 6 })).toEqual([1, 1])
    const [x, y] = curvePoint(svg, { clientX: 106, clientY: 106 })
    expect(x).toBeCloseTo(0.5, 5)
    expect(y).toBeCloseTo(0.5, 5)
  })
  it('nytt punkt legges på kurven, så et klikk alene ikke endrer bildet', () => {
    expect(onCurve([[0, 0], [1, 1]], 0.3)).toEqual([0.3, 0.3])
    expect(onCurve([[0, 0], [0.5, 0.8], [1, 1]], 0.5)[1]).toBeCloseTo(0.8, 5)
  })
})

describe('fargekurve-gradienten: fargestyrke og av/på', () => {
  const span = (st: { c: string }[]) => {
    const v = st.map((q) => parseInt(q.c.slice(1, 3), 16))
    return Math.max(...v) - Math.min(...v)
  }
  it('fargestyrke virker også på gråtoner: 0 = flat, mer = sterkere; uten verdi som før', () => {
    expect(span(curveStops({}, 8, 1, 0))).toBe(0)
    expect(span(curveStops({}, 8, 1, 0.5))).toBeLessThan(span(curveStops({}, 8, 1, 1)))
    expect(curveStops({}, 8, 1)).toEqual(curveStops({}, 8, 1, 1))
    expect(span(curveStops({ m: [[0, 0.25], [1, 0.75]] }, 8, 1, 2))).toBeGreaterThan(span(curveStops({ m: [[0, 0.25], [1, 0.75]] }, 8, 1, 1)))
  })
  it('et avslått fyll tegnes ikke, men beholder innstillingene', () => {
    expect(fillOn({ mode: 'curves', angle: 30, off: true })).toBe(false)
    expect(fillOn({ mode: 'curves', angle: 30 })).toBe(true)
    expect(fillOn({ mode: 'none' })).toBe(false)
    expect(fillOn(null)).toBe(false)
  })
})
