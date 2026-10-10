/**
 * Dokumentformatet i Thumbnail Studio (1920 × 1080). Samme felt og standardverdier som dagens app
 * (media-lab/src/legacy/thumb-engine.js), så maler, grunnoppsett og sikkerhetskopier kan brukes i begge.
 *
 * Bildekilder (`src`/`orig`):
 * - `m:<asset-id>`  bilde i Dine medier (ny app)
 * - `ch:<fil-id>`   original i ConnectHub (Fellesmappe), aldri en kopi
 * - `asset:<navn>`  gamle innebygde logoer (vises fortsatt i gamle maler, tilbys ikke lenger)
 * - `db:<nøkkel>`   bilde i dagens app (IndexedDB «thumbstudio»); gjøres om til `m:` ved import
 */
export const W = 1920
export const H = 1080
export const MAX_IMG = 5
export const MAX_TPL = 5

export type Weight = 400 | 500 | 600 | 700 | 800 | 900

export const FONTS: readonly (readonly [string, readonly Weight[]])[] = [
  ['Bebas Neue', [400]], ['Montserrat', [400, 500, 600, 700, 800, 900]], ['League Spartan', [400, 500, 600, 700, 800, 900]],
  ['Anton', [400]], ['Oswald', [400, 500, 600, 700]], ['Archivo', [400, 500, 600, 700, 800, 900]], ['Playfair Display', [400, 500, 600, 700, 800, 900]],
]

/** Gamle innebygde logoer: tilbys ikke lenger, men vises i maler som bruker dem. */
export const ASSETS: Readonly<Record<string, { url: string; label: string }>> = {
  'logo-symbol': { url: '/images/logo-symbol.png', label: 'Livets Ord-symbol' },
  'logo-kbs': { url: '/images/logo-kbs.png', label: 'Kveldsbibelskole-logo' },
  'logo-wol': { url: '/images/logo-wol.png', label: 'Word of Life-logo' },
}

export const PALETTE = ['#ffffff', '#000000', '#1a1a1a', '#f5b800', '#0495c0', '#338f9c', '#7b3fe4', '#e84393', '#e4411f', '#e4e1da'] as const

export type LayerType = 'text' | 'image' | 'shape' | 'glow'
export type Role = 'person' | 'name' | 'theme' | null

interface LayerBase {
  id: string
  x: number
  y: number
  w: number
  h: number
  rot: number
  flipX: boolean
  flipY: boolean
  op: number
  hidden: boolean
  lock: boolean
  shadow: number
  role: Role
  name: string
  /** Koblet til et annet lag (flytter seg sammen med det). */
  link?: string | null
}

export interface TextLayer extends LayerBase {
  type: 'text'
  text: string
  /** Eldre listeformat ('num' | 'bullet'); nye lister skrives rett i teksten. */
  list: string
  font: string
  weight: number
  size: number
  color: string
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle' | 'bottom'
  lh: number
  ls: number
  upper: boolean
  fit: boolean
  bar: boolean
  barColor: string
  barH: number
  barW?: number
  barGap?: number
}

export interface ImageLayer extends LayerBase {
  type: 'image'
  src: string | null
  orig: string | null
  cT: number
  cB: number
  cL: number
  cR: number
  shape: 'rect' | 'rounded' | 'ellipse'
  radius: number
  fit: 'cover' | 'contain'
  zoom: number
  px: number
  py: number
  flip: boolean
  border: number
  borderColor: string
  tint: string | null
}

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  kind: 'rect' | 'rounded' | 'ellipse' | 'line'
  radius: number
  fill: string
  fill2: string | null
  angle: number
  stroke: number
  strokeColor: string
}

export interface GlowLayer extends LayerBase {
  type: 'glow'
  color: string
  soft: number
}

export type Layer = TextLayer | ImageLayer | ShapeLayer | GlowLayer

export interface Background {
  type: 'color' | 'gradient' | 'image'
  color: string
  c1: string
  c2: string
  angle: number
  radial: boolean
  src: string | null
  orig?: string | null
  zoom: number
  px: number
  py: number
  blur: number
  dim: number
}

export interface Vignette {
  on: boolean
  amt: number
  size: number
  color: string
  top: boolean
}

