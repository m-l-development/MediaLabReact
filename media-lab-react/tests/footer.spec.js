// Footer-oppførsel (ml-footer.js) ved oppstart og rulling skal være lik originalen på alle migrerte sider.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const SIDER = ['media-lab', 'admin', 'mockups', 'loop-studio'].filter(s => fs.existsSync(s + '.dc.html'));
for (const side of SIDER) {
  test(`footer ved rulling: ${side}`, async ({ browser }) => {
    const res = [];
    for (const url of [`/_original/${side}.dc.html`, `/${side}.dc.html`]) {
      const p = await browser.newPage({ viewport: { width: 1440, height: 700 } });
      await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
      const st = () => p.evaluate(() => [...document.querySelectorAll('footer')].map(f => { const s = f.querySelector('span') || f, c = getComputedStyle(s); return [c.opacity, c.letterSpacing, c.transform, s.style.transition].join('|'); }).join(' / '));
      const out = [await st()];
      await p.mouse.wheel(0, 3000); await p.waitForTimeout(1200); out.push(await st());
      await p.mouse.wheel(0, -3000); await p.waitForTimeout(1200); out.push(await st());
      await p.mouse.wheel(0, 3000); await p.waitForTimeout(150); out.push(await st());
      res.push(out); await p.close();
    }
    expect(res[1]).toEqual(res[0]);
  });
}
