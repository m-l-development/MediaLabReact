import type { Batch } from './batch'
import type { Dev } from './develop'
import type { Fill } from '../../../shared/fill/fill'

/**
 * Dokumentformatet i Photo Design (samme felt som media-lab/src/legacy/photo-engine.js, så prosjekter, maler og
 * sikkerhetskopier kan brukes i begge appene). Koordinater er i dokumentets piksler; x/y er midten av laget.
 * Bildekilder: `m:<asset-id>` (Dine medier). Masker: nøkkel i `doc.masks` (PNG som data-URL).
 */
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)
export const uid = (p = 'l'): string => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

export interface Format { k: string; l: string; w: number; h: number; mm?: [number, number] }
export const FORMATS: readonly Format[] = [
  { k: 'sq', l: 'Instagram 1:1', w: 1080, h: 1080 }, { k: 'p45', l: 'Instagram 4:5', w: 1080, h: 1350 }, { k: 'story', l: 'Story 9:16', w: 1080, h: 1920 },
  { k: 'wide', l: '16:9', w: 1920, h: 1080 }, { k: 'a4', l: 'A4 plakat', w: 2480, h: 3508, mm: [210, 297] },
  { k: 'a3', l: 'A3 plakat', w: 3508, h: 4961, mm: [297, 420] }, { k: 'card', l: 'Visittkort', w: 1004, h: 650, mm: [85, 55] },
]
export const DPI = 300
export const BLEED_MM = 3
export const BLEED = Math.round((BLEED_MM / 25.4) * DPI)
export const FONTS = ['Archivo', 'Bebas Neue', 'Montserrat', 'Anton', 'Oswald', 'Playfair Display', 'League Spartan', 'DM Serif Display', 'Space Grotesk'] as const

export interface Adj {
  exp: number; bri: number; con: number; hi: number; sh: number; sat: number; temp: number; tint: number; hue: number; fade: number; blur: number; vig: number; grain: number
  curve: [number, number][] | null
  /** Kanalkurver (Avansert): rød, grønn, blå. Mangler = ingen. */
  curveR?: [number, number][] | null
  curveG?: [number, number][] | null
  curveB?: [number, number][] | null
}
export type CurveKey = 'curve' | 'curveR' | 'curveG' | 'curveB'
export const ADJ: Adj = { exp: 0, bri: 0, con: 0, hi: 0, sh: 0, sat: 0, temp: 0, tint: 0, hue: 0, fade: 0, blur: 0, vig: 0, grain: 0, curve: null }
export const LOOKS: readonly [string, string, Partial<Adj>][] = [
  ['none', 'Original', {}], ['warm', 'Varm', { temp: 35, sat: 8, con: 6 }], ['cool', 'Kjølig', { temp: -35, tint: -5, con: 4 }],
  ['film', 'Film', { con: 12, fade: 22, sat: -12, temp: 10, grain: 25, curve: [[0, 0.06], [0.25, 0.22], [0.75, 0.8], [1, 0.95]] }],
  ['bw', 'Svart-hvitt', { sat: -100, con: 18 }], ['noir', 'Noir', { sat: -100, con: 45, sh: -25, vig: 45, grain: 20 }],
  ['fade', 'Falmet', { fade: 38, con: -12, sat: -18 }], ['drama', 'Dramatisk', { con: 38, sh: -18, hi: -15, sat: -10, vig: 40 }],
  ['vintage', 'Vintage', { temp: 28, tint: 10, fade: 26, sat: -25, vig: 30, grain: 30 }], ['vivid', 'Levende', { sat: 38, con: 14, exp: 6 }],
  ['matte', 'Matt', { fade: 30, con: -6, sh: 12, curve: [[0, 0.1], [0.5, 0.52], [1, 0.92]] }], ['teal', 'Blågrønn og oransje', { temp: 12, tint: -14, sat: 16, con: 12, hue: -6 }],
]
export const BLENDS: readonly [GlobalCompositeOperation, string][] = [['source-over', 'Normal'], ['multiply', 'Multipliser'], ['screen', 'Raster'], ['overlay', 'Overlegg'], ['soft-light', 'Mykt lys'], ['color', 'Farge'], ['luminosity', 'Luminans']]
/** Former et bilde kan beskjæres til (samme tegning som formlagene, shapePath). «rounded» = avrundet rektangel. */
export const CROP_SHAPES: readonly [string, string][] = [
  ['rect', 'Rektangel'], ['rounded', 'Avrundet'], ['ellipse', 'Sirkel'], ['triangle', 'Trekant'], ['diamond', 'Rombe'], ['pentagon', 'Femkant'], ['hexagon', 'Sekskant'], ['octagon', 'Åttekant'],
  ['star', 'Stjerne'], ['heart', 'Hjerte'], ['half', 'Halvsirkel'], ['parallelogram', 'Parallellogram'], ['trapezoid', 'Trapes'], ['chevron', 'Chevron'], ['bubble', 'Snakkeboble'], ['burst', 'Stjerneutbrudd'], ['arrow', 'Pil'],
]

export const SHAPES: readonly [string, string][] = [
  ['rect', 'Rektangel'], ['ellipse', 'Sirkel'], ['triangle', 'Trekant'], ['diamond', 'Rombe'], ['hexagon', 'Sekskant'], ['star', 'Stjerne'], ['arrow', 'Pil'], ['line', 'Linje'], ['ring', 'Ring'],
  ['pentagon', 'Femkant'], ['octagon', 'Åttekant'], ['heart', 'Hjerte'], ['plus', 'Pluss'], ['half', 'Halvsirkel'], ['parallelogram', 'Parallellogram'], ['trapezoid', 'Trapes'], ['chevron', 'Chevron'], ['bubble', 'Snakkeboble'], ['burst', 'Stjerneutbrudd'],
]

interface Base {
  id: string
  name: string
  x: number
  y: number
  rot: number
  op: number
  blend: GlobalCompositeOperation
  hidden: boolean
  locked: boolean
  /** Gruppe-ID (lag i samme gruppe flyttes og skaleres sammen). */
  grp?: string | null
  /** Malens opprinnelige farger på laget (fargevalget regnes ut fra dem, se engine/palette.ts). */
  tc?: TplColors
}

