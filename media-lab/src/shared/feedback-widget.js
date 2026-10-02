/* Tilbakemeldingsknapp (nede til høyre, ved siden av kontoknappen) på alle innloggede sider, med skjema og markering
   av element/område på skjermen. Samme stil som kontomenyen. Sender via services/feedback.js (databasen avgjør tilgang). */
/* global __ML_BUILD__, __ML_COMMIT__, __ML_BRANCH__ */
import { feedback as FB } from '../services/feedback.js';
import { appOf, cleanPath, cleanView, browserOf, deviceOf, scrubText, scrubSecrets, scrubDeep, KIND } from './feedback-core.js';
import { recentErrors } from './feedback-errors.js';
import { dockButton, openOnly, onOtherOpen } from './dock.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const Z = 2147482000;
const STYLE = `
.chfb-panel{position:fixed;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));z-index:${Z + 2};width:390px;max-width:calc(100vw - 24px);max-height:calc(100vh - 72px);overflow:auto;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;background:#f3f1ec;color:#111;font:500 13px/1.45 Archivo,Helvetica,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.45);box-sizing:border-box}
.chfb-panel *{box-sizing:border-box}
.chfb-panel h2{margin:0;font-size:16px;font-weight:800}
.chfb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.chfb-cats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.chfb-cat{min-height:42px;padding:6px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.2);background:#fff;color:#111;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer;text-align:left}
.chfb-cat[aria-checked="true"]{background:#111;color:#f3f1ec;border-color:#111}
.chfb-panel label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#3b3934}
.chfb-panel input,.chfb-panel textarea,.chfb-panel select{font:inherit;font-weight:500;font-size:14px;color:#111;background:#fff;border:1px solid rgba(0,0,0,.25);border-radius:10px;padding:8px 10px;width:100%}
.chfb-panel textarea{min-height:84px;resize:vertical}
.chfb-btn{min-height:40px;padding:0 16px;border-radius:999px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid #111;background:#111;color:#f3f1ec}
.chfb-btn.light{background:transparent;color:#111;border-color:rgba(0,0,0,.3)}
.chfb-btn:disabled{opacity:.55;cursor:default}
.chfb-note{font-size:12px;color:#5a5750}
.chfb-warn{font-size:12px;color:#7a4a00;background:#fff4d6;border-radius:10px;padding:8px 10px}
.chfb-err{font-size:12.5px;color:#9b1c3c;background:#fbe9ee;border-radius:10px;padding:8px 10px}
.chfb-ok{font-size:14px;font-weight:700}
.chfb-mark{font-size:12px;background:#fff;border:1px dashed #b07d00;border-radius:10px;padding:8px 10px}
.chfb-tech{font:500 11px/1.4 ui-monospace,Consolas,monospace;white-space:pre-wrap;background:#fff;border-radius:10px;padding:8px;max-height:160px;overflow:auto}
@media (max-width:600px){.chfb-panel{right:0;left:0;bottom:0;top:0;width:auto;max-width:none;max-height:none;border-radius:0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}}
/* Ikonet er 30 px som kontoknappen, men trykkflaten er 44 px på berøringsskjermer. */
.chfb-fab::after{content:'';position:absolute;inset:-7px}
.chfb-backdrop{position:fixed;inset:0;z-index:${Z + 1};background:rgba(0,0,0,.22);touch-action:manipulation}
.chfb-x{flex:0 0 auto;width:36px;height:36px;display:grid;place-items:center;border-radius:999px;border:1px solid rgba(0,0,0,.2);background:#fff;color:#111;font:600 22px/1 Archivo,Helvetica,sans-serif;cursor:pointer;padding:0}
.chfb-x:hover,.chfb-x:focus-visible{background:#ece9e2;outline:2px solid #9b1c3c;outline-offset:1px}
.chfb-pick{position:fixed;inset:0;z-index:${Z + 3};cursor:crosshair;touch-action:none;background:rgba(0,0,0,.04)}
.chfb-box{position:fixed;z-index:${Z + 4};pointer-events:none;border:2px solid #f5b301;background:rgba(245,179,1,.18);border-radius:4px;box-shadow:0 0 0 9999px rgba(0,0,0,.12)}
.chfb-bar{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:${Z + 5};display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 20px);padding:10px 12px;border-radius:14px;background:#111;color:#f3f1ec;font:600 13px/1.4 Archivo,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.chfb-bar button{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #f3f1ec;background:#f3f1ec;color:#111;font:inherit;font-weight:700;cursor:pointer}
.chfb-bar button.light{background:transparent;color:#f3f1ec}
.chfb-bar button:disabled{opacity:.5}
`;
const ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M12 8v4M12 15h.01"/></svg>';
const ERR = { rate_limited: 'Du har sendt mange tilbakemeldinger i dag. Prøv igjen senere.', invalid: 'Sjekk at beskrivelsen er fylt ut (minst 3 tegn).', forbidden: 'Du må være innlogget for å sende tilbakemelding.', unauthorized: 'Økten er utløpt. Last siden på nytt.', network: 'Ingen forbindelse. Prøv igjen.', timeout: 'Tidsavbrudd. Prøv igjen.' };
const QUESTIONS = {
  bug: { desc: 'Hva skjedde?', extra: [['expected', 'Hva forventet du skulle skje?', 'textarea'], ['steps', 'Hvordan kan problemet gjenskapes?', 'textarea'], ['severity', 'Hvor alvorlig er det?', 'level']] },
  improvement: { desc: 'Hva ønsker du skal forbedres?', extra: [['importance', 'Hvor viktig er dette for deg?', 'level']] },
  feature: { desc: 'Hva skal den nye funksjonen gjøre?', extra: [['importance', 'Hvor viktig er dette for deg?', 'level']] },
  other: { desc: 'Beskriv saken', extra: [] },
};
const CAT_LABEL = { bug: 'Rapporter en feil', improvement: 'Foreslå en forbedring', feature: 'Foreslå en ny funksjon', other: 'Annet' };
const LEVELS = [['', 'Velg …'], ['low', 'Lav'], ['medium', 'Middels'], ['high', 'Høy'], ['critical', 'Kritisk – hindrer arbeidet']];

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach(k => k && e.append(k)); return e; };
const mine = n => !!(n && n.closest && n.closest('[data-chfb]'));

