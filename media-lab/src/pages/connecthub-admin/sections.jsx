/* ConnectHub admin – Menigheter, Invitasjoner, Filer, Samarbeid, Abonnement og Logg. */
import React from 'react';
import { admin } from '../../services/admin.js';
import { files as FS, FOLDERS } from '../../services/files.js';
import { spaces as SP, subscriptions as SUB, notifications as NOTI, churchLife, downloadJson } from '../../services/community.js';
import { T, errText, ROLE, fmt, fmtDate, mb, norm, Btn, Badge, StatusBadge, RoleBadge, Avatar, Card, Empty, Field, Search, Select, List, href, go } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';

const ACTIONS = {
  'churches.insert': 'Menighet opprettet', 'churches.update': 'Menighet endret', 'churches.delete': 'Menighet slettet', 'churches.purge': 'Menighet slettet for godt',
  'memberships.insert': 'Medlem lagt til', 'memberships.update': 'Medlemskap endret', 'memberships.delete': 'Medlemskap fjernet',
  'user_roles.insert': 'Rolle gitt', 'user_roles.update': 'Rolle endret eller fjernet', 'user_roles.delete': 'Rolle slettet',
  'invitations.insert': 'Invitasjon laget', 'invitations.update': 'Invitasjon endret', 'invitations.delete': 'Invitasjon slettet',
  'app_users.insert': 'Bruker opprettet', 'app_users.update': 'Bruker endret', 'app_users.delete': 'Bruker slettet',
  'files.insert': 'Fil lastet opp', 'files.update': 'Fil endret', 'files.delete': 'Fil slettet', 'message.send': 'Melding sendt',
  'spaces.create': 'Samarbeidsområde opprettet', 'spaces.invite': 'Invitert til samarbeid', 'spaces.membership': 'Samarbeid endret',
  'subscription_requests.insert': 'Abonnement forespurt', 'subscription_requests.update': 'Abonnementsforespørsel endret',
  'church_subscriptions.insert': 'Abonnement satt', 'church_subscriptions.update': 'Abonnement endret',
  'account.delete': 'Konto slettet', 'audit_logs.purge': 'Gammel logg slettet',
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
export function ChurchesView() {
  const { d, staff, isUser, act, say, reload, userName } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('all'), [name, setName] = React.useState('');
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
    <List cols="minmax(200px,2fr) auto minmax(140px,1.5fr) auto" head={['Menighet', 'Medlemmer', 'Admin', 'Status']} empty="Ingen menigheter passer med søket."
      onRow={r => go('menigheter', r.key)}
      rows={list.map(c => ({ key: c.id, cells: [
        <div className="ch-who"><Avatar name={c.name} /><div><b>{c.name}</b><span>{T('Opprettet')} {fmtDate(c.created_at)}</span></div></div>,
        <span>{count(c.id)} <span className="ch-muted">{T('medlemmer')}</span></span>,
        <span className="ch-muted">{admins(c.id).join(', ') || '–'}</span>,
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
  const rows = d.memberships.filter(m => m.church_id === id).map(m => ({ m, u: d.users.find(u => u.id === m.user_id), adm: d.roles.find(r => r.role === 'church_admin' && r.church_id === id && r.user_id === m.user_id) }))
    .filter(x => (!q || norm((x.u && (x.u.full_name + ' ' + x.u.email)) || '').includes(norm(q))) && (st === 'all' || x.m.status === st || (st === 'admin' && x.adm)))
    .sort((a, b) => String(a.u && (a.u.full_name || a.u.email)).localeCompare(String(b.u && (b.u.full_name || b.u.email)), 'no'));
  const run = (fn, ok) => act(async () => { await fn(); say(T(ok)); await reload(); });
  return <>
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk etter medlem …" />
      <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle'], ['active', 'Aktive'], ['disabled', 'Deaktiverte'], ['admin', 'Admin']]} />
      {manage && <Btn kind="primary" onClick={() => openInvite({ church: id })}>+ {T('Inviter medlem')}</Btn>}
    </div>
    <List cols="minmax(220px,2fr) auto auto" head={['Medlem', 'Status', '']} empty="Ingen medlemmer passer med søket."
      onRow={r => go('brukere', r.key)}
      rows={rows.map(({ m, u, adm }) => ({ key: m.user_id, cells: [
        <div className="ch-who"><Avatar name={u ? (u.full_name || u.email) : '?'} /><div><b>{u ? (u.full_name || u.email) : T('Ukjent bruker')}</b><span>{u ? u.email : ''}</span></div></div>,
        <div className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}{u && u.status !== 'active' && <Badge tone="bad">{T('Konto deaktivert')}</Badge>}</div>,
        m.user_id === me.id ? <span className="ch-muted">{T('Deg')}</span> : <div className="ch-end">
          {manage && (m.status === 'active'
            ? <Btn small kind="danger" onClick={run(() => admin.setMembershipStatus(m.user_id, id, 'disabled'), 'Medlemskapet er deaktivert.')}>{T('Deaktiver')}</Btn>
            : <Btn small onClick={run(() => admin.setMembershipStatus(m.user_id, id, 'active'), 'Medlemskapet er aktivert.')}>{T('Aktiver')}</Btn>)}
          {staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(m.user_id, 'church_admin', id, 'Admin-siden'), 'Brukeren er nå admin.')}>{T('Gjør til admin')}</Btn>}
          {staff && adm && <Btn small onClick={run(() => admin.revokeRole(adm.id, 'Admin-siden'), 'Admin-rollen er fjernet.')}>{T('Fjern admin')}</Btn>}
        </div>] }))} />
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
  const [name, setName] = React.useState(church.name), [quota, setQuota] = React.useState(church.storage_quota_mb || 200);
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await reload(); });
  return <div className="ch-grid">
    {staff && <Card title="Navn og lagring">
      <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.renameChurch(church.id, name), 'Navnet er endret.')(); }}>
        <Field label="Navn"><input className="ch-input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre navn')}</Btn>
      </form>
      <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.setQuota(church.id, Math.max(0, Math.min(10240, parseInt(quota, 10) || 0))), 'Lagringskvoten er endret.')(); }}>
        <Field label="Lagringskvote (MB)"><input className="ch-input" type="number" min={0} max={10240} value={quota} onChange={e => setQuota(e.target.value)} /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre kvote')}</Btn>
      </form>
      <p className="ch-muted">{T('Kvoten settes også automatisk når et abonnement godkjennes.')}</p>
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

