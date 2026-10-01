/* Hurtigbuffer for «hvem er jeg» (whoami), så sidene kan vises straks ved navigering i stedet for å vente på databasen.
   - Gjelder bare samme innlogging: nøkkelen er bruker + økt + sikkerhetsnivå (MFA). Ny innlogging = ny nøkkel.
   - Gir ingen tilgang: alle data og handlinger kontrolleres fortsatt av databasen (RLS) og serveren, og porten
     (auth-gate.js) kontrollerer svaret mot databasen like etter at siden er vist. Ved avvik stoppes eller lastes siden på nytt.
   - Fjernes ved utlogging. Ligger i localStorage som økten selv (ch.auth). */
const KEY = 'ch.me', MAX_AGE = 12 * 3600e3;

export const sessionKey = s => (s && s.userId && s.sessionId ? [s.userId, s.sessionId, s.aal || ''].join('|') : null);

export function readMe(s, now = Date.now()) {
  const k = sessionKey(s); if (!k) return null;
  try { const c = JSON.parse(localStorage.getItem(KEY)); return c && c.k === k && now - c.at < MAX_AGE && c.me ? c.me : null; } catch (e) { return null; }
}
export function writeMe(s, me, now = Date.now()) {
  const k = sessionKey(s); if (!k || !me) return;
  try { localStorage.setItem(KEY, JSON.stringify({ k, at: now, me })); } catch (e) {}
}
export function clearMe() { try { localStorage.removeItem(KEY); } catch (e) {} }

/* Samme innhold uavhengig av rekkefølge i listene (roller og menigheter). */
const canon = v => Array.isArray(v) ? v.map(canon).map(x => JSON.stringify(x)).sort().map(x => JSON.parse(x))
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const sameMe = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
