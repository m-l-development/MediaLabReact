import { drawFill } from '../../../shared/fill/fill'
import { draw as drawFx } from '../../../shared/fx/fx'
import { ADJ, BLEED, BLEED_MM, clamp, dims, mmOf, textBox, type Adj, type PdDoc, type PdLayer, type Side } from './model'

type G = CanvasRenderingContext2D

export function mk(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

const ctx = (c: HTMLCanvasElement, opt?: CanvasRenderingContext2DSettings): G => {
  const g = c.getContext('2d', opt)
  if (!g) throw new Error('2d')
  return g
}

/** Et innlastet bilde med hurtigbuffer for nedskalering og justering. */
export interface MediaEntry {
  img: CanvasImageSource
  w: number
  h: number
  url: string
  cache: Map<string, HTMLCanvasElement>
  pk?: string
  p?: HTMLCanvasElement
  ak?: string
  a?: HTMLCanvasElement
}

/** Maske for et bildelag (hvit = synlig). `v` øker ved hver endring. */
export interface MaskCanvas { c: HTMLCanvasElement; v: number }

export interface Media {
  media: Map<string, MediaEntry>
  masks: Map<string, MaskCanvas>
}

export async function loadImg(blob: Blob): Promise<MediaEntry> {
  const u = URL.createObjectURL(blob)
  const im = new Image()
  im.src = u
  try {
    await im.decode()
  } catch (e) {
    URL.revokeObjectURL(u)
    throw e
  }
  return { img: im, w: im.naturalWidth, h: im.naturalHeight, url: u, cache: new Map() }
}

// ---------- bildebehandling ----------

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

function luts(a: Adj): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const R = new Uint8ClampedArray(256)
  const Gc = new Uint8ClampedArray(256)
  const B = new Uint8ClampedArray(256)
  const cf = curveFn(a.curve)
  const ex = Math.pow(2, (a.exp || 0) / 50)
  const c = a.con || 0
  const cm = c > 0 ? 1 + (c / 100) * 1.4 : 1 + (c / 100) * 0.9
  const f = (a.fade || 0) / 100
  const t = (a.temp || 0) / 100
  const ti = (a.tint || 0) / 100
  const gr = 1 + t * 0.14 + ti * 0.05
  const gg = 1 - ti * 0.1
  const gb = 1 - t * 0.16 + ti * 0.05
  for (let v = 0; v < 256; v++) {
    let x = (v / 255) * ex
    x += ((a.sh || 0) / 100) * 0.35 * Math.pow(1 - clamp(x, 0, 1), 2) * (1 - (1 - clamp(x, 0, 1)) * 0.4)
    x += ((a.hi || 0) / 100) * 0.3 * Math.pow(clamp(x, 0, 1), 2)
    x += ((a.bri || 0) / 100) * 0.28
    x = (x - 0.5) * cm + 0.5
    x = clamp(x, 0, 1)
    x = x * (1 - f * 0.28) + f * 0.14
    if (cf) x = cf(x)
    R[v] = x * gr * 255
    Gc[v] = x * gg * 255
    B[v] = x * gb * 255
  }
  return [R, Gc, B]
}

function satHue(a: Adj): number[] {
  const s = 1 + (a.sat || 0) / 100
  const h = ((a.hue || 0) * Math.PI) / 180
  const cs = Math.cos(h)
  const sn = Math.sin(h)
  const H = [0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928, 0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.14, 0.072 - cs * 0.072 - sn * 0.283, 0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072]
  const lr = 0.2126
  const lg = 0.7152
  const lb = 0.0722
  const S = [lr + (1 - lr) * s, lg - lg * s, lb - lb * s, lr - lr * s, lg + (1 - lg) * s, lb - lb * s, lr - lr * s, lg - lg * s, lb + (1 - lb) * s]
  const M: number[] = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) M[i * 3 + j] = (S[i * 3] ?? 0) * (H[j] ?? 0) + (S[i * 3 + 1] ?? 0) * (H[3 + j] ?? 0) + (S[i * 3 + 2] ?? 0) * (H[6 + j] ?? 0)
  }
  return M
}

export function neutral(a: Adj): boolean {
  for (const k of Object.keys(ADJ) as (keyof Adj)[]) {
    if (k === 'curve') {
      if (a.curve?.length) return false
    } else if (a[k]) return false
  }
  return true
}

