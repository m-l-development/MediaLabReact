import { describe, expect, it } from 'vitest'
import { boxOf, brushSegment, combine, edgeRefine, fillEllipse, fillPolygon, fillRect, invertInPlace, MaskHistory, sampleColor } from './ops'

const W = 100
const H = 80
const at = (m: Uint8ClampedArray, x: number, y: number) => m[y * W + x] ?? 0
const count = (m: Uint8ClampedArray, t = 128) => m.reduce((a, v) => a + (v >= t ? 1 : 0), 0)

describe('maskeoperasjoner', () => {
  it('pensel: sammenhengende strøk, behold/fjern, hardhet og ingenting utenfor', () => {
    const m = new Uint8ClampedArray(W * H)
    const b = brushSegment(m, W, H, 10, 40, 90, 40, 5, 1, true)
    expect(b).toEqual({ x0: 4, y0: 34, x1: 96, y1: 46 })
    for (const x of [10, 30, 50, 70, 90]) expect(at(m, x, 40), `x=${x}`).toBe(255)
    expect(at(m, 50, 47)).toBe(0)
    expect(at(m, 50, 30)).toBe(0)
    // fjern midt i: hullet blir der, resten står
    brushSegment(m, W, H, 50, 40, 50, 40, 3, 1, false)
    expect(at(m, 50, 40)).toBe(0)
    expect(at(m, 60, 40)).toBe(255)
    // myk pensel: delvis dekning ved kanten
    const s = new Uint8ClampedArray(W * H)
    brushSegment(s, W, H, 50, 40, 50, 40, 10, 0, true)
    expect(at(s, 50, 40)).toBeGreaterThan(200)
    const edge = at(s, 57, 40)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(120)
  })

  it('rektangel, ellipse og lasso endrer den faktiske masken', () => {
    const m = new Uint8ClampedArray(W * H)
    fillRect(m, W, H, { x0: 10, y0: 10, x1: 30, y1: 20 }, true)
    expect(count(m)).toBe(200)
    fillEllipse(m, W, H, { x0: 50, y0: 10, x1: 90, y1: 50 }, true)
    expect(at(m, 70, 30)).toBe(255)
    expect(at(m, 51, 11)).toBe(0) // hjørnet av rammen er utenfor ellipsen
    const before = count(m)
    expect(before - 200).toBeGreaterThan(Math.PI * 20 * 20 * 0.95)
    expect(before - 200).toBeLessThan(Math.PI * 20 * 20 * 1.05)
    // lasso: trekant som fjerner en del av rektangelet
    fillPolygon(m, W, H, [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 40 }], false)
    expect(at(m, 11, 11)).toBe(0)
    expect(at(m, 28, 18)).toBe(255)
  })

  it('invertering, kombinasjon og område', () => {
    const m = new Uint8ClampedArray(W * H)
    fillRect(m, W, H, { x0: 0, y0: 0, x1: 50, y1: 80 }, true)
    invertInPlace(m)
    expect(at(m, 10, 10)).toBe(0)
    expect(at(m, 60, 10)).toBe(255)
    const obj = new Uint8ClampedArray(W * H)
    fillRect(obj, W, H, { x0: 20, y0: 20, x1: 30, y1: 30 }, true)
    expect(boxOf(obj, W)).toEqual({ x0: 20, y0: 20, x1: 30, y1: 30 })
    expect(combine(m, obj, W, true)).toEqual({ x0: 20, y0: 20, x1: 30, y1: 30 })
    expect(at(m, 25, 25)).toBe(255)
    combine(m, obj, W, false)
    expect(at(m, 25, 25)).toBe(0)
  })

  it('angre og gjør om gir nøyaktig samme maske (bare det endrede området lagres)', () => {
    const m = new Uint8ClampedArray(W * H)
    const h = new MaskHistory(W)
    const box = { x0: 0, y0: 30, x1: 100, y1: 50 }
    h.begin(m, box)
    brushSegment(m, W, H, 0, 40, 99, 40, 6, 0.5, true)
    h.commit()
    const after = new Uint8ClampedArray(m)
    expect(h.undo(m)).toEqual(box)
    expect(count(m, 1)).toBe(0)
    expect(h.canRedo).toBe(true)
    h.redo(m)
    expect(m).toEqual(after)
  })

  /** Bilde: mørk venstre halvdel, lys høyre halvdel; en lys strek (2 px) i den mørke delen. */
  function image() {
    const rgba = new Uint8ClampedArray(W * H * 4)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = x >= 50 ? 230 : x === 20 || x === 21 ? 220 : 20
        rgba.set([v, v, v, 255], (y * W + x) * 4)
      }
    }
    return rgba
  }

  it('pensel med kantfølging: stopper ved en fargekant, virker som vanlig der fargene er like', () => {
    const rgba = image()
    // «behold» startet på den lyse siden, penselen (r = 10) rekker 10 px inn i den mørke: der skjer ingenting
    const m = new Uint8ClampedArray(W * H)
    brushSegment(m, W, H, 55, 40, 55, 40, 10, 1, true, { rgba, ref: sampleColor(rgba, W, H, 55, 40), tol: 40 })
    expect(at(m, 52, 40)).toBe(255)
    expect(at(m, 48, 40), 'mørk side påvirkes ikke').toBe(0)
    // uten kantfølging: hele penselen
    const n = new Uint8ClampedArray(W * H)
    brushSegment(n, W, H, 55, 40, 55, 40, 10, 1, true)
    expect(at(n, 48, 40)).toBe(255)
    // like farger (bare mørkt): som vanlig pensel
    const o = new Uint8ClampedArray(W * H)
    brushSegment(o, W, H, 35, 40, 35, 40, 10, 1, true, { rgba, ref: sampleColor(rgba, W, H, 35, 40), tol: 40 })
    expect(at(o, 30, 40)).toBe(255)
    expect(at(o, 40, 40)).toBe(255)
  })

  it('kantutjevning langs bildet (guided filter): kanten trekkes mot kanten i bildet, smale detaljer med kontrast beholdes', () => {
    const rgba = image()
    // grov maske: det lyse skal beholdes, men maskekanten står 2 px for langt til venstre
    const m = new Uint8ClampedArray(W * H)
    fillRect(m, W, H, { x0: 48, y0: 0, x1: 100, y1: 80 }, true)
    edgeRefine(m, rgba, W, H, { x0: 30, y0: 0, x1: 70, y1: 80 }, 6, 0.001)
    expect(at(m, 48, 40), 'mørk side av kanten svekkes').toBeLessThan(200)
    expect(at(m, 52, 40), 'lys side beholdes').toBeGreaterThan(200)
    // smal lys strek (2 px) som masken bare delvis traff: utjevningen tar hele streken
    const t = new Uint8ClampedArray(W * H)
    fillRect(t, W, H, { x0: 18, y0: 0, x1: 21, y1: 80 }, true)
    edgeRefine(t, rgba, W, H, { x0: 10, y0: 0, x1: 30, y1: 80 }, 4, 0.001)
    // vanlig myking (boksfilter, samme radius) av samme maske, til sammenligning
    const blur21 = (3 / 9) * 255
    expect(at(t, 20, 40), 'streken beholdes').toBeGreaterThan(128)
    expect(at(t, 21, 40), 'den delen av streken masken bommet på, tas med (bedre enn vanlig myking)').toBeGreaterThan(blur21 + 15)
    expect(at(t, 17, 40), 'mørk bakgrunn ved streken fjernes').toBeLessThan(60)
  })

  it('kantfølging: der fargene er like, flyttes ikke kanten (motiv og bakgrunn med lignende farge)', () => {
    const rgba = new Uint8ClampedArray(W * H * 4).fill(128)
    const m = new Uint8ClampedArray(W * H)
    fillRect(m, W, H, { x0: 40, y0: 0, x1: 100, y1: 80 }, true)
    edgeRefine(m, rgba, W, H, { x0: 20, y0: 0, x1: 60, y1: 80 }, 6, 0.01)
    // uten kanter i bildet blir masken bare litt mykere rundt sin egen kant, den flytter seg ikke
    expect(at(m, 30, 40)).toBeLessThan(20)
    expect(at(m, 50, 40)).toBeGreaterThan(235)
    expect(Math.abs(at(m, 40, 40) - 128)).toBeLessThan(40)
  })

  it('kantfølging bare der penselen var', () => {
    const rgba = image()
    const m = new Uint8ClampedArray(W * H)
    fillRect(m, W, H, { x0: 46, y0: 0, x1: 100, y1: 80 }, true)
    const only = new Uint8Array(W * H)
    for (let y = 0; y < 40; y++) for (let x = 40; x < 60; x++) only[y * W + x] = 1
    edgeRefine(m, rgba, W, H, { x0: 30, y0: 0, x1: 70, y1: 80 }, 6, 0.001, only)
    expect(at(m, 47, 10), 'innenfor: endret').toBeLessThan(200)
    expect(at(m, 47, 60), 'utenfor: uendret').toBe(255)
  })
})
