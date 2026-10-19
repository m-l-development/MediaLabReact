import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { DEFAULT_QUOTA_MB, type StorageUsage } from '../../services/admin'
import { activeMembers, linkName, memberName, otherChurches, type Group } from '../../services/collab'
import type { CloudFile, CloudFolder } from '../../services/files'
import { zipParts } from '../../shared/lib/zip'
import { useAdmin } from './context'
import { errText, fmtDate, go, mb } from './lib'
import { fill } from './members'
import { downloadOriginal, peekThumb, saveBlob, thumbUrl } from './thumbs'
import { Badge, Btn, Card, Dialog, Empty, Field } from './ui'

/**
 * Filer (ADM-07), portert fra dagens folders.jsx: Fellesmappe (mappen 'bilder'), Samarbeidsmappe (én per aktiv
 * samarbeidsgruppe) og Faste (faste, logoer, bakgrunner, mockups). Forhåndsvisning, flervalg, «Last ned» (flere som ZIP),
 * «Eksporter» (hele mappen som ZIP) og «Slett» med bekreftelse. Grensesnittet skjuler bare knapper; databasen (RLS og
 * funksjoner) og serveren avgjør alt. Video kan aldri lastes opp. Mappenavnene i databasen er uendret.
 */
type AreaKey = 'delt' | 'samarbeid' | 'faste'
const AREAS: Record<AreaKey, { key: string; label: string; folders: [string, string][]; info: string }> = {
  delt: { key: 'felles', label: 'Fellesmappe', folders: [['bilder', 'Fellesmappe']],
    info: 'Bilder som deles i menigheten. Alle medlemmer kan se, laste ned og laste opp. Du kan slette dine egne; Admin kan rydde i alt.' },
  samarbeid: { key: 'samarbeid', label: 'Samarbeidsmappe', folders: [['samarbeid', 'Samarbeidsmappe']],
    info: 'Bilder som deles med menighetene i samarbeidsgruppen. Alle menighetene i gruppen kan se, laste ned og laste opp. Du kan også dele en kopi fra Fellesmappe eller Faste – originalen blir liggende. Du kan slette bilder du selv har lastet opp hit; Admin kan slette alt menigheten har bidratt med.' },
  faste: { key: 'faste', label: 'Faste – felles ressurser', folders: [['faste', 'Faste bilder'], ['logoer', 'Logoer'], ['bakgrunner', 'Bakgrunner'], ['mockups', 'Mockups']],
    info: 'Felles bilder og logoer som brukes i flere verktøy (Photo Design, Thumbnail Studio, Mockups m.fl.). Admin legger til, organiserer og fjerner. Alle medlemmer kan se og laste ned.' },
}
/** Adressene: #/filer/felles, #/filer/samarbeid, #/filer/faste */
const URL_AREA: Record<string, AreaKey> = { felles: 'delt', samarbeid: 'samarbeid', faste: 'faste' }
const FOLDER_NAME: Record<string, string> = { bilder: 'Fellesmappe', faste: 'Faste bilder', logoer: 'Logoer', bakgrunner: 'Bakgrunner', mockups: 'Mockups' }
const MAX_ZIP_BYTES = 500 * 1048576
const today = () => new Date().toISOString().slice(0, 10)

const FOLDER_PATH = 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z'
export function FolderIcon({ kind, size = 18 }: { kind: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={FOLDER_PATH} />
      {kind === 'samarbeid' && <><circle cx="9.6" cy="12.6" r="1.7" /><circle cx="14.4" cy="12.6" r="1.7" /><path d="M7 17.2c.5-1.2 1.4-1.8 2.6-1.8s2.1.6 2.4 1.4c.3-.8 1.2-1.4 2.4-1.4s2.1.6 2.6 1.8" /></>}
      {kind === 'faste' && <path d="M12 10.5v6M9.5 13.5h5" />}
    </svg>
  )
}

/** Aktive samarbeidsgrupper der en av brukerens menigheter (eller den gitte menigheten) er aktivt medlem. */
const activeGroupsFor = (list: Group[], churchId?: string) => list.filter((l) => l.status === 'active' && (churchId ? activeMembers(l).some((m) => m.church_id === churchId) : !!l.my_church))

