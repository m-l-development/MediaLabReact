/**
 * Avanserte effekter (lys, ild, røyk, måne, slør, partikler …) – samme motor som media-lab/src/legacy/ml-fx.js.
 * Prosedyrisk Canvas 2D uten avhengigheter. Deterministisk: samme frø og tid gir samme bilde (viktig for videoeksport).
 * Brukes av Photo Design (t = 0) og Motion Design (t = sekunder).
 */
import { userKey } from '../../infrastructure/local-user'

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2
const DEG = Math.PI / 180

export function mk(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

const ctx = (c: HTMLCanvasElement): G => {
  const g = c.getContext('2d')
  if (!g) throw new Error('2d')
  return g
}

export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function noise(x: number, y: number, s: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, s)
  const b = hash(xi + 1, yi, s)
  const c = hash(xi, yi + 1, s)
  const d = hash(xi + 1, yi + 1, s)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  const n = m?.[1] ? parseInt(m[1], 16) : 0xffffff
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex: string, a: number): string {
  const c = rgb(hex)
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

export function mix(h1: string, h2: string, t: number): string {
  const a = rgb(h1)
  const b = rgb(h2)
  return '#' + [0, 1, 2].map((i) => ('0' + Math.round(a[i as 0] + (b[i as 0] - a[i as 0]) * t).toString(16)).slice(-2)).join('')
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

/** Safari mangler ctx.filter: da brukes nedskalering/oppskalering som myk uskarphet. */
export function blur(c: HTMLCanvasElement, r: number): HTMLCanvasElement {
  if (!(r >= 0.5)) return c
  const W = c.width
  const H = c.height
  const o = mk(W, H)
  const g = ctx(o)
  if (hasFilter()) {
    g.filter = `blur(${r.toFixed(1)}px)`
    g.drawImage(c, 0, 0)
    g.filter = 'none'
    return o
  }
  const k = Math.max(1, r / 1.6)
  const s = mk(W / k, H / k)
  const sg = ctx(s)
  sg.imageSmoothingQuality = 'high'
  sg.drawImage(c, 0, 0, s.width, s.height)
  g.imageSmoothingQuality = 'high'
  g.drawImage(s, 0, 0, W, H)
  return o
}

function dot(g: G, x: number, y: number, r: number, col: string, a: number) {
  if (!(r > 0) || !(a > 0)) return
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, rgba(col, a))
  gr.addColorStop(0.4, rgba(col, a * 0.45))
  gr.addColorStop(1, rgba(col, 0))
  g.fillStyle = gr
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

const wrap = (v: number, m: number) => ((v % m) + m) % m

/** Alle parameterne effektene bruker (hver effekt leser bare sine egne, med standardverdier fra `params`). */
export interface FxP {
  sx: number; sy: number; int: number; rays: number; len: number; spread: number; dir: number; width: number; glow: number; flare: number; soft: number
  c1: string; c2: string; shape: string; ang: number; beam: number; pool: number; haze: number; size: number; phase: number; rot: number; tex: number
  halo: number; light: number; clouds: number; height: number; turb: number; lean: number; embers: number; smoke: number; mode: string; dens: number
  rise: number; wind: number; count: number; wave: number; freq: number; twist: number; rad: number; curve: number; thick: number; from: string
  fog: number; band: number; dust: number; thr: number; tint: number; vig: number; feather: number; grain: number; gsize: number; type: string
  speed: number; trail: number
}

export type ParamDef =
  | { k: keyof FxP; l: string; t: 'r'; min: number; max: number; step: number; def: number }
  | { k: keyof FxP; l: string; t: 'c'; def: string }
  | { k: keyof FxP; l: string; t: 's'; o: [string, string][]; def: string }

const PR = (k: keyof FxP, l: string, min: number, max: number, step: number, def: number): ParamDef => ({ k, l, t: 'r', min, max, step, def })
const PC = (k: keyof FxP, l: string, def: string): ParamDef => ({ k, l, t: 'c', def })
const PS = (k: keyof FxP, l: string, o: [string, string][], def: string): ParamDef => ({ k, l, t: 's', o, def })
const X = (d: number) => PR('sx', 'Posisjon X', -0.6, 0.6, 0.01, d)
const Y = (d: number) => PR('sy', 'Posisjon Y', -0.6, 0.6, 0.01, d)
const INT = (d?: number) => PR('int', 'Intensitet', 0, 2, 0.01, d ?? 1)

type Painter = (g: G, W: number, H: number, p: FxP, R: () => number, t: number) => void

const sun: Painter = (g, W, H, p, R, t) => {
  const cx = W * (0.5 + p.sx)
  const cy = H * (0.5 + p.sy)
  const D = Math.hypot(W, H)
  const u = Math.min(W, H)
  const I = p.int
  if (p.rays > 0) {
    const rc = mk(W, H)
    const q = ctx(rc)
    q.globalCompositeOperation = 'lighter'
    for (let i = 0; i < p.rays; i++) {
      const a = (p.dir + (R() - 0.5) * p.spread + Math.sin(t * 0.5 + i * 1.3) * 1.5) * DEG
      const L = D * p.len * (0.45 + R() * 0.75)
      const wd = Math.max(0.003, (0.25 + R()) * p.width * 0.03)
      const al = (0.15 + R() * 0.3) * I * (0.85 + 0.15 * Math.sin(t * 1.3 + i))
      const gr = q.createRadialGradient(cx, cy, 0, cx, cy, L)
      gr.addColorStop(0, rgba(p.c2, al))
      gr.addColorStop(0.25, rgba(p.c1, al * 0.7))
      gr.addColorStop(1, rgba(p.c1, 0))
      q.fillStyle = gr
      q.beginPath()
      q.moveTo(cx, cy)
      q.lineTo(cx + Math.cos(a - wd) * L, cy + Math.sin(a - wd) * L)
      q.lineTo(cx + Math.cos(a + wd) * L, cy + Math.sin(a + wd) * L)
      q.closePath()
      q.fill()
    }
    g.drawImage(blur(rc, u * 0.004 + p.soft * u * 0.05), 0, 0)
  }
  if (p.glow > 0) {
    const r = u * (0.06 + p.glow * 0.5)
    dot(g, cx, cy, r * 2.4, p.c1, 0.4 * I * p.glow)
    dot(g, cx, cy, r, p.c2, 0.9 * Math.min(1, I))
    dot(g, cx, cy, r * 0.28, '#ffffff', Math.min(1, I))
  }
  if (p.flare > 0) {
    const dx = W / 2 - cx
    const dy = H / 2 - cy
    const FL: [number, number, string][] = [[0.35, 0.05, p.c1], [0.6, 0.02, p.c2], [0.85, 0.09, p.c1], [1.25, 0.04, '#9fd4ff'], [1.6, 0.12, p.c1], [1.9, 0.03, p.c2]]
    for (const f of FL) dot(g, cx + dx * f[0], cy + dy * f[0], u * f[1], f[2], 0.4 * p.flare * I)
    const sg = g.createLinearGradient(cx - D * 0.4, cy, cx + D * 0.4, cy)
    sg.addColorStop(0, rgba(p.c2, 0))
    sg.addColorStop(0.5, rgba(p.c2, 0.55 * p.flare * I))
    sg.addColorStop(1, rgba(p.c2, 0))
    g.fillStyle = sg
    g.fillRect(cx - D * 0.4, cy - u * 0.004, D * 0.8, u * 0.008)
  }
}

const spot: Painter = (g, W, H, p, R, t) => {
  const cx = W * (0.5 + p.sx)
  const cy = H * (0.5 + p.sy)
  const D = Math.hypot(W, H)
  const u = Math.min(W, H)
  const I = p.int
  const a = p.ang * DEG
  const L = D * p.len
  const hb = (p.beam * DEG) / 2
  const c = mk(W, H)
  const q = ctx(c)
  if (p.shape === 'cone') {
    const gr = q.createRadialGradient(cx, cy, 0, cx, cy, L)
    gr.addColorStop(0, rgba(p.c1, 0.8 * I))
    gr.addColorStop(0.6, rgba(p.c1, 0.3 * I))
    gr.addColorStop(1, rgba(p.c1, 0))
    q.fillStyle = gr
    const ns = 7
    for (let z = 0; z < ns; z++) {
      const hz = hb * (1 + p.soft * 0.7 - (z / (ns - 1)) * p.soft * 1.2)
      q.globalAlpha = (1 / ns) * 1.6
      q.beginPath()
      q.moveTo(cx, cy)
      q.arc(cx, cy, L, a - hz, a + hz)
      q.closePath()
      q.fill()
    }
    q.globalAlpha = 1
    if (p.pool > 0) {
      const px = cx + Math.cos(a) * L * 0.75
      const py = cy + Math.sin(a) * L * 0.75
      const pr = Math.tan(Math.min(hb, 1.3)) * L * 0.75
      q.save()
      q.translate(px, py)
      q.rotate(a + Math.PI / 2)
      q.scale(1, 0.32)
      dot(q, 0, 0, pr * 1.3, p.c1, 0.7 * p.pool * I)
      q.restore()
    }
    if (p.haze > 0) {
      const n = Math.round(180 * p.haze)
      for (let i = 0; i < n; i++) {
        const d = R() * L * 0.9
        const aa = a + (R() - 0.5) * 2 * hb * 0.9
        dot(q, cx + Math.cos(aa) * d + Math.sin(t * 0.7 + i) * u * 0.006, cy + Math.sin(aa) * d + Math.cos(t * 0.5 + i) * u * 0.006, u * (0.002 + R() * 0.006), '#ffffff', 0.55 * I * R())
      }
    }
    dot(q, cx, cy, u * 0.05, '#ffffff', Math.min(1, I))
  } else {
    q.save()
    q.translate(cx, cy)
    q.rotate(a)
    if (p.shape === 'ellipse') q.scale(1, 0.55)
    const r = u * (0.1 + p.len * 0.3)
    const hard = 1 - p.soft
    const g2 = q.createRadialGradient(0, 0, 0, 0, 0, r)
    g2.addColorStop(0, rgba(p.c1, 0.9 * I))
    g2.addColorStop(Math.max(0.05, hard * 0.85), rgba(p.c1, 0.7 * I))
    g2.addColorStop(1, rgba(p.c1, 0))
    q.fillStyle = g2
    q.fillRect(-r, -r, 2 * r, 2 * r)
    q.restore()
  }
  g.drawImage(blur(c, u * 0.004 + p.soft * u * 0.07), 0, 0)
}

const moon: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const cx = W * (0.5 + p.sx)
  const cy = H * (0.5 + p.sy)
  const r = Math.max(2, u * p.size * 0.5)
  const I = p.int
  if (p.light > 0) dot(g, cx, cy, Math.hypot(W, H) * 0.8, p.c2, 0.3 * p.light * I)
  if (p.halo > 0) {
    dot(g, cx, cy, r * (2 + p.halo * 3), p.c2, 0.45 * p.halo * I)
    dot(g, cx, cy, r * 1.35, p.c1, 0.4 * p.halo * I)
  }
  const S2 = Math.ceil(r * 2 + 6)
  let m = mk(S2, S2)
  const q = ctx(m)
  const o = S2 / 2
  const gr = q.createRadialGradient(o - r * 0.3, o - r * 0.3, r * 0.1, o, o, r)
  gr.addColorStop(0, mix(p.c1, '#ffffff', 0.5))
  gr.addColorStop(1, mix(p.c1, '#8a877f', 0.45))
  q.fillStyle = gr
  q.beginPath()
  q.arc(o, o, r, 0, TAU)
  q.fill()
  if (p.tex > 0) {
    q.save()
    q.beginPath()
    q.arc(o, o, r, 0, TAU)
    q.clip()
    const MR = rng(7)
    for (let i = 0; i < 7; i++) dot(q, o + (MR() - 0.5) * r * 1.3, o + (MR() - 0.5) * r * 1.3, r * (0.25 + MR() * 0.35), '#5d5a55', 0.4 * p.tex)
    for (let j = 0; j < 70; j++) {
      const kx = o + (MR() - 0.5) * r * 2
      const ky = o + (MR() - 0.5) * r * 2
      const kr = r * (0.012 + Math.pow(MR(), 3) * 0.11)
      q.fillStyle = `rgba(70,68,64,${0.25 * p.tex})`
      q.beginPath()
      q.arc(kx, ky, kr, 0, TAU)
      q.fill()
      q.strokeStyle = `rgba(255,255,255,${0.18 * p.tex})`
      q.lineWidth = Math.max(0.5, kr * 0.25)
      q.beginPath()
      q.arc(kx - kr * 0.15, ky - kr * 0.15, kr, Math.PI * 0.6, Math.PI * 1.6)
      q.stroke()
    }
    q.restore()
  }
  const ph = wrap(p.phase, 1)
  const k = Math.cos(ph * TAU)
  if (Math.abs(ph - 0.5) > 0.004) {
    const lit = mk(S2, S2)
    const l = ctx(lit)
    l.translate(o, o)
    l.rotate(p.rot * DEG)
    if (ph > 0.5) l.scale(-1, 1)
    l.fillStyle = '#ffffff'
    l.beginPath()
    l.arc(0, 0, r + 1, -Math.PI / 2, Math.PI / 2, false)
    if (k >= 0) l.ellipse(0, 0, Math.max(0.01, (r + 1) * k), r + 1, 0, Math.PI / 2, -Math.PI / 2, true)
    else l.ellipse(0, 0, (r + 1) * -k, r + 1, 0, Math.PI / 2, Math.PI * 1.5, false)
    l.fill()
    const out = mk(S2, S2)
    const oq = ctx(out)
    oq.globalAlpha = 0.07
    oq.drawImage(m, 0, 0)
    oq.globalAlpha = 1
    const lm = mk(S2, S2)
    const lq = ctx(lm)
    lq.drawImage(m, 0, 0)
    lq.globalCompositeOperation = 'destination-in'
    lq.drawImage(blur(lit, r * 0.03), 0, 0)
    oq.drawImage(lm, 0, 0)
    m = out
  }
  g.globalAlpha = Math.min(1, I)
  g.drawImage(m, cx - o, cy - o)
  g.globalAlpha = 1
  if (p.clouds > 0) {
    const n = Math.round(10 + p.clouds * 30)
    const cc = mix(p.c2, '#20242c', 0.55)
    for (let c = 0; c < n; c++) {
      const x = cx + wrap((R() - 0.5) * r * 8 + t * u * 0.012 * (1 + R()) + r * 4, r * 8) - r * 4
      const y = cy + (R() - 0.35) * r * 2.4
      g.save()
      g.translate(x, y)
      g.scale(2.6, 1)
      dot(g, 0, 0, r * (0.3 + R() * 0.6), cc, 0.4 * p.clouds)
      g.restore()
    }
  }
}

const fire: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const bx = W * (0.5 + p.sx)
  const by = H * (0.5 + p.sy)
  const I = p.int
  const fh = H * p.height
  const fw = W * p.width
  const sd = (R() * 1000) | 0
  const dark = mix(p.c2, '#2a0500', 0.6)
  if (p.glow > 0) {
    g.save()
    g.translate(bx, by - fh * 0.3)
    g.scale(1.3, 1)
    dot(g, 0, 0, Math.max(fw, fh) * 1.1, p.c2, 0.35 * p.glow * I)
    g.restore()
  }
  if (p.smoke > 0) {
    for (let s = 0; s < 40; s++) {
      const sl = wrap(R() + t * 0.08, 1)
      const sx = bx + noise(s * 0.4, sl * 2 - t * 0.3, sd + 3) * fw * (0.3 + sl) + p.lean * sl * fh * 0.8
      const sy = by - fh * (0.7 + sl * 1.3)
      dot(g, sx, sy, fw * (0.25 + sl * 0.7), '#8a8580', 0.12 * p.smoke * Math.sin(sl * Math.PI))
    }
  }
  const c = mk(W, H)
  const q = ctx(c)
  q.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 260; i++) {
    const r0 = R()
    const r1 = R()
    const r2 = R()
    const life = wrap(r0 + t * (0.6 + r1 * 0.8), 1)
    const e = 1 - life
    let x: number
    let y: number
    let rad: number
    if (p.shape === 'ball') {
      const an = r1 * TAU
      const ds = Math.pow(r2, 0.6) * fw * 0.5 * (0.4 + life * 0.8)
      x = bx + Math.cos(an) * ds + p.lean * life * fw
      y = by + Math.sin(an) * ds - life * fh * 0.35
      rad = fw * 0.2 * (0.4 + e * 0.8)
    } else if (p.shape === 'trail') {
      x = bx + (r1 - 0.5) * fw
      y = by - life * fh * (0.15 + 0.85 * r1)
      rad = fw * 0.07 * (0.4 + e) * (0.4 + r1)
    } else {
      x = bx + (r1 - 0.5) * fw * Math.pow(e, 0.8)
      y = by - life * fh * (0.6 + r2 * 0.5)
      rad = fw * 0.16 * Math.pow(e, 0.7) * (0.5 + r2)
    }
    x += noise(i * 0.13, life * 3 - t * 2, sd) * p.turb * fw * 0.35 * life + p.lean * life * life * fh * 0.5
    const col = life < 0.3 ? mix(p.c1, p.c2, life / 0.3) : mix(p.c2, dark, (life - 0.3) / 0.7)
    q.save()
    q.translate(x, y)
    q.scale(0.8, 2.1)
    dot(q, 0, 0, rad, col, Math.pow(e, 1.5) * 0.12 * I)
    q.restore()
  }
  if (p.shape !== 'trail') dot(q, bx, by - fh * 0.04, fw * 0.2, p.c1, 0.25 * Math.min(1, I))
  g.globalCompositeOperation = 'lighter'
  g.drawImage(blur(c, u * 0.01), 0, 0)
  g.drawImage(c, 0, 0)
  const ne = Math.round(90 * p.embers)
  for (let j = 0; j < ne; j++) {
    const el = wrap(R() + t * 0.35 * (0.5 + R()), 1)
    const ex = bx + (R() - 0.5) * fw * 1.2 + noise(j, el * 4 - t, sd + 9) * fw * 0.6 * el + p.lean * el * fh * 0.6
    const ey = by - el * fh * (1.1 + R())
    const es = u * (0.002 + R() * 0.004)
    const ec = R() < 0.5 ? p.c1 : p.c2
    dot(g, ex, ey, es * 4, ec, (1 - el) * I * 0.8)
    g.fillStyle = rgba(mix(ec, '#ffffff', 0.5), (1 - el) * Math.min(1, I))
    g.fillRect(ex - es / 2, ey - es / 2, es, es)
  }
  g.globalCompositeOperation = 'source-over'
}

