/* Opprydning: private filer fra brukere som er fjernet fra en menighet (Developer og Moderator).
   Bare metadata – aldri innhold, lenker eller lagringsnøkler. Filnavn vises bare for menigheter der du selv er aktivt
   medlem (menighetssperren); ellers bare antall og størrelse. Databasen og serveren kontrollerer alt på nytt ved sletting. */
import React from 'react';
import { files as FS } from '../../services/files.js';
import { T, mb, fmtDate, Btn, Badge, Card, Empty, List, href, go } from './ui.jsx';
import { useAdmin, Head } from './AdminPage.jsx';
import { fill } from './members.js';

const sumBytes = list => list.reduce((s, r) => s + Number(r.file_size || 0), 0);
/* Små filer vises i KB (ellers står det «0.0 MB»). */
const size = n => { const b = Number(n || 0); return b < 102400 ? (b / 1024).toFixed(1) + ' KB' : mb(b); };

export function CleanupView({ churchId }) {
  const { act, say } = useAdmin();
  const [ov, setOv] = React.useState(null), [list, setList] = React.useState(null), [sel, setSel] = React.useState(() => new Set());
  const load = async () => {
    setOv(await FS.cleanupOverview());
    if (churchId) { try { setList(await FS.cleanupCandidates(churchId)); } catch (e) { setList({ error: e }); } } else setList(null);
    setSel(new Set());
  };
  React.useEffect(() => { act(load)(); }, [churchId]);
  const cur = (ov || []).find(c => c.church_id === churchId);
  const rows = Array.isArray(list) ? list : [];
  const ready = rows.filter(r => r.ready), chosen = rows.filter(r => sel.has(r.id)), bytes = sumBytes(chosen);
  const tot = (ov || []).reduce((t, c) => ({ n: t.n + c.candidates, b: t.b + Number(c.candidate_bytes), rn: t.rn + c.ready, rb: t.rb + Number(c.ready_bytes) }), { n: 0, b: 0, rn: 0, rb: 0 });
  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const del = act(async () => {
    if (!chosen.length) return;
    const church = cur ? cur.church_name : '';
    if (!confirm(fill(T('Slette {count} filer ({size}) fra {church} permanent?'), { count: chosen.length, size: size(bytes), church }) + '\n\n' +
      chosen.slice(0, 10).map(x => '• ' + x.file_name).join('\n') + (chosen.length > 10 ? '\n…' : '') + '\n\n' +
      T('Filene tilhørte tidligere medlemmer og kan ikke hentes tilbake. Menighetens lagringsbruk går ned tilsvarende. Handlingen loggføres.'))) return;
    const r = await FS.cleanup(churchId, chosen.map(x => x.id), chosen.length, bytes);
    say(fill(T('{count} filer er slettet ({size}).'), { count: r.count, size: size(r.bytes) }) +
      (r.storage_failed ? ' ' + fill(T('{n} filer kunne ikke fjernes fra lagringen ennå – prøv igjen.'), { n: r.storage_failed }) : ''), !r.storage_failed);
    await load();
  });
  const retry = act(async () => {
    const r = await FS.cleanupRetry(churchId);
    say(fill(T('Nytt forsøk: {done} fjernet fra lagringen, {failed} feilet.'), { done: r.storage_done, failed: r.storage_failed }), !r.storage_failed);
    await load();
  });

  return <>
    <Head title="Opprydning" sub="Private filer fra brukere som er fjernet fra en menighet. Filene teller fortsatt i menighetens kvote, men ingen har tilgang til dem. Ingenting slettes automatisk." />
    <Card title="Menigheter med filer å rydde" sub={ov ? ov.length : null}>
      {ov && ov.length > 0 && <p className="ch-muted" data-ch-cleanup-total>{fill(T('Totalt {n} filer ({size}), hvorav {rn} klare for sletting ({rsize}).'), { n: tot.n, size: size(tot.b), rn: tot.rn, rsize: size(tot.rb) })}</p>}
      <List cols="minmax(0,1.4fr) auto auto auto" head={['Menighet', 'Filer', 'Klare for sletting', '']} empty={ov ? 'Ingen private filer fra tidligere medlemmer.' : 'Laster …'}
        rows={(ov || []).map(c => ({ key: c.church_id, cells: [
          <div><b>{c.church_name}</b>{(c.queue_pending > 0 || c.queue_failed > 0) && <div className="ch-muted">{fill(T('I kø: {p} · feilet: {f}'), { p: c.queue_pending, f: c.queue_failed })}</div>}</div>,
          <span>{c.candidates} · {size(c.candidate_bytes)}</span>,
          <span>{c.ready} · {size(c.ready_bytes)}</span>,
          <div className="ch-end">{c.can_view
            ? <Btn small kind={c.church_id === churchId ? 'primary' : ''} onClick={() => go('opprydning', c.church_id)}>{T('Vis filer')}</Btn>
            : <span className="ch-muted" data-ch-cleanup-locked>{T('Bare for medlemmer av menigheten')} · <a href={href('menigheter', c.church_id)}>{T('Åpne menigheten')}</a></span>}</div>] }))} />
      <p className="ch-muted">{T('Filnavn vises bare for menigheter der du selv er medlem. Som Developer eller Moderator kan du legge deg til i menigheten under Brukere – det loggføres.')}</p>
    </Card>

    {churchId && <Card title={cur ? cur.church_name : T('Menighet')} sub={rows.length || null}>
      {list && list.error ? <p className="ch-note" data-ch-cleanup-denied>{T('Du må være medlem av menigheten for å se filene.')}</p> : <>
        <List cols="auto minmax(0,1.6fr) auto minmax(0,1fr) auto" head={['', 'Fil', 'Størrelse', 'Tidligere medlem', 'Status']} empty={list ? 'Ingen filer å rydde i denne menigheten.' : 'Laster …'}
          rows={rows.map(r => ({ key: r.id, cells: [
            <input type="checkbox" aria-label={T('Velg') + ' ' + r.file_name} checked={sel.has(r.id)} disabled={!r.ready} onChange={() => toggle(r.id)} />,
            <div><b>{r.file_name}</b><div className="ch-muted">{T('Lastet opp')} {fmtDate(r.uploaded_at)}</div></div>,
            <span>{size(r.file_size)}</span>,
            <div>{r.former_member || T('Ukjent bruker')}<div className="ch-muted">{T('Fjernet')} {fmtDate(r.removed_at)}</div></div>,
            r.ready ? <Badge tone="ok">{T('Klar')}</Badge> : <span data-ch-cleanup-blocked><Badge tone="warn">{T('Ikke klar')}</Badge> <span className="ch-muted">{T(r.reason || '')}</span></span>] }))} />
        {rows.length > 0 && <div className="ch-row" data-ch-cleanup-actions>
          <Btn small onClick={() => setSel(new Set(ready.map(r => r.id)))} disabled={!ready.length}>{T('Velg alle klare')}</Btn>
          {sel.size > 0 && <Btn small onClick={() => setSel(new Set())}>{T('Fjern utvalg')}</Btn>}
          <span className="ch-muted" data-ch-cleanup-summary>{fill(T('Valgt: {count} filer · {size}'), { count: chosen.length, size: size(bytes) })}</span>
          <Btn kind="danger" disabled={!chosen.length} onClick={del}>{T('Slett valgte filer')}</Btn>
        </div>}
        {cur && (cur.queue_failed > 0 || cur.queue_pending > 0) && <div className="ch-row">
          <p className="ch-note warn">{fill(T('{n} slettede filer er ikke fjernet fra lagringen ennå. Radene er slettet og registrert; prøv igjen for å fjerne selve filene.'), { n: cur.queue_failed + cur.queue_pending })}</p>
          <Btn small onClick={retry}>{T('Prøv igjen')}</Btn></div>}
      </>}
    </Card>}
  </>;
}