/** Snarveier til mappene (oversikten). Samarbeidsmappe vises bare når menigheten er med i en aktiv samarbeidsgruppe. */
export function FolderButtons() {
  const { me, collabSvc, t } = useAdmin()
  const [groups, setGroups] = useState<Group[] | null>(null)
  useEffect(() => {
    let live = true
    collabSvc.links.mine().then((l) => { if (live) setGroups(activeGroupsFor(l)) }, () => { if (live) setGroups([]) })
    return () => { live = false }
  }, [collabSvc])
  if (!me.churches.length) return null
  return (
    <div className="ch-folder-buttons" data-ch-folder-buttons="">
      <a className="ch-folder-btn felles" href="#/filer/felles" data-ch-folder="felles"><FolderIcon kind="delt" size={22} /><span><b>{t('Fellesmappe')}</b><small>{t('Bilder som deles i menigheten')}</small></span></a>
      {groups && groups.length > 0 && (
        <a className="ch-folder-btn samarbeid" href="#/filer/samarbeid" data-ch-folder="samarbeid"><FolderIcon kind="samarbeid" size={22} /><span><b>{t('Samarbeidsmappe')}</b><small>{groups.length === 1 && groups[0] ? linkName(groups[0]) : fill(t('{n} samarbeidsgrupper'), { n: groups.length })}</small></span></a>
      )}
    </div>
  )
}

function Thumb({ id }: { id: string }) {
  const { files } = useAdmin()
  const ref = useRef<HTMLDivElement>(null)
  const [u, setU] = useState(() => peekThumb(id))
  useEffect(() => {
    if (u) return undefined
    let live = true
    const load = () => void thumbUrl(files, id).then((x) => { if (live && x) setU(x) })
    if (typeof IntersectionObserver !== 'function' || !ref.current) { load(); return () => { live = false } }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load() } }, { rootMargin: '400px' })
    io.observe(ref.current)
    return () => { live = false; io.disconnect() }
  }, [files, id, u])
  return <div ref={ref} className="ch-img" style={{ backgroundImage: u ? 'url(' + u + ')' : 'none' }} />
}

/** Forhåndsvisning av originalen, med forrige/neste, Last ned og Slett. Esc lukker, piltastene blar. */
function Preview({ list, id, onId, onClose, info, canDel, onDownload, onDelete }: { list: CloudFile[]; id: string; onId: (id: string) => void; onClose: () => void; info: (x: CloudFile) => string; canDel: (x: CloudFile) => boolean; onDownload: (x: CloudFile) => void; onDelete: (x: CloudFile[]) => void }) {
  const { files, t } = useAdmin()
  const i = list.findIndex((x) => x.id === id), x = list[i]
  const [loaded, setLoaded] = useState<{ id: string; src: string | null; err: boolean }>({ id, src: null, err: false })
  const xid = x?.id
  useEffect(() => {
    if (!xid) return undefined
    let live = true, u: string | null = null
    files.urls([xid]).then(async (urls) => {
      const url = urls[xid]
      if (!url) throw new Error('not_found')
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (!r.ok) throw new Error('http')
      u = URL.createObjectURL(await r.blob())
      if (live) setLoaded({ id: xid, src: u, err: false })
      else URL.revokeObjectURL(u)
    }).catch(() => { if (live) setLoaded({ id: xid, src: null, err: true }) })
    return () => { live = false; if (u) { const v = u; setTimeout(() => URL.revokeObjectURL(v), 1000) } }
  }, [files, xid])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && i > 0) onId(list[i - 1]?.id ?? id)
      else if (e.key === 'ArrowRight' && i < list.length - 1) onId(list[i + 1]?.id ?? id)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [i, list, id, onClose, onId])
  if (!x) return null
  const src = loaded.id === x.id ? loaded.src ?? peekThumb(x.id) : peekThumb(x.id), err = loaded.id === x.id && loaded.err
  return (
    <div className="ch-overlay center ch-lightbox" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} data-ch-preview="">
      <div className="ch-lightbox-box" role="dialog" aria-modal="true" aria-label={t('Forhåndsvisning') + ': ' + x.file_name}>
        <header><b style={{ wordBreak: 'break-all' }}>{x.file_name}</b><span className="ch-muted">{i + 1} / {list.length}</span><button type="button" className="ch-x" onClick={onClose} aria-label={t('Lukk')}>✕</button></header>
        <div className="ch-lightbox-img">
          {i > 0 && <button type="button" className="ch-lightbox-nav prev" onClick={() => onId(list[i - 1]?.id ?? id)} aria-label={t('Forrige')}>‹</button>}
          {src ? <img src={src} alt={x.file_name} /> : <span className="ch-muted">{t(err ? 'Bildet kunne ikke vises. Prøv å laste det ned.' : 'Laster …')}</span>}
          {i < list.length - 1 && <button type="button" className="ch-lightbox-nav next" onClick={() => onId(list[i + 1]?.id ?? id)} aria-label={t('Neste')}>›</button>}
        </div>
        <footer><span className="ch-muted">{info(x)}</span>
          <span className="ch-row"><Btn small kind="primary" onClick={() => onDownload(x)}>{t('Last ned')}</Btn>{canDel(x) && <Btn small kind="danger" onClick={() => onDelete([x])}>{t('Slett')}</Btn>}</span></footer>
      </div>
    </div>
  )
}

