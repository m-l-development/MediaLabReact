import { useRef, useState } from 'react'
import { useT } from '../i18n/i18n'
import styles from './ColorSpectrum.module.css'

type Hsv = [number, number, number]

function toHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const mx = Math.max(r, g, b)
  const d = mx - Math.min(r, g, b)
  let h = 0
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, mx ? d / mx : 0, mx]
}

function toHex([h, s, v]: Hsv): string {
  const f = (k: number) => {
    const x = (k + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(x, 4 - x, 1))) * 255)
  }
  return `#${[f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

type Dropper = new () => { open: () => Promise<{ sRGBHex: string }> }

/**
 * Fargefelt som i Loop Studio («Velg farge»): metning/lysstyrke-flate, regnbuestripe for fargetone og pipette (der
 * nettleseren støtter det). Fargetonen huskes lokalt så den ikke hopper når fargen er grå, svart eller hvit.
 */
export function ColorSpectrum({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const t = useT()
  const cur = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#000000'
  const [own, setOwn] = useState<{ hex: string; hsv: Hsv } | null>(null)
  const hsv: Hsv = own && own.hex === cur ? own.hsv : toHsv(cur)
  const sv = useRef<HTMLDivElement>(null)
  const hue = useRef<HTMLDivElement>(null)
  const put = (n: Hsv) => {
    const hex = toHex(n)
    setOwn({ hex, hsv: n })
    if (hex !== cur) onChange(hex)
  }
  const drag = (el: HTMLDivElement | null, e: React.PointerEvent, at: (x: number, y: number) => void) => {
    if (!el || e.button !== 0) return
    e.preventDefault()
    const r = el.getBoundingClientRect()
    const go = (ev: { clientX: number; clientY: number }) => at(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)))
    go(e)
    const id = e.pointerId
    const mv = (ev: PointerEvent) => { if (ev.pointerId === id) go(ev) }
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
  /** Piltaster: venstre/høyre = metning (eller fargetone på stripen), opp/ned = lysstyrke. Shift = større steg. */
  const key = (e: React.KeyboardEvent, onHue: boolean) => {
    const k = e.shiftKey ? 10 : 1
    const [h, s, v] = hsv
    const n: Hsv | null = e.key === 'ArrowLeft' ? (onHue ? [(h - k + 360) % 360, s, v] : [h, Math.max(0, s - 0.01 * k), v])
      : e.key === 'ArrowRight' ? (onHue ? [(h + k) % 360, s, v] : [h, Math.min(1, s + 0.01 * k), v])
        : !onHue && e.key === 'ArrowUp' ? [h, s, Math.min(1, v + 0.01 * k)]
          : !onHue && e.key === 'ArrowDown' ? [h, s, Math.max(0, v - 0.01 * k)] : null
    if (!n) return
    e.preventDefault()
    put(n)
  }
  const ED = (window as unknown as { EyeDropper?: Dropper }).EyeDropper
  return (
    <div className={styles.box} data-color-spectrum="">
      <div ref={sv} className={styles.sv} role="slider" tabIndex={0} aria-label={t('bg.sv')} aria-valuetext={cur}
        style={{ backgroundColor: toHex([hsv[0], 1, 1]) }}
        onPointerDown={(e) => drag(sv.current, e, (x, y) => put([hsv[0], x, 1 - y]))}
        onKeyDown={(e) => key(e, false)}>
        <span className={styles.dot} style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%`, background: cur }} />
      </div>
      <div className={styles.row}>
        <div ref={hue} className={styles.hue} role="slider" tabIndex={0} aria-label={t('bg.hue')} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv[0])}
          onPointerDown={(e) => drag(hue.current, e, (x) => put([Math.min(359.9, x * 360), hsv[1], hsv[2]]))}
          onKeyDown={(e) => key(e, true)}>
          <span className={styles.knob} style={{ left: `${(hsv[0] / 360) * 100}%`, background: toHex([hsv[0], 1, 1]) }} />
        </div>
        {ED && (
          <button type="button" className={styles.drop} title={t('bg.drop')} aria-label={t('bg.drop')} onClick={() => {
            new ED().open().then((r) => { if (/^#[0-9a-f]{6}$/i.test(r.sRGBHex)) onChange(r.sRGBHex.toLowerCase()) }).catch(() => {})
          }}>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M14.5 3.5l6 6-2 2-1-1-8 8H6v-3.5l8-8-1-1 1.5-2.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}
