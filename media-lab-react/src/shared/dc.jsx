/* Erstatter dc-runtime (support.js) for sider som er konvertert til JSX.
   Oppførselen speiler runtimen: logikkklassen (DCLogic) har egen state som oppdateres synkront,
   livssyklusfeil logges uten å velte siden, og feil i render vises som en rød boks. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './dc-base.css';

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
export function css(str) {
  const o = {};
  for (const decl of String(str).split(';')) {
    const i = decl.indexOf(':'); if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
}

/* style="{{ x }}": streng → objekt, objekt som det er */
export const sty = v => (typeof v === 'string' ? css(v) : v);
/* class="{{ x }}" + style-hover-klasser */
export const cx = (a, b) => [a, b].filter(Boolean).join(' ');

/* value/checked som mangler, blir '' / false */
export const val = v => (v === undefined ? '' : v);
export const chk = v => (v === undefined ? false : v);
/* sc-for: ikke-lister blir tomme */
export const list = v => (Array.isArray(v) ? v : []);

/* I dc-runtime rakk ml-footer.js å koble innfading på footerne i den rå malen. Runtimen kompilerte
   malen på nytt rett etter første visning, og da satte React stilen på footer-teksten tilbake til malens
   stil (uten transition/opacity/transform). Resultat i originalen: footere som finnes ved oppstart vises
   med en gang, og ml-footer skjuler/viser dem senere uten animasjon. Footere som kommer senere, fader inn.
   Her gjøres det samme: stilen noteres før ml-footer kobler seg på, og settes tilbake etter at
   IntersectionObserver har levert første melding (to animasjonsrammer). */
function keepFooterLikeRuntime() {
  const root = document.getElementById('dc-root'); if (!root) return;
  const saved = [...root.querySelectorAll('footer')].map(f => { const s = f.querySelector('span') || f; return [s, s.style.cssText]; });
  if (!saved.length) return;
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => saved.forEach(([s, css]) => { if (s.isConnected) s.style.cssText = css; }), 0)));
}

function makeHost(name, Logic, template) {
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
      keepFooterLikeRuntime();
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

/* Monterer siden i <div id="dc-root"> slik runtimen gjorde */
export function mountPage(name, Logic, template) {
  const Host = makeHost(name, Logic, template);
  let el = document.getElementById('dc-root');
  if (!el) { el = document.createElement('div'); el.id = 'dc-root'; document.body.prepend(el); }
  createRoot(el).render(<Host />);
}
