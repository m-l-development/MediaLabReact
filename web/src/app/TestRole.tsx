import type { Me } from '../domain/account'
import { allowedViews, realView, VIEW_LABEL, type View } from '../domain/test-role'
import { useT } from '../shared/i18n/i18n'
import { setTestRole } from './test-role'
import styles from './TestRole.module.css'

/** Ikonene for testrollene, samme strek som i dagens kontomeny. */
const ICON: Record<View, React.ReactNode> = {
  developer: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  admin: <><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  moderator: <><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2v3l-3-3h-4" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></>,
}

/** «Testrolle» i kontomenyen (PLT-16): bare i utvikling/Preview, og bare roller lik eller lavere enn den ekte. */
export function TestRoleBox({ realMe, testRole, reload }: { realMe: Me; testRole: string | null; reload?: () => void }) {
  const t = useT()
  const views = allowedViews(realMe)
  if (views.length <= 1) return null
  const cur = testRole ?? realView(realMe)
  return (
    <div className={styles.box} data-ch-testrole="" role="radiogroup" aria-label={t('role.title')}>
      <span className={styles.head}>{t('role.title')} <span>({t('role.only')})</span></span>
      {views.map((v) => {
        const on = v === cur
        return (
          <button key={v} type="button" role="radio" aria-checked={on} className={styles.row} onClick={() => { if (!on) setTestRole(v, realMe, reload) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f4fd8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[v]}</svg>
            <span className={styles.label}>{t(`role.${v}`)}{v === realView(realMe) ? ' · ' + t('role.yours') : ''}</span>
            <span className={styles.dot} aria-hidden="true" />
          </button>
        )
      })}
      <p className={styles.note}>{t('role.note')}</p>
    </div>
  )
}

/** Tydelig stripe nederst når testmodus er på, med knapp tilbake til den ekte rollen. */
export function TestBanner({ realMe, testRole, reload }: { realMe: Me; testRole: string; reload?: () => void }) {
  const t = useT()
  const label = (v: string) => (v in VIEW_LABEL ? t(`role.${v as View}`) : v)
  return (
    <div className={styles.banner} data-ch-testbanner="" role="status">
      <span>{t('role.mode')}: {label(testRole)} · {t('role.serverSame')}</span>
      <button type="button" onClick={() => setTestRole(null, realMe, reload)}>{t('role.back')} {label(realView(realMe))}</button>
    </div>
  )
}
