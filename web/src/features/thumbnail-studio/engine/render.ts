import { rgba } from './colors'
import { loadFonts, loadStretch, stretchFamily, stretchReady } from '../../../shared/fonts/loader'
import { fillPaint } from './paint'
import { drawQr } from '../../../shared/qr/qr'
import { castShadows, cornersPath } from '../../../shared/render/outline'
import { adjustImage } from '../../photo-design/engine/render'
import { advActive, type AdvAdj } from '../../../shared/image/AdvAdjust'
import type { ImageCache, LoadedImage } from './images'
import { H, W, type Background, type Doc, type GlowLayer, type ImageLayer, type Layer, type ShapeLayer, type TextLayer, type Vignette } from './model'
import { BULLETS, listItem } from './text-list'
import { activeFilters, blurScale, drawOverlays, loadGrain, pixelFilter, REF_W } from './filters'

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

/** Omrisset til et bilde- eller formlag som sti: egne hjørner (`radii`) eller de faste formene som før. `inf` = utvidelse. */
function outline(l: ImageLayer | ShapeLayer, inf = 0, into?: Path2D): Path2D {
  const p = into ?? new Path2D()
  const x = -inf
  const y = -inf
  const w = Math.max(0, l.w + 2 * inf)
  const h = Math.max(0, l.h + 2 * inf)
  if (l.radii?.length === 8) {
    cornersPath(p, x, y, w, h, l.radii.map((n) => (n > 0 ? Math.max(0, n + inf) : 0)))
    return p
  }
  let kind: string = l.type === 'image' ? l.shape : l.kind === 'path' ? 'rect' : l.kind
  let r = l.radius + inf
  if (kind === 'line') {
    kind = l.radius > 0 ? 'rounded' : 'rect'
    r = h / 2
  }
  if (kind === 'ellipse') p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  else if (kind === 'rounded') {
    r = Math.max(0, Math.min(r, w / 2, h / 2))
    p.moveTo(x + r, y)
    p.arcTo(x + w, y, x + w, y + h, r)
    p.arcTo(x + w, y + h, x, y + h, r)
    p.arcTo(x, y + h, x, y, r)
    p.arcTo(x, y, x + w, y, r)
    p.closePath()
  } else p.rect(x, y, w, h)
  return p
}

const paths = new Map<string, Path2D>()
/** Fri form (SVG-sti) strukket over laget. */
function pathOf(l: ShapeLayer): Path2D | null {
  const p = l.path
  if (l.kind !== 'path' || !p?.d || typeof Path2D === 'undefined') return null
  let base = paths.get(p.d)
  if (!base) {
    if (paths.size > 200) paths.clear()
    base = new Path2D(p.d)
    paths.set(p.d, base)
  }
  const out = new Path2D()
  out.addPath(base, new DOMMatrix().scale(l.w / (p.vw || 1), l.h / (p.vh || 1)))
  return out
}

