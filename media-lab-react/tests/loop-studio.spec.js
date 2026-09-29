// Loop Studio: maler, redigering (localStorage loopstudio.tpls.v1) og Disk (loopstudio.disk.v1) – original mot React.
import { test } from '@playwright/test';
import { flow } from './parity.js';

/* tre lagrede loops på Disk, med faste datoer */
const DISK = () => {
  if (localStorage.getItem('loopstudio.disk.v1')) return;
  const t = Date.parse('2026-09-20T10:00:00Z');
  localStorage.setItem('loopstudio.disk.v1', JSON.stringify([
    { id: 'd-uke39abc', name: 'Uke 39', base: 'week', count: 7, savedAt: t },
    { id: 'd-sondag01', name: 'Søndag 21.9', base: 'sunday', count: 4, savedAt: t - 86400000, fav: true },
    { id: 'd-ungdom77', name: 'Ungdomskveld', base: 'youth', count: 5, savedAt: t - 2 * 86400000 },
  ]));
  localStorage.setItem('ukeloop.custom.d-uke39abc', '{"x":1}');
};
const btn = (p, name) => p.getByRole('button', { name, exact: true });
const STEPS = [
  ['start', async p => {}],
  ['åpne Disk', async p => { await p.locator('button[aria-expanded]').click(); await p.waitForTimeout(500); }],
  ['favoritt', async p => { await p.getByRole('button', { name: 'Favoritt – slettes aldri automatisk' }).first().click(); }],
  ['fjern favoritt', async p => { await p.getByRole('button', { name: 'Fjern fra favoritter' }).first().click(); }],
  ['slett fra Disk', async p => { await p.getByRole('button', { name: 'Slett fra Disk' }).first().click(); }],
  ['lukk Disk', async p => { await p.locator('button[aria-expanded]').click(); await p.waitForTimeout(500); }],
  ['rediger maler', async p => { await p.getByRole('button', { name: 'Rediger maler' }).click(); }],
  ['sidetittel', async p => { await p.getByLabel('Sidetittel').fill('Loop Studio Filadelfia'); }],
  ['endre første mal', async p => { await p.getByLabel('Kategori').first().fill('Fast'); await p.getByLabel('Navn på mal').first().fill('Ukeprogram høst'); await p.getByLabel('Beskrivelse').first().fill('Ny beskrivelse av malen.'); await p.getByPlaceholder('Velg').first().fill('Start'); }],
  ['flytt til høyre', async p => { await p.getByRole('button', { name: 'Flytt til høyre' }).first().click(); }],
  ['flytt til venstre', async p => { await p.getByRole('button', { name: 'Flytt til venstre' }).last().click(); }],
  ['ny mal', async p => { await p.getByRole('button', { name: '+ Ny mal' }).click(); }],
  ['navngi ny mal', async p => { await p.getByLabel('Navn på mal').last().fill('Bønnemøte'); }],
  ['fjern mal', async p => { await p.getByRole('button', { name: 'Fjern mal' }).nth(1).click(); }],
  ['ferdig', async p => { await btn(p, 'Ferdig').click(); }],
  ['tom sidetittel blir standard', async p => { await p.getByRole('button', { name: 'Rediger maler' }).click(); await p.getByLabel('Sidetittel').fill('   '); await btn(p, 'Ferdig').click(); }],
  ['tilbakestill', async p => { await p.getByRole('button', { name: 'Rediger maler' }).click(); await btn(p, 'Tilbakestill').click(); await btn(p, 'Ferdig').click(); }],
  ['last inn på nytt', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600); }],
  ['hover på mal', async p => { await p.locator('a[href*="&id="]:visible, a[data-ml-href*="&id="]:visible').first().hover(); }],
  ['engelsk', async p => { await p.evaluate(() => window.MLI18N.set('en')); }],
  ['lys modus', async p => { await p.evaluate(() => window.MLTheme.set('light')); await p.waitForTimeout(900); }],
];

test('loop-studio: original og React oppfører seg likt', async ({ browser }, info) => {
  test.setTimeout(300_000);
  await flow(browser, 'loop-studio-' + info.project.name, '/_original/loop-studio.dc.html', '/loop-studio.dc.html', STEPS, { viewport: info.project.use.viewport, init: DISK });
});
