/* Verifisering av innloggingstokener (JWT) med offentlige nøkler (JWKS) via Web Crypto – virker i Edge, Node ≥ 20 og
   andre Web-standard kjøremiljøer. Ingen hemmeligheter trengs. Støtter ES256 og RS256 (asymmetriske nøkler). */

const dec = new TextDecoder();
export function b64uBytes(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/'), pad = t.length % 4 ? '='.repeat(4 - (t.length % 4)) : '';
  const bin = atob(t + pad), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const json = s => JSON.parse(dec.decode(b64uBytes(s)));

const ALGS = {
  ES256: { imp: { name: 'ECDSA', namedCurve: 'P-256' }, ver: { name: 'ECDSA', hash: 'SHA-256' }, kty: 'EC' },
  RS256: { imp: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, ver: { name: 'RSASSA-PKCS1-v1_5' }, kty: 'RSA' },
};

/* Returnerer innholdet (payload) hvis tokenet er gyldig, ellers null. Kaster aldri for ugyldige tokener. */
export async function verifyJwt(token, { jwks, issuer, audience = 'authenticated', now = Math.floor(Date.now() / 1000), leeway = 30 }) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
    const head = json(parts[0]), body = json(parts[1]), alg = ALGS[head.alg];
    if (!alg || !head.kid) return null;
    const jwk = ((jwks && jwks.keys) || []).find(k => k.kid === head.kid && k.kty === alg.kty && (!k.alg || k.alg === head.alg));
    if (!jwk) return null;
    const { kid, alg: _a, use, key_ops, ext, ...pub } = jwk;
    const key = await crypto.subtle.importKey('jwk', { ...pub, ext: true }, alg.imp, false, ['verify']);
    const ok = await crypto.subtle.verify(alg.ver, key, b64uBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!ok) return null;
    if (typeof body.exp !== 'number' || body.exp + leeway < now) return null;
    if (typeof body.nbf === 'number' && body.nbf - leeway > now) return null;
    if (issuer && body.iss !== issuer) return null;
    const aud = Array.isArray(body.aud) ? body.aud : [body.aud];
    if (audience && !aud.includes(audience)) return null;
    if (body.role && body.role !== 'authenticated') return null;
    return body;
  } catch (e) { return null; }
}

/* Henter og hurtigbufrer JWKS (10 min). Ved ukjent nøkkel-ID hentes listen på nytt én gang (nøkkelrotasjon). */
const cache = new Map();
export async function getJwks(issuer, fetchFn = fetch, { force = false, now = Date.now() } = {}) {
  const hit = cache.get(issuer);
  if (hit && !force && now - hit.at < 600000) return hit.jwks;
  const r = await fetchFn(issuer + '/.well-known/jwks.json', { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('JWKS ' + r.status);
  const jwks = await r.json();
  cache.set(issuer, { jwks, at: now });
  return jwks;
}
export function kidOf(token) { try { return json(String(token).split('.')[0]).kid || null; } catch (e) { return null; } }
