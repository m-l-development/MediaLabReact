'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import type { PointerEvent as RPE } from 'react'
import * as FX from '../../shared/fx/fx'
import { PAL, type PhotoController, type PState } from './controller'
import { Range } from './Ui'
import { ADJ, BLEED, BLEND_HELP, BLENDS, CROP_SHAPES, dims, FONTS, FORMATS, fromCMYK, LOOKS, mmOf, SHAPES, toCMYK, type Adj, type CurveKey, type ImageLayer, type PdLayer } from './engine/model'
import { NumField } from '../../shared/ui/NumField'
import { curveFn } from './engine/render'
import { DEV, type Dev, type Histogram } from './engine/develop'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

const ADJL: [keyof Adj, Phrase, number?, number?][] = [['exp', 'Eksponering'], ['bri', 'Lysstyrke'], ['con', 'Kontrast'], ['hi', 'Høylys'], ['sh', 'Skygger'], ['sat', 'Metning'], ['temp', 'Temperatur'], ['tint', 'Fargetone'], ['hue', 'Nyanse', -180, 180], ['fade', 'Falming', 0, 100], ['blur', 'Uskarphet', 0, 100], ['vig', 'Vignett'], ['grain', 'Korn', 0, 100]]
const hex = (c: string | null | undefined) => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? (c as string) : '#000000')

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={s.toggle} onClick={onClick}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  )
}

function Swatches({ cur, set, list = PAL, size = 24 }: { cur: string | null | undefined; set: (v: string) => void; list?: readonly string[]; size?: number }) {
  return (
    <>
      {list.map((v) => <button key={v} type="button" className={size === 22 ? s.sw22 : s.sw24} style={{ background: v }} aria-label={v} aria-pressed={(cur ?? '').toLowerCase() === v} onClick={() => set(v)} />)}
    </>
  )
}

function ColorPick({ val, set, label, cmyk }: { val: string; set: (v: string) => void; label: string; cmyk?: boolean }) {
  return (
    <>
      <div className={s.swatches}>
        <input type="color" className={s.colorInput} value={hex(val)} aria-label={label} onChange={(e) => set(e.target.value)} />
        <Swatches cur={val} set={set} />
      </div>
      {cmyk && <Cmyk hv={hex(val)} set={set} />}
    </>
  )
}

function Cmyk({ hv, set }: { hv: string; set: (v: string) => void }) {
  const cm = toCMYK(hv)
  return (
    <div className={s.cmyk} title="CMYK">
      <span>CMYK</span>
      {cm.map((v, i) => (
        <label key={i}>
          <span>{'CMYK'[i]}</span>
          <input type="number" min={0} max={100} value={v} onChange={(e) => {
            const n = toCMYK(hv)
            n[i] = Math.max(0, Math.min(100, Math.round(+e.target.value || 0)))
            set(fromCMYK(n))
          }} />
        </label>
      ))}
    </div>
  )
}

/**
 * Posisjon, størrelse og rotasjon for laget, skrevet inn som tall (som Figmas og Photoshops transformfelt).
 * X/Y er venstre og øvre kant i dokumentets piksler; tekst endrer størrelse med skriftstørrelsen, så bare X, Y og rotasjon.
 */
function Transform({ L, d, tx, P }: { L: PdLayer; d: { w: number; h: number }; tx: Tx; P: (o: Partial<PdLayer>, key?: string) => void }) {
  const dm = dims(L)
  const lock = !!L.locked
  const big = Math.max(d.w, d.h) * 4
  const f = (label: Phrase, value: number, min: number, max: number, on: (v: number) => void, unit = ' px') => (
    <div className={s.tfField}>
      <span>{tx(label)}</span>
      <NumField value={Math.round(value * 10) / 10} min={min} max={max} step={1} decimals={0} unit={unit} label={tx(label)} disabled={lock} onCommit={on} />
    </div>
  )
  return (
    <div className={s.tf} role="group" aria-label={tx('Posisjon og størrelse')} data-pd-transform="">
      {f('X', L.x - dm.w / 2, -big, big, (v) => P({ x: v + dm.w / 2 }, 'tfx'))}
      {f('Y', L.y - dm.h / 2, -big, big, (v) => P({ y: v + dm.h / 2 }, 'tfy'))}
      {L.type !== 'text' && f('B', dm.w, 1, big, (v) => P({ w: v, x: L.x - dm.w / 2 + v / 2 }, 'tfw'))}
      {L.type !== 'text' && f('H', dm.h, 1, big, (v) => P({ h: v, y: L.y - dm.h / 2 + v / 2 }, 'tfh'))}
      {f('Rotasjon', L.rot || 0, -180, 180, (v) => P({ rot: v }, 'tfr'), '°')}
    </div>
  )
}

