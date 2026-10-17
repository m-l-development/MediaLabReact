/**
 * Feltene i egenskapspanelet (samme felt, rekkefølge og seksjoner som dagens app, logic.js clipFields/textFields …).
 * Feltene er data; Props.tsx tegner dem.
 */
import type { MotionController } from './controller'
import {
  ANIMS, BLENDS, fmtCount, fmtT, FONTS, LOOKS, mixOf, OVANIMS, ovDur, TRANS, type Clip, type Grade, type Media, type MediaClip,
  type Music, type Overlay, type Placed, type Project, type Sub, type TextItem,
} from './engine/model'
import type { Phrase, Vars } from './texts'

export type Show = string | { p: Phrase; v?: Vars }
export type Opt = readonly [string, string]

export type Field =
  | { k: 'head'; label: Phrase }
  | { k: 'note'; label: Phrase; v?: Vars }
  | { k: 'range'; label: Phrase; val: number; min: number; max: number; step: number; show: Show; on: (v: number) => void }
  | { k: 'color'; label: Phrase; val: string; on: (v: string) => void }
  | { k: 'select'; label: Phrase; val: string; opts: readonly Opt[]; raw?: boolean; on: (v: string) => void }
  | { k: 'toggle'; label: Phrase; on: boolean; set: (v: boolean) => void }
  | { k: 'seg'; label: Phrase; val: string; opts: readonly Opt[]; on: (v: string) => void }
  | { k: 'acts'; label: Phrase; acts: { l: Phrase; raw?: boolean; danger?: boolean; click: () => void }[] }
  | { k: 'num'; label: Phrase; val: number; min: number; max: number; step: number; on: (v: number) => void }
  | { k: 'area'; label: Phrase; val: string; on: (v: string) => void }
  | { k: 'curve'; c: Grade; on: (o: Partial<Grade>) => void }

type P<T> = (o: Partial<T>) => void
const pct = (v: number): string => `${Math.round(v * 100)} %`
const spct = (v: number): string => `${v > 0 ? '+' : ''}${Math.round(v * 100)} %`
const OFF: Show = { p: 'Av' }

const head = (label: Phrase): Field => ({ k: 'head', label })
const note = (label: Phrase, v?: Vars): Field => (v ? { k: 'note', label, v } : { k: 'note', label })
const range = (label: Phrase, val: number, min: number, max: number, step: number, show: Show, on: (v: number) => void): Field => ({ k: 'range', label, val, min, max, step, show, on })
const color = (label: Phrase, val: string, on: (v: string) => void): Field => ({ k: 'color', label, val, on })
const select = (label: Phrase, val: string | number, opts: readonly Opt[], on: (v: string) => void, raw = false): Field => ({ k: 'select', label, val: String(val), opts, raw, on })
const toggle = (label: Phrase, on: boolean, set: (v: boolean) => void): Field => ({ k: 'toggle', label, on: !!on, set })
const seg = (label: Phrase, val: string, opts: readonly Opt[], on: (v: string) => void): Field => ({ k: 'seg', label, val, opts, on })
const num = (label: Phrase, val: number, min: number, max: number, step: number, on: (v: number) => void): Field => ({ k: 'num', label, val, min, max, step, on })
const area = (label: Phrase, val: string, on: (v: string) => void): Field => ({ k: 'area', label, val, on })
const act = (l: Phrase, click: () => void, danger = false): { l: Phrase; danger: boolean; click: () => void } => ({ l, danger, click })

function cropFields(o: { crop: { l: number; t: number; r: number; b: number } }, set: P<{ crop: typeof o.crop }>, out: Field[]): void {
  const cr = o.crop
  out.push(head('Beskjær'),
    range('Venstre', cr.l, 0, 0.9, 0.005, pct(cr.l), (v) => set({ crop: { ...cr, l: v } })),
    range('Høyre', cr.r, 0, 0.9, 0.005, pct(cr.r), (v) => set({ crop: { ...cr, r: v } })),
    range('Topp', cr.t, 0, 0.9, 0.005, pct(cr.t), (v) => set({ crop: { ...cr, t: v } })),
    range('Bunn', cr.b, 0, 0.9, 0.005, pct(cr.b), (v) => set({ crop: { ...cr, b: v } })))
}

