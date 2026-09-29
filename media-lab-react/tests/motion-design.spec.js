// Motion Design: utforskning i takt – samme tilfeldige handlinger (fast frø) i originalen og React.
// Etter hvert steg sammenlignes tekst, feltverdier, lenker, localStorage, skjermbilde og nedlastinger.
// Antall handlinger: UTFORSK=n (standard 120). Filvelgere får et testbilde.
import { test } from '@playwright/test';
import { flow } from './parity.js';

const N = Number(process.env.UTFORSK || 120);
for (const seed of [37, 259]) {
  test(`motion-design: utforskning i takt (frø ${seed})`, async ({ browser }, info) => {
    test.setTimeout(60 * 60_000);
    await flow(browser, `motion-design-${info.project.name}-${seed}`, '/_original/motion-design.dc.html', '/motion-design.dc.html', [['start', async p => {}]],
      { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 600, clock: 400, explore: { n: N, seed } });
  });
}
