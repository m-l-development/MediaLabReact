/**
 * Panorama – sammenføyning av flere bilder tatt fra samme sted (kameraet dreies).
 *
 * analyze(): trekkpunkter → samsvar mellom alle par → brennvidde (synsvinkel) som gir flest samsvarende punkter under
 *   en ren rotasjonsmodell (eller fra EXIF) → rotasjon for hvert par (RANSAC) → spenntre fra bildet med flest
 *   forbindelser → global finjustering av alle rotasjonene → horisont (utretting) → eksponeringsutjevning (forsterkning
 *   per bilde og fargekanal fra de samsvarende punktenes omgivelser, minste kvadrater).
 * render(): for hver piksel i panoramaet: retning i verden (plan, sylinder eller kule) → hvert bilde som dekker den →
 *   bilineær sampling, vektet med avstanden til bildekanten opphøyd i en eksponent (myk overgang ↔ skarp søm uten
 *   «spøkelser»), med forsterkningene. Beskjæring: automatisk (største rektangel uten tomme hjørner), hele eller egen.
 *
 * Bildene kan komme i hvilken som helst rekkefølge; bilder som ikke henger sammen med resten, utelates (og meldes).
 */
import { detect, match, type Feats, type Img } from './features'
import { app, fitRotation, I3, levelRotation, maxRect, mul, ransacRotation, rotX, rotY, rotZ, solve, toProj, tr, type M3, type Proj, type V3 } from './geometry'

export type { Img, Proj }

export interface Cam { R: M3; fov: number }
export interface Edge { i: number; j: number; n: number; inl: number }
export interface Analysis {
  /** Kamera per bilde (null = kunne ikke plasseres). `fov` = vannrett synsvinkel i radianer. */
  cams: (Cam | null)[]
  /** Utretting av horisonten (nye verdenskoordinater = level · gamle). */
  level: M3
  /** Forsterkning per bilde og kanal (r, g, b) for lik eksponering. */
  gains: [number, number, number][]
  edges: Edge[]
  ref: number
}

export interface ImgOff { yaw: number; pitch: number; roll: number }
export type Crop = 'auto' | 'none' | { x: number; y: number; w: number; h: number }
export interface PanoParams {
  proj: Proj
  /** Brennvidde-faktor (1 = beregnet; < 1 = større synsvinkel). */
  focal: number
  /** Rett opp horisonten automatisk. */
  level: boolean
  /** Hele panoramaet: gir (sideveis), vipp og rull i grader. */
  yaw: number
  pitch: number
  roll: number
  /** Sømmen: 0 = myk overgang (blander), 1 = skarp søm (ingen dobbeltkonturer). */
  seam: number
  /** Eksponeringsutjevning. */
  expo: boolean
  crop: Crop
  /** Manuell finjustering per bilde (grader). */
  off: ImgOff[]
  /** Bilder som er med (mangler = med). */
  use: boolean[]
}

export const PANO_DEFAULT: PanoParams = { proj: 'cyl', focal: 1, level: true, yaw: 0, pitch: 0, roll: 0, seam: 0.6, expo: true, crop: 'auto', off: [], use: [] }

const D2R = Math.PI / 180

function raysOf(F: Feats, im: Img, fov: number, idx: number[]): Float64Array {
  const f = im.w / 2 / Math.tan(fov / 2)
  const out = new Float64Array(idx.length * 3)
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k]!
    const x = F.x[i]! - im.w / 2 + 0.5, y = F.y[i]! - im.h / 2 + 0.5
    const l = Math.hypot(x, y, f)
    out[k * 3] = x / l
    out[k * 3 + 1] = y / l
    out[k * 3 + 2] = f / l
  }
  return out
}

interface PairM { i: number; j: number; m: [number, number][] }

export type Progress = (stage: string, k: number) => void

