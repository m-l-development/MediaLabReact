'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState } from 'react'
import type { MotionController } from './controller'
import { clamp, type CurveCh, type Grade, type Pt } from './engine/model'
import { curveEval } from './engine/render'
import { NumField } from '../../shared/ui/NumField'
import type { Field, Show } from './fields'
import type { Tx } from './texts'
import s from './MotionDesign.module.css'

const CHANS: [CurveCh, string, string][] = [['m', '#f3f1ec', 'Alle kanaler'], ['r', '#ff5a5f', 'Rød'], ['g', '#3ccf7a', 'Grønn'], ['b', '#5b7cff', 'Blå']]
const COLS: Record<CurveCh, string> = { m: '#ffffff', r: '#ff5a5f', g: '#3ccf7a', b: '#5b7cff' }
const IDENT: Pt[] = [[0, 0], [1, 1]]

/** RGB-kurver: klikk på linjen legger til et punkt; dobbeltklikk, høyreklikk eller dra ut av feltet fjerner det. */
function CurveEditor({ g, ch, setCh, on, tx }: { g: Grade; ch: CurveCh; setCh: (c: CurveCh) => void; on: (o: Partial<Grade>) => void; tx: Tx }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hot, setHot] = useState(-1)
  const C = g.curves ?? {}
  const pts = C[ch] ?? IDENT

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const r = cv.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const W = Math.round(r.width * dpr)
    const H = Math.round(r.height * dpr)
    if (!W || !H) return
    if (cv.width !== W || cv.height !== H) {
      cv.width = W
      cv.height = H
    }
    const x = cv.getContext('2d')
    if (!x) return
    const pad = 7 * dpr
    const w = W - pad * 2
    const h = H - pad * 2
    const X = (v: number) => pad + v * w
    const Y = (v: number) => pad + (1 - v) * h
    x.clearRect(0, 0, W, H)
    x.fillStyle = '#050505'
    x.fillRect(pad, pad, w, h)
    x.strokeStyle = '#262626'
    x.lineWidth = dpr
    for (let i = 1; i < 4; i++) {
      x.beginPath()
      x.moveTo(X(i / 4), pad)
      x.lineTo(X(i / 4), pad + h)
      x.moveTo(pad, Y(i / 4))
      x.lineTo(pad + w, Y(i / 4))
      x.stroke()
    }
    x.strokeStyle = '#333333'
    x.strokeRect(pad, pad, w, h)
    x.strokeStyle = 'rgba(110,130,255,0.55)'
    x.beginPath()
    x.moveTo(X(0), Y(0))
    x.lineTo(X(1), Y(1))
    x.stroke()
    const line = (p: Pt[], col: string, lw: number) => {
      x.strokeStyle = col
      x.lineWidth = lw
      x.beginPath()
      for (let i = 0; i <= 96; i++) {
        const v = i / 96
        const yv = curveEval(p, v)
        if (i) x.lineTo(X(v), Y(yv))
        else x.moveTo(X(v), Y(yv))
      }
      x.stroke()
    }
    for (const [k] of CHANS) {
      const p = C[k]
      if (k === ch || !p || (p.length === 2 && p[0]?.[0] === 0 && p[0]?.[1] === 0 && p[1]?.[0] === 1 && p[1]?.[1] === 1)) continue
      x.globalAlpha = 0.5
      line(p, COLS[k], 1.2 * dpr)
      x.globalAlpha = 1
    }
    line(pts, COLS[ch], 2 * dpr)
    pts.forEach((q, i) => {
      const sz = (i === hot ? 9 : 7) * dpr
      x.fillStyle = i === hot ? COLS[ch] : '#0b0b0b'
      x.strokeStyle = COLS[ch]
      x.lineWidth = 1.5 * dpr
      x.fillRect(X(q[0]) - sz / 2, Y(q[1]) - sz / 2, sz, sz)
      x.strokeRect(X(q[0]) - sz / 2, Y(q[1]) - sz / 2, sz, sz)
    })
  })

  const geom = () => {
    const cv = ref.current
    const r = cv ? cv.getBoundingClientRect() : new DOMRect()
    const pad = 7
    return { r, pad, w: r.width - pad * 2, h: r.height - pad * 2 }
  }
  const hit = (e: { clientX: number; clientY: number }, p: Pt[]) => {
    const G = geom()
    let best = -1
    let bd = 12
    p.forEach((q, i) => {
      const d = Math.hypot(G.r.left + G.pad + q[0] * G.w - e.clientX, G.r.top + G.pad + (1 - q[1]) * G.h - e.clientY)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }
  const commit = (p: Pt[]) => on({ curves: { ...C, [ch]: p.map((q): Pt => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) } })

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const cv = ref.current
    if (!cv) return
    const p = pts.map((q): Pt => [q[0], q[1]])
    const h0 = hit(e, p)
    if (e.button === 2) {
      if (h0 > 0 && h0 < p.length - 1) {
        p.splice(h0, 1)
        commit(p)
      }
      return
    }
    const G = geom()
    const pos = (ev: { clientX: number; clientY: number }): Pt => [clamp((ev.clientX - G.r.left - G.pad) / G.w, 0, 1), clamp(1 - (ev.clientY - G.r.top - G.pad) / G.h, 0, 1)]
    let i = h0
    if (i < 0) {
      if (p.length >= 16) return
      const [x0] = pos(e)
      const y0 = curveEval(p, x0)
      i = p.findIndex((q) => q[0] > x0)
      if (i < 0) i = p.length - 1
      p.splice(i, 0, [x0, y0])
    }
    const q0 = p[i] ?? [0, 0]
    const edge = i === 0 || i === p.length - 1
    let gone = false
    let raf = 0
    setHot(i)
    commit(p)
    try {
      cv.setPointerCapture(e.pointerId)
    } catch {
      // uten fangst
    }
    const mv = (ev: PointerEvent) => {
      const [x, y] = pos(ev)
      const out = !edge && (ev.clientY < G.r.top - 26 || ev.clientY > G.r.bottom + 26 || ev.clientX < G.r.left - 26 || ev.clientX > G.r.right + 26)
      const arr = p.map((q): Pt => [q[0], q[1]])
      if (out) {
        arr.splice(i, 1)
        gone = true
        setHot(-1)
      } else {
        gone = false
        setHot(i)
        const lo = i === 0 ? 0 : (arr[i - 1]?.[0] ?? 0) + 0.01
        const hi = i === arr.length - 1 ? 1 : (arr[i + 1]?.[0] ?? 1) - 0.01
        arr[i] = [edge ? q0[0] : clamp(x, lo, hi), y]
        if (edge) arr[i] = [i === 0 ? clamp(x, 0, (arr[1]?.[0] ?? 1) - 0.01) : clamp(x, (arr[i - 1]?.[0] ?? 0) + 0.01, 1), y]
        p[i] = arr[i] ?? p[i] ?? [0, 0]
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => commit(arr))
    }
    const up = () => {
      cv.removeEventListener('pointermove', mv)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointercancel', up)
      cancelAnimationFrame(raf)
      if (gone) p.splice(i, 1)
      setHot(-1)
      commit(p)
    }
    cv.addEventListener('pointermove', mv)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointercancel', up)
  }
  const dbl = (e: React.MouseEvent) => {
    const p = pts.map((q): Pt => [q[0], q[1]])
    const i = hit(e, p)
    if (i > 0 && i < p.length - 1) {
      p.splice(i, 1)
      commit(p)
    } else if (i === 0) {
      p[0] = [0, 0]
      commit(p)
    } else if (i === p.length - 1) {
      p[i] = [1, 1]
      commit(p)
    }
  }
  return (
    <div className={s.curve}>
      <div className={s.chans}>
        {CHANS.map(([k, col, l]) => <button key={k} type="button" className={s.chan} style={{ background: col }} title={tx(l)} aria-label={tx(l)} aria-pressed={ch === k} onClick={() => setCh(k)} />)}
      </div>
      <canvas ref={ref} className={s.curveCv} data-curve="1" onPointerDown={down} onDoubleClick={dbl} onContextMenu={(e) => e.preventDefault()} />
      <span className={s.hint}>{tx('Klikk på linjen for å legge til et punkt. Dobbeltklikk, høyreklikk eller dra punktet ut av feltet for å fjerne det.')}</span>
      <div className={s.curveBtns}>
        <button type="button" className={s.curveBtn} onClick={() => on({ curves: { ...C, [ch]: IDENT } })}>{tx('Nullstill kanal')}</button>
        <button type="button" className={s.curveBtn} onClick={() => on({ curves: null, cS: 0, cM: 0, cH: 0 })}>{tx('Nullstill alle')}</button>
      </div>
    </div>
  )
}

