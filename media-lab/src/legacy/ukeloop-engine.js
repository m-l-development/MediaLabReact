function __ukeloopRendererFactory() {
  var FONT = 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif', STRETCH = 'semi-expanded', TS = 1, XS = 1, SG = 0;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function quart(p) { return 1 - Math.pow(1 - p, 4); }
  function soft(p) { return -(Math.cos(Math.PI * p) - 1) / 2; }
  function back(p) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function ramp(t, a, b, e) { return (e || soft)(clamp((t - a) / ((b - a) || 1), 0, 1)); }
  function lerp(p, a, b) { return a + (b - a) * p; }
  function up(s) { return String(s || '').toUpperCase(); }
  function setFont(ctx, size, w, em) {
    ctx.font = (w || 400) + ' ' + Math.max(1, Math.round(size)) + 'px ' + FONT;
    if ('fontStretch' in ctx) ctx.fontStretch = STRETCH;
    if ('letterSpacing' in ctx) ctx.letterSpacing = ((em || 0) * size).toFixed(2) + 'px';
  }
  function rgba(hex, a) {
    var h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16) || 0;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), cur = '';
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + ' ' + words[i] : words[i];
        if (!cur || ctx.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = words[i]; }
      }
      if (cur) out.push(cur);
    });
    return out;
  }
  function layoutWords(ctx, text, maxW, gap) {
    var lines = [[]], x = 0;
    String(text || '').split(/\r?\n/).forEach(function (para, pi) {
      if (pi > 0 && lines[lines.length - 1].length) { lines.push([]); x = 0; }
      para.split(/\s+/).filter(Boolean).forEach(function (w) {
        var ww = ctx.measureText(w).width;
        if (x > 0 && x + ww > maxW) { lines.push([]); x = 0; }
        lines[lines.length - 1].push({ w: w, x: x }); x += ww + gap;
      });
    });
    return lines;
  }
  function ready(el) {
    if (!el) return false;
    if (el.tagName === 'VIDEO') return el.readyState >= 2 && el.videoWidth > 0;
    return el.complete && el.naturalWidth > 0;
  }
  function cover(ctx, el, sw, sh, W, H, z, dx, dy) {
    var s = Math.max(W / sw, H / sh) * (z || 1), w = sw * s, h = sh * s;
    ctx.drawImage(el, (W - w) / 2 + (dx || 0), (H - h) / 2 + (dy || 0), w, h);
  }
  function band(ctx, W, H, wipe, ac, alpha, skew) {
    var bw = W * 0.55, bx = lerp(wipe, -1.4, 3.2) * bw;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(bx + bw / 2, H / 2); ctx.transform(1, 0, Math.tan((skew || -8) * Math.PI / 180), 1, 0, 0); ctx.translate(-bw / 2, -H / 2);
    var g = ctx.createLinearGradient(0, 0, bw, 0);
    g.addColorStop(0, rgba(ac, 0)); g.addColorStop(0.55, rgba(ac, 0.6)); g.addColorStop(1, rgba(ac, 0));
    ctx.fillStyle = g; ctx.fillRect(0, -H * 0.2, bw, H * 1.4); ctx.restore();
  }
  function locate(slides, t) {
    var total = 0, i;
    for (i = 0; i < slides.length; i++) total += slides[i].dur;
    if (!total) return null;
    var tt = ((t % total) + total) % total, acc = 0;
    for (i = 0; i < slides.length - 1; i++) { if (tt < acc + slides[i].dur) break; acc += slides[i].dur; }
    return { i: i, lt: tt - acc, total: total };
  }
  /* masked line reveal, like overflow:hidden + translateY(110% -> 0) */
  function reveal(ctx, E, x, top, h, p, fn) {
    if (p <= 0) return;
    var m = (E.tfx != null ? E.tfx : E.cfg.textFx) || 'reveal', A0 = E.A;
    ctx.save();
    if (m === 'none') fn();
    else if (m === 'fade') { E.A = A0 * p; fn(); }
    else if (m === 'slide') { E.A = A0 * p; ctx.translate(-(1 - p) * 70 * E.u, 0); fn(); }
    else if (m === 'blur') { E.A = A0 * p; if ('filter' in ctx) ctx.filter = 'blur(' + ((1 - p) * 14 * E.u).toFixed(1) + 'px)'; ctx.translate(0, (1 - p) * 12 * E.u); fn(); }
    else if (m === 'glitch') {
      var gq = 1 - clamp(p, 0, 1);
      if (gq > 0.02) {
        var hh = Math.sin(Math.floor(Date.now() / 45) * 12.9898 + x * 0.01 + top * 0.013) * 43758.5453; hh -= Math.floor(hh);
        ctx.save(); E.A = A0 * 0.4 * gq; ctx.translate(22 * E.u * gq, 0); fn(); ctx.restore();
        ctx.translate((hh - 0.5) * 70 * E.u * gq, 0); E.A = A0 * (hh > 0.3 * gq ? Math.min(1, p * 2.2) : 0.15);
      }
      fn();
    }
    else if (m === 'pop') { E.A = A0 * Math.min(1, p * 1.6); var sc = lerp(back(clamp(p, 0, 1)), 0.82, 1); ctx.translate(x, top + h / 2); ctx.scale(sc, sc); ctx.translate(-x, -(top + h / 2)); fn(); }
    else { ctx.beginPath(); ctx.rect(x - 40 * E.u, top - h * 0.25, E.W * 2, h * 1.25); ctx.clip(); ctx.translate(0, (1 - p) * 1.1 * h); fn(); }
    E.A = A0; ctx.restore();
  }
  var grainC = null;
  function fxGrain(ctx, W, H, u, amt) {
    if (typeof document === 'undefined') return;
    if (!grainC) {
      grainC = document.createElement('canvas'); grainC.width = grainC.height = 256;
      var g = grainC.getContext('2d'), id = g.createImageData(256, 256);
      for (var i = 0; i < id.data.length; i += 4) { var v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
    }
    ctx.save(); ctx.globalAlpha = 0.12 * amt; ctx.globalCompositeOperation = 'overlay';
    ctx.scale(u, u); ctx.translate(-Math.floor(Math.random() * 256), -Math.floor(Math.random() * 256));
    if (!ctx.__grainPat) ctx.__grainPat = ctx.createPattern(grainC, 'repeat'); ctx.fillStyle = ctx.__grainPat; ctx.fillRect(0, 0, W / u + 256, H / u + 256); ctx.restore();
  }
  function fxLeak(ctx, W, H, now, ac, amt) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amt;
    [[0.15 + 0.12 * Math.sin(now * 0.13), 0.2 + 0.1 * Math.cos(now * 0.17), ac, 0.4], [0.85 + 0.1 * Math.cos(now * 0.11), 0.75 + 0.12 * Math.sin(now * 0.09), '#ffd9a8', 0.26]].forEach(function (p) {
      var cx = p[0] * W, cy = p[1] * H, r = Math.max(W, H) * 0.45, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba(p[2], p[3])); g.addColorStop(1, rgba(p[2], 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    ctx.restore();
  }
  function fxBokeh(ctx, W, H, now, ac, u, amt) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amt;
    for (var i = 0; i < 22; i++) {
      var sx = (i * 0.6180339) % 1, sp = 0.015 + ((i * 0.37) % 1) * 0.03, r = (14 + ((i * 7.3) % 1) * 46) * u;
      var y = (1.1 - ((now * sp + (i * 0.29) % 1) % 1.2)) * H, x = (sx + 0.03 * Math.sin(now * 0.3 + i)) * W, col = i % 3 === 0 ? ac : '#ffffff';
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, 0.28)); g.addColorStop(0.6, rgba(col, 0.12)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function fxSnow(ctx, W, H, now, u, amt) {
    ctx.save();
    var N = Math.round(45 + 95 * amt);
    for (var i = 0; i < N; i++) {
      var s1 = (i * 0.6180339) % 1, s2 = (i * 0.7548776) % 1, s3 = (i * 0.5698403) % 1;
      var depth = 0.3 + 0.7 * s3, r = (1.6 + 4.8 * depth) * u, sp = 0.025 + 0.045 * depth;
      var y = (((now * sp + s2) % 1.1) - 0.05) * H, x = (s1 + 0.018 * Math.sin(now * (0.25 + 0.35 * s2) + i * 1.3)) * W;
      x = ((x % W) + W) % W;
      var a = (0.35 + 0.5 * amt) * depth, g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')'); g.addColorStop(0.45, 'rgba(255,255,255,' + (0.4 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function hsh(n) { var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function fxNewYear(ctx, W, H, T, P, now, ac, u, amt) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
    var cols = ['#ffd27a', '#fff3d6', ac, '#ff9fbf', '#9fd8ff', '#ffe08a'], rt = 0.75, lanes = 5;
    var hz = ctx.createLinearGradient(0, H, 0, H * 0.55);
    hz.addColorStop(0, rgba('#ffb45a', 0.16 * amt)); hz.addColorStop(1, rgba('#ffb45a', 0));
    ctx.fillStyle = hz; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    function pt(cx, cy, an, R, sp, g, tt) { var ex = 1 - Math.exp(-tt * 3.2); return [cx + Math.cos(an) * R * sp * ex, cy + Math.sin(an) * R * sp * ex + g * u * tt * tt]; }
    for (var ln = 0; ln < lanes; ln++) {
      var off = ln * P / lanes, k0 = Math.floor((T - off + rt) / P);
      for (var kk = k0; kk >= k0 - 1; kk--) {
        if (kk < 0) continue;
        var lt = T - off + rt - kk * P, id = kk * lanes + ln, ty = Math.floor(hsh(id + 2.2) * 5), life = ty === 1 ? 3.4 : 2.6;
        if (lt < 0 || lt > rt + life) continue;
        var cx = (0.3 + 0.65 * ((ln / lanes + 0.6 * hsh(id)) % 1)) * W, cy = (0.1 + 0.32 * hsh(id + 7.3)) * H;
        var col = cols[Math.floor(hsh(id + 5.7) * cols.length)], R = (170 + 120 * hsh(id + 3.1)) * u;
        if (lt < rt) {
          var rp = 1 - Math.pow(1 - lt / rt, 2), sx = cx + (hsh(id + 9.9) - 0.5) * 80 * u, rx = lerp(rp, sx, cx), ry = lerp(rp, H * 1.02, cy);
          var tg = ctx.createLinearGradient(rx, ry, rx, ry + 90 * u);
          tg.addColorStop(0, rgba('#fff3d6', 0.8 * amt)); tg.addColorStop(1, rgba('#ffd27a', 0));
          ctx.strokeStyle = tg; ctx.lineWidth = 2.4 * u; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(lerp(rp, sx, cx) + 0, ry + 90 * u); ctx.stroke();
          ctx.fillStyle = rgba('#ffffff', 0.9 * amt); ctx.beginPath(); ctx.arc(rx, ry, 2.4 * u, 0, Math.PI * 2); ctx.fill();
          for (var sk = 0; sk < 6; sk++) { var sxx = rx + (hsh(id + sk + Math.floor(lt * 20)) - 0.5) * 14 * u, syy = ry + (20 + 60 * hsh(id + sk * 3.3 + Math.floor(lt * 20))) * u; ctx.fillStyle = rgba('#ffd27a', 0.55 * amt * (1 - (syy - ry) / (90 * u))); ctx.fillRect(sxx, syy, 1.6 * u, 1.6 * u); }
          continue;
        }
        var bt = lt - rt, fade = Math.pow(1 - bt / life, ty === 1 ? 1.1 : 1.5) * amt, g = ty === 1 ? 150 : 55, back = ty === 1 ? 0.5 : 0.22;
        var M = ty === 2 ? 48 : ty === 4 ? 56 : 42, col2 = cols[Math.floor(hsh(id + 8.1) * cols.length)];
        if (bt < 0.45) { var fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.8); fl.addColorStop(0, rgba('#fff8e8', 0.4 * amt * (1 - bt / 0.45))); fl.addColorStop(1, rgba('#fff8e8', 0)); ctx.fillStyle = fl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
        for (var i = 0; i < M; i++) {
          var inner = ty === 4 && i % 2 === 1, an = (i / M) * Math.PI * 2 + (hsh(id + i) - 0.5) * (ty === 2 ? 0.05 : 0.3);
          var sp = ty === 2 ? 1 : (inner ? 0.5 : 0.62 + 0.38 * hsh(id * 3 + i)), pl = life * (0.7 + 0.3 * hsh(id * 5 + i)), pf = bt >= pl ? 0 : Math.pow(1 - bt / pl, 1.4) * amt;
          if (pf <= 0.01) continue;
          var pc = ty === 1 ? '#ffc861' : inner ? col2 : col, pw = (ty === 1 ? 1.6 : 2.3) * u;
          var pts = [], SEG = 4;
          for (var s = 0; s <= SEG; s++) pts.push(pt(cx, cy, an, R, sp, g, Math.max(0, bt - back * s / SEG)));
          for (s = 0; s < SEG; s++) {
            var sa = pf * 0.75 * (1 - s / SEG);
            ctx.strokeStyle = rgba(s === 0 ? '#fff4dc' : pc, sa); ctx.lineWidth = pw * (1 - s / (SEG + 1));
            ctx.beginPath(); ctx.moveTo(pts[s + 1][0], pts[s + 1][1]); ctx.lineTo(pts[s][0], pts[s][1]); ctx.stroke();
          }
          var tw = ty === 3 && bt > pl * 0.4 ? 0.35 + 0.65 * Math.abs(Math.sin(bt * 11 + i * 1.7)) : 1, hx = pts[0][0], hy = pts[0][1];
          ctx.fillStyle = rgba(pc, 0.28 * pf * tw); ctx.beginPath(); ctx.arc(hx, hy, 5 * u, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = rgba('#ffffff', 0.9 * pf * tw); ctx.beginPath(); ctx.arc(hx, hy, 1.9 * u, 0, Math.PI * 2); ctx.fill();
          if (ty === 3 && bt > pl * 0.45) for (var c = 0; c < 2; c++) { var cxx = hx + (hsh(id + i * 7 + c + Math.floor(bt * 14)) - 0.5) * 22 * u, cyy = hy + (hsh(id + i * 11 + c + Math.floor(bt * 14)) - 0.5) * 22 * u; ctx.fillStyle = rgba('#fff4dc', 0.6 * pf); ctx.fillRect(cxx, cyy, 1.6 * u, 1.6 * u); }
        }
        var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
        gl.addColorStop(0, rgba(col, 0.14 * fade)); gl.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gl; ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (var j = 0; j < 70; j++) {
      var s1 = hsh(j + 91), s2 = hsh(j + 17), s3 = hsh(j + 55);
      var cy2 = (((now * (0.03 + 0.035 * s2) + s1) % 1.15) - 0.08) * H, cx2 = (hsh(j + 41) + 0.03 * Math.sin(now * (0.5 + 0.4 * s3) + j)) * W;
      var rot = now * (1 + 2 * s3) + j, fw = (5 + 5 * s2) * u, fh = (2.6 + 2 * s1) * u, flip = Math.cos(now * (2 + 2 * s1) + j);
      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(rot); ctx.scale(1, 0.25 + 0.75 * Math.abs(flip));
      ctx.fillStyle = rgba(j % 3 === 0 ? '#fff3d6' : j % 3 === 1 ? '#f2c14e' : '#d9a441', (0.55 + 0.3 * Math.abs(flip)) * amt);
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh); ctx.restore();
    }
    ctx.restore();
  }
  function fxLines(ctx, W, H, now, u, amt) {
    ctx.save(); ctx.globalAlpha = 0.08 * amt; ctx.fillStyle = '#000';
    for (var y = (now * 30 * u) % (4 * u); y < H; y += 4 * u) ctx.fillRect(0, y, W, 1.5 * u);
    ctx.restore();
  }
  var KEYMAP = { time: 'day', place: 'day', pill: 'kicker', phone: 'email' };
  function OFF(E, f) { var k = KEYMAP[f] || f, o = E.toff && k ? E.toff[k] : null; return o ? { x: (o.x || 0) * E.W, y: (o.y || 0) * E.H } : { x: 0, y: 0 }; }
  function MV(ctx, E, k, fn) { var o = OFF(E, k); if (!o.x && !o.y) { fn(); return; } ctx.save(); ctx.translate(o.x, o.y); fn(); ctx.restore(); }
  function FS(E, f) { var v = E.tsc && f ? E.tsc[f] : null; return v > 0 ? v : 1; }
  function TC(E, f, d) { return E.tcol && f && E.tcol[f] ? E.tcol[f] : d; }
  function recT(E, field, x, y, w, h) { if (E.rec && E.rects && E.rects.texts && w > 0) { var o = OFF(E, field); E.rects.texts.push({ id: E.rec, field: field, x: x + o.x, y: y + o.y, w: w, h: h }); } }
  function kicker(ctx, E, x, top, p, label, pill, extra, fl) {
    fl = fl || [];
    var u = E.u, ac = E.cfg.accent, h = E.kh || 48 * u * XS, cy = top + h / 2, k0 = FS(E, fl[0]), k1 = FS(E, fl[1]), k2 = FS(E, fl[2]);
    if (p <= 0) return h;
    reveal(ctx, E, x, top, h, p, function () {
      ctx.textBaseline = 'middle';
      var kl = E.cfg.kickerLine !== false, kb = E.cfg.kickerLine === 'both', km = kb || E.cfg.kickerLine === 'mid';
      if (kl) { ctx.globalAlpha = E.A * 0.85; ctx.fillStyle = ac; ctx.fillRect(x, cy - 1 * u, 48 * u * XS * p, 2 * u); }
      ctx.globalAlpha = E.A;
      var cx = kl ? x + 48 * u * XS + 18 * u : x;
      var bx = (E.kst !== undefined ? E.kst : E.cfg.kickerStyle) === 'box', kd = E.kdate; E.kdate = null;
      if (label && bx && kd) label = label + ' ' + kd;
      if (label && bx) { setFont(ctx, 24 * u * XS * k0, 700, 0.22); var lb = ctx.measureText(up(label)).width, bp = 14 * u * XS * k0, bh = 44 * u * XS * k0;
        ctx.fillStyle = TC(E, fl[0], ac); ctx.fillRect(cx, cy - bh / 2, (lb + bp * 2) * clamp(p * 1.4, 0, 1), bh); ctx.fillStyle = '#0b0b0b'; ctx.fillText(up(label), cx + bp, cy + 1 * u);
        recT(E, fl[0], cx, top, lb + bp * 2, h); cx += lb + bp * 2 + 18 * u; }
      else if (label) { setFont(ctx, 24 * u * XS * k0, 600, 0.3); ctx.fillStyle = TC(E, fl[0], ac); ctx.fillText(up(label), cx, cy); var lw0 = ctx.measureText(up(label)).width;
        if (kd) { var sp0 = ctx.measureText(' ').width, dcol = E.tcol && E.tcol.date ? E.tcol.date : TC(E, fl[0], ac); ctx.fillStyle = dcol; ctx.fillText(up(kd), cx + lw0 + sp0, cy); lw0 += sp0 + ctx.measureText(up(kd)).width; }
        recT(E, fl[0], cx, top, lw0, h); cx += lw0 + 18 * u;
        if (km && (pill || extra)) { ctx.globalAlpha = E.A * 0.85; ctx.fillStyle = ac; ctx.fillRect(cx, cy - 1 * u, 48 * u * XS * p, 2 * u); ctx.globalAlpha = E.A; cx += 48 * u * XS + 8 * u; }
      }
      if (pill) {
        cx += 10 * u; setFont(ctx, 30 * u * XS * k1, 700, 0.02);
        var tw = ctx.measureText(up(pill)).width, pw = tw + 40 * u * XS * k1, ph = 46 * u * XS * k1, sc = lerp(back(clamp(p, 0, 1)), 0.86, 1);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.fillStyle = TC(E, fl[1], bx ? '#ffffff' : ac); rr(ctx, 0, -ph / 2, pw, ph, bx ? 0 : ph / 2); ctx.fill();
        ctx.fillStyle = bx ? '#0c1322' : '#171206'; ctx.fillText(up(pill), 20 * u * XS * k1, 2 * u); ctx.restore();
        recT(E, fl[1], cx, top, pw, h); cx += pw * sc + 18 * u;
      }
      if (extra) { setFont(ctx, 24 * u * XS * k2, 600, 0.3); ctx.fillStyle = TC(E, fl[2], 'rgba(255,255,255,0.88)'); ctx.fillText(up(extra), cx + 10 * u, cy); var ew0 = ctx.measureText(up(extra)).width; recT(E, fl[2], cx + 10 * u, top, ew0, h); cx += 10 * u + ew0 + 18 * u; }
      if (kb && (label || pill || extra)) { ctx.globalAlpha = E.A * 0.85; ctx.fillStyle = ac; ctx.fillRect(cx + (extra ? 0 : 10 * u), cy - 1 * u, 48 * u * XS * p, 2 * u); ctx.globalAlpha = E.A; }
      ctx.textBaseline = 'alphabetic';
    });
    return h;
  }
  function drawDay(ctx, s, lt, E) {
    var u = E.u, x = E.M, maxW = E.COL, size = 144 * u * TS * FS(E, 'title'), lines, KH = 48 * u * XS * Math.max(FS(E, 'day'), FS(E, 'time'), FS(E, 'place')); E.kh = KH;
    setFont(ctx, size, 700, -0.03); lines = layoutWords(ctx, up(s.title), maxW, size * 0.26);
    var wide = function () { return lines.some(function (ln) { var l = ln[ln.length - 1]; return l && l.x + ctx.measureText(l.w).width > maxW; }); };
    while ((lines.length > (E.PT ? 4 : 2) || wide()) && size > 60 * u * TS) { size -= 8 * u; setFont(ctx, size, 700, -0.03); lines = layoutWords(ctx, up(s.title), maxW, size * 0.26); }
    var lh = size * 0.92, pad = size * 0.13, blockH = lines.length * (lh + pad);
    var bottom = E.BOT, top = bottom - blockH - 20 * u - KH;
    MV(ctx, E, 'day', function () { if (s.day && s.date) E.kdate = s.date; kicker(ctx, E, x, top, ramp(lt, -0.25, 1.0, quart), s.day || s.date || '', s.time, s.place, [s.day ? 'day' : 'date', 'time', 'place']); E.kdate = null; });
    var gi = 0, ty = top + KH + 20 * u, mw = 0;
    setFont(ctx, size, 700, -0.03);
    lines.forEach(function (ln) { var lw = ln[ln.length - 1]; if (lw) mw = Math.max(mw, lw.x + ctx.measureText(lw.w).width); });
    recT(E, 'title', x, ty, mw, blockH);
    MV(ctx, E, 'title', function () { lines.forEach(function (ln, li) {
      var ly = ty + li * (lh + pad);
      ln.forEach(function (w) {
        var p = ramp(lt, -0.1 + gi * (SG || 0.13), 1.05 + gi * (SG || 0.13), quart); gi++;
        reveal(ctx, E, x + w.x, ly, lh, p, function () {
          setFont(ctx, size, 700, -0.03); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'title', '#fff'); ctx.fillText(w.w, x + w.x, ly + size * 0.8);
        });
      });
    }); });
  }
  function drawText(ctx, s, lt, E) {
    var u = E.u, x = E.M, maxW = Math.min(1280 * u, E.COL);
    var KH = 48 * u * XS * Math.max(FS(E, 'kicker'), FS(E, 'pill')); E.kh = KH;
    var bs = 48 * u * XS * FS(E, 'body'); setFont(ctx, bs, 600, -0.015); var bl = wrap(ctx, s.body, maxW), bmw = 0; bl.forEach(function (l) { bmw = Math.max(bmw, ctx.measureText(l).width); });
    var blh = bs * 1.14, ss = 29 * u * XS * FS(E, 'sub'), hasSub = !!s.sub;
    var total = KH + 22 * u + bl.length * blh + (hasSub ? 22 * u + ss * 1.3 : 0);
    var top = E.BOT - total;
    MV(ctx, E, 'kicker', function () { kicker(ctx, E, x, top, ramp(lt, -0.25, 1.0, quart), s.kicker, s.pill, null, ['kicker', 'pill']); });
    var y = top + KH + 22 * u;
    recT(E, 'body', x, y, bmw, bl.length * blh);
    MV(ctx, E, 'body', function () { bl.forEach(function (l, i) {
      reveal(ctx, E, x, y + i * blh, blh, ramp(lt, -0.1 + i * (SG || 0.06), 1.15 + i * (SG || 0.06), quart), function () {
        setFont(ctx, bs, 600, -0.015); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'body', '#fff'); ctx.fillText(l, x, y + i * blh + bs * 0.9);
      });
    }); });
    y += bl.length * blh + 22 * u;
    if (hasSub) { setFont(ctx, ss, 500, 0); recT(E, 'sub', x, y, ctx.measureText(s.sub).width, ss * 1.3); }
    if (hasSub) MV(ctx, E, 'sub', function () { reveal(ctx, E, x, y, ss * 1.3, ramp(lt, 0.15, 1.4, quart), function () {
      setFont(ctx, ss, 500, 0); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'sub', 'rgba(255,255,255,0.88)'); ctx.fillText(s.sub, x, y + ss * 1.0);
    }); });
  }
  function hit(a, b, pad) { return a && b && a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y; }
  function qrPlace(E, s, qs, top) {
    var u = E.u, rx = E.W - E.M, by = E.BOT, L = !s.noLogo ? E.logoRect : null, pad = 30 * u;
    var q = { x: rx - qs, y: by - qs, w: qs, h: qs };
    if (E.PT && top != null) q = { x: E.M, y: Math.max(E.M + 80 * u, top - 60 * u - qs), w: qs, h: qs };
    if (s.qrX != null && s.qrY != null) {
      q.x = Math.max(0, Math.min(E.W - qs, s.qrX * E.W - qs / 2));
      q.y = Math.max(0, Math.min(E.H - qs, s.qrY * E.H - qs / 2));
    }
    if (!hit(q, L, pad)) return q;
    var above = { x: q.x, y: L.y - pad - qs, w: qs, h: qs };
    if (above.y >= E.M + 60 * u && !hit(above, L, pad)) return above;
    var left = { x: L.x - pad - qs, y: q.y, w: qs, h: qs };
    if (left.x >= E.W * 0.45 && !hit(left, L, pad)) return left;
    var down = { x: q.x, y: L.y + L.h + pad, w: qs, h: qs };
    if (down.y + qs <= E.H - 40 * u && !hit(down, L, pad)) return down;
    return { x: Math.max(E.W * 0.45, L.x - pad - qs), y: Math.max(E.M + 60 * u, Math.min(q.y, L.y - pad - qs)), w: qs, h: qs };
  }
  function drawContact(ctx, s, lt, E) {
    var u = E.u, x = E.M, hasQr = s.qr && s.qr.length, qs = (s.qrSize || 330) * u, qp0 = hasQr && !E.PT ? qrPlace(E, s, qs) : null;
    var qrBlocks = hasQr && !E.PT && qp0.y + qs > E.H * 0.4 && qp0.x > x + 400 * u;
    var maxW = qrBlocks ? Math.min(1190 * u, qp0.x - 80 * u - x) : Math.min(1500 * u, E.COL);
    var KH = 48 * u * XS * Math.max(FS(E, 'kicker'), FS(E, 'pill')); E.kh = KH;
    var hs = 75 * u * TS * FS(E, 'headline'); setFont(ctx, hs, 700, -0.035); var hl = wrap(ctx, up(s.headline), maxW);
    while (hl.length > (E.PT ? 5 : 3) && hs > 50 * u * TS) { hs -= 5 * u; setFont(ctx, hs, 700, -0.035); hl = wrap(ctx, up(s.headline), maxW); }
    var hlh = hs * 1.0 + 13 * u, ts = 31 * u * XS * FS(E, 'text'), cbase = 31 * u * XS, ctlh = cbase * 1.35 * Math.max(FS(E, 'email'), FS(E, 'phone')); setFont(ctx, ts, 500, 0);
    var tl = s.text ? wrap(ctx, s.text, maxW) : [], tlh = ts * 1.35;
    var contact = [s.email, s.phone].filter(Boolean);
    var total = KH + 22 * u + hl.length * hlh + (tl.length ? 22 * u + tl.length * tlh : 0) + (contact.length ? (tl.length ? 6 * u : 22 * u) + ctlh : 0);
    var top = E.BOT - total;
    if (hasQr && E.PT) qp0 = qrPlace(E, s, qs, top);
    if (hasQr && lt >= 0 && E.A > 0.5 && E.rects) E.rects.qr = { x: qp0.x, y: qp0.y, w: qs, h: qs, id: s.id };
    MV(ctx, E, 'kicker', function () { kicker(ctx, E, x, top, ramp(lt, -0.25, 1.0, quart), s.kicker, s.pill, null, ['kicker', 'pill']); });
    var y = top + KH + 22 * u;
    setFont(ctx, hs, 700, -0.035); var hmw = 0; hl.forEach(function (l) { hmw = Math.max(hmw, ctx.measureText(l).width); });
    recT(E, 'headline', x, y, hmw, hl.length * hlh);
    MV(ctx, E, 'headline', function () { hl.forEach(function (l, i) {
      reveal(ctx, E, x, y + i * hlh, hlh, ramp(lt, -0.1 + i * (SG || 0.08), 1.15 + i * (SG || 0.08), quart), function () {
        setFont(ctx, hs, 700, -0.035); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'headline', '#fff'); ctx.fillText(l, x, y + i * hlh + hs * 0.82);
      });
    }); });
    y += hl.length * hlh;
    if (tl.length) {
      y += 22 * u;
      setFont(ctx, ts, 500, 0); var tmw = 0; tl.forEach(function (l) { tmw = Math.max(tmw, ctx.measureText(l).width); });
      recT(E, 'text', x, y, tmw, tl.length * tlh);
      MV(ctx, E, 'text', function () { tl.forEach(function (l, i) {
        reveal(ctx, E, x, y + i * tlh, tlh, ramp(lt, 0.15 + i * (SG || 0.05), 1.4 + i * (SG || 0.05), quart), function () {
          setFont(ctx, ts, 500, 0); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'text', 'rgba(255,255,255,0.88)'); ctx.fillText(l, x, y + i * tlh + ts * 1.0);
        });
      }); });
      y += tl.length * tlh;
    }
    if (contact.length) {
      y += tl.length ? 6 * u : 22 * u;
      var cyy = y;
      MV(ctx, E, 'email', function () { reveal(ctx, E, x, cyy, ctlh, ramp(lt, 0.25, 1.5, quart), function () {
        var cx = x; ctx.globalAlpha = E.A;
        if (s.email) { var es = cbase * FS(E, 'email'); setFont(ctx, es, 700, 0); ctx.fillStyle = TC(E, 'email', E.cfg.accent); ctx.fillText(s.email, cx, cyy + es); var ew = ctx.measureText(s.email).width; recT(E, 'email', cx, cyy, ew, es * 1.35); cx += ew + 40 * u; }
        if (s.phone) { var ps = cbase * FS(E, 'phone'); setFont(ctx, ps, 500, 0); ctx.fillStyle = TC(E, 'phone', 'rgba(255,255,255,0.88)'); ctx.fillText(s.phone, cx, cyy + ps); recT(E, 'phone', cx, cyy, ctx.measureText(s.phone).width, ps * 1.35); }
      }); });
    }
    if (hasQr) {
      var qp = ramp(lt, -0.25, 1.0, quart);
      if (qp > 0) {
        var sc = lerp(back(clamp(ramp(lt, -0.25, 1.0, function (p) { return p; }), 0, 1)), 0.9, 1);
        var rx = qp0.x + qs, by = qp0.y + qs;
        ctx.save(); ctx.globalAlpha = E.A * qp; ctx.translate(rx, by); ctx.scale(sc, sc); ctx.translate(-qs, -qs);
        ctx.fillStyle = '#fff'; rr(ctx, 0, 0, qs, qs, 14 * u); ctx.fill();
        var n = s.qr.length, pad = 26 * u, cell = (qs - pad * 2) / n;
        ctx.fillStyle = '#0b0b0b';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (s.qr[r].charCodeAt(c) === 49) ctx.fillRect(pad + c * cell, pad + r * cell, cell + 0.6, cell + 0.6);
        ctx.restore();
      }
    }
  }
  function drawOutro(ctx, s, lt, E) {
    var u = E.u, x = E.M, size = 150 * u * TS * FS(E, 'title'); setFont(ctx, size, 700, -0.025);
    var lines = wrap(ctx, up(s.title), E.COL);
    var owide = function () { return lines.some(function (l) { return ctx.measureText(l).width > E.COL; }); };
    while ((lines.length > (E.PT ? 4 : 2) || owide()) && size > 60 * u * TS) { size -= 8 * u; setFont(ctx, size, 700, -0.025); lines = wrap(ctx, up(s.title), E.COL); }
    var lh = size * 0.94, top = E.PT ? E.H * 0.36 : 410 * u;
    var omw = 0; lines.forEach(function (l) { omw = Math.max(omw, ctx.measureText(l).width); });
    recT(E, 'title', x, top, omw, lines.length * lh);
    MV(ctx, E, 'title', function () { lines.forEach(function (l, i) {
      reveal(ctx, E, x, top + i * lh, lh, ramp(lt, -0.1 + i * (SG || 0.1), 1.2 + i * (SG || 0.1), quart), function () {
        setFont(ctx, size, 700, -0.025); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'title', '#fff'); ctx.fillText(l, x, top + i * lh + size * 0.8);
      });
    }); });
    if (s.sub) {
      var sy = top + lines.length * lh + 50 * u;
      var ks = FS(E, 'sub'); setFont(ctx, 30 * u * XS * ks, 600, 0.26);
      recT(E, 'sub', x, sy, ctx.measureText(up(s.sub)).width + 3 * u, 40 * u * XS * ks);
      MV(ctx, E, 'sub', function () { reveal(ctx, E, x, sy, 40 * u * XS * ks, ramp(lt, 0.3, 1.5, quart), function () {
        setFont(ctx, 30 * u * XS * ks, 600, 0.26); ctx.globalAlpha = E.A; ctx.fillStyle = TC(E, 'sub', E.cfg.accent); ctx.fillText(up(s.sub), x + 3 * u, sy + 30 * u * XS * ks);
      }); });
    }
  }
  function cssGradientAt(ctx, W, H, deg, stops, k, col) {
    var a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * dx) + Math.abs(H * dy);
    var g = ctx.createLinearGradient(W / 2 - dx * len / 2, H / 2 - dy * len / 2, W / 2 + dx * len / 2, H / 2 + dy * len / 2);
    var last = -1;
    stops.forEach(function (s) { var pos = clamp(Math.max(s[0], last + 0.001), 0, 1); last = pos; g.addColorStop(pos, col ? rgba(col, clamp(s[1] * k, 0, 1)) : 'rgba(8,8,8,' + clamp(s[1] * k, 0, 1) + ')'); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  var PROMO = ['#1f6f86', '#b4553a', '#1e3566', '#2a8f8a'];
  function promoPanels(ctx, W, H, u, pal, idx, lt, a, pc, rot, bgc) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = bgc || '#070b14'; ctx.fillRect(0, 0, W, H);
    var B = [[0.55, 0.07, 0.3, 0.47, 1], [0.71, 0.5, 0.25, 0.43, 1], [0.03, 0.03, 0.14, 0.22, 0.9], [0.87, 0.1, 0.1, 0.32, 1], [0.3, 0.02, 0.2, 0.2, 0.6]];
    B.forEach(function (b, k) {
      var dx = Math.sin(lt * 0.35 + k * 1.7) * 14 * u, dy = Math.cos(lt * 0.3 + k) * 10 * u;
      var P = pc && pc.length ? pc[((rot ? idx : 0) + k) % pc.length] : null;
      var al = P && P.alpha != null ? P.alpha : b[4]; if (al <= 0.001) return;
      ctx.globalAlpha = a * al; ctx.fillStyle = P && P.color ? P.color : pal[(idx + k) % pal.length]; ctx.fillRect(b[0] * W + dx, b[1] * H + dy, b[2] * W, b[3] * H);
    });
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2 * u; ctx.strokeRect(0.6 * W, 0.18 * H, 0.3 * W, 0.56 * H);
    ctx.restore();
  }
  function presence(lt, dur) { return Math.min(ramp(lt, -0.6, 0.3), 1 - ramp(lt, dur - 0.6, dur + 0.3)); }
  function drawFrame(ctx, W, H, data, media, t) {
    var u = Math.min(W, H) / 1080, PT = H > W, cfg = data.cfg || {}, slides = data.slides || [];
    var SC = function (s, k) { return s && s.ov && s.ov[k] != null ? s.ov[k] : cfg[k]; };
    var fam = cfg.font || 'Archivo';
    FONT = (fam === 'Helvetica' ? '' : '"' + fam + '", ') + '"Helvetica Neue", Helvetica, Arial, sans-serif';
    STRETCH = fam === 'Archivo' ? 'semi-expanded' : 'normal';
    TS = cfg.titleScale || 1; XS = cfg.textScale || 1;
    var BP = cfg.beat > 0.2 ? cfg.beat : 0, bNud = cfg.beatNudge || 0, bEnv = 0, bText = BP && cfg.beatText !== false;
    var bSet = cfg.beatFx || ['glow'], bAmt = cfg.beatPulse == null ? 0.6 : cfg.beatPulse, bEv = cfg.beatEvery || 1;
    var bIdx = 0, bD = 0, bBar = 0, bSB = 9, bES = 9, bH1 = 0.5, bH2 = 0.5;
    function has(k) { return !!BP && bSet.indexOf(k) >= 0; }
    var pol = BP && cfg.beatPolish !== false ? (cfg.beatLevel || 1) : 0;
    var calm = cfg.beatStyle === 'calm', lift = 0;
    SG = 0; var TK = 1;
    var E = { W: W, H: H, u: u, PT: PT, BOT: PT ? H - 330 * u : H - 150 * u, M: 95 * u, COL: W - 190 * u, cfg: cfg, media: media || { images: {} }, A: 1 };
    var rects = { texts: [] };
    E.rects = rects;
    (function () {
      var ls = cfg.logoSrc, im = ls && E.media.images ? E.media.images[ls] : null;
      E.logoImg = null; E.logoRect = null;
      if (cfg.logoOn === false || !ready(im)) return;
      var lh = (cfg.logoSize || 90) * u, lw = lh * im.naturalWidth / im.naturalHeight;
      E.logoImg = im;
      var lx = cfg.logoX == null ? (PT ? W - E.M - lw / 2 : 0.93 * W) : cfg.logoX * W, ly = cfg.logoY == null ? (PT ? H - 150 * u - lh / 2 : 0.85 * H) : cfg.logoY * H;
      E.logoRect = { x: lx - lw / 2, y: ly - lh / 2, w: lw, h: lh };
    })();
    var PK = ctx.canvas && ctx.canvas.width && Math.abs(ctx.canvas.width - W) > 1 ? ctx.canvas.width / W : 1;
    ctx.setTransform(PK, 0, 0, PK, 0, 0); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H);
    var v = E.media.video;
    if (ready(v)) cover(ctx, v, v.videoWidth, v.videoHeight, W, H, 1, 0);
    var loc = slides.length ? locate(slides, t) : null, trio = [];
    if (loc) {
      var n = slides.length, cur = slides[loc.i];
      if (n === 1) trio.push({ s: cur, lt: Math.min(loc.lt + 2, cur.dur - 1) });
      else {
        var prev = slides[(loc.i - 1 + n) % n], next = slides[(loc.i + 1) % n];
        trio.push({ s: prev, lt: loc.lt + prev.dur }, { s: cur, lt: loc.lt }, { s: next, lt: loc.lt - cur.dur });
      }
    }
    if (BP && loc) {
      var bq = (loc.lt - bNud) / BP, ek = Math.floor(bq / bEv);
      bES = (bq - ek * bEv) * BP;
      bIdx = Math.max(0, ek);
      bEnv = (bES < 0.06 ? bES / 0.06 : Math.exp(-(bES - 0.06) * 2.5)) * bAmt;
      bBar = Math.max(0, Math.floor(bq / 4)); bSB = (bq - Math.floor(bq / 4) * 4) * BP; bD = Math.exp(-bSB * 9) * bAmt;
      bH1 = (Math.sin(ek * 12.9898) * 43758.5453) % 1; bH1 = bH1 < 0 ? bH1 + 1 : bH1;
      bH2 = (Math.sin(ek * 78.233) * 43758.5453) % 1; bH2 = bH2 < 0 ? bH2 + 1 : bH2;
    }
    var nrg = 0.5;
    if (BP && loc && cfg.energy && cfg.energy.length) {
      var st0 = 0; for (var si = 0; si < loc.i; si++) st0 += slides[si].dur;
      var ei = ((cfg.energyOff || 0) + st0 + loc.lt) * (cfg.energyRate || 2), e0 = Math.floor(ei), ef = ei - e0, EN = cfg.energy;
      nrg = e0 >= EN.length - 1 ? EN[EN.length - 1] : e0 < 0 ? EN[0] : lerp(ef, EN[e0], EN[e0 + 1]);
    }
    if (calm && cfg.energyAdaptive !== false) lift = clamp((nrg - 0.55) / 0.3, 0, 1);
    if (BP) {
      SG = bText ? (calm ? lerp(lift, BP, BP / 2) : BP / 2) : 0;
      TK = calm ? lerp(lift, clamp(BP * 4 / 1.3, 1.3, 2.2), clamp(BP * 2 / 1.3, 1, 1.6)) : clamp(BP * 2 / 1.3, 1, 1.6);
    }
    /* pictures */
    trio.forEach(function (o) {
      var s = o.s, lt = o.lt, img = s.vid && E.media.vids ? E.media.vids[s.vid] : null;
      if (!ready(img)) img = s.bg && E.media.images ? E.media.images[s.bg] : null;
      var isV = !!(img && img.tagName === 'VIDEO'), iw = img ? (isV ? img.videoWidth : img.naturalWidth) : 0, ih = img ? (isV ? img.videoHeight : img.naturalHeight) : 0;
      var tf = SC(s, 'transFx') || 'fade', one = trio.length === 1, pin, pout, pal = cfg.palette || PROMO, sIdx = Math.max(0, slides.indexOf(s));
      if (!ready(img) && s.bgFill && s.bgFill.mode && s.bgFill.mode !== 'none') {
        /* own colour or gradient behind the slide */
        var bf = s.bgFill, fa = one ? 1 : clamp(presence(lt, s.dur), 0, 1); if (fa <= 0) return;
        ctx.save(); ctx.globalAlpha = fa;
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
        ctx.restore(); return;
      }
      if (!ready(img)) {
        if (SC(s, 'style') === 'promo') promoPanels(ctx, W, H, u, pal, sIdx, lt, one ? 1 : tf === 'panels' || tf === 'cut' || tf === 'glitch' ? (lt >= 0 && lt < s.dur ? 1 : 0) : Math.max(0, presence(lt, s.dur)), s.panels && s.panels.length ? s.panels : cfg.panels, s.panels && s.panels.length ? false : !!cfg.panelsRotate, s.panelBg || cfg.panelBg);
        return;
      }
      if (one) { pin = 1; pout = 0; }
      else if (tf === 'cut') { pin = lt >= 0 ? 1 : 0; pout = lt >= s.dur ? 1 : 0; }
      else if (tf === 'glitch' || tf === 'panels') { pin = lt >= 0 ? 1 : 0; pout = lt >= s.dur ? 1 : 0; }
      else if (tf === 'dip') { pin = ramp(lt, 0, 0.7 * TK); pout = ramp(lt, s.dur - 0.7 * TK, s.dur); }
      else { pin = ramp(lt, -0.8 * TK, 0.5 * TK); pout = ramp(lt, s.dur - 0.8 * TK, s.dur + 0.5 * TK); }
      var a = (tf === 'slide' && !one ? (pin > 0 && pout < 1 ? 1 : 0) : Math.min(pin, 1 - pout)) * (s.bgOpacity == null ? 1 : s.bgOpacity);
      if (a <= 0) return;
      var z = isV ? 1 : SC(s, 'kenBurns') === false ? 1.02 : lerp(soft(clamp((lt + 1) / (s.dur + 1), 0, 1)), 1.1, 1.02), dx = 0;
      if (has('zoom')) z *= 1 + 0.07 * bEnv;
      if (has('step')) z *= 1 + 0.03 * bAmt * (Math.min(bIdx, 6) + soft(clamp(bES / 0.35, 0, 1)));
      var shx = 0, shy = 0; if (has('shake')) { shx = (bH1 - 0.5) * 40 * u * bEnv; shy = (bH2 - 0.5) * 26 * u * bEnv; }
      if (BP && cfg.beatReframe) {
        var FR = [[1.035, 0, 0], [1.045, -0.018, 0.007], [1.035, 0.016, -0.007], [1.045, 0.008, 0.014]], rq = Math.max(0, (lt - bNud) / ((calm ? 8 : 4) * BP)), rk = Math.floor(rq);
        var rp = rk === 0 ? 0 : soft(clamp(calm ? (rq - rk) * 1.4 : (rq - rk) * 4 / 2.5, 0, 1)), fa = FR[(rk + 3) % 4], fb = FR[rk % 4];
        if (rk === 0) fa = fb;
        var ramp2 = calm ? 0.35 + 0.45 * nrg + 0.3 * lift : 0.55 + 0.6 * nrg;
        z *= 1 + (lerp(rp, fa[0], fb[0]) - 1) * ramp2; shx += lerp(rp, fa[1], fb[1]) * W * ramp2; shy += lerp(rp, fa[2], fb[2]) * H * ramp2;
      }
      if (tf === 'zoom') z *= lerp(quart(pin), 1.25, 1) * lerp(soft(pout), 1, 0.92);
      if (tf === 'slide') dx = (1 - soft(pin)) * W - soft(pout) * W;
      else if (tf === 'fade') dx = lerp(quart(pin), 45 * u, 0) - lerp(soft(pout), 0, 30 * u);
      /* which part of the picture is shown when it is wider/taller than the frame (panX/panY 0..1) */
      var cs = Math.max(W / iw, H / ih) * z, cw = iw * cs, ch = ih * cs, limX = Math.max(0, (cw - W) / 2), limY = Math.max(0, (ch - H) / 2);
      var pX = s.panX != null ? s.panX : PT ? (s.fx == null ? 0.66 : s.fx) : 0.5, pY = s.panY != null ? s.panY : 0.5;
      var fdx = clamp((0.5 - pX) * cw, -limX, limX), fdy = clamp((0.5 - pY) * ch, -limY, limY);
      ctx.globalAlpha = a; cover(ctx, img, iw, ih, W, H, z, dx + shx + fdx, shy + fdy);
      var tMode = s.tintMode || 'auto', tOn = tMode === 'off' ? false : tMode === 'custom' ? !!s.tint : !!cfg.duotone;
      if (tOn) {
        var tList = cfg.tintColor ? [cfg.tintColor] : cfg.panels && cfg.panels.length ? cfg.panels.map(function (p) { return p.color; }) : pal;
        var tc = tMode === 'custom' ? s.tint : tList[sIdx % tList.length];
        var tAmt = tMode === 'custom' && s.tintAmt != null ? s.tintAmt : cfg.tintAmt != null ? cfg.tintAmt : 0.85;
        var tBl = { color: 'color', soft: 'soft-light', multiply: 'multiply', screen: 'screen', overlay: 'overlay' }[cfg.tintBlend || 'color'] || 'color';
        ctx.save(); ctx.globalCompositeOperation = tBl; ctx.globalAlpha = a * clamp(tAmt, 0, 1); ctx.fillStyle = tc; ctx.fillRect(0, 0, W, H);
        if (tBl === 'color') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * 0.3 * clamp(tAmt / 0.85, 0, 1.2); ctx.fillRect(0, 0, W, H); }
        ctx.restore(); ctx.globalAlpha = a;
      }
      if (tf === 'glitch' && !one) {
        var gw = 0.32, gi = lt < gw ? 1 - lt / gw : s.dur - lt < gw ? 1 - (s.dur - lt) / gw : 0;
        if (gi > 0) {
          var fr = Math.floor(lt * 30);
          for (var gk = 0; gk < 9; gk++) {
            var gy = hsh(fr * 13.1 + gk) * H, gh = (0.02 + 0.1 * hsh(fr * 7.7 + gk * 3.1)) * H, gx = (hsh(fr * 3.3 + gk * 5.7) - 0.5) * 180 * u * gi;
            ctx.save(); ctx.beginPath(); ctx.rect(0, gy, W, gh); ctx.clip();
            cover(ctx, img, img.naturalWidth, img.naturalHeight, W, H, z * (1 + 0.03 * gi), dx + shx + fdx + gx, shy); ctx.restore();
          }
          ctx.save(); ctx.globalCompositeOperation = 'screen';
          for (var gb = 0; gb < 4; gb++) { ctx.fillStyle = rgba(gb % 2 ? '#ffffff' : cfg.accent, (0.18 + 0.2 * hsh(fr + gb * 9.1)) * gi); ctx.fillRect(0, hsh(fr * 5.1 + gb * 2.3) * H, W, (2 + 10 * hsh(fr + gb)) * u); }
          ctx.restore();
        }
      } ctx.globalAlpha = 1;
    });
    /* grade */
    var k = cfg.overlay == null ? 1 : cfg.overlay, ow = 0, os = 0, oxs = 0, oys = 0, von = 0, vcol = null, vbest = -1, vtyp = 'auto', vrot = 0, vbestS = null, vbestLt = 0;
    trio.forEach(function (o) {
      var pr = trio.length === 1 ? 1 : Math.max(0, presence(o.lt, o.s.dur));
      if (pr > vbest) { vbest = pr; vbestS = o.s; vbestLt = o.lt; vcol = o.s.vigColor || cfg.vigColor || null; vtyp = o.s.vigType || cfg.vigType || 'auto'; vrot = o.s.vigRot != null ? Number(o.s.vigRot) || 0 : Number(cfg.vigRot) || 0; }
      ow += pr; os += pr * (o.s.vig != null ? o.s.vig : cfg.vigOpen != null ? cfg.vigOpen : 0.5); var bare = SC(o.s, 'style') === 'promo' && !ready(o.s.bg && E.media.images ? E.media.images[o.s.bg] : null) && !ready(o.s.vid && E.media.vids ? E.media.vids[o.s.vid] : null); if (!o.s.vigOff && !bare) von += pr;
      oxs += pr * (o.s.fx != null ? o.s.fx : cfg.vigX != null ? cfg.vigX : 0.66); oys += pr * (o.s.fy != null ? o.s.fy : cfg.vigY != null ? cfg.vigY : 0.4);
    });
    if (cfg.vigOn === false) k = 0; else if (ow > 0) k *= von / ow;
    var open = ow > 0 ? os / ow : 0.5, fx = ow > 0 ? oxs / ow : 0.66, fy = ow > 0 ? oys / ow : 0.4, vk = k * (has('vig') ? 1 + 0.35 * bEnv : 1);
    /* one vignette layer; the slide's own vignette plus any extra layers use the same shapes */
    /* strength: 0 = no vignette, 1 = normal, 2 = the colour covers the whole frame */
    var vigLayer = function (vtyp, fx, fy, open, vrot, VC, vk, sz, amt, sf) {
      sf = sf == null ? 0.5 : clamp(sf, 0, 1); var SF = 0.12 + 1.76 * sf;
      amt = amt == null ? 1 : clamp(amt, 0, 2);
      if (vk <= 0.001) return; /* vignette switched off (slide or all slides) */
      if (amt > 1) {
        /* above 100 % the dark area closes in from the edges, in the vignette's own shape, until it covers everything at 200 % */
        vigLayer(vtyp, fx, fy, open, vrot, VC, vk, sz, 1, sf);
        var t = clamp(amt - 1, 0, 1), soft = 0.35 * (1 - t) * SF + 0.002;
        var lin = function (deg, span) { var p1 = clamp(t * span, 0, 0.995), p2 = clamp(p1 + soft * span, p1 + 0.003, 1); cssGradientAt(ctx, W, H, deg, [[0, 1], [p1, 1], [p2, 0]], 1, VC); };
        if (vtyp === 'even') { ctx.fillStyle = rgba(VC, t); ctx.fillRect(0, 0, W, H); }
        else if (vtyp === 'bottom') lin(0 + vrot, 1);
        else if (vtyp === 'top') lin(180 + vrot, 1);
        else if (vtyp === 'left') lin(90 + vrot, 1);
        else if (vtyp === 'cinema') { lin(0 + vrot, 0.5); lin(180 + vrot, 0.5); }
        else if (vtyp === 'sides') { lin(90 + vrot, 0.5); lin(270 + vrot, 0.5); }
        else {
          var cx = fx * W, cy = fy * H, Rm = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.02;
          var r0 = Math.max(0, (1 - t) * Rm * 0.85), r1 = Math.max(r0 + 1, r0 + Rm * soft);
          ctx.save();
          if (vtyp === 'oval') { ctx.translate(cx, cy); ctx.rotate(vrot * Math.PI / 180); var mx = Math.max(W, H); ctx.scale(W / mx, H / mx); var k2 = mx / Math.min(W, H); r0 *= k2; r1 *= k2; cx = 0; cy = 0; }
          var cg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1); cg.addColorStop(0, rgba(VC, 0)); cg.addColorStop(1, rgba(VC, 1));
          ctx.fillStyle = cg; ctx.fillRect(-4 * W, -4 * H, 9 * W, 9 * H); ctx.restore();
          if (t >= 0.999) { ctx.fillStyle = rgba(VC, 1); ctx.fillRect(0, 0, W, H); }
        }
        return;
      }
      vk *= amt;
      if (vk <= 0.001) return;
      sz = sz == null ? 1 : clamp(sz, 0.2, 3);
      var rcx = fx * W, rcy = fy * H;
      var SS = function (st, sym) {
        var a = st.map(function (p) { var q = p[0]; if (sym) q = q <= 0.5 ? Math.min(0.5, q * sz) : Math.max(0.5, 1 - (1 - q) * sz); else if (q < 1) q = clamp(q * sz, 0, 0.999); return [q, p[1]]; });
        /* focus: squeeze (hard edge) or stretch (diffuse) the transition around its middle */
        var soften = function (arr) { if (arr.length < 3) return arr; var m = 0; arr.forEach(function (p) { m += p[0]; }); m /= arr.length; return arr.map(function (p, i) { return [i === 0 ? p[0] : clamp(m + (p[0] - m) * SF, 0.001, 0.999), p[1]]; }); };
        if (sym) { var h1 = a.filter(function (p) { return p[0] <= 0.5; }), h2 = a.filter(function (p) { return p[0] > 0.5; }).map(function (p) { return [1 - p[0], p[1]]; }).reverse(); h1 = soften(h1); h2 = soften(h2).reverse().map(function (p) { return [1 - p[0], p[1]]; }); a = h1.concat(h2); }
        else a = soften(a);
        for (var i = 1; i < a.length; i++) if (a[i][0] <= a[i - 1][0]) a[i][0] = Math.min(1, a[i - 1][0] + 0.001);
        return a;
      };
      var radial = function (cx, cy, r0, r1, a) { var mid = (r0 + r1) / 2, hf = (r1 - r0) / 2 * SF; r0 = Math.max(0, mid - hf); r1 = Math.max(r0 + 1, mid + hf); var g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1); g.addColorStop(0, rgba(VC, 0)); g.addColorStop(1, rgba(VC, clamp(a, 0, 1))); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      if (vtyp === 'round') radial(rcx, rcy, Math.min(W, H) * (0.18 + 0.32 * open) * sz, Math.max(W, H) * (0.5 + 0.4 * open) * sz, 0.82 * vk);
      else if (vtyp === 'oval') { ctx.save(); ctx.translate(rcx, rcy); ctx.rotate(vrot * Math.PI / 180); ctx.scale(W / Math.max(W, H), H / Math.max(W, H)); var R = Math.max(W, H); var oa = R * (0.28 + 0.2 * open) * sz, ob = R * (0.62 + 0.18 * open) * sz, om = (oa + ob) / 2, oh = (ob - oa) / 2 * SF; var og = ctx.createRadialGradient(0, 0, Math.max(0, om - oh), 0, 0, Math.max(1, om + oh)); og.addColorStop(0, rgba(VC, 0)); og.addColorStop(1, rgba(VC, clamp(0.82 * vk, 0, 1))); ctx.fillStyle = og; ctx.fillRect(-3 * R, -3 * R, 6 * R, 6 * R); ctx.restore(); }
      else if (vtyp === 'bottom') cssGradientAt(ctx, W, H, 0 + vrot, SS([[0, 0.95], [0.3 + 0.15 * open, 0.45], [0.62 + 0.2 * open, 0]]), vk, VC);
      else if (vtyp === 'top') cssGradientAt(ctx, W, H, 180 + vrot, SS([[0, 0.95], [0.3 + 0.15 * open, 0.45], [0.62 + 0.2 * open, 0]]), vk, VC);
      else if (vtyp === 'cinema') { cssGradientAt(ctx, W, H, 0 + vrot, SS([[0, 0.95], [0.22 + 0.1 * open, 0.35], [0.45, 0]]), vk, VC); cssGradientAt(ctx, W, H, 180 + vrot, SS([[0, 0.95], [0.22 + 0.1 * open, 0.35], [0.45, 0]]), vk, VC); }
      else if (vtyp === 'sides') cssGradientAt(ctx, W, H, 90 + vrot, SS([[0, 0.92], [0.18 + 0.12 * open, 0.25], [0.5, 0], [0.82 - 0.12 * open, 0.25], [1, 0.92]], true), vk, VC);
      else if (vtyp === 'left') cssGradientAt(ctx, W, H, 90 + vrot, SS([[0, 0.95], [0.3 + 0.15 * open, 0.55], [0.7 + 0.2 * open, 0]]), vk, VC);
      else if (vtyp === 'even') { ctx.fillStyle = rgba(VC, clamp(0.5 * vk, 0, 0.95)); ctx.fillRect(0, 0, W, H); }
      else {
        var p2 = clamp(fx + (open - 0.5) * 0.2, 0.12, 0.95);
        cssGradientAt(ctx, W, H, (PT ? 20 : 78) + vrot, SS([[0, 0.78], [p2 * 0.48, 0.6], [p2, 0.2], [1, 0.3]]), vk, VC);
        var sy = clamp((1 - fy) / 0.6, 0.3, 1.6) * (PT ? 1.3 : 1);
        cssGradientAt(ctx, W, H, 0 + vrot, SS([[0, 0.72], [clamp(0.34 * sy, 0.05, 0.9), 0.2], [clamp(0.62 * sy, 0.1, 0.98), 0]]), vk, VC);
        radial(rcx, rcy, Math.min(W, H) * (0.2 + 0.4 * open) * sz, Math.max(W, H) * (0.6 + 0.5 * open) * sz, 0.45 * (1 - open) * vk);
      }
    };
    var withAlpha = function (al, fn) { al = al == null ? 1 : clamp(Number(al), 0, 1); if (al <= 0.001) return; ctx.save(); ctx.globalAlpha = al; fn(); ctx.restore(); };
    var PV = function (k, d) { return vbestS && vbestS[k] != null ? Number(vbestS[k]) : cfg[k] != null ? Number(cfg[k]) : d; };
    withAlpha(PV('vigAlpha', 1), function () { vigLayer(vtyp, fx, fy, open, vrot, vcol || '#080808', vk, PV('vigSize', 1), PV('vigAmt', 1), PV('vigSoft', 0.5)); });
    if (vbestS && cfg.vigOn !== false && !vbestS.vigOff) {
      var k0 = cfg.overlay == null ? 1 : cfg.overlay, lp = trio.length === 1 ? 1 : clamp(presence(vbestLt, vbestS.dur), 0, 1);
      [].concat(Array.isArray(cfg.vigs) ? cfg.vigs : [], Array.isArray(vbestS.vigs) ? vbestS.vigs : []).forEach(function (L) {
        if (!L) return; var op = L.open == null ? 0.5 : L.open;
        withAlpha(L.alpha, function () { vigLayer(L.type || 'round', L.x == null ? 0.5 : L.x, L.y == null ? 0.5 : L.y, op, Number(L.rot) || 0, L.color || '#080808', k0 * lp, L.size == null ? 1 : Number(L.size), L.amt == null ? 1 : Number(L.amt), L.soft == null ? 0.5 : Number(L.soft)); });
      });
    }
    if (has('pump')) { ctx.fillStyle = 'rgba(0,0,0,' + (0.34 * bAmt * (1 - Math.exp(-bES * 5))).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (has('streak')) { var sdur = Math.min(0.9, 4 * BP * 0.6), sw0 = clamp(bSB / sdur, 0, 1); if (sw0 > 0.004 && sw0 < 0.996) band(ctx, W, H, sw0, cfg.accent, 0.45 * bAmt, bBar % 2 ? 8 : -8); }
    if (has('glow') && bEnv > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      var pg = ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, Math.max(W, H) * 0.75);
      pg.addColorStop(0, rgba(cfg.accent, 0.22 * bEnv)); pg.addColorStop(1, rgba(cfg.accent, 0));
      ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    var oFx = SC(loc ? slides[loc.i] : null, 'overlayFx');
    var oS = loc ? slides[loc.i] : null, OVV = function (sk, ck, d) { return oS && oS[sk] != null ? oS[sk] : cfg[ck] != null ? cfg[ck] : d; };
    var oSync = BP && cfg.overlaySync !== false, fxNow = Date.now() / 1000 * (oSync ? clamp(0.5 / BP, 0.5, 1.8) : 1) * clamp(Number(OVV('oSpeed', 'ovSpeed', 1)), 0.1, 4), fxAmt = clamp(Number(OVV('oAmt', 'fxAmount', 0.6)), 0, 1.5);
    var oCol = OVV('oColor', 'ovColor', null) || cfg.accent, oAl = clamp(Number(OVV('oAlpha', 'ovAlpha', 1)), 0, 1);
    ctx.save(); ctx.globalAlpha = oAl;
    if (oFx === 'leak') fxLeak(ctx, W, H, fxNow, oCol, Math.min(1, fxAmt * (1 + bEnv)));
    if (oFx === 'snow') fxSnow(ctx, W, H, fxNow, u, fxAmt);
    if (oFx === 'newyear') {
      var nyT = t, nyP = 2.8;
      if (oSync && loc) { var ns0 = 0; for (var nq = 0; nq < loc.i; nq++) ns0 += slides[nq].dur; nyT = ns0 + loc.lt - bNud; nyP = 8 * BP; while (nyP < 2.4) nyP *= 2; }
      fxNewYear(ctx, W, H, nyT, nyP, fxNow, oCol, u, Math.min(1, 0.4 + 0.6 * fxAmt));
    }
    if (oFx === 'bokeh') fxBokeh(ctx, W, H, fxNow, oCol, u, Math.min(1, fxAmt * (1 + bEnv)));
    ctx.restore();
    /* amber sweep */
    trio.forEach(function (o) {
      if (trio.length === 1 || SC(o.s, 'sweep') === false) return;
      var wipe = ramp(o.lt, -0.3, 0.6);
      if (wipe <= 0.004 || wipe >= 0.996) return;
      var bw = W * 0.55, bx = lerp(wipe, -1.4, 3.2) * bw;
      ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(bx + bw / 2, H / 2); ctx.transform(1, 0, Math.tan(-8 * Math.PI / 180), 1, 0, 0); ctx.translate(-bw / 2, -H / 2);
      var g = ctx.createLinearGradient(0, 0, bw, 0);
      g.addColorStop(0, rgba(cfg.accent, 0)); g.addColorStop(0.55, rgba(cfg.accent, 0.6)); g.addColorStop(1, rgba(cfg.accent, 0));
      ctx.fillStyle = g; ctx.fillRect(0, -H * 0.2, bw, H * 1.4); ctx.restore();
    });
    /* pictures placed on the slide */
    trio.forEach(function (o) {
      var s = o.s; if (!s.pips || !s.pips.length) return;
      var lt = o.lt, pr = trio.length === 1 ? 1 : clamp(presence(lt, s.dur), 0, 1); if (pr <= 0.01) return;
      s.pips.forEach(function (p, pi) {
        var im = E.media.images ? E.media.images[p.src] : null; if (!ready(im)) return;
        var w = clamp(p.w || 0.3, 0.03, 1.5) * W, h = w * im.naturalHeight / im.naturalWidth;
        var cx = (p.x == null ? 0.72 : p.x) * W, cy = (p.y == null ? 0.4 : p.y) * H, x0 = cx - w / 2, y0 = cy - h / 2;
        var rad = Math.min((p.r == null ? 18 : p.r) * u, w / 2, h / 2);
        var sc = trio.length === 1 ? 1 : lerp(ramp(lt, -0.25, 0.8, quart), 0.94, 1);
        ctx.save(); ctx.globalAlpha = pr * (p.op == null ? 1 : clamp(p.op, 0, 1));
        ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        if (p.shadow !== false) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 44 * u; ctx.shadowOffsetY = 16 * u; ctx.fillStyle = '#000'; rr(ctx, x0, y0, w, h, rad); ctx.fill(); ctx.restore(); }
        ctx.save(); rr(ctx, x0, y0, w, h, rad); ctx.clip(); ctx.drawImage(im, x0, y0, w, h); ctx.restore();
        if (p.border) { ctx.lineWidth = 5 * u; ctx.strokeStyle = p.borderColor || '#ffffff'; rr(ctx, x0, y0, w, h, rad); ctx.stroke(); }
        ctx.restore();
        if (lt >= 0 && pr > 0.5) { rects.pips = rects.pips || []; rects.pips.push({ kind: 'pip', id: s.id, i: pi, x: x0, y: y0, w: w, h: h }); }
      });
    });
    /* text */
    var dayW = 0, outroW = 0, activeDay = null, best = 0;
    trio.forEach(function (o) {
      var s = o.s, lt = o.lt, pr = trio.length === 1 ? 1 : presence(lt, s.dur);
      if (s.type === 'day' && !s.extra) { dayW += pr; if (pr > best) { best = pr; activeDay = o; } }
      if (s.type === 'outro') outroW += pr;
      if (lt < -0.35) return;
      var sTf = SC(s, 'transFx'), hard = sTf === 'cut' || sTf === 'panels';
      var outP = trio.length === 1 ? 0 : (hard ? (lt >= s.dur ? 1 : 0) : ramp(lt, s.dur - 0.7 * TK, s.dur + 0.15 * TK));
      if (outP >= 1) return;
      if (hard && lt < 0) return;
      E.tfx = SC(s, 'textFx'); E.kst = SC(s, 'kickerStyle'); E.tcol = s.tcol || null; E.tsc = s.tsc || null; E.toff = s.toff || null; E.kh = null;
      var spd = cfg.fxSpeed || 1, ltd = E.tfx === 'none' ? 99 : (bText ? lt - bNud + 0.1 : lt * spd);
      ctx.save(); E.A = 1 - outP; ctx.translate(0, -30 * u * outP);
      if (pol) { var ppx = soft(clamp(lt / s.dur, 0, 1)), pe = 0.6 + 0.6 * nrg; ctx.translate(10 * u * pol * pe * ppx, -16 * u * pol * pe * ppx); }
      if (has('bounce') && bEnv > 0.005) { var bsc = 1 + 0.04 * bEnv, ay = H - 150 * u; ctx.translate(E.M, ay); ctx.scale(bsc, bsc); ctx.translate(-E.M, -ay); } E.rec = lt >= 0 && outP < 0.5 ? s.id : null;
      if (s.type === 'day') drawDay(ctx, s, ltd, E);
      else if (s.type === 'contact') drawContact(ctx, s, ltd, E);
      else if (s.type === 'outro') drawOutro(ctx, s, ltd, E);
      else drawText(ctx, s, ltd, E);
      ctx.restore(); E.A = 1; E.rec = null;
    });
    /* free text and QR placed anywhere on the slide */
    trio.forEach(function (o) {
      var s = o.s; if (!(s.ftexts && s.ftexts.length) && !(s.fqr && s.fqr.qr)) return;
      var lt = o.lt, pr = trio.length === 1 ? 1 : clamp(presence(lt, s.dur), 0, 1); if (pr <= 0.01) return;
      var ent = trio.length === 1 ? 1 : ramp(lt, -0.2, 0.9, quart), dy = (1 - ent) * 24 * u, live = lt >= 0 && pr > 0.5;
      rects.fitems = rects.fitems || [];
      (s.ftexts || []).forEach(function (t, ti) {
        var lines = String(t.text || '').split(/\r?\n/); if (!lines.join('').trim()) return;
        var fs = 56 * u * clamp(t.size || 1, 0.2, 8), wt = t.bold === false ? 500 : 700, lh = fs * 1.12;
        setFont(ctx, fs, wt, t.bold === false ? 0 : -0.01);
        var mw = 0; lines.forEach(function (l) { mw = Math.max(mw, ctx.measureText(t.upper ? up(l) : l).width); });
        var bh = lines.length * lh, cx = (t.x == null ? 0.5 : t.x) * W, cy = (t.y == null ? 0.3 : t.y) * H, x0 = cx - mw / 2, y0 = cy - bh / 2 + dy;
        ctx.save(); ctx.globalAlpha = pr * ent;
        if (t.box) { var bp = fs * 0.35; ctx.fillStyle = t.boxColor || 'rgba(0,0,0,0.6)'; rr(ctx, x0 - bp, y0 - bp * 0.6, mw + bp * 2, bh + bp * 1.2, Math.min(fs * 0.3, 24 * u)); ctx.fill(); }
        ctx.fillStyle = t.color || '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        lines.forEach(function (l, li) { ctx.fillText(t.upper ? up(l) : l, cx, y0 + li * lh + fs * 0.86); });
        ctx.textAlign = 'left'; ctx.restore();
        if (live) rects.fitems.push({ kind: 'ftext', id: s.id, i: ti, x: x0, y: y0, w: mw, h: bh });
      });
      var q = s.fqr;
      if (q && q.qr && q.qr.length) {
        var qs = clamp(q.size || 260, 60, 1000) * u, qk = qs / (260 * u), cx2 = (q.x == null ? 0.82 : q.x) * W, cy2 = (q.y == null ? 0.42 : q.y) * H;
        var cap = [q.caption, q.contact].filter(Boolean), cfs = 26 * u * qk, clh = cfs * 1.3, capH = cap.length ? 18 * u * qk + cap.length * clh : 0;
        var x1 = cx2 - qs / 2, y1 = cy2 - (qs + capH) / 2 + dy, sc2 = trio.length === 1 ? 1 : lerp(back(clamp(ent, 0, 1)), 0.9, 1);
        ctx.save(); ctx.globalAlpha = pr * ent; ctx.translate(cx2, y1 + qs / 2); ctx.scale(sc2, sc2); ctx.translate(-cx2, -(y1 + qs / 2));
        ctx.fillStyle = '#fff'; rr(ctx, x1, y1, qs, qs, 14 * u * qk); ctx.fill();
        var n = q.qr.length, pad = qs * 0.08, cell = (qs - pad * 2) / n; ctx.fillStyle = '#0b0b0b';
        for (var r2 = 0; r2 < n; r2++) for (var c2 = 0; c2 < n; c2++) if (q.qr[r2].charCodeAt(c2) === 49) ctx.fillRect(x1 + pad + c2 * cell, y1 + pad + r2 * cell, cell + 0.6, cell + 0.6);
        ctx.restore();
        var cmw = qs;
        if (cap.length) {
          ctx.save(); ctx.globalAlpha = pr * ent; ctx.textAlign = 'center';
          cap.forEach(function (l, li) { setFont(ctx, cfs, li === 0 && q.caption ? 700 : 500, 0.02); ctx.fillStyle = li === 0 && q.caption ? (q.color || '#ffffff') : 'rgba(255,255,255,0.85)'; ctx.fillText(l, cx2, y1 + qs + 18 * u * qk + li * clh + cfs); cmw = Math.max(cmw, ctx.measureText(l).width); });
          ctx.textAlign = 'left'; ctx.restore();
        }
        if (live) rects.fitems.push({ kind: 'fqr', id: s.id, i: 0, x: cx2 - cmw / 2, y: y1, w: cmw, h: qs + capH });
      }
    });
    /* standing chrome */
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
    if (cfg.topLabel) {
      var tls = cfg.topLabelScale > 0 ? cfg.topLabelScale : 1; setFont(ctx, 20 * u * XS * tls, 500, 0.4); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.textAlign = 'right';
      var tlx = cfg.topLabelX == null ? W - E.M + 8 * u : cfg.topLabelX * W, tly = cfg.topLabelY == null ? E.M + 7 * u : cfg.topLabelY * H;
      ctx.fillText(up(cfg.topLabel), tlx, tly + 18 * u * XS * tls); ctx.textAlign = 'left';
      var tlw = ctx.measureText(up(cfg.topLabel)).width;
      rects.topLabel = { x: tlx - tlw, y: tly - 4 * u, w: tlw, h: 28 * u * XS * tls };
    }
    if (cfg.header) {
      var hds = cfg.headerScale > 0 ? cfg.headerScale : 1; setFont(ctx, 32 * u * XS * hds, 600, 0.34);
      var hx = cfg.headerX == null ? E.M : cfg.headerX * W, hy = cfg.headerY == null ? E.M : cfg.headerY * H;
      var hw = ctx.measureText(up(cfg.header)).width;
      rects.header = { x: hx, y: hy - 4 * u, w: hw, h: 40 * u * XS * hds };
      if (outroW < 1) { ctx.globalAlpha = 1 - clamp(outroW, 0, 1); ctx.fillStyle = '#fff'; ctx.fillText(up(cfg.header), hx, hy + 27 * u * XS * hds); ctx.globalAlpha = 1; }
    }
    /* week rail */
    if (cfg.rail !== false) {
      var items = [], map = {};
      slides.forEach(function (s) {
        if (s.type !== 'day' || s.extra) return;
        var last = items[items.length - 1];
        if (last && last.day === s.day) map[s.id] = items.length - 1; else { items.push({ day: s.day }); map[s.id] = items.length - 1; }
      });
      var ra = clamp(dayW, 0, 1);
      if (items.length > 1 && ra > 0) {
        var rw = Math.min(1100 * u, E.COL), gap = (E.PT ? 20 : 32) * u, iw = (rw - gap * (items.length - 1)) / items.length, ry = E.BOT + 41 * u;
        var ai = activeDay ? map[activeDay.s.id] : -1, af = activeDay ? ramp(activeDay.lt, -0.2, 0.9, quart) : 0;
        ctx.globalAlpha = ra;
        items.forEach(function (it, i) {
          var ix = E.M + i * (iw + gap);
          ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(ix, ry, iw, 1.5 * u);
          if (i === ai) { ctx.fillStyle = cfg.accent; ctx.fillRect(ix, ry, iw * af, 1.5 * u); }
          setFont(ctx, 19 * u * XS, 600, 0.22); ctx.fillStyle = i === ai ? '#fff' : 'rgba(255,255,255,0.6)';
          ctx.fillText(up(it.day), ix, ry + 11 * u + 17 * u);
        });
        ctx.globalAlpha = 1;
      }
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    /* logo */
    var lim = E.logoImg, logoRect = E.logoRect;
    if (logoRect) {
      var lwS = 0, ltS = 0;
      trio.forEach(function (o) { var pr = trio.length === 1 ? 1 : Math.max(0, presence(o.lt, o.s.dur)); ltS += pr; if (!o.s.noLogo) lwS += pr; });
      var la = trio.length ? (ltS > 0 ? lwS / ltS : 1) : 1;
      if (la > 0) { ctx.globalAlpha = clamp(la, 0, 1) * (cfg.logoOpacity == null ? 1 : cfg.logoOpacity); ctx.drawImage(lim, logoRect.x, logoRect.y, logoRect.w, logoRect.h); ctx.globalAlpha = 1; }
    }
    rects.logo = logoRect;
    E.tfx = null; E.kst = undefined; E.tcol = null; E.tsc = null; E.toff = null; E.kh = null;
    if (trio.length > 1) trio.forEach(function (o) {
      if (SC(o.s, 'transFx') !== 'panels') return;
      var lt = o.lt; if (lt < -0.55 || lt > 0.8) return;
      var pal = cfg.palette || PROMO, idx = Math.max(0, slides.indexOf(o.s)), N = PT ? 4 : 6, sw = W / N;
      for (var i = 0; i < N; i++) {
        var q = clamp((lt + 0.5 - i * 0.05) / 1.0, 0, 1); if (q <= 0 || q >= 1) continue;
        var y0 = q < 0.3 ? H * (1 - quart(q / 0.3)) : 0, y1 = q > 0.7 ? H * (1 - soft((q - 0.7) / 0.3)) : H;
        var pcs = cfg.panels && cfg.panels.length ? cfg.panels : null;
        ctx.fillStyle = pcs ? (pcs[((cfg.panelsRotate ? idx : 0) + i) % pcs.length].color || pal[(idx + i) % pal.length]) : pal[(idx + i) % pal.length]; ctx.fillRect(i * sw - 1, y0, sw + 2, y1 - y0);
        if (q > 0.7) { ctx.fillStyle = cfg.accent; ctx.fillRect(i * sw - 1, y1 - 6 * u, sw + 2, 6 * u); }
      }
    });
    if (has('flash') && bD > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,255,255,' + (0.38 * bD).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (oFx === 'grain' || oFx === 'lines') { ctx.save(); ctx.globalAlpha = oAl; if (oFx === 'grain') fxGrain(ctx, W, H, u, fxAmt); else fxLines(ctx, W, H, fxNow, u, fxAmt); ctx.restore(); }
    var gd = E.media && E.media.guides;
    if (gd && gd.length) {
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = '#39d0ff'; ctx.lineWidth = Math.max(1, 2 * u);
      if (ctx.setLineDash) ctx.setLineDash([10 * u, 6 * u]);
      gd.forEach(function (g) { ctx.beginPath(); if (g.t === 'v') { ctx.moveTo(g.v, 0); ctx.lineTo(g.v, H); } else { ctx.moveTo(0, g.v); ctx.lineTo(W, g.v); } ctx.stroke(); });
      ctx.restore();
    }
    if (E.media) { E.media.lastLogoRect = logoRect; E.media.lastRects = rects; }
    return loc;
  }
  return { drawFrame: drawFrame, locate: locate };
}

/* sample-accurate soundtrack that follows the loop clock */
function __ukeloopAudioCtl(ctx, out) {
  var buf = null, src = null, srcOff = 0, srcAt = 0, lastTT = null, g = ctx.createGain();
  g.gain.value = 0; g.connect(out);
  function halt() { if (src) { try { src.stop(); } catch (e) {} try { src.disconnect(); } catch (e) {} src = null; } }
  function start(pos, loop, ls, le) {
    halt(); if (!buf) return;
    src = ctx.createBufferSource(); src.buffer = buf; src.loop = !!loop;
    if (loop) { src.loopStart = ls || 0; src.loopEnd = le || buf.duration; }
    src.connect(g);
    pos = Math.max(0, Math.min(buf.duration - 0.01, pos));
    src.start(0, pos); srcOff = pos; srcAt = ctx.currentTime;
  }
  return {
    setBuffer: function (b) { halt(); buf = b; lastTT = null; },
    duration: function () { return buf ? buf.duration : 0; },
    lag: function (tt, off) { if (!src || !buf) return null; return ((off || 0) + tt) - (srcOff + (ctx.currentTime - srcAt)); },
    stop: function () { halt(); lastTT = null; },
    sync: function (live, tt, total, o) {
      o = o || {};
      if (!buf || !live || ctx.state !== 'running') { if (src) halt(); lastTT = null; return; }
      var vol = o.vol == null ? 0.8 : o.vol, off = Math.max(0, o.offset || 0), mode = o.mode || 'cut';
      if (mode === 'free') {
        if (!src) start(off, true, off, buf.duration);
        g.gain.setTargetAtTime(vol, ctx.currentTime, 0.05); lastTT = tt; return;
      }
      /* song shorter than the loop: repeat it so every slide has music */
      var seg = Math.max(0.5, buf.duration - off), rep = total > buf.duration - off + 0.05, lp = rep ? tt % seg : tt;
      var pos = off + lp, wrapped = lastTT != null && tt < lastTT - 0.5; lastTT = tt;
      var actual = src ? srcOff + (ctx.currentTime - srcAt) : -1;
      if (!src || wrapped || Math.abs(actual - pos) > 0.3) { if (pos < buf.duration - 0.02) start(pos, false); else halt(); }
      var fi = o.fadeIn == null ? 0.6 : o.fadeIn, fo = o.fadeOut == null ? 1 : o.fadeOut, f = 1;
      if (total > 1) { if (fi > 0) f = Math.min(f, tt / fi); if (fo > 0) f = Math.min(f, (total - tt) / fo); }
      if (rep && tt > seg - 0.5) { f = Math.min(f, Math.max(0, (seg - lp) / 0.35), Math.min(1, lp / 0.12)); }
      f = Math.max(0, Math.min(1, f));
      g.gain.setTargetAtTime(vol * f, ctx.currentTime, 0.015);
    }
  };
}

function __ukeloopPlayerBoot(P, R) {
  var c = document.getElementById('c'); c.width = P.W; c.height = P.H;
  var ctx = c.getContext('2d'), media = { images: {}, video: null };
  try { var fm = (P.data.cfg && P.data.cfg.font) || 'Archivo'; ['400', '500', '600', '700'].forEach(function (w) { document.fonts.load(w + ' 40px "' + fm + '"').catch(function () {}); }); } catch (e) {}
  for (var k in P.media.images) { var im = new Image(); im.src = P.media.images[k]; media.images[k] = im; }
  if (P.media.video) {
    var v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.src = P.media.video;
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.appendChild(v); v.play().catch(function () {}); media.video = v;
  }
  var t0 = performance.now(), actx = null, actl = null;
  if (P.audio && P.audio.src) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); actl = __ukeloopAudioCtl(actx, actx.destination);
      fetch(P.audio.src).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return actx.decodeAudioData(ab); }).then(function (b) { actl.setBuffer(b); }).catch(function () {});
      actx.resume().catch(function () {});
    } catch (e) {}
  }
  function syncAudio(loc) {
    if (!actl || !loc) return;
    var sl = P.data.slides || [], st = 0;
    for (var k = 0; k < loc.i; k++) st += sl[k].dur;
    actl.sync(true, st + loc.lt, loc.total, P.audio);
    var lg = actl.lag(st + loc.lt, P.audio.offset || 0); if (lg != null && Math.abs(lg) < 0.3) alag = alag * 0.9 + lg * 0.1;
  }
  var nb = (P.data.cfg && P.data.cfg.beatNudge) || 0, alag = 0;
  (function loop() { if (P.data.cfg && P.data.cfg.beat && actx) P.data.cfg.beatNudge = nb + alag + (actx.outputLatency || actx.baseLatency || 0); var loc = R.drawFrame(ctx, P.W, P.H, P.data, media, (performance.now() - t0) / 1000); syncAudio(loc); requestAnimationFrame(loop); })();
  document.addEventListener('click', function () {
    if (actx) actx.resume().catch(function () {});
    if (media.video) media.video.play().catch(function () {});
    if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  });
  var hide; document.addEventListener('mousemove', function () { document.body.style.cursor = ''; clearTimeout(hide); hide = setTimeout(function () { document.body.style.cursor = 'none'; }, 2000); });
}

