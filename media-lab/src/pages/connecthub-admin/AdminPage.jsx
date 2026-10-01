import React from 'react';
import { admin } from '../../services/admin.js';
import { isStaff, hasRole } from '../../services/data/me.js';
import { files as FS, FOLDERS } from '../../services/files.js';
import { spaces as SP, subscriptions as SUB, notifications as NOTI, churchLife, downloadJson } from '../../services/community.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ERR = {
  forbidden: 'Du har ikke tilgang til dette.', conflict: 'Finnes allerede (eller menigheten har allerede en admin).',
  invalid: 'Ugyldige opplysninger.', rate_limited: 'For mange forsøk. Vent litt.', network: 'Ingen forbindelse. Prøv igjen.',
  not_configured: 'Serveren er ikke satt opp for dette (mangler nøkkel).', unauthorized: 'Økten er utløpt. Last siden på nytt.',
  video_not_allowed: 'Video kan aldri lastes opp. Videoer skal ligge i prosjektmappen på PC-en.', type_not_allowed: 'Bare bilder (PNG, JPG, WebP eller GIF) kan lastes opp.', too_large: 'Filen er for stor (maks 4 MB).', http_413: 'Filen er for stor (maks 4 MB).',
};
const errText = e => T(ERR[e && e.code] || 'Noe gikk galt. Prøv igjen.');
const ROLE = { user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' };
const STATUS = { active: 'Aktiv', disabled: 'Deaktivert', pending: 'Venter', accepted: 'Godtatt', revoked: 'Trukket tilbake', expired: 'Utløpt', invited: 'Invitert', left: 'Har forlatt', declined: 'Avslått', approved: 'Godkjent', rejected: 'Avslått', withdrawn: 'Trukket tilbake', cancelled: 'Avsluttet', temporarily_disabled: 'Midlertidig deaktivert', pending_deletion: 'Venter på sletting', deleted: 'Slettet' };
const fmt = d => d ? new Date(d).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '';

const C = {
  page: { minHeight: '100vh', padding: '72px 16px 80px', fontFamily: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif', color: '#f3f1ec', background: 'transparent' },
  wrap: { maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  bar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  back: { color: '#e9e7e2', textDecoration: 'none', fontWeight: 700, fontSize: '14px' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tab: on => ({ height: '34px', padding: '0 14px', borderRadius: '999px', border: '1px solid ' + (on ? '#f3f1ec' : 'rgba(255,255,255,0.18)'), background: on ? '#f3f1ec' : 'transparent', color: on ? '#000' : '#e9e7e2', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }),
  card: { padding: '16px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', background: 'rgba(12,12,12,0.85)', display: 'flex', flexDirection: 'column', gap: '10px' },
  h: { margin: 0, fontSize: '18px', fontWeight: 800 },
  muted: { color: '#9d998f', fontSize: '12.5px' },
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '6px 8px', color: '#9d998f', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  td: { padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'top', wordBreak: 'break-word' },
  input: { height: '36px', padding: '0 10px', border: '1px solid #2b2b2b', borderRadius: '10px', background: '#0e0e0e', color: '#f3f1ec', fontSize: '14px', minWidth: 0 },
  btn: { height: '32px', padding: '0 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#e9e7e2', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' },
  primary: { height: '36px', padding: '0 16px', borderRadius: '999px', border: 0, background: '#f3f1ec', color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
  danger: { height: '32px', padding: '0 12px', borderRadius: '999px', border: '1px solid #9b1c3c', background: 'transparent', color: '#ff9fb4', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' },
  msg: ok => ({ margin: 0, padding: '10px 12px', borderRadius: '10px', background: ok ? 'rgba(42,157,143,0.2)' : 'rgba(155,28,60,0.25)', color: ok ? '#bdf0e7' : '#ffb4c4', fontSize: '13px' }),
  badge: { display: 'inline-block', padding: '1px 8px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '11px', marginLeft: '6px' },
};

function Table({ cols, rows, empty }) {
  if (!rows.length) return <p style={C.muted}>{T(empty || 'Ingen ennå.')}</p>;
  return <div style={{ overflowX: 'auto' }}><table style={C.table}><thead><tr>{cols.map(c => <th key={c} style={C.th}>{T(c)}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={C.td}>{v}</td>)}</tr>)}</tbody></table></div>;
}

export default function AdminPage({ me }) {
  const staff = isStaff(me) && me.mfa, dev = staff && hasRole(me, 'developer');
  const staffNoMfa = isStaff(me) && !me.mfa;
  const adminOf = (me.roles || []).filter(r => r.role === 'church_admin').map(r => r.church_id);
  const [tab, setTab] = React.useState('overview');
  const [churches, setChurches] = React.useState([]);
  const [church, setChurch] = React.useState(null);
  const [members, setMembers] = React.useState([]);
  const [invites, setInvites] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [globalRoles, setGlobalRoles] = React.useState([]);
  const [log, setLog] = React.useState([]);
  const [status, setStatus] = React.useState(null);
  const [note, setNote] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ email: '', role: 'user', church: '' , name: '' });
  const [fl, setFl] = React.useState({ folder: 'bilder', priv: false, list: [], thumbs: {}, usage: null });
  const [sp, setSp] = React.useState({ list: [], sel: null, members: [], files: [], dir: [], myFiles: [], name: '', invite: '' });
  const [sub, setSub] = React.useState({ plans: [], current: [], reqs: [], plan: 'standard', free: true, reason: '', note: '' });
  const [msg, setMsg] = React.useState({ title: '', body: '' });

  const say = (text, ok = true) => setNote({ text, ok });
  const act = fn => async (...a) => { if (busy) return; setBusy(true); setNote(null); try { await fn(...a); } catch (e) { say(errText(e), false); } finally { setBusy(false); } };

  const loadChurches = async () => {
    const list = await admin.churches(); setChurches(list);
    if (!church || !list.some(c => c.id === church)) setChurch((list.find(c => adminOf.includes(c.id)) || list[0] || {}).id || null);
  };
  const loadChurchData = async id => {
    if (!id) { setMembers([]); return; }
    const [m, inv] = await Promise.all([admin.members(id), admin.invitations(staff ? null : id)]);
    setMembers(m); setInvites(inv);
  };
  const loadStaff = async () => { if (!staff) return; const [u, g, s] = await Promise.all([admin.users(), admin.globalRoles(), admin.systemStatus()]); setUsers(u); setGlobalRoles(g); setStatus(s); };
  const loadLog = async () => setLog(await admin.audit(staff ? null : church));
  const loadFiles = async (folder = fl.folder) => {
    if (!church) return;
    const [list, usage] = await Promise.all([FS.list({ churchId: church, folder }), FS.usage(church)]);
    const thumbs = await FS.objectUrls(list.slice(0, 60).map(x => x.id));
    setFl(f => { Object.values(f.thumbs).forEach(u => URL.revokeObjectURL(u)); return { ...f, folder, list, thumbs, usage }; });
  };

  React.useEffect(() => { act(async () => { await loadChurches(); await loadStaff(); })(); }, []);
  React.useEffect(() => { act(() => loadChurchData(church))(); }, [church]);
  React.useEffect(() => { if (tab === 'log') act(loadLog)(); }, [tab, church]);
  React.useEffect(() => { if (tab === 'files') act(() => loadFiles())(); }, [tab, church]);
  const loadSpaces = async (sel = sp.sel) => {
    const [list, dir] = await Promise.all([SP.list(), SP.directory().catch(() => [])]);
    const cur = sel && list.some(x => x.id === sel) ? sel : (list[0] || {}).id || null;
    const [members, files, myFiles] = cur ? await Promise.all([SP.members(cur), SP.files(cur), church ? FS.list({ churchId: church }) : []]) : [[], [], []];
    setSp(p => ({ ...p, list, dir, sel: cur, members, files, myFiles: myFiles.filter(x => x.visibility === 'church' && x.church_id === church) }));
  };
  const loadSubs = async () => { const [plans, current, reqs] = await Promise.all([SUB.plans(), SUB.current(staff ? null : church), SUB.requests(staff ? null : church)]); setSub(p => ({ ...p, plans, current, reqs })); };
  React.useEffect(() => { if (tab === 'spaces') act(() => loadSpaces())(); if (tab === 'subs') act(loadSubs)(); }, [tab, church]);

  const nameOf = id => { const u = users.find(x => x.id === id) || (members.find(m => m.user_id === id) || {}).user; return u ? (u.full_name || u.email) : (id ? String(id).slice(0, 8) : T('System')); };
  const churchName = id => (churches.find(c => c.id === id) || {}).name || '–';
  const canManage = id => staff || adminOf.includes(id);

  const sendInvite = act(async e => {
    e.preventDefault();
    const global = form.role === 'moderator' || form.role === 'developer';
    const r = await admin.invite(form.email.trim(), form.role, global ? null : (form.church || church));
    setForm(f => ({ ...f, email: '' }));
    say(r.email_sent ? T('Invitasjonen er sendt til') + ' ' + r.invitation.email + '.' : T('Invitasjonen er lagret, men e-posten kunne ikke sendes (e-posttjenesten er ikke satt opp ennå). Prøv «Send på nytt» senere.'), r.email_sent);
    await loadChurchData(church); await loadStaff();
  });

  const tabs = [['overview', 'Oversikt'], ['churches', 'Menigheter'], ['members', 'Medlemmer'], ['invites', 'Invitasjoner'], ['files', 'Filer'], ['spaces', 'Samarbeid'], ['subs', 'Abonnement'], ...(staff ? [['users', 'Brukere']] : []), ['log', 'Logg']];
  const churchPicker = churches.length > 1 && <label style={{ ...C.row, ...C.muted }}>{T('Menighet')}
    <select style={C.input} value={church || ''} onChange={e => setChurch(e.target.value)}>{churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;

  let body = null;
  if (tab === 'overview') body = <div style={C.card}>
    <h2 style={C.h}>{T('Oversikt')}</h2>
    <p style={C.muted}>{me.full_name || me.email} · {(me.roles || []).map(r => T(ROLE[r.role] || r.role) + (r.church_id ? ' (' + churchName(r.church_id) + ')' : '')).join(', ') || T('Bruker')}</p>
    {status && <Table cols={['Aktive brukere', 'Deaktiverte', 'Menigheter', 'Ventende invitasjoner', 'Filer', 'Hendelser siste døgn']}
      rows={[[status.users, status.users_disabled, status.churches + (status.churches_other ? ' (+' + status.churches_other + ')' : ''), status.invitations_pending, status.files + ' · ' + Math.round(status.files_bytes / 1048576) + ' MB', status.audit_last_24h]]} />}
    {!staff && <p style={C.muted}>{T('Du administrerer')}: {adminOf.map(churchName).join(', ') || '–'}</p>}
  </div>;

  if (tab === 'churches') body = <div style={C.card}>
    <h2 style={C.h}>{T('Menigheter')}</h2>
    {staff && <form style={C.row} onSubmit={act(async e => { e.preventDefault(); const c = await admin.createChurch(form.name); setForm(f => ({ ...f, name: '' })); say(T('Menigheten er opprettet.')); await loadChurches(); setChurch(c.id); })}>
      <input style={C.input} placeholder={T('Navn på ny menighet')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} minLength={2} maxLength={120} required />
      <button style={C.primary} disabled={busy}>{T('Opprett menighet')}</button></form>}
    <Table cols={['Navn', 'Status', 'Opprettet', '']} rows={churches.map(c => [c.name, T(STATUS[c.status] || c.status) + (c.delete_after ? ' (' + fmt(c.delete_after) + ')' : ''), fmt(c.created_at),
      <span style={C.row}>
        <button style={C.btn} onClick={() => { setChurch(c.id); setTab('members'); }}>{T('Medlemmer')}</button>
        {canManage(c.id) && <button style={C.btn} onClick={act(async () => { const d = await churchLife.export(c.id); downloadJson(d, 'menighet-' + c.name.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, '-') + '.json'); say(T('Eksporten er lastet ned. Lenkene til filene virker i 1 time.')); })}>{T('Eksporter')}</button>}
        {staff && <select style={C.input} value="" onChange={act(async e => { const v = e.target.value; if (!v) return; if (v === 'pending_deletion' && !confirm(T('Sette menigheten til sletting? Den deaktiveres nå og kan slettes endelig om 30 dager. Det kan angres frem til da.'))) return; await churchLife.setStatus(c.id, v); say(T('Status er endret.')); await loadChurches(); })}>
          <option value="">{T('Endre status …')}</option>
          {c.status !== 'active' && <option value="active">{T('Aktiv')}</option>}
          {c.status === 'active' && <option value="temporarily_disabled">{T('Midlertidig deaktivert')}</option>}
          {c.status !== 'pending_deletion' && <option value="pending_deletion">{T('Sett til sletting')}</option>}
        </select>}
        {staff && c.status === 'pending_deletion' && <button style={C.danger} onClick={act(async () => { const n = prompt(T('Endelig sletting av menigheten, alle medlemskap og alle filene. Kan ikke angres. Skriv navnet på menigheten for å bekrefte:')); if (n === null) return; await churchLife.purge(c.id, n); say(T('Menigheten er slettet.')); await loadChurches(); })}>{T('Slett for godt')}</button>}
      </span>])} />
  </div>;

  if (tab === 'members') body = <div style={C.card}>
    <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Medlemmer')} · {churchName(church)}</h2>{churchPicker}</div>
    {canManage(church) && <form style={C.row} onSubmit={act(async e => { e.preventDefault(); const n = await NOTI.sendToChurch(church, msg.title, msg.body); setMsg({ title: '', body: '' }); say(T('Meldingen er sendt til') + ' ' + n + ' ' + T('medlemmer.')); })}>
      <input style={{ ...C.input, flex: '1 1 180px' }} placeholder={T('Melding til alle medlemmer – tittel')} value={msg.title} onChange={e => setMsg(m => ({ ...m, title: e.target.value }))} maxLength={160} required />
      <input style={{ ...C.input, flex: '2 1 240px' }} placeholder={T('Tekst (valgfritt)')} value={msg.body} onChange={e => setMsg(m => ({ ...m, body: e.target.value }))} maxLength={1000} />
      <button style={C.btn} disabled={busy}>{T('Send melding')}</button></form>}
    <Table cols={['Navn', 'E-post', 'Status', '']} rows={members.map(m => [
      <span>{m.user ? (m.user.full_name || '–') : '–'}{m.admin && <span style={C.badge}>{T('Admin')}</span>}{m.user && m.user.status !== 'active' && <span style={C.badge}>{T('Konto deaktivert')}</span>}</span>,
      m.user ? m.user.email : '–', T(STATUS[m.status] || m.status),
      m.user_id === me.id ? <span style={C.muted}>{T('Deg')}</span> : <span style={C.row}>
        {canManage(church) && (m.status === 'active'
          ? <button style={C.danger} onClick={act(async () => { await admin.setMembershipStatus(m.user_id, church, 'disabled'); say(T('Medlemskapet er deaktivert.')); await loadChurchData(church); })}>{T('Deaktiver')}</button>
          : <button style={C.btn} onClick={act(async () => { await admin.setMembershipStatus(m.user_id, church, 'active'); say(T('Medlemskapet er aktivert.')); await loadChurchData(church); })}>{T('Aktiver')}</button>)}
        {staff && m.status === 'active' && !m.admin && <button style={C.btn} onClick={act(async () => { await admin.assignRole(m.user_id, 'church_admin', church, 'Admin-siden'); say(T('Brukeren er nå admin.')); await loadChurchData(church); })}>{T('Gjør til admin')}</button>}
        {staff && m.admin && <button style={C.btn} onClick={act(async () => { await admin.revokeRole(m.admin.id, 'Admin-siden'); say(T('Admin-rollen er fjernet.')); await loadChurchData(church); })}>{T('Fjern admin')}</button>}
      </span>])} empty="Ingen medlemmer ennå." />
  </div>;

  if (tab === 'invites') {
    const roles = ['user', ...(staff ? ['church_admin'] : []), ...(dev ? ['moderator', 'developer'] : [])];
    const global = form.role === 'moderator' || form.role === 'developer';
    body = <div style={C.card}>
      <h2 style={C.h}>{T('Invitasjoner')}</h2>
      <p style={C.muted}>{T('Personen får en e-post med lenke. Kontoen opprettes først når lenken åpnes, og bare med den inviterte e-postadressen. Lenken vises aldri her.')}</p>
      <form style={C.row} onSubmit={sendInvite}>
        <input style={{ ...C.input, flex: '1 1 220px' }} type="email" placeholder={T('E-postadresse')} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required maxLength={254} />
        <select style={C.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>{roles.map(r => <option key={r} value={r}>{T(ROLE[r])}</option>)}</select>
        {!global && <select style={C.input} value={form.church || church || ''} onChange={e => setForm(f => ({ ...f, church: e.target.value }))}>
          {churches.filter(c => c.status === 'active' && canManage(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        <button style={C.primary} disabled={busy}>{T('Send invitasjon')}</button>
      </form>
      <Table cols={['E-post', 'Rolle', 'Menighet', 'Status', 'Utløper', '']} rows={invites.map(i => {
        const expired = i.status === 'pending' && new Date(i.expires_at) < new Date();
        return [i.email, T(ROLE[i.role] || i.role), i.church_id ? churchName(i.church_id) : '–', T(expired ? 'Utløpt' : STATUS[i.status] || i.status), fmt(i.expires_at),
          i.status === 'pending' ? <span style={C.row}>
            <button style={C.btn} onClick={act(async () => { const r = await admin.resendInvitation(i.id); say(r.email_sent ? T('Ny lenke er sendt.') : T('Ny lenke er laget, men e-posten kunne ikke sendes.'), r.email_sent); await loadChurchData(church); })}>{T('Send på nytt')}</button>
            <button style={C.danger} onClick={act(async () => { await admin.revokeInvitation(i.id); say(T('Invitasjonen er trukket tilbake.')); await loadChurchData(church); })}>{T('Trekk tilbake')}</button>
          </span> : ''];
      })} empty="Ingen invitasjoner." />
    </div>;
  }

  if (tab === 'files') {
    const mb = n => (n / 1048576).toFixed(1) + ' MB', u = fl.usage;
    body = <div style={C.card}>
      <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Filer')} · {churchName(church)}</h2>{churchPicker}</div>
      <p style={C.muted}>{T('Bare bilder (PNG, JPG, WebP, GIF), maks 4 MB. Video kan aldri lastes opp – videoer ligger i prosjektmappen på PC-en. «Bilder» kan alle medlemmer legge til; de andre mappene bare admin. Private filer ser bare du.')}</p>
      {u && <p style={C.muted}>{T('Brukt')}: {mb(u.used_bytes)} / {mb(u.quota_bytes)} · {T('Dine private')}: {mb(u.my_private_bytes)} / {mb(u.my_private_quota_bytes)}</p>}
      <div style={C.row}>
        <select style={C.input} value={fl.folder} onChange={e => act(() => loadFiles(e.target.value))()}>{FOLDERS.map(x => <option key={x} value={x}>{T(x[0].toUpperCase() + x.slice(1))}</option>)}</select>
        <label style={{ ...C.row, ...C.muted }}><input type="checkbox" checked={fl.priv} onChange={e => setFl(f => ({ ...f, priv: e.target.checked }))} /> {T('Privat (bare meg)')}</label>
        <label style={C.primary}><span style={{ lineHeight: '36px' }}>{T('Last opp bilder')}</span><input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={act(async e => {
          const list = [...e.target.files]; e.target.value = ''; let n = 0;
          for (const file of list) { try { await FS.upload(file, { churchId: church, folder: fl.folder, priv: fl.priv }); n++; } catch (err) { say(file.name + ': ' + errText(err), false); } }
          if (n) say(n + ' ' + T('filer er lastet opp.')); await loadFiles();
        })} /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {fl.list.map(x => <div key={x.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          <div style={{ aspectRatio: '1', borderRadius: '10px', background: '#1b1b1b center/contain no-repeat', backgroundImage: fl.thumbs[x.id] ? 'url(' + fl.thumbs[x.id] + ')' : 'none' }} />
          <span style={{ wordBreak: 'break-all' }}>{x.file_name}{x.visibility === 'private' && <span style={C.badge}>{T('Privat')}</span>}</span>
          <span style={C.muted}>{mb(x.file_size)}</span>
          {(x.uploaded_by === me.id || canManage(church)) && <button style={C.danger} onClick={act(async () => { if (!confirm(T('Slette filen?'))) return; await FS.remove(x.id); say(T('Filen er slettet.')); await loadFiles(); })}>{T('Slett')}</button>}
        </div>)}
      </div>
      {!fl.list.length && <p style={C.muted}>{T('Ingen filer i denne mappen.')}</p>}
    </div>;
  }

  if (tab === 'spaces') {
    const cur = sp.list.find(x => x.id === sp.sel), cname = id => (sp.dir.find(d => d.id === id) || {}).name || churchName(id);
    const myM = cur && sp.members.find(m => m.church_id === church);
    const isOwnerAdmin = cur && (staff || adminOf.includes(cur.owner_church_id));
    body = <div style={C.card}>
      <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Samarbeid')}</h2>{churchPicker}</div>
      <p style={C.muted}>{T('Samarbeidsområder lar flere menigheter dele bilder. Bare fellesbilder kan deles – aldri private filer, og aldri video.')}</p>
      {canManage(church) && <form style={C.row} onSubmit={act(async e => { e.preventDefault(); const id = await SP.create(sp.name, church); setSp(p => ({ ...p, name: '' })); say(T('Området er opprettet.')); await loadSpaces(id); })}>
        <input style={C.input} placeholder={T('Navn på nytt område')} value={sp.name} onChange={e => setSp(p => ({ ...p, name: e.target.value }))} minLength={2} maxLength={120} required />
        <button style={C.primary} disabled={busy}>{T('Opprett område')}</button></form>}
      {sp.list.length > 0 && <label style={{ ...C.row, ...C.muted }}>{T('Område')}<select style={C.input} value={sp.sel || ''} onChange={e => act(() => loadSpaces(e.target.value))()}>{sp.list.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      {!sp.list.length && <p style={C.muted}>{T('Ingen samarbeidsområder ennå.')}</p>}
      {cur && <>
        <Table cols={['Menighet', 'Status', '']} rows={sp.members.map(m => [cname(m.church_id) + (m.church_id === cur.owner_church_id ? ' (' + T('eier') + ')' : ''), T(STATUS[m.status] || m.status),
          adminOf.includes(m.church_id) && m.church_id !== cur.owner_church_id ? <span style={C.row}>
            {m.status === 'invited' && <button style={C.primary} onClick={act(async () => { await SP.setMembership(cur.id, m.church_id, 'active'); say(T('Menigheten deltar nå i området.')); await loadSpaces(); })}>{T('Godta')}</button>}
            {m.status === 'invited' && <button style={C.btn} onClick={act(async () => { await SP.setMembership(cur.id, m.church_id, 'declined'); await loadSpaces(); })}>{T('Avslå')}</button>}
            {m.status === 'active' && <button style={C.danger} onClick={act(async () => { await SP.setMembership(cur.id, m.church_id, 'left'); say(T('Menigheten har forlatt området. Bildene den delte er fjernet fra området.')); await loadSpaces(); })}>{T('Forlat')}</button>}
          </span> : ''])} />
        {isOwnerAdmin && <div style={C.row}>
          <select style={C.input} value={sp.invite} onChange={e => setSp(p => ({ ...p, invite: e.target.value }))}><option value="">{T('Inviter menighet …')}</option>{sp.dir.filter(d => !sp.members.some(m => m.church_id === d.id && ['active', 'invited'].includes(m.status))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <button style={C.btn} disabled={!sp.invite || busy} onClick={act(async () => { await SP.invite(cur.id, sp.invite); setSp(p => ({ ...p, invite: '' })); say(T('Invitasjonen er sendt til menighetens admin.')); await loadSpaces(); })}>{T('Inviter')}</button></div>}
        <p style={C.muted}>{T('Delte bilder i området')}: {sp.files.length}</p>
        {myM && myM.status === 'active' && canManage(church) && <Table cols={['Fellesbilde i din menighet', '']} rows={sp.myFiles.map(x => {
          const on = sp.files.some(sf => sf.file_id === x.id);
          return [x.file_name, <button style={on ? C.btn : C.primary} onClick={act(async () => { await SP.share(x.id, cur.id, !on); await loadSpaces(); })}>{T(on ? 'Fjern fra området' : 'Del i området')}</button>];
        })} empty="Ingen fellesbilder i menigheten." />}
      </>}
    </div>;
  }

  if (tab === 'subs') body = <div style={C.card}>
    <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Abonnement')}</h2>{!staff && churchPicker}</div>
    <p style={C.muted}>{T('Det tas ikke betalt i ConnectHub ennå. Menigheter kan be om et abonnement eller om gratis abonnement; stab godkjenner. Abonnementet bestemmer lagringskvoten.')}</p>
    <Table cols={['Plan', 'Lagring', 'Pris']} rows={sub.plans.map(p => [T(p.name), p.storage_quota_mb + ' MB', p.price_nok_month === 0 ? T('Gratis') : p.price_nok_month ? p.price_nok_month + ' kr/mnd' : T('Avtales')])} />
    <Table cols={['Menighet', 'Abonnement', 'Gratis', 'Oppdatert']} rows={sub.current.map(c => [churchName(c.church_id), c.plan, T(c.free_of_charge ? 'Ja' : 'Nei'), fmt(c.updated_at)])} empty="Ingen abonnement registrert (standard: Gratis, 200 MB)." />
    {canManage(church) && !staff && <form style={C.row} onSubmit={act(async e => { e.preventDefault(); await SUB.request(church, sub.plan, sub.free, sub.reason); setSub(p => ({ ...p, reason: '' })); say(T('Forespørselen er sendt.')); await loadSubs(); })}>
      <select style={C.input} value={sub.plan} onChange={e => setSub(p => ({ ...p, plan: e.target.value }))}>{sub.plans.map(p => <option key={p.code} value={p.code}>{T(p.name)}</option>)}</select>
      <label style={{ ...C.row, ...C.muted }}><input type="checkbox" checked={sub.free} onChange={e => setSub(p => ({ ...p, free: e.target.checked }))} /> {T('Be om gratis abonnement')}</label>
      <input style={{ ...C.input, flex: '1 1 220px' }} placeholder={T('Begrunnelse (valgfritt)')} value={sub.reason} onChange={e => setSub(p => ({ ...p, reason: e.target.value }))} maxLength={1000} />
      <button style={C.primary} disabled={busy}>{T('Send forespørsel')}</button></form>}
    <Table cols={['Menighet', 'Plan', 'Gratis', 'Status', 'Begrunnelse', '']} rows={sub.reqs.map(r => [churchName(r.church_id), r.plan, T(r.free_of_charge ? 'Ja' : 'Nei'), T(STATUS[r.status] || r.status), [r.reason, r.decision_note].filter(Boolean).join(' · '),
      r.status === 'pending' ? (staff ? <span style={C.row}>
        <button style={C.primary} onClick={act(async () => { await SUB.decide(r.id, true, sub.note); say(T('Forespørselen er godkjent.')); await loadSubs(); await loadChurches(); })}>{T('Godkjenn')}</button>
        <button style={C.danger} onClick={act(async () => { await SUB.decide(r.id, false, sub.note); say(T('Forespørselen er avslått.')); await loadSubs(); })}>{T('Avslå')}</button>
      </span> : <button style={C.btn} onClick={act(async () => { await SUB.withdraw(r.id); await loadSubs(); })}>{T('Trekk tilbake')}</button>) : ''])} empty="Ingen forespørsler." />
    {staff && <input style={C.input} placeholder={T('Merknad til avgjørelsen (valgfritt)')} value={sub.note} onChange={e => setSub(p => ({ ...p, note: e.target.value }))} maxLength={500} />}
  </div>;

  if (tab === 'users' && staff) body = <div style={C.card}>
    <h2 style={C.h}>{T('Brukere')}</h2>
    <Table cols={['Navn', 'E-post', 'Globale roller', 'Status', '']} rows={users.map(u => {
      const g = globalRoles.filter(r => r.user_id === u.id);
      return [u.full_name || '–', u.email, g.map(r => <span key={r.id} style={C.row}>{T(ROLE[r.role])}{dev && u.id !== me.id && <button style={C.btn} onClick={act(async () => { await admin.revokeRole(r.id, 'Admin-siden'); say(T('Rollen er fjernet.')); await loadStaff(); })}>{T('Fjern')}</button>}</span>), T(STATUS[u.status] || u.status),
        u.id === me.id ? <span style={C.muted}>{T('Deg')}</span> : <span style={C.row}>
          {u.status === 'active'
            ? <button style={C.danger} onClick={act(async () => { await admin.setUserStatus(u.id, 'disabled'); say(T('Kontoen er deaktivert. Brukeren mister tilgang med en gang.')); await loadStaff(); })}>{T('Deaktiver konto')}</button>
            : <button style={C.btn} onClick={act(async () => { await admin.setUserStatus(u.id, 'active'); say(T('Kontoen er aktivert.')); await loadStaff(); })}>{T('Aktiver konto')}</button>}
          {dev && u.status === 'active' && !g.some(r => r.role === 'moderator') && <button style={C.btn} onClick={act(async () => { await admin.assignRole(u.id, 'moderator', null, 'Admin-siden'); say(T('Brukeren er nå moderator.')); await loadStaff(); })}>{T('Gjør til moderator')}</button>}
        </span>];
    })} />
  </div>;

  if (tab === 'log') body = <div style={C.card}>
    <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Logg')}</h2>{!staff && churchPicker}</div>
    <p style={C.muted}>{T('Loggen kan ikke endres eller slettes. Den viser de siste 200 hendelsene.')}</p>
    <Table cols={['Tid', 'Hvem', 'Hendelse', 'Menighet', 'Detaljer']} rows={log.map(l => [fmt(l.created_at), nameOf(l.actor_user_id), l.action, l.church_id ? churchName(l.church_id) : '–',
      [l.meta && l.meta.role && T(ROLE[l.meta.role] || l.meta.role), l.meta && l.meta.status && T(STATUS[l.meta.status] || l.meta.status), l.reason].filter(Boolean).join(' · ')])} empty="Ingen hendelser." />
  </div>;

  return <main style={C.page} data-ml-bg="static">
    <div style={C.bar} data-ml-bar="1"><a href="media-lab.dc.html" style={C.back}>← Media Lab</a><strong style={{ fontSize: '14px', letterSpacing: '0.08em' }}>CONNECTHUB · ADMIN</strong></div>
    <div style={C.wrap}>
      {staffNoMfa && <p style={C.msg(false)}>{T('Rollen din krever totrinnsbekreftelse. Logg ut og inn igjen og sett opp autentiseringsappen for å bruke stab-rettighetene.')}</p>}
      {!staff && !adminOf.length && <p style={C.msg(false)}>{T('Du har ikke administratortilgang. Under «Filer» kan du se og legge til bilder i menighetens fellesmappe og dine private filer.')}</p>}
      <nav style={C.tabs}>{tabs.map(([k, l]) => <button key={k} style={C.tab(tab === k)} onClick={() => { setNote(null); setTab(k); }}>{T(l)}</button>)}</nav>
      {note && <p role="status" style={C.msg(note.ok)}>{note.text}</p>}
      {body}
      {dev && <p style={C.muted}>{T('Den gamle adminløsningen (admin.dc.html) er beholdt til den kan fjernes etter godkjenning.')}</p>}
    </div>
  </main>;
}
