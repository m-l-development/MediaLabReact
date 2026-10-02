/* ConnectHub admin – Menigheter, Invitasjoner, Filer, Samarbeid, Abonnement og Logg. */
import React from 'react';
import { admin, DEFAULT_QUOTA_MB } from '../../services/admin.js';
import { files as FS, FOLDERS } from '../../services/files.js';
import { spaces as SP, links as LK, linkName, otherChurch, subscriptions as SUB, notifications as NOTI, churchLife, downloadJson } from '../../services/community.js';
import { T, errText, ROLE, fmt, fmtDate, mb, norm, Btn, Badge, StatusBadge, RoleBadge, Avatar, Card, Empty, Field, Search, Select, List, Dialog, href, go } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';
import { Thumb, downloadOriginal } from './thumbs.jsx';
import { memberActions } from './members.js';

const ACTIONS = {
  'churches.insert': 'Menighet opprettet', 'churches.update': 'Menighet endret', 'churches.delete': 'Menighet slettet', 'churches.purge': 'Menighet slettet for godt',
  'memberships.insert': 'Medlem lagt til', 'memberships.update': 'Medlemskap endret', 'memberships.delete': 'Medlemskap fjernet', 'memberships.remove': 'Fjernet fra menighet',
  'user_roles.insert': 'Rolle gitt', 'user_roles.update': 'Rolle endret eller fjernet', 'user_roles.delete': 'Rolle slettet',
  'invitations.insert': 'Invitasjon laget', 'invitations.update': 'Invitasjon endret', 'invitations.delete': 'Invitasjon slettet',
  'app_users.insert': 'Bruker opprettet', 'app_users.update': 'Bruker endret', 'app_users.delete': 'Bruker slettet',
  'files.insert': 'Fil lastet opp', 'files.update': 'Fil endret', 'files.delete': 'Fil slettet', 'message.send': 'Melding sendt',
  'spaces.create': 'Samarbeidsområde opprettet', 'spaces.invite': 'Invitert til samarbeid', 'spaces.membership': 'Samarbeid endret',
  'spaces.update': 'Samarbeidsområde endret', 'spaces.status': 'Samarbeidsområde arkivert eller åpnet', 'spaces.delete': 'Samarbeidsområde slettet',
  'links.create': 'Kobling opprettet', 'links.end': 'Kobling avsluttet', 'links.reopen': 'Kobling gjenåpnet',
  'subscription_requests.insert': 'Abonnement forespurt', 'subscription_requests.update': 'Abonnementsforespørsel endret',
  'church_subscriptions.insert': 'Abonnement satt', 'church_subscriptions.update': 'Abonnement endret',
  'account.delete': 'Konto slettet', 'plans.update': 'Abonnementsplan endret', 'churches.quota': 'Lagringskvote endret', 'storage.limit': 'Samlet lagringsgrense endret', 'feedback.create': 'Tilbakemelding sendt inn', 'feedback.status': 'Tilbakemelding: status endret', 'feedback.note': 'Tilbakemelding: notat', 'audit_logs.purge': 'Gammel logg slettet',
};
export const actionName = a => ACTIONS[a] || a;

/* Menighetsvelger for seksjoner som gjelder én menighet. */
export function ChurchPicker() {
  const { d, ctxChurch, setCtxChurch } = useAdmin();
  const list = d.churches.filter(c => c.status === 'active');
  if (list.length < 2) return null;
  return <Select label="Menighet" value={ctxChurch || ''} onChange={setCtxChurch} options={list.map(c => [c.id, c.name])} />;
}

/* ---------- Menigheter ---------- */
/* Trinn 21: menighetens faktiske kvote er standard 200 MB eller en egen kvote (alt annet enn 200 MB) som Developer tildeler.
   Planene er bare veiledende og endrer den aldri. */
const isOwnQuota = c => !!c && c.storage_quota_mb !== DEFAULT_QUOTA_MB;
const QuotaBadge = ({ church }) => <Badge tone={isOwnQuota(church) ? 'warn' : ''}>{T(isOwnQuota(church) ? 'Egen kvote' : 'Standard')}</Badge>;
/* Developer: faktisk kvote, merke og brukt plass for alle menigheter (bare summer). */
function useQuotaOverview(on, dep) {
  const [o, setO] = React.useState({});
  React.useEffect(() => { if (on) admin.quotaOverview().then(r => setO(Object.fromEntries((r || []).map(x => [x.church_id, x])))).catch(() => {}); }, [on, dep]);
  return o;
}

export function ChurchesView() {
  const { d, staff, isUser, act, say, reload, userName } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('all'), [name, setName] = React.useState('');
  const qo = useQuotaOverview(staff, d.churches);
  const list = d.churches.filter(c => (!q || norm(c.name).includes(norm(q))) && (st === 'all' || c.status === st));
  const count = id => d.memberships.filter(m => m.church_id === id && m.status === 'active').length;
  const admins = id => d.roles.filter(r => r.role === 'church_admin' && r.church_id === id).map(r => userName(r.user_id));
  return <>
    <Head title="Menigheter" sub={staff ? 'Alle menigheter i ConnectHub.' : 'Menighetene du er med i.'} />
    {staff && <Card title="Ny menighet">
      <form className="ch-row" onSubmit={act(async e => { e.preventDefault(); const c = await admin.createChurch(name); setName(''); say(T('Menigheten er opprettet.')); await reload(); go('menigheter', c.id); })}>
        <input className="ch-input" style={{ flex: '1 1 240px' }} placeholder={T('Navn på ny menighet')} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required />
        <Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Opprett menighet')}</Btn>
      </form>
    </Card>}
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk etter menighet …" />
      <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle statuser'], ['active', 'Aktiv'], ['temporarily_disabled', 'Midlertidig deaktivert'], ['pending_deletion', 'Venter på sletting']]} />
    </div>
    {isUser ? <List cols="minmax(200px,1fr) auto" head={['Menighet', 'Status']} empty="Du er ikke medlem av noen menighet ennå." onRow={r => go('menigheter', r.key)}
      rows={list.map(c => ({ key: c.id, cells: [<div className="ch-who"><Avatar name={c.name} /><div><b>{c.name}</b><span>{T('Du er medlem')}</span></div></div>, <div className="ch-end"><StatusBadge s={c.status} /></div>] }))} /> :
    <List cols={staff ? 'minmax(200px,2fr) auto minmax(140px,1.5fr) auto auto' : 'minmax(200px,2fr) auto minmax(140px,1.5fr) auto'}
      head={staff ? ['Menighet', 'Medlemmer', 'Admin', 'Lagring', 'Status'] : ['Menighet', 'Medlemmer', 'Admin', 'Status']} empty="Ingen menigheter passer med søket."
      onRow={r => go('menigheter', r.key)}
      rows={list.map(c => ({ key: c.id, cells: [
        <div className="ch-who"><Avatar name={c.name} /><div><b>{c.name}</b><span>{T('Opprettet')} {fmtDate(c.created_at)}</span></div></div>,
        <span>{count(c.id)} <span className="ch-muted">{T('medlemmer')}</span></span>,
        <span className="ch-muted">{admins(c.id).join(', ') || '–'}</span>,
        ...(staff ? [<span className="ch-row"><QuotaBadge church={c} /><span className="ch-muted">{qo[c.id] ? mb(qo[c.id].used_bytes) + ' / ' : ''}{c.storage_quota_mb} MB</span></span>] : []),
        <div className="ch-end"><StatusBadge s={c.status} /></div>] }))} />}
  </>;
}

