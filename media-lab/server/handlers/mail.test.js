import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { handle } from './ch.js';
import { issuerOf } from '../lib/backend.js';
import { mailConfig, mailStatus } from '../lib/mail.js';
import { smtpMailer } from '../adapters/smtp.js';

/* --- felles: falsk backend, falsk postkasse og innlogging --- */
const ISS = issuerOf('preview');
const ENV = { VERCEL_ENV: 'preview', 'connecthub-devSUPABASE_PUBLISHABLE_KEY': 'sb_publishable_testtesttest', 'connecthub-devSUPABASE_SECRET_KEY': 'sb_secret_testtesttesttest' };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const JWK = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'mail-test', alg: 'ES256' };
const fetchFn = async () => new Response(JSON.stringify({ keys: [JWK] }), { status: 200 });
async function token() {
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: 'mail-test' }), p = enc({ iss: ISS, aud: 'authenticated', role: 'authenticated', sub: 's1', exp: Math.floor(Date.now() / 1000) + 600 });
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(s).toString('base64url');
}
const HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c';
function fake(over = {}) {
  const log = [];
  return { log,
    async rpcAsUser(t, fn, a) { log.push(['user', fn, a]); if (over[fn]) return over[fn](a); return fn === 'create_invitation' ? { id: 'inv1', email: a.p_email, church_name: 'Testmenighet', role: a.p_role } : true; },
    async rpcAsServer(fn, a) { log.push(['server', fn, a]); if (over[fn]) return over[fn](a); return fn === 'anon_rate_hit' ? true : fn === 'mail_for_send' ? { subject: null, blocks: null, logo_key: null } : null; },
    async generateLink(type, email, redirectTo) { log.push(['link', type, email, redirectTo]); if (over.generateLink) return over.generateLink(type, email); return { hashedToken: HASH, type }; },
    async getAuthUser() { return { id: 's1', email: 'stab@example.com', emailConfirmed: true }; },
    async storagePut(k, b, m) { log.push(['put', k, b.length, m]); },
    async storageDelete(keys) { log.push(['del', keys]); },
    async storageGet() { return new Uint8Array([0x89, 0x50, 0x4e, 0x47]); },
    async storageSign(keys) { return Object.fromEntries(keys.map(k => [k, 'https://signert/' + k])); },
    async sendInvite() { log.push(['supabase-invite']); return { kind: 'invite' }; } };
}
const box = (fail) => { const sent = []; return { sent, sender: 'test@example.com', async send(m) { if (fail) throw Object.assign(new Error('x'), { code: 'EAUTH' }); sent.push(m); } }; };
const call = async (a, body, deps, opts = {}) => {
  const headers = { 'content-type': opts.type || 'application/json', ...(opts.anon ? {} : { authorization: 'Bearer ' + await token() }), ...(opts.headers || {}) };
  const r = await handle(new Request('https://x/api/ch?a=' + a, { method: 'POST', headers, body: opts.raw || JSON.stringify(body || {}) }), opts.env || ENV, { fetchFn, ...deps });
  return { status: r.status, body: await r.json() };
};

