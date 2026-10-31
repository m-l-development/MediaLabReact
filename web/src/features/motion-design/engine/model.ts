/**
 * Motion design – tidslinjemodellen. Typet port av media-lab/src/legacy/motion-engine.js (modell, maler, validering).
 * Dokumentformatet er det samme som i dagens app, så .motion-filer og prosjekter kan flyttes begge veier.
 * Mediefiler refereres med `m-<AssetId>` (felles mediebibliotek, «Dine medier»).
 */

import { cleanEffects, type Effect } from './fx'
import { cleanKeys, type Keys } from './kf'

export type Pt = [number, number]
export interface Curves { m?: Pt[]; r?: Pt[]; g?: Pt[]; b?: Pt[] }
export type CurveCh = keyof Curves

export interface Grade {
  curves: Curves | null
  bri: number
  con: number
  sat: number
  blur: number
  look: string
  cS: number
  cM: number
  cH: number
}

export interface Trans { type: string; dur: number }
export interface Crop { l: number; t: number; r: number; b: number }

interface ClipCommon extends Grade {
  id: string
  link?: string
  /** Effekter (Avansert), i rekkefølge. Se engine/fx.ts. */
  effects?: Effect[]
  /** Keyframes (Avansert). Se engine/kf.ts. */
  kf?: Keys
  trans: Trans
  dim: number
  temp: number
  tint: number
  vig: number
  grain: number
}

export interface ColorClip extends ClipCommon {
  kind: 'color'
  dur: number
  c1: string
  c2: string
  grad: 'none' | 'linear' | 'radial'
  ang: number
  spin: number
}

export interface MediaClip extends ClipCommon {
  kind: 'video' | 'image'
  media: string
  name: string
  in: number
  out: number
  dur: number
  vol: number
  muted: boolean
  fit: 'cover' | 'contain'
  zoom: number
  fx: number
  fy: number
  kb: boolean
  speed: number
  rev: boolean
  afi: number
  afo: number
  x: number
  y: number
  scale: number
  rot: number
  flipH: boolean
  flipV: boolean
  crop: Crop
}

export type Clip = ColorClip | MediaClip

export interface Overlay extends Grade {
  id: string
  link?: string
  /** Effekter (Avansert), i rekkefølge. Se engine/fx.ts. */
  effects?: Effect[]
  /** Keyframes (Avansert). Se engine/kf.ts. */
  kf?: Keys
  lane: number
  kind: 'video' | 'image'
  media: string
  name: string
  start: number
  in: number
  out: number
  dur: number
  speed: number
  rev: boolean
  vol: number
  muted: boolean
  x: number
  y: number
  scale: number
  rot: number
  opacity: number
  fadeIn: number
  fadeOut: number
  anim: string
  blend: GlobalCompositeOperation
  radius: number
  border: number
  borderColor: string
  shadow: boolean
  flipH: boolean
  flipV: boolean
  crop: Crop
  ar: number
  keyOn: boolean
  keyColor: string
  keySim: number
  keySmooth: number
  keySpill: number
}

export interface TextItem {
  id: string
  link?: string
  /** Keyframes (Avansert). Se engine/kf.ts. */
  kf?: Keys
  lane: number
  start: number
  dur: number
  text: string
  x: number
  y: number
  size: number
  font: string
  weight: number
  italic: boolean
  color: string
  align: 'left' | 'center' | 'right'
  /** Loddrett justering mot y (Avansert); mangler = midt (som før). */
  valign?: 'top' | 'middle' | 'bottom'
  anim: string
  box: 'none' | 'block' | 'line'
  bg: string
  maxW: number
  upper: boolean
  track: number
  shadow: boolean
  lh: number
  opacity: number
  countdown: boolean
  cdFrom: number | null
  cdFmt: 'auto' | 'ss' | 'mmss' | 'hhmmss' | 'ddhhmmss'
  stroke: number
  strokeColor: string
  grad: boolean
  color2: string
}

export interface Sub { id: string; link?: string; start: number; end: number; text: string }

export interface SubStyle {
  mode: 'line' | 'words'
  hl: string
  size: number
  color: string
  bgOn: boolean
  bg: string
  bgA: number
  pos: 'bottom' | 'center' | 'top'
  font: string
  weight: number
  upper: boolean
}

export interface Music {
  id: string
  link?: string
  lane: number
  media: string
  name: string
  start: number
  in: number
  out: number
  srcDur: number
  vol: number
  fadeIn: number
  fadeOut: number
  loop: boolean
}

export interface Marker { id: string; t: number; label: string; color: string }

export interface Media {
  id: string
  name: string
  kind: 'video' | 'image' | 'audio'
  dur: number
  w: number
  h: number
  thumb: string
}

export interface Logo { x: number | null; y: number | null; src: string; pos: 'tl' | 'tr' | 'bl' | 'br'; size: number; opacity: number; on: boolean }
export interface Mix { video: number; ov: number; music: number; duck: boolean; duckAmt: number }
export interface TrackState { lock: boolean; hide: boolean }
export type TrackKey = 'text' | 'ov' | 'video' | 'subs' | 'music'
export type LaneKey = 'text' | 'ov' | 'music'

export interface Project {
  id: string
  name: string
  fmt: string
  w: number
  h: number
  bg: string
  created: number
  updated: number
  thumb: string
  media: Media[]
  clips: Clip[]
  ov: Overlay[]
  markers: Marker[]
  tin: Trans
  tout: Trans
  tracks: Record<TrackKey, TrackState>
  lanes: Record<LaneKey, number>
  mix: Mix
  texts: TextItem[]
  subs: Sub[]
  subStyle: SubStyle
  music: Music[]
  logo: Logo
  /** Prosjektvarighet i sekunder (sekvensens definerte slutt; avspilling og eksport stopper der). Mangler = følger innholdet. */
  dur?: number | null
}

export interface Format { k: string; name: string; ratio: string; w: number; h: number }

