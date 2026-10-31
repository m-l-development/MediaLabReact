import { createStore, type Store } from '../../shared/lib/store'
import { snapActive } from '../../shared/lib/snap'
import type { SharedSetup } from '../../services/shared-setup'
import { cleanCategory, DEFAULT_CATS, type Category, type Template } from './engine/backup'
import { COMBOS, ink, luma, profileOf, recolor } from './engine/colors'
import type { ImageCache } from './engine/images'
import { base, BASE_KEYS, layout, type BaseKey } from './engine/layouts'
import { LAYOUT_LIST, LIBRARY, type LibItem } from './engine/library'
import { clone, countImgs, FONTS, H, L, MAX_IMG, MAX_TPL, uid, W, type Background, type Doc, type ImageLayer, type Layer, type ShapeLayer, type Vignette } from './engine/model'
import { barBox, ensureFonts, hit, type Renderer } from './engine/render'
import type { Phrase, Vars } from './texts'

export type View = 'home' | 'cat' | 'edit'
export interface Loc { cat?: string; tpl?: string; base?: string }
const locKey = (l: Loc) => `${l.cat ?? ''}|${l.tpl ?? ''}|${l.base ?? ''}`
export type Msg = { p: Phrase; v?: Vars; raw?: false } | { p: string; raw: true }
export interface CropBox { cL: number; cT: number; cR: number; cB: number }
export type PanelKey = 'add' | 'layers' | 'canvas' | 'props'
export interface ColumnLayout { cols: PanelKey[][]; tabs: boolean[] }
export type AddTarget = { mode: 'add'; logo?: boolean } | { mode: 'replace'; id: string } | { mode: 'bg' }
/** Felt som endres på ett lag (typen avgjøres av laget). */
export type LayerPatch = { x?: number; y?: number; w?: number; h?: number } & Record<string, unknown>
export type Picker = { kind: 'media' | 'cloud'; target: AddTarget } | null

export interface State {
  ready: boolean
  view: View
  cats: Category[]
  tpls: Template[]
  catId: string | null
  editCats: boolean
  doc: Doc | null
  tplId: string | null
  tplName: string
  dirty: boolean
  baseEdit: boolean
  layoutId: string
  sel: string | null
  multi: string[]
  barSel: string | null
  hist: string[]
  fut: string[]
  gx: number[]
  gy: number[]
  msg: Msg | null
  ai: { id: string; phase: 'model' | 'run'; pct: number } | null
  /** «Finjuster utklippet»: originalen og masken som redigeres (felles maskeredigering). */
  maskEdit: { id: string; image: HTMLCanvasElement; mask: Uint8ClampedArray; busy: boolean } | null
  exp: boolean
  expRes: '1080' | '4k'
  expFmt: 'png' | 'jpg'
  expT: boolean
  expBusy: boolean
  expSize: number | null
  save: boolean
  logoOpen: boolean
  shapeOpen: boolean
  libOpen: boolean
  busyImg: boolean
  zoom: number
  cropId: string | null
  cropBox: CropBox
  narrow: boolean
  autoSave: boolean
  autoAt: string
  newOpen: boolean
  newMode: 'new' | 'apply'
  newPal: string
  palOpen: boolean
  previews: Record<string, string>
  ctx: { x: number; y: number; p: { x: number; y: number }; on: boolean } | null
  viewMenu: boolean
  layoutMode: string
  customLayout: ColumnLayout | null
  lcOpen: boolean
  lcDraft: { cols: PanelKey[][]; tabs: boolean[] } | null
  colTab: Record<number, PanelKey>
  addColor: string | null
  dropOn: string | null
  backupBusy: boolean
  sharedReady: boolean
  sharedExists: boolean
  picker: Picker
  /** Øker når et bilde er lastet (miniatyrer i panelet tegnes på nytt). */
  tick: number
}

export interface Deps {
  /** Livets Ord-standardene («Kveldsbibelskole») bare for menigheter som fantes før (churches.legacy_defaults). Standard: ja. */
  legacyDefaults?: boolean
  images: ImageCache
  renderer: Renderer
  /** Kategorier og maler i brukerens database. */
  repo: {
    loadCats(): Promise<Category[] | null>
    saveCats(c: readonly Category[]): Promise<void>
    listTpls(): Promise<Template[]>
    saveTpls(t: readonly Template[]): Promise<Template[]>
  }
  /** Åpner filvelgeren for et nytt bilde. */
  pickFile(target: AddTarget): void
  /** Legger et bilde i Dine medier. → kilde `m:<id>`. */
  putImage(file: Blob, name: string): Promise<string>
  /** Fjerner bakgrunnen (AI) og lagrer resultatet som ny versjon. → ny kilde. */
  // «Finjuster utklippet» (felles maskeredigering): åpne original + maske, lagre ny versjon, velg objekt med AI
  maskEdit?: {
    open(orig: string, cut: string): Promise<{ image: HTMLCanvasElement; mask: Uint8ClampedArray }>
    save(orig: string, image: HTMLCanvasElement, mask: Uint8ClampedArray): Promise<string>
    select(image: HTMLCanvasElement, x: number, y: number): Promise<Uint8ClampedArray | null>
  }
  cutout(src: string, kind: 'person' | 'object', onProgress: (phase: 'model' | 'run', pct: number) => void): Promise<string>
  /** Menighetens felles kategorier (null uten ConnectHub). */
  shared: SharedSetup<{ cats: unknown[] }> | null
  /** Deler et lokalt bilde i Fellesmappe. → `ch:<id>`. */
  shareImage(src: string): Promise<string>
  storage: { get(k: string): string | null; set(k: string, v: string): void }
  confirm(p: Phrase, v?: Vars): boolean
  prompt(p: Phrase, def: string): string | null
  /** Oversatt tekst (navn på grunnoppsett o.l. som lagres). */
  t(p: Phrase, v?: Vars): string
  /** Huskes i adressen (gjenopprettes ved omlasting). */
  onLocation(loc: { cat?: string; tpl?: string; base?: string }, replace: boolean): void
  now?: () => number
}

const AUTO_KEY = 'thumbstudio.autosave'
const LAYOUT_KEY = 'thumbstudio.layout'
const CUSTOM_KEY = 'thumbstudio.layoutCustom'
const CLIP_KEY = 'thumbstudio.clip'
export const PANELS: readonly PanelKey[] = ['add', 'layers', 'canvas', 'props']
export const PRESETS: Record<string, ColumnLayout> = {
  std: { cols: [['add', 'layers'], ['canvas'], ['props']], tabs: [false, false, false] },
  cols: { cols: [['add'], ['layers'], ['canvas'], ['props']], tabs: [false, false, false, false] },
  tabs: { cols: [['add', 'layers'], ['canvas'], ['props']], tabs: [true, false, false] },
  right: { cols: [['canvas'], ['add', 'layers'], ['props']], tabs: [false, true, false] },
  mirror: { cols: [['props'], ['canvas'], ['add', 'layers']], tabs: [false, false, false] },
  side: { cols: [['canvas'], ['add', 'layers', 'props']], tabs: [false, true] },
}
export const ZOOMS = [1, 1.25, 1.5, 2, 3, 4]

export function validLayout(Lx: unknown): ColumnLayout | null {
  const o = Lx as { cols?: unknown; tabs?: unknown } | null
  if (!o || !Array.isArray(o.cols)) return null
  const cols = o.cols.slice(0, 5).map((c: unknown) => (Array.isArray(c) ? c.filter((k): k is PanelKey => PANELS.includes(k as PanelKey)) : []))
  const all = cols.flat()
  if (all.length !== 4 || PANELS.some((k) => !all.includes(k))) return null
  const tabs = Array.isArray(o.tabs) ? o.tabs : []
  return { cols, tabs: cols.map((_, i) => !!tabs[i]) }
}

export function gbox(ls: readonly { x: number; y: number; w: number; h: number }[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const l of ls) {
    x0 = Math.min(x0, l.x)
    y0 = Math.min(y0, l.y)
    x1 = Math.max(x1, l.x + l.w)
    y1 = Math.max(y1, l.y + l.h)
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 }
}

/** Lagene i laglisten: øverst i bildet først, koblede lag rett under laget de hører til. */
export function rowOrder(d: Doc): [Layer, boolean][] {
  const rev = d.layers.slice().reverse()
  const kid = (l: Layer) => !!l.link && l.link !== l.id && d.layers.some((p) => p.id === l.link && !p.link)
  const out: [Layer, boolean][] = []
  for (const l of rev) {
    if (kid(l)) continue
    out.push([l, false])
    for (const k of rev) if (k.link === l.id && kid(k)) out.push([k, true])
  }
  return out
}

interface Drag {
  kids: { id: string; x: number; y: number }[]
  mode: 'move' | 'resize'
  id: string
  p0: { x: number; y: number }
  l0: { x: number; y: number; w: number; h: number; rot: number; type?: string }
  group: { id: string; x: number; y: number }[] | null
  h: string | null
  keep: boolean
  moved: boolean
  snap: string
}

/**
 * Thumbnail Studio: tilstand og handlinger (samme oppførsel som media-lab/src/pages/thumbnail-studio/logic.js).
 * Grensesnittet leser `state` og kaller metodene; ingen bilder eller binærdata ligger i React-tilstand.
 */
export class ThumbController {
  readonly state: Store<State>
  private d: Deps
  private alive = true
  private lastKey: string | null = null
  private lastAt = 0
  private pendLink: string | null = null
  private drag: Drag | null = null
  private clip: { layers: Layer[] } | null = null
  private msgTimer: ReturnType<typeof setTimeout> | undefined
  private autoTimer: ReturnType<typeof setTimeout> | undefined
  private autoBusy = false
  private autoWarned = false
  private sharedAt = 0
  private sharedTimer: ReturnType<typeof setTimeout> | undefined
  private refMap = new Map<string, string>()
  private sizeKey = ''
  private expCache: { key: string; b: Blob; doc: Doc } | null = null
  private pfCat: Category | null = null
  private pf: { colors: string[]; fonts: string[] } = { colors: [], fonts: [] }
  private bmCat: Category | null = null
  private bm: Record<string, Layer> = {}
  private pendFile: Blob | null = null
  private offImg: (() => void) | null = null
  private stopShared: (() => void) | null = null
  private now: () => number
  private quiet = false
  private lastLoc = ''

