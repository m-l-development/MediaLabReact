/**
 * Bakgrunnsfyll (farge og gradienter) – samme motor i Photo Design og Loop Studio (media-lab/src/legacy/photo-engine.js
 * `drawFill` og fillVals i photo-design/logic.js). Formatet lagres uendret i prosjektene.
 */
import { curveFn } from './curve'

export interface FillStop { c: string; p: number; w?: number; hard?: boolean }
/** Kurvepunkter (0–1) for fargekurve-gradienten: m = alle kanaler (RGB), r/g/b = hver kanal. */
export type CurvePts = [number, number][]
/** Formen på fargekurve-gradienten: hvordan posisjonen (0–1) i kurvene legges ut over flaten. */
export type CurveShape = 'linear' | 'mirror' | 'cross' | 'diamond' | 'square' | 'radial' | 'conic'
export const CURVE_SHAPES: readonly CurveShape[] = ['linear', 'mirror', 'cross', 'diamond', 'square', 'radial', 'conic']
export interface FillCurves { m?: CurvePts | null; r?: CurvePts | null; g?: CurvePts | null; b?: CurvePts | null }
export type FillMode =
  | 'none' | 'solid' | 'linear' | 'mirror' | 'radial' | 'conic' | 'mesh' | 'stripes' | 'wave' | 'ellipse' | 'corner' | 'spot' | 'glow'
  | 'conicRep' | 'conicMirror' | 'rays' | 'conicCorner' | 'curves'
export interface Fill {
  mode: FillMode
  stops?: FillStop[]
  c1?: string
  c2?: string
  angle?: number
  soft?: number
  sharp?: number
  repeat?: number
  x?: number
  y?: number
  /** Fargekurve-gradient (modus 'curves'): fargen langs retningen bestemmes av RGB-kurvene. */
  curves?: FillCurves | null
  /** Metning for fargekurve-gradienten (1 = som kurvene gir, mer = sterkere farger). Mangler = CURVE_SAT. */
  csat?: number
  /** Form for fargekurve-gradienten (mangler = lineær). */
  cshape?: CurveShape
}

/** Standard metning for fargekurve-gradienten: litt sterkere enn kurvene alene, som ellers gir blasse blandingsfarger. */
export const CURVE_SAT = 1.4

