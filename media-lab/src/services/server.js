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
