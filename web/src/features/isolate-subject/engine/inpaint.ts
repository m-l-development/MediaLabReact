import type { Mask } from './mask'

/**
 * «Fyll med omgivelser» (IS-07): innholdsbevisst utfylling (content-aware fill). Området som fjernes, bygges opp på nytt
 * av ekte biter (7×7 piksler) fra bildet rundt, så tekstur, kanter, lys og korn fortsetter som i resten av bildet:
 * PatchMatch (Barnes m.fl. 2009) i en bildepyramide med iterativ stemming (Wexler m.fl. 2007), samme prinsipp som
 * Content-Aware Fill i bildeprogrammer. Ingen uskarphet eller utsmøring: hver piksel kommer fra et sted i bildet.
 *
 * Før var dette en push-pull-pyramide (gjennomsnitt av fargene rundt + støy), som ga en uskarp flekk (TB, «Menigheten –
 * Guds hus»). Den brukes nå bare som startgjetning på det groveste nivået.
 *
 * Endrer `rgba` (hele bildet, W×H) bare i området som fjernes (masken utvidet med `grow`). Returnerer false hvis masken
 * er tom. Kjøres i en egen tråd i appen (fill.worker.ts), direkte i tester.
 */
export interface FillOptions {
  /** Låser tilfeldighetene (tester, «Prøv på nytt» gir et nytt frø). */
  seed?: number
  /** Hvor mange piksler masken utvides (myke kanter, skygger rundt objektet). Standard etter bildestørrelsen. */
  grow?: number
  /** Fremdrift 0–100. */
  onProgress?: (pct: number) => void
}

const R = 3 // bitene er (2R+1)² = 7×7
const PW = 2 * R + 1

/** Utvidelsen som brukes når brukeren ikke har valgt (dekker kantutjevning og tynne skygger rundt tekst og objekter). */
export function defaultGrow(W: number, H: number): number {
  return Math.max(2, Math.round(Math.min(W, H) / 300))
}

function rng(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Avstand (chamfer 3-4, i piksler) fra hver piksel til nærmeste piksel der `src` er sann. */
export function distance(src: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h)
  const INF = 1e9
  for (let i = 0; i < d.length; i++) d[i] = src[i] ? 0 : INF
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? INF : (d[y * w + x] as number))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!d[i]) continue
      d[i] = Math.min(d[i] as number, at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!d[i]) continue
      d[i] = Math.min(d[i] as number, at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = (d[i] as number) / 3
  return d
}

/** Kvadratisk utvidelse med radius r (separabel). */
function dilateBox(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const t = new Uint8Array(w * h)
  const o = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    let last = -1e9
    for (let x = 0; x < w; x++) if (src[y * w + x]) last = x; else if (x - last <= r) t[y * w + x] = 1
    for (let x = 0; x < w; x++) if (src[y * w + x]) t[y * w + x] = 1
    let next = 1e9
    for (let x = w - 1; x >= 0; x--) if (src[y * w + x]) next = x; else if (next - x <= r) t[y * w + x] = 1
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9
    for (let y = 0; y < h; y++) if (t[y * w + x]) { last = y; o[y * w + x] = 1 } else if (y - last <= r) o[y * w + x] = 1
    let next = 1e9
    for (let y = h - 1; y >= 0; y--) if (t[y * w + x]) next = y; else if (next - y <= r) o[y * w + x] = 1
  }
  return o
}

interface Level { w: number; h: number; img: Float32Array; hole: Uint8Array }

/** Halv oppløsning: gjennomsnitt av kjente piksler; en piksel er hull hvis noen av de fire under er hull. */
function down(l: Level): Level {
  const w = Math.ceil(l.w / 2)
  const h = Math.ceil(l.h / 2)
  const img = new Float32Array(w * h * 3)
  const hole = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x
      let n = 0
      let r = 0, g = 0, b = 0
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const X = 2 * x + dx, Y = 2 * y + dy
          if (X >= l.w || Y >= l.h) continue
          const i = Y * l.w + X
          if (l.hole[i]) { hole[j] = 1; continue }
          r += l.img[i * 3] as number; g += l.img[i * 3 + 1] as number; b += l.img[i * 3 + 2] as number; n++
        }
      }
      if (n) { img[j * 3] = r / n; img[j * 3 + 1] = g / n; img[j * 3 + 2] = b / n }
    }
  }
  return { w, h, img, hole }
}

