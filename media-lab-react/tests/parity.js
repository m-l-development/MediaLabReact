// Felles verktøy for flyttester: samme steg kjøres på originalen (/_original/…) og React-versjonen,
// og etter hvert steg sammenlignes synlig tekst, skjermbilde (piksler) og eventuelle nedlastinger.
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const IMG = path.resolve('../media-lab/images/sondag.jpeg');
/* bakgrunnsbølgene fra ml-bg.js tegnes etter tiden siden skriptet startet; bare dette lerretet maskeres */
export const ML_BG = 'body > div[aria-hidden="true"][data-keep-color] canvas';
export const IMG2 = path.resolve('../media-lab/images/tirsdag.png');

/* andel piksler som er synlig ulike, beregnet i nettleseren */
export async function pixelDiff(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
    const [x, y] = await Promise.all([load(a), load(b)]);
    if (x.width !== y.width || x.height !== y.height) return 1;
    let n = 0; for (let i = 0; i < x.data.length; i += 4) if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 30) n++;
    return n / (x.width * x.height);
  }, [a.toString('base64'), b.toString('base64')]);
}

export async function openSide(browser, url, { viewport = { width: 1440, height: 900 }, route, dialogs, init } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'Europe/Oslo', locale: 'nb-NO', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { localStorage.setItem('medialab.theme', 'dark'); localStorage.setItem('medialab.lang', 'no'); });
  if (init) await ctx.addInitScript(init);
  if (route) await ctx.route(route[0], route[1]());
  const page = await ctx.newPage(), errors = [], downloads = [];
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|\{\{.*\}\}/.test(m.text())) errors.push(m.text().split('\n')[0]); });
  page.on('dialog', d => (dialogs ? dialogs(d) : d.accept()));
  page.on('download', async d => { const p = await d.path().catch(() => null); downloads.push({ name: d.suggestedFilename(), sha: p ? crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex') : null }); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { ctx, page, errors, downloads };
}

/* Kjører stegene likt på begge og sammenligner. mask: selektor for elementer som tegnes etter klokken (f.eks. ml-bg-lerretet). */
export async function flow(browser, name, origUrl, reactUrl, steps, opts = {}) {
  const A = await openSide(browser, origUrl, opts), B = await openSide(browser, reactUrl, opts);
  const text = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  const shot = P => P.screenshot({ fullPage: !opts.viewportOnly, animations: 'disabled', caret: 'hide', mask: [P.locator(opts.mask || ML_BG)], maskColor: '#000' });
  const report = [];
  for (const [step, run] of steps) {
    const t = Date.now();
    await Promise.all([run(A.page), run(B.page)]).catch(e => { throw new Error(`steg «${step}» feilet: ${e.message.split('\n')[0]}`); });
    if (process.env.STEGLOGG) console.log(`  steg «${step}» ${Date.now() - t} ms`);
    await Promise.all([A.page.waitForTimeout(opts.settle ?? 700), B.page.waitForTimeout(opts.settle ?? 700)]);
    const [ta, tb] = await Promise.all([text(A.page), text(B.page)]);
    const [sa, sb] = await Promise.all([shot(A.page), shot(B.page)]);
    const d = await pixelDiff(A.page, sa, sb);
    if (d >= 0.002) { const dir = `test-results/${name}-diff`; fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(`${dir}/${step}-original.png`, sa); fs.writeFileSync(`${dir}/${step}-react.png`, sb); }
    report.push(`${step}: tekst ${ta === tb ? 'lik' : 'ULIK'}, piksler ${(d * 100).toFixed(3)} % ulike`);
    expect.soft(tb, `tekst etter «${step}»`).toBe(ta);
    expect.soft(d, `piksler etter «${step}»`).toBeLessThan(0.002);
  }
  console.log(`--- ${name}\n` + report.join('\n') + `\nnedlastinger: ${JSON.stringify(A.downloads)} / ${JSON.stringify(B.downloads)}`);
  expect.soft(B.downloads, 'nedlastede filer (navn + innhold)').toEqual(A.downloads);
  expect(B.errors, 'JS-feil').toEqual(A.errors);
  await A.ctx.close(); await B.ctx.close();
}