/* ---------- Teknisk kontekst (trygg, grov) ---------- */
function technical() {
  const b = (window.CH && window.CH.backend) || {}, { browser, os } = browserOf(navigator.userAgent);
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  return scrubDeep({
    env: b.target || 'ukjent', build: typeof __ML_BUILD__ !== 'undefined' ? __ML_BUILD__ : null,
    commit: typeof __ML_COMMIT__ !== 'undefined' ? __ML_COMMIT__ : null, branch: typeof __ML_BRANCH__ !== 'undefined' ? __ML_BRANCH__ : null,
    browser, os, device: deviceOf(innerWidth, coarse), screen: screen.width + '×' + screen.height, viewport: innerWidth + '×' + innerHeight,
    dpr: Math.round((devicePixelRatio || 1) * 100) / 100, lang: document.documentElement.lang || navigator.language || '', tz, online: navigator.onLine,
    errors: recentErrors(),
  });
}

/* ---------- Elementinformasjon (aldri feltverdier eller tekst fra skjemafelt) ---------- */
const TEXT_OK = el => /^(button|a|h[1-6]|label|th|summary|legend|option)$/i.test(el.tagName) || /^(button|tab|link|menuitem|heading|checkbox|radio|switch)$/.test(el.getAttribute('role') || '');
function elementInfo(n0) {
  if (!n0 || n0.nodeType !== 1) return null;
  /* Trykk på ikon/tekst inne i en knapp eller lenke beskrives ved knappen/lenken (mer meningsfullt for feilsøking). */
  const n = n0.closest('button,a,[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=radio],h1,h2,h3,h4,label,summary,input,select,textarea') || n0;
  const tag = n.tagName.toLowerCase(), role = n.getAttribute('role') || ({ a: 'link', button: 'button', input: 'textbox', select: 'combobox', textarea: 'textbox', h1: 'heading', h2: 'heading', h3: 'heading' }[tag] || null);
  const field = /^(input|textarea|select)$/.test(tag) || n.isContentEditable;
  let label = n.getAttribute('aria-label') || n.getAttribute('title') || '';
  if (!label && !field && TEXT_OK(n)) label = (n.innerText || n.textContent || '').trim().replace(/\s+/g, ' ');
  const attrs = {}, up = n.closest('[data-debug-id]'), tpl = n.closest('[data-dc-tpl]');
  if (up) attrs['data-debug-id'] = up.getAttribute('data-debug-id');
  if (tpl) attrs['data-dc-tpl'] = tpl.getAttribute('data-dc-tpl');
  for (const a of n.attributes) if (/^data-(ch|ml)-/.test(a.name) && Object.keys(attrs).length < 6) attrs[a.name] = (a.value || '').slice(0, 40);
  if (n.id && n.id.length <= 40 && !/[0-9a-f]{8}-/.test(n.id)) attrs.id = n.id;
  if (field) { if (n.name) attrs.name = String(n.name).slice(0, 40); if (n.type) attrs.type = String(n.type).slice(0, 20); }
  const seg = e => { const cls = [...(e.classList || [])].filter(c => c.length < 30 && !/\d{3}/.test(c)).slice(0, 2); return e.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''); };
  const path = []; for (let e = n, i = 0; e && e.nodeType === 1 && e !== document.body && i < 5; e = e.parentElement, i++) path.unshift(seg(e));
  return scrubDeep({ tag, role, label: scrubText(label).slice(0, 80) || null, path: path.join(' > ').slice(0, 200), attrs });
}