/* ---------- Filer: to adskilte områder ---------- */
/* Faste = felles ressurser som brukes av flere verktøy (Photo Design, Thumbnail Studio, Mockups …). Bare Admin
   vedlikeholder; alle medlemmer ser og laster ned. Delt mappe = medlemmene deler bilder; Admin rydder.
   Mappenavnene i databasen er uendret (faste, logoer, bakgrunner, mockups, bilder), så verktøyene som bruker dem virker som før. */
const AREAS = {
  faste: { label: 'Faste – felles ressurser', folders: [['faste', 'Faste bilder'], ['logoer', 'Logoer'], ['bakgrunner', 'Bakgrunner'], ['mockups', 'Mockups']],
    info: 'Felles bilder og logoer som brukes i flere verktøy (Photo Design, Thumbnail Studio, Mockups m.fl.). Admin legger til, organiserer og fjerner. Alle medlemmer kan se og laste ned.' },
  delt: { label: 'Delt mappe', folders: [['bilder', 'Delt mappe']],
    info: 'Bilder som deles i menigheten. Alle medlemmer kan se, laste ned og legge til egne bilder. Du kan slette dine egne; Admin kan rydde i alt.' },
};
export function FilesView({ churchId }) {
  const { me, canManage, act, say } = useAdmin();
  const admin_ = canManage(churchId);
  const [fl, setFl] = React.useState({ area: 'faste', folder: 'faste', list: [], thumbs: {}, usage: null, priv: false, over: false });
  const load = async (folder = fl.folder, area = fl.area) => {
    const [list, usage] = await Promise.all([FS.list({ churchId, folder }), FS.usage(churchId)]);
    const thumbs = await FS.objectUrls(list.slice(0, 60).map(x => x.id));
    setFl(f => { Object.values(f.thumbs).forEach(u => URL.revokeObjectURL(u)); return { ...f, area, folder, list, thumbs, usage }; });
  };
  React.useEffect(() => { if (churchId) act(() => load())(); }, [churchId]);
  const A = AREAS[fl.area], canUpload = fl.area === 'delt' || admin_;
  const upload = act(async list => {
    if (!canUpload) return;
    let n = 0; for (const file of list) { try { await FS.upload(file, { churchId, folder: fl.folder, priv: fl.area === 'delt' && fl.priv }); n++; } catch (err) { say(file.name + ': ' + errText(err), false); } }
    if (n) say(n + ' ' + T('filer er lastet opp.')); await load();
  });
  const download = act(async x => {
    const u = fl.thumbs[x.id] || (await FS.objectUrls([x.id]))[x.id]; if (!u) throw Object.assign(new Error(), { code: 'not_found' });
    const a = document.createElement('a'); a.href = u; a.download = x.file_name; document.body.appendChild(a); a.click(); a.remove();
  });
  const u = fl.usage, pct = u && u.quota_bytes ? Math.min(100, Math.round(100 * u.used_bytes / u.quota_bytes)) : 0;
  return <>
    <nav className="ch-tabs" aria-label={T('Filområder')}>{Object.entries(AREAS).map(([k, v]) => <a key={k} href="#" className={fl.area === k ? 'on' : ''} onClick={e => { e.preventDefault(); act(() => load(v.folders[0][0], k))(); }}>{T(v.label)}</a>)}</nav>
    <Card title={A.label} sub={fl.area === 'faste' ? T(admin_ ? 'Du kan vedlikeholde' : 'Bare visning og nedlasting') : null}>
      <p className="ch-muted">{T(A.info)}</p>
      {A.folders.length > 1 && <div className="ch-row">{A.folders.map(([f, l]) => <Btn key={f} small kind={fl.folder === f ? 'primary' : ''} onClick={act(() => load(f))}>{T(l)}</Btn>)}</div>}
      {u && <><div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
        <p className="ch-muted">{T('Brukt')}: {mb(u.used_bytes)} / {mb(u.quota_bytes)}{fl.area === 'delt' ? ' · ' + T('Dine private') + ': ' + mb(u.my_private_bytes) + ' / ' + mb(u.my_private_quota_bytes) : ''}</p></>}
      {canUpload ? <div className={'ch-drop' + (fl.over ? ' over' : '')} onDragOver={e => { e.preventDefault(); setFl(f => ({ ...f, over: true })); }} onDragLeave={() => setFl(f => ({ ...f, over: false }))}
        onDrop={e => { e.preventDefault(); setFl(f => ({ ...f, over: false })); upload([...e.dataTransfer.files]); }}>
        <div className="ch-row" style={{ justifyContent: 'center' }}>
          <label className="ch-btn primary">{T('Last opp bilder')}<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { const l = [...e.target.files]; e.target.value = ''; upload(l); }} /></label>
          {fl.area === 'delt' && <label className="ch-row ch-muted"><input type="checkbox" checked={fl.priv} onChange={e => setFl(f => ({ ...f, priv: e.target.checked }))} /> {T('Privat (bare meg)')}</label>}
        </div>
        <p className="ch-muted" style={{ marginTop: 8 }}>{T('…eller dra bildene hit')} → {T((A.folders.find(x => x[0] === fl.folder) || [])[1] || '')}</p>
      </div> : <p className="ch-note warn">{T('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')}</p>}
    </Card>
    <Card title={(A.folders.find(x => x[0] === fl.folder) || [])[1] || ''} sub={fl.list.length}>
      {fl.list.length ? <div className="ch-thumbs">{fl.list.map(x => {
        const mine = x.uploaded_by === me.id, canDel = admin_ || (fl.area === 'delt' && mine);
        return <div key={x.id} className="ch-thumb">
          <div className="ch-img" style={{ backgroundImage: fl.thumbs[x.id] ? 'url(' + fl.thumbs[x.id] + ')' : 'none' }} />
          <span style={{ wordBreak: 'break-all' }}>{x.file_name} {x.visibility === 'private' && <Badge>{T('Privat')}</Badge>}</span>
          <span className="ch-muted">{mb(x.file_size)} · {fmtDate(x.created_at)}</span>
          <div className="ch-row">
            <Btn small onClick={() => download(x)}>{T('Last ned')}</Btn>
            {canDel && <Btn small kind="danger" onClick={act(async () => { if (!confirm(T('Slette filen?'))) return; await FS.remove(x.id); say(T('Filen er slettet.')); await load(); })}>{T('Slett')}</Btn>}
          </div>
        </div>;
      })}</div> : <Empty>{T('Ingen filer i denne mappen.')}</Empty>}
    </Card>
  </>;
}

