// Tar skjermbilder av hver side (mørk + lys, NO) og samler konsollfeil.
// Grunnlinje: UPDATE=1 npx playwright test baseline  → tests/__baseline__/
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PAGES } from './pages.js';

const OUT = process.env.SHOT_DIR || 'tests/__baseline__';

for (const p of PAGES) {
  for (const theme of ['dark', 'light']) {
    test(`${p.id} (${theme})`, async ({ page }, info) => {
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(t => { try { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); } catch (e) {} }, theme);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await expect(page.locator('x-dc')).toHaveCount(0, { timeout: 1 }).catch(() => {});
      await page.waitForTimeout(1500);
      const dir = `${OUT}/${info.project.name}`;
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: `${dir}/${p.id}-${theme}.png`, fullPage: true, animations: 'disabled' });
      fs.writeFileSync(`${dir}/${p.id}-${theme}.errors.json`, JSON.stringify(errors.filter(e => !/api\/ml|Failed to load resource/.test(e)), null, 1));
    });
  }
}