(function () {
  var DAYS = { mandag: 'Mandag', tirsdag: 'Tirsdag', onsdag: 'Onsdag', torsdag: 'Torsdag', fredag: 'Fredag', 'lørdag': 'Lørdag', lordag: 'Lørdag', 'søndag': 'Søndag', sondag: 'Søndag',
    man: 'Mandag', tir: 'Tirsdag', tirs: 'Tirsdag', ons: 'Onsdag', tor: 'Torsdag', tors: 'Torsdag', fre: 'Fredag', 'lør': 'Lørdag', 'søn': 'Søndag' };
  var FULL_RE = /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|lordag|søndag|sondag)(?![a-zæøå])\.?(.*)$/i;
  var ABBR_RE = /^(man|tirs|tir|ons|tors|tor|fre|lør|søn)\.?(?=\s*$|\s*[\d(:,–-]|\s+kl)(.*)$/i;
  var T = '\\d{1,2}(?:[:.]\\d{2})?';
  var TIME_RE = new RegExp('^(?:kl\\.?\\s*(' + T + ')|(\\d{1,2}[:.]\\d{2}))(?:\\s*(?:-|–|—|til)\\s*(' + T + '))?(.*)$', 'i');
  var TIME_END = new RegExp('^(.*?)[\\s,–-]*\\bkl\\.?\\s*(' + T + ')(?:\\s*(?:-|–|—|til)\\s*(' + T + '))?\\s*$', 'i');
  var TIME_ONLY = new RegExp('^(?:kl\\.?\\s*)?(' + T + ')(?:\\s*[-–—]\\s*(' + T + '))?$', 'i');
  var DATE_RE = /^\(?(\d{1,2}\.\s?\d{1,2}\.?(?:\d{2,4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\.?\s+(?:jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|des)[a-zæøå]*\.?)\)?/i;
  var EXTRA_RE = /^ekstra\b\s*[:\-–]?\s*/i;
  var DATE_LINE = /^(\d{1,2}\.?\s*(?:[-–]\s*\d{1,2}\.?\s*)?(?:jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|des)[a-zæøå]*\.?)\s*[:–-]?\s*(.*)$/i;
  function tidyDate(s) { return String(s || '').replace(/(\d)\.(?=[a-zæøå])/gi, '$1. ').replace(/\.\s*-\s*/g, '.–').replace(/\s+/g, ' ').replace(/[\s:.]+$/, function (m) { return /\d\.$/.test(s.trim()) ? '.' : ''; }).trim(); }
  function normT(s) { var p = s.replace('.', ':').split(':'); return ('0' + p[0]).slice(-2) + ':' + (p[1] || '00'); }
  function fmtT(a, b) { return a ? 'kl ' + normT(a) + (b ? '–' + normT(b) : '') : ''; }
  function keyOf(name) { return String(name || '').toLowerCase().replace(/ø/g, 'o').replace(/å/g, 'a').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function splitPlace(rest) {
    var m = rest.match(/^(.*\S)\s*\(([^)]+)\)$/); if (m) return [m[1], m[2]];
    var seps = [' | ', ' – ', ' — ', ' - ', ' @ '];
    for (var i = 0; i < seps.length; i++) { var k = rest.lastIndexOf(seps[i]); if (k > 0) return [rest.slice(0, k).trim(), rest.slice(k + seps[i].length).trim()]; }
    return [rest, ''];
  }
  function parseEvent(str) {
    str = str.trim().replace(/^[•*·]\s*/, '').replace(/^[-–]\s+/, '');
    var m = str.match(TIME_RE), time = '', rest = str;
    if (m) { time = fmtT(m[1] || m[2], m[3]); rest = m[4] || ''; }
    else { var e = str.match(TIME_END); if (e) { time = fmtT(e[2], e[3]); rest = e[1]; } }
    rest = rest.replace(/^[\s:–\-|,.]+/, '').replace(/[\s,–-]+$/, '').trim();
    if (!rest && !time) return null;
    var sp = splitPlace(rest);
    return { time: time, title: sp[0], place: sp[1] };
  }
  function matchDay(line) {
    var m = line.match(FULL_RE) || line.match(ABBR_RE);
    if (!m) return null;
    var name = DAYS[m[1].toLowerCase()], rest = (m[2] || '').replace(/^[\s.,:–-]+/, ''), date = '';
    var dm = rest.match(DATE_RE);
    if (dm) {
      var after = rest.slice(dm[0].length).replace(/^[\s:–\-,]+/, '');
      if (!after || TIME_RE.test(after) || /[\/a-zæøå]/i.test(dm[1])) { date = dm[1].trim(); rest = after; }
    }
    return { name: name, date: date, rest: rest.trim() };
  }
  function parse(text) {
    var days = [], cur = null, week = null, inline = false;
    function getExtra() { var d = getDay('Ekstra', ''); d.extra = true; return d; }
    function getDay(name, date) {
      date = tidyDate(date || '');
      for (var i = 0; i < days.length; i++) {
        var x = days[i];
        if (x.name === name && (!date || !x.date || x.date === date)) { if (date && !x.date) x.date = date; return x; }
      }
      var base = keyOf(name), key = base, n = 2;
      while (days.some(function (y) { return y.key === key; })) key = base + '-' + (n++);
      var d = { key: key, base: base, name: name, date: date, events: [] }; days.push(d); return d;
    }
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim(); if (!line) return;
      var cells = raw.split(/\t|;/).map(function (c) { return c.trim(); });
      if (cells.length >= 3) {
        if (/^(dag|day|ukedag)$/i.test(cells[0])) return;
        var c = cells.slice(), dm = c[0] ? matchDay(c[0]) : null;
        if (dm) { cur = getDay(dm.name, dm.date); c.shift(); } else if (!c[0]) c.shift();
        if (c.length >= 2 && DATE_RE.test(c[0]) && TIME_ONLY.test(c[1])) { if (cur && !cur.date) cur.date = c[0]; c.shift(); }
        var tm = c[0] && c[0].match(TIME_ONLY), time = '';
        if (tm) { time = fmtT(tm[1], tm[2]); c.shift(); }
        var rest = c.filter(Boolean);
        if (!rest.length && !time) return;
        (cur || getExtra()).events.push({ time: time, title: rest[0] || '', place: rest.slice(1).join(', ') });
        return;
      }
      var wk = line.match(/^uke\s*(\d{1,2})\b/i);
      if (wk && !cur) { week = 'Uke ' + wk[1]; return; }
      var d = matchDay(line);
      if (EXTRA_RE.test(line)) { var ex = parseEvent(line.replace(EXTRA_RE, '')); if (ex) getExtra().events.push(ex); return; }
      if (d) { cur = getDay(d.name, d.date); inline = !!d.rest; if (d.rest) { var e0 = parseEvent(d.rest); if (e0) cur.events.push(e0); } return; }
      var dl = line.match(DATE_LINE);
      if (dl) {
        var nm = tidyDate(dl[1]); nm = nm.charAt(0).toUpperCase() + nm.slice(1);
        cur = getDay(nm, ''); inline = !!(dl[2] || '').trim();
        var e1 = parseEvent(dl[2] || ''); if (e1) cur.events.push(e1);
        return;
      }
      if (!cur || inline) { if (/:\s*$/.test(line)) return; var ev0 = parseEvent(line); if (ev0) getExtra().events.push(ev0); return; }
      var ev = parseEvent(line);
      if (ev) cur.events.push(ev);
    });
    return { week: week, days: days };
  }
  function serialize(daySlides) {
    return daySlides.map(function (s) {
      return (s.extra && !s.day ? 'Ekstra: ' : '') + [s.day, s.date, s.time, s.title].filter(Boolean).join(' ') + (s.place ? ' – ' + s.place : '');
    }).join('\n');
  }
  var store = (function () {
    var dbp;
    function db() { return dbp || (dbp = new Promise(function (res, rej) { var r = indexedDB.open('ukeloop', 1); r.onupgradeneeded = function () { r.result.createObjectStore('media'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; })); }
    function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('media', mode), rq = fn(t.objectStore('media')); t.oncomplete = function () { res(rq && rq.result); }; t.onerror = function () { rej(t.error); }; }); }); }
    return { put: function (k, v) { return tx('readwrite', function (s) { return s.put(v, k); }); }, get: function (k) { return tx('readonly', function (s) { return s.get(k); }); }, del: function (k) { return tx('readwrite', function (s) { return s.delete(k); }); } };
  })();
  /* tempo + downbeat from decoded audio: onset envelope -> autocorrelation -> comb refine */
  function detectBeat(buf) {
    var sr = buf.sampleRate, hop = Math.max(1, Math.round(sr / 100)), fps = sr / hop;
    var len = Math.min(buf.length, Math.floor(sr * 360)), n = Math.floor(len / hop);
    if (n < 400) return null;
    var c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    var a = 1 - Math.exp(-2 * Math.PI * 160 / sr), lp = 0, lo = new Float32Array(n), hi = new Float32Array(n), en = new Float32Array(n), f, j;
    for (f = 0; f < n; f++) {
      var el = 0, eh = 0, b = f * hop;
      for (j = 0; j < hop; j++) { var x = c1 ? (c0[b + j] + c1[b + j]) * 0.5 : c0[b + j]; lp += a * (x - lp); el += lp * lp; var h = x - lp; eh += h * h; }
      lo[f] = Math.log(1e-6 + el); hi[f] = Math.log(1e-6 + eh); en[f] = (el + eh) / hop;
    }
    var on = new Float32Array(n), kick = new Float32Array(n);
    for (f = 1; f < n; f++) { var dl = Math.max(0, lo[f] - lo[f - 1]), dh = Math.max(0, hi[f] - hi[f - 1]); kick[f] = dl; on[f] = dl + dh * 0.7; }
    var ps = new Float64Array(n + 1), o2 = new Float32Array(n), Wn = 8;
    for (f = 0; f < n; f++) ps[f + 1] = ps[f] + on[f];
    for (f = 0; f < n; f++) { var l0 = Math.max(0, f - Wn), l1 = Math.min(n, f + Wn + 1); o2[f] = Math.max(0, on[f] - (ps[l1] - ps[l0]) / (l1 - l0)); }
    var acSum = 0, acN = 0, rawBest = 0;
    var best = -1, bestL = 0, minL = Math.floor(fps * 60 / 180), maxL = Math.ceil(fps * 60 / 70);
    for (var L = minL; L <= maxL; L++) {
      var s = 0; for (f = 0; f + L < n; f++) s += o2[f] * o2[f + L];
      s /= (n - L); acSum += s; acN++;
      var bpm = 60 * fps / L, w = Math.exp(-0.5 * Math.pow(Math.log(bpm / 120) / Math.LN2 / 0.7, 2));
      if (s * w > best) { best = s * w; bestL = L; rawBest = s; }
    }
    if (!bestL || best <= 0) return null;
    function samp(t) { var i = Math.floor(t), fr = t - i; if (i < 0 || i + 1 >= n) return 0; return o2[i] * (1 - fr) + o2[i + 1] * fr; }
    var b0 = 60 * fps / bestL, bb = b0, bs = -1, bph = 0;
    for (var bt = b0 - 2.5; bt <= b0 + 2.5; bt += 0.05) {
      var P = 60 * fps / bt;
      for (var ph = 0; ph < P; ph += 1) {
        var s2 = 0, cnt = 0; for (var t = ph; t < n; t += P) { s2 += samp(t); cnt++; }
        s2 /= cnt || 1; if (s2 > bs) { bs = s2; bb = bt; bph = ph; }
      }
    }
    var PP = 60 * fps / bb, dsc = [0, 0, 0, 0], k = 0;
    for (var tt = bph; tt < n; tt += PP, k++) { var ii = Math.round(tt), v = 0; for (var d = -1; d <= 1; d++) v += kick[Math.max(0, Math.min(n - 1, ii + d))]; dsc[k % 4] += v; }
    var dj = 0; for (k = 1; k < 4; k++) if (dsc[k] > dsc[dj]) dj = k;
    var win = Math.round(fps / 2), m = Math.floor(n / win), env = [], i2;
    for (i2 = 0; i2 < m; i2++) { var q = 0; for (j = 0; j < win; j++) q += en[i2 * win + j]; env.push(Math.sqrt(q / win)); }
    var srt = env.slice().sort(function (x, y) { return x - y; }), top = srt[Math.floor(srt.length * 0.95)] || 1, bot = srt[Math.floor(srt.length * 0.1)] || 0;
    var sm = env.map(function (v, i) { var s3 = 0, c3 = 0; for (var d2 = -3; d2 <= 3; d2++) { var y = env[i + d2]; if (y != null) { s3 += y; c3++; } } return s3 / c3; });
    env = sm.map(function (v) { return Math.round(clamp((v - bot) / ((top - bot) || 1), 0, 1) * 100) / 100; });
    var clarity = acN ? rawBest / (acSum / acN) : 1, bpmR = Math.round(bb * 100) / 100;
    var kS = 0, oS = 0, om = 0, ov = 0, peaks = 0;
    for (f = 0; f < n; f++) { kS += kick[f]; oS += on[f]; om += o2[f]; }
    om /= n; for (f = 0; f < n; f++) ov += (o2[f] - om) * (o2[f] - om); var osd = Math.sqrt(ov / n), thr = om + 1.5 * osd;
    for (f = 1; f < n - 1; f++) if (o2[f] > thr && o2[f] >= o2[f - 1] && o2[f] > o2[f + 1]) peaks++;
    var kickShare = oS ? kS / oS : 0, rate = peaks / (n / fps), em = 0, ev = 0;
    env.forEach(function (v) { em += v; }); em /= env.length || 1; env.forEach(function (v) { ev += (v - em) * (v - em); }); var dyn = Math.sqrt(ev / (env.length || 1));
    var g;
    if (clarity < 1.3 || bpmR < 80 || rate < 1.2) g = kickShare < 0.35 ? (bpmR >= 100 && rate >= 2 ? 'episk' : dyn > 0.22 ? 'piano' : 'rolig') : 'lovsang';
    else if (clarity < 1.6 && kickShare < 0.4) g = bpmR >= 100 ? (kickShare < 0.3 ? 'episk' : 'pop') : 'lovsang';
    else if (bpmR >= 118) g = clarity > 2.6 && kickShare > 0.5 ? 'elektronisk' : 'upbeat';
    else if (bpmR < 105 && kickShare > 0.45) g = 'groove';
    else g = 'pop';
    var calmG = g === 'rolig' || g === 'piano' || g === 'lovsang';
    return { bpm: bpmR, first: (bph + dj * PP) / fps, clarity: Math.round(clarity * 100) / 100, kick: Math.round(kickShare * 100) / 100, rate: Math.round(rate * 10) / 10, dyn: Math.round(dyn * 100) / 100, genre: g, style: calmG ? 'calm' : 'groove', env: env, envRate: fps / win };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toDataURL(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap';
  async function embeddedFontCSS(url) {
    try {
      url = url || FONT_CSS; if (url.indexOf('https://fonts.googleapis.com/') !== 0) return '';
      var css = await (await fetch(url)).text();
      var blocks = css.split(/(?=\/\*)/).filter(function (b) { return /^\/\*\s*latin(-ext)?\s*\*\//.test(b); });
      var out = '';
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i], m = b.match(/url\(([^)]+)\)/);
        if (m) { var fu = m[1].replace(/['"]/g, ''); if (fu.indexOf('https://fonts.gstatic.com/') !== 0) continue; var data = await toDataURL(await (await fetch(fu)).blob()); b = b.replace(m[0], 'url(' + data + ')'); }
        out += b;
      }
      return out;
    } catch (e) { return ''; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function buildPlayerHTML(p, fontCSS) {
    var json = JSON.stringify(p).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return '<!doctype html>\n<html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src data:"><meta name="referrer" content="no-referrer"><title>' + esc(p.title || 'Ukeprogram') +
      '</title><style>' + (fontCSS || '') + 'html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}</style></head><body><canvas id="c"></canvas><script>\nvar P=' + json +
      ';\nvar R=(' + __ukeloopRendererFactory.toString() + ')();\n' + __ukeloopAudioCtl.toString() + '\n(' + __ukeloopPlayerBoot.toString() + ')(P,R);\n<\/script></body></html>';
  }
  var SAMPLE = [
    'Tirsdag kl 19:00 Kveldsmat i kafeen',
    'Torsdag kl 11:00 Bønn',
    'Fredag kl 19:00 Ungdomsmøte',
    'Søndag kl 11:00 Søndagsmøte'
  ].join('\n');
  window.UkeLoop = { renderer: __ukeloopRendererFactory(), audioCtl: __ukeloopAudioCtl, parse: parse, serialize: serialize, keyOf: keyOf, store: store, toDataURL: toDataURL, detectBeat: detectBeat, embeddedFontCSS: embeddedFontCSS, buildPlayerHTML: buildPlayerHTML, SAMPLE: SAMPLE, FONT_CSS: FONT_CSS };
})();
