import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionsFor } from './access.js';

const sec = o => [...sectionsFor({ dev: false, collab: false, adminOf: [], churches: [], ...o })].sort();
const A = { id: 'a' }, B = { id: 'b' };

test('Developer: systemadministrasjon, men ikke Samarbeid (bare Moderator administrerer koblinger)', () => {
  assert.deepEqual(sec({ dev: true }), ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt', 'tilbakemeldinger']);
});
test('Developer som også er Moderator får Samarbeid gjennom Moderator-rollen', () => {
  assert.ok(sectionsFor({ dev: true, collab: true, adminOf: [], churches: [] }).has('samarbeid'));
});
test('Admin: brukere, menigheter, invitasjoner, filer, abonnement og logg – IKKE samarbeid', () => {
  assert.deepEqual(sec({ adminOf: ['a'], churches: [A] }), ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt']);
});
test('Moderator: bare samarbeid (ingen admin- eller filfunksjoner)', () => {
  assert.deepEqual(sec({ collab: true }), ['oversikt', 'samarbeid', 'tilbakemeldinger']);
});
test('User: menigheter og filer (Samarbeidsfiler ligger under Filer) – ikke Samarbeid', () => {
  assert.deepEqual(sec({ churches: [A] }), ['filer', 'menigheter', 'oversikt']);
});
test('Admin og medlem i flere menigheter får aldri Samarbeid-administrasjon', () => {
  assert.ok(!sectionsFor({ dev: false, collab: false, adminOf: ['a'], churches: [A, B] }).has('samarbeid'));
});
test('Tilbakemeldinger (innboks): bare Developer og Moderator – aldri Admin eller User', () => {
  assert.ok(sectionsFor({ dev: true, collab: false, adminOf: [], churches: [] }).has('tilbakemeldinger'));
  assert.ok(sectionsFor({ dev: false, collab: true, adminOf: [], churches: [] }).has('tilbakemeldinger'));
  assert.ok(!sectionsFor({ dev: false, collab: false, adminOf: ['a'], churches: [A, B] }).has('tilbakemeldinger'));
  assert.ok(!sectionsFor({ dev: false, collab: false, adminOf: [], churches: [A] }).has('tilbakemeldinger'));
});
test('Uten menighet og uten rolle: bare oversikt', () => {
  assert.deepEqual(sec({}), ['oversikt']);
});