let FILT: boolean | null = null
function hasFilter(): boolean {
  if (FILT == null) {
    try {
      const g = ctx(mk(2, 2))
      g.filter = 'blur(1px)'
      FILT = g.filter === 'blur(1px)'
    } catch {
      FILT = false
    }
  }
  return FILT
}

function blurInto(src: HTMLCanvasElement, r: number): HTMLCanvasElement {
  const W = src.width
  const H = src.height
  const o = mk(W, H)
  const g = ctx(o)
  if (hasFilter()) {
    g.filter = `blur(${r}px)`
    g.drawImage(src, 0, 0)
    g.filter = 'none'
    return o
  }
  const k = Math.max(1, r / 1.6)
  const s = mk(W / k, H / k)
  ctx(s).drawImage(src, 0, 0, s.width, s.height)
  g.imageSmoothingQuality = 'high'
  g.drawImage(s, 0, 0, W, H)
  return o
}

/** Bildet nedskalert til høyst `maxD` (hurtigbufret). */
export function baseOf(E: MediaEntry, maxD: number): HTMLCanvasElement {
  const s = Math.min(1, maxD / Math.max(E.w, E.h))
  const k = 'b' + Math.round(E.w * s)
  const have = E.cache.get(k)
  if (have) return have
  const c = mk(E.w * s, E.h * s)
  ctx(c).drawImage(E.img, 0, 0, c.width, c.height)
  E.cache.set(k, c)
  return c
}

function adjusted(E: MediaEntry, a: Adj, maxD: number): HTMLCanvasElement {
  const b = baseOf(E, maxD)
  const W = b.width
  const H = b.height
  const out = mk(W, H)
  const g = ctx(out, { willReadFrequently: true })
  if (neutral(a)) {
    g.drawImage(b, 0, 0)
    return out
  }
  const src = a.blur > 0 ? blurInto(b, (a.blur / 100) * 0.025 * Math.max(W, H)) : b
  g.drawImage(src, 0, 0)
  const id = g.getImageData(0, 0, W, H)
  const d = id.data
  const [R, Gc, B] = luts(a)
  const M = satHue(a)
  const mx = (a.sat || 0) !== 0 || (a.hue || 0) !== 0
  const gr = (a.grain || 0) * 0.5
  let seed = 1234567
  for (let i = 0; i < d.length; i += 4) {
    let r = R[d[i] ?? 0] ?? 0
    let gg = Gc[d[i + 1] ?? 0] ?? 0
    let bb = B[d[i + 2] ?? 0] ?? 0
    if (mx) {
      const r2 = (M[0] ?? 0) * r + (M[1] ?? 0) * gg + (M[2] ?? 0) * bb
      const g2 = (M[3] ?? 0) * r + (M[4] ?? 0) * gg + (M[5] ?? 0) * bb
      const b2 = (M[6] ?? 0) * r + (M[7] ?? 0) * gg + (M[8] ?? 0) * bb
      r = r2
      gg = g2
      bb = b2
    }
    if (gr) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      const n = ((seed >>> 8) / 16777216 - 0.5) * gr
      r += n
      gg += n
      bb += n
    }
    d[i] = r
    d[i + 1] = gg
    d[i + 2] = bb
  }
  g.putImageData(id, 0, 0)
  if (a.vig) {
    const v = a.vig / 100
    const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2)
    rg.addColorStop(0, 'rgba(0,0,0,0)')
    rg.addColorStop(1, v > 0 ? `rgba(0,0,0,${v * 0.85})` : `rgba(255,255,255,${-v * 0.8})`)
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = rg
    g.fillRect(0, 0, W, H)
    g.globalCompositeOperation = 'source-over'
  }
  return out
}

function processed(E: MediaEntry, adj: Adj | undefined, mask: MaskCanvas | undefined, maxD: number): HTMLCanvasElement {
  const a = adj ?? ADJ
  const ak = `a${maxD}|${JSON.stringify(a)}`
  const key = `${ak}|${mask ? mask.v : 0}`
  if (E.pk === key && E.p) return E.p
  let out: HTMLCanvasElement
  if (E.ak === ak && E.a) out = E.a
  else {
    out = adjusted(E, a, maxD)
    E.ak = ak
    E.a = out
  }
  if (mask) {
    const fin = mk(out.width, out.height)
    const fg = ctx(fin)
    fg.drawImage(out, 0, 0)
    fg.globalCompositeOperation = 'destination-in'
    fg.imageSmoothingQuality = 'high'
    fg.drawImage(mask.c, 0, 0, fin.width, fin.height)
    out = fin
  }
  E.pk = key
  E.p = out
  return out
}

