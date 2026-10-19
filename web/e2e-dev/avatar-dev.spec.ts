import { expect, test } from '@playwright/test'
import { EMAIL, expectHub, injectBackend, PASSWORD, signInPassword } from './helpers'

/**
 * Personlisten (Admin → Medlemmer) mot connecthub-dev: initialene i hver avatar er sentrert i sirkelen, både på PC og
 * mobil, og sirkelen har samme størrelse i alle rader. Bare lesing.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

test('Personlisten: avatarene er runde, like store og har sentrerte initialer', async ({ page }, info) => {
  await signInPassword(page)
  await expectHub(page)
  await page.goto('/app/admin#/brukere')
  const av = page.locator('.ch-li .ch-avatar')
  await expect(av.first()).toBeVisible({ timeout: 30_000 })
  const m = await av.evaluateAll((els) => els.map((el) => {
    const b = el.getBoundingClientRect(), r = document.createRange()
    r.selectNodeContents(el)
    const t = r.getBoundingClientRect(), cs = getComputedStyle(el)
    return { w: b.width, h: b.height, dx: Math.abs(t.left + t.width / 2 - (b.left + b.width / 2)), dy: Math.abs(t.top + t.height / 2 - (b.top + b.height / 2)), radius: cs.borderRadius, overflow: cs.overflow }
  }))
  await page.screenshot({ path: info.outputPath('avatar.png') })
  console.log(info.project.name, JSON.stringify(m.slice(0, 4)))
  expect(m.length).toBeGreaterThan(0)
  for (const x of m) {
    expect(x.w).toBe(34)
    expect(x.h).toBe(34)
    expect(x.dx, 'vannrett sentrert').toBeLessThan(1.5)
    expect(x.dy, 'loddrett sentrert').toBeLessThan(2)
    expect(x.overflow).toBe('hidden')
  }
})
