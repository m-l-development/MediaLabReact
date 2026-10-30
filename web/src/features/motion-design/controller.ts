import type { ToolId } from '../../domain/tool'
import { createStore, type Store } from '../../shared/lib/store'
import { audioStats, beats, clearAudioCache, toWav, wave } from './engine/audio'
import { exportMp4 } from './engine/export'
import {
  clamp, colorClip, create, exportSize, fixLanes, fmtEta, fmtT, FONTS, FORMATS, fromSrt, layout, mediaClip, mixOf, music, normalize,
  ovDur, overlay, srcTime, TEMPLATES, text, toSrt, TRANS, totalDur, uid, usedMedia, voiced, duckAt,
  type Clip, type Format, type Media, type MediaClip, type Music, type Overlay, type Project, type Sub, type TextItem, type TrackKey,
} from './engine/model'
import { pack, unpack } from './engine/packfile'
import { drawFrame, type MediaEls, type Rect, type Rects } from './engine/render'
import { transcribe } from './engine/transcribe'
import type { FolderStatus, MotionFiles } from './files'
import type { MdEntry, MdRepo } from './repo'
import type { Phrase, Vars } from './texts'
import type { DirHandle } from '../../infrastructure/fs/project-folders'

export type Kind = 'clip' | 'text' | 'sub' | 'music' | 'ov'
export interface Sel { type: Kind; id: string }
export interface Msg { p: Phrase; v?: Vars }
export type Tab = 'media' | 'text' | 'subs' | 'audio' | 'logo' | 'trans'
export type View = 'home' | 'format' | 'tpl' | 'edit'
export type FileMode = 'lib' | 'replace' | 'music' | 'vo' | 'logo' | 'drop'
export interface Loc { v?: string; f?: string; p?: string }
export interface MenuItem { l: Phrase; k: string; danger: boolean; click: () => void }
export interface Menu { x: number; y: number; items: (MenuItem | 'sep')[] }
export interface Xform { type: Kind; id: string; mode: 'move' | 'crop' }
export interface ExpState { q: '1080-30' | '1080-60' | '4k-30'; busy: boolean; pct: number; phase: Msg | null; msg: Msg | null; err: boolean }
export interface AiState { lang: 'norwegian' | 'english'; model: string; busy: boolean; msg: Msg | null; err: boolean }
export interface Hit { kind: 'music' | 'clip' | 'ov' | 'stage'; t: number; lane?: number; idx?: number }
export interface TransHit { kind: 'tin' | 'tout' | 'clip'; id: string; t: number }

export interface MState {
  ready: boolean
  view: View
  entries: MdEntry[]
  fmt: Format | null
  cw: string
  ch: string
  tplThumbs: Record<string, string>
  msg: Msg | null
  proj: Project | null
  projectId: string | null
  sel: Sel | null
  multi: Sel[]
  t: number
  playing: boolean
  zoom: number
  tab: Tab
  replaceFor: string | null
  exp: ExpState | null
  ai: AiState
  toast: Msg | null
  saved: Phrase
  autosave: boolean
  /** Avansert modus (huskes på enheten): ekstra verktøy i egenskapspanelet. */
  adv: boolean
  pv: { w: number; h: number; cw: number; ch: number }
  narrow: boolean
  vw: number
  dragOver: boolean
  clipDrag: { id: string; dx: number } | null
  packing: boolean
  secOpen: Record<string, boolean>
  drawer: 'l' | 'r'
  menu: Menu | null
  trDrag: { type: string; x: number; y: number; hit: TransHit | null } | null
  medDrag: { id: string; name: string; x: number; y: number; hit: Hit | null } | null
  xform: Xform | null
  curveCh: 'm' | 'r' | 'g' | 'b'
  folder: FolderStatus | null
  folderDlg: boolean
  folderBusy: Msg | null
  waiting: { pid: string; name: string }[]
  picker: { kind: 'media' | 'cloud'; mode: FileMode } | null
  vo: { since: number; secs: number } | null
  hasClip: boolean
  hasLook: { aud: boolean } | null
  lastExp: boolean
  /** Øker når noe utenfor tilstanden er endret (bølgeformer, filer, historikk). */
  rev: number
}

export interface MDeps {
  repo: MdRepo
  files: MotionFiles
  storage: { get(k: string): string | null; set(k: string, v: string): void }
  confirm(p: Phrase, v?: Vars): boolean
  /** Oversetter en tekst (også meldinger fra motoren). */
  t(p: Phrase, v?: Vars): string
  pickFile(mode: FileMode, accept: string): void
  pickSrt(): void
  pickProject(): void
  pickDirectory(opts: { id: string; startIn?: string }): Promise<DirHandle | null>
  foldersSupported(): boolean
  download(blob: Blob, name: string): void
  /** Lagrer et bilde eller en video i Dine medier. → ID i Dine medier. */
  toMedia(blob: Blob, name: string): Promise<string>
  /** «Bruk i …» (SHR-02): åpner et annet verktøy med filen fra Dine medier. */
  openIn?(tool: ToolId, assetId: string): void
  onLocation(loc: Loc, replace: boolean): void
  now?: () => number
}

export const KEYS = { clip: 'clips', text: 'texts', sub: 'subs', music: 'music', ov: 'ov' } as const
const TK: Record<Kind, TrackKey> = { clip: 'video', text: 'text', sub: 'subs', music: 'music', ov: 'ov' }
export const LANEH = { text: 26, ov: 40, music: 30 } as const
type LaneKind = keyof typeof LANEH
const isLane = (k: string): k is LaneKind => k in LANEH
const LIM: Record<'video' | 'image' | 'audio', number> = { video: 4e9, image: 60e6, audio: 600e6 }
export const TRDUR: Record<string, number> = { whip: 0.4, match: 0.2, ramp: 0.5, xzoom: 0.6, chroma: 0.5, leak: 0.9, mask: 0.7 }
export const HX = [-1, 0, 1, 1, 1, 0, -1, -1]
export const HY = [-1, -1, -1, 0, 1, 1, 1, 0]
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mov,.m4v'
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
export const ALL_ACCEPT = `${VIDEO_ACCEPT},${IMAGE_ACCEPT},audio/*`

/** Ferdige tekster (fanen «Tekst»). */
export const PRESETS: { l: Phrase; d: Phrase; o: Partial<TextItem> }[] = [
  { l: 'Tittel', d: 'Stor overskrift', o: { text: 'Tittel', size: 130, weight: 800, upper: true, anim: 'rise' } },
  { l: 'Undertittel', d: 'Mindre linje under tittelen', o: { text: 'Undertittel', size: 56, weight: 500, y: 0.62, anim: 'fade' } },
  { l: 'Brødtekst', d: 'Lengre tekst', o: { text: 'Skriv teksten her', size: 42, weight: 400, maxW: 0.7, anim: 'fade' } },
  { l: 'Navneskilt', d: 'Navn nede til venstre', o: { text: 'Navn Navnesen', size: 54, weight: 800, color: '#111111', box: 'block', bg: '#ffffff', align: 'left', x: 0.07, y: 0.82, anim: 'slide' } },
  { l: 'Etikett', d: 'Liten merkelapp', o: { text: 'Nyhet', size: 34, weight: 800, upper: true, track: 0.16, color: '#111111', box: 'block', bg: '#f5b82c', y: 0.3, anim: 'pop' } },
  { l: 'Oppfordring', d: 'Tekst som ligner en knapp', o: { text: 'Meld deg på', size: 44, weight: 800, upper: true, track: 0.1, box: 'block', bg: '#ff5a36', y: 0.75, anim: 'pop' } },
  { l: 'Sitat', d: 'Skrives frem bokstav for bokstav', o: { text: '«Sitat her»', font: 'Playfair Display', italic: true, weight: 500, size: 80, maxW: 0.78, anim: 'type', dur: 6 } },
  { l: 'Nedtelling', d: 'Teller ned sekunder', o: { text: '10', countdown: true, cdFrom: 10, font: 'Bebas Neue', weight: 400, size: 300, anim: 'none', dur: 10 } },
]

const TRA = '#2a2a2a'
const TRB = '#c9c5bc'
/** Overgangsflisene (fanen «Overganger»): nøkkel, navn og forhåndsvisning. */
export const TRSTD: [string, Phrase, string][] = [
  ['none', 'Hard kutt', `linear-gradient(90deg, ${TRA} 49%, #f5b82c 49% 51%, ${TRB} 51%)`], ['fade', 'Kryssoverblending', `linear-gradient(90deg, ${TRA}, ${TRB})`], ['dip', 'Via svart', `linear-gradient(90deg, ${TRA}, #000000 50%, ${TRB})`],
  ['whip', 'Sveip', `repeating-linear-gradient(90deg, ${TRA} 0 7px, ${TRB} 7px 10px)`], ['xzoom', 'Kryss-zoom', `repeating-radial-gradient(circle, ${TRA} 0 6px, ${TRB} 6px 8px)`], ['ramp', 'Fartsrampe', `repeating-linear-gradient(110deg, ${TRA} 0 4px, ${TRB} 4px 12px)`],
  ['match', 'Match cut', `radial-gradient(circle at 30% 50%, ${TRB} 14%, transparent 15%), radial-gradient(circle at 70% 50%, ${TRA} 14%, transparent 15%), linear-gradient(90deg, ${TRA} 50%, ${TRB} 50%)`], ['mask', 'Maskering', `linear-gradient(90deg, ${TRB} 36%, #000000 44% 56%, ${TRA} 64%)`],
  ['chroma', 'Kromatisk glitch', 'linear-gradient(90deg, #b8383b 0 33%, #2f9a5c 33% 66%, #3b58c4 66%)'], ['leak', 'Lyslekkasje', `radial-gradient(circle at 40% 40%, #ffe7b0, #ff8a3c 35%, #7a1e12 70%, ${TRA})`],
  ['dipw', 'Via hvitt', `linear-gradient(90deg, ${TRA}, #ffffff 50%, ${TRB})`], ['push-l', 'Skyv mot venstre', `linear-gradient(90deg, ${TRA} 45%, #111111 45% 55%, ${TRB} 55%)`], ['cover-l', 'Dekk fra høyre', `linear-gradient(90deg, ${TRA} 55%, ${TRB} 55%)`], ['wipe-r', 'Visk mot høyre', `linear-gradient(90deg, ${TRB} 50%, ${TRA} 50%)`],
  ['zoom-in', 'Zoom inn', `radial-gradient(circle, ${TRB} 20%, ${TRA} 72%)`], ['blur', 'Uskarp', `linear-gradient(90deg, ${TRA} 15%, ${TRB} 85%)`], ['iris', 'Sirkel', `radial-gradient(circle, ${TRB} 34%, ${TRA} 35%)`],
]
export const LINKC = ['#f5b82c', '#3ccf7a', '#5b7cff', '#ff5a5f', '#c77dff', '#2ec4d6']
export const linkColor = (link: string): string => LINKC[[...link].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % LINKC.length] ?? '#f5b82c'

type Item = Clip | TextItem | Sub | Music | Overlay
type AnyRec = Record<string, unknown>
const itemsOf = (p: Project, k: Kind): Item[] => p[KEYS[k]] as Item[]
const startOf = (x: Item): number => ('start' in x ? x.start : 0)

export const fileBase = (p: Pick<Project, 'name'>): string =>
  String(p.name || 'motion-design').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'motion-design'

interface DragState {
  kind: Kind
  id: string
  edge: 'l' | 'r' | undefined
  x0: number
  y0: number
  p0: Project
  lanes0: Project['lanes']
  o: AnyRec
  l: { start: number; dur: number } | null
  moved: boolean
  snaps: number[]
}

interface XfBox { cx: number; cy: number; w: number; h: number; rot: number; it: AnyRec; clip?: boolean; sw?: number; sh?: number; cr?: { l: number; t: number; r: number; b: number } }

/** Motion design: tilstand og handlinger (samme oppførsel som media-lab/src/pages/motion-design/logic.js). */
export class MotionController {
  readonly state: Store<MState>
  M: MediaEls = { vids: {}, imgs: {} }
  waves: Record<string, string | null> = {}
  urls: Record<string, string> = {}
  t = 0
  dirty = false
  private d: MDeps
  private now: () => number
  private alive = true
  private auds: Record<string, HTMLAudioElement> = {}
  private hid: HTMLDivElement | null = null
  private past: string[] = []
  private future: string[] = []
  private hk: string | null = null
  private ht = 0
  private svT: ReturnType<typeof setTimeout> | undefined
  private toastT: ReturnType<typeof setTimeout> | undefined
  private raf = 0
  private act = 0
  private idleDraw = 0
  private pt0 = 0
  private pn0 = 0
  private vp: Project | null = null
  private vr: [number, number][] = []
  private rects: Rects = {}
  private drag: DragState | null = null
  private clip: { items: { type: Kind; it: Item }[]; t0: number; st: number[] } | null = null
  private lookClip: { col: AnyRec; aud: AnyRec | null } | null = null
  private exporting = false
  private abort = false
  private lastExpBlob: { blob: Blob; name: string } | null = null
  private vo: { rec: MediaRecorder; st: MediaStream; t0: number } | null = null
  private voI: ReturnType<typeof setInterval> | undefined
  private voStart = 0
  private lastLoc = ''
  private quiet = false
  private ro: ResizeObserver | null = null
  /** Elementer i grensesnittet som kontrolleren tegner i eller treffer mot. */
  readonly els: {
    root: HTMLDivElement | null; canvas: HTMLCanvasElement | null; stage: HTMLDivElement | null; tl: HTMLDivElement | null; tlInner: HTMLDivElement | null
    clipRow: HTMLDivElement | null; ovRow: HTMLDivElement | null; musicRow: HTMLDivElement | null; ph: HTMLDivElement | null; time: HTMLSpanElement | null
  } = { root: null, canvas: null, stage: null, tl: null, tlInner: null, clipRow: null, ovRow: null, musicRow: null, ph: null, time: null }
  private refs: Partial<Record<keyof MotionController['els'], (el: never) => void>> = {}

  constructor(deps: MDeps) {
    this.d = deps
    this.now = deps.now ?? Date.now
    const st = deps.storage
    let secOpen: Record<string, boolean> = { Tid: true }
    try {
      const v = JSON.parse(st.get('motiondesign.sections') ?? 'null') as unknown
      if (v && typeof v === 'object') secOpen = v as Record<string, boolean>
    } catch {
      // standard
    }
    this.state = createStore<MState>({
      ready: false, view: 'home', entries: [], fmt: null, cw: '1080', ch: '1080', tplThumbs: {}, msg: null, proj: null, projectId: null, sel: null, multi: [], t: 0, playing: false,
      zoom: 60, tab: 'media', replaceFor: null, exp: null, ai: { lang: 'norwegian', model: 'onnx-community/whisper-base', busy: false, msg: null, err: false },
      toast: null, saved: '', autosave: st.get('motiondesign.autosave') === '1', adv: st.get('motiondesign.advanced') === '1', pv: { w: 640, h: 360, cw: 640, ch: 360 }, narrow: false, vw: 1440, dragOver: false,
      clipDrag: null, packing: false, secOpen, drawer: 'l', menu: null, trDrag: null, medDrag: null, xform: null, curveCh: 'm', folder: null, folderDlg: false,
      folderBusy: null, waiting: [], picker: null, vo: null, hasClip: false, hasLook: null, lastExp: false, rev: 0,
    })
  }

  get s(): MState {
    return this.state.get()
  }

  set(p: Partial<MState> | ((s: MState) => Partial<MState> | null)): void {
    this.state.set((s) => {
      const patch = typeof p === 'function' ? p(s) : p
      return patch ? { ...s, ...patch } : s
    })
  }

  /** Et ref-tilbakekall per element (samme funksjon hver gang). */
  bind<K extends keyof MotionController['els']>(k: K): (el: MotionController['els'][K]) => void {
    const hit = this.refs[k] as ((el: MotionController['els'][K]) => void) | undefined
    if (hit) return hit
    const fn = (el: MotionController['els'][K]) => {
      this.els[k] = el
      if (k === 'stage') this.observeStage()
      if (k === 'root') this.observeRoot()
      if (k === 'tl') this.watchWheel()
    }
    this.refs[k] = fn as (el: never) => void
    return fn
  }

  poke(): void {
    this.act = performance.now()
  }

  flash(p: Phrase, v?: Vars): void {
    clearTimeout(this.toastT)
    this.set({ toast: v ? { p, v } : { p } })
    this.toastT = setTimeout(() => this.alive && this.set({ toast: null }), 4200)
  }

