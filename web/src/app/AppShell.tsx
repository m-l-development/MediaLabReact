import { useEffect, useRef, useState, type ReactNode } from 'react'
import { canAdmin, type Me } from '../domain/account'
import { setLang, useLang, useT } from '../shared/i18n/i18n'
import { setTheme, useTheme } from '../shared/theme/theme'
import { Backdrop } from '../shared/ui/Backdrop'
import { Icon } from '../shared/ui/Icon'
import styles from './AppShell.module.css'
import { FeedbackButton } from './Feedback'
import { Link } from './Link'
import { AdoptPrompt } from './LocalData'
import { stickyTitle } from './sticky-title'
import { TestBanner } from './TestRole'
import { AccountMenu } from './AccountMenu'
import { hrefFor, type Route } from './router'

interface AppShellProps {
  route: Route
  me: Me | null
  onSignOut: (() => void) | null
  children: ReactNode
  /** Testrolle (PLT-16): den ekte innloggingen, valgt visning og om rollebytteren er med i bygget. */
  realMe?: Me | null
  testRole?: string | null
  testAllowed?: boolean
}


/**
 * Rammen rundt alle sider, som i dagens Media Lab: ingen sidelinje, «← Media Lab» øverst til venstre på undersider,
 * språkvalg øverst til høyre på forsiden, admin-skjold nede til venstre og knappefelt (konto, lys/mørk) nede til høyre.
 */
export function AppShell({ route, me, onSignOut, children, realMe = me, testRole = null, testAllowed = false }: AppShellProps) {
  const t = useT()
  const isHub = route.name === 'hub'
  // knappefeltet (PLT-03): bare ett panel åpent om gangen
  const [panel, setPanel] = useState<'feedback' | 'account' | null>(null)
  // fast topplinje med liten tittel ved rulling (PLT-09), i verktøyene som i dagens app
  const isTool = route.name === 'tool'
  // Loop Studio har sin egen topplinje med «← Media Lab» (portert fra dagens app)
  const ownBar = (route.name === 'tool' && route.tool === 'loop-studio') || route.name === 'admin'
  // admin har egen ramme (topplinje, sidemeny og bakgrunn) som i dagens app; knappefeltet beholdes
  const bare = route.name === 'admin'
  const shell = useRef<HTMLDivElement>(null)
  useEffect(() => (isTool && shell.current ? stickyTitle(shell.current) : undefined), [isTool])

  return (
    <div className={styles.shell} ref={shell}>
      {!bare && <Backdrop variant={isHub ? 'mesh' : 'lines'} />}
      <a className={styles.skip} href="#main">{t('app.skipToContent')}</a>

      {!ownBar && (
        <header className={isTool ? `${styles.bar} ${styles.barFixed}` : styles.bar} data-ml-bar={isTool ? '' : undefined}>
          {!isHub && <BackPill />}
          {isHub && <LangToggle />}
        </header>
      )}

      {bare ? children : (
        <main id="main" className={styles.main} tabIndex={-1}>
          {children}
          <footer className={styles.credit}>{t('footer.credit')}</footer>
        </main>
      )}

      {canAdmin(me) && !bare && (
        <a className={`${styles.fab} ${styles.adminFab}`} href={hrefFor({ name: 'admin' })} title={t('nav.admin')}>
          <Icon name="shield" size={16} />
          <span className="visually-hidden">{t('nav.admin')}</span>
        </a>
      )}

      <div className={styles.dock}>
        {me && <FeedbackButton me={me} fabClass={styles.fab} open={panel === 'feedback'} onOpen={(v) => setPanel(v ? 'feedback' : null)} />}
        {me && <AccountMenu me={me} realMe={realMe ?? me} testRole={testRole} testAllowed={testAllowed} onSignOut={onSignOut} open={panel === 'account'} setOpen={(v) => setPanel(v ? 'account' : null)} fabClass={styles.fab} />}
        <ThemeButton />
      </div>
      {me && <AdoptPrompt userId={me.id} />}
      {testRole && realMe && <TestBanner realMe={realMe} testRole={testRole} />}
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

/** «← Media Lab»: går alltid til forsiden (ikke til en mappe eller appen man sist var i). */
function BackPill() {
  const t = useT()
  return (
    <Link to={{ name: 'hub' }} className={styles.backPill}>
      <span aria-hidden="true">←</span> {t('app.name')}
    </Link>
  )
}
