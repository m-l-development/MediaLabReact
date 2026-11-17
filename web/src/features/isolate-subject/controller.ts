import type { MessageKey } from '../../shared/i18n/messages'
import { createStore, type Store } from '../../shared/lib/store'
import { blurArea, colorArea } from './engine/blur'
import { FillRunner } from './engine/fill'
import { defaultGrow } from './engine/inpaint'
import { pendingMask, applyKeyMask, hitMark, type Mark } from './engine/marks'
import { colorKey, cropBox, hasContent, invertMask, isGraphic, maxMask, refineMask, subtractMask, textStrokes, type Mask } from './engine/mask'
import { ACCEPT, cloneCanvas, crop, keyBox, loadToCanvas, makeCanvas, maskCanvas, MAX_BYTES, putRgba, rgbaOf, toBlob } from './engine/raster'
import { AiSegmenter } from './engine/segment-client'
import { StallError, type ModelKey, type Phase } from './engine/segmenter'

export type Kind = 'person' | 'object' | 'logo' | 'text'
/** Valgene i fanene «Hva skal beholdes» og «Hva skal fjernes» (typene + bakgrunnen). */
export type Target = Kind | 'background'
export type Mode = Kind | 'point' | null
/** Hva som skjer med det som fjernes: fyll med omgivelsene (AI), gjør uskarpt, gjennomsiktig eller en farge. */
export type FillMode = 'fill' | 'blur' | 'clear' | 'color'
export type Aspect = 'free' | 'orig' | number
export interface CropRect { x: number; y: number; w: number; h: number }

export interface UiState {
  phase: 'empty' | 'crop' | 'work'
  mode: Mode
  busy: Phase | 'fill' | null
  pct: number
  soft: number
  tight: number
  cropToSubject: boolean
  /** Hva «Fjern» gjør med det merkede: fyll med omgivelsene (AI), gjør uskarpt, gjennomsiktig eller farge. */
  fillMode: FillMode
  /** Det samme i «Finjuster masken» (det som fjernes med pensel, former og «Velg objekt»). */
  editFill: Exclude<FillMode, 'blur'>
  /** Fargen for «Farge». */
  fillColor: string
  /** Fanen som vises: «Hva skal beholdes» eller «Hva skal fjernes» (bestemmer også fargen på merker i bildet). */
  tab: 'keep' | 'remove'
  /** Valgt under «Hva skal beholdes» / «Hva skal fjernes». Et valg står bare i én av dem. */
  keepSet: Target[]
  removeSet: Target[]
  /** Styrken på uskarpheten (1–100). */
  blur: number
  /** Hvor mange piksler det merkede utvides (kanter og skygger rundt objektet). */
  edge: number
  /** Resultatet av «Fyll med omgivelser» eller «Gjør uskarp» vises, og kan justeres, brukes eller avbrytes. */
  pending: 'fill' | 'blur' | 'color' | null
  /** Antall steg «Gjør om» kan ta. */
  redoSize: number
  bgType: 'none' | 'color'
  bg: string
  cmp: number
  error: MessageKey | null
  note: MessageKey | null
  name: string
  dims: string
  ready: boolean
  marks: Mark[]
  markKeep: boolean
  historySize: number
  done: boolean
  adv: boolean
  crop: CropRect
  aspect: Aspect
  /** Endres når bildet eller masken endres, så visningen tegnes på nytt. */
  frame: number
  /** «Finjuster masken»: den felles maskeredigeringen vises i stedet for resultatet. */
  editing: boolean
}

export const COLORS: readonly { hex: string; label: MessageKey }[] = [
  { hex: '#ffffff', label: 'isolate.color.white' },
  { hex: '#000000', label: 'isolate.color.black' },
  { hex: '#e4e1da', label: 'isolate.color.lightGrey' },
  { hex: '#1d3557', label: 'isolate.color.navy' },
  { hex: '#2a9d8f', label: 'isolate.color.teal' },
  { hex: '#e9c46a', label: 'isolate.color.yellow' },
  { hex: '#e76f51', label: 'isolate.color.coral' },
  { hex: '#9b2c4a', label: 'isolate.color.burgundy' },
]

const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 }

const initial = (): UiState => ({
  phase: 'empty', mode: null, busy: null, pct: 0, soft: 0, tight: 0, cropToSubject: false, fillMode: 'fill', editFill: 'fill', fillColor: '#ffffff', tab: 'keep', keepSet: [], removeSet: [], blur: 50, edge: 4, pending: null, redoSize: 0, bgType: 'none',
  bg: '#ffffff', cmp: 0, error: null, note: null, name: '', dims: '', ready: false, marks: [], markKeep: true,
  historySize: 0, done: false, adv: false, crop: FULL, aspect: 'free', frame: 0, editing: false,
})

interface Snapshot {
  src: HTMLCanvasElement
  alpha: Mask | null
  pend: Mask | null
  marks: Mark[]
  mode: Mode
  ready: boolean
  note: MessageKey | null
  markKeep: boolean
}

/** Bildepunkt i andeler (0–1) + om trykket var innenfor bildet. */
export interface ImagePoint { x: number; y: number; inside: boolean }

/**
 * Isolate Subject: tilstand og operasjoner utenfor React (lerreter og masker er store). React leser `state` og tegner.
 * Samme flyt som dagens verktøy: opplasting → beskjæring → velg type eller merk i bildet → bakgrunn → finjuster → last ned.
 * Motivets piksler endres aldri, bortsett fra «Fyll med omgivelser», som brukeren må velge selv.
 */
