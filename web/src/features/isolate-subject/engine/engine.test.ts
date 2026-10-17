import { describe, expect, it } from 'vitest'
import { inpaint } from './inpaint'
import { keyRegion } from './keybox'
import { hitMark, pendingMask, type Mark } from './marks'
import { colorKey, cropBox, hasContent, isDegenerate, maxMask, refineMask, subtractMask } from './mask'

/** Lager et RGBA-bilde W×H fylt med `bg`, med et rektangel i `fg`. */
function image(W: number, H: number, bg: number[], fg?: { color: number[]; x0: number; y0: number; x1: number; y1: number }) {
  const d = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inFg = fg && x >= fg.x0 && x < fg.x1 && y >= fg.y0 && y < fg.y1
      const c = inFg ? fg.color : bg
      d.set([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, 255], (y * W + x) * 4)
    }
  }
  return d
}

const at = (m: Uint8ClampedArray, W: number, x: number, y: number) => m[y * W + x] ?? -1

describe('fargenøkkel (Logo/Tekst)', () => {
  it('fjerner ensfarget bakgrunn og beholder motivet', () => {
    const W = 60
    const H = 40
    const a = colorKey(image(W, H, [255, 255, 255], { color: [20, 40, 200], x0: 20, y0: 10, x1: 40, y1: 30 }), W, H)
    expect(a).not.toBeNull()
    if (!a) return
    expect(at(a, W, 2, 2)).toBe(0)
    expect(at(a, W, 30, 20)).toBe(255)
  })

  it('gir null når kanten ikke er ensfarget (da brukes AI-modellen)', () => {
    const W = 40
    const H = 40
    const d = new Uint8ClampedArray(W * H * 4)
    for (let i = 0; i < W * H; i++) d.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4)
    expect(colorKey(d, W, H)).toBeNull()
  })
})

describe('masker', () => {
  it('kjenner igjen ubrukelige masker (helt tom eller helt full)', () => {
    expect(isDegenerate(new Uint8ClampedArray(1000))).toBe(true)
    expect(isDegenerate(new Uint8ClampedArray(1000).fill(255))).toBe(true)
    const half = new Uint8ClampedArray(1000)
    half.fill(255, 0, 500)
    expect(isDegenerate(half)).toBe(false)
  })

  it('kombinerer: maks av to fjern-masker, og fjern fra alfa', () => {
    const a = Uint8ClampedArray.from([0, 100, 255])
    const b = Uint8ClampedArray.from([50, 50, 50])
    expect([...maxMask(a, b)]).toEqual([50, 100, 255])
    expect([...subtractMask(Uint8ClampedArray.from([255, 255, 10]), Uint8ClampedArray.from([255, 0, 0]))]).toEqual([0, 255, 10])
    expect([...subtractMask(null, Uint8ClampedArray.from([200]))]).toEqual([55])
    expect(hasContent(Uint8ClampedArray.from([0, 128]))).toBe(true)
    expect(hasContent(Uint8ClampedArray.from([0, 127]))).toBe(false)
  })

  it('«Stram inn kantene» krymper motivet, og kantene finnes', () => {
    const W = 100
    const H = 100
    const alpha = new Uint8ClampedArray(W * H)
    for (let y = 30; y < 70; y++) for (let x = 30; x < 70; x++) alpha[y * W + x] = 255
    const loose = refineMask(alpha, W, H, 0, 0)
    expect(loose.box).toEqual([30, 30, 69, 69])
    const tight = refineMask(alpha, W, H, 50, 0) // 50 per 1000 px → 5 px her
    expect(tight.box).toEqual([35, 35, 64, 64])
    const soft = refineMask(alpha, W, H, 0, 20)
    expect(at(soft.mask, W, 50, 50)).toBe(255)
    expect(at(soft.mask, W, 30, 50)).toBeLessThan(255) // myk kant, men ikke utenfor motivet
    expect(at(soft.mask, W, 25, 50)).toBe(0)
  })

  it('beskjæring til motivet gir 4 % luft innenfor bildet', () => {
    expect(cropBox([10, 10, 59, 59], 100, 100)).toEqual({ x: 8, y: 8, w: 54, h: 54 })
    expect(cropBox([0, 0, 99, 99], 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })
})

describe('fyll med omgivelser', () => {
  it('fyller det fjernede området med fargen rundt, og rører ikke resten av bildet', () => {
    const W = 80
    const H = 80
    const rgba = image(W, H, [10, 120, 200], { color: [250, 0, 0], x0: 30, y0: 30, x1: 50, y1: 50 })
    const remove = new Uint8ClampedArray(W * H)
    for (let y = 30; y < 50; y++) for (let x = 30; x < 50; x++) remove[y * W + x] = 255
    expect(inpaint(rgba, W, H, remove, () => 0.5)).toBe(true)
    const p = (40 * W + 40) * 4
    expect([rgba[p], rgba[p + 1], rgba[p + 2]]).toEqual([10, 120, 200])
    const far = (2 * W + 2) * 4
    expect([rgba[far], rgba[far + 1], rgba[far + 2]]).toEqual([10, 120, 200])
  })

  it('gjør ingenting med tom maske', () => {
    expect(inpaint(new Uint8ClampedArray(16), 2, 2, new Uint8ClampedArray(4))).toBe(false)
  })
})

describe('merk i bildet', () => {
  it('finner objektet i firkanten uten AI (fargeklynger)', () => {
    const W = 80
    const H = 80
    const d = image(W, H, [240, 240, 240], { color: [30, 30, 30], x0: 30, y0: 30, x1: 50, y1: 50 })
    const r = keyRegion(d, W, H, { x0: 20, x1: 60, y0: 20, y1: 60 }, 1)
    expect(r.kind).toBe('mask')
    if (r.kind !== 'mask') return
    expect(at(r.mask, W, 40, 40)).toBe(255)
    expect(at(r.mask, W, 22, 22)).toBe(0)
  })

  it('gir «ingenting» når firkanten bare inneholder bakgrunn', () => {
    const W = 40
    const H = 40
    expect(keyRegion(image(W, H, [200, 200, 200]), W, H, { x0: 5, x1: 35, y0: 5, y1: 35 }, 1).kind).toBe('none')
  })

  it('rød/grønn forhåndsvisning og treff på markeringer', () => {
    const W = 10
    const H = 10
    const a = new Uint8ClampedArray(4).fill(255)
    const marks: Mark[] = [
      { type: 'box', x0: 0, y0: 0, x1: 0.2, y1: 0.2, keep: false, km: { X0: 0, Y0: 0, w: 2, h: 2, a } },
      { type: 'point', x: 0.75, y: 0.75, keep: false },
    ]
    const p = pendingMask(marks, W, H)
    expect(p && p[0]).toBe(255)
    expect(p && p[5 * W + 5]).toBe(0)
    expect(hitMark(marks, 0.05, 0.05, W, H, 1)).toBe(0)
    expect(hitMark(marks, 0.76, 0.75, W, H, 1)).toBe(1)
    expect(hitMark(marks, 0.5, 0.1, W, H, 1)).toBe(-1)
    // En grønn firkant oppå den røde fjerner forhåndsvisningen der.
    const kept = pendingMask([...marks, { type: 'box', x0: 0, y0: 0, x1: 0.2, y1: 0.2, keep: true, km: { X0: 0, Y0: 0, w: 2, h: 2, a } }], W, H)
    expect(kept).toBeNull()
  })
})
