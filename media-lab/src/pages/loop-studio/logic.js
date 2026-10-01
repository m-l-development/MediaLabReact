/* Konvertert fra den gamle dc-siden loop-studio.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
const LS_KEY = 'loopstudio.tpls.v1';
const EDITOR = 'studio-editor.dc.html';
const BASES = ['week', 'sunday', 'youth', 'blank'];
const DEFAULTS = {
  title: 'Loop Studio',
  cards: [
    { id: 'week', base: 'week', cat: 'Mal', title: 'Ukeprogram', desc: 'Ukens møter fra tekst, bilde eller fil, med ukeoversikt nederst.', btn: 'Velg' },
    { id: 'sunday', base: 'sunday', cat: 'Mal', title: 'Søndagsmøte', desc: 'Velkommen, dagens tale og nettkanaler før møtet starter.', btn: 'Velg' },
    { id: 'youth', base: 'youth', cat: 'Mal', title: 'Ungdomsmøte', desc: 'Velkomst og kveldens program for ungdomsmøtet.', btn: 'Velg' },
    { id: 'blank', base: 'blank', cat: 'Mal', title: 'Tom mal', desc: 'Start med én tom slide og bygg loopen selv.', btn: 'Velg' }
  ]
};
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

class Component extends DCLogic {
  meshRef = React.createRef();
  diskScrollRef = React.createRef();
  updArrows() {
    const el = this.diskScrollRef.current; if (!el) return;
    void 0; const l = el.scrollLeft > 4, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (l !== !!this.state.canL || r !== !!this.state.canR) this.setState({ canL: l, canR: r });
  }
  hookDisk() {
    const el = this.diskScrollRef.current;
    if (!el || el === this._hooked) return;
    this._hooked = el;
    el.addEventListener('wheel', e => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      const cur = this._wAnim ? this._wt : el.scrollLeft; if ((e.deltaY < 0 && cur <= 0) || (e.deltaY > 0 && cur >= max)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? el.clientWidth : 1;
      this._wt = Math.max(0, Math.min(max, (this._wAnim ? this._wt : el.scrollLeft) + e.deltaY * unit * 1.2));
      if (!this._wAnim) { const step = () => { const d = this._wt - el.scrollLeft; if (Math.abs(d) < 1) { el.scrollLeft = this._wt; this._wAnim = 0; return; } el.scrollLeft += d * 0.25; this._wAnim = requestAnimationFrame(step); }; this._wAnim = requestAnimationFrame(step); }
    }, { passive: false });
    let down = null;
    el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = { x: e.clientX, s: el.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', this._pm = e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 5) { down.moved = true; el.scrollLeft = down.s - dx; } });
    window.addEventListener('pointerup', this._pu = () => { if (down && down.moved) { const stop = ev => { ev.preventDefault(); ev.stopPropagation(); }; el.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', stop, true), 50); } down = null; });
    this.updArrows();
  }
  componentDidUpdate() { this.hookDisk(); requestAnimationFrame(() => this.alive && this.updArrows()); }
  state = { editing: false, data: DEFAULTS, diskOpen: false, disk: [] };
  loadDisk() {
    try { const l = JSON.parse(localStorage.getItem('loopstudio.disk.v1') || '[]'); return Array.isArray(l) ? l.filter(d => d && typeof d.id === 'string' && /^d-[a-z0-9]{4,16}$/.test(d.id)).slice(0, 10) : []; } catch (e) { return []; }
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!d || typeof d !== 'object' || !Array.isArray(d.cards)) return DEFAULTS;
      const cards = d.cards.filter(c => c && typeof c === 'object' && typeof c.id === 'string' && /^(week|sunday|youth|blank|c-[a-z0-9]{4,16})$/.test(c.id))
        .map(c => ({ id: c.id, base: BASES.includes(c.base) ? c.base : 'blank', cat: clip(c.cat, 40), title: clip(c.title, 60), desc: clip(c.desc, 300), btn: clip(c.btn, 30) }));
      return { title: clip(d.title, 60) || DEFAULTS.title, cards };
    } catch (e) { return DEFAULTS; }
  }
  save(data) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {} }
  update(fn) { this.setState(s => { const data = fn(s.data); this.save(data); return { data }; }); }
  setCard(id, k, v) { this.update(d => ({ ...d, cards: d.cards.map(c => c.id === id ? { ...c, [k]: v } : c) })); }

  componentDidMount() {
    { const sp = document.getElementById('boot-splash'); if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 300); } }
    /* warm the editor so opening a template is near-instant (no blank flash while it downloads) */
    this._pf = new Set();
    const pf = (h, as) => { if (!h || this._pf.has(h)) return; this._pf.add(h); const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; if (as) l.as = as; document.head.appendChild(l); };
    this._warm = setTimeout(() => pf('studio-editor.dc.html', 'document'), 400);
    this.onOver = e => { const a = e.target && e.target.closest && e.target.closest('a[href],a[data-ml-href]'); if (a) { const h = a.getAttribute('href') || a.getAttribute('data-ml-href') || ''; if (/\.dc\.html/.test(h)) pf(h, 'document'); } };
    document.addEventListener('pointerover', this.onOver, { passive: true });
    document.addEventListener('touchstart', this.onOver, { passive: true });
    this.setState({ data: this.load(), disk: this.loadDisk() });
    this.onStorage = e => { if (e.key === 'loopstudio.disk.v1') this.setState({ disk: this.loadDisk() }); };
    window.addEventListener('storage', this.onStorage);
    this.alive = true;
    this.still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let last = -1;
    const tick = now => { if (!this.alive) return; if (!this.still) this.raf = requestAnimationFrame(tick); if (now != null && now - last < 32) return; last = now || 0; this.draw(((now || performance.now()) - t0) / 1000); };
    tick();
    this.onResize = () => { if (this.still) this.draw(0); this.updArrows(); };
    this.onTheme = () => this.still && this.draw(0); window.addEventListener('medialab-theme', this.onTheme);
    window.addEventListener('resize', this.onResize);
  }
  componentWillUnmount() { clearTimeout(this._warm); document.removeEventListener('pointerover', this.onOver); document.removeEventListener('touchstart', this.onOver); this.alive = false; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.onResize); window.removeEventListener('storage', this.onStorage); if (this._pm) window.removeEventListener('pointermove', this._pm); if (this._pu) window.removeEventListener('pointerup', this._pu); }
  draw(t) {
    const c = this.meshRef.current; if (!c) return;
    const d = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * d) || c.height !== Math.round(H * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d); }
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    const NX = 44, NZ = 30, pts = [];
    for (let j = 0; j < NZ; j++) {
      const z = 1 + j * 0.2, row = [];
      for (let i = 0; i < NX; i++) {
        const x = -3.2 + i * (6.4 / (NX - 1));
        const y = 0.34 * Math.sin(x * 1.3 + t * 0.35) * Math.cos(z * 0.9 - t * 0.22) + 0.2 * Math.sin((x - z) * 1.7 + t * 0.28);
        row.push([W / 2 + (x / z) * W * 0.42, H * 0.12 + ((1.1 - y) / z) * H * 0.78]);
      }
      pts.push(row);
    }
    g.lineWidth = 1;
    const lt = window.MLTheme && window.MLTheme.mode === 'light', ink = lt ? '60,54,44' : '255,255,255', ka = lt ? 0.8 : 1;
    for (let j = 0; j < NZ; j++) {
      g.strokeStyle = 'rgba(' + ink + ',' + ((0.05 + 0.2 * (1 - j / NZ)) * ka).toFixed(3) + ')';
      g.beginPath(); pts[j].forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    }
    for (let i = 0; i < NX; i++) {
      const gr = g.createLinearGradient(0, H, 0, 0);
      gr.addColorStop(0, 'rgba(' + ink + ',' + (0.22 * ka).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + ink + ',0.03)');
      g.strokeStyle = gr; g.beginPath();
      for (let j = 0; j < NZ; j++) { const p = pts[j][i]; j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
    }
    const fade = g.createLinearGradient(0, 0, 0, H * 0.45);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, W, H * 0.45); g.globalCompositeOperation = 'source-over';
  }

  renderVals() {
    const { editing, data, diskOpen, disk } = this.state;
    const NAMES = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' };
    const fmt = t => { try { return new Date(t).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
    const on = (id, k, n) => e => this.setCard(id, k, clip(e.target.value, n));
    return {
      meshRef: this.meshRef, editing, notEditing: !editing,
      diskScrollRef: this.diskScrollRef, onDiskScroll: () => this.updArrows(),
      canLeft: diskOpen && !!this.state.canL, canRight: diskOpen && !!this.state.canR,
      scrollLeftBtn: () => { const el = this.diskScrollRef.current; if (el) el.scrollBy({ left: -Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' }); },
      scrollRightBtn: () => { const el = this.diskScrollRef.current; if (el) el.scrollBy({ left: Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' }); },
      toggleDisk: () => this.setState(s => ({ diskOpen: !s.diskOpen, disk: this.loadDisk() })),
      diskOpenStr: diskOpen ? 'true' : 'false',
      diskBg: diskOpen ? '#f3f1ec' : 'rgba(12,12,12,0.55)', diskColor: diskOpen ? '#000' : '#f3f1ec', diskBorder: diskOpen ? '#f3f1ec' : 'rgba(255,255,255,0.16)',
      diskCount: disk.length + '/10', diskCountBg: diskOpen ? '#000' : 'rgba(255,255,255,0.12)', diskCountColor: diskOpen ? '#f3f1ec' : '#b3afa6',
      diskRowMax: diskOpen ? '100%' : '0px', diskRowOpacity: diskOpen ? 1 : 0, diskRowVis: diskOpen ? 'visible' : 'hidden', diskEmpty: disk.length === 0,
      disk: disk.map(d => ({
        border: d.fav ? 'rgba(233,231,226,0.45)' : 'rgba(255,255,255,0.16)',
        favColor: d.fav ? '#e9e7e2' : '#6f6b64', favFill: d.fav ? 'currentColor' : 'none', favAria: d.fav ? 'true' : 'false',
        favTitle: d.fav ? 'Fjern fra favoritter' : 'Favoritt – slettes aldri automatisk',
        onFav: () => { const l = this.loadDisk().map(x => x.id === d.id ? { ...x, fav: !x.fav } : x); try { localStorage.setItem('loopstudio.disk.v1', JSON.stringify(l)); } catch (e) {} this.setState({ disk: l }); },
        name: String(d.name || 'Uten navn').slice(0, 60),
        meta: [NAMES[d.base] || 'Egen', d.count ? d.count + ' slides' : '', fmt(d.savedAt)].filter(Boolean).join(' · '),
        href: EDITOR + '?mal=' + encodeURIComponent(NAMES[d.base] ? d.base : 'blank') + '&disk=' + encodeURIComponent(d.id),
        onRemove: () => { if (!confirm('Slette «' + (d.name || 'loopen') + '» fra Disk?')) return; const l = this.loadDisk().filter(x => x.id !== d.id); try { localStorage.setItem('loopstudio.disk.v1', JSON.stringify(l)); localStorage.removeItem('ukeloop.custom.' + d.id); } catch (e) {} this.setState({ disk: l }); }
      })),
      pageTitle: data.title,
      onPageTitle: e => { const v = clip(e.target.value, 60); this.update(d => ({ ...d, title: v })); },
      toggleEdit: () => {
        if (editing) this.update(d => ({ ...d, title: d.title.trim() || DEFAULTS.title }));
        this.setState({ editing: !editing });
      },
      resetAll: () => { if (confirm('Tilbakestille alle maler og tekster på denne siden?')) { try { localStorage.removeItem(LS_KEY); } catch (e) {} this.setState({ data: DEFAULTS }); } },
      addTpl: () => {
        const id = 'c-' + Math.random().toString(36).slice(2, 10);
        this.update(d => ({ ...d, cards: [...d.cards, { id, base: 'blank', cat: 'Mal', title: 'Ny mal', desc: '', btn: 'Velg' }] }));
      },
      cards: data.cards.map((c, ci, all) => {
        const custom = c.id.startsWith('c-'), mv = d2 => this.update(d => { const a = d.cards.slice(), i = a.findIndex(x => x.id === c.id), j = i + d2; if (i < 0 || j < 0 || j >= a.length) return d; const x = a[i]; a[i] = a[j]; a[j] = x; return { ...d, cards: a }; });
        return {
          ...c, cat: c.cat, title: c.title, desc: c.desc, btn: c.btn.trim() ? c.btn : (editing ? '' : 'Velg'),
          builtin: !custom, onUp: () => mv(-1), onDown: () => mv(1), isFirst: ci === 0, isLast: ci === all.length - 1, upOp: ci === 0 ? 0.35 : 1, downOp: ci === all.length - 1 ? 0.35 : 1,
          href: EDITOR + '?mal=' + encodeURIComponent(c.base) + '&id=' + encodeURIComponent(c.id),
          onCat: on(c.id, 'cat', 40), onTitle: on(c.id, 'title', 60), onDesc: on(c.id, 'desc', 300), onBtn: on(c.id, 'btn', 30),
          onBase: e => { const v = e.target.value; if (BASES.includes(v)) this.setCard(c.id, 'base', v); },
          onRemove: () => { if (confirm('Fjerne «' + (c.title || 'malen') + '»?')) this.update(d => ({ ...d, cards: d.cards.filter(x => x.id !== c.id) })); }
        };
      })
    };
  }
}

export default Component;