export interface Doc {
  v: 1
  bg: Background
  vig: Vignette
  layers: Layer[]
  /** Nøkkel til standardoppsettet dokumentet ble laget fra (når det ikke er kategoriens grunnoppsett). */
  lay?: string
}

/** Kort, tilfeldig ID (samme form som dagens app: små bokstaver og tall). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5)
}

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T

const BASE = (): LayerBase => ({ id: uid(), x: 660, y: 340, w: 600, h: 400, rot: 0, flipX: false, flipY: false, op: 1, hidden: false, lock: false, shadow: 0, role: null, name: '' })

type Patch<T> = Partial<Omit<T, 'type'>>

/** Nytt lag med dagens standardverdier. */
export function L(type: 'text', p?: Patch<TextLayer>): TextLayer
export function L(type: 'image', p?: Patch<ImageLayer>): ImageLayer
export function L(type: 'shape', p?: Patch<ShapeLayer>): ShapeLayer
export function L(type: 'glow', p?: Patch<GlowLayer>): GlowLayer
export function L(type: LayerType, p?: Record<string, unknown>): Layer
export function L(type: LayerType, p: Record<string, unknown> = {}): Layer {
  const base = BASE()
  switch (type) {
    case 'text':
      return { ...base, type, text: 'Tekst', list: '', font: 'Montserrat', weight: 700, size: 90, color: '#ffffff', align: 'left', valign: 'top', lh: 1.1, ls: 0, upper: false, fit: true, bar: false, barColor: '#f5b800', barH: 8, h: 160, ...p } as TextLayer
    case 'image':
      return { ...base, type, src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 40, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null, ...p } as ImageLayer
    case 'shape':
      return { ...base, type, kind: 'rounded', radius: 40, fill: '#ffffff', fill2: null, angle: 135, stroke: 0, strokeColor: '#ffffff', ...p } as ShapeLayer
    case 'glow':
      return { ...base, type, color: '#f5b800', soft: 0.5, op: 0.6, w: 900, h: 900, x: 510, y: 90, ...p } as GlowLayer
  }
}

export function emptyDoc(): Doc {
  return {
    v: 1,
    bg: { type: 'color', color: '#000000', c1: '#241046', c2: '#07040f', angle: 135, radial: false, src: null, zoom: 1, px: 0.5, py: 0.5, blur: 0, dim: 0 },
    vig: { on: false, amt: 0.55, size: 0.5, color: '#000000', top: false },
    layers: [],
  }
}

/** Alle bildekilder i dokumentet (lag og bakgrunn). */
export function srcsOf(doc: Doc): string[] {
  const s: string[] = []
  for (const l of doc.layers) if (l.type === 'image' && l.src) s.push(l.src)
  if (doc.bg.src) s.push(doc.bg.src)
  return s
}

/** Alle referanser (også originaler før AI-utklipp). */
export function refsOf(doc: Pick<Doc, 'layers'> & { bg?: Partial<Background> }): string[] {
  const s = new Set<string>()
  const add = (v: string | null | undefined) => {
    if (v) s.add(v)
  }
  for (const l of doc.layers) {
    if (l.type === 'image') {
      add(l.src)
      add(l.orig)
    }
  }
  add(doc.bg?.src)
  add(doc.bg?.orig)
  return [...s]
}

/** Egne bilder i malen (maks 5; gamle innebygde logoer og Fellesmappe-logoer teller som i dag bare når de er lokale). */
export function countImgs(doc: Doc): number {
  const own = (v: string | null | undefined) => !!v && (v.startsWith('db:') || v.startsWith('m:'))
  const s = new Set<string>()
  for (const l of doc.layers) if (l.type === 'image' && own(l.src) && l.src) s.add(l.src)
  if (doc.bg.type === 'image' && own(doc.bg.src) && doc.bg.src) s.add(doc.bg.src)
  return s.size
}

export function okFile(f: Blob | null | undefined): f is Blob {
  return !!f && /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.type || '') && f.size <= 40 * 1024 * 1024
}

export const isLine = (l: Layer): l is ShapeLayer => l.type === 'shape' && l.kind === 'line'
export const isLogoAsset = (l: Layer): boolean => l.type === 'image' && !!l.src && l.src.startsWith('asset:')
