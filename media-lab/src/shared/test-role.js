/* Testrolle (rollebytter) – BARE i lokal utvikling og Vercel Preview mot connecthub-dev.
   Endrer bare hva grensesnittet viser («se siden som»). Den kan bare SENKE rollen (Developer → Admin/User,
   Admin → User) og gir aldri flere rettigheter: serveren og RLS bruker alltid den ekte innloggingen. */

export const VIEWS = ['developer', 'moderator', 'admin', 'user'];
const KEY = 'ch.testRole';
const DEV_REF = 'uatpdmhnwwjgzlxaucsx';

/* Tillatt bare for bygg mot utviklingsprosjektet, aldri i produksjon (to uavhengige kontroller). */
export const switcherAllowed = backend => !!backend && backend.target !== 'production' && backend.projectRef === DEV_REF;

const has = (me, role) => !!me && (me.roles || []).some(r => r.role === role);
export const realView = me => has(me, 'developer') ? 'developer' : has(me, 'moderator') ? 'moderator' : has(me, 'church_admin') ? 'admin' : 'user';
/* Hvilke visninger denne brukeren kan velge: bare roller man faktisk har (Developer dekker alle), pluss User. */
export function allowedViews(me) {
  const dev = has(me, 'developer'), list = [];
  if (dev) list.push('developer');
  if (dev || has(me, 'moderator')) list.push('moderator');
  if (dev || has(me, 'church_admin')) list.push('admin');
  return list.length ? [...list, 'user'] : [];
}

/* Returnerer «me» slik grensesnittet skal se den i valgt visning. Ugyldig/ikke tillatt valg → ekte «me». */
export function effectiveMe(me, view) {
  if (!me || !view || !allowedViews(me).includes(view) || view === realView(me)) return me;
  if (view === 'user') return { ...me, roles: [] };
  if (view === 'moderator') return { ...me, roles: [{ role: 'moderator', church_id: null }] };
  /* Admin-visning: egne admin-roller, ellers (for stab) som admin i menighetene man er medlem av. */
  const admins = (me.roles || []).filter(r => r.role === 'church_admin');
  const roles = admins.length ? admins : (me.churches || []).map(c => ({ role: 'church_admin', church_id: c.id }));
  return { ...me, roles };
}

export function readView() { try { return sessionStorage.getItem(KEY) || null; } catch (e) { return null; } }
export function setView(view, me) {
  try { if (!view || view === realView(me)) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, view); } catch (e) {}
  location.reload();
}

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
export const VIEW_LABEL = { developer: 'Developer', moderator: 'Moderator', admin: 'Admin', user: 'User' };

/* Tydelig indikator nederst på siden når testmodus er aktiv, med knapp tilbake til den ekte rollen. */
export function mountTestBanner(realMe, view) {
  if (document.querySelector('[data-ch-testbanner]')) return;
  const bar = document.createElement('div'); bar.setAttribute('data-ch-testbanner', '1'); bar.setAttribute('data-ml-theme', '1'); bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147482500;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 120px);padding:6px 6px 6px 14px;border-radius:999px;background:#2f4fd8;color:#fff;font:600 12px/1.3 Archivo,Helvetica,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4)';
  const txt = document.createElement('span'); txt.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  txt.textContent = T('Testmodus') + ': ' + T(VIEW_LABEL[view]) + ' · ' + T('rettighetene på serveren er uendret');
  const back = document.createElement('button'); back.type = 'button';
  back.style.cssText = 'flex:none;height:26px;padding:0 12px;border:0;border-radius:999px;background:#fff;color:#1d2a6b;font:700 12px Archivo,Helvetica,sans-serif;cursor:pointer';
  back.textContent = T('Tilbake til') + ' ' + T(VIEW_LABEL[realView(realMe)]);
  back.onclick = () => setView(null, realMe);
  bar.append(txt, back); document.body.appendChild(bar);
}
