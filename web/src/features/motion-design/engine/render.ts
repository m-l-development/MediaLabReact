/**
 * Motion design – tegning av ett bilde på et lerret. Typet port av motion-engine.js (rendering), med samme utseende:
 * overganger (36), tekstanimasjoner (17), looks, kurver, grønnskjerm, undertekster og logo.
 * Nettlesere uten `ctx.filter` (Safari) får samme farger via piksel-fallback.
 */
import {
  clamp, easeBack, easeInOut, easeOut, fmtCount, hidden, layout, ovDur,
  type Clip, type Crop, type Curves, type Grade, type Overlay, type Placed, type Project, type Pt, type Sub, type SubStyle, type TextItem,
} from './model'
import { fxAlpha, fxBlur, fxFilter, type Effect } from './fx'

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type Src = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas

/** Mediene editoren har klare: video per klipp/overlegg-ID, bilder per media-ID (og logo-sti). */
export interface MediaEls {
  vids: Record<string, HTMLVideoElement>
  imgs: Record<string, HTMLImageElement | HTMLCanvasElement | ImageBitmap>
}

export interface Rect { x: number; y: number; w: number; h: number }
export type Rects = Record<string, Rect>

function setFont(ctx: Ctx2D, x: { italic?: boolean; weight?: number; font?: string; track?: number }, px: number): void {
  ctx.font = `${x.italic ? 'italic ' : ''}${Math.round(x.weight || 700)} ${Math.max(1, px).toFixed(1)}px "${x.font || 'Archivo'}", Archivo, Helvetica, Arial, sans-serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${((x.track || 0) * px).toFixed(2)}px`
}
function wrap(ctx: Ctx2D, s: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of String(s).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = ''
    for (const w of words) {
      const t = line ? `${line} ${w}` : w
      if (line && ctx.measureText(t).width > maxW) {
        out.push(line)
        line = w
      } else line = t
    }
    out.push(line)
  }
  return out
}
function rr(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, r))
  else ctx.rect(x, y, w, h)
}
function srcSize(s: Src | undefined | null): [number, number] {
  if (!s) return [0, 0]
  if (s instanceof HTMLVideoElement) return [s.videoWidth, s.videoHeight]
  if (s instanceof HTMLImageElement) return [s.naturalWidth || s.width, s.naturalHeight || s.height]
  return [s.width, s.height]
}
export function hexA(hx: string, a: number): string {
  let s = String(hx || '#000').slice(1)
  if (s.length === 3) s = s.replace(/./g, '$&$&')
  return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`
}
function rnd(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface LookF { f: string; temp?: number; tint?: number; vig?: number; grain?: number; glow?: number }
const LOOKF: Record<string, LookF> = {
  warm: { f: 'saturate(1.08)', temp: 0.45 }, cool: { f: 'saturate(0.95)', temp: -0.45 }, film: { f: 'contrast(1.1) saturate(0.85)', temp: 0.15, vig: 0.35, grain: 0.25 },
  bw: { f: 'grayscale(1) contrast(1.08)' }, noir: { f: 'grayscale(1) contrast(1.45) brightness(0.92)', vig: 0.55 }, faded: { f: 'contrast(0.82) saturate(0.7) brightness(1.08)' },
  vivid: { f: 'saturate(1.45) contrast(1.08)' }, sepia: { f: 'sepia(0.75) contrast(1.05)' }, dream: { f: 'brightness(1.08) saturate(1.15) contrast(0.9)', glow: 0.5 },
  teal: { f: 'contrast(1.12) saturate(1.2)', temp: 0.2, tint: -0.25 }, night: { f: 'brightness(0.72) saturate(0.7) hue-rotate(-12deg)', temp: -0.5, vig: 0.4 },
}
function filterOf(c: Pick<Grade, 'look' | 'bri' | 'con' | 'sat' | 'blur'> & { effects?: Effect[] | undefined }, blur: number): string {
  const f: string[] = []
  const lk = LOOKF[c.look]
  if (lk) f.push(lk.f)
  if (c.bri) f.push(`brightness(${(1 + c.bri).toFixed(3)})`)
  if (c.con) f.push(`contrast(${(1 + c.con).toFixed(3)})`)
  if (c.sat) f.push(`saturate(${(1 + c.sat).toFixed(3)})`)
  // effektene (Avansert), i listens rekkefølge, etter grunnkorreksjonen
  const ef = fxFilter(c.effects)
  if (ef) f.push(ef)
  const b = (blur || 0) + (c.blur || 0) + fxBlur(c.effects)
  if (b > 0.3) f.push(`blur(${b.toFixed(1)}px)`)
  return f.join(' ')
}

let GRAIN: HTMLCanvasElement | null = null
function grainCanvas(): HTMLCanvasElement {
  if (GRAIN) return GRAIN
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  if (g) {
    const d = g.createImageData(256, 256)
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v
      d.data[i + 3] = 255
    }
    g.putImageData(d, 0, 0)
  }
  GRAIN = c
  return c
}

/* ---------- kurver ---------- */

const curveIdent = (a: Pt[] | undefined): boolean => !a || (a.length === 2 && a[0]?.[0] === 0 && a[0]?.[1] === 0 && a[1]?.[0] === 1 && a[1]?.[1] === 1)
export function hasCurve(c: Pick<Grade, 'cS' | 'cM' | 'cH' | 'curves'>): boolean {
  return !!(c.cS || c.cM || c.cH || (c.curves && (!curveIdent(c.curves.m) || !curveIdent(c.curves.r) || !curveIdent(c.curves.g) || !curveIdent(c.curves.b))))
}
/** Monoton kubisk spline gjennom punktene (Fritsch–Carlson), som i dagens app. */
export function spline(pts: readonly Pt[]): (x: number) => number {
  const n = pts.length
  const X = pts.map((p) => p[0])
  const Y = pts.map((p) => p[1])
  if (n < 2) return () => 0
  const d: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = (X[i + 1] ?? 0) - (X[i] ?? 0)
    d.push(dx > 1e-6 ? ((Y[i + 1] ?? 0) - (Y[i] ?? 0)) / dx : 0)
  }
  m[0] = d[0] ?? 0
  m[n - 1] = d[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] ?? 0) * (d[i] ?? 0) <= 0 ? 0 : ((d[i - 1] ?? 0) + (d[i] ?? 0)) / 2
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
  return (x) => {
    if (x <= (X[0] ?? 0)) return Y[0] ?? 0
    if (x >= (X[n - 1] ?? 1)) return Y[n - 1] ?? 1
    let k = 0
    while (k < n - 2 && x > (X[k + 1] ?? 0)) k++
    const h = (X[k + 1] ?? 0) - (X[k] ?? 0)
    if (h < 1e-6) return Y[k] ?? 0
    const t = (x - (X[k] ?? 0)) / h
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * (Y[k] ?? 0) + (t3 - 2 * t2 + t) * h * (m[k] ?? 0) + (-2 * t3 + 3 * t2) * (Y[k + 1] ?? 0) + (t3 - t2) * h * (m[k + 1] ?? 0)
  }
}
export const curveEval = (pts: readonly Pt[], x: number): number => clamp(spline(pts)(x), 0, 1)

interface Lut { r: Uint8ClampedArray; g: Uint8ClampedArray; b: Uint8ClampedArray }
let LUTC: Record<string, Lut> = {}
let LUTN = 0
function curveLut(c: Pick<Grade, 'cS' | 'cM' | 'cH' | 'curves'>): Lut {
  const k = JSON.stringify([c.cS || 0, c.cM || 0, c.cH || 0, c.curves || 0])
  const hit = LUTC[k]
  if (hit) return hit
  const C: Curves = c.curves || {}
  const id = (x: number) => x
  const fm = curveIdent(C.m) ? id : spline(C.m ?? [])
  const fr = curveIdent(C.r) ? id : spline(C.r ?? [])
  const fg = curveIdent(C.g) ? id : spline(C.g ?? [])
  const fb = curveIdent(C.b) ? id : spline(C.b ?? [])
  const R = new Uint8ClampedArray(256)
  const G = new Uint8ClampedArray(256)
  const B = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    let y = clamp(x + 0.25 * ((c.cS || 0) * 6.75 * x * (1 - x) * (1 - x) + (c.cM || 0) * 4 * x * (1 - x) + (c.cH || 0) * 6.75 * x * x * (1 - x)), 0, 1)
    y = clamp(fm(y), 0, 1)
    R[i] = Math.round(clamp(fr(y), 0, 1) * 255)
    G[i] = Math.round(clamp(fg(y), 0, 1) * 255)
    B[i] = Math.round(clamp(fb(y), 0, 1) * 255)
  }
  const L = { r: R, g: G, b: B }
  if (++LUTN > 60) {
    LUTC = {}
    LUTN = 0
  }
  LUTC[k] = L
  return L
}

/* ---------- piksel-fallback (Safari) ---------- */

let FILT: boolean | null = null
function hasFilter(): boolean {
  if (FILT !== null) return FILT
  try {
    const c = document.createElement('canvas').getContext('2d')
    if (!c || !('filter' in c)) FILT = false
    else {
      c.filter = 'blur(2px)'
      FILT = c.filter === 'blur(2px)'
    }
  } catch {
    FILT = false
  }
  return FILT
}
type Op = [string, number]
function colorOps(f: string): Op[] {
  const ops: Op[] = []
  const re = /([a-z-]+)\(([-\d.]+)(deg|px)?\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(f || ''))) if (m[1] && m[1] !== 'blur') ops.push([m[1], Number(m[2])])
  return ops
}
function applyOps(d: Uint8ClampedArray, ops: Op[]): void {
  if (!ops.length) return
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    let r = (d[i] ?? 0) / 255
    let g = (d[i + 1] ?? 0) / 255
    let b = (d[i + 2] ?? 0) / 255
    for (const [n, a] of ops) {
      let R: number
      let G: number
      let B: number
      if (n === 'brightness') {
        r *= a
        g *= a
        b *= a
      } else if (n === 'contrast') {
        r = (r - 0.5) * a + 0.5
        g = (g - 0.5) * a + 0.5
        b = (b - 0.5) * a + 0.5
      } else if (n === 'saturate' || n === 'grayscale') {
        const s = n === 'saturate' ? a : 1 - Math.min(1, a)
        R = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b
        G = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b
        B = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b
        r = R
        g = G
        b = B
      } else if (n === 'sepia') {
        const q = 1 - Math.min(1, a)
        R = (0.393 + 0.607 * q) * r + (0.769 - 0.769 * q) * g + (0.189 - 0.189 * q) * b
        G = (0.349 - 0.349 * q) * r + (0.686 + 0.314 * q) * g + (0.168 - 0.168 * q) * b
        B = (0.272 - 0.272 * q) * r + (0.534 - 0.534 * q) * g + (0.131 + 0.869 * q) * b
        r = R
        g = G
        b = B
      } else if (n === 'hue-rotate') {
        const h = (a * Math.PI) / 180
        const co = Math.cos(h)
        const si = Math.sin(h)
        R = (0.213 + co * 0.787 - si * 0.213) * r + (0.715 - co * 0.715 - si * 0.715) * g + (0.072 - co * 0.072 + si * 0.928) * b
        G = (0.213 - co * 0.213 + si * 0.143) * r + (0.715 + co * 0.285 + si * 0.14) * g + (0.072 - co * 0.072 - si * 0.283) * b
        B = (0.213 - co * 0.213 - si * 0.787) * r + (0.715 - co * 0.715 + si * 0.715) * g + (0.072 + co * 0.928 + si * 0.072) * b
        r = R
        g = G
        b = B
      }
      r = r < 0 ? 0 : r > 1 ? 1 : r
      g = g < 0 ? 0 : g > 1 ? 1 : g
      b = b < 0 ? 0 : b > 1 ? 1 : b
    }
    d[i] = r * 255
    d[i + 1] = g * 255
    d[i + 2] = b * 255
  }
}

const SCR: Record<string, HTMLCanvasElement | OffscreenCanvas> = {}
function ctx2d(c: HTMLCanvasElement | OffscreenCanvas): Ctx2D {
  const g = c.getContext('2d') as Ctx2D | null
  if (!g) throw new Error('canvas')
  return g
}
/** Gjenbrukte hjelpelerreter (samme nøkkel og størrelse gir samme lerret, tømt). */
function scratch(k: string, W: number, H: number): HTMLCanvasElement | OffscreenCanvas {
  let c = SCR[k]
  if (!c || c.width !== W || c.height !== H) {
    c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H })
    SCR[k] = c
  }
  const g = ctx2d(c)
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  if ('filter' in g) g.filter = 'none'
  g.clearRect(0, 0, W, H)
  return c
}
function softBlur(cx: Ctx2D, w: number, h: number, b: number): void {
  if (b <= 0.3) return
  const k = Math.min(24, 1 + b / 1.5)
  const sw = Math.max(1, Math.round(w / k))
  const sh = Math.max(1, Math.round(h / k))
  const sc = scratch('blur', sw, sh)
  const g = ctx2d(sc)
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.clearRect(0, 0, sw, sh)
  g.drawImage(cx.canvas, 0, 0, w, h, 0, 0, sw, sh)
  cx.save()
  cx.setTransform(1, 0, 0, 1, 0, 0)
  cx.globalAlpha = 1
  cx.globalCompositeOperation = 'copy'
  cx.imageSmoothingEnabled = true
  cx.imageSmoothingQuality = 'high'
  cx.drawImage(sc, 0, 0, sw, sh, 0, 0, w, h)
  cx.restore()
}
interface PixOpts extends Pick<Grade, 'cS' | 'cM' | 'cH' | 'curves'> { ops?: Op[]; keyOn?: boolean; keyColor?: string; keySim?: number; keySmooth?: number; keySpill?: number }
function pixFx(cx: Ctx2D, w: number, h: number, o: PixOpts): void {
  let im: ImageData
  try {
    im = cx.getImageData(0, 0, w, h)
  } catch {
    return
  }
  const d = im.data
  if (o.ops) applyOps(d, o.ops)
  const L = hasCurve(o) ? curveLut(o) : null
  const key = !!o.keyOn
  if (!L && !key) {
    cx.putImageData(im, 0, 0)
    return
  }
  let kcb = 0
  let kcr = 0
  let sim = 0
  let sm = 1
  let sp = 0
  if (key) {
    const n = parseInt((o.keyColor || '#00ff00').slice(1), 16)
    const kr = (n >> 16) & 255
    const kg = (n >> 8) & 255
    const kb = n & 255
    kcb = -0.1687 * kr - 0.3313 * kg + 0.5 * kb
    kcr = 0.5 * kr - 0.4187 * kg - 0.0813 * kb
    sim = (o.keySim ?? 0.35) * 100
    sm = Math.max(0.5, (o.keySmooth ?? 0.1) * 100)
    sp = o.keySpill ?? 0.5
  }
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] ?? 0
    let g = d[i + 1] ?? 0
    let b = d[i + 2] ?? 0
    if (key) {
      const cb = -0.1687 * r - 0.3313 * g + 0.5 * b - kcb
      const cr = 0.5 * r - 0.4187 * g - 0.0813 * b - kcr
      const dist = Math.sqrt(cb * cb + cr * cr)
      const a = (dist - sim) / sm
      if (a <= 0) {
        d[i + 3] = 0
        continue
      }
      if (a < 1) d[i + 3] = (d[i + 3] ?? 0) * a
      let t = 1 - (dist - sim) / (sm + 60)
      if (t > 0 && sp > 0) {
        t *= sp
        const Y = 0.299 * r + 0.587 * g + 0.114 * b
        r += (Y - r) * t
        g += (Y - g) * t
        b += (Y - b) * t
      }
    }
    if (L) {
      r = L.r[r | 0] ?? r
      g = L.g[g | 0] ?? g
      b = L.b[b | 0] ?? b
    }
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
  cx.putImageData(im, 0, 0)
}

type ClipFx = Pick<Grade, 'look'> & { temp?: number; tint?: number; vig?: number; grain?: number }
function postFx(ctx: Ctx2D, W: number, H: number, c: ClipFx, t: number): void {
  const lk = LOOKF[c.look] ?? { f: '' }
  const temp = (c.temp || 0) + (lk.temp || 0)
  const tint = (c.tint || 0) + (lk.tint || 0)
  const vig = Math.min(1, (c.vig || 0) + (lk.vig || 0))
  const gr = Math.min(1, (c.grain || 0) + (lk.grain || 0))
  const glow = lk.glow || 0
  ctx.save()
  if (Math.abs(temp) > 0.01) {
    ctx.globalCompositeOperation = 'soft-light'
    ctx.fillStyle = temp > 0 ? `rgba(255,140,40,${(Math.abs(temp) * 0.8).toFixed(3)})` : `rgba(40,130,255,${(Math.abs(temp) * 0.8).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
  }
  if (Math.abs(tint) > 0.01) {
    ctx.globalCompositeOperation = 'soft-light'
    ctx.fillStyle = tint > 0 ? `rgba(255,60,200,${(Math.abs(tint) * 0.7).toFixed(3)})` : `rgba(40,220,120,${(Math.abs(tint) * 0.7).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
  }
  if (glow > 0) {
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(255,240,230,${(glow * 0.12).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
  }
  if (vig > 0.01) {
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${(vig * 0.85).toFixed(3)})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  if (gr > 0.01 && typeof document !== 'undefined') {
    const pat = ctx.createPattern(grainCanvas(), 'repeat')
    const ox = Math.floor(rnd(Math.floor(t * 24)) * 256)
    const oy = Math.floor(rnd(Math.floor(t * 24) + 7) * 256)
    if (pat) {
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = gr * 0.45
      ctx.translate(-ox, -oy)
      ctx.fillStyle = pat
      ctx.fillRect(ox, oy, W, H)
    }
  }
  ctx.restore()
}

function cropRect(c: { crop?: Crop }, sz: [number, number]): [number, number, number, number] {
  const cr = c.crop ?? { l: 0, t: 0, r: 0, b: 0 }
  return [sz[0] * cr.l, sz[1] * cr.t, Math.max(1, sz[0] * (1 - cr.l - cr.r)), Math.max(1, sz[1] * (1 - cr.t - cr.b))]
}

const PC = new WeakSet<object>()
function paintClip(ctx: Ctx2D, W: number, H: number, p: Project, c: Clip, M: MediaEls, lt: number, dur: number, blur: number, t: number): void {
  // opasitet og fade (effekter) kommer i tillegg til overgangen
  const fa = fxAlpha(c.effects, lt, dur)
  if (fa < 0.999) ctx.globalAlpha *= fa
  if (ctx.globalAlpha <= 0.001) return
  if (!hasFilter() && !PC.has(ctx)) {
    const ops = colorOps(filterOf(c, 0))
    const bb = (blur || 0) + (c.blur || 0) + fxBlur(c.effects)
    if (ops.length || bb > 0.3 || hasCurve(c)) {
      const cv = ctx.canvas
      const tf = ctx.getTransform()
      const sc = scratch('pc', cv.width, cv.height)
      const g = ctx2d(sc)
      g.clearRect(0, 0, cv.width, cv.height)
      g.setTransform(tf)
      PC.add(g)
      paintClipRaw(g, W, H, p, c, M, lt, dur, 0, t, () => {
        if (bb > 0.3) softBlur(g, cv.width, cv.height, bb * Math.hypot(tf.a, tf.b))
        if (ops.length || hasCurve(c)) {
          g.save()
          g.setTransform(1, 0, 0, 1, 0, 0)
          pixFx(g, cv.width, cv.height, { ...c, ops, keyOn: false })
          g.restore()
        }
      })
      PC.delete(g)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(sc, 0, 0)
      ctx.restore()
      return
    }
  }
  paintClipRaw(ctx, W, H, p, c, M, lt, dur, blur, t, null)
}

function paintClipRaw(ctx: Ctx2D, W: number, H: number, p: Project, c: Clip, M: MediaEls, lt: number, dur: number, blur: number, t: number, mid: (() => void) | null): void {
  const F = hasFilter()
  if (c.kind === 'color') {
    let g: CanvasGradient | string
    if (c.grad === 'radial') {
      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2)
      rg.addColorStop(0, c.c2)
      rg.addColorStop(1, c.c1)
      g = rg
    } else if (c.grad === 'linear') {
      const a = (((c.ang || 0) + (c.spin || 0) * lt) * Math.PI) / 180
      const R = Math.hypot(W, H) / 2
      const dx = Math.cos(a) * R
      const dy = Math.sin(a) * R
      const lg = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy)
      lg.addColorStop(0, c.c1)
      lg.addColorStop(1, c.c2)
      g = lg
    } else g = c.c1
    const f0 = filterOf(c, blur)
    if (f0 && F) ctx.filter = f0
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else {
    const s = c.kind === 'video' ? M.vids[c.id] : M.imgs[c.media]
    const sz = srcSize(s)
    const ready = !!s && !!sz[0] && (c.kind !== 'video' || (s as HTMLVideoElement).readyState >= 2)
    ctx.fillStyle = ready ? p.bg || '#000' : '#141414'
    ctx.fillRect(0, 0, W, H)
    if (ready && s) {
      const f = filterOf(c, blur)
      if (f && F) ctx.filter = f
      const cr = cropRect(c, sz)
      let sc = c.fit === 'contain' ? Math.min(W / cr[2], H / cr[3]) : Math.max(W / cr[2], H / cr[3])
      let z = (c.zoom || 1) * (c.scale || 1)
      if (c.kb) z *= 1 + 0.08 * clamp(lt / dur, 0, 1)
      sc *= z
      const dw = cr[2] * sc
      const dh = cr[3] * sc
      const fx = c.fx ?? 0.5
      const fy = c.fy ?? 0.5
      ctx.save()
      ctx.translate(W / 2 + (c.x || 0) * W, H / 2 + (c.y || 0) * H)
      if (c.rot) ctx.rotate((c.rot * Math.PI) / 180)
      if (c.flipH || c.flipV) ctx.scale(c.flipH ? -1 : 1, c.flipV ? -1 : 1)
      ctx.drawImage(s, cr[0], cr[1], cr[2], cr[3], -dw / 2 + (W - dw) * (fx - 0.5), -dh / 2 + (H - dh) * (fy - 0.5), dw, dh)
      ctx.restore()
    }
  }
  if (F) ctx.filter = 'none'
  if (mid) mid()
  else if (hasCurve(c)) pixFx(ctx, W, H, { ...c, keyOn: false })
  if (c.dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${c.dim.toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
  }
  postFx(ctx, W, H, c, t || 0)
}

/* ---------- overganger ---------- */

function outFx(ctx: Ctx2D, W: number, H: number, ty: string, k: number): number {
  const e = easeInOut(k)
  if (/^push-/.test(ty) || ty === 'whip') {
    const d = ty === 'whip' ? 'l' : ty.slice(5)
    ctx.translate(d === 'l' ? -e * W : d === 'r' ? e * W : 0, d === 'u' ? -e * H : d === 'd' ? e * H : 0)
  } else if (ty === 'zoom-in') {
    ctx.globalAlpha = 1 - e * 0.6
    const s = 1 + 0.5 * e
    ctx.translate(W / 2, H / 2)
    ctx.scale(s, s)
    ctx.translate(-W / 2, -H / 2)
  } else if (ty === 'zoom-out') {
    const s2 = 1 - 0.3 * e
    ctx.translate(W / 2, H / 2)
    ctx.scale(s2, s2)
    ctx.translate(-W / 2, -H / 2)
  } else if (ty === 'xzoom' || ty === 'ramp') {
    const s9 = 1 + (ty === 'xzoom' ? 0.6 : 0.25) * e
    ctx.translate(W / 2, H / 2)
    ctx.scale(s9, s9)
    ctx.translate(-W / 2, -H / 2)
  }
  return ty === 'whip' ? Math.sin(Math.PI * k) * 30 : ty === 'xzoom' ? Math.sin(Math.PI * k) * 26 : ty === 'ramp' ? Math.sin(Math.PI * k) * 18 : 0
}
function inPath(ctx: Ctx2D, W: number, H: number, ty: string, e: number): void {
  ctx.beginPath()
  if (ty === 'wipe-r') ctx.rect(0, 0, W * e, H)
  else if (ty === 'wipe-l') ctx.rect(W * (1 - e), 0, W * e, H)
  else if (ty === 'wipe-d') ctx.rect(0, 0, W, H * e)
  else if (ty === 'wipe-u') ctx.rect(0, H * (1 - e), W, H * e)
  else if (ty === 'iris') ctx.arc(W / 2, H / 2, (Math.hypot(W, H) / 2) * e + 0.5, 0, Math.PI * 2)
  else if (ty === 'diamond') {
    const r = ((W + H) / 2) * e * 1.02 + 0.5
    ctx.moveTo(W / 2, H / 2 - r)
    ctx.lineTo(W / 2 + r, H / 2)
    ctx.lineTo(W / 2, H / 2 + r)
    ctx.lineTo(W / 2 - r, H / 2)
    ctx.closePath()
  } else if (ty === 'clock') {
    const R = Math.hypot(W, H)
    ctx.moveTo(W / 2, H / 2)
    ctx.arc(W / 2, H / 2, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e)
    ctx.closePath()
  } else if (ty === 'blinds') {
    const n = 8
    const bh = H / n
    for (let i = 0; i < n; i++) ctx.rect(0, i * bh, W, bh * e + 0.5)
  } else if (ty === 'doors') ctx.rect((W / 2) * (1 - e), 0, W * e, H)
  else if (ty === 'bars') {
    const m = 10
    const bw = W / m
    for (let j = 0; j < m; j++) {
      const kk = clamp(e * 1.6 - (j / m) * 0.6, 0, 1)
      ctx.rect(j * bw, 0, bw + 0.5, H * kk)
    }
  }
  ctx.clip()
}
const CLIPT = ['wipe-r', 'wipe-l', 'wipe-d', 'wipe-u', 'iris', 'diamond', 'clock', 'blinds', 'doors', 'bars']

function drawClip(ctx: Ctx2D, W: number, H: number, p: Project, l: Placed, M: MediaEls, t: number, S: number, outTy: string | null, outK: number): void {
  const c = l.c
  const lt = t - l.start
  let k = l.tr ? clamp(lt / l.tr, 0, 1) : 1
  let ty = k < 1 ? c.trans.type : 'none'
  let blur = 0
  if (p.tin.type !== 'none' && p.clips[0] === c) {
    const k0 = clamp(lt / Math.min(p.tin.dur, l.dur / 2), 0, 1)
    if (k0 < k) {
      k = k0
      ty = p.tin.type
    }
  }
  if (p.tout.type !== 'none' && p.clips[p.clips.length - 1] === c) {
    const k1 = clamp((l.end - t) / Math.min(p.tout.dur, l.dur / 2), 0, 1)
    if (k1 < k) {
      k = k1
      ty = p.tout.type
    }
  }
  const e = easeInOut(k)
  ctx.save()
  if (outTy && outK > 0) blur = outFx(ctx, W, H, outTy, outK) * S
  if (ty === 'dip' || ty === 'dipw') {
    ctx.fillStyle = ty === 'dip' ? '#000' : '#fff'
    ctx.globalAlpha = clamp(k * 2, 0, 1)
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = clamp(k * 2 - 1, 0, 1)
  } else if (ty === 'fade') ctx.globalAlpha = e
  else if (ty === 'flash') ctx.globalAlpha = k > 0.5 ? 1 : 0
  else if (/^push-/.test(ty) || ty === 'whip') {
    const d = ty === 'whip' ? 'l' : ty.slice(5)
    ctx.translate(d === 'l' ? (1 - e) * W : d === 'r' ? -(1 - e) * W : 0, d === 'u' ? (1 - e) * H : d === 'd' ? -(1 - e) * H : 0)
    if (ty === 'whip') blur = Math.sin(Math.PI * k) * 30 * S
  } else if (/^cover-/.test(ty)) {
    const d2 = ty.slice(6)
    ctx.translate(d2 === 'l' ? (1 - e) * W : d2 === 'r' ? -(1 - e) * W : 0, d2 === 'u' ? (1 - e) * H : d2 === 'd' ? -(1 - e) * H : 0)
  } else if (ty === 'zoom-in') {
    ctx.globalAlpha = e
    const s = 1.3 - 0.3 * e
    ctx.translate(W / 2, H / 2)
    ctx.scale(s, s)
    ctx.translate(-W / 2, -H / 2)
  } else if (ty === 'zoom-out') {
    ctx.globalAlpha = e
    const s3 = 0.7 + 0.3 * e
    ctx.translate(W / 2, H / 2)
    ctx.scale(s3, s3)
    ctx.translate(-W / 2, -H / 2)
  } else if (ty === 'spin') {
    ctx.globalAlpha = e
    ctx.translate(W / 2, H / 2)
    ctx.rotate(((1 - e) * -Math.PI) / 2)
    const s4 = 0.4 + 0.6 * e
    ctx.scale(s4, s4)
    ctx.translate(-W / 2, -H / 2)
  } else if (ty === 'blur') {
    ctx.globalAlpha = e
    blur = (1 - e) * 36 * S
  } else if (ty === 'xzoom' || ty === 'ramp') {
    ctx.globalAlpha = clamp((k - (ty === 'xzoom' ? 0.3 : 0.35)) / (ty === 'xzoom' ? 0.4 : 0.3), 0, 1)
    const s5 = 1 + (ty === 'xzoom' ? 0.6 : 0.18) * (1 - e)
    ctx.translate(W / 2, H / 2)
    ctx.scale(s5, s5)
    ctx.translate(-W / 2, -H / 2)
    blur = Math.sin(Math.PI * k) * (ty === 'xzoom' ? 26 : 18) * S
  } else if (ty === 'match') ctx.globalAlpha = e
  else if (ty === 'leak') ctx.globalAlpha = clamp((k - 0.25) / 0.5, 0, 1)
  else if (ty === 'mask') {
    const mbw = W * 0.3
    const mbx = -mbw / 2 + e * (W + mbw)
    ctx.beginPath()
    ctx.rect(0, 0, Math.max(0, mbx), H)
    ctx.clip()
  } else if (CLIPT.includes(ty)) inPath(ctx, W, H, ty, e)
  if (ty === 'glitch' || ty === 'pixel' || ty === 'chroma') {
    const sc = scratch('tr', W, H)
    paintClip(ctx2d(sc), W, H, p, c, M, lt, l.dur, 0, t)
    if (ty === 'chroma') {
      const amp2 = (Math.sin(Math.PI * k) * 0.03 + (1 - k) * 0.012) * W
      const mix = scratch('chmix', W, H)
      const mg = ctx2d(mix)
      const chs: [string, number][] = [['#ff0000', -amp2], ['#00ff00', 0], ['#0000ff', amp2]]
      for (const [colr, off] of chs) {
        const cs = scratch('ch', W, H)
        const cg = ctx2d(cs)
        cg.drawImage(sc, 0, 0)
        cg.globalCompositeOperation = 'multiply'
        cg.fillStyle = colr
        cg.fillRect(0, 0, W, H)
        cg.globalCompositeOperation = 'destination-in'
        cg.drawImage(sc, 0, 0)
        mg.globalCompositeOperation = 'lighter'
        mg.drawImage(cs, off, 0)
      }
      ctx.globalAlpha = clamp(k * 1.5, 0, 1)
      const nb = 9
      const sbh = H / nb
      const sd = Math.floor(t * 24)
      for (let si = 0; si < nb; si++) {
        const so = rnd(sd * 17 + si) > 0.55 ? (rnd(sd + si * 5) - 0.5) * amp2 * 3 : 0
        ctx.drawImage(mix, 0, si * sbh, W, sbh, so, si * sbh, W, sbh)
      }
    } else if (ty === 'pixel') {
      const px = Math.max(1, Math.round((Math.min(W, H) / 12) * Math.sin(Math.PI * (0.5 + k / 2)) + 1))
      const sm = scratch('px', Math.max(1, Math.ceil(W / px)), Math.max(1, Math.ceil(H / px)))
      ctx2d(sm).drawImage(sc, 0, 0, sm.width, sm.height)
      ctx.imageSmoothingEnabled = false
      ctx.globalAlpha = clamp(k * 2, 0, 1)
      ctx.drawImage(sm, 0, 0, W, H)
      ctx.imageSmoothingEnabled = true
    } else {
      const n = 14
      const bh = H / n
      const amp = (1 - k) * W * 0.12
      const seed = Math.floor(t * 30)
      ctx.globalAlpha = clamp(k * 1.6, 0, 1)
      for (let i = 0; i < n; i++) {
        const off = (rnd(seed * 31 + i) - 0.5) * 2 * amp * (rnd(seed + i * 7) > 0.4 ? 1 : 0)
        ctx.drawImage(sc, 0, i * bh, W, bh, off, i * bh, W, bh)
      }
      if (k < 0.8) {
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.35 * (1 - k)
        ctx.drawImage(sc, amp * 0.3, 0)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  } else if (ctx.globalAlpha > 0.001) paintClip(ctx, W, H, p, c, M, lt, l.dur, blur, t)
  if (ty === 'flash') {
    ctx.globalAlpha = 1 - Math.abs(2 * k - 1)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()
  if (ty === 'mask' && k < 1) {
    const bw2 = W * 0.3
    const bx2 = -bw2 / 2 + e * (W + bw2)
    const mgr = ctx.createLinearGradient(bx2 - bw2 / 2, 0, bx2 + bw2 / 2, 0)
    mgr.addColorStop(0, 'rgba(5,5,5,0)')
    mgr.addColorStop(0.3, 'rgba(5,5,5,1)')
    mgr.addColorStop(0.7, 'rgba(5,5,5,1)')
    mgr.addColorStop(1, 'rgba(5,5,5,0)')
    ctx.save()
    ctx.fillStyle = mgr
    ctx.fillRect(bx2 - bw2 / 2, 0, bw2, H)
    ctx.restore()
  }
  if (ty === 'leak' && k < 1) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.sin(Math.PI * k)
    const gx = W * (0.15 + 0.7 * k)
    const gy = H * 0.35
    const lr = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.8)
    lr.addColorStop(0, 'rgba(255,238,200,1)')
    lr.addColorStop(0.28, 'rgba(255,150,60,0.9)')
    lr.addColorStop(0.62, 'rgba(190,40,20,0.45)')
    lr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lr
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

/* ---------- overlegg ---------- */

function drawOv(ctx: Ctx2D, W: number, H: number, o: Overlay, M: MediaEls, t: number, rects: Rects | null): void {
  const F = hasFilter()
  const lt = t - o.start
  const d = ovDur(o)
  const s = o.kind === 'video' ? M.vids[o.id] : M.imgs[o.media]
  const sz = srcSize(s)
  if (!s || !sz[0] || (o.kind === 'video' && (s as HTMLVideoElement).readyState < 2)) return
  const cr = cropRect(o, sz)
  const dw = o.scale * W
  const dh = (dw * cr[3]) / cr[2]
  const cx = o.x * W
  const cy = o.y * H
  if (rects) rects[`ov:${o.id}`] = { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh }
  const inD = Math.min(0.5, d / 3)
  const kIn = o.anim === 'none' ? 1 : clamp(lt / inD, 0, 1)
  const kOut = o.anim === 'none' ? 1 : clamp((d - lt) / inD, 0, 1)
  const k = Math.min(kIn, kOut)
  const e = easeOut(k)
  let a = o.opacity * fxAlpha(o.effects, lt, d)
  if (o.fadeIn > 0) a *= clamp(lt / o.fadeIn, 0, 1)
  if (o.fadeOut > 0) a *= clamp((d - lt) / o.fadeOut, 0, 1)
  ctx.save()
  ctx.translate(cx, cy)
  if (o.anim === 'fade') a *= e
  else if (o.anim === 'pop') {
    a *= clamp(k * 3, 0, 1)
    const ps = 0.5 + 0.5 * easeBack(k)
    ctx.scale(ps, ps)
  } else if (o.anim === 'slide') {
    a *= e
    ctx.translate((1 - e) * -W * 0.2, 0)
  } else if (o.anim === 'zoom') {
    a *= e
    const zs = 1.4 - 0.4 * e
    ctx.scale(zs, zs)
  } else if (o.anim === 'rise') {
    a *= e
    ctx.translate(0, (1 - e) * H * 0.12)
  }
  if (a <= 0.001) {
    ctx.restore()
    return
  }
  ctx.globalAlpha = a
  ctx.globalCompositeOperation = o.blend || 'source-over'
  if (o.rot) ctx.rotate((o.rot * Math.PI) / 180)
  if (o.flipH || o.flipV) ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1)
  const rad = ((o.radius || 0) * Math.min(dw, dh)) / 2
  if (o.shadow) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = Math.min(W, H) * 0.03
    ctx.shadowOffsetY = Math.min(W, H) * 0.01
    ctx.fillStyle = '#000'
    rr(ctx, -dw / 2, -dh / 2, dw, dh, rad)
    ctx.fill()
    ctx.restore()
  }
  if (rad > 0 || o.border > 0) {
    rr(ctx, -dw / 2, -dh / 2, dw, dh, rad)
    ctx.save()
    ctx.clip()
  }
  const f = filterOf(o, 0)
  const ops0 = F ? [] : colorOps(f)
  const oblur = (o.blur || 0) + fxBlur(o.effects)
  if (o.keyOn || hasCurve(o) || ops0.length || (!F && oblur > 0.3)) {
    const sw = Math.max(1, Math.round(Math.min(Math.abs(dw), 1600)))
    const sh = Math.max(1, Math.round(sw * Math.abs(dh / dw)))
    const pc = scratch(`px:${o.id}`, sw, sh)
    const px = ctx2d(pc)
    px.clearRect(0, 0, sw, sh)
    if (f && F) px.filter = f
    px.drawImage(s, cr[0], cr[1], cr[2], cr[3], 0, 0, sw, sh)
    if (F) px.filter = 'none'
    if (!F && oblur > 0.3) softBlur(px, sw, sh, oblur)
    pixFx(px, sw, sh, ops0.length ? { ...o, ops: ops0 } : o)
    ctx.drawImage(pc, -dw / 2, -dh / 2, dw, dh)
  } else {
    if (f && F) ctx.filter = f
    ctx.drawImage(s, cr[0], cr[1], cr[2], cr[3], -dw / 2, -dh / 2, dw, dh)
  }
  if ('filter' in ctx) ctx.filter = 'none'
  if (rad > 0 || o.border > 0) {
    ctx.restore()
    if (o.border > 0) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineWidth = o.border * Math.min(W, H) * 0.01
      ctx.strokeStyle = o.borderColor || '#fff'
      rr(ctx, -dw / 2, -dh / 2, dw, dh, rad)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/* ---------- tekst ---------- */

function textFill(ctx: Ctx2D, x: TextItem, top: number, bh: number): string | CanvasGradient {
  if (!x.grad) return x.color
  const g = ctx.createLinearGradient(0, top, 0, top + bh)
  g.addColorStop(0, x.color)
  g.addColorStop(1, x.color2 || x.color)
  return g
}

function drawText(ctx: Ctx2D, W: number, H: number, x: TextItem, lt: number, U: number, rects: Rects | null, t: number): void {
  const dur = x.dur
  const an = x.anim
  const none = an === 'none'
  const inD = Math.min(0.7, dur / 3)
  const outD = none ? 0 : Math.min(0.4, dur / 4)
  const kIn = none ? 1 : clamp(lt / inD, 0, 1)
  const kOut = outD ? clamp((dur - lt) / outD, 0, 1) : 1
  const e = easeOut(kIn)
  let s = x.countdown ? fmtCount((x.cdFrom ?? dur) - lt, x.cdFmt) : x.text
  if (x.upper) s = s.toLocaleUpperCase('nb')
  const px = x.size * U
  setFont(ctx, x, px)
  const lines = wrap(ctx, s, x.maxW * W)
  const lh = px * x.lh
  const ws = lines.map((l) => ctx.measureText(l).width)
  const bw = Math.max(...ws, 1)
  const bh = lines.length * lh
  const ax = x.x * W
  const ay = x.y * H
  const left = x.align === 'left' ? ax : x.align === 'right' ? ax - bw : ax - bw / 2
  const top = x.valign === 'top' ? ay : x.valign === 'bottom' ? ay - bh : ay - bh / 2
  const pad = x.box !== 'none' ? px * 0.38 : px * 0.08
  if (rects) rects[x.id] = { x: left - pad, y: top - pad, w: bw + pad * 2, h: bh + pad * 2 }
  let a = kOut * x.opacity
  if (a <= 0.001) return
  const tok = an === 'words' || an === 'letters' || an === 'wave' || an === 'bounce'
  ctx.save()
  if (an === 'fade' || an === 'type') a *= an === 'type' ? Math.min(1, kIn * 6) : e
  else if (an === 'rise') {
    a *= e
    ctx.translate(0, (1 - e) * px * 0.7)
  } else if (an === 'pop') {
    a *= clamp(kIn * 3, 0, 1)
    const sc = 0.55 + 0.45 * easeBack(kIn)
    const cx = left + bw / 2
    ctx.translate(cx, ay)
    ctx.scale(sc, sc)
    ctx.translate(-cx, -ay)
  } else if (an === 'slide') {
    a *= e
    ctx.translate((x.align === 'right' ? 1 : -1) * (1 - e) * W * 0.12, 0)
  } else if (an === 'blur') {
    a *= e
    if ('filter' in ctx) ctx.filter = `blur(${((1 - e) * px * 0.3).toFixed(1)}px)`
  } else if (an === 'zoomout') {
    a *= e
    const zs = 1.8 - 0.8 * e
    const zx = left + bw / 2
    ctx.translate(zx, ay)
    ctx.scale(zs, zs)
    ctx.translate(-zx, -ay)
  } else if (an === 'drop') {
    a *= clamp(kIn * 3, 0, 1)
    ctx.translate(0, -(1 - easeBack(kIn)) * H * 0.25)
  } else if (an === 'flip') {
    a *= clamp(kIn * 2, 0, 1)
    ctx.translate(0, ay)
    ctx.scale(1, Math.max(0.01, easeBack(kIn)))
    ctx.translate(0, -ay)
  } else if (an === 'spread') {
    a *= e
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(((x.track || 0) + (1 - e) * 0.6) * px).toFixed(2)}px`
  } else if (an === 'wipe') {
    const wx = left - pad + (bw + pad * 2) * e
    ctx.beginPath()
    ctx.rect(left - pad - 2, top - pad * 2, wx - left + pad + 2, bh + pad * 4)
    ctx.clip()
  }
  ctx.globalAlpha = a
  if (x.box === 'block') {
    ctx.fillStyle = x.bg
    rr(ctx, left - pad, top - pad * 0.7, bw + pad * 2, bh + pad * 1.4, px * 0.12)
    ctx.fill()
  }
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.lineJoin = 'round'
  const fill = textFill(ctx, x, top, bh)
  const sw = x.stroke > 0 ? x.stroke * px * 0.06 : 0
  const total = lines.reduce((n, l) => n + l.length, 0)
  let budget = an === 'type' ? Math.floor(total * clamp(lt / Math.max(0.5, Math.min(dur * 0.6, total * 0.06)), 0, 1)) : Infinity
  const glitch = an === 'glitch' && lt < Math.min(1.2, dur * 0.5)
  const gs = Math.floor((t || lt) * 24)
  const paint = (str: string, lx0: number, ly: number) => {
    let lx = lx0
    if (sw) {
      ctx.lineWidth = sw * 2
      ctx.strokeStyle = x.strokeColor || '#000'
      ctx.strokeText(str, lx, ly)
    }
    if (glitch) {
      const j = (rnd(gs) - 0.5) * px * 0.25
      ctx.save()
      ctx.globalAlpha = a * 0.8
      ctx.fillStyle = '#ff2a6d'
      ctx.fillText(str, lx + j - px * 0.05, ly)
      ctx.fillStyle = '#05d9e8'
      ctx.fillText(str, lx - j + px * 0.05, ly)
      ctx.restore()
      lx += (rnd(gs + 3) - 0.5) * px * 0.1
    }
    ctx.fillStyle = fill
    ctx.fillText(str, lx, ly)
  }
  let nTok = 0
  if (tok) for (const l of lines) nTok += an === 'words' ? l.split(' ').filter(Boolean).length : l.length
  let ti = 0
  lines.forEach((l, i) => {
    const wi = ws[i] ?? 0
    const lx = x.align === 'left' ? left : x.align === 'right' ? left + bw - wi : left + (bw - wi) / 2
    const ly = top + lh * (i + 0.5) + px * 0.04
    if (x.box === 'line' && l) {
      ctx.save()
      ctx.fillStyle = x.bg
      rr(ctx, lx - pad * 0.6, ly - px * 0.04 - lh * 0.5, wi + pad * 1.2, lh * 0.98, px * 0.08)
      ctx.fill()
      ctx.restore()
    }
    if (x.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = px * 0.28
      ctx.shadowOffsetY = px * 0.06
    }
    if (!tok) {
      let part = l
      if (budget !== Infinity) {
        part = l.slice(0, Math.max(0, budget))
        budget -= l.length
      }
      if (part) paint(part, lx, ly)
      return
    }
    const parts = an === 'words' ? l.split(/(\s+)/) : l.split('')
    let cur = lx
    const spread = Math.min(dur * 0.55, nTok * (an === 'words' ? 0.16 : 0.045))
    for (const pt of parts) {
      const w = ctx.measureText(pt).width
      if (!pt.trim()) {
        cur += w
        continue
      }
      const dl = nTok > 1 ? (ti / (nTok - 1)) * spread : 0
      const kk = clamp((lt - dl) / 0.35, 0, 1)
      const ee = easeOut(kk)
      ti++
      ctx.save()
      if (an === 'wave') {
        const wy = Math.sin(lt * 5 - ti * 0.45) * px * 0.12
        ctx.globalAlpha = a * Math.min(1, kIn * 2)
        ctx.translate(0, wy)
      } else if (an === 'bounce') {
        ctx.globalAlpha = a * clamp(kk * 3, 0, 1)
        ctx.translate(0, -(1 - easeBack(kk)) * px * 0.9)
      } else if (an === 'letters') {
        ctx.globalAlpha = a * kk
        const ls = 0.3 + 0.7 * easeBack(kk)
        const cxx = cur + w / 2
        ctx.translate(cxx, ly)
        ctx.scale(ls, ls)
        ctx.translate(-cxx, -ly)
      } else {
        ctx.globalAlpha = a * ee
        ctx.translate(0, (1 - ee) * px * 0.45)
      }
      paint(pt, cur, ly)
      ctx.restore()
      cur += w
    }
  })
  ctx.restore()
}

function drawSub(ctx: Ctx2D, W: number, H: number, st: SubStyle, sub: Sub, U: number, t: number): void {
  const px = st.size * U
  setFont(ctx, { font: st.font, weight: st.weight, track: 0 }, px)
  const s = st.upper ? sub.text.toLocaleUpperCase('nb') : sub.text
  const lines = wrap(ctx, s, W * 0.86)
  const lh = px * 1.22
  const bh = lines.length * lh
  const cy = st.pos === 'top' ? H * 0.1 + bh / 2 : st.pos === 'center' ? H * 0.5 : H * 0.9 - bh / 2
  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.lineJoin = 'round'
  const nW = s.split(/\s+/).filter(Boolean).length
  let wi = 0
  const hlIdx = st.mode === 'words' && nW ? Math.min(nW - 1, Math.floor(clamp((t - sub.start) / Math.max(0.2, sub.end - sub.start), 0, 0.9999) * nW)) : -1
  lines.forEach((l, i) => {
    const ly = cy - bh / 2 + lh * (i + 0.5)
    const w = ctx.measureText(l).width
    let lx = W / 2 - w / 2
    if (st.bgOn && l) {
      ctx.fillStyle = hexA(st.bg, st.bgA)
      rr(ctx, lx - px * 0.4, ly - lh / 2, w + px * 0.8, lh, px * 0.14)
      ctx.fill()
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = px * 0.3
      ctx.shadowOffsetY = px * 0.05
    }
    if (hlIdx < 0) {
      ctx.fillStyle = st.color
      ctx.fillText(l, lx, ly + px * 0.04)
    } else {
      for (const pt of l.split(/(\s+)/)) {
        const ww = ctx.measureText(pt).width
        if (pt.trim()) {
          ctx.fillStyle = wi === hlIdx ? st.hl || '#f5b82c' : st.color
          ctx.fillText(pt, lx, ly + px * 0.04)
          wi++
        }
        lx += ww
      }
    }
    ctx.shadowColor = 'transparent'
  })
  ctx.restore()
}

/** Tegner bildet ved tid `t` i et lerret på W×H. `rects` fylles med områdene til tekst, overlegg og logo (for klikk). */
export function drawFrame(ctx: Ctx2D, W: number, H: number, p: Project, M: MediaEls, t: number, rects: Rects | null): void {
  const S = W / p.w
  const U = (Math.min(p.w, p.h) / 1080) * S
  ctx.save()
  ctx.globalAlpha = 1
  if ('filter' in ctx) ctx.filter = 'none'
  ctx.fillStyle = p.bg || '#000'
  ctx.fillRect(0, 0, W, H)
  if (!hidden(p, 'video')) {
    const L = layout(p)
    L.forEach((l, i) => {
      if (t < l.start || t >= l.end) return
      const nx = L[i + 1]
      const ok = nx && nx.tr && t >= nx.start ? clamp((t - nx.start) / nx.tr, 0, 1) : 0
      drawClip(ctx, W, H, p, l, M, t, S, ok && nx ? nx.c.trans.type : null, ok)
    })
  }
  if (!hidden(p, 'ov')) {
    for (const o of p.ov.slice().sort((a, b) => (b.lane || 0) - (a.lane || 0))) if (t >= o.start && t < o.start + ovDur(o)) drawOv(ctx, W, H, o, M, t, rects)
  }
  if (!hidden(p, 'text')) {
    for (const x of p.texts.slice().sort((a, b) => (b.lane || 0) - (a.lane || 0))) if (t >= x.start && t < x.start + x.dur) drawText(ctx, W, H, x, t - x.start, U, rects, t)
  }
  if (!hidden(p, 'subs')) {
    const sub = p.subs.find((s) => t >= s.start && t < s.end)
    if (sub?.text) drawSub(ctx, W, H, p.subStyle, sub, U, t)
  }
  const lg = p.logo
  if (lg.on && lg.src) {
    const im = M.imgs[lg.src]
    const sz = srcSize(im)
    if (im && sz[0]) {
      const mn = Math.min(W, H)
      const lw = lg.size * mn
      const lh = (lw * sz[1]) / sz[0]
      const mg = mn * 0.045
      const lx = lg.x !== null ? lg.x * W - lw / 2 : lg.pos[1] === 'l' ? mg : W - mg - lw
      const ly = lg.y !== null ? lg.y * H - lh / 2 : lg.pos[0] === 't' ? mg : H - mg - lh
      ctx.globalAlpha = lg.opacity
      ctx.drawImage(im, lx, ly, lw, lh)
      if (rects) rects.logo = { x: lx, y: ly, w: lw, h: lh }
    }
  }
  ctx.restore()
}