/** Finner kameraene. `fovHint` = synsvinkel fra EXIF (radianer) per bilde, når den finnes. */
export function analyze(imgs: Img[], fovHint: (number | null)[] = [], progress: Progress = () => undefined): Analysis {
  const n = imgs.length
  const F: Feats[] = []
  for (let i = 0; i < n; i++) {
    F.push(detect(imgs[i]!, 2000))
    progress('features', (i + 1) / n)
  }
  const pairs: PairM[] = []
  let done = 0
  const total = (n * (n - 1)) / 2
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const m = match(F[i]!, F[j]!)
    if (m.length >= 10) pairs.push({ i, j, m })
    progress('match', ++done / Math.max(1, total))
  }
  const rays = (pm: PairM, fi: number, fj: number) => [raysOf(F[pm.i]!, imgs[pm.i]!, fi, pm.m.map((x) => x[0])), raysOf(F[pm.j]!, imgs[pm.j]!, fj, pm.m.map((x) => x[1]))] as const
  // synsvinkel: den som gir flest samsvar under rotasjonsmodellen (bildene antas tatt med samme brennvidde)
  const fovOf = (i: number, base: number) => {
    const h = fovHint[i]
    const h0 = fovHint.find((x) => x)
    // samme kamera: synsvinkelen skaleres med bildebredden (samme brennvidde i piksler per bredde-enhet)
    return h ?? (h0 ? h0 : base)
  }
  const top = [...pairs].sort((a, b) => b.m.length - a.m.length).slice(0, 6)
  const thrPx = 2.5
  const score = (fov: number, iters: number) => {
    let s = 0
    for (const pm of top) {
      const [p, q] = rays(pm, fovOf(pm.i, fov), fovOf(pm.j, fov))
      const f = imgs[pm.i]!.w / 2 / Math.tan(fov / 2)
      const r = ransacRotation(p, q, thrPx / f, iters, 6)
      if (r) s += r.inl.length - Math.min(1, r.err * f / thrPx) * 0.5 * r.inl.length
    }
    return s
  }
  let fov = 60 * D2R
  const hint = fovHint.find((x) => x)
  if (top.length && !hint) {
    let best = -1
    for (let d = 18; d <= 125; d *= 1.05) {
      const sc = score(d * D2R, 160)
      if (sc > best) { best = sc; fov = d * D2R }
    }
    // finjustering rundt det beste
    let lo = fov / 1.1, hi = fov * 1.1
    for (let k = 0; k < 10; k++) {
      const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618
      if (score(a, 220) >= score(b, 220)) hi = b
      else lo = a
    }
    fov = (lo + hi) / 2
  } else if (hint) fov = hint
  progress('fov', 1)
  // rotasjon for hvert par
  const edges: (Edge & { R: M3; p: Float64Array; q: Float64Array; inlIdx: number[] })[] = []
  for (const pm of pairs) {
    const fi = fovOf(pm.i, fov), fj = fovOf(pm.j, fov)
    const [p, q] = rays(pm, fi, fj)
    const f = imgs[pm.i]!.w / 2 / Math.tan(fi / 2)
    // 8 innliere er nok: tilfeldige samsvar stemmer praktisk talt aldri med en felles rotasjon innen noen få piksler
    const r = ransacRotation(p, q, (thrPx * 1.2) / f, 800, 8)
    if (!r || r.inl.length < Math.max(8, pm.m.length * 0.1)) continue
    edges.push({ i: pm.i, j: pm.j, n: pm.m.length, inl: r.inl.length, R: r.R, p, q, inlIdx: r.inl })
  }
  // finjuster synsvinkelen mot alle parenes innliere samlet (minste vinkelfeil), og tilpass rotasjonene på nytt
  if (!hint && edges.length) {
    const cost = (fv: number) => {
      let e = 0
      for (const ed of edges) {
        const pm = pairs.find((x) => x.i === ed.i && x.j === ed.j)!
        const [p, q] = rays(pm, fv, fv)
        const Rr = fitRotation(p, q, ed.inlIdx)
        for (const k of ed.inlIdx) {
          const r = app(Rr, [q[k * 3]!, q[k * 3 + 1]!, q[k * 3 + 2]!])
          e += 1 - Math.min(1, r[0] * p[k * 3]! + r[1] * p[k * 3 + 1]! + r[2] * p[k * 3 + 2]!)
        }
      }
      return e
    }
    let lo = fov / 1.15, hi = fov * 1.15
    for (let k = 0; k < 24; k++) {
      const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618
      if (cost(a) <= cost(b)) hi = b
      else lo = a
    }
    fov = (lo + hi) / 2
    for (const ed of edges) {
      const pm = pairs.find((x) => x.i === ed.i && x.j === ed.j)!
      const [p, q] = rays(pm, fov, fov)
      ed.p = p
      ed.q = q
      ed.R = fitRotation(p, q, ed.inlIdx)
    }
  }
  // spenntre (flest innliere først) fra bildet med flest forbindelser
  const deg = new Array<number>(n).fill(0)
  for (const e of edges) { deg[e.i]! += e.inl; deg[e.j]! += e.inl }
  let ref = 0
  for (let i = 1; i < n; i++) if (deg[i]! > deg[ref]!) ref = i
  const R: (M3 | null)[] = new Array(n).fill(null)
  R[ref] = I3
  for (;;) {
    let be: (typeof edges)[number] | null = null
    for (const e of edges) if ((R[e.i] !== null) !== (R[e.j] !== null) && (!be || e.inl > be.inl)) be = e
    if (!be) break
    // r_i ≈ R_ij r_j  ⇒  R_j = R_i · R_ij
    if (R[be.i]) R[be.j] = mul(R[be.i]!, be.R)
    else R[be.i] = mul(R[be.j]!, tr(be.R))
  }
  // global finjustering: hvert kamera tilpasses alle naboene (Gauss–Seidel), referansen står fast
  for (let it = 0; it < 20; it++) {
    for (let j = 0; j < n; j++) {
      if (j === ref || !R[j]) continue
      const P: number[] = [], Q: number[] = []
      for (const e of edges) {
        const other = e.i === j ? e.j : e.j === j ? e.i : -1
        if (other < 0 || !R[other]) continue
        const Ro = R[other]!
        for (const k of e.inlIdx) {
          const a: V3 = [e.p[k * 3]!, e.p[k * 3 + 1]!, e.p[k * 3 + 2]!], b: V3 = [e.q[k * 3]!, e.q[k * 3 + 1]!, e.q[k * 3 + 2]!]
          // verden = R_other · stråle_other ≈ R_j · stråle_j
          const [ro, rj] = e.i === j ? [b, a] : [a, b]
          P.push(...app(Ro, ro))
          Q.push(...rj)
        }
      }
      if (P.length >= 6) R[j] = fitRotation(Float64Array.from(P), Float64Array.from(Q))
    }
  }
  progress('align', 1)
  const placed = R.map((r, i) => (r ? i : -1)).filter((i) => i >= 0)
  const level = levelRotation(placed.map((i) => R[i]!))
  // eksponering: middelfarge rundt hvert samsvarende punkt i begge bilder
  const gains = gainsOf(imgs, F, pairs, edges, R)
  progress('gain', 1)
  return {
    cams: R.map((r, i) => (r ? { R: r, fov: fovOf(i, fov) } : null)),
    level,
    gains,
    edges: edges.map((e) => ({ i: e.i, j: e.j, n: e.n, inl: e.inl })),
    ref,
  }
}