export const FORMATS: readonly Format[] = [
  { k: 'sq', name: 'Instagram innlegg', ratio: '1:1', w: 1080, h: 1080 },
  { k: 'p45', name: 'Instagram portrett', ratio: '4:5', w: 1080, h: 1350 },
  { k: 'story', name: 'Story / Reels', ratio: '9:16', w: 1080, h: 1920 },
  { k: 'wide', name: 'Facebook / YouTube', ratio: '16:9', w: 1920, h: 1080 },
  { k: 'cover', name: 'Facebook-cover', ratio: '2,63:1', w: 1640, h: 624 },
]
export const FONTS = ['Archivo', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'League Spartan', 'Playfair Display'] as const
export const TRANS: readonly (readonly [string, string])[] = [['none', 'Ingen'], ['fade', 'Toning'], ['dip', 'Via svart'], ['dipw', 'Via hvitt'], ['flash', 'Blits'], ['push-l', 'Skyv mot venstre'], ['push-r', 'Skyv mot høyre'], ['push-u', 'Skyv opp'], ['push-d', 'Skyv ned'], ['cover-l', 'Dekk fra høyre'], ['cover-r', 'Dekk fra venstre'], ['cover-u', 'Dekk nedenfra'], ['cover-d', 'Dekk ovenfra'], ['whip', 'Sveip'], ['zoom-in', 'Zoom inn'], ['zoom-out', 'Zoom ut'], ['spin', 'Snurr'], ['wipe-r', 'Visk mot høyre'], ['wipe-l', 'Visk mot venstre'], ['wipe-d', 'Visk ned'], ['wipe-u', 'Visk opp'], ['iris', 'Sirkel'], ['diamond', 'Diamant'], ['clock', 'Klokke'], ['blinds', 'Persienner'], ['bars', 'Striper'], ['doors', 'Dører'], ['blur', 'Uskarp'], ['glitch', 'Glitch'], ['pixel', 'Piksler'], ['xzoom', 'Kryss-zoom'], ['ramp', 'Fartsrampe'], ['match', 'Match cut'], ['mask', 'Maskering'], ['chroma', 'Kromatisk glitch'], ['leak', 'Lyslekkasje']]
const TRMAP: Record<string, string> = { slide: 'cover-l', slideup: 'cover-u', wipe: 'wipe-r', zoom: 'zoom-in' }
export const ANIMS: readonly (readonly [string, string])[] = [['none', 'Ingen'], ['fade', 'Ton inn'], ['rise', 'Stig opp'], ['pop', 'Sprett'], ['slide', 'Skyv inn'], ['blur', 'Fra uskarp'], ['type', 'Skrivemaskin'], ['words', 'Ord for ord'], ['letters', 'Bokstav for bokstav'], ['bounce', 'Hopp inn'], ['wave', 'Bølge'], ['glitch', 'Glitch'], ['zoomout', 'Zoom inn fra stor'], ['drop', 'Fall ned'], ['flip', 'Vend'], ['spread', 'Trekk sammen'], ['wipe', 'Avdekk']]
export const OVANIMS: readonly (readonly [string, string])[] = [['none', 'Ingen'], ['fade', 'Ton'], ['pop', 'Sprett'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['rise', 'Stig opp']]
export const BLENDS: readonly (readonly [GlobalCompositeOperation, string])[] = [['source-over', 'Normal'], ['screen', 'Lysere (screen)'], ['multiply', 'Mørkere (multiply)'], ['overlay', 'Overlegg'], ['soft-light', 'Mykt lys'], ['lighten', 'Lysne'], ['darken', 'Mørkne'], ['difference', 'Differanse']]
export const LOOKS: readonly (readonly [string, string])[] = [['none', 'Ingen'], ['warm', 'Varm'], ['cool', 'Kald'], ['film', 'Film'], ['bw', 'Svart-hvitt'], ['noir', 'Noir'], ['faded', 'Falmet'], ['vivid', 'Levende'], ['sepia', 'Sepia'], ['dream', 'Drøm'], ['teal', 'Teal og oransje'], ['night', 'Natt']]

export function uid(p = 'x'): string {
  return `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)
export const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3)
export const easeInOut = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
export function easeBack(k: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)
}

/* ---------- tidslinjen ---------- */

export function clipDur(c: Clip): number {
  return c.kind === 'video' ? Math.max(0.1, ((c.out || 0) - (c.in || 0)) / (c.speed || 1)) : Math.max(0.2, c.dur || 4)
}
export function ovDur(o: Pick<Overlay, 'kind' | 'in' | 'out' | 'speed' | 'dur'>): number {
  return o.kind === 'video' ? Math.max(0.1, (o.out - o.in) / (o.speed || 1)) : Math.max(0.2, o.dur || 4)
}

/** Et klipp plassert på tidslinjen (start inkluderer overlappen fra overgangen inn). */
export interface Placed { c: Clip; i: number; start: number; dur: number; end: number; tr: number }

const LC = new WeakMap<readonly Clip[], Placed[]>()
export function layout(p: Pick<Project, 'clips'>): Placed[] {
  const hit = LC.get(p.clips)
  if (hit) return hit
  let t = 0
  const out: Placed[] = []
  p.clips.forEach((c, i) => {
    const d = clipDur(c)
    const prev = out[i - 1]
    let tr = 0
    if (i && prev && c.trans.type && c.trans.type !== 'none') tr = Math.min(c.trans.dur || 0.6, d / 2, prev.dur / 2)
    const s = Math.max(0, t - tr)
    out.push({ c, i, start: s, dur: d, end: s + d, tr })
    t = s + d
  })
  LC.set(p.clips, out)
  return out
}

/** Sekvensens lengde: prosjektvarigheten når den er satt, ellers slutten på innholdet (avspilling og eksport). */
export function totalDur(p: Pick<Project, 'clips' | 'texts' | 'subs' | 'ov'> & { dur?: number | null }): number {
  return p.dur && p.dur > 0 ? p.dur : contentDur(p)
}

/** Hvor langt innholdet på sporene strekker seg (uavhengig av prosjektvarigheten). */
export function contentDur(p: Pick<Project, 'clips' | 'texts' | 'subs' | 'ov'>): number {
  const L = layout(p)
  let e = L.length ? (L[L.length - 1]?.end ?? 0) : 0
  for (const x of p.texts) e = Math.max(e, x.start + x.dur)
  for (const x of p.subs) e = Math.max(e, x.end)
  for (const o of p.ov) e = Math.max(e, o.start + ovDur(o))
  return Math.max(0.5, e)
}

/** Kildetid i videoen for lokal tid `lt` i klippet (fart og baklengs). */
export function srcTime(c: { speed: number; rev: boolean; in: number; out: number }, lt: number): number {
  const sp = c.speed || 1
  return c.rev ? Math.max(c.in, c.out - lt * sp - 0.02) : Math.min(c.out - 0.02, c.in + lt * sp)
}

/* ---------- nye elementer ---------- */

const GRADE0: Grade = { curves: null, bri: 0, con: 0, sat: 0, blur: 0, look: 'none', cS: 0, cM: 0, cH: 0 }
const CROP0: Crop = { l: 0, t: 0, r: 0, b: 0 }

export function text(o: Partial<TextItem> = {}): TextItem {
  return { id: uid('t'), lane: 0, start: 0, dur: 4, text: 'Tekst', x: 0.5, y: 0.5, size: 90, font: 'Archivo', weight: 700, italic: false, color: '#ffffff', align: 'center', anim: 'rise', box: 'none', bg: '#000000', maxW: 0.84, upper: false, track: 0, shadow: false, lh: 1.14, opacity: 1, countdown: false, cdFrom: null, cdFmt: 'auto', stroke: 0, strokeColor: '#000000', grad: false, color2: '#f5b82c', ...o }
}
export function colorClip(o: Partial<ColorClip> = {}): ColorClip {
  return { ...GRADE0, id: uid('c'), kind: 'color', dur: 5, c1: '#111111', c2: '#2a2a2a', grad: 'linear', ang: 135, spin: 0, trans: { type: 'fade', dur: 0.6 }, dim: 0, temp: 0, tint: 0, vig: 0, grain: 0, ...o }
}
export function mediaClip(m: Media, o: Partial<MediaClip> = {}): MediaClip {
  const v = m.kind === 'video'
  return { ...GRADE0, id: uid('c'), kind: v ? 'video' : 'image', media: m.id, name: m.name, in: 0, out: v ? m.dur || 5 : 0, dur: v ? 0 : 4, vol: 1, muted: false, fit: 'cover', zoom: 1, fx: 0.5, fy: 0.5, kb: !v, trans: { type: 'fade', dur: 0.5 }, dim: 0, temp: 0, tint: 0, vig: 0, grain: 0, speed: 1, rev: false, afi: 0, afo: 0, x: 0, y: 0, scale: 1, rot: 0, flipH: false, flipV: false, crop: { ...CROP0 }, ...o }
}
export function overlay(m: Media, o: Partial<Overlay> = {}): Overlay {
  const v = m.kind === 'video'
  const r = m.w && m.h ? m.h / m.w : 0.5625
  return { ...GRADE0, id: uid('o'), lane: 0, kind: v ? 'video' : 'image', media: m.id, name: m.name, start: 0, in: 0, out: v ? m.dur || 5 : 0, dur: v ? 0 : 4, speed: 1, rev: false, vol: 1, muted: false, x: 0.72, y: 0.72, scale: 0.4, rot: 0, opacity: 1, fadeIn: 0, fadeOut: 0, anim: 'pop', blend: 'source-over', radius: 0.08, border: 0, borderColor: '#ffffff', shadow: true, flipH: false, flipV: false, crop: { ...CROP0 }, ar: r, keyOn: false, keyColor: '#00ff00', keySim: 0.35, keySmooth: 0.1, keySpill: 0.5, ...o }
}
export function music(m: Media, o: Partial<Music> = {}): Music {
  return { id: uid('a'), lane: 0, media: m.id, name: m.name, start: 0, in: 0, out: m.dur || 30, srcDur: m.dur || 30, vol: 0.8, fadeIn: 1, fadeOut: 2, loop: false, ...o }
}
export const SUBSTYLE: SubStyle = { mode: 'line', hl: '#f5b82c', size: 46, color: '#ffffff', bgOn: true, bg: '#000000', bgA: 0.6, pos: 'bottom', font: 'Archivo', weight: 600, upper: false }

/* ---------- maler ---------- */

const ACC = '#f5b82c'
interface TplContent { clips: Clip[]; texts: TextItem[]; subs?: Sub[]; subStyle?: SubStyle }
export interface Template { k: string; name: string; desc: string; tt: number; make: () => TplContent }

export const TEMPLATES: readonly Template[] = [
  { k: 'meet', name: 'Møtepromo', desc: 'Dato, tid og sted over to scener', tt: 2.2, make: () => ({
    clips: [colorClip({ dur: 6, c1: '#0f1b3d', c2: '#23408a', ang: 120, spin: 6, trans: { type: 'none', dur: 0.6 } }), colorClip({ dur: 6, c1: '#23408a', c2: '#0f1b3d', ang: 300, spin: 6 })],
    texts: [text({ start: 0, dur: 6, text: 'Velkommen til', upper: true, size: 38, weight: 600, track: 0.3, color: ACC, y: 0.36, anim: 'fade' }),
      text({ start: 0.3, dur: 5.7, text: 'Søndagsmøte', upper: true, font: 'Bebas Neue', weight: 400, size: 170, y: 0.5 }),
      text({ start: 0.9, dur: 5.1, text: 'Søndag kl. 11:00', size: 54, weight: 500, y: 0.64 }),
      text({ start: 6.2, dur: 5.8, text: 'Kirkegata 1, Oslo', size: 70, weight: 700, y: 0.47 }),
      text({ start: 6.8, dur: 5.2, text: 'Alle er hjertelig velkommen', size: 42, weight: 500, color: ACC, y: 0.58, anim: 'fade' })] }) },
  { k: 'event', name: 'Arrangement / konferanse', desc: 'Stort navn, datoer og påmelding', tt: 2.6, make: () => ({
    clips: [colorClip({ dur: 6, c1: '#120b1e', c2: '#4a1242', grad: 'radial', trans: { type: 'none', dur: 0.6 } }), colorClip({ dur: 6, c1: '#4a1242', c2: '#120b1e', grad: 'radial', trans: { type: 'zoom-in', dur: 0.7 } })],
    texts: [text({ start: 0.2, dur: 5.8, text: 'Konferanse 2026', upper: true, font: 'Anton', weight: 400, size: 150, y: 0.44, anim: 'pop' }),
      text({ start: 0.9, dur: 5.1, text: '14.–16. mars', size: 60, weight: 600, y: 0.58 }),
      text({ start: 6.2, dur: 5.8, text: 'Talere · Lovsang · Seminarer', size: 56, weight: 600, y: 0.44 }),
      text({ start: 7, dur: 5, text: 'Meld deg på nå', upper: true, size: 44, weight: 800, track: 0.12, box: 'block', bg: '#ff5a36', y: 0.58, anim: 'pop' })] }) },
  { k: 'quote', name: 'Sitat / vers', desc: 'Tekst som skrives frem, med kilde', tt: 6, make: () => ({
    clips: [colorClip({ dur: 10, c1: '#141414', c2: '#3a3226', ang: 160, spin: 3, trans: { type: 'none', dur: 0.6 } })],
    texts: [text({ start: 0.4, dur: 9.6, text: '«Herren er min hyrde, jeg mangler ikke noe.»', font: 'Playfair Display', weight: 500, italic: true, size: 84, maxW: 0.78, y: 0.46, anim: 'type' }),
      text({ start: 4.5, dur: 5.5, text: 'Salme 23,1', upper: true, size: 34, weight: 600, track: 0.25, color: ACC, y: 0.66, anim: 'fade' })] }) },
  { k: 'count', name: 'Nedtelling', desc: 'Teller ned sekunder til start', tt: 3, make: () => ({
    clips: [colorClip({ dur: 10, c1: '#050505', c2: '#2b0f0f', grad: 'radial', trans: { type: 'none', dur: 0.6 } })],
    texts: [text({ start: 0, dur: 10, text: 'Starter om', upper: true, size: 42, weight: 600, track: 0.3, y: 0.32, anim: 'fade' }),
      text({ start: 0, dur: 10, text: '10', countdown: true, cdFrom: 10, font: 'Bebas Neue', weight: 400, size: 320, y: 0.53, anim: 'none' })] }) },
  { k: 'speaker', name: 'Talerpresentasjon', desc: 'Navneskilt over bilde eller video', tt: 2.4, make: () => ({
    clips: [colorClip({ dur: 8, c1: '#26313f', c2: '#0e141b', ang: 90, trans: { type: 'none', dur: 0.6 } })],
    texts: [text({ start: 0.5, dur: 7.5, text: 'Navn Navnesen', size: 60, weight: 800, color: '#111111', box: 'block', bg: '#ffffff', align: 'left', x: 0.07, y: 0.78, anim: 'slide' }),
      text({ start: 0.9, dur: 7.1, text: 'Tale: Tittel på talen', size: 36, weight: 600, color: '#111111', box: 'block', bg: ACC, align: 'left', x: 0.07, y: 0.87, anim: 'slide' })] }) },
  { k: 'worship', name: 'Musikk / lovsang', desc: 'Sangtittel og tekstlinjer', tt: 3.2, make: () => ({
    clips: [colorClip({ dur: 12, c1: '#0a0a0a', c2: '#1d2a44', ang: 200, spin: 4, trans: { type: 'none', dur: 0.6 } })],
    texts: [text({ start: 0.3, dur: 4.2, text: 'Sangtittel', size: 64, weight: 800, align: 'left', x: 0.07, y: 0.14, anim: 'slide' }),
      text({ start: 0.7, dur: 3.8, text: 'Artist / band', size: 36, weight: 500, color: '#c9c5bc', align: 'left', x: 0.07, y: 0.21, anim: 'slide' })],
    subs: [{ id: uid('s'), start: 1.5, end: 5, text: 'Første linje av sangteksten' }, { id: uid('s'), start: 5.2, end: 8.6, text: 'Andre linje av sangteksten' }, { id: uid('s'), start: 8.8, end: 12, text: 'Tredje linje av sangteksten' }],
    subStyle: { ...SUBSTYLE, size: 58, bgOn: false, pos: 'center', weight: 700 } }) },
  { k: 'announce', name: 'Kunngjøring', desc: 'Tydelig beskjed på farget bakgrunn', tt: 2.5, make: () => ({
    clips: [colorClip({ dur: 8, c1: '#f5b82c', c2: '#ff8a00', ang: 135, trans: { type: 'none', dur: 0.6 } })],
    texts: [text({ start: 0.2, dur: 7.8, text: 'Viktig info', upper: true, font: 'Anton', weight: 400, size: 130, color: '#111111', y: 0.4, anim: 'pop' }),
      text({ start: 0.9, dur: 7.1, text: 'Skriv kunngjøringen her. Hold den kort og tydelig.', size: 48, weight: 500, color: '#111111', maxW: 0.72, y: 0.58 })] }) },
  { k: 'blank', name: 'Tom', desc: 'Start med tom tidslinje', tt: 1, make: () => ({ clips: [], texts: [] }) },
]

export function create(fmt: Pick<Format, 'k' | 'w' | 'h'>, tk: string, name?: string): Project {
  const tp = TEMPLATES.find((x) => x.k === tk) ?? TEMPLATES[TEMPLATES.length - 1]
  const d = tp ? tp.make() : { clips: [], texts: [] }
  return normalize({ id: uid('p'), name: name || (!tp || tp.k === 'blank' ? 'Nytt prosjekt' : tp.name), fmt: fmt.k, w: fmt.w, h: fmt.h, bg: '#000000', media: [], clips: d.clips, ov: [], markers: [], texts: d.texts, subs: d.subs ?? [], subStyle: d.subStyle ?? { ...SUBSTYLE }, music: [], logo: { src: '', pos: 'tr', size: 0.12, opacity: 0.9, on: false }, created: Date.now(), updated: Date.now() })
}

/* ---------- validering (alt som leses fra lagring eller filer) ---------- */

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)
function num(v: unknown, d: number, lo?: number, hi?: number): number {
  let n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) n = d
  if (lo !== undefined && n < lo) n = lo
  if (hi !== undefined && n > hi) n = hi
  return n
}
const str = (v: unknown, d: string, max = 4000): string => (typeof v === 'string' ? v.slice(0, max) : d)
const col = (v: unknown, d: string): string => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : d)
function oneOf<T extends string>(v: unknown, list: readonly T[], d: T): T {
  return (list as readonly unknown[]).includes(v) ? (v as T) : d
}
const sid = (v: unknown, p: string): string => (typeof v === 'string' && /^[\w.:/-]{1,120}$/.test(v) ? v : uid(p))
const recs = (v: unknown, max: number): Rec[] => (Array.isArray(v) ? v.filter(isRec).slice(0, max) : [])
const THUMB = /^data:image\/(jpeg|png|webp);base64,/
const TK = TRANS.map((x) => x[0])
const AK = ANIMS.map((x) => x[0])
const LK = LOOKS.map((x) => x[0])
const OAK = OVANIMS.map((x) => x[0])
const BK = BLENDS.map((x) => x[0])

function trans(v: unknown): Trans {
  const t = isRec(v) ? v : {}
  const ty = typeof t.type === 'string' ? (TRMAP[t.type] ?? t.type) : 'none'
  return { type: oneOf(ty, TK, 'none'), dur: num(t.dur, 0.6, 0.1, 3) }
}
function crop(v: unknown): Crop {
  const c = isRec(v) ? v : {}
  return { l: num(c.l, 0, 0, 0.9), t: num(c.t, 0, 0, 0.9), r: num(c.r, 0, 0, 0.9), b: num(c.b, 0, 0, 0.9) }
}
const lnk = (v: unknown): string | undefined => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : undefined)
const ln = (v: unknown): number => Math.round(num(v, 0, 0, 49))
function curv(v: unknown): Curves | null {
  if (!isRec(v)) return null
  const r: Curves = {}
  let any = false
  for (const k of ['m', 'r', 'g', 'b'] as const) {
    const a = v[k]
    if (!Array.isArray(a)) continue
    const pts = a.filter((q): q is unknown[] => Array.isArray(q) && q.length === 2).slice(0, 16)
      .map((q): Pt => [num(q[0], 0, 0, 1), num(q[1], 0, 0, 1)]).sort((x, y) => x[0] - y[0])
    if (pts.length < 2) continue
    r[k] = pts
    any = true
  }
  return any ? r : null
}
function grade(c: Rec): Grade {
  return { curves: curv(c.curves), bri: num(c.bri, 0, -1, 1), con: num(c.con, 0, -1, 1), sat: num(c.sat, 0, -1, 1), blur: num(c.blur, 0, 0, 40), look: oneOf(c.look, LK, 'none'), cS: num(c.cS, 0, -1, 1), cM: num(c.cM, 0, -1, 1), cH: num(c.cH, 0, -1, 1) }
}
const withLink = <T extends object>(o: T, link: string | undefined): T & { link?: string } => (link ? { ...o, link } : o)

/** Gjør et ukjent dokument om til et gyldig prosjekt (feltene begrenses og settes til standard). Kaster hvis det ikke er et objekt. */
export function normalize(input: unknown): Project {
  if (!isRec(input)) throw new Error('bad')
  const p = input
  const w = Math.round(num(p.w, 1920, 240, 4096) / 2) * 2
  const h = Math.round(num(p.h, 1080, 240, 4096) / 2) * 2
  const media: Media[] = recs(p.media, 500).map((m) => ({
    id: sid(m.id, 'm'), name: str(m.name, 'Fil', 200), kind: oneOf(m.kind, ['video', 'image', 'audio'] as const, 'image'), dur: num(m.dur, 0, 0, 86400),
    w: num(m.w, 0, 0, 20000), h: num(m.h, 0, 0, 20000), thumb: typeof m.thumb === 'string' && THUMB.test(m.thumb) && m.thumb.length < 120000 ? m.thumb : '',
  }))
  const clips: Clip[] = recs(p.clips, 2000).map((c): Clip => {
    const k = oneOf(c.kind, ['video', 'image', 'color'] as const, 'color')
    const efx = cleanEffects(c.effects)
    const ckf = cleanKeys(c.kf)
    const base = { id: sid(c.id, 'c'), ...(efx ? { effects: efx } : {}), ...(ckf ? { kf: ckf } : {}), trans: trans(c.trans), dim: num(c.dim, 0, 0, 1), temp: num(c.temp, 0, -1, 1), tint: num(c.tint, 0, -1, 1), vig: num(c.vig, 0, 0, 1), grain: num(c.grain, 0, 0, 1), ...grade(c) }
    if (k === 'color') {
      return withLink({ ...base, kind: 'color' as const, dur: num(c.dur, 5, 0.2, 3600), c1: col(c.c1, '#111111'), c2: col(c.c2, '#2a2a2a'), grad: oneOf(c.grad, ['none', 'linear', 'radial'] as const, 'linear'), ang: num(c.ang, 135, -3600, 3600), spin: num(c.spin, 0, -90, 90) }, lnk(c.link))
    }
    const r: MediaClip = { ...base, kind: k, media: sid(c.media, 'm'), name: str(c.name, '', 200), in: num(c.in, 0, 0, 86400), out: num(c.out, 5, 0, 86400), dur: num(c.dur, 4, 0, 3600), vol: num(c.vol, 1, 0, 2), muted: !!c.muted, fit: oneOf(c.fit, ['cover', 'contain'] as const, 'cover'), zoom: num(c.zoom, 1, 1, 4), fx: num(c.fx, 0.5, 0, 1), fy: num(c.fy, 0.5, 0, 1), kb: !!c.kb, speed: num(c.speed, 1, 0.1, 8), rev: !!c.rev, afi: num(c.afi, 0, 0, 30), afo: num(c.afo, 0, 0, 30), x: num(c.x, 0, -2, 2), y: num(c.y, 0, -2, 2), scale: num(c.scale, 1, 0.1, 5), rot: num(c.rot, 0, -3600, 3600), flipH: !!c.flipH, flipV: !!c.flipV, crop: crop(c.crop) }
    if (r.kind === 'video' && r.out <= r.in + 0.05) r.out = r.in + 0.1
    return withLink(r, lnk(c.link))
  })
  const ov: Overlay[] = recs(p.ov, 500).map((x) => {
    const oefx = cleanEffects(x.effects)
    const okf = cleanKeys(x.kf)
    const r: Overlay = { id: sid(x.id, 'o'), ...(oefx ? { effects: oefx } : {}), ...(okf ? { kf: okf } : {}), lane: ln(x.lane), kind: oneOf(x.kind, ['video', 'image'] as const, 'image'), media: sid(x.media, 'm'), name: str(x.name, '', 200), start: num(x.start, 0, 0, 86400), in: num(x.in, 0, 0, 86400), out: num(x.out, 5, 0, 86400), dur: num(x.dur, 4, 0.2, 86400), speed: num(x.speed, 1, 0.1, 8), rev: !!x.rev, vol: num(x.vol, 1, 0, 2), muted: !!x.muted,
      x: num(x.x, 0.5, -1, 2), y: num(x.y, 0.5, -1, 2), scale: num(x.scale, 0.4, 0.02, 4), rot: num(x.rot, 0, -3600, 3600), opacity: num(x.opacity, 1, 0, 1), fadeIn: num(x.fadeIn, 0, 0, 30), fadeOut: num(x.fadeOut, 0, 0, 30), anim: oneOf(x.anim, OAK, 'none'), blend: oneOf(x.blend, BK, 'source-over'),
      radius: num(x.radius, 0, 0, 1), border: num(x.border, 0, 0, 5), borderColor: col(x.borderColor, '#ffffff'), shadow: !!x.shadow, flipH: !!x.flipH, flipV: !!x.flipV, crop: crop(x.crop), ar: num(x.ar, 0.5625, 0.05, 20), keyOn: !!x.keyOn, keyColor: col(x.keyColor, '#00ff00'), keySim: num(x.keySim, 0.35, 0.01, 1), keySmooth: num(x.keySmooth, 0.1, 0.005, 1), keySpill: num(x.keySpill, 0.5, 0, 1), ...grade(x) }
    if (r.kind === 'video' && r.out <= r.in + 0.05) r.out = r.in + 0.1
    return withLink(r, lnk(x.link))
  })
  const markers: Marker[] = recs(p.markers, 500).map((x) => ({ id: sid(x.id, 'k'), t: num(x.t, 0, 0, 86400), label: str(x.label, '', 80), color: col(x.color, '#ff5a36') })).sort((a, b) => a.t - b.t)
  const tk = isRec(p.tracks) ? p.tracks : {}
  const tracks = {} as Record<TrackKey, TrackState>
  for (const k of ['text', 'ov', 'video', 'subs', 'music'] as const) {
    const v = isRec(tk[k]) ? (tk[k] as Rec) : {}
    tracks[k] = { lock: !!v.lock, hide: !!v.hide }
  }
  const lz = isRec(p.lanes) ? p.lanes : {}
  const mx = isRec(p.mix) ? p.mix : {}
  const texts: TextItem[] = recs(p.texts, 1000).map((x) => withLink({
    ...(x.valign === 'top' || x.valign === 'bottom' ? { valign: x.valign } : {}),
    ...(cleanKeys(x.kf) ? { kf: cleanKeys(x.kf) as Keys } : {}),
    id: sid(x.id, 't'), lane: ln(x.lane), start: num(x.start, 0, 0, 86400), dur: num(x.dur, 4, 0.2, 86400), text: str(x.text, '', 2000), x: num(x.x, 0.5, -0.5, 1.5), y: num(x.y, 0.5, -0.5, 1.5), size: num(x.size, 90, 8, 600), font: oneOf(x.font, FONTS, 'Archivo'), weight: num(x.weight, 700, 100, 900), italic: !!x.italic, color: col(x.color, '#ffffff'), align: oneOf(x.align, ['left', 'center', 'right'] as const, 'center'), anim: oneOf(x.anim, AK, 'fade'), box: oneOf(x.box, ['none', 'block', 'line'] as const, 'none'), bg: col(x.bg, '#000000'), maxW: num(x.maxW, 0.84, 0.1, 1), upper: !!x.upper, track: num(x.track, 0, -0.1, 1), shadow: !!x.shadow, lh: num(x.lh, 1.14, 0.7, 2.5), opacity: num(x.opacity, 1, 0, 1), countdown: !!x.countdown, cdFrom: x.cdFrom === null || x.cdFrom === undefined ? null : num(x.cdFrom, 10, 0, 8639999), cdFmt: oneOf(x.cdFmt, ['auto', 'ss', 'mmss', 'hhmmss', 'ddhhmmss'] as const, 'auto'), stroke: num(x.stroke, 0, 0, 10), strokeColor: col(x.strokeColor, '#000000'), grad: !!x.grad, color2: col(x.color2, '#f5b82c'),
  }, lnk(x.link)))
  const subs: Sub[] = recs(p.subs, 5000).map((x) => {
    const s = num(x.start, 0, 0, 86400)
    return withLink({ id: sid(x.id, 's'), start: s, end: Math.max(s + 0.2, num(x.end, s + 2, 0, 86400)), text: str(x.text, '', 500) }, lnk(x.link))
  }).sort((a, b) => a.start - b.start)
  const ss = isRec(p.subStyle) ? p.subStyle : {}
  const musicList: Music[] = recs(p.music, 50).map((m) => {
    const sd = num(m.srcDur, 30, 0.1, 86400)
    const i = num(m.in, 0, 0, sd)
    return withLink({ id: sid(m.id, 'a'), lane: ln(m.lane), media: sid(m.media, 'm'), name: str(m.name, '', 200), start: num(m.start, 0, 0, 86400), in: i, out: Math.max(i + 0.1, num(m.out, sd, 0, sd)), srcDur: sd, vol: num(m.vol, 0.8, 0, 2), fadeIn: num(m.fadeIn, 1, 0, 30), fadeOut: num(m.fadeOut, 2, 0, 30), loop: !!m.loop }, lnk(m.link))
  })
  const lg = isRec(p.logo) ? p.logo : {}
  const proj: Project = {
    id: sid(p.id, 'p'), name: str(p.name, 'Prosjekt', 120), fmt: str(p.fmt, 'custom', 20), w, h, bg: col(p.bg, '#000000'), created: num(p.created, Date.now()), updated: num(p.updated, Date.now()),
    thumb: typeof p.thumb === 'string' && THUMB.test(p.thumb) && p.thumb.length < 200000 ? p.thumb : '',
    media, clips, ov, markers, tin: trans(p.tin), tout: trans(p.tout), tracks,
    lanes: { text: Math.round(num(lz.text, 1, 1, 50)), ov: Math.round(num(lz.ov, 1, 1, 50)), music: Math.round(num(lz.music, 1, 1, 50)) },
    mix: { video: num(mx.video, 1, 0, 1), ov: num(mx.ov, 1, 0, 1), music: num(mx.music, 1, 0, 1), duck: !!mx.duck, duckAmt: num(mx.duckAmt, 0.6, 0.1, 0.95) },
    texts, subs,
    subStyle: { mode: oneOf(ss.mode, ['line', 'words'] as const, 'line'), hl: col(ss.hl, '#f5b82c'), size: num(ss.size, 46, 12, 200), color: col(ss.color, '#ffffff'), bgOn: ss.bgOn !== false, bg: col(ss.bg, '#000000'), bgA: num(ss.bgA, 0.6, 0, 1), pos: oneOf(ss.pos, ['bottom', 'center', 'top'] as const, 'bottom'), font: oneOf(ss.font, FONTS, 'Archivo'), weight: num(ss.weight, 600, 100, 900), upper: !!ss.upper },
    music: musicList,
    ...(typeof p.dur === 'number' && p.dur > 0 ? { dur: num(p.dur, 60, 0.5, 86400) } : {}),
    logo: { x: lg.x === null || lg.x === undefined ? null : num(lg.x, 0.5, 0, 1), y: lg.y === null || lg.y === undefined ? null : num(lg.y, 0.5, 0, 1), src: typeof lg.src === 'string' && /^(images\/[\w.-]+\.(png|jpe?g|webp|svg)|m-[\w-]+)$/.test(lg.src) ? lg.src : '', pos: oneOf(lg.pos, ['tl', 'tr', 'bl', 'br'] as const, 'tr'), size: num(lg.size, 0.12, 0.03, 0.6), opacity: num(lg.opacity, 0.9, 0, 1), on: !!lg.on },
  }
  return fixLanes(proj)
}

type LaneItem = { id: string; lane: number; start: number }
const LANE_KEYS = [['texts', 'text'], ['ov', 'ov'], ['music', 'music']] as const

/**
 * Elementer som overlapper i samme lag, flyttes ned til første ledige lag (maks 50). Elementer i `pin` (nettopp lagt til
 * eller flyttet) plasseres sist, så det som lå der fra før, blir liggende. Returnerer samme objekt hvis ingenting endres.
 */
export function fixLanes(p: Project, pin?: ReadonlySet<string>): Project {
  const nl = { text: p.lanes.text || 1, ov: p.lanes.ov || 1, music: p.lanes.music || 1 }
  let ch = false
  const out: Partial<Pick<Project, 'texts' | 'ov' | 'music'>> = {}
  const ends = {
    texts: (x: TextItem) => x.start + x.dur,
    ov: (x: Overlay) => x.start + ovDur(x),
    music: (x: Music) => (x.loop ? 1e9 : x.start + (x.out - x.in)),
  }
  for (const [K, lk] of LANE_KEYS) {
    const arr = p[K] as LaneItem[]
    const en = ends[K] as (x: LaneItem) => number
    const occ: Record<number, [number, number][]> = {}
    let res: LaneItem[] | null = null
    const ord = arr.map((_, i) => i).sort((a, b) => {
      const pa = pin?.has(arr[a]?.id ?? '') ? 1 : 0
      const pb = pin?.has(arr[b]?.id ?? '') ? 1 : 0
      return pa - pb || a - b
    })
    for (const i of ord) {
      const x = arr[i]
      if (!x) continue
      const s = x.start
      const e = en(x)
      let l = Math.max(0, Math.min(49, x.lane | 0))
      const busy = (q: number) => (occ[q] ?? []).some((r) => s < r[1] - 0.001 && e > r[0] + 0.001)
      while (l < 49 && busy(l)) l++
      ;(occ[l] ??= []).push([s, e])
      if (l !== x.lane) {
        res ??= arr.slice()
        res[i] = { ...x, lane: l }
      }
      if (l + 1 > nl[lk]) {
        nl[lk] = l + 1
        ch = true
      }
    }
    if (res) {
      ;(out as Record<string, unknown>)[K] = res
      ch = true
    }
  }
  if (!ch) return p
  return { ...p, ...out, lanes: nl }
}

/* ---------- lyd: mikser og demping ---------- */

export const hidden = (p: Pick<Project, 'tracks'>, k: TrackKey): boolean => !!p.tracks[k]?.hide
export function mixOf(p: Pick<Project, 'mix'>): Mix {
  const m = p.mix
  return { video: m?.video ?? 1, ov: m?.ov ?? 1, music: m?.music ?? 1, duck: !!m?.duck, duckAmt: m?.duckAmt ?? 0.6 }
}
export const DUCK_A = 0.3
export const DUCK_R = 0.6

/** Tidsrom der videoklipp eller overlegg har lyd (for demping av musikken). */
export function voiced(p: Project): [number, number][] {
  const R: [number, number][] = []
  const mx = mixOf(p)
  if (!hidden(p, 'video') && mx.video > 0) for (const l of layout(p)) if (l.c.kind === 'video' && !l.c.muted && l.c.vol > 0) R.push([l.start, l.end])
  if (!hidden(p, 'ov') && mx.ov > 0) for (const o of p.ov) if (o.kind === 'video' && !o.muted && o.vol > 0) R.push([o.start, o.start + ovDur(o)])
  R.sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const r of R) {
    const l = out[out.length - 1]
    if (l && r[0] - DUCK_A <= l[1] + DUCK_R) l[1] = Math.max(l[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}
export function duckAt(p: Project, t: number, R?: [number, number][]): number {
  const mx = mixOf(p)
  if (!mx.duck) return 1
  const ranges = R ?? voiced(p)
  let w = 0
  for (const [s, e] of ranges) {
    if (t >= s && t <= e) {
      w = 1
      break
    }
    if (t >= s - DUCK_A && t < s) w = Math.max(w, (t - (s - DUCK_A)) / DUCK_A)
    if (t > e && t <= e + DUCK_R) w = Math.max(w, 1 - (t - e) / DUCK_R)
  }
  return 1 - mx.duckAmt * w
}

/* ---------- tekst og tid ---------- */

export function fmtCount(sec: number, f: TextItem['cdFmt'] | undefined): string {
  const s = Math.max(0, Math.ceil(sec - 0.001))
  const z = (n: number) => (n < 10 ? '0' : '') + n
  const d = Math.floor(s / 86400)
  const h = Math.floor(s / 3600) % 24
  const m = Math.floor(s / 60) % 60
  const r = s % 60
  if (f === 'ss') return String(s)
  if (f === 'mmss') return `${z(Math.floor(s / 60))}:${z(r)}`
  if (f === 'hhmmss') return `${z(Math.floor(s / 3600))}:${z(m)}:${z(r)}`
  if (f === 'ddhhmmss') return `${z(d)}:${z(h)}:${z(m)}:${z(r)}`
  if (s < 60) return String(s)
  if (s < 3600) return `${Math.floor(s / 60)}:${z(r)}`
  if (s < 86400) return `${Math.floor(s / 3600)}:${z(m)}:${z(r)}`
  return `${d}:${z(h)}:${z(m)}:${z(r)}`
}

/** Eksportstørrelse: 1080p (eller 4K) på den korte siden, med samme forhold som prosjektet (partall). */
export function exportSize(p: Pick<Project, 'w' | 'h'>, q: '1080' | '4k'): { w: number; h: number } {
  const b = q === '4k' ? 2 : 1
  const s = Math.min((1920 * b) / Math.max(p.w, p.h), (1080 * b) / Math.min(p.w, p.h))
  return { w: Math.round((p.w * s) / 2) * 2, h: Math.round((p.h * s) / 2) * 2 }
}

export function fmtEta(sec: number): string {
  const s = Math.round(sec)
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`
}

/** m:ss.s (spillehode og varighet i editoren). */
export function fmtT(sec: number): string {
  const s = Math.max(0, sec || 0)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`
}
/** m:ss (prosjektlengde, linjal). */
export function fmtD(sec: number): string {
  const s = Math.round(sec || 0)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r < 10 ? '0' : ''}${r}`
}

/* ---------- undertekster (.srt) ---------- */

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000)
  const z = (n: number, l: number) => String(n).padStart(l, '0')
  return `${z(Math.floor(ms / 3600000), 2)}:${z(Math.floor(ms / 60000) % 60, 2)}:${z(Math.floor(ms / 1000) % 60, 2)},${z(ms % 1000, 3)}`
}
export function toSrt(subs: readonly Sub[]): string {
  return subs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n')
}
export function fromSrt(txt: string): Sub[] {
  const out: Sub[] = []
  const re = /(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/
  for (const b of String(txt).replace(/\r/g, '').split(/\n\s*\n/)) {
    const ls = b.split('\n')
    const i = ls.findIndex((l) => re.test(l))
    if (i < 0) continue
    const m = re.exec(ls[i] ?? '')
    if (!m) continue
    const ts = (a: number) => Number(m[a]) * 3600 + Number(m[a + 1]) * 60 + Number(m[a + 2]) + Number(`${m[a + 3] ?? ''}00`.slice(0, 3)) / 1000
    const t = ls.slice(i + 1).join('\n').replace(/<[^>]*>/g, '').trim()
    if (t) out.push({ id: uid('s'), start: ts(1), end: ts(5), text: t.slice(0, 500) })
  }
  return out.slice(0, 5000)
}

/** Mediefilene prosjektet bruker (for «i bruk»-kontroll og pakking). */
export function usedMedia(p: Project): Set<string> {
  const s = new Set<string>()
  for (const c of p.clips) if (c.kind !== 'color') s.add(c.media)
  for (const o of p.ov) s.add(o.media)
  for (const m of p.music) s.add(m.media)
  if (p.logo.src) s.add(p.logo.src)
  return s
}
