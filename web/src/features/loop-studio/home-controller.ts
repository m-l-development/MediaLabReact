/**
 * Startsiden i Loop Studio, portert fra media-lab/src/pages/loop-studio/logic.js: malkort (kan redigeres, legges til,
 * flyttes og fjernes), «Disk» med lagrede looper (favoritt, slett), lenke til demoen og lagrede grunnoppsett.
 */
import type { KV } from './bases'
import type { DiskEntry, LoopRepo } from './store'

const LS_KEY = 'loopstudio.tpls.v1'
const BASES = ['week', 'sunday', 'youth', 'blank']
export interface Card { id: string; base: string; cat: string; title: string; desc: string; btn: string }
export interface HomeData { title: string; cards: Card[] }
export const DEFAULTS: HomeData = {
  title: 'Loop Studio',
  cards: [
    { id: 'week', base: 'week', cat: 'Mal', title: 'Ukeprogram', desc: 'Ukens møter fra tekst, bilde eller fil, med ukeoversikt nederst.', btn: 'Velg' },
    { id: 'sunday', base: 'sunday', cat: 'Mal', title: 'Søndagsmøte', desc: 'Velkommen, dagens tale og nettkanaler før møtet starter.', btn: 'Velg' },
    { id: 'youth', base: 'youth', cat: 'Mal', title: 'Ungdomsmøte', desc: 'Velkomst og kveldens program for ungdomsmøtet.', btn: 'Velg' },
    { id: 'blank', base: 'blank', cat: 'Mal', title: 'Tom mal', desc: 'Start med én tom slide og bygg loopen selv.', btn: 'Velg' },
  ],
}
const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n)
type InputEv = { target: { value: string } }
type Nav = { preventDefault(): void; button?: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }

export interface HomeDeps {
  kv: KV
  repo: LoopRepo
  confirm(msg: string): boolean
  t(s: string): string
  lang(): 'no' | 'en'
  light(): boolean
  /** Adressen til editoren med denne spørringen, og navigering dit. */
  editorHref(q: Record<string, string>): string
  openEditor(q: Record<string, string>): void
  hubHref: string
  goHub(): void
}

export class HomeController {
  deps: HomeDeps
  state = { editing: false, data: DEFAULTS, diskOpen: false, disk: [] as DiskEntry[], canL: false, canR: false }
  meshRef: { current: HTMLCanvasElement | null } = { current: null }
  diskScrollRef: { current: HTMLDivElement | null } = { current: null }
  private rerender: (() => void) | null = null
  private alive = false
  private raf = 0
  private still = false
  private maxDpr = 2
  private hooked: HTMLElement | null = null
  private wAnim = 0
  private wt = 0
  private off: (() => void)[] = []

  constructor(deps: HomeDeps) {
    this.deps = deps
  }
  setDeps(d: Partial<HomeDeps>) {
    this.deps = { ...this.deps, ...d }
  }
  attach(rerender: () => void) {
    this.rerender = rerender
  }
  setState(p: Partial<HomeController['state']> | ((s: HomeController['state']) => Partial<HomeController['state']>)) {
    this.state = { ...this.state, ...(typeof p === 'function' ? p(this.state) : p) }
    this.rerender?.()
  }

