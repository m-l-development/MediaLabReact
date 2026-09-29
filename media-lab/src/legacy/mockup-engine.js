/* Mockups: skjermdeteksjon, perspektiv-warp, maske og lys. Ingen avhengigheter. */
(function () {
  if (window.MK) return;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ---------- geometri ---------- */
  function solve(A, b) {
    var n = b.length, i, j, k;
    for (i = 0; i < n; i++) {
      var mx = i; for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[mx][i])) mx = k;
      var t = A[i]; A[i] = A[mx]; A[mx] = t; var tb = b[i]; b[i] = b[mx]; b[mx] = tb;
      var p = A[i][i]; if (Math.abs(p) < 1e-12) return null;
      for (k = i + 1; k < n; k++) { var f = A[k][i] / p; for (j = i; j < n; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; }
    }
    var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x;
  }
  /* enhetskvadrat -> firkant q = [TL, TR, BR, BL] */
  function homo(q) {
    var src = [[0, 0], [1, 0], [1, 1], [0, 1]], A = [], b = [];
    for (var i = 0; i < 4; i++) { var u = src[i][0], v = src[i][1], x = q[i][0], y = q[i][1];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); }
    var h = solve(A, b); if (!h) return null; h.push(1); return h;
  }
  function hp(h, u, v) { var w = h[6] * u + h[7] * v + h[8]; return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w]; }
  function area(q) { var a = 0; for (var i = 0; i < q.length; i++) { var p = q[i], n = q[(i + 1) % q.length]; a += p[0] * n[1] - n[0] * p[1]; } return Math.abs(a) / 2; }
  function order(pts) {
    var cx = 0, cy = 0; pts.forEach(function (p) { cx += p[0] / pts.length; cy += p[1] / pts.length; });
    var s = pts.slice().sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx); });
    var k = 0, best = Infinity; s.forEach(function (p, i) { if (p[0] + p[1] < best) { best = p[0] + p[1]; k = i; } });
    return s.slice(k).concat(s.slice(0, k));
  }
  function inQuad(q, x, y) { var s = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } } return true; }
  function aspectOf(q) { var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }; return ((d(q[0], q[1]) + d(q[3], q[2])) / 2) / Math.max(1, (d(q[0], q[3]) + d(q[1], q[2])) / 2); }

  /* ---------- perspektiv-tegning ---------- */
  function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
    var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, e = function (p) { var dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; };
    var D0 = e(d0), D1 = e(d1), D2 = e(d2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(D0[0], D0[1]); ctx.lineTo(D1[0], D1[1]); ctx.lineTo(D2[0], D2[1]); ctx.closePath(); ctx.clip();
    var x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1], den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(den) < 1e-9) { ctx.restore(); return; }
    var a = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den, c = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den;
    var b = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den, d = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
    ctx.transform(a, b, c, d, d0[0] - a * x0 - c * y0, d0[1] - b * x0 - d * y0); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  function warp(ctx, img, q, N) {
    var h = homo(q); if (!h) return; var W = img.width, H = img.height; N = N || 16;
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
      var p00 = hp(h, u0, v0), p10 = hp(h, u1, v0), p11 = hp(h, u1, v1), p01 = hp(h, u0, v1);
      var s00 = [u0 * W, v0 * H], s10 = [u1 * W, v0 * H], s11 = [u1 * W, v1 * H], s01 = [u0 * W, v1 * H];
      tri(ctx, img, s00, s10, s11, p00, p10, p11); tri(ctx, img, s00, s11, s01, p00, p11, p01);
    }
  }

  /* ---------- pikselhjelp ---------- */
  function pixels(img, maxS) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.min(1, maxS / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    var c = mkCanvas(w, h), g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h); return { w: w, h: h, d: g.getImageData(0, 0, w, h).data };
  }
  function flood(P, sx, sy, tol, lab, id, lim, stepLim) {
    stepLim = stepLim || 200;
    var w = P.w, h = P.h, d = P.d, k0 = (sy * w + sx) * 4, r0 = d[k0], g0 = d[k0 + 1], b0 = d[k0 + 2], st = [sy * w + sx], out = [], t2 = tol * tol;
    lab[sy * w + sx] = id;
    while (st.length) {
      var p = st.pop(); out.push(p); var x = p % w, y = (p - x) / w, k = p * 4;
      var nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (var n = 0; n < 4; n++) { var q = nb[n]; if (q < 0 || lab[q]) continue; if (lim && !lim[q]) continue; var j = q * 4, dr = d[j] - r0, dg = d[j + 1] - g0, db = d[j + 2] - b0, er = d[j] - d[k], eg = d[j + 1] - d[k + 1], eb = d[j + 2] - d[k + 2];
        if (dr * dr + dg * dg + db * db < t2 && er * er + eg * eg + eb * eb < stepLim) { lab[q] = id; st.push(q); } }
    }
    return out;
  }
  function quadOf(list, w) {
    var a = [1e9, 0, 0], b = [-1e9, 0, 0], c = [1e9, 0, 0], e = [-1e9, 0, 0], mnx = [1e9, 0, 0], mxx = [-1e9, 0, 0], mny = [1e9, 0, 0], mxy = [-1e9, 0, 0];
    for (var i = 0; i < list.length; i++) { var p = list[i], x = p % w, y = (p - x) / w, s = x + y, t = x - y;
      if (s < a[0]) a = [s, x, y]; if (s > b[0]) b = [s, x, y]; if (t < c[0]) c = [t, x, y]; if (t > e[0]) e = [t, x, y];
      if (x < mnx[0]) mnx = [x, x, y]; if (x > mxx[0]) mxx = [x, x, y]; if (y < mny[0]) mny = [y, x, y]; if (y > mxy[0]) mxy = [y, x, y]; }
    var q1 = order([[a[1], a[2]], [e[1], e[2]], [b[1], b[2]], [c[1], c[2]]]), q2 = order([[mnx[1], mnx[2]], [mny[1], mny[2]], [mxx[1], mxx[2]], [mxy[1], mxy[2]]]);
    return area(q1) >= area(q2) ? q1 : q2;
  }

  /* ---------- finn skjermen automatisk ---------- */
  function detect(img) {
    var P = pixels(img, 360), w = P.w, h = P.h, lab = new Int32Array(w * h), id = 0, best = null, N = 14;
    for (var gy = 1; gy < N; gy++) for (var gx = 1; gx < N; gx++) {
      var sx = Math.round(gx / N * (w - 1)), sy = Math.round(gy / N * (h - 1)); if (lab[sy * w + sx]) continue;
      id++; var reg = flood(P, sx, sy, 34, lab, id), fr = reg.length / (w * h); if (fr < 0.02 || fr > 0.7) continue;
      var bord = 0; reg.forEach(function (p) { var x = p % w, y = (p - x) / w; if (x < 2 || y < 2 || x > w - 3 || y > h - 3) bord++; });
      var q = quadOf(reg, w), qa = area(q), rect = qa ? reg.length / qa : 0; if (rect < 0.6) continue;
      var k = (sy * w + sx) * 4, L = 0.3 * P.d[k] + 0.59 * P.d[k + 1] + 0.11 * P.d[k + 2];
      var score = reg.length * Math.pow(rect, 6) * (bord > (w + h) * 0.04 ? 0.15 : 1) * (L > 205 || L < 45 ? 1.6 : 1);
      if (!best || score > best.score) best = { score: score, q: q };
    }
    if (!best) return null;
    return best.q.map(function (p) { return [clamp(p[0] / (w - 1), 0, 1), clamp(p[1] / (h - 1), 0, 1)]; });
  }

  /* ---------- maske (skjermform, fingre foran skjermen) ---------- */
  var MC = new Map();
  function maskKey(id, q, W, H, o) { return id + '|' + W + 'x' + H + '|' + q.map(function (p) { return p[0].toFixed(4) + ',' + p[1].toFixed(4); }).join(';') + '|' + (o.occl ? 1 : 0) + (o.keepHoles ? 1 : 0); }
  function mask(id, base, qn, W, H, o) {
    var key = maskKey(id, qn, W, H, o); if (MC.has(key)) return MC.get(key);
    var out = mkCanvas(W, H), g = out.getContext('2d'), q = qn.map(function (p) { return [p[0] * W, p[1] * H]; }), used = false;
    if (o.occl) {
      var P = pixels(base, 720), w = P.w, h = P.h, qs = qn.map(function (p) { return [p[0] * (w - 1), p[1] * (h - 1)]; });
      var cx = (qs[0][0] + qs[1][0] + qs[2][0] + qs[3][0]) / 4, cy = (qs[0][1] + qs[1][1] + qs[2][1] + qs[3][1]) / 4, grow = 1.02;
      var qg = qs.map(function (p) { return [cx + (p[0] - cx) * grow, cy + (p[1] - cy) * grow]; }), lim = new Uint8Array(w * h), qa = 0, x, y;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (inQuad(qg, x, y)) { lim[y * w + x] = 1; if (inQuad(qs, x, y)) qa++; }
      var lab = new Int32Array(w * h), cnt = new Map(), hs = homo(qs), id2 = 0;
      for (var j = 1; j < 8; j++) for (var i = 1; i < 8; i++) { var s = hp(hs, 0.15 + i / 8 * 0.7, 0.15 + j / 8 * 0.7), sx = Math.round(s[0]), sy = Math.round(s[1]); if (sx < 0 || sy < 0 || sx >= w || sy >= h || lab[sy * w + sx]) continue; id2++; var k5 = (sy * w + sx) * 4, L5 = 0.3 * P.d[k5] + 0.59 * P.d[k5 + 1] + 0.11 * P.d[k5 + 2]; cnt.set(id2, flood(P, sx, sy, L5 < 70 ? 140 : 78, lab, id2, lim, L5 < 70 ? 900 : 420).length); }
      var bid = 0, bn = 0; cnt.forEach(function (n, k) { if (n > bn) { bn = n; bid = k; } });
      if (qa && bn / qa > 0.5) {
        var m = new Uint8Array(w * h); for (var p = 0; p < m.length; p++) if (lab[p] === bid) m[p] = 1;
        if (!o.keepHoles) {
          var reach = new Uint8Array(w * h), st = [];
          for (p = 0; p < m.length; p++) { if (!lim[p] || m[p]) continue; x = p % w; y = (p - x) / w; if (!inQuad(qg, x - 1, y) || !inQuad(qg, x + 1, y) || !inQuad(qg, x, y - 1) || !inQuad(qg, x, y + 1)) { reach[p] = 1; st.push(p); } }
          while (st.length) { var c = st.pop(); x = c % w; y = (c - x) / w; [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, y > 0 ? c - w : -1, y < h - 1 ? c + w : -1].forEach(function (nq) { if (nq >= 0 && lim[nq] && !m[nq] && !reach[nq]) { reach[nq] = 1; st.push(nq); } }); }
          for (p = 0; p < m.length; p++) if (lim[p] && !m[p] && !reach[p]) m[p] = 1;
        }
        var m2 = m; for (var it2 = 0; it2 < 3; it2++) { var m3 = new Uint8Array(m2); for (p = 0; p < m2.length; p++) if (!m2[p] && lim[p]) { x = p % w; y = (p - x) / w; if ((x > 0 && m2[p - 1]) || (x < w - 1 && m2[p + 1]) || (y > 0 && m2[p - w]) || (y < h - 1 && m2[p + w])) m3[p] = 1; } m2 = m3; }
        var sc = mkCanvas(w, h), sg = sc.getContext('2d'), id3 = sg.createImageData(w, h); for (p = 0; p < m2.length; p++) { id3.data[p * 4 + 3] = m2[p] ? 255 : 0; }
        sg.putImageData(id3, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sc, 0, 0, W, H); used = true;
      }
    }
    if (!used) { var qc = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]; q = q.map(function (p) { return [qc[0] + (p[0] - qc[0]) * 1.006, qc[1] + (p[1] - qc[1]) * 1.006]; }); g.fillStyle = '#000'; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (var t = 1; t < 4; t++) g.lineTo(q[t][0], q[t][1]); g.closePath(); g.fill(); }
    if (MC.size > 40) MC.delete(MC.keys().next().value); MC.set(key, out); return out;
  }

  /* ---------- skjermtekstur (designet tilpasset skjermen) ---------- */
  function texture(design, asp, tw, st) {
    var th = Math.max(2, Math.round(tw / asp)), c = mkCanvas(tw, th), g = c.getContext('2d');
    g.fillStyle = st.bg || '#ffffff'; g.fillRect(0, 0, tw, th);
    if (design) { var dw = design.naturalWidth || design.width, dh = design.naturalHeight || design.height;
      var s = (st.fit === 'contain' ? Math.min(tw / dw, th / dh) : Math.max(tw / dw, th / dh)) * (st.zoom || 1), w = dw * s, h = dh * s;
      g.imageSmoothingQuality = 'high'; g.drawImage(design, (tw - w) / 2 + (st.ox || 0) * tw, (th - h) / 2 + (st.oy || 0) * th, w, h); }
    return c;
  }

  /* ---------- hovedtegning ---------- */
  function render(ctx, W, H, base, design, mk, st, opt) {
    opt = opt || {}; var qn = st.corners || mk.corners; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.drawImage(base, 0, 0, W, H);
    if (!qn) { ctx.restore(); return; }
    var q = qn.map(function (p) { return [p[0] * W, p[1] * H]; }), asp = mk.aspect || aspectOf(q), qw = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]));
    if (!design && !opt.forceBg) { ctx.restore(); return; }
    var tex = texture(design, asp, Math.round(clamp(qw * 1.25, 64, 3000)), st), lay = mkCanvas(W, H), lg = lay.getContext('2d');
    var qc2 = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4], qw2 = q.map(function (p) { return [qc2[0] + (p[0] - qc2[0]) * 1.025, qc2[1] + (p[1] - qc2[1]) * 1.025]; });
    warp(lg, tex, qw2, opt.N || (W > 1200 ? 22 : 12));
    var mk2 = mask(mk.id, base, qn, W, H, { occl: st.occl !== false && mk.occl !== false, keepHoles: !!mk.keepHoles });
    lg.globalCompositeOperation = 'destination-in'; lg.drawImage(mk2, 0, 0); lg.globalCompositeOperation = 'source-over';
    var shade = st.shade == null ? 0.6 : st.shade, gloss = st.gloss == null ? 0.35 : st.gloss;
    if (shade > 0.01 || gloss > 0.01) {
      var xs = q.map(function (p) { return p[0]; }), ys = q.map(function (p) { return p[1]; }), x0 = Math.max(0, Math.floor(Math.min.apply(null, xs)) - 2), y0 = Math.max(0, Math.floor(Math.min.apply(null, ys)) - 2), x1 = Math.min(W, Math.ceil(Math.max.apply(null, xs)) + 2), y1 = Math.min(H, Math.ceil(Math.max.apply(null, ys)) + 2), bw = x1 - x0, bh = y1 - y0;
      if (bw > 2 && bh > 2) {
        var bc = mkCanvas(W, H), bg = bc.getContext('2d'), soft = mk.occl === false; if (soft) { var sm = mkCanvas(Math.max(2, W / 40), Math.max(2, H / 40)); sm.getContext('2d').drawImage(base, 0, 0, sm.width, sm.height); bg.imageSmoothingEnabled = true; bg.drawImage(sm, 0, 0, W, H); gloss = 0; shade *= 0.5; } else bg.drawImage(base, 0, 0, W, H);
        var B = bg.getImageData(x0, y0, bw, bh).data, Ly = lg.getImageData(x0, y0, bw, bh), D = Ly.data, sum = 0, n = 0, i;
        for (i = 0; i < D.length; i += 4) if (D[i + 3] > 200) { sum += 0.3 * B[i] + 0.59 * B[i + 1] + 0.11 * B[i + 2]; n++; }
        var mean = n ? sum / n : 128, bright = mean >= 90;
        for (i = 0; i < D.length; i += 4) { if (!D[i + 3]) continue; var L = 0.3 * B[i] + 0.59 * B[i + 1] + 0.11 * B[i + 2], f, add;
          if (bright) { f = clamp(1 + shade * (L / mean - 1) * 1.4, 0.35, 1.25); add = gloss * Math.max(0, L - mean) * 1.2; }
          else { f = 1 - shade * 0.08; add = gloss * Math.max(0, L - mean) * 2.2; }
          D[i] = clamp(D[i] * f + add, 0, 255); D[i + 1] = clamp(D[i + 1] * f + add, 0, 255); D[i + 2] = clamp(D[i + 2] * f + add, 0, 255); }
        lg.putImageData(Ly, x0, y0);
      }
    }
    ctx.drawImage(lay, 0, 0); ctx.restore();
  }

  /* ---------- bibliotek fra images/mockups ---------- */
  var CATS = [['phone', 'Mobil', /^(iphone|phone|mobil|android)/], ['laptop', 'Laptop', /^(macbook|laptop)/], ['screen', 'Skjerm og TV', /^(imac|tv|monitor|skjerm|screen)/], ['print', 'Trykk', /^(card|paper|poster|kort|papir|flyer|book)/]];
  function catOf(name) { for (var i = 0; i < CATS.length; i++) if (CATS[i][2].test(name)) return CATS[i][0]; return 'other'; }
  function nice(name) { return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  async function library(root) {
    root = root || 'images/mockups/'; var files = [], cfg = {};
    try { var r = await fetch(root + 'index.json', { cache: 'no-cache' }); if (r.ok) { var j = await r.json(); files = (j.files || j).filter(function (f) { return typeof f === 'string' && /\.(jpe?g|png|webp)$/i.test(f); }); } } catch (e) {}
    /* the built-in images are known, so the gallery still works if index.json is missing or stale on the server */
    if (!files.length && root === 'images/mockups/') files = ['card-black-hand', 'card-white-hand', 'imac-desk', 'imac-white', 'iphone-angled', 'iphone-desk', 'iphone-hand', 'macbook-air', 'macbook-pro', 'paper-marble', 'tv-livingroom', 'tv-wall'].map(function (n) { return root + n + '.jpg'; });
    try { var r2 = await fetch(root + 'config.json', { cache: 'no-cache' }); if (r2.ok) cfg = await r2.json(); } catch (e) {}
    return files.map(function (f) { var name = f.split('/').pop(), c = cfg[name] || {}, id = name.replace(/\.[a-z0-9]+$/i, '');
      var ok = Array.isArray(c.corners) && c.corners.length === 4 && c.corners.every(function (p) { return Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]); });
      return { id: id, src: f.charAt(0) === '/' ? f : '/' + (f.indexOf('/') >= 0 ? f : root + f), name: typeof c.name === 'string' ? c.name.slice(0, 60) : nice(name), cat: typeof c.cat === 'string' ? c.cat : catOf(name), corners: ok ? c.corners.map(function (p) { return [clamp(+p[0], 0, 1), clamp(+p[1], 0, 1)]; }) : null, aspect: isFinite(c.aspect) && c.aspect > 0.1 && c.aspect < 10 ? +c.aspect : null, keepHoles: !!c.keepHoles, occl: c.occl !== false };
    });
  }
  window.MK = { catOf: catOf, nice: nice, detect: detect, render: render, library: library, CATS: CATS.map(function (c) { return [c[0], c[1]]; }), aspectOf: aspectOf, homo: homo, hp: hp, order: order };
})();
