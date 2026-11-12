/**
 * Maling for lag: gradienter (lineær, radial, konisk, også gjentatte), mønsterruter og filmkorn – det samme som CSS
 * `background-image` kan uttrykke (fase 3, docs/maler-og-fonter.md). Brukes av formlag (`paint`) og tekst med
 * gradient (`paint` på tekstlag). Geometrien er i lagets egne koordinater (dokumentpiksler), så lagene kan flyttes og
 * skaleres som før.
 *
 * `parseBackground` gjør beregnede CSS-verdier om til maling (brukes av malkonvertereren, web/tools/maler/), og
 * `fillPaint` tegner malingen på lerretet.
 */
import { grainImage } from './filters'

/** Fargestopp: posisjon (0–1 langs gradienten) og farge (CSS-farge). */
export type Stop = [number, string]
/** Mønsterrute: bredde, høyde og forskyvning (x, y). */
export type Tile = [number, number, number, number]

export type Paint =
  | { k: 'lin'; x1: number; y1: number; x2: number; y2: number; st: Stop[]; rep?: boolean; tile?: Tile }
  | { k: 'rad'; cx: number; cy: number; rx: number; ry: number; st: Stop[]; rep?: boolean; tile?: Tile }
  | { k: 'con'; cx: number; cy: number; a: number; st: Stop[]; rep?: boolean; tile?: Tile }
  | { k: 'grain'; sc: number; tile?: Tile }

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

// ---------- tegning ----------

const RGBA = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i

function alphaOf(c: string): number | null {
  const m = RGBA.exec(c.trim())
  if (!m) return c.trim() === 'transparent' ? 0 : null
  if (m[4] == null) return 1
  return m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
}
const rgbOf = (c: string): string | null => {
  const m = RGBA.exec(c.trim())
  return m ? `${m[1]},${m[2]},${m[3]}` : null
}

/**
 * Stoppene slik CSS blander dem: en helt gjennomsiktig stopp får nabofargen (CSS blander med forhåndsmultiplisert
 * alfa, canvas uten – uten dette blir overgangen mot «transparent» grå).
 */
function fixStops(st: readonly Stop[]): Stop[] {
  return st.map(([p, c], i) => {
    if (alphaOf(c) !== 0) return [p, c]
    const nb = [st[i - 1], st[i + 1]].find((x) => x && alphaOf(x[1]) !== 0)
    const rgb = nb ? rgbOf(nb[1]) : null
    return [p, rgb ? `rgba(${rgb},0)` : c]
  })
}

/** Gjentatte stopp utvidet til området [lo, hi] (i gradientens enheter). */
function repeatStops(st: readonly Stop[], lo: number, hi: number): Stop[] {
  const a = st[0]?.[0] ?? 0
  const b = st[st.length - 1]?.[0] ?? 1
  const per = b - a
  if (!(per > 1e-6)) return st.slice()
  const out: Stop[] = []
  const n0 = Math.floor((lo - a) / per) - 1
  const n1 = Math.ceil((hi - a) / per) + 1
  if (n1 - n0 > 4000) return st.slice()
  for (let n = n0; n <= n1; n++) for (const [p, c] of st) out.push([p + n * per, c])
  return out
}

/** Legger stopp i [0, 1] etter at gradienten er strukket over [lo, hi]. */
function addStops(gr: CanvasGradient, st: readonly Stop[], lo = 0, hi = 1) {
  const span = hi - lo || 1
  let last = 0
  for (const [p, c] of fixStops(st)) {
    const t = Math.max(0, Math.min(1, (p - lo) / span))
    last = Math.max(last, t)
    try {
      gr.addColorStop(last, c)
    } catch {
      /* ugyldig farge: hoppes over */
    }
  }
}

