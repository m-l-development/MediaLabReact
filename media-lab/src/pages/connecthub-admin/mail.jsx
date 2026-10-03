/* Mail-fanen (bare Developer og Moderator med MFA). Redigering av e-postmalene som ConnectHub sender (velkomstmail ved
   invitasjon og «Nytt passord»), med blokker, fast lenkeboks, logo og forhåndsvisning. Forhåndsvisningen bruker samme
   gjengivelse som serveren (src/shared/mail-render.js) i en sandkasset iframe uten skript. Lenken settes alltid inn av
   systemet ved utsending. Databasen kontrollerer rolle, MFA og malens innhold på nytt, og loggfører alle endringer. */
import React from 'react';
import { mail } from '../../services/mail.js';
import { requests as RQ } from '../../services/requests.js';
import { renderMail, templateProblem, DEFAULT_TEMPLATES, TEMPLATE_KEYS, TEMPLATE_NAMES } from '../../shared/mail-render.js';
import { T, errText, fmt, Btn, Badge, Card, Empty, Field, List } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';

const BLOCK_NAME = { logo: 'Logo', h: 'Overskrift', p: 'Avsnitt', small: 'Liten tekst', hr: 'Skillelinje', link: 'Lenkeboks' };
const KIND = { invite: 'Invitasjon', recovery: 'Nytt passord', test: 'Test', request_received: 'Forespørsel mottatt', request_notify: 'Ny forespørsel (til stab)' };
const copy = t => JSON.parse(JSON.stringify(t));
const toDataUrl = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });

