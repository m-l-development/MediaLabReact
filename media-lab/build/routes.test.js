import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUTES, SHORTCUTS, fileFor, routeForFile, vercelRoutes, localRoutes } from './routes.js';
import { isPublicPath } from '../server/lib/gate.js';
import { safeNext } from '../src/services/auth.js';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('ruter: vercel.json har nøyaktig rewrites og redirects fra build/routes.js', () => {
  const v = vercelRoutes();
  assert.deepEqual(vercel.rewrites, v.rewrites);
  assert.deepEqual(vercel.redirects, v.redirects);
  assert.equal(vercel.cleanUrls, false);
});
test('ruter: hver kort adresse peker på en side som finnes, og navnene kolliderer ikke med api/eller statiske mapper', () => {
  for (const [p, f] of ROUTES) {
    assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), f);
    assert.match(p, /^\/[a-z]+$/);
    assert.ok(!/^\/(api|assets|images|mockups|vendor|fonts)$/.test(p), p);
  }
  for (const [p] of SHORTCUTS) assert.equal(fileFor(p), 'connecthub-admin.dc.html');
  assert.equal(new Set([...ROUTES, ...SHORTCUTS].map(r => r[0])).size, ROUTES.length + SHORTCUTS.length, 'unike stier');
});
test('ruter: oppslag begge veier', () => {
  assert.equal(fileFor('/home'), 'media-lab.dc.html'); assert.equal(fileFor('/home/'), 'media-lab.dc.html'); assert.equal(fileFor('/nope'), null);
  assert.equal(routeForFile('/studio-editor.dc.html'), '/loopeditor'); assert.equal(routeForFile('/loop-editor.dc.html'), null); assert.equal(routeForFile('/x/media-lab.dc.html'), null);
});
test('ruter: lokal mellomvare skriver om, sender gamle adresser videre med spørring, og / til startsiden', () => {
  const call = url => { const req = { url }, res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() { this.ended = true; } }; let n = false; localRoutes(req, res, () => { n = true; }); return { req, res, n }; };
  assert.equal(call('/admin?x=1').req.url, '/connecthub-admin.dc.html?x=1');
  const r = call('/media-lab.dc.html?a=b'); assert.equal(r.res.statusCode, 307); assert.equal(r.res.headers.Location, '/home?a=b');
  assert.equal(call('/').res.headers.Location, '/home');
  assert.equal(call('/assets/x.js').n, true);
});
test('sperren: alle korte sider krever innlogging, bare /login er offentlig', () => {
  for (const [p] of [...ROUTES, ...SHORTCUTS]) assert.equal(isPublicPath(p), p === '/login', p);
});
test('innlogging: «next» godtar korte interne stier, aldri innloggingssiden eller andre domener', () => {
  assert.equal(safeNext('/loopeditor?mal=week'), '/loopeditor?mal=week');
  for (const bad of ['/login', '/login?next=/x', '/login.dc.html', 'https://evil.example/', '//evil.example', '']) assert.equal(safeNext(bad), '/home', bad);
});
