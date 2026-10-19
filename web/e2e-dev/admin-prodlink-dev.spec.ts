import { expect, test } from '@playwright/test'
import { dropOwnFactors, EMAIL, injectBackend, PASSWORD, setupMfa, signInPassword } from './helpers'

/**
 * «Åpne ConnectHub produksjon» i Utvikler-kortet i ConnectHub Dev (kjøres av run-dev.mjs i løpene «dev» og «mod»):
 * Developer ser knappen (desktop og mobil, 390 px), den peker på produksjonsadressen og åpner den i en ny fane;
 * Moderator ser den ikke. Produksjon besøkes bare uten innlogging (forsiden for innlogging). MFA-faktoren fjernes til slutt.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'staff', 'kjøres av run-dev.mjs med en stabskonto')
test.beforeEach(async ({ page }) => injectBackend(page))

const PROD = 'https://media-lab-react-vyef.vercel.app'

test('Utvikler-kortet: «Åpne ConnectHub produksjon» bare for Developer, på desktop og mobil', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang (mobilbredden sjekkes i testen)')
  test.setTimeout(180_000)
  const developer = EMAIL.startsWith('ch-test-dev@')
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  await signInPassword(page)
  await setupMfa(page)
  try {
    await page.goto('/app/admin')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
    const link = page.locator('[data-ch-prodlink]')
    await expect(page.locator('.ch-stat').first()).toBeVisible({ timeout: 30_000 }) // oversikten er tegnet
    if (!developer) {
      rows.push(`| Moderator: ingen produksjonsknapp | ${(await link.count()) === 0 ? 'ja' : '**NEI**'} |`)
      expect(await link.count()).toBe(0)
      return
    }
    await expect(page.locator('[data-ch-devhere]')).toBeVisible({ timeout: 30_000 })
    expect(await page.locator('[data-ch-devlink]').count()).toBe(0)
    for (const [label, size] of [['desktop', { width: 1440, height: 900 }], ['mobil', { width: 390, height: 844 }]] as const) {
      await page.setViewportSize(size)
      await link.scrollIntoViewIfNeeded()
      await expect(link).toBeVisible()
      await expect(link).toHaveText('Åpne ConnectHub produksjon ↗')
      const box = await link.boundingBox()
      const inside = !!box && box.x >= 0 && box.x + box.width <= size.width + 0.5
      await link.screenshot({ path: info.outputPath(`prodlink-${label}.png`) })
      const [tab] = await Promise.all([context.waitForEvent('page'), link.click()])
      await tab.waitForLoadState('domcontentloaded')
      const url = tab.url()
      await tab.close()
      const ok = url.startsWith(`${PROD}/login`) && url.includes('next=%2Fapp%2Fadmin')
      rows.push(`| ${label}: knapp synlig og innenfor skjermen, ny fane åpner produksjonen | ${inside && ok ? 'ja' : `**NEI** (${url.split('?')[0]})`} |`)
      expect(inside).toBe(true)
      expect(ok).toBe(true)
    }
    rows.push(`| Lenke | ${await link.getAttribute('href')} (target ${await link.getAttribute('target')}) |`)
    expect(await link.getAttribute('href')).toBe(`${PROD}/admin`)
  } finally {
    rows.push(`| MFA-faktor fjernet etter testen | ${(await dropOwnFactors(page)).join(', ') || '–'} |`)
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('admin-prodlink', { body: report, contentType: 'text/markdown' })
  }
})
