/**
 * Rene hjelpefunksjoner og faste data i Loop Studio, portert fra media-lab/src/pages/studio-editor/logic.js.
 * Ingen tilstand og ingen DOM (unntatt der det står), så alt her kan enhetstestes.
 */
import { keyOf, parse, SAMPLE } from './engine/program.js'
import type { ProgramDay } from './engine/program'
import type { BgFill, Cfg, FillStop, FQr, FText, ImgRule, Panel, Pip, Slide, SlideOv, VigLayer, XY } from './engine/types'

export const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v)
const clampN = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d
}

/* ---------- maler ---------- */
export type Tpl = 'week' | 'sunday' | 'youth' | 'blank'
export const TPL_NAMES: Record<Tpl, string> = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' }
export const isTpl = (v: unknown): v is Tpl => typeof v === 'string' && v in TPL_NAMES
export const TPL_TITLES: Record<Tpl, string> = { week: 'Ukeprogram-loop', sunday: 'Søndagsmøte-loop', youth: 'Ungdomsmøte-loop', blank: 'Egen loop' }
export const SLIDE_TYPES = ['day', 'text', 'contact', 'outro'] as const
export const isSlide = (x: unknown): x is Slide => !!x && typeof x === 'object' && typeof (x as Slide).id === 'string' && (SLIDE_TYPES as readonly string[]).includes((x as Slide).type)

/** Lagringsnøkkelen til arbeidskopien per mal (samme navn som i dagens app). */
export function slotOf(tpl: string, customId: string | null): string {
  if (customId) return `ukeloop.custom.${customId}`
  return !tpl || tpl === 'week' ? 'ukeloop.v2' : tpl === 'youth' ? 'ukeloop.v5.youth' : `ukeloop.v2.${tpl}`
}

/* ---------- farger ---------- */
export function normHex(v: unknown): string | null {
  let s = String(v ?? '').trim().replace(/^#?/, '#')
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join('')
  return HEX.test(s) ? s.toLowerCase() : null
}
/** Toning (-100 mørkere … +100 lysere) og varme (-100 kaldere … +100 varmere) på en grunnfarge. */
export function adjustHex(base: string, tone: number, warm: number): string {
  const h = normHex(base) ?? '#000000'
  let r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  const mix = (a: number, c: number, t: number) => a + (c - a) * t
  const w = Math.max(-100, Math.min(100, warm)) / 100
  if (w) { r += 80 * w; g += 18 * w; b -= 80 * w }
  const k = Math.max(-100, Math.min(100, tone)) / 100
  if (k > 0) { r = mix(r, 255, k * 0.9); g = mix(g, 255, k * 0.9); b = mix(b, 255, k * 0.9) }
  else if (k < 0) { r = mix(r, 0, -k * 0.9); g = mix(g, 0, -k * 0.9); b = mix(b, 0, -k * 0.9) }
  const hx = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return '#' + hx(r) + hx(g) + hx(b)
}
export function hexToHsv(hex: string): { hh: number; ss: number; vv: number } {
  const h0 = normHex(hex) ?? '#000000'
  const r = parseInt(h0.slice(1, 3), 16) / 255, g = parseInt(h0.slice(3, 5), 16) / 255, b = parseInt(h0.slice(5, 7), 16) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360 }
  return { hh: h, ss: mx ? d / mx : 0, vv: mx }
}
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const hx = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return '#' + hx(r) + hx(g) + hx(b)
}
export function hsl2hex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0')
  return '#' + f(0) + f(8) + f(4)
}
export const lum = (x: string) => [1, 3, 5].map((j) => parseInt(x.slice(j, j + 2), 16)).reduce((a, v, i) => a + v * ([0.299, 0.587, 0.114][i] ?? 0), 0)