/** Sist viste liste per menighet og mappe (resten av besøket): bytte fram og tilbake viser lista med en gang. */
const FILE_LISTS = new Map<string, CloudFile[]>()
interface FolderState { area: AreaKey; folder: string; list: CloudFile[]; loading: boolean; usage: StorageUsage | null; over: boolean; links: Group[]; linksReady: boolean; link: string | null; copy: { file: CloudFile; link: string } | null }

/** Brukes med key={churchId}, så tilstanden nullstilles når menigheten byttes. */
export function FilesView({ churchId, area: routeArea }: { churchId: string; area?: string | undefined }) {
  const { me, adminOf, churchName, userById, act, admin, files: FS, collabSvc, t } = useAdmin()
  const member = me.churches.some((c) => c.id === churchId) || adminOf.includes(churchId)
  const isAdmin = adminOf.includes(churchId) // Faste og sletting av alt menigheten har bidratt med i Samarbeidsmappen
  const routed = routeArea !== undefined // i Filer-seksjonen styrer adressen fanen; i menighetsdetaljene en lokal fane
  const want: AreaKey = URL_AREA[routeArea ?? ''] ?? 'delt'
  const [fl, setFl] = useState<FolderState>({ area: want, folder: AREAS[want].folders[0]?.[0] ?? 'bilder', list: [], loading: true, usage: null, over: false, links: [], linksReady: false, link: null, copy: null })
  const [sel, setSel] = useState<Set<string>>(() => new Set())
  const [pv, setPv] = useState<string | null>(null)
  const [ask, setAsk] = useState<{ items: CloudFile[]; skip: number } | null>(null)
  const [job, setJob] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const seq = useRef(0), linksRef = useRef<Group[]>([]), msgTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tell = (text: string, ok = true) => { setMsg({ text, ok }); clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(null), ok ? 6000 : 12000) }

  /** Viser valgt mappe straks (fra hurtigbufferen); lista og forbruket hentes parallelt. Bare siste valg vinner. */
  const load = async (folder = fl.folder, area: AreaKey = fl.area, { usage = false, link = fl.link }: { usage?: boolean; link?: string | null } = {}) => {
    const n = ++seq.current, key = churchId + '|' + folder + (folder === 'samarbeid' ? '|' + String(link) : ''), hit = FILE_LISTS.get(key)
    setFl((f) => ({ ...f, area, folder, link, list: hit ?? [], loading: !hit }))
    const [list, use] = await Promise.all([folder === 'samarbeid' ? (link ? FS.listLink(link) : []) : FS.list(folder as CloudFolder, churchId), usage ? admin.storageUsage(churchId) : null])
    FILE_LISTS.set(key, list)
    if (n === seq.current) setFl((f) => ({ ...f, list, loading: false, usage: use ?? f.usage }))
  }
  const openArea = (area: AreaKey, { usage = false } = {}) => {
    const links = linksRef.current, link = area === 'samarbeid' ? (links.some((l) => l.id === fl.link) ? fl.link : links[0]?.id ?? null) : fl.link
    setSel(new Set())
    setPv(null)
    return load(AREAS[area].folders[0]?.[0], area, { usage, link })
  }
  const loadLinks = async () => {
    const links = activeGroupsFor(await collabSvc.links.mine().catch(() => []), churchId)
    linksRef.current = links
    setFl((f) => ({ ...f, links, linksReady: true, link: f.link && links.some((l) => l.id === f.link) ? f.link : links[0]?.id ?? null }))
    return links
  }
  const first = useEffectEvent(() => {
    if (!member) return
    void act(async () => { const links = await loadLinks(); await load(AREAS[want].folders[0]?.[0], want, { usage: true, link: links[0]?.id ?? null }) })()
  })
  useEffect(() => { first() }, [])
  /** Ny adresse (fane, snarvei fra oversikten eller forsiden) → åpne mappen. */
  const onRoute = useEffectEvent((area: AreaKey) => { if (routed && fl.linksReady && area !== fl.area) void act(() => openArea(area))() })
  useEffect(() => { onRoute(want) }, [want])
  if (!member) return <Card title="Filer"><p className="ch-note warn">{t('Du er ikke medlem av denne menigheten. Filer vises bare for medlemmer – også for Developer og Moderator.')}</p></Card>

  const A = AREAS[fl.area], collab = fl.area === 'samarbeid'
  const curLink = fl.links.find((l) => l.id === fl.link)
  const others = (l: Group | undefined) => (l ? otherChurches(l, churchId) : [])
  const othersText = (l: Group | undefined) => others(l).map((m) => m.name).join(', ') || t('(ingen andre menigheter)')
  const noGroup = collab && fl.linksReady && !curLink
  const canUpload = collab ? !!curLink : fl.area === 'delt' || isAdmin
  const mine = (x: CloudFile) => x.uploaded_by === me.id
  const canDel = (x: CloudFile) => (collab ? x.church_id === churchId && (isAdmin || (!!x.link_upload && mine(x))) : isAdmin || (fl.area === 'delt' && mine(x)))
  // kopi til Samarbeidsmappen: Fellesmappe for alle medlemmer, Faste bare for Admin, aldri private filer
  const canCopy = (x: CloudFile) => fl.links.length > 0 && !collab && x.visibility === 'church' && (fl.area === 'delt' || isAdmin)
  const fromName = (x: CloudFile) => (x.church_id === churchId ? churchName(churchId) : memberName(curLink ?? null, x.church_id))
  const who = (x: CloudFile) => { const u = x.uploaded_by ? userById(x.uploaded_by) : undefined; return u ? u.full_name || u.email : null }
  const info = (x: CloudFile) => [mb(x.file_size), fmtDate(x.created_at), collab ? t('Fra') + ' ' + fromName(x) + (x.link_upload ? '' : ' (' + t('kopi') + ')') : who(x), x.visibility === 'private' ? t('Privat') : null].filter(Boolean).join(' · ')
  // i Samarbeidsmappen bare filer fra menighetene som er med i gruppen nå (databasen skjuler resten)
  const sections: [string, CloudFile[], string][] = collab
    ? (curLink ? [['oss', fl.list.filter((x) => x.church_id === churchId), t('Fra oss') + ' (' + churchName(churchId) + ')'], ...others(curLink).map((m): [string, CloudFile[], string] => [m.church_id, fl.list.filter((x) => x.church_id === m.church_id), t('Fra') + ' ' + m.name])] : [])
    : [['alle', fl.list, t(A.folders.find((x) => x[0] === fl.folder)?.[1] ?? '')]]
  const shown = sections.flatMap((s) => s[1])
  const selected = shown.filter((x) => sel.has(x.id))
  const clearCache = () => { for (const k of [...FILE_LISTS.keys()]) if (k.startsWith(churchId + '|')) FILE_LISTS.delete(k) }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = shown.length > 0 && shown.every((x) => sel.has(x.id))
  const folderLabel = collab ? t('Samarbeidsmappe') + (curLink ? ' – ' + linkName(curLink) : '') : t(A.folders.find((x) => x[0] === fl.folder)?.[1] ?? A.label)

  const upload = async (list: File[]) => {
    if (!canUpload || !list.length) return
    let n = 0
    const bad: string[] = []
    for (const [i, file] of list.entries()) {
      setJob(fill(t('Laster opp {i} av {n} …'), { i: i + 1, n: list.length }))
      try {
        if (collab && fl.link) await FS.uploadToLink(file, { linkId: fl.link, churchId })
        else await FS.upload(file, { churchId, folder: fl.folder as CloudFolder }) // ingen «Privat (bare meg)» i Fellesmappe og Faste
        n++
      } catch (err) {
        bad.push(file.name + ': ' + errText(err, t))
      }
    }
    setJob(null)
    if (bad.length) tell((n ? fill(t('{n} av {total} filer er lastet opp.'), { n, total: list.length }) + ' ' : t('Ingen filer ble lastet opp.') + ' ') + bad.join(' · '), false)
    else tell(fill(t('{n} filer er lastet opp til {folder}.'), { n, folder: folderLabel }))
    clearCache()
    await load(undefined, undefined, { usage: true }).catch(() => undefined)
  }
  const downloadOne = async (x: CloudFile) => {
    try {
      setJob(t('Laster ned …'))
      await downloadOriginal(FS, x.id, x.file_name)
      tell(fill(t('«{name}» er lastet ned.'), { name: x.file_name }))
    } catch (e) {
      tell(t('Filen kunne ikke lastes ned.') + ' ' + errText(e, t), false)
    } finally {
      setJob(null)
    }
  }
  /** Henter originalene (lenker i bunker på 100, fire nedlastinger om gangen) og pakker dem i én ZIP. */
  const zipDownload = async (items: CloudFile[], zipName: string, onStep: (i: number, n: number) => void) => {
    const out: ({ name: string; data: Uint8Array; date?: Date | undefined } | undefined)[] = new Array(items.length), failed: string[] = []
    let doneN = 0
    for (let i = 0; i < items.length; i += 100) {
      const part = items.slice(i, i + 100), urls = await FS.urls(part.map((x) => x.id))
      let next = 0
      const worker = async () => {
        while (next < part.length) {
          const j = next++, x = part[j]
          if (!x) continue
          try {
            const u = urls[x.id]
            if (!u) throw new Error('not_found')
            const r = await fetch(u, { signal: AbortSignal.timeout(60000) })
            if (!r.ok) throw new Error('http')
            out[i + j] = { name: x.file_name, data: new Uint8Array(await r.arrayBuffer()), date: x.created_at ? new Date(x.created_at) : undefined }
          } catch {
            failed.push(x.file_name)
          }
          onStep(++doneN, items.length)
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()])
    }
    const got = out.filter((x): x is NonNullable<typeof x> => !!x)
    if (got.length) saveBlob(new Blob(zipParts(got) as BlobPart[], { type: 'application/zip' }), zipName.replace(/[\\/:*?"<>|]/g, '_') + '.zip')
    return { ok: got.length, failed }
  }
  /** Flere filer → én ZIP. «Eksporter» = alt som vises i mappen. */
  const downloadMany = async (items: CloudFile[], zipName: string) => {
    if (!items.length) return
    if (items.length === 1 && items[0]) { await downloadOne(items[0]); return }
    const bytes = items.reduce((s, x) => s + Number(x.file_size || 0), 0)
    if (bytes > MAX_ZIP_BYTES) { tell(fill(t('Utvalget er for stort til én ZIP-fil ({size}, høyst 500 MB). Velg færre filer.'), { size: mb(bytes) }), false); return }
    try {
      setJob(fill(t('Pakker 0 av {n} filer …'), { n: items.length }))
      const r = await zipDownload(items, zipName, (i, n) => setJob(fill(t('Pakker {i} av {n} filer …'), { i, n })))
      if (!r.ok) tell(t('Ingen av filene kunne lastes ned. Prøv igjen.'), false)
      else if (r.failed.length) tell(fill(t('{n} filer er lastet ned som ZIP. Disse kunne ikke hentes: {names}'), { n: r.ok, names: r.failed.join(', ') }), false)
      else tell(fill(t('{n} filer er lastet ned som ZIP.'), { n: r.ok }))
    } catch (e) {
      tell(t('ZIP-filen kunne ikke lages.') + ' ' + errText(e, t), false)
    } finally {
      setJob(null)
    }
  }
  const zipBase = () => (collab ? t('Samarbeidsmappe') + ' – ' + (curLink ? linkName(curLink) : '') : folderLabel + ' – ' + churchName(churchId)) + ' – ' + today()
  /** Sletting: bare filene brukeren har lov til å slette; alltid bekreftelse først. */
  const askDelete = (items: CloudFile[]) => {
    const ok = items.filter(canDel), skip = items.length - ok.length
    if (!ok.length) { tell(t('Du har ikke tilgang til å slette de valgte filene.'), false); return }
    setAsk({ items: ok, skip })
  }
  const doDelete = async () => {
    if (!ask) return
    const { items } = ask, gone = new Set<string>(), bad: string[] = []
    for (const [i, x] of items.entries()) {
      setJob(fill(t('Sletter {i} av {n} …'), { i: i + 1, n: items.length }))
      try { await FS.remove(x.id); gone.add(x.id) } catch (e) { bad.push(x.file_name + ': ' + errText(e, t)) }
    }
    const n = gone.size
    setJob(null); setAsk(null); setPv(null)
    setSel((s) => new Set([...s].filter((id) => !gone.has(id))))
    setFl((f) => ({ ...f, list: f.list.filter((y) => !gone.has(y.id)) }))
    if (bad.length) tell((n ? fill(t('{n} filer er slettet.'), { n }) + ' ' : '') + t('Kunne ikke slette') + ': ' + bad.join(' · '), false)
    else tell(n === 1 && items[0] ? fill(t('«{name}» er slettet.'), { name: items[0].file_name }) : fill(t('{n} filer er slettet.'), { n }))
    clearCache()
    await load(undefined, undefined, { usage: true }).catch(() => undefined)
  }
  const doCopy = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      if (!fl.copy) return
      const { file, link } = fl.copy, l = fl.links.find((x) => x.id === link)
      await FS.copyToLink(file.id, link)
      clearCache()
      setFl((f) => ({ ...f, copy: null }))
      tell(fill(t('En kopi er lagt i Samarbeidsmappen i gruppen «{name}».'), { name: linkName(l ?? null) }))
      await load(undefined, undefined, { usage: true })
    })()
  }

  const u = fl.usage, pct = u && u.quota_bytes ? Math.min(100, Math.round((100 * u.used_bytes) / u.quota_bytes)) : 0
  // ledig plass er det minste av menighetens ledige kvote og ledig samlet plass i ConnectHub
  const quotaFree = u ? Math.max(0, u.quota_bytes - u.used_bytes) : 0, sysFree = u?.system_free_bytes ?? Infinity
  const free = Math.min(quotaFree, sysFree), bySystem = sysFree < quotaFree
  const myPrivate = u as (StorageUsage & { my_private_bytes?: number; my_private_quota_bytes?: number }) | null
  const areas = (Object.entries(AREAS) as [AreaKey, (typeof AREAS)[AreaKey]][]).filter(([k]) => k !== 'samarbeid' || fl.links.length)
  const pick = (k: AreaKey) => { if (routed) go('filer', AREAS[k].key); else if (fl.area !== k) void act(() => openArea(k))() }
  const busy = !!job

  const tile = (x: CloudFile) => {
    const on = sel.has(x.id)
    return (
      <div key={x.id} className={'ch-thumb ch-file' + (on ? ' sel' : '')} data-ch-file={x.file_name}>
        <label className="ch-file-check" title={t('Velg')}><input type="checkbox" checked={on} onChange={() => toggle(x.id)} aria-label={fill(t('Velg «{name}»'), { name: x.file_name })} /></label>
        <button type="button" className="ch-file-open" onClick={() => setPv(x.id)} aria-label={fill(t('Forhåndsvis «{name}»'), { name: x.file_name })}><Thumb id={x.id} /></button>
        <span className="ch-file-name">{x.file_name} {x.visibility === 'private' && <Badge>{t('Privat')}</Badge>}</span>
        <span className="ch-muted">{info(x)}</span>
        <div className="ch-row">
          <Btn small onClick={() => downloadOne(x)} disabled={busy}>{t('Last ned')}</Btn>
          {canCopy(x) && <Btn small onClick={() => setFl((f) => ({ ...f, copy: { file: x, link: f.link ?? f.links[0]?.id ?? '' } }))}>{t('Del i Samarbeidsmappe')}</Btn>}
          {canDel(x) && <Btn small kind="danger" onClick={() => askDelete([x])} disabled={busy}>{t('Slett')}</Btn>}
        </div>
      </div>
    )
  }
  const empty = () => (collab ? t('Samarbeidsmappen er tom.') + ' ' + t('Last opp bilder, eller del en kopi fra Fellesmappe.')
    : fl.area === 'delt' ? t('Fellesmappen er tom.') + ' ' + t('Last opp de første bildene med «Last opp», eller dra dem hit.')
      : t(canUpload ? 'Ingen filer i denne mappen ennå. Last opp med «Last opp».' : 'Ingen filer i denne mappen ennå.'))
  const copyLink = fl.copy ? fl.links.find((l) => l.id === fl.copy?.link) : undefined

  return (
    <div className={'ch-area ch-area-' + A.key} data-ch-area={A.key}>
      <nav className="ch-tabs ch-folder-tabs" aria-label={t('Mapper')}>
        {areas.map(([k, v]) => (
          <a key={k} href={routed ? '#/filer/' + v.key : '#'} className={'tab-' + v.key + (fl.area === k ? ' on' : '')} aria-current={fl.area === k ? 'page' : undefined} onClick={(e) => { e.preventDefault(); pick(k) }}>
            <FolderIcon kind={k} size={16} /> {t(v.label)}
          </a>
        ))}
      </nav>
      {noGroup ? <Card><Empty><span data-ch-nogroup="">{t('Menigheten er ikke med i noen aktiv samarbeidsgruppe nå. Samarbeidsmappen vises når menigheten blir med i en gruppe, og forsvinner når gruppen avsluttes eller menigheten fjernes.')}</span></Empty></Card> : (
        <>
          <section className="ch-card ch-folder-card">
            <div className="ch-folder-head"><span className="ch-folder-icon"><FolderIcon kind={fl.area} size={26} /></span>
              <div><h2>{t(A.label)}{fl.area === 'faste' && <small>{t(isAdmin ? 'Du kan vedlikeholde' : 'Bare visning og nedlasting')}</small>}</h2>
                <p className="ch-muted">{collab && curLink ? <span data-ch-link="">{t('Samarbeidsgruppe')} <b>{linkName(curLink)}</b>{curLink.description ? ' – ' + curLink.description : ''}. {t('Menigheter i gruppen')}: <b>{churchName(churchId)}</b>, {othersText(curLink)}.</span> : t(A.info)}</p></div></div>
            {collab && <p className="ch-muted">{t(A.info)} {t('Filene teller i kvoten til menigheten som bidro.')}</p>}
            {A.folders.length > 1 && <div className="ch-row">{A.folders.map(([f, l]) => <Btn key={f} small kind={fl.folder === f ? 'primary' : ''} onClick={() => { if (fl.folder !== f) { setSel(new Set()); void act(() => load(f))() } }}>{t(l)}</Btn>)}</div>}
            {collab && fl.links.length > 1 && <div className="ch-row" data-ch-groups="">{fl.links.map((l) => <Btn key={l.id} small kind={fl.link === l.id ? 'primary' : ''} onClick={() => { if (fl.link !== l.id) { setSel(new Set()); void act(() => load('samarbeid', 'samarbeid', { link: l.id }))() } }}>{linkName(l)}</Btn>)}</div>}
            {u && (
              <>
                <div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
                <p className="ch-muted" data-ch-meter="">{t('Brukt')}: {mb(u.used_bytes)} {t('av')} {mb(u.quota_bytes)} ({t(u.quota_bytes === DEFAULT_QUOTA_MB * 1048576 ? 'standard' : 'egen kvote')}) · {t('Ledig')}: {mb(free)}{bySystem ? ' (' + t('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}{fl.area === 'delt' && (myPrivate?.my_private_bytes ?? 0) > 0 ? ' · ' + t('Dine private') + ': ' + mb(myPrivate?.my_private_bytes) + ' / ' + mb(myPrivate?.my_private_quota_bytes) : ''}</p>
              </>
            )}
            {u && sysFree === 0 && <p className="ch-note warn" data-ch-full="">{t('Den samlede lagringsplassen i ConnectHub er full. Nye opplastinger er stoppet til det er frigjort plass. Nedlasting virker som før.')}</p>}
            {canUpload ? (
              <div className={'ch-drop' + (fl.over ? ' over' : '')} data-ch-drop="" onDragOver={(e) => { e.preventDefault(); if (!fl.over) setFl((f) => ({ ...f, over: true })) }} onDragLeave={() => setFl((f) => ({ ...f, over: false }))}
                onDrop={(e) => { e.preventDefault(); setFl((f) => ({ ...f, over: false })); if (!busy) void upload([...e.dataTransfer.files]) }}>
                <div className="ch-row" style={{ justifyContent: 'center' }}>
                  <label className={'ch-btn primary' + (busy ? ' busy' : '')} data-ch-upload="">{t('Last opp')}<input type="file" multiple disabled={busy} accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => { const l = [...(e.target.files ?? [])]; e.target.value = ''; void upload(l) }} /></label>
                </div>
                <p className="ch-muted" style={{ marginTop: 8 }}>{t('…eller dra bildene hit')} → {folderLabel}. {t('Bare bilder (PNG, JPG, WebP eller GIF), høyst 30 MB (logoer 10 MB). Video kan aldri lastes opp.')}</p>
              </div>
            ) : fl.area === 'faste' && <p className="ch-note warn">{t('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')}</p>}
          </section>

          <div className="ch-folder-bar" data-ch-folder-bar="">
            <label className="ch-row ch-muted"><input type="checkbox" checked={allOn} disabled={!shown.length} onChange={() => setSel(allOn ? new Set() : new Set(shown.map((x) => x.id)))} /> {t('Velg alle')}</label>
            {selected.length > 0 && <span data-ch-selected=""><b>{selected.length}</b> {t('valgt')}</span>}
            <span className="ch-spacer" />
            {selected.length > 0 && (
              <>
                <Btn small kind="primary" onClick={() => downloadMany(selected, zipBase())} disabled={busy}>{t('Last ned')}{selected.length > 1 ? ' (ZIP)' : ''}</Btn>
                {selected.some(canDel) && <Btn small kind="danger" onClick={() => askDelete(selected)} disabled={busy}>{t('Slett')}</Btn>}
                <Btn small onClick={() => setSel(new Set())}>{t('Fjern valg')}</Btn>
              </>
            )}
            {shown.length > 0 && <Btn small onClick={() => downloadMany(shown, zipBase())} disabled={busy} title={t('Last ned alle filene i mappen som én ZIP-fil')}>{t('Eksporter')}</Btn>}
            {(job || msg) && <p className={'ch-folder-msg' + (job ? '' : msg?.ok ? ' ok' : ' bad')} role={job || msg?.ok ? 'status' : 'alert'} data-ch-folder-msg="">{job || msg?.text}</p>}
          </div>

          {sections.map(([k, list, title]) => (
            <Card key={k} title={title} sub={fl.loading ? null : list.length}>
              {list.length ? <div className="ch-thumbs">{list.map(tile)}</div>
                : <Empty><span data-ch-empty="">{fl.loading ? t('Laster …') : collab ? (k === 'oss' ? (shown.length ? t('Menigheten din har ikke lagt inn noe her ennå.') : empty()) : t('Ingen bilder herfra ennå.')) : empty()}</span></Empty>}
            </Card>
          ))}
        </>
      )}

      {pv && <Preview list={shown} id={pv} onId={setPv} onClose={() => setPv(null)} info={info} canDel={canDel} onDownload={(x) => void downloadOne(x)} onDelete={askDelete} />}
      {ask && (
        <Dialog title={t(ask.items.length === 1 ? 'Slette filen?' : 'Slette filene?')} onClose={() => { if (!busy) setAsk(null) }}>
          <div data-ch-confirm-delete="" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p>{ask.items.length === 1 && ask.items[0] ? fill(t('«{name}» slettes for godt.'), { name: ask.items[0].file_name }) : fill(t('{n} filer slettes for godt.'), { n: ask.items.length })} {t('Dette kan ikke angres.')}</p>
            {collab && <p className="ch-muted">{t('Filene forsvinner for alle menighetene i gruppen. Originaler i Fellesmappe eller Faste blir liggende.')}</p>}
            {ask.skip > 0 && <p className="ch-note warn">{fill(t('{n} av de valgte filene kan du ikke slette – de blir liggende.'), { n: ask.skip })}</p>}
            <div className="ch-row"><Btn kind="danger" onClick={doDelete} disabled={busy}>{t('Slett')}</Btn><Btn onClick={() => setAsk(null)} disabled={busy}>{t('Avbryt')}</Btn></div>
          </div>
        </Dialog>
      )}
      {fl.copy && (
        <Dialog title={t('Del i Samarbeidsmappe')} onClose={() => setFl((f) => ({ ...f, copy: null }))}>
          <form onSubmit={doCopy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ch-copy="">
            {fl.links.length > 1 && <Field label="Samarbeidsgruppe"><select className="ch-select" value={fl.copy.link} onChange={(e) => { const v = e.target.value; setFl((f) => ({ ...f, copy: f.copy && { ...f.copy, link: v } })) }}>{fl.links.map((l) => <option key={l.id} value={l.id}>{linkName(l)}</option>)}</select></Field>}
            <p>{t('En kopi av bildet')} «{fl.copy.file.file_name}» {t('legges i Samarbeidsmappen i gruppen')} <b>{linkName(copyLink ?? null)}</b> ({churchName(churchId)}, {othersText(copyLink)}). {t('Alle menighetene i gruppen kan se og laste den ned. Originalen blir liggende i')} «{t(FOLDER_NAME[fl.copy.file.folder] ?? 'Fellesmappe')}».</p>
            <div className="ch-row"><Btn kind="primary" type="submit">{t('Del kopi')}</Btn><Btn onClick={() => setFl((f) => ({ ...f, copy: null }))}>{t('Avbryt')}</Btn></div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
