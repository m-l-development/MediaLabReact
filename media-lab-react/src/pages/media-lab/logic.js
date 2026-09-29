/* GENERERT av scripts/dc2jsx.mjs fra media-lab/media-lab.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
class Component extends DCLogic {
  meshRef = React.createRef();
  state = { lang: (window.MLI18N && window.MLI18N.lang) || 'no', theme: (() => { try { return localStorage.getItem('medialab.theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } })() };
  setTheme(t) {
    try { localStorage.setItem('medialab.theme', t); } catch (e) {}
    document.documentElement.style.background = document.body.style.background = t === 'light' ? '#e4e1da' : '#000';
    const m = document.querySelector('meta[name="color-scheme"]'); if (m) m.setAttribute('content', t === 'light' ? 'light' : 'dark');
    this.setState({ theme: t }, () => this.still && this.draw(0));
  }
  componentDidMount() {
    this.alive = true;
    this.onPop = () => this.setState({ folder: this.readFolder() }); window.addEventListener('popstate', this.onPop); this.setState({ folder: this.readFolder() });
    this.onLang = e => this.setState({ lang: e.detail });
    window.addEventListener('medialab-lang', this.onLang);
    if (this.state.theme === 'light') this.setTheme('light');
    this.still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let last = -1;
    const tick = now => { if (!this.alive) return; if (!this.still) this.raf = requestAnimationFrame(tick); if (now != null && now - last < 32) return; last = now || 0; this.draw(((now || performance.now()) - t0) / 1000); };
    tick();
    this.onResize = () => this.still && this.draw(0);
    window.addEventListener('resize', this.onResize);
  }
  readFolder() { const h = (location.hash || '').slice(1).toLowerCase(); return h === 'some' || h === 'tools' ? h : ''; }
  goFolder(f) { try { history.pushState(null, '', f ? '#' + f : location.pathname + location.search); } catch (e) {} this.setState({ folder: f }); window.scrollTo(0, 0); }
  componentWillUnmount() { this.alive = false; window.removeEventListener('popstate', this.onPop); cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.onResize); window.removeEventListener('medialab-lang', this.onLang); }
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
    const lt = this.state.theme === 'light', ink = lt ? '60,54,44' : '255,255,255', ka = lt ? 0.8 : 1;
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
    const en = this.state.lang === 'en', lt = this.state.theme === 'light', on = 'var(--ml-fg, #f3f1ec)', off = 'var(--ml-dim, #8a867e)', chip = 'var(--ml-chip-on, rgba(255,255,255,0.12))', set = l => { window.MLI18N && window.MLI18N.set(l); this.setState({ lang: l }); };
    const f = this.state.folder || '';
    return { atHome: !f, atSome: f === 'some', atTools: f === 'tools', openSome: () => this.goFolder('some'), openTools: () => this.goFolder('tools'), closeFolder: () => this.goFolder(''), meshRef: this.meshRef, isNo: !en, isEn: en, noBg: en ? 'transparent' : chip, enBg: en ? chip : 'transparent', noFg: en ? off : on, enFg: en ? on : off, setNo: () => set('no'), setEn: () => set('en'),
      theme: lt ? 'light' : 'dark', themeTitle: lt ? 'Bytt til mørk modus' : 'Bytt til lys modus', toggleTheme: () => this.setTheme(lt ? 'dark' : 'light') };
  }
}

export default Component;
