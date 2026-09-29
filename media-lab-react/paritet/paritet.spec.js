// Klikker gjennom alle synlige knapper (nivå 1, og nivå 2 etter knapper som bytter visning) på hver side,
// på begge versjoner, og sammenligner synlig tekst, URL, JS-feil og manglende filer.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { PAGES } from '../../media-lab/tests/pages.js';

const IMG = path.resolve('../media-lab/images/sondag.jpeg');
const ORIGINS = { foer: 'http://127.0.0.1:4181', naa: 'http://127.0.0.1:4182' };
const MAX1 = 30, MAX2 = 20, NAV2 = 6;

/* Hvert steg får en helt ny nettleserkontekst (tom localStorage/IndexedDB), så steg ikke påvirker hverandre */
async function fresh(browser, origin, url) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { localStorage.setItem('medialab.theme', 'dark'); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} });
  const page = await ctx.newPage(); const log = { errors: [], missing: [] }; wire(page, log);
  await page.goto(origin + url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(700);
  return { ctx, page, log };
}
function wire(page, log) {
  page.on('pageerror', e => log.errors.push(String(e).split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|api\/ml/.test(m.text())) log.errors.push(m.text().split('\n')[0]); });
  page.on('response', r => { const u = new URL(r.url()); if (r.status() === 404 && u.port && !/%7B%7B|^\/api\//.test(u.pathname)) log.missing.push(u.pathname); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('filechooser', fc => fc.setFiles(IMG).catch(() => {}));
}
const buttons = page => page.locator('button:visible, [role="button"]:visible, [role="tab"]:visible');
async function snap(page) {
  return page.evaluate(() => ({
    url: location.pathname + location.hash,
    text: (document.body.innerText || '').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 4000),
  })).catch(() => ({ url: '?', text: '?' }));
}
async function clickNth(page, i) {
  const b = buttons(page).nth(i);
  const label = ((await b.getAttribute('aria-label').catch(() => null)) || (await b.innerText().catch(() => '')) || (await b.getAttribute('title').catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (await b.isDisabled().catch(() => true)) return { label, skipped: 'disabled' };
  await b.click({ timeout: 2500 }).catch(e => { label && 0; });
  await page.waitForTimeout(450);
  return { label };
}

async function crawl(browser, origin, url) {
  const out = [];
  let F = await fresh(browser, origin, url);
  const start = await snap(F.page); out.push({ step: 'last inn', ...start, errors: F.log.errors, missing: F.log.missing });
  const n1 = Math.min(MAX1, await buttons(F.page).count()); await F.ctx.close();
  const nav = [];
  for (let i = 0; i < n1; i++) {
    F = await fresh(browser, origin, url); F.log.errors.length = 0; F.log.missing.length = 0;
    const c = await clickNth(F.page, i); const s = await snap(F.page);
    out.push({ step: `#${i} «${c.label}»`, ...s, skipped: c.skipped, errors: F.log.errors, missing: F.log.missing });
    if (!c.skipped && s.url.split('#')[0] === start.url.split('#')[0] && s.text !== start.text && nav.length < NAV2) nav.push(i);
    await F.ctx.close();
  }
  for (const i of nav) {
    F = await fresh(browser, origin, url); await clickNth(F.page, i);
    const n2 = Math.min(MAX2, await buttons(F.page).count()); await F.ctx.close();
    for (let j = 0; j < n2; j++) {
      F = await fresh(browser, origin, url); await clickNth(F.page, i); F.log.errors.length = 0; F.log.missing.length = 0;
      const c = await clickNth(F.page, j); const s = await snap(F.page);
      out.push({ step: `#${i} → #${j} «${c.label}»`, ...s, skipped: c.skipped, errors: F.log.errors, missing: F.log.missing });
      await F.ctx.close();
    }
  }
  return out;
}

for (const p of PAGES.filter(p => !p.url.includes('#'))) {
  test(p.id, async ({ browser }) => {
    const [a, b] = await Promise.all([crawl(browser, ORIGINS.foer, p.url), crawl(browser, ORIGINS.naa, p.url)]);
    const diffs = [];
    for (let k = 0; k < Math.max(a.length, b.length); k++) {
      const x = a[k] || {}, y = b[k] || {};
      if (x.step !== y.step) { diffs.push(`steg ${k}: ${x.step} ≠ ${y.step}`); continue; }
      if (x.url !== y.url) diffs.push(`${x.step}: URL ${x.url} ≠ ${y.url}`);
      if (x.text !== y.text) diffs.push(`${x.step}: tekst ulik`);
      if (JSON.stringify(x.errors) !== JSON.stringify(y.errors)) diffs.push(`${x.step}: feil før ${JSON.stringify(x.errors)} nå ${JSON.stringify(y.errors)}`);
      if (JSON.stringify(x.missing) !== JSON.stringify(y.missing)) diffs.push(`${x.step}: manglende filer før ${JSON.stringify(x.missing)} nå ${JSON.stringify(y.missing)}`);
    }
    const errs = b.filter(s => s.errors.length).map(s => `${s.step}: ${s.errors.join(' | ')}`);
    const miss = b.filter(s => s.missing.length).map(s => `${s.step}: ${s.missing.join(', ')}`);
    console.log(`\n=== ${p.id}: ${b.length} steg testet, ${diffs.length} forskjeller før/nå, ${errs.length} steg med JS-feil (nå), ${miss.length} med manglende filer (nå)`);
    diffs.slice(0, 15).forEach(d => console.log('  DIFF ' + d));
    errs.slice(0, 6).forEach(d => console.log('  FEIL ' + d.slice(0, 220)));
    miss.slice(0, 6).forEach(d => console.log('  404  ' + d.slice(0, 220)));
    expect(diffs).toEqual([]);
  });
}