function style(g: Ctx, p: Paint, w: number, h: number): CanvasGradient | CanvasPattern | null {
  if (p.k === 'grain') {
    const im = grainImage()
    if (!im) return null
    const pat = g.createPattern(im, 'repeat')
    pat?.setTransform(new DOMMatrix().scale(p.sc, p.sc))
    return pat
  }
  if (p.k === 'lin') {
    const dx = p.x2 - p.x1
    const dy = p.y2 - p.y1
    const L2 = dx * dx + dy * dy || 1
    let lo = 0
    let hi = 1
    if (p.rep) {
      // hele flaten: projeksjonen av hjørnene på gradientlinjen
      const ts = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => (((x ?? 0) - p.x1) * dx + ((y ?? 0) - p.y1) * dy) / L2)
      lo = Math.min(...ts)
      hi = Math.max(...ts)
    }
    const gr = g.createLinearGradient(p.x1 + dx * lo, p.y1 + dy * lo, p.x1 + dx * hi, p.y1 + dy * hi)
    addStops(gr, p.rep ? repeatStops(p.st, lo, hi) : p.st, lo, hi)
    return gr
  }
  if (p.k === 'rad') {
    let hi = 1
    if (p.rep) {
      const rx = Math.max(1e-6, p.rx)
      const ry = Math.max(1e-6, p.ry)
      hi = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(((x ?? 0) - p.cx) / rx, ((y ?? 0) - p.cy) / ry)))
    }
    // sirkel i et skalert rom (ellipse = sirkel strukket loddrett)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(1e-6, p.rx) * hi)
    addStops(gr, p.rep ? repeatStops(p.st, 0, hi) : p.st, 0, hi)
    return gr
  }
  const gr = g.createConicGradient(p.a - Math.PI / 2, p.cx, p.cy)
  addStops(gr, p.rep ? repeatStops(p.st, 0, 1) : p.st)
  return gr
}

function fillOne(g: Ctx, p: Paint, w: number, h: number) {
  const st = style(g, p, w, h)
  if (!st) return
  g.save()
  g.fillStyle = st
  if (p.k === 'rad') {
    // ellipse: tegn i et rom der ellipsen er en sirkel
    const ky = p.ry / Math.max(1e-6, p.rx)
    g.translate(p.cx, p.cy)
    g.scale(1, ky || 1e-6)
    g.fillRect(-p.cx, -p.cy / (ky || 1e-6), w, h / (ky || 1e-6))
  } else g.fillRect(0, 0, w, h)
  g.restore()
}

/**
 * Tegner malingen over flaten (0, 0, w, h) i nåværende sti/klipp. Listen er i CSS-rekkefølge (første øverst).
 * `s` = tegneskala (mønsterruter tegnes i lerretets oppløsning).
 */
export function fillPaint(g: Ctx, paints: readonly Paint[] | null | undefined, w: number, h: number, s = 1) {
  if (!paints?.length) return
  for (let i = paints.length - 1; i >= 0; i--) {
    const p = paints[i]
    if (!p) continue
    if (!p.tile) {
      fillOne(g, p, w, h)
      continue
    }
    const [tw, th, ox, oy] = p.tile
    if (!(tw >= 1 && th >= 1)) continue
    const sc = Math.max(0.05, s)
    const cw = Math.max(1, Math.min(4096, Math.round(tw * sc)))
    const chh = Math.max(1, Math.min(4096, Math.round(th * sc)))
    const t = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, chh) : Object.assign(document.createElement('canvas'), { width: cw, height: chh })
    const tg = t.getContext('2d') as Ctx | null
    if (!tg) continue
    tg.scale(cw / tw, chh / th)
    const { tile: _t, ...one } = p
    fillOne(tg, one as Paint, tw, th)
    const pat = g.createPattern(t as CanvasImageSource, 'repeat')
    if (!pat) continue
    pat.setTransform(new DOMMatrix().translate(ox, oy).scale(tw / cw, th / chh))
    g.save()
    g.fillStyle = pat
    g.fillRect(0, 0, w, h)
    g.restore()
  }
}

// ---------- CSS → maling (malkonvertereren) ----------

