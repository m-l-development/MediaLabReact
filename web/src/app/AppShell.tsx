import { useEffect, useRef, useState, type ReactNode } from 'react'
import { canAdmin, displayName, initials, type Me } from '../domain/account'
import { setLang, useLang, useT } from '../shared/i18n/i18n'
import { setTheme, useTheme } from '../shared/theme/theme'
import { Backdrop } from '../shared/ui/Backdrop'
import { Icon } from '../shared/ui/Icon'
import styles from './AppShell.module.css'
import { FeedbackButton } from './Feedback'
import { Link } from './Link'
import type { Route } from './router'

interface AppShellProps {
  route: Route
  me: Me | null
  onSignOut: (() => void) | null
  children: ReactNode
}

const ROLE_LABEL: Record<string, string> = { developer: 'Developer', moderator: 'Moderator', church_admin: 'Admin' }

/**
 * Rammen rundt alle sider, som i dagens Media Lab: ingen sidelinje, «← Media Lab» øverst til venstre på undersider,
 * språkvalg øverst til høyre på forsiden, admin-skjold nede til venstre og knappefelt (konto, lys/mørk) nede til høyre.
 */
export function AppShell({ route, me, onSignOut, children }: AppShellProps) {
  const t = useT()
  const isHub = route.name === 'hub'
  // knappefeltet (PLT-03): bare ett panel åpent om gangen
  const [panel, setPanel] = useState<'feedback' | 'account' | null>(null)

  return (
    <div className={styles.shell}>
      <Backdrop variant={isHub ? 'mesh' : 'lines'} />
      <a className={styles.skip} href="#main">{t('app.skipToContent')}</a>

      <header className={styles.bar}>
        {!isHub && <BackPill />}
        {isHub && <LangToggle />}
      </header>

      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
        <footer className={styles.credit}>{t('footer.credit')}</footer>
      </main>

      {canAdmin(me) && (
        <a className={`${styles.fab} ${styles.adminFab}`} href="/admin" title={t('nav.admin')}>
          <Icon name="shield" size={16} />
          <span className="visually-hidden">{t('nav.admin')}</span>
        </a>
      )}

      <div className={styles.dock}>
        {me && <FeedbackButton me={me} fabClass={styles.fab} open={panel === 'feedback'} onOpen={(v) => setPanel(v ? 'feedback' : null)} />}
        {me && <AccountButton me={me} onSignOut={onSignOut} open={panel === 'account'} setOpen={(v) => setPanel(v ? 'account' : null)} />}
        <ThemeButton />
      </div>
    </div>
  )
}

function LangToggle() {
  const t = useT()
  const lang = useLang()
  return (
    <div className={styles.lang} role="group" aria-label={t('lang.label')}>
      <button type="button" aria-pressed={lang === 'no'} title={t('lang.no')} onClick={() => setLang('no')}>NO</button>
      <button type="button" aria-pressed={lang === 'en'} title={t('lang.en')} onClick={() => setLang('en')}>EN</button>
    </div>
  )
}

function ThemeButton() {
  const t = useT()
  const theme = useTheme()
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={t('theme.toggle')}
      aria-label={t('theme.toggle')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    </button>
  )
}

function AccountButton({ me, onSignOut, open, setOpen }: { me: Me; onSignOut: (() => void) | null; open: boolean; setOpen: (v: boolean) => void }) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open, setOpen])

  const roles = [...new Set(me.roles.map((r) => ROLE_LABEL[r.role] ?? r.role))].join(', ')
  const church = me.churches[0]?.name

  return (
    <div className={styles.account} ref={box}>
      <button
        type="button"
        className={`${styles.fab} ${styles.initials}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={displayName(me)}
        onClick={() => setOpen(!open)}
      >
        {initials(me)}
      </button>
      {open && (
        <div className={styles.menu} role="dialog" aria-label={displayName(me)}>
          <strong>{displayName(me)}</strong>
          <span>{me.email}</span>
          {(roles || church) && <span>{[roles, church].filter(Boolean).join(' · ')}</span>}
          {onSignOut && (
            <button type="button" className={styles.signOut} onClick={onSignOut}>{t('auth.signOut')}</button>
          )}
        </div>
      )}
    </div>
  )
}

/** «← Media Lab»: går alltid til forsiden (ikke til en mappe eller appen man sist var i). */
function BackPill() {
  const t = useT()
  return (
    <Link to={{ name: 'hub' }} className={styles.backPill}>
      <span aria-hidden="true">←</span> {t('app.name')}
    </Link>
  )
}
