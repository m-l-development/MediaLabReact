/* ConnectHub-erstatning for den gamle skyklienten (ml-cloud.js / api/ml.js / Vercel Blob). Samme grensesnitt som appene
   allerede bruker – window.MLCloud.files(mappe) → { files: [{ url, name }], hidden: Set } – men filene kommer nå fra
   ConnectHub: fellesfiler i brukerens menigheter + egne private filer i mappen, hentet som lokale blob:-adresser.
   Samarbeidsfiler (trinn 18) kommer aldri med i files(mappe); de hentes med collab() og vises i et eget område (A4).
   Feillogging til den gamle tjenesten er fjernet (den var aldri i bruk). */
import { files as F } from '../services/files.js';
import { links as L, linkName } from '../services/community.js';

(function () {
  if (window.MLCloud) return;
  const cache = {};
  async function files(folder) {
    const empty = { files: [], hidden: new Set() };
    if (cache[folder]) return cache[folder];
    try {
      const list = (await F.list({ folder })).slice(0, 100);
      const urls = await F.objectUrls(list.map(f => f.id));
      return (cache[folder] = { files: list.filter(f => urls[f.id]).map(f => ({ url: urls[f.id], name: f.file_name, id: f.id })), hidden: new Set() });
    } catch (e) { return empty; }
  }
  /* Samarbeidsfiler: kopier i aktive koblinger for brukerens menigheter, gruppert per kobling og merket med begge
     menighetenes navn. folders = bare kopier med originalmappe i lista (f.eks. ['mockups']); tom = alle.
     → [{ link, title: 'Menighet A – Menighet B', files: [{ url, name, id, folder }] }] */
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
  const off = () => Promise.reject(Object.assign(new Error('offline'), { offline: true }));
  window.MLCloud = { api: off, status: () => Promise.resolve(null), files, collab, report: () => {}, get me() { return window.CH && window.CH.me || null; } };
})();
