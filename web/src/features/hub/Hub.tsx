import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from '../../app/Link'
import { preloadTool } from '../../app/tool-loader'
import { useServices } from '../../app/services'
import { toolById, type ToolModule } from '../../app/tools'
import { displayName, type Me } from '../../domain/account'
import type { ToolId } from '../../domain/tool'
import { useT } from '../../shared/i18n/i18n'
import { toolDescKey, toolTitleKey } from '../../shared/i18n/messages'
import { Icon } from '../../shared/ui/Icon'
import styles from './Hub.module.css'

/** Dashboardet (HUB-01–03). Samme inndeling som dagens forside: Video, Bilde, mappene SoMe og Tools. */
export function Hub({ me }: { me: Me | null }) {
  const t = useT()
  const { community } = useServices()
  const member = !!me && me.churches.length > 0
  const [collab, setCollab] = useState(false)

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

  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t('hub.title')}</p>
        <h1>{me ? t('hub.greeting', { name: displayName(me).split(' ')[0] ?? '' }) : t('hub.greetingAnon')}</h1>
      </header>

      <section aria-labelledby="hub-tools" className={styles.section}>
        <h2 id="hub-tools" className={styles.sectionTitle}>{t('hub.toolsHeading')}</h2>
        <div className={styles.grid}>
          <ToolCard tool={toolById('loop-studio')} label={t('group.video')} />
          <ToolCard tool={toolById('thumbnail-studio')} label={t('group.image')} />
          <FolderCard label={t('group.some')} title="SoMe" desc={t('folder.some.desc')} tools={['motion-design', 'photo-design']} />
          <FolderCard label={t('group.tools')} title="Tools" desc={t('folder.tools.desc')} tools={['isolate-subject', 'mockups']} />
        </div>
      </section>

      {member && (
        <section aria-labelledby="hub-folders" className={styles.section}>
          <h2 id="hub-folders" className={styles.sectionTitle}>{t('hub.foldersHeading')}</h2>
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
        </section>
      )}
    </div>
  )
}

function ToolCard({ tool, label }: { tool: ToolModule; label: string }) {
  const t = useT()
  return (
    <Link
      to={{ name: 'tool', tool: tool.id, query: {} }}
      className={styles.card}
      style={{ '--tool-color': `var(--tool-${tool.id})` } as CSSProperties}
      onPointerEnter={() => preloadTool(tool)}
      onFocus={() => preloadTool(tool)}
    >
      <span className={styles.cardIcon}><Icon name={tool.id} size={24} /></span>
      <span className={styles.cardLabel}>{label}</span>
      <strong className={styles.cardTitle}>{t(toolTitleKey(tool.id))}</strong>
      <span className={styles.cardDesc}>{t(toolDescKey(tool.id))}</span>
      <span className={styles.cardFooter}>
        {!tool.load && <span className={styles.badge}>{t('tool.notBuilt.badge')}</span>}
        <span className={styles.open}>{t('tool.open')} →</span>
      </span>
    </Link>
  )
}

function FolderCard({ label, title, desc, tools }: { label: string; title: string; desc: string; tools: ToolId[] }) {
  const t = useT()
  return (
    <div className={`${styles.card} ${styles.folderCard}`}>
      <span className={styles.cardIcon}><Icon name="folder" size={24} /></span>
      <span className={styles.cardLabel}>{label} · {t('folder.count', { count: tools.length })}</span>
      <strong className={styles.cardTitle}>{title}</strong>
      <span className={styles.cardDesc}>{desc}</span>
      <ul className={styles.subTools}>
        {tools.map((id) => {
          const tool = toolById(id)
          return (
            <li key={id}>
              <Link
                to={{ name: 'tool', tool: id, query: {} }}
                className={styles.subTool}
                style={{ '--tool-color': `var(--tool-${id})` } as CSSProperties}
                onPointerEnter={() => preloadTool(tool)}
                onFocus={() => preloadTool(tool)}
              >
                <Icon name={id} size={18} />
                <span>{t(toolTitleKey(id))}</span>
                {!tool.load && <span className={styles.badge}>{t('tool.notBuilt.badge')}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