  /** Grunnoppsettene som tilbys: «Kveldsbibelskole» bare med Livets Ord-standardene. */
  baseKeys(): BaseKey[] {
    return BASE_KEYS.filter((b) => b !== 'kbs' || this.d.legacyDefaults !== false)
  }

  constructor(deps: Deps) {
    this.d = deps
    this.now = deps.now ?? Date.now
    const st = deps.storage
    const lm = st.get(LAYOUT_KEY)
    const custom = (() => {
      try {
        return validLayout(JSON.parse(st.get(CUSTOM_KEY) ?? 'null'))
      } catch {
        return null
      }
    })()
    this.state = createStore<State>({
      ready: false, view: 'home', cats: [], tpls: [], catId: null, editCats: false, doc: null, tplId: null, tplName: '', dirty: false,
      baseEdit: false, layoutId: 'main', sel: null, multi: [], barSel: null, hist: [], fut: [], gx: [], gy: [], msg: null, ai: null, maskEdit: null,
      exp: false, expRes: '1080', expFmt: 'png', expT: false, expBusy: false, expSize: null, save: false, logoOpen: false, shapeOpen: false,
      libOpen: false, busyImg: false, zoom: 1, cropId: null, cropBox: { cL: 0, cT: 0, cR: 0, cB: 0 }, narrow: false,
      autoSave: st.get(AUTO_KEY) === '1', autoAt: '', newOpen: false, newMode: 'new', newPal: 'default', palOpen: false, previews: {},
      ctx: null, viewMenu: false, layoutMode: lm === 'custom' && !custom ? 'std' : (lm ?? 'std'), customLayout: custom, lcOpen: false,
      lcDraft: null, colTab: {}, addColor: null, dropOn: null, backupBusy: false, sharedReady: false, sharedExists: false, picker: null, tick: 0,
    })
    let bt: ReturnType<typeof setTimeout> | undefined
    this.offImg = deps.images.onLoad(() => {
      clearTimeout(bt)
      bt = setTimeout(() => this.alive && this.set((s) => ({ tick: s.tick + 1 })), 80)
    })
  }

  get s(): State {
    return this.state.get()
  }

  private set(p: Partial<State> | ((s: State) => Partial<State> | null)) {
    this.state.set((s) => {
      const patch = typeof p === 'function' ? p(s) : p
      return patch ? { ...s, ...patch } : s
    })
    this.afterChange()
  }

  dispose(): void {
    this.alive = false
    clearTimeout(this.msgTimer)
    clearTimeout(this.autoTimer)
    clearTimeout(this.sharedTimer)
    this.offImg?.()
    this.stopShared?.()
  }

  // ---------- oppstart ----------

  async init(loc: { cat?: string; tpl?: string; base?: string }, legacyImport?: () => Promise<{ cats: Category[] | null; added: number }>): Promise<void> {
    let cats = await this.d.repo.loadCats().catch(() => null)
    let tpls = await this.d.repo.listTpls().catch(() => [] as Template[])
    if (legacyImport) {
      const r = await legacyImport().catch(() => {
        this.flash('Malene fra forrige versjon kunne ikke hentes nå. De ligger urørt og prøves igjen neste gang du åpner verktøyet.')
        return { cats: null, added: 0 }
      })
      if (r.added || (r.cats && !cats)) {
        if (r.cats && !cats) {
          cats = r.cats
          await this.d.repo.saveCats(cats).catch(() => undefined)
        }
        tpls = await this.d.repo.listTpls().catch(() => tpls)
        if (r.added) this.flash('{n} maler er hentet fra forrige versjon av Thumbnail Studio.', { n: r.added })
      }
    }
    if (!this.alive) return
    this.set({ ready: true, cats: cats ?? clone(DEFAULT_CATS.filter((x) => this.baseKeys().includes(x.base))), tpls })
    this.restore(loc)
    void this.initShared()
  }

  private restore(loc: Loc) {
    this.quiet = true
    try {
      const c = loc.cat ? this.s.cats.find((x) => x.id === loc.cat) : null
      if (!c) return
      this.set({ view: 'cat', catId: c.id })
      if (loc.base) {
        this.editBase(loc.base)
        return
      }
      const t = loc.tpl ? this.s.tpls.find((x) => x.id === loc.tpl && x.catId === c.id) : null
      if (t) this.enterEdit(clone(t.doc), t.id, t.name)
    } finally {
      this.quiet = false
      this.location(true)
    }
  }

  /**
   * Nettleserens tilbake/fram: viser visningen adressen peker på (ett nivå om gangen: mal → kategori → start).
   * Ulagrede endringer lagres først når det går; ellers spørres det.
   */
  async followLocation(loc: Loc): Promise<void> {
    if (!this.s.ready || locKey(loc) === this.lastLoc) return
    if (this.s.view === 'edit' && this.s.dirty) {
      const r = await this.saveForUpdate()
      if (r === false && !this.d.confirm('Du har endringer som ikke er lagret. Gå tilbake likevel?')) {
        this.lastLoc = ''
        this.location()
        return
      }
    }
    if (!this.alive) return
    this.set({ view: 'home', baseEdit: false, doc: null, hist: [], fut: [], sel: null, multi: [], dirty: false, exp: false, save: false, newOpen: false, cropId: null, ctx: null, picker: null })
    this.restore(loc)
  }

  /** Visningen i adressen. Hvert nivå (start, kategori, mal) er et eget steg i historikken. */
  private location(replace = false) {
    if (this.quiet) return
    const s = this.s
    const loc: Loc = s.view === 'edit' && s.catId
      ? { cat: s.catId, ...(s.baseEdit ? { base: s.layoutId || 'main' } : { tpl: s.tplId ?? 'new' }) }
      : s.view === 'cat' && s.catId ? { cat: s.catId } : {}
    const key = locKey(loc)
    if (key === this.lastLoc) return
    this.lastLoc = key
    this.d.onLocation(loc, replace)
  }

  // ---------- felles grunnoppsett (ConnectHub) ----------

  private async initShared() {
    const sh = this.d.shared
    if (!sh?.available) return
    try {
      const data = await sh.load()
      if (!this.alive) return
      if (data) this.applyShared(data, true)
      this.sharedAt = this.now()
      this.set({ sharedReady: true, sharedExists: !!data })
      this.stopShared = sh.watch()
    } catch {
      this.flash('Menighetens grunnoppsett kunne ikke hentes. Du ser ditt eget oppsett på denne enheten.')
    }
  }

  /** Nyere felles kategorier fra menigheten (egne kategorier med maler beholdes til de deles). */
  applyShared(data: { cats?: unknown }, initial: boolean): void {
    this.sharedAt = this.now()
    const raw = Array.isArray(data.cats) ? data.cats.slice(0, 30) : []
    const shared = raw.map((c) => cleanCategory(c, () => null)).filter((c): c is Category => !!c)
    const ids = new Set(shared.map((c) => c.id))
    const keep = this.s.cats.filter((c) => !ids.has(c.id) && this.s.tpls.some((t) => t.catId === c.id))
    const cats = shared.concat(keep)
    for (const c of cats) {
      if (c.baseDoc) void this.d.images.loadAll(c.baseDoc)
      for (const l of c.layouts ?? []) void this.d.images.loadAll(l.doc)
    }
    this.set({ cats })
    void this.d.repo.saveCats(cats).catch(() => undefined)
    if (!initial) this.flash('Grunnoppsettet er oppdatert med endringer fra menigheten.')
  }

  private sharedDoc(doc: Doc | null | undefined): Doc | null {
    if (!doc) return null
    const ok = (v: string | null | undefined) => (typeof v === 'string' && v.startsWith('ch:') ? v : null)
    const d = clone(doc)
    d.layers = d.layers.filter((l) => !(l.type === 'image' && l.src?.startsWith('asset:'))).map((l) => (l.type === 'image' && (l.src || l.orig) ? { ...l, src: ok(l.src), orig: null } : l))
    d.bg = { ...d.bg, src: ok(d.bg.src), orig: null }
    return d
  }

  sharedData(cats: readonly Category[]): { cats: unknown[] } {
    return {
      cats: cats.map((c) => ({
        id: c.id, name: c.name, desc: c.desc || '', base: c.base, baseDoc: this.sharedDoc(c.baseDoc), baseName: c.baseName ?? '',
        defaultLayout: c.defaultLayout ?? '', layouts: (c.layouts ?? []).map((l) => ({ id: l.id, name: l.name, doc: this.sharedDoc(l.doc) })),
      })),
    }
  }

  /** Lokale bilder i grunnoppsettene lastes opp til Fellesmappe og erstattes med referanser. */
  private async uploadLocalRefs(cats: Category[]): Promise<Category[]> {
    let changed = false
    const conv = async (v: string): Promise<string> => {
      if (!v.startsWith('m:') && !v.startsWith('db:')) return v
      const have = this.refMap.get(v)
      if (have) return have
      const ref = await this.d.shareImage(v)
      this.refMap.set(v, ref)
      await this.d.images.load(ref)
      return ref
    }
    const convDoc = async (doc: Doc | null | undefined): Promise<Doc | null> => {
      if (!doc) return doc ?? null
      const d = clone(doc)
      for (const l of d.layers) {
        if (l.type === 'image' && l.src && !l.src.startsWith('ch:') && !l.src.startsWith('asset:')) {
          const n = await conv(l.src)
          if (n !== l.src) {
            l.src = n
            l.orig = null
            changed = true
          }
        }
      }
      if (d.bg.src && !d.bg.src.startsWith('ch:')) {
        const n = await conv(d.bg.src)
        if (n !== d.bg.src) {
          d.bg = { ...d.bg, src: n, orig: null }
          changed = true
        }
      }
      return d
    }
    const out: Category[] = []
    for (const c of cats) {
      const layouts = []
      for (const l of c.layouts ?? []) layouts.push({ ...l, doc: (await convDoc(l.doc)) ?? l.doc })
      out.push({ ...c, baseDoc: await convDoc(c.baseDoc), ...(c.layouts ? { layouts } : {}) })
    }
    if (changed) {
      this.set({ cats: out })
      await this.d.repo.saveCats(out).catch(() => undefined)
    }
    return out
  }

