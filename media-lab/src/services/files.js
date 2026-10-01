/* Delte filer (bare bilder): oversikt via databasen (RLS), opplasting/lenker/sletting via serveren.
   Video avvises her for god tilbakemelding, men kontrollen som gjelder, skjer på serveren (innholdet) og i databasen. */
import { data } from './port.js';
import { callServer } from './server.js';
import { ServiceError } from './errors.js';

export const FOLDERS = ['bilder', 'logoer', 'bakgrunner', 'mockups', 'faste'];
export const MAX_BYTES = 4 * 1024 * 1024;
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const COLS = 'id, church_id, file_name, mime_type, file_size, folder, visibility, uploaded_by, created_at';

export const files = {
  list: ({ churchId, folder } = {}) => data().select('files', { columns: COLS, eq: { ...(churchId ? { church_id: churchId } : {}), ...(folder ? { folder } : {}) }, order: 'created_at', desc: true, limit: 500 }),
  usage: churchId => data().rpc('storage_usage', { p_church: churchId }),
  async upload(file, { churchId, folder = 'bilder', priv = false }) {
    if (!file) throw new ServiceError('invalid');
    if (/^video\//i.test(file.type || '') || /\.(mp4|m4v|mov|webm|mkv|avi|wmv|mpe?g|3gp|flv|ogv|mts|m2ts)$/i.test(file.name || '')) throw new ServiceError('video_not_allowed');
    if (!OK_TYPES.includes(file.type)) throw new ServiceError('type_not_allowed');
    if (file.size > MAX_BYTES) throw new ServiceError('too_large');
    const r = await callServer('file.upload', null, { raw: file, contentType: 'application/octet-stream', query: { church: churchId, folder, private: priv ? '1' : '0', name: file.name || 'bilde' } });
    return r.file;
  },
  async urls(ids) { if (!ids.length) return {}; return (await callServer('file.urls', { ids })).urls || {}; },
  remove: id => callServer('file.delete', { id }),
  /* Henter bildene som lokale blob:-adresser (ingen «tainted» lerret ved eksport, og ingen utløpte lenker). */
  async objectUrls(ids) {
    const urls = await files.urls(ids.slice(0, 100)), out = {};
    await Promise.all(Object.entries(urls).map(async ([id, u]) => { try { const r = await fetch(u); if (r.ok) out[id] = URL.createObjectURL(await r.blob()); } catch (e) {} }));
    return out;
  },
};
