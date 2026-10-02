/* ConnectHub admin – Tilbakemeldinger (innboks for Moderator og Developer). Databasen avgjør tilgangen
   (feedback_list m.fl. krever Moderator eller Developer med MFA); siden vises bare for de samme rollene.
   «Kopier sak til Claude» og «Kopier alle saker til Claude» lager strukturert tekst i nettleseren (feedback-core.js)
   og endrer aldri saken. Tekst renses for hemmeligheter på nytt ved kopiering. */
import React from 'react';
import { feedback as FB } from '../../services/feedback.js';
import { formatCase, formatCases, KIND, STATUS, LEVEL, scrubText } from '../../shared/feedback-core.js';
import { T, errText, fmt, Btn, Badge, Card, Empty, Field, Search, Select, List, Drawer, Dialog, go, href } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';

const TONE = { new: 'warn', in_progress: 'role', needs_info: 'warn', resolved: 'ok', rejected: 'bad' };
const ENVS = [['all', 'Alle miljøer'], ['production', 'Produksjon'], ['preview', 'ConnectHub Dev'], ['local', 'Lokal utvikling']];
const ENV_NAME = { production: 'Produksjon', preview: 'ConnectHub Dev', local: 'Lokal utvikling' };
const norm = s => String(s || '').toLowerCase();

/* Kopiering: utklippstavlen, ellers en reserve med markert tekst. Returnerer true/false. */
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
  try { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (e) { return false; }
}
/* Henter historikk for mange saker uten å sende alt på en gang. */
async function eventsFor(ids) {
  const out = {}; for (let i = 0; i < ids.length; i += 8) { const part = ids.slice(i, i + 8); const res = await Promise.all(part.map(id => FB.events(id).catch(() => []))); part.forEach((id, j) => { out[id] = res[j]; }); }
  return out;
}