/** Deler en CSS-verdi på komma på øverste nivå (ikke inne i parenteser). */
export function splitTop(s: string, sep = ','): string[] {
  const out: string[] = []
  let d = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') d++
    else if (ch === ')') d--
    if (ch === sep && d === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const isColorStart = (t: string) => /^(rgba?|hsla?|color|oklab|oklch|lab|lch|hwb)\(|^#|^transparent\b|^currentcolor\b|^[a-z]+$/i.test(t)

/** Lengde i px (px, % av `ref`, deg/turn for vinkler gir NaN). */
function len(v: string, ref: number): number {
  const t = v.trim()
  if (t.endsWith('%')) return (parseFloat(t) / 100) * ref
  if (t.endsWith('px')) return parseFloat(t)
  if (t === '0') return 0
  return NaN
}

function angleDeg(v: string): number {
  const t = v.trim()
  if (t.endsWith('deg')) return parseFloat(t)
  if (t.endsWith('turn')) return parseFloat(t) * 360
  if (t.endsWith('rad')) return (parseFloat(t) * 180) / Math.PI
  if (t.endsWith('grad')) return parseFloat(t) * 0.9
  return NaN
}

/** Fargestopp: «farge [pos [pos]]» – posisjonene i px gjøres om med `L` (gradientens lengde), vinkler med 360. */
function parseStops(args: string[], L: number, ang = false): Stop[] {
  const raw: { c: string; p: number | null }[] = []
  for (const a of args) {
    // fargen kan selv inneholde mellomrom (rgb(…)), så posisjonene tas fra slutten
    const parts = splitTop(a, ' ')
    const pos: number[] = []
    while (parts.length > 1) {
      const last = parts[parts.length - 1] ?? ''
      const v = ang ? angleDeg(last) / 360 : len(last, L) / L
      const pc = ang && last.endsWith('%') ? parseFloat(last) / 100 : v
      if (!Number.isFinite(pc)) break
      pos.unshift(pc)
      parts.pop()
    }
    const c = parts.join(' ')
    if (!c) continue
    if (!pos.length) raw.push({ c, p: null })
    else for (const p of pos) raw.push({ c, p })
  }
  if (!raw.length) return []
  if (raw[0] && raw[0].p == null) raw[0].p = 0
  const lastR = raw[raw.length - 1]
  if (lastR && lastR.p == null) lastR.p = 1
  // manglende posisjoner jevnt fordelt mellom kjente; aldri bakover
  for (let i = 1; i < raw.length; i++) {
    if (raw[i]?.p != null) continue
    let j = i
    while (j < raw.length && raw[j]?.p == null) j++
    const a = raw[i - 1]?.p ?? 0
    const b = raw[j]?.p ?? a
    for (let k = i; k < j; k++) (raw[k] as { p: number | null }).p = a + ((b - a) * (k - i + 1)) / (j - i + 1)
  }
  let m = -Infinity
  return raw.map((x) => {
    m = Math.max(m, x.p ?? 0)
    return [m, x.c] as Stop
  })
}

/** Posisjon («50% 62%», «left top», «center») i en flate w × h. */
function position(v: string, w: number, h: number): [number, number] {
  const t = splitTop(v.trim(), ' ').filter(Boolean)
  const kw: Record<string, [number, 'x' | 'y' | 'c']> = { left: [0, 'x'], right: [1, 'x'], top: [0, 'y'], bottom: [1, 'y'], center: [0.5, 'c'] }
  let x = w / 2
  let y = h / 2
  if (t.length === 1) t.push('center')
  const [a = 'center', b = 'center'] = t
  const ka = kw[a]
  const kb = kw[b]
  if ((ka && ka[1] === 'y') || (kb && kb[1] === 'x')) {
    x = kb ? kb[0] * w : len(b, w)
    y = ka ? ka[0] * h : len(a, h)
  } else {
    x = ka ? ka[0] * w : len(a, w)
    y = kb ? kb[0] * h : len(b, h)
  }
  return [Number.isFinite(x) ? x : w / 2, Number.isFinite(y) ? y : h / 2]
}

function linear(args: string[], w: number, h: number, rep: boolean): Paint | null {
  let deg = 180
  const first = args[0] ?? ''
  if (/^to\s/.test(first)) {
    const t = first.slice(3).trim().split(/\s+/)
    const sx = t.includes('right') ? 1 : t.includes('left') ? -1 : 0
    const sy = t.includes('bottom') ? 1 : t.includes('top') ? -1 : 0
    if (sx && sy) deg = (Math.atan2(sx * h, -sy * w) * 180) / Math.PI
    else deg = sx > 0 ? 90 : sx < 0 ? 270 : sy > 0 ? 180 : 0
    args = args.slice(1)
  } else if (Number.isFinite(angleDeg(first))) {
    deg = angleDeg(first)
    args = args.slice(1)
  }
  const a = (deg * Math.PI) / 180
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const L = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)) || 1
  const st = parseStops(args, L)
  if (!st.length) return null
  return { k: 'lin', x1: w / 2 - (dx * L) / 2, y1: h / 2 - (dy * L) / 2, x2: w / 2 + (dx * L) / 2, y2: h / 2 + (dy * L) / 2, st, ...(rep ? { rep: true } : {}) }
}

function radial(args: string[], w: number, h: number, rep: boolean): Paint | null {
  let shape: 'circle' | 'ellipse' = 'ellipse'
  let size = 'farthest-corner'
  let lens: string[] = []
  let at = 'center'
  const first = args[0] ?? ''
  if (!isColorStart(first) || /^(circle|ellipse|closest|farthest|at)\b/.test(first)) {
    const parts = first.split(/\s+at\s+|^at\s+/)
    const head = (first.startsWith('at ') ? '' : parts[0] ?? '').trim()
    if (/\bat\b/.test(first)) at = first.slice(first.search(/\bat\b/) + 2).trim()
    for (const tk of head.split(/\s+/).filter(Boolean)) {
      if (tk === 'circle' || tk === 'ellipse') shape = tk
      else if (/^(closest|farthest)-(side|corner)$/.test(tk)) size = tk
      else lens.push(tk)
    }
    args = args.slice(1)
  }
  const [cx, cy] = position(at, w, h)
  const sides = { l: cx, r: w - cx, t: cy, b: h - cy }
  const corners = [[cx, cy], [w - cx, cy], [cx, h - cy], [w - cx, h - cy]] as const
  let rx: number
  let ry: number
  if (lens.length) {
    if (lens.length === 1) lens = [lens[0] ?? '0', lens[0] ?? '0']
    rx = len(lens[0] ?? '0', w)
    ry = shape === 'circle' && lens.length === 1 ? rx : len(lens[1] ?? '0', h)
    if (shape === 'circle') ry = rx
  } else if (shape === 'circle') {
    const cd = corners.map(([a, b]) => Math.hypot(a, b))
    const sd = [sides.l, sides.r, sides.t, sides.b]
    rx = size === 'closest-side' ? Math.min(...sd) : size === 'farthest-side' ? Math.max(...sd) : size === 'closest-corner' ? Math.min(...cd) : Math.max(...cd)
    ry = rx
  } else {
    const sx = size.startsWith('closest') ? Math.min(sides.l, sides.r) : Math.max(sides.l, sides.r)
    const sy = size.startsWith('closest') ? Math.min(sides.t, sides.b) : Math.max(sides.t, sides.b)
    if (size.endsWith('side')) {
      rx = sx
      ry = sy
    } else {
      rx = sx * Math.SQRT2
      ry = sy * Math.SQRT2
    }
  }
  if (!(rx > 0)) rx = 1e-3
  if (!(ry > 0)) ry = 1e-3
  const st = parseStops(args, rx)
  if (!st.length) return null
  return { k: 'rad', cx, cy, rx, ry, st, ...(rep ? { rep: true } : {}) }
}

function conic(args: string[], w: number, h: number, rep: boolean): Paint | null {
  let from = 0
  let at = 'center'
  const first = args[0] ?? ''
  if (/^(from|at)\b/.test(first)) {
    const m = /from\s+(\S+)/.exec(first)
    if (m?.[1]) from = angleDeg(m[1]) || 0
    const a = /\bat\s+(.+)$/.exec(first)
    if (a?.[1]) at = a[1]
    args = args.slice(1)
  }
  const [cx, cy] = position(at, w, h)
  const st = parseStops(args, 1, true)
  if (!st.length) return null
  return { k: 'con', cx, cy, a: (from * Math.PI) / 180, st, ...(rep ? { rep: true } : {}) }
}

/** Én bakgrunnsbildeverdi (gradient) i en flate w × h → maling (null = ikke støttet). */
export function parseImage(v: string, w: number, h: number): Paint | null {
  const m = /^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]*)\)$/.exec(v.trim())
  if (!m) return null
  const args = splitTop(m[3] ?? '')
  const rep = !!m[1]
  return m[2] === 'linear' ? linear(args, w, h, rep) : m[2] === 'radial' ? radial(args, w, h, rep) : conic(args, w, h, rep)
}

