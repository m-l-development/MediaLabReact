import { useId, useRef, useState } from 'react'
import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { NumField } from '../ui/NumField'
import { CurvePad } from './CurvePad'
import { colorStops, CURVE_SHAPES, curveStops, distAt, gradStops, stopColor, type ColorStop, type CurvePts, type CurveShape, type Fill, type FillCurves } from './fill'
import s from './CurveGradient.module.css'


/** Forhåndsvalg (de samme fargene som før, nå som fargestopp som kan endres fritt). */
const PRESET_CURVES: [MessageKey, FillCurves, number][] = [
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
/** RGB-kurver (eldre gradienter og forhåndsvalgene) → fargestopp: fem jevne punkter, nok til samme utseende. */
const fromCurves = (cv: FillCurves | null | undefined, sat: number): ColorStop[] => curveStops(cv, 4, sat).map((q) => ({ c: q.c, p: q.p }))
const PRESETS: [MessageKey, ColorStop[]][] = PRESET_CURVES.map(([k, cv, sat]) => [k, fromCurves(cv, sat)])
const SHAPE_KEYS: Record<CurveShape, MessageKey> = { linear: 'cg.s.linear', mirror: 'cg.s.mirror', cross: 'cg.s.cross', diamond: 'cg.s.diamond', square: 'cg.s.square', radial: 'cg.s.radial', conic: 'cg.s.conic' }

/** Standardverdiene en ny gradient får, og som «Tilbakestill» går tilbake til. */
const DEFAULTS = { angle: 90, x: 0.5, y: 0.5, cint: 1, calpha: 1 } as const
const hex = (r: number, g: number, b: number) => `#${((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).padStart(6, '0')}`
const css = (st: ColorStop[]) => `linear-gradient(90deg, ${colorStops(st).map((q) => `${q.c} ${Math.round(q.p * 1000) / 10}%`).join(', ')})`

/** Hvor på flaten (0–1) plass u i fargerekken havner, etter fordelingskurven (første treff). */
function landing(at: (t: number) => number, u: number): number {
  for (let i = 0; i <= 200; i++) if (at(i / 200) >= u - 1e-4) return i / 200
  return 1
}

/**
 * Fargekurve-gradient for bakgrunnen. Én modell (`Fill`): fargestoppene (`cstops`, så mange brukeren vil), fordelings-
 * kurven (`dist`), retning, plassering, form, fargestyrke (`cint`), dekkevne (`calpha`) og av/på (`off`). Fargeeditoren
 * og kurven er to visninger av denne ene modellen og skriver bare til den (ingen kopi å holde i takt, ingen sløyfe):
 * - fargeeditoren endrer fargene og plassen deres i fargerekken; kurven viser dem (fargestripe langs y, en linje per farge)
 * - kurven endrer hvordan fargerekken legges ut over flaten; resultatstripen og merkene i editoren viser hvor hver farge
 *   havner, og fargene beholdes
 * En gradient lages bare med «Lag gradient» eller et forhåndsvalg; glidere og knapper endrer den som finnes. Eldre
 * gradienter (bare RGB-kurver) tegnes som før, og gjøres om til fargestopp ved første endring.
 * Glidere sender en nøkkel (`key`), så én dragning blir ett steg i Angre; knappene er hvert sitt steg.
 */
export function CurveGradient({ fill, onChange, onRemove, base }: { fill: Fill | null; onChange: (patch: Partial<Fill>, key?: string) => void; onRemove: () => void; base?: string | null }) {
  const t = useT()
  const uid = useId().replace(/:/g, '')
  const bar = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState(0)
  const on = fill?.mode === 'curves'
  const off = on && !!fill?.off
  const legacy = on && !fill?.cstops?.length
  const stops: ColorStop[] = !on ? [] : legacy ? fromCurves(fill?.curves, fill?.csat ?? 1.4) : (fill?.cstops as ColorStop[])
  const dist: CurvePts | null = (on && fill?.dist) || null
  const ang = on && fill?.angle != null ? fill.angle : DEFAULTS.angle
  const int = on && fill?.cint != null ? fill.cint : DEFAULTS.cint
  const alpha = on && fill?.calpha != null ? fill.calpha : DEFAULTS.calpha
  const px = on && fill?.x != null ? fill.x : DEFAULTS.x
  const py = on && fill?.y != null ? fill.y : DEFAULTS.y
  const shape: CurveShape = on && fill?.cshape && CURVE_SHAPES.includes(fill.cshape) ? fill.cshape : 'linear'
  const locked = !on || off
  const pct = (v: number) => Math.round(v * 1000) / 10
  // eldre gradient: første endring lagrer fargene som fargestopp (samme farger), så editoren og kurven har én modell
  const edit = (patch: Partial<Fill>, key?: string) => onChange(legacy ? { cstops: stops, curves: null, ...patch } : patch, key)
  const setStops = (l: ColorStop[], key?: string) => edit({ cstops: l }, key)
  const create = (cstops: ColorStop[]) => {
    setSel(0)
    onChange({ mode: 'curves', ...DEFAULTS, cshape: 'linear', cstops, dist: null, curves: null, off: false })
  }
  const first: ColorStop[] = [{ c: base && /^#[0-9a-f]{6}$/i.test(base) ? base : '#ffffff', p: 0 }, { c: '#4d6bff', p: 1 }]

  const i0 = Math.min(sel, Math.max(0, stops.length - 1))
  const cur = stops[i0]
  const sorted = colorStops(stops)
  const at = distAt(dist)
  const result = on ? `linear-gradient(90deg, ${gradStops({ mode: 'curves', cstops: sorted, dist, cint: int, curves: fill?.curves ?? null }, 32).map((q) => `${q.c} ${Math.round(q.p * 1000) / 10}%`).join(', ')})` : ''

  /** Ny farge på plass u i fargerekken (fargen som allerede er der, så gradienten ikke endres før fargen velges). */
  const addAt = (u: number) => {
    const [r, g, b, a] = stopColor(sorted, u)
    const l = [...stops, { c: hex(r, g, b), p: Math.round(u * 1000) / 1000, ...(a < 1 ? { a } : {}) }]
    setSel(l.length - 1)
    setStops(l)
  }
  const addGap = () => {
    // midt i det største mellomrommet
    let u = 0.5, gap = -1
    for (let i = 1; i < sorted.length; i++) { const a = sorted[i - 1] as ColorStop, b = sorted[i] as ColorStop; if (b.p - a.p > gap) { gap = b.p - a.p; u = (a.p + b.p) / 2 } }
    addAt(u)
  }
  const patchStop = (i: number, p: Partial<ColorStop>, key?: string) => setStops(stops.map((q, j) => (j === i ? { ...q, ...p } : q)), key)
  const dragStop = (i: number, e: React.PointerEvent) => {
    if (e.button !== 0 || locked) return
    e.preventDefault()
    e.stopPropagation()
    setSel(i)
    const el = bar.current
    if (!el) return
    const id = e.pointerId
    const mv = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      const r = el.getBoundingClientRect()
      patchStop(i, { p: Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 1000) / 1000 }, 'cg:stop')
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

  // kurven viser fargene: fargerekken langs y (nederst = første farge), en linje per farge og punktet der den havner
  const decor = on && (
    <>
      <defs>
        <linearGradient id={`cgy${uid}`} x1="0" y1="1" x2="0" y2="0">
          {sorted.map((q, i) => <stop key={i} offset={q.p} stopColor={q.c} stopOpacity={q.a ?? 1} />)}
        </linearGradient>
      </defs>
      <rect x="-3" y="0" width="3" height="100" fill={`url(#cgy${uid})`} />
      {sorted.map((q, i) => {
        const y = (1 - q.p) * 100, x = landing(at, q.p) * 100
        return (
          <g key={i} data-cg-stopline={i}>
            <line x1="0" x2={x} y1={y} y2={y} stroke={q.c} strokeWidth="0.8" strokeDasharray="2 1.6" opacity="0.9" />
            <circle cx={x} cy={y} r="1.8" fill={q.c} stroke="#000" strokeWidth="0.4" />
          </g>
        )
      })}
    </>
  )

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
      {!on && <button type="button" className={s.create} data-cg-create="" onClick={() => create(first)}>{t('cg.create')}</button>}
      <div className={s.presets} role="group" aria-label={t('cg.presets')}>
        {PRESETS.map(([k, ps]) => (
          // forhåndsvalg: lager en gradient, eller bytter fargene i den som finnes (retning, plassering og kurve beholdes)
          <button key={k} type="button" className={s.preset} disabled={off} aria-label={`${t('cg.presets')}: ${t(k)}`} title={t(k)} onClick={() => { if (!on) { create(ps); return } setSel(0); edit({ cstops: ps }) }}>
            <span style={{ background: css(ps) }} />
            {t(k)}
          </button>
        ))}
      </div>
      {on && (
        <>
          <fieldset className={s.edit} disabled={locked}>
            {/* 1. fargene: klikk i stripen legger til en farge der, dra et merke for å flytte den */}
            <span className={s.sub}>{t('cg.colors')}</span>
            <div ref={bar} className={s.stops} style={{ background: css(stops) }} data-cg-stops="" onPointerDown={(e) => {
              if (e.button !== 0 || locked || e.target !== e.currentTarget) return
              const r = e.currentTarget.getBoundingClientRect()
              addAt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
            }}>
              {stops.map((q, i) => (
                <button key={i} type="button" className={s.stopMk} aria-pressed={i === i0} aria-label={`${t('cg.color')} ${i + 1}: ${q.c}`} data-cg-stop={i}
                  style={{ left: `${q.p * 100}%`, background: q.c }} onPointerDown={(e) => dragStop(i, e)} onClick={() => setSel(i)}
                  onKeyDown={(e) => {
                    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
                    if (!d) return
                    e.preventDefault()
                    patchStop(i, { p: Math.max(0, Math.min(1, Math.round((q.p + d * (e.shiftKey ? 0.1 : 0.01)) * 1000) / 1000)) })
                  }} />
              ))}
            </div>
            {cur && (
              <div className={s.stopEdit}>
                <input type="color" value={cur.c} aria-label={t('cg.color')} data-cg-color="" onChange={(e) => patchStop(i0, { c: e.target.value }, 'cg:color')} />
                <span className={s.stopNum}>{t('cg.at')}<NumField value={pct(cur.p)} min={0} max={100} unit=" %" label={t('cg.at')} disabled={locked} onCommit={(v) => patchStop(i0, { p: v / 100 })} /></span>
                <span className={s.stopNum}>{t('cg.opacity')}<NumField value={Math.round((cur.a ?? 1) * 100)} min={0} max={100} unit=" %" label={t('cg.opacity')} disabled={locked} onCommit={(v) => patchStop(i0, { a: v / 100 })} /></span>
                <button type="button" className={s.reset} disabled={stops.length <= 2} data-cg-stop-remove="" onClick={() => { setStops(stops.filter((_, j) => j !== i0)); setSel(Math.max(0, i0 - 1)) }}>{t('cg.colorRemove')}</button>
                <button type="button" className={s.reset} data-cg-stop-add="" onClick={addGap}>{t('cg.colorAdd')}</button>
              </div>
            )}

            {/* 2. fordelingskurven: x = plass på flaten, y = plass i fargerekken; dra/klikk punkter for å endre overgangene */}
            <span className={s.sub}>{t('cg.dist')}</span>
            <CurvePad curves={{ m: dist }} channels={false} decor={decor} stroke="#e9e7e2" label={t('cg.dist')} onChange={(_, p) => edit({ dist: p }, 'cg:dist')} />
            {/* resultatet langs retningen, med merker der hver farge havner etter kurven */}
            <div className={s.result} style={{ background: result }} aria-hidden="true" data-cg-result="">
              {sorted.map((q, i) => <i key={i} style={{ left: `${landing(at, q.p) * 100}%`, background: q.c }} />)}
            </div>
            <button type="button" className={s.reset} disabled={!dist} data-cg-dist-reset="" onClick={() => edit({ dist: null })}>{t('cg.distReset')}</button>

            <label className={s.shape}>
              <b>{t('cg.shape')}</b>
              <select value={shape} aria-label={t('cg.shape')} data-cg-shape="" onChange={(e) => edit({ cshape: e.target.value as CurveShape })}>
                {CURVE_SHAPES.map((k) => <option key={k} value={k}>{t(SHAPE_KEYS[k])}</option>)}
              </select>
            </label>
            <div className={s.range}>
              <span><b>{t('cg.angle')}</b><NumField value={Math.round(ang)} min={0} max={360} unit="°" label={t('cg.angle')} disabled={locked} onCommit={(v) => edit({ angle: v })} /></span>
              <input type="range" min={0} max={360} step={1} value={Math.round(ang)} aria-label={t('cg.angle')} data-cg-angle="" onChange={(e) => edit({ angle: Number(e.target.value) }, 'cg:angle')} />
            </div>
            <span className={s.sub}>{t('cg.pos')}</span>
            {(['x', 'y'] as const).map((k) => (
              <div key={k} className={s.range}>
                <span><b>{t(k === 'x' ? 'cg.x' : 'cg.y')}</b><NumField value={pct(k === 'x' ? px : py)} min={-50} max={150} unit=" %" label={t(k === 'x' ? 'cg.x' : 'cg.y')} disabled={locked} onCommit={(v) => edit({ [k]: v / 100 })} /></span>
                <input type="range" min={-50} max={150} step={0.5} value={pct(k === 'x' ? px : py)} aria-label={t(k === 'x' ? 'cg.x' : 'cg.y')} data-cg-pos={k} onChange={(e) => edit({ [k]: Number(e.target.value) / 100 }, 'cg:' + k)} />
              </div>
            ))}
            <div className={s.range}>
              <span><b>{t('cg.int')}</b><NumField value={Math.round(int * 100)} min={0} max={200} unit=" %" label={t('cg.int')} disabled={locked} onCommit={(v) => edit({ cint: v / 100 })} /></span>
              <input type="range" min={0} max={200} step={1} value={Math.round(int * 100)} aria-label={t('cg.int')} data-cg-int="" onChange={(e) => edit({ cint: Number(e.target.value) / 100 }, 'cg:int')} />
            </div>
            <div className={s.range}>
              <span><b>{t('cg.transp')}</b><NumField value={Math.round((1 - alpha) * 100)} min={0} max={100} unit=" %" label={t('cg.transp')} disabled={locked} onCommit={(v) => edit({ calpha: 1 - v / 100 })} /></span>
              <input type="range" min={0} max={100} step={1} value={Math.round((1 - alpha) * 100)} aria-label={t('cg.transp')} data-cg-transp="" onChange={(e) => edit({ calpha: 1 - Number(e.target.value) / 100 }, 'cg:alpha')} />
            </div>
          </fieldset>
          <div className={s.actions}>
            <button type="button" className={s.reset} disabled={locked} title={t('cg.resetTip')} data-cg-reset="" onClick={() => edit({ ...DEFAULTS })}>{t('cg.reset')}</button>
            <button type="button" className={s.reset} disabled={locked} data-cg-reset-all="" onClick={() => { setSel(0); edit({ ...DEFAULTS, cstops: first, dist: null }) }}>{t('cg.resetAll')}</button>
            <button type="button" className={`${s.reset} ${s.danger}`} data-cg-remove="" onClick={onRemove}>{t('cg.remove')}</button>
          </div>
        </>
      )}
      <span className={s.note}>{t(!on ? 'cg.noteOff' : off ? 'cg.offNote' : 'cg.noteOn')}</span>
    </div>
  )
}