function gainsOf(imgs: Img[], F: Feats[], pairs: PairM[], edges: { i: number; j: number; inlIdx: number[] }[], R: (M3 | null)[]): [number, number, number][] {
  const n = imgs.length
  const mean = (im: Img, x: number, y: number, c: number) => {
    const r = 4
    let s = 0, k = 0
    for (let yy = Math.max(0, y - r); yy <= Math.min(im.h - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(im.w - 1, x + r); xx++) {
      s += im.data[(yy * im.w + xx) * 4 + c]!
      k++
    }
    return k ? s / k : 0
  }
  const out: [number, number, number][] = Array.from({ length: n }, () => [1, 1, 1])
  // σN: støy i middelverdiene (0–255); σG: hvor sterkt forsterkningene holdes nær 1 (bare for å låse skalaen –
  // sterkere forankring gjorde at et dobbelt så mørkt bilde bare ble lysnet litt)
  const sN = 10, sG = 0.8
  for (let c = 0; c < 3; c++) {
    const A = Array.from({ length: n }, () => new Array<number>(n).fill(0)), b = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) { A[i]![i] = 1e-6; b[i] = 1e-6 }
    for (const e of edges) {
      if (!R[e.i] || !R[e.j]) continue
      const pm = pairs.find((x) => x.i === e.i && x.j === e.j)
      if (!pm) continue
      let a = 0, bb = 0
      for (const k of e.inlIdx) {
        const [ia, ib] = pm.m[k]!
        a += mean(imgs[e.i]!, Math.round(F[e.i]!.x[ia]!), Math.round(F[e.i]!.y[ia]!), c)
        bb += mean(imgs[e.j]!, Math.round(F[e.j]!.x[ib]!), Math.round(F[e.j]!.y[ib]!), c)
      }
      const N = e.inlIdx.length
      a /= N
      bb /= N
      A[e.i]![e.i]! += N * (a * a / sN ** 2 + 1 / sG ** 2)
      A[e.j]![e.j]! += N * (bb * bb / sN ** 2 + 1 / sG ** 2)
      A[e.i]![e.j]! -= (N * a * bb) / sN ** 2
      A[e.j]![e.i]! -= (N * a * bb) / sN ** 2
      b[e.i]! += N / sG ** 2
      b[e.j]! += N / sG ** 2
    }
    const g = solve(A, b)
    for (let i = 0; i < n; i++) out[i]![c] = Number.isFinite(g[i]!) && g[i]! > 0.05 ? Math.min(8, g[i]!) : 1
  }
  // nivået: medianbildet (blant de plasserte) beholder sin eksponering; bare avvikerne justeres (før trakk ett svært mørkt
  // bilde hele panoramaet ned)
  const placed = R.map((r, i) => (r ? i : -1)).filter((i) => i >= 0)
  for (let c = 0; c < 3; c++) {
    const v = placed.map((i) => out[i]![c]!).sort((a, b) => a - b)
    const med = v.length ? v[Math.floor((v.length - 1) / 2)]! : 1
    if (med > 0) for (const i of placed) out[i]![c] = out[i]![c]! / med
  }
  return out
}

