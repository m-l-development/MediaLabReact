import { expect, test, type Page } from '@playwright/test'

/**
 * TB-4416C4: innlasting av Mockups-galleriet i Dev (produksjonsbygg), innlogget. Strupet nett (20 Mbit/s, 40 ms) og CPU
 * (4× tregere). Måler tiden fra adressen åpnes til alle forhåndsvisningene er tegnet, og bildedata som hentes. Skriver
 * bare tall; ingen data endres.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

test('Mockups-galleriet: tid til alle forhåndsvisninger er tegnet, og bildedata', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'måles på PC')
  await signIn(page)
  const v = (await page.evaluate(async () => (await (await fetch('/app/version.json', { cache: 'no-store' })).json()) as { v: string })).v.slice(0, 7)
  const bytes: Record<string, number> = {}
  page.on('requestfinished', async (r) => {
    if (!/\/images\/mockups\/.+\.jpe?g/.test(r.url())) return
    bytes[r.url().replace(/^https?:\/\/[^/]+/, '')] = (await r.sizes().catch(() => ({ responseBodySize: 0 }))).responseBodySize
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const t0 = Date.now()
  await page.goto('/app/mockups')
  await expect.poll(() => page.locator('canvas[class*="cardCanvas"]').evaluateAll((cs) => cs.length > 0 && cs.every((c) => {
    const cv = c as HTMLCanvasElement
    const g = cv.getContext('2d')
    if (!g || cv.width < 10) return false
    return (g.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data[3] ?? 0) > 0
  })), { timeout: 120_000, intervals: [100] }).toBe(true)
  const ms = Date.now() - t0
  const n = Object.keys(bytes).length
  const total = Object.values(bytes).reduce((a, b) => a + b, 0)
  console.log(`[mockups-dev] versjon ${v}: alle forhåndsvisninger tegnet etter ${ms} ms; ${n} bilder, ${(total / 1e6).toFixed(2)} MB; forhåndsvisninger: ${Object.keys(bytes).every((u) => u.includes('/thumbs/'))}`)
})
