/* ConnectHub admin – ramme, navigasjon, Oversikt og Brukere. Øvrige seksjoner i sections.jsx.
   Grensesnittet skjuler bare knapper; alle rettigheter håndheves av databasen (RLS og funksjoner) og serveren. */
import React from 'react';
import './admin.css';
import { admin } from '../../services/admin.js';
import { isStaff, hasRole } from '../../services/data/me.js';
import { subscriptions as SUB, spaces as SP } from '../../services/community.js';
import { T, errText, ROLE, fmt, fmtDate, norm, Btn, Badge, StatusBadge, RoleBadge, Avatar, Card, Empty, Field, Search, Select, List, Drawer, Dialog, useRoute, go, href } from './ui.jsx';
import { ChurchesView, ChurchDetail, InvitesView, FilesView, SpacesView, SubsView, LogView, ChurchPicker, actionName } from './sections.jsx';

export const Ctx = React.createContext(null);
export const useAdmin = () => React.useContext(Ctx);

const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['logg', 'Logg'],
];

export default function AdminPage({ me }) {
  const staff = isStaff(me) && me.mfa, dev = staff && hasRole(me, 'developer'), staffNoMfa = isStaff(me) && !me.mfa;
  const adminOf = (me.roles || []).filter(r => r.role === 'church_admin').map(r => r.church_id);
  const route = useRoute();
  const [d, setD] = React.useState({ churches: [], users: [], memberships: [], roles: [], invites: [], status: null, pendingSubs: 0, loaded: false });
  const [note, setNote] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [invite, setInvite] = React.useState(null);      // åpen «Ny invitasjon» med forhåndsutfylling
  const [ctxChurch, setCtxChurch] = React.useState(null); // valgt menighet for Filer/Samarbeid/Abonnement

  const say = (text, ok = true) => { setNote({ text, ok }); clearTimeout(say._t); say._t = setTimeout(() => setNote(null), 6000); };
  const act = fn => async (...a) => { if (busy) return; setBusy(true); setNote(null); try { return await fn(...a); } catch (e) { if (!(e && e.code === 'cancel')) say(errText(e), false); } finally { setBusy(false); } };

  const reload = React.useCallback(async () => {
    const [churches, users, memberships, roles, invites, status, subs] = await Promise.all([
      admin.churches(), admin.users(), admin.allMemberships(), admin.allRoles(), admin.invitations(null),
      staff ? admin.systemStatus().catch(() => null) : null,
      staff ? SUB.requests(null).catch(() => []) : [],
    ]);
    setD({ churches, users, memberships, roles, invites, status, pendingSubs: subs.filter(s => s.status === 'pending').length, loaded: true });
    setCtxChurch(c => c && churches.some(x => x.id === c) ? c : ((churches.find(x => adminOf.includes(x.id)) || churches[0] || {}).id || null));
  }, [staff]);
  React.useEffect(() => { act(reload)(); }, []);

  const churchName = id => (d.churches.find(c => c.id === id) || {}).name || '–';
  const userById = id => d.users.find(u => u.id === id);
  const userName = id => { const u = userById(id); return u ? (u.full_name || u.email) : (id ? T('Ukjent bruker') : T('System')); };
  const canManage = id => staff || adminOf.includes(id);
  const pendingInvites = d.invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date());
  const ctx = { me, staff, dev, staffNoMfa, adminOf, d, reload, act, say, busy, churchName, userById, userName, canManage, openInvite: p => setInvite(p || {}), ctxChurch, setCtxChurch };

  const [sec, id, sub] = route;
  let body;
  if (sec === 'brukere') body = <UsersView selected={id} />;
  else if (sec === 'menigheter') body = id ? <ChurchDetail id={id} tab={sub || 'medlemmer'} /> : <ChurchesView />;
  else if (sec === 'invitasjoner') body = <InvitesView />;
  else if (sec === 'filer') body = <><Head title="Filer" sub="Bilder i menighetens mapper. Video kan aldri lastes opp." right={<ChurchPicker />} />{ctxChurch ? <FilesView churchId={ctxChurch} /> : <Card><Empty>{T('Ingen menighet å vise.')}</Empty></Card>}</>;
  else if (sec === 'samarbeid') body = <><Head title="Samarbeid" sub="Del bilder med andre menigheter." right={<ChurchPicker />} /><SpacesView churchId={ctxChurch} /></>;
  else if (sec === 'abonnement') body = <><Head title="Abonnement" sub="Ingen betaling ennå – stab godkjenner forespørsler." right={!staff && <ChurchPicker />} /><SubsView churchId={staff ? null : ctxChurch} /></>;
  else if (sec === 'logg') body = <><Head title="Logg" sub="Kan ikke endres eller slettes." right={!staff && <ChurchPicker />} /><LogView churchId={staff ? null : ctxChurch} /></>;
  else body = <Overview pendingInvites={pendingInvites} />;

  const counts = { invitasjoner: pendingInvites.length, abonnement: d.pendingSubs };
  return <Ctx.Provider value={ctx}>
    <div data-ml-theme="admin" data-ml-bg="static">
      <header className="ch-top" data-ml-bar="1">
        <a className="ch-back" href="media-lab.dc.html">← Media Lab</a>
        <span className="ch-brand">CONNECTHUB · ADMIN</span>
        <span className="ch-spacer" />
        {(staff || adminOf.length > 0) && <Btn kind="primary" small onClick={() => setInvite({ church: sec === 'menigheter' && id ? id : ctxChurch })}>+ {T('Ny invitasjon')}</Btn>}
      </header>
      <div className="ch-shell">
        <nav className="ch-nav" aria-label={T('Admin')}>
          {NAV.map(([k, l]) => <a key={k} href={href(k)} className={sec === k || (k === 'oversikt' && !NAV.some(n => n[0] === sec)) ? 'on' : ''}>{T(l)}{counts[k] > 0 && <span className="ch-count">{counts[k]}</span>}</a>)}
          {dev && <div className="ch-navfoot">{T('Gammel admin er beholdt til den kan fjernes:')} <a href="admin.dc.html">admin.dc.html</a></div>}
        </nav>
        <main className="ch-main">
          {staffNoMfa && <p className="ch-note warn">{T('Rollen din krever totrinnsbekreftelse. Logg ut og inn igjen og sett opp autentiseringsappen for å bruke stab-rettighetene.')}</p>}
          {d.loaded && !staff && !adminOf.length && <p className="ch-note warn">{T('Du har ikke administratortilgang. Under «Filer» kan du se og legge til bilder i menighetens fellesmappe og dine private filer.')}</p>}
          {note && <p role="status" className={'ch-note ' + (note.ok ? 'ok' : 'bad')}>{note.text}</p>}
          {body}
        </main>
      </div>
      {invite && <InviteDialog initial={invite} onClose={() => setInvite(null)} />}
    </div>
  </Ctx.Provider>;
}