  private queueShared() {
    const sh = this.d.shared
    if (!sh || !this.s.sharedReady || this.now() - this.sharedAt < 800) return
    clearTimeout(this.sharedTimer)
    this.sharedTimer = setTimeout(async () => {
      let cats = this.s.cats
      try {
        cats = await this.uploadLocalRefs(cats)
      } catch {
        this.flash('Et bilde i grunnoppsettet kunne ikke deles. Det vises bare på denne enheten.')
      }
      const first = !sh.exists
      const ok = await sh.save(this.sharedData(cats), 0)
      if (ok && first && sh.exists) {
        this.set({ sharedExists: true })
        this.flash('Grunnoppsettet er nå felles for menigheten. Andre i menigheten ser endringene.')
      }
    }, 900)
  }

  // ---------- meldinger og lagring ----------

  flash(p: Phrase, v?: Vars): void {
    this.set({ msg: v ? { p, v } : { p } })
    clearTimeout(this.msgTimer)
    this.msgTimer = setTimeout(() => this.alive && this.set({ msg: null }), 4200)
  }

  /** Ferdig oversatt melding (f.eks. fra felles grunnoppsett). */
  flashRaw(text: string): void {
    this.set({ msg: { p: text, raw: true } })
    clearTimeout(this.msgTimer)
    this.msgTimer = setTimeout(() => this.alive && this.set({ msg: null }), 4200)
  }

  cat(): Category | null {
    return this.s.cats.find((c) => c.id === this.s.catId) ?? null
  }

  tplsOf(id: string | null): Template[] {
    return this.s.tpls.filter((t) => t.catId === id)
  }

  private persistCats(cats: Category[]): Promise<void> {
    this.set({ cats })
    this.queueShared()
    return this.d.repo.saveCats(cats).catch(() => this.flash('Klarte ikke å lagre.'))
  }

  private async persistTpls(tpls: Template[]): Promise<Template[]> {
    this.set({ tpls })
    try {
      const saved = await this.d.repo.saveTpls(tpls)
      if (this.alive) this.set({ tpls: saved })
      return saved
    } catch {
      this.flash('Klarte ikke å lagre. Lagringsplassen kan være full.')
      return tpls
    }
  }

  // ---------- kategorier og grunnoppsett ----------

  openCat(id: string): void {
    this.set({ view: 'cat', catId: id, editCats: false })
    this.location()
  }

  goHome(): void {
    this.set({ view: 'home' })
    this.location()
  }

  layoutsOf(c: Category | null): { id: string; name: string; doc: Doc | null }[] {
    if (!c) return []
    return [{ id: 'main', name: c.baseName || this.d.t('Grunnoppsett'), doc: c.baseDoc ?? null }, ...(c.layouts ?? []).filter((l) => l?.id && l.doc)]
  }

  defaultLayoutId(c: Category | null): string {
    return c?.defaultLayout && (c.layouts ?? []).some((l) => l.id === c.defaultLayout) ? c.defaultLayout : 'main'
  }

  layoutDoc(c: Category | null, id: string): Doc {
    if (c && id && id !== 'main') {
      const l = (c.layouts ?? []).find((x) => x.id === id)
      if (l?.doc) return clone(l.doc)
    }
    return c?.baseDoc ? clone(c.baseDoc) : base(c ? c.base : 'blank')
  }

  catBase(c: Category | null): Doc {
    return this.layoutDoc(c, this.defaultLayoutId(c))
  }

  editBase(id = 'main'): void {
    const c = this.cat()
    if (!c) return
    this.set({ layoutId: id })
    this.enterEdit(this.layoutDoc(c, id), null, this.layoutsOf(c).find((l) => l.id === id)?.name ?? '', true)
  }

  addLayout(): void {
    const c = this.cat()
    if (!c) return
    if ((c.layouts ?? []).length >= 4) {
      this.flash('Høyst 5 grunnoppsett per kategori. Slett et først.')
      return
    }
    const id = 'l' + uid()
    const name = `${this.d.t('Grunnoppsett')} ${(c.layouts ?? []).length + 2}`
    void this.persistCats(this.s.cats.map((x) => (x.id === c.id ? { ...x, layouts: [...(x.layouts ?? []), { id, name, doc: this.catBase(c) }] } : x)))
    this.flash('Nytt grunnoppsett er laget som en kopi av standardoppsettet. Trykk «Rediger» for å tilpasse det.')
  }

  renameLayout(c: Category, l: { id: string; name: string }): void {
    const v = this.d.prompt('Nytt navn på grunnoppsettet:', l.name)
    if (v == null) return
    const name = v.trim().slice(0, 40)
    if (!name) return
    void this.persistCats(this.s.cats.map((x) => (x.id !== c.id ? x : l.id === 'main' ? { ...x, baseName: name } : { ...x, layouts: (x.layouts ?? []).map((y) => (y.id === l.id ? { ...y, name } : y)) })))
  }

  setDefaultLayout(c: Category, id: string): void {
    void this.persistCats(this.s.cats.map((x) => (x.id === c.id ? { ...x, defaultLayout: id === 'main' ? '' : id } : x)))
    this.flash('Standard grunnoppsett for kategorien er endret. Nye maler starter fra det.')
  }

  delLayout(c: Category, l: { id: string; name: string }): void {
    if (l.id === 'main' || !this.d.confirm('Slette grunnoppsettet «{name}»?\n\nDet slettes for hele menigheten. Maler som allerede er laget fra det, beholdes.', { name: l.name })) return
    void this.persistCats(this.s.cats.map((x) => (x.id === c.id ? { ...x, layouts: (x.layouts ?? []).filter((y) => y.id !== l.id), defaultLayout: x.defaultLayout === l.id ? '' : (x.defaultLayout ?? '') } : x)))
  }

  resetBase(): void {
    const c = this.cat()
    if (!c || !this.d.confirm('Tilbakestille grunnoppsettet til standard?')) return
    void this.persistCats(this.s.cats.map((x) => (x.id === c.id ? { ...x, baseDoc: null } : x)))
  }

  async saveBase(quiet = false): Promise<void> {
    const c = this.cat()
    const ref = this.s.doc
    if (!c || !ref) return
    const doc = clone(ref)
    const lid = this.s.layoutId || 'main'
    await this.persistCats(this.s.cats.map((x) => (x.id !== c.id ? x : lid === 'main' ? { ...x, baseDoc: doc } : { ...x, layouts: (x.layouts ?? []).map((y) => (y.id === lid ? { ...y, doc } : y)) })))
    if (!this.alive) return
    if (this.s.doc === ref) this.set({ dirty: false })
    if (!quiet) this.flash('Grunnoppsettet er lagret. Nye maler starter herfra.')
  }