const CTABS = [['medlemmer', 'Medlemmer'], ['invitasjoner', 'Invitasjoner'], ['filer', 'Filer'], ['abonnement', 'Abonnement'], ['innstillinger', 'Innstillinger']];
export function ChurchDetail({ id, tab }) {
  const { d, canManage } = useAdmin();
  const c = d.churches.find(x => x.id === id);
  if (!d.loaded) return null;
  if (!c) return <><Head title="Menighet" crumb={<a href={href('menigheter')}>← {T('Menigheter')}</a>} /><Card><Empty>{T('Fant ikke menigheten, eller du har ikke tilgang.')}</Empty></Card></>;
  const n = d.memberships.filter(m => m.church_id === id && m.status === 'active').length;
  return <>
    <Head title={c.name} crumb={<a href={href('menigheter')}>← {T('Menigheter')}</a>} sub={canManage(id) ? n + ' ' + T('aktive medlemmer') : T('Du er medlem')} right={<StatusBadge s={c.status} />} />
    <nav className="ch-tabs">{CTABS.filter(([k]) => canManage(id) || k === 'filer').map(([k, l]) => <a key={k} href={href('menigheter', id, k)} className={tab === k ? 'on' : ''}>{T(l)}</a>)}</nav>
    {tab === 'medlemmer' && canManage(id) && <MembersView church={c} />}
    {tab === 'invitasjoner' && canManage(id) && <InvitesView churchId={id} embedded />}
    {tab === 'filer' && <FilesView churchId={id} />}
    {tab === 'abonnement' && canManage(id) && <SubsView churchId={id} />}
    {tab === 'innstillinger' && <ChurchSettings church={c} />}
  </>;
}

function MembersView({ church }) {
  const { me, d, staff, canManage, act, say, reload, openInvite } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('all'), [msg, setMsg] = React.useState({ title: '', body: '' });
  const id = church.id, manage = canManage(id);
  const rows = d.memberships.filter(m => m.church_id === id).map(m => ({ m, u: d.users.find(u => u.id === m.user_id), adm: d.roles.find(r => r.role === 'church_admin' && r.church_id === id && r.user_id === m.user_id && !r.revoked_at) }))
    .filter(x => (!q || norm((x.u && (x.u.full_name + ' ' + x.u.email)) || '').includes(norm(q))) && (st === 'removed' ? x.m.status === 'removed' : x.m.status !== 'removed' && (st === 'all' || x.m.status === st || (st === 'admin' && x.adm))))
    .sort((a, b) => String(a.u && (a.u.full_name || a.u.email)).localeCompare(String(b.u && (b.u.full_name || b.u.email)), 'no'));
  const run = (fn, ok) => act(async () => { await fn(); say(T(ok)); await reload(); });
  const runMsg = fn => act(async () => { const m = await fn(); if (m) say(m); await reload(); });   // handlinger med bekreftelse (members.js)
  return <>
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk etter medlem …" />
      <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle'], ['active', 'Aktive'], ['disabled', 'Deaktiverte'], ['admin', 'Admin'], ['removed', 'Fjernet (tidligere medlemmer)']]} />
      {manage && <Btn kind="primary" onClick={() => openInvite({ church: id })}>+ {T('Inviter medlem')}</Btn>}
    </div>
    <List cols="minmax(220px,2fr) auto auto" head={['Medlem', 'Status', '']} empty="Ingen medlemmer passer med søket."
      onRow={r => go('brukere', r.key)}
      rows={rows.map(({ m, u, adm }) => ({ key: m.user_id, cells: [
        <div className="ch-who"><Avatar name={u ? (u.full_name || u.email) : '?'} /><div><b>{u ? (u.full_name || u.email) : T('Ukjent bruker')}</b><span>{u ? u.email : ''}</span></div></div>,
        <div className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}{u && u.status !== 'active' && <Badge tone="bad">{T('Konto deaktivert')}</Badge>}</div>,
        m.user_id === me.id ? <span className="ch-muted">{T('Deg')}</span> : m.status === 'removed' ? <span className="ch-muted">{T('Fjernet')} {fmtDate(m.updated_at)}</span> : (() => {
          const a = { userId: m.user_id, churchId: id, name: u ? (u.full_name || u.email) : T('Ukjent bruker'), church: church.name, isAdmin: !!adm, roleId: adm && adm.id };
          return <div className="ch-end" data-ch-memberactions>
            {staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(m.user_id, 'church_admin', id, 'Admin-siden'), 'Brukeren er nå admin.')}>{T('Gjør til admin')}</Btn>}
            {staff && adm && <Btn small onClick={runMsg(() => memberActions.revokeAdmin(a))}>{T('Fjern admin-rollen')}</Btn>}
            {manage && (m.status === 'active'
              ? <Btn small onClick={runMsg(() => memberActions.disable(a))}>{T('Deaktiver midlertidig')}</Btn>
              : <Btn small onClick={run(() => admin.setMembershipStatus(m.user_id, id, 'active'), 'Medlemskapet er aktivert.')}>{T('Aktiver igjen')}</Btn>)}
            {(staff || (manage && !adm)) && <Btn small kind="danger" data-ch-removemember onClick={runMsg(() => memberActions.remove(a))}>{T('Fjern fra menigheten')}</Btn>}
          </div>; })()] }))} />
    {manage && <Card title="Melding til alle medlemmer">
      <form className="ch-form" onSubmit={act(async e => { e.preventDefault(); const n = await NOTI.sendToChurch(id, msg.title, msg.body); setMsg({ title: '', body: '' }); say(T('Meldingen er sendt til') + ' ' + n + ' ' + T('medlemmer.')); })}>
        <Field label="Tittel"><input className="ch-input" value={msg.title} onChange={e => setMsg(m => ({ ...m, title: e.target.value }))} maxLength={160} required /></Field>
        <Field label="Tekst (valgfritt)"><input className="ch-input" value={msg.body} onChange={e => setMsg(m => ({ ...m, body: e.target.value }))} maxLength={1000} /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Send melding')}</Btn>
      </form>
      <p className="ch-muted">{T('Meldingen vises som varsel i appen for alle aktive medlemmer.')}</p>
    </Card>}
  </>;
}