/** Fargefeltene et lag kan ha. */
export interface TplColors { color?: string; fill?: string; fill2?: string | null; strokeC?: string }

/** Malfarger: tre farger og hvilken som er bakgrunn, tekst og støttefarge (indekser i c). k = ferdig kombinasjon eller «custom». */
export interface Scheme { k: string; c: [string, string, string]; r: [number, number, number] }

export interface ImageLayer extends Base {
  type: 'image'
  src: string | null
  w: number
  h: number
  flipX: boolean
  flipY: boolean
  cz: number
  cx: number
  cy: number
  adj: Adj
  look: string
  mask: string | null
  tint?: string | null
  /** Avansert framkalling (bare i Avansert modus; mangler = ingen). Se engine/develop.ts. */
  dev?: Dev | null
  /** Beskjæringsform (CROP_SHAPES): bildet klippes til formen. Mangler / «rect» = rektangel. */
  cshape?: string
}

export interface TextLayer extends Base {
  type: 'text'
  text: string
  font: string
  weight: number
  size: number
  color: string
  align: 'left' | 'center' | 'right'
  lh: number
  ls: number
  upper: boolean
  strokeC: string
  strokeW: number
  shadow: number
  tsx?: number
  tsy?: number
  bar?: boolean
  barColor?: string
  barH?: number
  barW?: number
  barGap?: number
}

export interface ShapeLayer extends Base {
  type: 'shape'
  kind: string
  w: number
  h: number
  fill: string
  fill2: string | null
  gAng: number
  radius: number
  strokeC: string
  strokeW: number
}

export interface GlowLayer extends Base {
  type: 'glow'
  w: number
  h: number
  color: string
  soft: number
}

export interface FxLayer extends Base {
  type: 'fx'
  w: number
  h: number
  fx: string
  p: Record<string, number | string>
  seed: number
  preset: string | null
}

export type PdLayer = ImageLayer | TextLayer | ShapeLayer | GlowLayer | FxLayer

export interface Vig { on: boolean; amt: number; size: number; color: string; top: boolean }

export interface Side { bg: string | null; layers: PdLayer[]; bg0?: string | null }

export interface PdDoc {
  id: string
  name: string
  w: number
  h: number
  bg: string | null
  bg2?: string | null
  bgAng?: number
  fill?: Fill | null
  vig?: Vig
  layers: PdLayer[]
  /** Baksiden (tosidig trykk). `side` sier hvilken side som vises nå. */
  back?: Side | null
  side?: 'front' | 'back'
  bleed?: boolean
  /** Malen dokumentet ble laget fra, malens opprinnelige bakgrunn og fargevalget (null = malens egne farger). */
  tplK?: string
  bg0?: string | null
  scheme?: Scheme | null
  /** Bildeserie (batchredigering): mange separate bilder; laget i `layers` er bildet som er åpent. Se engine/batch.ts. */
  batch?: Batch | null
  /** Kategorien prosjektet ligger i på startsiden (TB-8E2793). Mangler/null = uten kategori. Maler bruker `tpl.cat`. */
  cat?: string | null
  created: number
  updated: number
}

export function imageLayer(o: Partial<ImageLayer> = {}): ImageLayer {
  return { id: uid('i'), type: 'image', name: 'Bilde', src: null, x: 540, y: 540, w: 800, h: 600, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, flipX: false, flipY: false, cz: 1, cx: 0, cy: 0, adj: { ...ADJ }, look: 'none', mask: null, ...o }
}
export function textLayer(o: Partial<TextLayer> = {}): TextLayer {
  return { id: uid('t'), type: 'text', name: 'Tekst', text: 'Skriv her', x: 540, y: 540, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, font: 'Archivo', weight: 700, size: 96, color: '#ffffff', align: 'center', lh: 1.1, ls: 0, upper: false, strokeC: '#000000', strokeW: 0, shadow: 0, ...o }
}
export function shapeLayer(o: Partial<ShapeLayer> = {}): ShapeLayer {
  return { id: uid('s'), type: 'shape', name: 'Form', kind: 'rect', x: 540, y: 540, w: 500, h: 300, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, fill: '#f5b82c', fill2: null, gAng: 90, radius: 0, strokeC: '#ffffff', strokeW: 0, ...o }
}
export function glowLayer(o: Partial<GlowLayer> = {}): GlowLayer {
  return { id: uid('g'), type: 'glow', name: 'Lys', x: 540, y: 540, w: 800, h: 800, rot: 0, op: 0.6, blend: 'screen', hidden: false, locked: false, color: '#f5b82c', soft: 0.6, ...o }
}

let MC: CanvasRenderingContext2D | null = null

/** Tekstboksens størrelse (bredeste linje × antall linjer), med strekk (tsx/tsy). */
export function textBox(L: TextLayer): { w: number; h: number; lines: string[] } {
  if (!MC) MC = document.createElement('canvas').getContext('2d')
  const g = MC
  const lines = String(L.upper ? L.text.toUpperCase() : L.text).split('\n')
  let w = 0
  if (g) {
    g.font = `${L.weight || 400} ${L.size}px "${L.font}", Archivo, sans-serif`
    try {
      g.letterSpacing = `${L.ls || 0}px`
    } catch {
      // eldre nettlesere uten letterSpacing
    }
    for (const s of lines) w = Math.max(w, g.measureText(s || ' ').width)
  } else {
    // uten lerret (tester): anslag ut fra antall tegn
    for (const s of lines) w = Math.max(w, (s || ' ').length * (L.size * 0.56 + (L.ls || 0)))
  }
  return { w: Math.max(L.size * 0.4, w + (L.strokeW || 0)) * (L.tsx || 1), h: lines.length * L.size * (L.lh || 1.1) * (L.tsy || 1), lines }
}

export function dims(L: PdLayer): { w: number; h: number } {
  if (L.type === 'text') {
    const b = textBox(L)
    return { w: b.w, h: b.h }
  }
  return { w: L.w, h: L.h }
}

