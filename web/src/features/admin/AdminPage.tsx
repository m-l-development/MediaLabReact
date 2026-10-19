import { Fragment, useCallback, useEffect, useEffectEvent, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useServices } from '../../app/services'
import { testRoleAllowed } from '../../app/test-role'
import { hasRole, isStaff, type Me } from '../../domain/account'
import { BUILD } from '../../infrastructure/build'
import { backend } from '../../infrastructure/config'
import type { AuditRow, Invitation } from '../../services/admin'
import { activeMembers, type Group } from '../../services/collab'
import { useLang } from '../../shared/i18n/i18n'
import { NAV, brandOf, isSection, sectionsFor, type Kind } from './access'
import { PendingAccessNotice } from './ChurchAccess'
import { ChurchLogo, Head } from './common'
import { MemberUsageNote } from './MemberLimit'
import { isFull, useMemberUsage } from './member-limit'
import { Ctx, useAdmin, type AdminCtx, type AdminData } from './context'
import { FolderButtons } from './Folders'
import { canJoinAnother, Cancelled, fill, mainRole, memberActions, nameError, roleBlocked, roleSummary, splitName, welcomeName, type MemberTarget } from './members'
import { trAdmin } from './texts'
import { actionName, errText, fmt, fmtDate, go, href, norm, ROLE, useHashRoute, useLogos } from './lib'
import { Avatar, Badge, Btn, Card, Dialog, Drawer, Empty, Field, List, RoleBadge, Search, Select, StatusBadge } from './ui'
import './admin.css'

declare const __CH_DEV_SITE__: string | null
/** ConnectHub Dev (utviklingsmiljøet): adressen legges inn ved bygging (env-guard DEV_SITE). */
const DEV_SITE = typeof __CH_DEV_SITE__ !== 'undefined' ? __CH_DEV_SITE__ : null
declare const __CH_PROD_SITE__: string | null
/** ConnectHub produksjon: adressen legges inn ved bygging (env-guard PROD_SITE). */
const PROD_SITE = typeof __CH_PROD_SITE__ !== 'undefined' ? __CH_PROD_SITE__ : null
const isProduction = () => backend?.target === 'production'
/** «Handling»: viser feil som melding (avbrutt av brukeren gir ingen), og teller pågående arbeid for fremdriftslinjen. */
function makeAct(say: (text: string, ok?: boolean, err?: unknown) => void, setPending: (f: (n: number) => number) => void): AdminCtx['act'] {
  return <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => async (...a: A): Promise<R | undefined> => {
    setPending((n) => n + 1)
    try {
      return await fn(...a)
    } catch (e) {
      if (!(e instanceof Cancelled)) say('', false, e)
      return undefined
    } finally {
      setPending((n) => n - 1)
    }
  }
}
const EMPTY: AdminData = { churches: [], users: [], memberships: [], roles: [], invites: [], status: null, pendingSubs: 0, loaded: false }

/**
 * ConnectHub Admin (ADM-*), portert fra media-lab/src/pages/connecthub-admin/AdminPage.jsx: ramme, navigasjon, Oversikt,
 * Brukere og «Ny invitasjon». Grensesnittet skjuler bare knapper; alle rettigheter håndheves av databasen (RLS og
 * funksjoner) og serveren. Seksjonene som ikke er flyttet ennå, sier det og lenker til dagens admin.
 */
