import { expect, test } from '@playwright/test'
import { center, centerIs, importFiles, insp, isColor, isGray, main, newAdvProject, saveAndReload, seekTo, solid } from './motion-helpers'

/** Motion Design → Avansert: effekter på klipp (forhåndsvisning, av/på, rekkefølge, fade, angre, lagring). */

test('effekter: legg til, juster, av/på, rekkefølge, fade, fjern, angre og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  await importFiles(page, [solid('rod.png', [220, 30, 30]), solid('blaa.png', [30, 50, 220])], 2)
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await page.locator('[data-md-bin-item="blaa.png"] [data-md-to="v1"]').click()
  await seekTo(page, 1)
  await main(page).nth(0).click()
  // kategorien Effekter i inspektøren
  await insp(page, 'fx')
  const fx = page.locator('[data-md-effects]')
  await expect(fx).toBeVisible()
  await centerIs(page, (c) => isColor(c, 0), 'rødt uten effekter')

  // svart-hvitt: grått i forhåndsvisningen
  await fx.locator('[data-md-fx-pick]').selectOption('bw')
  await fx.locator('[data-md-fx-add]').click()
  await expect(fx.locator('[data-md-fx="bw"]')).toHaveCount(1)
  await centerIs(page, isGray, 'svart-hvitt gir grått')
  // av: rødt igjen, innstillingen beholdes
  await fx.locator('[data-md-fx="bw"] [data-md-fx-on]').uncheck()
  await centerIs(page, (c) => isColor(c, 0), 'effekten av: rødt igjen')
  await expect(fx.locator('[data-md-fx="bw"] [data-md-fxv="bw"]')).toHaveValue('1')
  await fx.locator('[data-md-fx="bw"] [data-md-fx-on]').check()
  await centerIs(page, isGray, 'på igjen')
  // juster styrken: halvveis grått (rødt, men mindre mettet)
  await fx.locator('[data-md-fx="bw"] [data-md-fxv="bw"]').fill('0.4')
  await centerIs(page, (c) => c[0]! < 200 && c[0]! > c[1]! + 40, '40 % svart-hvitt: rødt, men dempet')
  await fx.locator('[data-md-fx="bw"] [data-md-fx-del]').click()
  await expect(fx.locator('[data-md-fx]')).toHaveCount(0)

  // rekkefølgen påvirker resultatet: sepia → fargetone 180° er ikke det samme som fargetone → sepia
  await fx.locator('[data-md-fx-pick]').selectOption('sepia')
  await fx.locator('[data-md-fx-add]').click()
  await fx.locator('[data-md-fx-pick]').selectOption('hue')
  await fx.locator('[data-md-fx-add]').click()
  await fx.locator('[data-md-fx="hue"] [data-md-fxv="hue"]').fill('180')
  await expect.poll(async () => (await center(page)).join()).not.toBe('220,30,30')
  const a = await center(page)
  await fx.locator('[data-md-fx="hue"] [data-md-fx-up]').click()
  await expect(fx.locator('[data-md-fx]').first()).toHaveAttribute('data-md-fx', 'hue')
  await expect.poll(async () => (await center(page)).join(), { message: 'ny rekkefølge gir et annet resultat' }).not.toBe(a.join())

  // angre fjerner siste endring (rekkefølgen), gjør om gir den tilbake
  await page.keyboard.press('Control+z')
  await expect(fx.locator('[data-md-fx]').first()).toHaveAttribute('data-md-fx', 'sepia')
  await page.keyboard.press('Control+Shift+z')
  await expect(fx.locator('[data-md-fx]').first()).toHaveAttribute('data-md-fx', 'hue')

  // fade på det blå klippet: ved starten av klippet (4 s) er det nesten svart, midt i fullt blått
  await main(page).nth(1).click()
  await fx.locator('[data-md-fx-pick]').selectOption('fade')
  await fx.locator('[data-md-fx-add]').click()
  await fx.locator('[data-md-fx="fade"] [data-md-fxv="fade"]').fill('2')
  await seekTo(page, 6)
  await centerIs(page, (c) => isColor(c, 2), 'blått etter fade inn')
  await seekTo(page, 4)
  await centerIs(page, (c) => (c[2] ?? 0) < 140 && (c[2] ?? 0) > 20, 'halvveis i fade inn: mørkere blått')
  // effektene på det ene klippet påvirker ikke det andre
  await expect(fx.locator('[data-md-fx]')).toHaveCount(1)

  // lagre og last inn: effektene, rekkefølgen og verdiene står
  await saveAndReload(page)
  await main(page).nth(0).click()
  await insp(page, 'fx')
  await expect(page.locator('[data-md-effects] [data-md-fx]')).toHaveCount(2)
  await expect(page.locator('[data-md-effects] [data-md-fx]').first()).toHaveAttribute('data-md-fx', 'hue')
  await expect(page.locator('[data-md-effects] [data-md-fx="hue"] [data-md-fxv="hue"]')).toHaveValue('180')
  await main(page).nth(1).click()
  await expect(page.locator('[data-md-effects] [data-md-fx="fade"] [data-md-fxv="fade"]')).toHaveValue('2')
  expect(errors).toEqual([])
})