function ChurchSettings({ church }) {
  const { staff, act, say, reload, canManage } = useAdmin();
  const [name, setName] = React.useState(church.name), [quota, setQuota] = React.useState(church.storage_quota_mb ?? DEFAULT_QUOTA_MB);
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await reload(); });
  const used = (useQuotaOverview(staff, church.storage_quota_mb)[church.id] || {}).used_bytes;
  const [so, setSo] = React.useState(null);
  React.useEffect(() => { if (staff) admin.storageOverview().then(setSo).catch(() => {}); }, [staff, church.storage_quota_mb]);
  return <div className="ch-grid">
    {staff && <Card title="Navn og lagring">
      <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.renameChurch(church.id, name), 'Navnet er endret.')(e); }}>
        <Field label="Navn"><input className="ch-input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre navn')}</Btn>
      </form>
      <div className="ch-row" data-ch-quota><span>{T('Faktisk kvote')}: <b>{church.storage_quota_mb} MB</b></span><QuotaBadge church={church} />
        {used != null && <span className="ch-muted">{T('Brukt')}: {mb(used)}</span>}</div>
      <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.setQuota(church.id, Math.max(0, Math.min(10240, parseInt(quota, 10) || 0))), 'Lagringskvoten er endret.')(e); }}>
        <Field label="Egen kvote (MB, 0–10240)"><input className="ch-input" type="number" min={0} max={10240} value={quota} onChange={e => setQuota(e.target.value)} /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre egen kvote')}</Btn>
      </form>
      {isOwnQuota(church) && <div className="ch-row">
        <Btn small onClick={run(async () => { await admin.resetQuota(church.id); setQuota(DEFAULT_QUOTA_MB); }, 'Kvoten er tilbakestilt til standard (200 MB).')}>{T('Tilbakestill til standard (200 MB)')}</Btn></div>}
      <p className="ch-muted">{T('Standard er 200 MB. Mer plass gis bare som egen kvote for akkurat denne menigheten. Planer og abonnementer endrer aldri kvoten.')}</p>
      {so && so.quota_sum_mb > so.limit_mb && <p className="ch-note warn" data-ch-overbooked>{T('Summen av alle menighetenes kvoter')} ({so.quota_sum_mb} MB) {T('er større enn den samlede lagringsplassen')} ({so.limit_mb} MB). {T('Det er lov, men opplasting stoppes for alle når den samlede plassen er brukt opp.')}</p>}
      <p className="ch-muted">{T('Alle kvoteendringer loggføres med gammel og ny verdi. Ingen filer slettes om kvoten senkes – bare nye opplastinger stoppes.')}</p>
    </Card>}
    {canManage(church.id) && <Card title="Eksport">
      <p className="ch-muted">{T('Last ned menighetens data (medlemmer, invitasjoner, filer med lenker som virker i 1 time, samarbeid og logg) som JSON.')}</p>
      <div className="ch-row"><Btn onClick={act(async () => { downloadJson(await churchLife.export(church.id), 'menighet-' + church.name.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, '-') + '.json'); say(T('Eksporten er lastet ned. Lenkene til filene virker i 1 time.')); })}>{T('Eksporter')}</Btn></div>
    </Card>}
    {staff && <Card title="Status og sletting">
      <div className="ch-row"><StatusBadge s={church.status} />{church.delete_after && <span className="ch-muted">{T('Kan slettes fra')} {fmtDate(church.delete_after)}</span>}</div>
      <p className="ch-muted">{T('Midlertidig deaktivert: medlemmene mister tilgang, ingenting slettes. Venter på sletting: deaktivert, og kan slettes for godt etter 30 dager. Begge kan angres.')}</p>
      <div className="ch-row">
        {church.status !== 'active' && <Btn onClick={run(() => churchLife.setStatus(church.id, 'active'), 'Status er endret.')}>{T('Aktiver')}</Btn>}
        {church.status === 'active' && <Btn onClick={run(() => churchLife.setStatus(church.id, 'temporarily_disabled'), 'Status er endret.')}>{T('Deaktiver midlertidig')}</Btn>}
        {church.status !== 'pending_deletion' && <Btn kind="danger" onClick={run(() => { if (!confirm(T('Sette menigheten til sletting? Den deaktiveres nå og kan slettes endelig om 30 dager. Det kan angres frem til da.'))) throw Object.assign(new Error(), { code: 'cancel' }); return churchLife.setStatus(church.id, 'pending_deletion'); }, 'Status er endret.')}>{T('Sett til sletting')}</Btn>}
        {church.status === 'pending_deletion' && <Btn kind="danger" onClick={act(async () => { const n = prompt(T('Endelig sletting av menigheten, alle medlemskap og alle filene. Kan ikke angres. Skriv navnet på menigheten for å bekrefte:')); if (n === null) return; await churchLife.purge(church.id, n); say(T('Menigheten er slettet.')); await reload(); go('menigheter'); })}>{T('Slett for godt')}</Btn>}
      </div>
    </Card>}
  </div>;
}

/* ---------- Invitasjoner ---------- */
export function InvitesView({ churchId, embedded }) {
  const { d, staff, canManage, churchName, act, say, reload, openInvite, me } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('pending'), [role, setRole] = React.useState('all'), [ch, setCh] = React.useState('all');
  const statusOf = i => i.status === 'pending' && new Date(i.expires_at) < new Date() ? 'expired' : i.status;
  const list = d.invites.filter(i => (!churchId || i.church_id === churchId) && (ch === 'all' || i.church_id === ch) && (!q || norm(i.email).includes(norm(q))) && (st === 'all' || statusOf(i) === st) && (role === 'all' || i.role === role));
  const run = (fn, ok) => act(async () => { const r = await fn(); if (r && r.email_sent === false) say(T('Ny lenke er laget, men e-posten kunne ikke sendes.'), false); else say(T(ok)); await reload(); });
  return <>
    {!embedded && <Head title="Invitasjoner" sub="Personen får en e-post med lenke. Lenken vises aldri her." right={<Btn kind="primary" onClick={() => openInvite({})}>+ {T('Ny invitasjon')}</Btn>} />}
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk etter e-post …" />
      <Select label="Status" value={st} onChange={setSt} options={[['pending', 'Venter'], ['accepted', 'Godtatt'], ['expired', 'Utløpt'], ['revoked', 'Trukket tilbake'], ['all', 'Alle statuser']]} />
      <Select label="Rolle" value={role} onChange={setRole} options={[['all', 'Alle roller'], ['user', 'Bruker'], ['church_admin', 'Admin'], ['moderator', 'Moderator'], ['developer', 'Developer']]} />
      {!churchId && d.churches.length > 1 && <Select label="Menighet" value={ch} onChange={setCh} options={[['all', 'Alle menigheter'], ...d.churches.map(c => [c.id, c.name])]} />}
      {embedded && canManage(churchId) && <Btn kind="primary" onClick={() => openInvite({ church: churchId })}>+ {T('Inviter')}</Btn>}
    </div>
    <List cols="minmax(200px,2fr) minmax(120px,1fr) auto minmax(120px,auto) auto" head={['E-post', 'Rolle og menighet', 'Status', 'Utløper', '']} empty="Ingen invitasjoner passer med filteret."
      rows={list.map(i => { const s = statusOf(i), mine = staff || i.created_by === me.id || (i.role === 'user' && canManage(i.church_id)); return { key: i.id, cells: [
        <div className="ch-who"><Avatar name={i.email} /><div><b>{i.email}</b><span>{T('Sendt')} {fmtDate(i.created_at)}</span></div></div>,
        <span>{T(ROLE[i.role] || i.role)}{i.church_id ? ' · ' + churchName(i.church_id) : ''}</span>,
        <StatusBadge s={s} />,
        <span className="ch-muted">{s === 'accepted' ? fmtDate(i.accepted_at) : fmtDate(i.expires_at)}</span>,
        (s === 'pending' || s === 'expired') && i.status === 'pending' && mine ? <div className="ch-end">
          <Btn small onClick={run(() => admin.resendInvitation(i.id), 'Ny lenke er sendt.')}>{T('Send på nytt')}</Btn>
          <Btn small kind="danger" onClick={run(() => admin.revokeInvitation(i.id), 'Invitasjonen er trukket tilbake.')}>{T('Trekk tilbake')}</Btn>
        </div> : <span />] }; })} />
    <p className="ch-muted">{T('E-post sendes foreløpig via Supabase sin innebygde tjeneste, som bare når teamets adresser (maks 2 i timen). Egen e-posttjeneste kommer ved produksjonssetting.')}</p>
  </>;
}