export interface Placed {
  /** Kamera → verden (med horisont, helhetsrotasjon og bildets egen finjustering). */
  R: M3
  Rt: M3
  f: number
  w: number
  h: number
  gain: [number, number, number]
}

/** Kameraene slik de tegnes, for bilder i størrelsen `sizes` (kan være annen oppløsning enn analysen). */
export function placeCams(an: Analysis, p: PanoParams, sizes: { w: number; h: number }[]): (Placed | null)[] {
  const U = mul(mul(rotY(p.yaw * D2R), rotX(-p.pitch * D2R)), rotZ(p.roll * D2R))
  const L = p.level ? an.level : I3
  return an.cams.map((c, i) => {
    if (!c || p.use[i] === false || !sizes[i]) return null
    const o = p.off[i] ?? { yaw: 0, pitch: 0, roll: 0 }
    const O = mul(rotY(o.yaw * D2R), rotX(-o.pitch * D2R))
    const R = mul(mul(mul(mul(U, O), L), c.R), rotZ(o.roll * D2R))
    const { w, h } = sizes[i]!
    const f = (w / 2 / Math.tan(c.fov / 2)) * p.focal
    const g = an.gains[i] ?? [1, 1, 1]
    return { R, Rt: tr(R), f, w, h, gain: p.expo ? g : [1, 1, 1] }
  })
}