/** Malhjelp: tekst med venstre/høyre-justering får venstre-/høyrekanten på `edge`. */
function pinText(L: TextLayer, edge: number): TextLayer {
  const b = textBox(L)
  L.x = L.align === 'right' ? edge - b.w / 2 : L.align === 'left' ? edge + b.w / 2 : edge
  return L
}

/** Malhjelp: krymper teksten til den er høyst `max` bred (blir aldri større). */
function fitW(L: TextLayer, max: number): TextLayer {
  const b = textBox(L)
  if (b.w > max) L.size = Math.max(8, Math.floor((L.size * max) / b.w))
  return L
}

/**
 * Malhjelp: tekstlag under hverandre mellom `top` og `bottom` med `gap` mellom. Hver tekst krympes til bredden `maxW`,
 * og alle krympes likt hvis de ikke får plass i høyden, så ingen tekst går utenfor området eller oppå en annen, uansett
 * format. `valign`: 0 = øverst, 0,5 = midt (standard), 1 = nederst. Venstre-/høyrejusterte lag får kanten på `edge`.
 */
function stack(ls: TextLayer[], o: { top: number; bottom: number; gap: number; maxW: number; edge: number; valign?: number }): TextLayer[] {
  for (const L of ls) fitW(L, o.maxW)
  const gaps = o.gap * Math.max(0, ls.length - 1)
  const sum = () => ls.reduce((s, L) => s + textBox(L).h, 0)
  const avail = o.bottom - o.top
  if (sum() + gaps > avail) {
    const k = Math.max(0.2, (avail - gaps) / sum())
    for (const L of ls) L.size = Math.max(8, Math.floor(L.size * k))
  }
  let y = o.top + Math.max(0, avail - sum() - gaps) * (o.valign ?? 0.5)
  for (const L of ls) {
    const bh = textBox(L).h
    L.y = y + bh / 2
    y += bh + o.gap
    pinText(L, o.edge)
  }
  return ls
}

/** Malhjelp: størrelse som andel av den korteste siden, avrundet. */
const sz = (d: PdDoc, f: number): number => Math.round(Math.min(d.w, d.h) * f)
/** Liggende format (bredere enn høyt): malene legger bilde og tekst side om side. */
const isLand = (d: PdDoc): boolean => d.w > d.h * 1.15

export interface Template { k: string; l: string; make: (d: PdDoc) => void }

