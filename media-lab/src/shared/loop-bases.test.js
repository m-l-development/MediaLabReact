import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forChurch, entryOf, central } from './loop-bases.js';
import { useDataAdapter } from '../services/port.js';
import { ServiceError } from '../services/errors.js';

test('felles grunnoppsett: lokale bilder, gamle innebygde og midlertidige adresser fjernes; ch: og gen: beholdes', () => {
  const d = forChurch({ slides: [{ bg: 'img-1' }, { bg: 'images/sondag.jpeg' }, { bg: 'blob:x' }, { bg: 'gen:2' }, { bg: 'ch:11111111-1111-4111-8111-111111111111' }], cfg: { logoSrc: 'img-logo', header: 'Hei' } });
  assert.deepEqual(d.slides.map(x => x.bg), [null, null, null, 'gen:2', 'ch:11111111-1111-4111-8111-111111111111']);
  assert.deepEqual(d.cfg, { logoSrc: null, header: 'Hei' });
});
test('grunnoppsett: nytt navn/ID hver gang, gyldig mal, QR-bilder tas ikke med', () => {
  const a = entryOf({ name: '  Påske  ', base: 'week', slides: [{ id: 's', type: 'text', qr: { img: 'x' } }], cfg: {} }), b = entryOf({ name: '', base: 'ukjent', slides: [] });
  assert.equal(a.name, 'Påske'); assert.equal(b.name, 'Grunnoppsett'); assert.equal(b.base, 'blank'); assert.notEqual(a.id, b.id);
  assert.equal('qr' in a.data.slides[0], false);
});
test('felles grunnoppsett: to som lagrer samtidig – begge blir med (endringen gjøres på nytt på nyeste versjon)', async () => {
  globalThis.window = { CH: { me: { churches: [{ id: 'c1' }] } } }; globalThis.localStorage = { getItem: () => null };
  const row = { data: { bases: [] }, version: 0 }; let first = true;
  useDataAdapter({ async rpc(fn, a) {
    if (fn === 'church_settings_get') return row.version ? { data: row.data, version: row.version } : null;
    if (fn === 'church_settings_save') {
      if (first) { first = false; row.data = { bases: [{ id: 'andre1', name: 'Andres', data: { slides: [] } }] }; row.version = 1; } // en annen lagret like før
      if (a.p_version !== row.version) throw new ServiceError('settings_conflict');
      row.data = a.p_data; row.version++; return { version: row.version };
    }
  } });
  const e = entryOf({ name: 'Mitt', base: 'week', slides: [] });
  await central.add(e);
  assert.deepEqual(row.data.bases.map(x => x.name), ['Andres', 'Mitt']);
  useDataAdapter(null); delete globalThis.window; delete globalThis.localStorage;
});