/** Bildets kantlinje i projeksjonen (for avgrensning og omrisset i forhåndsvisningen). */
export function outline(proj: Proj, c: Placed, per = 24): [number, number][] {
  const pts: [number, number][] = []
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    for (let k = 0; k < per; k++) {
      const t = k / per
      const x = x0 + (x1 - x0) * t - c.w / 2, y = y0 + (y1 - y0) * t - c.h / 2
      const q = toProj(proj, app(c.R, [x, y, c.f]))
      if (q) pts.push(q)
    }
  }
  side(0, 0, c.w, 0)
  side(c.w, 0, c.w, c.h)
  side(c.w, c.h, 0, c.h)
  side(0, c.h, 0, 0)
  return pts
}

const LIM = { plane: [-4, 4, -4, 4], cyl: [-Math.PI, Math.PI, -3, 3], sph: [-Math.PI, Math.PI, -Math.PI / 2, Math.PI / 2] } as const

/** Avgrensningen (projeksjonsenheter) for alle bildene. Bilder som krysser ±180° gir full bredde. */
export function bounds(proj: Proj, cams: (Placed | null)[]): { u0: number; u1: number; v0: number; v1: number; box: ([number, number, number, number] | null)[] } {
  const L = LIM[proj]
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity
  const box = cams.map((c) => {
    if (!c) return null
    const pts = outline(proj, c)
    if (!pts.length) return null
    let a = Infinity, b = -Infinity, cc = Infinity, d = -Infinity
    for (const [u, v] of pts) { a = Math.min(a, u); b = Math.max(b, u); cc = Math.min(cc, v); d = Math.max(d, v) }
    if (proj !== 'plane' && b - a > Math.PI * 1.2) { a = -Math.PI; b = Math.PI }
    // planet: kanter bak kameraet gir ingen punkter – bildet strekker seg da ut mot grensen
    if (proj === 'plane' && pts.length < 96) { a = L[0]; b = L[1]; cc = L[2]; d = L[3] }
    const bx: [number, number, number, number] = [Math.max(L[0], a), Math.min(L[1], b), Math.max(L[2], cc), Math.min(L[3], d)]
    u0 = Math.min(u0, bx[0]); u1 = Math.max(u1, bx[1]); v0 = Math.min(v0, bx[2]); v1 = Math.max(v1, bx[3])
    return bx
  })
  if (!Number.isFinite(u0)) return { u0: -1, u1: 1, v0: -1, v1: 1, box }
  return { u0, u1, v0, v1, box }
}

export interface RenderOpts {
  /** Piksler per projeksjonsenhet relativt til bildenes egen oppløsning (1 = full). */
  scale?: number
  /** Største bredde/høyde og antall piksler i resultatet (skaleres ned ved behov). */
  maxW?: number
  maxH?: number
  maxPx?: number
  progress?: (k: number) => void
}

export interface Rendered {
  w: number
  h: number
  data: Uint8ClampedArray
  /** Projeksjonsenheter → piksler i resultatet: x = (u − u0) · s. */
  s: number
  u0: number
  v0: number
  /** Hele avgrensningen (før beskjæring), i projeksjonsenheter. */
  full: { u0: number; u1: number; v0: number; v1: number }
  /** Beskjæringen som andel av hele avgrensningen (0–1). */
  crop: { x: number; y: number; w: number; h: number }
  /** Andel av resultatet uten bilde (tomme hjørner). */
  empty: number
}

function edgeW(px: number, py: number, w: number, h: number, pw: number): number {
  const d = Math.min(px + 0.5, w - 0.5 - px, py + 0.5, h - 0.5 - py) / (0.5 * Math.min(w, h))
  const x = Math.max(1e-4, Math.min(1, d))
  return pw === 1 ? x : Math.pow(x, pw)
}

