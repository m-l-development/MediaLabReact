/**
 * Felles fargetemaer for ferdige maler i hele MediaLab (Thumbnail, Photo, Motion, Loop). «Standard» = malens egne
 * farger (null). De ti ferdige temaene er de samme som «Velg farge» i Thumbnail Studio; «Egne farger» lages av tre
 * farger (bakgrunn, tekst, aksent) som utvides til en full palett med god kontrast.
 *
 * Omfarging skjer per farge ut fra hvilken rolle den har (bakgrunn, flate, aksent, tekst) og hvor lys/mettet den er, så
 * lag, plassering, størrelse og tekst aldri endres, og malens oppbygging (lys/mørk, nøytral/farget) beholdes.
 */

export interface Palette { bg: string; bg2: string; fg: string; fill: string; acc: string; mid: string }
export interface Theme { k: string; name: string; p: Palette }
/** Valgt tema: null = Standard (malens farger), et ferdig tema (k) eller egne farger (k = 'custom', c = bakgrunn, tekst, aksent). */
export type ThemeValue = { k: string; c?: [string, string, string] } | null

export const THEMES: readonly Theme[] = [
  { k: 'bw', name: 'Svart på hvit', p: { bg: '#ffffff', bg2: '#ececec', fg: '#111111', fill: '#dcdcdc', acc: '#5f5f5f', mid: '#9a9a9a' } },
  { k: 'wb', name: 'Hvit og svart', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffffff', fill: '#2c2c2c', acc: '#c4c4c4', mid: '#7a7a7a' } },
  { k: 'by', name: 'Svart og gul', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffd21f', fill: '#2e2a14', acc: '#ffd21f', mid: '#8a7a30' } },
  { k: 'ow', name: 'Oransje og hvit', p: { bg: '#ff6a13', bg2: '#d9500a', fg: '#ffffff', fill: '#a83a00', acc: '#1a1a1a', mid: '#ffb07a' } },
  { k: 'wr', name: 'Hvit og rød', p: { bg: '#ffffff', bg2: '#f2f2f2', fg: '#d7191f', fill: '#fde0e0', acc: '#d7191f', mid: '#ef9a9c' } },
  { k: 'guest', name: 'Gjest-farger', p: { bg: '#13315c', bg2: '#0b1d3a', fg: '#fff7ed', fill: '#ff6b4a', acc: '#ffb4a2', mid: '#c2410c' } },
  { k: 'violet', name: 'Hvit på mørk lilla/blå', p: { bg: '#2a1f6b', bg2: '#140f3d', fg: '#ffffff', fill: '#5b3fd1', acc: '#b9a8ff', mid: '#6d5fb0' } },
  { k: 'grr', name: 'Grå, rød og svart', p: { bg: '#3a3a3a', bg2: '#121212', fg: '#ffffff', fill: '#c8102e', acc: '#ff5a67', mid: '#8c8c8c' } },
  { k: 'wbl', name: 'Hvit og blå', p: { bg: '#0b4fd6', bg2: '#083a9e', fg: '#ffffff', fill: '#062c78', acc: '#cfe0ff', mid: '#6f9cf0' } },
  { k: 'wg', name: 'Hvit på grønn', p: { bg: '#0f6b3f', bg2: '#07472a', fg: '#ffffff', fill: '#0b5132', acc: '#b8f5cf', mid: '#5fb488' } },
]

/** Startfarger når brukeren velger «Egne farger» første gang. */
export const CUSTOM_START: [string, string, string] = ['#1b2a4a', '#ffffff', '#f5b82c']

export const HEX = /^#[0-9a-f]{6}$/i

export function hexRgb(c: string | null | undefined): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c ?? '')
  const n = m?.[1] ? parseInt(m[1], 16) : 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
export const rgbHex = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/** Opplevd lyshet 0–255. */
export function luma(c: string | null | undefined): number {
  if (!c || !HEX.test(c)) return 0
  const [r, g, b] = hexRgb(c)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Tekstfarge som syns på fargen. */
export const ink = (c: string): string => (HEX.test(c) && luma(c) > 150 ? '#111111' : HEX.test(c) ? '#ffffff' : '#111111')

/** Blanding av to farger (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = hexRgb(a), B = hexRgb(b)
  return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

/** Minste lyshetsforskjell (0–255) mellom tekst og bakgrunn i egne farger; under dette velges en lesbar tekstfarge. */
export const MIN_TEXT_CONTRAST = 90

/** Full palett fra tre egne farger (bakgrunn, tekst, aksent), med lesbar tekst. */
export function paletteFrom(c: [string, string, string]): Palette {
  const bg = HEX.test(c[0]) ? c[0].toLowerCase() : CUSTOM_START[0]
  let fg = HEX.test(c[1]) ? c[1].toLowerCase() : ink(bg)
  if (Math.abs(luma(fg) - luma(bg)) < MIN_TEXT_CONTRAST) fg = ink(bg)
  const acc = HEX.test(c[2]) ? c[2].toLowerCase() : fg
  const darkBg = luma(bg) < 128
  return { bg, bg2: mix(bg, darkBg ? '#000000' : '#ffffff', 0.35), fg, fill: mix(bg, acc, 0.55), acc, mid: mix(bg, fg, 0.5) }
}

/** Palett for et valgt tema; null for Standard (eller ukjent tema). */
export function paletteOfTheme(v: ThemeValue): Palette | null {
  if (!v) return null
  if (v.k === 'custom') return v.c ? paletteFrom(v.c) : null
  return THEMES.find((t) => t.k === v.k)?.p ?? null
}

/** Tre fargeprøver (bakgrunn, tekst, aksent) for knapper og menyer. */
export const swatchOf = (p: Palette): [string, string, string] => [p.bg, p.fg, p.acc]

/** Gyldig temaverdi fra lagrede data (ukjent → null = Standard). */
export function cleanTheme(v: unknown): ThemeValue {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (o.k === 'custom' && Array.isArray(o.c) && o.c.length === 3 && o.c.every((x) => typeof x === 'string' && HEX.test(x))) return { k: 'custom', c: [...o.c] as [string, string, string] }
  return typeof o.k === 'string' && THEMES.some((t) => t.k === o.k) ? { k: o.k } : null
}

function hsl(h: string): { l: number; s: number } | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h || '')
  if (!m?.[1]) return null
  let s = m[1]
  if (s.length === 3) s = s.replace(/./g, '$&$&')
  const r = parseInt(s.slice(0, 2), 16) / 255
  const g = parseInt(s.slice(2, 4), 16) / 255
  const b = parseInt(s.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  const d = mx - mn
  return { l, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)) }
}

