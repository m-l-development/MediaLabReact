/* Forespørsler om brukerkonto fra innloggingssiden (før innlogging). Ingen konto opprettes her – bare en forespørsel som
   Developer/Moderator behandler i «Forespørsler». Vern: signert skjemanøkkel (minst 3 sekunder, høyst 2 timer), felle-felt,
   grenser per IP (5/time) og per e-post (3/døgn), og samlet tak i databasen. Svaret er alltid det samme («ok»), så det ikke
   avsløres om adressen finnes eller om forespørselen er et duplikat. Forespørselen lagres FØR e-post sendes. */
import { json, fail, EMAIL } from '../lib/http.js';
import { publicOrigin } from '../lib/backend.js';
import { mailer, mailConfig, sendTemplated, allowAnon, clientIp, anonHash } from '../lib/mail.js';

const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function sign(cfg, ts) {
  const k = await crypto.subtle.importKey('raw', enc.encode(String(cfg.secretKey)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode('request-form|' + ts)));
}
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export const routes = {
  async 'request.form'(ctx) { const ts = Date.now(); return json({ ok: true, token: ts + '.' + await sign(ctx.cfg, ts) }); },

  async 'request.submit'(ctx) {
    const b = ctx.body || {};
    if (b.website) return json({ ok: true });   // felle-felt fylt ut = robot (samme svar, ingenting lagres)
    const [ts, sig] = String(b.token || '').split('.'), age = Date.now() - Number(ts);
    if (!/^\d{13}$/.test(ts || '') || !sig || sig !== await sign(ctx.cfg, ts) || !(age >= 3000 && age <= 2 * 3600 * 1000)) return fail('form_expired');
    const name = clean(b.name, 100), phone = clean(b.phone, 20), email = clean(b.email, 254).toLowerCase(), church = clean(b.church, 200);
    if (name.length < 2 || !/^[0-9+ ()-]{8,20}$/.test(phone) || !EMAIL.test(email) || church.length < 2) return fail('invalid');
    if (!(await allowAnon(ctx, 'request:ip:' + clientIp(ctx.request), 5, 3600)) || !(await allowAnon(ctx, 'request:email:' + email, 3, 86400))) return json({ ok: true });
    let r;
    try { r = await ctx.backend.rpcAsServer('submit_account_request', { p_name: name, p_phone: phone, p_email: email, p_church: church, p_ip_hash: await anonHash(ctx, clientIp(ctx.request)) }); }
    catch (e) { if (e && e.code === '54000') return json({ ok: true }); throw e; }
    const origin = publicOrigin(ctx.env, ctx.request.url);
    if (r && !r.duplicate && origin && mailer(ctx)) {
      /* Kvittering til avsenderen (svar på deres egen forespørsel). */
      await sendTemplated(ctx, { kind: 'request_received', key: 'request_received', to: email, link: origin + '/login.dc.html', vars: { navn: name, menighet: church, epost: email }, related: r.id });
      /* Varsel til stab: ConnectHubs avsenderadresse og eventuelle ekstra adresser (valgfri e-post – kan slås av). Høyst 6 per time. */
      if (await allowAnon(ctx, 'notify:requests', 6, 3600)) {
        const c = mailConfig(ctx.env || {}), extra = (await ctx.backend.rpcAsServer('mail_notify_extra', {}).catch(() => [])) || [];
        const to = [...new Set([c && !c.error ? c.user : (ctx.deps.mailer && ctx.deps.mailer.sender), ...extra].filter(Boolean).map(x => String(x).toLowerCase()))];
        for (const t of to) await sendTemplated(ctx, { kind: 'request_notify', key: 'request_notify', to: t, link: origin + '/connecthub-admin.dc.html#/foresporsler', vars: { navn: name, menighet: church }, related: r.id, optional: true });
      }
    }
    return json({ ok: true });
  },
};
routes['request.form'].anonymous = true;
routes['request.submit'].anonymous = true;
