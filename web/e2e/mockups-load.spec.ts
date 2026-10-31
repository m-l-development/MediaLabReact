import { expect, test } from '@playwright/test'

/**
 * TB-4416C4: galleriet i Mockups laster forhåndsvisninger (960 px) i stedet for originalfotoene (opptil 2400 px).
 * Måles med strupet nett (20 Mbit/s, 40 ms) og CPU (4× tregere): tiden til alle forhåndsvisningene er tegnet, og hvor
 * mye bildedata som hentes. Editoren og nedlastingen bruker fortsatt originalen.
 */
test('galleriet: små forhåndsvisninger, raskt tegnet; editoren henter originalen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'måles på PC')
  const bytes: Record<string, number> = {}
  page.on('requestfinished', async (r) => {
    if (!/\/images\/mockups\/.+\.jpe?g/.test(r.url())) return
    bytes[r.url().replace(/^https?:\/\/[^/]+/, '')] = (await r.sizes().catch(() => ({ responseBodySize: 0 }))).responseBodySize
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (20e6 / 8), uploadThroughput: (5e6 / 8) })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.setViewportSize({ width: 1440, height: 900 })
  const t0 = Date.now()
  await page.goto('/app/mockups')
  // alle forhåndsvisningene i galleriet er tegnet (ikke tomme)
  await expect.poll(() => page.locator('canvas[class*="cardCanvas"]').evaluateAll((cs) => cs.length > 0 && cs.every((c) => {
    const cv = c as HTMLCanvasElement
    const g = cv.getContext('2d')
    if (!g || cv.width < 10) return false
    const d = g.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data
    return (d[3] ?? 0) > 0
  })), { timeout: 60_000, intervals: [100] }).toBe(true)
  const ms = Date.now() - t0
  const gallery = Object.entries(bytes)
  const total = gallery.reduce((a, [, b]) => a + b, 0)
  console.log(`[mockups] alle forhåndsvisninger tegnet etter ${ms} ms; ${gallery.length} bilder, ${(total / 1e6).toFixed(2)} MB`)
  expect(gallery.every(([u]) => u.includes('/thumbs/')), 'galleriet henter bare forhåndsvisninger').toBe(true)
  expect(total, 'bildedata i galleriet').toBeLessThan(1.2e6)

  // editoren: originalen (full oppløsning) hentes for den valgte mockupen
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await page.locator('canvas[class*="cardCanvas"]').first().click()
  await expect.poll(() => Object.keys(bytes).some((u) => /\/images\/mockups\/[^/]+\.jpe?g$/.test(u)), { timeout: 30_000 }).toBe(true)
  await expect(page.getByRole('button', { name: /Last ned/ }).first()).toBeEnabled({ timeout: 30_000 })
})
