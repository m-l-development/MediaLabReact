import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapName, isUserDb, isUserKey, DBS } from './local-user.js';

const U = '00000000-0000-4000-8000-000000000004';

test('verktøyenes databaser og prosjektnøkler er brukerdata, innstillinger for enheten er det ikke', () => {
  for (const n of DBS) assert.equal(isUserDb(n), true);
  assert.equal(isUserDb('annen'), false);
  for (const k of ['ukeloop.v2', 'loopstudio.disk.v1', 'medialab.fx.custom', 'photodesign.cats', 'thumbstudio.autosave', 'motiondesign.sections', 'mockups.settings', 'medialab.advanced'])
    assert.equal(isUserKey(k), true, k);
  for (const k of ['medialab.theme', 'medialab.lang', 'ch.auth', 'ch.local.owner', 'medialab.pwa.later', 'sb-x-auth-token'])
    assert.equal(isUserKey(k), false, k);
});

test('mapName: egne navn per bruker; eieren av gamle data bruker de eksisterende navnene', () => {
  assert.equal(mapName('photodesign', U, null), 'photodesign@' + U);
  assert.equal(mapName('photodesign', U, 'annen'), 'photodesign@' + U);
  assert.equal(mapName('photodesign', U, U), 'photodesign');
  assert.equal(mapName('photodesign', null, null), 'photodesign');
});
