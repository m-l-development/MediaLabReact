import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DEFAULT_QUOTA_MB, type Church } from '../../services/admin'
import { downloadJson } from '../../services/account'
import { clearMe } from '../../services/auth/me-cache'
import { ChurchLogo, Head, NotMoved } from './common'
import { useAdmin } from './context'
import { SubsView } from './Subs'
import { fmtDate, forgetLogo, go, href, mb, norm, useLogos } from './lib'
import { Cancelled, fill, memberActions, type MemberTarget } from './members'
import { Avatar, Badge, Btn, Card, Empty, Field, List, RoleBadge, Search, Select, StatusBadge } from './ui'

/**
 * Menigheter (ADM-03, ADM-04) og Invitasjoner (ADM-05), portert fra media-lab/src/pages/connecthub-admin/sections.jsx.
 * Kvoten er standard 200 MB eller en egen kvote (alt annet enn 200 MB) som Developer tildeler; planene endrer den aldri.
 */
const isOwnQuota = (c: Church | undefined) => !!c && c.storage_quota_mb !== DEFAULT_QUOTA_MB
function QuotaBadge({ church }: { church: Church }) {
  const { t } = useAdmin()
  return <Badge tone={isOwnQuota(church) ? 'warn' : ''}>{t(isOwnQuota(church) ? 'Egen kvote' : 'Standard')}</Badge>
}
interface QuotaRow { church_id: string; used_bytes: number }
/** Developer: faktisk kvote, merke og brukt plass for alle menigheter (bare summer). */
function useQuotaOverview(on: boolean, dep: unknown): Record<string, QuotaRow> {
  const { admin } = useAdmin()
  const [o, setO] = useState<Record<string, QuotaRow>>({})
  useEffect(() => {
    // hentes på nytt når menighetene er lastet på nytt (dep)
    if (on && dep) admin.quotaOverview().then((r) => setO(Object.fromEntries(((r ?? []) as unknown as QuotaRow[]).map((x) => [x.church_id, x]))), () => undefined)
  }, [admin, on, dep])
  return o
}
const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }

export function ChurchesView() {
  const { d, staff, isUser, act, say, reload, userName, admin, t } = useAdmin()
  const [q, setQ] = useState(''), [st, setSt] = useState('all'), [name, setName] = useState('')
  const qo = useQuotaOverview(staff, d.churches)
  const list = d.churches.filter((c) => (!q || norm(c.name).includes(norm(q))) && (st === 'all' || c.status === st))
  const count = (id: string) => d.memberships.filter((m) => m.church_id === id && m.status === 'active').length
  const admins = (id: string) => d.roles.filter((r) => r.role === 'church_admin' && r.church_id === id).map((r) => userName(r.user_id))
  const create = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => { const c = await admin.createChurch(name); setName(''); say(t('Menigheten er opprettet.')); await reload(); go('menigheter', c.id) })()
  }
  return (
    <>
      <Head title="Menigheter" sub={staff ? 'Alle menigheter i ConnectHub.' : 'Menighetene du er med i.'} />
      {staff && (
        <Card title="Ny menighet">
          <form className="ch-row" onSubmit={create}>
            <input className="ch-input" style={{ flex: '1 1 240px' }} placeholder={t('Navn på ny menighet')} aria-label={t('Navn på ny menighet')} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
            <Btn kind="primary" type="submit">{t('Opprett menighet')}</Btn>
          </form>
        </Card>
      )}
      <div className="ch-row">
        <Search value={q} onChange={setQ} placeholder="Søk etter menighet …" />
        <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle statuser'], ['active', 'Aktiv'], ['temporarily_disabled', 'Midlertidig deaktivert'], ['pending_deletion', 'Venter på sletting']]} />
      </div>
      {isUser ? (
        <List cols="minmax(200px,1fr) auto" head={['Menighet', 'Status']} empty="Du er ikke medlem av noen menighet ennå." onRow={(r) => go('menigheter', r.key)}
          rows={list.map((c) => ({ key: c.id, cells: [
            <div key="c" className="ch-who"><Avatar name={c.name} /><div><b>{c.name}</b><span>{t('Du er medlem')}</span></div></div>,
            <div key="s" className="ch-end"><StatusBadge s={c.status} /></div>] }))} />
      ) : (
        <List cols={staff ? 'minmax(200px,2fr) auto minmax(140px,1.5fr) auto auto' : 'minmax(200px,2fr) auto minmax(140px,1.5fr) auto'}
          head={staff ? ['Menighet', 'Medlemmer', 'Admin', 'Lagring', 'Status'] : ['Menighet', 'Medlemmer', 'Admin', 'Status']} empty="Ingen menigheter passer med søket."
          onRow={(r) => go('menigheter', r.key)}
          rows={list.map((c) => ({ key: c.id, cells: [
            <div key="c" className="ch-who"><Avatar name={c.name} /><div><b>{c.name}</b><span>{t('Opprettet')} {fmtDate(c.created_at)}</span></div></div>,
            <span key="n">{count(c.id)} <span className="ch-muted">{t('medlemmer')}</span></span>,
            <span key="a" className="ch-muted">{admins(c.id).join(', ') || '–'}</span>,
            ...(staff ? [<span key="q" className="ch-row"><QuotaBadge church={c} /><span className="ch-muted">{qo[c.id] ? mb(qo[c.id]?.used_bytes) + ' / ' : ''}{c.storage_quota_mb} MB</span></span>] : []),
            <div key="s" className="ch-end"><StatusBadge s={c.status} /></div>] }))} />
      )}
    </>
  )
}

