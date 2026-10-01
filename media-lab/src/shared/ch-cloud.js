/* ConnectHub-erstatning for den gamle skyklienten (ml-cloud.js / api/ml.js / Vercel Blob). Samme grensesnitt som appene
   allerede bruker – window.MLCloud.files(mappe) → { files: [{ url, name }], hidden: Set } – men filene kommer nå fra
   ConnectHub: fellesfiler i brukerens menigheter + egne private filer i mappen, hentet som lokale blob:-adresser.
   Feillogging til den gamle tjenesten er fjernet (den var aldri i bruk). */
import { files as F } from '../services/files.js';

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
  const off = () => Promise.reject(Object.assign(new Error('offline'), { offline: true }));
  window.MLCloud = { api: off, status: () => Promise.resolve(null), files, report: () => {}, get me() { return window.CH && window.CH.me || null; } };
})();
