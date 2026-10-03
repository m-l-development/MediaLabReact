/* Feilmelding når lagringskvoten er brukt opp: egen kode (quota_exceeded), mens hastighetsgrenser fortsatt gir rate_limited.
   Begge kommer fra databasen med SQLSTATE 54000; meldingsteksten skiller dem (se dbError i server/lib/http.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';
import { dbError, QUOTA_MESSAGE } from '../lib/http.js';
import { supabaseServer } from '../adapters/supabase.js';

const err = (code, message) => Object.assign(new Error('backend 400'), { code, dbMessage: message });
const QUOTA_CHURCH = 'Menighetens lagringskvote er brukt opp', QUOTA_PRIVATE = 'Din private kvote (50 MB) er brukt opp';

test('dbError: kvoten er brukt opp → 413 quota_exceeded (menighetens og den private kvoten)', () => {
  assert.deepEqual(dbError(err('54000', QUOTA_CHURCH)), { status: 413, error: 'quota_exceeded' });
  assert.deepEqual(dbError(err('54000', QUOTA_PRIVATE)), { status: 413, error: 'quota_exceeded' });
});

test('dbError: hastighetsgrenser og andre feil gir samme svar som før', () => {
  assert.deepEqual(dbError(err('54000', 'For mange invitasjoner siste døgn')), { status: 429, error: 'rate_limited' });
  assert.deepEqual(dbError(err('54000', 'For mange meldinger siste døgn')), { status: 429, error: 'rate_limited' });
  assert.deepEqual(dbError(err('54000')), { status: 429, error: 'rate_limited' }, 'uten melding: som før');
  assert.deepEqual(dbError({ code: '54000' }), { status: 429, error: 'rate_limited' });
  assert.deepEqual(dbError(err('42501', QUOTA_CHURCH)), { status: 403, error: 'forbidden' }, 'bare 54000 kan bli kvotefeil');
  assert.deepEqual(dbError(err('23505')), { status: 409, error: 'conflict' });
  for (const c of ['22023', '23514', '22P02']) assert.deepEqual(dbError(err(c)), { status: 400, error: 'invalid' });
  assert.deepEqual(dbError(err('XX000')), { status: 502, error: 'backend_error' });
  assert.deepEqual(dbError(null), { status: 502, error: 'backend_error' });
});

test('alle 54000-feil i migreringene klassifiseres riktig: kvote → quota_exceeded, resten → rate_limited', () => {
  const dir = new URL('../../../supabase/migrations/', import.meta.url);
  const raised = fs.readdirSync(dir).filter(f => f.endsWith('.sql'))
    .flatMap(f => [...fs.readFileSync(new URL(f, dir), 'utf8').matchAll(/raise exception '([^']*)'[^;]*?errcode\s*=\s*'54000'/gi)].map(m => m[1]));
  const quota = raised.filter(m => /kvote/i.test(m)), other = raised.filter(m => !/kvote/i.test(m));
  assert.ok(quota.length >= 2 && other.length >= 2, 'fant både kvote- og hastighetsfeil');
  for (const m of quota) assert.equal(dbError(err('54000', m)).error, 'quota_exceeded', m);
  for (const m of other) assert.equal(dbError(err('54000', m)).error, 'rate_limited', m);
  assert.ok(!QUOTA_MESSAGE.test('For mange forsøk'));
});

test('serveradapteren tar med databasens melding (bare på serveren) slik at dbError kan skille feilene', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ code: '54000', details: null, hint: null, message: QUOTA_CHURCH }), { status: 400 });
  const sb = supabaseServer({ url: 'https://db.test', publishableKey: 'p', secretKey: 's' }, fetchFn);
  const e = await sb.rpcAsUser('t', 'can_upload', {}).then(() => null, x => x);
  assert.equal(e.code, '54000'); assert.equal(e.dbMessage, QUOTA_CHURCH);
  assert.deepEqual(dbError(e), { status: 413, error: 'quota_exceeded' });
  const text = await (supabaseServer({ url: 'https://db.test', publishableKey: 'p', secretKey: 's' }, async () => new Response('feil', { status: 500 }))).rpcAsUser('t', 'x', {}).then(() => null, x => x);
  assert.equal(text.dbMessage, undefined, 'tekstsvar gir ingen melding');
});

/* --- opplasting gjennom handleren med falsk backend --- */
const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'quota-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token() {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'quota-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 's1', exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const CH = '22222222-2222-4222-8222-222222222222';
function fake(over = {}) {
  const log = [];
  return { log,
    async rpcAsUser(t, fn, a) { log.push(['user', fn, a]); if (over[fn]) return over[fn](a); return fn === 'file_keys' ? a.p_ids.map(id => ({ id, storage_key: 'k/' + id, mime_type: 'image/png' })) : true; },
    async rpcAsServer(fn, a) { log.push(['server', fn, a]); if (over[fn]) return over[fn](a); return { id: 'f1', file_name: a.p_name }; },
    async storagePut(k, b, m) { log.push(['put', k, b.length, m]); },
    async storageDelete(keys) { log.push(['del', keys]); },
    async storageSign(keys) { log.push(['sign', keys]); return Object.fromEntries(keys.map(k => [k, 'https://signert/' + k])); } };
}
const call = async (a, init, backend) => {
  const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', ...init, headers: { authorization: 'Bearer ' + await token(), ...init.headers } }), ENV, { fetchFn, backend });
  return { status: r.status, body: await r.json() };
};
const up = (backend, q = {}) => call('file.upload&' + new URLSearchParams({ church: CH, folder: 'bilder', ...q }), { headers: { 'content-type': 'application/octet-stream' }, body: PNG }, backend);

