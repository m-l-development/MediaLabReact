/* Trinn 20: når den samlede lagringsplassen i ConnectHub er brukt opp (SQLSTATE 53100 fra databasen), gir serveren
   egen kode storage_full (507) – adskilt fra menighetens kvote og hastighetsgrenser. Ingenting blir liggende i lagringen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';
import { dbError } from '../lib/http.js';

const full = () => Object.assign(new Error('backend 400'), { code: '53100' });

test('dbError: 53100 → 507 storage_full; andre koder er uendret', () => {
  assert.deepEqual(dbError({ code: '53100' }), { status: 507, error: 'storage_full' });
  assert.notEqual(dbError({ code: '54000' }).error, 'storage_full', 'menighetens kvote er ikke samlet plass');
  assert.deepEqual(dbError({ code: '42501' }), { status: 403, error: 'forbidden' });
  assert.deepEqual(dbError({ code: 'XX000' }), { status: 502, error: 'backend_error' });
});

/* --- handleren med falsk backend --- */
const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'full-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token() {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'full-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 's1', exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const CH = '22222222-2222-4222-8222-222222222222', FILE = '33333333-3333-4333-8333-333333333333', LINK = '44444444-4444-4444-8444-444444444444';
function fake(over = {}) {
  const log = [];
  return { log,
    async rpcAsUser(t, fn, a) { log.push(['user', fn, a]); if (over[fn]) return over[fn](a); return fn === 'can_transfer' ? { storage_key: 'c/' + CH + '/o.png', church_id: CH, sha256: null } : true; },
    async rpcAsServer(fn, a) { log.push(['server', fn, a]); if (over[fn]) return over[fn](a); return { id: 'f1' }; },
    async storagePut(k) { log.push(['put', k]); },
    async storageCopy(from, to) { log.push(['copy', from, to]); },
    async storageGet() { return PNG; },
    async storageDelete(keys) { log.push(['del', keys]); } };
}
const call = async (a, init, backend) => {
  const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', ...init, headers: { authorization: 'Bearer ' + await token(), ...init.headers } }), ENV, { fetchFn, backend });
  return { status: r.status, body: await r.json() };
};
const up = backend => call('file.upload&' + new URLSearchParams({ church: CH, folder: 'bilder' }), { headers: { 'content-type': 'application/octet-stream' }, body: PNG }, backend);
const copy = backend => call('file.copy_to_link', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file_id: FILE, link_id: LINK }) }, backend);

test('file.upload: full samlet plass ved forhåndskontroll → 507 storage_full, ingenting lagres', async () => {
  const b = fake({ can_upload: () => { throw full(); } });
  const r = await up(b);
  assert.equal(r.status, 507); assert.deepEqual(r.body, { ok: false, error: 'storage_full' });
  assert.ok(!b.log.some(x => x[0] === 'put'));
});

test('file.upload: full samlet plass ved registrering (samtidig opplasting) → storage_full, og filen fjernes igjen', async () => {
  const b = fake({ register_file: () => { throw full(); } });
  const r = await up(b);
  assert.equal(r.status, 507); assert.equal(r.body.error, 'storage_full');
  const put = b.log.find(x => x[0] === 'put'), del = b.log.find(x => x[0] === 'del');
  assert.deepEqual(del[1], [put[1]]);
});

test('file.copy_to_link: full samlet plass → storage_full; ingen kopi, eller kopien fjernes igjen', async () => {
  const pre = fake({ can_transfer: () => { throw full(); } });
  const r1 = await copy(pre);
  assert.equal(r1.status, 507); assert.equal(r1.body.error, 'storage_full'); assert.ok(!pre.log.some(x => x[0] === 'copy'));
  const reg = fake({ register_link_copy: () => { throw full(); } });
  const r2 = await copy(reg);
  assert.equal(r2.status, 507);
  const cp = reg.log.find(x => x[0] === 'copy'), del = reg.log.find(x => x[0] === 'del');
  assert.deepEqual(del[1], [cp[2]]);
});
