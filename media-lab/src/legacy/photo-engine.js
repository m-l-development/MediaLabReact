/* Photo design: dokumentmodell, bildebehandling, tegning, lagring. Ingen avhengigheter (AI lastes ved behov). */
(function () {
  if (window.PD) return;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var uid = function (p) { return (p || 'l') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  var mk = function (w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  var FORMATS = [
    { k: 'sq', l: 'Instagram 1:1', w: 1080, h: 1080 }, { k: 'p45', l: 'Instagram 4:5', w: 1080, h: 1350 }, { k: 'story', l: 'Story 9:16', w: 1080, h: 1920 },
    { k: 'wide', l: '16:9', w: 1920, h: 1080 }, { k: 'a4', l: 'A4 plakat', w: 2480, h: 3508, mm: [210, 297] },
    { k: 'a3', l: 'A3 plakat', w: 3508, h: 4961, mm: [297, 420] }, { k: 'card', l: 'Visittkort', w: 1004, h: 650, mm: [85, 55] }
  ];
  var DPI = 300, BLEED_MM = 3, BLEED = Math.round(BLEED_MM / 25.4 * DPI);
  var FONTS = ['Archivo', 'Bebas Neue', 'Montserrat', 'Anton', 'Oswald', 'Playfair Display', 'League Spartan', 'DM Serif Display', 'Space Grotesk'];
  var ADJ = { exp: 0, bri: 0, con: 0, hi: 0, sh: 0, sat: 0, temp: 0, tint: 0, hue: 0, fade: 0, blur: 0, vig: 0, grain: 0, curve: null };
  var LOOKS = [
    ['none', 'Original', {}], ['warm', 'Varm', { temp: 35, sat: 8, con: 6 }], ['cool', 'Kjølig', { temp: -35, tint: -5, con: 4 }],
    ['film', 'Film', { con: 12, fade: 22, sat: -12, temp: 10, grain: 25, curve: [[0, 0.06], [0.25, 0.22], [0.75, 0.8], [1, 0.95]] }],
    ['bw', 'Svart-hvitt', { sat: -100, con: 18 }], ['noir', 'Noir', { sat: -100, con: 45, sh: -25, vig: 45, grain: 20 }],
    ['fade', 'Falmet', { fade: 38, con: -12, sat: -18 }], ['drama', 'Dramatisk', { con: 38, sh: -18, hi: -15, sat: -10, vig: 40 }],
    ['vintage', 'Vintage', { temp: 28, tint: 10, fade: 26, sat: -25, vig: 30, grain: 30 }], ['vivid', 'Levende', { sat: 38, con: 14, exp: 6 }],
    ['matte', 'Matt', { fade: 30, con: -6, sh: 12, curve: [[0, 0.1], [0.5, 0.52], [1, 0.92]] }], ['teal', 'Blågrønn og oransje', { temp: 12, tint: -14, sat: 16, con: 12, hue: -6 }]
  ];
  var BLENDS = [['source-over', 'Normal'], ['multiply', 'Multipliser'], ['screen', 'Raster'], ['overlay', 'Overlegg'], ['soft-light', 'Mykt lys'], ['color', 'Farge'], ['luminosity', 'Luminans']];

  /* ---------- lag ---------- */
  function imageLayer(o) { return Object.assign({ id: uid('i'), type: 'image', name: 'Bilde', src: null, x: 540, y: 540, w: 800, h: 600, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, flipX: false, flipY: false, cz: 1, cx: 0, cy: 0, adj: Object.assign({}, ADJ), look: 'none', mask: null }, o || {}); }
  function textLayer(o) { return Object.assign({ id: uid('t'), type: 'text', name: 'Tekst', text: 'Skriv her', x: 540, y: 540, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, font: 'Archivo', weight: 700, size: 96, color: '#ffffff', align: 'center', lh: 1.1, ls: 0, upper: false, strokeC: '#000000', strokeW: 0, shadow: 0 }, o || {}); }
  function shapeLayer(o) { return Object.assign({ id: uid('s'), type: 'shape', name: 'Form', kind: 'rect', x: 540, y: 540, w: 500, h: 300, rot: 0, op: 1, blend: 'source-over', hidden: false, locked: false, fill: '#f5b82c', fill2: null, gAng: 90, radius: 0, strokeC: '#ffffff', strokeW: 0 }, o || {}); }
  /* malhjelp: tekst med align left/right får venstre-/høyrekanten på x (lagets x er ellers midten av tekstboksen) */
  function pinText(L, edge) { var b = textBox(L); L.x = L.align === 'right' ? edge - b.w / 2 : L.align === 'left' ? edge + b.w / 2 : edge; return L; }
  function newDoc(w, h, tpl) {
    var d = { id: uid('p'), name: 'Uten navn', w: w, h: h, bg: '#ffffff', layers: [], created: Date.now(), updated: Date.now() };
    var T = TEMPLATES.find(function (t) { return t.k === tpl; }); if (T) T.make(d); return d;
  }
  var TEMPLATES = [
    { k: 'blank', l: 'Tomt', make: function () {} },
    { k: 'card2', l: 'Visittkort tosidig', make: function (d) {
      d.w = 1004; d.h = 650; d.bg = '#f3f1ec'; d.bleed = true; d.side = 'front'; var w = d.w, h = d.h, b = BLEED;
      d.layers.push(shapeLayer({ name: 'Fargefelt', x: w * 0.06 - b / 2, y: h / 2, w: w * 0.12 + b, h: h + 2 * b, fill: '#1d2a3a' }));
      d.layers.push(textLayer({ name: 'Navn', text: 'Fornavn Etternavn', x: w * 0.2, y: h * 0.36, size: 62, font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }));
      d.layers.push(textLayer({ name: 'Tittel', text: 'Tittel / rolle', x: w * 0.2, y: h * 0.47, size: 32, weight: 500, color: '#555555', align: 'left' }));
      d.layers.push(textLayer({ name: 'Kontakt', text: '+47 000 00 000\nnavn@menighet.no\nwww.menighet.no', x: w * 0.2, y: h * 0.72, size: 28, weight: 500, color: '#111111', align: 'left', lh: 1.35 }));
      d.back = { bg: '#1d2a3a', layers: [textLayer({ name: 'Navn på menigheten', text: 'MENIGHETEN', x: w / 2, y: h / 2, size: 72, font: 'Bebas Neue', weight: 400, ls: 6, color: '#f3f1ec' })] };
      d.layers.forEach(function (L) { if (L.type === 'text' && L.align === 'left') { var bx = textBox(L); L.x += bx.w / 2; } });
    } },
    { k: 'photo', l: 'Bilde med tittel', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h); d.bg = '#111111';
      d.layers.push(imageLayer({ name: 'Bakgrunnsbilde', x: w / 2, y: h / 2, w: w, h: h }));
      d.layers.push(shapeLayer({ name: 'Toning', x: w / 2, y: h * 0.75, w: w, h: h / 2, fill: 'rgba(0,0,0,0)', fill2: '#000000', gAng: 180, op: 0.85 }));
      d.layers.push(textLayer({ name: 'Tittel', text: 'Tittel her', x: w / 2, y: h * 0.78, size: Math.round(m * 0.11), font: 'Bebas Neue', weight: 400, upper: true, ls: 2 }));
      d.layers.push(textLayer({ name: 'Undertittel', text: 'Søndag kl. 11:00', x: w / 2, y: h * 0.78 + m * 0.1, size: Math.round(m * 0.038), font: 'Archivo', weight: 500, color: '#e9e7e2' })); } },
    { k: 'quote', l: 'Sitat', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h); d.bg = '#1d2a3a';
      d.layers.push(textLayer({ name: 'Sitat', text: '«Skriv et sitat\nsom betyr noe»', x: w / 2, y: h * 0.46, size: Math.round(m * 0.075), font: 'Playfair Display', weight: 600, lh: 1.2 }));
      d.layers.push(shapeLayer({ name: 'Strek', x: w / 2, y: h * 0.62, w: m * 0.12, h: Math.max(4, m * 0.006), fill: '#f5b82c' }));
      d.layers.push(textLayer({ name: 'Kilde', text: 'NAVN / KILDE', x: w / 2, y: h * 0.68, size: Math.round(m * 0.03), weight: 600, ls: 4, color: '#c9c5bc' })); } },
    { k: 'event', l: 'Arrangement', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h); d.bg = '#f3f1ec';
      d.layers.push(imageLayer({ name: 'Bilde', x: w / 2, y: h * 0.32, w: w, h: h * 0.64 }));
      d.layers.push(textLayer({ name: 'Dato', text: 'FREDAG 12. OKTOBER', x: w / 2, y: h * 0.72, size: Math.round(m * 0.034), weight: 700, ls: 3, color: '#c0392b' }));
      d.layers.push(textLayer({ name: 'Tittel', text: 'Navn på\narrangementet', x: w / 2, y: h * 0.82, size: Math.round(m * 0.085), font: 'Montserrat', weight: 800, color: '#111111', lh: 1.02 }));
      d.layers.push(textLayer({ name: 'Sted', text: 'Sted · kl. 19:00', x: w / 2, y: h * 0.93, size: Math.round(m * 0.03), weight: 500, color: '#555555' })); } },
    { k: 'week', l: 'Ukeprogram', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h), mx = w * 0.08; d.bg = '#141414';
      var rows = [['TIRSDAG', '19:00', 'Kveldsmat i kafeen'], ['TORSDAG', '11:00', 'Bønn'], ['FREDAG', '19:00', 'Ungdomsmøte'], ['SØNDAG', '11:00', 'Gudstjeneste']];
      var top = h * 0.1 + m * 0.26, step = Math.min((h * 0.87 - top) / rows.length, m * 0.24); /* listen starter rett under tittelen */
      d.layers.push(pinText(textLayer({ name: 'Etikett', text: 'PROGRAM FOR UKEN', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 6, color: '#f5b82c', align: 'left' }), mx));
      d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'UKE 40', x: mx, y: h * 0.1 + m * 0.11, size: Math.round(m * 0.13), font: 'Bebas Neue', weight: 400, ls: 2, color: '#f3f1ec', align: 'left' }), mx));
      rows.forEach(function (r, i) { var y = top + step * i, n = i + 1;
        d.layers.push(pinText(textLayer({ name: 'Dag ' + n, text: r[0], x: mx, y: y, size: Math.round(m * 0.028), weight: 700, ls: 4, color: '#9d998f', align: 'left' }), mx));
        d.layers.push(pinText(textLayer({ name: 'Møte ' + n, text: r[2], x: mx, y: y + m * 0.055, size: Math.round(m * 0.05), font: 'Montserrat', weight: 700, color: '#f3f1ec', align: 'left' }), mx));
        d.layers.push(pinText(textLayer({ name: 'Klokkeslett ' + n, text: r[1], x: w - mx, y: y + m * 0.035, size: Math.round(m * 0.06), font: 'Bebas Neue', weight: 400, ls: 1, color: '#f5b82c', align: 'right' }), w - mx));
        if (i < rows.length - 1) d.layers.push(shapeLayer({ name: 'Skillelinje ' + n, x: w / 2, y: y + (step + m * 0.065) / 2, w: w - 2 * mx, h: Math.max(2, m * 0.002), fill: 'rgba(255,255,255,0.14)' })); });
      d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen! · www.menighet.no', x: mx, y: h * 0.94, size: Math.round(m * 0.026), weight: 500, color: '#9d998f', align: 'left' }), mx)); } },
    { k: 'day', l: 'Dagsprogram', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h), mx = w * 0.08; d.bg = '#f3f1ec';
      var rows = [['10:30', 'Kaffe og velkomst', 'Kafeen'], ['11:00', 'Gudstjeneste', 'Salen'], ['12:30', 'Kirkekaffe', 'Kafeen'], ['13:00', 'Søndagsskole', 'Barnesalen']];
      var top = h * 0.1 + m * 0.31, step = Math.min((h * 0.86 - top) / rows.length, m * 0.2), tx = mx + m * 0.2; /* listen starter rett under tittelen */
      d.layers.push(pinText(textLayer({ name: 'Dato', text: 'SØNDAG 5. OKTOBER', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 5, color: '#c0392b', align: 'left' }), mx));
      d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'Dagens\nprogram', x: mx, y: h * 0.1 + m * 0.15, size: Math.round(m * 0.1), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1 }), mx));
      d.layers.push(shapeLayer({ name: 'Tidslinje', x: mx + m * 0.155, y: top + (step * (rows.length - 1)) / 2 + m * 0.02, w: Math.max(3, m * 0.004), h: step * (rows.length - 1), fill: '#c0392b' }));
      rows.forEach(function (r, i) { var y = top + step * i, n = i + 1;
        d.layers.push(pinText(textLayer({ name: 'Klokkeslett ' + n, text: r[0], x: mx, y: y + m * 0.02, size: Math.round(m * 0.055), font: 'Bebas Neue', weight: 400, ls: 1, color: '#111111', align: 'left' }), mx));
        d.layers.push(shapeLayer({ name: 'Punkt ' + n, kind: 'ellipse', x: mx + m * 0.155, y: y + m * 0.02, w: m * 0.028, h: m * 0.028, fill: '#c0392b' }));
        d.layers.push(pinText(textLayer({ name: 'Punkt ' + n + ' tittel', text: r[1], x: tx, y: y + m * 0.005, size: Math.round(m * 0.045), font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }), tx));
        d.layers.push(pinText(textLayer({ name: 'Punkt ' + n + ' sted', text: r[2], x: tx, y: y + m * 0.05, size: Math.round(m * 0.028), weight: 500, color: '#6b675f', align: 'left' }), tx)); });
      d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen!', x: mx, y: h * 0.94, size: Math.round(m * 0.03), weight: 700, color: '#111111', align: 'left' }), mx)); } },
    { k: 'weekday', l: 'Ukeprogram (lys)', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h), mx = w * 0.08; d.bg = '#f3f1ec';
      var rows = [['TIRSDAG', 'Kveldsmat i kafeen', 'Kafeen'], ['TORSDAG', 'Bønn', 'Samlingsrommet'], ['FREDAG', 'Ungdomsmøte', 'Salen'], ['SØNDAG', 'Gudstjeneste', 'Kirken']];
      var top = h * 0.1 + m * 0.31, step = Math.min((h * 0.86 - m * 0.06 - top) / (rows.length - 1), m * 0.2); /* listen starter rett under tittelen og fyller ned mot bunnteksten */
      var days = rows.map(function (r, i) { return textLayer({ name: 'Dag ' + (i + 1), text: r[0], x: mx, y: top + step * i + m * 0.02, size: Math.round(m * 0.05), font: 'Bebas Neue', weight: 400, ls: 1, color: '#111111', align: 'left' }); });
      var dw = Math.max.apply(null, days.map(function (L) { return textBox(L).w; })), lx = mx + dw + m * 0.045, tx = lx + m * 0.045; /* tidslinjen står etter den bredeste ukedagen */
      d.layers.push(pinText(textLayer({ name: 'Dato', text: 'UKE 40', x: mx, y: h * 0.1, size: Math.round(m * 0.03), weight: 700, ls: 5, color: '#c0392b', align: 'left' }), mx));
      d.layers.push(pinText(textLayer({ name: 'Tittel', text: 'Ukens\nprogram', x: mx, y: h * 0.1 + m * 0.15, size: Math.round(m * 0.1), font: 'Montserrat', weight: 800, color: '#111111', align: 'left', lh: 1 }), mx));
      d.layers.push(shapeLayer({ name: 'Tidslinje', x: lx, y: top + (step * (rows.length - 1)) / 2 + m * 0.02, w: Math.max(3, m * 0.004), h: step * (rows.length - 1), fill: '#c0392b' }));
      rows.forEach(function (r, i) { var y = top + step * i, n = i + 1;
        d.layers.push(pinText(days[i], mx));
        d.layers.push(shapeLayer({ name: 'Punkt ' + n, kind: 'ellipse', x: lx, y: y + m * 0.02, w: m * 0.028, h: m * 0.028, fill: '#c0392b' }));
        d.layers.push(pinText(textLayer({ name: 'Møte ' + n, text: r[1], x: tx, y: y + m * 0.005, size: Math.round(m * 0.045), font: 'Montserrat', weight: 700, color: '#111111', align: 'left' }), tx));
        d.layers.push(pinText(textLayer({ name: 'Sted ' + n, text: r[2], x: tx, y: y + m * 0.05, size: Math.round(m * 0.028), weight: 500, color: '#6b675f', align: 'left' }), tx)); });
      d.layers.push(pinText(textLayer({ name: 'Bunntekst', text: 'Velkommen!', x: mx, y: h * 0.94, size: Math.round(m * 0.03), weight: 700, color: '#111111', align: 'left' }), mx)); } },
    { k: 'bold', l: 'Kunngjøring', make: function (d) { var w = d.w, h = d.h, m = Math.min(w, h); d.bg = '#f5b82c';
      d.layers.push(shapeLayer({ name: 'Ramme', x: w / 2, y: h / 2, w: w - m * 0.1, h: h - m * 0.1, fill: 'rgba(0,0,0,0)', strokeC: '#111111', strokeW: Math.max(4, m * 0.008) }));
      d.layers.push(textLayer({ name: 'Overskrift', text: 'VIKTIG\nBESKJED', x: w / 2, y: h * 0.45, size: Math.round(m * 0.16), font: 'Anton', weight: 400, color: '#111111', lh: 0.95 }));
      d.layers.push(textLayer({ name: 'Tekst', text: 'Skriv detaljene her', x: w / 2, y: h * 0.7, size: Math.round(m * 0.04), weight: 600, color: '#111111' })); } }
  ];

  /* ---------- bildebehandling ---------- */
  function curveFn(pts) {
    if (!pts || pts.length < 2) return null; var p = pts.slice().sort(function (a, b) { return a[0] - b[0]; }), n = p.length, d = [], m = [], i;
    for (i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / Math.max(1e-6, p[i + 1][0] - p[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { var t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    return function (x) { if (x <= p[0][0]) return p[0][1]; if (x >= p[n - 1][0]) return p[n - 1][1]; var k = 0; while (k < n - 2 && x > p[k + 1][0]) k++;
      var h = p[k + 1][0] - p[k][0], t = (x - p[k][0]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * p[k][1] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * p[k + 1][1] + (t3 - t2) * h * m[k + 1]; };
  }
  function luts(a) {
    var R = new Uint8ClampedArray(256), G = new Uint8ClampedArray(256), B = new Uint8ClampedArray(256), cf = curveFn(a.curve), ex = Math.pow(2, (a.exp || 0) / 50);
    var c = a.con || 0, cm = c > 0 ? 1 + c / 100 * 1.4 : 1 + c / 100 * 0.9, f = (a.fade || 0) / 100, t = (a.temp || 0) / 100, ti = (a.tint || 0) / 100;
    var gr = 1 + t * 0.14 + ti * 0.05, gg = 1 - ti * 0.1, gb = 1 - t * 0.16 + ti * 0.05;
    for (var v = 0; v < 256; v++) {
      var x = v / 255 * ex; x += (a.sh || 0) / 100 * 0.35 * Math.pow(1 - clamp(x, 0, 1), 2) * (1 - (1 - clamp(x, 0, 1)) * 0.4); x += (a.hi || 0) / 100 * 0.3 * Math.pow(clamp(x, 0, 1), 2);
      x += (a.bri || 0) / 100 * 0.28; x = (x - 0.5) * cm + 0.5; x = clamp(x, 0, 1); x = x * (1 - f * 0.28) + f * 0.14; if (cf) x = cf(x);
      R[v] = x * gr * 255; G[v] = x * gg * 255; B[v] = x * gb * 255;
    }
    return [R, G, B];
  }
  function satHue(a) {
    var s = 1 + (a.sat || 0) / 100, h = (a.hue || 0) * Math.PI / 180, cs = Math.cos(h), sn = Math.sin(h);
    var H = [0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928, 0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.140, 0.072 - cs * 0.072 - sn * 0.283, 0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072];
    var lr = 0.2126, lg = 0.7152, lb = 0.0722, S = [lr + (1 - lr) * s, lg - lg * s, lb - lb * s, lr - lr * s, lg + (1 - lg) * s, lb - lb * s, lr - lr * s, lg - lg * s, lb + (1 - lb) * s];
    var M = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) M[i * 3 + j] = S[i * 3] * H[j] + S[i * 3 + 1] * H[3 + j] + S[i * 3 + 2] * H[6 + j]; return M;
  }
  var neutral = function (a) { for (var k in ADJ) { if (k === 'curve') { if (a.curve && a.curve.length) return false; } else if (a[k]) return false; } return true; };
  var FILT = null; function hasFilter() { if (FILT == null) { try { var g = mk(2, 2).getContext('2d'); g.filter = 'blur(1px)'; FILT = g.filter === 'blur(1px)'; } catch (e) { FILT = false; } } return FILT; }
  function blurInto(src, r) {
    var W = src.width, H = src.height, o = mk(W, H), g = o.getContext('2d');
    if (hasFilter()) { g.filter = 'blur(' + r + 'px)'; g.drawImage(src, 0, 0); g.filter = 'none'; return o; }
    var k = Math.max(1, r / 1.6), s = mk(W / k, H / k); s.getContext('2d').drawImage(src, 0, 0, s.width, s.height); g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, W, H); return o;
  }
  /* entry = { img, w, h, cache:{} }  */
  function baseOf(E, maxD) {
    var s = Math.min(1, maxD / Math.max(E.w, E.h)), k = 'b' + Math.round(E.w * s); if (E.cache[k]) return E.cache[k];
    var c = mk(E.w * s, E.h * s); c.getContext('2d').drawImage(E.img, 0, 0, c.width, c.height); E.cache[k] = c; return c;
  }
  function processed(E, L, maskC, maskV, maxD) {
    var a = L.adj || ADJ, ak = 'a' + maxD + '|' + JSON.stringify(a), key = ak + '|' + (maskC ? maskV : 0);
    if (E.cache._pk === key && E.cache._p) return E.cache._p;
    var out;
    if (E.cache._ak === ak && E.cache._a) out = E.cache._a;
    else { out = adjusted(E, a, maxD); E.cache._ak = ak; E.cache._a = out; }
    if (maskC) { var fin = mk(out.width, out.height), fg = fin.getContext('2d'); fg.drawImage(out, 0, 0); fg.globalCompositeOperation = 'destination-in'; fg.imageSmoothingQuality = 'high'; fg.drawImage(maskC, 0, 0, fin.width, fin.height); out = fin; }
    E.cache._pk = key; E.cache._p = out; return out;
  }
  function adjusted(E, a, maxD) {
    var b = baseOf(E, maxD), W = b.width, H = b.height, out = mk(W, H), g = out.getContext('2d');
    if (neutral(a)) g.drawImage(b, 0, 0);
    else {
      var src = b; if (a.blur > 0) src = blurInto(b, a.blur / 100 * 0.025 * Math.max(W, H));
      g.drawImage(src, 0, 0); var id = g.getImageData(0, 0, W, H), d = id.data, T = luts(a), R = T[0], G = T[1], B = T[2], M = satHue(a), mx = (a.sat || 0) !== 0 || (a.hue || 0) !== 0, gr = (a.grain || 0) * 0.5, seed = 1234567;
      for (var i = 0; i < d.length; i += 4) {
        var r = R[d[i]], gg = G[d[i + 1]], bb = B[d[i + 2]];
        if (mx) { var r2 = M[0] * r + M[1] * gg + M[2] * bb, g2 = M[3] * r + M[4] * gg + M[5] * bb, b2 = M[6] * r + M[7] * gg + M[8] * bb; r = r2; gg = g2; bb = b2; }
        if (gr) { seed = (seed * 1664525 + 1013904223) >>> 0; var n = ((seed >>> 8) / 16777216 - 0.5) * gr; r += n; gg += n; bb += n; }
        d[i] = r; d[i + 1] = gg; d[i + 2] = bb;
      }
      g.putImageData(id, 0, 0);
      if (a.vig) { var v = a.vig / 100, rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, v > 0 ? 'rgba(0,0,0,' + (v * 0.85) + ')' : 'rgba(255,255,255,' + (-v * 0.8) + ')');
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = rg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    }
    return out;
  }
  /* utsnitt: innholdet dekker rammen (w×h) med zoom cz og forskyvning cx/cy (-1..1) */
  function cover(sw, sh, w, h, cz, cx, cy) {
    var s = Math.max(w / sw, h / sh) * (cz || 1), vw = w / s, vh = h / s, mx = (sw - vw) / 2, my = (sh - vh) / 2;
    return { sx: mx + clamp(cx || 0, -1, 1) * mx, sy: my + clamp(cy || 0, -1, 1) * my, sw: vw, sh: vh, s: s };
  }

  /* ---------- tekst ---------- */
  var MC = null;
  function textBox(L) {
    if (!MC) MC = mk(4, 4).getContext('2d'); var g = MC; g.font = (L.weight || 400) + ' ' + L.size + 'px "' + L.font + '", Archivo, sans-serif'; try { g.letterSpacing = (L.ls || 0) + 'px'; } catch (e) {}
    var lines = String(L.upper ? L.text.toUpperCase() : L.text).split('\n'), w = 0; lines.forEach(function (s) { w = Math.max(w, g.measureText(s || ' ').width); });
    return { w: Math.max(L.size * 0.4, w + (L.strokeW || 0)) * (L.tsx || 1), h: lines.length * L.size * (L.lh || 1.1) * (L.tsy || 1), lines: lines };
  }
  function dims(L) { if (L.type === 'text') { var b = textBox(L); return { w: b.w, h: b.h }; } return { w: L.w, h: L.h }; }

  /* ---------- tegning ---------- */
  function drawLayer(g, L, M, o) {
    var dm = dims(L); g.save(); g.translate(L.x, L.y); if (L.rot) g.rotate(L.rot * Math.PI / 180); g.globalAlpha = clamp(L.op == null ? 1 : L.op, 0, 1); g.globalCompositeOperation = L.blend || 'source-over';
    if (L.type === 'image') {
      var E = L.src && M.media[L.src], w = dm.w, h = dm.h;
      if (!E) { if (!o.noPh) { g.fillStyle = '#2a2a2a'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = '#555'; g.lineWidth = Math.max(2, Math.min(w, h) * 0.006); g.setLineDash([Math.min(w, h) * 0.03, Math.min(w, h) * 0.02]); g.strokeRect(-w / 2, -h / 2, w, h); g.setLineDash([]);
        g.fillStyle = '#9d998f'; g.font = '600 ' + Math.max(14, Math.min(w, h) * 0.06) + 'px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.phText || 'Dra inn et bilde', 0, 0); } }
      else {
        var need = Math.max(w, h) * o.scale * (L.cz || 1) * 1.15, maxD = o.full ? 8192 : clamp(Math.ceil(need / 256) * 256, 256, o.preview || 1600);
        var mc = M.masks[L.id], P = processed(E, L, mc, mc ? mc._v || 1 : 0, maxD), k = P.width / E.w, r = cover(E.w, E.h, w, h, L.cz, L.cx, L.cy);
        g.scale(L.flipX ? -1 : 1, L.flipY ? -1 : 1); g.imageSmoothingQuality = 'high';
        if (L.tint) { var tw = Math.max(1, Math.min(4096, Math.ceil(Math.abs(w) * o.scale * 1.5))), th = Math.max(1, Math.min(4096, Math.ceil(Math.abs(h) * o.scale * 1.5))), tc = mk(tw, th), tg = tc.getContext('2d');
          tg.drawImage(P, r.sx * k, r.sy * k, r.sw * k, r.sh * k, 0, 0, tw, th); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = L.tint; tg.fillRect(0, 0, tw, th); g.drawImage(tc, -w / 2, -h / 2, w, h); }
        else g.drawImage(P, r.sx * k, r.sy * k, r.sw * k, r.sh * k, -w / 2, -h / 2, w, h);
      }
    } else if (L.type === 'fx') {
      if (window.MLFX) window.MLFX.draw(g, L, dm.w, dm.h, o);
    } else if (L.type === 'shape') {
      var w2 = L.w, h2 = L.h, fs = L.fill;
      if (L.fill2) { var an = (L.gAng || 0) * Math.PI / 180, dx = Math.sin(an) * w2 / 2, dy = -Math.cos(an) * h2 / 2, lg = g.createLinearGradient(-dx, -dy, dx, dy); lg.addColorStop(0, L.fill || 'rgba(0,0,0,0)'); lg.addColorStop(1, L.fill2); fs = lg; }
      shapePath(g, L.kind, w2, h2, L.radius);
      g.fillStyle = fs; g.fill(L.kind === 'ring' ? 'evenodd' : 'nonzero'); if (L.strokeW > 0) { g.lineWidth = L.strokeW; g.strokeStyle = L.strokeC; g.stroke(); }
    } else if (L.type === 'glow') {
      var gw = Math.max(1, Math.abs(dm.w) / 2), gh = Math.max(1, Math.abs(dm.h) / 2), sf = clamp(L.soft == null ? 0.6 : L.soft, 0, 1); g.scale(1, gh / gw);
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, gw); gr.addColorStop(0, rgba(L.color, 1)); gr.addColorStop(Math.max(0.02, (1 - sf) * 0.7), rgba(L.color, 0.8)); gr.addColorStop(1, rgba(L.color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, gw, 0, Math.PI * 2); g.fill();
    } else if (L.type === 'text') {
      var tsx = L.tsx || 1, tsy = L.tsy || 1, b = textBox(L); b = { w: b.w / tsx, h: b.h / tsy, lines: b.lines }; g.scale(tsx, tsy); /* strukket tekst: tegnes i vanlig størrelse og skaleres */
      var lh = L.size * (L.lh || 1.1), ax = L.align === 'left' ? -b.w / 2 : L.align === 'right' ? b.w / 2 : 0;
      g.font = (L.weight || 400) + ' ' + L.size + 'px "' + L.font + '", Archivo, sans-serif'; try { g.letterSpacing = (L.ls || 0) + 'px'; } catch (e) {}
      g.textAlign = L.align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if (L.shadow > 0) { g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = L.shadow / 100 * L.size * 0.6; g.shadowOffsetY = L.shadow / 100 * L.size * 0.08; }
      b.lines.forEach(function (s, i) { var y = -b.h / 2 + lh * (i + 0.5); if (L.strokeW > 0) { g.lineWidth = L.strokeW * 2; g.strokeStyle = L.strokeC; g.strokeText(s, ax, y); } g.fillStyle = L.color; g.fillText(s, ax, y); });
      if (L.bar) { var bw = b.w * clamp(L.barW == null ? 1 : +L.barW, 0.05, 3), bh = L.barH == null ? L.size * 0.07 : +L.barH, bx = L.align === 'left' ? -b.w / 2 : L.align === 'right' ? b.w / 2 - bw : -bw / 2; g.fillStyle = L.barColor || L.color; g.fillRect(bx, b.h / 2 + L.size * 0.18 * (L.barGap == null ? 1 : +L.barGap), bw, bh); }
    }
    g.restore();
  }
  function rgba(c, a) { var m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return c || 'rgba(255,255,255,' + a + ')'; var n = parseInt(m[1], 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function drawVig(g, doc, bl) { var v = doc.vig, W = doc.w, H = doc.h, R = Math.hypot(W, H) / 2, sz = clamp(v.size == null ? 0.55 : v.size, 0, 1), rg = g.createRadialGradient(W / 2, H / 2, R * sz * 0.9, W / 2, H / 2, R * 1.02);
    rg.addColorStop(0, rgba(v.color || '#000000', 0)); rg.addColorStop(1, rgba(v.color || '#000000', clamp(v.amt == null ? 0.6 : v.amt, 0, 1))); g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = rg; g.fillRect(-bl, -bl, W + 2 * bl, H + 2 * bl); g.restore(); }
  var SHAPES = [['rect', 'Rektangel'], ['ellipse', 'Sirkel'], ['triangle', 'Trekant'], ['diamond', 'Rombe'], ['hexagon', 'Sekskant'], ['star', 'Stjerne'], ['arrow', 'Pil'], ['line', 'Linje'], ['ring', 'Ring']];
  function shapePath(g, kind, w, h, rad) {
    var x = -w / 2, y = -h / 2, aw = Math.abs(w) / 2, ah = Math.abs(h) / 2, i; g.beginPath();
    if (kind === 'ellipse') { g.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2); return; }
    if (kind === 'ring') { g.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2); g.moveTo(aw * 0.62, 0); g.ellipse(0, 0, aw * 0.62, ah * 0.62, 0, 0, Math.PI * 2); return; }
    if (kind === 'triangle') { g.moveTo(0, y); g.lineTo(-x, -y); g.lineTo(x, -y); g.closePath(); return; }
    if (kind === 'diamond') { g.moveTo(0, y); g.lineTo(-x, 0); g.lineTo(0, -y); g.lineTo(x, 0); g.closePath(); return; }
    if (kind === 'hexagon') { for (i = 0; i < 6; i++) { var a = Math.PI / 3 * i; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * aw, Math.sin(a) * ah); } g.closePath(); return; }
    if (kind === 'star') { for (i = 0; i < 10; i++) { var b = -Math.PI / 2 + Math.PI / 5 * i, q = i % 2 ? 0.45 : 1; g[i ? 'lineTo' : 'moveTo'](Math.cos(b) * aw * q, Math.sin(b) * ah * q); } g.closePath(); return; }
    if (kind === 'arrow') { var hx = aw * 0.2, sh = ah * 0.42; g.moveTo(-aw, -sh); g.lineTo(hx, -sh); g.lineTo(hx, -ah); g.lineTo(aw, 0); g.lineTo(hx, ah); g.lineTo(hx, sh); g.lineTo(-aw, sh); g.closePath(); return; }
    var rr = kind === 'line' ? Math.min(aw, ah) : Math.min(rad || 0, aw, ah); if (g.roundRect && rr) g.roundRect(x, y, w, h, rr); else g.rect(x, y, w, h);
  }
  /* bakgrunnsgradient (samme motor som Loop Studio) */
  function drawFill(ctx, bf, W, H) {
    ctx.save();
        var st = Array.isArray(bf.stops) && bf.stops.length ? bf.stops.slice().sort(function (a, b) { return a.p - b.p; }) : [{ c: bf.c1 || '#1a1a1a', p: 0 }, { c: bf.c2 || '#000000', p: 1 }];
        var sfv = bf.soft == null ? 0.5 : clamp(bf.soft, 0, 1), SFk = 0.08 + 1.84 * sfv;
        if (st.length > 1 && sfv !== 0.5) { var mm = 0; st.forEach(function (q) { mm += q.p; }); mm /= st.length; st = st.map(function (q) { return { c: q.c, w: q.w, hard: q.hard, p: clamp(mm + (q.p - mm) * SFk, 0, 1) }; }); }
        var bandW = st.map(function (q) { return clamp(Number(q.w) || 0, 0, 1); });
        if (bandW.some(function (w) { return w > 0; }) && ['stripes', 'mesh', 'glow', 'solid'].indexOf(bf.mode) < 0) {
          var ex = []; st.forEach(function (q, i) { var h = bandW[i] / 2; if (h > 0) { ex.push({ c: q.c, p: clamp(q.p - h, 0, 1) }, { c: q.c, p: clamp(q.p + h, 0, 1), hard: q.hard }); } else ex.push({ c: q.c, p: q.p, hard: q.hard }); });
          ex.sort(function (a, b) { return a.p - b.p; }); st = ex;
        }
        var shp = clamp(Number(bf.sharp) || 0, 0, 1);
        var anyHard = st.some(function (q) { return q.hard; });
        if ((shp > 0 || anyHard) && st.length > 1 && ['stripes', 'mesh', 'glow', 'solid', 'rays'].indexOf(bf.mode) < 0) {
          var sh = [st[0]]; for (var si = 1; si < st.length; si++) { var qa = st[si - 1], qb = st[si], k2 = qa.hard ? 1 : shp, mid = (qa.p + qb.p) / 2, hw = (qb.p - qa.p) / 2 * (1 - k2 * 0.995); sh.push({ c: qa.c, p: mid - hw, hard: qa.hard }, { c: qb.c, p: mid + hw, hard: qb.hard }, qb); } st = sh;
        }
        var put = function (g, list) { list.forEach(function (q) { g.addColorStop(clamp(q.p, 0, 1), q.c); }); return g; };
        var ang = (bf.angle == null ? 135 : bf.angle) * Math.PI / 180, cx0 = W * (bf.x == null ? 0.5 : bf.x), cy0 = H * (bf.y == null ? 0.5 : bf.y);
        var lin = function () { var dx0 = Math.sin(ang), dy0 = -Math.cos(ang), ln = Math.abs(W * dx0) + Math.abs(H * dy0); return ctx.createLinearGradient(cx0 - dx0 * ln / 2, cy0 - dy0 * ln / 2, cx0 + dx0 * ln / 2, cy0 + dy0 * ln / 2); };
        var offX = cx0 - W / 2, offY = cy0 - H / 2;
        if (bf.mode === 'solid') { ctx.fillStyle = st[0].c; ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'radial') { ctx.fillStyle = put(ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.hypot(W, H) * 0.6), st); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'mirror') { var ms = st.map(function (q) { return { c: q.c, p: q.p / 2 }; }).concat(st.slice().reverse().map(function (q) { return { c: q.c, p: 1 - q.p / 2 }; })); ctx.fillStyle = put(lin(), ms); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'conic' && ctx.createConicGradient) { ctx.fillStyle = put(ctx.createConicGradient(ang - Math.PI / 2, cx0, cy0), st.concat([{ c: st[0].c, p: 1 }])); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'mesh') {
          var PP = [[0.15, 0.2], [0.85, 0.25], [0.8, 0.85], [0.2, 0.8], [0.5, 0.5], [0.5, 0.1]], R0 = Math.max(W, H) * 0.75 * (0.4 + 1.2 * sfv);
          ctx.fillStyle = st[st.length - 1].c; ctx.fillRect(0, 0, W, H);
          st.forEach(function (q, i) { var pp = PP[i % PP.length], mx = pp[0] * W + offX, my = pp[1] * H + offY, g = ctx.createRadialGradient(mx, my, 0, mx, my, R0 * (0.6 + 1.2 * (Number(q.w) || 0))); g.addColorStop(0, q.c); if (shp > 0) g.addColorStop(shp * 0.9, q.c); g.addColorStop(1, rgba(q.c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
        }
        else if ((bf.mode === 'conicRep' || bf.mode === 'conicMirror' || bf.mode === 'rays' || bf.mode === 'conicCorner') && ctx.createConicGradient) {
          var nR = Math.max(1, Math.min(24, Math.round(Number(bf.repeat) || (bf.mode === 'rays' ? 8 : 3)))), ccx = cx0, ccy = cy0, cl = [];
          if (bf.mode === 'conicCorner') { ccx = W * (0.5 + 0.5 * Math.sin(ang)); ccy = H * (0.5 - 0.5 * Math.cos(ang)); nR = 1; }
          for (var cr = 0; cr < nR; cr++) {
            if (bf.mode === 'rays') st.forEach(function (q, i) { var a0 = (cr + i / st.length) / nR, a1 = (cr + (i + 1) / st.length) / nR - 0.0004; cl.push({ c: q.c, p: a0 }, { c: q.c, p: a1 }); });
            else if (bf.mode === 'conicMirror') { st.forEach(function (q) { cl.push({ c: q.c, p: (cr + q.p / 2) / nR }); }); st.slice().reverse().forEach(function (q) { cl.push({ c: q.c, p: (cr + 1 - q.p / 2) / nR }); }); }
            else { st.forEach(function (q) { cl.push({ c: q.c, p: (cr + q.p * 0.999) / nR }); }); }
          }
          if (bf.mode !== 'rays' && bf.mode !== 'conicMirror') cl.push({ c: st[0].c, p: 1 });
          cl.sort(function (a, b) { return a.p - b.p; });
          ctx.fillStyle = put(ctx.createConicGradient(ang - Math.PI / 2, ccx, ccy), cl); ctx.fillRect(0, 0, W, H);
        }
        else if (bf.mode === 'stripes') { var rpN = Math.max(1, Math.min(20, Math.round(Number(bf.repeat) || 1))), hs = [], wsum = 0, ww = st.map(function (q) { var v = 0.3 + (Number(q.w) || 0) * 2; wsum += v; return v; }); for (var rr = 0; rr < rpN; rr++) { var acc = 0; st.forEach(function (q, i) { var a0 = (rr + acc / wsum) / rpN; acc += ww[i]; var a1 = (rr + acc / wsum) / rpN - 0.0005; hs.push({ c: q.c, p: a0 }, { c: q.c, p: a1 }); }); } ctx.fillStyle = put(lin(), hs); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'wave') { var ws = [], wN = Math.max(1, Math.min(20, Math.round(Number(bf.repeat) || 3))); for (var rp = 0; rp < wN; rp++) st.forEach(function (q) { ws.push({ c: q.c, p: (rp + q.p * (rp % 2 ? -1 : 1) + (rp % 2 ? 1 : 0)) / wN }); }); ws.sort(function (a, b) { return a.p - b.p; }); ctx.fillStyle = put(lin(), ws); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'ellipse') { ctx.save(); ctx.translate(cx0, cy0); ctx.scale(W / Math.max(W, H), H / Math.max(W, H)); var RR = Math.max(W, H) * 0.72; ctx.fillStyle = put(ctx.createRadialGradient(0, 0, 0, 0, 0, RR), st); ctx.fillRect(-RR * 2, -RR * 2, RR * 4, RR * 4); ctx.restore(); }
        else if (bf.mode === 'corner') { var kx = W * (0.5 + 0.5 * Math.sin(ang)), ky = H * (0.5 - 0.5 * Math.cos(ang)); ctx.fillStyle = put(ctx.createRadialGradient(kx, ky, 0, kx, ky, Math.hypot(W, H)), st); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'spot') { var sr = Math.min(W, H) * 0.55; ctx.fillStyle = put(ctx.createRadialGradient(cx0, cy0 - H * 0.08, 0, cx0, cy0, sr), st); ctx.fillRect(0, 0, W, H); }
        else if (bf.mode === 'glow') {
          ctx.fillStyle = st[st.length - 1].c; ctx.fillRect(0, 0, W, H);
          var gdx = Math.sin(ang), gdy = -Math.cos(ang), n0 = Math.max(1, st.length - 1);
          st.slice(0, -1).forEach(function (q, i) { var tq = n0 === 1 ? 0.5 : i / (n0 - 1), gx = cx0 + gdx * (tq - 0.5) * W * 0.8, gy = cy0 + gdy * (tq - 0.5) * H * 0.8, gr = Math.max(W, H) * 0.55 * (0.4 + 1.2 * sfv) * (0.6 + 1.2 * (Number(q.w) || 0)), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, q.c); if (shp > 0) g.addColorStop(shp * 0.9, q.c); g.addColorStop(1, rgba(q.c, 0)); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
          ctx.globalCompositeOperation = 'source-over';
        }
        else { ctx.fillStyle = put(lin(), st); ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  function render(g, doc, scale, M, o) {
    o = o || {}; o.scale = scale; var bl = o.bleed || 0; g.save(); g.setTransform(scale, 0, 0, scale, bl * scale - (o.ox || 0), bl * scale - (o.oy || 0)); g.clearRect(-bl, -bl, doc.w + 2 * bl, doc.h + 2 * bl);
    if (doc.fill && doc.fill.mode && doc.fill.mode !== 'none' && !o.transparent) { g.save(); g.translate(-bl, -bl); drawFill(g, doc.fill, doc.w + 2 * bl, doc.h + 2 * bl); g.restore(); }
    else if (doc.bg && !o.transparent) { var bf = doc.bg; if (doc.bg2) { var ba = (doc.bgAng == null ? 135 : doc.bgAng) * Math.PI / 180, bdx = Math.sin(ba) * doc.w / 2, bdy = -Math.cos(ba) * doc.h / 2, bgr = g.createLinearGradient(doc.w / 2 - bdx, doc.h / 2 - bdy, doc.w / 2 + bdx, doc.h / 2 + bdy); bgr.addColorStop(0, doc.bg); bgr.addColorStop(1, doc.bg2); bf = bgr; } g.fillStyle = bf; g.fillRect(-bl, -bl, doc.w + 2 * bl, doc.h + 2 * bl); }
    var vg = doc.vig && doc.vig.on, vi = vg ? doc.layers.findIndex(function (L) { return L.type === 'text' && !L.hidden; }) : -1; if (vg && (doc.vig.top || vi < 0)) vi = doc.layers.length;
    doc.layers.forEach(function (L, i) { if (i === vi) drawVig(g, doc, bl); if (!L.hidden) drawLayer(g, L, M, o); }); if (vg && vi === doc.layers.length) drawVig(g, doc, bl); g.restore();
  }
  function toLocal(L, x, y) { var a = -(L.rot || 0) * Math.PI / 180, dx = x - L.x, dy = y - L.y; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; }
  function hit(doc, x, y) { var i, L, d, p, pad = 6; for (i = doc.layers.length - 1; i >= 0; i--) { L = doc.layers[i]; if (L.hidden || L.locked || L.type !== 'fx') continue; d = dims(L); p = toLocal(L, x, y); if (Math.abs(p[0]) <= Math.abs(d.w) * 0.12 && Math.abs(p[1]) <= Math.abs(d.h) * 0.12) return L; } for (i = doc.layers.length - 1; i >= 0; i--) { L = doc.layers[i]; if (L.hidden || L.type === 'fx') continue; d = dims(L); p = toLocal(L, x, y); if (Math.abs(p[0]) <= Math.abs(d.w) / 2 + pad && Math.abs(p[1]) <= Math.abs(d.h) / 2 + pad) { if (L.locked) continue; return L; } } for (i = doc.layers.length - 1; i >= 0; i--) { L = doc.layers[i]; if (L.hidden || L.locked || L.type !== 'fx') continue; d = dims(L); p = toLocal(L, x, y); if (Math.abs(p[0]) <= Math.abs(d.w) * 0.4 && Math.abs(p[1]) <= Math.abs(d.h) * 0.4) return L; } return null; }

  /* ---------- AI-utklipp (transformers.js, lastes første gang) ---------- */
  var T = null, pipes = {}, MODELS = { person: 'Xenova/modnet', object: 'onnx-community/BiRefNet_lite-ONNX' };
  function lib() { return T || (T = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1').then(function (m) { m.env.allowLocalModels = false; return m; })); }
  async function pipe(kind, onProg, wasm) {
    var k = kind + (wasm ? 'w' : ''); if (pipes[k]) return pipes[k]; var m = await lib(), gpu = false;
    if (!wasm && navigator.gpu) { try { gpu = !!(await navigator.gpu.requestAdapter()); } catch (e) {} }
    var tries = gpu ? [['webgpu', kind === 'object' ? 'fp16' : 'fp32'], ['wasm', 'fp32']] : [['wasm', 'fp32']], err = null;
    for (var i = 0; i < tries.length; i++) { try { var p = await m.pipeline('background-removal', MODELS[kind], { device: tries[i][0], dtype: tries[i][1], progress_callback: onProg }); p._dt = tries[i][1]; return (pipes[k] = p); } catch (e) { err = e; } }
    throw err || new Error('pipeline');
  }
  async function cutout(E, kind, onProg) {
    var b = baseOf(E, 2048), url = URL.createObjectURL(await new Promise(function (r) { b.toBlob(r, 'image/png'); }));
    var run = async function (p) { var out = await p(url), im = Array.isArray(out) ? out[0] : out, c = im.toCanvas(), m = mk(b.width, b.height), g = m.getContext('2d'); g.drawImage(c, 0, 0, m.width, m.height);
      var id = g.getImageData(0, 0, m.width, m.height), d = id.data, ch = im.channels === 4 ? 3 : 0, n = 0; for (var i = 0; i < d.length; i += 4) { var a = d[i + ch]; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; if (a > 128) n++; }
      var f = n / (d.length / 4); if (f < 0.002 || f > 0.998) return null; g.putImageData(id, 0, 0); return m; };
    try { var p = await pipe(kind, onProg), m = null; try { m = await run(p); } catch (e) { if (p._dt === 'fp32') throw e; } if (!m) m = await run(await pipe(kind, onProg, true)); return m; }
    finally { URL.revokeObjectURL(url); }
  }

  /* ---------- lagring (IndexedDB) ---------- */
  var dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(function (res, rej) { var r = indexedDB.open('photodesign', 1); r.onupgradeneeded = function () { r.result.createObjectStore('projects', { keyPath: 'id' }); r.result.createObjectStore('media'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return dbp; }
  function tx(st, mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(st, mode), q = fn(t.objectStore(st)); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  var store = {
    list: function () { return tx('projects', 'readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return y.updated - x.updated; }); }); },
    get: function (id) { return tx('projects', 'readonly', function (s) { return s.get(id); }); },
    put: function (p) { return tx('projects', 'readwrite', function (s) { return s.put(p); }); },
    del: async function (p) { var ids = mediaIds(p); await tx('projects', 'readwrite', function (s) { return s.delete(p.id); }); var all = await store.list(), used = new Set(); all.forEach(function (q) { mediaIds(q).forEach(function (k) { used.add(k); }); }); await Promise.all(ids.filter(function (k) { return !used.has(k); }).map(store.delMedia)); },
    putMedia: function (k, b) { return tx('media', 'readwrite', function (s) { return s.put(b, k); }); },
    getMedia: function (k) { return tx('media', 'readonly', function (s) { return s.get(k); }); },
    delMedia: function (k) { return tx('media', 'readwrite', function (s) { return s.delete(k); }); }
  };
  function mediaIds(p) { var o = []; (p.layers || []).concat(p.back && p.back.layers || []).forEach(function (L) { if (L.src) o.push(L.src); if (L.mask) o.push(L.mask); }); return o; }
  async function loadImg(blob) { var u = URL.createObjectURL(blob), im = new Image(); im.src = u; try { await im.decode(); } catch (e) { URL.revokeObjectURL(u); throw e; } return { img: im, w: im.naturalWidth, h: im.naturalHeight, url: u, cache: {} }; }

  /* ---------- trykk: utfallende, CMYK og PDF ---------- */
  function mmOf(doc) { var f = FORMATS.find(function (x) { return x.w === doc.w && x.h === doc.h && x.mm; }); return f ? f.mm : [doc.w / DPI * 25.4, doc.h / DPI * 25.4]; }
  /* layers that touch the trim edge are stretched out into the bleed (and back again) */
  function bleedLayers(layers, w, h, on) {
    var b = BLEED, e = 2;
    return layers.map(function (L) {
      if (L.type === 'text' || (L.rot && Math.abs(L.rot % 360) > 0.01)) return L;
      var l = L.x - L.w / 2, r = L.x + L.w / 2, t = L.y - L.h / 2, bt = L.y + L.h / 2;
      if (on) { if (Math.abs(l) <= e) l = -b; if (Math.abs(r - w) <= e) r = w + b; if (Math.abs(t) <= e) t = -b; if (Math.abs(bt - h) <= e) bt = h + b; }
      else { if (Math.abs(l + b) <= e) l = 0; if (Math.abs(r - w - b) <= e) r = w; if (Math.abs(t + b) <= e) t = 0; if (Math.abs(bt - h - b) <= e) bt = h; }
      return Object.assign({}, L, { x: (l + r) / 2, y: (t + bt) / 2, w: r - l, h: bt - t });
    });
  }
  function toCMYK(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return [0, 0, 0, 100]; var n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, k = 1 - Math.max(r, g, b);
    if (k >= 0.999) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(function (v) { return Math.round(v * 100); });
  }
  function fromCMYK(c) { var k = c[3] / 100, f = function (v) { return Math.round(255 * (1 - v / 100) * (1 - k)); }, h = function (v) { return ('0' + clamp(v, 0, 255).toString(16)).slice(-2); }; return '#' + h(f(c[0])) + h(f(c[1])) + h(f(c[2])); }
  async function deflate(u8) {
    if (typeof CompressionStream === 'undefined') return null;
    var s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate')); return new Uint8Array(await new Response(s).arrayBuffer());
  }
  /* each side → one PDF page at 300 dpi, CMYK image, with TrimBox/BleedBox for the print shop */
  async function printPDF(sides, doc, M, opt) {
    opt = opt || {}; var bl = opt.bleed ? BLEED : 0, mm = mmOf(doc), pt = 72 / 25.4, bmm = bl ? BLEED_MM : 0;
    var PW = (mm[0] + 2 * bmm) * pt, PH = (mm[1] + 2 * bmm) * pt, TX = bmm * pt, enc = new TextEncoder(), parts = [], off = [], len = 0;
    var push = function (x) { var u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
    var obj = function (n, body, stream) { off[n] = len; push(n + ' 0 obj\n' + body); if (stream) { push('\nstream\n'); push(stream); push('\nendstream'); } push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    var n = sides.length, kids = [], W = doc.w + 2 * bl, H = doc.h + 2 * bl;
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>');
    for (var s = 0; s < n; s++) {
      /* rendered in bands so large sheets (A3) stay under the canvas size limit on phones and tablets */
      var BH = Math.max(64, Math.min(H, Math.floor(4e6 / W))), c = mk(W, BH), g = c.getContext('2d'), cm = new Uint8Array(W * H * 4), sd = Object.assign({}, doc, { layers: sides[s].layers, bg: sides[s].bg });
      for (var y0 = 0; y0 < H; y0 += BH) {
      var bh = Math.min(BH, H - y0); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, BH);
      render(g, sd, 1, M, { full: true, noPh: true, bleed: bl, oy: y0 }); g.setTransform(1, 0, 0, 1, 0, 0);
      await new Promise(function (r) { setTimeout(r, 0); });
      var px = g.getImageData(0, 0, W, bh).data;
      for (var p = 0, q = y0 * W * 4; p < px.length; p += 4, q += 4) {
        var a = px[p + 3] / 255, r = (px[p] * a + 255 * (1 - a)) / 255, gg = (px[p + 1] * a + 255 * (1 - a)) / 255, b = (px[p + 2] * a + 255 * (1 - a)) / 255, k = 1 - Math.max(r, gg, b), d = k < 1 ? 1 - k : 1;
        cm[q] = Math.round((1 - r - k) / d * 255); cm[q + 1] = Math.round((1 - gg - k) / d * 255); cm[q + 2] = Math.round((1 - b - k) / d * 255); cm[q + 3] = Math.round(k * 255);
      }
      if (opt.onProgress) opt.onProgress((s + (y0 + bh) / H * 0.9) / n);
      }
      var z = await deflate(cm), data = z || cm, base = 3 + s * 3, trim = '[' + [TX, TX, PW - TX, PH - TX].map(function (v) { return v.toFixed(2); }).join(' ') + ']', box = '[0 0 ' + PW.toFixed(2) + ' ' + PH.toFixed(2) + ']';
      obj(base, '<< /Type /Page /Parent 2 0 R /MediaBox ' + box + ' /BleedBox ' + box + ' /TrimBox ' + trim + ' /Resources << /XObject << /Im' + s + ' ' + (base + 1) + ' 0 R >> >> /Contents ' + (base + 2) + ' 0 R >>');
      obj(base + 1, '<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H + ' /ColorSpace /DeviceCMYK /BitsPerComponent 8' + (z ? ' /Filter /FlateDecode' : '') + ' /Length ' + data.length + ' >>', data);
      var cs = 'q ' + PW.toFixed(2) + ' 0 0 ' + PH.toFixed(2) + ' 0 0 cm /Im' + s + ' Do Q';
      obj(base + 2, '<< /Length ' + cs.length + ' >>', enc.encode(cs));
      if (opt.onProgress) opt.onProgress((s + 1) / n);
    }
    var total = 3 + n * 3, xref = len, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var j = 1; j < total; j++) x += ('000000000' + off[j]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }
  window.PD = { SHAPES: SHAPES, rgba: rgba, glowLayer: function (o) { return Object.assign({ id: uid('g'), type: 'glow', name: 'Lys', x: 540, y: 540, w: 800, h: 800, rot: 0, op: 0.6, blend: 'screen', hidden: false, locked: false, color: '#f5b82c', soft: 0.6 }, o || {}); }, DPI: DPI, BLEED: BLEED, BLEED_MM: BLEED_MM, mmOf: mmOf, bleedLayers: bleedLayers, toCMYK: toCMYK, fromCMYK: fromCMYK, printPDF: printPDF, FORMATS: FORMATS, FONTS: FONTS, ADJ: ADJ, LOOKS: LOOKS, BLENDS: BLENDS, TEMPLATES: TEMPLATES, uid: uid, mk: mk, clamp: clamp, imageLayer: imageLayer, textLayer: textLayer, shapeLayer: shapeLayer, newDoc: newDoc,
    render: render, hit: hit, dims: dims, toLocal: toLocal, cover: cover, baseOf: baseOf, cutout: cutout, curveFn: curveFn, store: store, mediaIds: mediaIds, loadImg: loadImg };
})();
