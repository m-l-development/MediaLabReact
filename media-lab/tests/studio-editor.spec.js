// Ukeprogram Loop (studio-editor.dc.html): malene fra Loop Studio, deretter utforskning i takt.
// Klokken styres (clock: ms per steg), så videoforhåndsvisningen står likt i begge versjonene.
// Eksporterte filer (bl.a. spiller-HTML bygd med Function.toString) sammenlignes byte for byte.
import { test } from '@playwright/test';
import { flow } from './parity.js';

const N = Number(process.env.UTFORSK || 150);
const MALER = [['week', 'week'], ['sunday', 'sunday'], ['youth', 'youth'], ['blank', 'blank']];
for (const [mal, id] of MALER) {
  test(`studio-editor ?mal=${mal}: utforskning i takt`, async ({ browser }, info) => {
    test.setTimeout(60 * 60_000);
    const q = `?mal=${mal}&id=${id}`;
    await flow(browser, `studio-editor-${mal}-${info.project.name}`, '/_original/studio-editor.dc.html' + q, '/studio-editor.dc.html' + q, [['start', async p => {}]],
      { viewport: info.project.use.viewport, cdn: true, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 500, clock: 400, explore: { n: mal === 'week' ? N : Math.round(N / 3), seed: 101 + mal.length } });
  });
}
