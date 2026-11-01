'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { NumField } from '../../shared/ui/NumField'
import s from './PhotoDesign.module.css'

/** Slider med tallverdi som kan klikkes og skrives inn (shared/ui/NumField); dobbeltklikk på slideren nullstiller. */
export function Range({ label, min, max, step, val, show, on, reset, accent, scale }: { label: string; min: number; max: number; step: number; val: number; show: string; on: (v: number) => void; reset?: () => void; accent?: boolean; scale?: number }) {
  return (
    <div className={s.range}>
      <span><b>{label}</b><NumField value={val} min={min} max={max} step={step} show={show} scale={scale} label={label} onCommit={on} /></span>
      <input type="range" min={min} max={max} step={step} value={val} aria-label={label} className={accent ? s.rangeAccent : undefined} onChange={(e) => on(+e.target.value)} onDoubleClick={reset} />
    </div>
  )
}