const CTABS = [['medlemmer', 'Medlemmer'], ['invitasjoner', 'Invitasjoner'], ['filer', 'Filer'], ['abonnement', 'Abonnement'], ['innstillinger', 'Innstillinger']] as const
export function ChurchDetail({ id, tab: tab0 }: { id: string; tab?: string | undefined }) {
  const { d, canManage, t } = useAdmin()
  const c = d.churches.find((x) => x.id === id)
  if (!d.loaded) return null
  if (!c) return <><Head title="Menighet" crumb={<a href={href('menigheter')}>← {t('Menigheter')}</a>} /><Card><Empty>{t('Fant ikke menigheten, eller du har ikke tilgang.')}</Empty></Card></>
  const tab = tab0 || (canManage(id) ? 'medlemmer' : 'filer')
  const n = d.memberships.filter((m) => m.church_id === id && m.status === 'active').length
  return (
    <>
      <Head title={c.name} crumb={<a href={href('menigheter')}>← {t('Menigheter')}</a>} sub={canManage(id) ? n + ' ' + t('aktive medlemmer') : t('Du er medlem')} right={<StatusBadge s={c.status} />} />
      <nav className="ch-tabs">{CTABS.filter(([k]) => canManage(id) || k === 'filer').map(([k, l]) => <a key={k} href={href('menigheter', id, k)} className={tab === k ? 'on' : ''}>{t(l)}</a>)}</nav>
      {tab === 'medlemmer' && canManage(id) && <MembersView church={c} />}
      {tab === 'invitasjoner' && canManage(id) && <InvitesView churchId={id} embedded />}
      {tab === 'filer' && <NotMoved sec="filer" path={`menigheter/${id}/filer`} inline />}
      {tab === 'abonnement' && canManage(id) && <SubsView churchId={id} />}
      {tab === 'innstillinger' && <ChurchSettings church={c} />}
    </>
  )
}

/**
 * Developer/Moderator: legg deg til eller fjern deg som EKSTRA Admin. Den faste Admin er uendret. Databasen kontrollerer
 * rolle og MFA, varsler Admin og loggfører. Siden lastes på nytt etterpå, så egne rettigheter (whoami) oppdateres.
 */