const smoke: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const bx = W * (0.5 + p.sx)
  const by = H * (0.5 + p.sy)
  const sd = (R() * 1000) | 0
  const N = Math.round(30 + p.dens * 170)
  const c = mk(W, H)
  const q = ctx(c)
  const sz = u * (0.04 + p.size * 0.22)
  for (let i = 0; i < N; i++) {
    const r0 = R()
    const r1 = R()
    const r2 = R()
    const life = wrap(r0 + t * 0.06 * (0.5 + r1), 1)
    let x: number
    let y: number
    let rad: number
    let a: number
    if (p.mode === 'fog') {
      x = wrap(r1 * W * 1.4 + t * p.wind * u * 0.05, W * 1.4) - W * 0.2
      y = H - Math.pow(r2, 1.5) * H * p.rise * 0.6
      rad = sz * (1 + r0 * 1.5)
      a = 0.5
    } else if (p.mode === 'cloud') {
      const an = r1 * TAU
      const ds = Math.sqrt(r2) * sz * 3
      x = bx + Math.cos(an) * ds * 1.6 + noise(i * 0.3, t * 0.2, sd) * sz * p.turb + t * p.wind * u * 0.02
      y = by + Math.sin(an) * ds * 0.8
      rad = sz * (0.6 + r0)
      a = 0.6
    } else if (p.mode === 'trail') {
      x = bx - W * 0.45 + r1 * W * 0.9
      y = by + Math.sin(r1 * 5 + sd) * H * 0.12 * p.turb + noise(r1 * 4, t * 0.3, sd) * sz
      rad = sz * (0.3 + r1 * 0.9) * (0.6 + r2 * 0.6)
      a = 0.4 + r1 * 0.4
    } else {
      x = bx + noise(i * 0.21, life * 2.5 - t * 0.3, sd) * p.turb * sz * 3 * (0.3 + life * 2) + p.wind * life * life * W * 0.4 + (r1 - 0.5) * sz * 0.6
      y = by - life * H * p.rise
      rad = sz * (0.35 + life * 1.6) * (0.6 + r2 * 0.6)
      a = Math.sin(life * Math.PI) * 0.9
    }
    dot(q, x, y, rad, p.c1, a * 0.16 * (0.6 + p.dens * 0.8))
  }
  const A = Math.min(1, p.int)
  g.globalAlpha = A
  g.drawImage(blur(c, u * 0.004 + p.soft * u * 0.03), 0, 0)
  g.globalAlpha = A * (1 - p.soft) * 0.5
  g.drawImage(c, 0, 0)
  g.globalAlpha = 1
}

