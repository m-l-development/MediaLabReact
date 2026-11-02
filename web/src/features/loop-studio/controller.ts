/**
 * Editoren i Loop Studio, portert fra media-lab/src/pages/studio-editor/logic.js (samme funksjoner, samme oppførsel).
 * Kontrolleren holder tilstanden (`state`, oppdateres synkront som i dagens app) og gir visningen alle verdier og
 * handlinger via `view()`. Globale skript (UkeLoop, MLShare, MLCloud, CH) er byttet ut med tjenester i `deps`.
 */
import type { Me } from '../../domain/account'
import { wheelAction } from '../../shared/lib/workspace-nav'
import type { SharedSetup } from '../../services/shared-setup'
import { ServiceError } from '../../services/errors'
import { forSharedDisk, type LoopDiskData, type LoopDiskService } from '../../services/loop-disk'
import { entryOf, type BaseEntry, type CentralBases, type KV, type PersonalBases } from './bases'
import { __ukeloopAudioCtl, __ukeloopRendererFactory } from './engine/player.js'
import type { AudioCtl, AudioSyncOpts } from './engine/player'
import { buildPlayerHTML } from './engine/player-html'
import { detectBeat, embeddedFontCSS, FONT_CSS, keyOf, parse, serialize, toDataURL } from './engine/program.js'
import type { BeatInfo } from './engine/program'
import type { BgFill, Box, Cfg, FText, FQr, ImgRule, Loc, LoopData, LoopMedia, Pip, Slide, SlideOv, VigLayer } from './engine/types'
import {
  adjustHex, BASE_CFG, cleanFill, cleanFqr, cleanFtexts, cleanLegacyCfg, cleanOv, cleanPanels, cleanPips, cleanTcol, cleanToff, cleanTsc, cleanVigs, cssUrl, daySlides, DEF_PANELS, mergeDaySlides, moveSlideTo,
  FILLM, fillStops, fmtLen, GENRES, harmonyColors, hexToHsv, hsvToHex, isHex, isLegacySample, isSlide, isStored, isTpl, normHex, OVT, ovOwn, PRESETS, randPanels, safeSrc, sampleData,
  slotOf, TPL_NAMES, TPL_TITLES, VCMAP, VIG_TYPE_OPTS, VIGT, VSMAP, type LoopData as SavedData, type Tpl, type VigKey,
} from './model'

/** Dra-og-slipp fra visningen (React- eller DOM-hendelse). */
type TouchDownEv = { pointerType: string; clientX: number; clientY: number; currentTarget: EventTarget | null }
type DragEv = { dataTransfer: DataTransfer | null; clientX: number; currentTarget: EventTarget | null; preventDefault(): void }
import type { DiskEntry, LoopMediaStore, LoopRepo, WorkData } from './store'
import { loadMuxer, loadQr, loadTesseract, type QrFactory } from './engine/vendor'

const R = __ukeloopRendererFactory()

/* ---------- typer ---------- */
export type InputEv = { target: { value: string } }
export type CheckEv = { target: { checked: boolean } }
export type FileEv = { target: { files: ArrayLike<File> | null; value: string } }
export type KeyEv = { key: string; shiftKey?: boolean; preventDefault(): void; stopPropagation(): void; target: EventTarget | null }
export interface PEv {
  clientX: number
  clientY: number
  button?: number
  pointerType?: string
  pointerId?: number
  shiftKey?: boolean
  altKey?: boolean
  currentTarget: EventTarget | null
  target?: EventTarget | null
  preventDefault(): void
  stopPropagation(): void
}
/** Et vignettlag med alle verdier satt. */
type VigL = { type: string; x: number; y: number; rot: number; open: number; color: string; amt: number; alpha: number; size: number; soft: number }
type Snap = { slides: Slide[]; cfg: Cfg; programText: string }
type Ref<T> = { current: T | null }
const mkRef = <T>(): Ref<T> => ({ current: null })

export interface SelEl { kind: string; id: string | null; i?: number; field?: string }
export interface HexPop { x: number; y: number; val: string; base: string; tone: number; warm: number; draft: string; hh: number; ss: number; vv: number; hidden?: boolean }
export interface CropState { url: string; w: number; h: number; aspect: string; box: { x: number; y: number; w: number; h: number }; title: string; edit: boolean }
export interface InlineEd { id: string; field: string; i?: number; value: string; orig: string; multi: boolean; left: number; top: number; width: number; height: number; fs: number }
export interface LibTrack { id: string; name: string; size: number; dur: number; at: number }

export interface State {
  ready: boolean
  tab: string
  tpl: Tpl
  programText: string
  slides: Slide[]
  cfg: Cfg
  videoName: string
  audioName: string
  selected: string | null
  /** Dra-og-slipp i slidestripen: innsettingsplassen i hele lista (0 = før første), ellers null. */
  dropAt?: number | null
  playing: boolean
  playIdx: number
  urls: Record<string, string>
  parseMsg: string
  parseOk: boolean
  rec: { pct: number } | null
  busy: string
  beatInfo: (BeatInfo | { bpm: number; first: number; guess: true }) | null
  mobile: boolean
  mPane: string
  guideMode: string
  guideFlip: number
  selEl: SelEl | null
  hexPop: HexPop | null
  eyedrop: boolean
  vigEd: { layer: number; scope: string } | null
  ovEd: { scope: string } | null
  crop: CropState | null
  panOpen: boolean
  sharedReady: boolean
  sharedExists: boolean
  sharedErr: boolean
  sharedState: string
  audioLib: LibTrack[]
  audioDur: number
  hist: string
  scrubT: number | null
  tst: string | null
  soundOn: boolean
  fs: boolean
  zoom: { z: number; x: number; y: number } | null
  inlineEd: InlineEd | null
  numEd: { k: string; t: string } | null
  /** Høyreklikkmenyen på et slidekort (LoopStudio viser den med den felles menyen). */
  slideMenu: { x: number; y: number; id: string } | null
  /** Høyreklikkmenyen i forhåndsvisningen (punktet ble klikket der). */
  pvMenu: { x: number; y: number } | null
  playFlash: string | null
  saveOpen: boolean
  saveMsg: string
  saveName: string | null
  /** Hvor lagringsdialogen lagrer: p = Min disk (nettleseren), f = Menighetens disk */
  saveTarget: 'p' | 'f'
  autoAt: string
  addMenu: boolean
  addForm: Record<string, string> | null
  rulesOpen: boolean
  rulesDraft: ImgRule[] | null
  galleryFor: string | null
  stdOpen: boolean
  stdDraft: string | null
  rulePickOpen: boolean
  fillOpen: boolean
  panelEditFor: string | null
  slideStyleOpen: boolean
  fast: { pct: number; phase: string } | null
  fastMsg: string
}
type Upd = Partial<State> | null | ((s: State) => Partial<State> | null)

/** Det kontrolleren trenger fra appen. */
export interface LoopDeps {
  /** Oversetter en norsk tekst (samme tekster som dagens app). */
  t: (s: string) => string
  lang: () => 'no' | 'en'
  query: Readonly<Record<string, string>>
  /** Oppdaterer adressen (mal, disk …) uten å laste siden på nytt. */
  setQuery(q: Record<string, string>): void
  /** Tilbake til Loop Studio-startsiden. */
  goHome(): void
  /** Åpner editoren med en ny adresse (f.eks. «Avslutt demo»). */
  open(q: Record<string, string>): void
  repo: LoopRepo
  media: LoopMediaStore
  kv: KV
  me: Me | null
  bases: { personal: PersonalBases; central: CentralBases | null }
  /** Menighetens delte disk (TB-BB67CB): alle medlemmer leser og lagrer, bare Admin sletter. null uten menighet. */
  sharedDisk: { svc: LoopDiskService; churchId: () => string | null; isAdmin: () => boolean } | null
  /** Menighetens grunnoppsett for en mal (null uten innlogging/menighet). */
  /** Statusteksten er allerede oversatt. */
  shared(scope: string, opts: { onRemote: (d: Cfg) => void; onStatus: (s: { state: string; text: string }) => void }): SharedSetup<Cfg & Record<string, unknown>> | null
  /** Menighetens filer i ConnectHub («ch:<id>»). */
  cloud: {
    url(ref: string): Promise<string | null>
    blob(ref: string): Promise<Blob | null>
    pick(o: { start: string; title: string }): Promise<{ ref: string; blob: Blob } | null>
    upload(file: File, folder: string): Promise<string>
  } | null
  /** Bilde fra «Dine medier». */
  pickLibrary(): Promise<File | null>
  toast(msg: string): void
  alert(msg: string): void
  confirm(msg: string): boolean
  download(blob: Blob, name: string): void
}

/** Bare én lydmotor per side (gamle kontekster lukkes når editoren åpnes på nytt). */
let soundOwner: { ac: AudioContext; actl: AudioCtl; video: HTMLVideoElement; owner: unknown } | null = null
const contexts: AudioContext[] = []

const hidden = (el: HTMLElement) => {
  el.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none'
}
const asRec = (o: object) => o as Record<string, unknown>
const num = (v: unknown, d: number) => (v == null ? d : Number(v))

export class LoopController {
  deps: LoopDeps
  t: (s: string) => string
  state: State
  private rerender: ((cb?: () => void) => void) | null = null
  alive = false

  /* referanser til elementer i visningen */
  fileLib = mkRef<HTMLInputElement>(); timeRef = mkRef<HTMLSpanElement>(); stripRef = mkRef<HTMLDivElement>(); trackRef = mkRef<HTMLDivElement>(); fillRef = mkRef<HTMLDivElement>(); headRef = mkRef<HTMLDivElement>()
  canvasRef = mkRef<HTMLCanvasElement>(); fileVideo = mkRef<HTMLInputElement>(); fileSlideVid = mkRef<HTMLInputElement>(); fileImg = mkRef<HTMLInputElement>(); fileText = mkRef<HTMLInputElement>()
  fileOcr = mkRef<HTMLInputElement>(); fileLogo = mkRef<HTMLInputElement>(); fileRule = mkRef<HTMLInputElement>(); fileAudio = mkRef<HTMLInputElement>(); filePip = mkRef<HTMLInputElement>()
  vigEdWrap = mkRef<HTMLDivElement>(); vigEdCanvas = mkRef<HTMLCanvasElement>(); ovEdCanvas = mkRef<HTMLCanvasElement>(); cropWrapRef = mkRef<HTMLDivElement>(); panWrapRef = mkRef<HTMLDivElement>()
  inlineRef = mkRef<HTMLTextAreaElement>(); fsRef = mkRef<HTMLDivElement>(); guideRef = mkRef<HTMLDivElement>(); selBoxRef = mkRef<HTMLDivElement>(); zoomOuter = mkRef<HTMLDivElement>()

  media: LoopMedia & { vids: Record<string, HTMLVideoElement> } = { images: {}, video: null, vids: {} }
  vidGain: Record<string, GainNode> = {}
  t0 = performance.now()
  qrCache: Record<string, { rows: string[]; img: string }> = {}
  loading: Record<string, number> = {}
  past: { slides: Slide[]; cfg: Cfg; programText: string }[] = []
  future: { slides: Slide[]; cfg: Cfg; programText: string }[] = []

  /* lyd */
  actx: AudioContext | null = null
  actl: AudioCtl | null = null
  gSpeaker: GainNode | null = null
  aDest: MediaStreamAudioDestinationNode | null = null
  private mix: GainNode | null = null
  audioBuf: AudioBuffer | null = null
  /** Lydsporet og bakgrunnsvideoen i arbeidskopien (`aud-<id>`, `vid-<id>`). */
  audioRef: string | null = null
  videoRef: string | null = null

  /* prosjektet */
  customId: string | null = null
  customName = ''
  diskId: string | null = null
  diskData: DiskEntry['data'] | null = null
  /** Loop fra menighetens disk: id og versjonen som er åpnet (lagring mot eldre versjon avvises). */
  sharedEntry: { id: string; version: number; name: string } | null = null
  sharedData: LoopDiskData | null = null
  private sharedCache = new Map<string, string | null>()
  private sharedSaving = false
  fromBase: { kind: string; id: string; name: string; data: BaseEntry['data'] } | null = null
  demo = false
  baseCfg: Cfg = BASE_CFG
  tplCfg: Cfg = {}
  shared: SharedSetup<Cfg & Record<string, unknown>> | null = null
  private archived: { slot: string } | null = null
  /** Merknader som vises som bånd øverst (demo, grunnoppsett, gammelt eksempel). */
  banner: 'demo' | 'base' | 'legacy' | null = null
  baseDialog: { open: boolean; name: string; level: 'p' | 'f'; msg: string; busy: boolean; openHref: string | null } = { open: false, name: '', level: 'p', msg: '', busy: false, openHref: null }

  /* interne */
  private raf = 0
  /** Øker ved hver montering; en oppstart som er utdatert (StrictMode, rask navigering), avbrytes. */
  private gen = 0
  private pk: { base: LoopData; key: string; loc: Loc | null } | null = null
  private rk: unknown = null
  private rc: unknown = null
  private ra = ''
  private r: { all: (Slide & { dur: number })[]; active: (Slide & { dur: number })[] } = { all: [], active: [] }
  private p: LoopData | null = null
  private snap: { slides: Slide[]; cfg: Cfg; programText: string } | null = null
  private last: { slides: Slide[]; cfg: Cfg; programText: string; videoName: string; audioName: string } | null = null
  private restoring = false
  private lastChange = 0
  private initAt = 0
  private sv: ReturnType<typeof setTimeout> | undefined
  private listeners: (() => void)[] = []
  private exporting = false
  private fastAbort = false
  private recObj: MediaRecorder | null = null
  private recCancel = false
  private recTotal = 0
  private offscreen = false
  private lastLoop = 0
  private alag = 0
  private duck = 1
  private volLive: number | null = null
  private volT: ReturnType<typeof setTimeout> | undefined
  private fontTick = 0
  private lastVg: string | null = null
  private cboxCache: { w: number; h: number; dx: number; dy: number; pw: number; ph: number } | null = null
  private layout: { cards: HTMLElement[]; all: Slide[] } | null = null
  private scrub: { was: boolean } | null = null
  private stripTouch = 0
  private autoScrolling = false
  private tst0 = 0
  private fresh = false
  private autoPending = false
  private sharedAt = 0
  private shT: ReturnType<typeof setTimeout> | undefined
  private refMap: Record<string, string> = {}
  private hexTarget: HTMLInputElement | null = null
  private eyedropOn = false
  private vp: Record<string, unknown> | null = null
  private vpRaf = 0
  private cropRes: ((f: File | null) => void) | null = null
  private cropFile: File | null = null
  private cropImg: HTMLImageElement | null = null
  private nextCropEdit = false
  private cd: { mode: string; r: DOMRect; sx: number; sy: number; b0: CropState['box'] } | null = null
  private ruleTarget: string | null = null
  private rulesBak: { rules: ImgRule[]; bgs: Record<string, { bg: string | null | undefined; bgPort: string | null | undefined; ruleId: string | null | undefined }> } | null = null
  private kwT: ReturnType<typeof setTimeout> | undefined
  private pipTarget: { id: string | null; i: number | null } | null = null
  private drag: { key: string; dx: number; dy: number; w: number; h: number; id?: string | undefined; self?: SelEl } | null = null
  private clickT: ReturnType<typeof setTimeout> | undefined
  private lastTap: { t: number; x: number; y: number } | null = null
  private inlineCancel = false
  private inlineAt = 0
  private pan: { id: string; sx: number; sy: number; modal: boolean; rw: number; rh: number; fw: number; fh: number; moved: boolean; p0x: number; p0y: number } | null = null
  private panRaf: number | null = null
  private panOrig: { id: string; panX: number | null | undefined; panY: number | null | undefined } | null = null
  private fdRaf: number | null = null
  private flashT: ReturnType<typeof setTimeout> | undefined
  private smT: ReturnType<typeof setTimeout> | undefined
  private up: Record<string, string> | null = null
  private bc: BroadcastChannel | null = null
  private tabId = Math.random().toString(36).slice(2)
  private io: IntersectionObserver | null = null
  private ro: ResizeObserver | null = null
  private mq: MediaQueryList | null = null
  private wheelOn = false
  private roOn = false
  private tp: Promise<void> | null = null
  private qrLib: Promise<QrFactory | null> | null = null
  private qr: QrFactory | null = null

  constructor(deps: LoopDeps) {
    this.deps = deps
    this.t = deps.t
    this.state = {
      ready: false, tab: 'program', tpl: 'week', programText: '', slides: [], cfg: { ...BASE_CFG }, videoName: '', audioName: '', selected: null, playing: true, playIdx: 0, urls: {},
      parseMsg: '', parseOk: true, rec: null, busy: '', beatInfo: null, mobile: false, mPane: 'preview', guideMode: 'none', guideFlip: 0, selEl: null, hexPop: null, eyedrop: false,
      vigEd: null, ovEd: null, crop: null, panOpen: false, sharedReady: false, sharedExists: false, sharedErr: false, sharedState: '', audioLib: [], audioDur: 0, hist: '', scrubT: null,
      tst: null, soundOn: true, fs: false, zoom: null, inlineEd: null, numEd: null, slideMenu: null, pvMenu: null, playFlash: null, saveOpen: false, saveMsg: '', saveName: null, saveTarget: 'p', autoAt: '', addMenu: false, addForm: null,
      rulesOpen: false, rulesDraft: null, galleryFor: null, stdOpen: false, stdDraft: null, rulePickOpen: false, fillOpen: false, panelEditFor: null, slideStyleOpen: false, fast: null, fastMsg: '',
    }
  }

  /* ---------- tilstand (synkron, som DCLogic i dagens app) ---------- */
  attach(rerender: (cb?: () => void) => void) {
    this.rerender = rerender
  }
  setState(update: Upd, cb?: () => void) {
    const patch = typeof update === 'function' ? update(this.state) : update
    if (patch) this.state = { ...this.state, ...patch }
    if (this.rerender) this.rerender(cb)
    else cb?.()
  }
  forceUpdate() {
    this.rerender?.()
  }
  /** Kalles etter hver oppdatering av visningen (componentDidUpdate i dagens app). */
  didUpdate() {
    // syncState kjøres i tegnesløyfen; her er det ingenting ekstra.
  }

  private on<K extends keyof WindowEventMap>(t: Window, type: K, fn: (e: WindowEventMap[K]) => void, opt?: boolean | AddEventListenerOptions): void
  private on<K extends keyof DocumentEventMap>(t: Document, type: K, fn: (e: DocumentEventMap[K]) => void, opt?: boolean | AddEventListenerOptions): void
  private on(t: Window | Document, type: string, fn: (e: Event) => void, opt?: boolean | AddEventListenerOptions) {
    t.addEventListener(type, fn, opt)
    this.listeners.push(() => t.removeEventListener(type, fn, opt))
  }

  mount() {
    this.alive = true
    this.gen++
    this.setupNumEdit()
    try {
      const gm = this.deps.kv.get('ukeloop.guide'), gf = Number(this.deps.kv.get('ukeloop.guideFlip') || 0)
      if (gm && ['none', 'golden', 'fib', 'thirds'].includes(gm)) this.setState({ guideMode: gm, guideFlip: gf % 4 })
    } catch {
      // ingen lagret hjelpelinje
    }
    this.on(document, 'keydown', (ev) => {
      const tg = ev.target as HTMLElement | null
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return
      const el = this.state.selEl
      if (!el) return
      if (ev.key === 'Escape') this.setState({ selEl: null })
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'pip' && el.id != null) { ev.preventDefault(); this.removePip(el.id, el.i ?? 0) }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'ftext' && el.id != null) { ev.preventDefault(); this.removeFtext(el.id, el.i ?? 0) }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'fqr' && el.id != null) { ev.preventDefault(); this.removeFqr(el.id) }
    })
    this.on(window, 'keydown', (ev) => {
      if (this.state.ovEd && !this.state.hexPop) {
        if (ev.key === 'Escape' || ev.key === 'Enter') {
          const t = ev.target as HTMLInputElement | null
          if (t && t.tagName === 'INPUT' && t.type !== 'range') return
          ev.preventDefault(); ev.stopPropagation(); this.setState({ ovEd: null })
        }
        return
      }
      if (this.state.vigEd && !this.state.crop && !this.state.hexPop) {
        if (ev.key === 'Escape' || ev.key === 'Enter') {
          const t = ev.target as HTMLInputElement | null
          if (t && t.tagName === 'INPUT' && t.type !== 'range') return
          ev.preventDefault(); ev.stopPropagation(); this.setState({ vigEd: null })
        }
        return
      }
      if (this.state.panOpen && !this.state.crop) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.closePan('cancel') }
        else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); this.closePan('done') }
        return
      }
      if (!this.state.crop) return
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.finishCrop('cancel') }
      else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); this.finishCrop('crop') }
    }, true)
    /* fargevelgeren: et klikk på et fargefelt åpner egen velger (hex, toning, varme, pipette) i stedet for nettleserens */
    this.on(document, 'click', (ev) => {
      const t = ev.target as (HTMLInputElement & { nativeOk?: boolean }) | null
      if (!(t && t.tagName === 'INPUT' && t.type === 'color')) return
      if (t.nativeOk) { t.nativeOk = false; return }
      ev.preventDefault(); ev.stopPropagation()
      const r = t.getBoundingClientRect(), W = 260, H = 440, vw = window.innerWidth, vh = window.innerHeight
      const x = Math.max(8, Math.min(vw - W - 8, r.left)), y = r.bottom + H + 12 > vh ? Math.max(8, r.top - H - 8) : r.bottom + 8
      this.hexTarget = t
      const v0 = (t.value || '#000000').toLowerCase()
      this.setState({ hexPop: { x, y, val: v0, base: v0, tone: 0, warm: 0, draft: v0.toUpperCase(), ...hexToHsv(v0) } })
    }, true)
    this.on(document, 'pointerdown', (ev) => {
      if (!this.state.hexPop || this.eyedropOn) return
      const p = document.getElementById('hex-pop')
      if (p && p.contains(ev.target as Node)) return
      if (ev.target === this.hexTarget) return
      this.setState({ hexPop: null })
    }, true)
    this.on(window, 'keydown', (ev) => {
      if (ev.key === 'Escape' && this.state.fs) { ev.preventDefault(); ev.stopPropagation(); this.exitFs() }
    }, true)
    const fsChange = () => {
      if (!document.fullscreenElement && this.state.fs) this.exitFs()
    }
    this.on(document, 'fullscreenchange', fsChange)
    /* tegnesløyfen styrer lyden; stopper bildene (skjult fane, dvale), stopper også lyden */
    const watch = setInterval(() => {
      if (this.alive && document.hidden && performance.now() - this.lastLoop > 2000) this.hardStopAudio()
    }, 1000)
    this.listeners.push(() => clearInterval(watch))
    /* bare én fane eller ett vindu kan spille lydsporet om gangen */
    try {
      this.bc = new BroadcastChannel('ukeloop-audio')
      this.bc.onmessage = (ev: MessageEvent<{ type?: string; id?: string }>) => {
        const d = ev.data || {}
        if (d.type === 'play' && d.id !== this.tabId && this.state.playing && !this.state.rec) { this.hardStopAudio(); this.setState({ playing: false }) }
      }
      setTimeout(() => this.announcePlay(), 300)
    } catch {
      // BroadcastChannel finnes ikke
    }
    this.on(document, 'visibilitychange', () => {
      if (document.hidden) this.hardStopAudio()
    })
    const leave = () => {
      this.hardStopAudio()
      void this.actx?.suspend().catch(() => undefined)
    }
    this.on(window, 'pagehide', leave)
    this.on(window, 'beforeunload', leave)
    /* ikke synlig (skjult fane eller ramme): lyden stopper, og fortsetter når siden synes igjen */
    const watchVis = () => {
      const el = this.canvasRef.current?.closest('main')
      if (!el) { if (this.alive) setTimeout(watchVis, 300); return }
      this.io = new IntersectionObserver((ents) => {
        const vis = ents.some((x) => x.isIntersecting)
        this.offscreen = !vis && !this.state.rec
        if (this.offscreen) this.hardStopAudio()
        else if (this.actx?.state === 'suspended' && this.state.playing) void this.actx.resume().catch(() => undefined)
      })
      this.io.observe(el)
    }
    try { watchVis() } catch { /* IntersectionObserver finnes ikke */ }
    this.mq = window.matchMedia('(max-width: 820px)')
    const onMq = () => this.setState({ mobile: !!this.mq?.matches })
    onMq()
    this.mq.addEventListener('change', onMq)
    this.listeners.push(() => this.mq?.removeEventListener('change', onMq))
    this.on(window, 'keydown', this.onKey)
    this.on(window, 'resize', () => { this.cboxCache = null })
    // feiler innlastingen, vises redigeringen likevel (som før) i stedet for å bli stående på «Laster …»
    void this.init().catch(() => { if (this.alive && !this.state.ready) this.setState({ ready: true }) })
  }

  unmount() {
    this.gen++
    this.listeners.forEach((f) => f())
    this.listeners = []
    try { this.ro?.disconnect() } catch { /* ingenting */ }
    this.onCropUp()
    if (this.state.fs) document.body.style.overflow = ''
    try { this.bc?.close() } catch { /* ingenting */ }
    try { this.io?.disconnect() } catch { /* ingenting */ }
    this.hardStopAudio()
    Object.keys(this.media.vids).forEach((k) => this.dropVid(k))
    if (soundOwner && soundOwner.owner === this) {
      try { soundOwner.actl.stop() } catch { /* ingenting */ }
      void soundOwner.ac.close().catch(() => undefined)
      soundOwner.video.remove()
      soundOwner = null
    }
    this.alive = false
    cancelAnimationFrame(this.raf)
    if (this.recObj) this.stopRec(true)
    this.saveNow()
    this.shared?.stop()
  }

  /* ---------- filer og farger ---------- */
  okFile(f: File, kind: 'image' | 'video' | 'audio'): boolean {
    const max = { image: 1024, video: 1024, audio: 500 }[kind]
    const ext = { image: /\.(png|jpe?g|webp|gif|avif|heic|heif|tiff?|bmp)$/i, video: /\.(mp4|mov|m4v|webm)$/i, audio: /\.(mp3|m4a|wav|aac|ogg|flac)$/i }[kind]
    const name = { image: 'et bilde', video: 'en video', audio: 'en lydfil' }[kind]
    if (!String(f.type || '').startsWith(kind + '/') && !ext.test(f.name || '')) { this.deps.alert(this.t('Filen ser ikke ut til å være ' + name + '.')); return false }
    if (f.size > max * 1048576) { this.deps.alert(this.t('Filen er for stor (maks ' + (max >= 1024 ? max / 1024 + ' GB' : max + ' MB') + ').')); return false }
    return true
  }
  applyHex(v: string) {
    const t = this.hexTarget
    if (!t || !isHex(v)) return
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    set?.call(t, v.toLowerCase())
    t.dispatchEvent(new Event('input', { bubbles: true }))
    t.dispatchEvent(new Event('change', { bubbles: true }))
  }
  setPick(p: Partial<Pick<HexPop, 'hh' | 'ss' | 'vv'>>) {
    const P = this.state.hexPop
    if (!P) return
    const q = { hh: P.hh || 0, ss: P.ss || 0, vv: P.vv == null ? 1 : P.vv, ...p }, c = hsvToHex(q.hh, q.ss, q.vv)
    this.applyHex(c)
    this.setState({ hexPop: { ...P, ...q, val: c, base: c, tone: 0, warm: 0, draft: c.toUpperCase() } })
  }
  dragPick(e: PEv, kind: 'sv' | 'hue') {
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect()
    e.preventDefault(); e.stopPropagation()
    const put = (ev: { clientX: number; clientY: number }) => {
      const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))
      if (kind === 'sv') this.setPick({ ss: x, vv: 1 - y })
      else this.setPick({ hh: Math.min(359.9, x * 360) })
    }
    put(e)
    const mv = (ev: PointerEvent) => { ev.preventDefault(); put(ev) }
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  }
  startEyedrop = async () => {
    const P = this.state.hexPop
    if (!P) return
    const ED = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper
    if (ED) {
      try {
        const r = await new ED().open(), n = normHex(r?.sRGBHex)
        if (n) { this.applyHex(n); this.setState((st) => (st.hexPop ? { hexPop: { ...st.hexPop, val: n, base: n, tone: 0, warm: 0, draft: n.toUpperCase(), ...hexToHsv(n) } } : null)) }
      } catch {
        // avbrutt
      }
      return
    }
    /* nettlesere uten systemets pipette (f.eks. Safari): velg fra forhåndsvisningen */
    this.eyedropOn = true
    this.setState({ eyedrop: true, hexPop: { ...P, hidden: true } })
  }
  finishEyedrop(e: PEv) {
    const c = this.canvasRef.current
    this.eyedropOn = false
    const P = this.state.hexPop
    if (!c || !P) { this.setState({ eyedrop: false }); return }
    const p = this.canvasPoint(e), k = c.width / p.W
    let n: string | null = null
    try {
      const d = c.getContext('2d')?.getImageData(Math.max(0, Math.min(c.width - 1, Math.round(p.x * k))), Math.max(0, Math.min(c.height - 1, Math.round(p.y * k))), 1, 1).data
      if (d) n = '#' + [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0].map((v) => v.toString(16).padStart(2, '0')).join('')
    } catch {
      // lerretet kan ikke leses
    }
    if (n) this.applyHex(n)
    this.setState({ eyedrop: false, hexPop: { ...P, hidden: false, ...(n ? { val: n, base: n, tone: 0, warm: 0, draft: n.toUpperCase(), ...hexToHsv(n) } : {}) } })
  }

  /* ---------- vignett og overlegg ---------- */
  vigBase() {
    const c = this.state.cfg, d = <T>(k: keyof Cfg, v: T): T => (c[k] != null ? (c[k] as T) : v)
    return { type: VIGT.includes(String(c.vigType)) ? String(c.vigType) : 'auto', x: d('vigX', 0.66), y: d('vigY', 0.4), rot: Number(d('vigRot', 0)) || 0, open: d('vigOpen', 0.5), color: c.vigColor || '#080808', amt: d('vigAmt', 1), alpha: d('vigAlpha', 1), size: d('vigSize', 1), soft: d('vigSoft', 0.5) }
  }
  vigLayerOf(sel: Slide | null, i: number, scope: string): VigL | null {
    const B = this.vigBase(), all = scope === 'all', def = { type: 'round', x: 0.5, y: 0.5, rot: 0, open: 0.5, color: '#080808', amt: 1, alpha: 1, size: 1, soft: 0.5 }
    if (i === 0) {
      if (all || !sel) return B
      const o: Record<string, unknown> = { ...B }
      for (const k of Object.keys(VSMAP) as VigKey[]) { const v = asRec(sel)[VSMAP[k]]; if (v != null) o[k] = v }
      o.rot = Number(o.rot) || 0
      return o as VigL
    }
    const list = all ? (this.state.cfg.vigs ?? []) : (sel?.vigs ?? []), L = list[i - 1]
    return L ? ({ ...def, ...L } as VigL) : null
  }
  setVigLayer(patch: Partial<Record<VigKey, unknown>>) {
    this.vp = { ...(this.vp || {}), ...patch }
    if (this.vpRaf) return
    this.vpRaf = requestAnimationFrame(() => {
      this.vpRaf = 0
      const p = this.vp
      this.vp = null
      if (p) this.setVigLayerNow(p)
    })
  }
  setVigLayerNow(patch: Partial<Record<string, unknown>>) {
    const S = this.state, E = S.vigEd || { layer: 0, scope: 'slide' }, i = E.layer, id = S.selected
    const keys = Object.keys(patch).filter((k): k is VigKey => k in VSMAP)
    if (E.scope === 'all') {
      /* «Alle slides» betyr alle: de endrede feltene fjernes fra hver slide, så verdien for alle gjelder */
      if (i === 0)
        this.setState((st) => {
          const c = asRec({ ...st.cfg })
          const drop: string[] = []
          for (const k of keys) { c[VCMAP[k]] = patch[k]; drop.push(VSMAP[k]) }
          return {
            cfg: c as Cfg,
            slides: st.slides.map((x) => {
              if (!drop.some((k) => asRec(x)[k] != null)) return x
              const n = asRec({ ...x })
              drop.forEach((k) => delete n[k])
              return n as unknown as Slide
            }),
          }
        })
      else
        this.setState((st) => {
          const list = (st.cfg.vigs ?? []).slice(), cur = list[i - 1]
          if (!cur) return null
          list[i - 1] = { ...cur, ...patch }
          return { cfg: { ...st.cfg, vigs: list } }
        })
    } else if (id) {
      this.setState((st) => ({
        slides: st.slides.map((x) => {
          if (x.id !== id) return x
          if (i === 0) { const n = asRec({ ...x }); for (const k of keys) n[VSMAP[k]] = patch[k]; return n as unknown as Slide }
          const list = (x.vigs ?? []).slice(), cur = list[i - 1]
          if (!cur) return x
          list[i - 1] = { ...cur, ...patch }
          return { ...x, vigs: list }
        }),
      }))
    }
    this.pk = null
  }
  ovState(sel: Slide | null, all: boolean) {
    const c = this.state.cfg, gFx = c.overlayFx || 'none', o = sel?.ov || {}
    const fx = all ? gFx : o.overlayFx || gFx
    const pick = (sk: keyof Slide, ck: keyof Cfg, d: unknown) => (!all && sel && sel[sk] != null ? sel[sk] : c[ck] != null ? c[ck] : d)
    return { fx, on: fx !== 'none', amt: Number(pick('oAmt', 'fxAmount', 0.6)), speed: Number(pick('oSpeed', 'ovSpeed', 1)), alpha: Number(pick('oAlpha', 'ovAlpha', 1)), color: String(pick('oColor', 'ovColor', null) || c.accent || '#f5b82c') }
  }
  setOv(patch: { fx?: string; amt?: number; speed?: number; alpha?: number; color?: string }) {
    const S = this.state, E = S.ovEd || { scope: 'slide' }, id = S.selected, all = E.scope === 'all'
    const CM: Record<string, keyof Cfg> = { amt: 'fxAmount', speed: 'ovSpeed', alpha: 'ovAlpha', color: 'ovColor' }, SM: Record<string, keyof Slide> = { amt: 'oAmt', speed: 'oSpeed', alpha: 'oAlpha', color: 'oColor' }
    if (all)
      this.setState((st) => {
        const c = asRec({ ...st.cfg })
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'fx') { c.overlayFx = v; if (v !== 'none') c.ovLast = v }
          else { const ck = CM[k]; if (ck) c[ck] = v }
        }
        return { cfg: c as Cfg }
      })
    else if (id)
      this.setState((st) => ({
        slides: st.slides.map((x) => {
          if (x.id !== id) return x
          const n = asRec({ ...x })
          for (const [k, v] of Object.entries(patch)) {
            if (k === 'fx') { n.ov = { ...(x.ov || {}), overlayFx: v }; if (v !== 'none') n.ovLast = v }
            else { const sk = SM[k]; if (sk) n[sk] = v }
          }
          return n as unknown as Slide
        }),
      }))
    this.pk = null
  }
  onVigEdDown = (e: PEv) => {
    const w = this.vigEdWrap.current
    if (!w) return
    const r = w.getBoundingClientRect()
    const put = (ev: { clientX: number; clientY: number }) => {
      this.setVigLayer({ x: Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 1000) / 1000, y: Math.round(Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) * 1000) / 1000 })
    }
    e.preventDefault()
    put(e)
    const mv = (ev: PointerEvent) => { ev.preventDefault(); put(ev) }
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  }

  /* ---------- beskjæring og utsnitt ---------- */
  cropRatio(a: string, w: number, h: number) {
    return a === 'orig' ? w / h : a === '16:9' ? 16 / 9 : a === '9:16' ? 9 / 16 : a === '1:1' ? 1 : a === '4:5' ? 0.8 : a === '4:3' ? 4 / 3 : null
  }
  cropFit(a: string, W: number, H: number) {
    const r = this.cropRatio(a, W, H)
    if (!r) return { x: 0, y: 0, w: 1, h: 1 }
    let bw = 1, bh = W / (r * H)
    if (bh > 1) { bh = 1; bw = (r * H) / W }
    return { x: (1 - bw) / 2, y: (1 - bh) / 2, w: bw, h: bh }
  }
  cropImage(file: File, o: { aspect?: string; title?: string } = {}): Promise<File | null> {
    if (!file || /gif|svg/i.test(file.type || '')) return Promise.resolve(file)
    return new Promise((res) => {
      const url = URL.createObjectURL(file), im = new Image()
      im.onload = () => {
        if (!im.naturalWidth) { URL.revokeObjectURL(url); res(file); return }
        if (this.cropRes) this.cropRes(null)
        this.cropRes = res
        this.cropFile = file
        this.cropImg = im
        const a = o.aspect || 'free'
        const edit = this.nextCropEdit
        this.nextCropEdit = false
        this.setState({ crop: { url, w: im.naturalWidth, h: im.naturalHeight, aspect: a, box: this.cropFit(a, im.naturalWidth, im.naturalHeight), title: edit ? 'Rediger bilde' : o.title || 'Beskjær bildet', edit } })
        this.hardStopAudio()
      }
      /* formater nettleseren ikke kan vise (f.eks. HEIC) beskjæres ikke */
      im.onerror = () => { URL.revokeObjectURL(url); res(file) }
      im.src = url
    })
  }
  finishCrop(mode: 'cancel' | 'full' | 'crop') {
    const C = this.state.crop, res = this.cropRes
    if (!C) return
    this.cropRes = null
    this.onCropUp()
    const file = this.cropFile, im = this.cropImg
    const done = (f: File | null) => {
      this.setState({ crop: null })
      setTimeout(() => URL.revokeObjectURL(C.url), 500)
      this.cropImg = null
      this.cropFile = null
      res?.(f)
    }
    if (mode === 'cancel' || !file || !im) return done(null)
    if (mode === 'full') return done(file)
    const b = C.box, sx = Math.round(b.x * C.w), sy = Math.round(b.y * C.h), sw = Math.max(1, Math.min(C.w - sx, Math.round(b.w * C.w))), sh = Math.max(1, Math.min(C.h - sy, Math.round(b.h * C.h)))
    if (sw >= C.w - 1 && sh >= C.h - 1) return done(file)
    try {
      const c = document.createElement('canvas')
      c.width = sw
      c.height = sh
      const g = c.getContext('2d')
      if (!g) return done(file)
      g.imageSmoothingQuality = 'high'
      g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh)
      const png = /png|webp/i.test(file.type || '')
      c.toBlob((bl) => done(bl ? new File([bl], (file.name || 'bilde').replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg'), { type: bl.type }) : file), png ? 'image/png' : 'image/jpeg', 0.93)
    } catch {
      done(file)
    }
  }
  onCropDown(e: PEv, mode: string) {
    e.preventDefault(); e.stopPropagation()
    const wrap = this.cropWrapRef.current, C = this.state.crop
    if (!wrap || !C) return
    this.cd = { mode, r: wrap.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, b0: { ...C.box } }
    window.addEventListener('pointermove', this.onCropMove); window.addEventListener('pointerup', this.onCropUp); window.addEventListener('pointercancel', this.onCropUp)
  }
  onCropMove = (e: PointerEvent) => {
    const d = this.cd, C = this.state.crop
    if (!d || !C) return
    e.preventDefault()
    const dx = (e.clientX - d.sx) / d.r.width, dy = (e.clientY - d.sy) / d.r.height, b0 = d.b0, ratio = this.cropRatio(C.aspect, C.w, C.h)
    const cl = (v: number, a: number, z: number) => Math.max(a, Math.min(z, v)), MIN = 0.05
    let b
    if (d.mode === 'move') b = { ...b0, x: cl(b0.x + dx, 0, 1 - b0.w), y: cl(b0.y + dy, 0, 1 - b0.h) }
    else if (d.mode === 'e' || d.mode === 'w' || d.mode === 'n' || d.mode === 's') {
      const k = ratio ? C.w / (ratio * C.h) : null, horiz = d.mode === 'e' || d.mode === 'w'
      let x = b0.x, y = b0.y, w = b0.w, h = b0.h
      if (horiz) {
        if (d.mode === 'e') w = cl(b0.w + dx, MIN, 1 - b0.x)
        else { const ax = b0.x + b0.w; w = cl(b0.w - dx, MIN, ax); x = ax - w }
        if (k) { h = w * k; if (h > 1) { h = 1; const nw = h / k; if (d.mode === 'w') x += w - nw; w = nw } y = cl(b0.y + (b0.h - h) / 2, 0, 1 - h) }
      } else {
        if (d.mode === 's') h = cl(b0.h + dy, MIN, 1 - b0.y)
        else { const ay = b0.y + b0.h; h = cl(b0.h - dy, MIN, ay); y = ay - h }
        if (k) { w = h / k; if (w > 1) { w = 1; const nh = w * k; if (d.mode === 'n') y += h - nh; h = nh } x = cl(b0.x + (b0.w - w) / 2, 0, 1 - w) }
      }
      b = { x, y, w, h }
    } else {
      const L = d.mode.includes('w'), T = d.mode.includes('n')
      const ax = L ? b0.x + b0.w : b0.x, ay = T ? b0.y + b0.h : b0.y
      const px = cl((L ? b0.x : b0.x + b0.w) + dx, 0, 1), py = cl((T ? b0.y : b0.y + b0.h) + dy, 0, 1)
      const maxW = L ? ax : 1 - ax, maxH = T ? ay : 1 - ay
      let w = Math.min(maxW, Math.max(MIN, Math.abs(px - ax))), h = Math.min(maxH, Math.max(MIN, Math.abs(py - ay)))
      if (ratio) { const k = C.w / (ratio * C.h), wFromH = h / k; w = Math.max(w, wFromH); h = w * k; if (h > maxH) { h = maxH; w = h / k } if (w > maxW) { w = maxW; h = w * k } }
      b = { x: L ? ax - w : ax, y: T ? ay - h : ay, w, h }
    }
    this.setState({ crop: { ...C, box: b } })
  }
  onCropUp = () => {
    this.cd = null
    window.removeEventListener('pointermove', this.onCropMove); window.removeEventListener('pointerup', this.onCropUp); window.removeEventListener('pointercancel', this.onCropUp)
  }
  recropBg = async () => {
    const sel = this.state.slides.find((x) => x.id === this.state.selected)
    if (!sel) return
    const cur = sel[this.bgField()] || (this.portrait() ? sel.bg : null)
    if (!cur) return
    let b: Blob | null = null
    try { b = await this.blobOf(cur) } catch { /* bildet finnes ikke */ }
    if (!b) return
    const ext = /png/i.test(b.type) ? '.png' : /webp/i.test(b.type) ? '.webp' : '.jpg'
    this.nextCropEdit = true
    void this.onImgFile({ target: { files: [new File([b], 'bilde' + ext, { type: b.type || 'image/jpeg' })], value: '' } })
  }
  canPanSel() {
    const S = this.state, sel = S.slides.find((x) => x.id === S.selected)
    if (!sel) return false
    const b = this.bgOf(sel), im = b ? this.media.images[b] : null
    if (!im?.naturalWidth) return false
    const { W, H } = this.dims(), ia = im.naturalWidth / im.naturalHeight, fa = W / H
    return ia > fa * 1.02 || ia < fa * 0.98
  }
  editImg = () => {
    if (this.canPanSel()) this.openPan()
    else void this.recropBg()
  }
  /** Store bilder skaleres én gang ved opplasting, så forhåndsvisning, opptak og eksport går raskt. */
  async shrinkImg(f: File, maxEdge: number, keepAlpha?: boolean): Promise<File | null> {
    if (/gif|svg/i.test(f.type || '')) return f
    let src: ImageBitmap | HTMLImageElement, w = 0, h = 0, url: string | null = null
    try {
      const bmp = await createImageBitmap(f)
      src = bmp; w = bmp.width; h = bmp.height
    } catch {
      try {
        url = URL.createObjectURL(f)
        const u = url
        const img = await new Promise<HTMLImageElement>((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = u })
        src = img; w = img.naturalWidth; h = img.naturalHeight
      } catch {
        if (url) URL.revokeObjectURL(url)
        this.deps.alert(this.t('Klarte ikke å lese bildet. Lagre det som JPG eller PNG og prøv igjen.'))
        return null
      }
    }
    const close = () => { if ('close' in src) src.close(); if (url) URL.revokeObjectURL(url) }
    const k = Math.min(1, maxEdge / Math.max(w, h))
    if (k === 1 && f.size < 12 * 1048576 && /jpe?g|png|webp/i.test(f.type || '')) { close(); return f }
    this.setState({ busy: 'img' })
    try {
      const c = document.createElement('canvas')
      c.width = Math.round(w * k)
      c.height = Math.round(h * k)
      const g = c.getContext('2d')
      if (!g) return f
      g.imageSmoothingEnabled = true
      g.imageSmoothingQuality = 'high'
      g.drawImage(src, 0, 0, c.width, c.height)
      const png = keepAlpha || (/png|webp/i.test(f.type || '') && keepAlpha !== false && this.hasAlpha(g, c.width, c.height))
      const out = await new Promise<Blob | null>((r) => c.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.92))
      return out ? new File([out], (f.name || 'bilde').replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg'), { type: out.type }) : f
    } catch {
      return f
    } finally {
      close()
      if (this.alive) this.setState({ busy: '' })
    }
  }
  hasAlpha(g: CanvasRenderingContext2D, w: number, h: number) {
    const sw = Math.min(w, 256), sh = Math.min(h, 256), c = document.createElement('canvas')
    c.width = sw
    c.height = sh
    const x = c.getContext('2d')
    if (!x) return false
    x.drawImage(g.canvas, 0, 0, sw, sh)
    const d = x.getImageData(0, 0, sw, sh).data
    for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 255) < 250) return true
    return false
  }

  /* ---------- demo (tydelig merket, lagres aldri) ----------
     Eksempelinnholdet med genererte bakgrunner (fargeoverganger og former tegnet i nettleseren) – ingen fotografier
     eller logoer. Ingenting lagres. «Avslutt demo» åpner den vanlige serien. */
  makeDemoBg(i: number): Promise<Blob | null> {
    const P = [['#1d2b64', '#f8cdda'], ['#0f2027', '#2c5364'], ['#42275a', '#734b6d'], ['#134e5e', '#71b280'], ['#3a1c71', '#ffaf7b']][i % 5] ?? ['#000000', '#ffffff']
    const c = document.createElement('canvas')
    c.width = 1920
    c.height = 1080
    const g = c.getContext('2d')
    if (!g) return Promise.resolve(null)
    const lg = g.createLinearGradient(0, 0, 1920, 1080)
    lg.addColorStop(0, P[0] ?? '#000000')
    lg.addColorStop(1, P[1] ?? '#ffffff')
    g.fillStyle = lg
    g.fillRect(0, 0, 1920, 1080)
    g.globalAlpha = 0.18
    g.fillStyle = '#ffffff'
    for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(240 + ((k * 397 + i * 211) % 1600), 160 + ((k * 263 + i * 137) % 820), 60 + ((k * 89 + i * 41) % 260), 0, Math.PI * 2); g.fill() }
    g.globalAlpha = 0.12
    g.lineWidth = 3
    g.strokeStyle = '#ffffff'
    for (let y = -400; y < 1500; y += 90) { g.beginPath(); g.moveTo(0, y + i * 23); g.lineTo(1920, y + 500 + i * 23); g.stroke() }
    return new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.9))
  }
  async demoData(tpl: string): Promise<SavedData> {
    const d = sampleData(tpl), ids: string[] = [], urls: Record<string, string> = {}
    for (let i = 0; i < 5; i++) {
      const b = await this.makeDemoBg(i)
      if (!b) continue
      const id = 'gen:' + i, u = URL.createObjectURL(b), im = new Image()
      im.src = u
      this.media.images[id] = im
      urls[id] = u
      ids.push(id)
    }
    this.setState((s) => ({ urls: { ...s.urls, ...urls } }))
    return { ...d, slides: d.slides.map((x, i) => ({ ...x, bg: ids.length ? (ids[i % ids.length] ?? null) : null, ruleId: null })) }
  }
  /** «Lagre som grunnoppsett»: nytt grunnoppsett (personlig eller felles); demoen og andre serier endres ikke. */
  openBaseDialog = () => {
    this.baseDialog = { open: true, name: this.t('Mitt grunnoppsett'), level: 'p', msg: '', busy: false, openHref: this.baseDialog.openHref }
    this.forceUpdate()
  }
  setBaseDialog(p: Partial<LoopController['baseDialog']>) {
    this.baseDialog = { ...this.baseDialog, ...p }
    this.forceUpdate()
  }
  closeBaseDialog = () => {
    this.baseDialog = { ...this.baseDialog, open: false }
    this.forceUpdate()
  }
  canChurchBase() {
    return !!(this.deps.me?.churches.length && this.deps.bases.central?.available())
  }
  saveBase = async () => {
    const B = this.baseDialog
    if (B.busy) return
    this.baseDialog = { ...B, busy: true, msg: 'Lagrer …' }
    this.forceUpdate()
    const S = this.state, e = entryOf({ name: B.name, base: S.tpl, programText: S.programText, slides: S.slides, cfg: S.cfg })
    try {
      if (B.level === 'f' && this.deps.bases.central) await this.deps.bases.central.add(e)
      else this.deps.bases.personal.add(e)
      this.baseDialog = { ...this.baseDialog, open: false, busy: false, msg: '', openHref: e.base + '|' + B.level + '-' + e.id }
      this.deps.toast(this.t(B.level === 'f' ? 'Grunnoppsettet er lagret og er felles for menigheten. Du finner det på Loop Studio-siden.' : 'Grunnoppsettet er lagret (personlig). Du finner det på Loop Studio-siden.'))
    } catch (x) {
      const code = (x as { code?: string } | null)?.code
      this.baseDialog = { ...this.baseDialog, busy: false, msg: code === 'full' ? 'Du har nådd grensen på 20 grunnoppsett. Slett et på Loop Studio-siden først.' : code === 'forbidden' ? 'Du har ikke tilgang til å lagre et felles grunnoppsett.' : 'Grunnoppsettet kunne ikke lagres. Prøv igjen.' }
    }
    this.forceUpdate()
  }
  /** Serie fra et grunnoppsett: brukeren kan bevisst oppdatere grunnoppsettet med serien. */
  updateBase = async () => {
    const g = this.fromBase
    if (!g || !this.state.ready) return
    if (!this.deps.confirm(this.t('Oppdatere grunnoppsettet') + ' «' + g.name + '» ' + this.t('med denne serien?') + (g.kind === 'f' ? '\n\n' + this.t('Det gjelder for hele menigheten.') : ''))) return
    const S = this.state, d = entryOf({ name: g.name, base: S.tpl, programText: S.programText, slides: S.slides, cfg: S.cfg }).data
    try {
      if (g.kind === 'f' && this.deps.bases.central) await this.deps.bases.central.update(g.id, d)
      else this.deps.bases.personal.update(g.id, d)
      this.deps.toast(this.t('Grunnoppsettet er oppdatert.'))
    } catch (x) {
      const code = (x as { code?: string } | null)?.code
      this.deps.toast(this.t(code === 'missing' ? 'Grunnoppsettet finnes ikke lenger (det kan være slettet). Lagre serien som et nytt grunnoppsett.' : 'Grunnoppsettet kunne ikke oppdateres. Prøv igjen.'))
    }
  }
  closeBanner = () => {
    this.banner = null
    this.forceUpdate()
  }
  bgSource(b: string | null | undefined, sel: Slide | null): string {
    if (!b) return ''
    if (sel?.ruleId) { const r = (this.state.cfg.imgRules ?? []).find((x) => x.id === sel.ruleId); if (r) return 'Kilde: Fast bilde «' + (r.kw || 'Uten navn') + '» (Faste bilder i Loop Studio)' }
    if (b.startsWith('ch:')) return 'Kilde: menighetens filer i ConnectHub (Faste bilder, Felles ressurser eller Fellesmappe)'
    if (b.startsWith('img-')) return 'Kilde: eget bilde – lagret bare på denne enheten'
    if (b.startsWith('demo-') || b.startsWith('gen:')) return 'Kilde: generert bakgrunn (fargeovergang og former)'
    return 'Kilde: eldre innebygd bilde'
  }
  async blobOf(b: string | null | undefined): Promise<Blob | null> {
    if (!b) return null
    if (b.startsWith('img-')) return this.deps.media.get(b)
    if (b.startsWith('ch:')) return this.deps.cloud ? this.deps.cloud.blob(b) : null
    if (/^gen:\d$/.test(b)) return this.makeDemoBg(Number(b.slice(4)))
    const s = safeSrc(b)
    return s ? (await fetch(/^images\//.test(s) ? '/' + s : s)).blob() : null
  }

  /* ---------- felles grunnoppsett for menigheten (ConnectHub) ----------
     Malene har ett felles grunnoppsett per menighet (cfg: farger, tekst, logo, effekter, standarduken og Faste bilder),
     i church_settings «loopstudio:<mal>». Prosjektet (programtekst, slides, video og musikk) er personlig.
     Bilder i grunnoppsettet er referanser til menighetens filer («ch:<id>»); lokale bilder lastes opp ved lagring
     (logo → Logoer for Admin, ellers Fellesmappe; Faste bilder → Faste, bare Admin). Faste bilder kan bare endres av Admin. */
  sharedOn() {
    return !!(this.shared?.available && this.state.sharedReady && !this.state.sharedErr)
  }
  canEditRules() {
    return !this.sharedOn() || !!this.shared?.canAdmin
  }
  sharedCfg(cfg: Cfg): Cfg & Record<string, unknown> {
    const ok = (v: unknown) => (typeof v === 'string' && v.startsWith('ch:') ? v : null)
    return { ...cfg, logoSrc: ok(cfg.logoSrc), imgRules: (cfg.imgRules ?? []).map((r) => ({ ...r, bg: ok(r.bg), bgPort: ok(r.bgPort) })) }
  }
  async initShared(tpl: string) {
    if (this.customId || this.diskId || this.demo) return
    const sh = this.deps.shared('loopstudio:' + tpl, { onRemote: (d) => this.applyShared(d, false), onStatus: (st) => this.sharedStatus(st) })
    if (!sh?.available) return
    this.shared = sh
    try {
      const d = await sh.load()
      if (d) this.applyShared(d, true)
      this.sharedAt = performance.now()
      this.setState({ sharedReady: true, sharedExists: !!d })
      sh.watch()
    } catch {
      this.setState({ sharedReady: true, sharedErr: true })
      this.deps.toast(this.t('Menighetens grunnoppsett kunne ikke hentes. Du ser ditt eget oppsett på denne enheten.'))
    }
  }
  applyShared(d: Cfg, initial: boolean) {
    this.sharedAt = performance.now()
    this.setState(() => ({ cfg: { ...this.baseCfg, ...this.tplCfg, ...d } }), () => {
      this.setRules((r) => r, true)
      for (const r of d.imgRules ?? []) { if (r.bg) void this.ensureImg(r.bg); if (r.bgPort) void this.ensureImg(r.bgPort) }
      if (d.logoSrc) void this.ensureImg(d.logoSrc)
    })
    if (!initial) this.deps.toast(this.t('Grunnoppsettet er oppdatert med endringer fra menigheten.'))
  }
  sharedStatus(st: { state: string; text: string }) {
    if (st.state === 'error' || st.state === 'conflict' || st.state === 'merged') this.deps.toast(st.text)
    if (this.alive) this.setState({ sharedState: st.state })
  }
  queueShared() {
    if (!this.sharedOn() || performance.now() - this.sharedAt < 1500) return
    clearTimeout(this.shT)
    this.shT = setTimeout(() => {
      void (async () => {
        const sh = this.shared
        if (!sh) return
        try { await this.uploadLocalRefs() } catch { /* bildene lastes opp neste gang */ }
        const first = !sh.exists, ok = await sh.save(this.sharedCfg(this.state.cfg), 0)
        if (ok && first && sh.exists) { this.setState({ sharedExists: true }); this.deps.toast(this.t('Grunnoppsettet er nå felles for menigheten. Andre i menigheten ser endringene.')) }
      })()
    }, 900)
  }
  /** Bilder under 30 MB i et format serveren godtar. */
  async fitUpload(b: Blob, name: string): Promise<File> {
    if (b.size <= 30 * 1048576 && /^image\/(png|jpeg|webp|gif)$/.test(b.type)) return new File([b], name, { type: b.type })
    const bmp = await createImageBitmap(b), k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.86))
    return new File([out ?? b], name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  }
  /** Lokale bilder i grunnoppsettet lastes opp til ConnectHub én gang og erstattes med referanser. */
  async uploadLocalRefs() {
    const sh = this.shared, cloud = this.deps.cloud, map = this.refMap
    if (!sh || !cloud) return
    const conv = async (ref: string | null | undefined, folder: string, name: string): Promise<string | null | undefined> => {
      if (!ref || !ref.startsWith('img-')) return ref
      const hit = map[ref]
      if (hit) return hit
      const b = await this.deps.media.get(ref).catch(() => null)
      if (!b) return ref
      const nr = await cloud.upload(await this.fitUpload(b, name + (/png/.test(b.type) ? '.png' : '.jpg')), folder)
      map[ref] = nr
      const im = this.media.images[ref]
      if (im) this.media.images[nr] = im
      this.setState((s) => ({ urls: { ...s.urls, [nr]: s.urls[ref] ?? '' } }))
      return nr
    }
    const c = this.state.cfg, upd: Partial<Cfg> = {}
    if (c.logoSrc?.startsWith('img-')) upd.logoSrc = (await conv(c.logoSrc, sh.canAdmin ? 'logoer' : 'bilder', 'Logo')) ?? null
    if (sh.canAdmin && (c.imgRules ?? []).some((r) => (r.bg || '').startsWith('img-') || (r.bgPort || '').startsWith('img-'))) {
      const rules: ImgRule[] = []
      for (const r of c.imgRules ?? []) rules.push({ ...r, bg: (await conv(r.bg, 'faste', r.kw || 'Fast bilde')) ?? null, bgPort: (await conv(r.bgPort, 'faste', (r.kw || 'Fast bilde') + ' stående')) ?? null })
      upd.imgRules = rules
    }
    if (Object.keys(upd).length) await new Promise<void>((res) => this.setState((s) => ({ cfg: { ...s.cfg, ...upd } }), res))
  }
  /** «Fellesmappe»: referanse til originalen i ConnectHub (ingen kopi). */
  async pickShared(start: string, apply: (ref: string) => void) {
    if (!this.deps.cloud) return
    const r = await this.deps.cloud.pick({ start, title: this.t('Velg bilde fra Fellesmappe') })
    if (!r || !this.alive) return
    const url = URL.createObjectURL(r.blob), im = new Image()
    im.src = url
    this.media.images[r.ref] = im
    this.setState((s) => ({ urls: { ...s.urls, [r.ref]: url } }), () => apply(r.ref))
  }
  setSlideBg(ref: string) {
    const sid = this.state.selected
    if (!sid) return
    const F = this.bgField()
    this.setF(sid, F, ref)
    const me = this.state.slides.find((x) => x.id === sid)
    if (me?.type === 'day' && me.title && !me.ruleId) this.rememberTitle(me.title, ref, F)
  }

  /* ---------- faste bilder (møtenavn → bilde) ---------- */
  ruleFor(title: string | undefined, rules?: ImgRule[]): ImgRule | null {
    const t = String(title || '').toLowerCase()
    const rs = (rules ?? this.state.cfg.imgRules ?? []).filter((r) => r.kw?.trim() && (r.bg || r.bgPort)).sort((a, b) => (b.kw ?? '').trim().length - (a.kw ?? '').trim().length)
    return rs.find((r) => t.includes((r.kw ?? '').trim().toLowerCase())) ?? null
  }
  ruleForSlide(x: Slide, rules?: ImgRule[]): ImgRule | null {
    const rs = rules ?? this.state.cfg.imgRules ?? []
    if (x.ruleId) { const r = rs.find((q) => q.id === x.ruleId); if (r) return r.bg || r.bgPort ? r : null }
    return x.type === 'day' ? this.ruleFor(x.title, rs) : null
  }
  daySlides(days: ReturnType<typeof parse>['days'], old: Slide[]) {
    return daySlides(days, old, (t) => this.ruleFor(t), (x) => this.ruleForSlide(x))
  }
  draftRules(fn: (d: ImgRule[]) => ImgRule[], apply?: boolean) {
    this.setState((s) => ({ rulesDraft: fn(s.rulesDraft ?? []) }), () => this.setRules(() => (this.state.rulesDraft ?? []).map((r) => ({ ...r })), apply !== false))
  }
  setRules(fn: (r: ImgRule[]) => ImgRule[], apply: boolean) {
    this.setState((s) => {
      const rules = fn(s.cfg.imgRules ?? [])
      const live = s.slides.map((x) => (x.ruleId && !rules.some((r) => r.id === x.ruleId) ? { ...x, ruleId: null } : x))
      const slides = !apply
        ? live
        : live.map((x) => {
            if (x.type !== 'day' && !x.ruleId) return x
            const r = this.ruleForSlide(x, rules)
            if (!r) return x
            const nb = r.bg || x.bg, np = r.bgPort || x.bgPort || null
            return nb !== x.bg || np !== x.bgPort ? { ...x, bg: nb, bgPort: np } : x
          })
      return { cfg: { ...s.cfg, imgRules: rules }, slides }
    })
  }
  applyRulesNow = () => {
    const n = this.state.slides.filter((x) => x.type === 'day' && this.ruleFor(x.title)).length
    this.setRules((r) => r, true)
    this.setState({ parseMsg: n ? 'Standardbildene er brukt på ' + n + (n === 1 ? ' møte.' : ' møter.') : 'Ingen møter passet med ordene i listen.', parseOk: !!n })
  }
  onRuleFile = async (e: FileEv) => {
    let f: File | null = e.target.files?.[0] ?? null
    e.target.value = ''
    if (f && !this.okFile(f, 'image')) return
    if (f) { f = await this.cropImage(f, { aspect: this.portrait() ? '9:16' : '16:9', title: 'Beskjær bakgrunnsbildet' }); if (!f) return }
    if (f) { f = await this.shrinkImg(f, 5120); if (!f) return }
    const rid = this.ruleTarget
    if (!f || !rid) return
    const id = await this.storeImage(f)
    if (!id) return
    const F = this.bgField()
    this.setState({ galleryFor: null })
    this.draftRules((ds) => ds.map((r) => (r.id === rid ? { ...r, [F]: id } : r)))
  }
  /** Legger bildet i «Dine medier» og viser det med en gang. → referansen (`img-<id>`). */
  async storeImage(f: Blob, name = 'bilde'): Promise<string | null> {
    let id: string
    try {
      id = await this.deps.media.put(f, 'img', f instanceof File ? f.name : name)
    } catch {
      this.deps.alert(this.t('Kunne ikke lagre bildet i nettleseren. Det kan være for lite lagringsplass.'))
      return null
    }
    const url = URL.createObjectURL(f), im = new Image()
    im.src = url
    this.media.images[id] = im
    this.setState((s) => ({ urls: { ...s.urls, [id]: url } }))
    return id
  }

  /* ---------- lagring ---------- */
  tplNames(): Record<string, string> {
    return TPL_NAMES
  }
  slot(t?: string) {
    return slotOf(t ?? this.state.tpl, this.customId)
  }
  async loadVideo() {
    const v = this.media.video
    if (!v) return
    if (v.src.startsWith('blob:')) URL.revokeObjectURL(v.src)
    let vb: Blob | null = null
    try { vb = this.videoRef ? await this.deps.media.get(this.videoRef) : null } catch { /* videoen finnes ikke */ }
    if (vb) v.src = URL.createObjectURL(vb)
    else { v.removeAttribute('src'); v.load(); return }
    void v.play().catch(() => undefined)
  }
  /** «Hent tilbake»: det gamle eksempelinnholdet som ble lagt til side, blir brukerens prosjekt igjen. */
  restoreArchived = async () => {
    const a = this.archived
    if (!a) return
    const raw = this.deps.kv.get('ukeloop.arkiv.' + a.slot)
    if (raw) {
      try {
        const d = JSON.parse(raw) as WorkData
        this.deps.kv.set('ukeloop.keepsample.' + a.slot, '1')
        await this.deps.repo.saveWork(a.slot, d, this.customName || TPL_NAMES[this.state.tpl])
        this.deps.kv.remove('ukeloop.arkiv.' + a.slot)
      } catch {
        // arkivet kunne ikke leses
      }
    }
    this.deps.open({ ...this.deps.query })
  }
  loadSaved(t: string): WorkData | null {
    const slot = this.slot(t)
    let saved = this.deps.repo.getWork(slot)
    if (saved && !this.customId && this.deps.kv.get('ukeloop.keepsample.' + slot) !== '1' && isLegacySample(saved, t)) {
      /* Tidligere versjoner lagret eksempelinnholdet automatisk første gang. Et prosjekt som fortsatt er helt likt
         eksempelet, legges til side (aldri slettet), og brukeren starter med en tom serie (kan hentes tilbake). */
      if (this.deps.kv.set('ukeloop.arkiv.' + slot, JSON.stringify(saved))) {
        void this.deps.repo.removeWork(slot)
        this.archived = { slot }
        return null
      }
    }
    if (saved) saved = { ...saved, cfg: cleanLegacyCfg(saved.cfg ?? {}), slides: (saved.slides ?? []).filter(isSlide) }
    return saved?.slides.length ? saved : null
  }
  workData(): WorkData {
    const s = this.state
    return { programText: s.programText, slides: s.slides, cfg: s.cfg, videoName: s.videoName, audioName: s.audioName, video: this.videoRef, audio: this.audioRef }
  }
  saveNow() {
    clearTimeout(this.sv)
    if (this.demo || !this.state.ready) return
    void this.deps.repo.saveWork(this.slot(), this.workData(), this.customName || TPL_NAMES[this.state.tpl]).catch(() => undefined)
  }
  /** Nye brukere starter med en tom serie (ingen eksempeltekst, ingen bilder). Eksempelet brukes bare i demoen. */
  defaults(tpl: string): SavedData {
    const s = sampleData(tpl)
    return { programText: '', cfg: s.cfg, slides: [] }
  }
  async init() {
    const g = this.gen, stale = () => g !== this.gen || !this.alive
    const q = this.deps.query
    let tpl: Tpl = 'week'
    const mal = q.mal || this.deps.kv.get('ukeloop.tpl') || 'week'
    if (isTpl(mal)) tpl = mal
    try {
      const cid = q.id || ''
      const list = (JSON.parse(this.deps.kv.get('loopstudio.tpls.v1') || 'null') as { cards?: { id: string; title?: string }[] } | null)?.cards ?? []
      const card = Array.isArray(list) ? list.find((c) => c?.id === cid) : null
      const did = q.disk || ''
      if (/^d-[a-z0-9]{4,16}$/.test(did)) {
        const ent = this.diskList().find((d) => d.id === did)
        if (ent) { this.diskId = did; this.customId = did; this.customName = ent.name; this.diskData = ent.data }
      }
      const fd = q.fdisk || ''
      if (/^[0-9a-f-]{36}$/.test(fd) && this.deps.sharedDisk && !this.diskId) {
        const row = await this.deps.sharedDisk.svc.get(fd).catch(() => null)
        if (stale()) return
        if (row) { this.sharedEntry = { id: row.id, version: row.version, name: row.name }; this.sharedData = row.data; this.customId = 's' + fd.replace(/-/g, '').slice(0, 15); this.customName = row.name }
        else this.deps.toast(this.t('Loopen finnes ikke lenger på menighetens disk.'))
      }
      const gr = q.grunn || ''
      if (/^[pf]-[a-z0-9]{4,16}$/.test(gr) && !this.diskId && !this.sharedEntry) {
        const kind = gr[0] ?? 'p', id = gr.slice(2)
        const e = kind === 'f' ? await (this.deps.bases.central?.get(id) ?? Promise.resolve(null)).catch(() => null) : this.deps.bases.personal.get(id)
        if (stale()) return
        if (e) { this.fromBase = { kind, id, name: e.name, data: e.data }; this.customId = 'g' + gr.replace('-', ''); this.customName = e.name }
      }
      if (this.diskId || this.fromBase || this.sharedEntry) {
        // navnet er satt over
      } else if (/^c-[a-z0-9]{4,16}$/.test(cid)) { this.customId = cid; this.customName = card && typeof card.title === 'string' ? card.title.slice(0, 60) : 'Egen mal' }
      else if (card && typeof card.title === 'string' && card.title.trim() && card.title !== TPL_NAMES[tpl]) this.customName = card.title.slice(0, 60)
    } catch {
      // ugyldige malkort
    }
    if (q.demo !== '1') this.deps.kv.set('ukeloop.tpl', tpl)
    this.baseCfg = this.state.cfg
    this.tplCfg = this.defaults(tpl).cfg ?? {}
    const okSlides = (a: unknown) => (Array.isArray(a) ? a.filter(isSlide) : [])
    const dd = this.diskData && okSlides(this.diskData.slides).length ? { ...this.diskData, slides: okSlides(this.diskData.slides) } : null
    this.demo = q.demo === '1' && !this.customId && !this.diskId
    const fb = this.fromBase ? { ...this.fromBase.data, slides: okSlides(this.fromBase.data.slides) } : null
    // en loop fra menighetens disk åpnes alltid med det som er lagret der (ikke en eldre lokal arbeidskopi)
    const sd = this.sharedData ? { programText: this.sharedData.programText || '', slides: okSlides(this.sharedData.slides), cfg: (this.sharedData.cfg ?? {}) as Cfg } : null
    const saved = this.demo || sd ? null : this.loadSaved(tpl)
    const base: SavedData & Partial<WorkData> = this.demo ? await this.demoData(tpl) : (saved ?? dd ?? sd ?? fb ?? this.defaults(tpl))
    if (stale()) return
    /* arbeidskopien husker video og lyd; en ny serie fra Disk eller grunnoppsett starter uten */
    this.videoRef = saved?.video ?? null
    this.audioRef = saved?.audio ?? null
    this.banner = this.demo ? 'demo' : this.fromBase ? 'base' : this.archived ? 'legacy' : null
    this.initAt = performance.now()
    this.setState({ ready: true, tpl, programText: base.programText || '', slides: base.slides, cfg: { ...this.state.cfg, ...(base.cfg ?? {}) }, videoName: (this.videoRef && base.videoName) || '', audioName: (this.audioRef && base.audioName) || '', selected: base.slides[0]?.id ?? null })
    /* bare én lydmotor per side: lukk tidligere kontekster (ny åpning, oppdatering av koden) */
    contexts.splice(0).forEach((x) => void x.close().catch(() => undefined))
    if (soundOwner) {
      try { soundOwner.actl.stop() } catch { /* ingenting */ }
      void soundOwner.ac.close().catch(() => undefined)
      soundOwner.video.remove()
      soundOwner = null
    }
    document.querySelectorAll('video[data-ukeloop-bg],video[data-ukeloop-slide]').forEach((x) => {
      try { (x as HTMLVideoElement).pause(); x.remove() } catch { /* ingenting */ }
    })
    const v = document.createElement('video')
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.autoplay = true
    v.setAttribute('data-ukeloop-bg', '1')
    hidden(v)
    document.body.appendChild(v)
    this.media.video = v
    try {
      const ac = new AudioContext()
      contexts.push(ac)
      const mix = ac.createGain(), sp = ac.createGain(), dest = ac.createMediaStreamDestination()
      mix.connect(sp)
      sp.connect(ac.destination)
      mix.connect(dest)
      this.actx = ac
      this.gSpeaker = sp
      this.aDest = dest
      this.mix = mix
      this.actl = __ukeloopAudioCtl(ac, mix)
      soundOwner = { ac, actl: this.actl, video: v, owner: this }
    } catch {
      // ingen lyd i denne nettleseren
    }
    this.setState({ audioLib: this.libRead() })
    try {
      const ab = this.audioRef ? await this.deps.media.get(this.audioRef) : null
      if (stale()) return
      if (ab) void this.loadAudioBlob(ab)
      else if (this.audioRef) { this.audioRef = null; this.setState({ audioName: '' }) }
    } catch {
      // lydsporet finnes ikke
    }
    try {
      ;['400', '500', '600', '700'].forEach((w) => void document.fonts.load(w + ' 40px Archivo').catch(() => undefined))
      document.fonts.addEventListener('loadingdone', () => { this.fontTick++ })
    } catch {
      // ingen fontlasting
    }
    if (base.cfg?.font && base.cfg.font !== 'Archivo') this.setFont(base.cfg.font)
    base.slides.forEach((s) => { if (s.bg) void this.ensureImg(s.bg); (s.pips ?? []).forEach((p) => p?.src && void this.ensureImg(p.src)) })
    if (stale()) return
    this.t0 = performance.now()
    cancelAnimationFrame(this.raf)
    this.loop()
    void this.loadVideo()
    void this.initShared(tpl)
    void this.waitQR()
    if (q.asset) void this.receiveAsset(q.asset)
  }
  /** «Åpne i Loop Studio» fra «Dine medier»: bildet blir bakgrunn på valgt slide. */
  async receiveAsset(ref: string) {
    const b = await this.deps.media.get('img-' + ref)
    if (!b) return
    if (!this.state.selected) { this.deps.toast(this.t('Velg en slide først, så legges bildet inn som bakgrunn.')); return }
    void this.onImgFile({ target: { files: [new File([b], 'bilde.' + (b.type.split('/')[1] || 'png'), { type: b.type })], value: '' } })
  }

  /* ---------- angre og gjør om ---------- */
  snapOf(S: State) {
    return { slides: S.slides, cfg: S.cfg, programText: S.programText }
  }
  trackHistory() {
    const S = this.state, cur = this.snapOf(S), prev = this.snap
    if (!prev) { this.snap = cur; return }
    if (prev.slides === cur.slides && prev.cfg === cur.cfg && prev.programText === cur.programText) return
    const now = performance.now()
    if (this.restoring || now - this.initAt < 2500) { this.restoring = false; this.snap = cur; return }
    if (now - this.lastChange > 700) { this.past.push(prev); if (this.past.length > 100) this.past.shift() }
    this.lastChange = now
    this.future = []
    this.snap = cur
    this.setState({ hist: this.past.length + ':' + this.future.length })
  }
  restore(from: Snap[], to: Snap[]) {
    const target = from.pop()
    if (!target) return
    to.push(this.snapOf(this.state))
    this.restoring = true
    this.lastChange = 0
    this.setState({ slides: target.slides, cfg: target.cfg, programText: target.programText, hist: this.past.length + ':' + this.future.length, parseMsg: '' })
  }
  undo = () => this.restore(this.past, this.future)
  redo = () => this.restore(this.future, this.past)
  onKey = (e: KeyboardEvent) => {
    const tg0 = (e.target as HTMLElement | null)?.tagName
    if ((e.code === 'Space' || e.key === ' ') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (tg0 === 'INPUT' || tg0 === 'TEXTAREA' || tg0 === 'SELECT' || (e.target as HTMLElement | null)?.isContentEditable) return
      e.preventDefault()
      if (tg0 === 'BUTTON') (e.target as HTMLElement).blur()
      this.togglePlay()
      return
    }
    const k = String(e.key).toLowerCase()
    if (!(e.metaKey || e.ctrlKey) || (k !== 'z' && k !== 'y')) return
    if (tg0 === 'INPUT' || tg0 === 'TEXTAREA') return
    e.preventDefault()
    if (e.shiftKey || k === 'y') this.redo()
    else this.undo()
  }
  syncState() {
    const S = this.state
    if (!S.ready) return
    this.trackHistory()
    const L = this.last
    // Valgt slide skal alltid finnes. Angre/gjør om, nytt program og felles oppsett bytter ut slidene; uten dette la
    // «Legg til på sliden» bildet/teksten på en slide som ikke fantes, og det forsvant stille («+ Bilde» virket ikke).
    if (L?.slides !== S.slides && S.selected && !S.slides.some((x) => x.id === S.selected)) {
      this.setState({ selected: S.slides[0]?.id ?? null, selEl: null })
      return
    }
    if (L?.slides !== S.slides) S.slides.forEach((s) => { if (s.bg) void this.ensureImg(s.bg); if (s.bgPort) void this.ensureImg(s.bgPort); (s.pips ?? []).forEach((p) => p?.src && void this.ensureImg(p.src)) })
    if (L?.cfg !== S.cfg && S.cfg.logoSrc) void this.ensureImg(S.cfg.logoSrc)
    if (L?.cfg !== S.cfg) (S.cfg.imgRules ?? []).forEach((r) => { if (r.bg) void this.ensureImg(r.bg); if (r.bgPort) void this.ensureImg(r.bgPort) })
    if (L?.cfg && L.cfg !== S.cfg) this.queueShared()
    if (!L || L.slides !== S.slides || L.cfg !== S.cfg || L.programText !== S.programText || L.videoName !== S.videoName || L.audioName !== S.audioName) {
      this.last = { slides: S.slides, cfg: S.cfg, programText: S.programText, videoName: S.videoName, audioName: S.audioName }
      clearTimeout(this.sv)
      this.sv = setTimeout(() => {
        if (this.demo) return
        this.saveNow()
        if (performance.now() - this.initAt > 1500) this.autoDisk()
      }, 700)
    }
  }
  async ensureImg(id: string) {
    if (this.media.images[id] || this.loading[id]) return
    if (!isStored(id) && !safeSrc(id)) return
    this.loading[id] = 1
    let url = /^images\//.test(id) ? '/' + id : id
    if (id.startsWith('img-')) {
      const b = await this.deps.media.get(id).catch(() => null)
      if (!b) return
      url = URL.createObjectURL(b)
    } else if (/^gen:\d$/.test(id)) {
      const b = await this.makeDemoBg(Number(id.slice(4)))
      if (!b) { delete this.loading[id]; return }
      url = URL.createObjectURL(b)
    } else if (id.startsWith('ch:')) {
      const u = this.deps.cloud ? await this.deps.cloud.url(id).catch(() => null) : null
      if (!u) { delete this.loading[id]; return }
      url = u
    }
    const im = new Image()
    im.onerror = () => undefined
    im.src = url
    this.media.images[id] = im
    if (this.alive) this.setState((s) => ({ urls: { ...s.urls, [id]: url } }))
  }
  makeQR(url: string | undefined): { rows: string[]; img: string } | null {
    if (!url || !this.qr || /^https?:\/\/$/.test(url)) return null
    const hit = this.qrCache[url]
    if (hit) return hit
    try {
      const Q = this.qr
      const utf8 = Q.stringToBytesFuncs?.['UTF-8']
      if (utf8) Q.stringToBytes = utf8
      const q = Q(0, 'M')
      q.addData(url)
      q.make()
      const n = q.getModuleCount(), rows: string[] = []
      for (let r = 0; r < n; r++) { let s = ''; for (let c = 0; c < n; c++) s += q.isDark(r, c) ? '1' : '0'; rows.push(s) }
      return (this.qrCache[url] = { rows, img: q.createDataURL(4, 2) })
    } catch {
      return null
    }
  }
  /** QR-biblioteket lastes ved oppstart; kontaktslides uten ferdig kode får den når biblioteket er klart. */
  async waitQR() {
    this.qrLib ??= loadQr().catch(() => null)
    this.qr = await this.qrLib
    if (!this.alive || !this.qr) return
    this.setState((s) => ({ slides: s.slides.map((x) => (x.type === 'contact' && x.qrUrl && !x.qr ? { ...x, qr: this.makeQR(x.qrUrl)?.rows ?? null } : x)) }))
    this.forceUpdate()
  }

  /* ---------- tidslinje og data til motoren ---------- */
  resolved() {
    const S = this.state
    const ak = (S.audioName || '') + '|' + (S.audioDur || 0) + '|' + (S.beatInfo ? S.beatInfo.bpm + ':' + S.beatInfo.first : '')
    if (this.rk === S.slides && this.rc === S.cfg && this.ra === ak) return this.r
    /* videoslides varer alltid like lenge som videoen */
    let all = S.slides.map((s) => ({ ...s, dur: s.vid && s.vidLen ? Math.max(1.5, Math.min(300, Number(s.vidLen))) : Math.max(1.5, Number(s.dur) || S.cfg.defDur || 5) }))
    if (S.cfg.audioMode === 'fit' && S.audioName && S.audioDur) {
      const vs = all.filter((s) => !s.hidden && s.vid).reduce((a, s) => a + s.dur, 0)
      const seg = Math.max(3, S.audioDur - (S.cfg.audioOffset || 0) - vs), sum = all.filter((s) => !s.hidden && !s.vid).reduce((a, s) => a + s.dur, 0)
      if (sum > 0) { const k = seg / sum; all = all.map((s) => (s.vid ? s : { ...s, dur: Math.max(1.5, s.dur * k) })) }
    }
    const bt = S.cfg.audioMode === 'beat' ? this.beat() : null
    if (bt) {
      const bar = 4 * bt.p, mn = Math.ceil(3 / bar), fix = S.cfg.beatBars || 0
      all = all.map((s) => (s.vid ? s : { ...s, dur: Math.max(mn, fix || Math.round(s.dur / bar)) * bar }))
    }
    this.rk = S.slides
    this.rc = S.cfg
    this.ra = ak
    this.p = null
    return (this.r = { all, active: all.filter((s) => !s.hidden) })
  }
  bgOf(x: Slide | null | undefined): string | null {
    return !x ? null : this.portrait() ? x.bgPort || x.bg || null : x.bg || null
  }
  /** Sliden slik motoren skal ha den (renset, samme regler som dagens app). */
  sd(s: Slide & { dur: number }): Slide {
    const okSrc = (src: string) => isStored(src) || !!safeSrc(src)
    const tcol = s.dateLink === false ? s.tcol : (() => { const o = { ...(s.tcol ?? {}) }; delete o.date; return o })()
    const r = (v: unknown, lo: number, hi: number) => (v == null ? null : Math.max(lo, Math.min(hi, Number(v))))
    return {
      id: s.id, type: s.type, extra: !!s.extra, day: s.day, date: s.date, time: s.time, title: s.title, place: s.place, kicker: s.kicker, pill: s.pill, body: s.body, sub: s.sub, headline: s.headline,
      text: s.text, email: s.email, phone: s.phone, qr: s.qr, bg: this.bgOf(s), bgOpacity: s.bgOpacity, vig: s.vig, vigColor: isHex(s.vigColor) ? s.vigColor : null,
      vigType: VIGT.includes(String(s.vigType)) ? s.vigType : null, vigRot: s.vigRot == null ? null : Math.max(-180, Math.min(180, Number(s.vigRot) || 0)), vigSoft: r(s.vigSoft, 0, 1),
      vigSize: s.vigSize == null ? null : Math.max(0.2, Math.min(3, Number(s.vigSize) || 1)), vigAmt: r(s.vigAmt, 0, 2), vigAlpha: r(s.vigAlpha, 0, 1), fx: s.fx, fy: s.fy,
      panX: r(s.panX, 0, 1), panY: r(s.panY, 0, 1), noLogo: !!s.noLogo, vigOff: !!s.vigOff, tintMode: s.tintMode || 'auto', tint: isHex(s.tint) ? s.tint : null, tintAmt: s.tintAmt,
      ov: cleanOv(s.ov), tcol: cleanTcol(tcol), tsc: cleanTsc(s.tsc), toff: cleanToff(s.toff), pips: cleanPips(s.pips, okSrc), ftexts: cleanFtexts(s.ftexts),
      fqr: cleanFqr(s.fqr, (u) => this.makeQR(u)?.rows ?? null), panels: cleanPanels(s.panels), panelBg: isHex(s.panelBg) ? s.panelBg : null, qrX: s.qrX, qrY: s.qrY, qrSize: s.qrSize, dur: s.dur,
      bgFill: cleanFill(s.bgFill), oAmt: r(s.oAmt, 0, 1.5), oSpeed: r(s.oSpeed, 0.1, 4), oAlpha: r(s.oAlpha, 0, 1), oColor: isHex(s.oColor) ? s.oColor : null, vigs: cleanVigs(s.vigs),
      vid: typeof s.vid === 'string' && s.vid.startsWith('vid-') ? s.vid : null, vidSound: s.vidSound !== false, vidMusic: !!s.vidMusic, vidVol: s.vidVol == null ? 1 : Math.max(0, Math.min(1, Number(s.vidVol) || 0)),
    }
  }
  payload(): LoopData {
    const Rz = this.resolved()
    if (this.p) return this.p
    const c = this.state.cfg, bt = c.audioMode === 'beat' ? this.beat() : null, bi = this.state.beatInfo
    const vigNums: Record<string, number> = {}
    for (const k of ['vigRot', 'vigOpen', 'vigX', 'vigY', 'vigSize', 'vigAmt', 'vigAlpha', 'vigSoft'] as const) if (c[k] != null && Number.isFinite(Number(c[k]))) vigNums[k] = Number(c[k])
    return (this.p = {
      cfg: {
        accent: c.accent, header: c.header, topLabel: c.topLabel, headerX: c.headerX, headerY: c.headerY, topLabelX: c.topLabelX, topLabelY: c.topLabelY, overlay: c.overlay, rail: c.rail, vigOn: c.vigOn,
        vigColor: isHex(c.vigColor) ? c.vigColor : null, vigType: VIGT.includes(String(c.vigType)) ? c.vigType : 'auto', vigs: cleanVigs(c.vigs), ...vigNums,
        logoSrc: c.logoSrc, logoOn: c.logoOn, logoSize: c.logoSize, headerScale: c.headerScale, topLabelScale: c.topLabelScale, logoX: c.logoX, logoY: c.logoY, logoOpacity: c.logoOpacity,
        style: c.style, duotone: !!c.duotone, kickerStyle: c.kickerStyle, palette: Array.isArray(c.palette) ? c.palette : null,
        panels: cleanPanels(c.panels) ?? (Array.isArray(c.panels) ? [] : null), panelsRotate: !!c.panelsRotate, panelBg: isHex(c.panelBg) ? c.panelBg : null,
        tintColor: isHex(c.tintColor) ? c.tintColor : null, tintAmt: c.tintAmt, tintBlend: c.tintBlend,
        transFx: c.transFx, textFx: c.textFx, overlayFx: c.overlayFx, fxAmount: c.fxAmount, ovSpeed: c.ovSpeed, ovAlpha: c.ovAlpha, ovColor: isHex(c.ovColor) ? c.ovColor : null, fxSpeed: c.fxSpeed,
        kenBurns: c.kenBurns, sweep: c.sweep, font: c.font, titleScale: c.titleScale, textScale: c.textScale,
        beat: bt ? bt.p : null, kickerLine: c.kickerLine === false ? false : c.kickerLine === 'both' || c.kickerLine === 'mid' ? c.kickerLine : true, overlaySync: c.overlaySync !== false,
        beatFx: (c.beatExtras ?? []).filter((k) => k === 'step' || k === 'vig'), beatReframe: c.beatReframe !== false, beatPolish: c.beatPolish !== false, beatLevel: c.beatLevel || 1,
        beatEvery: (c.beatEvery ?? 0) >= 4 ? c.beatEvery : 8, beatStyle: bt ? this.beatStyle() : null, energyAdaptive: c.energyAdaptive !== false,
        energy: bt && bi && 'env' in bi && bi.env ? bi.env : null, energyRate: (bt && bi && 'envRate' in bi && bi.envRate) || 2, energyOff: bt ? this.audioOpts().offset : 0,
        beatPulse: c.beatPulse, beatText: c.beatText, beatNudge: (c.beatNudge || 0) / 1000,
      },
      slides: Rz.active.map((s) => this.sd(s)),
    })
  }

  /* ---------- spillehode og skrubbing ---------- */
  updPlayhead(loc: Loc | null, Rz: ReturnType<LoopController['resolved']>, live: boolean, scrub: boolean) {
    const strip = this.stripRef.current, tr = this.trackRef.current, fill = this.fillRef.current, head = this.headRef.current
    if (!strip || !tr || !fill || !head) return
    const all = Rz.all, cards = ([...strip.children] as HTMLElement[]).filter((el) => el !== tr).slice(0, all.length)
    if (!cards.length) { tr.style.width = '0px'; return }
    const last = cards[cards.length - 1]
    const endX = last ? last.offsetLeft + last.offsetWidth : 0
    let x = 0
    const useLoc = (live || scrub) && loc
    const cur = useLoc ? Rz.active[loc.i] : all.find((s) => s.id === this.state.selected)
    let T = 0
    const tot = Rz.active.reduce((a, s) => a + s.dur, 0)
    if (cur) {
      const idx = all.findIndex((s) => s.id === cur.id), el = cards[idx], d = Math.max(0.001, cur.dur || 1)
      const p = useLoc ? Math.max(0, Math.min(1, (loc.lt || 0) / d)) : 0
      if (el) x = el.offsetLeft + el.offsetWidth * p
      const ai = Rz.active.findIndex((a) => a.id === cur.id)
      T = ai >= 0 ? this.startOf(Rz.active, ai) + p * d : 0
    }
    this.layout = { cards, all }
    const tm = this.timeRef.current
    if (tm) {
      const f = (v: number) => { v = Math.max(0, Math.floor(v)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') }
      const txt = f(T) + ' / ' + f(tot)
      if (tm.textContent !== txt) tm.textContent = txt
    }
    const w = Math.round(endX) + 'px'
    if (tr.style.width !== w) tr.style.width = w
    fill.style.width = x.toFixed(1) + 'px'
    head.style.transform = 'translateX(' + x.toFixed(1) + 'px)'
    if (live && !this.scrub && performance.now() - this.stripTouch > 3000) {
      const vl = strip.scrollLeft, vr = vl + strip.clientWidth
      if (x < vl + 20 || x > vr - 40) {
        this.autoScrolling = true
        strip.scrollLeft = Math.max(0, x - strip.clientWidth * 0.25)
        requestAnimationFrame(() => { this.autoScrolling = false })
      }
    }
  }
  scrubAt(clientX: number): { T: number; id: string } | null {
    const tr = this.trackRef.current, L = this.layout, Rz = this.resolved()
    if (!tr || !L || !Rz.active.length) return null
    const x = clientX - tr.getBoundingClientRect().left
    let k = L.cards.findIndex((el) => x < el.offsetLeft + el.offsetWidth + 5)
    if (k < 0) k = L.cards.length - 1
    const el = L.cards[k]
    if (!el) return null
    let p = Math.max(0, Math.min(0.999, (x - el.offsetLeft) / el.offsetWidth))
    let ai = Rz.active.findIndex((a) => a.id === L.all[k]?.id)
    if (ai < 0) {
      for (let j = k + 1; j < L.all.length && ai < 0; j++) ai = Rz.active.findIndex((a) => a.id === L.all[j]?.id)
      if (ai < 0) ai = Rz.active.length - 1
      p = 0
    }
    const s = Rz.active[ai]
    return s ? { T: this.startOf(Rz.active, ai) + p * s.dur, id: s.id } : null
  }
  onScrubDown = (e: PEv) => {
    if (this.state.rec || (e.button ?? 0) > 0) return
    const h = this.scrubAt(e.clientX)
    if (!h) return
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId ?? 0) } catch { /* ingenting */ }
    this.scrub = { was: this.state.playing }
    this.hardStopAudio()
    this.setState({ playing: false, scrubT: h.T, selected: h.id })
  }
  onScrubMove = (e: PEv) => {
    if (!this.scrub) return
    const h = this.scrubAt(e.clientX)
    if (h && h.T !== this.state.scrubT) this.setState({ scrubT: h.T, selected: h.id })
  }
  onScrubUp = () => {
    if (!this.scrub) return
    const was = this.scrub.was
    this.scrub = null
    if (was && this.state.scrubT != null) { this.t0 = performance.now() - this.state.scrubT * 1000; this.setState({ playing: true, scrubT: null }) }
  }
  portrait() {
    return this.state.cfg.orient === 'port'
  }
  bgField(): 'bg' | 'bgPort' {
    return this.portrait() ? 'bgPort' : 'bg'
  }
  dims() {
    const d = this.state.cfg.res === '4k' ? { W: 3840, H: 2160 } : { W: 1920, H: 1080 }
    return this.portrait() ? { W: d.H, H: d.W } : d
  }
  fmtLabel() {
    const d = this.dims()
    return (this.portrait() ? '9:16' : '16:9') + ' · ' + d.W + '×' + d.H
  }
  /** Spiller bare den valgte sliden i loop, så en effekt kan prøves; endringer for alle slides spilles aldri av av seg selv. */
  testSlide(id: string | null) {
    if (!id || this.state.rec || this.state.playing) return
    this.tst0 = performance.now()
    this.setState({ tst: id, scrubT: null })
    this.pk = null
  }
  setOrient(o: string) {
    if ((this.state.cfg.orient || 'land') === o) return
    const K = ['logoX', 'logoY', 'headerX', 'headerY', 'topLabelX', 'topLabelY'] as const
    this.media.lastRects = null
    this.media.lastLogoRect = null
    this.setState((s) => {
      const alt = (asRec(s.cfg).altPos ?? {}) as Record<string, number | null>, cur: Record<string, number | null> = {}, cfg = asRec({ ...s.cfg, orient: o })
      K.forEach((k) => { cur[k] = s.cfg[k] ?? null; cfg[k] = alt[k] ?? null })
      cfg.altPos = cur
      const slides = s.slides.map((x) => {
        if (x.type !== 'contact') return x
        const a = asRec(x)
        return { ...x, qrX: (a.altQrX as number | null | undefined) ?? null, qrY: (a.altQrY as number | null | undefined) ?? null, altQrX: x.qrX ?? null, altQrY: x.qrY ?? null } as Slide
      })
      return { cfg: cfg as Cfg, slides }
    })
  }
  hold(s: { dur: number }) {
    return Math.max(0.1, Math.min(2.4, s.dur - 0.9))
  }
  startOf(list: { dur: number }[], i: number) {
    let a = 0
    for (let k = 0; k < i; k++) a += list[k]?.dur ?? 0
    return a
  }

  /* ---------- lyd og video på slidene ---------- */
  announcePlay() {
    try { if (this.bc && this.state.playing) this.bc.postMessage({ type: 'play', id: this.tabId }) } catch { /* ingenting */ }
  }
  hardStopAudio() {
    try { this.actl?.stop() } catch { /* ingenting */ }
    this.pauseVids()
  }
  pauseVids() {
    for (const [k, v] of Object.entries(this.media.vids)) {
      try { if (!v.paused) v.pause() } catch { /* ingenting */ }
      const g = this.vidGain[k]
      if (g && this.actx) g.gain.setTargetAtTime(0, this.actx.currentTime, 0.02)
    }
  }
  async ensureVid(key: string) {
    if (!key || this.media.vids[key] || this.loading[key]) return
    this.loading[key] = 1
    const b = await this.deps.media.get(key).catch(() => null)
    if (!b || !this.alive) return
    this.attachVid(key, b)
  }
  attachVid(key: string, blob: Blob) {
    const v = document.createElement('video')
    v.playsInline = true
    v.preload = 'auto'
    v.loop = false
    v.setAttribute('data-ukeloop-slide', key)
    hidden(v)
    v.src = URL.createObjectURL(blob)
    document.body.appendChild(v)
    try {
      if (this.actx && this.mix) {
        const src = this.actx.createMediaElementSource(v), g = this.actx.createGain()
        g.gain.value = 0
        src.connect(g)
        g.connect(this.mix)
        this.vidGain[key] = g
        v.muted = false
      } else v.muted = true
    } catch {
      v.muted = true
    }
    const inv = () => { this.pk = null }
    v.addEventListener('seeked', inv)
    v.addEventListener('loadeddata', inv)
    this.media.vids[key] = v
    this.pk = null
    return v
  }
  dropVid(key: string) {
    const v = this.media.vids[key]
    if (!v) return
    try { v.pause(); URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load(); v.remove() } catch { /* ingenting */ }
    try { this.vidGain[key]?.disconnect() } catch { /* ingenting */ }
    delete this.media.vids[key]
    delete this.vidGain[key]
    delete this.loading[key]
  }
  /** Video som ikke lenger brukes, frigjøres fra minnet (filen blir liggende i «Dine medier»). */
  gcVid(key: string | null | undefined) {
    if (!key?.startsWith('vid-')) return
    setTimeout(() => {
      if (this.state.slides.some((x) => x.vid === key)) return
      try { if (JSON.stringify(this.past.slice(-30)).includes(key)) return } catch { /* ingenting */ }
      this.dropVid(key)
    }, 1500)
  }
  curVidSlide(loc: Loc | null, data: LoopData) {
    const s = loc ? data.slides[loc.i] : null
    return s?.vid ? s : null
  }
  syncSlideVids(loc: Loc | null, live: boolean, data: LoopData) {
    const S = this.state, cs = this.curVidSlide(loc, data), ac = this.actx
    const sl = data.slides
    sl.forEach((x) => { if (x.vid && !this.media.vids[x.vid]) void this.ensureVid(x.vid) })
    /* neste videoslide stilles på første bilde like før den starter, så den starter uten hakk */
    let nextKey: string | null = null
    if (loc && live && sl.length > 1) {
      const cur = sl[loc.i], nx = sl[(loc.i + 1) % sl.length]
      if (nx?.vid && nx !== cur && cur && (cur.dur ?? 0) - loc.lt < 2) nextKey = nx.vid
    }
    /* bakgrunnsvideoen er helt dekket av en videoslide som spiller: den settes på pause for å spare dekoding */
    const csv = cs?.vid ? this.media.vids[cs.vid] : undefined
    const bg = this.media.video, cover = !!(cs && live && loc && loc.lt > 1 && loc.lt < (cs.dur || 0) - 1 && csv && csv.readyState >= 2)
    if (bg?.src) { if (cover && !bg.paused) bg.pause(); else if (!cover && bg.paused && live && !this.exporting) void bg.play().catch(() => undefined) }
    for (const [k, v] of Object.entries(this.media.vids)) {
      const g = this.vidGain[k], mine = cs?.vid === k
      if (!mine || !loc || (this.offscreen && !S.rec)) {
        if (!v.paused) v.pause()
        if (v.playbackRate !== 1) v.playbackRate = 1
        if (g && ac) g.gain.setTargetAtTime(0, ac.currentTime, 0.02)
        if (k === nextKey && !v.seeking && v.currentTime > 0.05) v.currentTime = 0
        continue
      }
      const d = v.duration || 0, tgt = Math.max(0, Math.min(d ? d - 0.04 : 0, loc.lt))
      if (live) {
        if (v.ended || v.paused) {
          if (d && tgt < d - 0.05) { if (!v.seeking && Math.abs(v.currentTime - tgt) > 0.25) v.currentTime = tgt; void v.play().catch(() => undefined) }
        } else {
          /* følger loop-klokken ved å justere farten; hopper bare når den er langt unna */
          const drift = v.currentTime - tgt
          if (Math.abs(drift) > 1.2 && !v.seeking) { v.currentTime = tgt; v.playbackRate = 1 }
          else { const r = Math.abs(drift) < 0.06 ? 1 : drift > 0 ? 0.95 : 1.05; if (v.playbackRate !== r) v.playbackRate = r }
        }
        const on = cs.vidSound !== false && (S.soundOn || !!S.rec)
        const gv = on ? (cs.vidVol == null ? 1 : cs.vidVol) : 0
        if (g && ac && Math.abs(g.gain.value - gv) > 0.001 && this.lastVg !== k + gv) { g.gain.setTargetAtTime(gv, ac.currentTime, 0.04); this.lastVg = k + gv }
      } else {
        this.lastVg = null
        if (v.playbackRate !== 1) v.playbackRate = 1
        if (!v.paused) v.pause()
        if (g && ac) g.gain.setTargetAtTime(0, ac.currentTime, 0.02)
        if (d && !v.seeking && Math.abs(v.currentTime - tgt) > 0.12) v.currentTime = tgt
      }
    }
  }
  musicDuck(loc: Loc | null, data: LoopData) {
    const cs = this.curVidSlide(loc, data)
    if (!cs || cs.vidMusic || !loc) return 1
    const lt = loc.lt, d = cs.dur || 1, r = (x: number) => Math.max(0, Math.min(1, x))
    return 1 - Math.min(r(lt / 0.5), r((d - lt) / 0.5))
  }
  loop = () => {
    if (!this.alive) { this.hardStopAudio(); return }
    this.raf = requestAnimationFrame(this.loop)
    this.lastLoop = performance.now()
    if (this.exporting) return
    const c = this.canvasRef.current
    this.syncState()
    if (!c) return
    const { W, H } = this.dims()
    const zo = this.zoomOuter.current
    if (!this.wheelOn && zo) {
      this.wheelOn = true
      zo.addEventListener('wheel', (ev) => {
        if (this.state.fs) return
        const r = zo.getBoundingClientRect()
        // felles regel for arbeidsflater (shared/lib/workspace-nav): loddrett rulling og knip zoomer rundt pekeren,
        // sidelengs rulling / Shift + hjul flytter sideveis når det er zoomet inn
        const act = wheelAction(ev, zo.clientHeight)
        if (act.kind === 'zoom') { ev.preventDefault(); const Z = this.state.zoom || { z: 1 }; this.setZoom(Z.z * act.f, ev.clientX - r.left, ev.clientY - r.top) }
        else if (act.kind === 'pan' && this.state.zoom) { ev.preventDefault(); this.panZoom(act.dx, act.dy) }
      }, { passive: false })
    }
    if (!this.roOn && window.ResizeObserver) {
      this.roOn = true
      this.ro = new ResizeObserver(() => { this.cboxCache = null; this.pk = null })
      this.ro.observe(c)
      if (c.parentElement) this.ro.observe(c.parentElement)
    }
    let k = 1
    if (!this.state.rec) {
      const B = this.cbox(c), dpr = Math.min(2, window.devicePixelRatio || 1)
      if (B.w > 0) k = Math.min(1, Math.max(0.3, Math.ceil(((B.w * dpr) / W) * 10) / 10))
      /* vignettdialogen viser et større bilde */
      const vw = this.state.vigEd && this.vigEdWrap.current ? this.vigEdWrap.current.clientWidth : 0
      if (vw > 0) k = Math.max(k, Math.min(1, Math.ceil(((vw * dpr) / W) * 10) / 10))
    }
    const BW = Math.round(W * k), BH = Math.round(H * k)
    if (c.width !== BW || c.height !== BH) { c.width = BW; c.height = BH; this.pk = null }
    const Rz = this.resolved(), live = this.state.playing || !!this.state.rec
    const base = this.payload()
    let data = base, t = 0
    if (!live && data.cfg.beat) data = { ...data, cfg: { ...data.cfg, beat: null } }
    if (live && data.cfg.beat && this.actx) {
      const lat = this.state.rec ? 0 : this.actx.outputLatency || this.actx.baseLatency || 0
      data = { ...data, cfg: { ...data.cfg, beatNudge: (data.cfg.beatNudge || 0) + this.alag + lat } }
    }
    const tst = !live && this.state.tst ? this.state.tst : null
    if (live) t = (performance.now() - this.t0) / 1000
    else if (tst) {
      const el = (performance.now() - this.tst0) / 1000, i = Rz.active.findIndex((s) => s.id === tst), cur = Rz.active[i]
      if (cur) { const st = this.startOf(Rz.active, i), pre = Math.min(0.8, st); t = st - pre + (el % (cur.dur + pre)) }
      else { const sel = Rz.all.find((s) => s.id === tst); if (sel) { data = { ...data, slides: [this.sd(sel)] }; t = el % (sel.dur || 5) } }
    } else if (this.state.scrubT != null && Rz.active.length) t = this.state.scrubT
    else {
      const i = Rz.active.findIndex((s) => s.id === this.state.selected), cur = Rz.active[i]
      if (cur) t = this.startOf(Rz.active, i) + this.hold(cur)
      else { const sel = Rz.all.find((s) => s.id === this.state.selected); if (sel) data = { ...data, slides: [this.sd(sel)] } }
    }
    const v = this.media.video
    const anim = live || !!tst || !!this.media.guides || !!(v?.src && v.readyState >= 2) || (!!data.cfg.overlayFx && data.cfg.overlayFx !== 'none') || data.slides.some((x) => x.ov?.overlayFx && x.ov.overlayFx !== 'none')
    let rc = 0
    for (const im of Object.values(this.media.images)) if (im.complete && im.naturalWidth) rc++
    const key = t + '|' + W + 'x' + H + '|' + rc + '|' + this.fontTick + '|' + this.state.selected, pk = this.pk
    let loc: Loc | null
    if (this.state.rec) this.media.guides = null
    if (!anim && pk && pk.base === base && pk.key === key) loc = pk.loc
    else {
      const ctx = c.getContext('2d')
      loc = ctx ? R.drawFrame(ctx, W, H, data, this.media, t) : null
      this.pk = anim ? null : { base, key, loc }
    }
    this.duck = this.musicDuck(loc, data)
    this.syncSlideVids(loc, live, data)
    this.syncAudio(loc, live, Rz)
    this.updPlayhead(loc, Rz, live, !live && this.state.scrubT != null && Rz.active.length > 0)
    this.updSelBox()
    for (const [open, pc] of [[!!this.state.ovEd, this.ovEdCanvas.current], [!!this.state.vigEd, this.vigEdCanvas.current]] as const) {
      if (!open || !pc || !c.width) continue
      if (pc.width !== c.width || pc.height !== c.height) { pc.width = c.width; pc.height = c.height }
      pc.getContext('2d')?.drawImage(c, 0, 0)
    }
    if (live && loc && loc.i !== this.state.playIdx) this.setState({ playIdx: loc.i })
    if (this.state.rec) this.tickRec()
  }
  ensureGraph() {
    if (this.actx?.state === 'suspended') void this.actx.resume().catch(() => undefined)
  }
  audioOpts(): AudioSyncOpts & { mode: string; offset: number; vol: number; fadeIn: number; fadeOut: number } {
    const c = asRec(this.state.cfg), cf = this.state.cfg
    const mode = cf.audioMode || (c.audioRestart === false ? 'free' : 'cut')
    const fit = mode === 'fit' || mode === 'beat', bt = mode === 'beat' ? this.beat() : null
    let offset = cf.audioOffset || 0
    if (bt) { const bar = 4 * bt.p; offset = bt.first + Math.round((offset - bt.first) / bar) * bar; while (offset < 0) offset += bar }
    return {
      mode, offset, vol: this.volLive != null ? this.volLive : cf.audioVol == null ? 0.8 : cf.audioVol,
      fadeIn: cf.audioFadeIn != null ? cf.audioFadeIn : fit ? 0.05 : 0.6, fadeOut: cf.audioFadeOut != null ? cf.audioFadeOut : fit ? 0.3 : 1.0,
    }
  }
  beat(): { bpm: number; p: number; first: number } | null {
    const S = this.state, b = S.beatInfo
    if (!b || !S.audioName) return null
    const bpm = S.cfg.bpm || b.bpm
    return { bpm, p: 60 / bpm, first: b.first }
  }
  genres() {
    return GENRES
  }
  applyGenre(k: string) {
    const all = GENRES, bi = this.state.beatInfo, useBeat = !!this.state.audioName
    let src: string | null = k
    if (k === 'auto') {
      const g = bi && 'genre' in bi ? bi.genre : null
      if (g && all[g]) src = g
      else { src = null; if (useBeat) this.autoPending = true }
    }
    const G = src ? all[src] : null
    this.setState((s) => ({ cfg: { ...s.cfg, genre: k, ...(G?.cfg ?? {}), ...(useBeat && s.cfg.audioMode !== 'beat' ? ({ audioMode: 'beat', audioFadeIn: null, audioFadeOut: null } as unknown as Cfg) : {}) } }))
    if (useBeat && this.state.cfg.audioMode !== 'beat') this.actl?.stop()
  }
  beatStyle() {
    const s = asRec(this.state.cfg).beatStyle, b = this.state.beatInfo
    return s === 'calm' || s === 'groove' ? s : (b && 'style' in b && b.style) || 'groove'
  }
  setFont(f: string) {
    this.setCfg('font', f)
    if (f !== 'Helvetica') try { ['400', '500', '600', '700'].forEach((w) => void document.fonts.load(w + ' 40px "' + f + '"').catch(() => undefined)) } catch { /* ingenting */ }
  }
  syncAudio(loc: Loc | null, live: boolean, Rz: ReturnType<LoopController['resolved']>) {
    const S = this.state, actl = this.actl
    if (!actl || !this.actx || !this.gSpeaker) return
    if (soundOwner && soundOwner.owner !== this) { try { actl.stop() } catch { /* ingenting */ } return }
    if (this.offscreen && !S.rec) { actl.stop(); return }
    const want = live && !!S.audioName && (S.soundOn || !!S.rec)
    const tt = loc ? this.startOf(Rz.active, loc.i) + loc.lt : 0
    const ao = this.audioOpts()
    if (this.duck < 1) ao.vol = ao.vol * this.duck
    actl.sync(want, tt, loc ? loc.total : 0, ao)
    const lg = want && ao.mode === 'beat' ? actl.lag(tt, ao.offset) : null
    if (lg != null && Math.abs(lg) < 0.3) this.alag = this.alag * 0.9 + lg * 0.1
    this.gSpeaker.gain.setTargetAtTime(S.soundOn ? 1 : 0, this.actx.currentTime, 0.03)
  }
  async loadAudioBlob(blob: Blob) {
    if (!this.actx || !this.actl) return
    try {
      const buf = await this.actx.decodeAudioData(await blob.arrayBuffer())
      this.actl.setBuffer(buf)
      this.audioBuf = buf
      if (this.alive) this.setState({ audioDur: buf.duration, beatInfo: null })
      setTimeout(() => {
        if (!this.alive) return
        let b: BeatInfo | null = null
        try { b = detectBeat(buf) } catch { /* ingen takt */ }
        this.setState({ beatInfo: b ?? { bpm: 120, first: 0, guess: true } }, () => {
          const g = this.state.cfg.genre || 'auto'
          if (b?.genre && (this.autoPending || (this.fresh && g === 'auto'))) this.applyGenre('auto')
          this.autoPending = false
          this.fresh = false
        })
      }, 60)
    } catch {
      if (this.alive) this.setState({ parseMsg: 'Klarte ikke å lese lydfilen. Prøv MP3 eller WAV.', parseOk: false })
    }
  }
  /** Lydsporet: lagres i «Dine medier» (bare på denne enheten) og i lydbiblioteket. */
  async useAudio(blob: Blob, name: string, refIn?: string) {
    this.ensureGraph()
    let ref = refIn ?? null
    if (!ref) {
      try { ref = await this.deps.media.put(blob, 'aud', name) } catch { this.deps.alert(this.t('Kunne ikke lagre lydfilen i nettleseren. Det kan være for lite lagringsplass.')); return }
    }
    this.audioRef = ref
    void this.libAdd(blob, name, ref)
    this.fresh = true
    this.setState((s) => ({ audioName: name, soundOn: true, cfg: { ...s.cfg, bpm: null } }))
    await this.loadAudioBlob(blob)
  }
  onAudioFile = async (e: FileEv) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !this.okFile(f, 'audio')) return
    await this.useAudio(f, f.name)
  }
  LIBK = 'ukeloop.audiolib.v1'
  libRead(): LibTrack[] {
    try {
      const l: unknown = JSON.parse(this.deps.kv.get(this.LIBK) || '[]')
      if (!Array.isArray(l)) return []
      const seen = new Set<string>()
      return (l as LibTrack[]).filter((t) => {
        if (!t || typeof t.id !== 'string' || typeof t.name !== 'string') return false
        const k = t.name + '|' + t.size
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    } catch {
      return []
    }
  }
  libWrite(l: LibTrack[]) {
    this.deps.kv.set(this.LIBK, JSON.stringify(l))
    if (this.alive) this.setState({ audioLib: l })
  }
  probeDur(blob: Blob): Promise<number> {
    return new Promise((res) => {
      let u: string | null = null, ok = false
      const done = (d: number) => {
        if (ok) return
        ok = true
        if (u) URL.revokeObjectURL(u)
        res(Number.isFinite(d) ? d : 0)
      }
      try {
        u = URL.createObjectURL(blob)
        const a = new Audio()
        a.preload = 'metadata'
        a.onloadedmetadata = () => done(a.duration)
        a.onerror = () => done(0)
        a.src = u
        setTimeout(() => done(0), 8000)
      } catch {
        done(0)
      }
    })
  }
  /** Lydbiblioteket: lyder brukeren har lastet opp, så det er lett å bytte. Referansen er `aud-<id>`. */
  async libAdd(blob: Blob, name: string, refIn?: string): Promise<string | null> {
    const hit = this.libRead().find((t) => t.name === name && t.size === blob.size)
    if (hit) return hit.id
    let id = refIn ?? null
    if (!id) {
      try { id = await this.deps.media.put(blob, 'aud', name) } catch { return null }
    }
    const dur = await this.probeDur(blob), l = this.libRead(), dup = l.find((t) => t.name === name && t.size === blob.size)
    if (dup) return dup.id
    l.unshift({ id, name, size: blob.size, dur, at: Date.now() })
    this.libWrite(l)
    return id
  }
  libUse = async (id: string) => {
    const t = this.libRead().find((x) => x.id === id)
    if (!t || t.name === this.state.audioName) return
    const b = await this.deps.media.get(id).catch(() => null)
    if (!b) { this.libWrite(this.libRead().filter((x) => x.id !== id)); return }
    await this.useAudio(b, t.name, id)
  }
  /** Fjerner lyden fra biblioteket (filen blir liggende i «Dine medier»). */
  libDel = (id: string) => {
    this.libWrite(this.libRead().filter((x) => x.id !== id))
  }
  onLibFiles = async (e: FileEv) => {
    const fs = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const f of fs) if (this.okFile(f, 'audio')) await this.libAdd(f, f.name)
  }
  removeAudio = () => {
    this.audioRef = null
    this.actl?.setBuffer(null)
    this.audioBuf = null
    this.setState({ audioName: '', audioDur: 0, beatInfo: null })
  }
  setAudioMode(m: string) {
    this.setState((s) => ({ cfg: { ...s.cfg, audioMode: m, ...({ audioFadeIn: null, audioFadeOut: null } as unknown as Cfg) } }))
    this.actl?.stop()
  }
  toggleSound = () => {
    this.ensureGraph()
    const next = !this.state.soundOn
    try { if (this.gSpeaker && this.actx) this.gSpeaker.gain.setTargetAtTime(next ? 1 : 0, this.actx.currentTime, 0.02) } catch { /* ingenting */ }
    this.setState({ soundOn: next })
  }
  select(id: string) {
    this.hardStopAudio()
    this.setState((st) => ({ selected: id, playing: false, scrubT: null, tab: 'slides', tst: st.tst === id ? st.tst : null }))
  }
  togglePlay = () => {
    if (this.state.rec) return
    if (this.state.tst) { this.setState({ tst: null }); if (!this.state.playing) return }
    this.ensureGraph()
    const Rz = this.resolved()
    if (this.state.playing) {
      this.hardStopAudio()
      const s = Rz.active[this.state.playIdx], tot = Rz.active.reduce((a, x) => a + x.dur, 0) || 1
      this.setState({ playing: false, selected: s ? s.id : this.state.selected, scrubT: ((((performance.now() - this.t0) / 1000) % tot) + tot) % tot })
    } else if (this.state.scrubT != null && Rz.active.length) {
      this.t0 = performance.now() - this.state.scrubT * 1000
      this.setState({ playing: true, scrubT: null }, () => this.announcePlay())
    } else {
      const i = Math.max(0, Rz.active.findIndex((s) => s.id === this.state.selected))
      this.t0 = performance.now() - Math.max(0, this.startOf(Rz.active, i) - 0.9) * 1000
      this.setState({ playing: true }, () => this.announcePlay())
    }
  }
  setCfg<K extends keyof Cfg>(k: K, v: Cfg[K] | null) {
    this.setState((s) => ({ cfg: { ...s.cfg, [k]: v }, tst: null }))
  }

  /* ---------- stilpakker og «Bygg» ---------- */
  presets() {
    return PRESETS
  }
  applyPreset(k: string) {
    const p = PRESETS[k]
    if (!p) return
    this.setState((s) => ({ cfg: { ...s.cfg, ...p.cfg, ...({ preset: k } as Cfg) } }), () => { if (p.cfg.font) this.setFont(p.cfg.font) })
  }
  addBuilt(kind: string, atEnd?: boolean) {
    const id = 'b-' + kind + '-' + Date.now().toString(36)
    const d = this.state.cfg.defDur || 5
    const T: Record<string, Slide> = {
      title: { id, type: 'outro', title: 'Stor overskrift', sub: 'Undertekst', bg: null, bgOpacity: 1, dur: d },
      text: { id, type: 'text', kicker: 'Overskrift', pill: '', body: 'Skriv teksten din her', sub: '', bg: null, bgOpacity: 1, dur: d },
      event: { id, type: 'text', kicker: 'Fredag', pill: 'Kl 19:00', body: 'Navn på arrangementet', sub: 'Sted', bg: null, bgOpacity: 1, dur: d },
      quote: { id, type: 'text', kicker: 'Dagens ord', pill: '', body: '«Skriv sitatet her»', sub: 'Kilde', bg: null, bgOpacity: 1, dur: d + 1 },
      qr: { id, type: 'contact', kicker: 'Følg oss', pill: '', headline: 'Skann koden', text: 'Eller besøk', email: 'nettside.no', phone: '', qrUrl: 'https://', bg: null, bgOpacity: 1, dur: d },
      image: { id, type: 'text', kicker: '', pill: '', body: '', sub: '', bg: null, bgOpacity: 1, dur: d },
    }
    const ns = T[kind]
    if (!ns) return
    this.setState((s) => {
      const i = atEnd ? -1 : s.slides.findIndex((x) => x.id === s.selected), at = i < 0 ? s.slides.length : i + 1
      return { slides: [...s.slides.slice(0, at), ns, ...s.slides.slice(at)], selected: id }
    }, () => { if (ns.type === 'contact') void this.waitQR() })
  }
  setF(id: string, field: string, val: unknown) {
    this.setState((s) => {
      const slides = s.slides.map((x) => {
        if (x.id !== id) return x
        const n = { ...x, [field]: val } as Slide
        if (field === 'qrUrl') n.qr = this.makeQR(String(val ?? ''))?.rows ?? null
        if (field === 'day') n.dayKey = keyOf(String(val ?? ''))
        return n
      })
      const upd: Partial<State> = { slides }, me = slides.find((x) => x.id === id)
      if (me?.type === 'day' && ['day', 'date', 'time', 'title', 'place'].includes(field)) upd.programText = serialize(slides.filter((x) => x.type === 'day'))
      return upd
    })
  }

  /* ---------- Disk (maks 10 lagrede looper) ---------- */
  diskList(): DiskEntry[] {
    return this.deps.repo.diskList()
  }
  autoDisk() {
    if (this.demo || !this.diskId || this.state.cfg.autoSave !== true) return
    const S = this.state, list = this.diskList(), i = list.findIndex((d) => d.id === this.diskId), cur = list[i]
    if (!cur) return
    const slides = S.slides.map((x) => { const { qr: _qr, ...rest } = x; return rest as Slide })
    list[i] = { ...cur, base: S.tpl || cur.base, savedAt: Date.now(), count: slides.filter((x) => !x.hidden).length, data: { programText: S.programText || '', slides, cfg: S.cfg } }
    void this.deps.repo.setDisk(list)
    const t = new Date()
    this.setState({ autoAt: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') })
  }
  /** Lagre på menighetens disk (ny, eller endring av versjonen som er åpnet). Video og lyd følger aldri med. */
  async saveToShared(asNew: boolean) {
    const sd = this.deps.sharedDisk, church = sd?.churchId()
    if (!sd || !church) { this.setState({ saveMsg: 'Menighetens disk er ikke tilgjengelig.' }); return }
    const S = this.state, name = String(S.saveName || '').trim().slice(0, 60) || this.customName || 'Min loop'
    const cur = asNew ? null : this.sharedEntry
    if (this.sharedSaving) return // dobbeltklikk skal ikke lage to looper
    this.sharedSaving = true
    this.setState({ saveMsg: 'Lagrer …' })
    try {
      const cloud = this.deps.cloud
      const data = await forSharedDisk({ programText: S.programText || '', slides: S.slides as unknown[], cfg: S.cfg as Record<string, unknown> }, async (ref) => {
        const b = cloud ? await this.deps.media.get(ref).catch(() => null) : null
        return b && cloud ? cloud.upload(await this.fitUpload(b, name + (/png/.test(b.type) ? '.png' : '.jpg')), 'bilder') : null
      }, this.sharedCache)
      const r = await sd.svc.save(church, { id: cur?.id ?? null, name, base: S.tpl || 'blank', data, version: cur?.version ?? null })
      this.sharedEntry = { id: r.id, version: r.version, name }
      this.customName = name
      const q: Record<string, string> = { ...this.deps.query, mal: S.tpl || 'blank', fdisk: r.id }
      delete q.disk
      delete q.id
      delete q.grunn
      delete q.demo
      this.deps.setQuery(q)
      clearTimeout(this.smT)
      this.smT = setTimeout(() => { if (this.alive) this.setState({ saveMsg: '' }) }, 3500)
      this.setState({ saveOpen: false, saveMsg: 'Lagret på menighetens disk som «' + name + '»' })
    } catch (e) {
      const code = e instanceof ServiceError ? e.code : ''
      this.setState({ saveMsg: code === 'settings_conflict' ? 'Loopen er endret av en annen i menigheten. Åpne den på nytt fra Loop Studio for å se endringene. Dine endringer er ikke lagret der.'
        : code === 'rate_limited' ? 'Menighetens disk er full (30). Be Admin slette en loop.' : 'Kunne ikke lagre på menighetens disk. Prøv igjen.' })
    } finally {
      this.sharedSaving = false
    }
  }
  saveToDisk(asNew: boolean) {
    if (this.state.saveTarget === 'f') { void this.saveToShared(asNew); return }
    const S = this.state, name = String(S.saveName || '').trim().slice(0, 60) || this.customName || 'Min loop'
    const list = this.diskList()
    const id = !asNew && this.diskId ? this.diskId : 'd-' + Math.random().toString(36).slice(2, 10)
    const slides = S.slides.map((x) => { const { qr: _qr, ...rest } = x; return rest as Slide })
    let i = list.findIndex((d) => d.id === id)
    const entry: DiskEntry = { id, name, base: S.tpl || 'blank', savedAt: Date.now(), fav: i >= 0 ? !!list[i]?.fav : false, count: slides.filter((x) => !x.hidden).length, data: { programText: S.programText || '', slides, cfg: S.cfg } }
    if (i < 0 && list.length >= 10) {
      const old = list.filter((d) => !d.fav && d.id !== this.diskId).sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0))[0]
      if (!old) { this.setState({ saveMsg: 'Disken er full, og alle 10 er favoritter. Fjern en stjerne eller slett en loop i Loop Studio.' }); return }
      let when = ''
      try { when = new Date(old.savedAt).toLocaleDateString(this.deps.lang() === 'en' ? 'en-GB' : 'nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { /* ingen dato */ }
      if (!this.deps.confirm(this.t('Disken er full (maks 10).') + '\n\n' + this.t('Vil du slette den eldste') + ', «' + (old.name || this.t('Uten navn')) + '»' + (when ? ' ' + this.t('fra') + ' ' + when : '') + ', ' + this.t('for å få plass?') + '\n\n' + this.t('Favoritter blir aldri slettet.'))) {
        this.setState({ saveMsg: 'Ikke lagret. Disken er full.' })
        return
      }
      list.splice(list.indexOf(old), 1)
      void this.deps.repo.removeWork(slotOf('', old.id))
      i = -1
    }
    if (i >= 0) list[i] = entry
    else list.unshift(entry)
    void this.deps.repo.setDisk(list).catch(() => this.setState({ saveMsg: 'Fikk ikke plass på Disk. Slett noen gamle looper og prøv igjen.' }))
    const was = this.customId
    this.diskId = id
    this.customId = id
    this.customName = name
    if (was !== id) this.saveNow()
    const q: Record<string, string> = { ...this.deps.query, mal: entry.base, disk: id }
    delete q.id
    delete q.grunn
    delete q.demo
    this.deps.setQuery(q)
    clearTimeout(this.smT)
    this.smT = setTimeout(() => { if (this.alive) this.setState({ saveMsg: '' }) }, 3500)
    this.setState({ saveOpen: false, saveMsg: 'Lagret som «' + name + '»' })
  }
  /** Bilder som ikke lenger brukes, blir liggende i «Dine medier» (dagens app slettet dem). */
  gcImg(_id: string | null | undefined) {
    // bevisst ingenting: «Dine medier» er felles for alle verktøy, og brukeren rydder der selv
  }

  /* ---------- ukeprogrammet ---------- */
  applyProgram = () => {
    if (!String(this.state.programText || '').trim()) {
      this.setState({ parseMsg: 'Skriv ukens program først (én linje per møte), eller trykk «Standard uke» for å hente menighetens standarduke.', parseOk: false })
      return
    }
    const p = parse(this.state.programText), n = p.days.reduce((a, d) => a + d.events.length, 0)
    if (!n) { this.setState({ parseMsg: 'Fant ingen møter. Skriv ukedag, tid og navn, for eksempel «Tirsdag kl 19:00 Kveldsmat i kafeen».', parseOk: false }); return }
    this.setState((s) => {
      const days = this.daySlides(p.days, s.slides)
      const wd = p.days.filter((d) => !d.extra), ex = p.days.filter((d) => d.extra).reduce((a, d) => a + d.events.length, 0), m = n - ex
      return {
        slides: mergeDaySlides(s.slides, days), playing: true, playIdx: 0, selected: days[0]?.id ?? s.selected,
        parseMsg: 'Fant ' + m + (m === 1 ? ' møte' : ' møter') + ' på ' + wd.length + (wd.length === 1 ? ' dag' : ' dager') + (ex ? ' og ' + ex + ' ekstra utenom uka' : '') + '. Videoen er oppdatert.', parseOk: true,
      }
    })
    this.t0 = performance.now()
  }
  addMeeting = () => {
    const a = this.state.addForm ?? {}, title = String(a.title || '').trim()
    if (!title) { this.setState({ parseMsg: 'Skriv inn navnet på møtet.', parseOk: false }); return }
    const time = a.time ? 'kl ' + a.time : '', date = String(a.date || '').trim(), place = String(a.place || '').trim()
    const line = (a.day ? a.day + ' ' : 'Ekstra: ') + [date, time, title].filter(Boolean).join(' ') + (place ? ' – ' + place : '')
    const txt = String(this.state.programText || '').replace(/\s+$/, '')
    this.setState({ programText: (txt ? txt + '\n' : '') + line, addForm: { day: a.day || '' } }, () => this.applyProgram())
  }
  /** Standarduken er menighetens eget, lagrede program (cfg.standard i det felles grunnoppsettet). */
  standardText() {
    return String(this.state.cfg.standard || '')
  }
  loadStandard = () => {
    const t = this.standardText().trim()
    if (!t) { this.setState({ parseMsg: 'Ingen standarduke er lagret ennå. Skriv ukens program og trykk «Lagre som standard uke».', parseOk: false }); return }
    this.setState({ programText: t, parseMsg: 'Standarduken er lagt inn. Endre eller legg til linjer, og trykk «Oppdater videoen».', parseOk: true })
  }
  saveStandard = () => {
    const t = String(this.state.programText || '').trim()
    if (!t) return
    this.setCfg('standard', t)
    this.setState({ parseMsg: 'Teksten er lagret som ny standarduke.', parseOk: true })
  }
  /** Flytter sliden til plass `to` (indeks uten sliden selv). Ukedag og innhold følger sliden, ingenting annet endres. */
  reorder(id: string, to: number) {
    this.setState((s) => {
      const a = moveSlideTo(s.slides, id, to)
      return a === s.slides ? { dropAt: null } : { slides: a, dropAt: null, selected: id, playing: false }
    })
  }
  private dragId: string | null = null
  /**
   * Dra-og-slipp med fingeren (HTML-dra virker ikke med berøring): hold på kortet (0,35 s), dra til ønsket plass og slipp.
   * Samme innsettingsmarkør og samme flytting som med mus. Beveger fingeren seg før det, rulles lista som vanlig.
   */
  private touchDrag(e: TouchDownEv, id: string) {
    const x0 = e.clientX, y0 = e.clientY
    const strip = (e.currentTarget as HTMLElement | null)?.parentElement ?? null
    let active = false
    const slotAt = (x: number) => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-loop-card]')]
      const i = cards.findIndex((c) => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2 })
      return i < 0 ? cards.length : i
    }
    const timer = window.setTimeout(() => {
      active = true
      this.dragId = id
      navigator.vibrate?.(12)
      this.setState({ dropAt: slotAt(x0) })
    }, 350)
    const move = (ev: TouchEvent) => {
      const t = ev.touches[0]
      if (!t) return
      if (!active) {
        if (Math.hypot(t.clientX - x0, t.clientY - y0) > 10) done(false)
        return
      }
      ev.preventDefault()
      // nær kanten av lista: rull den så man kan dra forbi det som vises
      if (strip) {
        const r = strip.getBoundingClientRect()
        if (t.clientX < r.left + 40) strip.scrollLeft -= 12
        else if (t.clientX > r.right - 40) strip.scrollLeft += 12
      }
      const slot = slotAt(t.clientX)
      if (this.state.dropAt !== slot) this.setState({ dropAt: slot })
    }
    const done = (drop: boolean) => {
      window.clearTimeout(timer)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', end)
      document.removeEventListener('touchcancel', cancel)
      document.removeEventListener('contextmenu', noMenu, true)
      if (!active) return
      active = false
      this.dragId = null
      const slot = this.state.dropAt, from = this.state.slides.findIndex((x) => x.id === id)
      if (drop && slot != null && from >= 0) this.reorder(id, slot - (from < slot ? 1 : 0))
      else this.setState({ dropAt: null })
    }
    const end = () => done(true)
    const cancel = () => done(false)
    // langt trykk skal ikke åpne nettleserens meny mens man drar
    const noMenu = (ev: Event) => { if (active || Date.now() - t0 < 1500) ev.preventDefault() }
    const t0 = Date.now()
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', end)
    document.addEventListener('touchcancel', cancel)
    document.addEventListener('contextmenu', noMenu, true)
  }
  move(id: string, dir: number) {
    this.setState((s) => {
      const a = [...s.slides], i = a.findIndex((x) => x.id === id), j = i + dir
      const x = a[i], y = a[j]
      if (i < 0 || !x || !y) return null
      a[i] = y
      a[j] = x
      return { slides: a }
    })
  }
  add(type: 'text' | 'contact' | 'outro') {
    const id = type + '-' + Date.now().toString(36)
    const T: Record<string, Partial<Slide>> = {
      text: { kicker: 'Info', pill: '', body: 'Skriv teksten her.', sub: '', bg: null, bgOpacity: 1 },
      contact: { kicker: 'Kontakt', pill: '', headline: 'Ta kontakt med oss', text: 'Skann koden eller send e-post til', email: 'post@kirken.no', phone: '', qrUrl: 'mailto:post@kirken.no', bg: null, bgOpacity: 0.5 },
      outro: { title: this.state.cfg.header || 'Ukentlige møter', sub: 'Alle er velkommen', bg: null, bgOpacity: 1 },
    }
    const ns: Slide = { id, type, ...T[type], dur: null, hidden: false }
    if (ns.qrUrl) ns.qr = this.makeQR(ns.qrUrl)?.rows ?? null
    this.setState((s) => {
      const a = [...s.slides], i = a.findIndex((x) => x.id === s.selected)
      a.splice(i < 0 ? a.length : i + 1, 0, ns)
      return { slides: a, selected: id, tab: 'slides', playing: false }
    })
  }
  duplicate(id: string) {
    this.setState((s) => {
      const a = [...s.slides], i = a.findIndex((x) => x.id === id), cur = a[i]
      if (!cur) return null
      const c = { ...cur, id: cur.id + '-k' + Date.now().toString(36) }
      a.splice(i + 1, 0, c)
      return cur.type === 'day' ? { slides: a, selected: c.id, programText: serialize(a.filter((x) => x.type === 'day')) } : { slides: a, selected: c.id }
    })
  }
  /** Handlingene i slidekortets meny: bare det Loop allerede kan gjøre med en slide (alt kan angres). */
  slideMenuItems(id: string): { label: string; keys?: string; disabled?: boolean; separator?: boolean; onSelect: () => void }[] {
    const all = this.state.slides, i = all.findIndex((x) => x.id === id), s = all[i]
    if (!s) return []
    const t = (x: string) => this.t(x)
    return [
      { label: t('Dupliser'), onSelect: () => this.duplicate(id) },
      { label: s.hidden ? t('Vis i loopen') : t('Skjul i loopen'), onSelect: () => this.setF(id, 'hidden', !s.hidden) },
      { label: t('Flytt til venstre'), keys: 'Alt+←', separator: true, disabled: i <= 0, onSelect: () => this.reorder(id, i - 1) },
      { label: t('Flytt til høyre'), keys: 'Alt+→', disabled: i >= all.length - 1, onSelect: () => this.reorder(id, i + 1) },
      { label: t('Flytt først'), keys: 'Alt+Home', disabled: i <= 0, onSelect: () => this.reorder(id, 0) },
      { label: t('Flytt sist'), keys: 'Alt+End', disabled: i >= all.length - 1, onSelect: () => this.reorder(id, all.length - 1) },
      { label: t('Fjern slide'), separator: true, onSelect: () => this.del(id) },
    ]
  }
  del(id: string) {
    const s = this.state, i = s.slides.findIndex((x) => x.id === id), cur = s.slides[i]
    if (!cur) return
    const a = s.slides.filter((x) => x.id !== id), nb = a[Math.min(i, a.length - 1)]
    const upd: Partial<State> = { slides: a, selected: nb ? nb.id : null }
    if (cur.type === 'day') upd.programText = serialize(a.filter((x) => x.type === 'day'))
    this.setState(upd)
    if (cur.vid) this.gcVid(cur.vid)
  }
  step(dir: number) {
    const all = this.state.slides
    if (!all.length) return
    const i = all.findIndex((x) => x.id === this.state.selected), nx = all[(i + dir + all.length) % all.length]
    if (nx) this.select(nx.id)
  }

  /* ---------- video og bilder på slidene ---------- */
  pickSlideVid = () => this.fileSlideVid.current?.click()
  vidLength(file: Blob): Promise<number | null> {
    return new Promise((res) => {
      const v = document.createElement('video'), u = URL.createObjectURL(file)
      let done = false
      const end = (d: number | null) => {
        if (done) return
        done = true
        URL.revokeObjectURL(u)
        res(d)
      }
      v.preload = 'metadata'
      v.muted = true
      v.onloadedmetadata = () => {
        if (Number.isFinite(v.duration)) { end(v.duration); return }
        /* WebM fra opptak (MediaRecorder) oppgir ikke lengden: hopp til slutten, så nettleseren finner den */
        v.ondurationchange = () => { if (Number.isFinite(v.duration)) end(v.duration) }
        v.currentTime = 1e101
      }
      v.onerror = () => end(-1)
      setTimeout(() => end(null), 10000)
      v.src = u
    })
  }
  onSlideVidFile = async (e: FileEv) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !this.okFile(f, 'video')) return
    const sid = this.state.selected
    if (!sid) return
    const len = await this.vidLength(f)
    if (len === -1) { this.deps.alert(this.t('Nettleseren kan ikke spille av denne videoen. Bruk MP4 (H.264) eller WebM.')); return }
    if (len == null) { this.deps.alert(this.t('Fant ikke lengden på videoen. Prøv en annen fil.')); return }
    if (len > 300.5) { this.deps.alert(this.t('Videoen er') + ' ' + fmtLen(len) + ' ' + this.t('lang. Maks lengde er 5 minutter.')); return }
    let key: string
    try { key = await this.deps.media.put(f, 'vid', f.name || 'video') } catch { this.deps.alert(this.t('Kunne ikke lagre videoen i nettleseren. Det kan være for lite lagringsplass.')); return }
    this.ensureGraph()
    if (!this.media.vids[key]) this.attachVid(key, f)
    const old = this.state.slides.find((x) => x.id === sid)?.vid
    this.setState((st) => ({ slides: st.slides.map((x) => (x.id === sid ? { ...x, vid: key, vidName: String(f.name || 'video').slice(0, 80), vidLen: Math.round(len * 100) / 100, vidSound: x.vid ? x.vidSound : true, vidMusic: x.vid ? x.vidMusic : false, vidVol: x.vid ? x.vidVol : 1 } : x)) }))
    if (old && old !== key) this.gcVid(old)
  }
  removeSlideVid = () => {
    const sid = this.state.selected, sl = this.state.slides.find((x) => x.id === sid)
    if (!sl?.vid) return
    const old = sl.vid
    this.setState((st) => ({
      slides: st.slides.map((x) => {
        if (x.id !== sid) return x
        const { vid: _v, vidName: _n, vidLen: _l, ...rest } = x
        return rest as Slide
      }),
    }))
    this.gcVid(old)
  }
  onImgFile = async (e: FileEv) => {
    let f: File | null = e.target.files?.[0] ?? null
    e.target.value = ''
    if (f && !this.okFile(f, 'image')) return
    if (f) { f = await this.cropImage(f, { aspect: this.portrait() ? '9:16' : '16:9', title: 'Beskjær bakgrunnsbildet' }); if (!f) return }
    if (f) { f = await this.shrinkImg(f, 5120); if (!f) return }
    if (!f) return
    const sid = this.state.selected
    if (!sid) return
    const id = await this.storeImage(f)
    if (!id) return
    const F = this.bgField()
    this.setF(sid, F, id)
    const me = this.state.slides.find((x) => x.id === sid)
    if (me?.ruleId && (this.state.cfg.imgRules ?? []).some((r) => r.id === me.ruleId)) this.setRules((rs) => rs.map((r) => (r.id === me.ruleId ? { ...r, [F]: id } : r)), true)
    else if (me?.type === 'day' && me.title) this.rememberTitle(me.title, id, F)
  }
  rememberTitle(title: string, bg: string | null, field?: 'bg' | 'bgPort') {
    const kw = String(title || '').trim()
    if (!kw) return
    const F = field || 'bg'
    this.setRules((rs) => {
      const i = rs.findIndex((x) => (x.kw ?? '').trim().toLowerCase() === kw.toLowerCase()), cur = rs[i]
      if (!bg) {
        if (!cur) return rs
        const o = { ...cur, [F]: null }
        return o.bg || o.bgPort ? rs.map((x, j) => (j === i ? o : x)) : rs.filter((_, j) => j !== i)
      }
      return cur ? rs.map((x, j) => (j === i ? { ...x, [F]: bg } : x)) : [...rs, { id: 'r-' + Date.now().toString(36), kw, [F]: bg }]
    }, !!bg)
  }

  /* ---------- forhåndsvisningen: treff, hjelpelinjer og dra ---------- */
  canvasPoint(e: { clientX: number; clientY: number }) {
    const c = this.canvasRef.current, { W, H } = this.dims()
    if (!c) return { x: 0, y: 0, W, H }
    const r = c.getBoundingClientRect()
    const scale = Math.min(r.width / W, r.height / H), ox = (r.width - W * scale) / 2, oy = (r.height - H * scale) / 2
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale, W, H }
  }
  hitAny(p: { x: number; y: number; W: number; H: number }): 'qr' | 'logo' | 'topLabel' | 'header' | null {
    const Rr = this.media.lastRects, pad = 16 * (Math.min(p.W, p.H) / 1080)
    for (const k of ['qr', 'logo', 'topLabel', 'header'] as const) {
      const r = Rr?.[k]
      if (r && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) return k
    }
    return null
  }
  hitLogo(p: { x: number; y: number; W: number; H: number }) {
    return this.hitAny(p) === 'logo'
  }
  snapTargets(self: SelEl | null): Box[] {
    const Rr = this.media.lastRects, out: Box[] = []
    if (!Rr) return out
    const same = (r: Box & { id?: string; field?: string; kind?: string; i?: number }, k: string) =>
      !!self && ((self.kind === k && ['logo', 'header', 'topLabel', 'qr'].includes(k)) || (self.kind === 'text' && k === 'text' && r.id === self.id && r.field === self.field) || (['pip', 'ftext', 'fqr'].includes(k) && r.kind === self.kind && r.id === self.id && r.i === self.i))
    for (const k of ['qr', 'logo', 'topLabel', 'header'] as const) { const r = Rr[k]; if (r && !same(r, k)) out.push(r) }
    for (const r of Rr.texts ?? []) if (!same(r, 'text')) out.push(r)
    for (const r of [...(Rr.pips ?? []), ...(Rr.fitems ?? [])]) if (!same(r, r.kind)) out.push(r)
    return out
  }
  snapBox(x: number, y: number, w: number, h: number, q: { W: number; H: number }, self: SelEl, off: boolean) {
    if (off) { this.media.guides = null; return { x, y } }
    const u = Math.min(q.W, q.H) / 1080, W = q.W, H = q.H, M = 95 * u
    const c = this.canvasRef.current, scale = c ? c.getBoundingClientRect().width / W : 1, thr = 8 / (scale || 1)
    const vx = [M, W / 2, W - M], hy = [M, H / 2, H - M, 150 * u, H - 150 * u]
    this.snapTargets(self).forEach((o) => { vx.push(o.x, o.x + o.w / 2, o.x + o.w); hy.push(o.y, o.y + o.h / 2, o.y + o.h) })
    const best = (edges: number[], T: number[]) => {
      let b: number | null = null
      edges.forEach((e) => T.forEach((t) => { const dd = t - e; if (Math.abs(dd) <= thr && (b == null || Math.abs(dd) < Math.abs(b))) b = dd }))
      return b as number | null
    }
    const bx = best([x, x + w / 2, x + w], vx), by = best([y, y + h / 2, y + h], hy)
    if (bx != null) x += bx
    if (by != null) y += by
    const guides: { t: 'v' | 'h'; v: number }[] = [], seen = new Set<string>()
    const mark = (t: 'v' | 'h', E: number[], T: number[]) => E.forEach((e) => T.forEach((v) => { if (Math.abs(v - e) <= 0.75 && !seen.has(t + Math.round(v))) { seen.add(t + Math.round(v)); guides.push({ t, v }) } }))
    mark('v', [x, x + w / 2, x + w], vx)
    mark('h', [y, y + h / 2, y + h], hy)
    this.media.guides = guides
    return { x, y }
  }
  snapDrag(d: { key: string; w: number; h: number; self?: SelEl | undefined }, ax: number, ay: number, q: { W: number; H: number }, off: boolean) {
    if (off) { this.media.guides = null; return { ax, ay } }
    const u = Math.min(q.W, q.H) / 1080, W = q.W, H = q.H, M = 95 * u
    const c = this.canvasRef.current, scale = c ? c.getBoundingClientRect().width / W : 1, thr = 7 / (scale || 1)
    const centred = d.key === 'logo' || d.key === 'qr' || d.key === 'pip'
    const toRect = (x: number, y: number) => (centred ? { x: x - d.w / 2, y: y - d.h / 2 } : d.key === 'header' ? { x, y: y - 4 * u } : { x: x - d.w, y: y - 4 * u })
    const vx = [M, W / 2, W - M], hy = [M, H / 2, H - M]
    this.snapTargets(d.self ?? { kind: d.key, id: null }).forEach((o) => { vx.push(o.x, o.x + o.w / 2, o.x + o.w); hy.push(o.y, o.y + o.h / 2, o.y + o.h) })
    /* lett magnet: trekker bare når det er svært nær, hjelpelinjene vises litt bredere */
    const snapThr = thr * 1.4
    const best = (edges: number[], targets: number[]) => {
      let b: number | null = null
      edges.forEach((e) => targets.forEach((t) => { const dd = t - e; if (Math.abs(dd) <= snapThr && (b == null || Math.abs(dd) < Math.abs(b))) b = dd }))
      return b as number | null
    }
    const r0 = toRect(ax, ay)
    const bx = best([r0.x, r0.x + d.w / 2, r0.x + d.w], vx), by = best([r0.y, r0.y + d.h / 2, r0.y + d.h], hy)
    if (bx != null) ax += bx
    if (by != null) ay += by
    const r = toRect(ax, ay), guides: { t: 'v' | 'h'; v: number }[] = [], seen = new Set<string>(), tol = 0.75
    const mark = (t: 'v' | 'h', edges: number[], targets: number[]) => edges.forEach((e) => targets.forEach((v) => { if (Math.abs(v - e) <= tol && !seen.has(t + Math.round(v))) { seen.add(t + Math.round(v)); guides.push({ t, v }) } }))
    mark('v', [r.x, r.x + d.w / 2, r.x + d.w], vx)
    mark('h', [r.y, r.y + d.h / 2, r.y + d.h], hy)
    this.media.guides = guides
    return { ax, ay }
  }
  applyFs(on: boolean) {
    const w = this.fsRef.current
    if (!w) return
    const st = on ? { position: 'fixed', inset: '0', zIndex: '9000', borderRadius: '0', border: 'none', width: '100vw', height: '100vh' } : { position: 'relative', inset: '', zIndex: '', borderRadius: '10px', border: '1px solid #262626', width: '', height: '' }
    Object.assign(w.style, st)
    document.body.style.overflow = on ? 'hidden' : ''
  }
  enterFs = () => {
    if (this.state.fs) return
    this.setState({ fs: true, selEl: null, zoom: null }, () => { this.cboxCache = null; this.applyFs(true); this.updSelBox() })
    const w = this.fsRef.current
    try { void w?.requestFullscreen?.().catch(() => undefined) } catch { /* ingenting */ }
  }
  exitFs = () => {
    if (!this.state.fs) return
    try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined) } catch { /* ingenting */ }
    this.setState({ fs: false }, () => { this.applyFs(false); this.updSelBox() })
  }
  selLabel(el: SelEl | null) {
    if (!el) return ''
    const T: Record<string, string> = { title: 'Tittel', body: 'Tekst', sub: 'Undertekst', kicker: 'Merkelapp', pill: 'Tid-merke', day: 'Dag og dato', time: 'Tid', place: 'Sted', headline: 'Overskrift', text: 'Tekst', email: 'E-post', phone: 'Telefon' }
    const K: Record<string, string> = { pip: 'Bilde', ftext: 'Fri tekst', fqr: 'QR-kode', logo: 'Logo', qr: 'QR-kode', header: 'Overskrift øverst', topLabel: 'Etikett øverst' }
    return el.kind === 'text' ? (T[el.field ?? ''] ?? 'Tekst') : (K[el.kind] ?? '')
  }
  selRect(el: SelEl | null): Box | null {
    const Rr = this.media.lastRects
    if (!el || !Rr) return null
    if (el.kind === 'text') return (Rr.texts ?? []).find((r) => r.id === el.id && r.field === el.field) ?? null
    if (el.kind === 'pip') return (Rr.pips ?? []).find((r) => r.id === el.id && r.i === el.i) ?? null
    if (el.kind === 'ftext' || el.kind === 'fqr') return (Rr.fitems ?? []).find((r) => r.kind === el.kind && r.id === el.id && (el.kind === 'fqr' || r.i === el.i)) ?? null
    if (el.kind === 'qr' || el.kind === 'logo' || el.kind === 'header' || el.kind === 'topLabel') return Rr[el.kind] ?? null
    return null
  }
  selGet(el: SelEl | null): number {
    const S = this.state, sl = el?.id ? S.slides.find((x) => x.id === el.id) : null
    if (!el) return 1
    if (el.kind === 'text') return sl?.tsc?.[el.field ?? ''] || 1
    if (el.kind === 'pip') return sl?.pips?.[el.i ?? 0]?.w || 0.3
    if (el.kind === 'ftext') return sl?.ftexts?.[el.i ?? 0]?.size || 1
    if (el.kind === 'fqr') return sl?.fqr?.size || 260
    if (el.kind === 'logo') return S.cfg.logoSize || 90
    if (el.kind === 'qr') return sl?.qrSize || 330
    if (el.kind === 'header') return S.cfg.headerScale || 1
    if (el.kind === 'topLabel') return S.cfg.topLabelScale || 1
    return 1
  }
  selSet(el: SelEl, v: number) {
    const c = (lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const onSlide = (fn: (x: Slide) => Slide) => this.setState((st) => ({ slides: st.slides.map((x) => (x.id === el.id ? fn(x) : x)) }))
    if (el.kind === 'text') {
      const k = Math.round(c(0.3, 4) * 100) / 100, f = el.field ?? ''
      onSlide((x) => { const t = { ...(x.tsc ?? {}) }; if (Math.abs(k - 1) < 0.01) delete t[f]; else t[f] = k; return { ...x, tsc: Object.keys(t).length ? t : null } })
    } else if (el.kind === 'pip') { const k = Math.round(c(0.03, 1.5) * 1000) / 1000; onSlide((x) => ({ ...x, pips: (x.pips ?? []).map((p, j) => (j === el.i ? { ...p, w: k } : p)) })) }
    else if (el.kind === 'ftext') { const k = Math.round(c(0.2, 8) * 100) / 100; onSlide((x) => ({ ...x, ftexts: (x.ftexts ?? []).map((t, j) => (j === el.i ? { ...t, size: k } : t)) })) }
    else if (el.kind === 'fqr') { const k = Math.round(c(60, 1000)); onSlide((x) => ({ ...x, fqr: { ...(x.fqr ?? {}), size: k } })) }
    else if (el.kind === 'logo') this.setCfg('logoSize', Math.round(c(20, 500)))
    else if (el.kind === 'qr') onSlide((x) => ({ ...x, qrSize: Math.round(c(120, 800)) }))
    else if (el.kind === 'header') this.setCfg('headerScale', Math.round(c(0.3, 4) * 100) / 100)
    else if (el.kind === 'topLabel') this.setCfg('topLabelScale', Math.round(c(0.3, 4) * 100) / 100)
  }
  selDefault(el: SelEl) {
    return el.kind === 'pip' ? 0.3 : el.kind === 'logo' ? 90 : el.kind === 'qr' ? 330 : el.kind === 'fqr' ? 260 : 1
  }
  guideGeo(port: boolean) {
    const W0 = 1618, H0 = 1000
    let x = 0, y = 0, w = W0, h = H0
    const sq: [number, number, number][] = [], labels: { cx: number; cy: number; n: number; size: number }[] = []
    const fib = [89, 55, 34, 21, 13, 8, 5, 3, 2, 1, 1]
    let d = 'M0 ' + H0
    for (let k = 0; k < 11; k++) {
      const st = k % 4
      let s0: number
      if (st === 0) { s0 = h; sq.push([x, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + s0) + ' ' + y; x += s0; w -= s0 }
      else if (st === 1) { s0 = w; sq.push([x, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + s0) + ' ' + (y + s0); y += s0; h -= s0 }
      else if (st === 2) { s0 = h; sq.push([x + w - s0, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + w - s0) + ' ' + (y + s0); w -= s0 }
      else { s0 = w; sq.push([x, y + h - s0, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + x + ' ' + (y + h - s0); h -= s0 }
      if (s0 < 2) break
    }
    const sqPath = sq.map(([a, b, c]) => 'M' + a + ' ' + b + 'h' + c + 'v' + c + 'h' + -c + 'Z').join(' ')
    sq.slice(0, 7).forEach(([a, b, c], i) => labels.push({ cx: a + c / 2, cy: b + c / 2, n: fib[i] ?? 1, size: c }))
    return { spiral: d, squares: sqPath, labels, vb: port ? '0 0 1000 1618' : '0 0 1618 1000' }
  }
  guideTransform(port: boolean, flip: number) {
    const fx = flip & 1, fy = flip & 2
    let t = port ? 'matrix(0 1 1 0 0 0) ' : ''
    if (fx) t += 'translate(1618 0) scale(-1 1) '
    if (fy) t += 'translate(0 1000) scale(1 -1) '
    return t.trim() || 'translate(0 0)'
  }
  private frameIn(c: HTMLCanvasElement) {
    const { W, H } = this.dims(), B0 = this.cbox(c)
    const sc = Math.min(B0.w / W, B0.h / H), ox = B0.dx + (B0.w - W * sc) / 2, oy = B0.dy + (B0.h - H * sc) / 2
    return { W, H, sc, ox, oy, pw: B0.pw, ph: B0.ph }
  }
  updGuideBox() {
    const g = this.guideRef.current
    if (!g) return
    const mode = this.state.guideMode || 'none', c = this.canvasRef.current
    if (mode === 'none' || !c) { if (g.style.display !== 'none') g.style.display = 'none'; return }
    const F = this.frameIn(c)
    const L = F.ox.toFixed(1) + 'px', T = F.oy.toFixed(1) + 'px', Wp = (F.W * F.sc).toFixed(1) + 'px', Hp = (F.H * F.sc).toFixed(1) + 'px'
    if (g.style.display !== 'block') g.style.display = 'block'
    if (g.style.left !== L) g.style.left = L
    if (g.style.top !== T) g.style.top = T
    if (g.style.width !== Wp) g.style.width = Wp
    if (g.style.height !== Hp) g.style.height = Hp
  }
  cbox(cIn?: HTMLCanvasElement | null) {
    if (this.cboxCache) return this.cboxCache
    const c = cIn ?? this.canvasRef.current
    if (!c?.parentElement) return { w: 0, h: 0, dx: 0, dy: 0, pw: 0, ph: 0 }
    const cr = c.getBoundingClientRect(), wr = c.parentElement.getBoundingClientRect(), z = this.state.zoom?.z || 1
    return (this.cboxCache = { w: cr.width / z, h: cr.height / z, dx: (cr.left - wr.left) / z, dy: (cr.top - wr.top) / z, pw: wr.width / z, ph: wr.height / z })
  }
  setZoom(zIn: number, pxIn?: number, pyIn?: number) {
    const o = this.zoomOuter.current, Z = this.state.zoom || { z: 1, x: 0, y: 0 }
    if (!o) return
    const z = Math.max(1, Math.min(6, Math.round(zIn * 100) / 100))
    const W = o.clientWidth, H = o.clientHeight, px = pxIn ?? W / 2, py = pyIn ?? H / 2
    let x = px - (px - Z.x) * (z / Z.z), y = py - (py - Z.y) * (z / Z.z)
    x = Math.min(0, Math.max(W - W * z, x))
    y = Math.min(0, Math.max(H - H * z, y))
    this.cboxCache = null
    this.setState({ zoom: z === 1 ? null : { z, x, y } })
  }
  panZoom(dx: number, dy: number) {
    const o = this.zoomOuter.current, Z = this.state.zoom
    if (!o || !Z) return
    const W = o.clientWidth, H = o.clientHeight
    const x = Math.min(0, Math.max(W - W * Z.z, Z.x - dx)), y = Math.min(0, Math.max(H - H * Z.z, Z.y - dy))
    this.cboxCache = null
    this.setState({ zoom: { ...Z, x, y } })
  }
  updSelBox() {
    this.updGuideBox()
    const box = this.selBoxRef.current
    if (!box) return
    const el = this.state.selEl, r = el && !this.state.inlineEd ? this.selRect(el) : null, c = this.canvasRef.current
    if (!r || !c) { if (box.style.display !== 'none') box.style.display = 'none'; return }
    const F = this.frameIn(c), pad = 6
    const L = F.ox + r.x * F.sc - pad, T = F.oy + r.y * F.sc - pad
    box.style.display = 'block'
    box.style.left = L.toFixed(1) + 'px'
    box.style.top = T.toFixed(1) + 'px'
    box.style.width = (r.w * F.sc + pad * 2).toFixed(1) + 'px'
    box.style.height = (r.h * F.sc + pad * 2).toFixed(1) + 'px'
    const chip = box.querySelector<HTMLElement>('[data-sel-chip]')
    if (chip) {
      const below = T < 40
      chip.style.bottom = below ? 'auto' : '100%'
      chip.style.top = below ? '100%' : 'auto'
      chip.style.marginTop = below ? '10px' : '0'
      chip.style.marginBottom = below ? '0' : '10px'
    }
  }
  onHandleDown = (e: PEv) => {
    const el = this.state.selEl, r = this.selRect(el)
    if (!el || !r) return
    e.preventDefault(); e.stopPropagation()
    const p0 = this.canvasPoint(e), cx = r.x + r.w / 2, cy = r.y + r.h / 2, d0 = Math.max(6, Math.hypot(p0.x - cx, p0.y - cy)), v0 = this.selGet(el)
    this.hardStopAudio()
    if (this.state.playing) this.setState({ playing: false })
    const move = (ev: PointerEvent) => { const q = this.canvasPoint(ev); this.selSet(el, v0 * (Math.hypot(q.x - cx, q.y - cy) / d0)) }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  }
  hitPip(p: { x: number; y: number; W: number; H: number }) {
    const P = [...(this.media.lastRects?.pips ?? []), ...(this.media.lastRects?.fitems ?? [])], pad = (6 * Math.min(p.W, p.H)) / 1080
    for (let k = P.length - 1; k >= 0; k--) { const r = P[k]; if (r && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) return r }
    return null
  }
  /** Sliden «Legg til på sliden» gjelder: den valgte hvis den finnes. Ellers en forklaring i stedet for en stille feil. */
  addTarget(): string | null {
    const S = this.state
    if (S.selected && S.slides.some((x) => x.id === S.selected)) return S.selected
    this.deps.alert(this.t(S.slides.length ? 'Velg en slide først.' : 'Legg til en slide først.'))
    return null
  }
  addPipFor(id: string | null, i: number | null) {
    this.pipTarget = { id, i }
    this.filePip.current?.click()
  }
  onPipFile = async (e: FileEv) => {
    let f: File | null = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!f || !this.okFile(f, 'image')) return
    f = await this.cropImage(f, { aspect: 'free', title: 'Beskjær bildet' })
    if (!f) return
    f = await this.shrinkImg(f, 3000)
    if (!f) return
    const tg = this.pipTarget || { id: this.state.selected, i: null }
    const tid = tg.id
    if (!tid) return
    // sliden kan ha forsvunnet mens bildet ble valgt og beskåret (angre, nytt program): si fra i stedet for å forkaste stille
    if (!this.state.slides.some((x) => x.id === tid)) { this.deps.alert(this.t('Sliden finnes ikke lenger. Velg en slide og prøv igjen.')); return }
    const id = await this.storeImage(f)
    if (!id) return
    let idx = tg.i
    this.setState((st) => ({
      slides: st.slides.map((x) => {
        if (x.id !== tid) return x
        const list = [...(x.pips ?? [])], cur = idx != null ? list[idx] : undefined
        if (idx != null && cur) list[idx] = { ...cur, src: id }
        else { if (list.length >= 8) return x; idx = list.length; list.push({ src: id, x: 0.7, y: 0.4, w: 0.3, r: 18, op: 1, shadow: true, border: false }) }
        return { ...x, pips: list }
      }),
      playing: false, selected: tid,
    }), () => { this.setState({ selEl: { kind: 'pip', id: tid, i: idx ?? 0 } }) })
    this.hardStopAudio()
  }
  addFtext() {
    const id = this.addTarget()
    if (!id) return
    const sl = this.state.slides.find((x) => x.id === id), i = (sl?.ftexts ?? []).length
    if (i >= 12) return
    this.hardStopAudio()
    this.setState((st) => ({ playing: false, scrubT: null, slides: st.slides.map((x) => (x.id === id ? { ...x, ftexts: [...(x.ftexts ?? []), { text: 'Skriv tekst her', x: 0.5, y: 0.3 + (i % 4) * 0.08, size: 1, color: '#ffffff', bold: true }] } : x)), selEl: { kind: 'ftext', id, i } }))
  }
  addFqr() {
    const id = this.addTarget()
    if (!id) return
    const sl = this.state.slides.find((x) => x.id === id)
    this.hardStopAudio()
    this.setState((st) => ({ playing: false, scrubT: null, slides: sl?.fqr ? st.slides : st.slides.map((x) => (x.id === id ? { ...x, fqr: { url: '', x: 0.82, y: 0.42, size: 260, caption: 'Skann meg', contact: '' } } : x)), selEl: { kind: 'fqr', id, i: 0 } }))
  }
  removeFtext(id: string, i: number) {
    this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, ftexts: (x.ftexts ?? []).filter((_, j) => j !== i) } : x)), selEl: null }))
  }
  removeFqr(id: string) {
    this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, fqr: null } : x)), selEl: null }))
  }
  removePip(id: string, i: number) {
    this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, pips: (x.pips ?? []).filter((_, j) => j !== i) } : x)), selEl: st.selEl?.kind === 'pip' && st.selEl.id === id ? null : st.selEl }))
  }
  SCALE_U = [{ u: '%', k: 100 }, { u: '×', k: 1, d: 2, t: 'faktor' }]
  FTEXT_U = [{ u: '%', k: 100 }, { u: 'px', k: 56, t: 'ved 1080p' }, { u: '×', k: 1, d: 2, t: 'faktor' }]
  /** Tallfelt med klikkbar enhet; units: [{u, k: visning per grunnverdi, d: desimaler, t: forklaring}]. */
  numF(key: string, base: number, units: { u: string; k: number; d?: number; t?: string }[], set: (v: number) => void, lim: [number, number]) {
    let pref = this.up
    if (!pref) {
      try { pref = (JSON.parse(this.deps.kv.get('medialab.units') || '{}') as Record<string, string> | null) ?? {} } catch { pref = {} }
      this.up = pref
    }
    const P = pref
    const ui = Math.max(0, units.findIndex((x) => x.u === P[key])), U = units[ui] ?? { u: '%', k: 100 }
    const shown = String(+(Number(base) * U.k).toFixed(U.d == null ? 0 : U.d)).replace('.', this.deps.lang() === 'en' ? '.' : ',')
    const ed = this.state.numEd?.k === key ? this.state.numEd.t : null
    const apply = (n: number) => set(Math.max(lim[0], Math.min(lim[1], n / U.k)))
    const commit = (t: string) => { const n = parseFloat(String(t).replace(',', '.')); this.setState({ numEd: null }); if (Number.isFinite(n)) apply(n) }
    return {
      numVal: ed ?? shown, unit: U.u,
      unitTitle: this.t('Trykk for å bytte enhet') + ': ' + units.map((x) => x.u + (x.t ? ' (' + this.t(x.t) + ')' : '')).join(' / '),
      onNum: (e: InputEv) => this.setState({ numEd: { k: key, t: e.target.value.slice(0, 12) } }),
      onNumFocus: (e: { target: { select(): void } }) => { try { e.target.select() } catch { /* ingenting */ } },
      onNumBlur: (e: InputEv) => { if (this.state.numEd?.k === key) commit(e.target.value) },
      onNumKey: (e: KeyEv & { target: EventTarget | null }) => {
        e.stopPropagation()
        const t = e.target as HTMLInputElement
        if (e.key === 'Enter') { e.preventDefault(); t.blur() }
        else if (e.key === 'Escape') this.setState({ numEd: null })
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const cur = parseFloat(String(t.value).replace(',', '.')), stp = (e.shiftKey ? 10 : 1) * (U.d ? 0.05 : U.u === '%' ? 5 : 1)
          if (Number.isFinite(cur)) { this.setState({ numEd: null }); apply(cur + (e.key === 'ArrowUp' ? stp : -stp)) }
        }
      },
      cycleUnit: () => {
        P[key] = units[(ui + 1) % units.length]?.u ?? '%'
        this.deps.kv.set('medialab.units', JSON.stringify(P))
        this.setState({ numEd: null })
      },
    }
  }
  /**
   * Tallet ved en glidebryter kan klikkes (eller fokuseres og Enter/F2) og skrives inn, som NumField i de andre appene.
   * Visningen i EditorView er generert, så tallene merkes her: hver glidebryter får sitt tall merket med data-num-edit
   * (stiplet understrek, tabulatorstopp, rolle «button» og navn). Pil opp/ned på tallet endrer med ett steg (Shift: ti).
   * Enter godtar, Escape forkaster; tekst som ikke er et tall gir en beskjed (Enter) eller siste gyldige verdi (klikk
   * utenfor). Verdien sendes til glidebryteren, så slider og tall alltid viser det samme.
   */
  setupNumEdit() {
    // tall med enhet, ev. med en forklaring i parentes («5 s (standard)»)
    const NUM = /^\s*([-+−]?\d+(?:[.,]\d+)?)\s*([a-zæøå%°×/]{0,4})\s*(?:\([^)]*\))?\s*$/i
    /** Glidebryteren som hører til et tall: nærmeste forelder med nøyaktig én glidebryter. */
    const rangeFor = (el: Element) => {
      let n: Element | null = el
      for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
        const rs = n.querySelectorAll('input[type=range]')
        if (rs.length === 1) return rs[0] as HTMLInputElement
        if (rs.length > 1) return null
      }
      return null
    }
    const labelOf = (range: HTMLInputElement, box: Element, hit: Element) => {
      const a = range.getAttribute('aria-label')
      if (a) return a
      // første tekst i boksen som ikke er selve tallet
      for (const el of box.querySelectorAll('span,b,strong,label,div')) {
        if (el === hit || el.children.length || el.contains(hit)) continue
        const t = (el.textContent || '').trim()
        if (t && !NUM.test(t)) return t.slice(0, 40)
      }
      return this.t('Verdi')
    }
    const mark = () => {
      const root = document.querySelector('[data-loop-editor]')
      if (!root) return
      for (const range of root.querySelectorAll<HTMLInputElement>('input[type=range]')) {
        // tallet: siste blad-element med bare et tall før glidebryteren, i nærmeste boks med kun denne glidebryteren
        let box: Element | null = range.parentElement
        let hit = null as HTMLElement | null
        for (let i = 0; i < 3 && box && !hit; i++) {
          if (box.querySelectorAll('input[type=range]').length !== 1) break
          for (const el of box.querySelectorAll<HTMLElement>('span,output,b,div')) {
            if (el.children.length || !NUM.test(el.textContent || '')) continue
            if (el.compareDocumentPosition(range) & Node.DOCUMENT_POSITION_FOLLOWING || !hit) hit = el
          }
          if (!hit) box = box.parentElement
        }
        if (!hit || !box) continue
        // tallet og enheten står ofte i hvert sitt tekststykke («5» + « %»): merk hele «5 %»
        for (let p = hit.parentElement; p && p !== box && NUM.test(p.textContent || '') && !p.querySelector('input,button,select'); p = p.parentElement) hit = p
        const on = !range.disabled
        if (hit.dataset.numEdit === undefined) {
          hit.dataset.numEdit = ''
          hit.setAttribute('role', 'button')
        }
        if (hit.tabIndex !== (on ? 0 : -1)) hit.tabIndex = on ? 0 : -1
        if (hit.getAttribute('aria-disabled') !== String(!on)) hit.setAttribute('aria-disabled', String(!on))
        const name = labelOf(range, box, hit) + ': ' + (hit.textContent || '').trim()
        if (hit.getAttribute('aria-label') !== name) hit.setAttribute('aria-label', name)
        if (!hit.title) hit.title = this.t('Klikk for å skrive inn verdien (pil opp/ned endrer, Shift: ti steg)')
      }
    }
    // Merkingen kjøres når paneler byttes (nye elementer), og når pekeren eller fokus kommer inn i editoren (da er
    // navnet med verdien oppdatert). Ikke ved hver tekstendring: forhåndsvisningen endrer tid og tellere hele tiden.
    let timer: ReturnType<typeof setTimeout> | 0 = 0
    const soon = () => {
      if (!timer) timer = setTimeout(() => { timer = 0; mark() }, 200)
    }
    const mo = new MutationObserver(soon)
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] })
    this.listeners.push(() => { mo.disconnect(); if (timer) clearTimeout(timer) })
    this.on(document, 'focusin', (e) => { if ((e.target as Element | null)?.closest?.('[data-loop-editor]')) mark() })
    this.on(document, 'pointerover', (e) => { if ((e.target as Element | null)?.closest?.('[data-num-edit]')) mark() })
    this.on(document, 'keydown', (e) => { if (e.key === 'Tab') mark() }, true)
    requestAnimationFrame(mark)

    const setRange = (range: HTMLInputElement, v: number) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(range, String(v))
      range.dispatchEvent(new Event('input', { bubbles: true }))
      range.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const parse = (t: string) => {
      const m = t.replace(/−/g, '-').match(NUM)
      const n = m?.[1] ? parseFloat(m[1].replace(',', '.')) : NaN
      return Number.isFinite(n) ? n : null
    }
    /** Faktor mellom glidebryterens verdi og tallet som vises (f.eks. 0,5 → «50 %»). */
    const factor = (span: Element, range: HTMLInputElement) => {
      const shown = parse(span.textContent || ''), cur = parseFloat(range.value), max = parseFloat(range.max || '100')
      if (shown && cur) return 10 ** Math.round(Math.log10(Math.abs(shown / cur)))
      return max <= 1 && /%/.test(span.textContent || '') ? 100 : 1
    }
    const stepOf = (range: HTMLInputElement, e: KeyboardEvent) => (e.shiftKey ? 10 : 1) * (parseFloat(range.step || '1') || 1) * (e.key === 'ArrowUp' ? 1 : -1)
    const open = (span: HTMLElement) => {
      const range = rangeFor(span)
      if (!range || range.disabled) return
      const m = (span.textContent || '').replace(/−/g, '-').match(NUM)
      if (!m?.[1]) return
      const k = factor(span, range), min = parseFloat(range.min || '0'), max = parseFloat(range.max || '100')
      const clamp = (v: number) => Math.max(min, Math.min(max, v))
      const r = span.getBoundingClientRect()
      const inp = document.createElement('input')
      const msg = document.createElement('div')
      inp.type = 'text'
      inp.inputMode = 'decimal'
      inp.value = m[1]
      inp.setAttribute('aria-label', span.getAttribute('aria-label')?.split(':')[0] || this.t('Skriv inn verdi'))
      inp.dataset.numInput = ''
      const left = Math.max(4, Math.min(innerWidth - 80, r.right - 72))
      inp.style.cssText = 'position:fixed;z-index:9999;left:' + left + 'px;top:' + (r.top + r.height / 2 - 15) + 'px;width:72px;height:30px;padding:0 8px;border:1.5px solid #e9e7e2;border-radius:8px;background:#000;color:#fff;font:600 13px Archivo,Helvetica,Arial,sans-serif;text-align:right;outline:2px solid #f3f1ec;outline-offset:1px;box-shadow:0 6px 20px rgba(0,0,0,.6)'
      msg.id = 'ml-num-msg'
      msg.setAttribute('role', 'alert')
      msg.style.cssText = 'position:fixed;z-index:9999;left:' + Math.max(4, left - 168) + 'px;top:' + (r.top + r.height / 2 + 19) + 'px;width:240px;padding:4px 8px;border-radius:6px;background:#2a1414;color:#ff8a8a;font:500 12px Archivo,Helvetica,Arial,sans-serif'
      const fmt = (n: number) => String(+(n * k).toFixed(4)).replace('.', this.deps.lang() === 'en' ? '.' : ',')
      const ok = () => {
        msg.remove()
        inp.removeAttribute('aria-invalid')
        inp.removeAttribute('aria-describedby')
        inp.style.borderColor = '#e9e7e2'
      }
      let done = false
      const finish = (accept: boolean) => {
        if (done) return true
        if (accept) {
          const raw = parse(inp.value)
          if (raw == null) {
            msg.textContent = this.t('Skriv et tall ({a}–{b}). Escape avbryter.').replace('{a}', fmt(min)).replace('{b}', fmt(max))
            inp.setAttribute('aria-invalid', 'true')
            inp.setAttribute('aria-describedby', msg.id)
            inp.style.borderColor = '#ff8a8a'
            if (!msg.isConnected) document.body.appendChild(msg)
            return false
          }
          setRange(range, clamp(raw / k))
        }
        done = true
        inp.remove()
        msg.remove()
        if (span.isConnected) span.focus()
        return true
      }
      inp.addEventListener('keydown', (ev) => {
        ev.stopPropagation()
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true) }
        else if (ev.key === 'Escape') { ev.preventDefault(); finish(false) }
        else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
          ev.preventDefault()
          const cur = parse(inp.value)
          const v = clamp((cur == null ? parseFloat(range.value) : cur / k) + stepOf(range, ev))
          setRange(range, v)
          inp.value = fmt(v)
          ok()
        }
      })
      inp.addEventListener('input', ok)
      inp.addEventListener('blur', () => { if (!finish(true)) finish(false) })
      document.body.appendChild(inp)
      inp.focus()
      inp.select()
    }
    const target = (e: Event) => {
      const t = e.target as Element | null
      const span = t?.closest?.('[data-num-edit]') as HTMLElement | null
      return span && span.closest('[data-loop-editor]') && span.getAttribute('aria-disabled') !== 'true' ? span : null
    }
    this.on(document, 'click', (e) => {
      const span = target(e)
      if (!span) return
      e.preventDefault()
      e.stopPropagation()
      open(span)
    }, true)
    this.on(document, 'keydown', (e) => {
      const span = target(e)
      if (!span) return
      if (e.key === 'Enter' || e.key === 'F2' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        open(span)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const range = rangeFor(span)
        if (!range || range.disabled) return
        e.preventDefault()
        e.stopPropagation()
        setRange(range, Math.max(parseFloat(range.min || '0'), Math.min(parseFloat(range.max || '100'), parseFloat(range.value) + stepOf(range, e))))
      }
    }, true)
  }
  placeInline(r: Box & { field: string }) {
    const c = this.canvasRef.current
    if (!c) return null
    const F = this.frameIn(c)
    const multi = ['body', 'headline', 'text', 'title'].includes(r.field)
    const fs = Math.max(15, Math.min(22, 44 * F.sc)), w = Math.min(F.pw - 8, Math.max(240, r.w * F.sc + 28))
    const h = Math.min(F.ph - 40, Math.max(fs * 1.25 + 16, multi ? r.h * F.sc + 16 : 0))
    return { left: Math.max(4, Math.min(F.pw - w - 4, F.ox + r.x * F.sc - 10)), top: Math.max(4, Math.min(F.ph - h - 34, F.oy + r.y * F.sc - 8)), width: w, height: h, fs }
  }
  findText(p: { x: number; y: number; W: number; H: number } | null, id?: string, field?: string) {
    const T = this.media.lastRects?.texts ?? []
    if (id) return T.find((r) => r.id === id && r.field === field) ?? null
    if (!p) return null
    const pad = (22 * Math.min(p.W, p.H)) / 1080, inside = (r: Box & { field: string }) => !!r.field && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
    const hits = T.filter(inside)
    if (!hits.length) return null
    const dist = (r: Box) => { const cx = Math.max(r.x, Math.min(p.x, r.x + r.w)), cy = Math.max(r.y, Math.min(p.y, r.y + r.h)); return Math.hypot(p.x - cx, p.y - cy) }
    return hits.sort((a, b) => dist(a) - dist(b))[0] ?? null
  }
  flashPlay(k: string) {
    clearTimeout(this.flashT)
    this.setState({ playFlash: k })
    this.flashT = setTimeout(() => { if (this.alive) this.setState({ playFlash: null }) }, 650)
  }
  /** Høyreklikk i forhåndsvisningen: avspilling, redigering av teksten under pekeren og visning. */
  onCanvasCtx = (e: { clientX: number; clientY: number; preventDefault(): void }) => {
    e.preventDefault()
    this.setState({ pvMenu: { x: e.clientX, y: e.clientY } })
  }
  pvMenuItems(): { label: string; keys?: string; separator?: boolean; onSelect: () => void }[] {
    const m = this.state.pvMenu
    if (!m) return []
    const ev = { clientX: m.x, clientY: m.y, preventDefault: () => undefined, stopPropagation: () => undefined } as unknown as PEv
    const p = this.canvasPoint(ev)
    const txt = p ? this.findText(p) : null
    return [
      { label: this.t(this.state.playing ? 'Pause' : 'Spill av'), keys: this.t('Mellomrom'), onSelect: () => this.togglePlay() },
      ...(txt ? [{ label: this.t('Rediger teksten'), onSelect: () => this.onCanvasDbl(ev) }] : []),
      { label: this.t('Fullskjerm'), separator: true, onSelect: () => this.enterFs() },
      ...(this.state.zoom ? [{ label: this.t('Standard visning'), onSelect: () => this.setState({ zoom: null }) }] : []),
    ]
  }
  onCanvasDbl = (e: PEv) => {
    clearTimeout(this.clickT)
    const p = this.canvasPoint(e)
    const fr = this.hitPip(p)
    if (fr?.kind === 'ftext') {
      const sl = this.state.slides.find((x) => x.id === fr.id), t = sl?.ftexts?.[fr.i]
      if (!t) return
      e.preventDefault()
      const pos = this.placeInline({ ...fr, field: 'body' })
      if (!pos) return
      this.inlineCancel = false
      this.inlineAt = performance.now()
      this.hardStopAudio()
      this.setState({ playing: false, scrubT: null, selected: fr.id, inlineEd: { id: fr.id, field: '__ftext', i: fr.i, value: t.text || '', orig: t.text || '', multi: true, ...pos } }, () => { const el = this.inlineRef.current; if (el) { el.focus(); el.select() } })
      return
    }
    if (this.hitLogo(p) && this.fileLogo.current) { this.fileLogo.current.click(); return }
    const hit = this.findText(p)
    if (!hit) return
    const sl = this.state.slides.find((x) => x.id === hit.id)
    if (!sl) return
    e.preventDefault()
    const pos = this.placeInline(hit)
    if (!pos) return
    const val = String(asRec(sl)[hit.field] ?? '')
    const multi = ['body', 'headline', 'text'].includes(hit.field) || (hit.field === 'title' && sl.type === 'outro')
    this.inlineCancel = false
    this.inlineAt = performance.now()
    this.hardStopAudio()
    this.setState({ playing: false, scrubT: null, selected: hit.id, inlineEd: { id: hit.id, field: hit.field, value: val, orig: val, multi, ...pos } }, () => {
      const t0 = this.inlineRef.current
      if (t0) { t0.focus(); t0.select() }
      /* når det stoppede bildet er tegnet, legges boksen nøyaktig over teksten */
      let n = 0
      const fix = () => {
        if (this.state.inlineEd?.id !== hit.id) return
        if (++n < 3) { requestAnimationFrame(fix); return }
        const r2 = this.findText(null, hit.id, hit.field), p2 = r2 && this.placeInline(r2)
        if (p2) this.setState((st) => (st.inlineEd ? { inlineEd: { ...st.inlineEd, ...p2, height: Math.max(p2.height, st.inlineEd.value.split('\n').length * p2.fs * 1.25 + 16) } } : null), () => { const el = this.inlineRef.current; if (el && document.activeElement !== el) el.focus({ preventScroll: true }) })
      }
      requestAnimationFrame(fix)
    })
  }
  commitInline() {
    const ed = this.state.inlineEd
    if (!ed) return
    if (this.state.tab !== 'slides') this.setState({ tab: 'slides' })
    this.setState({ inlineEd: null })
    const v = ed.multi ? ed.value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '') : ed.value.replace(/\s*\n\s*/g, ' ')
    if (ed.field === '__ftext') {
      if (v !== ed.orig) this.setState((st) => ({ slides: st.slides.map((x) => (x.id === ed.id ? { ...x, ftexts: (x.ftexts ?? []).map((t, j) => (j === ed.i ? { ...t, text: v } : t)) } : x)) }))
      return
    }
    if (v !== ed.orig) this.setF(ed.id, ed.field, v)
  }
  onPanMove = (e: PointerEvent) => {
    const d = this.pan
    if (!d) return
    e.preventDefault()
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    const cl = (v: number) => Math.max(0, Math.min(1, v))
    const nx = d.fw < 1 ? cl(d.p0x + dx / (d.rw * (1 - d.fw))) : null, ny = d.fh < 1 ? cl(d.p0y + dy / (d.rh * (1 - d.fh))) : null
    if (this.panRaf) return
    this.panRaf = requestAnimationFrame(() => {
      this.panRaf = null
      this.setState((st) => ({ slides: st.slides.map((x) => (x.id === d.id ? { ...x, ...(nx != null ? { panX: Math.round(nx * 1000) / 1000 } : {}), ...(ny != null ? { panY: Math.round(ny * 1000) / 1000 } : {}) } : x)) }))
      this.pk = null
    })
  }
  onPanUp = () => {
    this.pan = null
    window.removeEventListener('pointermove', this.onPanMove); window.removeEventListener('pointerup', this.onPanUp); window.removeEventListener('pointercancel', this.onPanUp)
  }
  openPan = () => {
    const S = this.state, sel = S.slides.find((x) => x.id === S.selected)
    if (!sel) return
    this.panOrig = { id: sel.id, panX: sel.panX, panY: sel.panY }
    this.setState({ panOpen: true, playing: false })
    this.hardStopAudio()
  }
  closePan = (mode: 'cancel' | 'done') => {
    const o = this.panOrig
    this.panOrig = null
    this.onPanUp()
    if (mode === 'cancel' && o) this.setState((st) => ({ panOpen: false, slides: st.slides.map((x) => (x.id === o.id ? { ...x, panX: o.panX, panY: o.panY } : x)) }))
    else this.setState({ panOpen: false })
    this.pk = null
  }
  onPanFrameDown = (e: PEv) => {
    const w = this.panWrapRef.current
    if (!w) return
    const r = w.getBoundingClientRect(), S = this.state, sel = S.slides.find((x) => x.id === S.selected)
    if (!sel) return
    const b = this.bgOf(sel), im = b ? this.media.images[b] : null
    if (!im?.naturalWidth) return
    const { W, H } = this.dims(), ia = im.naturalWidth / im.naturalHeight, fa = W / H
    const fw = ia > fa ? fa / ia : 1, fh = ia < fa ? ia / fa : 1
    e.preventDefault(); e.stopPropagation()
    const PT = this.portrait()
    this.pan = { id: sel.id, sx: e.clientX, sy: e.clientY, modal: true, rw: r.width, rh: r.height, fw, fh, moved: false, p0x: sel.panX != null ? sel.panX : PT ? (sel.fx != null ? sel.fx : 0.66) : 0.5, p0y: sel.panY != null ? sel.panY : 0.5 }
    window.addEventListener('pointermove', this.onPanMove); window.addEventListener('pointerup', this.onPanUp); window.addEventListener('pointercancel', this.onPanUp)
  }
  /** Shift + dra i forhåndsvisningen flytter bakgrunnsfyllet (når sliden ikke har bilde). */
  startFillDrag(e: PEv) {
    const S = this.state, sel = S.slides.find((x) => x.id === S.selected)
    if (!sel?.bgFill?.mode || sel.bgFill.mode === 'none' || this.bgOf(sel)) return false
    e.preventDefault(); e.stopPropagation()
    const id = sel.id, f0 = sel.bgFill, p0 = this.canvasPoint(e), x0 = f0.x == null ? 0.5 : f0.x, y0 = f0.y == null ? 0.5 : f0.y
    if (S.playing) this.setState({ playing: false })
    const mv = (ev: PointerEvent) => {
      const p = this.canvasPoint(ev), nx = Math.max(-0.5, Math.min(1.5, x0 + (p.x - p0.x) / p.W)), ny = Math.max(-0.5, Math.min(1.5, y0 + (p.y - p0.y) / p.H))
      if (this.fdRaf) return
      this.fdRaf = requestAnimationFrame(() => {
        this.fdRaf = null
        this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, bgFill: { ...(x.bgFill ?? { mode: 'linear' }), x: Math.round(nx * 1000) / 1000, y: Math.round(ny * 1000) / 1000 } } : x)) }))
        this.pk = null
      })
    }
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
    return true
  }
  onCanvasDown = (e: PEv) => {
    if (e.shiftKey && !this.state.rec && this.startFillDrag(e)) return
    if (this.eyedropOn) { e.preventDefault(); e.stopPropagation(); this.finishEyedrop(e); return }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      const now = performance.now(), lt = this.lastTap
      this.lastTap = { t: now, x: e.clientX, y: e.clientY }
      if (lt && now - lt.t < 380 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) { this.lastTap = null; this.onCanvasDbl(e); return }
    }
    const p = this.canvasPoint(e)
    const canvas = this.canvasRef.current
    if (!this.state.rec && !this.state.inlineEd && (e.button == null || e.button === 0)) {
      const pr = this.hitPip(p)
      if (pr) {
        e.preventDefault()
        clearTimeout(this.clickT)
        this.hardStopAudio()
        const kind = pr.kind || 'pip'
        this.setState({ playing: false, scrubT: null, selected: pr.id, selEl: { kind, id: pr.id, i: pr.i } })
        const d = { key: 'pip', self: { kind, id: pr.id, i: pr.i }, dx: p.x - (pr.x + pr.w / 2), dy: p.y - (pr.y + pr.h / 2), w: pr.w, h: pr.h }
        const move = (ev: PointerEvent) => {
          const q = this.canvasPoint(ev), sn = this.snapDrag(d, q.x - d.dx, q.y - d.dy, q, ev.altKey)
          const nx = Math.round((sn.ax / q.W) * 1000) / 1000, ny = Math.round((sn.ay / q.H) * 1000) / 1000
          this.setState((st) => ({
            slides: st.slides.map((x) => {
              if (x.id !== pr.id) return x
              if (kind === 'ftext') return { ...x, ftexts: (x.ftexts ?? []).map((t, j) => (j === pr.i ? { ...t, x: nx, y: ny } : t)) }
              if (kind === 'fqr') return { ...x, fqr: { ...(x.fqr ?? {}), x: nx, y: ny } }
              return { ...x, pips: (x.pips ?? []).map((pp, j) => (j === pr.i ? { ...pp, x: nx, y: ny } : pp)) }
            }),
          }))
        }
        const up = () => { this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (canvas) canvas.style.cursor = '' }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
        if (canvas) canvas.style.cursor = 'grabbing'
        return
      }
    }
    const key = this.hitAny(p)
    if (!key) {
      if (this.state.inlineEd || this.state.rec || (e.button != null && e.button > 0)) return
      const tx = this.findText(p)
      if (tx) {
        clearTimeout(this.clickT)
        this.hardStopAudio()
        e.preventDefault()
        this.setState({ playing: false, scrubT: null, selected: tx.id, selEl: { kind: 'text', id: tx.id, field: tx.field } })
        const KM: Record<string, string> = { time: 'day', place: 'day', pill: 'kicker', phone: 'email' }, tkey = KM[tx.field] ?? tx.field
        const sl0 = this.state.slides.find((x) => x.id === tx.id), o0 = sl0?.toff?.[tkey] ?? { x: 0, y: 0 }
        let moved = false
        const move = (ev: PointerEvent) => {
          const q = this.canvasPoint(ev)
          let dx = q.x - p.x, dy = q.y - p.y
          if (!moved && Math.hypot(dx, dy) < (6 * Math.min(q.W, q.H)) / 1080) return
          moved = true
          if (canvas) canvas.style.cursor = 'grabbing'
          const sn = this.snapBox(tx.x + dx, tx.y + dy, tx.w, tx.h, q, { kind: 'text', id: tx.id, field: tx.field }, ev.altKey)
          dx = sn.x - tx.x
          dy = sn.y - tx.y
          const nx = Math.round((o0.x + dx / q.W) * 1000) / 1000, ny = Math.round((o0.y + dy / q.H) * 1000) / 1000
          this.setState((st) => ({ slides: st.slides.map((x) => (x.id === tx.id ? { ...x, toff: { ...(x.toff ?? {}), [tkey]: { x: nx, y: ny } } } : x)) }))
        }
        const up = () => { this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (canvas) canvas.style.cursor = '' }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
        return
      }
      const sx = e.clientX, sy = e.clientY, st = performance.now()
      const upT = (ev: PointerEvent) => {
        window.removeEventListener('pointerup', upT)
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8 || performance.now() - st > 450) return
        clearTimeout(this.clickT)
        this.clickT = setTimeout(() => {
          if (this.state.inlineEd) return
          if (this.state.selEl) { this.setState({ selEl: null }); return }
          const was = this.state.playing
          this.togglePlay()
          this.flashPlay(was ? 'pause' : 'play')
        }, 260)
      }
      window.addEventListener('pointerup', upT)
      return
    }
    e.preventDefault()
    const r0 = this.media.lastRects?.[key]
    if (!r0) return
    if (this.state.playing) this.hardStopAudio()
    const rid = key === 'qr' ? (r0 as Box & { id: string }).id : undefined
    this.setState((st) => ({ selEl: { kind: key, id: rid ?? null }, ...(st.playing ? { playing: false, scrubT: null } : {}) }))
    /* ankerpunkt: logo og QR = midten, overskrift = øverst til venstre, etikett = øverst til høyre */
    const centred = key === 'logo' || key === 'qr'
    const ax = centred ? r0.x + r0.w / 2 : key === 'header' ? r0.x : r0.x + r0.w
    const ay = centred ? r0.y + r0.h / 2 : r0.y + 4 * (Math.min(p.W, p.H) / 1080)
    this.drag = { key, dx: p.x - ax, dy: p.y - ay, w: r0.w, h: r0.h, id: rid }
    if (key === 'qr' && this.state.playing && rid) { this.hardStopAudio(); this.setState({ playing: false, selected: rid }) }
    const move = (ev: PointerEvent) => {
      const q = this.canvasPoint(ev), d = this.drag
      if (!d) return
      const sn = this.snapDrag(d, q.x - d.dx, q.y - d.dy, q, ev.altKey)
      let x = sn.ax, y = sn.ay
      if (d.key === 'qr') {
        x = Math.max(d.w / 2, Math.min(q.W - d.w / 2, x))
        y = Math.max(d.h / 2, Math.min(q.H - d.h / 2, y))
        const nx = Math.round((x / q.W) * 1000) / 1000, ny = Math.round((y / q.H) * 1000) / 1000
        this.setState((s) => ({ slides: s.slides.map((sl) => (sl.id === d.id ? { ...sl, qrX: nx, qrY: ny } : sl)) }))
        return
      }
      if (d.key === 'logo') { x = Math.max(d.w / 2, Math.min(q.W - d.w / 2, x)); y = Math.max(d.h / 2, Math.min(q.H - d.h / 2, y)) }
      else if (d.key === 'header') { x = Math.max(0, Math.min(q.W - d.w, x)); y = Math.max(0, Math.min(q.H - d.h, y)) }
      else { x = Math.max(d.w, Math.min(q.W, x)); y = Math.max(0, Math.min(q.H - d.h, y)) }
      const nx = Math.round((x / q.W) * 1000) / 1000, ny = Math.round((y / q.H) * 1000) / 1000
      const kx = d.key === 'logo' ? 'logoX' : d.key === 'header' ? 'headerX' : 'topLabelX', ky = kx.replace('X', 'Y')
      this.setState((s) => ({ cfg: { ...s.cfg, [kx]: nx, [ky]: ny } }))
    }
    const up = () => { this.drag = null; this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (canvas) canvas.style.cursor = '' }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    if (canvas) canvas.style.cursor = 'grabbing'
  }
  onCanvasMove = (e: PEv) => {
    if (this.drag) return
    const c = this.canvasRef.current
    if (!c) return
    const p0 = this.canvasPoint(e)
    if (this.hitPip(p0)) { c.style.cursor = 'move'; return }
    if (!this.hitAny(p0) && this.findText(p0)) { c.style.cursor = 'move'; return }
    c.style.cursor = this.hitAny(p0) ? 'grab' : ''
  }

  /* ---------- logo og bakgrunnsvideo ---------- */
  onLogoFile = async (e: FileEv) => {
    let f: File | null = e.target.files?.[0] ?? null
    e.target.value = ''
    if (f && !this.okFile(f, 'image')) return
    if (f) { f = await this.cropImage(f, { aspect: 'free', title: 'Beskjær logoen' }); if (!f) return }
    if (f) { f = await this.shrinkImg(f, 2048, true); if (!f) return }
    if (!f) return
    const id = await this.storeImage(f, 'Logo')
    if (!id) return
    this.setState((s) => ({ cfg: { ...s.cfg, logoSrc: id, logoOn: true } }))
  }
  onVideoFile = async (e: FileEv) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !this.okFile(f, 'video')) return
    let ref: string
    try { ref = await this.deps.media.put(f, 'vid', f.name || 'video') } catch { this.deps.alert(this.t('Kunne ikke lagre videoen i nettleseren. Det kan være for lite lagringsplass.')); return }
    this.videoRef = ref
    const v = this.media.video
    if (v) {
      if (v.src.startsWith('blob:')) URL.revokeObjectURL(v.src)
      v.src = URL.createObjectURL(f)
      void v.play().catch(() => undefined)
    }
    this.setState({ videoName: f.name })
  }
  removeVideo = () => {
    this.videoRef = null
    const v = this.media.video
    if (v) { v.removeAttribute('src'); v.load() }
    this.setState({ videoName: '' })
  }

  /* ---------- ukeprogram fra bilde (tekstgjenkjenning i nettleseren) ---------- */
  async prepImage(file: Blob): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(file)
    const im = await new Promise<HTMLImageElement>((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url })
    const sc = Math.min(2, Math.max(1, 2000 / im.naturalWidth))
    const c = document.createElement('canvas')
    c.width = Math.round(im.naturalWidth * sc)
    c.height = Math.round(im.naturalHeight * sc)
    const ctx = c.getContext('2d')
    URL.revokeObjectURL(url)
    if (!ctx) return c
    ctx.drawImage(im, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * (px[i] ?? 0) + 0.587 * (px[i + 1] ?? 0) + 0.114 * (px[i + 2] ?? 0)
    const dark = sum / (px.length / 4) < 128
    for (let i = 0; i < px.length; i += 4) {
      let v = 0.299 * (px[i] ?? 0) + 0.587 * (px[i + 1] ?? 0) + 0.114 * (px[i + 2] ?? 0)
      if (dark) v = 255 - v
      v = Math.max(0, Math.min(255, (v - 128) * 1.8 + 128))
      px[i] = px[i + 1] = px[i + 2] = v
    }
    ctx.putImageData(d, 0, 0)
    return c
  }
  onOcrFile = async (e: FileEv) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !this.okFile(f, 'image')) return
    this.setState({ busy: 'ocr', parseMsg: 'Leser bildet …', parseOk: true })
    try {
      this.tp ??= loadTesseract().then(() => undefined).catch((x: unknown) => { this.tp = null; throw x })
      await this.tp
      const T = (window as unknown as { Tesseract: import('./engine/vendor').TesseractLib }).Tesseract
      const c = await this.prepImage(f), o = location.origin
      const r = await T.recognize(c, 'nor', {
        workerPath: o + '/vendor/tesseract-5.1.1/worker.min.js', corePath: o + '/vendor/tesseract-core-5.1.1/', langPath: o + '/vendor/tessdata',
        logger: (m) => { if (m.status === 'recognizing text' && this.alive) this.setState({ parseMsg: 'Leser bildet … ' + Math.round(m.progress * 100) + ' %' }) },
      })
      const text = String(r.data.text || '').split('\n').map((l) => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean).join('\n')
      this.setState({ programText: text, busy: '' }, () => {
        this.applyProgram()
        this.setState((s) => ({ parseMsg: s.parseOk ? s.parseMsg + ' Se over teksten – bildegjenkjenning kan gjøre små feil.' : s.parseMsg }))
      })
    } catch {
      this.setState({ busy: '', parseMsg: 'Klarte ikke å lese bildet. Sjekk internettforbindelsen, eller skriv inn programmet.', parseOk: false })
    }
  }
  onTextFile = (e: FileEv) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    void f.text().then((t) => this.setState({ programText: t }, () => this.applyProgram()))
  }

  /* ---------- eksport ---------- */
  download(blob: Blob, name: string) {
    this.deps.download(blob, name)
  }
  testPlayable(blob: Blob): Promise<boolean | null> {
    return new Promise((res) => {
      const v = document.createElement('video'), u = URL.createObjectURL(blob)
      let done = false
      const end = (ok: boolean | null) => {
        if (done) return
        done = true
        try { v.removeAttribute('src'); v.load() } catch { /* ingenting */ }
        URL.revokeObjectURL(u)
        res(ok)
      }
      v.muted = true
      v.preload = 'metadata'
      v.onloadedmetadata = () => end(v.videoWidth > 0)
      v.onerror = () => end(false)
      setTimeout(() => end(null), 8000)
      v.src = u
    })
  }
  fileBase() {
    return ({ sunday: 'sondagsmote-', youth: 'ungdomsmote-', blank: 'loop-' } as Record<string, string>)[this.state.tpl] ?? 'ukentlig-program-'
  }
  fileName() {
    return this.fileBase() + new Date().toISOString().slice(0, 10) + (this.portrait() ? '-staende' : '')
  }
  fmtLen(sec: number) {
    return fmtLen(sec)
  }
  /** Fullskjerm-spiller (.html): én fil med bilder, video, skrift og lyd. Videoer på slidene blir ikke med. */
  exportHTML = async () => {
    if (this.state.busy) return
    this.setState({ busy: 'html' })
    try {
      const data = this.payload(), images: Record<string, string> = {}
      for (const s of data.slides) {
        if (!s.bg || images[s.bg]) continue
        try { const b = await this.blobOf(s.bg); if (b) images[s.bg] = await toDataURL(b) } catch { /* bildet mangler */ }
      }
      const ls = data.cfg.logoSrc as string | null | undefined
      if (ls && data.cfg.logoOn !== false && !images[ls]) {
        try { const b = await this.blobOf(ls); if (b) images[ls] = await toDataURL(b) } catch { /* logoen mangler */ }
      }
      let video: string | null = null
      try { const vb = this.videoRef ? await this.deps.media.get(this.videoRef) : null; if (vb) video = await toDataURL(vb) } catch { /* ingen video */ }
      let audio: (AudioSyncOpts & { src: string }) | null = null
      if (this.state.audioName && this.state.cfg.exportAudio !== false && this.audioRef) {
        try { const ab = await this.deps.media.get(this.audioRef); if (ab) audio = { src: await toDataURL(ab), ...this.audioOpts() } } catch { /* ingen lyd */ }
      }
      const fam0 = this.state.cfg.font || 'Archivo', fam = /^[A-Za-z][A-Za-z ]{1,39}$/.test(fam0) ? fam0 : 'Archivo', { W, H } = this.dims()
      const font = fam === 'Helvetica' ? '' : await embeddedFontCSS(fam === 'Archivo' ? FONT_CSS : '/fonts/' + fam.toLowerCase().replace(/ /g, '-') + '.css')
      const html = buildPlayerHTML({ W, H, data, media: { images, video }, audio, title: this.state.cfg.header || 'Ukeprogram' }, font, this.deps.lang() === 'en' ? 'en' : 'no')
      this.download(new Blob([html], { type: 'text/html' }), this.fileName() + '.html')
    } finally {
      this.setState({ busy: '' })
    }
  }
  async renderSoundtrack(total: number, sr: number, data: LoopData): Promise<AudioBuffer | null> {
    const buf = this.audioBuf
    if (typeof OfflineAudioContext === 'undefined') return null
    const oc = new OfflineAudioContext(2, Math.ceil(total * sr), sr)
    /* lyd fra videoene på slidene */
    const duck = oc.createGain()
    duck.connect(oc.destination)
    let at = 0, anyVid = false
    for (const x of data.slides) {
      const dur = x.dur ?? 0
      if (x.vid) {
        if (!x.vidMusic) {
          duck.gain.setValueAtTime(1, at)
          duck.gain.linearRampToValueAtTime(0, at + Math.min(0.5, dur / 2))
          duck.gain.setValueAtTime(0, Math.max(at, at + dur - 0.5))
          duck.gain.linearRampToValueAtTime(1, at + dur)
        }
        if (x.vidSound !== false) {
          try {
            const b = await this.deps.media.get(x.vid), vb = b ? await oc.decodeAudioData(await b.arrayBuffer()) : null
            if (vb) {
              const s0 = oc.createBufferSource(), g = oc.createGain()
              s0.buffer = vb
              g.gain.value = x.vidVol == null ? 1 : x.vidVol
              s0.connect(g)
              g.connect(oc.destination)
              s0.start(at, 0, Math.min(dur, vb.duration))
              anyVid = true
            }
          } catch {
            // videoen har ingen lyd
          }
        }
      }
      at += dur
    }
    if (!buf) return anyVid ? await oc.startRendering() : null
    const o = this.audioOpts(), off = Math.max(0, Math.min(buf.duration - 0.1, o.offset || 0)), vol = o.vol == null ? 0.8 : o.vol
    const master = oc.createGain()
    master.connect(duck)
    const fi = o.fadeIn == null ? 0.6 : o.fadeIn, fo = o.fadeOut == null ? 1 : o.fadeOut
    master.gain.setValueAtTime(fi > 0 ? 0 : vol, 0)
    if (fi > 0) master.gain.linearRampToValueAtTime(vol, Math.min(fi, total / 2))
    master.gain.setValueAtTime(vol, Math.max(0, total - fo))
    if (fo > 0) master.gain.linearRampToValueAtTime(0, total)
    if (o.mode === 'free') {
      const src = oc.createBufferSource()
      src.buffer = buf
      src.loop = true
      src.loopStart = off
      src.loopEnd = buf.duration
      src.connect(master)
      src.start(0, off)
    } else {
      const seg = Math.max(0.5, buf.duration - off), rep = total > seg + 0.05
      for (let t0 = 0; t0 < total - 0.01; t0 += seg) {
        const len = Math.min(seg, total - t0), src = oc.createBufferSource(), g = oc.createGain()
        src.buffer = buf
        src.connect(g)
        g.connect(master)
        if (rep && t0 > 0) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.12) }
        if (rep && t0 + seg < total) { g.gain.setValueAtTime(1, t0 + len - 0.35); g.gain.linearRampToValueAtTime(0, t0 + len) }
        src.start(t0, off, len)
        if (!rep) break
      }
    }
    return await oc.startRendering()
  }
  /** Rask MP4-eksport: én hel runde så fort maskinen klarer (WebCodecs), med lyd. */
  fastExport = async (q4k: boolean) => {
    if (this.exporting || this.state.rec) return
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      if (this.recMime() && this.deps.confirm(this.t('Rask eksport støttes ikke i denne nettleseren.') + '\n\n' + this.t('Vil du ta opp videoen i sanntid i stedet?'))) this.startRec()
      else if (!this.recMime()) this.deps.alert(this.t('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.'))
      return
    }
    const Rz = this.resolved(), total = Rz.active.reduce((a, x) => a + x.dur, 0)
    if (!total) return
    const port = this.portrait(), W = q4k ? (port ? 2160 : 3840) : port ? 1080 : 1920, H = q4k ? (port ? 3840 : 2160) : port ? 1920 : 1080, fps = 30
    const nF = Math.round(total * fps), t0 = performance.now()
    this.exporting = true
    this.fastAbort = false
    this.hardStopAudio()
    const wasPlaying = this.state.playing, v = this.media.video, vWas = !!v && !v.paused
    this.setState({ playing: false, fast: { pct: 0, phase: 'Forbereder …' }, fastMsg: '' })
    let venc: VideoEncoder | null = null, aenc: AudioEncoder | null = null
    try {
      const M = await loadMuxer()
      const cands = q4k ? ['avc1.640033', 'avc1.640034', 'avc1.4d0033', 'avc1.640032'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028']
      let vcfg: VideoEncoderConfig | null = null
      for (const codec of cands) {
        const cfg: VideoEncoderConfig = { codec, width: W, height: H, bitrate: q4k ? 35e6 : 12e6, bitrateMode: 'variable', latencyMode: 'quality', framerate: fps, avc: { format: 'avc' } }
        try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported && r.config) { vcfg = r.config; break } } catch { /* prøv neste */ }
      }
      let vcodec = 'avc'
      if (!vcfg)
        for (const [codec, mc] of [['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']] as const) {
          try { const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: q4k ? 35e6 : 12e6, bitrateMode: 'variable', framerate: fps }); if (r.supported && r.config) { vcfg = r.config; vcodec = mc; break } } catch { /* prøv neste */ }
        }
      if (!vcfg) throw new Error('Nettleseren kan ikke lage video i denne oppløsningen. Prøv 1080p, eller bruk «Ta opp video».')
      const base0 = this.payload(), vidAud = base0.slides.some((x) => x.vid && x.vidSound !== false)
      const wantAudio = !!((this.audioBuf || vidAud) && this.state.cfg.exportAudio !== false && typeof AudioEncoder !== 'undefined')
      let acfg: AudioEncoderConfig | null = null, acodec: string | null = null
      if (wantAudio)
        for (const [c, mc] of [['mp4a.40.2', 'aac'], ['opus', 'opus']] as const) {
          try { const r = await AudioEncoder.isConfigSupported({ codec: c, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }); if (r.supported && r.config) { acfg = r.config; acodec = mc; break } } catch { /* prøv neste */ }
        }
      const target = new M.ArrayBufferTarget()
      const muxer = new M.Muxer({ target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: vcodec, width: W, height: H, frameRate: fps }, ...(acfg && acodec ? { audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48000 } } : {}) })
      let encErr: unknown = null
      const ve = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: (er) => { encErr = er } })
      venc = ve
      ve.configure(vcfg)
      if (acfg) {
        this.setState({ fast: { pct: 0, phase: 'Lager lydspor …' } })
        const ab = await this.renderSoundtrack(total, 48000, base0)
        if (ab) {
          const ae = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: (er) => { encErr = er } })
          aenc = ae
          ae.configure(acfg)
          const L = ab.getChannelData(0), Rr = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L, N = 4800
          for (let i = 0; i < ab.length; i += N) {
            const n = Math.min(N, ab.length - i), d = new Float32Array(n * 2)
            d.set(L.subarray(i, i + n), 0)
            d.set(Rr.subarray(i, i + n), n)
            const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data: d })
            ae.encode(ad)
            ad.close()
          }
          await ae.flush()
        }
      }
      const cv: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H })
      const ctx = cv.getContext('2d') as CanvasRenderingContext2D | null
      if (!ctx) throw new Error('Nettleseren kan ikke tegne videoen.')
      const media: LoopMedia = { images: this.media.images, video: v, vids: this.media.vids }
      this.pauseVids()
      for (const x of base0.slides) if (x.vid && !this.media.vids[x.vid]) await this.ensureVid(x.vid)
      for (const x of base0.slides) {
        const sv = x.vid ? this.media.vids[x.vid] : undefined
        if (sv && sv.readyState < 2) await new Promise<void>((r) => { sv.addEventListener('loadeddata', () => r(), { once: true }); setTimeout(r, 4000) })
      }
      if (v?.src) try { v.pause() } catch { /* ingenting */ }
      const base = this.payload()
      for (let f = 0; f < nF; f++) {
        if (this.fastAbort) throw new Error('abort')
        if (encErr) throw encErr instanceof Error ? encErr : new Error(String(encErr))
        const t = f / fps
        if (v?.src && v.readyState >= 1 && v.duration) {
          const vt = t % v.duration
          if (Math.abs(v.currentTime - vt) > 0.01) await new Promise<void>((r) => { const done = () => { v.removeEventListener('seeked', done); r() }; v.addEventListener('seeked', done); setTimeout(done, 400); v.currentTime = vt })
        }
        const lc = R.locate(base.slides as { dur: number }[], t), cs = lc ? base.slides[lc.i] : null, sv = cs?.vid ? this.media.vids[cs.vid] : undefined
        if (lc && sv && sv.readyState >= 1 && sv.duration) {
          const st = Math.max(0, Math.min(sv.duration - 0.04, lc.lt))
          if (Math.abs(sv.currentTime - st) > 0.01) await new Promise<void>((r) => { const done = () => { sv.removeEventListener('seeked', done); r() }; sv.addEventListener('seeked', done); setTimeout(done, 1500); sv.currentTime = st })
        }
        R.drawFrame(ctx, W, H, base, media, t)
        const fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) })
        ve.encode(fr, { keyFrame: f % (fps * 2) === 0 })
        fr.close()
        while (ve.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2))
        if (f % 8 === 0) {
          const el = (performance.now() - t0) / 1000, left = f > 10 ? (el / f) * (nF - f) : null
          this.setState({ fast: { pct: Math.round((f / nF) * 100), phase: this.t('Lager video …') + ' ' + Math.round((f / nF) * 100) + ' %' + (left != null ? ' · ' + this.t('ca.') + ' ' + Math.max(1, Math.round(left)) + ' ' + this.t('s igjen') : '') } })
          await new Promise((r) => setTimeout(r, 0))
        }
      }
      this.setState({ fast: { pct: 100, phase: 'Fullfører filen …' } })
      await ve.flush()
      muxer.finalize()
      const blob = new Blob([target.buffer], { type: 'video/mp4' })
      if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen, eller velg 1080p.')
      this.setState({ fast: { pct: 100, phase: 'Sjekker at filen kan spilles …' } })
      const ok = await this.testPlayable(blob)
      if (ok === false) throw new Error('Filen kunne ikke spilles av i nettleseren. Prøv 1080p eller opptak i sanntid.')
      this.download(blob, this.fileName() + (q4k ? '-4k' : '-1080p') + '.mp4')
      const secs = Math.round((performance.now() - t0) / 1000)
      this.setState({ fastMsg: this.t('Ferdig på') + ' ' + secs + ' s · ' + (blob.size / 1048576).toFixed(1) + ' MB · ' + (vcodec === 'avc' ? 'H.264' : vcodec.toUpperCase()) + (acfg ? this.t(acodec === 'aac' ? ' + AAC-lyd' : ' + Opus-lyd (spill av i VLC hvis lyden mangler)') : wantAudio ? this.t(' · uten lyd (nettleseren kan ikke lage lyd i MP4)') : '') })
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      this.setState({ fastMsg: m === 'abort' ? 'Avbrutt.' : this.t('Noe gikk galt:') + ' ' + this.t(m) })
    } finally {
      try { if (venc && venc.state !== 'closed') venc.close() } catch { /* ingenting */ }
      try { if (aenc && aenc.state !== 'closed') aenc.close() } catch { /* ingenting */ }
      this.exporting = false
      if (v?.src && vWas) void v.play().catch(() => undefined)
      this.t0 = performance.now()
      this.setState({ fast: null, playing: wasPlaying })
    }
  }
  recMime(withAudio?: boolean): string | null {
    if (typeof MediaRecorder === 'undefined') return null
    /* H.264-nivået må passe lerretet (4.0 opp til 1080p, 5.1 for 4K), ellers nekter strenge spillere filen */
    const d = this.dims(), big = d.W * d.H > 1920 * 1088
    const avc = big ? ['avc1.640033', 'avc1.4d0033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028']
    const list = withAudio
      ? [...avc.map((c) => 'video/mp4;codecs=' + c + ',mp4a.40.2'), 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : [...avc.map((c) => 'video/mp4;codecs=' + c), 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    try { return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? '' } catch { return '' }
  }
  /** Opptak i sanntid: én hel runde; slutten går sømløst over i starten. */
  startRec = () => {
    const c = this.canvasRef.current
    const vidAud = this.payload().slides.some((x) => x.vid && x.vidSound !== false)
    const withAudio = !!(this.state.cfg.exportAudio !== false && ((this.state.audioName && this.actl?.duration()) || vidAud))
    if (withAudio) { this.ensureGraph(); this.actl?.stop() }
    const mime = this.recMime(withAudio && !!this.aDest)
    if (!c || mime === null || !c.captureStream) { this.deps.alert(this.t('Nettleseren støtter ikke opptak. Bruk Chrome eller Edge.')); return }
    const Rz = this.resolved(), total = Rz.active.reduce((a, s) => a + s.dur, 0)
    if (!total) return
    const d = this.dims()
    if (c.width !== d.W || c.height !== d.H) { c.width = d.W; c.height = d.H; this.pk = null }
    const tracks = [...c.captureStream(30).getVideoTracks()]
    if (withAudio && this.aDest) { const at = this.aDest.stream.getAudioTracks()[0]; if (at) tracks.push(at.clone()) }
    const stream = new MediaStream(tracks), chunks: Blob[] = []
    const opts: MediaRecorderOptions = { videoBitsPerSecond: this.state.cfg.res === '4k' ? 30000000 : 12000000 }
    if (mime) opts.mimeType = mime
    const rec = new MediaRecorder(stream, opts)
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (this.recCancel) { this.recCancel = false; return }
      const type = rec.mimeType || mime || 'video/webm'
      if (!chunks.length) { this.deps.alert(this.t('Opptaket ble tomt. Prøv igjen, og hold fanen synlig mens det tar opp.')); return }
      const ext = /mp4/.test(type) ? '.mp4' : /matroska/.test(type) ? '.mkv' : '.webm'
      this.download(new Blob(chunks, { type: type.split(';')[0] ?? 'video/webm' }), this.fileName() + ext)
    }
    this.recObj = rec
    this.recTotal = total
    this.t0 = performance.now()
    const v = this.media.video
    if (v?.src) { v.currentTime = 0; void v.play().catch(() => undefined) }
    rec.start(1000)
    this.setState({ rec: { pct: 0 }, playing: true, playIdx: 0, scrubT: null })
  }
  tickRec() {
    const el = (performance.now() - this.t0) / 1000
    if (el >= this.recTotal + 0.05) { this.stopRec(false); return }
    const pct = Math.min(100, Math.floor((el / this.recTotal) * 100))
    if (this.state.rec && pct !== this.state.rec.pct) this.setState({ rec: { pct } })
  }
  stopRec(cancel: boolean) {
    const r = this.recObj
    this.recObj = null
    this.recCancel = cancel
    if (r && r.state !== 'inactive') r.stop()
    if (this.alive) this.setState({ rec: null })
  }
  /** Sant mens noe som ikke må avbrytes, pågår (eksport, opptak, tekstgjenkjenning). */
  isBusy() {
    return this.exporting || !!this.state.rec || !!this.state.busy
  }

  /** view() med alle grenene slått sammen (felt som ikke gjelder nå, er undefined). */
  viewAll(): LoopView {
    return this.view() as unknown as LoopView
  }
  /* ---------- verdiene visningen bruker (renderVals i dagens app) ---------- */
  view() {
    const S = this.state, Rz = this.resolved(), all = Rz.all, active = Rz.active
    const sel = all.find((s) => s.id === S.selected) ?? all[0] ?? null, id = sel ? sel.id : null
    const DM = this.dims(), DU = Math.min(DM.W, DM.H) / 1080, PT = this.portrait()
    const qrDef = (() => { const q = this.media.lastRects?.qr; return q ? { x: (q.x + q.w / 2) / DM.W, y: (q.y + q.h / 2) / DM.H } : { x: (DM.W - 95 * DU - 165 * DU) / DM.W, y: (DM.H - 150 * DU - 165 * DU) / DM.H } })()
    const idx = sel ? all.indexOf(sel) : -1
    const TYPE: Record<string, string> = { day: 'Møte', text: 'Tekst', contact: 'Kontakt · QR', outro: 'Avslutning' }
    const total = active.reduce((a, s) => a + s.dur, 0), loopLen = fmtLen(total)
    const live = S.playing || !!S.rec
    const playingId = live ? active[S.playIdx]?.id : id
    const T0 = S.tpl || 'week'
    const first: [string, string, string, string] | null = T0 === 'blank' ? ['build', 'Bygg', 'Legg til slides og velg stilpakke', 'M12 5v14M5 12h14'] : T0 === 'week' ? ['program', 'Program', 'Hent og rediger ukens program', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'] : null
    let curTab = S.tab
    if (curTab === 'program' || curTab === 'build') curTab = first ? first[0] : 'slides'
    const TABS = [
      first,
      ['slides', 'Slides', 'Tekst, bilde og stil for hver slide', 'M4 7h16v12H4zM7 4h10'],
      ['style', 'Stil', 'Logo, overskrift, skrift, bakgrunnsvideo og musikk', 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
      ['fx', 'Effekter', 'Overganger, animasjoner, fargepaneler og filter', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z'],
      ['export', 'Eksport', 'Last ned video eller fullskjerm-spiller', 'M12 3v12M7 10l5 5 5-5M5 21h14'],
    ].filter((x): x is string[] => !!x)
    const tabs = TABS.map(([k = '', l = '', tip = '', icon = '']) => {
      const on = curTab === k
      return { label: l, tip, icon, current: on ? ('page' as const) : ('false' as const), bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', border: on ? '#f3f1ec' : 'transparent', onClick: () => this.setState({ tab: k }) }
    })
    const kick = (s: Slide) => (s.type === 'day' ? [s.day, s.time].filter(Boolean).join(' · ') : s.type === 'outro' ? s.sub || '' : s.kicker || '')
    const head = (s: Slide) => (s.type === 'day' ? s.title : s.type === 'text' ? s.body : s.type === 'contact' ? s.headline : s.title)
    const cards = all.map((s, i) => ({
      num: String(i + 1).padStart(2, '0'), label: TYPE[s.type] ?? '', kicker: kick(s), title: head(s) || '(uten tekst)',
      meta: s.hidden ? 'Skjult' : Math.round(s.dur * 10) / 10 + ' s',
      thumbBg: (() => { const b = this.bgOf(s); return b ? cssUrl(S.urls[b] ?? b) : 'none' })(),
      border: s.id === id ? '#e9e7e2' : '#2b2b2b', shadow: s.id === id ? '0 0 0 1px #e9e7e2' : 'none',
      opacity: s.hidden ? 0.45 : 1, playing: s.id === playingId, onClick: () => this.select(s.id),
      dropBefore: S.dropAt === i, dropAfter: S.dropAt === all.length && i === all.length - 1,
      onDragStart: (e: DragEv) => { this.dragId = s.id; e.dataTransfer?.setData('text/plain', s.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' },
      onDragOver: (e: DragEv) => {
        if (!this.dragId) return
        e.preventDefault()
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), after = e.clientX > r.left + r.width / 2
        const slot = i + (after ? 1 : 0)
        if (S.dropAt !== slot) this.setState({ dropAt: slot })
      },
      onDrop: (e: DragEv) => {
        e.preventDefault()
        const d = this.dragId, slot = this.state.dropAt, from = this.state.slides.findIndex((x) => x.id === d)
        this.dragId = null
        if (d && slot != null && from >= 0) this.reorder(d, slot - (from < slot ? 1 : 0)); else this.setState({ dropAt: null })
      },
      onDragEnd: () => { this.dragId = null; if (this.state.dropAt != null) this.setState({ dropAt: null }) },
      onPointerDown: (e: TouchDownEv) => { if (e.pointerType === 'touch') this.touchDrag(e, s.id) },
      onContextMenu: (e: { clientX: number; clientY: number; preventDefault(): void }) => {
        e.preventDefault()
        this.select(s.id)
        this.setState({ slideMenu: { x: e.clientX, y: e.clientY, id: s.id } })
      },
      onKeyDown: (e: { altKey: boolean; shiftKey?: boolean; key: string; preventDefault(): void; currentTarget?: EventTarget | null }) => {
        if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
          e.preventDefault()
          const r = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect()
          this.select(s.id)
          this.setState({ slideMenu: { x: r ? r.left + 24 : 100, y: r ? r.top + 24 : 100, id: s.id } })
          return
        }
        if (!e.altKey) return
        const k = e.key, to = k === 'ArrowLeft' ? i - 1 : k === 'ArrowRight' ? i + 1 : k === 'Home' ? 0 : k === 'End' ? all.length - 1 : null
        if (to == null) return
        e.preventDefault()
        this.reorder(s.id, to)
      },
      onRemove: (e?: { stopPropagation(): void }) => { e?.stopPropagation(); this.del(s.id) },
      hasVid: !!s.vid, vidSoundOn: s.vidSound !== false, vidSoundOff: s.vidSound === false,
      vidSoundColor: s.vidSound === false ? '#8a867e' : '#ffffff',
      vidSoundTitle: s.vidSound === false ? 'Videolyd er av – trykk for å slå på' : 'Videolyd er på – trykk for å slå av',
      toggleVidSound: (e?: { stopPropagation(): void }) => { e?.stopPropagation(); this.setF(s.id, 'vidSound', s.vidSound === false); this.pk = null },
    }))
    const fields = ['day', 'date', 'time', 'title', 'place', 'kicker', 'pill', 'body', 'sub', 'headline', 'text', 'email', 'phone', 'qrUrl'] as const
    const f: Record<string, string> = {}, on: Record<string, (e: InputEv) => void> = {}
    fields.forEach((k) => { f[k] = sel && sel[k] != null ? String(sel[k]) : ''; on[k] = (e: InputEv) => { if (id) this.setF(id, k, e.target.value) } })
    const qr = sel?.type === 'contact' ? this.makeQR(sel.qrUrl) : null
    const hasBg = !!this.bgOf(sel)
    const orig = sel ? (S.slides.find((x) => x.id === id) ?? null) : null
    const customDur = !!orig?.dur
    const activeIdx = sel ? active.findIndex((s) => s.id === id) : -1
    const recMime = this.recMime()
    const fastOk = typeof VideoEncoder !== 'undefined'
    const MB = S.mobile, pane = S.mPane || 'preview'
    const hexOk = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
    const vw0 = window.innerWidth, vh0 = window.innerHeight
    return {
      t: this.t,
      ...(() => {
        const C = S.crop
        if (!C) return { cropOpen: false as boolean }
        const maxW = Math.min(900, vw0 - (MB ? 56 : 120)), maxH = vh0 * (MB ? 0.5 : 0.58), k = Math.min(maxW / C.w, maxH / C.h, 1e9)
        const b = C.box, pct = (v: number) => (v * 100).toFixed(3) + '%'
        const opts = [['free', 'Fri'], ['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['4:5', '4:5'], ['orig', 'Original']]
        const HS = MB ? 30 : 18
        return {
          cropOpen: true, cropTitle: C.title, cropBg: 'url("' + String(C.url).replace(/["\\]/g, '') + '")', cropWrapRef: this.cropWrapRef,
          cropDispW: Math.round(C.w * k) + 'px', cropDispH: Math.round(C.h * k) + 'px',
          cropL: pct(b.x), cropT: pct(b.y), cropW: pct(b.w), cropH: pct(b.h),
          cropSize: Math.round(b.w * C.w) + ' × ' + Math.round(b.h * C.h) + ' px',
          cropHS: HS + 'px', cropHO: -(HS / 2) + 'px',
          cropAspects: opts.map(([v = '', l = '']) => ({ label: l, bg: C.aspect === v ? '#f3f1ec' : 'transparent', fg: C.aspect === v ? '#000000' : '#c9c5bc', onClick: () => this.setState((st) => (st.crop ? { crop: { ...st.crop, aspect: v, box: this.cropFit(v, st.crop.w, st.crop.h) } } : null)) })),
          cropMove: (e: PEv) => this.onCropDown(e, 'move'), cropNW: (e: PEv) => this.onCropDown(e, 'nw'), cropNE: (e: PEv) => this.onCropDown(e, 'ne'), cropSW: (e: PEv) => this.onCropDown(e, 'sw'), cropSE: (e: PEv) => this.onCropDown(e, 'se'),
          cropN: (e: PEv) => this.onCropDown(e, 'n'), cropS: (e: PEv) => this.onCropDown(e, 's'), cropE: (e: PEv) => this.onCropDown(e, 'e'), cropW2: (e: PEv) => this.onCropDown(e, 'w'),
          cropEL: (MB ? 36 : 26) + 'px', cropET: (MB ? 12 : 9) + 'px', cropELo: 'calc(50% - ' + (MB ? 36 : 26) / 2 + 'px)', cropETo: -((MB ? 12 : 9) / 2) + 'px',
          cropCancel: () => this.finishCrop('cancel'), cropFull: () => this.finishCrop('full'), cropApply: () => this.finishCrop('crop'),
          cropReset: () => this.setState((st) => (st.crop ? { crop: { ...st.crop, box: this.cropFit(st.crop.aspect, st.crop.w, st.crop.h) } } : null)),
        }
      })(),
      recropBg: this.recropBg,
      ...(() => {
        const o = orig, fl: Partial<BgFill> = o?.bgFill ?? {}, mode = FILLM.includes(String(fl.mode)) ? String(fl.mode) : 'none'
        const stops = fillStops(fl), ang = fl.angle == null ? 135 : fl.angle
        const put = (p: Partial<BgFill>) => {
          if (!id) return
          this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const cur = x.bgFill ?? null; return { ...x, bgFill: { mode: 'linear', angle: 135, ...(cur ?? {}), stops: fillStops(cur), ...p } } }) }))
          this.pk = null
        }
        const setStop = (i: number, p: Partial<(typeof stops)[number]>) => put({ stops: stops.map((q, j) => (j === i ? { ...q, ...p } : q)) })
        const css = (() => {
          const ss = stops.slice().sort((a, b) => a.p - b.p), li = ss.map((q) => q.c + ' ' + Math.round(q.p * 100) + '%').join(', '), s0 = ss[0]?.c ?? '#000000', sl = ss[ss.length - 1]?.c ?? '#000000'
          if (mode === 'solid') return s0
          if (mode === 'radial') return 'radial-gradient(circle at 50% 50%, ' + li + ')'
          if (mode === 'conicRep' || mode === 'conicMirror' || mode === 'rays' || mode === 'conicCorner') {
            const n = mode === 'conicCorner' ? 1 : Math.max(1, Math.round(fl.repeat || (mode === 'rays' ? 8 : 3))), seg = 360 / n, a = (ang * Math.PI) / 180
            const at = mode === 'conicCorner' ? Math.round(50 + 50 * Math.sin(a)) + '% ' + Math.round(50 - 50 * Math.cos(a)) + '%' : '50% 50%'
            const body = mode === 'rays'
              ? ss.map((q, i) => q.c + ' ' + ((i / ss.length) * seg).toFixed(1) + 'deg ' + (((i + 1) / ss.length) * seg).toFixed(1) + 'deg').join(', ')
              : mode === 'conicMirror'
                ? ss.map((q) => q.c + ' ' + ((q.p * seg) / 2).toFixed(1) + 'deg').join(', ') + ', ' + ss.slice().reverse().map((q) => q.c + ' ' + (seg - (q.p * seg) / 2).toFixed(1) + 'deg').join(', ')
                : ss.map((q) => q.c + ' ' + (q.p * seg).toFixed(1) + 'deg').join(', ') + ', ' + s0 + ' ' + seg.toFixed(1) + 'deg'
            return 'repeating-conic-gradient(from ' + Math.round(ang) + 'deg at ' + at + ', ' + body + ')'
          }
          if (mode === 'conic') return 'conic-gradient(from ' + Math.round(ang) + 'deg, ' + li + ', ' + s0 + ')'
          if (mode === 'mirror') return 'linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map((q) => q.c + ' ' + Math.round(q.p * 50) + '%').join(', ') + ', ' + ss.slice().reverse().map((q) => q.c + ' ' + Math.round(100 - q.p * 50) + '%').join(', ') + ')'
          if (mode === 'stripes') { const n = Math.max(1, Math.round(fl.repeat || 1)), seg = 100 / n; return 'repeating-linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map((q, i) => q.c + ' ' + ((i / ss.length) * seg).toFixed(2) + '% ' + (((i + 1) / ss.length) * seg).toFixed(2) + '%').join(', ') + ')' }
          if (mode === 'wave') return 'repeating-linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map((q) => q.c + ' ' + Math.round(q.p * 33) + '%').join(', ') + ', ' + s0 + ' 33%)'
          if (mode === 'ellipse') return 'radial-gradient(ellipse at 50% 50%, ' + li + ')'
          if (mode === 'corner') { const a = (ang * Math.PI) / 180; return 'radial-gradient(circle at ' + Math.round(50 + 50 * Math.sin(a)) + '% ' + Math.round(50 - 50 * Math.cos(a)) + '%, ' + li + ')' }
          if (mode === 'spot') return 'radial-gradient(circle at 50% 42%, ' + ss.map((q) => q.c + ' ' + Math.round(q.p * 55) + '%').join(', ') + ')'
          if (mode === 'glow') {
            const a = (ang * Math.PI) / 180, n = Math.max(1, ss.length - 1)
            return ss.slice(0, -1).map((q, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return 'radial-gradient(circle at ' + Math.round(50 + Math.sin(a) * (t - 0.5) * 80) + '% ' + Math.round(50 - Math.cos(a) * (t - 0.5) * 80) + '%, ' + q.c + ', transparent 60%)' }).join(', ') + ', ' + sl
          }
          if (mode === 'mesh') { const PP = [[15, 20], [85, 25], [80, 85], [20, 80], [50, 50], [50, 10]]; return ss.map((q, i) => 'radial-gradient(circle at ' + (PP[i % 6]?.[0] ?? 50) + '% ' + (PP[i % 6]?.[1] ?? 50) + '%, ' + q.c + ', transparent 70%)').join(', ') + ', ' + sl }
          return 'linear-gradient(' + Math.round(ang) + 'deg, ' + li + ')'
        })()
        const NAMES: Record<string, string> = { conicRep: 'Vinkel gjentatt', conicMirror: 'Vinkel speilet', conicCorner: 'Vinkel fra hjørne', rays: 'Stråler', solid: 'Farge', linear: 'Lineær', mirror: 'Speilet', radial: 'Rund', ellipse: 'Oval', conic: 'Vinkel', mesh: 'Myk blanding', stripes: 'Striper', wave: 'Bølger', corner: 'Fra hjørne', spot: 'Spotlys', glow: 'Glød' }
        return {
          fillModes: [['none', 'Ingen'], ['solid', 'Farge'], ['linear', 'Lineær'], ['mirror', 'Speilet'], ['radial', 'Rund'], ['ellipse', 'Oval'], ['conic', 'Vinkel'], ['conicRep', 'Vinkel gjentatt'], ['conicMirror', 'Vinkel speilet'], ['conicCorner', 'Vinkel fra hjørne'], ['rays', 'Stråler'], ['mesh', 'Myk blanding'], ['stripes', 'Striper'], ['wave', 'Bølger'], ['corner', 'Fra hjørne'], ['spot', 'Spotlys'], ['glow', 'Glød']].map(([v = '', l = '']) => ({ label: l, bg: mode === v ? '#f3f1ec' : 'transparent', fg: mode === v ? '#000000' : '#c9c5bc', onClick: () => put({ mode: v }) })),
          fillOn: mode !== 'none', fillMulti: mode !== 'none' && mode !== 'solid', fillAngled: ['linear', 'mirror', 'conic', 'stripes', 'wave', 'corner', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner'].includes(mode), fillPosOn: !['mesh', 'stripes', 'glow', 'rays'].includes(mode),
          fillSolidC: stops[0]?.c ?? '#000000', onFillSolid: (ev: InputEv) => { const v = ev.target.value; if (hexOk(v)) setStop(0, { c: v }) }, fillSolidOnly: mode === 'solid',
          fillStopsList: (() => {
            const ord = stops.map((q, i) => ({ q, i })).sort((a, b) => a.q.p - b.q.p)
            const swap = (a: number, b: number) => { const l = stops.slice(), A = l[a], B = l[b]; if (!A || !B) return; l[a] = { ...A, c: B.c }; l[b] = { ...B, c: A.c }; put({ stops: l }) }
            return ord.map(({ q, i }, k) => ({
              c: q.c, pct: Math.round(q.p * 100), wPct: Math.round((q.w || 0) * 100), onW: (ev: InputEv) => setStop(i, { w: Number(ev.target.value) / 100 }), hardBg: q.hard ? '#f3f1ec' : 'transparent', hardFg: q.hard ? '#000000' : '#9d998f',
              toggleHard: () => setStop(i, { hard: !q.hard }), notLast: k < ord.length - 1, num: String(k + 1), onColor: (ev: InputEv) => { const v = ev.target.value; if (hexOk(v)) setStop(i, { c: v }) },
              onPos: (ev: InputEv) => setStop(i, { p: Number(ev.target.value) / 100 }), canDel: stops.length > 2, del: () => put({ stops: stops.filter((_, j) => j !== i) }),
              upOp: k > 0 ? 1 : 0.25, downOp: k < ord.length - 1 ? 1 : 0.25, up: () => { const pv = ord[k - 1]; if (pv) swap(i, pv.i) }, down: () => { const nx = ord[k + 1]; if (nx) swap(i, nx.i) },
            }))
          })(),
          fillCanAdd: stops.length < 6,
          fillAdd: () => { const ss = stops.slice().sort((a, b) => a.p - b.p), last = ss[ss.length - 1]; const l = ss.map((q, j) => ({ ...q, p: j / ss.length })); l.push({ c: last?.c ?? '#000000', p: 1 }); put({ stops: l }) },
          fillHarmony: () => { const cols = harmonyColors(stops.length); put({ stops: stops.map((q, i) => ({ ...q, c: cols[i] ?? q.c })) }) },
          fillHarmonyOne: () => { const cols = harmonyColors(1); setStop(0, { c: cols[0] ?? '#000000' }) },
          fillReverse: () => put({ stops: stops.map((q) => ({ ...q, p: 1 - q.p })) }), fillEven: () => put({ stops: stops.slice().sort((a, b) => a.p - b.p).map((q, j, a) => ({ ...q, p: a.length > 1 ? j / (a.length - 1) : 0 })) }),
          fillAngle: Math.round(ang), onFillAngle: (ev: InputEv) => put({ angle: Number(ev.target.value) }),
          fillSharp: Math.round((Number(fl.sharp) || 0) * 100), onFillSharp: (ev: InputEv) => put({ sharp: Number(ev.target.value) / 100 }), fillSharp0: () => put({ sharp: 0 }),
          fillRepOn: ['stripes', 'wave', 'conicRep', 'conicMirror', 'rays'].includes(mode), fillRep: Math.round(fl.repeat || (mode === 'wave' || mode === 'conicRep' || mode === 'conicMirror' ? 3 : mode === 'rays' ? 8 : 1)), onFillRep: (ev: InputEv) => put({ repeat: Number(ev.target.value) }),
          fillSoft: Math.round((fl.soft == null ? 0.5 : fl.soft) * 100), onFillSoft: (ev: InputEv) => put({ soft: Number(ev.target.value) / 100 }), fillSoft50: () => put({ soft: 0.5 }),
          fillOpenBox: S.fillOpen, fillToggleBox: () => this.setState((st) => ({ fillOpen: !st.fillOpen })), fillArrow: S.fillOpen ? '▴' : '▾',
          fillSummary: mode === 'none' ? 'Ingen' : (NAMES[mode] ?? '') + (mode !== 'solid' ? ' · ' + stops.length + ' farger' : ''),
          fillPreview: css,
          fillNote: hasBg ? 'Vises bare når sliden ikke har bakgrunnsbilde.' : 'Hold Shift og dra i forhåndsvisningen for å flytte gradienten.',
          fillCenter: () => put({ x: 0.5, y: 0.5 }), fillMoved: fl.x != null && (Math.abs(fl.x - 0.5) > 0.005 || Math.abs((fl.y == null ? 0.5 : fl.y) - 0.5) > 0.005),
        }
      })(),
      openVigEd: () => { if (!id) { this.deps.toast(this.t('Legg til minst én slide først (skriv inn programmet eller trykk «+ Legg til»), så kan du redigere vignetten.')); return } this.setState({ vigEd: { layer: 0, scope: 'slide' }, playing: false }); this.hardStopAudio() },
      openOvEd: () => { if (!id) return; this.setState({ ovEd: { scope: 'slide' }, playing: false }); this.hardStopAudio() },
      openOvEdAll: () => { if (!id) return; this.setState({ ovEd: { scope: 'all' }, playing: false }); this.hardStopAudio() },
      ovSummary: (() => { if (!sel) return ''; const o = this.ovState(sel, false), tt = OVT.find((x) => x[0] === o.fx); return o.on ? (tt ? tt[1] : '') + (ovOwn(sel) ? ' · egne innstillinger' : '') : 'Av' })(),
      ovAllSummary: (() => { const o = this.ovState(null, true), tt = OVT.find((x) => x[0] === o.fx); return o.on ? (tt ? tt[1] : '') + ' · ' + Math.round(o.amt * 100) + ' %' : 'Av' })(),
      ...(() => {
        const E = S.ovEd
        if (!E || !sel) return { ovEdOpen: false as boolean }
        const allS = E.scope === 'all', O = this.ovState(sel, allS), gFx = S.cfg.overlayFx || 'none', own = !allS && ovOwn(sel)
        const ar = DM.W / DM.H, maxW = Math.min(MB ? vw0 - 56 : 620, vw0 - 60), maxH = MB ? vh0 * 0.3 : vh0 * 0.52
        let pw = maxW, ph = pw / ar
        if (ph > maxH) { ph = maxH; pw = ph * ar }
        const sw = (v: boolean) => ({ track: v ? '#f3f1ec' : '#2b2b2b', knob: v ? '#000000' : '#8a867e', x: v ? '16px' : '2px' })
        const TY: Record<string, string> = { day: 'Møte', text: 'Tekst', contact: 'Kontakt', outro: 'Avslutning' }, tab = (o: boolean) => ({ bg: o ? '#f3f1ec' : 'transparent', fg: o ? '#000000' : '#c9c5bc' })
        const SW = [S.cfg.accent || '#f5b82c', '#ffffff', '#ffd27a', '#ff9fbf', '#9fd8ff', '#8fe3cf', '#b18cff']
        const effOf = (x: Slide) => x.ov?.overlayFx || gFx
        return {
          ovEdOpen: true, ovEdCanvas: this.ovEdCanvas, oePW: Math.round(pw) + 'px', oePH: Math.round(ph) + 'px',
          oeScopeSlide: tab(!allS), oeScopeAll: tab(allS),
          oeToSlide: () => this.setState({ ovEd: { scope: 'slide' } }), oeToAll: () => this.setState({ ovEd: { scope: 'all' } }),
          oeScopeNote: allS ? 'Endringer her gjelder alle slides. Slider med egne innstillinger beholder dem.' : own ? 'Denne sliden har egne innstillinger som overstyrer «Alle slides».' : 'Denne sliden følger innstillingene for alle slides. Endrer du noe her, får sliden egne innstillinger.',
          oeHasOwn: own,
          oeUseAll: () => {
            this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const n = { ...x }; delete n.oAmt; delete n.oSpeed; delete n.oAlpha; delete n.oColor; if (n.ov) { const ov = { ...n.ov }; delete ov.overlayFx; n.ov = ov } return n }) }))
            this.pk = null
          },
          oeSw: sw(O.on), oeOnLabel: allS ? 'Overlegg på alle slides' : 'Overlegg på denne sliden',
          oeToggle: () => { const lastFx = (allS ? S.cfg.ovLast : sel.ovLast) || S.cfg.ovLast || 'bokeh'; this.setOv({ fx: O.on ? 'none' : lastFx }) },
          oeTypes: OVT.map(([v, tt]) => ({ label: tt, bg: O.fx === v ? '#f3f1ec' : '#121212', fg: O.fx === v ? '#000000' : '#f3f1ec', bd: O.fx === v ? '#f3f1ec' : '#2b2b2b', onClick: () => this.setOv({ fx: v }) })),
          oeAmt: Math.round(O.amt * 100), onOeAmt: (ev: InputEv) => this.setOv({ amt: Number(ev.target.value) / 100 }), oeAmt60: () => this.setOv({ amt: 0.6 }),
          oeSpeed: Math.round(O.speed * 100), onOeSpeed: (ev: InputEv) => this.setOv({ speed: Number(ev.target.value) / 100 }), oeSpeed100: () => this.setOv({ speed: 1 }),
          oeTransp: Math.round((1 - O.alpha) * 100), onOeTransp: (ev: InputEv) => this.setOv({ alpha: 1 - Number(ev.target.value) / 100 }), oeTransp0: () => this.setOv({ alpha: 1 }),
          oeColor: O.color, onOeColor: (ev: InputEv) => { const v = ev.target.value; if (hexOk(v)) this.setOv({ color: v }) },
          oeSwList: SW.map((cc) => ({ c: cc, ring: cc.toLowerCase() === String(O.color).toLowerCase() ? '0 0 0 2px #0a0a0a, 0 0 0 4px #f3f1ec' : '0 0 0 1px rgba(255,255,255,0.22)', onClick: () => this.setOv({ color: cc }) })),
          oeSync: S.cfg.overlaySync !== false, onOeSync: (ev: CheckEv) => this.setCfg('overlaySync', ev.target.checked),
          oeSlides: Rz.all.map((x, i) => {
            const fx = effOf(x), v = fx !== 'none', cur = !allS && x.id === id, o2 = sw(v), t2 = OVT.find((q) => q[0] === fx)
            return {
              num: String(i + 1).padStart(2, '0'), kind: TY[x.type] ?? '', title: (x.type === 'day' ? x.title : x.type === 'text' ? x.body : x.type === 'contact' ? x.headline : x.title) || TY[x.type] || '',
              status: !v ? 'Av' : (t2 ? t2[1] : '') + (ovOwn(x) ? ' · egne' : ' · følger alle'), statusColor: !v ? '#6f6b64' : ovOwn(x) ? '#e9e7e2' : '#9d998f',
              border: cur ? '#f3f1ec' : '#2b2b2b', bg: cur ? '#1a1a1a' : '#101010', op: v ? 1 : 0.55, track: o2.track, knob: o2.knob, kx: o2.x,
              onPick: () => { this.select(x.id); this.setState({ ovEd: { scope: 'slide' }, playing: false }); this.pk = null },
              onToggle: (ev?: { stopPropagation(): void }) => {
                ev?.stopPropagation()
                const nv = v ? 'none' : x.ovLast || S.cfg.ovLast || (gFx !== 'none' ? gFx : 'bokeh')
                this.setState((st) => ({ slides: st.slides.map((y) => { if (y.id !== x.id) return y; const ov: SlideOv = { ...(y.ov ?? {}) }; if (nv === gFx) delete ov.overlayFx; else ov.overlayFx = nv; return { ...y, ov, ...(nv !== 'none' ? { ovLast: nv } : {}) } }) }))
                this.pk = null
              },
            }
          }),
          oeOnCount: Rz.all.filter((x) => effOf(x) !== 'none').length + ' av ' + Rz.all.length + ' slides har overlegg',
          oeDone: () => this.setState({ ovEd: null }),
        }
      })(),
      openVigEdAll: () => { if (!id) { this.deps.toast(this.t('Legg til minst én slide først (skriv inn programmet eller trykk «+ Legg til»), så kan du redigere vignetten.')); return } this.setState({ vigEd: { layer: 0, scope: 'all' }, playing: false }); this.hardStopAudio() },
      vigAllSummary: (() => { const o = VIG_TYPE_OPTS.find((x) => x[0] === (S.cfg.vigType || 'auto')), n = (S.cfg.vigs ?? []).length; return (o ? o[1].replace(/ \(.*\)/, '') : '') + (S.cfg.vigRot ? ' · ' + Math.round(S.cfg.vigRot) + '°' : '') + (n ? ' · +' + n + ' ekstra' : '') })(),
      vigSummary: (() => { if (!sel) return ''; const o = VIG_TYPE_OPTS.find((x) => x[0] === (sel.vigType || S.cfg.vigType || 'auto')), n = (sel.vigs ?? []).length; return (o ? o[1].replace(/ \(.*\)/, '') : '') + (sel.vigRot ? ' · ' + Math.round(sel.vigRot) + '°' : '') + (n ? ' · +' + n + ' ekstra' : '') })(),
      ...(() => {
        const E = S.vigEd
        if (!E || !sel) return { vigEdOpen: false as boolean }
        const allS = E.scope === 'all', L = this.vigLayerOf(sel, E.layer, E.scope) ?? this.vigLayerOf(sel, 0, E.scope) ?? this.vigBase(), pc = (v: number) => (v * 100).toFixed(2) + '%'
        const extras = allS ? (S.cfg.vigs ?? []) : (sel.vigs ?? []), n = extras.length
        const ar = DM.W / DM.H, maxW = MB ? vw0 - 56 : Math.max(280, Math.min(vw0 - 60, Math.min(1080, vw0 - 24) - 36 - 18 - 380)), maxH = MB ? vh0 * 0.34 : Math.max(vh0 * 0.6, vh0 - 110)
        let pw = maxW, ph = pw / ar
        if (ph > maxH) { ph = maxH; pw = ph * ar }
        const SW = ['#080808', '#24406e', '#8a2238', '#1e6e4f', '#5e3190', '#b07a1c', '#ffffff']
        const ownKeys = (Object.keys(VSMAP) as VigKey[]).filter((k) => k !== 'x' && k !== 'y').map((k) => VSMAP[k])
        const own = !allS && ownKeys.some((k) => asRec(sel)[k] != null)
        const setExtras = (fn: (l: VigLayer[]) => VigLayer[]) => {
          if (allS) this.setState((st) => ({ cfg: { ...st.cfg, vigs: fn(st.cfg.vigs ?? []) } }))
          else this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, vigs: fn(x.vigs ?? []) } : x)) }))
          this.pk = null
        }
        const tabBtn = (o: boolean) => ({ bg: o ? '#f3f1ec' : 'transparent', fg: o ? '#000000' : '#c9c5bc' })
        const Lsize = L.size == null ? 1 : L.size, Lopen = L.open == null ? 0.5 : L.open
        return {
          vigEdOpen: true, vigEdWrap: this.vigEdWrap, vigEdCanvas: this.vigEdCanvas, onVigEdDown: this.onVigEdDown,
          veScopeSlide: tabBtn(!allS), veScopeAll: tabBtn(allS),
          veToSlide: () => this.setState({ vigEd: { layer: 0, scope: 'slide' } }), veToAll: () => this.setState({ vigEd: { layer: 0, scope: 'all' } }),
          veScopeNote: allS ? 'Endringer her gjelder alle slides og overstyrer det du har endret på enkeltslides.' : own ? 'Denne sliden har egne innstillinger som overstyrer «Alle slides».' : 'Denne sliden følger innstillingene for alle slides. Endrer du noe her, får sliden egne innstillinger.',
          veHasOwn: own && E.layer === 0,
          veUseAll: () => { this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const o = asRec({ ...x }); ownKeys.forEach((k) => delete o[k]); return o as unknown as Slide }) })); this.pk = null },
          vePW: Math.round(pw) + 'px', vePH: Math.round(ph) + 'px', vePos: MB ? 'relative' : 'sticky', veX: pc(L.x), veY: pc(L.y), veRotDeg: L.rot + 'deg', veRot: Math.round(L.rot), veOpen: Math.round(L.open * 100),
          veAmt: Math.round((L.amt == null ? 1 : L.amt) * 100), onVeAmt: (ev: InputEv) => this.setVigLayer({ amt: Number(ev.target.value) / 100 }), veAmt100: () => this.setVigLayer({ amt: 1 }),
          veTransp: Math.round((1 - (L.alpha == null ? 1 : L.alpha)) * 100), onVeTransp: (ev: InputEv) => this.setVigLayer({ alpha: 1 - Number(ev.target.value) / 100 }), veTransp0: () => this.setVigLayer({ alpha: 1 }),
          veSoft: Math.round((L.soft == null ? 0.5 : L.soft) * 100), onVeSoft: (ev: InputEv) => this.setVigLayer({ soft: Number(ev.target.value) / 100 }), veSoft50: () => this.setVigLayer({ soft: 0.5 }),
          veSize: Math.round(Lsize * (0.6 + 0.8 * Lopen) * 100), onVeSize: (ev: InputEv) => this.setVigLayer({ size: (Number(ev.target.value) / 100) * (0.6 + 0.8 * Lopen), open: 0.5 }), veSize100: () => this.setVigLayer({ size: 1, open: 0.5 }),
          veIsExtra: E.layer > 0, veColor: L.color,
          veLayers: [0, ...extras.map((_, i) => i + 1)].map((i) => ({ label: i === 0 ? 'Hovedvignett' : 'Vignett ' + (i + 1), bg: E.layer === i ? '#f3f1ec' : 'transparent', fg: E.layer === i ? '#000000' : '#c9c5bc', onClick: () => this.setState({ vigEd: { ...E, layer: i } }) })),
          veCanAdd: n < 4,
          veAdd: () => { setExtras((l) => [...l, { type: 'round', x: 0.5, y: 0.5, rot: 0, open: 0.5, amt: 0.8, alpha: 1, size: 1, soft: 0.5, color: '#080808' }]); this.setState({ vigEd: { ...E, layer: n + 1 } }) },
          veRemove: () => { const i = E.layer; if (!i) return; setExtras((l) => l.filter((_, j) => j !== i - 1)); this.setState({ vigEd: { ...E, layer: Math.max(0, i - 1) } }) },
          veTypes: VIG_TYPE_OPTS.map(([v, tt]) => ({ label: tt.replace(/ \(.*\)/, ''), bg: L.type === v ? '#f3f1ec' : '#121212', fg: L.type === v ? '#000000' : '#f3f1ec', bd: L.type === v ? '#f3f1ec' : '#2b2b2b', onClick: () => this.setVigLayer({ type: v }) })),
          onVeRot: (ev: InputEv) => this.setVigLayer({ rot: Number(ev.target.value) }),
          veRotL: () => { let v = Math.round(L.rot) - 15; if (v < -180) v += 360; this.setVigLayer({ rot: v }) }, veRotR: () => { let v = Math.round(L.rot) + 15; if (v > 180) v -= 360; this.setVigLayer({ rot: v }) }, veRot0: () => this.setVigLayer({ rot: 0 }),
          onVeOpen: (ev: InputEv) => this.setVigLayer({ open: Number(ev.target.value) / 100 }),
          veSw: SW.map((c) => ({ c, ring: c === String(L.color).toLowerCase() ? '0 0 0 2px #0a0a0a, 0 0 0 4px #f3f1ec' : '0 0 0 1px rgba(255,255,255,0.22)', onClick: () => this.setVigLayer({ color: c }) })),
          onVeColor: (ev: InputEv) => { const v = ev.target.value; if (hexOk(v)) this.setVigLayer({ color: v }) },
          veCenter: () => this.setVigLayer({ x: 0.5, y: 0.5 }),
          ...(() => {
            const gOn = S.cfg.vigOn !== false, onV = allS ? gOn : gOn && !sel.vigOff
            const sw = (v: boolean) => ({ track: v ? '#f3f1ec' : '#2b2b2b', knob: v ? '#000000' : '#8a867e', x: v ? '16px' : '2px' })
            const TY: Record<string, string> = { day: 'Møte', text: 'Tekst', contact: 'Kontakt', outro: 'Avslutning' }
            const ownOf = (x: Slide) => ownKeys.some((k) => asRec(x)[k] != null) || !!x.vigs?.length
            return {
              veSw0: sw(onV), veOnLabel: allS ? 'Vignett på alle slides' : 'Vignett på denne sliden', veOnNote: !allS && !gOn ? 'Vignett er slått av for alle slides under «Alle slides».' : '',
              veToggle: () => { if (allS) this.setCfg('vigOn', !gOn); else { if (!gOn) this.setCfg('vigOn', true); if (id) this.setF(id, 'vigOff', gOn ? !sel.vigOff : false) } this.pk = null },
              veSlides: Rz.all.map((x, i) => {
                const v = gOn && !x.vigOff, cur = !allS && x.id === id, o = sw(v)
                return {
                  num: String(i + 1).padStart(2, '0'), title: (x.type === 'day' ? x.title : x.type === 'text' ? x.body : x.type === 'contact' ? x.headline : x.title) || TY[x.type] || '', kind: TY[x.type] ?? '',
                  status: !v ? 'Av' : ownOf(x) ? 'Egne innstillinger' : 'Følger alle slides', statusColor: !v ? '#6f6b64' : ownOf(x) ? '#e9e7e2' : '#9d998f',
                  border: cur ? '#f3f1ec' : '#2b2b2b', bg: cur ? '#1a1a1a' : '#101010', op: v ? 1 : 0.55, track: o.track, knob: o.knob, kx: o.x,
                  onPick: () => { this.select(x.id); this.setState({ vigEd: { layer: 0, scope: 'slide' }, playing: false }); this.pk = null },
                  onToggle: (ev?: { stopPropagation(): void }) => {
                    ev?.stopPropagation()
                    if (!gOn) { this.setCfg('vigOn', true); this.setState((st) => ({ slides: st.slides.map((y) => (y.id === x.id ? { ...y, vigOff: false } : y)) })) }
                    else this.setF(x.id, 'vigOff', !x.vigOff)
                    this.pk = null
                  },
                }
              }),
              veOnCount: Rz.all.filter((x) => gOn && !x.vigOff).length + ' av ' + Rz.all.length + ' slides har vignett',
            }
          })(),
          veDone: () => this.setState({ vigEd: null }),
        }
      })(),
      hexOpen: !!S.hexPop && !S.hexPop.hidden, eyedropOn: S.eyedrop,
      cancelEyedrop: () => { this.eyedropOn = false; this.setState((st) => ({ eyedrop: false, hexPop: st.hexPop ? { ...st.hexPop, hidden: false } : null })) },
      pickHueColor: S.hexPop ? hsvToHex(S.hexPop.hh || 0, 1, 1) : '#ff0000',
      pickSX: S.hexPop ? ((S.hexPop.ss || 0) * 100).toFixed(1) + '%' : '0%', pickVY: S.hexPop ? ((1 - (S.hexPop.vv == null ? 1 : S.hexPop.vv)) * 100).toFixed(1) + '%' : '0%',
      pickHX: S.hexPop ? (((S.hexPop.hh || 0) / 360) * 100).toFixed(1) + '%' : '0%',
      onPickSV: (e: PEv) => this.dragPick(e, 'sv'), onPickHue: (e: PEv) => this.dragPick(e, 'hue'), startEyedrop: this.startEyedrop, hexX: S.hexPop ? S.hexPop.x + 'px' : '0px', hexY: S.hexPop ? S.hexPop.y + 'px' : '0px',
      hexDraft: S.hexPop ? S.hexPop.draft : '', hexSwatch: S.hexPop ? (normHex(S.hexPop.draft) ?? S.hexPop.val) : '#000000',
      hexBorder: S.hexPop && !normHex(S.hexPop.draft) ? '#ff8f7d' : '#2b2b2b',
      onHexInput: (ev: InputEv) => {
        const d = String(ev.target.value || '').slice(0, 7).toUpperCase(), n = normHex(d)
        if (n && d.replace('#', '').length === 6) this.applyHex(n)
        this.setState((st) => (st.hexPop ? { hexPop: { ...st.hexPop, draft: d, val: n ?? st.hexPop.val, ...(n ? { base: n, tone: 0, warm: 0, ...hexToHsv(n) } : {}) } } : null))
      },
      hexTone: S.hexPop ? S.hexPop.tone || 0 : 0, hexWarm: S.hexPop ? S.hexPop.warm || 0 : 0,
      hexToneLabel: !S.hexPop || !S.hexPop.tone ? '0' : (S.hexPop.tone > 0 ? '+' : '') + S.hexPop.tone,
      hexWarmLabel: !S.hexPop || !S.hexPop.warm ? '0' : (S.hexPop.warm > 0 ? '+' : '') + S.hexPop.warm,
      hexToneBg: S.hexPop ? 'linear-gradient(90deg, ' + adjustHex(S.hexPop.base, -100, S.hexPop.warm || 0) + ', ' + adjustHex(S.hexPop.base, 0, S.hexPop.warm || 0) + ', ' + adjustHex(S.hexPop.base, 100, S.hexPop.warm || 0) + ')' : 'none',
      hexWarmBg: S.hexPop ? 'linear-gradient(90deg, ' + adjustHex(S.hexPop.base, S.hexPop.tone || 0, -100) + ', ' + adjustHex(S.hexPop.base, S.hexPop.tone || 0, 0) + ', ' + adjustHex(S.hexPop.base, S.hexPop.tone || 0, 100) + ')' : 'none',
      onHexTone: (ev: InputEv) => { const P = this.state.hexPop; if (!P) return; const tv = Number(ev.target.value), c = adjustHex(P.base, tv, P.warm || 0); this.applyHex(c); this.setState({ hexPop: { ...P, tone: tv, val: c, draft: c.toUpperCase() } }) },
      onHexWarm: (ev: InputEv) => { const P = this.state.hexPop; if (!P) return; const wv = Number(ev.target.value), c = adjustHex(P.base, P.tone || 0, wv); this.applyHex(c); this.setState({ hexPop: { ...P, warm: wv, val: c, draft: c.toUpperCase() } }) },
      hexAdjReset: () => { const P = this.state.hexPop; if (!P) return; this.applyHex(P.base); this.setState({ hexPop: { ...P, tone: 0, warm: 0, val: P.base, draft: P.base.toUpperCase() } }) },
      onHexKey: (ev: KeyEv) => {
        if (ev.key === 'Enter') { ev.preventDefault(); const n = normHex(this.state.hexPop?.draft); if (n) this.applyHex(n); this.setState({ hexPop: null }) }
        else if (ev.key === 'Escape') { ev.preventDefault(); this.setState({ hexPop: null }) }
      },
      hexWheel: () => {
        const t = this.hexTarget as (HTMLInputElement & { nativeOk?: boolean }) | null
        this.setState({ hexPop: null })
        if (!t) return
        t.nativeOk = true
        try { if (t.showPicker) t.showPicker(); else t.click() } catch { t.click() }
      },
      hexOk: () => { const n = normHex(this.state.hexPop?.draft); if (n) this.applyHex(n); this.setState({ hexPop: null }) },
      editImg: this.editImg, cropIsEdit: !!S.crop?.edit,
      edTabCrop: () => { if (S.crop) return; this.closePan('done'); void this.recropBg() },
      edTabPan: () => { if (!S.crop) return; if (!this.canPanSel()) return; this.finishCrop('cancel'); this.openPan() },
      edPanFg: this.canPanSel() ? '#c9c5bc' : '#5f5b55', edPanTitle: this.canPanSel() ? 'Velg hvilken del av bildet som vises' : 'Bildet passer formatet, så det er ingenting å flytte',
      ...(() => {
        const b = this.bgOf(sel), im = b ? this.media.images[b] : null, ia = im?.naturalWidth ? im.naturalWidth / im.naturalHeight : null, fa = DM.W / DM.H
        const pX = sel && sel.panX != null ? sel.panX : PT ? (sel && sel.fx != null ? sel.fx : 0.66) : 0.5, pY = sel && sel.panY != null ? sel.panY : 0.5
        const canX = !!(ia && ia > fa * 1.02), canY = !!(ia && ia < fa * 0.98)
        return {
          panCanX: canX, panCanY: canY, panShown: false,
          panToggle: this.openPan,
          panModal: S.panOpen && (canX || canY), panWrapRef: this.panWrapRef, onPanFrameDown: this.onPanFrameDown,
          panDone: () => this.closePan('done'), panCancel: () => this.closePan('cancel'),
          panImgBg: b ? cssUrl(S.urls[b] ?? b) : 'none',
          ...(() => {
            if (!ia || !im) return { panDispW: '0px', panDispH: '0px', pfL: '0%', pfT: '0%', pfW: '100%', pfH: '100%' }
            const iw = im.naturalWidth, ih = im.naturalHeight
            const k = Math.min(Math.min(900, vw0 - (MB ? 56 : 120)) / iw, (vh0 * (MB ? 0.5 : 0.6)) / ih)
            const fw = canX ? fa / ia : 1, fh = canY ? ia / fa : 1, pc = (v: number) => (v * 100).toFixed(3) + '%'
            return { panDispW: Math.round(iw * k) + 'px', panDispH: Math.round(ih * k) + 'px', pfW: pc(fw), pfH: pc(fh), pfL: pc(canX ? pX * (1 - fw) : 0), pfT: pc(canY ? pY * (1 - fh) : 0) }
          })(),
          panXPct: Math.round(pX * 100), panYPct: Math.round(pY * 100),
          bgPos: (canX ? Math.round(pX * 100) : 50) + '% ' + (canY ? Math.round(pY * 100) : 50) + '%',
          onPanX: (ev: InputEv) => { if (id) { this.setF(id, 'panX', Number(ev.target.value) / 100); this.pk = null } },
          onPanY: (ev: InputEv) => { if (id) { this.setF(id, 'panY', Number(ev.target.value) / 100); this.pk = null } },
          panReset: () => { if (id) { this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, panX: 0.5, panY: 0.5 } : x)) })); this.pk = null } },
          panHint: 'Dra i bildet (i forhåndsvisningen eller den lille ruten) for å flytte det, eller bruk glidebryteren. ' + (PT && canX ? 'Bildet er bredere enn det stående formatet. Skyv for å velge hvilken del som vises, eller beskjær bildet.' : canX ? 'Bildet er bredere enn formatet. Skyv for å velge hvilken del som vises.' : 'Bildet er høyere enn formatet. Skyv for å velge hvilken del som vises.'),
        }
      })(),
      mobile: MB, asideBackDisp: MB ? 'none' : 'flex', asideHeadPad: MB ? '14px 16px 10px' : '20px 20px 14px', mainExportDisp: MB ? 'none' : 'block',
      rootDir: MB ? 'column' : 'row', rootWrap: MB ? 'nowrap' : 'wrap',
      asideFlex: MB ? 'none' : '1 1 360px', mainFlex: MB ? 'none' : '999 1 560px', paneW: MB ? '100%' : 'auto', rootPadB: MB ? 'calc(106px + env(safe-area-inset-bottom))' : '36px',
      paneH: MB ? 'auto' : 'calc(100vh - 36px)', asideMaxW: MB ? 'none' : '440px', asideBorder: MB ? '0' : '1px solid #262626',
      asideDisplay: MB && pane !== 'edit' ? 'none' : 'flex', mainDisplay: MB && pane !== 'preview' ? 'none' : 'flex',
      mainPad: MB ? '16px 14px' : '24px 28px', canvasMaxH: S.fs ? '100vh' : MB ? '62vh' : 'calc(100vh - 336px)',
      mobileTabs: [['preview', 'Forhåndsvis'], ['edit', 'Rediger']].map(([k = '', l = '']) => {
        const o = pane === k
        return { label: l, bg: o ? '#e9e7e2' : 'transparent', color: o ? '#000' : '#e9e7e2', border: o ? '#e9e7e2' : '#3a3a3a', onClick: () => { this.setState({ mPane: k }); try { window.scrollTo(0, 0) } catch { /* ingenting */ } } }
      }),
      saveOpen: S.saveOpen, saveClosed: !S.saveOpen, saveMsg: S.saveMsg || '',
      hasSaveErr: S.saveOpen && /full|plass|endret av en annen|Kunne ikke|ikke tilgjengelig/i.test(S.saveMsg || ''),
      diskUsage: S.saveTarget === 'f' ? '' : this.diskList().length + ' av 10 plasser brukt.',
      saveNote: S.saveTarget === 'f'
        ? 'Lagres på menighetens disk. Alle i menigheten kan åpne og endre loopen; bare Admin kan slette den. Bilder lastes opp til menighetens Fellesmappe. Video og musikk deles ikke.'
        : ' Lagres på Disk i denne nettleseren. Du finner den igjen i Loop Studio. Video og lydspor lagres ikke.',
      hasSharedDisk: !!this.deps.sharedDisk?.churchId(),
      saveTargetP: S.saveTarget !== 'f', saveTargetF: S.saveTarget === 'f',
      pickSaveP: () => this.setState({ saveTarget: 'p', saveMsg: '' }), pickSaveF: () => this.setState({ saveTarget: 'f', saveMsg: '' }),
      ...(() => {
        const o = !!this.diskId && S.cfg.autoSave === true
        return {
          autoAria: o ? ('true' as const) : ('false' as const), autoTrack: o ? '#e9e7e2' : '#2b2b2b', autoKnob: o ? '#000' : '#8a867e', autoKnobX: o ? '16px' : '2px',
          autoTextColor: o ? '#f3f1ec' : '#9d998f', hasAutoAt: o && !!S.autoAt, autoAtLabel: S.autoAt ? 'lagret ' + S.autoAt : '',
          toggleAuto: () => {
            if (!this.diskId) { this.setState({ saveOpen: true, saveMsg: '', saveName: this.customName || TPL_NAMES[S.tpl] || '', cfg: { ...S.cfg, autoSave: true } }); return }
            this.setCfg('autoSave', !o)
          },
        }
      })(),
      saveBtnLabel: this.diskId || this.sharedEntry ? 'Lagre' : 'Lagre på Disk',
      saveActionLabel: (S.saveTarget === 'f' ? this.sharedEntry : this.diskId) ? 'Lagre endringer' : 'Lagre',
      canSaveAsNew: S.saveTarget === 'f' ? !!this.sharedEntry : !!this.diskId, saveName: S.saveName == null ? '' : S.saveName,
      openSave: () => this.setState({ saveOpen: true, saveMsg: '', saveName: this.customName || TPL_NAMES[S.tpl] || '', saveTarget: this.sharedEntry && !this.diskId ? 'f' : S.saveTarget }),
      closeSave: () => this.setState({ saveOpen: false }),
      onSaveName: (e: InputEv) => this.setState({ saveName: e.target.value.slice(0, 60) }),
      onSaveKey: (e: KeyEv) => { if (e.key === 'Enter') { e.preventDefault(); this.saveToDisk(false) } else if (e.key === 'Escape') this.setState({ saveOpen: false }) },
      doSave: () => this.saveToDisk(false), doSaveNew: () => this.saveToDisk(true),
      timeRef: this.timeRef, isLive: live, isPaused: !live,
      onScrubDown: this.onScrubDown, onScrubMove: this.onScrubMove, onScrubUp: this.onScrubUp,
      stripRef: this.stripRef, trackRef: this.trackRef, fillRef: this.fillRef, headRef: this.headRef,
      onStripScroll: () => { if (!this.autoScrolling) this.stripTouch = performance.now() },
      ...(() => {
        const c = S.cfg
        const cur = Array.isArray(c.panels) && c.panels.length === 5 ? c.panels : DEF_PANELS
        const setP = (i: number, k: 'color' | 'alpha', v: string | number) => this.setState((s) => { const base = Array.isArray(s.cfg.panels) && s.cfg.panels.length === 5 ? s.cfg.panels : DEF_PANELS; return { cfg: { ...s.cfg, panels: base.map((p, j) => (j === i ? { ...p, [k]: v } : p)) } } })
        return {
          panelsOn: true, panelsBg: c.style === 'promo', onPanelsBg: (e: CheckEv) => this.setCfg('style', e.target.checked ? 'promo' : null), panelsCustom: Array.isArray(c.panels), panelsRotate: !!c.panelsRotate,
          panelsRandom: () => { const r = randPanels(); this.setState((st) => ({ cfg: { ...st.cfg, panels: r.panels, panelBg: r.bg } })) },
          panelsReset: () => this.setState((s) => ({ cfg: { ...s.cfg, panels: null, panelsRotate: false, panelBg: null } })),
          onPanelsRotate: (e: CheckEv) => this.setCfg('panelsRotate', e.target.checked),
          panelRows: cur.map((p, i) => ({
            label: 'Panel ' + (i + 1), color: p.color, alphaPct: Math.round((p.alpha == null ? 1 : p.alpha) * 100), swatchOpacity: Math.max(0.25, p.alpha == null ? 1 : p.alpha),
            onColor: (e: InputEv) => { const v = e.target.value; if (hexOk(v)) setP(i, 'color', v) },
            onAlpha: (e: InputEv) => setP(i, 'alpha', Number(e.target.value) / 100),
          })),
        }
      })(),
      addMenuOpen: S.addMenu, addMenuClosed: !S.addMenu, toggleAddMenu: () => this.setState((s) => ({ addMenu: !s.addMenu })),
      quickAdd: [['text', 'Tekst'], ['title', 'Tittel'], ['event', 'Arrangement'], ['qr', 'QR-kode']].map(([k = '', l = '']) => ({ label: l, onClick: () => { this.addBuilt(k, true); this.setState({ addMenu: false }) } })),
      tabCount: String(TABS.length), tabs, isProgram: curTab === 'program', isBuild: curTab === 'build', isSlides: curTab === 'slides', isStyle: curTab === 'style', isFx: curTab === 'fx', isExport: curTab === 'export',
      ...this.buildVals(),
      tplTitle: this.customName || TPL_TITLES[S.tpl || 'week'],

      programText: S.programText, onProgramText: (e: InputEv) => this.setState({ programText: e.target.value }),
      addF: { day: '', date: '', time: '', title: '', place: '', ...(S.addForm ?? {}) }, addMeeting: this.addMeeting,
      addOn: ['day', 'date', 'time', 'title', 'place'].reduce<Record<string, (e: InputEv) => void>>((o, k) => { o[k] = (e: InputEv) => { const v = e.target.value; this.setState((s) => ({ addForm: { ...(s.addForm ?? {}), [k]: v } })) }; return o }, {}),
      addKey: (e: KeyEv) => { if (e.key === 'Enter') { e.preventDefault(); this.addMeeting() } },
      addDays: [['', 'Utenom uka'], ['Mandag', 'Mandag'], ['Tirsdag', 'Tirsdag'], ['Onsdag', 'Onsdag'], ['Torsdag', 'Torsdag'], ['Fredag', 'Fredag'], ['Lørdag', 'Lørdag'], ['Søndag', 'Søndag']].map(([v = '', l = '']) => ({ v, l })),
      applyProgram: this.applyProgram, pickText: () => this.fileText.current?.click(),
      fileRule: this.fileRule, onRuleFile: this.onRuleFile, applyRulesNow: this.applyRulesNow,
      rulesOpen: S.rulesOpen, rulesClosed: !S.rulesOpen,
      openRules: () => {
        this.rulesBak = { rules: (S.cfg.imgRules ?? []).map((r) => ({ ...r })), bgs: S.slides.reduce<Record<string, { bg: string | null | undefined; bgPort: string | null | undefined; ruleId: string | null | undefined }>>((o, x) => { o[x.id] = { bg: x.bg, bgPort: x.bgPort, ruleId: x.ruleId }; return o }, {}) }
        this.setState({ rulesOpen: true, rulesDraft: (S.cfg.imgRules ?? []).map((r) => ({ ...r })) })
      },
      closeRules: () => {
        const b = this.rulesBak
        this.rulesBak = null
        this.setState((s) => (b ? { rulesOpen: false, rulesDraft: null, galleryFor: null, cfg: { ...s.cfg, imgRules: b.rules }, slides: s.slides.map((x) => { const o = b.bgs[x.id]; return o ? { ...x, ...o } : x }) } : { rulesOpen: false, rulesDraft: null, galleryFor: null }))
      },
      saveRules: () => {
        const draft = (this.state.rulesDraft ?? []).map((r) => ({ ...r, kw: String(r.kw || '').trim() })).filter((r) => r.kw || r.bg || r.bgPort)
        this.rulesBak = null
        this.setRules(() => draft, true)
        this.setState({ rulesOpen: false, rulesDraft: null, galleryFor: null, parseMsg: 'Faste bilder er lagret og brukt på slidene.', parseOk: true })
      },
      ruleCount: (S.cfg.imgRules ?? []).filter((r) => r.kw && r.bg).length + ' lagret',
      ruleThumbW: PT ? '40px' : '96px', galAspect: PT ? '9 / 16' : '16 / 9', galCols: PT ? 'repeat(6, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
      rulesOrientNote: PT ? 'Stående format: bildene her brukes bare når videoen er stående. Uten stående bilde brukes det liggende.' : '',
      hasRulesOrientNote: PT,
      rules: (S.rulesDraft ?? []).map((r) => {
        const F = PT ? 'bgPort' : 'bg', b = r[F]
        return {
          kw: r.kw ?? '', thumb: b && (S.urls[b] || !isStored(b)) ? cssUrl(S.urls[b] ?? b) : 'none',
          noImg: !b, hasImg: !!b, clearImg: () => this.draftRules((ds) => ds.map((x) => (x.id === r.id ? { ...x, [F]: null } : x))), galleryOpen: S.galleryFor === r.id, thumbBorder: S.galleryFor === r.id ? '#e9e7e2' : '#2b2b2b',
          galleryLabel: S.galleryFor === r.id ? 'Lukk bildevalg' : b ? (PT ? 'Bytt stående bilde' : 'Bytt bilde') : PT ? 'Velg stående bilde' : 'Velg bilde',
          toggleGallery: () => { if (this.canEditRules()) this.setState((s) => ({ galleryFor: s.galleryFor === r.id ? null : r.id })) },
          upload: () => { this.ruleTarget = r.id; this.fileRule.current?.click() },
          gallery: S.galleryFor !== r.id ? [] : (() => {
            const seen = new Set<string>(), list: string[] = []
            const add = (x: string | null | undefined) => { if (!x || seen.has(x)) return; if (isStored(x) && !S.urls[x]) return; seen.add(x); list.push(x) }
            S.slides.forEach((x) => add(x[F])); (S.cfg.imgRules ?? []).forEach((x) => add(x[F])); (S.rulesDraft ?? []).forEach((x) => add(x[F]))
            return list.map((x) => ({ thumb: cssUrl(S.urls[x] ?? x), border: x === r[F] ? '#e9e7e2' : 'transparent', pick: () => { this.setState({ galleryFor: null }); this.draftRules((ds) => ds.map((y) => (y.id === r.id ? { ...y, [F]: x } : y))) } }))
          })(),
          hits: (() => { const kw = (r.kw ?? '').trim().toLowerCase(); const n = S.slides.filter((x) => x.ruleId === r.id || (!x.ruleId && x.type === 'day' && kw && String(x.title || '').toLowerCase().includes(kw))).length; return n ? n + (n === 1 ? ' slide' : ' slides') : '' })(),
          onKw: (e: InputEv) => {
            if (!this.canEditRules()) return
            const v = e.target.value
            clearTimeout(this.kwT)
            this.draftRules((ds) => ds.map((x) => (x.id === r.id ? { ...x, kw: v } : x)), false)
            this.kwT = setTimeout(() => this.setRules((rs) => rs, true), 900)
          },
          pick: () => { this.ruleTarget = r.id; this.fileRule.current?.click() },
          del: () => {
            if (!this.canEditRules()) return
            if ((r.bg || r.bgPort || r.kw) && !this.deps.confirm(this.t('Slette det faste bildet') + (r.kw ? ' «' + r.kw + '»' : '') + '?\n\n' + this.t('Det fjernes fra Faste bilder i Loop Studio for hele menigheten når du trykker Ferdig. Originalbildet i Felles ressurser eller Fellesmappe blir liggende.'))) return
            this.draftRules((ds) => ds.filter((x) => x.id !== r.id), false)
          },
          fromShared: () => { if (!this.canEditRules()) return; void this.pickShared('faste', (ref) => { this.setState({ galleryFor: null }); this.draftRules((ds) => ds.map((x) => (x.id === r.id ? { ...x, [F]: ref } : x))) }) },
        }
      }),
      addRule: () => { if (this.canEditRules()) this.draftRules((ds) => [...ds, { id: 'r-' + Date.now().toString(36), kw: '', bg: null }], false) },
      rulesEdit: this.canEditRules(), rulesReadOnly: !this.canEditRules(),
      rulesReadOnlyNote: 'Faste bilder forvaltes av Admin i menigheten. Du kan bruke dem på slidene, men ikke endre dem.',
      isDayBg: sel?.type === 'day' && !!sel.title,
      titleImgNote: sel?.type === 'day' && sel.title ? (hasBg ? 'Huskes for «' + sel.title + '». Neste gang «' + sel.title + '» står i programmet, får den dette bildet automatisk. Bytt bilde for å endre det.' : 'Velg et bilde, så får «' + sel.title + '» det automatisk hver gang møtet står i programmet.') : '',
      stdOpen: S.stdOpen, stdClosed: !S.stdOpen, stdDraft: S.stdDraft ?? this.standardText(),
      openStd: () => this.setState({ stdOpen: true, stdDraft: this.standardText() }),
      closeStd: () => this.setState({ stdOpen: false, stdDraft: null }),
      onStdDraft: (e: InputEv) => this.setState({ stdDraft: e.target.value }),
      saveStdDraft: () => { const t = String(this.state.stdDraft || '').trim(); if (!t) return; this.setCfg('standard', t); this.setState({ stdOpen: false, stdDraft: null, parseMsg: 'Standarduken er oppdatert.', parseOk: true }) },
      resetStd: () => this.setState({ stdDraft: '' }),
      loadStandard: this.loadStandard, saveStandard: this.saveStandard, clearText: () => this.setState({ programText: '', parseMsg: '' }),
      pickOcr: () => this.fileOcr.current?.click(), fileOcr: this.fileOcr, onOcrFile: this.onOcrFile,
      ocrLabel: S.busy === 'ocr' ? 'Leser …' : 'Fra bilde',
      hasParseMsg: !!S.parseMsg, parseMsg: S.parseMsg, parseColor: S.parseOk ? '#b9e08a' : '#ff8f7d',

      selTypeLabel: sel ? (TYPE[sel.type] ?? '') : '', selPos: sel ? 'Slide ' + (idx + 1) + ' av ' + all.length : 'Ingen slides',
      prevSlide: () => this.step(-1), nextSlide: () => this.step(1),
      isDay: sel?.type === 'day', isText: sel?.type === 'text', isContact: sel?.type === 'contact', isOutro: sel?.type === 'outro',
      qrXPct: Math.round((sel && sel.qrX != null ? sel.qrX : qrDef.x) * 100),
      qrYPct: Math.round((sel && sel.qrY != null ? sel.qrY : qrDef.y) * 100),
      qrSizeVal: sel?.qrSize || 330,
      onQrX: (e: InputEv) => { if (!id) return; const v = Number(e.target.value) / 100; this.setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, qrX: v, qrY: x.qrY != null ? x.qrY : qrDef.y } : x)) })) },
      onQrY: (e: InputEv) => { if (!id) return; const v = Number(e.target.value) / 100; this.setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, qrY: v, qrX: x.qrX != null ? x.qrX : qrDef.x } : x)) })) },
      onQrSize: (e: InputEv) => { if (id) this.setF(id, 'qrSize', Number(e.target.value)) },
      resetQrPos: () => { if (id) this.setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, qrX: null, qrY: null, qrSize: null } : x)) })) },
      f, on, hasQr: !!qr, qrImgCss: qr ? cssUrl(qr.img) : 'none',
      hasBg, noBg: !hasBg, selBgCss: hasBg ? cssUrl(S.urls[this.bgOf(sel) ?? ''] ?? this.bgOf(sel)) : 'none',
      pickImg: () => this.fileImg.current?.click(),
      pickSharedImg: () => { void this.deps.pickLibrary().then((file) => { if (file) void this.onImgFile({ target: { files: [file], value: '' } }) }) },
      ...(() => {
        const o = orig, hv = !!o?.vid, snd = !o || o.vidSound !== false, mus = !!o?.vidMusic
        const A = '#f3f1ec', AF = '#000000', N = 'transparent', NF = '#9d998f'
        const set = (k: string, v: unknown) => { if (id) { this.setF(id, k, v); this.pk = null } }
        return {
          hasSlideVid: hv, noSlideVid: !hv, pickSlideVid: this.pickSlideVid, removeSlideVid: this.removeSlideVid,
          slideVidName: hv ? o?.vidName || 'Video' : '', slideVidLen: hv ? fmtLen(o?.vidLen || 0) : '',
          vidSoundOn: () => set('vidSound', true), vidSoundOff: () => set('vidSound', false),
          vidMusicOn: () => set('vidMusic', true), vidMusicOff: () => set('vidMusic', false),
          vidSoundOnBg: snd ? A : N, vidSoundOnFg: snd ? AF : NF, vidSoundOffBg: snd ? N : A, vidSoundOffFg: snd ? NF : AF,
          vidMusicOnBg: mus ? A : N, vidMusicOnFg: mus ? AF : NF, vidMusicOffBg: mus ? N : A, vidMusicOffFg: mus ? NF : AF,
          vidSoundIsOn: hv && snd, vidVolPct: Math.round((o?.vidVol != null ? o.vidVol : 1) * 100),
          onVidVol: (e: InputEv) => set('vidVol', Number(e.target.value) / 100),
          vidAudioNote: !hv ? '' : snd && !mus ? 'Du hører lyden fra videoen. Loop-musikken tones ut mens videoen spiller.' : snd && mus ? 'Både videolyden og loop-musikken spilles samtidig.' : !snd && mus ? 'Videoen er dempet. Loop-musikken spiller videre.' : 'Stille: både videolyden og loop-musikken er dempet på denne sliden.',
        }
      })(),
      removeImg: () => {
        if (!id || !sel) return
        const F = this.bgField()
        if (sel.ruleId) { this.setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, [F]: null, ruleId: null } : x)) })); return }
        this.setF(id, F, null)
        if (sel.type === 'day' && sel.title) this.rememberTitle(sel.title, null, F)
      },
      ...(() => {
        const rs = (S.cfg.imgRules ?? []).filter((r) => r.bg || r.bgPort), lr = sel?.ruleId ? (S.cfg.imgRules ?? []).find((r) => r.id === sel.ruleId) : null
        return {
          hasRuleOpts: !!sel && rs.length > 0, rulePickOpen: !!sel && S.rulePickOpen, rulePickBorder: S.rulePickOpen ? '#e9e7e2' : '#2b2b2b',
          rulePickLabel: S.rulePickOpen ? 'Lukk faste bilder' : lr ? 'Bytt fast bilde' : 'Velg fra faste bilder',
          toggleRulePick: () => this.setState((s) => ({ rulePickOpen: !s.rulePickOpen })),
          ruleLinked: !!lr, ruleLinkedName: lr ? lr.kw || 'Uten navn' : '',
          unlinkRule: () => this.setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, ruleId: null } : x)) })),
          rulePickList: !S.rulePickOpen || !sel ? [] : rs.map((r) => {
            const b = (PT ? r.bgPort : r.bg) || r.bg || r.bgPort || ''
            return { name: r.kw || 'Uten navn', thumb: cssUrl(S.urls[b] ?? b), border: sel.ruleId === r.id ? '#e9e7e2' : 'transparent', pick: () => this.setState((s) => ({ rulePickOpen: false, slides: s.slides.map((x) => (x.id === id ? { ...x, ruleId: r.id, bg: r.bg || x.bg, bgPort: r.bgPort || x.bgPort || null } : x)) })) }
          }),
        }
      })(),
      bgSourceNote: sel ? this.bgSource(sel[this.bgField()] || (PT ? sel.bg : null), sel) : '',
      canRemoveBg: !!sel?.[this.bgField()], removeBgLabel: PT ? 'Fjern stående bilde' : 'Fjern bilde',
      pickBgLabel: PT ? (sel?.bgPort ? 'Bytt stående bilde…' : 'Legg til stående bilde…') : 'Bytt bilde…',
      bgHeading: PT ? 'Bakgrunnsbilde · stående' : 'Bakgrunnsbilde', bgAspect: PT ? '9 / 16' : '16 / 9', bgBoxW: PT ? '46%' : '100%',
      portNote: PT && sel && !sel.bgPort ? (sel.bg ? 'Viser det liggende bildet, beskåret. Legg til et stående bilde for å velge utsnittet selv.' : 'Ingen stående bilde ennå.') : '', hasPortNote: !!(PT && sel && !sel.bgPort),
      bgOpacityPct: Math.round((sel && sel.bgOpacity != null ? sel.bgOpacity : 1) * 100),
      onBgOpacity: (e: InputEv) => { if (id) this.setF(id, 'bgOpacity', Number(e.target.value) / 100) },
      ...this.styleVals(sel, orig, id),
      selVigOn: !!sel && !sel.vigOff, onSelVig: (e: CheckEv) => { if (id) this.setF(id, 'vigOff', !e.target.checked) },
      vigCtlOpacity: sel && !sel.vigOff && S.cfg.vigOn !== false ? 1 : 0.4, vigAllOp: S.cfg.vigOn !== false ? 1 : 0.4,
      vigOnAll: S.cfg.vigOn !== false, onVigAll: (e: CheckEv) => this.setCfg('vigOn', e.target.checked),
      vigRot: Math.round(Number(sel?.vigRot) || 0),
      canvasCursor: S.eyedrop ? 'crosshair' : 'default',
      selDur: sel ? Math.min(15, sel.dur) : 5, selDurLocked: !!sel?.vid, selDurOp: sel?.vid ? 0.35 : 1,
      selDurLabel: !sel ? '' : sel.vid ? fmtLen(sel.dur) + ' (følger videoen)' : Math.round(sel.dur * 10) / 10 + ' s' + (customDur ? '' : ' (standard)'),
      onSelDur: (e: InputEv) => { if (id) this.setF(id, 'dur', Number(e.target.value)) },
      selVisible: !!sel && !sel.hidden, onVisible: (e: CheckEv) => { if (id) this.setF(id, 'hidden', !e.target.checked) },
      moveEarlier: () => { if (id) this.move(id, -1) }, moveLater: () => { if (id) this.move(id, 1) },
      moveFirst: () => { if (id) this.reorder(id, 0) }, moveLast: () => { if (id) this.reorder(id, S.slides.length - 1) },
      duplicate: () => { if (id) this.duplicate(id) }, del: () => { if (id) this.del(id) },
      addText: () => this.add('text'), addContact: () => this.add('contact'), addOutro: () => this.add('outro'),

      videoLabel: S.videoName || 'Ingen video valgt', hasVideo: !!S.videoName,
      pickVideo: () => this.fileVideo.current?.click(), removeVideo: this.removeVideo,
      cfgHeader: S.cfg.header ?? '', onHeader: (e: InputEv) => this.setCfg('header', e.target.value),
      cfgTopLabel: S.cfg.topLabel ?? '', onTopLabel: (e: InputEv) => this.setCfg('topLabel', e.target.value),
      swatches: ['#f5b82c', '#ff7a45', '#5cc8ff', '#8fdc6a', '#ffffff'].map((c) => ({ color: c, ring: S.cfg.accent === c ? '0 0 0 2px #161616, 0 0 0 4px #f3f1ec' : 'inset 0 0 0 1px rgba(255,255,255,0.15)', onClick: () => this.setCfg('accent', c) })),
      overlayPct: Math.round(num(S.cfg.overlay, 1) * 100), onOverlay: (e: InputEv) => this.setCfg('overlay', Number(e.target.value) / 100),
      defDur: S.cfg.defDur ?? 5, onDefDur: (e: InputEv) => this.setCfg('defDur', Number(e.target.value)),
      rail: S.cfg.rail !== false, onRail: (e: CheckEv) => this.setCfg('rail', e.target.checked),
      canvasAspect: PT ? '9 / 16' : '16 / 9', dimLabel: DM.W + '×' + DM.H,
      orientOptions: [['land', 'Liggende', '16px', '10px'], ['port', 'Stående', '10px', '16px']].map(([k = '', l = '', iw = '', ih = '']) => { const o = (S.cfg.orient || 'land') === k; return { label: l, iw, ih, bg: o ? '#f3f1ec' : 'transparent', color: o ? '#111' : '#9d998f', onClick: () => this.setOrient(k) } }),
      resOptions: [['1080', '1080p'], ['4k', '4K']].map(([k = '', l = '']) => ({ label: l, bg: S.cfg.res === k ? '#f3f1ec' : 'transparent', color: S.cfg.res === k ? '#111' : '#9d998f', onClick: () => this.setCfg('res', k) })),
      kickerLineOpts: ([[false, 'Ingen'], [true, 'Foran'], ['mid', 'Foran og mellom'], ['both', 'Foran, mellom og etter']] as [boolean | string, string][]).map(([k, l]) => {
        const cur = S.cfg.kickerLine === false ? false : S.cfg.kickerLine === 'both' || S.cfg.kickerLine === 'mid' ? S.cfg.kickerLine : true, o = cur === k
        return { label: l, bg: o ? '#f3f1ec' : 'transparent', color: o ? '#111' : '#9d998f', onClick: () => this.setCfg('kickerLine', k) }
      }),
      exportAudio: S.cfg.exportAudio !== false, onExportAudio: (e: CheckEv) => this.setCfg('exportAudio', e.target.checked),
      exportAudioNote: S.cfg.exportAudio !== false ? 'Lydsporet blir med i både HTML-spilleren og videofilen.' : 'Eksporteres uten lyd. Effektene følger fortsatt takten i sangen.',
      exportSummary: active.length + ' slides i loopen · ' + loopLen + ' per runde · ' + this.fmtLabel() + (S.cfg.audioMode === 'beat' && this.beat() ? ' · synket til ' + Math.round(this.beat()?.bpm ?? 0) + ' BPM' : ''),
      loopLen, htmlLabel: S.busy === 'html' ? 'Pakker filen …' : 'Last ned HTML-spiller', exportHTML: this.exportHTML,
      recording: !!S.rec, notRecording: !S.rec, recPct: S.rec ? S.rec.pct : 0, recWidth: (S.rec ? S.rec.pct : 0) + '%',
      startRec: this.startRec, cancelRec: () => this.stopRec(true),
      recNote: (recMime === null ? 'Opptak krever Chrome eller Edge.' : recMime.includes('mp4') ? 'Lagres som MP4.' : 'Lagres som WebM. Gjør den om til MP4 hvis sendeprogrammet ikke spiller WebM.') + (S.audioName && S.cfg.exportAudio !== false ? ' Lydsporet «' + S.audioName + '» blir med.' : ''),
      htmlNote: [S.audioName && S.cfg.exportAudio !== false ? 'Lydsporet blir med. Sjekk at lyden fra kilden er slått på i sendeprogrammet.' : '', S.slides.some((x) => x.vid && !x.hidden) ? 'Videoer på slidene blir ikke med i HTML-spilleren (bakgrunnsbildet vises i stedet). Bruk MP4-eksport for å få dem med.' : ''].filter(Boolean).join(' '),
      statusLine: S.rec ? 'Tar opp video … ' + S.rec.pct + ' %' : !active.length ? 'Ingen slides ennå – skriv ukens program, eller trykk «Legg til».' : live ? 'Spiller slide ' + (S.playIdx + 1) + ' av ' + active.length + ' · ' + loopLen + ' per runde · ' + this.fmtLabel() : S.tst ? 'Tester effekten på slide ' + (idx + 1) + ' · ' + this.fmtLabel() : sel ? 'Pause · viser slide ' + (idx + 1) + (activeIdx < 0 ? ' (skjult i loopen)' : '') : 'Pause',
      onCanvasDown: this.onCanvasDown, onCanvasMove: this.onCanvasMove, onCanvasDbl: this.onCanvasDbl, onCanvasCtx: this.onCanvasCtx,
      hasInline: !!S.inlineEd, inlineRef: this.inlineRef, inlineVal: S.inlineEd ? S.inlineEd.value : '',
      inlineL: S.inlineEd ? S.inlineEd.left + 'px' : '0px', inlineT: S.inlineEd ? S.inlineEd.top + 'px' : '0px', inlineW: S.inlineEd ? S.inlineEd.width + 'px' : '0px',
      inlineH: S.inlineEd ? S.inlineEd.height + 'px' : '0px', inlineFs: S.inlineEd ? S.inlineEd.fs + 'px' : '16px', inlineHintT: S.inlineEd ? S.inlineEd.top + S.inlineEd.height + 6 + 'px' : '0px',
      onInlineChange: (e: InputEv) => { const v = e.target.value; this.setState((st) => (st.inlineEd ? { inlineEd: { ...st.inlineEd, value: v } } : null)) },
      inlineHint: S.inlineEd?.multi ? 'Enter lagrer · Shift+Enter ny linje · Esc avbryter' : 'Enter lagrer · Esc avbryter',
      onInlineKey: (e: KeyEv) => {
        if (e.key === 'Escape') { e.preventDefault(); this.inlineCancel = true; this.setState({ inlineEd: null }); return }
        if (e.key !== 'Enter') return
        const ed = this.state.inlineEd
        if (e.shiftKey && ed?.multi) {
          e.preventDefault()
          const t = e.target as HTMLTextAreaElement, a = t.selectionStart, b = t.selectionEnd, v = t.value.slice(0, a) + '\n' + t.value.slice(b)
          this.setState((st) => (st.inlineEd ? { inlineEd: { ...st.inlineEd, value: v, height: Math.max(st.inlineEd.height, v.split('\n').length * st.inlineEd.fs * 1.25 + 16) } } : null), () => { const el = this.inlineRef.current; if (el) el.selectionStart = el.selectionEnd = a + 1 })
          return
        }
        e.preventDefault()
        this.commitInline()
      },
      onInlineCommit: (e?: { relatedTarget?: EventTarget | null }) => {
        if (this.inlineCancel) { this.inlineCancel = false; return }
        /* fokus forsvant på grunn av vår egen oppdatering (nettopp åpnet, ikke noe nytt fokus): fortsett å redigere */
        const early = performance.now() - this.inlineAt < 900
        if (!e?.relatedTarget) {
          if (early) { requestAnimationFrame(() => { const el = this.inlineRef.current; if (el && this.state.inlineEd) el.focus({ preventScroll: true }) }); return }
          setTimeout(() => { if (!this.state.inlineEd) return; const el = this.inlineRef.current, a = document.activeElement; if (el && a === el) return; if (a === document.body && !document.hasFocus()) return; this.commitInline() }, 0)
          return
        }
        this.commitInline()
      },
      fileLogo: this.fileLogo, onLogoFile: this.onLogoFile, pickLogo: () => this.fileLogo.current?.click(),
      hasLogo: !!S.cfg.logoSrc, noLogo: !S.cfg.logoSrc,
      logoPreviewCss: S.cfg.logoSrc && (S.urls[S.cfg.logoSrc] || !isStored(S.cfg.logoSrc)) ? cssUrl(S.urls[S.cfg.logoSrc] ?? S.cfg.logoSrc) : 'none',
      logoOn: S.cfg.logoOn !== false, onLogoOn: (e: CheckEv) => this.setCfg('logoOn', e.target.checked),
      removeLogo: () => this.setCfg('logoSrc', null),
      pickLogoShared: () => { void this.pickShared('ressurser', (ref) => this.setState((s) => ({ cfg: { ...s.cfg, logoSrc: ref, logoOn: true } }))) },
      pickBgShared: () => { void this.pickShared('faste', (ref) => this.setSlideBg(ref)) },
      hasCloud: !!this.deps.cloud,
      sharedNote: !this.sharedOn() ? '' : S.sharedExists ? 'Grunnoppsettet (farger, tekst, logo, effekter og Faste bilder) er felles for hele menigheten.' : 'Menigheten har ikke et felles grunnoppsett for denne malen ennå. Første endring du gjør, blir menighetens felles grunnoppsett.',
      logoSize: S.cfg.logoSize || 90, onLogoSize: (e: InputEv) => this.setCfg('logoSize', Number(e.target.value)),
      logoOpacityPct: Math.round((S.cfg.logoOpacity == null ? 1 : S.cfg.logoOpacity) * 100), onLogoOpacity: (e: InputEv) => this.setCfg('logoOpacity', Number(e.target.value) / 100),
      logoCorners: ([['↖', 0.07, 0.15], ['↗', 0.93, 0.15], ['↙', 0.07, 0.85], ['↘', 0.93, 0.85]] as [string, number, number][]).map(([l, x, y]) => ({
        label: l,
        onClick: () => {
          const lr = this.media.lastLogoRect, { W, H } = this.dims(), m = 95 * (Math.min(W, H) / 1080)
          const hw = lr ? lr.w / 2 : 60, hh = lr ? lr.h / 2 : 45
          const nx = x < 0.5 ? (m + hw) / W : (W - m - hw) / W, ny = y < 0.5 ? (m + 110 * (Math.min(W, H) / 1080) + hh) / H : (H - m - hh) / H
          this.setState((s) => ({ cfg: { ...s.cfg, logoX: Math.round(nx * 1000) / 1000, logoY: Math.round(ny * 1000) / 1000 } }))
        },
      })),
      ...(() => {
        const H = DM.H, W = DM.W, M = 95 * DU
        const hx = S.cfg.headerX == null ? M / W : S.cfg.headerX, hy = S.cfg.headerY == null ? M / H : S.cfg.headerY
        const tx = S.cfg.topLabelX == null ? (W - M + 8 * DU) / W : S.cfg.topLabelX, ty = S.cfg.topLabelY == null ? (M + 7 * DU) / H : S.cfg.topLabelY
        return {
          headerXPct: Math.round(hx * 100), headerYPct: Math.round(hy * 100), topXPct: Math.round(tx * 100), topYPct: Math.round(ty * 100),
          onHeaderX: (e: InputEv) => this.setCfg('headerX', Number(e.target.value) / 100), onHeaderY: (e: InputEv) => this.setCfg('headerY', Number(e.target.value) / 100),
          onTopX: (e: InputEv) => this.setCfg('topLabelX', Number(e.target.value) / 100), onTopY: (e: InputEv) => this.setCfg('topLabelY', Number(e.target.value) / 100),
          resetHeaderPos: () => this.setState((s) => ({ cfg: { ...s.cfg, headerX: null, headerY: null } })),
          resetTopPos: () => this.setState((s) => ({ cfg: { ...s.cfg, topLabelX: null, topLabelY: null } })),
        }
      })(),
      logoXPct: Math.round((S.cfg.logoX != null ? S.cfg.logoX : this.media.lastLogoRect ? (this.media.lastLogoRect.x + this.media.lastLogoRect.w / 2) / DM.W : 0.93) * 100),
      logoYPct: Math.round((S.cfg.logoY != null ? S.cfg.logoY : this.media.lastLogoRect ? (this.media.lastLogoRect.y + this.media.lastLogoRect.h / 2) / DM.H : 0.85) * 100),
      onLogoX: (e: InputEv) => this.setCfg('logoX', Number(e.target.value) / 100), onLogoY: (e: InputEv) => this.setCfg('logoY', Number(e.target.value) / 100),
      selShowLogo: !!sel && !sel.noLogo, onSelShowLogo: (e: CheckEv) => { if (id) this.setF(id, 'noLogo', !e.target.checked) },
      ...this.audioVals(active),
      ...this.freeVals(),
      hasFlash: !!S.playFlash, flashPlayIcon: S.playFlash === 'play', flashPauseIcon: S.playFlash === 'pause',
      volOn: S.soundOn && !!S.audioName, volOff: !(S.soundOn && !!S.audioName),
      volIconColor: S.audioName ? (!S.soundOn ? '#8a867e' : '#f3f1ec') : '#5f5b55',
      volTitle: !S.audioName ? 'Ingen musikk ennå – trykk for å legge til under Stil' : !S.soundOn ? 'Slå på lyd i forhåndsvisningen' : 'Demp lyd i forhåndsvisningen',
      volBtn: () => { if (!this.state.audioName) { this.setState({ tab: 'style', mPane: 'edit' }); return } this.toggleSound() },
      toggleSound: this.toggleSound,
      undo: this.undo, redo: this.redo,
      undoOpacity: this.past.length ? 1 : 0.35, redoOpacity: this.future.length ? 1 : 0.35,
      undoCursor: this.past.length ? 'pointer' : 'default', redoCursor: this.future.length ? 'pointer' : 'default',
      playLabel: live ? 'Pause' : 'Spill av', togglePlay: this.togglePlay,
      goExport: () => { this.setState({ tab: 'export', mPane: 'edit' }); if (S.mobile) try { window.scrollTo(0, 0) } catch { /* ingenting */ } },
      canvasRef: this.canvasRef, cards,
      fileVideo: this.fileVideo, fileImg: this.fileImg, fileText: this.fileText, fileSlideVid: this.fileSlideVid, filePip: this.filePip, fileAudio: this.fileAudio, fileLib: this.fileLib,
      onVideoFile: this.onVideoFile, onSlideVidFile: this.onSlideVidFile, onImgFile: this.onImgFile, onTextFile: this.onTextFile, onPipFile: this.onPipFile,
      guideRef: this.guideRef, zoomOuter: this.zoomOuter, fsRef: this.fsRef, selBoxRef: this.selBoxRef, onHandleDown: this.onHandleDown,
      ...this.zoomGuideVals(),
      ...this.selVals(),
      fastIdle: !S.fast, fastBusy: !!S.fast, fastWidth: (S.fast ? S.fast.pct : 0) + '%', fastLabel: S.fast ? S.fast.phase : '',
      fast4k: () => void this.fastExport(true), fast1080: () => void this.fastExport(false), fastCancel: () => { this.fastAbort = true },
      fastUnsupported: !fastOk, fastBtnOp: fastOk ? 1 : 0.4,
      hasFastNote: !fastOk || !!S.fastMsg, fastNote: !fastOk ? 'Krever Chrome, Edge eller Safari 17+.' : S.fastMsg, fastNoteColor: /galt|wrong/.test(S.fastMsg || '') ? '#ff8f7d' : '#9d998f',
    }
  }

  buildVals() {
    const S = this.state, c = S.cfg, cx = asRec(c)
    const chip = (o: boolean) => ({ bg: o ? '#f3f1ec' : 'transparent', color: o ? '#000' : '#9d998f', border: o ? '#f3f1ec' : '#2b2b2b' })
    const toggles: [string, string, boolean][] = [['kenBurns', 'Ken Burns-zoom', true], ['sweep', 'Lysstripe', true], ['duotone', 'Duotone', false], ['kickerBox', 'Boks-etikett', false], ['promoBg', 'Fargepaneler bak', false], ['rail', 'Tidslinje nederst', true], ['logoOn', 'Logo', true]]
    const isOn = (k: string) => (k === 'kickerBox' ? c.kickerStyle === 'box' : k === 'promoBg' ? c.style === 'promo' : cx[k] == null ? !!toggles.find((t) => t[0] === k)?.[2] : !!cx[k])
    const flip = (k: string) => (k === 'kickerBox' ? this.setCfg('kickerStyle', c.kickerStyle === 'box' ? null : 'box') : k === 'promoBg' ? this.setCfg('style', c.style === 'promo' ? null : 'promo') : this.setCfg(k as 'rail', !isOn(k)))
    const cols = [['#e9e7e2', 'Hvit'], ['#8fe3cf', 'Mint'], ['#5cc8ff', 'Himmelblå'], ['#b89cff', 'Lavendel'], ['#ff6b8b', 'Rosa'], ['#f5b82c', 'Gull'], ['#8fdc6a', 'Grønn']]
    const dd = c.defDur || 5
    return {
      buildAdd: [['title', 'Stor tittel', 'Én stor linje'], ['text', 'Tekst', 'Etikett, tekst og undertekst'], ['event', 'Arrangement', 'Dag, tid og navn'], ['quote', 'Sitat', 'Bibelvers eller sitat'], ['qr', 'QR-kode', 'Lenke folk kan skanne'], ['image', 'Bilde', 'Kun bilde, ingen tekst']].map(([k = '', l = '', h = '']) => ({ label: l, hint: h, onClick: () => this.addBuilt(k) })),
      buildPresets: Object.entries(PRESETS).map(([k, p]) => ({ label: p.label, hint: p.hint, ...chip(cx.preset === k), onClick: () => this.applyPreset(k) })),
      buildRandom: () => { const ks = Object.keys(PRESETS).filter((k) => k !== cx.preset); const k = ks[Math.floor(Math.random() * ks.length)]; if (k) this.applyPreset(k) },
      buildToggles: toggles.map(([k, l]) => ({ label: l, ...chip(isOn(k)), onClick: () => flip(k) })),
      buildOverlay: [['none', 'Ingen'], ['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['lines', 'Linjer'], ['snow', 'Snø'], ['newyear', 'Konfetti']].map(([k = '', l = '']) => ({ label: l, ...chip((c.overlayFx || 'none') === k), onClick: () => this.setCfg('overlayFx', k) })),
      buildTempo: ([[3, 'Raskt · 3 s'], [5, 'Middels · 5 s'], [7, 'Rolig · 7 s'], [10, 'Langsomt · 10 s']] as [number, string][]).map(([v, l]) => ({ label: l, ...chip(dd === v), onClick: () => this.setState((s) => ({ cfg: { ...s.cfg, defDur: v }, slides: s.slides.map((x) => ({ ...x, dur: x.type === 'outro' ? Math.min(v, 4) : v })) })) })),
      buildColors: cols.map(([h = '', l = '']) => ({ hex: h, label: l, ring: (c.accent || '').toLowerCase() === h ? '#ffffff' : 'transparent', onClick: () => this.setCfg('accent', h) })),
    }
  }
  /** Fargefilter, fargepaneler, tekstfarger og stil per slide. */
  styleVals(sel: (Slide & { dur: number }) | null, orig: Slide | null, id: string | null) {
    const S = this.state, c = S.cfg, onT = !!c.duotone
    const seg = (list: [string, string][], cur: string, fn: (k: string) => void) => list.map(([k, l]) => ({ label: l, bg: cur === k ? '#f3f1ec' : 'transparent', color: cur === k ? '#111' : '#9d998f', onClick: () => fn(k) }))
    const single = !!c.tintColor, tm = sel?.tintMode || 'auto'
    const SWS = ['#1f6f86', '#b4553a', '#1e3566', '#8fe3cf', '#b89cff', '#ff6b8b', '#f5b82c', '#000000']
    const ov: SlideOv = orig?.ov ?? {}
    const setOvK = (k: keyof SlideOv, v: unknown) => {
      if (!id) return
      this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const o = asRec({ ...(x.ov ?? {}) }); if (v == null) delete o[k]; else o[k] = v; return { ...x, ov: Object.keys(o).length ? (o as SlideOv) : null } }) }))
      this.testSlide(id)
    }
    const D = '— Som standard'
    const rows: [keyof SlideOv, string, [string, string][]][] = [
      ['transFx', 'Overgang inn', [['fade', 'Toning'], ['dip', 'Via svart'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['glitch', 'Glitch'], ['panels', 'Paneler'], ['cut', 'Kutt']]],
      ['textFx', 'Teksteffekt', [['reveal', 'Avdekk'], ['fade', 'Ton inn'], ['slide', 'Gli inn'], ['blur', 'Uskarp'], ['pop', 'Sprett'], ['glitch', 'Glitch'], ['none', 'Ingen']]],
      ['overlayFx', 'Overlegg', [['none', 'Ingen'], ['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['snow', 'Snø'], ['newyear', 'Konfetti'], ['lines', 'Linjer']]],
      ['style', 'Fargepaneler bak', [['promo', 'På'], ['plain', 'Av']]],
      ['kickerStyle', 'Etikett', [['box', 'Boks'], ['plain', 'Vanlig']]],
      ['kenBurns', 'Ken Burns-zoom', [['on', 'På'], ['off', 'Av']]],
      ['sweep', 'Lysstripe', [['on', 'På'], ['off', 'Av']]],
    ]
    const toStore = (k: string, v: string) => (v === '' ? null : k === 'kenBurns' || k === 'sweep' ? v === 'on' : v)
    const toVal = (k: string, v: unknown) => (v == null ? '' : k === 'kenBurns' || k === 'sweep' ? (v ? 'on' : 'off') : String(v))
    const hexOk = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
    const panelVals = (() => {
      const g = Array.isArray(c.panels) && c.panels.length === 5 ? c.panels : DEF_PANELS
      const own = orig && Array.isArray(orig.panels) && orig.panels.length === 5 ? orig.panels : null
      const cur = own ?? g, activeP = ov.style === 'promo' || (!ov.style && c.style === 'promo')
      const open = activeP && S.panelEditFor === id
      const setP = (i: number, k: 'color' | 'alpha', v: string | number) => { if (id) this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const base = Array.isArray(x.panels) && x.panels.length === 5 ? x.panels : g; return { ...x, panels: base.map((p, j) => (j === i ? { ...p, [k]: v } : p)) } }) })) }
      const bg = orig?.panelBg || c.panelBg || '#070b14'
      return {
        selPanelsActive: activeP, panelEditOpen: open, panelEditArrow: open ? '▲' : '▼', panelEditBorder: open ? '#8a867e' : '#2b2b2b',
        togglePanelEdit: () => this.setState((st) => ({ panelEditFor: st.panelEditFor === id ? null : id })),
        selPanelDots: [{ color: bg, op: 1 }, ...cur.map((p) => ({ color: p.color, op: Math.max(0.25, p.alpha == null ? 1 : p.alpha) }))],
        selPanelBg: bg, onSelPanelBg: (e: InputEv) => { const v = e.target.value; if (id && hexOk(v)) this.setF(id, 'panelBg', v) },
        selPanelRows: cur.map((p, i) => ({
          label: 'Panel ' + (i + 1), color: p.color, alphaPct: Math.round((p.alpha == null ? 1 : p.alpha) * 100), swatchOpacity: Math.max(0.25, p.alpha == null ? 1 : p.alpha),
          onColor: (e: InputEv) => { const v = e.target.value; if (hexOk(v)) setP(i, 'color', v) }, onAlpha: (e: InputEv) => setP(i, 'alpha', Number(e.target.value) / 100),
        })),
        selPanelCustom: !!own || !!orig?.panelBg,
        selPanelNote: own || orig?.panelBg ? 'Egne farger bare på denne sliden.' : 'Viser standardfargene fra Effekter. Endrer du her, gjelder det bare denne sliden.',
        selPanelReset: () => { if (id) this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, panels: null, panelBg: null } : x)) })) },
      }
    })()
    const textColors = (() => {
      const ac = isHex(c.accent) ? c.accent : '#e9e7e2', ty = orig ? orig.type : 'text', tcol = orig?.tcol ?? {}
      const Dc: Record<string, string> = { day: ac, time: ac, place: '#e0e0e0', title: '#ffffff', kicker: ac, pill: ac, body: '#ffffff', sub: ty === 'outro' ? ac : '#e0e0e0', headline: '#ffffff', text: '#e0e0e0', email: ac, phone: '#e0e0e0' }
      const tc: Record<string, string> = {}, tcOn: Record<string, (e: InputEv) => void> = {}, tcSet: Record<string, boolean> = {}, tcReset: Record<string, () => void> = {}
      const setT = (k: string, v: string | null) => { if (id) this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const o = { ...(x.tcol ?? {}) }; if (v == null) delete o[k]; else o[k] = v; return { ...x, tcol: Object.keys(o).length ? o : null } }) })) }
      Dc.date = Dc.day ?? ac
      Object.keys(Dc).forEach((k) => { tc[k] = tcol[k] || Dc[k] || ac; tcSet[k] = !!tcol[k]; tcOn[k] = (e: InputEv) => { const v = e.target.value; if (hexOk(v)) setT(k, v) }; tcReset[k] = () => setT(k, null) })
      const dLink = !(orig && orig.dateLink === false)
      if (dLink) { tc.date = tc.day ?? ac; tcOn.date = tcOn.day ?? (() => undefined); tcSet.date = !!tcSet.day; tcReset.date = tcReset.day ?? (() => undefined) }
      else tc.date = tcol.date || tc.day || ac
      const toggleDateLink = () => {
        if (id) this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== id) return x; const lk = x.dateLink === false; const o = { ...(x.tcol ?? {}) }; if (lk) delete o.date; else if (o.day) o.date = o.day; return { ...x, dateLink: lk, tcol: o } }) }))
      }
      return {
        tc, tcOn, tcSet, tcReset, dateLinked: dLink, dateLinkTitle: dLink ? 'Farge koblet til ukedag – trykk for å gi datoen egen farge' : 'Egen farge for dato – trykk for å koble til ukedag', dateLinkColor: dLink ? '#f3f1ec' : '#6f6b64', dateLinkBg: dLink ? '#262626' : 'transparent', toggleDateLink,
        selPanelRandom: () => { if (!id) return; const r = randPanels(); this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, panels: r.panels, panelBg: r.bg } : x)) })) },
      }
    })()
    return {
      tintOn: onT, tintAria: onT ? ('true' as const) : ('false' as const), tintTrack: onT ? '#e9e7e2' : '#2b2b2b', tintKnob: onT ? '#000' : '#8a867e', tintKnobX: onT ? '19px' : '3px',
      tintToggle: () => this.setCfg('duotone', !onT),
      tintSingle: single, tintColor: c.tintColor || '#1f6f86',
      tintSrcOpts: seg([['rot', 'Fra fargepanelene'], ['one', 'Én farge']], single ? 'one' : 'rot', (k) => this.setCfg('tintColor', k === 'one' ? c.tintColor || '#1f6f86' : null)),
      onTintColor: (e: InputEv) => { const v = e.target.value; if (hexOk(v)) this.setCfg('tintColor', v) },
      tintSwatches: SWS.map((h) => ({ hex: h, ring: (c.tintColor || '').toLowerCase() === h ? '#ffffff' : 'transparent', onClick: () => this.setCfg('tintColor', h) })),
      tintBlendOpts: seg([['color', 'Farge'], ['soft', 'Myk'], ['overlay', 'Kontrast'], ['multiply', 'Mørk'], ['screen', 'Lys']], c.tintBlend || 'color', (k) => this.setCfg('tintBlend', k)),
      tintAmtPct: Math.round((c.tintAmt == null ? 0.85 : c.tintAmt) * 100), onTintAmt: (e: InputEv) => this.setCfg('tintAmt', Number(e.target.value) / 100),
      selTintOpts: seg([['auto', 'Som standard'], ['custom', 'Egen farge'], ['off', 'Av']], tm, (k) => { if (id) this.setState((st) => ({ slides: st.slides.map((x) => (x.id === id ? { ...x, tintMode: k, tint: k === 'custom' ? x.tint || c.tintColor || '#1f6f86' : x.tint } : x)) })) }),
      selTintCustom: tm === 'custom', selTint: sel?.tint || '#1f6f86',
      onSelTint: (e: InputEv) => { const v = e.target.value; if (id && hexOk(v)) this.setF(id, 'tint', v) },
      selTintAmtPct: Math.round((sel && sel.tintAmt != null ? sel.tintAmt : c.tintAmt == null ? 0.85 : c.tintAmt) * 100),
      onSelTintAmt: (e: InputEv) => { if (id) this.setF(id, 'tintAmt', Number(e.target.value) / 100) },
      selTintNote: tm === 'auto' ? (onT ? 'Følger fargefilteret under Effekter.' : 'Fargefilteret er av under Effekter.') : tm === 'off' ? 'Ingen fargefilter på denne sliden.' : 'Egen farge bare på denne sliden.',
      ...panelVals,
      ...textColors,
      selPanelOpts: [['', 'Standard'], ['promo', 'På'], ['plain', 'Av']].map(([k = '', l = '']) => { const cur = ov.style || ''; return { label: l, bg: cur === k ? '#f3f1ec' : 'transparent', color: cur === k ? '#111' : '#9d998f', onClick: () => setOvK('style', k || null) } }),
      selOvAny: Object.keys(ov).length > 0,
      slideStyleOpen: S.slideStyleOpen, slideStyleAria: S.slideStyleOpen ? ('true' as const) : ('false' as const), slideStyleArrow: S.slideStyleOpen ? '▲' : '▼',
      slideStyleSummary: (() => { const n = Object.keys(ov).length + (orig && (orig.panels || orig.panelBg) ? 1 : 0); return n ? n + (n === 1 ? ' egen innstilling' : ' egne innstillinger') : 'Følger standard' })(),
      toggleSlideStyle: () => this.setState((st) => ({ slideStyleOpen: !st.slideStyleOpen })),
      selOvReset: () => { if (id) this.setF(id, 'ov', null) },
      selOvRows: rows.map(([k, l, opts]) => {
        const val = toVal(k, ov[k])
        return { label: l, value: val, labelColor: val ? '#f3f1ec' : '#9d998f', border: val ? '#8a867e' : '#2b2b2b', options: [{ v: '', l: D }, ...opts.map(([v, tt]) => ({ v, l: tt }))], onChange: (e: InputEv) => setOvK(k, toStore(k, e.target.value)) }
      }),
    }
  }
  audioVals(active: (Slide & { dur: number })[]) {
    const S = this.state
    const o = this.audioOpts(), dur = S.audioDur || 0, fmt = (x: number) => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0')
    const modes = [['cut', 'Klipp til loopen'], ['fit', 'Tilpass loopen'], ['beat', 'Følg takten'], ['free', 'Spill fritt']]
    const desc: Record<string, string> = {
      cut: 'Sangen starter på nytt hver gang loopen begynner, med myk inn- og uttoning. Lyd og bilde holder alltid følge.',
      fit: 'Slidene gjøres lengre eller kortere, så én runde varer like lenge som sangen. Best for spor som er laget for å loope.',
      beat: 'Tempoet finnes automatisk. Hver slide varer et helt antall takter, så skiftene kommer på første slag, og tekst og bilde beveger seg i rytmen. Sangen starter på nytt når loopen begynner.',
      free: 'Sangen går i sin egen loop uten opphold, uavhengig av slidene. Lyd og bilde følger ikke hverandre.',
    }
    const sum = active.reduce((a, s) => a + s.dur, 0)
    const c = S.cfg, cx = asRec(c), bt = this.beat(), isBeat = c.audioMode === 'beat' && !!S.audioName, bText = isBeat && c.beatText !== false
    const seg = (key: keyof Cfg, def: string, list: [string, string][]) => list.map(([k, l]) => { const on = (c[key] || def) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg(key, k as never) } })
    const SW = ['#f5b82c', '#ff7a45', '#5cc8ff', '#8fdc6a', '#ffffff'], setBpm = (v: number) => this.setCfg('bpm', Math.max(40, Math.min(240, Math.round(v * 100) / 100)))
    const FX = [['step', 'Trinnvis zoom', 'bildet glir et lite hakk nærmere'], ['vig', 'Vignett-puls', 'kantene av bildet mørkner litt']]
    const curFx = (Array.isArray(c.beatExtras) ? c.beatExtras : []).filter((k) => FX.some((fx) => fx[0] === k))
    const tog = (k: string) => this.setCfg('beatExtras', curFx.includes(k) ? curFx.filter((x) => x !== k) : [...curFx, k])
    const ev = (c.beatEvery ?? 0) >= 4 ? (c.beatEvery ?? 8) : 8
    const bi = S.beatInfo
    return {
      hasAudio: !!S.audioName, audioLabel: S.audioName || 'Ingen lyd valgt',
      pickAudio: () => this.fileAudio.current?.click(), fileAudio: this.fileAudio,
      onAudioFile: this.onAudioFile, removeAudio: this.removeAudio,
      fileLib: this.fileLib, onLibFiles: this.onLibFiles, pickLib: () => this.fileLib.current?.click(),
      hasLib: !!S.audioLib.length, noLib: !S.audioLib.length,
      audioLib: S.audioLib.map((t) => { const on = t.name === S.audioName, d = t.dur > 0 ? Math.floor(t.dur / 60) + ':' + String(Math.floor(t.dur % 60)).padStart(2, '0') : ''; return { name: t.name, dur: d, bg: on ? '#161616' : 'transparent', bd: on ? '#e9e7e2' : '#2b2b2b', dot: on ? '#e9e7e2' : '#3a3a3a', use: () => void this.libUse(t.id), del: () => this.libDel(t.id) } }),
      audioVolPct: Math.round((c.audioVol == null ? 0.8 : c.audioVol) * 100),
      onAudioVol: (e: { target: HTMLInputElement }) => {
        const v = Math.max(0, Math.min(1, Number(e.target.value) / 100))
        this.volLive = v
        const lab = e.target.parentElement?.querySelector('[data-vol-pct]')
        if (lab) lab.textContent = Math.round(v * 100) + ' %'
        clearTimeout(this.volT)
        this.volT = setTimeout(() => { this.setCfg('audioVol', v); this.volLive = null }, 300)
      },
      audioModes: modes.map(([k = '', l = '']) => ({ label: l, bg: o.mode === k ? '#f3f1ec' : 'transparent', color: o.mode === k ? '#111' : '#9d998f', onClick: () => this.setAudioMode(k) })),
      audioModeDesc: desc[o.mode] ?? '',
      audioIsFit: o.mode === 'fit', audioNotFree: o.mode !== 'free',
      audioDurLabel: dur ? 'Sangen er ' + fmt(dur) + ((o.mode === 'cut' || o.mode === 'beat') && sum ? ' · loopen er ' + fmt(sum) + (dur - o.offset < sum ? ' – musikken slutter før loopen' : '') : '') : '',
      audioFitNote: o.mode === 'fit' && dur && active.length ? 'Loopen blir ' + fmt(sum) + ', ca. ' + Math.round((sum / active.length) * 10) / 10 + ' s per slide.' : '',
      audioMax: Math.max(0, Math.floor(dur - 3)), audioOffset: c.audioOffset || 0, audioOffsetLabel: fmt(o.offset),
      onAudioOffset: (e: InputEv) => this.setCfg('audioOffset', Number(e.target.value)),
      fadeInVal: o.fadeIn, fadeOutVal: o.fadeOut,
      fadeInLabel: Math.round(o.fadeIn * 10) / 10 + ' s', fadeOutLabel: Math.round(o.fadeOut * 10) / 10 + ' s',
      onFadeIn: (e: InputEv) => this.setCfg('audioFadeIn', Number(e.target.value)), onFadeOut: (e: InputEv) => this.setCfg('audioFadeOut', Number(e.target.value)),
      transOpts: seg('transFx', 'fade', [['fade', 'Toning'], ['dip', 'Via svart'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['glitch', 'Glitch'], ['panels', 'Paneler'], ['cut', 'Kutt']]),
      textOpts: seg('textFx', 'reveal', [['reveal', 'Avdekk'], ['fade', 'Ton inn'], ['slide', 'Gli inn'], ['blur', 'Uskarp'], ['pop', 'Sprett'], ['glitch', 'Glitch'], ['none', 'Ingen']]),
      overlaySync: c.overlaySync !== false,
      fxSpeedPct: Math.round((c.fxSpeed || 1) * 100), onFxSpeed: (e: InputEv) => this.setCfg('fxSpeed', Number(e.target.value) / 100),
      speedFree: !bText, speedByBeat: bText,
      kenBurns: c.kenBurns !== false, onKenBurns: (e: CheckEv) => this.setCfg('kenBurns', e.target.checked),
      sweep: c.sweep !== false, onSweep: (e: CheckEv) => this.setCfg('sweep', e.target.checked),
      beatLive: isBeat, beatOff: !isBeat,
      beatBadge: isBeat ? (bt ? Math.round(bt.bpm) + ' BPM' : 'Analyserer …') : 'Av',
      beatFxDesc: isBeat ? 'Loopen er klippet etter musikken. Skifter, bildeutsnitt og tekst kommer på slagene.' : S.audioName ? 'La skifter, tekst og bildebevegelse følge takten i lydsporet. Blir med i både HTML-spilleren og videofilen.' : 'Last opp et lydspor under «Video og stil», så kan effektene følge takten.',
      enableBeat: () => { if (S.audioName) this.setAudioMode('beat'); else this.setState({ tab: 'style' }) },
      disableBeat: () => this.setAudioMode('cut'),
      enableBeatLabel: S.audioName ? 'Slå på takt-synk' : 'Gå til lydspor',
      beatPulsePct: Math.round((c.beatPulse == null ? 0.6 : c.beatPulse) * 100), onBeatPulse: (e: InputEv) => this.setCfg('beatPulse', Number(e.target.value) / 100),
      beatFxOpts: FX.map(([k = '', l = '', d = '']) => { const on = curFx.includes(k); return { label: l, hint: d, bg: on ? '#f5b82c' : 'transparent', color: on ? '#171206' : '#b3afa6', border: on ? '#f5b82c' : '#2b2b2b', onClick: () => tog(k) } }),
      beatFxHint: curFx.length ? (({ 4: 'På hver takt', 8: 'Annenhver takt', 16: 'Hver 4. takt' } as Record<number, string>)[ev] ?? 'Annenhver takt') + ', på første slag: ' + FX.filter((fx) => curFx.includes(fx[0] ?? '')).map((fx) => fx[2]).join(' og ') + '.' : 'Ingen ekstra effekter valgt. Loopen følger fortsatt takten gjennom skifter, utsnitt og tekst.',
      hasExtras: curFx.length > 0,
      genreOpts: Object.entries(GENRES).map(([k, g]) => ({ value: k, label: g.label })),
      genreVal: c.genre || 'auto', onGenre: (e: InputEv) => this.applyGenre(e.target.value),
      genreDesc: (() => {
        const g = c.genre || 'auto'
        if (g !== 'auto') return (GENRES[g]?.desc ?? '') + ' Finjuster under «Effekter».' + (S.audioName ? '' : ' Last opp et lydspor, så følger effektene takten.')
        if (!S.audioName) return 'Last opp et lydspor, så analyseres sangen og effektene velges automatisk.'
        if (!bi) return 'Analyserer sangen …'
        const bg = 'genre' in bi ? bi.genre : null
        if (!bg || !('clarity' in bi)) return 'Fant ingen tydelig takt i sangen. Velg en sjanger i listen.'
        const rh = bi.clarity >= 1.6 ? 'tydelig rytme' : bi.clarity >= 1.3 ? 'middels tydelig rytme' : 'svak rytme'
        return 'Analysert: høres ut som ' + (GENRES[bg]?.label ?? bg).toLowerCase() + ' (' + Math.round(bi.bpm) + ' BPM, ' + rh + (bi.kick >= 0.45 ? ', mye tromme' : '') + '). ' + (GENRES[bg]?.desc ?? '')
      })(),
      genreReapply: (c.genre || 'auto') === 'auto' && !!(bi && 'genre' in bi && bi.genre), onGenreReapply: () => this.applyGenre('auto'),
      beatPolish: c.beatPolish !== false, onBeatPolish: (e: CheckEv) => this.setCfg('beatPolish', e.target.checked),
      beatLevelOpts: ([[0.6, 'Rolig'], [1, 'Middels'], [1.6, 'Tydelig']] as [number, string][]).map(([k, l]) => { const on = (c.beatLevel || 1) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg('beatLevel', k) } }),
      beatReframe: c.beatReframe !== false, onBeatReframe: (e: CheckEv) => this.setCfg('beatReframe', e.target.checked),
      beatBarsOpts: ([[0, 'Som satt'], [2, '2 takter'], [4, '4 takter'], [8, '8 takter']] as [number, string][]).map(([k, l]) => { const on = (c.beatBars || 0) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg('beatBars', k) } }),
      beatEveryOpts: ([[4, 'Hver takt'], [8, 'Annenhver takt'], [16, 'Hver 4. takt']] as [number, string][]).map(([k, l]) => ({ label: l, bg: ev === k ? '#f3f1ec' : 'transparent', color: ev === k ? '#111' : '#9d998f', onClick: () => this.setCfg('beatEvery', k) })),
      beatText: c.beatText !== false, onBeatText: (e: CheckEv) => this.setCfg('beatText', e.target.checked),
      audioIsBeat: c.audioMode === 'beat',
      bpmLabel: bt ? String(Math.round(bt.bpm * 10) / 10).replace('.', this.deps.lang() === 'en' ? '.' : ',') + ' BPM' : 'Analyserer takten …',
      bpmSub: bt ? (c.bpm ? 'Justert for hånd' : bi && 'guess' in bi && bi.guess ? 'Fant ingen tydelig takt, juster for hånd' : 'Funnet automatisk') + ' · 1 takt = ' + (4 * bt.p).toFixed(2).replace('.', this.deps.lang() === 'en' ? '.' : ',') + ' s' : '',
      bpmMinus: () => { if (bt) setBpm(Math.round(bt.bpm) - 1) }, bpmPlus: () => { if (bt) setBpm(Math.round(bt.bpm) + 1) },
      bpmHalf: () => { if (bt) setBpm(bt.bpm / 2) }, bpmDouble: () => { if (bt) setBpm(bt.bpm * 2) }, bpmAuto: () => this.setCfg('bpm', null),
      beatNudge: c.beatNudge || 0, beatNudgeLabel: ((c.beatNudge ?? 0) > 0 ? '+' : '') + (c.beatNudge || 0) + ' ms', onBeatNudge: (e: InputEv) => this.setCfg('beatNudge', Number(e.target.value)),
      fontOpts: ['Archivo', 'Montserrat', 'Oswald', 'Playfair Display', 'Helvetica'].map((fo) => ({ value: fo, label: fo })), fontVal: c.font || 'Archivo', onFont: (e: InputEv) => this.setFont(e.target.value),
      titleScalePct: Math.round((c.titleScale || 1) * 100), onTitleScale: (e: InputEv) => this.setCfg('titleScale', Number(e.target.value) / 100),
      textScalePct: Math.round((c.textScale || 1) * 100), onTextScale: (e: InputEv) => this.setCfg('textScale', Number(e.target.value) / 100),
      titleSz: this.numF('loop.titleScale', c.titleScale || 1, this.SCALE_U, (v) => this.setCfg('titleScale', Math.round(v * 100) / 100), [0.5, 3]),
      textSz: this.numF('loop.textScale', c.textScale || 1, this.SCALE_U, (v) => this.setCfg('textScale', Math.round(v * 100) / 100), [0.5, 3]),
      accentVal: c.accent ?? '#f5b82c', onAccentPick: (e: InputEv) => this.setCfg('accent', e.target.value),
      accentCustomRing: SW.includes(c.accent ?? '') ? 'inset 0 0 0 1px rgba(255,255,255,0.15)' : '0 0 0 2px #161616, 0 0 0 4px #f3f1ec',
      hasPreset: cx.preset != null,
    }
  }
  zoomGuideVals() {
    const S = this.state
    const mode = S.guideMode || 'none', port = this.portrait(), flip = S.guideFlip || 0, G = this.guideGeo(port)
    const tf = this.guideTransform(port, flip), fx = flip & 1, fy = flip & 2
    return {
      zoomTf: S.zoom && !S.fs ? 'translate(' + S.zoom.x.toFixed(1) + 'px, ' + S.zoom.y.toFixed(1) + 'px) scale(' + S.zoom.z + ')' : 'none',
      zoomed: !!S.zoom && !S.fs,
      zoomFitBgV: S.zoom ? '#f3f1ec' : '#121212', zoomLabelShort: Math.round((S.zoom?.z || 1) * 100) + '%', zoomFitFg: S.zoom ? '#000000' : '#f3f1ec',
      zoomIn: () => this.setZoom((S.zoom?.z || 1) * 1.25), zoomOut: () => this.setZoom((S.zoom?.z || 1) / 1.25), zoomFit: () => { this.cboxCache = null; this.setState({ zoom: null }) },
      isFs: S.fs, enterFs: this.enterFs, exitFs: this.exitFs,
      guideMode: mode, gThirds: mode === 'thirds', gGolden: mode === 'golden', gFib: mode === 'fib', gCanFlip: mode === 'golden' || mode === 'fib',
      gViewBox: G.vb, gTransform: tf, gSpiral: G.spiral, gSquares: G.squares,
      gFibLabels: mode !== 'fib' ? [] : G.labels.map((l) => {
        let cx = l.cx, cy = l.cy
        if (fx) cx = 1618 - cx
        if (fy) cy = 1000 - cy
        const px = port ? cy / 1000 : cx / 1618, py = port ? cx / 1618 : cy / 1000
        return { n: String(l.n), left: (px * 100).toFixed(2) + '%', top: (py * 100).toFixed(2) + '%', fs: Math.max(9, Math.min(16, l.size / 40)) + 'px' }
      }),
      onGuideMode: (e: InputEv) => { const v = e.target.value; this.deps.kv.set('ukeloop.guide', v); this.setState({ guideMode: v }) },
      guideFlip: () => this.setState((st) => { const n = ((st.guideFlip || 0) + 1) % 4; this.deps.kv.set('ukeloop.guideFlip', String(n)); return { guideFlip: n } }),
    }
  }
  selVals() {
    const S = this.state
    return {
      selElLabel: this.selLabel(S.selEl),
      selElPct: (() => { const el = S.selEl; if (!el) return ''; const v = this.selGet(el), d = this.selDefault(el); return Math.round((v / d) * 100) + ' %' })(),
      selReset: () => {
        const el = this.state.selEl
        if (!el) return
        this.selSet(el, this.selDefault(el))
        if (el.kind === 'text') {
          const key = ({ time: 'day', place: 'day', pill: 'kicker', phone: 'email' } as Record<string, string>)[el.field ?? ''] ?? el.field ?? ''
          this.setState((st) => ({ slides: st.slides.map((x) => { if (x.id !== el.id || !x.toff) return x; const t = { ...x.toff }; delete t[key]; return { ...x, toff: Object.keys(t).length ? t : null } }) }))
        }
      },
      selClear: () => this.setState({ selEl: null }),
      selCanDelete: !!S.selEl && ['pip', 'ftext', 'fqr'].includes(S.selEl.kind),
      selDelete: () => {
        const el = this.state.selEl
        if (!el?.id) return
        if (el.kind === 'pip') this.removePip(el.id, el.i ?? 0)
        else if (el.kind === 'ftext') this.removeFtext(el.id, el.i ?? 0)
        else if (el.kind === 'fqr') this.removeFqr(el.id)
        this.setState({ selEl: null })
      },
    }
  }
  /** Fri tekst, QR-kode og bilder som kan dras fritt på sliden. */
  freeVals() {
    const S = this.state
    const freeAdd = [
      { label: 'Tekst', hint: 'Fri tekst hvor som helst', onClick: () => this.addFtext() },
      { label: 'QR-kode', hint: 'Lenke med kontakt', onClick: () => this.addFqr() },
      { label: 'Bilde', hint: 'Fra filer eller galleri', onClick: () => { const sid = this.addTarget(); if (sid) this.addPipFor(sid, null) } },
    ]
    const sl = S.slides.find((x) => x.id === S.selected)
    const chip = (o: boolean) => ({ bg: o ? '#f3f1ec' : 'transparent', color: o ? '#000' : '#b3afa6', border: o ? '#f3f1ec' : '#2b2b2b' })
    if (!sl) return { freeAdd, noFree: true, ftextRows: [] as never[], hasFqr: false, pipRows: [] as never[], ...this.fqrVals(null, () => undefined) }
    const updT = (i: number, patch: Partial<FText>) => this.setState((st) => ({ slides: st.slides.map((x) => (x.id === sl.id ? { ...x, ftexts: (x.ftexts ?? []).map((t, j) => (j === i ? { ...t, ...patch } : t)) } : x)) }))
    const updQ = (patch: Partial<FQr>) => this.setState((st) => ({ slides: st.slides.map((x) => (x.id === sl.id ? { ...x, fqr: { ...(x.fqr ?? {}), ...patch } } : x)) }))
    const updP = (i: number, patch: Partial<Pip>) => this.setState((st) => ({ slides: st.slides.map((x) => (x.id === sl.id ? { ...x, pips: (x.pips ?? []).map((p, j) => (j === i ? { ...p, ...patch } : p)) } : x)) }))
    const q = sl.fqr, isSel = (k: string, i: number) => !!S.selEl && S.selEl.kind === k && S.selEl.id === sl.id && (k === 'fqr' || S.selEl.i === i)
    const pick = (k: string, i: number) => { this.hardStopAudio(); this.setState({ playing: false, selEl: { kind: k, id: sl.id, i } }) }
    return {
      freeAdd,
      noFree: !(sl.ftexts ?? []).length && !q && !(sl.pips ?? []).length,
      ftextRows: (sl.ftexts ?? []).map((t, i) => ({
        label: 'Fri tekst ' + (i + 1), text: t.text || '', border: isSel('ftext', i) ? '#8a867e' : '#2b2b2b',
        sizePct: Math.round((t.size || 1) * 100), color: t.color || '#ffffff',
        onText: (e: InputEv) => updT(i, { text: e.target.value.slice(0, 400) }),
        onSize: (e: InputEv) => updT(i, { size: Math.max(0.2, Number(e.target.value) / 100) }),
        sz: this.numF('loop.ftextSize', t.size || 1, this.FTEXT_U, (v) => updT(i, { size: Math.round(v * 1000) / 1000 }), [0.2, 8]),
        onColor: (e: InputEv) => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) updT(i, { color: v }) },
        onSelect: () => pick('ftext', i), onRemove: () => this.removeFtext(sl.id, i),
        actions: [
          { label: 'Fet', ...chip(t.bold !== false), onClick: () => updT(i, { bold: t.bold === false }) },
          { label: 'Store bokstaver', ...chip(!!t.upper), onClick: () => updT(i, { upper: !t.upper }) },
          { label: 'Bakgrunn', ...chip(!!t.box), onClick: () => updT(i, { box: !t.box }) },
          { label: 'Midtstill', ...chip(false), onClick: () => updT(i, { x: 0.5, y: 0.5 }) },
        ],
      })),
      hasFqr: !!q, fqrBorder: isSel('fqr', 0) ? '#8a867e' : '#2b2b2b',
      fqrCaption: q ? q.caption || '' : '', fqrContact: q ? q.contact || '' : '', fqrSize: q ? Math.round(q.size || 260) : 260, fqrNoUrl: !q?.url,
      ...this.fqrVals(q ?? null, updQ),
      onFqrCaption: (e: InputEv) => updQ({ caption: e.target.value.slice(0, 80) }), onFqrContact: (e: InputEv) => updQ({ contact: e.target.value.slice(0, 80) }),
      onFqrSize: (e: InputEv) => updQ({ size: Number(e.target.value) }), fqrSelect: () => pick('fqr', 0), fqrRemove: () => { this.removeFqr(sl.id); this.setState({ selEl: null }) },
      pipRows: (sl.pips ?? []).map((p, i) => {
        const url = isStored(p.src) ? S.urls[p.src] : p.src, on = S.selEl?.kind === 'pip' && S.selEl.id === sl.id && S.selEl.i === i
        return {
          thumb: url ? cssUrl(url) : 'none', border: on ? '#8a867e' : '#2b2b2b',
          sizePct: Math.round((p.w || 0.3) * 100), radius: Math.round(p.r == null ? 18 : p.r), opPct: Math.round((p.op == null ? 1 : p.op) * 100),
          onSize: (e: InputEv) => updP(i, { w: Math.max(0.03, Number(e.target.value) / 100) }),
          onRadius: (e: InputEv) => updP(i, { r: Number(e.target.value) }),
          onOp: (e: InputEv) => updP(i, { op: Number(e.target.value) / 100 }),
          onSelect: () => { this.hardStopAudio(); this.setState({ playing: false, selEl: { kind: 'pip', id: sl.id, i } }) },
          actions: [
            { label: 'Ramme', ...chip(!!p.border), onClick: () => updP(i, { border: !p.border }) },
            { label: 'Skygge', ...chip(p.shadow !== false), onClick: () => updP(i, { shadow: p.shadow === false }) },
            { label: 'Midtstill', ...chip(false), onClick: () => updP(i, { x: 0.5, y: 0.5 }) },
            { label: 'Bytt bilde', ...chip(false), onClick: () => this.addPipFor(sl.id, i) },
            { label: 'Fjern', ...chip(false), onClick: () => this.removePip(sl.id, i) },
          ],
        }
      }),
    }
  }
  fqrVals(q: FQr | null, updQ: (p: Partial<FQr>) => void) {
    const K: Record<string, [string, string, string, string, string]> = {
      url: ['Nettside', 'Nettadresse', 'www.dinside.no', 'url', 'Åpner nettsiden når noen skanner koden.'],
      email: ['E-post', 'E-postadresse', 'navn@eksempel.no', 'email', 'Åpner en ny e-post til adressen. Emnet fylles inn automatisk hvis du skriver det.'],
      tel: ['Telefon', 'Telefonnummer', '+47 900 00 000', 'tel', 'Ringer nummeret når noen skanner koden.'],
      sms: ['SMS', 'Mobilnummer', '+47 900 00 000', 'tel', 'Åpner en ny SMS til nummeret, eventuelt med ferdig tekst.'],
      text: ['Tekst', 'Tekst i koden', 'F.eks. Vipps 123456', 'text', 'Viser teksten på telefonen når noen skanner koden.'],
    }
    const kind = q?.kind || (q?.url ? (/^mailto:/i.test(q.url) ? 'email' : /^tel:/i.test(q.url) ? 'tel' : /^sms/i.test(q.url) ? 'sms' : 'url') : 'url')
    const val = q ? (q.val != null ? q.val : String(q.url || '').replace(/^(mailto:|tel:|sms:)/i, '')) : ''
    const build = (k: string, v0: string, x0: string) => {
      const v = String(v0 || '').trim(), x = String(x0 || '').trim()
      if (!v) return ''
      if (k === 'email') return 'mailto:' + v.replace(/\s+/g, '') + (x ? '?subject=' + encodeURIComponent(x) : '')
      if (k === 'tel') return 'tel:' + v.replace(/[^\d+]/g, '')
      if (k === 'sms') return 'sms:' + v.replace(/[^\d+]/g, '') + (x ? '?body=' + encodeURIComponent(x) : '')
      if (k === 'text') return v
      return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v
    }
    const setK = (k: string, v: string, x: string) => updQ({ kind: k, val: v, extra: x, url: build(k, v, x).slice(0, 600) })
    const ex = q ? q.extra || '' : ''
    const KK = K[kind] ?? K.url ?? ['', '', '', '', '']
    return {
      fqrKinds: Object.entries(K).map(([k, d]) => ({ label: d[0], bg: kind === k ? '#f3f1ec' : 'transparent', color: kind === k ? '#111' : '#9d998f', onClick: () => setK(k, val, ex) })),
      fqrValLabel: KK[1], fqrValPh: KK[2], fqrValMode: KK[3] as 'url' | 'email' | 'tel' | 'text', fqrHint: KK[4], fqrVal: val,
      onFqrVal: (e: InputEv) => setK(kind, e.target.value.slice(0, 400), ex),
      fqrHasExtra: kind === 'email' || kind === 'sms', fqrExtraLabel: kind === 'email' ? 'Emne (valgfritt)' : 'Ferdig melding (valgfritt)', fqrExtraPh: kind === 'email' ? 'F.eks. Påmelding' : 'F.eks. Jeg vil være med', fqrExtra: ex,
      onFqrExtra: (e: InputEv) => setK(kind, val, e.target.value.slice(0, 120)),
    }
  }
}

type KeysOfUnion<T> = T extends T ? keyof T : never
type Merge<T> = { [K in KeysOfUnion<T>]: T extends Record<K, infer V> ? V : undefined }
/** Alle verdiene visningen kan bruke (grenene i view() slått sammen; felt som mangler i en gren, er undefined). */
export type LoopView = Merge<ReturnType<LoopController['view']>>
