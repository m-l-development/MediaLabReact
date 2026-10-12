import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OUT, WEB, plan } from './web-app.js';

const ROOT = path.join(import.meta.dirname, '..');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('publiseringsbygget tar med den nye appen: web/ bygges til dist/app etter den gamle appen', () => {
  assert.equal(pkg.scripts.build, 'vite build && node build/web-app.js --run');
  assert.equal(path.basename(WEB), 'web');
  assert.equal(path.relative(ROOT, OUT).split(path.sep).join('/'), 'dist/app');
  const p = plan({ VERCEL_ENV: 'preview', ML_TEST_NO_BACKEND: '1' });
  assert.ok(!p.error, p.error);
  const build = p.steps.at(-1);
  assert.deepEqual(build.args, ['vite', 'build', '--outDir', OUT, '--emptyOutDir']);
  // miljøet går videre (samme byggesperrer), men aldri unntaket «uten backend»
  assert.equal(p.env.VERCEL_ENV, 'preview');
  assert.equal(p.env.ML_TEST_NO_BACKEND, '');
});

test('vercel.json: /app får riktig hurtigbuffer og manifesttype', () => {
  const h = (src) => vercel.headers.find((x) => x.source === src)?.headers ?? [];
  assert.deepEqual(h('/app/assets/(.*)'), [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
  assert.ok(h('/app/manifest.webmanifest').some((x) => x.key === 'Content-Type' && x.value === 'application/manifest+json'));
});
