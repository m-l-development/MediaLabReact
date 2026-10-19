import type { MessageKey } from '../../shared/i18n/messages'
import { createStore, type Store } from '../../shared/lib/store'
import { inpaint } from './engine/inpaint'
import { pendingMask, applyKeyMask, hitMark, type Mark } from './engine/marks'
import { colorKey, cropBox, hasContent, maxMask, refineMask, subtractMask, type Mask } from './engine/mask'
import { ACCEPT, cloneCanvas, crop, keyBox, loadToCanvas, makeCanvas, maskCanvas, MAX_BYTES, putRgba, rgbaOf, toBlob } from './engine/raster'
import { Segmenter, StallError, type Phase } from './engine/segmenter'

export type Kind = 'person' | 'object' | 'logo' | 'text'
export type Mode = Kind | 'point' | null
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
  fillMode: 'fill' | 'clear'
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
  phase: 'empty', mode: null, busy: null, pct: 0, soft: 1, tight: 2, cropToSubject: false, fillMode: 'fill', bgType: 'none',
  bg: '#ffffff', cmp: 0, error: null, note: null, name: '', dims: '', ready: false, marks: [], markKeep: false,
  historySize: 0, done: false, adv: false, crop: FULL, aspect: 'free', frame: 0,
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
  private token = 0
  private alive = true
  private refined: { alpha: Mask; tight: number; soft: number; result: ReturnType<typeof refineMask> } | null = null
  private out: HTMLCanvasElement | null = null
  private segmenter = new Segmenter()

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
    this.segmenter.forgetImage()
    this.redraw({ phase: 'work', mode: null, marks: [], busy: null, error: null, note: null, dims: `${src.width} × ${src.height}`, cmp: 0, ready: false, done: false, historySize: 0 })
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
    this.redraw({ phase: 'crop', mode: null, marks: [], ready: false, historySize: 0, error: null, note: null })
  }

  // ---------- Historikk ----------

  private snap() {
    if (!this.src) return
    const s = this.state.get()
    this.history = [...this.history, { src: this.src, alpha: this.alpha, pend: this.pend, marks: s.marks, mode: s.mode, ready: s.ready, note: s.note, markKeep: s.markKeep }].slice(-20)
    this.set({ historySize: this.history.length })
  }

  undo(): void {
    const h = this.history[this.history.length - 1]
    if (this.state.get().busy || !h) return
    this.history = this.history.slice(0, -1)
    this.token++
    if (h.src !== this.src) {
      this.src = h.src
      this.segmenter.forgetImage()
    }
    this.alpha = h.alpha
    this.pend = h.pend
    this.redraw({ historySize: this.history.length, marks: h.marks, mode: h.mode, ready: h.ready, note: h.note, markKeep: h.markKeep, error: null, cmp: 0 })
  }

  canRestore(): boolean {
    const s = this.state.get()
    return !!this.src && !!(this.alpha || this.pend || s.marks.length || s.mode || this.src !== this.base)
  }

  restore(): void {
    if (!this.canRestore()) return
    this.snap()
    this.token++
    if (this.base && this.src !== this.base) {
      this.src = this.base
      this.segmenter.forgetImage()
    }
    this.alpha = null
    this.pend = null
    this.redraw({ mode: null, marks: [], ready: false, note: null, error: null, cmp: 0, busy: null })
  }

  // ---------- Hva skal beholdes ----------

  private setAlpha(a: Mask, note: MessageKey | null) {
    this.alpha = a
    this.redraw({ busy: null, ready: true, error: null, note })
  }

  choose(kind: Kind): void {
    const s = this.state.get()
    if (!this.src || s.busy) return
    this.snap()
    this.pend = null
    const tok = ++this.token
    this.alpha = null
    this.redraw({ mode: kind, marks: [], ready: false, error: null, note: null, cmp: 0 })
    if (kind === 'logo' || kind === 'text') {
      const a = colorKey(rgbaOf(this.src), this.src.width, this.src.height)
      if (a) {
        this.setAlpha(a, null)
        return
      }
      void this.runModel('fine', tok, 'isolate.note.notPlain')
      return
    }
    void this.runModel(kind === 'person' ? 'fast' : 'fine', tok, null)
  }

  private offlineOr(key: MessageKey, e?: unknown): MessageKey {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'isolate.error.offline'
    return e instanceof StallError ? 'isolate.error.stalled' : key
  }

  private async runModel(key: 'fine' | 'fast', tok: number, note: MessageKey | null) {
    const src = this.src
    if (!src) return
    this.set({ busy: this.segmenter.isModelLoaded(key) ? 'run' : 'model', pct: 0 })
    try {
      const a = await this.segmenter.removeBackground(key, src, (busy) => tok === this.token && this.set({ busy }), (pct) => tok === this.token && this.set({ pct }))
      if (tok !== this.token || !this.alive) return
      this.setAlpha(a, note)
    } catch (e) {
      if (tok === this.token && this.alive) this.set({ busy: null, error: this.offlineOr('isolate.error.model', e) })
    }
  }

  // ---------- Merk i bildet ----------

  startMarking(): void {
    const s = this.state.get()
    if (s.busy || s.mode === 'point') return
    this.redraw({ mode: 'point', marks: [], markKeep: false, error: null, note: null })
  }

  setMarkKeep(keep: boolean): void {
    this.set({ markKeep: keep })
  }

  /** Avsluttet trykk eller firkant i bildet. `rightButton` gir motsatt farge. */
  mark(start: ImagePoint, end: ImagePoint, dragged: boolean, rightButton: boolean, hitRadiusPx: number): void {
    const src = this.src
    const s = this.state.get()
    if (!src || s.busy) return
    const keep = rightButton ? !(s.mode === 'point' && s.markKeep) : s.mode === 'point' && s.markKeep
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
    this.redraw({ mode: 'point', marks, markKeep: into ? s.markKeep : false, error: null, note: into ? s.note : null })
  }

  clearMarks(): void {
    const s = this.state.get()
    if (s.busy || !s.marks.length) return
    this.snap()
    this.pend = null
    this.redraw({ marks: [], error: null })
  }

  canApply(): boolean {
    const s = this.state.get()
    return !!this.src && !s.busy && s.mode === 'point' && s.marks.some((m) => !m.keep)
  }

  /** «Fjern»: fjerner det som er merket rødt – gjennomsiktig, eller fylt med omgivelsene. */
  async apply(): Promise<void> {
    if (!this.canApply()) return
    this.snap()
    const tok = ++this.token
    const marks = this.state.get().marks
    const src = this.src
    if (!src) return
    try {
      let r: Mask | null = this.pend ? new Uint8ClampedArray(this.pend) : null
      const aiRed = marks.filter((m) => !m.keep && !(m.type === 'box' && m.km))
      const aiGreen = marks.filter((m): m is Extract<Mark, { type: 'box' }> => m.keep && m.type === 'box' && !m.km)
      if (aiRed.length || (r && aiGreen.length)) {
        const phase = (busy: Phase) => tok === this.token && this.set({ busy })
        const pct = (n: number) => tok === this.token && this.set({ pct: n })
        const negatives = marks.filter((m) => m.keep && m.type === 'point').map((m) => ({ x: (m as { x: number }).x, y: (m as { y: number }).y }))
        for (const m of aiRed) {
          const k = await this.segmenter.samMask(src, m.type === 'box' ? { box: m } : { points: [{ x: m.x, y: m.y, label: 1 }] }, negatives, phase, pct)
          if (tok !== this.token || !this.alive) return
          if (k) r = r ? maxMask(r, k) : k
        }
        for (const m of aiGreen) {
          if (!r) break
          const k = await this.segmenter.samMask(src, { box: m }, [], phase, pct)
          if (tok !== this.token || !this.alive) return
          if (k) r = subtractMask(r, k)
        }
        if (r) for (const m of marks) if (m.type === 'box' && m.km && m.keep) applyKeyMask(r, src.width, m.km, true)
      }
      if (!hasContent(r)) {
        this.set({ busy: null, error: 'isolate.error.nothingFound' })
        return
      }
      if (this.state.get().fillMode === 'fill') {
        this.set({ busy: 'fill' })
        await new Promise((res) => setTimeout(res, 40))
        if (tok !== this.token || !this.alive) return
        const filled = cloneCanvas(src)
        const rgba = rgbaOf(filled)
        if (inpaint(rgba, filled.width, filled.height, r)) {
          putRgba(filled, rgba)
          this.src = filled
          this.segmenter.forgetImage()
        }
        this.pend = null
        this.redraw({ busy: null, ready: true, marks: [], error: null, note: null })
        return
      }
      this.alpha = subtractMask(this.alpha, r)
      this.pend = null
      this.redraw({ busy: null, ready: true, marks: [], error: null, note: null })
    } catch (e) {
      if (tok === this.token && this.alive) this.set({ busy: null, error: this.offlineOr('isolate.error.notFound', e) })
    }
  }

  // ---------- Finjustering, bakgrunn, visning ----------

  setOption(patch: Partial<Pick<UiState, 'soft' | 'tight' | 'cropToSubject' | 'fillMode' | 'bgType' | 'bg' | 'cmp' | 'adv' | 'done'>>): void {
    this.redraw(patch)
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
    } else if (!res) {
      g.drawImage(src, 0, 0)
    } else {
      g.drawImage(res.canvas, 0, 0)
      if (s.cmp > 0) {
        const x = Math.round((cw * s.cmp) / 100)
        g.save()
        g.beginPath()
        g.rect(0, 0, x, ch)
        g.clip()
        g.drawImage(src, -ox, -oy)
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
    this.pend = null
    this.alpha = null
    this.out = null
    this.redraw({ historySize: 0, done: false, mode: null, marks: [], ready: false, cmp: 0, error: null, note: null })
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
    this.segmenter.forgetImage()
    this.set({ ...initial(), frame: this.state.get().frame + 1 })
  }

  dispose(): void {
    this.alive = false
    this.token++
    this.segmenter.dispose()
  }
}
