import { rgba } from './colors'
import type { ImageCache, LoadedImage } from './images'
import { H, W, type Background, type Doc, type GlowLayer, type ImageLayer, type Layer, type ShapeLayer, type TextLayer, type Vignette } from './model'
import { BULLETS, listItem } from './text-list'

/**
 * Tegning av et dokument på et lerret (samme resultat som dagens app). `s` = skala fra 1920 × 1080,
 * `edit` = vis plassholdere for tomme bildefelt, `transparent` = uten bakgrunn og vignett.
 */
type G = CanvasRenderingContext2D
export interface RenderOptions { s?: number; edit?: boolean; transparent?: boolean; placeholder?: (role: string | null) => string }

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const ctx = (c: HTMLCanvasElement): G => {
  const g = c.getContext('2d')
  if (!g) throw new Error('Lerretet kan ikke tegnes (2D er ikke tilgjengelig).')
  return g
}

function shapePath(g: G, kindIn: string, w: number, h: number, rIn: number) {
  let kind = kindIn
  let r = rIn
  g.beginPath()
  if (kind === 'line') {
    kind = r > 0 ? 'rounded' : 'rect'
    r = h / 2
  }
  if (kind === 'ellipse') g.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2)
  else if (kind === 'rounded') {
    r = Math.max(0, Math.min(r, w / 2, h / 2))
    g.moveTo(r, 0)
    g.arcTo(w, 0, w, h, r)
    g.arcTo(w, h, 0, h, r)
    g.arcTo(0, h, 0, 0, r)
    g.arcTo(0, 0, w, 0, r)
    g.closePath()
  } else g.rect(0, 0, w, h)
}

function linGrad(g: G, c1: string, c2: string, ang: number, w: number, h: number): CanvasGradient {
  const a = ((ang - 90) * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const len = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy)
  const gr = g.createLinearGradient(w / 2 - dx * len, h / 2 - dy * len, w / 2 + dx * len, h / 2 + dy * len)
  gr.addColorStop(0, c1)
  gr.addColorStop(1, c2)
  return gr
}

function shadow(g: G, l: Layer, s: number) {
  if (!(l.shadow > 0)) return
  g.shadowColor = `rgba(0,0,0,${(0.25 + 0.5 * l.shadow).toFixed(2)})`
  g.shadowBlur = 90 * l.shadow * s
  g.shadowOffsetY = 24 * l.shadow * s
}

interface Crop { cL?: number; cT?: number; cR?: number; cB?: number }

function drawFit(g: G, im: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number }, bw: number, bh: number, fit: string, zoom: number, px: number, py: number, flip?: boolean, cr?: Crop) {
  const nw = im.naturalWidth || im.width
  const nh = im.naturalHeight || im.height
  if (!nw || !nh) return
  const c = (v: number | undefined) => Math.max(0, Math.min(0.95, +(v ?? 0) || 0))
  const cl = cr ? c(cr.cL) : 0
  const ct = cr ? c(cr.cT) : 0
  let crr = cr ? c(cr.cR) : 0
  let cb = cr ? c(cr.cB) : 0
  if (cl + crr > 0.95) crr = 0.95 - cl
  if (ct + cb > 0.95) cb = 0.95 - ct
  const sx = nw * cl
  const sy = nh * ct
  const iw = nw * (1 - cl - crr)
  const ih = nh * (1 - ct - cb)
  if (iw < 1 || ih < 1) return
  const sc = (fit === 'contain' ? Math.min(bw / iw, bh / ih) : Math.max(bw / iw, bh / ih)) * (zoom || 1)
  const dw = iw * sc
  const dh = ih * sc
  const dx = (bw - dw) * px
  const dy = (bh - dh) * py
  if (flip) {
    g.save()
    g.translate(dx + dw, dy)
    g.scale(-1, 1)
    g.drawImage(im, sx, sy, iw, ih, 0, 0, dw, dh)
    g.restore()
  } else g.drawImage(im, sx, sy, iw, ih, dx, dy, dw, dh)
}

