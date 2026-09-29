/* Thumbnail Studio – canvas rendering (1920×1080 base), IndexedDB storage, base templates, optional AI cut-out. */
(function () {
  if (window.TS) return;
  var W = 1920, H = 1080, MAX_IMG = 5, MAX_TPL = 5;
  var FONTS = [
    ['Bebas Neue', [400]], ['Montserrat', [400, 500, 600, 700, 800, 900]], ['League Spartan', [400, 500, 600, 700, 800, 900]],
    ['Anton', [400]], ['Oswald', [400, 500, 600, 700]], ['Archivo', [400, 500, 600, 700, 800, 900]], ['Playfair Display', [400, 500, 600, 700, 800, 900]]
  ];
  var ASSETS = {
    'logo-symbol': { url: 'images/logo-symbol.png', label: 'Livets Ord-symbol' },
    'logo-kbs': { url: 'images/logo-kbs.png', label: 'Kveldsbibelskole-logo' },
    'logo-wol': { url: 'images/logo-wol.png', label: 'Word of Life-logo' }
  };
  var PALETTE = ['#ffffff', '#000000', '#1a1a1a', '#f5b800', '#0495c0', '#338f9c', '#7b3fe4', '#e84393', '#e4411f', '#e4e1da'];
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c || ''); var n = m ? parseInt(m[1], 16) : 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(c, a) { var r = hex(c); return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a + ')'; }

  /* ---------- IndexedDB ---------- */
  var dbp = null;
  function db() {
    return dbp || (dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('thumbstudio', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('img')) d.createObjectStore('img'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), req = fn(t.objectStore(store));
        t.oncomplete = function () { res(req ? req.result : undefined); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error); };
      });
    });
  }
  var idb = {
    get: function (s, k) { return tx(s, 'readonly', function (o) { return o.get(k); }); },
    put: function (s, k, v) { return tx(s, 'readwrite', function (o) { return o.put(v, k); }); },
    del: function (s, k) { return tx(s, 'readwrite', function (o) { return o.delete(k); }); },
    keys: function (s) { return tx(s, 'readonly', function (o) { return o.getAllKeys(); }); }
  };

  /* ---------- images ---------- */
  var imgs = new Map(), listeners = [];
  function notify() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function loadSrc(src) {
    if (!src) return Promise.resolve(null);
    var e = imgs.get(src); if (e) return e.p;
    e = {}; imgs.set(src, e);
    var urlP = src.indexOf('asset:') === 0 ? Promise.resolve(ASSETS[src.slice(6)] ? ASSETS[src.slice(6)].url : null)
      : idb.get('img', src.slice(3)).then(function (b) { return b ? (e.own = URL.createObjectURL(b)) : null; }).catch(function () { return null; });
    e.p = urlP.then(function (url) {
      return new Promise(function (res) {
        if (!url) { e.fail = true; return res(null); }
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { e.img = im; e.url = url; e.ok = true; notify(); res(e); };
        im.onerror = function () { e.fail = true; res(null); };
        im.src = url;
      });
    });
    return e.p;
  }
  function getImg(src) { if (!src) return null; var e = imgs.get(src); if (!e) { loadSrc(src); return null; } return e.ok ? e : null; }
  function url(src) { var e = getImg(src); return e ? e.url : ''; }
  function srcsOf(doc) { var s = []; doc.layers.forEach(function (l) { if (l.src) s.push(l.src); }); if (doc.bg.src) s.push(doc.bg.src); return s; }
  function loadAll(doc) { return Promise.all(srcsOf(doc).map(loadSrc)); }
  function refs(doc) {
    var s = new Set(), add = function (v) { if (v && v.indexOf('db:') === 0) s.add(v.slice(3)); };
    doc.layers.forEach(function (l) { add(l.src); add(l.orig); }); add(doc.bg.src); add(doc.bg.orig); return s;
  }
  function countImgs(doc) { var s = new Set(); doc.layers.forEach(function (l) { if (l.src && l.src.indexOf('db:') === 0) s.add(l.src); }); if (doc.bg.type === 'image' && doc.bg.src && doc.bg.src.indexOf('db:') === 0) s.add(doc.bg.src); return s.size; }
  function okFile(f) { return !!f && /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.type || '') && f.size <= 40 * 1024 * 1024; }
  function putBlob(blob) {
    var id = 'u' + uid();
    return idb.put('img', id, blob).then(function () { return 'db:' + id; });
  }
  function putImage(file) {
    if (!okFile(file)) return Promise.reject(new Error('type'));
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 3840 / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.drawImage(bmp, 0, 0, w, h); if (bmp.close) bmp.close();
      var alpha = false;
      if (/png|webp|gif|avif/i.test(file.type)) { var d = g.getImageData(0, 0, w, h).data, st = Math.max(4, Math.floor(d.length / 4 / 40000) * 4); for (var i = 3; i < d.length; i += st) if (d[i] < 250) { alpha = true; break; } }
      return new Promise(function (res) { c.toBlob(res, alpha ? 'image/png' : 'image/jpeg', 0.92); });
    }).then(function (blob) { if (!blob) throw new Error('encode'); return putBlob(blob); });
  }
  function blobOf(src) { return src && src.indexOf('db:') === 0 ? idb.get('img', src.slice(3)) : Promise.resolve(null); }
  function gc(keep) {
    return idb.keys('img').then(function (ks) {
      return Promise.all(ks.filter(function (k) { return !keep.has(k); }).map(function (k) {
        var e = imgs.get('db:' + k); if (e && e.own) URL.revokeObjectURL(e.own); imgs.delete('db:' + k); return idb.del('img', k);
      }));
    }).catch(function () {});
  }
  var tints = new Map();
  function tinted(e, color) {
    var key = e.url + '|' + color, c = tints.get(key); if (c) return c;
    var im = e.img; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    if (tints.size > 40) tints.clear(); tints.set(key, c); return c;
  }

  /* ---------- fonts ---------- */
  function ensureFonts(doc) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var seen = {}, ps = [];
    doc.layers.forEach(function (l) { if (l.type !== 'text') return; var k = l.weight + ' 100px "' + l.font + '"'; if (!seen[k]) { seen[k] = 1; ps.push(document.fonts.load(k, 'ÆØÅ Hg').catch(function () {})); } });
    return Promise.all(ps);
  }

  /* ---------- layers & templates ---------- */
  function L(type, p) {
    var base = { id: uid(), type: type, x: 660, y: 340, w: 600, h: 400, rot: 0, flipX: false, flipY: false, op: 1, hidden: false, lock: false, shadow: 0, role: null };
    var t = {
      text: { text: 'Tekst', list: '', font: 'Montserrat', weight: 700, size: 90, color: '#ffffff', align: 'left', valign: 'top', lh: 1.1, ls: 0, upper: false, fit: true, bar: false, barColor: '#f5b800', barH: 8, h: 160 },
      image: { src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 40, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null },
      shape: { kind: 'rounded', radius: 40, fill: '#ffffff', fill2: null, angle: 135, stroke: 0, strokeColor: '#ffffff' },
      glow: { color: '#f5b800', soft: 0.5, op: 0.6, w: 900, h: 900, x: 510, y: 90 }
    }[type];
    return Object.assign(base, t, p || {});
  }
  function emptyDoc() { return { v: 1, bg: { type: 'color', color: '#000000', c1: '#241046', c2: '#07040f', angle: 135, radial: false, src: null, zoom: 1, px: 0.5, py: 0.5, blur: 0, dim: 0 }, vig: { on: false, amt: 0.55, size: 0.5, color: '#000000', top: false }, layers: [] }; }
  var BASES = {
    sunday: function () {
      var d = emptyDoc(); d.bg.color = '#000000'; d.vig = { on: true, amt: 0.6, size: 0.55, color: '#000000', top: false };
      d.layers = [
        L('glow', { x: -560, y: -620, w: 1500, h: 1300, color: '#f5b800', op: 0.5, soft: 0.6, lock: true }),
        L('glow', { x: 1480, y: 320, w: 1000, h: 1000, color: '#f5b800', op: 0.42, soft: 0.6, lock: true }),
        L('image', { x: 960, y: 40, w: 960, h: 1040, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('image', { src: 'asset:logo-symbol', x: 150, y: 100, w: 172, h: 130, fit: 'contain', px: 0, py: 0.5, tint: '#f5b800' }),
        L('text', { text: 'Søndagsmøte', x: 150, y: 262, w: 880, h: 50, font: 'Montserrat', weight: 700, size: 40, color: '#f5b800', upper: true, ls: 0.12, role: 'theme' }),
        L('text', { text: 'Fornavn\nEtternavn', x: 150, y: 335, w: 860, h: 620, font: 'Bebas Neue', weight: 400, size: 330, lh: 0.9, upper: true, bar: true, barColor: '#f5b800', barH: 7, role: 'name' })
      ];
      return d;
    },
    kbs: function () {
      var d = emptyDoc(); d.bg.color = '#0495c0';
      d.layers = [
        L('image', { x: -626, y: -158, w: 1516, h: 1516, shape: 'ellipse', fit: 'cover', px: 0.62, py: 0.3, role: 'person' }),
        L('shape', { x: 830, y: 300, w: 900, h: 430, kind: 'rounded', radius: 64, fill: '#ffffff', shadow: 0.45 }),
        L('text', { text: 'Fornavn\nEtternavn', x: 880, y: 335, w: 800, h: 360, font: 'Montserrat', weight: 500, size: 150, lh: 1.0, color: '#111111', align: 'center', valign: 'middle', role: 'name' }),
        L('text', { text: 'Åpen bibelskolekveld', x: 830, y: 765, w: 900, h: 60, font: 'Montserrat', weight: 700, size: 46, color: '#ffffff', align: 'center', upper: true, ls: 0.06, role: 'theme' }),
        L('image', { src: 'asset:logo-kbs', x: 935, y: 860, w: 690, h: 223, fit: 'contain', px: 0.5 })
      ];
      return d;
    },
    youth: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#241046', c2: '#07040f', angle: 135 }); d.vig = { on: true, amt: 0.5, size: 0.55, color: '#000000', top: false };
      d.layers = [
        L('glow', { x: -300, y: 480, w: 1200, h: 1000, color: '#7b3fe4', op: 0.55, soft: 0.6, lock: true }),
        L('shape', { x: 1080, y: -220, w: 1000, h: 1520, rot: -8, kind: 'rect', fill: '#7b3fe4', fill2: '#e84393', angle: 160 }),
        L('image', { x: 940, y: 60, w: 980, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person', shadow: 0.35 }),
        L('text', { text: 'Ungdomsmøte', x: 120, y: 150, w: 800, h: 44, font: 'Montserrat', weight: 800, size: 38, color: '#e0d2ff', upper: true, ls: 0.3 }),
        L('text', { text: 'Kveldens\ntema', x: 120, y: 225, w: 880, h: 540, font: 'Bebas Neue', weight: 400, size: 290, lh: 0.9, upper: true, role: 'theme' }),
        L('text', { text: 'Fornavn Etternavn', x: 120, y: 810, w: 820, h: 70, font: 'Montserrat', weight: 700, size: 54, role: 'name' }),
        L('image', { src: 'asset:logo-symbol', x: 120, y: 925, w: 106, h: 80, fit: 'contain', px: 0, tint: '#ffffff' })
      ];
      return d;
    },
    blank: function () {
      var d = emptyDoc(); d.bg.color = '#111111';
      d.layers = [L('text', { text: 'Fornavn Etternavn', x: 160, y: 440, w: 1600, h: 200, font: 'Bebas Neue', weight: 400, size: 200, align: 'center', valign: 'middle', upper: true, role: 'name' })];
      return d;
    }
  };
  var LAYOUTS = {
    event: function () {
      var d = emptyDoc(); d.bg.color = '#1e1b4b';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
        L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#1e1b4b', op: 0.6 }),
        L('shape', { x: 120, y: 150, w: 440, h: 96, kind: 'rounded', radius: 48, fill: '#f472b6' }),
        L('text', { text: '12. oktober', x: 120, y: 150, w: 440, h: 96, font: 'Montserrat', weight: 800, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle', upper: true, ls: 0.06 }),
        L('text', { text: 'Navn på\narrangementet', x: 120, y: 300, w: 1500, h: 480, font: 'Anton', weight: 400, size: 220, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Sted · kl. 19:00', x: 120, y: 830, w: 1200, h: 70, font: 'Montserrat', weight: 600, size: 52, color: '#fbcfe8', role: 'name' })
      ];
      return d;
    },
    eventdate: function () {
      var d = emptyDoc(); d.bg.color = '#111111';
      d.layers = [
        L('image', { x: 640, y: 0, w: 1280, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
        L('shape', { x: 0, y: 0, w: 640, h: 1080, kind: 'rect', radius: 0, fill: '#e11d48' }),
        L('text', { text: '12', x: 0, y: 190, w: 640, h: 470, font: 'Anton', weight: 400, size: 470, align: 'center', valign: 'middle' }),
        L('text', { text: 'Okt', x: 0, y: 650, w: 640, h: 140, font: 'Anton', weight: 400, size: 130, color: '#ffe4e6', align: 'center', valign: 'middle', upper: true, ls: 0.1 }),
        L('shape', { x: 640, y: 780, w: 1280, h: 300, kind: 'rect', radius: 0, fill: '#000000', op: 0.55 }),
        L('text', { text: 'Navn på arrangementet', x: 700, y: 810, w: 1160, h: 150, font: 'Anton', weight: 400, size: 130, upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Sted · kl. 19:00', x: 700, y: 965, w: 1160, h: 60, font: 'Montserrat', weight: 600, size: 44, color: '#e5e5e5', role: 'name' })
      ];
      return d;
    },
    speaker: function () {
      var d = emptyDoc(); d.bg.color = '#0f766e';
      d.layers = [
        L('glow', { x: 1000, y: 120, w: 1000, h: 1000, color: '#5eead4', op: 0.4, soft: 0.6, lock: true }),
        L('image', { x: 980, y: 60, w: 940, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('text', { text: 'Kategori', x: 120, y: 230, w: 800, h: 50, font: 'Montserrat', weight: 700, size: 38, color: '#fde047', upper: true, ls: 0.2 }),
        L('text', { text: 'Tittel på\ntalen', x: 120, y: 300, w: 860, h: 460, font: 'Anton', weight: 400, size: 200, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Fornavn Etternavn', x: 120, y: 800, w: 860, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#ccfbf1', role: 'name' })
      ];
      return d;
    },
    sermon: function () {
      var d = emptyDoc(); d.bg.color = '#4c1d95';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
        L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#4c1d95', op: 0.72 }),
        L('text', { text: 'Kategori · kl. 11:00', x: 360, y: 230, w: 1200, h: 50, font: 'Montserrat', weight: 700, size: 36, color: '#f0abfc', align: 'center', upper: true, ls: 0.2 }),
        L('text', { text: 'Tittel på talen', x: 160, y: 310, w: 1600, h: 400, font: 'Bebas Neue', weight: 400, size: 300, lh: 0.9, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
        L('shape', { x: 880, y: 745, w: 160, h: 8, kind: 'rect', radius: 0, fill: '#f0abfc' }),
        L('text', { text: 'Fornavn Etternavn', x: 360, y: 790, w: 1200, h: 70, font: 'Montserrat', weight: 600, size: 50, align: 'center', role: 'name' })
      ];
      return d;
    },
    promo: function () {
      var d = emptyDoc(); d.bg.color = '#0a0a0a';
      d.layers = [
        L('image', { x: 700, y: 0, w: 1220, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
        L('shape', { x: -420, y: -200, w: 1400, h: 1500, rot: 14, kind: 'rect', radius: 0, fill: '#7c3aed', fill2: '#db2777', angle: 135 }),
        L('shape', { x: 110, y: 220, w: 260, h: 80, kind: 'rounded', radius: 40, fill: '#ffffff' }),
        L('text', { text: 'Nyhet', x: 110, y: 220, w: 260, h: 80, font: 'Montserrat', weight: 800, size: 38, color: '#7c3aed', align: 'center', valign: 'middle', upper: true, ls: 0.12 }),
        L('text', { text: 'Stor\noverskrift', x: 110, y: 340, w: 800, h: 460, font: 'Anton', weight: 400, size: 220, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Kort undertittel', x: 110, y: 830, w: 800, h: 70, font: 'Montserrat', weight: 600, size: 48, role: 'name' })
      ];
      return d;
    },
    promocenter: function () {
      var d = emptyDoc(); d.bg.color = '#22c55e';
      d.layers = [
        L('text', { text: 'Stor overskrift', x: 120, y: 220, w: 1680, h: 420, font: 'Anton', weight: 400, size: 300, lh: 0.95, color: '#052e16', align: 'center', valign: 'middle', upper: true, role: 'theme' }),
        L('text', { text: 'Kort undertittel', x: 260, y: 650, w: 1400, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#14532d', align: 'center', role: 'name' }),
        L('shape', { x: 710, y: 790, w: 500, h: 110, kind: 'rounded', radius: 55, fill: '#052e16' }),
        L('text', { text: 'Se videoen', x: 710, y: 790, w: 500, h: 110, font: 'Montserrat', weight: 800, size: 40, color: '#bbf7d0', align: 'center', valign: 'middle', upper: true, ls: 0.06 })
      ];
      return d;
    },
    music: function () {
      var d = emptyDoc(); d.bg.color = '#000000';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
        L('shape', { x: 0, y: 0, w: 1920, h: 110, kind: 'rect', radius: 0, fill: '#06b6d4' }),
        L('shape', { x: 0, y: 970, w: 1920, h: 110, kind: 'rect', radius: 0, fill: '#06b6d4' }),
        L('text', { text: 'Artistnavn', x: 120, y: 640, w: 1200, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#67e8f9', upper: true, ls: 0.35, role: 'name' }),
        L('text', { text: 'Låttittel', x: 120, y: 700, w: 1500, h: 230, font: 'Bebas Neue', weight: 400, size: 240, upper: true, role: 'theme' })
      ];
      return d;
    },
    musiccover: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#f43f5e', c2: '#f97316', angle: 135 });
      d.layers = [
        L('image', { x: 160, y: 190, w: 700, h: 700, shape: 'rounded', radius: 24, fit: 'cover', px: 0.5, py: 0.5, shadow: 0.5 }),
        L('text', { text: 'Låttittel', x: 960, y: 330, w: 860, h: 300, font: 'Anton', weight: 400, size: 170, lh: 0.95, upper: true, valign: 'bottom', role: 'theme' }),
        L('text', { text: 'Artistnavn', x: 960, y: 660, w: 860, h: 70, font: 'Montserrat', weight: 600, size: 52, color: '#ffedd5', role: 'name' }),
        L('shape', { x: 960, y: 790, w: 860, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff', op: 0.35 }),
        L('shape', { x: 960, y: 790, w: 300, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff' })
      ];
      return d;
    },
    shorthook: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#1e3a8a', c2: '#0b1226', angle: 160 });
      d.layers = [
        L('glow', { x: 510, y: 330, w: 900, h: 900, color: '#ff5a4e', op: 0.3, soft: 0.65, lock: true }),
        L('image', { x: 460, y: 330, w: 1000, h: 750, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('shape', { x: 250, y: 70, w: 1420, h: 230, rot: -2, kind: 'rounded', radius: 14, fill: '#ff5a4e' }),
        L('text', { text: 'Dette må du se', x: 250, y: 100, w: 1420, h: 190, rot: -2, font: 'Anton', weight: 400, size: 140, color: '#ffffff', align: 'center', valign: 'middle', upper: true, role: 'theme' })
      ];
      return d;
    },
    shortsplit: function () {
      var d = emptyDoc(); d.bg.color = '#1f2937';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 600, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
        L('shape', { x: 0, y: 600, w: 1920, h: 480, kind: 'rect', radius: 0, fill: '#1f2937' }),
        L('shape', { x: 0, y: 592, w: 1920, h: 16, kind: 'rect', radius: 0, fill: '#f59e0b' }),
        L('text', { text: 'Kort og tydelig tittel', x: 120, y: 650, w: 1680, h: 250, font: 'Anton', weight: 400, size: 190, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
        L('text', { text: 'Fornavn Etternavn', x: 120, y: 920, w: 1680, h: 70, font: 'Montserrat', weight: 700, size: 44, color: '#fbbf24', align: 'center', upper: true, ls: 0.15, role: 'name' })
      ];
      return d;
    },
    shorttip: function () {
      var d = emptyDoc(); d.bg.color = '#f5f0ff';
      d.layers = [
        L('image', { x: 1000, y: 60, w: 920, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('shape', { x: 120, y: 160, w: 240, h: 240, kind: 'ellipse', fill: '#7c3aed' }),
        L('text', { text: '#3', x: 120, y: 160, w: 240, h: 240, font: 'Anton', weight: 400, size: 130, align: 'center', valign: 'middle' }),
        L('text', { text: 'Tips du kan\nbruke i dag', x: 120, y: 440, w: 900, h: 400, font: 'Anton', weight: 400, size: 170, lh: 0.95, color: '#1e1033', upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Fornavn Etternavn', x: 120, y: 870, w: 900, h: 60, font: 'Montserrat', weight: 600, size: 44, color: '#5b21b6', role: 'name' })
      ];
      return d;
    },
    interview: function () {
      var d = emptyDoc(); d.bg.color = '#0b0b0b';
      d.layers = [
        L('image', { x: 0, y: 0, w: 960, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
        L('image', { x: 960, y: 0, w: 960, h: 1080, fit: 'cover', px: 0.5, py: 0.4 }),
        L('shape', { x: 0, y: 0, w: 1920, h: 230, kind: 'rect', radius: 0, fill: '#4f46e5' }),
        L('text', { text: 'Tittel på intervjuet', x: 120, y: 55, w: 1680, h: 120, font: 'Anton', weight: 400, size: 110, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
        L('shape', { x: 80, y: 900, w: 560, h: 100, kind: 'rounded', radius: 12, fill: '#fbbf24' }),
        L('text', { text: 'Fornavn Etternavn', x: 80, y: 900, w: 560, h: 100, font: 'Montserrat', weight: 700, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle', role: 'name' }),
        L('shape', { x: 1280, y: 900, w: 560, h: 100, kind: 'rounded', radius: 12, fill: '#fbbf24' }),
        L('text', { text: 'Fornavn Etternavn', x: 1280, y: 900, w: 560, h: 100, font: 'Montserrat', weight: 700, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle' })
      ];
      return d;
    },
    interviewquote: function () {
      var d = emptyDoc(); d.bg.color = '#18181b';
      d.layers = [
        L('image', { x: 0, y: 60, w: 900, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('text', { text: '\u201C', x: 960, y: 90, w: 300, h: 300, font: 'Montserrat', weight: 800, size: 400, color: '#facc15', fit: false }),
        L('text', { text: 'Et sterkt sitat fra intervjuet', x: 960, y: 330, w: 860, h: 420, font: 'Montserrat', weight: 800, size: 88, lh: 1.12, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Fornavn Etternavn', x: 960, y: 800, w: 860, h: 60, font: 'Montserrat', weight: 700, size: 42, color: '#facc15', upper: true, ls: 0.08, role: 'name' })
      ];
      return d;
    },
    interviewlower: function () {
      var d = emptyDoc(); d.bg.color = '#000000';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
        L('shape', { x: 100, y: 790, w: 1000, h: 120, kind: 'rect', radius: 0, fill: '#facc15' }),
        L('text', { text: 'Fornavn Etternavn', x: 140, y: 790, w: 940, h: 120, font: 'Montserrat', weight: 800, size: 64, color: '#111111', valign: 'middle', role: 'name' }),
        L('shape', { x: 100, y: 910, w: 1000, h: 80, kind: 'rect', radius: 0, fill: '#111111' }),
        L('text', { text: 'Tittel eller rolle', x: 140, y: 910, w: 940, h: 80, font: 'Montserrat', weight: 600, size: 40, color: '#facc15', valign: 'middle', upper: true, ls: 0.08, role: 'theme' })
      ];
      return d;
    },
    panelthree: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#1e293b', c2: '#0f172a', angle: 180 });
      d.layers = [L('text', { text: 'Tema for samtalen', x: 120, y: 80, w: 1680, h: 180, font: 'Anton', weight: 400, size: 150, align: 'center', valign: 'middle', upper: true, role: 'theme' })];
      [170, 740, 1310].forEach(function (x, i) {
        d.layers.push(L('shape', { x: x - 15, y: 325, w: 470, h: 470, kind: 'ellipse', fill: '#38bdf8' }),
          L('image', { x: x, y: 340, w: 440, h: 440, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3, role: i === 0 ? 'person' : null }),
          L('text', { text: 'Fornavn Etternavn', x: x - 30, y: 830, w: 500, h: 60, font: 'Montserrat', weight: 600, size: 40, color: '#e2e8f0', align: 'center', role: i === 0 ? 'name' : null }));
      });
      return d;
    },
    panelfour: function () {
      var d = emptyDoc(); d.bg.color = '#f4f1ea';
      d.layers = [L('text', { text: 'Tema for samtalen', x: 120, y: 90, w: 1680, h: 180, font: 'Anton', weight: 400, size: 150, color: '#1c1917', valign: 'middle', upper: true, role: 'theme' })];
      [120, 560, 1000, 1440].forEach(function (x, i) {
        d.layers.push(L('image', { x: x, y: 330, w: 400, h: 520, shape: 'rounded', radius: 24, fit: 'cover', px: 0.5, py: 0.3, role: i === 0 ? 'person' : null }),
          L('text', { text: 'Fornavn Etternavn', x: x, y: 880, w: 400, h: 60, font: 'Montserrat', weight: 700, size: 36, color: '#44403c', align: 'center', role: i === 0 ? 'name' : null }));
      });
      return d;
    },
    panelvs: function () {
      var d = emptyDoc(); d.bg.color = '#000000';
      d.layers = [
        L('shape', { x: 0, y: 0, w: 960, h: 1080, kind: 'rect', radius: 0, fill: '#dc2626' }),
        L('shape', { x: 960, y: 0, w: 960, h: 1080, kind: 'rect', radius: 0, fill: '#1d4ed8' }),
        L('image', { x: 0, y: 120, w: 960, h: 960, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('image', { x: 960, y: 120, w: 960, h: 960, fit: 'contain', px: 0.5, py: 1, flip: true }),
        L('shape', { x: 830, y: 390, w: 260, h: 260, kind: 'ellipse', fill: '#ffffff' }),
        L('text', { text: '&', x: 830, y: 390, w: 260, h: 260, font: 'Anton', weight: 400, size: 150, color: '#111111', align: 'center', valign: 'middle' }),
        L('shape', { x: 0, y: 900, w: 1920, h: 180, kind: 'rect', radius: 0, fill: '#000000', op: 0.6 }),
        L('text', { text: 'Tema for samtalen', x: 120, y: 910, w: 1680, h: 160, font: 'Anton', weight: 400, size: 120, align: 'center', valign: 'middle', upper: true, role: 'theme' })
      ];
      return d;
    },
    podcast: function () {
      var d = emptyDoc(); d.bg.color = '#ea580c';
      d.layers = [
        L('shape', { x: 1100, y: 140, w: 700, h: 800, kind: 'rounded', radius: 40, fill: '#7c2d12' }),
        L('image', { x: 1130, y: 170, w: 640, h: 740, shape: 'rounded', radius: 28, fit: 'cover', px: 0.5, py: 0.3, role: 'person' }),
        L('text', { text: 'Ep. 12', x: 120, y: 200, w: 700, h: 120, font: 'Anton', weight: 400, size: 110, color: '#ffedd5', upper: true }),
        L('text', { text: 'Tittel på\nepisoden', x: 120, y: 330, w: 940, h: 420, font: 'Anton', weight: 400, size: 190, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Navn på podkasten', x: 120, y: 800, w: 940, h: 60, font: 'Montserrat', weight: 700, size: 42, color: '#ffedd5', upper: true, ls: 0.12, role: 'name' })
      ];
      return d;
    },
    podcastwave: function () {
      var d = emptyDoc(); d.bg.color = '#be123c';
      d.layers = [
        L('text', { text: 'Tittel på episoden', x: 160, y: 110, w: 1600, h: 240, font: 'Anton', weight: 400, size: 170, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
        L('text', { text: 'Navn på podkasten', x: 360, y: 370, w: 1200, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#fecdd3', align: 'center', upper: true, ls: 0.15, role: 'name' }),
        L('shape', { x: 90, y: 550, w: 440, h: 440, kind: 'ellipse', fill: '#fecdd3' }),
        L('image', { x: 100, y: 560, w: 420, h: 420, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3, role: 'person' }),
        L('shape', { x: 1390, y: 550, w: 440, h: 440, kind: 'ellipse', fill: '#fecdd3' }),
        L('image', { x: 1400, y: 560, w: 420, h: 420, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3 })
      ];
      [80, 160, 240, 120, 300, 200, 360, 260, 360, 200, 300, 120, 240, 160, 80].forEach(function (h, i) {
        d.layers.push(L('shape', { x: 600 + i * 48, y: 770 - h / 2, w: 28, h: h, kind: 'rounded', radius: 14, fill: '#fecdd3' }));
      });
      return d;
    },
    podcastguest: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#13315c', c2: '#0b1d3a', angle: 160 });
      d.layers = [
        L('glow', { x: 560, y: 140, w: 800, h: 800, color: '#ff7a59', op: 0.35, soft: 0.6, lock: true }),
        L('text', { text: 'Navn på podkasten', x: 120, y: 90, w: 900, h: 50, font: 'Montserrat', weight: 700, size: 36, color: '#ffb4a2', upper: true, ls: 0.2 }),
        L('image', { x: 560, y: 120, w: 800, h: 960, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
        L('shape', { x: 0, y: 820, w: 1920, h: 260, kind: 'rect', radius: 0, fill: '#fff7ed' }),
        L('shape', { x: 120, y: 782, w: 220, h: 76, kind: 'rounded', radius: 38, fill: '#ff6b4a' }),
        L('text', { text: 'Gjest', x: 120, y: 782, w: 220, h: 76, font: 'Montserrat', weight: 800, size: 30, align: 'center', valign: 'middle', upper: true, ls: 0.2 }),
        L('text', { text: 'Fornavn Etternavn', x: 120, y: 868, w: 1680, h: 110, font: 'Anton', weight: 400, size: 110, color: '#0b1d3a', upper: true, valign: 'middle', role: 'name' }),
        L('text', { text: 'Tittel på episoden', x: 120, y: 985, w: 1680, h: 56, font: 'Montserrat', weight: 600, size: 40, color: '#c2410c', role: 'theme' })
      ];
      return d;
    },
    eventticket: function () {
      var d = emptyDoc(); d.bg.color = '#312e81';
      d.layers = [L('text', { text: 'Navn på\narrangementet', x: 120, y: 110, w: 1680, h: 480, font: 'Anton', weight: 400, size: 220, lh: 0.95, align: 'center', valign: 'middle', upper: true, role: 'theme' })];
      [['Dato', '12. okt'], ['Tid', '19:00'], ['Sted', 'Stedsnavn']].forEach(function (b, i) {
        var x = 120 + i * 580;
        d.layers.push(L('shape', { x: x, y: 670, w: 520, h: 250, kind: 'rounded', radius: 24, fill: '#4338ca' }),
          L('text', { text: b[0], x: x, y: 705, w: 520, h: 50, font: 'Montserrat', weight: 700, size: 32, color: '#c7d2fe', align: 'center', upper: true, ls: 0.2 }),
          L('text', { text: b[1], x: x + 20, y: 765, w: 480, h: 120, font: 'Anton', weight: 400, size: 100, align: 'center', valign: 'middle', upper: true }));
      });
      return d;
    },
    sundayverse: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#2563eb', c2: '#7c3aed', angle: 135 });
      d.layers = [
        L('text', { text: 'Et bibelvers eller et kort budskap', x: 200, y: 250, w: 1520, h: 460, font: 'Montserrat', weight: 800, size: 110, lh: 1.1, color: '#ffffff', align: 'center', valign: 'middle', role: 'theme' }),
        L('shape', { x: 880, y: 760, w: 160, h: 10, kind: 'rounded', radius: 5, fill: '#fde047' }),
        L('text', { text: 'Johannes 3,16', x: 460, y: 800, w: 1000, h: 60, font: 'Montserrat', weight: 800, size: 44, color: '#fde047', align: 'center', upper: true, ls: 0.15, role: 'name' })
      ];
      return d;
    },
    promoframe: function () {
      var d = emptyDoc(); d.bg.color = '#2563eb';
      d.layers = [
        L('image', { x: 60, y: 60, w: 1800, h: 960, fit: 'cover', px: 0.5, py: 0.5 }),
        L('shape', { x: 0, y: 720, w: 1200, h: 300, kind: 'rect', radius: 0, fill: '#facc15' }),
        L('text', { text: 'Stor overskrift', x: 80, y: 750, w: 1060, h: 160, font: 'Anton', weight: 400, size: 150, color: '#111111', upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: 'Kort undertittel', x: 80, y: 920, w: 1060, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#1e3a8a', role: 'name' }),
        L('shape', { x: 1560, y: 110, w: 260, h: 260, kind: 'ellipse', fill: '#ffffff' }),
        L('text', { text: 'Ny!', x: 1560, y: 110, w: 260, h: 260, rot: -10, font: 'Anton', weight: 400, size: 110, color: '#2563eb', align: 'center', valign: 'middle', upper: true })
      ];
      return d;
    },
    musiclive: function () {
      var d = emptyDoc(); d.bg.color = '#000000';
      d.layers = [
        L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
        L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#be185d', op: 0.5 }),
        L('shape', { x: 120, y: 110, w: 200, h: 80, kind: 'rounded', radius: 40, fill: '#22d3ee' }),
        L('text', { text: 'Live', x: 120, y: 110, w: 200, h: 80, font: 'Montserrat', weight: 800, size: 38, color: '#083344', align: 'center', valign: 'middle', upper: true, ls: 0.15 }),
        L('text', { text: 'Låttittel', x: 120, y: 620, w: 1680, h: 260, font: 'Anton', weight: 400, size: 260, upper: true, valign: 'bottom', role: 'theme' }),
        L('text', { text: 'Artistnavn', x: 120, y: 890, w: 1680, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#a5f3fc', upper: true, ls: 0.25, role: 'name' })
      ];
      return d;
    },
    playlisttracks: function () {
      var d = emptyDoc(); d.bg.color = '#84cc16';
      d.layers = [
        L('text', { text: 'Navn på listen', x: 120, y: 110, w: 1000, h: 220, font: 'Anton', weight: 400, size: 190, color: '#1a2e05', upper: true, valign: 'middle', role: 'theme' }),
        L('text', { text: '01   Første sang\n02   Andre sang\n03   Tredje sang\n04   Fjerde sang', x: 120, y: 390, w: 1000, h: 560, font: 'Montserrat', weight: 700, size: 64, lh: 1.55, color: '#1a2e05', fit: true }),
        L('shape', { x: 1210, y: 230, w: 620, h: 620, kind: 'rounded', radius: 32, fill: '#1a2e05' }),
        L('image', { x: 1240, y: 200, w: 620, h: 620, shape: 'rounded', radius: 32, fit: 'cover', px: 0.5, py: 0.5 }),
        L('text', { text: 'Spilleliste', x: 1210, y: 900, w: 650, h: 60, font: 'Montserrat', weight: 800, size: 40, color: '#1a2e05', align: 'center', upper: true, ls: 0.25, role: 'name' })
      ];
      return d;
    },
    playlistvinyl: function () {
      var d = emptyDoc(); d.bg.color = '#14b8a6';
      d.layers = [
        L('shape', { x: 470, y: 190, w: 700, h: 700, kind: 'ellipse', fill: '#111111' }),
        L('shape', { x: 720, y: 440, w: 200, h: 200, kind: 'ellipse', fill: '#fb7185' }),
        L('shape', { x: 805, y: 525, w: 30, h: 30, kind: 'ellipse', fill: '#111111' }),
        L('image', { x: 120, y: 190, w: 700, h: 700, shape: 'rounded', radius: 8, fit: 'cover', px: 0.5, py: 0.5, shadow: 0.45 }),
        L('shape', { x: 1250, y: 300, w: 300, h: 76, kind: 'rounded', radius: 38, fill: '#042f2e' }),
        L('text', { text: 'Spilleliste', x: 1250, y: 300, w: 300, h: 76, font: 'Montserrat', weight: 800, size: 30, color: '#99f6e4', align: 'center', valign: 'middle', upper: true, ls: 0.15, role: 'name' }),
        L('text', { text: 'Navn på\nlisten', x: 1250, y: 410, w: 600, h: 420, font: 'Anton', weight: 400, size: 180, lh: 0.95, color: '#042f2e', upper: true, valign: 'top', role: 'theme' })
      ];
      return d;
    },
    playlisttop: function () {
      var d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#3b0764', c2: '#1e0736', angle: 150 });
      d.layers = [
        L('text', { text: '10', x: 100, y: 120, w: 760, h: 840, font: 'Anton', weight: 400, size: 760, color: '#f472b6', align: 'center', valign: 'middle' }),
        L('text', { text: 'Spilleliste', x: 900, y: 300, w: 900, h: 60, font: 'Montserrat', weight: 800, size: 40, color: '#f9a8d4', upper: true, ls: 0.25, role: 'name' }),
        L('text', { text: 'Topp sanger\nakkurat nå', x: 900, y: 370, w: 900, h: 420, font: 'Anton', weight: 400, size: 180, lh: 0.95, upper: true, valign: 'top', role: 'theme' }),
        L('shape', { x: 900, y: 830, w: 360, h: 12, kind: 'rounded', radius: 6, fill: '#f472b6' })
      ];
      return d;
    },
    blank: function () { var d = emptyDoc(); d.bg.color = '#111111'; return d; }
  };
  function layout(key) { var k = LAYOUTS[key] ? key : 'blank', d = LAYOUTS[k](); d.lay = k; return d; }
  var BASE_LABELS = { sunday: 'Søndagsmøte', kbs: 'Kveldsbibelskole', youth: 'Ungdomsmøte', blank: 'Tomt oppsett' };
  var DEFAULT_CATS = [
    { id: 'sunday', name: 'Søndagsmøte', desc: 'Svart bakgrunn med gult scenelys og stort navn.', base: 'sunday' },
    { id: 'kbs', name: 'Kveldsbibelskole', desc: 'Blå bakgrunn, bilde i bue og navnet i en hvit boks.', base: 'kbs' },
    { id: 'youth', name: 'Ungdomsmøte', desc: 'Mørk lilla med skrå fargeblokk og stor tittel.', base: 'youth' }
  ];
  function base(key) { var d = (BASES[key] || BASES.blank)(); d.layers.forEach(function (l, i) { l.id = 'b' + i; }); return d; }
  function loadState() {
    return Promise.all([idb.get('kv', 'cats'), idb.get('kv', 'tpls')]).then(function (r) {
      return { cats: Array.isArray(r[0]) && r[0].length ? r[0] : clone(DEFAULT_CATS), tpls: Array.isArray(r[1]) ? r[1] : [] };
    }).catch(function () { return { cats: clone(DEFAULT_CATS), tpls: [], noDb: true }; });
  }
  function saveCats(c) { return idb.put('kv', 'cats', c); }
  function saveTpls(t) { return idb.put('kv', 'tpls', t); }

  /* ---------- rendering ---------- */
  var _mc = null;
  function shapePath(g, kind, w, h, r) {
    g.beginPath();
    if (kind === 'line') { kind = r > 0 ? 'rounded' : 'rect'; r = h / 2; }
    if (kind === 'ellipse') g.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    else if (kind === 'rounded') { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath(); }
    else g.rect(0, 0, w, h);
  }
  function linGrad(g, c1, c2, ang, w, h) {
    var a = (ang - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), len = Math.abs(w / 2 * dx) + Math.abs(h / 2 * dy);
    var gr = g.createLinearGradient(w / 2 - dx * len, h / 2 - dy * len, w / 2 + dx * len, h / 2 + dy * len); gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr;
  }
  function shadow(g, l, s) { if (!(l.shadow > 0)) return; g.shadowColor = 'rgba(0,0,0,' + (0.25 + 0.5 * l.shadow).toFixed(2) + ')'; g.shadowBlur = 90 * l.shadow * s; g.shadowOffsetY = 24 * l.shadow * s; }
  function drawFit(g, im, bw, bh, fit, zoom, px, py, flip, cr) {
    var nw = im.naturalWidth || im.width, nh = im.naturalHeight || im.height; if (!nw || !nh) return;
    var c = function (v) { return Math.max(0, Math.min(0.95, +v || 0)); }, cl = cr ? c(cr.cL) : 0, ct = cr ? c(cr.cT) : 0, crr = cr ? c(cr.cR) : 0, cb = cr ? c(cr.cB) : 0;
    if (cl + crr > 0.95) crr = 0.95 - cl; if (ct + cb > 0.95) cb = 0.95 - ct;
    var sx = nw * cl, sy = nh * ct, iw = nw * (1 - cl - crr), ih = nh * (1 - ct - cb); if (iw < 1 || ih < 1) return;
    var sc = (fit === 'contain' ? Math.min(bw / iw, bh / ih) : Math.max(bw / iw, bh / ih)) * (zoom || 1), dw = iw * sc, dh = ih * sc, dx = (bw - dw) * px, dy = (bh - dh) * py;
    if (flip) { g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(im, sx, sy, iw, ih, 0, 0, dw, dh); g.restore(); } else g.drawImage(im, sx, sy, iw, ih, dx, dy, dw, dh);
  }
  function blurred(im, amt) {
    var f = 1 + amt * 0.5, c = document.createElement('canvas'); c.width = Math.max(8, Math.round(W / f)); c.height = Math.max(8, Math.round(H / f));
    var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
    var c2 = document.createElement('canvas'); c2.width = Math.max(4, Math.round(c.width / 2)); c2.height = Math.max(4, Math.round(c.height / 2));
    c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height); g.clearRect(0, 0, c.width, c.height); g.drawImage(c2, 0, 0, c.width, c.height); return c;
  }
  var blurCache = { key: '', c: null };
  function drawBg(g, b, o) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    if (b.type === 'gradient') {
      if (b.radial) { var r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2); r.addColorStop(0, b.c1); r.addColorStop(1, b.c2); g.fillStyle = r; }
      else g.fillStyle = linGrad(g, b.c1, b.c2, b.angle, W, H);
      g.fillRect(0, 0, W, H);
    } else if (b.type === 'image') {
      var e = getImg(b.src);
      if (e) {
        var src = e.img;
        if (b.blur > 0) {
          var key = e.url + '|' + b.blur + '|' + b.zoom + '|' + b.px + '|' + b.py;
          if (blurCache.key !== key) { var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; drawFit(tmp.getContext('2d'), e.img, W, H, 'cover', b.zoom, b.px, b.py); blurCache = { key: key, c: blurred(tmp, b.blur) }; }
          g.drawImage(blurCache.c, 0, 0, W, H);
        } else drawFit(g, src, W, H, 'cover', b.zoom, b.px, b.py);
        if (b.dim > 0) { g.fillStyle = 'rgba(0,0,0,' + b.dim + ')'; g.fillRect(0, 0, W, H); }
      } else if (o.edit) { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, W, H); }
    } else { g.fillStyle = b.color; g.fillRect(0, 0, W, H); }
  }
  function drawVig(g, v) {
    g.save(); g.translate(W / 2, H / 2); g.scale(1, H / W);
    var R = W * 0.74, inner = R * (0.12 + 0.62 * v.size), gr = g.createRadialGradient(0, 0, inner, 0, 0, R);
    gr.addColorStop(0, rgba(v.color, 0)); gr.addColorStop(0.5, rgba(v.color, Math.min(1, v.amt) * 0.45)); gr.addColorStop(1, rgba(v.color, Math.min(1, v.amt)));
    g.fillStyle = gr; g.fillRect(-W / 2, -W / 2, W, W); g.restore();
  }
  function listItem(p, legacy) {
    var m = /^([ \t]*)(\u2022|\u25E6|\u25AA|[-*]|\d+[.)]|[a-z][.)])[ \u2002]+(.*)$/i.exec(p);
    if (m && !(/^[a-z]/i.test(m[2]) && !m[1].length)) return { lvl: Math.min(3, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), num: /^[0-9a-z]/i.test(m[2]), body: m[3] };
    if ((legacy === 'num' || legacy === 'bullet') && p.trim()) return { lvl: 0, num: legacy === 'num', body: p.trim() };
    return null;
  }
  function tlayout(g, l, size) {
    g.font = l.weight + ' ' + size + 'px "' + l.font + '"';
    var txt = String(l.text || ''); if (l.upper) txt = txt.toLocaleUpperCase('nb-NO');
    var ls = (l.ls || 0) * size, meas = function (t) { return g.measureText(t).width + ls * Math.max(0, Array.from(t).length - 1); }, lines = [], segs = [];
    var ind = size * 1.0, cnt = [0, 0, 0, 0], BUL = ['\u2022', '\u25E6', '\u25AA', '\u2022'];
    txt.split('\n').forEach(function (para) {
      var it = listItem(para, l.list), off = 0, mk = '', mx = 0, body = para;
      if (it) {
        for (var k = it.lvl + 1; k < 4; k++) cnt[k] = 0;
        if (it.num) { cnt[it.lvl]++; mk = (it.lvl === 1 ? String.fromCharCode(97 + ((cnt[it.lvl] - 1) % 26)) : String(cnt[it.lvl])) + '.'; if (l.upper) mk = mk.toUpperCase(); } else mk = BUL[it.lvl];
        mx = it.lvl * ind; off = mx + Math.max(meas(mk), size * 0.5) + size * 0.4; body = it.body;
      } else if (para.trim()) cnt = [0, 0, 0, 0];
      var avail = Math.max(size, l.w - off), cur = '', first = true;
      var push = function (t) { lines.push(t); segs.push({ x: off, mk: first ? mk : '', mx: mx }); first = false; };
      body.split(' ').forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (!cur || meas(t) <= avail) cur = t; else { push(cur); cur = w; } });
      push(cur);
    });
    var widths = lines.map(function (t, i) { return meas(t) + segs[i].x; }), m = g.measureText('H'), cap = m.actualBoundingBoxAscent || size * 0.7, lh = size * l.lh;
    var hBlock = cap + (lines.length - 1) * lh + (l.upper ? 0 : size * 0.22), gap = size * 0.12;
    return { size: size, lines: lines, segs: segs, widths: widths, cap: cap, lh: lh, hBlock: hBlock, gap: gap, ls: ls, total: hBlock + (l.bar ? gap + l.barH : 0), max: Math.max.apply(null, widths.concat([0])) };
  }
  function tfit(g, l) {
    var r = tlayout(g, l, l.size); if (!l.fit || (r.max <= l.w + 0.5 && r.total <= l.h + 0.5)) return r;
    var lo = 6, hi = l.size, best = null;
    for (var i = 0; i < 14; i++) { var m = (lo + hi) / 2, t = tlayout(g, l, m); if (t.max <= l.w + 0.5 && t.total <= l.h + 0.5) { best = t; lo = m; } else hi = m; }
    return best || tlayout(g, l, 6);
  }
  function drawText(g, l, s) {
    if (!String(l.text || '').trim()) return;
    var r = tfit(g, l); g.font = l.weight + ' ' + r.size + 'px "' + l.font + '"'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    var top = l.valign === 'middle' ? (l.h - r.total) / 2 : l.valign === 'bottom' ? l.h - r.total : 0;
    shadow(g, l, s); g.fillStyle = l.color;
    var put = function (t, x, y) { if (!r.ls) g.fillText(t, x, y); else Array.from(t).forEach(function (ch) { g.fillText(ch, x, y); x += g.measureText(ch).width + r.ls; }); };
    r.lines.forEach(function (line, i) {
      var sg = r.segs[i], lw = r.widths[i], x0 = l.align === 'center' ? (l.w - lw) / 2 : l.align === 'right' ? l.w - lw : 0, y = top + r.cap + i * r.lh;
      if (sg.mk) put(sg.mk, x0 + sg.mx, y);
      put(line, x0 + sg.x, y);
    });
    if (l.bar) { var bb = barRect(l, r, top); g.fillStyle = l.barColor; g.fillRect(bb.x, bb.y, bb.w, bb.h); }
  }
  function barRect(l, r, top) {
    var bw = r.max * Math.max(0.05, Math.min(3, l.barW == null ? 1 : +l.barW)), bx = l.align === 'center' ? (l.w - bw) / 2 : l.align === 'right' ? l.w - bw : 0;
    return { x: bx, y: top + r.hBlock + r.gap * Math.max(0, l.barGap == null ? 1 : +l.barGap), w: bw, h: l.barH };
  }
  /* underline position in canvas coordinates (unrotated box + the layer's rotation) */
  function barBox(l) {
    if (!l || l.type !== 'text' || !l.bar) return null; if (!_mc) _mc = document.createElement('canvas').getContext('2d');
    var r = tfit(_mc, l), top = l.valign === 'middle' ? (l.h - r.total) / 2 : l.valign === 'bottom' ? l.h - r.total : 0, b = barRect(l, r, top);
    var a = (l.rot || 0) * Math.PI / 180, cx = b.x + b.w / 2 - l.w / 2, cy = b.y + b.h / 2 - l.h / 2;
    var wx = l.x + l.w / 2 + cx * Math.cos(a) - cy * Math.sin(a), wy = l.y + l.h / 2 + cx * Math.sin(a) + cy * Math.cos(a);
    return { x: Math.round(wx - b.w / 2), y: Math.round(wy - b.h / 2), w: Math.round(b.w), h: Math.max(1, Math.round(b.h)), rot: l.rot || 0 };
  }
  function drawImage(g, l, o) {
    var e = getImg(l.src);
    if (!e) {
      if (!o.edit || (l.src && !(imgs.get(l.src) || {}).fail && l.src.indexOf('asset:') === 0)) return;
      shapePath(g, l.shape, l.w, l.h, l.radius); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
      g.setLineDash([18, 14]); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); g.setLineDash([]);
      g.save(); g.beginPath(); g.rect(Math.max(0, -l.x), Math.max(0, -l.y), Math.min(l.w, W - l.x) - Math.max(0, -l.x), Math.min(l.h, H - l.y) - Math.max(0, -l.y)); g.clip();
      var vx = (Math.max(0, -l.x) + Math.min(l.w, W - l.x)) / 2, vy = (Math.max(0, -l.y) + Math.min(l.h, H - l.y)) / 2;
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '600 44px Archivo, Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var ph = l.role === 'person' ? 'Legg til person' : 'Legg til bilde'; g.fillText(window.MLI18N ? window.MLI18N.t(ph) : ph, vx, vy); g.restore();
      return;
    }
    var im = l.tint ? tinted(e, l.tint) : e.img, clip = l.shape !== 'rect' || l.fit === 'cover' || l.zoom > 1 || l.border > 0;
    if (clip) {
      if (l.shadow > 0) { g.save(); shadow(g, l, o.s); shapePath(g, l.shape, l.w, l.h, l.radius); g.fillStyle = '#000'; g.fill(); g.restore(); }
      g.save(); shapePath(g, l.shape, l.w, l.h, l.radius); g.clip(); drawFit(g, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l);
      if (l.border > 0) { g.lineWidth = l.border * 2; g.strokeStyle = l.borderColor; shapePath(g, l.shape, l.w, l.h, l.radius); g.stroke(); }
      g.restore();
    } else { g.save(); shadow(g, l, o.s); drawFit(g, im, l.w, l.h, l.fit, l.zoom, l.px, l.py, l.flip, l); g.restore(); }
  }
  function drawShape(g, l, s) {
    shapePath(g, l.kind, l.w, l.h, l.radius);
    g.fillStyle = l.fill2 ? linGrad(g, l.fill, l.fill2, l.angle, l.w, l.h) : l.fill;
    g.save(); shadow(g, l, s); g.fill(); g.restore();
    if (l.stroke > 0) { g.save(); shapePath(g, l.kind, l.w, l.h, l.radius); g.clip(); g.lineWidth = l.stroke * 2; g.strokeStyle = l.strokeColor; shapePath(g, l.kind, l.w, l.h, l.radius); g.stroke(); g.restore(); }
  }
  function drawGlow(g, l) {
    g.globalCompositeOperation = 'screen'; g.translate(l.w / 2, l.h / 2); g.scale(1, l.h / Math.max(1, l.w));
    var R = l.w / 2, gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, rgba(l.color, 1)); gr.addColorStop(Math.max(0.02, Math.min(0.9, (1 - l.soft) * 0.7)), rgba(l.color, 0.8)); gr.addColorStop(1, rgba(l.color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  }
  function render(g, doc, o) {
    o = o || {}; var s = o.s || 1; g.save(); g.setTransform(s, 0, 0, s, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (!o.transparent) drawBg(g, doc.bg, o);
    if (!o.transparent && doc.vig.on && !doc.vig.top) drawVig(g, doc.vig);
    doc.layers.forEach(function (l) {
      if (l.hidden || l.w < 1 || l.h < 1) return;
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, l.op)); g.translate(l.x + l.w / 2, l.y + l.h / 2); g.rotate((l.rot || 0) * Math.PI / 180); if (l.flipX || l.flipY) g.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1); g.translate(-l.w / 2, -l.h / 2);
      if (l.type === 'text') drawText(g, l, s); else if (l.type === 'image') drawImage(g, l, { edit: o.edit, s: s }); else if (l.type === 'shape') drawShape(g, l, s); else if (l.type === 'glow') drawGlow(g, l);
      g.restore();
    });
    if (!o.transparent && doc.vig.on && doc.vig.top) drawVig(g, doc.vig);
    g.restore();
  }
  function hit(doc, p) {
    for (var i = doc.layers.length - 1; i >= 0; i--) {
      var l = doc.layers[i]; if (l.hidden || l.lock) continue;
      var a = -(l.rot || 0) * Math.PI / 180, dx = p.x - (l.x + l.w / 2), dy = p.y - (l.y + l.h / 2), lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      var isE = (l.type === 'image' && l.shape === 'ellipse') || (l.type === 'shape' && l.kind === 'ellipse'), hw = Math.max(l.w, 28) / 2, hh = Math.max(l.h, 28) / 2;
      if (isE ? (lx * lx) / (hw * hw) + (ly * ly) / (hh * hh) <= 1 : Math.abs(lx) <= hw && Math.abs(ly) <= hh) return l;
    }
    return null;
  }
  function toCanvas(doc, scale, opt) {
    return ensureFonts(doc).then(function () { return loadAll(doc); }).then(function () {
      var c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
      render(c.getContext('2d'), doc, { s: scale, edit: false, transparent: !!(opt && opt.transparent) }); return c;
    });
  }
  function exportBlob(doc, scale, type, opt) { return toCanvas(doc, scale, opt).then(function (c) { return new Promise(function (res) { c.toBlob(res, type, 0.95); }); }); }
  function snapshot(doc, w, edit) {
    return ensureFonts(doc).then(function () { return loadAll(doc); }).then(function () {
      var s = (w || 480) / W, c = document.createElement('canvas'); c.width = Math.round(W * s); c.height = Math.round(H * s);
      render(c.getContext('2d'), doc, { s: s, edit: !!edit }); return c.toDataURL('image/jpeg', 0.82);
    });
  }

  function alphaBox(src) {
    var e = getImg(src); if (!e) return null;
    var im = e.img, nw = im.naturalWidth, nh = im.naturalHeight, k = Math.min(1, 500 / Math.max(nw, nh)), w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var p = 0.005, r = { cL: Math.max(0, x0 / w - p), cT: Math.max(0, y0 / h - p), cR: Math.max(0, 1 - (x1 + 1) / w - p), cB: Math.max(0, 1 - (y1 + 1) / h - p) };
    return r.cL + r.cT + r.cR + r.cB < 0.01 ? null : r;
  }

  /* ---------- backup / restore ---------- */
  function blobToData(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(b); }); }
  function dataToBlob(u) {
    var m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(u || ''); if (!m) return null;
    var bin = atob(m[2]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m[1] });
  }
  function cleanObj(dst, src) {
    if (!src || typeof src !== 'object') return dst;
    Object.keys(dst).forEach(function (k) {
      var dv = dst[k], v = src[k]; if (v === undefined || k === 'id') return;
      if (typeof v === 'number' && !isFinite(v)) return;
      if (dv === null ? (v === null || typeof v === 'string') : typeof v === typeof dv) dst[k] = typeof v === 'string' ? v.slice(0, 2000) : v;
    });
    return dst;
  }
  function cleanSrc(v, keys) { return typeof v === 'string' && ((v.indexOf('asset:') === 0 && ASSETS[v.slice(6)]) || (v.indexOf('db:') === 0 && keys.has(v.slice(3)))) ? v : null; }
  function cleanDoc(doc, keys) {
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.layers) || !doc.bg) return null;
    var d = emptyDoc(); cleanObj(d.bg, doc.bg); cleanObj(d.vig, doc.vig); if (typeof doc.lay === 'string' && /^[a-z]{1,20}$/.test(doc.lay)) d.lay = doc.lay;
    if (['color', 'gradient', 'image'].indexOf(d.bg.type) < 0) d.bg.type = 'color';
    d.bg.src = cleanSrc(d.bg.src, keys); d.bg.orig = null;
    d.layers = doc.layers.filter(function (l) { return l && ['text', 'image', 'shape', 'glow'].indexOf(l.type) >= 0; }).slice(0, 60).map(function (l) {
      var n = cleanObj(L(l.type), l); n.id = typeof l.id === 'string' && /^[a-z0-9]{1,40}$/i.test(l.id) ? l.id : uid();
      if ('src' in n) { n.src = cleanSrc(n.src, keys); n.orig = cleanSrc(n.orig, keys); }
      return n;
    });
    return d;
  }
  async function backup(cats, tpls) {
    var keys = new Set(), images = {};
    cats.forEach(function (c) { if (c.baseDoc) refs(c.baseDoc).forEach(function (k) { keys.add(k); }); });
    tpls.forEach(function (t) { refs(t.doc).forEach(function (k) { keys.add(k); }); });
    for (var k of keys) { var b = await idb.get('img', k); if (b) images[k] = await blobToData(b); }
    return new Blob([JSON.stringify({ app: 'thumbstudio', v: 1, date: Date.now(), cats: cats, tpls: tpls, images: images })], { type: 'application/json' });
  }
  async function restore(file) {
    if (!file || file.size > 400 * 1024 * 1024 || !/\.json$/i.test(file.name || '')) throw new Error('file');
    var j = JSON.parse(await file.text());
    if (!j || j.app !== 'thumbstudio' || !Array.isArray(j.cats) || !Array.isArray(j.tpls)) throw new Error('format');
    var keys = new Set(), imgs0 = j.images && typeof j.images === 'object' ? j.images : {};
    for (var k of Object.keys(imgs0)) { if (!/^u[a-z0-9]{4,40}$/i.test(k)) continue; var b = dataToBlob(imgs0[k]); if (!b || b.size > 40 * 1024 * 1024) continue; await idb.put('img', k, b); keys.add(k); }
    var cats = j.cats.filter(function (c) { return c && typeof c.id === 'string'; }).slice(0, 30).map(function (c) {
      return { id: c.id.slice(0, 40), name: String(c.name || 'Kategori').slice(0, 40), desc: String(c.desc || '').slice(0, 200), base: BASES[c.base] ? c.base : 'blank', baseDoc: c.baseDoc ? cleanDoc(c.baseDoc, keys) : null };
    });
    var per = {}, tpls = [];
    j.tpls.forEach(function (t) {
      if (!t || typeof t.id !== 'string' || !cats.some(function (c) { return c.id === t.catId; })) return;
      per[t.catId] = (per[t.catId] || 0) + 1; if (per[t.catId] > MAX_TPL) return;
      var doc = cleanDoc(t.doc, keys); if (!doc) return;
      tpls.push({ id: t.id.slice(0, 40), catId: t.catId, name: String(t.name || 'Uten navn').slice(0, 60), doc: doc, thumb: typeof t.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(t.thumb) ? t.thumb : '', updated: isFinite(t.updated) ? +t.updated : Date.now() });
    });
    return { cats: cats, tpls: tpls };
  }

  /* ---------- optional AI cut-out (transformers.js, runs locally) ---------- */
  var T = null, pipes = {}, MODELS = { person: 'Xenova/modnet', object: 'onnx-community/BiRefNet_lite-ONNX' };
  function lib() { return T || (T = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1').then(function (m) { m.env.allowLocalModels = false; return m; })); }
  async function getPipe(key, onProg, wasmOnly) {
    if (pipes[key] && !(wasmOnly && pipes[key]._dev !== 'wasm')) return pipes[key];
    var M = await lib(), gpu = false;
    if (!wasmOnly && navigator.gpu) { try { gpu = !!(await navigator.gpu.requestAdapter()); } catch (e) {} }
    var tries = gpu ? [['webgpu', key === 'object' ? 'fp16' : 'fp32'], ['wasm', 'fp32']] : [['wasm', 'fp32']], err = null;
    for (var i = 0; i < tries.length; i++) {
      try { var p = await M.pipeline('background-removal', MODELS[key], { device: tries[i][0], dtype: tries[i][1], progress_callback: onProg }); p._dev = tries[i][0]; p._dtype = tries[i][1]; return (pipes[key] = p); } catch (e) { err = e; }
    }
    throw err || new Error('pipeline');
  }
  function minLine(inp, outp, b, st, len, r, q) { var h = 0, t = 0; for (var k = 0; k < len + r; k++) { if (k < len) { var v = inp[b + k * st]; while (t > h && inp[b + q[t - 1] * st] >= v) t--; q[t++] = k; } var c = k - r; if (c >= 0) { while (q[h] < c - r) h++; outp[b + c * st] = inp[b + q[h] * st]; } } }
  function blurLine(inp, outp, b, st, len, r) { var s = 0, n = 0; for (var k = 0; k < Math.min(len, r + 1); k++) { s += inp[b + k * st]; n++; } for (var c = 0; c < len; c++) { outp[b + c * st] = s / n; var a = c + r + 1; if (a < len) { s += inp[b + a * st]; n++; } var d = c - r; if (d >= 0) { s -= inp[b + d * st]; n--; } } }
  function sep(src, w, h, r, f) { var tmp = new Uint8ClampedArray(w * h), out = new Uint8ClampedArray(w * h), q = new Int32Array(Math.max(w, h)); for (var y = 0; y < h; y++) f(src, tmp, y * w, 1, w, r, q); for (var x = 0; x < w; x++) f(tmp, out, x, w, h, r, q); return out; }
  async function cutout(blob, kind, onProg) {
    var bmp = await createImageBitmap(blob), w = bmp.width, h = bmp.height, src = document.createElement('canvas'); src.width = w; src.height = h; src.getContext('2d').drawImage(bmp, 0, 0); if (bmp.close) bmp.close();
    var files = {}, prog = function (p) { if (!p || p.status !== 'progress' || !p.total) return; files[p.file] = [p.loaded || 0, p.total]; var v = Object.values(files); onProg && onProg('model', Math.min(100, Math.round(100 * v.reduce(function (s, x) { return s + x[0]; }, 0) / Math.max(1, v.reduce(function (s, x) { return s + x[1]; }, 0))))); };
    var u = URL.createObjectURL(blob);
    var infer = async function (pipe) {
      var out = await pipe(u), im = Array.isArray(out) ? out[0] : out, c = im.toCanvas(), t = document.createElement('canvas'); t.width = w; t.height = h;
      var tg = t.getContext('2d'); tg.drawImage(c, 0, 0, w, h); var d = tg.getImageData(0, 0, w, h).data, a = new Uint8ClampedArray(w * h), ch = im.channels === 4 ? 3 : 0;
      for (var i = 0; i < a.length; i++) a[i] = d[i * 4 + ch]; return a;
    };
    var degenerate = function (a) { var n = 0; for (var i = 0; i < a.length; i += 7) if (a[i] > 128) n++; var f = n / Math.ceil(a.length / 7); return f < 0.002 || f > 0.998; };
    try {
      onProg && onProg('model', 0);
      var pipe = await getPipe(kind, prog, false), a = null; onProg && onProg('run', 0);
      try { a = await infer(pipe); if (pipe._dtype === 'fp16' && degenerate(a)) a = null; } catch (e) { if (pipe._dev === 'wasm') throw e; }
      if (!a) { pipe = await getPipe(kind, prog, true); onProg && onProg('run', 0); a = await infer(pipe); }
      var N = w * h, sc = Math.max(w, h) / 1000, hd = new Uint8ClampedArray(N);
      for (var i = 0; i < N; i++) { var v = a[i]; hd[i] = v <= 24 ? 0 : v >= 232 ? 255 : (v - 24) * 255 / 208; }
      var r = Math.round(2 * sc), er = r > 0 ? sep(hd, w, h, r, minLine) : hd, fr = Math.round(1.5 * sc), fin = er;
      if (fr > 0) { var bl = sep(sep(er, w, h, fr, blurLine), w, h, fr, blurLine); fin = new Uint8ClampedArray(N); for (var j = 0; j < N; j++) fin[j] = bl[j] < er[j] ? bl[j] : er[j]; }
      var g = src.getContext('2d'), id = g.getImageData(0, 0, w, h), dd = id.data; for (var k = 0; k < N; k++) dd[k * 4 + 3] = Math.min(dd[k * 4 + 3], fin[k]); g.putImageData(id, 0, 0);
      var outBlob = await new Promise(function (res) { src.toBlob(res, 'image/png'); });
      return putBlob(outBlob);
    } finally { URL.revokeObjectURL(u); }
  }

  function fitSize(l) { if (!l || l.type !== 'text' || !String(l.text || '').trim()) return l ? l.size : 0; if (!_mc) _mc = document.createElement('canvas').getContext('2d'); return tfit(_mc, l).size; }
  var COMBOS = [
    { k: 'default', name: 'Standard', sw: ['#000000', '#f5b800', '#ffffff'] },
    { k: 'bw', name: 'Svart på hvit', p: { bg: '#ffffff', bg2: '#ececec', fg: '#111111', fill: '#dcdcdc', acc: '#5f5f5f', mid: '#9a9a9a' } },
    { k: 'wb', name: 'Hvit og svart', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffffff', fill: '#2c2c2c', acc: '#c4c4c4', mid: '#7a7a7a' } },
    { k: 'by', name: 'Svart og gul', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffd21f', fill: '#2e2a14', acc: '#ffd21f', mid: '#8a7a30' } },
    { k: 'ow', name: 'Oransje og hvit', p: { bg: '#ff6a13', bg2: '#d9500a', fg: '#ffffff', fill: '#a83a00', acc: '#1a1a1a', mid: '#ffb07a' } },
    { k: 'wr', name: 'Hvit og rød', p: { bg: '#ffffff', bg2: '#f2f2f2', fg: '#d7191f', fill: '#fde0e0', acc: '#d7191f', mid: '#ef9a9c' } },
    { k: 'guest', name: 'Gjest-farger', p: { bg: '#13315c', bg2: '#0b1d3a', fg: '#fff7ed', fill: '#ff6b4a', acc: '#ffb4a2', mid: '#c2410c' } },
    { k: 'violet', name: 'Hvit på mørk lilla/blå', p: { bg: '#2a1f6b', bg2: '#140f3d', fg: '#ffffff', fill: '#5b3fd1', acc: '#b9a8ff', mid: '#6d5fb0' } },
    { k: 'grr', name: 'Grå, rød og svart', p: { bg: '#3a3a3a', bg2: '#121212', fg: '#ffffff', fill: '#c8102e', acc: '#ff5a67', mid: '#8c8c8c' } },
    { k: 'wbl', name: 'Hvit og blå', p: { bg: '#0b4fd6', bg2: '#083a9e', fg: '#ffffff', fill: '#062c78', acc: '#cfe0ff', mid: '#6f9cf0' } },
    { k: 'wg', name: 'Hvit på grønn', p: { bg: '#0f6b3f', bg2: '#07472a', fg: '#ffffff', fill: '#0b5132', acc: '#b8f5cf', mid: '#5fb488' } }
  ];
  COMBOS.forEach(function (c) { if (c.p) c.sw = [c.p.bg, c.p.fill, c.p.fg]; });
  function hsl(h) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; var s = m[1]; if (s.length === 3) s = s.replace(/./g, '$&$&');
    var r = parseInt(s.slice(0, 2), 16) / 255, g = parseInt(s.slice(2, 4), 16) / 255, b = parseInt(s.slice(4, 6), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    return { l: l, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)) };
  }
  function mapCol(h, use, P) {
    var c = hsl(h); if (!c) return h; var neu = c.s < 0.2, dark = c.l < (neu ? 0.35 : 0.3), light = c.l > (neu ? 0.7 : 0.8);
    if (use === 'bg') return light ? P.fg : c.l < 0.2 ? P.bg2 : P.bg;
    if (dark) return use === 'fill' ? P.bg2 : P.bg;
    if (light) return P.fg;
    if (neu) return P.mid;
    return use === 'fill' ? P.fill : P.acc;
  }
  function recolor(doc, key) {
    var cb = COMBOS.find(function (c) { return c.k === key; }); if (!cb || !cb.p || !doc) return doc; var P = cb.p;
    ['color', 'c1', 'c2'].forEach(function (k) { if (doc.bg && typeof doc.bg[k] === 'string') doc.bg[k] = mapCol(doc.bg[k], 'bg', P); });
    (doc.layers || []).forEach(function (l) {
      Object.keys(l).forEach(function (k) {
        var v = l[k]; if (typeof v !== 'string' || v[0] !== '#' || k === 'id' || k === 'src') return;
        var use = /fill|^barColor$/.test(k) ? 'fill' : (l.type === 'glow' || /stroke|border|tint/i.test(k)) ? 'acc' : 'text';
        l[k] = mapCol(v, use, P);
      });
    });
    return doc;
  }
  window.TS = {
    W: W, H: H, MAX_IMG: MAX_IMG, MAX_TPL: MAX_TPL, FONTS: FONTS, ASSETS: ASSETS, PALETTE: PALETTE, BASE_LABELS: BASE_LABELS, COMBOS: COMBOS, recolor: recolor,
    uid: uid, clone: clone, L: L, base: base, layout: layout, loadState: loadState, saveCats: saveCats, saveTpls: saveTpls,
    render: render, fitSize: fitSize, barBox: barBox, hit: hit, snapshot: snapshot, exportBlob: exportBlob, ensureFonts: ensureFonts, loadSrc: loadSrc,
    backup: backup, restore: restore, alphaBox: alphaBox, url: url, getImg: getImg, putImage: putImage, blobOf: blobOf, refs: refs, countImgs: countImgs, gc: gc, okFile: okFile, cutout: cutout,
    onImage: function (f) { listeners.push(f); return function () { listeners = listeners.filter(function (x) { return x !== f; }); }; }
  };
})();
