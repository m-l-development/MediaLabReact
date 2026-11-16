import { describe, expect, it } from 'vitest'
import { applyLens, autoLens, CA_K, LENS_K, vigGain } from './lens'
import { applyDev, cleanDev } from './develop'

type Px = { data: Uint8ClampedArray; width: number; height: number }
const W = 480, H = 320, cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy)

/** Ideelt bilde: svarte rette linjer (rutenett) på hvitt, med en rute med kanter i alle retninger. */
function ideal(x: number, y: number): [number, number, number] {
  const gx = ((x % 40) + 40) % 40, gy = ((y % 40) + 40) % 40
  return gx < 2 || gy < 2 ? [20, 20, 20] : [235, 235, 235]
}

function make(f: (x: number, y: number) => [number, number, number]): Px {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // 2 × 2 delpiksler for jevne kanter
    let r = 0, g = 0, b = 0
    for (const [sx, sy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]] as const) {
      const c = f(x + sx, y + sy)
      r += c[0]; g += c[1]; b += c[2]
    }
    const q = (y * W + x) * 4
    data[q] = r / 4; data[q + 1] = g / 4; data[q + 2] = b / 4; data[q + 3] = 255
  }
  return { data, width: W, height: H }
}

/** Tønnefortegning med kjent koeffisient: et punkt med radius ru vises i radius ru · (1 + k ru²). */
function distorted(k: number): Px {
  return make((x, y) => {
    const dx = (x - cx) / R, dy = (y - cy) / R, rd = Math.hypot(dx, dy)
    let ru = rd
    for (let i = 0; i < 20; i++) ru -= (ru * (1 + k * ru * ru) - rd) / (1 + 3 * k * ru * ru)
    const s = rd > 0 ? ru / rd : 1
    return ideal(cx + dx * s * R, cy + dy * s * R)
  })
}

/** Hvor krum er den loddrette linjen nærmest x0: standardavviket (px) i linjens posisjon nedover bildet. */
function bend(img: Px, x0: number): number {
  const xs: number[] = []
  for (let y = 20; y < H - 20; y += 4) {
    // rader med en vannrett linje (mørke over hele vinduet) sier ingenting om den loddrette linjen
    let dark = 0
    for (let x = x0 - 14; x <= x0 + 14; x++) if (img.data[(y * W + x) * 4 + 1]! < 128) dark++
    if (dark > 8) continue
    let best = x0, bv = 999
    for (let x = x0 - 14; x <= x0 + 14; x++) {
      const v = img.data[(y * W + x) * 4 + 1]!
      if (v < bv) { bv = v; best = x }
    }
    xs.push(best)
  }
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
}

/** Linjen nærmest x0 (finner den mørkeste kolonnen i midtraden). */
const lineNear = (img: Px, x0: number) => {
  let best = x0, bv = 999
  // en rad mellom de vannrette linjene
  const y = cy + 20
  for (let x = x0 - 20; x <= x0 + 20; x++) { const v = img.data[(y * W + x) * 4 + 1]!; if (v < bv) { bv = v; best = x } }
  return best
}

describe('objektivkorreksjon', () => {
  it('fortegning: tønne med kjent koeffisient rettes opp – linjene nær kanten blir rette, uten tomme hjørner', () => {
    const k = -0.12
    const img = distorted(k)
    const x0 = lineNear(img, 50)
    const before = bend(img, x0)
    expect(before).toBeGreaterThan(1.5)
    applyLens(img, { dist: (-k / LENS_K) * 100, car: 0, cab: 0, vig: 0, vigm: 50 })
    const x1 = lineNear(img, 50)
    expect(bend(img, x1)).toBeLessThan(0.6)
    // hjørnene er fylt (ingen svarte/tomme hjørner fra korreksjonen)
    for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]] as const) expect(img.data[(y * W + x) * 4 + 3]).toBe(255)
  })

  it('kromatisk aberrasjon: «Auto» finner rød og blå skala, og korreksjonen legger kantene oppå hverandre', () => {
    const mR = 1.003, mB = 0.9975
    const img = make((x, y) => {
      const r = ideal(cx + (x - cx) / mR, cy + (y - cy) / mR)[0]
      const g = ideal(x, y)[1]
      const b = ideal(cx + (x - cx) / mB, cy + (y - cy) / mB)[2]
      return [r, g, b]
    })
    const a = autoLens(img)
    // avviket målt i piksler i hjørnet (det som synes): under en kvart piksel
    const px = (est: number, m: number) => Math.abs((est / 100) * CA_K - (m - 1)) * R
    expect(px(a.car, mR)).toBeLessThan(0.25)
    expect(px(a.cab, mB)).toBeLessThan(0.25)
    // fargekant ved en linje nær kanten: forskjellen rød–grønn før og etter
    const fringe = (p: Px) => {
      let s = 0
      for (let y = 10; y < H - 10; y += 2) for (let x = 2; x < 60; x++) { const q = (y * W + x) * 4; s += Math.abs(p.data[q]! - p.data[q + 1]!) + Math.abs(p.data[q + 2]! - p.data[q + 1]!) }
      return s
    }
    const f0 = fringe(img)
    applyLens(img, { dist: 0, car: a.car, cab: a.cab, vig: 0, vigm: 50 })
    // (resten er interpolasjon: rød og blå flyttes med underpiksler og blir litt mykere enn den skarpe grønne)
    expect(fringe(img)).toBeLessThan(f0 * 0.45)
  })

  it('vignettering: «Auto» finner lysfallet, og korreksjonen gjør hjørnene like lyse som midten', () => {
    const img = make(() => [180, 180, 180])
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = 1 / vigGain(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R, 45, 50)
      const q = (y * W + x) * 4
      for (let c = 0; c < 3; c++) img.data[q + c] = img.data[q + c]! * g
    }
    const corner = () => img.data[(2 * W + 2) * 4]!
    expect(corner()).toBeLessThan(120)
    const a = autoLens(img)
    expect(Math.abs(a.vig - 45)).toBeLessThanOrEqual(12)
    applyLens(img, { dist: 0, car: 0, cab: 0, vig: 45, vigm: 50 })
    expect(Math.abs(corner() - 180)).toBeLessThan(6)
    expect(Math.abs(img.data[(cy * W + cx) * 4]! - 180)).toBeLessThan(2)
  })

  it('i framkallingen: lagres og leses som andre framkallingsvalg; bare midtpunktet alene gjør ingenting', () => {
    expect(cleanDev({ lvigm: 70 })).toBeNull()
    const d = cleanDev({ ldist: 30, lcar: 500, lvig: -20, lvigm: 70 })!
    expect(d.ldist).toBe(30)
    expect(d.lcar).toBe(100) // avgrenset
    const img = distorted(-0.1)
    const id = { data: img.data, width: W, height: H, colorSpace: 'srgb' } as unknown as ImageData
    const before = bend(img, lineNear(img, 50))
    applyDev(id, { ...cleanDev({ ldist: (0.1 / LENS_K) * 100 })! })
    expect(bend(img, lineNear(img, 50))).toBeLessThan(before / 3)
  })
})