export const TEMPLATES: readonly Template[] = [
  { k: 'blank', l: 'Tomt', make: () => undefined },
  { k: 'card2', l: 'Visittkort tosidig', make: (d) => {
    d.w = 1004
    d.h = 650
    d.bg = '#f3f1ec'
    d.bleed = true
    d.side = 'front'
    const w = d.w
    const h = d.h
    const b = BLEED
    d.layers.push(shapeLayer({ name: 'Fargefelt', x: w * 0.06 - b / 2, y: h / 2, w: w * 0.12 + b, h: h + 2 * b, fill: '#1d2a3a' }))
    d.layers.push(textLayer({ name: 'Navn', text: 'Fornavn Etternavn', x: w * 0.2, y: h * 0.36, size: 62, font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }))
    d.layers.push(textLayer({ name: 'Tittel', text: 'Tittel / rolle', x: w * 0.2, y: h * 0.47, size: 32, weight: 500, color: '#555555', align: 'left' }))
    d.layers.push(textLayer({ name: 'Kontakt', text: '+47 000 00 000\nnavn@menighet.no\nwww.menighet.no', x: w * 0.2, y: h * 0.72, size: 28, weight: 500, color: '#111111', align: 'left', lh: 1.35 }))
    d.back = { bg: '#1d2a3a', layers: [textLayer({ name: 'Navn på menigheten', text: 'MENIGHETEN', x: w / 2, y: h / 2, size: 72, font: 'Bebas Neue', weight: 400, ls: 6, color: '#f3f1ec' })] }
    for (const L of d.layers) {
      if (L.type === 'text' && L.align === 'left') L.x += textBox(L).w / 2
    }
  } },
  { k: 'photo', l: 'Bilde med tittel', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#111111'
    d.layers.push(imageLayer({ name: 'Bakgrunnsbilde', x: w / 2, y: h / 2, w, h }))
    d.layers.push(shapeLayer({ name: 'Toning', x: w / 2, y: h * 0.75, w, h: h / 2, fill: 'rgba(0,0,0,0)', fill2: '#000000', gAng: 180, op: 0.85 }))
    d.layers.push(textLayer({ name: 'Tittel', text: 'Tittel her', x: w / 2, y: h * 0.78, size: Math.round(m * 0.11), font: 'Bebas Neue', weight: 400, upper: true, ls: 2 }))
    d.layers.push(textLayer({ name: 'Undertittel', text: 'Søndag kl. 11:00', x: w / 2, y: h * 0.78 + m * 0.1, size: Math.round(m * 0.038), font: 'Archivo', weight: 500, color: '#e9e7e2' }))
  } },
  { k: 'quote', l: 'Sitat', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#1d2a3a'
    d.layers.push(textLayer({ name: 'Sitat', text: '«Skriv et sitat\nsom betyr noe»', x: w / 2, y: h * 0.46, size: Math.round(m * 0.075), font: 'Playfair Display', weight: 600, lh: 1.2 }))
    d.layers.push(shapeLayer({ name: 'Strek', x: w / 2, y: h * 0.62, w: m * 0.12, h: Math.max(4, m * 0.006), fill: '#f5b82c' }))
    d.layers.push(textLayer({ name: 'Kilde', text: 'NAVN / KILDE', x: w / 2, y: h * 0.68, size: Math.round(m * 0.03), weight: 600, ls: 4, color: '#c9c5bc' }))
  } },
  { k: 'event', l: 'Arrangement', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    d.bg = '#f3f1ec'
    // liggende: bildet til venstre og teksten ved siden av; ellers bildet øverst (dato, tittel og sted stables under
    // hverandre i plassen som er igjen, så de aldri overlapper)
    d.layers.push(land ? imageLayer({ name: 'Bilde', x: w * 0.275, y: h / 2, w: w * 0.55, h }) : imageLayer({ name: 'Bilde', x: w / 2, y: h * 0.32, w, h: h * 0.64 }))
    const cx = land ? w * 0.775 : w / 2
    d.layers.push(...stack([
      textLayer({ name: 'Dato', text: 'FREDAG 12. OKTOBER', size: sz(d, 0.034), weight: 700, ls: 3, color: '#c0392b' }),
      textLayer({ name: 'Tittel', text: 'Navn på\narrangementet', size: sz(d, 0.085), font: 'Montserrat', weight: 800, color: '#111111', lh: 1.02 }),
      textLayer({ name: 'Sted', text: 'Sted · kl. 19:00', size: sz(d, 0.03), weight: 500, color: '#555555' }),
    ], land ? { top: h * 0.12, bottom: h * 0.88, gap: m * 0.03, maxW: w * 0.38, edge: cx } : { top: h * 0.66, bottom: h * 0.97, gap: m * 0.018, maxW: w * 0.86, edge: cx }))
  } },
  { k: 'week', l: 'Ukeprogram', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const mx = w * 0.08
    d.bg = '#141414'
    const rows = [['TIRSDAG', '19:00', 'Kveldsmat i kafeen'], ['TORSDAG', '11:00', 'Bønn'], ['FREDAG', '19:00', 'Ungdomsmøte'], ['SØNDAG', '11:00', 'Gudstjeneste']] as const
    const top = h * 0.1 + m * 0.26
    const step = Math.min((h * 0.87 - top) / rows.length, m * 0.24)
    d.layers.push(pinText(textLayer({ name: 'Etikett', text: 'PROGRAM FOR UKEN', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 6, color: '#f5b82c', align: 'left' }), mx))
    d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'UKE 40', x: mx, y: h * 0.1 + m * 0.11, size: Math.round(m * 0.13), font: 'Bebas Neue', weight: 400, ls: 2, color: '#f3f1ec', align: 'left' }), mx))
    rows.forEach((r, i) => {
      const y = top + step * i
      const n = i + 1
      d.layers.push(pinText(textLayer({ name: `Dag ${n}`, text: r[0], x: mx, y, size: Math.round(m * 0.028), weight: 700, ls: 4, color: '#9d998f', align: 'left' }), mx))
      d.layers.push(pinText(textLayer({ name: `Møte ${n}`, text: r[2], x: mx, y: y + m * 0.055, size: Math.round(m * 0.05), font: 'Montserrat', weight: 700, color: '#f3f1ec', align: 'left' }), mx))
      d.layers.push(pinText(textLayer({ name: `Klokkeslett ${n}`, text: r[1], x: w - mx, y: y + m * 0.035, size: Math.round(m * 0.06), font: 'Bebas Neue', weight: 400, ls: 1, color: '#f5b82c', align: 'right' }), w - mx))
      if (i < rows.length - 1) d.layers.push(shapeLayer({ name: `Skillelinje ${n}`, x: w / 2, y: y + (step + m * 0.065) / 2, w: w - 2 * mx, h: Math.max(2, m * 0.002), fill: 'rgba(255,255,255,0.14)' }))
    })
    d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen! · www.menighet.no', x: mx, y: h * 0.94, size: Math.round(m * 0.026), weight: 500, color: '#9d998f', align: 'left' }), mx))
  } },
  { k: 'day', l: 'Dagsprogram', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const mx = w * 0.08
    d.bg = '#f3f1ec'
    const rows = [['10:30', 'Kaffe og velkomst', 'Kafeen'], ['11:00', 'Gudstjeneste', 'Salen'], ['12:30', 'Kirkekaffe', 'Kafeen'], ['13:00', 'Søndagsskole', 'Barnesalen']] as const
    const top = h * 0.1 + m * 0.31
    const step = Math.min((h * 0.86 - top) / rows.length, m * 0.2)
    const tx = mx + m * 0.2
    d.layers.push(pinText(textLayer({ name: 'Dato', text: 'SØNDAG 5. OKTOBER', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 5, color: '#c0392b', align: 'left' }), mx))
    d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'Dagens\nprogram', x: mx, y: h * 0.1 + m * 0.15, size: Math.round(m * 0.1), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1 }), mx))
    d.layers.push(shapeLayer({ name: 'Tidslinje', x: mx + m * 0.155, y: top + (step * (rows.length - 1)) / 2 + m * 0.02, w: Math.max(3, m * 0.004), h: step * (rows.length - 1), fill: '#c0392b' }))
    rows.forEach((r, i) => {
      const y = top + step * i
      const n = i + 1
      d.layers.push(pinText(textLayer({ name: `Klokkeslett ${n}`, text: r[0], x: mx, y: y + m * 0.02, size: Math.round(m * 0.055), font: 'Bebas Neue', weight: 400, ls: 1, color: '#111111', align: 'left' }), mx))
      d.layers.push(shapeLayer({ name: `Punkt ${n}`, kind: 'ellipse', x: mx + m * 0.155, y: y + m * 0.02, w: m * 0.028, h: m * 0.028, fill: '#c0392b' }))
      d.layers.push(pinText(textLayer({ name: `Punkt ${n} tittel`, text: r[1], x: tx, y: y + m * 0.005, size: Math.round(m * 0.045), font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }), tx))
      d.layers.push(pinText(textLayer({ name: `Punkt ${n} sted`, text: r[2], x: tx, y: y + m * 0.05, size: Math.round(m * 0.028), weight: 500, color: '#6b675f', align: 'left' }), tx))
    })
    d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen!', x: mx, y: h * 0.94, size: Math.round(m * 0.03), weight: 700, color: '#111111', align: 'left' }), mx))
  } },
  { k: 'weekday', l: 'Ukeprogram (lys)', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const mx = w * 0.08
    d.bg = '#f3f1ec'
    const rows = [['TIRSDAG', 'Kveldsmat i kafeen', 'Kafeen'], ['TORSDAG', 'Bønn', 'Samlingsrommet'], ['FREDAG', 'Ungdomsmøte', 'Salen'], ['SØNDAG', 'Gudstjeneste', 'Kirken']] as const
    const top = h * 0.1 + m * 0.31
    const step = Math.min((h * 0.86 - m * 0.06 - top) / (rows.length - 1), m * 0.2)
    const days = rows.map((r, i) => textLayer({ name: `Dag ${i + 1}`, text: r[0], x: mx, y: top + step * i + m * 0.02, size: Math.round(m * 0.05), font: 'Bebas Neue', weight: 400, ls: 1, color: '#111111', align: 'left' }))
    const dw = Math.max(...days.map((L) => textBox(L).w))
    const lx = mx + dw + m * 0.045
    const tx = lx + m * 0.045
    d.layers.push(pinText(textLayer({ name: 'Dato', text: 'UKE 40', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 5, color: '#c0392b', align: 'left' }), mx))
    d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'Ukens\nprogram', x: mx, y: h * 0.1 + m * 0.15, size: Math.round(m * 0.1), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1 }), mx))
    d.layers.push(shapeLayer({ name: 'Tidslinje', x: lx, y: top + (step * (rows.length - 1)) / 2 + m * 0.02, w: Math.max(3, m * 0.004), h: step * (rows.length - 1), fill: '#c0392b' }))
    rows.forEach((r, i) => {
      const y = top + step * i
      const n = i + 1
      d.layers.push(pinText(days[i] as TextLayer, mx))
      d.layers.push(shapeLayer({ name: `Punkt ${n}`, kind: 'ellipse', x: lx, y: y + m * 0.02, w: m * 0.028, h: m * 0.028, fill: '#c0392b' }))
      d.layers.push(pinText(textLayer({ name: `Møte ${n}`, text: r[1], x: tx, y: y + m * 0.005, size: Math.round(m * 0.045), font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }), tx))
      d.layers.push(pinText(textLayer({ name: `Sted ${n}`, text: r[2], x: tx, y: y + m * 0.05, size: Math.round(m * 0.028), weight: 500, color: '#6b675f', align: 'left' }), tx))
    })
    d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen!', x: mx, y: h * 0.94, size: Math.round(m * 0.03), weight: 700, color: '#111111', align: 'left' }), mx))
  } },
  { k: 'bold', l: 'Kunngjøring', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#f5b82c'
    d.layers.push(shapeLayer({ name: 'Ramme', x: w / 2, y: h / 2, w: w - m * 0.1, h: h - m * 0.1, fill: 'rgba(0,0,0,0)', strokeC: '#111111', strokeW: Math.max(4, m * 0.008) }))
    d.layers.push(textLayer({ name: 'Overskrift', text: 'VIKTIG\nBESKJED', x: w / 2, y: h * 0.45, size: Math.round(m * 0.16), font: 'Anton', weight: 400, color: '#111111', lh: 0.95 }))
    d.layers.push(textLayer({ name: 'Tekst', text: 'Skriv detaljene her', x: w / 2, y: h * 0.7, size: Math.round(m * 0.04), weight: 600, color: '#111111' }))
  } },
  // ── Nye maler: hver har en bildeplass og/eller tekst som stables (stack), så de passer i alle formater ──
  { k: 'split', l: 'Bilde og tekst', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    d.bg = '#f3f1ec'
    d.layers.push(land ? imageLayer({ name: 'Bilde', x: w * 0.25, y: h / 2, w: w * 0.5, h }) : imageLayer({ name: 'Bilde', x: w / 2, y: h * 0.275, w, h: h * 0.55 }))
    const x0 = land ? w * 0.5 + m * 0.08 : m * 0.08
    d.layers.push(...stack([
      textLayer({ name: 'Etikett', text: 'NYHET', size: sz(d, 0.032), weight: 700, ls: 5, color: '#c0392b', align: 'left' }),
      textLayer({ name: 'Tittel', text: 'En overskrift\nsom fanger', size: sz(d, 0.085), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1.05 }),
      textLayer({ name: 'Tekst', text: 'Skriv noen linjer om hva det gjelder,\nhvor det skjer og hvem som er velkommen.', size: sz(d, 0.03), weight: 500, color: '#555555', align: 'left', lh: 1.4 }),
      textLayer({ name: 'Lenke', text: 'Les mer · www.menighet.no', size: sz(d, 0.03), weight: 700, color: '#c0392b', align: 'left' }),
    ], land ? { top: h * 0.1, bottom: h * 0.9, gap: m * 0.035, maxW: w * 0.5 - m * 0.16, edge: x0 } : { top: h * 0.6, bottom: h * 0.95, gap: m * 0.025, maxW: w - m * 0.16, edge: x0 }))
  } },
  { k: 'verse', l: 'Bibelvers', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#111111'
    d.layers.push(imageLayer({ name: 'Bakgrunnsbilde', x: w / 2, y: h / 2, w, h }))
    d.layers.push(shapeLayer({ name: 'Mørk toning', x: w / 2, y: h / 2, w, h, fill: '#000000', op: 0.5 }))
    const [verse, ref] = stack([
      textLayer({ name: 'Vers', text: '«For så har Gud elsket verden\nat han gav sin Sønn, den enbårne»', size: sz(d, 0.07), font: 'Playfair Display', weight: 600, lh: 1.25 }),
      textLayer({ name: 'Henvisning', text: 'JOHANNES 3,16', size: sz(d, 0.03), weight: 700, ls: 6, color: '#f5b82c' }),
    ], { top: h * 0.15, bottom: h * 0.85, gap: m * 0.07, maxW: w * 0.84, edge: w / 2 }) as [TextLayer, TextLayer]
    const ly = (verse.y + textBox(verse).h / 2 + ref.y - textBox(ref).h / 2) / 2
    d.layers.push(shapeLayer({ name: 'Strek', x: w / 2, y: ly, w: m * 0.1, h: Math.max(3, m * 0.005), fill: '#f5b82c' }))
    d.layers.push(verse, ref)
  } },
  { k: 'series', l: 'Prekenserie', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    const x0 = m * 0.08
    d.bg = '#141414'
    if (land) {
      d.layers.push(imageLayer({ name: 'Bilde', x: w * 0.75, y: h / 2, w: w * 0.5, h }))
      d.layers.push(shapeLayer({ name: 'Aksentstripe', x: w * 0.5, y: h / 2, w: Math.max(6, m * 0.012), h, fill: '#f5b82c' }))
    } else {
      d.layers.push(imageLayer({ name: 'Bilde', x: w / 2, y: h * 0.75, w, h: h * 0.5 }))
      d.layers.push(shapeLayer({ name: 'Aksentstripe', x: w / 2, y: h * 0.5, w, h: Math.max(6, m * 0.012), fill: '#f5b82c' }))
    }
    d.layers.push(...stack([
      textLayer({ name: 'Etikett', text: 'PREKENSERIE', size: sz(d, 0.03), weight: 700, ls: 6, color: '#f5b82c', align: 'left' }),
      textLayer({ name: 'Tittel', text: 'Håp i\nhverdagen', size: sz(d, 0.14), font: 'Anton', weight: 400, upper: true, color: '#f3f1ec', align: 'left', lh: 1.08 }), // med større mellomrom: plass til Å-ringen over linjen
      textLayer({ name: 'Info', text: 'Del 2 av 4 · Søndag kl. 11:00', size: sz(d, 0.032), weight: 500, color: '#9d998f', align: 'left' }),
      textLayer({ name: 'Taler', text: 'Tale: Navn Navnesen', size: sz(d, 0.03), weight: 700, color: '#f3f1ec', align: 'left' }),
    ], land ? { top: h * 0.12, bottom: h * 0.88, gap: m * 0.045, maxW: w * 0.5 - m * 0.16, edge: x0 } : { top: h * 0.06, bottom: h * 0.47, gap: m * 0.04, maxW: w - m * 0.16, edge: x0 }))
  } },
  { k: 'countdown', l: 'Nedtelling', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#1d2a3a'
    const ts = stack([
      textLayer({ name: 'Tall', text: '3', size: sz(d, 0.34), font: 'Anton', weight: 400, color: '#f5b82c', lh: 0.95 }),
      textLayer({ name: 'Enhet', text: 'DAGER IGJEN', size: sz(d, 0.045), weight: 800, ls: 8, color: '#f3f1ec' }),
      textLayer({ name: 'Tittel', text: 'til sommerleiren', size: sz(d, 0.07), font: 'Playfair Display', weight: 600, color: '#f3f1ec' }),
      textLayer({ name: 'Detaljer', text: 'Fredag 27. juni · Påmelding på nett', size: sz(d, 0.03), weight: 500, color: '#c9c5bc' }),
    ], { top: h * 0.1, bottom: h * 0.9, gap: m * 0.045, maxW: w * 0.84, edge: w / 2 })
    const n = ts[0] as TextLayer
    const r = Math.max(textBox(n).w, textBox(n).h) * 1.12
    d.layers.push(shapeLayer({ name: 'Ring', kind: 'ellipse', x: n.x, y: n.y, w: r, h: r, fill: 'rgba(0,0,0,0)', strokeC: '#f5b82c', strokeW: Math.max(4, m * 0.008) }))
    d.layers.push(...ts)
  } },
  { k: 'news', l: 'Nyhet', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const mx = m * 0.08
    const band = h * (isLand(d) ? 0.18 : 0.13)
    d.bg = '#ffffff'
    d.layers.push(shapeLayer({ name: 'Toppfelt', x: w / 2, y: band / 2, w, h: band, fill: '#1d2a3a' }))
    d.layers.push(...stack([textLayer({ name: 'Etikett', text: 'NYTT FRA MENIGHETEN', size: sz(d, 0.032), weight: 700, ls: 5, color: '#f5b82c', align: 'left' })], { top: 0, bottom: band, gap: 0, maxW: w - 2 * mx, edge: mx }))
    d.layers.push(...stack([
      textLayer({ name: 'Tittel', text: 'Overskrift på\nnyheten', size: sz(d, 0.08), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1.05 }),
      textLayer({ name: 'Tekst', text: 'Her kan du skrive mer om saken. Hold det kort\nog konkret, og fortell hva leseren kan gjøre.', size: sz(d, 0.032), weight: 500, color: '#444444', align: 'left', lh: 1.45 }),
    ], { top: band + m * 0.07, bottom: h * 0.84, gap: m * 0.04, maxW: w - 2 * mx, edge: mx, valign: 0 }))
    d.layers.push(shapeLayer({ name: 'Skillelinje', x: w / 2, y: h * 0.87, w: w - 2 * mx, h: Math.max(2, m * 0.003), fill: '#e4e1da' }))
    d.layers.push(...stack([textLayer({ name: 'Bunntekst', text: 'www.menighet.no', size: sz(d, 0.028), weight: 700, color: '#1d2a3a', align: 'left' })], { top: h * 0.88, bottom: h * 0.97, gap: 0, maxW: w - 2 * mx, edge: mx }))
  } },
  { k: 'poster', l: 'Konsertplakat', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    d.bg = '#e4411f'
    d.layers.push(land ? imageLayer({ name: 'Bilde', x: w * 0.225, y: h / 2, w: w * 0.45, h }) : imageLayer({ name: 'Bilde', x: w / 2, y: h * 0.25, w, h: h * 0.5 }))
    const cx = land ? w * 0.725 : w / 2
    d.layers.push(...stack([
      textLayer({ name: 'Arrangør', text: 'GOSPELKORET PRESENTERER', size: sz(d, 0.03), weight: 700, ls: 5, color: '#111111' }),
      textLayer({ name: 'Tittel', text: 'KONSERT', size: sz(d, 0.22), font: 'Anton', weight: 400, color: '#111111', lh: 0.95 }),
      textLayer({ name: 'Tid', text: 'Fredag 14. november kl. 19:00', size: sz(d, 0.042), font: 'Montserrat', weight: 700, color: '#ffffff' }),
      textLayer({ name: 'Info', text: 'Fri entré · Kollekt ved utgangen', size: sz(d, 0.03), weight: 500, color: '#111111' }),
    ], land ? { top: h * 0.1, bottom: h * 0.9, gap: m * 0.03, maxW: w * 0.55 - m * 0.12, edge: cx } : { top: h * 0.53, bottom: h * 0.96, gap: m * 0.025, maxW: w - m * 0.12, edge: cx }))
  } },
  { k: 'thanks', l: 'Takk', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    d.bg = '#f3f1ec'
    d.layers.push(shapeLayer({ name: 'Sirkel 1', kind: 'ellipse', x: w * 0.1, y: h * 0.1, w: m * 0.5, h: m * 0.5, fill: '#f5b82c', op: 0.22 }))
    d.layers.push(shapeLayer({ name: 'Sirkel 2', kind: 'ellipse', x: w * 0.92, y: h * 0.9, w: m * 0.6, h: m * 0.6, fill: '#c0392b', op: 0.14 }))
    d.layers.push(...stack([
      textLayer({ name: 'Tittel', text: 'Tusen takk!', size: sz(d, 0.15), font: 'DM Serif Display', weight: 400, color: '#111111' }),
      textLayer({ name: 'Tekst', text: 'til alle frivillige som gjorde\nbasaren til en fest', size: sz(d, 0.042), weight: 500, color: '#555555', lh: 1.35 }),
      textLayer({ name: 'Hilsen', text: '— Menighetsrådet', size: sz(d, 0.04), font: 'Playfair Display', weight: 600, color: '#c0392b' }),
    ], { top: h * 0.15, bottom: h * 0.85, gap: m * 0.05, maxW: w * 0.8, edge: w / 2 }))
  } },
  { k: 'facts', l: 'Tall og fakta', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    const mx = m * 0.08
    d.bg = '#141414'
    const head = land ? { top: h * 0.08, bottom: h * 0.32 } : { top: h * 0.06, bottom: h * 0.27 }
    d.layers.push(...stack([
      textLayer({ name: 'Etikett', text: 'MENIGHETEN 2026', size: sz(d, 0.028), weight: 700, ls: 6, color: '#f5b82c' }),
      textLayer({ name: 'Tittel', text: 'Året i tall', size: sz(d, 0.085), font: 'Montserrat', weight: 800, color: '#f3f1ec' }),
    ], { ...head, gap: m * 0.02, maxW: w - 2 * mx, edge: w / 2 }))
    const items = [['312', 'i snitt på gudstjenestene'], ['48', 'frivillige i sving'], ['1 250', 'kopper kirkekaffe']] as const
    const y0 = head.bottom + m * 0.04
    const y1 = h - mx
    items.forEach(([num, label], i) => {
      const n = i + 1
      const cell = land
        ? { top: y0, bottom: y1, maxW: ((w - 2 * mx) / 3) * 0.9, edge: mx + ((w - 2 * mx) / 3) * (i + 0.5) }
        : { top: y0 + ((y1 - y0) / 3) * i, bottom: y0 + ((y1 - y0) / 3) * (i + 1), maxW: w - 2 * mx, edge: w / 2 }
      if (i > 0) {
        d.layers.push(land
          ? shapeLayer({ name: `Skillelinje ${i}`, x: mx + ((w - 2 * mx) / 3) * i, y: (y0 + y1) / 2, w: Math.max(2, m * 0.003), h: (y1 - y0) * 0.7, fill: 'rgba(255,255,255,0.16)' })
          : shapeLayer({ name: `Skillelinje ${i}`, x: w / 2, y: cell.top, w: (w - 2 * mx) * 0.6, h: Math.max(2, m * 0.003), fill: 'rgba(255,255,255,0.16)' }))
      }
      d.layers.push(...stack([
        textLayer({ name: `Tall ${n}`, text: num, size: sz(d, land ? 0.2 : 0.14), font: 'Bebas Neue', weight: 400, ls: 1, color: '#f5b82c', lh: 1 }),
        textLayer({ name: `Forklaring ${n}`, text: label, size: sz(d, 0.032), weight: 500, color: '#c9c5bc' }),
      ], { ...cell, gap: m * 0.012 }))
    })
  } },
  { k: 'staff', l: 'Presentasjon', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const land = isLand(d)
    d.bg = '#f3f1ec'
    const side = land ? Math.min(h * 0.76, w * 0.42) : Math.min(w * 0.62, h * 0.42)
    const ix = land ? m * 0.1 + side / 2 : w / 2
    const iy = land ? h / 2 : h * 0.08 + side / 2
    const off = m * 0.025
    d.layers.push(shapeLayer({ name: 'Ramme', x: ix + off, y: iy + off, w: side, h: side, fill: '#f5b82c' }))
    d.layers.push(imageLayer({ name: 'Portrett', x: ix, y: iy, w: side, h: side }))
    const texts = [
      textLayer({ name: 'Etikett', text: 'NY MEDARBEIDER', size: sz(d, 0.03), weight: 700, ls: 5, color: '#c0392b', align: land ? 'left' : 'center' }),
      textLayer({ name: 'Navn', text: 'Fornavn Etternavn', size: sz(d, 0.075), font: 'Montserrat', weight: 800, color: '#111111', align: land ? 'left' : 'center' }),
      textLayer({ name: 'Rolle', text: 'Ungdomsarbeider', size: sz(d, 0.04), weight: 600, color: '#555555', align: land ? 'left' : 'center' }),
      textLayer({ name: 'Tekst', text: 'Et par linjer om personen og\nhva vedkommende skal jobbe med.', size: sz(d, 0.03), weight: 500, color: '#555555', lh: 1.4, align: land ? 'left' : 'center' }),
    ]
    const x0 = m * 0.1 + side + off + m * 0.08
    d.layers.push(...stack(texts, land ? { top: h * 0.12, bottom: h * 0.88, gap: m * 0.025, maxW: w - x0 - m * 0.08, edge: x0 } : { top: iy + side / 2 + off + m * 0.05, bottom: h * 0.96, gap: m * 0.02, maxW: w * 0.84, edge: w / 2 }))
  } },
  { k: 'minimal', l: 'Minimal', make: (d) => {
    const { w, h } = d
    const m = Math.min(w, h)
    const mx = m * 0.09
    d.bg = '#ffffff'
    d.layers.push(...stack([textLayer({ name: 'Etikett', text: 'HØSTEN 2026', size: sz(d, 0.028), weight: 700, ls: 6, color: '#111111', align: 'left' })], { top: mx * 0.6, bottom: mx * 1.4, gap: 0, maxW: (w - 2 * mx) * 0.55, edge: mx }))
    d.layers.push(...stack([textLayer({ name: 'Nettside', text: 'menighet.no', size: sz(d, 0.026), weight: 500, color: '#6b675f', align: 'right' })], { top: mx * 0.6, bottom: mx * 1.4, gap: 0, maxW: (w - 2 * mx) * 0.4, edge: w - mx }))
    const [title, sub] = stack([
      textLayer({ name: 'Tittel', text: 'Enkelt\nog luftig', size: sz(d, 0.14), font: 'Space Grotesk', weight: 700, color: '#111111', align: 'left', lh: 1 }),
      textLayer({ name: 'Undertekst', text: 'En kort undertekst om hva det gjelder', size: sz(d, 0.035), weight: 500, color: '#6b675f', align: 'left' }),
    ], { top: h * 0.45, bottom: h - mx, gap: m * 0.03, maxW: w - 2 * mx, edge: mx, valign: 1 }) as [TextLayer, TextLayer]
    const lw = m * 0.12
    d.layers.push(shapeLayer({ name: 'Strek', x: mx + lw / 2, y: title.y - textBox(title).h / 2 - m * 0.05, w: lw, h: Math.max(4, m * 0.008), fill: '#c0392b' }))
    d.layers.push(title, sub)
  } },
]

