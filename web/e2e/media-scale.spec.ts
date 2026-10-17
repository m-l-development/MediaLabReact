import { expect, test } from '@playwright/test'
import { png } from './png'

/**
 * Stor samling i Dine medier (SHR-01, godkjent 2026-10-12): ingen automatisk sletting ved 60 filer, varsel ved stor
 * samling, og siden skal fortsatt være rask. 300 ulike bilder (terskelen for varsel) lastes opp i én omgang.
 */
test('300 filer: alle beholdes, varsel om stor samling, rask innlasting og manuell sletting', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'samme lagring på mobil; kjøres én gang')
  test.setTimeout(240_000)
  const N = 300
  const files = Array.from({ length: N }, (_, i) => ({
    name: `bilde-${String(i).padStart(3, '0')}.png`,
    mimeType: 'image/png',
    buffer: png(64, 48, (x, y) => [i % 256, i >> 8, (x + y) % 256, 255]),
  }))
  await page.goto('/app/medier')
  const t0 = Date.now()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Last opp' }).click()
  await (await chooser).setFiles(files)
  await expect(page.getByText(`${N} fil(er) lagt til.`)).toBeVisible({ timeout: 180_000 })
  const uploadMs = Date.now() - t0

  // Alle 300 er beholdt (dagens delte mappe hadde slettet de 240 eldste), og varselet vises
  await expect(page.locator('[data-media-warn="count"]')).toBeVisible()
  await expect(page.locator('[data-media-usage]')).toContainText(`${N} fil(er)`)

  // Innlasting av siden med hele samlingen
  const t1 = Date.now()
  await page.reload()
  await expect(page.locator('li', { hasText: 'bilde-000.png' })).toBeVisible()
  await expect(page.locator('li', { hasText: 'bilde-299.png' })).toBeVisible()
  const reloadMs = Date.now() - t1
  const est = await page.evaluate(async () => (navigator.storage?.estimate ? navigator.storage.estimate() : null))

  // Manuell sletting virker fortsatt, med bekreftelse
  page.once('dialog', (d) => void d.accept())
  await page.locator('li', { hasText: 'bilde-123.png' }).getByRole('button', { name: /Fjern fra mediene/ }).click()
  await expect(page.getByText('«bilde-123.png» er fjernet.')).toBeVisible()
  await expect(page.locator('[data-media-usage]')).toContainText(`${N - 1} fil(er)`)

  const report = `opplasting ${N} filer: ${(uploadMs / 1000).toFixed(1)} s · innlasting av Dine medier: ${reloadMs} ms · nettleserens lagring: ${est ? `${Math.round((est.usage ?? 0) / 1024)} KB av ${Math.round((est.quota ?? 0) / 1024 ** 3)} GB` : 'ukjent'}`
  console.log(report)
  await info.attach('måling', { body: report, contentType: 'text/plain' })
  expect(reloadMs).toBeLessThan(5000)
})