test('file.upload: brukt kvote gir quota_exceeded, og ingenting lagres', async () => {
  const b = fake({ can_upload: () => { throw err('54000', QUOTA_CHURCH); } });
  const r = await up(b);
  assert.equal(r.status, 413); assert.deepEqual(r.body, { ok: false, error: 'quota_exceeded' });
  assert.ok(!b.log.some(x => x[0] === 'put'), 'ingen fil lagres');
  assert.ok(!JSON.stringify(r.body).includes('kvote'), 'databasens melding sendes ikke til nettleseren');
  /* Private opplastinger er stengt: avvises før kvotekontrollen. Meldingen for privat kvote kjennes fortsatt igjen. */
  const p = fake({ can_upload: () => { throw err('54000', QUOTA_PRIVATE); } });
  assert.equal((await up(p, { private: '1' })).body.error, 'private_not_allowed');
  assert.equal((await up(p)).body.error, 'quota_exceeded');
});

test('file.upload: kvoten brukt opp ved registrering → quota_exceeded, og den lagrede filen fjernes igjen', async () => {
  const b = fake({ register_file: () => { throw err('54000', QUOTA_CHURCH); } });
  const r = await up(b);
  assert.equal(r.status, 413); assert.equal(r.body.error, 'quota_exceeded');
  const put = b.log.find(x => x[0] === 'put'), del = b.log.find(x => x[0] === 'del');
  assert.deepEqual(del[1], [put[1]]);
});

test('file.upload: andre 54000-feil gir fortsatt rate_limited', async () => {
  const r = await up(fake({ can_upload: () => { throw err('54000', 'For mange forsøk'); } }));
  assert.equal(r.status, 429); assert.equal(r.body.error, 'rate_limited');
});

test('nedlasting (file.urls) påvirkes ikke av kvoten', async () => {
  const b = fake({ can_upload: () => { throw err('54000', QUOTA_CHURCH); } });
  const id = '33333333-3333-4333-8333-333333333333';
  const r = await call('file.urls', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [id] }) }, b);
  assert.equal(r.status, 200); assert.equal(r.body.urls[id], 'https://signert/k/' + id);
  assert.ok(!b.log.some(x => x[1] === 'can_upload'), 'kvoten sjekkes ikke ved nedlasting');
});

test('brukergrensesnittet: egen tekst for quota_exceeded med engelsk oversettelse; rate_limited er uendret', () => {
  const ui = fs.readFileSync(new URL('../../src/pages/connecthub-admin/ui.jsx', import.meta.url), 'utf8');
  const ERR = Function('return ' + ui.match(/const ERR = (\{[\s\S]*?\n\});/)[1])();
  assert.equal(ERR.quota_exceeded, 'Lagringskvoten er brukt opp.');
  assert.equal(ERR.rate_limited, 'For mange forsøk. Vent litt.');
  const line = fs.readFileSync(new URL('../../src/legacy/i18n.js', import.meta.url), 'utf8').split('\n').find(l => l.includes('var D = {'));
  const D = JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1));
  assert.equal(D['Lagringskvoten er brukt opp.'], 'The storage quota has been used up.');
  assert.equal(D['For mange forsøk. Vent litt.'], 'Too many attempts. Please wait.');
});
