/**
 * `ctx.filter` for nettlesere uten det (Safari/WebKit – alle nettlesere på iPhone): der ignoreres egenskapen uten feil,
 * så uskarphet, svart-hvitt, metning, lysstyrke, kontrast m.m. manglet i forhåndsvisning og eksport på iPhone.
 *
 * Installeres bare når prototypen mangler `filter`. `drawImage` med et aktivt filter tegner da bildet på et hjelpelerret
 * (samme transformasjon), bruker filtrene som pikseloperasjoner innenfor det tegnede området (+ margin for uskarphet) og
 * tegner resultatet tilbake – med lerretets egen gjennomsiktighet, blandemodus og utklipp. Andre tegneoperasjoner (fyll,
 * tekst) med filter tegnes uten filter, som før.
 */

import { freeCanvas } from '../lib/free-canvas'

export interface FilterOp { fn: string; v: number }

/** «blur(2px) grayscale(1) brightness(120%)» → operasjoner (ukjente/ugyldige hoppes over). */
export function parseFilter(s: string): FilterOp[] {
  const out: FilterOp[] = []
  if (!s || s === 'none') return out
  const re = /([a-z-]+)\(\s*([-\d.]+)\s*(px|%|deg|turn|rad)?\s*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const fn = m[1] ?? ''
    let v = Number(m[2])
    const u = m[3] ?? ''
    if (!Number.isFinite(v)) continue
    if (u === '%') v /= 100
    if (fn === 'hue-rotate') v = u === 'turn' ? v * 360 : u === 'rad' ? (v * 180) / Math.PI : v
    out.push({ fn, v })
  }
  return out
}

/** Hvor mye uskarpheten trenger rundt bildet (px i lerretets piksler). */
export const blurPad = (ops: FilterOp[]): number => Math.ceil(ops.filter((o) => o.fn === 'blur').reduce((s, o) => s + Math.max(0, o.v), 0) * 3)

/** Fargeoperasjonene på RGBA (på stedet). */
export function applyColorOps(d: Uint8ClampedArray, ops: FilterOp[]): void {
  for (const { fn, v } of ops) {
    if (fn === 'blur' || fn === 'drop-shadow') continue
    // fargematrise 3×3 + tillegg (som CSS-spesifikasjonen)
    let M: number[] | null = null
    let add = 0
    let mul = 1
    let opac = 1
    if (fn === 'grayscale') { const a = Math.min(1, Math.max(0, v)), b = 1 - a; M = [0.2126 + 0.7874 * b, 0.7152 - 0.7152 * b, 0.0722 - 0.0722 * b, 0.2126 - 0.2126 * b, 0.7152 + 0.2848 * b, 0.0722 - 0.0722 * b, 0.2126 - 0.2126 * b, 0.7152 - 0.7152 * b, 0.0722 + 0.9278 * b] }
    else if (fn === 'sepia') { const a = Math.min(1, Math.max(0, v)), b = 1 - a; M = [0.393 + 0.607 * b, 0.769 - 0.769 * b, 0.189 - 0.189 * b, 0.349 - 0.349 * b, 0.686 + 0.314 * b, 0.168 - 0.168 * b, 0.272 - 0.272 * b, 0.534 - 0.534 * b, 0.131 + 0.869 * b] }
    else if (fn === 'saturate') { const s = Math.max(0, v); M = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s] }
    else if (fn === 'hue-rotate') { const a = (v * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); M = [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072] }
    else if (fn === 'brightness') mul = Math.max(0, v)
    else if (fn === 'contrast') { mul = Math.max(0, v); add = 128 * (1 - mul) }
    else if (fn === 'invert') { const a = Math.min(1, Math.max(0, v)); mul = 1 - 2 * a; add = 255 * a }
    else if (fn === 'opacity') opac = Math.min(1, Math.max(0, v))
    else continue
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!
      if (M) {
        d[i] = M[0]! * r + M[1]! * g + M[2]! * b
        d[i + 1] = M[3]! * r + M[4]! * g + M[5]! * b
        d[i + 2] = M[6]! * r + M[7]! * g + M[8]! * b
      } else if (opac !== 1) d[i + 3] = d[i + 3]! * opac
      else {
        d[i] = r * mul + add
        d[i + 1] = g * mul + add
        d[i + 2] = b * mul + add
      }
    }
  }
}

