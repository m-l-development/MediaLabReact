// Motion Design, original mot React: video + overlegg, grønnskjerm, farge, RGB-kurver, kopier/lim inn farge og lyd,
// musikk, voiceover (simulert mikrofon som spiller tests/fixtures/tale.wav), lydmikser med ducking og utjevning,
// AI-undertekster (Whisper) + .srt ut og inn, .motion lagre og åpne, eksport 1080p60 og 4K30, autolagring.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { flow, openSide } from './parity.js';

const T = id => `[data-dc-tpl="${id}"]`;
const F = n => path.resolve('tests/fixtures/' + n);
const NOW = Date.parse('2026-09-29T12:00:00Z');
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + F('tale.wav')] } });

const ferdig = async (p, ms = 600_000) => { await p.waitForTimeout(400); await p.waitForFunction(() => !/Laster ned|Lager undertekster|Transkriberer|Analyserer|Eksporterer|Koder|Forbereder|Utjevner|%\s*$/.test(document.body.innerText.slice(0, 20000)), null, { timeout: ms, polling: 500 }).catch(() => {}); await p.waitForTimeout(800); };
const lastNed = async (p, klikk) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 600_000 }), klikk()]); p.__sist = await d.path(); await p.waitForTimeout(500); };
/* åpner en seksjon (+/−); reserveklikket brukes bare hvis den fortsatt er lukket */
const seksjon = n => async p => { const s = p.locator(T(353)).filter({ hasText: n }), lukket = async () => /\+\s*$/.test(await s.innerText());
  if (await lukket()) { await s.scrollIntoViewIfNeeded(); await s.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); if (await lukket()) await s.dispatchEvent('click'); } await p.waitForTimeout(400); };