/** Dekningen (hvilke celler minst ett bilde dekker) i et rutenett over området. */
function coverage(proj: Proj, cams: (Placed | null)[], box: ([number, number, number, number] | null)[], u0: number, v0: number, sx: number, sy: number, gw: number, gh: number): Uint8Array {
  const m = new Uint8Array(gw * gh)
  const dir = new Float64Array(3)
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const u = u0 + (x + 0.5) / sx, v = v0 + (y + 0.5) / sy
    dirOf(proj, u, v, dir)
    for (let k = 0; k < cams.length; k++) {
      const c = cams[k], b = box[k]
      if (!c || !b || u < b[0] || u > b[1] || v < b[2] || v > b[3]) continue
      const Rt = c.Rt
      const cz = Rt[6]! * dir[0]! + Rt[7]! * dir[1]! + Rt[8]! * dir[2]!
      if (cz <= 1e-6) continue
      const px = (c.f * (Rt[0]! * dir[0]! + Rt[1]! * dir[1]! + Rt[2]! * dir[2]!)) / cz + c.w / 2
      const py = (c.f * (Rt[3]! * dir[0]! + Rt[4]! * dir[1]! + Rt[5]! * dir[2]!)) / cz + c.h / 2
      if (px >= 0 && px <= c.w && py >= 0 && py <= c.h) { m[y * gw + x] = 1; break }
    }
  }
  return m
}

function dirOf(proj: Proj, u: number, v: number, out: Float64Array) {
  if (proj === 'plane') { out[0] = u; out[1] = v; out[2] = 1; return }
  const s = Math.sin(u), c = Math.cos(u)
  if (proj === 'cyl') { out[0] = s; out[1] = v; out[2] = c; return }
  const cv = Math.cos(v)
  out[0] = s * cv; out[1] = Math.sin(v); out[2] = c * cv
}

/** Beskjæringen (projeksjonsenheter) for valget i `p.crop`. */
export function cropRect(proj: Proj, cams: (Placed | null)[], b: ReturnType<typeof bounds>, crop: Crop): { u0: number; u1: number; v0: number; v1: number } {
  const full = { u0: b.u0, u1: b.u1, v0: b.v0, v1: b.v1 }
  if (crop === 'none') return full
  if (crop !== 'auto') {
    const W = b.u1 - b.u0, H = b.v1 - b.v0
    return { u0: b.u0 + crop.x * W, u1: b.u0 + (crop.x + crop.w) * W, v0: b.v0 + crop.y * H, v1: b.v0 + (crop.y + crop.h) * H }
  }
  const W = b.u1 - b.u0, H = b.v1 - b.v0
  const gw = 480, s = gw / W, gh = Math.max(8, Math.min(1600, Math.round(H * s)))
  const sy = gh / H
  const m = coverage(proj, cams, b.box, b.u0, b.v0, s, sy, gw, gh)
  const r = maxRect(m, gw, gh)
  if (r.w < 2 || r.h < 2) return full
  // én celle inn på hver side, så kanten er helt dekket
  const x0 = Math.min(r.x + 1, r.x + r.w - 1), x1 = Math.max(x0 + 1, r.x + r.w - 1)
  const y0 = Math.min(r.y + 1, r.y + r.h - 1), y1 = Math.max(y0 + 1, r.y + r.h - 1)
  return { u0: b.u0 + x0 / s, u1: b.u0 + x1 / s, v0: b.v0 + y0 / sy, v1: b.v0 + y1 / sy }
}

