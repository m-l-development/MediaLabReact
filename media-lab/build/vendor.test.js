import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fontCss, PACKAGES, FONTS, verify } from './vendor.js';

const lock = JSON.parse(fs.readFileSync(new URL('./vendor-lock.json', import.meta.url), 'utf8'));
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const CSP = vercel.headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value;

test('fontCss: beholder latin/latin-ext, gir vanlig familienavn og egne adresser', () => {
  const css = `/* x */\n@font-face {\n  font-family: 'Archivo Variable';\n  font-style: normal;\n  font-weight: 100 900;\n  src: url(./files/archivo-latin-wdth-normal.woff2) format('woff2-variations');\n  unicode-range: U+0000-00FF;\n}\n@font-face {\n  font-family: 'Archivo Variable';\n  src: url(./files/archivo-cyrillic-wdth-normal.woff2) format('woff2-variations');\n}`;
  const r = fontCss(css, 'Archivo');
  assert.deepEqual(r.files, ['archivo-latin-wdth-normal.woff2']);
  assert.match(r.css, /font-family:'Archivo';/); assert.match(r.css, /url\(\/fonts\/archivo-latin-wdth-normal\.woff2\)/); assert.doesNotMatch(r.css, /Variable|\.\/files/);
});

test('låsen dekker alle pakker og fonter, og alle verdier er SHA-384', () => {
  for (const p of PACKAGES) assert.ok(Object.keys(lock).some(k => k.startsWith('vendor/' + p.dir + '/')), p.spec);
  for (const f of FONTS) assert.ok(lock['fonts/' + f.slug + '.css'], f.slug);
  for (const v of Object.values(lock)) assert.match(v, /^sha384-[A-Za-z0-9+/]{64}$/);
  assert.deepEqual(verify({ 'fonts/x.css': Buffer.from('a') }, { 'fonts/x.css': 'sha384-feil' }), ['fonts/x.css (endret)']);
});

test('CSP: ingen CDN for skript eller fonter, ingen unsafe-inline for skript, ingen unsafe-eval', () => {
  const dir = n => (CSP.split(';').map(s => s.trim()).find(s => s.startsWith(n + ' ')) || '');
  for (const d of ['script-src', 'worker-src', 'style-src', 'font-src', 'connect-src']) assert.doesNotMatch(dir(d), /jsdelivr|unpkg|googleapis|gstatic|projectnaptha/, d);
  assert.doesNotMatch(dir('script-src'), /'unsafe-inline'|'unsafe-eval'/);
  assert.match(dir('object-src'), /'none'/); assert.match(dir('frame-ancestors'), /'self'/);
});