function ExtraAdminCard({ church }: { church: Church }) {
  const { me, d, act, admin, t } = useAdmin()
  const mine = d.roles.find((r) => r.role === 'church_admin' && r.church_id === church.id && r.user_id === me.id)
  if (mine && !mine.extra_admin) return null
  const done = () => { clearMe(); location.reload() }
  const add = act(async () => {
    confirmOr(fill(t('Legge deg til som ekstra Admin i «{church}»?'), { church: church.name }) + '\n\n' + t('Du får Admin-tilgang i menigheten (medlemmer, filer og Faste) i tillegg til menighetens faste Admin, som er uendret. Er du ikke medlem, blir du lagt til som medlem. Admin i menigheten varsles, og handlingen loggføres.'))
    await admin.addSelfAsAdmin(church.id)
    done()
  })
  const remove = act(async () => {
    confirmOr(fill(t('Fjerne deg som ekstra Admin i «{church}»?'), { church: church.name }) + '\n\n' + t('Ble du medlem da du la deg til, fjernes også medlemskapet. Den faste Admin er uendret.'))
    await admin.removeSelfAsAdmin(church.id)
    done()
  })
  return (
    <Card title="Ekstra Admin">
      <div data-ch-extraadmin="">
        <p className="ch-muted">{t(mine ? 'Du er ekstra Admin i denne menigheten. Den faste Admin-rollen er uendret.' : 'Som Developer eller Moderator kan du legge deg til som ekstra Admin, for eksempel for å hjelpe menigheten. Den faste Admin-rollen er uendret.')}</p>
        <div className="ch-row">{mine ? <Btn small kind="danger" onClick={remove}>{t('Fjern meg som ekstra Admin')}</Btn> : <Btn small kind="primary" onClick={add}>{t('Legg meg til som ekstra Admin')}</Btn>}</div>
      </div>
    </Card>
  )
}

