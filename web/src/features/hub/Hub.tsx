import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from '../../app/Link'
import { useServices } from '../../app/services'
import { preloadTool } from '../../app/tool-loader'
import { toolById } from '../../app/tools'
import { displayName, type Me } from '../../domain/account'
import type { ToolId } from '../../domain/tool'
import { useT } from '../../shared/i18n/i18n'
import { toolDescKey, toolTitleKey } from '../../shared/i18n/messages'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import styles from './Hub.module.css'

type Folder = 'some' | 'tools' | null

/** `#some` og `#tools` åpner mappene direkte, som på dagens forside (HUB-01). */
function readFolder(): Folder {
  const h = location.hash.replace('#', '')
  return h === 'some' || h === 'tools' ? h : null
}

/** Dashboardet (HUB-01–03), med samme oppsett og uttrykk som dagens forside. */
export function Hub({ me, children }: { me: Me | null; children?: ReactNode }) {
  const t = useT()
  const { community } = useServices()
  const member = !!me && me.churches.length > 0
  const [collab, setCollab] = useState(false)
  const [folder, setFolderState] = useState<Folder>(readFolder)

  useEffect(() => {
    const onHash = () => setFolderState(readFolder())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!member) return
    let live = true
    community.hasActiveCollab().then(
      (v) => live && setCollab(v),
      () => {
        // snarveien vises ikke ved feil; tilgangen kontrolleres uansett av serveren
      },
    )
    return () => {
      live = false
    }
  }, [member, community])

  function openFolder(f: Folder) {
    // Mappen står i adressen, så tilbake-knappen i nettleseren lukker den.
    if (f) location.hash = f
    else history.back()
  }

  const firstName = me ? (displayName(me).split(' ')[0] ?? '') : ''

  return (
    <div className={styles.hub}>
      <h1 className={styles.title}>{folder === 'some' ? 'SoMe' : folder === 'tools' ? 'Tools' : t('app.name')}</h1>
      {!folder && me && <p className={styles.greeting}>{t('hub.greeting', { name: firstName })}</p>}

      {folder === null && (
        <div className={styles.grid}>
          <ToolCard id="loop-studio" label={t('group.video')} />
          <ToolCard id="thumbnail-studio" label={t('group.image')} />
          <FolderCard label={t('group.some')} title="SoMe" desc={t('folder.some.desc')} count={2} onOpen={() => openFolder('some')} />
          <FolderCard label={t('hub.folderLabel')} title="Tools" desc={t('folder.tools.desc')} count={2} onOpen={() => openFolder('tools')} />
        </div>
      )}

      {folder === 'some' && (
        <div className={styles.grid}>
          <ToolCard id="motion-design" label={t('group.video')} />
          <ToolCard id="photo-design" label={t('group.image')} />
        </div>
      )}

      {folder === 'tools' && (
        <div className={styles.grid}>
          <ToolCard id="isolate-subject" label={t('group.image')} />
          <ToolCard id="mockups" label={t('group.image')} />
        </div>
      )}

      {folder && (
        <Button className={styles.back} onClick={() => openFolder(null)}>
          <Icon name="back" size={16} /> {t('nav.back')}
        </Button>
      )}

      {!folder && member && (
        <nav className={styles.folders} aria-label={t('hub.foldersHeading')}>
          <a className={styles.folderLink} href="/fellesmappe" style={{ '--folder-color': '#e0a43a' } as CSSProperties}>
            <Icon name="folder" size={18} /> {t('nav.sharedFolder')}
          </a>
          {collab && (
            <a className={styles.folderLink} href="/samarbeidsmappe" style={{ '--folder-color': '#3fb8a8' } as CSSProperties}>
              <Icon name="collab" size={18} /> {t('nav.collabFolder')}
            </a>
          )}
        </nav>
      )}

      {!folder && children}
    </div>
  )
}

function ToolCard({ id, label }: { id: ToolId; label: string }) {
  const t = useT()
  const tool = toolById(id)
  return (
    <Link
      to={{ name: 'tool', tool: id, query: {} }}
      className={styles.card}
      onPointerEnter={() => preloadTool(tool)}
      onFocus={() => preloadTool(tool)}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.cardTitle}>{t(toolTitleKey(id))}</span>
      <span className={styles.desc}>{t(toolDescKey(id))}</span>
      <span className={styles.footer}>
        <span className={styles.open}>{t('tool.open')}</span>
        {!tool.load && <span className={styles.legacy}>{t('tool.notBuilt.badge')}</span>}
      </span>
    </Link>
  )
}

function FolderCard({ label, title, desc, count, onOpen }: { label: string; title: string; desc: string; count: number; onOpen: () => void }) {
  const t = useT()
  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <span className={styles.label}>{label}</span>
      <span className={styles.cardTitle}>{title}</span>
      <span className={styles.desc}>{desc}</span>
      <span className={styles.footer}>
        <span className={styles.open}>{t('tool.open')}</span>
        <span className={styles.count}>{t('folder.count', { count })}</span>
      </span>
    </button>
  )
}
