import { expect, test, type Page } from '@playwright/test'
import { centerIs, importFiles, insp, main, newAdvProject, recordVideo, saveAndReload, seekTo } from './motion-helpers'

/** Motion Design → Avansert: hastighet på et ekte videoklipp (rødt 0–1 s, grønt 1–2 s, blått 2–3 s i kilden). */

const speed = (page: Page) => page.locator('[data-md-speed]')
/** Effektiv varighet slik hastighetspanelet viser den («Kilde X s → Y s på tidslinjen», to desimaler). */
const effDur = async (page: Page) => Number(/→ ([\d.]+) s/.exec((await speed(page).locator('[data-md-speed-info]').textContent()) ?? '')?.[1] ?? NaN)
const durIs = (page: Page, v: number) => expect.poll(async () => Math.abs((await effDur(page)) - v)).toBeLessThan(0.02)

test('hastighet: normal, rask og sakte film på en ekte video, keyframes følger, angre og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid], 1)
  // opptaket i sanntid blir omtrent 3 s (litt mer eller mindre under last)
  await expect(page.locator('[data-md-bin-item="farger.webm"] [data-md-bin-meta]')).toHaveText(/^Video · 00:00:0[23]:\d\d · 320×180$/)
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await main(page).first().click()
  // varigheten i Klipp (tidsinspektøren), så kategorien Hastighet
  const src = Number(await page.locator('[data-md-timing] [data-md-tm="dur"]').inputValue())
  await insp(page, 'speed')
  await expect(speed(page)).toBeVisible()
  await durIs(page, src)
  expect(src).toBeGreaterThan(2.8)

  // normal fart: grønt ved 1,5 s
  await seekTo(page, 1)
  await seekTo(page, 1)
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight')
  await centerIs(page, (c) => c[1]! > 150 && c[0]! < 90 && c[2]! < 90, '1×: grønt ved 1,5 s')

  // 2×: halv lengde, og ved 0,75 s vises kilden ved 1,5 s (grønt); ved 1,25 s kilden ved 2,5 s (blått)
  await main(page).first().click()
  await speed(page).locator('[data-md-speedset="2"]').click()
  await durIs(page, src / 2)
  // «Kilde X s → Y s på tidslinjen»: Y = X / 2 (tallene er avrundet hver for seg)
  await expect.poll(async () => {
    const m = /Kilde ([\d.]+) s → ([\d.]+) s på tidslinjen/.exec((await speed(page).locator('[data-md-speed-info]').textContent()) ?? '')
    return m ? Math.abs(Number(m[2]) - Number(m[1]) / 2) : 9
  }).toBeLessThan(0.011)
  await seekTo(page, 0)
  for (let i = 0; i < 23; i++) await page.keyboard.press('ArrowRight')
  await centerIs(page, (c) => c[1]! > 150 && c[0]! < 90 && c[2]! < 90, '2×: grønt ved 0,77 s')
  await seekTo(page, 1)
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight')
  await centerIs(page, (c) => c[2]! > 150 && c[0]! < 90 && c[1]! < 90, '2×: blått ved 1,27 s')

  // 0,5× (sakte film): dobbel lengde; ved 1 s vises kilden ved 0,5 s (rødt), ved 3 s kilden ved 1,5 s (grønt)
  await main(page).first().click()
  await speed(page).locator('[data-md-speedset="0.5"]').click()
  await durIs(page, src * 2)
  await seekTo(page, 1)
  await centerIs(page, (c) => c[0]! > 150 && c[1]! < 90 && c[2]! < 90, '0,5×: rødt ved 1 s')
  await seekTo(page, 3)
  await centerIs(page, (c) => c[1]! > 150 && c[0]! < 90 && c[2]! < 90, '0,5×: grønt ved 3 s')

  // keyframe ved klippets 4 s følger innholdet: til 1× blir den 2 s
  await main(page).first().click()
  await seekTo(page, 4)
  await main(page).first().click()
  await insp(page, 'anim')
  await page.locator('[data-md-keys] [data-md-kf="scale"] [data-md-kf-toggle]').click()
  await insp(page, 'speed')
  await speed(page).locator('[data-md-speedset="1"]').click()
  await insp(page, 'anim')
  await expect(page.locator('[data-md-keys] [data-md-kf="scale"] [data-md-kfnum="scale-t-0"]')).toHaveValue('2.00')
  await insp(page, 'speed')

  // numerisk fart, angre (endringer av samme felt innen 0,9 s blir ett angresteg, så vi venter litt)
  await page.waitForTimeout(1000)
  await speed(page).locator('[data-md-kfnum="speed"]').fill('1.5')
  await speed(page).locator('[data-md-kfnum="speed"]').blur()
  await durIs(page, src / 1.5)
  await page.keyboard.press('Control+z')
  await durIs(page, src)
  await page.keyboard.press('Control+Shift+z')
  await durIs(page, src / 1.5)

  // lagring
  await saveAndReload(page)
  await main(page).first().click()
  await insp(page, 'speed')
  await expect(speed(page).locator('[data-md-kfnum="speed"]')).toHaveValue('1.50')
  await durIs(page, src / 1.5)
  expect(errors).toEqual([])
})