function blurred(im: HTMLCanvasElement, amt: number): HTMLCanvasElement {
  const f = 1 + amt * 0.5
  const c = canvas(Math.max(8, Math.round(W / f)), Math.max(8, Math.round(H / f)))
  const g = ctx(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(im, 0, 0, c.width, c.height)
  const c2 = canvas(Math.max(4, Math.round(c.width / 2)), Math.max(4, Math.round(c.height / 2)))
  ctx(c2).drawImage(c, 0, 0, c2.width, c2.height)
  g.clearRect(0, 0, c.width, c.height)
  g.drawImage(c2, 0, 0, c.width, c.height)
  return c
}

/** Tekstoppsett for ett tekstlag ved en gitt størrelse. */
export interface TextLayout {
  size: number
  lines: string[]
  segs: { x: number; mk: string; mx: number }[]
  widths: number[]
  cap: number
  lh: number
  hBlock: number
  gap: number
  ls: number
  total: number
  max: number
}

function tlayout(g: G, l: TextLayer, size: number): TextLayout {
  g.font = `${l.weight} ${size}px "${l.font}"`
  let txt = String(l.text || '')
  if (l.upper) txt = txt.toLocaleUpperCase('nb-NO')
  const ls = (l.ls || 0) * size
  const meas = (t: string) => g.measureText(t).width + ls * Math.max(0, Array.from(t).length - 1)
  const lines: string[] = []
  const segs: TextLayout['segs'] = []
  const ind = size * 1.0
  let cnt = [0, 0, 0, 0]
  for (const para of txt.split('\n')) {
    const it = listItem(para, l.list)
    let off = 0
    let mk = ''
    let mx = 0
    let body = para
    if (it) {
      for (let k = it.lvl + 1; k < 4; k++) cnt[k] = 0
      if (it.num) {
        cnt[it.lvl] = (cnt[it.lvl] ?? 0) + 1
        const n = cnt[it.lvl] ?? 1
        mk = (it.lvl === 1 ? String.fromCharCode(97 + ((n - 1) % 26)) : String(n)) + '.'
        if (l.upper) mk = mk.toUpperCase()
      } else mk = BULLETS[it.lvl] ?? '•'
      mx = it.lvl * ind
      off = mx + Math.max(meas(mk), size * 0.5) + size * 0.4
      body = it.body
    } else if (para.trim()) cnt = [0, 0, 0, 0]
    const avail = Math.max(size, l.w - off)
    let cur = ''
    let first = true
    const push = (t: string) => {
      lines.push(t)
      segs.push({ x: off, mk: first ? mk : '', mx })
      first = false
    }
    for (const w of body.split(' ')) {
      const t = cur ? cur + ' ' + w : w
      if (!cur || meas(t) <= avail) cur = t
      else {
        push(cur)
        cur = w
      }
    }
    push(cur)
  }
  const widths = lines.map((t, i) => meas(t) + (segs[i]?.x ?? 0))
  const m = g.measureText('H')
  const cap = m.actualBoundingBoxAscent || size * 0.7
  const lh = size * l.lh
  const hBlock = cap + (lines.length - 1) * lh + (l.upper ? 0 : size * 0.22)
  const gap = size * 0.12
  return { size, lines, segs, widths, cap, lh, hBlock, gap, ls, total: hBlock + (l.bar ? gap + l.barH : 0), max: Math.max(0, ...widths) }
}

/** Største størrelse (≤ valgt) som får teksten til å passe i boksen når «Tilpass til boksen» er på. */
function tfit(g: G, l: TextLayer): TextLayout {
  const r = tlayout(g, l, l.size)
  if (!l.fit || (r.max <= l.w + 0.5 && r.total <= l.h + 0.5)) return r
  let lo = 6
  let hi = l.size
  let best: TextLayout | null = null
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2
    const t = tlayout(g, l, m)
    if (t.max <= l.w + 0.5 && t.total <= l.h + 0.5) {
      best = t
      lo = m
    } else hi = m
  }
  return best ?? tlayout(g, l, 6)
}

function barRect(l: TextLayer, r: TextLayout, top: number) {
  const bw = r.max * Math.max(0.05, Math.min(3, l.barW == null ? 1 : +l.barW))
  const bx = l.align === 'center' ? (l.w - bw) / 2 : l.align === 'right' ? l.w - bw : 0
  return { x: bx, y: top + r.hBlock + r.gap * Math.max(0, l.barGap == null ? 1 : +l.barGap), w: bw, h: l.barH }
}

const textTop = (l: TextLayer, r: TextLayout) => (l.valign === 'middle' ? (l.h - r.total) / 2 : l.valign === 'bottom' ? l.h - r.total : 0)