function speedFields(o: { speed: number; rev: boolean }, set: P<{ speed: number; rev: boolean }>, out: Field[]): void {
  const sp = o.speed || 1
  out.push(head('Hastighet'),
    seg('Fart', String(sp), [['0.25', '¼×'], ['0.5', '½×'], ['1', '1×'], ['2', '2×'], ['4', '4×']], (v) => set({ speed: Number(v) })),
    range('Egendefinert fart', sp, 0.1, 8, 0.05, `${sp.toFixed(2)}×`, (v) => set({ speed: v })),
    toggle('Spill baklengs', o.rev, (v) => set({ rev: v })),
    note('Lyden følger farten. Baklengs kan hakke i forhåndsvisningen, men blir jevn i eksporten.'))
}

function colorExtras(c: Clip, set: P<Clip>, out: Field[]): void {
  out.push(range('Temperatur', c.temp || 0, -1, 1, 0.01, spct(c.temp || 0), (v) => set({ temp: v })),
    range('Fargetone', c.tint || 0, -1, 1, 0.01, spct(c.tint || 0), (v) => set({ tint: v })),
    range('Uskarphet', c.blur || 0, 0, 30, 0.5, c.blur ? `${c.blur.toFixed(1)} px` : OFF, (v) => set({ blur: v })),
    range('Vignett', c.vig || 0, 0, 1, 0.01, pct(c.vig || 0), (v) => set({ vig: v })),
    range('Filmkorn', c.grain || 0, 0, 1, 0.01, pct(c.grain || 0), (v) => set({ grain: v })),
    { k: 'acts', label: '', acts: [act('Tilbakestill farge', () => set({ bri: 0, con: 0, sat: 0, dim: 0, temp: 0, tint: 0, blur: 0, vig: 0, grain: 0, cS: 0, cM: 0, cH: 0, curves: null, look: 'none' }))] })
}

function curveFields(c: Grade, set: P<Grade>, out: Field[]): void {
  out.push(head('RGB-kurver'), { k: 'curve', c, on: set },
    range('Skygger', c.cS || 0, -1, 1, 0.01, spct(c.cS || 0), (v) => set({ cS: v })),
    range('Mellomtoner', c.cM || 0, -1, 1, 0.01, spct(c.cM || 0), (v) => set({ cM: v })),
    range('Høylys', c.cH || 0, -1, 1, 0.01, spct(c.cH || 0), (v) => set({ cH: v })))
}

function keyFields(o: Overlay, set: P<Overlay>, out: Field[]): void {
  out.push(head('Grønnskjerm'), toggle('Fjern bakgrunnsfarge', o.keyOn, (v) => set({ keyOn: v })))
  if (!o.keyOn) return
  out.push(seg('Nøkkelfarge', o.keyColor, [['#00ff00', 'Grønn'], ['#0047ff', 'Blå']], (v) => set({ keyColor: v })),
    color('Egen nøkkelfarge', o.keyColor, (v) => set({ keyColor: v })),
    range('Toleranse', o.keySim, 0.05, 0.9, 0.01, pct(o.keySim), (v) => set({ keySim: v })),
    range('Myke kanter', o.keySmooth, 0.01, 0.5, 0.005, pct(o.keySmooth), (v) => set({ keySmooth: v })),
    range('Fjern fargeskjær', o.keySpill, 0, 1, 0.01, pct(o.keySpill), (v) => set({ keySpill: v })))
}

