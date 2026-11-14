import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { CUSTOM_START, paletteFrom, swatchOf, THEMES, type ThemeValue } from './theme'
import s from './Templates.module.css'

/**
 * Felles «Velg farge» for ferdige maler: Standard (malens egne farger), de ti temaene og «Egne farger» med tre fargevalg
 * (bakgrunn, tekst, aksent). Samme utseende som i Thumbnail Studio. Endringer under dra kommer høyst én gang per bilde.
 */
export function ThemePicker({ value, onChange, std }: { value: ThemeValue; onChange: (v: ThemeValue) => void; std?: [string, string, string] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])
  const custom = value?.k === 'custom' ? (value.c ?? CUSTOM_START) : CUSTOM_START
  const cur = !value ? null : value.k === 'custom' ? paletteFrom(custom) : THEMES.find((x) => x.k === value.k)?.p ?? null
  const name = !value ? t('tpl.standard') : value.k === 'custom' ? t('tpl.customName') : t(`theme.${value.k}` as MessageKey)
  const sw = cur ? swatchOf(cur) : (std ?? ['#000000', '#ffffff', '#f5b800'])
  // fargevelgeren sender mange endringer under dra: én per bilde
  const raf = useRef(0)
  const next = useRef<[string, string, string] | null>(null)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const setCustom = (i: number, v: string) => {
    const c = [...custom] as [string, string, string]
    c[i] = v
    next.current = c
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0
      if (next.current) onChange({ k: 'custom', c: next.current })
    })
  }
  return (
    <div className={s.rel} ref={ref} data-theme-picker="">
      <button type="button" className={s.palBtn} aria-expanded={open} aria-haspopup="true" data-theme-btn="" onClick={() => setOpen((v) => !v)}>
        <span className={s.palSw}>{sw.map((x, i) => <i key={i} style={{ background: x }} />)}</span>
        <span>{t('tpl.pick')}</span>
        <span className={s.palName} data-theme-name="">{name}</span>
      </button>
      {open && (
        <div className={s.palMenu} role="group" aria-label={t('tpl.pick')}>
          <button type="button" aria-pressed={!value} data-theme-opt="std" onClick={() => { onChange(null); setOpen(false) }}>
            <span className={s.palSw}>{(std ?? ['#000000', '#ffffff', '#f5b800']).map((x, i) => <i key={i} style={{ background: x }} />)}</span>
            <span>{t('tpl.standard')}</span>
            <span aria-hidden="true" style={{ opacity: !value ? 1 : 0 }}>✓</span>
          </button>
          {THEMES.map((x) => (
            <button key={x.k} type="button" aria-pressed={value?.k === x.k} data-theme-opt={x.k} onClick={() => { onChange({ k: x.k }); setOpen(false) }}>
              <span className={s.palSw}>{swatchOf(x.p).map((col, i) => <i key={i} style={{ background: col }} />)}</span>
              <span>{t(`theme.${x.k}` as MessageKey)}</span>
              <span aria-hidden="true" style={{ opacity: value?.k === x.k ? 1 : 0 }}>✓</span>
            </button>
          ))}
          <button type="button" aria-pressed={value?.k === 'custom'} data-theme-opt="custom" onClick={() => { if (value?.k !== 'custom') onChange({ k: 'custom', c: custom }) }}>
            <span className={s.palSw}>{swatchOf(paletteFrom(custom)).map((col, i) => <i key={i} style={{ background: col }} />)}</span>
            <span>{t('tpl.custom')}</span>
            <span aria-hidden="true" style={{ opacity: value?.k === 'custom' ? 1 : 0 }}>✓</span>
          </button>
          {value?.k === 'custom' && (
            <div className={s.custom} data-theme-custom="">
              {(['tpl.bg', 'tpl.text', 'tpl.accent'] as const).map((k, i) => (
                <label key={k}>
                  <span>{t(k)}</span>
                  <input type="color" value={custom[i]} data-theme-color={i} onChange={(e) => setCustom(i, e.target.value)} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