export function Props({ c, S, tx, pickFile }: { c: PhotoController; S: PState; tx: Tx; pickFile: (replace?: string) => void }) {
  const d = S.doc
  if (!d) return null
  if (d.batch) {
    // bildeserie: bare fargene og justeringene for bildet som er åpent (bildet er ett låst lag)
    const BL = d.layers.find((q): q is Extract<PdLayer, { type: 'image' }> => q.type === 'image')
    const it = d.batch.items[d.batch.active]
    return (
      <div className={s.props} data-pd-batch-props="">
        <span className={s.eyebrowSm} title={it?.name}>{it ? it.name : tx('Bildeserie')}</span>
        {BL ? <ColorTab c={c} L={BL} tx={tx} /> : <span className={s.note}>{tx('Legg til bilder for å begynne. Hvert bilde får egne justeringer.')}</span>}
      </div>
    )
  }
  const L = c.selL()
  const ids = c.selIds()
  const isMulti = !L && ids.length > 1
  if (isMulti) {
    const mLs = d.layers.filter((q) => ids.includes(q.id))
    const mGrp = !!mLs[0]?.grp && mLs.every((q) => q.grp === mLs[0]?.grp)
    return (
      <div className={s.props}>
        <span className={s.eyebrowSm}>{ids.length} {tx('lag valgt')}</span>
        <div className={s.row2}>
          <button type="button" className={s.smallBtn} onClick={() => (mGrp ? c.ungroup() : c.group())}>{tx(mGrp ? 'Del opp gruppe' : 'Grupper')}</button>
          <button type="button" className={s.smallBtn} onClick={() => c.centerSel()}>{tx('Midtstill')}</button>
          <button type="button" className={s.smallBtn} onClick={() => c.dup()}>{tx('Dupliser')}</button>
          <button type="button" className={s.smallBtnDanger} onClick={() => c.del()}>{tx('Slett')}</button>
        </div>
        <span className={s.note}>{tx(mGrp ? 'Gruppen flyttes og skaleres som ett objekt. Dobbeltklikk på et element for å redigere det alene.' : 'Dra i hjørnene for å skalere alle likt, eller i sidene for å strekke. Grupper lagene for å låse dem sammen.')}</span>
        <span className={s.dimSm}>{tx('Ctrl+G grupperer · Ctrl+Shift+G deler opp · Shift+klikk legger til eller fjerner')}</span>
      </div>
    )
  }
  if (!L) {
    const dfm = FORMATS.find((f) => f.w === d.w && f.h === d.h)
    return (
      <div className={s.props}>
        <span className={s.eyebrowSm}>{tx('Dokument')}</span>
        <label className={s.field}>
          <span>{tx('Format')}</span>
          <select value={dfm ? dfm.k : 'custom'} onChange={(e) => {
            const f = FORMATS.find((x) => x.k === e.target.value)
            if (f) c.changeFormat(f)
          }}>
            {FORMATS.map((f) => <option key={f.k} value={f.k}>{tx(f.l as Phrase)} · {f.w}×{f.h}</option>)}
            {!dfm && <option value="custom">{tx('Egendefinert')} · {d.w}×{d.h}</option>}
          </select>
        </label>
        <span className={s.dimSm}>{d.w} × {d.h} px</span>
        <span className={s.fieldLabel}>{tx('Bakgrunn')}</span>
        <div className={s.swatches}>
          <input type="color" className={s.colorInput} value={hex(d.bg || '#ffffff')} aria-label={tx('Bakgrunnsfarge')} onChange={(e) => c.setDoc((q) => ({ ...q, bg: e.target.value, fill: null }), 'bg')} />
          <Swatches cur={d.bg} list={PAL.slice(0, 8)} set={(v) => c.setDoc((q) => ({ ...q, bg: v, fill: null }))} />
        </div>
        <Cmyk hv={hex(d.bg || '#ffffff')} set={(v) => c.setDoc((q) => ({ ...q, bg: v, fill: null }), 'bg')} />
        <Toggle label={tx('Gjennomsiktig bakgrunn')} on={!d.bg} onClick={() => c.setDoc((q) => ({ ...q, bg: q.bg ? null : '#ffffff', fill: null }))} />
        <div className={s.printBox}>
          <span className={s.eyebrowSm}>{tx('Trykk')}</span>
          <span className={s.dimSm}>{mmOf(d).map((v) => Math.round(v)).join(' × ')} mm · 300 dpi</span>
          <Toggle label={tx('Utfallende 3 mm (bleed)')} on={!!d.bleed} onClick={() => c.toggleBleed()} />
          <span className={s.note}>{tx(d.bleed ? 'Den stiplede linjen viser trygg sone. Hold tekst innenfor. Bakgrunnen fortsetter 3 mm forbi kanten ved eksport.' : 'Trykkerier krever ofte 3 mm utfallende for A4, A3 og visittkort.')}</span>
          {d.back && (
            <div className={s.seg}>
              {(['front', 'back'] as const).map((k) => <button key={k} type="button" aria-pressed={(d.side ?? 'front') === k} onClick={() => c.showSide(k)}>{tx(k === 'front' ? 'Forside' : 'Bakside')}</button>)}
            </div>
          )}
          <button type="button" className={s.pillDark} onClick={() => c.toggleBack()}>{tx(d.back ? 'Fjern bakside' : 'Legg til bakside')}</button>
        </div>
        <p className={s.note}>{tx('Klikk på et lag i bildet for å redigere det. Dra bilder inn i vinduet, eller lim inn med Ctrl/Cmd + V. Dra et bilde oppå en bildeplass for å bytte det.')}</p>
        <span className={s.hidden}>{BLEED}</span>
      </div>
    )
  }
  const P = (o: Partial<PdLayer> | ((q: PdLayer) => Partial<PdLayer>), k?: string) => c.patchL(L.id, o, k)
  const rg = (label: Phrase, k: string, min: number, max: number, step: number, fmt: (v: number) => string, def: number, key?: string) => {
    const v = Number((L as unknown as Record<string, unknown>)[k] ?? def)
    return <Range key={k} label={tx(label)} min={min} max={max} step={step} val={v} show={fmt(v)} on={(x) => P({ [k]: x } as Partial<PdLayer>, key ?? k)} reset={() => P({ [k]: def } as Partial<PdLayer>)} />
  }
  const pc = (v: number) => `${Math.round(v * 100)} %`
  const px = (v: number) => `${Math.round(v)} px`
  const deg = (v: number) => `${Math.round(v)}°`
  const isImg = L.type === 'image'
  const has = isImg && !!L.src
  const tab = isImg ? S.tab : 'layer'
  const m = Math.min(d.w, d.h)
  const layerRanges = [
    ...(L.type === 'text' ? [rg('Størrelse', 'size', 6, Math.round(m * 0.4), 1, px, 96), rg('Linjeavstand', 'lh', 0.7, 2.2, 0.01, (v) => v.toFixed(2), 1.1), rg('Bokstavavstand', 'ls', -10, 60, 0.5, px, 0), rg('Kontur', 'strokeW', 0, 40, 0.5, px, 0), rg('Skygge', 'shadow', 0, 100, 1, (v) => String(Math.round(v)), 0)] : []),
    ...(L.type === 'glow' ? [rg('Mykhet', 'soft', 0, 1, 0.01, pc, 0.6)] : []),
    ...(L.type === 'shape' ? [rg('Hjørneradius', 'radius', 0, Math.round(Math.min(L.w, L.h) / 2), 1, px, 0), rg('Kontur', 'strokeW', 0, 60, 0.5, px, 0), ...(L.fill2 ? [rg('Vinkel på toning', 'gAng', 0, 360, 1, deg, 90)] : [])] : []),
    rg('Gjennomsiktighet', 'op', 0, 1, 0.01, pc, 1), rg('Rotasjon', 'rot', -180, 180, 1, deg, 0),
    // zoom i utsnittet: 10–1000 %, logaritmisk glider (100 % midt på), tallet skrives i prosent
    ...(has ? [<Range key="cz" label={tx('Zoom i utsnittet')} min={-1} max={1} step={0.005} val={Math.log10(Math.max(0.1, (L as ImageLayer).cz || 1))} show={`${Math.round(((L as ImageLayer).cz || 1) * 100)} %`}
      on={(x) => P({ cz: Math.round(10 ** x * 1000) / 1000 } as Partial<PdLayer>, 'cz')} reset={() => P({ cz: 1 } as Partial<PdLayer>)}
      field={{ value: (L as ImageLayer).cz || 1, min: 0.1, max: 10, step: 0.01, scale: 100, on: (v) => P({ cz: v } as Partial<PdLayer>, 'cz') }} />] : []),
  ]
  return (
    <div className={s.props}>
      {L.locked && (
        <div className={s.lockNote} data-pd-locked="">
          <span>{tx('Laget er låst: det kan ikke flyttes, endres eller slettes.')}</span>
          <button type="button" className={s.smallBtn} onClick={() => P({ locked: false })}>{tx('Lås opp')}</button>
        </div>
      )}
      {/* låst lag: alle kontroller sperret (fieldset disabled) */}
      <fieldset className={s.lockSet} disabled={!!L.locked}>
      <label className={s.field}>
        <span>{tx('Lagnavn')}</span>
        <input value={L.name} onChange={(e) => P({ name: e.target.value.slice(0, 60) }, 'lname')} />
      </label>
      {isImg && (
        <div className={s.seg}>
          {([['layer', 'Lag'], ['color', 'Farge'], ['cut', 'Motiv']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={S.tab === k} onClick={() => c.ui({ tab: k, tool: k === 'cut' ? S.tool : S.tool === 'brush' ? 'move' : S.tool })}>{tx(l)}</button>)}
        </div>
      )}
      {tab === 'layer' && (
        <>
          <Transform L={L} d={d} tx={tx} P={P} />
          {L.type === 'image' && (
            <>
              <div className={s.row2}>
                <button type="button" className={s.smallBtn} onClick={() => pickFile(L.id)}>{tx('Bytt bilde')}</button>
                <button type="button" className={S.tool === 'crop' ? s.smallBtnOn : s.smallBtn} onClick={() => c.ui({ tool: S.tool === 'crop' ? 'move' : 'crop' })}>{tx(S.tool === 'crop' ? 'Ferdig' : 'Beskjær')}</button>
                <button type="button" className={s.smallBtn} onClick={() => P({ x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, rot: 0 })}>{tx('Fyll lerretet')}</button>
                <button type="button" className={s.smallBtn} onClick={() => P({ flipX: !L.flipX })}>{tx('Speil')}</button>
                <button type="button" className={s.smallBtn} onClick={() => void c.trimEdges()}>{tx('Fjern tomme kanter')}</button>
                <button type="button" className={s.smallBtn} onClick={() => c.showWhole()}>{tx('Vis hele bildet')}</button>
              </div>
              {S.tool === 'crop' && <span className={s.warnNote}>{tx('Dra i bildet for å flytte utsnittet. Dra i kantene for å beskjære rammen.')}</span>}
              {/* beskjæringsform: de vanligste som knapper, resten i en liste */}
              {(S.tool === 'crop' || (L.cshape && L.cshape !== 'rect')) && (
                <div className={s.cropShapes} role="group" aria-label={tx('Form på beskjæringen')} data-pd-crop-shape="">
                  {(['rect', 'rounded', 'ellipse'] as const).map((k) => (
                    <button key={k} type="button" className={(L.cshape || 'rect') === k ? s.smallBtnOn : s.smallBtn} aria-pressed={(L.cshape || 'rect') === k} onClick={() => c.setCropShape(L.id, k)}>
                      {tx(CROP_SHAPES.find(([v]) => v === k)?.[1] as Phrase)}
                    </button>
                  ))}
                  <select aria-label={tx('Flere former')} value={['rect', 'rounded', 'ellipse'].includes(L.cshape || 'rect') ? '' : L.cshape} onChange={(e) => e.target.value && c.setCropShape(L.id, e.target.value)}>
                    <option value="">{tx('Flere former …')}</option>
                    {CROP_SHAPES.filter(([k]) => !['rect', 'rounded', 'ellipse'].includes(k)).map(([k, l]) => <option key={k} value={k}>{tx(l as Phrase)}</option>)}
                  </select>
                </div>
              )}
              {has && <Toggle label={tx('Fargelegg bildet')} on={!!L.tint} onClick={() => P({ tint: L.tint ? null : (S.newCol || '#f5b82c') })} />}
              {has && L.tint && (
                <div className={s.swatches}>
                  <input type="color" className={s.colorInput} value={hex(L.tint)} aria-label={tx('Fargetone')} onChange={(e) => c.setCol(L, 'tint', e.target.value, 'tint')} />
                  <Swatches cur={L.tint} set={(v) => c.setCol(L, 'tint', v)} />
                </div>
              )}
            </>
          )}
          {L.type === 'text' && (
            <>
              <label className={s.field}>
                <span>{tx('Tekst')}</span>
                <textarea rows={3} data-pd-text="1" value={L.text} onChange={(e) => P({ text: e.target.value.slice(0, 2000) }, 'text')} />
              </label>
              <div className={s.fontRow}>
                <span>{tx('Skrift')}</span>
                <span>{tx('Tykkelse')}</span>
                <select value={L.font} aria-label={tx('Skrift')} onChange={(e) => P({ font: e.target.value })}>
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={String(L.weight)} aria-label={tx('Tykkelse')} onChange={(e) => P({ weight: +e.target.value })}>
                  {([[400, 'Normal'], [500, 'Medium'], [600, 'Halvfet'], [700, 'Fet'], [800, 'Ekstra fet'], [900, 'Svart']] as const).map(([v, l]) => <option key={v} value={String(v)}>{tx(l)}</option>)}
                </select>
              </div>
              <div className={s.seg}>
                {([['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={L.align === k} onClick={() => P({ align: k })}>{tx(l)}</button>)}
              </div>
              <ColorPick val={L.color} label={tx('Tekstfarge')} cmyk={S.adv} set={(v) => c.setCol(L, 'color', v, 'tcolor')} />
              <Toggle label={tx('Store bokstaver')} on={L.upper} onClick={() => P({ upper: !L.upper })} />
              <label className={s.colorRow}><span>{tx('Konturfarge')}</span><input type="color" value={hex(L.strokeC)} onChange={(e) => P({ strokeC: e.target.value }, 'tsc')} /></label>
              <Toggle label={tx('Understrek')} on={!!L.bar} onClick={() => P({ bar: !L.bar, barColor: L.barColor || L.color, barH: L.barH ?? Math.max(2, Math.round(L.size * 0.07)), barW: L.barW ?? 1, barGap: L.barGap ?? 1 })} />
              {L.bar && (
                <>
                  <label className={s.colorRow}><span>{tx('Understrekfarge')}</span><input type="color" value={hex(L.barColor || L.color)} onChange={(e) => c.setCol(L, 'barColor', e.target.value, 'tbarc')} /></label>
                  <Range label={tx('Tykkelse')} min={1} max={Math.max(20, Math.round(L.size * 0.5))} step={1} val={L.barH ?? Math.round(L.size * 0.07)} show={`${Math.round(L.barH ?? L.size * 0.07)} px`} on={(x) => P({ barH: x }, 'barH')} reset={() => P({ barH: Math.round(L.size * 0.07) })} />
                  <Range label={tx('Bredde')} min={0.1} max={2} step={0.01} val={L.barW ?? 1} show={pc(L.barW ?? 1)} on={(x) => P({ barW: x }, 'barW')} reset={() => P({ barW: 1 })} />
                  <Range label={tx('Avstand')} min={0} max={4} step={0.05} val={L.barGap ?? 1} show={(L.barGap ?? 1).toFixed(2)} on={(x) => P({ barGap: x }, 'barGap')} reset={() => P({ barGap: 1 })} />
                </>
              )}
            </>
          )}
          {L.type === 'shape' && (
            <>
              <div className={s.kindGrid}>
                {SHAPES.map(([k, l]) => <button key={k} type="button" aria-pressed={(L.kind || 'rect') === k} onClick={() => P((q) => ({ kind: k, ...(k === 'line' && q.type === 'shape' ? { h: Math.max(2, Math.min(q.h, q.w * 0.05)) } : {}) }))}>{tx(l as Phrase)}</button>)}
              </div>
              <ColorPick val={L.fill} label={tx('Fyllfarge')} cmyk={S.adv} set={(v) => c.setCol(L, 'fill', v, 'sfill')} />
              <Toggle label={tx('Ingen fyll')} on={L.fill === 'rgba(0,0,0,0)'} onClick={() => P({ fill: L.fill === 'rgba(0,0,0,0)' ? '#f5b82c' : 'rgba(0,0,0,0)' })} />
              <Toggle label={tx('Toning')} on={!!L.fill2} onClick={() => P({ fill2: L.fill2 ? null : '#000000' })} />
              {L.fill2 && <label className={s.colorRow}><span>{tx('Toning til')}</span><input type="color" value={hex(L.fill2)} onChange={(e) => P({ fill2: e.target.value }, 'sf2')} /></label>}
              <label className={s.colorRow}><span>{tx('Konturfarge')}</span><input type="color" value={hex(L.strokeC)} onChange={(e) => P({ strokeC: e.target.value }, 'ssc')} /></label>
            </>
          )}
          {L.type === 'glow' && (
            <div className={s.swatches}>
              <input type="color" className={s.colorInput} value={hex(L.color)} aria-label={tx('Lysfarge')} onChange={(e) => c.setCol(L, 'color', e.target.value, 'gcolor')} />
              <Swatches cur={L.color} set={(v) => c.setCol(L, 'color', v)} />
            </div>
          )}
          {L.type === 'fx' && <FxEdit c={c} S={S} tx={tx} />}
          {layerRanges}
          {S.adv && <label className={s.colorRow}>
            <span>{tx('Blandingsmodus')}</span>
            <select value={L.blend || 'source-over'} onChange={(e) => P({ blend: e.target.value as GlobalCompositeOperation })}>
              {BLENDS.map(([v, l]) => <option key={v} value={v}>{tx(l as Phrase)}</option>)}
            </select>
          </label>}
          {/* hva modusen gjør, og at den bare blander med det som ligger under (alene over hvit bakgrunn ser mange like ut) */}
          {S.adv && (L.blend || 'source-over') !== 'source-over' && (
            <span className={s.dimSm} data-pd-blend-help="">
              {tx((BLEND_HELP[L.blend || 'source-over'] ?? '') as Phrase)}
              {d.layers[0]?.id === L.id ? ' ' + tx('Laget ligger rett på bakgrunnen: legg et bilde eller en farge under for å se effekten.') : ''}
            </span>
          )}
          <div className={s.row3}>
            <button type="button" className={s.smallBtn} onClick={() => P({ x: d.w / 2, y: d.h / 2 })}>{tx('Midtstill')}</button>
            <button type="button" className={s.smallBtn} onClick={() => c.dup()}>{tx('Dupliser')}</button>
            <button type="button" className={s.smallBtnDanger} onClick={() => c.del()}>{tx('Slett')}</button>
            {L.type === 'text' && ((L.tsx || 1) !== 1 || (L.tsy || 1) !== 1) && <button type="button" className={s.smallBtn} onClick={() => P({ tsx: 1, tsy: 1 })}>{tx('Fjern strekk')}</button>}
            {L.grp && <button type="button" className={s.smallBtnBlue} onClick={() => c.setSel(c.grpOf(L))}>{tx('Velg gruppen')}</button>}
            {L.grp && <button type="button" className={s.smallBtn} onClick={() => P({ grp: null })}>{tx('Ta ut av gruppen')}</button>}
          </div>
        </>
      )}
      {tab === 'color' && L.type === 'image' && <ColorTab c={c} L={L} tx={tx} />}
      {tab === 'cut' && L.type === 'image' && (
        <>
          <span className={s.eyebrowSm}>{tx('Klipp ut motiv med AI')}</span>
          <div className={s.row2}>
            <button type="button" className={s.primary} disabled={!!S.busy} onClick={() => void c.cut('person')}>{tx('Person')}</button>
            <button type="button" className={s.primary} disabled={!!S.busy} onClick={() => void c.cut('object')}>{tx('Objekt')}</button>
          </div>
          <span className={s.dimSm}>{tx('Kjører i nettleseren. Første gang lastes modellen ned (MODNet for personer, ormbg for objekter).')}</span>
          <span className={s.eyebrowSm}>{tx('Pensel på masken')}</span>
          <button type="button" className={S.tool === 'brush' ? s.brushOn : s.smallBtn} onClick={() => {
            if (!has) {
              c.flash('Legg inn et bilde først.')
              return
            }
            c.ui({ tool: S.tool === 'brush' ? 'move' : 'brush' })
          }}>{tx(S.tool === 'brush' ? 'Ferdig med penselen' : 'Mal på masken')}</button>
          <div className={s.seg}>
            {([['erase', 'Fjern'], ['restore', 'Gjenopprett']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={S.brush.mode === k} onClick={() => c.ui({ brush: { ...S.brush, mode: k } })}>{tx(l)}</button>)}
          </div>
          <Range label={tx('Størrelse')} min={4} max={Math.round(Math.max(d.w, d.h) / 4)} step={1} val={S.brush.size} show={`${Math.round(S.brush.size)} px`} on={(v) => c.ui({ brush: { ...S.brush, size: v } })} />
          <Range label={tx('Hardhet')} min={0} max={0.95} step={0.01} val={S.brush.hard} show={`${Math.round(S.brush.hard * 100)} %`} on={(v) => c.ui({ brush: { ...S.brush, hard: v } })} />
          <span className={s.dimSm}>{tx('Hold Alt for å bytte mellom fjern og gjenopprett.')}</span>
          {/* den felles maskeredigeringen (samme som Isolate Subject og Thumbnail Studio) */}
          <button type="button" className={s.smallBtnBlue} data-pd-mask-open="" disabled={!has} title={tx('Pensel, former, «Velg objekt» og kantfølging med Behold og Fjern')} onClick={() => c.openMaskEdit()}>{tx('Finjuster masken …')}</button>
          <div className={s.row2}>
            <button type="button" className={s.smallBtn} onClick={() => c.invertMask()}>{tx('Inverter')}</button>
            <button type="button" className={s.smallBtnDanger} onClick={() => c.clearMask()}>{tx('Fjern maske')}</button>
          </div>
        </>
      )}
      </fieldset>
    </div>
  )
}

const DEVL: [keyof Dev, Phrase, number, number][] = [['whites', 'Hvitpunkt', -100, 100], ['blacks', 'Svartpunkt', -100, 100], ['vib', 'Vibrance', -100, 100], ['clarity', 'Klarhet', -100, 100], ['sharp', 'Skarphet', 0, 100]]

/** Histogram (lyshet + RGB) for valgt bildelag, tegnet på et lite lerret. */
function HistView({ h }: { h: Histogram | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current, g = cv?.getContext('2d')
    if (!cv || !g) return
    g.clearRect(0, 0, cv.width, cv.height)
    if (!h || !h.n) return
    let mx = 1
    for (const a of [h.r, h.g, h.b]) for (let i = 2; i < 254; i++) mx = Math.max(mx, a[i] ?? 0)
    g.globalCompositeOperation = 'lighter'
    for (const [a, col] of [[h.r, 'rgba(255,70,70,0.55)'], [h.g, 'rgba(70,220,90,0.55)'], [h.b, 'rgba(80,130,255,0.6)']] as const) {
      g.beginPath()
      g.moveTo(0, cv.height)
      for (let i = 0; i < 256; i++) g.lineTo((i / 255) * cv.width, cv.height - Math.min(1, (a[i] ?? 0) / mx) * cv.height)
      g.lineTo(cv.width, cv.height)
      g.fillStyle = col
      g.fill()
    }
  }, [h])
  return <canvas ref={ref} width={256} height={72} data-pd-hist="" className={s.curve} style={{ width: '100%', height: 72, background: '#111' }} />
}

/** Avansert framkalling (Avansert modus): hvit-/svartpunkt, vibrance, klarhet, skarphet, auto-tone, histogram, kopier/lim inn og før/etter. */
function AdvDevelop({ c, L, tx }: { c: PhotoController; L: Extract<PdLayer, { type: 'image' }>; tx: Tx }) {
  const dev = { ...DEV, ...L.dev }
  const h = c.histOfLayer(L.id)
  const hold = (on: boolean) => c.setBefore(on ? L.id : null)
  return (
    <div data-pd-adv-dev="">
      <div className={s.sectionHead}>
        <span className={s.eyebrowSm}>{tx('Avansert framkalling')}</span>
        <button type="button" className={s.resetBtn} onClick={() => c.resetDev(L.id)}>{tx('Nullstill')}</button>
      </div>
      <HistView h={h} />
      <div className={s.looks}>
        <button type="button" data-pd-auto="" title={tx('Auto-tone: eksponering, hvit- og svartpunkt ut fra bildet')} onClick={() => c.autoTone(L.id)}>{tx('Auto')}</button>
        <button type="button" data-pd-before="" onPointerDown={() => hold(true)} onPointerUp={() => hold(false)} onPointerLeave={() => hold(false)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') hold(true) }} onKeyUp={() => hold(false)}>{tx('Hold for før')}</button>
        <button type="button" data-pd-copydev="" onClick={() => c.copyDev(L.id)}>{tx('Kopier framkalling')}</button>
        <button type="button" data-pd-pastedev="" disabled={!c.s.devClip} onClick={() => c.pasteDev(L.id)}>{tx('Lim inn framkalling')}</button>
      </div>
      {DEVL.map(([k, l, mn, mx]) => {
        const v = Number(dev[k] ?? 0)
        return <Range key={k} label={tx(l)} min={mn} max={mx} step={1} val={v} show={`${v > 0 && mn < 0 ? '+' : ''}${Math.round(v)}`} on={(x) => c.setDev(L.id, k, x, `dev${k}`)} reset={() => c.setDev(L.id, k, 0)} />
      })}
    </div>
  )
}

/** Kurveeditor (Avansert): RGB eller én kanal, histogram bak, store håndtak, verdi under dra. */
const CURVES: [CurveKey, Phrase, string][] = [['curve', 'RGB', 'currentColor'], ['curveR', 'Rød', '#ff5a5a'], ['curveG', 'Grønn', '#2fbf5f'], ['curveB', 'Blå', '#4d8dff']]

function CurveEditor({ c, L, tx }: { c: PhotoController; L: Extract<PdLayer, { type: 'image' }>; tx: Tx }) {
  const [ch, setCh] = useState<CurveKey>('curve')
  const [sel, setSel] = useState<number | null>(null)
  const [read, setRead] = useState<string>('')
  const adj = { ...ADJ, ...L.adj }
  const ptsOf = (k: CurveKey): [number, number][] => (adj[k] ?? [[0, 0], [1, 1]]) as [number, number][]
  const curve = ptsOf(ch)
  const pathOf = (k: CurveKey) => {
    const f = curveFn(adj[k] ?? null)
    let d = ''
    for (let i = 0; i <= 64; i++) {
      const x = i / 64, y = Math.max(0, Math.min(1, f ? f(x) : x))
      d += `${i ? 'L' : 'M'}${(x * 100).toFixed(2)} ${((1 - y) * 100).toFixed(2)}`
    }
    return d
  }
  const h = c.histOfLayer(L.id)
  const ha = h ? (ch === 'curveR' ? h.r : ch === 'curveG' ? h.g : ch === 'curveB' ? h.b : h.l) : null
  let hp = ''
  if (ha) {
    let mx = 1
    for (let i = 3; i < 253; i++) mx = Math.max(mx, ha[i] ?? 0)
    hp = 'M0 100'
    for (let i = 0; i < 256; i++) hp += `L${((i / 255) * 100).toFixed(2)} ${(100 - Math.min(1, (ha[i] ?? 0) / mx) * 92).toFixed(2)}`
    hp += 'L100 100Z'
  }
  const color = CURVES.find((x) => x[0] === ch)?.[2] ?? 'currentColor'
  const set = (pts: [number, number][] | null, live = true) => c.setCurve(L.id, pts, live ? `curve-${ch}` : undefined, ch)
  const show = (p: [number, number]) => setRead(`${tx('Inn')} ${Math.round(p[0] * 255)} → ${tx('Ut')} ${Math.round(p[1] * 255)}`)
  const down = (e: RPE<SVGSVGElement>) => {
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    const Pp = (ev: { clientX: number; clientY: number }): [number, number] => [Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height))]
    const pts: [number, number][] = curve.map((q) => [q[0], q[1]])
    const p = Pp(e)
    const near = 14 / r.width // ~14 px treffsone
    let i = pts.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < near)
    if (e.detail >= 2 && i > 0 && i < pts.length - 1) {
      pts.splice(i, 1)
      setSel(null)
      set(pts, false)
      return
    }
    if (i < 0) {
      pts.push(p)
      pts.sort((x, y) => x[0] - y[0])
      i = pts.indexOf(p)
    }
    setSel(i)
    show(pts[i]!)
    set(pts.map((x) => [x[0], x[1]]))
    const id = e.pointerId
    const mv = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      const q = Pp(ev)
      const lo = i === 0 ? 0 : pts[i - 1]![0] + 0.01
      const hi = i === pts.length - 1 ? 1 : pts[i + 1]![0] - 0.01
      pts[i] = [i === 0 ? 0 : i === pts.length - 1 ? 1 : Math.max(lo, Math.min(hi, q[0])), q[1]]
      show(pts[i]!)
      set(pts.map((x) => [x[0], x[1]]))
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
    const pts: [number, number][] = curve.map((q) => [q[0], q[1]])
    const p = pts[sel]
    if (!p) return
    const st = e.shiftKey ? 10 / 255 : 1 / 255
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel > 0 && sel < pts.length - 1) { pts.splice(sel, 1); setSel(null); set(pts, false); e.preventDefault(); return }
    const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? st : e.key === 'ArrowDown' ? -st : 0
    if (!dx && !dy) return
    e.preventDefault()
    const lo = sel === 0 ? 0 : pts[sel - 1]![0] + 0.01, hi = sel === pts.length - 1 ? 1 : pts[sel + 1]![0] - 0.01
    pts[sel] = [sel === 0 ? 0 : sel === pts.length - 1 ? 1 : Math.max(lo, Math.min(hi, p[0] + dx)), Math.max(0, Math.min(1, p[1] + dy))]
    show(pts[sel]!)
    set(pts)
  }
  return (
    <div data-pd-curves="">
      <div className={s.sectionHead}>
        <span className={s.eyebrowSm}>{tx('Kurve')}</span>
        <button type="button" className={s.resetBtn} onClick={() => { setSel(null); set(null, false) }}>{tx('Nullstill')}</button>
      </div>
      <div className={s.seg} role="group" aria-label={tx('Kurve')}>
        {CURVES.map(([k, l, col]) => (
          <button key={k} type="button" aria-pressed={ch === k} data-pd-ch={k} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '0 8px' }} onClick={() => { setCh(k); setSel(null); setRead('') }}>
            <span aria-hidden="true" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 5, background: k === 'curve' ? 'linear-gradient(90deg,#ff5a5a,#2fbf5f,#4d8dff)' : col }} />{tx(l)}
          </button>
        ))}
      </div>
      <svg viewBox="-3 -3 106 106" className={`${s.curve} ${s.curveBig}`} onPointerDown={down} onKeyDown={key} tabIndex={0} role="img" aria-label={`${tx('Kurve')} ${tx(CURVES.find((x) => x[0] === ch)![1])}`} data-pd-curve-svg="">
        <rect x="0" y="0" width="100" height="100" className={s.curveBg} />
        {hp && <path d={hp} className={s.curveHist} style={ch === 'curve' ? undefined : { fill: color, opacity: 0.18 }} />}
        <path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" className={s.curveGrid} />
        <path d="M0 100L100 0" className={s.curveDiag} />
        {CURVES.filter(([k]) => k !== ch && adj[k]?.length).map(([k, , col]) => <path key={k} d={pathOf(k)} fill="none" stroke={col} strokeWidth="0.8" opacity="0.45" />)}
        <path d={pathOf(ch)} fill="none" stroke={color} strokeWidth="1.6" className={s.curveLine} />
        {curve.map((p, i) => (
          <g key={i}>
            <circle cx={(p[0] * 100).toFixed(2)} cy={((1 - p[1]) * 100).toFixed(2)} r="6" fill="transparent" />
            <circle cx={(p[0] * 100).toFixed(2)} cy={((1 - p[1]) * 100).toFixed(2)} r={sel === i ? 3.4 : 2.8} className={sel === i ? s.curvePtOn : s.curvePt} style={{ stroke: ch === 'curve' ? undefined : color }} />
          </g>
        ))}
      </svg>
      <span className={s.dimSm} aria-live="polite" data-pd-curve-read="">{read || tx('Klikk for å legge til punkt. Dra for å flytte. Dobbeltklikk på et punkt fjerner det.')}</span>
    </div>
  )
}

