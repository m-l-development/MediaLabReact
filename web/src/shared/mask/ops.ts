/**
 * Maskeredigering, felles for verktøyene (Isolate Subject først). Rene funksjoner over en maske: én byte per piksel,
 * 0 = fjernet, 255 = beholdt, i bildets fulle oppløsning. Alle operasjoner endrer masken på stedet innenfor et
 * avgrenset område og returnerer området (for tegning og angre), så store bilder ikke kopieres for hvert strøk.
 */
export type Mask = Uint8ClampedArray
export interface Box { x0: number; y0: number; x1: number; y1: number }

const clampBox = (b: Box, W: number, H: number): Box | null => {
  const x0 = Math.max(0, Math.floor(b.x0))
  const y0 = Math.max(0, Math.floor(b.y0))
  const x1 = Math.min(W, Math.ceil(b.x1))
  const y1 = Math.min(H, Math.ceil(b.y1))
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null
}
export const unionBox = (a: Box | null, b: Box | null): Box | null =>
  !a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }

/** Setter dekningen `cov` (0–1) for «behold» (maks) eller «fjern» (min) i én piksel. */
function put(m: Mask, i: number, cov: number, keep: boolean) {
  if (cov <= 0) return
  const v = m[i] ?? 0
  if (keep) {
    const t = Math.round(255 * cov)
    if (t > v) m[i] = t
  } else {
    const t = Math.round(255 * (1 - cov))
    if (t < v) m[i] = t
  }
}

/**
 * Kantfølging for penselen: fargen der strøket startet (`ref`) er det brukeren maler på. Piksler i penselen som har
 * tydelig annen farge (avstand over `tol` i RGB), påvirkes ikke, så strøket stopper ved kanter med kontrast (f.eks.
 * mellom en hvit skjorte og en mørk bakgrunn). Der fargene er like, virker penselen som vanlig – kantfølgingen gjør
 * det aldri vanskeligere å markere områder der motiv og bakgrunn har lignende farge.
 */
export interface Snap { rgba: Uint8ClampedArray; ref: [number, number, number]; tol: number }

/** Gjennomsnittsfargen i et 5 × 5-område rundt (x, y). */
export function sampleColor(rgba: Uint8ClampedArray, W: number, H: number, x: number, y: number): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let yy = Math.max(0, Math.floor(y) - 2); yy <= Math.min(H - 1, Math.floor(y) + 2); yy++) {
    for (let xx = Math.max(0, Math.floor(x) - 2); xx <= Math.min(W - 1, Math.floor(x) + 2); xx++) {
      const k = (yy * W + xx) * 4
      r += rgba[k] ?? 0
      g += rgba[k + 1] ?? 0
      b += rgba[k + 2] ?? 0
      n++
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0]
}

/**
 * Ett penselstrøk fra (ax, ay) til (bx, by) med radius r (bildepiksler) og hardhet 0–1 (1 = skarp kant).
 * Avstanden til linjestykket gir dekningen, så strøket blir sammenhengende uansett hvor fort musen flyttes.
 * Med `snap` følger strøket fargekantene (se Snap).
 */
export function brushSegment(m: Mask, W: number, H: number, ax: number, ay: number, bx: number, by: number, r: number, hard: number, keep: boolean, snap: Snap | null = null): Box | null {
  const box = clampBox({ x0: Math.min(ax, bx) - r - 1, y0: Math.min(ay, by) - r - 1, x1: Math.max(ax, bx) + r + 1, y1: Math.max(ay, by) + r + 1 }, W, H)
  if (!box) return null
  const dx = bx - ax
  const dy = by - ay
  const L2 = dx * dx + dy * dy
  const inner = r * Math.min(0.999, Math.max(0, hard))
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const px = x + 0.5 - ax
      const py = y + 0.5 - ay
      const t = L2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / L2)) : 0
      const d = Math.hypot(px - t * dx, py - t * dy)
      if (d > r) continue
      let cov = d <= inner ? 1 : 1 - (d - inner) / Math.max(1e-6, r - inner)
      if (snap) {
        const k = (y * W + x) * 4
        const cd = Math.hypot((snap.rgba[k] ?? 0) - snap.ref[0], (snap.rgba[k + 1] ?? 0) - snap.ref[1], (snap.rgba[k + 2] ?? 0) - snap.ref[2])
        // full virkning innenfor toleransen, myk overgang til dobbel toleranse, ingen virkning utenfor
        cov *= cd <= snap.tol ? 1 : cd >= 2 * snap.tol ? 0 : 1 - (cd - snap.tol) / snap.tol
      }
      put(m, y * W + x, cov, keep)
    }
  }
  return box
}

