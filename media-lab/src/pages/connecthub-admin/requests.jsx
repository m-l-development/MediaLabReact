/* «Forespørsler» (bare Developer og Moderator med MFA): forespørsler om brukerkonto fra innloggingssiden. Behandling,
   historikk og «Opprett bruker» (A ny menighet, B eksisterende menighet, C uten menighet – bare Developer/Moderator-roller,
   og bare Developer kan gi dem). Databasen kontrollerer rolle, MFA og reglene for invitasjoner og loggfører alt. */
import React from 'react';
import { requests as RQ } from '../../services/requests.js';
import { T, errText, fmt, Btn, Badge, Card, Empty, Field, List, Dialog, Select, href } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';

const STATUS = { new: 'Ny', in_progress: 'Under behandling', approved: 'Godkjent', rejected: 'Avslått' };
const TONE = { new: 'warn', in_progress: '', approved: 'ok', rejected: 'bad' };
const EVENT = { submitted: 'Mottatt', resubmitted: 'Sendt inn på nytt', status: 'Status endret', note: 'Notat', approved: 'Bruker opprettet (invitasjon sendt)', rejected: 'Avslått' };
const ROLE_OPT = { user: 'Bruker', church_admin: 'Admin (fast)', moderator: 'Moderator', developer: 'Developer' };
const open = r => r.status === 'new' || r.status === 'in_progress';

