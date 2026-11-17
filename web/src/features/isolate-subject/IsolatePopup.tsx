import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ToolLifecycle } from '../../app/tools'
import { POPUP_ATTR } from '../../shared/lib/popup'
import { useT } from '../../shared/i18n/i18n'
import IsolateSubject from './IsolateSubject'
import styles from './IsolatePopup.module.css'

export interface IsolatePopupProps {
  /** Bildet fra editoren (originalen endres aldri). */
  blob: Blob
  name: string
  /** «Ferdig – sett inn»: PNG i full oppløsning (gjennomsiktig eller med valgt bakgrunn). */
  onInsert: (png: Blob, name: string) => void
  onClose: () => void
}

const NO_QUERY: Readonly<Record<string, string>> = {}

/**
 * «Isoler motiv»: hele Isolate Subject (samme komponent, kontroller, modeller og maskeredigering) i en popup over
 * editoren. Editoren under er `inert` og reagerer ikke på hurtigtaster eller innliming mens popupen er åpen
 * (shared/lib/popup). Avbryt lukker uten å endre noe; AI-trådene avsluttes når popupen lukkes.
 */
export default function IsolatePopup({ blob, name, onInsert, onClose }: IsolatePopupProps) {
  const t = useT()
  const root = useRef<HTMLDivElement>(null)
  const life = useRef<ToolLifecycle | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const app = document.getElementById('root')
    const prev = document.activeElement as HTMLElement | null
    app?.setAttribute('inert', '')
    root.current?.focus({ preventScroll: true })
    const body = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      app?.removeAttribute('inert')
      document.body.style.overflow = body
      // AI-trådene og bildene slippes først når popupen faktisk er lukket (React kan kjøre oppryddingen og
      // oppsettet på nytt rett etter hverandre, f.eks. i utviklingsmodus)
      mounted.current = false
      setTimeout(() => { if (!mounted.current) life.current?.dispose?.() }, 0)
      if (prev && typeof prev.focus === 'function') prev.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      ref={root}
      className={styles.popup}
      role="dialog"
      aria-modal="true"
      aria-label={t('isolate.embed.title')}
      tabIndex={-1}
      {...{ [POPUP_ATTR]: '' }}
      onPointerDownCapture={() => {
        // tastetrykk skal gå til popupen (ikke til siden bak), også etter trykk på lerretet
        const r = root.current
        if (r && !r.contains(document.activeElement)) r.focus({ preventScroll: true })
      }}
    >
      <IsolateSubject
        query={NO_QUERY}
        registerLifecycle={(l) => { life.current = l }}
        embed={{ blob, name, onInsert, onCancel: onClose }}
      />
    </div>,
    document.body,
  )
}