const veil: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const D = Math.hypot(W, H)
  const c = mk(W, H)
  const q = ctx(c)
  const n = Math.max(1, Math.round(p.count))
  const I = p.int
  q.translate(W / 2, H / 2)
  q.rotate(p.ang * DEG)
  q.globalCompositeOperation = 'lighter'
  for (let k = 0; k < n; k++) {
    const ph = R() * TAU + t * 0.6 * (0.6 + R() * 0.4)
    const off = (k - (n - 1) / 2) * H * 0.12 * (0.6 + R() * 0.8)
    const amp = H * 0.18 * p.wave
    const fr = (0.6 + p.freq * 2.4) * (0.8 + R() * 0.4)
    const th = u * (0.02 + p.width * 0.18) * (0.6 + R() * 0.8)
    const top: [number, number][] = []
    const bot: [number, number][] = []
    for (let s = 0; s <= 64; s++) {
      const x = -D / 2 + (D * s) / 64
      const v = (s / 64) * TAU * fr + ph
      const y = off + Math.sin(v) * amp + Math.sin(v * 0.47 + ph * 1.3) * amp * 0.5
      const w = th * (0.2 + 0.8 * Math.abs(Math.sin(v * 0.5 * (0.5 + p.twist) + ph)))
      top.push([x, y - w])
      bot.push([x, y + w])
    }
    const lg = q.createLinearGradient(-D / 2, 0, D / 2, 0)
    lg.addColorStop(0, rgba(p.c1, 0))
    lg.addColorStop(0.3, rgba(p.c1, 0.22 * I))
    lg.addColorStop(0.7, rgba(p.c2, 0.22 * I))
    lg.addColorStop(1, rgba(p.c2, 0))
    q.fillStyle = lg
    q.beginPath()
    top.forEach((pt, i) => (i ? q.lineTo(pt[0], pt[1]) : q.moveTo(pt[0], pt[1])))
    for (let b = bot.length - 1; b >= 0; b--) {
      const pt = bot[b] as [number, number]
      q.lineTo(pt[0], pt[1])
    }
    q.closePath()
    q.fill()
    const le = q.createLinearGradient(-D / 2, 0, D / 2, 0)
    le.addColorStop(0, rgba(p.c1, 0))
    le.addColorStop(0.5, rgba(mix(p.c1, '#ffffff', 0.5), 0.6 * I))
    le.addColorStop(1, rgba(p.c2, 0))
    q.strokeStyle = le
    q.lineWidth = Math.max(1, u * 0.0025)
    q.beginPath()
    top.forEach((pt, i) => (i ? q.lineTo(pt[0], pt[1]) : q.moveTo(pt[0], pt[1])))
    q.stroke()
  }
  g.globalCompositeOperation = 'lighter'
  if (p.glow > 0) {
    g.globalAlpha = Math.min(1, p.glow)
    g.drawImage(blur(c, u * 0.03), 0, 0)
    g.globalAlpha = 1
  }
  g.drawImage(p.soft > 0 ? blur(c, p.soft * u * 0.015) : c, 0, 0)
  g.globalCompositeOperation = 'source-over'
}

const light: Painter = (g, W, H, p) => {
  const D = Math.hypot(W, H)
  const I = p.int
  const cx = W * (0.5 + p.sx)
  const cy = H * (0.5 + p.sy)
  const r = D * p.rad
  const hard = 1 - p.soft
  const rad = (x: number, y: number, rr: number, col: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rr)
    gr.addColorStop(0, rgba(col, 0.85 * I))
    gr.addColorStop(Math.max(0.02, hard * 0.6), rgba(col, 0.55 * I))
    gr.addColorStop(1, rgba(col, 0))
    g.fillStyle = gr
    g.fillRect(0, 0, W, H)
  }
  g.globalCompositeOperation = 'lighter'
  if (p.mode === 'dual') {
    rad(cx, cy, r, p.c1)
    rad(W - cx, H - cy, r, p.c2)
  } else if (p.mode === 'linear') {
    const a = p.ang * DEG
    const dx = (Math.cos(a) * D) / 2
    const dy = (Math.sin(a) * D) / 2
    const lg = g.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy)
    lg.addColorStop(0, rgba(p.c1, 0.8 * I))
    lg.addColorStop(0.5, rgba(p.c1, 0))
    lg.addColorStop(0.5, rgba(p.c2, 0))
    lg.addColorStop(1, rgba(p.c2, 0.8 * I))
    g.fillStyle = lg
    g.fillRect(0, 0, W, H)
  } else if (p.mode === 'rim') {
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.15 + hard * 0.3), W / 2, H / 2, D / 2)
    gr.addColorStop(0, rgba(p.c1, 0))
    gr.addColorStop(0.7, rgba(p.c1, 0.45 * I))
    gr.addColorStop(1, rgba(p.c2, 0.9 * I))
    g.fillStyle = gr
    g.fillRect(0, 0, W, H)
  } else rad(cx, cy, r, p.c1)
  g.globalCompositeOperation = 'source-over'
}

