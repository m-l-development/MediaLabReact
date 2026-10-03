/* E-post fra ConnectHub (leverandørnøytral). Maler: src/shared/mail-render.js (samme gjengivelse som forhåndsvisningen).
   Oppsett bare fra servermiljøet (aldri i kode, nettleser eller logg):
     CONNECTHUB_SMTP_HOST, CONNECTHUB_SMTP_PORT (465 eller 587), CONNECTHUB_SMTP_USER (avsenderadressen),
     CONNECTHUB_SMTP_PASSWORD (app-passord), CONNECTHUB_MAIL_FROM_NAME (valgfritt, standard «ConnectHub»).
   Uten fullstendig oppsett returnerer mailer() null, og kallerne bruker den eksisterende løsningen (Supabase sender e-posten).
   Lenker lages av serveren, settes bare inn i e-posten og lagres eller logges aldri. */
import { renderMail, DEFAULT_TEMPLATES, LOGO_CID, templateProblem } from '../../src/shared/mail-render.js';
import { DEFAULT_LOGO_PNG } from './mail-logo-default.js';
import { smtpMailer } from '../adapters/smtp.js';
import { EMAIL } from './http.js';

const clean = s => String(s || '').replace(/[\r\n<>"]/g, '').trim().slice(0, 60);

/* null = ikke satt opp; { error } = satt opp feil (bare navnet på feilen, aldri verdier); ellers oppsettet. */
export function mailConfig(env) {
  const host = String(env.CONNECTHUB_SMTP_HOST || '').trim(), user = String(env.CONNECTHUB_SMTP_USER || '').trim();
  const pass = String(env.CONNECTHUB_SMTP_PASSWORD || ''), port = Number(env.CONNECTHUB_SMTP_PORT || 465);
  if (!host && !user && !pass) return null;
  if (!/^[a-z0-9.-]{3,253}$/i.test(host)) return { error: 'smtp_host_invalid' };
  if (![465, 587].includes(port)) return { error: 'smtp_port_invalid' };
  if (!EMAIL.test(user)) return { error: 'smtp_user_invalid' };
  if (pass.length < 8) return { error: 'smtp_password_missing' };
  return { host, port, user, pass, fromName: clean(env.CONNECTHUB_MAIL_FROM_NAME) || 'ConnectHub' };
}

/* Postkassen som brukes: deps.mailer (tester og lokal filfangst), ellers SMTP fra miljøet, ellers null. */
export function mailer(ctx) {
  if (ctx.deps && ctx.deps.mailer) return ctx.deps.mailer;
  const c = mailConfig(ctx.env || {});
  return c && !c.error ? smtpMailer(c) : null;
}
/* For Mail-fanen: er utsending satt opp? Avsenderadressen er ikke hemmelig og vises for stab. */
export function mailStatus(ctx) {
  if (ctx.deps && ctx.deps.mailer) return { configured: true, sender: ctx.deps.mailer.sender || 'testpostkasse', error: null };
  const c = mailConfig(ctx.env || {});
  return { configured: !!(c && !c.error), sender: c && !c.error ? c.user : null, error: c && c.error ? c.error : null };
}

/* Lenker til vår innloggingsside. Koden (token_hash) verifiseres i nettleseren når brukeren trykker «Fortsett». */
export const recoveryLink = (origin, hash) => origin + '/login.dc.html?flow=recovery&token_hash=' + encodeURIComponent(hash) + '&type=recovery';
export const inviteLink = (origin, token, hash, type) => origin + '/login.dc.html?invite=' + encodeURIComponent(token) + '&token_hash=' + encodeURIComponent(hash) + '&type=' + encodeURIComponent(type);

/* Malen fra databasen (eller standard), med logo som innebygd vedlegg. */
async function prepare(ctx, key) {
  const s = await ctx.backend.rpcAsServer('mail_for_send', { p_key: key }).catch(() => null);
  const own = s && s.blocks ? { subject: s.subject, blocks: s.blocks } : null;
  const tpl = own && !templateProblem(own) ? own : DEFAULT_TEMPLATES[key];
  let logo = null;
  if (tpl.blocks.some(b => b.t === 'logo')) {
    if (s && s.logo_key) { try { logo = { content: Buffer.from(await ctx.backend.storageGet(s.logo_key)), contentType: s.logo_mime }; } catch (e) { logo = null; } }
    if (!logo) logo = { content: Buffer.from(DEFAULT_LOGO_PNG, 'base64'), contentType: 'image/png' };
  }
  return { tpl, logo };
}

/* Sender en mal og registrerer resultatet (uten lenke eller innhold). Kaster aldri: { sent, error }. */
/* Nøyaktig én mottaker: ingen komma, semikolon, vinkelparenteser, anførselstegn eller mellomrom (kan ellers gi flere). */
export const singleRecipient = s => /^[^@\s,;<>"'()]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/.test(String(s || ''));
/* optional: true for valgfrie e-poster (f.eks. varsler) – sendes ikke når mottakeren har slått dem av. Nødvendige e-poster
   (invitasjon, «Glemt passord», sikkerhet) sendes alltid. */
export async function sendTemplated(ctx, { kind, key, to, link, vars, related = null, actor = null, optional = false }) {
  const m = mailer(ctx);
  if (!m) return { sent: false, error: 'mail_not_configured' };
  if (!singleRecipient(to)) return { sent: false, error: 'invalid_recipient' };
  if (optional && (await ctx.backend.rpcAsServer('mail_optional_allowed', { p_email: to }).catch(() => false)) !== true) {
    await ctx.backend.rpcAsServer('register_mail', { p_kind: kind, p_template: key, p_to: to, p_related: related, p_actor: actor, p_status: 'skipped', p_error: 'opted_out' }).catch(() => {});
    return { sent: false, error: 'opted_out' };
  }
  let error = null;
  try {
    const { tpl, logo } = await prepare(ctx, key);
    const r = renderMail(tpl, { link, vars });
    await m.send({ to, subject: r.subject, html: r.html, text: r.text,
      attachments: logo ? [{ filename: 'medialab.' + (logo.contentType === 'image/jpeg' ? 'jpg' : 'png'), cid: LOGO_CID, content: logo.content, contentType: logo.contentType }] : [] });
  } catch (e) { error = String((e && (e.code || e.responseCode)) || 'email_failed').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60) || 'email_failed'; }
  await ctx.backend.rpcAsServer('register_mail', { p_kind: kind, p_template: key, p_to: to, p_related: related, p_actor: actor, p_status: error ? 'failed' : 'sent', p_error: error }).catch(() => {});
  return error ? { sent: false, error } : { sent: true };
}

/* Grenser for handlinger før innlogging. Nøkkelen hashes med en daglig salt fra servernøkkelen, så verken IP-adresser
   eller e-postadresser kan leses ut av tabellen. true = tillatt. Feil i telleren stopper handlingen (sikker side). */
export async function allowAnon(ctx, key, limit, windowSeconds) {
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(String(ctx.cfg.secretKey).slice(-24) + '|' + day + '|' + key);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
  try { return (await ctx.backend.rpcAsServer('anon_rate_hit', { p_key_hash: hash, p_limit: limit, p_window_seconds: windowSeconds })) === true; }
  catch (e) { return false; }
}
export const clientIp = request => String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'lokal').split(',')[0].trim().slice(0, 64);
