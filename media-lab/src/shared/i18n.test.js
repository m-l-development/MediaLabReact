import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

/* i18n.js (legacy) lastes i en liten sandkasse med engelsk valgt. */
const SRC = fs.readFileSync(new URL('../legacy/i18n.js', import.meta.url), 'utf8');
function load() {
  const window = { addEventListener() {}, dispatchEvent() {}, alert() {}, confirm() {}, prompt() {} };
  const ctx = { window, localStorage: { getItem: () => 'en', setItem() {} }, document: { documentElement: {}, body: null, addEventListener() {} },
    MutationObserver: class { observe() {} disconnect() {} }, CustomEvent: class {} };
  vm.runInNewContext(SRC, ctx);
  return window.MLI18N;
}
const D = (() => { const i = SRC.indexOf('var D ='), j = SRC.indexOf('};', i) + 1; return JSON.parse(SRC.slice(i + 7, j)); })();

test('i18n: oppstarten bygger ikke noe stort regulært uttrykk (rask sidelasting, også på norsk)', () => {
  const t = performance.now(); load(); const ms = performance.now() - t;
  assert.ok(ms < 150, 'oppstart tok ' + ms.toFixed(0) + ' ms');
});

test('i18n: delvis oversettelse gir samme resultat som det gamle regulære uttrykket', () => {
  const I = load();
  /* den gamle metoden, til sammenligning */
  const isL = /[\p{L}\p{N}]/u, esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(D).filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
  const FR = new RegExp(keys.map(k => (isL.test(k[0]) ? '(?<![\\p{L}\\p{N}])' : '') + esc(k) + (isL.test(k[k.length - 1]) ? '(?![\\p{L}\\p{N}])' : '')).join('|'), 'gu');
  const old = s => s.replace(FR, m => D[m]);
  const pick = n => keys[(n * 7919) % keys.length];
  const cases = ['Lagre', '3 filer er lastet opp.', 'Brukt: 1,2 MB / 200 MB', 'xLagre', 'Lagrex', 'Lagre2', '«Lagre»', 'Lagre – 😀 Lagre', '😀Lagre', 'ÆLagre', 'Øk'];
  for (let n = 0; n < 1500; n++) {
    const a = pick(n), b = pick(n + 1), c = pick(n + 2);
    cases.push(a + ' · ' + b, '12 ' + a + ': ' + c, a + b, 'x' + a, a + 'y', '(' + a + ')' + c.slice(0, 3), a.slice(1) + ' ' + b.slice(0, -1));
  }
  for (const s of cases) {
    if (D[s.replace(/\s+/g, ' ').trim()] !== undefined || !/[A-Za-zÆØÅæøå]/.test(s)) continue;
    assert.equal(I.t(s), old(s), JSON.stringify(s));
  }
});
