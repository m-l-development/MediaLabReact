import { useEffect, useState } from 'react'
import { adoptLegacy, clearMyLocalData, legacyStatus, rememberAnswer, shouldAsk } from '../infrastructure/local-user'
import { useT } from '../shared/i18n/i18n'
import type { MessageKey } from '../shared/i18n/messages'
import styles from './LocalData.module.css'

/**
 * «Prosjekter fra før innlogging» (PLT-17), som askLegacy i media-lab/src/shared/auth-gate.js: spør én gang per bruker
 * og enhet om eierløse data skal knyttes til kontoen. Ingenting flyttes, kopieres eller slettes.
 */
export function AdoptPrompt({ userId }: { userId: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<MessageKey | null>(null)
  useEffect(() => {
    let live = true
    if (shouldAsk(userId)) void legacyStatus(userId).then((s) => live && s.available && setOpen(true))
    return () => { live = false }
  }, [userId])
  if (!open) return null
  const yes = async () => {
    setBusy(true)
    const r = await adoptLegacy(userId)
    if (r.ok) {
      setNote('local.adopted')
      // verktøyene leser de gamle dataene med de nye navnene først etter ny innlasting
      setTimeout(() => location.reload(), 900)
      return
    }
    setNote(r.error === 'konflikt' ? 'local.conflict' : 'local.failed')
    rememberAnswer(userId, 'konflikt')
    setBusy(false)
  }
  return (
    <div className={styles.wrap} role="dialog" aria-modal="true" aria-labelledby="ml-adopt-title">
      <div className={styles.box}>
        <strong id="ml-adopt-title">{t('local.title')}</strong>
        <p>{t('local.body')}</p>
        {note && <p className={styles.note} role="status">{t(note)}</p>}
        <div className={styles.row}>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => void yes()} autoFocus>{t('local.adopt')}</button>
          <button type="button" className={styles.secondary} onClick={() => setOpen(false)}>{t('pwa.later')}</button>
          <button type="button" className={styles.secondary} onClick={() => { rememberAnswer(userId, 'nei'); setOpen(false) }}>{t('local.notMine')}</button>
        </div>
      </div>
    </div>
  )
}

/** «Fjern lokale data?» i kontomenyen: forklarer hva som fjernes og hva som blir liggende, så logges brukeren ut. */
export function WipeLocalData({ userId, onCancel, onSignOut }: { userId: string; onCancel: () => void; onSignOut: () => Promise<void> | void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <strong>{t('local.wipeTitle')}</strong>
      <span>{t('local.wipeWhat')}</span>
      <span>{t('local.wipeStays')}</span>
      <button
        type="button"
        className={styles.danger}
        data-ch-wipe-go=""
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await clearMyLocalData(userId).catch(() => undefined)
          await onSignOut()
        }}
      >
        {t('local.wipeGo')}
      </button>
      <button type="button" className={styles.light} disabled={busy} onClick={onCancel}>{t('fb.cancel')}</button>
    </>
  )
}