function moreClipFields(c: MediaClip, set: P<MediaClip>, out: Field[]): void {
  const sc = c.scale ?? 1
  out.push(head('Plassering og størrelse'),
    range('Størrelse', sc, 0.1, 3, 0.01, pct(sc), (v) => set({ scale: v })),
    range('Flytt vannrett', c.x || 0, -1, 1, 0.005, pct(c.x || 0), (v) => set({ x: v })),
    range('Flytt loddrett', c.y || 0, -1, 1, 0.005, pct(c.y || 0), (v) => set({ y: v })),
    range('Roter', c.rot || 0, -180, 180, 1, `${Math.round(c.rot || 0)}°`, (v) => set({ rot: v })),
    toggle('Speil vannrett', c.flipH, (v) => set({ flipH: v })),
    toggle('Speil loddrett', c.flipV, (v) => set({ flipV: v })))
  cropFields(c, set, out)
  if (c.kind === 'video') {
    speedFields(c, set, out)
    out.push(head('Lydtoning'),
      range('Ton inn', c.afi || 0, 0, 10, 0.1, `${(c.afi || 0).toFixed(1)} s`, (v) => set({ afi: v })),
      range('Ton ut', c.afo || 0, 0, 10, 0.1, `${(c.afo || 0).toFixed(1)} s`, (v) => set({ afo: v })))
  }
}

const mediaOf = (p: Project, id: string): Media | undefined => p.media.find((m) => m.id === id)
const transOpts = TRANS as readonly Opt[]

export function clipFields(c: MotionController, p: Project, it: Clip, l: Placed | undefined, idx: number): Field[] {
  const set = (o: Partial<Clip>) => c.patch('clip', it.id, o)
  const out: Field[] = []
  if (it.kind === 'color') {
    out.push(color('Farge 1', it.c1, (v) => set({ c1: v })), color('Farge 2', it.c2, (v) => set({ c2: v })),
      seg('Type', it.grad, [['none', 'Ensfarget'], ['linear', 'Lineær'], ['radial', 'Rund']], (v) => set({ grad: v as 'none' })))
    if (it.grad === 'linear') {
      const a = ((it.ang % 360) + 360) % 360
      out.push(range('Vinkel', a, 0, 360, 1, `${Math.round(a)}°`, (v) => set({ ang: v })),
        range('Bevegelse', it.spin, -30, 30, 1, it.spin ? `${it.spin}°/s` : OFF, (v) => set({ spin: v })))
    }
    out.push(num('Varighet (s)', it.dur, 0.3, 3600, 0.1, (v) => set({ dur: v })))
  } else {
    const md = mediaOf(p, it.media)?.dur || 0
    if (it.kind === 'video') {
      out.push(note('Lengde {len} av {all}. Dra i kantene på tidslinjen for å klippe.', { len: fmtT(l?.dur ?? 0), all: fmtT(md) }),
        num('Start i klippet (s)', it.in, 0, Math.max(0, it.out - 0.2), 0.1, (v) => set({ in: v })),
        num('Slutt i klippet (s)', it.out, it.in + 0.2, md || 86400, 0.1, (v) => set({ out: v })))
    } else out.push(num('Varighet (s)', it.dur, 0.3, 3600, 0.1, (v) => set({ dur: v })))
    out.push(seg('Utfylling', it.fit, [['cover', 'Fyll rammen'], ['contain', 'Vis hele']], (v) => set({ fit: v as 'cover' })),
      range('Zoom', it.zoom, 1, 3, 0.01, pct(it.zoom), (v) => set({ zoom: v })),
      range('Utsnitt vannrett', it.fx, 0, 1, 0.01, pct(it.fx), (v) => set({ fx: v })),
      range('Utsnitt loddrett', it.fy, 0, 1, 0.01, pct(it.fy), (v) => set({ fy: v })))
    if (it.kind === 'image') out.push(toggle('Langsom zoom', it.kb, (v) => set({ kb: v })))
    if (it.kind === 'video') out.push(head('Lyd'), toggle('Demp lyden', it.muted, (v) => set({ muted: v })), range('Volum', it.vol, 0, 1, 0.01, pct(it.vol), (v) => set({ vol: v })))
    moreClipFields(it, set as P<MediaClip>, out)
  }
  out.push(head('Farge og lys'),
    select('Fargefilter', it.look || 'none', LOOKS, (v) => set({ look: v })),
    range('Lysstyrke', it.bri, -0.6, 0.6, 0.01, spct(it.bri), (v) => set({ bri: v })),
    range('Kontrast', it.con, -0.6, 0.8, 0.01, spct(it.con), (v) => set({ con: v })),
    range('Metning', it.sat, -1, 1, 0.01, spct(it.sat), (v) => set({ sat: v })),
    range('Mørklegg', it.dim, 0, 0.9, 0.01, pct(it.dim), (v) => set({ dim: v })))
  colorExtras(it, set, out)
  curveFields(it, set, out)
  if (idx === 0) {
    out.push(head('Overgang ved start'), select('Overgang', p.tin.type, transOpts, (v) => c.setTrans('tin', { type: v })))
    if (p.tin.type !== 'none') out.push(range('Varighet', p.tin.dur, 0.1, 3, 0.05, `${p.tin.dur.toFixed(2)} s`, (v) => c.setTrans('tin', { dur: v })))
  }
  if (idx === p.clips.length - 1) {
    out.push(head('Overgang ved slutt'), select('Overgang', p.tout.type, transOpts, (v) => c.setTrans('tout', { type: v })))
    if (p.tout.type !== 'none') out.push(range('Varighet', p.tout.dur, 0.1, 3, 0.05, `${p.tout.dur.toFixed(2)} s`, (v) => c.setTrans('tout', { dur: v })))
  }
  if (idx > 0) {
    out.push(head('Overgang inn'), select('Overgang', it.trans.type, transOpts, (v) => set({ trans: { ...it.trans, type: v } })))
    if (it.trans.type !== 'none') out.push(range('Varighet', it.trans.dur, 0.1, 2, 0.05, `${it.trans.dur.toFixed(2)} s`, (v) => set({ trans: { ...it.trans, dur: v } })))
  }
  return out
}