export class IsolateController {
  readonly state: Store<UiState> = createStore(initial())
  private orig: HTMLCanvasElement | null = null
  private base: HTMLCanvasElement | null = null
  private src: HTMLCanvasElement | null = null
  private alpha: Mask | null = null
  private pend: Mask | null = null
  private history: Snapshot[] = []
  private future: Snapshot[] = []
  /** Bildet før «Fyll med omgivelser»/«Gjør uskarp» og det merkede (så resultatet kan justeres og lages på nytt). */
  private effect: { before: HTMLCanvasElement; mask: Mask } | null = null
  /** Bildet og masken før siste «Gjennomfør isolering»: et nytt forsøk med andre valg starter herfra (ikke oppå forrige). */
  private lastRun: { src: HTMLCanvasElement; alpha: Mask | null } | null = null
  /** Masken da «Finjuster masken» ble åpnet (det som fjernes i redigeringen, finnes ved å sammenligne). */
  private editStart: Mask | null = null
  private filler = new FillRunner()
  private seed = 0
  private token = 0
  private alive = true
  private refined: { alpha: Mask; tight: number; soft: number; result: ReturnType<typeof refineMask> } | null = null
  private out: HTMLCanvasElement | null = null
  private segmenter = new AiSegmenter()

  private set(patch: Partial<UiState>) {
    this.state.set((s) => ({ ...s, ...patch }))
  }

  private redraw(patch: Partial<UiState> = {}) {
    this.state.set((s) => ({ ...s, ...patch, frame: s.frame + 1 }))
  }

  get source(): HTMLCanvasElement | null {
    return this.src
  }

  get original(): HTMLCanvasElement | null {
    return this.orig
  }

  // ---------- Opplasting og beskjæring ----------

  async load(file: Blob, name = 'bilde'): Promise<void> {
    if (!ACCEPT.test(file.type) || file.size > MAX_BYTES) {
      this.set({ error: 'isolate.error.fileType' })
      return
    }
    let canvas: HTMLCanvasElement
    try {
      canvas = await loadToCanvas(file)
    } catch {
      this.set({ error: 'isolate.error.read' })
      return
    }
    this.token++
    this.orig = canvas
    this.src = null
    this.base = null
    this.alpha = null
    this.pend = null
    this.out = null
    this.refined = null
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
    this.segmenter.forgetImage()
    const clean = name.replace(/\.[^.]+$/, '').replace(/[^\wæøåÆØÅ .-]+/g, '').trim().slice(0, 60) || 'bilde'
    this.set({ ...initial(), phase: 'crop', name: clean, dims: `${canvas.width} × ${canvas.height}`, frame: this.state.get().frame + 1 })
  }

  private aspectRatio(aspect: Aspect): number {
    const o = this.orig
    if (aspect === 'free' || !o) return 0
    return ((aspect === 'orig' ? o.width / o.height : aspect) * o.height) / o.width
  }