export function AdminPage({ me, testRole, sections }: { me: Me; testRole: string | null; sections: Partial<Record<string, (p: { id?: string | undefined; sub?: string | undefined }) => ReactNode>> }) {
  const lang = useLang()
  const t = useCallback((s: string) => trAdmin(lang, s), [lang])
  const { admin, collab: collabSvc, files } = useServices()
  // Rettigheter, eksplisitt per rolle (speiler databasen): staff = Developer ELLER Moderator med MFA, dev = bare Developer.
  const dev = hasRole(me, 'developer') && me.mfa
  const collab = hasRole(me, 'moderator') && me.mfa
  const staff = dev || collab
  const staffNoMfa = isStaff(me) && !me.mfa
  const adminOf = me.roles.filter((r) => r.role === 'church_admin').map((r) => r.church_id).filter((x): x is NonNullable<typeof x> => !!x) as string[]
  const kind: Kind = dev ? 'developer' : collab ? 'moderator' : adminOf.length ? 'admin' : 'user'
  const allowed = sectionsFor({ dev, collab, adminOf, churches: me.churches })
  const route = useHashRoute()
  const [d, setD] = useState<AdminData>(EMPTY)
  // en feil lagres som feilen selv og oversettes når den vises (alltid på gjeldende språk)
  const [note, setNote] = useState<{ text: string; ok: boolean; err?: unknown } | null>(null)
  const [pending, setPending] = useState(0)
  const [invite, setInvite] = useState<{ church?: string | null } | null>(null)
  const [ctxChurch, setCtxChurch] = useState<string | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Stabile funksjoner (samme gjennom hele besøket), så visningenes effekter ikke kjøres på nytt ved hver tegning.
  const [say] = useState(() => (text: string, ok = true, err?: unknown) => {
    setNote({ text, ok, err })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), 6000)
  })
  const [act] = useState(() => makeAct(say, setPending))

  const adminKey = adminOf.join(',')
  const churchKey = me.churches.map((c) => c.id).join(',')
  const reload = async () => {
    const [churches, users, memberships, roles, invites, status, subs] = await Promise.all([
      admin.churches(), admin.users(), admin.allMemberships(), admin.allRoles(), admin.invitations(null),
      staff ? admin.systemStatus().catch(() => null) : null,
      staff ? collabSvc.subscriptions.requests(null).catch(() => []) : [],
    ])
    let v = { churches, users, memberships, roles, invites }
    // Testrolle (bare utvikling): grensesnittet viser bare det rollen ville sett. Serveren og RLS er uendret.
    if (testRole && !staff) {
      const mine = (adminKey || churchKey).split(',').filter(Boolean)
      const scope = new Set(mine), inScope = (id: string | null) => !!id && scope.has(id)
      const ms = memberships.filter((m) => inScope(m.church_id) && (adminKey || m.user_id === me.id))
      const people = new Set([me.id, ...ms.map((m) => m.user_id)])
      v = {
        churches: churches.filter((c) => inScope(c.id)), memberships: ms, users: users.filter((u) => people.has(u.id)),
        roles: roles.filter((r) => people.has(r.user_id) && (!r.church_id || inScope(r.church_id)) && (adminKey || r.user_id === me.id)),
        invites: adminKey ? invites.filter((i) => inScope(i.church_id)) : [],
      }
    }
    setD({ ...v, status, pendingSubs: subs.filter((s) => s.status === 'pending').length, loaded: true })
    const firstAdmin = v.churches.find((x) => adminKey.split(',').includes(x.id)) ?? v.churches[0]
    setCtxChurch((c) => (c && v.churches.some((x) => x.id === c) ? c : firstAdmin?.id ?? null))
  }
  // første innlasting (senere innlastinger skjer etter hver handling)
  const firstLoad = useEffectEvent(() => { void act(reload)() })
  useEffect(() => { firstLoad() }, [])

  const churchName = (id: string | null) => d.churches.find((c) => c.id === id)?.name ?? '–'
  const userById = (id: string) => d.users.find((u) => u.id === id)
  const userName = (id: string | null | undefined) => {
    const u = id ? userById(id) : undefined
    return u ? u.full_name || u.email : id ? t('Ukjent bruker') : t('System')
  }
  const canManage = (id: string) => staff || adminOf.includes(id)
  const [now] = useState(() => Date.now())
  const pendingInvites = d.invites.filter((i) => i.status === 'pending' && new Date(i.expires_at).getTime() > now)
  const nav = NAV.filter(([k]) => allowed.has(k))
  const ctx: AdminCtx = {
    me, kind, isUser: kind === 'user', staff, dev, collab, staffNoMfa, adminOf, allowed, d, reload, act, say, t,
    churchName, userById, userName, canManage, openInvite: (p) => setInvite(p ?? {}), ctxChurch, setCtxChurch,
    admin, collabSvc, files, testRole,
  }

  const [sec0 = 'oversikt', id, sub] = route
  const sec = isSection(sec0) ? sec0 : 'oversikt'
  let body: ReactNode
  if (!allowed.has(sec)) body = <Forbidden />
  else if (sec === 'brukere') body = <UsersView selected={id} />
  else if (sec === 'oversikt') body = kind === 'user' ? <UserOverview /> : <Overview pendingInvites={pendingInvites} />
  else {
    const view = sections[sec]
    body = view ? view({ id, sub }) : null
  }
  const counts: Partial<Record<string, number>> = { invitasjoner: allowed.has('invitasjoner') ? pendingInvites.length : 0, abonnement: d.pendingSubs }

  return (
    <Ctx value={ctx}>
      <div data-ml-theme="admin" data-ml-bg="static">
        <header className="ch-top" data-ml-bar="1">
          <a className="ch-back" href={import.meta.env.BASE_URL}>← Media Lab</a>
          <span className="ch-brand">{brandOf(kind)}</span>
          {!isProduction() && <span className="ch-env" data-ch-env="" title={t('Utviklingsmiljø – egen database og egne kontoer. Endringer her påvirker ikke produksjon.')}>{t('UTVIKLING')} · connecthub-dev</span>}
          <span className="ch-spacer" />
          {(staff || adminOf.length > 0) && <Btn kind="primary" small onClick={() => setInvite({ church: sec === 'menigheter' && id ? id : ctxChurch })}>+ {t('Ny invitasjon')}</Btn>}
          {pending > 0 && <span className="ch-progress" role="progressbar" aria-label={t('Laster …')} />}
        </header>
        <div className="ch-shell">
          <nav className="ch-nav" aria-label={t('Admin')}>
            {nav.map(([k, l]) => <a key={k} href={href(k)} className={sec === k ? 'on' : ''}>{t(l)}{(counts[k] ?? 0) > 0 && <span className="ch-count">{counts[k]}</span>}</a>)}
          </nav>
          <main className="ch-main">
            {staffNoMfa && <p className="ch-note warn">{t('Rollen din krever totrinnsbekreftelse. Logg ut og inn igjen og sett opp autentiseringsappen for å bruke stab-rettighetene.')}</p>}
            {note && <p role="status" className={'ch-note ' + (note.ok ? 'ok' : 'bad')}>{note.err !== undefined ? errText(note.err, t) : note.text}</p>}
            {body}
          </main>
        </div>
        {invite && <InviteDialog initial={invite} onClose={() => setInvite(null)} />}
      </div>
    </Ctx>
  )
}

