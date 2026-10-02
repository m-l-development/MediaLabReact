import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cspByHost, ruleApplies, localCsp } from './csp.js';
import { REFS, DEV_SITE } from './env-guard.js';
import { SITE } from '../server/lib/backend.js';

const vercel = (await import('../vercel.json', { with: { type: 'json' } })).default;
const dir = (csp, n) => csp.split(';').map(s => s.trim()).find(s => s.startsWith(n + ' ')) || '';

test('CSP: produksjonsadressen får ikke utviklingsprosjektet; andre verter får begge', () => {
  const c = cspByHost(vercel);
  assert.equal('https://' + c.productionHost, SITE.production, 'produksjonsverten = SITE.production');
  assert.doesNotMatch(c.production, new RegExp(REFS.preview), 'ingen dev-ref i produksjonens CSP');
  assert.match(dir(c.production, 'connect-src'), new RegExp('https://' + REFS.production + '\\.supabase\\.co'));
  assert.match(dir(c.other, 'connect-src'), new RegExp('https://' + REFS.preview + '\\.supabase\\.co'));
  assert.match(dir(c.other, 'connect-src'), new RegExp('https://' + REFS.production + '\\.supabase\\.co'), 'deployment-adresser for produksjon trenger produksjonsprosjektet');
  assert.equal(c.other.replace(' https://' + REFS.preview + '.supabase.co', ''), c.production, 'eneste forskjell er utviklingsprosjektet');
});

test('CSP: reglene utelukker hverandre – nøyaktig én CSP per vert, og alle andre headere gjelder alle verter', () => {
  const hosts = [new URL(SITE.production).host, new URL(DEV_SITE).host, 'media-lab-react-vyef-abc123def-media-lab3.vercel.app', 'localhost', 'eget-domene.no'];
  for (const h of hosts) {
    const hit = vercel.headers.filter(r => ruleApplies(r, h) && r.headers.some(x => x.key === 'Content-Security-Policy'));
    assert.equal(hit.length, 1, h);
    assert.equal(hit[0].headers[0].value.includes(REFS.preview), h !== new URL(SITE.production).host, h);
  }
  const common = vercel.headers.filter(r => r.source === '/(.*)' && !r.has && !r.missing);
  assert.equal(common.length, 1);
  for (const k of ['X-Content-Type-Options', 'Strict-Transport-Security', 'X-Frame-Options', 'Cross-Origin-Opener-Policy']) assert.ok(common[0].headers.some(x => x.key === k), k);
  assert.ok(!common[0].headers.some(x => x.key === 'Content-Security-Policy'), 'CSP står bare i de to vertsreglene');
});

test('CSP: begge variantene har samme strenge regler', () => {
  const c = cspByHost(vercel);
  for (const csp of [c.production, c.other]) {
    assert.doesNotMatch(dir(csp, 'script-src'), /'unsafe-inline'|'unsafe-eval'/);
    assert.match(dir(csp, 'object-src'), /'none'/);
    assert.match(csp, /upgrade-insecure-requests/);
  }
  assert.doesNotMatch(localCsp(c.other), /upgrade-insecure-requests/);
});
