import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGlobal, activeOf, roleSummary, canJoinAnother, removeConfirmText } from './members.js';

const name = id => ({ a: 'Menighet A', b: 'Menighet B' }[id] || '–');
const M = [{ user_id: 'u', church_id: 'a', status: 'active' }, { user_id: 'u', church_id: 'b', status: 'removed' }, { user_id: 'v', church_id: 'b', status: 'disabled' }];

test('medlemskap: bare aktive teller, Developer/Moderator er globale', () => {
  assert.deepEqual(activeOf(M, 'u').map(m => m.church_id), ['a']);
  assert.deepEqual(activeOf(M, 'v'), []);
  assert.equal(isGlobal([{ role: 'developer', church_id: null }]), true);
  assert.equal(isGlobal([{ role: 'moderator', church_id: null, revoked_at: '2026-10-01' }]), false, 'tilbakekalt rolle teller ikke');
  assert.equal(isGlobal([{ role: 'church_admin', church_id: 'a' }]), false);
});
test('rolleoppsummering viser hvilken rolle og menighet', () => {
  assert.equal(roleSummary([], name), 'Bruker');
  assert.equal(roleSummary([{ role: 'church_admin', church_id: 'a' }], name), 'Admin i Menighet A');
  assert.equal(roleSummary([{ role: 'developer', church_id: null }, { role: 'moderator', church_id: null }], name), 'Developer, Moderator');
});
test('én menighet om gangen: User/Admin med aktivt medlemskap kan ikke legges til en annen; global rolle kan', () => {
  const r = canJoinAnother([], M, 'u', name);
  assert.equal(r.ok, false); assert.match(r.reason, /Menighet A/);
  assert.equal(canJoinAnother([], M, 'v', name).ok, true, 'deaktivert medlemskap hindrer ikke');
  assert.equal(canJoinAnother([{ role: 'moderator', church_id: null }], M, 'u', name).ok, true);
});
test('bekreftelsen for fjerning nevner menigheten, og Admin-varsel når brukeren er Admin', () => {
  const t = removeConfirmText({ name: 'Ola', church: 'Menighet A', isAdmin: false });
  assert.match(t, /Fjerne Ola fra Menighet A\?/); assert.match(t, /Kontoen slettes ikke/); assert.doesNotMatch(t, /står uten Admin/);
  assert.match(removeConfirmText({ name: 'Kari', church: 'Menighet A', isAdmin: true }), /står uten Admin/);
});
