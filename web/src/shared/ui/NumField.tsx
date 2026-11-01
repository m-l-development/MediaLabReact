import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useLang, useT } from '../i18n/i18n'
import styles from './NumField.module.css'

/**
 * Tallverdien ved en slider eller kontroll, som brukeren kan klikke på og skrive inn selv (som verdifeltene i
 * Figma, Photoshop og Premiere). Visningen er en knapp med stiplet understrek; klikk, Enter eller F2 gir et tekstfelt der
 * hele tallet er markert, så det kan erstattes med én gang.
 * - Enter (og Tab/klikk utenfor) godtar, Escape forkaster. Pil opp/ned endrer med ett steg (Shift: ti steg) – også
 *   uten å åpne feltet, og slideren følger med fordi begge leser samme verdi.
 * - Desimalkomma og -punktum godtas; enheten kan skrives med («12 px», «45°», «50 %»).
 * - Verdien holdes innenfor grensene. Tekst som ikke er et tall godtas ikke: feltet viser en beskjed og forblir åpent
 *   (Enter) eller går tilbake til siste gyldige verdi (klikk utenfor).
 *
 * `value` er i kontrollens egne enheter (som slideren). Det som vises er `value × scale` (f.eks. 0,5 → «50 %»). Uten
 * `scale` utledes faktoren av `show` (tallet som vises i dag), slik at eksisterende visningstekster kan brukes som de er.
 */
export function NumField({ value, min, max, step = 1, onCommit, label, show, unit, scale, decimals, disabled = false, className }: {
  value: number
  min: number
  max: number
  step?: number | undefined
  onCommit: (v: number) => void
  label: string
  /** Visningstekst (f.eks. «+12», «50 %»). Uten den vises tallet med `unit`. */
  show?: string | undefined
  unit?: string | undefined
  scale?: number | undefined
  decimals?: number | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}) {
  const t = useT()
  const comma = useLang() !== 'en'
  const [text, setText] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const msgId = useId()
  const skipBlur = useRef(false)

  const shownNum = show != null ? parseNum(show) : null
  const k = scale ?? (shownNum != null && shownNum !== 0 && value !== 0 ? snapScale(shownNum / value) : max <= 1 && /%/.test(show ?? unit ?? '') ? 100 : 1)
  const dec = decimals ?? decimalsOf(step * k)
  const fmt = (n: number) => {
    const s = String(+n.toFixed(dec))
    return comma ? s.replace('.', ',') : s
  }
  const display = show ?? fmt(value * k) + (unit ?? '')
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const range = `${fmt(min * k)}–${fmt(max * k)}${(unit ?? '').trim() ? ' ' + (unit ?? '').trim() : ''}`

  const open = () => {
    if (disabled) return
    setErr('')
    setText(fmt(value * k))
  }
  const cancel = () => {
    skipBlur.current = true
    setText(null)
    setErr('')
  }
  /** Godtar teksten. Gir false (og en beskjed) hvis den ikke er et tall. */
  const accept = (raw: string): boolean => {
    const n = parseNum(raw)
    if (n == null) {
      setErr(t('num.invalid', { range }))
      return false
    }
    skipBlur.current = true
    setText(null)
    setErr('')
    const v = clamp(n / k)
    if (Math.abs(v - value) > 1e-9) onCommit(v)
    return true
  }
  const nudge = (e: KeyboardEvent, base: number) => {
    e.preventDefault()
    const d = (e.shiftKey ? 10 : 1) * step * (e.key === 'ArrowUp' ? 1 : -1)
    const v = clamp(+(base + d).toFixed(10))
    if (Math.abs(v - value) > 1e-9) onCommit(v)
    return v
  }

  if (text !== null) {
    return (
      <span className={`${styles.wrap} ${className ?? ''}`}>
        <input className={styles.input} type="text" inputMode="decimal" autoFocus aria-label={label} value={text}
          aria-invalid={err ? true : undefined} aria-describedby={err ? msgId : undefined} data-num-input=""
          onChange={(e) => { setText(e.target.value.slice(0, 16)); setErr('') }}
          onFocus={(e) => { skipBlur.current = false; e.currentTarget.select() }}
          onBlur={(e) => {
            if (skipBlur.current) return
            // klikk utenfor: godta et tall, ellers tilbake til siste gyldige verdi
            if (!accept(e.currentTarget.value)) cancel()
          }}
          onKeyDown={(e) => {
            e.stopPropagation() // arbeidsflatens snarveier (0, +, −, Delete …) gjelder ikke mens man skriver
            if (e.key === 'Enter') {
              e.preventDefault()
              accept(e.currentTarget.value)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancel()
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              const cur = parseNum(e.currentTarget.value)
              const v = nudge(e, cur == null ? value : clamp(cur / k))
              setText(fmt(v * k))
              setErr('')
            }
          }} />
        {err && <span id={msgId} role="alert" className={styles.err}>{err}</span>}
      </span>
    )
  }
  return (
    <button type="button" className={`${styles.btn} ${className ?? ''}`} disabled={disabled} data-num-field=""
      aria-label={`${label}: ${display.trim()}`} title={disabled ? undefined : t('num.hint')}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); open() }}
      onKeyDown={(e) => {
        if (e.key === 'F2') { e.preventDefault(); open() }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.stopPropagation(); nudge(e, value) }
      }}>
      {display}
    </button>
  )
}

/** Tallet i en tekst: «12,5 px» → 12.5, «+3» → 3, «−4» → −4. Null hvis det ikke er et tall. */
export function parseNum(raw: string): number | null {
  const m = raw.replace(/−/g, '-').match(/^\s*([-+]?)\s*(\d+(?:[.,]\d*)?|[.,]\d+)\s*([a-zæøå%°]{0,4})\s*$/i)
  if (!m) return null
  const n = Number((m[1] ?? '') + (m[2] ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Visningen er avrundet (0,333 → «33 %», 1,4 → «1»), så forholdet blir nærmeste tierpotens (andre faktorer: `scale`). */
function snapScale(r: number): number {
  return 10 ** Math.round(Math.log10(Math.abs(r)))
}

function decimalsOf(x: number): number {
  for (let d = 0; d < 4; d++) if (Math.abs(Math.round(x * 10 ** d) - x * 10 ** d) < 1e-6) return d
  return 4
}