/** Utsnitt: innholdet dekker rammen (w × h) med zoom cz og forskyvning cx/cy (−1…1). */
export function cover(sw: number, sh: number, w: number, h: number, cz: number, cx: number, cy: number) {
  const s = Math.max(w / sw, h / sh) * (cz || 1)
  const vw = w / s
  const vh = h / s
  const mx = (sw - vw) / 2
  const my = (sh - vh) / 2
  return { sx: mx + clamp(cx || 0, -1, 1) * mx, sy: my + clamp(cy || 0, -1, 1) * my, sw: vw, sh: vh, s }
}

// ---------- former ----------

export function shapePath(g: G, kind: string, w: number, h: number, rad: number): void {
  const x = -w / 2
  const y = -h / 2
  const aw = Math.abs(w) / 2
  const ah = Math.abs(h) / 2
  g.beginPath()
  if (kind === 'ellipse') {
    g.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2)
    return
  }
  if (kind === 'ring') {
    g.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2)
    g.moveTo(aw * 0.62, 0)
    g.ellipse(0, 0, aw * 0.62, ah * 0.62, 0, 0, Math.PI * 2)
    return
  }
  if (kind === 'triangle') {
    g.moveTo(0, y)
    g.lineTo(-x, -y)
    g.lineTo(x, -y)
    g.closePath()
    return
  }
  if (kind === 'diamond') {
    g.moveTo(0, y)
    g.lineTo(-x, 0)
    g.lineTo(0, -y)
    g.lineTo(x, 0)
    g.closePath()
    return
  }
  if (kind === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i
      if (i) g.lineTo(Math.cos(a) * aw, Math.sin(a) * ah)
      else g.moveTo(Math.cos(a) * aw, Math.sin(a) * ah)
    }
    g.closePath()
    return
  }
  if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const b = -Math.PI / 2 + (Math.PI / 5) * i
      const q = i % 2 ? 0.45 : 1
      if (i) g.lineTo(Math.cos(b) * aw * q, Math.sin(b) * ah * q)
      else g.moveTo(Math.cos(b) * aw * q, Math.sin(b) * ah * q)
    }
    g.closePath()
    return
  }
  if (kind === 'arrow') {
    const hx = aw * 0.2
    const sh = ah * 0.42
    g.moveTo(-aw, -sh)
    g.lineTo(hx, -sh)
    g.lineTo(hx, -ah)
    g.lineTo(aw, 0)
    g.lineTo(hx, ah)
    g.lineTo(hx, sh)
    g.lineTo(-aw, sh)
    g.closePath()
    return
  }
  const poly = (pts: [number, number][]) => {
    pts.forEach((p, j) => (j ? g.lineTo(p[0] * aw, p[1] * ah) : g.moveTo(p[0] * aw, p[1] * ah)))
    g.closePath()
  }
  const ngon = (n: number, rot: number, inner?: number) => {
    const o: [number, number][] = []
    const N = n * (inner ? 2 : 1)
    for (let j = 0; j < N; j++) {
      const an = rot + ((Math.PI * 2) / N) * j
      const q = inner && j % 2 ? inner : 1
      o.push([Math.cos(an) * q, Math.sin(an) * q])
    }
    poly(o)
  }
  if (kind === 'pentagon') return ngon(5, -Math.PI / 2)
  if (kind === 'octagon') return ngon(8, Math.PI / 8)
  if (kind === 'burst') return ngon(12, -Math.PI / 2, 0.78)
  if (kind === 'plus') {
    const t = 0.34
    return poly([[-t, -1], [t, -1], [t, -t], [1, -t], [1, t], [t, t], [t, 1], [-t, 1], [-t, t], [-1, t], [-1, -t], [-t, -t]])
  }
  if (kind === 'parallelogram') return poly([[-0.5, -1], [1, -1], [0.5, 1], [-1, 1]])
  if (kind === 'trapezoid') return poly([[-0.6, -1], [0.6, -1], [1, 1], [-1, 1]])
  if (kind === 'chevron') return poly([[-1, -1], [0.3, -1], [1, 0], [0.3, 1], [-1, 1], [-0.3, 0]])
  if (kind === 'half') {
    g.moveTo(-aw, ah)
    g.ellipse(0, ah, aw, ah * 2, 0, Math.PI, Math.PI * 2)
    g.closePath()
    return
  }
  if (kind === 'heart') {
    g.moveTo(0, -ah * 0.4)
    g.bezierCurveTo(0, -ah * 0.95, -aw, -ah * 0.95, -aw, -ah * 0.3)
    g.bezierCurveTo(-aw, ah * 0.3, -aw * 0.15, ah * 0.6, 0, ah)
    g.bezierCurveTo(aw * 0.15, ah * 0.6, aw, ah * 0.3, aw, -ah * 0.3)
    g.bezierCurveTo(aw, -ah * 0.95, 0, -ah * 0.95, 0, -ah * 0.4)
    g.closePath()
    return
  }
  if (kind === 'bubble') {
    const bt = -ah
    const bb = ah * 0.55
    const br = Math.min(rad || Math.min(aw, ah) * 0.35, aw, (bb - bt) / 2)
    g.moveTo(-aw + br, bt)
    g.lineTo(aw - br, bt)
    g.arcTo(aw, bt, aw, bt + br, br)
    g.lineTo(aw, bb - br)
    g.arcTo(aw, bb, aw - br, bb, br)
    g.lineTo(-aw * 0.15, bb)
    g.lineTo(-aw * 0.55, ah)
    g.lineTo(-aw * 0.45, bb)
    g.lineTo(-aw + br, bb)
    g.arcTo(-aw, bb, -aw, bb - br, br)
    g.lineTo(-aw, bt + br)
    g.arcTo(-aw, bt, -aw + br, bt, br)
    g.closePath()
    return
  }
  const rr = kind === 'line' ? Math.min(aw, ah) : Math.min(rad || 0, aw, ah)
  if (g.roundRect && rr) g.roundRect(x, y, w, h, rr)
  else g.rect(x, y, w, h)
}