/**
 * Beregnet CSS-bakgrunn (background-image, -size, -position, -repeat) for en flate w × h → maling i CSS-rekkefølge.
 * `url(...)` som er filmkornet i materialet, blir korn (`grain`); andre bilder er bildefelt og tas ikke med her.
 * `k` = skala fra materialet til dokumentet (1920 / 1280).
 */
export function parseBackground(image: string, size: string, pos: string, w: number, h: number, k: number, isGrain: (url: string) => boolean): Paint[] {
  if (!image || image === 'none') return []
  const imgs = splitTop(image)
  const sizes = splitTop(size || 'auto')
  const poss = splitTop(pos || '0% 0%')
  const out: Paint[] = []
  imgs.forEach((im, i) => {
    const sz = (sizes[i % sizes.length] ?? 'auto').trim()
    const ps = (poss[i % poss.length] ?? '0% 0%').trim()
    let tw = w
    let th = h
    let tiled = false
    if (sz !== 'auto' && sz !== 'auto auto' && sz !== 'cover' && sz !== 'contain') {
      const [a = 'auto', b = 'auto'] = sz.split(/\s+/)
      const x = len(a, w)
      const y = len(b, h)
      tw = Number.isFinite(x) ? x : w
      th = Number.isFinite(y) ? y : Number.isFinite(x) ? x : h
      tiled = tw < w - 0.5 || th < h - 0.5
    }
    if (/^url\(/.test(im)) {
      if (isGrain(im)) out.push({ k: 'grain', sc: k })
      return
    }
    const p = parseImage(im, tw, th)
    if (!p) return
    if (tiled) {
      const [px, py] = position(ps, w - tw, h - th)
      out.push({ ...p, tile: [tw, th, px, py] } as Paint)
    } else out.push(p)
  })
  return out
}

/** Skalerer malingen (konvertereren måler i 1280-bredden, dokumentet er 1920). */
export function scalePaint(p: Paint, k: number): Paint {
  const tile = p.tile ? ([p.tile[0] * k, p.tile[1] * k, p.tile[2] * k, p.tile[3] * k] as Tile) : undefined
  const t = tile ? { tile } : {}
  if (p.k === 'grain') return { ...p, ...t }
  if (p.k === 'lin') return { ...p, x1: p.x1 * k, y1: p.y1 * k, x2: p.x2 * k, y2: p.y2 * k, ...t }
  if (p.k === 'rad') return { ...p, cx: p.cx * k, cy: p.cy * k, rx: p.rx * k, ry: p.ry * k, ...t }
  return { ...p, cx: p.cx * k, cy: p.cy * k, ...t }
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s/%]+\)|transparent|color\(srgb[\d.\s/%-]+\))$/i

