'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import s from './PhotoDesign.module.css'

export function Range({ label, min, max, step, val, show, on, reset, accent }: { label: string; min: number; max: number; step: number; val: number; show: string; on: (v: number) => void; reset?: () => void; accent?: boolean }) {
  return (
    <label className={s.range}>
      <span><b>{label}</b><span>{show}</span></span>
      <input type="range" min={min} max={max} step={step} value={val} className={accent ? s.rangeAccent : undefined} onChange={(e) => on(+e.target.value)} onDoubleClick={reset} />
    </label>
  )
}
