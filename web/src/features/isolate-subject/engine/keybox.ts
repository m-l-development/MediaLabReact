/**
 * «Merk i bildet» med firkant uten AI (IS-06): finner objektet i firkanten ved å skille det fra bakgrunnsfargene langs
 * kanten (k-means på kantfargene), rydder med morfologi og beholder bare sammenhengende, store nok områder.
 * Ren funksjon over et nedskalert og lett uskarpt utsnitt (lages av raster.ts). Samme terskler som dagens verktøy.
 */

/** Firkanten i utsnittets koordinater. */
export interface InnerBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

export type KeyResult =
  | { kind: 'none' }
  | { kind: 'full' }
  | { kind: 'mask'; mask: Uint8ClampedArray }

function morph(src: Uint8Array, sw: number, sh: number, r: number, dilate: boolean): Uint8Array<ArrayBuffer> {
  const N = sw * sh
  const t = new Uint8Array(N)
  const o = new Uint8Array(N)
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let v = dilate ? 0 : 1
      for (let j = Math.max(0, x - r); j <= Math.min(sw - 1, x + r); j++) {
        const s = src[y * sw + j]
        if (dilate ? s : !s) {
          v = dilate ? 1 : 0
          break
        }
      }
      t[y * sw + x] = v
    }
  }
  for (let x = 0; x < sw; x++) {
    for (let y = 0; y < sh; y++) {
      let v = dilate ? 0 : 1
      for (let j = Math.max(0, y - r); j <= Math.min(sh - 1, y + r); j++) {
        const s = t[j * sw + x]
        if (dilate ? s : !s) {
          v = dilate ? 1 : 0
          break
        }
      }
      o[y * sw + x] = v
    }
  }
  return o
}

/**
 * @param d     RGBA for utsnittet (sw×sh), allerede nedskalert og lett uskarpt
 * @param scale nedskaleringsfaktoren (brukes til radius ved siste utvidelse)
 */
export function keyRegion(d: Uint8ClampedArray, sw: number, sh: number, box: InnerBox, scale: number): KeyResult {
  const N = sw * sh
  // Oppfattet fargeavstand (vektet RGB).
  const dist = (i: number, c: readonly number[]) => {
    const r = (d[i * 4] ?? 0) - (c[0] ?? 0)
    const g = (d[i * 4 + 1] ?? 0) - (c[1] ?? 0)
    const b = (d[i * 4 + 2] ?? 0) - (c[2] ?? 0)
    const rm = ((d[i * 4] ?? 0) + (c[0] ?? 0)) / 2
    return Math.sqrt((2 + rm / 256) * r * r + 4 * g * g + (2 + (255 - rm) / 256) * b * b) / 3
  }
  const edge: number[] = []
  for (let x = 0; x < sw; x++) edge.push(x, (sh - 1) * sw + x)
  for (let y = 1; y < sh - 1; y++) edge.push(y * sw, y * sw + sw - 1)
  const every = Math.max(1, Math.floor(edge.length / 700))
  const smp = edge.filter((_, i) => i % every === 0)
  const KC = Math.min(6, smp.length)
  let C: number[][] = []
  for (let q = 0; q < KC; q++) {
    const i = smp[Math.floor(((q + 0.5) * smp.length) / KC)] ?? 0
    C.push([d[i * 4] ?? 0, d[i * 4 + 1] ?? 0, d[i * 4 + 2] ?? 0])
  }
  const nearest = (i: number): [number, number] => {
    let bd = 1e9
    let best = 0
    for (let q = 0; q < C.length; q++) {
      const e = dist(i, C[q] ?? [])
      if (e < bd) {
        bd = e
        best = q
      }
    }
    return [best, bd]
  }
  for (let it = 0; it < 8; it++) {
    const acc = C.map(() => [0, 0, 0, 0])
    for (const i of smp) {
      const a = acc[nearest(i)[0]]
      if (!a) continue
      a[0] = (a[0] ?? 0) + (d[i * 4] ?? 0)
      a[1] = (a[1] ?? 0) + (d[i * 4 + 1] ?? 0)
      a[2] = (a[2] ?? 0) + (d[i * 4 + 2] ?? 0)
      a[3] = (a[3] ?? 0) + 1
    }
    C = acc.filter((a) => (a[3] ?? 0) > 2).map((a) => [(a[0] ?? 0) / (a[3] ?? 1), (a[1] ?? 0) / (a[3] ?? 1), (a[2] ?? 0) / (a[3] ?? 1)])
    if (!C.length) return { kind: 'none' }
  }
  const ed = smp.map((i) => nearest(i)[1]).sort((a, b) => a - b)
  const noise = ed[Math.floor(ed.length * 0.85)] ?? 0
  const T = Math.max(22, noise * 1.5 + 8)
  const fg = new Uint8Array(N)
  for (let i = 0; i < N; i++) fg[i] = nearest(i)[1] > T ? 1 : 0

  const rc = Math.max(1, Math.round(Math.max(sw, sh) * 0.035))
  const closed = morph(morph(fg, sw, sh, rc, true), sw, sh, rc, false)
  const inBox = (i: number) => {
    const x = i % sw
    const y = (i / sw) | 0
    return x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1
  }
  let boxN = 0
  for (let i = 0; i < N; i++) {
    fg[i] = closed[i] && inBox(i) ? 1 : 0
    if (inBox(i)) boxN++
  }

  // Bakgrunn = alt som henger sammen med kanten uten å gå gjennom forgrunn.
  const bg = new Uint8Array(N)
  const stack: number[] = []
  const seed = (i: number) => {
    if (!fg[i] && !bg[i]) {
      bg[i] = 1
      stack.push(i)
    }
  }
  for (const i of edge) seed(i)
  while (stack.length) {
    const i = stack.pop() as number
    const x = i % sw
    const y = (i / sw) | 0
    if (x > 0) seed(i - 1)
    if (x < sw - 1) seed(i + 1)
    if (y > 0) seed(i - sw)
    if (y < sh - 1) seed(i + sw)
  }

  // Sammenhengende områder; små flekker forkastes.
  const lab = new Int32Array(N)
  const sizes = [0]
  for (let s = 0; s < N; s++) {
    if (bg[s] || lab[s]) continue
    const id = sizes.length
    let n = 0
    const q = [s]
    lab[s] = id
    while (q.length) {
      const i = q.pop() as number
      n++
      const x = i % sw
      const y = (i / sw) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < sw - 1 ? i + 1 : -1, y > 0 ? i - sw : -1, y < sh - 1 ? i + sw : -1]) {
        if (j >= 0 && !bg[j] && !lab[j]) {
          lab[j] = id
          q.push(j)
        }
      }
    }
    sizes.push(n)
  }
  const big = Math.max(...sizes)
  const minN = Math.max(12, N * 0.004, big * 0.03)
  let keep: Uint8Array<ArrayBuffer> = new Uint8Array(N)
  let on = 0
  for (let i = 0; i < N; i++) {
    const l = lab[i] ?? 0
    if (l && (sizes[l] ?? 0) >= minN) {
      keep[i] = 1
      on++
    }
  }
  keep = morph(keep, sw, sh, Math.max(1, Math.round(2 * scale + 0.5)), true)
  const f = on / Math.max(1, boxN)
  if (f < 0.003) return { kind: 'none' }
  if (f > 0.985) return { kind: 'full' }
  const mask = new Uint8ClampedArray(N)
  for (let i = 0; i < N; i++) if (keep[i] && inBox(i)) mask[i] = 255
  return { kind: 'mask', mask }
}
