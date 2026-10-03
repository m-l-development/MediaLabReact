/* Sperren foran sidene: bare innloggingssiden og ufarlige statiske filer leveres uten gyldig innlogging.
   Leverandørnøytral logikk; middleware.js (Vercel) er bare en tynn inngang. Tilsvarende kan kobles inn i
   Netlify Edge, Cloudflare Workers eller en egen Node-server. Feiler verifiseringen av tekniske grunner, avvises
   forespørselen (lukket ved feil). */
import { verifyJwt, getJwks, kidOf } from './jwt.js';
import { targetOf, issuerOf } from './backend.js';

export const COOKIE = 'ch_at';
export const LOGIN = '/login';   // kort adresse (build/routes.js); /login.dc.html sendes hit
const PUBLIC = /^\/(assets\/|images\/|mockups\/|api\/|vendor\/|fonts\/|login\.dc\.html$|login$|version\.json$|manifest\.webmanifest$|favicon\.ico$|robots\.txt$)/;

export const isPublicPath = p => PUBLIC.test(p);

export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/* Verifiserer et tilgangstoken for miljøet. Returnerer { claims } | { invalid: true } | { unavailable: true }. */
export async function verifyToken(token, { env, fetchFn = fetch, now } = {}) {
  if (!token) return { invalid: true };
  const issuer = issuerOf(targetOf(env));
  let jwks;
  try { jwks = await getJwks(issuer, fetchFn); } catch (e) { return { unavailable: true }; }
  if (kidOf(token) && !(jwks.keys || []).some(k => k.kid === kidOf(token))) {
    try { jwks = await getJwks(issuer, fetchFn, { force: true }); } catch (e) { return { unavailable: true }; }
  }
  const claims = await verifyJwt(token, { jwks, issuer, now });
  return claims ? { claims } : { invalid: true };
}

/* Returnerer { action: 'next' } | { action: 'redirect', location } | { action: 'unavailable' } */
export async function decide({ url, cookieHeader, env, fetchFn = fetch, now }) {
  const u = new URL(url);
  if (isPublicPath(u.pathname)) return { action: 'next' };
  const login = () => ({ action: 'redirect', location: LOGIN + '?next=' + encodeURIComponent(u.pathname + u.search) });
  const token = readCookie(cookieHeader, COOKIE);
  if (!token) return login();
  const v = await verifyToken(token, { env, fetchFn, now });
  if (v.unavailable) return { action: 'unavailable' };
  return v.claims ? { action: 'next' } : login();
}
