import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { NumField } from '../ui/NumField'
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

/** Standardverdiene en ny gradient får, og som «Tilbakestill» går tilbake til (kurvene og formen beholdes). */
const DEFAULTS = { angle: 90, x: 0.5, y: 0.5, cint: 1, csat: CURVE_SAT } as const

/**
 * Fargekurve-gradient for bakgrunnen: samme kurverute som RGB-kurvene for bilder, men kurvene lager fargene i bakgrunnen
 * fra den ene siden til den andre (x = posisjon langs retningen, y = kanalens verdi). Lagres og eksporteres som andre fyll.
 *
 * Opprettelse og redigering er skilt: en gradient lages bare med «Lag gradient» eller et forhåndsvalg. Kontrollene
 * (retning, plassering, fargestyrke, metning, form, kurvene) endrer bare den som finnes, og sender bare feltet som endres
 * (før sendte hver glider modus «curves», så å bevege en glider laget en ny gradient). Av/på beholder innstillingene
 * (`off`: tegnes ikke, bakgrunnsfargen vises); «Fjern gradient» tar den bort helt. Glidere sender en nøkkel (`key`), så én
 * dragning blir ett steg i Angre; knappene og tallfeltene er hvert sitt steg.
 */
export function CurveGradient({ fill, onChange, onRemove }: { fill: Fill | null; onChange: (patch: Partial<Fill>, key?: string) => void; onRemove: () => void }) {
  const t = useT()
  const on = fill?.mode === 'curves'
  const off = on && !!fill?.off
  const cv: FillCurves = (on && fill?.curves) || {}
  const ang = on && fill?.angle != null ? fill.angle : DEFAULTS.angle
  const sat = on && fill?.csat != null ? fill.csat : CURVE_SAT
  const int = on && fill?.cint != null ? fill.cint : DEFAULTS.cint
  const px = on && fill?.x != null ? fill.x : DEFAULTS.x
  const py = on && fill?.y != null ? fill.y : DEFAULTS.y
  const shape: CurveShape = on && fill?.cshape && CURVE_SHAPES.includes(fill.cshape) ? fill.cshape : 'linear'
  const strip = `linear-gradient(90deg, ${curveStops(cv, 24, sat, int).map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')})`
  // en ny gradient: alle felt satt, så ingenting arves fra et tidligere fyll
  const create = (curves: FillCurves, csat: number) => onChange({ mode: 'curves', ...DEFAULTS, csat, cshape: 'linear', curves, off: false })
  const locked = !on || off
  const pct = (v: number) => Math.round(v * 1000) / 10
  return (
    <div className={s.box} role="group" aria-label={t('cg.title')} data-curve-gradient="" data-cg-state={!on ? 'none' : off ? 'off' : 'on'}>
      <div className={s.head}>
        <b>{t('cg.title')}</b>
        {on && (
          <button type="button" className={s.switch} role="switch" aria-checked={!off} data-cg-toggle="" onClick={() => onChange({ off: !off })}>
            <span aria-hidden="true" />{t('cg.on')}
          </button>
        )}
      </div>
      {!on && <button type="button" className={s.create} data-cg-create="" onClick={() => create({}, CURVE_SAT)}>{t('cg.create')}</button>}
      <div className={s.presets} role="group" aria-label={t('cg.presets')}>
        {PRESETS.map(([k, pc, ps]) => (
          // forhåndsvalg: lager en gradient, eller bytter kurvene i den som finnes (retning og plassering beholdes)
          <button key={k} type="button" className={s.preset} disabled={off} aria-label={`${t('cg.presets')}: ${t(k)}`} title={t(k)} onClick={() => (on ? onChange({ csat: ps, curves: pc }) : create(pc, ps))}>
            <span style={{ background: `linear-gradient(90deg, ${curveStops(pc, 8, ps).map((q) => `${q.c} ${Math.round(q.p * 100)}%`).join(', ')})` }} />
            {t(k)}
          </button>
        ))}
      </div>
      {on && (
        <>
          <fieldset className={s.edit} disabled={locked}>
            <CurvePad curves={cv} label={t('cg.title')} onChange={(k, p) => onChange({ curves: { ...cv, [k]: p } }, 'cg:curve')} />
            <div className={s.strip} style={{ background: strip }} aria-hidden="true" />
            <label className={s.shape}>
              <b>{t('cg.shape')}</b>
              <select value={shape} aria-label={t('cg.shape')} data-cg-shape="" onChange={(e) => onChange({ cshape: e.target.value as CurveShape })}>
                {CURVE_SHAPES.map((k) => <option key={k} value={k}>{t(SHAPE_KEYS[k])}</option>)}
              </select>
            </label>
            <div className={s.range}>
              <span><b>{t('cg.angle')}</b><NumField value={Math.round(ang)} min={0} max={360} unit="°" label={t('cg.angle')} disabled={locked} onCommit={(v) => onChange({ angle: v })} /></span>
              <input type="range" min={0} max={360} step={1} value={Math.round(ang)} aria-label={t('cg.angle')} data-cg-angle="" onChange={(e) => onChange({ angle: Number(e.target.value) }, 'cg:angle')} />
            </div>
            <span className={s.sub}>{t('cg.pos')}</span>
            {(['x', 'y'] as const).map((k) => (
              <div key={k} className={s.range}>
                <span><b>{t(k === 'x' ? 'cg.x' : 'cg.y')}</b><NumField value={pct(k === 'x' ? px : py)} min={-50} max={150} unit=" %" label={t(k === 'x' ? 'cg.x' : 'cg.y')} disabled={locked} onCommit={(v) => onChange({ [k]: v / 100 })} /></span>
                <input type="range" min={-50} max={150} step={0.5} value={pct(k === 'x' ? px : py)} aria-label={t(k === 'x' ? 'cg.x' : 'cg.y')} data-cg-pos={k} onChange={(e) => onChange({ [k]: Number(e.target.value) / 100 }, 'cg:' + k)} />
              </div>
            ))}
            <div className={s.range}>
              <span><b>{t('cg.int')}</b><NumField value={Math.round(int * 100)} min={0} max={200} unit=" %" label={t('cg.int')} disabled={locked} onCommit={(v) => onChange({ cint: v / 100 })} /></span>
              <input type="range" min={0} max={200} step={1} value={Math.round(int * 100)} aria-label={t('cg.int')} data-cg-int="" onChange={(e) => onChange({ cint: Number(e.target.value) / 100 }, 'cg:int')} />
            </div>
            <div className={s.range}>
              <span><b>{t('cg.sat')}</b><NumField value={Math.round(sat * 100)} min={0} max={300} unit=" %" label={t('cg.sat')} disabled={locked} onCommit={(v) => onChange({ csat: v / 100 })} /></span>
              <input type="range" min={0} max={300} step={5} value={Math.round(sat * 100)} aria-label={t('cg.sat')} data-cg-sat="" onChange={(e) => onChange({ csat: Number(e.target.value) / 100 }, 'cg:sat')} />
            </div>
          </fieldset>
          <div className={s.actions}>
            <button type="button" className={s.reset} disabled={locked} title={t('cg.resetTip')} data-cg-reset="" onClick={() => onChange({ ...DEFAULTS })}>{t('cg.reset')}</button>
            <button type="button" className={s.reset} disabled={locked} onClick={() => onChange({ curves: {} })}>{t('cg.resetCurves')}</button>
            <button type="button" className={`${s.reset} ${s.danger}`} data-cg-remove="" onClick={onRemove}>{t('cg.remove')}</button>
          </div>
        </>
      )}
      <span className={s.note}>{t(!on ? 'cg.noteOff' : off ? 'cg.offNote' : 'cg.noteOn')}</span>
    </div>
  )
}