  setCat(id: string, patch: Partial<Category>): void {
    void this.persistCats(this.s.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  /** Bytter kategoriens standardoppsett; et lagret grunnoppsett erstattes bare etter bekreftelse. → false når det ble avbrutt. */
  setCatBase(c: Category, key: Category['base']): boolean {
    if (c.baseDoc && !this.d.confirm('Bytte grunnoppsett? Ditt lagrede grunnoppsett for kategorien blir erstattet.')) return false
    this.setCat(c.id, { base: key, baseDoc: null })
    return true
  }

  toggleEditCats(): void {
    this.set((s) => ({ editCats: !s.editCats }))
  }

  addCat(): void {
    void this.persistCats([...this.s.cats, { id: uid(), name: 'Ny kategori', desc: '', base: 'blank' }])
    this.set({ editCats: true })
  }

  delCat(c: Category): void {
    const n = this.tplsOf(c.id).length
    if (!this.d.confirm(n ? 'Slette kategorien «{name}»?\nMalene i kategorien slettes også ({n}).' : 'Slette kategorien «{name}»?', { name: c.name, n })) return
    void this.persistCats(this.s.cats.filter((x) => x.id !== c.id))
    void this.persistTpls(this.s.tpls.filter((t) => t.catId !== c.id))
  }

  // ---------- maler ----------

  enterEdit(doc: Doc, tplId: string | null, name: string, baseEdit = false): void {
    this.bmCat = null
    this.set({ view: 'edit', baseEdit, doc, tplId, tplName: name, dirty: false, sel: null, multi: [], hist: [], fut: [], ai: null, exp: false, save: false, logoOpen: false, zoom: 1 })
    void ensureFonts(doc)
    void this.d.images.loadAll(doc)
    this.location()
    if (this.pendFile) {
      const f = this.pendFile
      this.pendFile = null
      void this.addFile(f, { mode: 'add' })
    }
  }

  openTpl(t: Template): void {
    this.enterEdit(clone(t.doc), t.id, t.name)
  }

  newFromBase(): void {
    const c = this.cat()
    if (!c) return
    if (this.tplsOf(c.id).length >= MAX_TPL) {
      this.flash('Maks 5 maler per kategori. Slett en mal for å lage en ny.')
      return
    }
    this.set({ newOpen: true, newMode: 'new', newPal: 'default', palOpen: false })
    void this.genPrev(c)
  }

  openLayouts(): void {
    const c = this.cat()
    if (!c || !this.s.doc) return
    this.set({ newOpen: true, newMode: 'apply', newPal: 'default', palOpen: false, logoOpen: false, shapeOpen: false })
    void this.genPrev(c)
  }

  closeNew(): void {
    this.set({ newOpen: false, palOpen: false })
  }

  /** Valgene i «Ny mal» / «Bytt oppsett»: kategoriens grunnoppsett (standard først), blank og standardoppsettene. */
  newList(c: Category): { k: string; name: string; desc: string; translate: boolean; doc: () => Doc }[] {
    const pal = this.s.newPal || 'default'
    const def = this.defaultLayoutId(c)
    const ls = this.layoutsOf(c)
    const bases = [...ls.filter((l) => l.id === def), ...ls.filter((l) => l.id !== def)].map((l) => ({
      k: 'base:' + l.id, name: l.name + (l.id === def ? ' · ' + this.d.t('standard') : ''), desc: 'Felles grunnoppsett for kategorien', translate: false, doc: () => this.layoutDoc(c, l.id),
    }))
    const lay = (k: string) => () => {
      const d = layout(k)
      for (const l of d.layers) if (l.type === 'text' && String(l.text).startsWith('Kategori')) l.text = c.name + l.text.slice(8)
      return d
    }
    const std = LAYOUT_LIST.map((o) => ({ k: o.k, name: o.name, desc: o.desc, translate: true, doc: lay(o.k) }))
    return [...bases, ...std].map((o) => ({ ...o, doc: () => {
      const d = o.doc()
      return pal === 'default' || o.k === 'blank' ? d : recolor(d, pal)
    } }))
  }

  private pvKey(c: Category, k: string): string {
    return (k.startsWith('base:') ? k + ':' + c.id : k + ':' + c.name) + '|' + (this.s.newPal || 'default')
  }

  previewOf(c: Category, k: string): string | undefined {
    return this.s.previews[this.pvKey(c, k)]
  }

  private async genPrev(c: Category) {
    const pal = this.s.newPal || 'default'
    for (const o of this.newList(c)) {
      if (o.k === 'blank') continue
      const key = this.pvKey(c, o.k)
      if (!o.k.startsWith('base:') && this.s.previews[key]) continue
      let img = ''
      try {
        img = await this.d.renderer.snapshot(o.doc(), 480, true, (role) => this.d.t(role === 'person' ? 'Legg til person' : 'Legg til bilde'))
      } catch {
        img = ''
      }
      if (!this.alive || !this.s.newOpen || (this.s.newPal || 'default') !== pal) return
      this.set((s) => ({ previews: { ...s.previews, [key]: img } }))
    }
  }

  setPal(k: string): void {
    const c = this.cat()
    this.set({ newPal: k })
    if (c) void this.genPrev(c)
  }

  togglePal(): void {
    this.set((s) => ({ palOpen: !s.palOpen }))
  }

  pickNew(c: Category, o: { doc: () => Doc }): void {
    if (this.s.newMode === 'apply') {
      this.set({ newOpen: false })
      this.applyLayout(o.doc())
      return
    }
    const n = this.tplsOf(c.id).length + 1
    this.set({ newOpen: false })
    this.enterEdit(o.doc(), null, `${c.name} ${n}`)
  }

  /** Bytter oppsett og tar med person, navn, tema og egne bilder. */
  applyLayout(nd: Doc): void {
    const cur = this.s.doc
    if (!cur) return
    const role = (d: Doc, r: string) => d.layers.find((l) => l.role === r)
    const oP = role(cur, 'person')
    const nP = role(nd, 'person')
    if (oP?.type === 'image' && nP?.type === 'image' && oP.src) Object.assign(nP, { src: oP.src, orig: oP.orig ?? null, cT: oP.cT || 0, cB: oP.cB || 0, cL: oP.cL || 0, cR: oP.cR || 0 })
    for (const r of ['name', 'theme']) {
      const a = role(cur, r)
      const b = role(nd, r)
      if (a?.type === 'text' && b?.type === 'text' && String(a.text || '').trim()) b.text = a.text
    }
    const own = cur.layers.filter((l): l is ImageLayer => l.type === 'image' && !l.role && !!l.src && !l.src.startsWith('asset:'))
    const slots = nd.layers.filter((l): l is ImageLayer => l.type === 'image' && !l.role && !l.src)
    slots.forEach((l, i) => {
      const o = own[i]
      if (o) Object.assign(l, { src: o.src, orig: o.orig ?? null })
    })
    this.edit((d) => {
      d.bg = nd.bg
      d.vig = nd.vig
      d.layers = nd.layers
      if (nd.lay) d.lay = nd.lay
      else delete d.lay
    })
    this.bmCat = null
    this.set({ sel: null, multi: [], barSel: null })
    void this.d.images.loadAll(nd)
    this.flash('Oppsettet er byttet. Trykk angre for å gå tilbake.')
  }

  async leaveEdit(): Promise<void> {
    clearTimeout(this.autoTimer)
    if (this.s.dirty && this.s.autoSave && this.autoOk() && !this.autoBusy) await this.autoRun()
    if (!this.alive) return
    if (this.s.dirty && !this.d.confirm('Du har endringer som ikke er lagret. Gå tilbake likevel?')) return
    this.set({ view: 'cat', baseEdit: false, doc: null, hist: [], fut: [], sel: null, dirty: false, exp: false, save: false })
    this.location()
  }

  dupTpl(t: Template): void {
    if (this.tplsOf(t.catId).length >= MAX_TPL) {
      this.flash('Maks 5 maler per kategori.')
      return
    }
    const n: Template = { ...clone(t), id: 'new-' + uid(), name: `${t.name} (${this.d.t('kopi')})`, updated: this.now() }
    const list = this.s.tpls.slice()
    list.splice(list.findIndex((x) => x.id === t.id) + 1, 0, n)
    void this.persistTpls(list)
  }

  delTpl(t: Template): void {
    if (!this.d.confirm('Slette malen «{name}»?', { name: t.name })) return
    void this.persistTpls(this.s.tpls.filter((x) => x.id !== t.id))
  }

  /** mode: 'new', 'over' (denne malen) eller ID-en til malen som skal overskrives. */
  async doSave(mode: string, quiet = false): Promise<void> {
    const S = this.s
    const ref = S.doc
    if (!ref) return
    const name = String(S.tplName || '').trim().slice(0, 60) || this.d.t('Uten navn')
    const thumb = await this.d.renderer.snapshot(ref, 480, false).catch(() => '')
    let tpls = this.s.tpls.slice()
    let id: string
    if (mode === 'new') {
      if (this.tplsOf(S.catId).length >= MAX_TPL) {
        if (!quiet) this.flash('Maks 5 maler per kategori.')
        return
      }
      id = 'new-' + uid()
      tpls.push({ id, catId: S.catId ?? '', name, doc: clone(ref), thumb, updated: this.now() })
    } else {
      id = mode === 'over' ? (S.tplId ?? '') : mode
      tpls = tpls.map((t) => (t.id === id ? { ...t, name, doc: clone(ref), thumb, updated: this.now() } : t))
    }
    const idx = tpls.findIndex((t) => t.id === id)
    const saved = await this.persistTpls(tpls)
    const finalId = saved[idx]?.id ?? id
    if (!this.alive) return
    this.set((s) => ({ tplId: finalId, tplName: name, dirty: s.doc === ref ? false : s.dirty, save: quiet ? s.save : false }))
    this.location(true)
    if (!quiet) this.flash('Malen er lagret.')
  }

  /** Lagrer det som er åpent (før verktøybytte eller ny versjon). → false når det ikke var mulig (full kategori). */
  async saveForUpdate(): Promise<boolean | null> {
    const S = this.s
    if (S.view !== 'edit' || !S.doc || !S.dirty) return null
    if (S.baseEdit) {
      await this.saveBase(true)
      return true
    }
    if (S.tplId) {
      await this.doSave('over', true)
      return true
    }
    if (this.tplsOf(S.catId).length < MAX_TPL) {
      await this.doSave('new', true)
      return true
    }
    return false
  }

  // ---------- autolagring ----------

  autoOk(): boolean {
    const S = this.s
    return S.view === 'edit' && !!S.doc && (S.baseEdit || !!S.tplId || this.tplsOf(S.catId).length < MAX_TPL)
  }

  private afterChange() {
    const S = this.state.get()
    if (S.view !== 'edit') return
    clearTimeout(this.autoTimer)
    if (!S.autoSave || !S.dirty || S.save || S.exp || S.cropId || this.autoBusy) return
    this.autoTimer = setTimeout(() => void this.autoRun(), 1500)
  }

  private async autoRun() {
    const S = this.s
    if (!this.alive || !S.autoSave || !S.dirty || this.autoBusy) return
    if (!this.autoOk()) {
      if (!this.autoWarned) {
        this.autoWarned = true
        this.flash('Autolagring venter: kategorien har 5 maler. Slett en mal eller lagre over en eksisterende.')
      }
      return
    }
    this.autoBusy = true
    try {
      if (S.baseEdit) await this.saveBase(true)
      else await this.doSave(S.tplId ? 'over' : 'new', true)
    } catch {
      // prøves igjen ved neste endring
    } finally {
      this.autoBusy = false
    }
    if (this.alive) {
      const t = new Date(this.now())
      this.set({ autoAt: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` })
    }
  }

  toggleAuto(): void {
    const on = !this.s.autoSave
    this.d.storage.set(AUTO_KEY, on ? '1' : '0')
    this.autoWarned = false
    this.set({ autoSave: on, autoAt: '' })
    if (on) this.flash(this.s.baseEdit ? 'Autolagring er på. Grunnoppsettet lagres automatisk.' : 'Autolagring er på. Malen lagres automatisk mens du jobber.')
  }

  setTplName(v: string): void {
    this.set({ tplName: v.slice(0, 60), dirty: true })
  }

  // ---------- redigering ----------

  edit(fn: (d: Doc) => void, key?: string): void {
    const now = this.now()
    const co = !!key && key === this.lastKey && now - this.lastAt < 900
    this.lastKey = key ?? null
    this.lastAt = now
    this.set((s) => {
      if (!s.doc) return null
      const d = clone(s.doc)
      fn(d)
      return { doc: d, hist: co ? s.hist : [...s.hist, JSON.stringify(s.doc)].slice(-60), fut: co ? s.fut : [], dirty: true }
    })
  }

  setL(id: string, patch: LayerPatch, key?: string): void {
    this.edit((d) => {
      const l = d.layers.find((x) => x.id === id)
      if (!l) return
      const dx = patch.x != null ? patch.x - l.x : 0
      const dy = patch.y != null ? patch.y - l.y : 0
      Object.assign(l, patch)
      if (dx || dy) for (const k of d.layers) if (k.link === id && k.id !== id) {
        k.x += dx
        k.y += dy
      }
    }, key ?? id + ':' + Object.keys(patch).join(','))
  }

  setBg(patch: Partial<Background>): void {
    this.edit((d) => Object.assign(d.bg, patch), 'bg:' + Object.keys(patch).join(','))
  }

  setVig(patch: Partial<Vignette>): void {
    this.edit((d) => Object.assign(d.vig, patch), 'vig:' + Object.keys(patch).join(','))
  }

  undo(): void {
    this.lastKey = null
    this.set((s) => {
      const last = s.hist[s.hist.length - 1]
      return last && s.doc ? { doc: JSON.parse(last) as Doc, hist: s.hist.slice(0, -1), fut: [JSON.stringify(s.doc), ...s.fut].slice(0, 60), dirty: true } : null
    })
  }

  redo(): void {
    this.lastKey = null
    this.set((s) => {
      const next = s.fut[0]
      return next && s.doc ? { doc: JSON.parse(next) as Doc, fut: s.fut.slice(1), hist: [...s.hist, JSON.stringify(s.doc)].slice(-60), dirty: true } : null
    })
  }

  select(id: string | null, shift = false): void {
    if (shift && id) this.toggleMulti(id)
    else this.set({ sel: id, multi: [], barSel: null, logoOpen: false, shapeOpen: false })
  }

  selectBar(id: string): void {
    this.set({ sel: id, multi: [], barSel: id })
  }

  layer(id: string | null): Layer | null {
    return (id && this.s.doc?.layers.find((x) => x.id === id)) || null
  }

  private rootOf(id: string): Layer | null {
    const d = this.s.doc
    const l = d?.layers.find((x) => x.id === id)
    if (!d || !l) return null
    const p = l.link ? d.layers.find((x) => x.id === l.link) : null
    return p ?? l
  }

  addLayer(l: Layer): void {
    const pid = this.pendLink
    this.pendLink = null
    const P = pid ? this.rootOf(pid) : null
    if (P) {
      l.link = P.id
      const line = l.type === 'shape' && l.kind === 'line'
      const back = (l.type === 'shape' && !line) || l.type === 'glow'
      if (l.type === 'text' || line) {
        l.x = P.x
        l.w = P.w
        l.y = Math.round(P.y + P.h + (line ? 12 : 16))
      } else if (l.w && l.h) {
        l.x = Math.round(P.x + P.w / 2 - l.w / 2)
        l.y = Math.round(P.y + P.h / 2 - l.h / 2)
      }
      this.edit((d) => {
        const i = d.layers.findIndex((x) => x.id === P.id)
        d.layers.splice(i < 0 ? d.layers.length : back ? i : i + 1, 0, l)
      })
    } else this.edit((d) => {
      d.layers.push(l)
    })
    this.set({ sel: l.id, multi: [], logoOpen: false, shapeOpen: false, libOpen: false, barSel: null })
  }

  addText(): string {
    const l = L('text', { text: 'Ny tekst', x: 660, y: 460, w: 600, h: 160 })
    this.addLayer(l)
    return l.id
  }

  addGlow(): void {
    this.addLayer(L('glow', { color: '#f5b800' }))
  }

  /** Legger til et element koblet til laget det ble sluppet på. */
  addLinked(kind: string, pid: string): void {
    this.pendLink = pid
    if (kind === 'text') this.addText()
    else if (kind === 'image') this.openPicker('file', { mode: 'add' })
    else if (kind === 'line') this.addShape('line')
    else if (kind === 'glow') this.addGlow()
    else if (kind === 'shape') this.set({ shapeOpen: true, logoOpen: false })
    else if (kind === 'logo') this.set({ logoOpen: true, shapeOpen: false })
    else this.pendLink = null
  }

  clearPendingLink(): void {
    this.pendLink = null
  }

  linkTo(cid: string, tid: string): void {
    if (cid === tid) return
    const P = this.rootOf(tid)
    if (!P) return
    if (P.id === cid) {
      this.flash('Et lag kan ikke kobles til sitt eget underlag.')
      return
    }
    this.edit((d) => {
      for (const x of d.layers) if (x.id === cid || x.link === cid) x.link = P.id
    })
    this.set({ sel: cid, multi: [], barSel: null })
    this.flash('Lagene er koblet sammen.')
  }

  unlink(id: string): void {
    this.setL(id, { link: null })
    this.flash('Laget er koblet fra.')
  }

  addShape(kind: ShapeLayer['kind']): void {
    const c = this.addCol()
    const p: Partial<ShapeLayer> = { kind, fill: c }
    if (kind === 'line') Object.assign(p, { x: 660, y: 536, w: 600, h: 8, radius: 0 })
    else if (kind === 'ellipse') Object.assign(p, { x: 800, y: 380, w: 320, h: 320 })
    else Object.assign(p, { x: 760, y: 390, w: 400, h: 300, radius: kind === 'rounded' ? 40 : 0 })
    this.addLayer(L('shape', p))
  }

  addCol(): string {
    return this.s.addColor ?? this.profile().colors[0] ?? '#ffffff'
  }

  setAddColor(c: string): void {
    if (/^#[0-9a-f]{6}$/i.test(c)) this.set({ addColor: c.toLowerCase() })
  }

  /** Aksentfargen nye elementer fra «Flere elementer» får: en profilfarge som syns mot bakgrunnen. */
  presetCol(): string {
    if (this.s.addColor) return this.s.addColor
    const d = this.s.doc
    const bg = d ? (d.bg.type === 'gradient' ? d.bg.c1 : d.bg.color) : '#111111'
    const lb = luma(bg)
    const ok = (c: string) => /^#[0-9a-f]{6}$/i.test(c) && Math.abs(luma(c) - lb) > 70 && !['#ffffff', '#000000'].includes(c.toLowerCase())
    return this.profile().colors.find(ok) ?? (lb > 150 ? '#2563eb' : '#f5b800')
  }

  addPreset(it: LibItem): void {
    this.pendLink = null
    if (it.mode && it.mode !== 'back') {
      this.addShape(it.mode as ShapeLayer['kind'])
      return
    }
    if (!it.make) return
    const a = this.presetCol()
    const ls = it.make(a, ink(a)).map(([type, p]) => L(type, p))
    const root = ls[0]
    if (!root) return
    for (const l of ls.slice(1)) l.link = root.id
    this.edit((d) => {
      if (it.mode === 'back') d.layers.splice(0, 0, ...ls)
      else d.layers.push(...ls)
    })
    this.set({ sel: root.id, multi: [], logoOpen: false, shapeOpen: false, barSel: null })
  }

  detachBar(id: string): void {
    const l = this.layer(id)
    const b = barBox(l)
    if (!l || l.type !== 'text' || !b) return
    const nl = L('shape', { kind: 'line', x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, radius: 0, fill: l.barColor, op: l.op })
    this.edit((d) => {
      const i = d.layers.findIndex((x) => x.id === id)
      const t = d.layers[i]
      if (!t || t.type !== 'text') return
      t.bar = false
      d.layers.splice(i + 1, 0, nl)
    })
    this.set({ sel: nl.id, multi: [], barSel: null })
    this.flash('Understreken er nå et eget lag og følger ikke lenger teksten.')
  }

  delLayer(id: string): void {
    this.edit((d) => {
      d.layers = d.layers.filter((x) => x.id !== id)
      for (const x of d.layers) if (x.link === id) x.link = null
    })
    this.set({ sel: null, multi: [] })
  }

  dupLayer(id: string): void {
    const nid = uid()
    this.edit((d) => {
      const i = d.layers.findIndex((x) => x.id === id)
      const src = d.layers[i]
      if (!src) return
      const c = clone(src)
      c.id = nid
      c.x += 40
      c.y += 40
      c.role = null
      d.layers.splice(i + 1, 0, c)
    })
    this.set({ sel: nid })
  }

  moveZ(id: string, dir: 1 | -1): void {
    this.edit((d) => {
      const i = d.layers.findIndex((x) => x.id === id)
      const j = i + dir
      const a = d.layers[i]
      const b = d.layers[j]
      if (i < 0 || !a || !b) return
      d.layers[i] = b
      d.layers[j] = a
    })
  }

  // ---------- kopier og lim inn (også mellom maler og faner) ----------

  getClip(): Layer[] {
    let c: { layers?: unknown } | null = null
    try {
      c = JSON.parse(this.d.storage.get(CLIP_KEY) ?? 'null') as { layers?: unknown } | null
    } catch {
      c = null
    }
    if (!c || !Array.isArray(c.layers)) c = this.clip
    return c && Array.isArray(c.layers) ? (c.layers as Layer[]).filter((l) => l && ['text', 'image', 'shape', 'glow'].includes(l.type)).slice(0, 60) : []
  }

  selIds(): string[] {
    const m = this.s.multi
    return m.length > 1 ? m.slice() : this.s.sel ? [this.s.sel] : []
  }

  copyLayers(cut: boolean): boolean {
    const d = this.s.doc
    const ids = this.selIds()
    if (!d || !ids.length) return false
    const pick = d.layers.filter((l) => ids.includes(l.id) || (!!l.link && ids.includes(l.link)))
    const clip = { v: 1, t: this.now(), layers: clone(pick) }
    this.clip = clip
    this.d.storage.set(CLIP_KEY, JSON.stringify(clip))
    if (cut) {
      const gone = pick.map((l) => l.id)
      this.edit((dd) => {
        dd.layers = dd.layers.filter((x) => !gone.includes(x.id))
        for (const x of dd.layers) if (x.link && gone.includes(x.link)) x.link = null
      })
      this.set({ sel: null, multi: [], barSel: null })
      this.flash(pick.length > 1 ? 'Lagene er klippet ut.' : 'Laget er klippet ut.')
    } else this.flash(pick.length > 1 ? 'Lagene er kopiert. Lim inn med Ctrl/Cmd + V på hvilken som helst side.' : 'Laget er kopiert. Lim inn med Ctrl/Cmd + V på hvilken som helst side.')
    return true
  }

  pasteLayers(at: { x: number; y: number } | null): void {
    const d = this.s.doc
    const src = this.getClip()
    if (!d || !src.length) {
      this.flash('Ingenting å lime inn. Kopier et lag først.')
      return
    }
    const map: Record<string, string> = {}
    for (const l of src) map[l.id] = uid()
    const b = gbox(src)
    const same = src.some((l) => d.layers.some((x) => x.id === l.id))
    let dx = same ? 40 : 0
    let dy = same ? 40 : 0
    if (at) {
      dx = Math.round(at.x - (b.x + b.w / 2))
      dy = Math.round(at.y - (b.y + b.h / 2))
    }
    const roles = new Set(d.layers.map((l) => l.role).filter(Boolean))
    const add = src.map((l) => {
      const c = clone(l)
      c.id = map[l.id] ?? uid()
      c.link = l.link ? (map[l.link] ?? null) : null
      c.x = Math.round(c.x + dx)
      c.y = Math.round(c.y + dy)
      if (c.role && roles.has(c.role)) c.role = null
      return c
    })
    for (const l of add) if (l.type === 'image' && l.src) void this.d.images.load(l.src)
    this.edit((dd) => {
      dd.layers.push(...add)
    })
    const newIds = new Set(Object.values(map))
    const top = add.filter((l) => !l.link || !newIds.has(l.link)).map((l) => l.id)
    this.set(top.length > 1 ? { sel: top[0] ?? null, multi: top, barSel: null, ctx: null } : { sel: top[0] ?? add[0]?.id ?? null, multi: [], barSel: null, ctx: null })
    this.flash(add.length > 1 ? 'Lagene er limt inn.' : 'Laget er limt inn.')
  }

  flipSel(axis: 'x' | 'y'): void {
    const ids = this.selIds()
    if (!ids.length) return
    this.edit((d) => {
      for (const l of d.layers) {
        if (!ids.includes(l.id)) continue
        if (axis === 'x' && l.type === 'image') l.flip = !l.flip
        else if (axis === 'x') l.flipX = !l.flipX
        else l.flipY = !l.flipY
      }
    })
  }

  // ---------- grupper ----------

  toggleMulti(id: string): void {
    this.set((s) => {
      const m = s.multi.length > 1 ? s.multi.slice() : s.sel ? [s.sel] : []
      const i = m.indexOf(id)
      if (i >= 0) m.splice(i, 1)
      else m.push(id)
      return { multi: m.length > 1 ? m : [], sel: m.length ? (m[m.length - 1] ?? null) : null, logoOpen: false }
    })
  }

  moveGroup(dx: number, dy: number): void {
    const ids = this.s.multi
    if (!dx && !dy) return
    this.edit((d) => {
      for (const l of d.layers) {
        if ((ids.includes(l.id) || (!!l.link && ids.includes(l.link) && !ids.includes(l.id))) && !l.lock) {
          l.x += dx
          l.y += dy
        }
      }
    }, 'gmove')
  }

  delGroup(): void {
    const ids = this.s.multi
    this.edit((d) => {
      d.layers = d.layers.filter((l) => !ids.includes(l.id))
      for (const x of d.layers) if (x.link && ids.includes(x.link)) x.link = null
    })
    this.set({ sel: null, multi: [] })
  }

  scaleGroup(k: number): void {
    const ids = this.s.multi
    const b = gbox((this.s.doc?.layers ?? []).filter((l) => ids.includes(l.id)))
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const r = (v: number) => Math.round(v * 100) / 100
    this.edit((d) => {
      for (const l of d.layers) {
        if (!ids.includes(l.id)) continue
        const nw = l.w * k
        const nh = l.h * k
        const ncx = cx + (l.x + l.w / 2 - cx) * k
        const ncy = cy + (l.y + l.h / 2 - cy) * k
        l.x = Math.round(ncx - nw / 2)
        l.y = Math.round(ncy - nh / 2)
        l.w = Math.round(nw)
        l.h = Math.round(nh)
        if (l.type === 'text') {
          l.size = Math.max(6, Math.round(l.size * k))
          l.barH = Math.max(1, r(l.barH * k))
        }
        if (l.type === 'image') {
          l.radius = r(l.radius * k)
          l.border = r(l.border * k)
        }
        if (l.type === 'shape') {
          l.radius = r(l.radius * k)
          l.stroke = r(l.stroke * k)
        }
      }
    }, 'gscale')
  }

  // ---------- grunnoppsettets plassering ----------

  private baseMap(): Record<string, Layer> {
    const c = this.cat()
    if (!c || this.s.doc?.lay) return {}
    if (this.bmCat !== c) {
      this.bmCat = c
      const m: Record<string, Layer> = {}
      for (const b of this.catBase(c).layers) m[b.id] = b
      this.bm = m
    }
    return this.bm
  }

  baseFor(l: Layer): Layer | null {
    const m = this.baseMap()
    if (m[l.id]) return m[l.id] ?? null
    const d = this.s.doc
    if (!d) return null
    const same = d.layers.filter((x) => x.type === l.type && !m[x.id])
    const i = same.indexOf(l)
    const bs = Object.values(m).filter((b) => b.type === l.type && !d.layers.some((x) => x.id === b.id))
    return i >= 0 && i < bs.length ? (bs[i] ?? null) : null
  }

  movedFromBase(l: Layer): boolean {
    const b = this.baseFor(l)
    return !!b && (['x', 'y', 'w', 'h', 'rot'] as const).some((k) => Math.round(b[k] || 0) !== Math.round(l[k] || 0))
  }

  resetPos(id: string): void {
    const l = this.layer(id)
    const b = l && this.baseFor(l)
    if (!b) return
    this.setL(id, { x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot || 0 }, 'reset:' + id)
    this.flash('Laget er flyttet tilbake til grunnoppsettet.')
  }

  /** Grunnoppsettets farger og fonter (vises først i fargevelgere og fontlisten). */
  profile(): { colors: string[]; fonts: string[] } {
    const c = this.cat()
    if (!c) return { colors: [], fonts: [] }
    if (this.pfCat !== c) {
      this.pfCat = c
      this.pf = profileOf(this.catBase(c))
    }
    return this.pf
  }

  weights(font: string): readonly number[] {
    return FONTS.find((f) => f[0] === font)?.[1] ?? [400, 700]
  }

  // ---------- zoom ----------

  setZoom(z: number): void {
    this.set({ zoom: Math.max(1, Math.min(4, z)) })
  }

  zoomIn(): void {
    const z = this.s.zoom
    this.setZoom(ZOOMS.find((x) => x > z + 0.001) ?? 4)
  }

  zoomOut(): void {
    const z = this.s.zoom
    this.setZoom([...ZOOMS].reverse().find((x) => x < z - 0.001) ?? 1)
  }

  // ---------- dra og endre størrelse på lerretet ----------

  /** Trykk på lerretet (p i 1920 × 1080). */
  pointerDown(p: { x: number; y: number }, shift: boolean): boolean {
    const d = this.s.doc
    if (!d || this.s.narrow) return false
    const cur = this.layer(this.s.sel)
    const m = this.s.multi
    if (shift) {
      const t = hit(d.layers, p)
      if (t) this.toggleMulti(t.id)
      return false
    }
    const gm = m.length > 1 ? hit(d.layers.filter((x) => m.includes(x.id)), p) : null
    const target = gm ?? (cur && !cur.lock && !cur.hidden && hit([cur], p) ? cur : hit(d.layers, p))
    if (!target) {
      this.set({ sel: null, multi: [], logoOpen: false, shapeOpen: false, barSel: null })
      return false
    }
    this.begin('move', target, p, null)
    return true
  }

  handleDown(p: { x: number; y: number }, h: string): boolean {
    const l = this.layer(this.s.sel)
    if (!l || l.lock) return false
    this.begin('resize', l, p, h)
    return true
  }

  private begin(mode: 'move' | 'resize', l: Layer, p: { x: number; y: number }, h: string | null) {
    const d = this.s.doc
    if (!d) return
    const m = this.s.multi
    const inG = mode === 'move' && m.length > 1 && m.includes(l.id)
    const gl = inG ? d.layers.filter((x) => m.includes(x.id) && !x.lock) : null
    const gb = gl?.length ? gbox(gl) : null
    const mv = gb && gl ? gl.map((x) => x.id) : [l.id]
    const kids = mode === 'move' ? d.layers.filter((x) => x.link && mv.includes(x.link) && !mv.includes(x.id) && !x.lock).map((x) => ({ id: x.id, x: x.x, y: x.y })) : []
    this.drag = {
      kids, mode, id: l.id, p0: p, h, keep: l.type === 'image', moved: false, snap: JSON.stringify(d),
      l0: gb ? { ...gb, rot: 0 } : { x: l.x, y: l.y, w: l.w, h: l.h, rot: l.rot || 0, type: l.type },
      group: gb && gl ? gl.map((x) => ({ id: x.id, x: x.x, y: x.y })) : null,
    }
    if (!inG && (this.s.sel !== l.id || m.length)) this.set({ sel: l.id, multi: [], logoOpen: false, shapeOpen: false, barSel: null })
  }

  /** k = antall bildepunkter per skjermpunkt (terskel for hjelpelinjer og for når et trykk blir et drag). */
  pointerMove(p: { x: number; y: number }, k: number, alt: boolean, shift: boolean): void {
    const g = this.drag
    const doc = this.s.doc
    if (!g || !doc) return
    const dx = p.x - g.p0.x
    const dy = p.y - g.p0.y
    const L0 = g.l0
    if (!g.moved && Math.hypot(dx, dy) < 3 * k) return
    if (!g.moved) {
      g.moved = true
      const snap = g.snap
      this.lastKey = null
      this.set((s) => ({ hist: [...s.hist, snap].slice(-60), fut: [], dirty: true }))
    }
    let patch: { x: number; y: number; w?: number; h?: number }
    let gx: number[] = []
    let gy: number[] = []
    if (g.mode === 'move') {
      let x = L0.x + dx
      let y = L0.y + dy
      const th = 8 * k
      if (snapActive(alt)) {
        const xs = [0, W / 2, W]
        const ys = [0, H / 2, H]
        for (const o of doc.layers) {
          if (o.id === g.id || g.group?.some((q) => q.id === o.id) || g.kids.some((q) => q.id === o.id) || o.hidden || o.type === 'glow') continue
          xs.push(o.x, o.x + o.w / 2, o.x + o.w)
          ys.push(o.y, o.y + o.h / 2, o.y + o.h)
        }
        const offs = (s: number) => [0, s / 2, s]
        const snap = (pos: number, size: number, cs: number[]) => {
          let b: number | null = null
          for (const f of offs(size)) for (const c of cs) {
            const dd = c - (pos + f)
            if (Math.abs(dd) < th && (b === null || Math.abs(dd) < Math.abs(b))) b = dd
          }
          return b
        }
        const hits = (pos: number, size: number, cs: number[], lim: number) => {
          const out: number[] = []
          for (const f of offs(size)) for (const c of cs) if (Math.abs(c - (pos + f)) < 0.5 && c > 0 && c < lim && !out.includes(c)) out.push(c)
          return out
        }
        const bx = snap(x, L0.w, xs)
        if (bx !== null) x += bx
        const by = snap(y, L0.h, ys)
        if (by !== null) y += by
        gx = hits(x, L0.w, xs, W)
        gy = hits(y, L0.h, ys, H)
      }
      patch = { x: Math.round(x), y: Math.round(y) }
    } else {
      const hd = g.h ?? 'br'
      const sx = hd[1] === 'l' ? -1 : 1
      const sy = hd[0] === 't' ? -1 : 1
      const a = (-L0.rot * Math.PI) / 180
      const ldx = dx * Math.cos(a) - dy * Math.sin(a)
      const ldy = dx * Math.sin(a) + dy * Math.cos(a)
      const mn = L0.type === 'shape' ? 1 : 20
      let w = Math.max(mn, L0.w + sx * ldx)
      let h = Math.max(mn, L0.h + sy * ldy)
      if (g.keep !== shift) {
        const r = L0.w / L0.h
        if (w / h > r) h = w / r
        else w = h * r
      }
      const b = (L0.rot * Math.PI) / 180
      const ox = (sx * (w - L0.w)) / 2
      const oy = (sy * (h - L0.h)) / 2
      const cx = L0.x + L0.w / 2 + ox * Math.cos(b) - oy * Math.sin(b)
      const cy = L0.y + L0.h / 2 + ox * Math.sin(b) + oy * Math.cos(b)
      patch = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) }
    }
    this.set((s) => {
      if (!s.doc) return null
      const d = clone(s.doc)
      const ox = patch.x - L0.x
      const oy = patch.y - L0.y
      if (g.group) {
        for (const q of g.group) {
          const l = d.layers.find((x) => x.id === q.id)
          if (l) {
            l.x = q.x + ox
            l.y = q.y + oy
          }
        }
      } else {
        const l = d.layers.find((x) => x.id === g.id)
        if (l) Object.assign(l, patch)
      }
      for (const q of g.kids) {
        const kk = d.layers.find((x) => x.id === q.id)
        if (kk) {
          kk.x = q.x + ox
          kk.y = q.y + oy
        }
      }
      return { doc: d, gx, gy }
    })
  }

  pointerHit(p: { x: number; y: number }): Layer | null {
    return this.s.doc ? hit(this.s.doc.layers, p) : null
  }

  /** Høyreklikkmenyen på lerretet (kopier, lim inn, speil, dupliser, slett). */
  openContext(x: number, y: number, p: { x: number; y: number }, t: Layer | null): void {
    const m = this.s.multi
    if (t && !(m.length > 1 && m.includes(t.id))) this.set({ sel: t.id, multi: [], barSel: null })
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
    this.set({ ctx: { x: Math.min(x, vw - 220), y: Math.min(y, vh - 260), p, on: !!t || this.selIds().length > 0 } })
  }

  pointerUp(): void {
    this.drag = null
    this.lastKey = null
    if (this.s.gx.length || this.s.gy.length) this.set({ gx: [], gy: [] })
  }

  // ---------- bilder ----------

  /** Hvor neste bilde skal: dialogene «Dine medier» / «Fellesmappe», eller filvelgeren (håndteres av grensesnittet). */
  openPicker(kind: 'file' | 'media' | 'cloud', target: AddTarget): AddTarget {
    this.set({ logoOpen: false, shapeOpen: false, libOpen: false, picker: kind === 'file' ? null : { kind, target } })
    if (kind === 'file') this.d.pickFile(target)
    return target
  }

  closePicker(): void {
    this.pendLink = null
    this.set({ picker: null })
  }

  /** Et bilde fra Dine medier eller Fellesmappe (allerede lagret): `src` er `m:<id>` eller `ch:<id>`. */
  async placeExisting(src: string, t: AddTarget): Promise<void> {
    this.set({ picker: null })
    const probe = this.s.doc
    if (!probe) return
    if (t.mode === 'add' && src.startsWith('m:') && countImgs(probe) >= MAX_IMG && !this.hasSrc(probe, src)) {
      this.flash('Maks 5 bilder per mal. Fjern et bilde først.')
      return
    }
    await this.d.images.load(src)
    if (!this.alive) return
    this.placeSrc(src, t)
  }

  private hasSrc(d: Doc, src: string): boolean {
    return d.layers.some((l) => l.type === 'image' && l.src === src) || d.bg.src === src
  }

  private placeSrc(src: string, t: AddTarget) {
    if (t.mode === 'add') {
      const en = this.d.images.get(src)
      const iw = en ? en.img.naturalWidth : 4
      const ih = en ? en.img.naturalHeight : 3
      const k = Math.min((t.logo ? 520 : 900) / iw, (t.logo ? 300 : 700) / ih)
      const w = Math.round(iw * k)
      const h = Math.round(ih * k)
      this.addLayer(L('image', { src, x: Math.round(960 - w / 2), y: Math.round(540 - h / 2), w, h, fit: t.logo ? 'contain' : 'cover' }))
    } else if (t.mode === 'replace') this.setL(t.id, { src, orig: null })
    else this.setBg({ src, orig: null, type: 'image' })
  }

  /** Et nytt bilde fra disken eller utklippstavlen: legges i Dine medier og brukes i malen. */
  async addFile(f: Blob, t: AddTarget): Promise<void> {
    if (!/^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.type || '') || f.size > 40 * 1024 * 1024) {
      this.flash('Velg et bilde (JPG, PNG eller WebP, maks 40 MB).')
      return
    }
    const doc = this.s.doc
    if (!doc) {
      this.pendFile = f
      this.flash('Velg en mal, så legges bildet inn.')
      return
    }
    const probe = clone(doc)
    if (t.mode === 'replace') {
      const l = probe.layers.find((x) => x.id === t.id)
      if (l?.type === 'image') l.src = null
    }
    if (t.mode === 'bg') probe.bg.src = null
    if (countImgs(probe) >= MAX_IMG) {
      this.flash('Maks 5 bilder per mal. Fjern et bilde først.')
      return
    }
    this.set({ busyImg: true })
    let src: string
    try {
      src = await this.d.putImage(f, (f as File).name || 'bilde')
      await this.d.images.load(src)
    } catch {
      this.set({ busyImg: false })
      this.flash('Klarte ikke å lese bildet. Prøv JPG eller PNG.')
      return
    }
    if (!this.alive) return
    this.set({ busyImg: false })
    this.placeSrc(src, t)
  }

  async runAI(id: string, kind: 'person' | 'object'): Promise<void> {
    if (this.s.ai) return
    const l = this.layer(id)
    if (!l || l.type !== 'image' || !l.src || !l.src.startsWith('m:')) return
    this.set({ ai: { id, phase: 'model', pct: 0 } })
    try {
      const src = await this.d.cutout(l.src, kind, (phase, pct) => this.alive && this.set({ ai: { id, phase, pct } }))
      await this.d.images.load(src)
      if (!this.alive) return
      const cur = this.layer(id)
      this.setL(id, { src, orig: (cur?.type === 'image' && cur.orig) || l.src })
      this.set({ ai: null })
      this.flash('Bakgrunnen er fjernet. Under «Beskjær» kan du kutte bildet.')
    } catch {
      if (!this.alive) return
      this.set({ ai: null })
      this.flash(typeof navigator !== 'undefined' && navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å fjerne bakgrunnen. Prøv et annet bilde eller en nyere nettleser.')
    }
  }

  // ---------- finjuster utklippet ----------

  /** Åpner maskeredigeringen for et utklipp (laget med AI eller tidligere finjustert). Originalen tas vare på. */
  async openMaskEdit(id: string): Promise<void> {
    const l = this.layer(id)
    const me = this.d.maskEdit
    if (!me || !l || l.type !== 'image' || !l.src || !l.orig || this.s.maskEdit) return
    try {
      const { image, mask } = await me.open(l.orig, l.src)
      if (this.alive) this.set({ maskEdit: { id, image, mask, busy: false } })
    } catch {
      if (this.alive) this.flash('Klarte ikke å åpne utklippet.')
    }
  }

  /** «Bruk»: originalen med den redigerte masken lagres som ny versjon og brukes i laget. */
  async applyMaskEdit(): Promise<void> {
    const e = this.s.maskEdit
    const me = this.d.maskEdit
    const l = e && this.layer(e.id)
    if (!e || !me || !l || l.type !== 'image' || !l.orig || e.busy) return
    this.set({ maskEdit: { ...e, busy: true } })
    try {
      const src = await me.save(l.orig, e.image, e.mask)
      await this.d.images.load(src)
      if (!this.alive) return
      this.setL(e.id, { src, orig: l.orig })
      this.set({ maskEdit: null })
      this.flash('Utklippet er oppdatert.')
    } catch {
      if (!this.alive) return
      this.set({ maskEdit: { ...e, busy: false } })
      this.flash('Klarte ikke å lagre utklippet. Nettleseren kan være full.')
    }
  }

  closeMaskEdit(): void {
    if (!this.s.maskEdit?.busy) this.set({ maskEdit: null })
  }

  selectInMask(x: number, y: number): Promise<Uint8ClampedArray | null> {
    const e = this.s.maskEdit
    return e && this.d.maskEdit ? this.d.maskEdit.select(e.image, x, y) : Promise.resolve(null)
  }

  // ---------- beskjæring ----------

  openCrop(id: string): void {
    const l = this.layer(id)
    if (!l || l.type !== 'image' || !l.src || !this.d.images.get(l.src)) return
    this.set({ cropId: id, cropBox: { cL: l.cL || 0, cT: l.cT || 0, cR: l.cR || 0, cB: l.cB || 0 }, sel: id, multi: [] })
  }

  setCropBox(b: CropBox): void {
    this.set({ cropBox: b })
  }

  closeCrop(apply: boolean): void {
    const S = this.s
    if (apply && S.cropId) this.applyCropTo(S.cropId, S.cropBox)
    this.set({ cropId: null })
  }

  cropTrim(): void {
    const l = this.layer(this.s.cropId)
    const t = l?.type === 'image' ? this.d.renderer.alphaBox(l.src) : null
    if (t) this.set({ cropBox: t })
    else this.flash('Bildet har ingen gjennomsiktige kanter å fjerne.')
  }

  trim(id: string): void {
    const l = this.layer(id)
    if (!l || l.type !== 'image' || !l.src) return
    const b = this.d.renderer.alphaBox(l.src)
    if (!b) {
      this.flash('Bildet har ingen gjennomsiktige kanter å fjerne.')
      return
    }
    this.applyCropTo(id, b)
    this.flash('Tomme kanter er fjernet.')
  }

  /** Beskjærer; et «Vis hele»-bilde uten rotasjon beholder plassen sin i bildet (boksen krymper rundt utsnittet). */
  applyCropTo(id: string, nIn: Partial<CropBox>): void {
    const l = this.layer(id)
    if (!l || l.type !== 'image') return
    const en = this.d.images.get(l.src)
    const n = { cL: nIn.cL || 0, cT: nIn.cT || 0, cR: nIn.cR || 0, cB: nIn.cB || 0 }
    let patch: LayerPatch = n
    if (en && l.fit === 'contain' && !l.rot) {
      const nw = en.img.naturalWidth
      const nh = en.img.naturalHeight
      const o = { cL: l.cL || 0, cT: l.cT || 0, cR: l.cR || 0, cB: l.cB || 0 }
      const iwO = nw * (1 - o.cL - o.cR)
      const ihO = nh * (1 - o.cT - o.cB)
      const sc = Math.min(l.w / iwO, l.h / ihO) * (l.zoom || 1)
      const fx = l.x + (l.w - iwO * sc) * l.px - nw * o.cL * sc
      const fy = l.y + (l.h - ihO * sc) * l.py - nh * o.cT * sc
      patch = { ...n, x: Math.round(fx + nw * n.cL * sc), y: Math.round(fy + nh * n.cT * sc), w: Math.max(10, Math.round(nw * (1 - n.cL - n.cR) * sc)), h: Math.max(10, Math.round(nh * (1 - n.cT - n.cB) * sc)), zoom: 1 }
    }
    this.setL(id, patch, `crop:${id}:${this.now()}`)
  }

  // ---------- eksport ----------

  openExport(): void {
    this.set({ exp: true, sel: null, multi: [] })
    void this.calcSize()
  }

  closeExport(): void {
    if (!this.s.expBusy) this.set({ exp: false })
  }

  setExport(p: Partial<Pick<State, 'expRes' | 'expFmt' | 'expT'>>): void {
    const next = { ...p }
    if (next.expFmt === 'jpg') next.expT = false
    this.set(next)
    void this.calcSize()
  }

  private expKey(): { key: string; scale: number; type: string; transparent: boolean } {
    const S = this.s
    const transparent = S.expT && S.expFmt === 'png'
    return { key: `${S.expRes}|${S.expFmt}|${transparent ? 1 : 0}`, scale: S.expRes === '4k' ? 2 : 1, type: S.expFmt === 'jpg' ? 'image/jpeg' : 'image/png', transparent }
  }

  async calcSize(): Promise<void> {
    const doc = this.s.doc
    if (!doc) return
    const k = this.expKey()
    this.sizeKey = k.key
    this.set({ expSize: null })
    try {
      const b = await this.d.renderer.exportBlob(doc, k.scale, k.type, { transparent: k.transparent })
      if (!this.alive || this.sizeKey !== k.key || !b) return
      this.expCache = { key: k.key, b, doc }
      this.set({ expSize: b.size })
    } catch {
      // størrelsen vises ikke
    }
  }

  /** Bildet i valgt oppløsning og format (gjenbruker det som ble laget for størrelsen). */
  async exportBlob(): Promise<Blob> {
    const S = this.s
    if (!S.doc) throw new Error('doc')
    const k = this.expKey()
    const b = this.expCache && this.expCache.key === k.key && this.expCache.doc === S.doc ? this.expCache.b : await this.d.renderer.exportBlob(S.doc, k.scale, k.type, { transparent: k.transparent })
    if (!b) throw new Error('blob')
    return b
  }

  exportName(): string {
    const S = this.s
    return `${slug(S.tplName || this.cat()?.name || '')}-${S.expRes === '4k' ? '4k' : '1080p'}.${S.expFmt}`
  }

  setExpBusy(v: boolean): void {
    this.set({ expBusy: v })
  }

  // ---------- visning (kolonner) ----------

  layoutOf(m: string): ColumnLayout {
    if (m === 'custom') return this.s.customLayout ?? PRESETS.std as ColumnLayout
    return PRESETS[m] ?? (PRESETS.std as ColumnLayout)
  }

  setLayout(m: string): void {
    this.d.storage.set(LAYOUT_KEY, m)
    this.set({ layoutMode: m, viewMenu: false })
  }

  openLc(): void {
    const cur = this.layoutOf(this.s.layoutMode || 'std')
    this.set({ viewMenu: false, lcOpen: true, lcDraft: { cols: [0, 1, 2, 3, 4].map((i) => (cur.cols[i] ?? []).slice()), tabs: [0, 1, 2, 3, 4].map((i) => !!cur.tabs[i]) } })
  }

  lcFrom(preset: string): void {
    const P = PRESETS[preset]
    if (!P) return
    this.set({ lcDraft: { cols: [0, 1, 2, 3, 4].map((i) => (P.cols[i] ?? []).slice()), tabs: [0, 1, 2, 3, 4].map((i) => !!P.tabs[i]) } })
  }

  lcMove(key: PanelKey, slot: number, before: PanelKey | null): void {
    this.set((s) => {
      if (!s.lcDraft) return null
      const cols = s.lcDraft.cols.map((c) => c.filter((k) => k !== key))
      const col = cols[slot]
      if (!col) return null
      const at = before ? col.indexOf(before) : -1
      if (at >= 0) col.splice(at, 0, key)
      else col.push(key)
      return { lcDraft: { cols, tabs: s.lcDraft.tabs.slice() } }
    })
  }

  lcShift(key: PanelKey, dir: 'left' | 'right' | 'up' | 'down'): void {
    const d = this.s.lcDraft
    if (!d) return
    const si = d.cols.findIndex((c) => c.includes(key))
    const col = d.cols[si] ?? []
    const i = col.indexOf(key)
    if (dir === 'left' || dir === 'right') {
      const t = si + (dir === 'left' ? -1 : 1)
      if (t >= 0 && t <= 4) this.lcMove(key, t, null)
      return
    }
    const j = i + (dir === 'up' ? -1 : 1)
    if (j < 0 || j >= col.length) return
    this.set((s) => {
      if (!s.lcDraft) return null
      const c = s.lcDraft.cols.map((x) => x.slice())
      const cc = c[si] as PanelKey[]
      const tmp = cc[i] as PanelKey
      cc[i] = cc[j] as PanelKey
      cc[j] = tmp
      return { lcDraft: { cols: c, tabs: s.lcDraft.tabs } }
    })
  }

  lcTabs(slot: number, on: boolean): void {
    this.set((s) => (s.lcDraft ? { lcDraft: { cols: s.lcDraft.cols, tabs: s.lcDraft.tabs.map((t, i) => (i === slot ? on : t)) } } : null))
  }

  lcApply(): void {
    const d = this.s.lcDraft
    if (!d) return
    const keep = d.cols.map((c, i) => [c, !!d.tabs[i] && c.length > 1] as const).filter((x) => x[0].length)
    const Lx = validLayout({ cols: keep.map((x) => x[0]), tabs: keep.map((x) => x[1]) })
    if (!Lx) return
    this.d.storage.set(CUSTOM_KEY, JSON.stringify(Lx))
    this.d.storage.set(LAYOUT_KEY, 'custom')
    this.set({ customLayout: Lx, layoutMode: 'custom', lcOpen: false, lcDraft: null })
    this.flash('Din egen visning er lagret og brukes neste gang også.')
  }

  // ---------- sikkerhetskopi ----------

  replaceAll(cats: Category[], tpls: Template[]): Promise<void> {
    this.set({ cats })
    void this.d.repo.saveCats(cats).catch(() => undefined)
    this.queueShared()
    return this.persistTpls(tpls).then(() => undefined)
  }

  setBackupBusy(v: boolean): void {
    this.set({ backupBusy: v })
  }

  /** Enkle felt grensesnittet setter direkte (menyer, dialoger). */
  ui(p: Partial<Pick<State, 'viewMenu' | 'lcOpen' | 'lcDraft' | 'ctx' | 'save' | 'logoOpen' | 'shapeOpen' | 'libOpen' | 'narrow' | 'colTab' | 'dropOn' | 'barSel' | 'sel' | 'multi'>>): void {
    this.set(p)
  }

  /** Et bilde som deles inn (lim inn, «Åpne i …»): legges i malen, eller venter til en mal er åpen. */
  receive(f: Blob): void {
    if (this.s.view === 'edit' && this.s.doc) void this.addFile(f, { mode: 'add' })
    else {
      this.pendFile = f
      this.flash('Velg en mal, så legges bildet inn.')
    }
  }

  get hasCombos(): boolean {
    return COMBOS.length > 0
  }

  get library(): typeof LIBRARY {
    return LIBRARY
  }
}

export function slug(s: string): string {
  return String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'thumbnail'
}