export function Head({ title, sub, right, crumb }) {
  return <div className="ch-head">
    <div>{crumb && <div className="ch-crumb">{crumb}</div>}<h1>{T(title)}</h1>{sub && <div className="ch-sub">{T(sub)}</div>}</div>
    {right && <div className="ch-actions">{right}</div>}
  </div>;
}

/* ---------- Oversikt ---------- */
function Overview({ pendingInvites }) {
  const { me, staff, d, churchName, adminOf, act } = useAdmin();
  const [recent, setRecent] = React.useState([]);
  const [spaceInv, setSpaceInv] = React.useState([]);
  React.useEffect(() => { act(async () => {
    setRecent((await admin.audit(staff ? null : adminOf[0] || null)).slice(0, 8));
    if (adminOf.length) { const list = await SP.list(); const inv = []; for (const s of list) for (const m of await SP.members(s.id)) if (m.status === 'invited' && adminOf.includes(m.church_id)) inv.push({ space: s, church: m.church_id }); setSpaceInv(inv); }
  })(); }, [d.loaded]);
  const s = d.status, soon = pendingInvites.filter(i => new Date(i.expires_at) - Date.now() < 2 * 864e5);
  const todo = [
    ...(staff && d.pendingSubs ? [{ k: 'subs', t: d.pendingSubs + ' ' + T('abonnementsforespørsler venter på avgjørelse'), to: href('abonnement') }] : []),
    ...spaceInv.map(x => ({ k: 'sp' + x.space.id, t: T('Invitasjon til samarbeid') + ': «' + x.space.name + '» (' + churchName(x.church) + ')', to: href('samarbeid') })),
    ...(pendingInvites.length ? [{ k: 'inv', t: pendingInvites.length + ' ' + T('ventende invitasjoner') + (soon.length ? ' · ' + soon.length + ' ' + T('utløper snart') : ''), to: href('invitasjoner') }] : []),
    ...d.churches.filter(c => c.status === 'pending_deletion').map(c => ({ k: 'del' + c.id, t: c.name + ': ' + T('venter på sletting') + ' (' + fmtDate(c.delete_after) + ')', to: href('menigheter', c.id, 'innstillinger') })),
  ];
  return <>
    <Head title="Oversikt" sub={(me.full_name || me.email) + ' · ' + ((me.roles || []).map(r => T(ROLE[r.role] || r.role) + (r.church_id ? ' (' + churchName(r.church_id) + ')' : '')).join(', ') || T('Bruker'))} />
    <div className="ch-stats">
      <a className="ch-stat" href={href('brukere')}><b>{s ? s.users : d.users.filter(u => u.status === 'active').length}</b><span>{T('Aktive brukere')}</span></a>
      <a className="ch-stat" href={href('menigheter')}><b>{d.churches.filter(c => c.status === 'active').length}</b><span>{T('Aktive menigheter')}</span></a>
      <a className="ch-stat" href={href('invitasjoner')}><b>{pendingInvites.length}</b><span>{T('Ventende invitasjoner')}</span></a>
      {s && <a className="ch-stat" href={href('filer')}><b>{s.files}</b><span>{T('Filer')} · {(s.files_bytes / 1048576).toFixed(0)} MB</span></a>}
      {staff && <a className="ch-stat" href={href('abonnement')}><b>{d.pendingSubs}</b><span>{T('Forespørsler om abonnement')}</span></a>}
      {s && <a className="ch-stat" href={href('logg')}><b>{s.audit_last_24h}</b><span>{T('Hendelser siste døgn')}</span></a>}
    </div>
    <div className="ch-grid">
      <Card title="Krever handling" sub={todo.length || null}>
        {todo.length ? <List cols="1fr" rows={todo.map(x => ({ key: x.k, cells: [<a href={x.to}>{x.t} →</a>] }))} /> : <p className="ch-muted">{T('Ingenting venter på deg nå.')}</p>}
      </Card>
      <Card title="Siste hendelser" actions={<a className="ch-btn small" href={href('logg')}>{T('Hele loggen')}</a>}>
        {recent.length ? <List cols="1fr auto" rows={recent.map(l => ({ key: l.id, cells: [<span>{T(actionName(l.action))}{l.church_id ? ' · ' + churchName(l.church_id) : ''}</span>, <span className="ch-muted">{fmt(l.created_at)}</span>] }))} /> : <p className="ch-muted">{T('Ingen hendelser.')}</p>}
      </Card>
    </div>
  </>;
}

