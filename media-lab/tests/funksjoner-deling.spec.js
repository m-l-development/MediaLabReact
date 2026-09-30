// «Send til …» og den delte mappen (ml-share.js, IndexedDB medialab-share), original mot React.
// Et resultat fra Isolate Subject sendes til hvert verktøy som tar imot bilder, og derfra videre.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { flow } from './parity.js';

const PROGRAM = path.resolve('tests/fixtures/program.png');
const knapp = (p, n) => p.getByRole('button', { name: n, exact: true });
const ferdig = async p => { await p.waitForFunction(() => !/Laster ned AI-modellen|Analyserer bildet|Fjerner bakgrunnen/.test(document.body.innerText), null, { timeout: 120_000 }); await p.waitForTimeout(500); };
const sendTil = navn => async p => {
  await p.getByRole('button', { name: /^Send til/i }).first().click(); await p.waitForTimeout(500);
  await Promise.all([p.waitForURL(/\?import=|\.dc\.html$/, { timeout: 15_000 }).catch(() => {}), knapp(p, navn).click()]);
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(2500);
  const fil = { 'Photo design': 'photo-design', 'Thumbnail Studio': 'thumbnail-studio', 'Mockups': 'mockups', 'Motion design': 'motion-design', 'Isolate Subject': 'isolate-subject' }[navn];
  expect(new URL(p.url()).pathname, 'åpnet målverktøyet').toMatch(new RegExp('/' + fil + '\\.dc\\.html$'));
  if (process.env.VIS) console.log('ETTER SENDING ' + p.url() + '\n  ' + (await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300))));
};
const isolateResultat = [
  ['last opp i Isolate Subject', async p => { await p.locator('input[type=file]').setInputFiles(PROGRAM); await p.waitForTimeout(800); await knapp(p, 'Hopp over').click(); }],
  ['Tekst (fargenøkkel)', async p => { await p.getByRole('button', { name: /^Tekst / }).click(); await ferdig(p); }],
];

const MAL = {
  'Photo design': [],
  'Thumbnail Studio': [['åpne første kategori og mal', async p => { await p.locator('button').filter({ hasText: /ÅPNE|Åpne/ }).first().click(); await p.waitForTimeout(1200); await p.locator('button').filter({ hasText: /\+ NY MAL|\+ Ny mal/ }).first().click().catch(() => {}); await p.waitForTimeout(800); await p.locator('button').filter({ hasText: /Grunnoppsett|Standard/ }).first().click().catch(() => {}); await p.waitForTimeout(2500); }]],
  'Mockups': [['åpne en mockup', async p => { await p.locator('[style*="aspect-ratio"]').first().click(); await p.waitForTimeout(1000); }]],
  'Motion design': [['nytt prosjekt (tar imot i editoren)', async p => { await knapp(p, 'Nytt prosjekt').click(); await p.waitForTimeout(500); await p.locator('button').filter({ hasText: /1:1|Instagram/ }).first().click(); await p.waitForTimeout(500); await p.locator('button').filter({ hasText: /Tom|Blank/ }).first().click().catch(() => {}); await p.waitForTimeout(2500); }]],
};
for (const [mal, etter] of Object.entries(MAL)) {
  test(`send fra Isolate Subject til ${mal}`, async ({ browser }, info) => {
    test.setTimeout(10 * 60_000);
    const vis = ['kontroll', async p => { const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')); if (process.env.VIS) console.log('MOTTATT i ' + mal + ': ' + /program-isolert/.test(t) + ' | ' + t.slice(0, 220)); }];
    const steg = [...isolateResultat, [`send til ${mal}`, sendTil(mal)], ...etter, vis];
    await flow(browser, `deling-${mal.replace(/\s/g, '')}-${info.project.name}`, '/_original/isolate-subject.dc.html', '/isolate-subject.dc.html', steg, { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 900 });
  });
}

/* bare desktop: funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene */
test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobil', 'funksjonstestene kjøres på desktop'); });

test('delt mappe: legg i og hent fra', async ({ browser }, info) => {
  test.setTimeout(10 * 60_000);
  const steg = [
    ...isolateResultat,
    ['legg i delt mappe', async p => { await p.getByRole('button', { name: /^Send til/i }).first().click(); await p.waitForTimeout(400); await knapp(p, 'Legg i delt mappe').click(); await p.waitForTimeout(800); }],
    ['nytt bilde', async p => { await knapp(p, 'Nytt bilde').first().click(); await p.waitForTimeout(600); await p.keyboard.press('Escape'); }],
    ['åpne Mockups', async p => { await p.goto(new URL('mockups.dc.html', p.url()).href, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); await p.locator('[style*="aspect-ratio"]').first().click(); await p.waitForTimeout(800); }],
    ['hent fra delt mappe', async p => { await knapp(p, 'Fra delt mappe').click(); await p.waitForTimeout(800); }],
    ['velg filen', async p => { await p.locator('[role=dialog] button, body > div button').filter({ hasText: /isolert|program/i }).first().click().catch(() => {}); await p.waitForTimeout(1200); }],
  ];
  await flow(browser, `deling-mappe-${info.project.name}`, '/_original/isolate-subject.dc.html', '/isolate-subject.dc.html', steg, { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 900 });
});

test('Mockups: egne mockup-bilder etter ny innlasting, og send videre', async ({ browser }, info) => {
  test.setTimeout(10 * 60_000);
  const TIRSDAG = path.resolve('public/images/tirsdag.png');
  const steg = [
    ['legg til egne mockup-bilder', async p => { await p.locator('input[type=file][multiple]').setInputFiles([TIRSDAG, path.resolve('public/images/sondag.jpeg')]); await p.waitForTimeout(3000); }],
    ['last inn på nytt', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500); }],
    ['åpne et eget mockup-bilde', async p => { await p.getByRole('button', { name: /tirsdag/i }).first().click(); await p.waitForTimeout(1200); }],
    ['last opp design', async p => { await p.locator('input[type=file][accept*="gif"]').setInputFiles(PROGRAM); await p.waitForTimeout(1500); }],
    ['send til Isolate Subject', sendTil('Isolate Subject')],
  ];
  await flow(browser, `deling-mockups-${info.project.name}`, '/_original/mockups.dc.html', '/mockups.dc.html', steg, { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 900 });
});