/** Kuraterte paletter, mørk → lys. */
export const PALS: string[][] = [
  ['#2b1a3d', '#6b2d5c', '#c0395a', '#f08a4b', '#f6c667'], ['#0b2545', '#13315c', '#1d6f8a', '#4fb3bf', '#a9e4d7'],
  ['#1b2d1f', '#2f5233', '#5e8c4a', '#a3b86c', '#e3d9a5'], ['#3d1f1a', '#8a3b2a', '#c8643b', '#e3a36b', '#f2dcc0'],
  ['#120a2a', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0'], ['#061a2b', '#0f3d4c', '#1f8a70', '#7ad17a', '#c6f0a0'],
  ['#1e1410', '#4a3226', '#8b5e3c', '#c9a27e', '#efe1ce'], ['#2a0f1a', '#5c1a33', '#9b2c4a', '#d8687a', '#f2b8a2'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], ['#111418', '#2d3640', '#52616f', '#8fa3b3', '#d3dde5'],
  ['#1f1638', '#3f2d6b', '#6c5ba7', '#a894d6', '#e0d6f5'], ['#1a3a2a', '#2e7d4f', '#9bc53d', '#fde74c', '#ff9f1c'],
  ['#0f2a3a', '#1b4b5a', '#ee6c4d', '#f5a07a', '#fbe3c6'], ['#1a1714', '#3b342c', '#6e6456', '#a89b87', '#e2d8c6'],
  ['#0a1128', '#1c3a6b', '#3a7bd5', '#8ec5fc', '#e0f0ff'], ['#0f1f17', '#1e4230', '#b3001b', '#e0a526', '#f4efe6'],
  ['#2b1b22', '#6d3b47', '#b76e79', '#e8b4a0', '#f7e1d7'], ['#10212b', '#235789', '#c1292e', '#f1d302', '#fdfffc'],
  ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'], ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
  ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946'], ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'],
  ['#2d00f7', '#6a00f4', '#8900f2', '#bc00dd', '#f20089'], ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],
  ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'], ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd'],
  ['#5f0f40', '#9a031e', '#fb8b24', '#e36414', '#0f4c5c'], ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'], ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6'],
  ['#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226'], ['#f72585', '#b5179e', '#7209b7', '#480ca8', '#4361ee'],
  ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'], ['#006d77', '#83c5be', '#edf6f9', '#ffddd2', '#e29578'],
  ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90'], ['#10002b', '#240046', '#3c096c', '#5a189a', '#9d4edd'],
  ['#03071e', '#370617', '#6a040f', '#9d0208', '#d00000'], ['#ffcdb2', '#ffb4a2', '#e5989b', '#b5838d', '#6d6875'],
  ['#081c15', '#1b4332', '#2d6a4f', '#52b788', '#b7e4c7'], ['#012a4a', '#013a63', '#01497c', '#2c7da0', '#61a5c2'],
  ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d'], ['#0b090a', '#161a1d', '#660708', '#a4161a', '#e5383b'],
  ['#7400b8', '#5e60ce', '#4ea8de', '#56cfe1', '#80ffdb'], ['#cb997e', '#ddbea9', '#ffe8d6', '#b7b7a4', '#6b705c'],
  ['#22577a', '#38a3a5', '#57cc99', '#80ed99', '#c7f9cc'], ['#231942', '#5e548e', '#9f86c0', '#be95c4', '#e0b1cb'],
  ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'], ['#2f3e46', '#354f52', '#52796f', '#84a98c', '#cad2c5'],
  ['#780000', '#c1121f', '#fdf0d5', '#003049', '#669bbc'], ['#3d348b', '#7678ed', '#f7b801', '#f18701', '#f35b04'],
  ['#264027', '#3c5233', '#6f732f', '#b38a58', '#932f6d'], ['#0a0908', '#22333b', '#eae0d5', '#c6ac8f', '#5e503f'],
  ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'], ['#e0aaff', '#c77dff', '#9d4edd', '#7b2cbf', '#3c096c'],
  ['#fec5bb', '#fcd5ce', '#fae1dd', '#e8e8e4', '#d8e2dc'], ['#283d3b', '#197278', '#edddd4', '#c44536', '#772e25'],
  ['#6f1d1b', '#bb9457', '#432818', '#99582a', '#ffe6a7'], ['#14110f', '#34312d', '#7e7f83', '#d9c5b2', '#f3f3f4'],
  ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'], ['#04151f', '#183a37', '#efd6ac', '#c44900', '#432534'],
]
/** 144 genererte paletter fra klassiske fargeharmonier: 12 grunntoner × 6 oppsett × 2 stemninger. */
function genPals(): string[][] {
  const SCH: Record<string, number[]> = { mono: [0, 0, 0, 0, 0], analog: [-30, -15, 0, 15, 30], compl: [0, 0, 180, 180, 0], split: [0, 150, 0, 210, 0], triad: [0, 120, 0, 240, 0], tetra: [0, 90, 180, 270, 0] }
  const MOOD = [{ s: [55, 60, 65, 60, 45], l: [14, 28, 44, 62, 82] }, { s: [35, 38, 42, 36, 25], l: [12, 26, 42, 60, 84] }]
  const out: string[][] = []
  for (let h = 0; h < 360; h += 30) for (const k in SCH) for (const m of MOOD) out.push((SCH[k] ?? []).map((d, i) => hsl2hex((h + d + 360) % 360, m.s[i] ?? 50, m.l[i] ?? 50)))
  return out
}
export const ALL_PALS: string[][] = PALS.concat(genPals())