/* ---------- Filer: Faste, Delt mappe og Samarbeidsfiler ---------- */
/* Faste = felles ressurser som brukes av flere verktøy (Photo Design, Thumbnail Studio, Mockups …). Bare Admin i
   menigheten vedlikeholder (M1); alle medlemmer ser og laster ned. Delt mappe = medlemmene deler bilder; Admin rydder.
   Samarbeidsfiler (trinn 18) = KOPIER som deles i en kobling mellom nøyaktig to menigheter; originalen blir liggende.
   Filer vises bare for medlemmer – også Developer ser bare filer i menigheter der Developer er medlem (A1).
   Mappenavnene i databasen er uendret (faste, logoer, bakgrunner, mockups, bilder, samarbeid). */
const AREAS = {
  faste: { label: 'Faste – felles ressurser', folders: [['faste', 'Faste bilder'], ['logoer', 'Logoer'], ['bakgrunner', 'Bakgrunner'], ['mockups', 'Mockups']],
    info: 'Felles bilder og logoer som brukes i flere verktøy (Photo Design, Thumbnail Studio, Mockups m.fl.). Admin legger til, organiserer og fjerner. Alle medlemmer kan se og laste ned.' },
  delt: { label: 'Delt mappe', folders: [['bilder', 'Delt mappe']],
    info: 'Bilder som deles i menigheten. Alle medlemmer kan se, laste ned og legge til egne bilder. Du kan slette dine egne; Admin kan rydde i alt.' },
  samarbeid: { label: 'Samarbeidsfiler', folders: [['samarbeid', 'Samarbeidsfiler']],
    info: 'Kopier av bilder som deles med én annen menighet i en kobling. Begge menighetene kan se og laste ned. Bilder legges inn ved å dele en kopi fra Delt mappe eller Faste – originalen blir liggende. Bare Admin i menigheten som bidro, kan fjerne en kopi.' },
};
const FOLDER_NAME = { bilder: 'Delt mappe', faste: 'Faste bilder', logoer: 'Logoer', bakgrunner: 'Bakgrunner', mockups: 'Mockups' };
/* Sist viste liste per menighet og mappe (resten av besøket): bytte fram og tilbake viser lista med en gang, og den
   oppdateres i bakgrunnen. */
