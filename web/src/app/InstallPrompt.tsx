import { useEffect } from 'react'
import { useT } from '../shared/i18n/i18n'
import { localStore } from '../shared/lib/storage'
import { useStore } from '../shared/lib/store'
import { createPwa, type InstallEvent } from './pwa'
import styles from './InstallPrompt.module.css'

/** Én for hele siden. Lytterne legges på straks modulen lastes, så prompten ikke kommer før React er klar. */
const pwa = createPwa({
  ua: navigator.userAgent || '',
  platform: navigator.platform || '',
  touchPoints: navigator.maxTouchPoints || 0,
  standalone: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  now: () => Date.now(),
  storage: localStore,
  setTimeout: (fn, ms) => void setTimeout(fn, ms),
})
addEventListener('beforeinstallprompt', (e) => pwa.onPrompt(e as InstallEvent))
addEventListener('appinstalled', () => pwa.onInstalled())

/** Kortet «Media Lab som web-app» (PLT-07), nede til venstre som i dagens app. */
export function InstallPrompt() {
  const t = useT()
  useEffect(() => pwa.start(), [])
  const mode = useStore(pwa.mode)
  if (!mode) return null
  return (
    <div className={styles.card} role="dialog" aria-label={t('pwa.title')} data-ml-pwa="">
      <img className={styles.icon} src="/images/app-icon-192.png" alt="" width={56} height={56} />
      <div className={styles.col}>
        <strong className={styles.title}>{t('pwa.title')}</strong>
        <span className={styles.text}>{t(mode === 'ios' ? 'pwa.ios' : 'pwa.text')}</span>
        <div className={styles.row}>
          {mode === 'ios' ? (
            <button type="button" className={styles.primary} onClick={() => pwa.later()}>OK</button>
          ) : (
            <>
              <button type="button" className={styles.primary} onClick={() => void pwa.install()}>{t('pwa.open')}</button>
              <button type="button" className={styles.secondary} onClick={() => pwa.later()}>{t('pwa.later')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