function drawText(g: G, l: TextLayer, s: number) {
  if (!String(l.text || '').trim()) return
  const r = tfit(g, l)
  g.font = `${l.weight} ${r.size}px "${l.font}"`
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  const top = textTop(l, r)
  shadow(g, l, s)
  g.fillStyle = l.color
  const put = (t: string, x0: number, y: number) => {
    if (!r.ls) {
      g.fillText(t, x0, y)
      return
    }
    let x = x0
    for (const ch of Array.from(t)) {
      g.fillText(ch, x, y)
      x += g.measureText(ch).width + r.ls
    }
  }
  r.lines.forEach((line, i) => {
    const sg = r.segs[i] ?? { x: 0, mk: '', mx: 0 }
    const lw = r.widths[i] ?? 0
    const x0 = l.align === 'center' ? (l.w - lw) / 2 : l.align === 'right' ? l.w - lw : 0
    const y = top + r.cap + i * r.lh
    if (sg.mk) put(sg.mk, x0 + sg.mx, y)
    put(line, x0 + sg.x, y)
  })
  if (l.bar) {
    const bb = barRect(l, r, top)
    g.fillStyle = l.barColor
    g.fillRect(bb.x, bb.y, bb.w, bb.h)
  }
}

let measureCtx: G | null = null
const mc = (): G => (measureCtx ??= ctx(canvas(4, 4)))

/** Tekststørrelsen som faktisk vises (mindre enn valgt når teksten må krympes for å passe). */
export function fitSize(l: Layer | null | undefined): number {
  if (!l || l.type !== 'text') return 0
  if (!String(l.text || '').trim()) return l.size
  return tfit(mc(), l).size
}

/** Understrekens plassering i bildet (for «Koble fra teksten»). */
export function barBox(l: Layer | null | undefined): { x: number; y: number; w: number; h: number; rot: number } | null {
  if (!l || l.type !== 'text' || !l.bar) return null
  const r = tfit(mc(), l)
  const b = barRect(l, r, textTop(l, r))
  const a = ((l.rot || 0) * Math.PI) / 180
  const cx = b.x + b.w / 2 - l.w / 2
  const cy = b.y + b.h / 2 - l.h / 2
  const wx = l.x + l.w / 2 + cx * Math.cos(a) - cy * Math.sin(a)
  const wy = l.y + l.h / 2 + cx * Math.sin(a) + cy * Math.cos(a)
  return { x: Math.round(wx - b.w / 2), y: Math.round(wy - b.h / 2), w: Math.round(b.w), h: Math.max(1, Math.round(b.h)), rot: l.rot || 0 }
}

/** Tegner bakgrunn, vignett og lag. */
export class Renderer {
  private blurCache: { key: string; c: HTMLCanvasElement | null } = { key: '', c: null }

  private images: ImageCache

  constructor(images: ImageCache) {
    this.images = images
  }

