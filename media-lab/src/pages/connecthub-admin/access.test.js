import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionsFor } from './access.js';

const sec = o => [...sectionsFor({ dev: false, collab: false, adminOf: [], churches: [], ...o })].sort();
const A = { id: 'a' }, B = { id: 'b' };

test('Developer ser alle seksjoner', () => {
  assert.deepEqual(sec({ dev: true, collab: true }), ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt', 'samarbeid']);
});
test('Admin: brukere, menigheter, invitasjoner, filer, abonnement og logg – IKKE samarbeid', () => {
  assert.deepEqual(sec({ adminOf: ['a'], churches: [A] }), ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt']);
});
test('Moderator: bare samarbeid (ingen admin- eller filfunksjoner)', () => {
  assert.deepEqual(sec({ collab: true }), ['oversikt', 'samarbeid']);
});
test('User: menigheter, filer og samarbeid', () => {
  assert.deepEqual(sec({ churches: [A] }), ['filer', 'menigheter', 'oversikt', 'samarbeid']);
});
test('Admin i én menighet og vanlig medlem i en annen får samarbeid som medlem', () => {
  assert.ok(sectionsFor({ dev: false, collab: false, adminOf: ['a'], churches: [A, B] }).has('samarbeid'));
});
test('Uten menighet og uten rolle: bare oversikt', () => {
  assert.deepEqual(sec({}), ['oversikt']);
});
