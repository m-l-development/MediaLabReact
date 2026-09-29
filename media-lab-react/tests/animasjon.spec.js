// Bakgrunnsanimasjonen på forsiden: samme bilde på samme tidspunkt i original og React (låst klokke).
import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'no-preference' });

async function frames(page, url, theme) {
  await page.addInitScript(t => { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); }, theme);
  await page.clock.install({ time: new Date('2026-09-29T12:00:00') });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.clock.runFor(100);
  const out = [];
  for (const ms of [0, 500, 1000, 2500, 5000, 10000]) {
    if (ms) await page.clock.runFor(ms - (out.length ? [0, 500, 1000, 2500, 5000, 10000][out.length - 1] : 0));
    out.push(await page.evaluate(() => document.querySelector('canvas').toDataURL()));
  }
  return out;
}
for (const theme of ['dark', 'light']) {
  test(`animasjon lik over tid (${theme})`, async ({ browser }) => {
    const a = await browser.newPage(), b = await browser.newPage();
    const [fa, fb] = await Promise.all([frames(a, '/_original/media-lab.dc.html', theme), frames(b, '/media-lab.dc.html', theme)]);
    expect(new Set(fa).size).toBeGreaterThan(3); // animasjonen beveger seg
    fa.forEach((f, i) => expect(fb[i] === f, `bilde ${i}`).toBe(true));
  });
}
test('hover-overgang lik', async ({ browser }) => {
  const res = [];
  for (const url of ['/_original/media-lab.dc.html', '/media-lab.dc.html']) {
    const p = await browser.newPage(); await p.goto(url, { waitUntil: 'networkidle' });
    const c = p.locator('a').filter({ hasText: 'Loop Studio' });
    const st = () => c.evaluate(e => { const s = getComputedStyle(e); return [s.borderColor, s.backgroundColor, s.transition, s.backdropFilter].join('|'); });
    const before = await st(); await c.hover(); await p.waitForTimeout(400); res.push([before, await st()]);
  }
  expect(res[1]).toEqual(res[0]);
});
