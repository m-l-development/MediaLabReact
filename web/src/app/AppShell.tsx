import { useEffect, useRef, useState, type ReactNode } from 'react'
import { canAdmin, displayName, initials, type Me } from '../domain/account'
import { TOOL_GROUP } from '../domain/tool'
import { useServices } from './services'
import { setLang, useLang, useT } from '../shared/i18n/i18n'
import { setTheme, useTheme } from '../shared/theme/theme'
import { Backdrop } from '../shared/ui/Backdrop'
import { Icon } from '../shared/ui/Icon'
import styles from './AppShell.module.css'
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

  return (
    <div className={styles.shell}>
      <Backdrop variant={isHub ? 'mesh' : 'lines'} />
      <a className={styles.skip} href="#main">{t('app.skipToContent')}</a>

      <header className={styles.bar}>
        {!isHub && <BackPill route={route} />}
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
        {me && <AccountButton me={me} onSignOut={onSignOut} />}
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

function AccountButton({ me, onSignOut }: { me: Me; onSignOut: (() => void) | null }) {
  const t = useT()
  const [open, setOpen] = useState(false)
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
  }, [open])

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
        onClick={() => setOpen((v) => !v)}
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

/** «← Media Lab», eller «← Tools»/«← SoMe» for verktøy i en mappe (tilbake til mappen, som i dag). */
function BackPill({ route }: { route: Route }) {
  const t = useT()
  const { router } = useServices()
  const group = route.name === 'tool' ? TOOL_GROUP[route.tool] : null
  const folder = group === 'tools' || group === 'some' ? group : null
  if (!folder) {
    return (
      <Link to={{ name: 'hub' }} className={styles.backPill}>
        <span aria-hidden="true">←</span> {t('app.name')}
      </Link>
    )
  }
  return (
    <a
      href={`/app/#${folder}`}
      className={styles.backPill}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        router.navigate({ name: 'hub' }, { hash: folder })
      }}
    >
      <span aria-hidden="true">←</span> {folder === 'tools' ? 'Tools' : 'SoMe'}
    </a>
  )
}
