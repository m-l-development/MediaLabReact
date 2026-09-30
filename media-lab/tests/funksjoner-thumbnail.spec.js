// Thumbnail Studio, original mot React: bilde i mal, AI-utklipp (Person/MODNet), fjern tomme kanter, eksport med
// gjennomsiktig bakgrunn og i 4K, lagre mal, grunnoppsett, sikkerhetskopi → gjenoppretting, autolagring etter ny
// innlasting, og deretter tilfeldige handlinger i editoren. data-dc-tpl er likt i original og React.
import { test } from '@playwright/test';
import { flow } from './parity.js';

const T = id => `[data-dc-tpl="${id}"]`;
const knapp = (p, n) => p.getByRole('button', { name: n, exact: true });
const ferdig = async p => { await p.waitForTimeout(400); await p.waitForFunction(() => !/Laster ned AI-modellen|Leser bildet|Lager skisse|Fjerner|Klipper ut|Beregner filstørrelse/.test(document.body.innerText), null, { timeout: 300_000, polling: 300 }); await p.waitForTimeout(700); };
const lastNed = async (p, klikk) => { const [d] = await Promise.all([p.waitForEvent('download'), klikk()]); p.__sist = await d.path(); await p.waitForTimeout(500); };

const STEG = [
  ['start', async p => {}],
  ['kategori Søndagsmøte', async p => { await p.locator(T(74)).first().click(); await p.waitForTimeout(700); }],
  ['ny mal: Sitat og person', async p => { await p.locator(T(127)).click(); await p.waitForTimeout(600); await p.locator(T(475)).filter({ hasText: 'SITAT OG PERSON' }).click(); await p.waitForTimeout(1800); }],
  ['legg til tekstlag', async p => { await p.locator(T(165)).nth(0).click(); await p.waitForTimeout(600); await p.keyboard.press('Escape'); }],
  ['koble to lag (dra i lagpanelet)', async p => { const a = p.getByText('Ny tekst', { exact: true }).first(), b = p.getByText('Fornavn Etternavn', { exact: true }).first(); await a.dragTo(b); await p.waitForTimeout(800); }],
  ['legg til bildelag', async p => { await p.locator(T(165)).nth(1).click(); await ferdig(p); }],
  ['velg personlaget', async p => { await p.getByText('Person', { exact: true }).first().click(); await p.waitForTimeout(700); }],
  ['velg bilde til personlaget', async p => { await p.locator(T(377)).first().click(); await ferdig(p); }],
  ['AI-utklipp: Person (MODNet)', async p => { await p.locator(T(384)).first().click(); await ferdig(p); }, { seq: true }],
  ['fjern tomme kanter', async p => { await p.getByRole('button', { name: /Fjern tomme kanter/ }).first().click().catch(() => {}); await ferdig(p); }],
  ['navn på malen', async p => { await p.getByPlaceholder('Navn på malen').fill('Testmal'); }],
  ['lagre mal', async p => { await p.locator(T(63)).click(); await p.waitForTimeout(600); await p.locator(T(538)).fill('Testmal lagret'); await p.locator(T(542)).click(); await p.waitForTimeout(900); }],
  ['eksportpanel', async p => { await p.locator(T(64)).click({ timeout: 3000 }).catch(() => {}); await ferdig(p); }],
  ['gjennomsiktig bakgrunn + PNG 1080p', async p => { await p.locator(T(502)).check(); await ferdig(p); await lastNed(p, () => p.locator(T(531)).click()); }],
  ['JPG i 4K', async p => { if (!(await p.locator(T(531)).isVisible().catch(() => false))) { await p.locator(T(64)).click(); await ferdig(p); } await p.locator(T(494)).nth(1).click(); await p.locator(T(499)).nth(1).click(); await ferdig(p); await lastNed(p, () => p.locator(T(531)).click()); }],
  ['kopier bilde', async p => { if (!(await p.locator(T(529)).isVisible().catch(() => false))) { await p.locator(T(64)).click(); await ferdig(p); } await p.locator(T(529)).click(); await p.waitForTimeout(1500); }],
  ['lukk eksport', async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }],
  ['last inn på nytt (autolagring)', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500); }],
  ['tilbake til kategorier', async p => { const b = p.locator(T(22)); if (await b.isVisible().catch(() => false)) await b.click(); else await p.locator(T(27)).click().catch(() => {}); await p.waitForTimeout(800); }],
  ['rediger grunnoppsett', async p => { if (!(await p.locator(T(109)).isVisible().catch(() => false))) await p.locator(T(74)).first().click(); await p.locator(T(109)).click(); await p.waitForTimeout(1200); }],
  ['grunnoppsett: ny bakgrunnsfarge', async p => { await p.getByRole('button', { name: '#7b3fe4' }).first().click(); await p.waitForTimeout(600); }],
  ['lagre grunnoppsett', async p => { await p.locator(T(63)).click(); await p.waitForTimeout(1000); }],
  ['tilbake til kategorien', async p => { await p.locator(T(27)).click(); await p.waitForTimeout(900); }],
  ['ny mal fra grunnoppsettet', async p => { await p.locator(T(127)).click(); await p.waitForTimeout(600); await p.locator(T(464)).filter({ hasText: 'GRUNNOPPSETT' }).click(); await p.waitForTimeout(1800); }],
  ['til startsiden', async p => { for (let i = 0; i < 3; i++) { const b = p.getByRole('button', { name: /^← / }).first(); if (!(await b.isVisible().catch(() => false))) break; await b.click(); await p.waitForTimeout(700); } }],
  ['last ned sikkerhetskopi', async p => { await lastNed(p, () => p.locator(T(100)).click()); p.__backup = p.__sist; }],
  ['slett en mal', async p => { await p.locator(T(74)).first().click(); await p.waitForTimeout(600); await p.getByRole('button', { name: /Slett mal|Slett/ }).first().click().catch(() => {}); await p.waitForTimeout(800); await p.getByRole('button', { name: /^← / }).first().click().catch(() => {}); await p.waitForTimeout(700); }],
  ['gjenopprett fra sikkerhetskopien', async p => { p.__nextFile = p.__backup; await p.locator(T(101)).click(); await p.waitForTimeout(2500); }],
  ['last inn på nytt', async p => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500); }],
  ['åpne kategorien igjen', async p => { await p.locator(T(74)).first().click(); await p.waitForTimeout(800); }],
];

/* bare desktop: funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene */
test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobil', 'funksjonstestene kjøres på desktop'); });

test('Thumbnail Studio: AI-utklipp, eksport, grunnoppsett, sikkerhetskopi, autolagring', async ({ browser }, info) => {
  test.setTimeout(40 * 60_000);
  await flow(browser, 'thumb-funksjoner-' + info.project.name, '/_original/thumbnail-studio.dc.html', '/thumbnail-studio.dc.html', STEG,
    { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 800, explore: { n: 40, seed: 5 } });
});
