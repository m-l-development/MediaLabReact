// Admin, original mot React: oppsettkode, 4,4 MB-grensen, roller (admin og bruker) og «Oppdater» i loggen.
// Serveren er simulert (admin-mock.js, samme kontrakt som api/ml.js). Tilgangskontrollen på serveren testes ikke her.
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { flow, IMG } from './parity.js';
import { mockApi } from './admin-mock.js';

const STOR = path.resolve('tests/fixtures/stor.png');
test.beforeAll(() => { if (!fs.existsSync(STOR)) execFileSync('node', ['tests/fixtures/lag.mjs'], { stdio: 'ignore' }); });

const felt = p => p.locator('input:not([type=file])');
const knapp = (p, n) => p.getByRole('button', { name: n, exact: true });
const route = o => ['**/api/ml?**', () => mockApi(o)];
const DIALOG = d => d.accept();

test('oppsett med oppsettkode + filgrense 4,4 MB', async ({ browser }, info) => {
  test.setTimeout(10 * 60_000);
  const steg = [
    ['oppsett krever kode', async p => {}],
    ['feil kode', async p => { await felt(p).nth(0).fill('kristen'); await felt(p).nth(1).fill('hemmelig12345'); await felt(p).nth(2).fill('hemmelig12345'); await felt(p).nth(3).fill('feil'); await knapp(p, 'Opprett konto').click(); await p.waitForTimeout(500); }],
    ['riktig kode', async p => { await felt(p).nth(3).fill('KODE-2026'); await knapp(p, 'Opprett konto').click(); await p.waitForTimeout(600); }],
    ['for stor fil (8,6 MB)', async p => { await p.locator('input[type=file]').setInputFiles(STOR); await p.waitForTimeout(800); }],
    ['liten fil går gjennom', async p => { await p.locator('input[type=file]').setInputFiles(IMG); await p.waitForTimeout(800); }],
    ['logg: oppdater', async p => { await knapp(p, 'Logg').click(); await p.waitForTimeout(400); await knapp(p, 'Oppdater').click(); await p.waitForTimeout(400); }],
    ['system: oppdater', async p => { await knapp(p, 'System').click(); await p.waitForTimeout(400); await knapp(p, 'Oppdater').click(); await p.waitForTimeout(400); }],
  ];
  await flow(browser, 'admin-kode-' + info.project.name, '/_original/admin.dc.html', '/admin.dc.html', steg, { viewport: info.project.use.viewport, route: route({ needCode: true, code: 'KODE-2026' }), dialogs: DIALOG, settle: 3300 });
});

const BRUKERE = [
  { id: 'u1', name: 'kristen', pw: 'hemmelig12345', role: 'dev' },
  { id: 'u2', name: 'anne', pw: 'adminpass123', role: 'admin', org: 'o1' },
  { id: 'u3', name: 'per', pw: 'brukerpass12', role: 'user', org: 'o1' },
];
test('roller: admin og vanlig bruker ser ulike faner', async ({ browser }, info) => {
  test.setTimeout(10 * 60_000);
  const logginn = (n, pw) => async p => { await felt(p).nth(0).fill(n); await felt(p).nth(1).fill(pw); await knapp(p, 'Logg inn').click(); await p.waitForTimeout(600); };
  const steg = [
    ['innlogging', async p => {}],
    ['admin logger inn', logginn('anne', 'adminpass123')],
    ['admin: brukere', async p => { await knapp(p, 'Brukere').click(); await p.waitForTimeout(400); }],
    ['admin: legg til bruker', async p => { const f = p.locator('form').filter({ has: knapp(p, 'Legg til bruker') }); await f.locator('input').nth(0).fill('kari'); await f.locator('input').nth(1).fill('passord12345'); await knapp(p, 'Legg til bruker').click(); await p.waitForTimeout(400); }],
    ['admin: filer', async p => { await knapp(p, 'Filer').click(); await p.waitForTimeout(400); }],
    ['admin: min konto', async p => { await knapp(p, 'Min konto').click(); await p.waitForTimeout(300); }],
    ['admin logger ut', async p => { await knapp(p, 'Logg ut').click(); await p.waitForTimeout(400); }],
    ['bruker logger inn', logginn('per', 'brukerpass12')],
    ['bruker: bytt passord', async p => { const f = p.locator('form'); await f.locator('input').nth(0).fill('brukerpass12'); await f.locator('input').nth(1).fill('nyttpassord99'); await knapp(p, 'Lagre nytt passord').click(); await p.waitForTimeout(400); }],
    ['bruker logger ut', async p => { await knapp(p, 'Logg ut').click(); await p.waitForTimeout(400); }],
    ['utvikler logger inn', logginn('kristen', 'hemmelig12345')],
  ];
  await flow(browser, 'admin-roller-' + info.project.name, '/_original/admin.dc.html', '/admin.dc.html', steg, { viewport: info.project.use.viewport, route: route({ users: BRUKERE }), dialogs: DIALOG, settle: 3300 });
});
