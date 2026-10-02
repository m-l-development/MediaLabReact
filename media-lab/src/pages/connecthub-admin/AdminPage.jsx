/* ConnectHub admin – ramme, navigasjon, Oversikt og Brukere. Øvrige seksjoner i sections.jsx.
   Grensesnittet skjuler bare knapper; alle rettigheter håndheves av databasen (RLS og funksjoner) og serveren. */
import React from 'react';
import './admin.css';
import { admin } from '../../services/admin.js';
import { isStaff, hasRole } from '../../services/data/me.js';
import { subscriptions as SUB, links as LK } from '../../services/community.js';
import { T, errText, ROLE, fmt, fmtDate, norm, Btn, Badge, StatusBadge, RoleBadge, Avatar, Card, Empty, Field, Search, Select, List, Drawer, Dialog, useRoute, go, href } from './ui.jsx';
import { NAV, sectionsFor, brandOf } from './access.js';
import { roleSummary, canJoinAnother, memberActions } from './members.js';
import { ChurchesView, ChurchDetail, InvitesView, FilesView, LinksView, SubsView, LogView, ChurchPicker, actionName } from './sections.jsx';
import { FeedbackView } from './feedback.jsx';
import { noteError } from '../../shared/feedback-errors.js';

/* global __CH_DEV_SITE__ */
/* ConnectHub Dev (utviklingsmiljøet): adressen legges inn ved bygging (build/env-guard.js, DEV_SITE). */
const DEV_SITE = typeof __CH_DEV_SITE__ !== 'undefined' ? __CH_DEV_SITE__ : null;
const backendInfo = () => (window.CH && window.CH.backend) || {};
const isProduction = () => backendInfo().target === 'production';

export const Ctx = React.createContext(null);
export const useAdmin = () => React.useContext(Ctx);

