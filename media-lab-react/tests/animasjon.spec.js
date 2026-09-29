// Bakgrunnsanimasjonen på forsiden: samme bilde på samme tidspunkt i original og React.
// Tiden styres helt av testen (performance.now og requestAnimationFrame byttes ut), så begge får nøyaktig samme tidslinje.
import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'no-preference' });

const CLOCK = () => {
  let T = 1000; const q = [];
  performance.now = () => T;
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = ms => { const end = T + ms; while (T < end) { T = Math.min(end, T + 16); q.splice(0).forEach(f => f(T)); } };
};
const TIMES = [0, 500, 1000, 2500, 5000, 10000];

async function frames(page, url, theme) {
  await page.addInitScript(t => { localStorage.setItem('medialab.theme', t); localStorage.setItem('medialab.lang', 'no'); }, theme);
  await page.addInitScript(CLOCK);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('canvas'));
  await page.waitForTimeout(300);
  const out = []; let prev = 0;
  for (const ms of TIMES) {
    await page.evaluate(d => window.__step(d), ms - prev); prev = ms;
    out.push(await page.evaluate(() => document.querySelector('canvas').toDataURL()));
  }
  return out;
}
for (const theme of ['dark', 'light']) {
  test(`animasjon lik over tid (${theme})`, async ({ browser }) => {
    const a = await browser.newPage(), b = await browser.newPage();
    const [fa, fb] = await Promise.all([frames(a, '/_original/media-lab.dc.html', theme), frames(b, '/media-lab.dc.html', theme)]);
    console.log(theme, fa.map((f, i) => (f === fb[i] ? 'lik' : 'ULIK')).join(', '));
    expect(new Set(fa).size, 'animasjonen beveger seg').toBeGreaterThan(3);
    fa.forEach((f, i) => expect(fb[i] === f, `bilde ved ${TIMES[i]} ms`).toBe(true));
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
