import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Motion Design: fullskjerm for forhåndsvisningen (controller.toggleFull / measure, FullBar). Komposisjonen tegnes i
 * prosjektets valgte oppløsning (1080p → 1920 × 1080, 4K → 3840 × 2160), men aldri i flere piksler enn skjermen har;
 * eksporten følger fortsatt prosjektets valg. Avspillingslinjen: spill av / pause, spill av fra start, søkbar tidslinje
 * med tidsmerker og dragbart spillehode, tid / varighet og «Avslutt fullskjerm» – samme spillehode som editoren.
 */
test.skip(({ isMobile }) => isMobile, 'fullskjerm testes på PC-skjerm')

const canvas = (page: Page) => page.locator('[data-md-canvas]')
const size = (page: Page) => canvas(page).evaluate((c: HTMLCanvasElement) => [c.width, c.height])
const fullTime = (page: Page) => page.locator('[data-md-full-time]').textContent()
const secs = (s: string | null) => {
  const m = /^(\d+):(\d+(?:\.\d)?)/.exec(s ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

async function project(page: Page) {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([{ name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) }])
  await expect(page.locator('[data-md-bin-item]')).toHaveCount(1, { timeout: 20_000 })
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await page.locator('[data-adv-toggle]').click()
}

async function pickRes(page: Page, dim: RegExp) {
  await page.getByRole('button', { name: /^Eksporter/ }).first().click()
  const dlg = page.getByRole('dialog', { name: 'Eksporter video' })
  await dlg.locator('button').filter({ hasText: dim }).first().click()
  await expect(dlg.locator('button[aria-pressed="true"]').filter({ hasText: dim })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(dlg).toHaveCount(0)
}

async function enterFull(page: Page) {
  await page.locator('[data-md-fullscreen]').click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await expect(page.locator('[data-md-full]')).toHaveCount(1)
}

test('1080p: fullskjerm tegner 1920 × 1080; avspillingslinjen søker, spiller fra start og følger editoren; Escape og knappen avslutter', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await project(page)
  const before = await size(page)
  expect(before[0]).toBeLessThan(1920) // vanlig visning: tilpasset vinduet
  await enterFull(page)
  await expect.poll(() => size(page)).toEqual([1920, 1080])

  // linjen skjules når pekeren er borte fra den (videoen i fokus), og kommer tilbake nær bunnen
  const fb = page.locator('[data-md-fullbar]')
  await page.mouse.move(960, 300)
  await expect(fb).toHaveAttribute('data-hidden', '', { timeout: 4000 })
  await page.mouse.move(960, 1050)
  await expect(fb).not.toHaveAttribute('data-hidden', '')

  // tid «m:ss.s / m:ss.s» og tidsmerker
  await expect(page.locator('[data-md-full-time]')).toHaveText(/^\d+:\d\d\.\d \/ \d+:\d\d\.\d$/)
  await expect(page.locator('[data-md-full-track] span').first()).toBeVisible()
  const total = secs(((await fullTime(page)) ?? '').split(' / ')[1] ?? '')
  expect(total).toBeGreaterThan(1)

  // mellomrom spiller av og pauser
  const t0 = await fullTime(page)
  await page.keyboard.press(' ')
  await expect.poll(() => fullTime(page)).not.toBe(t0)
  await page.keyboard.press(' ')

  // klikk midt på tidslinjen, tastatur (Home, Shift+→), dra spillehodet
  const tr = page.locator('[data-md-full-track]')
  const tb = (await tr.boundingBox())!
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2)
  await expect.poll(async () => Math.abs(secs(await fullTime(page)) - total / 2)).toBeLessThan(0.3)
  await tr.focus()
  await page.keyboard.press('Home')
  await expect.poll(async () => secs(await fullTime(page))).toBe(0)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(async () => secs(await fullTime(page))).toBe(1)
  await page.mouse.move(tb.x + tb.width * 0.2, tb.y + tb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width * 0.6, tb.y + tb.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => Math.abs(secs(await fullTime(page)) - total * 0.6)).toBeLessThan(0.3)
  const kept = await fullTime(page)

  // «Avslutt fullskjerm»: editoren viser samme tid, og visningen er tilbake
  await page.locator('[data-md-full-exit]').click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await expect(page.locator('[data-md-time]')).toHaveText(kept ?? '')
  await expect.poll(() => size(page)).toEqual(before)

  // spill av fra start, så Escape avslutter
  await enterFull(page)
  await page.locator('[data-md-full-restart]').click()
  await expect(page.locator('[data-md-full-play]')).toHaveAttribute('aria-label', 'Pause')
  await page.locator('[data-md-full-play]').click()
  expect(secs(await fullTime(page))).toBeLessThan(2.5)
  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await expect(page.locator('[data-md-full]')).toHaveCount(0)
})

test('4K: skjerm uten 4K bruker skjermens oppløsning; 4K-skjerm 3840 × 2160; eksporten følger prosjektets valg', async ({ browser }) => {
  test.setTimeout(120_000) // to nettlesersider med hvert sitt prosjekt
  // skjerm som ikke støtter 4K (1920 × 1080 fysiske piksler)
  const small = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await project(small)
  await pickRes(small, /3840 × 2160/)
  await enterFull(small)
  await expect.poll(() => size(small)).toEqual([1920, 1080])
  await small.keyboard.press('Escape')
  await expect.poll(() => small.evaluate(() => !!document.fullscreenElement)).toBe(false)
  // eksporten husker 4K for prosjektet
  await small.getByRole('button', { name: /^Eksporter/ }).first().click()
  await expect(small.getByRole('dialog', { name: 'Eksporter video' }).locator('button[aria-pressed="true"]')).toContainText('3840 × 2160')
  await small.close()

  // 4K-skjerm (1920 × 1080 CSS-piksler × 2 = 3840 × 2160 fysiske)
  const big = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  await project(big)
  await pickRes(big, /3840 × 2160/)
  await enterFull(big)
  await expect.poll(() => size(big)).toEqual([3840, 2160])
  await big.keyboard.press('Escape')
  await expect.poll(() => big.evaluate(() => !!document.fullscreenElement)).toBe(false)
  // 1080p-prosjekt på 4K-skjerm: prosjektets oppløsning, ikke skjermens
  await pickRes(big, /1920 × 1080/)
  await enterFull(big)
  await expect.poll(() => size(big)).toEqual([1920, 1080])
  await big.close()
})
