// Isolate Subject: opplasting, beskjæring, Logo/Tekst (fargenøkkel), Person (MODNet),
// «Merk i bildet» (SlimSAM) med fyll/gjennomsiktig, bakgrunner, eksport – original mot React.
// AI-modellene og transformers.js lastes fra CDN/Hugging Face via lokal buffer (.cache/cdn), og nedlastede PNG-er
// sammenlignes byte for byte.
// Objekt (BiRefNet, 115 MB) er ikke med: også originalen krasjer med den i headless Chrome (minne).
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { flow, IMG } from './parity.js';

const LOGO = path.resolve('test-results/isolate-logo.png');
const btn = (p, name) => p.getByRole('button', { name, exact: true });
const kind = (p, l) => p.getByRole('button', { name: new RegExp('^' + l + ' ') });
/* venter til arbeidet (modell-lasting, analyse, fjerning, fylling) er ferdig */
const idle = async (p, ms = 480_000) => {
  await p.waitForTimeout(300);
  await p.waitForFunction(() => !/Laster ned AI-modellen|Analyserer bildet|Fjerner bakgrunnen|Fjerner det merkede|Fyller inn med omgivelsene/.test(document.body.innerText), null, { timeout: ms, polling: 250 });
  await p.waitForTimeout(500);
};
const clickView = async (p, fx, fy, right) => { const b = await p.locator('canvas[width]').filter({ hasNot: p.locator('xx') }).last().boundingBox(); await p.mouse.click(b.x + b.width * fx, b.y + b.height * fy, { button: right ? 'right' : 'left' }); };

const STEPS = [
  ['start', async p => {}],
  ['last opp logo-bilde', async p => { await p.locator('input[type=file]').setInputFiles(LOGO); await p.waitForTimeout(800); }],
  ['beskjær 16:9', async p => { await btn(p, '16:9').click(); }],
  ['beskjær og fortsett', async p => { await btn(p, 'Beskjær og fortsett').click(); await p.waitForTimeout(500); }],
  ['Logo', async p => { await kind(p, 'Logo').click(); await idle(p); }],
  ['bakgrunn farge', async p => { await btn(p, 'Farge').click(); }],
  ['marineblå', async p => { await p.getByRole('button', { name: 'Marineblå' }).click(); }],
  ['egen farge', async p => { await p.getByLabel('Egen farge').fill('#aa3366'); }],
  ['myk kant og stramhet', async p => { const r = p.locator('input[type=range]:not([aria-label])'); if (await r.count() >= 2) { await r.nth(0).fill('4'); await r.nth(1).fill('6'); } await idle(p); }],
  ['sammenlign', async p => { await p.getByLabel('Sammenlign med originalen').fill('50'); }],
  ['beskjær til motivet', async p => { await p.getByRole('button', { name: /^Beskjær til motivet/ }).click(); }],
  ['last ned PNG (logo)', async p => { await btn(p, 'Last ned PNG').click(); await p.waitForTimeout(1500); }],
  ['annet motiv i samme bilde', async p => { await btn(p, 'Annet motiv i samme bilde').click(); }],
  ['Tekst', async p => { await kind(p, 'Tekst').click(); await idle(p); }],
  ['gjennomsiktig + last ned', async p => { await btn(p, 'Gjennomsiktig').first().click(); await btn(p, 'Last ned PNG').click(); await p.waitForTimeout(1500); await btn(p, 'Nei takk').click(); }],
  ['tilbake til originalen', async p => { await p.getByTitle('Tilbake til originalbildet').click(); }],
  ['beskjær på nytt', async p => { await p.getByTitle('Gå tilbake og beskjær bildet').click(); await btn(p, 'Hopp over').click(); }],
  ['nytt bilde (foto)', async p => { await btn(p, 'Nytt bilde').first().click(); await p.locator('input[type=file]').setInputFiles(IMG); await p.waitForTimeout(800); await btn(p, 'Hopp over').click(); }],
  ['Person (MODNet)', async p => { await kind(p, 'Person').click(); await idle(p); }, { seq: true }],
  ['last ned PNG (person)', async p => { await btn(p, 'Last ned PNG').click(); await p.waitForTimeout(2000); await btn(p, 'Nei takk').click(); }],
  ['merk i bildet', async p => { await p.getByRole('button', { name: /^Merk i bildet/ }).click(); await p.waitForTimeout(500); }],
  ['merk område å fjerne (SlimSAM)', async p => { await clickView(p, 0.5, 0.45); await idle(p); }, { seq: true }],
  ['merk område å beholde', async p => { await btn(p, 'Behold').click(); await clickView(p, 0.2, 0.8); await idle(p); }],
  ['fjern (fyll med omgivelser)', async p => { await btn(p, 'Fjern').last().click(); await idle(p); }],
  ['angre', async p => { await p.getByTitle('Angre siste steg').click(); await idle(p); }],
  ['gjennomsiktig fyll + fjern', async p => { await btn(p, 'Gjennomsiktig').first().click(); await btn(p, 'Fjern').last().click(); await idle(p); }],
  ['last ned PNG (merket)', async p => { await btn(p, 'Last ned PNG').click(); await p.waitForTimeout(2000); await btn(p, 'Nei takk').click(); }],
  ['engelsk', async p => { await p.evaluate(() => window.MLI18N.set('en')); }],
  ['lys modus', async p => { await p.evaluate(() => window.MLTheme.set('light')); await p.waitForTimeout(900); }],
];

test.beforeAll(async ({ browser }) => {
  if (fs.existsSync(LOGO)) return;
  const p = await browser.newPage();
  const url = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 700; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1200, 700); g.fillStyle = '#1d3557'; g.beginPath(); g.arc(360, 350, 170, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e76f51'; g.fillRect(600, 220, 380, 260); g.fillStyle = '#ffffff'; g.font = 'bold 90px Arial'; g.fillText('ML', 290, 385); return c.toDataURL('image/png'); });
  fs.mkdirSync(path.dirname(LOGO), { recursive: true }); fs.writeFileSync(LOGO, Buffer.from(url.split(',')[1], 'base64')); await p.close();
});

test('isolate-subject: original og React oppfører seg likt', async ({ browser }, info) => {
  test.setTimeout(40 * 60_000);
  await flow(browser, 'isolate-' + info.project.name, '/_original/isolate-subject.dc.html', '/isolate-subject.dc.html', STEPS, { viewport: info.project.use.viewport, cdn: true, settle: 900 });
});