/* ---------- Brukere ---------- */
function UsersView({ selected }) {
  const { d, churchName, staff } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('all'), [role, setRole] = React.useState('all'), [ch, setCh] = React.useState('all');
  const rolesOf = id => d.roles.filter(r => r.user_id === id);
  const memsOf = id => d.memberships.filter(m => m.user_id === id);
  const list = d.users.filter(u => {
    if (q && !norm(u.full_name + ' ' + u.email + ' ' + (u.phone || '')).includes(norm(q))) return false;
    if (st !== 'all' && u.status !== st) return false;
    const rs = rolesOf(u.id);
    if (role === 'user' && rs.length) return false;
    if (role !== 'all' && role !== 'user' && !rs.some(r => r.role === role)) return false;
    if (ch !== 'all' && !memsOf(u.id).some(m => m.church_id === ch)) return false;
    return true;
  });
  return <>
    <Head title="Brukere" sub={staff ? 'Alle brukere i ConnectHub.' : 'Medlemmer i menighetene du administrerer.'} />
    <div className="ch-row">
      <Search value={q} onChange={setQ} placeholder="Søk på navn, e-post eller telefon …" />
      <Select label="Status" value={st} onChange={setSt} options={[['all', 'Alle statuser'], ['active', 'Aktive'], ['disabled', 'Deaktiverte']]} />
      <Select label="Rolle" value={role} onChange={setRole} options={[['all', 'Alle roller'], ['developer', 'Developer'], ['moderator', 'Moderator'], ['church_admin', 'Admin'], ['user', 'Bare bruker']]} />
      <Select label="Menighet" value={ch} onChange={setCh} options={[['all', 'Alle menigheter'], ...d.churches.map(c => [c.id, c.name])]} />
    </div>
    <p className="ch-muted">{list.length} {T('av')} {d.users.length} {T('brukere')}</p>
    <List cols="minmax(220px,2fr) minmax(140px,1.2fr) minmax(140px,1.5fr) auto" head={['Person', 'Roller', 'Menigheter', 'Status']}
      empty="Ingen brukere passer med søket." onRow={r => go('brukere', r.key)}
      rows={list.map(u => ({ key: u.id, cells: [
        <div className="ch-who"><Avatar name={u.full_name || u.email} /><div><b>{u.full_name || u.email}</b><span>{u.email}</span></div></div>,
        <div className="ch-row">{rolesOf(u.id).length ? rolesOf(u.id).map(r => <RoleBadge key={r.id} r={r.role} />) : <span className="ch-muted">{T('Bruker')}</span>}</div>,
        <span className="ch-muted">{memsOf(u.id).map(m => churchName(m.church_id) + (m.status !== 'active' ? ' (' + T('deaktivert') + ')' : '')).join(', ') || '–'}</span>,
        <div className="ch-end"><StatusBadge s={u.status} /></div>] }))} />
    {selected && <UserDetail id={selected} onClose={() => go('brukere')} />}
  </>;
}

