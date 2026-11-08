import { describe, expect, it } from 'vitest'
import { cropPlacement } from './controller'

/** TB-F7323D: etter beskjæring skal laget vise nøyaktig utsnittet som ble valgt – ingenting mer kuttes bort. */
const L = { x: 100, y: 50, w: 600, h: 400, rot: 0, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, cL: 0, cT: 0, cR: 0, cB: 0 }
const ar = (b: { w: number; h: number }) => b.w / b.h

describe('beskjæring i Thumbnail Studio', () => {
  it('«Fyll»: boksen får utsnittets sideforhold, så cover ikke kutter mer', () => {
    // kvadratisk bilde, smalt utsnitt (halve bredden, hele høyden): 1:2
    const r = cropPlacement(L, 1000, 1000, { cL: 0.25, cR: 0.25, cT: 0, cB: 0 })
    expect(ar(r)).toBeCloseTo(0.5, 2)
    // samme skala som før (0,6) og samme plass: utsnittet starter 150 px inn og 100 px over boksen
    expect(r).toMatchObject({ x: 250, y: -50, w: 300, h: 600, zoom: 1, px: 0.5, py: 0.5 })
  })
  it('«Vis hele» (contain) gir samme resultat som før', () => {
    const r = cropPlacement({ ...L, fit: 'contain' }, 1000, 500, { cL: 0.1, cR: 0.1, cT: 0.2, cB: 0 })
    // contain: skala 0,6, bildet 600×300 midt i boksen (y 50 + 50), utsnittet 60 px lenger ned
    expect(r).toMatchObject({ x: 160, y: 160, w: 480, h: 240 })
  })
  it('rotasjon og speiling: midten av utsnittet havner der det vises', () => {
    const r = cropPlacement({ ...L, rot: 90 }, 1000, 1000, { cL: 0.5, cR: 0, cT: 0, cB: 0 })
    // utsnittet (høyre halvdel) ligger 150 px til høyre for midten før rotasjon; etter 90° er det 150 px under midten
    expect(r.x + r.w / 2).toBeCloseTo(400, 0)
    expect(r.y + r.h / 2).toBeCloseTo(250 + 150, 0)
    const f = cropPlacement({ ...L, flipX: true }, 1000, 1000, { cL: 0.5, cR: 0, cT: 0, cB: 0 })
    expect(f.x + f.w / 2).toBeCloseTo(400 - 150, 0)
  })
})
