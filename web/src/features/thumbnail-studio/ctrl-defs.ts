import { gbox, type LayerPatch, type ThumbController } from './controller'
import { countImgs, FONTS, H, W, type Doc, type ImageLayer, type Layer, type TextLayer } from './engine/model'
import { fitSize } from './engine/render'
import { bakeList } from './engine/text-list'
import type { Phrase, Vars } from './texts'

/** Beskrivelse av én kontroll i egenskapspanelet (samme rekkefølge og valg som dagens app). */
export interface Unit { u: string; k: number; d?: number; t?: Phrase }
export type Ctrl =
  | { k: 'h'; label: Phrase }
  | { k: 'slider'; label: Phrase; val: number; min: number; max: number; step: number; set: (v: number) => void; units: Unit[]; key: string; lim: [number, number] }
  | { k: 'color'; label: Phrase; val: string; set: (v: string) => void }
  | { k: 'seg'; label: Phrase; val: string; opts: [string, Phrase][]; set: (v: string) => void }
  | { k: 'check'; label: Phrase; val: boolean; set: (v: boolean) => void }
  | { k: 'area'; label: Phrase; val: string; rows: number; ph: Phrase; set: (v: string) => void; list?: TextLayer }
  | { k: 'select'; label: Phrase; val: string; opts: { v: string; label: string; phrase?: Phrase; suffix?: Phrase }[]; set: (v: string) => void }
  | { k: 'note'; text: Phrase; v?: Vars }
  | { k: 'nums'; items: [string, number, (v: number) => void][] }
  | { k: 'btns'; items: { label: Phrase; v?: Vars; on: () => void; kind?: 'p' | 'd' | ''; disabled?: boolean }[] }
  | { k: 'img'; label: Phrase; src: string | null; pick: () => void; clear: () => void; layer?: ImageLayer }

export const WEIGHT_NAMES: Record<number, Phrase> = { 400: 'Vanlig', 500: 'Medium', 600: 'Halvfet', 700: 'Fet', 800: 'Ekstra fet', 900: 'Svart' }

const HD = (label: Phrase): Ctrl => ({ k: 'h', label })
const NT = (text: Phrase, v?: Vars): Ctrl => (v ? { k: 'note', text, v } : { k: 'note', text })
const BT = (items: Extract<Ctrl, { k: 'btns' }>['items']): Ctrl => ({ k: 'btns', items })
const CK = (label: Phrase, val: boolean, set: (v: boolean) => void): Ctrl => ({ k: 'check', label, val: !!val, set })
const CO = (label: Phrase, val: string | null | undefined, set: (v: string) => void): Ctrl => ({ k: 'color', label, val: String(val ?? ''), set })
const SG = (label: Phrase, val: string, opts: [string, Phrase][], set: (v: string) => void): Ctrl => ({ k: 'seg', label, val, opts, set })

/** Glidebryter med tallfelt; enheten (px, %, °, pt …) kan byttes der det gir mening. */
function SL(label: Phrase, val: number, min: number, max: number, step: number, set: (v: number) => void, unit: string, o: { key?: string; lim?: [number, number]; units?: Unit[] } = {}): Ctrl {
  const rnd = (v: number) => (step >= 1 ? Math.round(v) : Math.round(v / step) * step)
  return { k: 'slider', label, val, min, max, step, set: (v) => set(rnd(v)), units: o.units ?? [{ u: unit, k: 1 }], key: o.key ?? 'ts.' + label, lim: o.lim ?? [min, max] }
}

export function lname(_c: ThumbController, l: Layer, t: (p: Phrase, v?: Vars) => string): string {
  const auto = autoName(l, t)
  if (!l.name) return auto
  return l.type === 'text' && String(l.text || '').trim() && auto.toLowerCase() !== l.name.toLowerCase() ? `${l.name} – ${auto}` : l.name
}

export function autoName(l: Layer, t: (p: Phrase, v?: Vars) => string): string {
  if (l.type === 'text') return String(l.text || '').split('\n').join(' ').trim().slice(0, 28) || t('Tekst')
  if (l.type === 'image') {
    if (l.role === 'person') return t('Person')
    const a = l.src?.startsWith('asset:') ? l.src.slice(6) : null
    return t(a === 'logo-symbol' ? 'Livets Ord-symbol' : a === 'logo-kbs' ? 'Kveldsbibelskole-logo' : a === 'logo-wol' ? 'Word of Life-logo' : 'Bilde')
  }
  return t(l.type === 'shape' ? (l.kind === 'line' ? 'Strek' : 'Form') : 'Lys')
}