/** Standard: de vanlige justeringene (enkle navn, gode standardverdier). Avansert: alle, pluss kurver og framkalling. */
const BASIC = new Set<keyof Adj>(['exp', 'bri', 'con', 'sat', 'temp'])

function ColorTab({ c, L, tx }: { c: PhotoController; L: Extract<PdLayer, { type: 'image' }>; tx: Tx }) {
  const adj = { ...ADJ, ...L.adj }
  const adv = c.s.adv
  const hold = (on: boolean) => c.setBefore(on ? L.id : null)
  return (
    <>
      <span className={s.eyebrowSm}>{tx('Looks')}</span>
      <div className={s.looks}>
        {LOOKS.map(([k, l, o]) => <button key={k} type="button" aria-pressed={(L.look || 'none') === k} onClick={() => c.applyLook(L.id, k, o)}>{tx(l as Phrase)}</button>)}
      </div>
      <div className={s.sectionHead}>
        <span className={s.eyebrowSm}>{tx('Justering')}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className={s.resetBtn} data-pd-before-std="" title={tx('Hold inne for å se bildet uten justeringer')} onPointerDown={() => hold(true)} onPointerUp={() => hold(false)} onPointerLeave={() => hold(false)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') hold(true) }} onKeyUp={() => hold(false)}>{tx('Før/etter')}</button>
          {!adv && <button type="button" className={s.resetBtn} data-pd-auto-std="" title={tx('Juster lyset automatisk ut fra bildet')} onClick={() => c.autoTone(L.id)}>{tx('Auto')}</button>}
          {/* i Standard nullstilles også Auto (framkallingen vises ikke der) */}
          <button type="button" className={s.resetBtn} onClick={() => c.patchL(L.id, adv ? { adj: { ...ADJ }, look: 'none' } : { adj: { ...ADJ }, look: 'none', dev: null })}>{tx('Nullstill')}</button>
        </span>
      </div>
      {ADJL.filter(([k]) => adv || BASIC.has(k)).map(([k, l, mn, mx]) => {
        const v = Number(adj[k] ?? 0)
        return <Range key={k} label={tx(l)} min={mn ?? -100} max={mx ?? 100} step={1} val={v} show={`${v > 0 && (mn == null || mn < 0) ? '+' : ''}${Math.round(v)}`} on={(x) => c.setAdj(L.id, k, x, `adj${k}`)} reset={() => c.setAdj(L.id, k, 0)} />
      })}
      {!adv && <span className={s.dimSm}>{tx('Flere verktøy (kurver, høylys og skygger, framkalling) finnes i Avansert modus.')}</span>}
      {adv && <CurveEditor c={c} L={L} tx={tx} />}
      {adv && <AdvDevelop c={c} L={L} tx={tx} />}
    </>
  )
}

/** Redigering av et effektlag (bare i Avansert modus). */
function FxEdit({ c, S, tx }: { c: PhotoController; S: PState; tx: Tx }) {
  const L = c.selL()
  const d = S.doc
  if (!L || L.type !== 'fx' || !d) return null
  const K = FX.KINDS[L.fx]
  if (!K) return null
  if (!S.adv) return <span className={s.warnNote}>{tx('Slå på Avansert modus for å redigere effekten. Den vises og eksporteres som før.')}</span>
  const P = FX.params(L) as unknown as Record<string, number | string>
  const set = (k: string, v: number | string, key?: string) => c.patchL(L.id, (x) => (x.type === 'fx' ? { p: { ...(x.p || {}), [k]: v } } : {}), key)
  const fmt = (dd: Extract<FX.ParamDef, { t: 'r' }>, v: number) => (/^(dir|ang|spread|beam|rot)$/.test(dd.k) && dd.max > 2 ? `${Math.round(v)}°` : dd.step >= 1 ? String(Math.round(v)) : /^(sx|sy|lean|wind|curve)$/.test(dd.k) ? String(Math.round(v * 100)) : `${Math.round(v * 100)} %`)
  const one = L.fx === 'light' && P.mode === 'radial'
  const cks = K.p.filter((dd) => dd.t === 'c' && !(one && dd.k === 'c2'))
  const first = cks[0]
  const same = cks.every((dd) => hex(String(P[dd.k])).toLowerCase() === hex(String(first ? P[first.k] : '')).toLowerCase())
  const sel = cks.length < 2 ? (first ? first.k : '') : S.fxCk && (S.fxCk === 'all' || cks.some((dd) => dd.k === S.fxCk)) ? S.fxCk : same ? 'all' : (first?.k ?? '')
  const keys = sel === 'all' ? cks.map((dd) => dd.k) : [sel]
  const cur = hex(String(P[keys[0] ?? ''] ?? ''))
  const setC = (v: string) => c.patchL(L.id, (x) => {
    if (x.type !== 'fx') return {}
    const p = { ...(x.p || {}) }
    for (const k of keys) p[k] = v
    return { p }
  }, `fxc${sel}`)
  const tabs = cks.length < 2 ? [] : [{ k: 'all', l: tx('Alle'), col: same ? cur : `conic-gradient(${cks.map((dd) => hex(String(P[dd.k]))).join(',')},${hex(String(first ? P[first.k] : ''))})` }, ...cks.map((dd) => ({ k: dd.k as string, l: tx(dd.l as Phrase), col: hex(String(P[dd.k])) }))]
  return (
    <>
      <span className={s.eyebrowSm}>{tx(K.l as Phrase)}</span>
      {cks.length > 0 && (
        <div className={s.stack}>
          {tabs.length > 0 && (
            <div className={s.fxColTabs}>
              {tabs.map((t) => <button key={t.k} type="button" aria-pressed={sel === t.k} onClick={() => c.ui({ fxCk: t.k })}><i style={{ background: t.col }} /><span>{t.l}</span></button>)}
            </div>
          )}
          <div className={s.swatches}>
            <input type="color" className={s.colorInput} value={cur} aria-label={tx('Velg farge')} onChange={(e) => setC(e.target.value)} />
            <Swatches cur={cur} size={22} list={PAL.filter((v) => v !== '#000000' && v !== '#111111')} set={setC} />
          </div>
        </div>
      )}
      {K.p.filter((dd): dd is Extract<FX.ParamDef, { t: 's' }> => dd.t === 's').map((dd) => (
        <label key={dd.k} className={s.colorRow}>
          <span>{tx(dd.l as Phrase)}</span>
          <select value={String(P[dd.k])} onChange={(e) => set(dd.k, e.target.value)}>
            {dd.o.map(([v, l]) => <option key={v} value={v}>{tx(l as Phrase)}</option>)}
          </select>
        </label>
      ))}
      {K.p.filter((dd): dd is Extract<FX.ParamDef, { t: 'r' }> => dd.t === 'r').map((dd) => (
        <Range key={dd.k} label={tx(dd.l as Phrase)} min={dd.min} max={dd.max} step={dd.step} val={Number(P[dd.k])} show={fmt(dd, Number(P[dd.k]))} accent on={(x) => set(dd.k, x, `fx${dd.k}`)} reset={() => set(dd.k, dd.def)} />
      ))}
      <div className={s.row2}>
        <button type="button" className={s.smallBtn} onClick={() => c.patchL(L.id, { seed: ((Math.random() * 1e5) | 0) + 1 })}>{tx('Ny variant')}</button>
        <button type="button" className={s.smallBtn} onClick={() => c.patchL(L.id, { x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, rot: 0 })}>{tx('Fyll bildet')}</button>
        <button type="button" className={s.smallBtn} onClick={() => {
          const v = window.prompt(tx('Navn på forhåndsvalget'), L.name)
          if (v == null) return
          FX.saveCustom({ fx: L.fx, name: v || L.name, p: L.p || {}, blend: L.blend, seed: L.seed })
          c.flash('Lagret under Egne.')
        }}>{tx('Lagre forhåndsvalg')}</button>
        <button type="button" className={s.smallBtn} onClick={() => {
          const pr = L.preset ? FX.byId(L.preset) : null
          c.patchL(L.id, { p: pr ? structuredClone(pr.p) : {} })
        }}>{tx('Tilbakestill')}</button>
      </div>
      <div className={s.hr} />
    </>
  )
}