export function FeedbackView({ selected }) {
  const { act, say } = useAdmin();
  const [list, setList] = React.useState(null);
  const [f, setF] = React.useState({ q: '', kind: 'all', app: 'all', status: 'all', env: 'all', from: '', to: '' });
  const [pick, setPick] = React.useState(() => new Set());
  const [parts, setParts] = React.useState(null);     // store eksporter delt opp
  const [manual, setManual] = React.useState(null);   // reserve når kopiering ikke virker
  const load = React.useCallback(async () => setList(await FB.list()), []);
  React.useEffect(() => { act(load)(); }, []);
  const rows = (list || []).filter(c => (f.kind === 'all' || c.kind === f.kind) && (f.app === 'all' || c.app === f.app) && (f.status === 'all' || c.status === f.status)
    && (f.env === 'all' || (c.context || {}).env === f.env) && (!f.from || c.created_at >= f.from) && (!f.to || c.created_at.slice(0, 10) <= f.to)
    && (!f.q || norm(c.ref + ' ' + c.title + ' ' + c.description + ' ' + c.submitter_name).includes(norm(f.q))));
  const apps = [...new Set((list || []).map(c => c.app).filter(Boolean))].sort();
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  const copied = (ok, msg, text) => { if (ok) say(T(msg)); else { say(T('Kopieringen feilet. Teksten vises i stedet, så du kan kopiere den selv.'), false); setManual(text); } };
  const copyOne = c => act(async () => { const text = formatCase(c, await FB.events(c.id).catch(() => [])); copied(await copyText(text), 'Saken er kopiert og klar til å limes inn i Claude Code.', text); })();
  const copyMany = (cases, scope) => act(async () => {
    if (!cases.length) { say(T('Ingen saker å kopiere.'), false); return; }
    const ps = formatCases(cases, await eventsFor(cases.map(c => c.id)), { scope });
    if (ps.length > 1) { setParts(ps); say(T('Sakene er for mange til å kopieres på én gang. Kopier dem del for del.'), false); return; }
    copied(await copyText(ps[0]), 'Alle valgte saker er kopiert og klare til å limes inn i Claude Code.', ps[0]);
  })();
  const togglePick = id => setPick(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chosen = rows.filter(c => pick.has(c.id));
  const cur = selected && (list || []).find(c => c.id === selected);

  return <>
    <Head title="Tilbakemeldinger" sub="Feil, forbedringsforslag og ønsker fra brukerne. Bare Moderator og Developer ser og behandler sakene." />
    <div className="ch-row">
      <Search value={f.q} onChange={set('q')} placeholder="Søk i referanse, tekst eller avsender …" />
      <Select label="Kategori" value={f.kind} onChange={set('kind')} options={[['all', 'Alle kategorier'], ...Object.entries(KIND)]} />
      <Select label="Applikasjon" value={f.app} onChange={set('app')} options={[['all', 'Alle applikasjoner'], ...apps.map(a => [a, a])]} />
      <Select label="Status" value={f.status} onChange={set('status')} options={[['all', 'Alle statuser'], ...Object.entries(STATUS)]} />
      <Select label="Miljø" value={f.env} onChange={set('env')} options={ENVS} />
      <label className="ch-row ch-muted" style={{ gap: 6 }}>{T('Fra')}<input className="ch-input" type="date" value={f.from} onChange={e => set('from')(e.target.value)} style={{ width: 150 }} /></label>
      <label className="ch-row ch-muted" style={{ gap: 6 }}>{T('Til')}<input className="ch-input" type="date" value={f.to} onChange={e => set('to')(e.target.value)} style={{ width: 150 }} /></label>
    </div>
    <Card title="Kopier til Claude Code" sub={rows.length + ' ' + T('saker vises')}>
      <div className="ch-row" data-fb-copybar>
        <Btn kind="primary" onClick={() => copyMany(rows, 'alle viste saker med gjeldende filter (' + rows.length + ')')} disabled={!rows.length}>{T('Kopier alle saker til Claude')}</Btn>
        {chosen.length > 0 && <Btn onClick={() => copyMany(chosen, 'valgte saker (' + chosen.length + ')')}>{T('Kopier valgte saker til Claude')} ({chosen.length})</Btn>}
        {chosen.length > 0 && <Btn small onClick={() => setPick(new Set())}>{T('Fjern utvalg')}</Btn>}
      </div>
      <p className="ch-muted">{T('«Kopier alle saker» tar med alle saker som vises med gjeldende filter og søk. Huk av saker for å kopiere bare et utvalg. Kopiering endrer ikke status eller notater. Hemmeligheter fjernes, og avsenderens navn og e-post tas ikke med.')}</p>
    </Card>
    {parts && <Card title="Eksport i flere deler" sub={parts.length}>
      <p className="ch-muted">{T('Sakene er delt i deler slik at hver del kan limes inn for seg. Ingen saker er utelatt; hver sak står i sin helhet i én del.')}</p>
      <div className="ch-row">{parts.map((p, i) => <Btn key={i} onClick={() => act(async () => copied(await copyText(p), 'Del ' + (i + 1) + ' er kopiert og klar til å limes inn i Claude Code.', p))()}>{T('Kopier del')} {i + 1}</Btn>)}<Btn small onClick={() => setParts(null)}>{T('Lukk')}</Btn></div>
    </Card>}
    <List cols="28px minmax(90px,auto) minmax(180px,2fr) minmax(120px,1fr) auto auto" head={['', 'Referanse', 'Sak', 'Applikasjon og side', 'Status', '']}
      empty={list === null ? 'Laster …' : 'Ingen tilbakemeldinger passer med filteret.'} onRow={r => go('tilbakemeldinger', r.key)}
      rows={rows.map(c => ({ key: c.id, cells: [
        <input type="checkbox" aria-label={T('Velg') + ' ' + c.ref} checked={pick.has(c.id)} onClick={e => e.stopPropagation()} onChange={() => togglePick(c.id)} />,
        <div><b>{c.ref}</b><div className="ch-muted">{fmt(c.created_at)}</div></div>,
        <div><Badge tone={c.kind === 'bug' ? 'bad' : ''}>{T(KIND[c.kind] || c.kind)}</Badge> <span>{scrubText(c.title || c.description).slice(0, 110)}</span>
          <div className="ch-muted">{T('Fra')} {c.submitter_name || T('ukjent')}{c.church_name ? ' · ' + c.church_name : ''}{c.marked ? ' · 📍 ' + T('markering') : ''}{(c.context && c.context.errors && c.context.errors.length) ? ' · ⚠ ' + c.context.errors.length + ' ' + T('feilmeldinger') : ''}{c.note_count ? ' · ' + c.note_count + ' ' + T('notater') : ''}</div></div>,
        <div><span>{c.app_name || c.app || '–'}</span><div className="ch-muted">{c.page}{c.view ? ' ' + c.view : ''} · {T(ENV_NAME[(c.context || {}).env] || '')}</div></div>,
        <Badge tone={TONE[c.status]}>{T(STATUS[c.status] || c.status)}</Badge>,
        <div className="ch-end"><Btn small onClick={e => { e && e.stopPropagation && e.stopPropagation(); copyOne(c); }}>{T('Kopier sak til Claude')}</Btn></div>] }))} />
    {cur && <CaseDrawer c={cur} onClose={() => go('tilbakemeldinger')} onCopy={() => copyOne(cur)} reload={load} />}
    {selected && list && !cur && <Drawer title={T('Sak')} onClose={() => go('tilbakemeldinger')}><Empty>{T('Fant ikke saken, eller du har ikke tilgang.')}</Empty></Drawer>}
    {manual && <Dialog title={T('Kopier teksten')} onClose={() => setManual(null)}>
      <p className="ch-muted">{T('Merk all teksten (Ctrl/Cmd + A) og kopier den (Ctrl/Cmd + C).')}</p>
      <textarea className="ch-input" readOnly value={manual} style={{ height: 320, padding: 10, fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12 }} onFocus={e => e.target.select()} autoFocus />
    </Dialog>}
  </>;
}

/* Én sak: alt innhold, markering, teknisk kontekst, status, notater og historikk. */
function CaseDrawer({ c, onClose, onCopy, reload }) {
  const { act, say } = useAdmin();
  const [ev, setEv] = React.useState([]);
  const [st, setSt] = React.useState({ status: c.status, reason: c.status_reason || '', note: '' });
  const loadEv = async () => setEv(await FB.events(c.id));
  React.useEffect(() => { setSt({ status: c.status, reason: c.status_reason || '', note: '' }); act(loadEv)(); }, [c.id, c.status]);
  const a = c.answers || {}, x = c.context || {}, m = c.marked;
  const saveStatus = act(async e => {
    e.preventDefault();
    if (st.status === 'rejected' && st.reason.trim().length < 3) { say(T('Skriv en begrunnelse for avvisningen.'), false); return; }
    await FB.setStatus(c.id, st.status, st.reason.trim()); say(T('Statusen er lagret.')); await reload(); await loadEv();
  });
  const addNote = act(async e => { e.preventDefault(); if (!st.note.trim()) return; await FB.addNote(c.id, st.note.trim()); setSt(s => ({ ...s, note: '' })); say(T('Notatet er lagret.')); await reload(); await loadEv(); });
  const kv = (k, v) => v ? <><dt>{T(k)}</dt><dd>{v}</dd></> : null;
  return <Drawer title={c.ref + ' · ' + T(KIND[c.kind] || c.kind)} sub={fmt(c.created_at)} onClose={onClose}>
    <div className="ch-row"><Badge tone={TONE[c.status]}>{T(STATUS[c.status] || c.status)}</Badge><Btn kind="primary" onClick={onCopy}>{T('Kopier sak til Claude')}</Btn></div>
    <Card title="Oppgitt av brukeren">
      {c.title && <p><b>{c.title}</b></p>}
      <p style={{ whiteSpace: 'pre-wrap' }} data-fb-desc>{c.description}</p>
      <dl className="ch-kv">
        {kv('Forventet', a.expected)}{kv('Slik gjenskapes det', a.steps)}{kv('Bør forbedres', a.improve)}{kv('Ønsket funksjon', a.feature)}
        {kv('Hvor i appen', a.where)}{kv('Alvorlighet', a.severity && T(LEVEL[a.severity]))}{kv('Viktighet', a.importance && T(LEVEL[a.importance]))}
        {kv('Avsender', (c.submitter_name || T('ukjent')) + ' · ' + T(c.role || ''))}{kv('Menighet', c.church_name)}
      </dl>
    </Card>
    <Card title="Applikasjon og markering (hentet automatisk)">
      <dl className="ch-kv">{kv('Applikasjon', (c.app_name || '') + (c.app ? ' (' + c.app + ')' : ''))}{kv('Side', c.page)}{kv('Visning', c.view)}</dl>
      {m ? <MarkPreview m={m} /> : <p className="ch-muted">{T('Ingen markering.')}</p>}
    </Card>
    <Card title="Teknisk kontekst (hentet automatisk)">
      <dl className="ch-kv">
        {kv('Miljø', T(ENV_NAME[x.env] || x.env || ''))}{kv('Bygg', x.build)}{kv('Commit', x.commit && (x.commit + (x.branch ? ' (' + x.branch + ')' : '')))}
        {kv('Nettleser', x.browser)}{kv('System', x.os)}{kv('Enhet', x.device)}{kv('Skjerm', x.screen)}{kv('Vindu', x.viewport)}{kv('Språk', x.lang)}{kv('Tidssone', x.tz)}
      </dl>
      {Array.isArray(x.errors) && x.errors.length ? <ul className="ch-muted" data-fb-errors>{x.errors.map((er, i) => <li key={i}>{fmt(er.time)} · {er.kind}{er.code ? ' · ' + er.code : ''}: {er.message}{er.source ? ' (' + er.source + (er.line ? ':' + er.line : '') + ')' : ''}</li>)}</ul> : <p className="ch-muted">{T('Ingen feilmeldinger fanget opp.')}</p>}
    </Card>
    <Card title="Behandling (internt)">
      <form className="ch-form" onSubmit={saveStatus} data-fb-status>
        <Field label="Status"><select className="ch-select" value={st.status} onChange={e => { const v = e.target.value; setSt(s => ({ ...s, status: v })); }}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{T(l)}</option>)}</select></Field>
        <Field label={st.status === 'rejected' ? 'Begrunnelse (påkrevd ved avvisning)' : 'Begrunnelse (valgfritt)'}><input className="ch-input" value={st.reason} maxLength={1000} onChange={e => { const v = e.target.value; setSt(s => ({ ...s, reason: v })); }} /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre status')}</Btn>
      </form>
      <form className="ch-form" onSubmit={addNote} data-fb-note>
        <Field label="Internt notat (vises bare for Moderator og Developer)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 70, padding: '8px 12px' }} value={st.note} maxLength={2000} onChange={e => { const v = e.target.value; setSt(s => ({ ...s, note: v })); }} /></Field>
        <Btn disabled={!st.note.trim()} onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre notat')}</Btn>
      </form>
      {ev.length ? <List cols="auto 1fr" rows={ev.map(e => ({ key: e.id, cells: [<span className="ch-muted">{fmt(e.created_at)}</span>,
        <span>{e.kind === 'note' ? <><b>{T('Notat')}</b> ({e.actor_name || '–'}): {e.text}</> : <><b>{T(STATUS[e.old_status] || e.old_status)} → {T(STATUS[e.new_status] || e.new_status)}</b> ({e.actor_name || '–'}){e.text ? ': ' + e.text : ''}</>}</span>] }))} /> : <p className="ch-muted">{T('Ingen statusendringer eller notater ennå.')}</p>}
    </Card>
  </Drawer>;
}

