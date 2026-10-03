/* Supabase-implementasjon av innloggingsgrensesnittet i src/services/auth.js. Returnerer bare nøytrale typer. */
import { getClient } from './client.js';

/* sessionId/aal fra tokenet (uverifisert – brukes bare som nøkkel for hurtigbufferen i me-cache.js, aldri til tilgang). */
const claims = t => { try { return JSON.parse(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return {}; } };
const sess = s => { if (!s) return null; const c = claims(s.access_token); return { accessToken: s.access_token, expiresAt: s.expires_at, userId: s.user && s.user.id, email: s.user && s.user.email, sessionId: c.session_id || null, aal: c.aal || null }; };
/* Nettverksfeil (ingen svar fra serveren) får egen kode, så siden kan tilby «Prøv igjen» uten at lenken er brukt opp. */
const fail = e => e && (e.name === 'AuthRetryableFetchError' || e.status === 0 || e instanceof TypeError) ? { ok: false, error: 'network' }
  : { ok: false, error: e && (e.code || e.message) ? String(e.code || e.message) : 'ukjent' };

export const supabaseAuth = {
  async getSession() { const { data } = await getClient().auth.getSession(); return sess(data.session); },
  onChange(cb) { const { data } = getClient().auth.onAuthStateChange((ev, s) => cb(ev, sess(s))); return () => data.subscription.unsubscribe(); },
  async signIn(email, password) { const { error } = await getClient().auth.signInWithPassword({ email, password }); return error ? fail(error) : { ok: true }; },
  async signOut() { const { error } = await getClient().auth.signOut({ scope: 'global' }); if (error) await getClient().auth.signOut({ scope: 'local' }); return { ok: true }; },
  async requestPasswordReset(email, redirectTo) { const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo }); return error ? fail(error) : { ok: true }; },
  /* Fullfører innlogging fra e-postlenke (PKCE-kode, token_hash eller tokens i fragmentet). Returnerer lenketype. */
  async completeFromUrl(url) {
    const u = new URL(url), q = u.searchParams, h = new URLSearchParams(u.hash.replace(/^#/, '')), c = getClient().auth;
    if (q.get('error_description') || h.get('error_description')) return { ok: false, error: q.get('error_code') || h.get('error_code') || 'lenke_ugyldig' };
    try {
      if (q.get('code')) { const { error } = await c.exchangeCodeForSession(q.get('code')); return error ? fail(error) : { ok: true, type: q.get('flow') || 'recovery' }; }
      if (q.get('token_hash') && q.get('type')) { const { error } = await c.verifyOtp({ token_hash: q.get('token_hash'), type: q.get('type') }); return error ? fail(error) : { ok: true, type: q.get('type') }; }
      if (h.get('access_token') && h.get('refresh_token')) { const { error } = await c.setSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token') }); return error ? fail(error) : { ok: true, type: h.get('type') || 'magiclink' }; }
    } catch (e) { return fail(e); }   // f.eks. manglende PKCE-verifikator (lenken åpnet i en annen nettleser) eller nettverksfeil
    return { ok: true, type: null };
  },
  /* Logger ut alle andre økter for brukeren (denne beholdes) – brukes etter passordbytte. */
  async signOutOthers() { try { const { error } = await getClient().auth.signOut({ scope: 'others' }); return error ? fail(error) : { ok: true }; } catch (e) { return fail(e); } },
  async setPassword(password) { try { const { error } = await getClient().auth.updateUser({ password }); return error ? fail(error) : { ok: true }; } catch (e) { return fail(e); } },
  async mfaStatus() {
    const c = getClient().auth, [{ data: lvl }, { data: f }] = await Promise.all([c.mfa.getAuthenticatorAssuranceLevel(), c.mfa.listFactors()]);
    return { current: lvl && lvl.currentLevel, next: lvl && lvl.nextLevel, factors: ((f && f.totp) || []).filter(x => x.status === 'verified').map(x => ({ id: x.id, name: x.friendly_name || 'Autentiseringsapp' })) };
  },
  async mfaEnroll() {
    const c = getClient().auth, { data: f } = await c.mfa.listFactors();
    for (const x of (f && f.all) || []) if (x.factor_type === 'totp' && x.status !== 'verified') await c.mfa.unenroll({ factorId: x.id });
    const { data, error } = await c.mfa.enroll({ factorType: 'totp', friendlyName: 'ConnectHub' });
    return error ? fail(error) : { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  },
  async mfaVerify(factorId, code) {
    const c = getClient().auth, ch = await c.mfa.challenge({ factorId });
    if (ch.error) return fail(ch.error);
    const { error } = await c.mfa.verify({ factorId, challengeId: ch.data.id, code: String(code).replace(/\s/g, '') });
    return error ? fail(error) : { ok: true };
  },
};