/* ---------- Samarbeid ---------- */
/* Moderator (og Developer teknisk) administrerer: oppretter områder, gjør dem tilgjengelige for menigheter og velger
   hvilke fellesbilder som deles. Brukere ser bare områder som er gjort tilgjengelige, og kan se og laste ned. Admin har
   ikke tilgang (verken her eller i databasen). */
export function SpacesView() {
  const { collab, act, say } = useAdmin();
  const [sp, setSp] = React.useState({ list: [], sel: null, members: [], files: [], dir: [], cands: [], thumbs: {}, name: '', add: '' });
  const load = async (sel = sp.sel) => {
    const list = await SP.list(), dir = collab ? await SP.directory().catch(() => []) : [];
    const cur = sel && list.some(x => x.id === sel) ? sel : (list.find(x => x.status === 'active') || list[0] || {}).id || null;
    const [members, files] = cur ? await Promise.all([SP.members(cur), SP.files(cur)]) : [[], []];
    const active = new Set(members.filter(m => m.status === 'active').map(m => m.church_id));
    const cands = collab && cur ? (await FS.list()).filter(f => f.visibility === 'church' && active.has(f.church_id)) : [];
    const shownIds = collab ? cands.map(f => f.id) : files.map(f => f.file_id);
    const thumbs = await FS.objectUrls(shownIds.slice(0, 60));
    setSp(p => { Object.values(p.thumbs).forEach(u => URL.revokeObjectURL(u)); return { ...p, list, dir, sel: cur, members, files, cands, thumbs }; });
  };
  React.useEffect(() => { act(() => load())(); }, []);
  const cur = sp.list.find(x => x.id === sp.sel), cname = id => (sp.dir.find(d => d.id === id) || {}).name || T('Menighet');
  const shared = new Set(sp.files.map(f => f.file_id));
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await load(); });
  const download = act(async (id, name) => { const u = sp.thumbs[id] || (await FS.objectUrls([id]))[id]; if (!u) return; const a = document.createElement('a'); a.href = u; a.download = name || 'bilde'; document.body.appendChild(a); a.click(); a.remove(); });

  return <div className="ch-grid">
    <Card title="Samarbeidsområder" sub={sp.list.length}>
      {sp.list.length ? <List cols="1fr auto" onRow={r => act(() => load(r.key))()} rows={sp.list.map(x => ({ key: x.id, cells: [<b>{x.name}</b>,
        <div className="ch-end">{x.status !== 'active' && <Badge>{T('Arkivert')}</Badge>}{x.id === sp.sel && <Badge tone="ok">{T('Valgt')}</Badge>}</div>] }))} />
        : <Empty>{T(collab ? 'Ingen samarbeidsområder ennå.' : 'Ingen samarbeid er gjort tilgjengelig for deg ennå.')}</Empty>}
      {collab && <form className="ch-row" onSubmit={e => { e.preventDefault(); act(async () => { const id = await SP.create(sp.name); setSp(p => ({ ...p, name: '' })); say(T('Området er opprettet.')); await load(id); })(); }}>
        <input className="ch-input" style={{ flex: '1 1 200px' }} placeholder={T('Navn på nytt område')} value={sp.name} onChange={e => setSp(p => ({ ...p, name: e.target.value }))} minLength={2} maxLength={120} required />
        <Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Opprett område')}</Btn>
      </form>}
    </Card>

    {cur && collab && <Card title={cur.name} sub={cur.status !== 'active' ? T('Arkivert') : null} actions={
      <Btn small onClick={run(() => SP.setStatus(cur.id, cur.status === 'active' ? 'archived' : 'active'), cur.status === 'active' ? 'Området er arkivert.' : 'Området er åpnet igjen.')}>{T(cur.status === 'active' ? 'Arkiver' : 'Åpne igjen')}</Btn>}>
      <p className="ch-muted">{T('Menigheter med tilgang. Medlemmene ser delte bilder; Admin-rollen har ikke tilgang til samarbeid.')}</p>
      <List cols="1fr auto auto" empty="Ingen menigheter har tilgang ennå." rows={sp.members.map(m => ({ key: m.church_id, cells: [cname(m.church_id), <StatusBadge s={m.status} />,
        <div className="ch-end">{m.status === 'active'
          ? <Btn small kind="danger" onClick={run(() => SP.setMembership(cur.id, m.church_id, 'left'), 'Tilgangen er fjernet.')}>{T('Fjern tilgang')}</Btn>
          : <Btn small onClick={run(() => SP.invite(cur.id, m.church_id), 'Menigheten har fått tilgang.')}>{T('Gi tilgang igjen')}</Btn>}</div>] }))} />
      <div className="ch-row">
        <select className="ch-select" value={sp.add} onChange={e => setSp(p => ({ ...p, add: e.target.value }))} aria-label={T('Gi en menighet tilgang')}>
          <option value="">{T('Gi en menighet tilgang …')}</option>
          {sp.dir.filter(d => !sp.members.some(m => m.church_id === d.id && m.status === 'active')).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Btn disabled={!sp.add} onClick={run(async () => { await SP.invite(cur.id, sp.add); setSp(p => ({ ...p, add: '' })); }, 'Menigheten har fått tilgang. Medlemmene er varslet.')}>{T('Gi tilgang')}</Btn>
      </div>
    </Card>}

    {cur && collab && <Card title="Hva som deles" sub={shared.size}>
      <p className="ch-muted">{T('Velg fellesbilder fra menighetene som deltar. Private filer kan aldri deles, og video finnes ikke i ConnectHub.')}</p>
      {sp.cands.length ? <div className="ch-thumbs">{sp.cands.map(x => <div key={x.id} className="ch-thumb">
        <div className="ch-img" style={{ backgroundImage: sp.thumbs[x.id] ? 'url(' + sp.thumbs[x.id] + ')' : 'none' }} />
        <span style={{ wordBreak: 'break-all' }}>{x.file_name}</span><span className="ch-muted">{cname(x.church_id)}</span>
        <Btn small kind={shared.has(x.id) ? '' : 'primary'} onClick={run(() => SP.share(x.id, cur.id, !shared.has(x.id)))}>{T(shared.has(x.id) ? 'Fjern fra området' : 'Del i området')}</Btn>
      </div>)}</div> : <Empty>{T('Ingen fellesbilder i menighetene som deltar.')}</Empty>}
    </Card>}

    {cur && !collab && <Card title={cur.name} sub={sp.files.length}>
      <p className="ch-muted">{sp.members.filter(m => m.status === 'active').length} {T('menigheter deltar.')} {T('Du kan se og laste ned bildene som deles her.')}</p>
      {sp.files.length ? <div className="ch-thumbs">{sp.files.map(x => <div key={x.file_id} className="ch-thumb">
        <div className="ch-img" style={{ backgroundImage: sp.thumbs[x.file_id] ? 'url(' + sp.thumbs[x.file_id] + ')' : 'none' }} />
        <Btn small onClick={() => download(x.file_id, 'delt-bilde')}>{T('Last ned')}</Btn>
      </div>)}</div> : <Empty>{T('Ingen bilder er delt i området ennå.')}</Empty>}
    </Card>}
  </div>;
}

