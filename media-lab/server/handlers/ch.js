/* ConnectHub API (Web-standard: Request → Response). Leverandørnøytral; api/ch.js er bare en tynn inngang.
   Alle handlinger krever gyldig innlogging (Bearer-token, verifisert mot JWKS), unntatt de som er eksplisitt merket
   anonymous («Glemt passord» og forespørsel om konto, med grenser). Ingen cookies brukes, så
   forespørsler fra andre nettsteder (CSRF) kan ikke utføre handlinger. */
import { json, fail, readJson, bearer, UUID, EMAIL, dbError } from '../lib/http.js';
import { verifyToken } from '../lib/gate.js';
import { serverConfig, publicOrigin } from '../lib/backend.js';
import { supabaseServer } from '../adapters/supabase.js';
import { routes as fileRoutes } from './files.js';
import { routes as privacyRoutes } from './privacy.js';
import { routes as mailRoutes } from './mail.js';
import { routes as requestRoutes } from './requests.js';
import { mailer, sendTemplated, inviteLink } from '../lib/mail.js';

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256hex = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const newToken = () => { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const ROLES = ['user', 'church_admin', 'moderator', 'developer'];

const ROLE_NAME = { user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' };
/* Sender lenken. Med ConnectHubs e-post satt opp: engangslenke uten e-post fra Supabase (invite – eller magiclink hvis
   kontoen finnes), og velkomstmalen fra Mail-fanen. Ellers som før: leverandørens e-post (eller deps.deliver i tester).
   Feil i e-post gir svar uten å kaste – invitasjonen er lagret og kan sendes på nytt. */
async function deliver(ctx, email, token, inv) {
  const origin = publicOrigin(ctx.env, ctx.request.url);
  if (!origin) return { sent: false, error: 'no_public_origin' };
  const redirectTo = origin + '/login.dc.html?invite=' + token;
  if (!ctx.deps.deliver && mailer(ctx)) {
    try {
      let g;
      try { g = await ctx.backend.generateLink('invite', email, redirectTo); }
      catch (e) { if (e.status !== 422 && e.code !== 'email_exists') throw e; g = await ctx.backend.generateLink('magiclink', email, redirectTo); }
      const r = await sendTemplated(ctx, { kind: 'invite', key: 'welcome', to: email, link: inviteLink(origin, token, g.hashedToken, g.type),
        vars: { epost: email, menighet: (inv && inv.church_name) || '', rolle: ROLE_NAME[inv && inv.role] || '' }, related: (inv && inv.id) || null });
      return r.sent ? { sent: true, kind: g.type } : { sent: false, error: r.error };
    } catch (e) { return { sent: false, error: e.code || 'email_failed' }; }
  }
  try {
    const r = ctx.deps.deliver ? await ctx.deps.deliver(email, redirectTo) : await ctx.backend.sendInvite(email, redirectTo);
    return { sent: true, kind: r && r.kind };
  } catch (e) { return { sent: false, error: e.code || 'email_failed' }; }
}

const routes = {
  /* Ny invitasjon. Rettigheter (rolle, menighet, MFA) avgjøres av databasen med brukerens token. */
  async 'invite.create'(ctx) {
    const b = ctx.body, email = String(b.email || '').trim().toLowerCase(), role = String(b.role || ''), church = b.church_id || null;
    if (!EMAIL.test(email) || email.length > 254 || !ROLES.includes(role) || (church !== null && !UUID.test(church))) return fail('invalid');
    const token = newToken();
    const inv = await ctx.backend.rpcAsUser(ctx.token, 'create_invitation', { p_email: email, p_church: church, p_role: role, p_token_hash: await sha256hex(token), p_days: 7 });
    const mail = await deliver(ctx, email, token, inv);
    return json({ ok: true, invitation: inv, email_sent: mail.sent, email_error: mail.error || null });
  },
  /* Ny lenke til en ventende invitasjon (den gamle slutter å virke). */
  async 'invite.resend'(ctx) {
    if (!UUID.test(String(ctx.body.id || ''))) return fail('invalid');
    const token = newToken();
    const inv = await ctx.backend.rpcAsUser(ctx.token, 'reissue_invitation', { p_id: ctx.body.id, p_token_hash: await sha256hex(token) });
    const mail = await deliver(ctx, inv.email, token, inv);
    return json({ ok: true, invitation: inv, email_sent: mail.sent, email_error: mail.error || null });
  },
  /* Opprett bruker fra en forespørsel (Developer/Moderator med MFA – databasen avgjør, i én transaksjon via create_invitation).
     mode: 'new' (ny menighet), 'existing' (eksisterende menighet) eller 'none' (uten menighet – bare Developer/Moderator-roller).
     Velkomstmailen sendes som ved vanlige invitasjoner; feiler den, er invitasjonen likevel laget og kan sendes på nytt. */
  async 'request.approve'(ctx) {
    const b = ctx.body, mode = String(b.mode || ''), role = String(b.role || ''), church = b.church_id || null;
    if (!UUID.test(String(b.id || '')) || !['new', 'existing', 'none'].includes(mode) || !ROLES.includes(role) || (church !== null && !UUID.test(church))) return fail('invalid');
    const token = newToken();
    const inv = await ctx.backend.rpcAsUser(ctx.token, 'approve_account_request', { p_id: b.id, p_mode: mode, p_church_name: b.church_name ? String(b.church_name).slice(0, 100) : null, p_church: church, p_role: role, p_token_hash: await sha256hex(token) });
    const mail = await deliver(ctx, inv.email, token, inv);
    return json({ ok: true, invitation: inv, email_sent: mail.sent, email_error: mail.error || null });
  },
  /* Godkjenning: innlogget konto må ha bekreftet e-post lik invitasjonens (sjekkes i databasen). */
  async 'invite.accept'(ctx) {
    const token = String(ctx.body.token || '');
    if (!TOKEN_RE.test(token)) return fail('invitation_invalid');
    const u = await ctx.backend.getAuthUser(ctx.claims.sub);
    if (!u.email || !u.emailConfirmed) return fail('email_not_confirmed', 403);
    const r = await ctx.backend.rpcAsServer('accept_invitation', { p_token_hash: await sha256hex(token), p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_email: u.email });
    return r && r.ok ? json({ ok: true, role: r.role }) : fail((r && r.error) || 'invitation_invalid', 400);
  },
  ...fileRoutes,
  ...privacyRoutes,
  ...mailRoutes,
  ...requestRoutes,
};

export async function handle(request, env, deps = {}) {
  try {
    if (request.method !== 'POST') return fail('method_not_allowed', 405);
    const action = new URL(request.url).searchParams.get('a') || '';
    const route = Object.prototype.hasOwnProperty.call(routes, action) ? routes[action] : null;
    if (!route) return fail('unknown_action', 404);
    const cfg = serverConfig(env);
    if (cfg.error) return json({ ok: false, error: 'not_configured', detail: cfg.error }, 503);   /* bare navnet på feilen, aldri verdier */
    const backend = deps.backend || supabaseServer(cfg, deps.fetchFn);
    /* Handlinger før innlogging (eksplisitt merket, f.eks. «Glemt passord») får ingen token og ingen brukerrettigheter. */
    if (route.anonymous) return await route({ request, env, deps, cfg, backend, token: null, claims: null, body: await readJson(request) });
    const token = bearer(request);
    const v = await verifyToken(token, { env, fetchFn: deps.fetchFn });
    if (v.unavailable) return fail('unavailable', 503);
    if (!v.claims) return fail('unauthorized', 401);
    const body = route.raw ? null : await readJson(request);
    return await route({ request, env, deps, cfg, backend, token, claims: v.claims, body });
  } catch (e) {
    if (e && e.status && e.error) return fail(e.error, e.status);
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) return fail('upstream_timeout', 504);
    if (e && e.code) { const d = dbError(e); return fail(d.error, d.status); }
    return fail('server_error', 500);
  }
}
