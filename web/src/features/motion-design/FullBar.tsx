import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MotionController } from './controller'
import { fmtT } from './engine/model'
import type { Tx } from './texts'
import s from './MotionDesign.module.css'

/** Tidsmerker med «pene» steg (0,5 s, 1 s, 2 s, 5 s … 10 min), høyst ca. 10 på linjen. */
function ticks(T: number): number[] {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
  const st = steps.find((x) => T / x <= 10) ?? 600
  const out: number[] = []
  for (let v = 0; v <= T + 1e-6; v += st) out.push(Math.round(v * 1000) / 1000)
  return out
}

/**
 * Kompakt avspillingslinje i fullskjerm: spill av / pause, spill av fra start, en søkbar tidslinje med tidsskala og
 * dragbart spillehode, tid / varighet og «Avslutt fullskjerm». Bruker samme spillehode som editoren (c.t / c.seek), så
 * posisjonen er den samme inne i og utenfor fullskjerm. Tidslinjen er en glider for tastaturet (piltaster: ett bilde,
 * Shift: ett sekund, Home / End, Page Up / Down: 10 s).
 */
export function FullBar({ c, T, playing, tx }: { c: MotionController; T: number; playing: boolean; tx: Tx }) {
  const [t, setT] = useState(c.t)
  const track = useRef<HTMLDivElement>(null)
  // spillehodet går uten React-oppdateringer under avspilling: følg det med en lett tegneløkke mens linjen vises
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setT((v) => (Math.abs(v - c.t) > 0.004 ? c.t : v))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [c])

  const D = Math.max(0.1, T)
  const at = (clientX: number) => {
    const r = track.current?.getBoundingClientRect()
    return r ? Math.max(0, Math.min(D, ((clientX - r.left) / r.width) * D)) : c.t
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.focus()
    e.currentTarget.setPointerCapture(e.pointerId)
    c.seek(at(e.clientX))
    const el = e.currentTarget
    const move = (ev: globalThis.PointerEvent) => c.seek(at(ev.clientX), true)
    const up = () => {
      el.removeEventListener('pointermove', move)
      c.seek(c.t)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up, { once: true })
    el.addEventListener('pointercancel', up, { once: true })
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    const d = k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : k === 'ArrowRight' || k === 'ArrowUp' ? 1 : 0
    let n: number | null = null
    if (d) n = c.t + d * (e.shiftKey ? 1 : 1 / 30)
    else if (k === 'Home') n = 0
    else if (k === 'End') n = D
    else if (k === 'PageUp' || k === 'PageDown') n = c.t + (k === 'PageUp' ? 10 : -10)
    if (n == null) return
    e.preventDefault()
    e.stopPropagation() // editorens egne piltaster skal ikke flytte spillehodet en gang til
    c.seek(Math.max(0, Math.min(D, n)))
  }
  const restart = () => {
    c.seek(0)
    if (!c.s.playing) c.play()
  }
  const pct = (v: number) => `${(Math.min(D, v) / D) * 100}%`
  const label = `${fmtT(t)} / ${fmtT(T)}`

  return (
    <div className={s.fullBar} data-md-fullbar="" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button type="button" className={s.fullBtn} data-md-full-play="" aria-label={tx(playing ? 'Pause' : 'Spill av')} title={tx('Spill av / pause (mellomrom)')} onClick={() => c.togglePlay()}>
        {playing
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>}
      </button>
      <button type="button" className={s.fullBtn} data-md-full-restart="" aria-label={tx('Spill av fra start')} title={tx('Spill av fra start')} onClick={restart}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="3" height="16" /><path d="M20 4v16L8 12z" /></svg>
      </button>
      <div ref={track} className={s.fullTrack} role="slider" tabIndex={0} data-md-full-track="" aria-label={tx('Tidslinje')}
        aria-valuemin={0} aria-valuemax={Math.round(D * 10) / 10} aria-valuenow={Math.round(t * 10) / 10} aria-valuetext={label}
        onPointerDown={down} onKeyDown={key}>
        <div className={s.fullRail} aria-hidden="true">
          <div className={s.fullFill} style={{ width: pct(t) }} />
        </div>
        {ticks(D).map((v) => (
          <span key={v} className={s.fullTick} style={{ left: pct(v) }} aria-hidden="true"><i />{fmtT(v).replace(/\.0$/, '')}</span>
        ))}
        <span className={s.fullHead} style={{ left: pct(t) }} aria-hidden="true" />
      </div>
      <span className={s.fullTime} data-md-full-time="">{label}</span>
      <button type="button" className={s.fullExit} data-md-full-exit="" onClick={() => c.toggleFull()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
        {tx('Avslutt fullskjerm')} <kbd>Esc</kbd>
      </button>
    </div>
  )
}
