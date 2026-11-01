import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { anchorScroll, isTypingTarget, wheelAction } from './workspace-nav'

/**
 * Navigering på en arbeidsflate der lerretet ligger i en rullbar beholder (`stage` med overflow: auto, `content` med
 * størrelse etter zoom) – Photo Design og Thumbnail Studio. Samme regler som maskeredigeringen (workspace-nav):
 * - loddrett rulling og knip zoomer rundt punktet under pekeren (rulling flytter ikke flaten opp og ned);
 * - sidelengs rulling og Shift + hjul ruller sideveis;
 * - mellomrom + dra eller dra med midtknappen panorerer (som Photoshop/Figma/After Effects); verktøyene får ikke
 *   klikket, så panorering tegner, flytter eller markerer aldri noe.
 * - Alt+0: forrige visning (zoom og utsnitt før siste hopp, f.eks. «Tilpass» eller 100 %); igjen bytter tilbake.
 * - Shift+F10 / menytasten mens flaten har fokus: høyreklikkmenyen åpnes ved det valgte (`menuPoint`) eller midt på.
 * Elementer i scenen med egen rulling kan merkes `data-scroll-native` og ruller da som vanlig.
 */
export function useStageNav(o: {
  stage: RefObject<HTMLElement | null>
  content: RefObject<HTMLElement | null>
  zoom: number
  setZoom: (z: number) => void
  min: number
  max: number
  enabled?: boolean
  /** Hvor tastaturåpnet meny skal vises (klientkoordinater), f.eks. midt på valgt lag. */
  menuPoint?: () => { x: number; y: number } | null
}): { panning: boolean; space: boolean; back: () => void } {
  const latest = useRef(o)
  // siste verdier for lytterne (oppdateres etter rendering, ikke under)
  useLayoutEffect(() => {
    latest.current = o
  })
  const pending = useRef<{ left: number; top: number; width: number; height: number; px: number; py: number } | null>(null)
  const [panning, setPanning] = useState(false)
  const [space, setSpace] = useState(false)
  const spaceRef = useRef(false)
  const over = useRef(false)
  // forrige visning: tilstanden før siste hopp (zoomendringer som kommer tett, som rulling, er ett hopp)
  const view = useRef({ zoom: o.zoom, at: 0, prev: null as { zoom: number; sl: number; st: number } | null, sl: 0, st: 0 })
  const restore = useRef<{ sl: number; st: number } | null>(null)

  // etter at ny zoom er lagt ut: rull slik at punktet under pekeren står stille
  useLayoutEffect(() => {
    const p = pending.current
    const st = o.stage.current
    const ct = o.content.current
    pending.current = null
    const V = view.current
    if (V.zoom !== o.zoom) {
      const now = performance.now()
      if (now - V.at > 600) V.prev = { zoom: V.zoom, sl: V.sl, st: V.st }
      V.at = now
      V.zoom = o.zoom
    }
    const r = restore.current
    restore.current = null
    if (r && st) scrollTo(st, r.sl, r.st)
    else if (p && st && ct) anchorScroll(st, ct, p)
    if (st) {
      V.sl = st.scrollLeft
      V.st = st.scrollTop
    }
  }, [o.zoom, o.stage, o.content])

  const back = () => {
    const V = view.current
    const st = o.stage.current
    const p = V.prev
    if (!p || !st) return
    V.prev = { zoom: V.zoom, sl: st.scrollLeft, st: st.scrollTop }
    V.at = 0
    restore.current = { sl: p.sl, st: p.st }
    if (Math.abs(p.zoom - V.zoom) < 1e-6) {
      scrollTo(st, p.sl, p.st)
      restore.current = null
    } else latest.current.setZoom(p.zoom)
  }
  const backRef = useRef(back)
  useLayoutEffect(() => {
    backRef.current = back
  })


  useEffect(() => {
    const st = o.stage.current
    if (!st) return
    let pan: { id: number; x: number; y: number; sl: number; stp: number } | null = null

    const wheel = (e: WheelEvent) => {
      const L = latest.current
      if (L.enabled === false) return
      if (e.target instanceof Element && e.target.closest('[data-scroll-native]')) return
      const a = wheelAction(e, st.clientHeight)
      if (a.kind === 'none' || a.kind === 'alt') return
      e.preventDefault()
      if (a.kind === 'pan') {
        st.scrollLeft += a.dx
        st.scrollTop += a.dy
        return
      }
      const ct = L.content.current
      if (!ct) return
      const z = Math.max(L.min, Math.min(L.max, L.zoom * a.f))
      if (Math.abs(z - L.zoom) < 1e-4) return
      const r = ct.getBoundingClientRect()
      pending.current = { left: r.left, top: r.top, width: r.width, height: r.height, px: e.clientX, py: e.clientY }
      L.setZoom(z)
    }
    const down = (e: PointerEvent) => {
      if (latest.current.enabled === false) return
      if (!(e.button === 1 || (spaceRef.current && e.button === 0))) return
      e.preventDefault() // midtknappen: ingen automatisk rulling i nettleseren
      e.stopPropagation() // verktøyene får ikke klikket
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, sl: st.scrollLeft, stp: st.scrollTop }
      try {
        st.setPointerCapture(e.pointerId)
      } catch {
        /* ukjent peker */
      }
      setPanning(true)
    }
    const move = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return
      e.stopPropagation()
      st.scrollLeft = pan.sl - (e.clientX - pan.x)
      st.scrollTop = pan.stp - (e.clientY - pan.y)
    }
    const up = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return
      e.stopPropagation()
      pan = null
      setPanning(false)
    }
    const aux = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    const enter = () => {
      over.current = true
    }
    const leave = () => {
      over.current = false
    }
    const scroll = () => {
      view.current.sl = st.scrollLeft
      view.current.st = st.scrollTop
    }
    const key = (e: KeyboardEvent) => {
      if (e.type === 'keydown' && latest.current.enabled !== false && !isTypingTarget(e.target) && !document.querySelector('[data-ctx-menu]')) {
        const inside = st.contains(document.activeElement) || over.current
        if (inside && e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'Digit0') {
          e.preventDefault()
          backRef.current()
          return
        }
        if (st.contains(document.activeElement) && ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu')) {
          e.preventDefault()
          const r = st.getBoundingClientRect()
          const c = latest.current.content.current?.getBoundingClientRect()
          const p = latest.current.menuPoint?.() ?? (c ? { x: c.left + c.width / 2, y: c.top + c.height / 2 } : { x: r.left + r.width / 2, y: r.top + r.height / 2 })
          const x = Math.max(r.left + 4, Math.min(r.right - 4, p.x))
          const y = Math.max(r.top + 4, Math.min(r.bottom - 4, p.y))
          const target = document.elementFromPoint(x, y) ?? st
          target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }))
          return
        }
      }
      if (e.key !== ' ' || isTypingTarget(e.target)) return
      if (e.type === 'keydown') {
        if (!over.current && !spaceRef.current) return
        e.preventDefault() // ikke rull siden
        if (!spaceRef.current) {
          spaceRef.current = true
          setSpace(true)
        }
      } else if (spaceRef.current) {
        spaceRef.current = false
        setSpace(false)
      }
    }
    st.addEventListener('wheel', wheel, { passive: false })
    st.addEventListener('scroll', scroll, { passive: true })
    st.addEventListener('pointerdown', down, true)
    st.addEventListener('pointermove', move, true)
    st.addEventListener('pointerup', up, true)
    st.addEventListener('pointercancel', up, true)
    st.addEventListener('mousedown', aux, true)
    st.addEventListener('pointerenter', enter)
    st.addEventListener('pointerleave', leave)
    window.addEventListener('keydown', key)
    window.addEventListener('keyup', key)
    return () => {
      st.removeEventListener('wheel', wheel)
      st.removeEventListener('scroll', scroll)
      st.removeEventListener('pointerdown', down, true)
      st.removeEventListener('pointermove', move, true)
      st.removeEventListener('pointerup', up, true)
      st.removeEventListener('pointercancel', up, true)
      st.removeEventListener('mousedown', aux, true)
      st.removeEventListener('pointerenter', enter)
      st.removeEventListener('pointerleave', leave)
      window.removeEventListener('keydown', key)
      window.removeEventListener('keyup', key)
    }
  }, [o.stage])

  return { panning, space, back }
}

function scrollTo(el: HTMLElement, left: number, top: number): void {
  el.scrollLeft = left
  el.scrollTop = top
}
