/**
 * Testverktøy for panorama: en «verden» (tekstur på en kule) og ekte kameravisninger av den – kameraet dreies (gir,
 * vipp, rull) med kjent synsvinkel, valgfritt med annen eksponering, gamma, støy og vignettering. Brukes i
 * enhetstestene (og kan brukes i nettleseren).
 */
import type { Img } from './features'
import { app, mul, rng, rotX, rotY, rotZ, type V3 } from './geometry'

export type World = (th: number, ph: number) => [number, number, number]

/** Prosedyreverden: mange fargede rektangler og sirkler i ulike størrelser over en myk bakgrunn. */
export function makeWorld(seed = 1, n = 24000): World {
  const r = rng(seed)
  const shapes: { t: number; p: number; w: number; h: number; c: [number, number, number]; round: boolean }[] = []
  for (let i = 0; i < n; i++) {
    const w = 0.004 + r() ** 3 * 0.12
    shapes.push({ t: (r() * 2 - 1) * Math.PI, p: (r() * 2 - 1) * 1.2, w, h: w * (0.4 + r() * 1.6), c: [r() * 255, r() * 255, r() * 255], round: r() < 0.3 })
  }
  // grovt rutenett for raskt oppslag
  const G = 160, cells: number[][] = Array.from({ length: G * G }, () => [])
  const ci = (t: number, p: number) => [Math.max(0, Math.min(G - 1, Math.floor(((t + Math.PI) / (2 * Math.PI)) * G))), Math.max(0, Math.min(G - 1, Math.floor(((p + 1.6) / 3.2) * G)))] as const
  shapes.forEach((s, i) => {
    const [a, b] = ci(s.t - s.w, s.p - s.h), [c, d] = ci(s.t + s.w, s.p + s.h)
    for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) cells[y * G + x]!.push(i)
  })
  return (th, ph) => {
    const [x, y] = ci(th, ph)
    const list = cells[y * G + x]!
    for (let k = list.length - 1; k >= 0; k--) {
      const s = shapes[list[k]!]!
      const dt = (th - s.t) / s.w, dp = (ph - s.p) / s.h
      if (s.round ? dt * dt + dp * dp <= 1 : Math.abs(dt) <= 1 && Math.abs(dp) <= 1) return s.c
    }
    return [90 + 60 * Math.sin(th * 3), 110 + 40 * Math.cos(ph * 4), 130 + 30 * Math.sin(th + ph)]
  }
}

export interface ViewOpt {
  w?: number
  h?: number
  /** Vannrett synsvinkel i grader. */
  fov?: number
  yaw?: number
  pitch?: number
  roll?: number
  /** Eksponering (multipliseres), gamma, støy (σ i 0–255) og vignettering (0–1). */
  gain?: number
  gamma?: number
  noise?: number
  vignette?: number
  seed?: number
}

export const D2R = Math.PI / 180

/** Kamera → verden for en visning (samme konvensjon som stitch: y ned, z framover). */
export function viewRotation(o: ViewOpt) {
  return mul(mul(rotY((o.yaw ?? 0) * D2R), rotX(-(o.pitch ?? 0) * D2R)), rotZ((o.roll ?? 0) * D2R))
}

export function dirToWorld(world: World, d: V3): [number, number, number] {
  return world(Math.atan2(d[0], d[2]), Math.atan2(d[1], Math.hypot(d[0], d[2])))
}

/** En kameravisning av verdenen (2 × 2 delpiksler for kantutjevning). */
export function view(world: World, o: ViewOpt = {}): Img {
  const w = o.w ?? 480, h = o.h ?? 320
  const f = w / 2 / Math.tan(((o.fov ?? 50) * D2R) / 2)
  const R = viewRotation(o)
  const data = new Uint8ClampedArray(w * h * 4)
  const rand = rng(o.seed ?? 3)
  const g = o.gain ?? 1, gm = o.gamma ?? 1, ns = o.noise ?? 0, vg = o.vignette ?? 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, gg = 0, b = 0
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const c = dirToWorld(world, app(R, [x + 0.25 + sx * 0.5 - w / 2, y + 0.25 + sy * 0.5 - h / 2, f]))
      r += c[0]; gg += c[1]; b += c[2]
    }
    const rr = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) / Math.SQRT2
    const v = 1 - vg * rr * rr
    const tone = (c: number) => 255 * Math.pow(Math.max(0, Math.min(1, ((c / 4) * g * v) / 255)), gm) + (ns ? (rand() + rand() + rand() - 1.5) * 2 * ns : 0)
    const q = (y * w + x) * 4
    data[q] = tone(r)
    data[q + 1] = tone(gg)
    data[q + 2] = tone(b)
    data[q + 3] = 255
  }
  return { w, h, data }
}