/** Maling fra lagret fil kontrolleres (ukjente former og farger forkastes). */
export function cleanPaint(v: unknown): Paint[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Paint[] = []
  for (const x of v.slice(0, 16)) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const tile = Array.isArray(o.tile) && o.tile.length === 4 && o.tile.every(num) ? { tile: o.tile as Tile } : {}
    const st = Array.isArray(o.st) ? (o.st as unknown[]).filter((s): s is Stop => Array.isArray(s) && num(s[0]) && typeof s[1] === 'string' && SAFE_COLOR.test(s[1])).slice(0, 64) : []
    const rep = o.rep === true ? { rep: true } : {}
    if (o.k === 'grain' && num(o.sc)) out.push({ k: 'grain', sc: o.sc, ...tile })
    else if (o.k === 'lin' && [o.x1, o.y1, o.x2, o.y2].every(num) && st.length) out.push({ k: 'lin', x1: o.x1 as number, y1: o.y1 as number, x2: o.x2 as number, y2: o.y2 as number, st, ...rep, ...tile })
    else if (o.k === 'rad' && [o.cx, o.cy, o.rx, o.ry].every(num) && st.length) out.push({ k: 'rad', cx: o.cx as number, cy: o.cy as number, rx: o.rx as number, ry: o.ry as number, st, ...rep, ...tile })
    else if (o.k === 'con' && [o.cx, o.cy, o.a].every(num) && st.length) out.push({ k: 'con', cx: o.cx as number, cy: o.cy as number, a: o.a as number, st, ...rep, ...tile })
  }
  return out
}
