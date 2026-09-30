// Photo Design, original mot React:
// - avansert modus: alle 13 effekttyper og alle 80 looks som lag, alle 8 paletter × 3 styrker, favoritter,
//   eksport og import av egne forhåndsvalg
// - alle 1920 forhåndsvalg tegnet med appens egen effektmotor (MLFX.thumb), piksler sammenlignet
// - AI-utklipp (Person) med pensel på masken (mal/fjern/gjenopprett), inverter og fjern maske
// - trykk: utfallende 3 mm, bakside (tosidig), PDF trykk (CMYK), PNG/JPG 1×/2×, kopier, lagre og autolagring
import { test, expect } from '@playwright/test';
import { flow, openSide } from './parity.js';

const T = id => `[data-dc-tpl="${id}"]`;
const NOW = Date.parse('2026-09-29T12:00:00Z');
const ferdig = async p => { await p.waitForTimeout(300); await p.waitForFunction(() => !/Laster ned AI-modellen|Klipper ut|Fjerner bakgrunn|Analyserer|Lager PDF/.test(document.body.innerText), null, { timeout: 300_000, polling: 300 }); await p.waitForTimeout(500); };
const lerret = async p => { const bs = await p.locator('canvas').evaluateAll(cs => cs.map(c => { const r = c.getBoundingClientRect(); return r.width * r.height; })); return p.locator('canvas').nth(bs.indexOf(Math.max(...bs))); };
const dra = (fx1, fy1, fx2, fy2) => async p => { const b = await (await lerret(p)).boundingBox(); await p.mouse.move(b.x + b.width * fx1, b.y + b.height * fy1); await p.mouse.down(); await p.mouse.move(b.x + b.width * fx2, b.y + b.height * fy2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(400); };
const fane = n => async p => { await p.locator(T(144)).filter({ hasText: new RegExp('^' + n + '$') }).click(); await p.waitForTimeout(500); };
const TYPER = ['Sollys', 'Spotlys', 'Måne', 'Ild', 'Røyk', 'Slør', 'Farget lys', 'Lysstriper', 'Atmosfære', 'Glød og bloom', 'Lyslekkasje', 'Vignett og korn', 'Partikler'];
const alleLooks = async p => { for (let i = 0; i < 20; i++) { const v = p.locator(T(336)); if (!(await v.isVisible().catch(() => false))) break; await v.click(); await p.waitForTimeout(200); } };

/* bare desktop: funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene */
test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobil', 'funksjonstestene kjøres på desktop'); });

test('effekter: 13 typer, 80 looks, 8 paletter × 3 styrker, favoritter, egne forhåndsvalg', async ({ browser }, info) => {
  test.setTimeout(60 * 60_000);
  const steg = [
    ['16:9 + Tomt', async p => { await p.locator(T(33)).filter({ hasText: '16:9' }).click(); await p.locator(T(51)).filter({ hasText: 'Tomt' }).click(); await p.waitForTimeout(1200); }],
    ['effekter + avansert modus', async p => { await fane('Effekter')(p); await p.locator(T(304)).click(); await p.waitForTimeout(600); }],
  ];
  /* hver effekttype: vis alle looks og legg hver av dem til som lag */
  for (const t of TYPER) {
    steg.push([`${t}: vis alle`, async p => { await p.locator(T(314)).filter({ hasText: new RegExp('^' + t + '$') }).click(); await p.waitForTimeout(300); await alleLooks(p); }]);
    for (let k = 0; k < 8; k++) steg.push([`${t}: look ${k + 1}`, async p => { const l = p.locator(T(330)); if (await l.count() > k) { await l.nth(k).click(); await p.waitForTimeout(250); await fane('Effekter')(p); } }]);
  }
  /* alle 8 paletter × 3 styrker på én look */
  steg.push(['Sollys igjen', async p => { await p.locator(T(314)).filter({ hasText: /^Sollys$/ }).click(); await p.waitForTimeout(300); }]);
  for (let pi = 0; pi < 8; pi++) for (let si = 0; si < 3; si++) steg.push([`palett ${pi + 1} × styrke ${si + 1}`, async p => { await p.locator(T(319)).nth(pi).click(); await p.locator(T(322)).nth(si).click(); await p.waitForTimeout(200); await p.locator(T(330)).first().click(); await p.waitForTimeout(250); await fane('Effekter')(p); }]);
  steg.push(
    ['favoritt på to looks', async p => { await p.locator(T(333)).nth(0).click(); await p.locator(T(333)).nth(2).click(); await p.waitForTimeout(300); }],
    ['vis favoritter', async p => { await p.locator(T(314)).filter({ hasText: /^Favoritter$/ }).click(); await p.waitForTimeout(300); }],
    ['vis nylig brukt', async p => { await p.locator(T(314)).filter({ hasText: /^Nylig brukt$/ }).click(); await p.waitForTimeout(300); }],
    ['eksporter egne forhåndsvalg', async p => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator(T(339)).click()]); p.__egne = d && await d.path(); await p.waitForTimeout(500); }],
    ['importer egne forhåndsvalg', async p => { if (p.__egne) { p.__nextFile = p.__egne; await p.locator(T(338)).click(); await p.waitForTimeout(1200); } }],
    ['vis egne', async p => { await p.locator(T(314)).filter({ hasText: /^Egne$/ }).click(); await p.waitForTimeout(300); }],
    ['lagre', async p => { await p.locator(T(111)).click(); await p.waitForTimeout(800); }],
    ['eksporter PNG', async p => { await p.locator(T(116)).click(); await p.waitForTimeout(500); await p.locator(T(121)).filter({ hasText: /^PNG$/ }).click(); await p.locator(T(135)).click(); await p.waitForTimeout(3000); }],
  );
  await flow(browser, 'photo-effekter-' + info.project.name, '/_original/photo-design.dc.html', '/photo-design.dc.html', steg,
    { viewport: info.project.use.viewport, fixedNow: NOW, settle: 250, viewportOnly: true });
});

