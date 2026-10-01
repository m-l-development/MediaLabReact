/* ConnectHub API (Web-standard: Request → Response). Leverandørnøytral; api/ch.js er bare en tynn inngang.
   Alle handlinger krever gyldig innlogging (Bearer-token, verifisert mot JWKS). Ingen cookies brukes, så
   forespørsler fra andre nettsteder (CSRF) kan ikke utføre handlinger. */
import { json, fail, readJson, bearer, UUID, EMAIL, dbError } from '../lib/http.js';
import { verifyToken } from '../lib/gate.js';
import { serverConfig, publicOrigin } from '../lib/backend.js';
import { supabaseServer } from '../adapters/supabase.js';
import { routes as fileRoutes } from './files.js';
import { routes as privacyRoutes } from './privacy.js';

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256hex = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const newToken = () => { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const ROLES = ['user', 'church_admin', 'moderator', 'developer'];

/* Sender lenken (via leverandørens e-post, eller deps.deliver i tester). Feil i e-post gir svar uten å kaste. */
async function deliver(ctx, email, token) {
  const origin = publicOrigin(ctx.env, ctx.request.url);
  if (!origin) return { sent: false, error: 'no_public_origin' };
  const redirectTo = origin + '/login.dc.html?invite=' + token;
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
    const mail = await deliver(ctx, email, token);
    return json({ ok: true, invitation: inv, email_sent: mail.sent, email_error: mail.error || null });
  },
  /* Ny lenke til en ventende invitasjon (den gamle slutter å virke). */
  async 'invite.resend'(ctx) {
    if (!UUID.test(String(ctx.body.id || ''))) return fail('invalid');
    const token = newToken();
    const inv = await ctx.backend.rpcAsUser(ctx.token, 'reissue_invitation', { p_id: ctx.body.id, p_token_hash: await sha256hex(token) });
    const mail = await deliver(ctx, inv.email, token);
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
};

export async function handle(request, env, deps = {}) {
  try {
    if (request.method !== 'POST') return fail('method_not_allowed', 405);
    const action = new URL(request.url).searchParams.get('a') || '';
    const route = Object.prototype.hasOwnProperty.call(routes, action) ? routes[action] : null;
    if (!route) return fail('unknown_action', 404);
    const cfg = serverConfig(env);
    if (cfg.error) return json({ ok: false, error: 'not_configured', detail: cfg.error }, 503);   /* bare navnet på feilen, aldri verdier */
    const token = bearer(request);
    const v = await verifyToken(token, { env, fetchFn: deps.fetchFn });
    if (v.unavailable) return fail('unavailable', 503);
    if (!v.claims) return fail('unauthorized', 401);
    const body = route.raw ? null : await readJson(request);
    const backend = deps.backend || supabaseServer(cfg, deps.fetchFn);
    return await route({ request, env, deps, cfg, backend, token, claims: v.claims, body });
  } catch (e) {
    if (e && e.status && e.error) return fail(e.error, e.status);
    if (e && e.code) { const d = dbError(e); return fail(d.error, d.status); }
    return fail('server_error', 500);
  }
}
