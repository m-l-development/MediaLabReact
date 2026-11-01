import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useT } from '../i18n/i18n'
import { pinchView, wheelAction } from './gesture'
import { separable } from './morph'
import { boxOf, brushSegment, combine, edgeRefine, fillEllipse, fillPolygon, fillRect, invertInPlace, keepConnected, MaskHistory, removeSpecks, sampleColor, unionBox, type Box, type Mask } from './ops'
import styles from './MaskEditor.module.css'

/**
 * Felles maskeredigering (Isolate Subject; kan brukes av andre verktøy med samme maskemodell): pensel, rektangel,
 * ellipse, lasso og «Velg objekt» (klikk, AI) med «Behold» og «Fjern»; penselstørrelse i bildepiksler med omriss ved
 * markøren; kantfølging; zoom og panorering; visning mot rutemønster, svart, hvitt eller originalen; inverter,
 * utvid/trekk inn, myk kant langs bildet; angre/gjør om. Alle verktøyene endrer `mask` direkte (den faktiske masken),
 * og `onChange` kalles etter hver endring, så forhåndsvisning og eksport bruker det samme.
 */
export type Tool = 'brush' | 'rect' | 'ellipse' | 'lasso' | 'select'
export type View = 'checker' | 'grey' | 'black' | 'white' | 'magenta' | 'cyan' | 'green' | 'original'

/**
 * Midlertidige arbeidsbakgrunner bak utklippet i redigeringen. Bare visning: de tegnes i lerretet bak bildet og blir
 * aldri en del av masken, originalbildet, «Ferdig», eksporten eller overføringen til andre verktøy.
 */
const BG: Partial<Record<View, string>> = { grey: '#3a3a3a', black: '#000000', white: '#ffffff', magenta: '#ff00ff', cyan: '#00e5ff', green: '#00c853' }
/** Sist valgte visning (huskes mens appen er åpen, også når redigereren åpnes på nytt). */
let lastView: View = 'checker'

export interface MaskEditorProps {
  image: HTMLCanvasElement
  mask: Mask
  onChange: () => void
  /** «Velg objekt»: maske for objektet ved punktet (bildepiksler), eller null. Mangler den, vises ikke verktøyet. */
  selectObject?: (x: number, y: number) => Promise<Mask | null>
}

