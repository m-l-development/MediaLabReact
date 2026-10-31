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
