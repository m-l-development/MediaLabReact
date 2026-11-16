import { describe, expect, it } from 'vitest'
import { angleBetween, app, fitRotation, mul, ransacRotation, rng, rotX, rotY, rotZ, tr, type V3 } from './geometry'
import { analyze, PANO_DEFAULT, render, type Analysis, type PanoParams } from './stitch'
import { D2R, dirToWorld, makeWorld, view, viewRotation, type ViewOpt } from './testkit'

const R2D = 180 / Math.PI

/** Relativ gir (grader) mellom to kameraer i analysen. */
const relYaw = (an: Analysis, a: number, b: number) => {
  const Ra = an.cams[a]!.R, Rb = an.cams[b]!.R
  const za = app(mul(an.level, Ra), [0, 0, 1]), zb = app(mul(an.level, Rb), [0, 0, 1])
  return (Math.atan2(zb[0], zb[2]) - Math.atan2(za[0], za[2])) * R2D
}

/** Gjennomsnittlig avvik (0–255) mellom panoramaet og den sanne verdenen, der panoramaet har bilde. */
function truthError(img: ReturnType<typeof render>, world: ReturnType<typeof makeWorld>, proj: PanoParams['proj'], Rw = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
  let e = 0, n = 0
  for (let y = 4; y < img.h - 4; y += 3) for (let x = 4; x < img.w - 4; x += 3) {
    const q = (y * img.w + x) * 4
    if (img.data[q + 3] !== 255) continue
    const u = img.u0 + (x + 0.5) / img.s, v = img.v0 + (y + 0.5) / img.s
    const d: V3 = proj === 'cyl' ? [Math.sin(u), v, Math.cos(u)] : proj === 'sph' ? [Math.sin(u) * Math.cos(v), Math.sin(v), Math.cos(u) * Math.cos(v)] : [u, v, 1]
    const c = dirToWorld(world, app(Rw, d))
    e += Math.abs(c[0] - img.data[q]!) + Math.abs(c[1] - img.data[q + 1]!) + Math.abs(c[2] - img.data[q + 2]!)
    n += 3
  }
  return e / Math.max(1, n)
}

describe('panorama – geometri', () => {
  it('rotasjon fra stråler (Horn) og RANSAC med 40 % feil samsvar', () => {
    const R = mul(mul(rotY(0.4), rotX(-0.1)), rotZ(0.05))
    const r = rng(9)
    const n = 120
    const p = new Float64Array(n * 3), q = new Float64Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v: V3 = [r() - 0.5, r() - 0.5, 1]
      const l = Math.hypot(...v)
      const qv: V3 = [v[0] / l, v[1] / l, v[2] / l]
      const pv = i < 72 ? app(R, qv) : ([r() - 0.5, r() - 0.5, 1] as V3).map((x, _, a) => x / Math.hypot(...(a as V3))) as V3
      q.set(qv, i * 3)
      p.set(pv, i * 3)
    }
    expect(angleBetween(fitRotation(p, q, Array.from({ length: 72 }, (_, i) => i)), R)).toBeLessThan(1e-6)
    const fit = ransacRotation(p, q, 0.002)!
    expect(fit.inl.length).toBeGreaterThanOrEqual(72)
    expect(angleBetween(fit.R, R)).toBeLessThan(1e-6)
  })
})