export function textFields(c: MotionController, x: TextItem): Field[] {
  const set = (o: Partial<TextItem>) => c.patch('text', x.id, o)
  const out: Field[] = [toggle('Nedtelling', x.countdown, (v) => set({ countdown: v }))]
  if (x.countdown) {
    const from = Math.round(x.cdFrom ?? x.dur)
    const dd = Math.floor(from / 86400)
    const hh = Math.floor(from / 3600) % 24
    const mm = Math.floor(from / 60) % 60
    const ss = from % 60
    const setFrom = (d: number, h: number, m: number, s: number) => {
      const nf = Math.max(0, d * 86400 + h * 3600 + m * 60 + s)
      const o: Partial<TextItem> = { cdFrom: nf }
      if (Math.abs(x.dur - from) < 0.05 && nf >= 1 && nf <= 3600) o.dur = nf
      set(o)
    }
    out.push(head('Tell ned fra'),
      num('Dager', dd, 0, 99, 1, (v) => setFrom(Math.round(v), hh, mm, ss)),
      num('Timer', hh, 0, 23, 1, (v) => setFrom(dd, Math.round(v), mm, ss)),
      num('Minutter', mm, 0, 59, 1, (v) => setFrom(dd, hh, Math.round(v), ss)),
      num('Sekunder', ss, 0, 59, 1, (v) => setFrom(dd, hh, mm, Math.round(v))),
      select('Visning', x.cdFmt || 'auto', [['auto', 'Automatisk'], ['ss', 'Sekunder (10)'], ['mmss', 'Min:sek (00:10)'], ['hhmmss', 'Tim:min:sek (00:00:10)'], ['ddhhmmss', 'Dag:tim:min:sek (00:00:00:10)']], (v) => set({ cdFmt: v as 'auto' })),
      note('Viser {start} ved start og teller ned så lenge teksten vises ({len}). Endre Varighet under Tid for hvor lenge den vises.', { start: fmtCount(from, x.cdFmt), len: fmtT(x.dur) }))
    if (Math.abs(x.dur - from) > 0.05 && from >= 1) out.push({ k: 'acts', label: '', acts: [act('Vis hele nedtellingen', () => set({ dur: from }))] })
  } else out.push(area('Tekst', x.text, (v) => set({ text: v })))
  out.push(select('Skrift', x.font, FONTS.map((f) => [f, f] as const), (v) => set({ font: v }), true),
    select('Vekt', x.weight, [['300', 'Tynn'], ['400', 'Vanlig'], ['500', 'Medium'], ['600', 'Halvfet'], ['700', 'Fet'], ['800', 'Ekstra fet'], ['900', 'Svart']], (v) => set({ weight: Number(v) })),
    range('Størrelse', x.size, 12, 400, 1, `${Math.round(x.size)} px`, (v) => set({ size: v })),
    color('Tekstfarge', x.color, (v) => set({ color: v })),
    seg('Justering', x.align, [['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']], (v) => set({ align: v as 'left' })),
    toggle('Store bokstaver', x.upper, (v) => set({ upper: v })),
    toggle('Kursiv', x.italic, (v) => set({ italic: v })),
    toggle('Skygge', x.shadow, (v) => set({ shadow: v })),
    range('Kontur', x.stroke || 0, 0, 6, 0.1, x.stroke ? x.stroke.toFixed(1) : OFF, (v) => set({ stroke: v })))
  if (x.stroke > 0) out.push(color('Konturfarge', x.strokeColor || '#000000', (v) => set({ strokeColor: v })))
  out.push(toggle('Fargeovergang', x.grad, (v) => set({ grad: v })))
  if (x.grad) out.push(color('Farge 2', x.color2 || '#f5b82c', (v) => set({ color2: v })))
  out.push(seg('Bakgrunn', x.box, [['none', 'Ingen'], ['block', 'Boks'], ['line', 'Linjer']], (v) => set({ box: v as 'none' })))
  if (x.box !== 'none') out.push(color('Bakgrunnsfarge', x.bg, (v) => set({ bg: v })))
  out.push(range('Bokstavavstand', x.track, -0.05, 0.5, 0.01, pct(x.track), (v) => set({ track: v })),
    range('Linjeavstand', x.lh, 0.8, 2, 0.01, x.lh.toFixed(2), (v) => set({ lh: v })),
    range('Bredde', x.maxW, 0.2, 1, 0.01, pct(x.maxW), (v) => set({ maxW: v })),
    range('Synlighet', x.opacity, 0, 1, 0.01, pct(x.opacity), (v) => set({ opacity: v })),
    head('Plassering'),
    range('Vannrett', x.x, 0, 1, 0.005, pct(x.x), (v) => set({ x: v })),
    range('Loddrett', x.y, 0, 1, 0.005, pct(x.y), (v) => set({ y: v })),
    head('Tid'),
    select('Animasjon', x.anim, ANIMS, (v) => set({ anim: v })),
    num('Start (s)', x.start, 0, 86400, 0.1, (v) => set({ start: v })),
    num('Varighet (s)', x.dur, 0.2, 86400, 0.1, (v) => set({ dur: v })))
  return out
}

