// Felles funksjoner, original mot React: språk og lys/mørk på tvers av alle sider, og PWA-installasjon.
import { test, expect } from '@playwright/test';
import { flow } from './parity.js';

const SIDER = ['loop-studio', 'studio-editor', 'isolate-subject', 'thumbnail-studio', 'motion-design', 'photo-design', 'mockups', 'admin', 'media-lab'];
const til = side => async p => { await p.goto(new URL(side + '.dc.html', p.url()).href, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); };
const tilstand = p => p.evaluate(() => [document.documentElement.lang, localStorage.getItem('medialab.lang'), localStorage.getItem('medialab.theme'), document.documentElement.getAttribute('data-ml-mode') || (document.querySelector('[data-ml-theme]') || {}).getAttribute?.('data-ml-theme')].join('|'));

test('språk og lys/mørk huskes på tvers av alle sider', async ({ browser }, info) => {
  test.setTimeout(20 * 60_000);
  const steg = [
    ['engelsk på forsiden', async p => { await p.getByRole('button', { name: 'EN', exact: true }).click(); }],
    ['lys modus på forsiden', async p => { await p.getByRole('button', { name: 'Switch to light mode' }).click(); }],
    ...SIDER.map(s => [`åpne ${s}`, async p => { await til(s)(p); expect(await tilstand(p)).toMatch(/^en\|en\|light\|light$/); }]),
    ['norsk på forsiden', async p => { await p.getByRole('button', { name: 'NO', exact: true }).click(); }],
    ['mørk modus på forsiden', async p => { await p.getByRole('button', { name: 'Bytt til mørk modus' }).click(); }],
    ...SIDER.slice(0, 4).map(s => [`åpne ${s} igjen`, async p => { await til(s)(p); expect(await tilstand(p)).toMatch(/^no\|no\|dark\|dark$/); }]),
  ];
  await flow(browser, 'felles-sprak-' + info.project.name, '/_original/media-lab.dc.html', '/media-lab.dc.html', steg, { viewport: info.project.use.viewport, cdn: true, settle: 900, clock: 400, fixedNow: Date.parse('2026-09-29T12:00:00Z') });
});

/* knappene i installasjonsvinduet fra ml-pwa.js (0 = installer, 1 = ikke nå) */
const pwaKnapp = (p, i) => p.locator('strong', { hasText: /Media Lab som web-app|Media Lab as a web app/ }).locator('xpath=..').locator('button').nth(i);

/* Chrome sender «beforeinstallprompt» når siden kan installeres; her sendes en simulert hendelse */
const INSTALL = () => {
  window.__prompt = 0;
  window.__sendInstall = () => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompt++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); };
};
for (const side of ['media-lab', 'photo-design', 'motion-design']) {
  test(`PWA-installasjon: ${side}`, async ({ browser }, info) => {
    test.setTimeout(5 * 60_000);
    const steg = [
      ['installasjon tilbys', async p => { await p.evaluate(() => window.__sendInstall()); await p.waitForTimeout(3200); }],
      ['installer', async p => { await pwaKnapp(p, 0).click(); await p.waitForTimeout(600); expect(await p.evaluate(() => window.__prompt)).toBe(1); }],
      ['tilbys igjen → «Ikke nå»', async p => { await p.evaluate(() => window.__sendInstall()); await p.waitForTimeout(3200); await pwaKnapp(p, 1).click(); await p.waitForTimeout(600); }],
      ['ikke vist igjen (14 dager)', async p => { await p.evaluate(() => window.__sendInstall()); await p.waitForTimeout(3200); expect(await p.evaluate(() => localStorage.getItem('medialab.pwa.later'))).toBeTruthy(); }],
    ];
    await flow(browser, `pwa-${side}-${info.project.name}`, `/_original/${side}.dc.html`, `/${side}.dc.html`, steg, { viewport: info.project.use.viewport, init: INSTALL, fixedNow: Date.parse('2026-09-29T12:00:00Z'), settle: 700 });
  });
}
