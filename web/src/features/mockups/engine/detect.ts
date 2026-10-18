import { area, clamp, homography, inQuad, order, project, type Point, type Quad } from './geometry'

/** Pikseldata (RGBA) i redusert oppløsning. */
export interface Pixels { w: number; h: number; d: Uint8ClampedArray }

/** Fyller et område med lik farge fra (sx, sy). `lim` begrenser til et utsnitt; `stepLim` hindrer lekkasje over kanter. */
export function flood(P: Pixels, sx: number, sy: number, tol: number, lab: Int32Array, id: number, lim: Uint8Array | null = null, stepLim = 200): number[] {
  const { w, h, d } = P
  const k0 = (sy * w + sx) * 4
  const r0 = d[k0] ?? 0
  const g0 = d[k0 + 1] ?? 0
  const b0 = d[k0 + 2] ?? 0
  const stack = [sy * w + sx]
  const out: number[] = []
  const t2 = tol * tol
  lab[sy * w + sx] = id
  while (stack.length) {
    const p = stack.pop() as number
    out.push(p)
    const x = p % w
    const y = (p - x) / w
    const k = p * 4
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q < 0 || lab[q] || (lim && !lim[q])) continue
      const j = q * 4
      const dr = (d[j] ?? 0) - r0
      const dg = (d[j + 1] ?? 0) - g0
      const db = (d[j + 2] ?? 0) - b0
      const er = (d[j] ?? 0) - (d[k] ?? 0)
      const eg = (d[j + 1] ?? 0) - (d[k + 1] ?? 0)
      const eb = (d[j + 2] ?? 0) - (d[k + 2] ?? 0)
      if (dr * dr + dg * dg + db * db < t2 && er * er + eg * eg + eb * eb < stepLim) {
        lab[q] = id
        stack.push(q)
      }
    }
  }
  return out
}

/** Beste firkant rundt et område: ytterpunktene langs diagonalene eller langs aksene (den største). */
export function quadOf(list: readonly number[], w: number): Quad {
  let a: [number, number, number] = [1e9, 0, 0]
  let b: [number, number, number] = [-1e9, 0, 0]
  let c: [number, number, number] = [1e9, 0, 0]
  let e: [number, number, number] = [-1e9, 0, 0]
  let mnx: [number, number, number] = [1e9, 0, 0]
  let mxx: [number, number, number] = [-1e9, 0, 0]
  let mny: [number, number, number] = [1e9, 0, 0]
  let mxy: [number, number, number] = [-1e9, 0, 0]
  for (const p of list) {
    const x = p % w
    const y = (p - x) / w
    const s = x + y
    const t = x - y
    if (s < a[0]) a = [s, x, y]
    if (s > b[0]) b = [s, x, y]
    if (t < c[0]) c = [t, x, y]
    if (t > e[0]) e = [t, x, y]
    if (x < mnx[0]) mnx = [x, x, y]
    if (x > mxx[0]) mxx = [x, x, y]
    if (y < mny[0]) mny = [y, x, y]
    if (y > mxy[0]) mxy = [y, x, y]
  }
  const q1 = order([[a[1], a[2]], [e[1], e[2]], [b[1], b[2]], [c[1], c[2]]])
  const q2 = order([[mnx[1], mnx[2]], [mny[1], mny[2]], [mxx[1], mxx[2]], [mxy[1], mxy[2]]])
  return area(q1) >= area(q2) ? q1 : q2
}

/**
 * Finner skjermen i et fotografi (MK-08 «Finn automatisk»): største, mest rektangulære ensfargede område
 * (svært lyse eller mørke skjermer foretrekkes, områder som berører kanten straffes). Hjørner som andeler (0–1).
 */
export function detectScreen(P: Pixels): Quad | null {
  const { w, h } = P
  const lab = new Int32Array(w * h)
  const N = 14
  let id = 0
  let best: { score: number; q: Quad } | null = null
  for (let gy = 1; gy < N; gy++) {
    for (let gx = 1; gx < N; gx++) {
      const sx = Math.round((gx / N) * (w - 1))
      const sy = Math.round((gy / N) * (h - 1))
      if (lab[sy * w + sx]) continue
      id++
      const reg = flood(P, sx, sy, 34, lab, id)
      const fr = reg.length / (w * h)
      if (fr < 0.02 || fr > 0.7) continue
      let border = 0
      for (const p of reg) {
        const x = p % w
        const y = (p - x) / w
        if (x < 2 || y < 2 || x > w - 3 || y > h - 3) border++
      }
      const q = quadOf(reg, w)
      const qa = area(q)
      const rect = qa ? reg.length / qa : 0
      if (rect < 0.6) continue
      const k = (sy * w + sx) * 4
      const L = 0.3 * (P.d[k] ?? 0) + 0.59 * (P.d[k + 1] ?? 0) + 0.11 * (P.d[k + 2] ?? 0)
      const score = reg.length * Math.pow(rect, 6) * (border > (w + h) * 0.04 ? 0.15 : 1) * (L > 205 || L < 45 ? 1.6 : 1)
      if (!best || score > best.score) best = { score, q }
    }
  }
  if (!best) return null
  return best.q.map((p) => [clamp(p[0] / (w - 1), 0, 1), clamp(p[1] / (h - 1), 0, 1)]) as Quad
}

/**
 * Maske for skjermflaten (0/1 per piksel i P-oppløsning) som tar med fingre og ting foran skjermen (MK-07):
 * skjermens farge fylles innenfra, og bare det som henger sammen med skjermen, blir en del av den.
 * Returnerer null hvis skjermen ikke kan skilles fra det som er foran (da brukes hele firkanten).
 */
