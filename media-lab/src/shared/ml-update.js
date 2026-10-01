/* Varsler alle som har siden åpen når en ny versjon er publisert.
   Hvert bygg får et eget nummer (__ML_BUILD__) og filen version.json (se vite.config.js).
   Siden sjekker omtrent hvert minutt og når fanen blir synlig igjen. Ved ny versjon lagres arbeidet
   (appene melder seg på med onUpdate) og et kort med «Oppdater nå» / «Senere» vises. Ingen tvungen omlasting.
   Uavhengig av vertstjeneste. I utvikling (npm run dev) er den av. */
/* global __ML_BUILD__ */
const BUILD = typeof __ML_BUILD__ === 'string' ? __ML_BUILD__ : 'dev';
const EVERY = 60 * 1000, SNOOZE = 10 * 60 * 1000;
const hooks = new Set();
let box = null, snoozeUntil = 0, started = false;
const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);

/* h = { save(): Promise<true|false|null>, busy(): bool, note(): bool }
   save: true = lagret, false = kunne ikke lagre, null = ingenting å lagre. busy: vent (f.eks. eksport). note: noe kan ikke lagres – be om nedlasting. */
export function onUpdate(h) { hooks.add(h); start(); return () => hooks.delete(h); }

async function saveAll() {
  let saved = false, failed = false, note = false;
  for (const h of hooks) {
    try { if (h.note && h.note()) note = true; } catch (e) {}
    if (!h.save) continue;
    try { const r = await h.save(); if (r === true) saved = true; else if (r === false) failed = true; } catch (e) { failed = true; }
  }
  return { saved, failed, note };
}
const isBusy = () => [...hooks].some(h => { try { return !!(h.busy && h.busy()); } catch (e) { return false; } });

async function check() {
  if (BUILD === 'dev' || box || document.hidden || Date.now() < snoozeUntil) return;
  let v = null;
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) v = (await r.json()).v; } catch (e) { return; }
  if (typeof v !== 'string' || !v || v === BUILD || box || isBusy()) return;
  show();
}

/* kortet er lyst (lysere enn bakgrunnen i begge moduser) og merket data-ml-theme, så theme.js ikke snur fargene */
function btn(label, primary) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = T(label);
  b.style.cssText = 'height:36px;padding:0 16px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;letter-spacing:0.04em;cursor:pointer;' +
    (primary ? 'border:1px solid #111111;background:#111111;color:#f3f1ec;' : 'border:1px solid rgba(0,0,0,0.25);background:transparent;color:#111111;');
  return b;
}
function hide() { if (!box) return; const b = box; box = null; b.style.opacity = '0'; b.style.transform = 'translateY(12px)'; setTimeout(() => b.remove(), 260); }

async function show() {
  if (box || !document.body) return;
  const narrow = window.matchMedia && matchMedia('(max-width: 560px)').matches;
  const light = document.documentElement.getAttribute('data-ml-mode') === 'light';
  box = document.createElement('div'); box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-live', 'polite'); box.setAttribute('data-ml-update', '1'); box.setAttribute('data-ml-theme', '1');
  box.style.cssText = 'position:fixed;left:20px;' + (narrow ? 'right:20px;bottom:88px;' : 'bottom:20px;width:360px;max-width:calc(100vw - 40px);') +
    'z-index:9999;display:flex;flex-direction:column;gap:10px;padding:16px;border:1px solid rgba(0,0,0,0.12);border-radius:18px;background:' + (light ? '#ffffff' : '#f3f1ec') + ';' +
    'box-shadow:0 20px 50px rgba(0,0,0,' + (light ? '0.18' : '0.55') + ');color:#111111;font-family:Archivo,"Helvetica Neue",Helvetica,Arial,sans-serif;' +
    'opacity:0;transform:translateY(12px);transition:opacity 250ms ease,transform 250ms ease;';
  const h = document.createElement('strong'); h.textContent = T('Ny versjon av Media Lab er klar'); h.style.cssText = 'font-size:14px;font-weight:700;line-height:1.3;';
  const p = document.createElement('span'); p.style.cssText = 'font-size:12.5px;line-height:1.5;color:#4a4740;text-wrap:pretty;';
  const hasSave = [...hooks].some(x => x.save);
  p.textContent = T(hasSave ? 'Lagrer arbeidet ditt …' : 'Oppdater siden for å få de nyeste endringene.');
  const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
  const go = btn('Oppdater nå', true), later = btn('Senere', false);
  go.onclick = async () => { go.disabled = later.disabled = true; go.textContent = T('Lagrer …'); await saveAll(); location.reload(); };
  later.onclick = () => { snoozeUntil = Date.now() + SNOOZE; hide(); };
  row.appendChild(go); row.appendChild(later); box.appendChild(h); box.appendChild(p); box.appendChild(row);
  document.body.appendChild(box); requestAnimationFrame(() => { if (box) { box.style.opacity = '1'; box.style.transform = 'none'; } });
  const r = await saveAll();
  p.textContent = T(r.failed ? 'Noe kunne ikke lagres automatisk. Lagre selv før du oppdaterer.'
    : r.note ? 'Last ned det du jobber med før du oppdaterer. Det lagres ikke automatisk.'
    : r.saved ? 'Arbeidet ditt er lagret.' : 'Oppdater siden for å få de nyeste endringene.');
}

function start() {
  if (started || BUILD === 'dev') return; started = true;
  setInterval(check, EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
start();