/** Klipper til lagets polygon (CSS clip-path: polygon), i andeler av laget. */
function clipPoly(g: G, l: Layer) {
  const p = 'poly' in l ? l.poly : null
  if (!p || p.length < 6) return
  g.beginPath()
  for (let i = 0; i + 1 < p.length; i += 2) {
    const x = (p[i] ?? 0) * l.w
    const y = (p[i + 1] ?? 0) * l.h
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.closePath()
  g.clip()
}

/** Innvendige skygger (CSS inset): skyggen av en ramme rundt formen, klippet til formen. */
function insetShadows(g: G, l: ImageLayer | ShapeLayer) {
  if (!l.shadows?.some((x) => x.inset)) return
  g.save()
  g.clip(outline(l))
  castShadows(g, l.shadows, true, (sh) => {
    const p = new Path2D()
    p.rect(-l.w * 4, -l.h * 4, l.w * 9, l.h * 9)
    outline(l, -(sh.s ?? 0), p)
    g.fillStyle = '#000'
    g.fill(p, 'evenodd')
  })
  g.restore()
}

const sc = (g: G) => {
  const m = g.getTransform()
  return Math.hypot(m.a, m.b) || 1
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

/** Canvas-fonten for et tekstlag (kursiv og bredde bare når laget har dem; ellers som før). */
export function fontOf(l: TextLayer, size: number): string {
  // bredden bare når den er lastet (ellers fonten i vanlig bredde, aldri en reservefont)
  const fam = stretchReady(l.font, l.stretch) ? stretchFamily(l.font, l.stretch) : l.font
  return `${l.italic ? 'italic ' : ''}${l.weight} ${size}px "${fam}"`
}

function tlayout(g: G, l: TextLayer, size: number): TextLayout {
  g.font = fontOf(l, size)
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

/** Canvas letterSpacing (Chrome 99+, Safari 17+, Firefox 115+). */
const HAS_LS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype

function drawText(g: G, l: TextLayer, s: number, img: HTMLImageElement | null = null) {
  if (!String(l.text || '').trim()) return
  // loddrett skalert tekst: tegnes i et strukket rom med samme bredde
  const sy = l.sy && l.sy > 0 && l.sy !== 1 ? l.sy : 1
  if (sy !== 1) {
    g.save()
    g.scale(1, sy)
    drawText(g, { ...l, h: l.h / sy, sy: 1 }, s, img)
    g.restore()
    return
  }
  const r = tfit(g, l)
  g.font = fontOf(l, r.size)
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  const top = textTop(l, r)
  // hele teksten med én tegneoperasjon (fyll eller kontur) i en gitt kontekst
  const each = (gg: G, op: 'fill' | 'stroke') => {
    const put = (t: string, x0: number, y: number) => {
      if (!r.ls) {
        if (op === 'fill') gg.fillText(t, x0, y)
        else gg.strokeText(t, x0, y)
        return
      }
      // sperring med kerning som i CSS (canvas letterSpacing); eldre nettlesere: én bokstav om gangen som før
      if (HAS_LS) {
        gg.letterSpacing = `${r.ls}px`
        if (op === 'fill') gg.fillText(t, x0, y)
        else gg.strokeText(t, x0, y)
        gg.letterSpacing = '0px'
        return
      }
      let x = x0
      for (const ch of Array.from(t)) {
        if (op === 'fill') gg.fillText(ch, x, y)
        else gg.strokeText(ch, x, y)
        x += gg.measureText(ch).width + r.ls
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
  }
  // tekstskygger (CSS text-shadow), under teksten
  castShadows(g, l.shadows, false, () => {
    g.fillStyle = '#000'
    each(g, 'fill')
    if ((l.stroke ?? 0) > 0) {
      g.strokeStyle = '#000'
      g.lineWidth = l.stroke ?? 0
      each(g, 'stroke')
    }
  })
  if (l.paint?.length || img) {
    // gradient eller bilde i bokstavene (CSS background-clip: text): teksten som maske for malingen
    const k = sc(g)
    const M = r.size
    const cw = Math.max(1, Math.min(8192, Math.ceil((l.w + 2 * M) * k)))
    const chh = Math.max(1, Math.min(8192, Math.ceil((l.h + 2 * M) * k)))
    const t = canvas(cw, chh)
    const tg = ctx(t)
    tg.setTransform(cw / (l.w + 2 * M), 0, 0, chh / (l.h + 2 * M), 0, 0)
    tg.translate(M, M)
    tg.font = g.font
    tg.textBaseline = 'alphabetic'
    tg.fillStyle = '#000'
    each(tg, 'fill')
    // malingslagene settes sammen først (vanlig stabling), så legges de inn i bokstavene
    const pc = canvas(cw, chh)
    const pg = ctx(pc)
    pg.setTransform(cw / (l.w + 2 * M), 0, 0, chh / (l.h + 2 * M), 0, 0)
    pg.translate(M, M)
    pg.beginPath()
    pg.rect(0, 0, l.w, l.h)
    pg.clip()
    // bildet dekker tekstboksen (som et bildelag med «Fyll formen»); uten bilde: malingen
    if (img) drawFit(pg, img, l.w, l.h, 'cover', 1, 0.5, 0.5)
    else fillPaint(pg, l.paint, l.w, l.h, k)
    tg.setTransform(1, 0, 0, 1, 0, 0)
    tg.globalCompositeOperation = 'source-in'
    tg.drawImage(pc, 0, 0)
    g.save()
    shadow(g, l, s)
    g.drawImage(t, -M, -M, l.w + 2 * M, l.h + 2 * M)
    g.restore()
  } else {
    g.save()
    shadow(g, l, s)
    g.fillStyle = l.color
    each(g, 'fill')
    g.restore()
  }
  if ((l.stroke ?? 0) > 0) {
    g.save()
    g.strokeStyle = l.strokeColor || '#000000'
    g.lineWidth = l.stroke ?? 0
    g.lineJoin = 'round'
    each(g, 'stroke')
    g.restore()
  }
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
      const ol = outline(l)
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.fill(ol)
      g.setLineDash([18, 14])
      g.lineWidth = 4
      g.strokeStyle = 'rgba(255,255,255,0.35)'
      g.stroke(ol)
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
    // avanserte justeringer (Avansert modus) tegnes med Photo-motoren; uten dem tegnes bildet nøyaktig som før
    const im = l.tint ? this.images.tinted(e, l.tint) : advActive(l.adj) ? (adjustImage(e.img, l.adj as AdvAdj) ?? e.img) : e.img
    const clip = l.shape !== 'rect' || l.fit === 'cover' || l.zoom > 1 || l.border > 0 || l.radii?.length === 8
    castShadows(g, l.shadows, false, (sh) => {
      g.fillStyle = '#000'
      g.fill(outline(l, sh.s ?? 0))
    })
    if (clip) {
      if (l.shadow > 0) {
        g.save()
        shadow(g, l, s)
        g.fillStyle = '#000'
        g.fill(outline(l))
        g.restore()
      }
      g.save()
      g.clip(outline(l))
      if (l.fill) {
        g.fillStyle = l.fill
        g.fillRect(0, 0, l.w, l.h)
      }
      drawPic(g, im, l, s)
      if (l.border > 0) {
        g.lineWidth = l.border * 2
        g.strokeStyle = l.borderColor
        g.stroke(outline(l))
      }
      g.restore()
      insetShadows(g, l)
    } else {
      g.save()
      shadow(g, l, s)
      if (l.fill) {
        g.fillStyle = l.fill
        g.fillRect(0, 0, l.w, l.h)
        g.shadowColor = 'transparent'
      }
      drawPic(g, im, l, s)
      g.restore()
    }
  }

  private drawShape(g: G, l: ShapeLayer, s: number, edit = false) {
    // QR-kode: skarpe moduler i lagets størrelse (plassholder i redigering til innholdet er skrevet)
    if (l.kind === 'qr') {
      drawQr(g, l.qr, 0, 0, l.w, l.h, edit)
      return
    }
    const p2 = pathOf(l)
    const ol = p2 ?? outline(l)
    const rule = l.path?.fillRule ?? 'nonzero'
    // ytre skygger (CSS box-shadow)
    castShadows(g, l.shadows, false, (sh) => {
      g.fillStyle = '#000'
      if (p2) g.fill(p2, rule)
      else g.fill(outline(l, sh.s ?? 0))
    })
    g.fillStyle = l.fill2 ? linGrad(g, l.fill, l.fill2, l.angle, l.w, l.h) : l.fill
    g.save()
    shadow(g, l, s)
    g.fill(ol, rule)
    g.restore()
    if (l.paint?.length) {
      g.save()
      g.clip(ol, rule)
      fillPaint(g, l.paint, l.w, l.h, sc(g))
      g.restore()
    }
    if (!p2) insetShadows(g, l)
    if (p2) {
      if (l.stroke > 0) {
        g.save()
        g.lineWidth = l.stroke
        g.strokeStyle = l.strokeColor
        g.setLineDash(l.dash ?? [])
        g.stroke(p2)
        g.restore()
      }
      return
    }
    const sd = l.sides?.length === 4 ? l.sides : null
    if (sd) {
      // kant bare på noen sider (CSS border-top/right/bottom/left), innenfor formen
      g.save()
      g.clip(ol)
      g.strokeStyle = l.strokeColor
      g.fillStyle = l.strokeColor
      const [t = 0, rr = 0, bb = 0, ll = 0] = sd
      const lines: [number, number, number, number, number][] = [[0, t / 2, l.w, t / 2, t], [l.w - rr / 2, 0, l.w - rr / 2, l.h, rr], [0, l.h - bb / 2, l.w, l.h - bb / 2, bb], [ll / 2, 0, ll / 2, l.h, ll]]
      for (const [x1, y1, x2, y2, wd] of lines) {
        if (!(wd > 0)) continue
        g.beginPath()
        g.setLineDash(l.dash?.length ? l.dash : [])
        g.lineWidth = wd
        g.moveTo(x1, y1)
        g.lineTo(x2, y2)
        g.stroke()
      }
      g.restore()
    } else if (l.stroke > 0) {
      g.save()
      g.clip(ol)
      g.lineWidth = l.stroke * 2
      g.strokeStyle = l.strokeColor
      if (l.dash?.length) g.setLineDash(l.dash.map((n) => n))
      g.stroke(ol)
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
      if (l.blend && BLENDS.has(l.blend)) g.globalCompositeOperation = l.blend as GlobalCompositeOperation
      clipPoly(g, l)
      if ((l.blur ?? 0) > 0 && l.type !== 'image') g.filter = `blur(${((l.blur ?? 0) * s).toFixed(2)}px)`
      if (l.type === 'text') drawText(g, l, s, l.fillSrc ? (this.images.get(l.fillSrc)?.img ?? null) : null)
      else if (l.type === 'image') this.drawImage(g, l, o, s)
      else if (l.type === 'shape') this.drawShape(g, l, s, !!o.edit)
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

/** Blandemodusene et lag kan ha (CSS mix-blend-mode med samme navn i canvas). */
export const BLENDS: ReadonlySet<string> = new Set(['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'])

/** Laster fontene tekstlagene bruker (også æ, ø og å). */
export function ensureFonts(doc: Doc): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  // fonter fra biblioteket: stilarket hentes først (loadFonts), så tegning og eksport bruker riktig font
  // og kornruten til filtrene (F10 Korn, F13 Papir), så eksporten får kornet med
  const texts = doc.layers.filter((l): l is TextLayer => l.type === 'text')
  return Promise.all([
    loadFonts(texts.map((l) => ({ font: l.font, weight: l.weight, italic: !!l.italic }))),
    // fonter i en annen bredde (Archivo 78 % …) lastes som egne familier
    ...texts.filter((l) => l.stretch && l.stretch !== 100).map((l) => loadStretch(l.font, l.stretch ?? 100, l.weight, !!l.italic)),
    loadGrain(),
  ])
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

/** Lysstyrke, kontrast og metning for et bildelag som canvas-filter («none» når alt er 0). */
/**
 * Selve bildet i bildelaget: uten filtre nøyaktig som før (bildejusteringene som canvas-filter). Med filtre (F01–F13,
 * engine/filters.ts) tegnes bildet og filtrene i et eget lerret i lagets størrelse: bildefiltrene på bildet, lagene over
 * i rekkefølge, og til slutt bildets egen gjennomsiktighet (et utklipp får ikke farge utenfor personen).
 */
function drawPic(g: G, im: CanvasImageSource & { width: number; height: number }, l: ImageLayer, s: number) {
  const fs = activeFilters(l.filters)
  const lb = (l.blur ?? 0) > 0 ? `blur(${((l.blur ?? 0) * s).toFixed(2)}px)` : ''
  if (!fs.length) {
    const f0 = imgFilter(l)
    g.filter = lb ? (f0 === 'none' ? lb : `${f0} ${lb}`) : f0
    drawFit(g, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l)
    g.filter = 'none'
    return
  }
  const k = W / REF_W
  const cw = Math.max(1, Math.min(8192, Math.ceil(l.w * s))), ch = Math.max(1, Math.min(8192, Math.ceil(l.h * s)))
  const comp = canvas(cw, ch), cg = ctx(comp)
  const sx = cw / l.w, sy = ch / l.h
  cg.setTransform(sx, 0, 0, sy, 0, 0)
  const base = imgFilter(l)
  cg.filter = [base === 'none' ? '' : base, pixelFilter(fs, k, s)].join(' ').trim() || 'none'
  const bs = blurScale(fs)
  if (bs !== 1) {
    cg.translate(l.w / 2, l.h / 2)
    cg.scale(bs, bs)
    cg.translate(-l.w / 2, -l.h / 2)
  }
  drawFit(cg, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l)
  cg.filter = 'none'
  // bildets gjennomsiktighet før lagene over
  const alpha = canvas(cw, ch)
  ctx(alpha).drawImage(comp, 0, 0)
  cg.setTransform(sx, 0, 0, sy, 0, 0)
  drawOverlays(cg, fs, l.w, l.h, k)
  cg.setTransform(1, 0, 0, 1, 0, 0)
  cg.globalCompositeOperation = 'destination-in'
  cg.drawImage(alpha, 0, 0)
  if (lb) g.filter = lb
  g.drawImage(comp, 0, 0, l.w, l.h)
  if (lb) g.filter = 'none'
}

export function imgFilter(l: { bri?: number; con?: number; sat?: number }): string {
  const f = (v: number | undefined) => 1 + Math.max(-100, Math.min(100, v || 0)) / 100
  return l.bri || l.con || l.sat ? `brightness(${f(l.bri)}) contrast(${f(l.con)}) saturate(${f(l.sat)})` : 'none'
}