export function occlusionMask(P: Pixels, qn: readonly Point[], keepHoles: boolean): Uint8Array | null {
  const { w, h, d } = P
  const qs = qn.map((p) => [p[0] * (w - 1), p[1] * (h - 1)] as Point)
  const cx = qs.reduce((s, p) => s + p[0], 0) / 4
  const cy = qs.reduce((s, p) => s + p[1], 0) / 4
  const qg = qs.map((p) => [cx + (p[0] - cx) * 1.02, cy + (p[1] - cy) * 1.02] as Point)
  const lim = new Uint8Array(w * h)
  let qa = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inQuad(qg, x, y)) {
        lim[y * w + x] = 1
        if (inQuad(qs, x, y)) qa++
      }
    }
  }
  const lab = new Int32Array(w * h)
  const counts = new Map<number, number>()
  const hs = homography(qs)
  if (!hs) return null
  let id = 0
  for (let j = 1; j < 8; j++) {
    for (let i = 1; i < 8; i++) {
      const s = project(hs, 0.15 + (i / 8) * 0.7, 0.15 + (j / 8) * 0.7)
      const sx = Math.round(s[0])
      const sy = Math.round(s[1])
      if (sx < 0 || sy < 0 || sx >= w || sy >= h || lab[sy * w + sx]) continue
      id++
      const k = (sy * w + sx) * 4
      const L = 0.3 * (d[k] ?? 0) + 0.59 * (d[k + 1] ?? 0) + 0.11 * (d[k + 2] ?? 0)
      counts.set(id, flood(P, sx, sy, L < 70 ? 140 : 78, lab, id, lim, L < 70 ? 900 : 420).length)
    }
  }
  let bid = 0
  let bn = 0
  counts.forEach((n, k) => {
    if (n > bn) {
      bn = n
      bid = k
    }
  })
  if (!qa || bn / qa <= 0.5) return null
  let m = new Uint8Array(w * h)
  for (let p = 0; p < m.length; p++) if (lab[p] === bid) m[p] = 1
  if (!keepHoles) {
    // Hull som ikke henger sammen med kanten (f.eks. refleksjoner midt i skjermen), fylles.
    const reach = new Uint8Array(w * h)
    const stack: number[] = []
    for (let p = 0; p < m.length; p++) {
      if (!lim[p] || m[p]) continue
      const x = p % w
      const y = (p - x) / w
      if (!inQuad(qg, x - 1, y) || !inQuad(qg, x + 1, y) || !inQuad(qg, x, y - 1) || !inQuad(qg, x, y + 1)) {
        reach[p] = 1
        stack.push(p)
      }
    }
    while (stack.length) {
      const c = stack.pop() as number
      const x = c % w
      const y = (c - x) / w
      for (const nq of [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, y > 0 ? c - w : -1, y < h - 1 ? c + w : -1]) {
        if (nq >= 0 && lim[nq] && !m[nq] && !reach[nq]) {
          reach[nq] = 1
          stack.push(nq)
        }
      }
    }
    for (let p = 0; p < m.length; p++) if (lim[p] && !m[p] && !reach[p]) m[p] = 1
  }
  // Skygger på skjermen (samme fargetone som skjermen, bare mørkere) hører til skjermen, ikke til fingeren:
  // ellers vises fotoets egen skjerm i skyggen. Hud og andre gjenstander har en annen fargetone og blir stående.
  {
    let sr = 0, sg = 0, sb = 0, sl = 0, n = 0
    for (let p = 0; p < m.length; p++) {
      if (!m[p]) continue
      const k = p * 4, r = d[k] ?? 0, g = d[k + 1] ?? 0, b = d[k + 2] ?? 0, s = r + g + b + 1
      sr += r / s; sg += g / s; sb += b / s; sl += s; n++
    }
    if (n) {
      sr /= n; sg /= n; sb /= n; sl /= n
      // bare skygger som henger sammen med skjermen (vokser fra skjermkanten), så lyse flekker i en finger
      // (f.eks. en negl) som er omgitt av hud, ikke blir regnet som skjerm
      const like = (p: number) => {
        const x = p % w, y = (p - x) / w
        if (!lim[p] || !inQuad(qs, x, y)) return false
        const k = p * 4, r = d[k] ?? 0, g = d[k + 1] ?? 0, b = d[k + 2] ?? 0, s = r + g + b + 1
        return Math.hypot(r / s - sr, g / s - sg, b / s - sb) < 0.045 && s > sl * 0.3 && s <= sl * 1.08
      }
      const stack: number[] = []
      for (let p = 0; p < m.length; p++) if (m[p]) stack.push(p)
      while (stack.length) {
        const c = stack.pop() as number
        const x = c % w
        for (const nq of [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w]) {
          if (nq < 0 || nq >= m.length || m[nq] || !like(nq)) continue
          m[nq] = 1
          stack.push(nq)
        }
      }
    }
  }
  // Utvid én piksel så overgangen mot fingre og kanter ikke får en lys eller mørk stripe.
  for (let it = 0; it < 1; it++) {
    const next = new Uint8Array(m)
    for (let p = 0; p < m.length; p++) {
      if (m[p] || !lim[p]) continue
      const x = p % w
      const y = (p - x) / w
      if ((x > 0 && m[p - 1]) || (x < w - 1 && m[p + 1]) || (y > 0 && m[p - w]) || (y < h - 1 && m[p + w])) next[p] = 1
    }
    m = next
  }
  return m
}
