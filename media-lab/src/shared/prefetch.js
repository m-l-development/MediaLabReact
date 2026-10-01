/* Forhåndslasting av neste side. Når pekeren hviler på en lenke til en annen side i appen (eller fingeren treffer den),
   hentes sidens skript og stil i forkant (modulepreload/preload), så sidebyttet går raskere – særlig første gang etter
   en ny versjon. Ingenting kjøres før brukeren faktisk åpner siden, og bare samme opprinnelse brukes (CSP uendret).
   Hoppes over ved «spar data» eller svært treg forbindelse. */
const done = new Set();

export function pageOf(href, here = location) {
  if (!href || /^(#|javascript:|mailto:|tel:|blob:|data:)/i.test(href)) return null;
  let u; try { u = new URL(href, here.href); } catch (e) { return null; }
  return u.origin === here.origin && /\.dc\.html$/.test(u.pathname) && u.pathname !== here.pathname ? u.pathname : null;
}

/* Skript og stil fra en bygget HTML-side (bare egne /assets/-filer). */
export function assetsOf(html) {
  const out = [];
  for (const m of String(html).matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="(\/assets\/[^"?#]+\.(js|css))"/g)) if (!out.some(x => x.path === m[1])) out.push({ path: m[1], kind: m[2] });
  return out;
}

async function prefetch(path) {
  if (done.has(path)) return; done.add(path);
  const c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
  try {
    const r = await fetch(path, { credentials: 'same-origin' });
    if (!r.ok || r.redirected) return;   /* f.eks. utlogget: ingenting å forhåndslaste */
    const have = new Set([...document.querySelectorAll('script[src],link[href]')].map(e => { try { return new URL(e.src || e.href, location.href).pathname; } catch (x) { return ''; } }));
    for (const a of assetsOf(await r.text())) {
      if (have.has(a.path)) continue;
      const l = document.createElement('link');
      if (a.kind === 'js') l.rel = 'modulepreload'; else { l.rel = 'preload'; l.as = 'style'; }
      l.crossOrigin = ''; l.href = a.path; document.head.appendChild(l);
    }
  } catch (e) {}
}

let timer = 0;
function on(e) {
  const a = e.target && e.target.closest && e.target.closest('a[href],a[data-ml-href]'); if (!a) return;
  const p = pageOf(a.getAttribute('href') || a.getAttribute('data-ml-href')); if (!p || done.has(p)) return;
  clearTimeout(timer);
  if (e.type === 'pointerover' && e.pointerType === 'mouse') timer = setTimeout(() => prefetch(p), 80); else prefetch(p);
}
if (typeof document !== 'undefined' && !window.__mlPrefetch) {
  window.__mlPrefetch = true;
  for (const t of ['pointerover', 'pointerdown', 'touchstart']) document.addEventListener(t, on, { passive: true });
  document.addEventListener('focusin', on);
}
