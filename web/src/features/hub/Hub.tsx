import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from '../../app/Link'
import { useServices } from '../../app/services'
import { preloadTool } from '../../app/tool-loader'
import { toolById } from '../../app/tools'
import { displayName, type Me } from '../../domain/account'
import type { ToolId } from '../../domain/tool'
import { useT } from '../../shared/i18n/i18n'
import { cachedChurchLogo, churchLogo } from '../../shared/media/church-logo'
import { toolDescKey, toolTitleKey } from '../../shared/i18n/messages'
import { activeChurch } from '../../services/shared-setup'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import styles from './Hub.module.css'

type Folder = 'some' | 'tools' | null
/** Verktøyene i hver mappe (samme som kortene under). */
const FOLDER_TOOLS: Record<'some' | 'tools', ToolId[]> = { some: ['motion-design', 'photo-design'], tools: ['isolate-subject', 'mockups'] }

/** `#some` og `#tools` åpner mappene direkte, som på dagens forside (HUB-01). */
function readFolder(): Folder {
  const h = location.hash.replace('#', '')
  return h === 'some' || h === 'tools' ? h : null
}

/** Dashboardet (HUB-01–03), med samme oppsett og uttrykk som dagens forside. */
export function Hub({ me }: { me: Me | null }) {
  const t = useT()
  const { community, files } = useServices()
  const member = !!me && me.churches.length > 0
  // menigheten brukeren arbeider i (bare egne medlemskap finnes i whoami), med logoen hvis den er satt (TB-9AF961)
  const church = activeChurch(me)
  const logoId = church?.logo_file_id ?? null
  const [logo, setLogo] = useState<{ id: string; url: string } | null>(null)
  const uid = me?.id ?? ''
  useEffect(() => {
    if (!logoId || !uid || cachedChurchLogo(uid, logoId)) return
    let live = true
    // fra minnet eller brukerens lagrede, nedskalerte kopi; ellers hentes den én gang (shared/media/church-logo.ts).
    // data:-adresse, siden innholdsreglene ikke tillater lagringens adresser i <img>
    churchLogo(files, uid, logoId).then(
      (url) => { if (live && url) setLogo({ id: logoId, url }) },
      () => {
        // ingen logo ved feil; forbokstavene vises
      },
    )
    return () => {
      live = false
    }
  }, [files, logoId, uid])
  const logoUrl = (logo && logo.id === logoId ? logo.url : null) ?? (logoId && uid ? cachedChurchLogo(uid, logoId) : null)
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

  // verktøyene i en åpen mappe forhåndslastes (de er det neste brukeren trykker på)
  useEffect(() => {
    for (const id of folder ? FOLDER_TOOLS[folder] : []) preloadTool(toolById(id))
  }, [folder])

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
      {!folder && church && (
        <p className={styles.church} data-ch-hub-church={church.id}>
          {logoUrl
            ? <img className={styles.churchLogo} src={logoUrl} alt="" />
            : <span className={styles.churchInitials} aria-hidden="true">{church.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}</span>}
          <span>{church.name}</span>
        </p>
      )}

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

      {!folder && (
        <nav className={styles.folders} aria-label={t('hub.foldersHeading')}>
          <Link to={{ name: 'library' }} className={styles.folderLink} style={{ '--folder-color': '#f3f1ec' } as CSSProperties}>
            <Icon name="photo-design" size={18} /> {t('media.title')}
          </Link>
          {member && <a className={styles.folderLink} href="/fellesmappe" style={{ '--folder-color': '#e0a43a' } as CSSProperties}>
            <Icon name="folder" size={18} /> {t('nav.sharedFolder')}
          </a>}
          {member && collab && (
            <a className={styles.folderLink} href="/samarbeidsmappe" style={{ '--folder-color': '#3fb8a8' } as CSSProperties}>
              <Icon name="collab" size={18} /> {t('nav.collabFolder')}
            </a>
          )}
        </nav>
      )}

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
      // forhåndslasting: når pekeren kommer inn eller beveger seg over kortet (kortet kan dukke opp under en stillestående
      // peker når en mappe åpnes), ved trykk og ved fokus
      onPointerEnter={() => preloadTool(tool)}
      onPointerMove={() => preloadTool(tool)}
      onPointerDown={() => preloadTool(tool)}
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
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <Icon name="folder" size={18} />
      </span>
      <span className={styles.cardTitle} data-case={title === 'SoMe' ? 'keep' : undefined}>{title}</span>
      <span className={styles.desc}>{desc}</span>
      <span className={styles.footer}>
        <span className={styles.open}>{t('tool.open')}</span>
        <span className={styles.count}>{t('folder.count', { count })}</span>
      </span>
    </button>
  )
}
