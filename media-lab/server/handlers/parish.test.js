import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInbox, inboxTypeOf } from '../lib/sniff.js';
import { passwordProblem } from './parish.js';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';

const B = a => new Uint8Array(a);
const str = s => [...s].map(c => c.charCodeAt(0));
const PNG = B([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const MP4 = B([0, 0, 0, 0x20, ...str('ftypisom'), 0, 0, 0, 0]);
const MOV = B([0, 0, 0, 0x14, ...str('ftypqt  '), 0, 0, 0, 0]);
const DOCX = B([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const PDF = B(str('%PDF-1.7 ...'));

test('innboks: bilder, PDF, dokumenter, video, tekst og prosjekter godtas ut fra innholdet', () => {
  assert.equal(checkInbox(PNG, 'plakat.png').kind, 'image');
  assert.equal(checkInbox(PDF, 'program.pdf').mime, 'application/pdf');
  assert.equal(checkInbox(DOCX, 'brev.docx').kind, 'document');
  assert.equal(checkInbox(MP4, 'klipp.mp4').kind, 'video');
  assert.equal(checkInbox(MOV, 'klipp.mov').mime, 'video/quicktime');
  assert.equal(checkInbox(B(str('navn;tlf\nA;1')), 'liste.csv').mime, 'text/csv');
  assert.equal(checkInbox(B(str('{"a":1}')), 'mal.json').kind, 'project');
});

test('innboks: falske, farlige og ukjente filer avvises', () => {
  assert.equal(checkInbox(PDF, 'bilde.png').error, 'type_mismatch', 'PDF forkledd som bilde');
  assert.equal(checkInbox(PNG, 'dok.pdf').error, 'type_mismatch', 'bilde forkledd som PDF');
  assert.equal(checkInbox(B(str('<html><script>alert(1)</script>')), 'x.txt').error, 'type_mismatch');
  assert.equal(checkInbox(B(str('<svg/>')), 'x.svg').error, 'type_not_allowed');
  assert.equal(checkInbox(B(str('MZ....')), 'x.exe').error, 'type_not_allowed');
  assert.equal(checkInbox(B(str('MZ....')), 'x.motion').error, 'type_mismatch');
  assert.equal(checkInbox(B([0, 1, 2]), 'x.txt').error, 'type_mismatch', 'binært innhold som tekst');
  assert.equal(checkInbox(B([]), 'x.png').error, 'empty');
  assert.equal(inboxTypeOf('side.html'), null);
});

test('passordregler som ellers i ConnectHub', () => {
  assert.equal(passwordProblem('kort1'), 'weak_password');
  assert.equal(passwordProblem('bareBokstaver'), 'weak_password');
  assert.equal(passwordProblem('Menighet2026'), null);
  assert.equal(passwordProblem('a1'.repeat(40)), 'password_too_long');
});

/* --- handlere med falsk backend --- */
const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'parish-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token(sub = 's1', sid = '11111111-1111-4111-8111-111111111111') {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'parish-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub, session_id: sid, exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const CH = '22222222-2222-4222-8222-222222222222';
const PID = '33333333-3333-4333-8333-333333333333';
function fake(over = {}) {
  const log = [];
  const rec = (k) => async (...a) => { log.push([k, ...a]); return over[k] ? over[k](...a) : undefined; };
  return { log,
    async rpcAsUser(t, fn, a) { log.push(['user', fn, a]); return over[fn] ? over[fn](a) : { id: PID, subject: 'auth-1' }; },
    async rpcAsServer(fn, a) { log.push(['server', fn, a]); return over[fn] ? over[fn](a) : { id: PID }; },
    createAuthUser: async (e, pw) => { log.push(['createAuthUser', e]); if (over.createAuthUser) return over.createAuthUser(e, pw); return 'auth-1'; },
    updateAuthUser: rec('updateAuthUser'), deleteAuthUser: rec('deleteAuthUser'), passwordGrant: rec('passwordGrant'), clearFactors: rec('clearFactors'),
    inboxSignUpload: async k => { log.push(['signUpload', k]); return 'https://opplasting/' + k; },
    inboxGet: async k => { log.push(['get', k]); return over.bytes || PNG; },
    inboxDelete: rec('inboxDelete'), inboxSign: async keys => Object.fromEntries(keys.map(k => [k, 'https://signert/' + k])) };
}
const call = async (action, body, backend, tok) => {
  const headers = { 'content-type': 'application/json' };
  if (tok !== null) headers.authorization = 'Bearer ' + (tok || await token());
  const r = await handle(new Request('http://localhost/api/ch?a=' + action, { method: 'POST', headers, body: JSON.stringify(body) }), ENV, { backend, fetchFn });
  return { status: r.status, body: await r.json() };
};

test('opprettelse: rettighet i databasen først, så innloggingskonto med intern nøkkel, så aktivering', async () => {
  const be = fake({ parish_prepare: () => ({ id: PID, login_email: 'p-' + PID + '@menighetsbruker.invalid' }), parish_activate: a => ({ id: a.p_id, username: 'kontor' }) });
  const r = await call('parish.create', { church: CH, username: 'Kontor', password: 'Menighet2026' }, be);
  assert.equal(r.status, 200); assert.equal(r.body.account.username, 'kontor');
  assert.deepEqual(be.log.map(x => x[1] && typeof x[1] === 'string' && x[0] !== 'createAuthUser' ? x[1] : x[0]), ['parish_prepare', 'createAuthUser', 'parish_activate']);
  assert.match(be.log[1][1], /@menighetsbruker\.invalid$/);
  assert.equal(be.log[2][2].p_issuer, ISS);
});

test('opprettelse: svakt passord stoppes før noe lages; feil ved aktivering rydder opp', async () => {
  let be = fake();
  assert.equal((await call('parish.create', { church: CH, username: 'kontor', password: 'kort' }, be)).body.error, 'weak_password');
  assert.equal(be.log.length, 0);
  be = fake({ parish_prepare: () => ({ id: PID, login_email: 'x' }), parish_activate: () => { throw Object.assign(new Error('x'), { code: 'CH013' }); } });
  const r = await call('parish.create', { church: CH, username: 'kontor', password: 'Menighet2026' }, be);
  assert.equal(r.body.error, 'member_limit');
  assert.ok(be.log.some(x => x[0] === 'deleteAuthUser' && x[1] === 'auth-1'), 'innloggingskontoen slettes');
  assert.ok(be.log.some(x => x[1] === 'parish_abort'), 'reservasjonen fjernes');
});

test('opprettelse: databasen avviser andre enn Admin (ingen konto lages)', async () => {
  const be = fake({ parish_prepare: () => { throw Object.assign(new Error('x'), { code: '42501' }); } });
  const r = await call('parish.create', { church: CH, username: 'kontor', password: 'Menighet2026' }, be);
  assert.equal(r.status, 403);
  assert.ok(!be.log.some(x => x[0] === 'createAuthUser'));
});

test('Admin setter nytt passord: ny periode registreres og øktene logges ut', async () => {
  const be = fake();
  const r = await call('parish.manage', { church: CH, action: 'password', password: 'NyttPassord9' }, be);
  assert.equal(r.status, 200);
  const steps = be.log.map(x => (x[0] === 'user' || x[0] === 'server') ? x[1] : x[0]);
  assert.deepEqual(steps, ['parish_manage', 'updateAuthUser', 'parish_pw_record', 'parish_revoke', 'clearFactors', 'parish_account_get']);
  assert.equal(be.log.find(x => x[0] === 'clearFactors')[1], 'auth-1', 'totrinnsfaktorer fjernes (kontoen kan ikke låses med en faktor)');
  assert.equal(be.log[1][2].password, 'NyttPassord9');
  assert.equal(be.log[3][2].p_keep, null);
});

test('Admin logger ut alle innlogginger: øktene slettes og totrinnsfaktorer fjernes', async () => {
  const be = fake();
  assert.equal((await call('parish.manage', { church: CH, action: 'revoke' }, be)).status, 200);
  assert.equal(be.log.find(x => x[1] === 'parish_revoke')[2].p_keep, null);
  assert.equal(be.log.find(x => x[0] === 'clearFactors')[1], 'auth-1');
});

test('Admin deaktiverer: sperres hos leverandøren og alle økter logges ut; aktivering opphever sperren', async () => {
  let be = fake();
  await call('parish.manage', { church: CH, action: 'disable' }, be);
  assert.ok(be.log.some(x => x[0] === 'updateAuthUser' && x[2].ban_duration === '876000h'));
  assert.ok(be.log.some(x => x[1] === 'parish_revoke'));
  be = fake();
  await call('parish.manage', { church: CH, action: 'enable' }, be);
  assert.ok(be.log.some(x => x[0] === 'updateAuthUser' && x[2].ban_duration === 'none'));
});

test('innlogging med brukernavn: nøkkelen slås opp på serveren og sendes aldri til nettleseren', async () => {
  const be = fake({ parish_login_lookup: () => ({ login_email: 'p-x@menighetsbruker.invalid', status: 'active', church_status: 'active' }),
    anon_rate_hit: () => true, passwordGrant: () => ({ access_token: 'at', refresh_token: 'rt' }) });
  const r = await call('parish.login', { username: 'Kontor', password: 'Menighet2026' }, be, null);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.session, { access_token: 'at', refresh_token: 'rt' });
  assert.ok(!JSON.stringify(r.body).includes('invalid'), 'ingen intern nøkkel i svaret');
});

test('innlogging: ukjent brukernavn og feil passord gir samme svar; deaktivert konto sier fra', async () => {
  let be = fake({ parish_login_lookup: () => null, anon_rate_hit: () => true });
  assert.equal((await call('parish.login', { username: 'finnesikke', password: 'x' }, be, null)).body.error, 'invalid_credentials');
  be = fake({ parish_login_lookup: () => ({ login_email: 'k', status: 'active', church_status: 'active' }), anon_rate_hit: () => true,
    passwordGrant: () => { throw Object.assign(new Error('x'), { status: 400, code: 'invalid_credentials' }); } });
  assert.equal((await call('parish.login', { username: 'kontor', password: 'feil' }, be, null)).body.error, 'invalid_credentials');
  be = fake({ parish_login_lookup: () => ({ login_email: 'k', status: 'disabled', church_status: 'active' }), anon_rate_hit: () => true,
    passwordGrant: () => { throw Object.assign(new Error('x'), { status: 400, code: 'user_banned' }); } });
  assert.equal((await call('parish.login', { username: 'kontor', password: 'Menighet2026' }, be, null)).body.error, 'account_disabled');
  be = fake({ anon_rate_hit: () => false });
  assert.equal((await call('parish.login', { username: 'kontor', password: 'x' }, be, null)).status, 429, 'grense per IP/brukernavn');
});

test('årlig passordbytte: bare når forfalt, bare kontoen selv; denne økten beholdes, andre logges ut', async () => {
  let be = fake({ parish_self: () => ({ id: PID, status: 'active', user_status: 'active', auth_ok: true, pw_due: false }) });
  assert.equal((await call('parish.rotate', { password: 'NyttPassord9' }, be)).body.error, 'not_due', 'ingen vanlig passordendring');
  be = fake({ parish_self: () => null });
  assert.equal((await call('parish.rotate', { password: 'NyttPassord9' }, be)).status, 403, 'vanlige brukere kan ikke bruke den');
  const NEW_SID = '44444444-4444-4444-8444-444444444444';
  const at = 'x.' + Buffer.from(JSON.stringify({ session_id: NEW_SID })).toString('base64url') + '.y';
  be = fake({ parish_self: () => ({ id: PID, username: 'kontor', status: 'active', user_status: 'active', auth_ok: true, pw_due: true }),
    parish_login_lookup: () => ({ login_email: 'p-x@menighetsbruker.invalid' }), passwordGrant: () => ({ access_token: at, refresh_token: 'rt2' }) });
  const r = await call('parish.rotate', { password: 'NyttPassord9' }, be, await token('auth-9'));
  assert.equal(r.status, 200);
  assert.ok(be.log.some(x => x[0] === 'updateAuthUser' && x[1] === 'auth-9'));
  assert.equal(be.log.find(x => x[1] === 'parish_pw_record')[2].p_by, 'self');
  assert.ok(be.log.some(x => x[0] === 'passwordGrant' && x[2] === 'NyttPassord9'), 'ny økt med det nye passordet');
  assert.equal(be.log.find(x => x[1] === 'parish_revoke')[2].p_keep, NEW_SID, 'den nye økten beholdes, alle andre logges ut');
  assert.deepEqual(r.body.session, { access_token: at, refresh_token: 'rt2' }, 'PC-en fortsetter uten ny innlogging');
});

test('innboks: sending kontrolleres i databasen med avsenderens token, opplasting til menighetens område', async () => {
  const be = fake({ inbox_expired_take: () => [] });
  const r = await call('inbox.start', { church: CH, files: [{ name: 'plakat.png', size: 100 }, { name: 'program.pdf', size: 200 }] }, be);
  assert.equal(r.status, 200); assert.equal(r.body.uploads.length, 2);
  assert.deepEqual(be.log[0].slice(0, 2), ['user', 'inbox_can_send']); assert.equal(be.log[0][2].p_size, 300);
  for (const x of be.log.filter(x => x[0] === 'signUpload')) assert.match(x[1], new RegExp('^p/' + CH + '/'));
  assert.equal((await call('inbox.start', { church: CH, files: [{ name: 'side.html', size: 10 }] }, fake())).body.error, 'type_not_allowed');
  assert.equal((await call('inbox.start', { church: CH, files: [{ name: 'stor.mp4', size: 31457281 }] }, fake())).body.error, 'too_large');
});

test('innboks: innholdet kontrolleres etter opplasting; feil type slettes', async () => {
  let be = fake({ inbox_take: () => ({ storage_key: 'p/' + CH + '/a.png', file_name: 'plakat.png', file_size: PNG.length }), inbox_register: a => ({ id: 'f1', name: a.p_name }) });
  let r = await call('inbox.finish', { id: PID }, be);
  assert.equal(r.status, 200); assert.equal(be.log.find(x => x[1] === 'inbox_register')[2].p_kind, 'image');
  be = fake({ bytes: PDF, inbox_take: () => ({ storage_key: 'k', file_name: 'plakat.png', file_size: PDF.length }) });
  r = await call('inbox.finish', { id: PID }, be);
  assert.equal(r.status, 415); assert.ok(be.log.some(x => x[0] === 'inboxDelete'));
});

test('innboks: lenker og sletting bare for det databasen gir tilgang til', async () => {
  let be = fake({ inbox_keys: () => [] });
  assert.deepEqual((await call('inbox.urls', { ids: [PID] }, be)).body.urls, {}, 'annen menighet får ingen lenker');
  be = fake({ inbox_keys: () => [{ id: PID, key: 'p/x' }] });
  assert.equal((await call('inbox.urls', { ids: [PID] }, be)).body.urls[PID], 'https://signert/p/x');
  be = fake({ inbox_delete: () => [] });
  assert.equal((await call('inbox.delete', { ids: [PID] }, be)).body.deleted, 0);
  assert.ok(!be.log.some(x => x[0] === 'inboxDelete'));
});

test('alle handlinger unntatt innlogging krever gyldig token', async () => {
  for (const a of ['parish.create', 'parish.manage', 'parish.rotate', 'inbox.start', 'inbox.finish', 'inbox.urls', 'inbox.delete']) {
    assert.equal((await call(a, {}, fake(), null)).status, 401, a);
  }
});
