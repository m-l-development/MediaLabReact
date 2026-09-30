/* Etterligning av synlige særheter i dc-runtime (support.js), slik at React-sidene ser og oppfører seg
   nøyaktig som originalene.

   Bakgrunn: I originalen står malen som rå HTML i <x-dc>. Skriptene i <helmet> kjøres av nettleseren
   allerede mens siden leses inn, og ved DOMContentLoaded har theme.js (lys modus) og ml-footer.js endret
   stilene i den rå malen. Runtimen bygger første visning fra denne endrede malen, henter deretter siden
   på nytt (fetch) og kompilerer den urørte malen. React sammenligner så de to stil-objektene og oppdaterer
   bare nøklene som er ulike. Resultatet er noen varige, synlige forskjeller fra malen – de gjenskapes her. */

/* ---------- 1. Footer (ml-footer.js) ----------
   ml-footer koblet innfading på footeren i den rå malen. Etter andre kompilering satte React stilen på
   footer-teksten tilbake (uten transition/opacity/transform). Footere som finnes ved oppstart vises derfor
   med en gang, og ml-footer skjuler/viser dem senere uten animasjon. Footere som kommer senere, fader inn.
   Stilen noteres før ml-footer kobler seg på, og settes tilbake etter IntersectionObservers første melding. */
export function keepFooterLikeRuntime(root) {
  const saved = [...root.querySelectorAll('footer')].map(f => { const s = f.querySelector('span') || f; return [s, s.style.cssText]; });
  if (!saved.length) return;
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => saved.forEach(([s, css]) => { if (s.isConnected) s.style.cssText = css; }), 0)));
}

/* ---------- 2. Lys modus (theme.js) ----------
   theme.js skrev om farger i de rå stilene (setProperty), og da serialiserte nettleseren hele stilen på nytt:
   deklarasjoner med {{ }} forsvant, og kortformer ble delt opp (f.eks. «font: inherit; font-size: 13px»
   → «font-style: inherit; …; font-size: 13px; …»). Etter andre kompilering satte React bare de ulike
   nøklene – for eksempel «font: inherit» – mens like verdier (font-size: 13px) ble hoppet over og dermed
   overskrevet av kortformen. Her regnes den omskrevne stilen ut på samme måte, og samme oppdatering gjøres. */

/* kopi av fargeomregningen i theme.js (mapRGB/mapValue) */
const cl = v => Math.max(0, Math.min(255, Math.round(v)));
function mapRGB(r, g, b, a, prop) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), avg = (r + g + b) / 3;
  if (mx - mn <= 28) {
    if (/shadow/.test(prop) && avg < 80) return null;
    if (/^background/.test(prop) && a < 0.3 && avg > 150) return null;
    const G = 228 - (avg / 255) * 208; let dr = r - avg, dg = g - avg, db = b - avg;
    if (Math.abs(dr) < 2 && Math.abs(dg) < 2 && Math.abs(db) < 2) { const k = G / 228; dr = 1.5 * k; dg = 0; db = -4.5 * k; }
    return [cl(G + dr), cl(G + dg), cl(G + db), a];
  }
  if (prop === 'color' || prop === 'caret-color') {
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (L > 0.5) { const f = 0.36 / L; return [cl(r * f), cl(g * f), cl(b * f), a]; }
  }
  return null;
}
function mapValue(v, prop) {
  if (!v || v.indexOf('url(') >= 0 && !/gradient/.test(v)) return v;
  return v.replace(/rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|\b(white|black)\b/g, (m, r, g, b, a, named) => {
    if (named) { r = named === 'white' ? 255 : 0; g = b = r; }
    const al = a == null ? 1 : /%$/.test(a) ? parseFloat(a) / 100 : parseFloat(a);
    const res = mapRGB(+r, +g, +b, al, prop); if (!res) return m;
    return res[3] >= 1 ? 'rgb(' + res[0] + ', ' + res[1] + ', ' + res[2] + ')' : 'rgba(' + res[0] + ', ' + res[1] + ', ' + res[2] + ', ' + res[3] + ')';
  });
}

