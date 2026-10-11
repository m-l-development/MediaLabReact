import { useEffect } from 'react'
import { BUILD } from '../infrastructure/build'
import { useT } from '../shared/i18n/i18n'
import { sessionStore } from '../shared/lib/storage'
import { useStore } from '../shared/lib/store'
import type { ToolLifecycle } from './tools'
import { createUpdateWatcher, EVERY } from './update'
import styles from './UpdateNotice.module.css'

/** Én vakt for hele siden. */
const watcher = createUpdateWatcher({
  build: BUILD,
  enabled: BUILD !== 'dev' || sessionStore.get('ml.updateCheck') === '1',
  async fetchVersion() {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) return null
      const v = ((await r.json()) as { v?: unknown }).v
      return typeof v === 'string' && v ? v : null
    } catch {
      return null
    }
  },
  save: async () => null,
  busy: () => false,
  hidden: () => document.hidden,
  now: () => Date.now(),
})

/** Kortet «Ny versjon av Media Lab er klar» (PLT-04). Lagrer det åpne verktøyets arbeid før det vises. */
export function UpdateNotice({ lifecycle }: { lifecycle: ToolLifecycle | null }) {
  const t = useT()
  // verktøyet som er åpent nå, lagrer og melder om det er opptatt
  useEffect(() => {
    watcher.setTool({
      async save() {
        if (!lifecycle?.save) return null
        try {
          await lifecycle.save()
          return true
        } catch {
          return false
        }
      },
      busy: () => !!lifecycle?.isBusy?.(),
    })
  }, [lifecycle])
  useEffect(() => {
    const id = setInterval(() => void watcher.check(), EVERY)
    const vis = () => {
      if (!document.hidden) void watcher.check()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  const s = useStore(watcher.state)
  if (!s.open) return null
  const text = s.phase === 'saving' ? 'update.saving' : s.phase === 'saved' ? 'update.saved' : s.phase === 'failed' ? 'update.failed' : 'update.reload'
  return (
    <div role="alertdialog" aria-live="polite" aria-labelledby="ml-update-title" className={styles.card} data-ml-update="">
      <strong id="ml-update-title" className={styles.title}>{t('update.title')}</strong>
      <span className={styles.text}>{t(text)}</span>
      <div className={styles.row}>
        <button type="button" className={styles.primary} disabled={s.phase === 'saving'} onClick={() => void watcher.updateNow(() => location.reload())}>
          {t(s.phase === 'saving' ? 'update.savingShort' : 'update.now')}
        </button>
        <button type="button" className={styles.secondary} disabled={s.phase === 'saving'} onClick={() => watcher.later()}>{t('update.later')}</button>
      </div>
    </div>
  )
}