/** Fyller et rektangel (hjørner i bildepiksler). */
export function fillRect(m: Mask, W: number, H: number, b: Box, keep: boolean): Box | null {
  const box = clampBox({ x0: Math.min(b.x0, b.x1), y0: Math.min(b.y0, b.y1), x1: Math.max(b.x0, b.x1), y1: Math.max(b.y0, b.y1) }, W, H)
  if (!box) return null
  for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) put(m, y * W + x, 1, keep)
  return box
}

/** Fyller ellipsen som passer i rammen (glatt kant over én piksel). */
export function fillEllipse(m: Mask, W: number, H: number, b: Box, keep: boolean): Box | null {
  const x0 = Math.min(b.x0, b.x1)
  const x1 = Math.max(b.x0, b.x1)
  const y0 = Math.min(b.y0, b.y1)
  const y1 = Math.max(b.y0, b.y1)
  const box = clampBox({ x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 }, W, H)
  if (!box) return null
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = Math.max(0.5, (x1 - x0) / 2)
  const ry = Math.max(0.5, (y1 - y0) / 2)
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const nx = (x + 0.5 - cx) / rx
      const ny = (y + 0.5 - cy) / ry
      const d = Math.sqrt(nx * nx + ny * ny)
      // avstand til kanten i piksler (omtrent), for en myk kant på én piksel
      const edge = (1 - d) * Math.min(rx, ry)
      put(m, y * W + x, Math.max(0, Math.min(1, edge + 0.5)), keep)
    }
  }
  return box
}

/** Fyller et polygon (lasso), punktene i bildepiksler; regelen «partall–oddetall» per skannelinje. */
export function fillPolygon(m: Mask, W: number, H: number, pts: readonly { x: number; y: number }[], keep: boolean): Box | null {
  if (pts.length < 3) return null
  let bx: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const p of pts) bx = { x0: Math.min(bx.x0, p.x), y0: Math.min(bx.y0, p.y), x1: Math.max(bx.x1, p.x), y1: Math.max(bx.y1, p.y) }
  const box = clampBox(bx, W, H)
  if (!box) return null
  const xs: number[] = []
  for (let y = box.y0; y < box.y1; y++) {
    const sy = y + 0.5
    xs.length = 0
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i] as { x: number; y: number }
      const c = pts[j] as { x: number; y: number }
      if ((a.y > sy) !== (c.y > sy)) xs.push(a.x + ((sy - a.y) * (c.x - a.x)) / (c.y - a.y))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(box.x0, Math.ceil((xs[k] ?? 0) - 0.5))
      const xb = Math.min(box.x1, Math.ceil((xs[k + 1] ?? 0) - 0.5))
      for (let x = xa; x < xb; x++) put(m, y * W + x, 1, keep)
    }
  }
  return box
}