function MembersView({ church }: { church: Church }) {
  const { me, d, staff, canManage, act, say, reload, openInvite, admin, collabSvc, t } = useAdmin()
  const [q, setQ] = useState(''), [st, setSt] = useState('all'), [msg, setMsg] = useState({ title: '', body: '' })
  const id = church.id, manage = canManage(id)
  const nameOf = (u: { full_name: string | null; email: string } | undefined) => (u ? u.full_name || u.email : '')
  const rows = d.memberships.filter((m) => m.church_id === id)
    .map((m) => ({ m, u: d.users.find((u) => u.id === m.user_id), adm: d.roles.find((r) => r.role === 'church_admin' && r.church_id === id && r.user_id === m.user_id && !r.revoked_at) }))
    .filter((x) => (!q || norm(x.u ? `${x.u.full_name ?? ''} ${x.u.email}` : '').includes(norm(q)))
      && (st === 'removed' ? x.m.status === 'removed' : x.m.status !== 'removed' && (st === 'all' || x.m.status === st || (st === 'admin' && !!x.adm))))
    .sort((a, b) => nameOf(a.u).localeCompare(nameOf(b.u), 'no'))
  const actions = memberActions(admin, t)
  const run = (fn: () => Promise<unknown>, ok: string) => act(async () => { await fn(); say(t(ok)); await reload() })
  const runMsg = (fn: () => Promise<string>) => act(async () => { const m = await fn(); if (m) say(m); await reload() })
  const send = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      const n = await collabSvc.sendToChurch(id, msg.title, msg.body)
      setMsg({ title: '', body: '' })
      say(t('Meldingen er sendt til') + ' ' + String(n) + ' ' + t('medlemmer.'))
    })()
  }
  return (
    <>
      {staff && <ExtraAdminCard church={church} />}
      <div className="ch-row">
        <Search value={q} onChange={setQ} placeholder="Søk etter medlem …" />
        <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle'], ['active', 'Aktive'], ['disabled', 'Deaktiverte'], ['admin', 'Admin'], ['removed', 'Fjernet (tidligere medlemmer)']]} />
        {manage && <Btn kind="primary" onClick={() => openInvite({ church: id })}>+ {t('Inviter medlem')}</Btn>}
      </div>
      <List cols="minmax(220px,2fr) auto auto" head={['Medlem', 'Status', '']} empty="Ingen medlemmer passer med søket." onRow={(r) => go('brukere', r.key)}
        rows={rows.map(({ m, u, adm }) => {
          const name = u ? u.full_name || u.email : t('Ukjent bruker')
          const a: MemberTarget = { userId: m.user_id, churchId: id, name, church: church.name, isAdmin: !!adm, roleId: adm?.id ?? null }
          return { key: m.user_id, cells: [
            <div key="w" className="ch-who"><Avatar name={u ? u.full_name || u.email : '?'} /><div><b>{name}</b><span>{u ? u.email : ''}</span></div></div>,
            <div key="s" className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}{adm?.extra_admin && <Badge>{t('ekstra')}</Badge>}{u && u.status !== 'active' && <Badge tone="bad">{t('Konto deaktivert')}</Badge>}</div>,
            m.user_id === me.id ? <span key="x" className="ch-muted">{t('Deg')}</span> : m.status === 'removed' ? <span key="x" className="ch-muted">{t('Fjernet')} {fmtDate(m.updated_at)}</span> : (
              <div key="x" className="ch-end" data-ch-memberactions="">
                {staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(m.user_id, 'church_admin', id, 'Admin-siden'), 'Brukeren er nå admin.')}>{t('Gjør til admin')}</Btn>}
                {staff && adm && <Btn small onClick={runMsg(() => actions.revokeAdmin(a))}>{t('Fjern admin-rollen')}</Btn>}
                {manage && (m.status === 'active'
                  ? <Btn small onClick={runMsg(() => actions.disable(a))}>{t('Deaktiver midlertidig')}</Btn>
                  : <Btn small onClick={run(() => admin.setMembershipStatus(m.user_id, id, 'active'), 'Medlemskapet er aktivert.')}>{t('Aktiver igjen')}</Btn>)}
                {(staff || (manage && !adm)) && <Btn small kind="danger" data-ch-removemember="" onClick={runMsg(() => actions.remove(a))}>{t('Fjern fra menigheten')}</Btn>}
              </div>
            )] }
        })} />
      {manage && (
        <Card title="Melding til alle medlemmer">
          <form className="ch-form" onSubmit={send}>
            <Field label="Tittel"><input className="ch-input" value={msg.title} onChange={(e) => setMsg((m) => ({ ...m, title: e.target.value }))} maxLength={160} required /></Field>
            <Field label="Tekst (valgfritt)"><input className="ch-input" value={msg.body} onChange={(e) => setMsg((m) => ({ ...m, body: e.target.value }))} maxLength={1000} /></Field>
            <Btn type="submit">{t('Send melding')}</Btn>
          </form>
          <p className="ch-muted">{t('Meldingen vises som varsel i appen for alle aktive medlemmer.')}</p>
        </Card>
      )}
    </>
  )
}

/**
 * Logo: Admin i menigheten (eller stab som er medlem) laster opp et bilde til Faste → Logoer med den vanlige, kontrollerte
 * opplastingen (bare bilder, 4 MB, innholdet sjekkes på serveren) og velger det som logo. Gamle logoer slettes aldri.
 */
