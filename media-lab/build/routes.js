/* Korte nettadresser for ConnectHub. Én kilde for vercel.json (rewrites/redirects, kontrollert i routes.test.js), de lokale
   serverne (vite dev/preview og static-serve.mjs) og sperren foran sidene (server/lib/gate.js).
   Fra lanseringen (besluttet 2026-10-17, docs/lansering.md): de korte adressene og de gamle .dc.html-sidene sendes videre
   (307, midlertidig – kan rulles tilbake) til den nye appen under /app/. Unntak: /login og /login.dc.html er fortsatt
   dagens innloggingsside, fordi lenkene i e-post (nytt passord, invitasjon) lander der.
   - Snarveier (Fellesmappe m.fl.) åpner admin-visningen i den nye appen (samme #-adresser som før).
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
/* Snarveier til visninger i admin: sti → hash-rute i admin (samme i dagens og den nye appen). */
export const SHORTCUTS = [
  ['/fellesmappe', 'filer/felles'],
  ['/samarbeidsmappe', 'filer/samarbeid'],
  ['/fastebilder', 'filer/faste'],
  ['/ressurser', 'filer/faste'],
];
/* Den nye appen (web/, bygget til dist/app av build/web-app.js): én side som selv velger visning ut fra stien.
   Filer som finnes (app/assets/…, manifest, ikoner) leveres direkte; alle andre stier under /app får app/index.html. */
export const APP = '/app';
const APP_INDEX = 'app/index.html';
const isAppFile = p => /^\/app\/.+\.[a-z0-9]+$/i.test(p);
export const START = APP + '/';
export const LOGIN = '/login';
/* Hvor hver kort adresse hører hjemme i den nye appen. */
export const APP_TARGET = {
  '/home': START,
  '/loopstudio': APP + '/loop-studio',
  '/loopeditor': APP + '/loop-studio',
  '/thumbnailstudio': APP + '/thumbnail-studio',
  '/photodesign': APP + '/photo-design',
  '/motiondesign': APP + '/motion-design',
  '/isolate': APP + '/isolate-subject',
  '/mockup': APP + '/mockups',
  '/admin': APP + '/admin',
  ...Object.fromEntries(SHORTCUTS.map(([p, h]) => [p, APP + '/admin#/' + h])),
};

const byPath = new Map([...ROUTES, ...SHORTCUTS.map(([p]) => [p, 'connecthub-admin.dc.html'])]);
const byFile = new Map(ROUTES.map(([p, f]) => [f, p]));
/* Kort sti → dagens side (eller null). Brukes av tilbakemeldingen til å peke på koden; /app gir den nye appens side. */
export function fileFor(pathname) {
  const raw = String(pathname || ''), p = raw.replace(/\/+$/, '') || '/';
  if ((p === APP || p.startsWith(APP + '/')) && !isAppFile(raw)) return APP_INDEX;
  return byPath.get(p) || null;
}
/* Gammel filsti (/media-lab.dc.html) → kort sti (/home), ellers null. */
export function routeForFile(pathname) { const m = /^\/([a-z0-9-]+\.dc\.html)$/.exec(String(pathname || '')); return m ? byFile.get(m[1]) || null : null; }
/* Hvor en adresse skal sendes (307), eller null: korte adresser og gamle sider → den nye appen; /login.dc.html → /login. */
export function redirectFor(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  if (p === '/') return START;
  if (p === '/login.dc.html') return LOGIN;
  if (APP_TARGET[p]) return APP_TARGET[p];
  const short = routeForFile(p);
  return short && short !== LOGIN ? APP_TARGET[short] : null;
}

/* vercel.json-delene som skal finnes (routes.test.js kontrollerer at filen stemmer). */
export function vercelRoutes() {
  const files = ROUTES.filter(([p]) => p !== LOGIN).map(([p, f]) => ({ source: '/' + f, destination: APP_TARGET[p], permanent: false }));
  return {
    redirects: [
      { source: '/', destination: START, permanent: false },
      { source: '/login.dc.html', destination: LOGIN, permanent: false },
      ...Object.entries(APP_TARGET).map(([p, d]) => ({ source: p, destination: d, permanent: false })),
      ...files,
    ],
    rewrites: [
      { source: LOGIN, destination: '/login.dc.html' },
      // Vercel leverer filer som finnes før omskrivingene, så app/assets/… og manifestet kommer direkte
      { source: APP, destination: '/' + APP_INDEX },
      { source: APP + '/(.*)', destination: '/' + APP_INDEX },
    ],
  };
}

/* Mellomvare for de lokale serverne (samme oppførsel som Vercel). */
export function localRoutes(req, res, next) {
  const u = new URL(req.url, 'http://lokal');
  const to = redirectFor(u.pathname);
  if (to) {
    // som Vercel: spørringen følger med, men ikke inn i en #-adresse
    const loc = to.includes('#') ? to : to + u.search;
    res.statusCode = 307; res.setHeader('Location', loc); return res.end();
  }
  if (u.pathname === LOGIN || u.pathname === LOGIN + '/') { req.url = '/login.dc.html' + u.search; return next(); }
  const f = fileFor(u.pathname);
  if (f === APP_INDEX) req.url = '/' + f + u.search;
  next();
}