/** Tilnærmet gaussisk uskarphet (tre boksfiltre), med forhåndsmultiplisert alfa så kantene ikke får mørke render. */
export function blurRGBA(d: Uint8ClampedArray, w: number, h: number, sigma: number): void {
  if (sigma <= 0.3 || w < 2 || h < 2) return
  const n = w * h
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3]! / 255; ch[0]![i] = d[i * 4]! * a; ch[1]![i] = d[i * 4 + 1]! * a; ch[2]![i] = d[i * 4 + 2]! * a; ch[3]![i] = d[i * 4 + 3]! }
  // boksbredder for tre gjennomganger (Kovesi)
  const wIdeal = Math.sqrt((12 * sigma * sigma) / 3 + 1)
  let wl = Math.floor(wIdeal)
  if (wl % 2 === 0) wl--
  const mIdeal = (12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4)
  const m = Math.round(mIdeal)
  const sizes = [0, 1, 2].map((i) => ((i < m ? wl : wl + 2) - 1) / 2)
  const tmp = new Float32Array(n)
  const pass = (src: Float32Array, dst: Float32Array, r: number, horiz: boolean) => {
    const len = horiz ? w : h, lines = horiz ? h : w, span = r * 2 + 1
    for (let l = 0; l < lines; l++) {
      const at = (k: number) => (horiz ? l * w + Math.min(len - 1, Math.max(0, k)) : Math.min(len - 1, Math.max(0, k)) * w + l)
      let acc = 0
      for (let k = -r; k <= r; k++) acc += src[at(k)]!
      for (let k = 0; k < len; k++) {
        dst[horiz ? l * w + k : k * w + l] = acc / span
        acc += src[at(k + r + 1)]! - src[at(k - r)]!
      }
    }
  }
  for (const c of ch) for (const r of sizes) if (r > 0) { pass(c, tmp, r, true); pass(tmp, c, r, false) }
  for (let i = 0; i < n; i++) {
    const a = ch[3]![i]!
    const k = a > 0 ? 255 / a : 0
    d[i * 4] = ch[0]![i]! * k
    d[i * 4 + 1] = ch[1]![i]! * k
    d[i * 4 + 2] = ch[2]![i]! * k
    d[i * 4 + 3] = a
  }
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Installerer `filter` på 2D-kontekstene der nettleseren mangler det. Gir true når den ble installert. */
export function installCanvasFilter(): boolean {
  if (typeof CanvasRenderingContext2D === 'undefined' || 'filter' in CanvasRenderingContext2D.prototype) return false
  const protos: Ctx[] = [CanvasRenderingContext2D.prototype]
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined' && !('filter' in OffscreenCanvasRenderingContext2D.prototype)) protos.push(OffscreenCanvasRenderingContext2D.prototype)
  const store = new WeakMap<object, string>()
  for (const P of protos) {
    Object.defineProperty(P, 'filter', {
      configurable: true,
      get(this: object) { return store.get(this) ?? 'none' },
      set(this: object, v: string) { store.set(this, String(v || 'none')) },
    })
    // filteret er en del av tegnetilstanden: save()/restore() tar det med (som i nettlesere med innebygd filter)
    const stack = new WeakMap<object, string[]>()
    const save = P.save as (this: Ctx) => void
    const restore = P.restore as (this: Ctx) => void
    ;(P as unknown as { save: () => void }).save = function (this: Ctx) {
      const s = stack.get(this) ?? []
      s.push(store.get(this) ?? 'none')
      stack.set(this, s)
      save.call(this)
    }
    ;(P as unknown as { restore: () => void }).restore = function (this: Ctx) {
      const s = stack.get(this)
      if (s?.length) store.set(this, s.pop() as string)
      restore.call(this)
    }
    const draw = P.drawImage as (this: Ctx, ...a: unknown[]) => void
    ;(P as unknown as { drawImage: (...a: unknown[]) => void }).drawImage = function (this: Ctx, ...a: unknown[]) {
      const f = store.get(this) ?? 'none'
      const ops = f === 'none' ? [] : parseFilter(f)
      if (!ops.length) return draw.apply(this, a)
      const cv = this.canvas
      const W = cv.width, H = cv.height
      if (!W || !H) return
      // det tegnede området i lerretets piksler (hjørnene gjennom transformasjonen) + margin for uskarphet
      const [dx, dy, dw, dh] = a.length >= 9 ? [a[5], a[6], a[7], a[8]] as number[] : a.length >= 5 ? [a[1], a[2], a[3], a[4]] as number[] : [a[1], a[2], (a[0] as { width: number }).width, (a[0] as { height: number }).height] as number[]
      const t = this.getTransform()
      const xs: number[] = [], ys: number[] = []
      for (const [px, py] of [[dx, dy], [dx! + dw!, dy], [dx, dy! + dh!], [dx! + dw!, dy! + dh!]] as [number, number][]) { xs.push(t.a * px + t.c * py + t.e); ys.push(t.b * px + t.d * py + t.f) }
      const scale = Math.hypot(t.a, t.b) || 1
      const blurOps = ops.filter((o) => o.fn === 'blur').map((o) => ({ ...o, v: o.v * scale }))
      const pad = blurPad(blurOps)
      const x0 = Math.max(0, Math.floor(Math.min(...xs)) - pad), y0 = Math.max(0, Math.floor(Math.min(...ys)) - pad)
      const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + pad), y1 = Math.min(H, Math.ceil(Math.max(...ys)) + pad)
      const bw = x1 - x0, bh = y1 - y0
      if (bw <= 0 || bh <= 0) return
      const tmp = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bw, bh) : Object.assign(document.createElement('canvas'), { width: bw, height: bh })
      const tg = tmp.getContext('2d') as Ctx | null
      if (!tg) return draw.apply(this, a)
      tg.setTransform(t.a, t.b, t.c, t.d, t.e - x0, t.f - y0)
      tg.imageSmoothingEnabled = this.imageSmoothingEnabled
      draw.apply(tg, a)
      const id = tg.getImageData(0, 0, bw, bh)
      const sig = blurOps.reduce((s, o) => s + Math.max(0, o.v), 0)
      if (sig > 0) blurRGBA(id.data, bw, bh, sig)
      applyColorOps(id.data, ops)
      tg.putImageData(id, 0, 0)
      this.save()
      this.setTransform(1, 0, 0, 1, 0, 0)
      store.set(this, 'none')
      draw.call(this, tmp, x0, y0)
      this.restore()
      store.set(this, f)
      // hjelpelerretet lages ved hver filtrerte tegning (hvert bilde mens man drar): frigjøres straks, ellers hoper de
      // seg opp i Safari til søppeltømmingen (målt i e2e-mem/thumbnail-session.spec.ts)
      freeCanvas(tmp)
    }
  }
  return true
}
