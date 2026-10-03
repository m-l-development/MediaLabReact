import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyJwt } from './jwt.js';
import { decide, isPublicPath, readCookie } from './gate.js';
import { issuerOf } from './backend.js';

const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const NOW = 1_800_000_000;
const ISS = issuerOf('preview');

async function keys(kid = 'k1') {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
  return { priv: kp.privateKey, jwk: { ...pub, kid, alg: 'ES256', use: 'sig' } };
}
async function sign(priv, kid, payload, header = {}) {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid, ...header }), p = enc(payload);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(sig).toString('base64url');
}
const good = (o = {}) => ({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 'u1', exp: NOW + 3600, ...o });

test('verifyJwt: gyldig ES256-token godtas', async () => {
  const k = await keys(), t = await sign(k.priv, 'k1', good());
  assert.equal((await verifyJwt(t, { jwks: { keys: [k.jwk] }, issuer: ISS, now: NOW })).sub, 'u1');
});

test('verifyJwt: avviser utløpt, feil utsteder, feil publikum, service_role, ukjent nøkkel og endret innhold', async () => {
  const k = await keys(), J = { keys: [k.jwk] }, o = { jwks: J, issuer: ISS, now: NOW };
  assert.equal(await verifyJwt(await sign(k.priv, 'k1', good({ exp: NOW - 120 })), o), null);
  assert.equal(await verifyJwt(await sign(k.priv, 'k1', good({ iss: issuerOf('production') })), o), null);
  assert.equal(await verifyJwt(await sign(k.priv, 'k1', good({ aud: 'annet' })), o), null);
  assert.equal(await verifyJwt(await sign(k.priv, 'k1', good({ role: 'service_role' })), o), null);
  assert.equal(await verifyJwt(await sign(k.priv, 'ukjent', good()), o), null);
  const t = await sign(k.priv, 'k1', good()), parts = t.split('.');
  assert.equal(await verifyJwt(parts[0] + '.' + enc(good({ sub: 'angriper' })) + '.' + parts[2], o), null);
});

test('verifyJwt: avviser alg none og HS256 (nøkkelforveksling)', async () => {
  const k = await keys(), o = { jwks: { keys: [k.jwk] }, issuer: ISS, now: NOW };
  assert.equal(await verifyJwt(enc({ alg: 'none', kid: 'k1' }) + '.' + enc(good()) + '.', o), null);
  assert.equal(await verifyJwt(enc({ alg: 'HS256', kid: 'k1' }) + '.' + enc(good()) + '.' + 'abc', o), null);
});

test('verifyJwt: token signert med annen nøkkel avvises', async () => {
  const a = await keys('k1'), b = await keys('k1');
  assert.equal(await verifyJwt(await sign(b.priv, 'k1', good()), { jwks: { keys: [a.jwk] }, issuer: ISS, now: NOW }), null);
});

test('isPublicPath: bare innlogging og statiske filer er åpne', () => {
  for (const p of ['/login.dc.html', '/login', '/assets/x.js', '/images/a.png', '/version.json', '/api/ch', '/manifest.webmanifest', '/favicon.ico']) assert.equal(isPublicPath(p), true, p);
  for (const p of ['/', '/media-lab.dc.html', '/photo-design.dc.html', '/admin.dc.html', '/login.dc.html.evil', '/x/login.dc.html', '/assetsx/a.js', '/home', '/admin', '/fellesmappe', '/loopeditor', '/loginx', '/login/x']) assert.equal(isPublicPath(p), false, p);
});

test('readCookie finner riktig cookie', () => {
  assert.equal(readCookie('a=1; ch_at=tok; b=2', 'ch_at'), 'tok');
  assert.equal(readCookie('xch_at=nei', 'ch_at'), null);
  assert.equal(readCookie('', 'ch_at'), null);
});

test('decide: uten cookie → innlogging med next, gyldig → slipp gjennom', async () => {
  const k = await keys(), fetchFn = async () => ({ ok: true, json: async () => ({ keys: [k.jwk] }) });
  const env = { VERCEL_ENV: 'preview' };
  const r1 = await decide({ url: 'https://x.test/photo-design.dc.html?a=1', cookieHeader: '', env, fetchFn, now: NOW });
  assert.deepEqual(r1, { action: 'redirect', location: '/login?next=' + encodeURIComponent('/photo-design.dc.html?a=1') });
  const t = await sign(k.priv, 'k1', good());
  assert.deepEqual(await decide({ url: 'https://x.test/photo-design.dc.html', cookieHeader: 'ch_at=' + t, env, fetchFn, now: NOW }), { action: 'next' });
  assert.deepEqual(await decide({ url: 'https://x.test/login.dc.html', cookieHeader: '', env, fetchFn, now: NOW }), { action: 'next' });
});

test('decide: Preview godtar ikke produksjonstokener', async () => {
  const k = await keys(), fetchFn = async () => ({ ok: true, json: async () => ({ keys: [k.jwk] }) });
  const t = await sign(k.priv, 'k1', good({ iss: issuerOf('production') }));
  assert.equal((await decide({ url: 'https://x.test/', cookieHeader: 'ch_at=' + t, env: { VERCEL_ENV: 'preview' }, fetchFn, now: NOW })).action, 'redirect');
});

test('decide: JWKS utilgjengelig → avvis (lukket ved feil)', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 });
  const r = await decide({ url: 'https://x.test/media-lab.dc.html', cookieHeader: 'ch_at=a.b.c', env: { VERCEL_ENV: 'production' }, fetchFn, now: NOW });
  assert.equal(r.action, 'unavailable');
});
