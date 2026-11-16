/**
 * Panorama – geometri: 3 × 3-rotasjoner (radvis, 9 tall), stråler, rotasjon fra punktpar (Horn, kvaternioner),
 * RANSAC, utretting av horisonten («wave correction») og projeksjonene (plan, sylinder, kule).
 *
 * Kameramodell: bildepunkt (x, y) med origo i bildets midte → stråle (x, y, f) i kameraets rom (y nedover, z framover).
 * Kameraets rotasjon R gir retningen i verden: w = R · r.
 */

export type M3 = number[]
export type V3 = [number, number, number]

export const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

export function mul(a: M3, b: M3): M3 {
  const o = new Array<number>(9)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!
  return o
}
export const tr = (a: M3): M3 => [a[0]!, a[3]!, a[6]!, a[1]!, a[4]!, a[7]!, a[2]!, a[5]!, a[8]!]
export const app = (m: M3, v: V3): V3 => [m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2], m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2], m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2]]
export const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** Rotasjon om y (gir, mot høyre), x (vipp, opp) og z (rull), vinkler i radianer. */
export function rotY(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c] }
export function rotX(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c] }
export function rotZ(a: number): M3 { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1] }

/** Vinkelen (radianer) mellom to rotasjoner. */
export function angleBetween(a: M3, b: M3): number {
  const m = mul(tr(a), b)
  return Math.acos(Math.max(-1, Math.min(1, (m[0]! + m[4]! + m[8]! - 1) / 2)))
}

/** Egenverdier/-vektorer for en symmetrisk n × n-matrise (Jacobi). Kolonnene i `vec` er egenvektorene. */
export function jacobiEigen(A: number[][]): { val: number[]; vec: number[][] } {
  const n = A.length
  const a = A.map((r) => [...r])
  const v: number[][] = Array.from({ length: n }, (_a, i) => Array.from({ length: n }, (_b, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2
    if (off < 1e-22) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = a[p]![q]!
      if (Math.abs(apq) < 1e-300) continue
      const th = (a[q]![q]! - a[p]![p]!) / (2 * apq)
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
      const c = 1 / Math.sqrt(t * t + 1), s = t * c
      for (let k = 0; k < n; k++) {
        const akp = a[k]![p]!, akq = a[k]![q]!
        a[k]![p] = c * akp - s * akq
        a[k]![q] = s * akp + c * akq
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p]![k]!, aqk = a[q]![k]!
        a[p]![k] = c * apk - s * aqk
        a[q]![k] = s * apk + c * aqk
      }
      for (let k = 0; k < n; k++) {
        const vkp = v[k]![p]!, vkq = v[k]![q]!
        v[k]![p] = c * vkp - s * vkq
        v[k]![q] = s * vkp + c * vkq
      }
    }
  }
  return { val: a.map((r, i) => r[i]!), vec: v }
}

/**
 * Rotasjonen R som best fører strålene `q` over i `p` (p ≈ R · q), minste kvadrater (Horn 1987, kvaternioner).
 * `idx` = hvilke par som brukes (alle når den mangler).
 */
export function fitRotation(p: Float64Array, q: Float64Array, idx?: ArrayLike<number>): M3 {
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0
  const n = idx ? idx.length : p.length / 3
  for (let k = 0; k < n; k++) {
    const i = (idx ? idx[k]! : k) * 3
    const qx = q[i]!, qy = q[i + 1]!, qz = q[i + 2]!, px = p[i]!, py = p[i + 1]!, pz = p[i + 2]!
    Sxx += qx * px; Sxy += qx * py; Sxz += qx * pz
    Syx += qy * px; Syy += qy * py; Syz += qy * pz
    Szx += qz * px; Szy += qz * py; Szz += qz * pz
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ]
  const { val, vec } = jacobiEigen(N)
  let best = 0
  for (let i = 1; i < 4; i++) if (val[i]! > val[best]!) best = i
  const w = vec[0]![best]!, x = vec[1]![best]!, y = vec[2]![best]!, z = vec[3]![best]!
  return [
    w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z,
  ]
}

/** Enkel deterministisk tilfeldighet (samme resultat hver gang). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

export interface RotFit { R: M3; inl: number[]; err: number }

/**
 * RANSAC: rotasjonen mellom to kameraer fra samsvarende stråler (p ≈ R q). `thr` = største vinkelavvik (radianer) for
 * et innlier. Gir null når færre enn `minInl` stemmer.
 */