export function newDoc(w: number, h: number, tpl?: string, now = Date.now()): PdDoc {
  const d: PdDoc = { id: uid('p'), name: 'Uten navn', w, h, bg: '#ffffff', layers: [], created: now, updated: now }
  TEMPLATES.find((t) => t.k === tpl)?.make(d)
  return d
}

/** Millimeter for trykk (kjente formater, ellers ut fra 300 dpi). */
export function mmOf(doc: Pick<PdDoc, 'w' | 'h'>): [number, number] {
  const f = FORMATS.find((x) => x.w === doc.w && x.h === doc.h && x.mm)
  return f?.mm ?? [(doc.w / DPI) * 25.4, (doc.h / DPI) * 25.4]
}

/** Lag som går helt ut til kanten, forlenges ut i utfallende område (og tilbake igjen). */
export function bleedLayers(layers: PdLayer[], w: number, h: number, on: boolean): PdLayer[] {
  const b = BLEED
  const e = 2
  return layers.map((L) => {
    if (L.type === 'text' || (L.rot && Math.abs(L.rot % 360) > 0.01)) return L
    let l = L.x - L.w / 2
    let r = L.x + L.w / 2
    let t = L.y - L.h / 2
    let bt = L.y + L.h / 2
    if (on) {
      if (Math.abs(l) <= e) l = -b
      if (Math.abs(r - w) <= e) r = w + b
      if (Math.abs(t) <= e) t = -b
      if (Math.abs(bt - h) <= e) bt = h + b
    } else {
      if (Math.abs(l + b) <= e) l = 0
      if (Math.abs(r - w - b) <= e) r = w
      if (Math.abs(t + b) <= e) t = 0
      if (Math.abs(bt - h - b) <= e) bt = h
    }
    return { ...L, x: (l + r) / 2, y: (t + bt) / 2, w: r - l, h: bt - t }
  })
}