/* rå stiltekst per stil-objekt (fra css(…, rå) og sty(…)); statiske objekter gjøres om til tekst */
export const RAW = new WeakMap();
const camelToKebab = k => (k.startsWith('--') ? k : k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()));
const rawOf = style => (RAW.has(style) ? RAW.get(style) : Object.entries(style).map(([k, v]) => camelToKebab(k) + ':' + v).join('; '));
const kebabToCamel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function cssToObj(css) {
  const o = {};
  for (const decl of css.split(';')) { const i = decl.indexOf(':'); if (i < 0) continue; const p = decl.slice(0, i).trim(); o[p.startsWith('--') ? p : kebabToCamel(p)] = decl.slice(i + 1).trim(); }
  return o;
}
const reactProps = el => { for (const k in el) if (k.startsWith('__reactProps$')) return el[k]; return null; };

/* det theme.js gjorde med den rå stilen (null = ingen endring) */
function tampered(raw) {
  const tmp = document.createElement('div'); tmp.setAttribute('style', raw);
  const st = tmp.style; if (!st.length) return null;
  let changed = false;
  for (let i = 0; i < st.length; i++) {
    const p = st[i], v = st.getPropertyValue(p);
    if (!/rgb|white|black/.test(v)) continue;
    const m = mapValue(v, p); if (m === v) continue;
    st.setProperty(p, m, st.getPropertyPriority(p)); changed = true;
  }
  return changed ? tmp.getAttribute('style') : null;
}
/* theme.js hoppet over elementer i [data-keep-color]/[data-ml-theme] og under bakgrunnsbilder (url) */
function skipped(el, root) {
  if (el.closest('[data-keep-color],[data-ml-theme]')) return true;
  for (let e = el; e && e !== root; e = e.parentElement) {
    const p = reactProps(e), s = p && p.style; if (!s || typeof s !== 'object') continue;
    const t = document.createElement('div'); t.setAttribute('style', rawOf(s));
    if ((t.style.backgroundImage || '').indexOf('url(') >= 0) return true;
  }
  return false;
}
/* samme oppdatering som React gjorde fra første til andre kompilering */
function setStyle(el, k, v) {
  const val = v == null || typeof v === 'boolean' || v === '' ? '' : String(v).trim();
  if (k.startsWith('--')) el.style.setProperty(k, val); else el.style[k === 'float' ? 'cssFloat' : k] = val;
}
/* Med engelsk ved oppstart oversatte i18n.js teksten i den rå malen. Elementer som bare inneholder tekst hadde
   innholdet som del av nøkkelen i runtimen, så når teksten ble oversatt, laget React dem på nytt ved andre
   kompilering – med ren stil. De (og alt inni dem) får derfor ikke omskrivingen. */
function remounted(root, inline) {
  const ids = new Set(), I = window.MLI18N;
  if (!I || I.lang !== 'en') return ids;
  for (const id in inline) {
    const el = root.querySelector('[data-dc-tpl="' + id + '"]');
    if (el && el.closest('[data-no-i18n],script,style,textarea,code,[contenteditable="true"]')) continue;
    if (inline[id].some(t => /[A-Za-zÆØÅæøå]/.test(t) && I.t(t) !== t)) ids.add(id);
  }
  return ids;
}
export function replayThemeTamper(root, inline = {}) {
  if (!(window.MLTheme && window.MLTheme.mode === 'light')) return;
  const fresh = remounted(root, inline);
  const isFresh = el => { for (let e = el; e && e !== root; e = e.parentElement) if (fresh.has(e.getAttribute('data-dc-tpl'))) return true; return false; };
  for (const el of root.querySelectorAll('*')) {
    const p = reactProps(el), next = p && p.style;
    if (!next || typeof next !== 'object' || skipped(el, root) || isFresh(el)) continue;
    const t = tampered(rawOf(next)); if (t == null) continue;
    const prev = cssToObj(t);
    for (const k in prev) if (!(k in next)) setStyle(el, k, '');
    for (const k in next) if (prev[k] !== next[k]) setStyle(el, k, next[k]);
  }
}
