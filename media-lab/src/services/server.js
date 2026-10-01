/* Kall til ConnectHub-API-et (serverfunksjonene). Innlogging sendes som Bearer-token, aldri som cookie. */
import { auth } from './auth.js';
import { ServiceError } from './errors.js';

let fetchImpl = (...a) => fetch(...a);
export function useServerFetch(f) { fetchImpl = f; }

export async function callServer(action, body, { raw, contentType, query } = {}) {
  const s = await auth.session();
  if (!s || !s.accessToken) throw new ServiceError('unauthorized');
  let r;
  try {
    r = await fetchImpl('/api/ch?a=' + encodeURIComponent(action) + (query ? '&' + new URLSearchParams(query) : ''), {
      method: 'POST', headers: { 'content-type': contentType || 'application/json', authorization: 'Bearer ' + s.accessToken },
      body: raw !== undefined ? raw : JSON.stringify(body || {}),
    });
  } catch (e) { throw new ServiceError('network'); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j || j.ok === false) throw new ServiceError((j && j.error) || 'http_' + r.status);
  return j;
}