export default function AdminPage({ me }) {
  /* Rettigheter, eksplisitt per rolle (speiler databasen, migrering 20261004100000_moderator_access.sql):
     - staff  = systemadministrasjon: Developer ELLER Moderator (som app.is_staff).
     - dev    = bare Developer: utviklerkortet og «Åpne ConnectHub Dev», og å gi/fjerne/invitere Developer og Moderator.
     - collab = bare Moderator: samarbeid (koblinger mellom menigheter). */
  const dev = hasRole(me, 'developer') && me.mfa;
  const collab = hasRole(me, 'moderator') && me.mfa;
  const staff = dev || collab;
  const staffNoMfa = isStaff(me) && !me.mfa;
  const adminOf = (me.roles || []).filter(r => r.role === 'church_admin').map(r => r.church_id);
  const kind = dev ? 'developer' : collab ? 'moderator' : adminOf.length ? 'admin' : 'user';
  const allowed = sectionsFor({ dev, collab, adminOf, churches: me.churches || [] });
  const route = useRoute();
  const [d, setD] = React.useState({ churches: [], users: [], memberships: [], roles: [], invites: [], status: null, pendingSubs: 0, loaded: false });
  const [note, setNote] = React.useState(null);
  const [pending, setPending] = React.useState(0);       // handlinger/lasting som pågår (tynn fremdriftslinje)
  const [invite, setInvite] = React.useState(null);      // åpen «Ny invitasjon» med forhåndsutfylling
  const [ctxChurch, setCtxChurch] = React.useState(null); // valgt menighet for Filer/Abonnement/Logg

  const say = (text, ok = true) => { setNote({ text, ok }); clearTimeout(say._t); say._t = setTimeout(() => setNote(null), 6000); };
  /* Handlinger og lasting. Låser bare det som startet handlingen (knappen selv via Btn, eller skjemaet), aldri hele
     siden – før ble alle klikk ignorert så lenge noe lastet i bakgrunnen. */
  const act = fn => async (...a) => {
    const t = a[0] && a[0].currentTarget, form = t && t.tagName === 'FORM' ? t : null;
    if (form) { if (form.getAttribute('aria-busy') === 'true') return; form.setAttribute('aria-busy', 'true'); }
    if (form || (t && t.nodeType === 1)) setNote(null);
    setPending(n => n + 1);
    try { return await fn(...a); } catch (e) { if (!(e && e.code === 'cancel')) { say(errText(e), false); noteError(e && e.code, errText(e)); } }
    finally { setPending(n => n - 1); if (form) form.removeAttribute('aria-busy'); }
  };

  const reload = React.useCallback(async () => {
    const [churches, users, memberships, roles, invites, status, subs] = await Promise.all([
      admin.churches(), admin.users(), admin.allMemberships(), admin.allRoles(), admin.invitations(null),
      staff ? admin.systemStatus().catch(() => null) : null,
      staff ? SUB.requests(null).catch(() => []) : [],
    ]);
    let v = { churches, users, memberships, roles, invites };
    if (window.CH && window.CH.testRole && !staff) {
      const scope = new Set(adminOf.length ? adminOf : (me.churches || []).map(c => c.id)), inScope = id => scope.has(id);
      const ms = memberships.filter(m => inScope(m.church_id) && (adminOf.length || m.user_id === me.id));
      const people = new Set([me.id, ...ms.map(m => m.user_id)]);
      v = { churches: churches.filter(c => inScope(c.id)), memberships: ms, users: users.filter(u => people.has(u.id)),
        roles: roles.filter(r => people.has(r.user_id) && (!r.church_id || inScope(r.church_id)) && (adminOf.length || r.user_id === me.id)),
        invites: adminOf.length ? invites.filter(i => inScope(i.church_id)) : [] };
    }
    setD({ ...v, status, pendingSubs: subs.filter(s => s.status === 'pending').length, loaded: true });
    setCtxChurch(c => c && v.churches.some(x => x.id === c) ? c : ((v.churches.find(x => adminOf.includes(x.id)) || v.churches[0] || {}).id || null));
  }, [staff]);
  React.useEffect(() => { act(reload)(); }, []);

  const churchName = id => (d.churches.find(c => c.id === id) || {}).name || '–';
  const userById = id => d.users.find(u => u.id === id);
  const userName = id => { const u = userById(id); return u ? (u.full_name || u.email) : (id ? T('Ukjent bruker') : T('System')); };
  const canManage = id => staff || adminOf.includes(id);
  const pendingInvites = d.invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date());
  const isUser = kind === 'user';
  const nav = NAV.filter(([k]) => allowed.has(k));
  const ctx = { me, kind, isUser, staff, dev, collab, staffNoMfa, adminOf, allowed, d, reload, act, say, busy: pending > 0, churchName, userById, userName, canManage, openInvite: p => setInvite(p || {}), ctxChurch, setCtxChurch };

  const [sec0, id, sub] = route, sec = NAV.some(([k]) => k === sec0) ? sec0 : 'oversikt';
  let body;
  if (!allowed.has(sec)) body = <Forbidden />;
  else if (sec === 'brukere') body = <UsersView selected={id} />;
  else if (sec === 'menigheter') body = id ? <ChurchDetail id={id} tab={sub || (canManage(id) ? 'medlemmer' : 'filer')} /> : <ChurchesView />;
  else if (sec === 'invitasjoner') body = <InvitesView />;
  else if (sec === 'filer') body = <><Head title="Filer" sub="Faste ressurser, delt mappe og Samarbeidsfiler. Video kan aldri lastes opp." right={<ChurchPicker />} />{ctxChurch ? <FilesView churchId={ctxChurch} /> : <Card><Empty>{T('Ingen menighet å vise.')}</Empty></Card>}</>;
  else if (sec === 'samarbeid') body = <><Head title="Samarbeid" sub="Koblinger mellom to menigheter. Hver kobling har sin egen Samarbeidsfiler-mappe." /><LinksView /></>;
  else if (sec === 'tilbakemeldinger') body = <FeedbackView selected={id} />;
  else if (sec === 'abonnement') body = <><Head title="Abonnement" sub="Ingen betaling ennå – Developer eller Moderator godkjenner forespørsler." right={!staff && <ChurchPicker />} /><SubsView churchId={staff ? null : ctxChurch} /></>;
  else if (sec === 'logg') body = <><Head title="Logg" sub="Kan ikke endres eller slettes." right={!staff && <ChurchPicker />} /><LogView churchId={staff ? null : ctxChurch} /></>;
  else body = kind === 'user' ? <UserOverview /> : <Overview pendingInvites={pendingInvites} />;

  const counts = { invitasjoner: allowed.has('invitasjoner') ? pendingInvites.length : 0, abonnement: d.pendingSubs };
  const brand = brandOf(kind);
  return <Ctx.Provider value={ctx}>
    <div data-ml-theme="admin" data-ml-bg="static">
      <header className="ch-top" data-ml-bar="1">
        <a className="ch-back" href="media-lab.dc.html">← Media Lab</a>
        <span className="ch-brand">{brand}</span>
        {!isProduction() && <span className="ch-env" data-ch-env title={T('Utviklingsmiljø – egen database og egne kontoer. Endringer her påvirker ikke produksjon.')}>{T('UTVIKLING')} · connecthub-dev</span>}
        <span className="ch-spacer" />
        {(staff || adminOf.length > 0) && <Btn kind="primary" small onClick={() => setInvite({ church: sec === 'menigheter' && id ? id : ctxChurch })}>+ {T('Ny invitasjon')}</Btn>}
        {pending > 0 && <span className="ch-progress" role="progressbar" aria-label={T('Laster …')} />}
      </header>
      <div className="ch-shell">
        <nav className="ch-nav" aria-label={T('Admin')}>
          {nav.map(([k, l]) => <a key={k} href={href(k)} className={sec === k ? 'on' : ''}>{T(l)}{counts[k] > 0 && <span className="ch-count">{counts[k]}</span>}</a>)}
        </nav>
        <main className="ch-main">
          {staffNoMfa && <p className="ch-note warn">{T('Rollen din krever totrinnsbekreftelse. Logg ut og inn igjen og sett opp autentiseringsappen for å bruke stab-rettighetene.')}</p>}
          {note && <p role="status" className={'ch-note ' + (note.ok ? 'ok' : 'bad')}>{note.text}</p>}
          {body}
        </main>
      </div>
      {invite && <InviteDialog initial={invite} onClose={() => setInvite(null)} />}
    </div>
  </Ctx.Provider>;
}

