import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from '../../src/services/timeout.js';
import { getJwks } from '../lib/jwt.js';
import { handle } from './ch.js';

test('gammel api/ml.js: Web-standard GET/POST (ingen standard-eksport som Vercel tolker som (req, res)) og svarer straks', async () => {
  const m = await import('../../api/ml.js');
  assert.equal(m.default, undefined, 'standard-eksport ville gitt hengende forespørsler på Vercel');
  assert.equal(typeof m.GET, 'function'); assert.equal(typeof m.POST, 'function');
  const t0 = Date.now();
  const r = await m.GET(new Request('https://x.example/api/ml?a=status'));
  assert.ok(r instanceof Response, 'returnerer et Response-objekt');
  assert.equal(r.status, 401, 'uten ConnectHub-innlogging: 401 med en gang');
  assert.ok(Date.now() - t0 < 2000);
});

test('withTimeout: gir ServiceError «timeout» i stedet for å vente for alltid', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 30), e => e.code === 'timeout');
  assert.equal(await withTimeout(Promise.resolve(7), 30), 7);
});

test('sperren: henting av nøkler (JWKS) sendes med tidsgrense', async () => {
  let opts = null;
  await getJwks('https://tidsgrense-test.invalid/auth/v1', async (u, o) => { opts = o; return new Response('{"keys":[]}', { status: 200 }); }, { force: true });
  assert.ok(opts && opts.signal instanceof AbortSignal);
});

test('API: tidsavbrudd mot databasen/lagringen gir 504 upstream_timeout, ikke 500 eller heng', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'timeout-test', alg: 'ES256' };
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = enc({ alg: 'ES256', kid: 'timeout-test' }), p = enc({ iss: 'https://uatpdmhnwwjgzlxaucsx.supabase.co/auth/v1', aud: 'authenticated', role: 'authenticated', sub: 's', exp: Math.floor(Date.now() / 1000) + 600 });
  const sig = Buffer.from(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  const env = { VERCEL_ENV: 'preview', connecthub_devSUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testtesttest', connecthub_devSUPABASE_SECRET_KEY: 'sb_secret_testtesttesttest' };
  const backend = { rpcAsUser: async () => { throw Object.assign(new Error('tid'), { name: 'TimeoutError' }); } };
  const r = await handle(new Request('https://x/api/ch?a=invite.create', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + h + '.' + p + '.' + sig }, body: JSON.stringify({ email: 'a@b.no', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }) }),
    env, { backend, fetchFn: async () => new Response(JSON.stringify({ keys: [jwk] })) });
  assert.equal(r.status, 504); assert.equal((await r.json()).error, 'upstream_timeout');
});
