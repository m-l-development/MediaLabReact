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

test('file.upload: nye private opplastinger avvises før noe leses, lagres eller sjekkes; vanlig opplasting sender aldri privat', async () => {
  for (const v of ['1', 'true', 'ja', '']) {
    const b = fake(); const r = await up(PNG, { church: CH, folder: 'bilder', private: v }, b);
    assert.equal(r.status, 403, 'private=' + v); assert.equal(r.body.error, 'private_not_allowed'); assert.equal(b.log.length, 0);
  }
  for (const q of [{ church: CH }, { church: CH, private: '0' }]) {
    const b = fake(); const r = await up(PNG, q, b);
    assert.equal(r.status, 200);
    assert.equal(b.log.find(x => x[1] === 'can_upload')[2].p_private, false);
    assert.equal(b.log.find(x => x[1] === 'register_file')[2].p_private, false);
  }
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

/* --- Samarbeidsfiler: kopi til kobling (trinn 18) --- */
const LINK = '55555555-5555-4555-8555-555555555555', SRC = '66666666-6666-4666-8666-666666666666';
const shaHex = async b => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join('');
function linkFake(over = {}, bytes = PNG, copyBytes = bytes) {
  const b = fake(over);
  b.storageCopy = async (from, to) => { b.log.push(['copy', from, to]); };
  b.storageGet = async k => { b.log.push(['get', k]); return copyBytes; };
  return b;
}
const copy = async (body, backend) => {
  const r = await handle(new Request('https://x/api/ch?a=file.copy_to_link', { method: 'POST', headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/json' }, body: JSON.stringify(body) }), ENV, { fetchFn, backend });
  return { status: r.status, body: await r.json() };
};

test('file.copy_to_link: kopierer i lagringen, kontrollerer SHA-256 og registrerer kopien for innlogget bruker', async () => {
  const sha = await shaHex(PNG);
  const b = linkFake({ can_transfer: () => ({ storage_key: 'c/' + CH + '/orig.png', church_id: CH, sha256: sha }), register_link_copy: a => ({ id: 'kopi', link_id: a.p_link }) });
  const r = await copy({ file_id: SRC, link_id: LINK }, b);
  assert.equal(r.status, 200); assert.equal(r.body.file.id, 'kopi');
  const c = b.log.find(x => x[0] === 'copy'); assert.equal(c[1], 'c/' + CH + '/orig.png'); assert.match(c[2], new RegExp('^c/' + CH + '/[0-9a-f-]{36}\.png$'));
  assert.notEqual(c[2], c[1], 'originalen overskrives aldri');
  const reg = b.log.find(x => x[1] === 'register_link_copy')[2];
  assert.equal(reg.p_subject, 's1'); assert.equal(reg.p_file, SRC); assert.equal(reg.p_link, LINK); assert.equal(reg.p_key, c[2]);
  assert.ok(!b.log.some(x => x[0] === 'del'), 'ingenting slettes når alt går bra');
  assert.ok(!b.log.some(x => x[0] === 'put'), 'ingen ny opplasting – bare kopi');
});

test('file.copy_to_link: avslag i databasen gir 403 uten at noe kopieres; ugyldige ID-er gir 400', async () => {
  const nei = linkFake({ can_transfer: () => { throw Object.assign(new Error(), { code: '42501' }); } });
  assert.equal((await copy({ file_id: SRC, link_id: LINK }, nei)).status, 403);
  assert.ok(!nei.log.some(x => x[0] === 'copy'));
  assert.equal((await copy({ file_id: 'x', link_id: LINK }, linkFake())).status, 400);
});

test('file.copy_to_link: kopi som ikke er identisk, eller feil ved registrering, ryddes bort igjen', async () => {
  const sha = await shaHex(PNG);
  const feil = linkFake({ can_transfer: () => ({ storage_key: 'c/' + CH + '/o.png', church_id: CH, sha256: sha }) }, PNG, JPG);
  const r1 = await copy({ file_id: SRC, link_id: LINK }, feil);
  assert.equal(r1.status, 502); assert.equal(r1.body.error, 'copy_mismatch');
  assert.deepEqual(feil.log.find(x => x[0] === 'del')[1], [feil.log.find(x => x[0] === 'copy')[2]]);
  assert.ok(!feil.log.some(x => x[1] === 'register_link_copy'));
  const dobbel = linkFake({ can_transfer: () => ({ storage_key: 'c/' + CH + '/o.png', church_id: CH, sha256: sha }), register_link_copy: () => { throw Object.assign(new Error(), { code: '23505' }); } });
  const r2 = await copy({ file_id: SRC, link_id: LINK }, dobbel);
  assert.equal(r2.status, 409);
  assert.deepEqual(dobbel.log.find(x => x[0] === 'del')[1], [dobbel.log.find(x => x[0] === 'copy')[2]]);
});

test('file.copy_to_link (gruppe): fjernes menigheten før registreringen, avvises kopien med 403 og ryddes bort', async () => {
  const sha = await shaHex(PNG);
  const b = linkFake({ can_transfer: () => ({ storage_key: 'c/' + CH + '/o.png', church_id: CH, sha256: sha }), register_link_copy: () => { throw Object.assign(new Error(), { code: '42501' }); } });
  const r = await copy({ file_id: SRC, link_id: LINK }, b);
  assert.equal(r.status, 403);
  assert.deepEqual(b.log.find(x => x[0] === 'del')[1], [b.log.find(x => x[0] === 'copy')[2]], 'kopien fjernes fra lagringen');
  assert.equal(b.log.find(x => x[1] === 'can_transfer')[0], 'user', 'forhåndskontrollen går med brukerens token');
});

/* --- Sletting av avsluttet samarbeidsgruppe --- */
test('link.delete (gruppe): databasen sletter med brukerens token, alle kopiene (også skjulte) fjernes fra lagringen', async () => {
  const b = fake({ delete_link: () => ({ ok: true, copies: 2, bytes: 30, queue: [Q1, Q2] }),
    cleanup_queue_claim: a => a.p_ids.map(id => ({ id, storage_key: 'c/' + id + '.png' })), cleanup_queue_done: () => null });
  b.storageDelete = async keys => { b.log.push(['del', keys]); };
  const r = await clean('link.delete', { link_id: LINK }, b);
  assert.equal(r.status, 200); assert.deepEqual([r.body.copies, r.body.storage_done, r.body.storage_failed], [2, 2, 0]);
  assert.equal(b.log.find(x => x[1] === 'delete_link')[0], 'user');
  assert.ok(!JSON.stringify(r.body).includes('c/'), 'ingen lagringsnøkler til nettleseren');
  for (const [code, err] of [['22023', 'invalid'], ['42501', 'forbidden']]) {
    const bb = fake({ delete_link: () => { throw Object.assign(new Error('db'), { code }); } });
    const x = await clean('link.delete', { link_id: LINK }, bb);
    assert.equal(x.body.error, err); assert.ok(!bb.log.some(y => y[1] === 'cleanup_queue_claim'), 'ingenting fjernes når databasen avviser');
  }
  assert.equal((await clean('link.delete', { link_id: 'x' }, fake())).status, 400);
});
test('feilkoder for grupper: minst to, høyst 20 og allerede med gir 409 med egen kode', async () => {
  const { dbError } = await import('../lib/http.js');
  assert.deepEqual(dbError({ code: 'CH012' }), { status: 409, error: 'file_in_use' }, 'fil i bruk');
  assert.deepEqual(['CH007', 'CH008', 'CH009'].map(code => dbError({ code })), [
    { status: 409, error: 'group_min_members' }, { status: 409, error: 'group_full' }, { status: 409, error: 'group_member_exists' }]);
});

/* --- Opprydning av private filer fra fjernede medlemmer --- */
const Q1 = '77777777-7777-4777-8777-777777777777', Q2 = '88888888-8888-4888-8888-888888888888';
const clean = async (a, body, backend) => { const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/json' }, body: JSON.stringify(body) }), ENV, { fetchFn, backend }); return { status: r.status, body: await r.json() }; };
test('file.cleanup: databasen sletter med brukerens token, serveren fjerner lagrede filer og registrerer hvert resultat', async () => {
  const b = fake({ cleanup_private_files: a => ({ ok: true, count: a.p_ids.length, bytes: a.p_expected_bytes, queue: [Q1, Q2] }),
    cleanup_queue_claim: a => a.p_ids.map(id => ({ id, storage_key: 'c/' + id + '.png' })), cleanup_queue_done: () => null });
  b.storageDelete = async keys => { b.log.push(['del', keys]); if (keys[0].includes(Q2)) throw Object.assign(new Error('x'), { code: 'timeout' }); };
  const r = await clean('file.cleanup', { church_id: CH, ids: [Q1, Q2], expected_count: 2, expected_bytes: 300 }, b);
  assert.equal(r.status, 200); assert.deepEqual([r.body.count, r.body.storage_done, r.body.storage_failed], [2, 1, 1]);
  assert.ok(!JSON.stringify(r.body).includes('c/'), 'ingen lagringsnøkler til nettleseren');
  const call = b.log.find(x => x[1] === 'cleanup_private_files'); assert.equal(call[0], 'user'); assert.deepEqual(call[2], { p_church: CH, p_ids: [Q1, Q2], p_expected_count: 2, p_expected_bytes: 300 });
  assert.equal(b.log.find(x => x[1] === 'cleanup_queue_claim')[0], 'server', 'nøklene hentes bare av serveren');
  const done = b.log.filter(x => x[1] === 'cleanup_queue_done').map(x => [x[2].p_id, x[2].p_ok]);
  assert.deepEqual(done, [[Q1, true], [Q2, false]]);
});
test('file.cleanup: ugyldig input stoppes før databasen; databasens avvisning (ikke klar / endret) gir 409 og ingenting fjernes', async () => {
  const b = fake();
  for (const body of [{ church_id: 'x', ids: [Q1], expected_count: 1, expected_bytes: 1 }, { church_id: CH, ids: [], expected_count: 1, expected_bytes: 1 },
    { church_id: CH, ids: ['ikke-uuid'], expected_count: 1, expected_bytes: 1 }, { church_id: CH, ids: [Q1], expected_count: 'en', expected_bytes: 1 }])
    assert.equal((await clean('file.cleanup', body, b)).status, 400);
  assert.equal(b.log.length, 0);
  for (const [code, err] of [['CH005', 'cleanup_not_ready'], ['CH006', 'cleanup_changed'], ['42501', 'forbidden']]) {
    const bb = fake({ cleanup_private_files: () => { throw Object.assign(new Error('db'), { code }); } });
    const r = await clean('file.cleanup', { church_id: CH, ids: [Q1], expected_count: 1, expected_bytes: 100 }, bb);
    assert.equal(r.body.error, err); assert.ok(!bb.log.some(x => x[1] === 'cleanup_queue_claim'), 'ingenting fjernes fra lagringen');
  }
});
test('file.cleanup_retry: prøver ventende/feilede oppføringer igjen (ID-er fra databasen med brukerens token)', async () => {
  const b = fake({ cleanup_retry_ids: () => [Q2], cleanup_queue_claim: a => a.p_ids.map(id => ({ id, storage_key: 'c/' + id })), cleanup_queue_done: () => null });
  const r = await clean('file.cleanup_retry', { church_id: CH }, b);
  assert.equal(r.status, 200); assert.equal(r.body.storage_done, 1);
  assert.equal(b.log.find(x => x[1] === 'cleanup_retry_ids')[0], 'user');
});

/* --- Samarbeidsmappe: direkte opplasting --- */
const upLink = async (bytes, q, backend) => {
  const r = await handle(new Request('https://x/api/ch?a=file.upload_link&' + new URLSearchParams(q), { method: 'POST', headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/octet-stream' }, body: bytes }), ENV, { fetchFn, backend });
  return { status: r.status, body: await r.json() };
};
test('file.upload_link: bilde lagres under menigheten som bidro og registreres i gruppen for innlogget bruker', async () => {
  const b = fake({ register_link_upload: a => ({ id: 'u1', link_id: a.p_link }) });
  const r = await upLink(JPG, { link: LINK, church: CH, name: 'Plakat.png' }, b);
  assert.equal(r.status, 200); assert.equal(r.body.file.id, 'u1');
  const pre = b.log.find(x => x[1] === 'can_upload_link'); assert.equal(pre[0], 'user', 'forhåndskontrollen går med brukerens token'); assert.deepEqual(pre[2], { p_link: LINK, p_church: CH, p_size: JPG.length });
  const put = b.log.find(x => x[0] === 'put'); assert.match(put[1], new RegExp('^c/' + CH + '/[0-9a-f-]{36}\.jpg$')); assert.equal(put[3], 'image/jpeg');
  const reg = b.log.find(x => x[1] === 'register_link_upload'); assert.equal(reg[0], 'server');
  assert.equal(reg[2].p_subject, 's1'); assert.equal(reg[2].p_link, LINK); assert.equal(reg[2].p_church, CH); assert.equal(reg[2].p_name, 'Plakat.jpg'); assert.equal(reg[2].p_key, put[1]); assert.match(reg[2].p_sha256, /^[0-9a-f]{64}$/);
});
test('file.upload_link: video og ugyldige ID-er avvises før noe lagres; avslag i databasen lagrer ingenting', async () => {
  for (const [bytes, name] of [[MP4, 'film.png'], [PNG, 'klipp.mov']]) {
    const b = fake(); const r = await upLink(bytes, { link: LINK, church: CH, name }, b);
    assert.equal(r.status, 415); assert.equal(r.body.error, 'video_not_allowed'); assert.equal(b.log.length, 0);
  }
  assert.equal((await upLink(PNG, { link: 'x', church: CH }, fake())).status, 400);
  assert.equal((await upLink(PNG, { link: LINK }, fake())).status, 400);
  const nei = fake({ can_upload_link: () => { throw Object.assign(new Error(), { code: '42501' }); } });
  assert.equal((await upLink(PNG, { link: LINK, church: CH }, nei)).status, 403); assert.ok(!nei.log.some(x => x[0] === 'put'));
  const big = new Uint8Array(4 * 1024 * 1024 + 1); big.set(PNG);
  assert.equal((await upLink(big, { link: LINK, church: CH }, fake())).status, 413);
});
test('file.upload_link: feiler registreringen (gruppen avsluttet, kvote), fjernes den lagrede filen igjen', async () => {
  for (const [code, status] of [['42501', 403], ['53100', 507]]) {
    const b = fake({ register_link_upload: () => { throw Object.assign(new Error(), { code }); } });
    const r = await upLink(PNG, { link: LINK, church: CH }, b);
    assert.equal(r.status, status);
    assert.deepEqual(b.log.find(x => x[0] === 'del')[1], [b.log.find(x => x[0] === 'put')[1]]);
  }
});
