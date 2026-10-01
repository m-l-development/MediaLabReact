import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, sha256hex } from './ch.js';
import { issuerOf, serverConfig } from '../lib/backend.js';

const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'handler-test', alg: 'ES256' };
const fetchFn = async url => { assert.match(String(url), /\/\.well-known\/jwks\.json$/); return new Response(JSON.stringify({ keys: [JWK] }), { status: 200 }); };
async function token(o = {}) {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'handler-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 'auth-sub-1', exp: Math.floor(Date.now() / 1000) + 600, ...o });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const req = async (action, body, { auth = true, method = 'POST', type = 'application/json', raw } = {}) => new Request('https://x.example/api/ch?a=' + action, {
  method, headers: { 'content-type': type, ...(auth ? { authorization: 'Bearer ' + (auth === true ? await token() : auth) } : {}) },
  body: method === 'POST' ? (raw !== undefined ? raw : JSON.stringify(body || {})) : undefined,
});
function fakeBackend(over = {}) {
  const calls = [];
  return { calls, async rpcAsUser(t, fn, args) { calls.push(['user', fn, args, t]); return over[fn] ? over[fn](args) : { id: '11111111-1111-4111-8111-111111111111', email: args.p_email || 'a@b.no', role: 'user' }; },
    async rpcAsServer(fn, args) { calls.push(['server', fn, args]); return over[fn] ? over[fn](args) : { ok: true, role: 'user' }; },
    async getAuthUser(id) { calls.push(['getAuthUser', id]); return over.getAuthUser ? over.getAuthUser(id) : { id, email: 'ny@example.com', emailConfirmed: true }; },
    async sendInvite() { throw new Error('skal ikke kalles i test'); } };
}
const run = async (r, backend, deliver) => { const res = await handle(r, ENV, { fetchFn, backend, deliver }); return { status: res.status, body: await res.json() }; };

test('serverConfig: krever publiserings- og hemmelig nøkkel; service_role-JWT må gjelde riktig prosjekt', () => {
  assert.equal(serverConfig({ VERCEL_ENV: 'preview' }).error, 'publishable_key_missing');
  assert.equal(serverConfig({ ...ENV, 'connecthub-devSUPABASE_SECRET_KEY': '' }).error, 'secret_key_missing');
  const jwt = r => 'x.' + Buffer.from(JSON.stringify({ role: 'service_role', ref: r })).toString('base64url') + '.y';
  assert.equal(serverConfig({ ...ENV, 'connecthub-devSUPABASE_SECRET_KEY': jwt('cmuienhheklcgtfmpvbe') }).error, 'secret_key_wrong_project');
  assert.equal(serverConfig({ ...ENV, 'connecthub-devSUPABASE_SECRET_KEY': jwt('uatpdmhnwwjgzlxaucsx') }).target, 'preview');
  assert.equal(serverConfig(ENV).url, 'https://uatpdmhnwwjgzlxaucsx.supabase.co');
});