export function rgba(c: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '')
  if (!m?.[1]) return c || `rgba(255,255,255,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// ---------- tegning ----------

export interface RenderOptions {
  scale?: number
  /** Full oppløsning (eksport). */
  full?: boolean
  /** Største bildeside i forhåndsvisning. */
  preview?: number
  /** Ingen plassholder for tomme bildefelt. */
  noPh?: boolean
  phText?: string
  transparent?: boolean
  bleed?: number
  ox?: number
  oy?: number
  t?: number
}

function drawLayer(g: G, L: PdLayer, M: Media, o: RenderOptions & { scale: number }) {
  const dm = dims(L)
  g.save()
  g.translate(L.x, L.y)
  if (L.rot) g.rotate((L.rot * Math.PI) / 180)
  g.globalAlpha = clamp(L.op == null ? 1 : L.op, 0, 1)
  g.globalCompositeOperation = L.blend || 'source-over'
  if (L.type === 'image') {
    const E = L.src ? M.media.get(L.src) : undefined
    const w = dm.w
    const h = dm.h
    if (!E) {
      if (!o.noPh) {
        g.fillStyle = '#2a2a2a'
        g.fillRect(-w / 2, -h / 2, w, h)
        g.strokeStyle = '#555'
        g.lineWidth = Math.max(2, Math.min(w, h) * 0.006)
        g.setLineDash([Math.min(w, h) * 0.03, Math.min(w, h) * 0.02])
        g.strokeRect(-w / 2, -h / 2, w, h)
        g.setLineDash([])
        g.fillStyle = '#9d998f'
        g.font = `600 ${Math.max(14, Math.min(w, h) * 0.06)}px Archivo, sans-serif`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(o.phText || 'Dra inn et bilde', 0, 0)
      }
    } else {
      const need = Math.max(w, h) * o.scale * (L.cz || 1) * 1.15
      const maxD = o.full ? 8192 : clamp(Math.ceil(need / 256) * 256, 256, o.preview || 1600)
      const P = processed(E, L.adj, M.masks.get(L.id), maxD)
      const k = P.width / E.w
      const r = cover(E.w, E.h, w, h, L.cz, L.cx, L.cy)
      g.scale(L.flipX ? -1 : 1, L.flipY ? -1 : 1)
      g.imageSmoothingQuality = 'high'
      if (L.tint) {
        const tw = Math.max(1, Math.min(4096, Math.ceil(Math.abs(w) * o.scale * 1.5)))
        const th = Math.max(1, Math.min(4096, Math.ceil(Math.abs(h) * o.scale * 1.5)))
        const tc = mk(tw, th)
        const tg = ctx(tc)
        tg.drawImage(P, r.sx * k, r.sy * k, r.sw * k, r.sh * k, 0, 0, tw, th)
        tg.globalCompositeOperation = 'source-in'
        tg.fillStyle = L.tint
        tg.fillRect(0, 0, tw, th)
        g.drawImage(tc, -w / 2, -h / 2, w, h)
      } else g.drawImage(P, r.sx * k, r.sy * k, r.sw * k, r.sh * k, -w / 2, -h / 2, w, h)
    }
  } else if (L.type === 'fx') {
    drawFx(g, L, dm.w, dm.h, { t: o.t ?? 0, ...(o.full ? { full: true } : {}), scale: o.scale })
  } else if (L.type === 'shape') {
    let fs: string | CanvasGradient = L.fill
    if (L.fill2) {
      const an = ((L.gAng || 0) * Math.PI) / 180
      const dx = (Math.sin(an) * L.w) / 2
      const dy = (-Math.cos(an) * L.h) / 2
      const lg = g.createLinearGradient(-dx, -dy, dx, dy)
      lg.addColorStop(0, L.fill || 'rgba(0,0,0,0)')
      lg.addColorStop(1, L.fill2)
      fs = lg
    }
    shapePath(g, L.kind, L.w, L.h, L.radius)
    g.fillStyle = fs
    g.fill(L.kind === 'ring' ? 'evenodd' : 'nonzero')
    if (L.strokeW > 0) {
      g.lineWidth = L.strokeW
      g.strokeStyle = L.strokeC
      g.stroke()
    }
  } else if (L.type === 'glow') {
    const gw = Math.max(1, Math.abs(dm.w) / 2)
    const gh = Math.max(1, Math.abs(dm.h) / 2)
    const sf = clamp(L.soft == null ? 0.6 : L.soft, 0, 1)
    g.scale(1, gh / gw)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, gw)
    gr.addColorStop(0, rgba(L.color, 1))
    gr.addColorStop(Math.max(0.02, (1 - sf) * 0.7), rgba(L.color, 0.8))
    gr.addColorStop(1, rgba(L.color, 0))
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, gw, 0, Math.PI * 2)
    g.fill()
  } else {
    const tsx = L.tsx || 1
    const tsy = L.tsy || 1
    const b0 = textBox(L)
    const b = { w: b0.w / tsx, h: b0.h / tsy, lines: b0.lines }
    g.scale(tsx, tsy)
    const lh = L.size * (L.lh || 1.1)
    const ax = L.align === 'left' ? -b.w / 2 : L.align === 'right' ? b.w / 2 : 0
    g.font = `${L.weight || 400} ${L.size}px "${L.font}", Archivo, sans-serif`
    try {
      g.letterSpacing = `${L.ls || 0}px`
    } catch {
      // eldre nettlesere
    }
    g.textAlign = L.align || 'center'
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    if (L.shadow > 0) {
      g.shadowColor = 'rgba(0,0,0,0.55)'
      g.shadowBlur = (L.shadow / 100) * L.size * 0.6
      g.shadowOffsetY = (L.shadow / 100) * L.size * 0.08
    }
    b.lines.forEach((s, i) => {
      const y = -b.h / 2 + lh * (i + 0.5)
      if (L.strokeW > 0) {
        g.lineWidth = L.strokeW * 2
        g.strokeStyle = L.strokeC
        g.strokeText(s, ax, y)
      }
      g.fillStyle = L.color
      g.fillText(s, ax, y)
    })
    if (L.bar) {
      const bw = b.w * clamp(L.barW == null ? 1 : +L.barW, 0.05, 3)
      const bh = L.barH == null ? L.size * 0.07 : +L.barH
      const bx = L.align === 'left' ? -b.w / 2 : L.align === 'right' ? b.w / 2 - bw : -bw / 2
      g.fillStyle = L.barColor || L.color
      g.fillRect(bx, b.h / 2 + L.size * 0.18 * (L.barGap == null ? 1 : +L.barGap), bw, bh)
    }
  }
  g.restore()
}

function drawVig(g: G, doc: PdDoc, bl: number) {
  const v = doc.vig
  if (!v) return
  const W = doc.w
  const H = doc.h
  const R = Math.hypot(W, H) / 2
  const sz = clamp(v.size == null ? 0.55 : v.size, 0, 1)
  const rg = g.createRadialGradient(W / 2, H / 2, R * sz * 0.9, W / 2, H / 2, R * 1.02)
  rg.addColorStop(0, rgba(v.color || '#000000', 0))
  rg.addColorStop(1, rgba(v.color || '#000000', clamp(v.amt == null ? 0.6 : v.amt, 0, 1)))
  g.save()
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = rg
  g.fillRect(-bl, -bl, W + 2 * bl, H + 2 * bl)
  g.restore()
}

/** Tegner dokumentet i skala `scale` (bakgrunn, fyll, lag og vignett). */
export function render(g: G, doc: PdDoc, scale: number, M: Media, oIn: RenderOptions = {}): void {
  const o = { ...oIn, scale }
  const bl = o.bleed || 0
  g.save()
  g.setTransform(scale, 0, 0, scale, bl * scale - (o.ox || 0), bl * scale - (o.oy || 0))
  g.clearRect(-bl, -bl, doc.w + 2 * bl, doc.h + 2 * bl)
  if (doc.fill?.mode && doc.fill.mode !== 'none' && !o.transparent) {
    g.save()
    g.translate(-bl, -bl)
    drawFill(g, doc.fill, doc.w + 2 * bl, doc.h + 2 * bl)
    g.restore()
  } else if (doc.bg && !o.transparent) {
    let bf: string | CanvasGradient = doc.bg
    if (doc.bg2) {
      const ba = ((doc.bgAng == null ? 135 : doc.bgAng) * Math.PI) / 180
      const bdx = (Math.sin(ba) * doc.w) / 2
      const bdy = (-Math.cos(ba) * doc.h) / 2
      const bgr = g.createLinearGradient(doc.w / 2 - bdx, doc.h / 2 - bdy, doc.w / 2 + bdx, doc.h / 2 + bdy)
      bgr.addColorStop(0, doc.bg)
      bgr.addColorStop(1, doc.bg2)
      bf = bgr
    }
    g.fillStyle = bf
    g.fillRect(-bl, -bl, doc.w + 2 * bl, doc.h + 2 * bl)
  }
  const vg = !!doc.vig?.on
  let vi = vg ? doc.layers.findIndex((L) => L.type === 'text' && !L.hidden) : -1
  if (vg && (doc.vig?.top || vi < 0)) vi = doc.layers.length
  doc.layers.forEach((L, i) => {
    if (i === vi) drawVig(g, doc, bl)
    if (!L.hidden) drawLayer(g, L, M, o)
  })
  if (vg && vi === doc.layers.length) drawVig(g, doc, bl)
  g.restore()
}

export function toLocal(L: PdLayer, x: number, y: number): [number, number] {
  const a = (-(L.rot || 0) * Math.PI) / 180
  const dx = x - L.x
  const dy = y - L.y
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]
}

/** Laget under punktet. Effektlag treffes bare nær midten (så de ikke stjeler klikk fra lagene under). */
export function hit(doc: Pick<PdDoc, 'layers'>, x: number, y: number): PdLayer | null {
  const pad = 6
  const ls = doc.layers
  for (let i = ls.length - 1; i >= 0; i--) {
    const L = ls[i] as PdLayer
    if (L.hidden || L.locked || L.type !== 'fx') continue
    const d = dims(L)
    const p = toLocal(L, x, y)
    if (Math.abs(p[0]) <= Math.abs(d.w) * 0.12 && Math.abs(p[1]) <= Math.abs(d.h) * 0.12) return L
  }
  for (let i = ls.length - 1; i >= 0; i--) {
    const L = ls[i] as PdLayer
    if (L.hidden || L.type === 'fx') continue
    const d = dims(L)
    const p = toLocal(L, x, y)
    if (Math.abs(p[0]) <= Math.abs(d.w) / 2 + pad && Math.abs(p[1]) <= Math.abs(d.h) / 2 + pad) {
      if (L.locked) continue
      return L
    }
  }
  for (let i = ls.length - 1; i >= 0; i--) {
    const L = ls[i] as PdLayer
    if (L.hidden || L.locked || L.type !== 'fx') continue
    const d = dims(L)
    const p = toLocal(L, x, y)
    if (Math.abs(p[0]) <= Math.abs(d.w) * 0.4 && Math.abs(p[1]) <= Math.abs(d.h) * 0.4) return L
  }
  return null
}

// ---------- trykk-PDF (CMYK, 300 dpi, TrimBox/BleedBox) ----------

async function deflate(u8: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  const s = new Blob([u8 as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(s).arrayBuffer())
}

/** Hver side blir én PDF-side med et CMYK-bilde. Tegnes i bånd så store ark (A3) holder seg under lerretsgrensen. */
export async function printPDF(sides: Side[], doc: PdDoc, M: Media, opt: { bleed?: boolean; onProgress?: (p: number) => void } = {}): Promise<Blob> {
  const bl = opt.bleed ? BLEED : 0
  const mm = mmOf(doc)
  const pt = 72 / 25.4
  const bmm = bl ? BLEED_MM : 0
  const PW = (mm[0] + 2 * bmm) * pt
  const PH = (mm[1] + 2 * bmm) * pt
  const TX = bmm * pt
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const off: number[] = []
  let len = 0
  const push = (x: string | Uint8Array) => {
    const u = typeof x === 'string' ? enc.encode(x) : x
    parts.push(u)
    len += u.length
  }
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    off[n] = len
    push(`${n} 0 obj\n${body}`)
    if (stream) {
      push('\nstream\n')
      push(stream)
      push('\nendstream')
    }
    push('\nendobj\n')
  }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const n = sides.length
  const W = doc.w + 2 * bl
  const H = doc.h + 2 * bl
  const kids: string[] = []
  for (let i = 0; i < n; i++) kids.push(`${3 + i * 3} 0 R`)
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${kids.join(' ')}] >>`)
  for (let s = 0; s < n; s++) {
    const side = sides[s] as Side
    const BH = Math.max(64, Math.min(H, Math.floor(4e6 / W)))
    const c = mk(W, BH)
    const g = ctx(c, { willReadFrequently: true })
    const cm = new Uint8Array(W * H * 4)
    const sd: PdDoc = { ...doc, layers: side.layers, bg: side.bg }
    for (let y0 = 0; y0 < H; y0 += BH) {
      const bh = Math.min(BH, H - y0)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = '#ffffff'
      g.fillRect(0, 0, W, BH)
      render(g, sd, 1, M, { full: true, noPh: true, bleed: bl, oy: y0 })
      g.setTransform(1, 0, 0, 1, 0, 0)
      await new Promise((r) => setTimeout(r, 0))
      const px = g.getImageData(0, 0, W, bh).data
      for (let p = 0, q = y0 * W * 4; p < px.length; p += 4, q += 4) {
        const a = (px[p + 3] ?? 255) / 255
        const r = ((px[p] ?? 0) * a + 255 * (1 - a)) / 255
        const gg = ((px[p + 1] ?? 0) * a + 255 * (1 - a)) / 255
        const b = ((px[p + 2] ?? 0) * a + 255 * (1 - a)) / 255
        const k = 1 - Math.max(r, gg, b)
        const dd = k < 1 ? 1 - k : 1
        cm[q] = Math.round(((1 - r - k) / dd) * 255)
        cm[q + 1] = Math.round(((1 - gg - k) / dd) * 255)
        cm[q + 2] = Math.round(((1 - b - k) / dd) * 255)
        cm[q + 3] = Math.round(k * 255)
      }
      opt.onProgress?.((s + ((y0 + bh) / H) * 0.9) / n)
    }
    const z = await deflate(cm)
    const data = z ?? cm
    const base = 3 + s * 3
    const trim = `[${[TX, TX, PW - TX, PH - TX].map((v) => v.toFixed(2)).join(' ')}]`
    const box = `[0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}]`
    obj(base, `<< /Type /Page /Parent 2 0 R /MediaBox ${box} /BleedBox ${box} /TrimBox ${trim} /Resources << /XObject << /Im${s} ${base + 1} 0 R >> >> /Contents ${base + 2} 0 R >>`)
    obj(base + 1, `<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceCMYK /BitsPerComponent 8${z ? ' /Filter /FlateDecode' : ''} /Length ${data.length} >>`, data)
    const cs = `q ${PW.toFixed(2)} 0 0 ${PH.toFixed(2)} 0 0 cm /Im${s} Do Q`
    obj(base + 2, `<< /Length ${cs.length} >>`, enc.encode(cs))
    opt.onProgress?.((s + 1) / n)
  }
  const total = 3 + n * 3
  const xref = len
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let j = 1; j < total; j++) x += `${('000000000' + (off[j] ?? 0)).slice(-10)} 00000 n \n`
  push(`${x}trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