const streak: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const D = Math.hypot(W, H)
  const n = Math.max(1, Math.round(p.count))
  const c = mk(W, H)
  const q = ctx(c)
  const I = p.int
  q.translate(W / 2, H / 2)
  q.rotate(p.ang * DEG)
  q.lineCap = 'round'
  for (let k = 0; k < n; k++) {
    const y0 = (R() - 0.5) * H * p.spread
    const L = D * p.len * (0.5 + R() * 0.5)
    const x0 = -L / 2 + (R() - 0.5) * D * 0.2
    const cv = (p.curve + (R() - 0.5) * 0.3) * H * 0.5
    const th = u * (0.002 + p.thick * 0.02) * (0.5 + R())
    const sh = Math.max(0.05, Math.min(0.95, wrap(R() + t * 0.25, 1)))
    const col = R() < 0.5 ? p.c1 : mix(p.c1, p.c2, 0.6)
    const lg = q.createLinearGradient(x0, 0, x0 + L, 0)
    lg.addColorStop(0, rgba(col, 0))
    lg.addColorStop(sh, rgba(col, Math.min(1, I)))
    lg.addColorStop(1, rgba(col, 0))
    const lw = q.createLinearGradient(x0, 0, x0 + L, 0)
    lw.addColorStop(0, 'rgba(255,255,255,0)')
    lw.addColorStop(sh, `rgba(255,255,255,${(0.8 * Math.min(1, I)).toFixed(3)})`)
    lw.addColorStop(1, 'rgba(255,255,255,0)')
    q.beginPath()
    q.moveTo(x0, y0)
    q.quadraticCurveTo(x0 + L / 2, y0 + cv, x0 + L, y0)
    q.strokeStyle = lg
    q.lineWidth = th
    q.stroke()
    q.strokeStyle = lw
    q.lineWidth = th * 0.35
    q.stroke()
  }
  g.globalCompositeOperation = 'lighter'
  if (p.glow > 0) {
    g.globalAlpha = Math.min(1, p.glow * 1.2)
    g.drawImage(blur(c, u * (0.005 + p.glow * 0.03)), 0, 0)
    g.drawImage(blur(c, u * 0.004), 0, 0)
    g.globalAlpha = 1
  }
  g.drawImage(c, 0, 0)
  g.globalCompositeOperation = 'source-over'
}

const atmos: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const I = p.int
  const sd = (R() * 1000) | 0
  const fr = p.from
  if (p.haze > 0) {
    if (fr === 'all') {
      g.fillStyle = rgba(p.c1, 0.5 * p.haze * I)
      g.fillRect(0, 0, W, H)
    } else {
      const lg = fr === 'top' ? g.createLinearGradient(0, 0, 0, H) : g.createLinearGradient(0, H, 0, 0)
      lg.addColorStop(0, rgba(p.c1, 0.75 * p.haze * I))
      lg.addColorStop(Math.max(0.05, Math.min(1, p.band)), rgba(p.c1, 0))
      g.fillStyle = lg
      g.fillRect(0, 0, W, H)
    }
  }
  if (p.fog > 0) {
    const c = mk(W, H)
    const q = ctx(c)
    const n = Math.round(20 + p.fog * 80)
    for (let i = 0; i < n; i++) {
      const x = wrap(R() * W * 1.4 + t * u * 0.02 * (0.5 + R()), W * 1.4) - W * 0.2
      const yb = R()
      const y = fr === 'top' ? yb * H * p.band : fr === 'all' ? yb * H : H - yb * H * p.band
      const rr = u * (0.08 + R() * 0.2)
      q.save()
      q.translate(x, y)
      q.scale(2.5, 1)
      dot(q, 0, 0, rr, p.c1, 0.22 * p.fog)
      q.restore()
    }
    g.globalAlpha = Math.min(1, I)
    g.drawImage(blur(c, u * (0.005 + p.soft * 0.03)), 0, 0)
    g.globalAlpha = 1
  }
  if (p.dust > 0) {
    const m = Math.round(p.dust * 220)
    for (let j = 0; j < m; j++) {
      const dx = R() * W + noise(j, t * 0.2, sd) * u * 0.03
      const dy = wrap(R() * H + noise(j + 50, t * 0.2, sd) * u * 0.03 - t * u * 0.01, H)
      const ds = u * (0.001 + Math.pow(R(), 3) * 0.006)
      dot(g, dx, dy, ds * 3, p.c1, (0.3 + R() * 0.6) * Math.min(1, I))
    }
  }
}

const leak: Painter = (g, W, H, p, R, t) => {
  const D = Math.hypot(W, H)
  const a = p.ang * DEG
  const ex = W / 2 + Math.cos(a) * W * 0.55
  const ey = H / 2 + Math.sin(a) * H * 0.55
  const I = p.int
  const n = 3 + Math.round(p.spread * 4)
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const ox = ex + (R() - 0.5) * W * p.spread * 0.8 + Math.sin(t * 0.5 + i) * W * 0.03
    const oy = ey + (R() - 0.5) * H * p.spread * 0.8
    const rr = D * p.size * (0.25 + R() * 0.5)
    g.save()
    g.translate(ox, oy)
    g.rotate(a + Math.PI / 2)
    g.scale(1.8, 1)
    dot(g, 0, 0, rr, i % 2 ? p.c2 : p.c1, 0.55 * I * (0.5 + R() * 0.5))
    g.restore()
  }
  g.globalCompositeOperation = 'source-over'
}

const vign: Painter = (g, W, H, p, _R, t) => {
  if (p.vig > 0) {
    g.save()
    g.translate(W / 2, H / 2)
    g.scale(W / 2, H / 2)
    const gr = g.createRadialGradient(0, 0, Math.max(0, (1 - p.feather) * 0.9), 0, 0, 1.42)
    gr.addColorStop(0, rgba(p.c1, 0))
    gr.addColorStop(1, rgba(p.c1, Math.min(1, p.vig)))
    g.fillStyle = gr
    g.fillRect(-1, -1, 2, 2)
    g.restore()
  }
  if (p.grain > 0) {
    const gs = 1 + p.gsize * 2.5
    const T = mk(192, 192)
    const q = ctx(T)
    const d = q.createImageData(192, 192)
    const a = d.data
    const GR = rng(((t * 24) | 0) + 11)
    const al = Math.round(p.grain * 110)
    for (let i = 0; i < a.length; i += 4) {
      const v = GR() < 0.5 ? 0 : 255
      a[i] = v
      a[i + 1] = v
      a[i + 2] = v
      a[i + 3] = Math.round(GR() * al)
    }
    q.putImageData(d, 0, 0)
    const pt = g.createPattern(T, 'repeat')
    if (!pt) return
    g.save()
    g.scale(gs, gs)
    g.fillStyle = pt
    g.fillRect(0, 0, W / gs + 1, H / gs + 1)
    g.restore()
  }
}