test('serverConfig: Preview godtar manuelt opprettet connecthub_devSUPABASE_SECRET_KEY (Vercel tillater ikke bindestrek)', () => {
  const env = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', connecthub_devSUPABASE_SECRET_KEY: 'sb_secret_manuelltesttest' };
  const c = serverConfig(env);
  assert.equal(c.error, undefined); assert.equal(c.target, 'preview'); assert.equal(c.secretKey, 'sb_secret_manuelltesttest');
  assert.equal(c.url, 'https://uatpdmhnwwjgzlxaucsx.supabase.co', 'snakker fortsatt bare med dev-prosjektet');
  assert.equal(serverConfig({ ...env, 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_integrasjontest' }).secretKey, 'sb_secret_integrasjontest', 'integrasjonens navn går foran');
  assert.equal(serverConfig({ VERCEL_ENV: 'production', connecthubSUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testtesttest', connecthub_devSUPABASE_SECRET_KEY: 'sb_secret_manuelltesttest' }).error, 'secret_key_missing', 'gjelder ikke i Production');
  assert.equal(serverConfig({ ...env, connecthub_devSUPABASE_SECRET_KEY: 'feil-format' }).error, 'secret_key_invalid');
});

test('Preview: begge nøklene kan ha understrek-navn; manglende nøkkel gir feilkode med navn, aldri verdier', async () => {
  const env = { VERCEL_ENV: 'preview', connecthub_devSUPABASE_PUBLISHABLE_KEY: 'sb_publishable_manueltest1', connecthub_devSUPABASE_SECRET_KEY: 'sb_secret_manuelltesttest' };
  const c = serverConfig(env);
  assert.equal(c.error, undefined); assert.equal(c.publishableKey, 'sb_publishable_manueltest1'); assert.equal(c.url, 'https://uatpdmhnwwjgzlxaucsx.supabase.co');
  assert.equal(serverConfig({ VERCEL_ENV: 'production', connecthub_devSUPABASE_PUBLISHABLE_KEY: 'sb_publishable_manueltest1' }).error, 'publishable_key_missing', 'gjelder ikke i Production');
  for (const [miss, code] of [['connecthub_devSUPABASE_PUBLISHABLE_KEY', 'publishable_key_missing'], ['connecthub_devSUPABASE_SECRET_KEY', 'secret_key_missing']]) {
    const e = { ...env }; delete e[miss];
    const r = await handle(await req('invite.create', {}), e, { fetchFn });
    const text = await r.text();
    assert.equal(r.status, 503); assert.deepEqual(JSON.parse(text), { ok: false, error: 'not_configured', detail: code });
    assert.ok(!/sb_(secret|publishable)_/.test(text), 'ingen nøkkelverdier i svaret');
  }
});

test('API: metode, ukjent handling, manglende oppsett, manglende og ugyldig innlogging', async () => {
  assert.equal((await run(await req('invite.create', {}, { method: 'GET' }), fakeBackend())).status, 405);
  assert.equal((await run(await req('finnes.ikke', {}), fakeBackend())).status, 404);
  assert.equal((await run(await req('__proto__', {}), fakeBackend())).status, 404);
  const r = await handle(await req('invite.create', {}), { VERCEL_ENV: 'preview' }, { fetchFn });
  assert.equal(r.status, 503);
  assert.equal((await run(await req('invite.create', {}, { auth: false }), fakeBackend())).status, 401);
  assert.equal((await run(await req('invite.create', {}, { auth: 'a.b.c' }), fakeBackend())).status, 401);
  assert.equal((await run(await req('invite.create', {}, { auth: await token({ iss: issuerOf('production') }) }), fakeBackend())).status, 401);
  assert.equal((await run(await req('invite.create', {}, { auth: await token({ role: 'service_role' }) }), fakeBackend())).status, 401);
});

test('API: krever JSON og begrenser størrelsen', async () => {
  assert.equal((await run(await req('invite.create', {}, { type: 'text/plain' }), fakeBackend())).status, 415);
  assert.equal((await run(await req('invite.create', null, { raw: 'x'.repeat(20000) }), fakeBackend())).status, 413);
  assert.equal((await run(await req('invite.create', null, { raw: '[1]' }), fakeBackend())).status, 400);
});

test('invite.create: databasen får bare hash av tokenet; lenken (med tokenet) går bare til e-posten', async () => {
  const b = fakeBackend(); let sent = null;
  const { status, body } = await run(await req('invite.create', { email: ' Ny@Example.com ', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }), b, async (email, link) => { sent = { email, link }; return { kind: 'invite' }; });
  assert.equal(status, 200); assert.equal(body.email_sent, true);
  const [, fn, args, tok] = b.calls[0];
  assert.equal(fn, 'create_invitation'); assert.equal(args.p_email, 'ny@example.com'); assert.match(args.p_token_hash, /^[0-9a-f]{64}$/);
  assert.ok(tok && tok.split('.').length === 3, 'kalles med brukerens token');
  assert.equal(sent.email, 'ny@example.com');
  const u = new URL(sent.link); assert.equal(u.origin, 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app');
  assert.equal(await sha256hex(u.searchParams.get('invite')), args.p_token_hash);
  assert.ok(!JSON.stringify(body).includes(u.searchParams.get('invite')), 'tokenet returneres aldri til den som inviterer');
});

test('invite.create: ugyldige felt avvises før databasen; databasens avslag gir 403', async () => {
  const b = fakeBackend();
  for (const body of [{ email: 'feil', role: 'user' }, { email: 'a@b.no', role: 'konge' }, { email: 'a@b.no', role: 'user', church_id: 'x' }])
    assert.equal((await run(await req('invite.create', body), b)).status, 400);
  assert.equal(b.calls.length, 0);
  const nei = fakeBackend({ create_invitation: () => { throw Object.assign(new Error('x'), { code: '42501' }); } });
  assert.equal((await run(await req('invite.create', { email: 'a@b.no', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }), nei)).status, 403);
});

test('invite.create: e-postfeil gir svar med email_sent=false, invitasjonen beholdes', async () => {
  const { status, body } = await run(await req('invite.create', { email: 'a@b.no', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }), fakeBackend(), async () => { throw Object.assign(new Error('x'), { code: 'email_address_not_authorized' }); });
  assert.equal(status, 200); assert.equal(body.email_sent, false); assert.equal(body.email_error, 'email_address_not_authorized');
});

test('invite.accept: bruker kontoens bekreftede e-post (ikke noe fra forespørselen) og iss/sub fra tokenet', async () => {
  const b = fakeBackend(), tok = 'A'.repeat(43);
  const { status } = await run(await req('invite.accept', { token: tok, email: 'angriper@x.no' }), b);
  assert.equal(status, 200);
  const call = b.calls.find(c => c[1] === 'accept_invitation');
  assert.deepEqual(call[2], { p_token_hash: await sha256hex(tok), p_issuer: ISS, p_subject: 'auth-sub-1', p_email: 'ny@example.com' });
});

test('invite.accept: ubekreftet e-post, ugyldig token og avslag fra databasen', async () => {
  assert.equal((await run(await req('invite.accept', { token: 'A'.repeat(43) }), fakeBackend({ getAuthUser: id => ({ id, email: 'a@b.no', emailConfirmed: false }) }))).status, 403);
  assert.equal((await run(await req('invite.accept', { token: 'kort' }), fakeBackend())).body.error, 'invitation_invalid');
  const r = await run(await req('invite.accept', { token: 'A'.repeat(43) }), fakeBackend({ accept_invitation: () => ({ ok: false, error: 'wrong_email' }) }));
  assert.equal(r.status, 400); assert.equal(r.body.error, 'wrong_email');
});
