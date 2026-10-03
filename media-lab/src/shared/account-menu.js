/* Kontoknapp (nede til høyre, ved siden av tema-knappen). Hovedmenyen: navn, roller, Varsler (egen visning), E-postvarsler,
   «Logg ut» og «Konto og sikkerhet». Lokale data og sletting av konto ligger skjermet i egen visning, med bekreftelse. */
import { auth, passwordChecks, passwordProblem } from '../services/auth.js';
import { clearMyLocalData } from './local-user.js';
import { forgetAccount } from './saved-accounts.js';
import { notifications as N, privacy, downloadJson, emailPrefs } from '../services/community.js';
import { allowedViews, realView, setView, VIEW_LABEL } from './test-role.js';
import { dockButton, openOnly, onOtherOpen } from './dock.js';

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
  const paint = () => { const d = dark(); btn.style.cssText = 'position:relative;pointer-events:auto;order:2;flex:0 0 auto;width:30px;height:30px;padding:0;border-radius:999px;font:700 11px Archivo,Helvetica,sans-serif;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:.85;border:1px solid ' + (d ? 'rgba(255,255,255,.18);background:rgba(0,0,0,.45);color:#e9e7e2' : 'rgba(0,0,0,.14);background:rgba(228,225,218,.85);color:#3b3934'); };
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
    openOnly('account');
    menu = document.createElement('div'); menu.setAttribute('data-ml-theme', '1'); menu.setAttribute('role', 'menu');
    menu.style.cssText = 'position:fixed;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));z-index:2147482001;width:min(320px, calc(100vw - 24px));max-height:calc(100vh - 80px);overflow:auto;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:16px;background:#f3f1ec;color:#111;font:500 13px/1.45 Archivo,Helvetica,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.45)';
    const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; };
    const mk = (label, kind) => { const b = el('button', 'min-height:36px;padding:0 14px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (kind === 'danger' ? 'border:1px solid #9b1c3c;background:#9b1c3c;color:#fff' : kind === 'dangerline' ? 'border:1px solid #9b1c3c;background:transparent;color:#9b1c3c' : kind === 'light' ? 'border:1px solid rgba(0,0,0,.25);background:transparent;color:#111' : 'border:1px solid #111;background:#111;color:#f3f1ec'), T(label)); b.type = 'button'; return b; };
    const head = t => el('span', 'margin-top:4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b675f', T(t));
    const note = (t, css) => el('p', 'margin:0;color:#5a5750;font-size:12px;line-height:1.45;' + (css || ''), T(t));
    /* Rad som åpner en egen visning (Varsler, Konto og sikkerhet). */
    const nav = (label, extra, go) => { const b = el('button', 'display:flex;align-items:center;gap:8px;width:100%;min-height:38px;padding:6px 10px;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#fff;color:#111;font:600 13px Archivo,Helvetica,sans-serif;cursor:pointer;text-align:left'); b.type = 'button';
      b.append(el('span', 'flex:1', T(label))); if (extra) b.append(extra); b.append(el('span', 'color:#6b675f', '›')); b.onclick = go; return b; };
    const back = () => { const b = el('button', 'align-self:flex-start;padding:2px 0;border:0;background:transparent;color:#111;font:700 12.5px Archivo,Helvetica,sans-serif;cursor:pointer', '‹ ' + T('Tilbake')); b.type = 'button'; b.onclick = () => show('main'); return b; };

    /* ---------- Varsler ---------- */
    const showNotifications = () => {
      const box = el('div', 'display:flex;flex-direction:column;gap:6px'); box.setAttribute('data-ch-notifs', '1');
      const paint = () => {
        box.textContent = '';
        if (!list.length) { box.append(el('span', 'color:#6b675f;font-size:12px', T('Ingen varsler.'))); return; }
        for (const x of list.slice(0, 20)) {
          /* Trykk: merkes som lest, og åpner siden varselet gjelder (hvis det finnes en). Ingen andre handlinger. */
          const it = el('button', 'display:block;width:100%;padding:8px 10px;border:0;border-radius:10px;text-align:left;cursor:pointer;color:#111;font:inherit;background:' + (x.read_at ? 'transparent' : 'rgba(155,28,60,.08)')); it.type = 'button';
          it.setAttribute('data-ch-notif', x.read_at ? 'lest' : 'ny');
          const top = el('span', 'display:flex;gap:6px;align-items:center'); top.append(el('strong', 'flex:1;font-size:12.5px', x.title));
          if (!x.read_at) top.append(el('span', 'width:8px;height:8px;border-radius:999px;background:#9b1c3c', ''));
          it.append(top, el('span', 'display:block;font-size:12px;color:#3b3934', x.body || ''), el('span', 'display:block;font-size:11px;color:#6b675f', when(x.created_at) + (x.link ? ' · ' + T('Åpne') + ' ›' : '')));
          it.onclick = async () => { it.disabled = true; if (!x.read_at) await N.markRead(x.id).catch(() => {}); if (x.link) { close(); location.href = x.link; return; } await refresh(); paint(); };
          box.append(it);
        }
        if (list.some(x => !x.read_at)) { const r = mk('Merk alle som lest', 'light'); r.onclick = async () => { r.disabled = true; await N.markAllRead(list).catch(() => {}); await refresh(); paint(); }; box.append(r); }
      };
      paint(); refresh().then(() => { if (menu) paint(); });
      return [back(), head('Varsler'), box];
    };

    /* ---------- E-postvarsler (egen innstilling) ---------- */
    const emailBlock = () => {
      const pref = el('div', 'display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:12px;background:#fff;border:1px solid rgba(0,0,0,.12)'); pref.setAttribute('data-ch-emailpref', '1');
      const sw = el('button', 'display:flex;align-items:center;gap:10px;width:100%;padding:0;border:0;background:transparent;color:#111;font:600 13px Archivo,Helvetica,sans-serif;cursor:pointer;text-align:left'); sw.type = 'button';
      sw.setAttribute('role', 'switch'); sw.disabled = true;
      const state = el('span', 'min-width:24px;font-size:12px;color:#5a5750;text-align:right'), track = el('span'), knob = el('span'); track.setAttribute('aria-hidden', 'true'); track.append(knob);
      const paintSw = on => { sw.setAttribute('aria-checked', on ? 'true' : 'false'); state.textContent = T(on ? 'På' : 'Av');
        track.style.cssText = 'position:relative;width:34px;height:20px;border-radius:999px;flex:0 0 auto;transition:background .15s;background:' + (on ? '#2a9d8f' : '#b9b5ac');
        knob.style.cssText = 'position:absolute;top:2px;left:' + (on ? '16px' : '2px') + ';width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s'; };
      sw.append(el('span', 'flex:1', T('E-postvarsler')), state, track); paintSw(true);
      const addr = el('div', 'display:flex;flex-direction:column;gap:6px'); addr.setAttribute('data-ch-notifyaddr', '1');
      let prefs = { on: true, notify_email: null, account_email: realMe.email };
      const paintAddr = saved => {
        addr.textContent = '';
        const used = prefs.notify_email || prefs.account_email;
        const line = el('span', 'font-size:12px;color:#3b3934;word-break:break-all'); line.append(T('Sendes til') + ': ', el('b', '', used), prefs.notify_email ? '' : ' (' + T('kontoens adresse') + ')');
        const change = mk('Endre adresse', 'light'); change.style.alignSelf = 'flex-start';
        change.onclick = () => {
          addr.textContent = '';
          const inp = el('input', 'height:36px;padding:0 10px;border:1px solid rgba(0,0,0,.25);border-radius:10px;font:inherit;font-size:13px;background:#fff;color:#111'); inp.type = 'email'; inp.value = used; inp.maxLength = 254; inp.setAttribute('aria-label', T('E-postadresse for varsler'));
          const err = el('span', 'display:none;color:#9b1c3c;font-size:12px'); err.setAttribute('role', 'alert');
          const row = el('div', 'display:flex;gap:6px;flex-wrap:wrap'), save = mk('Lagre'), cancel = mk('Avbryt', 'light'), reset = mk('Bruk kontoens adresse', 'light');
          save.onclick = async () => {
            const v = inp.value.trim().toLowerCase();
            if (!/^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(v)) { err.textContent = T('Skriv en gyldig e-postadresse.'); err.style.display = 'block'; inp.focus(); return; }
            save.disabled = true;
            try { await emailPrefs.setAddress(v); prefs = { ...prefs, notify_email: v === String(prefs.account_email).toLowerCase() ? null : v }; paintAddr(true); }
            catch (e) { err.textContent = T(e && e.code === 'invalid' ? 'Skriv en gyldig e-postadresse.' : 'Adressen kunne ikke lagres. Prøv igjen.'); err.style.display = 'block'; save.disabled = false; }
          };
          reset.onclick = async () => { reset.disabled = true; try { await emailPrefs.setAddress(null); prefs = { ...prefs, notify_email: null }; paintAddr(true); } catch (e) { reset.disabled = false; } };
          cancel.onclick = () => paintAddr();
          inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); save.click(); } };
          row.append(save, cancel, ...(prefs.notify_email ? [reset] : []));
          addr.append(inp, err, row); inp.focus();
        };
        addr.append(line, change);
        if (saved) { const ok = el('span', 'padding:6px 8px;border-radius:8px;background:rgba(42,157,143,.15);color:#1d5c55;font-size:12px', T('Lagret. Valgfrie e-poster sendes nå til') + ' ' + used + '.'); ok.setAttribute('role', 'status'); addr.append(ok); }
      };
      paintAddr();
      const info = note('Av: du får ikke valgfrie e-poster, som varsler. Glemt passord og sikkerhetsmeldinger går alltid til kontoens adresse, og innloggingsadressen endres ikke.', 'font-size:11.5px;color:#6b675f');
      pref.append(sw, addr, info);
      emailPrefs.get().then(p => { if (p) { prefs = { ...prefs, ...p }; paintSw(p.on !== false); paintAddr(); } sw.disabled = false; })
        .catch(() => { pref.textContent = ''; pref.append(el('span', 'font-weight:600', T('E-postvarsler')), note('Krever totrinnsbekreftelse. Logg inn på nytt med koden fra autentiseringsappen for å endre e-postvarsler.', 'font-size:11.5px')); });
      sw.onclick = async () => { const on = sw.getAttribute('aria-checked') !== 'true'; sw.disabled = true; paintSw(on);
        try { await emailPrefs.set(on); prefs.on = on; } catch (e) { paintSw(!on); alert(T('Valget kunne ikke lagres. Prøv igjen.')); } sw.disabled = false; };
      return pref;
    };

    /* ---------- Konto og sikkerhet (skjermede handlinger) ---------- */
    const showAccount = () => {
      const exp = mk('Last ned mine data', 'light');
      exp.onclick = async () => { exp.disabled = true; try { downloadJson(await privacy.exportMine(), 'connecthub-mine-data.json'); } catch (e) { alert(T('Kunne ikke hente dataene. Prøv igjen.')); } exp.disabled = false; };
      const wipe = mk('Logg ut og fjern mine lokale data', 'light'); wipe.setAttribute('data-ch-wipe', '1'); wipe.onclick = () => show('wipe');
      const zone = el('div', 'display:flex;flex-direction:column;gap:6px;margin-top:6px;padding-top:10px;border-top:1px solid rgba(155,28,60,.25)');
      const del = mk('Slett kontoen min', 'dangerline'); del.setAttribute('data-ch-delete', '1'); del.onclick = () => show('delete');
      zone.append(el('span', 'font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9b1c3c', T('Faresone')), note('Sletting av kontoen kan ikke angres.'), del);
      const pwc = mk('Bytt passord', 'light'); pwc.setAttribute('data-ch-pwchange', '1'); pwc.onclick = () => show('password');
      return [back(), head('Konto og sikkerhet'), pwc, exp, note('Får du en kopi av opplysningene ConnectHub har om deg (JSON-fil).', 'font-size:11.5px'), wipe, note('Fjerner prosjekter og innstillinger lagret i denne nettleseren på denne enheten, og logger deg ut.', 'font-size:11.5px'), zone];
    };
    /* «Bytt passord» (alle roller): gammelt passord kontrolleres med en ny innlogging (også Supabase sitt krav om fersk
       innlogging), kode fra autentiseringsappen når kontoen har MFA (aal2 kreves), og andre enheter logges ut etterpå. */
    const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
    const pwInput = (label, ac) => {
      const wrap = el('label', 'display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#3b3934'); wrap.append(el('span', '', T(label)));
      const row = el('span', 'position:relative;display:flex');
      const i = el('input', 'flex:1;min-width:0;height:38px;padding:0 44px 0 10px;border:1px solid rgba(0,0,0,.25);border-radius:10px;font:inherit;font-size:14px;background:#fff;color:#111'); i.type = 'password'; i.autocomplete = ac; i.spellcheck = false; i.setAttribute('autocapitalize', 'off');
      const t = el('button', 'position:absolute;right:4px;top:50%;transform:translateY(-50%);width:34px;height:30px;border:0;border-radius:8px;background:transparent;cursor:pointer;color:#5a5750;display:flex;align-items:center;justify-content:center'); t.type = 'button'; t.setAttribute('data-pw-toggle', '1');
      const paint = () => { const on = i.type === 'text'; t.setAttribute('aria-pressed', on ? 'true' : 'false'); t.setAttribute('aria-label', T(on ? 'Skjul passord' : 'Vis passord')); t.title = t.getAttribute('aria-label'); t.innerHTML = EYE + (on ? '<path d="M4 4l16 16"/>' : '') + '</svg>'; };
      t.onclick = () => { i.type = i.type === 'password' ? 'text' : 'password'; paint(); }; paint();
      row.append(i, t); wrap.append(row); return { wrap, i };
    };
    const showPassword = () => {
      const old = pwInput('Gammelt passord', 'current-password'), n1 = pwInput('Nytt passord', 'new-password'), n2 = pwInput('Bekreft nytt passord', 'new-password');
      const codeWrap = el('label', 'display:none;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#3b3934'); codeWrap.append(el('span', '', T('Kode fra autentiseringsappen')));
      const code = el('input', 'height:38px;padding:0 10px;border:1px solid rgba(0,0,0,.25);border-radius:10px;font:inherit;font-size:14px;background:#fff;color:#111'); code.inputMode = 'numeric'; code.autocomplete = 'one-time-code'; code.maxLength = 7; codeWrap.append(code);
      let factor = null; auth.mfaStatus().then(st => { if (st && st.factors && st.factors.length) { factor = st.factors[0].id; codeWrap.style.display = 'flex'; } }).catch(() => {});
      const checks = el('ul', 'margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;font-size:12px'); checks.setAttribute('data-pw-checks', '1');
      const paintChecks = () => { checks.textContent = ''; for (const c of passwordChecks(n1.i.value, n2.i.value)) checks.append(el('li', 'color:' + (c.ok ? '#1d5c55' : '#6b675f'), (c.ok ? '✓ ' : '• ') + T(c.text))); };
      n1.i.oninput = n2.i.oninput = paintChecks; paintChecks();
      const err = el('p', 'display:none;margin:0;padding:6px 8px;border-radius:8px;background:rgba(155,28,60,.12);color:#9b1c3c;font-size:12px'); err.setAttribute('role', 'alert');
      const fail = t => { err.textContent = T(t); err.style.display = 'block'; };
      const go = mk('Bytt passord'), no = mk('Avbryt', 'light'); no.onclick = () => show('account');
      const ERR = { invalid_credentials: 'Det gamle passordet er feil.', same_password: 'Velg et annet passord enn det gamle.', weak_password: 'Passordet er for svakt.', over_request_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.', network: 'Fikk ikke kontakt med serveren. Prøv igjen.' };
      go.onclick = async () => {
        err.style.display = 'none';
        if (!old.i.value) return fail('Skriv det gamle passordet.');
        const p = passwordProblem(n1.i.value); if (p) return fail(p);
        if (n1.i.value !== n2.i.value) return fail('Passordene er ikke like.');
        if (factor && !/^\d{6}$/.test(code.value.replace(/\s/g, ''))) return fail('Skriv den 6-sifrede koden fra autentiseringsappen.');
        go.disabled = true; no.disabled = true;
        try {
          const r = await auth.signIn(realMe.email, old.i.value);
          if (!r.ok) return fail(ERR[r.error] || 'Passordet kunne ikke endres. Prøv igjen.');
          if (factor) { const v = await auth.mfaVerify(factor, code.value); if (!v.ok) return fail('Feil kode. Prøv igjen.'); }
          const u = await auth.setPassword(n1.i.value);
          if (!u.ok) return fail(ERR[u.error] || 'Passordet kunne ikke endres. Prøv igjen.');
          await auth.signOutOthers().catch(() => {}); await auth.session().catch(() => {});
          old.i.value = n1.i.value = n2.i.value = code.value = '';
          menu.textContent = ''; menu.setAttribute('data-ch-view', 'password-done');
          const ok = mk('Ferdig'); ok.onclick = () => show('main');
          const msg = el('p', 'margin:0;padding:8px 10px;border-radius:10px;background:rgba(42,157,143,.15);color:#1d5c55;font-size:12.5px', T('Passordet er endret. Du er fortsatt logget inn her, og andre enheter er logget ut.')); msg.setAttribute('role', 'status');
          menu.append(head('Bytt passord'), msg, ok);
        } finally { go.disabled = false; no.disabled = false; }
      };
      const form = el('div', 'display:flex;flex-direction:column;gap:8px'); form.setAttribute('data-ch-pwform', '1');
      form.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); go.click(); } };
      form.append(old.wrap, n1.wrap, n2.wrap, checks, codeWrap, err, go, no);
      return [back(), head('Bytt passord'), form];
    };
    const showWipe = () => {
      const go = mk('Fjern lokale data og logg ut', 'danger'), no = mk('Avbryt', 'light');
      go.onclick = async () => { go.disabled = true; no.disabled = true; await clearMyLocalData(); await auth.signOut(); location.replace(auth.loginUrl()); };
      no.onclick = () => show('account');
      return [head('Fjern lokale data?'), note('Dette fjernes fra denne nettleseren på denne enheten: prosjekter og innstillinger i verktøyene (for eksempel Photo Design og Motion Design). Du blir logget ut.'),
        note('Dette blir liggende: alt i ConnectHub (filer, menighet og konto), data på andre enheter og videoer i prosjektmapper på PC-en.'), go, no];
    };
    const showDelete = () => {
      const ok = el('input'); ok.type = 'checkbox'; ok.id = 'ch-del-ok';
      const lab = el('label', 'display:flex;gap:8px;align-items:flex-start;font-size:12.5px;font-weight:600;cursor:pointer'); lab.htmlFor = 'ch-del-ok'; lab.append(ok, el('span', '', T('Jeg forstår at kontoen min slettes permanent og ikke kan gjenopprettes.')));
      const go = mk('Slett kontoen permanent', 'danger'), no = mk('Avbryt', ''); go.disabled = true; go.style.opacity = '.45'; go.setAttribute('data-ch-delete-go', '1');
      ok.onchange = () => { go.disabled = !ok.checked; go.style.opacity = ok.checked ? '1' : '.45'; };
      no.onclick = () => show('account');
      go.onclick = async () => {
        if (!ok.checked) return;
        go.disabled = true; no.disabled = true;
        try { await privacy.deleteMe(); } catch (e) { alert(T(e && e.code === 'invalid' ? 'Kontoen kan ikke slettes nå. Er du den eneste Developer, må rollen først gis til en annen.' : 'Kontoen kunne ikke slettes. Prøv igjen.')); no.disabled = false; ok.onchange(); return; }
        forgetAccount(realMe.email); await clearMyLocalData().catch(() => {}); await auth.signOut().catch(() => {}); location.replace(auth.loginUrl());
      };
      return [head('Slette kontoen?'), note('Kontoen din slettes permanent: navn, e-post, medlemskap, roller, varsler og private filer. Bilder du har lagt i menighetens fellesmapper blir liggende uten navnet ditt. Prosjekter på denne enheten slettes også.'),
        lab, no, go];
    };

    /* ---------- Hovedmenyen ---------- */
    const showMain = () => {
      const name = el('strong', '', me.full_name || me.email);
      const mail = el('span', 'color:#5a5750;font-size:12px;word-break:break-all', me.email);
      const roles = (realMe.roles || []).map(r => ROLE[r.role] || r.role);
      const info = el('span', 'color:#5a5750;font-size:12px', ([...new Set(roles)].join(', ') || T('Bruker')) + ((me.churches || []).length ? ' · ' + me.churches.map(c => c.name).join(', ') : ''));
      const unread = list.filter(x => !x.read_at).length;
      const count = el('span', 'min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#9b1c3c;color:#fff;font:700 10.5px/18px Archivo,Helvetica,sans-serif;text-align:center;display:' + (unread ? 'inline-block' : 'none'), unread > 9 ? '9+' : String(unread));
      const out = mk('Logg ut'); out.setAttribute('data-ch-logout', '1');
      out.onclick = async () => { out.disabled = true; await auth.signOut(); location.replace(auth.loginUrl()); };
      /* E-postvarsler bare for Developer og Moderator (databasen avviser andre). */
      const staffRole = (realMe.roles || []).some(r => (r.role === 'developer' || r.role === 'moderator') && !r.church_id);
      return [name, mail, info, ...testBox(), nav('Varsler', count, () => show('notifications')), ...(staffRole ? [emailBlock()] : []), out, nav('Konto og sikkerhet', null, () => show('account'))];
    };
    /* Testrolle: bare i utvikling/Preview, og bare roller lik eller lavere enn den ekte. */
    const testBox = () => {
      const views = testAllowed ? allowedViews(realMe) : [];
      if (views.length <= 1) return [];
      const cur = window.CH && window.CH.testRole || realView(realMe);
      const tbox = el('div', 'display:flex;flex-direction:column;gap:2px'); tbox.setAttribute('data-ch-testrole', '1');
      const th = head('Testrolle'); th.append(el('span', 'text-transform:none;letter-spacing:0;font-weight:600', ' (' + T('kun i Development/Preview') + ')'));
      tbox.appendChild(th);
      for (const v of views) {
        const on = v === cur, row = document.createElement('button'); row.type = 'button'; row.setAttribute('role', 'menuitemradio'); row.setAttribute('aria-checked', on ? 'true' : 'false');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:0;border-radius:10px;background:' + (on ? 'rgba(47,79,216,.10)' : 'transparent') + ';color:#111;font:600 13px Archivo,Helvetica,sans-serif;cursor:pointer;text-align:left';
        row.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f4fd8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[v] + '</svg><span style="flex:1"></span><span aria-hidden="true" style="width:14px;height:14px;border-radius:999px;border:2px solid ' + (on ? '#2f4fd8' : '#9a968d') + ';box-shadow:inset 0 0 0 2.5px #f3f1ec;background:' + (on ? '#2f4fd8' : 'transparent') + '"></span>';
        row.children[1].textContent = T(VIEW_LABEL[v]) + (v === realView(realMe) ? ' · ' + T('din rolle') : '');
        row.onclick = () => { if (!on) setView(v, realMe); };
        tbox.appendChild(row);
      }
      const n = el('p', 'margin:6px 0 0;padding:8px 10px;border-radius:10px;background:#e8e6f8;color:#3b3770;font-size:11.5px;line-height:1.45', T('Bytt rolle for å teste ulike grensesnitt og tilgangsrettigheter. Dette påvirker ikke dine faktiske tilgangsrettigheter.'));
      tbox.appendChild(n);
      return [tbox];
    };
    const VIEWS = { main: showMain, notifications: showNotifications, account: showAccount, password: showPassword, wipe: showWipe, delete: showDelete };
    const show = v => { if (!menu) return; menu.textContent = ''; menu.setAttribute('data-ch-view', v); menu.append(...VIEWS[v]()); menu.scrollTop = 0; };
    document.body.appendChild(menu);
    show('main');
    if (!at) refresh().then(() => { if (menu && menu.getAttribute('data-ch-view') === 'main') show('main'); });
    setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (menu && !menu.contains(e.target) && e.target !== btn) { close(); document.removeEventListener('pointerdown', h); } }), 0);
  };
  btn.appendChild(badge);
  dockButton(btn, 'account');
  onOtherOpen('account', close);
}
