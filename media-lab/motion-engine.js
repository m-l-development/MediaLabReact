/* Motion design – timeline model, canvas renderer, IndexedDB storage, project files, templates, MP4 export and AI subtitles. */
(function () {
  if (window.VF) return;
  var FORMATS = [
    { k: 'sq', name: 'Instagram innlegg', ratio: '1:1', w: 1080, h: 1080 },
    { k: 'p45', name: 'Instagram portrett', ratio: '4:5', w: 1080, h: 1350 },
    { k: 'story', name: 'Story / Reels', ratio: '9:16', w: 1080, h: 1920 },
    { k: 'wide', name: 'Facebook / YouTube', ratio: '16:9', w: 1920, h: 1080 },
    { k: 'cover', name: 'Facebook-cover', ratio: '2,63:1', w: 1640, h: 624 }
  ];
  var FONTS = ['Archivo', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'League Spartan', 'Playfair Display'];
  var TRANS = [['none', 'Ingen'], ['fade', 'Toning'], ['dip', 'Via svart'], ['dipw', 'Via hvitt'], ['flash', 'Blits'], ['push-l', 'Skyv mot venstre'], ['push-r', 'Skyv mot høyre'], ['push-u', 'Skyv opp'], ['push-d', 'Skyv ned'], ['cover-l', 'Dekk fra høyre'], ['cover-r', 'Dekk fra venstre'], ['cover-u', 'Dekk nedenfra'], ['cover-d', 'Dekk ovenfra'], ['whip', 'Sveip'], ['zoom-in', 'Zoom inn'], ['zoom-out', 'Zoom ut'], ['spin', 'Snurr'], ['wipe-r', 'Visk mot høyre'], ['wipe-l', 'Visk mot venstre'], ['wipe-d', 'Visk ned'], ['wipe-u', 'Visk opp'], ['iris', 'Sirkel'], ['diamond', 'Diamant'], ['clock', 'Klokke'], ['blinds', 'Persienner'], ['bars', 'Striper'], ['doors', 'Dører'], ['blur', 'Uskarp'], ['glitch', 'Glitch'], ['pixel', 'Piksler'], ['xzoom', 'Kryss-zoom'], ['ramp', 'Fartsrampe'], ['match', 'Match cut'], ['mask', 'Maskering'], ['chroma', 'Kromatisk glitch'], ['leak', 'Lyslekkasje']];
  var TRMAP = { slide: 'cover-l', slideup: 'cover-u', wipe: 'wipe-r', zoom: 'zoom-in' };
  var ANIMS = [['none', 'Ingen'], ['fade', 'Ton inn'], ['rise', 'Stig opp'], ['pop', 'Sprett'], ['slide', 'Skyv inn'], ['blur', 'Fra uskarp'], ['type', 'Skrivemaskin'], ['words', 'Ord for ord'], ['letters', 'Bokstav for bokstav'], ['bounce', 'Hopp inn'], ['wave', 'Bølge'], ['glitch', 'Glitch'], ['zoomout', 'Zoom inn fra stor'], ['drop', 'Fall ned'], ['flip', 'Vend'], ['spread', 'Trekk sammen'], ['wipe', 'Avdekk']];
  var OVANIMS = [['none', 'Ingen'], ['fade', 'Ton'], ['pop', 'Sprett'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['rise', 'Stig opp']];
  var BLENDS = [['source-over', 'Normal'], ['screen', 'Lysere (screen)'], ['multiply', 'Mørkere (multiply)'], ['overlay', 'Overlegg'], ['soft-light', 'Mykt lys'], ['lighten', 'Lysne'], ['darken', 'Mørkne'], ['difference', 'Differanse']];
  function uid(p) { return (p || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeBack(k) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }

  /* ---------- model ---------- */
  function clipDur(c) { return c.kind === 'video' ? Math.max(0.1, ((c.out || 0) - (c.in || 0)) / (c.speed || 1)) : Math.max(0.2, c.dur || 4); }
  var LC = new WeakMap();
  function layout(p) {
    var hit = LC.get(p.clips); if (hit) return hit;
    var t = 0, out = [];
    (p.clips || []).forEach(function (c, i) {
      var d = clipDur(c), tr = 0;
      if (i && c.trans && c.trans.type && c.trans.type !== 'none') tr = Math.min(c.trans.dur || 0.6, d / 2, out[i - 1].dur / 2);
      var s = Math.max(0, t - tr);
      out.push({ c: c, i: i, start: s, dur: d, end: s + d, tr: tr });
      t = s + d;
    });
    LC.set(p.clips, out); return out;
  }
  function totalDur(p) {
    var L = layout(p), e = L.length ? L[L.length - 1].end : 0;
    (p.texts || []).forEach(function (x) { e = Math.max(e, x.start + x.dur); });
    (p.subs || []).forEach(function (x) { e = Math.max(e, x.end); });
    (p.ov || []).forEach(function (o) { e = Math.max(e, o.start + ovDur(o)); });
    return Math.max(0.5, e);
  }
  function text(o) {
    return Object.assign({ id: uid('t'), start: 0, dur: 4, text: 'Tekst', x: 0.5, y: 0.5, size: 90, font: 'Archivo', weight: 700, italic: false, color: '#ffffff', align: 'center', anim: 'rise', box: 'none', bg: '#000000', maxW: 0.84, upper: false, track: 0, shadow: false, lh: 1.14, opacity: 1, countdown: false, cdFrom: null, cdFmt: 'auto', stroke: 0, strokeColor: '#000000', grad: false, color2: '#f5b82c' }, o || {});
  }
  function colorClip(o) {
    return Object.assign({ id: uid('c'), kind: 'color', dur: 5, c1: '#111111', c2: '#2a2a2a', grad: 'linear', ang: 135, spin: 0, trans: { type: 'fade', dur: 0.6 }, dim: 0, bri: 0, con: 0, sat: 0, temp: 0, tint: 0, vig: 0, grain: 0, blur: 0, look: 'none' }, o || {});
  }
  function mediaClip(m, o) {
    var v = m.kind === 'video';
    return Object.assign({ id: uid('c'), kind: v ? 'video' : 'image', media: m.id, name: m.name, in: 0, out: v ? (m.dur || 5) : 0, dur: v ? 0 : 4, vol: 1, muted: false, fit: 'cover', zoom: 1, fx: 0.5, fy: 0.5, kb: !v, trans: { type: 'fade', dur: 0.5 }, dim: 0, bri: 0, con: 0, sat: 0, temp: 0, tint: 0, vig: 0, grain: 0, blur: 0, look: 'none', speed: 1, rev: false, afi: 0, afo: 0, x: 0, y: 0, scale: 1, rot: 0, flipH: false, flipV: false, crop: { l: 0, t: 0, r: 0, b: 0 } }, o || {});
  }
  function overlay(m, o) {
    var v = m.kind === 'video', r = m.w && m.h ? m.h / m.w : 0.5625;
    return Object.assign({ id: uid('o'), kind: v ? 'video' : 'image', media: m.id, name: m.name, start: 0, in: 0, out: v ? (m.dur || 5) : 0, dur: v ? 0 : 4, speed: 1, rev: false, vol: 1, muted: false, x: 0.72, y: 0.72, scale: 0.4, rot: 0, opacity: 1, fadeIn: 0, fadeOut: 0, anim: 'pop', blend: 'source-over', radius: 0.08, border: 0, borderColor: '#ffffff', shadow: true, flipH: false, flipV: false, crop: { l: 0, t: 0, r: 0, b: 0 }, bri: 0, con: 0, sat: 0, blur: 0, look: 'none', ar: r }, o || {});
  }
  function music(m, o) { return Object.assign({ id: uid('a'), media: m.id, name: m.name, start: 0, in: 0, out: m.dur || 30, srcDur: m.dur || 30, vol: 0.8, fadeIn: 1, fadeOut: 2, loop: false }, o || {}); }
  var SUBSTYLE = { size: 46, color: '#ffffff', bgOn: true, bg: '#000000', bgA: 0.6, pos: 'bottom', font: 'Archivo', weight: 600, upper: false };

  /* ---------- templates ---------- */
  var ACC = '#f5b82c';
  var TEMPLATES = [
    { k: 'meet', name: 'Møtepromo', desc: 'Dato, tid og sted over to scener', tt: 2.2, make: function () {
      return { clips: [colorClip({ dur: 6, c1: '#0f1b3d', c2: '#23408a', ang: 120, spin: 6, trans: { type: 'none', dur: 0.6 } }), colorClip({ dur: 6, c1: '#23408a', c2: '#0f1b3d', ang: 300, spin: 6 })],
        texts: [text({ start: 0, dur: 6, text: 'Velkommen til', upper: true, size: 38, weight: 600, track: 0.3, color: ACC, y: 0.36, anim: 'fade' }),
          text({ start: 0.3, dur: 5.7, text: 'Søndagsmøte', upper: true, font: 'Bebas Neue', weight: 400, size: 170, y: 0.5 }),
          text({ start: 0.9, dur: 5.1, text: 'Søndag kl. 11:00', size: 54, weight: 500, y: 0.64 }),
          text({ start: 6.2, dur: 5.8, text: 'Kirkegata 1, Oslo', size: 70, weight: 700, y: 0.47 }),
          text({ start: 6.8, dur: 5.2, text: 'Alle er hjertelig velkommen', size: 42, weight: 500, color: ACC, y: 0.58, anim: 'fade' })] };
    } },
    { k: 'event', name: 'Arrangement / konferanse', desc: 'Stort navn, datoer og påmelding', tt: 2.6, make: function () {
      return { clips: [colorClip({ dur: 6, c1: '#120b1e', c2: '#4a1242', grad: 'radial', trans: { type: 'none', dur: 0.6 } }), colorClip({ dur: 6, c1: '#4a1242', c2: '#120b1e', grad: 'radial', trans: { type: 'zoom', dur: 0.7 } })],
        texts: [text({ start: 0.2, dur: 5.8, text: 'Konferanse 2026', upper: true, font: 'Anton', weight: 400, size: 150, y: 0.44, anim: 'pop' }),
          text({ start: 0.9, dur: 5.1, text: '14.–16. mars', size: 60, weight: 600, y: 0.58 }),
          text({ start: 6.2, dur: 5.8, text: 'Talere · Lovsang · Seminarer', size: 56, weight: 600, y: 0.44 }),
          text({ start: 7, dur: 5, text: 'Meld deg på nå', upper: true, size: 44, weight: 800, track: 0.12, box: 'block', bg: '#ff5a36', y: 0.58, anim: 'pop' })] };
    } },
    { k: 'quote', name: 'Sitat / vers', desc: 'Tekst som skrives frem, med kilde', tt: 6, make: function () {
      return { clips: [colorClip({ dur: 10, c1: '#141414', c2: '#3a3226', ang: 160, spin: 3, trans: { type: 'none', dur: 0.6 } })],
        texts: [text({ start: 0.4, dur: 9.6, text: '«Herren er min hyrde, jeg mangler ikke noe.»', font: 'Playfair Display', weight: 500, italic: true, size: 84, maxW: 0.78, y: 0.46, anim: 'type' }),
          text({ start: 4.5, dur: 5.5, text: 'Salme 23,1', upper: true, size: 34, weight: 600, track: 0.25, color: ACC, y: 0.66, anim: 'fade' })] };
    } },
    { k: 'count', name: 'Nedtelling', desc: 'Teller ned sekunder til start', tt: 3, make: function () {
      return { clips: [colorClip({ dur: 10, c1: '#050505', c2: '#2b0f0f', grad: 'radial', trans: { type: 'none', dur: 0.6 } })],
        texts: [text({ start: 0, dur: 10, text: 'Starter om', upper: true, size: 42, weight: 600, track: 0.3, y: 0.32, anim: 'fade' }),
          text({ start: 0, dur: 10, text: '10', countdown: true, cdFrom: 10, font: 'Bebas Neue', weight: 400, size: 320, y: 0.53, anim: 'none' })] };
    } },
    { k: 'speaker', name: 'Talerpresentasjon', desc: 'Navneskilt over bilde eller video', tt: 2.4, make: function () {
      return { clips: [colorClip({ dur: 8, c1: '#26313f', c2: '#0e141b', ang: 90, trans: { type: 'none', dur: 0.6 } })],
        texts: [text({ start: 0.5, dur: 7.5, text: 'Navn Navnesen', size: 60, weight: 800, color: '#111111', box: 'block', bg: '#ffffff', align: 'left', x: 0.07, y: 0.78, anim: 'slide' }),
          text({ start: 0.9, dur: 7.1, text: 'Tale: Tittel på talen', size: 36, weight: 600, color: '#111111', box: 'block', bg: ACC, align: 'left', x: 0.07, y: 0.87, anim: 'slide' })] };
    } },
    { k: 'worship', name: 'Musikk / lovsang', desc: 'Sangtittel og tekstlinjer', tt: 3.2, make: function () {
      return { clips: [colorClip({ dur: 12, c1: '#0a0a0a', c2: '#1d2a44', ang: 200, spin: 4, trans: { type: 'none', dur: 0.6 } })],
        texts: [text({ start: 0.3, dur: 4.2, text: 'Sangtittel', size: 64, weight: 800, align: 'left', x: 0.07, y: 0.14, anim: 'slide' }),
          text({ start: 0.7, dur: 3.8, text: 'Artist / band', size: 36, weight: 500, color: '#c9c5bc', align: 'left', x: 0.07, y: 0.21, anim: 'slide' })],
        subs: [{ id: uid('s'), start: 1.5, end: 5, text: 'Første linje av sangteksten' }, { id: uid('s'), start: 5.2, end: 8.6, text: 'Andre linje av sangteksten' }, { id: uid('s'), start: 8.8, end: 12, text: 'Tredje linje av sangteksten' }],
        subStyle: Object.assign({}, SUBSTYLE, { size: 58, bgOn: false, pos: 'center', weight: 700 }) };
    } },
    { k: 'announce', name: 'Kunngjøring', desc: 'Tydelig beskjed på farget bakgrunn', tt: 2.5, make: function () {
      return { clips: [colorClip({ dur: 8, c1: '#f5b82c', c2: '#ff8a00', ang: 135, trans: { type: 'none', dur: 0.6 } })],
        texts: [text({ start: 0.2, dur: 7.8, text: 'Viktig info', upper: true, font: 'Anton', weight: 400, size: 130, color: '#111111', y: 0.4, anim: 'pop' }),
          text({ start: 0.9, dur: 7.1, text: 'Skriv kunngjøringen her. Hold den kort og tydelig.', size: 48, weight: 500, color: '#111111', maxW: 0.72, y: 0.58 })] };
    } },
    { k: 'blank', name: 'Tom', desc: 'Start med tom tidslinje', tt: 1, make: function () { return { clips: [], texts: [] }; } }
  ];
  function create(fmt, tk, name) {
    var tp = TEMPLATES.find(function (x) { return x.k === tk; }) || TEMPLATES[TEMPLATES.length - 1], d = tp.make();
    return normalize({ id: uid('p'), name: name || (tp.k === 'blank' ? 'Nytt prosjekt' : tp.name), fmt: fmt.k, w: fmt.w, h: fmt.h, bg: '#000000', media: [], clips: d.clips || [], ov: [], markers: [], texts: d.texts || [], subs: d.subs || [], subStyle: d.subStyle || Object.assign({}, SUBSTYLE), music: [], logo: { src: '', pos: 'tr', size: 0.12, opacity: 0.9, on: false }, created: Date.now(), updated: Date.now() });
  }

  /* ---------- sanitising ---------- */
  function num(v, d, lo, hi) { v = +v; if (!isFinite(v)) v = d; if (lo != null && v < lo) v = lo; if (hi != null && v > hi) v = hi; return v; }
  function str(v, d, max) { return typeof v === 'string' ? v.slice(0, max || 4000) : d; }
  function col(v, d) { return typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : d; }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function sid(v, p) { return typeof v === 'string' && /^[\w.:\/-]{1,120}$/.test(v) ? v : uid(p); }
  var TK = TRANS.map(function (x) { return x[0]; }), AK = ANIMS.map(function (x) { return x[0]; });
  function normalize(p) {
    if (!p || typeof p !== 'object') throw new Error('bad');
    var w = Math.round(num(p.w, 1920, 240, 4096) / 2) * 2, h = Math.round(num(p.h, 1080, 240, 4096) / 2) * 2;
    var o = { id: sid(p.id, 'p'), name: str(p.name, 'Prosjekt', 120), fmt: str(p.fmt, 'custom', 20), w: w, h: h, bg: col(p.bg, '#000000'), created: num(p.created, Date.now()), updated: num(p.updated, Date.now()), thumb: typeof p.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.thumb) && p.thumb.length < 200000 ? p.thumb : '' };
    o.media = (Array.isArray(p.media) ? p.media : []).filter(function (m) { return m && typeof m === 'object'; }).slice(0, 500).map(function (m) {
      return { id: sid(m.id, 'm'), name: str(m.name, 'Fil', 200), kind: oneOf(m.kind, ['video', 'image', 'audio'], 'image'), dur: num(m.dur, 0, 0, 86400), w: num(m.w, 0, 0, 20000), h: num(m.h, 0, 0, 20000), thumb: typeof m.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(m.thumb) && m.thumb.length < 120000 ? m.thumb : '' };
    });
    var tr = function (t) { t = t && typeof t === 'object' ? t : {}; return { type: oneOf(TRMAP[t.type] || t.type, TK, 'none'), dur: num(t.dur, 0.6, 0.1, 3) }; };
    var crop = function (c) { c = c && typeof c === 'object' ? c : {}; return { l: num(c.l, 0, 0, 0.9), t: num(c.t, 0, 0, 0.9), r: num(c.r, 0, 0, 0.9), b: num(c.b, 0, 0, 0.9) }; };
    var lnk = function (v) { return typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : undefined; }, ln = function (v) { return Math.round(num(v, 0, 0, 49)); };
    var LK = LOOKS.map(function (x) { return x[0]; });
    var curv = function (v) { if (!v || typeof v !== 'object') return null; var r = {}, any = false; ['m', 'r', 'g', 'b'].forEach(function (k) { var a = Array.isArray(v[k]) ? v[k] : null; if (!a) return; var pts = a.filter(function (q) { return Array.isArray(q) && q.length === 2; }).slice(0, 16).map(function (q) { return [num(q[0], 0, 0, 1), num(q[1], 0, 0, 1)]; }).sort(function (x, y) { return x[0] - y[0]; }); if (pts.length < 2) return; r[k] = pts; any = true; }); return any ? r : null; };
    var grade = function (c) { return { curves: curv(c.curves), bri: num(c.bri, 0, -1, 1), con: num(c.con, 0, -1, 1), sat: num(c.sat, 0, -1, 1), blur: num(c.blur, 0, 0, 40), look: oneOf(c.look, LK, 'none'), cS: num(c.cS, 0, -1, 1), cM: num(c.cM, 0, -1, 1), cH: num(c.cH, 0, -1, 1) }; };
    o.clips = (Array.isArray(p.clips) ? p.clips : []).filter(function (c) { return c && typeof c === 'object'; }).slice(0, 2000).map(function (c) {
      var k = oneOf(c.kind, ['video', 'image', 'color'], 'color'), b = Object.assign({ id: sid(c.id, 'c'), link: lnk(c.link), kind: k, trans: tr(c.trans), dim: num(c.dim, 0, 0, 1), temp: num(c.temp, 0, -1, 1), tint: num(c.tint, 0, -1, 1), vig: num(c.vig, 0, 0, 1), grain: num(c.grain, 0, 0, 1) }, grade(c));
      if (k === 'color') return Object.assign(b, { dur: num(c.dur, 5, 0.2, 3600), c1: col(c.c1, '#111111'), c2: col(c.c2, '#2a2a2a'), grad: oneOf(c.grad, ['none', 'linear', 'radial'], 'linear'), ang: num(c.ang, 135, -3600, 3600), spin: num(c.spin, 0, -90, 90) });
      return Object.assign(b, { media: sid(c.media, 'm'), name: str(c.name, '', 200), in: num(c.in, 0, 0, 86400), out: num(c.out, 5, 0, 86400), dur: num(c.dur, 4, 0, 3600), vol: num(c.vol, 1, 0, 2), muted: !!c.muted, fit: oneOf(c.fit, ['cover', 'contain'], 'cover'), zoom: num(c.zoom, 1, 1, 4), fx: num(c.fx, 0.5, 0, 1), fy: num(c.fy, 0.5, 0, 1), kb: !!c.kb, speed: num(c.speed, 1, 0.1, 8), rev: !!c.rev, afi: num(c.afi, 0, 0, 30), afo: num(c.afo, 0, 0, 30), x: num(c.x, 0, -2, 2), y: num(c.y, 0, -2, 2), scale: num(c.scale, 1, 0.1, 5), rot: num(c.rot, 0, -3600, 3600), flipH: !!c.flipH, flipV: !!c.flipV, crop: crop(c.crop) });
    });
    o.clips.forEach(function (c) { if (c.kind === 'video' && c.out <= c.in + 0.05) c.out = c.in + 0.1; });
    o.ov = (Array.isArray(p.ov) ? p.ov : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 500).map(function (x) {
      var k = oneOf(x.kind, ['video', 'image'], 'image'), r = Object.assign({ id: sid(x.id, 'o'), link: lnk(x.link), lane: ln(x.lane), kind: k, media: sid(x.media, 'm'), name: str(x.name, '', 200), start: num(x.start, 0, 0, 86400), in: num(x.in, 0, 0, 86400), out: num(x.out, 5, 0, 86400), dur: num(x.dur, 4, 0.2, 86400), speed: num(x.speed, 1, 0.1, 8), rev: !!x.rev, vol: num(x.vol, 1, 0, 2), muted: !!x.muted,
        x: num(x.x, 0.5, -1, 2), y: num(x.y, 0.5, -1, 2), scale: num(x.scale, 0.4, 0.02, 4), rot: num(x.rot, 0, -3600, 3600), opacity: num(x.opacity, 1, 0, 1), fadeIn: num(x.fadeIn, 0, 0, 30), fadeOut: num(x.fadeOut, 0, 0, 30), anim: oneOf(x.anim, OVANIMS.map(function (a) { return a[0]; }), 'none'), blend: oneOf(x.blend, BLENDS.map(function (a) { return a[0]; }), 'source-over'),
        radius: num(x.radius, 0, 0, 1), border: num(x.border, 0, 0, 5), borderColor: col(x.borderColor, '#ffffff'), shadow: !!x.shadow, flipH: !!x.flipH, flipV: !!x.flipV, crop: crop(x.crop), ar: num(x.ar, 0.5625, 0.05, 20), keyOn: !!x.keyOn, keyColor: col(x.keyColor, '#00ff00'), keySim: num(x.keySim, 0.35, 0.01, 1), keySmooth: num(x.keySmooth, 0.1, 0.005, 1), keySpill: num(x.keySpill, 0.5, 0, 1) }, grade(x));
      if (k === 'video' && r.out <= r.in + 0.05) r.out = r.in + 0.1; return r;
    });
    o.markers = (Array.isArray(p.markers) ? p.markers : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 500).map(function (x) { return { id: sid(x.id, 'k'), t: num(x.t, 0, 0, 86400), label: str(x.label, '', 80), color: col(x.color, '#ff5a36') }; }).sort(function (a, b) { return a.t - b.t; });
    o.tin = tr(p.tin); o.tout = tr(p.tout);
    var tk = p.tracks && typeof p.tracks === 'object' ? p.tracks : {}; o.tracks = {};
    ['text', 'ov', 'video', 'subs', 'music'].forEach(function (k) { var v = tk[k] && typeof tk[k] === 'object' ? tk[k] : {}; o.tracks[k] = { lock: !!v.lock, hide: !!v.hide }; });
    var lz = p.lanes && typeof p.lanes === 'object' ? p.lanes : {}; o.lanes = { text: Math.round(num(lz.text, 1, 1, 50)), ov: Math.round(num(lz.ov, 1, 1, 50)), music: Math.round(num(lz.music, 1, 1, 50)) };
    var mx = p.mix && typeof p.mix === 'object' ? p.mix : {}; o.mix = { video: num(mx.video, 1, 0, 1), ov: num(mx.ov, 1, 0, 1), music: num(mx.music, 1, 0, 1), duck: !!mx.duck, duckAmt: num(mx.duckAmt, 0.6, 0.1, 0.95) };
    o.texts = (Array.isArray(p.texts) ? p.texts : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 1000).map(function (x) {
      return { id: sid(x.id, 't'), link: lnk(x.link), lane: ln(x.lane), start: num(x.start, 0, 0, 86400), dur: num(x.dur, 4, 0.2, 86400), text: str(x.text, '', 2000), x: num(x.x, 0.5, -0.5, 1.5), y: num(x.y, 0.5, -0.5, 1.5), size: num(x.size, 90, 8, 600), font: oneOf(x.font, FONTS, 'Archivo'), weight: num(x.weight, 700, 100, 900), italic: !!x.italic, color: col(x.color, '#ffffff'), align: oneOf(x.align, ['left', 'center', 'right'], 'center'), anim: oneOf(x.anim, AK, 'fade'), box: oneOf(x.box, ['none', 'block', 'line'], 'none'), bg: col(x.bg, '#000000'), maxW: num(x.maxW, 0.84, 0.1, 1), upper: !!x.upper, track: num(x.track, 0, -0.1, 1), shadow: !!x.shadow, lh: num(x.lh, 1.14, 0.7, 2.5), opacity: num(x.opacity, 1, 0, 1), countdown: !!x.countdown, cdFrom: x.cdFrom == null ? null : num(x.cdFrom, 10, 0, 8639999), cdFmt: oneOf(x.cdFmt, ['auto', 'ss', 'mmss', 'hhmmss', 'ddhhmmss'], 'auto'), stroke: num(x.stroke, 0, 0, 10), strokeColor: col(x.strokeColor, '#000000'), grad: !!x.grad, color2: col(x.color2, '#f5b82c') };
    });
    o.subs = (Array.isArray(p.subs) ? p.subs : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 5000).map(function (x) {
      var s = num(x.start, 0, 0, 86400); return { id: sid(x.id, 's'), link: lnk(x.link), start: s, end: Math.max(s + 0.2, num(x.end, s + 2, 0, 86400)), text: str(x.text, '', 500) };
    }).sort(function (a, b) { return a.start - b.start; });
    var ss = p.subStyle && typeof p.subStyle === 'object' ? p.subStyle : {};
    o.subStyle = { mode: oneOf(ss.mode, ['line', 'words'], 'line'), hl: col(ss.hl, '#f5b82c'), size: num(ss.size, 46, 12, 200), color: col(ss.color, '#ffffff'), bgOn: ss.bgOn !== false, bg: col(ss.bg, '#000000'), bgA: num(ss.bgA, 0.6, 0, 1), pos: oneOf(ss.pos, ['bottom', 'center', 'top'], 'bottom'), font: oneOf(ss.font, FONTS, 'Archivo'), weight: num(ss.weight, 600, 100, 900), upper: !!ss.upper };
    o.music = (Array.isArray(p.music) ? p.music : []).filter(function (m) { return m && typeof m === 'object'; }).slice(0, 50).map(function (m) {
      var sd = num(m.srcDur, 30, 0.1, 86400), i = num(m.in, 0, 0, sd); return { id: sid(m.id, 'a'), link: lnk(m.link), lane: ln(m.lane), media: sid(m.media, 'm'), name: str(m.name, '', 200), start: num(m.start, 0, 0, 86400), in: i, out: Math.max(i + 0.1, num(m.out, sd, 0, sd)), srcDur: sd, vol: num(m.vol, 0.8, 0, 2), fadeIn: num(m.fadeIn, 1, 0, 30), fadeOut: num(m.fadeOut, 2, 0, 30), loop: !!m.loop };
    });
    var lg = p.logo && typeof p.logo === 'object' ? p.logo : {};
    o.logo = { x: lg.x == null ? null : num(lg.x, 0.5, 0, 1), y: lg.y == null ? null : num(lg.y, 0.5, 0, 1), src: typeof lg.src === 'string' && /^(images\/[\w.-]+\.(png|jpe?g|webp|svg)|m-[\w-]+)$/.test(lg.src) ? lg.src : '', pos: oneOf(lg.pos, ['tl', 'tr', 'bl', 'br'], 'tr'), size: num(lg.size, 0.12, 0.03, 0.6), opacity: num(lg.opacity, 0.9, 0, 1), on: !!lg.on };
    return fixLanes(o);
  }
  function fixLanes(p, pin) {
    var L0 = p.lanes || {}, nl = { text: L0.text || 1, ov: L0.ov || 1, music: L0.music || 1 }, ch = !p.lanes, out = {};
    var ends = { texts: function (x) { return x.start + x.dur; }, ov: function (x) { return x.start + ovDur(x); }, music: function (x) { return x.loop ? 1e9 : x.start + (x.out - x.in); } }, lk = { texts: 'text', ov: 'ov', music: 'music' };
    ['texts', 'ov', 'music'].forEach(function (K) {
      var arr = p[K] || [], en = ends[K], occ = {}, res = null;
      var ord = arr.map(function (x, i) { return i; }).sort(function (a, b) { var pa = pin && pin.has(arr[a].id) ? 1 : 0, pb = pin && pin.has(arr[b].id) ? 1 : 0; return pa - pb || a - b; });
      ord.forEach(function (i) {
        var x = arr[i], s = x.start, e = en(x), l = Math.max(0, Math.min(49, x.lane | 0));
        var busy = function (q) { return (occ[q] || []).some(function (r) { return s < r[1] - 0.001 && e > r[0] + 0.001; }); };
        while (l < 49 && busy(l)) l++;
        (occ[l] = occ[l] || []).push([s, e]);
        if (l !== x.lane) { if (!res) res = arr.slice(); res[i] = Object.assign({}, x, { lane: l }); }
        if (l + 1 > nl[lk[K]]) { nl[lk[K]] = l + 1; ch = true; }
      });
      if (res) { out[K] = res; ch = true; }
    });
    if (!ch) return p;
    return Object.assign({}, p, out, { lanes: nl });
  }

  /* ---------- rendering ---------- */
  function setFont(ctx, x, px) {
    ctx.font = (x.italic ? 'italic ' : '') + Math.round(x.weight || 700) + ' ' + Math.max(1, px).toFixed(1) + 'px "' + (x.font || 'Archivo') + '", Archivo, Helvetica, Arial, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = ((x.track || 0) * px).toFixed(2) + 'px';
  }
  function wrap(ctx, s, maxW) {
    var out = [];
    String(s).split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, r)); else ctx.rect(x, y, w, h); }
  function fmtCount(s, f) {
    s = Math.max(0, Math.ceil(s - 0.001)); var z = function (n) { return (n < 10 ? '0' : '') + n; }, d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, r = s % 60;
    if (f === 'ss') return String(s);
    if (f === 'mmss') return z(Math.floor(s / 60)) + ':' + z(r);
    if (f === 'hhmmss') return z(Math.floor(s / 3600)) + ':' + z(m) + ':' + z(r);
    if (f === 'ddhhmmss') return z(d) + ':' + z(h) + ':' + z(m) + ':' + z(r);
    if (s < 60) return String(s); if (s < 3600) return Math.floor(s / 60) + ':' + z(r); if (s < 86400) return Math.floor(s / 3600) + ':' + z(m) + ':' + z(r); return d + ':' + z(h) + ':' + z(m) + ':' + z(r);
  }
  function srcSize(s) { return s ? [s.videoWidth || s.naturalWidth || s.width || 0, s.videoHeight || s.naturalHeight || s.height || 0] : [0, 0]; }
  function hexA(h, a) { var s = String(h || '#000').slice(1); if (s.length === 3) s = s.replace(/./g, '$&$&'); return 'rgba(' + parseInt(s.slice(0, 2), 16) + ',' + parseInt(s.slice(2, 4), 16) + ',' + parseInt(s.slice(4, 6), 16) + ',' + a + ')'; }
  function rnd(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var LOOKS = [['none', 'Ingen'], ['warm', 'Varm'], ['cool', 'Kald'], ['film', 'Film'], ['bw', 'Svart-hvitt'], ['noir', 'Noir'], ['faded', 'Falmet'], ['vivid', 'Levende'], ['sepia', 'Sepia'], ['dream', 'Drøm'], ['teal', 'Teal og oransje'], ['night', 'Natt']];
  var LOOKF = { warm: { f: 'saturate(1.08)', temp: 0.45 }, cool: { f: 'saturate(0.95)', temp: -0.45 }, film: { f: 'contrast(1.1) saturate(0.85)', temp: 0.15, vig: 0.35, grain: 0.25 }, bw: { f: 'grayscale(1) contrast(1.08)' }, noir: { f: 'grayscale(1) contrast(1.45) brightness(0.92)', vig: 0.55 }, faded: { f: 'contrast(0.82) saturate(0.7) brightness(1.08)' }, vivid: { f: 'saturate(1.45) contrast(1.08)' }, sepia: { f: 'sepia(0.75) contrast(1.05)' }, dream: { f: 'brightness(1.08) saturate(1.15) contrast(0.9)', glow: 0.5 }, teal: { f: 'contrast(1.12) saturate(1.2)', temp: 0.2, tint: -0.25 }, night: { f: 'brightness(0.72) saturate(0.7) hue-rotate(-12deg)', temp: -0.5, vig: 0.4 } };
  function filterOf(c, blur) {
    var f = [], lk = LOOKF[c.look];
    if (lk) f.push(lk.f);
    if (c.bri) f.push('brightness(' + (1 + c.bri).toFixed(3) + ')'); if (c.con) f.push('contrast(' + (1 + c.con).toFixed(3) + ')'); if (c.sat) f.push('saturate(' + (1 + c.sat).toFixed(3) + ')');
    var b = (blur || 0) + (c.blur || 0); if (b > 0.3) f.push('blur(' + b.toFixed(1) + 'px)');
    return f.join(' ');
  }
  var GRAIN = null;
  function grainCanvas() {
    if (GRAIN) return GRAIN; var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), d = g.createImageData(256, 256);
    for (var i = 0; i < d.data.length; i += 4) { var v = 128 + (Math.random() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); GRAIN = c; return c;
  }
  function curveIdent(a) { return !a || (a.length === 2 && a[0][0] === 0 && a[0][1] === 0 && a[1][0] === 1 && a[1][1] === 1); }
  function hasCurve(c) { return !!(c.cS || c.cM || c.cH || (c.curves && (!curveIdent(c.curves.m) || !curveIdent(c.curves.r) || !curveIdent(c.curves.g) || !curveIdent(c.curves.b)))); }
  function spline(pts) {
    var n = pts.length, X = pts.map(function (p) { return p[0]; }), Y = pts.map(function (p) { return p[1]; }), d = [], m = [], i;
    if (n < 2) return function () { return 0; };
    for (i = 0; i < n - 1; i++) { var dx = X[i + 1] - X[i]; d.push(dx > 1e-6 ? (Y[i + 1] - Y[i]) / dx : 0); }
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { var t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    return function (x) {
      if (x <= X[0]) return Y[0]; if (x >= X[n - 1]) return Y[n - 1];
      var k = 0; while (k < n - 2 && x > X[k + 1]) k++;
      var h = X[k + 1] - X[k]; if (h < 1e-6) return Y[k]; var t = (x - X[k]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * Y[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * Y[k + 1] + (t3 - t2) * h * m[k + 1];
    };
  }
  function curveEval(pts, x) { return clamp(spline(pts)(x), 0, 1); }
  var FILT = (function () { try { var c = document.createElement('canvas').getContext('2d'); if (!('filter' in c)) return false; c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  function colorOps(f) {
    var ops = [], re = /([a-z-]+)\(([-\d.]+)(deg|px)?\)/g, m; while ((m = re.exec(f || ''))) if (m[1] !== 'blur') ops.push([m[1], +m[2]]); return ops;
  }
  function applyOps(d, ops) {
    if (!ops.length) return;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue; var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      for (var k = 0; k < ops.length; k++) {
        var n = ops[k][0], a = ops[k][1], R, G, B;
        if (n === 'brightness') { r *= a; g *= a; b *= a; }
        else if (n === 'contrast') { r = (r - 0.5) * a + 0.5; g = (g - 0.5) * a + 0.5; b = (b - 0.5) * a + 0.5; }
        else if (n === 'saturate' || n === 'grayscale') { var s = n === 'saturate' ? a : 1 - Math.min(1, a);
          R = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b; G = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b; B = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b; r = R; g = G; b = B; }
        else if (n === 'sepia') { var q = 1 - Math.min(1, a);
          R = (0.393 + 0.607 * q) * r + (0.769 - 0.769 * q) * g + (0.189 - 0.189 * q) * b; G = (0.349 - 0.349 * q) * r + (0.686 + 0.314 * q) * g + (0.168 - 0.168 * q) * b; B = (0.272 - 0.272 * q) * r + (0.534 - 0.534 * q) * g + (0.131 + 0.869 * q) * b; r = R; g = G; b = B; }
        else if (n === 'hue-rotate') { var h = a * Math.PI / 180, co = Math.cos(h), si = Math.sin(h);
          R = (0.213 + co * 0.787 - si * 0.213) * r + (0.715 - co * 0.715 - si * 0.715) * g + (0.072 - co * 0.072 + si * 0.928) * b;
          G = (0.213 - co * 0.213 + si * 0.143) * r + (0.715 + co * 0.285 + si * 0.140) * g + (0.072 - co * 0.072 - si * 0.283) * b;
          B = (0.213 - co * 0.213 - si * 0.787) * r + (0.715 - co * 0.715 + si * 0.715) * g + (0.072 + co * 0.928 + si * 0.072) * b; r = R; g = G; b = B; }
        r = r < 0 ? 0 : r > 1 ? 1 : r; g = g < 0 ? 0 : g > 1 ? 1 : g; b = b < 0 ? 0 : b > 1 ? 1 : b;
      }
      d[i] = r * 255; d[i + 1] = g * 255; d[i + 2] = b * 255;
    }
  }
  function softBlur(cx, w, h, b) {
    if (b <= 0.3) return; var k = Math.min(24, 1 + b / 1.5), sw = Math.max(1, Math.round(w / k)), sh = Math.max(1, Math.round(h / k)), sc = scratch('blur', sw, sh), g = sc.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, sw, sh); g.drawImage(cx.canvas, 0, 0, w, h, 0, 0, sw, sh);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'copy'; cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(sc, 0, 0, sw, sh, 0, 0, w, h); cx.restore();
  }
  var LUTC = {}, LUTN = 0;
  function curveLut(c) {
    var k = JSON.stringify([c.cS || 0, c.cM || 0, c.cH || 0, c.curves || 0]); if (LUTC[k]) return LUTC[k];
    var C = c.curves || {}, id = function (x) { return x; }, fm = curveIdent(C.m) ? id : spline(C.m), fr = curveIdent(C.r) ? id : spline(C.r), fg = curveIdent(C.g) ? id : spline(C.g), fb = curveIdent(C.b) ? id : spline(C.b);
    var R = new Uint8ClampedArray(256), G = new Uint8ClampedArray(256), B = new Uint8ClampedArray(256);
    for (var i = 0; i < 256; i++) { var x = i / 255, y = clamp(x + 0.25 * ((c.cS || 0) * 6.75 * x * (1 - x) * (1 - x) + (c.cM || 0) * 4 * x * (1 - x) + (c.cH || 0) * 6.75 * x * x * (1 - x)), 0, 1); y = clamp(fm(y), 0, 1);
      R[i] = Math.round(clamp(fr(y), 0, 1) * 255); G[i] = Math.round(clamp(fg(y), 0, 1) * 255); B[i] = Math.round(clamp(fb(y), 0, 1) * 255); }
    var L = { r: R, g: G, b: B }; if (++LUTN > 60) { LUTC = {}; LUTN = 0; } LUTC[k] = L; return L;
  }
  function pixFx(cx, w, h, o) {
    var im; try { im = cx.getImageData(0, 0, w, h); } catch (e) { return; }
    var d = im.data; if (o.__ops) applyOps(d, o.__ops);
    var L = hasCurve(o) ? curveLut(o) : null, key = !!o.keyOn;
    if (!L && !key) { cx.putImageData(im, 0, 0); return; }
    var kcb = 0, kcr = 0, sim = 0, sm = 1, sp = 0;
    if (key) { var n = parseInt((o.keyColor || '#00ff00').slice(1), 16), kr = n >> 16 & 255, kg = n >> 8 & 255, kb = n & 255; kcb = -0.1687 * kr - 0.3313 * kg + 0.5 * kb; kcr = 0.5 * kr - 0.4187 * kg - 0.0813 * kb; sim = (o.keySim == null ? 0.35 : o.keySim) * 100; sm = Math.max(0.5, (o.keySmooth == null ? 0.1 : o.keySmooth) * 100); sp = o.keySpill == null ? 0.5 : o.keySpill; }
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      if (key) {
        var cb = -0.1687 * r - 0.3313 * g + 0.5 * b - kcb, cr = 0.5 * r - 0.4187 * g - 0.0813 * b - kcr, dist = Math.sqrt(cb * cb + cr * cr), a = (dist - sim) / sm;
        if (a <= 0) { d[i + 3] = 0; continue; } if (a < 1) d[i + 3] = d[i + 3] * a;
        var t = 1 - (dist - sim) / (sm + 60); if (t > 0 && sp > 0) { t *= sp; var Y = 0.299 * r + 0.587 * g + 0.114 * b; r += (Y - r) * t; g += (Y - g) * t; b += (Y - b) * t; }
      }
      if (L) { r = L.r[r | 0]; g = L.g[g | 0]; b = L.b[b | 0]; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    cx.putImageData(im, 0, 0);
  }
  function postFx(ctx, W, H, c, t) {
    var lk = LOOKF[c.look] || {}, temp = (c.temp || 0) + (lk.temp || 0), tint = (c.tint || 0) + (lk.tint || 0), vig = Math.min(1, (c.vig || 0) + (lk.vig || 0)), gr = Math.min(1, (c.grain || 0) + (lk.grain || 0)), glow = lk.glow || 0;
    ctx.save();
    if (Math.abs(temp) > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = temp > 0 ? 'rgba(255,140,40,' + (Math.abs(temp) * 0.8).toFixed(3) + ')' : 'rgba(40,130,255,' + (Math.abs(temp) * 0.8).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (Math.abs(tint) > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = tint > 0 ? 'rgba(255,60,200,' + (Math.abs(tint) * 0.7).toFixed(3) + ')' : 'rgba(40,220,120,' + (Math.abs(tint) * 0.7).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (glow > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,240,230,' + (glow * 0.12).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (vig > 0.01) { ctx.globalCompositeOperation = 'source-over'; var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (vig * 0.85).toFixed(3) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (gr > 0.01 && typeof document !== 'undefined') { var gc = grainCanvas(), pat = ctx.createPattern(gc, 'repeat'), ox = Math.floor(rnd(Math.floor(t * 24)) * 256), oy = Math.floor(rnd(Math.floor(t * 24) + 7) * 256); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = gr * 0.45; ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(ox, oy, W, H); }
    ctx.restore();
  }
  function srcTime(c, lt) { var sp = c.speed || 1; return c.rev ? Math.max(c.in, c.out - lt * sp - 0.02) : Math.min(c.out - 0.02, c.in + lt * sp); }
  function cropRect(c, sz) { var cr = c.crop || {}, l = cr.l || 0, t = cr.t || 0, r = cr.r || 0, b = cr.b || 0; return [sz[0] * l, sz[1] * t, Math.max(1, sz[0] * (1 - l - r)), Math.max(1, sz[1] * (1 - t - b))]; }
  function paintClip(ctx, W, H, p, c, M, lt, dur, blur, t) {
    if (!FILT && !ctx.__pc && ctx.canvas && ctx.getTransform) {
      var ops = colorOps(filterOf(c, 0)), bb = (blur || 0) + (c.blur || 0);
      if (ops.length || bb > 0.3 || hasCurve(c)) {
        var cv = ctx.canvas, tf = ctx.getTransform(), sc = scratch('pc', cv.width, cv.height), g = sc.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height); g.setTransform(tf); g.__pc = true;
        paintClipRaw(g, W, H, p, c, M, lt, dur, 0, t, function () {
          if (bb > 0.3) softBlur(g, cv.width, cv.height, bb * Math.hypot(tf.a, tf.b));
          if (ops.length || hasCurve(c)) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); pixFx(g, cv.width, cv.height, Object.assign({}, c, { __ops: ops, keyOn: false })); g.restore(); }
        });
        g.__pc = false; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sc, 0, 0); ctx.restore(); return;
      }
    }
    paintClipRaw(ctx, W, H, p, c, M, lt, dur, blur, t, null);
  }
  function paintClipRaw(ctx, W, H, p, c, M, lt, dur, blur, t, mid) {
    if (c.kind === 'color') {
      var g;
      if (c.grad === 'radial') { g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2); g.addColorStop(0, c.c2); g.addColorStop(1, c.c1); }
      else if (c.grad === 'linear') { var a = ((c.ang || 0) + (c.spin || 0) * lt) * Math.PI / 180, R = Math.hypot(W, H) / 2, dx = Math.cos(a) * R, dy = Math.sin(a) * R; g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy); g.addColorStop(0, c.c1); g.addColorStop(1, c.c2); }
      else g = c.c1;
      var f0 = filterOf(c, blur); if (f0 && FILT) ctx.filter = f0;
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      var s = c.kind === 'video' ? M.vids && M.vids[c.id] : M.imgs && M.imgs[c.media], sz = srcSize(s);
      var ready = s && sz[0] && (c.kind !== 'video' || s.readyState >= 2);
      ctx.fillStyle = ready ? p.bg || '#000' : '#141414'; ctx.fillRect(0, 0, W, H);
      if (ready) {
        var f = filterOf(c, blur); if (f && FILT) ctx.filter = f;
        var cr = cropRect(c, sz), sc = c.fit === 'contain' ? Math.min(W / cr[2], H / cr[3]) : Math.max(W / cr[2], H / cr[3]), z = (c.zoom || 1) * (c.scale || 1);
        if (c.kb) z *= 1 + 0.08 * clamp(lt / dur, 0, 1);
        sc *= z; var dw = cr[2] * sc, dh = cr[3] * sc, fx = c.fx == null ? 0.5 : c.fx, fy = c.fy == null ? 0.5 : c.fy;
        ctx.save(); ctx.translate(W / 2 + (c.x || 0) * W, H / 2 + (c.y || 0) * H); if (c.rot) ctx.rotate(c.rot * Math.PI / 180); if (c.flipH || c.flipV) ctx.scale(c.flipH ? -1 : 1, c.flipV ? -1 : 1);
        ctx.drawImage(s, cr[0], cr[1], cr[2], cr[3], -dw / 2 + (W - dw) * (fx - 0.5), -dh / 2 + (H - dh) * (fy - 0.5), dw, dh);
        ctx.restore();
      }
    }
    if (FILT) ctx.filter = 'none';
    if (mid) mid(); else if (hasCurve(c)) pixFx(ctx, W, H, Object.assign({}, c, { keyOn: false }));
    if (c.dim > 0) { ctx.fillStyle = 'rgba(0,0,0,' + c.dim.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    postFx(ctx, W, H, c, t || 0);
  }
  var SCR = {};
  function scratch(k, W, H) { var c = SCR[k]; if (!c || c.width !== W || c.height !== H) { c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }); SCR[k] = c; } var g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; if ('filter' in g) g.filter = 'none'; g.clearRect(0, 0, W, H); return c; }
  function outFx(ctx, W, H, ty, k) {
    var e = easeInOut(k);
    if (/^push-/.test(ty) || ty === 'whip') { var d = ty === 'whip' ? 'l' : ty.slice(5); ctx.translate(d === 'l' ? -e * W : d === 'r' ? e * W : 0, d === 'u' ? -e * H : d === 'd' ? e * H : 0); }
    else if (ty === 'zoom-in') { ctx.globalAlpha = 1 - e * 0.6; var s = 1 + 0.5 * e; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }
    else if (ty === 'zoom-out') { var s2 = 1 - 0.3 * e; ctx.translate(W / 2, H / 2); ctx.scale(s2, s2); ctx.translate(-W / 2, -H / 2); }
    else if (ty === 'xzoom' || ty === 'ramp') { var s9 = 1 + (ty === 'xzoom' ? 0.6 : 0.25) * e; ctx.translate(W / 2, H / 2); ctx.scale(s9, s9); ctx.translate(-W / 2, -H / 2); }
    return ty === 'whip' ? Math.sin(Math.PI * k) * 30 : ty === 'xzoom' ? Math.sin(Math.PI * k) * 26 : ty === 'ramp' ? Math.sin(Math.PI * k) * 18 : 0;
  }
  function inPath(ctx, W, H, ty, e) {
    ctx.beginPath();
    if (ty === 'wipe-r') ctx.rect(0, 0, W * e, H);
    else if (ty === 'wipe-l') ctx.rect(W * (1 - e), 0, W * e, H);
    else if (ty === 'wipe-d') ctx.rect(0, 0, W, H * e);
    else if (ty === 'wipe-u') ctx.rect(0, H * (1 - e), W, H * e);
    else if (ty === 'iris') ctx.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e + 0.5, 0, Math.PI * 2);
    else if (ty === 'diamond') { var r = (W + H) / 2 * e * 1.02 + 0.5; ctx.moveTo(W / 2, H / 2 - r); ctx.lineTo(W / 2 + r, H / 2); ctx.lineTo(W / 2, H / 2 + r); ctx.lineTo(W / 2 - r, H / 2); ctx.closePath(); }
    else if (ty === 'clock') { var R = Math.hypot(W, H); ctx.moveTo(W / 2, H / 2); ctx.arc(W / 2, H / 2, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); ctx.closePath(); }
    else if (ty === 'blinds') { var n = 8, bh = H / n; for (var i = 0; i < n; i++) ctx.rect(0, i * bh, W, bh * e + 0.5); }
    else if (ty === 'doors') ctx.rect(W / 2 * (1 - e), 0, W * e, H);
    else if (ty === 'bars') { var m = 10, bw = W / m; for (var j = 0; j < m; j++) { var kk = clamp(e * 1.6 - (j / m) * 0.6, 0, 1); ctx.rect(j * bw, 0, bw + 0.5, H * kk); } }
    ctx.clip();
  }
  var CLIPT = ['wipe-r', 'wipe-l', 'wipe-d', 'wipe-u', 'iris', 'diamond', 'clock', 'blinds', 'doors', 'bars'];
  function drawClip(ctx, W, H, p, l, M, t, S, outTy, outK) {
    var c = l.c, lt = t - l.start, k = l.tr ? clamp(lt / l.tr, 0, 1) : 1, ty = k < 1 ? c.trans.type : 'none', e, blur = 0;
    if (p.tin && p.tin.type !== 'none' && p.clips[0] === c) { var k0 = clamp(lt / Math.min(p.tin.dur, l.dur / 2), 0, 1); if (k0 < k) { k = k0; ty = p.tin.type; } }
    if (p.tout && p.tout.type !== 'none' && p.clips[p.clips.length - 1] === c) { var k1 = clamp((l.end - t) / Math.min(p.tout.dur, l.dur / 2), 0, 1); if (k1 < k) { k = k1; ty = p.tout.type; } }
    e = easeInOut(k);
    ctx.save();
    if (outTy && outK > 0) blur = outFx(ctx, W, H, outTy, outK) * S;
    if (ty === 'dip' || ty === 'dipw') { ctx.fillStyle = ty === 'dip' ? '#000' : '#fff'; ctx.globalAlpha = clamp(k * 2, 0, 1); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = clamp(k * 2 - 1, 0, 1); }
    else if (ty === 'fade') ctx.globalAlpha = e;
    else if (ty === 'flash') { ctx.globalAlpha = k > 0.5 ? 1 : 0; }
    else if (/^push-/.test(ty) || ty === 'whip') { var d = ty === 'whip' ? 'l' : ty.slice(5); ctx.translate(d === 'l' ? (1 - e) * W : d === 'r' ? -(1 - e) * W : 0, d === 'u' ? (1 - e) * H : d === 'd' ? -(1 - e) * H : 0); if (ty === 'whip') blur = Math.sin(Math.PI * k) * 30 * S; }
    else if (/^cover-/.test(ty)) { var d2 = ty.slice(6); ctx.translate(d2 === 'l' ? (1 - e) * W : d2 === 'r' ? -(1 - e) * W : 0, d2 === 'u' ? (1 - e) * H : d2 === 'd' ? -(1 - e) * H : 0); }
    else if (ty === 'zoom-in') { ctx.globalAlpha = e; var s = 1.3 - 0.3 * e; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }
    else if (ty === 'zoom-out') { ctx.globalAlpha = e; var s3 = 0.7 + 0.3 * e; ctx.translate(W / 2, H / 2); ctx.scale(s3, s3); ctx.translate(-W / 2, -H / 2); }
    else if (ty === 'spin') { ctx.globalAlpha = e; ctx.translate(W / 2, H / 2); ctx.rotate((1 - e) * -Math.PI / 2); var s4 = 0.4 + 0.6 * e; ctx.scale(s4, s4); ctx.translate(-W / 2, -H / 2); }
    else if (ty === 'blur') { ctx.globalAlpha = e; blur = (1 - e) * 36 * S; }
    else if (ty === 'xzoom' || ty === 'ramp') { ctx.globalAlpha = clamp((k - (ty === 'xzoom' ? 0.3 : 0.35)) / (ty === 'xzoom' ? 0.4 : 0.3), 0, 1); var s5 = 1 + (ty === 'xzoom' ? 0.6 : 0.18) * (1 - e); ctx.translate(W / 2, H / 2); ctx.scale(s5, s5); ctx.translate(-W / 2, -H / 2); blur = Math.sin(Math.PI * k) * (ty === 'xzoom' ? 26 : 18) * S; }
    else if (ty === 'match') ctx.globalAlpha = e;
    else if (ty === 'leak') ctx.globalAlpha = clamp((k - 0.25) / 0.5, 0, 1);
    else if (ty === 'mask') { var mbw = W * 0.3, mbx = -mbw / 2 + e * (W + mbw); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, mbx), H); ctx.clip(); }
    else if (CLIPT.indexOf(ty) >= 0) inPath(ctx, W, H, ty, e);
    if (ty === 'glitch' || ty === 'pixel' || ty === 'chroma') {
      var sc = scratch('tr', W, H), g = sc.getContext('2d'); paintClip(g, W, H, p, c, M, lt, l.dur, 0, t);
      if (ty === 'chroma') {
        var amp2 = (Math.sin(Math.PI * k) * 0.03 + (1 - k) * 0.012) * W, mix = scratch('chmix', W, H), mg = mix.getContext('2d'), chs = [['#ff0000', -amp2], ['#00ff00', 0], ['#0000ff', amp2]];
        for (var ci = 0; ci < 3; ci++) { var cs = scratch('ch', W, H), cg = cs.getContext('2d'); cg.drawImage(sc, 0, 0); cg.globalCompositeOperation = 'multiply'; cg.fillStyle = chs[ci][0]; cg.fillRect(0, 0, W, H); cg.globalCompositeOperation = 'destination-in'; cg.drawImage(sc, 0, 0); mg.globalCompositeOperation = 'lighter'; mg.drawImage(cs, chs[ci][1], 0); }
        ctx.globalAlpha = clamp(k * 1.5, 0, 1); var nb = 9, sbh = H / nb, sd = Math.floor(t * 24);
        for (var si = 0; si < nb; si++) { var so = rnd(sd * 17 + si) > 0.55 ? (rnd(sd + si * 5) - 0.5) * amp2 * 3 : 0; ctx.drawImage(mix, 0, si * sbh, W, sbh, so, si * sbh, W, sbh); }
      } else if (ty === 'pixel') {
        var px = Math.max(1, Math.round(Math.min(W, H) / 12 * Math.sin(Math.PI * (0.5 + k / 2)) + 1)), sm = scratch('px', Math.max(1, Math.ceil(W / px)), Math.max(1, Math.ceil(H / px))), sg = sm.getContext('2d');
        sg.drawImage(sc, 0, 0, sm.width, sm.height); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = clamp(k * 2, 0, 1); ctx.drawImage(sm, 0, 0, W, H); ctx.imageSmoothingEnabled = true;
      } else {
        var n = 14, bh = H / n, amp = (1 - k) * W * 0.12, seed = Math.floor(t * 30);
        ctx.globalAlpha = clamp(k * 1.6, 0, 1);
        for (var i = 0; i < n; i++) { var off = (rnd(seed * 31 + i) - 0.5) * 2 * amp * (rnd(seed + i * 7) > 0.4 ? 1 : 0); ctx.drawImage(sc, 0, i * bh, W, bh, off, i * bh, W, bh); }
        if (k < 0.8) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35 * (1 - k); ctx.drawImage(sc, amp * 0.3, 0); ctx.globalCompositeOperation = 'source-over'; }
      }
    } else if (ctx.globalAlpha > 0.001) paintClip(ctx, W, H, p, c, M, lt, l.dur, blur, t);
    if (ty === 'flash') { ctx.globalAlpha = 1 - Math.abs(2 * k - 1); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    if (ty === 'mask' && k < 1) { var bw2 = W * 0.3, bx2 = -bw2 / 2 + e * (W + bw2), mgr = ctx.createLinearGradient(bx2 - bw2 / 2, 0, bx2 + bw2 / 2, 0); mgr.addColorStop(0, 'rgba(5,5,5,0)'); mgr.addColorStop(0.3, 'rgba(5,5,5,1)'); mgr.addColorStop(0.7, 'rgba(5,5,5,1)'); mgr.addColorStop(1, 'rgba(5,5,5,0)'); ctx.save(); ctx.fillStyle = mgr; ctx.fillRect(bx2 - bw2 / 2, 0, bw2, H); ctx.restore(); }
    if (ty === 'leak' && k < 1) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.sin(Math.PI * k); var gx = W * (0.15 + 0.7 * k), gy = H * 0.35, lr = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.8); lr.addColorStop(0, 'rgba(255,238,200,1)'); lr.addColorStop(0.28, 'rgba(255,150,60,0.9)'); lr.addColorStop(0.62, 'rgba(190,40,20,0.45)'); lr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function ovDur(o) { return o.kind === 'video' ? Math.max(0.1, (o.out - o.in) / (o.speed || 1)) : Math.max(0.2, o.dur || 4); }
  function drawOv(ctx, W, H, p, o, M, t, rects) {
    var lt = t - o.start, d = ovDur(o), s = o.kind === 'video' ? M.vids && M.vids[o.id] : M.imgs && M.imgs[o.media], sz = srcSize(s);
    if (!s || !sz[0] || (o.kind === 'video' && s.readyState < 2)) return;
    var cr = cropRect(o, sz), dw = o.scale * W, dh = dw * cr[3] / cr[2], cx = o.x * W, cy = o.y * H;
    if (rects) rects['ov:' + o.id] = { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
    var inD = Math.min(0.5, d / 3), kIn = o.anim === 'none' ? 1 : clamp(lt / inD, 0, 1), kOut = o.anim === 'none' ? 1 : clamp((d - lt) / inD, 0, 1), k = Math.min(kIn, kOut), e = easeOut(k);
    var a = o.opacity; if (o.fadeIn > 0) a *= clamp(lt / o.fadeIn, 0, 1); if (o.fadeOut > 0) a *= clamp((d - lt) / o.fadeOut, 0, 1);
    ctx.save(); ctx.translate(cx, cy);
    if (o.anim === 'fade') a *= e; else if (o.anim === 'pop') { a *= clamp(k * 3, 0, 1); var ps = 0.5 + 0.5 * easeBack(k); ctx.scale(ps, ps); } else if (o.anim === 'slide') { a *= e; ctx.translate((1 - e) * -W * 0.2, 0); } else if (o.anim === 'zoom') { a *= e; var zs = 1.4 - 0.4 * e; ctx.scale(zs, zs); } else if (o.anim === 'rise') { a *= e; ctx.translate(0, (1 - e) * H * 0.12); }
    if (a <= 0.001) { ctx.restore(); return; }
    ctx.globalAlpha = a; ctx.globalCompositeOperation = o.blend || 'source-over';
    if (o.rot) ctx.rotate(o.rot * Math.PI / 180); if (o.flipH || o.flipV) ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
    var rad = (o.radius || 0) * Math.min(dw, dh) / 2;
    if (o.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = Math.min(W, H) * 0.03; ctx.shadowOffsetY = Math.min(W, H) * 0.01; ctx.fillStyle = '#000'; rr(ctx, -dw / 2, -dh / 2, dw, dh, rad); ctx.fill(); ctx.restore(); }
    if (rad > 0 || o.border > 0) { rr(ctx, -dw / 2, -dh / 2, dw, dh, rad); ctx.save(); ctx.clip(); }
    var f = filterOf(o, 0), ops0 = FILT ? [] : colorOps(f);
    if (o.keyOn || hasCurve(o) || ops0.length || (!FILT && o.blur > 0.3)) {
      var sw = Math.max(1, Math.round(Math.min(Math.abs(dw), 1600))), sh = Math.max(1, Math.round(sw * Math.abs(dh / dw))), pc = scratch('px:' + o.id, sw, sh), px = pc.getContext('2d');
      px.clearRect(0, 0, sw, sh); if (f && FILT) px.filter = f; px.drawImage(s, cr[0], cr[1], cr[2], cr[3], 0, 0, sw, sh); if (FILT) px.filter = 'none';
      if (!FILT && o.blur > 0.3) softBlur(px, sw, sh, o.blur);
      pixFx(px, sw, sh, ops0.length ? Object.assign({}, o, { __ops: ops0 }) : o); ctx.drawImage(pc, -dw / 2, -dh / 2, dw, dh);
    } else {
      if (f && FILT) ctx.filter = f;
      ctx.drawImage(s, cr[0], cr[1], cr[2], cr[3], -dw / 2, -dh / 2, dw, dh);
    }
    if ('filter' in ctx) ctx.filter = 'none';
    if (rad > 0 || o.border > 0) { ctx.restore(); if (o.border > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = o.border * Math.min(W, H) * 0.01; ctx.strokeStyle = o.borderColor || '#fff'; rr(ctx, -dw / 2, -dh / 2, dw, dh, rad); ctx.stroke(); } }
    ctx.restore();
  }
  function textFill(ctx, x, top, bh) { if (!x.grad) return x.color; var g = ctx.createLinearGradient(0, top, 0, top + bh); g.addColorStop(0, x.color); g.addColorStop(1, x.color2 || x.color); return g; }
  function drawText(ctx, W, H, x, lt, U, rects, t) {
    var dur = x.dur, an = x.anim, none = an === 'none', inD = Math.min(0.7, dur / 3), outD = none ? 0 : Math.min(0.4, dur / 4);
    var kIn = none ? 1 : clamp(lt / inD, 0, 1), kOut = outD ? clamp((dur - lt) / outD, 0, 1) : 1, e = easeOut(kIn);
    var s = x.countdown ? fmtCount((x.cdFrom != null ? x.cdFrom : dur) - lt, x.cdFmt) : x.text; if (x.upper) s = s.toLocaleUpperCase('nb');
    var px = x.size * U; setFont(ctx, x, px);
    var lines = wrap(ctx, s, x.maxW * W), lh = px * x.lh, ws = lines.map(function (l) { return ctx.measureText(l).width; });
    var bw = Math.max.apply(null, ws.concat([1])), bh = lines.length * lh, ax = x.x * W, ay = x.y * H;
    var left = x.align === 'left' ? ax : x.align === 'right' ? ax - bw : ax - bw / 2, top = ay - bh / 2, pad = x.box !== 'none' ? px * 0.38 : px * 0.08;
    if (rects) rects[x.id] = { x: left - pad, y: top - pad, w: bw + pad * 2, h: bh + pad * 2 };
    var a = kOut * x.opacity; if (a <= 0.001) return;
    var tok = an === 'words' || an === 'letters' || an === 'wave' || an === 'bounce';
    ctx.save();
    if (an === 'fade' || an === 'type') a *= an === 'type' ? Math.min(1, kIn * 6) : e;
    else if (an === 'rise') { a *= e; ctx.translate(0, (1 - e) * px * 0.7); }
    else if (an === 'pop') { a *= clamp(kIn * 3, 0, 1); var sc = 0.55 + 0.45 * easeBack(kIn), cx = left + bw / 2; ctx.translate(cx, ay); ctx.scale(sc, sc); ctx.translate(-cx, -ay); }
    else if (an === 'slide') { a *= e; ctx.translate((x.align === 'right' ? 1 : -1) * (1 - e) * W * 0.12, 0); }
    else if (an === 'blur') { a *= e; if ('filter' in ctx) ctx.filter = 'blur(' + ((1 - e) * px * 0.3).toFixed(1) + 'px)'; }
    else if (an === 'zoomout') { a *= e; var zs = 1.8 - 0.8 * e, zx = left + bw / 2; ctx.translate(zx, ay); ctx.scale(zs, zs); ctx.translate(-zx, -ay); }
    else if (an === 'drop') { a *= clamp(kIn * 3, 0, 1); ctx.translate(0, -(1 - easeBack(kIn)) * H * 0.25); }
    else if (an === 'flip') { a *= clamp(kIn * 2, 0, 1); ctx.translate(0, ay); ctx.scale(1, Math.max(0.01, easeBack(kIn))); ctx.translate(0, -ay); }
    else if (an === 'spread') { a *= e; if ('letterSpacing' in ctx) ctx.letterSpacing = (((x.track || 0) + (1 - e) * 0.6) * px).toFixed(2) + 'px'; }
    else if (an === 'wipe') { var wx = left - pad + (bw + pad * 2) * e; ctx.beginPath(); ctx.rect(left - pad - 2, top - pad * 2, wx - left + pad + 2, bh + pad * 4); ctx.clip(); }
    ctx.globalAlpha = a;
    if (x.box === 'block') { ctx.fillStyle = x.bg; rr(ctx, left - pad, top - pad * 0.7, bw + pad * 2, bh + pad * 1.4, px * 0.12); ctx.fill(); }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    var fill = textFill(ctx, x, top, bh), sw = x.stroke > 0 ? x.stroke * px * 0.06 : 0;
    var total = lines.reduce(function (n, l) { return n + l.length; }, 0), budget = an === 'type' ? Math.floor(total * clamp(lt / Math.max(0.5, Math.min(dur * 0.6, total * 0.06)), 0, 1)) : Infinity;
    var glitch = an === 'glitch' && lt < Math.min(1.2, dur * 0.5), gs = Math.floor((t || lt) * 24);
    var paint = function (str, lx, ly) {
      if (sw) { ctx.lineWidth = sw * 2; ctx.strokeStyle = x.strokeColor || '#000'; ctx.strokeText(str, lx, ly); }
      if (glitch) { var j = (rnd(gs) - 0.5) * px * 0.25; ctx.save(); ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#ff2a6d'; ctx.fillText(str, lx + j - px * 0.05, ly); ctx.fillStyle = '#05d9e8'; ctx.fillText(str, lx - j + px * 0.05, ly); ctx.restore(); lx += (rnd(gs + 3) - 0.5) * px * 0.1; }
      ctx.fillStyle = fill; ctx.fillText(str, lx, ly);
    };
    var nTok = 0; if (tok) lines.forEach(function (l) { nTok += an === 'words' ? l.split(' ').filter(Boolean).length : l.length; });
    var ti = 0;
    lines.forEach(function (l, i) {
      var lx = x.align === 'left' ? left : x.align === 'right' ? left + bw - ws[i] : left + (bw - ws[i]) / 2, ly = top + lh * (i + 0.5) + px * 0.04;
      if (x.box === 'line' && l) { ctx.save(); ctx.fillStyle = x.bg; rr(ctx, lx - pad * 0.6, ly - px * 0.04 - lh * 0.5, ws[i] + pad * 1.2, lh * 0.98, px * 0.08); ctx.fill(); ctx.restore(); }
      if (x.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = px * 0.28; ctx.shadowOffsetY = px * 0.06; }
      if (!tok) {
        var part = l; if (budget !== Infinity) { part = l.slice(0, Math.max(0, budget)); budget -= l.length; }
        if (part) paint(part, lx, ly); return;
      }
      var parts = an === 'words' ? l.split(/(\s+)/) : l.split('');
      var cur = lx, spread = Math.min(dur * 0.55, nTok * (an === 'words' ? 0.16 : 0.045));
      parts.forEach(function (pt) {
        var w = ctx.measureText(pt).width; if (!pt.trim()) { cur += w; return; }
        var dl = nTok > 1 ? (ti / (nTok - 1)) * spread : 0, kk = clamp((lt - dl) / 0.35, 0, 1), ee = easeOut(kk); ti++;
        ctx.save();
        if (an === 'wave') { var wy = Math.sin(lt * 5 - ti * 0.45) * px * 0.12; ctx.globalAlpha = a * Math.min(1, kIn * 2); ctx.translate(0, wy); }
        else if (an === 'bounce') { ctx.globalAlpha = a * clamp(kk * 3, 0, 1); ctx.translate(0, -(1 - easeBack(kk)) * px * 0.9); }
        else if (an === 'letters') { ctx.globalAlpha = a * kk; var ls = 0.3 + 0.7 * easeBack(kk), cxx = cur + w / 2; ctx.translate(cxx, ly); ctx.scale(ls, ls); ctx.translate(-cxx, -ly); }
        else { ctx.globalAlpha = a * ee; ctx.translate(0, (1 - ee) * px * 0.45); }
        paint(pt, cur, ly); ctx.restore(); cur += w;
      });
    });
    ctx.restore();
  }
  function drawSub(ctx, W, H, st, sub, U, t) {
    var px = st.size * U, x = { font: st.font, weight: st.weight, track: 0 }; setFont(ctx, x, px);
    var s = st.upper ? sub.text.toLocaleUpperCase('nb') : sub.text, lines = wrap(ctx, s, W * 0.86), lh = px * 1.22, bh = lines.length * lh;
    var cy = st.pos === 'top' ? H * 0.1 + bh / 2 : st.pos === 'center' ? H * 0.5 : H * 0.9 - bh / 2;
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    var words = s.split(/\s+/).filter(Boolean), nW = words.length, wi = 0, hlIdx = st.mode === 'words' && nW ? Math.min(nW - 1, Math.floor(clamp((t - sub.start) / Math.max(0.2, sub.end - sub.start), 0, 0.9999) * nW)) : -1;
    lines.forEach(function (l, i) {
      var ly = cy - bh / 2 + lh * (i + 0.5), w = ctx.measureText(l).width, lx = W / 2 - w / 2;
      if (st.bgOn && l) { ctx.fillStyle = hexA(st.bg, st.bgA); rr(ctx, lx - px * 0.4, ly - lh / 2, w + px * 0.8, lh, px * 0.14); ctx.fill(); }
      else { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = px * 0.3; ctx.shadowOffsetY = px * 0.05; }
      if (hlIdx < 0) { ctx.fillStyle = st.color; ctx.fillText(l, lx, ly + px * 0.04); }
      else l.split(/(\s+)/).forEach(function (pt) { var ww = ctx.measureText(pt).width; if (pt.trim()) { ctx.fillStyle = wi === hlIdx ? st.hl || '#f5b82c' : st.color; ctx.fillText(pt, lx, ly + px * 0.04); wi++; } lx += ww; });
      ctx.shadowColor = 'transparent';
    });
    ctx.restore();
  }
  function hidden(p, k) { return !!(p.tracks && p.tracks[k] && p.tracks[k].hide); }
  function mixOf(p) { var m = p.mix || {}; return { video: m.video == null ? 1 : m.video, ov: m.ov == null ? 1 : m.ov, music: m.music == null ? 1 : m.music, duck: !!m.duck, duckAmt: m.duckAmt == null ? 0.6 : m.duckAmt }; }
  var DUCK_A = 0.3, DUCK_R = 0.6;
  function voiced(p) {
    var R = [], mx = mixOf(p);
    if (!hidden(p, 'video') && mx.video > 0) layout(p).forEach(function (l) { if (l.c.kind === 'video' && !l.c.muted && l.c.vol > 0) R.push([l.start, l.end]); });
    if (!hidden(p, 'ov') && mx.ov > 0) (p.ov || []).forEach(function (o) { if (o.kind === 'video' && !o.muted && o.vol > 0) R.push([o.start, o.start + ovDur(o)]); });
    R.sort(function (a, b) { return a[0] - b[0]; }); var out = [];
    R.forEach(function (r) { var l = out[out.length - 1]; if (l && r[0] - DUCK_A <= l[1] + DUCK_R) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); });
    return out;
  }
  function duckAt(p, t, R) {
    var mx = mixOf(p); if (!mx.duck) return 1; R = R || voiced(p); var w = 0;
    for (var i = 0; i < R.length; i++) { var s = R[i][0], e = R[i][1];
      if (t >= s && t <= e) { w = 1; break; }
      if (t >= s - DUCK_A && t < s) w = Math.max(w, (t - (s - DUCK_A)) / DUCK_A);
      if (t > e && t <= e + DUCK_R) w = Math.max(w, 1 - (t - e) / DUCK_R); }
    return 1 - mx.duckAmt * w;
  }
  function drawFrame(ctx, W, H, p, M, t, rects) {
    var S = W / p.w, U = Math.min(p.w, p.h) / 1080 * S;
    ctx.save(); ctx.globalAlpha = 1; if ('filter' in ctx) ctx.filter = 'none';
    ctx.fillStyle = p.bg || '#000'; ctx.fillRect(0, 0, W, H);
    if (!hidden(p, 'video')) { var L = layout(p); L.forEach(function (l, i) { if (t >= l.start && t < l.end) { var nx = L[i + 1], ok = nx && nx.tr && t >= nx.start ? clamp((t - nx.start) / nx.tr, 0, 1) : 0; drawClip(ctx, W, H, p, l, M, t, S, ok ? nx.c.trans.type : null, ok); } }); }
    if (!hidden(p, 'ov')) (p.ov || []).slice().sort(function (a, b) { return (b.lane || 0) - (a.lane || 0); }).forEach(function (o) { if (t >= o.start && t < o.start + ovDur(o)) drawOv(ctx, W, H, p, o, M, t, rects); });
    if (!hidden(p, 'text')) (p.texts || []).slice().sort(function (a, b) { return (b.lane || 0) - (a.lane || 0); }).forEach(function (x) { if (t >= x.start && t < x.start + x.dur) drawText(ctx, W, H, x, t - x.start, U, rects, t); });
    if (!hidden(p, 'subs')) { var sub = (p.subs || []).find(function (s) { return t >= s.start && t < s.end; }); if (sub && sub.text) drawSub(ctx, W, H, p.subStyle, sub, U, t); }
    var lg = p.logo; if (lg && lg.on && lg.src) {
      var im = M.imgs && M.imgs[lg.src], sz = srcSize(im);
      if (sz[0]) { var mn = Math.min(W, H), lw = lg.size * mn, lh = lw * sz[1] / sz[0], mg = mn * 0.045; var lx = lg.x != null ? lg.x * W - lw / 2 : lg.pos[1] === 'l' ? mg : W - mg - lw, ly = lg.y != null ? lg.y * H - lh / 2 : lg.pos[0] === 't' ? mg : H - mg - lh; ctx.globalAlpha = lg.opacity; ctx.drawImage(im, lx, ly, lw, lh); if (rects) rects.logo = { x: lx, y: ly, w: lw, h: lh }; }
    }
    ctx.restore();
  }
  async function wave(blob, dur) {
    if (!blob || blob.size > 450e6) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), buf = await ac.decodeAudioData(await blob.arrayBuffer()); try { ac.close(); } catch (e) {}
      var d = buf.getChannelData(0), N = Math.min(6000, Math.max(200, Math.round(buf.duration * 40))), step = Math.max(1, Math.floor(d.length / N)), c = document.createElement('canvas'); c.width = N; c.height = 48;
      var g = c.getContext('2d'), mx = 0, pk = new Float32Array(N);
      for (var i = 0; i < N; i++) { var m = 0, o = i * step; for (var j = 0; j < step; j += 4) { var v = Math.abs(d[o + j] || 0); if (v > m) m = v; } pk[i] = m; if (m > mx) mx = m; }
      g.fillStyle = 'rgba(255,255,255,0.55)'; for (var k = 0; k < N; k++) { var h = Math.max(1, pk[k] / (mx || 1) * 46); g.fillRect(k, 24 - h / 2, 1, h); }
      return { url: c.toDataURL('image/png'), dur: buf.duration };
    } catch (e) { return null; }
  }

  /* ---------- storage ---------- */
  var DBP = null;
  function db() {
    return DBP || (DBP = new Promise(function (res, rej) {
      var r = indexedDB.open('motiondesign', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' }); if (!d.objectStoreNames.contains('media')) d.createObjectStore('media'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { DBP = null; rej(r.error); };
    }));
  }
  function tx(st, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) { var t = d.transaction(st, mode), q = fn(t.objectStore(st)), out; if (q) q.onsuccess = function () { out = q.result; }; t.oncomplete = function () { res(out); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error); }; });
    });
  }
  var store = {
    list: function () { return tx('projects', 'readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return y.updated - x.updated; }); }); },
    get: function (id) { return tx('projects', 'readonly', function (s) { return s.get(id); }); },
    put: function (p) { return tx('projects', 'readwrite', function (s) { return s.put(p); }); },
    del: function (id) { return tx('projects', 'readwrite', function (s) { return s.delete(id); }); },
    getMedia: function (id) { return tx('media', 'readonly', function (s) { return s.get(id); }); },
    putMedia: function (id, rec) { return tx('media', 'readwrite', function (s) { return s.put(rec, id); }); },
    delMedia: function (id) { return tx('media', 'readwrite', function (s) { return s.delete(id); }); }
  };

  /* ---------- project file (.videofy) ---------- */
  async function pack(p) {
    var files = [], blobs = [], off = 0;
    for (var i = 0; i < p.media.length; i++) {
      var r = await store.getMedia(p.media[i].id); if (!r || !r.blob) continue;
      files.push({ id: p.media[i].id, name: r.name, type: r.blob.type, size: r.blob.size, off: off }); off += r.blob.size; blobs.push(r.blob);
    }
    var json = new TextEncoder().encode(JSON.stringify({ v: 1, app: 'motiondesign', project: p, files: files })), head = new Uint8Array(8);
    head.set([86, 70, 89, 49]); new DataView(head.buffer).setUint32(4, json.length, true);
    return new Blob([head, json].concat(blobs), { type: 'application/octet-stream' });
  }
  async function unpack(file) {
    var head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (head.length < 8 || head[0] !== 86 || head[1] !== 70 || head[2] !== 89 || head[3] !== 49) throw new Error('Filen er ikke en Motion design-prosjektfil.');
    var n = new DataView(head.buffer).getUint32(4, true); if (n < 2 || n > 30e6 || 8 + n > file.size) throw new Error('Prosjektfilen er skadet.');
    var meta = JSON.parse(new TextDecoder().decode(await file.slice(8, 8 + n).arrayBuffer())), base = 8 + n;
    if (!meta || (meta.app !== 'motiondesign' && meta.app !== 'videofy') || !Array.isArray(meta.files)) throw new Error('Prosjektfilen er skadet.');
    var p = normalize(meta.project), map = {};
    for (var i = 0; i < meta.files.length; i++) {
      var f = meta.files[i], off = num(f.off, -1), sz = num(f.size, -1);
      if (typeof f.id !== 'string' || off < 0 || sz < 0 || base + off + sz > file.size) continue;
      var type = typeof f.type === 'string' && /^(video|image|audio)\/[\w.+-]+$/.test(f.type) ? f.type : 'application/octet-stream', nid = uid('m');
      await store.putMedia(nid, { blob: file.slice(base + off, base + off + sz, type), name: str(f.name, 'Fil', 200), type: type }); map[f.id] = nid;
    }
    p.id = uid('p'); p.updated = Date.now();
    p.media = p.media.filter(function (m) { return map[m.id]; }).map(function (m) { return Object.assign({}, m, { id: map[m.id] }); });
    p.clips = p.clips.filter(function (c) { return c.kind === 'color' || map[c.media]; }).map(function (c) { return c.kind === 'color' ? c : Object.assign({}, c, { media: map[c.media] }); });
    p.music = p.music.filter(function (m) { return map[m.media]; }).map(function (m) { return Object.assign({}, m, { media: map[m.media] }); });
    p.ov = p.ov.filter(function (m) { return map[m.media]; }).map(function (m) { return Object.assign({}, m, { media: map[m.media] }); });
    if (p.logo.src && !/^images\//.test(p.logo.src)) p.logo.src = map[p.logo.src] || '';
    return p;
  }

  /* ---------- audio ---------- */
  var DEC = new Map();
  async function decode(ctx, getBlob, id, sr) {
    var key = id + '@' + sr; if (DEC.has(key)) return DEC.get(key);
    var pr = (async function () { var b = await getBlob(id); if (!b) return null; try { return await ctx.decodeAudioData(await b.arrayBuffer()); } catch (e) { return null; } })();
    DEC.set(key, pr); return pr;
  }
  var REV = new Map();
  function reversed(oc, buf, key) {
    if (REV.has(key)) return REV.get(key);
    var r = oc.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (var ch = 0; ch < buf.numberOfChannels; ch++) { var s = buf.getChannelData(ch), d = r.getChannelData(ch), n = s.length; for (var i = 0; i < n; i++) d[i] = s[n - 1 - i]; }
    REV.set(key, r); if (REV.size > 6) REV.delete(REV.keys().next().value); return r;
  }
  function schedule(oc, buf, key, c, start, dur, v, fi, fo) {
    var sp = c.speed || 1, src = oc.createBufferSource(), g = oc.createGain(), off;
    if (c.rev) { src.buffer = reversed(oc, buf, key); off = Math.max(0, buf.duration - Math.min(c.out, buf.duration)); } else { src.buffer = buf; off = Math.min(c.in, buf.duration); }
    src.playbackRate.value = sp; fi = Math.min(fi || 0, dur / 2); fo = Math.min(fo || 0, dur / 2);
    g.gain.setValueAtTime(fi ? 0 : v, start); if (fi) g.gain.linearRampToValueAtTime(v, start + fi);
    if (fo) { g.gain.setValueAtTime(v, start + dur - fo); g.gain.linearRampToValueAtTime(0, start + dur); }
    src.connect(g); g.connect(oc.destination); src.start(start, off, dur * sp);
  }
  async function audioStats(getBlob, id, a, b) {
    var oc = new OfflineAudioContext(1, 1, 44100), buf = await decode(oc, getBlob, id, 44100); if (!buf) return null;
    var sr = buf.sampleRate, s0 = Math.max(0, Math.floor((a || 0) * sr)), s1 = Math.min(buf.length, b == null ? buf.length : Math.ceil(b * sr)), pk = 0, sum = 0, n = 0;
    for (var ch = 0; ch < buf.numberOfChannels; ch++) { var x = buf.getChannelData(ch); for (var i = s0; i < s1; i += 2) { var v = x[i] < 0 ? -x[i] : x[i]; if (v > pk) pk = v; sum += v * v; n++; } }
    return { peak: pk, rms: Math.sqrt(sum / Math.max(1, n)) };
  }
  async function beats(getBlob, id, a, b) {
    var oc = new OfflineAudioContext(1, 1, 44100), buf = await decode(oc, getBlob, id, 44100); if (!buf) return null;
    var sr = buf.sampleRate, x = buf.getChannelData(0), s0 = Math.max(0, Math.floor((a || 0) * sr)), s1 = Math.min(x.length, Math.ceil(Math.min(b == null ? 1e9 : b, (a || 0) + 240) * sr));
    var hop = 512, n = Math.floor((s1 - s0) / hop); if (n < 200) return null;
    var E = new Float32Array(n), O = new Float32Array(n), i, j;
    for (i = 0; i < n; i++) { var s = 0, o = s0 + i * hop; for (j = 0; j < hop; j++) { var v = x[o + j]; s += v * v; } E[i] = Math.log(1e-6 + s); }
    for (i = 1; i < n; i++) O[i] = Math.max(0, E[i] - E[i - 1]);
    var fps = sr / hop, lo = Math.floor(fps * 60 / 180), hi = Math.ceil(fps * 60 / 70), best = 0, bl = 0;
    for (var L = lo; L <= hi; L++) { var c = 0; for (i = L; i < n; i++) c += O[i] * O[i - L]; c /= (n - L); if (c > best) { best = c; bl = L; } }
    if (!bl || best <= 0) return null;
    var bp = bl, bo = 0, bs = -1;
    for (var P = bl - 1.5; P <= bl + 1.5; P += 0.05) for (var off = 0; off < P; off += 0.5) { var sm = 0, k = 0; for (var q = off; q < n; q += P) { sm += O[Math.round(q)] || 0; k++; } sm /= Math.max(1, k); if (sm > bs) { bs = sm; bp = P; bo = off; } }
    return { period: bp / fps, t0: bo / fps, bpm: 60 * fps / bp };
  }
  function toWav(buf) {
    var ch = buf.getChannelData(0), n = ch.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    var w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, ch[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return new Blob([ab], { type: 'audio/wav' });
  }
  async function renderAudio(p, getBlob, sr, total, opt) {
    opt = opt || {}; var mono = !!opt.mono, L = layout(p), any = false, MX = opt.raw ? { video: 1, ov: 1, music: 1, duck: false } : mixOf(p);
    var oc = new OfflineAudioContext(mono ? 1 : 2, Math.max(1, Math.ceil(total * sr)), sr);
    if (!hidden(p, 'video')) for (var i = 0; i < L.length; i++) {
      var l = L[i], c = l.c; if (c.kind !== 'video' || (!opt.raw && (c.muted || c.vol <= 0))) continue;
      var buf = await decode(oc, getBlob, c.media, sr); if (!buf) continue; any = true;
      var nx = L[i + 1]; schedule(oc, buf, c.media + '@' + sr, c, l.start, l.dur, opt.raw ? 1 : c.vol * MX.video, Math.max(l.tr, c.afi || 0, i === 0 && p.tin && p.tin.type !== 'none' ? Math.min(p.tin.dur, l.dur / 2) : 0), Math.max(nx && nx.tr || 0, c.afo || 0, !nx && p.tout && p.tout.type !== 'none' ? Math.min(p.tout.dur, l.dur / 2) : 0));
    }
    if (!hidden(p, 'ov')) for (var q = 0; q < (p.ov || []).length; q++) {
      var o = p.ov[q]; if (o.kind !== 'video' || (!opt.raw && (o.muted || o.vol <= 0))) continue;
      var ob = await decode(oc, getBlob, o.media, sr); if (!ob) continue; any = true;
      schedule(oc, ob, o.media + '@' + sr, o, o.start, ovDur(o), opt.raw ? 1 : o.vol * o.opacity * MX.ov, o.fadeIn, o.fadeOut);
    }
    var mbus = oc.destination;
    if (!opt.noMusic && !hidden(p, 'music') && (p.music || []).length) {
      var dg = oc.createGain(); dg.gain.setValueAtTime(MX.music, 0); dg.connect(oc.destination); mbus = dg;
      if (MX.duck) voiced(p).forEach(function (r) { var lo = MX.music * (1 - MX.duckAmt); dg.gain.setValueAtTime(MX.music, Math.max(0, r[0] - DUCK_A)); dg.gain.linearRampToValueAtTime(lo, Math.max(0.001, r[0])); dg.gain.setValueAtTime(lo, r[1]); dg.gain.linearRampToValueAtTime(MX.music, r[1] + DUCK_R); });
    }
    if (!opt.noMusic && !hidden(p, 'music')) for (var j = 0; j < (p.music || []).length; j++) {
      var m = p.music[j], mb = await decode(oc, getBlob, m.media, sr); if (!mb) continue; any = true;
      var len = m.loop ? Math.max(0, total - m.start) : Math.min(m.out - m.in, total - m.start); if (len <= 0) continue;
      var s2 = oc.createBufferSource(), g2 = oc.createGain(); s2.buffer = mb;
      if (m.loop) { s2.loop = true; s2.loopStart = m.in; s2.loopEnd = Math.min(m.out, mb.duration); }
      var fi = Math.min(m.fadeIn, len / 2), fo = Math.min(m.fadeOut, len / 2);
      g2.gain.setValueAtTime(fi ? 0 : m.vol, m.start); if (fi) g2.gain.linearRampToValueAtTime(m.vol, m.start + fi);
      if (fo) { g2.gain.setValueAtTime(m.vol, m.start + len - fo); g2.gain.linearRampToValueAtTime(0, m.start + len); }
      s2.connect(g2); g2.connect(mbus); s2.start(m.start, Math.min(m.in, mb.duration)); s2.stop(m.start + len);
    }
    if (!any) return null;
    return oc.startRendering();
  }

  /* ---------- export ---------- */
  function exportSize(p, q) { var b = q === '4k' ? 2 : 1, s = Math.min(1920 * b / Math.max(p.w, p.h), 1080 * b / Math.min(p.w, p.h)); return { w: Math.round(p.w * s / 2) * 2, h: Math.round(p.h * s / 2) * 2 }; }
  var MUX = null;
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve(window.Mp4Muxer);
    return MUX || (MUX = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js';
      sc.integrity = 'sha384-SujebcgqCNlLMRSnVkLD+3eWOzsxobv30Bct+0lV+fc1EHHEuvcePwmDgMzpnptj'; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
      sc.onload = function () { res(window.Mp4Muxer); }; sc.onerror = function () { MUX = null; rej(new Error('Kunne ikke laste eksportmodulen. Sjekk nettet.')); }; document.head.appendChild(sc);
    }));
  }
  function seek(v, tt) {
    return new Promise(function (r) {
      var to, done = function () { v.removeEventListener('seeked', done); clearTimeout(to); r(); };
      to = setTimeout(done, 2500); v.addEventListener('seeked', done); v.currentTime = tt;
    });
  }
  /* fallback for browsers without WebCodecs: plays the project in real time into MediaRecorder */
  async function exportRealtime(p, o) {
    var W = o.w, H = o.h, fps = Math.min(30, o.fps), total = totalDur(p);
    if (typeof MediaRecorder === 'undefined') throw new Error('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.');
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; if (!cv.captureStream) throw new Error('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.');
    var ctx = cv.getContext('2d'), stream = cv.captureStream(fps), ac = null, src = null;
    o.onProgress(0, 'Lager lydspor …');
    try { var ab = await renderAudio(p, o.getBlob, 48000, total); if (ab) { var C = window.AudioContext || window.webkitAudioContext; ac = new C({ sampleRate: 48000 }); var dst = ac.createMediaStreamDestination(); src = ac.createBufferSource(); src.buffer = ab; src.connect(dst); dst.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); }); } } catch (x) { ac = null; }
    var types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], mime = '';
    for (var i = 0; i < types.length; i++) { try { if (MediaRecorder.isTypeSupported(types[i])) { mime = types[i]; break; } } catch (x) {} }
    var rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.15) } : undefined), chunks = [];
    rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
    var stopped = new Promise(function (r) { rec.onstop = r; });
    var L = layout(p), vids = o.M.vids || {};
    drawFrame(ctx, W, H, p, o.M, 0, null); rec.start(500); if (src) src.start();
    var t0 = performance.now();
    for (var id in vids) { try { vids[id].pause(); } catch (x) {} }
    while (true) {
      if (o.aborted()) { rec.stop(); if (ac) ac.close(); throw new Error('abort'); }
      var t = (performance.now() - t0) / 1000; if (t >= total) break;
      for (var k = 0; k < L.length; k++) { var l = L[k]; if (l.c.kind !== 'video') continue; var v = vids[l.c.id]; if (!v || !v.duration) continue; if (t < l.start || t >= l.end) continue; var tt = Math.min(v.duration - 0.02, srcTime(l.c, t - l.start)); if (Math.abs(v.currentTime - tt) > 0.25) v.currentTime = tt; }
      drawFrame(ctx, W, H, p, o.M, t, null);
      o.onProgress(Math.round(t / total * 100), 'Tar opp video i sanntid … ' + Math.round(t / total * 100) + ' %');
      await new Promise(function (r) { setTimeout(r, 1000 / fps / 2); });
    }
    rec.stop(); await stopped; if (ac) try { ac.close(); } catch (x) {}
    var type = (mime || 'video/webm').split(';')[0], blob = new Blob(chunks, { type: type }); if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen.');
    return { blob: blob, audio: ac ? 'opus' : null, ext: type === 'video/mp4' ? 'mp4' : 'webm' };
  }
  async function exportMp4(p, o) {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return exportRealtime(p, o);
    var W = o.w, H = o.h, fps = o.fps, total = totalDur(p), nF = Math.max(1, Math.round(total * fps)), big = W * H > 2300000;
    var Mx = await loadMuxer();
    var cands = big ? ['avc1.640033', 'avc1.640034', 'avc1.4d0033'] : fps > 30 ? ['avc1.64002a', 'avc1.4d002a', 'avc1.640033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033'], vcfg = null;
    var br = Math.round(W * H * fps * (big ? 0.13 : 0.2));
    var vcodec = 'avc';
    for (var i = 0; i < cands.length && !vcfg; i++) { var cf = { codec: cands[i], width: W, height: H, bitrate: br, bitrateMode: 'variable', latencyMode: 'quality', framerate: fps, avc: { format: 'avc' } }; try { var r = await VideoEncoder.isConfigSupported(cf); if (r.supported) vcfg = r.config; } catch (e) {} }
    /* no H.264 encoder (e.g. Firefox on some systems): VP9 or AV1 in the same MP4 container */
    for (var i2 = 0, AL = [['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']]; i2 < AL.length && !vcfg; i2++) { try { var r2 = await VideoEncoder.isConfigSupported({ codec: AL[i2][0], width: W, height: H, bitrate: br, bitrateMode: 'variable', framerate: fps }); if (r2.supported) { vcfg = r2.config; vcodec = AL[i2][1]; } } catch (e) {} }
    if (!vcfg) return exportRealtime(p, o);
    var acfg = null, acodec = null;
    if (typeof AudioEncoder !== 'undefined') for (var j = 0, A = [['mp4a.40.2', 'aac'], ['opus', 'opus']]; j < A.length && !acfg; j++) { var ac = { codec: A[j][0], sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }; try { var ar = await AudioEncoder.isConfigSupported(ac); if (ar.supported) { acfg = ar.config; acodec = A[j][1]; } } catch (e) {} }
    o.onProgress(0, 'Lager lydspor …');
    var ab = acfg ? await renderAudio(p, o.getBlob, 48000, total) : null; if (!ab) acfg = null;
    var target = new Mx.ArrayBufferTarget(), err = null;
    var muxer = new Mx.Muxer({ target: target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: vcodec, width: W, height: H, frameRate: fps }, audio: acfg ? { codec: acodec, numberOfChannels: 2, sampleRate: 48000 } : undefined });
    var venc = new VideoEncoder({ output: function (ch, meta) { muxer.addVideoChunk(ch, meta); }, error: function (e) { err = e; } }); venc.configure(vcfg);
    try {
      if (acfg) {
        var aenc = new AudioEncoder({ output: function (ch, meta) { muxer.addAudioChunk(ch, meta); }, error: function (e) { err = e; } }); aenc.configure(acfg);
        var L0 = ab.getChannelData(0), R0 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L0, N = 4800;
        for (var s = 0; s < ab.length; s += N) { var n = Math.min(N, ab.length - s), d = new Float32Array(n * 2); d.set(L0.subarray(s, s + n), 0); d.set(R0.subarray(s, s + n), n); var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s / 48000 * 1e6), data: d }); aenc.encode(ad); ad.close(); }
        await aenc.flush(); aenc.close();
      }
      var cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }), ctx = cv.getContext('2d'), L = layout(p), t0 = performance.now();
      for (var f = 0; f < nF; f++) {
        if (o.aborted()) throw new Error('abort'); if (err) throw err;
        var t = f / fps;
        for (var k = 0; k < L.length; k++) {
          var l = L[k]; if (l.c.kind !== 'video' || t < l.start || t >= l.end) continue;
          var v = o.M.vids[l.c.id]; if (!v || !v.duration) continue;
          var tt = Math.min(v.duration - 0.02, srcTime(l.c, t - l.start)); if (Math.abs(v.currentTime - tt) > 0.45 / fps) await seek(v, tt);
        }
        for (var q = 0; q < (p.ov || []).length; q++) {
          var ov = p.ov[q]; if (ov.kind !== 'video' || t < ov.start || t >= ov.start + ovDur(ov)) continue;
          var ovv = o.M.vids[ov.id]; if (!ovv || !ovv.duration) continue;
          var ot = Math.min(ovv.duration - 0.02, srcTime(ov, t - ov.start)); if (Math.abs(ovv.currentTime - ot) > 0.45 / fps) await seek(ovv, ot);
        }
        drawFrame(ctx, W, H, p, o.M, t, null);
        var fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) }); venc.encode(fr, { keyFrame: f % (fps * 2) === 0 }); fr.close();
        while (venc.encodeQueueSize > 6) await new Promise(function (r) { setTimeout(r, 2); });
        if (f % 10 === 0) { var el = (performance.now() - t0) / 1000, left = f > 20 ? el / f * (nF - f) : null; o.onProgress(Math.round(f / nF * 100), 'Lager video … ' + Math.round(f / nF * 100) + ' %' + (left != null ? ' · ca. ' + fmtEta(left) + ' igjen' : '')); await new Promise(function (r) { setTimeout(r, 0); }); }
      }
      o.onProgress(100, 'Fullfører filen …');
      await venc.flush(); muxer.finalize();
    } finally { try { venc.close(); } catch (e) {} }
    var blob = new Blob([target.buffer], { type: 'video/mp4' }); if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen.');
    return { blob: blob, audio: acfg ? acodec : null };
  }
  function fmtEta(s) { s = Math.round(s); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s'; }

  /* ---------- subtitles ---------- */
  var TF = null;
  async function transcribe(p, getBlob, o) {
    var total = totalDur(p);
    o.onProgress('Henter lyd fra klippene …');
    var buf = await renderAudio(p, getBlob, 16000, total, { noMusic: true, mono: true, raw: true });
    if (!buf) throw new Error('Fant ingen lyd i videoklippene.');
    o.onProgress('Laster talemodellen …');
    var T = await (TF || (TF = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1').then(function (m) { m.env.allowLocalModels = false; return m; }).catch(function (e) { TF = null; throw e; })));
    var files = {}, cb = function (d) { if (d && d.status === 'progress' && d.file) { files[d.file] = d.progress || 0; var ks = Object.keys(files), pc = ks.reduce(function (a, k) { return a + files[k]; }, 0) / ks.length; o.onProgress('Laster talemodellen … ' + Math.round(pc) + ' %'); } };
    var gpu = !!navigator.gpu, mk = function (dev) { return T.pipeline('automatic-speech-recognition', o.model, { device: dev, dtype: dev === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8', progress_callback: cb }); }, pipe;
    try { pipe = await mk(gpu ? 'webgpu' : 'wasm'); } catch (e) { if (!gpu) throw e; pipe = await mk('wasm'); }
    o.onProgress('Lytter og skriver … dette kan ta litt tid');
    var r = await pipe(buf.getChannelData(0), { language: o.lang, task: 'transcribe', return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
    var out = [];
    (r && r.chunks || []).forEach(function (ch) {
      var s = ch.timestamp && ch.timestamp[0] != null ? ch.timestamp[0] : 0, e = ch.timestamp && ch.timestamp[1] != null ? ch.timestamp[1] : s + 3, tx = String(ch.text || '').trim();
      if (!tx || e <= s) return;
      var words = tx.split(/\s+/), parts = Math.max(1, Math.ceil(tx.length / 84)), per = Math.ceil(words.length / parts), d = (e - s) / parts;
      for (var i = 0; i < parts; i++) out.push({ id: uid('s'), start: s + d * i, end: s + d * (i + 1), text: words.slice(i * per, (i + 1) * per).join(' ') });
    });
    return out;
  }
  function srtTime(s) { var ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60, r = ms % 1000; var z = function (n, l) { return String(n).padStart(l, '0'); }; return z(h, 2) + ':' + z(m, 2) + ':' + z(sec, 2) + ',' + z(r, 3); }
  function toSrt(subs) { return subs.map(function (s, i) { return (i + 1) + '\n' + srtTime(s.start) + ' --> ' + srtTime(s.end) + '\n' + s.text + '\n'; }).join('\n'); }
  function fromSrt(txt) {
    var out = [], re = /(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/;
    String(txt).replace(/\r/g, '').split(/\n\s*\n/).forEach(function (b) {
      var ls = b.split('\n'), i = ls.findIndex(function (l) { return re.test(l); }); if (i < 0) return;
      var m = ls[i].match(re), ts = function (a) { return +m[a] * 3600 + +m[a + 1] * 60 + +m[a + 2] + +(m[a + 3] + '00').slice(0, 3) / 1000; };
      var t = ls.slice(i + 1).join('\n').replace(/<[^>]*>/g, '').trim(); if (t) out.push({ id: uid('s'), start: ts(1), end: ts(5), text: t.slice(0, 500) });
    });
    return out.slice(0, 5000);
  }

  window.VF = { LOOKS: LOOKS, OVANIMS: OVANIMS, BLENDS: BLENDS, overlay: overlay, ovDur: ovDur, srcTime: srcTime, wave: wave, FORMATS: FORMATS, FONTS: FONTS, TRANS: TRANS, ANIMS: ANIMS, TEMPLATES: TEMPLATES, fmtCount: fmtCount, SUBSTYLE: SUBSTYLE, uid: uid, clamp: clamp, clipDur: clipDur, layout: layout, totalDur: totalDur, text: text, colorClip: colorClip, mediaClip: mediaClip, music: music, create: create, normalize: normalize, drawFrame: drawFrame, store: store, pack: pack, unpack: unpack, exportSize: exportSize, mixOf: mixOf, voiced: voiced, duckAt: duckAt, audioStats: audioStats, fixLanes: fixLanes, curveEval: curveEval, beats: beats, toWav: toWav, exportMp4: exportMp4, transcribe: transcribe, toSrt: toSrt, fromSrt: fromSrt, fmtEta: fmtEta };
})();