/* --- «Glemt passord» før innlogging --- */
test('auth.recover: virker uten innlogging, lager vår token_hash-lenke og sender malen «Nytt passord»', async () => {
  const b = fake(), m = box();
  const r = await call('auth.recover', { email: ' Bruker@Example.com ' }, { backend: b, mailer: m }, { anon: true, headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } });
  assert.equal(r.status, 200); assert.deepEqual(r.body, { ok: true, fallback: false });
  const l = b.log.find(x => x[0] === 'link'); assert.deepEqual(l.slice(1), ['recovery', 'bruker@example.com', 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app/login.dc.html?flow=recovery']);
  assert.equal(m.sent.length, 1); assert.equal(m.sent[0].to, 'bruker@example.com');
  assert.ok(m.sent[0].text.includes('/login.dc.html?flow=recovery&token_hash=' + HASH + '&type=recovery'), 'lenken til vår side står i e-posten');
  assert.ok(m.sent[0].attachments.some(a => a.cid === 'medialab-logo'), 'logo som innebygd vedlegg');
  assert.ok(!JSON.stringify(r.body).includes(HASH), 'lenken sendes aldri tilbake til nettleseren');
  const reg = b.log.find(x => x[1] === 'register_mail')[2]; assert.equal(reg.p_status, 'sent'); assert.ok(!JSON.stringify(reg).includes(HASH), 'lenken lagres ikke i loggen');
  assert.equal(b.log.filter(x => x[1] === 'anon_rate_hit').length, 2, 'grense per IP og per e-post');
  assert.ok(b.log.filter(x => x[1] === 'anon_rate_hit').every(x => /^[0-9a-f]{64}$/.test(x[2].p_key_hash) && !JSON.stringify(x[2]).includes('203.0.113.9')), 'bare hasher, ingen IP eller e-post');
});
test('auth.recover: samme nøytrale svar for ukjent konto, ugyldig adresse og når grensen er nådd', async () => {
  const nobody = fake({ generateLink: () => { throw Object.assign(new Error('x'), { status: 404 }); } }), m1 = box();
  assert.deepEqual((await call('auth.recover', { email: 'finnes.ikke@example.com' }, { backend: nobody, mailer: m1 }, { anon: true })).body, { ok: true, fallback: false });
  assert.equal(m1.sent.length, 0);
  const b2 = fake(), m2 = box();
  assert.deepEqual((await call('auth.recover', { email: 'ikke-en-adresse' }, { backend: b2, mailer: m2 }, { anon: true })).body, { ok: true, fallback: false });
  assert.ok(!b2.log.some(x => x[0] === 'link'));
  const full = fake({ anon_rate_hit: () => false }), m3 = box();
  assert.deepEqual((await call('auth.recover', { email: 'bruker@example.com' }, { backend: full, mailer: m3 }, { anon: true })).body, { ok: true, fallback: false });
  assert.ok(!full.log.some(x => x[0] === 'link') && !m3.sent.length, 'ingen lenke eller e-post over grensen');
});
test('auth.recover: uten e-postoppsett svarer serveren fallback (nettleseren bruker dagens løsning)', async () => {
  const b = fake();
  assert.deepEqual((await call('auth.recover', { email: 'bruker@example.com' }, { backend: b }, { anon: true })).body, { ok: true, fallback: true });
  assert.ok(!b.log.some(x => x[0] === 'link'));
});
test('auth.recover: e-postfeil gir samme svar, og feilen registreres uten lenke', async () => {
  const b = fake(), m = box(true);
  assert.deepEqual((await call('auth.recover', { email: 'bruker@example.com' }, { backend: b, mailer: m }, { anon: true })).body, { ok: true, fallback: false });
  const reg = b.log.find(x => x[1] === 'register_mail')[2]; assert.equal(reg.p_status, 'failed'); assert.equal(reg.p_error, 'EAUTH');
});
test('bare «Glemt passord» er åpen før innlogging – alle andre handlinger krever fortsatt innlogging', async () => {
  for (const a of ['mail.status', 'mail.test', 'mail.logo_reset', 'invite.create', 'file.urls']) assert.equal((await call(a, {}, { backend: fake(), mailer: box() }, { anon: true })).status, 401, a);
});

/* --- invitasjoner --- */
test('invite.create med e-postoppsett: engangslenke (invite), velkomstmalen og flettefelt; Supabase sender ingenting', async () => {
  const b = fake(), m = box();
  const r = await call('invite.create', { email: 'ny@example.com', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }, { backend: b, mailer: m });
  assert.equal(r.status, 200); assert.equal(r.body.email_sent, true);
  assert.equal(b.log.find(x => x[0] === 'link')[1], 'invite');
  assert.ok(!b.log.some(x => x[0] === 'supabase-invite'), 'ingen e-post fra Supabase');
  const t = m.sent[0].text; assert.match(t, /\/login\.dc\.html\?invite=[A-Za-z0-9_-]{43}&token_hash=a1b2[0-9a-f]+&type=invite/);
  assert.equal(b.log.find(x => x[1] === 'register_mail')[2].p_related, 'inv1');
  assert.ok(!JSON.stringify(r.body).includes(HASH), 'lenken sendes ikke til nettleseren');
});
test('invite.create: finnes kontoen, brukes magiclink; e-postfeil gir email_sent=false men invitasjonen er laget', async () => {
  const b = fake({ generateLink: (type) => { if (type === 'invite') throw Object.assign(new Error('x'), { status: 422, code: 'email_exists' }); return { hashedToken: HASH, type }; } }), m = box();
  const r = await call('invite.create', { email: 'finnes@example.com', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }, { backend: b, mailer: m });
  assert.equal(r.body.email_sent, true); assert.match(m.sent[0].text, /type=magiclink/);
  const bad = fake(), mb = box(true);
  const r2 = await call('invite.create', { email: 'ny2@example.com', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }, { backend: bad, mailer: mb });
  assert.equal(r2.status, 200); assert.equal(r2.body.email_sent, false); assert.equal(r2.body.invitation.id, 'inv1');
});
test('invite.create uten e-postoppsett: som før (Supabase sender invitasjonen)', async () => {
  const b = fake();
  const r = await call('invite.create', { email: 'ny@example.com', role: 'user', church_id: '22222222-2222-4222-8222-222222222222' }, { backend: b });
  assert.equal(r.body.email_sent, true); assert.ok(b.log.some(x => x[0] === 'supabase-invite')); assert.ok(!b.log.some(x => x[0] === 'link'));
});

/* --- Mail-fanen --- */
test('mail.logo_upload: rettighet sjekkes først; bare PNG/JPG under 512 kB; gammel logo slettes', async () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const no = fake({ mail_settings_get: () => { throw Object.assign(new Error('x'), { code: '42501' }); } });
  assert.equal((await call('mail.logo_upload', null, { backend: no }, { raw: PNG, type: 'application/octet-stream' })).status, 403);
  assert.ok(!no.log.some(x => x[0] === 'put'), 'ingenting lagres uten rettighet');
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal((await call('mail.logo_upload', null, { backend: fake() }, { raw: svg, type: 'application/octet-stream' })).status, 415);
  const gif = new TextEncoder().encode('GIF89a......');
  assert.equal((await call('mail.logo_upload', null, { backend: fake() }, { raw: gif, type: 'application/octet-stream' })).status, 415);
  const big = new Uint8Array(512 * 1024 + 1); big.set(PNG);
  assert.equal((await call('mail.logo_upload', null, { backend: fake() }, { raw: big, type: 'application/octet-stream' })).status, 413);
  const b = fake({ set_mail_logo: () => 'mail/logo-gammel.png' });
  const r = await call('mail.logo_upload', null, { backend: b }, { raw: PNG, type: 'application/octet-stream' });
  assert.equal(r.status, 200);
  const put = b.log.find(x => x[0] === 'put'); assert.match(put[1], /^mail\/logo-[0-9a-f-]{36}\.png$/); assert.equal(put[3], 'image/png');
  assert.deepEqual(b.log.find(x => x[0] === 'del')[1], ['mail/logo-gammel.png']);
});
test('mail.status og mail.test: viser bare om utsending er satt opp; testutsending uten oppsett gir 409', async () => {
  const s = await call('mail.status', {}, { backend: fake() });
  assert.deepEqual([s.status, s.body.configured, s.body.sender], [200, false, null]);
  assert.equal((await call('mail.test', { key: 'welcome' }, { backend: fake() })).status, 409);
  const m = box(); const t = await call('mail.test', { key: 'password' }, { backend: fake(), mailer: m });
  assert.equal(t.status, 200); assert.equal(m.sent[0].to, 'stab@example.com'); assert.match(m.sent[0].text, /eksempel=1/);
  assert.equal((await call('mail.test', { key: 'annet' }, { backend: fake(), mailer: m })).status, 400);
});
test('mailConfig: krever vert, port 465/587, avsenderadresse og passord; status viser aldri passordet', () => {
  assert.equal(mailConfig({}), null);
  assert.equal(mailConfig({ CONNECTHUB_SMTP_HOST: 'smtp.gmail.com', CONNECTHUB_SMTP_USER: 'a@b.no', CONNECTHUB_SMTP_PASSWORD: 'x' }).error, 'smtp_password_missing');
  assert.equal(mailConfig({ CONNECTHUB_SMTP_HOST: 'smtp.gmail.com', CONNECTHUB_SMTP_PORT: '25', CONNECTHUB_SMTP_USER: 'a@b.no', CONNECTHUB_SMTP_PASSWORD: 'abcdefghijklmnop' }).error, 'smtp_port_invalid');
  const env = { CONNECTHUB_SMTP_HOST: 'smtp.gmail.com', CONNECTHUB_SMTP_PORT: '587', CONNECTHUB_SMTP_USER: 'avsender@example.com', CONNECTHUB_SMTP_PASSWORD: 'hemmelig-app-passord', CONNECTHUB_MAIL_FROM_NAME: 'Connect\r\nHub <x>' };
  assert.equal(mailConfig(env).fromName, 'ConnectHub x', 'avsendernavnet kan ikke brukes til header-injeksjon');
  const st = mailStatus({ env, deps: {} }); assert.deepEqual(st, { configured: true, sender: 'avsender@example.com', error: null });
  assert.ok(!JSON.stringify(st).includes('hemmelig'));
});