/* ---------- Markering av element eller område ---------- */
function pickArea(done) {
  const pick = el('div', { class: 'chfb-pick', 'data-chfb': '1', role: 'application', 'aria-label': T('Marker et område på skjermen') });
  const box = el('div', { class: 'chfb-box', 'data-chfb': '1' }); box.style.display = 'none';
  const ok = el('button', { type: 'button', disabled: true, text: T('Bekreft markering') });
  const again = el('button', { type: 'button', class: 'light', text: T('Velg på nytt') });
  const cancel = el('button', { type: 'button', class: 'light', text: T('Avbryt') });
  const hint = el('span', { text: T('Trykk på det du vil vise oss, eller dra for å markere et område.') });
  const bar = el('div', { class: 'chfb-bar', 'data-chfb': '1', role: 'toolbar' }, hint, ok, again, cancel);
  let start = null, sel = null, drag = false;
  const show = r => { Object.assign(box.style, { display: 'block', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); };
  const under = (x, y) => document.elementsFromPoint(x, y).find(n => !mine(n) && n !== document.documentElement && n !== document.body) || null;
  const rectOf = n => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  pick.addEventListener('pointerdown', e => { stop(e); start = { x: e.clientX, y: e.clientY }; drag = false; try { pick.setPointerCapture(e.pointerId); } catch (x) {} });
  pick.addEventListener('pointermove', e => {
    stop(e);
    if (start) { const dx = e.clientX - start.x, dy = e.clientY - start.y; if (Math.hypot(dx, dy) > 8) drag = true;
      if (drag) show({ x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY), w: Math.abs(dx), h: Math.abs(dy) }); return; }
    if (!sel && e.pointerType === 'mouse') { const n = under(e.clientX, e.clientY); if (n) show(rectOf(n)); }
  });
  pick.addEventListener('pointerup', e => {
    stop(e); if (!start) return;
    if (drag) { const r = { x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY), w: Math.abs(e.clientX - start.x), h: Math.abs(e.clientY - start.y) };
      sel = { mode: 'area', r, node: under(r.x + r.w / 2, r.y + r.h / 2) }; show(r); }
    else { const n = under(e.clientX, e.clientY); if (n) { sel = { mode: 'element', r: rectOf(n), node: n }; show(sel.r); } }
    start = null; drag = false; ok.disabled = !sel;
    hint.textContent = T(sel ? 'Er markeringen riktig?' : 'Trykk på det du vil vise oss, eller dra for å markere et område.');
  });
  ['click', 'dblclick', 'contextmenu', 'touchstart', 'touchmove', 'wheel'].forEach(t => pick.addEventListener(t, stop, { passive: false }));
  const key = e => { if (e.key === 'Escape') { stop(e); finish(null); } };
  const finish = result => { document.removeEventListener('keydown', key, true); pick.remove(); box.remove(); bar.remove(); done(result); };
  again.onclick = () => { sel = null; box.style.display = 'none'; ok.disabled = true; hint.textContent = T('Trykk på det du vil vise oss, eller dra for å markere et område.'); };
  cancel.onclick = () => finish(null);
  ok.onclick = () => {
    if (!sel) return;
    const W = innerWidth, H = innerHeight, p = v => Math.round(v * 1000) / 10;
    finish({ mode: sel.mode, rect: { x: p(sel.r.x / W), y: p(sel.r.y / H), w: p(sel.r.w / W), h: p(sel.r.h / H) },
      px: { x: Math.round(sel.r.x), y: Math.round(sel.r.y), w: Math.round(sel.r.w), h: Math.round(sel.r.h) },
      viewport: W + '×' + H, scroll: { x: Math.round(scrollX), y: Math.round(scrollY) }, element: elementInfo(sel.node) });
  };
  document.addEventListener('keydown', key, true);
  document.body.append(pick, box, bar);
}
const markText = m => {
  if (!m) return '';
  const e = m.element || {};
  return (m.mode === 'area' ? T('Område') : T('Element')) + (e.tag ? ' <' + e.tag + '>' : '') + (e.label ? ' «' + e.label + '»' : '') + ` – x ${m.rect.x} %, y ${m.rect.y} %, ${m.rect.w} × ${m.rect.h} %`;
};