let lastPal = -1
export function pickPal(rnd: () => number = Math.random): string[] {
  let i: number
  do i = Math.floor(rnd() * ALL_PALS.length)
  while (i === lastPal && ALL_PALS.length > 1)
  lastPal = i
  const p = (ALL_PALS[i] ?? PALS[0] ?? []).slice()
  return rnd() < 0.35 ? p.reverse() : p
}
export function harmonyColors(n: number, rnd: () => number = Math.random): string[] {
  const p = pickPal(rnd)
  const at = (i: number) => p[i] ?? '#000000'
  if (n <= 1) return [at(1 + Math.floor(rnd() * 3))]
  if (n <= p.length) return Array.from({ length: n }, (_, i) => at(Math.round((i * (p.length - 1)) / (n - 1))))
  return Array.from({ length: n }, (_, i) => at(i % p.length))
}
export function randPanels(rnd: () => number = Math.random): { panels: Panel[]; bg: string } {
  const p = pickPal(rnd), al = [1, 1, 0.9, 1, 0.6], dark = p.slice().sort((a, b) => lum(a) - lum(b))[0] ?? '#000000'
  const mix = (x: string, k: number) => '#' + [1, 3, 5].map((j) => Math.round(parseInt(x.slice(j, j + 2), 16) * k).toString(16).padStart(2, '0')).join('')
  return { panels: p.map((c, i) => ({ color: c, alpha: al[i] ?? 1 })), bg: mix(dark, 0.35) }
}
export const DEF_PANELS: Panel[] = [['#1f6f86', 1], ['#b4553a', 1], ['#1e3566', 0.9], ['#2a8f8a', 1], ['#1f6f86', 0.6]].map(([color, alpha]) => ({ color: String(color), alpha: Number(alpha) }))

