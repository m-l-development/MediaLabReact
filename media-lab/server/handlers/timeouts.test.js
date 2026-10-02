import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from '../../src/services/timeout.js';
import { getJwks } from '../lib/jwt.js';
import { handle } from './ch.js';

test('gammel admin er fjernet: ingen admin.dc.html, api/ml.js, ml-cloud.js eller Vercel Blob', async () => {
  const fs = await import('node:fs');
  const root = new URL('../../', import.meta.url);
  for (const f of ['admin.dc.html', 'api/ml.js', 'src/legacy/ml-cloud.js', 'src/pages/admin']) assert.equal(fs.existsSync(new URL(f, root)), false, f + ' skal ikke finnes');
  const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal((pkg.dependencies || {})['@vercel/blob'], undefined, '@vercel/blob brukes ikke lenger');
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