export function MailView() {
  const { act, say } = useAdmin();
  const [key, setKey] = React.useState('welcome');
  const [saved, setSaved] = React.useState({});      // key → { subject, blocks, updated_at, updated_by_name } (bare redigerte)
  const [draft, setDraft] = React.useState(copy(DEFAULT_TEMPLATES.welcome));
  const [status, setStatus] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [logo, setLogo] = React.useState(null);      // data:-adresse til logoen i forhåndsvisningen
  const [outbox, setOutbox] = React.useState([]);
  const [width, setWidth] = React.useState(600);
  const [extra, setExtra] = React.useState(['', '', '']);
  const drag = React.useRef(null);

  const current = k => (saved[k] ? { subject: saved[k].subject, blocks: saved[k].blocks } : DEFAULT_TEMPLATES[k]);
  const loadLogo = async () => {
    const url = await mail.logoUrl().catch(() => null);
    const blob = await fetch(url || '/images/logo-symbol.png').then(r => r.blob()).catch(() => null);
    setLogo(blob ? await toDataUrl(blob) : null);
  };
  const load = async (k = key) => {
    const [list, st, se, ob] = await Promise.all([mail.templates(), mail.status().catch(e => ({ configured: false, error: e.code })), mail.settings(), mail.outbox().catch(() => [])]);
    const m = Object.fromEntries((list || []).map(t => [t.key, t]));
    setSaved(m); setStatus(st); setSettings(se); setOutbox(ob || []);
    const ex = (se && se.notify_extra) || []; setExtra([0, 1, 2].map(i => ex[i] || ''));
    setDraft(copy(m[k] ? { subject: m[k].subject, blocks: m[k].blocks } : DEFAULT_TEMPLATES[k]));
  };
  React.useEffect(() => { act(async () => { await load(); await loadLogo(); })(); }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(current(key));
  const problem = templateProblem(draft);
  const pick = k => { if (k === key) return; if (dirty && !confirm(T('Du har endringer som ikke er lagret. Forkaste dem?'))) return; setKey(k); setDraft(copy(current(k))); };
  const setBlock = (i, patch) => setDraft(d => ({ ...d, blocks: d.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const move = (i, to) => setDraft(d => { if (to < 0 || to >= d.blocks.length || to === i) return d; const b = d.blocks.slice(); const [x] = b.splice(i, 1); b.splice(to, 0, x); return { ...d, blocks: b }; });
  const remove = i => setDraft(d => ({ ...d, blocks: d.blocks.filter((_, j) => j !== i) }));
  const add = t => setDraft(d => ({ ...d, blocks: [...d.blocks, t === 'h' || t === 'p' || t === 'small' ? { t, text: '' } : { t }] }));
  const hasLogo = draft.blocks.some(b => b.t === 'logo');

  const save = act(async () => { if (problem) return; await mail.save(key, draft.subject.trim(), draft.blocks); say(T('Malen er lagret. Den gjelder e-poster som sendes fra nå av.')); await load(key); });
  const reset = act(async () => {
    if (!confirm(T('Gjenopprette standardmalen?') + '\n\n' + T('Endringene i denne malen erstattes av standardteksten. Handlingen loggføres.'))) return;
    await mail.reset(key); say(T('Standardmalen er gjenopprettet.')); await load(key);
  });
  const test = act(async () => { if (dirty && !confirm(T('Testen bruker den lagrede malen, ikke endringene som ikke er lagret. Fortsette?'))) return; const r = await mail.test(key); say(T('Testen er sendt til') + ' ' + r.to + '.'); setOutbox(await mail.outbox().catch(() => [])); });
  const upload = act(async file => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { say(T('Logoen må være PNG eller JPG.'), false); return; }
    if (file.size > 512 * 1024) { say(T('Logoen er for stor (høyst 512 kB).'), false); return; }
    await mail.uploadLogo(file); say(T('Logoen er lagret og brukes i e-poster fra nå av.')); setSettings(await mail.settings()); await loadLogo();
  });
  const resetLogo = act(async () => {
    if (!confirm(T('Bruke standardlogoen (MediaLab-symbolet) igjen?'))) return;
    await mail.resetLogo(); say(T('Standardlogoen brukes igjen.')); setSettings(await mail.settings()); await loadLogo();
  });

  let preview = null, previewErr = null;
  try { preview = renderMail(draft, { link: location.origin + '/login.dc.html?eksempel=1', vars: { navn: 'Ola Nordmann', epost: 'ola.nordmann@example.com', menighet: 'Eksempelmenighet', rolle: 'Bruker' }, logoSrc: logo || 'data:,' }); }
  catch (e) { previewErr = e.message; }
  const meta = saved[key];

  return <>
    <Head title="Mail" sub="E-postene ConnectHub sender: velkomstmail ved invitasjon og e-post for nytt passord. Lenkene lages alltid av systemet." />
    <Card title="Utsending">
      {!status ? <p className="ch-muted">{T('Laster …')}</p> : status.configured
        ? <p className="ch-muted" data-ch-mailstatus>{T('E-post sendes fra')} <b>{status.sender}</b>. {T('Malene under brukes for invitasjoner og «Glemt passord».')}</p>
        : <p className="ch-note warn" data-ch-mailstatus>{T('ConnectHubs e-post er ikke satt opp på serveren ennå. Til da sender Supabase invitasjoner og «Glemt passord» med standardtekst, og malene under brukes ikke.')}{status.error ? ' (' + status.error + ')' : ''}</p>}
    </Card>
    <nav className="ch-tabs" aria-label={T('Maler')}>{TEMPLATE_KEYS.map(k => <a key={k} href="#" className={key === k ? 'on' : ''} onClick={e => { e.preventDefault(); pick(k); }}>{T(TEMPLATE_NAMES[k])}</a>)}</nav>
    <div className="ch-mail" data-ch-mail>
      <Card title={TEMPLATE_NAMES[key]} sub={meta ? T('Endret') + ' ' + fmt(meta.updated_at) + (meta.updated_by_name ? ' · ' + meta.updated_by_name : '') : T('Standardmal')}>
        <Field label="Emne"><input className="ch-input" value={draft.subject} maxLength={150} onChange={e => { const v = e.target.value.replace(/[\r\n]/g, ''); setDraft(d => ({ ...d, subject: v })); }} /></Field>
        <p className="ch-muted" style={{ margin: '10px 0' }}>{T('Skriv **fet** eller *kursiv*. Flettefelt:')} <code>{'{navn}'}</code> <code>{'{epost}'}</code> <code>{'{menighet}'}</code> <code>{'{rolle}'}</code>. {T('Dra blokkene, eller bruk pilene, for å flytte dem.')}</p>
        <ol className="ch-blocks" data-ch-blocks>
          {draft.blocks.map((b, i) => <li key={i} className={'ch-block' + (b.t === 'link' ? ' link' : '')} draggable
            onDragStart={() => { drag.current = i; }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (drag.current !== null) move(drag.current, i); drag.current = null; }}>
            <div className="ch-block-head">
              <span className="ch-grip" aria-hidden="true">⋮⋮</span><b>{T(BLOCK_NAME[b.t])}</b>
              <span className="ch-end">
                <Btn small onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={T('Flytt opp')}>↑</Btn>
                <Btn small onClick={() => move(i, i + 1)} disabled={i === draft.blocks.length - 1} aria-label={T('Flytt ned')}>↓</Btn>
                {b.t !== 'link' && <Btn small onClick={() => remove(i)} aria-label={T('Fjern blokken')}>×</Btn>}
              </span>
            </div>
            {b.t === 'h' && <input className="ch-input" value={b.text || ''} maxLength={200} onChange={e => setBlock(i, { text: e.target.value })} aria-label={T('Overskrift')} />}
            {(b.t === 'p' || b.t === 'small') && <textarea className="ch-input" style={{ height: 'auto', minHeight: 64, padding: 8 }} value={b.text || ''} maxLength={2000} onChange={e => setBlock(i, { text: e.target.value })} aria-label={T(BLOCK_NAME[b.t])} />}
            {b.t === 'link' && <><Field label="Knappetekst"><input className="ch-input" value={b.label || ''} maxLength={60} onChange={e => setBlock(i, { label: e.target.value.replace(/[\r\n]/g, '') })} /></Field>
              <p className="ch-muted" style={{ margin: '6px 0 0' }}>🔒 {T('Lenken settes inn automatisk av systemet ved utsending og kan ikke endres.')}</p></>}
            {b.t === 'logo' && <p className="ch-muted" style={{ margin: 0 }}>{T('Logoen fra kortet «Logo» under.')}</p>}
          </li>)}
        </ol>
        <div className="ch-row" style={{ flexWrap: 'wrap', marginTop: 8 }} data-ch-addblock>
          <Btn small onClick={() => add('h')}>+ {T('Overskrift')}</Btn><Btn small onClick={() => add('p')}>+ {T('Avsnitt')}</Btn>
          <Btn small onClick={() => add('small')}>+ {T('Liten tekst')}</Btn><Btn small onClick={() => add('hr')}>+ {T('Skillelinje')}</Btn>
          <Btn small onClick={() => add('logo')} disabled={hasLogo}>+ {T('Logo')}</Btn>
        </div>
        {problem && <p className="ch-note warn" data-ch-mailproblem>{T(problem)}</p>}
        <div className="ch-row" style={{ flexWrap: 'wrap', marginTop: 12 }}>
          <Btn kind="primary" onClick={save} disabled={!dirty || !!problem}>{T('Lagre')}</Btn>
          <Btn onClick={() => setDraft(copy(current(key)))} disabled={!dirty}>{T('Angre endringer')}</Btn>
          <Btn onClick={reset} disabled={!meta}>{T('Gjenopprett standard')}</Btn>
          <Btn onClick={test} disabled={!status || !status.configured}>{T('Send test til meg')}</Btn>
        </div>
      </Card>
      <Card title="Forhåndsvisning" sub={preview ? preview.subject : ''}>
        <div className="ch-row" style={{ marginBottom: 8 }}><Btn small kind={width === 600 ? 'primary' : ''} onClick={() => setWidth(600)}>{T('PC')}</Btn><Btn small kind={width === 360 ? 'primary' : ''} onClick={() => setWidth(360)}>{T('Mobil')}</Btn></div>
        {preview ? <iframe title={T('Forhåndsvisning av e-posten')} sandbox="" srcDoc={preview.html} data-ch-mailpreview
          style={{ width: '100%', maxWidth: width, height: 560, border: '1px solid var(--line2)', borderRadius: 12, background: '#f1efe9', display: 'block' }} />
          : <Empty>{T(previewErr || 'Ugyldig mal.')}</Empty>}
        <p className="ch-muted" style={{ marginTop: 8 }}>{T('Eksempelverdier vises for flettefeltene, og knappen peker på en eksempeladresse.')}</p>
      </Card>
    </div>
    <Card title="Logo" sub={settings && settings.custom_logo ? T('Egen logo') : T('Standard: MediaLab-symbolet')}>
      <div className="ch-row" style={{ flexWrap: 'wrap', alignItems: 'center' }} data-ch-maillogo>
        {logo && <img src={logo} alt={T('Logo i e-postene')} style={{ width: 88, height: 'auto', background: '#fff', borderRadius: 8, padding: 6 }} />}
        <label className="ch-btn primary">{T(settings && settings.custom_logo ? 'Bytt logo' : 'Last opp logo')}<input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; e.target.value = ''; upload(f); }} /></label>
        {settings && settings.custom_logo && <Btn onClick={resetLogo}>{T('Bruk standardlogo')}</Btn>}
      </div>
      <p className="ch-muted" style={{ marginTop: 8 }}>{T('PNG eller JPG, høyst 512 kB. Logoen legges inn i e-posten som vedlegg, så den vises uten lenke til ConnectHub. Gjelder e-poster som sendes etter endringen.')}</p>
    </Card>
    <Card title="Varslingsadresser" sub={T('Nye forespørsler om konto')}>
      <form className="ch-form" data-ch-notify onSubmit={act(async e => { e.preventDefault(); await RQ.setNotifyExtra(extra.map(x => x.trim()).filter(Boolean)); say(T('Varslingsadressene er lagret.')); setSettings(await mail.settings()); })}>
        <p className="ch-muted">{T('Varsel om nye forespørsler sendes til ConnectHubs avsenderadresse')}{status && status.sender ? ' (' + status.sender + ')' : ''} {T('og til ekstra adresser under (høyst 3). Varselet inneholder bare navn og menighet – telefon og e-post vises bare i ConnectHub.')}</p>
        {extra.map((v, i) => <input key={i} className="ch-input" type="email" placeholder={T('Ekstra adresse') + ' ' + (i + 1)} value={v} maxLength={254} onChange={e => { const x = e.target.value; setExtra(a => a.map((y, j) => (j === i ? x : y))); }} />)}
        <div className="ch-row"><Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre adresser')}</Btn></div>
      </form>
    </Card>
    <Card title="Siste utsendinger" sub={outbox.length}>
      <List cols="minmax(0,1.4fr) auto auto" head={['Mottaker', 'Type', 'Status']} empty="Ingen utsendinger ennå." rows={outbox.map(o => ({ key: o.id, cells: [
        <div><span style={{ wordBreak: 'break-all' }}>{o.to_email}</span><div className="ch-muted">{fmt(o.created_at)}</div></div>,
        <span className="ch-muted">{T(KIND[o.kind] || o.kind)}</span>,
        o.status === 'sent' ? <Badge tone="ok">{T('Sendt')}</Badge> : o.status === 'skipped' ? <Badge>{T('Hoppet over (valgfrie e-poster er av)')}</Badge> : <Badge tone="bad">{T('Feilet')}{o.error_code ? ' · ' + o.error_code : ''}</Badge>] }))} />
    </Card>
  </>;
}