/** Kontrollert avvisning når rollen ikke har tilgang til en side (f.eks. via direkte adresse). */
function Forbidden() {
  const { t } = useAdmin()
  return (
    <>
      <Head title="Ingen tilgang" />
      <Card>
        <p className="ch-muted">{t('Rollen din har ikke tilgang til denne siden. Tilgangen kontrolleres også på serveren og i databasen.')}</p>
        <div className="ch-row"><a className="ch-btn" href={href('oversikt')}>{t('Til oversikten')}</a></div>
      </Card>
    </>
  )
}

/** Samarbeid på oversikten (Developer og Moderator; bare metadata, aldri filinnhold). */
function CollabCard() {
  const { act, collabSvc, t } = useAdmin()
  const [ls, setLs] = useState<Group[]>([])
  useEffect(() => { void act(async () => setLs(await collabSvc.links.mine()))() }, [act, collabSvc])
  const active = ls.filter((l) => l.status === 'active')
  const churches = new Set(active.flatMap((l) => activeMembers(l).map((m) => m.church_id)))
  return (
    <Card title="Samarbeid">
      <div className="ch-stats">
        <a className="ch-stat" href={href('samarbeid')}><b>{active.length}</b><span>{t('Aktive samarbeidsgrupper')}</span></a>
        <a className="ch-stat" href={href('samarbeid')}><b>{churches.size}</b><span>{t('Menigheter i grupper')}</span></a>
        <a className="ch-stat" href={href('samarbeid')}><b>{ls.length - active.length}</b><span>{t('Avsluttede grupper')}</span></a>
      </div>
      <p className="ch-muted">{t('Som Developer eller Moderator samler du to eller flere menigheter (høyst 20) i samarbeidsgrupper. Hver gruppe får sin egen Samarbeidsfiler-mappe der menighetene deler kopier av bilder. Du ser bare filnavn og opplysninger om filene – aldri innholdet.')}</p>
      <div className="ch-row"><a className="ch-btn primary" href={href('samarbeid')}>{t('Gå til samarbeid')}</a></div>
    </Card>
  )
}

function Overview({ pendingInvites }: { pendingInvites: Invitation[] }) {
  const { staff, dev, collab, d, churchName, adminOf, act, admin, t } = useAdmin()
  const [recent, setRecent] = useState<AuditRow[]>([])
  const first = adminOf[0] ?? null
  useEffect(() => { void act(async () => setRecent((await admin.audit(staff ? null : first)).slice(0, 8)))() }, [act, admin, staff, first])
  const s = d.status
  const [now] = useState(() => Date.now())
  const soon = pendingInvites.filter((i) => new Date(i.expires_at).getTime() - now < 2 * 864e5)
  const todo = [
    ...(staff && d.pendingSubs ? [{ k: 'subs', t: d.pendingSubs + ' ' + t('abonnementsforespørsler venter på avgjørelse'), to: href('abonnement') }] : []),
    ...(pendingInvites.length ? [{ k: 'inv', t: pendingInvites.length + ' ' + t('ventende invitasjoner') + (soon.length ? ' · ' + soon.length + ' ' + t('utløper snart') : ''), to: href('invitasjoner') }] : []),
    ...d.churches.filter((c) => c.status === 'pending_deletion').map((c) => ({ k: 'del' + c.id, t: c.name + ': ' + t('venter på sletting') + ' (' + fmtDate(c.delete_after) + ')', to: href('menigheter', c.id, 'innstillinger') })),
  ]
  return (
    <>
      <Welcome />
      <PendingAccessNotice />
      <FolderButtons />
      <div className="ch-stats">
        <a className="ch-stat" href={href('brukere')}><b>{s ? s.users : d.users.filter((u) => u.status === 'active').length}</b><span>{t('Aktive brukere')}</span></a>
        <a className="ch-stat" href={href('menigheter')}><b>{d.churches.filter((c) => c.status === 'active').length}</b><span>{t('Aktive menigheter')}</span></a>
        <a className="ch-stat" href={href('invitasjoner')}><b>{pendingInvites.length}</b><span>{t('Ventende invitasjoner')}</span></a>
        {s && <a className="ch-stat" href={href('filer')}><b>{s.files}</b><span>{t('Filer')} · {(s.files_bytes / 1048576).toFixed(0)} MB</span></a>}
        {staff && <a className="ch-stat" href={href('abonnement')}><b>{d.pendingSubs}</b><span>{t('Forespørsler om abonnement')}</span></a>}
        {s && <a className="ch-stat" href={href('logg')}><b>{s.audit_last_24h}</b><span>{t('Hendelser siste døgn')}</span></a>}
      </div>
      {dev && <DevCard />}
      {(collab || dev) && <CollabCard />}
      <div className="ch-grid">
        <Card title="Krever handling" sub={todo.length || null}>
          {todo.length ? <List cols="1fr" rows={todo.map((x) => ({ key: x.k, cells: [<a key="a" href={x.to}>{x.t} →</a>] }))} /> : <p className="ch-muted">{t('Ingenting venter på deg nå.')}</p>}
        </Card>
        <Card title="Siste hendelser" actions={<a className="ch-btn small" href={href('logg')}>{t('Hele loggen')}</a>}>
          {recent.length
            ? <List cols="1fr auto" rows={recent.map((l) => ({ key: l.id, cells: [<span key="a">{t(actionName(l.action))}{l.church_id ? ' · ' + churchName(l.church_id) : ''}</span>, <span key="b" className="ch-muted">{fmt(l.created_at)}</span>] }))} />
            : <p className="ch-muted">{t('Ingen hendelser.')}</p>}
        </Card>
      </div>
    </>
  )
}

