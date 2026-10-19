/* Kall til ConnectHub-API-et (serverfunksjonene). Innlogging sendes som Bearer-token, aldri som cookie. */
import { auth } from './auth.js';
import { ServiceError } from './errors.js';
import { withTimeout } from './timeout.js';

let fetchImpl = (...a) => fetch(...a);
export function useServerFetch(f) { fetchImpl = f; }

export async function callServer(action, body, { raw, contentType, query } = {}) {
  const s = await withTimeout(auth.session(), 20000);
  if (!s || !s.accessToken) throw new ServiceError('unauthorized');
  let r; const ac = new AbortController(), tm = setTimeout(() => ac.abort(), raw !== undefined ? 90000 : 30000);   /* aldri uendelig venting */
  try {
    r = await fetchImpl('/api/ch?a=' + encodeURIComponent(action) + (query ? '&' + new URLSearchParams(query) : ''), {
      method: 'POST', headers: { 'content-type': contentType || 'application/json', authorization: 'Bearer ' + s.accessToken },
      body: raw !== undefined ? raw : JSON.stringify(body || {}), signal: ac.signal,
    });
  } catch (e) { throw new ServiceError(ac.signal.aborted ? 'timeout' : 'network'); }
  finally { clearTimeout(tm); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j || j.ok === false) throw new ServiceError((j && j.error) || 'http_' + r.status, j && j.detail);   /* detail: f.eks. hvilken servernøkkel som mangler */
  return j;
}

/* Store filer (høyst 30 MB, logoer 10 MB) går ikke gjennom serveren – Vercel tar imot høyst 4,5 MB per forespørsel.
   upload.start (kontroll og signert lenke) → opplasting direkte til lagringen → upload.finish (innholdskontroll og
   registrering, ellers slettes filen). Samme flyt som i web/src/infrastructure/api/server.ts. */
export async function directUpload(target, file, finish = {}) {
  const s = await callServer('upload.start', { ...target, name: file.name || 'bilde', mime: file.type, size: file.size });
  let r; const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 300000);
  try { r = await fetchImpl(s.url, { method: 'PUT', headers: { 'content-type': s.mime, 'x-upsert': 'false' }, body: file, signal: ac.signal }); }
  catch (e) { throw new ServiceError(ac.signal.aborted ? 'timeout' : 'network'); }
  finally { clearTimeout(tm); }
  if (!r.ok) throw new ServiceError(r.status === 413 ? 'too_large' : 'upload_failed');
  return callServer('upload.finish', { id: s.id, ...finish });
}
