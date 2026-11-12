import { describe, expect, it } from 'vitest'
import { cleanPaint, parseBackground, parseImage, scalePaint, splitTop } from './paint'

describe('maling fra CSS (malene i fase 3)', () => {
  it('deler bare på komma på øverste nivå', () => {
    expect(splitTop('linear-gradient(rgba(0, 0, 0, 0.5), red), url(x)')).toEqual(['linear-gradient(rgba(0, 0, 0, 0.5), red)', 'url(x)'])
  })
  it('lineær gradient: vinkel, lengde og stopp som i CSS', () => {
    const p = parseImage('linear-gradient(90deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)', 200, 100)
    expect(p).toMatchObject({ k: 'lin', x1: 0, x2: 200, st: [[0, 'rgb(255, 0, 0)'], [1, 'rgb(0, 0, 255)']] })
    // standard er nedover (180deg), stopp uten posisjon fordeles jevnt
    const d = parseImage('linear-gradient(red, green, blue)', 100, 100)
    expect(d?.k).toBe('lin')
    if (d?.k === 'lin') {
      expect(d.y1).toBeCloseTo(0, 6)
      expect(d.y2).toBeCloseTo(100, 6)
      expect(d.st.map((x) => x[0])).toEqual([0, 0.5, 1])
    }
    // px-posisjoner i forhold til gradientens lengde
    const px = parseImage('linear-gradient(rgba(0, 0, 0, 0.06) 1px, rgba(0, 0, 0, 0) 1px)', 64, 64)
    if (px?.k === 'lin') for (const q of px.st) expect(q[0]).toBeCloseTo(1 / 64, 9)
  })
  it('mot et hjørne: linjen står vinkelrett på diagonalen', () => {
    const p = parseImage('linear-gradient(to top right, red, blue)', 200, 100)
    expect(p?.k).toBe('lin')
    if (p?.k !== 'lin') return
    // retningen peker opp og til høyre
    expect(p.x2 - p.x1).toBeGreaterThan(0)
    expect(p.y2 - p.y1).toBeLessThan(0)
  })
  it('radial gradient: sirkel, ellipse, posisjon og størrelse', () => {
    const c = parseImage('radial-gradient(circle at 50% 62%, rgb(210, 74, 47) 0%, rgb(60, 12, 6) 100%)', 1280, 720)
    expect(c).toMatchObject({ k: 'rad', cx: 640, cy: 446.4 })
    if (c?.k === 'rad') expect(c.rx).toBeCloseTo(Math.hypot(640, 446.4), 3)
    const e = parseImage('radial-gradient(rgb(0, 0, 0), rgb(255, 255, 255))', 200, 100)
    if (e?.k === 'rad') expect([e.rx, e.ry]).toEqual([100 * Math.SQRT2, 50 * Math.SQRT2])
    const sz = parseImage('radial-gradient(300px 100px at 0% 0%, red, blue)', 400, 400)
    expect(sz).toMatchObject({ k: 'rad', cx: 0, cy: 0, rx: 300, ry: 100 })
  })
  it('gjentatte og koniske gradienter', () => {
    const r = parseImage('repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 2px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0) 16px)', 100, 100)
    expect(r).toMatchObject({ k: 'lin', rep: true })
    const k = parseImage('conic-gradient(from 90deg at 50% 50%, red 0deg, blue 180deg, red 360deg)', 100, 100)
    expect(k).toMatchObject({ k: 'con', cx: 50, cy: 50 })
    if (k?.k === 'con') expect(k.st.map((x) => x[0])).toEqual([0, 0.5, 1])
  })
  it('mønsterruter (background-size) og korn; skalering til 1920', () => {
    const ps = parseBackground('linear-gradient(rgba(0, 0, 0, 0.06) 1px, rgba(0, 0, 0, 0) 1px), url("data:image/svg+xml;utf8,<svg><filter><feTurbulence/></filter></svg>")', '64px 64px, auto', '0% 0%, 0% 0%', 1280, 720, 1.5, (u) => u.includes('feTurbulence'))
    expect(ps.map((p) => p.k)).toEqual(['lin', 'grain'])
    expect(ps[0]?.tile).toEqual([64, 64, 0, 0])
    expect(scalePaint(ps[0]!, 1.5).tile).toEqual([96, 96, 0, 0])
  })
  it('lagret maling kontrolleres: ukjente former og farger forkastes', () => {
    expect(cleanPaint([{ k: 'lin', x1: 0, y1: 0, x2: 1, y2: 1, st: [[0, 'red;}'], [1, '#ffffff']] }, { k: 'x' }, { k: 'grain', sc: 1.5 }])).toEqual([
      { k: 'lin', x1: 0, y1: 0, x2: 1, y2: 1, st: [[1, '#ffffff']] },
      { k: 'grain', sc: 1.5 },
    ])
  })
})
