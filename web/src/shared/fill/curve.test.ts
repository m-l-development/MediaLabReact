import { describe, expect, it } from 'vitest'
import { curvePoint, onCurve } from './curve'
import { curveStops, fillOn, gradColors } from './fill'

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

describe('fargekurve-gradient med egne farger (én modell: fargestopp + fordelingskurve)', () => {
  const base = { mode: 'curves' as const, cstops: [{ c: '#0000ff', p: 0 }, { c: '#800080', p: 0.33 }, { c: '#ff69b4', p: 0.66 }, { c: '#ffff00', p: 1 }] }
  it('fargene brukeren valgte, i den rekkefølgen (ingen svart grunnfarge)', () => {
    const g = gradColors(base, 3)
    expect(g[0]?.slice(0, 3)).toEqual([0, 0, 255])
    expect(g[3]?.slice(0, 3)).toEqual([255, 255, 0])
  })
  it('kurven flytter overgangene, men fargene er de samme', () => {
    const even = gradColors(base, 10)
    const late = gradColors({ ...base, dist: [[0, 0], [0.5, 0.1], [1, 1]] }, 10)
    expect(late[0]).toEqual(even[0])
    expect(late[10]).toEqual(even[10])
    // midt på flaten er vi fortsatt nær den første fargen (blå), ikke rosa
    expect((late[5]?.[2] ?? 0)).toBeGreaterThan(even[5]?.[2] ?? 0)
  })
  it('transparens og fargestyrke virker; eldre gradienter (bare RGB-kurver) som før', () => {
    expect(gradColors({ ...base, calpha: 0.25 }, 2)[1]?.[3]).toBeCloseTo(0.25, 3)
    const flat = gradColors({ ...base, cint: 0 }, 4)
    expect(new Set(flat.map((v) => v.join())).size).toBe(1)
    expect(gradColors({ mode: 'curves', curves: {} }, 4).map((v) => v.slice(0, 3))).toEqual(curveStops({}, 4).map((q) => [parseInt(q.c.slice(1, 3), 16), parseInt(q.c.slice(3, 5), 16), parseInt(q.c.slice(5, 7), 16)]))
  })
})
