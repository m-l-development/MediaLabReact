/* Felles felt nede til høyre for de flytende knappene: tilbakemelding, konto og lys/mørk.
   Knappene ligger i ett flex-felt med fast avstand, så de aldri kan overlappe – uansett hvilke av dem siden har, og
   uansett skjermbredde. Sider som ruller, får en usynlig luft nederst, så det siste innholdet kan rulles fri av knappene.
   Bare én av menyene/panelene er åpen om gangen (openOnly/onOtherOpen). */
const ORDER = { feedback: 1, account: 2, theme: 3 };

export function dock() {
  let d = document.querySelector('[data-ch-dock]');
  if (!d) {
    d = document.createElement('div'); d.setAttribute('data-ch-dock', '1');
    d.style.cssText = 'position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147482000;display:flex;align-items:center;gap:8px;pointer-events:none';
    document.body.appendChild(d);
  }
  return d;
}

/* Legger en knapp i feltet. Knappens egen stil kan bare ha utseende – plasseringen eies av feltet. */
export function dockButton(btn, kind) {
  place(btn, kind); dock().appendChild(btn); adoptTheme(); reserve(); spacerSoon();
  for (const ms of [500, 2000]) setTimeout(() => { adoptTheme(); reserve(); }, ms);
}
/* En side med egen, fast knapp nede til høyre (f.eks. forsidens lys/mørk-knapp, merket data-ch-dock-reserve) styres av
   React og kan ikke flyttes inn i feltet – da flyttes feltet til venstre for den i stedet. */
function reserve() {
  const r = document.querySelector('[data-ch-dock-reserve]');
  dock().style.right = r ? Math.round(innerWidth - r.getBoundingClientRect().left + 8) + 'px' : '12px';
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => { if (document.querySelector('[data-ch-dock]')) reserve(); });
function place(btn, kind) {
  btn.style.position = 'relative'; btn.style.right = 'auto'; btn.style.bottom = 'auto'; btn.style.left = 'auto'; btn.style.top = 'auto';
  btn.style.pointerEvents = 'auto'; btn.style.order = String(ORDER[kind] || 9); btn.style.flex = '0 0 auto';
}
/* Lys/mørk-knappen lages av theme.js (klassisk skript) – den flyttes inn i feltet når den finnes. */
function adoptTheme() {
  const t = document.querySelector('[data-ml-theme-btn]');
  if (t && t.parentNode !== dock()) { place(t, 'theme'); dock().appendChild(t); }
}

/* Luft nederst på sider som ruller (ikke på arbeidsflater med fast høyde). */
function spacerSoon() { for (const ms of [800, 3000]) setTimeout(spacer, ms); }
function spacer() {
  if (document.querySelector('[data-ch-dock-spacer]')) return;
  const b = document.body, de = document.documentElement;
  if (getComputedStyle(b).overflowY === 'hidden' || getComputedStyle(de).overflowY === 'hidden') return;
  if (de.scrollHeight <= innerHeight + 4) return;
  const s = document.createElement('div'); s.setAttribute('data-ch-dock-spacer', '1'); s.setAttribute('aria-hidden', 'true');
  s.style.cssText = 'height:calc(56px + env(safe-area-inset-bottom));pointer-events:none';
  b.appendChild(s);
}

/* Bare én meny/ett panel åpent: den som åpner, sier fra; de andre lukker seg. */
export const openOnly = who => window.dispatchEvent(new CustomEvent('ch-dock-open', { detail: who }));
export const onOtherOpen = (who, close) => window.addEventListener('ch-dock-open', e => { if (e.detail !== who) close(); });
