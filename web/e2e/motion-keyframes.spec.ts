import { expect, test, type Page } from '@playwright/test'
import { centerIs, importFiles, insp, isColor, isGray, main, newAdvProject, saveAndReload, seekTo, solid } from './motion-helpers'

/** Motion Design → Avansert: keyframes (effektverdi, opasitet, interpolering, flytt/slett, flytting og trim av klipp, lagring). */

const keys = (page: Page) => page.locator('[data-md-keys]')
const prop = (page: Page, k: string) => keys(page).locator(`[data-md-kf="${k}"]`)

async function setVal(page: Page, k: string, v: string) {
  const inp = prop(page, k).locator(`[data-md-kfnum="${k}"]`)
  await inp.fill(v)
  await inp.blur()
}

test('keyframes: animasjon av effekt og opasitet, interpolering, flytt/slett, følger klippet, lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  await importFiles(page, [solid('rod.png', [220, 30, 30]), solid('gronn.png', [30, 200, 40])], 2)
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()

  // effektparameter: svart-hvitt 0 ved 0 s → 1 ved 2 s på det røde klippet
  await main(page).first().click()
  await insp(page, 'fx')
  await page.locator('[data-md-fx-pick]').selectOption('bw')
  await page.locator('[data-md-fx-add]').click()
  // effektens verdi kan animeres under Animasjon
  await insp(page, 'anim')
  const bwProp = keys(page).locator('[data-md-kf^="fx:"]')
  const bwKey = (await bwProp.getAttribute('data-md-kf')) as string
  await seekTo(page, 0)
  await main(page).first().click()
  await prop(page, bwKey).locator('[data-md-kf-toggle]').click()
  await setVal(page, bwKey, '0')
  await seekTo(page, 2)
  await main(page).first().click()
  await prop(page, bwKey).locator('[data-md-kf-toggle]').click()
  await setVal(page, bwKey, '1')
  await expect(prop(page, bwKey)).toHaveAttribute('data-animated', '1')
  await expect(page.locator('[data-row="video"] [data-md-kfdot]')).toHaveCount(2)
  // keyframe-prikken i tidslinjen: velger klippet, flytter spillehodet og åpner Animasjon
  await insp(page, 'clip')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)
  await seekTo(page, 1)
  await page.locator('[data-row="video"] [data-md-kfdot]').nth(1).click()
  await expect(page.locator('[data-md-insp-tab="anim"]')).toHaveAttribute('aria-selected', 'true')
  await expect(prop(page, bwKey).locator('[data-md-key="1"]')).toHaveAttribute('data-here', '1')
  await seekTo(page, 0)
  await centerIs(page, (c) => isColor(c, 0), '0 s: rødt (svart-hvitt 0)')
  await seekTo(page, 3)
  await centerIs(page, isGray, '3 s: grått (svart-hvitt 1)')
  await seekTo(page, 1)
  await centerIs(page, (c) => c[0]! > c[1]! + 30 && c[0]! < 200, '1 s: halvveis')

  // opasitet på et videospor (grønt over rødt): 0 ved 0 s → 1 ved 2 s
  await seekTo(page, 0)
  await page.locator('[data-md-bin-item="gronn.png"] [data-md-to="v"]').click()
  await prop(page, 'opacity').locator('[data-md-kf-toggle]').click()
  await setVal(page, 'opacity', '0')
  await seekTo(page, 2)
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await prop(page, 'opacity').locator('[data-md-kf-toggle]').click()
  await setVal(page, 'opacity', '1')
  await expect(prop(page, 'opacity').locator('[data-md-key]')).toHaveCount(2)
  await seekTo(page, 0)
  await centerIs(page, (c) => (c[1] ?? 0) < 60, '0 s: grønt usynlig')
  await seekTo(page, 1)
  await centerIs(page, (c) => (c[1] ?? 0) > 70 && (c[1] ?? 0) < 160, '1 s: halvt grønt')
  await seekTo(page, 3)
  await centerIs(page, (c) => isColor(c, 1), '3 s: helt grønt')

  // hold-interpolering: ved 1 s står verdien fra første keyframe (0)
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await prop(page, 'opacity').locator('[data-md-key="0"] [data-md-kf-ease]').selectOption('hold')
  await seekTo(page, 1)
  await centerIs(page, (c) => (c[1] ?? 0) < 60, 'hold: fortsatt usynlig ved 1 s')
  await prop(page, 'opacity').locator('[data-md-key="0"] [data-md-kf-ease]').selectOption('lin')

  // flytt keyframe 2 til 1 s: ved 1 s er det helt grønt
  const t1 = prop(page, 'opacity').locator('[data-md-key="1"] [data-md-kfnum="opacity-t-1"]')
  await t1.fill('1')
  await t1.blur()
  await centerIs(page, (c) => isColor(c, 1), 'keyframen flyttet til 1 s')

  // klippet flyttes 1 s senere (tidsinspektøren under Klipp): animasjonen følger med (ved 1 s usynlig, ved 2 s synlig)
  await insp(page, 'clip')
  await page.locator('[data-md-timing] [data-md-tm="start"]').fill('1')
  await page.locator('[data-md-timing] [data-md-tm="start"]').blur()
  await seekTo(page, 1)
  await centerIs(page, (c) => (c[1] ?? 0) < 60, 'etter flytting: usynlig ved 1 s')
  await seekTo(page, 2)
  await centerIs(page, (c) => isColor(c, 1), 'etter flytting: synlig ved 2 s')

  // trim starten til 1,5 s: keyframen ved klippets 0 s havner utenfor (beholdes og vises)
  await seekTo(page, 1)
  await page.keyboard.press('Shift+ArrowRight')
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await page.keyboard.press('q')
  await insp(page, 'anim')
  await expect(page.locator('[data-md-kf-out]')).toContainText('1 keyframes')
  await expect(prop(page, 'opacity').locator('[data-md-key]')).toHaveCount(2)

  // slett en keyframe, angre gir den tilbake
  await prop(page, 'opacity').locator('[data-md-key="0"] [data-md-kf-del]').click()
  await expect(prop(page, 'opacity').locator('[data-md-key]')).toHaveCount(1)
  await page.keyboard.press('Control+z')
  await expect(prop(page, 'opacity').locator('[data-md-key]')).toHaveCount(2)

  // lagring: keyframes og interpolering står
  await saveAndReload(page)
  await main(page).first().click()
  await insp(page, 'anim')
  await expect(keys(page).locator('[data-md-kf^="fx:"] [data-md-key]')).toHaveCount(2)
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await expect(prop(page, 'opacity').locator('[data-md-key]')).toHaveCount(2)
  await seekTo(page, 3)
  await centerIs(page, (c) => isColor(c, 1), 'etter omlasting: animasjonen virker')
  expect(errors).toEqual([])
})