export function ransacRotation(p: Float64Array, q: Float64Array, thr: number, iters = 400, minInl = 8, seed = 7): RotFit | null {
  const n = p.length / 3
  if (n < 2) return null
  const rand = rng(seed + n)
  const cosT = Math.cos(thr)
  const count = (R: M3, out?: number[]) => {
    let c = 0
    for (let i = 0; i < n; i++) {
      const j = i * 3
      const rx = R[0]! * q[j]! + R[1]! * q[j + 1]! + R[2]! * q[j + 2]!
      const ry = R[3]! * q[j]! + R[4]! * q[j + 1]! + R[5]! * q[j + 2]!
      const rz = R[6]! * q[j]! + R[7]! * q[j + 1]! + R[8]! * q[j + 2]!
      if (rx * p[j]! + ry * p[j + 1]! + rz * p[j + 2]! >= cosT) {
        c++
        out?.push(i)
      }
    }
    return c
  }
  let bestR: M3 | null = null, bestC = 0
  for (let it = 0; it < iters; it++) {
    const a = Math.floor(rand() * n)
    let b = Math.floor(rand() * n)
    if (b === a) b = (a + 1) % n
    // to par som ligger for nær hverandre gir en ustabil rotasjon
    const ja = a * 3, jb = b * 3
    if (q[ja]! * q[jb]! + q[ja + 1]! * q[jb + 1]! + q[ja + 2]! * q[jb + 2]! > 0.99999) continue
    const R = fitRotation(p, q, [a, b])
    const c = count(R)
    if (c > bestC) { bestC = c; bestR = R }
  }
  if (!bestR || bestC < minInl) return null
  // forbedring: tilpass på alle innliere, tell på nytt (to ganger)
  let R = bestR
  let inl: number[] = []
  for (let k = 0; k < 2; k++) {
    inl = []
    count(R, inl)
    if (inl.length < 2) return null
    R = fitRotation(p, q, inl)
  }
  inl = []
  count(R, inl)
  if (inl.length < minInl) return null
  let err = 0
  for (const i of inl) {
    const j = i * 3
    const r = app(R, [q[j]!, q[j + 1]!, q[j + 2]!])
    err += Math.acos(Math.min(1, r[0] * p[j]! + r[1] * p[j + 1]! + r[2] * p[j + 2]!)) ** 2
  }
  return { R, inl, err: Math.sqrt(err / inl.length) }
}

/**
 * Utretting av horisonten: finner «opp» som står vinkelrett på alle kameraenes x-akser (minste egenvektor av Σ x xᵀ),
 * og en rotasjon som legger det langs verdens y-akse med midten av bildene rett fram.
 * Retur: W (nye verdenskoordinater = W · gamle).
 */
export function levelRotation(Rs: M3[]): M3 {
  if (Rs.length < 2) return I3
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  let ySum: V3 = [0, 0, 0], zSum: V3 = [0, 0, 0]
  for (const R of Rs) {
    const x: V3 = [R[0]!, R[3]!, R[6]!]
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a]![b]! += x[a]! * x[b]!
    ySum = [ySum[0] + R[1]!, ySum[1] + R[4]!, ySum[2] + R[7]!]
    zSum = [zSum[0] + R[2]!, zSum[1] + R[5]!, zSum[2] + R[8]!]
  }
  const { val, vec } = jacobiEigen(C)
  let mi = 0
  for (let i = 1; i < 3; i++) if (val[i]! < val[mi]!) mi = i
  let up: V3 = norm([vec[0]![mi]!, vec[1]![mi]!, vec[2]![mi]!])
  if (dot(up, ySum) < 0) up = [-up[0], -up[1], -up[2]]
  // framover: gjennomsnittet av kameraenes z-akser, vinkelrett på opp
  let fw: V3 = [zSum[0] - up[0] * dot(zSum, up), zSum[1] - up[1] * dot(zSum, up), zSum[2] - up[2] * dot(zSum, up)]
  if (Math.hypot(...fw) < 1e-9) fw = [0, 0, 1]
  fw = norm(fw)
  const right = norm(cross(up, fw))
  return [...right, ...up, ...fw]
}

export type Proj = 'plane' | 'cyl' | 'sph'

/** Retning i verden → projeksjonskoordinater (radianer / tangens). null = utenfor (planet bak kameraet). */
export function toProj(proj: Proj, w: V3): [number, number] | null {
  if (proj === 'plane') {
    if (w[2] <= 0.02) return null
    return [w[0] / w[2], w[1] / w[2]]
  }
  const th = Math.atan2(w[0], w[2])
  const rh = Math.hypot(w[0], w[2])
  if (proj === 'cyl') return [th, w[1] / Math.max(1e-9, rh)]
  return [th, Math.atan2(w[1], rh)]
}

/** Projeksjonskoordinater → retning i verden (ikke normalisert for planet og sylinderen). */
export function fromProj(proj: Proj, u: number, v: number, out: Float64Array): void {
  if (proj === 'plane') { out[0] = u; out[1] = v; out[2] = 1; return }
  const s = Math.sin(u), c = Math.cos(u)
  if (proj === 'cyl') { out[0] = s; out[1] = v; out[2] = c; return }
  const cv = Math.cos(v)
  out[0] = s * cv; out[1] = Math.sin(v); out[2] = c * cv
}

/** Største rektangel med bare sanne celler i en binær maske (w × h). Retur i celler. */
export function maxRect(mask: Uint8Array, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const hist = new Int32Array(w)
  let best = { x: 0, y: 0, w: 0, h: 0 }, bestA = 0
  const st: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) hist[x] = mask[y * w + x] ? hist[x]! + 1 : 0
    st.length = 0
    for (let x = 0; x <= w; x++) {
      const cur = x < w ? hist[x]! : 0
      while (st.length && hist[st[st.length - 1]!]! >= cur) {
        const hh = hist[st.pop()!]!
        const left = st.length ? st[st.length - 1]! + 1 : 0
        const a = hh * (x - left)
        if (a > bestA) { bestA = a; best = { x: left, y: y - hh + 1, w: x - left, h: hh } }
      }
      st.push(x)
    }
  }
  return best
}

/** Løser A x = b (n × n, Gauss med delvis pivotering). */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((r, i) => [...r, b[i]!])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r
    ;[M[c], M[piv]] = [M[piv]!, M[c]!]
    const d = M[c]![c]! || 1e-12
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const k = M[r]![c]! / d
      if (k) for (let j = c; j <= n; j++) M[r]![j]! -= k * M[c]![j]!
    }
  }
  return M.map((r, i) => r[n]! / (r[i]! || 1e-12))
}
