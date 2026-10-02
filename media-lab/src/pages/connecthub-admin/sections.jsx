/* ConnectHub admin – Menigheter, Invitasjoner, Filer, Samarbeid, Abonnement og Logg. */
import React from 'react';
import { admin, DEFAULT_QUOTA_MB } from '../../services/admin.js';
import { files as FS, FOLDERS } from '../../services/files.js';
import { spaces as SP, links as LK, linkName, activeMembers, otherChurches, memberName, MAX_GROUP_CHURCHES, subscriptions as SUB, notifications as NOTI, churchLife, downloadJson } from '../../services/community.js';
import { T, errText, ROLE, fmt, fmtDate, mb, norm, Btn, Badge, StatusBadge, RoleBadge, Avatar, Card, Empty, Field, Search, Select, List, Dialog, href, go } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';
import { Thumb, downloadOriginal } from './thumbs.jsx';
import { memberActions, fill } from './members.js';
import { useLogos, ChurchLogo, forgetLogo } from './logos.jsx';
import { clearMe } from '../../services/me-cache.js';

const ACTIONS = {
  'churches.insert': 'Menighet opprettet', 'churches.update': 'Menighet endret', 'churches.delete': 'Menighet slettet', 'churches.purge': 'Menighet slettet for godt',
  'memberships.insert': 'Medlem lagt til', 'memberships.update': 'Medlemskap endret', 'memberships.delete': 'Medlemskap fjernet', 'memberships.remove': 'Fjernet fra menighet', 'files.cleanup': 'Private filer ryddet', 'files.cleanup_storage': 'Ryddet fil fjernet fra lagringen',
  'user_roles.insert': 'Rolle gitt', 'user_roles.update': 'Rolle endret eller fjernet', 'user_roles.delete': 'Rolle slettet',
  'invitations.insert': 'Invitasjon laget', 'invitations.update': 'Invitasjon endret', 'invitations.delete': 'Invitasjon slettet',
  'app_users.insert': 'Bruker opprettet', 'app_users.update': 'Bruker endret', 'app_users.delete': 'Bruker slettet',
  'files.insert': 'Fil lastet opp', 'files.update': 'Fil endret', 'files.delete': 'Fil slettet', 'message.send': 'Melding sendt',
  'spaces.create': 'Samarbeidsområde opprettet', 'spaces.invite': 'Invitert til samarbeid', 'spaces.membership': 'Samarbeid endret',
  'spaces.update': 'Samarbeidsområde endret', 'spaces.status': 'Samarbeidsområde arkivert eller åpnet', 'spaces.delete': 'Samarbeidsområde slettet',
  'links.create': 'Kobling opprettet', 'links.end': 'Kobling avsluttet', 'links.reopen': 'Kobling gjenåpnet',
  'roles.extra_admin_add': 'Ekstra Admin lagt til', 'roles.extra_admin_remove': 'Ekstra Admin fjernet',
  'groups.create': 'Samarbeidsgruppe opprettet', 'groups.update': 'Samarbeidsgruppe endret', 'groups.add_church': 'Menighet lagt til i samarbeidsgruppe',
  'groups.remove_church': 'Menighet fjernet fra samarbeidsgruppe', 'groups.end': 'Samarbeidsgruppe avsluttet', 'groups.reopen': 'Samarbeidsgruppe gjenåpnet', 'groups.delete': 'Samarbeidsgruppe slettet',
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

/* Developer/Moderator: legg deg til eller fjern deg som EKSTRA Admin i menigheten. Den faste Admin er uendret. Databasen
   kontrollerer rolle og MFA, varsler Admin og loggfører. Siden lastes på nytt etterpå, så egne rettigheter (whoami) oppdateres. */
function ExtraAdminCard({ church }) {
  const { me, d, act } = useAdmin();
  const mine = d.roles.find(r => r.role === 'church_admin' && r.church_id === church.id && r.user_id === me.id);
  if (mine && !mine.extra_admin) return null;   // fast Admin i menigheten
  const done = () => { clearMe(); location.reload(); };
  const add = act(async () => {
    if (!confirm(fill(T('Legge deg til som ekstra Admin i «{church}»?'), { church: church.name }) + '\n\n' + T('Du får Admin-tilgang i menigheten (medlemmer, filer og Faste) i tillegg til menighetens faste Admin, som er uendret. Er du ikke medlem, blir du lagt til som medlem. Admin i menigheten varsles, og handlingen loggføres.'))) return;
    await admin.addSelfAsAdmin(church.id); done();
  });
  const remove = act(async () => {
    if (!confirm(fill(T('Fjerne deg som ekstra Admin i «{church}»?'), { church: church.name }) + '\n\n' + T('Ble du medlem da du la deg til, fjernes også medlemskapet. Den faste Admin er uendret.'))) return;
    await admin.removeSelfAsAdmin(church.id); done();
  });
  return <Card title="Ekstra Admin"><div data-ch-extraadmin>
    <p className="ch-muted">{T(mine ? 'Du er ekstra Admin i denne menigheten. Den faste Admin-rollen er uendret.' : 'Som Developer eller Moderator kan du legge deg til som ekstra Admin, for eksempel for å hjelpe menigheten. Den faste Admin-rollen er uendret.')}</p>
    <div className="ch-row">{mine ? <Btn small kind="danger" onClick={remove}>{T('Fjern meg som ekstra Admin')}</Btn> : <Btn small kind="primary" onClick={add}>{T('Legg meg til som ekstra Admin')}</Btn>}</div>
  </div></Card>;
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
    {staff && <ExtraAdminCard church={church} />}
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk etter medlem …" />
      <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle'], ['active', 'Aktive'], ['disabled', 'Deaktiverte'], ['admin', 'Admin'], ['removed', 'Fjernet (tidligere medlemmer)']]} />
      {manage && <Btn kind="primary" onClick={() => openInvite({ church: id })}>+ {T('Inviter medlem')}</Btn>}
    </div>
    <List cols="minmax(220px,2fr) auto auto" head={['Medlem', 'Status', '']} empty="Ingen medlemmer passer med søket."
      onRow={r => go('brukere', r.key)}
      rows={rows.map(({ m, u, adm }) => ({ key: m.user_id, cells: [
        <div className="ch-who"><Avatar name={u ? (u.full_name || u.email) : '?'} /><div><b>{u ? (u.full_name || u.email) : T('Ukjent bruker')}</b><span>{u ? u.email : ''}</span></div></div>,
        <div className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}{adm && adm.extra_admin && <Badge>{T('ekstra')}</Badge>}{u && u.status !== 'active' && <Badge tone="bad">{T('Konto deaktivert')}</Badge>}</div>,
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

/* Logo: Admin i menigheten (eller stab som er medlem) laster opp et bilde til Faste → Logoer med den vanlige, kontrollerte
   opplastingen (bare bilder, 4 MB, innholdet sjekkes på serveren) og velger det som logo. Gamle logoer slettes aldri. */
function LogoCard({ church }) {
  const { act, say, reload } = useAdmin();
  const logos = useLogos([church.logo_file_id]), url = logos[church.logo_file_id];
  const input = React.useRef(null);
  const upload = act(async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    const f = await FS.upload(file, { churchId: church.id, folder: 'logoer' });
    await admin.setChurchLogo(church.id, f.id); forgetLogo(church.logo_file_id);
    say(T('Logoen er lagret. Den vises på oversikten for alle i menigheten.')); await reload();
  });
  const clear = act(async () => {
    if (!confirm(T('Fjerne logoen?') + '\n\n' + T('Menigheten vises med forbokstaver i stedet. Bildet blir liggende i Faste → Logoer.'))) return;
    await admin.setChurchLogo(church.id, null); say(T('Logoen er fjernet.')); await reload();
  });
  return <Card title="Logo">
    <div className="ch-logo-preview" data-ch-logocard>
      <ChurchLogo url={url} name={church.name} size={72} />
      <div><b>{church.name}</b><div className="ch-muted">{T(church.logo_file_id ? 'Denne logoen vises på oversikten.' : 'Ingen logo ennå – forbokstavene vises i stedet.')}</div></div>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={upload} data-ch-logoinput />
    <div className="ch-row">
      <Btn kind="primary" onClick={() => input.current && input.current.click()}>{T(church.logo_file_id ? 'Bytt logo' : 'Last opp logo')}</Btn>
      {church.logo_file_id && <Btn onClick={clear}>{T('Fjern logo')}</Btn>}
    </div>
    <p className="ch-muted">{T('PNG, JPG, WebP eller GIF, høyst 4 MB. Kvadratiske logoer blir finest.')}</p>
  </Card>;
}

function ChurchSettings({ church }) {
  const { staff, act, say, reload, canManage, adminOf, me } = useAdmin();
  const logoOk = (adminOf || []).includes(church.id) || (staff && (me.churches || []).some(c => c.id === church.id));
  const [name, setName] = React.useState(church.name), [quota, setQuota] = React.useState(church.storage_quota_mb ?? DEFAULT_QUOTA_MB);
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await reload(); });
  const used = (useQuotaOverview(staff, church.storage_quota_mb)[church.id] || {}).used_bytes;
  const [so, setSo] = React.useState(null);
  React.useEffect(() => { if (staff) admin.storageOverview().then(setSo).catch(() => {}); }, [staff, church.storage_quota_mb]);
  return <div className="ch-grid">
    {logoOk && <LogoCard church={church} />}
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
  /* Aktive samarbeidsgrupper der denne menigheten er aktivt medlem (databasen gir bare grupper for egne menigheter). */
  const loadLinks = async () => {
    const all = await LK.mine().catch(() => []);
    const links = all.filter(l => l.status === 'active' && activeMembers(l).some(m => m.church_id === churchId));
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
  const curLink = fl.links.find(l => l.id === fl.link), others = l => otherChurches(l, churchId);
  const othersText = l => others(l).map(m => m.name).join(', ') || T('(ingen andre menigheter)');
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
    say(fill(T('En kopi er lagt i Samarbeidsfiler i gruppen «{name}».'), { name: linkName(l) }));
    await load(undefined, undefined, { usage: true });
  });
  const removeCopy = x => act(async () => {
    if (!confirm(T('Den delte kopien slettes for alle menighetene i gruppen. Originalen i') + ' «' + T(FOLDER_NAME[x.source_folder] || 'Delt mappe') + '» ' + T('blir liggende.') + '\n\n' + T('Fjerne fra Samarbeidsfiler?'))) return;
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
      {collab && fl.links.length > 1 && <div className="ch-row" data-ch-groups>{fl.links.map(l => <Btn key={l.id} small kind={fl.link === l.id ? 'primary' : ''} onClick={() => { if (fl.link !== l.id) act(() => load('samarbeid', 'samarbeid', { link: l.id }))(); }}>{linkName(l)}</Btn>)}</div>}
      {u && <><div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
        <p className="ch-muted" data-ch-meter>{T('Brukt')}: {mb(u.used_bytes)} {T('av')} {mb(u.quota_bytes)} ({T(u.quota_bytes === DEFAULT_QUOTA_MB * 1048576 ? 'standard' : 'egen kvote')}) · {T('Ledig')}: {mb(free)}{bySystem ? ' (' + T('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}{fl.area === 'delt' ? ' · ' + T('Dine private') + ': ' + mb(u.my_private_bytes) + ' / ' + mb(u.my_private_quota_bytes) : ''}</p></>}
      {u && sysFree === 0 && <p className="ch-note warn" data-ch-full>{T('Den samlede lagringsplassen i ConnectHub er full. Nye opplastinger er stoppet til det er frigjort plass. Nedlasting virker som før.')}</p>}
      {collab ? <p className="ch-muted" data-ch-link>{curLink ? <>{T('Samarbeidsgruppe')} <b>{linkName(curLink)}</b>{curLink.description ? ' – ' + curLink.description : ''}. {T('Menigheter i gruppen')}: <b>{churchName(churchId)}</b>, {othersText(curLink)}. {T('Kopiene teller i kvoten til menigheten som bidro.')}</> : null}</p>
      : canUpload ? <div className={'ch-drop' + (fl.over ? ' over' : '')} onDragOver={e => { e.preventDefault(); setFl(f => ({ ...f, over: true })); }} onDragLeave={() => setFl(f => ({ ...f, over: false }))}
        onDrop={e => { e.preventDefault(); setFl(f => ({ ...f, over: false })); upload([...e.dataTransfer.files]); }}>
        <div className="ch-row" style={{ justifyContent: 'center' }}>
          <label className="ch-btn primary">{T('Last opp bilder')}<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { const l = [...e.target.files]; e.target.value = ''; upload(l); }} /></label>
          {fl.area === 'delt' && <label className="ch-row ch-muted"><input type="checkbox" checked={fl.priv} onChange={e => setFl(f => ({ ...f, priv: e.target.checked }))} /> {T('Privat (bare meg)')}</label>}
        </div>
        <p className="ch-muted" style={{ marginTop: 8 }}>{T('…eller dra bildene hit')} → {T((A.folders.find(x => x[0] === fl.folder) || [])[1] || '')}</p>
      </div> : <p className="ch-note warn">{T('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')}</p>}
    </Card>
    {collab ? (curLink ? [['oss', fl.list.filter(x => x.church_id === churchId), T('Fra oss')],
      ...others(curLink).map(m => [m.church_id, fl.list.filter(x => x.church_id === m.church_id), T('Fra') + ' ' + m.name])].map(([k, list, title]) =>
      <Card key={k} title={title} sub={fl.loading ? null : list.length}>
        {list.length ? <div className="ch-thumbs">{list.map(x => thumb(x, <>
          <span className="ch-muted">{T('Lagt inn av')} {x.church_id === churchId ? churchName(churchId) : memberName(curLink, x.church_id)} · {fmtDate(x.created_at)}</span>
          <div className="ch-row">
            <Btn small onClick={() => download(x)}>{T('Last ned')}</Btn>
            {k === 'oss' && admin_ && <Btn small kind="danger" onClick={() => removeCopy(x)}>{T('Fjern fra Samarbeidsfiler')}</Btn>}
          </div></>))}</div> : <Empty>{T(fl.loading ? 'Laster …' : 'Ingen bilder her ennå.')}</Empty>}
      </Card>) : <Card><Empty>{T('Ingen aktive samarbeidsgrupper.')}</Empty></Card>)
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
        {fl.links.length > 1 && <Field label="Samarbeidsgruppe"><select className="ch-select" value={fl.copy.link} onChange={e => { const v = e.target.value; setFl(f => ({ ...f, copy: { ...f.copy, link: v } })); }}>{fl.links.map(l => <option key={l.id} value={l.id}>{linkName(l)}</option>)}</select></Field>}
        <p>{T('En kopi av bildet')} «{fl.copy.file.file_name}» {T('legges i Samarbeidsfiler i gruppen')} <b>{linkName(fl.links.find(l => l.id === fl.copy.link))}</b> ({churchName(churchId)}, {othersText(fl.links.find(l => l.id === fl.copy.link))}). {T('Alle menighetene i gruppen kan se og laste den ned. Originalen blir liggende i')} «{T(FOLDER_NAME[fl.copy.file.folder] || 'Delt mappe')}».</p>
        <div className="ch-row"><Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Del kopi')}</Btn><Btn onClick={() => setFl(f => ({ ...f, copy: null }))}>{T('Avbryt')}</Btn></div>
      </form>
    </Dialog>}
  </>;
}

/* ---------- Samarbeid: samarbeidsgrupper (Developer og Moderator) ---------- */
/* Developer/Moderator oppretter grupper med 2–20 menigheter, endrer navn og beskrivelse, legger til og fjerner menigheter,
   avslutter, gjenåpner og sletter avsluttede grupper. Hver gruppe har sin egen Samarbeidsfiler-mappe som bare
   medlemsmenighetene ser. Stab ser bare filnavn og opplysninger om filene (A2) – aldri innhold, miniatyrer eller nedlasting.
   Fjernes en menighet, skjules kopiene den har delt (ingenting slettes); legges den til igjen, vises de igjen. Alt
   kontrolleres på nytt i databasen (rolle, MFA, 2–20 menigheter med lås på gruppen) og loggføres. */
const cancel = () => { throw Object.assign(new Error(), { code: 'cancel' }); };
const groupNameOk = n => { const v = String(n || '').trim(); return v.length >= 2 && v.length <= 80; };
export function LinksView() {
  const { act, say } = useAdmin();
  const [s, setS] = React.useState({ list: [], dir: [], sel: null, meta: [], loading: true });
  const [nf, setNf] = React.useState({ name: '', desc: '', picked: [], q: '' });
  const [ed, setEd] = React.useState(null);
  const [add, setAdd] = React.useState('');
  const seq = React.useRef(0);
  const load = async (sel = s.sel) => {
    const n = ++seq.current;
    const [list, dir] = await Promise.all([LK.mine(), SP.directory().catch(() => [])]);
    const cur = sel && list.some(l => l.id === sel) ? sel : (list.find(l => l.status === 'active') || list[0] || {}).id || null;
    const meta = cur ? await LK.filesMeta(cur).catch(() => []) : [];
    if (n === seq.current) setS(p => ({ ...p, list, dir, sel: cur, meta, loading: false }));
  };
  React.useEffect(() => { act(() => load())(); }, []);
  const cur = s.list.find(l => l.id === s.sel), members = activeMembers(cur), full = members.length >= MAX_GROUP_CHURCHES;
  const run = (fn, ok, sel) => act(async () => { const msg = await fn(); await load(sel); say(typeof msg === 'string' ? msg : T(ok)); });
  const pick = id => setNf(f => ({ ...f, picked: f.picked.includes(id) ? f.picked.filter(x => x !== id) : f.picked.length >= MAX_GROUP_CHURCHES ? f.picked : [...f.picked, id] }));
  const canCreate = groupNameOk(nf.name) && nf.desc.trim().length <= 500 && nf.picked.length >= 2 && nf.picked.length <= MAX_GROUP_CHURCHES;
  const create = act(async e => {
    e.preventDefault(); if (!canCreate) return;
    const id = await LK.create(nf.name, nf.desc, nf.picked);
    say(fill(T('Samarbeidsgruppen «{name}» er opprettet. Admin i alle menighetene er varslet.'), { name: nf.name.trim() }));
    setNf({ name: '', desc: '', picked: [], q: '' }); await load(id);
  });
  const saveEdit = act(async e => {
    e.preventDefault(); if (!ed || !groupNameOk(ed.name) || ed.desc.trim().length > 500) return;
    await LK.update(cur.id, ed.name, ed.desc); setEd(null); say(T('Navn og beskrivelse er lagret.')); await load();
  });
  const removeChurch = m => run(async () => {
    if (!confirm(fill(T('Fjerne «{church}» fra samarbeidsgruppen «{name}»?'), { church: m.name, name: linkName(cur) }) + '\n\n' +
      fill(T('{church} mister med en gang tilgang til gruppen. Kopiene menigheten har delt ({n}), skjules for alle – ingenting slettes. Legges menigheten til igjen, vises kopiene igjen. Andre menigheters kopier påvirkes ikke.'), { church: m.name, n: m.copies || 0 }))) cancel();
    await LK.removeChurch(cur.id, m.church_id);
    return fill(T('«{church}» er fjernet fra gruppen. Kopiene den delte, er skjult.'), { church: m.name });
  });
  const addChurch = (churchId, nameOf) => run(async () => {
    const rejoin = (cur.members || []).some(m => m.church_id === churchId);
    await LK.addChurch(cur.id, churchId); setAdd('');
    return fill(T(rejoin ? '«{church}» er med i gruppen igjen. Kopiene den delte før, er synlige igjen.' : '«{church}» er lagt til i gruppen. Admin i menighetene er varslet.'), { church: nameOf });
  });
  const end = l => run(() => { if (!confirm(fill(T('Avslutte samarbeidsgruppen «{name}»?'), { name: linkName(l) }) + '\n\n' + T('Samarbeidsfilene skjules for alle menighetene i gruppen. Ingen filer slettes, og gruppen kan gjenåpnes.'))) cancel(); return LK.end(l.id); }, 'Gruppen er avsluttet. Filene er skjult, ingenting er slettet.', l.id);
  const reopen = l => run(() => LK.reopen(l.id), 'Gruppen er gjenåpnet. Filene er synlige igjen.', l.id);
  /* Sletting av en AVSLUTTET gruppe: gruppen, medlemslisten og alle kopiene (også skjulte) slettes. Originalene i
     menighetene røres ikke. Antall kopier vises i bekreftelsen. Databasen godtar bare avsluttede grupper og loggfører. */
  const removeLink = l => act(async () => {
    const meta = await LK.filesMeta(l.id).catch(() => []);
    const n = (meta || []).length, bytes = (meta || []).reduce((s, f) => s + Number(f.file_size || 0), 0);
    if (!confirm(fill(T('Slette den avsluttede samarbeidsgruppen «{name}» permanent?'), { name: linkName(l) }) + '\n\n' +
      (n ? fill(T('{n} kopier i Samarbeidsfiler ({size}) slettes også, medregnet kopier som er skjult. Originalene i menighetene røres ikke.'), { n, size: mb(bytes) }) : T('Gruppen har ingen Samarbeidsfiler.')) + '\n' +
      T('Kan ikke angres. Handlingen loggføres.'))) return;
    const r = await LK.remove(l.id);
    await load(null);
    say(fill(T('Samarbeidsgruppen «{name}» er slettet.'), { name: linkName(l) }) + (r.copies ? ' ' + fill(T('{n} kopier er fjernet.'), { n: r.copies }) : '') +
      (r.storage_failed ? ' ' + fill(T('{n} filer kunne ikke fjernes fra lagringen ennå – prøv igjen.'), { n: r.storage_failed }) : ''), !r.storage_failed);
  });
  const active = s.list.filter(l => l.status === 'active');
  const dirShown = s.dir.filter(d => !nf.q || norm(d.name).includes(norm(nf.q)));
  const addable = cur ? s.dir.filter(d => !(cur.members || []).some(m => m.church_id === d.id)) : [];
  const chips = l => <span className="ch-row" style={{ flexWrap: 'wrap', gap: 4 }}>{activeMembers(l).map(m => <Badge key={m.church_id}>{m.name}</Badge>)}</span>;
  const byChurch = (cur ? (cur.members || []) : []).map(m => [m, s.meta.filter(f => f.church_id === m.church_id)])
    .concat(s.meta.some(f => !(cur && cur.members || []).some(m => m.church_id === f.church_id)) ? [[{ church_id: null, name: T('(slettet menighet)'), status: 'left' }, s.meta.filter(f => !(cur.members || []).some(m => m.church_id === f.church_id))]] : [])
    .filter(([, list]) => list.length);
  return <div className="ch-grid">
    <Card title="Ny samarbeidsgruppe">
      <p className="ch-muted">{T('Samler to eller flere menigheter (høyst 20) i en gruppe med felles Samarbeidsfiler-mappe der de kan dele kopier av bilder. Menighetene ser aldri hverandres vanlige filer.')}</p>
      <form className="ch-form" onSubmit={create} data-ch-newgroup>
        <Field label="Navn"><input className="ch-input" value={nf.name} maxLength={80} onChange={e => { const v = e.target.value; setNf(f => ({ ...f, name: v })); }} placeholder={T('F.eks. Påskeprosjekt')} required /></Field>
        <Field label="Beskrivelse (valgfritt)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} value={nf.desc} maxLength={500} onChange={e => { const v = e.target.value; setNf(f => ({ ...f, desc: v })); }} /></Field>
        <Field label="Menigheter"><input className="ch-input ch-search" style={{ flex: 'none' }} type="search" value={nf.q} onChange={e => { const v = e.target.value; setNf(f => ({ ...f, q: v })); }} placeholder={T('Søk etter menighet …')} /></Field>
        <div role="group" aria-label={T('Velg menigheter')} data-ch-pick style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 2px' }}>
          {dirShown.length ? dirShown.map(d => <label key={d.id} className="ch-row" style={{ gap: 8, minHeight: 32 }}>
            <input type="checkbox" checked={nf.picked.includes(d.id)} disabled={!nf.picked.includes(d.id) && nf.picked.length >= MAX_GROUP_CHURCHES} onChange={() => pick(d.id)} /> <span>{d.name}</span></label>)
            : <span className="ch-muted">{T('Ingen menigheter funnet.')}</span>}
        </div>
        <p className="ch-muted" data-ch-picked>{fill(T('{n} valgt – velg 2 til 20 menigheter.'), { n: nf.picked.length })}</p>
        <div className="ch-row"><Btn kind="primary" disabled={!canCreate} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Opprett gruppe')}</Btn></div>
      </form>
    </Card>
    <Card title="Samarbeidsgrupper" sub={active.length + ' ' + T('aktive')}>
      <List cols="minmax(0,1fr) auto" empty={s.loading ? 'Laster …' : 'Ingen samarbeidsgrupper ennå.'} onRow={r => { setEd(null); setAdd(''); act(() => load(r.key))(); }} rows={s.list.map(l => ({ key: l.id, cells: [
        <div data-ch-group={l.id}><b>{linkName(l)}</b>
          <div className="ch-muted">{l.status === 'active' ? T('Opprettet') + ' ' + fmtDate(l.created_at) : T('Avsluttet') + ' ' + fmtDate(l.ended_at)}
            {l.copies != null && ' · ' + fill(T('{n} kopier'), { n: l.copies }) + ' (' + mb(l.bytes) + ')'}{l.hidden_copies ? ' · ' + fill(T('{n} skjult'), { n: l.hidden_copies }) : ''}</div>
          {chips(l)}
          <span className="ch-row">{l.status === 'active' ? <Badge tone="ok">{T('Aktiv')}</Badge> : <Badge>{T('Avsluttet')}</Badge>}{l.id === s.sel && <Badge>{T('Valgt')}</Badge>}</span></div>,
        <div className="ch-end">{l.status === 'active'
          ? <Btn small kind="danger" onClick={end(l)}>{T('Avslutt')}</Btn>
          : <><Btn small onClick={reopen(l)}>{T('Gjenåpne')}</Btn><Btn small kind="danger" data-ch-deletelink onClick={removeLink(l)}>{T('Slett')}</Btn></>}</div>] }))} />
    </Card>
    {cur && <Card title={linkName(cur)} sub={cur.status === 'active' ? T('Aktiv') : T('Avsluttet')}>
      <div data-ch-groupdetail>
        {ed ? <form className="ch-form" onSubmit={saveEdit} data-ch-editgroup>
          <Field label="Navn"><input className="ch-input" value={ed.name} maxLength={80} onChange={e => { const v = e.target.value; setEd(x => ({ ...x, name: v })); }} required /></Field>
          <Field label="Beskrivelse (valgfritt)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} value={ed.desc} maxLength={500} onChange={e => { const v = e.target.value; setEd(x => ({ ...x, desc: v })); }} /></Field>
          <div className="ch-row"><Btn kind="primary" disabled={!groupNameOk(ed.name)} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre')}</Btn><Btn onClick={() => setEd(null)}>{T('Avbryt')}</Btn></div>
        </form> : <><p className="ch-muted">{cur.description || T('Ingen beskrivelse.')}</p>
          <div className="ch-row"><Btn small onClick={() => setEd({ name: cur.name, desc: cur.description || '' })}>{T('Endre navn og beskrivelse')}</Btn></div></>}
        {cur.status !== 'active' && <p className="ch-note">{T('Gruppen er avsluttet. Menigheter kan legges til eller fjernes, men ingenting vises før gruppen gjenåpnes.')}</p>}
        <h3 className="ch-h3">{T('Menigheter i gruppen')} ({members.length}/{MAX_GROUP_CHURCHES})</h3>
        <List cols="minmax(0,1fr) auto" empty="Ingen menigheter." rows={(cur.members || []).map(m => ({ key: m.church_id, cells: [
          <div data-ch-member={m.church_id}><b>{m.name}</b> {m.status === 'active' ? <Badge tone="ok">{T('Med i gruppen')}</Badge> : <Badge>{T('Fjernet')}</Badge>}
            <div className="ch-muted">{m.status === 'active' ? T('Med siden') + ' ' + fmtDate(m.joined_at) : T('Fjernet') + ' ' + fmtDate(m.left_at) + ' · ' + T('kopiene er skjult')}
              {m.copies != null && ' · ' + fill(T('{n} kopier'), { n: m.copies }) + ' (' + mb(m.bytes) + ')'}</div></div>,
          <div className="ch-end">{m.status === 'active'
            ? <Btn small kind="danger" disabled={members.length <= 2} onClick={removeChurch(m)}>{T('Fjern')}</Btn>
            : <Btn small disabled={full} onClick={addChurch(m.church_id, m.name)}>{T('Legg til igjen')}</Btn>}</div>] }))} />
        {members.length <= 2 && <p className="ch-muted" data-ch-minnote>{T('En gruppe må ha minst to menigheter. Vil du stoppe samarbeidet, avslutt gruppen i stedet.')}</p>}
        {full ? <p className="ch-note" data-ch-fullnote>{T('Gruppen har 20 menigheter, som er det høyeste. Fjern en menighet før du legger til en ny.')}</p>
          : <div className="ch-row" style={{ flexWrap: 'wrap' }} data-ch-addchurch>
            <select className="ch-select" aria-label={T('Legg til menighet')} value={add} onChange={e => setAdd(e.target.value)}>
              <option value="">{T('Legg til menighet …')}</option>{addable.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <Btn small kind="primary" disabled={!add} onClick={addChurch(add, (s.dir.find(d => d.id === add) || {}).name)}>{T('Legg til')}</Btn></div>}
      </div>
    </Card>}
    {cur && <Card title="Filer i gruppen" sub={s.meta.length}>
      <p className="ch-muted">{T('Filene i gruppens Samarbeidsfiler, ordnet etter menigheten som delte dem. Som Developer eller Moderator ser du bare filnavn og opplysninger – ikke innholdet – og du kan ikke laste ned eller slette. Kopier fra menigheter som ikke er med nå, er skjult for alle.')}</p>
      {byChurch.length ? byChurch.map(([m, list]) => <div key={m.church_id || 'x'} data-ch-metagroup>
        <h3 className="ch-h3">{m.name} {list.some(f => f.hidden) && <Badge tone="warn">{T('Skjult – menigheten er ikke med i gruppen')}</Badge>}</h3>
        <List cols="minmax(140px,1fr) auto auto" head={['Fil', 'Størrelse', 'Dato']} empty="" rows={list.map(f => ({ key: f.id, cells: [
          <span style={{ wordBreak: 'break-all' }}>{f.file_name}</span>, <span className="ch-muted">{mb(f.file_size)}</span>, <span className="ch-muted">{fmtDate(f.created_at)}</span>] }))} />
      </div>) : <Empty>{T('Ingen filer i gruppen.')}</Empty>}
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