/** Legger en annen maske til (behold: maks) eller trekker den fra (fjern), f.eks. et objekt valgt med et klikk. */
export function combine(m: Mask, other: Mask, W: number, keep: boolean): Box | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -1
  let y1 = -1
  for (let i = 0; i < m.length; i++) {
    const o = other[i] ?? 0
    if (!o) continue
    put(m, i, o / 255, keep)
    const x = i % W
    const y = (i - x) / W
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

/** Området som en annen maske dekker (> 0), eller null. */
export function boxOf(other: Mask, W: number): Box | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -1
  let y1 = -1
  for (let i = 0; i < other.length; i++) {
    if (!(other[i] ?? 0)) continue
    const x = i % W
    const y = (i - x) / W
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

/**
 * Sammenhengende områder (4-naboskap) der `on(i)` er sann. → etikett per piksel (0 = utenfor) og arealet per etikett.
 */
function components(W: number, H: number, on: (i: number) => boolean): { lab: Int32Array; area: number[] } {
  const lab = new Int32Array(W * H)
  const area = [0]
  const stack = new Int32Array(W * H)
  for (let s = 0; s < W * H; s++) {
    if (lab[s] || !on(s)) continue
    const id = area.length
    let n = 0
    let top = 0
    stack[top++] = s
    lab[s] = id
    while (top) {
      const i = stack[--top] as number
      n++
      const x = i % W
      if (x > 0 && !lab[i - 1] && on(i - 1)) { lab[i - 1] = id; stack[top++] = i - 1 }
      if (x < W - 1 && !lab[i + 1] && on(i + 1)) { lab[i + 1] = id; stack[top++] = i + 1 }
      if (i >= W && !lab[i - W] && on(i - W)) { lab[i - W] = id; stack[top++] = i - W }
      if (i < W * (H - 1) && !lab[i + W] && on(i + W)) { lab[i + W] = id; stack[top++] = i + W }
    }
    area.push(n)
  }
  return { lab, area }
}

/**
 * Et objekt valgt med et klikk: bare området som henger sammen med klikket beholdes (pluss deler som er minst
 * `keepFrac` så store som det), så løse flekker andre steder i bildet ikke kommer med. Endrer `obj` på stedet.
 */
export function keepConnected(obj: Mask, W: number, H: number, x: number, y: number, keepFrac = 0.25): void {
  const { lab, area } = components(W, H, (i) => (obj[i] ?? 0) >= 128)
  const xi = Math.max(0, Math.min(W - 1, Math.floor(x)))
  const yi = Math.max(0, Math.min(H - 1, Math.floor(y)))
  let main = lab[yi * W + xi] ?? 0
  if (!main) {
    // klikket på en kant: nærmeste område innenfor 12 px
    let best = 1e9
    for (let dy = -12; dy <= 12; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        const xx = xi + dx
        const yy = yi + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const l = lab[yy * W + xx] ?? 0
        if (l && dx * dx + dy * dy < best) {
          best = dx * dx + dy * dy
          main = l
        }
      }
    }
  }
  if (!main) return
  const min = (area[main] ?? 0) * keepFrac
  for (let i = 0; i < obj.length; i++) {
    const l = lab[i] ?? 0
    if (l && l !== main && (area[l] ?? 0) < min) obj[i] = 0
    else if (!l && (obj[i] ?? 0) > 0 && (obj[i] ?? 0) < 128) {
      // halvgjennomsiktige kanter rundt fjernede flekker: bare de som ligger inntil et beholdt område, står
      const xx = i % W
      const near = (xx > 0 && lab[i - 1] === main) || (xx < W - 1 && lab[i + 1] === main) || (i >= W && lab[i - W] === main) || (i < W * (H - 1) && lab[i + W] === main)
      if (!near) obj[i] = 0
    }
  }
}

/**
 * «Fjern løse flekker»: beholdte øyer mindre enn `minArea` piksler fjernes, og fjernede hull mindre enn `minArea`
 * inne i det som beholdes, fylles. → området som ble endret, eller null.
 */
export function removeSpecks(m: Mask, W: number, H: number, minArea: number): Box | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -1
  let y1 = -1
  const mark = (i: number) => {
    const x = i % W
    const y = (i - x) / W
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  const kept = components(W, H, (i) => (m[i] ?? 0) >= 128)
  for (let i = 0; i < m.length; i++) {
    const l = kept.lab[i] ?? 0
    if (l && (kept.area[l] ?? 0) < minArea) {
      m[i] = 0
      mark(i)
    }
  }
  const holes = components(W, H, (i) => (m[i] ?? 0) < 128)
  // hull som når bildekanten, er bakgrunn – ikke hull
  const edge = new Set<number>()
  for (let x = 0; x < W; x++) {
    edge.add(holes.lab[x] ?? 0)
    edge.add(holes.lab[(H - 1) * W + x] ?? 0)
  }
  for (let y = 0; y < H; y++) {
    edge.add(holes.lab[y * W] ?? 0)
    edge.add(holes.lab[y * W + W - 1] ?? 0)
  }
  for (let i = 0; i < m.length; i++) {
    const l = holes.lab[i] ?? 0
    if (l && !edge.has(l) && (holes.area[l] ?? 0) < minArea) {
      m[i] = 255
      mark(i)
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

/** Inverterer hele masken på stedet. */
export function invertInPlace(m: Mask): void {
  for (let i = 0; i < m.length; i++) m[i] = 255 - (m[i] ?? 0)
}

/** Boksfilter (gjennomsnitt i (2r+1)²) over et område, med summerte tabeller. */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const S = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += src[y * w + x] ?? 0
      S[(y + 1) * (w + 1) + x + 1] = (S[y * (w + 1) + x + 1] ?? 0) + row
    }
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - r)
    const yb = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - r)
      const xb = Math.min(w, x + r + 1)
      const s = (S[yb * (w + 1) + xb] ?? 0) - (S[ya * (w + 1) + xb] ?? 0) - (S[yb * (w + 1) + xa] ?? 0) + (S[ya * (w + 1) + xa] ?? 0)
      out[y * w + x] = s / ((xb - xa) * (yb - ya))
    }
  }
  return out
}

/**
 * Kantfølging (He m.fl., «guided filter») innenfor `box`: masken tilpasses kantene i bildet. Der bildet har tydelige
 * kanter, legger maskekanten seg langs dem (også rundt hår og smale ledninger med kontrast); der fargene er like på
 * begge sider (motiv og bakgrunn med lignende farge), er resultatet nesten som masken var – den trekkes ikke mot en
 * tilfeldig kant. `only` begrenser endringen til piksler der `only[i] > 0` (f.eks. det penselen var innom).
 * @param rgba bildets piksler (RGBA, hele bildet), `r` radius i piksler, `eps` regularisering (0,0001–0,05).
 */