function LogoCard({ church }: { church: Church }) {
  const { act, say, reload, admin, files, t } = useAdmin()
  const logos = useLogos(files, [church.logo_file_id])
  const url = church.logo_file_id ? logos[church.logo_file_id] : null
  const input = useRef<HTMLInputElement>(null)
  const upload = act(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const f = await files.upload(file, { churchId: church.id, folder: 'logoer' })
    await admin.setChurchLogo(church.id, f.id)
    forgetLogo(church.logo_file_id)
    say(t('Logoen er lagret. Den vises på oversikten for alle i menigheten.'))
    await reload()
  })
  const clear = act(async () => {
    confirmOr(t('Fjerne logoen?') + '\n\n' + t('Menigheten vises med forbokstaver i stedet. Bildet blir liggende i Faste → Logoer.'))
    await admin.setChurchLogo(church.id, null)
    say(t('Logoen er fjernet.'))
    await reload()
  })
  return (
    <Card title="Logo">
      <div className="ch-logo-preview" data-ch-logocard="">
        <ChurchLogo url={url} name={church.name} size={72} />
        <div><b>{church.name}</b><div className="ch-muted">{t(church.logo_file_id ? 'Denne logoen vises på oversikten.' : 'Ingen logo ennå – forbokstavene vises i stedet.')}</div></div>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => void upload(e)} data-ch-logoinput="" aria-label={t('Last opp logo')} />
      <div className="ch-row">
        <Btn kind="primary" onClick={() => input.current?.click()}>{t(church.logo_file_id ? 'Bytt logo' : 'Last opp logo')}</Btn>
        {church.logo_file_id && <Btn onClick={clear}>{t('Fjern logo')}</Btn>}
      </div>
      <p className="ch-muted">{t('PNG, JPG, WebP eller GIF, høyst 4 MB. Kvadratiske logoer blir finest.')}</p>
    </Card>
  )
}