/* ---------- fyll, vignetter og overlegg ---------- */
export const FILLM = ['none', 'solid', 'linear', 'mirror', 'radial', 'conic', 'mesh', 'stripes', 'wave', 'ellipse', 'corner', 'spot', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner']
export function fillStops(f: Partial<BgFill> | null | undefined): FillStop[] {
  const hx = (v: unknown) => (isHex(v) ? v : null)
  let st: FillStop[] = Array.isArray(f?.stops)
    ? f.stops.filter((q) => q && hx(q.c)).slice(0, 6).map((q) => ({ c: q.c, p: clampN(q.p, 0, 1, 0), w: clampN(q.w, 0, 1, 0), hard: !!q.hard }))
    : []
  if (st.length < 2) st = [{ c: hx(f?.c1) ?? '#1a2b4c', p: 0 }, { c: hx(f?.c2) ?? '#080808', p: 1 }]
  return st
}
export const VIGT = ['auto', 'round', 'oval', 'bottom', 'top', 'cinema', 'sides', 'left', 'even']
export const VIG_TYPE_OPTS: [string, string][] = [['auto', 'Standard (mørkt bak teksten)'], ['round', 'Rund (rundt fokuspunktet)'], ['oval', 'Oval (klassisk foto)'], ['bottom', 'Nedenfra'], ['top', 'Ovenfra'], ['cinema', 'Topp og bunn (kino)'], ['sides', 'Begge sider'], ['left', 'Fra venstre'], ['even', 'Jevn (hele bildet)']]
/** Vignettlag: feltene i dialogen → feltene på sliden (VSMAP) og i stilen for alle slides (VCMAP). */
export const VSMAP = { type: 'vigType', x: 'fx', y: 'fy', rot: 'vigRot', open: 'vig', color: 'vigColor', amt: 'vigAmt', alpha: 'vigAlpha', size: 'vigSize', soft: 'vigSoft' } as const
export const VCMAP = { type: 'vigType', x: 'vigX', y: 'vigY', rot: 'vigRot', open: 'vigOpen', color: 'vigColor', amt: 'vigAmt', alpha: 'vigAlpha', size: 'vigSize', soft: 'vigSoft' } as const
export type VigKey = keyof typeof VSMAP
export function cleanVigs(a: unknown): Required<VigLayer>[] | null {
  if (!Array.isArray(a) || !a.length) return null
  const r = (a as unknown[]).filter((L): L is VigLayer => !!L && typeof L === 'object').slice(0, 4).map((L) => ({
    type: VIGT.includes(String(L.type)) ? String(L.type) : 'round', x: clampN(L.x, -0.2, 1.2, 0.5), y: clampN(L.y, -0.2, 1.2, 0.5), rot: clampN(L.rot, -180, 180, 0),
    open: clampN(L.open, 0, 1, 0.5), amt: clampN(L.amt, 0, 2, 1), size: clampN(L.size, 0.2, 3, 1), alpha: clampN(L.alpha, 0, 1, 1), soft: clampN(L.soft, 0, 1, 0.5), color: isHex(L.color) ? L.color : '#080808',
  }))
  return r.length ? r : null
}
export const OVT: [string, string][] = [['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['snow', 'Snø'], ['newyear', 'Konfetti'], ['lines', 'Linjer']]
export const ovOwn = (x: Slide) => !!(x.ov?.overlayFx || x.oAmt != null || x.oSpeed != null || x.oAlpha != null || x.oColor)

/* ---------- rensing før motoren (samme regler som dagens app) ---------- */
export function cleanPanels(p: unknown): Panel[] | null {
  return Array.isArray(p) && p.length ? (p as Panel[]).filter((x) => x && isHex(x.color)).map((x) => ({ color: x.color, alpha: Math.max(0, Math.min(1, Number(x.alpha))) })) : null
}
export function cleanToff(o: unknown): Record<string, XY> | null {
  if (!o || typeof o !== 'object') return null
  const r: Record<string, XY> = {}
  for (const [k, v] of Object.entries(o as Record<string, Partial<XY> | null>))
    if (/^(day|title|kicker|body|sub|headline|text|email)$/.test(k) && v && (v.x || v.y)) r[k] = { x: Math.max(-1, Math.min(1, Number(v.x) || 0)), y: Math.max(-1, Math.min(1, Number(v.y) || 0)) }
  return Object.keys(r).length ? r : null
}
export function cleanTsc(o: unknown): Record<string, number> | null {
  if (!o || typeof o !== 'object') return null
  const r: Record<string, number> = {}
  for (const [k, x] of Object.entries(o as Record<string, unknown>)) {
    const v = Number(x)
    if (/^(day|time|place|title|kicker|pill|body|sub|headline|text|email|phone)$/.test(k) && v > 0 && v !== 1) r[k] = Math.max(0.3, Math.min(4, v))
  }
  return Object.keys(r).length ? r : null
}
export function cleanFtexts(a: unknown): FText[] | null {
  if (!Array.isArray(a) || !a.length) return null
  const r = (a as unknown[]).filter((t): t is FText => !!t && typeof t === 'object').slice(0, 12).map((t) => ({
    text: String(t.text ?? '').slice(0, 400), x: clampN(t.x, -0.2, 1.2, 0.5), y: clampN(t.y, -0.2, 1.2, 0.3), size: clampN(t.size, 0.2, 8, 1),
    color: isHex(t.color) ? t.color : '#ffffff', bold: t.bold !== false, upper: !!t.upper, box: !!t.box, boxColor: isHex(t.boxColor) ? t.boxColor : null,
  }))
  return r.length ? r : null
}
export function cleanFqr(q: unknown, qrRows: (url: string) => string[] | null): FQr | null {
  if (!q || typeof q !== 'object') return null
  const o = q as FQr
  const url = String(o.url ?? '').trim().slice(0, 600)
  return {
    url, kind: o.kind, val: o.val, extra: o.extra, qr: qrRows(url || 'Skann meg'), x: clampN(o.x, -0.2, 1.2, 0.82), y: clampN(o.y, -0.2, 1.2, 0.42), size: clampN(o.size, 60, 1000, 260),
    caption: String(o.caption ?? '').slice(0, 80), contact: String(o.contact ?? '').slice(0, 80), color: isHex(o.color) ? o.color : null,
  }
}
export function cleanPips(a: unknown, okSrc: (src: string) => boolean): Pip[] | null {
  if (!Array.isArray(a) || !a.length) return null
  const r = (a as unknown[]).filter((p): p is Pip => !!p && typeof (p as Pip).src === 'string' && okSrc((p as Pip).src)).slice(0, 8).map((p) => ({
    src: p.src, x: clampN(p.x, -0.2, 1.2, 0.72), y: clampN(p.y, -0.2, 1.2, 0.4), w: clampN(p.w, 0.03, 1.5, 0.3), r: clampN(p.r, 0, 200, 18), op: clampN(p.op, 0, 1, 1),
    border: !!p.border, borderColor: isHex(p.borderColor) ? p.borderColor : null, shadow: p.shadow !== false,
  }))
  return r.length ? r : null
}
export function cleanTcol(o: unknown): Record<string, string> | null {
  if (!o || typeof o !== 'object') return null
  const r: Record<string, string> = {}
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (/^(day|date|time|place|title|kicker|pill|body|sub|headline|text|email|phone)$/.test(k) && isHex(v)) r[k] = v
  return Object.keys(r).length ? r : null
}
const OV_ALLOWED: Record<string, string[]> = {
  transFx: ['fade', 'dip', 'slide', 'zoom', 'glitch', 'panels', 'cut'], textFx: ['reveal', 'fade', 'slide', 'blur', 'pop', 'glitch', 'none'],
  overlayFx: ['none', 'grain', 'leak', 'bokeh', 'snow', 'newyear', 'lines'], style: ['promo', 'plain'], kickerStyle: ['box', 'plain'],
}
export function cleanOv(o: unknown): SlideOv | null {
  if (!o || typeof o !== 'object') return null
  const src = o as Record<string, unknown>
  const r: Record<string, unknown> = {}
  for (const [k, list] of Object.entries(OV_ALLOWED)) if (list.includes(String(src[k]))) r[k] = src[k]
  if (typeof src.kenBurns === 'boolean') r.kenBurns = src.kenBurns
  if (typeof src.sweep === 'boolean') r.sweep = src.sweep
  return Object.keys(r).length ? (r as SlideOv) : null
}
export function cleanFill(f: BgFill | null | undefined): BgFill | null {
  if (!f || !FILLM.includes(f.mode) || f.mode === 'none') return null
  return {
    mode: f.mode, stops: fillStops(f), angle: Math.max(0, Math.min(360, Number(f.angle) || 0)), soft: f.soft == null ? 0.5 : Math.max(0, Math.min(1, Number(f.soft))),
    sharp: Math.max(0, Math.min(1, Number(f.sharp) || 0)), repeat: f.repeat == null ? null : Math.max(1, Math.min(20, Math.round(Number(f.repeat)))),
    x: f.x == null ? 0.5 : Math.max(-0.5, Math.min(1.5, Number(f.x))), y: f.y == null ? 0.5 : Math.max(-0.5, Math.min(1.5, Number(f.y))),
  }
}

/* ---------- sjangre og stilpakker ---------- */
export interface Genre { label: string; desc: string; cfg?: Partial<Cfg> & { beatStyle?: string } }
export const GENRES: Record<string, Genre> = {
  auto: { label: 'Auto (analyser sangen)', desc: 'Sangen analyseres, og effektene velges ut fra tempo og rytme.' },
  rolig: { label: 'Rolig', desc: 'Lange toninger, tekst som tones inn og et bilde som nesten står stille.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: false, transFx: 'fade', textFx: 'fade', beatBars: 4, overlayFx: 'none', beatExtras: [], beatLevel: 0.6, sweep: false } },
  piano: { label: 'Piano', desc: 'Rolig grunntone med myke overganger og tekst som kommer frem av uskarphet. Når musikken tar seg opp, går tekst og bilde raskere.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: true, transFx: 'fade', textFx: 'blur', beatBars: 4, overlayFx: 'bokeh', fxAmount: 0.3, beatExtras: [], beatLevel: 0.8, sweep: false } },
  episk: { label: 'Episk piano', desc: 'Raskere piano med filmpreg: skifter via svart på første slag, tekst som avdekkes i takt og et bilde som sakte kommer nærmere. Bygger seg opp sammen med musikken.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: true, transFx: 'dip', textFx: 'reveal', beatBars: 2, overlayFx: 'leak', fxAmount: 0.3, beatExtras: ['step', 'vig'], beatEvery: 8, beatPulse: 0.5, beatLevel: 1.3, sweep: true } },
  pop: { label: 'Pop', desc: 'Upbeat og ryddig: bildene skyves inn på takten, teksten avdekkes, og bildet går et lite hakk nærmere annenhver takt.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: false, transFx: 'slide', textFx: 'reveal', beatBars: 2, overlayFx: 'none', beatExtras: ['step'], beatPulse: 0.5, beatLevel: 1, sweep: true, beatEvery: 8 } },
  upbeat: { label: 'Upbeat', desc: 'Mest fart og flest effekter: zoom ved hvert skifte, tekst som spretter inn, og et lite zoomhakk og vignett på hver takt.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: false, transFx: 'zoom', textFx: 'pop', beatBars: 2, overlayFx: 'none', beatExtras: ['step', 'vig'], beatEvery: 4, beatPulse: 0.55, beatLevel: 1.4, sweep: true } },
  groove: { label: 'Groove', desc: 'Upbeat med eget preg: harde klipp på første slag, tekst som spretter inn, filmkorn og et lite zoomhakk på hver takt.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: false, transFx: 'cut', textFx: 'pop', beatBars: 2, overlayFx: 'grain', fxAmount: 0.5, beatExtras: ['step'], beatEvery: 4, beatPulse: 0.5, beatLevel: 1.2, sweep: false } },
  lovsang: { label: 'Lovsang / ballade', desc: 'Lange, varme overganger og tekst som tones inn ord for ord. Løfter seg litt når musikken bygger seg opp.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: true, transFx: 'fade', textFx: 'fade', beatBars: 4, overlayFx: 'leak', fxAmount: 0.3, beatExtras: [], beatLevel: 0.8, sweep: false } },
  gospel: { label: 'Gospel', desc: 'Skifter via svart på første slag, tekst som avdekkes linje for linje og en svak vignett på takten.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: false, transFx: 'dip', textFx: 'reveal', beatBars: 2, overlayFx: 'leak', fxAmount: 0.25, beatExtras: ['vig'], beatEvery: 8, beatPulse: 0.4, beatLevel: 1, sweep: true } },
  elektronisk: { label: 'Elektronisk', desc: 'Zoom ved hvert skifte, tekst som glir inn, skannelinjer og et lite zoomhakk på hver takt.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'groove', energyAdaptive: false, transFx: 'zoom', textFx: 'slide', beatBars: 2, overlayFx: 'lines', fxAmount: 0.4, beatExtras: ['step', 'vig'], beatEvery: 4, beatPulse: 0.5, beatLevel: 1.2, sweep: true } },
  akustisk: { label: 'Akustisk / visesang', desc: 'Enkle toninger, rolig tekst og litt filmkorn for et naturlig uttrykk.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: true, transFx: 'fade', textFx: 'fade', beatBars: 4, overlayFx: 'grain', fxAmount: 0.35, beatExtras: [], beatLevel: 0.8, sweep: false } },
  kor: { label: 'Kor / klassisk', desc: 'Stille og verdig: skifter via svart, tekst som tones inn og et bilde som nesten står stille.', cfg: { beatReframe: false, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: false, transFx: 'dip', textFx: 'fade', beatBars: 4, overlayFx: 'none', beatExtras: [], beatLevel: 0.6, sweep: false } },
  jul: { label: 'Julemusikk', desc: 'Myke toninger, tekst som kommer frem av uskarphet og snø som daler rolig.', cfg: { beatReframe: true, beatPolish: true, kenBurns: true, beatText: true, beatStyle: 'calm', energyAdaptive: true, transFx: 'fade', textFx: 'blur', beatBars: 4, overlayFx: 'snow', fxAmount: 0.5, beatExtras: [], beatLevel: 0.8, sweep: false } },
}
export interface Preset { label: string; hint: string; cfg: Partial<Cfg> }
export const PRESETS: Record<string, Preset> = {
  rolig: { label: 'Rolig', hint: 'Myke toninger', cfg: { transFx: 'fade', textFx: 'fade', overlayFx: 'none', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Archivo', titleScale: 1, fxAmount: 0.4 } },
  energisk: { label: 'Energisk', hint: 'Zoom og sprett', cfg: { transFx: 'zoom', textFx: 'pop', overlayFx: 'lines', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: 'box', font: 'Montserrat', titleScale: 1.1, fxAmount: 0.7 } },
  glitch: { label: 'Glitch', hint: 'Digitale hakk', cfg: { transFx: 'glitch', textFx: 'glitch', overlayFx: 'grain', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: 'box', font: 'Oswald', titleScale: 1.12, fxAmount: 0.6 } },
  promo: { label: 'Promo', hint: 'Fargepaneler', cfg: { transFx: 'panels', textFx: 'glitch', overlayFx: 'grain', kenBurns: true, sweep: false, style: 'promo', duotone: true, kickerStyle: 'box', font: 'Oswald', titleScale: 1.15, fxAmount: 0.45 } },
  kino: { label: 'Kino', hint: 'Filmkorn og lys', cfg: { transFx: 'dip', textFx: 'blur', overlayFx: 'leak', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: null, font: 'Playfair Display', titleScale: 1.05, fxAmount: 0.55 } },
  minimal: { label: 'Minimal', hint: 'Rent og enkelt', cfg: { transFx: 'cut', textFx: 'reveal', overlayFx: 'none', kenBurns: false, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Helvetica', titleScale: 1, fxAmount: 0.3 } },
  skyv: { label: 'Skyv', hint: 'Glir sidelengs', cfg: { transFx: 'slide', textFx: 'slide', overlayFx: 'bokeh', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Archivo', titleScale: 1, fxAmount: 0.5 } },
  feiring: { label: 'Feiring', hint: 'Konfetti og glød', cfg: { transFx: 'zoom', textFx: 'pop', overlayFx: 'newyear', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: 'box', font: 'Montserrat', titleScale: 1.1, fxAmount: 0.8 } },
}

/* ---------- standardoppsett og eksempelinnhold ---------- */
export const BASE_CFG: Cfg = {
  accent: '#f5b82c', header: 'Ukentlige møter', topLabel: 'Program for uken', overlay: 1, rail: true, defDur: 5, res: '1080', logoSrc: null, logoOn: true, logoSize: 90, logoX: 0.93, logoY: 0.85, logoOpacity: 1,
  transFx: 'fade', textFx: 'reveal', overlayFx: 'none', fxAmount: 0.6, fxSpeed: 1, kenBurns: true, sweep: true, font: 'Archivo', titleScale: 1, textScale: 1, beatPulse: 0.6, beatText: true, beatNudge: 0, bpm: null,
  beatExtras: [], beatReframe: true, beatEvery: 8, beatLevel: 1, beatBars: 0, energyAdaptive: true, imgRules: [],
}

/** Møteslides fra ukeprogrammet. Gjenbruker bilde og stil fra forrige versjon av samme møte (eller samme ukedag). */
export function daySlides(days: ProgramDay[], old: Slide[], ruleFor: (title: string) => ImgRule | null, ruleForSlide: (x: Slide) => ImgRule | null): Slide[] {
  const olds = old.filter((s) => s.type === 'day'), out: Slide[] = []
  const KEEP = ['vigOff', 'vigColor', 'vigType', 'vigRot', 'vigSize', 'vigAmt', 'vigAlpha', 'vigSoft', 'vigs', 'oAmt', 'oSpeed', 'oAlpha', 'oColor', 'bgFill', 'tintMode', 'tint', 'tintAmt', 'ov', 'panels', 'panelBg', 'tcol', 'tsc', 'pips', 'ftexts', 'fqr'] as const
  for (const d of days)
    for (const e of d.events) {
      let id = `ev-${d.key}-${keyOf(e.title) || 'x'}`
      while (out.some((o) => o.id === id)) id += '-2'
      const base = d.base || d.key
      const prev = olds.find((o) => o.id === id) ?? olds.find((o) => (o.dayBase || o.dayKey) === base)
      const own = olds.find((o) => o.id === id)
      const rule = own?.ruleId ? ruleForSlide(own) : ruleFor(e.title)
      const kept: Partial<Slide> = {}
      if (prev) for (const k of KEEP) if (prev[k] != null) (kept as Record<string, unknown>)[k] = prev[k]
      out.push({
        id, ruleId: own?.ruleId || null, type: 'day', dayKey: d.key, dayBase: base, extra: !!d.extra, day: d.extra ? '' : d.name, date: d.date || '', time: e.time, title: e.title, place: e.place || '',
        bg: rule?.bg ? rule.bg : prev ? prev.bg : null, bgPort: rule?.bgPort ? rule.bgPort : prev ? (prev.bgPort ?? null) : null, bgOpacity: prev?.bgOpacity != null ? prev.bgOpacity : 1,
        vig: prev?.vig ?? null, fx: prev?.fx ?? null, fy: prev?.fy ?? null, dur: prev ? prev.dur : null, hidden: prev ? !!prev.hidden : false,
        ...kept,
      })
    }
  return [...out.filter((x) => !x.extra), ...out.filter((x) => x.extra)]
}

export interface LoopData { programText: string; slides: Slide[]; cfg: Cfg; videoName?: string; audioName?: string }

/** Eksempelinnholdet (bare demoen bruker slides; nye serier starter tomme med malens stil). */
export function sampleData(tpl: string): LoopData {
  if (tpl === 'sunday')
    return {
      programText: '', cfg: { header: 'Søndagsmøte', topLabel: 'Velkommen' }, slides: [
        { id: 'sun-velkommen', type: 'text', kicker: 'Velkommen', pill: 'Kl 11:00', body: 'Velkommen til søndagsmøte! Finn deg en plass, så begynner vi om litt.', sub: 'Møtet sendes også direkte på nett', bg: null, bgOpacity: 1, dur: 6 },
        { id: 'sun-idag', type: 'text', kicker: 'I dag', pill: '', body: 'Tale ved Navn Navnesen', sub: 'Tema: Skriv tema her', bg: null, bgOpacity: 0.7, dur: 6 },
        { id: 'sun-nett', type: 'text', kicker: 'Følg oss', pill: '', body: 'Abonner på YouTube-kanalen og følg Facebook-siden for å få med deg alt som skjer.', sub: '', bg: null, bgOpacity: 1, dur: 6 },
        { id: 'sun-outro', type: 'outro', title: 'Søndagsmøte', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 },
      ],
    }
  if (tpl === 'youth')
    return {
      programText: '',
      cfg: { header: 'Ungdomsmøte', topLabel: 'Fredag kl 19', accent: '#8fe3cf', font: 'Oswald', titleScale: 1.15, style: 'promo', duotone: true, kickerStyle: 'box', kickerLine: false, transFx: 'panels', textFx: 'glitch', overlayFx: 'grain', fxAmount: 0.45, sweep: false, kenBurns: true, overlay: 0.8, beatExtras: ['step', 'vig'], beatEvery: 4, beatLevel: 1.3, beatPulse: 0.7 },
      slides: [
        { id: 'ung-velkommen', type: 'text', kicker: 'Fredag', pill: 'Kl 19:00', body: 'Velkommen til ungdomsmøte!', sub: 'Vi starter snart – finn en plass', bg: null, bgOpacity: 1, dur: 5 },
        { id: 'ung-ikveld', type: 'text', kicker: 'I kveld', pill: '', body: 'Lovsang · Tale · Kiosk', sub: 'Skriv inn kveldens taler her', bg: null, bgOpacity: 1, dur: 5 },
        { id: 'ung-etterpa', type: 'text', kicker: 'Etterpå', pill: '', body: 'Henge, spill og kiosk', sub: 'Ta med en venn neste gang', bg: null, bgOpacity: 1, dur: 4.5 },
        { id: 'ung-folg', type: 'contact', kicker: 'Følg oss', pill: '', headline: 'Følg ungdommen på Instagram', text: 'Skann koden eller søk etter', email: '@brukernavn', phone: '', qrUrl: 'https://instagram.com/', bg: null, bgOpacity: 1, dur: 5 },
        { id: 'ung-outro', type: 'outro', title: 'Ungdomsmøte', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 },
      ],
    }
  if (tpl === 'blank') return { programText: '', cfg: { header: '', topLabel: '' }, slides: [{ id: 'tom-1', type: 'text', kicker: 'Overskrift', pill: '', body: 'Skriv teksten din her', sub: '', bg: null, bgOpacity: 1, dur: 5 }] }
  return {
    programText: SAMPLE, cfg: { header: 'Ukentlige møter', topLabel: 'Program for uken' }, slides: [
      ...daySlides(parse(SAMPLE).days, [], () => null, () => null),
      { id: 'txt-velkommen', type: 'text', kicker: 'Velkommen', pill: 'Søndag kl 11', body: 'Vi ønsker deg hjertelig velkommen til å ta del i fellesskapet, enten du følger oss på nett eller tar turen innom. Abonner gjerne på YouTube-kanalen og følg Facebook-siden!', sub: 'Vi sender møtet direkte hver søndag kl 11', bg: null, bgOpacity: 1, dur: 6 },
      { id: 'kontakt-teknisk', type: 'contact', kicker: 'Teknisk team', pill: '', headline: 'Ønsker du å være en del av teknisk team?', text: 'Ta kontakt – skann koden eller send e-post til', email: 'post@kirken.no', phone: '', qrUrl: 'mailto:post@kirken.no', bg: null, bgOpacity: 0.5, dur: 5 },
      { id: 'outro', type: 'outro', title: 'Ukentlige møter', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 },
    ],
  }
}

/** Gamle innebygde standardbilder og -logo er standardinnhold, ikke brukerens: de tas bort (som i dagens app). */
export function cleanLegacyCfg(cfg: Cfg): Cfg {
  const OLD = new Set(['r-kveldsmat', 'r-bonn', 'r-ungdom', 'r-ungsdom', 'r-sondag'])
  const legacy = (v: unknown) => typeof v === 'string' && /^images\//.test(v)
  const out: Cfg = { ...cfg }
  if (legacy(out.logoSrc)) out.logoSrc = null
  if (Array.isArray(out.imgRules))
    out.imgRules = out.imgRules
      .filter((r) => !(r && OLD.has(r.id) && legacy(r.bg) && !r.bgPort))
      .map((r) => (legacy(r.bg) ? { ...r, bg: null } : r))
      .filter((r) => r.kw || r.bg || r.bgPort)
  if (out.standard && String(out.standard).trim() === 'Tirsdag kl 19 Kveldsmat i kafeen\nTorsdag kl 11 Bønn\nFredag kl 19 Ungsdomsmøte\nSøndag Kl 11:00 Søndagsmøte') delete out.standard
  return out
}

/** Et lagret prosjekt fra dagens app som fortsatt er helt likt eksempelinnholdet, legges til side (aldri slettet). */
export function isLegacySample(saved: LoopData | null, tpl: string): boolean {
  if (!saved || !Array.isArray(saved.slides) || !saved.slides.length) return false
  const prog = String(saved.programText || '').trim()
  if (prog && prog !== String(SAMPLE).trim()) return false
  const sample = sampleData(tpl || 'week').slides
  const K = ['type', 'title', 'day', 'time', 'place', 'kicker', 'pill', 'body', 'sub', 'headline', 'text', 'email', 'phone', 'qrUrl'] as const
  if (saved.slides.length !== sample.length) return false
  const pick = (x: Slide) => JSON.stringify(K.map((k) => x[k] ?? ''))
  return saved.slides.every((x) => {
    const o = sample.find((y) => y.id === x.id)
    return !!o && pick(o) === pick(x) && (!x.bg || /^images\//.test(x.bg)) && !x.bgPort && !x.vid && !(x.pips ?? []).length
  })
}

/** Bilder i nettleseren (img-), menighetens filer (ch:) og genererte bakgrunner (gen:) lastes via lageret. */
export const isStored = (b: unknown): b is string => typeof b === 'string' && (b.startsWith('img-') || b.startsWith('ch:') || b.startsWith('gen:'))
/** Bare trygge bildeadresser (blob:, data:image og relative bildefiler uten «..»). */
export function safeSrc(u: unknown): string {
  const s = String(u ?? '')
  return /^(blob:|data:image\/)/.test(s) || (/^[\w\-./ æøåÆØÅ]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(s) && !s.includes('..') && !s.startsWith('/')) ? s : ''
}
export function cssUrl(u: unknown): string {
  const v = safeSrc(u)
  return v ? 'url("' + v.replace(/["\\\n\r]/g, (c) => '\\' + c) + '")' : 'none'
}
export const fmtLen = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return m + ':' + String(s).padStart(2, '0')
}