describe('panorama – sammenføyning av ekte kameravisninger', () => {
  const world = makeWorld(4)
  const shoot = (os: ViewOpt[]) => os.map((o, i) => view(world, { seed: i + 1, ...o }))

  it('fire bilder i tilfeldig rekkefølge (40 % overlapp): plassering, synsvinkel og bildet stemmer med virkeligheten', () => {
    const yaws = [-45, -15, 15, 45]
    const order = [2, 0, 3, 1]
    const imgs = shoot(order.map((k) => ({ yaw: yaws[k]!, fov: 50 })))
    const an = analyze(imgs)
    expect(an.cams.every((c) => c)).toBe(true)
    for (const c of an.cams) expect(Math.abs(c!.fov * R2D - 50)).toBeLessThan(2)
    // naboene i virkeligheten er 30° fra hverandre
    const at = (k: number) => order.indexOf(k)
    for (let k = 0; k < 3; k++) expect(Math.abs(relYaw(an, at(k), at(k + 1)) - 30)).toBeLessThan(0.4)
    const p: PanoParams = { ...PANO_DEFAULT, seam: 0.6 }
    const out = render(imgs, an, p)
    expect(out.empty).toBe(0) // automatisk beskjæring: ingen tomme hjørner
    expect(out.w).toBeGreaterThan(out.h * 2.5)
    // innholdet er riktig plassert: liten feil mot den sanne verdenen (horisonten er rettet opp, midten rett fram)
    expect(truthError(out, world, 'cyl')).toBeLessThan(14)
    // hele avgrensningen gir tomme hjørner, men samme midtparti
    const none = render(imgs, an, { ...p, crop: 'none' }, { maxW: 800 })
    expect(none.empty).toBeGreaterThan(0.01)
  })

  it('lite overlapp (≈ 20 %), vipp og rull i opptaket: alle plasseres, horisonten rettes opp', () => {
    const imgs = shoot([{ yaw: -40, pitch: 4, roll: 3, fov: 50 }, { yaw: 0, pitch: 6, roll: -2, fov: 50 }, { yaw: 40, pitch: 3, roll: 1, fov: 50 }])
    const an = analyze(imgs)
    expect(an.cams.every((c) => c)).toBe(true)
    // kameraenes rotasjon i forhold til hverandre stemmer med fasiten
    const T = [-40, 0, 40].map((y, i) => viewRotation({ yaw: y, pitch: [4, 6, 3][i]!, roll: [3, -2, 1][i]! }))
    const rel = (R: number[][], a: number, b: number) => mul(tr(R[a]!), R[b]!)
    const est = an.cams.map((c) => c!.R)
    // (med rull i opptaket står ikke kameraenes x-akser vannrett, så sammenlign rotasjonene direkte)
    for (const [a, b] of [[0, 1], [1, 2], [0, 2]] as const) expect(angleBetween(rel(est, a, b), rel(T, a, b)) * R2D).toBeLessThan(0.5)
  })

  it('vanskelig lys: mørkt og lyst bilde, gamma, støy og vignettering – plasseres, og eksponeringen utjevnes', () => {
    const imgs = shoot([
      { yaw: -30, fov: 55, gain: 0.45, noise: 5, vignette: 0.5, gamma: 1.15 },
      { yaw: 0, fov: 55, gain: 1, noise: 3, vignette: 0.3 },
      { yaw: 30, fov: 55, gain: 1.6, noise: 4, vignette: 0.4, gamma: 0.9 },
    ])
    const an = analyze(imgs)
    expect(an.cams.every((c) => c)).toBe(true)
    // det mørke bildet får forsterkning > 1, det lyse < 1
    const g = an.gains.map((x) => (x[0] + x[1] + x[2]) / 3)
    expect(g[0]!).toBeGreaterThan(g[1]! * 1.4)
    expect(g[2]!).toBeLessThan(g[1]! * 0.9)
    // med utjevning er lysforskjellen over sømmene mye mindre enn uten
    const step = (p: PanoParams) => {
      const o = render(imgs, an, p, { maxW: 900 })
      // middellysstyrke i loddrette striper; største hopp mellom nabostriper
      const cols = 60, m = new Array<number>(cols).fill(0), c = new Array<number>(cols).fill(0)
      for (let y = 0; y < o.h; y += 2) for (let x = 0; x < o.w; x++) {
        const q = (y * o.w + x) * 4
        if (o.data[q + 3] !== 255) continue
        const k = Math.floor((x / o.w) * cols)
        m[k]! += o.data[q]! + o.data[q + 1]! + o.data[q + 2]!
        c[k]!++
      }
      const avg = m.map((v, i) => v / Math.max(1, c[i]!))
      return Math.max(avg[cols - 3]! / avg[2]!, avg[2]! / avg[cols - 3]!)
    }
    expect(step({ ...PANO_DEFAULT, expo: true })).toBeLessThan(step({ ...PANO_DEFAULT, expo: false }) * 0.6)
  })

  it('et bilde som ikke hører til, utelates – resten settes sammen', () => {
    const other = view(makeWorld(99), { yaw: 10, fov: 50, seed: 7 })
    const imgs = [...shoot([{ yaw: -20, fov: 50 }, { yaw: 15, fov: 50 }]), other]
    const an = analyze(imgs)
    expect(an.cams[0]).not.toBeNull()
    expect(an.cams[1]).not.toBeNull()
    expect(an.cams[2]).toBeNull()
    const out = render(imgs, an, PANO_DEFAULT, { maxW: 600 })
    expect(out.w).toBeGreaterThan(100)
  })

  it('projeksjoner, synsvinkel og manuell justering per bilde endrer resultatet; EXIF-synsvinkel brukes direkte', () => {
    const imgs = shoot([{ yaw: -20, fov: 60 }, { yaw: 20, fov: 60 }])
    const an = analyze(imgs, [60 * D2R, 60 * D2R])
    expect(an.cams[0]!.fov * R2D).toBeCloseTo(60, 5)
    const base = render(imgs, an, { ...PANO_DEFAULT, proj: 'plane' }, { maxW: 700 })
    expect(truthError(base, world, 'plane')).toBeLessThan(16)
    const sph = render(imgs, an, { ...PANO_DEFAULT, proj: 'sph' }, { maxW: 700 })
    expect(truthError(sph, world, 'sph')).toBeLessThan(16)
    // finjustering av ett bilde gir et annet resultat
    const moved = render(imgs, an, { ...PANO_DEFAULT, crop: 'none', off: [{ yaw: 3, pitch: 1, roll: 0 }] }, { maxW: 700 })
    const still = render(imgs, an, { ...PANO_DEFAULT, crop: 'none' }, { maxW: 700 })
    let diff = 0
    for (let i = 0; i < Math.min(moved.data.length, still.data.length); i += 4) diff += Math.abs(moved.data[i]! - still.data[i]!)
    expect(diff).toBeGreaterThan(1000)
    // full oppløsning: samme mål som bildene (piksler per radian = brennvidden)
    const full = render(imgs, an, PANO_DEFAULT)
    const f = 480 / 2 / Math.tan(30 * D2R)
    expect(full.s).toBeCloseTo(f, 0)
  })
})