const parts: Painter = (g, W, H, p, R, t) => {
  const u = Math.min(W, H)
  const n = Math.round(p.count)
  const a0 = p.dir * DEG
  const I = p.int
  const sd = (R() * 1000) | 0
  const ty = p.type
  g.globalCompositeOperation = ty === 'ash' ? 'source-over' : 'lighter'
  g.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const r0 = R()
    const r1 = R()
    const r2 = R()
    const r3 = R()
    const ang = a0 + (r3 - 0.5) * p.spread * Math.PI
    const v = (0.3 + r2) * p.speed
    const dist = t * v * u * 0.25
    const x = wrap(r1 * W + Math.cos(ang) * dist, W)
    const y = wrap(r0 * H + Math.sin(ang) * dist, H)
    const sz = u * (0.002 + r2 * r2 * 0.012) * (0.4 + p.size * 1.6)
    const col = r3 < 0.5 ? p.c1 : p.c2
    const al = Math.min(1, I)
    if (ty === 'sparks' || ty === 'rain') {
      const tl = u * (0.02 + p.trail * 0.2) * (0.5 + r2)
      const tx = x - Math.cos(ang) * tl
      const tyy = y - Math.sin(ang) * tl
      const lg = g.createLinearGradient(x, y, tx, tyy)
      lg.addColorStop(0, rgba(ty === 'rain' ? p.c2 : '#ffffff', al * (ty === 'rain' ? 0.55 : 1)))
      lg.addColorStop(0.3, rgba(col, al * 0.6))
      lg.addColorStop(1, rgba(col, 0))
      g.strokeStyle = lg
      g.lineWidth = Math.max(1, sz * (ty === 'rain' ? 0.35 : 0.6))
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(tx, tyy)
      g.stroke()
      if (ty === 'sparks') dot(g, x, y, sz * 3 * (0.5 + p.glow), col, al * 0.6)
    } else if (ty === 'stars' || ty === 'magic') {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1)
      const mx = ty === 'magic' ? x + noise(i, t * 0.4, sd) * u * 0.04 : x
      const my = ty === 'magic' ? y + noise(i + 70, t * 0.4, sd) * u * 0.04 : y
      dot(g, mx, my, sz * (ty === 'magic' ? 4 : 2.5) * (0.5 + p.glow), col, al * tw)
      if (r2 > 0.8) {
        g.strokeStyle = rgba('#ffffff', al * 0.7 * tw)
        g.lineWidth = Math.max(0.6, sz * 0.2)
        g.beginPath()
        g.moveTo(mx - sz * 5, my)
        g.lineTo(mx + sz * 5, my)
        g.moveTo(mx, my - sz * 5)
        g.lineTo(mx, my + sz * 5)
        g.stroke()
      }
      g.fillStyle = rgba('#ffffff', al * tw)
      g.fillRect(mx - sz * 0.3, my - sz * 0.3, sz * 0.6, sz * 0.6)
    } else if (ty === 'bokeh') {
      const br = sz * 6
      g.fillStyle = rgba(col, al * 0.16)
      g.beginPath()
      g.arc(x, y, br, 0, TAU)
      g.fill()
      g.strokeStyle = rgba(col, al * 0.3)
      g.lineWidth = Math.max(1, br * 0.06)
      g.stroke()
    } else if (ty === 'snow') dot(g, x + Math.sin(t * 1.5 + i) * u * 0.01, y, sz * 2, '#ffffff', al * 0.9)
    else if (ty === 'ash') {
      g.fillStyle = rgba(r3 < 0.5 ? '#4a4642' : '#8b857c', al * 0.8)
      g.save()
      g.translate(x, y)
      g.rotate(r1 * TAU + t * (r2 - 0.5) * 4)
      g.fillRect(-sz, -sz * 0.4, sz * 2, sz * 0.8)
      g.restore()
    } else if (ty === 'fireflies') {
      const fl = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7))
      const fx = x + noise(i, t * 0.3, sd) * u * 0.05
      const fy = y + noise(i + 99, t * 0.3, sd) * u * 0.05
      dot(g, fx, fy, sz * 5 * (0.5 + p.glow), col, al * fl * 0.7)
      dot(g, fx, fy, sz, '#ffffff', al * fl)
    } else {
      dot(g, x, y, sz * (ty === 'embers' ? 3 : 2) * (0.5 + p.glow), col, al * (ty === 'dust' ? 0.5 : 0.9))
      if (ty === 'embers') {
        g.fillStyle = rgba('#fff3c4', al)
        g.beginPath()
        g.arc(x, y, Math.max(0.5, sz * 0.5), 0, TAU)
        g.fill()
      }
    }
  }
  g.globalCompositeOperation = 'source-over'
}

/** Bloom leser pikslene som allerede er tegnet under laget. */
function bloom(g: G, p: FxP, w: number, h: number) {
  const cv = g.canvas
  if (!cv?.width) return
  const k = Math.min(0.25, 640 / Math.max(cv.width, cv.height))
  const sw = Math.max(2, Math.round(cv.width * k))
  const sh = Math.max(2, Math.round(cv.height * k))
  const s = mk(sw, sh)
  const q = ctx(s)
  q.drawImage(cv, 0, 0, sw, sh)
  let d: ImageData
  try {
    d = q.getImageData(0, 0, sw, sh)
  } catch {
    return
  }
  const a = d.data
  const th = p.thr * 255
  const tc = rgb(p.c1)
  const tn = p.tint
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i] ?? 0
    const gg = a[i + 1] ?? 0
    const b = a[i + 2] ?? 0
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b
    const f = l <= th ? 0 : (l - th) / Math.max(1, 255 - th)
    a[i] = (r * (1 - tn) + tc[0] * tn) * f
    a[i + 1] = (gg * (1 - tn) + tc[1] * tn) * f
    a[i + 2] = (b * (1 - tn) + tc[2] * tn) * f
    a[i + 3] = 255
  }
  q.putImageData(d, 0, 0)
  const b1 = blur(s, Math.max(1, sw * (0.008 + p.rad * 0.04)))
  const b2 = blur(s, Math.max(1, sw * 0.004))
  g.save()
  g.beginPath()
  g.rect(-w / 2, -h / 2, w, h)
  g.clip()
  g.setTransform(1, 0, 0, 1, 0, 0)
  const A = g.globalAlpha
  g.globalAlpha = A * Math.min(1, p.int)
  g.drawImage(b1, 0, 0, cv.width, cv.height)
  g.drawImage(b2, 0, 0, cv.width, cv.height)
  if (p.int > 1) {
    g.globalAlpha = A * (p.int - 1)
    g.drawImage(b1, 0, 0, cv.width, cv.height)
  }
  g.restore()
}

export const PARTS: [string, string][] = [['sparks', 'Gnister'], ['embers', 'Glør'], ['dust', 'Støv'], ['snow', 'Snø'], ['rain', 'Regn'], ['stars', 'Stjerner'], ['fireflies', 'Ildfluer'], ['bokeh', 'Bokeh'], ['ash', 'Aske'], ['magic', 'Magisk']]

export interface FxKind { l: string; blend: GlobalCompositeOperation; anim?: boolean; live?: boolean; p: ParamDef[]; f?: Painter }

