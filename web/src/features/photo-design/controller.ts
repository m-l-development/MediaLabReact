import { createStore, type Store } from '../../shared/lib/store'
import { snapActive } from '../../shared/lib/snap'
import { fillStops, type Fill } from '../../shared/fill/fill'
import * as FX from '../../shared/fx/fx'
import { bounds, changeFormat, snapAt, snapPrep, type Bounds, type FormatBase, type Snap } from './engine/layout'
import {
  ADJ, bleedLayers, clamp, dims, FORMATS, glowLayer, imageLayer, SHAPES, shapeLayer, targetSlot, textLayer, uid,
  type Adj, type Format, type FxLayer, type ImageLayer, type PdDoc, type PdLayer, type Scheme, type Vig,
} from './engine/model'
import { autoTone, cleanDev, DEV, type Dev, type Histogram } from './engine/develop'
import { applyScheme, schemeOfPreset, tplDoc, validScheme } from './engine/palette'
import { baseOf, cover, histOf, hit, loadImg, mk, printPDF, render, toLocal, type Media, type MediaEntry, type MaskCanvas } from './engine/render'
import type { PdEntry, PdRepo, PdStored } from './repo'
import type { Phrase, Vars } from './texts'

export type Pt = [number, number]
export interface Interaction { move(p: Pt, e: { altKey: boolean; shiftKey: boolean }): void; up(): void }
export interface Msg { p: Phrase; v?: Vars }
export type Tool = 'move' | 'crop' | 'brush'
export type Saved = { kind: 'unsaved' } | { kind: 'saved'; at: number } | null
export type PickerTarget = { replace?: string; logo?: boolean }
export type Picker = { kind: 'media' | 'cloud'; target: PickerTarget; start?: 'faste' | 'ressurser' | 'felles' | 'samarbeid' } | null

export interface PState {
  ready: boolean
  view: 'home' | 'edit'
  entries: PdEntry[]
  fmt: string
  cw: string
  ch: string
  doc: PdDoc | null
  projectId: string | null
  sel: string | null
  multi: string[]
  tool: Tool
  tab: 'layer' | 'color' | 'cut'
  brush: { size: number; mode: 'erase' | 'restore'; hard: number }
  fit: number
  zoom: number
  exp: { fmt: 'png' | 'jpg' | 'pdf'; scale: 1 | 2; t: boolean }
  expOpen: boolean
  busy: '' | 'load' | 'model' | 'run' | 'exp'
  pct: number
  toast: Msg | null
  saved: Saved
  autosave: boolean
  guides: Snap | null
  ltab: 'lag' | 'stil' | 'fx'
  fillOpen: boolean
  linkCol: boolean
  tplCat: string | null
  cats: string[]
  newCol: string | null
  dragOver: boolean
  brushXY: Pt | null
  narrow: boolean
  /** Øker ved hver endring som skal tegnes (også masker). */
  hist: number
  marq: [number, number, number, number] | null
  shapesOpen: boolean
  logoOpen: boolean
  adv: boolean
  /** Avansert framkalling er kopiert og kan limes inn. */
  devClip?: boolean
  fxCat: string
  fxQ: string
  fxN: number
  fxPal: number
  fxStr: number
  fxCk: string | null
  picker: Picker
  /** Malfargene på startsiden (null = malenes egne farger); gjelder malene som ikke har egne farger. */
  scheme: Scheme | null
  /** Farger og rekkefølge per mal (satt i editoren); beholdes når du bytter mellom maler. */
  tplSchemes: Record<string, Scheme | null>
}

export interface PDeps {
  /** Livets Ord-standardene bare for menigheter som fantes før (churches.legacy_defaults). Standard: ja. */
  legacyDefaults?: boolean
  repo: PdRepo
  /** Bilde i Dine medier: Blob for `m:<id>`. */
  openMedia(src: string): Promise<Blob | null>
  /** Legger et bilde i Dine medier. → `m:<id>`. */
  putImage(blob: Blob, name: string): Promise<string>
  /** AI-utklipp: maske (hvit + alfa) i størrelsen til `src`. null = ingen tydelig motiv. */
  cutout(src: HTMLCanvasElement, kind: 'person' | 'object', onProgress: (phase: 'model' | 'run', pct: number) => void): Promise<HTMLCanvasElement | null>
  storage: { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }
  confirm(p: Phrase, v?: Vars): boolean
  prompt(p: Phrase, def?: string): string | null
  t(p: Phrase, v?: Vars): string
  now?: () => number
}

interface Snapshot { doc: PdDoc; masks: Map<string, MaskCanvas> }

const HEX = /^#[0-9a-f]{6}$/i
const SHAPE_AR: Record<string, number> = { rect: 0.625, rounded: 0.625, arrow: 0.625, parallelogram: 0.6, trapezoid: 0.65, bubble: 0.8, half: 0.5 }
const DEFAULT_CATS = ['Søndagsmøte', 'Kveldsbibelskole', 'Ungdomsmøte']
/** «Kveldsbibelskole» er Livets Ord-standard: bare for menigheter som fantes før (churches.legacy_defaults). */
const defaultCats = (legacy: boolean | undefined) => DEFAULT_CATS.filter((c) => legacy !== false || c !== 'Kveldsbibelskole')
export const PAL = ['#ffffff', '#000000', '#111111', '#e9e7e2', '#f5b82c', '#e4411f', '#c0392b', '#1d2a3a', '#0495c0', '#2a9d8f', '#7b3fe4', '#e84393']

const parse = <T>(s: string | null, d: T): T => {
  try {
    return s == null ? d : (JSON.parse(s) as T)
  } catch {
    return d
  }
}

/** Lagrede malfarger (eldre «photodesign.palette» = en ferdig kombinasjon). */
function loadScheme(st: PDeps['storage']): Scheme | null {
  const v = parse<unknown>(st.get('photodesign.scheme'), undefined)
  if (v !== undefined) return validScheme(v) ? v : null
  const old = st.get('photodesign.palette')
  return old ? schemeOfPreset(old) : null
}

function loadTplSchemes(st: PDeps['storage']): Record<string, Scheme | null> {
  const v = parse<unknown>(st.get('photodesign.tplschemes'), null)
  const out: Record<string, Scheme | null> = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (x === null || validScheme(x)) out[k.slice(0, 40)] = x
  return out
}

/** Photo Design: tilstand og handlinger (samme oppførsel som media-lab/src/pages/photo-design/logic.js). */
export class PhotoController {
  readonly state: Store<PState>
  readonly M: Media = { media: new Map(), masks: new Map() }
  private d: PDeps
  private alive = true
  private past: Snapshot[] = []
  private future: Snapshot[] = []
  private hk: string | null = null
  private ht = 0
  dirty = false
  private svT: ReturnType<typeof setTimeout> | undefined
  private tt: ReturnType<typeof setTimeout> | undefined
  private fmtBase: FormatBase | null = null
  private savedMasks = new Map<string, string>()
  private now: () => number

  constructor(deps: PDeps) {
    this.d = deps
    this.now = deps.now ?? Date.now
    const st = deps.storage
    const cats = parse<unknown>(st.get('photodesign.cats'), null)
    const tc = st.get('photodesign.tplcat')
    this.state = createStore<PState>({
      ready: false, view: 'home', entries: [], fmt: 'sq', cw: '1200', ch: '800', doc: null, projectId: null, sel: null, multi: [], tool: 'move', tab: 'layer',
      brush: { size: 80, mode: 'erase', hard: 0.6 }, fit: 0.5, zoom: 1, exp: { fmt: 'png', scale: 1, t: false }, expOpen: false, busy: '', pct: 0, toast: null,
      saved: null, autosave: st.get('photodesign.autosave') === '1', guides: null, ltab: 'lag', fillOpen: true, linkCol: false,
      tplCat: tc && tc.length ? tc : null,
      cats: Array.isArray(cats) && cats.length ? cats.filter((x): x is string => typeof x === 'string').slice(0, 20) : defaultCats(this.d.legacyDefaults),
      newCol: st.get('photodesign.newcol') || null, dragOver: false, brushXY: null, narrow: false, hist: 0, marq: null, shapesOpen: false, logoOpen: false,
      adv: FX.isAdvanced(), fxCat: 'all', fxQ: '', fxN: 24, fxPal: 0, fxStr: 1, fxCk: null, picker: null,
      scheme: loadScheme(st), tplSchemes: loadTplSchemes(st),
    })
  }