/* ---------- Knapp og skjema ---------- */
export function mountFeedback(me) {
  if (!me || document.querySelector('[data-ch-feedback]')) return;
  if (!document.getElementById('chfb-style')) document.head.append(el('style', { id: 'chfb-style', text: STYLE }));
  const dark = () => document.documentElement.getAttribute('data-ml-mode') !== 'light';
  const btn = el('button', { type: 'button', class: 'chfb-fab', 'data-ch-feedback': '1', 'data-chfb': '1', 'data-keep-color': '1', title: T('Send tilbakemelding'), 'aria-label': T('Send tilbakemelding') });
  btn.innerHTML = ICON;
  const paint = () => { const d = dark(); btn.style.cssText = `position:relative;pointer-events:auto;order:1;flex:0 0 auto;width:30px;height:30px;padding:0;display:grid;place-items:center;border-radius:999px;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:.85;border:1px solid ` + (d ? 'rgba(255,255,255,.18);background:rgba(0,0,0,.45);color:#e9e7e2' : 'rgba(0,0,0,.14);background:rgba(228,225,218,.85);color:#3b3934'); };
  paint(); window.addEventListener('medialab-theme', paint);
  dockButton(btn, 'feedback');

  /* Skjemaet beholdes mens siden er åpen. Lukking (X, Avbryt, Escape eller trykk utenfor boksen) spør først hvis noe
     er fylt inn eller markert, så ingenting forsvinner ved et uhell. Trykk inne i boksen lukker den aldri. */
  const st = { kind: null, title: '', description: '', answers: {}, where: '', marked: null, sending: false, sent: null, error: '', showTech: false };
  let panel = null, backdrop = null;
  const typed = () => (st.description + st.title + Object.values(st.answers).join('') + st.where).trim().length + (st.marked ? 1 : 0);
  const close = (force) => {
    if (!panel) return;
    if (!force && !st.sent && typed() > 0 && !confirm(T('Forkaste teksten du har skrevet?'))) return;
    panel.remove(); panel = null; if (backdrop) { backdrop.remove(); backdrop = null; }
    document.removeEventListener('keydown', onKey, true); btn.focus();
    if (st.sent || force === 'reset') Object.assign(st, { kind: null, title: '', description: '', answers: {}, where: '', marked: null, sent: null, error: '' });
  };
  onOtherOpen('feedback', () => close());
  const onKey = e => { if (e.key === 'Escape' && panel) { e.stopPropagation(); close(); } };
  const here = () => { const a = appOf(location.pathname); return { app: a.id, appName: a.name, page: cleanPath(location.pathname), view: cleanView(location.hash) }; };

  const render = () => {
    const h = here();
    if (!panel) {
      openOnly('feedback');
      /* Bakgrunn bak boksen: et trykk som både starter og slutter utenfor boksen lukker (dra fra boksen og ut lukker ikke). */
      backdrop = el('div', { class: 'chfb-backdrop', 'data-chfb': '1', 'data-chfb-backdrop': '1', 'aria-hidden': 'true' });
      let downOnBackdrop = false;
      backdrop.addEventListener('pointerdown', e => { downOnBackdrop = e.target === backdrop; });
      backdrop.addEventListener('click', e => { if (e.target === backdrop && downOnBackdrop) close(); downOnBackdrop = false; });
      panel = el('div', { class: 'chfb-panel', 'data-chfb': '1', 'data-ml-theme': '1', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'chfb-title' });
      document.body.append(backdrop, panel); document.addEventListener('keydown', onKey, true);
    }
    panel.textContent = '';
    const head = el('div', { class: 'chfb-row', style: 'justify-content:space-between;flex-wrap:nowrap' }, el('h2', { id: 'chfb-title', text: T('Send tilbakemelding') }),
      el('button', { type: 'button', class: 'chfb-x', 'data-chfb-close': '1', title: T('Lukk'), 'aria-label': T('Lukk'), onclick: () => close() }, el('span', { 'aria-hidden': 'true', text: '×' })));
    panel.append(head);
    if (st.sent) {
      panel.append(el('p', { class: 'chfb-ok', 'data-chfb-ok': '1', text: T('Takk! Tilbakemeldingen er sendt inn.') }),
        el('p', { text: T('Referansenummer') + ': ' }, el('strong', { 'data-chfb-ref': '1', text: st.sent })),
        el('p', { class: 'chfb-note', text: T('Bruk referansenummeret hvis du vil følge opp saken.') }),
        el('div', { class: 'chfb-row' }, el('button', { type: 'button', class: 'chfb-btn', text: T('Lukk'), onclick: () => close(true) })));
      return;
    }
    const cats = el('div', { class: 'chfb-cats', role: 'radiogroup', 'aria-label': T('Kategori') },
      ...Object.keys(CAT_LABEL).map(k => el('button', { type: 'button', class: 'chfb-cat', role: 'radio', 'aria-checked': st.kind === k ? 'true' : 'false', 'data-kind': k, text: T(CAT_LABEL[k]),
        onclick: () => { st.kind = k; st.error = ''; render(); const d = panel.querySelector('textarea[name=description]'); if (d) d.focus(); } })));
    panel.append(cats, el('p', { class: 'chfb-note', text: T('Gjelder') + ': ' + T(h.appName) + ' · ' + h.page + (h.view ? ' ' + h.view : '') }));
    if (!st.kind) { panel.append(el('p', { class: 'chfb-note', text: T('Velg hva tilbakemeldingen gjelder.') })); return; }
    const Q = QUESTIONS[st.kind];
    const field = (label, input) => el('label', {}, T(label), input);
    const ta = (name, value, onset, rows) => { const t = el('textarea', { name, rows: rows || 3, maxlength: name === 'description' ? 4000 : 2000 }); t.value = value || ''; t.addEventListener('input', () => onset(t.value)); return t; };
    const title = el('input', { name: 'title', maxlength: 140, autocomplete: 'off' }); title.value = st.title; title.addEventListener('input', () => { st.title = title.value; });
    panel.append(field('Hva gjelder tilbakemeldingen? (kort)', title));
    panel.append(field(T(Q.desc) + ' *', ta('description', st.description, v => { st.description = v; }, 4)));
    for (const [key, label, type] of Q.extra) {
      if (type === 'level') { const s = el('select', { name: key }, ...LEVELS.map(([v, l]) => el('option', { value: v, text: T(l) }))); s.value = st.answers[key] || ''; s.addEventListener('change', () => { st.answers[key] = s.value; }); panel.append(field(label, s)); }
      else panel.append(field(T(label) + ' (' + T('valgfritt') + ')', ta(key, st.answers[key], v => { st.answers[key] = v; }, 2)));
    }
    const where = el('input', { name: 'where', maxlength: 200, autocomplete: 'off', placeholder: T('F.eks. «Eksporter-knappen i Photo Design»') }); where.value = st.where; where.addEventListener('input', () => { st.where = where.value; });
    panel.append(field('Hvor i appen? (valgfritt)', where));
    /* Markering */
    const markBox = el('div', { class: 'chfb-row' });
    if (st.marked) markBox.append(el('div', { class: 'chfb-mark', 'data-chfb-marked': '1', style: 'flex:1 1 100%', text: T('Markert') + ': ' + markText(st.marked) }),
      el('button', { type: 'button', class: 'chfb-btn light', text: T('Marker på nytt'), onclick: startPick }),
      el('button', { type: 'button', class: 'chfb-btn light', text: T('Fjern markering'), onclick: () => { st.marked = null; render(); } }));
    else markBox.append(el('button', { type: 'button', class: 'chfb-btn light', 'data-chfb-pick': '1', text: T('Marker et område på skjermen'), onclick: startPick }));
    panel.append(markBox);
    /* Teknisk informasjon og personvern */
    const tech = technical();
    panel.append(el('p', { class: 'chfb-note' }, T('Noe teknisk informasjon legges ved for å gjøre feilsøkingen enklere (miljø, versjon, nettleser, skjermstørrelse og eventuelle feilmeldinger).') + ' ',
      el('button', { type: 'button', class: 'chfb-btn light', style: 'min-height:28px;padding:0 10px;font-size:12px', text: T(st.showTech ? 'Skjul' : 'Vis'), onclick: () => { st.showTech = !st.showTech; render(); } })));
    if (st.showTech) panel.append(el('div', { class: 'chfb-tech', text: Object.entries(tech).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.length + ' ' + T('feilmeldinger') : v)).join('\n') }));
    panel.append(el('p', { class: 'chfb-warn', text: T('Ikke skriv passord, API-nøkler eller andre hemmeligheter. Kjente mønstre for slikt fjernes automatisk.') }));
    if (st.error) panel.append(el('p', { class: 'chfb-err', role: 'alert', text: st.error }));
    const send = el('button', { type: 'button', class: 'chfb-btn', 'data-chfb-send': '1', disabled: st.sending, text: T(st.sending ? 'Sender …' : 'Send inn'), onclick: submit });
    panel.append(el('div', { class: 'chfb-row' }, send, el('button', { type: 'button', class: 'chfb-btn light', text: T('Avbryt'), onclick: () => close() })));
  };
  function startPick() {
    if (!panel) return;
    panel.style.display = 'none'; btn.style.visibility = 'hidden'; if (backdrop) backdrop.style.display = 'none';
    pickArea(m => { if (m) st.marked = m; btn.style.visibility = ''; if (backdrop) backdrop.style.display = ''; if (panel) { panel.style.display = ''; render(); } });
  }
  async function submit() {
    if (st.sending) return;
    if (st.description.trim().length < 3) { st.error = T('Skriv en beskrivelse (minst 3 tegn).'); render(); return; }
    st.sending = true; st.error = ''; render();
    const h = here(), me0 = (window.CH && window.CH.realMe) || me, churches = me0.churches || [];
    const answers = {}; for (const [k, v] of Object.entries(st.answers)) if (v) answers[k] = /^(importance|severity)$/.test(k) ? v : scrubText(v).slice(0, 2000);
    if (st.where.trim()) answers.where = scrubText(st.where.trim()).slice(0, 200);
    try {
      const r = await FB.submit({ kind: st.kind, title: scrubText(st.title.trim()).slice(0, 140), description: scrubText(st.description.trim()).slice(0, 4000), answers,
        app: h.app, appName: h.appName, page: h.page, view: h.view, marked: st.marked ? scrubDeep(st.marked) : null, context: technical(),
        churchId: churches.length === 1 ? churches[0].id : null });
      if (!r || !r.ref) throw Object.assign(new Error(), { code: 'unknown' });
      st.sent = r.ref;
    } catch (e) { st.error = T(ERR[e && e.code] || 'Tilbakemeldingen ble ikke sendt. Prøv igjen – teksten din er tatt vare på.'); }
    st.sending = false; render();
  }
  btn.onclick = () => { if (panel) close(); else { render(); const f = panel.querySelector('[role=radio]'); if (f) f.focus(); } };
}
export const _test = { elementInfo, markText, KIND, scrubSecrets };
