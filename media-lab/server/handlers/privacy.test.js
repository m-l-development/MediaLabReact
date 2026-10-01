import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';

const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'privacy-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token(aal = 'aal2') {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'privacy-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 'sub-x', aal, exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
function fake(over = {}) {
  const log = [];
  return { log,
    async rpcAsUser(t, fn, a) { log.push(fn); if (over[fn]) return over[fn](a); if (fn === 'export_church') return { files: [{ id: 'f1' }, { id: 'f2' }] }; if (fn === 'file_keys') return [{ id: 'f1', storage_key: 'k1' }]; return ['k1', 'k2']; },
    async rpcAsServer(fn, a) { log.push('server:' + fn + ':' + (a.p_aal || '')); return { ok: true }; },
    async storageDelete(keys) { log.push('del:' + keys.join(',')); },
    async storageSign(keys) { return Object.fromEntries(keys.map(k => [k, 'https://signert/' + k])); },
    async deleteAuthUser(id) { log.push('auth:' + id); } };
}
const call = async (a, body, backend, aal) => { const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', headers: { authorization: 'Bearer ' + await token(aal), 'content-type': 'application/json' }, body: JSON.stringify(body) }), ENV, { fetchFn, backend }); return { status: r.status, body: await r.json() }; };

test('privacy.delete_me: krever bekreftelse, sjekker i databasen først, sletter filer, bruker og innloggingskonto i rekkefølge', async () => {
  const b = fake();
  assert.equal((await call('privacy.delete_me', {}, b)).body.error, 'confirm_required'); assert.equal(b.log.length, 0);
  const r = await call('privacy.delete_me', { confirm: 'SLETT' }, b);
  assert.equal(r.status, 200);
  assert.deepEqual(b.log, ['prepare_account_deletion', 'del:k1,k2', 'server:delete_account:', 'auth:sub-x']);
});

test('privacy.delete_me: avslag i databasen (f.eks. eneste Developer) stopper alt', async () => {
  const b = fake({ prepare_account_deletion: () => { throw Object.assign(new Error(), { code: '22023' }); } });
  assert.equal((await call('privacy.delete_me', { confirm: 'SLETT' }, b)).status, 400);
  assert.deepEqual(b.log, ['prepare_account_deletion']);
});

test('church.export: legger til signerte lenker bare for filer databasen gir nøkler til', async () => {
  const r = await call('church.export', { church_id: '22222222-2222-4222-8222-222222222222' }, fake());
  assert.deepEqual(r.body.export.files.map(f => f.download_url), ['https://signert/k1', null]);
});

test('church.purge: sender aal fra det verifiserte tokenet (ikke antatt MFA); avslag stopper før noe slettes', async () => {
  const b = fake(); await call('church.purge', { church_id: '22222222-2222-4222-8222-222222222222', confirm_name: 'X' }, b, 'aal1');
  assert.ok(b.log.includes('server:purge_church:aal1'));
  const nei = fake({ prepare_church_purge: () => { throw Object.assign(new Error(), { code: '42501' }); } });
  assert.equal((await call('church.purge', { church_id: '22222222-2222-4222-8222-222222222222' }, nei)).status, 403);
  assert.deepEqual(nei.log, ['prepare_church_purge']);
});
