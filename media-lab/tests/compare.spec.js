// Skjermbilder av React-sidene mot originalene, med samme oppsett som media-lab/tests/baseline.spec.js.
// Alle sider i grunnlinjen som finnes som React-side i denne mappen (samme filnavn), blir sammenlignet.
// - Sider uten ml-bg: mot grunnlinjebildene i tests/__baseline__/.
// - Sider med ml-bg: bølgene tegnes etter tiden siden ml-bg.js startet (originalen starter det senere, avhengig av
//   når React er lastet fra CDN), så de sammenlignes mot originalen i samme kjøring, med bølgelerretet maskert i begge.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PAGES as ALL } from './pages.js';
import { ML_BG, pixelDiff, CLOCK } from './parity.js';

/* editoren spiller video i forhåndsvisningen: styrt klokke, så bildet står likt i begge */
const VIDEO = new Set(['studio-editor', 'loop-editor']);

const exists = f => fs.existsSync(f);
/* loop-editor.dc.html er bare en omdirigering til studio-editor.dc.html og sammenlignes når den er migrert */
const MIGRATED = ALL.filter(p => exists(p.url.slice(1).replace(/#.*$/, '')) && (p.id !== 'loop-editor' || exists('studio-editor.dc.html')));

async function open(page, url, theme, errors, clock) {
  if (clock) { await page.addInitScript(CLOCK); await page.addInitScript(t => { Date.now = () => t; }, Date.parse('2026-09-29T12:00:00Z')); }
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(t => { try { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  /* klokken går 2 s; etter at bilder og skrifter er lastet tegnes ett bilde til (lerretet tegnes bare på klokketikk) */
  if (clock) { await page.evaluate(() => window.__step(2000)); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500); await page.evaluate(() => window.__step(16)); await page.waitForTimeout(300); }
}

for (const p of MIGRATED) {
  for (const theme of ['dark', 'light']) {
    test(`${p.id} (${theme})`, async ({ page, browser }, info) => {
      const errors = [];
      await open(page, p.url, theme, errors, VIDEO.has(p.id));
      if (await page.locator(ML_BG).count()) {
        const ctx = await browser.newContext({ viewport: page.viewportSize(), reducedMotion: 'reduce', locale: 'nb-NO', ...(info.project.use.isMobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
        const orig = await ctx.newPage();
        await open(orig, '/_original' + p.url, theme, [], VIDEO.has(p.id));
        const shot = P => P.screenshot({ fullPage: true, animations: 'disabled', mask: [P.locator(ML_BG)], maskColor: '#000' });
        let a, b, d;
        /* editoren: tidtakere og bildelasting følger sanntid og kan komme i ulik rekkefølge når maskinen er
           presset; gå videre på klokken og ta nye bilder (inntil fire ganger) – like sider ender likt */
        for (let tries = 0; ; tries++) {
          [a, b] = await Promise.all([shot(orig), shot(page)]);
          d = await pixelDiff(page, a, b);
          if (d < 0.002 || !VIDEO.has(p.id) || tries >= 4) break;
          await Promise.all([orig, page].map(P => P.evaluate(() => window.__step(1000))));
          await Promise.all([orig.waitForTimeout(800), page.waitForTimeout(800)]);
        }
        if (d >= 0.002) { fs.mkdirSync('test-results/compare-diff', { recursive: true }); fs.writeFileSync(`test-results/compare-diff/${p.id}-${theme}-${info.project.name}-original.png`, a); fs.writeFileSync(`test-results/compare-diff/${p.id}-${theme}-${info.project.name}-react.png`, b); }
        expect(d, 'andel ulike piksler mot originalen').toBeLessThan(0.002);
        await ctx.close();
      } else {
        expect(await page.screenshot({ fullPage: true, animations: 'disabled' })).toMatchSnapshot(`${p.id}-${theme}.png`);
      }
      const base = JSON.parse(fs.readFileSync(`tests/__baseline__/${info.project.name}/${p.id}-${theme}.errors.json`, 'utf8'));
      // feil fra dc-runtime (nettleseren leser den rå malen med {{ … }} før den skjules) finnes ikke i React og tas ut av grunnlinjen
      expect(errors.filter(e => !/api\/ml|Failed to load resource/.test(e))).toEqual(base.filter(e => !/\{\{.*\}\}/.test(e)));
    });
  }
}