/** Startgjetning på det groveste nivået: hullet fylles utenfra og inn med gjennomsnittet av naboene. */
function peel(l: Level): void {
  const { w, h, img } = l
  const known = new Uint8Array(w * h)
  for (let i = 0; i < known.length; i++) known[i] = l.hole[i] ? 0 : 1
  let left = known.reduce((s, v) => s + (v ? 0 : 1), 0)
  while (left > 0) {
    const add: number[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (known[i]) continue
        let n = 0, r = 0, g = 0, b = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue
            const k = Y * w + X
            if (!known[k]) continue
            r += img[k * 3] as number; g += img[k * 3 + 1] as number; b += img[k * 3 + 2] as number; n++
          }
        }
        if (n) { img[i * 3] = r / n; img[i * 3 + 1] = g / n; img[i * 3 + 2] = b / n; add.push(i) }
      }
    }
    if (!add.length) break
    for (const i of add) known[i] = 1
    left -= add.length
  }
}

export function inpaint(rgba: Uint8ClampedArray, W: number, H: number, remove: Mask, opt: FillOptions = {}): boolean {
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      if ((remove[i] ?? 0) > 20) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return false
  const random = rng(opt.seed ?? 1)
  const grow = Math.max(0, Math.round(opt.grow ?? defaultGrow(W, H)))
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  // omgivelsene som bitene hentes fra: nok til tekstur og struktur rundt, ikke hele bildet
  const mg = Math.min(320, Math.max(32, Math.round(Math.max(3 * Math.min(bw, bh), 0.35 * Math.max(bw, bh))))) + grow + R
  const X0 = Math.max(0, x0 - mg), Y0 = Math.max(0, y0 - mg)
  const w = Math.min(W, x1 + mg + 1) - X0, h = Math.min(H, y1 + mg + 1) - Y0
  const n = w * h

  const img = new Float32Array(n * 3)
  const seed = new Uint8Array(n)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const p = ((Y0 + y) * W + X0 + x) * 4
      img[i * 3] = rgba[p] as number; img[i * 3 + 1] = rgba[p + 1] as number; img[i * 3 + 2] = rgba[p + 2] as number
      seed[i] = (remove[(Y0 + y) * W + X0 + x] ?? 0) > 20 ? 1 : 0
    }
  }
  // utvidet maske: kantutjevning og skygger rundt objektet tas med, så det ikke blir en lys/mørk rand igjen
  const dist0 = distance(seed, w, h)
  const hole0 = new Uint8Array(n)
  for (let i = 0; i < n; i++) hole0[i] = (dist0[i] as number) <= grow ? 1 : 0

  // nivåene velges etter hvor tykt hullet er (ikke hvor langt): lang, tynn tekst fylles fra begge sider nesten i full
  // oppløsning, så tynne linjer (lister, kanter) ikke forsvinner på grove nivåer
  const pyr: Level[] = [{ w, h, img, hole: hole0 }]
  const depth = distance(Uint8Array.from(hole0, (v) => (v ? 0 : 1)), w, h).reduce((m, v) => Math.max(m, v), 0)
  while (pyr.length < 7 && depth / 2 ** (pyr.length - 1) > 2 * R && Math.min(w, h) >> pyr.length >= 3 * PW) pyr.push(down(pyr[pyr.length - 1] as Level))

  // arbeidsmengde per nivå (til fremdriften)
  // nok runder til at strukturen vokser inn fra kantene (ca. R piksler per runde), flere på grove (billige) nivåer
  const itersFor = (k: number) => { const top = k === pyr.length - 1; return Math.min(top ? 12 : 10, Math.max(k === 0 ? 3 : 4, Math.ceil(depth / 2 ** k / R) + (top ? 4 : 1))) }
  const work = pyr.map((l, k) => itersFor(k) * l.hole.reduce((s, v) => s + v, 0) + 1)
  const total = work.reduce((s, v) => s + v, 0)
  let doneWork = 0
  let lastPct = -1
  const progress = (frac: number, k: number) => {
    const pct = Math.min(99, Math.round(((doneWork + frac * (work[k] as number)) / total) * 100))
    if (pct !== lastPct) { lastPct = pct; opt.onProgress?.(pct) }
  }

  let prevNnf: Int32Array | null = null
  let prevW = 0
  for (let k = pyr.length - 1; k >= 0; k--) {
    const l = pyr[k] as Level
    const { w: lw, h: lh, img: I, hole } = l
    const N = lw * lh
    if (k < pyr.length - 1) {
      // hullet starter med det ferdige grovere nivået (nærmeste piksel)
      const c = pyr[k + 1] as Level
      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < lw; x++) {
          const i = y * lw + x
          if (!hole[i]) continue
          const j = (y >> 1) * c.w + (x >> 1)
          I[i * 3] = c.img[j * 3] as number; I[i * 3 + 1] = c.img[j * 3 + 1] as number; I[i * 3 + 2] = c.img[j * 3 + 2] as number
        }
      }
    }
    // gyldige kilder: hele biten ligger utenfor hullet og innenfor utsnittet
    const near = dilateBox(hole, lw, lh, R)
    const valid = new Uint8Array(N)
    const srcs: number[] = []
    for (let y = R; y < lh - R; y++) for (let x = R; x < lw - R; x++) { const i = y * lw + x; if (!near[i]) { valid[i] = 1; srcs.push(i) } }
    // mål: alle biter som overlapper hullet
    const targets: number[] = []
    for (let i = 0; i < N; i++) if (near[i]) targets.push(i)
    if (k === pyr.length - 1) peel(l)
    if (!srcs.length || !targets.length) { prevNnf = null; doneWork += work[k] as number; continue }
    // nær kanten av hullet er bitene sikrest (Wexler: vekt avtar innover)
    const inside = distance(Uint8Array.from(hole, (v) => (v ? 0 : 1)), lw, lh)

    const nnf = new Int32Array(N).fill(-1)
    const nd = new Float32Array(N)
    const randomSrc = () => srcs[Math.floor(random() * srcs.length)] as number
    const dist = (t: number, s: number, best: number) => {
      const tx = t % lw, ty = (t / lw) | 0, sx = s % lw, sy = (s / lw) | 0
      let sum = 0
      for (let dy = -R; dy <= R; dy++) {
        const Y = ty + dy
        if (Y < 0 || Y >= lh) continue
        const rowT = Y * lw, rowS = (sy + dy) * lw
        for (let dx = -R; dx <= R; dx++) {
          const X = tx + dx
          if (X < 0 || X >= lw) continue
          const a = (rowT + X) * 3, b = (rowS + sx + dx) * 3
          const d0 = (I[a] as number) - (I[b] as number), d1 = (I[a + 1] as number) - (I[b + 1] as number), d2 = (I[a + 2] as number) - (I[b + 2] as number)
          sum += d0 * d0 + d1 * d1 + d2 * d2
        }
        if (sum >= best) return sum
      }
      return sum
    }
    for (const t of targets) {
      let s = -1
      if (prevNnf) {
        const x = t % lw, y = (t / lw) | 0
        const c = prevNnf[(y >> 1) * prevW + (x >> 1)] ?? -1
        if (c >= 0) {
          const sx = Math.min(lw - 1 - R, Math.max(R, 2 * (c % prevW) + (x & 1)))
          const sy = Math.min(lh - 1 - R, Math.max(R, 2 * ((c / prevW) | 0) + (y & 1)))
          if (valid[sy * lw + sx]) s = sy * lw + sx
        }
      }
      if (s < 0) s = randomSrc()
      nnf[t] = s
    }

    const tryS = (t: number, s: number) => {
      if (s < 0 || !valid[s] || s === nnf[t]) return
      const d = dist(t, s, nd[t] as number)
      if (d < (nd[t] as number)) { nnf[t] = s; nd[t] = d }
    }
    const patchMatch = (pass: number) => {
      const fwd = pass % 2 === 0
      const step = fwd ? 1 : -1
      for (let q = fwd ? 0 : targets.length - 1; fwd ? q < targets.length : q >= 0; q += step) {
        const t = targets[q] as number
        const x = t % lw, y = (t / lw) | 0
        // forplantning: naboens kilde, forskjøvet ett steg
        const nx = x - step, ny = y - step
        if (nx >= 0 && nx < lw) { const s = nnf[y * lw + nx] ?? -1; if (s >= 0) { const sx = (s % lw) + step; if (sx >= 0 && sx < lw) tryS(t, s + step) } }
        if (ny >= 0 && ny < lh) { const s = nnf[ny * lw + x] ?? -1; if (s >= 0) tryS(t, s + step * lw) }
        // tilfeldig søk rundt beste kilde, med stadig mindre radius
        const s0 = nnf[t] as number
        const bx = s0 % lw, by = (s0 / lw) | 0
        for (let rad = Math.max(lw, lh); rad >= 1; rad >>= 1) {
          const cx = Math.round(bx + (random() * 2 - 1) * rad), cy = Math.round(by + (random() * 2 - 1) * rad)
          if (cx >= R && cy >= R && cx < lw - R && cy < lh - R) tryS(t, cy * lw + cx)
        }
        // av og til en helt ny kilde (unngår at hele hullet låser seg på én bit)
        tryS(t, randomSrc())
      }
    }
    const acc = new Float32Array(N * 3)
    const wsum = new Float32Array(N)
    // sharp < 0: like vekter (startbildet fra kildene til nivået over)
    const vote = (sharp: number) => {
      acc.fill(0)
      wsum.fill(0)
      const ds = sharp < 0 ? [] : targets.map((t) => (nd[t] as number) / (PW * PW)).sort((a, b) => a - b)
      const sig2 = Math.max(1, ds[Math.floor(ds.length * sharp)] ?? 1)
      for (const t of targets) {
        const s = nnf[t] as number
        const tx = t % lw, ty = (t / lw) | 0, sx = s % lw, sy = (s / lw) | 0
        const wt = (sharp < 0 ? 1 : Math.exp(-(nd[t] as number) / (PW * PW) / (2 * sig2))) * Math.pow(1.3, -(inside[t] as number))
        for (let dy = -R; dy <= R; dy++) {
          const Y = ty + dy
          if (Y < 0 || Y >= lh) continue
          for (let dx = -R; dx <= R; dx++) {
            const X = tx + dx
            if (X < 0 || X >= lw) continue
            const q = Y * lw + X
            if (!hole[q]) continue
            const b = ((sy + dy) * lw + sx + dx) * 3
            acc[q * 3] = (acc[q * 3] as number) + wt * (I[b] as number)
            acc[q * 3 + 1] = (acc[q * 3 + 1] as number) + wt * (I[b + 1] as number)
            acc[q * 3 + 2] = (acc[q * 3 + 2] as number) + wt * (I[b + 2] as number)
            wsum[q] = (wsum[q] as number) + wt
          }
        }
      }
      for (let q = 0; q < N; q++) {
        const ws = wsum[q] as number
        if (!hole[q] || ws <= 0) continue
        I[q * 3] = (acc[q * 3] as number) / ws; I[q * 3 + 1] = (acc[q * 3 + 1] as number) / ws; I[q * 3 + 2] = (acc[q * 3 + 2] as number) / ws
      }
      // avstandene gjelder det nye bildet
      for (const t of targets) nd[t] = dist(t, nnf[t] as number, Infinity)
    }

    if (prevNnf) vote(-1) // finere nivå: startbildet bygges av de samme kildene som på nivået over (beholder struktur)
    for (const t of targets) nd[t] = dist(t, nnf[t] as number, Infinity)
    const iters = itersFor(k)
    for (let it = 0; it < iters; it++) {
      patchMatch(it * 2)
      patchMatch(it * 2 + 1)
      // siste stemming på fullt nivå: de beste bitene teller mest, så detaljene ikke viskes ut
      vote(k === 0 && it === iters - 1 ? 0.25 : 0.75)
      progress((it + 1) / iters, k)
    }
    doneWork += work[k] as number
    prevNnf = nnf
    prevW = lw
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!hole0[i]) continue
      const p = ((Y0 + y) * W + X0 + x) * 4
      rgba[p] = Math.round(img[i * 3] as number); rgba[p + 1] = Math.round(img[i * 3 + 1] as number); rgba[p + 2] = Math.round(img[i * 3 + 2] as number)
    }
  }
  opt.onProgress?.(100)
  return true
}
