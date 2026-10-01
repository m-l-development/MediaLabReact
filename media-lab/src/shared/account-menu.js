/* Kontoknapp (nede til høyre, ved siden av tema-knappen) med navn, roller, varsler, personvern og utlogging. */
import { auth } from '../services/auth.js';
import { clearMyLocalData } from './local-user.js';
import { notifications as N, privacy, downloadJson } from '../services/community.js';
import { allowedViews, realView, setView, VIEW_LABEL } from './test-role.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ROLE = { developer: 'Developer', moderator: 'Moderator', church_admin: 'Admin' };
const when = d => new Date(d).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'nb-NO', { dateStyle: 'short', timeStyle: 'short' });

/* Ikoner for testrollene (samme strek som resten av appen). */
const ICON = {
  developer: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  admin: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  moderator: '<path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2v3l-3-3h-4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
};

/* me = slik grensesnittet ser brukeren (kan være testrolle); realMe = den ekte innloggingen. */
export function mountAccountMenu(me, realMe = me, testAllowed = false) {
  if (!me || document.querySelector('[data-ch-account]')) return;
  const dark = () => document.documentElement.getAttribute('data-ml-mode') !== 'light';
  const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('data-ch-account', '1'); btn.setAttribute('data-keep-color', '1');
  btn.title = btn.ariaLabel = T('Konto');
  const init = String(me.full_name || me.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  btn.textContent = init;
  const badge = document.createElement('span'); badge.setAttribute('data-ch-unread', '1');
  badge.style.cssText = 'position:absolute;top:-4px;right:-4px;min-width:15px;height:15px;padding:0 3px;border-radius:999px;background:#9b1c3c;color:#fff;font:700 9px/15px Archivo,Helvetica,sans-serif;display:none';
  const paint = () => { const d = dark(); btn.style.cssText = 'position:fixed;right:50px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147482000;width:30px;height:30px;padding:0;border-radius:999px;font:700 11px Archivo,Helvetica,sans-serif;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:.85;border:1px solid ' + (d ? 'rgba(255,255,255,.18);background:rgba(0,0,0,.45);color:#e9e7e2' : 'rgba(0,0,0,.14);background:rgba(228,225,218,.85);color:#3b3934'); };
  const paint0 = paint; const paintT = () => { paint0(); if (window.CH && window.CH.testRole) btn.style.boxShadow = '0 0 0 2px #2f4fd8'; };
  paintT(); window.addEventListener('medialab-theme', paintT);

  /* Varsler: hentes når siden er ferdig lastet (ikke i konkurranse med sidens egne data), når fanen blir synlig
     (høyst hvert halve minutt) og hvert 2. minutt. */
  let list = [], at = 0;
  const refresh = async () => { at = Date.now(); try { list = await N.list(); } catch (e) { return; } const n = list.filter(x => !x.read_at).length; badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = n ? 'block' : 'none'; };
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1));
  setTimeout(() => idle(refresh, { timeout: 3000 }), 800); setInterval(() => { if (!document.hidden) refresh(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - at > 30000) refresh(); });

  let menu = null;
  const close = () => { if (menu) { menu.remove(); menu = null; } };
  btn.onclick = () => {
    if (menu) { close(); return; }
    menu = document.createElement('div'); menu.setAttribute('data-ml-theme', '1'); menu.setAttribute('role', 'menu');
    menu.style.cssText = 'position:fixed;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));z-index:2147482001;width:300px;max-height:calc(100vh - 80px);overflow:auto;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:16px;background:#f3f1ec;color:#111;font:500 13px/1.45 Archivo,Helvetica,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.45)';
    const name = document.createElement('strong'); name.textContent = me.full_name || me.email;
    const mail = document.createElement('span'); mail.style.cssText = 'color:#5a5750;font-size:12px;word-break:break-all'; mail.textContent = me.email;
    const roles = (realMe.roles || []).map(r => ROLE[r.role] || r.role);
    const info = document.createElement('span'); info.style.cssText = 'color:#5a5750;font-size:12px';
    info.textContent = ([...new Set(roles)].join(', ') || T('Bruker')) + ((me.churches || []).length ? ' · ' + me.churches.map(c => c.name).join(', ') : '');
    const mk = (label, danger, light) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = T(label); b.style.cssText = 'height:34px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (danger ? 'border:1px solid #9b1c3c;background:transparent;color:#9b1c3c' : light ? 'border:1px solid rgba(0,0,0,.25);background:transparent;color:#111' : 'border:1px solid #111;background:#111;color:#f3f1ec'); return b; };
    const head = (t) => { const h = document.createElement('span'); h.style.cssText = 'margin-top:4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b675f'; h.textContent = T(t); return h; };

    const nbox = document.createElement('div'); nbox.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const showN = () => {
      nbox.textContent = '';
      if (!list.length) { const e = document.createElement('span'); e.style.cssText = 'color:#6b675f;font-size:12px'; e.textContent = T('Ingen varsler.'); nbox.appendChild(e); return; }
      for (const x of list.slice(0, 8)) {
        const it = document.createElement(x.link ? 'a' : 'div'); if (x.link) it.href = x.link;
        it.style.cssText = 'display:block;padding:7px 9px;border-radius:10px;text-decoration:none;color:#111;background:' + (x.read_at ? 'transparent' : 'rgba(155,28,60,.08)');
        const t = document.createElement('strong'); t.style.cssText = 'display:block;font-size:12.5px'; t.textContent = x.title;
        const b = document.createElement('span'); b.style.cssText = 'display:block;font-size:12px;color:#3b3934'; b.textContent = x.body || '';
        const d = document.createElement('span'); d.style.cssText = 'display:block;font-size:11px;color:#6b675f'; d.textContent = when(x.created_at);
        it.append(t, b, d); nbox.appendChild(it);
      }
      if (list.some(x => !x.read_at)) { const r = mk('Merk alle som lest', false, true); r.onclick = async () => { r.disabled = true; await N.markAllRead(list).catch(() => {}); await refresh(); showN(); }; nbox.appendChild(r); }
    };
    showN(); if (!at) refresh().then(() => { if (menu) showN(); });

    const out = mk('Logg ut', false), wipe = mk('Logg ut og fjern mine lokale data', true);
    out.onclick = async () => { out.disabled = true; await auth.signOut(); location.replace(auth.loginUrl()); };
    wipe.onclick = async () => {
      if (!confirm(T('Dette sletter dine prosjekter og innstillinger fra denne PC-en (ikke fra andre PC-er og ikke andres data). Videoer i prosjektmapper på PC-en blir ikke slettet. Fortsette?'))) return;
      wipe.disabled = true; await clearMyLocalData(); await auth.signOut(); location.replace(auth.loginUrl());
    };
    const exp = mk('Last ned mine data', false, true);
    exp.onclick = async () => { exp.disabled = true; try { downloadJson(await privacy.exportMine(), 'connecthub-mine-data.json'); } catch (e) { alert(T('Kunne ikke hente dataene. Prøv igjen.')); } exp.disabled = false; };
    const del = mk('Slett kontoen min', true);
    del.onclick = async () => {
      const v = prompt(T('Kontoen din slettes permanent: navn, e-post, medlemskap, roller, varsler og private filer. Bilder du har lagt i menighetens fellesmapper blir liggende uten navnet ditt. Prosjekter på denne PC-en slettes også. Skriv SLETT for å bekrefte.'));
      if (v !== 'SLETT') return;
      del.disabled = true;
      try { await privacy.deleteMe(); } catch (e) { alert(T(e && e.code === 'invalid' ? 'Kontoen kan ikke slettes nå. Er du den eneste Developer, må rollen først gis til en annen.' : 'Kontoen kunne ikke slettes. Prøv igjen.')); del.disabled = false; return; }
      await clearMyLocalData().catch(() => {}); await auth.signOut().catch(() => {}); location.replace(auth.loginUrl());
    };
    /* Testrolle: bare i utvikling/Preview, og bare roller lik eller lavere enn den ekte. */
    const views = testAllowed ? allowedViews(realMe) : [];
    let tbox = null;
    if (views.length > 1) {
      const cur = window.CH && window.CH.testRole || realView(realMe);
      tbox = document.createElement('div'); tbox.setAttribute('data-ch-testrole', '1'); tbox.style.cssText = 'display:flex;flex-direction:column;gap:2px';
      const th = head('Testrolle'); const sm = document.createElement('span'); sm.style.cssText = 'text-transform:none;letter-spacing:0;font-weight:600'; sm.textContent = ' (' + T('kun i Development/Preview') + ')'; th.appendChild(sm);
      tbox.appendChild(th);
      for (const v of views) {
        const on = v === cur, row = document.createElement('button'); row.type = 'button'; row.setAttribute('role', 'menuitemradio'); row.setAttribute('aria-checked', on ? 'true' : 'false');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:0;border-radius:10px;background:' + (on ? 'rgba(47,79,216,.10)' : 'transparent') + ';color:#111;font:600 13px Archivo,Helvetica,sans-serif;cursor:pointer;text-align:left';
        row.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f4fd8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[v] + '</svg><span style="flex:1"></span><span aria-hidden="true" style="width:14px;height:14px;border-radius:999px;border:2px solid ' + (on ? '#2f4fd8' : '#9a968d') + ';box-shadow:inset 0 0 0 2.5px #f3f1ec;background:' + (on ? '#2f4fd8' : 'transparent') + '"></span>';
        row.children[1].textContent = T(VIEW_LABEL[v]) + (v === realView(realMe) ? ' · ' + T('din rolle') : '');
        row.onclick = () => { if (!on) setView(v, realMe); };
        tbox.appendChild(row);
      }
      const note = document.createElement('p'); note.style.cssText = 'margin:6px 0 0;padding:8px 10px;border-radius:10px;background:#e8e6f8;color:#3b3770;font-size:11.5px;line-height:1.45';
      note.textContent = T('Bytt rolle for å teste ulike grensesnitt og tilgangsrettigheter. Dette påvirker ikke dine faktiske tilgangsrettigheter.');
      tbox.appendChild(note);
    }
    menu.append(name, mail, info, ...(tbox ? [tbox] : []), head('Varsler'), nbox, head('Konto'), out, wipe, head('Personvern'), exp, del);
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (menu && !menu.contains(e.target) && e.target !== btn) { close(); document.removeEventListener('pointerdown', h); } }), 0);
  };
  btn.appendChild(badge);
  document.body.appendChild(btn);
}