  /** Starter tegnesløyfen og skjult beholder for videoene. */
  mount(): void {
    this.alive = true
    if (!this.hid) {
      const h = document.createElement('div')
      h.setAttribute('aria-hidden', 'true')
      h.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;'
      document.body.appendChild(h)
      this.hid = h
    }
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    this.alive = false
    cancelAnimationFrame(this.raf)
    clearInterval(this.voI)
    clearTimeout(this.toastT)
    if (this.vo) for (const t of this.vo.st.getTracks()) t.stop()
    this.ro?.disconnect()
    this.rootRo?.disconnect()
    this.closeMedia()
    this.hid?.remove()
    this.hid = null
  }

  /* ---------- prosjekter ---------- */

  async refresh(): Promise<void> {
    try {
      const entries = await this.d.repo.list()
      if (this.alive) this.set({ entries, ready: true })
    } catch {
      if (this.alive) this.set({ ready: true, msg: { p: 'Nettleseren tillater ikke lagring her. Prøv et vanlig vindu (ikke privat).' } })
    }
  }

  newProject(): void {
    this.set({ view: 'format', msg: null })
    this.location()
  }

  goBack(): void {
    this.set({ view: this.s.view === 'tpl' ? 'format' : 'home', msg: null })
    this.location()
  }

  pickFormat(f: Format): void {
    this.set({ view: 'tpl', fmt: f, tplThumbs: {} })
    this.location()
    void this.genThumbs()
  }

