import { describe, expect, it } from 'vitest'
import { clampPlacement, defaultPlacement, heightOf, resizeFrom, svgAtSize, svgBox } from './logo'

const SVG_VB = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="100" height="100" fill="red"/></svg>'
const SVG_WH = '<svg xmlns="http://www.w3.org/2000/svg" width="300px" height="150"><rect width="10" height="10"/></svg>'

describe('Mockups – logo', () => {
  it('leser proporsjonene fra viewBox, ellers fra width/height', () => {
    expect(svgBox(SVG_VB)).toEqual({ aspect: 2, vb: null })
    expect(svgBox(SVG_WH)).toEqual({ aspect: 2, vb: [300, 150] })
    expect(svgBox('<html/>').aspect).toBeNull()
  })

  it('SVG i eksportstørrelse: samme vektordata, eksplisitt pikselstørrelse, viewBox beholdt eller lagt til', () => {
    const a = new DOMParser().parseFromString(svgAtSize(SVG_VB, 1600.4, 800), 'image/svg+xml').documentElement
    expect([a.getAttribute('width'), a.getAttribute('height'), a.getAttribute('viewBox')]).toEqual(['1600', '800', '0 0 200 100'])
    expect(a.querySelector('rect')?.getAttribute('fill')).toBe('red')
    const b = new DOMParser().parseFromString(svgAtSize(SVG_WH, 900, 450), 'image/svg+xml').documentElement
    expect([b.getAttribute('width'), b.getAttribute('height'), b.getAttribute('viewBox')]).toEqual(['900', '450', '0 0 300 150'])
  })

  it('standardplassering: 5 % fra toppen og 5 % fra høyre kant, i andeler av bildet', () => {
    const p = defaultPlacement(2, 1.5)
    expect(p.y).toBeCloseTo(0.05)
    expect(p.x + p.w).toBeCloseTo(0.95)
    // høyden følger logoens proporsjoner i bildets koordinater: (w·W)/(h·H) = 2
    expect((p.w * 1.5) / heightOf(p, 2, 1.5)).toBeCloseTo(2)
  })

  it('skalering fra et hjørne er proporsjonal, og motsatt hjørne står stille', () => {
    const start = { x: 0.6, y: 0.1, w: 0.2 }
    const r = resizeFrom(start, 2, 0.95, 0.2, 2, 1.5) // dra nedre høyre hjørne utover
    expect(r.x).toBeCloseTo(0.6)
    expect(r.y).toBeCloseTo(0.1)
    expect(r.w).toBeCloseTo(0.35)
    const l = resizeFrom(start, 0, 0.5, 0.1, 2, 1.5) // øvre venstre: nedre høyre hjørne står fast
    expect(l.x + l.w).toBeCloseTo(0.8)
    expect(l.y + heightOf(l, 2, 1.5)).toBeCloseTo(0.1 + heightOf(start, 2, 1.5))
  })

  it('logoen holdes (minst litt) innenfor bildet og med minstestørrelse', () => {
    const c = clampPlacement({ x: 5, y: -5, w: 0 }, 1, 1)
    expect(c.w).toBeGreaterThan(0)
    expect(c.x).toBeLessThan(1)
    expect(c.y + heightOf(c, 1, 1)).toBeGreaterThan(0)
  })
})