export function ovFields(c: MotionController, p: Project, o: Overlay): Field[] {
  const set = (v: Partial<Overlay>) => c.patch('ov', o.id, v)
  const out: Field[] = []
  const md = mediaOf(p, o.media)?.dur || 86400
  if (o.kind === 'video') {
    out.push(note('Lengde {len}. Dra i kantene på tidslinjen for å klippe.', { len: fmtT(ovDur(o)) }),
      num('Start i klippet (s)', o.in, 0, Math.max(0, o.out - 0.2), 0.1, (v) => set({ in: v })),
      num('Slutt i klippet (s)', o.out, o.in + 0.2, md, 0.1, (v) => set({ out: v })))
  } else out.push(num('Varighet (s)', o.dur, 0.2, 86400, 0.1, (v) => set({ dur: v })))
  out.push(num('Start på tidslinjen (s)', o.start, 0, 86400, 0.1, (v) => set({ start: v })),
    head('Plassering og størrelse'),
    note('Dra overlegget i forhåndsvisningen for å flytte det.'),
    range('Størrelse', o.scale, 0.05, 1.5, 0.005, pct(o.scale), (v) => set({ scale: v })),
    range('Vannrett', o.x, 0, 1, 0.005, pct(o.x), (v) => set({ x: v })),
    range('Loddrett', o.y, 0, 1, 0.005, pct(o.y), (v) => set({ y: v })),
    range('Roter', o.rot || 0, -180, 180, 1, `${Math.round(o.rot || 0)}°`, (v) => set({ rot: v })),
    range('Synlighet', o.opacity, 0, 1, 0.01, pct(o.opacity), (v) => set({ opacity: v })),
    toggle('Speil vannrett', o.flipH, (v) => set({ flipH: v })),
    head('Ramme'),
    range('Runde hjørner', o.radius || 0, 0, 1, 0.01, pct(o.radius || 0), (v) => set({ radius: v })),
    range('Kantlinje', o.border || 0, 0, 3, 0.05, o.border ? o.border.toFixed(2) : OFF, (v) => set({ border: v })))
  if (o.border > 0) out.push(color('Kantfarge', o.borderColor || '#ffffff', (v) => set({ borderColor: v })))
  out.push(toggle('Skygge', o.shadow, (v) => set({ shadow: v })), select('Blandingsmodus', o.blend, BLENDS, (v) => set({ blend: v as GlobalCompositeOperation })))
  cropFields(o, set, out)
  out.push(head('Inn og ut'),
    select('Animasjon', o.anim, OVANIMS, (v) => set({ anim: v })),
    range('Ton inn', o.fadeIn || 0, 0, 5, 0.1, `${(o.fadeIn || 0).toFixed(1)} s`, (v) => set({ fadeIn: v })),
    range('Ton ut', o.fadeOut || 0, 0, 5, 0.1, `${(o.fadeOut || 0).toFixed(1)} s`, (v) => set({ fadeOut: v })))
  if (o.kind === 'video') {
    speedFields(o, set, out)
    out.push(head('Lyd'), toggle('Demp lyden', o.muted, (v) => set({ muted: v })), range('Volum', o.vol, 0, 1, 0.01, pct(o.vol), (v) => set({ vol: v })))
  }
  keyFields(o, set, out)
  out.push(head('Farge'),
    select('Fargefilter', o.look || 'none', LOOKS, (v) => set({ look: v })),
    range('Lysstyrke', o.bri || 0, -0.6, 0.6, 0.01, spct(o.bri || 0), (v) => set({ bri: v })),
    range('Kontrast', o.con || 0, -0.6, 0.8, 0.01, spct(o.con || 0), (v) => set({ con: v })),
    range('Metning', o.sat || 0, -1, 1, 0.01, spct(o.sat || 0), (v) => set({ sat: v })),
    range('Uskarphet', o.blur || 0, 0, 30, 0.5, `${(o.blur || 0).toFixed(1)} px`, (v) => set({ blur: v })))
  curveFields(o, set, out)
  return out
}