/* Viser markeringen som en ramme i et skjermomriss med samme sideforhold som brukerens vindu. */
function MarkPreview({ m }) {
  const [w, h] = String(m.viewport || '16×9').split('×').map(Number), r = m.rect || {}, e = m.element || {};
  return <div data-fb-mark>
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: (w || 16) + ' / ' + (h || 9), border: '1px solid var(--line)', borderRadius: 8, background: 'var(--panel)', overflow: 'hidden' }} aria-label={T('Markering i skjermbildet')}>
      <div style={{ position: 'absolute', left: (r.x || 0) + '%', top: (r.y || 0) + '%', width: Math.max(r.w || 0, 1) + '%', height: Math.max(r.h || 0, 1) + '%', border: '2px solid #f5b301', background: 'rgba(245,179,1,.25)', borderRadius: 3 }} />
    </div>
    <p className="ch-muted">{T(m.mode === 'area' ? 'Område' : 'Element')}{e.tag ? ' <' + e.tag + '>' : ''}{e.label ? ' «' + e.label + '»' : ''} · x {r.x} %, y {r.y} %, {r.w} × {r.h} % · {T('vindu')} {m.viewport}</p>
    {e.path && <p className="ch-muted" style={{ wordBreak: 'break-all' }}>{e.path}</p>}
    {e.attrs && Object.keys(e.attrs).length > 0 && <p className="ch-muted" style={{ wordBreak: 'break-all' }}>{Object.entries(e.attrs).map(([k, v]) => k + '="' + v + '"').join(' · ')}</p>}
    <p className="ch-muted">{T('Skjermbilde er ikke støttet i denne versjonen; rammen viser plasseringen i brukerens vindu.')}</p>
  </div>;
}