const FILE_LISTS = new Map();
export function FilesView({ churchId }) {
  const { me, adminOf, churchName, act, say } = useAdmin();
  const member = (me.churches || []).some(c => c.id === churchId) || adminOf.includes(churchId);
  const admin_ = adminOf.includes(churchId);   // M1: Faste og fjerning av egne bidrag i Samarbeidsfiler – bare Admin i menigheten
  const [fl, setFl] = React.useState({ area: 'faste', folder: 'faste', list: [], loading: true, usage: null, priv: false, over: false, links: [], link: null, copy: null });
  const seq = React.useRef(0);
  /* Viser valgt mappe straks (fra hurtigbufferen hvis den finnes); lista og forbruket hentes parallelt. Bildene hentes
     av <Thumb> når de vises. Bare siste valg vinner hvis brukeren bytter raskt. */
  const load = async (folder = fl.folder, area = fl.area, { usage = false, link = fl.link } = {}) => {
    const n = ++seq.current, key = churchId + '|' + folder + (folder === 'samarbeid' ? '|' + link : ''), hit = FILE_LISTS.get(key);
    setFl(f => ({ ...f, area, folder, link, list: hit || [], loading: !hit }));
    const [list, use] = await Promise.all([folder === 'samarbeid' ? (link ? FS.listLink(link) : []) : FS.list({ churchId, folder }), usage ? FS.usage(churchId) : null]);
    FILE_LISTS.set(key, list);
    if (n === seq.current) setFl(f => ({ ...f, list, loading: false, usage: use || f.usage }));
  };
  /* Aktive koblinger der denne menigheten er med (databasen gir bare koblinger for egne menigheter). */
  const loadLinks = async () => {
    const all = await LK.mine().catch(() => []);
    const links = all.filter(l => l.status === 'active' && (l.church_a === churchId || l.church_b === churchId));
    setFl(f => ({ ...f, links, link: f.link && links.some(l => l.id === f.link) ? f.link : (links[0] || {}).id || null }));
    return links;
  };
  React.useEffect(() => {
    if (!churchId || !member) return;
    setFl(f => ({ ...f, area: 'faste', folder: 'faste', usage: null, links: [], link: null }));
    act(async () => { await Promise.all([load('faste', 'faste', { usage: true }), loadLinks()]); })();
  }, [churchId, member]);
  if (!member) return <Card title="Filer"><p className="ch-note warn">{T('Du er ikke medlem av denne menigheten. Filer vises bare for medlemmer – også for Developer og Moderator.')}</p></Card>;

  const A = AREAS[fl.area], collab = fl.area === 'samarbeid', canUpload = !collab && (fl.area === 'delt' || admin_);
  const curLink = fl.links.find(l => l.id === fl.link), other = l => otherChurch(l, churchId);
  const upload = act(async list => {
    if (!canUpload) return;
    let n = 0; for (const file of list) { try { await FS.upload(file, { churchId, folder: fl.folder, priv: fl.area === 'delt' && fl.priv }); n++; } catch (err) { say(file.name + ': ' + errText(err), false); } }
    if (n) say(n + ' ' + T('filer er lastet opp.')); await load(undefined, undefined, { usage: true });
  });
  const download = act(x => downloadOriginal(x.id, x.file_name));
  /* Kopi til Samarbeidsfiler: Delt mappe for alle medlemmer, Faste bare for Admin, aldri private filer. */
  const canCopy = x => fl.links.length > 0 && !collab && x.visibility === 'church' && (fl.area === 'delt' || admin_);
  const doCopy = act(async e => {
    e.preventDefault();
    const { file, link } = fl.copy, l = fl.links.find(x => x.id === link);
    await FS.copyToLink(file.id, link);
    for (const k of [...FILE_LISTS.keys()]) if (k.startsWith(churchId + '|samarbeid')) FILE_LISTS.delete(k);
    setFl(f => ({ ...f, copy: null }));
    say(T('En kopi er lagt i Samarbeidsfiler med') + ' ' + other(l) + '.');
    await load(undefined, undefined, { usage: true });
  });
  const removeCopy = x => act(async () => {
    if (!confirm(T('Den delte kopien slettes for begge menighetene. Originalen i') + ' «' + T(FOLDER_NAME[x.source_folder] || 'Delt mappe') + '» ' + T('blir liggende.') + '\n\n' + T('Fjerne fra Samarbeidsfiler?'))) return;
    await FS.remove(x.id); say(T('Kopien er fjernet fra Samarbeidsfiler.'));
    setFl(f => ({ ...f, list: f.list.filter(y => y.id !== x.id) })); await load(undefined, undefined, { usage: true });
  })();
  const u = fl.usage, pct = u && u.quota_bytes ? Math.min(100, Math.round(100 * u.used_bytes / u.quota_bytes)) : 0;
  /* Trinn 20: ledig plass er det minste av menighetens ledige kvote og ledig samlet plass i ConnectHub. */
  const quotaFree = u ? Math.max(0, u.quota_bytes - u.used_bytes) : 0, sysFree = u && u.system_free_bytes != null ? u.system_free_bytes : Infinity;
  const free = Math.min(quotaFree, sysFree), bySystem = sysFree < quotaFree;
  const thumb = (x, extra) => <div key={x.id} className="ch-thumb">
    <Thumb id={x.id} />
    <span style={{ wordBreak: 'break-all' }}>{x.file_name} {x.visibility === 'private' && <Badge>{T('Privat')}</Badge>}</span>
    {extra}
  </div>;
  const areas = Object.entries(AREAS).filter(([k]) => k !== 'samarbeid' || fl.links.length);

  return <>
    <nav className="ch-tabs" aria-label={T('Filområder')}>{areas.map(([k, v]) => <a key={k} href="#" className={fl.area === k ? 'on' : ''} onClick={e => { e.preventDefault(); if (fl.area !== k) act(() => load(v.folders[0][0], k))(); }}>{T(v.label)}</a>)}</nav>
    <Card title={A.label} sub={fl.area === 'faste' ? T(admin_ ? 'Du kan vedlikeholde' : 'Bare visning og nedlasting') : null}>
      <p className="ch-muted">{T(A.info)}</p>
      {A.folders.length > 1 && <div className="ch-row">{A.folders.map(([f, l]) => <Btn key={f} small kind={fl.folder === f ? 'primary' : ''} onClick={() => { if (fl.folder !== f) act(() => load(f))(); }}>{T(l)}</Btn>)}</div>}
      {collab && fl.links.length > 1 && <div className="ch-row">{fl.links.map(l => <Btn key={l.id} small kind={fl.link === l.id ? 'primary' : ''} onClick={() => { if (fl.link !== l.id) act(() => load('samarbeid', 'samarbeid', { link: l.id }))(); }}>{T('Med')} {other(l)}</Btn>)}</div>}
      {u && <><div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
        <p className="ch-muted" data-ch-meter>{T('Brukt')}: {mb(u.used_bytes)} {T('av')} {mb(u.quota_bytes)} ({T(u.quota_bytes === DEFAULT_QUOTA_MB * 1048576 ? 'standard' : 'egen kvote')}) · {T('Ledig')}: {mb(free)}{bySystem ? ' (' + T('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}{fl.area === 'delt' ? ' · ' + T('Dine private') + ': ' + mb(u.my_private_bytes) + ' / ' + mb(u.my_private_quota_bytes) : ''}</p></>}
      {u && sysFree === 0 && <p className="ch-note warn" data-ch-full>{T('Den samlede lagringsplassen i ConnectHub er full. Nye opplastinger er stoppet til det er frigjort plass. Nedlasting virker som før.')}</p>}
      {collab ? <p className="ch-muted" data-ch-link>{curLink ? <>{T('Delt mellom')} <b>{churchName(churchId)}</b> {T('og')} <b>{other(curLink)}</b>. {T('Kopiene teller i kvoten til menigheten som bidro.')}</> : null}</p>
      : canUpload ? <div className={'ch-drop' + (fl.over ? ' over' : '')} onDragOver={e => { e.preventDefault(); setFl(f => ({ ...f, over: true })); }} onDragLeave={() => setFl(f => ({ ...f, over: false }))}
        onDrop={e => { e.preventDefault(); setFl(f => ({ ...f, over: false })); upload([...e.dataTransfer.files]); }}>
        <div className="ch-row" style={{ justifyContent: 'center' }}>
          <label className="ch-btn primary">{T('Last opp bilder')}<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { const l = [...e.target.files]; e.target.value = ''; upload(l); }} /></label>
          {fl.area === 'delt' && <label className="ch-row ch-muted"><input type="checkbox" checked={fl.priv} onChange={e => setFl(f => ({ ...f, priv: e.target.checked }))} /> {T('Privat (bare meg)')}</label>}
        </div>
        <p className="ch-muted" style={{ marginTop: 8 }}>{T('…eller dra bildene hit')} → {T((A.folders.find(x => x[0] === fl.folder) || [])[1] || '')}</p>
      </div> : <p className="ch-note warn">{T('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')}</p>}
    </Card>
    {collab ? (curLink ? [['oss', fl.list.filter(x => x.church_id === churchId), T('Fra oss')], ['dem', fl.list.filter(x => x.church_id !== churchId), T('Fra') + ' ' + other(curLink)]].map(([k, list, title]) =>
      <Card key={k} title={title} sub={fl.loading ? null : list.length}>
        {list.length ? <div className="ch-thumbs">{list.map(x => thumb(x, <>
          <span className="ch-muted">{T('Lagt inn av')} {x.church_id === churchId ? churchName(churchId) : other(curLink)} · {fmtDate(x.created_at)}</span>
          <div className="ch-row">
            <Btn small onClick={() => download(x)}>{T('Last ned')}</Btn>
            {k === 'oss' && admin_ && <Btn small kind="danger" onClick={() => removeCopy(x)}>{T('Fjern fra Samarbeidsfiler')}</Btn>}
          </div></>))}</div> : <Empty>{T(fl.loading ? 'Laster …' : 'Ingen bilder her ennå.')}</Empty>}
      </Card>) : <Card><Empty>{T('Ingen aktive koblinger.')}</Empty></Card>)
    : <Card title={(A.folders.find(x => x[0] === fl.folder) || [])[1] || ''} sub={fl.loading ? null : fl.list.length}>
      {fl.list.length ? <div className="ch-thumbs">{fl.list.map(x => {
        const mine = x.uploaded_by === me.id, canDel = admin_ || (fl.area === 'delt' && mine);
        return thumb(x, <>
          <span className="ch-muted">{mb(x.file_size)} · {fmtDate(x.created_at)}</span>
          <div className="ch-row">
            <Btn small onClick={() => download(x)}>{T('Last ned')}</Btn>
            {canCopy(x) && <Btn small onClick={() => setFl(f => ({ ...f, copy: { file: x, link: f.link || (f.links[0] || {}).id } }))}>{T('Del i Samarbeidsfiler')}</Btn>}
            {canDel && <Btn small kind="danger" onClick={act(async () => { if (!confirm(T('Slette filen?'))) return; await FS.remove(x.id); say(T('Filen er slettet.')); setFl(f => ({ ...f, list: f.list.filter(y => y.id !== x.id) })); await load(undefined, undefined, { usage: true }); })}>{T('Slett')}</Btn>}
          </div></>);
      })}</div> : <Empty>{T(fl.loading ? 'Laster …' : 'Ingen filer i denne mappen.')}</Empty>}
    </Card>}
    {fl.copy && <Dialog title={T('Del i Samarbeidsfiler')} onClose={() => setFl(f => ({ ...f, copy: null }))}>
      <form onSubmit={doCopy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ch-copy>
        {fl.links.length > 1 && <Field label="Kobling"><select className="ch-select" value={fl.copy.link} onChange={e => { const v = e.target.value; setFl(f => ({ ...f, copy: { ...f.copy, link: v } })); }}>{fl.links.map(l => <option key={l.id} value={l.id}>{T('Med')} {other(l)}</option>)}</select></Field>}
        <p>{T('En kopi av bildet')} «{fl.copy.file.file_name}» {T('legges i Samarbeidsfiler mellom')} <b>{churchName(churchId)}</b> {T('og')} <b>{other(fl.links.find(l => l.id === fl.copy.link) || {})}</b>. {T('Begge menighetene kan se og laste den ned. Originalen blir liggende i')} «{T(FOLDER_NAME[fl.copy.file.folder] || 'Delt mappe')}».</p>
        <div className="ch-row"><Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Del kopi')}</Btn><Btn onClick={() => setFl(f => ({ ...f, copy: null }))}>{T('Avbryt')}</Btn></div>
      </form>
    </Dialog>}
  </>;
}

/* ---------- Samarbeid: koblinger mellom to menigheter (bare Moderator) ---------- */
/* Moderator oppretter, avslutter og gjenåpner koblinger. Hver kobling har sin egen Samarbeidsfiler-mappe som bare de to
   menighetene ser. Moderator ser bare filnavn og opplysninger om filene (A2) – aldri innhold, miniatyrer eller nedlasting –
   og kan ikke slette filer, bare avslutte koblingen (da skjules filene for begge, ingenting slettes). */
export function LinksView() {
  const { act, say } = useAdmin();
  const [s, setS] = React.useState({ list: [], dir: [], a: '', b: '', sel: null, meta: [], loading: true });
  const seq = React.useRef(0);
  const load = async (sel = s.sel) => {
    const n = ++seq.current; if (sel) setS(p => ({ ...p, sel }));
    const [list, dir] = await Promise.all([LK.mine(), SP.directory().catch(() => [])]);
    const cur = sel && list.some(l => l.id === sel) ? sel : (list.find(l => l.status === 'active') || list[0] || {}).id || null;
    const meta = cur ? await LK.filesMeta(cur).catch(() => []) : [];
    if (n === seq.current) setS(p => ({ ...p, list, dir, sel: cur, meta, loading: false }));
  };
  React.useEffect(() => { act(() => load())(); }, []);
  const cur = s.list.find(l => l.id === s.sel);
  const cname = id => cur && id === cur.church_a ? cur.church_a_name : cur && id === cur.church_b ? cur.church_b_name : (s.dir.find(d => d.id === id) || {}).name || T('Menighet');
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await load(); });
  const create = act(async e => {
    e.preventDefault();
    const id = await LK.create(s.a, s.b); setS(p => ({ ...p, a: '', b: '' }));
    say(T('Koblingen er opprettet. Admin i begge menighetene er varslet.')); await load(id);
  });
  const end = l => run(() => { if (!confirm(T('Avslutte koblingen') + ' «' + linkName(l) + '»?\n\n' + T('Samarbeidsfilene skjules for begge menighetene. Ingen filer slettes, og koblingen kan gjenåpnes.'))) throw Object.assign(new Error(), { code: 'cancel' }); return LK.end(l.id); }, 'Koblingen er avsluttet. Filene er skjult, ingenting er slettet.');
  const active = s.list.filter(l => l.status === 'active');
  return <div className="ch-grid">
    <Card title="Ny kobling">
      <p className="ch-muted">{T('Kobler sammen to menigheter. De får en felles Samarbeidsfiler-mappe der de kan dele kopier av bilder. Menighetene ser aldri hverandres vanlige filer.')}</p>
      <form className="ch-form" onSubmit={create} data-ch-newlink>
        <Field label="Menighet 1"><select className="ch-select" value={s.a} onChange={e => { const v = e.target.value; setS(p => ({ ...p, a: v })); }} required>
          <option value="">{T('Velg menighet …')}</option>{s.dir.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Menighet 2"><select className="ch-select" value={s.b} onChange={e => { const v = e.target.value; setS(p => ({ ...p, b: v })); }} required>
          <option value="">{T('Velg menighet …')}</option>{s.dir.filter(d => d.id !== s.a).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <div className="ch-row"><Btn kind="primary" disabled={!s.a || !s.b || s.a === s.b} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Opprett kobling')}</Btn></div>
      </form>
    </Card>
    <Card title="Koblinger" sub={active.length + ' ' + T('aktive')}>
      <List cols="minmax(160px,1fr) auto auto" empty={s.loading ? 'Laster …' : 'Ingen koblinger ennå.'} onRow={r => act(() => load(r.key))()} rows={s.list.map(l => ({ key: l.id, cells: [
        <div><b>{linkName(l)}</b><div className="ch-muted">{l.status === 'active' ? T('Opprettet') + ' ' + fmtDate(l.created_at) : T('Avsluttet') + ' ' + fmtDate(l.ended_at)}</div></div>,
        <span className="ch-row">{l.status === 'active' ? <Badge tone="ok">{T('Aktiv')}</Badge> : <Badge>{T('Avsluttet')}</Badge>}{l.id === s.sel && <Badge>{T('Valgt')}</Badge>}</span>,
        <div className="ch-end">{l.status === 'active'
          ? <Btn small kind="danger" onClick={end(l)}>{T('Avslutt')}</Btn>
          : <Btn small onClick={run(() => LK.reopen(l.id), 'Koblingen er gjenåpnet. Filene er synlige igjen.')}>{T('Gjenåpne')}</Btn>}</div>] }))} />
    </Card>
    {cur && <Card title={linkName(cur)} sub={s.meta.length}>
      <p className="ch-muted">{T('Filene i koblingens Samarbeidsfiler. Som Moderator ser du bare filnavn og opplysninger – ikke innholdet – og du kan ikke laste ned eller slette.')}</p>
      <List cols="minmax(140px,1fr) auto minmax(100px,auto) auto" head={['Fil', 'Størrelse', 'Lagt inn av', 'Dato']} empty="Ingen filer i koblingen." rows={s.meta.map(f => ({ key: f.id, cells: [
        <span style={{ wordBreak: 'break-all' }}>{f.file_name}</span>, <span className="ch-muted">{mb(f.file_size)}</span>, <span>{cname(f.church_id)}</span>, <span className="ch-muted">{fmtDate(f.created_at)}</span>] }))} />
    </Card>}
  </div>;
}

/* ---------- Abonnement ---------- */
const priceText = v => v === 0 ? T('Gratis') : v ? v + ' kr/mnd' : T('Avtales');

/* Developer endrer planens veiledende lagring og pris (trinn 19/21). Databasen krever MFA og loggfører gammel og ny verdi.
   Planen endrer aldri menighetenes faktiske kvote (standard 200 MB eller egen kvote). Ingen filer slettes. */
function PlanEditor({ plan, onCancel, onDone }) {
  const { act, say } = useAdmin();
  const [f, setF] = React.useState({ quota: String(plan.storage_quota_mb), price: plan.price_nok_month == null ? '' : String(plan.price_nok_month) });
  const qs = f.quota.trim(), ps = f.price.trim();
  const okQ = /^\d{1,5}$/.test(qs) && +qs <= 10240, okP = ps === '' || /^\d{1,7}$/.test(ps);
  const q = okQ ? +qs : null, price = ps === '' ? null : +ps;
  const quotaChanged = okQ && q !== plan.storage_quota_mb, priceChanged = okP && price !== plan.price_nok_month;
  const save = act(async e => {
    e.preventDefault();
    if (!okQ || !okP || (!quotaChanged && !priceChanged)) return;
    const lines = [T('Lagre endringen for') + ' «' + T(plan.name) + '»?'];
    if (quotaChanged) lines.push(T('Planens lagring (veiledende)') + ': ' + plan.storage_quota_mb + ' MB → ' + q + ' MB');
    if (priceChanged) lines.push(T('Pris') + ': ' + priceText(plan.price_nok_month) + ' → ' + priceText(price));
    lines.push(T('Menighetenes faktiske kvoter endres ikke.'));
    if (!confirm(lines.join('\n'))) return;
    await SUB.updatePlan(plan.code, q, price);
    say(T('Planen er endret.'));
    await onDone();
  });
  return <form className="ch-form ch-plan-edit" onSubmit={save} aria-label={T('Endre plan') + ' ' + T(plan.name)}>
    <Field label="Planens lagring (MB, veiledende, 0–10240)"><input className="ch-input" inputMode="numeric" value={f.quota} onChange={e => setF(x => ({ ...x, quota: e.target.value }))} aria-invalid={!okQ} /></Field>
    <Field label="Pris (kr/mnd, tom = Avtales)"><input className="ch-input" inputMode="numeric" value={f.price} onChange={e => setF(x => ({ ...x, price: e.target.value }))} aria-invalid={!okP} /></Field>
    {(!okQ || !okP) && <p className="ch-note bad">{T('Lagring må være et helt tall mellom 0 og 10240. Pris må være et helt tall (eller tom).')}</p>}
    <div className="ch-row">
      <Btn kind="primary" disabled={!okQ || !okP || (!quotaChanged && !priceChanged)} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre plan')}</Btn>
      <Btn onClick={onCancel}>{T('Avbryt')}</Btn>
    </div>
    <p className="ch-muted">{T('Endringen loggføres med gammel og ny verdi. Planens lagring er bare veiledende – menighetenes faktiske kvoter endres ikke. Ingen filer slettes.')}</p>
  </form>;
}
/* Trinn 20 – samlet lagringsplass for hele ConnectHub (bare Developer): bruk, grense, summen av kvotene og endring av
   grensen. Overbooking er lov; den samlede sperren stopper opplasting når plassen er brukt opp. */
function StorageCard() {
  const { act, say } = useAdmin();
  const [o, setO] = React.useState(null), [v, setV] = React.useState('');
  const load = async () => { const r = await admin.storageOverview(); setO(r); setV(String(r.limit_mb)); };
  React.useEffect(() => { act(load)(); }, []);
  if (!o) return null;
  const lim = o.limit_mb * 1048576, pct = lim ? Math.min(100, Math.round(100 * o.used_bytes / lim)) : 0, ok = /^\d{1,7}$/.test(v.trim()) && +v >= 1 && +v <= 1048576;
  const save = act(async e => {
    e.preventDefault(); if (!ok || +v === o.limit_mb) return;
    if (!confirm(T('Endre den samlede lagringsgrensen') + ': ' + o.limit_mb + ' MB → ' + (+v) + ' MB?\n\n' + T('Ingen filer slettes. Er bruken over den nye grensen, stoppes nye opplastinger.'))) return;
    await admin.setStorageLimit(+v); say(T('Den samlede lagringsgrensen er endret.')); await load();
  });
  return <Card title="Samlet lagringsplass">
    <div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
    <p data-ch-storage>{T('Brukt')}: {mb(o.used_bytes)} {T('av')} {o.limit_mb} MB ({pct} %) · {T('Ledig')}: {mb(Math.max(0, lim - o.used_bytes))}</p>
    <p className="ch-muted">{T('Summen av alle menighetenes kvoter')}: {o.quota_sum_mb} MB ({o.churches} {T('menigheter')}){o.quota_sum_mb > o.limit_mb ? <> · <Badge tone="warn">{T('Overbooket')}</Badge></> : null}</p>
    <form className="ch-form" onSubmit={save}>
      <Field label="Samlet grense (MB)"><input className="ch-input" inputMode="numeric" value={v} onChange={e => setV(e.target.value)} aria-invalid={!ok} /></Field>
      <Btn disabled={!ok || +v === o.limit_mb} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre grense')}</Btn>
    </form>
    <p className="ch-muted">{T('Grensen gjelder alle filer i ConnectHub til sammen. Kvotene kan til sammen være større (overbooking); da stoppes opplasting for alle når den samlede plassen er brukt opp. Du får varsel ved 80 % og 90 %. Endringer loggføres.')}</p>
  </Card>;
}
/* Menighetens faktiske kvote, brukt og ledig plass (Admin for egen menighet; Developer ser det samme her). */
function ChurchQuotaCard({ church, usage }) {
  const quota = usage ? usage.quota_bytes : church.storage_quota_mb * 1048576, used = usage ? usage.used_bytes : null;
  return <Card title="Menighetens lagring">
    <div className="ch-row" data-ch-quota><span>{T('Faktisk kvote')}: <b>{church.storage_quota_mb} MB</b></span><QuotaBadge church={church} /></div>
    {used != null && <p className="ch-muted">{T('Brukt')}: {mb(used)} · {T('Ledig')}: {mb(Math.min(Math.max(0, quota - used), usage && usage.system_free_bytes != null ? usage.system_free_bytes : Infinity))}{usage && usage.system_free_bytes != null && usage.system_free_bytes < quota - used ? ' (' + T('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}</p>}
    <p className="ch-muted">{T('Standard er 200 MB. Trenger menigheten mer plass, kan Developer eller Moderator tildele en egen kvote. Abonnementet endrer ikke kvoten.')}</p>
  </Card>;
}
export function SubsView({ churchId }) {
  const { staff, canManage, churchName, act, say, reload, d } = useAdmin();
  const [sub, setSub] = React.useState({ plans: [], current: [], reqs: [], usage: null, plan: 'standard', free: true, reason: '', note: '' });
  const [editing, setEditing] = React.useState(null);   // plankode som redigeres (bare Developer)
  const churchOf = id => d.churches.find(c => c.id === id) || {};
  /* Planenes veiledende lagring kan bare Developer lese; Admin og User får plannavn og pris. */
  const load = async () => { const [plans, current, reqs, usage] = await Promise.all([staff ? SUB.plansAdmin() : SUB.plans(), SUB.current(churchId), SUB.requests(churchId), churchId ? FS.usage(churchId).catch(() => null) : null]); setSub(p => ({ ...p, plans, current, reqs, usage })); };
  React.useEffect(() => { act(load)(); }, [churchId, staff]);
  const run = (fn, ok) => act(async () => { await fn(); say(T(ok)); await load(); await reload(); });
  const quotaText = c => c && c.id ? <span className="ch-row"><span>{c.storage_quota_mb} MB</span><QuotaBadge church={c} /></span> : '–';
  return <div className="ch-grid">
    {churchId && churchOf(churchId).id && <ChurchQuotaCard church={churchOf(churchId)} usage={sub.usage} />}
    {staff && !churchId && <StorageCard />}
    <Card title="Planer">
      <List cols={staff ? '1fr auto auto auto' : '1fr auto'} head={staff ? ['Plan', 'Planens lagring (veiledende)', 'Pris', ''] : ['Plan', 'Pris']} rows={sub.plans.map(p => ({ key: p.code, cells: [T(p.name),
        ...(staff ? [p.storage_quota_mb + ' MB'] : []), priceText(p.price_nok_month),
        ...(staff ? [<div className="ch-end"><Btn small onClick={() => setEditing(editing === p.code ? null : p.code)}>{T(editing === p.code ? 'Lukk' : 'Endre')}</Btn></div>] : [])] }))} />
      {staff && editing && <PlanEditor key={editing} plan={sub.plans.find(p => p.code === editing)} onCancel={() => setEditing(null)} onDone={async () => { setEditing(null); await load(); await reload(); }} />}
      {staff && <p className="ch-muted">{T('Planens lagring er bare veiledende og gir ikke menigheten mer plass automatisk. Menighetens faktiske kvote er standard 200 MB, eller en egen kvote som du tildeler under Menigheter → Innstillinger.')}</p>}
      <p className="ch-muted">{T('Det tas ikke betalt i ConnectHub ennå. Menigheter kan be om et abonnement eller om gratis abonnement; Developer eller Moderator godkjenner. Abonnementet endrer ikke lagringskvoten.')}</p>
    </Card>
    <Card title="Nåværende abonnement">
      <List cols="1fr auto auto auto" head={['Menighet', 'Plan', 'Gratis', 'Faktisk kvote']} empty="Ingen abonnement registrert. Kvoten er standard 200 MB." rows={sub.current.map(c => ({ key: c.church_id, cells: [churchName(c.church_id), c.plan, T(c.free_of_charge ? 'Ja' : 'Nei'), quotaText(churchOf(c.church_id))] }))} />
      {churchId && canManage(churchId) && !staff && <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => SUB.request(churchId, sub.plan, sub.free, sub.reason), 'Forespørselen er sendt.')(e); }}>
        <Field label="Plan"><select className="ch-select" value={sub.plan} onChange={e => setSub(p => ({ ...p, plan: e.target.value }))}>{sub.plans.map(p => <option key={p.code} value={p.code}>{T(p.name)}</option>)}</select></Field>
        <Field label="Begrunnelse (valgfritt)"><input className="ch-input" value={sub.reason} onChange={e => setSub(p => ({ ...p, reason: e.target.value }))} maxLength={1000} /></Field>
        <label className="ch-row ch-muted"><input type="checkbox" checked={sub.free} onChange={e => setSub(p => ({ ...p, free: e.target.checked }))} /> {T('Be om gratis abonnement')}</label>
        <Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Send forespørsel')}</Btn>
      </form>}
    </Card>
    <Card title="Forespørsler" sub={sub.reqs.filter(r => r.status === 'pending').length + ' ' + T('venter')}>
      {staff && <Field label="Merknad til avgjørelsen (valgfritt)"><input className="ch-input" value={sub.note} onChange={e => setSub(p => ({ ...p, note: e.target.value }))} maxLength={500} /></Field>}
      <List cols="minmax(140px,1fr) auto auto auto" head={['Menighet og plan', 'Gratis', 'Status', '']} empty="Ingen forespørsler." rows={sub.reqs.map(r => ({ key: r.id, cells: [
        <div><b>{churchName(r.church_id)}</b><div className="ch-muted">{r.plan}{r.reason ? ' · ' + r.reason : ''}{r.decision_note ? ' · ' + r.decision_note : ''}</div>
          {staff && r.status === 'pending' && churchOf(r.church_id).id && <div className="ch-row ch-muted">{T('Nåværende kvote')}: {quotaText(churchOf(r.church_id))} · {T('endres ikke ved godkjenning')}</div>}</div>,
        T(r.free_of_charge ? 'Ja' : 'Nei'), <StatusBadge s={r.status} />,
        r.status === 'pending' ? (staff ? <div className="ch-end">
          <Btn small kind="primary" onClick={run(() => SUB.decide(r.id, true, sub.note), 'Forespørselen er godkjent.')}>{T('Godkjenn')}</Btn>
          <Btn small kind="danger" onClick={run(() => SUB.decide(r.id, false, sub.note), 'Forespørselen er avslått.')}>{T('Avslå')}</Btn>
        </div> : <Btn small onClick={run(() => SUB.withdraw(r.id), 'Forespørselen er trukket tilbake.')}>{T('Trekk tilbake')}</Btn>) : <span />] }))} />
    </Card>
  </div>;
}

/* ---------- Logg ---------- */
export function LogView({ churchId }) {
  const { churchName, userName, act } = useAdmin();
  const [log, setLog] = React.useState([]), [q, setQ] = React.useState(''), [kind, setKind] = React.useState('all');
  React.useEffect(() => { act(async () => setLog(await admin.audit(churchId)))(); }, [churchId]);
  const kinds = [...new Set(log.map(l => l.action.split('.')[0]))];
  const KIND = { churches: 'Menigheter', memberships: 'Medlemskap', user_roles: 'Roller', invitations: 'Invitasjoner', app_users: 'Brukere', files: 'Filer', message: 'Meldinger', spaces: 'Samarbeid', plans: 'Abonnement', subscription_requests: 'Abonnement', church_subscriptions: 'Abonnement', account: 'Kontoer', audit_logs: 'Logg' };
  const list = log.filter(l => (kind === 'all' || l.action.startsWith(kind + '.')) && (!q || norm(T(actionName(l.action)) + ' ' + userName(l.actor_user_id) + ' ' + (l.church_id ? churchName(l.church_id) : '') + ' ' + (l.reason || '')).includes(norm(q))));
  return <>
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk i loggen …" />
      <Select label="Type" value={kind} onChange={setKind} options={[['all', 'Alle typer'], ...kinds.map(k => [k, KIND[k] || k])]} />
    </div>
    <List cols="minmax(120px,auto) minmax(140px,1fr) minmax(160px,1.5fr) minmax(100px,1fr)" head={['Tid', 'Hvem', 'Hendelse', 'Menighet']} empty="Ingen hendelser."
      rows={list.map(l => ({ key: l.id, cells: [<span className="ch-muted">{fmt(l.created_at)}</span>, userName(l.actor_user_id),
        <span>{T(actionName(l.action))}{[l.meta && l.meta.role && T(ROLE[l.meta.role] || l.meta.role), l.reason].filter(Boolean).map((x, i) => <span key={i} className="ch-muted"> · {x}</span>)}</span>,
        <span className="ch-muted">{l.church_id ? churchName(l.church_id) : '–'}</span>] }))} />
    <p className="ch-muted">{T('Loggen kan ikke endres eller slettes. Den viser de siste 200 hendelsene.')}</p>
  </>;
}