function IM(c: ThumbController, l: ImageLayer, label: Phrase): Ctrl {
  return { k: 'img', label, src: l.src, layer: l, pick: () => c.openPicker('file', { mode: 'replace', id: l.id }), clear: () => c.setL(l.id, { src: null, orig: null }) }
}

function cropCtrls(c: ThumbController, l: ImageLayer): Ctrl[] {
  const has = (['cT', 'cB', 'cL', 'cR'] as const).some((k) => (l[k] || 0) > 0)
  return [HD('Beskjær'), NT('Kutt bort deler av bildet, for eksempel alt under livet, eller tomme kanter etter at bakgrunnen er fjernet. Du kan også dobbeltklikke på bildet.'),
    BT([{ label: 'Beskjær bildet …', on: () => c.openCrop(l.id), kind: 'p' }, { label: 'Fjern tomme kanter', on: () => c.trim(l.id) }, { label: 'Vis hele bildet', on: () => c.applyCropTo(l.id, { cT: 0, cB: 0, cL: 0, cR: 0 }), disabled: !has }])]
}

function barCtrls(l: TextLayer, set: (p: LayerPatch) => void, c: ThumbController): Ctrl[] {
  return [
    CO('Strekfarge', l.barColor, (v) => set({ barColor: v })),
    SL('Strektykkelse', l.barH, 1, 120, 1, (v) => set({ barH: v }), 'px', { key: 'ts.barH', lim: [1, 400] }),
    SL('Strekbredde (av teksten)', Math.round((l.barW ?? 1) * 100), 5, 300, 1, (v) => set({ barW: v / 100 }), '%'),
    SL('Avstand til teksten', Math.round((l.barGap ?? 1) * 100), 0, 600, 5, (v) => set({ barGap: v / 100 }), '%'),
    BT([{ label: 'Koble fra teksten', on: () => c.detachBar(l.id) }, { label: 'Fjern understrek', on: () => { set({ bar: false }); c.ui({ barSel: null }) } }]),
  ]
}

export function ctrlsBar(c: ThumbController, l: TextLayer, t: (p: Phrase, v?: Vars) => string): Ctrl[] {
  const set = (p: LayerPatch) => c.setL(l.id, p)
  return [NT('Understreken er koblet til teksten «{name}» og flytter seg sammen med den.', { name: lname(c, l, t) }), ...barCtrls(l, set, c), BT([{ label: '← Rediger teksten', on: () => c.ui({ barSel: null }) }])]
}

export function linkNote(c: ThumbController, l: Layer, t: (p: Phrase, v?: Vars) => string): Ctrl[] {
  const d = c.s.doc
  if (!d) return []
  const P = l.link ? d.layers.find((x) => x.id === l.link) : null
  const n = d.layers.filter((x) => x.link === l.id && x.id !== l.id).length
  if (P) return [NT('Koblet til «{name}» og flytter seg sammen med det.', { name: lname(c, P, t) }), BT([{ label: 'Koble fra', on: () => c.unlink(l.id) }])]
  if (n) return [NT('{n} lag er koblet til dette laget og flytter seg sammen med det.', { n })]
  return []
}

function common(c: ThumbController, l: Layer, glow: boolean): Ctrl[] {
  const set = (p: LayerPatch) => c.setL(l.id, p)
  const d = c.s.doc as Doc
  const i = d.layers.findIndex((x) => x.id === l.id)
  const min = l.type === 'shape' ? 1 : 10
  const out: Ctrl[] = [
    HD('Plassering'),
    { k: 'nums', items: [['X', l.x, (v) => set({ x: v })], ['Y', l.y, (v) => set({ y: v })], ['B', l.w, (v) => set({ w: Math.max(min, v) })], ['H', l.h, (v) => set({ h: Math.max(min, v) })]] },
    SL('Rotasjon', l.rot || 0, -180, 180, 1, (v) => set({ rot: v }), '°'),
    BT([{ label: '⇆ Speil vannrett', on: () => c.flipSel('x'), kind: (l.type === 'image' ? l.flip : l.flipX) ? 'p' : '' }, { label: '⇅ Speil loddrett', on: () => c.flipSel('y'), kind: l.flipY ? 'p' : '' }]),
  ]
  if (!glow) out.push(SL('Synlighet', Math.round(l.op * 100), 0, 100, 1, (v) => set({ op: v / 100 }), '%'), SL('Skygge', Math.round(l.shadow * 100), 0, 100, 1, (v) => set({ shadow: v / 100 }), '%'))
  if (c.movedFromBase(l)) out.push(BT([{ label: '↺ Tilbake til grunnoppsettets plassering', on: () => c.resetPos(l.id) }]))
  out.push(CK('Lås (kan ikke flyttes i bildet)', l.lock, (v) => set({ lock: v })),
    BT([{ label: 'Frem', on: () => c.moveZ(l.id, 1), disabled: i >= d.layers.length - 1 }, { label: 'Bak', on: () => c.moveZ(l.id, -1), disabled: i <= 0 }, { label: 'Dupliser', on: () => c.dupLayer(l.id) }, { label: 'Slett', on: () => c.delLayer(l.id), kind: 'd' }]))
  return out
}