export function musicFields(c: MotionController, m: Music): Field[] {
  const set = (o: Partial<Music>) => c.patch('music', m.id, o)
  return [num('Start på tidslinjen (s)', m.start, 0, 86400, 0.1, (v) => set({ start: v })),
    num('Start i sporet (s)', m.in, 0, Math.max(0, m.out - 0.2), 0.1, (v) => set({ in: v })),
    num('Slutt i sporet (s)', m.out, m.in + 0.2, m.srcDur, 0.1, (v) => set({ out: v })),
    range('Volum', m.vol, 0, 1, 0.01, pct(m.vol), (v) => set({ vol: v })),
    range('Ton inn', m.fadeIn, 0, 10, 0.1, `${m.fadeIn.toFixed(1)} s`, (v) => set({ fadeIn: v })),
    range('Ton ut', m.fadeOut, 0, 10, 0.1, `${m.fadeOut.toFixed(1)} s`, (v) => set({ fadeOut: v })),
    toggle('Gjenta til videoen er slutt', m.loop, (v) => set({ loop: v }))]
}

export function subFields(c: MotionController, s: Sub): Field[] {
  const set = (o: Partial<Sub>) => c.patch('sub', s.id, o)
  return [area('Tekst', s.text, (v) => set({ text: v })),
    num('Start (s)', s.start, 0, Math.max(0, s.end - 0.2), 0.1, (v) => set({ start: v })),
    num('Slutt (s)', s.end, s.start + 0.2, 86400, 0.1, (v) => set({ end: v }))]
}

