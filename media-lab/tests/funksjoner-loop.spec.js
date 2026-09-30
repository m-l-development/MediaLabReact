// Ukeprogram Loop (studio-editor), original mot React: ukeprogram fra .txt/.csv og fra bilde (tekstgjenkjenning,
// tesseract.js), lydbibliotek med takt-analyse, takt-synk og finjustering, og eksport med dette på plass.
import { test } from '@playwright/test';
import path from 'node:path';
import { flow } from './parity.js';

const F = n => path.resolve('tests/fixtures/' + n);
const knapp = (p, n) => p.getByRole('button', { name: n, exact: true });
const medFil = (fil, klikk) => async p => { p.__nextFile = F(fil); await klikk(p); await p.waitForTimeout(1500); };
/* venter til lesing/analyse er ferdig */
const ferdig = async p => { await p.waitForTimeout(400); await p.waitForFunction(() => !/Leser bildet|Leser …|Analyserer/.test(document.body.innerText), null, { timeout: 240_000, polling: 300 }); await p.waitForTimeout(600); };
const fane = n => async p => { await p.getByRole('button', { name: new RegExp('^' + n + '$', 'i') }).first().click(); await p.waitForTimeout(500); };
const synlig = async (p, re) => { for (const f of ['Program', 'Slides', 'Stil', 'Effekter', 'Eksport']) { if (await p.getByRole('button', { name: re }).first().isVisible().catch(() => false)) return; await fane(f)(p); } };

const STEG = [
  ['start', async p => {}],
  ['fra fil: program.txt', medFil('program.txt', p => p.getByRole('button', { name: /^Fra fil/ }).first().click())],
  ['fra fil: program.csv', medFil('program.csv', p => p.getByRole('button', { name: /^Fra fil/ }).first().click())],
  ['fra bilde: program.png (tekstgjenkjenning)', async p => { p.__nextFile = F('program.png'); await p.getByRole('button', { name: /^Fra bilde/ }).first().click(); await ferdig(p); }, { seq: true }],
  ['lydbibliotek: legg til takt.wav', async p => { await synlig(p, /Legg til lyder/); p.__nextFile = F('takt.wav'); await p.getByRole('button', { name: /Legg til lyder/ }).first().click(); await ferdig(p); }, { seq: true }],
  ['velg sangen', async p => { await p.getByRole('button', { name: /takt/i }).first().click().catch(() => {}); await ferdig(p); }],
  ['takt-synk: gå til innstillingen', async p => { for (const f of ['Effekter', 'Stil', 'Eksport', 'Program', 'Slides']) { if (await p.getByText('Følg takten i musikken').first().isVisible().catch(() => false)) break; await fane(f)(p); } }],
  ['slå av takt-synk', async p => { const b = knapp(p, 'Slå av takt-synk'); if (await b.isVisible().catch(() => false)) await b.click(); await p.waitForTimeout(600); }],
  ['slå på takt-synk', async p => { await knapp(p, 'Slå på takt-synk').click(); await ferdig(p); }],
  ['finjuster slaget', async p => { await p.getByRole('button', { name: /Finjuster slaget/ }).first().click().catch(() => {}); await p.waitForTimeout(600); }],
  /* eksportknappene har dynamisk tekst; data-dc-tpl er det samme i original og React */
  ['eksport: fullskjerm-spiller (.html)', async p => { await fane('Eksport')(p); await p.locator('[data-dc-tpl="1196"]').click(); await p.waitForTimeout(4000); }, { seq: true }],
  ['eksport: MP4 1080p', async p => { await p.locator('[data-dc-tpl="1205"]').click(); await p.waitForFunction(() => document.querySelector('[data-dc-tpl="1205"]'), null, { timeout: 300_000, polling: 500 }); await p.waitForTimeout(1500); }, { seq: true }],
  ['eksport: MP4 4K', async p => { await p.locator('[data-dc-tpl="1204"]').click(); await p.waitForFunction(() => document.querySelector('[data-dc-tpl="1204"]'), null, { timeout: 300_000, polling: 500 }); await p.waitForTimeout(1500); }, { seq: true }],
];

/* bare desktop: funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene */
test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobil' && !process.env.MOBIL, 'funksjonstestene kjøres på desktop (MOBIL=1 kjører dem også på mobil)'); });

test('ukeprogram fra fil og bilde, takt-synk og eksport', async ({ browser }, info) => {
  test.setTimeout(40 * 60_000);
  await flow(browser, 'loop-funksjoner-' + info.project.name, '/_original/studio-editor.dc.html?mal=week&id=week', '/studio-editor.dc.html?mal=week&id=week', STEG,
    { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), clock: 400, settle: 700 });
});
