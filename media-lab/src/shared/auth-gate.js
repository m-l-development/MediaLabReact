/* Innloggingsport for alle sider (kalles av mountPage før siden starter).
   - Uten gyldig økt: sendes til innloggingssiden med «next». (Sperren på serveren, middleware.js, gjør det samme før
     siden i det hele tatt leveres; denne porten dekker resten og lokal utvikling.)
   - Konto som ikke er koblet til en aktiv ConnectHub-bruker: sendes til innloggingssiden med forklaring.
   - Lokale data knyttes til brukeren (local-user.js) før noe verktøy åpner lagringen.
   - Bygg uten backend: blokkeres, unntatt i lokal utvikling (vite dev), der det vises et tydelig varsel. */
import { auth } from '../services/auth.js';
import { hasBackend } from '../services/config.js';
import { whoami } from '../services/data/me.js';
import { installLocalUser, legacyStatus, shouldAsk, rememberAnswer, adoptLegacy } from './local-user.js';
import { mountAccountMenu } from './account-menu.js';
import { withTimeout } from '../services/timeout.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);

function block(msg) {
  document.body.innerHTML = '';
  const d = document.createElement('div');
  d.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#000;color:#f3f1ec;font:500 15px/1.6 Archivo,Helvetica,Arial,sans-serif;text-align:center';
  d.textContent = T(msg); document.body.appendChild(d);
}

function devBanner() {
  const b = document.createElement('div');
  b.style.cssText = 'position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:2147483000;padding:4px 12px;border-radius:999px;background:#9b1c3c;color:#fff;font:700 11px Archivo,Helvetica,sans-serif;pointer-events:none';
  b.textContent = T('Lokal utvikling uten innlogging – ikke publiser dette bygget');
  document.body.appendChild(b);
}

/* Spør én gang per bruker og PC om eierløse data fra før innlogging skal knyttes til brukeren. */
async function askLegacy(me) {
  if (!shouldAsk()) return;
  const st = await legacyStatus();
  if (!st.available) return;
  await new Promise(done => {
    const wrap = document.createElement('div'); wrap.setAttribute('data-ml-theme', '1'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.7);font-family:Archivo,Helvetica,Arial,sans-serif';
    const box = document.createElement('div');
    box.style.cssText = 'width:min(460px,100%);display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:18px;background:#f3f1ec;color:#111;box-shadow:0 20px 60px rgba(0,0,0,.5)';
    const h = document.createElement('strong'); h.style.cssText = 'font-size:16px'; h.textContent = T('Prosjekter fra før innlogging');
    const p = document.createElement('p'); p.style.cssText = 'margin:0;font-size:13.5px;line-height:1.55;color:#3b3934';
    p.textContent = T('Denne PC-en har prosjekter og innstillinger som ble laget før innlogging ble innført. Vil du knytte dem til kontoen din? De blir liggende der de er – ingenting flyttes, kopieres eller slettes. Andre som logger inn på denne PC-en, vil da ikke se dem.');
    const note = document.createElement('p'); note.style.cssText = 'margin:0;font-size:12.5px;color:#6b675f';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
    const mk = (label, primary) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = T(label); b.style.cssText = 'height:36px;padding:0 16px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (primary ? 'border:1px solid #111;background:#111;color:#f3f1ec' : 'border:1px solid rgba(0,0,0,.25);background:transparent;color:#111'); return b; };
    const yes = mk('Knytt til meg', true), later = mk('Ikke nå', false), no = mk('De er ikke mine', false);
    const close = () => { wrap.remove(); done(); };
    yes.onclick = async () => {
      yes.disabled = true; const r = await adoptLegacy();
      if (r.ok) { note.textContent = T('Prosjektene er knyttet til kontoen din.'); setTimeout(close, 900); return; }
      note.textContent = r.error === 'konflikt' ? T('Du har allerede egne prosjekter på denne PC-en, så de gamle kan ikke knyttes automatisk. Ingenting er endret.') : T('Kunne ikke knytte prosjektene. Ingenting er endret.');
      yes.disabled = false; rememberAnswer('konflikt');
    };
    later.onclick = close;
    no.onclick = () => { rememberAnswer('nei'); close(); };
    row.append(yes, later, no); box.append(h, p, note, row); wrap.appendChild(box); document.body.appendChild(wrap); yes.focus();
  });
}

/* Returnerer innlogget bruker (eller null i lokal utvikling uten backend). Omdirigerer ellers – løses aldri da. */
export async function ensureLoggedIn() {
  if (!hasBackend()) {
    if (import.meta.env && import.meta.env.DEV) { devBanner(); return null; }
    block('ConnectHub er ikke konfigurert for dette bygget. Kontakt administrator.');
    return new Promise(() => {});
  }
  const here = location.pathname + location.search + location.hash;
  let s; try { s = await withTimeout(auth.session(), 20000); } catch (e) { if (e && e.code === 'timeout') { block('Kunne ikke kontakte ConnectHub. Sjekk nettforbindelsen og last siden på nytt.'); return new Promise(() => {}); } s = null; }
  if (!s) { location.replace(auth.loginUrl(here)); return new Promise(() => {}); }
  let me = null;
  try { me = await whoami(); } catch (e) { me = undefined; }
  if (me === undefined) { block('Kunne ikke kontakte ConnectHub. Sjekk nettforbindelsen og last siden på nytt.'); return new Promise(() => {}); }
  if (!me) { location.replace(auth.loginUrl(here) + '&reason=notlinked'); return new Promise(() => {}); }
  try { sessionStorage.removeItem('ch.loop'); } catch (e) {}
  installLocalUser(me.id);
  window.CH = Object.freeze({ me });
  await askLegacy(me);
  mountAccountMenu(me);
  return me;
}
