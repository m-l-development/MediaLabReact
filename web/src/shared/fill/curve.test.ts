import { describe, expect, it } from 'vitest'
import { curvePoint, onCurve } from './curve'

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
