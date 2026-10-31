'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
/**
 * Motion Design → Avansert: mediebibliotek (type, varighet, legg på spor, feil per fil) og tidsinspektør for det valgte
 * klippet (spor, start, slutt, varighet, trim, del, flytt, slett). Bruker samme prosjekt og motor som Standard.
 */
import { useState } from 'react'
import { tlEnd, ZMAX, ZMIN, type MotionController, type MState } from './controller'
import { fmtHMS, fmtTC, parseTime, spanOf, trackName } from './engine/edit'
import { contentDur, type Media, type Project } from './engine/model'
import { FX_DEFS, FX_KINDS, type FxDef, type FxKind } from './engine/fx'
import type { Phrase, Tx } from './texts'
import s from './MotionDesign.module.css'

const KIND: Record<Media['kind'], Phrase> = { video: 'Video', image: 'Bilde', audio: 'Lyd' }
const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')
const sec = (v: number) => (Math.round(v * 100) / 100).toFixed(2)

export function AdvBin({ c, S, p, tx, onShared }: { c: MotionController; S: MState; p: Project; tx: Tx; onShared: () => void }) {
  return (
    <div className={s.panel} data-md-bin="">
      <span className={s.binHead}>{tx('Mediebibliotek')}</span>
      <button type="button" className={s.bigLight} data-md-bin-import="" onClick={() => c.pickMedia()}>{tx('Importer video, lyd og bilder …')}</button>
      <button type="button" className={`${s.barBtn} ${s.small}`} onClick={onShared}>{tx('Fra Dine medier')}</button>
      <span className={s.hint}>{tx('MP4, MOV, WebM, PNG, JPG, WebP, GIF, MP3, WAV, M4A, AAC, OGG og FLAC. Du kan også dra filer inn i vinduet.')}</span>
      {S.binErr.length > 0 && (
        <div className={s.binErr} role="alert" data-md-bin-err="">
          <span>{tx('Kunne ikke importeres ({n}):', { n: S.binErr.length })}</span>
          <ul>{S.binErr.slice(0, 20).map((e, i) => <li key={i}><b>{e.name}</b> – {tx(e.why)}</li>)}</ul>
          <button type="button" className={s.linkBtn} onClick={() => c.set({ binErr: [] })}>{tx('Lukk')}</button>
        </div>
      )}
      <div className={s.binBtns} data-md-bin-text="">
        <button type="button" className={`${s.barBtn} ${s.small}`} data-md-add-text="" title={tx('Ny tekst på et tekstspor fra spillehodet')} onClick={() => c.addText({})}>{tx('+ Tekst')}</button>
        <button type="button" className={`${s.barBtn} ${s.small}`} data-md-add-sub="" title={tx('Ny undertekst fra spillehodet (2,5 s)')} onClick={() => c.addSub()}>{tx('+ Undertekst')}</button>
      </div>
      {!p.media.length && <span className={s.note}>{tx('Biblioteket er tomt. Importer filer for å legge dem på tidslinjen.')}</span>}
      <ul className={s.binList} aria-label={tx('Mediebibliotek')}>
        {p.media.map((m) => (
          <li key={m.id} className={s.binItem} data-md-bin-item={m.name} data-kind={m.kind}>
            <span className={s.binThumb} style={{ backgroundImage: css(m.thumb) }} aria-hidden="true">{m.kind === 'audio' ? '♪' : ''}</span>
            <span className={s.binText}>
              <span className={s.binName} title={m.name}>{m.name}</span>
              <span className={s.binMeta} data-md-bin-meta="">{tx(KIND[m.kind])} · {m.kind === 'image' ? tx('ingen varighet') : fmtTC(m.dur)}{m.w ? ` · ${m.w}×${m.h}` : ''}</span>
            </span>
            <span className={s.binBtns}>
              {m.kind !== 'audio' && <button type="button" className={s.mini} data-md-to="v1" title={tx('Legg på hovedsporet V1 (etter valgt klipp, ellers sist)')} onClick={() => c.addToTrack(m, 'v1')}>V1</button>}
              {m.kind !== 'audio' && <button type="button" className={s.mini} data-md-to="v" title={tx('Legg på et nytt videospor øverst ved spillehodet (dekker sporene under)')} onClick={() => c.addToTrack(m, 'v')}>{tx('V+')}</button>}
              {m.kind === 'audio' && <button type="button" className={s.mini} data-md-to="a" title={tx('Legg på et lydspor ved spillehodet')} onClick={() => c.addToTrack(m, 'a')}>{tx('Lydspor')}</button>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NumIn({ label, val, on, dis, k }: { label: string; val: number; on: (v: number) => void; dis?: boolean; k: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className={s.tmField}>
      <span>{label}</span>
      <input type="number" min={0} step={0.05} disabled={dis} data-md-tm={k} value={draft ?? sec(val)}
        onChange={(e) => {
          setDraft(e.target.value)
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v) && v >= 0) on(v)
        }}
        onBlur={() => setDraft(null)} />
    </label>
  )
}

/** Tidsinspektøren for det valgte klippet. */
export function AdvTiming({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const sel = S.sel
  if (!sel || S.multi.length > 1) return null
  const sp = spanOf(p, sel.type, sel.id)
  if (!sp) return null
  const arr = sel.type === 'ov' ? p.ov : sel.type === 'music' ? p.music : sel.type === 'text' ? p.texts : null
  const lane = arr?.find((x) => x.id === sel.id)?.lane ?? 0
  const lanes = sel.type === 'ov' || sel.type === 'music' || sel.type === 'text'
  return (
    <div className={s.timing} data-md-timing="">
      <div className={s.tmHead}>
        <span className={s.tmTrack} data-md-track="">{trackName(p, sel.type, lane)}</span>
        <span className={s.dim}>{fmtTC(sp.start)} → {fmtTC(sp.end)}</span>
      </div>
      <div className={s.tmGrid}>
        <NumIn k="start" label={tx('Start (s)')} val={sp.start} dis={sel.type === 'clip'} on={(v) => c.setSpan(sel.type, sel.id, 'start', v)} />
        <NumIn k="dur" label={tx('Varighet (s)')} val={sp.dur} on={(v) => c.setSpan(sel.type, sel.id, 'dur', v)} />
        <label className={s.tmField}><span>{tx('Slutt (s)')}</span><output data-md-tm="end">{sec(sp.end)}</output></label>
      </div>
      {sel.type === 'clip' && <span className={s.hint}>{tx('V1 er sammenhengende: klippene følger hverandre. Endre rekkefølgen med Alt+← / → eller ved å dra.')}</span>}
      <div className={s.acts}>
        <button type="button" className={s.act} data-md-act="trim-l" title={tx('Q')} onClick={() => c.trimSel('l')}>{tx('Trim start hit')}</button>
        <button type="button" className={s.act} data-md-act="trim-r" title={tx('W')} onClick={() => c.trimSel('r')}>{tx('Trim slutt hit')}</button>
        <button type="button" className={s.act} data-md-act="split" title={tx('S')} onClick={() => c.split()}>{tx('Del ved spillehodet')}</button>
        {lanes && <button type="button" className={s.act} data-md-act="up" title={tx('Alt+↑')} onClick={() => c.moveLaneSel(-1)}>{tx('Spor opp')}</button>}
        {lanes && <button type="button" className={s.act} data-md-act="down" title={tx('Alt+↓')} onClick={() => c.moveLaneSel(1)}>{tx('Spor ned')}</button>}
        {sel.type === 'clip' && <button type="button" className={s.act} data-md-act="left" title={tx('Alt+←')} onClick={() => c.moveClip(-1)}>{tx('Tidligere')}</button>}
        {sel.type === 'clip' && <button type="button" className={s.act} data-md-act="right" title={tx('Alt+→')} onClick={() => c.moveClip(1)}>{tx('Senere')}</button>}
        <button type="button" className={`${s.act} ${s.danger}`} data-md-act="del" title={tx('Delete')} onClick={() => c.delSel()}>{tx('Slett')}</button>
      </div>
      <span className={s.keys}>{tx('Q/W: trim til spillehodet · S: del · ←/→: ett bilde · Shift+←/→: ett sekund')}</span>
    </div>
  )
}

/** Tidsfelt (TT:MM:SS): bekreftes med Enter eller ved å gå ut av feltet; ugyldig tekst gir en melding og endrer ingenting. */
function TimeField({ k, label, title, value, placeholder, commit, tx }: { k: string; label: Phrase; title: Phrase; value: string; placeholder?: string; commit: (raw: string) => Phrase | null; tx: Tx }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [err, setErr] = useState<Phrase | null>(null)
  const done = () => {
    if (draft == null) return
    const e = commit(draft)
    setErr(e)
    setDraft(null)
  }
  return (
    <label className={s.tlField} title={tx(title)}>
      <span>{tx(label)}</span>
      <input type="text" inputMode="decimal" data-md-field={k} value={draft ?? value} placeholder={placeholder} aria-invalid={!!err} spellCheck={false}
        onChange={(e) => setDraft(e.target.value)} onBlur={done}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            done()
          } else if (e.key === 'Escape') {
            setDraft(null)
            setErr(null)
          }
        }} />
      {err && <em className={s.tlErr} role="alert" data-md-field-err={k}>{tx(err)}</em>}
    </label>
  )
}

const ZL = Math.log(ZMAX / ZMIN)

/**
 * Tidslinjens verktøy i Avansert: zoom (slider og knapper), «Tilpass hele tidslinjen», visningsstart og prosjektvarighet.
 * Visningsstart flytter bare visningen; prosjektvarigheten er prosjektets definerte slutt (avspilling og eksport).
 */
export function TlTools({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const content = contentDur(p)
  const over = !!p.dur && content > p.dur + 0.01
  return (
    <div className={s.tlTools} data-md-tltools="">
      <input type="range" className={s.tlZoom} min={0} max={1000} step={1} data-md-zoom="" aria-label={tx('Zoom')} title={tx('Zoom: fra flere timer til enkeltbilder (Ctrl + musehjul)')}
        value={Math.round((Math.log(S.zoom / ZMIN) / ZL) * 1000)} onChange={(e) => c.setZoom(ZMIN * Math.exp((+e.target.value / 1000) * ZL))} />
      <button type="button" className={`${s.barBtn} ${s.small}`} style={{ height: 30 }} data-md-fit="" title={tx('Viser hele prosjektet fra start til slutt (endrer ikke klippene)')} onClick={() => c.fitZoom()}>{tx('Tilpass hele tidslinjen')}</button>
      <TimeField k="view" label="Visningsstart" title="Tidspunktet ved venstre kant av tidslinjen. Flytter bare visningen, ikke spillehodet eller klippene." tx={tx}
        value={fmtHMS(S.tlView.l)} commit={(raw) => {
          const t = parseTime(raw)
          if (t == null) return 'Ugyldig tid. Bruk TT:MM:SS, for eksempel 00:05:00.'
          const end = tlEnd(p)
          c.setViewStart(Math.min(t, end))
          return t > end ? 'Etter slutten på tidslinjen. Viser slutten.' : null
        }} />
      <TimeField k="dur" label="Prosjektvarighet" title="Prosjektets definerte slutt. Avspilling og eksport stopper der. Tom = følger innholdet." tx={tx}
        value={p.dur ? fmtHMS(p.dur) : ''} placeholder={`${tx('Auto')} · ${fmtHMS(content)}`} commit={(raw) => {
          if (!raw.trim()) {
            c.setProjDur(null)
            return null
          }
          const t = parseTime(raw)
          if (t == null) return 'Ugyldig tid. Bruk TT:MM:SS, for eksempel 00:10:00.'
          if (t < 0.5) return 'Prosjektvarigheten må være minst et halvt sekund.'
          if (t > 86400) return 'Prosjektvarigheten kan være maks 24 timer.'
          c.setProjDur(t)
          return null
        }} />
      {!!p.dur && <button type="button" className={s.linkBtn} data-md-dur-auto="" title={tx('Prosjektvarigheten følger innholdet igjen')} onClick={() => c.setProjDur(null)}>{tx('Auto')}</button>}
      <span className={s.dim} data-md-content="" title={tx('Hvor langt innholdet på sporene strekker seg')}>{tx('Innhold')} {fmtHMS(content)}</span>
      {over && (
        <span className={s.tlWarn} role="alert" data-md-dur-warn="">
          {tx('Innhold etter prosjektslutt ({c}) kommer ikke med i eksporten.', { c: fmtHMS(content) })}
          <button type="button" className={s.linkBtn} onClick={() => c.setProjDur(content)}>{tx('Forleng til innholdet')}</button>
        </span>
      )}
    </div>
  )
}

const pctOrUnit = (d: FxDef, v: number) => (d.unit === '%' ? `${Math.round(v * 100)} %` : d.unit === '°' ? `${Math.round(v)}°` : `${v.toFixed(d.step < 1 ? 1 : 0)} ${d.unit}`)

function FxSlider({ label, d, v, on, k }: { label: string; d: FxDef; v: number; on: (v: number) => void; k: string }) {
  return (
    <label className={s.fxRow}>
      <span className={s.fxLbl}>{label}</span>
      <input type="range" min={d.min} max={d.max} step={d.step} value={v} data-md-fxv={k} onChange={(e) => on(+e.target.value)} />
      <output className={s.fxVal}>{pctOrUnit(d, v)}</output>
    </label>
  )
}

/**
 * Effektene på valgt klipp (hovedspor eller videospor): legg til, juster, slå av/på (innstillingene beholdes), endre
 * rekkefølge og fjern – alt i prosjektet og med angre. «Bilde» (skalering og beskjæring) er klippets egne felt.
 */
export function AdvEffects({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const [add, setAdd] = useState<FxKind>('bri')
  const tg = c.fxTarget()
  if (!tg || S.multi.length > 1) return null
  const it = (tg.kind === 'clip' ? p.clips : p.ov).find((x) => x.id === tg.id)
  if (!it) return null
  const media = it.kind !== 'color'
  const scale = (it as { scale?: number }).scale ?? 1
  const crop = (it as { crop?: { l: number; t: number; r: number; b: number } }).crop ?? { l: 0, t: 0, r: 0, b: 0 }
  const SC: FxDef = tg.kind === 'ov' ? { l: '', min: 0.02, max: 4, step: 0.01, def: 1, unit: '%' } : { l: '', min: 0.1, max: 5, step: 0.01, def: 1, unit: '%' }
  const CR: FxDef = { l: '', min: 0, max: 0.45, step: 0.005, def: 0, unit: '%' }
  return (
    <div className={s.timing} data-md-effects="">
      <div className={s.tmHead}>
        <span className={s.binHead}>{tx('Effekter')}</span>
        <span className={s.dim} data-md-fx-count="">{tx('{n} aktive', { n: tg.effects.filter((e) => e.on).length })}</span>
      </div>
      {!tg.effects.length && <span className={s.hint}>{tx('Ingen effekter ennå. Velg en effekt og trykk «Legg til».')}</span>}
      <ol className={s.fxList}>
        {tg.effects.map((e, i) => {
          const d = FX_DEFS[e.kind]
          return (
            <li key={e.id} className={s.fxItem} data-md-fx={e.kind} data-on={e.on ? '1' : '0'}>
              <div className={s.fxHead}>
                <label className={s.fxOn}><input type="checkbox" checked={e.on} data-md-fx-on="" onChange={() => c.patchEffect(e.id, { on: !e.on })} /> <b>{tx(d.l)}</b></label>
                <span className={s.flex} />
                <button type="button" className={s.ico} aria-label={tx('Flytt opp')} title={tx('Flytt opp (tidligere i rekkefølgen)')} disabled={i === 0} data-md-fx-up="" onClick={() => c.moveEffect(e.id, -1)}>↑</button>
                <button type="button" className={s.ico} aria-label={tx('Flytt ned')} title={tx('Flytt ned (senere i rekkefølgen)')} disabled={i === tg.effects.length - 1} data-md-fx-down="" onClick={() => c.moveEffect(e.id, 1)}>↓</button>
                <button type="button" className={`${s.ico} ${s.icoDel}`} aria-label={tx('Fjern effekten')} title={tx('Fjern effekten')} data-md-fx-del="" onClick={() => c.delEffect(e.id)}>×</button>
              </div>
              <FxSlider k={`${e.kind}`} label={d.l2 ? tx(d.l) : tx('Styrke')} d={d} v={e.v} on={(v) => c.patchEffect(e.id, { v }, `fx-${e.id}`)} />
              {d.l2 && <FxSlider k={`${e.kind}2`} label={tx(d.l2)} d={d} v={e.v2 ?? 0} on={(v) => c.patchEffect(e.id, { v2: v }, `fx2-${e.id}`)} />}
            </li>
          )
        })}
      </ol>
      <div className={s.fxAdd}>
        <select value={add} aria-label={tx('Effekt')} data-md-fx-pick="" onChange={(e) => setAdd(e.target.value as FxKind)}>
          {FX_KINDS.map((k) => <option key={k} value={k}>{tx(FX_DEFS[k].l)}</option>)}
        </select>
        <button type="button" className={`${s.barBtn} ${s.small}`} data-md-fx-add="" onClick={() => c.addEffect(add)}>{tx('Legg til')}</button>
      </div>
      {media && (
        <>
          <span className={s.binHead}>{tx('Bilde')}</span>
          <FxSlider k="scale" label={tx('Skalering')} d={SC} v={scale} on={(v) => c.patch(tg.kind, tg.id, { scale: v }, `sc-${tg.id}`)} />
          {(['l', 't', 'r', 'b'] as const).map((k) => (
            <FxSlider key={k} k={`crop-${k}`} label={tx(({ l: 'Beskjær venstre', t: 'Beskjær topp', r: 'Beskjær høyre', b: 'Beskjær bunn' } as const)[k])} d={CR} v={crop[k]} on={(v) => c.patch(tg.kind, tg.id, { crop: { ...crop, [k]: v } }, `cr-${tg.id}-${k}`)} />
          ))}
        </>
      )}
    </div>
  )
}

/** Standard: klippet har innstillinger fra Avansert (effekter, keyframes). De vises og eksporteres, men redigeres i Avansert. */
export function AdvNote({ S, p, tx }: { S: MState; p: Project; tx: Tx }) {
  const sel = S.sel
  if (S.adv || !sel) return null
  const arr = sel.type === 'clip' ? p.clips : sel.type === 'ov' ? p.ov : sel.type === 'text' ? p.texts : null
  const it = arr?.find((x) => x.id === sel.id) as { effects?: unknown[]; kf?: Record<string, unknown[]> } | undefined
  const n = it?.effects?.length ?? 0
  const k = it?.kf ? Object.values(it.kf).reduce((a, l) => a + l.length, 0) : 0
  if (!n && !k) return null
  return <span className={s.note} data-md-adv-note="" style={{ fontSize: 12 }}>{tx('Klippet har {n} effekter og {k} keyframes fra Avansert modus. De vises og eksporteres som før; slå på Avansert modus for å endre dem.', { n, k })}</span>
}

const PLACES: [string, number, number, 'left' | 'center' | 'right', 'top' | 'middle' | 'bottom'][] = [
  ['tl', 0.08, 0.08, 'left', 'top'], ['tc', 0.5, 0.08, 'center', 'top'], ['tr', 0.92, 0.08, 'right', 'top'],
  ['ml', 0.08, 0.5, 'left', 'middle'], ['mc', 0.5, 0.5, 'center', 'middle'], ['mr', 0.92, 0.5, 'right', 'middle'],
  ['bl', 0.08, 0.92, 'left', 'bottom'], ['bc', 0.5, 0.92, 'center', 'bottom'], ['br', 0.92, 0.92, 'right', 'bottom'],
]

/** Plassering av valgt tekst (Avansert): ni faste posisjoner med vannrett og loddrett justering. */
export function AdvText({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const sel = S.sel
  if (!S.adv || sel?.type !== 'text' || S.multi.length > 1) return null
  const x = p.texts.find((q) => q.id === sel.id)
  if (!x) return null
  const cur = PLACES.find(([, px, py, a, v]) => Math.abs(x.x - px) < 0.01 && Math.abs(x.y - py) < 0.01 && x.align === a && (x.valign ?? 'middle') === v)?.[0]
  return (
    <div className={s.timing} data-md-textplace="">
      <span className={s.binHead}>{tx('Plassering')}</span>
      <div className={s.placeGrid} role="group" aria-label={tx('Plassering')}>
        {PLACES.map(([k, px, py, a, v]) => (
          <button key={k} type="button" aria-pressed={cur === k} data-md-place={k} title={tx('Plasser teksten her')} aria-label={k}
            onClick={() => c.patch('text', x.id, { x: px, y: py, align: a, valign: v }, `place-${x.id}`)}><i /></button>
        ))}
      </div>
      <span className={s.hint}>{tx('Teksten justeres mot punktet (venstre/midt/høyre og topp/midt/bunn). Finjuster med Vannrett og Loddrett under.')}</span>
    </div>
  )
}
