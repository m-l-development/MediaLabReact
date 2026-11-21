/* Menighetsbruker (fast fellesbruker per menighet) og innboksen. Bygger på den vanlige innloggingen hos leverandøren
   (samme passordhashing, økter og tokens); denne filen gjør bare det nettleseren ikke kan gjøre selv:
   - Admin oppretter/endrer kontoen (rettigheten avgjøres av databasen med Admins token, deretter innloggingsdelen her);
   - innlogging med brukernavn: brukernavnet slås opp på serveren, så den interne nøkkelen aldri når nettleseren;
   - det årlige passordbyttet (bare når det er forfalt – databasen sperrer all annen tilgang til da);
   - filer til innboksen (direkte opplasting til en privat bøtte, innholdskontroll, kortlivede lenker). */
import { json, fail, UUID } from '../lib/http.js';
import { allowAnon, clientIp } from '../lib/mail.js';
import { checkInbox, inboxTypeOf, cleanName } from '../lib/sniff.js';

export const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;
export const INBOX_LIMIT = 30 * 1024 * 1024;
/* Samme passordregler som ellers i ConnectHub (minst 10 tegn, bokstaver og tall; leverandøren håndhever det samme). */
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'weak_password';
  if (pw.length > 72) return 'password_too_long';
  if (!/[A-Za-zÆØÅæøå]/.test(pw) || !/\d/.test(pw)) return 'weak_password';
  return null;
}
/* session_id fra et token leverandøren nettopp har gitt serveren (ikke fra klienten) – bare til å beholde den nye økten. */
const sessionOf = t => { try { const v = JSON.parse(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id; return UUID.test(String(v || '')) ? v : null; } catch (e) { return null; } };
const BAN_FOREVER = '876000h';   // ≈ 100 år; «none» opphever
/* Leverandørens svar på passordet: bare «svakt passord» blir en brukerfeil; andre avvisninger kastes videre (vises som feil). */
const authError = e => (e && e.code === 'weak_password' ? fail('weak_password', 400) : null);

export const routes = {
  /* Admin: «Opprett menighetsbruker» (brukernavn + passord, ingen e-post). */
  async 'parish.create'(ctx) {
    const b = ctx.body, church = String(b.church || ''), username = String(b.username || '').trim().toLowerCase(), password = b.password;
    if (!UUID.test(church) || !USERNAME.test(username)) return fail('invalid');
    const pw = passwordProblem(password);
    if (pw) return fail(pw);
    const prep = await ctx.backend.rpcAsUser(ctx.token, 'parish_prepare', { p_church: church, p_username: username });
    let uid;
    try { uid = await ctx.backend.createAuthUser(prep.login_email, password); }
    catch (e) { await ctx.backend.rpcAsServer('parish_abort', { p_id: prep.id }).catch(() => {}); const r = authError(e); if (r) return r; throw e; }
    try {
      const account = await ctx.backend.rpcAsServer('parish_activate', { p_id: prep.id, p_issuer: ctx.cfg.issuer, p_subject: uid });
      return json({ ok: true, account });
    } catch (e) {
      await ctx.backend.deleteAuthUser(uid).catch(() => {});
      await ctx.backend.rpcAsServer('parish_abort', { p_id: prep.id }).catch(() => {});
      throw e;
    }
  },
  /* Admin: endre brukernavn, sette nytt passord (logger alltid ut alle økter – leverandøren gjør det også), logge ut,
     deaktivere, aktivere. */
  async 'parish.manage'(ctx) {
    const b = ctx.body, church = String(b.church || ''), action = String(b.action || '');
    if (!UUID.test(church) || !['rename', 'password', 'revoke', 'disable', 'enable'].includes(action)) return fail('invalid');
    const username = action === 'rename' ? String(b.username || '').trim().toLowerCase() : null;
    if (action === 'rename' && !USERNAME.test(username)) return fail('invalid');
    if (action === 'password') { const pw = passwordProblem(b.password); if (pw) return fail(pw); }
    let r = await ctx.backend.rpcAsUser(ctx.token, 'parish_manage', { p_church: church, p_action: action, p_username: username });
    if (!r || !r.subject) return json({ ok: true, account: r });
    if (action === 'password') {
      try { await ctx.backend.updateAuthUser(r.subject, { password: b.password }); }
      catch (e) { const x = authError(e); if (x) return x; throw e; }
      r = await ctx.backend.rpcAsServer('parish_pw_record', { p_id: r.id, p_by: 'admin' });
      await ctx.backend.rpcAsServer('parish_revoke', { p_id: r.id, p_keep: null });
    } else if (action === 'revoke') {
      await ctx.backend.rpcAsServer('parish_revoke', { p_id: r.id, p_keep: null });
    } else if (action === 'disable') {
      await ctx.backend.updateAuthUser(r.subject, { ban_duration: BAN_FOREVER });
      await ctx.backend.rpcAsServer('parish_revoke', { p_id: r.id, p_keep: null });
    } else if (action === 'enable') {
      await ctx.backend.updateAuthUser(r.subject, { ban_duration: 'none' });
    }
    const account = await ctx.backend.rpcAsUser(ctx.token, 'parish_account_get', { p_church: church });
    return json({ ok: true, account });
  },
  /* Innlogging med brukernavn og passord (før innlogging). Svarer med leverandørens økt (nettleseren lagrer den som en
     vanlig innlogging). Grenser: 20 forsøk per time per IP-adresse og 10 per time per brukernavn. */
  async 'parish.login'(ctx) {
    const b = ctx.body || {}, username = String(b.username || '').trim().toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
    if (!USERNAME.test(username) || !password || password.length > 200) return fail('invalid_credentials', 400);
    if (!(await allowAnon(ctx, 'parish:ip:' + clientIp(ctx.request), 20, 3600)) || !(await allowAnon(ctx, 'parish:user:' + username, 10, 3600))) return fail('over_request_rate_limit', 429);
    const a = await ctx.backend.rpcAsServer('parish_login_lookup', { p_username: username });
    if (!a || !a.login_email) return fail('invalid_credentials', 400);
    let s;
    try { s = await ctx.backend.passwordGrant(a.login_email, password); }
    catch (e) {
      if (e && (e.code === 'user_banned' || (e.status === 400 && a.status === 'disabled'))) return fail(a.status === 'disabled' ? 'account_disabled' : 'invalid_credentials', 400);
      if (e && (e.status === 400 || e.status === 401)) return fail('invalid_credentials', 400);
      if (e && e.status === 429) return fail('over_request_rate_limit', 429);
      throw e;
    }
    if (a.status === 'disabled' || a.church_status !== 'active') return fail('account_disabled', 403);
    if (!s || !s.access_token || !s.refresh_token) return fail('server_error', 502);
    return json({ ok: true, session: { access_token: s.access_token, refresh_token: s.refresh_token } });
  },
  /* Det årlige passordbyttet (popupen). Bare kontoen selv, bare når passordet er forfalt. Leverandøren logger ut alle økter
     når passordet settes (også denne), så serveren lager straks en ny økt med det nye passordet og gir den til PC-en –
     brukeren fortsetter uten ny innlogging, alle andre økter er ugyldige. */
  async 'parish.rotate'(ctx) {
    const pw = passwordProblem(ctx.body.password);
    if (pw) return fail(pw);
    const me = await ctx.backend.rpcAsUser(ctx.token, 'parish_self', {});
    if (!me || me.status !== 'active' || me.user_status !== 'active' || !me.auth_ok) return fail('forbidden', 403);
    if (!me.pw_due) return fail('not_due', 403);
    try { await ctx.backend.updateAuthUser(ctx.claims.sub, { password: ctx.body.password }); }
    catch (e) { const x = authError(e); if (x) return x; throw e; }
    await ctx.backend.rpcAsServer('parish_pw_record', { p_id: me.id, p_by: 'self' });
    const a = await ctx.backend.rpcAsServer('parish_login_lookup', { p_username: me.username });
    const s = a && a.login_email ? await ctx.backend.passwordGrant(a.login_email, ctx.body.password) : null;
    const sid = s && s.access_token ? sessionOf(s.access_token) : null;
    await ctx.backend.rpcAsServer('parish_revoke', { p_id: me.id, p_keep: sid });
    return json({ ok: true, session: s && s.access_token && s.refresh_token ? { access_token: s.access_token, refresh_token: s.refresh_token } : null });
  },

  /* Send filer til innboksen, steg 1: kontroll av navn/type/størrelse og rettighet (med avsenderens token), deretter én
     kortlivet opplastingslenke per fil. Høyst 20 filer per kall. */
  async 'inbox.start'(ctx) {
    const b = ctx.body || {}, church = String(b.church || ''), files = Array.isArray(b.files) ? b.files.slice(0, 21) : [];
    if (!UUID.test(church) || !files.length || files.length > 20) return fail('invalid');
    const list = [];
    for (const f of files) {
      const name = String((f && f.name) || '').slice(0, 200), size = Number(f && f.size), t = inboxTypeOf(name);
      if (!Number.isSafeInteger(size) || size <= 0) return fail('invalid');
      if (!t) return json({ ok: false, error: 'type_not_allowed', name }, 415);
      if (size > INBOX_LIMIT) return json({ ok: false, error: 'too_large', name }, 413);
      list.push({ name, size, t });
    }
    await ctx.backend.rpcAsUser(ctx.token, 'inbox_can_send', { p_church: church, p_size: list.reduce((a, x) => a + x.size, 0) });
    try { const keys = (await ctx.backend.rpcAsServer('inbox_expired_take', { p_limit: 20 })) || []; if (keys.length) await ctx.backend.inboxDelete(keys); } catch (e) { /* neste gang */ }
    const uploads = [];
    for (const x of list) {
      const key = 'p/' + church + '/' + crypto.randomUUID() + '.' + x.t.ext;
      const id = await ctx.backend.rpcAsServer('inbox_begin', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_church: church, p_key: key, p_name: x.name, p_mime: x.t.mime, p_size: x.size });
      uploads.push({ id, url: await ctx.backend.inboxSignUpload(key), mime: x.t.mime });
    }
    return json({ ok: true, uploads });
  },
  /* Steg 2 per fil: innholdet hentes og kontrolleres (magiske bytes, oppgitt størrelse), og registreres. Ellers slettes det. */
  async 'inbox.finish'(ctx) {
    const id = String(ctx.body.id || '');
    if (!UUID.test(id)) return fail('invalid');
    const p = await ctx.backend.rpcAsServer('inbox_take', { p_id: id, p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub });
    if (!p || !p.storage_key) return fail('upload_expired', 410);
    const key = p.storage_key, drop = () => ctx.backend.inboxDelete([key]).catch(() => {});
    let bytes;
    try { bytes = await ctx.backend.inboxGet(key); } catch (e) { await drop(); return fail('upload_missing', 409); }
    const chk = checkInbox(bytes, p.file_name);
    if (!chk.ok) { await drop(); return fail(chk.error, 415); }
    if (bytes.length !== Number(p.file_size)) { await drop(); return fail('upload_mismatch', 422); }
    try {
      const f = await ctx.backend.rpcAsServer('inbox_register', { p_id: id, p_name: cleanName(p.file_name, chk.ext), p_mime: chk.mime, p_kind: chk.kind, p_size: bytes.length });
      return json({ ok: true, file: f });
    } catch (e) { await drop(); throw e; }
  },
  /* Kortlivede lenker (10 min) til filer brukeren kan lese (databasen avgjør med brukerens token). */
  async 'inbox.urls'(ctx) {
    const ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.filter(x => UUID.test(String(x))).slice(0, 100) : [];
    if (!ids.length) return json({ ok: true, urls: {} });
    const rows = (await ctx.backend.rpcAsUser(ctx.token, 'inbox_keys', { p_ids: ids })) || [];
    const signed = rows.length ? await ctx.backend.inboxSign(rows.map(r => r.key), 600) : {};
    const urls = {};
    for (const r of rows) if (signed[r.key]) urls[r.id] = signed[r.key];
    return json({ ok: true, urls });
  },
  /* Sletting: databasen fjerner radene den gir tilgang til og gir nøklene; innholdet slettes her. */
  async 'inbox.delete'(ctx) {
    const ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.filter(x => UUID.test(String(x))).slice(0, 500) : [];
    if (!ids.length) return json({ ok: true, deleted: 0 });
    const keys = (await ctx.backend.rpcAsUser(ctx.token, 'inbox_delete', { p_ids: ids })) || [];
    if (keys.length) await ctx.backend.inboxDelete(keys).catch(() => {});
    return json({ ok: true, deleted: keys.length });
  },
};
routes['parish.login'].anonymous = true;
