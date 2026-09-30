/* Konvertert fra den gamle dc-siden isolate-subject.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
import { onUpdate } from '../../shared/ml-update.js';
class Component extends DCLogic {
  state = { phase: 'empty', mode: null, busy: '', pct: 0, soft: 1, tight: 2, crop: false, fillMode: 'fill', bgType: 'none', bg: '#ffffff', bgHex: '#1d3557', cmp: 0, err: '', note: '', name: '', dims: '', drag: false, ready: false, pts: [], ptLabel: 0, view: 'mark', histN: 0, done: false, adv: false };
  viewRef = React.createRef(); fileRef = React.createRef();
  pipes = {}; hist = []; _tok = 0;
  COLORS = [['#ffffff', 'Hvit'], ['#000000', 'Svart'], ['#e4e1da', 'Lys grå'], ['#1d3557', 'Marineblå'], ['#2a9d8f', 'Grønnblå'], ['#e9c46a', 'Gul'], ['#e76f51', 'Korall'], ['#9b2c4a', 'Vinrød']];
  MODELS = { fine: 'onnx-community/BiRefNet_lite-ONNX', fast: 'Xenova/modnet' };
  SAM_ID = 'Xenova/slimsam-77-uniform';
  KINDS = {
    person: { label: 'Person', desc: 'Portretter og folk', note: 'MODNet (Apache 2.0). Laget for personer.' },
    object: { label: 'Objekt', desc: 'Produkter, dyr og ting', note: 'BiRefNet (MIT). Best på detaljer og ting.' },
    logo: { label: 'Logo', desc: 'På ensfarget bakgrunn', note: 'Fjerner bakgrunnsfargen. Ingen AI-modell trengs.' },
    text: { label: 'Tekst', desc: 'På ensfarget bakgrunn', note: 'Fjerner bakgrunnsfargen, også inni bokstavene.' }
  };
  componentDidMount() {
    onUpdate({ note: () => this.state.phase !== 'empty' });
    this.alive = true;
    this.onPaste = e => { const it = Array.from((e.clipboardData && e.clipboardData.items) || []).find(i => i.type && i.type.indexOf('image/') === 0); if (it) { e.preventDefault(); this.load(it.getAsFile()); } };
    window.addEventListener('paste', this.onPaste);
    const _ws = (fn, n = 0) => { if (window.MLShare) fn(); else if (n < 120) setTimeout(() => _ws(fn, n + 1), 50); }; _ws(() => { this._unr = window.MLShare.receive((b, n) => this.load(this.toFile(b, n)), { accept: ['image'], paste: false }); });
  }
  toFile = (b, n) => new File([b], n || 'bilde.png', { type: b.type });
  pickShared = () => { if (window.MLShare) window.MLShare.pick((b, n) => this.load(this.toFile(b, n)), { accept: ['image'] }); };
  outBlob() { return new Promise(r => { const cv = this.alpha ? this.out : this.src; if (!cv) return r(null); cv.toBlob(r, 'image/png'); }); }
  copyOut = async () => { const b = await this.outBlob(); if (!b || !window.MLShare) return; window.MLShare.toast(await window.MLShare.copy(b) ? 'Bildet er kopiert. Lim inn med Ctrl+V.' : 'Nettleseren tillot ikke kopiering.'); };
  sendOut = async () => { const b = await this.outBlob(); if (b && window.MLShare) window.MLShare.send(b, (this.state.name || 'bilde') + '-isolert.png', 'isolate'); };
  componentWillUnmount() { this.alive = false; window.removeEventListener('paste', this.onPaste); cancelAnimationFrame(this._raf); }
  cropRef = React.createRef();
  startWork(src) {
    this._tok++; this.src = src; this.base = src; this._sd = null; this.pend = null; this.alpha = null; this.out = null; this._mk = null; this._emb = null; this.hist = []; this._drag = null;
    this.setState({ phase: 'work', mode: null, pts: [], busy: '', err: '', note: '', dims: src.width + ' × ' + src.height, cmp: 0, ready: false, done: false, histN: 0 });
  }
  cropOk = () => {
    const o = this.orig, c = this.state.cr; if (!o) return;
    const W = o.width, H = o.height, x = Math.round(c.x * W), y = Math.round(c.y * H), w = Math.max(1, Math.min(W - x, Math.round(c.w * W))), h = Math.max(1, Math.min(H - y, Math.round(c.h * H)));
    if (x === 0 && y === 0 && w === W && h === H) return this.startWork(o);
    const s = document.createElement('canvas'); s.width = w; s.height = h; s.getContext('2d').drawImage(o, x, y, w, h, 0, 0, w, h);
    this.startWork(s);
  };
  cropSkip = () => { if (this.orig) { this.setState({ cr: { x: 0, y: 0, w: 1, h: 1 }, ar: 'free' }); this.startWork(this.orig); } };
  recrop = () => { if (this.state.busy || !this.orig) return; this._tok++; this.src = null; this.pend = null; this.alpha = null; this.hist = []; this.setState({ phase: 'crop', mode: null, pts: [], ready: false, histN: 0, err: '', note: '' }); };
  cropRn(ar) { const o = this.orig; if (ar === 'free' || !o) return 0; return (ar === 'orig' ? o.width / o.height : ar) * o.height / o.width; }
  setAspect(ar) {
    const rn = this.cropRn(ar); if (!rn) return this.setState({ ar });
    let w = 1, h = 1 / rn; if (h > 1) { h = 1; w = rn; }
    this.setState({ ar, cr: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } });
  }
  cropDown = e => {
    if (e.button > 0) return;
    const r = e.currentTarget.getBoundingClientRect(), t = e.target.closest ? e.target.closest('[data-h]') : null;
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    this._cd = { k: t ? t.getAttribute('data-h') : 'new', r, fx, fy, c0: Object.assign({}, this.state.cr), prev: this.state.cr };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  cropMove = e => {
    const d = this._cd; if (!d) return;
    const px = Math.min(1, Math.max(0, (e.clientX - d.r.left) / d.r.width)), py = Math.min(1, Math.max(0, (e.clientY - d.r.top) / d.r.height)), c0 = d.c0;
    if (d.k === 'move') return this.setState({ cr: { x: Math.min(1 - c0.w, Math.max(0, c0.x + px - d.fx)), y: Math.min(1 - c0.h, Math.max(0, c0.y + py - d.fy)), w: c0.w, h: c0.h } });
    const ax = d.k === 'new' ? d.fx : d.k === 'nw' || d.k === 'sw' ? c0.x + c0.w : c0.x, ay = d.k === 'new' ? d.fy : d.k === 'nw' || d.k === 'ne' ? c0.y + c0.h : c0.y;
    const sx = px >= ax ? 1 : -1, sy = py >= ay ? 1 : -1, rn = this.cropRn(this.state.ar);
    let w = Math.abs(px - ax), h = Math.abs(py - ay);
    if (rn) {
      if (w / Math.max(h, 1e-6) > rn) w = h * rn; else h = w / rn;
      const wx = sx > 0 ? 1 - ax : ax, hy = sy > 0 ? 1 - ay : ay;
      if (w > wx) { w = wx; h = w / rn; } if (h > hy) { h = hy; w = h * rn; }
    }
    this.setState({ cr: { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h } });
  };
  cropUp = () => {
    const d = this._cd; this._cd = null; if (!d) return;
    const c = this.state.cr; if (c.w < 0.02 || c.h < 0.02) this.setState({ cr: d.prev });
  };
  drawCrop() {
    const c = this.cropRef.current, o = this.orig; if (!c || !o || c._src === o) return;
    c.width = o.width; c.height = o.height; c.getContext('2d').drawImage(o, 0, 0); c._src = o;
  }
  componentDidUpdate() { this.sched(); if (this.state.phase === 'crop') this.drawCrop(); }
  okImg(f) { return !!f && /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.type || '') && f.size <= 40 * 1024 * 1024; }
  async load(f) {
    if (!this.okImg(f)) { this.setState({ err: 'Velg et bilde (JPG, PNG eller WebP, maks 40 MB).' }); return; }
    let bmp; try { bmp = await createImageBitmap(f); } catch (e) { this.setState({ err: 'Klarte ikke å lese bildet. Prøv JPG eller PNG.' }); return; }
    const MAX = 8192, k = Math.min(1, MAX / Math.max(bmp.width, bmp.height)), W = Math.max(1, Math.round(bmp.width * k)), H = Math.max(1, Math.round(bmp.height * k));
    const src = document.createElement('canvas'); src.width = W; src.height = H; src.getContext('2d').drawImage(bmp, 0, 0, W, H); if (bmp.close) bmp.close();
    this._tok = (this._tok || 0) + 1;
    this.orig = src; this.src = null; this.pend = null; this.alpha = null; this.out = null; this._mk = null; this._emb = null; this.hist = []; this._drag = null;
    const name = String(f.name || 'bilde').replace(/\.[^.]+$/, '').replace(/[^\wæøåÆØÅ .-]+/g, '').trim().slice(0, 60) || 'bilde';
    this.setState({ phase: 'crop', cr: { x: 0, y: 0, w: 1, h: 1 }, ar: 'free', mode: null, pts: [], busy: '', err: '', note: '', name, dims: W + ' × ' + H, cmp: 0, ready: false, done: false, histN: 0 });
  }
  lib() {
    return this.T || (this.T = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1').then(T => { T.env.allowLocalModels = false; return T; }));
  }
  progress() {
    const files = {};
    return p => {
      if (!p || p.status !== 'progress' || !p.total) return;
      files[p.file] = [p.loaded || 0, p.total];
      const v = Object.values(files), pct = Math.min(100, Math.round(100 * v.reduce((s, x) => s + x[0], 0) / Math.max(1, v.reduce((s, x) => s + x[1], 0))));
      if (pct !== this._lp && this.alive) { this._lp = pct; this.setState({ pct }); }
    };
  }
  async getPipe(key, onProg, wasmOnly) {
    if (this.pipes[key] && !(wasmOnly && this.pipes[key]._dev !== 'wasm')) return this.pipes[key];
    const T = await this.lib();
    let gpu = false; if (!wasmOnly && navigator.gpu) { try { gpu = !!(await navigator.gpu.requestAdapter()); } catch (e) {} }
    const tries = gpu ? [['webgpu', key === 'fine' ? 'fp16' : 'fp32'], ['wasm', 'fp32']] : [['wasm', 'fp32']];
    let err = null;
    for (const [device, dtype] of tries) {
      try { const p = await T.pipeline('background-removal', this.MODELS[key], { device, dtype, progress_callback: onProg }); p._dev = device; p._dtype = dtype; return (this.pipes[key] = p); } catch (e) { err = e; }
    }
    throw err || new Error('pipeline');
  }
  async infer(pipe, url) {
    const out = await pipe(url), img = Array.isArray(out) ? out[0] : out;
    const c = img.toCanvas(), W = this.src.width, H = this.src.height;
    const t = document.createElement('canvas'); t.width = W; t.height = H; const g = t.getContext('2d'); g.drawImage(c, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data, a = new Uint8ClampedArray(W * H), ch = img.channels === 4 ? 3 : 0;
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + ch];
    return a;
  }
  degenerate(a) { let n = 0; for (let i = 0; i < a.length; i += 7) if (a[i] > 128) n++; const f = n / Math.ceil(a.length / 7); return f < 0.002 || f > 0.998; }
  setAlpha(a, note) { this.alpha = a; this._mk = null; this.setState({ busy: '', ready: true, err: '', note: note || '' }); }
  choose(kind) {
    if (!this.src) return;
    this.snap(); this.pend = null;
    const tok = (this._tok = (this._tok || 0) + 1);
    this.alpha = null; this._mk = null;
    this.setState({ mode: kind, pts: [], ready: false, err: '', note: '', cmp: 0 }, () => {
      if (kind === 'logo' || kind === 'text') {
        const a = this.colorKey();
        if (a) { this.setAlpha(a); return; }
        this.runModel('fine', tok, 'Bakgrunnen er ikke ensfarget, så AI-modellen ble brukt i stedet.');
      } else this.runModel(kind === 'person' ? 'fast' : 'fine', tok, '');
    });
  }
  colorKey() {
    const W = this.src.width, H = this.src.height, d = this.src.getContext('2d').getImageData(0, 0, W, H).data;
    const R = [], G = [], B = [], step = Math.max(1, Math.round((W + H) / 800));
    const add = i => { if (d[i + 3] < 8) return; R.push(d[i]); G.push(d[i + 1]); B.push(d[i + 2]); };
    for (let x = 0; x < W; x += step) { add(x * 4); add(((H - 1) * W + x) * 4); }
    for (let y = 0; y < H; y += step) { add(y * W * 4); add((y * W + W - 1) * 4); }
    if (R.length < 8) return null;
    const med = v => { v.sort((a, b) => a - b); return v[v.length >> 1]; }, r = med(R.slice()), g = med(G.slice()), b = med(B.slice());
    let near = 0; for (let i = 0; i < R.length; i++) { const dr = R[i] - r, dg = G[i] - g, db = B[i] - b; if (dr * dr + dg * dg + db * db < 1600) near++; }
    if (near / R.length < 0.7) return null;
    const a = new Uint8ClampedArray(W * H), t0 = 22, t1 = 90;
    for (let i = 0, p = 0; i < a.length; i++, p += 4) {
      const dr = d[p] - r, dg = d[p + 1] - g, db = d[p + 2] - b, dist = Math.sqrt(dr * dr + dg * dg + db * db);
      a[i] = d[p + 3] < 8 ? 0 : dist <= t0 ? 0 : dist >= t1 ? d[p + 3] : Math.round((dist - t0) * d[p + 3] / (t1 - t0));
    }
    return a;
  }
  async runModel(key, tok, note) {
    const onProg = this.progress();
    this.setState({ busy: this.pipes[key] ? 'run' : 'model', pct: 0 });
    let url = null;
    try {
      let pipe = await this.getPipe(key, onProg, false);
      if (tok !== this._tok || !this.alive) return;
      this.setState({ busy: 'run' });
      const blob = await new Promise(r => this.src.toBlob(r, 'image/png'));
      url = URL.createObjectURL(blob);
      let a = null;
      try { a = await this.infer(pipe, url); if (pipe._dtype === 'fp16' && this.degenerate(a)) a = null; } catch (e) { if (pipe._dev === 'wasm') throw e; }
      if (!a) { this.setState({ busy: 'model', pct: 0 }); pipe = await this.getPipe(key, onProg, true); if (tok !== this._tok) return; this.setState({ busy: 'run' }); a = await this.infer(pipe, url); }
      if (tok !== this._tok || !this.alive) return;
      this.setAlpha(a, note);
    } catch (e) {
      if (tok === this._tok && this.alive) this.setState({ busy: '', err: navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å fjerne bakgrunnen. Prøv «Trykk i bildet», eller en nyere nettleser.' });
    } finally { if (url) URL.revokeObjectURL(url); }
  }
  async getSam(onProg) {
    if (this.sam) return this.sam;
    const T = await this.lib();
    const [model, proc] = await Promise.all([T.SamModel.from_pretrained(this.SAM_ID, { progress_callback: onProg }), T.AutoProcessor.from_pretrained(this.SAM_ID, { progress_callback: onProg })]);
    return (this.sam = { model, proc });
  }
  snap() { const S = this.state; this.hist = this.hist.concat([{ src: this.src, alpha: this.alpha, pend: this.pend, pts: S.pts, mode: S.mode, ready: S.ready, note: S.note, ptLabel: S.ptLabel }]).slice(-20); this.setState({ histN: this.hist.length }); }
  undo = () => {
    if (this.state.busy || !this.hist.length) return;
    const h = this.hist[this.hist.length - 1]; this.hist = this.hist.slice(0, -1);
    this._tok++; if (h.src && h.src !== this.src) { this.src = h.src; this._emb = null; } this.alpha = h.alpha; this.pend = h.pend || null; this._mk = null; this._drag = null;
    this.setState({ histN: this.hist.length, pts: h.pts, mode: h.mode, ready: h.ready, note: h.note, ptLabel: h.ptLabel, err: '', cmp: 0 });
  };
  restore = () => {
    const S = this.state; if (!this.src || (!this.alpha && !this.pend && !S.pts.length && !S.mode && this.src === this.base)) return;
    this.snap(); this._tok++; if (this.base && this.src !== this.base) { this.src = this.base; this._emb = null; } this.alpha = null; this.pend = null; this._mk = null; this._drag = null;
    this.setState({ mode: null, pts: [], ready: false, note: '', err: '', cmp: 0, busy: '' });
  };
  toImg(e) {
    const view = this.viewRef.current, v = this._vw; if (!view || !v || !this.src) return null;
    const r = view.getBoundingClientRect(); if (!r.width || !r.height) return null;
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, W = this.src.width, H = this.src.height, cl = n => Math.min(1, Math.max(0, n));
    return { x: cl((v.ox + fx * v.cw) / W), y: cl((v.oy + fy * v.ch) / H), sx: e.clientX, sy: e.clientY, inside: fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 };
  }
  onDown = e => {
    if (!this.src || this.state.busy || e.button > 2) return;
    const p = this.toImg(e); if (!p || !p.inside) return;
    const S = this.state, cur = S.mode === 'point' ? S.ptLabel : 0;
    this._drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, sx: p.sx, sy: p.sy, l: e.button === 2 ? 1 - cur : cur, rc: e.button === 2, big: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  onMove = e => {
    const d = this._drag; if (!d) return; const p = this.toImg(e); if (!p) return;
    d.x1 = p.x; d.y1 = p.y; if (Math.hypot(p.sx - d.sx, p.sy - d.sy) > 8) d.big = true; if (d.big) this.sched();
  };
  onUp = () => {
    const d = this._drag; this._drag = null; if (!d) return;
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    if (d.big && x1 - x0 > 0.003 && y1 - y0 > 0.003) { const m = { box: true, x0, y0, x1, y1, l: d.l }; m.km = this.keyBox(m); return this.addMark(m); }
    const S = this.state, W = this.src.width, H = this.src.height, v = this._vw, rr = Math.max(5, Math.max(v.cw, v.ch) / 110) * 1.8;
    if (S.mode === 'point') {
      const px = Math.floor(d.x0 * W), py = Math.floor(d.y0 * H);
      for (let i = S.pts.length - 1; i >= 0; i--) {
        const p = S.pts[i], k = p.km;
        const hit = k ? (px >= k.X0 && px < k.X0 + k.w && py >= k.Y0 && py < k.Y0 + k.h && k.a[(py - k.Y0) * k.w + (px - k.X0)] > 127)
          : p.box ? (d.x0 >= p.x0 && d.x0 <= p.x1 && d.y0 >= p.y0 && d.y0 <= p.y1) : Math.hypot((p.x - d.x0) * W, (p.y - d.y0) * H) <= rr;
        if (hit) { this.snap(); const pts = S.pts.filter((_, j) => j !== i); this.rebuild(pts); this.setState({ pts, err: '' }); this.sched(); return; }
      }
    }
    this.addMark({ x: d.x0, y: d.y0, l: d.l });
  };
  onCancel = () => { this._drag = null; this.sched(); };
  addMark(m) {
    const S = this.state, into = S.mode === 'point', pts = (into ? S.pts : []).concat([m]);
    this.snap(); this.rebuild(pts);
    this.setState({ mode: 'point', pts, ptLabel: into ? S.ptLabel : 0, err: '', note: into ? S.note : '' });
    this.sched();
  }
  srcData() {
    if (this._sd && this._sd.src === this.src) return this._sd.d;
    const W = this.src.width, H = this.src.height, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(this.src, 0, 0);
    this._sd = { src: this.src, d: g.getImageData(0, 0, W, H).data }; return this._sd.d;
  }
  keyBox(m) {
    const W = this.src.width, H = this.src.height, bx0 = Math.max(0, Math.floor(m.x0 * W)), bx1 = Math.min(W, Math.ceil(m.x1 * W)), by0 = Math.max(0, Math.floor(m.y0 * H)), by1 = Math.min(H, Math.ceil(m.y1 * H));
    if (bx1 - bx0 < 4 || by1 - by0 < 4) return null;
    const pd = Math.max(8, Math.round(Math.max(bx1 - bx0, by1 - by0) * 0.08));
    const X0 = Math.max(0, bx0 - pd), X1 = Math.min(W, bx1 + pd), Y0 = Math.max(0, by0 - pd), Y1 = Math.min(H, by1 + pd), w = X1 - X0, h = Y1 - Y0;
    const k = Math.min(1, 520 / Math.max(w, h)), sw = Math.max(4, Math.round(w * k)), sh = Math.max(4, Math.round(h * k));
    const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh;
    const sg = sc.getContext('2d', { willReadFrequently: true }); sg.imageSmoothingQuality = 'high';
    sg.filter = 'blur(' + Math.max(0.6, Math.min(2, Math.max(sw, sh) / 320)) + 'px)'; sg.drawImage(this.src, X0, Y0, w, h, 0, 0, sw, sh); sg.filter = 'none';
    const d = sg.getImageData(0, 0, sw, sh).data, N = sw * sh, dist = (i, c) => { const r = d[i * 4] - c[0], g = d[i * 4 + 1] - c[1], b = d[i * 4 + 2] - c[2], rm = (d[i * 4] + c[0]) / 2; return Math.sqrt((2 + rm / 256) * r * r + 4 * g * g + (2 + (255 - rm) / 256) * b * b) / 3; };
    const edge = []; for (let x = 0; x < sw; x++) { edge.push(x, (sh - 1) * sw + x); } for (let y = 1; y < sh - 1; y++) { edge.push(y * sw, y * sw + sw - 1); }
    const smp = edge.filter((_, i) => i % Math.max(1, Math.floor(edge.length / 700)) === 0);
    let C = []; const KC = Math.min(6, smp.length);
    for (let q = 0; q < KC; q++) { const i = smp[Math.floor((q + 0.5) * smp.length / KC)]; C.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]); }
    const nearD = i => { let bd = 1e9, b = 0; for (let q = 0; q < C.length; q++) { const e = dist(i, C[q]); if (e < bd) { bd = e; b = q; } } return [b, bd]; };
    for (let it = 0; it < 8; it++) { const acc = C.map(() => [0, 0, 0, 0]); smp.forEach(i => { const a = acc[nearD(i)[0]]; a[0] += d[i * 4]; a[1] += d[i * 4 + 1]; a[2] += d[i * 4 + 2]; a[3]++; }); C = acc.filter(a => a[3] > 2).map(a => [a[0] / a[3], a[1] / a[3], a[2] / a[3]]); if (!C.length) return null; }
    const ed = smp.map(i => nearD(i)[1]).sort((a, b) => a - b), noise = ed[Math.floor(ed.length * 0.85)] || 0;
    const T = Math.max(22, noise * 1.5 + 8), D = new Float32Array(N);
    for (let i = 0; i < N; i++) D[i] = nearD(i)[1];
    const fg = new Uint8Array(N); for (let i = 0; i < N; i++) fg[i] = D[i] > T ? 1 : 0;
    const morph = (src, r, mx) => { const t = new Uint8Array(N), o = new Uint8Array(N);
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let v = mx ? 0 : 1; for (let j = Math.max(0, x - r); j <= Math.min(sw - 1, x + r); j++) { const s = src[y * sw + j]; if (mx ? s : !s) { v = mx ? 1 : 0; break; } } t[y * sw + x] = v; }
      for (let x = 0; x < sw; x++) for (let y = 0; y < sh; y++) { let v = mx ? 0 : 1; for (let j = Math.max(0, y - r); j <= Math.min(sh - 1, y + r); j++) { const s = t[j * sw + x]; if (mx ? s : !s) { v = mx ? 1 : 0; break; } } o[y * sw + x] = v; }
      return o; };
    const rc = Math.max(1, Math.round(Math.max(sw, sh) * 0.035));
    let fc = morph(morph(fg, rc, true), rc, false);
    const ix0 = Math.floor((bx0 - X0) * k), ix1 = Math.ceil((bx1 - X0) * k), iy0 = Math.floor((by0 - Y0) * k), iy1 = Math.ceil((by1 - Y0) * k);
    const inB = i => { const x = i % sw, y = (i / sw) | 0; return x >= ix0 && x < ix1 && y >= iy0 && y < iy1; };
    let boxN = 0; for (let i = 0; i < N; i++) { fg[i] = fc[i] && inB(i) ? 1 : 0; if (inB(i)) boxN++; }
    const bg = new Uint8Array(N), st = [];
    const seed = i => { if (!fg[i] && !bg[i]) { bg[i] = 1; st.push(i); } };
    for (const i of edge) seed(i);
    while (st.length) { const i = st.pop(), x = i % sw, y = (i / sw) | 0; if (x > 0) seed(i - 1); if (x < sw - 1) seed(i + 1); if (y > 0) seed(i - sw); if (y < sh - 1) seed(i + sw); }
    const lab = new Int32Array(N), sizes = [0]; let on = 0;
    for (let s = 0; s < N; s++) {
      if (bg[s] || lab[s]) continue;
      const id = sizes.length; let n = 0; const q = [s]; lab[s] = id;
      while (q.length) { const i = q.pop(); n++; const x = i % sw, y = (i / sw) | 0; const t = [x > 0 ? i - 1 : -1, x < sw - 1 ? i + 1 : -1, y > 0 ? i - sw : -1, y < sh - 1 ? i + sw : -1]; for (const j of t) if (j >= 0 && !bg[j] && !lab[j]) { lab[j] = id; q.push(j); } }
      sizes.push(n);
    }
    const big = Math.max(...sizes), minN = Math.max(12, N * 0.004, big * 0.03);
    const sm = new Uint8ClampedArray(N);
    let keep = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (lab[i] && sizes[lab[i]] >= minN) { keep[i] = 1; on++; }
    keep = morph(keep, Math.max(1, Math.round(2 * k + 0.5)), true);
    for (let i = 0; i < N; i++) if (keep[i] && inB(i)) sm[i] = 255;
    const f = on / Math.max(1, boxN); if (f < 0.003) return null;
    if (f > 0.985) { const bw = bx1 - bx0, bh = by1 - by0; return { X0: bx0, Y0: by0, w: bw, h: bh, a: new Uint8ClampedArray(bw * bh).fill(255) }; }
    const mc = document.createElement('canvas'); mc.width = sw; mc.height = sh; const mg = mc.getContext('2d'), id = mg.createImageData(sw, sh);
    for (let i = 0; i < N; i++) { id.data[i * 4 + 3] = sm[i]; }
    mg.putImageData(id, 0, 0);
    const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const og = oc.getContext('2d', { willReadFrequently: true });
    const pad = Math.max(1, Math.round(1 / k));
    og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high'; og.filter = 'blur(' + Math.min(3, pad * 0.6) + 'px)';
    og.drawImage(mc, 0, 0, w, h); og.filter = 'none';
    const od = og.getImageData(0, 0, w, h).data, a = new Uint8ClampedArray(w * h);
    for (let i = 0; i < a.length; i++) { const v = od[i * 4 + 3]; a[i] = v > 90 ? 255 : v < 12 ? 0 : Math.round((v - 12) / 78 * 255); }
    return { X0, Y0, w, h, a };
  }
  applyKm(P, k, keep) {
    const W = this.src.width;
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
      const i = (k.Y0 + y) * W + k.X0 + x, v = k.a[y * k.w + x];
      if (keep) { const c = 255 - v; if (c < P[i]) P[i] = c; } else if (v > P[i]) P[i] = v;
    }
  }
  rebuild(pts) {
    let P = null; const N = this.src.width * this.src.height;
    pts.forEach(m => { if (m.km && !m.l) this.applyKm(P || (P = new Uint8ClampedArray(N)), m.km, false); });
    if (P) pts.forEach(m => { if (m.km && m.l) this.applyKm(P, m.km, true); });
    this.pend = P && P.some(v => v > 127) ? P : null;
  }
  apply = () => {
    const S = this.state; if (!this.src || S.busy || S.mode !== 'point' || !S.pts.some(m => !m.l)) return;
    this.snap(); const tok = ++this._tok; this.runRemove(tok, S.pts.slice());
  };
  inpaint(r) {
    const S = this.src, W = S.width, H = S.height;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) if (r[i] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const mg = Math.max(24, Math.round(Math.max(x1 - x0, y1 - y0) * 0.15));
    const X0 = Math.max(0, x0 - mg), Y0 = Math.max(0, y0 - mg), X1 = Math.min(W, x1 + mg + 1), Y1 = Math.min(H, y1 + mg + 1), w = X1 - X0, h = Y1 - Y0, n = w * h;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(S, 0, 0);
    const id = g.getImageData(X0, Y0, w, h), d = id.data;
    let M = new Uint8Array(n); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) M[y * w + x] = r[(Y0 + y) * W + X0 + x] > 20 ? 2 : 0;
    const grow = Math.max(2, Math.round(Math.min(W, H) / 400));
    for (let p = 0; p < grow; p++) { const N2 = M.slice(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (M[i]) continue; if ((x > 0 && M[i - 1]) || (x < w - 1 && M[i + 1]) || (y > 0 && M[i - w]) || (y < h - 1 && M[i + w])) N2[i] = 1; } M = N2; }
    const lum = i => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    let hs = 0, hn = 0;
    const c = new Float32Array(n * 3), a = new Float32Array(n);
    for (let i = 0; i < n; i++) if (!M[i]) { a[i] = 1; c[i * 3] = d[i * 4]; c[i * 3 + 1] = d[i * 4 + 1]; c[i * 3 + 2] = d[i * 4 + 2]; if (i % w < w - 1 && !M[i + 1]) { hs += Math.abs(lum(i) - lum(i + 1)); hn++; } }
    const L = [{ w, h, c, a }];
    while (L[L.length - 1].w > 1 || L[L.length - 1].h > 1) {
      const p = L[L.length - 1], w2 = Math.ceil(p.w / 2), h2 = Math.ceil(p.h / 2), c2 = new Float32Array(w2 * h2 * 3), a2 = new Float32Array(w2 * h2);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const i = y * p.w + x, j = (y >> 1) * w2 + (x >> 1); a2[j] += p.a[i]; c2[j * 3] += p.c[i * 3]; c2[j * 3 + 1] += p.c[i * 3 + 1]; c2[j * 3 + 2] += p.c[i * 3 + 2]; }
      for (let j = 0; j < a2.length; j++) if (a2[j] > 1) { const s = 1 / a2[j]; c2[j * 3] *= s; c2[j * 3 + 1] *= s; c2[j * 3 + 2] *= s; a2[j] = 1; }
      L.push({ w: w2, h: h2, c: c2, a: a2 });
    }
    for (let l = L.length - 2; l >= 0; l--) {
      const p = L[l], q = L[l + 1], Q = (j, ch) => q.c[j * 3 + ch] / Math.max(q.a[j], 1e-6);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const i = y * p.w + x; if (p.a[i] >= 1) continue;
        const fx = Math.min(q.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), fy = Math.min(q.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const xa = fx | 0, ya = fy | 0, xb = Math.min(q.w - 1, xa + 1), yb = Math.min(q.h - 1, ya + 1), tx = fx - xa, ty = fy - ya, k = 1 - p.a[i];
        for (let ch = 0; ch < 3; ch++) {
          const v = (Q(ya * q.w + xa, ch) * (1 - tx) + Q(ya * q.w + xb, ch) * tx) * (1 - ty) + (Q(yb * q.w + xa, ch) * (1 - tx) + Q(yb * q.w + xb, ch) * tx) * ty;
          p.c[i * 3 + ch] += k * v;
        }
        p.a[i] = 1;
      }
    }
    const amp = Math.min(14, (hn ? hs / hn : 0) * 0.9);
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue;
      const t = M[i] === 2 ? 1 : 0.6, nz = (Math.random() * 2 - 1) * amp;
      for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.round(d[i * 4 + ch] * (1 - t) + (c[i * 3 + ch] + nz) * t);
    }
    g.putImageData(id, X0, Y0);
    return cv;
  }
  maxA(a, b) { const o = new Uint8ClampedArray(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] > b[i] ? a[i] : b[i]; return o; }
  async runRemove(tok, marks) {
    try {
      let r = this.pend ? new Uint8ClampedArray(this.pend) : null;
      const aiRed = marks.filter(m => !m.l && !m.km), aiGreen = marks.filter(m => m.l && m.box && !m.km);
      if (aiRed.length || (r && aiGreen.length)) {
        const onProg = this.progress();
        if (!this.sam) this.setState({ busy: 'model', pct: 0 });
        const { model, proc } = await this.getSam(onProg);
        if (tok !== this._tok || !this.alive) return;
        const T = await this.lib();
        if (!this._emb || this._emb.src !== this.src) {
          this.setState({ busy: 'analyze' });
          const W = this.src.width, H = this.src.height, k = Math.min(1, 1024 / Math.max(W, H));
          const sm = document.createElement('canvas'); sm.width = Math.max(1, Math.round(W * k)); sm.height = Math.max(1, Math.round(H * k));
          sm.getContext('2d').drawImage(this.src, 0, 0, sm.width, sm.height);
          const blob = await new Promise(res => sm.toBlob(res, 'image/png')), url = URL.createObjectURL(blob);
          let raw; try { raw = await T.RawImage.read(url); } finally { URL.revokeObjectURL(url); }
          const inputs = await proc(raw), emb = await model.get_image_embeddings(inputs);
          this._emb = { src: this.src, inputs, emb };
          if (tok !== this._tok || !this.alive) return;
        }
        this.setState({ busy: 'seg' });
        const neg = marks.filter(m => m.l && !m.box).map(m => ({ x: m.x, y: m.y, l: 0 }));
        for (const m of aiRed) {
          const k = await this.samMask(T, model, proc, m.box ? { box: m } : { pts: [{ x: m.x, y: m.y, l: 1 }] }, neg);
          if (tok !== this._tok || !this.alive) return;
          if (k) r = r ? this.maxA(r, k) : k;
        }
        for (const m of aiGreen) {
          if (!r) break;
          const k = await this.samMask(T, model, proc, { box: m }, []);
          if (tok !== this._tok || !this.alive) return;
          if (k) for (let i = 0; i < r.length; i++) { const c = 255 - k[i]; if (c < r[i]) r[i] = c; }
        }
        if (r) marks.forEach(m => { if (m.km && m.l) this.applyKm(r, m.km, true); });
      }
      if (!r || !r.some(v => v > 127)) { this.setState({ busy: '', err: 'Fant ikke noe objekt her. Prøv et annet sted.' }); return; }
      if (this.state.fillMode === 'fill') {
        this.setState({ busy: 'fill' }); await new Promise(res => setTimeout(res, 40));
        if (tok !== this._tok || !this.alive) return;
        const nc = this.inpaint(r); if (nc) { this.src = nc; this._emb = null; }
        this.pend = null; this._mk = null;
        this.setState({ busy: '', ready: true, pts: [], err: '', note: '' }); return;
      }
      const A = this.alpha, o = new Uint8ClampedArray(r.length);
      for (let i = 0; i < o.length; i++) { const b = A ? A[i] : 255, c = 255 - r[i]; o[i] = b < c ? b : c; }
      this.alpha = o; this.pend = null; this._mk = null;
      this.setState({ busy: '', ready: true, pts: [], err: '', note: '' });
    } catch (e) {
      if (tok === this._tok && this.alive) this.setState({ busy: '', err: navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å finne objektet. Prøv et annet sted.' });
    }
  }
  async samMask(T, model, proc, q, neg) {
    const { inputs, emb } = this._emb, rs = inputs.reshaped_input_sizes[0], b = q.box;
    let pts = q.pts ? q.pts.slice() : [], boxOk = false;
    if (b) {
      const ses = model.sessions && model.sessions.prompt_encoder_mask_decoder, names = (ses && ses.inputNames) || [];
      boxOk = names.indexOf('input_boxes') >= 0;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, dx = (b.x1 - b.x0) * 0.22, dy = (b.y1 - b.y0) * 0.22;
      pts = boxOk ? [{ x: cx, y: cy, l: 1 }] : [{ x: cx, y: cy, l: 1 }, { x: cx - dx, y: cy, l: 1 }, { x: cx + dx, y: cy, l: 1 }, { x: cx, y: cy - dy, l: 1 }, { x: cx, y: cy + dy, l: 1 }];
    }
    pts = pts.concat(neg);
    const feed = Object.assign({}, emb, {
      input_points: new T.Tensor('float32', Float32Array.from(pts.flatMap(p => [p.x * rs[1], p.y * rs[0]])), [1, 1, pts.length, 2]),
      input_labels: new T.Tensor('int64', BigInt64Array.from(pts.map(p => BigInt(p.l))), [1, 1, pts.length])
    });
    if (boxOk) feed.input_boxes = new T.Tensor('float32', Float32Array.from([b.x0 * rs[1], b.y0 * rs[0], b.x1 * rs[1], b.y1 * rs[0]]), [1, 1, 4]);
    const out = await model(feed);
    const masks = await proc.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
    const mk = T.RawImage.fromTensor(masks[0][0]), sc = out.iou_scores.data, n = mk.channels || 3;
    let best = 0; for (let i = 1; i < Math.min(n, sc.length); i++) if (sc[i] > sc[best]) best = i;
    const mw = mk.width, mh = mk.height, m = document.createElement('canvas'); m.width = mw; m.height = mh;
    const mg = m.getContext('2d'), id = mg.createImageData(mw, mh), dd = id.data, md = mk.data;
    let on = 0;
    for (let i = 0; i < mw * mh; i++) { const v = md[i * n + best] ? 255 : 0; dd[i * 4] = dd[i * 4 + 1] = dd[i * 4 + 2] = 255; dd[i * 4 + 3] = v; if (v) on++; }
    if (!on) return null;
    mg.putImageData(id, 0, 0);
    const W = this.src.width, H = this.src.height, f = document.createElement('canvas'); f.width = W; f.height = H;
    const fg = f.getContext('2d'); fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high'; fg.drawImage(m, 0, 0, W, H);
    const fd = fg.getImageData(0, 0, W, H).data, a = new Uint8ClampedArray(W * H);
    for (let i = 0; i < a.length; i++) a[i] = fd[i * 4 + 3];
    if (b) {
      const X0 = Math.floor(b.x0 * W), X1 = Math.ceil(b.x1 * W), Y0 = Math.floor(b.y0 * H), Y1 = Math.ceil(b.y1 * H);
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) if (x < X0 || x >= X1 || y < Y0 || y >= Y1) a[i] = 0;
    }
    return a;
  }
  sched() { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => this.compose()); }
  mask() {
    const S = this.state, A = this.alpha, W = this.src.width, H = this.src.height, key = S.tight + '|' + S.soft;
    if (this._ma === A && this._mk === key && this._m) return;
    const sc = Math.max(W, H) / 1000, N = W * H;
    if (this._ma !== A || this._erk !== S.tight) {
      const h = new Uint8ClampedArray(N);
      for (let i = 0; i < N; i++) { const v = A[i]; h[i] = v <= 24 ? 0 : v >= 232 ? 255 : (v - 24) * 255 / 208; }
      const r = Math.round(S.tight * sc);
      this._er = r > 0 ? this.sep(h, W, H, r, 'min') : h; this._erk = S.tight;
    }
    const e = this._er, fr = Math.round(S.soft * sc * 1.5);
    let fin = e;
    if (fr > 0) { const b = this.sep(this.sep(e, W, H, fr, 'blur'), W, H, fr, 'blur'); fin = new Uint8ClampedArray(N); for (let i = 0; i < N; i++) fin[i] = b[i] < e[i] ? b[i] : e[i]; }
    const m = this._m || (this._m = document.createElement('canvas')); m.width = W; m.height = H;
    const g = m.getContext('2d'), id = g.createImageData(W, H), d = id.data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const p = i * 4, v = fin[i]; d[p] = d[p + 1] = d[p + 2] = 255; d[p + 3] = v;
      if (v > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
    }
    g.putImageData(id, 0, 0);
    this._box = x1 >= 0 ? [x0, y0, x1, y1] : null; this._ma = A; this._mk = key;
  }
  sep(src, W, H, r, kind) {
    const tmp = new Uint8ClampedArray(W * H), out = new Uint8ClampedArray(W * H), q = new Int32Array(Math.max(W, H));
    const f = kind === 'min' ? this.minLine : this.blurLine;
    for (let y = 0; y < H; y++) f(src, tmp, y * W, 1, W, r, q);
    for (let x = 0; x < W; x++) f(tmp, out, x, W, H, r, q);
    return out;
  }
  minLine(inp, outp, base, step, len, r, q) {
    let h = 0, t = 0;
    for (let k = 0; k < len + r; k++) {
      if (k < len) { const v = inp[base + k * step]; while (t > h && inp[base + q[t - 1] * step] >= v) t--; q[t++] = k; }
      const c = k - r; if (c >= 0) { while (q[h] < c - r) h++; outp[base + c * step] = inp[base + q[h] * step]; }
    }
  }
  blurLine(inp, outp, base, step, len, r) {
    let s = 0, n = 0;
    for (let k = 0; k < Math.min(len, r + 1); k++) { s += inp[base + k * step]; n++; }
    for (let c = 0; c < len; c++) {
      outp[base + c * step] = s / n;
      const a = c + r + 1; if (a < len) { s += inp[base + a * step]; n++; }
      const b = c - r; if (b >= 0) { s -= inp[base + b * step]; n--; }
    }
  }
  compose() {
    const view = this.viewRef.current, src = this.src; if (!view || !src) return;
    const S = this.state, W = src.width, H = src.height, tint = S.mode === 'point' && !!this.pend;
    let ox = 0, oy = 0, cw = W, ch = H;
    if (this.alpha) {
      this.mask();
      const cut = this._c || (this._c = document.createElement('canvas')); cut.width = W; cut.height = H;
      const cg = cut.getContext('2d');
      cg.drawImage(src, 0, 0);
      cg.globalCompositeOperation = 'destination-in';
      cg.drawImage(this._m, 0, 0);
      cg.globalCompositeOperation = 'source-over';
      let bx = 0, by = 0, bw = W, bh = H;
      if (S.crop && this._box) {
        const [x0, y0, x1, y1] = this._box, pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
        bx = Math.max(0, x0 - pad); by = Math.max(0, y0 - pad); bw = Math.min(W, x1 + pad + 1) - bx; bh = Math.min(H, y1 + pad + 1) - by;
      }
      const out = this.out || (this.out = document.createElement('canvas')); out.width = bw; out.height = bh;
      const og = out.getContext('2d');
      og.clearRect(0, 0, bw, bh); if (S.bgType === 'color') { og.fillStyle = S.bg; og.fillRect(0, 0, bw, bh); } og.drawImage(cut, -bx, -by);
      if (!tint) { ox = bx; oy = by; cw = bw; ch = bh; }
    }
    this._vw = { ox, oy, cw, ch };
    view.width = cw; view.height = ch;
    const vg = view.getContext('2d'); vg.clearRect(0, 0, cw, ch);
    if (tint) {
      vg.drawImage(src, 0, 0);
      if (this._pa !== this.pend) {
        const pc = this._pc || (this._pc = document.createElement('canvas')); pc.width = W; pc.height = H;
        const pg = pc.getContext('2d'), id = pg.createImageData(W, H), dd = id.data, P = this.pend;
        for (let i = 0; i < P.length; i++) { dd[i * 4] = 255; dd[i * 4 + 1] = 77; dd[i * 4 + 2] = 77; dd[i * 4 + 3] = P[i]; }
        pg.putImageData(id, 0, 0); this._pa = this.pend;
      }
      const t = this._t || (this._t = document.createElement('canvas')); t.width = W; t.height = H;
      const tg = t.getContext('2d');
      tg.clearRect(0, 0, W, H); tg.fillStyle = 'rgba(61,220,132,0.45)'; tg.fillRect(0, 0, W, H); tg.drawImage(this._pc, 0, 0);
      if (this.alpha) { tg.globalCompositeOperation = 'destination-in'; tg.drawImage(this._m, 0, 0); tg.globalCompositeOperation = 'source-over'; }
      if (this.alpha && S.bgType !== 'color') { vg.clearRect(0, 0, W, H); vg.drawImage(this._c, 0, 0); }
      vg.globalAlpha = 0.55; vg.drawImage(t, 0, 0); vg.globalAlpha = 1;
    } else if (!this.alpha) vg.drawImage(src, 0, 0);
    else {
      vg.drawImage(this.out, 0, 0);
      if (S.cmp > 0) {
        const x = Math.round(cw * S.cmp / 100);
        vg.save(); vg.beginPath(); vg.rect(0, 0, x, ch); vg.clip(); vg.drawImage(src, -ox, -oy); vg.restore();
        vg.fillStyle = '#ffffff'; vg.fillRect(Math.max(0, x - Math.max(1, cw / 500)), 0, Math.max(2, cw / 250), ch);
      }
    }
    if (S.mode === 'point' || this._drag) {
      const r = Math.max(5, Math.max(cw, ch) / 110), col = l => l ? '#3ddc84' : '#ff5a5a', d = this._drag;
      const list = (S.mode === 'point' ? S.pts : []).concat(d && d.big ? [{ box: true, x0: Math.min(d.x0, d.x1), y0: Math.min(d.y0, d.y1), x1: Math.max(d.x0, d.x1), y1: Math.max(d.y0, d.y1), l: d.l }] : []);
      list.forEach(p => {
        if (p.box) {
          if (p.km) return;
          const x = p.x0 * W - ox, y = p.y0 * H - oy, w = (p.x1 - p.x0) * W, h = (p.y1 - p.y0) * H;
          vg.globalAlpha = 0.2; vg.fillStyle = col(p.l); vg.fillRect(x, y, w, h); vg.globalAlpha = 1;
          vg.lineWidth = r / 2.2; vg.setLineDash([r * 1.2, r * 0.8]); vg.strokeStyle = '#ffffff'; vg.strokeRect(x, y, w, h);
          vg.lineDashOffset = r; vg.strokeStyle = col(p.l); vg.strokeRect(x, y, w, h); vg.setLineDash([]); vg.lineDashOffset = 0;
        } else { vg.beginPath(); vg.arc(p.x * W - ox, p.y * H - oy, r, 0, Math.PI * 2); vg.fillStyle = col(p.l); vg.fill(); vg.lineWidth = r / 2.5; vg.strokeStyle = '#ffffff'; vg.stroke(); }
      });
    }
  }
  download = () => {
    const cv = this.alpha ? this.out : this.src; if (!cv || !this.state.ready) return;
    cv.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = this.state.name + '-isolert.png';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
      if (this.alive) this.setState({ done: true });
    }, 'image/png');
  };
  reset = () => { this._tok = (this._tok || 0) + 1; this.src = null; this.pend = null; this.alpha = null; this.out = null; this._emb = null; this.hist = []; this.setState({ histN: 0, phase: 'empty', mode: null, pts: [], busy: '', cmp: 0, err: '', note: '', ready: false, done: false }); };
  renderVals() {
    const S = this.state, K = this.KINDS, ring = on => on ? '0 0 0 2px #000000, 0 0 0 4px #f3f1ec' : 'none', inList = this.COLORS.some(c => c[0] === S.bg), isPoint = S.mode === 'point';
    const sel = on => ({ bg: on ? '#f3f1ec' : 'transparent', color: on ? '#000000' : '#f3f1ec', border: on ? '#f3f1ec' : 'rgba(255,255,255,0.18)', sub: on ? '#3a3833' : '#8a867e' });
    const seg = on => ({ bg: on ? '#f3f1ec' : 'transparent', color: on ? '#000000' : '#9d998f' });
    const pt = sel(isPoint);
    return {
      isEmpty: S.phase === 'empty', isWork: S.phase === 'work', isCrop: S.phase === 'crop', isBusyPhase: S.phase !== 'empty',
      cropRef: this.cropRef, cropDown: this.cropDown, cropMove: this.cropMove, cropUp: this.cropUp, cropOk: this.cropOk, cropSkip: this.cropSkip,
      cL: ((S.cr || {}).x || 0) * 100 + '%', cT: ((S.cr || {}).y || 0) * 100 + '%', cW: ((S.cr || {}).w ?? 1) * 100 + '%', cH: ((S.cr || {}).h ?? 1) * 100 + '%',
      cropDims: this.orig && S.cr ? Math.round(S.cr.w * this.orig.width) + ' × ' + Math.round(S.cr.h * this.orig.height) : '',
      aspects: [['free', 'Fri'], ['orig', 'Original'], [1, '1:1'], [4 / 5, '4:5'], [16 / 9, '16:9'], [9 / 16, '9:16']].map(([v, label]) => ({ label, onClick: () => this.setAspect(v), bg: S.ar === v ? '#f3f1ec' : 'transparent', color: S.ar === v ? '#000000' : '#b3afa6' })),
      recrop: this.recrop, noRecrop: !!S.busy, recropOp: S.busy ? 0.4 : 1,
      fileRef: this.fileRef, viewRef: this.viewRef,
      pick: () => this.fileRef.current && this.fileRef.current.click(),
      onFile: e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) this.load(f); },
      onDragOver: e => { e.preventDefault(); if (!S.drag) this.setState({ drag: true }); },
      onDragLeave: e => { if (e.currentTarget.contains(e.relatedTarget)) return; this.setState({ drag: false }); },
      onDrop: e => { e.preventDefault(); this.setState({ drag: false }); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) this.load(f); },
      dropBorder: S.drag ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.22)', dropBg: S.drag ? 'rgba(255,255,255,0.06)' : 'rgba(12,12,12,0.55)',
      hasErr: !!S.err, err: S.err,
      busy: !!S.busy, isModelLoad: S.busy === 'model',
      busyLabel: S.busy === 'model' ? 'Laster ned AI-modellen … ' + S.pct + ' %' : S.busy === 'analyze' ? 'Analyserer bildet …' : S.busy === 'fill' ? 'Fyller inn med omgivelsene …' : S.busy === 'seg' ? 'Fjerner det merkede …' : 'Fjerner bakgrunnen …',
      busyNote: S.busy === 'model' ? 'Bare første gang. Etterpå ligger modellen lagret i nettleseren.' : 'Dette tar noen sekunder.',
      barW: S.pct + '%',
      showHint: !S.mode && !S.busy,
      onDown: this.onDown, onMove: this.onMove, onUp: this.onUp, onCancel: this.onCancel, onViewCtx: e => e.preventDefault(),
      kinds: Object.keys(K).map(k => Object.assign({ label: K[k].label, desc: K[k].desc, onClick: () => { if (!S.busy) this.choose(k); } }, sel(S.mode === k))),
      pointOn: () => { if (S.busy || isPoint) return; this.setState({ mode: 'point', pts: [], ptLabel: 0, view: 'mark', err: '', note: '' }); },
      ptBg: pt.bg, ptColor: pt.color, ptBorder: pt.border, ptSub: pt.sub,
      isPoint, hasPts: isPoint && S.pts.length > 0,
      ptModes: [[0, 'Fjern', '#ff5a5a'], [1, 'Behold', '#3ddc84']].map(([l, label, dot]) => Object.assign({ label, dot, onClick: () => this.setState({ ptLabel: l }) }, seg(S.ptLabel === l))),
      clearPts: () => { if (S.busy || !S.pts.length) return; this.snap(); this.pend = null; this.setState({ pts: [], err: '' }); },
      apply: this.apply, noApply: !isPoint || !S.pts.some(m => !m.l) || !!S.busy, applyOp: isPoint && S.pts.some(m => !m.l) && !S.busy ? 1 : 0.4,
      showViews: false,
      viewModes: [['mark', 'Farger'], ['result', 'Resultat']].map(([v, label]) => Object.assign({ label, onClick: () => this.setState({ view: v }) }, seg(S.view === v))),
      undo: this.undo, noUndo: !S.histN || !!S.busy, undoOp: S.histN && !S.busy ? 1 : 0.4,
      restore: this.restore, noRestore: !(this.alpha || this.pend || S.pts.length || S.mode || this.src !== this.base), restoreOp: this.alpha || this.pend || S.pts.length || S.mode || this.src !== this.base ? 1 : 0.4,
      fillModes: [['fill', 'Fyll med omgivelser'], ['clear', 'Gjennomsiktig']].map(([v, label]) => Object.assign({ label, onClick: () => this.setState({ fillMode: v }) }, seg(S.fillMode === v))),
      hasNote: !!(S.note || (S.mode && K[S.mode])), note: S.note || (S.mode && K[S.mode] ? K[S.mode].note : ''),
      bgTypes: [['none', 'Gjennomsiktig'], ['color', 'Farge']].map(([t, label]) => Object.assign({ label, onClick: () => this.setState({ bgType: t }) }, seg(S.bgType === t))),
      isColor: S.bgType === 'color',
      swatches: this.COLORS.map(([c, t]) => ({ bg: c, title: t, ring: ring(S.bg === c), onClick: () => this.setState({ bg: c }) })),
      customRing: ring(!inList), bgHex: S.bgHex,
      onBgHex: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) this.setState({ bg: v, bgHex: v }); },
      bgName: S.bgType === 'none' ? 'Gjennomsiktig bakgrunn' : 'Fargen du velger, kommer bak motivet',
      adv: S.adv, advArrow: S.adv ? '−' : '+', toggleAdv: () => this.setState({ adv: !S.adv }),
      soft: S.soft, onSoft: e => this.setState({ soft: Number(e.target.value) }),
      tight: S.tight, onTight: e => this.setState({ tight: Number(e.target.value) }),
      cmp: S.cmp, onCmp: e => this.setState({ cmp: Number(e.target.value) }),
      crop: S.crop, toggleCrop: () => this.setState({ crop: !S.crop }), cropBg: S.crop ? '#f3f1ec' : 'transparent', cropColor: S.crop ? '#000000' : '#f3f1ec', cropBorder: S.crop ? '#f3f1ec' : 'rgba(255,255,255,0.22)', cropSub: S.crop ? '#3a3833' : '#8a867e', cropTrack: S.crop ? '#000000' : '#2b2b2b', cropKnob: S.crop ? '#f3f1ec' : '#8a867e', cropJustify: S.crop ? 'flex-end' : 'flex-start',
      name: S.name, dims: S.dims, ready: S.ready,
      download: this.download, pickShared: this.pickShared, copyOut: this.copyOut, sendOut: this.sendOut, notReady: !S.ready, dlOpacity: S.ready ? 1 : 0.4,
      dlNote: !S.ready ? 'Velg hva som skal beholdes først.' : S.bgType === 'none' ? 'PNG med gjennomsiktig bakgrunn i full oppløsning. Motivet er uendret.' : 'PNG med valgt bakgrunn i full oppløsning. Motivet er uendret.',
      done: S.done, stop: e => e.stopPropagation(),
      closeDone: () => this.setState({ done: false }),
      againNew: () => { this.reset(); setTimeout(() => this.fileRef.current && this.fileRef.current.click(), 50); },
      againSame: () => { this._tok++; this.hist = []; this.pend = null; this.alpha = null; this.out = null; this._mk = null; this.setState({ histN: 0, done: false, mode: null, pts: [], ready: false, cmp: 0, err: '', note: '' }); },
      reset: this.reset
    };
  }
}

export default Component;