export function ctrlsFor(c: ThumbController, l: Layer): Ctrl[] {
  const set = (p: LayerPatch) => c.setL(l.id, p)
  const C: Ctrl[] = []
  if (l.type === 'text') {
    const ws = c.weights(l.font)
    const pf = c.profile().fonts
    const fs = fitSize(l)
    C.push(
      { k: 'area', label: 'Tekst', val: bakeList(String(l.text || ''), l.list), rows: 4, ph: 'Skriv tekst', set: (v) => set({ text: v, list: '' }), list: l },
      { k: 'select', label: 'Font', val: l.font, set: (v) => {
        const w2 = c.weights(v)
        set({ font: v, weight: w2.includes(l.weight) ? l.weight : (w2[Math.min(3, w2.length - 1)] ?? 400) })
      }, opts: [...pf.map((f) => ({ v: f, label: f, suffix: ' (grunnoppsett)' as Phrase })), ...FONTS.filter((f) => !pf.includes(f[0])).map((f) => ({ v: f[0], label: f[0] }))] },
      { k: 'select', label: 'Tykkelse', val: String(l.weight), set: (v) => set({ weight: +v }), opts: ws.map((w) => ({ v: String(w), label: String(w), ...(WEIGHT_NAMES[w] ? { phrase: WEIGHT_NAMES[w] } : {}) })) },
      SL(l.fit ? 'Maks størrelse' : 'Størrelse', l.size, 8, 1000, 1, (v) => set({ size: v }), 'px', { key: 'ts.textSize', lim: [4, 3000], units: [{ u: 'px', k: 1 }, { u: '%', k: 100 / H, d: 1, t: 'av bildehøyden' }, { u: 'pt', k: 0.75 }] }),
    )
    if (l.fit && fs < l.size - 0.5) {
      C.push(NT('Vises i {n} px fordi teksten må passe i boksen. Gjør boksen større eller slå av «Tilpass til boksen» for større tekst.', { n: Math.round(fs) }),
        BT([{ label: 'Gjør boksen større', on: () => {
          const k = Math.min(4, l.size / Math.max(1, fs))
          set({ w: Math.round(l.w * k), h: Math.round(l.h * k) })
        } }]))
    }
    C.push(
      CK('Tilpass til boksen', l.fit, (v) => set({ fit: v })),
      CO('Farge', l.color, (v) => set({ color: v })),
      SG('Justering', l.align, [['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']], (v) => set({ align: v })),
      SG('Loddrett', l.valign, [['top', 'Topp'], ['middle', 'Midt'], ['bottom', 'Bunn']], (v) => set({ valign: v })),
      SL('Linjeavstand', Math.round(l.lh * 100), 70, 180, 1, (v) => set({ lh: v / 100 }), '%'),
      SL('Bokstavavstand', Math.round(l.ls * 100), -5, 50, 1, (v) => set({ ls: v / 100 }), ''),
      CK('Store bokstaver', l.upper, (v) => set({ upper: v })),
      CK('Strek under', l.bar, (v) => set({ bar: v })),
    )
    if (l.bar) C.push(...barCtrls(l, set, c))
  } else if (l.type === 'image') {
    C.push(IM(c, l, l.role === 'person' ? 'Person' : 'Bilde'))
    if (l.src) C.push(...cropCtrls(c, l))
    C.push(HD('Form og tilpasning'), SG('Form', l.shape, [['rect', 'Firkant'], ['rounded', 'Avrundet'], ['ellipse', 'Sirkel']], (v) => set({ shape: v })))
    if (l.shape === 'rounded') C.push(SL('Hjørner', l.radius, 0, 400, 1, (v) => set({ radius: v }), 'px'))
    if (l.shape === 'ellipse' && l.w !== l.h) C.push(BT([{ label: 'Gjør helt rund', on: () => {
      const s = Math.min(l.w, l.h)
      set({ w: s, h: s, x: Math.round(l.x + (l.w - s) / 2), y: Math.round(l.y + (l.h - s) / 2) })
    } }]))
    C.push(
      SG('Tilpasning', l.fit, [['cover', 'Fyll formen'], ['contain', 'Vis hele']], (v) => set({ fit: v })),
      SL('Zoom', Math.round(l.zoom * 100), 50, 400, 1, (v) => set({ zoom: v / 100 }), '%'),
      SL('Utsnitt vannrett', Math.round(l.px * 100), 0, 100, 1, (v) => set({ px: v / 100 }), '%'),
      SL('Utsnitt loddrett', Math.round(l.py * 100), 0, 100, 1, (v) => set({ py: v / 100 }), '%'),
      SL('Kant', l.border, 0, 40, 1, (v) => set({ border: v }), 'px'),
    )
    if (l.border > 0) C.push(CO('Kantfarge', l.borderColor, (v) => set({ borderColor: v })))
    C.push(CK('Ensfarget (for logoer)', !!l.tint, (v) => set({ tint: v ? '#ffffff' : null })))
    if (l.tint) C.push(CO('Logofarge', l.tint, (v) => set({ tint: v })))
  } else if (l.type === 'shape') {
    C.push(SG('Form', l.kind, [['rect', 'Firkant'], ['rounded', 'Avrundet'], ['ellipse', 'Sirkel'], ['line', 'Strek']], (v) => {
      if (v === l.kind) return
      if (v === 'line') set({ kind: v, h: 8, y: Math.round(l.y + l.h / 2 - 4), radius: 0 })
      else if (l.kind === 'line') {
        const h = Math.max(l.h, 200)
        set({ kind: v, h, y: Math.round(l.y + l.h / 2 - h / 2), radius: 40 })
      } else set({ kind: v })
    }))
    const grad = () => {
      C.push(CO(l.fill2 ? 'Farge 1' : 'Farge', l.fill, (v) => set({ fill: v })), CK('Gradient', !!l.fill2, (v) => set({ fill2: v ? '#000000' : null })))
      if (l.fill2) C.push(CO('Farge 2', l.fill2, (v) => set({ fill2: v })), SL('Vinkel', l.angle, 0, 360, 1, (v) => set({ angle: v }), '°'))
    }
    if (l.kind === 'line') {
      grad()
      C.push(
        SL('Tykkelse', Math.round(l.h), 1, 200, 1, (v) => set({ h: v, y: Math.round(l.y + (l.h - v) / 2) }), 'px', { key: 'ts.lineH', lim: [1, 1080] }),
        SL('Lengde', Math.round(l.w), 10, 1920, 1, (v) => set({ w: v, x: Math.round(l.x + (l.w - v) / 2) }), 'px', { key: 'ts.lineW', lim: [2, 4000], units: [{ u: 'px', k: 1 }, { u: '%', k: 100 / W, d: 1, t: 'av bildebredden' }] }),
        CK('Runde ender', l.radius > 0, (v) => set({ radius: v ? 999 : 0 })),
        BT([{ label: 'Vannrett', on: () => set({ rot: 0 }) }, { label: 'Loddrett', on: () => set({ rot: 90 }) }]),
      )
    } else {
      if (l.kind === 'rounded') C.push(SL('Hjørner', l.radius, 0, 400, 1, (v) => set({ radius: v }), 'px'))
      grad()
      C.push(SL('Kant', l.stroke, 0, 40, 1, (v) => set({ stroke: v }), 'px'))
      if (l.stroke > 0) C.push(CO('Kantfarge', l.strokeColor, (v) => set({ strokeColor: v })))
    }
  } else {
    C.push(
      CO('Farge', l.color, (v) => set({ color: v })),
      SL('Styrke', Math.round(l.op * 100), 0, 100, 1, (v) => set({ op: v / 100 }), '%'),
      SL('Mykhet', Math.round(l.soft * 100), 0, 100, 1, (v) => set({ soft: v / 100 }), '%'),
    )
  }
  return C.concat(common(c, l, l.type === 'glow'))
}

