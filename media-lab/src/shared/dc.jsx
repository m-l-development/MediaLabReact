/* Erstatter dc-runtime (support.js) for sider som er konvertert til JSX.
   Oppførselen speiler runtimen: logikkklassen (DCLogic) har egen state som oppdateres synkront,
   livssyklusfeil logges uten å velte siden, og feil i render vises som en rød boks. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './dc-base.css';
import { keepFooterLikeRuntime, replayThemeTamper, RAW } from './runtime-quirks.js';
import { stickyTitle } from './sticky-title.js';
import './ml-update.js';
import { ensureLoggedIn } from './auth-gate.js';

/* Sideoverganger (@view-transition i noen sider): når Chrome avbryter en overgang (f.eks. ved rask navigering) avvises
   løftene med «Transition was aborted … ViewTransition opt-in disabled». Det er ufarlig; vi fanger det så det ikke
   dukker opp som uhåndtert feil. */
if (typeof window !== 'undefined') for (const ev of ['pageswap', 'pagereveal']) window.addEventListener(ev, e => {
  const vt = e.viewTransition; if (!vt) return;
  for (const p of ['ready', 'finished', 'updateCallbackDone']) if (vt[p] && vt[p].catch) vt[p].catch(() => {});
});

export class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; this.__host = undefined; }
  setState(update, cb) { this.__host && this.__host.__setLogicState(update, cb); }
  forceUpdate() { this.__host && this.__host.forceUpdate(); }
  componentDidMount() {}
  componentDidUpdate() {}
  componentWillUnmount() {}
  renderVals() { return {}; }
}

/* {{ uttrykk }} i tekst: elementer/lister som de er, null/boolsk = ingenting, ellers <span class="sc-interp"> */
export function I(v) {
  if (v === undefined || v === null || typeof v === 'boolean') return null;
  if (React.isValidElement(v) || Array.isArray(v)) return v;
  return <span className="sc-interp">{String(v)}</span>;
}

/* style="…" med {{ }} blir en streng først og gjøres om til objekt, akkurat som i runtimen */
const kebabToCamel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
/* deler på ; men ikke inne i url(…)/anførselstegn – data-URL-er har «;base64» */
function splitDecls(s) {
  const out = []; let cur = '', depth = 0, q = '';
  for (const ch of s) {
    if (q) { if (ch === q) q = ''; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && !depth) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur); return out;
}
export function css(str, raw) {
  const o = {};
  if (raw !== undefined) RAW.set(o, raw);
  for (const decl of splitDecls(String(str))) {
    const i = decl.indexOf(':'); if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
}

/* style="{{ x }}": streng → objekt, objekt som det er */
export const sty = v => {
  /* den rå stilen var «{{ x }}», som theme.js ikke kunne lese – se runtime-quirks.js */
  const o = typeof v === 'string' ? css(v) : v;
  if (o && typeof o === 'object') RAW.set(o, '');
  return o;
};
/* class="{{ x }}" + style-hover-klasser */
export const cx = (a, b) => [a, b].filter(Boolean).join(' ');

/* value/checked som mangler, blir '' / false */
export const val = v => (v === undefined ? '' : v);
export const chk = v => (v === undefined ? false : v);
/* sc-for: ikke-lister blir tomme */
export const list = v => (Array.isArray(v) ? v : []);

function makeHost(name, Logic, template, inline) {
  class DCHost extends React.Component {
    constructor(props) {
      super(props);
      this.state = { __v: 0, __err: null };
      this.__ctorError = null;
      try { this.logic = new Logic(props); }
      catch (e) { console.error(e); this.__ctorError = name + ': ' + (e && e.message ? e.message : String(e)); this.logic = new DCLogic(props); }
      this.logic.__host = this;
    }
    static getDerivedStateFromError(e) { return { __err: e instanceof Error && e.message ? e.message : String(e) }; }
    componentDidCatch(e, info) { console.error('[dc] render error in <' + name + '>:', e, (info && info.componentStack) || ''); }
    __setLogicState(update, cb) {
      const prev = this.logic.state;
      const patch = typeof update === 'function' ? update(prev) : update;
      this.logic.state = { ...prev, ...patch };
      this.setState(s => ({ __v: s.__v + 1 }), cb);
    }
    componentDidMount() {
      /* særheter fra dc-runtime som er synlige i originalen, se runtime-quirks.js */
      const root = document.getElementById('dc-root');
      if (root) { keepFooterLikeRuntime(root); setTimeout(() => replayThemeTamper(root, inline), 0); stickyTitle(root); }
      try { this.logic.componentDidMount(); } catch (e) { console.error(e); }
    }
    componentDidUpdate(prevProps) { this.logic.props = this.props; try { this.logic.componentDidUpdate(prevProps); } catch (e) { console.error(e); } }
    componentWillUnmount() { try { this.logic.componentWillUnmount(); } catch (e) { console.error(e); } }
    render() {
      const base = { className: 'sc-host', 'data-sc-name': name };
      if (this.state.__err) {
        return <div {...base} className="sc-host sc-has-error"><div className="sc-logic-error">{name + ': ' + this.state.__err}</div></div>;
      }
      this.logic.props = this.props;
      let vals = this.props, err = this.__ctorError;
      try { vals = { ...this.props, ...(this.logic.renderVals() || {}) }; }
      catch (e) { console.error(e); err = name + '.renderVals(): ' + (e && e.message ? e.message : String(e)); }
      return (
        <div {...base} className={'sc-host' + (err ? ' sc-has-error' : '')}>
          {err && <div className="sc-logic-error">{err}</div>}
          {template(vals)}
        </div>
      );
    }
  }
  DCHost.displayName = name;
  return DCHost;
}

/* Laster uendrede, klassiske skript (?url-import) etter hverandre */
export function loadClassic(urls) {
  return urls.reduce((p, src) => p.then(() => new Promise(res => {
    const s = document.createElement('script'); s.src = src; s.async = false;
    s.onload = s.onerror = () => res(); document.head.appendChild(s);
  })), Promise.resolve());
}

/* Monterer siden i <div id="dc-root"> slik runtimen gjorde – først etter at innloggingsporten har godkjent brukeren */
export function mountPage(name, Logic, template, inline) {
  ensureLoggedIn().then(() => {
    const Host = makeHost(name, Logic, template, inline || {});
    let el = document.getElementById('dc-root');
    if (!el) { el = document.createElement('div'); el.id = 'dc-root'; document.body.prepend(el); }
    createRoot(el).render(<Host />);
  });
  /* siden startet: selvreparasjonen (vite.config.js) kan brukes igjen ved neste feil */
  setTimeout(() => { try { sessionStorage.removeItem('medialab.heal'); } catch (e) {} }, 3000);
}