export const KINDS: Record<string, FxKind> = {
  sun: { l: 'Sollys', blend: 'screen', f: sun, p: [X(-0.32), Y(-0.36), INT(), PR('rays', 'Antall stråler', 0, 60, 1, 18), PR('len', 'Strålelengde', 0.1, 1.6, 0.01, 0.9), PR('spread', 'Spredning', 5, 360, 1, 70), PR('dir', 'Retning', -180, 180, 1, 40), PR('width', 'Strålebredde', 0.1, 3, 0.01, 1), PR('glow', 'Glød', 0, 1, 0.01, 0.45), PR('flare', 'Linseblink', 0, 1, 0.01, 0.3), PR('soft', 'Mykhet', 0, 1, 0.01, 0.5), PC('c1', 'Farge', '#ffd08a'), PC('c2', 'Kjernefarge', '#fff3dc')] },
  spot: { l: 'Spotlys', blend: 'screen', f: spot, p: [PS('shape', 'Form', [['cone', 'Kjegle'], ['circle', 'Sirkel'], ['ellipse', 'Ellipse']], 'cone'), X(0), Y(-0.5), INT(), PR('ang', 'Retning', -180, 180, 1, 90), PR('beam', 'Strålevinkel', 4, 120, 1, 28), PR('len', 'Lengde', 0.1, 1.6, 0.01, 1), PR('soft', 'Mykhet', 0, 1, 0.01, 0.4), PR('pool', 'Lysflekk', 0, 1, 0.01, 0.6), PR('haze', 'Støv i strålen', 0, 1, 0.01, 0.3), PC('c1', 'Farge', '#fff4e0')] },
  moon: { l: 'Måne', blend: 'source-over', f: moon, p: [X(0.25), Y(-0.25), INT(), PR('size', 'Størrelse', 0.04, 0.9, 0.01, 0.22), PR('phase', 'Månefase', 0, 1, 0.01, 0.5), PR('rot', 'Rotasjon', -180, 180, 1, 0), PR('tex', 'Overflate', 0, 1, 0.01, 0.7), PR('halo', 'Glorie', 0, 1, 0.01, 0.5), PR('light', 'Måneskinn', 0, 1, 0.01, 0.3), PR('clouds', 'Skyer og dis', 0, 1, 0.01, 0), PC('c1', 'Månefarge', '#f1efe6'), PC('c2', 'Lysfarge', '#9fc2ff')] },
  fire: { l: 'Ild', blend: 'screen', anim: true, f: fire, p: [PS('shape', 'Form', [['flame', 'Flammer'], ['ball', 'Ildkule'], ['trail', 'Ildspor']], 'flame'), X(0), Y(0.35), INT(), PR('height', 'Høyde', 0.05, 1.2, 0.01, 0.6), PR('width', 'Bredde', 0.03, 1, 0.01, 0.3), PR('turb', 'Turbulens', 0, 1, 0.01, 0.5), PR('lean', 'Vind', -1, 1, 0.01, 0), PR('embers', 'Glør', 0, 1, 0.01, 0.5), PR('glow', 'Lysspill', 0, 1, 0.01, 0.5), PR('smoke', 'Røyk', 0, 1, 0.01, 0), PC('c1', 'Kjerne', '#fff1a8'), PC('c2', 'Flamme', '#ff5a14')] },
  smoke: { l: 'Røyk', blend: 'source-over', anim: true, f: smoke, p: [PS('mode', 'Type', [['rise', 'Stigende'], ['cloud', 'Sky'], ['fog', 'Bakketåke'], ['trail', 'Spor']], 'rise'), X(0), Y(0.4), PR('int', 'Dekkevne', 0, 1, 0.01, 0.85), PR('dens', 'Tetthet', 0, 1, 0.01, 0.5), PR('size', 'Størrelse', 0, 1, 0.01, 0.5), PR('rise', 'Høyde', 0.1, 1.2, 0.01, 0.8), PR('turb', 'Turbulens', 0, 1, 0.01, 0.5), PR('wind', 'Vind', -1, 1, 0.01, 0), PR('soft', 'Mykhet', 0, 1, 0.01, 0.6), PC('c1', 'Farge', '#d9d9d9')] },
  veil: { l: 'Slør', blend: 'screen', anim: true, f: veil, p: [INT(), PR('count', 'Antall bånd', 1, 8, 1, 3), PR('width', 'Tykkelse', 0, 1, 0.01, 0.5), PR('wave', 'Bølge', 0, 1, 0.01, 0.5), PR('freq', 'Frekvens', 0, 1, 0.01, 0.5), PR('twist', 'Folder', 0, 1, 0.01, 0.5), PR('ang', 'Vinkel', -90, 90, 1, -15), PR('glow', 'Glød', 0, 1, 0.01, 0.5), PR('soft', 'Mykhet', 0, 1, 0.01, 0.3), PC('c1', 'Farge 1', '#ffffff'), PC('c2', 'Farge 2', '#ffd9f0')] },
  light: { l: 'Farget lys', blend: 'screen', f: light, p: [PS('mode', 'Type', [['radial', 'Punkt'], ['dual', 'To farger'], ['linear', 'Toning'], ['rim', 'Kantlys']], 'radial'), X(-0.3), Y(0), INT(), PR('rad', 'Rekkevidde', 0.05, 1.5, 0.01, 0.6), PR('ang', 'Vinkel', -180, 180, 1, 0), PR('soft', 'Mykhet', 0, 1, 0.01, 0.5), PC('c1', 'Farge 1', '#3d7bff'), PC('c2', 'Farge 2', '#ff3dbb')] },
  streak: { l: 'Lysstriper', blend: 'screen', anim: true, f: streak, p: [INT(), PR('count', 'Antall', 1, 30, 1, 5), PR('curve', 'Krumning', -1, 1, 0.01, 0.4), PR('thick', 'Tykkelse', 0, 1, 0.01, 0.3), PR('len', 'Lengde', 0.1, 1.5, 0.01, 1), PR('spread', 'Spredning', 0, 1, 0.01, 0.5), PR('ang', 'Vinkel', -180, 180, 1, -20), PR('glow', 'Glød', 0, 1, 0.01, 0.6), PC('c1', 'Farge 1', '#ffcf7a'), PC('c2', 'Farge 2', '#ffffff')] },
  atmos: { l: 'Atmosfære', blend: 'source-over', anim: true, f: atmos, p: [PS('from', 'Retning', [['bottom', 'Nedenfra'], ['top', 'Ovenfra'], ['all', 'Hele bildet']], 'bottom'), PR('int', 'Dekkevne', 0, 1, 0.01, 0.8), PR('fog', 'Tåke', 0, 1, 0.01, 0.5), PR('band', 'Høyde', 0.05, 1, 0.01, 0.5), PR('haze', 'Dis', 0, 1, 0.01, 0.3), PR('dust', 'Støv', 0, 1, 0.01, 0.3), PR('soft', 'Mykhet', 0, 1, 0.01, 0.7), PC('c1', 'Farge', '#e8ecf2')] },
  bloom: { l: 'Glød og bloom', blend: 'screen', live: true, p: [INT(0.8), PR('thr', 'Terskel', 0, 1, 0.01, 0.6), PR('rad', 'Radius', 0, 1, 0.01, 0.5), PR('tint', 'Fargelegging', 0, 1, 0.01, 0), PC('c1', 'Farge', '#ffffff')] },
  leak: { l: 'Lyslekkasje', blend: 'screen', anim: true, f: leak, p: [INT(0.8), PR('ang', 'Kant', -180, 180, 1, 30), PR('size', 'Størrelse', 0.1, 1.2, 0.01, 0.6), PR('spread', 'Spredning', 0, 1, 0.01, 0.5), PC('c1', 'Farge 1', '#ff7a2e'), PC('c2', 'Farge 2', '#ffd36b')] },
  vign: { l: 'Vignett og korn', blend: 'source-over', anim: true, f: vign, p: [PR('vig', 'Vignett', 0, 1, 0.01, 0.5), PR('feather', 'Mykhet', 0, 1, 0.01, 0.6), PR('grain', 'Filmkorn', 0, 1, 0.01, 0.2), PR('gsize', 'Kornstørrelse', 0, 1, 0.01, 0.3), PC('c1', 'Farge', '#000000')] },
  parts: { l: 'Partikler', blend: 'screen', anim: true, f: parts, p: [PS('type', 'Type', PARTS, 'sparks'), INT(), PR('count', 'Antall', 5, 600, 1, 120), PR('size', 'Størrelse', 0, 1, 0.01, 0.4), PR('glow', 'Glød', 0, 1, 0.01, 0.5), PR('dir', 'Retning', -180, 180, 1, -90), PR('spread', 'Spredning', 0, 1, 0.01, 0.5), PR('speed', 'Fart', 0, 2, 0.01, 0.5), PR('trail', 'Spor', 0, 1, 0.01, 0.3), PC('c1', 'Farge 1', '#ffc15a'), PC('c2', 'Farge 2', '#ffffff')] },
}

/** Et effektlag (Photo Design og Motion Design). */
export interface FxLayerLike { id?: string; fx: string; p?: Record<string, unknown>; seed?: number }

/** Parameterne med standardverdier for laget sin effekt. */
export function params(L: FxLayerLike): FxP {
  const K = KINDS[L.fx]
  const o: Record<string, number | string> = {}
  if (!K) return o as unknown as FxP
  const p = L.p ?? {}
  for (const d of K.p) {
    const v = p[d.k]
    if (d.t === 'r') o[d.k] = v == null || !Number.isFinite(Number(v)) ? d.def : Number(v)
    else o[d.k] = v == null ? d.def : String(v)
  }
  return o as unknown as FxP
}

export function paint(q: G, W: number, H: number, fx: string, p: FxP, seed: number | undefined, t: number): void {
  const K = KINDS[fx]
  if (!K?.f) return
  try {
    K.f(q, W, H, p, rng((seed || 1) * 9973), t || 0)
  } catch (e) {
    console.warn('MLFX', fx, e)
  }
}

const CACHE = new Map<string, { k: string; c: HTMLCanvasElement }>()

/** Tegner laget sentrert i origo (samme konvensjon som lagene i Photo Design). */
export function draw(g: G, L: FxLayerLike, w: number, h: number, o: { t?: number; full?: boolean; scale?: number } = {}): void {
  const K = KINDS[L.fx]
  if (!K || !w || !h) return
  const p = params(L)
  const t = Number(o.t) || 0
  if (K.live) {
    bloom(g, p, w, h)
    return
  }
  const m = g.getTransform ? g.getTransform() : null
  let s = m ? Math.hypot(m.a, m.b) : o.scale || 1
  const cap = o.full ? 4096 : 1600
  s = Math.min(s || 1, cap / Math.max(Math.abs(w), Math.abs(h)))
  const W = Math.max(2, Math.round(Math.abs(w) * s))
  const H = Math.max(2, Math.round(Math.abs(h) * s))
  const key = `${W}x${H}|${L.fx}|${JSON.stringify(p)}|${L.seed || 1}|${K.anim ? t.toFixed(4) : 0}`
  const ck = L.id || 'x'
  let e = CACHE.get(ck)
  if (!e || e.k !== key) {
    const c = mk(W, H)
    paint(ctx(c), W, H, L.fx, p, L.seed, t)
    e = { k: key, c }
    if (CACHE.size > 200) CACHE.clear()
    CACHE.set(ck, e)
  }
  g.drawImage(e.c, -w / 2, -h / 2, w, h)
}

// ---------- forhåndsvalg (effektbibliotek) ----------

