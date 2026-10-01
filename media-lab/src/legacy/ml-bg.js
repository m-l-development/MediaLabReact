/* Media Lab – shared background for the tool pages.
   Menus (start and category screens): animated line field in the same palette as the front page, but a different, calmer motion.
   Workspaces: add data-ml-bg="static" to any element that is shown while working, and the background switches to a fixed, even, dark tone.
   Follows theme.js light/dark. The page root must have background:transparent. */
(function () {
  if (window.MLBg) return;
  var root, anim, flat, canvas, g1, g2, starEls = [], raf = 0, last = -1, t0 = 0, isStatic = false;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* svake enheter (få kjerner/lite minne, «spar data»): færre bilder i sekundet og litt lavere oppløsning – bevegelsen er rolig */
  var nav = navigator, low = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4 || !!(nav.connection && nav.connection.saveData);
  var STEP = low ? 80 : 50, DPR = low ? 1.5 : 2;
  var stars = [[82, 12, 3, 10, 3, 0.5], [12, 34, 2, 8, 2, 0.45], [46, 8, 2, 8, 2, 0.4], [93, 48, 2, 8, 2, 0.4]];
  function light() { return !!(window.MLTheme && window.MLTheme.mode === 'light'); }
  function el(css) { var d = document.createElement('div'); d.style.cssText = css; return d; }
  function paint() {
    var lt = light();
    flat.style.background = lt ? 'radial-gradient(120% 90% at 50% 0%, #ebe8e2 0%, #e4e1da 55%, #dcd8d0 100%)' : 'radial-gradient(120% 90% at 50% 0%, #121213 0%, #0a0a0b 55%, #060606 100%)';
    g1.style.background = 'radial-gradient(closest-side, rgba(255,255,255,' + (lt ? 0.28 : 0.12) + '), rgba(255,255,255,' + (lt ? 0.08 : 0.035) + ') 55%, rgba(255,255,255,0) 100%)';
    g2.style.background = lt ? 'radial-gradient(closest-side, rgba(196,188,172,0.22), rgba(196,188,172,0) 100%)' : 'radial-gradient(closest-side, rgba(170,180,200,0.12), rgba(170,180,200,0) 100%)';
    starEls.forEach(function (s) { s.style.opacity = lt ? '0' : '1'; });
    draw((performance.now() - t0) / 1000);
  }
  function draw(t) {
    var c = canvas; if (!c || isStatic) return;
    var d = Math.min(DPR, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight; if (!W || !H) return;
    if (c.width !== Math.round(W * d) || c.height !== Math.round(H * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d); }
    var g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    var lt = light(), ink = lt ? '60,54,44' : '255,255,255', ka = lt ? 0.75 : 1, N = 22, step = Math.max(6, W / 160);
    g.lineWidth = 1;
    for (var j = 0; j < N; j++) {
      var f = j / (N - 1), base = H * (0.18 + 0.8 * Math.pow(f, 1.25)), amp = H * (0.03 + 0.07 * f), ph = j * 0.42;
      g.strokeStyle = 'rgba(' + ink + ',' + ((0.03 + 0.13 * f) * ka).toFixed(3) + ')';
      g.beginPath();
      for (var x = -step; x <= W + step; x += step) {
        var u = x / W, y = base + amp * (Math.sin(u * 5.2 + ph + t * 0.16) * 0.65 + Math.sin(u * 11.3 - ph * 0.7 - t * 0.11) * 0.35);
        if (x < 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    var fade = g.createLinearGradient(0, 0, 0, H * 0.5); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, W, H * 0.5); g.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    raf = 0; if (document.hidden || still || isStatic) return;
    raf = requestAnimationFrame(tick);
    if (now - last < STEP) return; last = now; draw((now - t0) / 1000);
  }
  function start() { if (!raf && !still && !isStatic && !document.hidden) raf = requestAnimationFrame(tick); }
  function setStatic(v) {
    v = !!v; if (v === isStatic) return; isStatic = v;
    anim.style.opacity = v ? '0' : '1'; flat.style.opacity = v ? '1' : '0';
    if (v) { cancelAnimationFrame(raf); raf = 0; } else { draw((performance.now() - t0) / 1000); start(); }
  }
  var chk = 0;
  function check() { if (chk) return; chk = requestAnimationFrame(function () { chk = 0; setStatic(!!document.querySelector('[data-ml-bg="static"]')); }); }
  function mount() {
    if (root || !document.body) return;
    root = el('position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none;');
    root.setAttribute('data-keep-color', '1'); root.setAttribute('aria-hidden', 'true');
    anim = el('position:absolute; inset:0; transition:opacity .5s ease;');
    flat = el('position:absolute; inset:0; opacity:0; transition:opacity .5s ease;');
    g1 = el('position:absolute; left:-14vw; top:-18vw; width:62vw; height:44vw; max-width:1000px; max-height:700px; transform:rotate(14deg); border-radius:50%; filter:blur(50px);');
    g2 = el('position:absolute; right:-16vw; bottom:-18vw; width:54vw; height:54vw; border-radius:50%; filter:blur(40px);');
    anim.appendChild(g1); anim.appendChild(g2);
    canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute; left:0; right:0; bottom:0; width:100%; height:48vh; display:block;'; anim.appendChild(canvas);
    stars.forEach(function (s) { var d = el('position:absolute; left:' + s[0] + '%; top:' + s[1] + '%; width:' + s[2] + 'px; height:' + s[2] + 'px; border-radius:50%; background:#fff; transition:opacity .3s; box-shadow:0 0 ' + s[3] + 'px ' + s[4] + 'px rgba(255,255,255,' + s[5] + ');'); starEls.push(d); anim.appendChild(d); });
    root.appendChild(anim); root.appendChild(flat);
    document.body.insertBefore(root, document.body.firstChild);
    var st = document.createElement('style'); st.textContent = 'html{background:#000}html[data-ml-mode="light"]{background:#e4e1da}body{background:transparent !important}'; document.head.appendChild(st);
    t0 = performance.now(); paint(); start(); check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ml-bg'] });
    window.addEventListener('medialab-theme', paint);
    window.addEventListener('resize', function () { draw((performance.now() - t0) / 1000); });
    document.addEventListener('visibilitychange', start);
  }
  window.MLBg = { redraw: function () { draw((performance.now() - t0) / 1000); } };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