export function RequestsView({ selected }) {
  const { act, say, dev, d, reload } = useAdmin();
  const [list, setList] = React.useState(null);
  const [filter, setFilter] = React.useState('open');
  const [events, setEvents] = React.useState([]);
  const [note, setNote] = React.useState('');
  const [dlg, setDlg] = React.useState(null);   // { mode, churchName, churchId, role }
  const load = async () => setList(await RQ.list());
  React.useEffect(() => { act(load)(); }, []);
  const cur = (list || []).find(r => r.id === selected);
  React.useEffect(() => { setNote(''); setDlg(null); if (cur) act(async () => setEvents(await RQ.events(cur.id)))(); else setEvents([]); }, [selected, list && cur && cur.status]);
  const run = (fn, ok) => act(async () => { const m = await fn(); if (m === false) return; say(typeof m === 'string' ? m : T(ok)); await load(); if (cur) setEvents(await RQ.events(cur.id)); });
  const rows = (list || []).filter(r => filter === 'all' || (filter === 'open' ? open(r) : r.status === filter));
  const churches = (d.churches || []).filter(c => c.status === 'active');
  const approve = run(async () => {
    const r = await RQ.approve(cur.id, dlg); setDlg(null); await reload();
    return T(r.email_sent ? 'Invitasjonen er sendt. Brukeren oppretter kontoen og passordet sitt fra lenken i e-posten.' : 'Invitasjonen er laget, men e-posten kunne ikke sendes. Send den på nytt under Invitasjoner.');
  });
  const canApprove = dlg && (dlg.mode === 'new' ? dlg.churchName.trim().length >= 2 && ['user', 'church_admin'].includes(dlg.role)
    : dlg.mode === 'existing' ? !!dlg.churchId && ['user', 'church_admin'].includes(dlg.role) : ['moderator', 'developer'].includes(dlg.role));

  return <>
    <Head title="Forespørsler" sub="Forespørsler om brukerkonto fra innloggingssiden. Ingen konto opprettes før du oppretter brukeren." />
    <div className="ch-grid" style={{ gridTemplateColumns: cur ? 'minmax(0,1fr) minmax(0,1.2fr)' : undefined }} data-ch-requests>
      <Card title="Innboks" sub={rows.length}>
        <div className="ch-row" style={{ marginBottom: 8 }}><Select label="Visning" value={filter} onChange={setFilter} options={[['open', 'Åpne'], ['approved', 'Godkjent'], ['rejected', 'Avslått'], ['all', 'Alle']]} /></div>
        <List cols="minmax(0,1fr) auto" empty={list ? 'Ingen forespørsler.' : 'Laster …'} onRow={r => { location.hash = href('foresporsler', r.key); }} rows={rows.map(r => ({ key: r.id, cells: [
          <div data-ch-req={r.id}><b>{r.anonymized ? T('(anonymisert)') : r.name}</b>
            <div className="ch-muted" style={{ wordBreak: 'break-all' }}>{r.email || ''} · {r.church_text || ''}</div>
            <div className="ch-muted">{fmt(r.created_at)}</div></div>,
          <div className="ch-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}><Badge tone={TONE[r.status]}>{T(STATUS[r.status])}</Badge>
            {r.resubmits > 0 && <Badge>{T('Sendt på nytt')} ×{r.resubmits}</Badge>}{r.existing_user_id && <Badge tone="warn">{T('Har konto')}</Badge>}</div>] }))} />
      </Card>
      {cur && <Card title={cur.anonymized ? '(anonymisert)' : cur.name} sub={T(STATUS[cur.status])}>
        <div data-ch-reqdetail>
          <dl className="ch-dl">
            <dt>{T('Telefonnummer')}</dt><dd>{cur.phone || '–'}</dd>
            <dt>{T('E-postadresse')}</dt><dd style={{ wordBreak: 'break-all' }}>{cur.email || '–'}</dd>
            <dt>{T('Menighet / annet')}</dt><dd>{cur.church_text || '–'}</dd>
            <dt>{T('Mottatt')}</dt><dd>{fmt(cur.created_at)}{cur.resubmits ? ' · ' + T('sendt på nytt') + ' ' + cur.resubmits + '×' : ''}</dd>
            {cur.decided_at && <><dt>{T('Avgjort')}</dt><dd>{fmt(cur.decided_at)} · {cur.decided_by_name}{cur.decision_note ? ' – ' + cur.decision_note : ''}</dd></>}
          </dl>
          {cur.existing_user_id && <p className="ch-note warn" data-ch-reqexists>{T('E-postadressen har allerede en konto:')} <a href={href('brukere', cur.existing_user_id)}>{cur.existing_user_name}</a>. {T('Det opprettes ingen ny konto – legg brukeren til i en menighet fra brukersiden ved behov.')}</p>}
          {open(cur) && <div className="ch-row" style={{ flexWrap: 'wrap', margin: '12px 0' }}>
            <Btn kind="primary" data-ch-reqcreate disabled={!!cur.existing_user_id} onClick={() => setDlg({ mode: 'existing', churchName: cur.church_text || '', churchId: '', role: 'user' })}>{T('Opprett bruker')}</Btn>
            {cur.status === 'new' && <Btn onClick={run(() => RQ.setStatus(cur.id, 'in_progress'), 'Satt til «Under behandling».')}>{T('Under behandling')}</Btn>}
            <Btn kind="danger" onClick={run(async () => { const why = prompt(T('Begrunnelse for avslaget (vises bare i ConnectHub):')); if (!why || why.trim().length < 2) return false; await RQ.reject(cur.id, why.trim()); }, 'Forespørselen er avslått.')}>{T('Avslå')}</Btn>
          </div>}
          <form className="ch-form" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; run(async () => { await RQ.addNote(cur.id, note.trim()); setNote(''); }, 'Notatet er lagret.')(); }}>
            <Field label="Internt notat"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></Field>
            <div className="ch-row"><Btn small disabled={!note.trim()} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre notat')}</Btn></div>
          </form>
          <h3 className="ch-h3">{T('Historikk')}</h3>
          <ol className="ch-history" style={{ margin: 0, paddingLeft: 18 }} data-ch-reqhistory>{events.map((e, i) => <li key={i} className="ch-muted"><b>{T(EVENT[e.kind] || e.kind)}</b>{e.kind === 'status' ? ': ' + T(STATUS[e.old_status]) + ' → ' + T(STATUS[e.new_status]) : ''}{e.text ? ' – ' + e.text : ''} · {fmt(e.created_at)}{e.actor_name ? ' · ' + e.actor_name : ''}</li>)}</ol>
          <div className="ch-row" style={{ marginTop: 12 }}><Btn small kind="danger" onClick={run(async () => { if (!confirm(T('Slette forespørselen permanent (f.eks. spam)? Handlingen loggføres.'))) return false; await RQ.remove(cur.id); location.hash = href('foresporsler'); }, 'Forespørselen er slettet.')}>{T('Slett')}</Btn></div>
        </div>
      </Card>}
    </div>
    {dlg && cur && <Dialog title={T('Opprett bruker')} onClose={() => setDlg(null)}>
      <form onSubmit={e => { e.preventDefault(); if (canApprove) approve(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ch-reqdialog>
        <p className="ch-muted">{cur.name} · {cur.email}</p>
        <div role="radiogroup" aria-label={T('Velg')} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['existing', 'B. Legg til i eksisterende menighet'], ['new', 'A. Opprett ny menighet'], ['none', 'C. Uten menighet (Developer/Moderator)']].map(([k, l]) =>
            <label key={k} className="ch-row" style={{ gap: 8 }}><input type="radio" name="mode" checked={dlg.mode === k} onChange={() => setDlg(x => ({ ...x, mode: k, role: k === 'none' ? 'moderator' : 'user' }))} /> {T(l)}</label>)}
        </div>
        {dlg.mode === 'new' && <Field label="Navn på ny menighet"><input className="ch-input" maxLength={100} value={dlg.churchName} onChange={e => { const v = e.target.value; setDlg(x => ({ ...x, churchName: v })); }} /></Field>}
        {dlg.mode === 'existing' && <Field label="Menighet"><select className="ch-select" value={dlg.churchId} onChange={e => { const v = e.target.value; setDlg(x => ({ ...x, churchId: v })); }}>
          <option value="">{T('Velg menighet …')}</option>{churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        <Field label="Rolle"><select className="ch-select" value={dlg.role} onChange={e => { const v = e.target.value; setDlg(x => ({ ...x, role: v })); }}>
          {(dlg.mode === 'none' ? ['moderator', ...(dev ? ['developer'] : [])] : ['user', 'church_admin']).map(r => <option key={r} value={r}>{T(ROLE_OPT[r])}</option>)}</select></Field>
        {dlg.mode === 'none' && !dev && <p className="ch-note warn">{T('Bare Developer kan gi rollene Developer og Moderator.')}</p>}
        <p className="ch-muted">{T('Personen får en sikker invitasjonslenke på e-post og velger sitt eget passord. Rolle- og menighetsreglene gjelder som ved vanlige invitasjoner.')}</p>
        <div className="ch-row"><Btn kind="primary" disabled={!canApprove} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Opprett og send invitasjon')}</Btn><Btn onClick={() => setDlg(null)}>{T('Avbryt')}</Btn></div>
      </form>
    </Dialog>}
  </>;
}