/** Panelet når ingen lag er valgt: person, navn, tema, bakgrunn og vignett. */
export function ctrlsMal(c: ThumbController, d: Doc): Ctrl[] {
  const C: Ctrl[] = []
  const b = d.bg
  const v = d.vig
  C.push(NT('Bytt person, navn og tema her. Vil du endre noe annet, klikker du på det i bildet eller i laglisten.'))
  for (const l of d.layers) {
    if (l.role !== 'person' || l.type !== 'image') continue
    C.push(IM(c, l, 'Person'))
    if (l.src && !c.s.narrow) C.push(BT([{ label: 'Fjern tomme kanter', on: () => c.trim(l.id) }, { label: 'Beskjær …', on: () => c.openCrop(l.id) }]))
  }
  for (const l of d.layers) if (l.role === 'name' && l.type === 'text') C.push({ k: 'area', label: 'Navn', val: l.text, rows: 2, ph: 'Fornavn Etternavn', set: (t) => c.setL(l.id, { text: t }) })
  for (const l of d.layers) if (l.role === 'theme' && l.type === 'text') C.push({ k: 'area', label: 'Tema', val: l.text, rows: 2, ph: 'Tema eller overskrift', set: (t) => c.setL(l.id, { text: t }) })
  C.push(NT('Bilder i malen: {n} av 5. Logoene teller ikke.', { n: countImgs(d) }))
  C.push(HD('Bakgrunn'), SG('Type', b.type, [['color', 'Farge'], ['gradient', 'Gradient'], ['image', 'Bilde']], (x) => c.setBg({ type: x as Doc['bg']['type'] })))
  if (b.type === 'color') C.push(CO('Farge', b.color, (x) => c.setBg({ color: x })))
  else if (b.type === 'gradient') {
    C.push(CO('Farge 1', b.c1, (x) => c.setBg({ c1: x })), CO('Farge 2', b.c2, (x) => c.setBg({ c2: x })), CK('Sirkulær', b.radial, (x) => c.setBg({ radial: x })))
    if (!b.radial) C.push(SL('Vinkel', b.angle, 0, 360, 1, (x) => c.setBg({ angle: x }), '°'))
  } else {
    C.push(
      { k: 'img', label: 'Bakgrunnsbilde', src: b.src, pick: () => c.openPicker('file', { mode: 'bg' }), clear: () => c.setBg({ src: null }) },
      SL('Zoom', Math.round(b.zoom * 100), 100, 300, 1, (x) => c.setBg({ zoom: x / 100 }), '%'),
      SL('Utsnitt vannrett', Math.round(b.px * 100), 0, 100, 1, (x) => c.setBg({ px: x / 100 }), '%'),
      SL('Utsnitt loddrett', Math.round(b.py * 100), 0, 100, 1, (x) => c.setBg({ py: x / 100 }), '%'),
      SL('Uskarphet', b.blur, 0, 40, 1, (x) => c.setBg({ blur: x }), ''),
      SL('Mørklegg', Math.round(b.dim * 100), 0, 90, 1, (x) => c.setBg({ dim: x / 100 }), '%'),
    )
  }
  C.push(HD('Vignett'), CK('Vignett', v.on, (x) => c.setVig({ on: x })))
  if (v.on) {
    C.push(
      SL('Styrke', Math.round(v.amt * 100), 0, 100, 1, (x) => c.setVig({ amt: x / 100 }), '%'),
      SL('Størrelse på lyst felt', Math.round(v.size * 100), 0, 100, 1, (x) => c.setVig({ size: x / 100 }), '%'),
      CO('Farge', v.color, (x) => c.setVig({ color: x })),
      CK('Over alle lag', v.top, (x) => c.setVig({ top: x })),
    )
  }
  return C
}

export function ctrlsGroup(c: ThumbController, gl: Layer[]): Ctrl[] {
  const b = gbox(gl)
  return [
    NT('{n} lag er valgt. Dra i ett av dem for å flytte alle. Shift-klikk for å legge til eller fjerne lag.', { n: gl.length }),
    HD('Skaler sammen'),
    BT([{ label: '−10 %', on: () => c.scaleGroup(0.9) }, { label: '−5 %', on: () => c.scaleGroup(0.95) }, { label: '+5 %', on: () => c.scaleGroup(1.05) }, { label: '+10 %', on: () => c.scaleGroup(1.1) }]),
    HD('Plassering'),
    BT([{ label: 'Midtstill vannrett', on: () => c.moveGroup(Math.round(960 - (b.x + b.w / 2)), 0) }, { label: 'Midtstill loddrett', on: () => c.moveGroup(0, Math.round(540 - (b.y + b.h / 2))) }]),
    BT([{ label: 'Opphev gruppe', on: () => c.ui({ multi: [], sel: null }) }, { label: 'Slett alle', on: () => c.delGroup(), kind: 'd' }]),
  ]
}
