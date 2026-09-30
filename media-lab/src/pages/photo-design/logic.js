/* Konvertert fra den gamle dc-siden photo-design.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
const PAL = ['#ffffff', '#000000', '#111111', '#e9e7e2', '#f5b82c', '#e4411f', '#c0392b', '#1d2a3a', '#0495c0', '#2a9d8f', '#7b3fe4', '#e84393'];
const ADJL = [['exp', 'Eksponering'], ['bri', 'Lysstyrke'], ['con', 'Kontrast'], ['hi', 'Høylys'], ['sh', 'Skygger'], ['sat', 'Metning'], ['temp', 'Temperatur'], ['tint', 'Fargetone'], ['hue', 'Nyanse', -180, 180], ['fade', 'Falming', 0, 100], ['blur', 'Uskarphet', 0, 100], ['vig', 'Vignett'], ['grain', 'Korn', 0, 100]];
const T = s => window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s;
const css = u => u ? 'url("' + String(u).replace(/["\\\n]/g, '') + '")' : 'none';
const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#000000';
const tog = on => ({ track: on ? '#e9e7e2' : '#333333', knob: on ? '15px' : '2px', knobBg: on ? '#000000' : '#9d998f' });
const chip = on => ({ bg: on ? '#e9e7e2' : 'transparent', fg: on ? '#000000' : '#9d998f' });
const LOGOS = [['images/logo-symbol.png', 'Livets Ord-symbol'], ['images/logo-kbs.png', 'Kveldsbibelskole'], ['images/logo-wol.png', 'Word of Life']];

class Component extends DCLogic {
  state = { view: 'home', projects: [], fmt: 'sq', cw: 1200, ch: 800, doc: null, sel: null, multi: [], tool: 'move', tab: 'layer', brush: { size: 80, mode: 'erase', hard: 0.6 }, fit: 0.5, zoom: 1, exp: { fmt: 'png', scale: 1, t: false }, expOpen: false,
    busy: '', pct: 0, toast: '', saved: '', autosave: (() => { try { return localStorage.getItem('photodesign.autosave') === '1'; } catch (e) { return false; } })(), guides: { x: false, y: false }, lib: null, libOpen: false, logoOpen: false, fillOpen: true, ltab: 'lag', linkCol: false, tplCat: (() => { try { const t = localStorage.getItem('photodesign.tplcat'); if (typeof t === 'string' && t.length) return t; } catch (e) {} return null; })(), cats: (() => { try { const c = JSON.parse(localStorage.getItem('photodesign.cats')); if (Array.isArray(c) && c.length) return c.filter(x => typeof x === 'string').slice(0, 20); } catch (e) {} return ['Søndagsmøte', 'Kveldsbibelskole', 'Ungdomsmøte']; })(), newCol: (() => { try { return localStorage.getItem('photodesign.newcol') || null; } catch (e) { return null; } })(), dragOver: false, brushXY: null, narrow: false, hist: 0 };
  fileRef = React.createRef(); stageRef = React.createRef(); wrapRef = React.createRef(); canvasRef = React.createRef(); curveRef = React.createRef(); textRef = React.createRef(); bkFileRef = React.createRef();
  M = { media: {}, masks: {} }; past = []; future = []; tplEls = {}; tplRefs = {};

  componentDidMount() {
    this.alive = true; this.refresh();
    this.onResize = () => { const n = window.innerWidth < 980; if (n !== this.state.narrow) this.setState({ narrow: n }); this.measure(); }; window.addEventListener('resize', this.onResize); this.onResize();
    this.onKey = e => this.key(e); window.addEventListener('keydown', this.onKey);
    this.onBU = e => { if (this.dirty && this.state.view === 'edit') { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', this.onBU);
    const ws = (fn, n = 0) => { if (window.MLShare && window.PD) fn(); else if (n < 160) setTimeout(() => ws(fn, n + 1), 50); };
    ws(() => { this._unr = window.MLShare.receive((b, n) => this.takeBlob(b, n), { accept: ['image'] }); this.forceUpdate(); });
  }
  componentWillUnmount() { this.alive = false; window.removeEventListener('resize', this.onResize); window.removeEventListener('keydown', this.onKey); window.removeEventListener('beforeunload', this.onBU); if (this._unr) this._unr(); if (this.ro) this.ro.disconnect(); clearTimeout(this._svT); clearTimeout(this._tt); }
  componentDidUpdate() {
    const el = this.stageRef.current; if (el && el !== this._roEl) { if (this.ro) this.ro.disconnect(); this._roEl = el; this.ro = new ResizeObserver(() => this.measure()); this.ro.observe(el); this.measure(); }
    if (!el) this._roEl = null; this.queueDraw();
  }
  /* ---------- avansert modus: effektbibliotek ---------- */
  fxFileRef = React.createRef(); fxThumbs = {}; fxQ = []; fxQK = new Set();
  advOn() { const F = window.MLFX; return this.state.adv != null ? this.state.adv : !!(F && F.adv()); }
  toggleAdv = () => { const F = window.MLFX; if (!F) return; const on = !this.advOn(); F.setAdv(on); this.setState({ adv: on }); };
  fxKey(pr) { return pr.id + (pr.custom ? JSON.stringify(pr.p) + pr.seed : ''); }
  fxThumb(pr) { const k = this.fxKey(pr); if (this.fxThumbs[k]) return this.fxThumbs[k]; if (!this.fxQK.has(k)) { this.fxQK.add(k); this.fxQ.push(pr); } if (!this._fxT) this._fxT = requestAnimationFrame(this.fxRun); return null; }
  fxRun = () => { this._fxT = 0; if (!this.alive || !window.MLFX) return; const t0 = performance.now(); while (this.fxQ.length && performance.now() - t0 < 28) { const pr = this.fxQ.shift(), k = this.fxKey(pr); try { this.fxThumbs[k] = window.MLFX.thumb(pr); } catch (e) { this.fxThumbs[k] = ''; } this.fxQK.delete(k); } this.forceUpdate(); if (this.fxQ.length) this._fxT = requestAnimationFrame(this.fxRun); };
  addFx(pr) { const F = window.MLFX, d = this.state.doc; if (!F || !d) return; F.pushRecent(pr.id); this.addLayer(F.layer(pr, d.w, d.h, pr.custom ? pr.name : T(pr.look || F.KINDS[pr.fx].l) + (pr.pal ? ' · ' + T(pr.pal) : ''))); }
  fxImport = () => { this.fxFileRef.current && this.fxFileRef.current.click(); };
  onFxFile = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || !window.MLFX) return; if (f.size > 1e6 || !/\.json$/i.test(f.name)) { this.flash('Velg en JSON-fil under 1 MB.'); return; }
    try { const n = window.MLFX.importJSON(await f.text()); this.flash(n ? 'Forhåndsvalgene er importert.' : 'Fant ingen gyldige forhåndsvalg.'); this.setState({ fxCat: 'custom', fxN: 24 }); } catch (er) { this.flash('Kunne ikke lese filen.'); } };
  fxExport = () => { const F = window.MLFX; if (!F) return; if (!F.custom().length) { this.flash('Du har ingen egne forhåndsvalg ennå.'); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([F.exportJSON()], { type: 'application/json' })); a.download = 'medialab-effekter.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  fxVals(d, L) {
    const S = this.state, F = window.MLFX, on = this.advOn(), tg = tog(on), out = { advOn: on, advOff: !on, advTrack: tg.track, advKnob: tg.knob, advKnobBg: tg.knobBg, toggleAdv: this.toggleAdv, fxFileRef: this.fxFileRef, onFxFile: this.onFxFile, fxImport: this.fxImport, fxExport: this.fxExport,
      fxQ: S.fxQ || '', onFxQ: e => this.setState({ fxQ: e.target.value.slice(0, 60), fxN: 24 }), fxCats: [], fxVar: false, fxPals: [], fxStrs: [], fxItems: [], fxCount: '', fxEmpty: false, fxMore: false, fxShowMore: () => this.setState({ fxN: (S.fxN || 24) + 24 }),
      isFx: !!L && L.type === 'fx', fxLocked: false, fxEdit: false, fxKindName: '', fxRanges: [], fxHasColor: false, fxColorVal: '#ffffff', fxColorOn: () => {}, fxColorTabs: [], fxColorSw: [], fxSelects: [], fxActs: [] };
    if (!F) return out;
    const nm = p => p.custom ? p.name : (S.fxCat === 'fav' || S.fxCat === 'recent') ? T(p.look) + ' · ' + T(p.pal) + ' · ' + T(p.str) : T(p.look);
    if (on) {
      const cat = S.fxCat || 'all', q = (S.fxQ || '').trim().toLowerCase(), fav = new Set(F.favs()); let list;
      if (cat === 'fav') list = F.favs().map(id => F.byId(id)).filter(Boolean); else if (cat === 'recent') list = F.recent().map(id => F.byId(id)).filter(Boolean); else if (cat === 'custom') list = F.custom(); else { const pi = S.fxPal || 0, si = S.fxStr != null ? S.fxStr : 1, sfx = '-' + pi + '-' + si, base = F.presets().filter(p => p.id.endsWith(sfx)); list = cat === 'all' ? F.custom().concat(base) : base.filter(p => p.fx === cat); }
      if (q) list = list.filter(p => (nm(p) + ' ' + p.name + ' ' + T(F.KINDS[p.fx].l) + ' ' + F.KINDS[p.fx].l).toLowerCase().includes(q));
      const n = S.fxN || 24;
      out.fxCats = [['all', 'Alle'], ['fav', 'Favoritter'], ['recent', 'Nylig brukt'], ['custom', 'Egne']].concat(Object.keys(F.KINDS).map(k => [k, F.KINDS[k].l])).map(([k, l]) => { const a = cat === k; return { l: T(l), bg: a ? '#e9e7e2' : 'transparent', fg: a ? '#000000' : '#9d998f', border: a ? '#e9e7e2' : '#2b2b2b', click: () => this.setState({ fxCat: k, fxN: 24 }) }; });
      const vpi = S.fxPal || 0, vsi = S.fxStr != null ? S.fxStr : 1, vis = cat !== 'fav' && cat !== 'recent' && cat !== 'custom';
      out.fxVar = vis && !!F.PAL && !!F.STR;
      out.fxPals = (F.PAL || []).map((pl, i) => ({ l: T(pl[0]), bg: 'linear-gradient(135deg,' + pl[1] + ' 50%,' + pl[2] + ' 50%)', border: i === vpi ? '#e9e7e2' : '#2b2b2b', click: () => this.setState({ fxPal: i }) }));
      out.fxStrs = (F.STR || []).map((st, i) => { const a = chip(i === vsi); return { l: T(st[0]), bg: a.bg, fg: a.fg, click: () => this.setState({ fxStr: i }) }; });
      out.fxCount = list.length.toLocaleString() + ' ' + T('forhåndsvalg'); out.fxEmpty = !list.length; out.fxMore = list.length > n;
      out.fxItems = list.slice(0, n).map(p => ({ name: nm(p), src: this.fxThumb(p) || '', click: () => this.addFx(p), fav: e => { e.stopPropagation(); F.toggleFav(p.id); this.forceUpdate(); }, favC: fav.has(p.id) ? '#f5b82c' : '#8a867e',
        ctx: e => { if (!p.custom) return; e.preventDefault(); if (confirm(T('Slette forhåndsvalget?'))) { F.delCustom(p.id); this.forceUpdate(); } },
        dbl: e => { if (!p.custom) return; e.preventDefault(); const v = prompt(T('Nytt navn'), p.name); if (v) { F.renameCustom(p.id, v); this.forceUpdate(); } } }));
    }
    const K = out.isFx ? F.KINDS[L.fx] : null; if (!K) return out;
    out.fxLocked = !on; out.fxEdit = on; if (!on) return out;
    const P = F.params(L), set = (k, v, key) => this.patchL(L.id, x => ({ p: { ...(x.p || {}), [k]: v } }), key);
    const fmt = (dd, v) => /^(dir|ang|spread|beam|rot)$/.test(dd.k) && dd.max > 2 ? Math.round(v) + '°' : dd.step >= 1 ? String(Math.round(v)) : /^(sx|sy|lean|wind|curve)$/.test(dd.k) ? String(Math.round(v * 100)) : Math.round(v * 100) + ' %';
    out.fxKindName = T(K.l);
    out.fxRanges = K.p.filter(dd => dd.t === 'r').map(dd => ({ label: T(dd.l), min: dd.min, max: dd.max, step: dd.step, val: P[dd.k], show: fmt(dd, P[dd.k]), on: e => set(dd.k, +e.target.value, 'fx' + dd.k), reset: () => set(dd.k, dd.def) }));
    const one = L.fx === 'light' && P.mode === 'radial';
    const cks = K.p.filter(dd => dd.t === 'c' && !(one && dd.k === 'c2'));
    const same = cks.every(dd => hex(P[dd.k]).toLowerCase() === hex(P[cks[0] && cks[0].k]).toLowerCase());
    const sel = cks.length < 2 ? (cks[0] ? cks[0].k : '') : (S.fxCk && (S.fxCk === 'all' || cks.some(dd => dd.k === S.fxCk)) ? S.fxCk : (same ? 'all' : cks[0].k));
    const keys = sel === 'all' ? cks.map(dd => dd.k) : [sel], cur = hex(P[keys[0]]);
    const setC = v => this.patchL(L.id, x => { const p = { ...(x.p || {}) }; keys.forEach(k => { p[k] = v; }); return { p }; }, 'fxc' + sel);
    out.fxHasColor = cks.length > 0; out.fxColorVal = cur; out.fxColorOn = e => setC(e.target.value);
    out.fxColorTabs = cks.length < 2 ? [] : [{ k: 'all', l: T('Alle'), c: same ? cur : 'conic-gradient(' + cks.map(dd => hex(P[dd.k])).join(',') + ',' + hex(P[cks[0].k]) + ')' }].concat(cks.map(dd => ({ k: dd.k, l: T(dd.l), c: hex(P[dd.k]) }))).map(t => ({ ...t, bg: sel === t.k ? '#e9e7e2' : 'transparent', fg: sel === t.k ? '#000000' : '#9d998f', click: () => this.setState({ fxCk: t.k }) }));
    out.fxColorSw = PAL.filter(v => v !== '#000000' && v !== '#111111').map(v => ({ v, border: cur.toLowerCase() === v ? '#e9e7e2' : '#2b2b2b', click: () => setC(v) }));
    out.fxSelects = K.p.filter(dd => dd.t === 's').map(dd => ({ label: T(dd.l), val: P[dd.k], on: e => set(dd.k, e.target.value), opts: dd.o.map(([v, l]) => ({ v, l: T(l) })) }));
    out.fxActs = [['Ny variant', () => this.patchL(L.id, { seed: ((Math.random() * 1e5) | 0) + 1 })], ['Fyll bildet', () => this.patchL(L.id, { x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, rot: 0 })],
      ['Lagre forhåndsvalg', () => { const v = prompt(T('Navn på forhåndsvalget'), L.name); if (v == null) return; F.saveCustom({ fx: L.fx, name: v || L.name, p: L.p || {}, blend: L.blend, seed: L.seed }); this.flash('Lagret under Egne.'); this.forceUpdate(); }],
      ['Tilbakestill', () => { const pr = L.preset && F.byId(L.preset); this.patchL(L.id, { p: pr ? JSON.parse(JSON.stringify(pr.p)) : {} }); }]].map(([l, click]) => ({ l, click }));
    return out;
  }
  flash(t) { this.setState({ toast: T(t) }); clearTimeout(this._tt); this._tt = setTimeout(() => { if (this.alive) this.setState({ toast: '' }); }, 2600); }
  async refresh() { for (let i = 0; i < 100 && !window.PD; i++) await new Promise(r => setTimeout(r, 40)); if (!window.PD) return; try { const p = await window.PD.store.list(); if (this.alive) this.setState({ projects: p }); } catch (e) {} }

  /* ---------- prosjekter ---------- */
  fmtWH() { const S = this.state, f = window.PD.FORMATS.find(x => x.k === S.fmt); return f ? [f.w, f.h] : [Math.round(Math.min(8000, Math.max(64, +S.cw || 1200))), Math.round(Math.min(8000, Math.max(64, +S.ch || 800)))]; }
  create(tpl) { const [w, h] = this.fmtWH(), d = window.PD.newDoc(w, h, tpl), f = window.PD.FORMATS.find(x => x.k === this.state.fmt); d.name = tpl === 'card2' ? T('Visittkort') : T(f ? f.l : 'Egendefinert'); this.openDoc(d, true); }
  async open(p) {
    const PD = window.PD, doc = JSON.parse(JSON.stringify(p)); this.M = { media: {}, masks: {} }; this.setState({ busy: 'load' });
    await Promise.all(doc.layers.concat(doc.back && doc.back.layers || []).map(async L => {
      if (L.src && !this.M.media[L.src]) { try { const b = await PD.store.getMedia(L.src); if (b) this.M.media[L.src] = await PD.loadImg(b); } catch (e) {} }
      if (L.mask) { try { const b = await PD.store.getMedia(L.mask); if (b) { const E = await PD.loadImg(b), c = PD.mk(E.w, E.h); c.getContext('2d').drawImage(E.img, 0, 0); c._v = 1; c._saved = L.mask; this.M.masks[L.id] = c; URL.revokeObjectURL(E.url); } } catch (e) {} }
    }));
    this.setState({ busy: '' }); this.openDoc(doc, false);
  }
  openDoc(doc, isNew) { if (isNew) this.M = { media: {}, masks: {} }; this.past = []; this.future = []; this.dirty = !!isNew; this.setState({ view: 'edit', doc, sel: null, multi: [], tool: 'move', tab: 'layer', zoom: 1, expOpen: false, saved: isNew && !this.state.autosave ? 'Ikke lagret' : '', hist: 0 }, () => { this.measure(); if (isNew && this.state.autosave) this.saveNow(); }); }
  leave = async () => {
    if (this._svT) { clearTimeout(this._svT); this._svT = null; await this.saveNow(); }
    else if (this.dirty) { const q = T('Du har endringer som ikke er lagret. Vil du lagre dem før du går tilbake?'); if (window.confirm(q)) await this.saveNow(); }
    this.dirty = false; this.setState({ view: 'home', doc: null, sel: null, multi: [], expOpen: false }); this.refresh();
  };
  async delProject(p) { if (!window.confirm(T('Slette prosjektet?') + '\n' + p.name)) return; try { await window.PD.store.del(p); } catch (e) {} this.refresh(); }
  saveNow = async () => {
    const PD = window.PD, d = this.state.doc; if (!d) return; clearTimeout(this._svT); this._svT = null;
    try {
      for (const L of d.layers.concat(d.back && d.back.layers || [])) { const c = this.M.masks[L.id]; if (L.mask && c && c._saved !== L.mask) { const b = await new Promise(r => c.toBlob(r, 'image/png')); if (b) { await PD.store.putMedia(L.mask, b); c._saved = L.mask; } } }
      const tw = 360, sc = tw / Math.max(d.w, d.h), tc = PD.mk(d.w * sc, d.h * sc); PD.render(tc.getContext('2d'), d, sc, this.M, { preview: 600, noPh: false });
      await PD.store.put({ ...d, updated: Date.now(), thumb: tc.toDataURL('image/jpeg', 0.8) }); this.dirty = false; if (this.alive) this.setState({ saved: T('Lagret') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (e) { this.flash('Kunne ikke lagre. Nettleseren kan være full.'); }
  };
  queueSave() { this.dirty = true; if (!this.state.autosave) { if (this.state.saved !== 'Ikke lagret') this.setState({ saved: 'Ikke lagret' }); return; } clearTimeout(this._svT); this._svT = setTimeout(() => { this._svT = null; this.saveNow(); }, 900); }
  toggleAutosave = () => { const on = !this.state.autosave; try { localStorage.setItem('photodesign.autosave', on ? '1' : '0'); } catch (e) {} this.setState({ autosave: on }); if (on && this.dirty) this.saveNow(); this.flash(on ? 'Autolagring er på.' : 'Autolagring er av. Husk å lagre.'); };

  /* ---------- historikk ---------- */
  snap() { return { doc: this.state.doc, masks: { ...this.M.masks } }; }
  push(key) { const t = Date.now(); if (key && this._hk === key && t - this._ht < 900) { this._ht = t; return; } this._hk = key; this._ht = t; this.past.push(this.snap()); if (this.past.length > 60) this.past.shift(); this.future = []; }
  setDoc(fn, key) { if (!this.state.doc) return; if (key !== false) this.push(key); this.setState(s => ({ doc: { ...fn(s.doc), updated: Date.now() }, hist: s.hist + 1 })); this.queueSave(); }
  patchL(id, o, key) { this.setDoc(d => ({ ...d, layers: d.layers.map(L => L.id === id ? { ...L, ...(typeof o === 'function' ? o(L) : o) } : L) }), key); }
  restore(s) { this.M.masks = s.masks; this.setState({ doc: s.doc, sel: s.doc.layers.some(L => L.id === this.state.sel) ? this.state.sel : null, hist: this.state.hist + 1 }); this.queueSave(); }
  undo = () => { if (!this.past.length) return; this.future.push(this.snap()); this.restore(this.past.pop()); this._hk = null; };
  redo = () => { if (!this.future.length) return; this.past.push(this.snap()); this.restore(this.future.pop()); this._hk = null; };
  selL() { const d = this.state.doc; return d && d.layers.find(L => L.id === this.state.sel) || null; }

  /* ---------- lag ---------- */
  addLayer(L) { this.setDoc(d => ({ ...d, layers: d.layers.concat([L]) })); this.setState({ sel: L.id, tool: 'move', tab: 'layer' }); }
  addText = () => { const d = this.state.doc, m = Math.min(d.w, d.h); this.addLayer(window.PD.textLayer({ x: d.w / 2, y: d.h / 2, size: Math.round(m * 0.08), color: this.state.newCol || (d.bg && /^#(f|e|d)/i.test(d.bg) ? '#111111' : '#ffffff') })); };
  addShape(kind) { const d = this.state.doc, m = Math.min(d.w, d.h), sq = kind !== 'rect' && kind !== 'line' && kind !== 'arrow', nm = (window.PD.SHAPES.find(x => x[0] === kind) || [0, 'Form'])[1]; this.addLayer(window.PD.shapeLayer({ kind, name: T(nm), x: d.w / 2, y: d.h / 2, w: m * 0.4, h: kind === 'line' ? Math.max(4, m * 0.012) : sq ? m * 0.4 : m * 0.25, ...(this.state.newCol ? { fill: this.state.newCol } : {}) })); }
  addGrad = () => { const d = this.state.doc; this.addLayer(window.PD.shapeLayer({ name: T('Toning'), kind: 'rect', x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, fill: 'rgba(0,0,0,0)', fill2: this.state.newCol || '#000000', gAng: 180 })); };
  addGlow = () => { const d = this.state.doc, m = Math.min(d.w, d.h); this.addLayer(window.PD.glowLayer({ name: T('Lys'), x: d.w / 2, y: d.h / 2, w: m * 0.9, h: m * 0.9, color: this.state.newCol || '#f5b82c' })); };
  setCol(L, key, v, hk) { if (!L) return; const old = String(L[key] || '').toLowerCase(); if (this.state.linkCol && /^#[0-9a-f]{6}$/.test(old)) { const K = ['color', 'fill', 'fill2', 'strokeC', 'barColor', 'tint']; this.setDoc(d => ({ ...d, bg: String(d.bg || '').toLowerCase() === old ? v : d.bg, bg2: String(d.bg2 || '').toLowerCase() === old ? v : d.bg2, layers: d.layers.map(q => { const o = {}; K.forEach(k => { if (String(q[k] || '').toLowerCase() === old) o[k] = v; }); return Object.keys(o).length ? { ...q, ...o } : q; }) }), hk); } else this.patchL(L.id, { [key]: v }, hk); }
  setNewCol(v) { try { if (v) localStorage.setItem('photodesign.newcol', v); else localStorage.removeItem('photodesign.newcol'); } catch (e) {} this.setState({ newCol: v }); }
  setVig(o, k) { this.setDoc(q => ({ ...q, vig: { on: false, amt: 0.6, size: 0.55, color: '#000000', top: false, ...(q.vig || {}), ...o } }), k); }
  trimEdges = async () => {
    const PD = window.PD, L = this.selL(); if (!L || !L.src) return; const E = this.M.media[L.src]; if (!E) return;
    const c = PD.mk(E.w, E.h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(E.img, 0, 0); const mc = this.M.masks[L.id]; if (mc) { g.globalCompositeOperation = 'destination-in'; g.drawImage(mc, 0, 0, E.w, E.h); }
    let px; try { px = g.getImageData(0, 0, E.w, E.h).data; } catch (e) { this.flash('Bildet kunne ikke leses.'); return; }
    let x0 = E.w, y0 = E.h, x1 = -1, y1 = -1; for (let y = 0; y < E.h; y++) { const r = y * E.w * 4; for (let x = 0; x < E.w; x++) if (px[r + x * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; } }
    if (x1 < 0) { this.flash('Bildet er helt gjennomsiktig.'); return; } const bw = x1 - x0 + 1, bh = y1 - y0 + 1; if (bw >= E.w - 1 && bh >= E.h - 1) { this.flash('Bildet har ingen tomme kanter.'); return; }
    const o = PD.mk(bw, bh); o.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh); const blob = await new Promise(r => o.toBlob(r, 'image/png')); if (!blob) return; const E2 = await PD.loadImg(blob), key = PD.uid('m'); this.M.media[key] = E2; PD.store.putMedia(key, blob).catch(() => {});
    const s = Math.max(L.w / E.w, L.h / E.h) * (L.cz || 1), vw = L.w / s, vh = L.h / s, mx = (E.w - vw) / 2, my = (E.h - vh) / 2, cl = v => Math.max(-1, Math.min(1, v || 0)), csx = mx + cl(L.cx) * mx + vw / 2, csy = my + cl(L.cy) * my + vh / 2;
    let ox = (x0 + bw / 2 - csx) * s * (L.flipX ? -1 : 1), oy = (y0 + bh / 2 - csy) * s * (L.flipY ? -1 : 1); const a = (L.rot || 0) * Math.PI / 180, rx = ox * Math.cos(a) - oy * Math.sin(a), ry = ox * Math.sin(a) + oy * Math.cos(a);
    delete this.M.masks[L.id]; this.patchL(L.id, { src: key, mask: null, w: bw * s, h: bh * s, x: L.x + rx, y: L.y + ry, cz: 1, cx: 0, cy: 0 }); this.flash('Tomme kanter er fjernet.');
  };
  showWhole = () => { const L = this.selL(), E = L && L.src && this.M.media[L.src]; if (!E) return; const k = Math.max(L.w, L.h) / Math.max(E.w, E.h); this.patchL(L.id, { w: E.w * k, h: E.h * k, cz: 1, cx: 0, cy: 0 }); };
  saveCats(c, fn) { try { localStorage.setItem('photodesign.cats', JSON.stringify(c)); localStorage.setItem('photodesign.tplcat', c[c.length - 1]); } catch (e) {} this.setState({ cats: c, tplCat: c[c.length - 1] }, fn); }
  newCat = () => { const v = (prompt(T('Navn på kategorien')) || '').trim().slice(0, 40); if (!v) return; if (this.state.cats.includes(v)) { this.setState({ tplCat: v }); this.flash('Kategorien er allerede lagret.'); return; } this.saveCats(this.state.cats.concat([v]).slice(0, 20), () => this.flash('Kategorien er opprettet.')); };
  saveTpl = async () => {
    const PD = window.PD, d = this.state.doc, S = this.state; if (!d) return; const cat = S.tplCat && S.cats.includes(S.tplCat) ? S.tplCat : S.cats[0];
    if (S.projects.filter(p => p.tpl && p.cat === cat).length >= 5) { this.flash('Maks 5 maler per kategori. Slett en mal først.'); return; }
    const nm = (prompt(T('Navn på malen'), d.name || '') || '').trim().slice(0, 60); if (!nm) return;
    await this.saveNow(); const tw = 360, sc = tw / Math.max(d.w, d.h), tc = PD.mk(d.w * sc, d.h * sc); PD.render(tc.getContext('2d'), d, sc, this.M, { preview: 600, noPh: false });
    try { await PD.store.put({ ...JSON.parse(JSON.stringify(d)), id: PD.uid('p'), tpl: true, cat, name: nm, updated: Date.now(), thumb: tc.toDataURL('image/jpeg', 0.8) }); this.flash('Malen er lagret.'); this.refresh(); } catch (e) { this.flash('Kunne ikke lagre. Nettleseren kan være full.'); }
  };
  async openTpl(p) { await this.open({ ...p, id: window.PD.uid('p'), tpl: false, cat: null, updated: Date.now() }); this.queueSave(); }
  async delTpl(p) { if (!window.confirm(T('Slette malen?') + '\n' + p.name)) return; try { await window.PD.store.del(p); } catch (e) {} this.refresh(); }
  backupPick = () => { this.bkFileRef.current && this.bkFileRef.current.click(); };
  backupDl = async () => {
    const PD = window.PD; this.flash('Lager sikkerhetskopi …');
    try { const all = await PD.store.list(), media = {}, rd = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });
      for (const p of all) for (const L of (p.layers || []).concat(p.back && p.back.layers || [])) for (const k of [L.src, L.mask]) if (k && !media[k]) { const b = await PD.store.getMedia(k); if (b) media[k] = await rd(b); }
      const blob = new Blob([JSON.stringify({ app: 'photodesign', v: 1, date: new Date().toISOString(), projects: all, media })], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'photo-design-sikkerhetskopi-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); this.flash('Sikkerhetskopien er lastet ned.');
    } catch (e) { this.flash('Kunne ikke lage sikkerhetskopi.'); }
  };
  onBackupFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; const PD = window.PD;
    if (!/\.json$/i.test(f.name) || f.size > 800e6) { this.flash('Velg en sikkerhetskopi (JSON).'); return; }
    let o; try { o = JSON.parse(await f.text()); } catch (x) { this.flash('Filen kunne ikke leses.'); return; }
    if (!o || o.app !== 'photodesign' || !Array.isArray(o.projects)) { this.flash('Filen er ikke en sikkerhetskopi fra Photo design.'); return; }
    let n = 0; try {
      for (const [k, v] of Object.entries(o.media || {})) { const m = /^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(typeof v === 'string' ? v : ''); if (!m || !/^[\w-]{1,40}$/.test(k)) continue; const bin = atob(m[3]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await PD.store.putMedia(k, new Blob([u], { type: m[1] })); }
      for (const p of o.projects) { if (!p || typeof p.id !== 'string' || !Array.isArray(p.layers) || !(p.w > 0) || !(p.h > 0)) continue; if (p.thumb && !/^data:image\/(jpeg|png);base64,/.test(p.thumb)) p.thumb = ''; await PD.store.put(p); n++; }
    } catch (x) { this.flash('Kunne ikke gjenopprette. Nettleseren kan være full.'); return; }
    this.flash(T('Gjenopprettet') + ': ' + n); this.refresh();
  };
  async addBlob(blob, name, at) {
    const PD = window.PD, d = this.state.doc; if (!d) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type || '')) { this.flash('Bruk PNG, JPG, WebP eller GIF.'); return; }
    if (blob.size > 60e6) { this.flash('Bildet er for stort (maks 60 MB).'); return; }
    let E; try { E = await PD.loadImg(blob); } catch (e) { this.flash('Bildet kunne ikke leses.'); return; }
    const key = PD.uid('m'); this.M.media[key] = E; PD.store.putMedia(key, blob).catch(() => {});
    const rep = this._replace && d.layers.find(q => q.id === this._replace); this._replace = null;
    const tgt = at ? PD.hit(d, at[0], at[1]) : null, sl = this.selL(), ph = rep || (tgt && tgt.type === 'image' ? tgt : (!at && sl && sl.type === 'image' && !sl.src ? sl : null));
    const nm = String(name || T('Bilde')).replace(/\.[a-z0-9]+$/i, '').slice(0, 40);
    if (ph) { this.patchL(ph.id, { src: key, cz: 1, cx: 0, cy: 0, name: ph.src ? ph.name : nm, mask: null }); delete this.M.masks[ph.id]; this.setState({ sel: ph.id }); return; }
    const s = Math.min(d.w * 0.8 / E.w, d.h * 0.8 / E.h, 1e9), w = E.w * s, h = E.h * s;
    this.addLayer(PD.imageLayer({ name: nm, src: key, x: at ? at[0] : d.w / 2, y: at ? at[1] : d.h / 2, w, h }));
  }
  takeBlob(b, n) { if (this.state.view === 'edit') this.addBlob(b, n); else { this.create('blank'); setTimeout(() => this.addBlob(b, n), 60); } }
  onFile = e => { const f = [...(e.target.files || [])]; e.target.value = ''; f.forEach(x => this.addBlob(x, x.name)); };
  copyOf(L) { const n = { ...JSON.parse(JSON.stringify(L)), id: window.PD.uid(L.type[0]), name: L.name + ' ' + T('kopi'), x: L.x + 30, y: L.y + 30, grp: null }; if (this.M.masks[L.id]) { const c = window.PD.mk(this.M.masks[L.id].width, this.M.masks[L.id].height); c.getContext('2d').drawImage(this.M.masks[L.id], 0, 0); c._v = 1; this.M.masks[n.id] = c; n.mask = window.PD.uid('k'); } return n; }
  dup() {
    const ids = this.selIds(); if (!ids.length) return; if (ids.length === 1) { const L = this.selL(); if (L) this.addLayer(this.copyOf(L)); return; }
    const set = new Set(ids), gm = {}, out = this.state.doc.layers.filter(L => set.has(L.id)).map(L => { const n = this.copyOf(L); if (L.grp) n.grp = gm[L.grp] || (gm[L.grp] = window.PD.uid('g')); return n; });
    this.setDoc(d => ({ ...d, layers: d.layers.concat(out) })); this.setSel(out.map(n => n.id));
  }
  del() { const ids = new Set(this.selIds()); if (!ids.size) return; this.setDoc(d => ({ ...d, layers: d.layers.filter(L => !ids.has(L.id)) })); this.setState({ sel: null, multi: [], tool: 'move' }); }

  /* ---------- flervalg og grupper ---------- */
  selIds() { const S = this.state; if (S.sel) return [S.sel]; const d = S.doc; if (!d || !S.multi || S.multi.length < 2) return []; const has = new Set(d.layers.map(L => L.id)), m = S.multi.filter(id => has.has(id)); return m.length > 1 ? m : []; }
  setSel(ids) { const u = [...new Set(ids)]; this.setState({ sel: u.length === 1 ? u[0] : null, multi: u.length > 1 ? u : [], tool: 'move' }); }
  grpOf(L) { return L.grp ? this.state.doc.layers.filter(q => q.grp === L.grp && !q.locked && !q.hidden).map(q => q.id) : [L.id]; }
  bounds(Ls) {
    const PD = window.PD; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Ls.forEach(L => { const dm = PD.dims(L), a = (L.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), hw = dm.w / 2, hh = dm.h / 2;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v]) => { const x = L.x + u * hw * c - v * hh * s, y = L.y + u * hw * s + v * hh * c; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }); });
    return { x0, y0, x1, y1 };
  }
  group = () => { const ids = this.selIds(); if (ids.length < 2) return; const g = window.PD.uid('g'), set = new Set(ids); this.setDoc(d => ({ ...d, layers: d.layers.map(L => set.has(L.id) ? { ...L, grp: g } : L) })); this.flash('Lagene er gruppert. De flyttes og skaleres nå sammen.'); };
  ungroup = () => { const d = this.state.doc, gs = new Set(d.layers.filter(L => this.selIds().includes(L.id) && L.grp).map(L => L.grp)); if (!gs.size) return; this.setDoc(q => ({ ...q, layers: q.layers.map(L => gs.has(L.grp) ? { ...L, grp: null } : L) })); this.flash('Gruppen er delt opp.'); };
  marquee(e, p0, base, onClick) {
    let moved = false;
    this.track(e, ev => { const p = this.pt(ev); if (!moved && Math.hypot(p[0] - p0[0], p[1] - p0[1]) < 4 / this.sc()) return; moved = true; this.setState({ marq: [p0[0], p0[1], p[0], p[1]] }); },
      () => { const m = this.state.marq; this.setState({ marq: null }); if (!moved || !m) { if (onClick) onClick(); else this.setSel(base); return; }
        const x0 = Math.min(m[0], m[2]), x1 = Math.max(m[0], m[2]), y0 = Math.min(m[1], m[3]), y1 = Math.max(m[1], m[3]), ids = base.slice();
        this.state.doc.layers.forEach(L => { if (L.locked || L.hidden) return; const b = this.bounds([L]); if (b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1) this.grpOf(L).forEach(id => ids.push(id)); });
        this.setSel(ids); });
  }
  dragMany(e, ids, p0) {
    const d = this.state.doc, set = new Set(ids), orig = {}; d.layers.forEach(L => { if (set.has(L.id) && !L.locked) orig[L.id] = [L.x, L.y]; });
    const b = this.bounds(d.layers.filter(L => orig[L.id])), cx0 = (b.x0 + b.x1) / 2, cy0 = (b.y0 + b.y1) / 2, th = 8 / this.sc(); let moved = false;
    this.track(e, ev => { const p = this.pt(ev); let dx = p[0] - p0[0], dy = p[1] - p0[1]; if (!moved && Math.hypot(dx, dy) < 2 / this.sc()) return; if (!moved) { moved = true; this.push(); }
      const gx = !ev.altKey && Math.abs(cx0 + dx - d.w / 2) < th, gy = !ev.altKey && Math.abs(cy0 + dy - d.h / 2) < th; if (gx) dx = d.w / 2 - cx0; if (gy) dy = d.h / 2 - cy0;
      this.setState(s => ({ doc: { ...s.doc, layers: s.doc.layers.map(q => orig[q.id] ? { ...q, x: Math.round((orig[q.id][0] + dx) * 10) / 10, y: Math.round((orig[q.id][1] + dy) * 10) / 10 } : q) }, guides: { x: gx, y: gy } })); },
      () => { this.setState({ guides: { x: false, y: false } }); if (moved) this.queueSave(); });
  }
  /* skalerer alle valgte lag likt ut fra motsatt hjørne, så forholdet mellom dem aldri endres */
  groupScale(e, sx, sy) {
    e.preventDefault(); e.stopPropagation(); const set = new Set(this.selIds()), Ls = this.state.doc.layers.filter(L => set.has(L.id) && !L.locked); if (!Ls.length) return; this.push();
    const b = this.bounds(Ls), O = [sx < 0 ? b.x1 : sx > 0 ? b.x0 : (b.x0 + b.x1) / 2, sy < 0 ? b.y1 : sy > 0 ? b.y0 : (b.y0 + b.y1) / 2], bw = Math.max(1, b.x1 - b.x0), bh = Math.max(1, b.y1 - b.y0), orig = {}, K = ['size', 'w', 'h', 'strokeW', 'radius', 'ls', 'barH'];
    Ls.forEach(L => { orig[L.id] = L; });
    this.track(e, ev => { const p = this.pt(ev), f = Math.max(0.02, sx ? (p[0] - O[0]) * sx / bw : 0, sy ? (p[1] - O[1]) * sy / bh : 0);
      this.setState(s => ({ doc: { ...s.doc, layers: s.doc.layers.map(q => { const L = orig[q.id]; if (!L) return q; const o = { x: O[0] + (L.x - O[0]) * f, y: O[1] + (L.y - O[1]) * f }; K.forEach(k => { if (typeof L[k] === 'number') o[k] = L[k] * f; }); return { ...q, ...o }; }) } })); },
      () => this.queueSave());
  }
  centerSel() { const set = new Set(this.selIds()), d = this.state.doc, b = this.bounds(d.layers.filter(L => set.has(L.id))), dx = d.w / 2 - (b.x0 + b.x1) / 2, dy = d.h / 2 - (b.y0 + b.y1) / 2; this.setDoc(q => ({ ...q, layers: q.layers.map(L => set.has(L.id) && !L.locked ? { ...L, x: L.x + dx, y: L.y + dy } : L) })); }
  move(id, dir) { this.setDoc(d => { const a = d.layers.slice(), i = a.findIndex(L => L.id === id), j = i + dir; if (i < 0 || j < 0 || j >= a.length) return d; const t = a[i]; a[i] = a[j]; a[j] = t; return { ...d, layers: a }; }); }
  FILLM = ['none', 'solid', 'linear', 'mirror', 'radial', 'conic', 'mesh', 'stripes', 'wave', 'ellipse', 'corner', 'spot', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner'];
  fillStops(f) {
    const hx = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;
    let st = Array.isArray(f && f.stops) ? f.stops.filter(q => q && hx(q.c)).slice(0, 6).map(q => ({ c: q.c, p: Math.max(0, Math.min(1, Number(q.p) || 0)), w: Math.max(0, Math.min(1, Number(q.w) || 0)), hard: !!q.hard })) : [];
    if (st.length < 2) st = [{ c: hx(f && f.c1) || '#1a2b4c', p: 0 }, { c: hx(f && f.c2) || '#080808', p: 1 }];
    return st;
  }
  fillFromBg(d) { const c = /^#[0-9a-f]{6}$/i.test(d.bg || '') ? d.bg : null; if (!c) return { mode: 'none', stops: [{ c: '#1a2b4c', p: 0 }, { c: '#080808', p: 1 }] }; return d.bg2 ? { mode: 'linear', angle: d.bgAng == null ? 135 : d.bgAng, stops: [{ c, p: 0 }, { c: d.bg2, p: 1 }] } : { mode: 'solid', stops: [{ c, p: 0 }, { c: '#080808', p: 1 }] }; }
  harmonyColors(n) { const h0 = Math.random() * 360, sch = [30, 150, 180, 120][Math.floor(Math.random() * 4)], hx = (h, s, l) => { const k = x => (x + h / 30) % 12, a = s * Math.min(l, 1 - l), f = x => Math.round(255 * (l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1)))).toString(16).padStart(2, '0'); return '#' + f(0) + f(8) + f(4); };
    return Array.from({ length: Math.max(1, n) }, (_, i) => hx((h0 + (i % 2 ? sch : 0) + i * 12) % 360, 0.45 + Math.random() * 0.35, n === 1 ? 0.45 : 0.18 + 0.55 * (n > 1 ? i / (n - 1) : 0.5))); }
  fillVals(d) {
    const S = this.state, f = d.fill || this.fillFromBg(d), mode = this.FILLM.includes(f.mode) ? f.mode : 'none';
    const stops = this.fillStops(f), ang = f.angle == null ? 135 : f.angle;
    const put = p => this.setDoc(q => { const cur = q.fill || this.fillFromBg(q), nf = { mode: 'linear', angle: 135, ...cur, stops: this.fillStops(cur), ...p }, s0 = this.fillStops(nf); return { ...q, fill: nf, bg: nf.mode === 'none' ? null : s0.slice().sort((x, y) => x.p - y.p)[0].c, bg2: null }; }, 'fill');
    const setStop = (i, p) => { const l = stops.map((q, j) => j === i ? { ...q, ...p } : q); put({ stops: l }); };
    const css = (() => { const ss = stops.slice().sort((a, b) => a.p - b.p), li = ss.map(q => q.c + ' ' + Math.round(q.p * 100) + '%').join(', ');
      if (mode === 'solid') return ss[0].c; if (mode === 'radial') return 'radial-gradient(circle at 50% 50%, ' + li + ')';
      if (mode === 'conicRep' || mode === 'conicMirror' || mode === 'rays' || mode === 'conicCorner') { const n = mode === 'conicCorner' ? 1 : Math.max(1, Math.round(f.repeat || (mode === 'rays' ? 8 : 3))), seg = 360 / n, a = ang * Math.PI / 180, at = mode === 'conicCorner' ? Math.round(50 + 50 * Math.sin(a)) + '% ' + Math.round(50 - 50 * Math.cos(a)) + '%' : '50% 50%';
        const body = mode === 'rays' ? ss.map((q, i) => q.c + ' ' + (i / ss.length * seg).toFixed(1) + 'deg ' + ((i + 1) / ss.length * seg).toFixed(1) + 'deg').join(', ') : mode === 'conicMirror' ? ss.map(q => q.c + ' ' + (q.p * seg / 2).toFixed(1) + 'deg').join(', ') + ', ' + ss.slice().reverse().map(q => q.c + ' ' + (seg - q.p * seg / 2).toFixed(1) + 'deg').join(', ') : ss.map(q => q.c + ' ' + (q.p * seg).toFixed(1) + 'deg').join(', ') + ', ' + ss[0].c + ' ' + seg.toFixed(1) + 'deg';
        return 'repeating-conic-gradient(from ' + Math.round(ang) + 'deg at ' + at + ', ' + body + ')'; }
      if (mode === 'conic') return 'conic-gradient(from ' + Math.round(ang) + 'deg, ' + li + ', ' + ss[0].c + ')';
      if (mode === 'mirror') return 'linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map(q => q.c + ' ' + Math.round(q.p * 50) + '%').join(', ') + ', ' + ss.slice().reverse().map(q => q.c + ' ' + Math.round(100 - q.p * 50) + '%').join(', ') + ')';
      if (mode === 'stripes') { const n = Math.max(1, Math.round(f.repeat || 1)), seg = 100 / n; return 'repeating-linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map((q, i) => q.c + ' ' + (i / ss.length * seg).toFixed(2) + '% ' + ((i + 1) / ss.length * seg).toFixed(2) + '%').join(', ') + ')'; }
      if (mode === 'wave') return 'repeating-linear-gradient(' + Math.round(ang) + 'deg, ' + ss.map(q => q.c + ' ' + Math.round(q.p * 33) + '%').join(', ') + ', ' + ss[0].c + ' 33%)';
      if (mode === 'ellipse') return 'radial-gradient(ellipse at 50% 50%, ' + li + ')';
      if (mode === 'corner') { const a = ang * Math.PI / 180; return 'radial-gradient(circle at ' + Math.round(50 + 50 * Math.sin(a)) + '% ' + Math.round(50 - 50 * Math.cos(a)) + '%, ' + li + ')'; }
      if (mode === 'spot') return 'radial-gradient(circle at 50% 42%, ' + ss.map(q => q.c + ' ' + Math.round(q.p * 55) + '%').join(', ') + ')';
      if (mode === 'glow') { const a = ang * Math.PI / 180, n = Math.max(1, ss.length - 1); return ss.slice(0, -1).map((q, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return 'radial-gradient(circle at ' + Math.round(50 + Math.sin(a) * (t - 0.5) * 80) + '% ' + Math.round(50 - Math.cos(a) * (t - 0.5) * 80) + '%, ' + q.c + ', transparent 60%)'; }).join(', ') + ', ' + ss[ss.length - 1].c; }
      if (mode === 'mesh') { const PP = [[15, 20], [85, 25], [80, 85], [20, 80], [50, 50], [50, 10]]; return ss.map((q, i) => 'radial-gradient(circle at ' + PP[i % 6][0] + '% ' + PP[i % 6][1] + '%, ' + q.c + ', transparent 70%)').join(', ') + ', ' + ss[ss.length - 1].c; }
      return 'linear-gradient(' + Math.round(ang) + 'deg, ' + li + ')'; })();
    return {
      fillModes: [['none', 'Ingen'], ['solid', 'Farge'], ['linear', 'Lineær'], ['mirror', 'Speilet'], ['radial', 'Rund'], ['ellipse', 'Oval'], ['conic', 'Vinkel'], ['conicRep', 'Vinkel gjentatt'], ['conicMirror', 'Vinkel speilet'], ['conicCorner', 'Vinkel fra hjørne'], ['rays', 'Stråler'], ['mesh', 'Myk blanding'], ['stripes', 'Striper'], ['wave', 'Bølger'], ['corner', 'Fra hjørne'], ['spot', 'Spotlys'], ['glow', 'Glød']].map(([v, l]) => ({ label: l, bg: mode === v ? '#f3f1ec' : 'transparent', fg: mode === v ? '#000000' : '#c9c5bc', onClick: () => put({ mode: v }) })),
      fillOn: mode !== 'none', fillMulti: mode !== 'none' && mode !== 'solid', fillAngled: ['linear', 'mirror', 'conic', 'stripes', 'wave', 'corner', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner'].includes(mode), fillPosOn: !['mesh', 'stripes', 'glow', 'rays'].includes(mode),
      fillSolidC: stops[0].c, onFillSolid: ev => { const v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setStop(0, { c: v }); }, fillSolidOnly: mode === 'solid',
      fillStopsList: (() => {
        const ord = stops.map((q, i) => ({ q, i })).sort((a, b) => a.q.p - b.q.p);
        const swap = (a, b) => { const l = stops.slice(), ca = l[a].c; l[a] = { ...l[a], c: l[b].c }; l[b] = { ...l[b], c: ca }; put({ stops: l }); };
        return ord.map(({ q, i }, k) => ({ c: q.c, pct: Math.round(q.p * 100), wPct: Math.round((q.w || 0) * 100), onW: ev => setStop(i, { w: Number(ev.target.value) / 100 }), hardBg: q.hard ? '#f3f1ec' : 'transparent', hardFg: q.hard ? '#000000' : '#9d998f', toggleHard: () => setStop(i, { hard: !q.hard }), notLast: k < ord.length - 1, num: String(k + 1), onColor: ev => { const v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setStop(i, { c: v }); }, onPos: ev => setStop(i, { p: Number(ev.target.value) / 100 }), canDel: stops.length > 2, del: () => put({ stops: stops.filter((_, j) => j !== i) }),
          upOp: k > 0 ? 1 : 0.25, downOp: k < ord.length - 1 ? 1 : 0.25, up: () => { if (k > 0) swap(i, ord[k - 1].i); }, down: () => { if (k < ord.length - 1) swap(i, ord[k + 1].i); } }));
      })(),
      fillCanAdd: stops.length < 6, fillAdd: () => { const ss = stops.slice().sort((a, b) => a.p - b.p), last = ss[ss.length - 1]; const l = ss.map((q, j) => ({ ...q, p: j / ss.length })); l.push({ c: last.c, p: 1 }); put({ stops: l }); },
      fillHarmony: () => { const cols = this.harmonyColors(stops.length); put({ stops: stops.map((q, i) => ({ ...q, c: cols[i] })) }); },
      fillHarmonyOne: () => { const cols = this.harmonyColors(1); setStop(0, { c: cols[0] }); },
      fillReverse: () => put({ stops: stops.map(q => ({ ...q, p: 1 - q.p })) }), fillEven: () => put({ stops: stops.slice().sort((a, b) => a.p - b.p).map((q, j, a) => ({ ...q, p: a.length > 1 ? j / (a.length - 1) : 0 })) }),
      fillAngle: Math.round(ang), onFillAngle: ev => put({ angle: Number(ev.target.value) }),
      fillSharp: Math.round((Number(f.sharp) || 0) * 100), onFillSharp: ev => put({ sharp: Number(ev.target.value) / 100 }), fillSharp0: () => put({ sharp: 0 }),
      fillRepOn: ['stripes', 'wave', 'conicRep', 'conicMirror', 'rays'].includes(mode), fillRep: Math.round(f.repeat || (mode === 'wave' || mode === 'conicRep' || mode === 'conicMirror' ? 3 : mode === 'rays' ? 8 : 1)), onFillRep: ev => put({ repeat: Number(ev.target.value) }),
      fillSoft: Math.round((f.soft == null ? 0.5 : f.soft) * 100), onFillSoft: ev => put({ soft: Number(ev.target.value) / 100 }), fillSoft50: () => put({ soft: 0.5 }),
      fillOpenBox: !!S.fillOpen, fillToggleBox: () => this.setState(st => ({ fillOpen: !st.fillOpen })), fillArrow: S.fillOpen ? '▴' : '▾',
      fillSummary: mode === 'none' ? 'Ingen' : (({ conicRep: 'Vinkel gjentatt', conicMirror: 'Vinkel speilet', conicCorner: 'Vinkel fra hjørne', rays: 'Stråler', solid: 'Farge', linear: 'Lineær', mirror: 'Speilet', radial: 'Rund', ellipse: 'Oval', conic: 'Vinkel', mesh: 'Myk blanding', stripes: 'Striper', wave: 'Bølger', corner: 'Fra hjørne', spot: 'Spotlys', glow: 'Glød' })[mode] || '') + (mode !== 'solid' ? ' · ' + stops.length + ' farger' : ''),
      fillPreview: css,
      fillNote: 'Bakgrunnen dekker hele bildet under alle lag.',
      fillCenter: () => put({ x: 0.5, y: 0.5 }), fillMoved: f.x != null && (Math.abs(f.x - 0.5) > 0.005 || Math.abs((f.y == null ? 0.5 : f.y) - 0.5) > 0.005)
    };
  }
  stilVals(d, sw, tog, PAL) {
    const S = this.state, v = { on: false, amt: 0.6, size: 0.55, color: '#000000', top: false, ...(d.vig || {}) }, T2 = (l, on, click) => ({ l, on, click, ...tog(on) }), cat = S.tplCat && S.cats.includes(S.tplCat) ? S.tplCat : S.cats[0];
    const R = (label, val, min, max, step, show, fn) => ({ label, min, max, step, val, show, on: e => fn(+e.target.value) });
    return { ...this.fillVals(d),
      newColAuto: () => this.setNewCol(null), ncAutoB: S.newCol ? '#2b2b2b' : '#e9e7e2', newColSw: sw(PAL.slice(0, 11), S.newCol || '', c => this.setNewCol(c)),
      linkTog: [T2('Koblede farger', !!S.linkCol, () => this.setState({ linkCol: !S.linkCol }))],
      bgTogs: [T2('Toning i bakgrunnen', !!d.bg2, () => this.setDoc(q => ({ ...q, bg: q.bg || '#ffffff', bg2: q.bg2 ? null : '#000000' })))], bgGrad: !!d.bg2, bg2Hex: d.bg2 || '#000000', onBg2: e => { const c = e.target.value; this.setDoc(q => ({ ...q, bg2: c }), 'bg2'); },
      bgRanges: d.bg2 ? [R('Vinkel', d.bgAng == null ? 135 : d.bgAng, 0, 360, 1, Math.round(d.bgAng == null ? 135 : d.bgAng) + '°', x => this.setDoc(q => ({ ...q, bgAng: x }), 'bgang'))] : [],
      vigTogs: [T2('Vignett', !!v.on, () => this.setVig({ on: !v.on }))].concat(v.on ? [T2('Over tekst', !!v.top, () => this.setVig({ top: !v.top }))] : []), vigOn: !!v.on, vigHex: v.color, onVigC: e => this.setVig({ color: e.target.value }, 'vigc'),
      vigRanges: v.on ? [R('Styrke', v.amt, 0, 1, 0.01, Math.round(v.amt * 100) + ' %', x => this.setVig({ amt: x }, 'viga')), R('Størrelse', v.size, 0, 1, 0.01, Math.round(v.size * 100) + ' %', x => this.setVig({ size: x }, 'vigs'))] : [],
      tplCatV: cat, tplCatOpts: S.cats.map(c => ({ v: c, l: c })), onTplCat: e => { try { localStorage.setItem('photodesign.tplcat', e.target.value); } catch (x) {} this.setState({ tplCat: e.target.value }); }, newCat: this.newCat, saveTpl: this.saveTpl
    };
  }
  async loadLib() {
    const items = LOGOS.map(([src, name]) => ({ src, name })); this.setState({ lib: items });
    if (window.MLCloud) { for (const f of ['logoer', 'bakgrunner']) { const c = await window.MLCloud.files(f); c.files.forEach(x => items.push({ src: x.url, name: x.name })); } const hid = (await window.MLCloud.files('logoer')).hidden; this.setState({ lib: items.filter(i => !hid.has(i.src.split('/').pop())) }); }
  }
  async fromLib(it) { try { const r = await fetch(it.src, { credentials: 'same-origin' }); if (!r.ok) throw 0; const b = await r.blob(); this.addBlob(b, it.name); } catch (e) { this.flash('Bildet kunne ikke hentes.'); } }

  /* ---------- scene ---------- */
  measure() { const el = this.stageRef.current, d = this.state.doc; if (!el || !d) return; const f = Math.max(0.02, Math.min((el.clientWidth - 60) / d.w, (el.clientHeight - 60) / d.h)); if (Math.abs(f - this.state.fit) > 1e-4) this.setState({ fit: f }); }
  sc() { return this.state.fit * this.state.zoom; }
  cmykRow(hv, set) { const PD = window.PD, c = PD.toCMYK(hv); return c.map((v, i) => ({ l: 'CMYK'[i], v, on: e => { const n = PD.toCMYK(hv); n[i] = Math.max(0, Math.min(100, Math.round(+e.target.value || 0))); set(PD.fromCMYK(n)); } })); }
  queueDraw() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); }); }
  draw() {
    const PD = window.PD; if (!PD) return; const S = this.state;
    if (S.view === 'home') { const [w, h] = this.fmtWH(), k = w + 'x' + h; if (this._tk === k) return; this._tk = k; let ok = 0;
      PD.TEMPLATES.forEach(t => { const c = this.tplEls[t.k]; if (!c) return; ok++; const d = PD.newDoc(w, h, t.k), dw = d.w, dh = d.h, s = Math.min(160 / dw, 160 / dh), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(dw * s * dpr); c.height = Math.round(dh * s * dpr); c.style.width = Math.round(dw * s) + 'px'; c.style.height = Math.round(dh * s) + 'px'; PD.render(c.getContext('2d'), d, s * dpr, { media: {}, masks: {} }, { phText: T('Bilde') }); });
      if (!ok) this._tk = null; return; }
    const c = this.canvasRef.current, d = S.doc; if (!c || !d) return; const s = this.sc(), dpr = Math.min(2, window.devicePixelRatio || 1), k = Math.min(dpr * s, 3200 / Math.max(d.w, d.h));
    const W = Math.round(d.w * k), H = Math.round(d.h * k); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    try { PD.render(c.getContext('2d'), d, k, this.M, { preview: 2000, phText: T('Dra inn et bilde') }); } catch (e) { console.warn(e); }
  }
  tplRef(k) { return this.tplRefs[k] || (this.tplRefs[k] = el => { if (el) { this.tplEls[k] = el; this._tk = null; this.queueDraw(); } else delete this.tplEls[k]; }); }
  pt(e) { const r = this.wrapRef.current.getBoundingClientRect(), s = this.sc(); return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; }

  stageDown = e => { if (e.target !== this.stageRef.current || e.button !== 0 || !this.state.doc) return; this.setState({ expOpen: false }); if (e.pointerType === 'touch') { this.setSel([]); return; } e.preventDefault(); this.marquee(e, this.pt(e), e.shiftKey || e.ctrlKey || e.metaKey ? this.selIds() : []); };
  wrapDown = e => {
    if (e.button !== 0 || !this.state.doc) return; e.preventDefault(); this.setState({ expOpen: false });
    const PD = window.PD, p = this.pt(e), S = this.state, sl = this.selL();
    if (S.tool === 'brush' && sl && sl.type === 'image' && sl.src) { this.brushStart(e, sl, p); return; }
    if (S.tool === 'crop' && sl && sl.type === 'image' && sl.src) { const lp = PD.toLocal(sl, p[0], p[1]); if (Math.abs(lp[0]) <= sl.w / 2 && Math.abs(lp[1]) <= sl.h / 2) { this.cropDrag(e, sl); return; } }
    let L = PD.hit(S.doc, p[0], p[1]); if (L && L.locked) L = null;
    const add = e.shiftKey || e.ctrlKey || e.metaKey, cur = this.selIds();
    if (!L) { this.marquee(e, p, add ? cur : []); return; }
    const g = this.grpOf(L), inSel = g.every(id => cur.includes(id));
    if (add) { this.marquee(e, p, cur, () => this.setSel(inSel ? cur.filter(id => !g.includes(id)) : cur.concat(g))); return; }
    const ids = inSel && cur.length > 1 ? cur : g;
    if (ids.length === 1) { if (L.id !== S.sel) this.setSel([L.id]); this.dragMove(e, L, p); return; }
    this.setSel(ids); this.dragMany(e, ids, p);
  };
  wrapMove = e => { if (this.state.tool === 'brush') { const p = this.pt(e); this.setState({ brushXY: p }); } };
  wrapLeave = () => { if (this.state.brushXY) this.setState({ brushXY: null }); };
  wrapDbl = e => { const L = window.PD.hit(this.state.doc, ...this.pt(e)); if (!L) return; if (L.type === 'text') { this.setState({ sel: L.id, multi: [], tab: 'layer' }, () => { const t = this.textRef.current; if (t) { t.focus(); t.select(); } }); } else if (L.type === 'image') { this.setState({ sel: L.id, multi: [], tool: this.state.tool === 'crop' ? 'move' : 'crop', tab: 'layer' }); } };
  track(e, mv, up) { const id = e.pointerId, m = ev => { if (ev.pointerId === id) mv(ev); }, u = ev => { if (ev.pointerId !== id) return; window.removeEventListener('pointermove', m); window.removeEventListener('pointerup', u); window.removeEventListener('pointercancel', u); if (up) up(ev); }; window.addEventListener('pointermove', m); window.addEventListener('pointerup', u); window.addEventListener('pointercancel', u); }
  dragMove(e, L, p0) {
    const d = this.state.doc, x0 = L.x, y0 = L.y, th = 8 / this.sc(); let moved = false;
    this.track(e, ev => { const p = this.pt(ev); let x = x0 + p[0] - p0[0], y = y0 + p[1] - p0[1]; if (!moved && Math.hypot(p[0] - p0[0], p[1] - p0[1]) < 2 / this.sc()) return; if (!moved) { moved = true; this.push(); }
      const gx = !ev.altKey && Math.abs(x - d.w / 2) < th, gy = !ev.altKey && Math.abs(y - d.h / 2) < th; if (gx) x = d.w / 2; if (gy) y = d.h / 2;
      this.setState(s => ({ doc: { ...s.doc, layers: s.doc.layers.map(q => q.id === L.id ? { ...q, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : q) }, guides: { x: gx, y: gy } })); },
      () => { this.setState({ guides: { x: false, y: false } }); if (moved) this.queueSave(); });
  }
  handleDown(e, kind, sx, sy) {
    e.preventDefault(); e.stopPropagation(); const PD = window.PD, L = this.selL(); if (!L) return; this.push();
    const dm = PD.dims(L), w0 = dm.w, h0 = dm.h, a = (L.rot || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), rot = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    const fixW = rot(-sx * w0 / 2, -sy * h0 / 2), O = [L.x + fixW[0], L.y + fixW[1]], size0 = L.size;
    this.track(e, ev => {
      const p = this.pt(ev); let o = {};
      if (kind === 'rot') { let ang = Math.atan2(p[1] - L.y, p[0] - L.x) * 180 / Math.PI + 90; ang = ((ang % 360) + 540) % 360 - 180; const sn = Math.round(ang / 15) * 15; if (ev.shiftKey || Math.abs(ang - sn) < 3) ang = sn; o = { rot: Math.round(ang * 10) / 10 }; }
      else {
        const lx = (p[0] - O[0]) * ca + (p[1] - O[1]) * sa, ly = -(p[0] - O[0]) * sa + (p[1] - O[1]) * ca;
        let nw = kind === 'edgeY' ? w0 : Math.max(8, lx * sx), nh = kind === 'edgeX' ? h0 : Math.max(8, ly * sy);
        if (kind === 'corner' && (L.type === 'text' || (L.type === 'image' ? !ev.shiftKey : ev.shiftKey))) { const f = Math.max(nw / w0, nh / h0); nw = w0 * f; nh = h0 * f; }
        const c2 = rot(kind === 'edgeY' ? 0 : sx * nw / 2, kind === 'edgeX' ? 0 : sy * nh / 2), C = [O[0] + c2[0], O[1] + c2[1]];
        o = L.type === 'text' ? { size: Math.max(6, Math.round(size0 * (kind === 'edgeY' ? nh / h0 : nw / w0) * 10) / 10), x: C[0], y: C[1] } : { w: nw, h: nh, x: C[0], y: C[1] };
      }
      this.setState(s => ({ doc: { ...s.doc, layers: s.doc.layers.map(q => q.id === L.id ? { ...q, ...o } : q) } }));
    }, () => this.queueSave());
  }
  cropDrag(e, L) {
    const PD = window.PD, E = this.M.media[L.src], p0 = this.pt(e), r = PD.cover(E.w, E.h, L.w, L.h, L.cz, 0, 0), mx = (E.w - r.sw) / 2 * r.s, my = (E.h - r.sh) / 2 * r.s, cx0 = L.cx || 0, cy0 = L.cy || 0, a = -(L.rot || 0) * Math.PI / 180; this.push();
    this.track(e, ev => { const p = this.pt(ev), dx = p[0] - p0[0], dy = p[1] - p0[1], lx = (dx * Math.cos(a) - dy * Math.sin(a)) * (L.flipX ? -1 : 1), ly = (dx * Math.sin(a) + dy * Math.cos(a)) * (L.flipY ? -1 : 1);
      const o = { cx: mx > 0.5 ? PD.clamp(cx0 - lx / mx, -1, 1) : 0, cy: my > 0.5 ? PD.clamp(cy0 - ly / my, -1, 1) : 0 }; this.setState(s => ({ doc: { ...s.doc, layers: s.doc.layers.map(q => q.id === L.id ? { ...q, ...o } : q) } })); }, () => this.queueSave());
  }
  maskFor(L, fresh) {
    const PD = window.PD, E = this.M.media[L.src], b = PD.baseOf(E, 2048), old = this.M.masks[L.id], c = PD.mk(b.width, b.height), g = c.getContext('2d');
    if (old && !fresh) g.drawImage(old, 0, 0, c.width, c.height); else if (!fresh) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    c._v = ((old && old._v) || 0) + 1; return c;
  }
  commitMask(L, c) { this.push(); this.M.masks[L.id] = c; this.setDoc(d => ({ ...d, layers: d.layers.map(q => q.id === L.id ? { ...q, mask: c ? window.PD.uid('k') : null } : q) }), false); }
  brushStart(e, L, p0) {
    const PD = window.PD, E = this.M.media[L.src], S = this.state; this.push(); const c = this.maskFor(L); this.M.masks[L.id] = c; const g = c.getContext('2d'), k = c.width / E.w;
    const r = PD.cover(E.w, E.h, L.w, L.h, L.cz, L.cx, L.cy), rad = Math.max(1, S.brush.size / 2 / r.s * k), hard = S.brush.hard;
    const toM = p => { const lp = PD.toLocal(L, p[0], p[1]); let u = lp[0] / L.w + 0.5, v = lp[1] / L.h + 0.5; if (L.flipX) u = 1 - u; if (L.flipY) v = 1 - v; return [(r.sx + u * r.sw) * k, (r.sy + v * r.sh) * k]; };
    const dab = (x, y, erase) => { const gr = g.createRadialGradient(x, y, rad * hard * 0.98, x, y, rad); const col = erase ? '0,0,0' : '255,255,255'; gr.addColorStop(0, 'rgba(' + col + ',1)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.globalCompositeOperation = erase ? 'destination-out' : 'source-over'; g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); };
    let last = toM(p0); const er0 = S.brush.mode === 'erase'; dab(last[0], last[1], er0 !== e.altKey); c._v++; this.setState(s => ({ hist: s.hist + 1 }));
    this.track(e, ev => { const p = this.pt(ev), m = toM(p), dist = Math.hypot(m[0] - last[0], m[1] - last[1]), st = Math.max(1, rad / 4), n = Math.ceil(dist / st), er = er0 !== ev.altKey;
      for (let i = 1; i <= n; i++) dab(last[0] + (m[0] - last[0]) * i / n, last[1] + (m[1] - last[1]) * i / n, er); last = m; c._v++; this.setState(s => ({ brushXY: p, hist: s.hist + 1 })); },
      () => { g.globalCompositeOperation = 'source-over'; this.setDoc(d => ({ ...d, layers: d.layers.map(q => q.id === L.id ? { ...q, mask: PD.uid('k') } : q) }), false); });
  }
  async cut(kind) {
    const L = this.selL(); if (!L || !L.src || this.state.busy) return; const E = this.M.media[L.src], files = {};
    this.setState({ busy: 'model', pct: 0 });
    const prog = p => { if (!p || p.status !== 'progress' || !p.total) return; files[p.file] = [p.loaded || 0, p.total]; const v = Object.values(files), a = v.reduce((s, x) => s + x[0], 0), b = v.reduce((s, x) => s + x[1], 0); this.setState({ busy: 'model', pct: Math.round(a / b * 100) }); };
    try { const t = setTimeout(() => this.alive && this.state.busy === 'model' && this.state.pct >= 99 && this.setState({ busy: 'run' }), 400); const m = await window.PD.cutout(E, kind, prog); clearTimeout(t); if (!m) { this.flash('Fant ikke noe tydelig motiv. Prøv den andre modellen eller bruk penselen.'); return; } m._v = ((this.M.masks[L.id] || {})._v || 0) + 1; this.commitMask(L, m); this.flash('Motivet er klippet ut. Bruk penselen for å rette opp.'); }
    catch (e) { this.flash(navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å klippe ut motivet i denne nettleseren.'); }
    finally { if (this.alive) this.setState({ busy: '', pct: 0 }); }
  }

  /* ---------- eksport ---------- */
  sidesOf(d) { const cur = { bg: d.bg, layers: d.layers }; if (!d.back) return [cur]; return d.side === 'back' ? [d.back, cur] : [cur, d.back]; }
  doPrintPDF = async () => {
    const PD = window.PD, d = this.state.doc; if (!d || this.state.busy) return; this.setState({ busy: 'exp' });
    try { const b = await PD.printPDF(this.sidesOf(d), d, this.M, { bleed: !!d.bleed }); window.MLShare.download(b, this.fname().replace(/\.\w+$/, '') + '-trykk.pdf'); this.flash(d.bleed ? 'PDF til trykk er lastet ned (CMYK, 300 dpi, 3 mm utfallende).' : 'PDF er lastet ned (CMYK, 300 dpi). Slå på utfallende hvis trykkeriet krever det.'); }
    catch (e) { console.warn(e); this.flash('Kunne ikke lage PDF.'); } finally { if (this.alive) this.setState({ busy: '' }); }
  };
  async outBlob() {
    const PD = window.PD, d = this.state.doc, x = this.state.exp, s = x.scale; if (d.w * s * d.h * s > 64e6) { this.flash('For stort. Velg 1×.'); return null; }
    const c = PD.mk(d.w * s, d.h * s); PD.render(c.getContext('2d'), d, s, this.M, { full: true, noPh: true, transparent: x.fmt === 'png' && x.t });
    if (x.fmt === 'jpg') { const j = PD.mk(c.width, c.height), g = j.getContext('2d'); g.fillStyle = d.bg || '#ffffff'; g.fillRect(0, 0, j.width, j.height); g.drawImage(c, 0, 0); const jb = await new Promise(r => j.toBlob(r, 'image/jpeg', 0.92)); if (!jb) this.flash('Bildet er for stort for denne enheten. Prøv PDF trykk.'); return jb; }
    const b = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!b) { this.flash(s > 1 ? 'For stort for denne enheten. Velg 1×.' : 'Bildet er for stort for denne enheten. Prøv JPG eller PDF trykk.'); return null; }
    return b;
  }
  fname() { const d = this.state.doc; return (String(d.name || 'bilde').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'bilde') + '.' + this.state.exp.fmt; }
  doDownload = async () => { if (this.state.exp.fmt === 'pdf') return this.doPrintPDF(); if (this.state.busy) return; this.setState({ busy: 'exp' }); try { const b = await this.outBlob(); if (b) window.MLShare.download(b, this.fname()); } catch (e) { this.flash('Eksporten feilet.'); } finally { this.setState({ busy: '' }); } };
  doCopy = async () => { const b = await this.outBlob(); if (b) this.flash(await window.MLShare.copy(b) ? 'Bildet er kopiert. Lim inn med Ctrl+V.' : 'Nettleseren tillot ikke kopiering.'); };
  doSend = async () => { const b = await this.outBlob(); if (b) { this.setState({ expOpen: false }); window.MLShare.send(b, this.fname(), 'photo'); } };

  /* ---------- tastatur og slipp ---------- */
  key(e) {
    if (this.state.view !== 'edit') return; const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable), mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(), L = this.selL();
    if (mod && k === 's') { e.preventDefault(); this.saveNow().then(() => { if (!this.dirty) this.flash('Prosjektet er lagret.'); }); return; }
    if (typing && t.type !== 'range') return;
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); this.redo(); return; }
    if (mod && k === 'd') { e.preventDefault(); this.dup(); return; }
    if (k === 'escape') { this.setState({ sel: null, multi: [], tool: 'move', expOpen: false }); return; }
    if (mod && k === 'a') { e.preventDefault(); this.setSel(this.state.doc.layers.filter(q => !q.locked && !q.hidden).map(q => q.id)); return; }
    if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) this.ungroup(); else this.group(); return; }
    const ids = this.selIds(); if (!ids.length) return;
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); this.del(); return; }
    if (k.startsWith('arrow')) { e.preventDefault(); const st = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0, set = new Set(ids); this.setDoc(d => ({ ...d, layers: d.layers.map(q => set.has(q.id) && !q.locked ? { ...q, x: q.x + dx, y: q.y + dy } : q) }), 'nudge'); return; }
    if (!L) return;
    if (L.type === 'image' && L.src && !mod) { if (k === 'b') this.setState({ tool: this.state.tool === 'brush' ? 'move' : 'brush', tab: 'cut' }); if (k === 'c') this.setState({ tool: this.state.tool === 'crop' ? 'move' : 'crop', tab: 'layer' }); if (k === 'v') this.setState({ tool: 'move' }); }
  }
  onDragOver = e => { if (![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); };
  onDragLeave = e => { if (e.currentTarget.contains(e.relatedTarget)) return; this.setState({ dragOver: false }); };
  onDrop = e => {
    e.preventDefault(); this.setState({ dragOver: false }); const f = [...(e.dataTransfer.files || [])].filter(x => /^image\//.test(x.type)); if (!f.length) return;
    if (this.state.view !== 'edit') { this.create('blank'); setTimeout(() => f.forEach(x => this.addBlob(x, x.name)), 60); return; }
    const w = this.wrapRef.current, r = w && w.getBoundingClientRect(), inside = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    f.forEach((x, i) => this.addBlob(x, x.name, inside && i === 0 ? this.pt(e) : null));
  };

  /* ---------- kurve ---------- */
  curveDown = e => {
    const L = this.selL(), svg = this.curveRef.current; if (!L || !svg) return; e.preventDefault(); const r = svg.getBoundingClientRect(), P = ev => [window.PD.clamp((ev.clientX - r.left) / r.width, 0, 1), window.PD.clamp(1 - (ev.clientY - r.top) / r.height, 0, 1)];
    let pts = (L.adj.curve || [[0, 0], [1, 1]]).map(p => [...p]); const p = P(e); let i = pts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.05);
    if (i >= 0 && e.detail >= 2 && i > 0 && i < pts.length - 1) { pts.splice(i, 1); this.patchL(L.id, q => ({ adj: { ...q.adj, curve: pts } })); return; }
    if (i < 0) { pts.push(p); pts.sort((a, b) => a[0] - b[0]); i = pts.findIndex(q => q === p || (q[0] === p[0] && q[1] === p[1])); }
    const apply = () => this.patchL(L.id, q => ({ adj: { ...q.adj, curve: pts.map(x => [...x]) } }), 'curve'); apply();
    this.track(e, ev => { const q = P(ev), lo = i === 0 ? 0 : pts[i - 1][0] + 0.01, hi = i === pts.length - 1 ? 1 : pts[i + 1][0] - 0.01; pts[i] = [i === 0 ? 0 : i === pts.length - 1 ? 1 : window.PD.clamp(q[0], lo, hi), q[1]]; apply(); });
  };

  renderVals() {
    const S = this.state, PD = window.PD, deploy = /^[a-z0-9-]+\.dc\.html$/.test(decodeURIComponent(location.pathname.split('/').pop() || ''));
    const base = { backHref: (deploy ? 'media-lab.dc.html' : 'media-lab.dc.html') + '#some', isHome: S.view !== 'edit', isEdit: S.view === 'edit', fileRef: this.fileRef, onFile: this.onFile, onDragOver: this.onDragOver, onDragLeave: this.onDragLeave, onDrop: this.onDrop, hasToast: !!S.toast, toast: S.toast };
    if (!PD) return { ...base, formats: [], tpls: [], projects: [], hasProjects: false };
    if (S.view !== 'edit') {
      const fm = PD.FORMATS.concat([{ k: 'custom', l: 'Egendefinert', w: +S.cw || 1200, h: +S.ch || 800 }]);
      return { ...base,
        formats: fm.map(f => { const on = S.fmt === f.k, s = 18 / Math.max(f.w, f.h); return { l: f.l, dim: f.w + ' × ' + f.h, iw: Math.max(6, f.w * s) + 'px', ih: Math.max(6, f.h * s) + 'px', bg: on ? '#e9e7e2' : 'rgba(12,12,12,0.6)', fg: on ? '#000000' : '#f3f1ec', border: on ? '#e9e7e2' : 'rgba(255,255,255,0.16)', click: () => { this._tk = null; this.setState({ fmt: f.k }); } }; }),
        backupDl: this.backupDl, backupPick: this.backupPick, onBackupFile: this.onBackupFile, bkFileRef: this.bkFileRef,
        ...(() => { const cat = S.tplCat && S.cats.includes(S.tplCat) ? S.tplCat : S.cats[0], mine = S.projects.filter(p => p.tpl && p.cat === cat); return {
          tplCatChips: S.cats.map(c => { const on = c === cat, n = S.projects.filter(p => p.tpl && p.cat === c).length; return { l: c + (n ? ' · ' + n : ''), noI: '1', bg: on ? '#e9e7e2' : 'rgba(12,12,12,0.6)', fg: on ? '#000000' : '#f3f1ec', border: on ? '#e9e7e2' : 'rgba(255,255,255,0.16)', click: () => { try { localStorage.setItem('photodesign.tplcat', c); } catch (e) {} this.setState({ tplCat: c }); } }; }),
          newCat: this.newCat, noMyTpls: !mine.length, myTpls: mine.map(p => ({ name: p.name, thumb: css(p.thumb), meta: p.w + ' × ' + p.h, open: () => this.openTpl(p), del: () => this.delTpl(p) })) }; })(),
        isCustom: S.fmt === 'custom', cw: S.cw, ch: S.ch, onCw: e => { this._tk = null; this.setState({ cw: e.target.value }); }, onCh: e => { this._tk = null; this.setState({ ch: e.target.value }); },
        tpls: PD.TEMPLATES.map(t => ({ l: t.l, ref: this.tplRef(t.k), click: () => this.create(t.k) })),
        hasProjects: S.projects.some(p => !p.tpl), projects: S.projects.filter(p => !p.tpl).map(p => ({ name: p.name, thumb: css(p.thumb), meta: p.w + ' × ' + p.h + ' · ' + new Date(p.updated).toLocaleDateString(), open: () => this.open(p), del: () => this.delProject(p) })) };
    }
    const d = S.doc, s = this.sc(), L = this.selL(), dm = L ? PD.dims(L) : null, isImg = !!L && L.type === 'image', isText = !!L && L.type === 'text', isShape = !!L && L.type === 'shape', isGlow = !!L && L.type === 'glow', has = !!(isImg && L.src), adj = isImg ? { ...PD.ADJ, ...L.adj } : PD.ADJ;
    const P = (o, k) => L && this.patchL(L.id, o, k), rg = (label, k, min, max, step, fmt, def, key) => ({ label, min, max, step, val: L[k], show: fmt(L[k]), on: e => P({ [k]: +e.target.value }, key || k), reset: () => P({ [k]: def }) });
    const pc = v => Math.round(v * 100) + ' %', px = v => Math.round(v) + ' px', deg = v => Math.round(v) + '°';
    let lr = [];
    if (L) { lr.push(rg('Gjennomsiktighet', 'op', 0, 1, 0.01, pc, 1)); lr.push(rg('Rotasjon', 'rot', -180, 180, 1, deg, 0));
      if (isImg && has) lr.push(rg('Zoom i utsnittet', 'cz', 1, 4, 0.01, v => Math.round(v * 100) + ' %', 1));
      if (isText) { const m = Math.min(d.w, d.h); lr = [rg('Størrelse', 'size', 6, Math.round(m * 0.4), 1, px, 96), rg('Linjeavstand', 'lh', 0.7, 2.2, 0.01, v => v.toFixed(2), 1.1), rg('Bokstavavstand', 'ls', -10, 60, 0.5, px, 0), rg('Kontur', 'strokeW', 0, 40, 0.5, px, 0), rg('Skygge', 'shadow', 0, 100, 1, v => Math.round(v), 0)].concat(lr); }
      if (isGlow) lr = [rg('Mykhet', 'soft', 0, 1, 0.01, pc, 0.6)].concat(lr);
      if (isShape) lr = [rg('Hjørneradius', 'radius', 0, Math.round(Math.min(L.w, L.h) / 2), 1, px, 0), rg('Kontur', 'strokeW', 0, 60, 0.5, px, 0)].concat(L.fill2 ? [rg('Vinkel på toning', 'gAng', 0, 360, 1, deg, 90)] : []).concat(lr); }
    const box = L && dm ? { left: (L.x - dm.w / 2) * s + 'px', top: (L.y - dm.h / 2) * s + 'px', w: dm.w * s + 'px', h: dm.h * s + 'px', rot: (L.rot || 0) + 'deg', col: S.tool === 'crop' ? '#f5b82c' : S.tool === 'brush' ? '#ff5a36' : '#3d8bff', line: S.tool === 'crop' ? 'dashed' : 'solid' } : {};
    const H = (kind, sx, sy, left, top, cur, label, round) => ({ left, top, size: kind === 'rot' ? '14px' : '12px', margin: kind === 'rot' ? '-7px 0 0 -7px' : '-6px 0 0 -6px', radius: round ? '50%' : '2px', cursor: cur, label, down: e => this.handleDown(e, kind, sx, sy) });
    const ids = this.selIds(), idSet = new Set(ids), isMulti = !L && ids.length > 1, mLs = isMulti ? d.layers.filter(q => idSet.has(q.id)) : [], mGrp = isMulti && !!mLs[0].grp && mLs.every(q => q.grp === mLs[0].grp);
    if (isMulti) { const b = this.bounds(mLs); Object.assign(box, { left: b.x0 * s + 'px', top: b.y0 * s + 'px', w: (b.x1 - b.x0) * s + 'px', h: (b.y1 - b.y0) * s + 'px', rot: '0deg', col: '#3d8bff', line: mGrp ? 'solid' : 'dashed' }); }
    const MH = (sx, sy, left, top, cur) => ({ left, top, size: '12px', margin: '-6px 0 0 -6px', radius: '2px', cursor: cur, label: 'Skaler alle', down: e => this.groupScale(e, sx, sy) });
    const handles = isMulti ? [MH(-1, -1, '0%', '0%', 'nwse-resize'), MH(1, -1, '100%', '0%', 'nesw-resize'), MH(1, 1, '100%', '100%', 'nwse-resize'), MH(-1, 1, '0%', '100%', 'nesw-resize'), MH(0, -1, '50%', '0%', 'ns-resize'), MH(1, 0, '100%', '50%', 'ew-resize'), MH(0, 1, '50%', '100%', 'ns-resize'), MH(-1, 0, '0%', '50%', 'ew-resize')] : !L || L.locked || S.tool === 'brush' ? [] : [H('corner', -1, -1, '0%', '0%', 'nwse-resize', 'Skaler'), H('corner', 1, -1, '100%', '0%', 'nesw-resize', 'Skaler'), H('corner', 1, 1, '100%', '100%', 'nwse-resize', 'Skaler'), H('corner', -1, 1, '0%', '100%', 'nesw-resize', 'Skaler')]
      .concat([H('edgeX', -1, 0, '0%', '50%', 'ew-resize', 'Bredde'), H('edgeX', 1, 0, '100%', '50%', 'ew-resize', 'Bredde'), H('edgeY', 0, -1, '50%', '0%', 'ns-resize', 'Høyde'), H('edgeY', 0, 1, '50%', '100%', 'ns-resize', 'Høyde')])
      .concat(S.tool === 'crop' ? [] : [{ ...H('rot', 0, 0, '50%', '-26px', 'grab', 'Roter', true) }]);
    const curve = adj.curve || [[0, 0], [1, 1]], cf = PD.curveFn(curve); let cp = ''; for (let i = 0; i <= 40; i++) { const x = i / 40, y = PD.clamp(cf(x), 0, 1); cp += (i ? 'L' : 'M') + (x * 100).toFixed(1) + ' ' + ((1 - y) * 100).toFixed(1); }
    const sw = (arr, cur, fn) => arr.map(v => ({ v, border: (cur || '').toLowerCase() === v ? '#e9e7e2' : '#2b2b2b', click: () => fn(v) }));
    const dfm = PD.FORMATS.find(f => f.w === d.w && f.h === d.h), bgN = !d.bg, bnt = tog(bgN), upt = tog(isText && L.upper), et = tog(S.exp.t), ast = tog(S.autosave);
    const lib = S.lib || [];
    return { ...base, ...this.fxVals(d, L), leave: this.leave, docName: d.name, onDocName: e => { const v = e.target.value.slice(0, 80); this.setDoc(q => ({ ...q, name: v }), 'name'); },
      undo: this.undo, redo: this.redo, noUndo: !this.past.length, noRedo: !this.future.length, undoOp: this.past.length ? 1 : 0.4, redoOp: this.future.length ? 1 : 0.4,
      zoomIn: () => this.setState(z => ({ zoom: Math.min(8, z.zoom * 1.25) })), zoomOut: () => this.setState(z => ({ zoom: Math.max(0.1, z.zoom / 1.25) })), zoomFit: () => this.setState({ zoom: 1 }), zoomLabel: Math.round(s * 100) + ' %',
      saved: S.saved, savedCol: S.saved === 'Ikke lagret' ? '#f5b82c' : '#6f6b64', showSaveBtn: !S.autosave, saveNow: () => this.saveNow().then(() => { if (!this.dirty) this.flash('Prosjektet er lagret.'); }), toggleAutosave: this.toggleAutosave, autosave: S.autosave, asTrack: ast.track, asKnob: S.autosave ? '13px' : '2px', asKnobBg: ast.knobBg,
      toggleExp: () => this.setState(z => ({ expOpen: !z.expOpen })), expOpen: S.expOpen,
      isPdf: S.exp.fmt === 'pdf', notPdf: S.exp.fmt !== 'pdf', pdfNote: (d.bleed ? 'CMYK · 300 dpi · 3 mm utfallende' : 'CMYK · 300 dpi · uten utfallende') + (d.back ? ' · 2 sider' : ''),
      expFmts: [['png', 'PNG'], ['jpg', 'JPG'], ['pdf', 'PDF trykk']].map(([k, l]) => ({ l, ...chip(S.exp.fmt === k), click: () => this.setState(z => ({ exp: { ...z.exp, fmt: k } })) })),
      expScales: [1, 2].map(k => ({ l: k + '× · ' + d.w * k + ' × ' + d.h * k, ...chip(S.exp.scale === k), click: () => this.setState(z => ({ exp: { ...z.exp, scale: k } })) })),
      canTransp: S.exp.fmt === 'png', expT: S.exp.t, toggleTransp: () => this.setState(z => ({ exp: { ...z.exp, t: !z.exp.t } })), tTrack: et.track, tKnob: et.knob, tKnobBg: et.knobBg,
      dlLabel: S.busy === 'exp' ? 'Lager …' : 'Last ned', doDownload: this.doDownload, doCopy: this.doCopy, doSend: this.doSend,
      cols: S.narrow ? 'minmax(0, 1fr)' : '230px minmax(0, 1fr) 290px', rows: S.narrow ? '60vh auto auto' : 'minmax(0, 1fr)', leftOrder: S.narrow ? 2 : 0, stageOrder: S.narrow ? 0 : 1, rightOrder: S.narrow ? 1 : 2,
      addBtns: [['Bilde', () => this.fileRef.current && this.fileRef.current.click()], ['Tekst', this.addText], ['Form', () => this.addShape('rect')], ['Sirkel', () => this.addShape('ellipse')], ['Toning', this.addGrad], ['Lys', this.addGlow], ['Logo', () => this.setState({ logoOpen: !S.logoOpen }), S.logoOpen], ['Delt mappe', () => window.MLShare && window.MLShare.pick((b, n) => this.addBlob(b, n), { accept: ['image'] })], ['Bibliotek', () => { const o = !S.libOpen; this.setState({ libOpen: o }); if (o && !S.lib) this.loadLib(); }, S.libOpen]]
        .map(([l, click, on]) => ({ l, click, border: on ? '#e9e7e2' : '#2b2b2b', bg: on ? '#1c1c1c' : '#121212' })),
      logoOpen: S.logoOpen, logoItems: LOGOS.map(([src, name]) => ({ name, css: css(src), click: () => this.fromLib({ src, name }) })),
      lTabs: [['lag', 'Lag'], ['stil', 'Stil'], ['fx', 'Effekter']].map(([k, l]) => ({ l, ...chip((S.ltab || 'lag') === k), click: () => this.setState({ ltab: k }) })), ltLag: (S.ltab || 'lag') === 'lag', ltStil: S.ltab === 'stil', ltFx: S.ltab === 'fx',
      libOpen: S.libOpen, libEmpty: !!S.lib && !lib.length, libItems: lib.map(it => ({ name: it.name, css: css(it.src), click: () => this.fromLib(it) })),
      ...this.stilVals(d, sw, tog, PAL), backupDl: this.backupDl, backupPick: this.backupPick, onBackupFile: this.onBackupFile, bkFileRef: this.bkFileRef,
      noLayers: !d.layers.length, layerCount: d.layers.length ? String(d.layers.length) : '',
      fxPins: d.layers.filter(q => q.type === 'fx' && !q.hidden && !q.locked).map(q => { const on = q.id === S.sel; return { on, left: (q.x / d.w * 100) + '%', top: (q.y / d.h * 100) + '%', bg: on ? '#e9e7e2' : 'rgba(0,0,0,0.55)', fg: on ? '#000000' : '#ffffff',
        down: e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); if (q.id !== S.sel) this.setState({ sel: q.id, tool: 'move', tab: 'layer' }); this.dragMove(e, q, this.pt(e)); },
        del: e => { e.preventDefault(); e.stopPropagation(); this.setDoc(dd => ({ ...dd, layers: dd.layers.filter(x => x.id !== q.id) })); this.setState({ sel: null, multi: [], tool: 'move' }); } }; }),
      layers: d.layers.slice().reverse().map(q => { const on = idSet.has(q.id); return { name: q.name, rename: v => { if (v) this.patchL(q.id, { name: v }); }, grp: !!q.grp, grpC: q.grp ? 'hsl(' + [...q.grp].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7) + ',70%,60%)' : 'transparent', icon: q.type === 'image' ? 'B' : q.type === 'text' ? 'T' : q.type === 'fx' ? '✦' : q.type === 'glow' ? '☼' : '◼', bg: on ? '#1c1c1c' : 'transparent', border: on ? '#3d8bff' : 'transparent', op: q.hidden ? 0.45 : 1,
        click: e => { if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) { const cur = this.selIds(); this.setSel(cur.includes(q.id) ? cur.filter(i => i !== q.id) : cur.concat([q.id])); } else this.setSel([q.id]); },
        dragStart: e => { this._lagDrag = q.id; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', q.id); } catch (x) {} },
        dragOver: e => { if (this._lagDrag) e.preventDefault(); },
        drop: e => { e.preventDefault(); const from = this._lagDrag; this._lagDrag = null; if (!from || from === q.id) return; this.setDoc(dd => { const a = dd.layers.slice(), fi = a.findIndex(x => x.id === from); if (fi < 0) return dd; const [m] = a.splice(fi, 1), ti = a.findIndex(x => x.id === q.id); a.splice(ti + 1, 0, m); return { ...dd, layers: a }; }); },
        up: e => { e.stopPropagation(); this.move(q.id, 1); }, down: e => { e.stopPropagation(); this.move(q.id, -1); },
        eye: e => { e.stopPropagation(); this.patchL(q.id, { hidden: !q.hidden }); }, eyeT: q.hidden ? 'Vis' : 'Skjul', eyeC: q.hidden ? '#555555' : '#c9c5bc',
        lock: e => { e.stopPropagation(); this.patchL(q.id, { locked: !q.locked }); }, lockT: q.locked ? 'Lås opp' : 'Lås', lockC: q.locked ? '#f5b82c' : '#555555',
        del: e => { e.stopPropagation(); this.setDoc(dd => ({ ...dd, layers: dd.layers.filter(x => x.id !== q.id) })); if (S.sel === q.id) this.setState({ sel: null, multi: [], tool: 'move' }); } }; }),
      stageRef: this.stageRef, wrapRef: this.wrapRef, canvasRef: this.canvasRef, stageDown: this.stageDown, wrapDown: this.wrapDown, wrapMove: this.wrapMove, wrapLeave: this.wrapLeave, wrapDbl: this.wrapDbl,
      cssW: d.w * s + 'px', cssH: d.h * s + 'px', cursor: S.tool === 'brush' ? 'none' : S.tool === 'crop' ? 'move' : 'default', guideX: S.guides.x, guideY: S.guides.y, dragOver: S.dragOver,
      hasBox: (!!L && !L.hidden) || isMulti, box, handles,
      multiBoxes: mLs.map(q => { const m = PD.dims(q); return { left: (q.x - m.w / 2) * s + 'px', top: (q.y - m.h / 2) * s + 'px', w: m.w * s + 'px', h: m.h * s + 'px', rot: (q.rot || 0) + 'deg' }; }),
      marqOn: !!S.marq, ...(S.marq ? { marqL: Math.min(S.marq[0], S.marq[2]) * s + 'px', marqT: Math.min(S.marq[1], S.marq[3]) * s + 'px', marqW: Math.abs(S.marq[2] - S.marq[0]) * s + 'px', marqH: Math.abs(S.marq[3] - S.marq[1]) * s + 'px' } : {}),
      hasMulti: isMulti, multiCount: String(ids.length), multiHint: mGrp ? 'Gruppen flyttes og skaleres som ett objekt. Dobbeltklikk på et element for å redigere det alene.' : 'Dra i hjørnene for å skalere alle likt. Grupper lagene for å låse dem sammen.',
      multiActs: isMulti ? [[mGrp ? 'Del opp gruppe' : 'Grupper', mGrp ? this.ungroup : this.group, '#f3f1ec'], ['Midtstill', () => this.centerSel(), '#f3f1ec'], ['Dupliser', () => this.dup(), '#f3f1ec'], ['Slett', () => this.del(), '#ff8f7d']].map(([l, click, fg]) => ({ l, click, fg })) : [],
      showBrush: S.tool === 'brush' && !!S.brushXY, brushX: S.brushXY ? S.brushXY[0] * s + 'px' : '0px', brushY: S.brushXY ? S.brushXY[1] * s + 'px' : '0px', brushD: S.brush.size * s + 'px',
      hasBusy: !!S.busy && S.busy !== 'exp', busyLabel: { model: 'Laster ned AI-modell …', run: 'Klipper ut motivet …', load: 'Åpner …' }[S.busy] || '', pctLabel: S.busy === 'model' && S.pct ? S.pct + ' %' : '', busyAny: !!S.busy, busyOp: S.busy ? 0.5 : 1,
      noSel: !L && !isMulti, hasSel: !!L, docFmt: dfm ? dfm.k : 'custom', docDim: d.w + ' × ' + d.h + ' px', fmtOpts: PD.FORMATS.map(f => ({ v: f.k, l: T(f.l) + ' · ' + f.w + '×' + f.h })).concat(dfm ? [] : [{ v: 'custom', l: T('Egendefinert') + ' · ' + d.w + '×' + d.h }]),
      onDocFmt: e => { const f = PD.FORMATS.find(x => x.k === e.target.value); if (!f) return; this.setDoc(q => { const kx = f.w / q.w, ky = f.h / q.h, k = Math.min(kx, ky); return { ...q, w: f.w, h: f.h, layers: q.layers.map(L2 => ({ ...L2, x: L2.x * kx, y: L2.y * ky, ...(L2.type === 'text' ? { size: L2.size * k } : { w: L2.w * k, h: L2.h * k }) })) }; }); this.setState({ zoom: 1 }, () => this.measure()); },
      bgHex: hex(d.bg || '#ffffff'), bgCmyk: this.cmykRow(d.bg || '#ffffff', v => this.setDoc(q => ({ ...q, bg: v, fill: null }), 'bg')),
      bleedOn: !!d.bleed, ...(() => { const o = tog(!!d.bleed); return { blTrack: o.track, blKnob: o.knob, blKnobBg: o.knobBg }; })(),
      toggleBleed: () => { const on = !d.bleed; this.setDoc(q => ({ ...q, bleed: on, layers: PD.bleedLayers(q.layers, q.w, q.h, on), back: q.back ? { ...q.back, layers: PD.bleedLayers(q.back.layers, q.w, q.h, on) } : q.back })); this.flash(on ? 'Bakgrunner og former som går helt ut til kanten, er forlenget 3 mm ut i utfallende område.' : 'Utfallende er slått av.'); },
      bleedNote: d.bleed ? 'Den stiplede linjen viser trygg sone. Hold tekst innenfor. Bakgrunnen fortsetter 3 mm forbi kanten ved eksport.' : 'Trykkerier krever ofte 3 mm utfallende for A4, A3 og visittkort.',
      showSafe: !!d.bleed, safeI: PD.BLEED * this.sc() + 'px', printMm: PD.mmOf(d).map(v => Math.round(v)).join(' × ') + ' mm',
      hasBack: !!d.back, backLabel: d.back ? 'Fjern bakside' : 'Legg til bakside',
      toggleBack: () => { if (d.back) { if (!confirm(T('Fjerne baksiden?'))) return; this.setDoc(q => { if (q.side === 'back') return { ...q, bg: q.back.bg, layers: q.back.layers, back: null, side: 'front' }; return { ...q, back: null, side: 'front' }; }); this.setState({ sel: null, multi: [] }); } else this.setDoc(q => ({ ...q, back: { bg: q.bg, layers: [] }, side: q.side || 'front' })); },
      sideOpts: d.back ? [['front', 'Forside'], ['back', 'Bakside']].map(([k, l]) => { const on = (d.side || 'front') === k; return { l, bg: on ? '#e9e7e2' : 'transparent', fg: on ? '#000000' : '#c9c5bc', click: () => { if (on) return; this.setDoc(q => ({ ...q, bg: q.back.bg, layers: q.back.layers, back: { bg: q.bg, layers: q.layers }, side: k })); this.setState({ sel: null, multi: [], tool: 'move' }); } }; }) : [], onBg: e => { const v = e.target.value; this.setDoc(q => ({ ...q, bg: v, fill: null }), 'bg'); }, bgSw: sw(PAL.slice(0, 8), d.bg, v => this.setDoc(q => ({ ...q, bg: v, fill: null }))), bgNone: bgN, toggleBgNone: () => this.setDoc(q => ({ ...q, bg: q.bg ? null : '#ffffff', fill: null })), bnTrack: bnt.track, bnKnob: bnt.knob, bnKnobBg: bnt.knobBg,
      selName: L ? L.name : '', onSelName: e => P({ name: e.target.value.slice(0, 60) }, 'lname'), isImg, isText, isShape, isGlow,
      gColor: isGlow ? hex(L.color) : '#ffffff', onGColor: e => this.setCol(L, 'color', e.target.value, 'gcolor'), gSw: sw(PAL, isGlow ? L.color : '', v => this.setCol(L, 'color', v)),
      barTog: isText ? [{ l: 'Understrek', on: !!L.bar, click: () => P({ bar: !L.bar, barColor: L.barColor || L.color, barH: L.barH == null ? Math.max(2, Math.round(L.size * 0.07)) : L.barH, barW: L.barW == null ? 1 : L.barW, barGap: L.barGap == null ? 1 : L.barGap }), ...tog(!!L.bar) }] : [], tBar: isText && !!L.bar, tBarC: isText ? hex(L.barColor || L.color) : '#ffffff', onTBarC: e => this.setCol(L, 'barColor', e.target.value, 'tbarc'),
      barRanges: isText && L.bar ? [rg('Tykkelse', 'barH', 1, Math.max(20, Math.round(L.size * 0.5)), 1, px, Math.round(L.size * 0.07)), rg('Bredde', 'barW', 0.1, 2, 0.01, pc, 1), rg('Avstand', 'barGap', 0, 4, 0.05, v => (v == null ? 1 : v).toFixed(2), 1)].map(f => ({ ...f, val: f.val == null ? (f.label === 'Tykkelse' ? Math.round(L.size * 0.07) : 1) : f.val, show: f.label === 'Tykkelse' ? Math.round(L.barH == null ? L.size * 0.07 : L.barH) + ' px' : f.show })) : [],
      tintTog: isImg && has ? [{ l: 'Fargelegg bildet', on: !!L.tint, click: () => P({ tint: L.tint ? null : (S.newCol || '#f5b82c') }), ...tog(!!L.tint) }] : [], hasTint: isImg && !!L.tint, tintC: isImg && L.tint ? hex(L.tint) : '#ffffff', onTint: e => this.setCol(L, 'tint', e.target.value, 'tint'), tintSw: sw(PAL, isImg ? L.tint : '', v => this.setCol(L, 'tint', v)),
      imgTabs: [['layer', 'Lag'], ['color', 'Farge'], ['cut', 'Motiv']].map(([k, l]) => ({ l, ...chip(S.tab === k), click: () => this.setState({ tab: k, tool: k === 'cut' ? S.tool : S.tool === 'brush' ? 'move' : S.tool }) })),
      secLayer: !!L && (!isImg || S.tab === 'layer'), secColor: isImg && S.tab === 'color', secCut: isImg && S.tab === 'cut',
      imgActs: !isImg ? [] : [['Bytt bilde', () => { this._replace = L.id; this.fileRef.current && this.fileRef.current.click(); }], [S.tool === 'crop' ? 'Ferdig' : 'Beskjær', () => this.setState({ tool: S.tool === 'crop' ? 'move' : 'crop' }), S.tool === 'crop'], ['Fyll lerretet', () => P({ x: d.w / 2, y: d.h / 2, w: d.w, h: d.h, rot: 0 })], ['Speil', () => P({ flipX: !L.flipX })], ['Fjern tomme kanter', this.trimEdges], ['Vis hele bildet', this.showWhole]]
        .map(([l, click, on]) => ({ l, click, border: on ? '#f5b82c' : '#2b2b2b', bg: on ? 'rgba(245,184,44,0.12)' : '#121212' })), cropOn: S.tool === 'crop',
      textRef: this.textRef, tText: isText ? L.text : '', onTText: e => P({ text: e.target.value.slice(0, 2000) }, 'text'),
      tFont: isText ? L.font : '', onTFont: e => P({ font: e.target.value }), fontOpts: PD.FONTS.map(v => ({ v })), tWeight: isText ? String(L.weight) : '400', onTWeight: e => P({ weight: +e.target.value }),
      weightOpts: [[400, 'Normal'], [500, 'Medium'], [600, 'Halvfet'], [700, 'Fet'], [800, 'Ekstra fet'], [900, 'Svart']].map(([v, l]) => ({ v: String(v), l })),
      alignOpts: [['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']].map(([k, l]) => ({ l, ...chip(isText && L.align === k), click: () => P({ align: k }) })),
      tColor: isText ? hex(L.color) : '#ffffff', tCmyk: isText ? this.cmykRow(hex(L.color), v => P({ color: v }, 'tcolor')) : [], onTColor: e => this.setCol(L, 'color', e.target.value, 'tcolor'), tSw: sw(PAL, isText ? L.color : '', v => this.setCol(L, 'color', v)),
      tUpper: isText && !!L.upper, toggleUpper: () => P({ upper: !L.upper }), upTrack: upt.track, upKnob: upt.knob, upKnobBg: upt.knobBg, tStrokeC: isText ? hex(L.strokeC) : '#000000', onTStrokeC: e => P({ strokeC: e.target.value }, 'tsc'),
      kindOpts: PD.SHAPES.map(([k, l]) => { const a = chip(isShape && (L.kind || 'rect') === k); return { l, bg: a.bg === 'transparent' ? '#121212' : a.bg, fg: a.fg === '#9d998f' ? '#f3f1ec' : a.fg, click: () => P(q => ({ kind: k, ...(k === 'line' ? { h: Math.max(2, Math.min(q.h, q.w * 0.05)) } : {}) })) }; }),
      sFill: isShape ? hex(L.fill) : '#000000', sCmyk: isShape ? this.cmykRow(hex(L.fill), v => P({ fill: v }, 'sfill')) : [], onSFill: e => this.setCol(L, 'fill', e.target.value, 'sfill'), sSw: sw(PAL, isShape ? L.fill : '', v => this.setCol(L, 'fill', v)),
      shapeToggles: !isShape ? [] : [['Ingen fyll', L.fill === 'rgba(0,0,0,0)', () => P({ fill: L.fill === 'rgba(0,0,0,0)' ? '#f5b82c' : 'rgba(0,0,0,0)' })], ['Toning', !!L.fill2, () => P({ fill2: L.fill2 ? null : '#000000' })]].map(([l, on, click]) => ({ l, on, click, ...tog(on) })),
      sGrad: isShape && !!L.fill2, sFill2: isShape ? hex(L.fill2) : '#000000', onSFill2: e => P({ fill2: e.target.value }, 'sf2'), sStrokeC: isShape ? hex(L.strokeC) : '#ffffff', onSStrokeC: e => P({ strokeC: e.target.value }, 'ssc'),
      layerRanges: lr, selBlend: L ? L.blend || 'source-over' : 'source-over', onBlend: e => P({ blend: e.target.value }), blendOpts: PD.BLENDS.map(([v, l]) => ({ v, l: T(l) })),
      selActs: [['Midtstill', () => P({ x: d.w / 2, y: d.h / 2 }), '#f3f1ec'], ['Dupliser', () => this.dup(), '#f3f1ec'], ['Slett', () => this.del(), '#ff8f7d']].concat(L && L.grp ? [['Velg gruppen', () => this.setSel(this.grpOf(L)), '#3d8bff'], ['Ta ut av gruppen', () => P({ grp: null }), '#f3f1ec']] : []).map(([l, click, fg]) => ({ l, click, fg })),
      looks: PD.LOOKS.map(([k, l, o]) => { const on = isImg && (L.look || 'none') === k; return { l, bg: on ? '#e9e7e2' : '#121212', fg: on ? '#000000' : '#f3f1ec', border: on ? '#e9e7e2' : '#2b2b2b', click: () => P({ look: k, adj: { ...PD.ADJ, ...o } }) }; }),
      resetAdj: () => P({ adj: { ...PD.ADJ }, look: 'none' }), resetCurve: () => P(q => ({ adj: { ...q.adj, curve: null } })),
      adjRanges: !isImg ? [] : ADJL.map(([k, l, mn, mx]) => ({ label: l, min: mn == null ? -100 : mn, max: mx == null ? 100 : mx, val: adj[k] || 0, show: (adj[k] > 0 && (mn == null || mn < 0) ? '+' : '') + Math.round(adj[k] || 0), on: e => { const v = +e.target.value; P(q => ({ adj: { ...q.adj, [k]: v } }), 'adj' + k); }, reset: () => P(q => ({ adj: { ...q.adj, [k]: 0 } })) })),
      curveRef: this.curveRef, curveDown: this.curveDown, curvePath: cp, curvePts: curve.map(p => ({ x: (p[0] * 100).toFixed(1), y: ((1 - p[1]) * 100).toFixed(1) })),
      cutPerson: () => this.cut('person'), cutObject: () => this.cut('object'),
      toggleBrush: () => { if (!has) { this.flash('Legg inn et bilde først.'); return; } this.setState({ tool: S.tool === 'brush' ? 'move' : 'brush' }); }, brushLabel: S.tool === 'brush' ? 'Ferdig med penselen' : 'Mal på masken', brushBorder: S.tool === 'brush' ? '#ff5a36' : '#2b2b2b', brushBg: S.tool === 'brush' ? 'rgba(255,90,54,0.12)' : '#121212',
      brushModes: [['erase', 'Fjern'], ['restore', 'Gjenopprett']].map(([k, l]) => ({ l, ...chip(S.brush.mode === k), click: () => this.setState(z => ({ brush: { ...z.brush, mode: k } })) })),
      brushRanges: [['Størrelse', 'size', 4, Math.round(Math.max(d.w, d.h) / 4), 1, v => Math.round(v) + ' px'], ['Hardhet', 'hard', 0, 0.95, 0.01, v => Math.round(v * 100) + ' %']].map(([label, k, min, max, step, f]) => ({ label, min, max, step, val: S.brush[k], show: f(S.brush[k]), on: e => { const v = +e.target.value; this.setState(z => ({ brush: { ...z.brush, [k]: v } })); } })),
      invertMask: () => { if (!has) return; const c0 = this.M.masks[L.id], c = this.maskFor(L, true), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); if (c0) { g.globalCompositeOperation = 'destination-out'; g.drawImage(c0, 0, 0, c.width, c.height); } else { g.clearRect(0, 0, c.width, c.height); } this.commitMask(L, c); },
      clearMask: () => { if (!this.M.masks[L.id]) return; this.commitMask(L, null); delete this.M.masks[L.id]; }
    };
  }
}

export default Component;
