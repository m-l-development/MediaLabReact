// Skjermbilder av React-sidene mot originalene, med samme oppsett som media-lab/tests/baseline.spec.js.
// Alle sider i grunnlinjen som finnes som React-side i denne mappen (samme filnavn), blir sammenlignet.
// - Sider uten ml-bg: mot grunnlinjebildene i media-lab/tests/__baseline__/.
// - Sider med ml-bg: bølgene tegnes etter tiden siden ml-bg.js startet (originalen starter det senere, avhengig av
//   når React er lastet fra CDN), så de sammenlignes mot originalen i samme kjøring, med bølgelerretet maskert i begge.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PAGES as ALL } from '../../media-lab/tests/pages.js';
import { ML_BG, pixelDiff } from './parity.js';

const exists = f => fs.existsSync(f);
/* loop-editor.dc.html er bare en omdirigering til studio-editor.dc.html og sammenlignes når den er migrert */
const MIGRATED = ALL.filter(p => exists(p.url.slice(1).replace(/#.*$/, '')) && (p.id !== 'loop-editor' || exists('studio-editor.dc.html')));

async function open(page, url, theme, errors) {
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(t => { try { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

for (const p of MIGRATED) {
  for (const theme of ['dark', 'light']) {
    test(`${p.id} (${theme})`, async ({ page, browser }, info) => {
      const errors = [];
      await open(page, p.url, theme, errors);
      if (await page.locator(ML_BG).count()) {
        const ctx = await browser.newContext({ viewport: page.viewportSize(), reducedMotion: 'reduce', locale: 'nb-NO', ...(info.project.use.isMobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
        const orig = await ctx.newPage();
        await open(orig, '/_original' + p.url, theme, []);
        const shot = P => P.screenshot({ fullPage: true, animations: 'disabled', mask: [P.locator(ML_BG)], maskColor: '#000' });
        const [a, b] = await Promise.all([shot(orig), shot(page)]);
        const d = await pixelDiff(page, a, b);
        if (d >= 0.002) { fs.mkdirSync('test-results/compare-diff', { recursive: true }); fs.writeFileSync(`test-results/compare-diff/${p.id}-${theme}-${info.project.name}-original.png`, a); fs.writeFileSync(`test-results/compare-diff/${p.id}-${theme}-${info.project.name}-react.png`, b); }
        expect(d, 'andel ulike piksler mot originalen').toBeLessThan(0.002);
        await ctx.close();
      } else {
        expect(await page.screenshot({ fullPage: true, animations: 'disabled' })).toMatchSnapshot(`${p.id}-${theme}.png`);
      }
      const base = JSON.parse(fs.readFileSync(`../media-lab/tests/__baseline__/${info.project.name}/${p.id}-${theme}.errors.json`, 'utf8'));
      // feil fra dc-runtime (nettleseren leser den rå malen med {{ … }} før den skjules) finnes ikke i React og tas ut av grunnlinjen
      expect(errors.filter(e => !/api\/ml|Failed to load resource/.test(e))).toEqual(base.filter(e => !/\{\{.*\}\}/.test(e)));
    });
  }
}
