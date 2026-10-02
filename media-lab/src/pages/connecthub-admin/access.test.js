import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionsFor, brandOf } from './access.js';

const sec = o => [...sectionsFor({ dev: false, collab: false, adminOf: [], churches: [], ...o })].sort();
const A = { id: 'a' }, B = { id: 'b' };

const STAFF = ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'opprydning', 'oversikt', 'samarbeid', 'tilbakemeldinger'];
test('Developer: systemadministrasjon, Samarbeid og Opprydning', () => {
  assert.deepEqual(sec({ dev: true }), STAFF);
});
test('Developer som også er Moderator får samme meny', () => {
  assert.deepEqual(sec({ dev: true, collab: true }), STAFF);
});
test('Opprydning: bare Developer og Moderator – aldri Admin eller User', () => {
  assert.ok(!sectionsFor({ dev: false, collab: false, adminOf: ['a'], churches: [A] }).has('opprydning'));
  assert.ok(!sectionsFor({ dev: false, collab: false, adminOf: [], churches: [A] }).has('opprydning'));
});
test('Admin: brukere, menigheter, invitasjoner, filer, abonnement og logg – IKKE samarbeid', () => {
  assert.deepEqual(sec({ adminOf: ['a'], churches: [A] }), ['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt']);
});
test('Moderator: samme meny som Developer (utviklerverktøy og privilegerte roller er ikke menyer)', () => {
  assert.deepEqual(sec({ collab: true }), STAFF);
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

test('Toppfeltet viser rollen: Developer, Moderator, Admin eller Bruker', () => {
  assert.equal(brandOf('developer'), 'CONNECTHUB · DEVELOPER');
  assert.equal(brandOf('moderator'), 'CONNECTHUB · MODERATOR');
  assert.equal(brandOf('admin'), 'CONNECTHUB · ADMIN');
  assert.equal(brandOf('user'), 'CONNECTHUB · BRUKER');
  assert.equal(brandOf(undefined), 'CONNECTHUB · BRUKER', 'ukjent rolle viser aldri mer enn Bruker');
});
