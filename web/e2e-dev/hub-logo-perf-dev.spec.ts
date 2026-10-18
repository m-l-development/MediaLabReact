import { expect, test, type Page } from '@playwright/test'
import { EMAIL, expectHub, injectBackend, PASSWORD, signInAs } from './helpers'

/**
 * Måling (ikke funksjonstest): menighetslogoen på forsiden – tid til logoen vises og antall kall (file.urls og nedlastinger
 * fra lagringen) ved første besøk, ved retur til forsiden i appen og ved ny innlasting. Kjøres av run-dev.mjs med Admin
 * i «CH-test Menighet A» (som har en logo). Bare lesing; ingenting endres.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin')
test.beforeEach(async ({ page }) => injectBackend(page))

function counter(page: Page) {
  const c = { urls: 0, storage: 0, bytes: 0 }
  page.on('request', (r) => {
    const u = r.url()
    if (u.includes('/api/ch') && u.includes('file.urls')) c.urls++
    if (/\/storage\/v1\/object\//.test(u)) c.storage++
  })
  page.on('response', async (r) => {
    if (/\/storage\/v1\/object\//.test(r.url())) c.bytes += Number(r.headers()['content-length'] ?? 0)
  })
  return c
}

test('forsiden: menighetslogo – tid og kall', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(120_000)
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  const logo = page.locator('[data-ch-hub-church] img')
  const rows = ['| Besøk | Tid til logo (ms) | file.urls | nedlastinger | byte |', '|---|---|---|---|---|']
  const measure = async (label: string, go: () => Promise<unknown>) => {
    const c = counter(page)
    const t0 = Date.now()
    await go()
    await expect(logo).toBeVisible({ timeout: 30_000 })
    await expect.poll(() => logo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)
    const ms = Date.now() - t0
    await page.waitForTimeout(1500) // fang sene kall
    rows.push(`| ${label} | ${ms} | ${c.urls} | ${c.storage} | ${c.bytes} |`)
  }
  await measure('første visning (ny innlasting av /app/)', () => page.goto('/app/'))
  // bort fra forsiden i appen (uten ny innlasting), så måles returen
  await page.getByRole('link', { name: /Dine medier/ }).click()
  await expect(logo).toHaveCount(0, { timeout: 10_000 })
  await measure('retur til forsiden i appen', () => page.goBack())
  await measure('ny innlasting (F5)', () => page.reload())
  const nat = await logo.evaluate((i: HTMLImageElement) => `${i.naturalWidth}×${i.naturalHeight} vist som ${i.width}×${i.height}`)
  rows.push(`| (logoens oppløsning) | ${nat} | | | |`)
  const report = rows.join('\n')
  console.log(`\n${report}\n`)
  await info.attach('hub-logo-perf', { body: report, contentType: 'text/markdown' })
})
