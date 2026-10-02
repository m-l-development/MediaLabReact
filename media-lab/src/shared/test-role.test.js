import { test } from 'node:test';
import assert from 'node:assert/strict';
import { switcherAllowed, realView, allowedViews, effectiveMe } from './test-role.js';

const DEV = { id: 'd', roles: [{ role: 'developer', church_id: null }], churches: [{ id: 'c1', name: 'A' }] };
const ADM = { id: 'a', roles: [{ role: 'church_admin', church_id: 'c1' }], churches: [{ id: 'c1', name: 'A' }] };
const USR = { id: 'u', roles: [], churches: [{ id: 'c1', name: 'A' }] };
const MOD = { id: 'm', roles: [{ role: 'moderator', church_id: null }], churches: [] };

test('rollebytter: bare i lokal utvikling og Preview mot connecthub-dev – aldri i produksjon', () => {
  globalThis.__CH_DEV_REF__ = null;   // som i produksjonsbygget: aldri tillatt
  assert.equal(switcherAllowed({ target: 'preview', projectRef: 'uatpdmhnwwjgzlxaucsx' }), false, 'uten utviklings-ID i bygget');
  globalThis.__CH_DEV_REF__ = 'uatpdmhnwwjgzlxaucsx';   // som i Preview- og lokale bygg (settes av vite.config.js)
  assert.equal(switcherAllowed({ target: 'preview', projectRef: 'uatpdmhnwwjgzlxaucsx' }), true);
  assert.equal(switcherAllowed({ target: 'local', projectRef: 'uatpdmhnwwjgzlxaucsx' }), true);
  assert.equal(switcherAllowed({ target: 'production', projectRef: 'cmuienhheklcgtfmpvbe' }), false);
  assert.equal(switcherAllowed({ target: 'production', projectRef: 'uatpdmhnwwjgzlxaucsx' }), false, 'produksjonsmål stopper selv med dev-prosjekt');
  assert.equal(switcherAllowed({ target: 'preview', projectRef: 'cmuienhheklcgtfmpvbe' }), false, 'produksjonsprosjekt stopper selv på Preview');
  assert.equal(switcherAllowed(null), false);
});

test('rollebytter: kan bare senke rollen, aldri heve den', () => {
  assert.equal(realView(DEV), 'developer'); assert.equal(realView(ADM), 'admin'); assert.equal(realView(USR), 'user');
  assert.deepEqual(allowedViews(DEV), ['developer', 'moderator', 'admin', 'user']);
  assert.equal(realView(MOD), 'moderator');
  assert.deepEqual(allowedViews(MOD), ['moderator', 'user'], 'Moderator kan ikke se siden som Admin eller Developer');
  assert.equal(effectiveMe(MOD, 'admin'), MOD); assert.equal(effectiveMe(MOD, 'developer'), MOD);
  assert.equal(effectiveMe(ADM, 'moderator'), ADM, 'Admin kan ikke se siden som Moderator');
  assert.deepEqual(allowedViews(ADM), ['admin', 'user']);
  assert.deepEqual(allowedViews(USR), []);
  assert.equal(effectiveMe(USR, 'developer'), USR, 'bruker kan ikke se siden som Developer');
  assert.equal(effectiveMe(USR, 'admin'), USR, 'bruker kan ikke se siden som Admin');
  assert.equal(effectiveMe(ADM, 'developer'), ADM, 'admin kan ikke se siden som Developer');
});

test('rollebytter: Admin- og User-visning gir riktige roller i grensesnittet', () => {
  assert.deepEqual(effectiveMe(DEV, 'user').roles, []);
  assert.deepEqual(effectiveMe(DEV, 'moderator').roles, [{ role: 'moderator', church_id: null }]);
  assert.deepEqual(effectiveMe(MOD, 'user').roles, []);
  assert.deepEqual(effectiveMe(DEV, 'admin').roles, [{ role: 'church_admin', church_id: 'c1' }], 'Developer ser siden som admin i egne menigheter');
  assert.deepEqual(effectiveMe(ADM, 'user').roles, []);
  assert.equal(effectiveMe(DEV, 'developer'), DEV); assert.equal(effectiveMe(DEV, 'tull'), DEV); assert.equal(effectiveMe(DEV, null), DEV);
  assert.equal(effectiveMe(DEV, 'user').id, 'd', 'samme bruker – bare rollene i visningen endres');
});