test('mottaker: nøyaktig én adresse – komma, semikolon og navn med vinkelparentes stoppes før utsending', async () => {
  const { singleRecipient } = await import('../lib/mail.js');
  assert.ok(singleRecipient('ola.nordmann@example.com'));
  for (const bad of ['a@b.no,c@d.no', 'a@b.no;c@d.no', 'Ola <a@b.no>', 'a@b.no c@d.no', '"x"@b.no', 'a@b', '']) assert.equal(singleRecipient(bad), false, bad);
  const m = box(), b = fake({ create_invitation: a => ({ id: 'inv1', email: 'x@a.no,ond@ond.test', church_name: 'T', role: 'user' }) });
  const r = await call('invite.resend', { id: '33333333-3333-4333-8333-333333333333' }, { backend: fake({ reissue_invitation: () => ({ id: 'inv1', email: 'x@a.no,ond@ond.test', role: 'user' }) }), mailer: m });
  assert.equal(r.body.email_sent, false); assert.equal(m.sent.length, 0, 'ingenting sendt');
});

test('valgfrie e-poster: hoppes over og registreres som skipped når mottakeren har slått dem av; nødvendige sendes alltid', async () => {
  const { sendTemplated } = await import('../lib/mail.js');
  const b = fake({ mail_optional_allowed: () => false }), m = box();
  const ctx = { deps: { mailer: m }, env: ENV, backend: b };
  assert.deepEqual(await sendTemplated(ctx, { kind: 'test', key: 'welcome', to: 'a@example.com', link: 'https://x.test/l', optional: true }), { sent: false, error: 'opted_out' });
  assert.equal(m.sent.length, 0); assert.equal(b.log.find(x => x[1] === 'register_mail')[2].p_status, 'skipped');
  assert.deepEqual(await sendTemplated(ctx, { kind: 'recovery', key: 'password', to: 'a@example.com', link: 'https://x.test/l' }), { sent: true });
  assert.equal(m.sent.length, 1, 'nødvendig e-post (Glemt passord) sendes uansett valg');
});