  setAspect(aspect: Aspect): void {
    const rn = this.aspectRatio(aspect)
    if (!rn) {
      this.set({ aspect })
      return
    }
    let w = 1
    let h = 1 / rn
    if (h > 1) {
      h = 1
      w = rn
    }
    this.set({ aspect, crop: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } })
  }

  /** Dra i beskjæringsrammen. `handle` = 'move', 'nw', 'ne', 'sw', 'se' eller 'new'. */
  dragCrop(handle: string, start: { x: number; y: number }, now: { x: number; y: number }, c0: CropRect): void {
    if (handle === 'move') {
      this.set({ crop: { x: Math.min(1 - c0.w, Math.max(0, c0.x + now.x - start.x)), y: Math.min(1 - c0.h, Math.max(0, c0.y + now.y - start.y)), w: c0.w, h: c0.h } })
      return
    }
    const ax = handle === 'new' ? start.x : handle === 'nw' || handle === 'sw' ? c0.x + c0.w : c0.x
    const ay = handle === 'new' ? start.y : handle === 'nw' || handle === 'ne' ? c0.y + c0.h : c0.y
    const sx = now.x >= ax ? 1 : -1
    const sy = now.y >= ay ? 1 : -1
    const rn = this.aspectRatio(this.state.get().aspect)
    let w = Math.abs(now.x - ax)
    let h = Math.abs(now.y - ay)
    if (rn) {
      if (w / Math.max(h, 1e-6) > rn) w = h * rn
      else h = w / rn
      const wx = sx > 0 ? 1 - ax : ax
      const hy = sy > 0 ? 1 - ay : ay
      if (w > wx) {
        w = wx
        h = w / rn
      }
      if (h > hy) {
        h = hy
        w = h * rn
      }
    }
    this.set({ crop: { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h } })
  }

  /** En ramme som er for liten etter dragging, rulles tilbake. */
  endCropDrag(previous: CropRect): void {
    const c = this.state.get().crop
    if (c.w < 0.02 || c.h < 0.02) this.set({ crop: previous })
  }

  cropDims(): string {
    const o = this.orig
    const c = this.state.get().crop
    return o ? `${Math.round(c.w * o.width)} × ${Math.round(c.h * o.height)}` : ''
  }

  private startWork(src: HTMLCanvasElement) {
    this.token++
    this.src = src
    this.base = src
    this.alpha = null
    this.pend = null
    this.out = null
    this.refined = null
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
    this.segmenter.forgetImage()
    this.redraw({ phase: 'work', mode: null, marks: [], busy: null, error: null, note: null, dims: `${src.width} × ${src.height}`, cmp: 0, ready: false, done: false, historySize: 0, redoSize: 0, editing: false, pending: null, edge: defaultGrow(src.width, src.height) })
  }

  cropOk(): void {
    const o = this.orig
    if (!o) return
    const c = this.state.get().crop
    const W = o.width
    const H = o.height
    const x = Math.round(c.x * W)
    const y = Math.round(c.y * H)
    const w = Math.max(1, Math.min(W - x, Math.round(c.w * W)))
    const h = Math.max(1, Math.min(H - y, Math.round(c.h * H)))
    this.startWork(x === 0 && y === 0 && w === W && h === H ? o : crop(o, x, y, w, h))
  }

  cropSkip(): void {
    if (!this.orig) return
    this.set({ crop: FULL, aspect: 'free' })
    this.startWork(this.orig)
  }

  recrop(): void {
    if (this.state.get().busy || !this.orig) return
    this.token++
    this.src = null
    this.pend = null
    this.alpha = null
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
    this.redraw({ phase: 'crop', mode: null, marks: [], ready: false, historySize: 0, error: null, note: null, editing: false })
  }

  // ---------- Historikk ----------

  private current(): Snapshot | null {
    if (!this.src) return null
    const s = this.state.get()
    return { src: this.src, alpha: this.alpha, pend: this.pend, marks: s.marks, mode: s.mode, ready: s.ready, note: s.note, markKeep: s.markKeep }
  }

  /** Lagrer tilstanden før en endring. En ny endring tømmer «Gjør om» og avslutter en åpen forhåndsvisning (den brukes). */
  private snap() {
    const c = this.current()
    if (!c) return
    this.history = [...this.history, c].slice(-20)
    this.future = []
    this.effect = null
    this.lastRun = null
    this.set({ historySize: this.history.length, redoSize: 0, pending: null })
  }

  private back(h: Snapshot) {
    this.token++
    this.effect = null
    this.lastRun = null
    if (h.src !== this.src) {
      this.src = h.src
      this.segmenter.forgetImage()
    }
    this.alpha = h.alpha
    this.pend = h.pend
    this.redraw({ historySize: this.history.length, redoSize: this.future.length, marks: h.marks, mode: h.mode, ready: h.ready, note: h.note, error: null, cmp: 0, editing: false, pending: null })
  }

  undo(): void {
    const h = this.history[this.history.length - 1]
    const c = this.current()
    if (this.state.get().busy || !h || !c) return
    this.history = this.history.slice(0, -1)
    this.future = [...this.future, c].slice(-20)
    this.back(h)
  }

  /** «Gjør om»: tar tilbake det siste «Angre» tok bort. */
  redo(): void {
    const h = this.future[this.future.length - 1]
    const c = this.current()
    if (this.state.get().busy || !h || !c) return
    this.future = this.future.slice(0, -1)
    this.history = [...this.history, c].slice(-20)
    this.back(h)
  }

  canRestore(): boolean {
    const s = this.state.get()
    return !!this.src && !!(this.alpha || this.pend || s.marks.length || s.mode || this.src !== this.base)
  }

  restore(): void {
    if (!this.canRestore()) return
    this.snap()
    this.token++
    this.lastRun = null
    if (this.base && this.src !== this.base) {
      this.src = this.base
      this.segmenter.forgetImage()
    }
    this.alpha = null
    this.pend = null
    this.redraw({ mode: null, marks: [], ready: false, note: null, error: null, cmp: 0, busy: null, editing: false })
  }

  // ---------- Hva skal beholdes / hva skal fjernes ----------

  /** Bytter fane. Merker i bildet får fanens farge (grønn = behold, rød = fjern). */
  setTab(tab: 'keep' | 'remove'): void {
    this.set({ tab, markKeep: tab === 'keep' })
  }

  /** Velger eller fjerner et valg i fanen som vises. Står valget i den andre fanen, flyttes det hit (siste valg gjelder). */
  toggle(t: Target): void {
    const s = this.state.get()
    if (s.busy) return
    const keep = s.tab === 'keep'
    const mine = keep ? s.keepSet : s.removeSet
    const other = keep ? s.removeSet : s.keepSet
    const on = mine.includes(t)
    const nextMine = on ? mine.filter((x) => x !== t) : [...mine, t]
    const nextOther = other.filter((x) => x !== t)
    const note: MessageKey | null = !on && other.includes(t) ? (keep ? 'isolate.run.movedKeep' : 'isolate.run.movedRemove') : null
    this.set(keep ? { keepSet: nextMine, removeSet: nextOther, note, error: null } : { removeSet: nextMine, keepSet: nextOther, note, error: null })
  }

  canRun(): boolean {
    const s = this.state.get()
    return !!this.src && !s.busy && !s.editing && (s.keepSet.length > 0 || s.removeSet.length > 0 || s.marks.length > 0)
  }

  /**
   * «Gjennomfør isolering»: alle valgene i én operasjon, med de eksisterende modellene og «Fyll med omgivelser».
   * - Er noe valgt under «Behold», blir alt annet gjennomsiktig. Er bare «Fjern» brukt, eller er Bakgrunn valgt under
   *   «Behold», beholdes alt som ikke er valgt under «Fjern».
   * - Fjern går foran Behold der de overlapper (en logo på en bakgrunn som beholdes, fjernes).
   * - Grønne merker beskytter det de treffer. Er ingenting annet valgt, isolerer de det merkede.
   * - Det som fjernes (typer og røde merker) får valgt metode: fyll med omgivelser, uskarpt, gjennomsiktig eller farge.
   *   Bakgrunnen blir gjennomsiktig (eller fargen under «Bakgrunn»).
   * - Objekt er motivet modellen finner, minus personen når Person også er valgt.
   * - Logo og tekst finnes automatisk når bakgrunnen er ensfarget; ellers merkes de i bildet.
   * Et nytt forsøk rett etter starter fra bildet før forrige forsøk, så valgene kan endres uten å begynne på nytt.
   */
  async run(): Promise<void> {
    if (!this.canRun() || !this.src) return
    const s = this.state.get()
    const base = this.lastRun ?? { src: this.src, alpha: this.alpha }
    const src = base.src
    const W = src.width
    const H = src.height
    const tok = ++this.token
    const stale = () => tok !== this.token || !this.alive
    const want = new Set<Target>([...s.keepSet, ...s.removeSet])
    // Bakgrunn under «Behold»: resten av bildet beholdes (ingen isolering), bare det under «Fjern» fjernes
    const keepAll = s.keepSet.includes('background')
    if (keepAll && !s.removeSet.includes('background')) want.delete('background')
    this.set({ busy: 'run', pct: 0, error: null, note: null })
    try {
      const model = async (key: ModelKey): Promise<Mask | null> => {
        if (stale()) return null
        this.set({ busy: this.segmenter.isModelLoaded(key) ? 'run' : 'model', pct: 0 })
        return this.segmenter.removeBackground(key, src, (b) => !stale() && this.set({ busy: b }), (p) => !stale() && this.set({ pct: p }))
      }
      let note: MessageKey | null = null
      const P = want.has('person') ? await model('fast') : null
      const F = want.has('object') || want.has('background') ? await model('fine') : null
      let L: Mask | null = null
      const textish = (t: Target) => t === 'logo' || t === 'text'
      if (want.has('logo') || want.has('text')) {
        L = colorKey(rgbaOf(src), W, H)
        // Fargenøkkelen gjelder bare en grafikk på ensfarget bakgrunn (en logofil). I et foto med mørk kant ville den tatt
        // med alt som er lyst (personen, instrumenter): da gjelder bare det brukeren har merket i bildet.
        if (L) {
          let n = 0
          for (let i = 0; i < L.length; i++) if ((L[i] as number) > 127) n++
          if (n > 0.5 * W * H || !isGraphic(rgbaOf(src), L)) L = null
        }
        if (L && s.keepSet.some(textish) && s.marks.some((m) => m.keep)) L = null
      }
      if (stale()) return
      // Fjerne logo/tekst automatisk bare når fargenøkkelen fant en grafikk: ikke når brukeren har merket den selv, ikke
      // når «logoen» dekker over halve bildet, er personen/motivet eller har fotofarger (et foto med mørke kanter)
      if (L && s.removeSet.some(textish)) {
        const fg = P && F ? maxMask(P, F) : (P ?? F)
        let n = 0
        let over = 0
        for (let i = 0; i < L.length; i++) {
          if ((L[i] as number) < 128) continue
          n++
          if (fg && (fg[i] as number) > 127) over++
        }
        if (s.marks.some((m) => !m.keep) || n > 0.5 * W * H || over > 0.3 * n || !isGraphic(rgbaOf(src), L)) L = null
      }
      const parts: Record<Target, Mask | null> = { person: P, object: F && P ? subtractMask(F, P) : F, logo: L, text: L, background: null }
      if (want.has('background') && F) parts.background = invertMask([P, L].reduce<Mask>((a, m) => (m ? maxMask(a, m) : a), F))
      const union = (ts: readonly Target[]) => ts.reduce<Mask | null>((a, t) => {
        const m = parts[t]
        return m ? (a ? maxMask(a, m) : m) : a
      }, null)
      let keep = keepAll ? null : union(s.keepSet)
      let remove = union(s.removeSet.filter((t) => t !== 'background'))
      let bg = s.removeSet.includes('background') ? parts.background : null
      const mk = await this.markMasks(src, s.marks, tok, s.removeSet.includes('text') && !s.removeSet.includes('logo'))
      if (!mk || stale()) return
      if (mk.red) remove = remove ? maxMask(remove, mk.red) : mk.red
      if (mk.green) {
        if (keep || (!remove && !bg && !keepAll)) keep = keep ? maxMask(keep, mk.green) : mk.green
        if (remove) remove = subtractMask(remove, mk.green)
        if (bg) bg = subtractMask(bg, mk.green)
      }
      const logoMissing = s.removeSet.some(textish) && !L && !mk.red
      // «Behold logo/tekst» i et foto uten merke: be brukeren merke logoen (grønt) i stedet for å beholde feil ting
      if (s.keepSet.some(textish) && !L && !mk.green) {
        this.redraw({ busy: null, mode: 'point', tab: 'keep', markKeep: true, error: 'isolate.run.markKeep' })
        return
      }
      if (!hasContent(keep) && !hasContent(remove) && !hasContent(bg)) {
        if (logoMissing) this.redraw({ busy: null, mode: 'point', tab: 'remove', markKeep: false, error: 'isolate.run.markIt' })
        else this.set({ busy: null, error: 'isolate.error.nothingFound' })
        return
      }
      if (logoMissing) note = 'isolate.run.markIt'
      let alpha = keep ? subtractMask(base.alpha, invertMask(keep)) : base.alpha
      if (bg) alpha = subtractMask(alpha, bg)
      const fm = s.fillMode
      let fx: Mask | null = null
      if (remove && fm === 'clear') alpha = subtractMask(alpha, remove)
      else if (remove) {
        // bare det som fortsatt vises, trenger fyll (resten er gjennomsiktig uansett)
        const vis = alpha ? subtractMask(remove, invertMask(alpha)) : remove
        if (hasContent(vis)) fx = vis
      }
      this.snap()
      if (src !== this.src) {
        this.src = src
        this.segmenter.forgetImage()
      }
      this.alpha = alpha
      this.pend = null
      this.lastRun = base
      const only = s.keepSet.length === 1 && !s.removeSet.length ? s.keepSet[0] : undefined
      const mode: Mode = only && only !== 'background' ? only : null
      if (fx && fm !== 'clear') {
        this.effect = { before: src, mask: fx }
        this.set({ mode, marks: [] })
        await this.renderEffect(fm, tok)
        if (!stale() && !this.state.get().error) this.set({ note: this.state.get().note ?? note ?? 'isolate.run.done' })
        return
      }
      this.redraw({ busy: null, pct: 0, ready: true, marks: [], mode, error: null, note: note ?? 'isolate.run.done' })
    } catch (e) {
      if (!stale()) this.set({ busy: null, pct: 0, error: this.offlineOr('isolate.error.model', e) })
    }
  }

  /** Maskene fra «Merk i bildet»: rødt (fjern) og grønt (behold). null = avbrutt. */
  private async markMasks(src: HTMLCanvasElement, marks: readonly Mark[], tok: number, text = false): Promise<{ red: Mask | null; green: Mask | null } | null> {
    const W = src.width
    const H = src.height
    // Tekst (uten Logo) under Fjern: en rød firkant betyr bokstavene i den, ikke hele objektet SlimSAM finner. Logo = hele merket.
    const strokes = new Map<Mark, Mask>()
    if (text) {
      const rgba = rgbaOf(src)
      for (const m of marks) {
        if (m.type !== 'box' || m.keep) continue
        const t = textStrokes(rgba, W, H, { x0: m.x0 * W, y0: m.y0 * H, x1: m.x1 * W, y1: m.y1 * H })
        if (t) strokes.set(m, t)
      }
    }
    let red = pendingMask(marks.filter((m) => !strokes.has(m)), W, H)
    for (const t of strokes.values()) red = red ? maxMask(red, t) : t
    let green: Mask | null = null
    const phase = (busy: Phase) => tok === this.token && this.set({ busy })
    const pct = (n: number) => tok === this.token && this.set({ pct: n })
    const negatives = marks.flatMap((m) => (m.keep && m.type === 'point' ? [{ x: m.x, y: m.y }] : []))
    for (const m of marks) {
      if (strokes.has(m)) continue
      if (m.type === 'box' && m.km) {
        if (m.keep) applyKeyMask((green ??= new Uint8ClampedArray(W * H)), W, m.km, false)
        continue
      }
      const k = await this.segmenter.samMask(src, m.type === 'box' ? { box: m } : { points: [{ x: m.x, y: m.y, label: 1 }] }, m.keep ? [] : negatives, phase, pct)
      if (tok !== this.token || !this.alive) return null
      if (!k) continue
      if (m.keep) green = green ? maxMask(green, k) : k
      else red = red ? maxMask(red, k) : k
    }
    return { red: hasContent(red) ? red : null, green }
  }

  private offlineOr(key: MessageKey, e?: unknown): MessageKey {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'isolate.error.offline'
    return e instanceof StallError ? 'isolate.error.stalled' : key
  }

  // ---------- Merk i bildet ----------

  /** «Merk i bildet» av/på: av fjerner merkene (Angre tar dem tilbake). */
  startMarking(): void {
    const s = this.state.get()
    if (s.busy) return
    if (s.mode === 'point') {
      if (s.marks.length) this.snap()
      this.pend = null
      this.redraw({ mode: null, marks: [], error: null })
      return
    }
    this.redraw({ mode: 'point', marks: [], error: null, note: null, editing: false })
  }

  /** Fjern/Behold i «Merk i bildet» er det samme som fanene. */
  setMarkKeep(keep: boolean): void {
    this.setTab(keep ? 'keep' : 'remove')
  }

  /** Avsluttet trykk eller firkant i bildet. `rightButton` gir motsatt farge. */
  mark(start: ImagePoint, end: ImagePoint, dragged: boolean, rightButton: boolean, hitRadiusPx: number): void {
    const src = this.src
    const s = this.state.get()
    if (!src || s.busy) return
    // fargen følger fanen: grønn under «Hva skal beholdes», rød under «Hva skal fjernes»
    const keep = rightButton ? !s.markKeep : s.markKeep
    const x0 = Math.min(start.x, end.x)
    const x1 = Math.max(start.x, end.x)
    const y0 = Math.min(start.y, end.y)
    const y1 = Math.max(start.y, end.y)
    if (dragged && x1 - x0 > 0.003 && y1 - y0 > 0.003) {
      this.addMark({ type: 'box', x0, y0, x1, y1, keep, km: keyBox(src, { x0, y0, x1, y1 }) })
      return
    }
    if (s.mode === 'point') {
      const i = hitMark(s.marks, start.x, start.y, src.width, src.height, hitRadiusPx)
      if (i >= 0) {
        this.snap()
        const marks = s.marks.filter((_, j) => j !== i)
        this.pend = pendingMask(marks, src.width, src.height)
        this.redraw({ marks, error: null })
        return
      }
    }
    this.addMark({ type: 'point', x: start.x, y: start.y, keep })
  }

  private addMark(m: Mark) {
    const src = this.src
    if (!src) return
    const s = this.state.get()
    const into = s.mode === 'point'
    const marks = [...(into ? s.marks : []), m]
    this.snap()
    this.pend = pendingMask(marks, src.width, src.height)
    this.redraw({ mode: 'point', marks, error: null, note: into ? s.note : null })
  }

  clearMarks(): void {
    const s = this.state.get()
    if (s.busy || !s.marks.length) return
    this.snap()
    this.pend = null
    this.redraw({ marks: [], error: null })
  }

  // ---------- Fyll med omgivelser / gjør uskarp ----------

  /**
   * Lager resultatet fra bildet før endringen (aldri fra et tidligere resultat): «Fyll med omgivelser» med AI i egen
   * tråd (engine/fill.ts), «Gjør uskarp» direkte. Resultatet er et nytt lerret; originalen endres aldri.
   */
  private async renderEffect(kind: 'fill' | 'blur' | 'color', tok: number): Promise<void> {
    const e = this.effect
    if (!e) return
    const s = this.state.get()
    const W = e.before.width
    const H = e.before.height
    const out = cloneCanvas(e.before)
    if (kind !== 'fill') {
      const rgba = rgbaOf(out)
      if (kind === 'blur') blurArea(rgba, W, H, e.mask, s.blur, s.edge)
      else colorArea(rgba, W, H, e.mask, s.fillColor, s.edge)
      putRgba(out, rgba)
      this.src = out
      this.segmenter.forgetImage()
      this.redraw({ busy: null, pct: 0, ready: true, marks: [], error: null, note: null, pending: kind })
      return
    }
    this.set({ busy: 'fill', pct: 0, error: null })
    try {
      const res = await this.filler.fill(rgbaOf(e.before), W, H, e.mask, { grow: s.edge, seed: ++this.seed, ai: true }, (phase, pct) => {
        // etter nedlastingen startes modellen: vis at bildet behandles (ikke «100 %» som står stille)
        if (tok === this.token && this.alive) this.set(phase === 'model' && pct < 100 ? { busy: 'model', pct } : { busy: 'fill', pct: phase === 'run' ? pct : 0 })
      })
      if (tok !== this.token || !this.alive || this.effect !== e) return
      putRgba(out, res.rgba)
      this.src = out
      this.segmenter.forgetImage()
      this.redraw({ busy: null, pct: 0, ready: true, marks: [], error: null, note: res.why === 'device' ? 'isolate.fill.deviceNote' : res.why === 'failed' ? 'isolate.fill.patchNote' : null, pending: 'fill' })
    } catch {
      if (tok === this.token && this.alive) this.set({ busy: null, pct: 0, error: 'isolate.fill.failed' })
    }
  }

  /** Justerer resultatet som vises (styrke, kant) og lager det på nytt fra originalen (`rerun: false` = bare verdien). */
  adjustEffect(patch: Partial<Pick<UiState, 'blur' | 'edge'>>, rerun = true): void {
    const s = this.state.get()
    this.set(patch)
    if (!this.effect || !s.pending || s.busy || !rerun) return
    void this.renderEffect(s.pending, ++this.token)
  }

  /** «Bruk»: beholder resultatet (originalen ligger fortsatt i historikken, så Angre virker). */
  acceptEffect(): void {
    this.effect = null
    this.lastRun = null
    this.set({ pending: null })
  }

  /** «Avbryt»: tilbake til bildet og markeringene før endringen. */
  cancelEffect(): void {
    if (!this.state.get().pending || this.state.get().busy) return
    this.undo()
    this.future = this.future.slice(0, -1)
    this.set({ redoSize: this.future.length })
  }

  // ---------- Finjuster masken (felles maskeredigering) ----------

  /**
   * Åpner maskeredigeringen. Masken kopieres (forrige tilstand ligger i historikken, så «Angre» i panelet tar hele
   * redigeringen tilbake). Uten maske (ingen type valgt ennå) starter den med hele bildet beholdt, så bildet vises
   * uendret og brukeren fjerner det som ikke skal være med («Velg objekt» med Behold gir da bare objektet). Før startet
   * den tom (alt fjernet), og redigereren viste bare rutemønsteret.
   */
  startEdit(): void {
    const src = this.src
    const s = this.state.get()
    if (!src || s.busy || s.editing) return
    this.snap()
    this.token++
    this.lastRun = null
    // det som fjernes i redigeringen, finnes ved å sammenligne med masken nå. Er bakgrunnen allerede fjernet, er
    // «Gjennomsiktig» forhåndsvalgt (rydde kantene); ellers «Fyll med omgivelser» (fjerne noe fra bildet).
    this.editStart = this.alpha
    const cut = !!this.alpha && this.alpha.some((v) => v < 128)
    this.alpha = this.alpha ? new Uint8ClampedArray(this.alpha) : new Uint8ClampedArray(src.width * src.height).fill(255)
    this.pend = null
    this.refined = null
    this.redraw({ editFill: cut ? 'clear' : 'fill', editing: true, mode: s.mode === 'point' ? null : s.mode, marks: [], ready: true, error: null, cmp: 0 })
  }

  /** Masken som redigeres (endres direkte av redigeringen) og bildet. */
  editTarget(): { image: HTMLCanvasElement; mask: Mask } | null {
    return this.src && this.alpha && this.state.get().editing ? { image: this.src, mask: this.alpha } : null
  }

  /** Masken er endret i redigeringen: forhåndsvisningen og eksporten bruker den nye masken. */
  maskChanged(): void {
    this.refined = null
    if (!this.state.get().ready) this.set({ ready: true })
  }

  /**
   * «Ferdig»: det som ble fjernet i redigeringen, får valgt metode. «Gjennomsiktig» lar masken stå. «Fyll med
   * omgivelser» og «Farge» gjør området synlig igjen og fyller det (forhåndsvisning med Bruk, Lag på nytt, Avbryt og
   * kant, som under «Merk i bildet»). «Avbryt» gir redigeringen med området gjennomsiktig.
   */
  endEdit(): void {
    const s = this.state.get()
    const src = this.src
    const start = this.editStart
    this.editStart = null
    this.refined = null
    const a = this.alpha
    if (s.editFill !== 'clear' && src && a && !s.busy) {
      const gone = new Uint8ClampedArray(a.length)
      for (let i = 0; i < a.length; i++) gone[i] = Math.max(0, (start ? (start[i] as number) : 255) - (a[i] as number))
      if (hasContent(gone)) {
        this.redraw({ editing: false })
        this.snap()
        const back = new Uint8ClampedArray(a)
        for (let i = 0; i < a.length; i++) if (gone[i]) back[i] = start ? (start[i] as number) : 255
        this.alpha = back
        this.effect = { before: src, mask: gone }
        void this.renderEffect(s.editFill, ++this.token)
        return
      }
    }
    this.redraw({ editing: false })
  }

  /** «Velg objekt» i redigeringen: SlimSAM-maske for objektet ved punktet (bildepiksler). */
  async selectObject(x: number, y: number): Promise<Mask | null> {
    const src = this.src
    if (!src) return null
    const tok = this.token
    try {
      const m = await this.segmenter.samMask(src, { points: [{ x: x / src.width, y: y / src.height, label: 1 }] }, [], (busy) => tok === this.token && this.set({ busy }), (pct) => tok === this.token && this.set({ pct }), true)
      if (tok === this.token) this.set({ busy: null })
      return m
    } catch (e) {
      if (tok === this.token) this.set({ busy: null, error: this.offlineOr('isolate.error.notFound', e) })
      return null
    }
  }

  // ---------- Finjustering, bakgrunn, visning ----------

  setOption(patch: Partial<Pick<UiState, 'soft' | 'tight' | 'cropToSubject' | 'fillMode' | 'editFill' | 'bgType' | 'bg' | 'cmp' | 'adv' | 'done'>>): void {
    this.redraw(patch)
  }

  /** Fargen for «Farge». Vises et fargeresultat, lages det på nytt med den nye fargen. */
  setFillColor(fillColor: string): void {
    const s = this.state.get()
    this.set({ fillColor })
    if (this.effect && s.pending === 'color' && !s.busy) void this.renderEffect('color', ++this.token)
  }

  private refinedMask() {
    const s = this.state.get()
    const src = this.src
    if (!this.alpha || !src) return null
    const r = this.refined
    if (r && r.alpha === this.alpha && r.tight === s.tight && r.soft === s.soft) return r.result
    const result = refineMask(this.alpha, src.width, src.height, s.tight, s.soft)
    this.refined = { alpha: this.alpha, tight: s.tight, soft: s.soft, result }
    return result
  }

  /** Resultatet i full oppløsning (med valgt bakgrunn og ev. beskjæring til motivet). */
  private result(): { canvas: HTMLCanvasElement; offset: { x: number; y: number } } | null {
    const src = this.src
    if (!src) return null
    const refined = this.refinedMask()
    if (!refined) return { canvas: src, offset: { x: 0, y: 0 } }
    const s = this.state.get()
    const cut = cloneCanvas(src)
    const cg = cut.getContext('2d')
    if (!cg) return null
    cg.globalCompositeOperation = 'destination-in'
    cg.drawImage(maskCanvas(refined.mask, src.width, src.height), 0, 0)
    const box = s.cropToSubject && refined.box ? cropBox(refined.box, src.width, src.height) : { x: 0, y: 0, w: src.width, h: src.height }
    const out = this.out ?? (this.out = makeCanvas(box.w, box.h))
    out.width = box.w
    out.height = box.h
    const og = out.getContext('2d')
    if (!og) return null
    og.clearRect(0, 0, box.w, box.h)
    if (s.bgType === 'color') {
      og.fillStyle = s.bg
      og.fillRect(0, 0, box.w, box.h)
    }
    og.drawImage(cut, -box.x, -box.y)
    return { canvas: out, offset: { x: box.x, y: box.y } }
  }

  /** Visningen: forhåndsvisning av merking (grønt/rødt), resultat og «før/etter»-sammenligning. */
  compose(view: HTMLCanvasElement, drag: { x0: number; y0: number; x1: number; y1: number; keep: boolean } | null): { ox: number; oy: number; cw: number; ch: number } | null {
    const src = this.src
    if (!src) return null
    const s = this.state.get()
    const W = src.width
    const H = src.height
    const tint = s.mode === 'point' && !!this.pend
    let ox = 0
    let oy = 0
    let cw = W
    let ch = H
    const res = this.alpha ? this.result() : null
    if (res && !tint) {
      ox = res.offset.x
      oy = res.offset.y
      cw = res.canvas.width
      ch = res.canvas.height
    }
    view.width = cw
    view.height = ch
    const g = view.getContext('2d')
    if (!g) return null
    g.clearRect(0, 0, cw, ch)
    if (tint && this.pend) {
      g.drawImage(src, 0, 0)
      const pc = maskCanvas(this.pend, W, H)
      const red = pc.getContext('2d')
      if (red) {
        red.globalCompositeOperation = 'source-in'
        red.fillStyle = 'rgb(255,77,77)'
        red.fillRect(0, 0, W, H)
      }
      const t = makeCanvas(W, H)
      const tg = t.getContext('2d')
      const refined = this.refinedMask()
      if (tg) {
        tg.fillStyle = 'rgba(61,220,132,0.45)'
        tg.fillRect(0, 0, W, H)
        tg.drawImage(pc, 0, 0)
        if (refined) {
          // Med maske: merkingen vises bare på motivet, og bakgrunnen er gjennomsiktig (som i dag).
          const m = maskCanvas(refined.mask, W, H)
          tg.globalCompositeOperation = 'destination-in'
          tg.drawImage(m, 0, 0)
          tg.globalCompositeOperation = 'source-over'
          if (s.bgType !== 'color') {
            const cut = cloneCanvas(src)
            const cg = cut.getContext('2d')
            if (cg) {
              cg.globalCompositeOperation = 'destination-in'
              cg.drawImage(m, 0, 0)
            }
            g.clearRect(0, 0, W, H)
            g.drawImage(cut, 0, 0)
          }
        }
        g.globalAlpha = 0.55
        g.drawImage(t, 0, 0)
        g.globalAlpha = 1
      }
    } else {
      g.drawImage(res ? res.canvas : src, 0, 0)
      // «Før»: originalen (bildet etter beskjæring), også når bare pikslene er endret (fyll, farge, uskarp) uten maske
      const before = this.base && this.base.width === W && this.base.height === H ? this.base : src
      if (s.cmp > 0 && (res || before !== src)) {
        const x = Math.round((cw * s.cmp) / 100)
        g.save()
        g.beginPath()
        g.rect(0, 0, x, ch)
        g.clip()
        g.clearRect(0, 0, x, ch)
        g.drawImage(before, -ox, -oy)
        g.restore()
        g.fillStyle = '#ffffff'
        g.fillRect(Math.max(0, x - Math.max(1, cw / 500)), 0, Math.max(2, cw / 250), ch)
      }
    }
    // Markeringer
    const r = Math.max(5, Math.max(cw, ch) / 110)
    const col = (keep: boolean) => (keep ? '#3ddc84' : '#ff5a5a')
    const marks: Mark[] = s.mode === 'point' ? [...s.marks] : []
    if (drag) marks.push({ type: 'box', ...drag, km: null })
    for (const m of marks) {
      if (m.type === 'box') {
        if (m.km) continue
        const x = m.x0 * W - ox
        const y = m.y0 * H - oy
        const w = (m.x1 - m.x0) * W
        const h = (m.y1 - m.y0) * H
        g.globalAlpha = 0.2
        g.fillStyle = col(m.keep)
        g.fillRect(x, y, w, h)
        g.globalAlpha = 1
        g.lineWidth = r / 2.2
        g.setLineDash([r * 1.2, r * 0.8])
        g.strokeStyle = '#ffffff'
        g.strokeRect(x, y, w, h)
        g.lineDashOffset = r
        g.strokeStyle = col(m.keep)
        g.strokeRect(x, y, w, h)
        g.setLineDash([])
        g.lineDashOffset = 0
      } else {
        g.beginPath()
        g.arc(m.x * W - ox, m.y * H - oy, r, 0, Math.PI * 2)
        g.fillStyle = col(m.keep)
        g.fill()
        g.lineWidth = r / 2.5
        g.strokeStyle = '#ffffff'
        g.stroke()
      }
    }
    return { ox, oy, cw, ch }
  }

  /** PNG i full oppløsning (IS-12). Uten maske: bildet slik det er (f.eks. etter «Fyll med omgivelser»). */
  async exportPng(): Promise<Blob | null> {
    if (!this.state.get().ready) return null
    const res = this.alpha ? this.result() : this.src ? { canvas: this.src } : null
    return res ? toBlob(res.canvas) : null
  }

  /** Nytt motiv i samme bilde (dialogen etter nedlasting). */
  againSame(): void {
    this.token++
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
    this.pend = null
    this.alpha = null
    this.out = null
    this.redraw({ historySize: 0, done: false, mode: null, marks: [], ready: false, cmp: 0, error: null, note: null, editing: false })
  }

  reset(): void {
    this.token++
    this.orig = null
    this.src = null
    this.base = null
    this.pend = null
    this.alpha = null
    this.out = null
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
    this.segmenter.forgetImage()
    this.set({ ...initial(), frame: this.state.get().frame + 1 })
  }

  /**
   * Verktøyet lukkes: AI-trådene avsluttes, og bildene, maskene og historikken slippes. React kan holde på kontrolleren
   * en stund etter lukking (forrige effekt i App), og da skal den ikke holde på store lerreter (målt: flere hundre MB).
   */
  dispose(): void {
    this.alive = false
    this.token++
    this.segmenter.dispose()
    this.filler.dispose()
    this.orig = null
    this.src = null
    this.base = null
    this.pend = null
    this.alpha = null
    this.out = null
    this.refined = null
    this.history = []
    this.future = []
    this.effect = null
    this.lastRun = null
  }
}
