'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
/**
 * Motion Design → Avansert: mediebibliotek (type, varighet, legg på spor, feil per fil) og tidsinspektør for det valgte
 * klippet (spor, start, slutt, varighet, trim, del, flytt, slett). Bruker samme prosjekt og motor som Standard.
 */
import { useEffect, useState } from 'react'
import { tlEnd, ZMAX, ZMIN, type ExpAdv, type MotionController, type MState } from './controller'
import { fmtHMS, fmtTC, parseTime, spanOf, trackName } from './engine/edit'
import { contentDur, exportSize, totalDur, type Media, type Project } from './engine/model'
import { FX_DEFS, FX_KINDS, type FxDef, type FxKind } from './engine/fx'
import { EASES, KF_PROPS, keyAt, keysOutside, type Ease, type PropDef } from './engine/kf'
import type { Phrase, Tx } from './texts'
import { NumField } from '../../shared/ui/NumField'
import s from './MotionDesign.module.css'

const KIND: Record<Media['kind'], Phrase> = { video: 'Video', image: 'Bilde', audio: 'Lyd' }
const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')
const sec = (v: number) => (Math.round(v * 100) / 100).toFixed(2)

export function AdvBin({ c, S, p, tx, onShared }: { c: MotionController; S: MState; p: Project; tx: Tx; onShared: () => void }) {
  // «Bytt media» på et klipp i V1: biblioteket viser «Bruk her» på hver fil som kan erstatte det
  const rep = S.replaceFor && p.clips.some((x) => x.id === S.replaceFor) ? S.replaceFor : null
  return (
    <div className={s.panel} data-md-bin="">
      {rep && (
        <div className={s.replace} data-md-replace="">
          <span>{tx('Velg filen som skal erstatte det valgte klippet.')}</span>
          <button type="button" className={s.linkBtn} onClick={() => c.set({ replaceFor: null })}>{tx('Avbryt')}</button>
        </div>
      )}
      <button type="button" className={s.bigLight} data-md-bin-import="" onClick={() => c.pickMedia()}>{tx('Importer video, lyd og bilder …')}</button>
      <div className={s.binBtns}>
        <button type="button" className={`${s.barBtn} ${s.small}`} onClick={onShared}>{tx('Fra Dine medier')}</button>
        {!rep && <button type="button" className={`${s.barBtn} ${s.small}`} data-md-add-color="" title={tx('Ensfarget flate eller fargeovergang på V1')} onClick={() => c.addColor()}>{tx('+ Fargeflate')}</button>}
      </div>
      <span className={s.hint}>{tx('MP4, MOV, WebM, PNG, JPG, WebP, GIF, MP3, WAV, M4A, AAC, OGG og FLAC. Du kan også dra filer inn i vinduet.')}</span>
      {S.binErr.length > 0 && (
        <div className={s.binErr} role="alert" data-md-bin-err="">
          <span>{tx('Kunne ikke importeres ({n}):', { n: S.binErr.length })}</span>
          <ul>{S.binErr.slice(0, 20).map((e, i) => <li key={i}><b>{e.name}</b> – {tx(e.why)}</li>)}</ul>
          <button type="button" className={s.linkBtn} onClick={() => c.set({ binErr: [] })}>{tx('Lukk')}</button>
        </div>
      )}
      {!p.media.length && <span className={s.note}>{tx('Biblioteket er tomt. Importer filer for å legge dem på tidslinjen.')}</span>}
      <ul className={s.binList} aria-label={tx('Mediebibliotek')}>
        {p.media.map((m) => (
          <li key={m.id} className={s.binItem} data-md-bin-item={m.name} data-kind={m.kind} onContextMenu={(e) => c.binMenu(e, m)}>
            <span className={s.binThumb} style={{ backgroundImage: css(m.thumb) }} aria-hidden="true">{m.kind === 'audio' ? '♪' : ''}</span>
            <span className={s.binText}>
              <span className={s.binName} title={m.name}>{m.name}</span>
              <span className={s.binMeta} data-md-bin-meta="">{tx(KIND[m.kind])} · {m.kind === 'image' ? tx('ingen varighet') : fmtTC(m.dur)}{m.w ? ` · ${m.w}×${m.h}` : ''}</span>
            </span>
            <span className={s.binBtns}>
              {rep && m.kind !== 'audio' && <button type="button" className={s.mini} data-md-use="" onClick={() => c.replaceClip(rep, m)}>{tx('Bruk her')}</button>}
              {!rep && m.kind !== 'audio' && <button type="button" className={s.mini} data-md-to="v1" title={tx('Legg på hovedsporet V1 (etter valgt klipp, ellers sist)')} onClick={() => c.addToTrack(m, 'v1')}>V1</button>}
              {!rep && m.kind !== 'audio' && <button type="button" className={s.mini} data-md-to="v"title={tx('Legg på et nytt videospor øverst ved spillehodet (dekker sporene under)')} onClick={() => c.addToTrack(m, 'v')}>{tx('V+')}</button>}
              {!rep && m.kind === 'audio' && <button type="button" className={s.mini} data-md-to="a" title={tx('Legg på et lydspor ved spillehodet')} onClick={() => c.addToTrack(m, 'a')}>{tx('Lydspor')}</button>}
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
        {sp.end < totalDur(p) - 0.05 && (sel.type !== 'clip' || p.clips[p.clips.length - 1]?.id === sel.id) && (
          <button type="button" className={s.act} data-md-act="to-end" title={tx('Varer til prosjektslutt ({t})', { t: fmtHMS(totalDur(p)) })} onClick={() => c.toEnd()}>{tx('Til prosjektslutt')}</button>
        )}
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
    <div className={s.fxRow}>
      <span className={s.fxLbl}>{label}</span>
      <input type="range" min={d.min} max={d.max} step={d.step} value={v} data-md-fxv={k} aria-label={label} onChange={(e) => on(+e.target.value)} />
      <NumField className={s.fxVal} value={v} min={d.min} max={d.max} step={d.step} show={pctOrUnit(d, v)} scale={d.unit === '%' ? 100 : 1} label={label} onCommit={on} />
    </div>
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
      <span className={s.hint}>{tx('Effektene virker i rekkefølgen over. Fargekorrigering og beskjæring finner du under.')}</span>
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

/** Tallfelt med utkast (skriving avbrytes ikke av at verdien tegnes på nytt). */
function KNum({ v, on, min, max, step, k, label }: { v: number; on: (v: number) => void; min?: number; max?: number; step: number; k: string; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3
  return (
    <input type="number" className={s.kfNum} aria-label={label} data-md-kfnum={k} min={min} max={max} step={step} value={draft ?? v.toFixed(dec)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = parseFloat(e.target.value)
        if (Number.isFinite(n)) on(min != null && max != null ? Math.min(max, Math.max(min, n)) : n)
      }}
      onBlur={() => setDraft(null)} />
  )
}

/**
 * Keyframes for valgt klipp, videospor eller tekst: posisjon, skalering, rotasjon, opasitet (tekst: størrelse) og
 * effektenes verdi. ◆ legger til/fjerner en keyframe ved spillehodet; verdien endres ved spillehodet (med keyframes
 * blir det en keyframe her). Hver keyframe kan flyttes i tid, få ny verdi, ny interpolering eller slettes.
 */
export function AdvKeys({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  void p
  void S.t // tegnes på nytt når spillehodet flyttes
  const tg = c.kfTarget()
  if (!tg || S.multi.length > 1) return null
  const fxProps: PropDef[] = (tg.it.effects ?? []).filter((e) => e.kind !== 'fade').map((e) => {
    const d = FX_DEFS[e.kind]
    return [`fx:${e.id}`, d.l, d.min, d.max, d.step] as const
  })
  const props = [...KF_PROPS[tg.kind], ...fxProps]
  const out = keysOutside(tg.it.kf, tg.dur)
  return (
    <div className={s.timing} data-md-keys="">
      <div className={s.tmHead}>
        <span className={s.binHead}>{tx('Keyframes')}</span>
        <span className={s.dim} data-md-kf-lt="">{fmtHMS(Math.max(0, tg.lt))}</span>
        <span className={s.flex} />
        <span style={{ display: 'inline-flex', gap: 4, marginLeft: 'auto' }}>
          <button type="button" className={s.ico} aria-label={tx('Forrige keyframe')} title={tx('Forrige keyframe')} data-md-kf-prev="" onClick={() => c.jumpKey(-1)}>◀</button>
          <button type="button" className={s.ico} aria-label={tx('Neste keyframe')} title={tx('Neste keyframe')} data-md-kf-next="" onClick={() => c.jumpKey(1)}>▶</button>
        </span>
      </div>
      {(tg.lt < 0 || tg.lt > tg.dur) && <span className={s.hint}>{tx('Spillehodet er utenfor klippet. Flytt det inn i klippet for å lage keyframes.')}</span>}
      {out > 0 && <span className={s.tlWarn} data-md-kf-out="">{tx('{n} keyframes ligger utenfor klippet (etter trimming). De virker ikke, men er beholdt.', { n: out })}</span>}
      {props.map(([k, l, mn, mx, st]) => {
        const keys = tg.it.kf?.[k] ?? []
        const at = keyAt(keys, tg.lt)
        return (
          <div key={k} className={s.kfProp} data-md-kf={k} data-animated={keys.length ? '1' : undefined} onContextMenu={(e) => { if (!(e.target as HTMLElement).closest('input,select')) c.kfMenu(e, k, null) }}>
            <div className={s.kfRow}>
              <button type="button" className={s.kfDia} aria-pressed={at >= 0} data-md-kf-toggle="" title={tx(at >= 0 ? 'Fjern keyframen her' : 'Keyframe her')} aria-label={tx(at >= 0 ? 'Fjern keyframen her' : 'Keyframe her')}
                disabled={tg.lt < 0 || tg.lt > tg.dur} onClick={() => c.toggleKey(k)}>◆</button>
              <span className={s.kfLbl}>{tx(l)}{keys.length ? ` · ${keys.length}` : ''}</span>
              <KNum k={`${k}`} label={tx(l)} v={c.propVal(k)} min={mn} max={mx} step={st} on={(v) => c.setProp(k, v)} />
            </div>
            {keys.length > 0 && (
              <ol className={s.kfList}>
                {keys.map((key, i) => (
                  <li key={i} className={s.kfKey} data-md-key={i} data-here={i === at ? '1' : undefined} onContextMenu={(e) => { if ((e.target as HTMLElement).closest('input,select')) return; e.stopPropagation(); c.kfMenu(e, k, i) }}>
                    <KNum k={`${k}-t-${i}`} label={tx('Tid (s)')} v={key.t} step={0.01} on={(t) => c.moveKey(k, i, t)} />
                    <KNum k={`${k}-v-${i}`} label={tx('Verdi')} v={key.v} min={mn} max={mx} step={st} on={(v) => c.setKeyVal(k, i, v)} />
                    <select aria-label={tx('Interpolering')} value={key.e ?? 'lin'} data-md-kf-ease="" onChange={(e) => c.setKeyEase(k, i, e.target.value as Ease)}>
                      {EASES.map(([v, el]) => <option key={v} value={v}>{tx(el)}</option>)}
                    </select>
                    <button type="button" className={`${s.ico} ${s.icoDel}`} aria-label={tx('Slett keyframen')} title={tx('Slett keyframen')} data-md-kf-del="" onClick={() => c.delKey(k, i)}>×</button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )
      })}
    </div>
  )
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4]

/**
 * Hastighet for valgt videoklipp (hovedspor eller videospor): kildevarighet (trimmet del av filen) og effektiv varighet på
 * tidslinjen = kilde / fart. Keyframes skaleres med farten. Lyden følger farten (tonehøyden endres – ingen tonehøydebevaring).
 */
export function AdvSpeed({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const sel = S.sel
  if (!sel || S.multi.length > 1 || (sel.type !== 'clip' && sel.type !== 'ov')) return null
  const it = (sel.type === 'clip' ? p.clips : p.ov).find((x) => x.id === sel.id)
  if (!it || it.kind !== 'video') return null
  const sp = it.speed || 1
  const src = it.out - it.in
  const set = (v: number) => c.patch(sel.type, it.id, { speed: Math.min(8, Math.max(0.1, v)) }, `speed-${it.id}`)
  return (
    <div className={s.timing} data-md-speed="">
      <span className={s.binHead}>{tx('Hastighet')}</span>
      <div className={s.segRow}>
        {SPEEDS.map((v) => <button key={v} type="button" className={s.mini} aria-pressed={Math.abs(sp - v) < 1e-3} data-md-speedset={v} onClick={() => set(v)}>{v}×</button>)}
      </div>
      <label className={s.tmField}>
        <span>{tx('Fart (0,1–8×)')}</span>
        <KNum k="speed" label={tx('Fart')} v={sp} min={0.1} max={8} step={0.05} on={set} />
      </label>
      <span className={s.dim} data-md-speed-info="">{tx('Kilde {src} s → {eff} s på tidslinjen', { src: src.toFixed(2), eff: (src / sp).toFixed(2) })}</span>
      <label className={s.fxOn}><input type="checkbox" checked={!!it.rev} data-md-rev="" onChange={() => c.patch(sel.type, it.id, { rev: !it.rev })} /> {tx('Spill baklengs')}</label>
      <span className={s.hint}>{tx(sel.type === 'clip' ? 'I V1 flytter klippene etter seg når lengden endres.' : 'Klippet beholder starten; slutten flyttes.')} {tx('Lyden følger farten (tonehøyden endres). Keyframes følger innholdet.')}{it.rev ? ` ${tx('Baklengs kan hakke i forhåndsvisningen, men blir jevn i eksporten.')}` : ''}</span>
    </div>
  )
}

const RES: [ExpAdv['res'], string][] = [['720', '720p'], ['1080', '1080p'], ['4k', '4K']]
const FPS: ExpAdv['fps'][] = [24, 25, 30, 60]
const QUAL: [ExpAdv['quality'], string, number][] = [['low', 'Lav', 0.55], ['mid', 'Middels', 1], ['high', 'Høy', 1.7]]

/** Hva denne nettleseren kan kode (sjekkes med WebCodecs): H.264, ellers VP9/AV1, ellers sanntidsopptak. */
function useCodec(w: number, h: number, fps: number): string | null {
  const [r, setR] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      if (typeof VideoEncoder === 'undefined') return 'none'
      for (const [codec, name] of [['avc1.640033', 'h264'], ['avc1.640028', 'h264'], ['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']] as const) {
        try {
          if ((await VideoEncoder.isConfigSupported({ codec, width: w, height: h, framerate: fps, bitrate: 8e6 })).supported) return name
        } catch {
          // neste
        }
      }
      return 'none'
    })().then((v) => {
      if (live) setR(v)
    })
    return () => {
      live = false
    }
  }, [w, h, fps])
  return r
}

/**
 * Eksport i Avansert: oppløsning, bildefrekvens, kvalitet, lyd, undertekster i bildet og område. Formatet er MP4 med
 * H.264 og AAC der nettleseren kan kode det; ellers sier panelet hva som blir laget.
 */
export function AdvExport({ c, S, p, tx }: { c: MotionController; S: MState; p: Project; tx: Tx }) {
  const A = S.exp?.adv
  const T = totalDur(p)
  const sz = exportSize(p, A?.res ?? '1080')
  const codec = useCodec(sz.w, sz.h, A?.fps ?? 30)
  if (!A) return null
  const busy = !!S.exp?.busy
  const mbit = (q: number) => ((sz.w * sz.h * A.fps * (sz.w * sz.h > 2300000 ? 0.13 : 0.2) * q) / 1e6).toFixed(0)
  const len = A.range === 'custom' ? Math.max(0, A.to - A.from) : T
  const codecText: Phrase = codec === null ? 'Sjekker hva nettleseren kan lage …'
    : codec === 'h264' ? 'Format: MP4 med H.264-video og AAC-lyd.'
      : codec === 'none' ? 'Denne nettleseren kan ikke kode video direkte: videoen tas opp i sanntid (WebM eller MP4, avhengig av nettleseren).'
        : 'H.264 mangler i denne nettleseren: MP4 med {c}-video og Opus-lyd (bruk VLC hvis noe mangler).'
  return (
    <div className={s.expAdv} data-md-exp-adv="">
      <span className={s.dim} data-md-exp-codec={codec ?? ''}>{tx(codecText, { c: codec === 'vp9' ? 'VP9' : 'AV1' })}</span>
      <div className={s.expRow}>
        <span>{tx('Oppløsning')}</span>
        <div className={s.segRow}>
          {RES.map(([k, l]) => {
            const z = exportSize(p, k)
            return <button key={k} type="button" className={s.mini} aria-pressed={A.res === k} disabled={busy} data-md-exp-res={k} onClick={() => c.setExpAdv({ res: k })}>{l} · {z.w}×{z.h}</button>
          })}
        </div>
      </div>
      <div className={s.expRow}>
        <span>{tx('Bildefrekvens')}</span>
        <div className={s.segRow}>{FPS.map((k) => <button key={k} type="button" className={s.mini} aria-pressed={A.fps === k} disabled={busy} data-md-exp-fps={k} onClick={() => c.setExpAdv({ fps: k })}>{k} fps</button>)}</div>
      </div>
      <div className={s.expRow}>
        <span>{tx('Kvalitet')}</span>
        <div className={s.segRow}>{QUAL.map(([k, l, q]) => <button key={k} type="button" className={s.mini} aria-pressed={A.quality === k} disabled={busy} data-md-exp-q={k} onClick={() => c.setExpAdv({ quality: k })}>{tx(l)} · ~{mbit(q)} Mbit/s</button>)}</div>
      </div>
      <label className={s.expChk}><input type="checkbox" checked={A.audio} disabled={busy} data-md-exp-audio="" onChange={() => c.setExpAdv({ audio: !A.audio })} /> {tx('Med lyd (alle lydspor som ikke er dempet)')}</label>
      <label className={s.expChk}><input type="checkbox" checked={A.subs} disabled={busy} data-md-exp-subs="" onChange={() => c.setExpAdv({ subs: !A.subs })} /> {tx('Undertekster brent inn i bildet')}</label>
      {!A.subs && p.subs.length > 0 && <span className={s.hint}>{tx('Undertekstene kommer ikke med i videoen. Som egen fil: «Last ned .srt» under Undertekst.')}</span>}
      <div className={s.expRow}>
        <span>{tx('Område')}</span>
        <div className={s.segRow}>
          <button type="button" className={s.mini} aria-pressed={A.range === 'all'} disabled={busy} data-md-exp-range="all" onClick={() => c.setExpAdv({ range: 'all', from: 0, to: T })}>{tx('Hele prosjektet')} · 0–{fmtHMS(T)}</button>
          <button type="button" className={s.mini} aria-pressed={A.range === 'custom'} disabled={busy} data-md-exp-range="custom" onClick={() => c.setExpAdv({ range: 'custom', to: A.to > A.from ? A.to : T })}>{tx('Egendefinert')}</button>
        </div>
      </div>
      {A.range === 'custom' && (
        <div className={s.expRow}>
          <TimeField k="exp-from" label="Fra" title="Start på eksporten (TT:MM:SS)" tx={tx} value={fmtHMS(A.from)} commit={(raw) => {
            const t = parseTime(raw)
            if (t == null) return 'Ugyldig tid. Bruk TT:MM:SS, for eksempel 00:00:05.'
            if (t >= Math.min(T, A.to)) return 'Starten må være før slutten.'
            c.setExpAdv({ from: t })
            return null
          }} />
          <TimeField k="exp-to" label="Til" title="Slutt på eksporten (TT:MM:SS), høyst prosjektslutt" tx={tx} value={fmtHMS(A.to)} commit={(raw) => {
            const t = parseTime(raw)
            if (t == null) return 'Ugyldig tid. Bruk TT:MM:SS, for eksempel 00:00:05.'
            if (t <= A.from) return 'Slutten må være etter starten.'
            c.setExpAdv({ to: Math.min(T, t) })
            return t > T ? 'Etter prosjektslutt: eksporten stopper ved prosjektslutt.' : null
          }} />
        </div>
      )}
      <span className={s.dim} data-md-exp-sum="">{tx('Eksporterer {len} · {w}×{h} · {fps} fps', { len: fmtHMS(len), w: sz.w, h: sz.h, fps: A.fps })}</span>
    </div>
  )
}
