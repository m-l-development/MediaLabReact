import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { familyCss, FONT_CATALOG, FONT_STYLES, FONT_USES, fontByName, type FontEntry, type FontStyle, type FontUse } from './catalog'
import { preloadSheet } from './loader'
import s from './FontPicker.module.css'

/**
 * Felles fontvelger (Photo Design, Thumbnail Studio, Motion Design, Loop Studio): søk, stil, bruksområde og
 * forhåndsvisning i selve fonten, med ekte snitt (B, I). Erstatter nedtrekkslistene; verdien er fontens navn som før,
 * så eksisterende prosjekter er uendret. Fonter utenfor biblioteket (eldre prosjekter) vises øverst.
 * Tekstene er i den felles ordboken (fp.*), så velgeren er lik i alle appene.
 */
export interface FontPickerProps {
  value: string
  onChange: (font: string) => void
  label: string
  /** Fonter som vises øverst (f.eks. malens eller grunnoppsettets egne). */
  top?: readonly string[]
  sample?: string
  disabled?: boolean
}

const SAMPLE = 'Søndagsmøte ÆØÅ'
const STYLE_KEY = (k: FontStyle) => ('fp.s.' + k) as MessageKey
const USE_KEY = (k: FontUse) => ('fp.u.' + k) as MessageKey

export function FontPicker({ value, onChange, label, top = [], sample = SAMPLE, disabled = false }: FontPickerProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [style, setStyle] = useState<FontStyle | ''>('')
  const [use, setUse] = useState<FontUse | ''>('')
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', out, true)
    document.addEventListener('keydown', key, true)
    search.current?.focus()
    return () => {
      document.removeEventListener('pointerdown', out, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    const hit = FONT_CATALOG.filter((f) => (!style || f.style === style) && (!use || f.uses.includes(use)) && (!n || f.name.toLowerCase().includes(n) || t(STYLE_KEY(f.style)).toLowerCase().includes(n) || FONT_STYLES[f.style].toLowerCase().includes(n)))
    const first = [...new Set([value, ...top])].filter((x) => x && (!n || x.toLowerCase().includes(n)) && (!style || fontByName(x)?.style === style) && (!use || !!fontByName(x)?.uses.includes(use)))
    const rest = hit.filter((f) => !first.includes(f.name)).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    return [...first.map((name) => ({ name, entry: fontByName(name) })), ...rest.map((f) => ({ name: f.name, entry: f as FontEntry | null }))]
  }, [q, style, use, value, top, t])

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={root} className={s.root} data-font-picker="">
      <button type="button" className={s.trigger} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${value}`}
        onClick={() => setOpen((o) => !o)} onPointerEnter={() => preloadSheet(value)} style={{ fontFamily: familyCss(value) }} data-font-value={value}>
        <span>{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className={s.pop} role="dialog" aria-label={label}>
          <input ref={search} type="search" className={s.search} value={q} placeholder={t('fp.search')} aria-label={t('fp.search')} data-font-search=""
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { e.preventDefault(); pick(list[0].name) } }} />
          <div className={s.filters}>
            <select value={style} aria-label={t('fp.style')} onChange={(e) => setStyle(e.target.value as FontStyle | '')} data-font-style="">
              <option value="">{t('fp.allStyles')}</option>
              {(Object.keys(FONT_STYLES) as FontStyle[]).map((k) => <option key={k} value={k}>{t(STYLE_KEY(k))}</option>)}
            </select>
            <select value={use} aria-label={t('fp.use')} onChange={(e) => setUse(e.target.value as FontUse | '')} data-font-use="">
              <option value="">{t('fp.allUses')}</option>
              {(Object.keys(FONT_USES) as FontUse[]).map((k) => <option key={k} value={k}>{t(USE_KEY(k))}</option>)}
            </select>
          </div>
          <ul className={s.list} role="listbox" aria-label={label}>
            {list.map(({ name, entry }) => <Row key={name} name={name} entry={entry} on={name === value} sample={sample} onPick={pick} />)}
            {!list.length && <li className={s.empty}>{t('fp.none')}</li>}
          </ul>
          <p className={s.foot}>{t('fp.foot')} {FONT_CATALOG.length} {t('fp.fonts')}</p>
        </div>
      )}
    </div>
  )
}

/** Én font: navnet i selve fonten (stilarket hentes først når raden vises) og snittene den har. */
function Row({ name, entry, on, sample, onPick }: { name: string; entry: FontEntry | null; on: boolean; sample: string; onPick: (n: string) => void }) {
  const t = useT()
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { preloadSheet(name); return }
    const io = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) {
        preloadSheet(name)
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [name])
  return (
    <li ref={ref} role="option" aria-selected={on}>
      <button type="button" className={s.row} data-font-option={name} onClick={() => onPick(name)}>
        <span className={s.name} style={{ fontFamily: familyCss(name) }}>{name}</span>
        <span className={s.sample} style={{ fontFamily: familyCss(name) }}>{sample}</span>
        <span className={s.meta}>
          {entry ? t(STYLE_KEY(entry.style)) : t('fp.inProject')}
          {entry?.noAeoa && <span className={s.warn} data-font-noaeoa="" title={t('fp.noAeoaTip')}>{t('fp.noAeoa')}</span>}
          {entry && (
            <span className={s.snitt} aria-label={t('fp.snitt')}>
              <b aria-disabled={!entry.snitt.b} title={t(entry.snitt.b ? 'fp.hasB' : 'fp.noB')}>B</b>
              <i aria-disabled={!entry.snitt.i} title={t(entry.snitt.i ? 'fp.hasI' : 'fp.noI')}>I</i>
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
