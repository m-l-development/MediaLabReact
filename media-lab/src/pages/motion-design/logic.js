/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/motion-design.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
const KEYS = { clip: 'clips', text: 'texts', sub: 'subs', music: 'music', ov: 'ov' };
const TK = { clip: 'video', text: 'text', sub: 'subs', music: 'music', ov: 'ov' };
const LIM = { video: 4e9, image: 60e6, audio: 600e6 };
const PRESETS = [
  { l: 'Tittel', d: 'Stor overskrift', o: { text: 'Tittel', size: 130, weight: 800, upper: true, anim: 'rise' } },
  { l: 'Undertittel', d: 'Mindre linje under tittelen', o: { text: 'Undertittel', size: 56, weight: 500, y: 0.62, anim: 'fade' } },
  { l: 'Brødtekst', d: 'Lengre tekst', o: { text: 'Skriv teksten her', size: 42, weight: 400, maxW: 0.7, anim: 'fade' } },
  { l: 'Navneskilt', d: 'Navn nede til venstre', o: { text: 'Navn Navnesen', size: 54, weight: 800, color: '#111111', box: 'block', bg: '#ffffff', align: 'left', x: 0.07, y: 0.82, anim: 'slide' } },
  { l: 'Etikett', d: 'Liten merkelapp', o: { text: 'Nyhet', size: 34, weight: 800, upper: true, track: 0.16, color: '#111111', box: 'block', bg: '#f5b82c', y: 0.3, anim: 'pop' } },
  { l: 'Oppfordring', d: 'Tekst som ligner en knapp', o: { text: 'Meld deg på', size: 44, weight: 800, upper: true, track: 0.1, box: 'block', bg: '#ff5a36', y: 0.75, anim: 'pop' } },
  { l: 'Sitat', d: 'Skrives frem bokstav for bokstav', o: { text: '«Sitat her»', font: 'Playfair Display', italic: true, weight: 500, size: 80, maxW: 0.78, anim: 'type', dur: 6 } },
  { l: 'Nedtelling', d: 'Teller ned sekunder', o: { text: '10', countdown: true, cdFrom: 10, font: 'Bebas Neue', weight: 400, size: 300, anim: 'none', dur: 10 } }
];
const LOGOS = [['images/logo-symbol.png', 'Symbol'], ['images/logo.png', 'Logo'], ['images/logo-kbs.png', 'KBS'], ['images/logo-wol.png', 'WOL']];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmtT = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const fmtD = s => { s = Math.round(s || 0); const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
const css = u => u ? 'url("' + String(u).replace(/["\\\n]/g, '') + '")' : 'none';
const TRA = '#2a2a2a', TRB = '#c9c5bc';
const TRSTD = [['none', 'Hard kutt', 'linear-gradient(90deg, ' + TRA + ' 49%, #f5b82c 49% 51%, ' + TRB + ' 51%)'], ['fade', 'Kryssoverblending', 'linear-gradient(90deg, ' + TRA + ', ' + TRB + ')'], ['dip', 'Via svart', 'linear-gradient(90deg, ' + TRA + ', #000000 50%, ' + TRB + ')'],
  ['whip', 'Sveip', 'repeating-linear-gradient(90deg, ' + TRA + ' 0 7px, ' + TRB + ' 7px 10px)'], ['xzoom', 'Kryss-zoom', 'repeating-radial-gradient(circle, ' + TRA + ' 0 6px, ' + TRB + ' 6px 8px)'], ['ramp', 'Fartsrampe', 'repeating-linear-gradient(110deg, ' + TRA + ' 0 4px, ' + TRB + ' 4px 12px)'],
  ['match', 'Match cut', 'radial-gradient(circle at 30% 50%, ' + TRB + ' 14%, transparent 15%), radial-gradient(circle at 70% 50%, ' + TRA + ' 14%, transparent 15%), linear-gradient(90deg, ' + TRA + ' 50%, ' + TRB + ' 50%)'], ['mask', 'Maskering', 'linear-gradient(90deg, ' + TRB + ' 36%, #000000 44% 56%, ' + TRA + ' 64%)'],
  ['chroma', 'Kromatisk glitch', 'linear-gradient(90deg, #b8383b 0 33%, #2f9a5c 33% 66%, #3b58c4 66%)'], ['leak', 'Lyslekkasje', 'radial-gradient(circle at 40% 40%, #ffe7b0, #ff8a3c 35%, #7a1e12 70%, ' + TRA + ')'],
  ['dipw', 'Via hvitt', 'linear-gradient(90deg, ' + TRA + ', #ffffff 50%, ' + TRB + ')'], ['push-l', 'Skyv mot venstre', 'linear-gradient(90deg, ' + TRA + ' 45%, #111111 45% 55%, ' + TRB + ' 55%)'], ['cover-l', 'Dekk fra høyre', 'linear-gradient(90deg, ' + TRA + ' 55%, ' + TRB + ' 55%)'], ['wipe-r', 'Visk mot høyre', 'linear-gradient(90deg, ' + TRB + ' 50%, ' + TRA + ' 50%)'],
  ['zoom-in', 'Zoom inn', 'radial-gradient(circle, ' + TRB + ' 20%, ' + TRA + ' 72%)'], ['blur', 'Uskarp', 'linear-gradient(90deg, ' + TRA + ' 15%, ' + TRB + ' 85%)'], ['iris', 'Sirkel', 'radial-gradient(circle, ' + TRB + ' 34%, ' + TRA + ' 35%)']];
const LANEH = { text: 26, ov: 40, music: 30 }, LINKC = ['#f5b82c', '#3ccf7a', '#5b7cff', '#ff5a5f', '#c77dff', '#2ec4d6'];
const TRDUR = { whip: 0.4, match: 0.2, ramp: 0.5, xzoom: 0.6, chroma: 0.5, leak: 0.9, mask: 0.7 };
const HX = [-1, 0, 1, 1, 1, 0, -1, -1], HY = [-1, -1, -1, 0, 1, 1, 1, 0];

class Component extends DCLogic {
  canvasRef = React.createRef(); stageRef = React.createRef(); tlRef = React.createRef(); clipRowRef = React.createRef(); ovRowRef = React.createRef(); musicRowRef = React.createRef(); tlInner = React.createRef(); phRef = React.createRef(); timeRef = React.createRef();
  fileMedia = React.createRef(); fileProj = React.createRef(); fileSrt = React.createRef();
  M = { vids: {}, imgs: {} }; auds = {}; waves = {}; clip = null; urls = {}; past = []; future = []; t = 0; playing = false; rects = {}; nd = {};
  state = { secOpen: (() => { try { return JSON.parse(localStorage.getItem('motiondesign.sections') || 'null') || { 'Tid': true }; } catch (e) { return { 'Tid': true }; } })(), multi: [], vw: window.innerWidth, view: 'home', projects: [], loaded: false, fmt: null, cw: '1080', ch: '1080', tplThumbs: {}, proj: null, sel: null, t: 0, playing: false, zoom: 60, tab: 'media', replaceFor: null, exp: null,
    ai: { lang: 'norwegian', model: 'onnx-community/whisper-base', busy: false, msg: '', err: false }, msg: '', toast: '', saved: '', autosave: (() => { try { return localStorage.getItem('motiondesign.autosave') === '1'; } catch (e) { return false; } })(), pv: { w: 640, h: 360, cw: 640, ch: 360 }, narrow: false, dragOver: false, clipDrag: null, packing: false };

  componentDidMount() {
    this.alive = true;
    this.hid = document.createElement('div'); this.hid.setAttribute('aria-hidden', 'true');
    this.hid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;'; document.body.appendChild(this.hid);
    this.onResize = () => { const n = window.innerWidth < 760, w = window.innerWidth; if (n !== this.state.narrow || (w >= 1280) !== (this.state.vw >= 1280)) this.setState({ narrow: n, vw: w }); }; this.onResize();
    window.addEventListener('resize', this.onResize); window.addEventListener('keydown', this.onKey);
    this.onHide = () => { if (this._svT) this.saveNow(); }; window.addEventListener('pagehide', this.onHide);
    this.onBU = e => { if (this.dirty && this.state.view === 'edit') { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', this.onBU);
    this.raf = requestAnimationFrame(this.loop);
    this.boot();
    { const _ws = (fn, n = 0) => { if (window.MLShare) fn(); else if (n < 120) setTimeout(() => _ws(fn, n + 1), 50); }; _ws(() => { this._unr = window.MLShare.receive((b, n) => this.takeShared(b, n), { accept: ['image', 'video', 'audio'], when: () => this.state.view === 'edit' && !this.clip }); }); }
  }
  takeShared(b, n) { const f = new File([b], n || 'fil', { type: b.type }); if (this.state.view === 'edit' && this.state.proj) this.addFiles([f], 'lib'); else { this._pendFile = f; this.showToast('Åpne et prosjekt, så legges filen inn.'); } }
  pickShared = () => { if (window.MLShare) window.MLShare.pick((b, n) => this.takeShared(b, n), { accept: ['image', 'video', 'audio'] }); };
  sendFrame = async () => { const VF = window.VF, p = this.state.proj; if (!p || !window.MLShare) return; const z = VF.exportSize(p, '1080'), c = document.createElement('canvas'); c.width = z.w; c.height = z.h; try { VF.drawFrame(c.getContext('2d'), z.w, z.h, p, this.M, this.t, null); } catch (e) {} c.toBlob(b => { if (b) window.MLShare.send(b, this.fileBase(p) + '-stillbilde.png', 'motion'); }, 'image/png'); };
  sendVideo = () => { if (this._lastExp && window.MLShare) window.MLShare.send(this._lastExp.blob, this._lastExp.name, 'motion'); };
  componentWillUnmount() {
    this.alive = false; cancelAnimationFrame(this.raf); clearInterval(this._voI); if (this.vo) { try { this.vo.st.getTracks().forEach(t => t.stop()); } catch (e) {} } clearTimeout(this._toastT);
    window.removeEventListener('resize', this.onResize); window.removeEventListener('keydown', this.onKey); window.removeEventListener('pagehide', this.onHide); window.removeEventListener('beforeunload', this.onBU);
    if (this.ro) this.ro.disconnect(); this.closeMedia(); if (this.hid) this.hid.remove();
  }
  componentDidUpdate() {
    this.drawCurve();
    const tl = this.tlRef.current; if (tl && tl !== this._wEl) { if (this._wEl) this._wEl.removeEventListener('wheel', this.onTlWheel); this._wEl = tl; tl.addEventListener('wheel', this.onTlWheel, { passive: false }); }
    const el = this.stageRef.current;
    if (el && el !== this._roEl) { if (this.ro) this.ro.disconnect(); this._roEl = el; this.ro = new ResizeObserver(() => this.measure()); this.ro.observe(el); this.measure(); }
    if (!el && this._roEl) { if (this.ro) this.ro.disconnect(); this._roEl = null; }
  }
  async boot() {
    for (let i = 0; i < 200 && !window.VF; i++) await new Promise(r => setTimeout(r, 50));
    if (!window.VF) { this.setState({ msg: 'Motion design kunne ikke starte. Last siden på nytt.', loaded: true }); return; }
    if (document.fonts) window.VF.FONTS.forEach(f => { document.fonts.load('700 40px "' + f + '"').catch(() => {}); document.fonts.load('400 40px "' + f + '"').catch(() => {}); });
    await this.refresh();
    let last = null; try { last = sessionStorage.getItem('motiondesign.open'); } catch (e) {}
    if (last) { const p = this.state.projects.find(x => x.id === last); if (p) this.openProject(p); }
  }
  async refresh() {
    try { const list = await window.VF.store.list(); if (this.alive) this.setState({ projects: list, loaded: true }); }
    catch (e) { if (this.alive) this.setState({ loaded: true, msg: 'Nettleseren tillater ikke lagring her. Prøv et vanlig vindu (ikke privat).' }); }
  }
  showToast(m) { clearTimeout(this._toastT); this.setState({ toast: m }); this._toastT = setTimeout(() => this.alive && this.setState({ toast: '' }), 4200); }

  /* ---------- projects ---------- */
  pickFormat(f) { this.setState({ view: 'tpl', fmt: f, tplThumbs: {} }, () => this.genThumbs()); }
  async genThumbs() {
    const VF = window.VF, f = this.state.fmt; if (!f) return;
    try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]); } catch (e) {}
    const out = {};
    for (const tp of VF.TEMPLATES) {
      await new Promise(r => setTimeout(r, 0));
      const p = VF.create(f, tp.k), s = 420 / Math.max(f.w, f.h), c = document.createElement('canvas'); c.width = Math.round(f.w * s); c.height = Math.round(f.h * s);
      try { VF.drawFrame(c.getContext('2d'), c.width, c.height, p, { vids: {}, imgs: {} }, tp.tt, null); out[tp.k] = c.toDataURL('image/jpeg', 0.82); } catch (e) {}
    }
    if (this.alive && this.state.view === 'tpl') this.setState({ tplThumbs: out });
  }
  async pickTpl(k) {
    const VF = window.VF, p = VF.create(this.state.fmt, k);
    try { await VF.store.put(p); } catch (e) {}
    this.openProject(p);
  }
  useCustom = () => {
    const w = parseInt(this.state.cw, 10), h = parseInt(this.state.ch, 10);
    if (!(w >= 240 && w <= 4096 && h >= 240 && h <= 4096)) { this.setState({ msg: 'Bredde og høyde må være mellom 240 og 4096.' }); this.showToast('Bredde og høyde må være mellom 240 og 4096.'); return; }
    this.pickFormat({ k: 'custom', name: 'Egendefinert', ratio: w + '×' + h, w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 });
  };
  async openProject(raw) {
    const VF = window.VF; let p;
    try { p = VF.normalize(raw); } catch (e) { this.setState({ msg: 'Prosjektet kunne ikke åpnes.' }); return; }
    this.closeMedia();
    for (const m of p.media) { try { const r = await VF.store.getMedia(m.id); if (r && r.blob) { this.urls[m.id] = URL.createObjectURL(r.blob);
      if (m.kind === 'image' && /png|webp|gif/.test(r.blob.type || r.type || '') && !/^data:image\/(webp|png)/.test(m.thumb || '')) { const im = new Image(); im.src = this.urls[m.id]; try { await im.decode(); const th = this.thumbOf(im, im.naturalWidth, im.naturalHeight, true); if (th) m.thumb = th; } catch (e) {} } } } catch (e) {} }
    this.dirty = false; this.past = []; this.future = []; this.t = 0; this.playing = false; this.nd = {};
    try { sessionStorage.setItem('motiondesign.open', p.id); } catch (e) {}
    this.setState({ view: 'edit', proj: p, sel: null, t: 0, playing: false, tab: 'media', replaceFor: null, exp: null, saved: '', msg: '' }, () => { this.syncMediaEls(); setTimeout(this.fitZoom, 60); (async () => { for (const m of p.media) if (m.kind !== 'image' && this.state.proj && this.state.proj.id === p.id) await this.makeWave(m.id); })(); });
  }
  closeMedia() {
    Object.values(this.M.vids).forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch (e) {} });
    Object.values(this.auds).forEach(a => { try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {} });
    Object.values(this.urls).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    this.M = { vids: {}, imgs: {} }; this.auds = {}; this.urls = {}; this.waves = {};
  }
  leave = async () => {
    this.stop(); if (this._svT) await this.saveNow();
    else if (this.dirty) { const q = 'Du har endringer som ikke er lagret. Vil du lagre dem før du går tilbake?'; if (window.confirm(window.MLI18N ? window.MLI18N.t(q) : q)) await this.saveNow(); this.dirty = false; }
    this.closeMedia(); try { sessionStorage.removeItem('motiondesign.open'); } catch (e) {}
    this.setState({ view: 'home', proj: null, sel: null, exp: null }); this.refresh();
  };
  async delProject(p) {
    if (!confirm('Slette «' + p.name + '»? Filene i prosjektet slettes også fra nettleseren.')) return;
    const VF = window.VF;
    try { await VF.store.del(p.id); for (const m of (p.media || [])) await VF.store.delMedia(m.id).catch(() => {}); } catch (e) {}
    this.refresh();
  }
  onProjFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/\.motion$/i.test(f.name) || f.size > 8e9) { this.setState({ msg: 'Velg en .motion-prosjektfil.' }); return; }
    this.setState({ msg: 'Åpner prosjektfilen …' });
    try { const p = await window.VF.unpack(f); await window.VF.store.put(p); this.setState({ msg: '' }); this.openProject(p); }
    catch (err) { this.setState({ msg: (err && err.message) || 'Prosjektfilen kunne ikke åpnes.' }); }
  };
  saveFile = async () => {
    const p = this.state.proj; if (!p || this.state.packing) return;
    this.setState({ packing: true });
    try { const b = await window.VF.pack(p); this.download(b, this.fileBase(p) + '.motion'); this.showToast('Prosjektfilen er lastet ned med alle filene.'); }
    catch (e) { this.showToast('Prosjektfilen kunne ikke lages.'); }
    this.setState({ packing: false });
  };
  fileBase(p) { return String(p.name || 'motion-design').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'motion-design'; }
  download(blob, name) { const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }

  /* ---------- history & saving ---------- */
  pushHist() { if (!this.state.proj) return; this.past.push(JSON.stringify(this.state.proj)); if (this.past.length > 80) this.past.shift(); this.future = []; }
  setProj(fn, hist, key) {
    if (hist !== false) { const now = Date.now(); if (!key || key !== this._hk || now - this._ht > 900) this.pushHist(); this._hk = key; this._ht = now; }
    this.setState(s => { if (!s.proj) return null; const n = this.linkFollow(s.proj, fn(s.proj)), had = new Set(), pin = new Set(); ['texts', 'ov', 'music'].forEach(k => s.proj[k].forEach(x => had.add(x.id))); ['texts', 'ov', 'music'].forEach(k => (n[k] || []).forEach(x => { if (!had.has(x.id)) pin.add(x.id); })); return { proj: window.VF.fixLanes(n, pin) }; }, this.afterProj);
  }
  afterProj = () => { this.syncMediaEls(); this.queueSave(); };
  undo = () => { if (!this.past.length) return; this.future.push(JSON.stringify(this.state.proj)); this._hk = null; this.setState({ proj: JSON.parse(this.past.pop()) }, this.afterProj); };
  redo = () => { if (!this.future.length) return; this.past.push(JSON.stringify(this.state.proj)); this._hk = null; this.setState({ proj: JSON.parse(this.future.pop()) }, this.afterProj); };
  queueSave() { if (!this.state.autosave) { this.dirty = true; if (this.state.saved !== 'Ikke lagret') this.setState({ saved: 'Ikke lagret' }); return; } clearTimeout(this._svT); if (this.state.saved !== 'Lagrer …') this.setState({ saved: 'Lagrer …' }); this._svT = setTimeout(() => this.saveNow(), 900); }
  async saveNow() {
    clearTimeout(this._svT); this._svT = null; const VF = window.VF, p = this.state.proj; if (!p) return;
    let thumb = p.thumb || '';
    try { const s = 360 / Math.max(p.w, p.h), c = document.createElement('canvas'); c.width = Math.round(p.w * s); c.height = Math.round(p.h * s); const T = VF.totalDur(p); VF.drawFrame(c.getContext('2d'), c.width, c.height, p, this.M, Math.min(this.t > 0.05 ? this.t : Math.min(1.5, T / 2), T - 0.02), null); thumb = c.toDataURL('image/jpeg', 0.72); } catch (e) {}
    try { await VF.store.put({ ...p, thumb, updated: Date.now() }); this.dirty = false; if (this.alive && this.state.proj && this.state.proj.id === p.id) this.setState({ saved: 'Lagret i nettleseren' }); }
    catch (e) { if (this.alive) this.setState({ saved: 'Kunne ikke lagre' }); }
  }

  /* ---------- media elements ---------- */
  syncMediaEls() {
    const p = this.state.proj; if (!p) return;
    const vids = new Set(), mus = new Set();
    [...p.clips, ...(p.ov || [])].forEach(c => {
      if (c.kind !== 'video') return; vids.add(c.id); const url = this.urls[c.media]; if (!url) return;
      let v = this.M.vids[c.id];
      if (!v) { v = document.createElement('video'); v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); this.hid.appendChild(v); this.M.vids[c.id] = v; }
      if (v._m !== c.media) { v._m = c.media; v.src = url; }
    });
    Object.keys(this.M.vids).forEach(k => { if (!vids.has(k)) { const v = this.M.vids[k]; try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch (e) {} delete this.M.vids[k]; } });
    p.music.forEach(m => {
      mus.add(m.id); const url = this.urls[m.media]; if (!url) return;
      let a = this.auds[m.id]; if (!a) { a = new Audio(); a.preload = 'auto'; this.auds[m.id] = a; }
      if (a._m !== m.media) { a._m = m.media; a.src = url; }
    });
    Object.keys(this.auds).forEach(k => { if (!mus.has(k)) { try { this.auds[k].pause(); this.auds[k].removeAttribute('src'); } catch (e) {} delete this.auds[k]; } });
    p.media.forEach(m => { if (m.kind === 'image' && !this.M.imgs[m.id] && this.urls[m.id]) { const im = new Image(); im.src = this.urls[m.id]; this.M.imgs[m.id] = im; } });
    const ls = p.logo.src; if (ls && /^images\//.test(ls) && !this.M.imgs[ls]) { const im = new Image(); im.src = ls; this.M.imgs[ls] = im; }
  }
  pauseAll() { Object.values(this.M.vids).forEach(v => { if (!v.paused) v.pause(); }); Object.values(this.auds).forEach(a => { if (!a.paused) a.pause(); }); }

  /* ---------- playback & drawing ---------- */
  loop = now => {
    if (!this.alive) return; this.raf = requestAnimationFrame(this.loop);
    const VF = window.VF, p = this.state.proj; if (this.state.view !== 'edit' || !p || !VF || this._exporting) return;
    const T = VF.totalDur(p);
    if (this.playing) { let t = this.pt0 + (now - this.pn0) / 1000; if (t >= T) { t = T; this.t = t; this.stop(); } else this.t = t; }
    this.syncPlayback(p, T); this.draw(p); this.updPH(T);
  };
  syncPlayback(p, T) {
    const VF = window.VF, L = VF.layout(p), t = this.t, pl = this.playing, tr = p.tracks || {}, MX = VF.mixOf(p);
    if (this._vp !== p) { this._vp = p; this._vr = VF.voiced(p); }
    const sync = (v, c, start, end, vol) => {
      const sp = c.speed || 1, target = VF.srcTime(c, t - start);
      if (t >= start && t < end) {
        v.muted = !!c.muted || vol <= 0; v.volume = clamp(vol, 0, 1);
        if (pl && !c.rev) { if (Math.abs(v.playbackRate - sp) > 0.001) v.playbackRate = sp; if (v.paused) { v.currentTime = target; v.play().catch(() => {}); } else if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target; }
        else { if (!v.paused) v.pause(); if (!v.seeking && Math.abs(v.currentTime - target) > (pl ? 0.06 : 0.03)) v.currentTime = target; }
      } else {
        if (!v.paused) v.pause();
        const s0 = c.rev ? c.out - 0.02 : c.in;
        if (t < start && start - t < 1.5 && !v.seeking && Math.abs(v.currentTime - s0) > 0.05) v.currentTime = s0;
      }
    };
    L.forEach((l, i) => {
      if (l.c.kind !== 'video') return; const v = this.M.vids[l.c.id]; if (!v || !v.src) return;
      const nx = L[i + 1], tiD = i === 0 && p.tin && p.tin.type !== 'none' ? Math.min(p.tin.dur, l.dur / 2) : 0, toD = !nx && p.tout && p.tout.type !== 'none' ? Math.min(p.tout.dur, l.dur / 2) : 0;
      const gi = (l.tr ? clamp((t - l.start) / l.tr, 0, 1) : 1) * (tiD ? clamp((t - l.start) / tiD, 0, 1) : 1), go = (nx && nx.tr ? clamp((l.end - t) / nx.tr, 0, 1) : 1) * (toD ? clamp((l.end - t) / toD, 0, 1) : 1);
      const fi = l.c.afi > 0 ? clamp((t - l.start) / l.c.afi, 0, 1) : 1, fo = l.c.afo > 0 ? clamp((l.end - t) / l.c.afo, 0, 1) : 1;
      sync(v, l.c, l.start, l.end, tr.video && tr.video.hide ? 0 : l.c.vol * MX.video * gi * go * fi * fo);
    });
    (p.ov || []).forEach(o => {
      if (o.kind !== 'video') return; const v = this.M.vids[o.id]; if (!v || !v.src) return; const e = o.start + VF.ovDur(o);
      const fi = o.fadeIn > 0 ? clamp((t - o.start) / o.fadeIn, 0, 1) : 1, fo = o.fadeOut > 0 ? clamp((e - t) / o.fadeOut, 0, 1) : 1;
      sync(v, o, o.start, e, tr.ov && tr.ov.hide ? 0 : o.vol * MX.ov * fi * fo);
    });
    const mh = tr.music && tr.music.hide ? 0 : MX.music * VF.duckAt(p, t, this._vr);
    p.music.forEach(m => {
      const a = this.auds[m.id]; if (!a || !a.src) return;
      const seg = m.out - m.in, len = m.loop ? Math.max(0, T - m.start) : seg, rel = t - m.start;
      if (pl && rel >= 0 && rel < len) {
        const target = m.in + (m.loop ? rel % seg : rel), fi = m.fadeIn > 0 ? clamp(rel / m.fadeIn, 0, 1) : 1, fo = m.fadeOut > 0 ? clamp((len - rel) / m.fadeOut, 0, 1) : 1;
        a.volume = clamp(m.vol * fi * fo * mh, 0, 1);
        if (a.paused) { a.currentTime = target; a.play().catch(() => {}); } else if (Math.abs(a.currentTime - target) > 0.3) a.currentTime = target;
      } else if (!a.paused) a.pause();
    });
  }
  draw(p) {
    const c = this.canvasRef.current; if (!c || !c.width) return;
    const ctx = c.getContext('2d'); this.rects = {};
    try { window.VF.drawFrame(ctx, c.width, c.height, p, this.M, this.t, this.rects); } catch (e) {}
    const s = this.state.sel;
    const rk = s && (s.type === 'text' ? s.id : s.type === 'ov' ? 'ov:' + s.id : null);
    if (rk && this.rects[rk] && !this.xfOn()) { const r = this.rects[rk], d = Math.max(1, c.width / 800); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5 * d; ctx.setLineDash([6 * d, 4 * d]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.restore(); }
    this.drawXf(ctx, c);
  }
  updPH(T) {
    const z = this.state.zoom, ph = this.phRef.current, tm = this.timeRef.current, x = this.t * z;
    if (ph) ph.style.left = x + 'px';
    if (tm) { const s = fmtT(this.t) + ' / ' + fmtT(T); if (tm.textContent !== s) tm.textContent = s; }
    const el = this.tlRef.current; if (el && this.playing && (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40)) el.scrollLeft = Math.max(0, x - 60);
  }
  play() { const VF = window.VF, T = VF.totalDur(this.state.proj); if (this.t >= T - 0.05) this.t = 0; this.pt0 = this.t; this.pn0 = performance.now(); this.playing = true; this.setState({ playing: true }); }
  stop() { if (!this.playing) { this.pauseAll(); return; } this.playing = false; this.pauseAll(); this.setState({ playing: false, t: this.t }); }
  togglePlay = () => { if (this.playing) this.stop(); else this.play(); };
  seek(t, quiet) { const T = window.VF.totalDur(this.state.proj); this.t = clamp(t, 0, T); if (this.playing) { this.pt0 = this.t; this.pn0 = performance.now(); } if (!quiet) this.setState({ t: this.t }); }
  measure() {
    const el = this.stageRef.current, p = this.state.proj; if (!el || !p) return;
    const pad = p.h > p.w * 1.05 ? 16 : 32, aw = Math.max(40, el.clientWidth - pad), ah = Math.max(40, el.clientHeight - pad), r = p.w / p.h;
    let w = aw, h = aw / r; if (h > ah) { h = ah; w = ah * r; }
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(2, Math.round(Math.min(p.w, w * dpr))), ch = Math.max(2, Math.round(cw / r));
    const pv = this.state.pv; if (Math.abs(pv.w - w) > 0.5 || Math.abs(pv.h - h) > 0.5 || pv.cw !== cw) this.setState({ pv: { w, h, cw, ch } });
  }

  /* ---------- canvas interaction ---------- */
  canvasDown = e => {
    const VF = window.VF, c = this.canvasRef.current, p = this.state.proj; if (!c || !p) return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) * c.width / r.width, py = (e.clientY - r.top) * c.height / r.height, t = this.t;
    if (e.button === 0 && this.xfOn()) { const B = this.xfBox(this.state.xform); if (B) { const hi = this.xfHit(B, px, py, c.width / r.width, this.state.xform.mode); if (hi != null) { this.xfDrag(e, this.state.xform, B, hi, r, c); return; } } }
    const lq = this.rects.logo;
    if (e.button === 0 && lq && p.logo.on && px >= lq.x && px <= lq.x + lq.w && py >= lq.y && py <= lq.y + lq.h) {
      e.preventDefault(); const d = { x0: e.clientX, y0: e.clientY, ox: (lq.x + lq.w / 2) / c.width, oy: (lq.y + lq.h / 2) / c.height, moved: false };
      const mv = ev => { const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 3) return; if (!d.moved) { d.moved = true; this.pushHist(); } const nx = clamp(d.ox + dx / r.width, 0, 1), ny = clamp(d.oy + dy / r.height, 0, 1); this.setState(s => ({ proj: { ...s.proj, logo: { ...s.proj.logo, x: nx, y: ny } } })); };
      const up = () => { window.removeEventListener('pointermove', mv); if (d.moved) this.afterProj(); else this.setState({ tab: 'logo' }); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true }); return;
    }
    const hit = [...p.texts].sort((a, b) => (b.lane || 0) - (a.lane || 0)).reverse().find(x => t >= x.start && t < x.start + x.dur && this.rects[x.id] && px >= this.rects[x.id].x && px <= this.rects[x.id].x + this.rects[x.id].w && py >= this.rects[x.id].y && py <= this.rects[x.id].y + this.rects[x.id].h);
    const lk = k => p.tracks && p.tracks[k] && (p.tracks[k].lock || p.tracks[k].hide);
    const ovHit = (!hit || lk('text')) && !lk('ov') ? [...p.ov].sort((a, b) => (b.lane || 0) - (a.lane || 0)).reverse().find(o => { const q = this.rects['ov:' + o.id]; return t >= o.start && t < o.start + VF.ovDur(o) && q && px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h; }) : null;
    if (ovHit) {
      e.preventDefault(); this.setState(s => ({ sel: { type: 'ov', id: ovHit.id }, multi: [], replaceFor: null, xform: s.xform && s.xform.id === ovHit.id ? s.xform : null }));
      const d = { x0: e.clientX, y0: e.clientY, ox: ovHit.x, oy: ovHit.y, w: r.width, h: r.height, moved: false };
      const mv = ev => { const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 3) return; if (!d.moved) { d.moved = true; this.pushHist(); } let nx = d.ox + dx / d.w, ny = d.oy + dy / d.h; if (Math.abs(nx - 0.5) < 0.012) nx = 0.5; if (Math.abs(ny - 0.5) < 0.012) ny = 0.5; this.setState(s => ({ proj: { ...s.proj, ov: s.proj.ov.map(x => x.id === ovHit.id ? { ...x, x: nx, y: ny } : x) } })); };
      const up = () => { window.removeEventListener('pointermove', mv); if (d.moved) this.afterProj(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true }); return;
    }
    if (!hit || lk('text')) { const l = lk('video') ? null : VF.layout(p).filter(l => t >= l.start && t < l.end).pop(); this.setState(s => ({ sel: l ? { type: 'clip', id: l.c.id } : null, multi: [], replaceFor: null, xform: s.xform && l && s.xform.id === l.c.id ? s.xform : null }));
      if (l && l.c.kind !== 'color' && e.button === 0 && !lk('video')) {
        e.preventDefault(); const c0 = l.c, d = { x0: e.clientX, y0: e.clientY, ox: c0.x || 0, oy: c0.y || 0, moved: false };
        const mv = ev => { const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 4) return; if (!d.moved) { d.moved = true; this.pushHist(); } let nx = d.ox + dx / r.width, ny = d.oy + dy / r.height; if (Math.abs(nx) < 0.012) nx = 0; if (Math.abs(ny) < 0.012) ny = 0; this.setState(s => ({ proj: { ...s.proj, clips: s.proj.clips.map(x => x.id === c0.id ? { ...x, x: nx, y: ny } : x) } })); };
        const up = () => { window.removeEventListener('pointermove', mv); if (d.moved) this.afterProj(); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true });
      }
      return; }
    e.preventDefault();
    this.setState(s => ({ sel: { type: 'text', id: hit.id }, replaceFor: null, xform: s.xform && s.xform.id === hit.id ? s.xform : null }));
    const d = { id: hit.id, x0: e.clientX, y0: e.clientY, ox: hit.x, oy: hit.y, w: r.width, h: r.height, moved: false };
    const mv = ev => {
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 3) return;
      if (!d.moved) { d.moved = true; this.pushHist(); }
      let nx = d.ox + dx / d.w, ny = d.oy + dy / d.h; if (Math.abs(nx - 0.5) < 0.012) nx = 0.5; if (Math.abs(ny - 0.5) < 0.012) ny = 0.5;
      this.setState(s => ({ proj: { ...s.proj, texts: s.proj.texts.map(x => x.id === d.id ? { ...x, x: nx, y: ny } : x) } }));
    };
    const up = () => { window.removeEventListener('pointermove', mv); if (d.moved) this.afterProj(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true });
  };

  /* ---------- timeline interaction ---------- */
  timeAt(e) { const el = this.tlInner.current; if (!el) return 0; const r = el.getBoundingClientRect(); return Math.max(0, (e.clientX - r.left) / this.state.zoom); }
  rulerDown = e => {
    this.seek(this.timeAt(e));
    const mv = ev => this.seek(this.timeAt(ev), true), up = () => { window.removeEventListener('pointermove', mv); this.setState({ t: this.t }); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true });
  };
  rowDown = e => { if (e.target !== e.currentTarget) return; this.setState({ sel: null, replaceFor: null }); this.rulerDown(e); };
  startDrag(e, kind, id, edge) {
    if (e.button != null && e.button !== 0) return; e.stopPropagation(); e.preventDefault();
    const VF = window.VF, p = this.state.proj, it = p[KEYS[kind]].find(x => x.id === id); if (!it) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) { this.toggleMulti(kind, id); return; }
    if (p.tracks[TK[kind]] && p.tracks[TK[kind]].lock) { this.setState({ sel: { type: kind, id }, multi: [], replaceFor: null }); return; }
    const L = VF.layout(p), l = kind === 'clip' ? L.find(x => x.c.id === id) : null, snaps = [0, this.t];
    L.forEach(x => { if (x.c.id !== id) snaps.push(x.start, x.end); });
    p.texts.forEach(x => { if (x.id !== id) snaps.push(x.start, x.start + x.dur); });
    p.subs.forEach(x => { if (x.id !== id) snaps.push(x.start, x.end); });
    p.ov.forEach(x => { if (x.id !== id) snaps.push(x.start, x.start + VF.ovDur(x)); }); p.markers.forEach(m => snaps.push(m.t));
    this.drag = { kind, id, edge, x0: e.clientX, y0: e.clientY, p0: p, lanes0: { ...(p.lanes || {}) }, o: { ...it }, l: l ? { start: l.start, dur: l.dur } : null, moved: false, snaps };
    if (!this.state.sel || this.state.sel.id !== id) this.setState(s => ({ sel: { type: kind, id }, replaceFor: null, multi: (s.multi || []).some(m => m.id === id) ? s.multi : [] }));
    window.addEventListener('pointermove', this.onDrag); window.addEventListener('pointerup', this.endDrag, { once: true });
  }
  snapT(v) { const d = this.drag, tol = 8 / this.state.zoom; let best = v, bd = tol; d.snaps.forEach(s => { const q = Math.abs(s - v); if (q < bd) { bd = q; best = s; } }); return best; }
  onDrag = e => {
    const d = this.drag; if (!d) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) { if (Math.abs(dx) < 3 && Math.abs(dy) < 6) return; d.moved = true; this.pushHist(); }
    const ds = dx / this.state.zoom, o = d.o, K = d.kind, E = d.edge; let patch = null;
    if (K === 'clip') {
      if (!E) { this.setState({ clipDrag: { id: d.id, dx } }); return; }
      const md = (this.state.proj.media.find(m => m.id === o.media) || {}).dur || 1e9;
      const sp = o.speed || 1; if (o.kind === 'video') patch = E === 'l' ? { in: clamp(o.in + ds * sp, 0, o.out - 0.2) } : { out: clamp(o.out + ds * sp, o.in + 0.2, md) };
      else patch = { dur: Math.max(0.3, E === 'l' ? o.dur - ds : o.dur + ds) };
    } else if (K === 'text') {
      const end = o.start + o.dur;
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) };
      else if (E === 'l') { const s = clamp(this.snapT(o.start + ds), 0, end - 0.2); patch = { start: s, dur: end - s }; }
      else patch = { dur: Math.max(0.2, this.snapT(end + ds) - o.start) };
    } else if (K === 'sub') {
      if (!E) { const s = Math.max(0, this.snapT(o.start + ds)); patch = { start: s, end: s + (o.end - o.start) }; }
      else if (E === 'l') patch = { start: clamp(this.snapT(o.start + ds), 0, o.end - 0.2) };
      else patch = { end: Math.max(o.start + 0.2, this.snapT(o.end + ds)) };
    } else if (K === 'ov') {
      const md = (this.state.proj.media.find(m => m.id === o.media) || {}).dur || 1e9, sp = o.speed || 1;
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) };
      else if (o.kind === 'video') { if (E === 'l') { const i = clamp(o.in + ds * sp, 0, o.out - 0.2), st = o.start + (i - o.in) / sp; patch = st < 0 ? { in: o.in - o.start * sp, start: 0 } : { in: i, start: st }; } else patch = { out: clamp(o.out + ds * sp, o.in + 0.2, md) }; }
      else { const end = o.start + o.dur; if (E === 'l') { const s0 = clamp(this.snapT(o.start + ds), 0, end - 0.2); patch = { start: s0, dur: end - s0 }; } else patch = { dur: Math.max(0.2, this.snapT(end + ds) - o.start) }; }
    } else if (K === 'music') {
      if (!E) patch = { start: Math.max(0, this.snapT(o.start + ds)) };
      else if (E === 'l') { const i = clamp(o.in + ds, 0, o.out - 0.2), st = o.start + (i - o.in); patch = st < 0 ? { in: o.in - o.start, start: 0 } : { in: i, start: st }; }
      else patch = { out: clamp(o.out + ds, o.in + 0.2, o.srcDur) };
    }
    if (!E && LANEH[K]) { const nl = Math.max(1, (d.p0.lanes || {})[K] || 1), ln = clamp((o.lane || 0) + Math.round(dy / LANEH[K]), 0, Math.min(49, nl)); patch = { ...(patch || {}), lane: ln }; }
    if (patch) this.setState(s => {
      let q = { ...s.proj, [KEYS[K]]: s.proj[KEYS[K]].map(x => x.id === d.id ? { ...x, ...patch } : x) };
      if (patch.lane != null) q.lanes = { ...q.lanes, [K]: Math.max(d.lanes0[K] || 1, patch.lane + 1) };
      if (K !== 'clip' && !E && o.link && patch.start != null) q = this.moveLinked(q, d.p0, o.link, d.id, patch.start - o.start);
      else if (K === 'clip') q = this.linkFollow(d.p0, q);
      return { proj: q };
    });
  };
  endDrag = () => {
    window.removeEventListener('pointermove', this.onDrag); const d = this.drag; this.drag = null; if (!d) return;
    if (d.kind === 'clip' && !d.edge && d.moved && this.state.clipDrag) {
      const ds = this.state.clipDrag.dx / this.state.zoom, L = window.VF.layout(this.state.proj), ctr = d.l.start + d.l.dur / 2 + ds;
      const idx = L.filter(x => x.c.id !== d.id && x.start + x.dur / 2 < ctr).length;
      this.setState(s => { const me = s.proj.clips.find(c => c.id === d.id), arr = s.proj.clips.filter(c => c.id !== d.id); arr.splice(idx, 0, me); return { proj: this.linkFollow(s.proj, { ...s.proj, clips: arr }), clipDrag: null }; }, this.afterProj);
      return;
    }
    if (this.state.clipDrag) this.setState({ clipDrag: null });
    if (!d.moved) return;
    const pin = new Set([d.id]);
    this.setState(s => { let q = s.proj; if (d.kind === 'sub') q = { ...q, subs: [...q.subs].sort((a, b) => a.start - b.start) };
      if (LANEH[d.kind]) { const used = Math.max(1, ...q[KEYS[d.kind]].map(x => (x.lane || 0) + 1)); q = { ...q, lanes: { ...q.lanes, [d.kind]: Math.max(d.lanes0[d.kind] || 1, used) } }; }
      return { proj: window.VF.fixLanes(q, pin) }; }, this.afterProj);
  };
  fitZoom = () => { const el = this.tlRef.current, p = this.state.proj; if (!p) return; const w = el ? el.clientWidth - 30 : 900; this.setState({ zoom: clamp(w / (window.VF.totalDur(p) + 1), 4, 400) }); };

  /* ---------- files ---------- */
  okType(f) {
    const n = (f.name || '').toLowerCase(), t = f.type || '';
    if (/^video\/(mp4|webm|quicktime|x-m4v)$/.test(t) || (!t && /\.(mp4|mov|m4v|webm)$/.test(n))) return 'video';
    if (/^image\/(png|jpeg|webp|gif)$/.test(t)) return 'image';
    if (/^audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac|ogg|webm|flac|x-flac)$/.test(t) || (!t && /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(n))) return 'audio';
    return null;
  }
  thumbOf(src, w, h, alpha) { try { if (!w || !h) return ''; const s = 220 / Math.max(w, h), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s)); const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height);
    if (alpha) { let u = c.toDataURL('image/webp', 0.8); if (!/^data:image\/webp/.test(u)) u = c.toDataURL('image/png'); if (u.length < 110000) return u; g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, c.width, c.height); }
    return c.toDataURL('image/jpeg', 0.72); } catch (e) { return ''; } }
  probe(k, url) {
    return new Promise(res => {
      let done = false; const fin = v => { if (!done) { done = true; res(v); } }; setTimeout(() => fin(null), 20000);
      if (k === 'image') { const im = new Image(); im.onload = () => fin({ w: im.naturalWidth, h: im.naturalHeight, dur: 0, thumb: this.thumbOf(im, im.naturalWidth, im.naturalHeight, true) }); im.onerror = () => fin(null); im.src = url; }
      else if (k === 'audio') { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => fin(isFinite(a.duration) && a.duration > 0 ? { dur: a.duration, w: 0, h: 0, thumb: '' } : null); a.onerror = () => fin(null); a.src = url; }
      else {
        const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.playsInline = true;
        v.onloadedmetadata = () => { const d = v.duration; if (!isFinite(d) || !d) { fin(null); return; } v.onseeked = () => { fin({ dur: d, w: v.videoWidth, h: v.videoHeight, thumb: this.thumbOf(v, v.videoWidth, v.videoHeight) }); v.removeAttribute('src'); v.load(); }; v.currentTime = Math.min(1, d / 3); };
        v.onerror = () => fin(null); v.src = url;
      }
    });
  }
  async addFiles(files, mode) {
    const VF = window.VF; if (!this.state.proj) return;
    const added = []; let bad = 0, big = 0;
    for (const f of Array.from(files || []).slice(0, 50)) {
      const k = this.okType(f); if (!k) { bad++; continue; } if (f.size > LIM[k]) { big++; continue; }
      this.showToast('Leser ' + f.name + ' …');
      const id = VF.uid('m');
      try { await VF.store.putMedia(id, { blob: f, name: f.name, type: f.type }); } catch (e) { this.showToast('Nettleseren har ikke plass til filen.'); continue; }
      const url = URL.createObjectURL(f); this.urls[id] = url;
      const meta = await this.probe(k, url);
      if (!meta) { bad++; URL.revokeObjectURL(url); delete this.urls[id]; VF.store.delMedia(id).catch(() => {}); continue; }
      added.push({ id, name: f.name.slice(0, 200), kind: k, ...meta }); if (k !== 'image') setTimeout(() => this.makeWave(id, f), 50);
    }
    const notes = []; if (bad) notes.push(bad + (bad === 1 ? ' fil kunne ikke brukes' : ' filer kunne ikke brukes') + ' (bruk MP4, MOV, WebM, PNG, JPG, WebP, MP3, WAV eller M4A)'); if (big) notes.push(big + (big === 1 ? ' fil er for stor' : ' filer er for store'));
    this.showToast(notes.length ? notes.join('. ') + '.' : added.length ? (added.length === 1 ? 'Filen er lagt til.' : added.length + ' filer er lagt til.') : '');
    if (!added.length) return;
    this.setProj(p => ({ ...p, media: [...p.media, ...added] }), true, 'add');
    if (mode === 'replace' && this.state.replaceFor) { const m = added.find(x => x.kind !== 'audio'); if (m) this.replaceClip(this.state.replaceFor, m); }
    else if (mode === 'music') added.filter(m => m.kind === 'audio').forEach(m => this.addMusic(m));
    else if (mode === 'vo') added.filter(m => m.kind === 'audio').forEach(m => { const a = { ...VF.music(m, { start: this._voStart || 0 }), name: m.name, vol: 1, fadeIn: 0, fadeOut: 0 }; this.setProj(p => ({ ...p, music: [...p.music, a] }), true, 'add'); this.setState({ sel: { type: 'music', id: a.id } }); });
    else if (mode === 'logo') { const m = added.find(x => x.kind === 'image'); if (m) this.patchLogo({ src: m.id, on: true }); }
    else if (mode === 'drop') added.forEach(m => m.kind === 'audio' ? this.addMusic(m) : this.insertClip(m));
  }
  onMediaFile = e => { const fs = e.target.files; const mode = this._fileMode || 'lib'; this._fileMode = null; this.addFiles(fs, mode).finally(() => { e.target.value = ''; }); };
  pickFiles(mode, accept) { const el = this.fileMedia.current; if (!el) return; this._fileMode = mode; el.accept = accept || 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mov,.m4v,image/png,image/jpeg,image/webp,image/gif,audio/*'; el.click(); }
  onDragOver = e => { if (!e.dataTransfer || ![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); };
  onDragLeave = e => { if (e.currentTarget.contains(e.relatedTarget)) return; this.setState({ dragOver: false }); };
  onDrop = e => { e.preventDefault(); this.setState({ dragOver: false }); const fs = e.dataTransfer && e.dataTransfer.files; if (fs && fs.length) this.addFiles(fs, 'drop'); };
  onSrtFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > 5e6) { this.showToast('Filen er for stor.'); return; }
    const subs = window.VF.fromSrt(await f.text()); if (!subs.length) { this.showToast('Fant ingen undertekster i filen.'); return; }
    this.setProj(p => ({ ...p, subs })); this.showToast(subs.length + ' undertekster er importert.');
  };
  selList() { const s = this.state.sel, m = this.state.multi || [], out = [...m]; if (s && !out.some(x => x.id === s.id)) out.push(s); return out; }
  toggleMulti(kind, id) { this.setState(s => { let m = this.selList(); m = m.some(x => x.id === id) ? m.filter(x => x.id !== id) : [...m, { type: kind, id }]; return { multi: m, sel: m.length ? m[m.length - 1] : null, replaceFor: null }; }); }
  delSel = () => {
    const L = this.selList(); if (!L.length) return; const ids = new Set(L.map(x => x.id));
    this.setProj(p => { const q = { ...p }; ['clips', 'texts', 'subs', 'music', 'ov'].forEach(k => { q[k] = p[k].filter(x => !ids.has(x.id)); }); return q; }); this.setState({ sel: null, multi: [], replaceFor: null });
  };
  copySel = () => {
    const VF = window.VF, p = this.state.proj, L = this.selList(); if (!p || !L.length) return;
    const lay = VF.layout(p), items = L.map(x => { const it = p[KEYS[x.type]].find(y => y.id === x.id); return it ? { type: x.type, it: JSON.parse(JSON.stringify(it)) } : null; }).filter(Boolean);
    const st = x => x.type === 'clip' ? ((lay.find(l => l.c.id === x.it.id) || {}).start || 0) : x.it.start, sts = items.map(st);
    this.clip = { items, t0: Math.min(...sts), st: sts };
    this.showToast(items.length === 1 ? 'Kopiert. Lim inn med Ctrl+V.' : items.length + ' elementer kopiert. Lim inn med Ctrl+V.');
  };
  paste = () => {
    const c = this.clip, VF = window.VF; if (!c || !this.state.proj) return; const t = this.t, sel = [], s0 = this.state.sel;
    this.setProj(p => {
      const q = { ...p, clips: [...p.clips], texts: [...p.texts], subs: [...p.subs], music: [...p.music], ov: [...p.ov] };
      let ci = s0 && s0.type === 'clip' ? q.clips.findIndex(x => x.id === s0.id) + 1 : 0; if (ci <= 0) ci = q.clips.length;
      c.items.forEach((x, i) => {
        const n = { ...JSON.parse(JSON.stringify(x.it)), id: VF.uid(x.type[0]), link: undefined }, off = t + (c.st[i] - c.t0);
        if (x.type === 'clip') q.clips.splice(ci++, 0, n);
        else if (x.type === 'sub') { const d = n.end - n.start; n.start = off; n.end = off + d; q.subs.push(n); }
        else { n.start = off; q[KEYS[x.type]].push(n); }
        sel.push({ type: x.type, id: n.id });
      });
      q.subs.sort((a, b) => a.start - b.start); return q;
    });
    this.setState({ multi: sel.length > 1 ? sel : [], sel: sel[sel.length - 1] || null });
  };
  addMarker = () => { const VF = window.VF, m = { id: VF.uid('k'), t: this.t, label: '', color: '#ff5a36' }; this.setProj(p => ({ ...p, markers: [...p.markers, m].sort((a, b) => a.t - b.t) })); this.showToast('Markør lagt til ved ' + fmtT(this.t) + '.'); };
  toggleTrack(k, f) { this.setProj(p => ({ ...p, tracks: { ...p.tracks, [k]: { ...p.tracks[k], [f]: !p.tracks[k][f] } } })); }
  addOverlay(m) { const VF = window.VF, fr = this.state.proj, o = VF.overlay(m, { start: this.t, scale: fr.w >= fr.h ? 0.36 : 0.6, y: fr.w >= fr.h ? 0.7 : 0.3 }); this.setProj(p => ({ ...p, ov: [...p.ov, o] }), true, 'add'); this.setState({ sel: { type: 'ov', id: o.id }, multi: [] }); }
  freeze = async () => {
    const VF = window.VF, p = this.state.proj, t = this.t, L = VF.layout(p), x = this.selItem();
    const l = (x && x.type === 'clip' ? L.find(y => y.c.id === x.it.id && t >= y.start && t < y.end) : null) || [...L].reverse().find(y => t >= y.start && t < y.end && y.c.kind === 'video');
    if (!l || l.c.kind !== 'video') { this.showToast('Flytt spillehodet inn i et videoklipp.'); return; }
    const v = this.M.vids[l.c.id]; if (!v || !v.videoWidth) { this.showToast('Videoen er ikke klar ennå.'); return; }
    this.stop(); const st = VF.srcTime(l.c, t - l.start);
    if (Math.abs(v.currentTime - st) > 0.02) await new Promise(r => { const f = () => { v.removeEventListener('seeked', f); r(); }; v.addEventListener('seeked', f); setTimeout(f, 2000); v.currentTime = st; });
    const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight; cv.getContext('2d').drawImage(v, 0, 0);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92)); if (!blob) return;
    const id = VF.uid('m'); try { await VF.store.putMedia(id, { blob, name: 'Frosset bilde.jpg', type: 'image/jpeg' }); } catch (e) { this.showToast('Nettleseren har ikke plass til bildet.'); return; }
    const url = URL.createObjectURL(blob); this.urls[id] = url; const im = new Image(); im.src = url; this.M.imgs[id] = im;
    const m = { id, name: 'Frosset bilde', kind: 'image', dur: 0, w: cv.width, h: cv.height, thumb: this.thumbOf(cv, cv.width, cv.height) };
    const c = l.c, off = (t - l.start) * (c.speed || 1), keep = ['fit', 'zoom', 'fx', 'fy', 'x', 'y', 'scale', 'rot', 'flipH', 'flipV', 'crop', 'bri', 'con', 'sat', 'look', 'curves', 'cS', 'cM', 'cH', 'temp', 'tint', 'vig', 'grain', 'blur', 'dim'];
    const fr = VF.mediaClip(m, { trans: { type: 'none', dur: 0.5 }, kb: false, dur: 2 }); keep.forEach(k => { if (c[k] !== undefined) fr[k] = c[k]; });
    this.setProj(q => {
      const arr = [...q.clips], i = arr.findIndex(y => y.id === c.id), parts = [], rest = (c.out - c.in) - off;
      if (off > 0.05) parts.push(c.rev ? { ...c, in: c.out - off } : { ...c, out: c.in + off });
      parts.push(fr);
      if (rest > 0.05) parts.push(c.rev ? { ...c, id: VF.uid('c'), out: c.out - off, trans: { type: 'none', dur: 0.5 } } : { ...c, id: VF.uid('c'), in: c.in + off, trans: { type: 'none', dur: 0.5 } });
      arr.splice(i, 1, ...parts); return { ...q, media: [...q.media, m], clips: arr };
    });
    this.setState({ sel: { type: 'clip', id: fr.id }, multi: [] });
  };
  cropFields(o, B, P, out) {
    const cr = o.crop || { l: 0, t: 0, r: 0, b: 0 }, pc = v => Math.round(v * 100) + ' %';
    out.push(B.head('Beskjær'), B.range('Venstre', cr.l, 0, 0.9, 0.005, pc(cr.l), v => P({ crop: { ...cr, l: v } })), B.range('Høyre', cr.r, 0, 0.9, 0.005, pc(cr.r), v => P({ crop: { ...cr, r: v } })), B.range('Topp', cr.t, 0, 0.9, 0.005, pc(cr.t), v => P({ crop: { ...cr, t: v } })), B.range('Bunn', cr.b, 0, 0.9, 0.005, pc(cr.b), v => P({ crop: { ...cr, b: v } })));
  }
  speedFields(o, B, P, out) {
    const sp = o.speed || 1;
    out.push(B.head('Hastighet'), B.seg('Fart', String(sp), [['0.25', '¼×'], ['0.5', '½×'], ['1', '1×'], ['2', '2×'], ['4', '4×']], v => P({ speed: +v })), B.range('Egendefinert fart', sp, 0.1, 8, 0.05, sp.toFixed(2) + '×', v => P({ speed: v })), B.toggle('Spill baklengs', o.rev, v => P({ rev: v })), B.note('Lyden følger farten. Baklengs kan hakke i forhåndsvisningen, men blir jevn i eksporten.'));
  }
  moreClipFields(c, B, P, out) {
    if (c.kind === 'color') return;
    const sc = c.scale == null ? 1 : c.scale, pc = v => Math.round(v * 100) + ' %';
    out.push(B.head('Plassering og størrelse'), B.range('Størrelse', sc, 0.1, 3, 0.01, pc(sc), v => P({ scale: v })), B.range('Flytt vannrett', c.x || 0, -1, 1, 0.005, pc(c.x || 0), v => P({ x: v })), B.range('Flytt loddrett', c.y || 0, -1, 1, 0.005, pc(c.y || 0), v => P({ y: v })),
      B.range('Roter', c.rot || 0, -180, 180, 1, Math.round(c.rot || 0) + '°', v => P({ rot: v })), B.toggle('Speil vannrett', c.flipH, v => P({ flipH: v })), B.toggle('Speil loddrett', c.flipV, v => P({ flipV: v })));
    this.cropFields(c, B, P, out);
    if (c.kind === 'video') { this.speedFields(c, B, P, out); out.push(B.head('Lydtoning'), B.range('Ton inn', c.afi || 0, 0, 10, 0.1, (c.afi || 0).toFixed(1) + ' s', v => P({ afi: v })), B.range('Ton ut', c.afo || 0, 0, 10, 0.1, (c.afo || 0).toFixed(1) + ' s', v => P({ afo: v }))); }
  }
  mixFields(p, B, out) {
    const mx = window.VF.mixOf(p), pc = v => Math.round(v * 100) + ' %', M = (k, v) => this.setProj(q => ({ ...q, mix: { ...window.VF.mixOf(q), [k]: v } }), true, 'mix-' + k);
    out.push(B.head('Lydmikser'), B.range('Videoklipp', mx.video, 0, 1, 0.01, pc(mx.video), v => M('video', v)), B.range('Overlegg', mx.ov, 0, 1, 0.01, pc(mx.ov), v => M('ov', v)), B.range('Musikk', mx.music, 0, 1, 0.01, pc(mx.music), v => M('music', v)),
      B.toggle('Senk musikken under tale', mx.duck, v => M('duck', v)));
    out.push({ isSeg: true, label: '', segs: [{ l: 'Utjevn lyd i klippene', bg: 'transparent', fg: '#f3f1ec', click: this.levelClips }] });
    if (mx.duck) out.push(B.range('Demping', mx.duckAmt, 0.1, 0.95, 0.01, '−' + pc(mx.duckAmt), v => M('duckAmt', v)), B.note('Musikken senkes automatisk når videoklipp eller overlegg har lyd.'));
  }
  colorExtras(c, B, P, out) {
    const pct = v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' %';
    out.push(B.range('Temperatur', c.temp || 0, -1, 1, 0.01, pct(c.temp || 0), v => P({ temp: v })), B.range('Fargetone', c.tint || 0, -1, 1, 0.01, pct(c.tint || 0), v => P({ tint: v })),
      B.range('Uskarphet', c.blur || 0, 0, 30, 0.5, (c.blur || 0) ? (c.blur || 0).toFixed(1) + ' px' : 'Av', v => P({ blur: v })), B.range('Vignett', c.vig || 0, 0, 1, 0.01, Math.round((c.vig || 0) * 100) + ' %', v => P({ vig: v })), B.range('Filmkorn', c.grain || 0, 0, 1, 0.01, Math.round((c.grain || 0) * 100) + ' %', v => P({ grain: v })),
      { isSeg: true, label: '', segs: [{ l: 'Tilbakestill farge', bg: 'transparent', fg: '#f3f1ec', click: () => P({ bri: 0, con: 0, sat: 0, dim: 0, temp: 0, tint: 0, blur: 0, vig: 0, grain: 0, cS: 0, cM: 0, cH: 0, curves: null, look: 'none' }) }] });
  }
  ovFields(o) {
    const VF = window.VF, B = this.fb('ov', o.id), P = v => this.patch('ov', o.id, v), out = [], pc = v => Math.round(v * 100) + ' %', md = (this.state.proj.media.find(m => m.id === o.media) || {}).dur || 86400;
    if (o.kind === 'video') out.push(B.note('Lengde ' + fmtT(VF.ovDur(o)) + '. Dra i kantene på tidslinjen for å klippe.'), B.num('Start i klippet (s)', o.in, 0, Math.max(0, o.out - 0.2), 0.1, v => P({ in: v })), B.num('Slutt i klippet (s)', o.out, o.in + 0.2, md, 0.1, v => P({ out: v })));
    else out.push(B.num('Varighet (s)', o.dur, 0.2, 86400, 0.1, v => P({ dur: v })));
    out.push(B.num('Start på tidslinjen (s)', o.start, 0, 86400, 0.1, v => P({ start: v })),
      B.head('Plassering og størrelse'), B.note('Dra overlegget i forhåndsvisningen for å flytte det.'), B.range('Størrelse', o.scale, 0.05, 1.5, 0.005, pc(o.scale), v => P({ scale: v })), B.range('Vannrett', o.x, 0, 1, 0.005, pc(o.x), v => P({ x: v })), B.range('Loddrett', o.y, 0, 1, 0.005, pc(o.y), v => P({ y: v })),
      B.range('Roter', o.rot || 0, -180, 180, 1, Math.round(o.rot || 0) + '°', v => P({ rot: v })), B.range('Synlighet', o.opacity, 0, 1, 0.01, pc(o.opacity), v => P({ opacity: v })), B.toggle('Speil vannrett', o.flipH, v => P({ flipH: v })),
      B.head('Ramme'), B.range('Runde hjørner', o.radius || 0, 0, 1, 0.01, pc(o.radius || 0), v => P({ radius: v })), B.range('Kantlinje', o.border || 0, 0, 3, 0.05, (o.border || 0) ? (o.border).toFixed(2) : 'Av', v => P({ border: v })));
    if (o.border > 0) out.push(B.color('Kantfarge', o.borderColor || '#ffffff', v => P({ borderColor: v })));
    out.push(B.toggle('Skygge', o.shadow, v => P({ shadow: v })), B.select('Blandingsmodus', o.blend, VF.BLENDS, v => P({ blend: v })));
    this.cropFields(o, B, P, out);
    out.push(B.head('Inn og ut'), B.select('Animasjon', o.anim, VF.OVANIMS, v => P({ anim: v })), B.range('Ton inn', o.fadeIn || 0, 0, 5, 0.1, (o.fadeIn || 0).toFixed(1) + ' s', v => P({ fadeIn: v })), B.range('Ton ut', o.fadeOut || 0, 0, 5, 0.1, (o.fadeOut || 0).toFixed(1) + ' s', v => P({ fadeOut: v })));
    if (o.kind === 'video') { this.speedFields(o, B, P, out); out.push(B.head('Lyd'), B.toggle('Demp lyden', o.muted, v => P({ muted: v })), B.range('Volum', o.vol, 0, 1, 0.01, pc(o.vol), v => P({ vol: v }))); }
    this.keyFields(o, B, P, out);
    const pct = v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' %';
    out.push(B.head('Farge'), B.select('Fargefilter', o.look || 'none', VF.LOOKS, v => P({ look: v })), B.range('Lysstyrke', o.bri || 0, -0.6, 0.6, 0.01, pct(o.bri || 0), v => P({ bri: v })), B.range('Kontrast', o.con || 0, -0.6, 0.8, 0.01, pct(o.con || 0), v => P({ con: v })), B.range('Metning', o.sat || 0, -1, 1, 0.01, pct(o.sat || 0), v => P({ sat: v })), B.range('Uskarphet', o.blur || 0, 0, 30, 0.5, (o.blur || 0).toFixed(1) + ' px', v => P({ blur: v })));
    this.curveFields(o, B, P, out);
    return out;
  }
  async makeWave(id, blob) { if (id in this.waves) return; this.waves[id] = null; const w = await window.VF.wave(blob || await this.getBlob(id)); if (w && this.alive) { this.waves[id] = w.url; this.forceUpdate(); } }
  waveOf(c, m, Z) { const u = c.kind === 'video' && this.waves[c.media]; if (!u) return { wave: 'none', waveSize: '0 0', wavePos: '0 0', waveFlip: 'none' }; const sp = c.speed || 1; return { wave: css(u), waveSize: ((m.dur || c.out) * Z / sp) + 'px 100%', wavePos: (-c.in * Z / sp) + 'px 0', waveFlip: c.rev ? 'scaleX(-1)' : 'none' }; }
  collapse(fields) {
    const open = this.state.secOpen || {}, out = []; let cur = null;
    fields.forEach(f => {
      if (f.isHead) { cur = f.label; const o = !!open[cur]; out.push({ ...f, open: o, arrow: o ? '−' : '+', click: () => this.setState(s => { const n = { ...(s.secOpen || {}), [f.label]: !o }; try { localStorage.setItem('motiondesign.sections', JSON.stringify(n)); } catch (e) {} return { secOpen: n }; }) }); return; }
      if (!cur || open[cur]) out.push(f);
    });
    return out;
  }
  getBlob = async id => { const r = await window.VF.store.getMedia(id); return r && r.blob; };

  /* ---------- editing ---------- */
  selItem() { const s = this.state.sel, p = this.state.proj; if (!s || !p) return null; const it = p[KEYS[s.type]].find(x => x.id === s.id); return it ? { type: s.type, it } : null; }
  patch(kind, id, obj, key) { this.setProj(p => ({ ...p, [KEYS[kind]]: p[KEYS[kind]].map(x => x.id === id ? { ...x, ...obj } : x) }), true, key || kind + id); }
  patchLogo(obj) { this.setProj(p => ({ ...p, logo: { ...p.logo, ...obj } }), true, 'logo'); }
  patchSubStyle(obj) { this.setProj(p => ({ ...p, subStyle: { ...p.subStyle, ...obj } }), true, 'substyle'); }
  insertClip(m, extra) {
    const VF = window.VF, c = extra || VF.mediaClip(m), s = this.state.sel;
    this.setProj(p => { const arr = [...p.clips]; let i = s && s.type === 'clip' ? arr.findIndex(x => x.id === s.id) + 1 : 0; if (i <= 0) i = arr.length; if (!arr.length) c.trans = { type: 'none', dur: 0.5 }; arr.splice(i, 0, c); return { ...p, clips: arr }; }, true, 'add');
    this.setState({ sel: { type: 'clip', id: c.id } });
  }
  replaceClip(id, m) {
    const VF = window.VF;
    this.setProj(p => ({ ...p, clips: p.clips.map(c => { if (c.id !== id) return c; const n = VF.mediaClip(m, { id: c.id, trans: c.trans }); if (n.kind === 'image') n.dur = VF.clipDur(c); return n; }) }));
    this.setState({ replaceFor: null, sel: { type: 'clip', id } });
  }
  addMusic(m) {
    const VF = window.VF, a = VF.music(m, { start: this.state.proj.music.length ? this.t : 0 });
    this.setProj(p => ({ ...p, music: [...p.music, a] }), true, 'add'); this.setState({ sel: { type: 'music', id: a.id } });
  }
  toggleVo = async () => {
    if (this.vo) { const v = this.vo; if (v.rec.state !== 'inactive') v.rec.stop(); return; }
    let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (e) { this.showToast('Fikk ikke tilgang til mikrofonen.'); return; }
    let rec; try { rec = new MediaRecorder(st); } catch (e) { st.getTracks().forEach(t => t.stop()); this.showToast('Fikk ikke tilgang til mikrofonen.'); return; }
    const chunks = [], t0 = this.t; this.vo = { rec, st, t0, since: Date.now() };
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      st.getTracks().forEach(t => t.stop()); clearInterval(this._voI); this.vo = null; if (this.playing) this.togglePlay(); this.forceUpdate();
      if (!chunks.length) return; this.showToast('Behandler opptaket …');
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = await ac.decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer()); ac.close && ac.close();
        const d = new Date(), f = new File([window.VF.toWav(buf)], 'Voiceover ' + String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0') + '.wav', { type: 'audio/wav' });
        this._voStart = t0; await this.addFiles([f], 'vo');
      } catch (e) { this.showToast('Kunne ikke lagre opptaket.'); }
    };
    rec.start(250); this._voI = setInterval(() => this.forceUpdate(), 500); if (!this.playing) this.togglePlay(); this.forceUpdate();
  };
  levelClips = async () => {
    const VF = window.VF, p = this.state.proj, items = [];
    VF.layout(p).forEach(l => { const c = l.c; if (c.kind === 'video' && !c.muted) items.push({ k: 'clips', id: c.id, media: c.media, a: c.in, b: c.out }); });
    (p.ov || []).forEach(o => { if (o.kind === 'video' && !o.muted) items.push({ k: 'ov', id: o.id, media: o.media, a: o.in, b: o.out }); });
    if (!items.length) { this.showToast('Fant ingen lyd å utjevne.'); return; }
    this.showToast('Analyserer lyd …');
    for (const it of items) { try { it.s = await VF.audioStats(this.getBlob, it.media, it.a, it.b); } catch (e) { it.s = null; } }
    const ok = items.filter(it => it.s && it.s.rms > 0.002); if (!ok.length) { this.showToast('Fant ingen lyd å utjevne.'); return; }
    const target = Math.min(...ok.map(it => it.s.rms * Math.min(1, 0.95 / Math.max(it.s.peak, 1e-4)))), vol = {};
    ok.forEach(it => { vol[it.id] = Math.round(clamp(target / it.s.rms, 0.05, 1) * 100) / 100; });
    this.setProj(q => ({ ...q, clips: q.clips.map(c => vol[c.id] != null ? { ...c, vol: vol[c.id] } : c), ov: q.ov.map(o => vol[o.id] != null ? { ...o, vol: vol[o.id] } : o) }));
    this.showToast('Lyden er utjevnet.');
  };
  beatMarkers = async m => {
    const VF = window.VF; this.showToast('Analyserer lyd …'); let r = null;
    try { r = await VF.beats(this.getBlob, m.media, m.in, m.out); } catch (e) {}
    if (!r) { this.showToast('Fant ikke takten i sporet.'); return; }
    const T = VF.totalDur(this.state.proj), per = r.period < 0.4 ? r.period * 2 : r.period, list = [];
    for (let s = m.in + r.t0; s < m.out && list.length < 400; s += per) { const t = m.start + s - m.in; if (t > T) break; list.push({ id: VF.uid('k'), t, label: 'Takt', color: '#f5b82c' }); }
    this.setProj(q => ({ ...q, markers: [...q.markers.filter(k => k.label !== 'Takt'), ...list].sort((a, b) => a.t - b.t) }));
    this.showToast('Markører satt på takten.');
  };
  pvEls = {}; pvRefs = {};
  pvRef(id) { return this.pvRefs[id] || (this.pvRefs[id] = el => { if (el) { this.pvEls[id] = el; el.muted = true; el.defaultMuted = true; } else delete this.pvEls[id]; }); }
  addLane(k) { this.setProj(q => ({ ...q, lanes: { ...q.lanes, [k]: Math.min(50, ((q.lanes || {})[k] || 1) + 1) } })); }
  clearLane0(tk, nl) {
    if (nl > 1) { this.delLane(tk, 0); return; }
    const K = { text: 'texts', ov: 'ov', video: 'clips', subs: 'subs', music: 'music' }[tk], p = this.state.proj; if (!K || !p) return;
    const n = (p[K] || []).filter(x => (x.lane || 0) === 0).length; if (!n) return;
    this.setProj(q => ({ ...q, [K]: q[K].filter(x => (x.lane || 0) !== 0) }));
    this.setState({ sel: null, multi: [] }); this.showToast(n === 1 ? 'Ett element er fjernet. Angre med Ctrl+Z.' : n + ' elementer er fjernet. Angre med Ctrl+Z.');
  }
  delLane(k, i) {
    const K = KEYS[k], n = this.state.proj[K].filter(x => (x.lane || 0) === i).length;
    this.setProj(q => ({ ...q, [K]: q[K].filter(x => (x.lane || 0) !== i).map(x => (x.lane || 0) > i ? { ...x, lane: x.lane - 1 } : x), lanes: { ...q.lanes, [k]: Math.max(1, ((q.lanes || {})[k] || 1) - 1) } }));
    this.setState({ sel: null, multi: [] }); if (n) this.showToast(n === 1 ? 'Laget og ett element er fjernet. Angre med Ctrl+Z.' : 'Laget og ' + n + ' elementer er fjernet. Angre med Ctrl+Z.');
  }
  moveLinked(q, base, link, selfId, dt) {
    const K = ['texts', 'subs', 'music', 'ov']; let mn = Infinity; K.forEach(k => base[k].forEach(x => { if (x.link === link) mn = Math.min(mn, x.start); }));
    dt = Math.max(dt, -mn); const r = { ...q };
    K.forEach(k => { const bm = new Map(base[k].map(x => [x.id, x])); r[k] = q[k].map(x => { if (x.link !== link || x.id === selfId) return x; const b = bm.get(x.id); if (!b) return x; return k === 'subs' ? { ...x, start: b.start + dt, end: b.end + dt } : { ...x, start: b.start + dt }; }); });
    return r;
  }
  linkFollow(base, next) {
    const VF = window.VF, g = {}; if (!next || !next.clips) return next; next.clips.forEach(c => { if (c.link) g[c.link] = c.id; }); const ks = Object.keys(g); if (!ks.length) return next;
    const Lb = VF.layout(base), Ln = VF.layout(next), st = (L, id) => { const l = L.find(x => x.c.id === id); return l ? l.start : null; }, dl = {}; let any = false;
    ks.forEach(k => { const a = st(Lb, g[k]), b = st(Ln, g[k]); if (a != null && b != null && Math.abs(a - b) > 1e-4) { dl[k] = b - a; any = true; } });
    if (!any) return next; const r = { ...next };
    ['texts', 'subs', 'music', 'ov'].forEach(k => { const bm = new Map(base[k].map(x => [x.id, x])); r[k] = next[k].map(x => { const dd = x.link && dl[x.link]; if (!dd) return x; const b = bm.get(x.id) || x; return k === 'subs' ? { ...x, start: Math.max(0, b.start + dd), end: Math.max(0.2, b.end + dd) } : { ...x, start: Math.max(0, b.start + dd) }; }); });
    return r;
  }
  linkSel = () => {
    const L = this.selList(), p = this.state.proj; if (L.length < 2) { this.showToast('Velg minst to elementer med Shift-klikk først.'); return; }
    const ids = new Set(L.map(x => x.id)), ex = new Set(); L.forEach(x => { const it = p[KEYS[x.type]].find(y => y.id === x.id); if (it && it.link) ex.add(it.link); });
    const inG = x => ids.has(x.id) || (x.link && ex.has(x.link)); if (p.clips.filter(inG).length > 1) { this.showToast('En gruppe kan bare ha ett klipp fra videosporet.'); return; }
    const g = window.VF.uid('g'), up = x => inG(x) ? { ...x, link: g } : x;
    this.setProj(q => ({ ...q, clips: q.clips.map(up), texts: q.texts.map(up), subs: q.subs.map(up), music: q.music.map(up), ov: q.ov.map(up) }));
    this.showToast('Koblet sammen. Flytt ett av dem for å flytte alle.');
  };
  unlinkSel = () => {
    const ids = new Set(this.selList().map(x => x.id)); if (!ids.size) return; const K = ['clips', 'texts', 'subs', 'music', 'ov'], strip = x => { const y = { ...x }; delete y.link; return y; };
    this.setProj(q => { const r = { ...q }, cnt = {}; K.forEach(k => { r[k] = q[k].map(x => ids.has(x.id) && x.link ? strip(x) : x); }); K.forEach(k => r[k].forEach(x => { if (x.link) cnt[x.link] = (cnt[x.link] || 0) + 1; })); K.forEach(k => { r[k] = r[k].map(x => x.link && cnt[x.link] < 2 ? strip(x) : x); }); return r; });
    this.showToast('Koblingen er fjernet.');
  };
  selectLinked(link) { const p = this.state.proj, out = []; [['clip', 'clips'], ['text', 'texts'], ['sub', 'subs'], ['music', 'music'], ['ov', 'ov']].forEach(([t, k]) => p[k].forEach(x => { if (x.link === link) out.push({ type: t, id: x.id }); })); this.setState({ multi: out.length > 1 ? out : [], sel: out[out.length - 1] || null }); }
  markerAt(t) { const p = this.state.proj; return p && p.markers.find(k => Math.abs(k.t - t) * this.state.zoom < 7 || Math.abs(k.t - t) < 0.04); }
  delMarker(id) { this.setProj(q => ({ ...q, markers: q.markers.filter(k => k.id !== id) })); this.showToast('Markør fjernet.'); }
  toggleMarker = () => { const k = this.markerAt(this.t); if (k) this.delMarker(k.id); else this.addMarker(); };
  saveBrowser = async () => { await this.saveNow(); if (!this.dirty) this.showToast('Prosjektet er lagret.'); };
  toggleAutosave = () => { const on = !this.state.autosave; try { localStorage.setItem('motiondesign.autosave', on ? '1' : '0'); } catch (e) {} this.setState({ autosave: on }); if (on && this.dirty) this.saveNow(); this.showToast(on ? 'Autolagring er på.' : 'Autolagring er av. Husk å lagre.'); };
  hoverRef = v => { if (!v) return; v.muted = true; v.defaultMuted = true; const go = () => { try { if (v.duration > 4 && !v._hs) { v._hs = 1; v.currentTime = Math.min(1, v.duration / 4); } } catch (e) {} v.play().catch(() => {}); }; if (v.readyState >= 1) go(); else v.onloadedmetadata = go; };
  xfOn() { const x = this.state.xform, s = this.state.sel; return !!(x && s && x.id === s.id && x.type === s.type); }
  xfBox(xf) {
    const p = this.state.proj; if (!p) return null;
    if (xf.type === 'clip') {
      const cv = this.canvasRef.current, c = p.clips.find(q => q.id === xf.id); if (!cv || !c || c.kind === 'color') return null; const m = p.media.find(v => v.id === c.media) || {}, W = cv.width, H = cv.height, cr = { l: 0, t: 0, r: 0, b: 0, ...(c.crop || {}) };
      const cw = (m.w || W) * (1 - cr.l - cr.r), ch = (m.h || H) * (1 - cr.t - cr.b), base = c.fit === 'contain' ? Math.min(W / cw, H / ch) : Math.max(W / cw, H / ch), z = (c.zoom || 1) * (c.scale == null ? 1 : c.scale), dw = cw * base * z, dh = ch * base * z;
      const fx = c.fx == null ? 0.5 : c.fx, fy = c.fy == null ? 0.5 : c.fy; return { cx: W / 2 + (c.x || 0) * W + (W - dw) * (fx - 0.5), cy: H / 2 + (c.y || 0) * H + (H - dh) * (fy - 0.5), w: dw, h: dh, rot: (c.rot || 0) * Math.PI / 180, it: c, clip: true };
    }
    if (xf.type === 'text') { const r = this.rects[xf.id], x = p.texts.find(q => q.id === xf.id); if (!r || !x) return null; return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h, rot: 0, it: x }; }
    const q = this.rects['ov:' + xf.id], o = p.ov.find(v => v.id === xf.id); if (!q || !o) return null;
    const m = p.media.find(v => v.id === o.media) || {}, cr = { l: 0, t: 0, r: 0, b: 0, ...(o.crop || {}) };
    return { cx: q.x + q.w / 2, cy: q.y + q.h / 2, w: q.w, h: q.h, rot: (o.rot || 0) * Math.PI / 180, it: o, sw: m.w || 1000, sh: m.h || Math.round(1000 * (1 - cr.t - cr.b) / (1 - cr.l - cr.r) * q.h / q.w) || 1000, cr };
  }
  toLocal(B, px, py) { const dx = px - B.cx, dy = py - B.cy, c = Math.cos(B.rot), s = Math.sin(B.rot); return [dx * c + dy * s, -dx * s + dy * c]; }
  toCanvas(B, lx, ly) { const c = Math.cos(B.rot), s = Math.sin(B.rot); return [B.cx + lx * c - ly * s, B.cy + lx * s + ly * c]; }
  xfHit(B, px, py, k, mode) {
    const L = this.toLocal(B, px, py), tol = 10 * k;
    if (mode !== 'crop' && B.it && B.it.kind) { if (Math.hypot(L[0], L[1] + B.h / 2 + 26 * k) < tol) return 8; }
    for (let i = 0; i < 8; i++) if (Math.abs(L[0] - HX[i] * B.w / 2) < tol && Math.abs(L[1] - HY[i] * B.h / 2) < tol) return i;
    return null;
  }
  drawXf(ctx, c) {
    if (!this.xfOn()) return; const xf = this.state.xform, B = this.xfBox(xf); if (!B) return;
    const k = c.width / Math.max(1, this.state.pv.w), crop = xf.mode === 'crop', isOv = xf.type === 'ov';
    ctx.save(); ctx.translate(B.cx, B.cy); ctx.rotate(B.rot);
    if (crop) { const ps = B.w / ((1 - B.cr.l - B.cr.r) * B.sw), ux = B.sw * ps, uy = B.sh * ps; ctx.setLineDash([5 * k, 4 * k]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = k; ctx.strokeRect(-B.w / 2 - B.cr.l * ux, -B.h / 2 - B.cr.t * uy, ux, uy); ctx.setLineDash([]); }
    ctx.strokeStyle = crop ? '#f5b82c' : '#ffffff'; ctx.lineWidth = 1.5 * k; ctx.strokeRect(-B.w / 2, -B.h / 2, B.w, B.h);
    if (!crop && isOv) { ctx.beginPath(); ctx.moveTo(0, -B.h / 2); ctx.lineTo(0, -B.h / 2 - 26 * k); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -B.h / 2 - 26 * k, 5.5 * k, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#000000'; ctx.lineWidth = k; ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const hx = HX[i] * B.w / 2, hy = HY[i] * B.h / 2, s = (crop ? 10 : 9) * k; ctx.fillStyle = crop ? '#f5b82c' : '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = k; ctx.fillRect(hx - s / 2, hy - s / 2, s, s); ctx.strokeRect(hx - s / 2, hy - s / 2, s, s); }
    ctx.restore();
  }
  xfDrag(e, xf, B, hi, r, c) {
    e.preventDefault(); e.stopPropagation();
    const k = c.width / r.width, id = xf.id, o0 = { ...B.it }, sx = HX[hi] || 0, sy = HY[hi] || 0, P0 = this.toLocal(B, (e.clientX - r.left) * k, (e.clientY - r.top) * k); let moved = false;
    const mv = ev => {
      const px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k, L = this.toLocal(B, px, py);
      if (!moved) { if (Math.hypot(L[0] - P0[0], L[1] - P0[1]) < 2) return; moved = true; this.pushHist(); }
      let patch;
      if (hi === 8) { let a = Math.atan2(py - B.cy, px - B.cx) * 180 / Math.PI + 90; if (a > 180) a -= 360; if (ev.shiftKey) a = Math.round(a / 15) * 15; else { const sn = Math.round(a / 90) * 90; if (Math.abs(a - sn) < 3) a = sn; } patch = { rot: Math.round(a * 10) / 10 }; }
      else if (xf.type === 'text') {
        if (sy === 0) patch = { maxW: clamp(2 * Math.abs(L[0]) / c.width, 0.1, 1) };
        else { const f = sx ? Math.hypot(L[0], L[1]) / Math.max(1, Math.hypot(P0[0], P0[1])) : Math.abs(L[1]) / Math.max(1, Math.abs(P0[1])); patch = { size: clamp(Math.round(o0.size * f), 8, 600) }; }
      } else if (xf.mode === 'crop') {
        const cr = B.cr, ps = B.w / ((1 - cr.l - cr.r) * B.sw), ux = B.sw * ps, uy = B.sh * ps; let l = cr.l, rr = cr.r, t = cr.t, b = cr.b;
        if (sx < 0) l = clamp(cr.l + (L[0] + B.w / 2) / ux, 0, 1 - rr - 0.05); if (sx > 0) rr = clamp(cr.r - (L[0] - B.w / 2) / ux, 0, 1 - l - 0.05);
        if (sy < 0) t = clamp(cr.t + (L[1] + B.h / 2) / uy, 0, 1 - b - 0.05); if (sy > 0) b = clamp(cr.b - (L[1] - B.h / 2) / uy, 0, 1 - t - 0.05);
        const nl = -B.w / 2 + (l - cr.l) * ux, nr = B.w / 2 - (rr - cr.r) * ux, nt = -B.h / 2 + (t - cr.t) * uy, nb = B.h / 2 - (b - cr.b) * uy, C = this.toCanvas(B, (nl + nr) / 2, (nt + nb) / 2);
        patch = { crop: { l, t, r: rr, b }, scale: (nr - nl) / c.width, x: C[0] / c.width, y: C[1] / c.height };
      } else {
        const a = B.h / B.w, alt = ev.altKey, ax = alt ? 0 : -sx * B.w / 2, ay = alt ? 0 : -sy * B.h / 2, dx = Math.abs(L[0] - ax), dy = Math.abs(L[1] - ay) / a, m = alt ? 2 : 1;
        const nw = Math.max(12 * k, (sx && sy ? Math.max(dx, dy) : sx ? dx : dy) * m), C = this.toCanvas(B, alt ? 0 : ax + sx * nw / 2, alt ? 0 : ay + sy * nw * a / 2);
        if (xf.type === 'clip') { const fx = o0.fx == null ? 0.5 : o0.fx, fy = o0.fy == null ? 0.5 : o0.fy; patch = { scale: clamp((o0.scale == null ? 1 : o0.scale) * nw / B.w, 0.1, 5), x: (C[0] - c.width / 2 - (c.width - nw) * (fx - 0.5)) / c.width, y: (C[1] - c.height / 2 - (c.height - nw * a) * (fy - 0.5)) / c.height }; }
        else patch = { scale: clamp(nw / c.width, 0.02, 4), x: C[0] / c.width, y: C[1] / c.height };
      }
      this.setState(s => ({ proj: { ...s.proj, [KEYS[xf.type]]: s.proj[KEYS[xf.type]].map(q => q.id === id ? { ...q, ...patch } : q) } }));
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (moved) this.afterProj(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  startXf(type, id, mode) {
    const p = this.state.proj, it = p[KEYS[type]].find(x => x.id === id); if (!it) return;
    if (type !== 'clip') { const end = type === 'ov' ? it.start + window.VF.ovDur(it) : it.start + it.dur; if (this.t < it.start || this.t >= end) this.seek(it.start + Math.min(0.5, (end - it.start) / 2)); }
    else { const l = window.VF.layout(p).find(x => x.c.id === id); if (l && (this.t < l.start || this.t >= l.end)) this.seek(l.start + Math.min(0.5, l.dur / 2)); }
    this.setState({ sel: { type, id }, multi: [], xform: { type, id, mode: mode || 'move' } });
    this.showToast(mode === 'crop' ? 'Beskjær: dra i kantene. Dobbeltklikk eller Enter for å gå tilbake.' : type === 'ov' ? 'Dra i punktene for å endre størrelse, eller i det runde håndtaket for å rotere. Dobbeltklikk igjen for å beskjære. Esc avslutter.' : type === 'clip' ? 'Dra i punktene for å endre størrelse, eller i det runde håndtaket for å rotere. Esc avslutter.' : 'Dra i punktene for å endre størrelse. Esc avslutter.');
  }
  canvasDbl = e => {
    const c = this.canvasRef.current, s = this.state.sel; if (!c || !s) return;
    if (s.type === 'clip') { const it = this.state.proj.clips.find(x => x.id === s.id); if (it && it.kind !== 'color' && !(this.state.xform && this.state.xform.id === s.id)) this.startXf('clip', s.id, 'move'); return; }
    if (s.type !== 'text' && s.type !== 'ov') return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) * c.width / r.width, py = (e.clientY - r.top) * c.height / r.height, q = this.rects[s.type === 'ov' ? 'ov:' + s.id : s.id];
    if (!q || px < q.x || px > q.x + q.w || py < q.y || py > q.y + q.h) return;
    const xf = this.state.xform; if (xf && xf.id === s.id) { if (s.type === 'ov') this.startXf('ov', s.id, xf.mode === 'crop' ? 'move' : 'crop'); return; }
    this.startXf(s.type, s.id, 'move');
  };
  canvasMove = e => {
    if (e.buttons) return; const c = this.canvasRef.current; if (!c) return; const r = c.getBoundingClientRect(), k = c.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k; let cur = 'default';
    if (this.xfOn()) { const B = this.xfBox(this.state.xform); if (B) { const hi = this.xfHit(B, px, py, k, this.state.xform.mode); if (hi === 8) cur = 'grab'; else if (hi != null) { const a = [45, 90, 135, 0, 45, 90, 135, 0][hi] + B.rot * 180 / Math.PI; cur = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][Math.round((((a % 180) + 180) % 180) / 45) % 4]; } } }
    if (cur === 'default') for (const key in this.rects) { const q = this.rects[key]; if (q && px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h) { cur = 'move'; break; } }
    if (c.style.cursor !== cur) c.style.cursor = cur;
  };
  medDown = (e, m) => {
    if (e.button > 0 || e.pointerType === 'touch' || (e.target.closest && e.target.closest('button'))) return;
    const x0 = e.clientX, y0 = e.clientY; let moved = false;
    const mv = ev => { if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; if (!moved) { moved = true; this.setState({ hoverMed: null }); } ev.preventDefault(); this.setState({ medDrag: { id: m.id, name: m.name, x: ev.clientX, y: ev.clientY, hit: this.mediaHit(ev.clientX, ev.clientY, m) } }); };
    const up = ev => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (!moved) return;
      const hit = ev.type === 'pointerup' ? this.mediaHit(ev.clientX, ev.clientY, m) : null; this.setState({ medDrag: null }); if (hit) this.mediaDrop(m, hit);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  mediaHit(x, y, m) {
    const VF = window.VF, p = this.state.proj, Z = this.state.zoom, inR = (ref, pad) => { const el = ref.current; if (!el) return null; const r = el.getBoundingClientRect(); return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - pad && y <= r.bottom + pad ? r : null; };
    const snap = t => { const cand = [0, this.t, ...p.markers.map(k => k.t)]; VF.layout(p).forEach(l => cand.push(l.start, l.end)); let b = t; cand.forEach(c => { if (Math.abs(c - t) * Z < 8 && Math.abs(c - t) < Math.abs(b - t) + 1e-9) b = c; }); return Math.max(0, b); };
    if (m.kind === 'audio') { const r = inR(this.musicRowRef, 14); return r ? { kind: 'music', t: snap((x - r.left) / Z), lane: clamp(Math.floor((y - r.top - 4) / LANEH.music), 0, 49) } : null; }
    let r = inR(this.clipRowRef, 10);
    if (r) { const t = (x - r.left) / Z, L = VF.layout(p), idx = L.filter(l => l.start + l.dur / 2 < t).length; return { kind: 'clip', idx, t: idx < L.length ? L[idx].start : L.length ? L[L.length - 1].end : 0 }; }
    r = inR(this.ovRowRef, 0); if (r) return { kind: 'ov', t: snap((x - r.left) / Z), lane: clamp(Math.floor((y - r.top - 4) / LANEH.ov), 0, 49) };
    const cv = this.canvasRef.current; if (cv) { const q = cv.getBoundingClientRect(); if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) return { kind: 'stage', t: this.t }; }
    return null;
  }
  mediaDrop(m, hit) {
    const VF = window.VF;
    if (hit.kind === 'music') { const a = VF.music(m, { start: hit.t, lane: hit.lane || 0 }); this.setProj(p => ({ ...p, music: [...p.music, a] }), true, 'add'); this.setState({ sel: { type: 'music', id: a.id }, multi: [] }); return; }
    if (hit.kind === 'clip') { const c = VF.mediaClip(m); this.setProj(p => { const arr = [...p.clips]; if (!arr.length) c.trans = { type: 'none', dur: 0.5 }; arr.splice(Math.min(hit.idx, arr.length), 0, c); return { ...p, clips: arr }; }, true, 'add'); this.setState({ sel: { type: 'clip', id: c.id }, multi: [] }); return; }
    const fr = this.state.proj, o = VF.overlay(m, { start: hit.t, lane: hit.lane || 0, scale: fr.w >= fr.h ? 0.36 : 0.6, y: fr.w >= fr.h ? 0.7 : 0.3 }); this.setProj(p => ({ ...p, ov: [...p.ov, o] }), true, 'add'); this.setState({ sel: { type: 'ov', id: o.id }, multi: [] });
  }
  transDown = (e, type) => {
    if (e.button > 0) return; e.preventDefault(); const x0 = e.clientX, y0 = e.clientY; let moved = false;
    const mv = ev => { if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; moved = true; this.setState({ trDrag: { type, x: ev.clientX, y: ev.clientY, hit: this.transHit(ev.clientX, ev.clientY) } }); };
    const up = ev => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.setState({ trDrag: null });
      if (!moved) { this.applyTransSel(type); return; }
      const hit = ev.type === 'pointerup' ? this.transHit(ev.clientX, ev.clientY) : null; if (hit) this.applyTrans(hit, type); else if (ev.type === 'pointerup') this.showToast('Slipp overgangen på videosporet.');
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  transHit(x, y) {
    const el = this.clipRowRef.current, p = this.state.proj, VF = window.VF; if (!el || !p || !p.clips.length) return null; const r = el.getBoundingClientRect();
    if (y < r.top - 50 || y > r.bottom + 50 || x < r.left - 30 || x > r.right + 30) return null;
    const Z = this.state.zoom, t = (x - r.left) / Z, L = VF.layout(p), c = [{ kind: 'tin', id: L[0].c.id, t: L[0].start }];
    for (let i = 1; i < L.length; i++) c.push({ kind: 'clip', id: L[i].c.id, t: L[i].start + L[i].tr / 2 });
    c.push({ kind: 'tout', id: L[L.length - 1].c.id, t: L[L.length - 1].end });
    let best = null; c.forEach(b => { const d = Math.abs(b.t - t); if (!best || d < best.d) best = { ...b, d }; }); return best;
  }
  applyTrans(hit, type) {
    const nm = (TRSTD.find(x => x[0] === type) || (window.VF.TRANS.find(x => x[0] === type)) || [0, ''])[1], dd = TRDUR[type] || 0.8;
    if (hit.kind === 'clip') this.setProj(q => ({ ...q, clips: q.clips.map(c => c.id === hit.id ? { ...c, trans: { type, dur: dd } } : c) }));
    else this.setProj(q => ({ ...q, [hit.kind]: { type, dur: dd } }));
    this.setState({ sel: { type: 'clip', id: hit.id }, multi: [] });
    this.showToast(nm + (hit.kind === 'tin' ? ' lagt til i starten.' : hit.kind === 'tout' ? ' lagt til på slutten.' : ' lagt til mellom klippene.'));
  }
  applyTransSel(type) {
    const s = this.state.sel, p = this.state.proj; if (!s || s.type !== 'clip') { this.showToast('Velg et klipp først, eller dra overgangen ned på videosporet.'); return; }
    const i = p.clips.findIndex(c => c.id === s.id); if (i < 0) return; this.applyTrans(i === 0 ? { kind: 'tin', id: s.id } : { kind: 'clip', id: s.id }, type);
  }
  onTlWheel = e => {
    if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const tl = this.tlRef.current, inner = this.tlInner.current; if (!tl) return;
    const Z = this.state.zoom, nz = clamp(Z * Math.exp(-e.deltaY * 0.0022), 4, 400); if (Math.abs(nz - Z) < 0.01) return;
    const r = (inner || tl).getBoundingClientRect(), t = (e.clientX - r.left) / Z;
    this.setState({ zoom: nz }, () => { tl.scrollLeft += t * (nz - Z); });
  };
  openMenu(e, list) {
    e.preventDefault(); e.stopPropagation(); const items = [];
    list.forEach(x => { if (!x) return; if (x === '-') { if (items.length && !items[items.length - 1].sep) items.push({ sep: true, btn: false }); return; } items.push({ btn: true, sep: false, l: x[0], k: x[1] || '', fg: x[3] ? '#ff8f7d' : '#f3f1ec', click: () => { this.setState({ menu: null }); x[2](); } }); });
    while (items.length && items[items.length - 1].sep) items.pop(); if (!items.length) return;
    const h = items.reduce((a, it) => a + (it.sep ? 9 : 32), 12), x = Math.max(8, Math.min(e.clientX, window.innerWidth - 246)), y = Math.max(8, Math.min(e.clientY, window.innerHeight - h - 8));
    this.setState({ menu: { x, y, items } });
  }
  ctxFor(kind, id, e) {
    const p = this.state.proj, it = p && p[KEYS[kind]].find(x => x.id === id); if (!it) return; const M = (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl+');
    const inSel = this.selList().some(x => x.id === id), multi = inSel && this.selList().length > 1;
    if (!inSel) this.setState({ sel: { type: kind, id }, multi: [], replaceFor: null });
    const vis = kind === 'clip' || kind === 'ov', lc = this.lookClip, idx = kind === 'clip' ? p.clips.findIndex(c => c.id === id) : -1;
    this.openMenu(e, [
      !multi && (kind === 'clip' || kind === 'text' || kind === 'music') ? ['Del ved spillehodet', 'S', this.split] : null,
      !multi && kind === 'clip' && it.kind === 'video' ? ['Frys bilde', '', this.freeze] : null,
      !multi && kind === 'music' ? ['Markører på takten', '', () => this.beatMarkers(it)] : null,
      !multi && (kind === 'text' || kind === 'ov' || (kind === 'clip' && it.kind !== 'color')) ? ['Transformer', '', () => this.startXf(kind, id, 'move')] : null,
      !multi && kind === 'ov' ? ['Beskjær', '', () => this.startXf('ov', id, 'crop')] : null,
      '-', ['Kopier', M + 'C', this.copySel], ['Klipp ut', M + 'X', () => { this.copySel(); this.delSel(); }], this.clip ? ['Lim inn', M + 'V', this.paste] : null, !multi ? ['Dupliser', M + 'D', this.dupSel] : null,
      '-', vis && !multi ? ['Kopier farge og lyd', M + '⌥C', this.copyLook] : null, vis && lc ? ['Lim inn farge', M + '⌥V', () => this.pasteLook('col')] : null, vis && lc && lc.aud ? ['Lim inn lyd', '', () => this.pasteLook('aud')] : null,
      '-', !multi && kind === 'clip' && idx > 0 && it.trans.type !== 'none' ? ['Fjern overgang', '', () => this.patch('clip', id, { trans: { ...it.trans, type: 'none' } })] : null,
      !multi && kind === 'clip' && it.kind !== 'color' ? ['Bytt media', '', () => this.setState({ tab: 'media', replaceFor: id })] : null,
      !multi && kind === 'clip' ? ['Overganger …', '', () => this.setState({ tab: 'trans' })] : null,
      '-', multi ? ['Koble sammen', M + 'L', this.linkSel] : null, it.link ? ['Koble fra', M + '⇧L', this.unlinkSel] : null, it.link ? ['Velg koblede', '', () => this.selectLinked(it.link)] : null,
      '-', [multi ? 'Slett alle' : 'Slett', 'Delete', this.delSel, true]
    ]);
  }
  rowCtx = e => {
    if (e.target !== e.currentTarget) return; const M = (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl+');
    this.openMenu(e, [this.clip ? ['Lim inn her', M + 'V', this.paste] : null, this.markerAt(this.t) ? ['Fjern markør', 'M', this.toggleMarker] : ['Legg til markør', 'M', this.addMarker], this.state.proj.markers.length ? ['Fjern alle markører', '', () => this.setProj(q => ({ ...q, markers: [] }))] : null, ['Legg til tekst', '', () => this.addText(PRESETS[0].o)], '-', ['Vis hele tidslinjen', '', this.fitZoom]]);
  };
  canvasCtx = e => { const s = this.state.sel; if (s && s.type !== 'music' && s.type !== 'sub') this.ctxFor(s.type, s.id, e); else { e.preventDefault(); this.rowCtx({ ...e, target: 1, currentTarget: 1, preventDefault: () => {}, stopPropagation: () => {}, clientX: e.clientX, clientY: e.clientY }); } };
  curveRef = el => { this.curveCv = el; if (el) requestAnimationFrame(() => this.drawCurve()); };
  curveGeom() { const cv = this.curveCv, r = cv.getBoundingClientRect(), pad = 7; return { r, pad, w: r.width - pad * 2, h: r.height - pad * 2 }; }
  drawCurve() {
    const cv = this.curveCv, info = this._cv, VF = window.VF; if (!cv || !info || !cv.isConnected) return;
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, W = Math.round(r.width * dpr), H = Math.round(r.height * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'), pad = 7 * dpr, w = W - pad * 2, h = H - pad * 2, X = x => pad + x * w, Y = y => pad + (1 - y) * h;
    g.clearRect(0, 0, W, H); g.fillStyle = '#050505'; g.fillRect(pad, pad, w, h);
    g.strokeStyle = '#262626'; g.lineWidth = dpr; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(X(i / 4), pad); g.lineTo(X(i / 4), pad + h); g.moveTo(pad, Y(i / 4)); g.lineTo(pad + w, Y(i / 4)); g.stroke(); }
    g.strokeStyle = '#333333'; g.strokeRect(pad, pad, w, h);
    g.strokeStyle = 'rgba(110,130,255,0.55)'; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(1)); g.stroke();
    const C = info.c.curves || {}, cols = { m: '#ffffff', r: '#ff5a5f', g: '#3ccf7a', b: '#5b7cff' };
    const line = (pts, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= 96; i++) { const x = i / 96, y = VF.curveEval(pts, x); if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y)); } g.stroke(); };
    ['m', 'r', 'g', 'b'].forEach(k => { if (k !== info.ch && C[k] && !(C[k].length === 2 && C[k][0][1] === 0 && C[k][1][1] === 1 && C[k][0][0] === 0 && C[k][1][0] === 1)) { g.globalAlpha = 0.5; line(C[k], cols[k], 1.2 * dpr); g.globalAlpha = 1; } });
    const pts = C[info.ch] || [[0, 0], [1, 1]]; line(pts, cols[info.ch], 2 * dpr);
    pts.forEach((q, i) => { const s = (i === this._cvHot ? 9 : 7) * dpr; g.fillStyle = i === this._cvHot ? cols[info.ch] : '#0b0b0b'; g.strokeStyle = cols[info.ch]; g.lineWidth = 1.5 * dpr; g.fillRect(X(q[0]) - s / 2, Y(q[1]) - s / 2, s, s); g.strokeRect(X(q[0]) - s / 2, Y(q[1]) - s / 2, s, s); });
  }
  curveHit(e, pts) { const G = this.curveGeom(); let best = -1, bd = 12; pts.forEach((q, i) => { const d = Math.hypot(G.r.left + G.pad + q[0] * G.w - e.clientX, G.r.top + G.pad + (1 - q[1]) * G.h - e.clientY); if (d < bd) { bd = d; best = i; } }); return best; }
  curveSet(pts) { const info = this._cv; if (!info) return; const cur = this.selItem(); const base = (cur && cur.it.curves) || {}; info.P({ curves: { ...base, [info.ch]: pts.map(q => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) } }); }
  curveDown = e => {
    const info = this._cv, cv = this.curveCv; if (!info || !cv) return; e.preventDefault(); e.stopPropagation();
    let pts = ((info.c.curves && info.c.curves[info.ch]) || [[0, 0], [1, 1]]).map(q => [...q]); const hit = this.curveHit(e, pts);
    if (e.button === 2) { if (hit > 0 && hit < pts.length - 1) { pts.splice(hit, 1); this.curveSet(pts); } return; }
    const G = this.curveGeom(), pos = ev => [clamp((ev.clientX - G.r.left - G.pad) / G.w, 0, 1), clamp(1 - (ev.clientY - G.r.top - G.pad) / G.h, 0, 1)];
    let i = hit;
    if (i < 0) { if (pts.length >= 16) return; const [x] = pos(e), y = window.VF.curveEval(pts, x); i = pts.findIndex(q => q[0] > x); if (i < 0) i = pts.length - 1; pts.splice(i, 0, [x, y]); }
    const q0 = [...pts[i]], edge = i === 0 || i === pts.length - 1; let gone = false, raf = 0; this._cvHot = i; this.curveSet(pts);
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const mv = ev => {
      const [x, y] = pos(ev), out = !edge && (ev.clientY < G.r.top - 26 || ev.clientY > G.r.bottom + 26 || ev.clientX < G.r.left - 26 || ev.clientX > G.r.right + 26);
      const arr = pts.map(q => [...q]);
      if (out) { arr.splice(i, 1); gone = true; this._cvHot = -1; }
      else { gone = false; this._cvHot = i; const lo = i === 0 ? 0 : arr[i - 1][0] + 0.01, hi = i === arr.length - 1 ? 1 : arr[i + 1][0] - 0.01; arr[i] = [edge ? q0[0] : clamp(x, lo, hi), y]; if (edge) arr[i][0] = i === 0 ? clamp(x, 0, arr[1][0] - 0.01) : clamp(x, arr[i - 1][0] + 0.01, 1); pts[i] = arr.length === pts.length ? arr[i] : pts[i]; }
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this.curveSet(arr));
    };
    const up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); cancelAnimationFrame(raf); if (gone) { pts.splice(i, 1); } this._cvHot = -1; this.curveSet(pts); };
    cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  };
  curveDbl = e => { const info = this._cv; if (!info) return; const pts = ((info.c.curves && info.c.curves[info.ch]) || [[0, 0], [1, 1]]).map(q => [...q]), i = this.curveHit(e, pts); if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); this.curveSet(pts); } else if (i === 0) { pts[0] = [0, 0]; this.curveSet(pts); } else if (i === pts.length - 1) { pts[i] = [1, 1]; this.curveSet(pts); } };
  copyLook = () => {
    const s = this.selItem(); if (!s || (s.type !== 'clip' && s.type !== 'ov')) return; const it = s.it, col = {}, aud = {};
    ['look', 'bri', 'con', 'sat', 'dim', 'temp', 'tint', 'blur', 'vig', 'grain', 'cS', 'cM', 'cH', 'curves'].forEach(k => { if (it[k] !== undefined) col[k] = it[k]; });
    if (it.kind === 'video') ['vol', 'muted', 'afi', 'afo'].forEach(k => { if (it[k] !== undefined) aud[k] = it[k]; });
    this.lookClip = { col, aud: Object.keys(aud).length ? aud : null }; this.showToast('Farge og lyd kopiert.'); this.forceUpdate();
  };
  pasteLook = what => {
    const c = this.lookClip; if (!c) return; const src = what === 'aud' ? c.aud : c.col; if (!src) { this.showToast('Ingen lyd å lime inn.'); return; }
    const L = this.selList().filter(x => x.type === 'clip' || x.type === 'ov'), ids = new Set(L.map(x => x.id)); if (!ids.size) return;
    const ap = x => { if (!ids.has(x.id)) return x; if (what === 'aud') { if (x.kind !== 'video') return x; const o = { ...x, vol: src.vol, muted: src.muted }; if (x.afi !== undefined || 'afi' in src) { o.afi = src.afi || 0; o.afo = src.afo || 0; } return o; } if (x.kind === 'color' && 'blur' in src) return { ...x, ...src }; return { ...x, ...src }; };
    this.setProj(q => ({ ...q, clips: q.clips.map(ap), ov: q.ov.map(ap) })); this.showToast(what === 'aud' ? 'Lyd limt inn.' : 'Farge limt inn.');
  };
  lookActs(act) { const c = this.lookClip, out = [act('Kopier farge og lyd', this.copyLook)]; if (c) { out.push(act('Lim inn farge', () => this.pasteLook('col'))); if (c.aud) out.push(act('Lim inn lyd', () => this.pasteLook('aud'))); } return out; }
  keyFields(o, B, P, out) {
    out.push(B.head('Grønnskjerm'), B.toggle('Fjern bakgrunnsfarge', o.keyOn, v => P({ keyOn: v })));
    if (!o.keyOn) return;
    out.push({ isSeg: true, label: 'Nøkkelfarge', segs: [['#00ff00', 'Grønn'], ['#0047ff', 'Blå']].map(([c, l]) => ({ l, bg: o.keyColor === c ? '#e9e7e2' : 'transparent', fg: o.keyColor === c ? '#000000' : '#9d998f', click: () => P({ keyColor: c }) })) },
      B.color('Egen nøkkelfarge', o.keyColor, v => P({ keyColor: v })), B.range('Toleranse', o.keySim, 0.05, 0.9, 0.01, Math.round(o.keySim * 100) + ' %', v => P({ keySim: v })),
      B.range('Myke kanter', o.keySmooth, 0.01, 0.5, 0.005, Math.round(o.keySmooth * 100) + ' %', v => P({ keySmooth: v })), B.range('Fjern fargeskjær', o.keySpill, 0, 1, 0.01, Math.round(o.keySpill * 100) + ' %', v => P({ keySpill: v })));
  }
  curveFields(c, B, P, out) {
    const pct = v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' %', ch = this.state.curveCh || 'm'; this._cv = { c, P, ch };
    out.push(B.head('RGB-kurver'), { isCurve: true, cvRef: this.curveRef, cvDown: this.curveDown, cvDbl: this.curveDbl, cvCtx: e => e.preventDefault(),
      chans: [['m', '#f3f1ec', 'Alle kanaler'], ['r', '#ff5a5f', 'Rød'], ['g', '#3ccf7a', 'Grønn'], ['b', '#5b7cff', 'Blå']].map(([k, col, l]) => ({ col, title: l, ring: ch === k ? '#ffffff' : '#2b2b2b', sc: ch === k ? 'scale(1.12)' : 'none', click: () => this.setState({ curveCh: k }) })),
      resetCh: () => P({ curves: { ...(c.curves || {}), [ch]: [[0, 0], [1, 1]] } }), resetAll: () => P({ curves: null, cS: 0, cM: 0, cH: 0 }) },
      B.range('Skygger', c.cS || 0, -1, 1, 0.01, pct(c.cS || 0), v => P({ cS: v })), B.range('Mellomtoner', c.cM || 0, -1, 1, 0.01, pct(c.cM || 0), v => P({ cM: v })), B.range('Høylys', c.cH || 0, -1, 1, 0.01, pct(c.cH || 0), v => P({ cH: v })));
  }
  addText(o) { const VF = window.VF, x = VF.text({ ...o, start: this.t, dur: o.dur || 4 }); this.setProj(p => ({ ...p, texts: [...p.texts, x] })); this.setState({ sel: { type: 'text', id: x.id } }); }
  addSub = () => { const VF = window.VF, s = { id: VF.uid('s'), start: this.t, end: this.t + 2.5, text: 'Ny undertekst' }; this.setProj(p => ({ ...p, subs: [...p.subs, s].sort((a, b) => a.start - b.start) })); this.setState({ sel: { type: 'sub', id: s.id } }); };
  addColor = () => this.insertClip(null, window.VF.colorClip({ dur: 4, c1: '#111111', c2: '#343434' }));
  delSel = () => {
    const s = this.state.sel; if (!s) return; const K = KEYS[s.type];
    this.setProj(p => ({ ...p, [K]: p[K].filter(x => x.id !== s.id) })); this.setState({ sel: null, replaceFor: null });
  };
  dupSel = () => {
    const x = this.selItem(); if (!x) return; const VF = window.VF, K = KEYS[x.type], n = { ...x.it, id: VF.uid(x.type[0]), link: undefined };
    if (x.type === 'text') n.start = x.it.start + x.it.dur; if (x.type === 'ov') n.start = x.it.start + VF.ovDur(x.it); if (x.type === 'sub') { n.start = x.it.end; n.end = x.it.end + (x.it.end - x.it.start); } if (x.type === 'music') n.start = x.it.start + (x.it.out - x.it.in);
    this.setProj(p => { const arr = [...p[K]], i = arr.findIndex(y => y.id === x.it.id); arr.splice(i + 1, 0, n); return { ...p, [K]: x.type === 'sub' ? arr.sort((a, b) => a.start - b.start) : arr }; });
    this.setState({ sel: { type: x.type, id: n.id } });
  };
  moveClip(dir) {
    const s = this.state.sel; if (!s || s.type !== 'clip') return;
    this.setProj(p => { const arr = [...p.clips], i = arr.findIndex(c => c.id === s.id), j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return p; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...p, clips: arr }; });
  }
  split = () => {
    const VF = window.VF, p = this.state.proj; if (!p) return; const x = this.selItem(), t = this.t;
    if (x && x.type === 'text') {
      const o = x.it; if (!(t > o.start + 0.1 && t < o.start + o.dur - 0.1)) { this.showToast('Flytt spillehodet inn i teksten for å dele den.'); return; }
      const b = { ...o, id: VF.uid('t'), start: t, dur: o.start + o.dur - t };
      this.setProj(q => { const arr = q.texts.map(y => y.id === o.id ? { ...y, dur: t - o.start } : y), i = arr.findIndex(y => y.id === o.id); arr.splice(i + 1, 0, b); return { ...q, texts: arr }; }); this.setState({ sel: { type: 'text', id: b.id } }); return;
    }
    if (x && x.type === 'music') {
      const o = x.it, rel = t - o.start; if (!(rel > 0.1 && rel < o.out - o.in - 0.1)) { this.showToast('Flytt spillehodet inn i lydsporet for å dele det.'); return; }
      const b = { ...o, id: VF.uid('a'), start: t, in: o.in + rel, loop: false };
      this.setProj(q => ({ ...q, music: [...q.music.map(y => y.id === o.id ? { ...y, out: o.in + rel, loop: false } : y), b] })); this.setState({ sel: { type: 'music', id: b.id } }); return;
    }
    const L = VF.layout(p), inside = l => t > l.start + 0.1 && t < l.end - 0.1;
    const l = (x && x.type === 'clip' ? L.find(y => y.c.id === x.it.id && inside(y)) : null) || [...L].reverse().find(inside);
    if (!l) { this.showToast('Flytt spillehodet inn i et klipp for å dele det.'); return; }
    const c = l.c, off = t - l.start, a = { ...c }, b = { ...c, id: VF.uid('c'), trans: { type: 'none', dur: 0.5 } };
    if (c.kind === 'video') { const so = off * (c.speed || 1); if (c.rev) { a.in = c.out - so; b.out = c.out - so; } else { a.out = c.in + so; b.in = c.in + so; } } else { a.dur = off; b.dur = l.dur - off; }
    this.setProj(q => { const arr = [...q.clips], i = arr.findIndex(y => y.id === c.id); arr.splice(i, 1, a, b); return { ...q, clips: arr }; });
    this.setState({ sel: { type: 'clip', id: b.id } });
  };
  onKey = e => {
    if (this.state.view !== 'edit' || this.state.exp) return;
    const tg = e.target; if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); this.redo(); return; }
    if (mod && k === 's') { e.preventDefault(); if (e.shiftKey) this.saveFile(); else this.saveBrowser(); return; }
    if (mod && k === 'd') { e.preventDefault(); this.dupSel(); return; }
    if (mod && k === 'l') { e.preventDefault(); if (e.shiftKey) this.unlinkSel(); else this.linkSel(); return; }
    if (mod && e.altKey && k === 'c') { e.preventDefault(); this.copyLook(); return; }
    if (mod && e.altKey && k === 'v') { e.preventDefault(); this.pasteLook('col'); return; }
    if (mod && k === 'c') { e.preventDefault(); this.copySel(); return; }
    if (mod && k === 'x') { e.preventDefault(); this.copySel(); this.delSel(); return; }
    if (mod && k === 'v') { e.preventDefault(); this.paste(); return; }
    if (mod) return;
    if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (this.state.sel) { e.preventDefault(); this.delSel(); } }
    else if (k === 's') { e.preventDefault(); this.split(); }
    else if (k === 'm') { e.preventDefault(); this.toggleMarker(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.seek(this.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === 'Home') { e.preventDefault(); this.seek(0); }
    else if (e.key === 'End') { e.preventDefault(); this.seek(1e9); }
    else if (e.key === 'Enter' && this.state.xform) { e.preventDefault(); const x = this.state.xform; this.setState({ xform: x.mode === 'crop' ? { ...x, mode: 'move' } : null }); }
    else if (e.key === 'Escape') { if (this.state.menu) this.setState({ menu: null }); else if (this.state.xform) { const x = this.state.xform; this.setState({ xform: x.mode === 'crop' ? { ...x, mode: 'move' } : null }); } else this.setState({ sel: null, multi: [], replaceFor: null }); }
  };

  /* ---------- AI & export ---------- */
  runAI = async () => {
    const p = this.state.proj; if (!p || this.state.ai.busy) return;
    if (!p.clips.some(c => c.kind === 'video')) { this.setState(s => ({ ai: { ...s.ai, msg: 'Legg til et videoklipp med tale først.', err: true } })); return; }
    if (p.subs.length && !confirm('Erstatte undertekstene som finnes?')) return;
    this.setState(s => ({ ai: { ...s.ai, busy: true, msg: 'Starter …', err: false } }));
    try {
      const subs = await window.VF.transcribe(p, this.getBlob, { lang: this.state.ai.lang, model: this.state.ai.model, onProgress: m => this.alive && this.setState(s => ({ ai: { ...s.ai, msg: m } })) });
      if (subs.length) this.setProj(q => ({ ...q, subs }));
      this.setState(s => ({ ai: { ...s.ai, busy: false, err: false, msg: subs.length ? subs.length + ' undertekster er laget. Les over og rett feil.' : 'Fant ingen tale i klippene.' } }));
    } catch (e) { this.setState(s => ({ ai: { ...s.ai, busy: false, err: true, msg: 'Klarte ikke å lage undertekster. ' + ((e && e.message) || '') } })); }
  };
  doExport = async () => {
    const VF = window.VF, e = this.state.exp, p = this.state.proj; if (!e || e.busy || !p) return;
    const [q, f] = e.q.split('-'), sz = VF.exportSize(p, q);
    this._abort = false; this.stop(); this._exporting = true;
    this.setState({ exp: { ...e, busy: true, pct: 0, phase: 'Forbereder …', msg: '', err: false } });
    try {
      await Promise.all(Object.values(this.M.vids).map(v => v.readyState >= 1 ? 0 : new Promise(r => { v.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 8000); })));
      this.pauseAll();
      await Promise.all(Object.values(this.M.imgs).map(im => im.complete ? 0 : new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); setTimeout(r, 5000); })));
      const t0 = performance.now();
      const res = await VF.exportMp4(p, { w: sz.w, h: sz.h, fps: +f, M: this.M, getBlob: this.getBlob, aborted: () => this._abort, onProgress: (pct, phase) => this.alive && this.setState(s => ({ exp: s.exp && { ...s.exp, pct, phase } })) });
      this._lastExp = { blob: res.blob, name: this.fileBase(p) + '-' + (q === '4k' ? '4k' : '1080p') + f + '.' + (res.ext || 'mp4') }; this.download(res.blob, this._lastExp.name);
      const msg = 'Ferdig på ' + VF.fmtEta((performance.now() - t0) / 1000) + ' · ' + (res.blob.size / 1048576).toFixed(1) + ' MB' + (res.audio === 'opus' ? ' · Opus-lyd (bruk VLC hvis lyden mangler)' : res.audio ? '' : ' · uten lyd');
      this.setState(s => ({ exp: s.exp && { ...s.exp, busy: false, pct: 100, phase: '', msg, err: false } }));
    } catch (err) {
      const ab = err && err.message === 'abort';
      this.setState(s => ({ exp: s.exp && { ...s.exp, busy: false, pct: 0, phase: '', msg: ab ? 'Eksporten ble avbrutt.' : 'Noe gikk galt: ' + ((err && err.message) || err), err: !ab } }));
    } finally { this._exporting = false; }
  };

  /* ---------- field builders ---------- */
  fb(kind, id) {
    const nk = (l) => kind + id + l, self = this;
    return {
      head: l => ({ isHead: true, label: l }),
      note: l => ({ isNote: true, label: l }),
      range: (l, v, min, max, step, show, on) => ({ isRange: true, label: l, val: v, min, max, step, show, onInput: e => on(+e.target.value) }),
      color: (l, v, on) => ({ isColor: true, label: l, val: v, onInput: e => on(e.target.value) }),
      select: (l, v, opts, on) => ({ isSelect: true, label: l, val: String(v), options: opts.map(o => ({ v: String(o[0]), l: o[1] })), onInput: e => on(e.target.value) }),
      toggle: (l, v, on) => ({ isToggle: true, label: l, on: !!v, trackBg: v ? '#e9e7e2' : '#333333', knobBg: v ? '#000000' : '#9d998f', knobL: v ? '18px' : '2px', toggle: () => on(!v) }),
      seg: (l, v, opts, on) => ({ isSeg: true, label: l, segs: opts.map(o => ({ l: o[1], bg: o[0] === v ? '#e9e7e2' : 'transparent', fg: o[0] === v ? '#000000' : '#9d998f', click: () => on(o[0]) })) }),
      num: (l, v, min, max, step, on) => { const k = nk(l); return { isNum: true, label: l, min, max, step, val: self.nd[k] != null ? self.nd[k] : String(Math.round(v * 100) / 100), onInput: e => { self.nd[k] = e.target.value; const n = parseFloat(e.target.value); if (isFinite(n)) on(clamp(n, min, max)); else self.forceUpdate(); }, onBlur: () => { delete self.nd[k]; self.forceUpdate(); } }; },
      area: (l, v, on) => ({ isArea: true, label: l, val: v, onInput: e => on(e.target.value) })
    };
  }
  clipFields(c, l, idx) {
    const VF = window.VF, B = this.fb('clip', c.id), P = o => this.patch('clip', c.id, o), pct = v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' %', out = [];
    if (c.kind === 'color') {
      out.push(B.color('Farge 1', c.c1, v => P({ c1: v })), B.color('Farge 2', c.c2, v => P({ c2: v })), B.seg('Type', c.grad, [['none', 'Ensfarget'], ['linear', 'Lineær'], ['radial', 'Rund']], v => P({ grad: v })));
      if (c.grad === 'linear') out.push(B.range('Vinkel', ((c.ang % 360) + 360) % 360, 0, 360, 1, Math.round(((c.ang % 360) + 360) % 360) + '°', v => P({ ang: v })), B.range('Bevegelse', c.spin, -30, 30, 1, c.spin ? c.spin + '°/s' : 'Av', v => P({ spin: v })));
      out.push(B.num('Varighet (s)', c.dur, 0.3, 3600, 0.1, v => P({ dur: v })));
    } else {
      if (c.kind === 'video') out.push(B.note('Lengde ' + fmtT(l.dur) + ' av ' + fmtT((this.state.proj.media.find(m => m.id === c.media) || {}).dur || 0) + '. Dra i kantene på tidslinjen for å klippe.'), B.num('Start i klippet (s)', c.in, 0, Math.max(0, c.out - 0.2), 0.1, v => P({ in: v })), B.num('Slutt i klippet (s)', c.out, c.in + 0.2, (this.state.proj.media.find(m => m.id === c.media) || {}).dur || 86400, 0.1, v => P({ out: v })));
      else out.push(B.num('Varighet (s)', c.dur, 0.3, 3600, 0.1, v => P({ dur: v })));
      out.push(B.seg('Utfylling', c.fit, [['cover', 'Fyll rammen'], ['contain', 'Vis hele']], v => P({ fit: v })), B.range('Zoom', c.zoom, 1, 3, 0.01, Math.round(c.zoom * 100) + ' %', v => P({ zoom: v })),
        B.range('Utsnitt vannrett', c.fx, 0, 1, 0.01, Math.round(c.fx * 100) + ' %', v => P({ fx: v })), B.range('Utsnitt loddrett', c.fy, 0, 1, 0.01, Math.round(c.fy * 100) + ' %', v => P({ fy: v })));
      if (c.kind === 'image') out.push(B.toggle('Langsom zoom', c.kb, v => P({ kb: v })));
      if (c.kind === 'video') out.push(B.head('Lyd'), B.toggle('Demp lyden', c.muted, v => P({ muted: v })), B.range('Volum', c.vol, 0, 1, 0.01, Math.round(c.vol * 100) + ' %', v => P({ vol: v })));
    }
    this.moreClipFields(c, B, P, out);
    out.push(B.head('Farge og lys'), B.select('Fargefilter', c.look || 'none', VF.LOOKS, v => P({ look: v })), B.range('Lysstyrke', c.bri, -0.6, 0.6, 0.01, pct(c.bri), v => P({ bri: v })), B.range('Kontrast', c.con, -0.6, 0.8, 0.01, pct(c.con), v => P({ con: v })), B.range('Metning', c.sat, -1, 1, 0.01, pct(c.sat), v => P({ sat: v })), B.range('Mørklegg', c.dim, 0, 0.9, 0.01, Math.round(c.dim * 100) + ' %', v => P({ dim: v })));
    this.colorExtras(c, B, P, out);
    this.curveFields(c, B, P, out);
    const pr = this.state.proj, PT = (k, o) => this.setProj(q => ({ ...q, [k]: { ...q[k], ...o } }), true, 'tr-' + k);
    if (idx === 0) { out.push(B.head('Overgang ved start'), B.select('Overgang', pr.tin.type, VF.TRANS, v => PT('tin', { type: v }))); if (pr.tin.type !== 'none') out.push(B.range('Varighet', pr.tin.dur, 0.1, 3, 0.05, pr.tin.dur.toFixed(2) + ' s', v => PT('tin', { dur: v }))); }
    if (idx === pr.clips.length - 1) { out.push(B.head('Overgang ved slutt'), B.select('Overgang', pr.tout.type, VF.TRANS, v => PT('tout', { type: v }))); if (pr.tout.type !== 'none') out.push(B.range('Varighet', pr.tout.dur, 0.1, 3, 0.05, pr.tout.dur.toFixed(2) + ' s', v => PT('tout', { dur: v }))); }
    if (idx > 0) { out.push(B.head('Overgang inn'), B.select('Overgang', c.trans.type, VF.TRANS, v => P({ trans: { ...c.trans, type: v } }))); if (c.trans.type !== 'none') out.push(B.range('Varighet', c.trans.dur, 0.1, 2, 0.05, c.trans.dur.toFixed(2) + ' s', v => P({ trans: { ...c.trans, dur: v } }))); }
    return out;
  }
  textFields(x) {
    const VF = window.VF, B = this.fb('text', x.id), P = o => this.patch('text', x.id, o), out = [];
    out.push(B.toggle('Nedtelling', x.countdown, v => P({ countdown: v })));
    if (x.countdown) {
      const from = Math.round(x.cdFrom != null ? x.cdFrom : x.dur), dd = Math.floor(from / 86400), hh = Math.floor(from / 3600) % 24, mm = Math.floor(from / 60) % 60, ss = from % 60;
      const setFrom = (d, h, m, s) => { const nf = Math.max(0, d * 86400 + h * 3600 + m * 60 + s), o = { cdFrom: nf }; if (Math.abs(x.dur - from) < 0.05 && nf >= 1 && nf <= 3600) o.dur = nf; P(o); };
      out.push(B.head('Tell ned fra'),
        B.num('Dager', dd, 0, 99, 1, v => setFrom(Math.round(v), hh, mm, ss)), B.num('Timer', hh, 0, 23, 1, v => setFrom(dd, Math.round(v), mm, ss)),
        B.num('Minutter', mm, 0, 59, 1, v => setFrom(dd, hh, Math.round(v), ss)), B.num('Sekunder', ss, 0, 59, 1, v => setFrom(dd, hh, mm, Math.round(v))),
        B.select('Visning', x.cdFmt || 'auto', [['auto', 'Automatisk'], ['ss', 'Sekunder (10)'], ['mmss', 'Min:sek (00:10)'], ['hhmmss', 'Tim:min:sek (00:00:10)'], ['ddhhmmss', 'Dag:tim:min:sek (00:00:00:10)']], v => P({ cdFmt: v })),
        B.note('Viser ' + VF.fmtCount(from, x.cdFmt) + ' ved start og teller ned så lenge teksten vises (' + fmtT(x.dur) + '). Endre Varighet under Tid for hvor lenge den vises.'));
      if (Math.abs(x.dur - from) > 0.05 && from >= 1) out.push({ isSeg: true, label: '', segs: [{ l: 'Vis hele nedtellingen', bg: 'transparent', fg: '#f3f1ec', click: () => P({ dur: from }) }] });
    } else out.push(B.area('Tekst', x.text, v => P({ text: v })));
    out.push(B.select('Skrift', x.font, VF.FONTS.map(f => [f, f]), v => P({ font: v })), B.select('Vekt', x.weight, [[300, 'Tynn'], [400, 'Vanlig'], [500, 'Medium'], [600, 'Halvfet'], [700, 'Fet'], [800, 'Ekstra fet'], [900, 'Svart']], v => P({ weight: +v })),
      B.range('Størrelse', x.size, 12, 400, 1, Math.round(x.size) + ' px', v => P({ size: v })), B.color('Tekstfarge', x.color, v => P({ color: v })),
      B.seg('Justering', x.align, [['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']], v => P({ align: v })),
      B.toggle('Store bokstaver', x.upper, v => P({ upper: v })), B.toggle('Kursiv', x.italic, v => P({ italic: v })), B.toggle('Skygge', x.shadow, v => P({ shadow: v })), B.range('Kontur', x.stroke || 0, 0, 6, 0.1, x.stroke ? x.stroke.toFixed(1) : 'Av', v => P({ stroke: v })), ...(x.stroke > 0 ? [B.color('Konturfarge', x.strokeColor || '#000000', v => P({ strokeColor: v }))] : []), B.toggle('Fargeovergang', x.grad, v => P({ grad: v })), ...(x.grad ? [B.color('Farge 2', x.color2 || '#f5b82c', v => P({ color2: v }))] : []),
      B.seg('Bakgrunn', x.box, [['none', 'Ingen'], ['block', 'Boks'], ['line', 'Linjer']], v => P({ box: v })));
    if (x.box !== 'none') out.push(B.color('Bakgrunnsfarge', x.bg, v => P({ bg: v })));
    out.push(B.range('Bokstavavstand', x.track, -0.05, 0.5, 0.01, Math.round(x.track * 100) + ' %', v => P({ track: v })), B.range('Linjeavstand', x.lh, 0.8, 2, 0.01, x.lh.toFixed(2), v => P({ lh: v })), B.range('Bredde', x.maxW, 0.2, 1, 0.01, Math.round(x.maxW * 100) + ' %', v => P({ maxW: v })), B.range('Synlighet', x.opacity, 0, 1, 0.01, Math.round(x.opacity * 100) + ' %', v => P({ opacity: v })),
      B.head('Plassering'), B.range('Vannrett', x.x, 0, 1, 0.005, Math.round(x.x * 100) + ' %', v => P({ x: v })), B.range('Loddrett', x.y, 0, 1, 0.005, Math.round(x.y * 100) + ' %', v => P({ y: v })),
      B.head('Tid'), B.select('Animasjon', x.anim, VF.ANIMS, v => P({ anim: v })), B.num('Start (s)', x.start, 0, 86400, 0.1, v => P({ start: v })), B.num('Varighet (s)', x.dur, 0.2, 86400, 0.1, v => P({ dur: v })));
    return out;
  }
  musicFields(m) {
    const B = this.fb('music', m.id), P = o => this.patch('music', m.id, o);
    return [B.num('Start på tidslinjen (s)', m.start, 0, 86400, 0.1, v => P({ start: v })), B.num('Start i sporet (s)', m.in, 0, Math.max(0, m.out - 0.2), 0.1, v => P({ in: v })), B.num('Slutt i sporet (s)', m.out, m.in + 0.2, m.srcDur, 0.1, v => P({ out: v })),
      B.range('Volum', m.vol, 0, 1, 0.01, Math.round(m.vol * 100) + ' %', v => P({ vol: v })), B.range('Ton inn', m.fadeIn, 0, 10, 0.1, m.fadeIn.toFixed(1) + ' s', v => P({ fadeIn: v })), B.range('Ton ut', m.fadeOut, 0, 10, 0.1, m.fadeOut.toFixed(1) + ' s', v => P({ fadeOut: v })),
      B.toggle('Gjenta til videoen er slutt', m.loop, v => P({ loop: v }))];
  }
  subFieldsOf(s) {
    const B = this.fb('sub', s.id), P = o => this.patch('sub', s.id, o);
    return [B.area('Tekst', s.text, v => P({ text: v })), B.num('Start (s)', s.start, 0, Math.max(0, s.end - 0.2), 0.1, v => P({ start: v })), B.num('Slutt (s)', s.end, s.start + 0.2, 86400, 0.1, v => P({ end: v }))];
  }

  renderVals() {
    const VF = window.VF, S = this.state, ed = !!(S.view === 'edit' && S.proj && VF);
    const base = {
      isMenu: !ed, isEdit: ed, isHome: S.view === 'home', isFormat: S.view === 'format', isTpl: S.view === 'tpl',
      showBackLink: S.view === 'home', showBackBtn: S.view === 'format' || S.view === 'tpl', backLabel: S.view === 'tpl' ? 'Format' : 'Prosjekter',
      goBack: () => this.setState({ view: S.view === 'tpl' ? 'format' : 'home', msg: '' }),
      newProject: () => this.setState({ view: 'format', msg: '' }), openFile: () => this.fileProj.current && this.fileProj.current.click(), fileProj: this.fileProj, onProjFile: this.onProjFile,
      hasHomeMsg: !!S.msg, homeMsg: S.msg,
      hasProjects: S.projects.length > 0, noProjects: S.loaded && !S.projects.length,
      projects: S.projects.map(p => {
        const f = VF && VF.FORMATS.find(x => x.k === p.fmt), d = VF ? (() => { try { return VF.totalDur(VF.normalize(p)); } catch (e) { return 0; } })() : 0;
        return { name: p.name, thumbCss: css(p.thumb), meta: (f ? f.ratio : p.w + '×' + p.h) + ' · ' + fmtD(d) + ' · ' + new Date(p.updated).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }), open: () => this.openProject(p), del: () => this.delProject(p) };
      }),
      formats: VF ? VF.FORMATS.map(f => { const r = f.w / f.h, bw = r >= 1 ? 96 : Math.round(96 * r), bh = r >= 1 ? Math.round(96 / r) : 96; return { name: f.name, ratio: f.ratio, size: f.w + ' × ' + f.h, bw: bw + 'px', bh: bh + 'px', pick: () => this.pickFormat(f) }; }) : [],
      cw: S.cw, ch: S.ch, onCw: e => this.setState({ cw: e.target.value.replace(/\D/g, '').slice(0, 4) }), onCh: e => this.setState({ ch: e.target.value.replace(/\D/g, '').slice(0, 4) }), useCustom: this.useCustom,
      fmtTitle: S.fmt ? S.fmt.name + ' · ' + S.fmt.ratio : '', tplAspect: S.fmt ? S.fmt.w + ' / ' + S.fmt.h : '16 / 9', tplMin: S.fmt && S.fmt.w / S.fmt.h < 0.9 ? '170px' : '240px',
      tpls: VF && S.fmt ? VF.TEMPLATES.map(tp => ({ name: tp.name, desc: tp.desc, imgCss: css(S.tplThumbs[tp.k]), pick: () => this.pickTpl(tp.k) })) : []
    };
    if (!ed) return base;

    const p = S.proj, T = VF.totalDur(p), L = VF.layout(p), Z = S.zoom, sel = this.selItem(), media = id => p.media.find(m => m.id === id) || {};
    const narrow = S.narrow, port = p.h > p.w * 1.05, tabsDef = [['media', 'Media'], ['text', 'Tekst'], ['subs', 'Undertekst'], ['audio', 'Musikk'], ['logo', 'Logo'], ['trans', 'Overganger']];
    const lanes = (items, k) => { const out = {}; let n = Math.max(1, (p.lanes && p.lanes[k]) || 1); items.forEach(x => { out[x.id] = x.lane || 0; n = Math.max(n, (x.lane || 0) + 1); }); return { map: out, n }; };
    const ol = lanes(p.ov, 'ov'), tl = lanes(p.texts, 'text'), ml = lanes(p.music, 'music');
    const step = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find(s => s * Z >= 64) || 600, ticks = [];
    for (let s = 0; s <= T + 12 && ticks.length < 600; s += step) ticks.push({ left: s * Z + 'px', label: fmtD(s) + (step < 1 && s % 1 ? '.5' : '') });
    const bw = (s, d) => ({ left: s * Z + 'px', width: Math.max(6, d * Z) + 'px' });
    const lkOf = x => x.link ? { linked: true, linkCol: LINKC[[...x.link].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % LINKC.length] } : { linked: false, linkCol: 'transparent' };
    const selId = S.sel && S.sel.id, cd = S.clipDrag, mIds = new Set((S.multi || []).map(m => m.id));

    let propTitle = 'Prosjekt', fields = [], actions = [], propNote = '';
    const act = (l, click, danger) => ({ l, click, fg: danger ? '#ff8f7d' : '#f3f1ec' });
    const nMulti = (S.multi || []).length;
    if (nMulti > 1) {
      propTitle = nMulti + ' valgt'; propNote = 'Shift-klikk for å legge til eller fjerne fra utvalget.';
      actions = [act('Kopier', this.copySel), ...(this.lookClip ? [act('Lim inn farge', () => this.pasteLook('col'))] : []), ...(this.lookClip && this.lookClip.aud ? [act('Lim inn lyd', () => this.pasteLook('aud'))] : []), act('Slett alle', this.delSel, true), act('Fjern valg', () => this.setState({ sel: null, multi: [] }))];
    } else if (sel && sel.type === 'clip') {
      const idx = p.clips.findIndex(c => c.id === sel.it.id), l = L[idx];
      propTitle = sel.it.kind === 'video' ? 'Videoklipp' : sel.it.kind === 'image' ? 'Bilde' : 'Fargeflate';
      fields = this.clipFields(sel.it, l, idx);
      actions = [act('Del ved spillehodet', this.split), ...(sel.it.kind === 'video' ? [act('Frys bilde', this.freeze)] : []), act('Bytt media', () => this.setState({ tab: 'media', replaceFor: sel.it.id })), ...this.lookActs(act), act('Dupliser', this.dupSel), act('← Flytt', () => this.moveClip(-1)), act('Flytt →', () => this.moveClip(1)), act('Slett', this.delSel, true)];
    } else if (sel && sel.type === 'text') {
      propTitle = 'Tekst'; fields = this.textFields(sel.it);
      actions = [act('Flytt til spillehodet', () => this.patch('text', sel.it.id, { start: this.t })), act('Del ved spillehodet', this.split), act('Dupliser', this.dupSel), act('Legg øverst', () => this.setProj(q => ({ ...q, texts: [...q.texts.filter(x => x.id !== sel.it.id), sel.it] }))), act('Slett', this.delSel, true)];
    } else if (sel && sel.type === 'ov') {
      propTitle = sel.it.kind === 'video' ? 'Overlegg · video' : 'Overlegg · bilde'; fields = this.ovFields(sel.it);
      const PO = o => this.patch('ov', sel.it.id, o);
      actions = [act('Midtstill', () => PO({ x: 0.5, y: 0.5 })), act('Fyll bildet', () => PO({ x: 0.5, y: 0.5, scale: 1, radius: 0, shadow: false, rot: 0 })), act('Flytt til spillehodet', () => PO({ start: this.t })), ...this.lookActs(act), act('Dupliser', this.dupSel), act('Slett', this.delSel, true)];
    } else if (sel && sel.type === 'music') {
      propTitle = 'Musikk'; propNote = sel.it.name; fields = this.musicFields(sel.it);
      actions = [act('Flytt til spillehodet', () => this.patch('music', sel.it.id, { start: this.t })), act('Del ved spillehodet', this.split), act('Markører på takten', () => this.beatMarkers(sel.it)), act('Slett', this.delSel, true)];
    } else if (sel && sel.type === 'sub') {
      propTitle = 'Undertekst'; fields = this.subFieldsOf(sel.it);
      actions = [act('Dupliser', this.dupSel), act('Slett', this.delSel, true)];
    } else {
      const B = this.fb('proj', p.id);
      propNote = 'Velg et klipp, en tekst eller et lydspor for å endre det. Dra filer rett inn i vinduet for å legge dem til.';
      fields = [B.color('Bakgrunnsfarge', p.bg, v => this.setProj(q => ({ ...q, bg: v }), true, 'bg')), B.note('Format ' + p.w + ' × ' + p.h + ' · lengde ' + fmtT(T))];
      this.mixFields(p, B, fields);
      fields.push(B.head('Markører'));
      if (!p.markers.length) fields.push(B.note('Trykk M eller knappen under for å sette en markør ved spillehodet.'));
      p.markers.forEach(k => fields.push({ isSeg: true, label: '', segs: [{ l: fmtT(k.t), bg: 'transparent', fg: '#f3f1ec', click: () => this.seek(k.t) }, { l: 'Slett', bg: 'transparent', fg: '#ff8f7d', click: () => this.setProj(q => ({ ...q, markers: q.markers.filter(x => x.id !== k.id) })) }] }));
      actions = [act('Legg til markør', this.addMarker)];
    }
    { const sl = this.selList(), its = sl.map(x => (p[KEYS[x.type]] || []).find(y => y.id === x.id)).filter(Boolean);
      if (sl.length > 1) actions.splice(1, 0, act('Koble sammen', this.linkSel));
      if (its.some(x => x.link)) actions.splice(Math.max(0, actions.length - 1), 0, act('Koble fra', this.unlinkSel)); }

    const SB = this.fb('substyle', ''), st = p.subStyle, PS = o => this.patchSubStyle(o);
    const subFields = [SB.range('Størrelse', st.size, 16, 140, 1, Math.round(st.size) + ' px', v => PS({ size: v })), SB.select('Skrift', st.font, VF.FONTS.map(f => [f, f]), v => PS({ font: v })), SB.color('Tekstfarge', st.color, v => PS({ color: v })),
      SB.seg('Plassering', st.pos, [['top', 'Oppe'], ['center', 'Midt'], ['bottom', 'Nede']], v => PS({ pos: v })), SB.toggle('Bakgrunn bak teksten', st.bgOn, v => PS({ bgOn: v }))];
    if (st.bgOn) subFields.push(SB.color('Bakgrunnsfarge', st.bg, v => PS({ bg: v })), SB.range('Bakgrunnens synlighet', st.bgA, 0, 1, 0.01, Math.round(st.bgA * 100) + ' %', v => PS({ bgA: v })));
    subFields.push(SB.toggle('Store bokstaver', st.upper, v => PS({ upper: v })), SB.seg('Visning', st.mode || 'line', [['line', 'Hele linjen'], ['words', 'Ord for ord']], v => PS({ mode: v })));
    if (st.mode === 'words') subFields.push(SB.color('Uthevet ord', st.hl || '#f5b82c', v => PS({ hl: v })));
    const LB = this.fb('logo', ''), lg = p.logo, PL = o => this.patchLogo(o);
    const logoFields = [LB.toggle('Vis logo', lg.on, v => PL({ on: v })), LB.seg('Plassering', lg.pos, [['tl', '↖'], ['tr', '↗'], ['bl', '↙'], ['br', '↘']], v => PL({ pos: v, x: null, y: null })), LB.range('Størrelse', lg.size, 0.03, 0.4, 0.005, Math.round(lg.size * 100) + ' %', v => PL({ size: v })), LB.range('Synlighet', lg.opacity, 0.1, 1, 0.01, Math.round(lg.opacity * 100) + ' %', v => PL({ opacity: v }))];
    const logoOpts = [...LOGOS.map(([src, name]) => ({ src, name, css: css(src) })), ...p.media.filter(m => m.kind === 'image').map(m => ({ src: m.id, name: m.name, css: css(this.urls[m.id] || m.thumb) }))].map(o => ({ ...o, border: lg.src === o.src ? '#e9e7e2' : 'transparent', pick: () => lg.src === o.src && lg.on ? PL({ on: false, src: '' }) : PL({ src: o.src, on: true }) }));

    const E = S.exp, expOpts = [['1080-30', '1080p · 30 fps', '1080'], ['1080-60', '1080p · 60 fps', '1080'], ['4k-30', '4K · 30 fps', '4k']].map(([k, l, q]) => { const z = VF.exportSize(p, q); return { l, size: z.w + ' × ' + z.h, border: E && E.q === k ? '#e9e7e2' : '#2b2b2b', dot: E && E.q === k ? 1 : 0, pick: () => !this.state.exp.busy && this.setState(s => ({ exp: { ...s.exp, q: k, msg: '' } })) }; });
    const ai = S.ai, rep = S.replaceFor, repClip = rep && p.clips.find(c => c.id === rep);

    return {
      ...base,
      edH: '100dvh', edOv: 'hidden', gridCols: narrow ? 'minmax(0, 1fr)' : 'clamp(190px, 21vw, 290px) minmax(0, 1fr) clamp(210px, 23vw, 310px)', gridRows: narrow ? 'minmax(0, 1fr) minmax(0, 30dvh)' : 'minmax(0, 1fr)', cSpan: 'auto', tlMaxH: narrow ? '28dvh' : 'min(34dvh, 280px)',
      narrow, wide: !narrow && S.vw >= 1280, asPos: 'relative', asW: 'auto', asSh: 'none',
      lDisp: !narrow || S.drawer !== 'r' ? 'flex' : 'none', rDisp: !narrow || S.drawer === 'r' ? 'flex' : 'none',
      drL: () => this.setState({ drawer: 'l' }), drR: () => this.setState({ drawer: 'r' }),
      drLBg: S.drawer !== 'r' ? '#e9e7e2' : '#121212', drLFg: S.drawer !== 'r' ? '#000000' : '#f3f1ec', drRBg: S.drawer === 'r' ? '#e9e7e2' : '#121212', drRFg: S.drawer === 'r' ? '#000000' : '#f3f1ec',
      ordL: narrow ? 2 : 1, ordC: narrow ? 1 : 2, ordR: narrow ? 3 : 3, stageH: 'auto', stagePad: port ? '8px' : '16px',
      leave: this.leave, projName: p.name, onName: e => { const v = e.target.value.slice(0, 120); this.setProj(q => ({ ...q, name: v }), true, 'name'); },
      fmtLabel: p.w + ' × ' + p.h, saved: S.saved, savedCol: S.saved === 'Ikke lagret' ? '#f5b82c' : '#6f6b64', showSaveBtn: !S.autosave, saveBrowser: this.saveBrowser, toggleAutosave: this.toggleAutosave, autosave: !!S.autosave, asTrack: S.autosave ? '#e9e7e2' : '#333333', asKnob: S.autosave ? '13px' : '2px', asKnobBg: S.autosave ? '#000000' : '#9d998f',
      toggleMarker: this.toggleMarker, mkLabel: this.markerAt(this.t) ? 'Fjern markør' : 'Markør', undo: this.undo, redo: this.redo, undoOp: this.past.length ? 1 : 0.35, redoOp: this.future.length ? 1 : 0.35,
      saveFile: this.saveFile, saveFileLabel: S.packing ? 'Lager fil …' : 'Lagre prosjektfil',
      openExport: () => { this.stop(); this.setState({ exp: { q: (S.exp && S.exp.q) || '1080-30', busy: false, pct: 0, phase: '', msg: '', err: false } }); },
      ...Object.fromEntries(tabsDef.map(([k, l]) => ['tab_' + k, { l, on: S.tab === k, bg: S.tab === k ? '#e9e7e2' : 'transparent', fg: S.tab === k ? '#000000' : '#9d998f', click: () => this.setState({ tab: k }) }])),
      tabMedia: S.tab === 'media', tabText: S.tab === 'text', tabSubs: S.tab === 'subs', tabAudio: S.tab === 'audio', tabTrans: S.tab === 'trans',
      transTiles: TRSTD.map(([k, l, bg]) => ({ l, bg, border: S.trDrag && S.trDrag.type === k ? '#f5b82c' : '#2b2b2b', down: e => this.transDown(e, k) })),
      trGhost: !!(S.trDrag || S.medDrag), trGx: (S.trDrag || S.medDrag) ? (S.trDrag || S.medDrag).x + 'px' : '0px', trGy: (S.trDrag || S.medDrag) ? (S.trDrag || S.medDrag).y + 'px' : '0px', trGhostL: S.trDrag ? (TRSTD.find(x => x[0] === S.trDrag.type) || [0, ''])[1] : S.medDrag ? S.medDrag.name : '',
      hasGhostSub: !!(S.medDrag && S.medDrag.hit), trGhostSub: S.medDrag && S.medDrag.hit ? { clip: 'Sett inn i videosporet', ov: 'Overlegg', stage: 'Overlegg ved spillehodet', music: 'Lydspor' }[S.medDrag.hit.kind] : '',
      mhClip: !!(S.medDrag && S.medDrag.hit && S.medDrag.hit.kind === 'clip'), mhClipL: S.medDrag && S.medDrag.hit ? S.medDrag.hit.t * Z + 'px' : '0px', mhMusic: !!(S.medDrag && S.medDrag.hit && S.medDrag.hit.kind === 'music'), mhMusicL: S.medDrag && S.medDrag.hit ? S.medDrag.hit.t * Z + 'px' : '0px',
      ovRowRef: this.ovRowRef, musicRowRef: this.musicRowRef, mhOv: !!(S.medDrag && S.medDrag.hit && S.medDrag.hit.kind === 'ov'), mhOvL: S.medDrag && S.medDrag.hit ? S.medDrag.hit.t * Z + 'px' : '0px',
      trHit: !!(S.trDrag && S.trDrag.hit), trHitL: S.trDrag && S.trDrag.hit ? S.trDrag.hit.t * Z + 'px' : '0px', clipRowRef: this.clipRowRef, toggleVo: this.toggleVo, voLabel: this.vo ? 'Stopp opptak' : 'Ta opp voiceover', voTime: this.vo ? fmtD((Date.now() - this.vo.since) / 1000) : '', voBg: this.vo ? '#3a1410' : 'transparent', voBorder: this.vo ? '#ff5a36' : '#444444', tabLogo: S.tab === 'logo',
      fileMedia: this.fileMedia, onMediaFile: this.onMediaFile, fileSrt: this.fileSrt, onSrtFile: this.onSrtFile,
      pickMedia: () => this.pickFiles(rep ? 'replace' : 'lib', rep ? 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mov,.m4v,image/png,image/jpeg,image/webp,image/gif' : null),
      replaceMode: !!repClip, cancelReplace: () => this.setState({ replaceFor: null }), addColor: this.addColor,
      hasMedia: p.media.some(m => m.kind !== 'audio'),
      mediaItems: p.media.filter(m => m.kind !== 'audio').map(m => {
        const used = p.clips.some(c => c.media === m.id) || p.ov.some(o => o.media === m.id) || p.logo.src === m.id;
        const u = this.urls[m.id] || '', t0 = Math.min(1, (m.dur || 2) / 4);
        return { drag: e => this.medDown(e, m), name: m.name, thumbCss: css(m.thumb), fit: m.kind === 'image' ? 'contain' : 'cover', isAudio: false, isImg: m.kind === 'image' && !!u, isVid: m.kind === 'video' && !!u, url: u, vurl: u ? u + '#t=' + t0.toFixed(2) : '', vref: this.pvRef(m.id),
          enter: e => { const v = this.pvEls[m.id]; if (v && e.pointerType !== 'touch') { v.muted = true; v.play().catch(() => {}); } }, leave: () => { const v = this.pvEls[m.id]; if (v) { v.pause(); try { v.currentTime = t0; } catch (er) {} } }, meta: m.kind === 'video' ? fmtD(m.dur) : 'Bilde', border: repClip ? '#555555' : '#2b2b2b',
          canOv: !repClip, addOv: () => this.addOverlay(m), addLabel: repClip ? 'Bruk her' : 'Legg til', add: () => repClip ? this.replaceClip(rep, m) : this.insertClip(m),
          del: () => { if (used) { this.showToast('Filen er i bruk. Fjern klippene som bruker den først.'); return; } this.setProj(q => ({ ...q, media: q.media.filter(x => x.id !== m.id) })); setTimeout(() => window.VF.store.delMedia(m.id).catch(() => {}), 1500); } };
      }),
      presets: PRESETS.map(pr => ({ l: pr.l, d: pr.d, click: () => this.addText(pr.o) })),
      aiLangs: [['norwegian', 'Norsk'], ['english', 'Engelsk']].map(([k, l]) => ({ l, bg: ai.lang === k ? '#e9e7e2' : 'transparent', fg: ai.lang === k ? '#000000' : '#9d998f', click: () => this.setState(s => ({ ai: { ...s.ai, lang: k } })) })),
      aiModels: [['onnx-community/whisper-base', 'Rask', 'Mindre modell (ca. 80 MB), raskere'], ['onnx-community/whisper-small', 'Nøyaktig', 'Større modell (ca. 250 MB), bedre på norsk']].map(([k, l, t]) => ({ l, t, bg: ai.model === k ? '#e9e7e2' : 'transparent', fg: ai.model === k ? '#000000' : '#9d998f', click: () => this.setState(s => ({ ai: { ...s.ai, model: k } })) })),
      runAI: this.runAI, aiLabel: ai.busy ? 'Jobber …' : 'Lag undertekster med AI', aiOp: ai.busy ? 0.6 : 1, hasAiMsg: !!ai.msg, aiMsg: ai.msg, aiMsgColor: ai.err ? '#ff8f7d' : '#c9c5bc',
      addSub: this.addSub, pickSrt: () => this.fileSrt.current && this.fileSrt.current.click(), hasSubs: p.subs.length > 0,
      downloadSrt: () => this.download(new Blob([VF.toSrt(p.subs)], { type: 'text/plain;charset=utf-8' }), this.fileBase(p) + '.srt'),
      subsList: p.subs.map(s => ({ time: fmtT(s.start), text: s.text, border: selId === s.id ? '#e9e7e2' : '#2b2b2b', seek: () => { this.seek(s.start + 0.01); this.setState({ sel: { type: 'sub', id: s.id } }); }, focus: () => { if (selId !== s.id) { this.seek(s.start + 0.01); this.setState({ sel: { type: 'sub', id: s.id } }); } }, onText: e => this.patch('sub', s.id, { text: e.target.value.slice(0, 500) }), del: () => this.setProj(q => ({ ...q, subs: q.subs.filter(x => x.id !== s.id) })) })),
      subFields,
      pickMusic: () => this.pickFiles('music', 'audio/*'), hasMusic: p.music.length > 0,
      musicList: p.music.map(m => ({ name: m.name || media(m.media).name || 'Lydspor', meta: fmtD(m.start) + ' – ' + fmtD(m.start + (m.loop ? T - m.start : m.out - m.in)), border: selId === m.id ? '#e9e7e2' : '#2b2b2b', click: () => this.setState({ sel: { type: 'music', id: m.id } }) })),
      hasAudioLib: p.media.some(m => m.kind === 'audio'), audioLib: p.media.filter(m => m.kind === 'audio').map(m => ({ name: m.name, meta: fmtD(m.dur), add: () => this.addMusic(m), drag: e => this.medDown(e, m) })),
      logoFields, logoOpts, noLogo: () => this.patchLogo({ on: false, src: '' }), noLogoBorder: !lg.on || !lg.src ? '#e9e7e2' : 'transparent', pickLogo: () => this.pickFiles('logo', 'image/png,image/jpeg,image/webp'),
      stageRef: this.stageRef, canvasRef: this.canvasRef, cvW: S.pv.cw, cvH: S.pv.ch, cvCssW: S.pv.w + 'px', cvCssH: S.pv.h + 'px', canvasDown: this.canvasDown,
      dragOver: S.dragOver, onDragOver: this.onDragOver, onDragLeave: this.onDragLeave, onDrop: this.onDrop,
      toStart: () => this.seek(0), togglePlay: this.togglePlay, isPlaying: S.playing, isPaused: !S.playing, playLabel: S.playing ? 'Pause' : 'Spill av',
      timeRef: this.timeRef, timeLabel: fmtT(this.t) + ' / ' + fmtT(T), split: this.split,
      hasMenu: !!S.menu, menuX: S.menu ? S.menu.x + 'px' : '0px', menuY: S.menu ? S.menu.y + 'px' : '0px', menuItems: S.menu ? S.menu.items : [], closeMenu: e => { e.preventDefault(); this.setState({ menu: null }); }, rowCtx: this.rowCtx, canvasCtx: this.canvasCtx, canvasDbl: this.canvasDbl, canvasMove: this.canvasMove,
      propTitle, fields: this.collapse(fields), actions, hasActions: actions.length > 0, hasSel: !!sel, deselect: () => this.setState({ sel: null, replaceFor: null }), hasPropNote: !!propNote, propNote,
      zoomIn: () => this.setState(s => ({ zoom: clamp(s.zoom * 1.5, 4, 400) })), zoomOut: () => this.setState(s => ({ zoom: clamp(s.zoom / 1.5, 4, 400) })), fitZoom: this.fitZoom,
      tlRef: this.tlRef, tlInner: this.tlInner, phRef: this.phRef, tlW: Math.max(200, (T + 12) * Z) + 'px', phLeft: this.t * Z + 'px', ticks, rulerDown: this.rulerDown, rowDown: this.rowDown,
      rowTextH: tl.n * 26 + 8 + 'px', rowMusicH: ml.n * 30 + 8 + 'px',
      textBlocks: p.texts.map(x => ({ ...bw(x.start, x.dur), top: tl.map[x.id] * 26 + 5 + 'px', label: x.countdown ? 'Nedtelling' : (x.text || ' ').split('\n')[0], border: (selId === x.id || mIds.has(x.id)) ? '#ffffff' : 'transparent',
        ...lkOf(x), down: e => this.startDrag(e, 'text', x.id), ctx: e => this.ctxFor('text', x.id, e), downL: e => this.startDrag(e, 'text', x.id, 'l'), downR: e => this.startDrag(e, 'text', x.id, 'r') })),
      clipBlocks: L.map(l => { const c = l.c, m = media(c.media), th = c.kind === 'color' ? (c.grad === 'none' ? 'none' : 'linear-gradient(90deg, ' + c.c1 + ', ' + c.c2 + ')') : css(m.thumb), drag = cd && cd.id === c.id;
        return { ...bw(l.start, l.dur), bg: th, bgSize: c.kind === 'color' ? '100% 100%' : 'auto 100%', label: c.kind === 'color' ? 'Fargeflate' : (c.name || m.name || ''), durLabel: fmtT(l.dur), border: (selId === c.id || mIds.has(c.id)) ? '#ffffff' : 'rgba(255,255,255,0.12)',
          hasTr: l.tr > 0 || (l.i === 0 && p.tin.type !== 'none'), trW: (l.tr > 0 ? l.tr : Math.min(p.tin.dur, l.dur / 2)) * Z + 'px', hasTo: l.i === L.length - 1 && p.tout.type !== 'none', toW: Math.min(p.tout.dur, l.dur / 2) * Z + 'px', ...this.waveOf(c, m, Z), dx: drag ? cd.dx + 'px' : '0px', z: drag ? 5 : selId === c.id ? 2 : 1, op: drag ? 0.85 : 1,
          ...lkOf(c), down: e => this.startDrag(e, 'clip', c.id), ctx: e => this.ctxFor('clip', c.id, e), downL: e => this.startDrag(e, 'clip', c.id, 'l'), downR: e => this.startDrag(e, 'clip', c.id, 'r') }; }),
      subBlocks: p.subs.map(s => ({ ...bw(s.start, s.end - s.start), label: s.text, border: (selId === s.id || mIds.has(s.id)) ? '#ffffff' : 'transparent', ...lkOf(s), down: e => this.startDrag(e, 'sub', s.id), ctx: e => this.ctxFor('sub', s.id, e), downL: e => this.startDrag(e, 'sub', s.id, 'l'), downR: e => this.startDrag(e, 'sub', s.id, 'r') })),
      musicBlocks: p.music.map(m => ({ ...bw(m.start, m.loop ? T - m.start : m.out - m.in), top: ml.map[m.id] * 30 + 5 + 'px', wave: this.waves[m.media] ? css(this.waves[m.media]) : 'none', waveSize: (m.srcDur * Z) + 'px 100%', wavePos: (-m.in * Z) + 'px 0', waveFlip: 'none', label: (m.name || media(m.media).name || 'Lydspor') + (m.loop ? ' ↻' : ''), border: (selId === m.id || mIds.has(m.id)) ? '#ffffff' : 'transparent',
        ...lkOf(m), down: e => this.startDrag(e, 'music', m.id), ctx: e => this.ctxFor('music', m.id, e), downL: e => this.startDrag(e, 'music', m.id, 'l'), downR: e => this.startDrag(e, 'music', m.id, 'r') })),
      hasToast: !!S.toast, toast: S.toast,
      rowOvH: ol.n * 40 + 8 + 'px',
      ovBlocks: p.ov.map(o => { const m = media(o.media); return { ...bw(o.start, VF.ovDur(o)), top: ol.map[o.id] * 40 + 5 + 'px', bg: css(m.thumb), label: o.name || m.name || 'Overlegg', border: selId === o.id || mIds.has(o.id) ? '#ffffff' : 'transparent', ...lkOf(o), down: e => this.startDrag(e, 'ov', o.id), ctx: e => this.ctxFor('ov', o.id, e), downL: e => this.startDrag(e, 'ov', o.id, 'l'), downR: e => this.startDrag(e, 'ov', o.id, 'r') }; }),
      trackRows: [['text', 'Tekst', tl.n * 26 + 8, tl.n], ['ov', 'Overlegg', ol.n * 40 + 8, ol.n], ['video', 'Video', 60, 0], ['subs', 'Undertekst', 34, 0], ['music', 'Musikk', ml.n * 30 + 8, ml.n]].map(([k, n, h, nl]) => { const q = p.tracks[k] || {}, lh = LANEH[k]; return { name: n, h: h + 'px', pt: nl ? '4px' : '0px', lh: (nl ? lh : h - 1) + 'px', canAdd: !!nl, addLane: () => this.addLane(k), extra: nl ? Array.from({ length: nl - 1 }, (_, i) => ({ h: lh + 'px', num: String(i + 2), del: () => this.delLane(k, i + 1) })) : [], op: q.hide ? 0.5 : 1, hideFg: q.hide ? '#ff8f7d' : '#6f6b64', lockFg: q.lock ? '#f5b82c' : '#6f6b64', hideTitle: q.hide ? 'Vis spor' : 'Skjul spor', lockTitle: q.lock ? 'Lås opp spor' : 'Lås spor', toggleHide: () => this.toggleTrack(k, 'hide'), toggleLock: () => this.toggleTrack(k, 'lock'), clearTitle: nl > 1 ? 'Fjern lag' : 'Tøm sporet', clear: () => this.clearLane0(k, nl) }; }),
      markers: p.markers.map(k => ({ left: k.t * Z + 'px', color: k.color, line: k.color + '88', title: (k.label || 'Markør') + ' · ' + fmtT(k.t), down: e => { e.stopPropagation(); if (e.button === 0) this.seek(k.t); }, del: e => { e.preventDefault(); e.stopPropagation(); this.delMarker(k.id); } })),
      expOpen: !!E, expOpts, expDur: fmtT(T), expBusy: !!(E && E.busy), expIdle: !(E && E.busy), expPct: (E ? E.pct : 0) + '%', expPhase: E ? E.phase : '',
      expHasMsg: !!(E && E.msg), expMsg: E ? E.msg : '', expMsgColor: E && E.err ? '#ff8f7d' : '#b9e08a',
      doExport: this.doExport, sendFrame: this.sendFrame, sendVideo: this.sendVideo, hasLastExp: !!this._lastExp, pickShared: this.pickShared, abortExport: () => { this._abort = true; }, closeExport: () => this.setState({ exp: null })
    };
  }
}

export default Component;