  private drawBg(g: G, b: Background, o: RenderOptions) {
    g.fillStyle = '#000000'
    g.fillRect(0, 0, W, H)
    if (b.type === 'gradient') {
      if (b.radial) {
        const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2)
        r.addColorStop(0, b.c1)
        r.addColorStop(1, b.c2)
        g.fillStyle = r
      } else g.fillStyle = linGrad(g, b.c1, b.c2, b.angle, W, H)
      g.fillRect(0, 0, W, H)
    } else if (b.type === 'image') {
      const e = this.images.get(b.src)
      if (e) {
        if (b.blur > 0) {
          const key = `${e.url}|${b.blur}|${b.zoom}|${b.px}|${b.py}`
          if (this.blurCache.key !== key) {
            const tmp = canvas(W, H)
            drawFit(ctx(tmp), e.img, W, H, 'cover', b.zoom, b.px, b.py)
            this.blurCache = { key, c: blurred(tmp, b.blur) }
          }
          if (this.blurCache.c) g.drawImage(this.blurCache.c, 0, 0, W, H)
        } else drawFit(g, e.img, W, H, 'cover', b.zoom, b.px, b.py)
        if (b.dim > 0) {
          g.fillStyle = `rgba(0,0,0,${b.dim})`
          g.fillRect(0, 0, W, H)
        }
      } else if (o.edit) {
        g.fillStyle = '#1a1a1a'
        g.fillRect(0, 0, W, H)
      }
    } else {
      g.fillStyle = b.color
      g.fillRect(0, 0, W, H)
    }
  }

  private drawVig(g: G, v: Vignette) {
    g.save()
    g.translate(W / 2, H / 2)
    g.scale(1, H / W)
    const R = W * 0.74
    const inner = R * (0.12 + 0.62 * v.size)
    const gr = g.createRadialGradient(0, 0, inner, 0, 0, R)
    gr.addColorStop(0, rgba(v.color, 0))
    gr.addColorStop(0.5, rgba(v.color, Math.min(1, v.amt) * 0.45))
    gr.addColorStop(1, rgba(v.color, Math.min(1, v.amt)))
    g.fillStyle = gr
    g.fillRect(-W / 2, -W / 2, W, W)
    g.restore()
  }

  private drawImage(g: G, l: ImageLayer, o: RenderOptions, s: number) {
    const e: LoadedImage | null = this.images.get(l.src)
    if (!e) {
      if (!o.edit || (l.src && !this.images.failed(l.src) && l.src.startsWith('asset:'))) return
      shapePath(g, l.shape, l.w, l.h, l.radius)
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.fill()
      g.setLineDash([18, 14])
      g.lineWidth = 4
      g.strokeStyle = 'rgba(255,255,255,0.35)'
      g.stroke()
      g.setLineDash([])
      g.save()
      g.beginPath()
      g.rect(Math.max(0, -l.x), Math.max(0, -l.y), Math.min(l.w, W - l.x) - Math.max(0, -l.x), Math.min(l.h, H - l.y) - Math.max(0, -l.y))
      g.clip()
      const vx = (Math.max(0, -l.x) + Math.min(l.w, W - l.x)) / 2
      const vy = (Math.max(0, -l.y) + Math.min(l.h, H - l.y)) / 2
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.font = '600 44px Archivo, Helvetica, Arial, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(o.placeholder ? o.placeholder(l.role) : l.role === 'person' ? 'Legg til person' : 'Legg til bilde', vx, vy)
      g.restore()
      return
    }
    const im = l.tint ? this.images.tinted(e, l.tint) : e.img
    const clip = l.shape !== 'rect' || l.fit === 'cover' || l.zoom > 1 || l.border > 0
    if (clip) {
      if (l.shadow > 0) {
        g.save()
        shadow(g, l, s)
        shapePath(g, l.shape, l.w, l.h, l.radius)
        g.fillStyle = '#000'
        g.fill()
        g.restore()
      }
      g.save()
      shapePath(g, l.shape, l.w, l.h, l.radius)
      g.clip()
      drawFit(g, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l)
      if (l.border > 0) {
        g.lineWidth = l.border * 2
        g.strokeStyle = l.borderColor
        shapePath(g, l.shape, l.w, l.h, l.radius)
        g.stroke()
      }
      g.restore()
    } else {
      g.save()
      shadow(g, l, s)
      drawFit(g, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l)
      g.restore()
    }
  }

  private drawShape(g: G, l: ShapeLayer, s: number) {
    shapePath(g, l.kind, l.w, l.h, l.radius)
    g.fillStyle = l.fill2 ? linGrad(g, l.fill, l.fill2, l.angle, l.w, l.h) : l.fill
    g.save()
    shadow(g, l, s)
    g.fill()
    g.restore()
    if (l.stroke > 0) {
      g.save()
      shapePath(g, l.kind, l.w, l.h, l.radius)
      g.clip()
      g.lineWidth = l.stroke * 2
      g.strokeStyle = l.strokeColor
      shapePath(g, l.kind, l.w, l.h, l.radius)
      g.stroke()
      g.restore()
    }
  }

  private drawGlow(g: G, l: GlowLayer) {
    g.globalCompositeOperation = 'screen'
    g.translate(l.w / 2, l.h / 2)
    g.scale(1, l.h / Math.max(1, l.w))
    const R = l.w / 2
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, R)
    gr.addColorStop(0, rgba(l.color, 1))
    gr.addColorStop(Math.max(0.02, Math.min(0.9, (1 - l.soft) * 0.7)), rgba(l.color, 0.8))
    gr.addColorStop(1, rgba(l.color, 0))
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, R, 0, Math.PI * 2)
    g.fill()
  }

  render(g: G, doc: Doc, o: RenderOptions = {}) {
    const s = o.s ?? 1
    g.save()
    g.setTransform(s, 0, 0, s, 0, 0)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    if (!o.transparent) this.drawBg(g, doc.bg, o)
    if (!o.transparent && doc.vig.on && !doc.vig.top) this.drawVig(g, doc.vig)
    for (const l of doc.layers) {
      if (l.hidden || l.w < 1 || l.h < 1) continue
      g.save()
      g.globalAlpha = Math.max(0, Math.min(1, l.op))
      g.translate(l.x + l.w / 2, l.y + l.h / 2)
      g.rotate(((l.rot || 0) * Math.PI) / 180)
      if (l.flipX || l.flipY) g.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1)
      g.translate(-l.w / 2, -l.h / 2)
      if (l.type === 'text') drawText(g, l, s)
      else if (l.type === 'image') this.drawImage(g, l, o, s)
      else if (l.type === 'shape') this.drawShape(g, l, s)
      else this.drawGlow(g, l)
      g.restore()
    }
    if (!o.transparent && doc.vig.on && doc.vig.top) this.drawVig(g, doc.vig)
    g.restore()
  }

  /** Venter på fonter og bilder, og tegner i full oppløsning (scale 1 = 1080p, 2 = 4K). */
  async toCanvas(doc: Doc, scale: number, opt: { transparent?: boolean } = {}): Promise<HTMLCanvasElement> {
    await ensureFonts(doc)
    await this.images.loadAll(doc)
    const c = canvas(Math.round(W * scale), Math.round(H * scale))
    this.render(ctx(c), doc, { s: scale, edit: false, transparent: !!opt.transparent })
    return c
  }

  async exportBlob(doc: Doc, scale: number, type: string, opt: { transparent?: boolean } = {}): Promise<Blob | null> {
    const c = await this.toCanvas(doc, scale, opt)
    return new Promise((res) => c.toBlob(res, type, 0.95))
  }

  /** Liten JPEG-skisse (data-URL) for mallister og «Ny mal». */
  async snapshot(doc: Doc, w = 480, edit = false, placeholder?: RenderOptions['placeholder']): Promise<string> {
    await ensureFonts(doc)
    await this.images.loadAll(doc)
    const s = w / W
    const c = canvas(Math.round(W * s), Math.round(H * s))
    this.render(ctx(c), doc, { s, edit, ...(placeholder ? { placeholder } : {}) })
    return c.toDataURL('image/jpeg', 0.82)
  }

  /** Gjennomsiktige kanter i bildet som beskjæring (andel av bredde/høyde), eller null. */
  alphaBox(src: string | null): { cL: number; cT: number; cR: number; cB: number } | null {
    const e = this.images.get(src)
    if (!e) return null
    const nw = e.img.naturalWidth
    const nh = e.img.naturalHeight
    const k = Math.min(1, 500 / Math.max(nw, nh))
    const w = Math.max(1, Math.round(nw * k))
    const h = Math.max(1, Math.round(nh * k))
    const g = ctx(canvas(w, h))
    g.drawImage(e.img, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let x0 = w
    let y0 = h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((d[(y * w + x) * 4 + 3] ?? 0) > 16) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 < 0) return null
    const p = 0.005
    const r = { cL: Math.max(0, x0 / w - p), cT: Math.max(0, y0 / h - p), cR: Math.max(0, 1 - (x1 + 1) / w - p), cB: Math.max(0, 1 - (y1 + 1) / h - p) }
    return r.cL + r.cT + r.cR + r.cB < 0.01 ? null : r
  }
}

