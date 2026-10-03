/* ConnectHub – Filer: Fellesmappe, Samarbeidsmappe og Faste.
   - Fellesmappe (mappen 'bilder' i databasen, før «Delt mappe»): bilder som deles i menigheten. Alle medlemmer ser, laster
     ned og laster opp; egne filer kan slettes, Admin rydder i alt. Ingen «Privat (bare meg)» her (eldre private
     bilder vises fortsatt for eieren, merket Privat).
   - Samarbeidsmappe (mappen 'samarbeid', før «Samarbeidsfiler»): én per aktiv samarbeidsgruppe. Vises bare når menigheten
     er aktivt medlem av en aktiv gruppe. Alle medlemmer i menighetene i gruppen ser, laster ned og laster opp (direkte, eller
     en kopi fra Fellesmappe/Faste – originalen blir liggende). Den som lastet opp direkte, kan slette filen; Admin kan slette
     alt menigheten har bidratt med.
   - Faste – felles ressurser (faste, logoer, bakgrunner, mockups): Admin vedlikeholder, alle ser og laster ned.
   Felles for alle: forhåndsvisning, flervalg, «Last ned» (flere filer som ZIP), «Eksporter» (hele mappen som ZIP) og «Slett»
   med bekreftelse. Grensesnittet skjuler bare knapper; databasen (RLS og funksjoner) og serveren avgjør alt.
   Mappenavnene i databasen er uendret. */
import React from 'react';
import { DEFAULT_QUOTA_MB } from '../../services/admin.js';
import { files as FS } from '../../services/files.js';
import { links as LK, linkName, activeMembers, otherChurches, memberName } from '../../services/community.js';
import { T, errText, fmtDate, mb, Btn, Badge, Card, Empty, Field, Dialog, go } from './ui.jsx';
import { useAdmin } from './AdminPage.jsx';
import { Thumb, downloadOriginal, peekThumb } from './thumbs.jsx';
import { fill } from './members.js';
import { zipParts, safeName } from '../../shared/zip.js';

export const AREAS = {
  delt: { key: 'felles', label: 'Fellesmappe', folders: [['bilder', 'Fellesmappe']],
    info: 'Bilder som deles i menigheten. Alle medlemmer kan se, laste ned og laste opp. Du kan slette dine egne; Admin kan rydde i alt.' },
  samarbeid: { key: 'samarbeid', label: 'Samarbeidsmappe', folders: [['samarbeid', 'Samarbeidsmappe']],
    info: 'Bilder som deles med menighetene i samarbeidsgruppen. Alle menighetene i gruppen kan se, laste ned og laste opp. Du kan også dele en kopi fra Fellesmappe eller Faste – originalen blir liggende. Du kan slette bilder du selv har lastet opp hit; Admin kan slette alt menigheten har bidratt med.' },
  faste: { key: 'faste', label: 'Faste – felles ressurser', folders: [['faste', 'Faste bilder'], ['logoer', 'Logoer'], ['bakgrunner', 'Bakgrunner'], ['mockups', 'Mockups']],
    info: 'Felles bilder og logoer som brukes i flere verktøy (Photo Design, Thumbnail Studio, Mockups m.fl.). Admin legger til, organiserer og fjerner. Alle medlemmer kan se og laste ned.' },
};
/* Adressene: #/filer/felles, #/filer/samarbeid, #/filer/faste */
export const URL_AREA = { felles: 'delt', samarbeid: 'samarbeid', faste: 'faste' };
const FOLDER_NAME = { bilder: 'Fellesmappe', faste: 'Faste bilder', logoer: 'Logoer', bakgrunner: 'Bakgrunner', mockups: 'Mockups' };
const MAX_ZIP_BYTES = 500 * 1048576;

