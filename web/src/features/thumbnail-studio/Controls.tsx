'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useRef, useState, type KeyboardEvent } from 'react'
import { useLang } from '../../shared/i18n/i18n'
import { localStore } from '../../shared/lib/storage'
import type { ThumbController } from './controller'
import type { Ctrl, Unit } from './ctrl-defs'
import { PALETTE, type TextLayer } from './engine/model'
import { applyListAction, bakeList, listKey, type ListAction } from './engine/text-list'
import type { Phrase, Tx } from './texts'
import s from './ThumbnailStudio.module.css'

const UNITS_KEY = 'medialab.units'
const HEX = /^#[0-9a-f]{6}$/i

function readUnits(): Record<string, string> {
  try {
    const v: unknown = JSON.parse(localStore.get(UNITS_KEY) ?? '{}')
    return v && typeof v === 'object' ? (v as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Egenskapspanelet: tegner kontrollene fra `controls.ts`. */
export function Controls({ ctrls, c, tx, profileColors, imageUrl }: { ctrls: Ctrl[]; c: ThumbController; tx: Tx; profileColors: string[]; imageUrl: (src: string | null) => string }) {
  return (
    <>
      {ctrls.map((x, i) => {
        switch (x.k) {
          case 'h':
            return <div key={i} className={s.ctrlHead}>{tx(x.label)}</div>
          case 'slider':
            return <Slider key={`${i}:${x.label}`} ctrl={x} tx={tx} />
          case 'color':
            return <ColorRow key={i} label={tx(x.label)} val={x.val} set={x.set} profile={profileColors} tx={tx} />
          case 'seg':
            return (
              <div key={i} className={s.ctrl}>
                <span className={s.ctrlLabel}>{tx(x.label)}</span>
                <div className={s.seg}>
                  {x.opts.map(([v, label]) => <button key={v} type="button" aria-pressed={x.val === v} onClick={() => x.set(v)}>{tx(label)}</button>)}
                </div>
              </div>
            )
          case 'check':
            return (
              <label key={i} className={s.check}>
                <input type="checkbox" checked={x.val} onChange={(e) => x.set(e.target.checked)} />
                <span>{tx(x.label)}</span>
              </label>
            )
          case 'area':
            return <TextArea key={`${i}:${x.label}`} ctrl={x} c={c} tx={tx} />
          case 'select':
            return (
              <label key={i} className={s.ctrl}>
                <span className={s.ctrlLabel}>{tx(x.label)}</span>
                <select className={s.select} value={x.val} onChange={(e) => x.set(e.target.value)}>
                  {x.opts.map((o) => <option key={o.v} value={o.v}>{o.phrase ? tx(o.phrase) : o.label}{o.suffix ? tx(o.suffix) : ''}</option>)}
                </select>
              </label>
            )
          case 'note':
            return <span key={i} className={s.note}>{tx(x.text, x.v)}</span>
          case 'nums':
            return (
              <div key={i} className={s.nums}>
                {x.items.map(([label, val, set]) => (
                  <label key={label}>
                    <span>{label}</span>
                    <input type="number" value={Math.round(val)} onChange={(e) => {
                      const n = Number(e.target.value)
                      if (Number.isFinite(n)) set(Math.round(n))
                    }} />
                  </label>
                ))}
              </div>
            )
          case 'btns':
            return (
              <div key={i} className={s.btns}>
                {x.items.map((b) => (
                  <button key={b.label} type="button" className={b.kind === 'p' ? s.btnOn : b.kind === 'd' ? s.btnDanger : s.btnSmall} disabled={b.disabled} onClick={b.on}>{tx(b.label, b.v)}</button>
                ))}
              </div>
            )
          case 'img':
            return <ImageCtrl key={i} ctrl={x} c={c} tx={tx} url={imageUrl(x.src)} />
        }
      })}
    </>
  )
}

function Slider({ ctrl, tx }: { ctrl: Extract<Ctrl, { k: 'slider' }>; tx: Tx }) {
  const lang = useLang()
  const [pref, setPref] = useState(readUnits)
  const [edit, setEdit] = useState<string | null>(null)
  const units = ctrl.units
  const ui = Math.max(0, units.findIndex((x) => x.u === pref[ctrl.key]))
  const U = units[ui] as Unit
  const multi = units.length > 1
  const shown = String(+(Number(ctrl.val) * U.k).toFixed(U.d ?? 0)).replace('.', lang === 'en' ? '.' : ',')
  const clamp = (n: number) => Math.max(ctrl.lim[0], Math.min(ctrl.lim[1], n))
  const commit = (t: string) => {
    const n = parseFloat(t.replace(',', '.'))
    setEdit(null)
    if (Number.isFinite(n)) ctrl.set(clamp(n / U.k))
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') setEdit(null)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = parseFloat(e.currentTarget.value.replace(',', '.'))
      const stp = (e.shiftKey ? 10 : 1) * (U.d ? Math.pow(10, -U.d) * (U.u === '%' ? 10 : 1) : 1)
      if (Number.isFinite(cur)) {
        setEdit(null)
        ctrl.set(clamp((cur + (e.key === 'ArrowUp' ? stp : -stp)) / U.k))
      }
    }
  }
  const label = tx(ctrl.label)
  return (
    <div className={s.ctrl}>
      <span className={s.sliderHead}>
        <span>{label}</span>
        <span className={s.numBox}>
          <input type="text" inputMode="decimal" aria-label={label} value={edit ?? shown}
            onChange={(e) => setEdit(e.target.value.slice(0, 12))} onFocus={(e) => e.target.select()}
            onBlur={(e) => edit != null && commit(e.target.value)} onKeyDown={onKey} />
          {U.u && (
            <button type="button" className={multi ? s.unitMulti : s.unit} disabled={!multi}
              title={multi ? `${tx('Trykk for å bytte enhet')}: ${units.map((x) => x.u + (x.t ? ` (${tx(x.t)})` : '')).join(' / ')}` : undefined}
              onClick={() => {
                if (!multi) return
                const next = { ...readUnits(), [ctrl.key]: (units[(ui + 1) % units.length] as Unit).u }
                localStore.set(UNITS_KEY, JSON.stringify(next))
                setPref(next)
                setEdit(null)
              }}>{U.u}</button>
          )}
        </span>
      </span>
      <input type="range" className={s.range} min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val} aria-label={label} onChange={(e) => ctrl.set(+e.target.value)} />
    </div>
  )
}

/** Fargevalg: grunnoppsettets farger («Profil»), faste farger og egen farge. */
export function ColorRow({ label, val, set, profile, tx, small }: { label: string; val: string; set: (v: string) => void; profile: string[]; tx: Tx; small?: boolean }) {
  const v = val.toLowerCase()
  const rest = PALETTE.filter((x) => !profile.includes(x))
  const sw = (x: string) => (
    <button key={x} type="button" className={small ? s.swatchSm : s.swatch} style={{ background: x }} aria-pressed={x === v} title={x} aria-label={x} onClick={() => set(x)} />
  )
  const custom = !profile.includes(v) && !(PALETTE as readonly string[]).includes(v)
  return (
    <div className={s.ctrl}>
      <span className={s.ctrlLabel}>{label}</span>
      {profile.length > 0 && (
        <div className={s.profileRow}>
          <span className={s.profileTag}>{tx('Profil')}</span>
          <div className={s.swatches}>{profile.map(sw)}</div>
        </div>
      )}
      <div className={s.swatches}>
        {rest.map(sw)}
        <label className={small ? s.customSm : s.custom} title={tx('Egen farge')} aria-pressed={custom}>
          <input type="color" value={HEX.test(v) ? v : '#ffffff'} aria-label={tx('Egen farge')} onChange={(e) => HEX.test(e.target.value) && set(e.target.value)} />
        </label>
      </div>
    </div>
  )
}

const LIST_TOOLS: [Phrase, ListAction, Phrase][] = [['Tekst', 'plain', 'Vanlig tekst'], ['• Punkt', 'bullet', 'Punktliste'], ['1. Nummer', 'num', 'Nummerert liste'], ['⇤', 'out', 'Mindre innrykk'], ['⇥', 'in', 'Underpunkt']]

function TextArea({ ctrl, c, tx }: { ctrl: Extract<Ctrl, { k: 'area' }>; c: ThumbController; tx: Tx }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const l: TextLayer | undefined = ctrl.list
  const caret = (a: number, b: number) => {
    setTimeout(() => {
      const t = ref.current
      if (!t) return
      t.focus()
      try {
        t.setSelectionRange(a, b)
      } catch {
        // markeringen er ikke viktig
      }
    }, 30)
  }
  const act = (a: ListAction) => {
    if (!l) return
    const t = ref.current
    const text = bakeList(String(l.text || ''), l.list)
    const r = applyListAction(text, t ? t.selectionStart : 0, t ? t.selectionEnd : text.length, a)
    c.setL(l.id, { text: r.text, list: '' })
    caret(r.sel[0], r.sel[1])
  }
  return (
    <div className={s.ctrl}>
      <span className={s.ctrlLabel}>{tx(ctrl.label)}</span>
      {l && (
        <div className={s.listTools}>
          {LIST_TOOLS.map(([label, a, title]) => (
            <button key={a} type="button" title={tx(title)} aria-label={tx(title)} onMouseDown={(e) => {
              e.preventDefault()
              act(a)
            }}>{tx(label)}</button>
          ))}
        </div>
      )}
      <textarea ref={ref} className={s.textarea} value={ctrl.val} rows={ctrl.rows} placeholder={tx(ctrl.ph)} aria-label={tx(ctrl.label)} data-ts-text={l ? '1' : undefined}
        onChange={(e) => ctrl.set(e.target.value)}
        onKeyDown={(e) => {
          if (!l) return
          const r = listKey(bakeList(String(l.text || ''), l.list), e.currentTarget.selectionStart, e.currentTarget.selectionEnd, e.key, e.shiftKey)
          if (!r) return
          e.preventDefault()
          c.setL(l.id, { text: r.text, list: '' })
          caret(r.sel[0], r.sel[1])
        }} />
      {l && <span className={s.hint}>{tx('Enter gir nytt punkt. Tab gir underpunkt, Shift+Tab går tilbake. Vanlig tekst og lister kan blandes.')}</span>}
    </div>
  )
}

function ImageCtrl({ ctrl, c, tx, url }: { ctrl: Extract<Ctrl, { k: 'img' }>; c: ThumbController; tx: Tx; url: string }) {
  const S = c.s
  const l = ctrl.layer
  const ai = S.ai
  const busy = !!ai && !!l && ai.id === l.id
  const own = !!l?.src && l.src.startsWith('m:')
  return (
    <div className={s.ctrl}>
      <span className={s.ctrlLabel}>{tx(ctrl.label)}</span>
      <div className={s.imgRow}>
        <div className={s.imgThumb}>{url && <img src={url} alt="" />}</div>
        <div className={s.imgActions}>
          <button type="button" className={s.btnOn} onClick={ctrl.pick}>{tx(ctrl.src ? 'Bytt bilde' : 'Velg bilde')}</button>
          <button type="button" className={s.linkBtn} onClick={() => c.openPicker('media', l ? { mode: 'replace', id: l.id } : { mode: 'bg' })}>{tx('Fra Dine medier …')}</button>
          {ctrl.src && <button type="button" className={s.linkBtn} onClick={ctrl.clear}>{tx('Fjern bildet')}</button>}
        </div>
      </div>
      {l && own && !busy && !ai && (
        <div className={s.aiBox}>
          <span>{tx('Valgfritt: fjern bakgrunnen med AI. Kjører i nettleseren, og originalen tas vare på.')}</span>
          <div>
            <button type="button" className={s.btnSmall} onClick={() => void c.runAI(l.id, 'person')}>{tx('Person')}</button>
            <button type="button" className={s.btnSmall} onClick={() => void c.runAI(l.id, 'object')}>{tx('Objekt')}</button>
          </div>
        </div>
      )}
      {busy && ai && (
        <div className={s.aiProgress} role="status">
          <span>{ai.phase === 'model' ? tx('Laster ned AI-modellen … {pct} %', { pct: ai.pct }) : tx('Fjerner bakgrunnen …')}</span>
          <div><i style={{ width: `${ai.phase === 'model' ? ai.pct : 100}%` }} /></div>
        </div>
      )}
      {l?.orig && !busy && <button type="button" className={s.btnSmall} data-ts-mask-open="" onClick={() => void c.openMaskEdit(l.id)}>{tx('Finjuster utklippet')}</button>}
      {l?.orig && !busy && <button type="button" className={s.linkBtn} onClick={() => c.setL(l.id, { src: l.orig, orig: null })}>{tx('Bruk originalbildet')}</button>}
    </div>
  )
}
