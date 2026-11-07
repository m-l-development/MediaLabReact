'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useT } from '../../shared/i18n/i18n'
import { NumField } from '../../shared/ui/NumField'
import s from './PhotoDesign.module.css'

/**
 * Slider med tallverdi som kan klikkes og skrives inn (shared/ui/NumField); dobbeltklikk på slideren nullstiller.
 * `field`: tallfeltet når glideren ikke går i samme enhet som verdien (f.eks. logaritmisk zoom).
 */
/**
 * Glider med tall (TB-6D1979): dobbeltklikk på glideren eller ↺ nullstiller (til `def`, eller med `reset`), og tallet
 * kan skrives inn (klikk eller dobbeltklikk på tallet). ↺ vises bare når verdien er endret fra standard.
 */
export function Range({ label, min, max, step, val, show, on, reset, def, accent, scale, field }: { label: string; min: number; max: number; step: number; val: number; show: string; on: (v: number) => void; reset?: () => void; def?: number; accent?: boolean; scale?: number; field?: { value: number; min: number; max: number; step: number; scale: number; on: (v: number) => void } }) {
  const t = useT()
  const doReset = reset ?? (def != null ? () => on(def) : undefined)
  const changed = def != null ? Math.abs(val - def) > 1e-9 : !!reset
  return (
    <div className={s.range}>
      <span>
        <b>{label}</b>
        <span className={s.rangeVal}>
          {doReset && changed && <button type="button" className={s.rangeReset} data-range-reset="" title={t('range.reset')} aria-label={`${t('range.reset')}: ${label}`} onClick={doReset}>↺</button>}
          {field ? <NumField value={field.value} min={field.min} max={field.max} step={field.step} scale={field.scale} decimals={0} unit=" %" label={label} onCommit={field.on} /> : <NumField value={val} min={min} max={max} step={step} show={show} scale={scale} label={label} onCommit={on} />}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={val} aria-label={label} title={doReset ? t('range.dbl') : undefined} className={accent ? s.rangeAccent : undefined} onChange={(e) => on(+e.target.value)} onDoubleClick={doReset} />
    </div>
  )
}
