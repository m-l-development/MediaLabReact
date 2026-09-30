// Admin: hele flyten mot et falskt API (samme kontrakt som api/ml.js), kjørt likt på originalen og React-versjonen.
// Etter hvert steg sammenlignes synlig tekst og skjermbilde (piksler) mellom de to.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mockApi } from './admin-mock.js';

const IMG = path.resolve('public/images/sondag.jpeg');


/* piksel-sammenligning i nettleseren: andel piksler som er synlig ulike */
async function pixelDiff(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
    const [x, y] = await Promise.all([load(a), load(b)]);
    if (x.width !== y.width || x.height !== y.height) return 1;
    let n = 0; for (let i = 0; i < x.data.length; i += 4) if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 30) n++;
    return n / (x.width * x.height);
  }, [a.toString('base64'), b.toString('base64')]);
}

async function setup(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Europe/Oslo', locale: 'nb-NO' });
  await ctx.addInitScript(() => { localStorage.setItem('medialab.theme', 'dark'); localStorage.setItem('medialab.lang', 'no'); });
  await ctx.route('**/api/ml?**', mockApi());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => {
    const m = d.message();
    if (/Nytt passord for/.test(m)) return d.accept('nyttpassord123');
    if (/Nytt navn/.test(m)) return d.accept('Filadelfia Oslo');
    if (/Skriv navnet/.test(m)) return d.accept(m.split('\n').pop());
    return d.accept();
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  return { page, errors, ctx };
}

const inputs = p => p.locator('input:not([type=file])');
const btn = (p, name) => p.getByRole('button', { name, exact: true });
const STEPS = [
  ['oppsett-skjerm', async p => {}],
  ['opprett utviklerkonto', async p => { await inputs(p).nth(0).fill('kristen'); await inputs(p).nth(1).fill('hemmelig12345'); await inputs(p).nth(2).fill('hemmelig12345'); await btn(p, 'Opprett konto').click(); await p.waitForTimeout(400); }],
  ['last opp fil', async p => { await p.locator('input[type=file]').setInputFiles(IMG); await p.waitForTimeout(600); }],
  ['skjul innebygd bilde', async p => { const b = btn(p, 'Skjul').first(); if (await b.count()) await b.click(); await p.waitForTimeout(300); }],
  ['mappe Logoer', async p => { await btn(p, 'Logoer').click(); await p.waitForTimeout(300); }],
  ['mappe Mockups + slett fil', async p => { await btn(p, 'Mockups').click(); await p.waitForTimeout(300); await p.getByRole('button', { name: 'Slett fil' }).first().click(); await p.waitForTimeout(400); }],
  ['fane Brukere', async p => { await btn(p, 'Brukere').click(); await p.waitForTimeout(400); }],
  ['legg til bruker', async p => { const f = p.locator('form').filter({ has: btn(p, 'Legg til bruker') }); await f.locator('input').nth(0).fill('ola'); await f.locator('input').nth(1).fill('passord12345'); await btn(p, 'Legg til bruker').click(); await p.waitForTimeout(400); }],
  ['endre rolle', async p => { await p.locator('select').filter({ hasText: 'Utvikler' }).last().selectOption('admin'); await p.waitForTimeout(400); }],
  ['nytt passord', async p => { await btn(p, 'Nytt passord').first().click(); await p.waitForTimeout(400); }],
  ['fane Menigheter', async p => { await btn(p, 'Menigheter').click(); await p.waitForTimeout(400); }],
  ['legg til menighet', async p => { const f = p.locator('form').filter({ has: btn(p, 'Legg til menighet') }); await f.locator('input').fill('Betania'); await btn(p, 'Legg til menighet').click(); await p.waitForTimeout(400); }],
  ['gi nytt navn', async p => { await btn(p, 'Gi nytt navn').first().click(); await p.waitForTimeout(400); }],
  ['slett menighet', async p => { await btn(p, 'Slett').last().click(); await p.waitForTimeout(400); }],
  ['menighet → filer', async p => { await btn(p, 'Filer').last().click(); await p.waitForTimeout(500); }],
  ['fane Brukere → slett bruker', async p => { await btn(p, 'Brukere').click(); await p.waitForTimeout(400); await btn(p, 'Slett').last().click(); await p.waitForTimeout(400); }],
  ['fane Logg', async p => { await btn(p, 'Logg').click(); await p.waitForTimeout(400); }],
  ['loggfilter', async p => { await btn(p, 'Handlinger').click(); await p.waitForTimeout(300); await btn(p, 'Alle').click(); await p.waitForTimeout(300); }],
  ['tøm loggen', async p => { await btn(p, 'Tøm loggen').click(); await p.waitForTimeout(400); }],
  ['fane System', async p => { await btn(p, 'System').click(); await p.waitForTimeout(400); }],
  ['min konto: feil passord', async p => { await btn(p, 'Min konto').click(); await p.waitForTimeout(200); const f = p.locator('form'); await f.locator('input').nth(0).fill('feil'); await f.locator('input').nth(1).fill('nyttpassord999'); await btn(p, 'Lagre nytt passord').click(); await p.waitForTimeout(400); }],
  ['min konto: riktig passord', async p => { const f = p.locator('form'); await f.locator('input').nth(0).fill('hemmelig12345'); await f.locator('input').nth(1).fill('nyttpassord999'); await btn(p, 'Lagre nytt passord').click(); await p.waitForTimeout(400); }],
  ['logg ut', async p => { await btn(p, 'Logg ut').click(); await p.waitForTimeout(400); }],
  ['feil innlogging', async p => { await inputs(p).nth(0).fill('kristen'); await inputs(p).nth(1).fill('galt'); await btn(p, 'Logg inn').click(); await p.waitForTimeout(400); }],
  ['riktig innlogging', async p => { await inputs(p).nth(1).fill('nyttpassord999'); await btn(p, 'Logg inn').click(); await p.waitForTimeout(500); }],
  ['engelsk', async p => { await p.evaluate(() => window.MLI18N.set('en')); await p.waitForTimeout(400); }],
  ['lys modus', async p => { await p.evaluate(() => window.MLTheme.set('light')); await p.waitForTimeout(900); }],
];

test('admin: original og React oppfører seg likt gjennom hele flyten', async ({ browser }) => {
  test.setTimeout(240_000);
  const A = await setup(browser, '/_original/admin.dc.html'), B = await setup(browser, '/admin.dc.html');
  const text = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  const report = [];
  for (const [name, run] of STEPS) {
    await Promise.all([run(A.page), run(B.page)]);
    await Promise.all([A.page.waitForTimeout(3200), B.page.waitForTimeout(3200)]); // toast forsvinner etter 3 s
    const [ta, tb] = await Promise.all([text(A.page), text(B.page)]);
    // bakgrunnsbølgene fra ml-bg.js tegnes etter tid siden skriptet startet, så de maskeres
    const shot = P => P.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide', mask: [P.locator('canvas')], maskColor: '#000' });
    const [sa, sb] = await Promise.all([shot(A.page), shot(B.page)]);
    const d = await pixelDiff(A.page, sa, sb);
    if (d >= 0.002) { const fs = await import('node:fs'); fs.mkdirSync('test-results/admin-diff', { recursive: true }); fs.writeFileSync(`test-results/admin-diff/${name}-original.png`, sa); fs.writeFileSync(`test-results/admin-diff/${name}-react.png`, sb); }
    report.push(`${name}: tekst ${ta === tb ? 'lik' : 'ULIK'}, piksler ${(d * 100).toFixed(3)} % ulike`);
    expect.soft(tb, `tekst etter «${name}»`).toBe(ta);
    expect.soft(d, `piksler etter «${name}»`).toBeLessThan(0.002);
  }
  console.log(report.join('\n'));
  expect(B.errors).toEqual(A.errors);
  await A.ctx.close(); await B.ctx.close();
});
