import { useState, type CSSProperties, type ReactNode } from 'react'
import { canAdmin, displayName, initials, type Me } from '../domain/account'
import { TOOL_IDS, type ToolGroup } from '../domain/tool'
import { setLang, useLang, useT } from '../shared/i18n/i18n'
import { groupKey, toolTitleKey } from '../shared/i18n/messages'
import { setTheme, useTheme } from '../shared/theme/theme'
import { Icon } from '../shared/ui/Icon'
import styles from './AppShell.module.css'
import { Link } from './Link'
import type { Route } from './router'
import { preloadTool } from './tool-loader'
import { toolById } from './tools'

const GROUP_ORDER: readonly ToolGroup[] = ['video', 'image', 'some', 'tools']

interface AppShellProps {
  route: Route
  me: Me | null
  onSignOut: (() => void) | null
  children: ReactNode
}

export function AppShell({ route, me, onSignOut, children }: AppShellProps) {
  const t = useT()
  const lang = useLang()
  const theme = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const activeTool = route.name === 'tool' ? route.tool : null

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">{t('app.skipToContent')}</a>

      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
          <span className="visually-hidden">{menuOpen ? t('nav.collapse') : t('nav.expand')}</span>
        </button>
        <span className={styles.topbarTitle}>
          {activeTool ? t(toolTitleKey(activeTool)) : t('app.name')}
        </span>
      </header>

      <aside id="sidebar" className={styles.sidebar} data-open={menuOpen}>
        <Link to={{ name: 'hub' }} className={styles.brand} onClick={() => setMenuOpen(false)}>
          <img src="/images/logo-symbol.png" alt="" width={36} height={36} className={styles.logo} />
          <span>
            <strong>{t('app.name')}</strong>
            <small>{t('app.tagline')}</small>
          </span>
        </Link>

        <nav aria-label={t('nav.main')} className={styles.nav}>
          <Link
            to={{ name: 'hub' }}
            className={styles.navItem}
            aria-current={route.name === 'hub' ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="hub" />
            <span>{t('nav.dashboard')}</span>
          </Link>

          {GROUP_ORDER.map((group) => (
            <div key={group} className={styles.navGroup}>
              <p className={styles.navLabel}>{t(groupKey(group))}</p>
              {TOOL_IDS.filter((id) => toolById(id).group === group).map((id) => {
                const tool = toolById(id)
                return (
                  <Link
                    key={id}
                    to={{ name: 'tool', tool: id, query: {} }}
                    className={styles.navItem}
                    style={{ '--tool-color': `var(--tool-${id})` } as CSSProperties}
                    aria-current={activeTool === id ? 'page' : undefined}
                    onPointerEnter={() => preloadTool(tool)}
                    onFocus={() => preloadTool(tool)}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name={id} />
                    <span>{t(toolTitleKey(id))}</span>
                    {!tool.load && <span className={styles.legacyBadge}>{t('tool.notBuilt.badge')}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          {canAdmin(me) && (
            <a className={styles.navItem} href="/admin">
              <Icon name="shield" />
              <span>{t('nav.admin')}</span>
            </a>
          )}
          <div className={styles.prefs}>
            <button
              type="button"
              className={styles.pref}
              onClick={() => setLang(lang === 'no' ? 'en' : 'no')}
              aria-label={t('lang.label')}
            >
              <Icon name="globe" size={18} />
              <span>{lang === 'no' ? t('lang.no') : t('lang.en')}</span>
            </button>
            <button
              type="button"
              className={styles.pref}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={t('theme.toggle')}
            >
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
              <span>{theme === 'dark' ? t('theme.dark') : t('theme.light')}</span>
            </button>
          </div>
          {me && (
            <div className={styles.user}>
              <span className={styles.avatar} aria-hidden="true">{initials(me)}</span>
              <span className={styles.userText}>
                <strong>{displayName(me)}</strong>
                <small>{me.churches[0]?.name ?? me.email}</small>
              </span>
              {onSignOut && (
                <button type="button" className={styles.iconButton} onClick={onSignOut} title={t('auth.signOut')}>
                  <Icon name="logout" size={18} />
                  <span className="visually-hidden">{t('auth.signOut')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {menuOpen && <div className={styles.scrim} onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
        <footer className={styles.credit}>{t('footer.credit')}</footer>
      </main>
    </div>
  )
}
