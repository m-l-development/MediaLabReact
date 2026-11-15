import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { framesAt } from './media-probe'
import { readMp4 } from './mp4'
import { center, seekTo } from './motion-helpers'

/**
 * Eksport av de nye Motion-malene med den vanlige eksportflyten (ekte Chrome, H.264): filen er gyldig og har riktig
 * lengde, og bildet i filen er likt forhåndsvisningen ved samme tid (tekstmaske, dugget glass, opptelling, filmstriper).
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

async function exportRange(page: Page, from: string, to: string): Promise<Buffer> {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-fps="30"]').click()
  await page.locator('[data-md-exp-range="custom"]').click()
  await page.locator('[data-md-field="exp-from"]').fill(from)
  await page.locator('[data-md-field="exp-from"]').press('Enter')
  await page.locator('[data-md-field="exp-to"]').fill(to)
  await page.locator('[data-md-field="exp-to"]').press('Enter')
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  await expect(page.getByText(/^Ferdig på/)).toBeVisible({ timeout: 30_000 })
  return fs.readFileSync(await d.path())
}

for (const [k, t, th] of [['credits', 2, ''], ['fogreveal', 3, ''], ['daycount', 1, ''], ['monthdump', 2, ''], ['monthdump', 2, 'wbl'], ['kinetic', 1, 'wg']] as const) {
  test(`eksport av mal ${k}${th ? ' i tema ' + th : ''}: gyldig MP4, bildet = forhåndsvisningen`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC')
    test.slow()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/app/motion-design')
    await page.locator('[data-md-new]').click()
    await page.locator('[data-format="wide"]').click()
    if (th) {
      await page.locator('[data-tpl-lib] [data-theme-btn]').click()
      await page.locator(`[data-theme-opt="${th}"]`).click()
    }
    await page.locator(`[data-tpl="${k}"]`).click()
    await page.locator('[data-adv-toggle]').click()
    await seekTo(page, t)
    await page.waitForTimeout(300)
    const pv = await center(page)
    const buf = await exportRange(page, '00:00:00', '00:00:04')
    const m = readMp4(buf)
    const v = m.tracks.find((x) => x.type === 'vide')
    expect(v?.width).toBe(1280)
    expect(Math.abs((v?.duration ?? 0) - 4)).toBeLessThan(0.1)
    const px = (await framesAt(page, buf, [t + 0.02])).px[0]!
    const d = Math.abs(px[0]! - pv[0]!) + Math.abs(px[1]! - pv[1]!) + Math.abs(px[2]! - pv[2]!)
    expect(d, `midtpunktet i eksporten (${px}) er likt forhåndsvisningen (${pv})`).toBeLessThan(60)
  })
}