test('alle 1920 forhåndsvalg tegnes likt (MLFX.thumb)', async ({ browser }) => {
  test.setTimeout(20 * 60_000);
  const hash = async url => { const { page, ctx } = await openSide(browser, url, { fixedNow: NOW }); const h = await page.evaluate(async () => {
    const P = window.MLFX.presets(), out = [];
    for (let i = 0; i < P.length; i++) { const s = window.MLFX.thumb(P[i], 96, 60); let h = 2166136261; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619) >>> 0; out.push(P[i].id + ':' + h.toString(36)); if (i % 200 === 0) await new Promise(r => setTimeout(r)); }
    return out; }); await ctx.close(); return h; };
  const [a, b] = [await hash('/_original/photo-design.dc.html'), await hash('/photo-design.dc.html')];
  console.log(`forhåndsvalg: ${a.length} i originalen, ${b.length} i React, ${a.filter((x, i) => x !== b[i]).length} ulike`);
  expect(a.length).toBe(1920);
  expect(b).toEqual(a);
});

test('AI-maske med pensel, trykk (utfallende, bakside, PDF/CMYK), eksport og autolagring', async ({ browser }, info) => {
  test.setTimeout(40 * 60_000);
  const steg = [
    ['A4 + Tomt', async p => { await p.locator(T(33)).filter({ hasText: 'A4 plakat' }).click(); await p.locator(T(51)).filter({ hasText: 'Tomt' }).click(); await p.waitForTimeout(1500); }],
    ['legg til bilde', async p => { await p.locator(T(149)).filter({ hasText: /^Bilde$/ }).click(); await ferdig(p); }],
    ['motiv: Person (MODNet)', async p => { await p.locator(T(429)).filter({ hasText: /^Motiv$/ }).click(); await p.waitForTimeout(500); await p.locator(T(595)).click(); await ferdig(p); }, { seq: true }],
    ['pensel: mal på masken', async p => { await p.locator(T(599)).click(); await p.waitForTimeout(400); }],
    ['pensel: størrelse og hardhet', async p => { await p.locator(T(608)).nth(0).fill('120'); await p.locator(T(608)).nth(1).fill('0.3'); }],
    ['pensel: fjern (dra)', async p => { await p.locator(T(602)).filter({ hasText: /^Fjern$/ }).click(); await dra(0.3, 0.3, 0.6, 0.5)(p); }],
    ['pensel: gjenopprett (dra)', async p => { await p.locator(T(602)).filter({ hasText: /^Gjenopprett$/ }).click(); await dra(0.35, 0.45, 0.55, 0.4)(p); }],
    ['inverter masken', async p => { await p.locator(T(611)).click(); await ferdig(p); }],
    ['angre og gjør om', async p => { await p.locator(T(97)).click(); await p.waitForTimeout(400); await p.locator(T(98)).click(); await p.waitForTimeout(400); }],
    ['fjern maske', async p => { await p.locator(T(612)).click(); await ferdig(p); }],
    ['angre (masken tilbake)', async p => { await p.locator(T(97)).click(); await ferdig(p); }],
    ['utfallende 3 mm', async p => { await p.keyboard.press('Escape'); await p.locator(T(413)).click(); await p.waitForTimeout(600); }],
    ['legg til bakside', async p => { await p.locator(T(422)).click(); await p.waitForTimeout(800); }],
    ['bakside: tekst', async p => { await p.locator(T(149)).filter({ hasText: /^Tekst$/ }).click(); await p.waitForTimeout(600); }],
    ['eksport: PDF trykk (CMYK)', async p => { await p.locator(T(116)).click(); await p.waitForTimeout(500); await p.locator(T(121)).filter({ hasText: /PDF trykk/ }).click(); await p.waitForTimeout(400); await p.locator(T(135)).click(); await ferdig(p); await p.waitForTimeout(2500); }, { seq: true }],
    ['eksport: PNG 2×', async p => { if (!(await p.locator(T(135)).isVisible().catch(() => false))) await p.locator(T(116)).click(); await p.locator(T(121)).filter({ hasText: /^PNG$/ }).click(); await p.locator(T(128)).nth(1).click(); await p.locator(T(135)).click(); await p.waitForTimeout(4000); }, { seq: true }],
    ['eksport: JPG 1×', async p => { if (!(await p.locator(T(135)).isVisible().catch(() => false))) await p.locator(T(116)).click(); await p.locator(T(121)).filter({ hasText: /^JPG$/ }).click(); await p.locator(T(128)).nth(0).click(); await p.locator(T(135)).click(); await p.waitForTimeout(3000); }],
    ['kopier bilde', async p => { if (!(await p.locator(T(137)).isVisible().catch(() => false))) await p.locator(T(116)).click(); await p.locator(T(137)).click(); await p.waitForTimeout(2500); }],
    ['prosjektnavn og lagre', async p => { await p.keyboard.press('Escape'); await p.locator(T(95)).fill('Trykktest'); await p.locator(T(111)).click(); await p.waitForTimeout(800); }],
    ['autolagring på', async p => { await p.locator(T(112)).click(); await p.waitForTimeout(500); }],
    ['endring etter lagring', async p => { await p.locator(T(149)).filter({ hasText: /^Sirkel$/ }).click(); await p.waitForTimeout(2500); }],
    ['last inn på nytt', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1800); }],
    ['åpne prosjektet', async p => { await p.getByText('Trykktest').first().click().catch(() => {}); await p.waitForTimeout(1800); }],
  ];
  await flow(browser, 'photo-trykk-' + info.project.name, '/_original/photo-design.dc.html', '/photo-design.dc.html', steg,
    { viewport: info.project.use.viewport, cdn: true, fixedNow: NOW, settle: 700 });
});
