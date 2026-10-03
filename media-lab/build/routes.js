/* Korte nettadresser for ConnectHub. Én kilde for vercel.json (rewrites/redirects, kontrollert i routes.test.js), de lokale
   serverne (vite dev/preview og static-serve.mjs) og sperren foran sidene (server/lib/gate.js).
   - Sidene ligger fortsatt som <navn>.dc.html i bygget; den korte adressen skrives om (rewrite) til filen.
   - Gamle .dc.html-adresser sendes videre (307) til den korte, med samme spørring, så bokmerker og lenker i e-post virker.
   - Snarveier (Fellesmappe m.fl.) åpner admin-siden; siden velger riktig visning ut fra stien (connecthub-admin/ui.jsx).
   - Alle adresser er relative til domenet – ingen domenenavn her (se docs/domenebytte.md). */
export const ROUTES = [
  ['/home', 'media-lab.dc.html'],
  ['/login', 'login.dc.html'],
  ['/loopstudio', 'loop-studio.dc.html'],
  ['/loopeditor', 'studio-editor.dc.html'],
  ['/thumbnailstudio', 'thumbnail-studio.dc.html'],
  ['/photodesign', 'photo-design.dc.html'],
  ['/motiondesign', 'motion-design.dc.html'],
  ['/isolate', 'isolate-subject.dc.html'],
  ['/mockup', 'mockups.dc.html'],
  ['/admin', 'connecthub-admin.dc.html'],
];
/* Snarveier til visninger i admin-siden: sti → hash-rute i connecthub-admin. */
export const SHORTCUTS = [
  ['/fellesmappe', 'filer/felles'],
  ['/samarbeidsmappe', 'filer/samarbeid'],
  ['/fastebilder', 'filer/faste'],
  ['/ressurser', 'filer/faste'],
];
export const START = '/home';

const byPath = new Map([...ROUTES, ...SHORTCUTS.map(([p]) => [p, 'connecthub-admin.dc.html'])]);
const byFile = new Map(ROUTES.map(([p, f]) => [f, p]));
/* Kort sti → filen som skal leveres (eller null). Godtar også avsluttende skråstrek. */
export function fileFor(pathname) { const p = String(pathname || '').replace(/\/+$/, '') || '/'; return byPath.get(p) || null; }
/* Gammel filsti (/media-lab.dc.html) → kort sti (/home), ellers null. */
export function routeForFile(pathname) { const m = /^\/([a-z0-9-]+\.dc\.html)$/.exec(String(pathname || '')); return m ? byFile.get(m[1]) || null : null; }

/* vercel.json-delene som skal finnes (routes.test.js kontrollerer at filen stemmer). */
export function vercelRoutes() {
  return {
    redirects: [{ source: '/', destination: START, permanent: false }, ...ROUTES.map(([p, f]) => ({ source: '/' + f, destination: p, permanent: false }))],
    rewrites: [...ROUTES, ...SHORTCUTS.map(([p]) => [p, 'connecthub-admin.dc.html'])].map(([p, f]) => ({ source: p, destination: '/' + f })),
  };
}

/* Mellomvare for de lokale serverne (samme oppførsel som Vercel). */
export function localRoutes(req, res, next) {
  const u = new URL(req.url, 'http://lokal');
  if (u.pathname === '/') { res.statusCode = 307; res.setHeader('Location', START + u.search); return res.end(); }
  const r = routeForFile(u.pathname);
  if (r) { res.statusCode = 307; res.setHeader('Location', r + u.search); return res.end(); }
  const f = fileFor(u.pathname);
  if (f) req.url = '/' + f + u.search;
  next();
}