const klikk = loc => loc.scrollIntoViewIfNeeded().then(() => loc.click({ timeout: 3000 })).catch(() => loc.dispatchEvent('click'));
/* velger overlegget (bildet) på tidslinjen, hvis ingen klipp er valgt */
/* lukker eksportvinduet (Lukk, ellers Escape) */
const lukkEksport = async p => { for (let i = 0; i < 3 && await p.locator(T(544)).isVisible().catch(() => false); i++) { await p.locator(T(543)).click({ timeout: 3000 }).catch(() => p.keyboard.press('Escape')); await p.waitForTimeout(600); } };
const klipp = (p, re) => p.locator('[data-dc-tpl="442"], [data-dc-tpl="452"]').filter({ hasText: re });
const velgKlipp = re => async p => { const k = klipp(p, re); const n = await k.count(); const el = n ? k.first() : p.locator('[data-dc-tpl="442"], [data-dc-tpl="452"]').last(); const b = await el.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(600); };
const velgOverlegg = async p => { if (await p.locator(T(343)).isVisible().catch(() => false)) return; await velgKlipp(/sondag/i)(p); };
const kurve = async p => p.locator(T(366)).first(); /* kurveeditoren (klikk på linjen = nytt punkt, dra = flytt) */
const dra = async (p, loc, fx1, fy1, fx2, fy2) => { const b = await loc.boundingBox(); await p.mouse.move(b.x + b.width * fx1, b.y + b.height * fy1); await p.mouse.down(); await p.mouse.move(b.x + b.width * fx2, b.y + b.height * fy2, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(400); };

export const STEG = [
  ['nytt prosjekt 16:9, tomt', async p => { await p.getByRole('button', { name: 'Nytt prosjekt' }).click(); await p.waitForTimeout(600); await p.locator(T(60)).nth(3).click(); await p.waitForTimeout(600); await p.locator(T(79)).last().click(); await p.waitForTimeout(1500); }],
  ['prosjektnavn', async p => { await p.locator(T(94)).fill('Motiontest'); }],
  ['video på tidslinjen', async p => { p.__nextFile = F('video.webm'); await p.locator(T(153)).click(); await ferdig(p); await p.locator(T(176)).first().click(); await p.waitForTimeout(1500); }],
  ['bilde som overlegg', async p => { p.__nextFile = path.resolve('public/images/sondag.jpeg'); await p.locator(T(153)).click(); await ferdig(p); await p.locator(T(178)).last().click(); await p.waitForTimeout(1500); }],
  ['grønnskjerm på', async p => { await seksjon('GRØNNSKJERM')(p); await p.locator(T(393)).first().click(); await p.waitForTimeout(700); }],
  ['grønnskjerm: juster', async p => { const r = p.locator(T(393)).first().locator('xpath=ancestor::div[2]').locator('input[type=range]'); const n = await r.count(); for (let i = 0; i < n; i++) await r.nth(i).fill(String(i === 0 ? 0.3 : 0.2)); await p.waitForTimeout(500); }],
  ['farge: forhåndsvalg og glidebrytere', async p => { await seksjon('FARGE')(p); await p.locator(T(389)).selectOption({ index: 2 }).catch(() => p.locator(T(389)).first().click()); const r = p.locator(T(353)).filter({ hasText: 'FARGE' }).locator('xpath=following-sibling::*[1]').locator('input[type=range]'); const n = await r.count(); for (let i = 0; i < n; i++) { const mn = +(await r.nth(i).getAttribute('min')), mx = +(await r.nth(i).getAttribute('max')); await r.nth(i).fill(String(mn + (mx - mn) * 0.7)); } await p.waitForTimeout(500); }],
  /* drag i kurveeditoren velger bort klippet (likt i original og React), så overlegget velges på nytt før hvert steg */
  ['RGB-kurver: alle kanaler', async p => { await seksjon('RGB-KURVER')(p); await klikk(p.locator(T(365)).nth(0)); await dra(p, await kurve(p), 0.5, 0.5, 0.5, 0.3); }],
  ['velg overlegget igjen', velgOverlegg],
  ['RGB-kurver: rød', async p => { await seksjon('RGB-KURVER')(p); await klikk(p.locator(T(365)).nth(1)); await dra(p, await kurve(p), 0.25, 0.75, 0.25, 0.6); }],
  ['velg overlegget igjen (2)', velgOverlegg],
  ['RGB-kurver: blå + nullstill kanal', async p => { await seksjon('RGB-KURVER')(p); await klikk(p.locator(T(365)).nth(3)); await dra(p, await kurve(p), 0.75, 0.25, 0.75, 0.4); await velgOverlegg(p); await seksjon('RGB-KURVER')(p); await klikk(p.locator(T(365)).nth(3)); await klikk(p.locator(T(369))); }],
  ['velg overlegget igjen (3)', velgOverlegg],
  ['kopier farge og lyd', async p => { await p.locator(T(347)).filter({ hasText: 'Kopier farge og lyd' }).click(); await p.waitForTimeout(500); }],
  ['velg videoklippet', velgKlipp(/video/i)],
  ['lim inn farge og lyd', async p => { await p.locator(T(347)).filter({ hasText: /Lim inn/ }).first().click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(700); }],
  ['musikk: last opp takt.wav', async p => { await p.locator(T(132)).click(); await p.waitForTimeout(400); p.__nextFile = F('takt.wav'); await p.locator(T(242)).click(); await ferdig(p); }],
  ['lydmikser: ducking og utjevning', async p => { await p.locator(T(343)).click().catch(() => {}); await p.waitForTimeout(400); await seksjon('LYDMIKSER')(p); await p.locator(T(393)).filter({ hasText: /Senk musikken/ }).click(); await p.waitForTimeout(400); await p.locator(T(401)).click(); await ferdig(p); }],
  ['lydmikser: nivåer', async p => { const r = p.locator(T(376)); const n = Math.min(3, await r.count()); for (let i = 0; i < n; i++) await r.nth(i).fill(String(0.6 + i * 0.1)); await p.waitForTimeout(400); }],
  ['undertekster: importer .srt', async p => { await p.locator(T(127)).click(); await p.waitForTimeout(400); p.__nextFile = F('test.srt'); await p.locator(T(200)).click(); await p.waitForTimeout(1500); }],
  ['undertekster: last ned .srt', async p => { await lastNed(p, () => p.getByRole('button', { name: /Last ned \.srt/ }).first().click()); }],
  ['lagre prosjektfil (.motion)', async p => { await lastNed(p, () => p.locator(T(113)).click()); p.__motion = p.__sist; }],
  ['eksport 1080p60', async p => { await p.locator(T(114)).click(); await p.waitForTimeout(600); await p.locator(T(524)).nth(1).click(); await lastNed(p, () => p.locator(T(544)).click()); await ferdig(p); await lukkEksport(p); }, { seq: true }],
  ['eksport 4K30', async p => { await p.locator(T(114)).click(); await p.waitForTimeout(600); await p.locator(T(524)).nth(2).click(); await lastNed(p, () => p.locator(T(544)).click()); await ferdig(p); await lukkEksport(p); }, { seq: true }],
  ['autolagring på + lagre', async p => { await lukkEksport(p); await p.waitForTimeout(3000); await klikk(p.locator(T(99))); await p.waitForTimeout(600); await klikk(p.locator(T(100))); await p.waitForTimeout(800); }],
  ['last inn på nytt', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2000); }],
  ['åpne prosjektfilen (.motion)', async p => { const b = p.getByRole('button', { name: /Prosjekter/ }).first(); if (await b.isVisible().catch(() => false)) { await b.click(); await p.waitForTimeout(800); } p.__nextFile = p.__motion; await p.getByRole('button', { name: /Åpne prosjektfil/ }).first().click(); await ferdig(p); }],
];

