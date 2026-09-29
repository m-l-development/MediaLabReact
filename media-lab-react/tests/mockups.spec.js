// Mockups: galleri, kategorier, redigering, hjørner, justeringer, eksport og egne mockup-bilder – original mot React.
import { test } from '@playwright/test';
import { flow, IMG, IMG2 } from './parity.js';

const btn = (p, name) => p.getByRole('button', { name, exact: true });
const STEPS = [
  ['galleri', async p => {}],
  ['kategori 2', async p => { await p.locator('main button, button').filter({ hasText: /^(Mobil|Laptop|Skjerm og TV)/ }).first().click(); }],
  ['kategori Alle', async p => { await p.locator('button').filter({ hasText: /^Alle/ }).first().click(); }],
  ['åpne første mockup', async p => { await p.locator('[style*="aspect-ratio"]').first().click(); await p.waitForTimeout(800); }],
  ['last opp design', async p => { await p.locator('input[type=file][accept*="gif"]').setInputFiles(IMG); await p.waitForTimeout(1200); }],
  ['vis hele', async p => { await btn(p, 'Vis hele').click(); }],
  ['zoom og flytt', async p => { const r = p.locator('input[type=range]'); await r.nth(0).fill('1.6'); await r.nth(1).fill('0.1'); await r.nth(2).fill('-0.05'); }],
  ['skygger og glans', async p => { const r = p.locator('input[type=range]'); await r.nth(3).fill('0.2'); await r.nth(4).fill('0.8'); }],
  ['bakgrunnsfarge', async p => { await p.locator('input[type=color]').fill('#336699'); }],
  ['skjul/vis forgrunn', async p => { const s = p.getByRole('switch'); if (await s.count()) await s.click(); }],
  ['juster hjørnene', async p => { await p.getByRole('button', { name: 'Juster hjørnene' }).click(); }],
  ['dra hjørne', async p => { const h = p.getByRole('button', { name: 'Øverst til venstre' }); const b = await h.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + 40, b.y + 30, { steps: 5 }); await p.mouse.up(); }],
  ['ferdig med hjørnene', async p => { await btn(p, 'Ferdig med hjørnene').click(); }],
  ['last ned PNG', async p => { await btn(p, 'Last ned').last().click(); await p.waitForTimeout(1500); }],
  ['JPG + last ned', async p => { await btn(p, 'JPG').click(); await btn(p, 'Last ned').last().click(); await p.waitForTimeout(1500); }],
  ['kopier bilde', async p => { await btn(p, 'Kopier bilde').click(); await p.waitForTimeout(800); }],
  ['finn automatisk', async p => { await btn(p, 'Finn automatisk').click(); }],
  ['tilbakestill', async p => { await btn(p, 'Tilbakestill').click(); }],
  ['neste', async p => { await p.getByRole('button', { name: 'Neste' }).click(); await p.waitForTimeout(600); }],
  ['forrige', async p => { await p.getByRole('button', { name: 'Forrige' }).click(); await p.waitForTimeout(600); }],
  ['tilbake til galleri', async p => { await p.locator('button').first().click(); await p.waitForTimeout(600); }],
  ['fjern design (galleri)', async p => { const x = p.getByRole('button', { name: 'Fjern design' }); await x.hover(); await x.click(); }],
  ['legg til egne mockup-bilder', async p => { await p.locator('input[type=file][multiple]').setInputFiles([IMG2]); await p.waitForTimeout(2500); }],
  ['slett eget mockup-bilde', async p => { await p.getByRole('button', { name: 'Slett mockup-bildet' }).first().click(); await p.waitForTimeout(600); }],
  ['engelsk', async p => { await p.evaluate(() => window.MLI18N.set('en')); }],
  ['lys modus', async p => { await p.evaluate(() => window.MLTheme.set('light')); await p.waitForTimeout(900); }],
];

test('mockups: original og React oppfører seg likt', async ({ browser }, info) => {
  test.setTimeout(600_000);
  const viewport = info.project.use.viewport;
  await flow(browser, 'mockups-' + info.project.name, '/_original/mockups.dc.html', '/mockups.dc.html', STEPS, { viewport, settle: 900 });
});
