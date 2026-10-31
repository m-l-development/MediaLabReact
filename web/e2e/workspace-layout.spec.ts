import { expect, test, type Page } from '@playwright/test'

/** Editorene fyller vinduet under topplinjen (som Loop Studio): ingen siderulling, arbeidsflaten bruker høyden. */

const open: [string, (page: Page) => Promise<void>][] = [
  ['Photo Design', async (page) => { await page.goto('/app/photo-design'); await page.locator('[data-tpl="photo"]').click(); await page.locator('[data-pd-view="edit"]').waitFor() }],
  ['Motion Design', async (page) => { await page.goto('/app/motion-design'); await page.getByRole('button', { name: 'Nytt prosjekt' }).click(); await page.locator('[data-format="wide"]').click(); await page.locator('[data-tpl="blank"]').click(); await page.locator('[data-md-canvas]').waitFor() }],
  ['Thumbnail Studio', async (page) => { await page.goto('/app/thumbnail-studio'); await page.getByRole('button', { name: /Søndagsmøte/ }).click(); await page.getByRole('button', { name: /Ny mal/ }).click(); await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click(); await page.locator('[data-ts-view="edit"]').waitFor() }],
  ['Mockups', async (page) => { await page.goto('/app/mockups?mockup=tv-wall'); await page.locator('[data-ml-workspace] canvas').first().waitFor({ timeout: 30_000 }) }],
  ['Loop Studio', async (page) => { await page.goto('/app/loop-studio'); await page.getByRole('link', { name: /Ukeprogram/ }).click(); await page.locator('[data-loop-canvas]').waitFor() }],
]

for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720]] as const) {
  test(`arbeidsflaten fyller ${w}×${h} uten siderulling`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC og bærbar; mobil har egne tester per verktøy')
    test.slow()
    await page.setViewportSize({ width: w, height: h })
    for (const [k, go] of open) {
      await go(page)
      // oppsettet (fonter, målinger) må ha satt seg før vi måler
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight), { message: `${k}: ingen loddrett siderulling` }).toBeLessThanOrEqual(h)
      const r = await page.evaluate(() => {
        const ws = document.querySelector('[data-ml-workspace]')?.getBoundingClientRect()
        const box = (q: string) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right } }
        return { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ws: ws ? { bottom: ws.bottom, h: ws.height } : null, credit: box('main > footer'), dock: box('[class*="_dock_"]'), back: box('a[class*="backPill"]') }
      })
      expect(r.sh, `${k}: ingen loddrett siderulling`).toBeLessThanOrEqual(h)
      expect(r.sw, `${k}: ingen vannrett siderulling`).toBeLessThanOrEqual(w)
      if (k === 'Loop Studio') continue
      expect(r.ws, `${k}: arbeidsflaten er merket`).not.toBeNull()
      expect(r.ws!.h, `${k}: bruker høyden (mellom topplinjen og bunnlinjen)`).toBeGreaterThan(h - 120)
      // bunnlinjen er der: kreditten under editoren, knappene i bunnlinjen og «← Media Lab» over editoren – ingen overlapp
      expect(r.credit, `${k}: «Design by …» vises`).not.toBeNull()
      expect(r.credit!.top, `${k}: kreditten ligger under editoren`).toBeGreaterThanOrEqual(r.ws!.bottom - 1)
      expect(r.credit!.bottom, `${k}: kreditten er innenfor vinduet`).toBeLessThanOrEqual(h + 1)
      expect(r.dock && r.dock.top >= r.ws!.bottom - 1, `${k}: knappene til høyre ligger i bunnlinjen`).toBe(true)
      expect(r.back && r.back.bottom <= r.ws!.bottom && r.back.bottom <= 60, `${k}: «← Media Lab» står i topplinjen`).toBe(true)
      if (k === 'Motion Design') {
        const tl = await page.locator('[class*="tlWrap"]').boundingBox()
        const cv = await page.locator('[data-md-canvas]').boundingBox()
        expect(tl && tl.y + tl.height <= h, 'tidslinjen er synlig nederst').toBe(true)
        expect(cv && cv.height >= 180, 'forhåndsvisningen har plass').toBe(true)
      }
    }
  })
}
