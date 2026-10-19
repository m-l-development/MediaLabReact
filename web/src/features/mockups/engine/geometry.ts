/** Geometri for Mockups: homografi (perspektiv) fra enhetskvadratet til skjermens fire hjørner. Rene funksjoner. */

export type Point = [number, number]
/** Skjermens hjørner: øverst venstre, øverst høyre, nederst høyre, nederst venstre. */
export type Quad = [Point, Point, Point, Point]
/** 3×3-matrise i radrekkefølge (h[8] = 1). */
export type Homography = number[]

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

/** Gauss-eliminasjon med pivotering. Returnerer null for singulære systemer. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let i = 0; i < n; i++) {
    let mx = i
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k]?.[i] ?? 0) > Math.abs(A[mx]?.[i] ?? 0)) mx = k
    ;[A[i], A[mx]] = [A[mx] as number[], A[i] as number[]]
    ;[b[i], b[mx]] = [b[mx] as number, b[i] as number]
    const row = A[i] as number[]
    const p = row[i] ?? 0
    if (Math.abs(p) < 1e-12) return null
    for (let k = i + 1; k < n; k++) {
      const rk = A[k] as number[]
      const f = (rk[i] ?? 0) / p
      for (let j = i; j < n; j++) rk[j] = (rk[j] ?? 0) - f * (row[j] ?? 0)
      b[k] = (b[k] ?? 0) - f * (b[i] ?? 0)
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    const row = A[i] as number[]
    let s = b[i] ?? 0
    for (let j = i + 1; j < n; j++) s -= (row[j] ?? 0) * (x[j] ?? 0)
    x[i] = s / (row[i] ?? 1)
  }
  return x
}

/** Homografi som sender enhetskvadratet til firkanten q. */
export function homography(q: readonly Point[]): Homography | null {
  const src: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i] as Point
    const [x, y] = q[i] as Point
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x])
    b.push(x)
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y])
    b.push(y)
  }
  const h = solve(A, b)
  return h ? [...h, 1] : null
}

export function project(h: Homography, u: number, v: number): Point {
  const w = (h[6] ?? 0) * u + (h[7] ?? 0) * v + (h[8] ?? 1)
  return [((h[0] ?? 0) * u + (h[1] ?? 0) * v + (h[2] ?? 0)) / w, ((h[3] ?? 0) * u + (h[4] ?? 0) * v + (h[5] ?? 0)) / w]
}

export function area(q: readonly Point[]): number {
  let a = 0
  for (let i = 0; i < q.length; i++) {
    const p = q[i] as Point
    const n = q[(i + 1) % q.length] as Point
    a += p[0] * n[1] - n[0] * p[1]
  }
  return Math.abs(a) / 2
}

/** Sorterer fire punkter med klokka, med punktet nærmest øverst til venstre først. */
export function order(pts: readonly Point[]): Quad {
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p[0] / pts.length
    cy += p[1] / pts.length
  }
  const s = [...pts].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx))
  let k = 0
  let best = Infinity
  s.forEach((p, i) => {
    if (p[0] + p[1] < best) {
      best = p[0] + p[1]
      k = i
    }
  })
  return [...s.slice(k), ...s.slice(0, k)] as Quad
}

export function inQuad(q: readonly Point[], x: number, y: number): boolean {
  let s = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i] as Point
    const b = q[(i + 1) % 4] as Point
    const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])
    if (c !== 0) {
      if (s === 0) s = Math.sign(c)
      else if (Math.sign(c) !== s) return false
    }
  }
  return true
}

/** Skjermens sideforhold (bredde/høyde) målt fra hjørnene. */
export function aspectOf(q: readonly Point[]): number {
  const d = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const [p0, p1, p2, p3] = q as Quad
  return (d(p0, p1) + d(p3, p2)) / 2 / Math.max(1, (d(p0, p3) + d(p1, p2)) / 2)
}

/** Innfelling per side (topp, høyre, bunn, venstre) som andel av flatens bredde/høyde. */
export type Inset = [number, number, number, number]

/**
 * Firkanten innfelt i perspektiv: sidene flyttes innover med andeler av flaten (i flatens egne koordinater, så en
 * jevn ramme i virkeligheten blir smalere der flaten er lenger unna). Brukes når fotoets skjerm er svart og går i ett
 * med den svarte rammen: glassets ytterkant finnes, og det aktive skjermområdet ligger rammens tykkelse innenfor.
 */
export function insetQuad(q: Quad, [t, r, b, l]: Inset): Quad {
  const h = homography(q)
  if (!h) return q
  return [project(h, l, t), project(h, 1 - r, t), project(h, 1 - r, 1 - b), project(h, l, 1 - b)]
}

/** Skalerer en firkant rundt sentrum (f.eks. 1.025 for å dekke kanten av skjermen). */
export function growQuad(q: readonly Point[], f: number): Quad {
  const cx = q.reduce((s, p) => s + p[0], 0) / 4
  const cy = q.reduce((s, p) => s + p[1], 0) / 4
  return q.map((p) => [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f]) as Quad
}