  get s(): PState {
    return this.state.get()
  }

  set(p: Partial<PState> | ((s: PState) => Partial<PState> | null)): void {
    this.state.set((s) => {
      const patch = typeof p === 'function' ? p(s) : p
      return patch ? { ...s, ...patch } : s
    })
  }

  dispose(): void {
    this.alive = false
    clearTimeout(this.svT)
    clearTimeout(this.tt)
    for (const e of this.M.media.values()) URL.revokeObjectURL(e.url)
  }

  flash(p: Phrase, v?: Vars): void {
    this.set({ toast: v ? { p, v } : { p } })
    clearTimeout(this.tt)
    this.tt = setTimeout(() => this.alive && this.set({ toast: null }), 2600)
  }

  // ---------- prosjekter ----------

  async refresh(): Promise<void> {
    try {
      const entries = await this.d.repo.list()
      if (this.alive) this.set({ entries, ready: true })
    } catch {
      if (this.alive) this.set({ ready: true })
    }
  }

  fmtWH(): [number, number] {
    const S = this.s
    const f = FORMATS.find((x) => x.k === S.fmt)
    return f ? [f.w, f.h] : [Math.round(Math.min(8000, Math.max(64, +S.cw || 1200))), Math.round(Math.min(8000, Math.max(64, +S.ch || 800)))]
  }

  /** Malfargene på startsiden (forhåndsvisningene tegnes på nytt med en gang). */
  setScheme(sc: Scheme | null): void {
    this.d.storage.set('photodesign.scheme', JSON.stringify(sc))
    this.set({ scheme: sc })
  }

  /** Fargene en mal får: dens egne (satt i editoren), ellers fargene på startsiden. */
  schemeFor(tpl: string): Scheme | null {
    const t = this.s.tplSchemes
    return Object.prototype.hasOwnProperty.call(t, tpl) ? (t[tpl] ?? null) : this.s.scheme
  }

  /** Malen bruker fargene på startsiden igjen (glemmer dens egne). */
  forgetTplScheme(tpl: string): void {
    const t = { ...this.s.tplSchemes }
    delete t[tpl]
    this.d.storage.set('photodesign.tplschemes', JSON.stringify(t))
    this.set({ tplSchemes: t })
  }

  /** Farger i det åpne prosjektet (lagres med prosjektet, kan angres) – og huskes for malen det er laget fra. */
  setDocScheme(sc: Scheme | null): void {
    const d = this.s.doc
    if (!d) return
    this.setDoc((x) => applyScheme(x, sc), 'scheme')
    if (d.tplK && d.tplK !== 'blank') {
      const t = { ...this.s.tplSchemes, [d.tplK]: sc }
      this.d.storage.set('photodesign.tplschemes', JSON.stringify(t))
      this.set({ tplSchemes: t })
    }
  }

  create(tpl: string): void {
    const [w, h] = this.fmtWH()
    const d = tplDoc(w, h, tpl, this.schemeFor(tpl), this.now())
    const f = FORMATS.find((x) => x.k === this.s.fmt)
    d.name = tpl === 'card2' ? this.d.t('Visittkort') : this.d.t((f ? f.l : 'Egendefinert') as Phrase)
    this.M.media.clear()
    this.M.masks.clear()
    this.openDoc(d, null, true)
  }

  private async loadMedia(doc: PdDoc, masks: Record<string, string>) {
    for (const L of [...doc.layers, ...(doc.back?.layers ?? [])]) {
      if (L.type !== 'image') continue
      if (L.src && !this.M.media.has(L.src)) {
        try {
          const b = await this.d.openMedia(L.src)
          if (b) this.M.media.set(L.src, await loadImg(b))
        } catch {
          // et bilde som mangler, vises som tom bildeplass
        }
      }
      const data = L.mask ? masks[L.mask] : undefined
      if (L.mask && data) {
        try {
          const E = await loadImg(await (await fetch(data)).blob())
          const c = mk(E.w, E.h)
          c.getContext('2d')?.drawImage(E.img, 0, 0)
          this.M.masks.set(L.id, { c, v: 1 })
          this.savedMasks.set(L.mask, data)
          URL.revokeObjectURL(E.url)
        } catch {
          // masken kunne ikke leses
        }
      }
    }
  }

  async open(id: string): Promise<void> {
    this.set({ busy: 'load' })
    try {
      const s = await this.d.repo.open(id)
      this.M.media.clear()
      this.M.masks.clear()
      this.savedMasks.clear()
      await this.loadMedia(s.doc, s.masks)
      if (!this.alive) return
      this.set({ busy: '' })
      if (s.tpl) {
        // Mal: åpnes som et nytt prosjekt (malen endres ikke)
        const d: PdDoc = { ...s.doc, id: uid('p'), updated: this.now() }
        this.openDoc(d, null, false)
        this.queueSave()
      } else this.openDoc(s.doc, id, false)
    } catch {
      if (this.alive) {
        this.set({ busy: '' })
        this.flash('Prosjektet kunne ikke åpnes.')
      }
    }
  }

  openDoc(doc: PdDoc, projectId: string | null, isNew: boolean): void {
    this.past = []
    this.future = []
    this.hk = null
    this.dirty = isNew
    this.fmtBase = null
    this.set({ view: 'edit', doc, projectId, sel: null, multi: [], tool: 'move', tab: 'layer', zoom: 1, expOpen: false, saved: isNew && !this.s.autosave ? { kind: 'unsaved' } : null, hist: 0 })
    if (isNew && this.s.autosave) void this.saveNow()
  }

  async leave(): Promise<void> {
    if (this.svT) {
      clearTimeout(this.svT)
      this.svT = undefined
      await this.saveNow()
    } else if (this.dirty && this.d.confirm('Du har endringer som ikke er lagret. Vil du lagre dem før du går tilbake?')) await this.saveNow()
    this.dirty = false
    this.set({ view: 'home', doc: null, projectId: null, sel: null, multi: [], expOpen: false })
    void this.refresh()
  }

  async delProject(e: PdEntry): Promise<void> {
    if (!this.d.confirm(e.tpl ? 'Slette malen?\n{name}' : 'Slette prosjektet?\n{name}', { name: e.name })) return
    try {
      await this.d.repo.remove(e.id)
    } catch {
      // allerede borte
    }
    void this.refresh()
  }