  private async genThumbs(): Promise<void> {
    const f = this.s.fmt
    if (!f) return
    try {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))])
    } catch {
      // fortsett uten
    }
    const out: Record<string, string> = {}
    for (const tp of TEMPLATES) {
      await new Promise((r) => setTimeout(r, 0))
      const p = create(f, tp.k)
      const s = 420 / Math.max(f.w, f.h)
      const c = document.createElement('canvas')
      c.width = Math.round(f.w * s)
      c.height = Math.round(f.h * s)
      try {
        const g = c.getContext('2d')
        if (g) {
          drawFrame(g, c.width, c.height, p, { vids: {}, imgs: {} }, tp.tt, null)
          out[tp.k] = c.toDataURL('image/jpeg', 0.82)
        }
      } catch {
        // malen vises uten bilde
      }
    }
    if (this.alive && this.s.view === 'tpl' && this.s.fmt === f) this.set({ tplThumbs: out })
  }

  async pickTpl(k: string): Promise<void> {
    const f = this.s.fmt
    if (!f) return
    const p = create(f, k)
    const id = await this.d.repo.save(null, p).catch(() => null)
    await this.openProject(p, id)
  }

  applyCustom(): void {
    const w = parseInt(this.s.cw, 10)
    const h = parseInt(this.s.ch, 10)
    if (!(w >= 240 && w <= 4096 && h >= 240 && h <= 4096)) {
      this.set({ msg: { p: 'Bredde og høyde må være mellom 240 og 4096.' } })
      this.flash('Bredde og høyde må være mellom 240 og 4096.')
      return
    }
    this.pickFormat({ k: 'custom', name: 'Egendefinert', ratio: `${w}×${h}`, w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 })
  }

  async openEntry(e: MdEntry): Promise<void> {
    try {
      const p = await this.d.repo.open(e.id)
      await this.openProject(p, e.id)
    } catch {
      this.set({ msg: { p: 'Prosjektet kunne ikke åpnes.' } })
    }
  }

  async openProject(raw: Project, projectId: string | null): Promise<void> {
    let p: Project
    try {
      p = normalize(raw)
    } catch {
      this.set({ msg: { p: 'Prosjektet kunne ikke åpnes.' } })
      return
    }
    this.closeMedia()
    let fst = await this.d.files.status(p).catch((): FolderStatus => ({ folder: null, access: false, inBrowser: 0, notCopied: 0 }))
    if (fst.folder && !fst.access && (await this.d.files.requestAccess(p).catch(() => false))) fst = await this.d.files.status(p)
    let missing = 0
    for (const m of p.media) {
      const b = await this.d.files.open(m.id)
      if (!b) {
        missing++
        continue
      }
      this.urls[m.id] = URL.createObjectURL(b)
      if (m.kind === 'image' && /png|webp|gif/.test(b.type) && !/^data:image\/(webp|png)/.test(m.thumb)) {
        const im = new Image()
        im.src = this.urls[m.id] ?? ''
        try {
          await im.decode()
          const th = thumbOf(im, im.naturalWidth, im.naturalHeight, true)
          if (th) m.thumb = th
        } catch {
          // beholder miniatyren
        }
      }
    }
    this.dirty = false
    this.past = []
    this.future = []
    this.t = 0
    this.playing = false
    clearAudioCache()
    this.set({ view: 'edit', proj: p, projectId, sel: null, multi: [], t: 0, playing: false, tab: 'media', replaceFor: null, exp: null, saved: '', msg: null, folder: fst, xform: null, menu: null, rev: this.s.rev + 1 })
    this.location()
    if (missing) this.flash(fst.folder && !fst.access ? '{n} filer ligger i prosjektmappen. Gi tilgang under «Prosjektmappe».' : '{n} filer mangler og vises tomme.', { n: missing })
    this.syncMediaEls()
    setTimeout(() => this.fitZoom(), 60)
    for (const m of p.media) if (m.kind !== 'image' && this.s.proj?.id === p.id) await this.makeWave(m.id)
  }

  closeMedia(): void {
    for (const v of Object.values(this.M.vids)) {
      try {
        v.pause()
        v.removeAttribute('src')
        v.load()
        v.remove()
      } catch {
        // allerede fjernet
      }
    }
    for (const a of Object.values(this.auds)) {
      try {
        a.pause()
        a.removeAttribute('src')
        a.load()
      } catch {
        // allerede fjernet
      }
    }
    for (const u of Object.values(this.urls)) URL.revokeObjectURL(u)
    this.M = { vids: {}, imgs: {} }
    this.auds = {}
    this.urls = {}
    this.waves = {}
  }

  async leave(): Promise<void> {
    this.stop()
    if (this.svT) await this.saveNow()
    else if (this.dirty) {
      if (this.d.confirm('Du har endringer som ikke er lagret. Vil du lagre dem før du går tilbake?')) await this.saveNow()
      this.dirty = false
    }
    this.closeMedia()
    this.set({ view: 'home', proj: null, projectId: null, sel: null, multi: [], exp: null, xform: null, menu: null, folderDlg: false })
    this.location()
    void this.refresh()
  }

  async delProject(e: MdEntry): Promise<void> {
    const folder = await this.d.files.hasFolder({ id: e.docId }).catch(() => null)
    const ok = folder
      ? this.d.confirm('Fjerne «{name}» fra listen? Filene i prosjektmappen «{folder}» blir liggende på PC-en, og prosjektet kan åpnes igjen med «Åpne prosjektmappe».', { name: e.name, folder })
      : this.d.confirm('Slette «{name}»? Filene ligger fortsatt i Dine medier, der du kan slette dem.', { name: e.name })
    if (!ok) return
    try {
      if (folder) await this.d.files.forget({ id: e.docId })
      await this.d.repo.remove(e.id)
    } catch {
      // listen hentes på nytt under
    }
    void this.refresh()
  }

  async openProjectFile(f: File): Promise<void> {
    if (!/\.motion$/i.test(f.name) || f.size > 8e9) {
      this.set({ msg: { p: 'Velg en .motion-prosjektfil.' } })
      return
    }
    this.set({ msg: { p: 'Åpner prosjektfilen …' } })
    try {
      const p = await unpack(f, async (blob, name) => {
        const pid = 'unpack'
        return this.d.files.add({ id: pid }, blob, name).catch(() => null)
      })
      const id = await this.d.repo.save(null, p)
      this.set({ msg: null })
      await this.openProject(p, id)
    } catch (e) {
      this.set({ msg: { p: e instanceof Error && e.message ? e.message : 'Prosjektfilen kunne ikke åpnes.' } })
    }
  }

  async saveFile(): Promise<void> {
    const p = this.s.proj
    if (!p || this.s.packing) return
    this.set({ packing: true })
    try {
      const b = await pack(p, async (id) => {
        const blob = await this.d.files.open(id)
        if (!blob) return null
        const m = p.media.find((x) => x.id === id)
        return { blob, name: (await this.d.files.name(id)) ?? m?.name ?? 'fil' }
      })
      this.d.download(b, `${fileBase(p)}.motion`)
      this.flash('Prosjektfilen er lastet ned med alle filene.')
    } catch {
      this.flash('Prosjektfilen kunne ikke lages.')
    }
    this.set({ packing: false })
  }

  /* ---------- prosjektmappe ---------- */

  openFolderDlg(): void {
    if (!this.s.proj) return
    this.set({ folderDlg: true })
    void this.refreshFolder()
  }

  private async refreshFolder(): Promise<void> {
    const p = this.s.proj
    if (!p) return
    const st = await this.d.files.status(p).catch(() => null)
    if (this.alive && st) this.set({ folder: st })
  }

  async pickFolder(): Promise<void> {
    const p = this.s.proj
    if (!p || !this.d.foldersSupported()) return
    const dir = await this.d.pickDirectory({ id: 'motion-prosjekt', startIn: 'videos' })
    if (!dir) return
    this.set({ folderBusy: { p: 'Kopierer filene til mappen …' } })
    try {
      await this.saveNow()
      await this.d.files.copyToFolder(p, dir, (n, t) => this.alive && this.set({ folderBusy: { p: 'Kopierer {n} av {t} …', v: { n, t } } }))
      this.flash('Prosjektet ligger nå i mappen «{name}». Kopien i nettleseren er beholdt.', { name: dir.name })
    } catch (e) {
      this.flash(e instanceof Error && e.message ? e.message : 'Kunne ikke kopiere til mappen. Ingenting er slettet.')
    }
    this.set({ folderBusy: null })
    await this.refreshFolder()
  }

  async grantFolder(): Promise<void> {
    const p = this.s.proj
    if (!p) return
    if (await this.d.files.requestAccess(p)) {
      this.set({ folderDlg: false })
      await this.saveNow()
      await this.openProject(p, this.s.projectId)
    } else this.flash('Fikk ikke tilgang til prosjektmappen.')
  }

  async freeBrowser(): Promise<void> {
    const p = this.s.proj
    if (!p) return
    if (!this.d.confirm('Fjerne kopiene av filene fra nettleseren? Bare filer som er kontrollert i prosjektmappen fjernes. Prosjektet virker deretter bare når mappen er tilgjengelig på denne PC-en.')) return
    try {
      const n = await this.d.files.freeBrowserCopies(p)
      this.flash('{n} filer er fjernet fra nettleseren. Originalene ligger i prosjektmappen.', { n })
    } catch (e) {
      this.flash(e instanceof Error && e.message ? e.message : 'Kunne ikke frigjøre plass.')
    }
    await this.refreshFolder()
  }

  async openFolder(): Promise<void> {
    if (!this.d.foldersSupported()) return
    const dir = await this.d.pickDirectory({ id: 'motion-prosjekt' })
    if (!dir) return
    this.set({ msg: { p: 'Åpner prosjektmappen …' } })
    try {
      const p = await this.d.files.openFromFolder(dir)
      await this.d.repo.list()
      const existing = this.d.repo.findDoc(p.id)
      const id = await this.d.repo.save(existing, p)
      this.set({ msg: null })
      await this.refresh()
      await this.openProject(p, id)
    } catch (e) {
      this.set({ msg: { p: e instanceof Error && e.message ? e.message : 'Prosjektmappen kunne ikke åpnes.' } })
    }
  }

  /* ---------- historikk og lagring ---------- */

  pushHist(): void {
    const p = this.s.proj
    if (!p) return
    this.past.push(JSON.stringify(p))
    if (this.past.length > 80) this.past.shift()
    this.future = []
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  /** Endrer prosjektet. Endringer med samme `key` innen 0,9 s blir ett angresteg. */
  setProj(fn: (p: Project) => Project, hist = true, key?: string): void {
    if (hist) {
      const now = this.now()
      if (!key || key !== this.hk || now - this.ht > 900) this.pushHist()
      this.hk = key ?? null
      this.ht = now
    }
    const s0 = this.s.proj
    if (!s0) return
    const n = this.linkFollow(s0, fn(s0))
    const had = new Set<string>()
    const pin = new Set<string>()
    for (const k of ['texts', 'ov', 'music'] as const) for (const x of s0[k]) had.add(x.id)
    for (const k of ['texts', 'ov', 'music'] as const) for (const x of n[k]) if (!had.has(x.id)) pin.add(x.id)
    this.set({ proj: fixLanes(n, pin) })
    this.afterProj()
  }

  private afterProj(): void {
    this.syncMediaEls()
    this.queueSave()
  }

  /** Setter prosjektet uten historikk og lagring (under dra; lagres når musen slippes). */
  private live(fn: (p: Project) => Project): void {
    const p = this.s.proj
    if (p) this.set({ proj: fn(p) })
  }

  undo(): void {
    const prev = this.past.pop()
    if (!prev || !this.s.proj) return
    this.future.push(JSON.stringify(this.s.proj))
    this.hk = null
    this.set({ proj: JSON.parse(prev) as Project })
    this.afterProj()
  }

  redo(): void {
    const next = this.future.pop()
    if (!next || !this.s.proj) return
    this.past.push(JSON.stringify(this.s.proj))
    this.hk = null
    this.set({ proj: JSON.parse(next) as Project })
    this.afterProj()
  }

  private queueSave(): void {
    if (!this.s.autosave) {
      this.dirty = true
      if (this.s.saved !== 'Ikke lagret') this.set({ saved: 'Ikke lagret' })
      return
    }
    clearTimeout(this.svT)
    if (this.s.saved !== 'Lagrer …') this.set({ saved: 'Lagrer …' })
    this.svT = setTimeout(() => void this.saveNow(), 900)
  }

  async saveNow(): Promise<void> {
    clearTimeout(this.svT)
    this.svT = undefined
    const p = this.s.proj
    if (!p) return
    let thumb = p.thumb || ''
    try {
      const s = 360 / Math.max(p.w, p.h)
      const c = document.createElement('canvas')
      c.width = Math.round(p.w * s)
      c.height = Math.round(p.h * s)
      const T = totalDur(p)
      const g = c.getContext('2d')
      if (g) {
        drawFrame(g, c.width, c.height, p, this.M, Math.min(this.t > 0.05 ? this.t : Math.min(1.5, T / 2), T - 0.02), null)
        thumb = c.toDataURL('image/jpeg', 0.72)
      }
    } catch {
      // beholder forrige miniatyr
    }
    try {
      const id = await this.d.repo.save(this.s.projectId, { ...p, thumb, updated: this.now() })
      const inFolder = await this.d.files.writeProject(p).catch(() => false)
      this.dirty = false
      if (this.alive && this.s.proj?.id === p.id) this.set({ projectId: id, saved: inFolder ? 'Lagret i prosjektmappen' : 'Lagret i nettleseren' })
      if (this.s.projectId !== id) this.location(true)
    } catch {
      if (this.alive) this.set({ saved: 'Kunne ikke lagre' })
    }
  }

  async saveBrowser(): Promise<void> {
    await this.saveNow()
    if (!this.dirty) this.flash('Prosjektet er lagret.')
  }

  toggleAdv(): void {
    const on = !this.s.adv
    this.d.storage.set('motiondesign.advanced', on ? '1' : '0')
    this.set({ adv: on })
  }

  toggleAutosave(): void {
    const on = !this.s.autosave
    this.d.storage.set('motiondesign.autosave', on ? '1' : '0')
    this.set({ autosave: on })
    if (on && this.dirty) void this.saveNow()
    this.flash(on ? 'Autolagring er på.' : 'Autolagring er av. Husk å lagre.')
  }

  /* ---------- adresse (nettleserens tilbake/fram) ---------- */

  private location(replace = false): void {
    if (this.quiet) return
    const s = this.s
    const loc: Loc = s.view === 'edit' && s.projectId ? { p: s.projectId } : s.view === 'tpl' && s.fmt ? { v: 'tpl', f: s.fmt.k === 'custom' ? `${s.fmt.w}x${s.fmt.h}` : s.fmt.k } : s.view === 'format' ? { v: 'format' } : {}
    const key = JSON.stringify(loc)
    if (key === this.lastLoc) return
    this.lastLoc = key
    this.d.onLocation(loc, replace)
  }

  /** Følger adressen (oppstart og nettleserens tilbake/fram). */
  async followLocation(loc: Loc): Promise<void> {
    const key = JSON.stringify(loc)
    if (!this.s.ready || key === this.lastLoc) return
    this.lastLoc = key
    this.quiet = true
    try {
      if (this.s.view === 'edit' && loc.p !== this.s.projectId) {
        this.stop()
        if (this.svT || this.dirty) await this.saveNow()
        this.closeMedia()
        this.set({ proj: null, projectId: null, sel: null, multi: [], exp: null, xform: null, menu: null, folderDlg: false })
      }
      if (loc.p) {
        if (loc.p === this.s.projectId) return
        const e = this.s.entries.find((x) => x.id === loc.p)
        if (e) await this.openEntry(e)
        else this.set({ view: 'home' })
        return
      }
      if (loc.v === 'tpl' && loc.f) {
        const m = /^(\d+)x(\d+)$/.exec(loc.f)
        const f = m ? { k: 'custom', name: 'Egendefinert', ratio: `${m[1]}×${m[2]}`, w: Number(m[1]), h: Number(m[2]) } : FORMATS.find((x) => x.k === loc.f)
        if (f) {
          this.set({ view: 'tpl', fmt: f, tplThumbs: {} })
          void this.genThumbs()
          return
        }
      }
      this.set({ view: loc.v === 'format' || loc.v === 'tpl' ? 'format' : 'home', msg: null })
      if (this.s.view === 'home') void this.refresh()
    } finally {
      this.quiet = false
    }
  }

  /* ---------- medieelementer ---------- */

  syncMediaEls(): void {
    const p = this.s.proj
    if (!p) return
    const vids = new Set<string>()
    const mus = new Set<string>()
    for (const c of [...p.clips, ...p.ov]) {
      if (c.kind !== 'video') continue
      vids.add(c.id)
      const url = this.urls[c.media]
      if (!url) continue
      let v = this.M.vids[c.id]
      if (!v) {
        v = document.createElement('video')
        v.preload = 'auto'
        v.playsInline = true
        v.setAttribute('playsinline', '')
        this.hid?.appendChild(v)
        this.M.vids[c.id] = v
      }
      if (v.dataset.m !== c.media) {
        v.dataset.m = c.media
        v.src = url
      }
    }
    for (const k of Object.keys(this.M.vids)) {
      if (vids.has(k)) continue
      const v = this.M.vids[k]
      try {
        v?.pause()
        v?.removeAttribute('src')
        v?.load()
        v?.remove()
      } catch {
        // allerede fjernet
      }
      delete this.M.vids[k]
    }
    for (const m of p.music) {
      mus.add(m.id)
      const url = this.urls[m.media]
      if (!url) continue
      let a = this.auds[m.id]
      if (!a) {
        a = new Audio()
        a.preload = 'auto'
        this.auds[m.id] = a
      }
      if (a.dataset.m !== m.media) {
        a.dataset.m = m.media
        a.src = url
      }
    }
    for (const k of Object.keys(this.auds)) {
      if (mus.has(k)) continue
      try {
        this.auds[k]?.pause()
        this.auds[k]?.removeAttribute('src')
      } catch {
        // allerede fjernet
      }
      delete this.auds[k]
    }
    for (const m of p.media) {
      const url = this.urls[m.id]
      if (m.kind === 'image' && !this.M.imgs[m.id] && url) {
        const im = new Image()
        im.src = url
        this.M.imgs[m.id] = im
      }
    }
    const ls = p.logo.src
    if (ls && /^images\//.test(ls) && !this.M.imgs[ls]) {
      const im = new Image()
      im.src = `/${ls}`
      this.M.imgs[ls] = im
    }
  }

  private pauseAll(): void {
    for (const v of Object.values(this.M.vids)) if (!v.paused) v.pause()
    for (const a of Object.values(this.auds)) if (!a.paused) a.pause()
  }

  /* ---------- avspilling og tegning ---------- */

  playing = false

  private loop = (now: number): void => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.loop)
    const p = this.s.proj
    if (this.s.view !== 'edit' || !p || this.exporting) return
    const T = totalDur(p)
    if (this.playing) {
      const t = this.pt0 + (now - this.pn0) / 1000
      if (t >= T) {
        this.t = T
        this.stop()
      } else this.t = t
    }
    // Står videoen stille og ingen bruker editoren (siste 1,5 s), tegnes forhåndsvisningen 4 ganger i sekundet.
    if (!this.playing && now - this.act > 1500 && now - this.idleDraw < 250) return
    this.idleDraw = now
    this.syncPlayback(p, T)
    this.draw(p)
    this.updPH(T)
  }

  private syncPlayback(p: Project, T: number): void {
    const L = layout(p)
    const t = this.t
    const pl = this.playing
    const tr = p.tracks
    const MX = mixOf(p)
    if (this.vp !== p) {
      this.vp = p
      this.vr = voiced(p)
    }
    const sync = (v: HTMLVideoElement, c: { speed: number; rev: boolean; in: number; out: number; muted: boolean }, start: number, end: number, vol: number) => {
      const sp = c.speed || 1
      const target = srcTime(c, t - start)
      if (t >= start && t < end) {
        v.muted = !!c.muted || vol <= 0
        v.volume = clamp(vol, 0, 1)
        if (pl && !c.rev) {
          if (Math.abs(v.playbackRate - sp) > 0.001) v.playbackRate = sp
          if (v.paused) {
            v.currentTime = target
            v.play().catch(() => undefined)
          } else if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target
        } else {
          if (!v.paused) v.pause()
          if (!v.seeking && Math.abs(v.currentTime - target) > (pl ? 0.06 : 0.03)) v.currentTime = target
        }
      } else {
        if (!v.paused) v.pause()
        const s0 = c.rev ? c.out - 0.02 : c.in
        if (t < start && start - t < 1.5 && !v.seeking && Math.abs(v.currentTime - s0) > 0.05) v.currentTime = s0
      }
    }
    L.forEach((l, i) => {
      if (l.c.kind !== 'video') return
      const v = this.M.vids[l.c.id]
      if (!v?.src) return
      const nx = L[i + 1]
      const tiD = i === 0 && p.tin.type !== 'none' ? Math.min(p.tin.dur, l.dur / 2) : 0
      const toD = !nx && p.tout.type !== 'none' ? Math.min(p.tout.dur, l.dur / 2) : 0
      const gi = (l.tr ? clamp((t - l.start) / l.tr, 0, 1) : 1) * (tiD ? clamp((t - l.start) / tiD, 0, 1) : 1)
      const go = (nx?.tr ? clamp((l.end - t) / nx.tr, 0, 1) : 1) * (toD ? clamp((l.end - t) / toD, 0, 1) : 1)
      const fi = l.c.afi > 0 ? clamp((t - l.start) / l.c.afi, 0, 1) : 1
      const fo = l.c.afo > 0 ? clamp((l.end - t) / l.c.afo, 0, 1) : 1
      sync(v, l.c, l.start, l.end, tr.video.hide ? 0 : l.c.vol * MX.video * gi * go * fi * fo)
    })
    for (const o of p.ov) {
      if (o.kind !== 'video') continue
      const v = this.M.vids[o.id]
      if (!v?.src) continue
      const e = o.start + ovDur(o)
      const fi = o.fadeIn > 0 ? clamp((t - o.start) / o.fadeIn, 0, 1) : 1
      const fo = o.fadeOut > 0 ? clamp((e - t) / o.fadeOut, 0, 1) : 1
      sync(v, o, o.start, e, tr.ov.hide ? 0 : o.vol * MX.ov * fi * fo)
    }
    const mh = tr.music.hide ? 0 : MX.music * duckAt(p, t, this.vr)
    for (const m of p.music) {
      const a = this.auds[m.id]
      if (!a?.src) continue
      const seg = m.out - m.in
      const len = m.loop ? Math.max(0, T - m.start) : seg
      const rel = t - m.start
      if (pl && rel >= 0 && rel < len) {
        const target = m.in + (m.loop ? rel % seg : rel)
        const fi = m.fadeIn > 0 ? clamp(rel / m.fadeIn, 0, 1) : 1
        const fo = m.fadeOut > 0 ? clamp((len - rel) / m.fadeOut, 0, 1) : 1
        a.volume = clamp(m.vol * fi * fo * mh, 0, 1)
        if (a.paused) {
          a.currentTime = target
          a.play().catch(() => undefined)
        } else if (Math.abs(a.currentTime - target) > 0.3) a.currentTime = target
      } else if (!a.paused) a.pause()
    }
  }

  private draw(p: Project): void {
    const c = this.els.canvas
    if (!c?.width) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    this.rects = {}
    try {
      drawFrame(ctx, c.width, c.height, p, this.M, this.t, this.rects)
    } catch {
      // et bilde som ikke kan tegnes, hoppes over
    }
    const s = this.s.sel
    const rk = s && (s.type === 'text' ? s.id : s.type === 'ov' ? `ov:${s.id}` : null)
    const r = rk ? this.rects[rk] : undefined
    if (r && !this.xfOn()) {
      const d = Math.max(1, c.width / 800)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5 * d
      ctx.setLineDash([6 * d, 4 * d])
      ctx.strokeRect(r.x, r.y, r.w, r.h)
      ctx.restore()
    }
    this.drawXf(ctx, c)
  }

  private updPH(T: number): void {
    const z = this.s.zoom
    const x = this.t * z
    const ph = this.els.ph
    const tm = this.els.time
    if (ph) ph.style.left = `${x}px`
    if (tm) {
      const s = `${fmtT(this.t)} / ${fmtT(T)}`
      if (tm.textContent !== s) tm.textContent = s
    }
    const el = this.els.tl
    if (el && this.playing && (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40)) el.scrollLeft = Math.max(0, x - 60)
  }

  play(): void {
    const p = this.s.proj
    if (!p) return
    const T = totalDur(p)
    if (this.t >= T - 0.05) this.t = 0
    this.pt0 = this.t
    this.pn0 = performance.now()
    this.playing = true
    this.set({ playing: true })
  }

  stop(): void {
    if (!this.playing) {
      this.pauseAll()
      return
    }
    this.playing = false
    this.pauseAll()
    this.set({ playing: false, t: this.t })
  }

  togglePlay(): void {
    if (this.playing) this.stop()
    else this.play()
  }

  seek(t: number, quiet = false): void {
    const p = this.s.proj
    if (!p) return
    this.t = clamp(t, 0, totalDur(p))
    if (this.playing) {
      this.pt0 = this.t
      this.pn0 = performance.now()
    }
    this.poke()
    if (!quiet) this.set({ t: this.t })
  }

  private rootRo: ResizeObserver | null = null
  /** Smal (under 760 px) og bred (minst 1280 px) visning følger editorens bredde. */
  private observeRoot(): void {
    this.rootRo?.disconnect()
    const el = this.els.root
    if (!el) return
    const on = () => {
      const w = el.clientWidth
      const n = w < 760
      if (n !== this.s.narrow || (w >= 1280) !== (this.s.vw >= 1280)) this.set({ narrow: n, vw: w })
    }
    this.rootRo = new ResizeObserver(on)
    this.rootRo.observe(el)
    on()
  }

  private observeStage(): void {
    this.ro?.disconnect()
    const el = this.els.stage
    if (!el) return
    this.ro = new ResizeObserver(() => this.measure())
    this.ro.observe(el)
    this.measure()
  }

  measure(): void {
    const el = this.els.stage
    const p = this.s.proj
    if (!el || !p) return
    const pad = p.h > p.w * 1.05 ? 16 : 32
    const aw = Math.max(40, el.clientWidth - pad)
    const ah = Math.max(40, el.clientHeight - pad)
    const r = p.w / p.h
    let w = aw
    let h = aw / r
    if (h > ah) {
      h = ah
      w = ah * r
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cw = Math.max(2, Math.round(Math.min(p.w, w * dpr)))
    const ch = Math.max(2, Math.round(cw / r))
    const pv = this.s.pv
    if (Math.abs(pv.w - w) > 0.5 || Math.abs(pv.h - h) > 0.5 || pv.cw !== cw) {
      this.set({ pv: { w, h, cw, ch } })
      this.poke()
    }
  }

  /* ---------- lerretet ---------- */

  private canvasPoint(e: { clientX: number; clientY: number }): { px: number; py: number; r: DOMRect; c: HTMLCanvasElement } | null {
    const c = this.els.canvas
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { px: ((e.clientX - r.left) * c.width) / r.width, py: ((e.clientY - r.top) * c.height) / r.height, r, c }
  }

  private dragWith(e: { clientX: number; clientY: number }, tol: number, onMove: (dx: number, dy: number) => void): void {
    const x0 = e.clientX
    const y0 = e.clientY
    let moved = false
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      if (!moved && Math.hypot(dx, dy) < tol) return
      if (!moved) {
        moved = true
        this.pushHist()
      }
      onMove(dx, dy)
    }
    const up = () => {
      window.removeEventListener('pointermove', mv)
      if (moved) this.afterProj()
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up, { once: true })
  }

  canvasDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    const p = this.s.proj
    const q = this.canvasPoint(e)
    if (!p || !q) return
    const { px, py, r, c } = q
    const t = this.t
    this.poke()
    if (e.button === 0 && this.xfOn() && this.s.xform) {
      const B = this.xfBox(this.s.xform)
      if (B) {
        const hi = this.xfHit(B, px, py, c.width / r.width, this.s.xform.mode)
        if (hi !== null) {
          this.xfDrag(e, this.s.xform, B, hi, r, c)
          return
        }
      }
    }
    const inR = (k: string) => {
      const b = this.rects[k]
      return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
    }
    const lq = this.rects.logo
    if (e.button === 0 && lq && p.logo.on && inR('logo')) {
      e.preventDefault()
      const ox = (lq.x + lq.w / 2) / c.width
      const oy = (lq.y + lq.h / 2) / c.height
      let moved = false
      const x0 = e.clientX
      const y0 = e.clientY
      const mv = (ev: PointerEvent) => {
        const dx = ev.clientX - x0
        const dy = ev.clientY - y0
        if (!moved && Math.hypot(dx, dy) < 3) return
        if (!moved) {
          moved = true
          this.pushHist()
        }
        const nx = clamp(ox + dx / r.width, 0, 1)
        const ny = clamp(oy + dy / r.height, 0, 1)
        this.live((pp) => ({ ...pp, logo: { ...pp.logo, x: nx, y: ny } }))
      }
      const up = () => {
        window.removeEventListener('pointermove', mv)
        if (moved) this.afterProj()
        else this.set({ tab: 'logo' })
      }
      window.addEventListener('pointermove', mv)
      window.addEventListener('pointerup', up, { once: true })
      return
    }
    const byLane = <T extends { lane: number }>(a: readonly T[]) => [...a].sort((x, y) => (y.lane || 0) - (x.lane || 0)).reverse()
    const hit = byLane(p.texts).find((x) => t >= x.start && t < x.start + x.dur && inR(x.id))
    const lk = (k: TrackKey) => p.tracks[k].lock || p.tracks[k].hide
    const ovHit = (!hit || lk('text')) && !lk('ov') ? byLane(p.ov).find((o) => t >= o.start && t < o.start + ovDur(o) && inR(`ov:${o.id}`)) : undefined
    if (ovHit) {
      e.preventDefault()
      this.set((s) => ({ sel: { type: 'ov', id: ovHit.id }, multi: [], replaceFor: null, xform: s.xform?.id === ovHit.id ? s.xform : null }))
      this.dragWith(e, 3, (dx, dy) => {
        let nx = ovHit.x + dx / r.width
        let ny = ovHit.y + dy / r.height
        if (Math.abs(nx - 0.5) < 0.012) nx = 0.5
        if (Math.abs(ny - 0.5) < 0.012) ny = 0.5
        this.live((pp) => ({ ...pp, ov: pp.ov.map((x) => (x.id === ovHit.id ? { ...x, x: nx, y: ny } : x)) }))
      })
      return
    }
    if (!hit || lk('text')) {
      const l = lk('video') ? undefined : layout(p).filter((y) => t >= y.start && t < y.end).pop()
      this.set((s) => ({ sel: l ? { type: 'clip', id: l.c.id } : null, multi: [], replaceFor: null, xform: s.xform && l && s.xform.id === l.c.id ? s.xform : null }))
      if (l && l.c.kind !== 'color' && e.button === 0 && !lk('video')) {
        e.preventDefault()
        const c0 = l.c
        this.dragWith(e, 4, (dx, dy) => {
          let nx = (c0.x || 0) + dx / r.width
          let ny = (c0.y || 0) + dy / r.height
          if (Math.abs(nx) < 0.012) nx = 0
          if (Math.abs(ny) < 0.012) ny = 0
          this.live((pp) => ({ ...pp, clips: pp.clips.map((x) => (x.id === c0.id && x.kind !== 'color' ? { ...x, x: nx, y: ny } : x)) }))
        })
      }
      return
    }
    e.preventDefault()
    this.set((s) => ({ sel: { type: 'text', id: hit.id }, replaceFor: null, xform: s.xform?.id === hit.id ? s.xform : null }))
    this.dragWith(e, 3, (dx, dy) => {
      let nx = hit.x + dx / r.width
      let ny = hit.y + dy / r.height
      if (Math.abs(nx - 0.5) < 0.012) nx = 0.5
      if (Math.abs(ny - 0.5) < 0.012) ny = 0.5
      this.live((pp) => ({ ...pp, texts: pp.texts.map((x) => (x.id === hit.id ? { ...x, x: nx, y: ny } : x)) }))
    })
  }

  xfOn(): boolean {
    const x = this.s.xform
    const s = this.s.sel
    return !!(x && s && x.id === s.id && x.type === s.type)
  }

  private xfBox(xf: Xform): XfBox | null {
    const p = this.s.proj
    if (!p) return null
    if (xf.type === 'clip') {
      const cv = this.els.canvas
      const c = p.clips.find((q) => q.id === xf.id)
      if (!cv || !c || c.kind === 'color') return null
      const m = p.media.find((v) => v.id === c.media)
      const W = cv.width
      const H = cv.height
      const cr = c.crop
      const cw = (m?.w || W) * (1 - cr.l - cr.r)
      const ch = (m?.h || H) * (1 - cr.t - cr.b)
      const base = c.fit === 'contain' ? Math.min(W / cw, H / ch) : Math.max(W / cw, H / ch)
      const z = (c.zoom || 1) * (c.scale ?? 1)
      const dw = cw * base * z
      const dh = ch * base * z
      const fx = c.fx ?? 0.5
      const fy = c.fy ?? 0.5
      return { cx: W / 2 + (c.x || 0) * W + (W - dw) * (fx - 0.5), cy: H / 2 + (c.y || 0) * H + (H - dh) * (fy - 0.5), w: dw, h: dh, rot: ((c.rot || 0) * Math.PI) / 180, it: c as unknown as AnyRec, clip: true }
    }
    if (xf.type === 'text') {
      const r = this.rects[xf.id]
      const x = p.texts.find((q) => q.id === xf.id)
      if (!r || !x) return null
      return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h, rot: 0, it: x as unknown as AnyRec }
    }
    const q = this.rects[`ov:${xf.id}`]
    const o = p.ov.find((v) => v.id === xf.id)
    if (!q || !o) return null
    const m = p.media.find((v) => v.id === o.media)
    const cr = o.crop
    return { cx: q.x + q.w / 2, cy: q.y + q.h / 2, w: q.w, h: q.h, rot: ((o.rot || 0) * Math.PI) / 180, it: o as unknown as AnyRec, sw: m?.w || 1000, sh: m?.h || Math.round(((1000 * (1 - cr.t - cr.b)) / (1 - cr.l - cr.r)) * (q.h / q.w)) || 1000, cr }
  }

  private toLocal(B: XfBox, px: number, py: number): [number, number] {
    const dx = px - B.cx
    const dy = py - B.cy
    const c = Math.cos(B.rot)
    const s = Math.sin(B.rot)
    return [dx * c + dy * s, -dx * s + dy * c]
  }

  private toCanvas(B: XfBox, lx: number, ly: number): [number, number] {
    const c = Math.cos(B.rot)
    const s = Math.sin(B.rot)
    return [B.cx + lx * c - ly * s, B.cy + lx * s + ly * c]
  }

  private xfHit(B: XfBox, px: number, py: number, k: number, mode: Xform['mode']): number | null {
    const L = this.toLocal(B, px, py)
    const tol = 10 * k
    if (mode !== 'crop' && B.it.kind && Math.hypot(L[0], L[1] + B.h / 2 + 26 * k) < tol) return 8
    for (let i = 0; i < 8; i++) if (Math.abs(L[0] - ((HX[i] ?? 0) * B.w) / 2) < tol && Math.abs(L[1] - ((HY[i] ?? 0) * B.h) / 2) < tol) return i
    return null
  }

  private drawXf(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement): void {
    const xf = this.s.xform
    if (!this.xfOn() || !xf) return
    const B = this.xfBox(xf)
    if (!B) return
    const k = c.width / Math.max(1, this.s.pv.w)
    const crop = xf.mode === 'crop'
    ctx.save()
    ctx.translate(B.cx, B.cy)
    ctx.rotate(B.rot)
    if (crop && B.cr && B.sw && B.sh) {
      const ps = B.w / ((1 - B.cr.l - B.cr.r) * B.sw)
      const ux = B.sw * ps
      const uy = B.sh * ps
      ctx.setLineDash([5 * k, 4 * k])
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = k
      ctx.strokeRect(-B.w / 2 - B.cr.l * ux, -B.h / 2 - B.cr.t * uy, ux, uy)
      ctx.setLineDash([])
    }
    ctx.strokeStyle = crop ? '#f5b82c' : '#ffffff'
    ctx.lineWidth = 1.5 * k
    ctx.strokeRect(-B.w / 2, -B.h / 2, B.w, B.h)
    if (!crop && xf.type === 'ov') {
      ctx.beginPath()
      ctx.moveTo(0, -B.h / 2)
      ctx.lineTo(0, -B.h / 2 - 26 * k)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -B.h / 2 - 26 * k, 5.5 * k, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = k
      ctx.stroke()
    }
    for (let i = 0; i < 8; i++) {
      const hx = ((HX[i] ?? 0) * B.w) / 2
      const hy = ((HY[i] ?? 0) * B.h) / 2
      const s = (crop ? 10 : 9) * k
      ctx.fillStyle = crop ? '#f5b82c' : '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = k
      ctx.fillRect(hx - s / 2, hy - s / 2, s, s)
      ctx.strokeRect(hx - s / 2, hy - s / 2, s, s)
    }
    ctx.restore()
  }

  private xfDrag(e: React.PointerEvent, xf: Xform, B: XfBox, hi: number, r: DOMRect, c: HTMLCanvasElement): void {
    e.preventDefault()
    e.stopPropagation()
    const k = c.width / r.width
    const id = xf.id
    const o0 = { ...B.it }
    const sx = HX[hi] ?? 0
    const sy = HY[hi] ?? 0
    const P0 = this.toLocal(B, (e.clientX - r.left) * k, (e.clientY - r.top) * k)
    let moved = false
    const K = KEYS[xf.type]
    const mv = (ev: PointerEvent) => {
      const px = (ev.clientX - r.left) * k
      const py = (ev.clientY - r.top) * k
      const L = this.toLocal(B, px, py)
      if (!moved) {
        if (Math.hypot(L[0] - P0[0], L[1] - P0[1]) < 2) return
        moved = true
        this.pushHist()
      }
      let patch: AnyRec
      if (hi === 8) {
        let a = (Math.atan2(py - B.cy, px - B.cx) * 180) / Math.PI + 90
        if (a > 180) a -= 360
        if (ev.shiftKey) a = Math.round(a / 15) * 15
        else {
          const sn = Math.round(a / 90) * 90
          if (Math.abs(a - sn) < 3) a = sn
        }
        patch = { rot: Math.round(a * 10) / 10 }
      } else if (xf.type === 'text') {
        if (sy === 0) patch = { maxW: clamp((2 * Math.abs(L[0])) / c.width, 0.1, 1) }
        else {
          const f = sx ? Math.hypot(L[0], L[1]) / Math.max(1, Math.hypot(P0[0], P0[1])) : Math.abs(L[1]) / Math.max(1, Math.abs(P0[1]))
          patch = { size: clamp(Math.round(Number(o0.size) * f), 8, 600) }
        }
      } else if (xf.mode === 'crop' && B.cr && B.sw) {
        const cr = B.cr
        const ps = B.w / ((1 - cr.l - cr.r) * B.sw)
        const ux = B.sw * ps
        const uy = (B.sh ?? B.sw) * ps
        let l = cr.l
        let rr = cr.r
        let t = cr.t
        let b = cr.b
        if (sx < 0) l = clamp(cr.l + (L[0] + B.w / 2) / ux, 0, 1 - rr - 0.05)
        if (sx > 0) rr = clamp(cr.r - (L[0] - B.w / 2) / ux, 0, 1 - l - 0.05)
        if (sy < 0) t = clamp(cr.t + (L[1] + B.h / 2) / uy, 0, 1 - b - 0.05)
        if (sy > 0) b = clamp(cr.b - (L[1] - B.h / 2) / uy, 0, 1 - t - 0.05)
        const nl = -B.w / 2 + (l - cr.l) * ux
        const nr = B.w / 2 - (rr - cr.r) * ux
        const nt = -B.h / 2 + (t - cr.t) * uy
        const nb = B.h / 2 - (b - cr.b) * uy
        const C = this.toCanvas(B, (nl + nr) / 2, (nt + nb) / 2)
        patch = { crop: { l, t, r: rr, b }, scale: (nr - nl) / c.width, x: C[0] / c.width, y: C[1] / c.height }
      } else {
        const a = B.h / B.w
        const alt = ev.altKey
        const ax = alt ? 0 : (-sx * B.w) / 2
        const ay = alt ? 0 : (-sy * B.h) / 2
        const dx = Math.abs(L[0] - ax)
        const dy = Math.abs(L[1] - ay) / a
        const m = alt ? 2 : 1
        const nw = Math.max(12 * k, (sx && sy ? Math.max(dx, dy) : sx ? dx : dy) * m)
        const C = this.toCanvas(B, alt ? 0 : ax + (sx * nw) / 2, alt ? 0 : ay + (sy * nw * a) / 2)
        if (xf.type === 'clip') {
          const fx = typeof o0.fx === 'number' ? o0.fx : 0.5
          const fy = typeof o0.fy === 'number' ? o0.fy : 0.5
          const sc0 = typeof o0.scale === 'number' ? o0.scale : 1
          patch = { scale: clamp((sc0 * nw) / B.w, 0.1, 5), x: (C[0] - c.width / 2 - (c.width - nw) * (fx - 0.5)) / c.width, y: (C[1] - c.height / 2 - (c.height - nw * a) * (fy - 0.5)) / c.height }
        } else patch = { scale: clamp(nw / c.width, 0.02, 4), x: C[0] / c.width, y: C[1] / c.height }
      }
      this.live((p) => ({ ...p, [K]: (p[K] as Item[]).map((q) => (q.id === id ? { ...q, ...patch } : q)) }))
    }
    const up = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (moved) this.afterProj()
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  startXf(type: Kind, id: string, mode: Xform['mode'] = 'move'): void {
    const p = this.s.proj
    if (!p) return
    const it = itemsOf(p, type).find((x) => x.id === id)
    if (!it) return
    if (type !== 'clip') {
      const end = type === 'ov' ? (it as Overlay).start + ovDur(it as Overlay) : (it as TextItem).start + (it as TextItem).dur
      const st = startOf(it)
      if (this.t < st || this.t >= end) this.seek(st + Math.min(0.5, (end - st) / 2))
    } else {
      const l = layout(p).find((x) => x.c.id === id)
      if (l && (this.t < l.start || this.t >= l.end)) this.seek(l.start + Math.min(0.5, l.dur / 2))
    }
    this.set({ sel: { type, id }, multi: [], xform: { type, id, mode } })
    this.flash(mode === 'crop' ? 'Beskjær: dra i kantene. Dobbeltklikk eller Enter for å gå tilbake.' : type === 'ov' ? 'Dra i punktene for å endre størrelse, eller i det runde håndtaket for å rotere. Dobbeltklikk igjen for å beskjære. Esc avslutter.' : type === 'clip' ? 'Dra i punktene for å endre størrelse, eller i det runde håndtaket for å rotere. Esc avslutter.' : 'Dra i punktene for å endre størrelse. Esc avslutter.')
  }

  canvasDbl(e: React.MouseEvent<HTMLCanvasElement>): void {
    const s = this.s.sel
    const p = this.s.proj
    const q = this.canvasPoint(e)
    if (!s || !p || !q) return
    if (s.type === 'clip') {
      const it = p.clips.find((x) => x.id === s.id)
      if (it && it.kind !== 'color' && this.s.xform?.id !== s.id) this.startXf('clip', s.id, 'move')
      return
    }
    if (s.type !== 'text' && s.type !== 'ov') return
    const r = this.rects[s.type === 'ov' ? `ov:${s.id}` : s.id]
    if (!r || q.px < r.x || q.px > r.x + r.w || q.py < r.y || q.py > r.y + r.h) return
    const xf = this.s.xform
    if (xf && xf.id === s.id) {
      if (s.type === 'ov') this.startXf('ov', s.id, xf.mode === 'crop' ? 'move' : 'crop')
      return
    }
    this.startXf(s.type, s.id, 'move')
  }

  canvasMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (e.buttons) return
    const q = this.canvasPoint(e)
    if (!q) return
    const { px, py, r, c } = q
    const k = c.width / r.width
    let cur = 'default'
    const xf = this.s.xform
    if (this.xfOn() && xf) {
      const B = this.xfBox(xf)
      if (B) {
        const hi = this.xfHit(B, px, py, k, xf.mode)
        if (hi === 8) cur = 'grab'
        else if (hi !== null) {
          const a = ([45, 90, 135, 0, 45, 90, 135, 0][hi] ?? 0) + (B.rot * 180) / Math.PI
          cur = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][Math.round((((a % 180) + 180) % 180) / 45) % 4] ?? 'default'
        }
      }
    }
    if (cur === 'default') {
      for (const key in this.rects) {
        const b = this.rects[key]
        if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
          cur = 'move'
          break
        }
      }
    }
    if (c.style.cursor !== cur) c.style.cursor = cur
  }

  canvasCtx(e: React.MouseEvent): void {
    const s = this.s.sel
    if (s && s.type !== 'music' && s.type !== 'sub') this.ctxFor(s.type, s.id, e)
    else {
      e.preventDefault()
      this.rowMenu(e)
    }
  }

  /* ---------- tidslinjen ---------- */

  private timeAt(e: { clientX: number }): number {
    const el = this.els.tlInner
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(0, (e.clientX - r.left) / this.s.zoom)
  }

  rulerDown(e: React.PointerEvent): void {
    this.seek(this.timeAt(e))
    const mv = (ev: PointerEvent) => this.seek(this.timeAt(ev), true)
    const up = () => {
      window.removeEventListener('pointermove', mv)
      this.set({ t: this.t })
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up, { once: true })
  }

  rowDown(e: React.PointerEvent): void {
    if (e.target !== e.currentTarget) return
    this.set({ sel: null, replaceFor: null })
    this.rulerDown(e)
  }

  startDrag(e: React.PointerEvent, kind: Kind, id: string, edge?: 'l' | 'r'): void {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const p = this.s.proj
    if (!p) return
    const it = itemsOf(p, kind).find((x) => x.id === id)
    if (!it) return
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      this.toggleMulti(kind, id)
      return
    }
    if (p.tracks[TK[kind]].lock) {
      this.set({ sel: { type: kind, id }, multi: [], replaceFor: null })
      return
    }
    const L = layout(p)
    const l = kind === 'clip' ? L.find((x) => x.c.id === id) : undefined
    const snaps = [0, this.t]
    for (const x of L) if (x.c.id !== id) snaps.push(x.start, x.end)
    for (const x of p.texts) if (x.id !== id) snaps.push(x.start, x.start + x.dur)
    for (const x of p.subs) if (x.id !== id) snaps.push(x.start, x.end)
    for (const x of p.ov) if (x.id !== id) snaps.push(x.start, x.start + ovDur(x))
    for (const m of p.markers) snaps.push(m.t)
    this.drag = { kind, id, edge, x0: e.clientX, y0: e.clientY, p0: p, lanes0: { ...p.lanes }, o: { ...(it as unknown as AnyRec) }, l: l ? { start: l.start, dur: l.dur } : null, moved: false, snaps }
    if (this.s.sel?.id !== id) this.set((s) => ({ sel: { type: kind, id }, replaceFor: null, multi: s.multi.some((m) => m.id === id) ? s.multi : [] }))
    window.addEventListener('pointermove', this.onDrag)
    window.addEventListener('pointerup', this.endDrag, { once: true })
  }

  private snapT(v: number): number {
    const d = this.drag
    if (!d) return v
    const tol = 8 / this.s.zoom
    let best = v
    let bd = tol
    for (const s of d.snaps) {
      const q = Math.abs(s - v)
      if (q < bd) {
        bd = q
        best = s
      }
    }
    return best
  }

  private onDrag = (e: PointerEvent): void => {
    const d = this.drag
    const P = this.s.proj
    if (!d || !P) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.moved) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 6) return
      d.moved = true
      this.pushHist()
    }
    const ds = dx / this.s.zoom
    const num = (k: string) => (typeof d.o[k] === 'number' ? (d.o[k] as number) : 0)
    const o = { kind: d.o.kind, media: d.o.media, link: d.o.link, speed: num('speed'), in: num('in'), out: num('out'), dur: num('dur'), start: num('start'), end: num('end'), srcDur: num('srcDur'), lane: num('lane') }
    const K = d.kind
    const E = d.edge
    let patch: AnyRec | null = null
    const mediaDur = () => P.media.find((m) => m.id === o.media)?.dur || 1e9
    if (K === 'clip') {
      if (!E) {
        this.set({ clipDrag: { id: d.id, dx } })
        return
      }
      const md = mediaDur()
      const sp = o.speed || 1
      if (o.kind === 'video') patch = E === 'l' ? { in: clamp(o.in + ds * sp, 0, o.out - 0.2) } : { out: clamp(o.out + ds * sp, o.in + 0.2, md) }
      else patch = { dur: Math.max(0.3, E === 'l' ? o.dur - ds : o.dur + ds) }
    } else if (K === 'text') {
      const end = o.start + o.dur
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) }
      else if (E === 'l') {
        const s = clamp(this.snapT(o.start + ds), 0, end - 0.2)
        patch = { start: s, dur: end - s }
      } else patch = { dur: Math.max(0.2, this.snapT(end + ds) - o.start) }
    } else if (K === 'sub') {
      if (!E) {
        const s = Math.max(0, this.snapT(o.start + ds))
        patch = { start: s, end: s + (o.end - o.start) }
      } else if (E === 'l') patch = { start: clamp(this.snapT(o.start + ds), 0, o.end - 0.2) }
      else patch = { end: Math.max(o.start + 0.2, this.snapT(o.end + ds)) }
    } else if (K === 'ov') {
      const md = mediaDur()
      const sp = o.speed || 1
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) }
      else if (o.kind === 'video') {
        if (E === 'l') {
          const i = clamp(o.in + ds * sp, 0, o.out - 0.2)
          const st = o.start + (i - o.in) / sp
          patch = st < 0 ? { in: o.in - o.start * sp, start: 0 } : { in: i, start: st }
        } else patch = { out: clamp(o.out + ds * sp, o.in + 0.2, md) }
      } else {
        const end = o.start + o.dur
        if (E === 'l') {
          const s0 = clamp(this.snapT(o.start + ds), 0, end - 0.2)
          patch = { start: s0, dur: end - s0 }
        } else patch = { dur: Math.max(0.2, this.snapT(end + ds) - o.start) }
      }
    } else {
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) }
      else if (E === 'l') {
        const i = clamp(o.in + ds, 0, o.out - 0.2)
        const st = o.start + (i - o.in)
        patch = st < 0 ? { in: o.in - o.start, start: 0 } : { in: i, start: st }
      } else patch = { out: clamp(o.out + ds, o.in + 0.2, o.srcDur) }
    }
    if (!E && isLane(K)) {
      const nl = Math.max(1, d.p0.lanes[K] || 1)
      const ln = clamp((o.lane || 0) + Math.round(dy / LANEH[K]), 0, Math.min(49, nl))
      patch = { ...(patch ?? {}), lane: ln }
    }
    const pt = patch
    const KK = KEYS[K]
    this.live((s) => {
      let q: Project = { ...s, [KK]: (s[KK] as Item[]).map((x) => (x.id === d.id ? { ...x, ...pt } : x)) }
      if (typeof pt.lane === 'number' && isLane(K)) q = { ...q, lanes: { ...q.lanes, [K]: Math.max(d.lanes0[K] || 1, pt.lane + 1) } }
      if (K !== 'clip' && !E && typeof o.link === 'string' && typeof pt.start === 'number') q = this.moveLinked(q, d.p0, o.link, d.id, pt.start - o.start)
      else if (K === 'clip') q = this.linkFollow(d.p0, q)
      return q
    })
  }

  private endDrag = (): void => {
    window.removeEventListener('pointermove', this.onDrag)
    const d = this.drag
    this.drag = null
    const P = this.s.proj
    if (!d || !P) return
    const cd = this.s.clipDrag
    if (d.kind === 'clip' && !d.edge && d.moved && cd && d.l) {
      const ds = cd.dx / this.s.zoom
      const L = layout(P)
      const ctr = d.l.start + d.l.dur / 2 + ds
      const idx = L.filter((x) => x.c.id !== d.id && x.start + x.dur / 2 < ctr).length
      const me = P.clips.find((c) => c.id === d.id)
      if (me) {
        const arr = P.clips.filter((c) => c.id !== d.id)
        arr.splice(idx, 0, me)
        this.set({ proj: this.linkFollow(P, { ...P, clips: arr }), clipDrag: null })
      } else this.set({ clipDrag: null })
      this.afterProj()
      return
    }
    if (cd) this.set({ clipDrag: null })
    if (!d.moved) return
    let q = P
    if (d.kind === 'sub') q = { ...q, subs: [...q.subs].sort((a, b) => a.start - b.start) }
    if (isLane(d.kind)) {
      const K = d.kind
      const used = Math.max(1, ...(q[KEYS[K]] as { lane: number }[]).map((x) => (x.lane || 0) + 1))
      q = { ...q, lanes: { ...q.lanes, [K]: Math.max(d.lanes0[K] || 1, used) } }
    }
    this.set({ proj: fixLanes(q, new Set([d.id])) })
    this.afterProj()
  }

  fitZoom(): void {
    const el = this.els.tl
    const p = this.s.proj
    if (!p) return
    const w = el ? el.clientWidth - 30 : 900
    this.set({ zoom: clamp(w / (totalDur(p) + 1), 4, 400) })
  }

  zoomBy(f: number): void {
    this.set((s) => ({ zoom: clamp(s.zoom * f, 4, 400) }))
  }

  private wheelEl: HTMLElement | null = null
  private watchWheel(): void {
    const tl = this.els.tl
    if (tl === this.wheelEl) return
    this.wheelEl?.removeEventListener('wheel', this.onTlWheel)
    this.wheelEl = tl
    tl?.addEventListener('wheel', this.onTlWheel, { passive: false })
  }

  private onTlWheel = (e: WheelEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    const tl = this.els.tl
    const inner = this.els.tlInner
    if (!tl) return
    const Z = this.s.zoom
    const nz = clamp(Z * Math.exp(-e.deltaY * 0.0022), 4, 400)
    if (Math.abs(nz - Z) < 0.01) return
    const r = (inner ?? tl).getBoundingClientRect()
    const t = (e.clientX - r.left) / Z
    this.set({ zoom: nz })
    requestAnimationFrame(() => {
      tl.scrollLeft += t * (nz - Z)
    })
  }

  /* ---------- filer ---------- */

  private okType(f: File): 'video' | 'image' | 'audio' | null {
    const n = (f.name || '').toLowerCase()
    const t = f.type || ''
    if (/^video\/(mp4|webm|quicktime|x-m4v)$/.test(t) || (!t && /\.(mp4|mov|m4v|webm)$/.test(n))) return 'video'
    if (/^image\/(png|jpeg|webp|gif)$/.test(t)) return 'image'
    if (/^audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac|ogg|webm|flac|x-flac)$/.test(t) || (!t && /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(n))) return 'audio'
    return null
  }

  /** Åpner filvelgeren. `replace` = bytt media i valgt klipp. */
  pickMedia(): void {
    const rep = this.s.replaceFor
    this.d.pickFile(rep ? 'replace' : 'lib', rep ? `${VIDEO_ACCEPT},${IMAGE_ACCEPT}` : ALL_ACCEPT)
  }

  pickFiles(mode: FileMode, accept: string): void {
    this.d.pickFile(mode, accept)
  }

  /** Nye filer fra filvelgeren, dra og slipp, Dine medier eller utklippstavlen. */
  async addFiles(files: readonly File[], mode: FileMode): Promise<void> {
    const p0 = this.s.proj
    if (!p0) return
    const added: Media[] = []
    let bad = 0
    let big = 0
    for (const f of files.slice(0, 50)) {
      const k = this.okType(f)
      if (!k) {
        bad++
        continue
      }
      if (f.size > LIM[k]) {
        big++
        continue
      }
      this.flash('Leser {name} …', { name: f.name })
      let id: string
      try {
        id = await this.d.files.add(p0, f, f.name)
      } catch (e) {
        this.flash(e instanceof Error && /prosjektmappen/.test(e.message) ? 'Filen kunne ikke lagres i prosjektmappen.' : 'Nettleseren har ikke plass til filen.')
        continue
      }
      const m = await this.mediaFor(id, f, k, f.name)
      if (!m) {
        bad++
        continue
      }
      added.push(m)
    }
    const notes: string[] = []
    const say = this.d
    void say
    if (bad) notes.push(bad === 1 ? '1 fil kunne ikke brukes (bruk MP4, MOV, WebM, PNG, JPG, WebP, MP3, WAV eller M4A)' : `${bad} filer kunne ikke brukes (bruk MP4, MOV, WebM, PNG, JPG, WebP, MP3, WAV eller M4A)`)
    if (big) notes.push(big === 1 ? '1 fil er for stor' : `${big} filer er for store`)
    if (bad || big) this.flash(bad && big ? '{a}. {b}.' : '{a}.', { a: notes[0] ?? '', b: notes[1] ?? '' })
    else if (added.length) this.flash(added.length === 1 ? 'Filen er lagt til.' : '{n} filer er lagt til.', { n: added.length })
    else this.set({ toast: null })
    if (added.length) this.applyMedia(added, mode)
  }

  /** En fil som allerede ligger i Dine medier (ingen ny opplasting). */
  async addAsset(mediaId: string, blob: Blob, name: string, mode: FileMode): Promise<void> {
    const f = blob instanceof File ? blob : new File([blob], name, { type: blob.type })
    const k = this.okType(f)
    if (!k || !this.s.proj) return
    const m = await this.mediaFor(mediaId, f, k, name)
    if (m) this.applyMedia([m], mode)
    else this.flash('Filen kunne ikke brukes.')
  }

  private async mediaFor(id: string, f: Blob, k: Media['kind'], name: string): Promise<Media | null> {
    const exists = this.s.proj?.media.find((x) => x.id === id)
    if (exists) return exists
    const url = this.urls[id] ?? URL.createObjectURL(f)
    this.urls[id] = url
    const meta = await probe(k, url)
    if (!meta) {
      URL.revokeObjectURL(url)
      delete this.urls[id]
      return null
    }
    if (k !== 'image') setTimeout(() => void this.makeWave(id, f), 50)
    return { id, name: name.slice(0, 200), kind: k, ...meta }
  }

  private applyMedia(added: Media[], mode: FileMode): void {
    const fresh = added.filter((m) => !this.s.proj?.media.some((x) => x.id === m.id))
    if (fresh.length) this.setProj((p) => ({ ...p, media: [...p.media, ...fresh] }), true, 'add')
    const rep = this.s.replaceFor
    if (mode === 'replace' && rep) {
      const m = added.find((x) => x.kind !== 'audio')
      if (m) this.replaceClip(rep, m)
    } else if (mode === 'music') {
      for (const m of added) if (m.kind === 'audio') this.addMusic(m)
    } else if (mode === 'vo') {
      for (const m of added) {
        if (m.kind !== 'audio') continue
        const a = { ...music(m, { start: this.voStart }), name: m.name, vol: 1, fadeIn: 0, fadeOut: 0 }
        this.setProj((p) => ({ ...p, music: [...p.music, a] }), true, 'add')
        this.set({ sel: { type: 'music', id: a.id } })
      }
    } else if (mode === 'logo') {
      const m = added.find((x) => x.kind === 'image')
      if (m) this.patchLogo({ src: m.id, on: true })
    } else if (mode === 'drop') {
      for (const m of added) {
        if (m.kind === 'audio') this.addMusic(m)
        else this.insertClip(m)
      }
    }
  }

  pickSrtFile(): void {
    this.d.pickSrt()
  }

  async importSrt(f: File): Promise<void> {
    if (f.size > 5e6) {
      this.flash('Filen er for stor.')
      return
    }
    const subs = fromSrt(await f.text())
    if (!subs.length) {
      this.flash('Fant ingen undertekster i filen.')
      return
    }
    this.setProj((p) => ({ ...p, subs }))
    this.flash('{n} undertekster er importert.', { n: subs.length })
  }

  downloadSrt(): void {
    const p = this.s.proj
    if (p) this.d.download(new Blob([toSrt(p.subs)], { type: 'text/plain;charset=utf-8' }), `${fileBase(p)}.srt`)
  }

  getBlob = async (id: string): Promise<Blob | null> => this.d.files.open(id)

  async makeWave(id: string, blob?: Blob): Promise<void> {
    if (id in this.waves) return
    this.waves[id] = null
    const w = await wave(blob ?? (await this.getBlob(id)))
    if (w && this.alive) {
      this.waves[id] = w.url
      this.set((s) => ({ rev: s.rev + 1 }))
    }
  }

  removeMedia(m: Media): void {
    const p = this.s.proj
    if (!p) return
    if (usedMedia(p).has(m.id)) {
      this.flash('Filen er i bruk. Fjern klippene som bruker den først.')
      return
    }
    this.setProj((q) => ({ ...q, media: q.media.filter((x) => x.id !== m.id) }))
  }

  /* ---------- utvalg ---------- */

  selList(): Sel[] {
    const s = this.s.sel
    const out = [...this.s.multi]
    if (s && !out.some((x) => x.id === s.id)) out.push(s)
    return out
  }

  toggleMulti(kind: Kind, id: string): void {
    let m = this.selList()
    m = m.some((x) => x.id === id) ? m.filter((x) => x.id !== id) : [...m, { type: kind, id }]
    this.set({ multi: m, sel: m[m.length - 1] ?? null, replaceFor: null })
  }

  selItem(): { type: Kind; it: Item } | null {
    const s = this.s.sel
    const p = this.s.proj
    if (!s || !p) return null
    const it = itemsOf(p, s.type).find((x) => x.id === s.id)
    return it ? { type: s.type, it } : null
  }

  /** Sletter alt som er valgt (ett eller flere elementer). */
  delSel(): void {
    const L = this.selList()
    if (!L.length) return
    const ids = new Set(L.map((x) => x.id))
    this.setProj((p) => ({ ...p, clips: p.clips.filter((x) => !ids.has(x.id)), texts: p.texts.filter((x) => !ids.has(x.id)), subs: p.subs.filter((x) => !ids.has(x.id)), music: p.music.filter((x) => !ids.has(x.id)), ov: p.ov.filter((x) => !ids.has(x.id)) }))
    this.set({ sel: null, multi: [], replaceFor: null, xform: null })
  }

  copySel(): void {
    const p = this.s.proj
    const L = this.selList()
    if (!p || !L.length) return
    const lay = layout(p)
    const items = L.map((x) => {
      const it = itemsOf(p, x.type).find((y) => y.id === x.id)
      return it ? { type: x.type, it: structuredClone(it) } : null
    }).filter((x): x is { type: Kind; it: Item } => !!x)
    const st = (x: { type: Kind; it: Item }) => (x.type === 'clip' ? (lay.find((l) => l.c.id === x.it.id)?.start ?? 0) : startOf(x.it))
    const sts = items.map(st)
    this.clip = { items, t0: Math.min(...sts), st: sts }
    this.set({ hasClip: true })
    this.flash(items.length === 1 ? 'Kopiert. Lim inn med Ctrl+V.' : '{n} elementer kopiert. Lim inn med Ctrl+V.', { n: items.length })
  }

  cut(): void {
    this.copySel()
    this.delSel()
  }

  paste(): void {
    const c = this.clip
    if (!c || !this.s.proj) return
    const t = this.t
    const sel: Sel[] = []
    const s0 = this.s.sel
    this.setProj((p) => {
      const q: Project = { ...p, clips: [...p.clips], texts: [...p.texts], subs: [...p.subs], music: [...p.music], ov: [...p.ov] }
      let ci = s0?.type === 'clip' ? q.clips.findIndex((x) => x.id === s0.id) + 1 : 0
      if (ci <= 0) ci = q.clips.length
      c.items.forEach((x, i) => {
        const n = { ...structuredClone(x.it), id: uid(x.type[0]) } as Item & AnyRec
        delete n.link
        const off = t + ((c.st[i] ?? 0) - c.t0)
        if (x.type === 'clip') q.clips.splice(ci++, 0, n as Clip)
        else if (x.type === 'sub') {
          const sb = n as Sub
          const d = sb.end - sb.start
          sb.start = off
          sb.end = off + d
          q.subs.push(sb)
        } else {
          ;(n as TextItem).start = off
          ;(q[KEYS[x.type]] as Item[]).push(n)
        }
        sel.push({ type: x.type, id: n.id })
      })
      q.subs.sort((a, b) => a.start - b.start)
      return q
    })
    this.set({ multi: sel.length > 1 ? sel : [], sel: sel[sel.length - 1] ?? null })
  }

  dupSel(): void {
    const x = this.selItem()
    if (!x) return
    const K = KEYS[x.type]
    const n = { ...x.it, id: uid(x.type[0]) } as Item & AnyRec
    delete n.link
    if (x.type === 'text') (n as TextItem).start = (x.it as TextItem).start + (x.it as TextItem).dur
    if (x.type === 'ov') (n as Overlay).start = (x.it as Overlay).start + ovDur(x.it as Overlay)
    if (x.type === 'sub') {
      const s = x.it as Sub
      ;(n as Sub).start = s.end
      ;(n as Sub).end = s.end + (s.end - s.start)
    }
    if (x.type === 'music') {
      const m = x.it as Music
      ;(n as Music).start = m.start + (m.out - m.in)
    }
    this.setProj((p) => {
      const arr = [...(p[K] as Item[])]
      const i = arr.findIndex((y) => y.id === x.it.id)
      arr.splice(i + 1, 0, n)
      return { ...p, [K]: x.type === 'sub' ? (arr as Sub[]).sort((a, b) => a.start - b.start) : arr }
    })
    this.set({ sel: { type: x.type, id: n.id } })
  }

  moveClip(dir: number): void {
    const s = this.s.sel
    if (s?.type !== 'clip') return
    this.setProj((p) => {
      const arr = [...p.clips]
      const i = arr.findIndex((c) => c.id === s.id)
      const j = i + dir
      const a = arr[i]
      const b = arr[j]
      if (i < 0 || !a || !b) return p
      arr[i] = b
      arr[j] = a
      return { ...p, clips: arr }
    })
  }

  split(): void {
    const p = this.s.proj
    if (!p) return
    const x = this.selItem()
    const t = this.t
    if (x?.type === 'text') {
      const o = x.it as TextItem
      if (!(t > o.start + 0.1 && t < o.start + o.dur - 0.1)) {
        this.flash('Flytt spillehodet inn i teksten for å dele den.')
        return
      }
      const b: TextItem = { ...o, id: uid('t'), start: t, dur: o.start + o.dur - t }
      this.setProj((q) => {
        const arr = q.texts.map((y) => (y.id === o.id ? { ...y, dur: t - o.start } : y))
        arr.splice(arr.findIndex((y) => y.id === o.id) + 1, 0, b)
        return { ...q, texts: arr }
      })
      this.set({ sel: { type: 'text', id: b.id } })
      return
    }
    if (x?.type === 'music') {
      const o = x.it as Music
      const rel = t - o.start
      if (!(rel > 0.1 && rel < o.out - o.in - 0.1)) {
        this.flash('Flytt spillehodet inn i lydsporet for å dele det.')
        return
      }
      const b: Music = { ...o, id: uid('a'), start: t, in: o.in + rel, loop: false }
      this.setProj((q) => ({ ...q, music: [...q.music.map((y) => (y.id === o.id ? { ...y, out: o.in + rel, loop: false } : y)), b] }))
      this.set({ sel: { type: 'music', id: b.id } })
      return
    }
    const L = layout(p)
    const inside = (l: { start: number; end: number }) => t > l.start + 0.1 && t < l.end - 0.1
    const l = (x?.type === 'clip' ? L.find((y) => y.c.id === x.it.id && inside(y)) : undefined) ?? [...L].reverse().find(inside)
    if (!l) {
      this.flash('Flytt spillehodet inn i et klipp for å dele det.')
      return
    }
    const c = l.c
    const off = t - l.start
    let a: Clip
    let b: Clip
    if (c.kind === 'video') {
      const so = off * (c.speed || 1)
      a = c.rev ? { ...c, in: c.out - so } : { ...c, out: c.in + so }
      b = c.rev ? { ...c, id: uid('c'), out: c.out - so, trans: { type: 'none', dur: 0.5 } } : { ...c, id: uid('c'), in: c.in + so, trans: { type: 'none', dur: 0.5 } }
    } else {
      a = { ...c, dur: off }
      b = { ...c, id: uid('c'), dur: l.dur - off, trans: { type: 'none', dur: 0.5 } }
    }
    this.setProj((q) => {
      const arr = [...q.clips]
      arr.splice(arr.findIndex((y) => y.id === c.id), 1, a, b)
      return { ...q, clips: arr }
    })
    this.set({ sel: { type: 'clip', id: b.id } })
  }

  /* ---------- redigering ---------- */

  patch(kind: Kind, id: string, obj: AnyRec, key?: string): void {
    const K = KEYS[kind]
    this.setProj((p) => ({ ...p, [K]: (p[K] as Item[]).map((x) => (x.id === id ? { ...x, ...obj } : x)) }), true, key ?? kind + id)
  }

  patchLogo(obj: Partial<Project['logo']>): void {
    this.setProj((p) => ({ ...p, logo: { ...p.logo, ...obj } }), true, 'logo')
  }

  patchSubStyle(obj: Partial<Project['subStyle']>): void {
    this.setProj((p) => ({ ...p, subStyle: { ...p.subStyle, ...obj } }), true, 'substyle')
  }

  insertClip(m: Media | null, extra?: Clip): void {
    const c = extra ?? (m ? mediaClip(m) : null)
    if (!c) return
    const s = this.s.sel
    this.setProj((p) => {
      const arr = [...p.clips]
      let i = s?.type === 'clip' ? arr.findIndex((x) => x.id === s.id) + 1 : 0
      if (i <= 0) i = arr.length
      const cc = arr.length ? c : { ...c, trans: { type: 'none', dur: 0.5 } }
      arr.splice(i, 0, cc)
      return { ...p, clips: arr }
    }, true, 'add')
    this.set({ sel: { type: 'clip', id: c.id } })
  }

  replaceClip(id: string, m: Media): void {
    this.setProj((p) => ({
      ...p,
      clips: p.clips.map((c) => {
        if (c.id !== id) return c
        const n = mediaClip(m, { id: c.id, trans: c.trans })
        if (n.kind === 'image') n.dur = c.kind === 'video' ? Math.max(0.1, (c.out - c.in) / (c.speed || 1)) : c.dur
        return n
      }),
    }))
    this.set({ replaceFor: null, sel: { type: 'clip', id } })
  }

  addMusic(m: Media): void {
    const p = this.s.proj
    if (!p) return
    const a = music(m, { start: p.music.length ? this.t : 0 })
    this.setProj((q) => ({ ...q, music: [...q.music, a] }), true, 'add')
    this.set({ sel: { type: 'music', id: a.id } })
  }

  addOverlay(m: Media): void {
    const fr = this.s.proj
    if (!fr) return
    const o = overlay(m, { start: this.t, scale: fr.w >= fr.h ? 0.36 : 0.6, y: fr.w >= fr.h ? 0.7 : 0.3 })
    this.setProj((p) => ({ ...p, ov: [...p.ov, o] }), true, 'add')
    this.set({ sel: { type: 'ov', id: o.id }, multi: [] })
  }

  addText(o: Partial<TextItem>): void {
    const x = text({ ...o, start: this.t, dur: o.dur ?? 4 })
    this.setProj((p) => ({ ...p, texts: [...p.texts, x] }))
    this.set({ sel: { type: 'text', id: x.id } })
  }

  addSub(): void {
    const s: Sub = { id: uid('s'), start: this.t, end: this.t + 2.5, text: 'Ny undertekst' }
    this.setProj((p) => ({ ...p, subs: [...p.subs, s].sort((a, b) => a.start - b.start) }))
    this.set({ sel: { type: 'sub', id: s.id } })
  }

  addColor(): void {
    this.insertClip(null, colorClip({ dur: 4, c1: '#111111', c2: '#343434' }))
  }

  setTrans(k: 'tin' | 'tout', o: Partial<Project['tin']>): void {
    this.setProj((q) => ({ ...q, [k]: { ...q[k], ...o } }), true, `tr-${k}`)
  }

  setMix(k: keyof Project['mix'], v: number | boolean): void {
    this.setProj((q) => ({ ...q, mix: { ...mixOf(q), [k]: v } }), true, `mix-${k}`)
  }

  addMarker(): void {
    const m = { id: uid('k'), t: this.t, label: '', color: '#ff5a36' }
    this.setProj((p) => ({ ...p, markers: [...p.markers, m].sort((a, b) => a.t - b.t) }))
    this.flash('Markør lagt til ved {t}.', { t: fmtT(this.t) })
  }

  markerAt(t: number): Project['markers'][number] | undefined {
    const p = this.s.proj
    return p?.markers.find((k) => Math.abs(k.t - t) * this.s.zoom < 7 || Math.abs(k.t - t) < 0.04)
  }

  delMarker(id: string): void {
    this.setProj((q) => ({ ...q, markers: q.markers.filter((k) => k.id !== id) }))
    this.flash('Markør fjernet.')
  }

  toggleMarker(): void {
    const k = this.markerAt(this.t)
    if (k) this.delMarker(k.id)
    else this.addMarker()
  }

  clearMarkers(): void {
    this.setProj((q) => ({ ...q, markers: [] }))
  }

  toggleTrack(k: TrackKey, f: 'lock' | 'hide'): void {
    this.setProj((p) => ({ ...p, tracks: { ...p.tracks, [k]: { ...p.tracks[k], [f]: !p.tracks[k][f] } } }))
  }

  addLane(k: LaneKind): void {
    this.setProj((q) => ({ ...q, lanes: { ...q.lanes, [k]: Math.min(50, (q.lanes[k] || 1) + 1) } }))
  }

  clearLane0(tk: TrackKey, nl: number): void {
    if (nl > 1 && isLane(tk)) {
      this.delLane(tk, 0)
      return
    }
    const K = ({ text: 'texts', ov: 'ov', video: 'clips', subs: 'subs', music: 'music' } as const)[tk]
    const p = this.s.proj
    if (!p) return
    const n = (p[K] as (Item & { lane?: number })[]).filter((x) => (x.lane || 0) === 0).length
    if (!n) return
    this.setProj((q) => ({ ...q, [K]: (q[K] as (Item & { lane?: number })[]).filter((x) => (x.lane || 0) !== 0) }))
    this.set({ sel: null, multi: [] })
    this.flash(n === 1 ? 'Ett element er fjernet. Angre med Ctrl+Z.' : '{n} elementer er fjernet. Angre med Ctrl+Z.', { n })
  }

  delLane(k: LaneKind, i: number): void {
    const p = this.s.proj
    if (!p) return
    const K = KEYS[k]
    const n = (p[K] as { lane: number }[]).filter((x) => (x.lane || 0) === i).length
    this.setProj((q) => ({
      ...q,
      [K]: (q[K] as (Item & { lane: number })[]).filter((x) => (x.lane || 0) !== i).map((x) => ((x.lane || 0) > i ? { ...x, lane: x.lane - 1 } : x)),
      lanes: { ...q.lanes, [k]: Math.max(1, (q.lanes[k] || 1) - 1) },
    }))
    this.set({ sel: null, multi: [] })
    if (n) this.flash(n === 1 ? 'Laget og ett element er fjernet. Angre med Ctrl+Z.' : 'Laget og {n} elementer er fjernet. Angre med Ctrl+Z.', { n })
  }

  /* ---------- koblede elementer ---------- */

  private moveLinked(q: Project, base: Project, link: string, selfId: string, dt0: number): Project {
    const K = ['texts', 'subs', 'music', 'ov'] as const
    let mn = Infinity
    for (const k of K) for (const x of base[k]) if (x.link === link) mn = Math.min(mn, x.start)
    const dt = Math.max(dt0, -mn)
    const r: Record<string, unknown> = { ...q }
    for (const k of K) {
      const bm = new Map<string, { start: number; end?: number }>(base[k].map((x) => [x.id, x]))
      r[k] = (q[k] as (Item & { link?: string; start: number })[]).map((x) => {
        if (x.link !== link || x.id === selfId) return x
        const b = bm.get(x.id)
        if (!b) return x
        return k === 'subs' ? { ...x, start: b.start + dt, end: (b.end ?? 0) + dt } : { ...x, start: b.start + dt }
      })
    }
    return r as unknown as Project
  }

  /** Når et klipp i en gruppe flyttes på videosporet, følger resten av gruppen med. */
  linkFollow(base: Project, next: Project): Project {
    const g: Record<string, string> = {}
    for (const c of next.clips) if (c.link) g[c.link] = c.id
    const ks = Object.keys(g)
    if (!ks.length) return next
    const Lb = layout(base)
    const Ln = layout(next)
    const st = (L: typeof Lb, id: string | undefined) => L.find((x) => x.c.id === id)?.start ?? null
    const dl: Record<string, number> = {}
    let any = false
    for (const k of ks) {
      const a = st(Lb, g[k])
      const b = st(Ln, g[k])
      if (a !== null && b !== null && Math.abs(a - b) > 1e-4) {
        dl[k] = b - a
        any = true
      }
    }
    if (!any) return next
    const r: Record<string, unknown> = { ...next }
    for (const k of ['texts', 'subs', 'music', 'ov'] as const) {
      const bm = new Map<string, { start: number; end?: number }>(base[k].map((x) => [x.id, x]))
      r[k] = (next[k] as (Item & { link?: string; start: number })[]).map((x) => {
        const dd = x.link ? dl[x.link] : undefined
        if (!dd) return x
        const b = bm.get(x.id) ?? x
        return k === 'subs' ? { ...x, start: Math.max(0, b.start + dd), end: Math.max(0.2, ((b as { end?: number }).end ?? 0) + dd) } : { ...x, start: Math.max(0, b.start + dd) }
      })
    }
    return r as unknown as Project
  }

  linkSel(): void {
    const L = this.selList()
    const p = this.s.proj
    if (!p) return
    if (L.length < 2) {
      this.flash('Velg minst to elementer med Shift-klikk først.')
      return
    }
    const ids = new Set(L.map((x) => x.id))
    const ex = new Set<string>()
    for (const x of L) {
      const it = itemsOf(p, x.type).find((y) => y.id === x.id) as (Item & { link?: string }) | undefined
      if (it?.link) ex.add(it.link)
    }
    const inG = (x: { id: string; link?: string }) => ids.has(x.id) || (!!x.link && ex.has(x.link))
    if (p.clips.filter(inG).length > 1) {
      this.flash('En gruppe kan bare ha ett klipp fra videosporet.')
      return
    }
    const g = uid('g')
    const up = <T extends { id: string; link?: string }>(x: T): T => (inG(x) ? { ...x, link: g } : x)
    this.setProj((q) => ({ ...q, clips: q.clips.map(up), texts: q.texts.map(up), subs: q.subs.map(up), music: q.music.map(up), ov: q.ov.map(up) }))
    this.flash('Koblet sammen. Flytt ett av dem for å flytte alle.')
  }

  unlinkSel(): void {
    const ids = new Set(this.selList().map((x) => x.id))
    if (!ids.size) return
    const strip = <T extends { link?: string }>(x: T): T => {
      const y = { ...x }
      delete y.link
      return y
    }
    this.setProj((q) => {
      const K = ['clips', 'texts', 'subs', 'music', 'ov'] as const
      const r: Record<string, unknown> = { ...q }
      const cnt: Record<string, number> = {}
      for (const k of K) r[k] = (q[k] as { id: string; link?: string }[]).map((x) => (ids.has(x.id) && x.link ? strip(x) : x))
      for (const k of K) for (const x of r[k] as { link?: string }[]) if (x.link) cnt[x.link] = (cnt[x.link] ?? 0) + 1
      for (const k of K) r[k] = (r[k] as { link?: string }[]).map((x) => (x.link && (cnt[x.link] ?? 0) < 2 ? strip(x) : x))
      return r as unknown as Project
    })
    this.flash('Koblingen er fjernet.')
  }

  selectLinked(link: string): void {
    const p = this.s.proj
    if (!p) return
    const out: Sel[] = []
    for (const [t, k] of [['clip', 'clips'], ['text', 'texts'], ['sub', 'subs'], ['music', 'music'], ['ov', 'ov']] as const) {
      for (const x of p[k] as { id: string; link?: string }[]) if (x.link === link) out.push({ type: t, id: x.id })
    }
    this.set({ multi: out.length > 1 ? out : [], sel: out[out.length - 1] ?? null })
  }

  /* ---------- farge og lyd mellom klipp ---------- */

  copyLook(): void {
    const s = this.selItem()
    if (!s || (s.type !== 'clip' && s.type !== 'ov')) return
    const it = s.it as unknown as AnyRec
    const col: AnyRec = {}
    const aud: AnyRec = {}
    for (const k of ['look', 'bri', 'con', 'sat', 'dim', 'temp', 'tint', 'blur', 'vig', 'grain', 'cS', 'cM', 'cH', 'curves']) if (it[k] !== undefined) col[k] = it[k]
    if (it.kind === 'video') for (const k of ['vol', 'muted', 'afi', 'afo']) if (it[k] !== undefined) aud[k] = it[k]
    this.lookClip = { col, aud: Object.keys(aud).length ? aud : null }
    this.set({ hasLook: { aud: !!this.lookClip.aud } })
    this.flash('Farge og lyd kopiert.')
  }

  pasteLook(what: 'col' | 'aud'): void {
    const c = this.lookClip
    if (!c) return
    const src = what === 'aud' ? c.aud : c.col
    if (!src) {
      this.flash('Ingen lyd å lime inn.')
      return
    }
    const ids = new Set(this.selList().filter((x) => x.type === 'clip' || x.type === 'ov').map((x) => x.id))
    if (!ids.size) return
    const ap = <T extends Clip | Overlay>(x: T): T => {
      if (!ids.has(x.id)) return x
      if (what === 'aud') {
        if (x.kind !== 'video') return x
        const o = { ...x, vol: src.vol, muted: src.muted } as T & AnyRec
        if ('afi' in x || 'afi' in src) {
          o.afi = src.afi || 0
          o.afo = src.afo || 0
        }
        return o
      }
      return { ...x, ...src }
    }
    this.setProj((q) => ({ ...q, clips: q.clips.map(ap), ov: q.ov.map(ap) }))
    this.flash(what === 'aud' ? 'Lyd limt inn.' : 'Farge limt inn.')
  }

  /* ---------- lyd ---------- */

  async toggleVo(): Promise<void> {
    if (this.vo) {
      if (this.vo.rec.state !== 'inactive') this.vo.rec.stop()
      return
    }
    let st: MediaStream
    try {
      st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch {
      this.flash('Fikk ikke tilgang til mikrofonen.')
      return
    }
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(st)
    } catch {
      for (const t of st.getTracks()) t.stop()
      this.flash('Fikk ikke tilgang til mikrofonen.')
      return
    }
    const chunks: Blob[] = []
    const t0 = this.t
    this.vo = { rec, st, t0 }
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    rec.onstop = async () => {
      for (const t of st.getTracks()) t.stop()
      clearInterval(this.voI)
      this.vo = null
      if (this.playing) this.togglePlay()
      this.set({ vo: null })
      if (!chunks.length) return
      this.flash('Behandler opptaket …')
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ac = new AC()
        const buf = await ac.decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer())
        void ac.close()
        const d = new Date()
        const f = new File([toWav(buf)], `Voiceover ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}.wav`, { type: 'audio/wav' })
        this.voStart = t0
        await this.addFiles([f], 'vo')
      } catch {
        this.flash('Kunne ikke lagre opptaket.')
      }
    }
    rec.start(250)
    const since = this.now()
    this.set({ vo: { since, secs: 0 } })
    this.voI = setInterval(() => this.set({ vo: { since, secs: (this.now() - since) / 1000 } }), 500)
    if (!this.playing) this.togglePlay()
  }

  async levelClips(): Promise<void> {
    const p = this.s.proj
    if (!p) return
    const items: { k: 'clips' | 'ov'; id: string; media: string; a: number; b: number; s?: { peak: number; rms: number } | null }[] = []
    for (const l of layout(p)) if (l.c.kind === 'video' && !l.c.muted) items.push({ k: 'clips', id: l.c.id, media: l.c.media, a: l.c.in, b: l.c.out })
    for (const o of p.ov) if (o.kind === 'video' && !o.muted) items.push({ k: 'ov', id: o.id, media: o.media, a: o.in, b: o.out })
    if (!items.length) {
      this.flash('Fant ingen lyd å utjevne.')
      return
    }
    this.flash('Analyserer lyd …')
    for (const it of items) it.s = await audioStats(this.getBlob, it.media, it.a, it.b).catch(() => null)
    const ok = items.filter((it) => it.s && it.s.rms > 0.002)
    if (!ok.length) {
      this.flash('Fant ingen lyd å utjevne.')
      return
    }
    const target = Math.min(...ok.map((it) => (it.s?.rms ?? 0) * Math.min(1, 0.95 / Math.max(it.s?.peak ?? 0, 1e-4))))
    const vol: Record<string, number> = {}
    for (const it of ok) vol[it.id] = Math.round(clamp(target / (it.s?.rms ?? 1), 0.05, 1) * 100) / 100
    this.setProj((q) => ({ ...q, clips: q.clips.map((c) => (vol[c.id] !== undefined && c.kind !== 'color' ? { ...c, vol: vol[c.id] ?? c.vol } : c)), ov: q.ov.map((o) => (vol[o.id] !== undefined ? { ...o, vol: vol[o.id] ?? o.vol } : o)) }))
    this.flash('Lyden er utjevnet.')
  }

  async beatMarkers(m: Music): Promise<void> {
    this.flash('Analyserer lyd …')
    const r = await beats(this.getBlob, m.media, m.in, m.out).catch(() => null)
    const p = this.s.proj
    if (!r || !p) {
      this.flash('Fant ikke takten i sporet.')
      return
    }
    const T = totalDur(p)
    const per = r.period < 0.4 ? r.period * 2 : r.period
    const list: Project['markers'] = []
    for (let s = m.in + r.t0; s < m.out && list.length < 400; s += per) {
      const t = m.start + s - m.in
      if (t > T) break
      list.push({ id: uid('k'), t, label: 'Takt', color: '#f5b82c' })
    }
    this.setProj((q) => ({ ...q, markers: [...q.markers.filter((k) => k.label !== 'Takt'), ...list].sort((a, b) => a.t - b.t) }))
    this.flash('Markører satt på takten.')
  }

  async freeze(): Promise<void> {
    const p = this.s.proj
    if (!p) return
    const t = this.t
    const L = layout(p)
    const x = this.selItem()
    const l = (x?.type === 'clip' ? L.find((y) => y.c.id === x.it.id && t >= y.start && t < y.end) : undefined) ?? [...L].reverse().find((y) => t >= y.start && t < y.end && y.c.kind === 'video')
    if (!l || l.c.kind !== 'video') {
      this.flash('Flytt spillehodet inn i et videoklipp.')
      return
    }
    const v = this.M.vids[l.c.id]
    if (!v?.videoWidth) {
      this.flash('Videoen er ikke klar ennå.')
      return
    }
    this.stop()
    const c = l.c
    const st = srcTime(c, t - l.start)
    if (Math.abs(v.currentTime - st) > 0.02) {
      await new Promise<void>((r) => {
        const f = () => {
          v.removeEventListener('seeked', f)
          r()
        }
        v.addEventListener('seeked', f)
        setTimeout(f, 2000)
        v.currentTime = st
      })
    }
    const cv = document.createElement('canvas')
    cv.width = v.videoWidth
    cv.height = v.videoHeight
    cv.getContext('2d')?.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/jpeg', 0.92))
    if (!blob) return
    let id: string
    try {
      id = await this.d.files.add(p, blob, 'Frosset bilde.jpg')
    } catch {
      this.flash('Nettleseren har ikke plass til bildet.')
      return
    }
    const url = URL.createObjectURL(blob)
    this.urls[id] = url
    const im = new Image()
    im.src = url
    this.M.imgs[id] = im
    const m: Media = { id, name: 'Frosset bilde', kind: 'image', dur: 0, w: cv.width, h: cv.height, thumb: thumbOf(cv, cv.width, cv.height, false) }
    const off = (t - l.start) * (c.speed || 1)
    const fr = mediaClip(m, { trans: { type: 'none', dur: 0.5 }, kb: false, dur: 2 }) as MediaClip & AnyRec
    const keep = ['fit', 'zoom', 'fx', 'fy', 'x', 'y', 'scale', 'rot', 'flipH', 'flipV', 'crop', 'bri', 'con', 'sat', 'look', 'curves', 'cS', 'cM', 'cH', 'temp', 'tint', 'vig', 'grain', 'blur', 'dim'] as const
    for (const k of keep) (fr as AnyRec)[k] = c[k]
    this.setProj((q) => {
      const arr = [...q.clips]
      const i = arr.findIndex((y) => y.id === c.id)
      const parts: Clip[] = []
      const rest = c.out - c.in - off
      if (off > 0.05) parts.push(c.rev ? { ...c, in: c.out - off } : { ...c, out: c.in + off })
      parts.push(fr)
      if (rest > 0.05) parts.push(c.rev ? { ...c, id: uid('c'), out: c.out - off, trans: { type: 'none', dur: 0.5 } } : { ...c, id: uid('c'), in: c.in + off, trans: { type: 'none', dur: 0.5 } })
      arr.splice(i, 1, ...parts)
      return { ...q, media: [...q.media, m], clips: arr }
    })
    this.set({ sel: { type: 'clip', id: fr.id }, multi: [] })
  }

  /* ---------- dra fra biblioteket og overganger ---------- */

  medDown(e: React.PointerEvent, m: Media): void {
    if (e.button > 0 || e.pointerType === 'touch' || (e.target as HTMLElement).closest('button')) return
    const x0 = e.clientX
    const y0 = e.clientY
    let moved = false
    const mv = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
      moved = true
      ev.preventDefault()
      this.set({ medDrag: { id: m.id, name: m.name, x: ev.clientX, y: ev.clientY, hit: this.mediaHit(ev.clientX, ev.clientY, m) } })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!moved) return
      const hit = ev.type === 'pointerup' ? this.mediaHit(ev.clientX, ev.clientY, m) : null
      this.set({ medDrag: null })
      if (hit) this.mediaDrop(m, hit)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  private mediaHit(x: number, y: number, m: Media): Hit | null {
    const p = this.s.proj
    if (!p) return null
    const Z = this.s.zoom
    const inR = (el: HTMLElement | null, pad: number) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - pad && y <= r.bottom + pad ? r : null
    }
    const snap = (t: number) => {
      const cand = [0, this.t, ...p.markers.map((k) => k.t)]
      for (const l of layout(p)) cand.push(l.start, l.end)
      let b = t
      for (const c of cand) if (Math.abs(c - t) * Z < 8 && Math.abs(c - t) < Math.abs(b - t) + 1e-9) b = c
      return Math.max(0, b)
    }
    if (m.kind === 'audio') {
      const r = inR(this.els.musicRow, 14)
      return r ? { kind: 'music', t: snap((x - r.left) / Z), lane: clamp(Math.floor((y - r.top - 4) / LANEH.music), 0, 49) } : null
    }
    let r = inR(this.els.clipRow, 10)
    if (r) {
      const t = (x - r.left) / Z
      const L = layout(p)
      const idx = L.filter((l) => l.start + l.dur / 2 < t).length
      const at = L[idx]
      return { kind: 'clip', idx, t: at ? at.start : L.length ? (L[L.length - 1]?.end ?? 0) : 0 }
    }
    r = inR(this.els.ovRow, 0)
    if (r) return { kind: 'ov', t: snap((x - r.left) / Z), lane: clamp(Math.floor((y - r.top - 4) / LANEH.ov), 0, 49) }
    const cv = this.els.canvas
    if (cv) {
      const q = cv.getBoundingClientRect()
      if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) return { kind: 'stage', t: this.t }
    }
    return null
  }

  private mediaDrop(m: Media, hit: Hit): void {
    if (hit.kind === 'music') {
      const a = music(m, { start: hit.t, lane: hit.lane ?? 0 })
      this.setProj((p) => ({ ...p, music: [...p.music, a] }), true, 'add')
      this.set({ sel: { type: 'music', id: a.id }, multi: [] })
      return
    }
    if (hit.kind === 'clip') {
      const c = mediaClip(m)
      this.setProj((p) => {
        const arr = [...p.clips]
        arr.splice(Math.min(hit.idx ?? arr.length, arr.length), 0, arr.length ? c : { ...c, trans: { type: 'none', dur: 0.5 } })
        return { ...p, clips: arr }
      }, true, 'add')
      this.set({ sel: { type: 'clip', id: c.id }, multi: [] })
      return
    }
    const fr = this.s.proj
    if (!fr) return
    const o = overlay(m, { start: hit.t, lane: hit.lane ?? 0, scale: fr.w >= fr.h ? 0.36 : 0.6, y: fr.w >= fr.h ? 0.7 : 0.3 })
    this.setProj((p) => ({ ...p, ov: [...p.ov, o] }), true, 'add')
    this.set({ sel: { type: 'ov', id: o.id }, multi: [] })
  }

  transDown(e: React.PointerEvent, type: string): void {
    if (e.button > 0) return
    e.preventDefault()
    const x0 = e.clientX
    const y0 = e.clientY
    let moved = false
    const mv = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
      moved = true
      this.set({ trDrag: { type, x: ev.clientX, y: ev.clientY, hit: this.transHit(ev.clientX, ev.clientY) } })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      this.set({ trDrag: null })
      if (!moved) {
        this.applyTransSel(type)
        return
      }
      const hit = ev.type === 'pointerup' ? this.transHit(ev.clientX, ev.clientY) : null
      if (hit) this.applyTrans(hit, type)
      else if (ev.type === 'pointerup') this.flash('Slipp overgangen på videosporet.')
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  private transHit(x: number, y: number): TransHit | null {
    const el = this.els.clipRow
    const p = this.s.proj
    if (!el || !p?.clips.length) return null
    const r = el.getBoundingClientRect()
    if (y < r.top - 50 || y > r.bottom + 50 || x < r.left - 30 || x > r.right + 30) return null
    const Z = this.s.zoom
    const t = (x - r.left) / Z
    const L = layout(p)
    const first = L[0]
    const last = L[L.length - 1]
    if (!first || !last) return null
    const c: TransHit[] = [{ kind: 'tin', id: first.c.id, t: first.start }]
    for (let i = 1; i < L.length; i++) {
      const l = L[i]
      if (l) c.push({ kind: 'clip', id: l.c.id, t: l.start + l.tr / 2 })
    }
    c.push({ kind: 'tout', id: last.c.id, t: last.end })
    let best: TransHit | null = null
    let bd = Infinity
    for (const b of c) {
      const d = Math.abs(b.t - t)
      if (d < bd) {
        bd = d
        best = b
      }
    }
    return best
  }

  private applyTrans(hit: TransHit, type: string): void {
    const nm = TRSTD.find((x) => x[0] === type)?.[1] ?? TRANS.find((x) => x[0] === type)?.[1] ?? ''
    const dd = TRDUR[type] ?? 0.8
    if (hit.kind === 'clip') this.setProj((q) => ({ ...q, clips: q.clips.map((c) => (c.id === hit.id ? { ...c, trans: { type, dur: dd } } : c)) }))
    else this.setProj((q) => ({ ...q, [hit.kind]: { type, dur: dd } }))
    this.set({ sel: { type: 'clip', id: hit.id }, multi: [] })
    this.flash(hit.kind === 'tin' ? '{name} lagt til i starten.' : hit.kind === 'tout' ? '{name} lagt til på slutten.' : '{name} lagt til mellom klippene.', { name: this.d.t(nm) })
  }

  private applyTransSel(type: string): void {
    const s = this.s.sel
    const p = this.s.proj
    if (s?.type !== 'clip' || !p) {
      this.flash('Velg et klipp først, eller dra overgangen ned på videosporet.')
      return
    }
    const i = p.clips.findIndex((c) => c.id === s.id)
    if (i < 0) return
    this.applyTrans(i === 0 ? { kind: 'tin', id: s.id, t: 0 } : { kind: 'clip', id: s.id, t: 0 }, type)
  }

  /* ---------- høyreklikkmeny ---------- */

  private openMenu(e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void }, list: (MenuItem | 'sep' | null)[]): void {
    e.preventDefault()
    e.stopPropagation()
    const items: (MenuItem | 'sep')[] = []
    for (const x of list) {
      if (!x) continue
      if (x === 'sep') {
        if (items.length && items[items.length - 1] !== 'sep') items.push('sep')
        continue
      }
      items.push(x)
    }
    while (items.length && items[items.length - 1] === 'sep') items.pop()
    if (!items.length) return
    const h = items.reduce((a, it) => a + (it === 'sep' ? 9 : 32), 12)
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - 246))
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - h - 8))
    this.set({ menu: { x, y, items } })
  }

  private mi(l: Phrase, k: string, click: () => void, danger = false): MenuItem {
    return { l, k, danger, click: () => {
      this.set({ menu: null })
      click()
    } }
  }

  ctxFor(kind: Kind, id: string, e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void }): void {
    const p = this.s.proj
    const it = p ? (itemsOf(p, kind).find((x) => x.id === id) as (Item & { link?: string; kind?: string; trans?: { type: string } }) | undefined) : undefined
    if (!p || !it) return
    const M = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl+'
    const inSel = this.selList().some((x) => x.id === id)
    const multi = inSel && this.selList().length > 1
    if (!inSel) this.set({ sel: { type: kind, id }, multi: [], replaceFor: null })
    const vis = kind === 'clip' || kind === 'ov'
    const lc = this.lookClip
    const idx = kind === 'clip' ? p.clips.findIndex((c) => c.id === id) : -1
    this.openMenu(e, [
      !multi && (kind === 'clip' || kind === 'text' || kind === 'music') ? this.mi('Del ved spillehodet', 'S', () => this.split()) : null,
      !multi && kind === 'clip' && it.kind === 'video' ? this.mi('Frys bilde', '', () => void this.freeze()) : null,
      !multi && kind === 'music' ? this.mi('Markører på takten', '', () => void this.beatMarkers(it as Music)) : null,
      !multi && (kind === 'text' || kind === 'ov' || (kind === 'clip' && it.kind !== 'color')) ? this.mi('Transformer', '', () => this.startXf(kind, id, 'move')) : null,
      !multi && kind === 'ov' ? this.mi('Beskjær', '', () => this.startXf('ov', id, 'crop')) : null,
      'sep',
      this.mi('Kopier', `${M}C`, () => this.copySel()),
      this.mi('Klipp ut', `${M}X`, () => this.cut()),
      this.clip ? this.mi('Lim inn', `${M}V`, () => this.paste()) : null,
      !multi ? this.mi('Dupliser', `${M}D`, () => this.dupSel()) : null,
      'sep',
      vis && !multi ? this.mi('Kopier farge og lyd', `${M}⌥C`, () => this.copyLook()) : null,
      vis && lc ? this.mi('Lim inn farge', `${M}⌥V`, () => this.pasteLook('col')) : null,
      vis && lc?.aud ? this.mi('Lim inn lyd', '', () => this.pasteLook('aud')) : null,
      'sep',
      !multi && kind === 'clip' && idx > 0 && it.trans?.type !== 'none' ? this.mi('Fjern overgang', '', () => this.patch('clip', id, { trans: { ...(it as Clip).trans, type: 'none' } })) : null,
      !multi && kind === 'clip' && it.kind !== 'color' ? this.mi('Bytt media', '', () => this.set({ tab: 'media', replaceFor: id })) : null,
      !multi && kind === 'clip' ? this.mi('Overganger …', '', () => this.set({ tab: 'trans' })) : null,
      'sep',
      multi ? this.mi('Koble sammen', `${M}L`, () => this.linkSel()) : null,
      it.link ? this.mi('Koble fra', `${M}⇧L`, () => this.unlinkSel()) : null,
      it.link ? this.mi('Velg koblede', '', () => this.selectLinked(it.link ?? '')) : null,
      'sep',
      this.mi(multi ? 'Slett alle' : 'Slett', 'Delete', () => this.delSel(), true),
    ])
  }

  rowMenu(e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void }): void {
    const p = this.s.proj
    if (!p) return
    const M = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl+'
    this.openMenu(e, [
      this.clip ? this.mi('Lim inn her', `${M}V`, () => this.paste()) : null,
      this.markerAt(this.t) ? this.mi('Fjern markør', 'M', () => this.toggleMarker()) : this.mi('Legg til markør', 'M', () => this.addMarker()),
      p.markers.length ? this.mi('Fjern alle markører', '', () => this.clearMarkers()) : null,
      this.mi('Legg til tekst', '', () => this.addText(PRESETS[0]?.o ?? {})),
      'sep',
      this.mi('Vis hele tidslinjen', '', () => this.fitZoom()),
    ])
  }

  rowCtx(e: React.MouseEvent): void {
    if (e.target !== e.currentTarget) return
    this.rowMenu(e)
  }

  /* ---------- tastatur ---------- */

  onKey(e: KeyboardEvent): void {
    if (this.s.view !== 'edit' || this.s.exp || this.s.picker || this.s.folderDlg) return
    const tg = e.target as HTMLElement | null
    if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    this.poke()
    if (mod && k === 'z') {
      e.preventDefault()
      if (e.shiftKey) this.redo()
      else this.undo()
      return
    }
    if (mod && k === 'y') {
      e.preventDefault()
      this.redo()
      return
    }
    if (mod && k === 's') {
      e.preventDefault()
      if (e.shiftKey) void this.saveFile()
      else void this.saveBrowser()
      return
    }
    if (mod && k === 'd') {
      e.preventDefault()
      this.dupSel()
      return
    }
    if (mod && k === 'l') {
      e.preventDefault()
      if (e.shiftKey) this.unlinkSel()
      else this.linkSel()
      return
    }
    if (mod && e.altKey && k === 'c') {
      e.preventDefault()
      this.copyLook()
      return
    }
    if (mod && e.altKey && k === 'v') {
      e.preventDefault()
      this.pasteLook('col')
      return
    }
    if (mod && k === 'c') {
      e.preventDefault()
      this.copySel()
      return
    }
    if (mod && k === 'x') {
      e.preventDefault()
      this.cut()
      return
    }
    if (mod && k === 'v') {
      e.preventDefault()
      this.paste()
      return
    }
    if (mod) return
    if (e.code === 'Space') {
      e.preventDefault()
      this.togglePlay()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.s.sel) {
        e.preventDefault()
        this.delSel()
      }
    } else if (k === 's') {
      e.preventDefault()
      this.split()
    } else if (k === 'm') {
      e.preventDefault()
      this.toggleMarker()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      this.seek(this.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30))
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.seek(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.seek(1e9)
    } else if (e.key === 'Enter' && this.s.xform) {
      e.preventDefault()
      const x = this.s.xform
      this.set({ xform: x.mode === 'crop' ? { ...x, mode: 'move' } : null })
    } else if (e.key === 'Escape') {
      if (this.s.menu) this.set({ menu: null })
      else if (this.s.xform) {
        const x = this.s.xform
        this.set({ xform: x.mode === 'crop' ? { ...x, mode: 'move' } : null })
      } else this.set({ sel: null, multi: [], replaceFor: null })
    }
  }

  /* ---------- AI og eksport ---------- */

  async runAI(): Promise<void> {
    const p = this.s.proj
    if (!p || this.s.ai.busy) return
    if (!p.clips.some((c) => c.kind === 'video')) {
      this.set((s) => ({ ai: { ...s.ai, msg: { p: 'Legg til et videoklipp med tale først.' }, err: true } }))
      return
    }
    if (p.subs.length && !this.d.confirm('Erstatte undertekstene som finnes?')) return
    this.set((s) => ({ ai: { ...s.ai, busy: true, msg: { p: 'Starter …' }, err: false } }))
    try {
      const subs = await transcribe(p, this.getBlob, { lang: this.s.ai.lang, model: this.s.ai.model, onProgress: (m, v) => this.alive && this.set((s) => ({ ai: { ...s.ai, msg: v ? { p: m, v } : { p: m } } })) })
      if (subs.length) this.setProj((q) => ({ ...q, subs }))
      this.set((s) => ({ ai: { ...s.ai, busy: false, err: false, msg: subs.length ? { p: '{n} undertekster er laget. Les over og rett feil.', v: { n: subs.length } } : { p: 'Fant ingen tale i klippene.' } } }))
    } catch (e) {
      this.set((s) => ({ ai: { ...s.ai, busy: false, err: true, msg: { p: 'Klarte ikke å lage undertekster. {err}', v: { err: e instanceof Error ? this.d.t(e.message) : '' } } } }))
    }
  }

  openExport(): void {
    this.stop()
    this.set((s) => ({ exp: { q: s.exp?.q ?? '1080-30', busy: false, pct: 0, phase: null, msg: null, err: false } }))
  }

  closeExport(): void {
    this.set({ exp: null })
  }

  pickQuality(q: ExpState['q']): void {
    this.set((s) => (s.exp && !s.exp.busy ? { exp: { ...s.exp, q, msg: null } } : null))
  }

  abortExport(): void {
    this.abort = true
  }

  async doExport(): Promise<void> {
    const e = this.s.exp
    const p = this.s.proj
    if (!e || e.busy || !p) return
    const [q, f] = e.q.split('-') as ['1080' | '4k', string]
    const sz = exportSize(p, q)
    this.abort = false
    this.stop()
    this.exporting = true
    this.set({ exp: { ...e, busy: true, pct: 0, phase: { p: 'Forbereder …' }, msg: null, err: false } })
    try {
      await Promise.all(Object.values(this.M.vids).map((v) => (v.readyState >= 1 ? 0 : new Promise((r) => {
        v.addEventListener('loadedmetadata', r, { once: true })
        setTimeout(r, 8000)
      }))))
      this.pauseAll()
      await Promise.all(Object.values(this.M.imgs).map((im) => (!(im instanceof HTMLImageElement) || im.complete ? 0 : new Promise((r) => {
        im.addEventListener('load', r, { once: true })
        im.addEventListener('error', r, { once: true })
        setTimeout(r, 5000)
      }))))
      const t0 = performance.now()
      const res = await exportMp4(p, {
        w: sz.w, h: sz.h, fps: Number(f), M: this.M, getBlob: this.getBlob, aborted: () => this.abort,
        onProgress: (pct, phase, vars) => this.alive && this.set((s) => (s.exp ? { exp: { ...s.exp, pct, phase: vars ? { p: phase, v: vars } : { p: phase } } } : null)),
      })
      const name = `${fileBase(p)}-${q === '4k' ? '4k' : '1080p'}${f}.${res.ext ?? 'mp4'}`
      this.lastExpBlob = { blob: res.blob, name }
      this.d.download(res.blob, name)
      const v = { eta: fmtEta((performance.now() - t0) / 1000), mb: (res.blob.size / 1048576).toFixed(1) }
      const msg: Msg = res.audio === 'opus' ? { p: 'Ferdig på {eta} · {mb} MB · Opus-lyd (bruk VLC hvis lyden mangler)', v } : res.audio ? { p: 'Ferdig på {eta} · {mb} MB', v } : { p: 'Ferdig på {eta} · {mb} MB · uten lyd', v }
      this.set((s) => (s.exp ? { exp: { ...s.exp, busy: false, pct: 100, phase: null, msg, err: false }, lastExp: true } : { lastExp: true }))
    } catch (err) {
      const ab = err instanceof Error && err.message === 'abort'
      const m = err instanceof Error ? this.d.t(err.message) : String(err)
      this.set((s) => (s.exp ? { exp: { ...s.exp, busy: false, pct: 0, phase: null, msg: ab ? { p: 'Eksporten ble avbrutt.' } : { p: 'Noe gikk galt: {err}', v: { err: m } }, err: !ab } } : null))
    } finally {
      this.exporting = false
    }
  }

  get isBusy(): boolean {
    return this.exporting || !!this.s.exp?.busy || this.s.ai.busy
  }

  /** Stillbilde av spillehodet til Dine medier. */
  async sendFrame(to?: ToolId): Promise<void> {
    const p = this.s.proj
    if (!p) return
    const z = exportSize(p, '1080')
    const c = document.createElement('canvas')
    c.width = z.w
    c.height = z.h
    try {
      const g = c.getContext('2d')
      if (g) drawFrame(g, z.w, z.h, p, this.M, this.t, null)
    } catch {
      // tomt bilde
    }
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
    if (!b) return
    await this.d.toMedia(b, `${fileBase(p)}-stillbilde.png`).then((id) => this.sent(id, to, 'Stillbildet er lagret i Dine medier.'), () => this.flash('Kunne ikke lagre i Dine medier.'))
  }

  /** Den siste eksporterte videoen til Dine medier (blir i nettleseren; lastes aldri opp). */
  async sendVideo(to?: ToolId): Promise<void> {
    const v = this.lastExpBlob
    if (!v) return
    await this.d.toMedia(v.blob, v.name).then((id) => this.sent(id, to, 'Videoen er lagret i Dine medier.'), () => this.flash('Kunne ikke lagre i Dine medier.'))
  }

  /** Lagret i Dine medier: åpne mottakeren («Bruk i …») eller si fra. */
  private sent(id: string, to: ToolId | undefined, saved: Phrase): void {
    if (to && this.d.openIn) this.d.openIn(to, id)
    else this.flash(saved)
  }

  /* ---------- seksjoner i egenskapspanelet ---------- */

  toggleSection(label: string): void {
    const n = { ...this.s.secOpen, [label]: !this.s.secOpen[label] }
    this.d.storage.set('motiondesign.sections', JSON.stringify(n))
    this.set({ secOpen: n })
  }

  /** Område for et element i forhåndsvisningen (for tester og tilgjengelighet). */
  rectOf(key: string): Rect | undefined {
    return this.rects[key]
  }
}