/* Kontrollert avvisning når rollen ikke har tilgang til en side (f.eks. via direkte adresse). */
function Forbidden() {
  return <><Head title="Ingen tilgang" />
    <Card><p className="ch-muted">{T('Rollen din har ikke tilgang til denne siden. Tilgangen kontrolleres også på serveren og i databasen.')}</p>
      <div className="ch-row"><a className="ch-btn" href={href('oversikt')}>{T('Til oversikten')}</a></div></Card></>;
}

/* Oversikt for Moderator: koblinger mellom menigheter (bare metadata, aldri filinnhold). */
/* Samarbeid på oversikten (bare Moderator, som administrerer koblingene). */
function CollabCard() {
  const { act } = useAdmin();
  const [ls, setLs] = React.useState([]);
  React.useEffect(() => { act(async () => setLs(await LK.mine()))(); }, []);
  const active = ls.filter(l => l.status === 'active');
  const churches = new Set(active.flatMap(l => [l.church_a, l.church_b]).filter(Boolean));
  return <Card title="Samarbeid">
    <div className="ch-stats">
      <a className="ch-stat" href={href('samarbeid')}><b>{active.length}</b><span>{T('Aktive koblinger')}</span></a>
      <a className="ch-stat" href={href('samarbeid')}><b>{churches.size}</b><span>{T('Menigheter med kobling')}</span></a>
      <a className="ch-stat" href={href('samarbeid')}><b>{ls.length - active.length}</b><span>{T('Avsluttede koblinger')}</span></a>
    </div>
    <p className="ch-muted">{T('Som Moderator kobler du sammen to og to menigheter. Hver kobling får sin egen Samarbeidsfiler-mappe der menighetene deler kopier av bilder. Du ser bare filnavn og opplysninger om filene – aldri innholdet.')}</p>
    <div className="ch-row"><a className="ch-btn primary" href={href('samarbeid')}>{T('Gå til samarbeid')}</a></div>
  </Card>;
}

export function Head({ title, sub, right, crumb }) {
  return <div className="ch-head">
    <div>{crumb && <div className="ch-crumb">{crumb}</div>}<h1>{T(title)}</h1>{sub && <div className="ch-sub">{T(sub)}</div>}</div>
    {right && <div className="ch-actions">{right}</div>}
  </div>;
}

