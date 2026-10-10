import { describe, expect, it } from 'vitest'
import { categoryOf, niceName } from './catalog'
import { detectScreen, occlusionMask, type Pixels } from './detect'
import { area, aspectOf, growQuad, homography, inQuad, order, project, type Quad } from './geometry'

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps)

describe('geometri', () => {
  const q: Quad = [[10, 20], [110, 30], [100, 90], [5, 80]]

  it('homografien sender hjørnene i enhetskvadratet til skjermens hjørner', () => {
    const h = homography(q)
    if (!h) throw new Error('ingen homografi')
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
    corners.forEach(([u, v], i) => {
      const [x, y] = project(h, u, v)
      close(x, (q[i] as [number, number])[0])
      close(y, (q[i] as [number, number])[1])
    })
  })

  it('sorterer hjørnene med klokka fra øverst til venstre', () => {
    expect(order([[100, 90], [5, 80], [110, 30], [10, 20]])).toEqual(q)
  })

  it('areal, punkt-i-firkant, sideforhold og forstørrelse', () => {
    expect(area([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(50)
    expect(inQuad(q, 50, 50)).toBe(true)
    expect(inQuad(q, 0, 0)).toBe(false)
    close(aspectOf([[0, 0], [160, 0], [160, 90], [0, 90]]), 16 / 9)
    expect(growQuad([[0, 0], [10, 0], [10, 10], [0, 10]], 2)).toEqual([[-5, -5], [15, -5], [15, 15], [-5, 15]])
  })
})

/** Grå bakgrunn med en hvit «skjerm» (og valgfritt en mørk «finger» over kanten). */
function photo(w: number, h: number, finger = false): Pixels {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const screen = x >= w * 0.25 && x < w * 0.75 && y >= h * 0.2 && y < h * 0.7
      const f = finger && x >= w * 0.45 && x < w * 0.55 && y >= h * 0.55
      const v = f ? 40 : screen ? 250 : 120
      d.set([v, v, v, 255], (y * w + x) * 4)
    }
  }
  return { w, h, d }
}

describe('skjermgjenkjenning', () => {
  it('finner den lyse skjermen i bildet', () => {
    const q = detectScreen(photo(200, 150))
    expect(q).not.toBeNull()
    if (!q) return
    close(q[0][0], 0.25, 0.02)
    close(q[0][1], 0.2, 0.02)
    close(q[2][0], 0.745, 0.02)
    close(q[2][1], 0.695, 0.02)
  })

  it('gir null når det ikke finnes noen tydelig skjerm', () => {
    const w = 120
    const h = 90
    const d = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const v = (i * 97) % 256
      d.set([v, (v * 3) % 256, (v * 7) % 256, 255], i * 4)
    }
    expect(detectScreen({ w, h, d })).toBeNull()
  })

  it('maske med okklusjon: fingeren foran skjermen er ikke en del av skjermen', () => {
    const P = photo(200, 150, true)
    const qn: Quad = [[0.25, 0.2], [0.75, 0.2], [0.75, 0.7], [0.25, 0.7]]
    const m = occlusionMask(P, qn, true)
    expect(m).not.toBeNull()
    if (!m) return
    const at = (x: number, y: number) => m[Math.round(y * (P.h - 1)) * P.w + Math.round(x * (P.w - 1))]
    expect(at(0.3, 0.3)).toBe(1)
    expect(at(0.5, 0.66)).toBe(0)
    expect(at(0.1, 0.1)).toBe(0)
  })
})

describe('katalog', () => {
  it('kategori og navn fra filnavnet, som i dag', () => {
    expect(categoryOf('iphone-hand.jpg')).toBe('phone')
    expect(categoryOf('MacBook-Air.jpg')).toBe('laptop')
    expect(categoryOf('tv-wall.jpg')).toBe('screen')
    expect(categoryOf('card-white.jpg')).toBe('print')
    expect(categoryOf('vase.jpg')).toBe('other')
    expect(niceName('iphone-hand.jpg')).toBe('Iphone Hand')
  })
})