/* Ikoner (mappe og samarbeidsmappe) – samme strek som resten av ConnectHub. */
const FOLDER_PATH = 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z';
export function FolderIcon({ kind, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d={FOLDER_PATH} />
    {kind === 'samarbeid' && <><circle cx="9.6" cy="12.6" r="1.7" /><circle cx="14.4" cy="12.6" r="1.7" /><path d="M7 17.2c.5-1.2 1.4-1.8 2.6-1.8s2.1.6 2.4 1.4c.3-.8 1.2-1.4 2.4-1.4s2.1.6 2.6 1.8" /></>}
    {kind === 'faste' && <path d="M12 10.5v6M9.5 13.5h5" />}
  </svg>;
}

/* Aktive samarbeidsgrupper der en av brukerens menigheter er aktivt medlem (databasen gir bare egne grupper; stab får alle,
   men my_church er bare satt når brukeren selv er medlem). */
export const activeGroupsFor = (list, churchId) => (list || []).filter(l => l.status === 'active'
  && (churchId ? activeMembers(l).some(m => m.church_id === churchId) : !!l.my_church));
export function useMyGroups() {
  const [g, setG] = React.useState(null);
  React.useEffect(() => { let live = true; LK.mine().then(l => { if (live) setG(activeGroupsFor(l)); }, () => { if (live) setG([]); }); return () => { live = false; }; }, []);
  return g;
}

/* Snarveier til mappene (oversikten). Samarbeidsmappe vises bare når menigheten er med i en aktiv samarbeidsgruppe. */
export function FolderButtons() {
  const { me } = useAdmin();
  const groups = useMyGroups();
  if (!(me.churches || []).length) return null;
  return <div className="ch-folder-buttons" data-ch-folder-buttons>
    <a className="ch-folder-btn felles" href="#/filer/felles" data-ch-folder="felles"><FolderIcon kind="delt" size={22} /><span><b>{T('Fellesmappe')}</b><small>{T('Bilder som deles i menigheten')}</small></span></a>
    {groups && groups.length > 0 && <a className="ch-folder-btn samarbeid" href="#/filer/samarbeid" data-ch-folder="samarbeid"><FolderIcon kind="samarbeid" size={22} /><span><b>{T('Samarbeidsmappe')}</b><small>{groups.length === 1 ? linkName(groups[0]) : fill(T('{n} samarbeidsgrupper'), { n: groups.length })}</small></span></a>}
  </div>;
}

function saveBlob(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
const today = () => new Date().toISOString().slice(0, 10);

/* Henter originalene (nye lenker i bunker på 100, fire nedlastinger om gangen) og pakker dem i én ZIP. */
async function zipDownload(items, zipName, onStep) {
  const out = new Array(items.length), failed = [];
  let done = 0;
  for (let i = 0; i < items.length; i += 100) {
    const part = items.slice(i, i + 100), urls = await FS.urls(part.map(x => x.id));
    let next = 0;
    const worker = async () => {
      while (next < part.length) {
        const j = next++, x = part[j];
        try {
          if (!urls[x.id]) throw new Error('not_found');
          const r = await fetch(urls[x.id], { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('http');
          out[i + j] = { name: x.file_name, data: new Uint8Array(await r.arrayBuffer()), date: x.created_at ? new Date(x.created_at) : undefined };
        } catch (e) { failed.push(x.file_name); }
        onStep(++done, items.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
  const got = out.filter(Boolean);
  if (got.length) saveBlob(new Blob(zipParts(got), { type: 'application/zip' }), safeName(zipName) + '.zip');
  return { ok: got.length, failed };
}

/* Forhåndsvisning av ett bilde (originalen), med forrige/neste, Last ned og Slett. Esc lukker, piltastene blar. */
function Preview({ list, id, onId, onClose, info, canDel, onDownload, onDelete }) {
  const i = list.findIndex(x => x.id === id), x = list[i];
  const [src, setSrc] = React.useState(() => (x && peekThumb(x.id)) || null), [err, setErr] = React.useState(false);
  React.useEffect(() => {
    if (!x) return undefined;
    let live = true, u = null; setErr(false); setSrc(peekThumb(x.id) || null);
    FS.urls([x.id]).then(async urls => {
      if (!urls[x.id]) throw new Error('not_found');
      const r = await fetch(urls[x.id], { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('http');
      u = URL.createObjectURL(await r.blob()); if (live) setSrc(u); else URL.revokeObjectURL(u);
    }).catch(() => { if (live) setErr(true); });
    return () => { live = false; if (u) setTimeout(() => URL.revokeObjectURL(u), 1000); };
  }, [x && x.id]);
  React.useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft' && i > 0) onId(list[i - 1].id); else if (e.key === 'ArrowRight' && i < list.length - 1) onId(list[i + 1].id); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [i, list]);
  if (!x) return null;
  return <div className="ch-overlay center ch-lightbox" onClick={e => { if (e.target === e.currentTarget) onClose(); }} data-ch-preview>
    <div className="ch-lightbox-box" role="dialog" aria-modal="true" aria-label={T('Forhåndsvisning') + ': ' + x.file_name}>
      <header><b style={{ wordBreak: 'break-all' }}>{x.file_name}</b><span className="ch-muted">{i + 1} / {list.length}</span><button className="ch-x" onClick={onClose} aria-label={T('Lukk')}>✕</button></header>
      <div className="ch-lightbox-img">
        {i > 0 && <button className="ch-lightbox-nav prev" onClick={() => onId(list[i - 1].id)} aria-label={T('Forrige')}>‹</button>}
        {src ? <img src={src} alt={x.file_name} /> : <span className="ch-muted">{T(err ? 'Bildet kunne ikke vises. Prøv å laste det ned.' : 'Laster …')}</span>}
        {i < list.length - 1 && <button className="ch-lightbox-nav next" onClick={() => onId(list[i + 1].id)} aria-label={T('Neste')}>›</button>}
      </div>
      <footer><span className="ch-muted">{info(x)}</span>
        <span className="ch-row"><Btn small kind="primary" onClick={() => onDownload(x)}>{T('Last ned')}</Btn>{canDel(x) && <Btn small kind="danger" onClick={() => onDelete([x])}>{T('Slett')}</Btn>}</span></footer>
    </div>
  </div>;
}

/* Sist viste liste per menighet og mappe (resten av besøket): bytte fram og tilbake viser lista med en gang, og den
   oppdateres i bakgrunnen. */
const FILE_LISTS = new Map();
export function FilesView({ churchId, area: routeArea }) {
  const { me, adminOf, churchName, userById, act } = useAdmin();
  const member = (me.churches || []).some(c => c.id === churchId) || adminOf.includes(churchId);
  const admin_ = adminOf.includes(churchId);   // M1: Faste og sletting av alt menigheten har bidratt med i Samarbeidsmappen
  const routed = routeArea !== undefined;      // i Filer-seksjonen styrer adressen fanen; i menighetsdetaljene en lokal fane
  const want = URL_AREA[routeArea] || 'delt';
  const [fl, setFl] = React.useState({ area: want, folder: AREAS[want].folders[0][0], list: [], loading: true, usage: null, over: false, links: [], linksReady: false, link: null, copy: null });
  const [sel, setSel] = React.useState(() => new Set());
  const [pv, setPv] = React.useState(null);        // id til bildet som forhåndsvises
  const [ask, setAsk] = React.useState(null);      // bekreftelse før sletting
  const [job, setJob] = React.useState(null);      // pågående opplasting/nedlasting (tekst)
  const [msg, setMsg] = React.useState(null);      // tilbakemelding i mappen { text, ok }
  const seq = React.useRef(0), linksRef = React.useRef([]);
  const tell = (text, ok = true) => { setMsg({ text, ok }); clearTimeout(tell._t); tell._t = setTimeout(() => setMsg(null), ok ? 6000 : 12000); };

  /* Viser valgt mappe straks (fra hurtigbufferen hvis den finnes); lista og forbruket hentes parallelt. Bildene hentes av
     <Thumb> når de vises. Bare siste valg vinner hvis brukeren bytter raskt. */
  const load = async (folder = fl.folder, area = fl.area, { usage = false, link = fl.link } = {}) => {
    const n = ++seq.current, key = churchId + '|' + folder + (folder === 'samarbeid' ? '|' + link : ''), hit = FILE_LISTS.get(key);
    setFl(f => ({ ...f, area, folder, link, list: hit || [], loading: !hit }));
    const [list, use] = await Promise.all([folder === 'samarbeid' ? (link ? FS.listLink(link) : []) : FS.list({ churchId, folder }), usage ? FS.usage(churchId) : null]);
    FILE_LISTS.set(key, list);
    if (n === seq.current) setFl(f => ({ ...f, list, loading: false, usage: use || f.usage }));
  };
  const openArea = (area, { usage = false } = {}) => {
    const links = linksRef.current, link = area === 'samarbeid' ? (links.some(l => l.id === fl.link) ? fl.link : (links[0] || {}).id || null) : fl.link;
    setSel(new Set()); setPv(null);
    return load(AREAS[area].folders[0][0], area, { usage, link });
  };
  /* Aktive samarbeidsgrupper der denne menigheten er aktivt medlem. */
  const loadLinks = async () => {
    const links = activeGroupsFor(await LK.mine().catch(() => []), churchId);
    linksRef.current = links;
    setFl(f => ({ ...f, links, linksReady: true, link: f.link && links.some(l => l.id === f.link) ? f.link : (links[0] || {}).id || null }));
    return links;
  };
  React.useEffect(() => {
    if (!churchId || !member) return;
    setFl(f => ({ ...f, usage: null, links: [], linksReady: false, link: null })); setSel(new Set()); setPv(null); setMsg(null);
    act(async () => {
      const links = await loadLinks();
      const link = (links[0] || {}).id || null;
      await load(AREAS[want].folders[0][0], want, { usage: true, link });
    })();
  }, [churchId, member]);
  /* Ny adresse (fane, snarvei fra oversikten eller forsiden) → åpne mappen. */
  React.useEffect(() => { if (routed && fl.linksReady && want !== fl.area) act(() => openArea(want))(); }, [want]);
  if (!member) return <Card title="Filer"><p className="ch-note warn">{T('Du er ikke medlem av denne menigheten. Filer vises bare for medlemmer – også for Developer og Moderator.')}</p></Card>;

  const A = AREAS[fl.area], collab = fl.area === 'samarbeid';
  const curLink = fl.links.find(l => l.id === fl.link), others = l => otherChurches(l, churchId);
  const othersText = l => others(l).map(m => m.name).join(', ') || T('(ingen andre menigheter)');
  const noGroup = collab && fl.linksReady && !curLink;
  const canUpload = collab ? !!curLink : (fl.area === 'delt' || admin_);
  const mine = x => x.uploaded_by === me.id;
  const canDel = x => collab ? x.church_id === churchId && (admin_ || (x.link_upload && mine(x))) : admin_ || (fl.area === 'delt' && mine(x));
  /* Kopi til Samarbeidsmappen: Fellesmappe for alle medlemmer, Faste bare for Admin, aldri private filer. */
  const canCopy = x => fl.links.length > 0 && !collab && x.visibility === 'church' && (fl.area === 'delt' || admin_);
  const fromName = x => x.church_id === churchId ? churchName(churchId) : memberName(curLink, x.church_id);
  const who = x => { const u = x.uploaded_by && userById(x.uploaded_by); return u ? (u.full_name || u.email) : null; };
  const info = x => [mb(x.file_size), fmtDate(x.created_at), collab ? T('Fra') + ' ' + fromName(x) + (x.link_upload ? '' : ' (' + T('kopi') + ')') : who(x), x.visibility === 'private' ? T('Privat') : null].filter(Boolean).join(' · ');
  /* Det som vises: i Samarbeidsmappen bare filer fra menighetene som er med i gruppen nå (databasen skjuler resten). */
  const sections = collab ? (curLink ? [['oss', fl.list.filter(x => x.church_id === churchId), T('Fra oss') + ' (' + churchName(churchId) + ')'],
    ...others(curLink).map(m => [m.church_id, fl.list.filter(x => x.church_id === m.church_id), T('Fra') + ' ' + m.name])] : [])
    : [['alle', fl.list, T((A.folders.find(x => x[0] === fl.folder) || [])[1] || '')]];
  const shown = sections.flatMap(s => s[1]);
  const selected = shown.filter(x => sel.has(x.id));
  const clearCache = () => { for (const k of [...FILE_LISTS.keys()]) if (k.startsWith(churchId + '|')) FILE_LISTS.delete(k); };
  const toggle = id => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = shown.length > 0 && shown.every(x => sel.has(x.id));
  const folderLabel = collab ? T('Samarbeidsmappe') + (curLink ? ' – ' + linkName(curLink) : '') : T((A.folders.find(x => x[0] === fl.folder) || [])[1] || A.label);

  const upload = async list => {
    if (!canUpload || !list.length) return;
    let n = 0; const bad = [];
    for (const [i, file] of list.entries()) {
      setJob(fill(T('Laster opp {i} av {n} …'), { i: i + 1, n: list.length }));
      try {
        if (collab) await FS.uploadToLink(file, { linkId: fl.link, churchId });
        else await FS.upload(file, { churchId, folder: fl.folder });   // ingen «Privat (bare meg)» i Fellesmappe og Faste
        n++;
      } catch (err) { bad.push(file.name + ': ' + errText(err)); }
    }
    setJob(null);
    if (bad.length) tell((n ? fill(T('{n} av {total} filer er lastet opp.'), { n, total: list.length }) + ' ' : T('Ingen filer ble lastet opp.') + ' ') + bad.join(' · '), false);
    else tell(fill(T('{n} filer er lastet opp til {folder}.'), { n, folder: folderLabel }));
    clearCache(); await load(undefined, undefined, { usage: true }).catch(() => {});
  };
  const downloadOne = async x => {
    try { setJob(T('Laster ned …')); await downloadOriginal(x.id, x.file_name); tell(fill(T('«{name}» er lastet ned.'), { name: x.file_name })); }
    catch (e) { tell(T('Filen kunne ikke lastes ned.') + ' ' + errText(e), false); } finally { setJob(null); }
  };
  /* Flere filer → én ZIP. «Eksporter» = alt som vises i mappen. */
  const downloadMany = async (items, zipName) => {
    if (!items.length) return;
    if (items.length === 1) return downloadOne(items[0]);
    const bytes = items.reduce((s, x) => s + Number(x.file_size || 0), 0);
    if (bytes > MAX_ZIP_BYTES) return tell(fill(T('Utvalget er for stort til én ZIP-fil ({size}, høyst 500 MB). Velg færre filer.'), { size: mb(bytes) }), false);
    try {
      setJob(fill(T('Pakker 0 av {n} filer …'), { n: items.length }));
      const r = await zipDownload(items, zipName, (i, n) => setJob(fill(T('Pakker {i} av {n} filer …'), { i, n })));
      if (!r.ok) tell(T('Ingen av filene kunne lastes ned. Prøv igjen.'), false);
      else if (r.failed.length) tell(fill(T('{n} filer er lastet ned som ZIP. Disse kunne ikke hentes: {names}'), { n: r.ok, names: r.failed.join(', ') }), false);
      else tell(fill(T('{n} filer er lastet ned som ZIP.'), { n: r.ok }));
    } catch (e) { tell(T('ZIP-filen kunne ikke lages.') + ' ' + errText(e), false); } finally { setJob(null); }
  };
  const zipBase = () => (collab ? T('Samarbeidsmappe') + ' – ' + (curLink ? linkName(curLink) : '') : folderLabel + ' – ' + churchName(churchId)) + ' – ' + today();
  /* Sletting: bare filene brukeren har lov til å slette; alltid bekreftelse først. */
  const askDelete = items => {
    const ok = items.filter(canDel), skip = items.length - ok.length;
    if (!ok.length) return tell(T('Du har ikke tilgang til å slette de valgte filene.'), false);
    setAsk({ items: ok, skip });
  };
  const doDelete = async () => {
    const { items } = ask, gone = new Set(), bad = [];
    for (const [i, x] of items.entries()) {
      setJob(fill(T('Sletter {i} av {n} …'), { i: i + 1, n: items.length }));
      try { await FS.remove(x.id); gone.add(x.id); } catch (e) { bad.push(x.file_name + ': ' + errText(e)); }
    }
    const n = gone.size;
    setJob(null); setAsk(null); setPv(null);
    setSel(s => new Set([...s].filter(id => !gone.has(id))));
    setFl(f => ({ ...f, list: f.list.filter(y => !gone.has(y.id)) }));
    if (bad.length) tell((n ? fill(T('{n} filer er slettet.'), { n }) + ' ' : '') + T('Kunne ikke slette') + ': ' + bad.join(' · '), false);
    else tell(n === 1 ? fill(T('«{name}» er slettet.'), { name: items[0].file_name }) : fill(T('{n} filer er slettet.'), { n }));
    clearCache(); await load(undefined, undefined, { usage: true }).catch(() => {});
  };
  const doCopy = act(async e => {
    e.preventDefault();
    const { file, link } = fl.copy, l = fl.links.find(x => x.id === link);
    await FS.copyToLink(file.id, link);
    clearCache(); setFl(f => ({ ...f, copy: null }));
    tell(fill(T('En kopi er lagt i Samarbeidsmappen i gruppen «{name}».'), { name: linkName(l) }));
    await load(undefined, undefined, { usage: true });
  });

  const u = fl.usage, pct = u && u.quota_bytes ? Math.min(100, Math.round(100 * u.used_bytes / u.quota_bytes)) : 0;
  /* Trinn 20: ledig plass er det minste av menighetens ledige kvote og ledig samlet plass i ConnectHub. */
  const quotaFree = u ? Math.max(0, u.quota_bytes - u.used_bytes) : 0, sysFree = u && u.system_free_bytes != null ? u.system_free_bytes : Infinity;
  const free = Math.min(quotaFree, sysFree), bySystem = sysFree < quotaFree;
  const areas = Object.entries(AREAS).filter(([k]) => k !== 'samarbeid' || fl.links.length);
  const pick = k => { if (routed) go('filer', AREAS[k].key); else if (fl.area !== k) act(() => openArea(k))(); };
  const busy = !!job;

  const tile = x => {
    const on = sel.has(x.id);
    return <div key={x.id} className={'ch-thumb ch-file' + (on ? ' sel' : '')} data-ch-file={x.file_name}>
      <label className="ch-file-check" title={T('Velg')}><input type="checkbox" checked={on} onChange={() => toggle(x.id)} aria-label={fill(T('Velg «{name}»'), { name: x.file_name })} /></label>
      <button type="button" className="ch-file-open" onClick={() => setPv(x.id)} aria-label={fill(T('Forhåndsvis «{name}»'), { name: x.file_name })}><Thumb id={x.id} /></button>
      <span className="ch-file-name">{x.file_name} {x.visibility === 'private' && <Badge>{T('Privat')}</Badge>}</span>
      <span className="ch-muted">{info(x)}</span>
      <div className="ch-row">
        <Btn small onClick={() => downloadOne(x)} disabled={busy}>{T('Last ned')}</Btn>
        {canCopy(x) && <Btn small onClick={() => setFl(f => ({ ...f, copy: { file: x, link: f.link || (f.links[0] || {}).id } }))}>{T('Del i Samarbeidsmappe')}</Btn>}
        {canDel(x) && <Btn small kind="danger" onClick={() => askDelete([x])} disabled={busy}>{T('Slett')}</Btn>}
      </div>
    </div>;
  };
  const empty = () => collab ? T('Samarbeidsmappen er tom.') + ' ' + T('Last opp bilder, eller del en kopi fra Fellesmappe.')
    : fl.area === 'delt' ? T('Fellesmappen er tom.') + ' ' + T('Last opp de første bildene med «Last opp», eller dra dem hit.')
    : T(canUpload ? 'Ingen filer i denne mappen ennå. Last opp med «Last opp».' : 'Ingen filer i denne mappen ennå.');

  return <div className={'ch-area ch-area-' + A.key} data-ch-area={A.key}>
    <nav className="ch-tabs ch-folder-tabs" aria-label={T('Mapper')}>{areas.map(([k, v]) => <a key={k} href={routed ? '#/filer/' + v.key : '#'} className={'tab-' + v.key + (fl.area === k ? ' on' : '')} aria-current={fl.area === k ? 'page' : undefined}
      onClick={e => { e.preventDefault(); pick(k); }}><FolderIcon kind={k} size={16} /> {T(v.label)}</a>)}</nav>
    {noGroup ? <Card><Empty><span data-ch-nogroup>{T('Menigheten er ikke med i noen aktiv samarbeidsgruppe nå. Samarbeidsmappen vises når menigheten blir med i en gruppe, og forsvinner når gruppen avsluttes eller menigheten fjernes.')}</span></Empty></Card> : <>
    <section className="ch-card ch-folder-card">
      <div className="ch-folder-head"><span className="ch-folder-icon"><FolderIcon kind={fl.area} size={26} /></span>
        <div><h2>{T(A.label)}{fl.area === 'faste' && <small>{T(admin_ ? 'Du kan vedlikeholde' : 'Bare visning og nedlasting')}</small>}</h2>
          <p className="ch-muted">{collab && curLink ? <span data-ch-link>{T('Samarbeidsgruppe')} <b>{linkName(curLink)}</b>{curLink.description ? ' – ' + curLink.description : ''}. {T('Menigheter i gruppen')}: <b>{churchName(churchId)}</b>, {othersText(curLink)}.</span> : T(A.info)}</p></div></div>
      {collab && <p className="ch-muted">{T(A.info)} {T('Filene teller i kvoten til menigheten som bidro.')}</p>}
      {A.folders.length > 1 && <div className="ch-row">{A.folders.map(([f, l]) => <Btn key={f} small kind={fl.folder === f ? 'primary' : ''} onClick={() => { if (fl.folder !== f) { setSel(new Set()); act(() => load(f))(); } }}>{T(l)}</Btn>)}</div>}
      {collab && fl.links.length > 1 && <div className="ch-row" data-ch-groups>{fl.links.map(l => <Btn key={l.id} small kind={fl.link === l.id ? 'primary' : ''} onClick={() => { if (fl.link !== l.id) { setSel(new Set()); act(() => load('samarbeid', 'samarbeid', { link: l.id }))(); } }}>{linkName(l)}</Btn>)}</div>}
      {u && <><div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
        <p className="ch-muted" data-ch-meter>{T('Brukt')}: {mb(u.used_bytes)} {T('av')} {mb(u.quota_bytes)} ({T(u.quota_bytes === DEFAULT_QUOTA_MB * 1048576 ? 'standard' : 'egen kvote')}) · {T('Ledig')}: {mb(free)}{bySystem ? ' (' + T('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}{fl.area === 'delt' && u.my_private_bytes > 0 ? ' · ' + T('Dine private') + ': ' + mb(u.my_private_bytes) + ' / ' + mb(u.my_private_quota_bytes) : ''}</p></>}
      {u && sysFree === 0 && <p className="ch-note warn" data-ch-full>{T('Den samlede lagringsplassen i ConnectHub er full. Nye opplastinger er stoppet til det er frigjort plass. Nedlasting virker som før.')}</p>}
      {canUpload ? <div className={'ch-drop' + (fl.over ? ' over' : '')} data-ch-drop onDragOver={e => { e.preventDefault(); if (!fl.over) setFl(f => ({ ...f, over: true })); }} onDragLeave={() => setFl(f => ({ ...f, over: false }))}
        onDrop={e => { e.preventDefault(); setFl(f => ({ ...f, over: false })); if (!busy) upload([...e.dataTransfer.files]); }}>
        <div className="ch-row" style={{ justifyContent: 'center' }}>
          <label className={'ch-btn primary' + (busy ? ' busy' : '')} data-ch-upload>{T('Last opp')}<input type="file" multiple disabled={busy} accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { const l = [...e.target.files]; e.target.value = ''; upload(l); }} /></label>
        </div>
        <p className="ch-muted" style={{ marginTop: 8 }}>{T('…eller dra bildene hit')} → {folderLabel}. {T('Bare bilder (PNG, JPG, WebP eller GIF), høyst 4 MB. Video kan aldri lastes opp.')}</p>
      </div> : fl.area === 'faste' && <p className="ch-note warn">{T('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')}</p>}
    </section>

    <div className="ch-folder-bar" data-ch-folder-bar>
      <label className="ch-row ch-muted"><input type="checkbox" checked={allOn} disabled={!shown.length} onChange={() => setSel(allOn ? new Set() : new Set(shown.map(x => x.id)))} /> {T('Velg alle')}</label>
      {selected.length > 0 && <span data-ch-selected><b>{selected.length}</b> {T('valgt')}</span>}
      <span className="ch-spacer" />
      {selected.length > 0 && <>
        <Btn small kind="primary" onClick={() => downloadMany(selected, zipBase())} disabled={busy}>{T('Last ned')}{selected.length > 1 ? ' (ZIP)' : ''}</Btn>
        {selected.some(canDel) && <Btn small kind="danger" onClick={() => askDelete(selected)} disabled={busy}>{T('Slett')}</Btn>}
        <Btn small onClick={() => setSel(new Set())}>{T('Fjern valg')}</Btn>
      </>}
      {shown.length > 0 && <Btn small onClick={() => downloadMany(shown, zipBase())} disabled={busy} title={T('Last ned alle filene i mappen som én ZIP-fil')}>{T('Eksporter')}</Btn>}
      {(job || msg) && <p className={'ch-folder-msg' + (job ? '' : msg.ok ? ' ok' : ' bad')} role={job || msg.ok ? 'status' : 'alert'} data-ch-folder-msg>{job || msg.text}</p>}
    </div>

    {sections.map(([k, list, title]) => <Card key={k} title={title} sub={fl.loading ? null : list.length}>
      {list.length ? <div className="ch-thumbs">{list.map(tile)}</div>
        : <Empty><span data-ch-empty>{fl.loading ? T('Laster …') : collab ? (k === 'oss' ? (shown.length ? T('Menigheten din har ikke lagt inn noe her ennå.') : empty()) : T('Ingen bilder herfra ennå.')) : empty()}</span></Empty>}
    </Card>)}
    </>}

    {pv && <Preview list={shown} id={pv} onId={setPv} onClose={() => setPv(null)} info={info} canDel={canDel} onDownload={downloadOne} onDelete={askDelete} />}
    {ask && <Dialog title={T(ask.items.length === 1 ? 'Slette filen?' : 'Slette filene?')} onClose={() => { if (!busy) setAsk(null); }}>
      <div data-ch-confirm-delete style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p>{ask.items.length === 1 ? fill(T('«{name}» slettes for godt.'), { name: ask.items[0].file_name }) : fill(T('{n} filer slettes for godt.'), { n: ask.items.length })} {T('Dette kan ikke angres.')}</p>
        {collab && <p className="ch-muted">{T('Filene forsvinner for alle menighetene i gruppen. Originaler i Fellesmappe eller Faste blir liggende.')}</p>}
        {ask.skip > 0 && <p className="ch-note warn">{fill(T('{n} av de valgte filene kan du ikke slette – de blir liggende.'), { n: ask.skip })}</p>}
        <div className="ch-row"><Btn kind="danger" onClick={doDelete} disabled={busy}>{T('Slett')}</Btn><Btn onClick={() => setAsk(null)} disabled={busy}>{T('Avbryt')}</Btn></div>
      </div>
    </Dialog>}
    {fl.copy && <Dialog title={T('Del i Samarbeidsmappe')} onClose={() => setFl(f => ({ ...f, copy: null }))}>
      <form onSubmit={doCopy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ch-copy>
        {fl.links.length > 1 && <Field label="Samarbeidsgruppe"><select className="ch-select" value={fl.copy.link} onChange={e => { const v = e.target.value; setFl(f => ({ ...f, copy: { ...f.copy, link: v } })); }}>{fl.links.map(l => <option key={l.id} value={l.id}>{linkName(l)}</option>)}</select></Field>}
        <p>{T('En kopi av bildet')} «{fl.copy.file.file_name}» {T('legges i Samarbeidsmappen i gruppen')} <b>{linkName(fl.links.find(l => l.id === fl.copy.link))}</b> ({churchName(churchId)}, {othersText(fl.links.find(l => l.id === fl.copy.link))}). {T('Alle menighetene i gruppen kan se og laste den ned. Originalen blir liggende i')} «{T(FOLDER_NAME[fl.copy.file.folder] || 'Fellesmappe')}».</p>
        <div className="ch-row"><Btn kind="primary" onClick={e => e.currentTarget.form.requestSubmit()}>{T('Del kopi')}</Btn><Btn onClick={() => setFl(f => ({ ...f, copy: null }))}>{T('Avbryt')}</Btn></div>
      </form>
    </Dialog>}
  </div>;
}
