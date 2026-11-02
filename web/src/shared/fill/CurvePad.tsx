import { useState } from 'react'
import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { curveFn } from './curve'
import type { CurvePts, FillCurves } from './fill'
import s from './CurveGradient.module.css'

export type CurveCh = keyof FillCurves
const CHS: [CurveCh, MessageKey, string][] = [['m', 'cg.all', '#e9e7e2'], ['r', 'cg.r', '#ff5a5a'], ['g', 'cg.g', '#2fbf5f'], ['b', 'cg.b', '#4d8dff']]
const LINE: CurvePts = [[0, 0], [1, 1]]

/**
 * Kurverute med kanalene RGB, rød, grønn og blå: klikk legger til punkt, dra flytter, dobbeltklikk fjerner; piltaster
 * flytter valgt punkt. Brukes av fargekurve-gradienten og av RGB-kurvene i Avansert modus (Thumbnail, Loop).
 */
export function CurvePad({ curves: cv, onChange, label }: { curves: FillCurves; onChange: (ch: CurveCh, pts: CurvePts | null) => void; label: string }) {
  const t = useT()
  const [ch, setCh] = useState<CurveCh>('m')
  const [sel, setSel] = useState<number | null>(null)
  const pts = (cv[ch] ?? LINE) as CurvePts
  const color = CHS.find((x) => x[0] === ch)?.[2] ?? '#e9e7e2'
  const set = (p: CurvePts | null) => onChange(ch, p)
  const pathOf = (k: CurveCh) => {
    const f = curveFn(cv[k] ?? null)
    let d = ''
    for (let i = 0; i <= 48; i++) {
      const x = i / 48
      const y = Math.max(0, Math.min(1, f ? f(x) : x))
      d += `${i ? 'L' : 'M'}${(x * 100).toFixed(2)} ${((1 - y) * 100).toFixed(2)}`
    }
    return d
  }
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    const P = (ev: { clientX: number; clientY: number }): [number, number] => [Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height))]
    const l: CurvePts = pts.map((q) => [q[0], q[1]])
    const p = P(e)
    const near = (e.pointerType === 'touch' ? 22 : 14) / r.width
    let i = l.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < near)
    if (e.detail >= 2 && i > 0 && i < l.length - 1) {
      l.splice(i, 1)
      setSel(null)
      set(l)
      return
    }
    if (i < 0) {
      l.push(p)
      l.sort((a, b) => a[0] - b[0])
      i = l.indexOf(p)
    }
    setSel(i)
    set(l.map((q) => [q[0], q[1]]))
    const id = e.pointerId
    const mv = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      const q = P(ev)
      const lo = i === 0 ? 0 : (l[i - 1] as [number, number])[0] + 0.01
      const hi = i === l.length - 1 ? 1 : (l[i + 1] as [number, number])[0] - 0.01
      l[i] = [i === 0 ? 0 : i === l.length - 1 ? 1 : Math.max(lo, Math.min(hi, q[0])), q[1]]
      set(l.map((x) => [x[0], x[1]]))
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  /** Tastatur: piltaster flytter valgt punkt, Delete fjerner det (ikke endepunktene). */
  const key = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (sel == null) return
    const l: CurvePts = pts.map((q) => [q[0], q[1]])
    const p = l[sel]
    if (!p) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel > 0 && sel < l.length - 1) {
      e.preventDefault()
      l.splice(sel, 1)
      setSel(null)
      set(l)
      return
    }
    const stp = e.shiftKey ? 10 / 255 : 1 / 255
    const dx = e.key === 'ArrowLeft' ? -stp : e.key === 'ArrowRight' ? stp : 0
    const dy = e.key === 'ArrowUp' ? stp : e.key === 'ArrowDown' ? -stp : 0
    if (!dx && !dy) return
    e.preventDefault()
    const lo = sel === 0 ? 0 : (l[sel - 1] as [number, number])[0] + 0.01
    const hi = sel === l.length - 1 ? 1 : (l[sel + 1] as [number, number])[0] - 0.01
    l[sel] = [sel === 0 ? 0 : sel === l.length - 1 ? 1 : Math.max(lo, Math.min(hi, p[0] + dx)), Math.max(0, Math.min(1, p[1] + dy))]
    set(l)
  }
  return (
    <>
        <div className={s.seg} role="group" aria-label={t('cg.channel')}>
          {CHS.map(([k, l, col]) => (
            <button key={k} type="button" aria-pressed={ch === k} data-cg-ch={k} onClick={() => { setCh(k); setSel(null) }}>
              <span aria-hidden="true" className={s.dot} style={{ background: k === 'm' ? 'linear-gradient(90deg,#ff5a5a,#2fbf5f,#4d8dff)' : col }} />{t(l)}
            </button>
          ))}
        </div>
        <svg viewBox="-3 -3 106 106" className={s.curve} onPointerDown={down} onKeyDown={key} tabIndex={0} role="img" aria-label={`${label}: ${t(CHS.find((x) => x[0] === ch)![1])}`} data-cg-svg="">
          <rect x="0" y="0" width="100" height="100" className={s.bg} />
          <path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" className={s.grid} />
          {CHS.filter(([k]) => k !== ch && cv[k]?.length).map(([k, , col]) => <path key={k} d={pathOf(k)} fill="none" stroke={col} strokeWidth="1.1" opacity="0.8" />)}
          <path d={pathOf(ch)} fill="none" stroke={color} strokeWidth="2" />
          {pts.map((p, i) => (
            <circle key={i} cx={(p[0] * 100).toFixed(2)} cy={((1 - p[1]) * 100).toFixed(2)} r={sel === i ? 3.4 : 2.8} className={sel === i ? s.ptOn : s.pt} style={{ stroke: ch === 'm' ? undefined : color }} />
          ))}
        </svg>
    </>
  )
}