/* ---------- Abonnement ---------- */
export function SubsView({ churchId }) {
  const { staff, canManage, churchName, act, say, reload } = useAdmin();
  const [sub, setSub] = React.useState({ plans: [], current: [], reqs: [], plan: 'standard', free: true, reason: '', note: '' });
  const load = async () => { const [plans, current, reqs] = await Promise.all([SUB.plans(), SUB.current(churchId), SUB.requests(churchId)]); setSub(p => ({ ...p, plans, current, reqs })); };
  React.useEffect(() => { act(load)(); }, [churchId]);
  const run = (fn, ok) => act(async () => { await fn(); say(T(ok)); await load(); await reload(); });
  return <div className="ch-grid">
    <Card title="Planer">
      <List cols="1fr auto auto" head={['Plan', 'Lagring', 'Pris']} rows={sub.plans.map(p => ({ key: p.code, cells: [T(p.name), p.storage_quota_mb + ' MB', p.price_nok_month === 0 ? T('Gratis') : p.price_nok_month ? p.price_nok_month + ' kr/mnd' : T('Avtales')] }))} />
      <p className="ch-muted">{T('Det tas ikke betalt i ConnectHub ennå. Menigheter kan be om et abonnement eller om gratis abonnement; stab godkjenner. Abonnementet bestemmer lagringskvoten.')}</p>
    </Card>
    <Card title="Nåværende abonnement">
      <List cols="1fr auto auto" head={['Menighet', 'Plan', 'Gratis']} empty="Ingen abonnement registrert (standard: Gratis, 200 MB)." rows={sub.current.map(c => ({ key: c.church_id, cells: [churchName(c.church_id), c.plan, T(c.free_of_charge ? 'Ja' : 'Nei')] }))} />
      {churchId && canManage(churchId) && !staff && <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => SUB.request(churchId, sub.plan, sub.free, sub.reason), 'Forespørselen er sendt.')(); }}>
        <Field label="Plan"><select className="ch-select" value={sub.plan} onChange={e => setSub(p => ({ ...p, plan: e.target.value }))}>{sub.plans.map(p => <option key={p.code} value={p.code}>{T(p.name)}</option>)}</select></Field>
        <Field label="Begrunnelse (valgfritt)"><input className="ch-input" value={sub.reason} onChange={e => setSub(p => ({ ...p, reason: e.target.value }))} maxLength={1000} /></Field>
        <label className="ch-row ch-muted"><input type="checkbox" checked={sub.free} onChange={e => setSub(p => ({ ...p, free: e.target.checked }))} /> {T('Be om gratis abonnement')}</label>
        <Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Send forespørsel')}</Btn>
      </form>}
    </Card>
    <Card title="Forespørsler" sub={sub.reqs.filter(r => r.status === 'pending').length + ' ' + T('venter')}>
      {staff && <Field label="Merknad til avgjørelsen (valgfritt)"><input className="ch-input" value={sub.note} onChange={e => setSub(p => ({ ...p, note: e.target.value }))} maxLength={500} /></Field>}
      <List cols="minmax(140px,1fr) auto auto auto" head={['Menighet og plan', 'Gratis', 'Status', '']} empty="Ingen forespørsler." rows={sub.reqs.map(r => ({ key: r.id, cells: [
        <div><b>{churchName(r.church_id)}</b><div className="ch-muted">{r.plan}{r.reason ? ' · ' + r.reason : ''}{r.decision_note ? ' · ' + r.decision_note : ''}</div></div>,
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
  const KIND = { churches: 'Menigheter', memberships: 'Medlemskap', user_roles: 'Roller', invitations: 'Invitasjoner', app_users: 'Brukere', files: 'Filer', message: 'Meldinger', spaces: 'Samarbeid', subscription_requests: 'Abonnement', church_subscriptions: 'Abonnement', account: 'Kontoer', audit_logs: 'Logg' };
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
