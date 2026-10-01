import { test } from 'node:test';
import assert from 'node:assert/strict';

test('config: gyldig backend leses og fryses', async () => {
  globalThis.__CH_BACKEND__ = { url: 'https://uatpdmhnwwjgzlxaucsx.supabase.co', key: 'sb_publishable_x', ref: 'uatpdmhnwwjgzlxaucsx', target: 'preview' };
  const { backend, hasBackend } = await import('./config.js?gyldig');
  assert.equal(hasBackend(), true);
  assert.equal(backend.projectRef, 'uatpdmhnwwjgzlxaucsx');
  assert.equal(backend.publishableKey, 'sb_publishable_x');
  assert.ok(Object.isFrozen(backend));
});

test('config: uten backend er alt null, og adapteren nekter å starte', async () => {
  globalThis.__CH_BACKEND__ = null;
  const { backend, hasBackend } = await import('./config.js?tom');
  assert.equal(backend, null);
  assert.equal(hasBackend(), false);
});

test('config: ufullstendig verdi godtas ikke', async () => {
  globalThis.__CH_BACKEND__ = { url: 'https://x.supabase.co' };
  const { backend } = await import('./config.js?ufullstendig');
  assert.equal(backend, null);
});
