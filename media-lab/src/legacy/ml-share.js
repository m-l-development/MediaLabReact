/* Delt mappe mellom verktøyene: send, importer, kopier og lim inn. Lagres lokalt i nettleseren (IndexedDB). */
(function () {
  if (window.MLShare) return;
  var DB = 'medialab-share', ST = 'items', MAX_ITEMS = 60, MAX_SIZE = 2e9;
  var T = function (s) { return window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s; };
  var OK = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac|ogg|webm|flac))$/;
  var kindOf = function (t) { return /^image\//.test(t) ? 'image' : /^video\//.test(t) ? 'video' : /^audio\//.test(t) ? 'audio' : ''; };
  var deploy = /^[a-z0-9-]+\.dc\.html$/.test(decodeURIComponent(location.pathname.split('/').pop() || ''));
  var APPS = [
    { k: 'thumb', name: 'Thumbnail Studio', url: deploy ? '/thumbnailstudio' : 'Thumbnail Studio.dc.html', accept: ['image'] },
    { k: 'photo', name: 'Photo design', url: deploy ? '/photodesign' : 'Photo Design.dc.html', accept: ['image'] },
    { k: 'motion', name: 'Motion design', url: deploy ? '/motiondesign' : 'Motion Design.dc.html', accept: ['image', 'video', 'audio'] },
    { k: 'isolate', name: 'Isolate Subject', url: deploy ? '/isolate' : 'Isolate Subject.dc.html', accept: ['image'] },
    { k: 'mockups', name: 'Mockups', url: deploy ? '/mockup' : 'Mockups.dc.html', accept: ['image'] }
  ];
  var dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(function (res, rej) { var r = indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(ST, { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return dbp; }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(ST, mode), s = t.objectStore(ST), q = fn(s); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  function thumbOf(blob) {
    if (kindOf(blob.type) !== 'image') return Promise.resolve('');
    return new Promise(function (res) { var u = URL.createObjectURL(blob), im = new Image(); im.onload = function () { try { var s = 240 / Math.max(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/webp', 0.8)); } catch (e) { res(''); } URL.revokeObjectURL(u); }; im.onerror = function () { URL.revokeObjectURL(u); res(''); }; im.src = u; });
  }
  function clean(n) { return String(n || 'Fil').replace(/[\u0000-\u001f<>:"\/\\|?*]+/g, ' ').trim().slice(0, 120) || 'Fil'; }
  async function put(blob, name, from) {
    if (!blob || !OK.test(blob.type || '') || blob.size > MAX_SIZE) throw new Error('type');
    var id = 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), th = await thumbOf(blob);
    await tx('readwrite', function (s) { return s.put({ id: id, name: clean(name), type: blob.type, size: blob.size, from: String(from || '').slice(0, 40), created: Date.now(), thumb: th, blob: blob }); });
    var all = await list(); if (all.length > MAX_ITEMS) await Promise.all(all.slice(MAX_ITEMS).map(function (x) { return del(x.id); }));
    return id;
  }
  function list() { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return y.created - x.created; }); }); }
  function get(id) { return tx('readonly', function (s) { return s.get(id); }); }
  function del(id) { return tx('readwrite', function (s) { return s.delete(id); }); }
  async function toPng(blob) {
    if (blob.type === 'image/png') return blob; var u = URL.createObjectURL(blob), im = new Image(); im.src = u; await im.decode();
    var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); URL.revokeObjectURL(u);
    return new Promise(function (r) { c.toBlob(r, 'image/png'); });
  }
  async function copy(blob) {
    if (kindOf(blob.type) !== 'image' || !navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(blob) })]); return true; } catch (e) { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await toPng(blob) })]); return true; } catch (e2) { return false; } }
  }
  function download(blob, name) { var a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = clean(name); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }

  /* ---------- enkel modal ---------- */
  var cur = null;
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.setAttribute('style', css); if (txt != null) e.textContent = T(txt); return e; }
  var BTN = 'height:38px; padding:0 16px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:border-color .15s ease, background-color .15s ease;';
  var BTNP = 'height:38px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000; font:inherit; font-size:13px; font-weight:700; cursor:pointer;';
  function hov(b, on, off) { b.addEventListener('pointerenter', function () { b.style.borderColor = on; }); b.addEventListener('pointerleave', function () { b.style.borderColor = off; }); }
  function close() { if (!cur) return; var c = cur; cur = null; c.style.opacity = '0'; setTimeout(function () { c.remove(); }, 160); document.removeEventListener('keydown', esc, true); }
  function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function modal(title, sub) {
    close(); var o = el('div', 'position:fixed; inset:0; z-index:2147480000; background:rgba(0,0,0,0.62); display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; transition:opacity .16s ease; font-family:Archivo, system-ui, sans-serif; color:#f3f1ec;');
    var box = el('div', 'width:min(560px, 100%); max-height:min(80vh, 720px); display:flex; flex-direction:column; gap:14px; padding:22px; border:1px solid #2b2b2b; border-radius:18px; background:#0e0e0e; box-shadow:0 30px 80px rgba(0,0,0,0.6); overflow:auto; transform:translateY(8px) scale(0.98); transition:transform .18s ease;');
    var hd = el('div', 'display:flex; align-items:flex-start; justify-content:space-between; gap:12px;'), tt = el('div', 'display:flex; flex-direction:column; gap:4px;');
    tt.appendChild(el('span', 'font-size:12px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase;', title)); if (sub) tt.appendChild(el('span', 'font-size:12.5px; line-height:1.5; color:#9d998f;', sub));
    var x = el('button', 'width:32px; height:32px; flex:0 0 auto; border:1px solid #2b2b2b; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:16px; cursor:pointer;', '×'); x.setAttribute('aria-label', T('Lukk')); x.onclick = close;
    hd.appendChild(tt); hd.appendChild(x); box.appendChild(hd); o.appendChild(box);
    o.addEventListener('pointerdown', function (e) { if (e.target === o) close(); });
    document.body.appendChild(o); requestAnimationFrame(function () { o.style.opacity = '1'; box.style.transform = 'none'; }); cur = o; document.addEventListener('keydown', esc, true);
    return box;
  }
  function toast(msg) { var t = el('div', 'position:fixed; left:50%; bottom:26px; transform:translateX(-50%); z-index:2147480001; padding:10px 16px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font-family:Archivo, system-ui, sans-serif; font-size:13px; box-shadow:0 10px 30px rgba(0,0,0,0.5); transition:opacity .2s ease;', msg); document.body.appendChild(t); setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 250); }, 2200); }

  /* send et resultat videre */
  function send(blob, name, from) {
    if (!blob) return; var k = kindOf(blob.type), box = modal('Send eller del', 'Åpne resultatet i et annet verktøy, kopier det eller legg det i den delte mappen.');
    if (k === 'image') { var u = URL.createObjectURL(blob), pv = el('div', 'height:180px; border-radius:12px; background:#1a1a1a url("' + u + '") center/contain no-repeat;'); box.appendChild(pv); }
    box.appendChild(el('span', 'font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:#6f6b64;', 'Åpne i'));
    var g = el('div', 'display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px;');
    APPS.filter(function (a) { return a.k !== from && a.accept.indexOf(k) >= 0; }).forEach(function (a) {
      var b = el('button', BTN + ' height:46px; text-align:left;', a.name); hov(b, '#e9e7e2', '#2b2b2b');
      b.onclick = async function () { b.disabled = true; try { var id = await put(blob, name, from); location.href = a.url + '?import=' + encodeURIComponent(id); } catch (e) { toast('Kunne ikke sende filen.'); b.disabled = false; } };
      g.appendChild(b);
    });
    box.appendChild(g);
    var row = el('div', 'display:flex; flex-wrap:wrap; gap:8px; padding-top:4px;');
    if (k === 'image') { var c = el('button', BTNP, 'Kopier bilde'); c.onclick = async function () { toast(await copy(blob) ? 'Bildet er kopiert. Lim inn med Ctrl+V.' : 'Nettleseren tillot ikke kopiering.'); }; row.appendChild(c); }
    var s = el('button', BTN, 'Legg i delt mappe'); hov(s, '#e9e7e2', '#2b2b2b'); s.onclick = async function () { try { await put(blob, name, from); toast('Lagt i den delte mappen.'); close(); } catch (e) { toast('Kunne ikke lagre filen.'); } }; row.appendChild(s);
    var d = el('button', BTN, 'Last ned'); hov(d, '#e9e7e2', '#2b2b2b'); d.onclick = function () { download(blob, name); }; row.appendChild(d);
    box.appendChild(row);
  }
  /* velg fra delt mappe */
  async function pick(onPick, opt) {
    opt = opt || {}; var acc = opt.accept || ['image'], box = modal('Delt mappe', 'Filer du har sendt fra de andre verktøyene. Trykk på en fil for å bruke den.');
    var g = el('div', 'display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:10px;'); box.appendChild(g);
    var items = []; try { items = (await list()).filter(function (x) { return acc.indexOf(kindOf(x.type)) >= 0; }); } catch (e) {}
    if (!items.length) { g.appendChild(el('span', 'grid-column:1 / -1; font-size:13px; line-height:1.5; color:#9d998f;', 'Mappen er tom. Bruk «Send» eller «Legg i delt mappe» i et annet verktøy.')); return; }
    items.forEach(function (x) {
      var cell = el('div', 'position:relative; display:flex; flex-direction:column; gap:6px;');
      var b = el('button', 'aspect-ratio:1; width:100%; padding:0; border:1px solid #2b2b2b; border-radius:10px; background:#1a1a1a ' + (x.thumb ? 'url("' + x.thumb + '") center/contain no-repeat' : '') + '; color:#9d998f; font:inherit; font-size:12px; cursor:pointer; transition:border-color .15s ease;', x.thumb ? '' : kindOf(x.type) === 'video' ? 'Video' : 'Lyd');
      hov(b, '#e9e7e2', '#2b2b2b'); b.onclick = async function () { var it = await get(x.id); close(); if (it && it.blob) onPick(it.blob, it.name); };
      var rm = el('button', 'position:absolute; top:5px; right:5px; width:24px; height:24px; border:0; border-radius:999px; background:rgba(0,0,0,0.72); color:#f3f1ec; font:inherit; font-size:13px; cursor:pointer;', '×'); rm.setAttribute('aria-label', T('Fjern'));
      rm.onclick = async function (e) { e.stopPropagation(); await del(x.id); cell.remove(); };
      cell.appendChild(b); cell.appendChild(rm); cell.appendChild(el('span', 'font-size:11.5px; color:#c9c5bc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;', x.name)); g.appendChild(cell);
    });
  }
  /* ta imot: ?import=id og lim inn (Ctrl+V) */
  function receive(fn, opt) {
    opt = opt || {}; var acc = opt.accept || ['image'];
    var qs = new URLSearchParams(location.search), id = qs.get('import');
    if (id && /^s-[a-z0-9]+$/.test(id)) { qs.delete('import'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash); get(id).then(function (it) { if (it && it.blob && acc.indexOf(kindOf(it.type)) >= 0) fn(it.blob, it.name); }).catch(function () {}); }
    var onPaste = function (e) {
      var t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable), cd = e.clipboardData; if (!cd) return;
      var files = []; for (var i = 0; i < cd.items.length; i++) { var it = cd.items[i]; if (it.kind === 'file') { var f = it.getAsFile(); if (f && acc.indexOf(kindOf(f.type)) >= 0) files.push(f); } }
      if (!files.length || (typing && !files.length)) return; if (opt.when && !opt.when()) return;
      e.preventDefault(); files.forEach(function (f) { fn(f, f.name && f.name !== 'image.png' ? f.name : T('Innlimt bilde') + '.png'); });
    };
    if (opt.paste === false) return function () {};
    document.addEventListener('paste', onPaste); return function () { document.removeEventListener('paste', onPaste); };
  }
  window.MLShare = { put: put, list: list, get: get, del: del, copy: copy, download: download, send: send, pick: pick, receive: receive, toast: toast, APPS: APPS, kindOf: kindOf };
})();
