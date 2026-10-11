import { describe, expect, it } from 'vitest'
import { fillCss, fillStops, harmonyColors } from '../../../shared/fill/fill'
import { clean, KINDS, params, presets } from '../../../shared/fx/fx'
import { changeFormat, snapAt, snapPrep } from './layout'
import { bleedLayers, BLEED, fromCMYK, imageLayer, mediaIds, shapeLayer, toCMYK, type PdDoc } from './model'
import { cover, curveFn } from './render'

const doc = (layers: PdDoc['layers']): PdDoc => ({ id: 'p1', name: 'Test', w: 1000, h: 1000, bg: '#ffffff', layers, created: 1, updated: 1 })

describe('farger og trykk', () => {
  it('CMYK fram og tilbake', () => {
    expect(toCMYK('#000000')).toEqual([0, 0, 0, 100])
    expect(toCMYK('#ff0000')).toEqual([0, 100, 100, 0])
    expect(fromCMYK([0, 100, 100, 0])).toBe('#ff0000')
  })

  it('utfallende forlenger lag som går til kanten, og tar det tilbake', () => {
    const L = shapeLayer({ x: 500, y: 500, w: 1000, h: 1000 })
    const on = bleedLayers([L], 1000, 1000, true)[0]
    expect(on?.type === 'shape' && on.w).toBe(1000 + 2 * BLEED)
    const off = bleedLayers(on ? [on] : [], 1000, 1000, false)[0]
    expect(off?.type === 'shape' && off.w).toBe(1000)
  })
})

describe('bilde', () => {
  it('kurven går gjennom punktene', () => {
    const f = curveFn([[0, 0], [0.5, 0.7], [1, 1]])
    expect(f?.(0.5)).toBeCloseTo(0.7)
    expect(f?.(0)).toBe(0)
    expect(curveFn(null)).toBeNull()
  })

  it('utsnitt dekker rammen', () => {
    const r = cover(2000, 1000, 500, 500, 1, 0, 0)
    expect(r.sh).toBeCloseTo(1000)
    expect(r.sx).toBeCloseTo(500)
  })

  it('bildene prosjektet bruker', () => {
    expect(mediaIds(doc([imageLayer({ src: 'm:a', mask: 'k1' })]))).toEqual(['m:a', 'k1'])
  })
})

describe('hjelpelinjer og formatbytte', () => {
  it('fester til midten av lerretet', () => {
    const d = doc([shapeLayer({ id: 'a', x: 503, y: 200, w: 100, h: 100 })])
    const P = snapPrep(d, ['a'])
    const sn = snapAt(d, P, { x0: 453, x1: 553, y0: 150, y1: 250 }, 7, 2, false)
    expect(sn.dx).toBe(-3)
    expect(snapAt(d, P, { x0: 453, x1: 553, y0: 150, y1: 250 }, 7, 2, true).dx).toBe(0)
  })

  it('frem og tilbake gir samme oppsett', () => {
    const d = doc([shapeLayer({ id: 'a', x: 500, y: 500, w: 1000, h: 1000 }), shapeLayer({ id: 'b', x: 300, y: 300, w: 100, h: 100 })])
    const r1 = changeFormat(d, { w: 1000, h: 2000 }, null, null)
    const full = r1.doc.layers[0]
    expect(full?.type === 'shape' && [full.w, full.h]).toEqual([1000, 2000])
    const r2 = changeFormat(r1.doc, { w: 1000, h: 1000 }, r1.base, null)
    expect(r2.doc.layers).toEqual(d.layers)
  })
})

describe('fyll og effekter', () => {
  it('fyll: stopp, CSS og tilfeldige farger', () => {
    expect(fillStops({ mode: 'linear' })).toHaveLength(2)
    expect(fillCss({ mode: 'solid', stops: [{ c: '#123456', p: 0 }, { c: '#000000', p: 1 }] })).toBe('#123456')
    expect(harmonyColors(3)).toHaveLength(3)
  })

  it('1920 forhåndsvalg, og parametre med standardverdier', () => {
    expect(presets()).toHaveLength(1920)
    expect(Object.keys(KINDS)).toHaveLength(13)
    expect(params({ fx: 'sun' }).rays).toBe(18)
    expect(clean({ fx: 'sun', p: { rays: 999, c1: 'rød' } })?.p).toEqual({ rays: 60 })
    expect(clean({ fx: 'ukjent' })).toBeNull()
  })
})
