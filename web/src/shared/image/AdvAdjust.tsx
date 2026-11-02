import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { CurvePad, type CurveCh } from '../fill/CurvePad'
import type { CurvePts } from '../fill/fill'
import s from '../fill/CurveGradient.module.css'

/** Bildejusteringene i Avansert modus (samme navn og skala som i Photo; −100…100 der ikke annet står). */
export interface AdvAdj {
  exp?: number
  bri?: number
  con?: number
  hi?: number
  sh?: number
  sat?: number
  temp?: number
  tint?: number
  hue?: number
  fade?: number
  blur?: number
  vig?: number
  grain?: number
  curve?: CurvePts | null
  curveR?: CurvePts | null
  curveG?: CurvePts | null
  curveB?: CurvePts | null
}
export type AdvKey = Exclude<keyof AdvAdj, 'curve' | 'curveR' | 'curveG' | 'curveB'>

const ALL: [AdvKey, MessageKey, number, number][] = [
  ['exp', 'adv.exp', -100, 100], ['bri', 'adv.bri', -100, 100], ['con', 'adv.con', -100, 100], ['hi', 'adv.hi', -100, 100], ['sh', 'adv.sh', -100, 100],
  ['sat', 'adv.sat', -100, 100], ['temp', 'adv.temp', -100, 100], ['tint', 'adv.tint', -100, 100], ['hue', 'adv.hue', -180, 180], ['fade', 'adv.fade', 0, 100],
  ['blur', 'adv.blur', 0, 100], ['vig', 'adv.vig', -100, 100], ['grain', 'adv.grain', 0, 100],
]
const CK: Record<CurveCh, 'curve' | 'curveR' | 'curveG' | 'curveB'> = { m: 'curve', r: 'curveR', g: 'curveG', b: 'curveB' }

/** Om noen avansert justering er i bruk. */
export function advActive(a: AdvAdj | null | undefined): boolean {
  if (!a) return false
  return ALL.some(([k]) => !!a[k]) || !!(a.curve?.length || a.curveR?.length || a.curveG?.length || a.curveB?.length)
}

/**
 * Avanserte bildejusteringer (Avansert modus i Thumbnail Studio og Loop Studio): lys, farge, effekter og RGB-kurver med
 * Photo-motoren. `skip` utelater justeringer verktøyet allerede har i standardvisningen, så ingenting dobles eller endres.
 */
export function AdvAdjust({ value, onChange, skip = [] }: { value: AdvAdj | null | undefined; onChange: (patch: AdvAdj) => void; skip?: readonly AdvKey[] }) {
  const t = useT()
  const a = value ?? {}
  const keys = ALL.filter(([k]) => !skip.includes(k))
  const reset: AdvAdj = { curve: null, curveR: null, curveG: null, curveB: null }
  for (const [k] of keys) reset[k] = 0
  return (
    <div className={s.box} role="group" aria-label={t('adv.title')} data-adv-adjust="">
      <div className={s.head}>
        <b>{t('adv.title')}</b>
        <button type="button" className={s.reset} disabled={!advActive(a)} onClick={() => onChange(reset)}>{t('bg.reset')}</button>
      </div>
      {keys.map(([k, l, mn, mx]) => {
        const v = Number(a[k] ?? 0)
        return (
          <label key={k} className={s.range}>
            <span><b>{t(l)}</b><span>{v > 0 && mn < 0 ? '+' : ''}{Math.round(v)}</span></span>
            <input type="range" min={mn} max={mx} step={1} value={v} aria-label={`${t('adv.title')}: ${t(l)}`} data-adv-key={k} onChange={(e) => onChange({ [k]: Number(e.target.value) })} onDoubleClick={() => onChange({ [k]: 0 })} />
          </label>
        )
      })}
      <b className={s.head}>{t('adv.curves')}</b>
      <CurvePad curves={{ m: a.curve ?? null, r: a.curveR ?? null, g: a.curveG ?? null, b: a.curveB ?? null }} label={t('adv.curves')} onChange={(ch, p) => onChange({ [CK[ch]]: p })} />
      <span className={s.note}>{t('adv.note')}</span>
    </div>
  )
}
