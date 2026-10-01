/* Kontoknapp (nede til høyre, ved siden av tema-knappen) med navn, roller og utlogging. */
import { auth } from '../services/auth.js';
import { clearMyLocalData } from './local-user.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ROLE = { developer: 'Developer', moderator: 'Moderator', church_admin: 'Admin' };

export function mountAccountMenu(me) {
  if (!me || document.querySelector('[data-ch-account]')) return;
  const dark = () => document.documentElement.getAttribute('data-ml-mode') !== 'light';
  const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('data-ch-account', '1'); btn.setAttribute('data-keep-color', '1');
  btn.title = btn.ariaLabel = T('Konto');
  const init = String(me.full_name || me.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  btn.textContent = init;
  const paint = () => { const d = dark(); btn.style.cssText = 'position:fixed;right:50px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147482000;width:30px;height:30px;padding:0;border-radius:999px;font:700 11px Archivo,Helvetica,sans-serif;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:.85;border:1px solid ' + (d ? 'rgba(255,255,255,.18);background:rgba(0,0,0,.45);color:#e9e7e2' : 'rgba(0,0,0,.14);background:rgba(228,225,218,.85);color:#3b3934'); };
  paint(); window.addEventListener('medialab-theme', paint);
  let menu = null;
  const close = () => { if (menu) { menu.remove(); menu = null; } };
  btn.onclick = () => {
    if (menu) { close(); return; }
    menu = document.createElement('div'); menu.setAttribute('data-ml-theme', '1'); menu.setAttribute('role', 'menu');
    menu.style.cssText = 'position:fixed;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));z-index:2147482001;width:270px;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:16px;background:#f3f1ec;color:#111;font:500 13px/1.45 Archivo,Helvetica,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.45)';
    const name = document.createElement('strong'); name.textContent = me.full_name || me.email;
    const mail = document.createElement('span'); mail.style.cssText = 'color:#5a5750;font-size:12px;word-break:break-all'; mail.textContent = me.email;
    const roles = (me.roles || []).map(r => ROLE[r.role] || r.role);
    const info = document.createElement('span'); info.style.cssText = 'color:#5a5750;font-size:12px';
    info.textContent = (roles.length ? roles.join(', ') : T('Bruker')) + ((me.churches || []).length ? ' · ' + me.churches.map(c => c.name).join(', ') : '');
    const mk = (label, danger) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = T(label); b.style.cssText = 'height:34px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (danger ? 'border:1px solid #9b1c3c;background:transparent;color:#9b1c3c' : 'border:1px solid #111;background:#111;color:#f3f1ec'); return b; };
    const out = mk('Logg ut', false), wipe = mk('Logg ut og fjern mine lokale data', true);
    out.onclick = async () => { out.disabled = true; await auth.signOut(); location.replace(auth.loginUrl()); };
    wipe.onclick = async () => {
      if (!confirm(T('Dette sletter dine prosjekter og innstillinger fra denne PC-en (ikke fra andre PC-er og ikke andres data). Videoer i prosjektmapper på PC-en blir ikke slettet. Fortsette?'))) return;
      wipe.disabled = true; await clearMyLocalData(); await auth.signOut(); location.replace(auth.loginUrl());
    };
    menu.append(name, mail, info, out, wipe); document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (menu && !menu.contains(e.target) && e.target !== btn) { close(); document.removeEventListener('pointerdown', h); } }), 0);
  };
  document.body.appendChild(btn);
}