export type ColorUse = 'bg' | 'fill' | 'acc' | 'text'

/**
 * Én farge i malen → fargen i paletten, ut fra rollen og hvor lys/mettet originalen er: mørke flater blir bakgrunn,
 * lyse blir tekstfarge, grå blir mellomfarge og mettede blir aksent eller flate.
 */
export function mapColor(h: string, use: ColorUse, P: Palette): string {
  const c = hsl(h)
  if (!c) return h
  const neu = c.s < 0.2
  const dark = c.l < (neu ? 0.35 : 0.3)
  const light = c.l > (neu ? 0.7 : 0.8)
  if (use === 'bg') return light ? P.fg : c.l < 0.2 ? P.bg2 : P.bg
  if (dark) return use === 'fill' ? P.bg2 : P.bg
  if (light) return P.fg
  if (neu) return P.mid
  return use === 'fill' ? P.fill : P.acc
}

/** Sortering i malbiblioteket. */
export type TplSort = 'std' | 'name' | 'cat' | 'new'

/** Tema som kort tekst i en adresse (f.eks. «wbl» eller «custom.1b2a4a.ffffff.f5b82c»); Standard = ''. */
export function themeToParam(v: ThemeValue): string {
  if (!v) return ''
  return v.k === 'custom' && v.c ? 'custom.' + v.c.map((x) => x.slice(1)).join('.') : v.k
}

export function themeFromParam(p: string | null | undefined): ThemeValue {
  if (!p) return null
  const m = /^custom\.([0-9a-f]{6})\.([0-9a-f]{6})\.([0-9a-f]{6})$/i.exec(p)
  return cleanTheme(m ? { k: 'custom', c: [`#${m[1]}`, `#${m[2]}`, `#${m[3]}`] } : { k: p })
}

const RGB = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/i

/** Om verdien er en farge omfargingen forstår («#rrggbb», «#rgb», «rgb()» eller «rgba()»). */
export const isColorValue = (v: unknown): v is string => typeof v === 'string' && (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) || RGB.test(v.trim()))

/**
 * Som mapColor, men for alle fargeformater i malene: «rgb()»/«rgba()» gjøres om til hex, omfarges og skrives tilbake
 * med samme gjennomsiktighet. Helt gjennomsiktige farger og alt annet (gradienter, «none») røres ikke.
 */
export function mapAny(v: string, use: ColorUse, P: Palette): string {
  const m = RGB.exec(v.trim())
  if (!m) return /^#/.test(v) ? mapColor(v, use, P) : v
  const a = m[4] === undefined || m[4] === '' ? 1 : Number(m[4])
  if (!(a > 0)) return v
  const out = mapColor(rgbHex(Number(m[1]), Number(m[2]), Number(m[3])), use, P)
  if (a >= 1) return out
  const [r, g, b] = hexRgb(out)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