interface Drag {
  kind: 'paint' | 'shape' | 'lasso' | 'pan' | 'pinch'
  keep: boolean
  start: { x: number; y: number }
  last: { x: number; y: number }
  pts: { x: number; y: number }[]
  box: Box | null
  before: Mask | null
  snapRef: [number, number, number] | null
  panFrom: { x: number; y: number; ox: number; oy: number }
  /** To fingre: visningen og fingrenes midtpunkt/avstand ved start (skjermpiksler i lerretet). */
  pinch?: { s: number; ox: number; oy: number; mx: number; my: number; dist: number }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function MaskEditor({ image, mask, onChange, selectObject }: MaskEditorProps) {
  const t = useT()
  const W = image.width
  const H = image.height
  const wrap = useRef<HTMLDivElement>(null)
  const view = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('brush')
  const [keep, setKeep] = useState(true)
  const [size, setSize] = useState(() => Math.max(4, Math.round(Math.max(W, H) / 40)))
  const [hard, setHard] = useState(0.8)
  const [snap, setSnap] = useState(false)
  const [mode, setModeState] = useState<View>(() => lastView)
  const setMode = (v: View) => {
    lastView = v
    setModeState(v)
  }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [, bump] = useState(0)
  const st = useRef({ s: 1, ox: 0, oy: 0, fit: true, cursor: null as { x: number; y: number } | null, space: false, drag: null as Drag | null })
  const hist = useRef<MaskHistory | null>(null)
  const layers = useRef<{ rgba: Uint8ClampedArray; cut: HTMLCanvasElement; tint: HTMLCanvasElement } | null>(null)
  const raf = useRef(0)
  /** Aktive pekere (berøring, penn, mus) på lerretet: to fingre = knip/flytt i stedet for tegning. */
  const ptrs = useRef(new Map<number, { x: number; y: number; touch: boolean }>())

  /** Områder av lagene som må bygges på nytt (samles mellom bildene; se refresh/flush). */
  const dirty = useRef<{ cut: Box | null; tint: Box | null }>({ cut: null, tint: null })
  const checker = useRef<CanvasPattern | null>(null)

  // lagene i bildets oppløsning: utklippet (bildet med maskens alfa) og den røde markeringen av det som fjernes
  if (!layers.current || layers.current.cut.width !== W || layers.current.cut.height !== H) {
    const g = image.getContext('2d', { willReadFrequently: true })
    const rgba = g ? g.getImageData(0, 0, W, H).data : new Uint8ClampedArray(W * H * 4)
    const mk = () => Object.assign(document.createElement('canvas'), { width: W, height: H })
    layers.current = { rgba, cut: mk(), tint: mk() }
    hist.current = new MaskHistory(W)
    dirty.current = { cut: null, tint: null }
    refresh({ x0: 0, y0: 0, x1: W, y1: H })
  }

  /**
   * Masken er endret i et område. Lagene bygges ikke her, men én gang per bilde (flush i draw), og bare laget som vises:
   * før ble begge lagene bygget og lastet opp for hver eneste pekerhendelse i et strøk.
   */
  function refresh(b: Box | null) {
    if (!b) return
    dirty.current.cut = unionBox(dirty.current.cut, b)
    dirty.current.tint = unionBox(dirty.current.tint, b)
  }

  /** Bygger det skitne området av ett lag (utklipp eller rød markering) fra masken og originalbildet. */
  function flush(which: 'cut' | 'tint') {
    const L = layers.current
    const b = dirty.current[which]
    if (!L || !b) return
    dirty.current[which] = null
    const x0 = clamp(Math.floor(b.x0), 0, W)
    const y0 = clamp(Math.floor(b.y0), 0, H)
    const x1 = clamp(Math.ceil(b.x1), 0, W)
    const y1 = clamp(Math.ceil(b.y1), 0, H)
    const w = x1 - x0
    const h = y1 - y0
    if (w <= 0 || h <= 0) return
    const out = new ImageData(w, h)
    const d = out.data
    const src = L.rgba
    for (let y = 0; y < h; y++) {
      let gi = (y + y0) * W + x0
      let o = y * w * 4
      for (let x = 0; x < w; x++, gi++, o += 4) {
        const a = mask[gi] ?? 0
        if (which === 'cut') {
          const k = gi * 4
          d[o] = src[k] ?? 0
          d[o + 1] = src[k + 1] ?? 0
          d[o + 2] = src[k + 2] ?? 0
          d[o + 3] = Math.min(a, src[k + 3] ?? 255)
        } else {
          d[o] = 255
          d[o + 1] = 64
          d[o + 2] = 64
          d[o + 3] = Math.round((255 - a) * 0.55)
        }
      }
    }
    ;(which === 'cut' ? L.cut : L.tint).getContext('2d')?.putImageData(out, x0, y0)
  }

  /** Tegner visningen (neste bilde). */
  function draw() {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const c = view.current
      const box = wrap.current
      const L = layers.current
      if (!c || !box || !L) return
      const dpr = window.devicePixelRatio || 1
      const cw = Math.max(1, box.clientWidth)
      const ch = Math.max(1, box.clientHeight)
      if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
        c.width = Math.round(cw * dpr)
        c.height = Math.round(ch * dpr)
        c.style.width = `${cw}px`
        c.style.height = `${ch}px`
      }
      const S = st.current
      if (S.fit) {
        S.s = Math.min(cw / W, ch / H) * 0.96
        S.ox = (cw - W * S.s) / 2
        S.oy = (ch - H * S.s) / 2
      }
      // visningen (skala og forskyvning) for tester og hjelpeverktøy
      ;(c as HTMLCanvasElement & { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView = { s: S.s, ox: S.ox, oy: S.oy }
      const g = c.getContext('2d')
      if (!g) return
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, cw, ch)
      // bakgrunnen bak bildet
      const ix = S.ox
      const iy = S.oy
      const iw = W * S.s
      const ih = H * S.s
      // bare den synlige delen av bildet tegnes (innzoomet er resten utenfor lerretet)
      const vx0 = Math.max(ix, 0)
      const vy0 = Math.max(iy, 0)
      const vx1 = Math.min(ix + iw, cw)
      const vy1 = Math.min(iy + ih, ch)
      if (vx1 > vx0 && vy1 > vy0) {
        const vw = vx1 - vx0
        const vh = vy1 - vy0
        // arbeidsbakgrunnen: bare her i visningen – aldri i masken, bildet eller eksporten
        if (mode === 'checker') {
          if (!checker.current) {
            const tile = Object.assign(document.createElement('canvas'), { width: 20, height: 20 })
            const tg = tile.getContext('2d')
            if (tg) {
              tg.fillStyle = '#ffffff'
              tg.fillRect(0, 0, 20, 20)
              tg.fillStyle = '#d4d4d4'
              tg.fillRect(10, 0, 10, 10)
              tg.fillRect(0, 10, 10, 10)
            }
            checker.current = g.createPattern(tile, 'repeat')
          }
          if (checker.current) {
            g.fillStyle = checker.current
            g.fillRect(vx0, vy0, vw, vh)
          }
        } else if (BG[mode]) {
          g.fillStyle = BG[mode] as string
          g.fillRect(vx0, vy0, vw, vh)
        }
        g.imageSmoothingEnabled = S.s < 2
        const sx = (vx0 - ix) / S.s
        const sy = (vy0 - iy) / S.s
        const sw = Math.min(W - sx, vw / S.s)
        const sh = Math.min(H - sy, vh / S.s)
        if (mode === 'original') {
          flush('tint')
          g.drawImage(image, sx, sy, sw, sh, vx0, vy0, vw, vh)
          g.drawImage(L.tint, sx, sy, sw, sh, vx0, vy0, vw, vh)
        } else {
          flush('cut')
          g.drawImage(L.cut, sx, sy, sw, sh, vx0, vy0, vw, vh)
        }
      }
      g.strokeStyle = 'rgba(255,255,255,0.35)'
      g.lineWidth = 1
      g.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1)
      // forhåndsvisning av form/lasso
      const d = S.drag
      const col = (k: boolean) => (k ? '#3ddc84' : '#ff5a5a')
      if (d && (d.kind === 'shape' || d.kind === 'lasso')) {
        g.save()
        g.strokeStyle = col(d.keep)
        g.fillStyle = d.keep ? 'rgba(61,220,132,0.18)' : 'rgba(255,90,90,0.18)'
        g.lineWidth = 2
        g.setLineDash([6, 4])
        g.beginPath()
        if (d.kind === 'lasso') {
          d.pts.forEach((p, i) => (i ? g.lineTo(ix + p.x * S.s, iy + p.y * S.s) : g.moveTo(ix + p.x * S.s, iy + p.y * S.s)))
          g.closePath()
        } else {
          const x0 = ix + Math.min(d.start.x, d.last.x) * S.s
          const y0 = iy + Math.min(d.start.y, d.last.y) * S.s
          const w = Math.abs(d.last.x - d.start.x) * S.s
          const h = Math.abs(d.last.y - d.start.y) * S.s
          if (tool === 'ellipse') g.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          else g.rect(x0, y0, w, h)
        }
        g.fill()
        g.stroke()
        g.restore()
      }
      // penselens omriss ved markøren (diameter i bildepiksler × zoom)
      const cur = S.cursor
      if (cur && tool === 'brush' && !S.space && d?.kind !== 'pan') {
        const r = (size / 2) * S.s
        g.beginPath()
        g.arc(ix + cur.x * S.s, iy + cur.y * S.s, Math.max(1, r), 0, Math.PI * 2)
        g.lineWidth = 2.5
        g.strokeStyle = 'rgba(0,0,0,0.75)'
        g.stroke()
        g.lineWidth = 1.2
        g.strokeStyle = col(d ? d.keep : keep)
        g.stroke()
        if (hard < 0.95) {
          g.beginPath()
          g.arc(ix + cur.x * S.s, iy + cur.y * S.s, Math.max(1, r * hard), 0, Math.PI * 2)
          g.setLineDash([3, 3])
          g.strokeStyle = 'rgba(255,255,255,0.7)'
          g.stroke()
          g.setLineDash([])
        }
      }
    })
  }

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => draw())
    if (wrap.current) ro.observe(wrap.current)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf.current)
    }
  })

  const toImg = (e: { clientX: number; clientY: number }) => {
    const r = view.current?.getBoundingClientRect()
    const S = st.current
    if (!r) return { x: 0, y: 0 }
    return { x: (e.clientX - r.left - S.ox) / S.s, y: (e.clientY - r.top - S.oy) / S.s }
  }
  const changed = (b: Box | null) => {
    refresh(b)
    onChange()
    bump((n) => n + 1)
    draw()
  }
  /** En operasjon på hele masken (med angre). */
  const whole = (fn: () => void) => {
    const before = new Uint8ClampedArray(mask)
    fn()
    const all = { x0: 0, y0: 0, x1: W, y1: H }
    hist.current?.record(before, all)
    changed(all)
  }
  /** Zoom om et skjermpunkt (punktet under markøren/fingrene står stille). Tallet i verktøylinjen oppdateres én gang per bilde. */
  const bumpRaf = useRef(0)
  const zoomAt = (f: number, sx: number, sy: number) => {
    const S = st.current
    const ns = clamp(S.s * f, 0.02, 32)
    S.ox = sx - ((sx - S.ox) * ns) / S.s
    S.oy = sy - ((sy - S.oy) * ns) / S.s
    S.s = ns
    S.fit = false
    if (!bumpRaf.current) bumpRaf.current = requestAnimationFrame(() => { bumpRaf.current = 0; bump((n) => n + 1) })
    draw()
  }
  const zoomCenter = (f: number) => {
    const b = wrap.current
    if (b) zoomAt(f, b.clientWidth / 2, b.clientHeight / 2)
  }

  // tastatur: [ ] størrelse, X bytter, B/R/E/L/V verktøy, Ctrl+Z / Ctrl+Shift+Z, mellomrom = panorer, 0 = tilpass
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return
      const k = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (mod && k === 'z') {
        e.preventDefault()
        const b = e.shiftKey ? hist.current?.redo(mask) : hist.current?.undo(mask)
        if (b) changed(b)
      } else if (mod && k === 'y') {
        e.preventDefault()
        const b = hist.current?.redo(mask)
        if (b) changed(b)
      } else if (mod) return
      else if (e.key === '[' || e.key === ']') {
        e.preventDefault()
        setSize((v) => clamp(Math.round(v * (e.key === ']' ? 1.2 : 1 / 1.2)), 1, 2000))
      } else if (k === 'x') setKeep((v) => !v)
      else if (k === 'b') setTool('brush')
      else if (k === 'r') setTool('rect')
      else if (k === 'e') setTool('ellipse')
      else if (k === 'l') setTool('lasso')
      else if (k === 'v' && selectObject) setTool('select')
      else if (k === '0') {
        st.current.fit = true
        draw()
      } else if (e.key === ' ') {
        e.preventDefault()
        st.current.space = true
        draw()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        st.current.space = false
        draw()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  })

  // hjul (wheelAction): musehjul = zoom i faste trinn ved markøren; styreflate = to fingre flytter, knip zoomer jevnt;
  // Ctrl/⌘ + hjul = zoom; Shift + hjul = flytt sideveis; Alt + hjul = penselstørrelse
  useEffect(() => {
    const c = view.current
    if (!c) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = c.getBoundingClientRect()
      const a = wheelAction(e, c.clientHeight)
      if (a.kind === 'size') setSize((v) => clamp(Math.round(v * a.f), 1, 2000))
      else if (a.kind === 'zoom') zoomAt(a.f, e.clientX - r.left, e.clientY - r.top)
      else {
        const S = st.current
        S.ox -= a.dx
        S.oy -= a.dy
        S.fit = false
        draw()
      }
    }
    c.addEventListener('wheel', wheel, { passive: false })
    return () => c.removeEventListener('wheel', wheel)
  })

  /** Midtpunkt og avstand mellom de to første fingrene, i lerretets skjermpiksler. */
  const twoFingers = () => {
    const r = view.current?.getBoundingClientRect()
    const f = [...ptrs.current.values()].filter((q) => q.touch).slice(0, 2)
    if (!r || f.length < 2) return null
    const a = f[0]!
    const b = f[1]!
    return { mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, dist: Math.hypot(a.x - b.x, a.y - b.y) }
  }
  /** Avbryter et påbegynt strøk eller en form uten å endre masken (f.eks. når en finger nr. 2 kommer). */
  const cancelDrag = () => {
    const d = st.current.drag
    if (d?.kind === 'paint' && d.before && d.box) {
      mask.set(d.before)
      refresh(d.box)
    }
    st.current.drag = null
  }

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (busy) return
    const S = st.current
    const touch = e.pointerType === 'touch'
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY, touch })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ukjent peker (f.eks. syntetisk): uten fangst */
    }
    // to fingre: knip og flytt – et strøk som akkurat startet med den første fingeren, angres
    const two = touch ? twoFingers() : null
    if (two) {
      cancelDrag()
      S.drag = { kind: 'pinch', keep, start: { x: 0, y: 0 }, last: { x: 0, y: 0 }, pts: [], box: null, before: null, snapRef: null, panFrom: { x: 0, y: 0, ox: S.ox, oy: S.oy }, pinch: { s: S.s, ox: S.ox, oy: S.oy, ...two } }
      draw()
      return
    }
    // ett strøk om gangen: en ekstra knapp eller peker under et drag starter ingenting nytt
    if (S.drag) return
    const p = toImg(e)
    const k = e.altKey ? !keep : keep
    const base: Drag = { kind: 'paint', keep: k, start: p, last: p, pts: [p], box: null, before: null, snapRef: null, panFrom: { x: e.clientX, y: e.clientY, ox: S.ox, oy: S.oy } }
    if (e.button === 1 || S.space) {
      e.preventDefault() // midtknappen: ingen automatisk rulling i nettleseren
      S.drag = { ...base, kind: 'pan' }
      bump((n) => n + 1)
      return
    }
    if (e.button !== 0) return
    if (tool === 'select') {
      if (!selectObject || p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return
      setBusy(true)
      setMsg(t('mask.selecting'))
      void selectObject(p.x, p.y).then((obj) => {
        setBusy(false)
        if (!obj) {
          setMsg(t('mask.selectFailed'))
          return
        }
        setMsg(null)
        // bare det som henger sammen med klikket (ingen løse flekker), og en glatt kant langs bildet i stedet for trappetrinn
        keepConnected(obj, W, H, p.x, p.y)
        const ob = boxOf(obj, W)
        const L = layers.current
        if (ob && L) edgeRefine(obj, L.rgba, W, H, { x0: ob.x0 - 4, y0: ob.y0 - 4, x1: ob.x1 + 4, y1: ob.y1 + 4 }, Math.max(2, Math.round(Math.max(W, H) / 700)), 0.003)
        const before = new Uint8ClampedArray(mask)
        // Hele bildet beholdt (ingen maske ennå) + «Behold» = behold bare objektet; ellers legges objektet til/trekkes fra.
        let b: Box | null
        if (k && mask.every((v) => v === 255)) {
          mask.set(obj)
          b = { x0: 0, y0: 0, x1: W, y1: H }
        } else b = combine(mask, obj, W, k)
        if (b) {
          hist.current?.record(before, b)
          changed(b)
        }
      }, () => {
        setBusy(false)
        setMsg(t('mask.selectFailed'))
      })
      return
    }
    if (tool === 'brush') {
      const L = layers.current
      const d: Drag = { ...base, kind: 'paint', before: new Uint8ClampedArray(mask), snapRef: snap && L ? sampleColor(L.rgba, W, H, p.x, p.y) : null }
      S.drag = d
      paint(d, p)
      return
    }
    S.drag = { ...base, kind: tool === 'lasso' ? 'lasso' : 'shape' }
    draw()
  }

  function paint(d: Drag, p: { x: number; y: number }) {
    const L = layers.current
    const b = brushSegment(mask, W, H, d.last.x, d.last.y, p.x, p.y, size / 2, hard, d.keep, d.snapRef && L ? { rgba: L.rgba, ref: d.snapRef, tol: 42 } : null)
    d.last = p
    d.box = unionBox(d.box, b)
    refresh(b)
    draw()
  }

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const S = st.current
    const q = ptrs.current.get(e.pointerId)
    if (q) {
      q.x = e.clientX
      q.y = e.clientY
    }
    const p = toImg(e)
    S.cursor = p
    const d = S.drag
    if (!d) {
      draw()
      return
    }
    if (d.kind === 'pinch') {
      const now = twoFingers()
      if (now && d.pinch) {
        const v = pinchView(d.pinch, now)
        S.s = v.s
        S.ox = v.ox
        S.oy = v.oy
        S.fit = false
        if (!bumpRaf.current) bumpRaf.current = requestAnimationFrame(() => { bumpRaf.current = 0; bump((n) => n + 1) })
        draw()
      }
      return
    }
    if (d.kind === 'pan') {
      S.ox = d.panFrom.ox + e.clientX - d.panFrom.x
      S.oy = d.panFrom.oy + e.clientY - d.panFrom.y
      S.fit = false
      draw()
      return
    }
    // samlede bevegelser (rask mus) gir et sammenhengende strøk
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? []
    if (d.kind === 'paint') {
      for (const ce of evs.length ? evs : [e.nativeEvent]) paint(d, toImg(ce))
      return
    }
    d.last = p
    if (d.kind === 'lasso') d.pts.push(p)
    draw()
  }

  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    ptrs.current.delete(e.pointerId)
    const S = st.current
    const d = S.drag
    // knip: slutter når en finger løftes; den andre fingeren starter ikke et strøk
    if (d?.kind === 'pinch') {
      if (!twoFingers()) S.drag = null
      draw()
      return
    }
    // en annen peker enn den som startet draget (f.eks. en finger som ble lagt på og løftet), avslutter ikke draget
    if (d && ptrs.current.size > 0 && e.pointerType === 'touch') return
    S.drag = null
    if (!d || d.kind === 'pan') {
      if (d) bump((n) => n + 1)
      draw()
      return
    }
    let b: Box | null = null
    let before = d.before
    if (d.kind === 'paint') b = d.box
    else {
      before = new Uint8ClampedArray(mask)
      if (d.kind === 'lasso') b = fillPolygon(mask, W, H, d.pts, d.keep)
      else {
        const r = { x0: d.start.x, y0: d.start.y, x1: d.last.x, y1: d.last.y }
        if (Math.abs(r.x1 - r.x0) > 1 && Math.abs(r.y1 - r.y0) > 1) b = tool === 'ellipse' ? fillEllipse(mask, W, H, r, d.keep) : fillRect(mask, W, H, r, d.keep)
      }
    }
    if (b && before) {
      hist.current?.record(before, b)
      changed(b)
    } else draw()
  }

  const hs = hist.current
  const TOOLS: [Tool, string][] = [['brush', 'mask.tool.brush'], ['rect', 'mask.tool.rect'], ['ellipse', 'mask.tool.ellipse'], ['lasso', 'mask.tool.lasso'], ...(selectObject ? [['select', 'mask.tool.select'] as [Tool, string]] : [])]
  const VIEWS: [View, string][] = [['checker', 'mask.view.checker'], ['grey', 'mask.view.grey'], ['black', 'mask.view.black'], ['white', 'mask.view.white'], ['magenta', 'mask.view.magenta'], ['cyan', 'mask.view.cyan'], ['green', 'mask.view.green'], ['original', 'mask.view.original']]
  const grow = (r: number) => whole(() => mask.set(separable(mask, W, H, Math.abs(r), r > 0 ? 'max' : 'min')))
  const smooth = () => {
    const L = layers.current
    if (!L) return
    whole(() => {
      edgeRefine(mask, L.rgba, W, H, { x0: 0, y0: 0, x1: W, y1: H }, Math.max(2, Math.round(Math.max(W, H) / 400)), 0.002)
    })
  }

  return (
    <div className={styles.editor} data-mask-editor="">
      <div className={styles.bar} role="toolbar" aria-label={t('mask.title')}>
        <div className={styles.group} role="group" aria-label={t('mask.tools')}>
          {TOOLS.map(([k, l]) => <button key={k} type="button" aria-pressed={tool === k} data-mask-tool={k} onClick={() => setTool(k)}>{t(l as never)}</button>)}
        </div>
        <div className={styles.group} role="group" aria-label={t('mask.mode')}>
          <button type="button" aria-pressed={keep} data-mask-keep="1" onClick={() => setKeep(true)}><i className={styles.dot} style={{ background: '#3ddc84' }} />{t('mask.keep')}</button>
          <button type="button" aria-pressed={!keep} data-mask-keep="0" onClick={() => setKeep(false)}><i className={styles.dot} style={{ background: '#ff5a5a' }} />{t('mask.remove')}</button>
        </div>
        {tool === 'brush' && (
          <>
            <label className={styles.slider}>
              <span>{t('mask.size')}</span>
              <input type="range" min={1} max={Math.max(50, Math.round(Math.max(W, H) / 4))} value={size} data-mask-size="" onChange={(e) => setSize(Number(e.target.value))} />
              <output data-mask-size-val="">{size} px</output>
            </label>
            <label className={styles.slider}>
              <span>{t('mask.hard')}</span>
              <input type="range" min={0} max={1} step={0.05} value={hard} data-mask-hard="" onChange={(e) => setHard(Number(e.target.value))} />
              <output>{Math.round(hard * 100)} %</output>
            </label>
            <label className={styles.check} title={t('mask.snap.help')}>
              <input type="checkbox" checked={snap} data-mask-snap="" onChange={(e) => setSnap(e.target.checked)} />
              <span>{t('mask.snap')}</span>
            </label>
          </>
        )}
      </div>
      <div className={styles.bar}>
        <div className={styles.views} role="radiogroup" aria-label={t('mask.view')}>
          <span>{t('mask.view')}</span>
          {VIEWS.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} aria-label={t(l as never)} title={t(l as never)} data-mask-view={k} className={styles.swatch}
              style={{ background: k === 'checker' ? 'repeating-conic-gradient(#d4d4d4 0 25%, #ffffff 0 50%) 0 0 / 10px 10px' : k === 'original' ? 'linear-gradient(135deg, #8a6f5a 0 50%, rgba(255,64,64,0.8) 50% 100%)' : BG[k] }}
              onClick={() => {
                setMode(k)
                draw()
              }} />
          ))}
        </div>
        <div className={styles.group}>
          <button type="button" aria-label={t('mask.zoomOut')} title={t('mask.zoomOut')} onClick={() => zoomCenter(1 / 1.25)}>−</button>
          <button type="button" data-mask-zoom="" onClick={() => {
            st.current.fit = true
            bump((n) => n + 1)
            draw()
          }}>{st.current.fit ? t('mask.fit') : `${Math.round(st.current.s * 100)} %`}</button>
          <button type="button" aria-label={t('mask.zoomIn')} title={t('mask.zoomIn')} onClick={() => zoomCenter(1.25)}>+</button>
        </div>
        <div className={styles.group}>
          <button type="button" data-mask-undo="" disabled={!hs?.canUndo} onClick={() => { const b = hs?.undo(mask); if (b) changed(b) }}>{t('mask.undo')}</button>
          <button type="button" data-mask-redo="" disabled={!hs?.canRedo} onClick={() => { const b = hs?.redo(mask); if (b) changed(b) }}>{t('mask.redo')}</button>
        </div>
        <div className={styles.group}>
          <button type="button" data-mask-invert="" onClick={() => whole(() => invertInPlace(mask))}>{t('mask.invert')}</button>
          <button type="button" data-mask-shrink="" title={t('mask.shrink.help')} onClick={() => grow(-Math.max(1, Math.round(Math.max(W, H) / 1000)))}>{t('mask.shrink')}</button>
          <button type="button" data-mask-grow="" title={t('mask.grow.help')} onClick={() => grow(Math.max(1, Math.round(Math.max(W, H) / 1000)))}>{t('mask.grow')}</button>
          <button type="button" data-mask-smooth="" title={t('mask.smooth.help')} onClick={smooth}>{t('mask.smooth')}</button>
          <button type="button" data-mask-clean="" title={t('mask.clean.help')} onClick={() => whole(() => { removeSpecks(mask, W, H, Math.max(16, Math.round(W * H * 0.0004))) })}>{t('mask.clean')}</button>
        </div>
      </div>
      <div ref={wrap} className={styles.stage}>
        <canvas ref={view} className={styles.canvas} data-mask-canvas="" style={{ cursor: st.current.drag?.kind === 'pan' ? 'grabbing' : st.current.space ? 'grab' : tool === 'brush' ? 'none' : 'crosshair' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onPointerLeave={() => {
            st.current.cursor = null
            draw()
          }}
          onContextMenu={(e) => e.preventDefault()} />
        {msg && <div className={styles.msg} role="status">{msg}</div>}
      </div>
      <p className={styles.help}>{t('mask.help')}</p>
    </div>
  )
}
