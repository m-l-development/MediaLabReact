import { describe, expect, it } from 'vitest'
import { homography, project, type Quad } from './geometry'
import { boxCorners, centroid, clampOffset, designBox, imageCorners, inBox, mirrorQuad, patchFreeform, snapMove, snapPoint, snapScale, unproject, zoomFromDrag } from './place'
import { DEFAULT_SETTINGS, validQuad } from './render'

const quad: Quad = [[0.3, 0.2], [0.8, 0.25], [0.75, 0.7], [0.25, 0.65]]

describe('Mockups – plassering av designet', () => {
  it('invers homografi: tilbake til samme (u, v), også utenfor flaten', () => {
    const h = homography(quad)!
    for (const [u, v] of [[0, 0], [1, 1], [0.3, 0.7], [-0.4, 0.5], [1.3, -0.2]] as const) {
      const [x, y] = project(h, u, v)
      const back = unproject(h, x, y)!
      expect(back[0]).toBeCloseTo(u, 6)
      expect(back[1]).toBeCloseTo(v, 6)
    }
  })

  it('«Fyll» uten zoom dekker flaten nøyaktig; «Vis hele» får plass; samme regel som render()', () => {
    // design 2:1 i en 1,6:1-flate
    const fill = designBox({ ...DEFAULT_SETTINGS }, 200, 100, 1.6)
    expect(Math.min(2 * fill.hw / 1.6, 2 * fill.hh)).toBeCloseTo(1, 6)
    expect(2 * fill.hh).toBeCloseTo(1, 6) // høyden styrer ved «Fyll»
    const contain = designBox({ ...DEFAULT_SETTINGS, fit: 'contain' }, 200, 100, 1.6)
    expect(2 * contain.hw).toBeCloseTo(1.6, 6) // bredden styrer ved «Vis hele»
  })

  it('hjørner, treff og proporsjonal skalering fra et hjørne', () => {
    const b = designBox({ ...DEFAULT_SETTINGS, ox: 0.1 }, 200, 100, 2)
    const c = boxCorners(b)
    expect(c[0][0]).toBeCloseTo(0.1, 6)
    expect(c[2][0]).toBeCloseTo(1.1, 6)
    expect(inBox(b, 0.6, 0.5)).toBe(true)
    expect(inBox(b, 1.2, 0.5)).toBe(false)
    // dra nedre høyre hjørne halvveis inn mot midten → halv zoom
    expect(zoomFromDrag(b, 1, c[2][0], c[2][1], (c[2][0] + b.cu) / 2, (c[2][1] + b.cv) / 2)).toBeCloseTo(0.5, 6)
  })

  it('rotasjon: hjørnene roteres rundt midtpunktet (90° bytter bredde og høyde)', () => {
    const b = designBox({ ...DEFAULT_SETTINGS, rot: 90, fit: 'contain' }, 200, 100, 1)
    const c = boxCorners(b)
    const w = Math.max(...c.map((p) => p[0])) - Math.min(...c.map((p) => p[0]))
    const h = Math.max(...c.map((p) => p[1])) - Math.min(...c.map((p) => p[1]))
    expect(h / w).toBeCloseTo(2, 5)
  })

  it('forskyvningen begrenses så designet aldri forsvinner helt', () => {
    const b = designBox({ ...DEFAULT_SETTINGS }, 100, 100, 1)
    const r = clampOffset(b, 9, -9)
    expect(r.ox).toBeLessThan(1.5)
    expect(r.oy).toBeGreaterThan(-1.5)
    expect(clampOffset(b, 0.3, 0.2)).toEqual({ ox: 0.3, oy: 0.2 })
  })


  it('bildehjørnene følger speiling og rotasjon (samme som tegningen)', () => {
    const st = { ...DEFAULT_SETTINGS, fit: 'contain' as const }
    expect(imageCorners(st, 200, 100, 2)).toEqual(boxCorners(designBox(st, 200, 100, 2)))
    const fl = imageCorners({ ...st, flipX: true }, 200, 100, 2)
    expect(fl[0][0]).toBeGreaterThan(fl[1][0]) // bildets venstre hjørne ligger til høyre
    const r = imageCorners({ ...st, rot: 90 }, 200, 100, 2)
    expect(r[0][1]).toBeLessThan(r[3][1] + 1e-9) // øvre venstre har roteret mot høyre side
    expect(r[0][0]).toBeGreaterThan(centroid(r)[0])
  })

  it('fritt formet: glidere og knapper anvendes på hjørnene; Fyll/Vis hele går tilbake', () => {
    const dq = [[0.1, 0.1], [0.6, 0.15], [0.55, 0.6], [0.12, 0.5]] as Quad
    const st = { ...DEFAULT_SETTINGS, dq }
    const z = patchFreeform(st, { zoom: 2 }, 1.5).dq!
    expect(centroid(z)[0]).toBeCloseTo(centroid(dq)[0], 9)
    expect(z[1][0] - z[0][0]).toBeCloseTo(2 * (dq[1][0] - dq[0][0]), 9)
    const m = patchFreeform(st, { ox: 0.1 }, 1.5).dq!
    expect(m[0][0]).toBeCloseTo(0.2, 9)
    expect(patchFreeform(st, { flipX: true }, 1.5).dq).toEqual(mirrorQuad(dq, 'x'))
    expect(patchFreeform(st, { fit: 'contain' }, 1.5).dq).toBeNull()
    expect(patchFreeform({ ...DEFAULT_SETTINGS }, { zoom: 2 }, 1.5)).toEqual({ zoom: 2 })
  })

  it('gyldige frie former: kryssende eller sammenfallende hjørner avvises', () => {
    expect(validQuad([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(true)
    expect(validQuad([[0, 0], [1, 1], [1, 0], [0, 1]])).toBe(false)
    expect(validQuad([[0, 0], [0, 0], [1, 1], [0, 1]])).toBe(false)
    expect(validQuad(null)).toBe(false)
  })

  it('magnetisk justering: fester seg bare innenfor terskelen', () => {
    const q = [[0.2, 0.2], [0.6, 0.2], [0.6, 0.45], [0.2, 0.45]] as Quad // midte u = 0,4 (ingen kant nær en hjelpelinje)
    const a = snapMove(q, 0.095, 0, 0.01, 0.01) // midte → 0,495: fest til 0,5
    expect(a.du).toBeCloseTo(0.1, 9)
    expect(a.guides).toEqual([{ axis: 'u', at: 0.5 }])
    const b = snapMove(q, 0.05, 0.03, 0.01, 0.01) // langt fra alt: uendret
    expect([b.du, b.dv, b.guides.length]).toEqual([0.05, 0.03, 0])
    const c = snapScale(q, 1.98, 0.01, 0.01) // høyre kant 0,4 + 0,2·1,98 = 0,796 – ikke nær 1; venstre 0,004 – nær 0
    expect(c.guides[0]).toEqual({ axis: 'u', at: 0 })
    expect(snapPoint(0.996, 0.3, 0.01, 0.01)).toEqual({ u: 1, v: 0.3, guides: [{ axis: 'u', at: 1 }] })
  })
})
