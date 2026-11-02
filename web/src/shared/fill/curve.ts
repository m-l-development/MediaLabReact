/** Kurver (0–1) for bildejusteringer og fargekurve-gradienter. */

/** Monoton kubisk kurve gjennom punktene (0–1). */
export function curveFn(pts: [number, number][] | null | undefined): ((x: number) => number) | null {
  if (!pts || pts.length < 2) return null
  const p = pts.slice().sort((a, b) => a[0] - b[0])
  const n = p.length
  const X = (i: number) => (p[i] as [number, number])[0]
  const Yv = (i: number) => (p[i] as [number, number])[1]
  const d: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((Yv(i + 1) - Yv(i)) / Math.max(1e-6, X(i + 1) - X(i)))
  m[0] = d[0] ?? 0
  m[n - 1] = d[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1] ?? 0
    const b = d[i] ?? 0
    m[i] = a * b <= 0 ? 0 : (a + b) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] ?? 0
    if (di === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = (m[i] ?? 0) / di
    const b = (m[i + 1] ?? 0) / di
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * di
      m[i + 1] = t * b * di
    }
  }
  return (x: number) => {
    if (x <= X(0)) return Yv(0)
    if (x >= X(n - 1)) return Yv(n - 1)
    let k = 0
    while (k < n - 2 && x > X(k + 1)) k++
    const h = X(k + 1) - X(k)
    const t = (x - X(k)) / h
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * Yv(k) + (t3 - 2 * t2 + t) * h * (m[k] ?? 0) + (-2 * t3 + 3 * t2) * Yv(k + 1) + (t3 - t2) * h * (m[k + 1] ?? 0)
  }
}