/** Laster fontene tekstlagene bruker (også æ, ø og å). */
export function ensureFonts(doc: Doc): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  const seen = new Set<string>()
  const ps: Promise<unknown>[] = []
  for (const l of doc.layers) {
    if (l.type !== 'text') continue
    const k = `${l.weight} 100px "${l.font}"`
    if (seen.has(k)) continue
    seen.add(k)
    ps.push(document.fonts.load(k, 'ÆØÅ Hg').catch(() => undefined))
  }
  return Promise.all(ps)
}

/** Øverste synlige, ulåste lag under punktet (i 1920 × 1080-koordinater). */
export function hit(layers: readonly Layer[], p: { x: number; y: number }): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (!l || l.hidden || l.lock) continue
    const a = (-(l.rot || 0) * Math.PI) / 180
    const dx = p.x - (l.x + l.w / 2)
    const dy = p.y - (l.y + l.h / 2)
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    const isE = (l.type === 'image' && l.shape === 'ellipse') || (l.type === 'shape' && l.kind === 'ellipse')
    const hw = Math.max(l.w, 28) / 2
    const hh = Math.max(l.h, 28) / 2
    if (isE ? (lx * lx) / (hw * hw) + (ly * ly) / (hh * hh) <= 1 : Math.abs(lx) <= hw && Math.abs(ly) <= hh) return l
  }
  return null
}