/* ---------- Oversikt ---------- */
function Overview({ pendingInvites }) {
  const { me, staff, dev, collab, d, churchName, adminOf, act } = useAdmin();
  const [recent, setRecent] = React.useState([]);
  React.useEffect(() => { act(async () => {
    setRecent((await admin.audit(staff ? null : adminOf[0] || null)).slice(0, 8));
  })(); }, []);
  const s = d.status, soon = pendingInvites.filter(i => new Date(i.expires_at) - Date.now() < 2 * 864e5);
  const todo = [
    ...(staff && d.pendingSubs ? [{ k: 'subs', t: d.pendingSubs + ' ' + T('abonnementsforespørsler venter på avgjørelse'), to: href('abonnement') }] : []),
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
    {dev && <DevCard />}
    {collab && <CollabCard />}
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

/* Utviklerinformasjon (bare Developer): miljø og tilstand – ingen hemmeligheter. */
function DevCard() {
  const { me } = useAdmin();
  const b = (window.CH && window.CH.backend) || {};
  return <Card title="Utvikler">
    <dl className="ch-kv">
      <dt>{T('Miljø')}</dt><dd>{T(b.target === 'preview' ? 'Vercel Preview' : b.target === 'local' ? 'Lokal utvikling' : b.target || '–')}</dd>
      <dt>{T('Supabase-prosjekt')}</dt><dd>{b.projectRef || '–'}</dd>
      <dt>{T('Bygg')}</dt><dd>{typeof __ML_BUILD__ !== 'undefined' ? __ML_BUILD__ : '–'}</dd>
      <dt>{T('Bruker-ID')}</dt><dd>{me.id}</dd>
      <dt>{T('Totrinn (MFA)')}</dt><dd>{T(me.mfa ? 'Aktiv i denne økten' : 'Ikke aktiv')}</dd>
      <dt>{T('Testrolle')}</dt><dd>{T(window.CH && window.CH.switcher ? 'Tilgjengelig i kontomenyen' : 'Ikke tilgjengelig her')}</dd>
    </dl>
    <div className="ch-row"><a className="ch-btn small" href={href('logg')}>{T('Logg')}</a></div>
    {isProduction()
      ? <><div className="ch-row"><Badge tone="bad">{T('PRODUKSJON')}</Badge>
          {DEV_SITE && <a className="ch-btn primary" data-ch-devlink href={DEV_SITE + '/connecthub-admin.dc.html'} target="_blank" rel="noopener noreferrer">{T('Åpne ConnectHub Dev')} ↗</a>}</div>
        <p className="ch-muted">{T('Åpner utviklingsmiljøet i en ny fane. Det har egen database og egne kontoer, så du logger inn der på nytt. Endringer der påvirker ikke produksjon.')}</p></>
      : <p className="ch-note warn" data-ch-devhere>{T('Du er i ConnectHub Dev (utvikling). Egen database og egne kontoer – endringer her påvirker ikke produksjon.')}</p>}
  </Card>;
}

/* ---------- Oversikt for vanlige brukere ---------- */
function UserOverview() {
  const { me, d } = useAdmin();
  const mine = d.churches.filter(c => (me.churches || []).some(x => x.id === c.id));
  return <>
    <Head title="Oversikt" sub="Velkommen til ConnectHub." />
    {window.CH && window.CH.testRole === 'admin' && <p className="ch-note warn">{T('Admin-visningen viser menighetene du er medlem av. Legg deg til i en menighet (som Developer) for å teste den.')}</p>}
    <Card title="Mine menigheter" sub={mine.length}>
      {mine.length ? <div className="ch-grid">{mine.map(c => <a key={c.id} className="ch-stat" href={href('menigheter', c.id)}>
        <div className="ch-row"><span className="ch-avatar">{c.name.slice(0, 2).toUpperCase()}</span><b style={{ fontSize: 16 }}>{c.name}</b></div>
        <span>{T('Du er medlem')} · {T('Åpne')} →</span></a>)}</div> : <Empty>{T('Du er ikke medlem av noen menighet ennå. Du får en invitasjon fra menighetens admin.')}</Empty>}
    </Card>
    <div className="ch-grid">
      <Card title="Filer"><p className="ch-muted">{T('Se og legg til bilder i menighetens fellesmappe, ha dine egne private bilder, og se Samarbeidsfiler med menigheter dere samarbeider med.')}</p><div className="ch-row"><a className="ch-btn" href={href('filer')}>{T('Åpne filer')}</a></div></Card>
      <Card title="Profil og varsler"><p className="ch-muted">{T('Navn, telefon, varsler og personvern finner du i kontomenyen nede til høyre.')}</p></Card>
    </div>
  </>;
}

/* ---------- Brukere ---------- */
function UsersView({ selected }) {
  const { d, churchName, staff } = useAdmin();
  const [q, setQ] = React.useState(''), [st, setSt] = React.useState('all'), [role, setRole] = React.useState('all'), [ch, setCh] = React.useState('all');
  const rolesOf = id => d.roles.filter(r => r.user_id === id);
  const memsOf = id => d.memberships.filter(m => m.user_id === id && m.status !== 'removed');
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
        <span className="ch-muted">{memsOf(u.id).filter(m => m.status !== 'removed').map(m => churchName(m.church_id) + (m.status !== 'active' ? ' (' + T('deaktivert') + ')' : '')).join(', ') || T('Ingen aktiv menighet')}</span>,
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
  const allMems = d.memberships.filter(m => m.user_id === u.id);
  const mems = allMems.filter(m => m.status !== 'removed'), gone = allMems.filter(m => m.status === 'removed');
  const active = mems.filter(m => m.status === 'active');
  const join = canJoinAnother(roles, d.memberships, u.id, churchName);
  const invites = d.invites.filter(i => norm(i.email) === norm(u.email));
  const run = (fn, ok) => act(async () => { await fn(); if (ok) say(T(ok)); await reload(); });
  const runMsg = fn => act(async () => { const m = await fn(); if (m) say(m); await reload(); });   // handlinger med bekreftelse (members.js)
  const nm = u.full_name || u.email;
  return <Drawer title={nm} sub={u.email} onClose={onClose}>
    <Card title="Oversikt">
      <dl className="ch-kv" data-ch-usersummary>
        <dt>{T('Bruker')}</dt><dd><b>{nm}</b> <span className="ch-muted">{u.email}</span>{self && <> · {T('Deg')}</>}</dd>
        <dt>{T('Konto')}</dt><dd><StatusBadge s={u.status} /></dd>
        <dt>{T('Rolle')}</dt><dd>{roleSummary(roles, churchName)}</dd>
        <dt>{T('Menighet')}</dt><dd>{active.length ? active.map((m, i) => <React.Fragment key={m.church_id}>{i ? ', ' : ''}<a href={href('menigheter', m.church_id)}>{churchName(m.church_id)}</a></React.Fragment>)
          : <Badge tone="warn">{T('Ingen aktiv menighet')}</Badge>}</dd>
      </dl>
      <p className="ch-muted">{T('Endringer lagres med en gang. Handlinger som fjerner tilgang, ber om bekreftelse først.')}</p>
    </Card>

    <Card title="Opplysninger">
      {self ? <form className="ch-form" onSubmit={e => { e.preventDefault(); run(() => admin.updateMyProfile(u.id, prof.name, prof.phone), 'Opplysningene er lagret.')(e); }}>
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

    <Card title="Menighet og medlemskap" sub={mems.length || null}>
      {mems.length ? <List cols="1fr auto auto" rows={mems.map(m => {
        const adm = roles.find(r => r.role === 'church_admin' && r.church_id === m.church_id);
        const a = { userId: u.id, churchId: m.church_id, name: nm, church: churchName(m.church_id), isAdmin: !!adm, roleId: adm && adm.id };
        return { key: m.church_id, cells: [
          <div><a href={href('menigheter', m.church_id)}><b>{churchName(m.church_id)}</b></a><div className="ch-muted">{T('Medlem siden')} {fmtDate(m.created_at)}</div></div>,
          <div className="ch-row"><StatusBadge s={m.status} />{adm && <RoleBadge r="church_admin" />}</div>,
          <div className="ch-end" data-ch-memberactions>
            {!self && staff && m.status === 'active' && !adm && <Btn small onClick={run(() => admin.assignRole(u.id, 'church_admin', m.church_id, 'Admin-siden'), 'Brukeren er nå admin.')}>{T('Gjør til admin')}</Btn>}
            {!self && staff && adm && <Btn small onClick={runMsg(() => memberActions.revokeAdmin(a))}>{T('Fjern admin-rollen')}</Btn>}
            {!self && canManage(m.church_id) && (m.status === 'active'
              ? <Btn small onClick={runMsg(() => memberActions.disable(a))}>{T('Deaktiver midlertidig')}</Btn>
              : <Btn small onClick={run(() => admin.setMembershipStatus(u.id, m.church_id, 'active'), 'Medlemskapet er aktivert.')}>{T('Aktiver igjen')}</Btn>)}
            {!self && (staff || (canManage(m.church_id) && !adm)) && <Btn small kind="danger" data-ch-removemember onClick={runMsg(() => memberActions.remove(a))}>{T('Fjern fra menigheten')}</Btn>}
          </div>] };
      })} /> : <p className="ch-muted">{T('Brukeren har ingen aktiv menighet. Kontoen finnes fortsatt, men gir ikke tilgang til noen menighets filer eller data.')}</p>}
      {gone.length > 0 && <p className="ch-muted" data-ch-formermember>{T('Tidligere medlem av')}: {gone.map(m => churchName(m.church_id)).join(', ')}</p>}
      {staff && (join.ok ? <div className="ch-row">
        <select className="ch-select" value={addCh} onChange={e => setAddCh(e.target.value)} aria-label={T('Legg til i menighet')}>
          <option value="">{T('Legg til i menighet …')}</option>
          {d.churches.filter(c => c.status === 'active' && !mems.some(m => m.church_id === c.id && m.status === 'active')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Btn disabled={!addCh} onClick={run(async () => { await admin.addMembership(u.id, addCh); setAddCh(''); }, 'Brukeren er lagt til i menigheten.')}>{T('Legg til')}</Btn>
      </div> : <p className="ch-note" data-ch-onechurch>{join.reason}</p>)}
      <p className="ch-muted">{T('«Deaktiver midlertidig» stenger tilgangen til medlemskapet aktiveres igjen. «Fjern fra menigheten» avslutter medlemskapet – brukeren må inviteres på nytt for å komme tilbake.')}</p>
    </Card>

    {staff && <Card title="Globale roller">
      <div className="ch-row">{global.length ? global.map(r => <span key={r.id} className="ch-row"><RoleBadge r={r.role} />{dev && !self && <Btn small onClick={run(() => admin.revokeRole(r.id, 'Admin-siden'), 'Rollen er fjernet.')}>{T('Fjern')}</Btn>}</span>) : <span className="ch-muted">{T('Ingen')}</span>}</div>
      {dev && !self && u.status === 'active' && <div className="ch-row">
        {!global.some(r => r.role === 'moderator') && <Btn small onClick={run(() => admin.assignRole(u.id, 'moderator', null, 'Admin-siden'), 'Brukeren er nå moderator.')}>{T('Gjør til moderator')}</Btn>}
        {!global.some(r => r.role === 'developer') && <Btn small onClick={run(() => { if (!confirm(T('Gi Developer-rollen? Developer har full tilgang til hele ConnectHub.'))) throw Object.assign(new Error(), { code: 'cancel' }); return admin.assignRole(u.id, 'developer', null, 'Admin-siden'); }, 'Brukeren er nå Developer.')}>{T('Gjør til Developer')}</Btn>}
      </div>}
      {!dev && <p className="ch-muted" data-ch-devonly>{T('Bare Developer kan gi eller fjerne rollene Developer og Moderator.')}</p>}
      <p className="ch-muted">{T('Developer og Moderator må bruke totrinnsbekreftelse for at rollen skal virke.')}</p>
    </Card>}

    {staff && !self && <Card title="Konto">
      {!dev && global.length > 0 ? <p className="ch-muted" data-ch-devonly>{T('Bare Developer kan deaktivere eller aktivere en Developer eller Moderator.')}</p> : <>
      <p className="ch-muted">{T(u.status === 'active' ? 'Deaktivering stenger brukeren ute med en gang, i alle menigheter. Ingenting slettes.' : 'Kontoen er deaktivert. Aktivering gir tilgang igjen.')}</p>
      <div className="ch-row">{u.status === 'active'
        ? <Btn kind="danger" onClick={run(() => { if (!confirm(T('Deaktivere kontoen til') + ' ' + nm + '?\n\n' + T('Brukeren stenges ute med en gang, i alle menigheter. Ingenting slettes, og kontoen kan aktiveres igjen.'))) throw Object.assign(new Error(), { code: 'cancel' }); return admin.setUserStatus(u.id, 'disabled'); }, 'Kontoen er deaktivert. Brukeren mister tilgang med en gang.')}>{T('Deaktiver konto')}</Btn>
        : <Btn onClick={run(() => admin.setUserStatus(u.id, 'active'), 'Kontoen er aktivert.')}>{T('Aktiver konto')}</Btn>}</div></>}
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