/** Utviklerinformasjon (bare Developer): miljø og tilstand – ingen hemmeligheter. */
function DevCard() {
  const { me, t } = useAdmin()
  const target = backend?.target
  return (
    <Card title="Utvikler">
      <dl className="ch-kv">
        <dt>{t('Miljø')}</dt><dd>{t(target === 'preview' ? 'Vercel Preview' : target === 'local' ? 'Lokal utvikling' : target || '–')}</dd>
        <dt>{t('Supabase-prosjekt')}</dt><dd>{backend?.projectRef || '–'}</dd>
        <dt>{t('Bygg')}</dt><dd>{BUILD}</dd>
        <dt>{t('Bruker-ID')}</dt><dd>{me.id}</dd>
        <dt>{t('Totrinn (MFA)')}</dt><dd>{t(me.mfa ? 'Aktiv i denne økten' : 'Ikke aktiv')}</dd>
        <dt>{t('Testrolle')}</dt><dd>{t(testRoleAllowed ? 'Tilgjengelig i kontomenyen' : 'Ikke tilgjengelig her')}</dd>
      </dl>
      <div className="ch-row"><a className="ch-btn small" href={href('logg')}>{t('Logg')}</a></div>
      {isProduction() ? (
        <>
          <div className="ch-row">
            <Badge tone="bad">{t('PRODUKSJON')}</Badge>
            {DEV_SITE && <a className="ch-btn primary" data-ch-devlink="" href={DEV_SITE + '/admin'} target="_blank" rel="noopener noreferrer">{t('Åpne ConnectHub Dev')} ↗</a>}
          </div>
          <p className="ch-muted">{t('Åpner utviklingsmiljøet i en ny fane. Det har egen database og egne kontoer, så du logger inn der på nytt. Endringer der påvirker ikke produksjon.')}</p>
        </>
      ) : (
        <>
          {PROD_SITE && (
            <div className="ch-row">
              <a className="ch-btn primary" data-ch-prodlink="" href={PROD_SITE + '/admin'} target="_blank" rel="noopener noreferrer">{t('Åpne ConnectHub produksjon')} ↗</a>
            </div>
          )}
          <p className="ch-note warn" data-ch-devhere="">{t('Du er i ConnectHub Dev (utvikling). Egen database og egne kontoer – endringer her påvirker ikke produksjon.')}</p>
        </>
      )}
    </Card>
  )
}

/** Velkomstområdet øverst på oversikten (alle roller): navn, hovedrolle og menighet(er) med logo. */
function Welcome() {
  const { me, d, files, t } = useAdmin()
  const churches = me.churches.map((c) => {
    const f = d.churches.find((x) => x.id === c.id)
    return f ? { ...c, logo_file_id: f.logo_file_id } : c
  })
  const logos = useLogos(files, churches.map((c) => c.logo_file_id))
  return (
    <section className="ch-welcome" data-ch-welcome="">
      <p className="ch-welcome-kicker">{t('Oversikt')}</p>
      <h1 data-ch-welcome-name="">{fill(t('Velkommen, {name}'), { name: welcomeName(me) })}</h1>
      <p className="ch-welcome-role" data-ch-welcome-role="">{t(mainRole(me.roles))}</p>
      {churches.length ? (
        <div className="ch-welcome-churches">
          {churches.map((c) => (
            <a key={c.id} className="ch-welcome-church" href={href('menigheter', c.id)} data-ch-welcome-church="">
              <ChurchLogo url={c.logo_file_id ? logos[c.logo_file_id] : null} name={c.name} size={44} /><b>{c.name}</b>
            </a>
          ))}
        </div>
      ) : <p className="ch-note" data-ch-welcome-nochurch="">{t('Du er ikke medlem av noen menighet ennå. Du får en invitasjon fra menighetens admin.')}</p>}
    </section>
  )
}

function UserOverview() {
  const { me, d, files, t, testRole } = useAdmin()
  const mine = d.churches.filter((c) => me.churches.some((x) => x.id === c.id))
  const logos = useLogos(files, mine.map((c) => c.logo_file_id))
  return (
    <>
      <Welcome />
      <FolderButtons />
      {testRole === 'admin' && <p className="ch-note warn">{t('Admin-visningen viser menighetene du er medlem av. Legg deg til i en menighet (som Developer) for å teste den.')}</p>}
      <Card title="Mine menigheter" sub={mine.length}>
        {mine.length ? (
          <div className="ch-grid">
            {mine.map((c) => (
              <a key={c.id} className="ch-stat" href={href('menigheter', c.id)}>
                <div className="ch-row"><ChurchLogo url={c.logo_file_id ? logos[c.logo_file_id] : null} name={c.name} size={36} /><b style={{ fontSize: 16 }}>{c.name}</b></div>
                <span>{t('Du er medlem')} · {t('Åpne')} →</span>
              </a>
            ))}
          </div>
        ) : <Empty>{t('Du er ikke medlem av noen menighet ennå. Du får en invitasjon fra menighetens admin.')}</Empty>}
      </Card>
      <div className="ch-grid">
        <Card title="Filer"><p className="ch-muted">{t('Se og legg til bilder i menighetens Fellesmappe, og del bilder i Samarbeidsmappen med menigheter dere samarbeider med.')}</p><div className="ch-row"><a className="ch-btn" href={href('filer', 'felles')}>{t('Åpne filer')}</a></div></Card>
        <Card title="Profil og varsler"><p className="ch-muted">{t('Navn, telefon, varsler og personvern finner du i kontomenyen nede til høyre.')}</p></Card>
      </div>
    </>
  )
}