export const PAL: [string, string, string][] = [['Gull', '#ffc46b', '#ff8a3d'], ['Hvit', '#fff6e8', '#ffffff'], ['Isblå', '#9fd4ff', '#3d7bff'], ['Cyan', '#5ff3ff', '#00a3c4'], ['Lilla', '#b78cff', '#6b3dff'], ['Magenta', '#ff6ad5', '#c21d8f'], ['Rød', '#ff5a4a', '#b0141e'], ['Grønn', '#8dff9e', '#20b26b']]
export const STR: [string, number][] = [['Myk', 0.6], ['Middels', 1], ['Sterk', 1.45]]
type Look = [string, Record<string, number | string>]
const LOOKS: Record<string, Look[]> = {
  sun: [['Gyllen time', {}], ['Solstråler', { rays: 40, width: 0.5, spread: 40, len: 1.3, glow: 0.3 }], ['Motlys', { sx: 0, sy: -0.15, spread: 360, rays: 30, glow: 0.75, flare: 0, len: 0.7 }], ['Høy sol', { sx: 0.3, sy: -0.48, dir: 110, spread: 50, rays: 12, width: 2 }], ['Linseblink', { rays: 0, glow: 0.3, flare: 1 }], ['Myk sol', { rays: 8, soft: 1, width: 3, glow: 0.8, flare: 0 }]],
  spot: [['Scenelys', {}], ['Bred kjegle', { beam: 60, pool: 0.8, haze: 0.1 }], ['Smal stråle', { beam: 12, len: 1.3, haze: 0.6, soft: 0.2 }], ['Sidelys', { sx: -0.55, sy: -0.2, ang: 20, beam: 40 }], ['Rundt spot', { shape: 'circle', sy: 0, len: 0.5, soft: 0.5 }], ['Oval spot', { shape: 'ellipse', sy: 0.2, len: 0.6, soft: 0.3 }]],
  moon: [['Fullmåne', {}], ['Månesigd', { phase: 0.15, halo: 0.6 }], ['Halvmåne', { phase: 0.25 }], ['Voksende måne', { phase: 0.38 }], ['Stor måne', { size: 0.5, sy: -0.1, halo: 0.3 }], ['Skymåne', { clouds: 0.7, halo: 0.7, light: 0.5 }]],
  fire: [['Bål', {}], ['Høye flammer', { height: 0.85, width: 0.2, turb: 0.7 }], ['Små flammer', { height: 0.3, width: 0.25, sy: 0.4 }], ['Ildkule', { shape: 'ball', sy: 0, width: 0.3, height: 0.5, embers: 0.8 }], ['Ildspor', { shape: 'trail', width: 0.7, height: 0.35 }], ['Flammer i vind', { lean: 0.8, turb: 0.8, embers: 0.9 }]],
  smoke: [['Stigende røyk', {}], ['Tynn røyk', { dens: 0.2, size: 0.3, turb: 0.8 }], ['Tett røyk', { dens: 1, size: 0.8, soft: 0.8 }], ['Røyksky', { mode: 'cloud', sy: 0, size: 0.6 }], ['Bakketåke', { mode: 'fog', rise: 0.6, dens: 0.7 }], ['Røykspor', { mode: 'trail', sy: 0, turb: 0.7 }]],
  veil: [['Slør', {}], ['Silkebånd', { count: 1, width: 0.35, wave: 0.7, glow: 0.8 }], ['Mange bånd', { count: 7, width: 0.25, wave: 0.4 }], ['Rolig bølge', { count: 2, wave: 0.25, freq: 0.2, width: 0.8 }], ['Diagonalt slør', { ang: -45, count: 3 }], ['Drømmeslør', { soft: 1, glow: 1, width: 1, count: 4 }]],
  light: [['Punktlys', {}], ['To farger', { mode: 'dual' }], ['Fargetoning', { mode: 'linear', ang: 0 }], ['Kantlys', { mode: 'rim' }], ['Lys ovenfra', { sx: 0.3, sy: -0.5, rad: 0.5 }], ['Neonpunkt', { rad: 0.25, soft: 0.1, sx: 0.2, sy: 0.1 }]],
  streak: [['Lysstriper', {}], ['Tynne linjer', { thick: 0.05, count: 12, glow: 0.4 }], ['Brede bånd', { thick: 1, count: 3, glow: 0.9 }], ['Rette striper', { curve: 0, ang: 0, count: 8 }], ['Buer', { curve: 1, count: 4 }], ['Diagonale striper', { ang: -40, spread: 1, count: 10 }]],
  atmos: [['Tåke', {}], ['Dis', { fog: 0, haze: 0.8, band: 0.8 }], ['Støv i lyset', { fog: 0, haze: 0, dust: 0.9 }], ['Tett tåke', { fog: 1, band: 0.8, haze: 0.5 }], ['Tåke ovenfra', { from: 'top' }], ['Tåke over alt', { from: 'all', fog: 0.4, haze: 0.3, dust: 0.3 }]],
  bloom: [['Bloom', {}], ['Sterk glød', { thr: 0.45, rad: 0.7 }], ['Mykt skjær', { thr: 0.7, rad: 1, int: 0.6 }], ['Høylys', { thr: 0.8, rad: 0.3 }], ['Drømmeglød', { thr: 0.35, rad: 1 }], ['Fargeglød', { tint: 0.7 }]],
  leak: [['Lyslekkasje', {}], ['Hjørnelekkasje', { ang: -135, size: 0.5 }], ['Stor lekkasje', { size: 1, spread: 0.8 }], ['Lekkasje nedenfra', { ang: 90 }], ['Smal stripe', { spread: 0.1, size: 0.4 }], ['Toppkant', { ang: -90, spread: 0.9 }]],
  vign: [['Vignett', {}], ['Sterk vignett', { vig: 0.9, feather: 0.4 }], ['Myk vignett', { vig: 0.35, feather: 0.9 }], ['Filmkorn', { vig: 0.2, grain: 0.5 }], ['Grovt korn', { vig: 0.3, grain: 0.7, gsize: 1 }], ['Kinoramme', { vig: 0.7, feather: 0.2, grain: 0.25 }]],
  parts: [['Gnister', { type: 'sparks' }], ['Glør', { type: 'embers', count: 80 }], ['Støv', { type: 'dust', count: 200, size: 0.2 }], ['Snø', { type: 'snow', dir: 90, count: 250 }], ['Stjerner', { type: 'stars', count: 180 }], ['Ildfluer', { type: 'fireflies', count: 40 }], ['Bokeh', { type: 'bokeh', count: 40, size: 0.6 }], ['Regn', { type: 'rain', dir: 100, count: 300, trail: 0.6 }]],
}

function colorsFor(fx: string, pal: [string, string, string]): Record<string, number | string> {
  const a = pal[1]
  const b = pal[2]
  if (fx === 'fire') return { c1: mix(a, '#ffffff', 0.55), c2: b }
  if (fx === 'smoke') return { c1: mix(a, '#d9d9d9', 0.6) }
  if (fx === 'moon') return { c1: mix(a, '#f1efe6', 0.8), c2: b }
  if (fx === 'atmos') return { c1: mix(a, '#e8ecf2', 0.55) }
  if (fx === 'vign') return { c1: mix(b, '#000000', 0.8) }
  if (fx === 'bloom') return { c1: a, tint: 0.35 }
  if (fx === 'spot') return { c1: mix(a, '#ffffff', 0.35) }
  return { c1: a, c2: b }
}

export interface Preset { id: string; fx: string; look?: string; pal?: string; str?: string; name: string; p: Record<string, number | string>; blend: GlobalCompositeOperation; seed: number; custom?: boolean }

let PRESETS: Preset[] | null = null

/** 80 looks × 8 paletter × 3 styrker = 1920 forhåndsvalg (samme ID-er som i dag). */
export function presets(): Preset[] {
  if (PRESETS) return PRESETS
  const out: Preset[] = []
  for (const fx of Object.keys(LOOKS)) {
    const K = KINDS[fx] as FxKind
    const intDef = K.p.find((d) => d.k === 'int')
    const intD = intDef && intDef.t === 'r' ? intDef.def : null
    ;(LOOKS[fx] as Look[]).forEach((lk, li) => {
      PAL.forEach((pal, pi) => {
        STR.forEach((st, si) => {
          const p: Record<string, number | string> = { ...lk[1], ...colorsFor(fx, pal) }
          if (intD != null) {
            const mx = fx === 'smoke' || fx === 'atmos' ? 1 : 2
            p.int = Math.min(mx, +((p.int != null ? Number(p.int) : intD) * st[1]).toFixed(2))
          } else if (fx === 'vign') p.vig = Math.min(1, +((p.vig != null ? Number(p.vig) : 0.5) * st[1]).toFixed(2))
          out.push({ id: `${fx}-${li}-${pi}-${si}`, fx, look: lk[0], pal: pal[0], str: st[0], name: `${lk[0]} · ${pal[0]} · ${st[0]}`, p, blend: K.blend, seed: 1 + li * 97 + pi * 13 + si * 5 })
        })
      })
    })
  }
  PRESETS = out
  return out
}