/* bare desktop: funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene */
test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobil' && !process.env.MOBIL, 'funksjonstestene kjøres på desktop (MOBIL=1 kjører dem også på mobil)'); });

test('Motion Design: effekter, lyd, voiceover, Whisper, .motion, 60 fps og 4K', async ({ browser }, info) => {
  test.setTimeout(90 * 60_000);
  await flow(browser, 'motion-funksjoner-' + info.project.name, '/_original/motion-design.dc.html', '/motion-design.dc.html', STEG,
    { viewport: info.project.use.viewport, cdn: true, fixedNow: NOW, settle: 700, permissions: ['microphone'] });
});

/* Whisper (AI-undertekster) krasjer fanen når to faner med modellen er åpne samtidig (minne), også i originalen.
   Her kjøres originalen og React hver for seg med samme video, og de ferdige undertekstene sammenlignes. */
test('Whisper: AI-undertekster likt i original og React (én fane om gangen)', async ({ browser }, info) => {
  test.skip(!process.env.WHISPER, 'Whisper krasjer også originalens fane i headless Chrome (minne); kjør manuelt med WHISPER=1');
  test.setTimeout(60 * 60_000);
  const kjør = async url => {
    const { page: p, ctx } = await openSide(browser, url, { viewport: info.project.use.viewport, cdn: true, fixedNow: NOW });
    await p.waitForTimeout(1500); await STEG[0][1](p); await STEG[2][1](p);
    await p.locator(T(127)).click(); await p.waitForTimeout(400); await p.locator(T(191)).filter({ hasText: 'Norsk' }).click(); await p.locator(T(194)).first().click(); await p.locator(T(195)).click();
    await p.waitForFunction(() => /undertekster er laget|Klarte ikke å lage undertekster/.test(document.body.innerText), null, { timeout: 1_500_000, polling: 1000 }); await p.waitForTimeout(1500);
    const tekst = await p.evaluate(() => document.body.innerText);
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Last ned \.srt/ }).first().click()]);
    const srt = fs.readFileSync(await d.path(), 'utf8');
    await ctx.close(); return { melding: (tekst.match(/\d+ undertekster er laget[^.]*\./) || ['(ingen)'])[0], srt };
  };
  const a = await kjør('/_original/motion-design.dc.html'), b = await kjør('/motion-design.dc.html');
  console.log('WHISPER original: ' + a.melding + '\n' + a.srt.slice(0, 400) + '\nWHISPER react: ' + b.melding);
  expect(a.melding).toMatch(/undertekster er laget/);
  expect(b.srt).toBe(a.srt);
});

/* Voiceover (simulert mikrofon spiller tale.wav): sanntidsopptak varierer med noen hundredeler i lengde, også
   originalen mot seg selv, så begge versjonene kjøres hver for seg og klippet kontrolleres (≈ 3 s). */
test('voiceover: opptak blir et klipp på ≈ 3 s i original og React', async ({ browser }, info) => {
  test.setTimeout(10 * 60_000);
  const kjør = async url => {
    const { page: p, ctx } = await openSide(browser, url, { viewport: info.project.use.viewport, cdn: true, fixedNow: NOW, permissions: ['microphone'] });
    await STEG[0][1](p);
    await p.locator(T(132)).click(); await p.waitForTimeout(500);
    await p.locator(T(243)).click(); await p.waitForTimeout(3000); await p.locator(T(243)).click(); await ferdig(p);
    const lengder = await p.locator('input[type=number]').evaluateAll(es => es.map(e => +e.value));
    const tekst = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    await ctx.close(); return { lengde: lengder.find(v => v > 2.5 && v < 3.6), harKlipp: /Voiceover|voiceover|Opptak/.test(tekst) };
  };
  const a = await kjør('/_original/motion-design.dc.html'), b = await kjør('/motion-design.dc.html');
  console.log('VOICEOVER original ' + JSON.stringify(a) + ' / react ' + JSON.stringify(b));
  expect(a.lengde).toBeTruthy(); expect(b.lengde).toBeTruthy();
  expect(Math.abs(a.lengde - b.lengde)).toBeLessThan(0.3);
  expect(b.harKlipp).toBe(a.harKlipp);
});
