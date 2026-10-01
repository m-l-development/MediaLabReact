/* Innlogging – leverandørnøytralt grensesnitt. Sidene bruker bare denne modulen.
   Tilgangstokenet speiles til cookien ch_at (Path=/, SameSite=Lax, Secure, levetid = tokenets) slik at sperren på
   serveren kan avvise sider uten gyldig innlogging. Cookien gir ingen tilgang til data alene – data og API-er sjekkes
   med RLS og på serveren. */
import { hasBackend } from './config.js';
import { supabaseAuth as A } from './adapters/supabase/auth.js';
import { clearMe } from './me-cache.js';

export const COOKIE = 'ch_at';
export const LOGIN_PATH = '/login.dc.html';

function writeCookie(s) {
  if (typeof document === 'undefined') return;
  const secs = s && s.accessToken && s.expiresAt ? Math.max(0, Math.floor(s.expiresAt - Date.now() / 1000)) : 0;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = secs > 0 ? `${COOKIE}=${s.accessToken}; Path=/; Max-Age=${secs}; SameSite=Lax${secure}` : `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

let watching = false;
function watch() { if (watching || !hasBackend()) return; watching = true; A.onChange((_ev, s) => writeCookie(s)); }

export const auth = {
  available: () => hasBackend(),
  async session() { if (!hasBackend()) return null; watch(); const s = await A.getSession(); writeCookie(s); return s; },
  signIn: (email, pw) => A.signIn(String(email || '').trim(), String(pw || '')),
  async signOut() { clearMe(); const r = await A.signOut(); writeCookie(null); return r; },
  /* Svarer alltid «ok» utad, så det ikke avsløres om e-posten finnes. */
  async requestPasswordReset(email) { await A.requestPasswordReset(String(email || '').trim(), location.origin + LOGIN_PATH + '?flow=recovery'); return { ok: true }; },
  completeFromUrl: url => A.completeFromUrl(url),
  setPassword: pw => A.setPassword(pw),
  mfaStatus: () => A.mfaStatus(),
  mfaEnroll: () => A.mfaEnroll(),
  mfaVerify: (id, code) => A.mfaVerify(id, code),
  loginUrl(next) { return LOGIN_PATH + (next ? '?next=' + encodeURIComponent(next) : ''); },
};

/* Bare interne stier godtas som «next», ellers forsiden. Hindrer åpen omdirigering. */
export function safeNext(v) {
  const s = String(v || '');
  return /^\/(?!\/)[^\s\\]*$/.test(s) && !s.startsWith(LOGIN_PATH) ? s : '/media-lab.dc.html';
}

export function passwordProblem(pw) {
  const s = String(pw || '');
  if (s.length < 10) return 'Passordet må ha minst 10 tegn.';
  if (!/[A-Za-zÆØÅæøå]/.test(s) || !/\d/.test(s)) return 'Passordet må ha både bokstaver og tall.';
  return null;
}
