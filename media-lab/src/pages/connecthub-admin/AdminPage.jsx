import React from 'react';
import { admin } from '../../services/admin.js';
import { isStaff, hasRole } from '../../services/data/me.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ERR = {
  forbidden: 'Du har ikke tilgang til dette.', conflict: 'Finnes allerede (eller menigheten har allerede en admin).',
  invalid: 'Ugyldige opplysninger.', rate_limited: 'For mange forsøk. Vent litt.', network: 'Ingen forbindelse. Prøv igjen.',
  not_configured: 'Serveren er ikke satt opp for dette (mangler nøkkel).', unauthorized: 'Økten er utløpt. Last siden på nytt.',
};
const errText = e => T(ERR[e && e.code] || 'Noe gikk galt. Prøv igjen.');
const ROLE = { user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' };
const STATUS = { active: 'Aktiv', disabled: 'Deaktivert', pending: 'Venter', accepted: 'Godtatt', revoked: 'Trukket tilbake', expired: 'Utløpt', temporarily_disabled: 'Midlertidig deaktivert', pending_deletion: 'Venter på sletting', deleted: 'Slettet' };
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

  React.useEffect(() => { act(async () => { await loadChurches(); await loadStaff(); })(); }, []);
  React.useEffect(() => { act(() => loadChurchData(church))(); }, [church]);
  React.useEffect(() => { if (tab === 'log') act(loadLog)(); }, [tab, church]);

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

  const tabs = [['overview', 'Oversikt'], ['churches', 'Menigheter'], ['members', 'Medlemmer'], ['invites', 'Invitasjoner'], ...(staff ? [['users', 'Brukere']] : []), ['log', 'Logg']];
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
    <Table cols={['Navn', 'Status', 'Opprettet', '']} rows={churches.map(c => [c.name, T(STATUS[c.status] || c.status), fmt(c.created_at),
      <button style={C.btn} onClick={() => { setChurch(c.id); setTab('members'); }}>{T('Medlemmer')}</button>])} />
  </div>;

  if (tab === 'members') body = <div style={C.card}>
    <div style={{ ...C.row, justifyContent: 'space-between' }}><h2 style={C.h}>{T('Medlemmer')} · {churchName(church)}</h2>{churchPicker}</div>
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
      {!staff && !adminOf.length && <p style={C.msg(false)}>{T('Du har ikke administratortilgang.')}</p>}
      <nav style={C.tabs}>{tabs.map(([k, l]) => <button key={k} style={C.tab(tab === k)} onClick={() => { setNote(null); setTab(k); }}>{T(l)}</button>)}</nav>
      {note && <p role="status" style={C.msg(note.ok)}>{note.text}</p>}
      {body}
      {dev && <p style={C.muted}>{T('Den gamle adminløsningen (admin.dc.html) er beholdt til den kan fjernes etter godkjenning.')}</p>}
    </div>
  </main>;
}
