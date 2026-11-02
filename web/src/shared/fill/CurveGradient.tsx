import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { CurvePad } from './CurvePad'
import { CURVE_SAT, CURVE_SHAPES, curveStops, type CurveShape, type Fill, type FillCurves } from './fill'
import s from './CurveGradient.module.css'


/** Forhåndsvalg: ferdige kurver (og fargestyrke) som utgangspunkt – kan justeres videre i ruten. */
const PRESETS: [MessageKey, FillCurves, number][] = [
  ['cg.p.sunset', { r: [[0, 0.32], [0.45, 1], [1, 1]], g: [[0, 0.04], [0.55, 0.42], [1, 0.86]], b: [[0, 0.38], [0.5, 0.18], [1, 0.3]] }, 1.3],
  ['cg.p.ocean', { r: [[0, 0], [1, 0.18]], g: [[0, 0.08], [1, 0.72]], b: [[0, 0.22], [1, 1]] }, 1.3],
  ['cg.p.forest', { r: [[0, 0], [1, 0.42]], g: [[0, 0.07], [1, 0.8]], b: [[0, 0.03], [1, 0.3]] }, 1.2],
  ['cg.p.neon', { r: [[0, 0.95], [0.5, 0.25], [1, 0.05]], g: [[0, 0.05], [0.5, 0.2], [1, 0.95]], b: [[0, 0.85], [0.5, 1], [1, 0.75]] }, 1.4],
  ['cg.p.ember', { r: [[0, 0.08], [0.4, 1], [1, 1]], g: [[0, 0], [0.5, 0.28], [1, 0.92]], b: [[0, 0], [0.8, 0.08], [1, 0.55]] }, 1.3],
  ['cg.p.night', { r: [[0, 0], [1, 0.28]], g: [[0, 0], [1, 0.14]], b: [[0, 0.05], [1, 0.55]] }, 1.3],
  ['cg.p.peach', { r: [[0, 1], [1, 0.96]], g: [[0, 0.78], [1, 0.52]], b: [[0, 0.68], [1, 0.62]] }, 1.2],
  ['cg.p.mono', {}, 1],
  // dempede, profesjonelle bakgrunner (presentasjoner, bedrift, portretter)
  ['cg.p.slate', { r: [[0, 0.11], [1, 0.36]], g: [[0, 0.13], [1, 0.4]], b: [[0, 0.16], [1, 0.47]] }, 1],
  ['cg.p.navy', { r: [[0, 0.03], [1, 0.17]], g: [[0, 0.06], [1, 0.27]], b: [[0, 0.15], [1, 0.5]] }, 1.1],
  ['cg.p.champagne', { r: [[0, 0.97], [1, 0.8]], g: [[0, 0.94], [1, 0.72]], b: [[0, 0.88], [1, 0.6]] }, 1],
  ['cg.p.petrol', { r: [[0, 0.02], [1, 0.09]], g: [[0, 0.11], [1, 0.41]], b: [[0, 0.13], [1, 0.45]] }, 1.1],
]
const SHAPE_KEYS: Record<CurveShape, MessageKey> = { linear: 'cg.s.linear', mirror: 'cg.s.mirror', cross: 'cg.s.cross', diamond: 'cg.s.diamond', square: 'cg.s.square', radial: 'cg.s.radial', conic: 'cg.s.conic' }

/**
 * Fargekurve-gradient for bakgrunnen: samme kurverute som RGB-kurvene for bilder, men kurvene lager fargene i bakgrunnen
 * fra den ene siden til den andre (x = posisjon langs retningen, y = kanalens verdi). Endringer gjør bakgrunnen til en
 * fargekurve-gradient (fyllmodus 'curves'); den lagres og eksporteres som andre fyll.
 */
export function CurveGradient({ fill, onChange }: { fill: Fill | null; onChange: (patch: Partial<Fill>) => void }) {
  const t = useT()
  const on = fill?.mode === 'curves'
  const cv: FillCurves = (on && fill?.curves) || {}
  const ang = on && fill?.angle != null ? fill.angle : 90
  const sat = on && fill?.csat != null ? fill.csat : CURVE_SAT
  const shape: CurveShape = on && fill?.cshape && CURVE_SHAPES.includes(fill.cshape) ? fill.cshape : 'linear'
  // felles for alle endringer: beholder retning, fargestyrke og form
  const base = { mode: 'curves' as const, angle: ang, csat: sat, cshape: shape }
  const strip = `linear-gradient(90deg, ${curveStops(cv, 24, sat).map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')})`
  return (
    <div className={s.box} role="group" aria-label={t('cg.title')} data-curve-gradient="">
      <div className={s.head}>
        <b>{t('cg.title')}</b>
        <button type="button" className={s.reset} disabled={!on} onClick={() => { onChange({ ...base, csat: CURVE_SAT, cshape: 'linear', curves: {} }) }}>{t('bg.reset')}</button>
      </div>
      <div className={s.presets} role="group" aria-label={t('cg.presets')}>
        {PRESETS.map(([k, pc, ps]) => (
          <button key={k} type="button" className={s.preset} aria-label={`${t('cg.presets')}: ${t(k)}`} title={t(k)} onClick={() => { onChange({ ...base, csat: ps, curves: pc }) }}>
            <span style={{ background: `linear-gradient(90deg, ${curveStops(pc, 8, ps).map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')})` }} />
            {t(k)}
          </button>
        ))}
      </div>
      <CurvePad curves={cv} label={t('cg.title')} onChange={(k, p) => onChange({ ...base, curves: { ...cv, [k]: p } })} />
      <div className={s.strip} style={{ background: strip }} aria-hidden="true" />
      <label className={s.shape}>
        <b>{t('cg.shape')}</b>
        <select value={shape} aria-label={t('cg.shape')} data-cg-shape="" onChange={(e) => onChange({ ...base, cshape: e.target.value as CurveShape, curves: cv })}>
          {CURVE_SHAPES.map((k) => <option key={k} value={k}>{t(SHAPE_KEYS[k])}</option>)}
        </select>
      </label>
      <label className={s.range}>
        <span><b>{t('cg.angle')}</b><span>{Math.round(ang)}°</span></span>
        <input type="range" min={0} max={360} step={1} value={Math.round(ang)} aria-label={t('cg.angle')} onChange={(e) => onChange({ ...base, angle: Number(e.target.value), curves: cv })} />
      </label>
      <label className={s.range}>
        <span><b>{t('cg.sat')}</b><span>{Math.round(sat * 100)} %</span></span>
        <input type="range" min={0} max={300} step={5} value={Math.round(sat * 100)} aria-label={t('cg.sat')} onChange={(e) => onChange({ ...base, csat: Number(e.target.value) / 100, curves: cv })} />
      </label>
      <span className={s.note}>{t(on ? 'cg.noteOn' : 'cg.noteOff')}</span>
    </div>
  )
}
