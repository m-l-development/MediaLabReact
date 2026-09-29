/* Media Lab – app-ikon i fanen, web-app-manifest og «Åpne i web-app»-popup.
   Chrome/Edge/Android: bruker installasjonsprompten. iPhone/iPad (Safari): viser hvordan man legger til på Hjem-skjerm.
   «Ikke nå» skjuler popupen i 14 dager. MLPWA.show() viser den manuelt. */
(function () {
  if (window.MLPWA) return;
  var me = document.currentScript, base = me && me.src ? me.src.split('?')[0].replace(/[^\/]*$/, '') : './';
  var KEY = 'medialab.pwa.later', DAYS = 14, H = document.head || document.documentElement;
  function add(tag, at, sel) { if (sel && H.querySelector(sel)) return; var el = document.createElement(tag); for (var k in at) el.setAttribute(k, at[k]); H.appendChild(el); }
  add('link', { rel: 'manifest', href: base + 'manifest.webmanifest' }, 'link[rel="manifest"]');
  if (!H.querySelector('link[rel~="icon"]')) {
    add('link', { rel: 'icon', type: 'image/png', sizes: '64x64', href: base + 'images/favicon.png' });
    add('link', { rel: 'icon', type: 'image/svg+xml', href: base + 'images/favicon.svg' });
  }
  add('link', { rel: 'apple-touch-icon', href: base + 'images/apple-touch-icon.png' }, 'link[rel="apple-touch-icon"]');
  add('meta', { name: 'theme-color', content: '#000000' }, 'meta[name="theme-color"]');
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' }, 'meta[name="mobile-web-app-capable"]');
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }, 'meta[name="apple-mobile-web-app-capable"]');
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Media Lab' }, 'meta[name="apple-mobile-web-app-title"]');
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }, 'meta[name="apple-mobile-web-app-status-bar-style"]');

  var ua = navigator.userAgent || '';
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosSafari = ios && !/crios|fxios|edgios|opios/i.test(ua);
  var deferred = null, box = null;
  var T = function (s) { return window.MLI18N && MLI18N.t ? MLI18N.t(s) : s; };
  function later() { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < DAYS * 864e5; } catch (e) { return false; } }
  function snooze() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  function btn(label, primary) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = T(label);
    b.style.cssText = 'height:36px;padding:0 16px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;letter-spacing:0.04em;cursor:pointer;' +
      (primary ? 'border:1px solid #f3f1ec;background:#f3f1ec;color:#000000;' : 'border:1px solid rgba(255,255,255,0.22);background:transparent;color:#f3f1ec;');
    return b;
  }
  function hide() { if (!box) return; var b = box; box = null; b.style.opacity = '0'; b.style.transform = 'translateY(12px)'; setTimeout(function () { b.remove(); }, 260); }
  function show(iosMode) {
    if (box || standalone || !document.body) return;
    var narrow = window.matchMedia && matchMedia('(max-width: 560px)').matches;
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T('Media Lab som web-app'));
    box.style.cssText = 'position:fixed;left:20px;' + (narrow ? 'right:20px;bottom:88px;' : 'bottom:20px;width:380px;max-width:calc(100vw - 40px);') +
      'z-index:9998;display:flex;align-items:flex-start;gap:14px;padding:16px;border:1px solid rgba(255,255,255,0.16);border-radius:18px;background:rgba(12,12,12,0.95);' +
      '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 20px 50px rgba(0,0,0,0.5);color:#f3f1ec;font-family:Archivo,"Helvetica Neue",Helvetica,Arial,sans-serif;' +
      'opacity:0;transform:translateY(12px);transition:opacity 250ms ease,transform 250ms ease;';
    var img = document.createElement('img'); img.src = base + 'images/app-icon-192.png'; img.alt = ''; img.width = 56; img.height = 56;
    img.style.cssText = 'flex:0 0 56px;width:56px;height:56px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);';
    var col = document.createElement('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:10px;min-width:0;';
    var h = document.createElement('strong'); h.textContent = T('Media Lab som web-app'); h.style.cssText = 'font-size:14px;font-weight:700;line-height:1.3;';
    var p = document.createElement('span'); p.style.cssText = 'font-size:12.5px;line-height:1.5;color:#b3afa6;text-wrap:pretty;';
    p.textContent = T(iosMode ? 'Trykk på Del-knappen i Safari og velg «Legg til på Hjem-skjerm». Da åpnes Media Lab som egen app.' : 'Åpne Media Lab i eget vindu, med eget ikon på skrivebordet eller hjemskjermen.');
    var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    if (iosMode) { var ok = btn('OK', true); ok.onclick = function () { snooze(); hide(); }; row.appendChild(ok); }
    else {
      var go = btn('Åpne i web-app', true), no = btn('Ikke nå', false);
      go.onclick = function () {
        if (!deferred) { hide(); return; }
        var d = deferred; deferred = null; d.prompt();
        (d.userChoice || Promise.resolve({})).then(function (r) { if (!r || r.outcome !== 'accepted') snooze(); hide(); });
      };
      no.onclick = function () { snooze(); hide(); };
      row.appendChild(go); row.appendChild(no);
    }
    col.appendChild(h); col.appendChild(p); col.appendChild(row);
    box.appendChild(img); box.appendChild(col); document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (box) { box.style.opacity = '1'; box.style.transform = 'none'; } }); });
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (!standalone && !later()) setTimeout(function () { show(false); }, 2500);
  });
  window.addEventListener('appinstalled', function () { deferred = null; hide(); });
  if (iosSafari && !standalone && !later()) setTimeout(function () { show(true); }, 3000);
  window.MLPWA = {
    get canInstall() { return !!deferred || (iosSafari && !standalone); },
    get installed() { return standalone; },
    show: function () { if (deferred) show(false); else if (iosSafari) show(true); },
    hide: hide
  };
})();