export const FILL_MODES: readonly FillMode[] = ['none', 'solid', 'linear', 'mirror', 'radial', 'conic', 'mesh', 'stripes', 'wave', 'ellipse', 'corner', 'spot', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner', 'curves']

/** Rekkefølgen og navnene i «Type» (samme som i dag). */
export const FILL_MODE_LABELS: readonly [FillMode, string][] = [['none', 'Ingen'], ['solid', 'Farge'], ['linear', 'Lineær'], ['mirror', 'Speilet'], ['radial', 'Rund'], ['ellipse', 'Oval'], ['conic', 'Vinkel'], ['conicRep', 'Vinkel gjentatt'], ['conicMirror', 'Vinkel speilet'], ['conicCorner', 'Vinkel fra hjørne'], ['rays', 'Stråler'], ['mesh', 'Myk blanding'], ['stripes', 'Striper'], ['wave', 'Bølger'], ['corner', 'Fra hjørne'], ['spot', 'Spotlys'], ['glow', 'Glød']]

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const HEX = /^#[0-9a-f]{6}$/i

function rgba(c: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '')
  if (!m?.[1]) return c || `rgba(255,255,255,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Fargestoppene (2–6), med standard når fyllet mangler. */
export function fillStops(f: Partial<Fill> | null | undefined): FillStop[] {
  let st: FillStop[] = Array.isArray(f?.stops)
    ? f.stops.filter((q) => q && HEX.test(q.c)).slice(0, 6).map((q) => ({ c: q.c, p: clamp(Number(q.p) || 0, 0, 1), w: clamp(Number(q.w) || 0, 0, 1), hard: !!q.hard }))
    : []
  if (st.length < 2) st = [{ c: f?.c1 && HEX.test(f.c1) ? f.c1 : '#1a2b4c', p: 0 }, { c: f?.c2 && HEX.test(f.c2) ? f.c2 : '#080808', p: 1 }]
  return st
}

const sorted = (st: FillStop[]) => st.slice().sort((a, b) => a.p - b.p)

/** Blander to HEX-farger (t = 0 → a, 1 → b); andre fargeformater gir den nærmeste. */
function mix(a: string, b: string, t: number): string {
  const ma = /^#([0-9a-f]{6})$/i.exec(a)
  const mb = /^#([0-9a-f]{6})$/i.exec(b)
  if (!ma?.[1] || !mb?.[1]) return t < 0.5 ? a : b
  const x = parseInt(ma[1], 16)
  const y = parseInt(mb[1], 16)
  const ch = (sh: number) => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

/**
 * Stopp som er strukket ut over 0–1 («Overgang» over 50 %): kuttes ved kantene med fargen som ligger der, i stedet for
 * å klemmes inn på kanten (da ble gradienten uendret og glideren virket ikke på høyre halvdel).
 */
function clip01(st: FillStop[]): FillStop[] {
  const l = sorted(st)
  if (l.length < 2 || l.every((q) => q.p >= 0 && q.p <= 1)) return l
  const at = (t: number): string => {
    const j = l.findIndex((q) => q.p >= t)
    if (j <= 0) return (l[j < 0 ? l.length - 1 : 0] as FillStop).c
    const a = l[j - 1] as FillStop
    const b = l[j] as FillStop
    return mix(a.c, b.c, b.p > a.p ? (t - a.p) / (b.p - a.p) : 1)
  }
  return [{ c: at(0), p: 0 }, ...l.filter((q) => q.p > 0 && q.p < 1), { c: at(1), p: 1 }]
}

/**
 * Fargekurve-gradient: fargen ved posisjon t (0–1 langs retningen) er (R, G, B) = m(kanalkurven(t)). Uten kurver blir
 * den svart → hvit; hver kanal formes med sin kurve, og RGB-kurven virker på alle tre.
 */
export function curveStops(cv: FillCurves | null | undefined, n = 48, sat = CURVE_SAT): FillStop[] {
  const fm = curveFn(cv?.m)
  const fr = curveFn(cv?.r)
  const fg = curveFn(cv?.g)
  const fb = curveFn(cv?.b)
  const ch = (f: ((x: number) => number) | null, t: number) => {
    const v = f ? f(t) : t
    return Math.round(clamp(fm ? fm(clamp(v, 0, 1)) : v, 0, 1) * 255)
  }
  const k = clamp(sat, 0, 3)
  const out: FillStop[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let r = ch(fr, t)
    let g = ch(fg, t)
    let b = ch(fb, t)
    if (k !== 1) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b
      r = Math.round(clamp(y + (r - y) * k, 0, 255))
      g = Math.round(clamp(y + (g - y) * k, 0, 255))
      b = Math.round(clamp(y + (b - y) * k, 0, 255))
    }
    out.push({ c: `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`, p: t })
  }
  return out
}

let shapeCache: { key: string; img: CanvasImageSource } | null = null

/**
 * Fargekurve-gradient med form (kryss, diamant, rund …): posisjonen regnes ut per punkt i et lite bilde (maks 640 px,
 * gradienter er myke) som skaleres opp. Retningen roterer formen, og x/y flytter midten. Siste bilde huskes.
 */
function drawCurveShape(ctx: CanvasRenderingContext2D, bf: Fill, W: number, H: number): void {
  const k = Math.min(1, 640 / Math.max(W, H))
  const cw = Math.max(2, Math.round(W * k))
  const chh = Math.max(2, Math.round(H * k))
  const key = JSON.stringify([bf.curves, bf.csat, bf.cshape, bf.angle, bf.x, bf.y, cw, chh, W, H])
  if (shapeCache?.key !== key) {
    const lut = curveStops(bf.curves, 255, bf.csat ?? CURVE_SAT).map((q) => parseInt(q.c.slice(1), 16))
    const cv: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, chh) : Object.assign(document.createElement('canvas'), { width: cw, height: chh })
    const g = cv.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!g) return
    const im = g.createImageData(cw, chh)
    const px = im.data
    const a = ((bf.angle == null ? 90 : bf.angle) * Math.PI) / 180
    const sa = Math.sin(a)
    const ca = Math.cos(a)
    const cx = W * (bf.x == null ? 0.5 : bf.x)
    const cy = H * (bf.y == null ? 0.5 : bf.y)
    const L = Math.max(1, (Math.abs(W * sa) + Math.abs(H * ca)) / 2)
    const Lp = Math.max(1, (Math.abs(W * ca) + Math.abs(H * sa)) / 2)
    const R = Math.max(1, Math.hypot(W, H) / 2)
    const a0 = a - Math.PI / 2
    const sh = bf.cshape
    let i = 0
    for (let y = 0; y < chh; y++) {
      const dy = (y + 0.5) / k - cy
      for (let x = 0; x < cw; x++) {
        const dx = (x + 0.5) / k - cx
        const U = Math.abs((dx * sa - dy * ca) / L)
        const V = Math.abs((dx * ca + dy * sa) / Lp)
        let t = sh === 'mirror' ? U
          : sh === 'cross' ? Math.min(U, V)
            : sh === 'diamond' ? (U + V) / 2
              : sh === 'square' ? Math.max(U, V)
                : sh === 'radial' ? Math.hypot(dx, dy) / R
                  : (((Math.atan2(dy, dx) - a0) / (2 * Math.PI)) % 1 + 1) % 1
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const c = lut[Math.round(t * 255)] ?? 0
        px[i++] = (c >> 16) & 255
        px[i++] = (c >> 8) & 255
        px[i++] = c & 255
        px[i++] = 255
      }
    }
    g.putImageData(im, 0, 0)
    shapeCache = { key, img: cv }
  }
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(shapeCache.img, 0, 0, W, H)
  ctx.restore()
}

/** Tegner fyllet over hele flaten (W × H). */
export function drawFill(ctx: CanvasRenderingContext2D, bf: Fill, W: number, H: number): void {
  if (bf.mode === 'curves' && bf.cshape && bf.cshape !== 'linear' && CURVE_SHAPES.includes(bf.cshape)) {
    drawCurveShape(ctx, bf, W, H)
    return
  }
  if (bf.mode === 'curves') {
    const a = ((bf.angle == null ? 90 : bf.angle) * Math.PI) / 180
    const dx = Math.sin(a)
    const dy = -Math.cos(a)
    const ln = Math.abs(W * dx) + Math.abs(H * dy)
    const cx = W * (bf.x == null ? 0.5 : bf.x)
    const cy = H * (bf.y == null ? 0.5 : bf.y)
    const g = ctx.createLinearGradient(cx - (dx * ln) / 2, cy - (dy * ln) / 2, cx + (dx * ln) / 2, cy + (dy * ln) / 2)
    for (const q of curveStops(bf.curves, 48, bf.csat ?? CURVE_SAT)) g.addColorStop(q.p, q.c)
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
    return
  }
  ctx.save()
  let st: FillStop[] = Array.isArray(bf.stops) && bf.stops.length ? sorted(bf.stops) : [{ c: bf.c1 || '#1a1a1a', p: 0 }, { c: bf.c2 || '#000000', p: 1 }]
  const sfv = bf.soft == null ? 0.5 : clamp(bf.soft, 0, 1)
  const SFk = 0.08 + 1.84 * sfv
  if (st.length > 1 && sfv !== 0.5) {
    const mm = st.reduce((s, q) => s + q.p, 0) / st.length
    st = clip01(st.map((q) => ({ ...q, p: mm + (q.p - mm) * SFk })))
  }
  const bandW = st.map((q) => clamp(Number(q.w) || 0, 0, 1))
  const mode = bf.mode
  if (bandW.some((w) => w > 0) && !['stripes', 'mesh', 'glow', 'solid'].includes(mode)) {
    const ex: FillStop[] = []
    st.forEach((q, i) => {
      const h = (bandW[i] ?? 0) / 2
      if (h > 0) ex.push({ c: q.c, p: clamp(q.p - h, 0, 1) }, { c: q.c, p: clamp(q.p + h, 0, 1), ...(q.hard ? { hard: true } : {}) })
      else ex.push({ c: q.c, p: q.p, ...(q.hard ? { hard: true } : {}) })
    })
    st = sorted(ex)
  }
  const shp = clamp(Number(bf.sharp) || 0, 0, 1)
  const anyHard = st.some((q) => q.hard)
  if ((shp > 0 || anyHard) && st.length > 1 && !['stripes', 'mesh', 'glow', 'solid', 'rays'].includes(mode)) {
    const sh: FillStop[] = [st[0] as FillStop]
    for (let si = 1; si < st.length; si++) {
      const qa = st[si - 1] as FillStop
      const qb = st[si] as FillStop
      const k2 = qa.hard ? 1 : shp
      const mid = (qa.p + qb.p) / 2
      const hw = ((qb.p - qa.p) / 2) * (1 - k2 * 0.995)
      sh.push({ c: qa.c, p: mid - hw, ...(qa.hard ? { hard: true } : {}) }, { c: qb.c, p: mid + hw, ...(qb.hard ? { hard: true } : {}) }, qb)
    }
    st = sh
  }
  const first = st[0] as FillStop
  const last = st[st.length - 1] as FillStop
  const put = (g: CanvasGradient, list: FillStop[]) => {
    for (const q of list) g.addColorStop(clamp(q.p, 0, 1), q.c)
    return g
  }
  const ang = ((bf.angle == null ? 135 : bf.angle) * Math.PI) / 180
  const cx0 = W * (bf.x == null ? 0.5 : bf.x)
  const cy0 = H * (bf.y == null ? 0.5 : bf.y)
  const lin = () => {
    const dx0 = Math.sin(ang)
    const dy0 = -Math.cos(ang)
    const ln = Math.abs(W * dx0) + Math.abs(H * dy0)
    return ctx.createLinearGradient(cx0 - (dx0 * ln) / 2, cy0 - (dy0 * ln) / 2, cx0 + (dx0 * ln) / 2, cy0 + (dy0 * ln) / 2)
  }
  const offX = cx0 - W / 2
  const offY = cy0 - H / 2
  const conic = (a: number, x: number, y: number) => (ctx.createConicGradient ? ctx.createConicGradient(a, x, y) : null)
  if (mode === 'solid') {
    ctx.fillStyle = first.c
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'radial') {
    ctx.fillStyle = put(ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.hypot(W, H) * 0.6), st)
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'mirror') {
    const ms = [...st.map((q) => ({ c: q.c, p: q.p / 2 })), ...st.slice().reverse().map((q) => ({ c: q.c, p: 1 - q.p / 2 }))]
    ctx.fillStyle = put(lin(), ms)
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'conic' && conic(0, 0, 0)) {
    ctx.fillStyle = put(conic(ang - Math.PI / 2, cx0, cy0) as CanvasGradient, [...st, { c: first.c, p: 1 }])
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'mesh') {
    const PP: [number, number][] = [[0.15, 0.2], [0.85, 0.25], [0.8, 0.85], [0.2, 0.8], [0.5, 0.5], [0.5, 0.1]]
    const R0 = Math.max(W, H) * 0.75 * (0.4 + 1.2 * sfv)
    ctx.fillStyle = last.c
    ctx.fillRect(0, 0, W, H)
    st.forEach((q, i) => {
      const pp = PP[i % PP.length] as [number, number]
      const mx = pp[0] * W + offX
      const my = pp[1] * H + offY
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, R0 * (0.6 + 1.2 * (Number(q.w) || 0)))
      g.addColorStop(0, q.c)
      if (shp > 0) g.addColorStop(shp * 0.9, q.c)
      g.addColorStop(1, rgba(q.c, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    })
  } else if ((mode === 'conicRep' || mode === 'conicMirror' || mode === 'rays' || mode === 'conicCorner') && conic(0, 0, 0)) {
    let nR = Math.max(1, Math.min(24, Math.round(Number(bf.repeat) || (mode === 'rays' ? 8 : 3))))
    let ccx = cx0
    let ccy = cy0
    const cl: FillStop[] = []
    if (mode === 'conicCorner') {
      ccx = W * (0.5 + 0.5 * Math.sin(ang)) + offX
      ccy = H * (0.5 - 0.5 * Math.cos(ang)) + offY
      nR = 1
    }
    for (let cr = 0; cr < nR; cr++) {
      if (mode === 'rays') {
        st.forEach((q, i) => {
          const a0 = (cr + i / st.length) / nR
          const a1 = (cr + (i + 1) / st.length) / nR - 0.0004
          cl.push({ c: q.c, p: a0 }, { c: q.c, p: a1 })
        })
      } else if (mode === 'conicMirror') {
        for (const q of st) cl.push({ c: q.c, p: (cr + q.p / 2) / nR })
        for (const q of st.slice().reverse()) cl.push({ c: q.c, p: (cr + 1 - q.p / 2) / nR })
      } else for (const q of st) cl.push({ c: q.c, p: (cr + q.p * 0.999) / nR })
    }
    if (mode !== 'rays' && mode !== 'conicMirror') cl.push({ c: first.c, p: 1 })
    ctx.fillStyle = put(conic(ang - Math.PI / 2, ccx, ccy) as CanvasGradient, sorted(cl))
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'stripes') {
    const rpN = Math.max(1, Math.min(20, Math.round(Number(bf.repeat) || 1)))
    const hs: FillStop[] = []
    let wsum = 0
    const ww = st.map((q) => {
      const v = 0.3 + (Number(q.w) || 0) * 2
      wsum += v
      return v
    })
    for (let rr = 0; rr < rpN; rr++) {
      let acc = 0
      st.forEach((q, i) => {
        const a0 = (rr + acc / wsum) / rpN
        acc += ww[i] ?? 0
        const a1 = (rr + acc / wsum) / rpN - 0.0005
        hs.push({ c: q.c, p: a0 }, { c: q.c, p: a1 })
      })
    }
    ctx.fillStyle = put(lin(), hs)
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'wave') {
    const ws: FillStop[] = []
    const wN = Math.max(1, Math.min(20, Math.round(Number(bf.repeat) || 3)))
    for (let rp = 0; rp < wN; rp++) for (const q of st) ws.push({ c: q.c, p: (rp + q.p * (rp % 2 ? -1 : 1) + (rp % 2 ? 1 : 0)) / wN })
    ctx.fillStyle = put(lin(), sorted(ws))
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'ellipse') {
    ctx.save()
    ctx.translate(cx0, cy0)
    ctx.scale(W / Math.max(W, H), H / Math.max(W, H))
    const RR = Math.max(W, H) * 0.72
    ctx.fillStyle = put(ctx.createRadialGradient(0, 0, 0, 0, 0, RR), st)
    ctx.fillRect(-RR * 2, -RR * 2, RR * 4, RR * 4)
    ctx.restore()
  } else if (mode === 'corner') {
    const kx = W * (0.5 + 0.5 * Math.sin(ang)) + offX
    const ky = H * (0.5 - 0.5 * Math.cos(ang)) + offY
    ctx.fillStyle = put(ctx.createRadialGradient(kx, ky, 0, kx, ky, Math.hypot(W, H)), st)
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'spot') {
    const sr = Math.min(W, H) * 0.55
    ctx.fillStyle = put(ctx.createRadialGradient(cx0, cy0 - H * 0.08, 0, cx0, cy0, sr), st)
    ctx.fillRect(0, 0, W, H)
  } else if (mode === 'glow') {
    ctx.fillStyle = last.c
    ctx.fillRect(0, 0, W, H)
    const gdx = Math.sin(ang)
    const gdy = -Math.cos(ang)
    const n0 = Math.max(1, st.length - 1)
    st.slice(0, -1).forEach((q, i) => {
      const tq = n0 === 1 ? 0.5 : i / (n0 - 1)
      const gx = cx0 + gdx * (tq - 0.5) * W * 0.8
      const gy = cy0 + gdy * (tq - 0.5) * H * 0.8
      const gr = Math.max(W, H) * 0.55 * (0.4 + 1.2 * sfv) * (0.6 + 1.2 * (Number(q.w) || 0))
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr)
      g.addColorStop(0, q.c)
      if (shp > 0) g.addColorStop(shp * 0.9, q.c)
      g.addColorStop(1, rgba(q.c, 0))
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    })
    ctx.globalCompositeOperation = 'source-over'
  } else {
    ctx.fillStyle = put(lin(), st)
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()
}

/** CSS-forhåndsvisning av fyllet (miniatyr i panelet). */
export function fillCss(f: Fill): string {
  const mode = f.mode
  const ss = sorted(fillStops(f))
  const ang = f.angle == null ? 135 : f.angle
  const first = ss[0] as FillStop
  const last = ss[ss.length - 1] as FillStop
  const li = ss.map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')
  if (mode === 'none') return 'transparent'
  if (mode === 'solid') return first.c
  if (mode === 'curves') return `linear-gradient(${Math.round(f.angle == null ? 90 : f.angle)}deg, ${curveStops(f.curves, 16, f.csat ?? CURVE_SAT).map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')})`
  if (mode === 'radial') return `radial-gradient(circle at 50% 50%, ${li})`
  if (mode === 'conicRep' || mode === 'conicMirror' || mode === 'rays' || mode === 'conicCorner') {
    const n = mode === 'conicCorner' ? 1 : Math.max(1, Math.round(f.repeat || (mode === 'rays' ? 8 : 3)))
    const seg = 360 / n
    const a = (ang * Math.PI) / 180
    const at = mode === 'conicCorner' ? `${Math.round(50 + 50 * Math.sin(a))}% ${Math.round(50 - 50 * Math.cos(a))}%` : '50% 50%'
    const body = mode === 'rays'
      ? ss.map((q, i) => `${q.c} ${((i / ss.length) * seg).toFixed(1)}deg ${(((i + 1) / ss.length) * seg).toFixed(1)}deg`).join(', ')
      : mode === 'conicMirror'
        ? `${ss.map((q) => `${q.c} ${((q.p * seg) / 2).toFixed(1)}deg`).join(', ')}, ${ss.slice().reverse().map((q) => `${q.c} ${(seg - (q.p * seg) / 2).toFixed(1)}deg`).join(', ')}`
        : `${ss.map((q) => `${q.c} ${(q.p * seg).toFixed(1)}deg`).join(', ')}, ${first.c} ${seg.toFixed(1)}deg`
    return `repeating-conic-gradient(from ${Math.round(ang)}deg at ${at}, ${body})`
  }
  if (mode === 'conic') return `conic-gradient(from ${Math.round(ang)}deg, ${li}, ${first.c})`
  if (mode === 'mirror') return `linear-gradient(${Math.round(ang)}deg, ${ss.map((q) => `${q.c} ${Math.round(q.p * 50)}%`).join(', ')}, ${ss.slice().reverse().map((q) => `${q.c} ${Math.round(100 - q.p * 50)}%`).join(', ')})`
  if (mode === 'stripes') {
    const n = Math.max(1, Math.round(f.repeat || 1))
    const seg = 100 / n
    return `repeating-linear-gradient(${Math.round(ang)}deg, ${ss.map((q, i) => `${q.c} ${((i / ss.length) * seg).toFixed(2)}% ${(((i + 1) / ss.length) * seg).toFixed(2)}%`).join(', ')})`
  }
  if (mode === 'wave') return `repeating-linear-gradient(${Math.round(ang)}deg, ${ss.map((q) => `${q.c} ${Math.round(q.p * 33)}%`).join(', ')}, ${first.c} 33%)`
  if (mode === 'ellipse') return `radial-gradient(ellipse at 50% 50%, ${li})`
  if (mode === 'corner') {
    const a = (ang * Math.PI) / 180
    return `radial-gradient(circle at ${Math.round(50 + 50 * Math.sin(a))}% ${Math.round(50 - 50 * Math.cos(a))}%, ${li})`
  }
  if (mode === 'spot') return `radial-gradient(circle at 50% 42%, ${ss.map((q) => `${q.c} ${Math.round(q.p * 55)}%`).join(', ')})`
  if (mode === 'glow') {
    const a = (ang * Math.PI) / 180
    const n = Math.max(1, ss.length - 1)
    return `${ss.slice(0, -1).map((q, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      return `radial-gradient(circle at ${Math.round(50 + Math.sin(a) * (t - 0.5) * 80)}% ${Math.round(50 - Math.cos(a) * (t - 0.5) * 80)}%, ${q.c}, transparent 60%)`
    }).join(', ')}, ${last.c}`
  }
  if (mode === 'mesh') {
    const PP = [[15, 20], [85, 25], [80, 85], [20, 80], [50, 50], [50, 10]] as const
    return `${ss.map((q, i) => {
      const pp = PP[i % 6] as readonly [number, number]
      return `radial-gradient(circle at ${pp[0]}% ${pp[1]}%, ${q.c}, transparent 70%)`
    }).join(', ')}, ${last.c}`
  }
  return `linear-gradient(${Math.round(ang)}deg, ${li})`
}

/** Tilfeldige farger som passer sammen (samme som i dag). */
export function harmonyColors(n: number, rnd: () => number = Math.random): string[] {
  const h0 = rnd() * 360
  const sch = [30, 150, 180, 120][Math.floor(rnd() * 4)] ?? 30
  const hx = (h: number, s: number, l: number) => {
    const k = (x: number) => (x + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (x: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1)))).toString(16).padStart(2, '0')
    return '#' + f(0) + f(8) + f(4)
  }
  return Array.from({ length: Math.max(1, n) }, (_, i) => hx((h0 + (i % 2 ? sch : 0) + i * 12) % 360, 0.45 + rnd() * 0.35, n === 1 ? 0.45 : 0.18 + 0.55 * (n > 1 ? i / (n - 1) : 0.5)))
}

/** Standard «Antall gjentakelser» for typen. */
export const defaultRepeat = (mode: FillMode): number => (mode === 'wave' || mode === 'conicRep' || mode === 'conicMirror' ? 3 : mode === 'rays' ? 8 : 1)