export function edgeRefine(m: Mask, rgba: Uint8ClampedArray, W: number, H: number, box: Box, r: number, eps: number, only: Uint8Array | null = null): Box | null {
  const b = clampBox({ x0: box.x0 - r, y0: box.y0 - r, x1: box.x1 + r, y1: box.y1 + r }, W, H)
  if (!b) return null
  const w = b.x1 - b.x0
  const h = b.y1 - b.y0
  const I = new Float32Array(w * h)
  const p = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gi = (y + b.y0) * W + x + b.x0
      const k = gi * 4
      I[y * w + x] = (0.299 * (rgba[k] ?? 0) + 0.587 * (rgba[k + 1] ?? 0) + 0.114 * (rgba[k + 2] ?? 0)) / 255
      p[y * w + x] = (m[gi] ?? 0) / 255
    }
  }
  const II = new Float32Array(w * h)
  const Ip = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    II[i] = (I[i] ?? 0) * (I[i] ?? 0)
    Ip[i] = (I[i] ?? 0) * (p[i] ?? 0)
  }
  const mI = boxMean(I, w, h, r)
  const mp = boxMean(p, w, h, r)
  const mII = boxMean(II, w, h, r)
  const mIp = boxMean(Ip, w, h, r)
  const A = new Float32Array(w * h)
  const B = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const va = (mII[i] ?? 0) - (mI[i] ?? 0) ** 2
    const cv = (mIp[i] ?? 0) - (mI[i] ?? 0) * (mp[i] ?? 0)
    const a = cv / (va + eps)
    A[i] = a
    B[i] = (mp[i] ?? 0) - a * (mI[i] ?? 0)
  }
  const mA = boxMean(A, w, h, r)
  const mB = boxMean(B, w, h, r)
  const inner = clampBox(box, W, H)
  if (!inner) return null
  for (let y = inner.y0; y < inner.y1; y++) {
    for (let x = inner.x0; x < inner.x1; x++) {
      const gi = y * W + x
      if (only && !only[gi]) continue
      const li = (y - b.y0) * w + x - b.x0
      const q = (mA[li] ?? 0) * (I[li] ?? 0) + (mB[li] ?? 0)
      m[gi] = Math.round(Math.max(0, Math.min(1, q)) * 255)
    }
  }
  return inner
}

/** Angre/gjør om med lapper: bare området som ble endret, lagres (før og etter). */
export class MaskHistory {
  private undoStack: { box: Box; data: Uint8ClampedArray }[] = []
  private redoStack: { box: Box; data: Uint8ClampedArray }[] = []
  private pending: { box: Box; data: Uint8ClampedArray } | null = null
  private W: number
  private limitBytes: number
  constructor(W: number, limitBytes = 200 * 1024 * 1024) {
    this.W = W
    this.limitBytes = limitBytes
  }

  /** Et ferdig strøk: `before` er masken slik den var før strøket (hele), `box` området som ble endret. */
  record(before: Mask, box: Box): void {
    this.pending = { box, data: this.copy(before, box) }
    this.commit()
  }

  private copy(m: Mask, b: Box): Uint8ClampedArray {
    const w = b.x1 - b.x0
    const out = new Uint8ClampedArray(w * (b.y1 - b.y0))
    for (let y = b.y0; y < b.y1; y++) out.set(m.subarray(y * this.W + b.x0, y * this.W + b.x1), (y - b.y0) * w)
    return out
  }
  private paste(m: Mask, b: Box, d: Uint8ClampedArray) {
    const w = b.x1 - b.x0
    for (let y = b.y0; y < b.y1; y++) m.set(d.subarray((y - b.y0) * w, (y - b.y0 + 1) * w), y * this.W + b.x0)
  }
  /** Før en endring av `box` (kan kalles flere ganger i ett strøk med større område: første kopi gjelder). */
  begin(m: Mask, box: Box): void {
    this.pending = { box, data: this.copy(m, box) }
  }
  /** Etter endringen: lagrer det som var før, i området som faktisk ble endret (`box` må ligge innenfor begin-området). */
  commit(): void {
    if (!this.pending) return
    this.undoStack.push(this.pending)
    this.pending = null
    this.redoStack = []
    let bytes = this.undoStack.reduce((a, x) => a + x.data.length, 0)
    while (bytes > this.limitBytes && this.undoStack.length > 1) bytes -= this.undoStack.shift()?.data.length ?? 0
  }
  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }
  undo(m: Mask): Box | null {
    const u = this.undoStack.pop()
    if (!u) return null
    this.redoStack.push({ box: u.box, data: this.copy(m, u.box) })
    this.paste(m, u.box, u.data)
    return u.box
  }
  redo(m: Mask): Box | null {
    const r = this.redoStack.pop()
    if (!r) return null
    this.undoStack.push({ box: r.box, data: this.copy(m, r.box) })
    this.paste(m, r.box, r.data)
    return r.box
  }
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.pending = null
  }
}
