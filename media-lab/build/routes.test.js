import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUTES, SHORTCUTS, APP_TARGET, START, fileFor, routeForFile, redirectFor, vercelRoutes, localRoutes } from './routes.js';
import { isPublicPath } from '../server/lib/gate.js';
import { safeNext } from '../src/services/auth.js';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('ruter: vercel.json har nøyaktig rewrites og redirects fra build/routes.js', () => {
  const v = vercelRoutes();
  assert.deepEqual(vercel.rewrites, v.rewrites);
  assert.deepEqual(vercel.redirects, v.redirects);
  assert.equal(vercel.cleanUrls, false);
});
test('ruter: alle omdirigeringer er midlertidige (kan rulles tilbake)', () => {
  for (const r of vercel.redirects) assert.equal(r.permanent, false, r.source);
});
test('lanseringen: korte adresser og gamle sider går til den nye appen; /login blir dagens innloggingsside', () => {
  const want = {
    '/': '/app/', '/home': '/app/', '/loopstudio': '/app/loop-studio', '/loopeditor': '/app/loop-studio',
    '/thumbnailstudio': '/app/thumbnail-studio', '/photodesign': '/app/photo-design', '/motiondesign': '/app/motion-design',
    '/isolate': '/app/isolate-subject', '/mockup': '/app/mockups', '/admin': '/app/admin',
    '/fellesmappe': '/app/admin#/filer/felles', '/samarbeidsmappe': '/app/admin#/filer/samarbeid', '/fastebilder': '/app/admin#/filer/faste', '/ressurser': '/app/admin#/filer/faste',
    '/media-lab.dc.html': '/app/', '/isolate-subject.dc.html': '/app/isolate-subject', '/connecthub-admin.dc.html': '/app/admin', '/studio-editor.dc.html': '/app/loop-studio',
    '/login.dc.html': '/login',
  };
  for (const [p, d] of Object.entries(want)) assert.equal(redirectFor(p), d, p);
  for (const p of ['/login', '/app/', '/app/admin', '/assets/x.js', '/api/ch', '/images/a.png']) assert.equal(redirectFor(p), null, p);
  // hver kort adresse har et mål i den nye appen, og hvert mål er en side appen kjenner
  for (const [p] of [...ROUTES, ...SHORTCUTS]) if (p !== '/login') assert.match(APP_TARGET[p], /^\/app\/(|loop-studio|thumbnail-studio|photo-design|motion-design|isolate-subject|mockups|admin)(#\/filer\/(felles|samarbeid|faste))?$/, p);
  assert.equal(START, '/app/');
});
test('ruter: dagens sider finnes fortsatt i bygget (e-postlenker og tilbakeføring), og navnene kolliderer ikke', () => {
  for (const [p, f] of ROUTES) {
    assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), f);
    assert.match(p, /^\/[a-z]+$/);
    assert.ok(!/^\/(api|assets|images|mockups|vendor|fonts|app)$/.test(p), p);
  }
  for (const [p] of SHORTCUTS) assert.equal(fileFor(p), 'connecthub-admin.dc.html');
  assert.equal(new Set([...ROUTES, ...SHORTCUTS].map(r => r[0])).size, ROUTES.length + SHORTCUTS.length, 'unike stier');
  assert.equal(fileFor('/home'), 'media-lab.dc.html'); assert.equal(fileFor('/nope'), null);
  assert.equal(routeForFile('/studio-editor.dc.html'), '/loopeditor'); assert.equal(routeForFile('/x/media-lab.dc.html'), null);
});
test('ruter: lokal mellomvare som Vercel – 307 med spørring, ikke inn i #-adresser; /login og /app skrives om', () => {
  const call = url => { const req = { url }, res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() { this.ended = true; } }; let n = false; localRoutes(req, res, () => { n = true; }); return { req, res, n }; };
  const a = call('/photodesign?import=x'); assert.equal(a.res.statusCode, 307); assert.equal(a.res.headers.Location, '/app/photo-design?import=x');
  assert.equal(call('/fellesmappe?x=1').res.headers.Location, '/app/admin#/filer/felles');
  assert.equal(call('/').res.headers.Location, '/app/');
  assert.equal(call('/login.dc.html?token_hash=abc&type=recovery').res.headers.Location, '/login?token_hash=abc&type=recovery');
  const l = call('/login?next=/app/'); assert.equal(l.req.url, '/login.dc.html?next=/app/'); assert.equal(l.n, true);
  assert.equal(call('/app/admin').req.url, '/app/index.html');
  assert.equal(call('/assets/x.js').n, true);
});
test('sperren: alle korte sider krever innlogging, bare /login er offentlig', () => {
  for (const [p] of [...ROUTES, ...SHORTCUTS]) assert.equal(isPublicPath(p), p === '/login', p);
});
test('innlogging: «next» godtar korte interne stier og /app/, aldri innloggingssiden eller andre domener', () => {
  assert.equal(safeNext('/loopeditor?mal=week'), '/loopeditor?mal=week');
  assert.equal(safeNext('/app/admin'), '/app/admin');
  for (const bad of ['/login', '/login?next=/x', '/login.dc.html', 'https://evil.example/', '//evil.example', '']) assert.equal(safeNext(bad), '/home', bad);
});
test('den nye appen: /app og alle sider under gir app/index.html, filer leveres direkte', () => {
  for (const p of ['/app', '/app/', '/app/admin', '/app/photo-design', '/app/medier/', '/app/admin/brukere']) assert.equal(fileFor(p), 'app/index.html', p);
  for (const p of ['/app/assets/index-abc.js', '/app/manifest.webmanifest', '/app/images/app-icon-192.png', '/app/version.json']) assert.equal(fileFor(p), null, p);
  for (const p of ['/apps', '/application', '/home', '/admin']) assert.notEqual(fileFor(p), 'app/index.html', p);
});
