/* Media Lab – light/dark theme for pages built with dark inline styles.
   Dark is the default. In light mode, neutral UI colours in inline styles and pseudo-class rules
   are remapped at runtime; saturated colours, images, video and canvas are left alone.
   Elements inside [data-keep-color] (colour swatches) or [data-ml-theme] (self-themed pages) are skipped. */
(function () {
  if (window.MLTheme) return;
  var KEY = 'medialab.theme';
  var mode = 'dark'; try { mode = localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) {}
  var cl = function (v) { return Math.max(0, Math.min(255, Math.round(v))); };
  function mapRGB(r, g, b, a, prop) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), avg = (r + g + b) / 3;
    if (mx - mn <= 28) {
      if (/shadow/.test(prop) && avg < 80) return null;
      if (/^background/.test(prop) && a < 0.3 && avg > 150) return null;
      var G = 228 - (avg / 255) * 208, dr = r - avg, dg = g - avg, db = b - avg;
      if (Math.abs(dr) < 2 && Math.abs(dg) < 2 && Math.abs(db) < 2) { var k = G / 228; dr = 1.5 * k; dg = 0; db = -4.5 * k; }
      return [cl(G + dr), cl(G + dg), cl(G + db), a];
    }
    if (prop === 'color' || prop === 'caret-color') {
      var L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (L > 0.5) { var f = 0.36 / L; return [cl(r * f), cl(g * f), cl(b * f), a]; }
    }
    return null;
  }
  var cache = new Map();
  function mapValue(v, prop) {
    if (!v || v.indexOf('url(') >= 0 && !/gradient/.test(v)) return v;
    var key = prop + '|' + v, hit = cache.get(key); if (hit !== undefined) return hit;
    var out = v.replace(/rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|\b(white|black)\b/g, function (m, r, g, b, a, named) {
      if (named) { r = named === 'white' ? 255 : 0; g = b = r; }
      var al = a == null ? 1 : /%$/.test(a) ? parseFloat(a) / 100 : parseFloat(a);
      var res = mapRGB(+r, +g, +b, al, prop); if (!res) return m;
      return res[3] >= 1 ? 'rgb(' + res[0] + ', ' + res[1] + ', ' + res[2] + ')' : 'rgba(' + res[0] + ', ' + res[1] + ', ' + res[2] + ', ' + res[3] + ')';
    });
    if (cache.size > 6000) cache.clear(); cache.set(key, out); return out;
  }
  var EL = new WeakMap();
  function skip(el) {
    if (!el.closest || el.closest('[data-keep-color],[data-ml-theme]')) return true;
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) { var bi = e.style && e.style.backgroundImage; if (bi && bi.indexOf('url(') >= 0) return true; }
    return false;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || !el.style || !el.style.length || skip(el)) return;
    var st = el.style, rec = EL.get(el); if (!rec) { rec = {}; EL.set(el, rec); }
    for (var i = 0; i < st.length; i++) {
      var p = st[i], v = st.getPropertyValue(p);
      if (!/rgb|white|black/.test(v)) continue;
      var r = rec[p]; if (r && v === r.m) continue;
      var m = mapValue(v, p); if (m === v) { rec[p] = { o: v, m: v }; continue; }
      st.setProperty(p, m, st.getPropertyPriority(p));
      rec[p] = { o: v, m: st.getPropertyValue(p) };
    }
  }
  function walk(root) {
    if (root.nodeType !== 1) return;
    doEl(root);
    var all = root.querySelectorAll('[style]'); for (var i = 0; i < all.length; i++) doEl(all[i]);
  }
  var RU = new WeakMap(), seen = new WeakSet();
  function doSheets() {
    for (var s = 0; s < document.styleSheets.length; s++) {
      var sh = document.styleSheets[s], rules; try { rules = sh.cssRules; } catch (e) { continue; }
      if (!rules || (seen.has(sh) && sh.__mlN === rules.length)) continue;
      seen.add(sh); sh.__mlN = rules.length;
      for (var i = 0; i < rules.length; i++) {
        var ru = rules[i]; if (!ru.style || RU.has(ru) || /data-ml-theme/.test(ru.selectorText || '')) continue;
        var o = {};
        for (var j = 0; j < ru.style.length; j++) {
          var p = ru.style[j], v = ru.style.getPropertyValue(p); if (!/rgb|white|black/.test(v)) continue;
          var m = mapValue(v, p); if (m !== v) { o[p] = [v, ru.style.getPropertyPriority(p)]; ru.style.setProperty(p, m, o[p][1]); }
        }
        RU.set(ru, o);
      }
    }
  }
  function restoreAll() {
    var all = document.querySelectorAll('[style]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], rec = EL.get(el); if (!rec) continue;
      for (var p in rec) if (el.style.getPropertyValue(p) === rec[p].m && rec[p].m !== rec[p].o) el.style.setProperty(p, rec[p].o, el.style.getPropertyPriority(p));
      EL.delete(el);
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
      var rules; try { rules = document.styleSheets[s].cssRules; } catch (e) { continue; }
      for (var k = 0; k < rules.length; k++) { var o = RU.get(rules[k]); if (!o) continue; for (var q in o) rules[k].style.setProperty(q, o[q][0], o[q][1]); RU.delete(rules[k]); }
      seen.delete(document.styleSheets[s]);
    }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'attributes') doEl(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  });
  var timer = null;
  function page() {
    var lt = mode === 'light', de = document.documentElement;
    if (!document.getElementById('ml-theme-css')) { var cs = document.createElement('style'); cs.id = 'ml-theme-css'; cs.textContent = 'html[data-ml-mode="light"] [data-ml-star]{opacity:0 !important}'; (document.head || de).appendChild(cs); }
    de.setAttribute('data-ml-mode', mode);
    de.style.background = lt ? '#e4e1da' : '';
    de.style.colorScheme = lt ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="color-scheme"]'); if (meta) meta.setAttribute('content', lt ? 'light' : 'dark');
    if (document.body) document.body.style.background = lt ? '#e4e1da' : '';
  }
  function apply() {
    page(); if (!document.body) return;
    mo.disconnect(); clearInterval(timer);
    if (mode === 'light') {
      walk(document.body); doSheets();
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
      timer = setInterval(doSheets, 700);
    } else restoreAll();
  }
  function set(t) {
    t = t === 'light' ? 'light' : 'dark'; if (t === mode) return; mode = t;
    try { localStorage.setItem(KEY, t); } catch (e) {}
    apply(); window.dispatchEvent(new CustomEvent('medialab-theme', { detail: t }));
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) set(e.newValue); });
  window.MLTheme = { get mode() { return mode; }, set: set };
  /* floating light/dark switch, bottom right on every page (pages with their own switch mark their root with data-ml-theme) */
  var btn = null;
  function paintBtn() {
    if (!btn) return; var lt = mode === 'light';
    btn.title = btn.ariaLabel = lt ? 'Bytt til mørk modus' : 'Bytt til lys modus';
    if (window.MLI18N && window.MLI18N.lang === 'en') btn.title = btn.ariaLabel = lt ? 'Switch to dark mode' : 'Switch to light mode';
    btn.style.background = lt ? 'rgba(228,225,218,0.85)' : 'rgba(0,0,0,0.45)'; btn.style.color = lt ? '#4f4c46' : '#9d998f'; btn.style.borderColor = lt ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)';
  }
  function addBtn() {
    if (btn || !document.body || document.querySelector('[data-ml-theme]')) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('data-keep-color', '1'); btn.setAttribute('data-ml-theme-btn', '1');
    btn.style.cssText = 'position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147482000;width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid;border-radius:999px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;opacity:.75;transition:opacity .15s';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"></path></svg>';
    btn.onmouseenter = function () { btn.style.opacity = '1'; }; btn.onmouseleave = function () { btn.style.opacity = '.75'; };
    btn.onclick = function () { set(mode === 'light' ? 'dark' : 'light'); };
    document.body.appendChild(btn); paintBtn();
  }
  window.addEventListener('medialab-theme', paintBtn); window.addEventListener('medialab-lang', paintBtn);
  var tryBtn = function () { setTimeout(addBtn, 900); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryBtn); else tryBtn();
  /* internal links: no URL in the browser's status bar on hover */
  function hideHref(e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('download') || a.target === '_blank') return;
    var h = a.getAttribute('href'); if (!h || /^(#|javascript:|mailto:|tel:|blob:|data:)/i.test(h)) return;
    try { if (new URL(h, location.href).origin !== location.origin) return; } catch (x) { return; }
    a.setAttribute('data-ml-href', h); a.removeAttribute('href'); if (!a.hasAttribute('role')) a.setAttribute('role', 'link'); if (!a.hasAttribute('tabindex')) a.tabIndex = 0; a.style.cursor = 'pointer';
  }
  function go(e, a) { var h = a.getAttribute('data-ml-href'); if (!h) return; e.preventDefault(); if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) window.open(h, '_blank'); else location.href = h; }
  document.addEventListener('pointerover', hideHref, true); document.addEventListener('focusin', hideHref, true); document.addEventListener('touchstart', hideHref, { capture: true, passive: true });
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('a[data-ml-href]'); if (!a || a.hasAttribute('href') || e.defaultPrevented) return; go(e, a); });
  document.addEventListener('auxclick', function (e) { var a = e.button === 1 && e.target && e.target.closest && e.target.closest('a[data-ml-href]'); if (a && !a.hasAttribute('href')) go(e, a); });
  document.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; var a = e.target && e.target.closest && e.target.closest('a[data-ml-href]'); if (a && !a.hasAttribute('href')) go(e, a); });
  page();
  if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply);
})();
