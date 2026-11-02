import { useState } from 'react'
import { useT } from '../i18n/i18n'
import { ColorSpectrum } from './ColorSpectrum'
import styles from './BgColor.module.css'

const PRESETS = ['#000000', '#ffffff', '#111111', '#2a2a2a', '#f3f1ec', '#1e3a8a', '#7f1d1d', '#14532d', '#f5b82c', '#e11d48']

/**
 * Bakgrunnsfarge for en komposisjon (Photo-dokumentet, Motion-prosjektet …): fargeflate (systemets fargevelger, også på
 * mobil), HEX-felt, fargeprøver og «Tilbakestill». Fargen er en del av resultatet og eksporteres – for midlertidige
 * visningsbakgrunner (maskeredigering) brukes ikke denne komponenten.
 */
export function BgColor({ label, value, def, onChange, note }: { label: string; value: string; def: string; onChange: (hex: string) => void; note?: string | undefined }) {
  const t = useT()
  const cur = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : def
  const [text, setText] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  const commit = (raw: string) => {
    const v = raw.trim().replace(/^([0-9a-f]{6})$/i, '#$1').replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3')
    if (!/^#[0-9a-f]{6}$/i.test(v)) {
      setBad(true)
      return
    }
    setBad(false)
    setText(null)
    if (v.toLowerCase() !== cur) onChange(v.toLowerCase())
  }
  return (
    <div className={styles.box} role="group" aria-label={label} data-bg-color="">
      <div className={styles.head}>
        <b>{label}</b>
        <button type="button" className={styles.reset} disabled={cur === def.toLowerCase()} onClick={() => onChange(def)}>{t('bg.reset')}</button>
      </div>
      <div className={styles.row}>
        <label className={styles.swatch} style={{ background: cur }} title={t('bg.pick')}>
          <input type="color" value={cur} aria-label={t('bg.pick')} onChange={(e) => onChange(e.target.value)} />
        </label>
        <input className={styles.hex} value={text ?? cur} aria-label={t('bg.hex')} aria-invalid={bad || undefined} spellCheck={false} maxLength={7}
          onChange={(e) => { setText(e.target.value); setBad(false) }}
          onBlur={(e) => { if (text != null) commit(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            else if (e.key === 'Escape') { setText(null); setBad(false) }
          }} />
      </div>
      <ColorSpectrum value={cur} onChange={onChange} />
      {bad && <span className={styles.err} role="alert">{t('bg.bad')}</span>}
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button key={p} type="button" className={styles.preset} style={{ background: p }} aria-label={p} aria-pressed={cur === p} onClick={() => onChange(p)} />
        ))}
      </div>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  )
}