export function toCMYK(hex: string): [number, number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m?.[1]) return [0, 0, 0, 100]
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 0.999) return [0, 0, 0, 100]
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)) as [number, number, number, number]
}

export function fromCMYK(c: readonly number[]): string {
  const k = (c[3] ?? 0) / 100
  const f = (v: number) => Math.round(255 * (1 - v / 100) * (1 - k))
  const h = (v: number) => ('0' + clamp(v, 0, 255).toString(16)).slice(-2)
  return '#' + h(f(c[0] ?? 0)) + h(f(c[1] ?? 0)) + h(f(c[2] ?? 0))
}

/** Malens første tomme bildeplass (synlig og ulåst, nederst først), eller null. */
export function emptySlot(d: Pick<PdDoc, 'layers'>): ImageLayer | null {
  return (d.layers.find((L) => L.type === 'image' && !L.src && !L.hidden && !L.locked) as ImageLayer | undefined) ?? null
}

/**
 * Hvor et nytt bilde havner: laget som skal byttes (`replace`), bildeplassen under punktet (`hit` når bildet slippes),
 * en valgt tom bildeplass, eller malens første tomme bildeplass – ellers et nytt lag (null). En logo (`logo`) blir alltid
 * et eget lag (eller bytter laget den er bedt om å bytte); den fyller aldri en bildeplass i malen.
 */
export function targetSlot(d: Pick<PdDoc, 'layers'>, o: { replace?: PdLayer | undefined; at: boolean; hit?: PdLayer | null; sel?: PdLayer | null; logo?: boolean }): ImageLayer | null {
  if (o.replace) return o.replace.type === 'image' ? o.replace : null
  if (o.logo) return null
  if (o.at) return o.hit?.type === 'image' ? o.hit : null
  if (o.sel?.type === 'image' && !o.sel.src) return o.sel
  return emptySlot(d)
}

/** Bildekilder og masker et prosjekt bruker (begge sider). */
export function mediaIds(p: Pick<PdDoc, 'layers' | 'back'>): string[] {
  const o: string[] = []
  for (const L of [...p.layers, ...(p.back?.layers ?? [])]) {
    if (L.type === 'image') {
      if (L.src) o.push(L.src)
      if (L.mask) o.push(L.mask)
    }
  }
  return o
}
