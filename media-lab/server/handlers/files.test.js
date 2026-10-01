import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUpload, sniffImage, looksLikeVideo, cleanName } from '../lib/sniff.js';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';

const B = a => new Uint8Array(a);
const str = s => [...s].map(c => c.charCodeAt(0));
const PNG = B([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = B([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = B([...str('RIFF'), 0, 0, 0, 0, ...str('WEBPVP8 ')]);
const GIF = B(str('GIF89a......'));
const MP4 = B([0, 0, 0, 0x20, ...str('ftypisom'), 0, 0, 0, 0]);
const MOV = B([0, 0, 0, 0x14, ...str('ftypqt  '), 0, 0, 0, 0]);
const WEBM = B([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
const AVI = B([...str('RIFF'), 0, 0, 0, 0, ...str('AVI LIST')]);

test('innholdskontroll: godtar PNG, JPEG, WebP og GIF ut fra bytene', () => {
  assert.equal(sniffImage(PNG).mime, 'image/png'); assert.equal(sniffImage(JPG).mime, 'image/jpeg');
  assert.equal(sniffImage(WEBP).mime, 'image/webp'); assert.equal(sniffImage(GIF).mime, 'image/gif');
});

test('innholdskontroll: video avvises uansett navn – også forkledd som bilde', () => {
  for (const v of [MP4, MOV, WEBM, AVI]) { assert.equal(looksLikeVideo(v), true); assert.equal(checkUpload(v, 'bilde.png').error, 'video_not_allowed'); }
  assert.equal(checkUpload(PNG, 'film.mp4').error, 'video_not_allowed', 'videonavn avvises selv med bildeinnhold');
  assert.equal(checkUpload(PNG, 'KLIPP.MOV').error, 'video_not_allowed');
});

test('innholdskontroll: SVG, HTML, PDF, tom fil og ukjent innhold avvises', () => {
  assert.equal(checkUpload(B(str('<svg xmlns="http://www.w3.org/2000/svg">')), 'x.png').error, 'type_not_allowed');
  assert.equal(checkUpload(B(str('<html><script>')), 'x.jpg').error, 'type_not_allowed');
  assert.equal(checkUpload(B(str('%PDF-1.7')), 'x.png').error, 'type_not_allowed');
  assert.equal(checkUpload(B([]), 'x.png').error, 'empty');
  assert.equal(cleanName('../../etc/passwd.svg', 'png'), '.._.._etc_passwd.png');
  assert.equal(cleanName('Logo.JPEG', 'jpg'), 'Logo.jpg');
});

/* --- handler med falsk backend --- */
const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'files-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token() {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'files-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 's1', exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const CH = '22222222-2222-4222-8222-222222222222';
function fake(over = {}) {
  const log = [];
  return { log,
    async rpcAsUser(t, fn, a) { log.push(['user', fn, a]); if (over[fn]) return over[fn](a); return fn === 'file_keys' ? a.p_ids.map(id => ({ id, storage_key: 'k/' + id, mime_type: 'image/png' })) : fn === 'delete_file' ? 'k/slett' : true; },
    async rpcAsServer(fn, a) { log.push(['server', fn, a]); if (over[fn]) return over[fn](a); return { id: 'f1', file_name: a.p_name }; },
    async storagePut(k, b, m) { log.push(['put', k, b.length, m]); },
    async storageDelete(keys) { log.push(['del', keys]); },
    async storageSign(keys) { log.push(['sign', keys]); return Object.fromEntries(keys.map(k => [k, 'https://signert/' + k])); } };
}
const up = async (bytes, q, backend) => {
  const r = await handle(new Request('https://x/api/ch?a=file.upload&' + new URLSearchParams(q), { method: 'POST', headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/octet-stream' }, body: bytes }), ENV, { fetchFn, backend });
  return { status: r.status, body: await r.json() };
};

test('file.upload: bilde lagres med servernøkkel, riktig type fra bytene og registreres for innlogget bruker', async () => {
  const b = fake(); const r = await up(PNG, { church: CH, folder: 'bilder', name: 'logo.jpg' }, b);
  assert.equal(r.status, 200);
  const put = b.log.find(x => x[0] === 'put'); assert.match(put[1], new RegExp('^c/' + CH + '/[0-9a-f-]{36}\\.png$')); assert.equal(put[3], 'image/png');
  const reg = b.log.find(x => x[1] === 'register_file')[2];
  assert.equal(reg.p_subject, 's1'); assert.equal(reg.p_issuer, ISS); assert.equal(reg.p_mime, 'image/png'); assert.equal(reg.p_name, 'logo.png'); assert.match(reg.p_sha256, /^[0-9a-f]{64}$/);
});

test('file.upload: video avvises før noe lagres eller sjekkes i databasen', async () => {
  for (const [bytes, name] of [[MP4, 'film.png'], [WEBM, 'x.jpg'], [PNG, 'film.mp4']]) {
    const b = fake(); const r = await up(bytes, { church: CH, name }, b);
    assert.equal(r.status, 415); assert.equal(r.body.error, 'video_not_allowed'); assert.equal(b.log.length, 0);
  }
});

test('file.upload: for stor fil, ugyldig mappe og avslag fra databasen', async () => {
  const big = new Uint8Array(4 * 1024 * 1024 + 1); big.set(PNG);
  assert.equal((await up(big, { church: CH }, fake())).status, 413);
  assert.equal((await up(PNG, { church: CH, folder: 'video' }, fake())).status, 400);
  const nei = fake({ can_upload: () => { throw Object.assign(new Error(), { code: '42501' }); } });
  assert.equal((await up(PNG, { church: CH }, nei)).status, 403); assert.ok(!nei.log.some(x => x[0] === 'put'), 'ingenting lagres uten tillatelse');
  const kvote = fake({ can_upload: () => { throw Object.assign(new Error(), { code: '54000' }); } });
  assert.equal((await up(PNG, { church: CH }, kvote)).status, 429);
});

test('file.upload: feiler registreringen, fjernes den lagrede filen igjen', async () => {
  const b = fake({ register_file: () => { throw Object.assign(new Error(), { code: '54000' }); } });
  const r = await up(PNG, { church: CH }, b);
  assert.equal(r.status, 429);
  const put = b.log.find(x => x[0] === 'put'), del = b.log.find(x => x[0] === 'del');
  assert.deepEqual(del[1], [put[1]]);
});

test('file.urls og file.delete: går via brukerens token; lenker bare for filer databasen gir', async () => {
  const b = fake({ file_keys: a => [{ id: a.p_ids[0], storage_key: 'k/1', mime_type: 'image/png' }] });
  const call = async (a, body) => { const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/json' }, body: JSON.stringify(body) }), ENV, { fetchFn, backend: b }); return { status: r.status, body: await r.json() }; };
  const ids = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', 'ikke-uuid'];
  const r = await call('file.urls', { ids });
  assert.deepEqual(Object.keys(r.body.urls), [ids[0]]);
  assert.deepEqual(b.log.find(x => x[1] === 'file_keys')[2].p_ids, ids.slice(0, 2));
  const d = await call('file.delete', { id: ids[0] });
  assert.equal(d.status, 200); assert.deepEqual(b.log.find(x => x[0] === 'del')[1], ['k/slett']);
});
