/* E-posthandlinger: «Glemt passord» (før innlogging) og Mail-fanen (status, logo, testutsending).
   Rettigheter for Mail-fanen avgjøres av databasen med brukerens token (Developer/Moderator med MFA). */
import { json, fail, EMAIL } from '../lib/http.js';
import { publicOrigin } from '../lib/backend.js';
import { mailer, mailStatus, sendTemplated, recoveryLink, allowAnon, clientIp } from '../lib/mail.js';
import { sniffImage } from '../lib/sniff.js';
import { TEMPLATE_KEYS } from '../../src/shared/mail-render.js';

export const LOGO_MAX = 512 * 1024;

export const routes = {
  /* «Glemt passord». Svaret er alltid det samme («ok»), så ingen kan finne ut om en adresse har konto.
     Er ConnectHubs e-post ikke satt opp, svarer serveren fallback: true og nettleseren bruker dagens løsning (Supabase).
     Grenser: 10 per time per IP-adresse og 3 per time per e-postadresse (hashet). */
  async 'auth.recover'(ctx) {
    const email = String((ctx.body && ctx.body.email) || '').trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return json({ ok: true, fallback: false });
    if (!(await allowAnon(ctx, 'recover:ip:' + clientIp(ctx.request), 10, 3600)) || !(await allowAnon(ctx, 'recover:email:' + email, 3, 3600))) return json({ ok: true, fallback: false });
    const origin = publicOrigin(ctx.env, ctx.request.url);
    if (!mailer(ctx) || !origin) return json({ ok: true, fallback: true });
    try {
      const g = await ctx.backend.generateLink('recovery', email, origin + '/login.dc.html?flow=recovery');
      await sendTemplated(ctx, { kind: 'recovery', key: 'password', to: email, link: recoveryLink(origin, g.hashedToken), vars: { epost: email } });
    } catch (e) { /* ingen konto eller annen feil: samme svar utad */ }
    return json({ ok: true, fallback: false });
  },
  /* Mail-fanen: er utsending satt opp? (bare stab – databasen avviser andre) */
  async 'mail.status'(ctx) {
    await ctx.backend.rpcAsUser(ctx.token, 'mail_settings_get', {});
    return json({ ok: true, ...mailStatus(ctx) });
  },
  /* Egen logo: PNG eller JPG, høyst 512 kB, kontrollert på bytene. Lagres i den private bøtta og brukes som innebygd vedlegg. */
  async 'mail.logo_upload'(ctx) {
    await ctx.backend.rpcAsUser(ctx.token, 'mail_settings_get', {});   // rettighet før noe lagres
    const len = Number(ctx.request.headers.get('content-length') || 0);
    if (len > LOGO_MAX) return fail('too_large', 413);
    const bytes = new Uint8Array(await ctx.request.arrayBuffer());
    if (bytes.length > LOGO_MAX) return fail('too_large', 413);
    const t = sniffImage(bytes);
    if (!t || !['image/png', 'image/jpeg'].includes(t.mime)) return fail('type_not_allowed', 415);
    const key = 'mail/logo-' + crypto.randomUUID() + '.' + (t.mime === 'image/png' ? 'png' : 'jpg');
    await ctx.backend.storagePut(key, bytes, t.mime);
    let old;
    try { old = await ctx.backend.rpcAsUser(ctx.token, 'set_mail_logo', { p_key: key, p_mime: t.mime }); }
    catch (e) { await ctx.backend.storageDelete([key]).catch(() => {}); throw e; }
    if (old) await ctx.backend.storageDelete([old]).catch(() => {});
    return json({ ok: true });
  },
  async 'mail.logo_reset'(ctx) {
    const old = await ctx.backend.rpcAsUser(ctx.token, 'reset_mail_logo', {});
    if (old) await ctx.backend.storageDelete([old]).catch(() => {});
    return json({ ok: true });
  },
  /* Kortlivet lenke til egen logo for forhåndsvisningen (null = standardlogoen). */
  async 'mail.logo_url'(ctx) {
    const key = await ctx.backend.rpcAsUser(ctx.token, 'mail_logo_key', {});
    if (!key) return json({ ok: true, url: null });
    const s = await ctx.backend.storageSign([key], 300);
    return json({ ok: true, url: s[key] || null });
  },
  /* Testutsending av en mal til egen adresse, med en eksempellenke (ingen innloggingslenke). */
  async 'mail.test'(ctx) {
    const key = String((ctx.body && ctx.body.key) || '');
    if (!TEMPLATE_KEYS.includes(key)) return fail('invalid');
    await ctx.backend.rpcAsUser(ctx.token, 'mail_settings_get', {});
    if (!mailer(ctx)) return fail('mail_not_configured', 409);
    const origin = publicOrigin(ctx.env, ctx.request.url);
    const u = await ctx.backend.getAuthUser(ctx.claims.sub);
    if (!u.email || !origin) return fail('invalid');
    const me = await ctx.backend.rpcAsUser(ctx.token, 'whoami', {}).catch(() => null);
    const r = await sendTemplated(ctx, { kind: 'test', key, to: u.email, link: origin + '/login.dc.html?eksempel=1', vars: { navn: 'Ola Nordmann', epost: u.email, menighet: 'Eksempelmenighet', rolle: 'Bruker' }, actor: me && me.id });
    return r.sent ? json({ ok: true, to: u.email }) : fail(r.error === 'mail_not_configured' ? 'mail_not_configured' : 'email_failed', 502);
  },
};
routes['auth.recover'].anonymous = true;
routes['mail.logo_upload'].raw = true;
