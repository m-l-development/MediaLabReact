/* Konvertert fra den gamle dc-siden mockups.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
import { onUpdate } from '../../shared/ml-update.js';
import { hereGet, hereSet } from '../../shared/here.js';
const DEF = { fit: 'cover', zoom: 1, ox: 0, oy: 0, bg: '#ffffff', shade: 0.6, gloss: 0.35, occl: true, corners: null };
const LS = 'mockups.settings';
const css = u => u ? 'url("' + String(u).replace(/["\\\n]/g, '') + '")' : 'none';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CATN = { all: 'Alle', phone: 'Mobil', laptop: 'Laptop', screen: 'Skjerm og TV', print: 'Trykk', other: 'Annet', collab: 'Samarbeidsfiler' };

class Component extends DCLogic {
  state = { view: 'gallery', lib: null, cat: 'all', sel: null, design: null, designName: '', designUrl: '', set: {}, adj: false, fmt: 'png', toast: '', dragOver: false, box: { w: 600, h: 400 }, narrow: false, busy: false };
  mockRef = React.createRef(); fileRef = React.createRef(); canvasRef = React.createRef(); stageRef = React.createRef(); wrapRef = React.createRef();
  imgs = {}; auto = {}; cardEls = {}; cardRefs = {};

  componentDidMount() {
    onUpdate({ note: () => !!this.state.design });
    this.alive = true;
    try { const s = JSON.parse(localStorage.getItem(LS) || '{}'); if (s && typeof s === 'object') this.setState({ set: s }); } catch (e) {}
    this.onResize = () => { const n = window.innerWidth < 860; if (n !== this.state.narrow) this.setState({ narrow: n }); this.measure(); };
    window.addEventListener('resize', this.onResize); this.onResize();
    this.onKey = e => {
      if (this.state.view !== 'edit') return; const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); } else if (e.key === 'Escape') { if (this.state.adj) this.setState({ adj: false }); else this.back(); }
    };
    window.addEventListener('keydown', this.onKey);
    this._here = hereGet('mockups'); this._hereT = setTimeout(() => { this._here = null; }, 10000);
    this.boot();
  }
  componentWillUnmount() { clearTimeout(this._hereT); (this._urls || []).forEach(u => URL.revokeObjectURL(u)); this.alive = false; window.removeEventListener('resize', this.onResize); window.removeEventListener('keydown', this.onKey); if (this.unrecv) this.unrecv(); if (this.ro) this.ro.disconnect(); clearTimeout(this._tt); }
  componentDidUpdate() {
    const S = this.state;
    if (this._here && S.lib && S.lib.some(m => m.id === this._here.sel)) { const id = this._here.sel; this._here = null; clearTimeout(this._hereT); this.open(id); return; }
    const hv = S.view === 'edit' && S.sel ? S.sel : ''; if (!this._here && hv !== this._hv) { this._hv = hv; hereSet('mockups', hv ? { v: 'edit', sel: hv } : null); }
    const el = this.stageRef.current; if (el && el !== this._roEl) { if (this.ro) this.ro.disconnect(); this._roEl = el; this.ro = new ResizeObserver(() => this.measure()); this.ro.observe(el); this.measure(); }
    if (!el && this._roEl) { if (this.ro) this.ro.disconnect(); this._roEl = null; }
    this.queueDraw();
  }
  async boot() {
    for (let i = 0; i < 200 && !(window.MK && window.MLShare); i++) await new Promise(r => setTimeout(r, 40));
    if (!window.MK) {
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = './mockup-engine.js?v=20260929k';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }
    if (!window.MK) { this.setState({ lib: [] }); return; }
    let lib = await window.MK.library('images/mockups/'); if (!this.alive) return;
    const extra = await window.MK.library('mockups/'); if (!this.alive) return;
    { const seen = new Set(lib.map(m => m.src.split('/').pop())); lib = lib.concat(extra.filter(m => !seen.has(m.src.split('/').pop())).map(m => ({ ...m, id: 'dir-' + m.id }))); }
    lib = lib.concat(await this.ownMocks()); if (!this.alive) return;
    // Render local images immediately; never wait for cloud synchronization.
    this.setState({ lib });
    const loadImages = items => items.forEach(m => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (!this.alive) return; this.imgs[m.id] = im; if (!m.corners) { try { this.auto[m.id] = window.MK.detect(im); } catch (e) {} } this.dirtyCards = true; this.measure(); this.forceUpdate(); };
      im.onerror = () => { console.warn('Mockup image failed to load:', m.src); };
      im.src = m.src;
    });
    loadImages(lib);
    if (window.MLCloud) {
      try {
        const c = await window.MLCloud.files('mockups'); if (!this.alive) return;
        /* ConnectHub-filene har id (ikke path som i den gamle skyen) – før feilet dette, og skymockupene ble aldri vist. */
        const cloudFiles = c.files.map(f => ({ id: 'cloud-' + String(f.id || f.path || f.name).replace(/[^a-z0-9]+/gi, '-').slice(-60), src: f.url, name: window.MK.nice(f.name), cat: window.MK.catOf(f.name), corners: null, aspect: null, keepHoles: false, occl: true }));
        /* Samarbeidsfiler (trinn 18): delte mockup-bilder i en egen kategori, merket med koblingen (A4). */
        const groups = window.MLCloud.collab ? await window.MLCloud.collab(['mockups']) : []; if (!this.alive) return;
        groups.forEach(g => g.files.forEach(f => cloudFiles.push({ id: 'collab-' + f.id, src: f.url, name: window.MK.nice(f.name) + ' · ' + g.title, cat: 'collab', corners: null, aspect: null, keepHoles: false, occl: true })));
        lib = lib.filter(m => !c.hidden.has(m.src.split('/').pop())).concat(cloudFiles);
        this.setState({ lib });
        loadImages(cloudFiles);
      } catch (e) { /* cloud is optional; keep local mockups visible */ }
    }
    if (window.MLShare) this.unrecv = window.MLShare.receive((b, n) => this.useBlob(b, n), { accept: ['image'] });
  }
  showToast(t) { this.setState({ toast: t }); clearTimeout(this._tt); this._tt = setTimeout(() => { if (this.alive) this.setState({ toast: '' }); }, 2600); }

  useBlob(blob, name) {
    if (!blob || !/^image\/(png|jpeg|webp|gif)$/.test(blob.type || '')) { this.showToast('Bruk PNG, JPG, WebP eller GIF.'); return; }
    if (blob.size > 60e6) { this.showToast('Bildet er for stort (maks 60 MB).'); return; }
    const url = URL.createObjectURL(blob), im = new Image();
    im.onload = () => { if (this.state.designUrl) URL.revokeObjectURL(this.state.designUrl); this.dirtyCards = true; this.setState({ design: im, designUrl: url, designName: String(name || 'Design').slice(0, 80) }); this.showToast(this.state.view === 'edit' ? 'Designet er byttet i alle mockupene.' : 'Designet er lagt inn i alle mockupene. Velg den du vil bruke.'); };
    im.onerror = () => { URL.revokeObjectURL(url); this.showToast('Bildet kunne ikke leses.'); }; im.src = url;
  }
  /* own mockup images, stored locally in IndexedDB */
  mdb() { return this._mdb || (this._mdb = new Promise((res, rej) => { const r = indexedDB.open('mockuplib', 1); r.onupgradeneeded = () => r.result.createObjectStore('imgs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
  async mtx(mode, fn) { const d = await this.mdb(); return new Promise((res, rej) => { const t = d.transaction('imgs', mode), q = fn(t.objectStore('imgs')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); }
  async ownMocks() {
    try { const all = (await this.mtx('readonly', s => s.getAll())) || []; return all.filter(x => x && x.blob instanceof Blob).sort((a, b) => a.t - b.t).map(x => { const u = URL.createObjectURL(x.blob); this._urls = (this._urls || []).concat(u); return { id: x.id, own: true, src: u, name: x.name, cat: window.MK.catOf(x.file || x.name), corners: null, aspect: null, keepHoles: false, occl: true }; }); } catch (e) { return []; }
  }
  pickMocks = () => { const el = this.mockRef.current; if (el) el.click(); };
  onMockFiles = async e => {
    const fs = [...(e.target.files || [])]; e.target.value = ''; let n = 0, bad = 0;
    for (const f of fs) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 25 * 1048576) { bad++; continue; }
      const id = 'own-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), file = f.name.toLowerCase();
      try { await this.mtx('readwrite', s => s.put({ id, name: window.MK.nice(f.name).slice(0, 60), file, blob: f, t: Date.now() })); } catch (err) { bad++; continue; }
      const u = URL.createObjectURL(f); this._urls = (this._urls || []).concat(u);
      const m = { id, own: true, src: u, name: window.MK.nice(f.name).slice(0, 60), cat: window.MK.catOf(file), corners: null, aspect: null, keepHoles: false, occl: true };
      const im = new Image(); im.onload = () => { this.imgs[id] = im; try { this.auto[id] = window.MK.detect(im); } catch (x) {} this.dirtyCards = true; this.measure(); this.forceUpdate(); }; im.src = u;
      this.setState(s => ({ lib: (s.lib || []).concat([m]) })); n++;
    }
    this.showToast(n ? (n === 1 ? 'Mockup-bildet er lagt til.' : n + ' mockup-bilder er lagt til.') + (bad ? ' Noen filer ble hoppet over (PNG, JPG eller WebP, maks 25 MB).' : '') : 'Bruk PNG, JPG eller WebP, maks 25 MB.');
  };
  delMock = async id => { if (!confirm('Slette dette mockup-bildet?')) return; try { await this.mtx('readwrite', s => s.delete(id)); } catch (e) {} this.setState(s => ({ lib: (s.lib || []).filter(m => m.id !== id) })); };
  pickFile = () => { const el = this.fileRef.current; if (el) el.click(); };
  onFile = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) this.useBlob(f, f.name); };
  pickShared = () => { if (window.MLShare) window.MLShare.pick((b, n) => this.useBlob(b, n), { accept: ['image'] }); };
  onDragOver = e => { if (!e.dataTransfer || ![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); };
  onDragLeave = e => { if (e.currentTarget.contains(e.relatedTarget)) return; this.setState({ dragOver: false }); };
  onDrop = e => { e.preventDefault(); this.setState({ dragOver: false }); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) this.useBlob(f, f.name); };

  mk() { const l = this.state.lib || []; return l.find(m => m.id === this.state.sel) || null; }
  stOf(m) { const s = { ...DEF, ...((this.state.set || {})[m.id] || {}) }; if (!s.corners) s.corners = m.corners || this.auto[m.id] || null; return s; }
  patch(o) {
    const m = this.mk(); if (!m) return; this.dirtyCards = true;
    this.setState(s => { const set = { ...s.set, [m.id]: { ...((s.set || {})[m.id] || {}), ...o } }; try { localStorage.setItem(LS, JSON.stringify(set)); } catch (e) {} return { set }; });
  }
  open(id) { this.setState({ view: 'edit', sel: id, adj: false }); window.scrollTo(0, 0); }
  back = () => { this.dirtyCards = true; this.setState({ view: 'gallery', adj: false }); };
  list() { const l = this.state.lib || [], c = this.state.cat; return c === 'all' ? l : l.filter(m => m.cat === c); }
  step(d) { const l = this.list(); if (!l.length) return; const i = l.findIndex(m => m.id === this.state.sel); this.setState({ sel: l[(i + d + l.length) % l.length].id, adj: false }); }

  measure() {
    const el = this.stageRef.current, m = this.mk(), im = m && this.imgs[m.id]; if (!el || !im) return;
    const aw = Math.max(80, el.clientWidth - 48), ah = Math.max(80, el.clientHeight - 48), r = im.naturalWidth / im.naturalHeight;
    let w = aw, h = aw / r; if (h > ah) { h = ah; w = ah * r; }
    const b = this.state.box; if (Math.abs(b.w - w) > 0.5 || Math.abs(b.h - h) > 0.5) this.setState({ box: { w, h } });
  }
  queueDraw() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this.drawAll(); }); }
  drawAll() {
    const MK = window.MK; if (!MK) return; const S = this.state;
    if (S.view === 'edit') {
      const m = this.mk(), im = m && this.imgs[m.id], c = this.canvasRef.current; if (!m || !im || !c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.max(2, Math.round(Math.min(im.naturalWidth, S.box.w * dpr))), H = Math.max(2, Math.round(W * im.naturalHeight / im.naturalWidth));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; this._lastKey = ''; }
      const key = [m.id, W, JSON.stringify(this.stOf(m)), S.designUrl, this._dragging ? 'd' : ''].join('|'); if (key === this._lastKey) return; this._lastKey = key;
      try { MK.render(c.getContext('2d'), W, H, im, S.design, m, this.stOf(m), { N: this._dragging ? 10 : 20 }); } catch (e) {}
      return;
    }
    if (!this.dirtyCards) return; this.dirtyCards = false;
    const todo = this.list().filter(m => this.imgs[m.id] && this.cardEls[m.id]); let i = 0, gen = (this._gen = (this._gen || 0) + 1);
    const run = () => { if (!this.alive || gen !== this._gen || i >= todo.length) return; const m = todo[i++], c = this.cardEls[m.id], im = this.imgs[m.id];
      if (c && im) { const W = 480, H = Math.round(W * im.naturalHeight / im.naturalWidth); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } try { MK.render(c.getContext('2d'), W, H, im, S.design, m, this.stOf(m), { N: 8 }); } catch (e) { console.warn('mockup', m.id, e && e.message); } }
      setTimeout(run, 0); };
    run();
  }
  cardRef(id) { return this.cardRefs[id] || (this.cardRefs[id] = el => { if (el) { this.cardEls[id] = el; this.dirtyCards = true; this.queueDraw(); } else delete this.cardEls[id]; }); }

  handleDown(e, i) {
    e.preventDefault(); e.stopPropagation(); const wrap = this.wrapRef.current, m = this.mk(); if (!wrap || !m) return;
    const r = wrap.getBoundingClientRect(), base = (this.stOf(m).corners || [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]]).map(p => [...p]); this._dragging = true;
    const mv = ev => { const q = base.map(p => [...p]); q[i] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)]; this.patch({ corners: q }); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this._dragging = false; this._lastKey = ''; this.forceUpdate(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }

  async outBlob() {
    const MK = window.MK, m = this.mk(), im = m && this.imgs[m.id]; if (!m || !im) return null;
    const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    MK.render(c.getContext('2d'), W, H, im, this.state.design, m, this.stOf(m), { N: 28 });
    const jpg = this.state.fmt === 'jpg'; return await new Promise(r => c.toBlob(r, jpg ? 'image/jpeg' : 'image/png', 0.92));
  }
  fname() { const m = this.mk(); return 'mockup-' + (m ? m.id : 'bilde') + (this.state.fmt === 'jpg' ? '.jpg' : '.png'); }
  doDownload = async () => { if (this.state.busy) return; this.setState({ busy: true }); try { const b = await this.outBlob(); if (b) window.MLShare ? window.MLShare.download(b, this.fname()) : null; } finally { this.setState({ busy: false }); } };
  doCopy = async () => { const b = await this.outBlob(); if (!b) return; const ok = window.MLShare && await window.MLShare.copy(b); this.showToast(ok ? 'Bildet er kopiert. Lim inn med Ctrl+V.' : 'Nettleseren tillot ikke kopiering.'); };
  doSend = async () => { const b = await this.outBlob(); if (b && window.MLShare) window.MLShare.send(b, this.fname(), 'mockups'); };

  renderVals() {
    const S = this.state, lib = S.lib || [], m = this.mk(), st = m ? this.stOf(m) : { ...DEF }, deploy = /^[a-z0-9-]+\.dc\.html$/.test(decodeURIComponent(location.pathname.split('/').pop() || ''));
    const count = k => k === 'all' ? lib.length : lib.filter(x => x.cat === k).length;
    const cats = ['all', 'phone', 'laptop', 'screen', 'print', 'other', 'collab'].filter(k => k === 'all' || count(k)).map(k => ({ l: CATN[k], n: String(count(k)), bg: S.cat === k ? '#e9e7e2' : 'rgba(12,12,12,0.6)', fg: S.cat === k ? '#000000' : '#f3f1ec', border: S.cat === k ? '#e9e7e2' : 'rgba(255,255,255,0.18)', click: () => { this.dirtyCards = true; this.setState({ cat: k }); } }));
    const P = o => this.patch(o), pc = v => Math.round(v * 100) + ' %';
    const rg = (label, k, min, max, step, show, def) => ({ label, min, max, step, val: st[k], show, on: e => P({ [k]: +e.target.value }), reset: () => P({ [k]: def }) });
    const q = st.corners || [];
    const im = m && this.imgs[m.id];
    return {
      isGallery: S.view !== 'edit', isEdit: S.view === 'edit', backHref: (deploy ? '/home' : '/home') + '#tools',
      mockRef: this.mockRef, onMockFiles: this.onMockFiles, pickMocks: this.pickMocks, fileRef: this.fileRef, onFile: this.onFile, pickFile: this.pickFile, pickShared: this.pickShared, onDragOver: this.onDragOver, onDragLeave: this.onDragLeave, onDrop: this.onDrop, dragOver: S.dragOver && S.view === 'edit',
      uploadLabel: S.design ? 'Bytt design' : 'Last opp design', hasDesign: !!S.design, designCss: css(S.designUrl), designName: S.designName, designLabel: S.design ? S.designName : 'Ingen design valgt ennå',
      clearDesign: () => { if (S.designUrl) URL.revokeObjectURL(S.designUrl); this.dirtyCards = true; this.setState({ design: null, designUrl: '', designName: '' }); },
      cats, libEmpty: !!S.lib && !lib.length, libMsg: 'Fant ingen mockup-bilder. Legg bilder i mappen «mockups» eller trykk «Legg til egne mockup-bilder».',
      cards: this.list().map(x => { const i2 = this.imgs[x.id]; return { name: x.name, own: !!x.own, del: ev => { ev.stopPropagation(); this.delMock(x.id); }, cat: CATN[x.cat] || '', ref: this.cardRef(x.id), ar: i2 ? i2.naturalWidth + ' / ' + i2.naturalHeight : '3 / 2', open: () => this.open(x.id) }; }),
      back: this.back, prev: () => this.step(-1), next: () => this.step(1), selName: m ? m.name : '', selCat: m ? CATN[m.cat] || '' : '',
      cols: S.narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 320px', stageMinH: S.narrow ? '56vh' : '0px', panelMaxH: S.narrow ? 'none' : 'calc(100dvh - 61px)',
      stageRef: this.stageRef, wrapRef: this.wrapRef, canvasRef: this.canvasRef, cvW: S.box.w + 'px', cvH: S.box.h + 'px',
      adj: S.adj, quadPts: q.map(p => (p[0] * 100).toFixed(2) + ',' + (p[1] * 100).toFixed(2)).join(' '),
      handles: q.map((p, i) => ({ left: (p[0] * 100) + '%', top: (p[1] * 100) + '%', label: ['Øverst til venstre', 'Øverst til høyre', 'Nederst til høyre', 'Nederst til venstre'][i], down: e => this.handleDown(e, i) })),
      toggleAdj: () => this.setState(s => ({ adj: !s.adj })), adjLabel: S.adj ? 'Ferdig med hjørnene' : 'Juster hjørnene', adjBorder: S.adj ? '#f5b82c' : '#2b2b2b', adjBg: S.adj ? 'rgba(245,184,44,0.12)' : 'transparent',
      autoDetect: () => { if (!im) return; let d = null; try { d = window.MK.detect(im); } catch (e) {} if (d) { P({ corners: d }); this.showToast('Fant skjermen. Juster hjørnene om nødvendig.'); } else this.showToast('Fant ingen tydelig skjerm. Juster hjørnene selv.'); },
      resetCorners: () => P({ corners: null }),
      fits: [['cover', 'Fyll skjermen'], ['contain', 'Vis hele']].map(([k, l]) => ({ l, bg: st.fit === k ? '#e9e7e2' : 'transparent', fg: st.fit === k ? '#000000' : '#9d998f', click: () => P({ fit: k }) })),
      ranges1: [rg('Zoom', 'zoom', 0.5, 3, 0.01, pc(st.zoom), 1), rg('Flytt vannrett', 'ox', -0.5, 0.5, 0.005, pc(st.ox), 0), rg('Flytt loddrett', 'oy', -0.5, 0.5, 0.005, pc(st.oy), 0)],
      ranges2: [rg('Skygger og lys', 'shade', 0, 1, 0.01, pc(st.shade), 0.6), rg('Glans', 'gloss', 0, 1, 0.01, pc(st.gloss), 0.35)],
      bgVal: st.bg, onBg: e => P({ bg: e.target.value }),
      canOccl: !!m && m.occl !== false, occl: st.occl !== false, toggleOccl: () => P({ occl: st.occl === false }), occlTrack: st.occl !== false ? '#e9e7e2' : '#333333', occlKnob: st.occl !== false ? '18px' : '2px', occlKnobBg: st.occl !== false ? '#000000' : '#9d998f',
      fmts: [['png', 'PNG'], ['jpg', 'JPG']].map(([k, l]) => ({ l, bg: S.fmt === k ? '#e9e7e2' : 'transparent', fg: S.fmt === k ? '#000000' : '#9d998f', click: () => this.setState({ fmt: k }) })),
      sizeLabel: im ? im.naturalWidth + ' × ' + im.naturalHeight + ' px' : '', dlLabel: S.busy ? 'Lager …' : 'Last ned', doDownload: this.doDownload, doCopy: this.doCopy, doSend: this.doSend,
      hasToast: !!S.toast, toast: S.toast
    };
  }
}

export default Component;