/* ---------- hjelpere ---------- */

/** Liten miniatyr (data-URL). Med `alpha` beholdes gjennomsiktighet når den er liten nok. */
export function thumbOf(src: CanvasImageSource, w: number, h: number, alpha: boolean): string {
  try {
    if (!w || !h) return ''
    const s = 220 / Math.max(w, h)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * s))
    c.height = Math.max(1, Math.round(h * s))
    const g = c.getContext('2d')
    if (!g) return ''
    g.drawImage(src, 0, 0, c.width, c.height)
    if (alpha) {
      let u = c.toDataURL('image/webp', 0.8)
      if (!/^data:image\/webp/.test(u)) u = c.toDataURL('image/png')
      if (u.length < 110000) return u
      g.globalCompositeOperation = 'destination-over'
      g.fillStyle = '#2a2a2a'
      g.fillRect(0, 0, c.width, c.height)
    }
    return c.toDataURL('image/jpeg', 0.72)
  } catch {
    return ''
  }
}

/** Varighet, størrelse og miniatyr for en ny fil. null = filen kan ikke leses. */
export function probe(k: Media['kind'], url: string): Promise<Pick<Media, 'w' | 'h' | 'dur' | 'thumb'> | null> {
  return new Promise((res) => {
    let done = false
    const fin = (v: Pick<Media, 'w' | 'h' | 'dur' | 'thumb'> | null) => {
      if (!done) {
        done = true
        res(v)
      }
    }
    setTimeout(() => fin(null), 20000)
    if (k === 'image') {
      const im = new Image()
      im.onload = () => fin({ w: im.naturalWidth, h: im.naturalHeight, dur: 0, thumb: thumbOf(im, im.naturalWidth, im.naturalHeight, true) })
      im.onerror = () => fin(null)
      im.src = url
    } else if (k === 'audio') {
      const a = new Audio()
      a.preload = 'metadata'
      a.onloadedmetadata = () => fin(Number.isFinite(a.duration) && a.duration > 0 ? { dur: a.duration, w: 0, h: 0, thumb: '' } : null)
      a.onerror = () => fin(null)
      a.src = url
    } else {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.playsInline = true
      const shot = (d: number) => {
        v.onseeked = () => {
          fin({ dur: d, w: v.videoWidth, h: v.videoHeight, thumb: thumbOf(v, v.videoWidth, v.videoHeight, false) })
          v.removeAttribute('src')
          v.load()
        }
        v.currentTime = Math.min(1, d / 3)
      }
      v.onloadedmetadata = () => {
        const d = v.duration
        if (Number.isFinite(d) && d > 0) {
          shot(d)
          return
        }
        // Opptak fra nettleseren (MediaRecorder) oppgir ikke varigheten før filen er spolt gjennom.
        if (d !== Infinity) {
          fin(null)
          return
        }
        v.ondurationchange = () => {
          if (!Number.isFinite(v.duration) || !v.duration) return
          v.ondurationchange = null
          shot(v.duration)
        }
        v.currentTime = 1e101
      }
      v.onerror = () => fin(null)
      v.src = url
    }
  })
}

export { FONTS }
