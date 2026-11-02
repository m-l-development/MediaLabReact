import { useT } from '../i18n/i18n'
import styles from './MoreButton.module.css'

/**
 * «⋯»-knappen for berøringsskjermer: åpner den samme høyreklikkmenyen som området allerede har (sender en vanlig
 * `contextmenu`-hendelse), så mobil får handlingene uten egen logikk. Vises bare på berøringsskjerm (hover: none og
 * pointer: coarse); på PC med mus er den skjult, og høyreklikk virker som før.
 *
 * `onOpen`: egen åpning (når området ikke har en høyreklikkhandler å sende til), med knappens posisjon.
 * `at`: punktet hendelsen får – «center» = midt i forelderen (f.eks. det valgte laget på lerretet), ellers ved knappen.
 */
export function MoreButton({ label, of, at, className, onOpen }: { label?: string | undefined; of?: string | undefined; at?: 'center' | 'button' | undefined; className?: string | undefined; onOpen?: ((x: number, y: number) => void) | undefined }) {
  const t = useT()
  // navnet sier hva knappen gjelder («Flere handlinger: bilde.png»), så det ikke blir likt elementets eget navn
  const name = label ?? (of ? t('more.actionsFor', { name: of }) : t('more.actions'))
  return (
    <button type="button" className={`${styles.more} ${className ?? ''}`} aria-label={name} title={name} data-more=""
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const btn = e.currentTarget
        if (onOpen) {
          const b = btn.getBoundingClientRect()
          onOpen(b.left + b.width / 2, b.bottom)
          return
        }
        const host = btn.parentElement
        if (!host) return
        const r = (at === 'center' ? host : btn).getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        // til forelderen (raden, kortet, det valgte laget), midt i den eller ved knappen
        host.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }))
      }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
    </button>
  )
}
