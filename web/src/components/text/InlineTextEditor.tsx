/**
 * Direkte tekstredigering på lerretet (dobbeltklikk på et tekstlag), felles for editorene. Et tekstfelt legges over
 * tekstboksen der teksten står, i lagets font, justering og størrelse (uten effekter). Hver endring går rett til laget
 * (samme state som panelet, så panel og lerret er synkronisert). Esc avbryter og setter teksten tilbake; klikk utenfor
 * (eller Ctrl/⌘+Enter) avslutter og beholder teksten. Enter gir linjeskift.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { backdropFor, type Typo } from './typo'

export interface ScreenBox {
  /** Tekstboksens midtpunkt, bredde og høyde i skjermpiksler, og rotasjon i grader. */
  cx: number
  cy: number
  w: number
  h: number
  rot?: number | undefined
}

export interface InlineTextEditorProps {
  box: ScreenBox
  typo: Typo
  /** Skjermpiksler per lagpiksel. */
  scale: number
  value: string
  onChange: (v: string) => void
  /** Ferdig: `keep` = behold endringene (false = Esc: teksten er satt tilbake). */
  onDone: (keep: boolean) => void
}

export default function InlineTextEditor({ box, typo, scale, value, onChange, onDone }: InlineTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const orig = useRef(value)
  const done = useRef(false)
  const finish = (keep: boolean) => {
    if (done.current) return
    done.current = true
    if (!keep && value !== orig.current) onChange(orig.current)
    onDone(keep)
  }
  useEffect(() => {
    const t = ref.current
    if (!t) return
    t.focus()
    t.select()
  }, [])
  // høyden følger teksten
  useLayoutEffect(() => {
    const t = ref.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.max(box.h, t.scrollHeight)}px`
  })
  const fs = Math.max(8, typo.size * scale)
  return createPortal(
    <textarea
      ref={ref}
      data-inline-text=""
      aria-label="Rediger tekst"
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          finish(false)
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          finish(true)
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        zIndex: 2000,
        left: box.cx - box.w / 2,
        top: box.cy - box.h / 2,
        width: box.w,
        minHeight: box.h,
        transform: box.rot ? `rotate(${box.rot}deg)` : undefined,
        transformOrigin: '50% 50%',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        border: '2px solid #4f8cff',
        borderRadius: 4,
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        background: backdropFor(typo.color),
        color: typo.color,
        fontFamily: typo.family,
        fontStretch: typo.stretch,
        fontWeight: typo.weight,
        fontStyle: typo.italic ? 'italic' : 'normal',
        fontSynthesis: 'none',
        fontSize: `${fs}px`,
        lineHeight: typo.lineHeight,
        letterSpacing: `${typo.tracking}em`,
        textAlign: typo.alignH,
        textTransform: typo.upper ? 'uppercase' : 'none',
      }}
    />,
    document.body,
  )
}
