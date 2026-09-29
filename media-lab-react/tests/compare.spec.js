// Skjermbilder av React-sidene mot grunnlinjen (de originale .dc.html-sidene), med samme oppsett som media-lab/tests/baseline.spec.js.
// Alle sider i grunnlinjen som finnes som React-side i denne mappen (samme filnavn), blir sammenlignet.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PAGES as ALL } from '../../media-lab/tests/pages.js';

const MIGRATED = ALL.filter(p => fs.existsSync(p.url.slice(1).replace(/#.*$/, '')));

for (const p of MIGRATED) {
  for (const theme of ['dark', 'light']) {
    test(`${p.id} (${theme})`, async ({ page }, info) => {
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(t => { try { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} }, theme);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      expect(await page.screenshot({ fullPage: true, animations: 'disabled' })).toMatchSnapshot(`${p.id}-${theme}.png`);
      const base = JSON.parse(fs.readFileSync(`../media-lab/tests/__baseline__/${info.project.name}/${p.id}-${theme}.errors.json`, 'utf8'));
      expect(errors.filter(e => !/api\/ml|Failed to load resource/.test(e))).toEqual(base);
    });
  }
}
