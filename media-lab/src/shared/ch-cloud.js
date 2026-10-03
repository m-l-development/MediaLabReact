/* ConnectHub-erstatning for den gamle skyklienten (ml-cloud.js / api/ml.js / Vercel Blob). Samme grensesnitt som appene
   allerede bruker – window.MLCloud.files(mappe) → { files: [{ url, name }], hidden: Set } – men filene kommer nå fra
   ConnectHub: fellesfiler i brukerens menigheter + egne private filer i mappen, hentet som lokale blob:-adresser.
   Samarbeidsfiler (trinn 18) kommer aldri med i files(mappe); de hentes med collab() og vises i et eget område (A4).
   Referanser til ConnectHub-filer (felles grunnoppsett): «ch:<fil-id>». blob(ref)/url(ref) henter originalen på nytt
   (signert lenke fra serveren, bare filer brukeren har tilgang til) – det lagres aldri en kopi. pick() åpner velgeren
   «Fellesmappe» (src/shared/ch-picker.js). Feillogging til den gamle tjenesten er fjernet (den var aldri i bruk). */
import { files as F } from '../services/files.js';
import { links as L, linkName } from '../services/community.js';
import { pickFromFellesmappe } from './ch-picker.js';

export const REF = /^ch:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export const isRef = v => typeof v === 'string' && REF.test(v);

(function () {
  if (window.MLCloud) return;
  const cache = {};
  async function files(folder) {
    const empty = { files: [], hidden: new Set() };
    if (cache[folder]) return cache[folder];
    try {
      const list = (await F.list({ folder })).slice(0, 100);
      const urls = await F.objectUrls(list.map(f => f.id));
      return (cache[folder] = { files: list.filter(f => urls[f.id]).map(f => ({ url: urls[f.id], name: f.file_name, id: f.id, ref: 'ch:' + f.id, visibility: f.visibility })), hidden: new Set() });
    } catch (e) { return empty; }
  }
  /* Samarbeidsfiler: kopier i aktive samarbeidsgrupper for brukerens menighet, gruppert per gruppe med gruppenavnet som
     tittel. Databasen gir bare kopier fra menigheter som er aktive medlemmer. folders = bare kopier med originalmappe i
     lista (f.eks. ['mockups']); tom = alle. → [{ link, title: 'Påskeprosjekt', files: [{ url, name, id, folder }] }] */
  async function collab(folders) {
    const k = 'collab:' + (folders || []).join(',');
    if (cache[k]) return cache[k];
    try {
      const [links, list] = await Promise.all([L.mine(), F.listCollab()]);
      const pick = list.filter(f => !folders || !folders.length || folders.includes(f.source_folder)).slice(0, 100);
      const urls = pick.length ? await F.objectUrls(pick.map(f => f.id)) : {};
      return (cache[k] = links.filter(l => l.status === 'active').map(l => ({ link: l.id, title: linkName(l),
        files: pick.filter(f => f.link_id === l.id && urls[f.id]).map(f => ({ url: urls[f.id], name: f.file_name, id: f.id, folder: f.source_folder })) }))
        .filter(g => g.files.length));
    } catch (e) { return []; }
  }
  /* Originalen bak en referanse «ch:<id>» (null hvis brukeren ikke har tilgang eller filen er borte). Huskes i besøket. */
  const blobs = new Map();
  function blob(ref) {
    const m = REF.exec(String(ref || '')); if (!m) return Promise.resolve(null);
    if (!blobs.has(ref)) blobs.set(ref, (async () => {
      const urls = await F.urls([m[1]]); if (!urls[m[1]]) return null;
      const r = await fetch(urls[m[1]], { signal: AbortSignal.timeout(30000) }); return r.ok ? r.blob() : null;
    })().catch(() => { blobs.delete(ref); return null; }));
    return blobs.get(ref);
  }
  const objUrls = new Map();
  async function url(ref) {
    if (objUrls.has(ref)) return objUrls.get(ref);
    const b = await blob(ref); if (!b) return null;
    const u = URL.createObjectURL(b); objUrls.set(ref, u); return u;
  }
  const off = () => Promise.reject(Object.assign(new Error('offline'), { offline: true }));
  window.MLCloud = { api: off, status: () => Promise.resolve(null), files, collab, blob, url, isRef,
    pick: opts => pickFromFellesmappe(opts), forget: () => { for (const k of Object.keys(cache)) delete cache[k]; },
    report: () => {}, get me() { return window.CH && window.CH.me || null; } };
})();