/** Tallfelt: utkastet vises mens man skriver; gyldige tall lagres med en gang. */
function Num({ f, tx }: { f: Extract<Field, { k: 'num' }>; tx: Tx }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className={s.lbl}>
      <span className={s.b}>{tx(f.label)}</span>
      <input type="number" className={s.num} min={f.min} max={f.max} step={f.step} value={draft ?? String(Math.round(f.val * 100) / 100)}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = parseFloat(e.target.value)
          if (Number.isFinite(n)) f.on(clamp(n, f.min, f.max))
        }}
        onBlur={() => setDraft(null)} />
    </label>
  )
}

const showText = (v: Show, tx: Tx) => (typeof v === 'string' ? v : tx(v.p, v.v))

/** Ett felt i egenskapspanelet (eller i fanene Undertekst og Logo). */
export function FieldView({ f, c, tx }: { f: Field & { open?: boolean }; c: MotionController; tx: Tx }) {
  switch (f.k) {
    case 'head':
      return (
        <button type="button" className={s.secHead} aria-expanded={!!f.open} onClick={() => c.toggleSection(f.label)}>
          <span>{tx(f.label)}</span><span className={s.secArrow}>{f.open ? '−' : '+'}</span>
        </button>
      )
    case 'note':
      return <span className={s.note}>{tx(f.label, f.v)}</span>
    case 'area':
      return (
        <>
          <span className={s.lblTop}><span className={s.b}>{tx(f.label)}</span></span>
          <textarea className={s.area} rows={3} value={f.val} aria-label={tx(f.label)} onChange={(e) => f.on(e.target.value)} />
        </>
      )
    case 'curve':
      return <CurveEditor g={f.c} ch={c.s.curveCh} setCh={(k) => c.set({ curveCh: k })} on={f.on} tx={tx} />
    case 'range':
      return (
        <div className={s.lblCol}>
          <span className={s.lblTop}><span className={s.b}>{tx(f.label)}</span><NumField value={f.val} min={f.min} max={f.max} step={f.step} show={showText(f.show, tx)} label={tx(f.label)} onCommit={f.on} /></span>
          <input type="range" className={s.range} min={f.min} max={f.max} step={f.step} value={f.val} aria-label={tx(f.label)} onChange={(e) => f.on(Number(e.target.value))} />
        </div>
      )
    case 'num':
      return <Num f={f} tx={tx} />
    case 'color':
      return (
        <label className={s.lbl}>
          <span className={s.b}>{tx(f.label)}</span>
          <input type="color" className={s.colorIn} value={f.val} onChange={(e) => f.on(e.target.value)} />
        </label>
      )
    case 'select':
      return (
        <label className={s.lbl}>
          <span className={s.b}>{tx(f.label)}</span>
          <select className={s.select} value={f.val} onChange={(e) => f.on(e.target.value)}>
            {f.opts.map(([v, l]) => <option key={v} value={v}>{f.raw ? l : tx(l)}</option>)}
          </select>
        </label>
      )
    case 'toggle':
      return (
        <button type="button" className={s.toggle} role="switch" aria-checked={f.on} onClick={() => f.set(!f.on)}>
          <span>{tx(f.label)}</span><span className={s.tTrack}><span className={s.tKnob} /></span>
        </button>
      )
    case 'seg':
      return (
        <>
          {f.label && <span className={`${s.lblTop} ${s.b}`}>{tx(f.label)}</span>}
          <div className={s.segs} role="group" aria-label={f.label ? tx(f.label) : undefined}>
            {f.opts.map(([v, l]) => <button key={v} type="button" className={s.seg} aria-pressed={f.val === v} onClick={() => f.on(v)}>{tx(l)}</button>)}
          </div>
        </>
      )
    case 'acts':
      return (
        <div className={s.segs}>
          {f.acts.map((a, i) => <button key={i} type="button" className={`${s.seg} ${a.danger ? s.danger : ''}`} style={{ color: a.danger ? '#ff8f7d' : '#f3f1ec' }} onClick={a.click}>{a.raw ? a.l : tx(a.l)}</button>)}
        </div>
      )
  }
}

export function Fields({ fields, c, tx }: { fields: (Field & { open?: boolean })[]; c: MotionController; tx: Tx }) {
  return (
    <>
      {fields.map((f, i) => (
        <div key={`${f.k}:${'label' in f ? f.label : ''}:${i}`} className={s.field}>
          <FieldView f={f} c={c} tx={tx} />
        </div>
      ))}
    </>
  )
}