/* ---------- Brukere ---------- */
function UsersView({ selected }: { selected?: string | undefined }) {
  const { d, churchName, staff, t } = useAdmin()
  const [q, setQ] = useState(''), [st, setSt] = useState('all'), [role, setRole] = useState('all'), [ch, setCh] = useState('all')
  const rolesOf = (id: string) => d.roles.filter((r) => r.user_id === id)
  const memsOf = (id: string) => d.memberships.filter((m) => m.user_id === id && m.status !== 'removed')
  const list = d.users.filter((u) => {
    if (q && !norm(`${u.full_name ?? ''} ${u.email} ${u.phone ?? ''}`).includes(norm(q))) return false
    if (st !== 'all' && u.status !== st) return false
    const rs = rolesOf(u.id)
    if (role === 'user' && rs.length) return false
    if (role !== 'all' && role !== 'user' && !rs.some((r) => r.role === role)) return false
    if (ch !== 'all' && !memsOf(u.id).some((m) => m.church_id === ch)) return false
    return true
  })
  return (
    <>
      <Head title="Brukere" sub={staff ? 'Alle brukere i ConnectHub.' : 'Medlemmer i menighetene du administrerer.'} />
      <div className="ch-row">
        <Search value={q} onChange={setQ} placeholder="Søk på navn, e-post eller telefon …" />
        <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle statuser'], ['active', 'Aktive'], ['disabled', 'Deaktiverte']]} />
        <Select label="Rolle" value={role} onChange={setRole} options={[['all', 'Alle roller'], ['developer', 'Developer'], ['moderator', 'Moderator'], ['church_admin', 'Admin'], ['user', 'Bare bruker']]} />
        <Select label="Menighet" value={ch} onChange={setCh} options={[['all', 'Alle menigheter'], ...d.churches.map((c) => [c.id, c.name] as const)]} />
      </div>
      <p className="ch-muted">{list.length} {t('av')} {d.users.length} {t('brukere')}</p>
      <List cols="minmax(220px,2fr) minmax(140px,1.2fr) minmax(140px,1.5fr) auto" head={['Person', 'Roller', 'Menigheter', 'Status']}
        empty="Ingen brukere passer med søket." onRow={(r) => go('brukere', r.key)}
        rows={list.map((u) => ({ key: u.id, cells: [
          <div key="p" className="ch-who"><Avatar name={u.full_name || u.email} /><div><b>{u.full_name || u.email}</b><span>{u.email}</span></div></div>,
          <div key="r" className="ch-row">{rolesOf(u.id).length ? rolesOf(u.id).map((r) => <RoleBadge key={r.id} r={r.role} />) : <span className="ch-muted">{t('Bruker')}</span>}</div>,
          <span key="m" className="ch-muted">{memsOf(u.id).map((m) => churchName(m.church_id) + (m.status !== 'active' ? ' (' + t('deaktivert') + ')' : '')).join(', ') || t('Ingen aktiv menighet')}</span>,
          <div key="s" className="ch-end"><StatusBadge s={u.status} /></div>] }))} />
      {selected && <UserDetail id={selected} onClose={() => go('brukere')} />}
    </>
  )
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { me, d, staff, dev, act, say, reload, churchName, canManage, adminOf, admin, t } = useAdmin()
  const u = d.users.find((x) => x.id === id)
  const [activity, setActivity] = useState<AuditRow[]>([])
  const [prof, setProf] = useState(() => ({ ...splitName(u ?? null), phone: u?.phone || '' }))
  const [addCh, setAddCh] = useState('')
  const [roleBlock, setRoleBlock] = useState<{ id: string; role: string } | null>(null)
  const [now] = useState(() => Date.now())
  const memberCard = useRef<HTMLDivElement>(null)
  const uid = u?.id
  useEffect(() => { if (staff && uid) admin.userActivity(uid).then(setActivity, () => undefined) }, [admin, staff, uid])
  if (!u) return <Drawer title={t('Bruker')} onClose={onClose}><Empty>{t('Fant ikke brukeren, eller du har ikke tilgang.')}</Empty></Drawer>
  const self = u.id === me.id
  const roles = d.roles.filter((r) => r.user_id === u.id), global = roles.filter((r) => !r.church_id)
  const allMems = d.memberships.filter((m) => m.user_id === u.id)
  // Navn på andre: stab, eller Admin i en menighet brukeren er (aktivt eller deaktivert) medlem av – som set_user_name.
  const canEditName = !self && (staff || allMems.some((m) => m.status !== 'removed' && adminOf.includes(m.church_id)))
  const mems = allMems.filter((m) => m.status !== 'removed'), gone = allMems.filter((m) => m.status === 'removed')
  const active = mems.filter((m) => m.status === 'active')
  const join = canJoinAnother(roles, d.memberships, u.id, churchName, t)
  const invites = d.invites.filter((i) => norm(i.email) === norm(u.email))
  const actions = memberActions(admin, t)
  const run = (fn: () => Promise<unknown>, ok?: string) => act(async () => { await fn(); if (ok) say(t(ok)); await reload() })
  const runMsg = (fn: () => Promise<string>) => act(async () => { const m = await fn(); if (m) say(m); await reload() })
  const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }
  const nm = u.full_name || u.email
  const saveName = (e: FormEvent) => {
    e.preventDefault()
    const err = nameError(prof.first, prof.last)
    if (err) { say(t(err), false); return }
    if (self) void run(() => admin.updateMyProfile(u.id, prof.first, prof.last, prof.phone), 'Opplysningene er lagret.')()
    else void run(() => admin.setUserName(u.id, prof.first.trim(), prof.last.trim()), 'Navnet er lagret.')()
  }
  return (
    <Drawer title={nm} sub={u.email} onClose={onClose}>
      <Card title="Oversikt">
        <dl className="ch-kv" data-ch-usersummary="">
          <dt>{t('Bruker')}</dt><dd><b>{nm}</b> <span className="ch-muted">{u.email}</span>{self && <> · {t('Deg')}</>}</dd>
          <dt>{t('Konto')}</dt><dd><StatusBadge s={u.status} /></dd>
          <dt>{t('Rolle')}</dt><dd>{roleSummary(roles, churchName, t)}</dd>
          <dt>{t('Menighet')}</dt><dd>{active.length
            ? active.map((m, i) => <Fragment key={m.church_id}>{i ? ', ' : ''}<a href={href('menigheter', m.church_id)}>{churchName(m.church_id)}</a></Fragment>)
            : <Badge tone="warn">{t('Ingen aktiv menighet')}</Badge>}</dd>
        </dl>
        <p className="ch-muted">{t('Endringer lagres med en gang. Handlinger som fjerner tilgang, ber om bekreftelse først.')}</p>
      </Card>

      <Card title="Opplysninger">
        {(self || canEditName) && (
          <form className="ch-form" data-ch-nameform="" onSubmit={saveName}>
            {!self && <p className="ch-muted">{fill(t('Du redigerer navnet til {email}.'), { email: u.email })}</p>}
            <Field label="Fornavn"><input className="ch-input" name="first_name" value={prof.first} maxLength={60} autoComplete="off" onChange={(e) => { const v = e.target.value; setProf((p) => ({ ...p, first: v })) }} /></Field>
            <Field label="Etternavn"><input className="ch-input" name="last_name" value={prof.last} maxLength={60} autoComplete="off" onChange={(e) => { const v = e.target.value; setProf((p) => ({ ...p, last: v })) }} /></Field>
            {self && <Field label="Telefon"><input className="ch-input" value={prof.phone} maxLength={40} onChange={(e) => { const v = e.target.value; setProf((p) => ({ ...p, phone: v })) }} /></Field>}
            <Btn kind="primary" type="submit">{t(self ? 'Lagre' : 'Lagre navn')}</Btn>
          </form>
        )}
        {!self && (
          <dl className="ch-kv">
            {!canEditName && <><dt>{t('Navn')}</dt><dd>{u.full_name || '–'}</dd></>}
            <dt>{t('E-post')}</dt><dd>{u.email}</dd>
            <dt>{t('Telefon')}</dt><dd>{u.phone || '–'}</dd>
            <dt>{t('Opprettet')}</dt><dd>{fmtDate(u.created_at)}</dd>
          </dl>
        )}
        {!self && <p className="ch-muted">{t(canEditName ? 'Telefon endres av brukeren selv. Navnefeltene endrer aldri rolle eller tilgang.' : 'Navn og telefon endres av brukeren selv.')}</p>}
      </Card>

      <div data-ch-membercard="" ref={memberCard}>
        <Card title="Menighet og medlemskap" sub={mems.length || null}>
          {mems.length ? (
            <List cols="1fr auto auto" rows={mems.map((m) => {
              const adm = roles.find((r) => r.role === 'church_admin' && r.church_id === m.church_id)
              const a: MemberTarget = { userId: u.id, churchId: m.church_id, name: nm, church: churchName(m.church_id), isAdmin: !!adm, roleId: adm?.id ?? null }
              return { key: m.church_id, cells: [
                <div key="c"><a href={href('menigheter', m.church_id)}><b>{churchName(m.church_id)}</b></a><div className="ch-muted">{t('Medlem siden')} {fmtDate(m.created_at)}</div></div>,
                <div key="s" className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}</div>,
                <div key="a" className="ch-end" data-ch-memberactions="">
                  {!self && staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(u.id, 'church_admin', m.church_id, 'Admin-siden'), 'Brukeren er nå admin.')}>{t('Gjør til admin')}</Btn>}
                  {!self && staff && adm && <Btn small onClick={runMsg(() => actions.revokeAdmin(a))}>{t('Fjern admin-rollen')}</Btn>}
                  {!self && canManage(m.church_id) && (m.status === 'active'
                    ? <Btn small onClick={runMsg(() => actions.disable(a))}>{t('Deaktiver midlertidig')}</Btn>
                    : <Btn small onClick={run(() => admin.setMembershipStatus(u.id, m.church_id, 'active'), 'Medlemskapet er aktivert.')}>{t('Aktiver igjen')}</Btn>)}
                  {!self && (staff || (canManage(m.church_id) && !adm)) && <Btn small kind="danger" data-ch-removemember="" onClick={runMsg(() => actions.remove(a))}>{t('Fjern fra menigheten')}</Btn>}
                </div>] }
            })} />
          ) : <p className="ch-muted">{t('Brukeren har ingen aktiv menighet. Kontoen finnes fortsatt, men gir ikke tilgang til noen menighets filer eller data.')}</p>}
          {gone.length > 0 && <p className="ch-muted" data-ch-formermember="">{t('Tidligere medlem av')}: {gone.map((m) => churchName(m.church_id)).join(', ')}</p>}
          {staff && (join.ok ? (
            <div className="ch-row">
              <select className="ch-select" value={addCh} onChange={(e) => setAddCh(e.target.value)} aria-label={t('Legg til i menighet')}>
                <option value="">{t('Legg til i menighet …')}</option>
                {d.churches.filter((c) => c.status === 'active' && !mems.some((m) => m.church_id === c.id && m.status === 'active')).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Btn disabled={!addCh} onClick={run(async () => { await admin.addMembership(u.id, addCh); setAddCh('') }, 'Brukeren er lagt til i menigheten.')}>{t('Legg til')}</Btn>
            </div>
          ) : <p className="ch-note" data-ch-onechurch="">{join.reason}</p>)}
          <p className="ch-muted">{t('«Deaktiver midlertidig» stenger tilgangen til medlemskapet aktiveres igjen. «Fjern fra menigheten» avslutter medlemskapet – brukeren må inviteres på nytt for å komme tilbake.')}</p>
        </Card>
      </div>

      {staff && (
        <Card title="Globale roller">
          <div className="ch-row">{global.length ? global.map((r) => (
            <span key={r.id} className="ch-row"><RoleBadge r={r.role} />
              {dev && !self && <Btn small data-ch-revokeglobal="" onClick={() => {
                // Den siste globale rollen gjør brukeren til User/Admin igjen, og da er grensen én menighet (CH004).
                if (roleBlocked(global, r, active.length)) { setRoleBlock(r); return }
                return run(() => { confirmOr(fill(t('Fjerne rollen {role} fra {name}?'), { role: t(ROLE[r.role] ?? r.role), name: nm })); return admin.revokeRole(r.id, 'Admin-siden') }, 'Rollen er fjernet.')()
              }}>{t('Fjern')}</Btn>}
            </span>
          )) : <span className="ch-muted">{t('Ingen')}</span>}</div>
          {roleBlock && (
            <div className="ch-note warn" data-ch-roleblock="">
              <p><b>{fill(t('Rollen {role} kan ikke fjernes fra {name} ennå.'), { role: t(ROLE[roleBlock.role] ?? roleBlock.role), name: nm })}</b></p>
              {active.length > 1 ? (
                <>
                  <p>{fill(t('Brukeren har {n} aktive medlemskap: {churches}. Som User eller Admin kan brukeren bare være medlem av én menighet om gangen.'), { n: active.length, churches: active.map((m) => churchName(m.church_id)).join(', ') })}</p>
                  <p>{t('Fjern medlemskapene brukeren ikke skal ha under «Menighet og medlemskap». Hver fjerning bekreftes for seg, og ingenting fjernes automatisk. Kom tilbake hit når brukeren har ett aktivt medlemskap.')}</p>
                  <div className="ch-row">
                    <Btn small kind="primary" onClick={() => memberCard.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}>{t('Gå til medlemskapene')}</Btn>
                    <Btn small onClick={() => setRoleBlock(null)}>{t('Lukk')}</Btn>
                  </div>
                </>
              ) : (
                <>
                  <p>{t('Brukeren har nå høyst ett aktivt medlemskap, så rollen kan fjernes.')}</p>
                  <div className="ch-row">
                    <Btn small kind="danger" onClick={run(async () => { confirmOr(fill(t('Fjerne rollen {role} fra {name}?'), { role: t(ROLE[roleBlock.role] ?? roleBlock.role), name: nm })); await admin.revokeRole(roleBlock.id, 'Admin-siden'); setRoleBlock(null) }, 'Rollen er fjernet.')}>{t('Fjern rollen')}</Btn>
                    <Btn small onClick={() => setRoleBlock(null)}>{t('Lukk')}</Btn>
                  </div>
                </>
              )}
            </div>
          )}
          {dev && !self && u.status === 'active' && (
            <div className="ch-row">
              {!global.some((r) => r.role === 'moderator') && <Btn small onClick={run(() => admin.assignRole(u.id, 'moderator', null, 'Admin-siden'), 'Brukeren er nå moderator.')}>{t('Gjør til moderator')}</Btn>}
              {!global.some((r) => r.role === 'developer') && <Btn small onClick={run(() => { confirmOr(t('Gi Developer-rollen? Developer har full tilgang til hele ConnectHub.')); return admin.assignRole(u.id, 'developer', null, 'Admin-siden') }, 'Brukeren er nå Developer.')}>{t('Gjør til Developer')}</Btn>}
            </div>
          )}
          {!dev && <p className="ch-muted" data-ch-devonly="">{t('Bare Developer kan gi eller fjerne rollene Developer og Moderator.')}</p>}
          <p className="ch-muted">{t('Developer og Moderator må bruke totrinnsbekreftelse for at rollen skal virke.')}</p>
        </Card>
      )}

      {staff && !self && (
        <Card title="Konto">
          {!dev && global.length > 0 ? <p className="ch-muted" data-ch-devonly="">{t('Bare Developer kan deaktivere eller aktivere en Developer eller Moderator.')}</p> : (
            <>
              <p className="ch-muted">{t(u.status === 'active' ? 'Deaktivering stenger brukeren ute med en gang, i alle menigheter. Ingenting slettes.' : 'Kontoen er deaktivert. Aktivering gir tilgang igjen.')}</p>
              <div className="ch-row">{u.status === 'active'
                ? <Btn kind="danger" onClick={run(() => { confirmOr(fill(t('Deaktivere kontoen til {name}?'), { name: nm }) + '\n\n' + t('Brukeren stenges ute med en gang, i alle menigheter. Ingenting slettes, og kontoen kan aktiveres igjen.')); return admin.setUserStatus(u.id, 'disabled') }, 'Kontoen er deaktivert. Brukeren mister tilgang med en gang.')}>{t('Deaktiver konto')}</Btn>
                : <Btn onClick={run(() => admin.setUserStatus(u.id, 'active'), 'Kontoen er aktivert.')}>{t('Aktiver konto')}</Btn>}</div>
            </>
          )}
        </Card>
      )}

      {invites.length > 0 && (
        <Card title="Invitasjoner til denne adressen">
          <List cols="1fr auto" rows={invites.map((i) => ({ key: i.id, cells: [
            <span key="r">{t(ROLE[i.role] ?? i.role)}{i.church_id ? ' · ' + churchName(i.church_id) : ''} <span className="ch-muted">{fmtDate(i.created_at)}</span></span>,
            <StatusBadge key="s" s={i.status === 'pending' && new Date(i.expires_at).getTime() < now ? 'expired' : i.status} />] }))} />
        </Card>
      )}

      {staff && (
        <Card title="Siste aktivitet">
          {activity.length
            ? <List cols="1fr auto" rows={activity.map((l) => ({ key: l.id, cells: [<span key="a">{t(actionName(l.action))}{l.church_id ? ' · ' + churchName(l.church_id) : ''}</span>, <span key="b" className="ch-muted">{fmt(l.created_at)}</span>] }))} />
            : <p className="ch-muted">{t('Ingen registrert aktivitet.')}</p>}
        </Card>
      )}
    </Drawer>
  )
}

