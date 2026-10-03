/* Konvertert fra den gamle dc-siden studio-editor.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
import { onUpdate } from '../../shared/ml-update.js';
import { SharedSetup } from '../../shared/shared-setup.js';
import { files as CHF } from '../../services/files.js';
const TT = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const toast = s => { if (window.MLShare && window.MLShare.toast) window.MLShare.toast(TT(s)); };
class Component extends DCLogic {
  state = {
    ready: false, tab: 'program', programText: '', slides: [],
    cfg: { accent: '#f5b82c', header: 'Ukentlige møter', topLabel: 'Program for uken', overlay: 1, rail: true, defDur: 5, res: '1080', logoSrc: null, logoOn: true, logoSize: 90, logoX: 0.93, logoY: 0.85, logoOpacity: 1,
      transFx: 'fade', textFx: 'reveal', overlayFx: 'none', fxAmount: 0.6, fxSpeed: 1, kenBurns: true, sweep: true, font: 'Archivo', titleScale: 1, textScale: 1, beatPulse: 0.6, beatText: true, beatNudge: 0, bpm: null, beatExtras: [], beatReframe: true, beatPolish: true, beatLevel: 1, beatStyle: 'auto', beatBars: 0, beatEvery: 8,
      imgRules: [] },
    videoName: '', selected: null, playing: true, playIdx: 0, urls: {}, parseMsg: '', parseOk: true, rec: null, busy: '', beatInfo: null
  };
  fileLib = React.createRef(); timeRef = React.createRef(); stripRef = React.createRef(); trackRef = React.createRef(); fillRef = React.createRef(); headRef = React.createRef();
  canvasRef = React.createRef(); fileVideo = React.createRef(); fileSlideVid = React.createRef(); fileImg = React.createRef(); fileText = React.createRef(); fileOcr = React.createRef(); fileLogo = React.createRef(); fileRule = React.createRef(); fileAudio = React.createRef();
  media = { images: {}, video: null, vids: {} }; vidGain = {}; t0 = performance.now(); qrCache = {}; loading = {};

  componentDidMount() {
    onUpdate({ save: () => { if (!Array.isArray(this.state.slides)) return null; this.saveNow(); return true; } });
    { const _ws = (fn, n = 0) => { if (window.MLShare) fn(); else if (n < 120) setTimeout(() => _ws(fn, n + 1), 50); }; _ws(() => { this._unr = window.MLShare.receive((b, n) => { if (!this.state.selected) { window.MLShare.toast('Velg en slide først, så legges bildet inn som bakgrunn.'); return; } this.onImgFile({ target: { files: [new File([b], n || 'bilde.png', { type: b.type })], value: '' } }); }, { accept: ['image'], when: () => !!this.state.selected }); }); }
    { const sp = document.getElementById('boot-splash'); if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 300); } }
    this.alive = true;
    this.setupNumEdit();
    try { const gm = localStorage.getItem('ukeloop.guide'), gf = Number(localStorage.getItem('ukeloop.guideFlip') || 0); if (gm && ['none', 'golden', 'fib', 'thirds'].includes(gm)) this.setState({ guideMode: gm, guideFlip: gf % 4 }); } catch (e) {}
    this._selKeys = ev => {
      const t = ev.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const el = this.state.selEl; if (!el) return;
      if (ev.key === 'Escape') { this.setState({ selEl: null }); }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'pip') { ev.preventDefault(); this.removePip(el.id, el.i); }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'ftext') { ev.preventDefault(); this.removeFtext(el.id, el.i); }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && el.kind === 'fqr') { ev.preventDefault(); this.removeFqr(el.id); }
    };
    document.addEventListener('keydown', this._selKeys);
    this._cropKey = ev => { if (this.state.ovEd && !this.state.hexPop) { if (ev.key === 'Escape' || ev.key === 'Enter') { const t = ev.target; if (t && t.tagName === 'INPUT' && t.type !== 'range') return; ev.preventDefault(); ev.stopPropagation(); this.setState({ ovEd: null }); } return; } if (this.state.vigEd && !this.state.crop && !this.state.hexPop) { if (ev.key === 'Escape' || ev.key === 'Enter') { const t = ev.target; if (t && t.tagName === 'INPUT' && t.type !== 'range') return; ev.preventDefault(); ev.stopPropagation(); this.setState({ vigEd: null }); } return; } if (this.state.panOpen && !this.state.crop) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.closePan('cancel'); } else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); this.closePan('done'); } return; } if (!this.state.crop) return; if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.finishCrop('cancel'); } else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); this.finishCrop('crop'); } };
    window.addEventListener('keydown', this._cropKey, true);
    this._hexClick = ev => {
      const t = ev.target; if (!(t && t.tagName === 'INPUT' && t.type === 'color')) return;
      if (t._nativeOk) { t._nativeOk = false; return; }
      ev.preventDefault(); ev.stopPropagation();
      const r = t.getBoundingClientRect(), W = 260, H = 440, vw = window.innerWidth, vh = window.innerHeight;
      const x = Math.max(8, Math.min(vw - W - 8, r.left)), y = r.bottom + H + 12 > vh ? Math.max(8, r.top - H - 8) : r.bottom + 8;
      this._hexTarget = t; const v0 = (t.value || '#000000').toLowerCase(); this.setState({ hexPop: { x, y, val: v0, base: v0, tone: 0, warm: 0, draft: v0.toUpperCase(), ...this.hexToHsv(v0) } });
    };
    document.addEventListener('click', this._hexClick, true);
    this._hexOut = ev => { if (!this.state.hexPop || this._eyedrop) return; const p = document.getElementById('hex-pop'); if (p && p.contains(ev.target)) return; if (ev.target === this._hexTarget) return; this.setState({ hexPop: null }); };
    document.addEventListener('pointerdown', this._hexOut, true);
    this._fsKey = ev => { if (ev.key === 'Escape' && this.state.fs) { ev.preventDefault(); ev.stopPropagation(); this.exitFs(); } };
    this._fsChange = () => { if (!(document.fullscreenElement || document.webkitFullscreenElement) && this.state.fs) this.exitFs(); };
    window.addEventListener('keydown', this._fsKey, true);
    document.addEventListener('fullscreenchange', this._fsChange); document.addEventListener('webkitfullscreenchange', this._fsChange);
    /* the frame loop drives the soundtrack; if frames stop (hidden tab/frame, sleep), stop the sound too */
    this._audioWatch = setInterval(() => { if (this.alive && document.hidden && performance.now() - (this._lastLoop || 0) > 2000) this.hardStopAudio(); }, 1000);
    this._onVis = () => { if (document.hidden) this.hardStopAudio(); };
    /* only one tab/window may play the soundtrack at a time */
    this._tabId = Math.random().toString(36).slice(2);
    try {
      this._bc = new BroadcastChannel('ukeloop-audio');
      this._bc.onmessage = ev => { const d = ev.data || {}; if (d.type === 'play' && d.id !== this._tabId && this.state.playing && !this.state.rec) { this.hardStopAudio(); this.setState({ playing: false }); } };
      setTimeout(() => this.announcePlay(), 300);
    } catch (e) {}
    document.addEventListener('visibilitychange', this._onVis);
    /* leaving the page (link, back, tab switch in the host) must silence the soundtrack */
    this._onLeave = () => { this.hardStopAudio(); try { this.actx && this.actx.suspend(); } catch (e) {} };
    window.addEventListener('pagehide', this._onLeave);
    window.addEventListener('beforeunload', this._onLeave);
    this._onNavClick = ev => { const a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (a && !a.target) this._onLeave(); };
    document.addEventListener('click', this._onNavClick, true);
    /* when this page is no longer on screen (hidden frame/tab), stop sound; resume when it comes back */
    try {
      const watch = () => {
        const el = this.canvasRef.current && this.canvasRef.current.closest('main');
        if (!el) { setTimeout(watch, 300); return; }
        this._io = new IntersectionObserver(ents => {
          const vis = ents.some(x => x.isIntersecting);
          this._offscreen = !vis && !this.state.rec;
          if (this._offscreen) this.hardStopAudio(); else { try { this.actx && this.actx.state === 'suspended' && this.state.playing && this.actx.resume(); } catch (e) {} }
        });
        this._io.observe(el);
      };
      watch();
    } catch (e) {}
    this._mq = window.matchMedia('(max-width: 820px)');
    this._onMq = () => this.setState({ mobile: this._mq.matches });
    this._onMq(); this._mq.addEventListener ? this._mq.addEventListener('change', this._onMq) : this._mq.addListener(this._onMq);
    window.addEventListener('keydown', this.onKey);
    this._onRs = () => { this._cbox = null; }; window.addEventListener('resize', this._onRs);
    const wait = () => { if (!this.alive) return; if (window.UkeLoop) this.init(); else setTimeout(wait, 50); };
    wait();
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this._selKeys);
    window.removeEventListener('resize', this._onRs); try { this._ro && this._ro.disconnect(); } catch (e) {}
    window.removeEventListener('keydown', this._fsKey, true); document.removeEventListener('click', this._hexClick, true); document.removeEventListener('pointerdown', this._hexOut, true); window.removeEventListener('keydown', this._cropKey, true); this.onCropUp();
    document.removeEventListener('fullscreenchange', this._fsChange); document.removeEventListener('webkitfullscreenchange', this._fsChange);
    if (this.state.fs) document.body.style.overflow = '';
    try { this._bc && this._bc.close(); } catch (e) {}
    try { this._io && this._io.disconnect(); } catch (e) {}
    window.removeEventListener('pagehide', this._onLeave); window.removeEventListener('beforeunload', this._onLeave); document.removeEventListener('click', this._onNavClick, true);
    clearInterval(this._audioWatch); document.removeEventListener('visibilitychange', this._onVis);
    this.hardStopAudio();
    Object.keys(this.media.vids || {}).forEach(k => this.dropVid(k));
    const A = window.__ukeloopAudio;
    if (A && A.owner === this) { try { A.actl.stop(); } catch (e) {} try { A.ac.close(); } catch (e) {} try { A.video && A.video.remove(); } catch (e) {} window.__ukeloopAudio = null; }
    if (this._numDbl) document.removeEventListener('dblclick', this._numDbl); if (this._mq) { this._mq.removeEventListener ? this._mq.removeEventListener('change', this._onMq) : this._mq.removeListener(this._onMq); } this.alive = false; window.removeEventListener('keydown', this.onKey); cancelAnimationFrame(this.raf); if (this.recObj) this.stopRec(true); }

  safeSrc(u) { u = String(u || ''); return /^(blob:|data:image\/)/.test(u) || /^[\w\-./ æøåÆØÅ]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(u) && !u.includes('..') && !u.startsWith('/') ? u : ''; }
  cssUrl(u) { const v = this.safeSrc(u); return v ? 'url("' + v.replace(/["\\\n\r]/g, c => '\\' + c) + '")' : 'none'; }
  okFile(f, kind) {
    const max = { image: 1024, video: 1024, audio: 500 }[kind], ext = { image: /\.(png|jpe?g|webp|gif|avif|heic|heif|tiff?|bmp)$/i, video: /\.(mp4|mov|m4v|webm)$/i, audio: /\.(mp3|m4a|wav|aac|ogg|flac)$/i }[kind];
    const name = { image: 'et bilde', video: 'en video', audio: 'en lydfil' }[kind];
    if (!String(f.type || '').startsWith(kind + '/') && !ext.test(f.name || '')) { alert('Filen ser ikke ut til å være ' + name + '.'); return false; }
    if (f.size > max * 1048576) { alert('Filen er for stor (maks ' + (max >= 1024 ? max / 1024 + ' GB' : max + ' MB') + ').'); return false; }
    return true;
  }
  applyHex(v) {
    const t = this._hexTarget; if (!t || !/^#[0-9a-f]{6}$/i.test(v)) return;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(t, v.toLowerCase());
    t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
  }
  /* shade (tone: -100 darker … +100 lighter) and warmth (-100 cooler … +100 warmer) applied to a base colour */
  adjustHex(base, tone, warm) {
    const h = this.normHex(base) || '#000000'; let r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    const mix = (a, c, t) => a + (c - a) * t;
    const w = Math.max(-100, Math.min(100, warm)) / 100;
    if (w) { r += 80 * w; g += 18 * w; b -= 80 * w; }
    const k = Math.max(-100, Math.min(100, tone)) / 100;
    if (k > 0) { r = mix(r, 255, k * 0.9); g = mix(g, 255, k * 0.9); b = mix(b, 255, k * 0.9); } else if (k < 0) { r = mix(r, 0, -k * 0.9); g = mix(g, 0, -k * 0.9); b = mix(b, 0, -k * 0.9); }
    const hx = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return '#' + hx(r) + hx(g) + hx(b);
  }
  hexToHsv(hex) {
    const h0 = this.normHex(hex) || '#000000', r = parseInt(h0.slice(1, 3), 16) / 255, g = parseInt(h0.slice(3, 5), 16) / 255, b = parseInt(h0.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return { hh: h, ss: mx ? d / mx : 0, vv: mx };
  }
  hsvToHex(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    const hx = n => Math.round((n + m) * 255).toString(16).padStart(2, '0'); return '#' + hx(r) + hx(g) + hx(b);
  }
  setPick(p) {
    const P = this.state.hexPop; if (!P) return;
    const q = { hh: P.hh || 0, ss: P.ss || 0, vv: P.vv == null ? 1 : P.vv, ...p }, c = this.hsvToHex(q.hh, q.ss, q.vv);
    this.applyHex(c); this.setState({ hexPop: { ...P, ...q, val: c, base: c, tone: 0, warm: 0, draft: c.toUpperCase() } });
  }
  dragPick(e, kind) {
    const el = e.currentTarget, r = el.getBoundingClientRect(); e.preventDefault(); e.stopPropagation();
    const put = ev => { const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)); if (kind === 'sv') this.setPick({ ss: x, vv: 1 - y }); else this.setPick({ hh: Math.min(359.9, x * 360) }); };
    put(e);
    const mv = ev => { ev.preventDefault(); put(ev); }, up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  startEyedrop = async () => {
    const P = this.state.hexPop; if (!P) return;
    if (window.EyeDropper) {
      try { const r = await new window.EyeDropper().open(); const n = this.normHex(r && r.sRGBHex); if (n) { this.applyHex(n); this.setState(st => st.hexPop ? { hexPop: { ...st.hexPop, val: n, base: n, tone: 0, warm: 0, draft: n.toUpperCase(), ...this.hexToHsv(n) } } : null); } } catch (e) {}
      return;
    }
    /* browsers without the system eyedropper (e.g. Safari): pick from the preview */
    this._eyedrop = true; this.setState({ eyedrop: true, hexPop: { ...P, hidden: true } });
  };
  finishEyedrop(e) {
    const c = this.canvasRef.current; this._eyedrop = false;
    const P = this.state.hexPop;
    if (!c || !P) { this.setState({ eyedrop: false }); return; }
    const p = this.canvasPoint(e), k = c.width / p.W;
    let n = null; try { const d = c.getContext('2d').getImageData(Math.max(0, Math.min(c.width - 1, Math.round(p.x * k))), Math.max(0, Math.min(c.height - 1, Math.round(p.y * k))), 1, 1).data; n = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); } catch (err) {}
    if (n) this.applyHex(n);
    this.setState({ eyedrop: false, hexPop: { ...P, hidden: false, ...(n ? { val: n, base: n, tone: 0, warm: 0, draft: n.toUpperCase(), ...this.hexToHsv(n) } : {}) } });
  }
  normHex(v) { v = String(v || '').trim().replace(/^#?/, '#'); if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join(''); return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null; }
  vigBase() {
    const c = this.state.cfg, d = (k, v) => c[k] != null ? c[k] : v;
    return { type: this.VIGT.includes(c.vigType) ? c.vigType : 'auto', x: d('vigX', 0.66), y: d('vigY', 0.4), rot: Number(d('vigRot', 0)) || 0, open: d('vigOpen', 0.5), color: c.vigColor || '#080808', amt: d('vigAmt', 1), alpha: d('vigAlpha', 1), size: d('vigSize', 1), soft: d('vigSoft', 0.5) };
  }
  VSMAP = { type: 'vigType', x: 'fx', y: 'fy', rot: 'vigRot', open: 'vig', color: 'vigColor', amt: 'vigAmt', alpha: 'vigAlpha', size: 'vigSize', soft: 'vigSoft' };
  VCMAP = { type: 'vigType', x: 'vigX', y: 'vigY', rot: 'vigRot', open: 'vigOpen', color: 'vigColor', amt: 'vigAmt', alpha: 'vigAlpha', size: 'vigSize', soft: 'vigSoft' };
  vigLayerOf(sel, i, scope) {
    const B = this.vigBase(), all = scope === 'all', def = { type: 'round', x: 0.5, y: 0.5, rot: 0, open: 0.5, color: '#080808', amt: 1, alpha: 1, size: 1, soft: 0.5 };
    if (i === 0) { if (all || !sel) return B; const o = { ...B }; for (const k in this.VSMAP) if (sel[this.VSMAP[k]] != null) o[k] = sel[this.VSMAP[k]]; o.rot = Number(o.rot) || 0; return o; }
    const list = all ? (this.state.cfg.vigs || []) : ((sel && sel.vigs) || []), L = list[i - 1]; return L ? { ...def, ...L } : null;
  }
  setVigLayer(patch) {
    this._vp = { ...(this._vp || {}), ...patch };
    if (this._vpRaf) return;
    this._vpRaf = requestAnimationFrame(() => { this._vpRaf = 0; const p = this._vp; this._vp = null; if (p) this.setVigLayerNow(p); });
  }
  setVigLayerNow(patch) {
    const S = this.state, E = S.vigEd || { layer: 0, scope: 'slide' }, i = E.layer, id = S.selected;
    if (E.scope === 'all') {
      /* «Alle slides» really means all: the changed keys are removed from each slide so the shared value wins */
      if (i === 0) { this.setState(st => { const c = { ...st.cfg }; const drop = []; for (const k in patch) if (this.VCMAP[k]) { c[this.VCMAP[k]] = patch[k]; drop.push(this.VSMAP[k]); } return { cfg: c, slides: st.slides.map(x => { if (!drop.some(k => x[k] != null)) return x; const n = { ...x }; drop.forEach(k => { delete n[k]; }); return n; }) }; }); }
      else this.setState(st => { const list = (st.cfg.vigs || []).slice(); if (!list[i - 1]) return null; list[i - 1] = { ...list[i - 1], ...patch }; return { cfg: { ...st.cfg, vigs: list } }; });
    } else if (id) {
      this.setState(st => ({ slides: st.slides.map(x => {
        if (x.id !== id) return x;
        if (i === 0) { const n = { ...x }; for (const k in patch) if (this.VSMAP[k]) n[this.VSMAP[k]] = patch[k]; return n; }
        const list = (x.vigs || []).slice(); if (!list[i - 1]) return x; list[i - 1] = { ...list[i - 1], ...patch }; return { ...x, vigs: list };
      }) }));
    }
    this._pk = null;
  }
  /* curated palettes, ordered dark → light */
  PALS = [
    ['#2b1a3d', '#6b2d5c', '#c0395a', '#f08a4b', '#f6c667'], ['#0b2545', '#13315c', '#1d6f8a', '#4fb3bf', '#a9e4d7'],
    ['#1b2d1f', '#2f5233', '#5e8c4a', '#a3b86c', '#e3d9a5'], ['#3d1f1a', '#8a3b2a', '#c8643b', '#e3a36b', '#f2dcc0'],
    ['#120a2a', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0'], ['#061a2b', '#0f3d4c', '#1f8a70', '#7ad17a', '#c6f0a0'],
    ['#1e1410', '#4a3226', '#8b5e3c', '#c9a27e', '#efe1ce'], ['#2a0f1a', '#5c1a33', '#9b2c4a', '#d8687a', '#f2b8a2'],
    ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], ['#111418', '#2d3640', '#52616f', '#8fa3b3', '#d3dde5'],
    ['#1f1638', '#3f2d6b', '#6c5ba7', '#a894d6', '#e0d6f5'], ['#1a3a2a', '#2e7d4f', '#9bc53d', '#fde74c', '#ff9f1c'],
    ['#0f2a3a', '#1b4b5a', '#ee6c4d', '#f5a07a', '#fbe3c6'], ['#1a1714', '#3b342c', '#6e6456', '#a89b87', '#e2d8c6'],
    ['#0a1128', '#1c3a6b', '#3a7bd5', '#8ec5fc', '#e0f0ff'], ['#0f1f17', '#1e4230', '#b3001b', '#e0a526', '#f4efe6'],
    ['#2b1b22', '#6d3b47', '#b76e79', '#e8b4a0', '#f7e1d7'], ['#10212b', '#235789', '#c1292e', '#f1d302', '#fdfffc'],
    ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'], ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
    ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946'], ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'],
    ['#2d00f7', '#6a00f4', '#8900f2', '#bc00dd', '#f20089'], ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],
    ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'], ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd'],
    ['#5f0f40', '#9a031e', '#fb8b24', '#e36414', '#0f4c5c'], ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
    ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'], ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6'],
    ['#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226'], ['#f72585', '#b5179e', '#7209b7', '#480ca8', '#4361ee'],
    ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'], ['#006d77', '#83c5be', '#edf6f9', '#ffddd2', '#e29578'],
    ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90'], ['#10002b', '#240046', '#3c096c', '#5a189a', '#9d4edd'],
    ['#03071e', '#370617', '#6a040f', '#9d0208', '#d00000'], ['#ffcdb2', '#ffb4a2', '#e5989b', '#b5838d', '#6d6875'],
    ['#081c15', '#1b4332', '#2d6a4f', '#52b788', '#b7e4c7'], ['#012a4a', '#013a63', '#01497c', '#2c7da0', '#61a5c2'],
    ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d'], ['#0b090a', '#161a1d', '#660708', '#a4161a', '#e5383b'],
    ['#7400b8', '#5e60ce', '#4ea8de', '#56cfe1', '#80ffdb'], ['#cb997e', '#ddbea9', '#ffe8d6', '#b7b7a4', '#6b705c'],
    ['#22577a', '#38a3a5', '#57cc99', '#80ed99', '#c7f9cc'], ['#231942', '#5e548e', '#9f86c0', '#be95c4', '#e0b1cb'],
    ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'], ['#2f3e46', '#354f52', '#52796f', '#84a98c', '#cad2c5'],
    ['#780000', '#c1121f', '#fdf0d5', '#003049', '#669bbc'], ['#3d348b', '#7678ed', '#f7b801', '#f18701', '#f35b04'],
    ['#264027', '#3c5233', '#6f732f', '#b38a58', '#932f6d'], ['#0a0908', '#22333b', '#eae0d5', '#c6ac8f', '#5e503f'],
    ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'], ['#e0aaff', '#c77dff', '#9d4edd', '#7b2cbf', '#3c096c'],
    ['#fec5bb', '#fcd5ce', '#fae1dd', '#e8e8e4', '#d8e2dc'], ['#283d3b', '#197278', '#edddd4', '#c44536', '#772e25'],
    ['#6f1d1b', '#bb9457', '#432818', '#99582a', '#ffe6a7'], ['#14110f', '#34312d', '#7e7f83', '#d9c5b2', '#f3f3f4'],
    ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'], ['#04151f', '#183a37', '#efd6ac', '#c44900', '#432534']
  ];
  /* 144 generated palettes from classic colour-harmony rules: 12 base hues × 6 schemes × 2 moods */
  genPals() {
    if (this._genPals) return this._genPals;
    const SCH = { mono: [0, 0, 0, 0, 0], analog: [-30, -15, 0, 15, 30], compl: [0, 0, 180, 180, 0], split: [0, 150, 0, 210, 0], triad: [0, 120, 0, 240, 0], tetra: [0, 90, 180, 270, 0] };
    const MOOD = [{ s: [55, 60, 65, 60, 45], l: [14, 28, 44, 62, 82] }, { s: [35, 38, 42, 36, 25], l: [12, 26, 42, 60, 84] }];
    const out = [];
    for (let h = 0; h < 360; h += 30) for (const k in SCH) for (const m of MOOD) out.push(SCH[k].map((d, i) => this.hsl2hex((h + d + 360) % 360, m.s[i], m.l[i])));
    return (this._genPals = out);
  }
  allPals() { return this._allPals || (this._allPals = this.PALS.concat(this.genPals())); }
  pickPal() {
    const P = this.allPals();
    let i; do { i = Math.floor(Math.random() * P.length); } while (i === this._lastPal && P.length > 1);
    this._lastPal = i; const p = P[i].slice(); return Math.random() < 0.35 ? p.reverse() : p;
  }
  harmonyColors(n) {
    const p = this.pickPal();
    if (n <= 1) return [p[1 + Math.floor(Math.random() * 3)]];
    if (n <= p.length) return Array.from({ length: n }, (_, i) => p[Math.round(i * (p.length - 1) / (n - 1))]);
    return Array.from({ length: n }, (_, i) => p[i % p.length]);
  }
  FILLM = ['none', 'solid', 'linear', 'mirror', 'radial', 'conic', 'mesh', 'stripes', 'wave', 'ellipse', 'corner', 'spot', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner'];
  fillStops(f) {
    const hx = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;
    let st = Array.isArray(f && f.stops) ? f.stops.filter(q => q && hx(q.c)).slice(0, 6).map(q => ({ c: q.c, p: Math.max(0, Math.min(1, Number(q.p) || 0)), w: Math.max(0, Math.min(1, Number(q.w) || 0)), hard: !!q.hard })) : [];
    if (st.length < 2) st = [{ c: hx(f && f.c1) || '#1a2b4c', p: 0 }, { c: hx(f && f.c2) || '#080808', p: 1 }];
    return st;
  }
  cleanVigs(a) {
    if (!Array.isArray(a) || !a.length) return null;
    const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    const r = a.filter(L => L && typeof L === 'object').slice(0, 4).map(L => ({ type: this.VIGT.includes(L.type) ? L.type : 'round', x: n(L.x, -0.2, 1.2, 0.5), y: n(L.y, -0.2, 1.2, 0.5), rot: n(L.rot, -180, 180, 0), open: n(L.open, 0, 1, 0.5), amt: n(L.amt, 0, 2, 1), size: n(L.size, 0.2, 3, 1), alpha: n(L.alpha, 0, 1, 1), soft: n(L.soft, 0, 1, 0.5), color: /^#[0-9a-f]{6}$/i.test(L.color || '') ? L.color : '#080808' }));
    return r.length ? r : null;
  }
  vigEdWrap = React.createRef(); vigEdCanvas = React.createRef(); ovEdCanvas = React.createRef();
  OVT = [['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['snow', 'Snø'], ['newyear', 'Konfetti'], ['lines', 'Linjer']];
  ovState(sel, all) {
    const c = this.state.cfg, gFx = c.overlayFx || 'none', o = sel && sel.ov || {};
    const fx = all ? gFx : (o.overlayFx || gFx);
    const pick = (sk, ck, d) => !all && sel && sel[sk] != null ? sel[sk] : c[ck] != null ? c[ck] : d;
    return { fx, on: fx !== 'none', amt: pick('oAmt', 'fxAmount', 0.6), speed: pick('oSpeed', 'ovSpeed', 1), alpha: pick('oAlpha', 'ovAlpha', 1), color: pick('oColor', 'ovColor', null) || c.accent || '#f5b82c' };
  }
  ovOwn(x) { return !!((x.ov && x.ov.overlayFx) || x.oAmt != null || x.oSpeed != null || x.oAlpha != null || x.oColor); }
  setOv(patch) {
    const S = this.state, E = S.ovEd || { scope: 'slide' }, id = S.selected, all = E.scope === 'all';
    const CM = { amt: 'fxAmount', speed: 'ovSpeed', alpha: 'ovAlpha', color: 'ovColor' }, SM = { amt: 'oAmt', speed: 'oSpeed', alpha: 'oAlpha', color: 'oColor' };
    if (all) this.setState(st => { const c = { ...st.cfg }; for (const k in patch) { if (k === 'fx') { c.overlayFx = patch.fx; if (patch.fx !== 'none') c.ovLast = patch.fx; } else if (CM[k]) c[CM[k]] = patch[k]; } return { cfg: c }; });
    else if (id) this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const n = { ...x }; for (const k in patch) { if (k === 'fx') { n.ov = { ...(x.ov || {}), overlayFx: patch.fx }; if (patch.fx !== 'none') n.ovLast = patch.fx; } else if (SM[k]) n[SM[k]] = patch[k]; } return n; }) }));
    this._pk = null;
  }
  onVigEdDown = e => {
    const w = this.vigEdWrap.current; if (!w) return; const r = w.getBoundingClientRect();
    const put = ev => { this.setVigLayer({ x: Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 1000) / 1000, y: Math.round(Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) * 1000) / 1000 }); };
    e.preventDefault(); put(e);
    const mv = ev => { ev.preventDefault(); put(ev); }, up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  VIGT = ['auto', 'round', 'oval', 'bottom', 'top', 'cinema', 'sides', 'left', 'even'];
  vigTypeOpts() { return [['auto', 'Standard (mørkt bak teksten)'], ['round', 'Rund (rundt fokuspunktet)'], ['oval', 'Oval (klassisk foto)'], ['bottom', 'Nedenfra'], ['top', 'Ovenfra'], ['cinema', 'Topp og bunn (kino)'], ['sides', 'Begge sider'], ['left', 'Fra venstre'], ['even', 'Jevn (hele bildet)']]; }
  cropWrapRef = React.createRef();
  cropRatio(a, w, h) { return a === 'orig' ? w / h : a === '16:9' ? 16 / 9 : a === '9:16' ? 9 / 16 : a === '1:1' ? 1 : a === '4:5' ? 0.8 : a === '4:3' ? 4 / 3 : null; }
  cropFit(a, W, H) { const r = this.cropRatio(a, W, H); if (!r) return { x: 0, y: 0, w: 1, h: 1 }; let bw = 1, bh = W / (r * H); if (bh > 1) { bh = 1; bw = r * H / W; } return { x: (1 - bw) / 2, y: (1 - bh) / 2, w: bw, h: bh }; }
  cropImage(file, o) {
    o = o || {};
    if (!file || /gif|svg/i.test(file.type || '')) return Promise.resolve(file);
    return new Promise(res => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        if (!im.naturalWidth) { URL.revokeObjectURL(url); res(file); return; }
        if (this._cropRes) this._cropRes(null);
        this._cropRes = res; this._cropFile = file; this._cropImg = im;
        const a = o.aspect || 'free';
        const edit = !!this._nextCropEdit; this._nextCropEdit = false;
        this.setState({ crop: { url, w: im.naturalWidth, h: im.naturalHeight, aspect: a, box: this.cropFit(a, im.naturalWidth, im.naturalHeight), title: edit ? 'Rediger bilde' : (o.title || 'Beskjær bildet'), edit } });
        this.hardStopAudio();
      };
      im.onerror = () => { URL.revokeObjectURL(url); res(file); }; /* formats the browser cannot show (e.g. HEIC) skip cropping */
      im.src = url;
    });
  }
  finishCrop(mode) {
    const C = this.state.crop, res = this._cropRes; if (!C) return;
    this._cropRes = null; this.onCropUp();
    const file = this._cropFile, im = this._cropImg;
    const done = f => { this.setState({ crop: null }); setTimeout(() => URL.revokeObjectURL(C.url), 500); this._cropImg = null; this._cropFile = null; res && res(f); };
    if (mode === 'cancel') return done(null);
    if (mode === 'full') return done(file);
    const b = C.box, sx = Math.round(b.x * C.w), sy = Math.round(b.y * C.h), sw = Math.max(1, Math.min(C.w - sx, Math.round(b.w * C.w))), sh = Math.max(1, Math.min(C.h - sy, Math.round(b.h * C.h)));
    if (sw >= C.w - 1 && sh >= C.h - 1) return done(file);
    try {
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      const png = /png|webp/i.test(file.type || '');
      c.toBlob(bl => done(bl ? new File([bl], (file.name || 'bilde').replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg'), { type: bl.type }) : file), png ? 'image/png' : 'image/jpeg', 0.93);
    } catch (e) { done(file); }
  }
  onCropDown(e, mode) {
    e.preventDefault(); e.stopPropagation();
    const wrap = this.cropWrapRef.current, C = this.state.crop; if (!wrap || !C) return;
    this._cd = { mode, r: wrap.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, b0: { ...C.box } };
    window.addEventListener('pointermove', this.onCropMove); window.addEventListener('pointerup', this.onCropUp); window.addEventListener('pointercancel', this.onCropUp);
  }
  onCropMove = e => {
    const d = this._cd, C = this.state.crop; if (!d || !C) return;
    e.preventDefault();
    const dx = (e.clientX - d.sx) / d.r.width, dy = (e.clientY - d.sy) / d.r.height, b0 = d.b0, ratio = this.cropRatio(C.aspect, C.w, C.h);
    const cl = (v, a, z) => Math.max(a, Math.min(z, v)), MIN = 0.05;
    let b;
    if (d.mode === 'move') b = { ...b0, x: cl(b0.x + dx, 0, 1 - b0.w), y: cl(b0.y + dy, 0, 1 - b0.h) };
    else if (d.mode === 'e' || d.mode === 'w' || d.mode === 'n' || d.mode === 's') {
      const k = ratio ? C.w / (ratio * C.h) : null, horiz = d.mode === 'e' || d.mode === 'w';
      let x = b0.x, y = b0.y, w = b0.w, h = b0.h;
      if (horiz) {
        if (d.mode === 'e') w = cl(b0.w + dx, MIN, 1 - b0.x); else { const ax = b0.x + b0.w; w = cl(b0.w - dx, MIN, ax); x = ax - w; }
        if (k) { h = w * k; if (h > 1) { h = 1; const nw = h / k; if (d.mode === 'w') x += w - nw; w = nw; } y = cl(b0.y + (b0.h - h) / 2, 0, 1 - h); }
      } else {
        if (d.mode === 's') h = cl(b0.h + dy, MIN, 1 - b0.y); else { const ay = b0.y + b0.h; h = cl(b0.h - dy, MIN, ay); y = ay - h; }
        if (k) { w = h / k; if (w > 1) { w = 1; const nh = w * k; if (d.mode === 'n') y += h - nh; h = nh; } x = cl(b0.x + (b0.w - w) / 2, 0, 1 - w); }
      }
      b = { x, y, w, h };
    }
    else {
      const L = d.mode.includes('w'), T = d.mode.includes('n');
      const ax = L ? b0.x + b0.w : b0.x, ay = T ? b0.y + b0.h : b0.y;
      const px = cl((L ? b0.x : b0.x + b0.w) + dx, 0, 1), py = cl((T ? b0.y : b0.y + b0.h) + dy, 0, 1);
      const maxW = L ? ax : 1 - ax, maxH = T ? ay : 1 - ay;
      let w = Math.min(maxW, Math.max(MIN, Math.abs(px - ax))), h = Math.min(maxH, Math.max(MIN, Math.abs(py - ay)));
      if (ratio) { const k = C.w / (ratio * C.h); const wFromH = h / k; w = Math.max(w, wFromH); h = w * k; if (h > maxH) { h = maxH; w = h / k; } if (w > maxW) { w = maxW; h = w * k; } }
      b = { x: L ? ax - w : ax, y: T ? ay - h : ay, w, h };
    }
    this.setState({ crop: { ...C, box: b } });
  };
  onCropUp = () => { this._cd = null; window.removeEventListener('pointermove', this.onCropMove); window.removeEventListener('pointerup', this.onCropUp); window.removeEventListener('pointercancel', this.onCropUp); };
  recropBg = async () => {
    const sel = this.state.slides.find(x => x.id === this.state.selected); if (!sel) return;
    const cur = sel[this.bgField()] || (this.portrait() ? sel.bg : null); if (!cur) return;
    let b = null;
    try { b = await this.blobOf(cur); } catch (e) {}
    if (!b) return;
    const ext = /png/i.test(b.type) ? '.png' : /webp/i.test(b.type) ? '.webp' : '.jpg';
    this._nextCropEdit = true;
    this.onImgFile({ target: { files: [new File([b], 'bilde' + ext, { type: b.type || 'image/jpeg' })], value: '' } });
  };
  canPanSel() {
    const S = this.state, sel = S.slides.find(x => x.id === S.selected); if (!sel) return false;
    const b = this.bgOf(sel), im = b && this.media.images[b]; if (!im || !im.naturalWidth) return false;
    const { W, H } = this.dims(), ia = im.naturalWidth / im.naturalHeight, fa = W / H; return ia > fa * 1.02 || ia < fa * 0.98;
  }
  editImg = () => { if (this.canPanSel()) this.openPan(); else this.recropBg(); };
  /* big photos are scaled once on upload so preview, recording and export stay fast */
  async shrinkImg(f, maxEdge, keepAlpha) {
    if (/gif|svg/i.test(f.type || '')) return f;
    let src = null, w = 0, h = 0, url = null;
    try { src = await createImageBitmap(f); w = src.width; h = src.height; }
    catch (e) {
      try { url = URL.createObjectURL(f); src = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; }); w = src.naturalWidth; h = src.naturalHeight; }
      catch (e2) { if (url) URL.revokeObjectURL(url); alert('Klarte ikke å lese bildet. Lagre det som JPG eller PNG og prøv igjen.'); return null; }
    }
    const k = Math.min(1, maxEdge / Math.max(w, h));
    if (k === 1 && f.size < 12 * 1048576 && /jpe?g|png|webp/i.test(f.type || '')) { if (src.close) src.close(); if (url) URL.revokeObjectURL(url); return f; }
    this.setState({ busy: 'img' });
    try {
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
      const png = keepAlpha || /png|webp/i.test(f.type || '') && keepAlpha !== false && this.hasAlpha(g, c.width, c.height);
      const out = await new Promise(r => c.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.92));
      return out ? new File([out], (f.name || 'bilde').replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg'), { type: out.type }) : f;
    } catch (e) { return f; }
    finally { if (src.close) src.close(); if (url) URL.revokeObjectURL(url); if (this.alive) this.setState({ busy: '' }); }
  }
  hasAlpha(g, w, h) {
    const sw = Math.min(w, 256), sh = Math.min(h, 256), c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const x = c.getContext('2d'); x.drawImage(g.canvas, 0, 0, sw, sh); const d = x.getImageData(0, 0, sw, sh).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true; return false;
  }
  /* Ingen forhåndsinnlagte standardbilder: menigheten legger inn egne (Faste bilder eller Fellesmappe). */
  /* ---------- Felles grunnoppsett for menigheten (ConnectHub) ----------
     Malene Ukeprogram, Søndagsmøte, Ungdomsmøte og Tom mal har ett felles grunnoppsett per menighet (cfg: farger, tekst,
     logo, effekter, standarduken og Faste bilder), lagret sentralt (church_settings, område «loopstudio:<mal>»). Det
     enkelte prosjektet (programtekst, slides, video og musikk) er fortsatt personlig. Egne maler er personlige som før.
     Bilder i grunnoppsettet er referanser til menighetens filer i ConnectHub («ch:<id>»); lokale bilder lastes opp ved
     lagring (logo → Logoer for Admin, ellers Fellesmappe; Faste bilder → Faste, bare Admin). Standardbilder tas aldri med.
     Faste bilder kan bare endres av Admin – grensesnittet er skrivebeskyttet for andre, og databasen avviser det uansett. */
  /* ---------- Demo (tydelig merket, lagres aldri) ----------
     Eksempelinnholdet med genererte bakgrunner (fargeoverganger og former tegnet i nettleseren) – ingen fotografier eller
     logoer. Ingenting lagres: verken lokalt, i prosjektmapper eller i menighetens grunnoppsett. «Avslutt demo» åpner
     den vanlige (tomme eller egne) lysbildeserien. */
  makeDemoBg(i) {
    const P = [['#1d2b64', '#f8cdda'], ['#0f2027', '#2c5364'], ['#42275a', '#734b6d'], ['#134e5e', '#71b280'], ['#3a1c71', '#ffaf7b']][i % 5];
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 1920, 1080); lg.addColorStop(0, P[0]); lg.addColorStop(1, P[1]); g.fillStyle = lg; g.fillRect(0, 0, 1920, 1080);
    g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(240 + ((k * 397 + i * 211) % 1600), 160 + ((k * 263 + i * 137) % 820), 60 + ((k * 89 + i * 41) % 260), 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 0.12; g.lineWidth = 3; g.strokeStyle = '#ffffff';
    for (let y = -400; y < 1500; y += 90) { g.beginPath(); g.moveTo(0, y + i * 23); g.lineTo(1920, y + 500 + i * 23); g.stroke(); }
    return new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.9));
  }
  async demoData(tpl) {
    const d = this.sampleData(tpl), ids = [], urls = {};
    for (let i = 0; i < 5; i++) {
      const b = await this.makeDemoBg(i); if (!b) continue;
      const id = 'demo-bg-' + i, u = URL.createObjectURL(b), im = new Image(); im.src = u; this.media.images[id] = im; urls[id] = u; ids.push(id);
    }
    this.setState(s => ({ urls: { ...s.urls, ...urls } }));
    return { ...d, slides: d.slides.map((x, i) => ({ ...x, bg: ids.length ? ids[i % ids.length] : null, ruleId: null })) };
  }
  demoBanner(tpl) {
    if (document.querySelector('[data-ch-demo-banner]')) return;
    const b = document.createElement('div'); b.setAttribute('data-ch-demo-banner', '1'); b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147480000;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px);padding:8px 10px 8px 16px;border:1px solid #f5b82c;border-radius:999px;background:#1b1607;color:#f5d38f;font:600 13px Archivo,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)';
    const t = document.createElement('span'); t.textContent = TT('DEMO – eksempel med genererte bakgrunner. Ingenting lagres.');
    const a = document.createElement('a'); a.href = '/loopeditor?mal=' + encodeURIComponent(tpl || 'week'); a.textContent = TT('Avslutt demo'); a.setAttribute('data-ch-demo-exit', '1');
    a.style.cssText = 'height:30px;display:inline-flex;align-items:center;padding:0 14px;border-radius:999px;background:#f5b82c;color:#111;text-decoration:none';
    b.append(t, a); document.body.append(b);
  }
  bgSource(b, sel) {
    if (!b) return '';
    if (sel && sel.ruleId) { const r = (this.state.cfg.imgRules || []).find(x => x.id === sel.ruleId); if (r) return 'Kilde: Fast bilde «' + (r.kw || 'Uten navn') + '» (Faste bilder i Loop Studio)'; }
    if (b.startsWith('ch:')) return 'Kilde: menighetens filer i ConnectHub (Faste bilder, Felles ressurser eller Fellesmappe)';
    if (b.startsWith('img-')) return 'Kilde: eget bilde – lagret bare på denne enheten';
    if (b.startsWith('demo-')) return 'Kilde: generert demobakgrunn';
    return 'Kilde: eldre innebygd bilde';
  }
  isStored(b) { return typeof b === 'string' && (b.startsWith('img-') || b.startsWith('ch:')); }
  async blobOf(b) {
    if (!b) return null;
    if (b.startsWith('img-')) return window.UkeLoop.store.get(b);
    if (b.startsWith('ch:')) return window.MLCloud && window.MLCloud.blob ? window.MLCloud.blob(b) : null;
    return this.safeSrc(b) ? (await fetch(b)).blob() : null;
  }
  sharedOn() { return !!(this.shared && this.shared.available && this.state.sharedReady && !this.state.sharedErr); }
  canEditRules() { return !this.sharedOn() || this.shared.canAdmin; }
  sharedCfg(cfg) {
    const ok = v => typeof v === 'string' && v.startsWith('ch:') ? v : null;
    return { ...cfg, logoSrc: ok(cfg.logoSrc), imgRules: (cfg.imgRules || []).map(r => ({ ...r, bg: ok(r.bg), bgPort: ok(r.bgPort) })) };
  }
  async initShared(tpl) {
    if (this.customId || this.diskId || this.demo || !window.CH || !window.CH.me) return;
    const sh = new SharedSetup('loopstudio:' + tpl, { onRemote: d => this.applyShared(d, false), onStatus: st => this.sharedStatus(st) });
    if (!sh.available) return;
    this.shared = sh;
    try {
      const d = await sh.load();
      if (d) this.applyShared(d, true);
      this._sharedAt = performance.now();
      this.setState({ sharedReady: true, sharedExists: !!d });
      sh.watch();
    } catch (e) { this.setState({ sharedReady: true, sharedErr: true }); toast('Menighetens grunnoppsett kunne ikke hentes. Du ser ditt eget oppsett på denne enheten.'); }
  }
  applyShared(d, initial) {
    this._sharedAt = performance.now();
    this.setState(s => ({ cfg: { ...this.baseCfg, ...(this.tplCfg || {}), ...d } }), () => { this.setRules(r => r, true); (d.imgRules || []).forEach(r => { r.bg && this.ensureImg(r.bg); r.bgPort && this.ensureImg(r.bgPort); }); if (d.logoSrc) this.ensureImg(d.logoSrc); });
    if (!initial) toast('Grunnoppsettet er oppdatert med endringer fra menigheten.');
  }
  sharedStatus(st) {
    if (st.state === 'error' || st.state === 'conflict' || st.state === 'merged') toast(st.text);
    if (this.alive) this.setState({ sharedState: st.state });
  }
  queueShared() {
    if (!this.sharedOn() || performance.now() - (this._sharedAt || 0) < 1500) return;
    clearTimeout(this._shT);
    this._shT = setTimeout(async () => {
      try { await this.uploadLocalRefs(); } catch (e) {}
      const first = !this.shared.exists, ok = await this.shared.save(this.sharedCfg(this.state.cfg), 0);
      if (ok && first && this.shared.exists) { this.setState({ sharedExists: true }); toast('Grunnoppsettet er nå felles for menigheten. Andre i menigheten ser endringene.'); }
    }, 900);
  }
  /* Bilder under 4 MB i et format serveren godtar. */
  async fitUpload(b, name) {
    if (b.size <= 4 * 1048576 && /^image\/(png|jpeg|webp|gif)$/.test(b.type)) return new File([b], name, { type: b.type });
    const bmp = await createImageBitmap(b), k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    return new File([out], name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  /* Lokale bilder i grunnoppsettet lastes opp til ConnectHub én gang og erstattes med referanser. */
  async uploadLocalRefs() {
    const sh = this.shared, map = this._refMap || (this._refMap = {});
    const conv = async (ref, folder, name) => {
      if (!ref || !ref.startsWith('img-')) return ref;
      if (map[ref]) return map[ref];
      const b = await window.UkeLoop.store.get(ref).catch(() => null); if (!b) return ref;
      const f = await CHF.upload(await this.fitUpload(b, name + (/png/.test(b.type) ? '.png' : '.jpg')), { churchId: sh.church.id, folder });
      const nr = 'ch:' + f.id; map[ref] = nr;
      if (this.media.images[ref]) this.media.images[nr] = this.media.images[ref];
      this.setState(s => ({ urls: { ...s.urls, [nr]: s.urls[ref] } }));
      return nr;
    };
    const c = this.state.cfg, upd = {};
    if (c.logoSrc && c.logoSrc.startsWith('img-')) upd.logoSrc = await conv(c.logoSrc, sh.canAdmin ? 'logoer' : 'bilder', 'Logo');
    if (sh.canAdmin && (c.imgRules || []).some(r => (r.bg || '').startsWith('img-') || (r.bgPort || '').startsWith('img-'))) {
      const rules = [];
      for (const r of c.imgRules) rules.push({ ...r, bg: await conv(r.bg, 'faste', r.kw || 'Fast bilde'), bgPort: await conv(r.bgPort, 'faste', (r.kw || 'Fast bilde') + ' stående') });
      upd.imgRules = rules;
    }
    if (Object.keys(upd).length) await new Promise(res => this.setState(s => ({ cfg: { ...s.cfg, ...upd } }), res));
  }
  /* Velgeren «Fellesmappe»: referanse til originalen i ConnectHub (ingen kopi). */
  async pickShared(start, apply) {
    if (!window.MLCloud || !window.MLCloud.pick) return;
    const r = await window.MLCloud.pick({ start, title: 'Velg bilde fra Fellesmappe' }); if (!r || !this.alive) return;
    const url = URL.createObjectURL(r.blob), im = new Image(); im.src = url; this.media.images[r.ref] = im;
    this.setState(s => ({ urls: { ...s.urls, [r.ref]: url } }), () => apply(r.ref));
  }
  setSlideBg(ref) {
    const sid = this.state.selected; if (!sid) return;
    const F = this.bgField(), old = (this.state.slides.find(x => x.id === sid) || {})[F];
    this.setF(sid, F, ref);
    const me = this.state.slides.find(x => x.id === sid);
    if (me && me.type === 'day' && me.title && !me.ruleId) this.rememberTitle(me.title, ref, F);
    this.gcImg(old);
  }
  defImages() { return {}; }
  daySlides(p, old) {
    const U = window.UkeLoop, DEF = this.defImages(), olds = old.filter(s => s.type === 'day'), out = [];
    p.days.forEach(d => d.events.forEach(e => {
      let id = 'ev-' + d.key + '-' + (U.keyOf(e.title) || 'x');
      while (out.some(o => o.id === id)) id += '-2';
      const base = d.base || d.key;
      const prev = olds.find(o => o.id === id) || olds.find(o => (o.dayBase || o.dayKey) === base);
      const own = olds.find(o => o.id === id), rule = own && own.ruleId ? this.ruleForSlide(own) : this.ruleFor(e.title);
      out.push({ id, ruleId: own && own.ruleId || null, type: 'day', dayKey: d.key, dayBase: base, extra: !!d.extra, day: d.extra ? '' : d.name, date: d.date || '', time: e.time, title: e.title, place: e.place || '',
        bg: rule && rule.bg ? rule.bg : prev ? prev.bg : (DEF[base] || null), bgPort: rule && rule.bgPort ? rule.bgPort : prev ? prev.bgPort || null : null, bgOpacity: prev && prev.bgOpacity != null ? prev.bgOpacity : 1,
        vig: prev && prev.vig != null ? prev.vig : null, fx: prev && prev.fx != null ? prev.fx : null, fy: prev && prev.fy != null ? prev.fy : null,
        dur: prev ? prev.dur : null, hidden: prev ? !!prev.hidden : false,
        ...(prev ? ['vigOff', 'vigColor', 'vigType', 'vigRot', 'vigSize', 'vigAmt', 'vigAlpha', 'vigSoft', 'vigs', 'oAmt', 'oSpeed', 'oAlpha', 'oColor', 'bgFill', 'tintMode', 'tint', 'tintAmt', 'ov', 'panels', 'panelBg', 'tcol', 'tsc', 'pips', 'ftexts', 'fqr'].reduce((o, k) => { if (prev[k] != null) o[k] = prev[k]; return o; }, {}) : {}) });
    }));
    return [...out.filter(x => !x.extra), ...out.filter(x => x.extra)];
  }
  ruleFor(title, rules) {
    const t = String(title || '').toLowerCase();
    const rs = (rules || this.state.cfg.imgRules || []).filter(r => r.kw && r.kw.trim() && (r.bg || r.bgPort)).sort((a, b) => b.kw.trim().length - a.kw.trim().length);
    return rs.find(r => t.includes(r.kw.trim().toLowerCase())) || null;
  }
  ruleForSlide(x, rules) {
    const rs = rules || this.state.cfg.imgRules || [];
    if (x.ruleId) { const r = rs.find(r => r.id === x.ruleId); if (r) return r.bg || r.bgPort ? r : null; }
    return x.type === 'day' ? this.ruleFor(x.title, rs) : null;
  }
  draftRules(fn, apply) {
    this.setState(s => ({ rulesDraft: fn(s.rulesDraft || []) }), () => this.setRules(() => (this.state.rulesDraft || []).map(r => ({ ...r })), apply !== false));
  }
  setRules(fn, apply) {
    this.setState(s => {
      const rules = fn(s.cfg.imgRules || []);
      const upd = { cfg: { ...s.cfg, imgRules: rules } };
      const live = s.slides.map(x => x.ruleId && !rules.some(r => r.id === x.ruleId) ? { ...x, ruleId: null } : x);
      upd.slides = !apply ? live : live.map(x => { if (x.type !== 'day' && !x.ruleId) return x; const r = this.ruleForSlide(x, rules); if (!r) return x; const nb = r.bg || x.bg, np = r.bgPort || x.bgPort || null; return nb !== x.bg || np !== x.bgPort ? { ...x, bg: nb, bgPort: np } : x; });
      return upd;
    });
  }
  applyRulesNow = () => {
    const n = this.state.slides.filter(x => x.type === 'day' && this.ruleFor(x.title)).length;
    this.setRules(r => r, true);
    this.setState({ parseMsg: n ? 'Standardbildene er brukt på ' + n + (n === 1 ? ' møte.' : ' møter.') : 'Ingen møter passet med ordene i listen.', parseOk: !!n });
  };
  onRuleFile = async e => {
    let f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'image')) return;
    if (f) { f = await this.cropImage(f, { aspect: this.portrait() ? '9:16' : '16:9', title: 'Beskjær bakgrunnsbildet' }); if (!f) return; }
    if (f) { f = await this.shrinkImg(f, 5120); if (!f) return; } const rid = this._ruleTarget; if (!f || !rid) return;
    const id = 'img-r-' + Date.now().toString(36);
    try { await window.UkeLoop.store.put(id, f); } catch (err) {}
    const url = URL.createObjectURL(f), im = new Image(); im.src = url; this.media.images[id] = im;
    this.setState(s => ({ galleryFor: null, urls: { ...s.urls, [id]: url } })); const F = this.bgField(); this.draftRules(ds => ds.map(r => r.id === rid ? { ...r, [F]: id } : r));
  };
  tplNames() { return { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' }; }
  storeKey(t) { if (this.customId) return 'ukeloop.custom.' + this.customId; return !t || t === 'week' ? 'ukeloop.v2' : t === 'youth' ? 'ukeloop.v5.youth' : 'ukeloop.v2.' + t; }
  vKey() { const t = this.state.tpl || 'week'; return t === 'week' ? 'video' : 'video.' + t; }
  defVideo() { return null; }
  async loadVideo() {
    const v = this.media.video; if (!v) return;
    if (v.src && v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
    let vb = null; try { vb = await window.UkeLoop.store.get(this.vKey()); } catch (e) {}
    if (vb) v.src = URL.createObjectURL(vb); else if (this.defVideo()) v.src = this.defVideo(); else { v.removeAttribute('src'); v.load(); return; }
    v.play().catch(() => {});
  }
  /* Tidligere versjoner lagret eksempelinnholdet automatisk som brukerens prosjekt første gang Loop Studio ble åpnet.
     Et lagret prosjekt som fortsatt er helt likt eksempelinnholdet (samme slides og tekster, bare gamle innebygde
     bilder), legges til side (ukeloop.arkiv.*) – aldri slettet – og brukeren starter med en tom serie, med mulighet for å
     hente det tilbake. Prosjekter brukeren har endret, lastes som før. */
  /* «Hent tilbake» merker prosjektet som brukerens eget, så det ikke legges til side igjen. */
  keepKey(t) { return 'ukeloop.keepsample.' + this.storeKey(t).replace(/^ukeloop\./, ''); }
  isLegacySample(saved, t) {
    try { if (localStorage.getItem(this.keepKey(t)) === '1') return false; } catch (e) {}
    if (!saved || !Array.isArray(saved.slides) || !saved.slides.length) return false;
    const U = window.UkeLoop, prog = String(saved.programText || '').trim();
    if (prog && (!U || prog !== String(U.SAMPLE).trim())) return false;
    const sample = this.sampleData(t || 'week').slides, K = ['type', 'title', 'day', 'time', 'place', 'kicker', 'pill', 'body', 'sub', 'headline', 'text', 'email', 'phone', 'qrUrl'];
    if (saved.slides.length !== sample.length) return false;
    const pick = x => JSON.stringify(K.map(k => x[k] == null ? '' : x[k]));
    return saved.slides.every(x => { const o = sample.find(y => y.id === x.id); return o && pick(o) === pick(x) && (!x.bg || /^images\//.test(x.bg)) && !x.bgPort && !x.vid && !(x.pips || []).length; });
  }
  archiveLegacy(t, raw) {
    const key = 'ukeloop.arkiv.' + this.storeKey(t).replace(/^ukeloop\./, '') + '.' + Date.now();
    try { localStorage.setItem(key, raw); localStorage.removeItem(this.storeKey(t)); } catch (e) { return false; }
    this._archived = { key, t };
    return true;
  }
  legacyNotice() {
    const a = this._archived; if (!a || document.querySelector('[data-ch-legacy-notice]')) return;
    const b = document.createElement('div'); b.setAttribute('data-ch-legacy-notice', '1'); b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147480000;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px);padding:10px 12px 10px 16px;border:1px solid #2b2b2b;border-radius:16px;background:#121212;color:#f3f1ec;font:500 13px Archivo,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)';
    const txt = document.createElement('span'); txt.textContent = TT('Det gamle eksempelinnholdet er lagt til side, og du starter med en tom serie.');
    const back = document.createElement('button'); back.type = 'button'; back.textContent = TT('Hent tilbake'); back.setAttribute('data-ch-legacy-restore', '1');
    back.style.cssText = 'height:30px;padding:0 14px;border:1px solid #f3f1ec;border-radius:999px;background:transparent;color:#f3f1ec;font:inherit;font-weight:700;cursor:pointer';
    back.onclick = () => { try { const raw = localStorage.getItem(a.key); if (raw) { localStorage.setItem(this.storeKey(a.t), raw); localStorage.setItem(this.keepKey(a.t), '1'); localStorage.removeItem(a.key); } } catch (e) {} location.reload(); };
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', TT('Lukk'));
    x.style.cssText = 'width:30px;height:30px;border:0;border-radius:999px;background:transparent;color:#9d998f;font:inherit;cursor:pointer'; x.onclick = () => b.remove();
    b.append(txt, back, x); document.body.append(b);
  }
  /* Gamle innebygde standardbilder og -logo i et lokalt oppsett er standardinnhold, ikke brukerens: de tas bort. */
  cleanLegacyCfg(cfg) {
    if (!cfg || typeof cfg !== 'object') return cfg;
    const OLD = new Set(['r-kveldsmat', 'r-bonn', 'r-ungdom', 'r-ungsdom', 'r-sondag']), legacy = v => typeof v === 'string' && /^images\//.test(v);
    const out = { ...cfg };
    if (legacy(out.logoSrc)) out.logoSrc = null;
    if (Array.isArray(out.imgRules)) out.imgRules = out.imgRules.filter(r => !(r && OLD.has(r.id) && legacy(r.bg) && !r.bgPort)).map(r => legacy(r.bg) ? { ...r, bg: null } : r).filter(r => r.kw || r.bg || r.bgPort);
    if (out.standard && String(out.standard).trim() === 'Tirsdag kl 19 Kveldsmat i kafeen\nTorsdag kl 11 Bønn\nFredag kl 19 Ungsdomsmøte\nSøndag Kl 11:00 Søndagsmøte') delete out.standard;
    return out;
  }
  loadSaved(t) {
    let saved = null, raw = null;
    try { raw = localStorage.getItem(this.storeKey(t)); saved = JSON.parse(raw || 'null'); } catch (e) {}
    if (saved && !this.customId && this.isLegacySample(saved, t) && this.archiveLegacy(t, raw)) return null;
    if (saved && saved.cfg) saved.cfg = this.cleanLegacyCfg(saved.cfg);
    if (saved && (typeof saved !== 'object' || !Array.isArray(saved.slides) || (saved.cfg && typeof saved.cfg !== 'object'))) saved = null;
    if (saved) saved.slides = saved.slides.filter(x => x && typeof x === 'object' && typeof x.id === 'string' && ['day', 'text', 'contact', 'outro'].includes(x.type));
    return saved && saved.slides.length ? saved : null;
  }
  saveNow() {
    const s = this.state; clearTimeout(this._sv); if (this.demo) return;
    try { localStorage.setItem(this.storeKey(s.tpl), JSON.stringify({ programText: s.programText, slides: s.slides, cfg: s.cfg, videoName: s.videoName, audioName: s.audioName })); } catch (e) {}
  }
  /* Nye brukere starter med en tom lysbildeserie (ingen eksempeltekst, ingen bilder). Eksempelinnholdet brukes bare i
     demoen (?demo=1), som får genererte bakgrunner og aldri lagres. */
  defaults(tpl) { const s = this.sampleData(tpl); return { programText: '', cfg: s.cfg, slides: [] }; }
  sampleData(tpl) {
    const U = window.UkeLoop;
    if (tpl === 'sunday') return { programText: '', cfg: { header: 'Søndagsmøte', topLabel: 'Velkommen' }, slides: [
      { id: 'sun-velkommen', type: 'text', kicker: 'Velkommen', pill: 'Kl 11:00', body: 'Velkommen til søndagsmøte! Finn deg en plass, så begynner vi om litt.', sub: 'Møtet sendes også direkte på nett', bg: null, bgOpacity: 1, dur: 6 },
      { id: 'sun-idag', type: 'text', kicker: 'I dag', pill: '', body: 'Tale ved Navn Navnesen', sub: 'Tema: Skriv tema her', bg: null, bgOpacity: 0.7, dur: 6 },
      { id: 'sun-nett', type: 'text', kicker: 'Følg oss', pill: '', body: 'Abonner på YouTube-kanalen og følg Facebook-siden for å få med deg alt som skjer.', sub: '', bg: null, bgOpacity: 1, dur: 6 },
      { id: 'sun-outro', type: 'outro', title: 'Søndagsmøte', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 }
    ] };
    if (tpl === 'youth') return { programText: '', cfg: { header: 'Ungdomsmøte', topLabel: 'Fredag kl 19', accent: '#8fe3cf', font: 'Oswald', titleScale: 1.15, style: 'promo', duotone: true, kickerStyle: 'box', kickerLine: false, transFx: 'panels', textFx: 'glitch', overlayFx: 'grain', fxAmount: 0.45, sweep: false, kenBurns: true, overlay: 0.8, beatExtras: ['step', 'vig'], beatEvery: 4, beatLevel: 1.3, beatPulse: 0.7 }, slides: [
      { id: 'ung-velkommen', type: 'text', kicker: 'Fredag', pill: 'Kl 19:00', body: 'Velkommen til ungdomsmøte!', sub: 'Vi starter snart – finn en plass', bg: null, bgOpacity: 1, dur: 5 },
      { id: 'ung-ikveld', type: 'text', kicker: 'I kveld', pill: '', body: 'Lovsang · Tale · Kiosk', sub: 'Skriv inn kveldens taler her', bg: null, bgOpacity: 1, dur: 5 },
      { id: 'ung-etterpa', type: 'text', kicker: 'Etterpå', pill: '', body: 'Henge, spill og kiosk', sub: 'Ta med en venn neste gang', bg: null, bgOpacity: 1, dur: 4.5 },
      { id: 'ung-folg', type: 'contact', kicker: 'Følg oss', pill: '', headline: 'Følg ungdommen på Instagram', text: 'Skann koden eller søk etter', email: '@brukernavn', phone: '', qrUrl: 'https://instagram.com/', bg: null, bgOpacity: 1, dur: 5 },
      { id: 'ung-outro', type: 'outro', title: 'Ungdomsmøte', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 }
    ] };
    if (tpl === 'blank') return { programText: '', cfg: { header: '', topLabel: '' }, slides: [
      { id: 'tom-1', type: 'text', kicker: 'Overskrift', pill: '', body: 'Skriv teksten din her', sub: '', bg: null, bgOpacity: 1, dur: 5 }
    ] };
    return { programText: U.SAMPLE, cfg: { header: 'Ukentlige møter', topLabel: 'Program for uken' }, slides: [
      ...this.daySlides(U.parse(U.SAMPLE), []),
      { id: 'txt-velkommen', type: 'text', kicker: 'Velkommen', pill: 'Søndag kl 11', body: 'Vi ønsker deg hjertelig velkommen til å ta del i fellesskapet, enten du følger oss på nett eller tar turen innom. Abonner gjerne på YouTube-kanalen og følg Facebook-siden!', sub: 'Vi sender møtet direkte hver søndag kl 11', bg: null, bgOpacity: 1, dur: 6 },
      { id: 'kontakt-teknisk', type: 'contact', kicker: 'Teknisk team', pill: '', headline: 'Ønsker du å være en del av teknisk team?', text: 'Ta kontakt – skann koden eller send e-post til', email: 'post@kirken.no', phone: '', qrUrl: 'mailto:post@kirken.no', bg: null, bgOpacity: 0.5, dur: 5 },
      { id: 'outro', type: 'outro', title: 'Ukentlige møter', sub: 'Alle er velkommen', bg: null, bgOpacity: 1, dur: 3.5 }
    ] };
  }
  async init() {
    const U = window.UkeLoop;
    let tpl = 'week'; try { tpl = new URLSearchParams(location.search).get('mal') || localStorage.getItem('ukeloop.tpl') || 'week'; } catch (e) {}
    if (!this.tplNames()[tpl]) tpl = 'week';
    try {
      const cid = new URLSearchParams(location.search).get('id') || '';
      const list = (JSON.parse(localStorage.getItem('loopstudio.tpls.v1') || 'null') || {}).cards || [];
      const card = Array.isArray(list) ? list.find(c => c && c.id === cid) : null;
      const did = new URLSearchParams(location.search).get('disk') || '';
      if (/^d-[a-z0-9]{4,16}$/.test(did)) {
        const ent = this.diskList().find(d => d.id === did);
        if (ent) { this.diskId = did; this.customId = did; this.customName = ent.name; this.diskData = ent.data; }
      }
      if (this.diskId) {}
      else if (/^c-[a-z0-9]{4,16}$/.test(cid)) { this.customId = cid; this.customName = card && typeof card.title === 'string' ? card.title.slice(0, 60) : 'Egen mal'; }
      else if (card && typeof card.title === 'string' && card.title.trim() && card.title !== this.tplNames()[tpl]) this.customName = card.title.slice(0, 60);
    } catch (e) {}
    if (new URLSearchParams(location.search).get('demo') !== '1') try { localStorage.setItem('ukeloop.tpl', tpl); } catch (e) {}
    this.baseCfg = this.state.cfg; this.tplCfg = (this.defaults(tpl) || {}).cfg || {};
    const dd = this.diskData && Array.isArray(this.diskData.slides) && this.diskData.slides.length ? { ...this.diskData, slides: this.diskData.slides.filter(x => x && typeof x === 'object' && typeof x.id === 'string' && ['day', 'text', 'contact', 'outro'].includes(x.type)) } : null;
    this.demo = new URLSearchParams(location.search).get('demo') === '1' && !this.customId && !this.diskId;
    const base = this.demo ? await this.demoData(tpl) : dd || this.loadSaved(tpl) || this.defaults(tpl);
    if (this.demo) this.demoBanner(tpl); else this.legacyNotice();
    this._initAt = performance.now();
    this.setState({ ready: true, tpl, programText: base.programText || '', slides: base.slides, cfg: { ...this.state.cfg, ...(base.cfg || {}) }, videoName: base.videoName || '', audioName: base.audioName || '', selected: (base.slides[0] || {}).id || null });
    /* only one sound engine per page: close every earlier context (reload / remount / live code updates) */
    (window.__ukeloopCtxs || []).forEach(x => { try { x.close(); } catch (e) {} });
    window.__ukeloopCtxs = [];
    const old = window.__ukeloopAudio;
    if (old) { try { old.actl && old.actl.stop(); } catch (e) {} try { old.ac && old.ac.close(); } catch (e) {} try { old.video && old.video.remove(); } catch (e) {} window.__ukeloopAudio = null; }
    document.querySelectorAll('video[data-ukeloop-bg]').forEach(x => { try { x.pause(); x.remove(); } catch (e) {} });
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.setAttribute('data-ukeloop-bg', '1');
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.appendChild(v); this.media.video = v;
    try {
      const C = window.AudioContext || window.webkitAudioContext, ac = new C();
      window.__ukeloopCtxs.push(ac);
      const mix = ac.createGain(), sp = ac.createGain(), dest = ac.createMediaStreamDestination();
      mix.connect(sp); sp.connect(ac.destination); mix.connect(dest);
      this.actx = ac; this.gSpeaker = sp; this.aDest = dest; this._mix = mix; this.actl = U.audioCtl(ac, mix);
      document.querySelectorAll('video[data-ukeloop-slide]').forEach(x => { try { x.pause(); x.remove(); } catch (e) {} });
      window.__ukeloopAudio = { ac, actl: this.actl, video: v, owner: this };
    } catch (e) {}
    this.setState({ audioLib: this.libRead() });
    try { const ab = await U.store.get('audio'); if (ab) { this.loadAudioBlob(ab); const an = this.state.audioName; if (an && !this.libRead().some(t => t.name === an)) this.libAdd(ab, an); } } catch (e) {}
    try { ['400', '500', '600', '700'].forEach(w => document.fonts.load(w + ' 40px Archivo').catch(() => {})); document.fonts.addEventListener('loadingdone', () => { this._fontTick = (this._fontTick || 0) + 1; }); } catch (e) {}
    if (base.cfg && base.cfg.font && base.cfg.font !== 'Archivo') this.setFont(base.cfg.font);
    base.slides.forEach(s => { if (s.bg) this.ensureImg(s.bg); (s.pips || []).forEach(p => p && p.src && this.ensureImg(p.src)); });
    this.t0 = performance.now();
    this.loop();
    this.loadVideo();
    this.initShared(tpl);
    this.waitQR(0);
  }
  past = []; future = [];
  snapOf(S) { return { slides: S.slides, cfg: S.cfg, programText: S.programText }; }
  trackHistory() {
    const S = this.state, cur = this.snapOf(S), prev = this._snap;
    if (!prev) { this._snap = cur; return; }
    if (prev.slides === cur.slides && prev.cfg === cur.cfg && prev.programText === cur.programText) return;
    const now = performance.now();
    if (this._restoring || now - (this._initAt || 0) < 2500) { this._restoring = false; this._snap = cur; return; }
    if (now - (this._lastChange || 0) > 700) { this.past.push(prev); if (this.past.length > 100) this.past.shift(); }
    this._lastChange = now; this.future = []; this._snap = cur;
    this.setState({ hist: this.past.length + ':' + this.future.length });
  }
  restore(from, to) {
    if (!from.length) return;
    const target = from.pop(); to.push(this.snapOf(this.state));
    this._restoring = true; this._lastChange = 0;
    this.setState({ slides: target.slides, cfg: target.cfg, programText: target.programText, hist: this.past.length + ':' + this.future.length, parseMsg: '' });
  }
  undo = () => this.restore(this.past, this.future);
  redo = () => this.restore(this.future, this.past);
  onKey = e => {
    const tg0 = e.target && e.target.tagName;
    if ((e.code === 'Space' || e.key === ' ') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (tg0 === 'INPUT' || tg0 === 'TEXTAREA' || tg0 === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      if (tg0 === 'BUTTON' && e.target.blur) e.target.blur();
      this.togglePlay();
      return;
    }
    if (!(e.metaKey || e.ctrlKey) || String(e.key).toLowerCase() !== 'z' && String(e.key).toLowerCase() !== 'y') return;
    const tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    e.preventDefault();
    if (e.shiftKey || String(e.key).toLowerCase() === 'y') this.redo(); else this.undo();
  };
  syncState() {
    const S = this.state;
    if (!S.ready) return;
    this.trackHistory();
    const L = this._last || {};
    if (L.slides !== S.slides) S.slides.forEach(s => { if (s.bg) this.ensureImg(s.bg); if (s.bgPort) this.ensureImg(s.bgPort); (s.pips || []).forEach(p => p && p.src && this.ensureImg(p.src)); });
    if (L.cfg !== S.cfg && S.cfg.logoSrc) this.ensureImg(S.cfg.logoSrc);
    if (L.cfg !== S.cfg) (S.cfg.imgRules || []).forEach(r => { r.bg && this.ensureImg(r.bg); r.bgPort && this.ensureImg(r.bgPort); });
    if (L.cfg && L.cfg !== S.cfg) this.queueShared();
    if (L.slides !== S.slides || L.cfg !== S.cfg || L.programText !== S.programText || L.videoName !== S.videoName || L.audioName !== S.audioName) {
      this._last = { slides: S.slides, cfg: S.cfg, programText: S.programText, videoName: S.videoName, audioName: S.audioName };
      clearTimeout(this._sv);
      this._sv = setTimeout(() => {
        const s = this.state; if (this.demo) return;
        try { localStorage.setItem(this.storeKey(s.tpl), JSON.stringify({ programText: s.programText, slides: s.slides, cfg: s.cfg, videoName: s.videoName, audioName: s.audioName })); } catch (e) {}
        if (performance.now() - (this._initAt || 0) > 1500) this.autoDisk();
      }, 700);
    }
  }
  async ensureImg(id) {
    if (this.media.images[id] || this.loading[id]) return;
    if (!this.isStored(id) && !this.safeSrc(id)) return;
    this.loading[id] = 1;
    let url = id;
    if (id.startsWith('img-')) {
      try { const b = await window.UkeLoop.store.get(id); if (!b) return; url = URL.createObjectURL(b); } catch (e) { return; }
    } else if (id.startsWith('ch:')) {
      const u = window.MLCloud && window.MLCloud.url ? await window.MLCloud.url(id).catch(() => null) : null;
      if (!u) { delete this.loading[id]; return; } url = u;
    }
    const im = new Image(); im.onerror = () => {}; im.src = url; this.media.images[id] = im;
    if (this.alive) this.setState(s => ({ urls: { ...s.urls, [id]: url } }));
  }
  makeQR(url) {
    if (!url || !window.qrcode || /^https?:\/\/$/.test(url)) return null;
    if (this.qrCache[url]) return this.qrCache[url];
    try {
      const Q = window.qrcode;
      if (Q.stringToBytesFuncs && Q.stringToBytesFuncs['UTF-8']) Q.stringToBytes = Q.stringToBytesFuncs['UTF-8'];
      const q = Q(0, 'M'); q.addData(url); q.make();
      const n = q.getModuleCount(), rows = [];
      for (let r = 0; r < n; r++) { let s = ''; for (let c = 0; c < n; c++) s += q.isDark(r, c) ? '1' : '0'; rows.push(s); }
      return (this.qrCache[url] = { rows, img: q.createDataURL(4, 2) });
    } catch (e) { return null; }
  }
  waitQR(n) {
    if (!this.alive) return;
    if (window.qrcode) { this.setState(s => ({ slides: s.slides.map(x => x.type === 'contact' && x.qrUrl && !x.qr ? { ...x, qr: (this.makeQR(x.qrUrl) || {}).rows || null } : x) })); return; }
    if (n < 100) setTimeout(() => this.waitQR(n + 1), 100);
  }

  resolved() {
    const S = this.state;
    const ak = (S.audioName || '') + '|' + (S.audioDur || 0) + '|' + (S.beatInfo ? S.beatInfo.bpm + ':' + S.beatInfo.first : '');
    if (this._rk === S.slides && this._rc === S.cfg && this._ra === ak) return this._r;
    /* video slides always last exactly as long as their video */
    let all = S.slides.map(s => ({ ...s, dur: s.vid && s.vidLen ? Math.max(1.5, Math.min(300, Number(s.vidLen))) : Math.max(1.5, Number(s.dur) || S.cfg.defDur || 5) }));
    if (S.cfg.audioMode === 'fit' && S.audioName && S.audioDur) {
      const vs = all.filter(s => !s.hidden && s.vid).reduce((a, s) => a + s.dur, 0);
      const seg = Math.max(3, S.audioDur - (S.cfg.audioOffset || 0) - vs), sum = all.filter(s => !s.hidden && !s.vid).reduce((a, s) => a + s.dur, 0);
      if (sum > 0) { const k = seg / sum; all = all.map(s => s.vid ? s : ({ ...s, dur: Math.max(1.5, s.dur * k) })); }
    }
    const bt = S.cfg.audioMode === 'beat' ? this.beat() : null;
    if (bt) { const bar = 4 * bt.p, mn = Math.ceil(3 / bar), fix = S.cfg.beatBars || 0; all = all.map(s => s.vid ? s : ({ ...s, dur: Math.max(mn, fix || Math.round(s.dur / bar)) * bar })); }
    this._rk = S.slides; this._rc = S.cfg; this._ra = ak; this._p = null;
    return (this._r = { all, active: all.filter(s => !s.hidden) });
  }
  cleanPanels(p) { return Array.isArray(p) && p.length ? p.filter(x => x && /^#[0-9a-f]{6}$/i.test(x.color || '')).map(x => ({ color: x.color, alpha: Math.max(0, Math.min(1, Number(x.alpha))) })) : null; }
  cleanToff(o) {
    if (!o || typeof o !== 'object') return null;
    const r = {}; for (const k in o) { const v = o[k]; if (/^(day|title|kicker|body|sub|headline|text|email)$/.test(k) && v && (v.x || v.y)) r[k] = { x: Math.max(-1, Math.min(1, Number(v.x) || 0)), y: Math.max(-1, Math.min(1, Number(v.y) || 0)) }; }
    return Object.keys(r).length ? r : null;
  }
  cleanTsc(o) {
    if (!o || typeof o !== 'object') return null;
    const r = {}; for (const k in o) { const v = Number(o[k]); if (/^(day|time|place|title|kicker|pill|body|sub|headline|text|email|phone)$/.test(k) && v > 0 && v !== 1) r[k] = Math.max(0.3, Math.min(4, v)); }
    return Object.keys(r).length ? r : null;
  }
  cleanFtexts(a) {
    if (!Array.isArray(a) || !a.length) return null;
    const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    const r = a.filter(t => t && typeof t === 'object').slice(0, 12).map(t => ({ text: String(t.text == null ? '' : t.text).slice(0, 400), x: n(t.x, -0.2, 1.2, 0.5), y: n(t.y, -0.2, 1.2, 0.3), size: n(t.size, 0.2, 8, 1),
      color: /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '#ffffff', bold: t.bold !== false, upper: !!t.upper, box: !!t.box, boxColor: /^#[0-9a-f]{6}$/i.test(t.boxColor || '') ? t.boxColor : null }));
    return r.length ? r : null;
  }
  cleanFqr(q) {
    if (!q || typeof q !== 'object') return null;
    const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    const url = String(q.url || '').trim().slice(0, 600), m = this.makeQR(url || 'Skann meg');
    return { url, kind: q.kind, val: q.val, extra: q.extra, qr: m ? m.rows : null, x: n(q.x, -0.2, 1.2, 0.82), y: n(q.y, -0.2, 1.2, 0.42), size: n(q.size, 60, 1000, 260), caption: String(q.caption || '').slice(0, 80), contact: String(q.contact || '').slice(0, 80), color: /^#[0-9a-f]{6}$/i.test(q.color || '') ? q.color : null };
  }
  cleanPips(a) {
    if (!Array.isArray(a) || !a.length) return null;
    const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    const r = a.filter(p => p && typeof p.src === 'string' && (this.isStored(p.src) || this.safeSrc(p.src))).slice(0, 8)
      .map(p => ({ src: p.src, x: n(p.x, -0.2, 1.2, 0.72), y: n(p.y, -0.2, 1.2, 0.4), w: n(p.w, 0.03, 1.5, 0.3), r: n(p.r, 0, 200, 18), op: n(p.op, 0, 1, 1), border: !!p.border, borderColor: /^#[0-9a-f]{6}$/i.test(p.borderColor || '') ? p.borderColor : null, shadow: p.shadow !== false }));
    return r.length ? r : null;
  }
  cleanTcol(o) {
    if (!o || typeof o !== 'object') return null;
    const r = {}; for (const k in o) if (/^(day|date|time|place|title|kicker|pill|body|sub|headline|text|email|phone)$/.test(k) && /^#[0-9a-f]{6}$/i.test(o[k] || '')) r[k] = o[k];
    return Object.keys(r).length ? r : null;
  }
  hsl2hex(h, s, l) {
    s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
    return '#' + f(0) + f(8) + f(4);
  }
  randPanels() {
    const p = this.pickPal(), al = [1, 1, 0.9, 1, 0.6], dark = p.slice().sort((a, b) => this.lum(a) - this.lum(b))[0];
    const mix = (x, k) => '#' + [1, 3, 5].map(j => Math.round(parseInt(x.slice(j, j + 2), 16) * k).toString(16).padStart(2, '0')).join('');
    return { panels: p.map((c, i) => ({ color: c, alpha: al[i] })), bg: mix(dark, 0.35) };
  }
  lum(x) { return [1, 3, 5].map(j => parseInt(x.slice(j, j + 2), 16)).reduce((a, v, i) => a + v * [0.299, 0.587, 0.114][i], 0); }
  cleanOv(o) {
    if (!o || typeof o !== 'object') return null;
    const A = { transFx: ['fade', 'dip', 'slide', 'zoom', 'glitch', 'panels', 'cut'], textFx: ['reveal', 'fade', 'slide', 'blur', 'pop', 'glitch', 'none'], overlayFx: ['none', 'grain', 'leak', 'bokeh', 'snow', 'newyear', 'lines'], style: ['promo', 'plain'], kickerStyle: ['box', 'plain'] };
    const r = {};
    for (const k in A) if (A[k].includes(o[k])) r[k] = o[k];
    if (typeof o.kenBurns === 'boolean') r.kenBurns = o.kenBurns;
    if (typeof o.sweep === 'boolean') r.sweep = o.sweep;
    return Object.keys(r).length ? r : null;
  }
  sd(s) { return { id: s.id, type: s.type, extra: !!s.extra, day: s.day, date: s.date, time: s.time, title: s.title, place: s.place, kicker: s.kicker, pill: s.pill, body: s.body, sub: s.sub, headline: s.headline, text: s.text, email: s.email, phone: s.phone, qr: s.qr, bg: this.bgOf(s), bgOpacity: s.bgOpacity, vig: s.vig, vigColor: /^#[0-9a-f]{6}$/i.test(s.vigColor || '') ? s.vigColor : null, vigType: this.VIGT.includes(s.vigType) ? s.vigType : null, vigRot: s.vigRot == null ? null : Math.max(-180, Math.min(180, Number(s.vigRot) || 0)), vigSoft: s.vigSoft == null ? null : Math.max(0, Math.min(1, Number(s.vigSoft))), vigSize: s.vigSize == null ? null : Math.max(0.2, Math.min(3, Number(s.vigSize) || 1)), vigAmt: s.vigAmt == null ? null : Math.max(0, Math.min(2, Number(s.vigAmt))), vigAlpha: s.vigAlpha == null ? null : Math.max(0, Math.min(1, Number(s.vigAlpha))), fx: s.fx, fy: s.fy, panX: s.panX == null ? null : Math.max(0, Math.min(1, Number(s.panX))), panY: s.panY == null ? null : Math.max(0, Math.min(1, Number(s.panY))), noLogo: !!s.noLogo, vigOff: !!s.vigOff, tintMode: s.tintMode || 'auto', tint: /^#[0-9a-f]{6}$/i.test(s.tint || '') ? s.tint : null, tintAmt: s.tintAmt, ov: this.cleanOv(s.ov), tcol: this.cleanTcol(s.dateLink === false ? s.tcol : (() => { const o = { ...(s.tcol || {}) }; delete o.date; return o; })()), tsc: this.cleanTsc(s.tsc), toff: this.cleanToff(s.toff), pips: this.cleanPips(s.pips), ftexts: this.cleanFtexts(s.ftexts), fqr: this.cleanFqr(s.fqr), panels: this.cleanPanels(s.panels), panelBg: /^#[0-9a-f]{6}$/i.test(s.panelBg || '') ? s.panelBg : null, qrX: s.qrX, qrY: s.qrY, qrSize: s.qrSize, dur: s.dur, bgFill: (() => { const f = s.bgFill; if (!f || !this.FILLM.includes(f.mode) || f.mode === 'none') return null; const st = this.fillStops(f); return { mode: f.mode, stops: st, angle: Math.max(0, Math.min(360, Number(f.angle) || 0)), soft: f.soft == null ? 0.5 : Math.max(0, Math.min(1, Number(f.soft))), sharp: Math.max(0, Math.min(1, Number(f.sharp) || 0)), repeat: f.repeat == null ? null : Math.max(1, Math.min(20, Math.round(Number(f.repeat)))), x: f.x == null ? 0.5 : Math.max(-0.5, Math.min(1.5, Number(f.x))), y: f.y == null ? 0.5 : Math.max(-0.5, Math.min(1.5, Number(f.y))) }; })(), oAmt: s.oAmt == null ? null : Math.max(0, Math.min(1.5, Number(s.oAmt))), oSpeed: s.oSpeed == null ? null : Math.max(0.1, Math.min(4, Number(s.oSpeed))), oAlpha: s.oAlpha == null ? null : Math.max(0, Math.min(1, Number(s.oAlpha))), oColor: /^#[0-9a-f]{6}$/i.test(s.oColor || '') ? s.oColor : null, vigs: this.cleanVigs(s.vigs), vid: typeof s.vid === 'string' && s.vid.startsWith('vid-') ? s.vid : null, vidSound: s.vidSound !== false, vidMusic: !!s.vidMusic, vidVol: s.vidVol == null ? 1 : Math.max(0, Math.min(1, Number(s.vidVol) || 0)) }; }
  payload() {
    const R = this.resolved();
    if (this._p) return this._p;
    const c = this.state.cfg, bt = c.audioMode === 'beat' ? this.beat() : null;
    return (this._p = { cfg: { accent: c.accent, header: c.header, topLabel: c.topLabel, headerX: c.headerX, headerY: c.headerY, topLabelX: c.topLabelX, topLabelY: c.topLabelY, overlay: c.overlay, rail: c.rail, vigOn: c.vigOn, vigColor: /^#[0-9a-f]{6}$/i.test(c.vigColor || '') ? c.vigColor : null, vigType: this.VIGT.includes(c.vigType) ? c.vigType : 'auto', vigs: this.cleanVigs(c.vigs), ...['vigRot', 'vigOpen', 'vigX', 'vigY', 'vigSize', 'vigAmt', 'vigAlpha', 'vigSoft'].reduce((o, k) => { if (c[k] != null && isFinite(Number(c[k]))) o[k] = Number(c[k]); return o; }, {}),
      logoSrc: c.logoSrc, logoOn: c.logoOn, logoSize: c.logoSize, headerScale: c.headerScale, topLabelScale: c.topLabelScale, logoX: c.logoX, logoY: c.logoY, logoOpacity: c.logoOpacity,
      style: c.style, duotone: !!c.duotone, kickerStyle: c.kickerStyle, palette: Array.isArray(c.palette) ? c.palette : null,
      panels: Array.isArray(c.panels) ? c.panels.filter(p => p && /^#[0-9a-f]{6}$/i.test(p.color || '')).map(p => ({ color: p.color, alpha: Math.max(0, Math.min(1, Number(p.alpha))) })) : null, panelsRotate: !!c.panelsRotate, panelBg: /^#[0-9a-f]{6}$/i.test(c.panelBg || '') ? c.panelBg : null,
      tintColor: /^#[0-9a-f]{6}$/i.test(c.tintColor || '') ? c.tintColor : null, tintAmt: c.tintAmt, tintBlend: c.tintBlend,
      transFx: c.transFx, textFx: c.textFx, overlayFx: c.overlayFx, fxAmount: c.fxAmount, ovSpeed: c.ovSpeed, ovAlpha: c.ovAlpha, ovColor: /^#[0-9a-f]{6}$/i.test(c.ovColor || '') ? c.ovColor : null, fxSpeed: c.fxSpeed, kenBurns: c.kenBurns, sweep: c.sweep, font: c.font, titleScale: c.titleScale, textScale: c.textScale,
      beat: bt ? bt.p : null, kickerLine: c.kickerLine === false ? false : c.kickerLine === 'both' || c.kickerLine === 'mid' ? c.kickerLine : true, overlaySync: c.overlaySync !== false, beatFx: (c.beatExtras || []).filter(k => k === 'step' || k === 'vig'), beatReframe: c.beatReframe !== false, beatPolish: c.beatPolish !== false, beatLevel: c.beatLevel || 1, beatEvery: c.beatEvery >= 4 ? c.beatEvery : 8,
      beatStyle: bt ? this.beatStyle() : null, energyAdaptive: c.energyAdaptive !== false, energy: bt && this.state.beatInfo.env ? this.state.beatInfo.env : null, energyRate: bt && this.state.beatInfo.envRate || 2, energyOff: bt ? this.audioOpts().offset : 0, beatPulse: c.beatPulse, beatText: c.beatText, beatNudge: (c.beatNudge || 0) / 1000 }, slides: R.active.map(s => this.sd(s)) });
  }
  updPlayhead(loc, R, live, scrub) {
    const strip = this.stripRef.current, tr = this.trackRef.current, fill = this.fillRef.current, head = this.headRef.current;
    if (!strip || !tr || !fill || !head) return;
    const all = R.all || [], cards = [...strip.children].filter(el => el !== tr).slice(0, all.length);
    if (!cards.length) { tr.style.width = '0px'; return; }
    const last = cards[cards.length - 1], endX = last.offsetLeft + last.offsetWidth;
    let x = 0;
    const useLoc = (live || scrub) && loc && R.active;
    const cur = useLoc ? R.active[loc.i] : all.find(x => x.id === this.state.selected);
    let T = 0, tot = (R.active || []).reduce((a, x) => a + x.dur, 0);
    if (cur) {
      const idx = all.findIndex(x => x.id === cur.id), el = cards[idx], d = Math.max(0.001, cur.dur || 1);
      const p = useLoc ? Math.max(0, Math.min(1, (loc.lt || 0) / d)) : 0;
      if (el) x = el.offsetLeft + el.offsetWidth * p;
      const ai = (R.active || []).findIndex(a => a.id === cur.id);
      T = ai >= 0 ? this.startOf(R.active, ai) + p * d : 0;
    }
    this._layout = { cards, all };
    const tm = this.timeRef.current;
    if (tm) { const f = v => { v = Math.max(0, Math.floor(v)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); }; const txt = f(T) + ' / ' + f(tot); if (tm.textContent !== txt) tm.textContent = txt; }
    const w = Math.round(endX) + 'px';
    if (tr.style.width !== w) tr.style.width = w;
    fill.style.width = x.toFixed(1) + 'px';
    head.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    if (live && !this._scrub && performance.now() - (this._stripTouch || 0) > 3000) {
      const vl = strip.scrollLeft, vr = vl + strip.clientWidth;
      if (x < vl + 20 || x > vr - 40) { this._autoScrolling = true; strip.scrollLeft = Math.max(0, x - strip.clientWidth * 0.25); requestAnimationFrame(() => { this._autoScrolling = false; }); }
    }
  }
  scrubAt(clientX) {
    const tr = this.trackRef.current, L = this._layout, R = this.resolved();
    if (!tr || !L || !R.active.length) return null;
    const x = clientX - tr.getBoundingClientRect().left;
    let k = L.cards.findIndex(el => x < el.offsetLeft + el.offsetWidth + 5);
    if (k < 0) k = L.cards.length - 1;
    let el = L.cards[k], p = Math.max(0, Math.min(0.999, (x - el.offsetLeft) / el.offsetWidth));
    let ai = R.active.findIndex(a => a.id === (L.all[k] || {}).id);
    if (ai < 0) { for (let j = k + 1; j < L.all.length && ai < 0; j++) ai = R.active.findIndex(a => a.id === L.all[j].id); if (ai < 0) ai = R.active.length - 1; p = 0; }
    const s = R.active[ai];
    return { T: this.startOf(R.active, ai) + p * s.dur, id: s.id };
  }
  onScrubDown = e => {
    if (this.state.rec || e.button > 0) return;
    const h = this.scrubAt(e.clientX); if (!h) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    this._scrub = { was: !!this.state.playing };
    this.hardStopAudio(); this.setState({ playing: false, scrubT: h.T, selected: h.id });
  };
  onScrubMove = e => {
    if (!this._scrub) return;
    const h = this.scrubAt(e.clientX); if (h && (h.T !== this.state.scrubT)) this.setState({ scrubT: h.T, selected: h.id });
  };
  onScrubUp = () => {
    if (!this._scrub) return;
    const was = this._scrub.was; this._scrub = null;
    if (was && this.state.scrubT != null) { this.t0 = performance.now() - this.state.scrubT * 1000; this.setState({ playing: true, scrubT: null }); }
  };
  portrait() { return this.state.cfg.orient === 'port'; }
  bgField() { return this.portrait() ? 'bgPort' : 'bg'; }
  bgOf(x) { return !x ? null : this.portrait() ? (x.bgPort || x.bg || null) : (x.bg || null); }
  fmtLabel() { const d = this.dims(); return (this.portrait() ? '9:16' : '16:9') + ' · ' + d.W + '×' + d.H; }
  /* plays only the given slide in a loop so an effect can be tested; changes for all slides never autoplay */
  testSlide(id) { if (!id || this.state.rec || this.state.playing) return; this._tst0 = performance.now(); this.setState({ tst: id, scrubT: null }); this._pk = null; }
  dims() { const d = this.state.cfg.res === '4k' ? { W: 3840, H: 2160 } : { W: 1920, H: 1080 }; return this.portrait() ? { W: d.H, H: d.W } : d; }
  setOrient(o) {
    if ((this.state.cfg.orient || 'land') === o) return;
    const K = ['logoX', 'logoY', 'headerX', 'headerY', 'topLabelX', 'topLabelY'];
    this.media.lastRects = null; this.media.lastLogoRect = null;
    this.setState(s => {
      const alt = s.cfg.altPos || {}, cur = {}, cfg = { ...s.cfg, orient: o };
      K.forEach(k => { cur[k] = s.cfg[k] == null ? null : s.cfg[k]; cfg[k] = alt[k] == null ? null : alt[k]; });
      cfg.altPos = cur;
      const slides = s.slides.map(x => x.type !== 'contact' ? x : { ...x, qrX: x.altQrX == null ? null : x.altQrX, qrY: x.altQrY == null ? null : x.altQrY, altQrX: x.qrX == null ? null : x.qrX, altQrY: x.qrY == null ? null : x.qrY });
      return { cfg, slides };
    });
  }
  hold(s) { return Math.max(0.1, Math.min(2.4, s.dur - 0.9)); }
  startOf(list, i) { let a = 0; for (let k = 0; k < i; k++) a += list[k].dur; return a; }

  announcePlay() { try { if (this._bc && this.state.playing) this._bc.postMessage({ type: 'play', id: this._tabId }); } catch (e) {} }
  hardStopAudio() { try { this.actl && this.actl.stop(); } catch (e) {} this.pauseVids(); }
  pauseVids() { for (const k in this.media.vids) { const v = this.media.vids[k]; try { if (!v.paused) v.pause(); } catch (e) {} const g = this.vidGain[k]; if (g && this.actx) g.gain.setTargetAtTime(0, this.actx.currentTime, 0.02); } }
  async ensureVid(key) {
    if (!key || this.media.vids[key] || this.loading[key]) return;
    this.loading[key] = 1;
    let b = null; try { b = await window.UkeLoop.store.get(key); } catch (e) {}
    if (!b || !this.alive) return;
    this.attachVid(key, b);
  }
  attachVid(key, blob) {
    const v = document.createElement('video');
    v.playsInline = true; v.preload = 'auto'; v.loop = false; v.setAttribute('data-ukeloop-slide', key);
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    v.src = URL.createObjectURL(blob); document.body.appendChild(v);
    try {
      if (this.actx) { const src = this.actx.createMediaElementSource(v), g = this.actx.createGain(); g.gain.value = 0; src.connect(g); g.connect(this._mix); this.vidGain[key] = g; v.muted = false; }
      else v.muted = true;
    } catch (e) { v.muted = true; }
    const inv = () => { this._pk = null; }; v.addEventListener('seeked', inv); v.addEventListener('loadeddata', inv);
    this.media.vids[key] = v; this._pk = null;
    return v;
  }
  dropVid(key) {
    const v = this.media.vids[key]; if (!v) return;
    try { v.pause(); URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load(); v.remove(); } catch (e) {}
    try { this.vidGain[key] && this.vidGain[key].disconnect(); } catch (e) {}
    delete this.media.vids[key]; delete this.vidGain[key]; delete this.loading[key];
  }
  gcVid(key) {
    if (!key || !key.startsWith('vid-')) return;
    setTimeout(() => {
      if (this.state.slides.some(x => x.vid === key)) return;
      try { if (JSON.stringify(this.past.slice(-30)).includes(key)) return; } catch (e) {}
      this.dropVid(key); window.UkeLoop.store.del(key).catch(() => {});
    }, 1500);
  }
  curVidSlide(loc, data) { const s = loc && data && data.slides ? data.slides[loc.i] : null; return s && s.vid ? s : null; }
  syncSlideVids(loc, live, data) {
    const S = this.state, cs = this.curVidSlide(loc, data), ac = this.actx;
    const sl = data.slides || [];
    sl.forEach(x => { if (x.vid && !this.media.vids[x.vid]) this.ensureVid(x.vid); });
    /* the next video slide is parked on its first frame shortly before it starts, so it starts without a stall */
    let nextKey = null;
    if (loc && live && sl.length > 1) { const cur = sl[loc.i], nx = sl[(loc.i + 1) % sl.length]; if (nx && nx.vid && nx !== cur && cur && cur.dur - loc.lt < 2) nextKey = nx.vid; }
    /* the loop video behind is fully covered by a playing video slide: pause it to save decoding */
    const bg = this.media.video, cover = !!(cs && live && loc.lt > 1 && loc.lt < (cs.dur || 0) - 1 && this.media.vids[cs.vid] && this.media.vids[cs.vid].readyState >= 2);
    if (bg && bg.src) { if (cover && !bg.paused) bg.pause(); else if (!cover && bg.paused && live && !this._exporting) bg.play().catch(() => {}); }
    for (const k in this.media.vids) {
      const v = this.media.vids[k], g = this.vidGain[k], mine = cs && cs.vid === k;
      if (!mine || this._offscreen && !S.rec) {
        if (!v.paused) v.pause(); if (v.playbackRate !== 1) v.playbackRate = 1;
        if (g && ac) g.gain.setTargetAtTime(0, ac.currentTime, 0.02);
        if (k === nextKey && !v.seeking && v.currentTime > 0.05) v.currentTime = 0;
        continue;
      }
      const d = v.duration || 0, tgt = Math.max(0, Math.min(d ? d - 0.04 : 0, loc.lt));
      if (live) {
        if (v.ended || v.paused) { if (d && tgt < d - 0.05) { if (!v.seeking && Math.abs(v.currentTime - tgt) > 0.25) v.currentTime = tgt; v.play().catch(() => {}); } }
        else {
          /* follow the loop clock by nudging the speed; only jump when far off */
          const drift = v.currentTime - tgt;
          if (Math.abs(drift) > 1.2 && !v.seeking) { v.currentTime = tgt; v.playbackRate = 1; }
          else { const r = Math.abs(drift) < 0.06 ? 1 : drift > 0 ? 0.95 : 1.05; if (v.playbackRate !== r) v.playbackRate = r; }
        }
        const on = cs.vidSound !== false && (S.soundOn !== false || !!S.rec);
        const gv = on ? (cs.vidVol == null ? 1 : cs.vidVol) : 0;
        if (g && ac && Math.abs(g.gain.value - gv) > 0.001 && this._lastVg !== k + gv) { g.gain.setTargetAtTime(gv, ac.currentTime, 0.04); this._lastVg = k + gv; }
      } else {
        this._lastVg = null; if (v.playbackRate !== 1) v.playbackRate = 1;
        if (!v.paused) v.pause();
        if (g && ac) g.gain.setTargetAtTime(0, ac.currentTime, 0.02);
        if (d && !v.seeking && Math.abs(v.currentTime - tgt) > 0.12) v.currentTime = tgt;
      }
    }
  }
  musicDuck(loc, data) {
    const cs = this.curVidSlide(loc, data); if (!cs || cs.vidMusic) return 1;
    const lt = loc.lt, d = cs.dur || 1, r = x => Math.max(0, Math.min(1, x));
    return 1 - Math.min(r(lt / 0.5), r((d - lt) / 0.5));
  }
  loop = () => {
    if (!this.alive) { this.hardStopAudio(); return; }
    this.raf = requestAnimationFrame(this.loop);
    this._lastLoop = performance.now();
    if (this._exporting) return;
    const c = this.canvasRef.current, U = window.UkeLoop;
    this.syncState();
    if (!c || !U) return;
    const { W, H } = this.dims();
    if (!this._wheelOn && this.zoomOuter.current) { this._wheelOn = true; this._onWheel = ev => { if (this.state.fs) return; const o = this.zoomOuter.current, r = o.getBoundingClientRect(); if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); const Z = this.state.zoom || { z: 1 }; this.setZoom(Z.z * Math.exp(-ev.deltaY * 0.01), ev.clientX - r.left, ev.clientY - r.top); } else if (this.state.zoom) { ev.preventDefault(); this.panZoom(ev.deltaX, ev.deltaY); } }; this.zoomOuter.current.addEventListener('wheel', this._onWheel, { passive: false }); }
    if (!this._roOn && window.ResizeObserver) { this._roOn = true; this._ro = new ResizeObserver(() => { this._cbox = null; this._pk = null; }); this._ro.observe(c); c.parentElement && this._ro.observe(c.parentElement); }
    let k = 1;
    if (!this.state.rec) { const B = this.cbox(c), dpr = Math.min(2, window.devicePixelRatio || 1); if (B.w > 0) k = Math.min(1, Math.max(0.3, Math.ceil(B.w * dpr / W * 10) / 10));
      const vw = this.state.vigEd && this.vigEdWrap.current ? this.vigEdWrap.current.clientWidth : 0; if (vw > 0) k = Math.max(k, Math.min(1, Math.ceil(vw * dpr / W * 10) / 10)); /* vignettdialogen viser et større bilde */ }
    const BW = Math.round(W * k), BH = Math.round(H * k);
    if (c.width !== BW || c.height !== BH) { c.width = BW; c.height = BH; this._pk = null; }
    const R = this.resolved(), live = this.state.playing || this.state.rec;
    const base = this.payload();
    let data = base, t = 0;
    if (!live && data.cfg.beat) data = { ...data, cfg: { ...data.cfg, beat: null } };
    if (live && data.cfg.beat && this.actx) { const lat = this.state.rec ? 0 : (this.actx.outputLatency || this.actx.baseLatency || 0); data = { ...data, cfg: { ...data.cfg, beatNudge: (data.cfg.beatNudge || 0) + (this._alag || 0) + lat } }; }
    const tst = !live && this.state.tst ? this.state.tst : null;
    if (live) t = (performance.now() - this.t0) / 1000;
    else if (tst) {
      const el = (performance.now() - (this._tst0 || 0)) / 1000, i = R.active.findIndex(s => s.id === tst);
      if (i >= 0) { const st = this.startOf(R.active, i), pre = Math.min(0.8, st); t = st - pre + el % (R.active[i].dur + pre); }
      else { const sel = R.all.find(s => s.id === tst); if (sel) { data = { ...data, slides: [this.sd(sel)] }; t = el % (sel.dur || 5); } }
    }
    else if (this.state.scrubT != null && R.active.length) t = this.state.scrubT;
    else {
      const i = R.active.findIndex(s => s.id === this.state.selected);
      if (i >= 0) t = this.startOf(R.active, i) + this.hold(R.active[i]);
      else { const sel = R.all.find(s => s.id === this.state.selected); if (sel) data = { ...data, slides: [this.sd(sel)] }; }
    }
    const v = this.media.video, anim = live || !!tst || !!this.media.guides || (v && v.src && v.readyState >= 2) || (data.cfg.overlayFx && data.cfg.overlayFx !== 'none') || data.slides.some(x => x.ov && x.ov.overlayFx && x.ov.overlayFx !== 'none');
    let rc = 0; for (const k in this.media.images) { const im = this.media.images[k]; if (im.complete && im.naturalWidth) rc++; }
    const key = t + '|' + W + 'x' + H + '|' + rc + '|' + (this._fontTick || 0) + '|' + this.state.selected, pk = this._pk;
    let loc;
    if (this.state.rec) this.media.guides = null;
    if (!anim && pk && pk.base === base && pk.key === key) loc = pk.loc;
    else { loc = U.renderer.drawFrame(c.getContext('2d'), W, H, data, this.media, t); this._pk = anim ? null : { base, key, loc }; }
    this._duck = this.musicDuck(loc, data);
    this.syncSlideVids(loc, live, data);
    this.syncAudio(loc, live, R);
    this.updPlayhead(loc, R, live, !live && this.state.scrubT != null && R.active.length > 0);
    this.updSelBox();
    if (this.state.ovEd) { const pc = this.ovEdCanvas.current; if (pc && c.width) { if (pc.width !== c.width || pc.height !== c.height) { pc.width = c.width; pc.height = c.height; } pc.getContext('2d').drawImage(c, 0, 0); } }
    if (this.state.vigEd) { const pc = this.vigEdCanvas.current; if (pc && c.width) { if (pc.width !== c.width || pc.height !== c.height) { pc.width = c.width; pc.height = c.height; } pc.getContext('2d').drawImage(c, 0, 0); } }
    if (live && loc && loc.i !== this.state.playIdx) this.setState({ playIdx: loc.i });
    if (this.state.rec) this.tickRec();
  };

  ensureGraph() { if (this.actx && this.actx.state === 'suspended') this.actx.resume().catch(() => {}); }
  audioOpts() {
    const c = this.state.cfg, mode = c.audioMode || (c.audioRestart === false ? 'free' : 'cut');
    const fit = mode === 'fit' || mode === 'beat', bt = mode === 'beat' ? this.beat() : null;
    let offset = c.audioOffset || 0;
    if (bt) { const bar = 4 * bt.p; offset = bt.first + Math.round((offset - bt.first) / bar) * bar; while (offset < 0) offset += bar; }
    return { mode, offset, vol: this._volLive != null ? this._volLive : c.audioVol == null ? 0.8 : c.audioVol,
      fadeIn: c.audioFadeIn != null ? c.audioFadeIn : (fit ? 0.05 : 0.6), fadeOut: c.audioFadeOut != null ? c.audioFadeOut : (fit ? 0.3 : 1.0) };
  }
  beat() { const S = this.state, b = S.beatInfo; if (!b || !S.audioName) return null; const bpm = S.cfg.bpm || b.bpm; return { bpm, p: 60 / bpm, first: b.first }; }
  genres() {
    return {"auto":{"label":"Auto (analyser sangen)","desc":"Sangen analyseres, og effektene velges ut fra tempo og rytme."},"rolig":{"label":"Rolig","desc":"Lange toninger, tekst som tones inn og et bilde som nesten står stille.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":false,"transFx":"fade","textFx":"fade","beatBars":4,"overlayFx":"none","beatExtras":[],"beatLevel":0.6,"sweep":false}},"piano":{"label":"Piano","desc":"Rolig grunntone med myke overganger og tekst som kommer frem av uskarphet. Når musikken tar seg opp, går tekst og bilde raskere.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":true,"transFx":"fade","textFx":"blur","beatBars":4,"overlayFx":"bokeh","fxAmount":0.3,"beatExtras":[],"beatLevel":0.8,"sweep":false}},"episk":{"label":"Episk piano","desc":"Raskere piano med filmpreg: skifter via svart på første slag, tekst som avdekkes i takt og et bilde som sakte kommer nærmere. Bygger seg opp sammen med musikken.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":true,"transFx":"dip","textFx":"reveal","beatBars":2,"overlayFx":"leak","fxAmount":0.3,"beatExtras":["step","vig"],"beatEvery":8,"beatPulse":0.5,"beatLevel":1.3,"sweep":true}},"pop":{"label":"Pop","desc":"Upbeat og ryddig: bildene skyves inn på takten, teksten avdekkes, og bildet går et lite hakk nærmere annenhver takt.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":false,"transFx":"slide","textFx":"reveal","beatBars":2,"overlayFx":"none","beatExtras":["step"],"beatPulse":0.5,"beatLevel":1,"sweep":true,"beatEvery":8}},"upbeat":{"label":"Upbeat","desc":"Mest fart og flest effekter: zoom ved hvert skifte, tekst som spretter inn, og et lite zoomhakk og vignett på hver takt.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":false,"transFx":"zoom","textFx":"pop","beatBars":2,"overlayFx":"none","beatExtras":["step","vig"],"beatEvery":4,"beatPulse":0.55,"beatLevel":1.4,"sweep":true}},"groove":{"label":"Groove","desc":"Upbeat med eget preg: harde klipp på første slag, tekst som spretter inn, filmkorn og et lite zoomhakk på hver takt.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":false,"transFx":"cut","textFx":"pop","beatBars":2,"overlayFx":"grain","fxAmount":0.5,"beatExtras":["step"],"beatEvery":4,"beatPulse":0.5,"beatLevel":1.2,"sweep":false}},"lovsang":{"label":"Lovsang / ballade","desc":"Lange, varme overganger og tekst som tones inn ord for ord. Løfter seg litt når musikken bygger seg opp.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":true,"transFx":"fade","textFx":"fade","beatBars":4,"overlayFx":"leak","fxAmount":0.3,"beatExtras":[],"beatLevel":0.8,"sweep":false}},"gospel":{"label":"Gospel","desc":"Skifter via svart på første slag, tekst som avdekkes linje for linje og en svak vignett på takten.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":false,"transFx":"dip","textFx":"reveal","beatBars":2,"overlayFx":"leak","fxAmount":0.25,"beatExtras":["vig"],"beatEvery":8,"beatPulse":0.4,"beatLevel":1,"sweep":true}},"elektronisk":{"label":"Elektronisk","desc":"Zoom ved hvert skifte, tekst som glir inn, skannelinjer og et lite zoomhakk på hver takt.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"groove","energyAdaptive":false,"transFx":"zoom","textFx":"slide","beatBars":2,"overlayFx":"lines","fxAmount":0.4,"beatExtras":["step","vig"],"beatEvery":4,"beatPulse":0.5,"beatLevel":1.2,"sweep":true}},"akustisk":{"label":"Akustisk / visesang","desc":"Enkle toninger, rolig tekst og litt filmkorn for et naturlig uttrykk.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":true,"transFx":"fade","textFx":"fade","beatBars":4,"overlayFx":"grain","fxAmount":0.35,"beatExtras":[],"beatLevel":0.8,"sweep":false}},"kor":{"label":"Kor / klassisk","desc":"Stille og verdig: skifter via svart, tekst som tones inn og et bilde som nesten står stille.","cfg":{"beatReframe":false,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":false,"transFx":"dip","textFx":"fade","beatBars":4,"overlayFx":"none","beatExtras":[],"beatLevel":0.6,"sweep":false}},"jul":{"label":"Julemusikk","desc":"Myke toninger, tekst som kommer frem av uskarphet og snø som daler rolig.","cfg":{"beatReframe":true,"beatPolish":true,"kenBurns":true,"beatText":true,"beatStyle":"calm","energyAdaptive":true,"transFx":"fade","textFx":"blur","beatBars":4,"overlayFx":"snow","fxAmount":0.5,"beatExtras":[],"beatLevel":0.8,"sweep":false}}};
  }
  applyGenre(k) {
    const all = this.genres(), bi = this.state.beatInfo, useBeat = !!this.state.audioName;
    let src = k;
    if (k === 'auto') { if (bi && bi.genre && all[bi.genre]) src = bi.genre; else { src = null; if (useBeat) this._autoPending = true; } }
    const G = src ? all[src] : null;
    this.setState(s => ({ cfg: { ...s.cfg, genre: k, ...(G && G.cfg ? G.cfg : {}), ...(useBeat && s.cfg.audioMode !== 'beat' ? { audioMode: 'beat', audioFadeIn: null, audioFadeOut: null } : {}) } }));
    if (useBeat && this.state.cfg.audioMode !== 'beat' && this.actl) this.actl.stop();
  }
  beatStyle() { const s = this.state.cfg.beatStyle, b = this.state.beatInfo; return s === 'calm' || s === 'groove' ? s : (b && b.style) || 'groove'; }
  setFont(f) { this.setCfg('font', f); if (f !== 'Helvetica') try { ['400', '500', '600', '700'].forEach(w => document.fonts.load(w + ' 40px "' + f + '"').catch(() => {})); } catch (e) {} }
  syncAudio(loc, live, R) {
    const S = this.state; if (!this.actl) return;
    if (window.__ukeloopAudio && window.__ukeloopAudio.owner !== this) { try { this.actl.stop(); } catch (e) {} return; }
    if (this._offscreen && !S.rec) { this.actl.stop(); return; }
    const want = live && !!S.audioName && (S.soundOn !== false || !!S.rec);
    const tt = loc ? this.startOf(R.active, loc.i) + loc.lt : 0;
    const ao = this.audioOpts(); if (this._duck != null && this._duck < 1) ao.vol = ao.vol * this._duck;
    this.actl.sync(want, tt, loc ? loc.total : 0, ao);
    const lg = want && ao.mode === 'beat' && this.actl.lag ? this.actl.lag(tt, ao.offset) : null;
    if (lg != null && Math.abs(lg) < 0.3) this._alag = (this._alag || 0) * 0.9 + lg * 0.1;
    this.gSpeaker.gain.setTargetAtTime(S.soundOn !== false ? 1 : 0, this.actx.currentTime, 0.03);
  }
  async loadAudioBlob(blob) {
    if (!this.actx || !this.actl) return;
    try {
      const buf = await this.actx.decodeAudioData(await blob.arrayBuffer());
      this.actl.setBuffer(buf); this.audioBuf = buf;
      if (this.alive) this.setState({ audioDur: buf.duration, beatInfo: null });
      setTimeout(() => {
        if (!this.alive) return;
        let b = null; try { b = window.UkeLoop.detectBeat(buf); } catch (e) {}
        this.setState({ beatInfo: b || { bpm: 120, first: 0, guess: true } }, () => {
          const g = this.state.cfg.genre || 'auto';
          if (b && b.genre && (this._autoPending || (this._fresh && g === 'auto'))) this.applyGenre('auto');
          this._autoPending = false; this._fresh = false;
        });
      }, 60);
    } catch (e) { if (this.alive) this.setState({ parseMsg: 'Klarte ikke å lese lydfilen. Prøv MP3 eller WAV.', parseOk: false }); }
  }
  onAudioFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'audio')) return; if (!f) return;
    this.ensureGraph();
    try { await window.UkeLoop.store.put('audio', f); } catch (err) {}
    this.libAdd(f, f.name);
    this._fresh = true;
    this.setState(s => ({ audioName: f.name, soundOn: true, cfg: { ...s.cfg, bpm: null } }));
    await this.loadAudioBlob(f);
  };
  LIBK = 'ukeloop.audiolib.v1';
  libRead() { try { const l = JSON.parse(localStorage.getItem(this.LIBK) || '[]'); if (!Array.isArray(l)) return []; const seen = new Set(); return l.filter(t => { if (!t || typeof t.id !== 'string' || typeof t.name !== 'string') return false; const k = t.name + '|' + t.size; if (seen.has(k)) return false; seen.add(k); return true; }); } catch (e) { return []; } }
  libWrite(l) { try { localStorage.setItem(this.LIBK, JSON.stringify(l)); } catch (e) {} if (this.alive) this.setState({ audioLib: l }); }
  probeDur(blob) {
    return new Promise(res => {
      let u = null, ok = false; const done = d => { if (ok) return; ok = true; try { u && URL.revokeObjectURL(u); } catch (e) {} res(isFinite(d) ? d : 0); };
      try { u = URL.createObjectURL(blob); const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); a.src = u; setTimeout(() => done(0), 8000); } catch (e) { done(0); }
    });
  }
  async libAdd(blob, name) {
    const hit = this.libRead().find(t => t.name === name && t.size === blob.size); if (hit) return hit.id;
    const id = 'a-' + Math.random().toString(36).slice(2, 10);
    try { await window.UkeLoop.store.put('lib:' + id, blob); } catch (e) { return null; }
    const dur = await this.probeDur(blob), l = this.libRead(), dup = l.find(t => t.name === name && t.size === blob.size);
    if (dup) { window.UkeLoop.store.del('lib:' + id).catch(() => {}); return dup.id; }
    l.unshift({ id, name, size: blob.size, dur, at: Date.now() }); this.libWrite(l); return id;
  }
  libUse = async id => {
    const t = this.libRead().find(x => x.id === id); if (!t || t.name === this.state.audioName) return;
    let b = null; try { b = await window.UkeLoop.store.get('lib:' + id); } catch (e) {}
    if (!b) { this.libWrite(this.libRead().filter(x => x.id !== id)); return; }
    this.ensureGraph();
    try { await window.UkeLoop.store.put('audio', b); } catch (e) {}
    this._fresh = true;
    this.setState(s => ({ audioName: t.name, soundOn: true, cfg: { ...s.cfg, bpm: null } }));
    await this.loadAudioBlob(b);
  };
  libDel = id => { window.UkeLoop.store.del('lib:' + id).catch(() => {}); this.libWrite(this.libRead().filter(x => x.id !== id)); };
  onLibFiles = async e => {
    const fs = Array.from(e.target.files || []); e.target.value = '';
    for (const f of fs) if (this.okFile(f, 'audio')) await this.libAdd(f, f.name);
  };
  removeAudio = () => {
    window.UkeLoop.store.del('audio').catch(() => {});
    if (this.actl) this.actl.setBuffer(null); this.audioBuf = null;
    this.setState({ audioName: '', audioDur: 0, beatInfo: null });
  };
  setAudioMode(m) {
    this.setState(s => ({ cfg: { ...s.cfg, audioMode: m, audioFadeIn: null, audioFadeOut: null } }));
    if (this.actl) this.actl.stop();
  }
  toggleSound = () => {
    this.ensureGraph();
    const next = this.state.soundOn === false;
    try { this.gSpeaker && this.gSpeaker.gain.setTargetAtTime(next ? 1 : 0, this.actx.currentTime, 0.02); } catch (e) {}
    this.setState({ soundOn: next });
  };
  select(id) { this.hardStopAudio(); this.setState(st => ({ selected: id, playing: false, scrubT: null, tab: 'slides', tst: st.tst === id ? st.tst : null })); }
  togglePlay = () => {
    if (this.state.rec) return;
    if (this.state.tst) { this.setState({ tst: null }); if (!this.state.playing) return; }
    this.ensureGraph();
    const R = this.resolved();
    if (this.state.playing) { this.hardStopAudio(); const s = R.active[this.state.playIdx], tot = R.active.reduce((a, x) => a + x.dur, 0) || 1; this.setState({ playing: false, selected: s ? s.id : this.state.selected, scrubT: (((performance.now() - this.t0) / 1000) % tot + tot) % tot }); }
    else if (this.state.scrubT != null && R.active.length) { this.t0 = performance.now() - this.state.scrubT * 1000; this.setState({ playing: true, scrubT: null }, () => this.announcePlay()); }
    else {
      const i = Math.max(0, R.active.findIndex(s => s.id === this.state.selected));
      this.t0 = performance.now() - Math.max(0, this.startOf(R.active, i) - 0.9) * 1000;
      this.setState({ playing: true }, () => this.announcePlay());
    }
  };
  setCfg(k, v) { this.setState(s => ({ cfg: { ...s.cfg, [k]: v }, tst: null })); }
  presets() {
    return {
      rolig: { label: 'Rolig', hint: 'Myke toninger', cfg: { transFx: 'fade', textFx: 'fade', overlayFx: 'none', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Archivo', titleScale: 1, fxAmount: 0.4 } },
      energisk: { label: 'Energisk', hint: 'Zoom og sprett', cfg: { transFx: 'zoom', textFx: 'pop', overlayFx: 'lines', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: 'box', font: 'Montserrat', titleScale: 1.1, fxAmount: 0.7 } },
      glitch: { label: 'Glitch', hint: 'Digitale hakk', cfg: { transFx: 'glitch', textFx: 'glitch', overlayFx: 'grain', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: 'box', font: 'Oswald', titleScale: 1.12, fxAmount: 0.6 } },
      promo: { label: 'Promo', hint: 'Fargepaneler', cfg: { transFx: 'panels', textFx: 'glitch', overlayFx: 'grain', kenBurns: true, sweep: false, style: 'promo', duotone: true, kickerStyle: 'box', font: 'Oswald', titleScale: 1.15, fxAmount: 0.45 } },
      kino: { label: 'Kino', hint: 'Filmkorn og lys', cfg: { transFx: 'dip', textFx: 'blur', overlayFx: 'leak', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: null, font: 'Playfair Display', titleScale: 1.05, fxAmount: 0.55 } },
      minimal: { label: 'Minimal', hint: 'Rent og enkelt', cfg: { transFx: 'cut', textFx: 'reveal', overlayFx: 'none', kenBurns: false, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Helvetica', titleScale: 1, fxAmount: 0.3 } },
      skyv: { label: 'Skyv', hint: 'Glir sidelengs', cfg: { transFx: 'slide', textFx: 'slide', overlayFx: 'bokeh', kenBurns: true, sweep: false, style: null, duotone: false, kickerStyle: null, font: 'Archivo', titleScale: 1, fxAmount: 0.5 } },
      feiring: { label: 'Feiring', hint: 'Konfetti og glød', cfg: { transFx: 'zoom', textFx: 'pop', overlayFx: 'newyear', kenBurns: true, sweep: true, style: null, duotone: false, kickerStyle: 'box', font: 'Montserrat', titleScale: 1.1, fxAmount: 0.8 } }
    };
  }
  applyPreset(k) {
    const p = this.presets()[k]; if (!p) return;
    this.setState(s => ({ cfg: { ...s.cfg, ...p.cfg, preset: k } }), () => { const f = p.cfg.font; if (f) this.setFont(f); });
  }
  addBuilt(kind, atEnd) {
    const id = 'b-' + kind + '-' + Date.now().toString(36);
    const d = this.state.cfg.defDur || 5;
    const T = {
      title: { id, type: 'outro', title: 'Stor overskrift', sub: 'Undertekst', bg: null, bgOpacity: 1, dur: d },
      text: { id, type: 'text', kicker: 'Overskrift', pill: '', body: 'Skriv teksten din her', sub: '', bg: null, bgOpacity: 1, dur: d },
      event: { id, type: 'text', kicker: 'Fredag', pill: 'Kl 19:00', body: 'Navn på arrangementet', sub: 'Sted', bg: null, bgOpacity: 1, dur: d },
      quote: { id, type: 'text', kicker: 'Dagens ord', pill: '', body: '«Skriv sitatet her»', sub: 'Kilde', bg: null, bgOpacity: 1, dur: d + 1 },
      qr: { id, type: 'contact', kicker: 'Følg oss', pill: '', headline: 'Skann koden', text: 'Eller besøk', email: 'nettside.no', phone: '', qrUrl: 'https://', bg: null, bgOpacity: 1, dur: d },
      image: { id, type: 'text', kicker: '', pill: '', body: '', sub: '', bg: null, bgOpacity: 1, dur: d }
    }[kind];
    if (!T) return;
    this.setState(s => {
      const i = atEnd ? -1 : s.slides.findIndex(x => x.id === s.selected), at = i < 0 ? s.slides.length : i + 1;
      const slides = [...s.slides.slice(0, at), T, ...s.slides.slice(at)];
      return { slides, selected: id };
    }, () => { if (T.bg) this.ensureImg && this.ensureImg(T.bg); this.waitQR && T.type === 'contact' && this.waitQR(0); });
  }
  buildVals() {
    const S = this.state, c = S.cfg;
    const chip = on => ({ bg: on ? '#f3f1ec' : 'transparent', color: on ? '#000' : '#9d998f', border: on ? '#f3f1ec' : '#2b2b2b' });
    const P = this.presets();
    const toggles = [['kenBurns', 'Ken Burns-zoom', true], ['sweep', 'Lysstripe', true], ['duotone', 'Duotone', false], ['kickerBox', 'Boks-etikett', false], ['promoBg', 'Fargepaneler bak', false], ['rail', 'Tidslinje nederst', true], ['logoOn', 'Logo', true]];
    const isOn = k => k === 'kickerBox' ? c.kickerStyle === 'box' : k === 'promoBg' ? c.style === 'promo' : c[k] == null ? toggles.find(t => t[0] === k)[2] : !!c[k];
    const flip = k => k === 'kickerBox' ? this.setCfg('kickerStyle', c.kickerStyle === 'box' ? null : 'box') : k === 'promoBg' ? this.setCfg('style', c.style === 'promo' ? null : 'promo') : this.setCfg(k, !isOn(k));
    const cols = [['#e9e7e2', 'Hvit'], ['#8fe3cf', 'Mint'], ['#5cc8ff', 'Himmelblå'], ['#b89cff', 'Lavendel'], ['#ff6b8b', 'Rosa'], ['#f5b82c', 'Gull'], ['#8fdc6a', 'Grønn']];
    const dd = c.defDur || 5;
    return {
      buildAdd: [['title', 'Stor tittel', 'Én stor linje'], ['text', 'Tekst', 'Etikett, tekst og undertekst'], ['event', 'Arrangement', 'Dag, tid og navn'], ['quote', 'Sitat', 'Bibelvers eller sitat'], ['qr', 'QR-kode', 'Lenke folk kan skanne'], ['image', 'Bilde', 'Kun bilde, ingen tekst']].map(([k, l, h]) => ({ label: l, hint: h, onClick: () => this.addBuilt(k) })),
      buildPresets: Object.entries(P).map(([k, p]) => ({ label: p.label, hint: p.hint, ...chip(c.preset === k), onClick: () => this.applyPreset(k) })),
      buildRandom: () => { const ks = Object.keys(P).filter(k => k !== c.preset); this.applyPreset(ks[Math.floor(Math.random() * ks.length)]); },
      buildToggles: toggles.map(([k, l]) => ({ label: l, ...chip(isOn(k)), onClick: () => flip(k) })),
      buildOverlay: [['none', 'Ingen'], ['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['lines', 'Linjer'], ['snow', 'Snø'], ['newyear', 'Konfetti']].map(([k, l]) => ({ label: l, ...chip((c.overlayFx || 'none') === k), onClick: () => this.setCfg('overlayFx', k) })),
      buildTempo: [[3, 'Raskt · 3 s'], [5, 'Middels · 5 s'], [7, 'Rolig · 7 s'], [10, 'Langsomt · 10 s']].map(([v, l]) => ({ label: l, ...chip(dd === v), onClick: () => this.setState(s => ({ cfg: { ...s.cfg, defDur: v }, slides: s.slides.map(x => ({ ...x, dur: x.type === 'outro' ? Math.min(v, 4) : v })) })) })),
      buildColors: cols.map(([h, l]) => ({ hex: h, label: l, ring: (c.accent || '').toLowerCase() === h ? '#ffffff' : 'transparent', onClick: () => this.setCfg('accent', h) }))
    };
  }
  setF(id, field, val) {
    this.setState(s => {
      const slides = s.slides.map(x => {
        if (x.id !== id) return x;
        const n = { ...x, [field]: val };
        if (field === 'qrUrl') n.qr = (this.makeQR(val) || {}).rows || null;
        if (field === 'day') n.dayKey = window.UkeLoop.keyOf(val);
        return n;
      });
      const upd = { slides }, me = slides.find(x => x.id === id);
      if (me && me.type === 'day' && ['day', 'date', 'time', 'title', 'place'].includes(field)) upd.programText = window.UkeLoop.serialize(slides.filter(x => x.type === 'day'));
      return upd;
    });
  }
  diskList() {
    try { const l = JSON.parse(localStorage.getItem('loopstudio.disk.v1') || '[]'); return Array.isArray(l) ? l.filter(d => d && typeof d.id === 'string' && /^d-[a-z0-9]{4,16}$/.test(d.id)) : []; } catch (e) { return []; }
  }
  autoDisk() {
    if (this.demo || !this.diskId || this.state.cfg.autoSave !== true) return;
    const S = this.state, list = this.diskList(), i = list.findIndex(d => d.id === this.diskId);
    if (i < 0) return;
    const slides = S.slides.map(x => { const { qr, ...rest } = x; return rest; });
    list[i] = { ...list[i], base: S.tpl || list[i].base, savedAt: Date.now(), count: slides.filter(x => !x.hidden).length, data: { programText: S.programText || '', slides, cfg: S.cfg } };
    try { localStorage.setItem('loopstudio.disk.v1', JSON.stringify(list)); } catch (e) { return; }
    const t = new Date(); this.setState({ autoAt: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') });
  }
  saveToDisk(asNew) {
    const S = this.state, name = String(S.saveName || '').trim().slice(0, 60) || this.customName || 'Min loop';
    const list = this.diskList();
    const id = !asNew && this.diskId ? this.diskId : 'd-' + Math.random().toString(36).slice(2, 10);
    const slides = S.slides.map(x => { const { qr, ...rest } = x; return rest; });
    let i = list.findIndex(d => d.id === id);
    const entry = { id, name, base: S.tpl || 'blank', savedAt: Date.now(), fav: i >= 0 ? !!list[i].fav : false, count: slides.filter(x => !x.hidden).length, data: { programText: S.programText || '', slides, cfg: S.cfg } };
    if (i < 0 && list.length >= 10) {
      const old = list.filter(d => !d.fav && d.id !== this.diskId).sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0))[0];
      if (!old) { this.setState({ saveMsg: 'Disken er full, og alle 10 er favoritter. Fjern en stjerne eller slett en loop i Loop Studio.' }); return; }
      let when = ''; try { when = new Date(old.savedAt).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) {}
      if (!confirm('Disken er full (maks 10).\n\nVil du slette den eldste, «' + (old.name || 'Uten navn') + '»' + (when ? ' fra ' + when : '') + ', for å få plass?\n\nFavoritter blir aldri slettet.')) { this.setState({ saveMsg: 'Ikke lagret. Disken er full.' }); return; }
      list.splice(list.indexOf(old), 1);
      try { localStorage.removeItem('ukeloop.custom.' + old.id); } catch (e) {}
      i = -1;
    }
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    try { localStorage.setItem('loopstudio.disk.v1', JSON.stringify(list)); }
    catch (e) { this.setState({ saveMsg: 'Fikk ikke plass på Disk. Slett noen gamle looper og prøv igjen.' }); return; }
    const was = this.customId;
    this.diskId = id; this.customId = id; this.customName = name;
    if (was !== id) this.saveNow();
    try { const u = new URL(location.href); u.searchParams.delete('id'); u.searchParams.set('mal', entry.base); u.searchParams.set('disk', id); history.replaceState(null, '', u.toString()); } catch (e) {}
    clearTimeout(this._smT); this._smT = setTimeout(() => this.alive && this.setState({ saveMsg: '' }), 3500);
    this.setState({ saveOpen: false, saveMsg: 'Lagret som «' + name + '»' });
  }
  gcImg(id) {
    if (!id || !id.startsWith('img-')) return;
    setTimeout(() => {
      const pipUse = list => (list || []).some(s => s && (s.pips || []).some(p => p && p.src === id));
      const S = this.state, used = S.slides.some(s => (s.bg === id || s.bgPort === id)) || pipUse(S.slides) || this.past.some(p => pipUse(p.slides)) || this.diskList().some(d => d.data && pipUse(d.data.slides)) || (S.cfg.imgRules || []).some(r => (r.bg === id || r.bgPort === id)) || S.cfg.logoSrc === id
        || this.past.some(p => p.slides.some(s => (s.bg === id || s.bgPort === id)) || (p.cfg.imgRules || []).some(r => (r.bg === id || r.bgPort === id)))
        || this.diskList().some(d => d.data && ((d.data.slides || []).some(s => s && (s.bg === id || s.bgPort === id)) || ((d.data.cfg || {}).imgRules || []).some(r => r && (r.bg === id || r.bgPort === id)) || (d.data.cfg || {}).logoSrc === id));
      if (!used) window.UkeLoop.store.del(id).catch(() => {});
    }, 800);
  }
  applyProgram = () => {
    const U = window.UkeLoop; if (!U) return;
    if (!String(this.state.programText || '').trim()) {
      this.setState({ parseMsg: 'Skriv ukens program først (én linje per møte), eller trykk «Standard uke» for å hente menighetens standarduke.', parseOk: false });
      return;
    }
    const p = U.parse(this.state.programText), n = p.days.reduce((a, d) => a + d.events.length, 0);
    if (!n) { this.setState({ parseMsg: 'Fant ingen møter. Skriv ukedag, tid og navn, for eksempel «Tirsdag kl 19:00 Kveldsmat i kafeen».', parseOk: false }); return; }
    this.setState(s => {
      const days = this.daySlides(p, s.slides), first = s.slides.findIndex(x => x.type === 'day');
      const rest = s.slides.filter(x => x.type !== 'day');
      const at = first < 0 ? 0 : s.slides.slice(0, first).filter(x => x.type !== 'day').length;
      return { slides: [...rest.slice(0, at), ...days, ...rest.slice(at)], playing: true, playIdx: 0, selected: (days[0] || {}).id || s.selected,
        parseMsg: (() => { const wd = p.days.filter(d => !d.extra), ex = p.days.filter(d => d.extra).reduce((a, d) => a + d.events.length, 0), m = n - ex;
          return 'Fant ' + m + (m === 1 ? ' møte' : ' møter') + ' på ' + wd.length + (wd.length === 1 ? ' dag' : ' dager') + (ex ? ' og ' + ex + ' ekstra utenom uka' : '') + '. Videoen er oppdatert.'; })(), parseOk: true };
    });
    this.t0 = performance.now();
  };
  addMeeting = () => {
    const a = this.state.addForm || {}, title = String(a.title || '').trim();
    if (!title) { this.setState({ parseMsg: 'Skriv inn navnet på møtet.', parseOk: false }); return; }
    const time = a.time ? 'kl ' + a.time : '', date = String(a.date || '').trim(), place = String(a.place || '').trim();
    const line = (a.day ? a.day + ' ' : 'Ekstra: ') + [date, time, title].filter(Boolean).join(' ') + (place ? ' – ' + place : '');
    const txt = String(this.state.programText || '').replace(/\s+$/, '');
    this.setState({ programText: (txt ? txt + '\n' : '') + line, addForm: { day: a.day || '' } }, () => this.applyProgram());
  };
  /* Standarduken er menighetens eget, lagrede program (cfg.standard i det felles grunnoppsettet). Det finnes ingen
     innebygd eksempeltekst, og den hentes bare når brukeren trykker «Standard uke». */
  standardText() { return String(this.state.cfg.standard || ''); }
  loadStandard = () => {
    const t = this.standardText().trim();
    if (!t) { this.setState({ parseMsg: 'Ingen standarduke er lagret ennå. Skriv ukens program og trykk «Lagre som standard uke».', parseOk: false }); return; }
    this.setState({ programText: t, parseMsg: 'Standarduken er lagt inn. Endre eller legg til linjer, og trykk «Oppdater videoen».', parseOk: true });
  };
  saveStandard = () => {
    const t = String(this.state.programText || '').trim();
    if (!t) return;
    this.setCfg('standard', t);
    this.setState({ parseMsg: 'Teksten er lagret som ny standarduke.', parseOk: true });
  };
  move(id, dir) {
    this.setState(s => {
      const a = [...s.slides], i = a.findIndex(x => x.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return null;
      [a[i], a[j]] = [a[j], a[i]];
      return { slides: a };
    });
  }
  add(type) {
    const id = type + '-' + Date.now().toString(36);
    const T = {
      text: { kicker: 'Info', pill: '', body: 'Skriv teksten her.', sub: '', bg: null, bgOpacity: 1 },
      contact: { kicker: 'Kontakt', pill: '', headline: 'Ta kontakt med oss', text: 'Skann koden eller send e-post til', email: 'post@kirken.no', phone: '', qrUrl: 'mailto:post@kirken.no', bg: null, bgOpacity: 0.5 },
      outro: { title: this.state.cfg.header || 'Ukentlige møter', sub: 'Alle er velkommen', bg: null, bgOpacity: 1 }
    };
    const ns = { id, type, ...T[type], dur: null, hidden: false };
    if (ns.qrUrl) ns.qr = (this.makeQR(ns.qrUrl) || {}).rows || null;
    this.setState(s => {
      const a = [...s.slides], i = a.findIndex(x => x.id === s.selected);
      a.splice(i < 0 ? a.length : i + 1, 0, ns);
      return { slides: a, selected: id, tab: 'slides', playing: false };
    });
  }
  duplicate(id) {
    this.setState(s => {
      const a = [...s.slides], i = a.findIndex(x => x.id === id); if (i < 0) return null;
      const c = { ...a[i], id: a[i].id + '-k' + Date.now().toString(36) };
      a.splice(i + 1, 0, c);
      return { slides: a, selected: c.id };
    });
  }
  del(id) {
    const s = this.state, i = s.slides.findIndex(x => x.id === id); if (i < 0) return;
    const old = s.slides[i].bg, a = s.slides.filter(x => x.id !== id), nb = a[Math.min(i, a.length - 1)];
    const upd = { slides: a, selected: nb ? nb.id : null };
    if (s.slides[i].type === 'day') upd.programText = window.UkeLoop.serialize(a.filter(x => x.type === 'day'));
    const oldVid = s.slides[i].vid;
    this.setState(upd); this.gcImg(old); if (oldVid) this.gcVid(oldVid);
  }
  step(dir) {
    const all = this.state.slides; if (!all.length) return;
    const i = all.findIndex(x => x.id === this.state.selected);
    this.select(all[(i + dir + all.length) % all.length].id);
  }

  pickSlideVid = () => { const f = this.fileSlideVid.current; if (f) f.click(); };
  vidLength(file) {
    return new Promise(res => {
      const v = document.createElement('video'), u = URL.createObjectURL(file); let done = false;
      const end = d => { if (done) return; done = true; URL.revokeObjectURL(u); res(d); };
      v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => end(isFinite(v.duration) ? v.duration : null); v.onerror = () => end(-1);
      setTimeout(() => end(null), 10000); v.src = u;
    });
  }
  onSlideVidFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || !this.okFile(f, 'video')) return;
    const sid = this.state.selected; if (!sid) return;
    const len = await this.vidLength(f);
    if (len === -1) { alert('Nettleseren kan ikke spille av denne videoen. Bruk MP4 (H.264) eller WebM.'); return; }
    if (len == null) { alert('Fant ikke lengden på videoen. Prøv en annen fil.'); return; }
    if (len > 300.5) { alert('Videoen er ' + this.fmtLen(len) + ' lang. Maks lengde er 5 minutter.'); return; }
    const key = 'vid-' + Date.now().toString(36);
    try { await window.UkeLoop.store.put(key, f); } catch (err) { alert('Kunne ikke lagre videoen i nettleseren. Det kan være for lite lagringsplass.'); return; }
    this.ensureGraph(); this.attachVid(key, f);
    const old = (this.state.slides.find(x => x.id === sid) || {}).vid;
    this.setState(st => ({ slides: st.slides.map(x => x.id === sid ? { ...x, vid: key, vidName: String(f.name || 'video').slice(0, 80), vidLen: Math.round(len * 100) / 100, vidSound: x.vid ? x.vidSound : true, vidMusic: x.vid ? x.vidMusic : false, vidVol: x.vid ? x.vidVol : 1 } : x) }));
    if (old && old !== key) this.gcVid(old);
  };
  removeSlideVid = () => {
    const sid = this.state.selected, sl = this.state.slides.find(x => x.id === sid); if (!sl || !sl.vid) return;
    const old = sl.vid;
    this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== sid) return x; const { vid, vidName, vidLen, ...rest } = x; return rest; }) }));
    this.gcVid(old);
  };
  onImgFile = async e => {
    let f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'image')) return;
    if (f) { f = await this.cropImage(f, { aspect: this.portrait() ? '9:16' : '16:9', title: 'Beskjær bakgrunnsbildet' }); if (!f) return; }
    if (f) { f = await this.shrinkImg(f, 5120); if (!f) return; } if (!f) return;
    const id = 'img-' + Date.now().toString(36), sid = this.state.selected;
    try { await window.UkeLoop.store.put(id, f); } catch (err) {}
    const url = URL.createObjectURL(f), im = new Image(); im.src = url; this.media.images[id] = im;
    const F = this.bgField(), old = (this.state.slides.find(x => x.id === sid) || {})[F];
    this.setState(s => ({ urls: { ...s.urls, [id]: url } }));
    this.setF(sid, F, id);
    const me = this.state.slides.find(x => x.id === sid);
    if (me && me.ruleId && (this.state.cfg.imgRules || []).some(r => r.id === me.ruleId)) this.setRules(rs => rs.map(r => r.id === me.ruleId ? { ...r, [F]: id } : r), true);
    else if (me && me.type === 'day' && me.title) this.rememberTitle(me.title, id, F);
    this.gcImg(old);
  };
  rememberTitle(title, bg, field) {
    const kw = String(title || '').trim(); if (!kw) return; const F = field || 'bg';
    this.setRules(rs => {
      const i = rs.findIndex(x => x.kw.trim().toLowerCase() === kw.toLowerCase());
      if (!bg) { if (i < 0) return rs; const o = { ...rs[i], [F]: null }; return o.bg || o.bgPort ? rs.map((x, j) => j === i ? o : x) : rs.filter((x, j) => j !== i); }
      return i >= 0 ? rs.map((x, j) => j === i ? { ...x, [F]: bg } : x) : [...rs, { id: 'r-' + Date.now().toString(36), kw, [F]: bg }];
    }, !!bg);
  }
  canvasPoint(e) {
    const c = this.canvasRef.current, r = c.getBoundingClientRect(), { W, H } = this.dims();
    const scale = Math.min(r.width / W, r.height / H), ox = (r.width - W * scale) / 2, oy = (r.height - H * scale) / 2;
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale, W, H };
  }
  hitAny(p) {
    const R = this.media.lastRects || {}, pad = 16 * (Math.min(p.W, p.H) / 1080);
    for (const k of ['qr', 'logo', 'topLabel', 'header']) {
      const r = R[k];
      if (r && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) return k;
    }
    return null;
  }
  hitLogo(p) { return this.hitAny(p) === 'logo'; }
  snapTargets(self) {
    const R = this.media.lastRects || {}, out = [];
    const same = (r, k) => self && ((self.kind === k && (k === 'logo' || k === 'header' || k === 'topLabel' || k === 'qr')) || (self.kind === 'text' && k === 'text' && r.id === self.id && r.field === self.field) || ((k === 'pip' || k === 'ftext' || k === 'fqr') && r.kind === self.kind && r.id === self.id && r.i === self.i));
    ['qr', 'logo', 'topLabel', 'header'].forEach(k => { const r = R[k]; if (r && !same(r, k)) out.push(r); });
    (R.texts || []).forEach(r => { if (!same(r, 'text')) out.push(r); });
    [...(R.pips || []), ...(R.fitems || [])].forEach(r => { if (!same(r, r.kind)) out.push(r); });
    return out;
  }
  snapBox(x, y, w, h, q, self, off) {
    if (off) { this.media.guides = null; return { x, y }; }
    const u = Math.min(q.W, q.H) / 1080, W = q.W, H = q.H, M = 95 * u;
    const c = this.canvasRef.current, scale = c ? c.getBoundingClientRect().width / W : 1, thr = 8 / (scale || 1);
    const vx = [M, W / 2, W - M], hy = [M, H / 2, H - M, 150 * u, H - 150 * u];
    this.snapTargets(self).forEach(o => { vx.push(o.x, o.x + o.w / 2, o.x + o.w); hy.push(o.y, o.y + o.h / 2, o.y + o.h); });
    const best = (edges, T) => { let b = null; edges.forEach(e => T.forEach(t => { const dd = t - e; if (Math.abs(dd) <= thr && (b == null || Math.abs(dd) < Math.abs(b))) b = dd; })); return b; };
    const bx = best([x, x + w / 2, x + w], vx), by = best([y, y + h / 2, y + h], hy);
    if (bx != null) x += bx; if (by != null) y += by;
    const guides = [], seen = new Set(), mark = (t, E, T) => E.forEach(e => T.forEach(v => { if (Math.abs(v - e) <= 0.75 && !seen.has(t + Math.round(v))) { seen.add(t + Math.round(v)); guides.push({ t, v }); } }));
    mark('v', [x, x + w / 2, x + w], vx); mark('h', [y, y + h / 2, y + h], hy);
    this.media.guides = guides;
    return { x, y };
  }
  snapDrag(d, ax, ay, q, off) {
    if (off) { this.media.guides = null; return { ax, ay }; }
    const u = Math.min(q.W, q.H) / 1080, W = q.W, H = q.H, M = 95 * u;
    const c = this.canvasRef.current, scale = c ? c.getBoundingClientRect().width / W : 1, thr = 7 / (scale || 1);
    const centred = d.key === 'logo' || d.key === 'qr' || d.key === 'pip';
    const toRect = (x, y) => centred ? { x: x - d.w / 2, y: y - d.h / 2 } : d.key === 'header' ? { x, y: y - 4 * u } : { x: x - d.w, y: y - 4 * u };
    const R = this.media.lastRects || {};
    const vx = [M, W / 2, W - M], hy = [M, H / 2, H - M];
    this.snapTargets(d.self || { kind: d.key }).forEach(o => { vx.push(o.x, o.x + o.w / 2, o.x + o.w); hy.push(o.y, o.y + o.h / 2, o.y + o.h); });
    /* light snap: only pulls when very close, guides show a bit wider */
    const snapThr = thr * 1.4;
    const best = (edges, targets) => { let b = null; edges.forEach(e => targets.forEach(t => { const dd = t - e; if (Math.abs(dd) <= snapThr && (b == null || Math.abs(dd) < Math.abs(b))) b = dd; })); return b; };
    const r0 = toRect(ax, ay);
    const bx = best([r0.x, r0.x + d.w / 2, r0.x + d.w], vx), by = best([r0.y, r0.y + d.h / 2, r0.y + d.h], hy);
    if (bx != null) ax += bx; if (by != null) ay += by;
    const r = toRect(ax, ay), guides = [], seen = new Set(), tol = 0.75;
    const mark = (t, edges, targets) => edges.forEach(e => targets.forEach(v => { if (Math.abs(v - e) <= tol && !seen.has(t + Math.round(v))) { seen.add(t + Math.round(v)); guides.push({ t, v }); } }));
    mark('v', [r.x, r.x + d.w / 2, r.x + d.w], vx);
    mark('h', [r.y, r.y + d.h / 2, r.y + d.h], hy);
    this.media.guides = guides;
    return { ax, ay };
  }
  inlineRef = React.createRef(); fsRef = React.createRef(); guideRef = React.createRef();
  applyFs(on) {
    const w = this.fsRef.current; if (!w) return;
    const st = on ? { position: 'fixed', inset: '0', zIndex: '9000', borderRadius: '0', border: 'none', width: '100vw', height: '100vh' } : { position: 'relative', inset: '', zIndex: '', borderRadius: '10px', border: '1px solid #262626', width: '', height: '' };
    Object.assign(w.style, st);
    document.body.style.overflow = on ? 'hidden' : '';
  }
  enterFs = () => {
    if (this.state.fs) return;
    this.setState({ fs: true, selEl: null, zoom: null }, () => { this._cbox = null; this.applyFs(true); this.updSelBox && this.updSelBox(); });
    const w = this.fsRef.current;
    try { const p = w && (w.requestFullscreen || w.webkitRequestFullscreen); if (p) { const r = p.call(w); r && r.catch && r.catch(() => {}); } } catch (e) {}
  };
  exitFs = () => {
    if (!this.state.fs) return;
    try { const fe = document.fullscreenElement || document.webkitFullscreenElement; if (fe) (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch?.(() => {}); } catch (e) {}
    this.setState({ fs: false }, () => { this.applyFs(false); this.updSelBox && this.updSelBox(); });
  }; selBoxRef = React.createRef(); filePip = React.createRef();
  selLabel(el) {
    if (!el) return '';
    const T = { title: 'Tittel', body: 'Tekst', sub: 'Undertekst', kicker: 'Merkelapp', pill: 'Tid-merke', day: 'Dag og dato', time: 'Tid', place: 'Sted', headline: 'Overskrift', text: 'Tekst', email: 'E-post', phone: 'Telefon' };
    return el.kind === 'text' ? (T[el.field] || 'Tekst') : ({ pip: 'Bilde', ftext: 'Fri tekst', fqr: 'QR-kode', logo: 'Logo', qr: 'QR-kode', header: 'Overskrift øverst', topLabel: 'Etikett øverst' })[el.kind] || '';
  }
  selRect(el) {
    const R = this.media.lastRects || {}; if (!el) return null;
    if (el.kind === 'text') return (R.texts || []).find(r => r.id === el.id && r.field === el.field) || null;
    if (el.kind === 'pip') return (R.pips || []).find(r => r.id === el.id && r.i === el.i) || null;
    if (el.kind === 'ftext' || el.kind === 'fqr') return (R.fitems || []).find(r => r.kind === el.kind && r.id === el.id && (el.kind === 'fqr' || r.i === el.i)) || null;
    return R[el.kind] || null;
  }
  selGet(el) {
    const S = this.state, sl = el && el.id ? S.slides.find(x => x.id === el.id) : null;
    if (!el) return 1;
    if (el.kind === 'text') return ((sl && sl.tsc) || {})[el.field] || 1;
    if (el.kind === 'pip') return ((sl && sl.pips) || [])[el.i] ? sl.pips[el.i].w || 0.3 : 0.3;
    if (el.kind === 'ftext') return ((sl && sl.ftexts) || [])[el.i] ? sl.ftexts[el.i].size || 1 : 1;
    if (el.kind === 'fqr') return (sl && sl.fqr && sl.fqr.size) || 260;
    if (el.kind === 'logo') return S.cfg.logoSize || 90;
    if (el.kind === 'qr') return (sl && sl.qrSize) || 330;
    if (el.kind === 'header') return S.cfg.headerScale || 1;
    if (el.kind === 'topLabel') return S.cfg.topLabelScale || 1;
    return 1;
  }
  selSet(el, v) {
    const c = (lo, hi) => Math.max(lo, Math.min(hi, v));
    const onSlide = fn => this.setState(st => ({ slides: st.slides.map(x => x.id === el.id ? fn(x) : x) }));
    if (el.kind === 'text') { const k = Math.round(c(0.3, 4) * 100) / 100; onSlide(x => { const t = { ...(x.tsc || {}) }; if (Math.abs(k - 1) < 0.01) delete t[el.field]; else t[el.field] = k; return { ...x, tsc: Object.keys(t).length ? t : null }; }); }
    else if (el.kind === 'pip') { const k = Math.round(c(0.03, 1.5) * 1000) / 1000; onSlide(x => ({ ...x, pips: (x.pips || []).map((p, j) => j === el.i ? { ...p, w: k } : p) })); }
    else if (el.kind === 'ftext') { const k = Math.round(c(0.2, 8) * 100) / 100; onSlide(x => ({ ...x, ftexts: (x.ftexts || []).map((t, j) => j === el.i ? { ...t, size: k } : t) })); }
    else if (el.kind === 'fqr') { const k = Math.round(c(60, 1000)); onSlide(x => ({ ...x, fqr: { ...(x.fqr || {}), size: k } })); }
    else if (el.kind === 'logo') this.setCfg('logoSize', Math.round(c(20, 500)));
    else if (el.kind === 'qr') onSlide(x => ({ ...x, qrSize: Math.round(c(120, 800)) }));
    else if (el.kind === 'header') this.setCfg('headerScale', Math.round(c(0.3, 4) * 100) / 100);
    else if (el.kind === 'topLabel') this.setCfg('topLabelScale', Math.round(c(0.3, 4) * 100) / 100);
  }
  selDefault(el) { return el.kind === 'pip' ? 0.3 : el.kind === 'logo' ? 90 : el.kind === 'qr' ? 330 : el.kind === 'fqr' ? 260 : 1; }
  guideGeo(port) {
    const W0 = 1618, H0 = 1000; let x = 0, y = 0, w = W0, h = H0; const arcs = [], sq = [], labels = [];
    const fib = [89, 55, 34, 21, 13, 8, 5, 3, 2, 1, 1];
    let d = 'M0 ' + H0;
    for (let k = 0; k < 11; k++) {
      const st = k % 4; let s0;
      if (st === 0) { s0 = h; sq.push([x, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + s0) + ' ' + y; x += s0; w -= s0; }
      else if (st === 1) { s0 = w; sq.push([x, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + s0) + ' ' + (y + s0); y += s0; h -= s0; }
      else if (st === 2) { s0 = h; sq.push([x + w - s0, y, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + (x + w - s0) + ' ' + (y + s0); w -= s0; }
      else { s0 = w; sq.push([x, y + h - s0, s0]); d += ' A' + s0 + ' ' + s0 + ' 0 0 1 ' + x + ' ' + (y + h - s0); h -= s0; }
      if (s0 < 2) break;
    }
    const sqPath = sq.map(([a, b, c]) => 'M' + a + ' ' + b + 'h' + c + 'v' + c + 'h' + (-c) + 'Z').join(' ');
    sq.slice(0, 7).forEach(([a, b, c], i) => labels.push({ cx: a + c / 2, cy: b + c / 2, n: fib[i], size: c }));
    return { spiral: d, squares: sqPath, labels, vb: port ? '0 0 1000 1618' : '0 0 1618 1000' };
  }
  guideTransform(port, flip) {
    const fx = flip & 1, fy = flip & 2;
    let t = port ? 'matrix(0 1 1 0 0 0) ' : '';
    const Wv = 1618, Hv = 1000;
    if (fx) t += 'translate(' + Wv + ' 0) scale(-1 1) ';
    if (fy) t += 'translate(0 ' + Hv + ') scale(1 -1) ';
    return t.trim() || 'translate(0 0)';
  }
  updGuideBox() {
    const g = this.guideRef && this.guideRef.current; if (!g) return;
    const mode = this.state.guideMode || 'none', c = this.canvasRef.current;
    if (mode === 'none' || !c) { if (g.style.display !== 'none') g.style.display = 'none'; return; }
    const { W, H } = this.dims(), B0 = this.cbox(c), cr = { width: B0.w, height: B0.h, left: B0.dx, top: B0.dy }, wr = { left: 0, top: 0, width: B0.pw, height: B0.ph };
    const sc = Math.min(cr.width / W, cr.height / H), ox = cr.left - wr.left + (cr.width - W * sc) / 2, oy = cr.top - wr.top + (cr.height - H * sc) / 2;
    const L = ox.toFixed(1) + 'px', T = oy.toFixed(1) + 'px', Wp = (W * sc).toFixed(1) + 'px', Hp = (H * sc).toFixed(1) + 'px';
    if (g.style.display !== 'block') g.style.display = 'block';
    if (g.style.left !== L) g.style.left = L; if (g.style.top !== T) g.style.top = T;
    if (g.style.width !== Wp) g.style.width = Wp; if (g.style.height !== Hp) g.style.height = Hp;
  }
  cbox(c) {
    if (this._cbox) return this._cbox;
    c = c || this.canvasRef.current; if (!c || !c.parentElement) return { w: 0, h: 0, dx: 0, dy: 0, pw: 0, ph: 0 };
    const cr = c.getBoundingClientRect(), wr = c.parentElement.getBoundingClientRect(), z = (this.state.zoom && this.state.zoom.z) || 1;
    return (this._cbox = { w: cr.width / z, h: cr.height / z, dx: (cr.left - wr.left) / z, dy: (cr.top - wr.top) / z, pw: wr.width / z, ph: wr.height / z });
  }
  zoomOuter = React.createRef();
  setZoom(z, px, py) {
    const o = this.zoomOuter.current, Z = this.state.zoom || { z: 1, x: 0, y: 0 }; if (!o) return;
    z = Math.max(1, Math.min(6, Math.round(z * 100) / 100));
    const W = o.clientWidth, H = o.clientHeight; if (px == null) { px = W / 2; py = H / 2; }
    let x = px - (px - Z.x) * (z / Z.z), y = py - (py - Z.y) * (z / Z.z);
    x = Math.min(0, Math.max(W - W * z, x)); y = Math.min(0, Math.max(H - H * z, y));
    this._cbox = null; this.setState({ zoom: z === 1 ? null : { z, x, y } });
  }
  panZoom(dx, dy) {
    const o = this.zoomOuter.current, Z = this.state.zoom; if (!o || !Z) return;
    const W = o.clientWidth, H = o.clientHeight;
    const x = Math.min(0, Math.max(W - W * Z.z, Z.x - dx)), y = Math.min(0, Math.max(H - H * Z.z, Z.y - dy));
    this._cbox = null; this.setState({ zoom: { ...Z, x, y } });
  }
  updSelBox() {
    this.updGuideBox();
    const box = this.selBoxRef.current; if (!box) return;
    const el = this.state.selEl, r = el && !this.state.inlineEd ? this.selRect(el) : null, c = this.canvasRef.current;
    if (!r || !c) { if (box.style.display !== 'none') box.style.display = 'none'; return; }
    const { W, H } = this.dims(), B0 = this.cbox(c), cr = { width: B0.w, height: B0.h, left: B0.dx, top: B0.dy }, wr = { left: 0, top: 0, width: B0.pw, height: B0.ph };
    const sc = Math.min(cr.width / W, cr.height / H), ox = cr.left - wr.left + (cr.width - W * sc) / 2, oy = cr.top - wr.top + (cr.height - H * sc) / 2, pad = 6;
    const L = ox + r.x * sc - pad, T = oy + r.y * sc - pad;
    box.style.display = 'block'; box.style.left = L.toFixed(1) + 'px'; box.style.top = T.toFixed(1) + 'px';
    box.style.width = (r.w * sc + pad * 2).toFixed(1) + 'px'; box.style.height = (r.h * sc + pad * 2).toFixed(1) + 'px';
    const chip = box.querySelector('[data-sel-chip]');
    if (chip) { const below = T < 40; chip.style.bottom = below ? 'auto' : '100%'; chip.style.top = below ? '100%' : 'auto'; chip.style.marginTop = below ? '10px' : '0'; chip.style.marginBottom = below ? '0' : '10px'; }
  }
  onHandleDown = e => {
    const el = this.state.selEl, r = this.selRect(el); if (!el || !r) return;
    e.preventDefault(); e.stopPropagation();
    const p0 = this.canvasPoint(e), cx = r.x + r.w / 2, cy = r.y + r.h / 2, d0 = Math.max(6, Math.hypot(p0.x - cx, p0.y - cy)), v0 = this.selGet(el);
    this.hardStopAudio(); if (this.state.playing) this.setState({ playing: false });
    const move = ev => { const q = this.canvasPoint(ev); this.selSet(el, v0 * (Math.hypot(q.x - cx, q.y - cy) / d0)); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  hitPip(p) {
    const P = [...((this.media.lastRects || {}).pips || []), ...((this.media.lastRects || {}).fitems || [])], pad = 6 * Math.min(p.W, p.H) / 1080;
    for (let k = P.length - 1; k >= 0; k--) { const r = P[k]; if (p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) return r; }
    return null;
  }
  addPipFor(id, i) { this._pipTarget = { id, i }; if (this.filePip.current) this.filePip.current.click(); }
  onPipFile = async e => {
    let f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || !this.okFile(f, 'image')) return;
    f = await this.cropImage(f, { aspect: 'free', title: 'Beskjær bildet' }); if (!f) return;
    f = await this.shrinkImg(f, 3000); if (!f) return;
    const tg = this._pipTarget || { id: this.state.selected, i: null }; if (!tg.id) return;
    const id = 'img-' + Date.now().toString(36);
    try { await window.UkeLoop.store.put(id, f); } catch (err) {}
    const url = URL.createObjectURL(f), im = new Image(); im.src = url; this.media.images[id] = im;
    let old = null, idx = tg.i;
    this.setState(st => ({ urls: { ...st.urls, [id]: url }, slides: st.slides.map(x => {
      if (x.id !== tg.id) return x;
      const list = [...(x.pips || [])];
      if (idx != null && list[idx]) { old = list[idx].src; list[idx] = { ...list[idx], src: id }; }
      else { if (list.length >= 8) return x; idx = list.length; list.push({ src: id, x: 0.7, y: 0.4, w: 0.3, r: 18, op: 1, shadow: true, border: false }); }
      return { ...x, pips: list };
    }), playing: false, selected: tg.id }), () => { this.setState({ selEl: { kind: 'pip', id: tg.id, i: idx } }); if (old) this.gcImg(old); });
    this.hardStopAudio();
  };
  addFtext() {
    const id = this.state.selected; if (!id) return;
    const sl = this.state.slides.find(x => x.id === id), i = ((sl && sl.ftexts) || []).length; if (i >= 12) return;
    this.hardStopAudio();
    this.setState(st => ({ playing: false, scrubT: null, slides: st.slides.map(x => x.id === id ? { ...x, ftexts: [...(x.ftexts || []), { text: 'Skriv tekst her', x: 0.5, y: 0.3 + (i % 4) * 0.08, size: 1, color: '#ffffff', bold: true }] } : x), selEl: { kind: 'ftext', id, i } }));
  }
  addFqr() {
    const id = this.state.selected; if (!id) return;
    const sl = this.state.slides.find(x => x.id === id);
    this.hardStopAudio();
    this.setState(st => ({ playing: false, scrubT: null, slides: sl && sl.fqr ? st.slides : st.slides.map(x => x.id === id ? { ...x, fqr: { url: '', x: 0.82, y: 0.42, size: 260, caption: 'Skann meg', contact: '' } } : x), selEl: { kind: 'fqr', id, i: 0 } }));
  }
  removeFtext(id, i) { this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, ftexts: (x.ftexts || []).filter((t, j) => j !== i) } : x), selEl: null })); }
  removeFqr(id) { this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, fqr: null } : x), selEl: null })); }
  removePip(id, i) {
    const sl = this.state.slides.find(x => x.id === id), src = sl && sl.pips && sl.pips[i] ? sl.pips[i].src : null;
    this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, pips: (x.pips || []).filter((p, j) => j !== i) } : x), selEl: st.selEl && st.selEl.kind === 'pip' && st.selEl.id === id ? null : st.selEl }));
    if (src) this.gcImg(src);
  }
  SCALE_U = [{ u: '%', k: 100 }, { u: '×', k: 1, d: 2, t: 'faktor' }];
  FTEXT_U = [{ u: '%', k: 100 }, { u: 'px', k: 56, t: 'ved 1080p' }, { u: '×', k: 1, d: 2, t: 'faktor' }];
  /* number field with clickable unit; units: [{u, k: display per base, d: decimals, t: title}] */
  numF(key, base, units, set, lim) {
    const T = s => window.MLI18N ? MLI18N.t(s) : s;
    const pref = this._up || (this._up = (() => { try { return JSON.parse(localStorage.getItem('medialab.units') || '{}') || {}; } catch (e) { return {}; } })());
    const ui = Math.max(0, units.findIndex(x => x.u === pref[key])), U = units[ui];
    const shown = String(+(Number(base) * U.k).toFixed(U.d == null ? 0 : U.d)).replace('.', window.MLI18N && MLI18N.lang === 'en' ? '.' : ',');
    const ed = this.state.numEd && this.state.numEd.k === key ? this.state.numEd.t : null;
    const apply = n => set(Math.max(lim[0], Math.min(lim[1], n / U.k)));
    const commit = t => { const n = parseFloat(String(t).replace(',', '.')); this.setState({ numEd: null }); if (isFinite(n)) apply(n); };
    return {
      numVal: ed != null ? ed : shown, unit: U.u,
      unitTitle: T('Trykk for å bytte enhet') + ': ' + units.map(x => x.u + (x.t ? ' (' + T(x.t) + ')' : '')).join(' / '),
      onNum: e => this.setState({ numEd: { k: key, t: e.target.value.slice(0, 12) } }),
      onNumFocus: e => { try { e.target.select(); } catch (err) {} },
      onNumBlur: e => { if (this.state.numEd && this.state.numEd.k === key) commit(e.target.value); },
      onNumKey: e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
        else if (e.key === 'Escape') this.setState({ numEd: null });
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const cur = parseFloat(String(e.target.value).replace(',', '.')); const stp = (e.shiftKey ? 10 : 1) * (U.d ? 0.05 : U.u === '%' ? 5 : 1); if (isFinite(cur)) { this.setState({ numEd: null }); apply(cur + (e.key === 'ArrowUp' ? stp : -stp)); } }
      },
      cycleUnit: () => { pref[key] = units[(ui + 1) % units.length].u; try { localStorage.setItem('medialab.units', JSON.stringify(pref)); } catch (e) {} this.setState({ numEd: null }); this.forceUpdate(); }
    };
  }
  setupNumEdit() {
    const NUM = /^\s*([-+]?\d+(?:[.,]\d+)?)\s*[a-zæøå%°]{0,4}\s*$/i;
    const findRange = el => { let n = el; for (let i = 0; i < 4 && n; i++, n = n.parentElement) { const rs = n.querySelectorAll ? n.querySelectorAll('input[type=range]') : []; if (rs.length === 1) return rs[0]; if (rs.length > 1) return null; } return null; };
    this._numDbl = e => {
      const t = e.target; if (!t || t.closest('input,textarea,select,button,canvas')) return;
      let span = t.nodeType === 1 ? t : t.parentElement, m = null;
      for (let i = 0; i < 3 && span && !m; i++) { m = (span.textContent || '').match(NUM); if (!m) span = span.parentElement; }
      if (!span || !m) return;
      const range = findRange(span); if (!range || range.disabled) return;
      e.preventDefault();
      const shown = parseFloat(m[1].replace(',', '.')), cur = parseFloat(range.value), min = parseFloat(range.min || 0), max = parseFloat(range.max || 100);
      const k = shown !== 0 && cur !== 0 ? cur / shown : (max <= 1 && /%/.test(span.textContent) ? 0.01 : 1);
      const r = span.getBoundingClientRect(), inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'decimal'; inp.value = m[1]; inp.setAttribute('aria-label', 'Skriv inn verdi');
      inp.style.cssText = 'position:fixed;z-index:9999;left:' + Math.max(4, r.right - 72) + 'px;top:' + (r.top + r.height / 2 - 15) + 'px;width:72px;height:30px;padding:0 8px;border:1.5px solid #e9e7e2;border-radius:8px;background:#000;color:#fff;font:600 13px Archivo,Helvetica,Arial,sans-serif;text-align:right;outline:none;box-shadow:0 6px 20px rgba(0,0,0,.6)';
      let done = false;
      const finish = ok => {
        if (done) return; done = true;
        const raw = parseFloat(String(inp.value).replace(',', '.').replace(/[^\d.+-]/g, ''));
        inp.remove();
        if (!ok || !isFinite(raw)) return;
        const v = Math.max(min, Math.min(max, raw * k));
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(range, String(v));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
      };
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); finish(true); } else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); } ev.stopPropagation(); });
      inp.addEventListener('blur', () => finish(true));
      document.body.appendChild(inp); inp.focus(); inp.select();
    };
    document.addEventListener('dblclick', this._numDbl);
  }
  placeInline(r) {
    const c = this.canvasRef.current; if (!c) return null;
    const { W, H } = this.dims(), B0 = this.cbox(c), cr = { width: B0.w, height: B0.h, left: B0.dx, top: B0.dy }, wr = { left: 0, top: 0, width: B0.pw, height: B0.ph };
    const sc = Math.min(cr.width / W, cr.height / H), ox = cr.left - wr.left + (cr.width - W * sc) / 2, oy = cr.top - wr.top + (cr.height - H * sc) / 2;
    const multi = ['body', 'headline', 'text', 'title'].includes(r.field);
    const fs = Math.max(15, Math.min(22, 44 * sc)), w = Math.min(wr.width - 8, Math.max(240, r.w * sc + 28));
    const h = Math.min(wr.height - 40, Math.max(fs * 1.25 + 16, multi ? r.h * sc + 16 : 0));
    return { left: Math.max(4, Math.min(wr.width - w - 4, ox + r.x * sc - 10)), top: Math.max(4, Math.min(wr.height - h - 34, oy + r.y * sc - 8)), width: w, height: h, fs };
  }
  findText(p, id, field) {
    const T = ((this.media.lastRects || {}).texts) || [];
    if (id) return T.find(r => r.id === id && r.field === field) || null;
    const pad = 22 * Math.min(p.W, p.H) / 1080, inside = r => r.field && p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
    const hits = T.filter(inside);
    if (!hits.length) return null;
    const dist = r => { const cx = Math.max(r.x, Math.min(p.x, r.x + r.w)), cy = Math.max(r.y, Math.min(p.y, r.y + r.h)); return Math.hypot(p.x - cx, p.y - cy); };
    return hits.sort((a, b) => dist(a) - dist(b))[0];
  }
  flashPlay(k) {
    clearTimeout(this._flashT); this.setState({ playFlash: k });
    this._flashT = setTimeout(() => this.alive !== false && this.setState({ playFlash: null }), 650);
  }
  onCanvasDbl = e => {
    clearTimeout(this._clickT);
    const p = this.canvasPoint(e);
    const fr = this.hitPip(p);
    if (fr && fr.kind === 'ftext') {
      const sl = this.state.slides.find(x => x.id === fr.id), t = sl && sl.ftexts && sl.ftexts[fr.i]; if (!t) return;
      if (e.preventDefault) e.preventDefault();
      const pos = this.placeInline({ ...fr, field: 'body' }); if (!pos) return;
      this._inlineCancel = false; this._inlineAt = performance.now(); this.hardStopAudio();
      this.setState({ playing: false, scrubT: null, selected: fr.id, inlineEd: { id: fr.id, field: '__ftext', i: fr.i, value: t.text || '', orig: t.text || '', multi: true, ...pos } }, () => { const el = this.inlineRef.current; if (el) { el.focus(); el.select(); } });
      return;
    }
    if (this.hitLogo(p) && this.fileLogo.current) { this.fileLogo.current.click(); return; }
    const hit = this.findText(p); if (!hit) return;
    const sl = this.state.slides.find(x => x.id === hit.id); if (!sl) return;
    if (e.preventDefault) e.preventDefault();
    const pos = this.placeInline(hit); if (!pos) return;
    const val = String(sl[hit.field] == null ? '' : sl[hit.field]);
    const multi = ['body', 'headline', 'text'].includes(hit.field) || (hit.field === 'title' && sl.type === 'outro');
    this._inlineCancel = false;
    this._inlineAt = performance.now();
    this.hardStopAudio(); this.setState({ playing: false, scrubT: null, selected: hit.id, inlineEd: { id: hit.id, field: hit.field, value: val, orig: val, multi, ...pos } }, () => {
      const t0 = this.inlineRef.current; if (t0) { t0.focus(); t0.select(); }
      /* once the paused frame has drawn, snap the box onto the text's resting position */
      let n = 0; const fix = () => {
        if (!this.state.inlineEd || this.state.inlineEd.id !== hit.id) return;
        if (++n < 3) { requestAnimationFrame(fix); return; }
        const r2 = this.findText(null, hit.id, hit.field), p2 = r2 && this.placeInline(r2);
        if (p2) this.setState(st => st.inlineEd ? { inlineEd: { ...st.inlineEd, ...p2, height: Math.max(p2.height, st.inlineEd.value.split('\n').length * p2.fs * 1.25 + 16) } } : null, () => { const el = this.inlineRef.current; if (el && document.activeElement !== el) el.focus({ preventScroll: true }); });
      };
      requestAnimationFrame(fix);
    });
  };
  commitInline() {
    const ed = this.state.inlineEd; if (!ed) return;
    if (this.state.tab !== 'slides') this.setState({ tab: 'slides' });
    this.setState({ inlineEd: null });
    const v = ed.multi ? ed.value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '') : ed.value.replace(/\s*\n\s*/g, ' ');
    if (ed.field === '__ftext') { if (v !== ed.orig) this.setState(st => ({ slides: st.slides.map(x => x.id === ed.id ? { ...x, ftexts: (x.ftexts || []).map((t, j) => j === ed.i ? { ...t, text: v } : t) } : x) })); return; }
    if (v !== ed.orig) this.setF(ed.id, ed.field, v);
  }
  onPanMove = e => {
    const d = this._pan; if (!d) return; e.preventDefault();
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    const cl = v => Math.max(0, Math.min(1, v));
    let nx, ny;
    if (d.modal) { nx = d.fw < 1 ? cl(d.p0x + dx / (d.rw * (1 - d.fw))) : null; ny = d.fh < 1 ? cl(d.p0y + dy / (d.rh * (1 - d.fh))) : null; }
    else { nx = d.ox ? cl(d.p0x - dx / (d.ox * d.fw)) : null; ny = d.oy ? cl(d.p0y - dy / (d.oy * d.fh)) : null; }
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      this.setState(st => ({ slides: st.slides.map(x => x.id === d.id ? { ...x, ...(nx != null ? { panX: Math.round(nx * 1000) / 1000 } : {}), ...(ny != null ? { panY: Math.round(ny * 1000) / 1000 } : {}) } : x) }));
      this._pk = null;
    });
  };
  onPanUp = () => { const d = this._pan; this._pan = null; if (d && d.moved) this._panClickEat = performance.now(); window.removeEventListener('pointermove', this.onPanMove); window.removeEventListener('pointerup', this.onPanUp); window.removeEventListener('pointercancel', this.onPanUp); };
  panWrapRef = React.createRef();
  openPan = () => {
    const S = this.state, sel = S.slides.find(x => x.id === S.selected); if (!sel) return;
    this._panOrig = { id: sel.id, panX: sel.panX, panY: sel.panY };
    this.setState({ panOpen: true, playing: false }); this.hardStopAudio();
  };
  closePan = mode => {
    const o = this._panOrig; this._panOrig = null; this.onPanUp();
    if (mode === 'cancel' && o) this.setState(st => ({ panOpen: false, slides: st.slides.map(x => x.id === o.id ? { ...x, panX: o.panX, panY: o.panY } : x) }));
    else this.setState({ panOpen: false });
    this._pk = null;
  };
  onPanFrameDown = e => {
    const w = this.panWrapRef.current; if (!w) return;
    const r = w.getBoundingClientRect(), S = this.state, sel = S.slides.find(x => x.id === S.selected); if (!sel) return;
    const b = this.bgOf(sel), im = b && this.media.images[b]; if (!im || !im.naturalWidth) return;
    const { W, H } = this.dims(), ia = im.naturalWidth / im.naturalHeight, fa = W / H;
    const fw = ia > fa ? fa / ia : 1, fh = ia < fa ? ia / fa : 1;
    e.preventDefault(); e.stopPropagation();
    const PT = this.portrait();
    this._pan = { id: sel.id, sx: e.clientX, sy: e.clientY, modal: true, rw: r.width, rh: r.height, fw, fh, moved: false,
      p0x: sel.panX != null ? sel.panX : PT ? (sel.fx != null ? sel.fx : 0.66) : 0.5, p0y: sel.panY != null ? sel.panY : 0.5 };
    window.addEventListener('pointermove', this.onPanMove); window.addEventListener('pointerup', this.onPanUp); window.addEventListener('pointercancel', this.onPanUp);
  };
  startFillDrag(e) {
    const S = this.state, sel = S.slides.find(x => x.id === S.selected); if (!sel || !sel.bgFill || !sel.bgFill.mode || sel.bgFill.mode === 'none' || this.bgOf(sel)) return false;
    e.preventDefault(); e.stopPropagation();
    const id = sel.id, f0 = sel.bgFill, p0 = this.canvasPoint(e), x0 = f0.x == null ? 0.5 : f0.x, y0 = f0.y == null ? 0.5 : f0.y;
    if (S.playing) this.setState({ playing: false });
    const mv = ev => { const p = this.canvasPoint(ev), nx = Math.max(-0.5, Math.min(1.5, x0 + (p.x - p0.x) / p.W)), ny = Math.max(-0.5, Math.min(1.5, y0 + (p.y - p0.y) / p.H));
      if (this._fdRaf) return; this._fdRaf = requestAnimationFrame(() => { this._fdRaf = null; this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, bgFill: { ...(x.bgFill || {}), x: Math.round(nx * 1000) / 1000, y: Math.round(ny * 1000) / 1000 } } : x) })); this._pk = null; }); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this._panClickEat = performance.now(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return true;
  }
  onCanvasDown = e => {
    if (e.shiftKey && !this.state.rec && this.startFillDrag(e)) return;
    if (this._eyedrop) { e.preventDefault(); e.stopPropagation(); this.finishEyedrop(e); return; }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      const now = performance.now(), lt = this._lastTap;
      this._lastTap = { t: now, x: e.clientX, y: e.clientY };
      if (lt && now - lt.t < 380 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) { this._lastTap = null; this.onCanvasDbl(e); return; }
    }
    const p = this.canvasPoint(e);
    if (!this.state.rec && !this.state.inlineEd && (e.button == null || e.button === 0)) {
      const pr = this.hitPip(p);
      if (pr) {
        e.preventDefault(); clearTimeout(this._clickT); this.hardStopAudio();
        const kind = pr.kind || 'pip';
        this.setState({ playing: false, scrubT: null, selected: pr.id, selEl: { kind, id: pr.id, i: pr.i } });
        const d = { key: 'pip', self: { kind, id: pr.id, i: pr.i }, dx: p.x - (pr.x + pr.w / 2), dy: p.y - (pr.y + pr.h / 2), w: pr.w, h: pr.h };
        const move = ev => {
          const q = this.canvasPoint(ev), sn = this.snapDrag(d, q.x - d.dx, q.y - d.dy, q, ev.altKey);
          const nx = Math.round(sn.ax / q.W * 1000) / 1000, ny = Math.round(sn.ay / q.H * 1000) / 1000;
          this.setState(st => ({ slides: st.slides.map(x => {
            if (x.id !== pr.id) return x;
            if (kind === 'ftext') return { ...x, ftexts: (x.ftexts || []).map((t, j) => j === pr.i ? { ...t, x: nx, y: ny } : t) };
            if (kind === 'fqr') return { ...x, fqr: { ...(x.fqr || {}), x: nx, y: ny } };
            return { ...x, pips: (x.pips || []).map((pp, j) => j === pr.i ? { ...pp, x: nx, y: ny } : pp) };
          }) }));
        };
        const up = () => { this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (this.canvasRef.current) this.canvasRef.current.style.cursor = ''; };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        this.canvasRef.current.style.cursor = 'grabbing';
        return;
      }
    }
    const key = this.hitAny(p);
    if (!key) {
      if (this.state.inlineEd || this.state.rec || (e.button != null && e.button > 0)) return;
      const tx = this.findText(p);
      if (tx) {
        clearTimeout(this._clickT); this.hardStopAudio(); e.preventDefault();
        this.setState({ playing: false, scrubT: null, selected: tx.id, selEl: { kind: 'text', id: tx.id, field: tx.field } });
        const KM = { time: 'day', place: 'day', pill: 'kicker', phone: 'email' }, key = KM[tx.field] || tx.field;
        const sl0 = this.state.slides.find(x => x.id === tx.id), o0 = (sl0 && sl0.toff && sl0.toff[key]) || { x: 0, y: 0 };
        let moved = false;
        const move = ev => {
          const q = this.canvasPoint(ev); let dx = q.x - p.x, dy = q.y - p.y;
          if (!moved && Math.hypot(dx, dy) < 6 * Math.min(q.W, q.H) / 1080) return;
          moved = true; if (this.canvasRef.current) this.canvasRef.current.style.cursor = 'grabbing';
          const sn = this.snapBox(tx.x + dx, tx.y + dy, tx.w, tx.h, q, { kind: 'text', id: tx.id, field: tx.field }, ev.altKey);
          dx = sn.x - tx.x; dy = sn.y - tx.y;
          const nx = Math.round((o0.x + dx / q.W) * 1000) / 1000, ny = Math.round((o0.y + dy / q.H) * 1000) / 1000;
          this.setState(st => ({ slides: st.slides.map(x => x.id === tx.id ? { ...x, toff: { ...(x.toff || {}), [key]: { x: nx, y: ny } } } : x) }));
        };
        const up = () => { this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (this.canvasRef.current) this.canvasRef.current.style.cursor = ''; };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        return;
      }
      const sx = e.clientX, sy = e.clientY, st = performance.now();
      const upT = ev => {
        window.removeEventListener('pointerup', upT);
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8 || performance.now() - st > 450) return;
        clearTimeout(this._clickT);
        this._clickT = setTimeout(() => { if (this.state.inlineEd) return; if (this.state.selEl) { this.setState({ selEl: null }); return; } const was = this.state.playing; this.togglePlay(); this.flashPlay(was ? 'pause' : 'play'); }, 260);
      };
      window.addEventListener('pointerup', upT);
      return;
    }
    e.preventDefault();
    const r0 = this.media.lastRects[key];
    if (this.state.playing) this.hardStopAudio();
    this.setState(st => ({ selEl: { kind: key, id: key === 'qr' ? r0.id : null }, ...(st.playing ? { playing: false, scrubT: null } : {}) }));
    /* anchor per item: logo = centre, header = top-left, topLabel = top-right */
    const centred = key === 'logo' || key === 'qr';
    const ax = centred ? r0.x + r0.w / 2 : key === 'header' ? r0.x : r0.x + r0.w;
    const ay = centred ? r0.y + r0.h / 2 : r0.y + 4 * (Math.min(p.W, p.H) / 1080);
    this._drag = { key, dx: p.x - ax, dy: p.y - ay, w: r0.w, h: r0.h, id: r0.id };
    if (key === 'qr' && this.state.playing) { this.hardStopAudio(); this.setState({ playing: false, selected: r0.id }); }
    const move = ev => {
      const q = this.canvasPoint(ev), d = this._drag; if (!d) return;
      const sn = this.snapDrag(d, q.x - d.dx, q.y - d.dy, q, ev.altKey);
      let x = sn.ax, y = sn.ay;
      if (d.key === 'qr') {
        x = Math.max(d.w / 2, Math.min(q.W - d.w / 2, x)); y = Math.max(d.h / 2, Math.min(q.H - d.h / 2, y));
        const nx = Math.round(x / q.W * 1000) / 1000, ny = Math.round(y / q.H * 1000) / 1000;
        this.setState(s => ({ slides: s.slides.map(sl => sl.id === d.id ? { ...sl, qrX: nx, qrY: ny } : sl) }));
        return;
      }
      if (d.key === 'logo') { x = Math.max(d.w / 2, Math.min(q.W - d.w / 2, x)); y = Math.max(d.h / 2, Math.min(q.H - d.h / 2, y)); }
      else if (d.key === 'header') { x = Math.max(0, Math.min(q.W - d.w, x)); y = Math.max(0, Math.min(q.H - d.h, y)); }
      else { x = Math.max(d.w, Math.min(q.W, x)); y = Math.max(0, Math.min(q.H - d.h, y)); }
      const nx = Math.round(x / q.W * 1000) / 1000, ny = Math.round(y / q.H * 1000) / 1000;
      const kx = d.key === 'logo' ? 'logoX' : d.key === 'header' ? 'headerX' : 'topLabelX', ky = kx.replace('X', 'Y');
      this.setState(s => ({ cfg: { ...s.cfg, [kx]: nx, [ky]: ny } }));
    };
    const up = () => { this._drag = null; this.media.guides = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (this.canvasRef.current) this.canvasRef.current.style.cursor = ''; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    this.canvasRef.current.style.cursor = 'grabbing';
  };
  onCanvasMove = e => {
    if (this._drag) return;
    const c = this.canvasRef.current; if (!c) return;
    { const p0 = this.canvasPoint(e); if (this.hitPip(p0)) { c.style.cursor = 'move'; return; } if (!this.hitAny(p0) && this.findText(p0)) { c.style.cursor = 'move'; return; } }
    c.style.cursor = this.hitAny(this.canvasPoint(e)) ? 'grab' : '';
  };
  onLogoFile = async e => {
    let f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'image')) return;
    if (f) { f = await this.cropImage(f, { aspect: 'free', title: 'Beskjær logoen' }); if (!f) return; }
    if (f) { f = await this.shrinkImg(f, 2048, true); if (!f) return; } if (!f) return;
    const id = 'img-logo-' + Date.now().toString(36), old = this.state.cfg.logoSrc;
    try { await window.UkeLoop.store.put(id, f); } catch (err) {}
    const url = URL.createObjectURL(f), im = new Image(); im.src = url; this.media.images[id] = im;
    this.setState(s => ({ urls: { ...s.urls, [id]: url }, cfg: { ...s.cfg, logoSrc: id, logoOn: true } }));
    if (old && old.startsWith('img-')) setTimeout(() => { if (this.state.cfg.logoSrc !== old) window.UkeLoop.store.del(old).catch(() => {}); }, 800);
  };
  onVideoFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'video')) return; if (!f) return;
    try { await window.UkeLoop.store.put(this.vKey(), f); } catch (err) {}
    const v = this.media.video; if (v.src) URL.revokeObjectURL(v.src);
    v.src = URL.createObjectURL(f); v.play().catch(() => {});
    this.setState({ videoName: f.name });
  };
  removeVideo = () => {
    window.UkeLoop.store.del(this.vKey()).catch(() => {});
    const v = this.media.video; v.removeAttribute('src'); v.load();
    this.setState(s => ({ videoName: '', cfg: s.tpl === 'youth' ? { ...s.cfg, noDefVideo: true } : s.cfg }));
  };
  loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return this._tp || (this._tp = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/vendor/tesseract-5.1.1/tesseract.min.js'; s.integrity = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F'; 
      s.onload = res; s.onerror = () => { this._tp = null; rej(new Error('load')); };
      document.head.appendChild(s);
    }));
  }
  async prepImage(file) {
    const url = URL.createObjectURL(file);
    const im = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const sc = Math.min(2, Math.max(1, 2000 / im.naturalWidth));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
    const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
    let sum = 0; for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const dark = sum / (px.length / 4) < 128;
    for (let i = 0; i < px.length; i += 4) {
      let v = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (dark) v = 255 - v;
      v = Math.max(0, Math.min(255, (v - 128) * 1.8 + 128));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }
  async imageB64(file) {
    const url = URL.createObjectURL(file);
    const im = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    URL.revokeObjectURL(url);
    const tries = [[1400, 0.6], [1250, 0.6], [1100, 0.6], [950, 0.58], [800, 0.55]];
    let data = '', dark = null;
    for (const [max, q] of tries) {
      const sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
      const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
      if (dark === null) { let s = 0; for (let i = 0; i < px.length; i += 16) s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; dark = s / (px.length / 16) < 128; }
      /* black text on white: sharper letters and far smaller files */
      for (let i = 0; i < px.length; i += 4) {
        let v = dark ? 255 - Math.max(px[i], px[i + 1], px[i + 2]) : Math.min(px[i], px[i + 1], px[i + 2]);
        v = v < 90 ? 0 : v > 200 ? 255 : (v - 90) * 255 / 110;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      ctx.putImageData(d, 0, 0);
      data = c.toDataURL('image/jpeg', q).split(',')[1];
      if (data.length < 200000) break;
    }
    return data;
  }
  async readWithClaude(file) {
    const data = await this.imageB64(file);
    const prompt = 'Dette er et bilde av et ukeprogram for en menighet. Skriv av alle programpunktene nøyaktig slik de står, bokstav for bokstav, én linje per punkt, i dette formatet:\n' +
      'Ukedag dato kl HH:MM Navn på møtet\n' +
      'Eksempel: «Tirsdag 25. aug kl 19:00 Bønnedager (ikke Kveldsmat)».\n' +
      'Punkter uten ukedag (f.eks. «28.–30. august: Menighetsleir …» eller «3. september kl 18:30: …») skrives med datoen først. ' +
      'Ta ikke med overskrifter, logoer eller annen tekst. Svar kun med linjene, ingen forklaring.';
    const body = m => ({ model: m, max_tokens: 1500, messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
      { type: 'text', text: prompt }] }] });
    let out;
    try { out = await window.claude.complete(body('claude-sonnet-4-5')); }
    catch (e) { const b = body(); delete b.model; out = await window.claude.complete(b); }
    return String(out || '').replace(/^```[a-z]*\n?|```$/g, '').split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).join('\n');
  }
  onOcrFile = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f && !this.okFile(f, 'image')) return; if (!f) return;
    this.setState({ busy: 'ocr', parseMsg: 'Leser bildet …', parseOk: true });
    try {
      let text = '';
      if (window.claude && window.claude.complete) {
        try { text = await this.readWithClaude(f); } catch (err) { console.warn('Bildelesing feilet:', err); text = ''; }
      }
      if (!text) {
        await this.loadTesseract();
        const c = await this.prepImage(f);
        const r = await window.Tesseract.recognize(c, 'nor', { workerPath: location.origin + '/vendor/tesseract-5.1.1/worker.min.js', corePath: location.origin + '/vendor/tesseract-core-5.1.1/', langPath: location.origin + '/vendor/tessdata', logger: m => { if (m.status === 'recognizing text' && this.alive) this.setState({ parseMsg: 'Leser bildet … ' + Math.round(m.progress * 100) + ' %' }); } });
        text = String(r.data.text || '').split('\n').map(l => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean).join('\n');
      }
      this.setState({ programText: text, busy: '' }, () => {
        this.applyProgram();
        this.setState(s => ({ parseMsg: s.parseOk ? s.parseMsg + ' Se over teksten – bildegjenkjenning kan gjøre små feil.' : s.parseMsg }));
      });
    } catch (err) {
      this.setState({ busy: '', parseMsg: 'Klarte ikke å lese bildet. Sjekk internettforbindelsen, eller skriv inn programmet.', parseOk: false });
    }
  };
  onTextFile = e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    f.text().then(t => this.setState({ programText: t }, () => this.applyProgram()));
  };

  download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 120000);
  }
  testPlayable(blob) {
    return new Promise(res => {
      const v = document.createElement('video'), u = URL.createObjectURL(blob); let done = false;
      const end = ok => { if (done) return; done = true; try { v.removeAttribute('src'); v.load(); } catch (e) {} URL.revokeObjectURL(u); res(ok); };
      v.muted = true; v.preload = 'metadata';
      v.onloadedmetadata = () => end(v.videoWidth > 0); v.onerror = () => end(false);
      setTimeout(() => end(null), 8000); v.src = u;
    });
  }
  fileBase() { return ({ sunday: 'sondagsmote-', youth: 'ungdomsmote-', blank: 'loop-' }[this.state.tpl] || 'ukentlig-program-') + new Date().toISOString().slice(0, 10) + (this.portrait() ? '-staende' : ''); }
  fmtLen(sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + String(s).padStart(2, '0'); }
  exportHTML = async () => {
    if (this.state.busy) return;
    this.setState({ busy: 'html' });
    try {
      const U = window.UkeLoop, data = this.payload(), images = {};
      for (const s of data.slides) {
        if (!s.bg || images[s.bg]) continue;
        try { const b = await this.blobOf(s.bg); if (b) images[s.bg] = await U.toDataURL(b); } catch (e) {}
      }
      const ls = data.cfg.logoSrc;
      if (ls && data.cfg.logoOn !== false && !images[ls]) {
        try { const b = await this.blobOf(ls); if (b) images[ls] = await U.toDataURL(b); } catch (e) {}
      }
      let video = null;
      try { const vb = await U.store.get(this.vKey()); if (vb) video = await U.toDataURL(vb); else if (this.defVideo()) video = await U.toDataURL(await (await fetch(this.defVideo())).blob()); } catch (e) {}
      let audio = null;
      if (this.state.audioName && this.state.cfg.exportAudio !== false) {
        try { const ab = await U.store.get('audio'); if (ab) audio = { src: await U.toDataURL(ab), ...this.audioOpts() }; } catch (e) {}
      }
      const fam0 = this.state.cfg.font || 'Archivo', fam = /^[A-Za-z][A-Za-z ]{1,39}$/.test(fam0) ? fam0 : 'Archivo', { W, H } = this.dims();
      const font = fam === 'Helvetica' ? '' : await U.embeddedFontCSS(fam === 'Archivo' ? U.FONT_CSS : '/fonts/' + fam.toLowerCase().replace(/ /g, '-') + '.css');
      const html = U.buildPlayerHTML({ W, H, data, media: { images, video }, audio, title: this.state.cfg.header || 'Ukeprogram' }, font);
      this.download(new Blob([html], { type: 'text/html' }), this.fileBase() + '.html');
    } finally { this.setState({ busy: '' }); }
  };
  async loadMuxer() {
    if (window.Mp4Muxer) return window.Mp4Muxer;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = '/vendor/mp4-muxer-5.1.3/mp4-muxer.js';
      sc.integrity = 'sha384-SujebcgqCNlLMRSnVkLD+3eWOzsxobv30Bct+0lV+fc1EHHEuvcePwmDgMzpnptj'; 
      sc.onload = res; sc.onerror = () => rej(new Error('lib')); document.head.appendChild(sc);
    });
    return window.Mp4Muxer;
  }
  async renderSoundtrack(total, sr, data) {
    const buf = this.audioBuf; if (!window.OfflineAudioContext) return null;
    const oc = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
    /* sound from video slides */
    const sl = (data && data.slides) || [], duck = oc.createGain(); duck.connect(oc.destination);
    let at = 0, anyVid = false;
    for (const x of sl) {
      if (x.vid) {
        if (!x.vidMusic) { duck.gain.setValueAtTime(1, at); duck.gain.linearRampToValueAtTime(0, at + Math.min(0.5, x.dur / 2)); duck.gain.setValueAtTime(0, Math.max(at, at + x.dur - 0.5)); duck.gain.linearRampToValueAtTime(1, at + x.dur); }
        if (x.vidSound !== false) {
          try {
            const b = await window.UkeLoop.store.get(x.vid), vb = b ? await oc.decodeAudioData(await b.arrayBuffer()) : null;
            if (vb) { const s0 = oc.createBufferSource(), g = oc.createGain(); s0.buffer = vb; g.gain.value = x.vidVol == null ? 1 : x.vidVol; s0.connect(g); g.connect(oc.destination); s0.start(at, 0, Math.min(x.dur, vb.duration)); anyVid = true; }
          } catch (e) {}
        }
      }
      at += x.dur;
    }
    if (!buf) return anyVid ? await oc.startRendering() : null;
    const o = this.audioOpts(), off = Math.max(0, Math.min(buf.duration - 0.1, o.offset || 0)), vol = o.vol == null ? 0.8 : o.vol;
    const master = oc.createGain(); master.connect(duck);
    const fi = o.fadeIn == null ? 0.6 : o.fadeIn, fo = o.fadeOut == null ? 1 : o.fadeOut;
    master.gain.setValueAtTime(fi > 0 ? 0 : vol, 0); if (fi > 0) master.gain.linearRampToValueAtTime(vol, Math.min(fi, total / 2));
    master.gain.setValueAtTime(vol, Math.max(0, total - fo)); if (fo > 0) master.gain.linearRampToValueAtTime(0, total);
    if (o.mode === 'free') { const src = oc.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = off; src.loopEnd = buf.duration; src.connect(master); src.start(0, off); }
    else {
      const seg = Math.max(0.5, buf.duration - off), rep = total > seg + 0.05;
      for (let t0 = 0; t0 < total - 0.01; t0 += seg) {
        const len = Math.min(seg, total - t0), src = oc.createBufferSource(), g = oc.createGain(); src.buffer = buf; src.connect(g); g.connect(master);
        if (rep && t0 > 0) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.12); }
        if (rep && t0 + seg < total) { g.gain.setValueAtTime(1, t0 + len - 0.35); g.gain.linearRampToValueAtTime(0, t0 + len); }
        src.start(t0, off, len);
        if (!rep) break;
      }
    }
    return await oc.startRendering();
  }
  fastExport = async q4k => {
    if (this._exporting || this.state.rec) return;
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') { if (this.recMime() && confirm('Rask eksport støttes ikke i denne nettleseren.\n\nVil du ta opp videoen i sanntid i stedet?')) this.startRec(); else if (!this.recMime()) alert('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.'); return; }
    const R = this.resolved(), total = R.active.reduce((a, x) => a + x.dur, 0); if (!total) return;
    const port = this.portrait(), W = q4k ? (port ? 2160 : 3840) : (port ? 1080 : 1920), H = q4k ? (port ? 3840 : 2160) : (port ? 1920 : 1080), fps = 30;
    const nF = Math.round(total * fps), t0 = performance.now();
    this._exporting = true; this._fastAbort = false; this.hardStopAudio();
    const wasPlaying = this.state.playing, v = this.media.video, vWas = v && !v.paused;
    this.setState({ playing: false, fast: { pct: 0, phase: 'Forbereder …' }, fastMsg: '' });
    let venc = null, aenc = null;
    try {
      const M = await this.loadMuxer();
      const cands = q4k ? ['avc1.640033', 'avc1.640034', 'avc1.4d0033', 'avc1.640032'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
      let vcfg = null;
      for (const codec of cands) { const cfg = { codec, width: W, height: H, bitrate: q4k ? 35e6 : 12e6, bitrateMode: 'variable', latencyMode: 'quality', framerate: fps, avc: { format: 'avc' } }; try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) { vcfg = r.config; break; } } catch (e) {} }
      let vcodec = 'avc';
      if (!vcfg) for (const [codec, mc] of [['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']]) { try { const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: q4k ? 35e6 : 12e6, bitrateMode: 'variable', framerate: fps }); if (r.supported) { vcfg = r.config; vcodec = mc; break; } } catch (e) {} }
      if (!vcfg) throw new Error('Nettleseren kan ikke lage video i denne oppløsningen. Prøv 1080p, eller bruk «Ta opp video».');
      const base0 = this.payload(), vidAud = base0.slides.some(x => x.vid && x.vidSound !== false);
      const wantAudio = !!((this.audioBuf || vidAud) && this.state.cfg.exportAudio !== false && typeof AudioEncoder !== 'undefined');
      let acfg = null, acodec = null;
      if (wantAudio) for (const [c, mc] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) { const cfg = { codec: c, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }; try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) { acfg = r.config; acodec = mc; break; } } catch (e) {} }
      const target = new M.ArrayBufferTarget();
      const muxer = new M.Muxer({ target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: vcodec, width: W, height: H, frameRate: fps }, ...(acfg ? { audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48000 } } : {}) });
      let encErr = null;
      venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { encErr = e; } });
      venc.configure(vcfg);
      if (acfg) {
        this.setState({ fast: { pct: 0, phase: 'Lager lydspor …' } });
        const ab = await this.renderSoundtrack(total, 48000, base0);
        if (ab) {
          aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => { encErr = e; } });
          aenc.configure(acfg);
          const L = ab.getChannelData(0), Rr = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L, N = 4800;
          for (let i = 0; i < ab.length; i += N) {
            const n = Math.min(N, ab.length - i), d = new Float32Array(n * 2); d.set(L.subarray(i, i + n), 0); d.set(Rr.subarray(i, i + n), n);
            const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / 48000 * 1e6), data: d });
            aenc.encode(ad); ad.close();
          }
          await aenc.flush();
        }
      }
      const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
      const ctx = cv.getContext('2d'), media = { images: this.media.images, video: v, vids: this.media.vids };
      this.pauseVids();
      for (const x of base0.slides) if (x.vid && !this.media.vids[x.vid]) { await this.ensureVid(x.vid); }
      for (const x of base0.slides) { const sv = x.vid && this.media.vids[x.vid]; if (sv && sv.readyState < 2) await new Promise(r => { sv.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 4000); }); }
      if (v && v.src) try { v.pause(); } catch (e) {}
      const base = this.payload(), U = window.UkeLoop;
      for (let f = 0; f < nF; f++) {
        if (this._fastAbort) throw new Error('abort');
        if (encErr) throw encErr;
        const t = f / fps;
        if (v && v.src && v.readyState >= 1 && v.duration) {
          const vt = t % v.duration;
          if (Math.abs(v.currentTime - vt) > 0.01) await new Promise(r => { const done = () => { v.removeEventListener('seeked', done); r(); }; v.addEventListener('seeked', done); setTimeout(done, 400); v.currentTime = vt; });
        }
        const lc = U.renderer.locate(base.slides, t), cs = lc ? base.slides[lc.i] : null, sv = cs && cs.vid ? this.media.vids[cs.vid] : null;
        if (sv && sv.readyState >= 1 && sv.duration) {
          const st = Math.max(0, Math.min(sv.duration - 0.04, lc.lt));
          if (Math.abs(sv.currentTime - st) > 0.01) await new Promise(r => { const done = () => { sv.removeEventListener('seeked', done); r(); }; sv.addEventListener('seeked', done); setTimeout(done, 1500); sv.currentTime = st; });
        }
        U.renderer.drawFrame(ctx, W, H, base, media, t);
        const fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) });
        venc.encode(fr, { keyFrame: f % (fps * 2) === 0 }); fr.close();
        while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
        if (f % 8 === 0) {
          const el = (performance.now() - t0) / 1000, left = f > 10 ? el / f * (nF - f) : null;
          this.setState({ fast: { pct: Math.round(f / nF * 100), phase: 'Lager video … ' + Math.round(f / nF * 100) + ' %' + (left != null ? ' · ca. ' + Math.max(1, Math.round(left)) + ' s igjen' : '') } });
          await new Promise(r => setTimeout(r, 0));
        }
      }
      this.setState({ fast: { pct: 100, phase: 'Fullfører filen …' } });
      await venc.flush(); muxer.finalize();
      const blob = new Blob([target.buffer], { type: 'video/mp4' });
      if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen, eller velg 1080p.');
      this.setState({ fast: { pct: 100, phase: 'Sjekker at filen kan spilles …' } });
      const ok = await this.testPlayable(blob);
      if (ok === false) throw new Error('Filen kunne ikke spilles av i nettleseren. Prøv 1080p eller opptak i sanntid.');
      this.download(blob, this.fileBase() + (q4k ? '-4k' : '-1080p') + '.mp4');
      const secs = Math.round((performance.now() - t0) / 1000);
      this.setState({ fastMsg: 'Ferdig på ' + secs + ' s · ' + (blob.size / 1048576).toFixed(1) + ' MB · H.264' + (acfg ? (acodec === 'aac' ? ' + AAC-lyd' : ' + Opus-lyd (spill av i VLC hvis lyden mangler)') : wantAudio ? ' · uten lyd (nettleseren kan ikke lage lyd i MP4)' : '') });
    } catch (e) {
      this.setState({ fastMsg: e && e.message === 'abort' ? 'Avbrutt.' : 'Noe gikk galt: ' + ((e && e.message) || e) });
    } finally {
      try { venc && venc.state !== 'closed' && venc.close(); } catch (e) {} try { aenc && aenc.state !== 'closed' && aenc.close(); } catch (e) {}
      this._exporting = false;
      if (v && v.src && vWas) v.play().catch(() => {});
      this.t0 = performance.now();
      this.setState({ fast: null, playing: wasPlaying });
    }
  };
  recMime(withAudio) {
    if (!window.MediaRecorder) return null;
    /* H.264 level must match the canvas size (4.0 up to 1080p, 5.1 for 4K), otherwise strict players refuse the file */
    const big = (() => { const d = this.dims(); return d.W * d.H > 1920 * 1088; })();
    const avc = big ? ['avc1.640033', 'avc1.4d0033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
    const list = withAudio
      ? [...avc.map(c => 'video/mp4;codecs=' + c + ',mp4a.40.2'), 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : [...avc.map(c => 'video/mp4;codecs=' + c), 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    try { return list.find(m => MediaRecorder.isTypeSupported(m)) || ''; } catch (e) { return ''; }
  }
  startRec = () => {
    const c = this.canvasRef.current;
    const vidAud = this.payload().slides.some(x => x.vid && x.vidSound !== false);
    const withAudio = !!(this.state.cfg.exportAudio !== false && ((this.state.audioName && this.actl && this.actl.duration()) || vidAud));
    if (withAudio) { this.ensureGraph(); this.actl && this.actl.stop(); }
    const mime = this.recMime(withAudio && !!this.aDest);
    if (!c || mime === null || !c.captureStream) { alert('Nettleseren støtter ikke opptak. Bruk Chrome eller Edge.'); return; }
    const R = this.resolved(), total = R.active.reduce((a, s) => a + s.dur, 0); if (!total) return;
    { const d = this.dims(); if (c.width !== d.W || c.height !== d.H) { c.width = d.W; c.height = d.H; this._pk = null; } }
    const tracks = [...c.captureStream(30).getVideoTracks()];
    if (withAudio && this.aDest) {
      const at = this.aDest.stream.getAudioTracks()[0]; if (at) tracks.push(at.clone());
    }
    const stream = new MediaStream(tracks), chunks = [];
    const opts = { videoBitsPerSecond: this.state.cfg.res === '4k' ? 30000000 : 12000000 }; if (mime) opts.mimeType = mime;
    const rec = new MediaRecorder(stream, opts);
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (this.recCancel) { this.recCancel = false; return; }
      const type = rec.mimeType || mime || 'video/webm';
      if (!chunks.length) { alert('Opptaket ble tomt. Prøv igjen, og hold fanen synlig mens det tar opp.'); return; }
      const ext = /mp4/.test(type) ? '.mp4' : /matroska/.test(type) ? '.mkv' : '.webm';
      this.download(new Blob(chunks, { type: type.split(';')[0] }), this.fileBase() + ext);
    };
    this.recObj = rec; this.recTotal = total; this.t0 = performance.now();
    const v = this.media.video; if (v && v.src) { v.currentTime = 0; v.play().catch(() => {}); }
    rec.start(1000);
    this.setState({ rec: { pct: 0 }, playing: true, playIdx: 0, scrubT: null });
  };
  tickRec() {
    const el = (performance.now() - this.t0) / 1000;
    if (el >= this.recTotal + 0.05) { this.stopRec(false); return; }
    const pct = Math.min(100, Math.floor(el / this.recTotal * 100));
    if (this.state.rec && pct !== this.state.rec.pct) this.setState({ rec: { pct } });
  }
  stopRec(cancel) {
    const r = this.recObj; this.recObj = null; this.recCancel = !!cancel;
    if (r && r.state !== 'inactive') r.stop();
    if (this.alive) this.setState({ rec: null });
  }

  renderVals() {
    const S = this.state, R = this.resolved(), all = R.all, active = R.active;
    const sel = all.find(s => s.id === S.selected) || all[0] || null, id = sel ? sel.id : null;
    const DM = this.dims(), DU = Math.min(DM.W, DM.H) / 1080, PT = this.portrait();
    const qrDef = (() => { const q = (this.media.lastRects || {}).qr; return q ? { x: (q.x + q.w / 2) / DM.W, y: (q.y + q.h / 2) / DM.H } : { x: (DM.W - 95 * DU - 165 * DU) / DM.W, y: (DM.H - 150 * DU - 165 * DU) / DM.H }; })();
    const idx = sel ? all.indexOf(sel) : -1;
    const TYPE = { day: 'Møte', text: 'Tekst', contact: 'Kontakt · QR', outro: 'Avslutning' };
    const total = active.reduce((a, s) => a + s.dur, 0), loopLen = this.fmtLen(total);
    const live = S.playing || !!S.rec;
    const playingId = live ? (active[S.playIdx] || {}).id : id;
    const T0 = S.tpl || 'week', first = T0 === 'blank' ? ['build', 'Bygg', 'Legg til slides og velg stilpakke', 'M12 5v14M5 12h14'] : T0 === 'week' ? ['program', 'Program', 'Hent og rediger ukens program', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'] : null;
    let curTab = S.tab; if (curTab === 'program' || curTab === 'build') curTab = first ? first[0] : 'slides';
    const TABS = [first,
      ['slides', 'Slides', 'Tekst, bilde og stil for hver slide', 'M4 7h16v12H4zM7 4h10'],
      ['style', 'Stil', 'Logo, overskrift, skrift, bakgrunnsvideo og musikk', 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
      ['fx', 'Effekter', 'Overganger, animasjoner, fargepaneler og filter', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z'],
      ['export', 'Eksport', 'Last ned video eller fullskjerm-spiller', 'M12 3v12M7 10l5 5 5-5M5 21h14']].filter(Boolean);
    const tabs = TABS.map(([k, l, tip, icon]) => { const on = curTab === k; return {
      label: l, tip, icon, current: on ? 'page' : 'false', bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', border: on ? '#f3f1ec' : 'transparent', onClick: () => this.setState({ tab: k })
    }; });
    const kick = s => s.type === 'day' ? [s.day, s.time].filter(Boolean).join(' · ') : s.type === 'outro' ? (s.sub || '') : (s.kicker || '');
    const head = s => s.type === 'day' ? s.title : s.type === 'text' ? s.body : s.type === 'contact' ? s.headline : s.title;
    const cards = all.map((s, i) => ({
      num: String(i + 1).padStart(2, '0'), label: TYPE[s.type] || '', kicker: kick(s), title: head(s) || '(uten tekst)',
      meta: s.hidden ? 'Skjult' : (Math.round(s.dur * 10) / 10) + ' s',
      thumbBg: (() => { const b = this.bgOf(s); return b ? this.cssUrl(S.urls[b] || b) : 'none'; })(),
      border: s.id === id ? '#e9e7e2' : '#2b2b2b', shadow: s.id === id ? '0 0 0 1px #e9e7e2' : 'none',
      opacity: s.hidden ? 0.45 : 1, playing: s.id === playingId, onClick: () => this.select(s.id),
      onRemove: e => { if (e && e.stopPropagation) e.stopPropagation(); this.del(s.id); },
      hasVid: !!s.vid, vidSoundOn: s.vidSound !== false, vidSoundOff: s.vidSound === false,
      vidSoundColor: s.vidSound === false ? '#8a867e' : '#ffffff',
      vidSoundTitle: s.vidSound === false ? 'Videolyd er av – trykk for å slå på' : 'Videolyd er på – trykk for å slå av',
      toggleVidSound: e => { if (e && e.stopPropagation) e.stopPropagation(); this.setF(s.id, 'vidSound', s.vidSound === false); this._pk = null; }
    }));
    const fields = ['day', 'date', 'time', 'title', 'place', 'kicker', 'pill', 'body', 'sub', 'headline', 'text', 'email', 'phone', 'qrUrl'];
    const f = {}, on = {};
    fields.forEach(k => { f[k] = sel && sel[k] != null ? sel[k] : ''; on[k] = e => id && this.setF(id, k, e.target.value); });
    const qr = sel && sel.type === 'contact' ? this.makeQR(sel.qrUrl) : null;
    const hasBg = !!this.bgOf(sel);
    const orig = sel ? S.slides.find(x => x.id === id) : null;
    const customDur = !!(orig && orig.dur);
    const activeIdx = sel ? active.findIndex(s => s.id === id) : -1;
    const recMime = this.recMime();
    const fastOk = typeof VideoEncoder !== 'undefined';
    const MB = !!S.mobile, pane = S.mPane || 'preview';
    return {
      ...(() => {
        const C = S.crop; if (!C) return { cropOpen: false };
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200, vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const maxW = Math.min(900, vw - (MB ? 56 : 120)), maxH = vh * (MB ? 0.5 : 0.58), k = Math.min(maxW / C.w, maxH / C.h, 1e9);
        const b = C.box, pct = v => (v * 100).toFixed(3) + '%';
        const opts = [['free', 'Fri'], ['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['4:5', '4:5'], ['orig', 'Original']];
        const HS = MB ? 30 : 18;
        return {
          cropOpen: true, cropTitle: C.title, cropBg: 'url("' + String(C.url).replace(/["\\]/g, '') + '")', cropWrapRef: this.cropWrapRef,
          cropDispW: Math.round(C.w * k) + 'px', cropDispH: Math.round(C.h * k) + 'px',
          cropL: pct(b.x), cropT: pct(b.y), cropW: pct(b.w), cropH: pct(b.h),
          cropSize: Math.round(b.w * C.w) + ' × ' + Math.round(b.h * C.h) + ' px',
          cropHS: HS + 'px', cropHO: -(HS / 2) + 'px',
          cropAspects: opts.map(([v, l]) => ({ label: l, bg: C.aspect === v ? '#f3f1ec' : 'transparent', fg: C.aspect === v ? '#000000' : '#c9c5bc', onClick: () => this.setState(st => st.crop ? { crop: { ...st.crop, aspect: v, box: this.cropFit(v, st.crop.w, st.crop.h) } } : null) })),
          cropMove: e => this.onCropDown(e, 'move'), cropNW: e => this.onCropDown(e, 'nw'), cropNE: e => this.onCropDown(e, 'ne'), cropSW: e => this.onCropDown(e, 'sw'), cropSE: e => this.onCropDown(e, 'se'),
          cropN: e => this.onCropDown(e, 'n'), cropS: e => this.onCropDown(e, 's'), cropE: e => this.onCropDown(e, 'e'), cropW2: e => this.onCropDown(e, 'w'),
          cropEL: (MB ? 36 : 26) + 'px', cropET: (MB ? 12 : 9) + 'px', cropELo: 'calc(50% - ' + ((MB ? 36 : 26) / 2) + 'px)', cropETo: -((MB ? 12 : 9) / 2) + 'px',
          cropCancel: () => this.finishCrop('cancel'), cropFull: () => this.finishCrop('full'), cropApply: () => this.finishCrop('crop'),
          cropReset: () => this.setState(st => st.crop ? { crop: { ...st.crop, box: this.cropFit(st.crop.aspect, st.crop.w, st.crop.h) } } : null)
        };
      })(),
      recropBg: this.recropBg,
      ...(() => {
        const o = sel ? S.slides.find(x => x.id === id) : null, f = (o && o.bgFill) || {}, mode = this.FILLM.includes(f.mode) ? f.mode : 'none';
        const stops = this.fillStops(f), ang = f.angle == null ? 135 : f.angle;
        const put = p => { if (!id) return; this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const cur = x.bgFill || {}; return { ...x, bgFill: { mode: 'linear', angle: 135, ...cur, stops: this.fillStops(cur), ...p } }; }) })); this._pk = null; };
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
          fillNote: hasBg ? 'Vises bare når sliden ikke har bakgrunnsbilde.' : 'Hold Shift og dra i forhåndsvisningen for å flytte gradienten.',
          fillCenter: () => put({ x: 0.5, y: 0.5 }), fillMoved: f.x != null && (Math.abs(f.x - 0.5) > 0.005 || Math.abs((f.y == null ? 0.5 : f.y) - 0.5) > 0.005)
        };
      })(),
      openVigEd: () => { if (!id) return; this.setState({ vigEd: { layer: 0, scope: 'slide' }, playing: false }); this.hardStopAudio(); },
      openOvEd: () => { if (!id) return; this.setState({ ovEd: { scope: 'slide' }, playing: false }); this.hardStopAudio(); },
      openOvEdAll: () => { if (!id) return; this.setState({ ovEd: { scope: 'all' }, playing: false }); this.hardStopAudio(); },
      ovSummary: (() => { if (!sel) return ''; const o = this.ovState(sel, false); const t = this.OVT.find(x => x[0] === o.fx); return o.on ? (t ? t[1] : '') + (this.ovOwn(sel) ? ' · egne innstillinger' : '') : 'Av'; })(),
      ovAllSummary: (() => { const o = this.ovState(null, true); const t = this.OVT.find(x => x[0] === o.fx); return o.on ? (t ? t[1] : '') + ' · ' + Math.round(o.amt * 100) + ' %' : 'Av'; })(),
      ...(() => {
        const E = S.ovEd; if (!E || !sel) return { ovEdOpen: false };
        const all = E.scope === 'all', O = this.ovState(sel, all), gFx = S.cfg.overlayFx || 'none', own = !all && this.ovOwn(sel);
        const vw = window.innerWidth, vh = window.innerHeight, ar = DM.W / DM.H, maxW = Math.min(MB ? vw - 56 : 620, vw - 60), maxH = MB ? vh * 0.3 : vh * 0.52;
        let pw = maxW, ph = pw / ar; if (ph > maxH) { ph = maxH; pw = ph * ar; }
        const sw = v => ({ track: v ? '#f3f1ec' : '#2b2b2b', knob: v ? '#000000' : '#8a867e', x: v ? '16px' : '2px' });
        const TYPE = { day: 'Møte', text: 'Tekst', contact: 'Kontakt', outro: 'Avslutning' }, tab = on => ({ bg: on ? '#f3f1ec' : 'transparent', fg: on ? '#000000' : '#c9c5bc' });
        const SW = [S.cfg.accent || '#f5b82c', '#ffffff', '#ffd27a', '#ff9fbf', '#9fd8ff', '#8fe3cf', '#b18cff'];
        const effOf = x => ((x.ov && x.ov.overlayFx) || gFx);
        return {
          ovEdOpen: true, ovEdCanvas: this.ovEdCanvas, oePW: Math.round(pw) + 'px', oePH: Math.round(ph) + 'px',
          oeScopeSlide: tab(!all), oeScopeAll: tab(all),
          oeToSlide: () => this.setState({ ovEd: { scope: 'slide' } }), oeToAll: () => this.setState({ ovEd: { scope: 'all' } }),
          oeScopeNote: all ? 'Endringer her gjelder alle slides. Slider med egne innstillinger beholder dem.' : (own ? 'Denne sliden har egne innstillinger som overstyrer «Alle slides».' : 'Denne sliden følger innstillingene for alle slides. Endrer du noe her, får sliden egne innstillinger.'),
          oeHasOwn: own, oeUseAll: () => { this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const n = { ...x }; delete n.oAmt; delete n.oSpeed; delete n.oAlpha; delete n.oColor; if (n.ov) { const ov = { ...n.ov }; delete ov.overlayFx; n.ov = ov; } return n; }) })); this._pk = null; },
          oeSw: sw(O.on), oeOnLabel: all ? 'Overlegg på alle slides' : 'Overlegg på denne sliden',
          oeToggle: () => { const last = (all ? S.cfg.ovLast : sel.ovLast) || S.cfg.ovLast || 'bokeh'; this.setOv({ fx: O.on ? 'none' : last }); },
          oeTypes: this.OVT.map(([v, t]) => ({ label: t, bg: O.fx === v ? '#f3f1ec' : '#121212', fg: O.fx === v ? '#000000' : '#f3f1ec', bd: O.fx === v ? '#f3f1ec' : '#2b2b2b', onClick: () => this.setOv({ fx: v }) })),
          oeAmt: Math.round(O.amt * 100), onOeAmt: ev => this.setOv({ amt: Number(ev.target.value) / 100 }), oeAmt60: () => this.setOv({ amt: 0.6 }),
          oeSpeed: Math.round(O.speed * 100), onOeSpeed: ev => this.setOv({ speed: Number(ev.target.value) / 100 }), oeSpeed100: () => this.setOv({ speed: 1 }),
          oeTransp: Math.round((1 - O.alpha) * 100), onOeTransp: ev => this.setOv({ alpha: 1 - Number(ev.target.value) / 100 }), oeTransp0: () => this.setOv({ alpha: 1 }),
          oeColor: O.color, onOeColor: ev => { const v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) this.setOv({ color: v }); },
          oeSwList: SW.map(cc => ({ c: cc, ring: cc.toLowerCase() === String(O.color).toLowerCase() ? '0 0 0 2px #0a0a0a, 0 0 0 4px #f3f1ec' : '0 0 0 1px rgba(255,255,255,0.22)', onClick: () => this.setOv({ color: cc }) })),
          oeSync: S.cfg.overlaySync !== false, onOeSync: ev => this.setCfg('overlaySync', ev.target.checked),
          oeSlides: R.all.map((x, i) => { const f = effOf(x), v = f !== 'none', cur = !all && x.id === id, o2 = sw(v), t2 = this.OVT.find(q => q[0] === f); return {
            num: String(i + 1).padStart(2, '0'), kind: TYPE[x.type] || '', title: (x.type === 'day' ? x.title : x.type === 'text' ? x.body : x.type === 'contact' ? x.headline : x.title) || TYPE[x.type] || '',
            status: !v ? 'Av' : (t2 ? t2[1] : '') + (this.ovOwn(x) ? ' · egne' : ' · følger alle'), statusColor: !v ? '#6f6b64' : this.ovOwn(x) ? '#e9e7e2' : '#9d998f',
            border: cur ? '#f3f1ec' : '#2b2b2b', bg: cur ? '#1a1a1a' : '#101010', op: v ? 1 : 0.55, track: o2.track, knob: o2.knob, kx: o2.x,
            onPick: () => { this.select(x.id); this.setState({ ovEd: { scope: 'slide' }, playing: false }); this._pk = null; },
            onToggle: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); const nv = v ? 'none' : (x.ovLast || S.cfg.ovLast || (gFx !== 'none' ? gFx : 'bokeh')); this.setState(st => ({ slides: st.slides.map(y => { if (y.id !== x.id) return y; const ov = { ...(y.ov || {}) }; if (nv === gFx) delete ov.overlayFx; else ov.overlayFx = nv; return { ...y, ov, ...(nv !== 'none' ? { ovLast: nv } : {}) }; }) })); this._pk = null; }
          }; }),
          oeOnCount: R.all.filter(x => effOf(x) !== 'none').length + ' av ' + R.all.length + ' slides har overlegg',
          oeDone: () => this.setState({ ovEd: null })
        };
      })(),
      openVigEdAll: () => { if (!id) return; this.setState({ vigEd: { layer: 0, scope: 'all' }, playing: false }); this.hardStopAudio(); },
      vigAllSummary: (() => { const o = this.vigTypeOpts().find(t => t[0] === (S.cfg.vigType || 'auto')); const n = (S.cfg.vigs || []).length; return (o ? o[1].replace(/ \(.*\)/, '') : '') + (S.cfg.vigRot ? ' · ' + Math.round(S.cfg.vigRot) + '°' : '') + (n ? ' · +' + n + ' ekstra' : ''); })(),
      vigSummary: (() => { if (!sel) return ''; const o = this.vigTypeOpts().find(t => t[0] === (sel.vigType || S.cfg.vigType || 'auto')); const n = (sel.vigs || []).length; return (o ? o[1].replace(/ \(.*\)/, '') : '') + (sel.vigRot ? ' · ' + Math.round(sel.vigRot) + '°' : '') + (n ? ' · +' + n + ' ekstra' : ''); })(),
      ...(() => {
        const E = S.vigEd; if (!E || !sel) return { vigEdOpen: false };
        const all = E.scope === 'all', L = this.vigLayerOf(sel, E.layer, E.scope) || this.vigLayerOf(sel, 0, E.scope), pc = v => (v * 100).toFixed(2) + '%';
        const extras = all ? (S.cfg.vigs || []) : (sel.vigs || []), n = extras.length;
        const vw = window.innerWidth, vh = window.innerHeight, ar = DM.W / DM.H, maxW = MB ? vw - 56 : Math.max(280, Math.min(vw - 60, Math.min(1080, vw - 24) - 36 - 18 - 380)), maxH = MB ? vh * 0.34 : Math.max(vh * 0.6, vh - 110); /* PC: nesten hele høyden (stående formater); dialogen er 1080 px bred og kontrollene får minst 380 px */
        let pw = maxW, ph = pw / ar; if (ph > maxH) { ph = maxH; pw = ph * ar; }
        const SW = ['#080808', '#24406e', '#8a2238', '#1e6e4f', '#5e3190', '#b07a1c', '#ffffff'];
        const own = !all && Object.values(this.VSMAP).some(k => sel[k] != null && k !== 'fx' && k !== 'fy');
        const setExtras = fn => { if (all) this.setState(st => ({ cfg: { ...st.cfg, vigs: fn(st.cfg.vigs || []) } })); else this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, vigs: fn(x.vigs || []) } : x) })); this._pk = null; };
        const tabBtn = (on) => ({ bg: on ? '#f3f1ec' : 'transparent', fg: on ? '#000000' : '#c9c5bc' });
        return {
          vigEdOpen: true, vigEdWrap: this.vigEdWrap, vigEdCanvas: this.vigEdCanvas, onVigEdDown: this.onVigEdDown,
          veScopeSlide: tabBtn(!all), veScopeAll: tabBtn(all),
          veToSlide: () => this.setState({ vigEd: { layer: 0, scope: 'slide' } }), veToAll: () => this.setState({ vigEd: { layer: 0, scope: 'all' } }),
          veScopeNote: all ? 'Endringer her gjelder alle slides og overstyrer det du har endret på enkeltslides.' : (own ? 'Denne sliden har egne innstillinger som overstyrer «Alle slides».' : 'Denne sliden følger innstillingene for alle slides. Endrer du noe her, får sliden egne innstillinger.'),
          veHasOwn: own && E.layer === 0, veUseAll: () => { this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const o = { ...x }; Object.values(this.VSMAP).forEach(k => { if (k !== 'fx' && k !== 'fy') delete o[k]; }); return o; }) })); this._pk = null; },
          vePW: Math.round(pw) + 'px', vePH: Math.round(ph) + 'px', vePos: MB ? 'relative' : 'sticky', veX: pc(L.x), veY: pc(L.y), veRotDeg: L.rot + 'deg', veRot: Math.round(L.rot), veOpen: Math.round(L.open * 100),
          veAmt: Math.round((L.amt == null ? 1 : L.amt) * 100), onVeAmt: ev => this.setVigLayer({ amt: Number(ev.target.value) / 100 }), veAmt100: () => this.setVigLayer({ amt: 1 }),
          veTransp: Math.round((1 - (L.alpha == null ? 1 : L.alpha)) * 100), onVeTransp: ev => this.setVigLayer({ alpha: 1 - Number(ev.target.value) / 100 }), veTransp0: () => this.setVigLayer({ alpha: 1 }),
          veSoft: Math.round((L.soft == null ? 0.5 : L.soft) * 100), onVeSoft: ev => this.setVigLayer({ soft: Number(ev.target.value) / 100 }), veSoft50: () => this.setVigLayer({ soft: 0.5 }),
          veSize: Math.round((L.size == null ? 1 : L.size) * (0.6 + 0.8 * (L.open == null ? 0.5 : L.open)) * 100), onVeSize: ev => this.setVigLayer({ size: Number(ev.target.value) / 100 * (0.6 + 0.8 * (L.open == null ? 0.5 : L.open)), open: 0.5 }), veSize100: () => this.setVigLayer({ size: 1, open: 0.5 }),
          veIsExtra: E.layer > 0, veColor: L.color,
          veLayers: [0, ...extras.map((_, i) => i + 1)].map(i => ({ label: i === 0 ? 'Hovedvignett' : 'Vignett ' + (i + 1), bg: E.layer === i ? '#f3f1ec' : 'transparent', fg: E.layer === i ? '#000000' : '#c9c5bc', onClick: () => this.setState({ vigEd: { ...E, layer: i } }) })),
          veCanAdd: n < 4, veAdd: () => { setExtras(l => [...l, { type: 'round', x: 0.5, y: 0.5, rot: 0, open: 0.5, amt: 0.8, alpha: 1, size: 1, soft: 0.5, color: '#080808' }]); this.setState({ vigEd: { ...E, layer: n + 1 } }); },
          veRemove: () => { const i = E.layer; if (!i) return; setExtras(l => l.filter((_, j) => j !== i - 1)); this.setState({ vigEd: { ...E, layer: Math.max(0, i - 1) } }); },
          veTypes: this.vigTypeOpts().map(([v, t]) => ({ label: t.replace(/ \(.*\)/, ''), bg: L.type === v ? '#f3f1ec' : '#121212', fg: L.type === v ? '#000000' : '#f3f1ec', bd: L.type === v ? '#f3f1ec' : '#2b2b2b', onClick: () => this.setVigLayer({ type: v }) })),
          onVeRot: ev => this.setVigLayer({ rot: Number(ev.target.value) }),
          veRotL: () => { let v = Math.round(L.rot) - 15; if (v < -180) v += 360; this.setVigLayer({ rot: v }); }, veRotR: () => { let v = Math.round(L.rot) + 15; if (v > 180) v -= 360; this.setVigLayer({ rot: v }); }, veRot0: () => this.setVigLayer({ rot: 0 }),
          onVeOpen: ev => this.setVigLayer({ open: Number(ev.target.value) / 100 }),
          veSw: SW.map(c => ({ c, ring: c === String(L.color).toLowerCase() ? '0 0 0 2px #0a0a0a, 0 0 0 4px #f3f1ec' : '0 0 0 1px rgba(255,255,255,0.22)', onClick: () => this.setVigLayer({ color: c }) })),
          onVeColor: ev => { const v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) this.setVigLayer({ color: v }); },
          veCenter: () => this.setVigLayer({ x: 0.5, y: 0.5 }),
          ...(() => {
            const gOn = S.cfg.vigOn !== false, on = all ? gOn : gOn && !sel.vigOff;
            const sw = v => ({ track: v ? '#f3f1ec' : '#2b2b2b', knob: v ? '#000000' : '#8a867e', x: v ? '16px' : '2px' });
            const TYPE = { day: 'Møte', text: 'Tekst', contact: 'Kontakt', outro: 'Avslutning' };
            const ownOf = x => Object.values(this.VSMAP).some(k => x[k] != null && k !== 'fx' && k !== 'fy') || (x.vigs && x.vigs.length);
            return {
              veSw0: sw(on), veOnLabel: all ? 'Vignett på alle slides' : 'Vignett på denne sliden', veOnNote: !all && !gOn ? 'Vignett er slått av for alle slides under «Alle slides».' : '',
              veToggle: () => { if (all) this.setCfg('vigOn', !gOn); else { if (!gOn) this.setCfg('vigOn', true); this.setF(id, 'vigOff', gOn ? !sel.vigOff : false); } this._pk = null; },
              veSlides: R.all.map((x, i) => { const v = gOn && !x.vigOff, cur = !all && x.id === id, o = sw(v); return {
                num: String(i + 1).padStart(2, '0'), title: (x.type === 'day' ? x.title : x.type === 'text' ? x.body : x.type === 'contact' ? x.headline : x.title) || TYPE[x.type] || '', kind: TYPE[x.type] || '',
                status: !v ? 'Av' : ownOf(x) ? 'Egne innstillinger' : 'Følger alle slides', statusColor: !v ? '#6f6b64' : ownOf(x) ? '#e9e7e2' : '#9d998f',
                border: cur ? '#f3f1ec' : '#2b2b2b', bg: cur ? '#1a1a1a' : '#101010', op: v ? 1 : 0.55, track: o.track, knob: o.knob, kx: o.x,
                onPick: () => { this.select(x.id); this.setState({ vigEd: { layer: 0, scope: 'slide' }, playing: false }); this._pk = null; },
                onToggle: ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (!gOn) { this.setCfg('vigOn', true); this.setState(st => ({ slides: st.slides.map(y => y.id === x.id ? { ...y, vigOff: false } : { ...y, vigOff: y.vigOff }) })); } else this.setF(x.id, 'vigOff', !x.vigOff); this._pk = null; }
              }; }),
              veOnCount: R.all.filter(x => gOn && !x.vigOff).length + ' av ' + R.all.length + ' slides har vignett'
            };
          })(),
          veDone: () => this.setState({ vigEd: null })
        };
      })(),
      hexOpen: !!S.hexPop && !S.hexPop.hidden, eyedropOn: !!S.eyedrop, cancelEyedrop: () => { this._eyedrop = false; this.setState(st => ({ eyedrop: false, hexPop: st.hexPop ? { ...st.hexPop, hidden: false } : null })); },
      pickHueColor: S.hexPop ? this.hsvToHex(S.hexPop.hh || 0, 1, 1) : '#ff0000',
      pickSX: S.hexPop ? ((S.hexPop.ss || 0) * 100).toFixed(1) + '%' : '0%', pickVY: S.hexPop ? ((1 - (S.hexPop.vv == null ? 1 : S.hexPop.vv)) * 100).toFixed(1) + '%' : '0%',
      pickHX: S.hexPop ? ((S.hexPop.hh || 0) / 360 * 100).toFixed(1) + '%' : '0%',
      onPickSV: e => this.dragPick(e, 'sv'), onPickHue: e => this.dragPick(e, 'hue'), startEyedrop: this.startEyedrop, hexX: S.hexPop ? S.hexPop.x + 'px' : '0px', hexY: S.hexPop ? S.hexPop.y + 'px' : '0px',
      hexDraft: S.hexPop ? S.hexPop.draft : '', hexSwatch: S.hexPop ? (this.normHex(S.hexPop.draft) || S.hexPop.val) : '#000000',
      hexBorder: S.hexPop && !this.normHex(S.hexPop.draft) ? '#ff8f7d' : '#2b2b2b',
      onHexInput: ev => { const d = String(ev.target.value || '').slice(0, 7).toUpperCase(); const n = this.normHex(d); if (n && d.replace('#', '').length === 6) this.applyHex(n); this.setState(st => st.hexPop ? { hexPop: { ...st.hexPop, draft: d, val: n || st.hexPop.val, ...(n ? { base: n, tone: 0, warm: 0, ...this.hexToHsv(n) } : {}) } } : null); },
      hexTone: S.hexPop ? S.hexPop.tone || 0 : 0, hexWarm: S.hexPop ? S.hexPop.warm || 0 : 0,
      hexToneLabel: !S.hexPop || !S.hexPop.tone ? '0' : (S.hexPop.tone > 0 ? '+' : '') + S.hexPop.tone,
      hexWarmLabel: !S.hexPop || !S.hexPop.warm ? '0' : (S.hexPop.warm > 0 ? '+' : '') + S.hexPop.warm,
      hexToneBg: S.hexPop ? 'linear-gradient(90deg, ' + this.adjustHex(S.hexPop.base, -100, S.hexPop.warm || 0) + ', ' + this.adjustHex(S.hexPop.base, 0, S.hexPop.warm || 0) + ', ' + this.adjustHex(S.hexPop.base, 100, S.hexPop.warm || 0) + ')' : 'none',
      hexWarmBg: S.hexPop ? 'linear-gradient(90deg, ' + this.adjustHex(S.hexPop.base, S.hexPop.tone || 0, -100) + ', ' + this.adjustHex(S.hexPop.base, S.hexPop.tone || 0, 0) + ', ' + this.adjustHex(S.hexPop.base, S.hexPop.tone || 0, 100) + ')' : 'none',
      onHexTone: ev => { const P = this.state.hexPop; if (!P) return; const tv = Number(ev.target.value), c = this.adjustHex(P.base, tv, P.warm || 0); this.applyHex(c); this.setState({ hexPop: { ...P, tone: tv, val: c, draft: c.toUpperCase() } }); },
      onHexWarm: ev => { const P = this.state.hexPop; if (!P) return; const wv = Number(ev.target.value), c = this.adjustHex(P.base, P.tone || 0, wv); this.applyHex(c); this.setState({ hexPop: { ...P, warm: wv, val: c, draft: c.toUpperCase() } }); },
      hexAdjReset: () => { const P = this.state.hexPop; if (!P) return; this.applyHex(P.base); this.setState({ hexPop: { ...P, tone: 0, warm: 0, val: P.base, draft: P.base.toUpperCase() } }); },
      onHexKey: ev => { if (ev.key === 'Enter') { ev.preventDefault(); const n = this.normHex(S.hexPop && S.hexPop.draft); if (n) this.applyHex(n); this.setState({ hexPop: null }); } else if (ev.key === 'Escape') { ev.preventDefault(); this.setState({ hexPop: null }); } },
      hexWheel: () => { const t = this._hexTarget; this.setState({ hexPop: null }); if (!t) return; t._nativeOk = true; try { if (t.showPicker) t.showPicker(); else t.click(); } catch (err) { t.click(); } },
      hexOk: () => { const n = this.normHex(S.hexPop && S.hexPop.draft); if (n) this.applyHex(n); this.setState({ hexPop: null }); }, editImg: this.editImg, cropIsEdit: !!(S.crop && S.crop.edit),
      edTabCrop: () => { if (S.crop) return; this.closePan('done'); this.recropBg(); },
      edTabPan: () => { if (!S.crop) return; if (!this.canPanSel()) return; this.finishCrop('cancel'); this.openPan(); },
      edPanFg: this.canPanSel() ? '#c9c5bc' : '#5f5b55', edPanTitle: this.canPanSel() ? 'Velg hvilken del av bildet som vises' : 'Bildet passer formatet, så det er ingenting å flytte',
      ...(() => {
        const b = this.bgOf(sel), im = b ? this.media.images[b] : null, ia = im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : null, fa = DM.W / DM.H;
        const pX = sel && sel.panX != null ? sel.panX : PT ? (sel && sel.fx != null ? sel.fx : 0.66) : 0.5, pY = sel && sel.panY != null ? sel.panY : 0.5;
        const canX = !!(ia && ia > fa * 1.02), canY = !!(ia && ia < fa * 0.98);
        return {
          panCanX: canX, panCanY: canY, panShown: false,
          panToggle: this.openPan,
          panModal: !!S.panOpen && (canX || canY), panWrapRef: this.panWrapRef, onPanFrameDown: this.onPanFrameDown,
          panDone: () => this.closePan('done'), panCancel: () => this.closePan('cancel'),
          panImgBg: b ? this.cssUrl(S.urls[b] || b) : 'none',
          ...(() => {
            if (!ia) return { panDispW: '0px', panDispH: '0px', pfL: '0%', pfT: '0%', pfW: '100%', pfH: '100%' };
            const vw = window.innerWidth, vh = window.innerHeight, iw = im.naturalWidth, ih = im.naturalHeight;
            const k = Math.min(Math.min(900, vw - (MB ? 56 : 120)) / iw, vh * (MB ? 0.5 : 0.6) / ih);
            const fw = canX ? fa / ia : 1, fh = canY ? ia / fa : 1, pc = v => (v * 100).toFixed(3) + '%';
            return { panDispW: Math.round(iw * k) + 'px', panDispH: Math.round(ih * k) + 'px', pfW: pc(fw), pfH: pc(fh), pfL: pc(canX ? pX * (1 - fw) : 0), pfT: pc(canY ? pY * (1 - fh) : 0) };
          })(),
          panXPct: Math.round(pX * 100), panYPct: Math.round(pY * 100),
          bgPos: (canX ? Math.round(pX * 100) : 50) + '% ' + (canY ? Math.round(pY * 100) : 50) + '%',
          onPanX: ev => { if (id) { this.setF(id, 'panX', Number(ev.target.value) / 100); this._pk = null; } },
          onPanY: ev => { if (id) { this.setF(id, 'panY', Number(ev.target.value) / 100); this._pk = null; } },
          panReset: () => { if (id) { this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, panX: 0.5, panY: 0.5 } : x) })); this._pk = null; } },
          panHint: 'Dra i bildet (i forhåndsvisningen eller den lille ruten) for å flytte det, eller bruk glidebryteren. ' + (PT && canX ? 'Bildet er bredere enn det stående formatet. Skyv for å velge hvilken del som vises, eller beskjær bildet.' : canX ? 'Bildet er bredere enn formatet. Skyv for å velge hvilken del som vises.' : 'Bildet er høyere enn formatet. Skyv for å velge hvilken del som vises.')
        };
      })(),
      mobile: MB, asideBackDisp: MB ? 'none' : 'flex', asideHeadPad: MB ? '14px 16px 10px' : '20px 20px 14px', mainExportDisp: MB ? 'none' : 'block',
      rootDir: MB ? 'column' : 'row', rootWrap: MB ? 'nowrap' : 'wrap',
      asideFlex: MB ? 'none' : '1 1 360px', mainFlex: MB ? 'none' : '999 1 560px', paneW: MB ? '100%' : 'auto', rootPadB: MB ? 'calc(106px + env(safe-area-inset-bottom))' : '36px',
      paneH: MB ? 'auto' : 'calc(100vh - 36px)', asideMaxW: MB ? 'none' : '440px', asideBorder: MB ? '0' : '1px solid #262626',
      asideDisplay: MB && pane !== 'edit' ? 'none' : 'flex', mainDisplay: MB && pane !== 'preview' ? 'none' : 'flex',
      mainPad: MB ? '16px 14px' : '24px 28px', canvasMaxH: S.fs ? '100vh' : (MB ? '62vh' : 'calc(100vh - 336px)'),
      mobileTabs: [['preview', 'Forhåndsvis'], ['edit', 'Rediger']].map(([k, l]) => { const on = pane === k; return { label: l, bg: on ? '#e9e7e2' : 'transparent', color: on ? '#000' : '#e9e7e2', border: on ? '#e9e7e2' : '#3a3a3a', onClick: () => { this.setState({ mPane: k }); try { window.scrollTo(0, 0); } catch (e) {} } }; }),
      saveOpen: !!S.saveOpen, saveClosed: !S.saveOpen, saveMsg: S.saveMsg || '',
      hasSaveErr: !!S.saveOpen && /full|plass/i.test(S.saveMsg || ''), diskUsage: this.diskList().length + ' av 10 plasser brukt.',
      ...(() => {
        const on = !!this.diskId && S.cfg.autoSave === true;
        return {
          autoAria: on ? 'true' : 'false', autoTrack: on ? '#e9e7e2' : '#2b2b2b', autoKnob: on ? '#000' : '#8a867e', autoKnobX: on ? '16px' : '2px',
          autoTextColor: on ? '#f3f1ec' : '#9d998f', hasAutoAt: on && !!S.autoAt, autoAtLabel: S.autoAt ? 'lagret ' + S.autoAt : '',
          toggleAuto: () => {
            if (!this.diskId) { this.setState({ saveOpen: true, saveMsg: '', saveName: this.customName || (this.tplNames()[S.tpl] || ''), cfg: { ...S.cfg, autoSave: true } }); return; }
            this.setCfg('autoSave', !on);
          }
        };
      })(),
      saveBtnLabel: this.diskId ? 'Lagre' : 'Lagre på Disk', saveActionLabel: this.diskId ? 'Lagre endringer' : 'Lagre',
      canSaveAsNew: !!this.diskId, saveName: S.saveName == null ? '' : S.saveName,
      openSave: () => this.setState({ saveOpen: true, saveMsg: '', saveName: this.customName || (this.tplNames()[S.tpl] || '') }),
      closeSave: () => this.setState({ saveOpen: false }),
      onSaveName: e => this.setState({ saveName: e.target.value.slice(0, 60) }),
      onSaveKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.saveToDisk(false); } else if (e.key === 'Escape') this.setState({ saveOpen: false }); },
      doSave: () => this.saveToDisk(false), doSaveNew: () => this.saveToDisk(true),
      timeRef: this.timeRef, isLive: !!live, isPaused: !live,
      onScrubDown: this.onScrubDown, onScrubMove: this.onScrubMove, onScrubUp: this.onScrubUp,
      stripRef: this.stripRef, trackRef: this.trackRef, fillRef: this.fillRef, headRef: this.headRef,
      onStripScroll: () => { if (!this._autoScrolling) this._stripTouch = performance.now(); },
      ...(() => {
        const c = S.cfg, DEF = [['#1f6f86', 1], ['#b4553a', 1], ['#1e3566', 0.9], ['#2a8f8a', 1], ['#1f6f86', 0.6]];
        const cur = Array.isArray(c.panels) && c.panels.length === 5 ? c.panels : DEF.map(([color, alpha]) => ({ color, alpha }));
        const on = c.style === 'promo' || c.transFx === 'panels';
        const setP = (i, k, v) => this.setState(s => { const base = Array.isArray(s.cfg.panels) && s.cfg.panels.length === 5 ? s.cfg.panels : DEF.map(([color, alpha]) => ({ color, alpha })); return { cfg: { ...s.cfg, panels: base.map((p, j) => j === i ? { ...p, [k]: v } : p) } }; });
        return {
          panelsOn: true, panelsBg: c.style === 'promo', onPanelsBg: e => this.setCfg('style', e.target.checked ? 'promo' : null), panelsCustom: Array.isArray(c.panels), panelsRotate: !!c.panelsRotate,
          panelsRandom: () => { const r = this.randPanels(); this.setState(st => ({ cfg: { ...st.cfg, panels: r.panels, panelBg: r.bg } })); },
          panelsReset: () => this.setState(s => ({ cfg: { ...s.cfg, panels: null, panelsRotate: false, panelBg: null } })),
          onPanelsRotate: e => this.setCfg('panelsRotate', e.target.checked),
          panelRows: cur.map((p, i) => ({
            label: 'Panel ' + (i + 1), color: p.color, alphaPct: Math.round((p.alpha == null ? 1 : p.alpha) * 100), swatchOpacity: Math.max(0.25, p.alpha == null ? 1 : p.alpha),
            onColor: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setP(i, 'color', v); },
            onAlpha: e => setP(i, 'alpha', Number(e.target.value) / 100)
          }))
        };
      })(),
      addMenuOpen: !!S.addMenu, addMenuClosed: !S.addMenu, toggleAddMenu: () => this.setState(s => ({ addMenu: !s.addMenu })),
      quickAdd: [['text', 'Tekst'], ['title', 'Tittel'], ['event', 'Arrangement'], ['qr', 'QR-kode']].map(([k, l]) => ({ label: l, onClick: () => { this.addBuilt(k, true); this.setState({ addMenu: false }); } })),
      tabCount: String(TABS.length), tabs, isProgram: curTab === 'program', isBuild: curTab === 'build', isSlides: curTab === 'slides', isStyle: curTab === 'style', isFx: curTab === 'fx', isExport: curTab === 'export',
      ...this.buildVals(),
      tplTitle: this.customName || ({ week: 'Ukeprogram-loop', sunday: 'Søndagsmøte-loop', youth: 'Ungdomsmøte-loop', blank: 'Egen loop' })[S.tpl || 'week'],
      
      programText: S.programText, onProgramText: e => this.setState({ programText: e.target.value }),
      addF: { day: '', date: '', time: '', title: '', place: '', ...(S.addForm || {}) }, addMeeting: this.addMeeting,
      addOn: ['day', 'date', 'time', 'title', 'place'].reduce((o, k) => { o[k] = e => { const v = e.target.value; this.setState(s => ({ addForm: { ...(s.addForm || {}), [k]: v } })); }; return o; }, {}),
      addKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.addMeeting(); } },
      addDays: [['', 'Utenom uka'], ['Mandag', 'Mandag'], ['Tirsdag', 'Tirsdag'], ['Onsdag', 'Onsdag'], ['Torsdag', 'Torsdag'], ['Fredag', 'Fredag'], ['Lørdag', 'Lørdag'], ['Søndag', 'Søndag']].map(([v, l]) => ({ v, l })),
      applyProgram: this.applyProgram, pickText: () => this.fileText.current && this.fileText.current.click(),
      fileRule: this.fileRule, onRuleFile: this.onRuleFile, applyRulesNow: this.applyRulesNow,
      rulesOpen: !!S.rulesOpen, rulesClosed: !S.rulesOpen,
      openRules: () => { this._rulesBak = { rules: (S.cfg.imgRules || []).map(r => ({ ...r })), bgs: S.slides.reduce((o, x) => { o[x.id] = { bg: x.bg, bgPort: x.bgPort, ruleId: x.ruleId }; return o; }, {}) }; this.setState({ rulesOpen: true, rulesDraft: (S.cfg.imgRules || []).map(r => ({ ...r })) }); },
      closeRules: () => {
        const b = this._rulesBak; this._rulesBak = null;
        this.setState(s => b ? { rulesOpen: false, rulesDraft: null, galleryFor: null, cfg: { ...s.cfg, imgRules: b.rules }, slides: s.slides.map(x => b.bgs[x.id] ? { ...x, ...b.bgs[x.id] } : x) } : { rulesOpen: false, rulesDraft: null, galleryFor: null });
      },
      saveRules: () => {
        const draft = (this.state.rulesDraft || []).map(r => ({ ...r, kw: String(r.kw || '').trim() })).filter(r => r.kw || r.bg || r.bgPort);
        const oldBgs = ((this._rulesBak && this._rulesBak.rules) || []).flatMap(r => [r.bg, r.bgPort]); this._rulesBak = null;
        this.setRules(() => draft, true);
        this.setState({ rulesOpen: false, rulesDraft: null, galleryFor: null, parseMsg: 'Faste bilder er lagret og brukt på slidene.', parseOk: true });
        oldBgs.forEach(b => b && this.gcImg(b));
      },
      ruleCount: (S.cfg.imgRules || []).filter(r => r.kw && r.bg).length + ' lagret',
      
      ruleThumbW: PT ? '40px' : '96px', galAspect: PT ? '9 / 16' : '16 / 9', galCols: PT ? 'repeat(6, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
      rulesOrientNote: PT ? 'Stående format: bildene her brukes bare når videoen er stående. Uten stående bilde brukes det liggende.' : '',
      hasRulesOrientNote: PT,
      rules: (S.rulesDraft || []).map(r => ({
        kw: r.kw, thumb: (() => { const b = PT ? r.bgPort : r.bg; return b && (S.urls[b] || !this.isStored(b)) ? this.cssUrl(S.urls[b] || b) : 'none'; })(),
        noImg: !(PT ? r.bgPort : r.bg), hasImg: !!(PT ? r.bgPort : r.bg), clearImg: () => { const F = PT ? 'bgPort' : 'bg'; this.draftRules(ds => ds.map(x => x.id === r.id ? { ...x, [F]: null } : x)); }, galleryOpen: S.galleryFor === r.id, thumbBorder: S.galleryFor === r.id ? '#e9e7e2' : '#2b2b2b',
        galleryLabel: S.galleryFor === r.id ? 'Lukk bildevalg' : ((PT ? r.bgPort : r.bg) ? (PT ? 'Bytt stående bilde' : 'Bytt bilde') : (PT ? 'Velg stående bilde' : 'Velg bilde')),
        toggleGallery: () => { if (this.canEditRules()) this.setState(s => ({ galleryFor: s.galleryFor === r.id ? null : r.id })); },
        upload: () => { this._ruleTarget = r.id; this.fileRule.current && this.fileRule.current.click(); },
        gallery: S.galleryFor !== r.id ? [] : (() => {
          const seen = new Set(), list = [];
          const add = b => { if (!b || seen.has(b)) return; if (this.isStored(b) && !S.urls[b]) return; seen.add(b); list.push(b); };
          const F = PT ? 'bgPort' : 'bg';
          S.slides.forEach(x => add(x[F])); (S.cfg.imgRules || []).forEach(x => add(x[F])); (S.rulesDraft || []).forEach(x => add(x[F]));
          return list.map(b => ({ thumb: this.cssUrl((S.urls[b] || b)), border: b === r[F] ? '#e9e7e2' : 'transparent',
            pick: () => { this.setState({ galleryFor: null }); this.draftRules(ds => ds.map(x => x.id === r.id ? { ...x, [F]: b } : x)); } }));
        })(),
        hits: (() => { const n = S.slides.filter(x => x.ruleId === r.id || (!x.ruleId && x.type === 'day' && r.kw && r.kw.trim() && String(x.title || '').toLowerCase().includes(r.kw.trim().toLowerCase()))).length; return n ? n + (n === 1 ? ' slide' : ' slides') : ''; })(),
        onKw: e => { if (!this.canEditRules()) return; const v = e.target.value; clearTimeout(this._kwT); this.draftRules(ds => ds.map(x => x.id === r.id ? { ...x, kw: v } : x), false); this._kwT = setTimeout(() => this.setRules(rs => rs, true), 900); },
        pick: () => { this._ruleTarget = r.id; this.fileRule.current && this.fileRule.current.click(); },
        del: () => {
          if (!this.canEditRules()) return;
          if ((r.bg || r.bgPort || r.kw) && !confirm(TT('Slette det faste bildet') + (r.kw ? ' «' + r.kw + '»' : '') + '?\n\n' + TT('Det fjernes fra Faste bilder i Loop Studio for hele menigheten når du trykker Ferdig. Originalbildet i Felles ressurser eller Fellesmappe blir liggende.'))) return;
          this.draftRules(ds => ds.filter(x => x.id !== r.id), false);
        },
        fromShared: () => { if (!this.canEditRules()) return; const F = PT ? 'bgPort' : 'bg'; this.pickShared('faste', ref => { this.setState({ galleryFor: null }); this.draftRules(ds => ds.map(x => x.id === r.id ? { ...x, [F]: ref } : x)); }); }
      })),
      addRule: () => { if (this.canEditRules()) this.draftRules(ds => [...ds, { id: 'r-' + Date.now().toString(36), kw: '', bg: null }], false); },
      rulesEdit: this.canEditRules(), rulesReadOnly: !this.canEditRules(),
      rulesReadOnlyNote: 'Faste bilder forvaltes av Admin i menigheten. Du kan bruke dem på slidene, men ikke endre dem.',
      isDayBg: !!sel && sel.type === 'day' && !!sel.title,
      titleImgNote: sel && sel.type === 'day' && sel.title ? (hasBg
        ? 'Huskes for «' + sel.title + '». Neste gang «' + sel.title + '» står i programmet, får den dette bildet automatisk. Bytt bilde for å endre det.'
        : 'Velg et bilde, så får «' + sel.title + '» det automatisk hver gang møtet står i programmet.') : '',
      stdOpen: !!S.stdOpen, stdClosed: !S.stdOpen, stdDraft: S.stdDraft != null ? S.stdDraft : this.standardText(),
      openStd: () => this.setState({ stdOpen: true, stdDraft: this.standardText() }),
      closeStd: () => this.setState({ stdOpen: false, stdDraft: null }),
      onStdDraft: e => this.setState({ stdDraft: e.target.value }),
      saveStdDraft: () => { const t = String(this.state.stdDraft || '').trim(); if (!t) return; this.setCfg('standard', t); this.setState({ stdOpen: false, stdDraft: null, parseMsg: 'Standarduken er oppdatert.', parseOk: true }); },
      resetStd: () => this.setState({ stdDraft: '' }),
      loadStandard: this.loadStandard, saveStandard: this.saveStandard, clearText: () => this.setState({ programText: '', parseMsg: '' }),
      pickOcr: () => this.fileOcr.current && this.fileOcr.current.click(), fileOcr: this.fileOcr, onOcrFile: this.onOcrFile,
      ocrLabel: S.busy === 'ocr' ? 'Leser …' : 'Fra bilde',
      hasParseMsg: !!S.parseMsg, parseMsg: S.parseMsg, parseColor: S.parseOk ? '#b9e08a' : '#ff8f7d',

      selTypeLabel: sel ? TYPE[sel.type] : '', selPos: sel ? 'Slide ' + (idx + 1) + ' av ' + all.length : 'Ingen slides',
      prevSlide: () => this.step(-1), nextSlide: () => this.step(1),
      isDay: !!sel && sel.type === 'day', isText: !!sel && sel.type === 'text', isContact: !!sel && sel.type === 'contact', isOutro: !!sel && sel.type === 'outro',
      qrXPct: Math.round(((sel && sel.qrX != null) ? sel.qrX : qrDef.x) * 100),
      qrYPct: Math.round(((sel && sel.qrY != null) ? sel.qrY : qrDef.y) * 100),
      qrSizeVal: (sel && sel.qrSize) || 330,
      onQrX: e => { if (!id) return; const v = Number(e.target.value) / 100; this.setState(s => ({ slides: s.slides.map(x => x.id === id ? { ...x, qrX: v, qrY: x.qrY != null ? x.qrY : qrDef.y } : x) })); },
      onQrY: e => { if (!id) return; const v = Number(e.target.value) / 100; this.setState(s => ({ slides: s.slides.map(x => x.id === id ? { ...x, qrY: v, qrX: x.qrX != null ? x.qrX : qrDef.x } : x) })); },
      onQrSize: e => id && this.setF(id, 'qrSize', Number(e.target.value)),
      resetQrPos: () => id && this.setState(s => ({ slides: s.slides.map(x => x.id === id ? { ...x, qrX: null, qrY: null, qrSize: null } : x) })),
      f, on, hasQr: !!qr, qrImgCss: qr ? this.cssUrl(qr.img) : 'none',
      hasBg, noBg: !hasBg, selBgCss: hasBg ? this.cssUrl(S.urls[this.bgOf(sel)] || this.bgOf(sel)) : 'none',
      pickImg: () => this.fileImg.current && this.fileImg.current.click(), pickSharedImg: () => { if (window.MLShare) window.MLShare.pick((b, n) => this.onImgFile({ target: { files: [new File([b], n || 'bilde.png', { type: b.type })], value: '' } }), { accept: ['image'] }); },
      ...(() => {
        const o = sel ? S.slides.find(x => x.id === id) : null, hv = !!(o && o.vid), snd = !o || o.vidSound !== false, mus = !!(o && o.vidMusic);
        const A = '#f3f1ec', AF = '#000000', N = 'transparent', NF = '#9d998f';
        const set = (k, v) => { if (id) { this.setF(id, k, v); this._pk = null; } };
        return {
          hasSlideVid: hv, noSlideVid: !hv, pickSlideVid: this.pickSlideVid, removeSlideVid: this.removeSlideVid,
          slideVidName: hv ? (o.vidName || 'Video') : '', slideVidLen: hv ? this.fmtLen(o.vidLen || 0) : '',
          vidSoundOn: () => set('vidSound', true), vidSoundOff: () => set('vidSound', false),
          vidMusicOn: () => set('vidMusic', true), vidMusicOff: () => set('vidMusic', false),
          vidSoundOnBg: snd ? A : N, vidSoundOnFg: snd ? AF : NF, vidSoundOffBg: snd ? N : A, vidSoundOffFg: snd ? NF : AF,
          vidMusicOnBg: mus ? A : N, vidMusicOnFg: mus ? AF : NF, vidMusicOffBg: mus ? N : A, vidMusicOffFg: mus ? NF : AF,
          vidSoundIsOn: hv && snd, vidVolPct: Math.round(((o && o.vidVol != null) ? o.vidVol : 1) * 100),
          onVidVol: e => set('vidVol', Number(e.target.value) / 100),
          vidAudioNote: !hv ? '' : snd && !mus ? 'Du hører lyden fra videoen. Loop-musikken tones ut mens videoen spiller.' : snd && mus ? 'Både videolyden og loop-musikken spilles samtidig.' : !snd && mus ? 'Videoen er dempet. Loop-musikken spiller videre.' : 'Stille: både videolyden og loop-musikken er dempet på denne sliden.'
        };
      })(),
      removeImg: () => { if (!id) return; const F = this.bgField(), old = sel[F]; if (sel.ruleId) { this.setState(s => ({ slides: s.slides.map(x => x.id === id ? { ...x, [F]: null, ruleId: null } : x) })); return; } this.setF(id, F, null); if (sel.type === 'day') this.rememberTitle(sel.title, null, F); this.gcImg(old); },
      ...(() => {
        const rs = (S.cfg.imgRules || []).filter(r => r.bg || r.bgPort), lr = sel && sel.ruleId ? (S.cfg.imgRules || []).find(r => r.id === sel.ruleId) : null;
        return {
          hasRuleOpts: !!sel && rs.length > 0, rulePickOpen: !!sel && !!S.rulePickOpen, rulePickBorder: S.rulePickOpen ? '#e9e7e2' : '#2b2b2b',
          rulePickLabel: S.rulePickOpen ? 'Lukk faste bilder' : lr ? 'Bytt fast bilde' : 'Velg fra faste bilder',
          toggleRulePick: () => this.setState(s => ({ rulePickOpen: !s.rulePickOpen })),
          ruleLinked: !!lr, ruleLinkedName: lr ? (lr.kw || 'Uten navn') : '',
          unlinkRule: () => this.setState(s => ({ slides: s.slides.map(x => x.id === id ? { ...x, ruleId: null } : x) })),
          rulePickList: !S.rulePickOpen || !sel ? [] : rs.map(r => { const b = (PT ? r.bgPort : r.bg) || r.bg || r.bgPort; return { name: r.kw || 'Uten navn', thumb: this.cssUrl(S.urls[b] || b), border: sel.ruleId === r.id ? '#e9e7e2' : 'transparent',
            pick: () => this.setState(s => ({ rulePickOpen: false, slides: s.slides.map(x => x.id === id ? { ...x, ruleId: r.id, bg: r.bg || x.bg, bgPort: r.bgPort || x.bgPort || null } : x) })) }; })
        };
      })(),
      bgSourceNote: sel ? this.bgSource(sel[this.bgField()] || (this.portrait() ? sel.bg : null), sel) : '',
      canRemoveBg: !!(sel && sel[this.bgField()]), removeBgLabel: PT ? 'Fjern stående bilde' : 'Fjern bilde',
      pickBgLabel: PT ? (sel && sel.bgPort ? 'Bytt stående bilde…' : 'Legg til stående bilde…') : 'Bytt bilde…',
      bgHeading: PT ? 'Bakgrunnsbilde · stående' : 'Bakgrunnsbilde', bgAspect: PT ? '9 / 16' : '16 / 9', bgBoxW: PT ? '46%' : '100%',
      portNote: PT && sel && !sel.bgPort ? (sel.bg ? 'Viser det liggende bildet, beskåret. Legg til et stående bilde for å velge utsnittet selv.' : 'Ingen stående bilde ennå.') : '', hasPortNote: !!(PT && sel && !sel.bgPort),
      bgOpacityPct: Math.round(((sel && sel.bgOpacity != null) ? sel.bgOpacity : 1) * 100),
      onBgOpacity: e => id && this.setF(id, 'bgOpacity', Number(e.target.value) / 100),
      
      ...(() => {
        const c = S.cfg, on = !!c.duotone, seg = (list, cur, fn) => list.map(([k, l]) => ({ label: l, bg: cur === k ? '#f3f1ec' : 'transparent', color: cur === k ? '#111' : '#9d998f', onClick: () => fn(k) }));
        const single = !!c.tintColor, tm = (sel && sel.tintMode) || 'auto';
        const SWS = ['#1f6f86', '#b4553a', '#1e3566', '#8fe3cf', '#b89cff', '#ff6b8b', '#f5b82c', '#000000'];
        const ov = (orig && orig.ov) || {};
        const setOv = (k, v) => { if (!id) return; this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const o = { ...(x.ov || {}) }; if (v == null) delete o[k]; else o[k] = v; return { ...x, ov: Object.keys(o).length ? o : null }; }) })); this.testSlide(id); };
        const D = '— Som standard';
        const rows = [
          ['transFx', 'Overgang inn', [['fade', 'Toning'], ['dip', 'Via svart'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['glitch', 'Glitch'], ['panels', 'Paneler'], ['cut', 'Kutt']]],
          ['textFx', 'Teksteffekt', [['reveal', 'Avdekk'], ['fade', 'Ton inn'], ['slide', 'Gli inn'], ['blur', 'Uskarp'], ['pop', 'Sprett'], ['glitch', 'Glitch'], ['none', 'Ingen']]],
          ['overlayFx', 'Overlegg', [['none', 'Ingen'], ['grain', 'Filmkorn'], ['leak', 'Lyslekkasje'], ['bokeh', 'Bokeh'], ['snow', 'Snø'], ['newyear', 'Konfetti'], ['lines', 'Linjer']]],
          ['style', 'Fargepaneler bak', [['promo', 'På'], ['plain', 'Av']]],
          ['kickerStyle', 'Etikett', [['box', 'Boks'], ['plain', 'Vanlig']]],
          ['kenBurns', 'Ken Burns-zoom', [['on', 'På'], ['off', 'Av']]],
          ['sweep', 'Lysstripe', [['on', 'På'], ['off', 'Av']]]
        ];
        const toStore = (k, v) => v === '' ? null : (k === 'kenBurns' || k === 'sweep') ? v === 'on' : v;
        const toVal = (k, v) => v == null ? '' : (k === 'kenBurns' || k === 'sweep') ? (v ? 'on' : 'off') : v;
        return {
          tintOn: on, tintAria: on ? 'true' : 'false', tintTrack: on ? '#e9e7e2' : '#2b2b2b', tintKnob: on ? '#000' : '#8a867e', tintKnobX: on ? '19px' : '3px',
          tintToggle: () => this.setCfg('duotone', !on),
          tintSingle: single, tintColor: c.tintColor || '#1f6f86',
          tintSrcOpts: seg([['rot', 'Fra fargepanelene'], ['one', 'Én farge']], single ? 'one' : 'rot', k => this.setCfg('tintColor', k === 'one' ? (c.tintColor || '#1f6f86') : null)),
          onTintColor: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) this.setCfg('tintColor', v); },
          tintSwatches: SWS.map(h => ({ hex: h, ring: (c.tintColor || '').toLowerCase() === h ? '#ffffff' : 'transparent', onClick: () => this.setCfg('tintColor', h) })),
          tintBlendOpts: seg([['color', 'Farge'], ['soft', 'Myk'], ['overlay', 'Kontrast'], ['multiply', 'Mørk'], ['screen', 'Lys']], c.tintBlend || 'color', k => this.setCfg('tintBlend', k)),
          tintAmtPct: Math.round((c.tintAmt == null ? 0.85 : c.tintAmt) * 100), onTintAmt: e => this.setCfg('tintAmt', Number(e.target.value) / 100),
          selTintOpts: seg([['auto', 'Som standard'], ['custom', 'Egen farge'], ['off', 'Av']], tm, k => id && this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, tintMode: k, tint: k === 'custom' ? (x.tint || c.tintColor || '#1f6f86') : x.tint } : x) }))),
          selTintCustom: tm === 'custom', selTint: (sel && sel.tint) || '#1f6f86',
          onSelTint: e => { const v = e.target.value; if (id && /^#[0-9a-f]{6}$/i.test(v)) this.setF(id, 'tint', v); },
          selTintAmtPct: Math.round(((sel && sel.tintAmt != null) ? sel.tintAmt : (c.tintAmt == null ? 0.85 : c.tintAmt)) * 100),
          onSelTintAmt: e => id && this.setF(id, 'tintAmt', Number(e.target.value) / 100),
          selTintNote: tm === 'auto' ? (on ? 'Følger fargefilteret under Effekter.' : 'Fargefilteret er av under Effekter.') : tm === 'off' ? 'Ingen fargefilter på denne sliden.' : 'Egen farge bare på denne sliden.',
          ...(() => {
            const DEF = [['#1f6f86', 1], ['#b4553a', 1], ['#1e3566', 0.9], ['#2a8f8a', 1], ['#1f6f86', 0.6]].map(([color, alpha]) => ({ color, alpha }));
            const g = Array.isArray(c.panels) && c.panels.length === 5 ? c.panels : DEF;
            const own = orig && Array.isArray(orig.panels) && orig.panels.length === 5 ? orig.panels : null;
            const cur = own || g, active = ov.style === 'promo' || (!ov.style && c.style === 'promo');
            const open = active && S.panelEditFor === id;
            const setP = (i, k, v) => id && this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const base = Array.isArray(x.panels) && x.panels.length === 5 ? x.panels : g; return { ...x, panels: base.map((p, j) => j === i ? { ...p, [k]: v } : p) }; }) }));
            const bg = (orig && orig.panelBg) || c.panelBg || '#070b14';
            return {
              selPanelsActive: active, panelEditOpen: open, panelEditArrow: open ? '▲' : '▼', panelEditBorder: open ? '#8a867e' : '#2b2b2b',
              togglePanelEdit: () => this.setState(st => ({ panelEditFor: st.panelEditFor === id ? null : id })),
              selPanelDots: [{ color: bg, op: 1 }, ...cur.map(p => ({ color: p.color, op: Math.max(0.25, p.alpha == null ? 1 : p.alpha) }))],
              selPanelBg: bg, onSelPanelBg: e => { const v = e.target.value; if (id && /^#[0-9a-f]{6}$/i.test(v)) this.setF(id, 'panelBg', v); },
              selPanelRows: cur.map((p, i) => ({ label: 'Panel ' + (i + 1), color: p.color, alphaPct: Math.round((p.alpha == null ? 1 : p.alpha) * 100), swatchOpacity: Math.max(0.25, p.alpha == null ? 1 : p.alpha),
                onColor: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setP(i, 'color', v); }, onAlpha: e => setP(i, 'alpha', Number(e.target.value) / 100) })),
              selPanelCustom: !!own || !!(orig && orig.panelBg),
              selPanelNote: own || (orig && orig.panelBg) ? 'Egne farger bare på denne sliden.' : 'Viser standardfargene fra Effekter. Endrer du her, gjelder det bare denne sliden.',
              selPanelReset: () => id && this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, panels: null, panelBg: null } : x) }))
            };
          })(),
          ...(() => {
            const ac = /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : '#e9e7e2', t = orig ? orig.type : 'text', tcol = (orig && orig.tcol) || {};
            const D = { day: ac, time: ac, place: '#e0e0e0', title: '#ffffff', kicker: ac, pill: ac, body: '#ffffff', sub: t === 'outro' ? ac : '#e0e0e0', headline: '#ffffff', text: '#e0e0e0', email: ac, phone: '#e0e0e0' };
            const tc = {}, tcOn = {}, tcSet = {}, tcReset = {};
            const setT = (k, v) => id && this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const o = { ...(x.tcol || {}) }; if (v == null) delete o[k]; else o[k] = v; return { ...x, tcol: Object.keys(o).length ? o : null }; }) }));
            D.date = D.day;
            Object.keys(D).forEach(k => { tc[k] = tcol[k] || D[k]; tcSet[k] = !!tcol[k]; tcOn[k] = e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setT(k, v); }; tcReset[k] = () => setT(k, null); });
            const dLink = !(orig && orig.dateLink === false);
            if (dLink) { tc.date = tc.day; tcOn.date = tcOn.day; tcSet.date = tcSet.day; tcReset.date = tcReset.day; } else tc.date = tcol.date || tc.day;
            const dateLinked = dLink, toggleDateLink = () => id && this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== id) return x; const lk = x.dateLink === false; const o = { ...(x.tcol || {}) }; if (lk) delete o.date; else if (o.day) o.date = o.day; return { ...x, dateLink: lk ? true : false, tcol: o }; }) }));
            return { tc, tcOn, tcSet, tcReset, dateLinked, dateLinkTitle: dLink ? 'Farge koblet til ukedag – trykk for å gi datoen egen farge' : 'Egen farge for dato – trykk for å koble til ukedag', dateLinkColor: dLink ? '#f3f1ec' : '#6f6b64', dateLinkBg: dLink ? '#262626' : 'transparent', toggleDateLink,
              selPanelRandom: () => { if (!id) return; const r = this.randPanels(); this.setState(st => ({ slides: st.slides.map(x => x.id === id ? { ...x, panels: r.panels, panelBg: r.bg } : x) })); } };
          })(),
          selPanelOpts: [['', 'Standard'], ['promo', 'På'], ['plain', 'Av']].map(([k, l]) => { const cur = ov.style || ''; return { label: l, bg: cur === k ? '#f3f1ec' : 'transparent', color: cur === k ? '#111' : '#9d998f', onClick: () => setOv('style', k || null) }; }),
          selOvAny: Object.keys(ov).length > 0,
          slideStyleOpen: !!S.slideStyleOpen, slideStyleAria: S.slideStyleOpen ? 'true' : 'false', slideStyleArrow: S.slideStyleOpen ? '▲' : '▼',
          slideStyleSummary: (() => { const n = Object.keys(ov).length + ((orig && (orig.panels || orig.panelBg)) ? 1 : 0); return n ? n + (n === 1 ? ' egen innstilling' : ' egne innstillinger') : 'Følger standard'; })(),
          toggleSlideStyle: () => this.setState(st => ({ slideStyleOpen: !st.slideStyleOpen })),
          selOvReset: () => id && this.setF(id, 'ov', null),
          selOvRows: rows.map(([k, l, opts]) => {
            const val = toVal(k, ov[k]);
            return { label: l, value: val, labelColor: val ? '#f3f1ec' : '#9d998f', border: val ? '#8a867e' : '#2b2b2b',
              options: [{ v: '', l: D }, ...opts.map(([v, t]) => ({ v, l: t }))],
              onChange: e => setOv(k, toStore(k, e.target.value)) };
          })
        };
      })(),
      selVigOn: !!sel && !sel.vigOff, onSelVig: e => id && this.setF(id, 'vigOff', !e.target.checked),
      vigCtlOpacity: sel && !sel.vigOff && S.cfg.vigOn !== false ? 1 : 0.4, vigAllOp: S.cfg.vigOn !== false ? 1 : 0.4,
      vigOnAll: S.cfg.vigOn !== false, onVigAll: e => this.setCfg('vigOn', e.target.checked),
      
      
      vigRot: Math.round(Number(sel && sel.vigRot) || 0),
      
      canvasCursor: S.eyedrop ? 'crosshair' : 'default',
      
      selDur: sel ? Math.min(15, sel.dur) : 5, selDurLocked: !!(sel && sel.vid), selDurOp: sel && sel.vid ? 0.35 : 1,
      selDurLabel: !sel ? '' : sel.vid ? this.fmtLen(sel.dur) + ' (følger videoen)' : (Math.round(sel.dur * 10) / 10 + ' s' + (customDur ? '' : ' (standard)')),
      onSelDur: e => id && this.setF(id, 'dur', Number(e.target.value)),
      selVisible: !!sel && !sel.hidden, onVisible: e => id && this.setF(id, 'hidden', !e.target.checked),
      moveEarlier: () => id && this.move(id, -1), moveLater: () => id && this.move(id, 1),
      duplicate: () => id && this.duplicate(id), del: () => id && this.del(id),
      addText: () => this.add('text'), addContact: () => this.add('contact'), addOutro: () => this.add('outro'),

      videoLabel: S.videoName || (this.defVideo() ? 'Standardvideo for ungdom' : 'Ingen video valgt'), hasVideo: !!S.videoName || !!this.defVideo(),
      pickVideo: () => this.fileVideo.current && this.fileVideo.current.click(), removeVideo: this.removeVideo,
      cfgHeader: S.cfg.header, onHeader: e => this.setCfg('header', e.target.value),
      cfgTopLabel: S.cfg.topLabel, onTopLabel: e => this.setCfg('topLabel', e.target.value),
      swatches: ['#f5b82c', '#ff7a45', '#5cc8ff', '#8fdc6a', '#ffffff'].map(c => ({ color: c, ring: S.cfg.accent === c ? '0 0 0 2px #161616, 0 0 0 4px #f3f1ec' : 'inset 0 0 0 1px rgba(255,255,255,0.15)', onClick: () => this.setCfg('accent', c) })),
      overlayPct: Math.round(S.cfg.overlay * 100), onOverlay: e => this.setCfg('overlay', Number(e.target.value) / 100),
      defDur: S.cfg.defDur, onDefDur: e => this.setCfg('defDur', Number(e.target.value)),
      rail: S.cfg.rail !== false, onRail: e => this.setCfg('rail', e.target.checked),
      canvasAspect: PT ? '9 / 16' : '16 / 9', dimLabel: DM.W + '×' + DM.H,
      orientOptions: [['land', 'Liggende', '16px', '10px'], ['port', 'Stående', '10px', '16px']].map(([k, l, iw, ih]) => { const on = (S.cfg.orient || 'land') === k; return { label: l, iw, ih, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setOrient(k) }; }),
      resOptions: [['1080', '1080p'], ['4k', '4K']].map(([k, l]) => ({ label: l, bg: S.cfg.res === k ? '#f3f1ec' : 'transparent', color: S.cfg.res === k ? '#111' : '#9d998f', onClick: () => this.setCfg('res', k) })),

      kickerLineOpts: [[false, 'Ingen'], [true, 'Foran'], ['mid', 'Foran og mellom'], ['both', 'Foran, mellom og etter']].map(([k, l]) => { const cur = S.cfg.kickerLine === false ? false : S.cfg.kickerLine === 'both' || S.cfg.kickerLine === 'mid' ? S.cfg.kickerLine : true, on = cur === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg('kickerLine', k) }; }),
      exportAudio: S.cfg.exportAudio !== false, onExportAudio: e => this.setCfg('exportAudio', e.target.checked),
      exportAudioNote: S.cfg.exportAudio !== false ? 'Lydsporet blir med i både HTML-spilleren og videofilen.' : 'Eksporteres uten lyd. Effektene følger fortsatt takten i sangen.',
      exportSummary: active.length + ' slides i loopen · ' + loopLen + ' per runde · ' + this.fmtLabel() + (S.cfg.audioMode === 'beat' && this.beat() ? ' · synket til ' + Math.round(this.beat().bpm) + ' BPM' : ''),
      loopLen, htmlLabel: S.busy === 'html' ? 'Pakker filen …' : 'Last ned HTML-spiller', exportHTML: this.exportHTML,
      recording: !!S.rec, notRecording: !S.rec, recPct: S.rec ? S.rec.pct : 0, recWidth: (S.rec ? S.rec.pct : 0) + '%',
      startRec: this.startRec, cancelRec: () => this.stopRec(true),
      recNote: (recMime === null ? 'Opptak krever Chrome eller Edge.' : recMime.includes('mp4') ? 'Lagres som MP4.' : 'Lagres som WebM. Gjør den om til MP4 hvis sendeprogrammet ikke spiller WebM.') + (S.audioName && S.cfg.exportAudio !== false ? ' Lydsporet «' + S.audioName + '» blir med.' : ''),
      htmlNote: [S.audioName && S.cfg.exportAudio !== false ? 'Lydsporet blir med. Sjekk at lyden fra kilden er slått på i sendeprogrammet.' : '', S.slides.some(x => x.vid && !x.hidden) ? 'Videoer på slidene blir ikke med i HTML-spilleren (bakgrunnsbildet vises i stedet). Bruk MP4-eksport for å få dem med.' : ''].filter(Boolean).join(' '),

      statusLine: S.rec ? 'Tar opp video … ' + S.rec.pct + ' %' : !active.length ? 'Ingen slides ennå – skriv ukens program, eller trykk «Legg til».' : live ? 'Spiller slide ' + (S.playIdx + 1) + ' av ' + active.length + ' · ' + loopLen + ' per runde · ' + this.fmtLabel() : S.tst ? 'Tester effekten på slide ' + (idx + 1) + ' · ' + this.fmtLabel() : (sel ? 'Pause · viser slide ' + (idx + 1) + (activeIdx < 0 ? ' (skjult i loopen)' : '') : 'Pause'),
      onCanvasDown: this.onCanvasDown, onCanvasMove: this.onCanvasMove, onCanvasDbl: this.onCanvasDbl,
      hasInline: !!S.inlineEd, inlineRef: this.inlineRef, inlineVal: S.inlineEd ? S.inlineEd.value : '',
      inlineL: S.inlineEd ? S.inlineEd.left + 'px' : '0px', inlineT: S.inlineEd ? S.inlineEd.top + 'px' : '0px', inlineW: S.inlineEd ? S.inlineEd.width + 'px' : '0px',
      inlineH: S.inlineEd ? S.inlineEd.height + 'px' : '0px', inlineFs: S.inlineEd ? S.inlineEd.fs + 'px' : '16px', inlineHintT: S.inlineEd ? (S.inlineEd.top + S.inlineEd.height + 6) + 'px' : '0px',
      onInlineChange: e => { const v = e.target.value; this.setState(st => st.inlineEd ? { inlineEd: { ...st.inlineEd, value: v } } : null); },
      inlineHint: S.inlineEd && S.inlineEd.multi ? 'Enter lagrer · Shift+Enter ny linje · Esc avbryter' : 'Enter lagrer · Esc avbryter',
      onInlineKey: e => {
        if (e.key === 'Escape') { e.preventDefault(); this._inlineCancel = true; this.setState({ inlineEd: null }); return; }
        if (e.key !== 'Enter') return;
        const ed = this.state.inlineEd;
        if (e.shiftKey && ed && ed.multi) {
          e.preventDefault();
          const t = e.target, a = t.selectionStart, b = t.selectionEnd, v = t.value.slice(0, a) + '\n' + t.value.slice(b);
          this.setState(st => st.inlineEd ? { inlineEd: { ...st.inlineEd, value: v, height: Math.max(st.inlineEd.height, (v.split('\n').length) * st.inlineEd.fs * 1.25 + 16) } } : null, () => { const el = this.inlineRef.current; if (el) { el.selectionStart = el.selectionEnd = a + 1; } });
          return;
        }
        e.preventDefault(); this.commitInline();
      },
      onInlineCommit: e => {
        if (this._inlineCancel) { this._inlineCancel = false; return; }
        /* blur caused by our own re-render/layout (no new focus target, just opened): keep editing */
        const t = e && e.target, early = performance.now() - (this._inlineAt || 0) < 900;
        if (!e || !e.relatedTarget) {
          if (early) { requestAnimationFrame(() => { const el = this.inlineRef.current; if (el && this.state.inlineEd) el.focus({ preventScroll: true }); }); return; }
          setTimeout(() => { if (!this.state.inlineEd) return; const el = this.inlineRef.current, a = document.activeElement; if (el && a === el) return; if (a === document.body && document.hasFocus() === false) return; this.commitInline(); }, 0);
          return;
        }
        this.commitInline();
      },
      fileLogo: this.fileLogo, onLogoFile: this.onLogoFile, pickLogo: () => this.fileLogo.current && this.fileLogo.current.click(),
      hasLogo: !!S.cfg.logoSrc, noLogo: !S.cfg.logoSrc,
      logoPreviewCss: S.cfg.logoSrc && (S.urls[S.cfg.logoSrc] || !this.isStored(S.cfg.logoSrc)) ? this.cssUrl((S.urls[S.cfg.logoSrc] || S.cfg.logoSrc)) : 'none',
      logoOn: S.cfg.logoOn !== false, onLogoOn: e => this.setCfg('logoOn', e.target.checked),
      removeLogo: () => this.setCfg('logoSrc', null),
      pickLogoShared: () => this.pickShared('ressurser', ref => this.setState(s => ({ cfg: { ...s.cfg, logoSrc: ref, logoOn: true } }))),
      pickBgShared: () => this.pickShared('faste', ref => this.setSlideBg(ref)),
      sharedNote: !this.sharedOn() ? '' : this.state.sharedExists ? 'Grunnoppsettet (farger, tekst, logo, effekter og Faste bilder) er felles for hele menigheten.' : 'Menigheten har ikke et felles grunnoppsett for denne malen ennå. Første endring du gjør, blir menighetens felles grunnoppsett.',
      logoSize: S.cfg.logoSize || 90, onLogoSize: e => this.setCfg('logoSize', Number(e.target.value)),
      logoOpacityPct: Math.round((S.cfg.logoOpacity == null ? 1 : S.cfg.logoOpacity) * 100), onLogoOpacity: e => this.setCfg('logoOpacity', Number(e.target.value) / 100),
      logoCorners: [['↖', 0.07, 0.15], ['↗', 0.93, 0.15], ['↙', 0.07, 0.85], ['↘', 0.93, 0.85]].map(([l, x, y]) => ({ label: l, onClick: () => {
        const lr = this.media.lastLogoRect, { W, H } = this.dims(), m = 95 * (Math.min(W, H) / 1080);
        const hw = lr ? lr.w / 2 : 60, hh = lr ? lr.h / 2 : 45;
        const nx = x < 0.5 ? (m + hw) / W : (W - m - hw) / W, ny = y < 0.5 ? (m + 110 * (Math.min(W, H) / 1080) + hh) / H : (H - m - hh) / H;
        this.setState(s => ({ cfg: { ...s.cfg, logoX: Math.round(nx * 1000) / 1000, logoY: Math.round(ny * 1000) / 1000 } }));
      } })),
      ...(() => {
        const H = DM.H, W = DM.W, M = 95 * DU;
        const hx = S.cfg.headerX == null ? M / W : S.cfg.headerX, hy = S.cfg.headerY == null ? M / H : S.cfg.headerY;
        const tx = S.cfg.topLabelX == null ? (W - M + 8 * DU) / W : S.cfg.topLabelX, ty = S.cfg.topLabelY == null ? (M + 7 * DU) / H : S.cfg.topLabelY;
        return {
          headerXPct: Math.round(hx * 100), headerYPct: Math.round(hy * 100), topXPct: Math.round(tx * 100), topYPct: Math.round(ty * 100),
          onHeaderX: e => this.setCfg('headerX', Number(e.target.value) / 100), onHeaderY: e => this.setCfg('headerY', Number(e.target.value) / 100),
          onTopX: e => this.setCfg('topLabelX', Number(e.target.value) / 100), onTopY: e => this.setCfg('topLabelY', Number(e.target.value) / 100),
          resetHeaderPos: () => this.setState(s => ({ cfg: { ...s.cfg, headerX: null, headerY: null } })),
          resetTopPos: () => this.setState(s => ({ cfg: { ...s.cfg, topLabelX: null, topLabelY: null } }))
        };
      })(),
      logoXPct: Math.round((S.cfg.logoX != null ? S.cfg.logoX : this.media.lastLogoRect ? (this.media.lastLogoRect.x + this.media.lastLogoRect.w / 2) / DM.W : 0.93) * 100), logoYPct: Math.round((S.cfg.logoY != null ? S.cfg.logoY : this.media.lastLogoRect ? (this.media.lastLogoRect.y + this.media.lastLogoRect.h / 2) / DM.H : 0.85) * 100),
      onLogoX: e => this.setCfg('logoX', Number(e.target.value) / 100), onLogoY: e => this.setCfg('logoY', Number(e.target.value) / 100),
      selShowLogo: !!sel && !sel.noLogo, onSelShowLogo: e => id && this.setF(id, 'noLogo', !e.target.checked),
      hasAudio: !!S.audioName, audioLabel: S.audioName || 'Ingen lyd valgt',
      pickAudio: () => this.fileAudio.current && this.fileAudio.current.click(), fileAudio: this.fileAudio,
      onAudioFile: this.onAudioFile, removeAudio: this.removeAudio,
      fileLib: this.fileLib, onLibFiles: this.onLibFiles, pickLib: () => this.fileLib.current && this.fileLib.current.click(),
      hasLib: !!(S.audioLib || []).length, noLib: !(S.audioLib || []).length,
      audioLib: (S.audioLib || []).map(t => { const on = t.name === S.audioName, d = t.dur > 0 ? Math.floor(t.dur / 60) + ':' + String(Math.floor(t.dur % 60)).padStart(2, '0') : ''; return { name: t.name, dur: d, bg: on ? '#161616' : 'transparent', bd: on ? '#e9e7e2' : '#2b2b2b', dot: on ? '#e9e7e2' : '#3a3a3a', use: () => this.libUse(t.id), del: () => this.libDel(t.id) }; }),
      audioVolPct: Math.round((S.cfg.audioVol == null ? 0.8 : S.cfg.audioVol) * 100), onAudioVol: e => {
        const v = Math.max(0, Math.min(1, Number(e.target.value) / 100)); this._volLive = v;
        const lab = e.target.parentElement && e.target.parentElement.querySelector('[data-vol-pct]'); if (lab) lab.textContent = Math.round(v * 100) + ' %';
        clearTimeout(this._volT); this._volT = setTimeout(() => { this.setCfg('audioVol', v); this._volLive = null; }, 300);
      },
      ...(() => {
        const o = this.audioOpts(), dur = S.audioDur || 0, fmt = x => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0');
        const modes = [['cut', 'Klipp til loopen'], ['fit', 'Tilpass loopen'], ['beat', 'Følg takten'], ['free', 'Spill fritt']];
        const desc = {
          cut: 'Sangen starter på nytt hver gang loopen begynner, med myk inn- og uttoning. Lyd og bilde holder alltid følge.',
          fit: 'Slidene gjøres lengre eller kortere, så én runde varer like lenge som sangen. Best for spor som er laget for å loope.',
          beat: 'Tempoet finnes automatisk. Hver slide varer et helt antall takter, så skiftene kommer på første slag, og tekst og bilde beveger seg i rytmen. Sangen starter på nytt når loopen begynner.',
          free: 'Sangen går i sin egen loop uten opphold, uavhengig av slidene. Lyd og bilde følger ikke hverandre.'
        };
        const sum = active.reduce((a, s) => a + s.dur, 0);
        return {
          audioModes: modes.map(([k, l]) => ({ label: l, bg: o.mode === k ? '#f3f1ec' : 'transparent', color: o.mode === k ? '#111' : '#9d998f', onClick: () => this.setAudioMode(k) })),
          audioModeDesc: desc[o.mode],
          audioIsFit: o.mode === 'fit', audioNotFree: o.mode !== 'free',
          audioDurLabel: dur ? 'Sangen er ' + fmt(dur) + ((o.mode === 'cut' || o.mode === 'beat') && sum ? ' · loopen er ' + fmt(sum) + (dur - o.offset < sum ? ' – musikken slutter før loopen' : '') : '') : '',
          audioFitNote: o.mode === 'fit' && dur && active.length ? 'Loopen blir ' + fmt(sum) + ', ca. ' + (Math.round(sum / active.length * 10) / 10) + ' s per slide.' : '',
          audioMax: Math.max(0, Math.floor(dur - 3)), audioOffset: S.cfg.audioOffset || 0, audioOffsetLabel: fmt(o.offset),
          onAudioOffset: e => this.setCfg('audioOffset', Number(e.target.value)),
          fadeInVal: o.fadeIn, fadeOutVal: o.fadeOut,
          fadeInLabel: (Math.round(o.fadeIn * 10) / 10) + ' s', fadeOutLabel: (Math.round(o.fadeOut * 10) / 10) + ' s',
          onFadeIn: e => this.setCfg('audioFadeIn', Number(e.target.value)), onFadeOut: e => this.setCfg('audioFadeOut', Number(e.target.value))
        };
      })(),
      ...(() => {
        const c = S.cfg, bt = this.beat(), isBeat = c.audioMode === 'beat' && !!S.audioName, bText = isBeat && c.beatText !== false;
        const seg = (key, def, list) => list.map(([k, l]) => { const on = (c[key] || def) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg(key, k) }; });
        const SW = ['#f5b82c', '#ff7a45', '#5cc8ff', '#8fdc6a', '#ffffff'], setBpm = v => this.setCfg('bpm', Math.max(40, Math.min(240, Math.round(v * 100) / 100)));
        return {
          transOpts: seg('transFx', 'fade', [['fade', 'Toning'], ['dip', 'Via svart'], ['slide', 'Skyv'], ['zoom', 'Zoom'], ['glitch', 'Glitch'], ['panels', 'Paneler'], ['cut', 'Kutt']]),
          textOpts: seg('textFx', 'reveal', [['reveal', 'Avdekk'], ['fade', 'Ton inn'], ['slide', 'Gli inn'], ['blur', 'Uskarp'], ['pop', 'Sprett'], ['glitch', 'Glitch'], ['none', 'Ingen']]),
          
          overlaySync: c.overlaySync !== false,
          
          fxSpeedPct: Math.round((c.fxSpeed || 1) * 100), onFxSpeed: e => this.setCfg('fxSpeed', Number(e.target.value) / 100),
          speedFree: !bText, speedByBeat: bText,
          kenBurns: c.kenBurns !== false, onKenBurns: e => this.setCfg('kenBurns', e.target.checked),
          sweep: c.sweep !== false, onSweep: e => this.setCfg('sweep', e.target.checked),
          beatLive: isBeat, beatOff: !isBeat,
          beatBadge: isBeat ? (bt ? Math.round(bt.bpm) + ' BPM' : 'Analyserer …') : 'Av',
          beatFxDesc: isBeat ? 'Loopen er klippet etter musikken. Skifter, bildeutsnitt og tekst kommer på slagene.' : (S.audioName ? 'La skifter, tekst og bildebevegelse følge takten i lydsporet. Blir med i både HTML-spilleren og videofilen.' : 'Last opp et lydspor under «Video og stil», så kan effektene følge takten.'),
          enableBeat: () => { if (S.audioName) this.setAudioMode('beat'); else this.setState({ tab: 'style' }); },
          disableBeat: () => this.setAudioMode('cut'),
          enableBeatLabel: S.audioName ? 'Slå på takt-synk' : 'Gå til lydspor',
          beatPulsePct: Math.round((c.beatPulse == null ? 0.6 : c.beatPulse) * 100), onBeatPulse: e => this.setCfg('beatPulse', Number(e.target.value) / 100),
          ...(() => {
            const FX = [['step', 'Trinnvis zoom', 'bildet glir et lite hakk nærmere'], ['vig', 'Vignett-puls', 'kantene av bildet mørkner litt']];
            const cur = (Array.isArray(c.beatExtras) ? c.beatExtras : []).filter(k => FX.some(f => f[0] === k));
            const tog = k => this.setCfg('beatExtras', cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
            const ev = c.beatEvery >= 4 ? c.beatEvery : 8;
            return {
              beatFxOpts: FX.map(([k, l, d]) => { const on = cur.includes(k); return { label: l, hint: d, bg: on ? '#f5b82c' : 'transparent', color: on ? '#171206' : '#b3afa6', border: on ? '#f5b82c' : '#2b2b2b', onClick: () => tog(k) }; }),
              beatFxHint: cur.length ? ({ 4: 'På hver takt', 8: 'Annenhver takt', 16: 'Hver 4. takt' }[ev] || 'Annenhver takt') + ', på første slag: ' + FX.filter(f => cur.includes(f[0])).map(f => f[2]).join(' og ') + '.' : 'Ingen ekstra effekter valgt. Loopen følger fortsatt takten gjennom skifter, utsnitt og tekst.',
              hasExtras: cur.length > 0,
              genreOpts: Object.entries(this.genres()).map(([k, g]) => ({ value: k, label: g.label })),
              genreVal: c.genre || 'auto', onGenre: e => this.applyGenre(e.target.value),
              genreDesc: (() => {
                const GG = this.genres(), g = c.genre || 'auto', bi = S.beatInfo;
                if (g !== 'auto') return (GG[g] || {}).desc + ' Finjuster under «Effekter».' + (S.audioName ? '' : ' Last opp et lydspor, så følger effektene takten.');
                if (!S.audioName) return 'Last opp et lydspor, så analyseres sangen og effektene velges automatisk.';
                if (!bi) return 'Analyserer sangen …';
                if (!bi.genre) return 'Fant ingen tydelig takt i sangen. Velg en sjanger i listen.';
                const rh = bi.clarity >= 1.6 ? 'tydelig rytme' : bi.clarity >= 1.3 ? 'middels tydelig rytme' : 'svak rytme';
                return 'Analysert: høres ut som ' + GG[bi.genre].label.toLowerCase() + ' (' + Math.round(bi.bpm) + ' BPM, ' + rh + (bi.kick >= 0.45 ? ', mye tromme' : '') + '). ' + GG[bi.genre].desc;
              })(),
              genreReapply: (c.genre || 'auto') === 'auto' && !!(S.beatInfo && S.beatInfo.genre), onGenreReapply: () => this.applyGenre('auto'),
              
              beatPolish: c.beatPolish !== false, onBeatPolish: e => this.setCfg('beatPolish', e.target.checked),
              beatLevelOpts: [[0.6, 'Rolig'], [1, 'Middels'], [1.6, 'Tydelig']].map(([k, l]) => { const on = (c.beatLevel || 1) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg('beatLevel', k) }; }),
              beatReframe: c.beatReframe !== false, onBeatReframe: e => this.setCfg('beatReframe', e.target.checked),
              beatBarsOpts: [[0, 'Som satt'], [2, '2 takter'], [4, '4 takter'], [8, '8 takter']].map(([k, l]) => { const on = (c.beatBars || 0) === k; return { label: l, bg: on ? '#f3f1ec' : 'transparent', color: on ? '#111' : '#9d998f', onClick: () => this.setCfg('beatBars', k) }; }),
              beatEveryOpts: [[4, 'Hver takt'], [8, 'Annenhver takt'], [16, 'Hver 4. takt']].map(([k, l]) => ({ label: l, bg: ev === k ? '#f3f1ec' : 'transparent', color: ev === k ? '#111' : '#9d998f', onClick: () => this.setCfg('beatEvery', k) }))
            };
          })(),
          beatText: c.beatText !== false, onBeatText: e => this.setCfg('beatText', e.target.checked),
          audioIsBeat: c.audioMode === 'beat',
          bpmLabel: bt ? String(Math.round(bt.bpm * 10) / 10).replace('.', ',') + ' BPM' : 'Analyserer takten …',
          bpmSub: bt ? (c.bpm ? 'Justert for hånd' : (S.beatInfo && S.beatInfo.guess ? 'Fant ingen tydelig takt, juster for hånd' : 'Funnet automatisk')) + ' · 1 takt = ' + (4 * bt.p).toFixed(2).replace('.', ',') + ' s' : '',
          bpmMinus: () => bt && setBpm(Math.round(bt.bpm) - 1), bpmPlus: () => bt && setBpm(Math.round(bt.bpm) + 1),
          bpmHalf: () => bt && setBpm(bt.bpm / 2), bpmDouble: () => bt && setBpm(bt.bpm * 2), bpmAuto: () => this.setCfg('bpm', null),
          beatNudge: c.beatNudge || 0, beatNudgeLabel: (c.beatNudge > 0 ? '+' : '') + (c.beatNudge || 0) + ' ms', onBeatNudge: e => this.setCfg('beatNudge', Number(e.target.value)),
          fontOpts: ['Archivo', 'Montserrat', 'Oswald', 'Playfair Display', 'Helvetica'].map(f => ({ value: f, label: f })), fontVal: c.font || 'Archivo', onFont: e => this.setFont(e.target.value),
          titleScalePct: Math.round((c.titleScale || 1) * 100), onTitleScale: e => this.setCfg('titleScale', Number(e.target.value) / 100),
          textScalePct: Math.round((c.textScale || 1) * 100), onTextScale: e => this.setCfg('textScale', Number(e.target.value) / 100),
          titleSz: this.numF('loop.titleScale', c.titleScale || 1, this.SCALE_U, v => this.setCfg('titleScale', Math.round(v * 100) / 100), [0.5, 3]),
          textSz: this.numF('loop.textScale', c.textScale || 1, this.SCALE_U, v => this.setCfg('textScale', Math.round(v * 100) / 100), [0.5, 3]),
          accentVal: c.accent, onAccentPick: e => this.setCfg('accent', e.target.value),
          accentCustomRing: SW.includes(c.accent) ? 'inset 0 0 0 1px rgba(255,255,255,0.15)' : '0 0 0 2px #161616, 0 0 0 4px #f3f1ec'
        };
      })(),
      fastIdle: !S.fast, fastBusy: !!S.fast, fastWidth: (S.fast ? S.fast.pct : 0) + '%', fastLabel: S.fast ? S.fast.phase : '',
      fast4k: () => this.fastExport(true), fast1080: () => this.fastExport(false), fastCancel: () => { this._fastAbort = true; },
      fastUnsupported: !fastOk, fastBtnOp: fastOk ? 1 : 0.4,
      hasFastNote: !fastOk || !!S.fastMsg, fastNote: !fastOk ? 'Krever Chrome, Edge eller Safari 17+.' : S.fastMsg, fastNoteColor: /galt/.test(S.fastMsg || '') ? '#ff8f7d' : '#9d998f',
      guideRef: this.guideRef, zoomOuter: this.zoomOuter,
      zoomTf: S.zoom && !S.fs ? 'translate(' + S.zoom.x.toFixed(1) + 'px, ' + S.zoom.y.toFixed(1) + 'px) scale(' + S.zoom.z + ')' : 'none',
      zoomed: !!S.zoom && !S.fs,
      zoomFitBgV: S.zoom ? '#f3f1ec' : '#121212', zoomLabelShort: Math.round(((S.zoom && S.zoom.z) || 1) * 100) + '%', zoomFitFg: S.zoom ? '#000000' : '#f3f1ec',
      zoomIn: () => this.setZoom(((S.zoom && S.zoom.z) || 1) * 1.25), zoomOut: () => this.setZoom(((S.zoom && S.zoom.z) || 1) / 1.25), zoomFit: () => { this._cbox = null; this.setState({ zoom: null }); },
      fsRef: this.fsRef, isFs: !!S.fs, enterFs: this.enterFs, exitFs: this.exitFs,
      ...(() => {
        const mode = S.guideMode || 'none', port = this.portrait(), flip = S.guideFlip || 0, G = this.guideGeo(port);
        const tf = this.guideTransform(port, flip), fx = flip & 1, fy = flip & 2;
        return {
          guideMode: mode, gThirds: mode === 'thirds', gGolden: mode === 'golden', gFib: mode === 'fib', gCanFlip: mode === 'golden' || mode === 'fib',
          gViewBox: G.vb, gTransform: tf, gSpiral: G.spiral, gSquares: G.squares,
          gFibLabels: mode !== 'fib' ? [] : G.labels.map(l => {
            let cx = l.cx, cy = l.cy; if (fx) cx = 1618 - cx; if (fy) cy = 1000 - cy;
            const px = port ? cy / 1000 : cx / 1618, py = port ? cx / 1618 : cy / 1000;
            return { n: String(l.n), left: (px * 100).toFixed(2) + '%', top: (py * 100).toFixed(2) + '%', fs: Math.max(9, Math.min(16, l.size / 40)) + 'px' };
          }),
          onGuideMode: e => { const v = e.target.value; try { localStorage.setItem('ukeloop.guide', v); } catch (err) {} this.setState({ guideMode: v }); },
          guideFlip: () => this.setState(st => { const n = ((st.guideFlip || 0) + 1) % 4; try { localStorage.setItem('ukeloop.guideFlip', String(n)); } catch (err) {} return { guideFlip: n }; })
        };
      })(),
      selBoxRef: this.selBoxRef, onHandleDown: this.onHandleDown, filePip: this.filePip, onPipFile: this.onPipFile,
      selElLabel: this.selLabel(S.selEl),
      selElPct: (() => { const el = S.selEl; if (!el) return ''; const v = this.selGet(el), d = this.selDefault(el); return Math.round(v / d * 100) + ' %'; })(),
      selReset: () => {
        const el = this.state.selEl; if (!el) return;
        this.selSet(el, this.selDefault(el));
        if (el.kind === 'text') { const key = ({ time: 'day', place: 'day', pill: 'kicker', phone: 'email' })[el.field] || el.field; this.setState(st => ({ slides: st.slides.map(x => { if (x.id !== el.id || !x.toff) return x; const t = { ...x.toff }; delete t[key]; return { ...x, toff: Object.keys(t).length ? t : null }; }) })); }
      },
      selClear: () => this.setState({ selEl: null }),
      selCanDelete: !!S.selEl && ['pip', 'ftext', 'fqr'].includes(S.selEl.kind),
      selDelete: () => { const el = this.state.selEl; if (!el) return; if (el.kind === 'pip') this.removePip(el.id, el.i); else if (el.kind === 'ftext') this.removeFtext(el.id, el.i); else if (el.kind === 'fqr') this.removeFqr(el.id); this.setState({ selEl: null }); },
      freeAdd: [
        { label: 'Tekst', hint: 'Fri tekst hvor som helst', onClick: () => this.addFtext() },
        { label: 'QR-kode', hint: 'Lenke med kontakt', onClick: () => this.addFqr() },
        { label: 'Bilde', hint: 'Fra filer eller galleri', onClick: () => { const sid = this.state.selected; if (sid) this.addPipFor(sid, null); } }
      ],
      ...(() => {
        const sl = S.slides.find(x => x.id === S.selected); if (!sl) return { noFree: true, ftextRows: [], hasFqr: false };
        const chip = on => ({ bg: on ? '#f3f1ec' : 'transparent', color: on ? '#000' : '#b3afa6', border: on ? '#f3f1ec' : '#2b2b2b' });
        const updT = (i, patch) => this.setState(st => ({ slides: st.slides.map(x => x.id === sl.id ? { ...x, ftexts: (x.ftexts || []).map((t, j) => j === i ? { ...t, ...patch } : t) } : x) }));
        const updQ = patch => this.setState(st => ({ slides: st.slides.map(x => x.id === sl.id ? { ...x, fqr: { ...(x.fqr || {}), ...patch } } : x) }));
        const q = sl.fqr, isSel = (k, i) => S.selEl && S.selEl.kind === k && S.selEl.id === sl.id && (k === 'fqr' || S.selEl.i === i);
        const pick = (k, i) => { this.hardStopAudio(); this.setState({ playing: false, selEl: { kind: k, id: sl.id, i } }); };
        return {
          noFree: !(sl.ftexts || []).length && !q && !(sl.pips || []).length,
          ftextRows: (sl.ftexts || []).map((t, i) => ({
            label: 'Fri tekst ' + (i + 1), text: t.text || '', border: isSel('ftext', i) ? '#8a867e' : '#2b2b2b',
            sizePct: Math.round((t.size || 1) * 100), color: t.color || '#ffffff',
            onText: e => updT(i, { text: e.target.value.slice(0, 400) }),
            onSize: e => updT(i, { size: Math.max(0.2, Number(e.target.value) / 100) }),
            sz: this.numF('loop.ftextSize', t.size || 1, this.FTEXT_U, v => updT(i, { size: Math.round(v * 1000) / 1000 }), [0.2, 8]),
            onColor: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) updT(i, { color: v }); },
            onSelect: () => pick('ftext', i), onRemove: () => this.removeFtext(sl.id, i),
            actions: [
              { label: 'Fet', ...chip(t.bold !== false), onClick: () => updT(i, { bold: t.bold === false }) },
              { label: 'Store bokstaver', ...chip(!!t.upper), onClick: () => updT(i, { upper: !t.upper }) },
              { label: 'Bakgrunn', ...chip(!!t.box), onClick: () => updT(i, { box: !t.box }) },
              { label: 'Midtstill', ...chip(false), onClick: () => updT(i, { x: 0.5, y: 0.5 }) }
            ]
          })),
          hasFqr: !!q, fqrBorder: isSel('fqr') ? '#8a867e' : '#2b2b2b',
          fqrCaption: q ? q.caption || '' : '', fqrContact: q ? q.contact || '' : '', fqrSize: q ? Math.round(q.size || 260) : 260, fqrNoUrl: !q || !q.url,
          ...(() => {
            const K = { url: ['Nettside', 'Nettadresse', 'www.dinside.no', 'url', 'Åpner nettsiden når noen skanner koden.'],
              email: ['E-post', 'E-postadresse', 'navn@eksempel.no', 'email', 'Åpner en ny e-post til adressen. Emnet fylles inn automatisk hvis du skriver det.'],
              tel: ['Telefon', 'Telefonnummer', '+47 900 00 000', 'tel', 'Ringer nummeret når noen skanner koden.'],
              sms: ['SMS', 'Mobilnummer', '+47 900 00 000', 'tel', 'Åpner en ny SMS til nummeret, eventuelt med ferdig tekst.'],
              text: ['Tekst', 'Tekst i koden', 'F.eks. Vipps 123456', 'text', 'Viser teksten på telefonen når noen skanner koden.'] };
            const kind = (q && q.kind) || (q && q.url ? (/^mailto:/i.test(q.url) ? 'email' : /^tel:/i.test(q.url) ? 'tel' : /^sms/i.test(q.url) ? 'sms' : 'url') : 'url');
            const val = q ? (q.val != null ? q.val : String(q.url || '').replace(/^(mailto:|tel:|sms:)/i, '')) : '';
            const build = (k, v, x) => {
              v = String(v || '').trim(); x = String(x || '').trim(); if (!v) return '';
              if (k === 'email') return 'mailto:' + v.replace(/\s+/g, '') + (x ? '?subject=' + encodeURIComponent(x) : '');
              if (k === 'tel') return 'tel:' + v.replace(/[^\d+]/g, '');
              if (k === 'sms') return 'sms:' + v.replace(/[^\d+]/g, '') + (x ? '?body=' + encodeURIComponent(x) : '');
              if (k === 'text') return v;
              return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v;
            };
            const setK = (k, v, x) => updQ({ kind: k, val: v, extra: x, url: build(k, v, x).slice(0, 600) });
            const ex = q ? q.extra || '' : '';
            return {
              fqrKinds: Object.entries(K).map(([k, d]) => ({ label: d[0], bg: kind === k ? '#f3f1ec' : 'transparent', color: kind === k ? '#111' : '#9d998f', onClick: () => setK(k, val, ex) })),
              fqrValLabel: K[kind][1], fqrValPh: K[kind][2], fqrValMode: K[kind][3], fqrHint: K[kind][4], fqrVal: val,
              onFqrVal: e => setK(kind, e.target.value.slice(0, 400), ex),
              fqrHasExtra: kind === 'email' || kind === 'sms', fqrExtraLabel: kind === 'email' ? 'Emne (valgfritt)' : 'Ferdig melding (valgfritt)', fqrExtraPh: kind === 'email' ? 'F.eks. Påmelding' : 'F.eks. Jeg vil være med', fqrExtra: ex,
              onFqrExtra: e => setK(kind, val, e.target.value.slice(0, 120))
            };
          })(), onFqrCaption: e => updQ({ caption: e.target.value.slice(0, 80) }), onFqrContact: e => updQ({ contact: e.target.value.slice(0, 80) }),
          onFqrSize: e => updQ({ size: Number(e.target.value) }), fqrSelect: () => pick('fqr', 0), fqrRemove: () => { this.removeFqr(sl.id); this.setState({ selEl: null }); }
        };
      })(),
      ...(() => {
        const sl = S.slides.find(x => x.id === S.selected), list = (sl && sl.pips) || [];
        const chip = on => ({ bg: on ? '#f3f1ec' : 'transparent', color: on ? '#000' : '#b3afa6', border: on ? '#f3f1ec' : '#2b2b2b' });
        const upd = (i, patch) => this.setState(st => ({ slides: st.slides.map(x => x.id === sl.id ? { ...x, pips: (x.pips || []).map((p, j) => j === i ? { ...p, ...patch } : p) } : x) }));
        return {
          pipRows: list.map((p, i) => {
            const url = this.isStored(p.src) ? S.urls[p.src] : p.src, on = S.selEl && S.selEl.kind === 'pip' && S.selEl.id === sl.id && S.selEl.i === i;
            return {
              thumb: url ? this.cssUrl(url) : 'none', border: on ? '#8a867e' : '#2b2b2b',
              sizePct: Math.round((p.w || 0.3) * 100), radius: Math.round(p.r == null ? 18 : p.r), opPct: Math.round((p.op == null ? 1 : p.op) * 100),
              onSize: e => upd(i, { w: Math.max(0.03, Number(e.target.value) / 100) }),
              onRadius: e => upd(i, { r: Number(e.target.value) }),
              onOp: e => upd(i, { op: Number(e.target.value) / 100 }),
              onSelect: () => { this.hardStopAudio(); this.setState({ playing: false, selEl: { kind: 'pip', id: sl.id, i } }); },
              actions: [
                { label: 'Ramme', ...chip(!!p.border), onClick: () => upd(i, { border: !p.border }) },
                { label: 'Skygge', ...chip(p.shadow !== false), onClick: () => upd(i, { shadow: p.shadow === false }) },
                { label: 'Midtstill', ...chip(false), onClick: () => upd(i, { x: 0.5, y: 0.5 }) },
                { label: 'Bytt bilde', ...chip(false), onClick: () => this.addPipFor(sl.id, i) },
                { label: 'Fjern', ...chip(false), onClick: () => this.removePip(sl.id, i) }
              ]
            };
          })
        };
      })(),
      hasFlash: !!S.playFlash, flashPlayIcon: S.playFlash === 'play', flashPauseIcon: S.playFlash === 'pause',
      volOn: S.soundOn !== false && !!S.audioName, volOff: !(S.soundOn !== false && !!this.state.audioName),
      volIconColor: S.audioName ? (S.soundOn === false ? '#8a867e' : '#f3f1ec') : '#5f5b55',
      volTitle: !S.audioName ? 'Ingen musikk ennå – trykk for å legge til under Stil' : S.soundOn === false ? 'Slå på lyd i forhåndsvisningen' : 'Demp lyd i forhåndsvisningen',
      volBtn: () => { if (!this.state.audioName) { this.setState({ tab: 'style', mPane: 'edit' }); return; } this.toggleSound(); },
      toggleSound: this.toggleSound,
      undo: this.undo, redo: this.redo,
      undoOpacity: this.past.length ? 1 : 0.35, redoOpacity: this.future.length ? 1 : 0.35,
      undoCursor: this.past.length ? 'pointer' : 'default', redoCursor: this.future.length ? 'pointer' : 'default',
      playLabel: live ? 'Pause' : 'Spill av', togglePlay: this.togglePlay, goExport: () => { this.setState({ tab: 'export', mPane: 'edit' }); if (S.mobile) try { window.scrollTo(0, 0); } catch (e) {} },
      canvasRef: this.canvasRef, cards,
      fileVideo: this.fileVideo, fileImg: this.fileImg, fileText: this.fileText,
      onVideoFile: this.onVideoFile, fileSlideVid: this.fileSlideVid, onSlideVidFile: this.onSlideVidFile, onImgFile: this.onImgFile, onTextFile: this.onTextFile
    };
  }
}

export default Component;