  loadDisk(): DiskEntry[] {
    return this.deps.repo.diskList().slice(0, 10)
  }
  load(): HomeData {
    try {
      const d = JSON.parse(this.deps.kv.get(LS_KEY) || 'null') as { title?: unknown; cards?: unknown } | null
      if (!d || typeof d !== 'object' || !Array.isArray(d.cards)) return DEFAULTS
      const cards = (d.cards as Partial<Card>[])
        .filter((c) => c && typeof c === 'object' && typeof c.id === 'string' && /^(week|sunday|youth|blank|c-[a-z0-9]{4,16})$/.test(c.id))
        .map((c) => ({ id: String(c.id), base: BASES.includes(String(c.base)) ? String(c.base) : 'blank', cat: clip(c.cat, 40), title: clip(c.title, 60), desc: clip(c.desc, 300), btn: clip(c.btn, 30) }))
      return { title: clip(d.title, 60) || DEFAULTS.title, cards }
    } catch {
      return DEFAULTS
    }
  }
  save(data: HomeData) {
    this.deps.kv.set(LS_KEY, JSON.stringify(data))
  }
  update(fn: (d: HomeData) => HomeData) {
    this.setState((s) => {
      const data = fn(s.data)
      this.save(data)
      return { data }
    })
  }
  setCard(id: string, k: keyof Card, v: string) {
    this.update((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, [k]: v } : c)) }))
  }

  mount() {
    this.alive = true
    this.setState({ data: this.load(), disk: this.loadDisk() })
    this.still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    /* svake enheter: færre bilder i sekundet og litt lavere oppløsning på bakgrunnen; stopper i skjult fane */
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
    const low = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4 || !!nav.connection?.saveData
    this.maxDpr = low ? 1.5 : 2
    const step = low ? 50 : 32
    let last = -1
    const tick = (now: number) => {
      this.raf = 0
      if (!this.alive || this.still || document.hidden) return
      this.raf = requestAnimationFrame(tick)
      if (now - last < step) return
      last = now
      this.draw((now - t0) / 1000)
    }
    const startBg = () => { if (!this.raf && this.alive && !this.still && !document.hidden) this.raf = requestAnimationFrame(tick) }
    this.draw(0)
    startBg()
    const onResize = () => { if (this.still) this.draw(0); this.updArrows() }
    document.addEventListener('visibilitychange', startBg)
    window.addEventListener('resize', onResize)
    this.off.push(() => document.removeEventListener('visibilitychange', startBg), () => window.removeEventListener('resize', onResize))
  }
  unmount() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.off.forEach((f) => f())
    this.off = []
  }
  /** Etter hver oppdatering: Disk-raden får rulling med hjul og dra, og pilene oppdateres. */
  didUpdate() {
    this.hookDisk()
    requestAnimationFrame(() => { if (this.alive) this.updArrows() })
  }
  /** Tema byttet: tegn bakgrunnen på nytt med riktig farge. */
  themeChanged(light: boolean) {
    this.deps = { ...this.deps, light: () => light }
    if (this.still) this.draw(0)
  }
  updArrows() {
    const el = this.diskScrollRef.current
    if (!el) return
    const l = el.scrollLeft > 4, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    if (l !== this.state.canL || r !== this.state.canR) this.setState({ canL: l, canR: r })
  }
  hookDisk() {
    const el = this.diskScrollRef.current
    if (!el || el === this.hooked) return
    this.hooked = el
    el.addEventListener('wheel', (e) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const max = el.scrollWidth - el.clientWidth
      const cur = this.wAnim ? this.wt : el.scrollLeft
      if ((e.deltaY < 0 && cur <= 0) || (e.deltaY > 0 && cur >= max)) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? el.clientWidth : 1
      this.wt = Math.max(0, Math.min(max, (this.wAnim ? this.wt : el.scrollLeft) + e.deltaY * unit * 1.2))
      if (!this.wAnim) {
        const stepFn = () => {
          const d = this.wt - el.scrollLeft
          if (Math.abs(d) < 1) { el.scrollLeft = this.wt; this.wAnim = 0; return }
          el.scrollLeft += d * 0.25
          this.wAnim = requestAnimationFrame(stepFn)
        }
        this.wAnim = requestAnimationFrame(stepFn)
      }
    }, { passive: false })
    let down: { x: number; s: number; moved: boolean } | null = null
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = { x: e.clientX, s: el.scrollLeft, moved: false } })
    const pm = (e: PointerEvent) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 5) { down.moved = true; el.scrollLeft = down.s - dx } }
    const pu = () => {
      if (down?.moved) {
        const stop = (ev: Event) => { ev.preventDefault(); ev.stopPropagation() }
        el.addEventListener('click', stop, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', stop, true), 50)
      }
      down = null
    }
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    this.off.push(() => window.removeEventListener('pointermove', pm), () => window.removeEventListener('pointerup', pu))
    this.updArrows()
  }
  /** Det animerte nettet nederst på siden (samme som i dagens app). */
  draw(t: number) {
    const c = this.meshRef.current
    if (!c) return
    const d = Math.min(this.maxDpr || 2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight
    if (c.width !== Math.round(W * d) || c.height !== Math.round(H * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d) }
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(d, 0, 0, d, 0, 0)
    g.clearRect(0, 0, W, H)
    const NX = 44, NZ = 30, pts: [number, number][][] = []
    for (let j = 0; j < NZ; j++) {
      const z = 1 + j * 0.2, row: [number, number][] = []
      for (let i = 0; i < NX; i++) {
        const x = -3.2 + i * (6.4 / (NX - 1))
        const y = 0.34 * Math.sin(x * 1.3 + t * 0.35) * Math.cos(z * 0.9 - t * 0.22) + 0.2 * Math.sin((x - z) * 1.7 + t * 0.28)
        row.push([W / 2 + (x / z) * W * 0.42, H * 0.12 + ((1.1 - y) / z) * H * 0.78])
      }
      pts.push(row)
    }
    g.lineWidth = 1
    const lt = this.deps.light(), ink = lt ? '60,54,44' : '255,255,255', ka = lt ? 0.8 : 1
    for (let j = 0; j < NZ; j++) {
      g.strokeStyle = 'rgba(' + ink + ',' + ((0.05 + 0.2 * (1 - j / NZ)) * ka).toFixed(3) + ')'
      g.beginPath()
      ;(pts[j] ?? []).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
      g.stroke()
    }
    const gr = g.createLinearGradient(0, H, 0, 0)
    gr.addColorStop(0, 'rgba(' + ink + ',' + (0.22 * ka).toFixed(3) + ')')
    gr.addColorStop(1, 'rgba(' + ink + ',0.03)')
    g.strokeStyle = gr
    for (let i = 0; i < NX; i++) {
      g.beginPath()
      for (let j = 0; j < NZ; j++) { const p = pts[j]?.[i]; if (p) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]) } }
      g.stroke()
    }
    const fade = g.createLinearGradient(0, 0, 0, H * 0.45)
    fade.addColorStop(0, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    g.globalCompositeOperation = 'destination-out'
    g.fillStyle = fade
    g.fillRect(0, 0, W, H * 0.45)
    g.globalCompositeOperation = 'source-over'
  }

  /** Vanlig klikk navigerer uten sideinnlasting; Ctrl/Cmd-klikk åpner i ny fane som en vanlig lenke. */
  private nav(q: Record<string, string>) {
    return (e: Nav) => {
      if ((e.button ?? 0) !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      this.deps.openEditor(q)
    }
  }

  vals() {
    const { editing, data, diskOpen, disk } = this.state
    const NAMES: Record<string, string> = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' }
    const fmt = (t: number) => { try { return new Date(t).toLocaleDateString(this.deps.lang() === 'en' ? 'en-GB' : 'nb-NO', { day: 'numeric', month: 'short' }) } catch { return '' } }
    const on = (id: string, k: keyof Card, n: number) => (e: InputEv) => this.setCard(id, k, clip(e.target.value, n))
    const writeDisk = (l: DiskEntry[]) => { void this.deps.repo.setDisk(l); this.setState({ disk: l }) }
    const demoQ = { mal: 'week', demo: '1' }
    return {
      meshRef: this.meshRef, editing, notEditing: !editing,
      hubHref: this.deps.hubHref, goHub: (e: Nav) => { if ((e.button ?? 0) !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); this.deps.goHub() },
      demoHref: this.deps.editorHref(demoQ), openDemo: this.nav(demoQ),
      diskScrollRef: this.diskScrollRef, onDiskScroll: () => this.updArrows(),
      canLeft: diskOpen && this.state.canL, canRight: diskOpen && this.state.canR,
      scrollLeftBtn: () => { const el = this.diskScrollRef.current; if (el) el.scrollBy({ left: -Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' }) },
      scrollRightBtn: () => { const el = this.diskScrollRef.current; if (el) el.scrollBy({ left: Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' }) },
      toggleDisk: () => this.setState((s) => ({ diskOpen: !s.diskOpen, disk: this.loadDisk() })),
      diskOpenStr: diskOpen ? ('true' as const) : ('false' as const),
      diskBg: diskOpen ? '#f3f1ec' : 'rgba(12,12,12,0.55)', diskColor: diskOpen ? '#000' : '#f3f1ec', diskBorder: diskOpen ? '#f3f1ec' : 'rgba(255,255,255,0.16)',
      diskCount: disk.length + '/10', diskCountBg: diskOpen ? '#000' : 'rgba(255,255,255,0.12)', diskCountColor: diskOpen ? '#f3f1ec' : '#b3afa6',
      diskRowMax: diskOpen ? '100%' : '0px', diskRowOpacity: diskOpen ? 1 : 0, diskRowVis: diskOpen ? 'visible' : 'hidden', diskEmpty: disk.length === 0,
      disk: disk.map((d) => {
        const q = { mal: NAMES[d.base] ? d.base : 'blank', disk: d.id }
        return {
          border: d.fav ? 'rgba(233,231,226,0.45)' : 'rgba(255,255,255,0.16)',
          favColor: d.fav ? '#e9e7e2' : '#6f6b64', favFill: d.fav ? 'currentColor' : 'none', favAria: d.fav ? ('true' as const) : ('false' as const),
          favTitle: d.fav ? 'Fjern fra favoritter' : 'Favoritt – slettes aldri automatisk',
          onFav: () => writeDisk(this.loadDisk().map((x) => (x.id === d.id ? { ...x, fav: !x.fav } : x))),
          name: String(d.name || 'Uten navn').slice(0, 60),
          meta: [this.deps.t(NAMES[d.base] ?? 'Egen'), d.count ? d.count + ' slides' : '', fmt(d.savedAt)].filter(Boolean).join(' · '),
          href: this.deps.editorHref(q), go: this.nav(q),
          onRemove: () => {
            if (!this.deps.confirm(this.deps.t('Slette') + ' «' + (d.name || this.deps.t('loopen')) + '» ' + this.deps.t('fra Disk?'))) return
            writeDisk(this.loadDisk().filter((x) => x.id !== d.id))
            void this.deps.repo.removeWork('ukeloop.custom.' + d.id)
          },
        }
      }),
      pageTitle: data.title,
      onPageTitle: (e: InputEv) => { const v = clip(e.target.value, 60); this.update((d) => ({ ...d, title: v })) },
      toggleEdit: () => {
        if (editing) this.update((d) => ({ ...d, title: d.title.trim() || DEFAULTS.title }))
        this.setState({ editing: !editing })
      },
      resetAll: () => { if (this.deps.confirm(this.deps.t('Tilbakestille alle maler og tekster på denne siden?'))) { this.deps.kv.remove(LS_KEY); this.setState({ data: DEFAULTS }) } },
      addTpl: () => {
        const id = 'c-' + Math.random().toString(36).slice(2, 10)
        this.update((d) => ({ ...d, cards: [...d.cards, { id, base: 'blank', cat: 'Mal', title: 'Ny mal', desc: '', btn: 'Velg' }] }))
      },
      cards: data.cards.map((c, ci, all) => {
        const mv = (d2: number) => this.update((d) => {
          const a = d.cards.slice(), i = a.findIndex((x) => x.id === c.id), j = i + d2, x = a[i], y = a[j]
          if (!x || !y) return d
          a[i] = y
          a[j] = x
          return { ...d, cards: a }
        })
        const q = { mal: c.base, id: c.id }
        return {
          ...c, btn: c.btn.trim() ? c.btn : editing ? '' : 'Velg',
          builtin: !c.id.startsWith('c-'), onUp: () => mv(-1), onDown: () => mv(1), isFirst: ci === 0, isLast: ci === all.length - 1, upOp: ci === 0 ? 0.35 : 1, downOp: ci === all.length - 1 ? 0.35 : 1,
          href: this.deps.editorHref(q), go: this.nav(q),
          onCat: on(c.id, 'cat', 40), onTitle: on(c.id, 'title', 60), onDesc: on(c.id, 'desc', 300), onBtn: on(c.id, 'btn', 30),
          onBase: (e: InputEv) => { const v = e.target.value; if (BASES.includes(v)) this.setCard(c.id, 'base', v) },
          onRemove: () => { if (this.deps.confirm(this.deps.t('Fjerne') + ' «' + (c.title || this.deps.t('malen')) + '»?')) this.update((d) => ({ ...d, cards: d.cards.filter((x) => x.id !== c.id) })) },
        }
      }),
    }
  }
}

export type HomeVals = ReturnType<HomeController['vals']> & {
  /** Lagrede grunnoppsett (personlige og felles for menigheten). */
  bases: { personal: import('./bases').PersonalBases; central: import('./bases').CentralBases | null; editorHref: (q: Record<string, string>) => string; open: (q: Record<string, string>) => void; confirm: (m: string) => boolean }
  sharedDisk?: import('./controller').LoopDeps['sharedDisk']
}