export function projectFields(c: MotionController, p: Project, T: number): Field[] {
  const mx = mixOf(p)
  const out: Field[] = [color('Bakgrunnsfarge', p.bg, (v) => c.setProj((q) => ({ ...q, bg: v }), true, 'bg')), note('Format {w} × {h} · lengde {len}', { w: p.w, h: p.h, len: fmtT(T) })]
  out.push(head('Lydmikser'),
    range('Videoklipp', mx.video, 0, 1, 0.01, pct(mx.video), (v) => c.setMix('video', v)),
    range('Overlegg', mx.ov, 0, 1, 0.01, pct(mx.ov), (v) => c.setMix('ov', v)),
    range('Musikk', mx.music, 0, 1, 0.01, pct(mx.music), (v) => c.setMix('music', v)),
    toggle('Senk musikken under tale', mx.duck, (v) => c.setMix('duck', v)),
    { k: 'acts', label: '', acts: [act('Utjevn lyd i klippene', () => void c.levelClips())] })
  if (mx.duck) out.push(range('Demping', mx.duckAmt, 0.1, 0.95, 0.01, `−${pct(mx.duckAmt)}`, (v) => c.setMix('duckAmt', v)), note('Musikken senkes automatisk når videoklipp eller overlegg har lyd.'))
  out.push(head('Markører'))
  if (!p.markers.length) out.push(note('Trykk M eller knappen under for å sette en markør ved spillehodet.'))
  for (const k of p.markers) out.push({ k: 'acts', label: '', acts: [{ l: fmtT(k.t), raw: true, click: () => c.seek(k.t) }, act('Slett', () => c.delMarker(k.id), true)] })
  return out
}

export function subStyleFields(c: MotionController, p: Project): Field[] {
  const st = p.subStyle
  const set = (o: Partial<Project['subStyle']>) => c.patchSubStyle(o)
  const out: Field[] = [range('Størrelse', st.size, 16, 140, 1, `${Math.round(st.size)} px`, (v) => set({ size: v })),
    select('Skrift', st.font, FONTS.map((f) => [f, f] as const), (v) => set({ font: v }), true),
    color('Tekstfarge', st.color, (v) => set({ color: v })),
    seg('Plassering', st.pos, [['top', 'Oppe'], ['center', 'Midt'], ['bottom', 'Nede']], (v) => set({ pos: v as 'top' })),
    toggle('Bakgrunn bak teksten', st.bgOn, (v) => set({ bgOn: v }))]
  if (st.bgOn) out.push(color('Bakgrunnsfarge', st.bg, (v) => set({ bg: v })), range('Bakgrunnens synlighet', st.bgA, 0, 1, 0.01, pct(st.bgA), (v) => set({ bgA: v })))
  out.push(toggle('Store bokstaver', st.upper, (v) => set({ upper: v })), seg('Visning', st.mode || 'line', [['line', 'Hele linjen'], ['words', 'Ord for ord']], (v) => set({ mode: v as 'line' })))
  if (st.mode === 'words') out.push(color('Uthevet ord', st.hl || '#f5b82c', (v) => set({ hl: v })))
  return out
}

export function logoFields(c: MotionController, p: Project): Field[] {
  const lg = p.logo
  const set = (o: Partial<Project['logo']>) => c.patchLogo(o)
  return [toggle('Vis logo', lg.on, (v) => set({ on: v })),
    seg('Plassering', lg.pos, [['tl', '↖'], ['tr', '↗'], ['bl', '↙'], ['br', '↘']], (v) => set({ pos: v as 'tl', x: null, y: null })),
    range('Størrelse', lg.size, 0.03, 0.4, 0.005, pct(lg.size), (v) => set({ size: v })),
    range('Synlighet', lg.opacity, 0.1, 1, 0.01, pct(lg.opacity), (v) => set({ opacity: v }))]
}

/** Seksjoner kan lukkes; feltene under en lukket overskrift skjules (valget huskes). */
export function collapse(fields: Field[], open: Record<string, boolean>): (Field & { open?: boolean })[] {
  const out: (Field & { open?: boolean })[] = []
  let cur: string | null = null
  for (const f of fields) {
    if (f.k === 'head') {
      cur = f.label
      out.push({ ...f, open: !!open[cur] })
      continue
    }
    if (!cur || open[cur]) out.push(f)
  }
  return out
}