/** Tegner panoramaet. `srcs[i]` = bildene (samme rekkefølge som i analysen, hvilken som helst oppløsning). */
export function render(srcs: (Img | null)[], an: Analysis, p: PanoParams, o: RenderOpts = {}): Rendered {
  const sizes = srcs.map((s) => (s ? { w: s.w, h: s.h } : { w: 0, h: 0 }))
  const cams = placeCams(an, p, sizes).map((c, i) => (srcs[i] ? c : null))
  const b = bounds(p.proj, cams)
  const fs = cams.filter((c): c is Placed => !!c).map((c) => c.f).sort((a, z) => a - z)
  let s = (fs[Math.floor(fs.length / 2)] ?? 1000) * (o.scale ?? 1)
  const cr = cropRect(p.proj, cams, b, p.crop)
  const UW = cr.u1 - cr.u0, VH = cr.v1 - cr.v0
  if (o.maxW && UW * s > o.maxW) s = o.maxW / UW
  if (o.maxH && VH * s > o.maxH) s = o.maxH / VH
  if (o.maxPx && UW * VH * s * s > o.maxPx) s = Math.sqrt(o.maxPx / (UW * VH))
  const W = Math.max(1, Math.round(UW * s)), H = Math.max(1, Math.round(VH * s))
  const out = new Uint8ClampedArray(W * H * 4)
  const pw = 1 + 30 * p.seam * p.seam
  const act = cams.map((c, i) => (c ? i : -1)).filter((i) => i >= 0)
  const colS = new Float64Array(W), colC = new Float64Array(W)
  for (let x = 0; x < W; x++) { const u = cr.u0 + (x + 0.5) / s; colS[x] = Math.sin(u); colC[x] = Math.cos(u) }
  let empty = 0
  const step = Math.max(1, Math.floor(H / 50))
  for (let y = 0; y < H; y++) {
    const v = cr.v0 + (y + 0.5) / s
    const sv = Math.sin(v), cv = Math.cos(v)
    for (let x = 0; x < W; x++) {
      const u = cr.u0 + (x + 0.5) / s
      let dx: number, dy: number, dz: number
      if (p.proj === 'plane') { dx = u; dy = v; dz = 1 } else if (p.proj === 'cyl') { dx = colS[x]!; dy = v; dz = colC[x]! } else { dx = colS[x]! * cv; dy = sv; dz = colC[x]! * cv }
      let ws = 0, r = 0, g = 0, bb = 0
      for (const k of act) {
        const bx = b.box[k]
        if (!bx || u < bx[0] || u > bx[1] || v < bx[2] || v > bx[3]) continue
        const c = cams[k]!, Rt = c.Rt
        const cz = Rt[6]! * dx + Rt[7]! * dy + Rt[8]! * dz
        if (cz <= 1e-6) continue
        const px = (c.f * (Rt[0]! * dx + Rt[1]! * dy + Rt[2]! * dz)) / cz + c.w / 2 - 0.5
        const py = (c.f * (Rt[3]! * dx + Rt[4]! * dy + Rt[5]! * dz)) / cz + c.h / 2 - 0.5
        if (px < -0.5 || py < -0.5 || px > c.w - 0.5 || py > c.h - 0.5) continue
        const wt = edgeW(px, py, c.w, c.h, pw)
        // bilineær sampling
        const sx = Math.min(c.w - 1, Math.max(0, px)), sy = Math.min(c.h - 1, Math.max(0, py))
        const x0 = Math.min(c.w - 2, Math.floor(sx)), y0 = Math.min(c.h - 2, Math.floor(sy))
        const fx = Math.max(0, Math.min(1, sx - x0)), fy = Math.max(0, Math.min(1, sy - y0))
        const d = srcs[k]!.data, iw = c.w
        const i00 = (y0 * iw + x0) * 4, i10 = i00 + 4, i01 = i00 + iw * 4, i11 = i01 + 4
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
        const G = c.gain
        r += wt * G[0] * (d[i00]! * w00 + d[i10]! * w10 + d[i01]! * w01 + d[i11]! * w11)
        g += wt * G[1] * (d[i00 + 1]! * w00 + d[i10 + 1]! * w10 + d[i01 + 1]! * w01 + d[i11 + 1]! * w11)
        bb += wt * G[2] * (d[i00 + 2]! * w00 + d[i10 + 2]! * w10 + d[i01 + 2]! * w01 + d[i11 + 2]! * w11)
        ws += wt
      }
      const q = (y * W + x) * 4
      if (ws > 0) {
        out[q] = r / ws
        out[q + 1] = g / ws
        out[q + 2] = bb / ws
        out[q + 3] = 255
      } else empty++
    }
    if (o.progress && y % step === 0) o.progress(y / H)
  }
  const FW = b.u1 - b.u0 || 1, FH = b.v1 - b.v0 || 1
  return {
    w: W, h: H, data: out, s, u0: cr.u0, v0: cr.v0,
    full: { u0: b.u0, u1: b.u1, v0: b.v0, v1: b.v1 },
    crop: { x: (cr.u0 - b.u0) / FW, y: (cr.v0 - b.v0) / FH, w: UW / FW, h: VH / FH },
    empty: empty / (W * H),
  }
}