interface StorageOverview { quota_sum_mb: number; limit_mb: number }
function ChurchSettings({ church }: { church: Church }) {
  const { staff, act, say, reload, canManage, adminOf, me, admin, collabSvc, t } = useAdmin()
  const logoOk = adminOf.includes(church.id) || (staff && me.churches.some((c) => c.id === church.id))
  const [name, setName] = useState(church.name), [quota, setQuota] = useState(String(church.storage_quota_mb ?? DEFAULT_QUOTA_MB))
  const run = (fn: () => Promise<unknown>, ok?: string) => act(async () => { await fn(); if (ok) say(t(ok)); await reload() })
  const used = useQuotaOverview(staff, church.storage_quota_mb)[church.id]?.used_bytes
  const [so, setSo] = useState<StorageOverview | null>(null)
  const quotaNow = church.storage_quota_mb
  // hentes på nytt når kvoten endres (summen av kvotene kan da bli større enn den samlede plassen)
  useEffect(() => { if (staff && quotaNow !== undefined) admin.storageOverview().then((r) => setSo(r as unknown as StorageOverview), () => undefined) }, [admin, staff, quotaNow])
  const rename = (e: FormEvent) => { e.preventDefault(); void run(() => admin.renameChurch(church.id, name), 'Navnet er endret.')() }
  const saveQuota = (e: FormEvent) => { e.preventDefault(); void run(() => admin.setQuota(church.id, Math.max(0, Math.min(10240, parseInt(quota, 10) || 0))), 'Lagringskvoten er endret.')() }
  const purge = act(async () => {
    const n = window.prompt(t('Endelig sletting av menigheten, alle medlemskap og alle filene. Kan ikke angres. Skriv navnet på menigheten for å bekrefte:'))
    if (n === null) return
    await collabSvc.churchLife.purge(church.id, n)
    say(t('Menigheten er slettet.'))
    await reload()
    go('menigheter')
  })
  return (
    <div className="ch-grid">
      {logoOk && <LogoCard church={church} />}
      {staff && (
        <Card title="Navn og lagring">
          <form className="ch-form" onSubmit={rename}>
            <Field label="Navn"><input className="ch-input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required /></Field>
            <Btn type="submit">{t('Lagre navn')}</Btn>
          </form>
          <div className="ch-row" data-ch-quota=""><span>{t('Faktisk kvote')}: <b>{church.storage_quota_mb} MB</b></span><QuotaBadge church={church} />
            {used != null && <span className="ch-muted">{t('Brukt')}: {mb(used)}</span>}</div>
          <form className="ch-form" onSubmit={saveQuota}>
            <Field label="Egen kvote (MB, 0–10240)"><input className="ch-input" type="number" min={0} max={10240} value={quota} onChange={(e) => setQuota(e.target.value)} /></Field>
            <Btn type="submit">{t('Lagre egen kvote')}</Btn>
          </form>
          {isOwnQuota(church) && <div className="ch-row"><Btn small onClick={run(async () => { await admin.resetQuota(church.id); setQuota(String(DEFAULT_QUOTA_MB)) }, 'Kvoten er tilbakestilt til standard (200 MB).')}>{t('Tilbakestill til standard (200 MB)')}</Btn></div>}
          <p className="ch-muted">{t('Standard er 200 MB. Mer plass gis bare som egen kvote for akkurat denne menigheten. Planer og abonnementer endrer aldri kvoten.')}</p>
          {so && so.quota_sum_mb > so.limit_mb && <p className="ch-note warn" data-ch-overbooked="">{t('Summen av alle menighetenes kvoter')} ({so.quota_sum_mb} MB) {t('er større enn den samlede lagringsplassen')} ({so.limit_mb} MB). {t('Det er lov, men opplasting stoppes for alle når den samlede plassen er brukt opp.')}</p>}
          <p className="ch-muted">{t('Alle kvoteendringer loggføres med gammel og ny verdi. Ingen filer slettes om kvoten senkes – bare nye opplastinger stoppes.')}</p>
        </Card>
      )}
      {canManage(church.id) && (
        <Card title="Eksport">
          <p className="ch-muted">{t('Last ned menighetens data (medlemmer, invitasjoner, filer med lenker som virker i 1 time, samarbeid og logg) som JSON.')}</p>
          <div className="ch-row"><Btn onClick={act(async () => { downloadJson(await collabSvc.churchLife.export(church.id), 'menighet-' + church.name.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, '-') + '.json'); say(t('Eksporten er lastet ned. Lenkene til filene virker i 1 time.')) })}>{t('Eksporter')}</Btn></div>
        </Card>
      )}
      {staff && (
        <Card title="Status og sletting">
          <div className="ch-row"><StatusBadge s={church.status} />{church.delete_after && <span className="ch-muted">{t('Kan slettes fra')} {fmtDate(church.delete_after)}</span>}</div>
          <p className="ch-muted">{t('Midlertidig deaktivert: medlemmene mister tilgang, ingenting slettes. Venter på sletting: deaktivert, og kan slettes for godt etter 30 dager. Begge kan angres.')}</p>
          <div className="ch-row">
            {church.status !== 'active' && <Btn onClick={run(() => collabSvc.churchLife.setStatus(church.id, 'active'), 'Status er endret.')}>{t('Aktiver')}</Btn>}
            {church.status === 'active' && <Btn onClick={run(() => collabSvc.churchLife.setStatus(church.id, 'temporarily_disabled'), 'Status er endret.')}>{t('Deaktiver midlertidig')}</Btn>}
            {church.status !== 'pending_deletion' && <Btn kind="danger" onClick={run(() => { confirmOr(t('Sette menigheten til sletting? Den deaktiveres nå og kan slettes endelig om 30 dager. Det kan angres frem til da.')); return collabSvc.churchLife.setStatus(church.id, 'pending_deletion') }, 'Status er endret.')}>{t('Sett til sletting')}</Btn>}
            {church.status === 'pending_deletion' && <Btn kind="danger" onClick={purge}>{t('Slett for godt')}</Btn>}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ---------- Invitasjoner ---------- */
export function InvitesView({ churchId, embedded }: { churchId?: string; embedded?: boolean }) {
  const { d, staff, canManage, churchName, act, say, reload, openInvite, admin, t } = useAdmin()
  const [q, setQ] = useState(''), [st, setSt] = useState('pending'), [role, setRole] = useState('all'), [ch, setCh] = useState('all')
  const [now] = useState(() => Date.now())
  const statusOf = (i: { status: string; expires_at: string }) => (i.status === 'pending' && new Date(i.expires_at).getTime() < now ? 'expired' : i.status)
  const list = d.invites.filter((i) => (!churchId || i.church_id === churchId) && (ch === 'all' || i.church_id === ch) && (!q || norm(i.email).includes(norm(q))) && (st === 'all' || statusOf(i) === st) && (role === 'all' || i.role === role))
  const run = (fn: () => Promise<{ email_sent?: boolean } | unknown>, ok: string) => act(async () => {
    const r = await fn()
    if (r && typeof r === 'object' && (r as { email_sent?: boolean }).email_sent === false) say(t('Ny lenke er laget, men e-posten kunne ikke sendes.'), false)
    else say(t(ok))
    await reload()
  })
  return (
    <>
      {!embedded && <Head title="Invitasjoner" sub="Personen får en e-post med lenke. Lenken vises aldri her." right={<Btn kind="primary" onClick={() => openInvite({})}>+ {t('Ny invitasjon')}</Btn>} />}
      <div className="ch-row">
        <Search value={q} onChange={setQ} placeholder="Søk etter e-post …" />
        <Select label="Status" value={st} onChange={setSt} options={[['pending', 'Venter'], ['accepted', 'Godtatt'], ['expired', 'Utløpt'], ['revoked', 'Trukket tilbake'], ['all', 'Alle statuser']]} />
        <Select label="Rolle" value={role} onChange={setRole} options={[['all', 'Alle roller'], ['user', 'Bruker'], ['church_admin', 'Admin'], ['moderator', 'Moderator'], ['developer', 'Developer']]} />
        {!churchId && d.churches.length > 1 && <Select label="Menighet" value={ch} onChange={setCh} options={[['all', 'Alle menigheter'], ...d.churches.map((c) => [c.id, c.name] as const)]} />}
        {embedded && churchId && canManage(churchId) && <Btn kind="primary" onClick={() => openInvite({ church: churchId })}>+ {t('Inviter')}</Btn>}
      </div>
      <List cols="minmax(200px,2fr) minmax(120px,1fr) auto minmax(120px,auto) auto" head={['E-post', 'Rolle og menighet', 'Status', 'Utløper', '']} empty="Ingen invitasjoner passer med filteret."
        rows={list.map((i) => {
          const s = statusOf(i), mine = staff || (i.role === 'user' && !!i.church_id && canManage(i.church_id))
          return { key: i.id, cells: [
            <div key="e" className="ch-who"><Avatar name={i.email} /><div><b>{i.email}</b><span>{t('Sendt')} {fmtDate(i.created_at)}</span></div></div>,
            <span key="r">{t({ user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' }[i.role] ?? i.role)}{i.church_id ? ' · ' + churchName(i.church_id) : ''}</span>,
            <StatusBadge key="s" s={s} />,
            <span key="x" className="ch-muted">{s === 'accepted' ? fmtDate(i.accepted_at) : fmtDate(i.expires_at)}</span>,
            (s === 'pending' || s === 'expired') && i.status === 'pending' && mine ? (
              <div key="a" className="ch-end">
                <Btn small onClick={run(() => admin.resendInvitation(i.id), 'Ny lenke er sendt.')}>{t('Send på nytt')}</Btn>
                <Btn small kind="danger" onClick={run(() => admin.revokeInvitation(i.id), 'Invitasjonen er trukket tilbake.')}>{t('Trekk tilbake')}</Btn>
              </div>
            ) : <span key="a" />] }
        })} />
      <p className="ch-muted">{t('E-post sendes foreløpig via Supabase sin innebygde tjeneste, som bare når teamets adresser (maks 2 i timen). Egen e-posttjeneste kommer ved produksjonssetting.')}</p>
    </>
  )
}