/* --- SMTP-protokollen mot en lokal testserver (ingen ekte e-post) --- */
test('SMTP-adapter: sender HTML, tekst og logo som innebygd vedlegg; avsender er SMTP-kontoen', async () => {
  let data = '', authed = false;
  const srv = net.createServer(sock => {
    let inData = false, buf = '';
    sock.write('220 test ESMTP\r\n');
    sock.on('data', d => {
      buf += d.toString();
      let i; while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (inData) { if (line === '.') { inData = false; sock.write('250 OK\r\n'); } else data += line + '\n'; continue; }
        if (/^EHLO/i.test(line)) sock.write('250-test\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (/^AUTH PLAIN/i.test(line)) { authed = true; sock.write('235 OK\r\n'); }
        else if (/^(MAIL|RCPT)/i.test(line)) sock.write('250 OK\r\n');
        else if (/^DATA/i.test(line)) { inData = true; sock.write('354 go\r\n'); }
        else if (/^QUIT/i.test(line)) { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('250 OK\r\n');
      }
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const m = smtpMailer({ host: '127.0.0.1', port, user: 'avsender@example.com', pass: 'app-passord-test', fromName: 'ConnectHub' }, { port, secure: false, requireTLS: false, ignoreTLS: true });
  await m.send({ to: 'mottaker@example.com', subject: 'Velg nytt passord', html: '<p>Hei</p><img src="cid:medialab-logo">', text: 'Hei',
    attachments: [{ filename: 'medialab.png', cid: 'medialab-logo', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]), contentType: 'image/png' }] });
  srv.close();
  assert.ok(authed, 'logget inn på SMTP');
  assert.match(data, /From: ConnectHub <avsender@example\.com>/); assert.match(data, /To: mottaker@example\.com/);
  assert.match(data, /Subject: Velg nytt passord/); assert.match(data, /Content-ID: <medialab-logo>/); assert.match(data, /text\/plain/); assert.match(data, /text\/html/);
});