function UserDetail({ id, onClose }) {
  const { me, d, staff, dev, act, say, reload, churchName, canManage } = useAdmin();
  const u = d.users.find(x => x.id === id);
  const [activity, setActivity] = React.useState([]);
  const [prof, setProf] = React.useState({ name: '', phone: '' });
  const [addCh, setAddCh] = React.useState('');
  React.useEffect(() => { if (u) setProf({ name: u.full_name || '', phone: u.phone || '' }); if (staff && u) admin.userActivity(u.id).then(setActivity).catch(() => {}); }, [id, u && u.updated_at]);
  if (!u) return <Drawer title={T('Bruker')} onClose={onClose}><Empty>{T('Fant ikke brukeren, eller du har ikke tilgang.')}</Empty></Drawer>;
  const self = u.id === me.id;
  const roles = d.roles.filter(r => r.user_id === u.id), global = roles.filter(r => !r.church_id);
  const mems = d.memberships.filter(m => m.user_id === u.id);
  const invites = d.invites.filter(i => norm(i.email) === norm(u.email));
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await reload(); });
  return <Drawer title={u.full_name || u.email} sub={u.email} onClose={onClose}>
    <div className="ch-row"><StatusBadge s={u.status} />{roles.map(r => <RoleBadge key={r.id} r={r.role} church={r.church_id ? churchName(r.church_id) : ''} />)}</div>

    <Card title="Opplysninger">
      {self ? <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.updateMyProfile(u.id, prof.name, prof.phone), 'Opplysningene er lagret.')(); }}>
        <Field label="Navn"><input className="ch-input" value={prof.name} maxLength={120} onChange={e => setProf(p => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Telefon"><input className="ch-input" value={prof.phone} maxLength={40} onChange={e => setProf(p => ({ ...p, phone: e.target.value }))} /></Field>
        <Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre')}</Btn>
      </form> : <dl className="ch-kv">
        <dt>{T('Navn')}</dt><dd>{u.full_name || '–'}</dd>
        <dt>{T('E-post')}</dt><dd>{u.email}</dd>
        <dt>{T('Telefon')}</dt><dd>{u.phone || '–'}</dd>
        <dt>{T('Opprettet')}</dt><dd>{fmtDate(u.created_at)}</dd>
      </dl>}
      {!self && <p className="ch-muted">{T('Navn og telefon endres av brukeren selv.')}</p>}
    </Card>

    <Card title="Menigheter" sub={mems.length}>
      {mems.length ? <List cols="1fr auto auto" rows={mems.map(m => {
        const adm = roles.find(r => r.role === 'church_admin' && r.church_id === m.church_id);
        return { key: m.church_id, cells: [
          <a href={href('menigheter', m.church_id)}>{churchName(m.church_id)}</a>,
          <div className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}</div>,
          <div className="ch-end">
            {!self && canManage(m.church_id) && (m.status === 'active'
              ? <Btn small kind="danger" onClick={run(() => admin.setMembershipStatus(u.id, m.church_id, 'disabled'), 'Medlemskapet er deaktivert.')}>{T('Deaktiver')}</Btn>
              : <Btn small onClick={run(() => admin.setMembershipStatus(u.id, m.church_id, 'active'), 'Medlemskapet er aktivert.')}>{T('Aktiver')}</Btn>)}
            {!self && staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(u.id, 'church_admin', m.church_id, 'Admin-siden'), 'Brukeren er nå admin.')}>{T('Gjør til admin')}</Btn>}
            {!self && staff && adm && <Btn small onClick={run(() => admin.revokeRole(adm.id, 'Admin-siden'), 'Admin-rollen er fjernet.')}>{T('Fjern admin')}</Btn>}
          </div>] };
      })} /> : <p className="ch-muted">{T('Ikke medlem av noen menighet.')}</p>}
      {staff && !self && <div className="ch-row">
        <select className="ch-select" value={addCh} onChange={e => setAddCh(e.target.value)} aria-label={T('Legg til i menighet')}>
          <option value="">{T('Legg til i menighet …')}</option>
          {d.churches.filter(c => c.status === 'active' && !mems.some(m => m.church_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Btn disabled={!addCh} onClick={run(async () => { await admin.addMembership(u.id, addCh); setAddCh(''); }, 'Brukeren er lagt til i menigheten.')}>{T('Legg til')}</Btn>
      </div>}
    </Card>

    {staff && <Card title="Globale roller">
      <div className="ch-row">{global.length ? global.map(r => <span key={r.id} className="ch-row"><RoleBadge r={r.role} />{dev && !self && <Btn small onClick={run(() => admin.revokeRole(r.id, 'Admin-siden'), 'Rollen er fjernet.')}>{T('Fjern')}</Btn>}</span>) : <span className="ch-muted">{T('Ingen')}</span>}</div>
      {dev && !self && u.status === 'active' && <div className="ch-row">
        {!global.some(r => r.role === 'moderator') && <Btn small onClick={run(() => admin.assignRole(u.id, 'moderator', null, 'Admin-siden'), 'Brukeren er nå moderator.')}>{T('Gjør til moderator')}</Btn>}
        {!global.some(r => r.role === 'developer') && <Btn small onClick={run(() => { if (!confirm(T('Gi Developer-rollen? Developer har full tilgang til hele ConnectHub.'))) throw Object.assign(new Error(), { code: 'cancel' }); return admin.assignRole(u.id, 'developer', null, 'Admin-siden'); }, 'Brukeren er nå Developer.')}>{T('Gjør til Developer')}</Btn>}
      </div>}
      <p className="ch-muted">{T('Developer og Moderator må bruke totrinnsbekreftelse for at rollen skal virke.')}</p>
    </Card>}

    {staff && !self && <Card title="Konto">
      <p className="ch-muted">{T(u.status === 'active' ? 'Deaktivering stenger brukeren ute med en gang, i alle menigheter. Ingenting slettes.' : 'Kontoen er deaktivert. Aktivering gir tilgang igjen.')}</p>
      <div className="ch-row">{u.status === 'active'
        ? <Btn kind="danger" onClick={run(() => admin.setUserStatus(u.id, 'disabled'), 'Kontoen er deaktivert. Brukeren mister tilgang med en gang.')}>{T('Deaktiver konto')}</Btn>
        : <Btn onClick={run(() => admin.setUserStatus(u.id, 'active'), 'Kontoen er aktivert.')}>{T('Aktiver konto')}</Btn>}</div>
    </Card>}

    {invites.length > 0 && <Card title="Invitasjoner til denne adressen">
      <List cols="1fr auto" rows={invites.map(i => ({ key: i.id, cells: [<span>{T(ROLE[i.role] || i.role)}{i.church_id ? ' · ' + churchName(i.church_id) : ''} <span className="ch-muted">{fmtDate(i.created_at)}</span></span>, <StatusBadge s={i.status === 'pending' && new Date(i.expires_at) < new Date() ? 'expired' : i.status} />] }))} />
    </Card>}

    {staff && <Card title="Siste aktivitet">
      {activity.length ? <List cols="1fr auto" rows={activity.map(l => ({ key: l.id, cells: [<span>{T(actionName(l.action))}{l.church_id ? ' · ' + churchName(l.church_id) : ''}</span>, <span className="ch-muted">{fmt(l.created_at)}</span>] }))} /> : <p className="ch-muted">{T('Ingen registrert aktivitet.')}</p>}
    </Card>}
  </Drawer>;
}

/* ---------- Ny invitasjon ---------- */
function InviteDialog({ initial, onClose }) {
  const { staff, dev, d, canManage, act, say, reload } = useAdmin();
  const roles = ['user', ...(staff ? ['church_admin'] : []), ...(dev ? ['moderator', 'developer'] : [])];
  const churches = d.churches.filter(c => c.status === 'active' && canManage(c.id));
  const [f, setF] = React.useState({ email: '', role: 'user', church: initial.church && churches.some(c => c.id === initial.church) ? initial.church : (churches[0] || {}).id || '' });
  const global = f.role === 'moderator' || f.role === 'developer';
  const send = act(async e => {
    e.preventDefault();
    const r = await admin.invite(f.email.trim(), f.role, global ? null : f.church);
    say(r.email_sent ? T('Invitasjonen er sendt til') + ' ' + r.invitation.email + '.' : T('Invitasjonen er lagret, men e-posten kunne ikke sendes (e-posttjenesten er ikke satt opp ennå). Prøv «Send på nytt» senere.'), r.email_sent);
    await reload(); onClose();
  });
  return <Dialog title={T('Ny invitasjon')} onClose={onClose}>
    <p className="ch-muted">{T('Personen får en e-post med lenke. Kontoen opprettes først når lenken åpnes, og bare med den inviterte e-postadressen. Lenken vises aldri her.')}</p>
    <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="E-postadresse"><input className="ch-input" type="email" required maxLength={254} value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} autoFocus /></Field>
      <Field label="Rolle"><select className="ch-select" value={f.role} onChange={e => setF(x => ({ ...x, role: e.target.value }))}>{roles.map(r => <option key={r} value={r}>{T(ROLE[r])}</option>)}</select></Field>
      {!global && <Field label="Menighet"><select className="ch-select" value={f.church} onChange={e => setF(x => ({ ...x, church: e.target.value }))} required>{churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
      <div className="ch-row"><Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Send invitasjon')}</Btn><Btn onClick={onClose}>{T('Avbryt')}</Btn></div>
    </form>
  </Dialog>;
}