  /** Maskene som PNG-er (bare de som er endret, gjøres om på nytt). */
  private async masksOf(d: PdDoc): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const L of [...d.layers, ...(d.back?.layers ?? [])]) {
      if (L.type !== 'image' || !L.mask) continue
      let data = this.savedMasks.get(L.mask)
      const c = this.M.masks.get(L.id)
      if (!data && c) {
        data = c.c.toDataURL('image/png')
        this.savedMasks.set(L.mask, data)
      }
      if (data) out[L.mask] = data
    }
    return out
  }

  private thumbOf(d: PdDoc): string {
    const tw = 360
    const sc = tw / Math.max(d.w, d.h)
    const tc = mk(d.w * sc, d.h * sc)
    const g = tc.getContext('2d')
    if (g) render(g, d, sc, this.M, { preview: 600, noPh: false, phText: this.d.t('Dra inn et bilde') })
    return tc.toDataURL('image/jpeg', 0.8)
  }

  async saveNow(): Promise<void> {
    const d = this.s.doc
    if (!d) return
    clearTimeout(this.svT)
    this.svT = undefined
    try {
      const doc: PdDoc = { ...d, updated: this.now() }
      const stored: PdStored = { doc, masks: await this.masksOf(doc), thumb: this.thumbOf(doc), tpl: null }
      const id = await this.d.repo.save(this.s.projectId, stored)
      this.dirty = false
      if (this.alive) this.set({ projectId: id, saved: { kind: 'saved', at: this.now() } })
    } catch {
      this.flash('Kunne ikke lagre. Nettleseren kan være full.')
    }
  }

  queueSave(): void {
    this.dirty = true
    if (!this.s.autosave) {
      if (this.s.saved?.kind !== 'unsaved') this.set({ saved: { kind: 'unsaved' } })
      return
    }
    clearTimeout(this.svT)
    this.svT = setTimeout(() => {
      this.svT = undefined
      void this.saveNow()
    }, 900)
  }

  toggleAutosave(): void {
    const on = !this.s.autosave
    this.d.storage.set('photodesign.autosave', on ? '1' : '0')
    this.set({ autosave: on })
    if (on && this.dirty) void this.saveNow()
    this.flash(on ? 'Autolagring er på.' : 'Autolagring er av. Husk å lagre.')
  }

  // ---------- maler ----------

  catNow(): string {
    const S = this.s
    return S.tplCat && S.cats.includes(S.tplCat) ? S.tplCat : (S.cats[0] ?? defaultCats(this.d.legacyDefaults)[0] as string)
  }

  setTplCat(c: string): void {
    this.d.storage.set('photodesign.tplcat', c)
    this.set({ tplCat: c })
  }

  private saveCats(c: string[]) {
    this.d.storage.set('photodesign.cats', JSON.stringify(c))
    this.d.storage.set('photodesign.tplcat', c[c.length - 1] ?? '')
    this.set({ cats: c, tplCat: c[c.length - 1] ?? null })
  }

  newCat(): void {
    const v = (this.d.prompt('Navn på kategorien') ?? '').trim().slice(0, 40)
    if (!v) return
    if (this.s.cats.includes(v)) {
      this.set({ tplCat: v })
      this.flash('Kategorien er allerede lagret.')
      return
    }
    this.saveCats([...this.s.cats, v].slice(0, 20))
    this.flash('Kategorien er opprettet.')
  }

  async saveTpl(): Promise<void> {
    const d = this.s.doc
    if (!d) return
    const cat = this.catNow()
    if (this.s.entries.filter((p) => p.tpl && p.cat === cat).length >= 5) {
      this.flash('Maks 5 maler per kategori. Slett en mal først.')
      return
    }
    const nm = (this.d.prompt('Navn på malen', d.name || '') ?? '').trim().slice(0, 60)
    if (!nm) return
    await this.saveNow()
    try {
      const doc: PdDoc = { ...structuredClone(d), id: uid('p'), name: nm, updated: this.now() }
      await this.d.repo.save(null, { doc, masks: await this.masksOf(d), thumb: this.thumbOf(d), tpl: { cat } })
      this.flash('Malen er lagret.')
      void this.refresh()
    } catch {
      this.flash('Kunne ikke lagre. Nettleseren kan være full.')
    }
  }

  // ---------- historikk ----------

  private snap(): Snapshot {
    return { doc: this.s.doc as PdDoc, masks: new Map(this.M.masks) }
  }

  push(key?: string): void {
    const t = this.now()
    if (key && this.hk === key && t - this.ht < 900) {
      this.ht = t
      return
    }
    this.hk = key ?? null
    this.ht = t
    if (!this.s.doc) return
    this.past.push(this.snap())
    if (this.past.length > 60) this.past.shift()
    this.future = []
  }

  setDoc(fn: (d: PdDoc) => PdDoc, key?: string | false): void {
    if (!this.s.doc) return
    if (key !== false) this.push(key)
    this.set((s) => (s.doc ? { doc: { ...fn(s.doc), updated: this.now() }, hist: s.hist + 1 } : null))
    this.queueSave()
  }

  patchL(id: string, o: Partial<PdLayer> | ((L: PdLayer) => Partial<PdLayer>), key?: string): void {
    this.setDoc((d) => ({ ...d, layers: d.layers.map((L) => (L.id === id ? ({ ...L, ...(typeof o === 'function' ? o(L) : o) } as PdLayer) : L)) }), key)
  }

  private restore(sn: Snapshot) {
    this.M.masks = sn.masks
    this.set((s) => ({ doc: sn.doc, sel: sn.doc.layers.some((L) => L.id === s.sel) ? s.sel : null, hist: s.hist + 1 }))
    this.queueSave()
  }

  undo(): void {
    const p = this.past.pop()
    if (!p) return
    this.future.push(this.snap())
    this.restore(p)
    this.hk = null
  }

  redo(): void {
    const f = this.future.pop()
    if (!f) return
    this.past.push(this.snap())
    this.restore(f)
    this.hk = null
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  selL(): PdLayer | null {
    const d = this.s.doc
    return (d && d.layers.find((L) => L.id === this.s.sel)) || null
  }

  // ---------- lag ----------

  addLayer(L: PdLayer): void {
    this.setDoc((d) => ({ ...d, layers: [...d.layers, L] }))
    this.set({ sel: L.id, multi: [], tool: 'move', tab: 'layer' })
  }

  addText(): void {
    const d = this.s.doc
    if (!d) return
    const m = Math.min(d.w, d.h)
    this.addLayer(textLayer({ x: d.w / 2, y: d.h / 2, size: Math.round(m * 0.08), color: this.s.newCol || (d.bg && /^#(f|e|d)/i.test(d.bg) ? '#111111' : '#ffffff') }))
  }

  addShape(kind: string): void {
    const d = this.s.doc
    if (!d) return
    const m = Math.min(d.w, d.h)
    const rounded = kind === 'rounded'
    const k = rounded ? 'rect' : kind
    const ar = SHAPE_AR[kind] ?? 1
    const nm = rounded ? 'Avrundet rektangel' : (SHAPES.find((x) => x[0] === kind)?.[1] ?? 'Form')
    this.addLayer(shapeLayer({ kind: k, name: this.d.t(nm as Phrase), x: d.w / 2, y: d.h / 2, w: m * 0.4, h: kind === 'line' ? Math.max(4, m * 0.012) : m * 0.4 * ar, ...(rounded ? { radius: Math.round(m * 0.04) } : {}), ...(this.s.newCol ? { fill: this.s.newCol } : {}) }))
  }

  addGrad(): void {
    const d = this.s.doc
    if (!d) return
    this.addLayer(shapeLayer({ name: this.d.t('Toning'), kind: 'rect', x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, fill: 'rgba(0,0,0,0)', fill2: this.s.newCol || '#000000', gAng: 180 }))
  }

  addGlow(): void {
    const d = this.s.doc
    if (!d) return
    const m = Math.min(d.w, d.h)
    this.addLayer(glowLayer({ name: this.d.t('Lys'), x: d.w / 2, y: d.h / 2, w: m * 0.9, h: m * 0.9, color: this.s.newCol || '#f5b82c' }))
  }

  /** Farge på et lag; med «Koblede farger» endres alle lag (og bakgrunnen) med samme farge. */
  setCol(L: PdLayer | null, key: string, v: string, hk?: string): void {
    if (!L) return
    const old = String((L as unknown as Record<string, unknown>)[key] ?? '').toLowerCase()
    if (this.s.linkCol && HEX.test(old)) {
      const K = ['color', 'fill', 'fill2', 'strokeC', 'barColor', 'tint']
      this.setDoc((d) => ({
        ...d,
        bg: String(d.bg ?? '').toLowerCase() === old ? v : d.bg,
        bg2: String(d.bg2 ?? '').toLowerCase() === old ? v : (d.bg2 ?? null),
        layers: d.layers.map((q) => {
          const o: Record<string, string> = {}
          const r = q as unknown as Record<string, unknown>
          for (const k of K) if (String(r[k] ?? '').toLowerCase() === old) o[k] = v
          return Object.keys(o).length ? ({ ...q, ...o } as PdLayer) : q
        }),
      }), hk)
    } else this.patchL(L.id, { [key]: v } as Partial<PdLayer>, hk)
  }

  setNewCol(v: string | null): void {
    if (v) this.d.storage.set('photodesign.newcol', v)
    else this.d.storage.remove('photodesign.newcol')
    this.set({ newCol: v })
  }

  setVig(o: Partial<Vig>, k?: string): void {
    this.setDoc((q) => ({ ...q, vig: { on: false, amt: 0.6, size: 0.55, color: '#000000', top: false, ...(q.vig ?? {}), ...o } }), k)
  }

  async trimEdges(): Promise<void> {
    const L = this.selL()
    if (!L || L.type !== 'image' || !L.src) return
    const E = this.M.media.get(L.src)
    if (!E) return
    const c = mk(E.w, E.h)
    const g = c.getContext('2d', { willReadFrequently: true })
    if (!g) return
    g.drawImage(E.img, 0, 0)
    const mc = this.M.masks.get(L.id)
    if (mc) {
      g.globalCompositeOperation = 'destination-in'
      g.drawImage(mc.c, 0, 0, E.w, E.h)
    }
    let px: Uint8ClampedArray
    try {
      px = g.getImageData(0, 0, E.w, E.h).data
    } catch {
      this.flash('Bildet kunne ikke leses.')
      return
    }
    let x0 = E.w
    let y0 = E.h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < E.h; y++) {
      const r = y * E.w * 4
      for (let x = 0; x < E.w; x++) {
        if ((px[r + x * 4 + 3] ?? 0) > 8) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          y1 = y
        }
      }
    }
    if (x1 < 0) {
      this.flash('Bildet er helt gjennomsiktig.')
      return
    }
    const bw = x1 - x0 + 1
    const bh = y1 - y0 + 1
    if (bw >= E.w - 1 && bh >= E.h - 1) {
      this.flash('Bildet har ingen tomme kanter.')
      return
    }
    const o = mk(bw, bh)
    o.getContext('2d')?.drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh)
    const blob = await new Promise<Blob | null>((r) => o.toBlob(r, 'image/png'))
    if (!blob) return
    const src = await this.d.putImage(blob, `${L.name || 'bilde'}-beskåret.png`)
    this.M.media.set(src, await loadImg(blob))
    const s = Math.max(L.w / E.w, L.h / E.h) * (L.cz || 1)
    const vw = L.w / s
    const vh = L.h / s
    const mx = (E.w - vw) / 2
    const my = (E.h - vh) / 2
    const cl = (v: number) => Math.max(-1, Math.min(1, v || 0))
    const csx = mx + cl(L.cx) * mx + vw / 2
    const csy = my + cl(L.cy) * my + vh / 2
    const ox = (x0 + bw / 2 - csx) * s * (L.flipX ? -1 : 1)
    const oy = (y0 + bh / 2 - csy) * s * (L.flipY ? -1 : 1)
    const a = ((L.rot || 0) * Math.PI) / 180
    const rx = ox * Math.cos(a) - oy * Math.sin(a)
    const ry = ox * Math.sin(a) + oy * Math.cos(a)
    this.M.masks.delete(L.id)
    this.patchL(L.id, { src, mask: null, w: bw * s, h: bh * s, x: L.x + rx, y: L.y + ry, cz: 1, cx: 0, cy: 0 })
    this.flash('Tomme kanter er fjernet.')
  }

  showWhole(): void {
    const L = this.selL()
    const E = L?.type === 'image' && L.src ? this.M.media.get(L.src) : undefined
    if (!L || L.type !== 'image' || !E) return
    const k = Math.max(L.w, L.h) / Math.max(E.w, E.h)
    this.patchL(L.id, { w: E.w * k, h: E.h * k, cz: 1, cx: 0, cy: 0 })
  }

  /**
   * Et nytt bilde (fil, utklippstavle, Dine medier eller Fellesmappe). Legges inn i bildeplassen under punktet,
   * i en valgt tom bildeplass, ellers i malens første tomme bildeplass (uten at noe er valgt), og først når det ikke
   * finnes noen, som nytt lag. Før ble bildet alltid et nytt lag øverst når bildeplassen ikke var valgt: det dekket
   * malens tekst, og bildeplassen ble stående tom. `src` = allerede lagret i Dine medier. En logo (`opt.logo`, fra
   * «Logo → Fellesmappe») blir alltid et eget lag – den fyller aldri malens bildeplass (targetSlot).
   */
  async addBlob(blob: Blob, name: string, at: Pt | null = null, src?: string, replace?: string, opt: { logo?: boolean } = {}): Promise<void> {
    const d = this.s.doc
    if (!d) return
    const sel0 = this.s.sel // valget da bildet ble valgt; lasting og lagring tar tid
    if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type || '')) {
      this.flash('Bruk PNG, JPG, WebP eller GIF.')
      return
    }
    if (blob.size > 60e6) {
      this.flash('Bildet er for stort (maks 60 MB).')
      return
    }
    let E: MediaEntry
    try {
      E = await loadImg(blob)
    } catch {
      this.flash('Bildet kunne ikke leses.')
      return
    }
    const key = src ?? (await this.d.putImage(blob, name || 'bilde'))
    this.M.media.set(key, E)
    const doc = this.s.doc
    if (!doc) return
    const rep = replace ? doc.layers.find((q) => q.id === replace) : undefined
    const ph = targetSlot(doc, { replace: rep, at: !!at, hit: at ? hit(doc, at[0], at[1]) : null, sel: this.selL(), ...(opt.logo ? { logo: true } : {}) })
    const nm = String(name || this.d.t('Bilde')).replace(/\.[a-z0-9]+$/i, '').slice(0, 40)
    if (ph && ph.type === 'image') {
      this.patchL(ph.id, { src: key, cz: 1, cx: 0, cy: 0, name: ph.src ? ph.name : nm, mask: null })
      this.M.masks.delete(ph.id)
      // har brukeren valgt et annet lag mens bildet ble behandlet, beholdes det valget (før forsvant f.eks. tekstfeltet)
      if (this.s.sel === sel0) this.set({ sel: ph.id })
      return
    }
    const s = Math.min((doc.w * 0.8) / E.w, (doc.h * 0.8) / E.h, 1e9)
    this.addLayer(imageLayer({ name: nm, src: key, x: at ? at[0] : doc.w / 2, y: at ? at[1] : doc.h / 2, w: E.w * s, h: E.h * s }))
  }

  /** Et bilde som deles inn når ingen prosjekt er åpent: lag et tomt prosjekt først. */
  receive(blob: Blob, name: string): void {
    if (this.s.view === 'edit') void this.addBlob(blob, name)
    else {
      this.create('blank')
      setTimeout(() => void this.addBlob(blob, name), 60)
    }
  }

  openPicker(kind: 'media' | 'cloud', target: PickerTarget = {}, start?: 'faste' | 'ressurser' | 'felles' | 'samarbeid'): void {
    this.set({ picker: { kind, target, ...(start ? { start } : {}) }, logoOpen: false })
  }

  closePicker(): void {
    this.set({ picker: null })
  }

  private copyOf(L: PdLayer): PdLayer {
    const n = { ...structuredClone(L), id: uid(L.type[0]), name: `${L.name} ${this.d.t('kopi')}`, x: L.x + 30, y: L.y + 30, grp: null } as PdLayer
    const m = this.M.masks.get(L.id)
    if (m && n.type === 'image') {
      const c = mk(m.c.width, m.c.height)
      c.getContext('2d')?.drawImage(m.c, 0, 0)
      this.M.masks.set(n.id, { c, v: 1 })
      n.mask = uid('k')
    }
    return n
  }

  dup(): void {
    const ids = this.selIds()
    if (!ids.length) return
    if (ids.length === 1) {
      const L = this.selL()
      if (L) this.addLayer(this.copyOf(L))
      return
    }
    const set = new Set(ids)
    const gm: Record<string, string> = {}
    const out = (this.s.doc?.layers ?? []).filter((L) => set.has(L.id)).map((L) => {
      const n = this.copyOf(L)
      if (L.grp) n.grp = gm[L.grp] ?? (gm[L.grp] = uid('g'))
      return n
    })
    this.setDoc((d) => ({ ...d, layers: [...d.layers, ...out] }))
    this.setSel(out.map((n) => n.id))
  }

  del(): void {
    const ids = new Set(this.selIds())
    if (!ids.size) return
    this.setDoc((d) => ({ ...d, layers: d.layers.filter((L) => !ids.has(L.id)) }))
    this.set({ sel: null, multi: [], tool: 'move' })
  }

  delLayer(id: string): void {
    this.setDoc((dd) => ({ ...dd, layers: dd.layers.filter((x) => x.id !== id) }))
    if (this.s.sel === id) this.set({ sel: null, multi: [], tool: 'move' })
  }

  /** Dra et lag i laglisten oppå et annet. */
  reorder(from: string, to: string): void {
    if (from === to) return
    this.setDoc((dd) => {
      const a = dd.layers.slice()
      const fi = a.findIndex((x) => x.id === from)
      if (fi < 0) return dd
      const [m] = a.splice(fi, 1)
      const ti = a.findIndex((x) => x.id === to)
      if (m) a.splice(ti + 1, 0, m)
      return { ...dd, layers: a }
    })
  }

  move(id: string, dir: 1 | -1): void {
    this.setDoc((d) => {
      const a = d.layers.slice()
      const i = a.findIndex((L) => L.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= a.length) return d
      const t = a[i] as PdLayer
      a[i] = a[j] as PdLayer
      a[j] = t
      return { ...d, layers: a }
    })
  }

  // ---------- flervalg og grupper ----------

  selIds(): string[] {
    const S = this.s
    if (S.sel) return [S.sel]
    const d = S.doc
    if (!d || S.multi.length < 2) return []
    const has = new Set(d.layers.map((L) => L.id))
    const m = S.multi.filter((id) => has.has(id))
    return m.length > 1 ? m : []
  }

  setSel(ids: string[]): void {
    const u = [...new Set(ids)]
    this.set({ sel: u.length === 1 ? (u[0] ?? null) : null, multi: u.length > 1 ? u : [], tool: 'move' })
  }

  grpOf(L: PdLayer): string[] {
    return L.grp ? (this.s.doc?.layers ?? []).filter((q) => q.grp === L.grp && !q.locked && !q.hidden).map((q) => q.id) : [L.id]
  }

  group(): void {
    const ids = this.selIds()
    if (ids.length < 2) return
    const g = uid('g')
    const set = new Set(ids)
    this.setDoc((d) => ({ ...d, layers: d.layers.map((L) => (set.has(L.id) ? { ...L, grp: g } : L)) }))
    this.flash('Lagene er gruppert. De flyttes og skaleres nå sammen.')
  }

  ungroup(): void {
    const d = this.s.doc
    if (!d) return
    const sel = this.selIds()
    const gs = new Set(d.layers.filter((L) => sel.includes(L.id) && L.grp).map((L) => L.grp))
    if (!gs.size) return
    this.setDoc((q) => ({ ...q, layers: q.layers.map((L) => (gs.has(L.grp) ? { ...L, grp: null } : L)) }))
    this.flash('Gruppen er delt opp.')
  }

  centerSel(): void {
    const d = this.s.doc
    if (!d) return
    const set = new Set(this.selIds())
    const b = bounds(d.layers.filter((L) => set.has(L.id)))
    const dx = d.w / 2 - (b.x0 + b.x1) / 2
    const dy = d.h / 2 - (b.y0 + b.y1) / 2
    this.setDoc((q) => ({ ...q, layers: q.layers.map((L) => (set.has(L.id) && !L.locked ? { ...L, x: L.x + dx, y: L.y + dy } : L)) }))
  }

  nudge(dx: number, dy: number): void {
    const set = new Set(this.selIds())
    this.setDoc((d) => ({ ...d, layers: d.layers.map((q) => (set.has(q.id) && !q.locked ? { ...q, x: q.x + dx, y: q.y + dy } : q)) }), 'nudge')
  }

  selectAll(): void {
    this.setSel((this.s.doc?.layers ?? []).filter((q) => !q.locked && !q.hidden).map((q) => q.id))
  }

  /** Klikk i laglisten (Shift/Ctrl = legg til eller fjern). */
  clickLayer(id: string, add: boolean): void {
    if (add) {
      const cur = this.selIds()
      this.setSel(cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id])
    } else this.setSel([id])
  }

  // ---------- scene: dra, ramme, skaler ----------

  sc(): number {
    return this.s.fit * this.s.zoom
  }

  setFit(f: number): void {
    if (Math.abs(f - this.s.fit) > 1e-4) this.set({ fit: f })
  }

  private marquee(p0: Pt, base: string[], onClick?: () => void): Interaction {
    let moved = false
    return {
      move: (p) => {
        if (!moved && Math.hypot(p[0] - p0[0], p[1] - p0[1]) < 4 / this.sc()) return
        moved = true
        this.set({ marq: [p0[0], p0[1], p[0], p[1]] })
      },
      up: () => {
        const m = this.s.marq
        this.set({ marq: null })
        if (!moved || !m) {
          if (onClick) onClick()
          else this.setSel(base)
          return
        }
        const x0 = Math.min(m[0], m[2])
        const x1 = Math.max(m[0], m[2])
        const y0 = Math.min(m[1], m[3])
        const y1 = Math.max(m[1], m[3])
        const ids = base.slice()
        for (const L of this.s.doc?.layers ?? []) {
          if (L.locked || L.hidden) continue
          const b = bounds([L])
          if (b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1) ids.push(...this.grpOf(L))
        }
        this.setSel(ids)
      },
    }
  }

  private dragMany(ids: string[], p0: Pt): Interaction | null {
    const d = this.s.doc
    if (!d) return null
    const set = new Set(ids)
    const orig = new Map<string, Pt>()
    for (const L of d.layers) if (set.has(L.id) && !L.locked) orig.set(L.id, [L.x, L.y])
    if (!orig.size) return null
    const b0 = bounds(d.layers.filter((L) => orig.has(L.id)))
    const P = snapPrep(d, [...orig.keys()])
    let moved = false
    return {
      move: (p, ev) => {
        let dx = p[0] - p0[0]
        let dy = p[1] - p0[1]
        if (!moved && Math.hypot(dx, dy) < 2 / this.sc()) return
        if (!moved) {
          moved = true
          this.push()
        }
        const sn = snapAt(d, P, { x0: b0.x0 + dx, x1: b0.x1 + dx, y0: b0.y0 + dy, y1: b0.y1 + dy }, 7 / this.sc(), 2 / this.sc(), !snapActive(ev.altKey))
        dx += sn.dx
        dy += sn.dy
        this.set((s) => (s.doc ? {
          doc: { ...s.doc, layers: s.doc.layers.map((q) => {
            const o = orig.get(q.id)
            return o ? { ...q, x: Math.round((o[0] + dx) * 10) / 10, y: Math.round((o[1] + dy) * 10) / 10 } : q
          }) },
          guides: sn,
          hist: s.hist + 1,
        } : null))
      },
      up: () => {
        this.set({ guides: null })
        if (moved) this.queueSave()
      },
    }
  }

  /** Trykk utenfor dokumentet: ramme for å velge (eller fjern valget). */
  stageDown(p: Pt, add: boolean, touch: boolean): Interaction | null {
    if (!this.s.doc) return null
    this.set({ expOpen: false })
    if (touch) {
      this.setSel([])
      return null
    }
    return this.marquee(p, add ? this.selIds() : [])
  }

  /** Trykk i dokumentet: pensel, utsnitt, velg/flytt eller ramme. */
  wrapDown(p: Pt, add: boolean, alt: boolean): Interaction | null {
    const S = this.s
    const d = S.doc
    if (!d) return null
    this.set({ expOpen: false })
    const sl = this.selL()
    if (S.tool === 'brush' && sl?.type === 'image' && sl.src) return this.brushStart(sl, p, alt)
    if (S.tool === 'crop' && sl?.type === 'image' && sl.src) {
      const lp = toLocal(sl, p[0], p[1])
      if (Math.abs(lp[0]) <= sl.w / 2 && Math.abs(lp[1]) <= sl.h / 2) return this.cropDrag(sl, p)
    }
    let L = hit(d, p[0], p[1])
    if (L?.locked) L = null
    const cur = this.selIds()
    if (!L) return this.marquee(p, add ? cur : [])
    const g = this.grpOf(L)
    const inSel = g.every((id) => cur.includes(id))
    if (add) return this.marquee(p, cur, () => this.setSel(inSel ? cur.filter((id) => !g.includes(id)) : [...cur, ...g]))
    const ids = inSel && cur.length > 1 ? cur : g
    if (ids.length === 1) {
      if (L.id !== S.sel) this.setSel([L.id])
      return this.dragMany([L.id], p)
    }
    this.setSel(ids)
    return this.dragMany(ids, p)
  }

  /** Effektlaget dras i markøren sin. */
  fxPinDown(id: string, p: Pt): Interaction | null {
    if (id !== this.s.sel) this.set({ sel: id, multi: [], tool: 'move', tab: 'layer' })
    return this.dragMany([id], p)
  }

  /** Håndtak: hjørne (skaler), side (bredde/høyde) eller rotasjon. */
  handleDown(kind: 'corner' | 'edgeX' | 'edgeY' | 'rot', sx: number, sy: number): Interaction | null {
    const L = this.selL()
    if (!L) return null
    this.push()
    const dm = dims(L)
    const w0 = dm.w
    const h0 = dm.h
    const a = ((L.rot || 0) * Math.PI) / 180
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const rot = (x: number, y: number): Pt => [x * ca - y * sa, x * sa + y * ca]
    const fixW = rot((-sx * w0) / 2, (-sy * h0) / 2)
    const O: Pt = [L.x + fixW[0], L.y + fixW[1]]
    const size0 = L.type === 'text' ? L.size : 0
    return {
      move: (p, ev) => {
        let o: Partial<PdLayer> & Record<string, number>
        if (kind === 'rot') {
          let ang = (Math.atan2(p[1] - L.y, p[0] - L.x) * 180) / Math.PI + 90
          ang = (((ang % 360) + 540) % 360) - 180
          const sn = Math.round(ang / 15) * 15
          if (ev.shiftKey || Math.abs(ang - sn) < 3) ang = sn
          o = { rot: Math.round(ang * 10) / 10 }
        } else {
          const lx = (p[0] - O[0]) * ca + (p[1] - O[1]) * sa
          const ly = -(p[0] - O[0]) * sa + (p[1] - O[1]) * ca
          let nw = kind === 'edgeY' ? w0 : Math.max(8, lx * sx)
          let nh = kind === 'edgeX' ? h0 : Math.max(8, ly * sy)
          if (kind === 'corner' && (L.type === 'text' || (L.type === 'image' ? !ev.shiftKey : ev.shiftKey))) {
            const f = Math.max(nw / w0, nh / h0)
            nw = w0 * f
            nh = h0 * f
          }
          const c2 = rot(kind === 'edgeY' ? 0 : (sx * nw) / 2, kind === 'edgeX' ? 0 : (sy * nh) / 2)
          const C: Pt = [O[0] + c2[0], O[1] + c2[1]]
          const st = (v: number) => Math.max(0.05, Math.min(20, v))
          if (L.type !== 'text') o = { w: nw, h: nh, x: C[0], y: C[1] }
          else if (kind === 'edgeX') o = { tsx: st(((L.tsx || 1) * nw) / w0), x: C[0], y: C[1] }
          else if (kind === 'edgeY') o = { tsy: st(((L.tsy || 1) * nh) / h0), x: C[0], y: C[1] }
          else o = { size: Math.max(6, Math.round(((size0 * nw) / w0) * 10) / 10), x: C[0], y: C[1] }
        }
        this.set((s) => (s.doc ? { doc: { ...s.doc, layers: s.doc.layers.map((q) => (q.id === L.id ? ({ ...q, ...o } as PdLayer) : q)) }, hist: s.hist + 1 } : null))
      },
      up: () => this.queueSave(),
    }
  }

  /** Skalerer alle valgte lag likt ut fra motsatt hjørne (hjørne) eller strekker dem (side). */
  groupScaleDown(sx: number, sy: number): Interaction | null {
    const d = this.s.doc
    if (!d) return null
    const set = new Set(this.selIds())
    const Ls = d.layers.filter((L) => set.has(L.id) && !L.locked)
    if (!Ls.length) return null
    this.push()
    const b = bounds(Ls)
    const O: Pt = [sx < 0 ? b.x1 : sx > 0 ? b.x0 : (b.x0 + b.x1) / 2, sy < 0 ? b.y1 : sy > 0 ? b.y0 : (b.y0 + b.y1) / 2]
    const bw = Math.max(1, b.x1 - b.x0)
    const bh = Math.max(1, b.y1 - b.y0)
    const orig = new Map(Ls.map((L) => [L.id, L]))
    const K = ['size', 'w', 'h', 'strokeW', 'radius', 'ls', 'barH']
    const uni = !!(sx && sy)
    return {
      move: (p) => {
        const rx = Math.max(0.02, ((p[0] - O[0]) * sx) / bw)
        const ry = Math.max(0.02, ((p[1] - O[1]) * sy) / bh)
        const fx = uni ? Math.max(rx, ry) : sx ? rx : 1
        const fy = uni ? fx : sy ? ry : 1
        this.set((s) => (s.doc ? {
          doc: { ...s.doc, layers: s.doc.layers.map((q) => {
            const L = orig.get(q.id)
            if (!L) return q
            const src = L as unknown as Record<string, unknown>
            const o: Record<string, number> = { x: O[0] + (L.x - O[0]) * fx, y: O[1] + (L.y - O[1]) * fy }
            if (uni) {
              for (const k of K) if (typeof src[k] === 'number') o[k] = (src[k] as number) * fx
            } else {
              const a = ((L.rot || 0) * Math.PI) / 180
              const c = Math.cos(a)
              const n = Math.sin(a)
              const ku = Math.hypot(fx * c, fy * n)
              const kv = Math.hypot(fx * n, fy * c)
              if (L.type === 'text') {
                o.tsx = Math.min(20, (L.tsx || 1) * ku)
                o.tsy = Math.min(20, (L.tsy || 1) * kv)
              } else {
                o.w = L.w * ku
                o.h = L.h * kv
              }
            }
            return { ...q, ...o } as PdLayer
          }) },
          hist: s.hist + 1,
        } : null))
      },
      up: () => this.queueSave(),
    }
  }

  private cropDrag(L: ImageLayer, p0: Pt): Interaction | null {
    const E = L.src ? this.M.media.get(L.src) : undefined
    if (!E) return null
    const r = cover(E.w, E.h, L.w, L.h, L.cz, 0, 0)
    const mx = ((E.w - r.sw) / 2) * r.s
    const my = ((E.h - r.sh) / 2) * r.s
    const cx0 = L.cx || 0
    const cy0 = L.cy || 0
    const a = (-(L.rot || 0) * Math.PI) / 180
    this.push()
    return {
      move: (p) => {
        const dx = p[0] - p0[0]
        const dy = p[1] - p0[1]
        const lx = (dx * Math.cos(a) - dy * Math.sin(a)) * (L.flipX ? -1 : 1)
        const ly = (dx * Math.sin(a) + dy * Math.cos(a)) * (L.flipY ? -1 : 1)
        const o = { cx: mx > 0.5 ? clamp(cx0 - lx / mx, -1, 1) : 0, cy: my > 0.5 ? clamp(cy0 - ly / my, -1, 1) : 0 }
        this.set((s) => (s.doc ? { doc: { ...s.doc, layers: s.doc.layers.map((q) => (q.id === L.id ? { ...q, ...o } : q)) }, hist: s.hist + 1 } : null))
      },
      up: () => this.queueSave(),
    }
  }

  // ---------- maske og pensel ----------

  private maskFor(L: ImageLayer, fresh: boolean): MaskCanvas | null {
    const E = L.src ? this.M.media.get(L.src) : undefined
    if (!E) return null
    const b = baseOf(E, 2048)
    const old = this.M.masks.get(L.id)
    const c = mk(b.width, b.height)
    const g = c.getContext('2d')
    if (g && old && !fresh) g.drawImage(old.c, 0, 0, c.width, c.height)
    else if (g && !fresh) {
      g.fillStyle = '#fff'
      g.fillRect(0, 0, c.width, c.height)
    }
    return { c, v: (old?.v ?? 0) + 1 }
  }

  private commitMask(L: ImageLayer, m: MaskCanvas | null): void {
    this.push()
    if (m) this.M.masks.set(L.id, m)
    else this.M.masks.delete(L.id)
    this.setDoc((d) => ({ ...d, layers: d.layers.map((q) => (q.id === L.id ? { ...q, mask: m ? uid('k') : null } : q)) }), false)
  }

  private brushStart(L: ImageLayer, p0: Pt, alt: boolean): Interaction | null {
    const E = L.src ? this.M.media.get(L.src) : undefined
    const S = this.s
    if (!E) return null
    this.push()
    const m = this.maskFor(L, false)
    if (!m) return null
    this.M.masks.set(L.id, m)
    const g = m.c.getContext('2d')
    if (!g) return null
    const k = m.c.width / E.w
    const r = cover(E.w, E.h, L.w, L.h, L.cz, L.cx, L.cy)
    const rad = Math.max(1, (S.brush.size / 2 / r.s) * k)
    const hard = S.brush.hard
    const toM = (p: Pt): Pt => {
      const lp = toLocal(L, p[0], p[1])
      let u = lp[0] / L.w + 0.5
      let v = lp[1] / L.h + 0.5
      if (L.flipX) u = 1 - u
      if (L.flipY) v = 1 - v
      return [(r.sx + u * r.sw) * k, (r.sy + v * r.sh) * k]
    }
    const dab = (x: number, y: number, erase: boolean) => {
      const gr = g.createRadialGradient(x, y, rad * hard * 0.98, x, y, rad)
      const col = erase ? '0,0,0' : '255,255,255'
      gr.addColorStop(0, `rgba(${col},1)`)
      gr.addColorStop(1, `rgba(${col},0)`)
      g.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
      g.fillStyle = gr
      g.beginPath()
      g.arc(x, y, rad, 0, Math.PI * 2)
      g.fill()
    }
    let last = toM(p0)
    const er0 = S.brush.mode === 'erase'
    dab(last[0], last[1], er0 !== alt)
    m.v++
    this.set((s) => ({ hist: s.hist + 1 }))
    return {
      move: (p, ev) => {
        const mm = toM(p)
        const dist = Math.hypot(mm[0] - last[0], mm[1] - last[1])
        const st = Math.max(1, rad / 4)
        const n = Math.ceil(dist / st)
        const er = er0 !== ev.altKey
        for (let i = 1; i <= n; i++) dab(last[0] + ((mm[0] - last[0]) * i) / n, last[1] + ((mm[1] - last[1]) * i) / n, er)
        last = mm
        m.v++
        this.set((s) => ({ brushXY: p, hist: s.hist + 1 }))
      },
      up: () => {
        g.globalCompositeOperation = 'source-over'
        this.setDoc((d) => ({ ...d, layers: d.layers.map((q) => (q.id === L.id ? { ...q, mask: uid('k') } : q)) }), false)
      },
    }
  }

  invertMask(): void {
    const L = this.selL()
    if (!L || L.type !== 'image' || !L.src) return
    const c0 = this.M.masks.get(L.id)
    const m = this.maskFor(L, true)
    const g = m?.c.getContext('2d')
    if (!m || !g) return
    g.fillStyle = '#fff'
    g.fillRect(0, 0, m.c.width, m.c.height)
    if (c0) {
      g.globalCompositeOperation = 'destination-out'
      g.drawImage(c0.c, 0, 0, m.c.width, m.c.height)
    } else g.clearRect(0, 0, m.c.width, m.c.height)
    this.commitMask(L, m)
  }

  clearMask(): void {
    const L = this.selL()
    if (!L || L.type !== 'image' || !this.M.masks.has(L.id)) return
    this.commitMask(L, null)
  }

  async cut(kind: 'person' | 'object'): Promise<void> {
    const L = this.selL()
    if (!L || L.type !== 'image' || !L.src || this.s.busy) return
    const E = this.M.media.get(L.src)
    if (!E) return
    this.set({ busy: 'model', pct: 0 })
    try {
      const b = baseOf(E, 2048)
      const m = await this.d.cutout(b, kind, (phase, pct) => this.alive && this.set({ busy: phase, pct }))
      if (!m) {
        this.flash('Fant ikke noe tydelig motiv. Prøv den andre modellen eller bruk penselen.')
        return
      }
      this.commitMask(L, { c: m, v: (this.M.masks.get(L.id)?.v ?? 0) + 1 })
      this.flash('Motivet er klippet ut. Bruk penselen for å rette opp.')
    } catch {
      this.flash(typeof navigator !== 'undefined' && navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å klippe ut motivet i denne nettleseren.')
    } finally {
      if (this.alive) this.set({ busy: '', pct: 0 })
    }
  }

  // ---------- kurve ----------

  setCurve(id: string, pts: [number, number][] | null, key?: string): void {
    this.patchL(id, (q) => (q.type === 'image' ? { adj: { ...q.adj, curve: pts } } : {}), key)
  }

  /** Avansert framkalling (engine/develop.ts, bare i Avansert modus). Nøytral verdi fjerner feltet helt. */
  setDev(id: string, k: keyof Dev, v: number, key?: string): void {
    this.patchL(id, (q) => (q.type === 'image' ? { dev: cleanDev({ ...DEV, ...q.dev, [k]: v }) } : {}), key)
  }

  resetDev(id: string): void {
    this.patchL(id, { dev: null })
  }

  /** Histogram for bildelaget (raw = originalen). Null uten bilde. */
  histOfLayer(id: string, raw = false): Histogram | null {
    const L = this.s.doc?.layers.find((q) => q.id === id)
    const E = L?.type === 'image' && L.src ? this.M.media.get(L.src) : undefined
    if (!L || L.type !== 'image' || !E) return null
    return histOf(E, raw ? null : { ...ADJ, ...L.adj }, raw ? null : cleanDev(L.dev))
  }

  /** Auto-tone ut fra originalens histogram: eksponering, hvit- og svartpunkt (fargene røres ikke). */
  autoTone(id: string): void {
    const h = this.histOfLayer(id, true)
    if (!h) return
    const t = autoTone(h)
    this.patchL(id, (q) => (q.type === 'image' ? { adj: { ...q.adj, exp: t.exp }, dev: cleanDev({ ...DEV, ...q.dev, whites: t.whites, blacks: t.blacks }) } : {}))
  }

  private devClip: { adj: Adj; look: string; dev: Dev | null } | null = null
  /** Kopier framkalling (justeringer, look og avansert) fra et bildelag … */
  copyDev(id: string): void {
    const L = this.s.doc?.layers.find((q) => q.id === id)
    if (L?.type !== 'image') return
    this.devClip = { adj: { ...ADJ, ...L.adj }, look: L.look || 'none', dev: cleanDev(L.dev) }
    this.set({ devClip: true })
    this.flash('Framkallingen er kopiert.')
  }

  /** … og lim den inn på et annet (bildet, utsnittet og masken beholdes). */
  pasteDev(id: string): void {
    const c = this.devClip
    if (!c) return
    this.patchL(id, (q) => (q.type === 'image' ? { adj: { ...c.adj }, look: c.look, dev: c.dev ? { ...c.dev } : null } : {}))
    this.flash('Framkallingen er limt inn.')
  }

  /** Før/etter: viser bildelaget uten justeringer og framkalling mens knappen holdes inne (endrer ikke prosjektet). */
  setBefore(id: string | null): void {
    if ((this.M.before ?? null) === id) return
    this.M.before = id
    this.set((s) => ({ hist: s.hist + 1 }))
  }

  setAdj(id: string, k: keyof Adj, v: number, key?: string): void {
    this.patchL(id, (q) => (q.type === 'image' ? { adj: { ...q.adj, [k]: v } } : {}), key)
  }

  applyLook(id: string, k: string, o: Partial<Adj>): void {
    this.patchL(id, { look: k, adj: { ...ADJ, ...o } })
  }

  // ---------- format, bakside og utfallende ----------

  changeFormat(f: Format): void {
    const d = this.s.doc
    if (!d || (d.w === f.w && d.h === f.h)) return
    const of = FORMATS.find((x) => x.w === d.w && x.h === d.h)
    const rename = of && d.name === this.d.t(of.l as Phrase) ? this.d.t(f.l as Phrase) : null
    const r = changeFormat(d, f, this.fmtBase, rename)
    this.fmtBase = r.base
    this.setDoc(() => r.doc)
    this.set({ zoom: 1 })
  }

  toggleBleed(): void {
    const d = this.s.doc
    if (!d) return
    const on = !d.bleed
    this.setDoc((q) => ({ ...q, bleed: on, layers: bleedLayers(q.layers, q.w, q.h, on), back: q.back ? { ...q.back, layers: bleedLayers(q.back.layers, q.w, q.h, on) } : (q.back ?? null) }))
    this.flash(on ? 'Bakgrunner og former som går helt ut til kanten, er forlenget 3 mm ut i utfallende område.' : 'Utfallende er slått av.')
  }

  toggleBack(): void {
    const d = this.s.doc
    if (!d) return
    if (d.back) {
      if (!this.d.confirm('Fjerne baksiden?')) return
      this.setDoc((q) => (q.side === 'back' && q.back ? { ...q, bg: q.back.bg, layers: q.back.layers, back: null, side: 'front' } : { ...q, back: null, side: 'front' }))
      this.set({ sel: null, multi: [] })
    } else this.setDoc((q) => ({ ...q, back: { bg: q.bg, layers: [] }, side: q.side ?? 'front' }))
  }

  showSide(k: 'front' | 'back'): void {
    const d = this.s.doc
    if (!d?.back || (d.side ?? 'front') === k) return
    this.setDoc((q) => (q.back ? { ...q, bg: q.back.bg, layers: q.back.layers, back: { bg: q.bg, layers: q.layers }, side: k } : q))
    this.set({ sel: null, multi: [], tool: 'move' })
  }

  // ---------- bakgrunn ----------

  fillOf(d: PdDoc): Fill {
    if (d.fill) return d.fill
    const c = d.bg && HEX.test(d.bg) ? d.bg : null
    if (!c) return { mode: 'none', stops: [{ c: '#1a2b4c', p: 0 }, { c: '#080808', p: 1 }] }
    return d.bg2 ? { mode: 'linear', angle: d.bgAng == null ? 135 : d.bgAng, stops: [{ c, p: 0 }, { c: d.bg2, p: 1 }] } : { mode: 'solid', stops: [{ c, p: 0 }, { c: '#080808', p: 1 }] }
  }

  putFill(p: Partial<Fill>): void {
    this.setDoc((q) => {
      const cur = this.fillOf(q)
      const nf: Fill = { angle: 135, ...cur, mode: cur.mode, stops: fillStops(cur), ...p }
      const s0 = fillStops(nf)
      return { ...q, fill: nf, bg: nf.mode === 'none' ? null : ((s0.slice().sort((x, y) => x.p - y.p)[0])?.c ?? null), bg2: null }
    }, 'fill')
  }

  // ---------- effekter ----------

  addFx(pr: FX.Preset): void {
    const d = this.s.doc
    if (!d) return
    FX.pushRecent(pr.id)
    const K = FX.KINDS[pr.fx]
    const name = pr.custom ? pr.name : `${this.d.t((pr.look ?? K?.l ?? '') as Phrase)}${pr.pal ? ` · ${this.d.t(pr.pal as Phrase)}` : ''}`
    this.addLayer(FX.fxLayer(pr, d.w, d.h, name) as FxLayer)
  }

  toggleAdv(): void {
    const on = !this.s.adv
    FX.setAdvanced(on)
    this.set({ adv: on })
  }

  // ---------- eksport ----------

  sidesOf(d: PdDoc): { bg: string | null; layers: PdLayer[] }[] {
    const cur = { bg: d.bg, layers: d.layers }
    if (!d.back) return [cur]
    return d.side === 'back' ? [d.back, cur] : [cur, d.back]
  }

  fname(): string {
    const d = this.s.doc
    const base = String(d?.name || 'bilde').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'bilde'
    return `${base}.${this.s.exp.fmt}`
  }

  async outBlob(): Promise<Blob | null> {
    const d = this.s.doc
    if (!d) return null
    const x = this.s.exp
    const s = x.scale
    if (d.w * s * d.h * s > 64e6) {
      this.flash('For stort. Velg 1×.')
      return null
    }
    const c = mk(d.w * s, d.h * s)
    const g = c.getContext('2d')
    if (!g) return null
    render(g, d, s, this.M, { full: true, noPh: true, transparent: x.fmt === 'png' && x.t })
    if (x.fmt === 'jpg') {
      const j = mk(c.width, c.height)
      const jg = j.getContext('2d')
      if (!jg) return null
      jg.fillStyle = d.bg || '#ffffff'
      jg.fillRect(0, 0, j.width, j.height)
      jg.drawImage(c, 0, 0)
      const jb = await new Promise<Blob | null>((r) => j.toBlob(r, 'image/jpeg', 0.92))
      if (!jb) this.flash('Bildet er for stort for denne enheten. Prøv PDF trykk.')
      return jb
    }
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
    if (!b) this.flash(s > 1 ? 'For stort for denne enheten. Velg 1×.' : 'Bildet er for stort for denne enheten. Prøv JPG eller PDF trykk.')
    return b
  }

  async printPdf(): Promise<Blob | null> {
    const d = this.s.doc
    if (!d) return null
    return printPDF(this.sidesOf(d), d, this.M, { bleed: !!d.bleed })
  }

  // ---------- diverse ----------

  ui(p: Partial<Pick<PState, 'fmt' | 'cw' | 'ch' | 'tool' | 'tab' | 'brush' | 'zoom' | 'exp' | 'expOpen' | 'ltab' | 'fillOpen' | 'linkCol' | 'dragOver' | 'brushXY' | 'narrow' | 'shapesOpen' | 'logoOpen' | 'fxCat' | 'fxQ' | 'fxN' | 'fxPal' | 'fxStr' | 'fxCk' | 'sel' | 'multi'>>): void {
    this.set(p)
  }

  setDocName(v: string): void {
    this.setDoc((q) => ({ ...q, name: v.slice(0, 80) }), 'name')
  }

  bump(): void {
    this.set((s) => ({ hist: s.hist + 1 }))
  }

  /** Grenser for flere lag (til markeringsboksen). */
  boundsOf(ids: string[]): Bounds {
    const set = new Set(ids)
    return bounds((this.s.doc?.layers ?? []).filter((L) => set.has(L.id)))
  }
}
