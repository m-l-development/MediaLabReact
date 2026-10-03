import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merge3, SharedSetup } from './shared-setup.js';
import { useDataAdapter } from '../services/port.js';
import { ServiceError } from '../services/errors.js';

test('merge3: egne og andres endringer i ulike felt slås sammen', () => {
  const r = merge3({ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 1 }, { a: 1, b: 3, c: 1 });
  assert.deepEqual(r, { data: { a: 2, b: 3, c: 1 }, conflicts: [] });
});
test('merge3: samme felt endret ulikt → den lagrede (nyeste) vinner og meldes; likt → ingen konflikt', () => {
  assert.deepEqual(merge3({ a: 1 }, { a: 2 }, { a: 3 }), { data: { a: 3 }, conflicts: ['a'] });
  assert.deepEqual(merge3({ a: 1 }, { a: 2 }, { a: 2 }), { data: { a: 2 }, conflicts: [] });
});
test('merge3: nye og fjernede felt, og lister/objekter sammenlignes som verdier', () => {
  assert.deepEqual(merge3({ x: [1] }, { x: [1], ny: 'm' }, { x: [1, 2] }).data, { x: [1, 2], ny: 'm' });
  assert.deepEqual(merge3({ a: 1, b: 2 }, { b: 2 }, { a: 1, b: 2 }).data, { b: 2 }, 'felt jeg fjernet, fjernes');
  assert.deepEqual(merge3(null, { a: 1 }, null).data, { a: 1 });
});

/* Falsk database: versjon og konflikt som i church_settings_save. */
function fakeDb(start) {
  const row = { data: start, version: start ? 1 : 0 }, calls = [];
  useDataAdapter({ async rpc(fn, a) {
    calls.push(fn);
    if (fn === 'church_settings_get') return row.version ? { data: row.data, version: row.version, can_admin: false, admin_keys: ['imgRules'] } : null;
    if (fn === 'church_settings_save') {
      if (a.p_version !== row.version) throw new ServiceError('settings_conflict');
      if (JSON.stringify(a.p_data.imgRules) !== JSON.stringify((row.data || {}).imgRules)) throw new ServiceError('forbidden');
      row.data = a.p_data; row.version++; return { version: row.version };
    }
  } });
  return { row, calls };
}
const CH = { id: '11111111-1111-4111-8111-111111111111', name: 'M' };

test('SharedSetup: to brukere lagrer samtidig – ingen endring går tapt, eldre versjon overskriver aldri', async () => {
  const db = fakeDb({ header: 'A', accent: '#111', imgRules: [] });
  const u1 = new SharedSetup('loopstudio:week', { church: CH }), u2 = new SharedSetup('loopstudio:week', { church: CH });
  await u1.load(); await u2.load();
  assert.equal(await u1.save({ header: 'Ny tittel', accent: '#111', imgRules: [] }, 0), true);
  const remote = []; u2.onRemote = d => remote.push(d);
  assert.equal(await u2.save({ header: 'A', accent: '#f00', imgRules: [] }, 0), true);
  assert.deepEqual(db.row.data, { header: 'Ny tittel', accent: '#f00', imgRules: [] });
  assert.equal(db.row.version, 3); assert.deepEqual(remote[0], db.row.data, 'brukeren får den sammenslåtte versjonen');
});
test('SharedSetup: medlem uten Admin sender aldri endrede Faste bilder (feltet holdes tilbake)', async () => {
  const db = fakeDb({ header: 'A', imgRules: [{ id: 'r1' }] });
  const u = new SharedSetup('loopstudio:week', { church: CH }); await u.load();
  assert.equal(await u.save({ header: 'B', imgRules: [] }, 0), true);
  assert.deepEqual(db.row.data, { header: 'B', imgRules: [{ id: 'r1' }] });
});
test('SharedSetup: refresh henter nyere versjon fra andre, men ikke når det finnes ulagrede endringer', async () => {
  const db = fakeDb({ header: 'A' });
  const u = new SharedSetup('thumbstudio:cats', { church: CH }); await u.load();
  const got = []; u.onRemote = d => got.push(d);
  db.row.data = { header: 'Fra en annen' }; db.row.version = 2;
  assert.equal(await u.refresh(), true); assert.deepEqual(got, [{ header: 'Fra en annen' }]);
  assert.equal(await u.refresh(), false, 'ingen ny versjon');
  u.pending = { header: 'ulagret' }; db.row.version = 3;
  assert.equal(await u.refresh(), false, 'ulagrede endringer overskrives ikke');
  useDataAdapter(null);
});