/** «Ny invitasjon»: rollene man kan invitere til følger rollen (databasen og serveren kontrollerer uansett). */
function InviteDialog({ initial, onClose }: { initial: { church?: string | null }; onClose: () => void }) {
  const { staff, dev, d, canManage, act, say, reload, admin, t } = useAdmin()
  const roles = ['user', ...(staff ? ['church_admin'] : []), ...(dev ? ['moderator', 'developer'] : [])]
  const churches = d.churches.filter((c) => c.status === 'active' && canManage(c.id))
  const [f, setF] = useState({ email: '', role: 'user', church: initial.church && churches.some((c) => c.id === initial.church) ? initial.church : churches[0]?.id || '' })
  const global = f.role === 'moderator' || f.role === 'developer'
  // åpnet før menighetene var lastet: første menighet i listen (det nedtrekkslisten viser)
  const church = churches.some((c) => c.id === f.church) ? f.church : churches[0]?.id || ''
  // brukergrensen for valgt menighet (vises og sperrer knappen; databasen avgjør uansett)
  const usage = useMemberUsage(global ? null : church)
  const full = !global && isFull(usage)
  const send = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      const r = await admin.invite(f.email.trim(), f.role, global ? null : church)
      say(r.email_sent ? t('Invitasjonen er sendt til') + ' ' + r.invitation.email + '.' : t('Invitasjonen er lagret, men e-posten kunne ikke sendes (e-posttjenesten er ikke satt opp ennå). Prøv «Send på nytt» senere.'), r.email_sent)
      await reload()
      onClose()
    })()
  }
  return (
    <Dialog title={t('Ny invitasjon')} onClose={onClose}>
      <p className="ch-muted">{t('Personen får en e-post med lenke. Kontoen opprettes først når lenken åpnes, og bare med den inviterte e-postadressen. Lenken vises aldri her.')}</p>
      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="E-postadresse"><input className="ch-input" type="email" required maxLength={254} value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} autoFocus /></Field>
        <Field label="Rolle"><select className="ch-select" value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value }))}>{roles.map((r) => <option key={r} value={r}>{t(ROLE[r] ?? r)}</option>)}</select></Field>
        {!global && <Field label="Menighet"><select className="ch-select" value={church} onChange={(e) => setF((x) => ({ ...x, church: e.target.value }))} required>{churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        {!global && <MemberUsageNote usage={usage} />}
        <div className="ch-row"><Btn kind="primary" type="submit" disabled={full}>{t('Send invitasjon')}</Btn><Btn onClick={onClose}>{t('Avbryt')}</Btn></div>
      </form>
    </Dialog>
  )
}