/** Miniatyr: effekten over en mørk scene med noen lyspunkter (så bloom og skjermblanding synes). */
/**
 * Miniatyr av et forhåndsvalg i W × H piksler. Tegningen er oppløsningsuavhengig (som effektlagene), så kallet bør be om
 * kortets faktiske størrelse × devicePixelRatio; da vises den uten oppskalering. WebP (PNG der WebP ikke kan lages)
 * holder de myke lysovergangene fri for JPEG-blokker.
 */
export function thumb(pr: Pick<Preset, 'fx' | 'p' | 'seed' | 'blend'>, W = 132, H = 88): string {
  const c = mk(W, H)
  const k = W / 132
  const g = ctx(c)
  const lt = pr.fx === 'bloom' || pr.fx === 'vign'
  const bg = g.createLinearGradient(0, 0, 0, H)
  if (lt) {
    bg.addColorStop(0, '#8fb3d9')
    bg.addColorStop(0.6, '#e8d7bd')
    bg.addColorStop(1, '#6b5a48')
  } else {
    bg.addColorStop(0, '#1d2634')
    bg.addColorStop(0.62, '#0b0e14')
    bg.addColorStop(1, '#171310')
  }
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  if (lt) {
    const sg = g.createRadialGradient(W * 0.68, H * 0.42, 0, W * 0.68, H * 0.42, H * 0.22)
    sg.addColorStop(0, '#ffffff')
    sg.addColorStop(0.5, '#fff4d6')
    sg.addColorStop(1, 'rgba(255,244,214,0)')
    g.fillStyle = sg
    g.fillRect(0, 0, W, H)
  }
  g.fillStyle = '#05070a'
  g.beginPath()
  g.moveTo(0, H * 0.78)
  for (let i = 0; i <= 8; i++) g.lineTo((W * i) / 8, H * (0.72 + (i % 3) * 0.035))
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.fill()
  for (const d of [[0.2, 0.74], [0.46, 0.7], [0.72, 0.76], [0.86, 0.72]] as const) {
    g.fillStyle = '#ffe9b0'
    g.fillRect(W * d[0], H * d[1], (lt ? 4 : 2) * k, (lt ? 4 : 2) * k)
  }
  const K = KINDS[pr.fx]
  if (!K) return thumbUrl(c)
  const p = params({ fx: pr.fx, p: pr.p, seed: pr.seed })
  g.save()
  g.globalCompositeOperation = pr.blend || K.blend || 'source-over'
  if (K.live) {
    g.translate(W / 2, H / 2)
    bloom(g, p, W, H)
  } else {
    const o = mk(W, H)
    paint(ctx(o), W, H, pr.fx, p, pr.seed, 0)
    g.drawImage(o, 0, 0)
  }
  g.restore()
  return thumbUrl(c)
}

function thumbUrl(c: HTMLCanvasElement): string {
  const u = c.toDataURL('image/webp', 0.92)
  return u.startsWith('data:image/webp') ? u : c.toDataURL('image/png')
}

// ---------- lagring: modus, favoritter, nylig brukt, egne (samme nøkler som i dag) ----------

const LS = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(userKey(k))
    return v == null ? d : (JSON.parse(v) as T)
  } catch {
    return d
  }
}
const SS = (k: string, v: unknown) => {
  try {
    localStorage.setItem(userKey(k), JSON.stringify(v))
  } catch {
    // lagringen er full eller blokkert
  }
}

export const isAdvanced = (): boolean => LS<boolean>('medialab.advanced', false) === true
export function setAdvanced(on: boolean): void {
  SS('medialab.advanced', !!on)
  try {
    window.dispatchEvent(new CustomEvent('ml-advanced', { detail: !!on }))
  } catch {
    // eldre nettlesere
  }
}
export const favs = (): string[] => LS<string[]>('medialab.fx.fav', [])
export function toggleFav(id: string): string[] {
  const a = favs()
  const i = a.indexOf(id)
  if (i >= 0) a.splice(i, 1)
  else a.unshift(id)
  SS('medialab.fx.fav', a.slice(0, 500))
  return a
}
export const recent = (): string[] => LS<string[]>('medialab.fx.recent', [])
export function pushRecent(id: string): void {
  const a = recent().filter((x) => x !== id)
  a.unshift(id)
  SS('medialab.fx.recent', a.slice(0, 24))
}

const BLENDS: GlobalCompositeOperation[] = ['source-over', 'screen', 'lighter', 'multiply', 'overlay', 'soft-light', 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']

/** Kontroll av et eget forhåndsvalg (fra lagring eller fil). */
export function clean(o: unknown): Preset | null {
  const r = o as { id?: unknown; fx?: unknown; name?: unknown; p?: Record<string, unknown>; blend?: unknown; seed?: unknown } | null
  if (!r || typeof r !== 'object' || typeof r.fx !== 'string' || !KINDS[r.fx]) return null
  const K = KINDS[r.fx] as FxKind
  const p: Record<string, number | string> = {}
  for (const d of K.p) {
    const v = r.p?.[d.k]
    if (v == null) continue
    if (d.t === 'r' && Number.isFinite(Number(v))) p[d.k] = Math.max(d.min, Math.min(d.max, Number(v)))
    else if (d.t === 'c' && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) p[d.k] = v
    else if (d.t === 's' && d.o.some((x) => x[0] === v)) p[d.k] = String(v)
  }
  const id = String(r.id ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || Math.random().toString(36).slice(2, 10)
  return {
    id: `c-${id}`, fx: r.fx, name: String(r.name ?? K.l).slice(0, 60), p,
    blend: BLENDS.includes(r.blend as GlobalCompositeOperation) ? (r.blend as GlobalCompositeOperation) : K.blend,
    seed: Math.max(1, Math.min(1e6, (Number(r.seed) | 0) || 1)), custom: true,
  }
}

export const custom = (): Preset[] => (LS<unknown[]>('medialab.fx.custom', []) || []).map(clean).filter((c): c is Preset => !!c)
export function saveCustom(o: Partial<Preset>): Preset[] {
  const a = custom()
  const c = clean({ ...o, id: 'c-' + Date.now().toString(36) })
  if (!c) return a
  a.unshift(c)
  SS('medialab.fx.custom', a.slice(0, 300))
  return a
}
export function renameCustom(id: string, name: string): Preset[] {
  const a = custom().map((c) => (c.id === id ? { ...c, name: String(name || c.name).slice(0, 60) } : c))
  SS('medialab.fx.custom', a)
  return a
}
export function delCustom(id: string): Preset[] {
  const a = custom().filter((c) => c.id !== id)
  SS('medialab.fx.custom', a)
  return a
}
export const exportJSON = (): string => JSON.stringify({ app: 'medialab-fx', v: 1, presets: custom() }, null, 1)
export function importJSON(txt: string): number {
  const j: unknown = JSON.parse(txt)
  const arr = Array.isArray(j) ? j : (j as { presets?: unknown } | null)?.presets
  if (!Array.isArray(arr)) throw new Error('format')
  const got = arr.slice(0, 300).map(clean).filter((c): c is Preset => !!c)
  const a = custom()
  const ids = new Set(a.map((c) => c.id))
  for (const c of got) {
    if (ids.has(c.id)) c.id += '-' + Math.random().toString(36).slice(2, 5)
    a.push(c)
  }
  SS('medialab.fx.custom', a.slice(0, 300))
  return got.length
}
export function byId(id: string): Preset | null {
  if (/^c-/.test(id)) return custom().find((c) => c.id === id) ?? null
  return presets().find((p) => p.id === id) ?? null
}

/** Nytt effektlag som dekker hele dokumentet. */
export function fxLayer(pr: Pick<Preset, 'fx' | 'p' | 'seed' | 'blend'> & { id?: string }, dw: number, dh: number, name?: string) {
  const K = KINDS[pr.fx] as FxKind
  return {
    id: 'f' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4), type: 'fx' as const, name: name || K.l, fx: pr.fx,
    p: JSON.parse(JSON.stringify(pr.p || {})) as Record<string, number | string>, seed: pr.seed || ((Math.random() * 1e5) | 0) + 1, preset: pr.id ?? null,
    x: dw / 2, y: dh / 2, w: dw, h: dh, rot: 0, op: 1, blend: pr.blend || K.blend, hidden: false, locked: false,
  }
}
