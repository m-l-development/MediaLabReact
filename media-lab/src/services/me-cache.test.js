import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { readMe, writeMe, clearMe, sameMe, sessionKey } = await import('./me-cache.js');

const S = { userId: 'u1', sessionId: 's1', aal: 'aal1' };
const ME = { id: 'u1', email: 'a@example.com', mfa: false, roles: [{ role: 'church_admin', church_id: 'c1' }], churches: [{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }] };

test('me-cache: gjelder bare samme bruker, økt og MFA-nivå', () => {
  clearMe(); writeMe(S, ME);
  assert.deepEqual(readMe(S), ME);
  assert.equal(readMe({ ...S, sessionId: 's2' }), null, 'ny innlogging');
  assert.equal(readMe({ ...S, aal: 'aal2' }), null, 'nytt MFA-nivå');
  assert.equal(readMe({ ...S, userId: 'u2' }), null, 'annen bruker');
  assert.equal(readMe(null), null);
  assert.equal(sessionKey({ userId: 'u1' }), null, 'uten økt-ID brukes ikke bufferen');
});

test('me-cache: utløper, og fjernes ved utlogging', () => {
  writeMe(S, ME, 0);
  assert.equal(readMe(S, 13 * 3600e3), null, 'eldre enn 12 timer');
  writeMe(S, ME); clearMe();
  assert.equal(readMe(S), null);
});

test('me-cache: sammenligning ser bort fra rekkefølge, men ikke fra innhold', () => {
  assert.equal(sameMe(ME, { ...ME, churches: [...ME.churches].reverse() }), true);
  assert.equal(sameMe(ME, { ...ME, roles: [] }), false);
  assert.equal(sameMe(ME, { ...ME, mfa: true }), false);
});
