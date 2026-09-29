// Samme oppsett som media-lab/tests/baseline.spec.js, men mot React-versjonen.
import { test, expect } from '@playwright/test';

/* Migrerte sider: id i grunnlinjen → URL i React-appen */
const PAGES = [
  { id: 'forside', url: '/' },
  { id: 'forside-some', url: '/#some' },
  { id: 'forside-tools', url: '/#tools' },
];

for (const p of PAGES) {
  for (const theme of ['dark', 'light']) {
    test(`${p.id} (${theme})`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(t => { try { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} }, theme);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      expect(await page.screenshot({ fullPage: true, animations: 'disabled' })).toMatchSnapshot(`${p.id}-${theme}.png`);
      expect(errors.filter(e => !/api\/ml|Failed to load resource/.test(e))).toEqual([]);
    });
  }
}
