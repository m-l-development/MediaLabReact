import { expect, test, type Page } from '@playwright/test'
import { importFiles, newAdvProject, saveAndReload, seekTo, wav } from './motion-helpers'

/** Motion Design → Avansert: lydredigering (flere lydspor, presis start, volum, fade, flytt/trim/del/slett, demp spor, lagring). */

const blocks = (page: Page) => page.locator('[data-row="music"] [data-block="music"]')
const timing = (page: Page) => page.locator('[data-md-timing]')
const insp = (page: Page) => page.locator('[data-md-props]')

test('lyd: to lydspor, start, volum og fade, trim/del/slett, demp spor og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  await importFiles(page, [{ name: 'tale.wav', mimeType: 'audio/wav', buffer: wav(6) }, { name: 'musikk.wav', mimeType: 'audio/wav', buffer: wav(8, 0, 8, 220) }], 2)
  await expect(page.locator('[data-md-bin-item="tale.wav"] [data-md-bin-meta]')).toHaveText('Lyd · 00:00:06:00')

  // A1: tale fra 0 s; A2: musikk fra 1 s (overlapper, så den havner på sporet under)
  await seekTo(page, 0)
  await page.locator('[data-md-bin-item="tale.wav"] [data-md-to="a"]').click()
  await expect(timing(page).locator('[data-md-track]')).toHaveText('A1')
  await seekTo(page, 1)
  await page.locator('[data-md-bin-item="musikk.wav"] [data-md-to="a"]').click()
  await expect(timing(page).locator('[data-md-track]')).toHaveText('A2')
  await expect(blocks(page)).toHaveCount(2)
  await expect(page.locator('[data-md-lane="A2"]')).toBeVisible()

  // presis start (numerisk) og varighet
  await timing(page).locator('[data-md-tm="start"]').fill('1.5')
  await timing(page).locator('[data-md-tm="start"]').blur()
  await expect(timing(page).locator('[data-md-tm="end"]')).toHaveText('9.50')

  // volum og fade (lagres i klippet)
  await insp(page).getByRole('slider', { name: 'Volum' }).fill('0.4')
  await insp(page).getByRole('slider', { name: 'Ton inn' }).fill('2')
  await insp(page).getByRole('slider', { name: 'Ton ut' }).fill('1.5')
  await expect(insp(page).getByRole('button', { name: /^Volum: / })).toContainText('40')

  // trim slutten til 8 s (W), del ved 4 s (S), slett den nye delen, angre
  await seekTo(page, 8)
  await blocks(page).nth(1).click()
  await page.keyboard.press('w')
  await expect(timing(page).locator('[data-md-tm="end"]')).toHaveText('8.00')
  await seekTo(page, 4)
  await blocks(page).nth(1).click()
  await page.keyboard.press('s')
  await expect(blocks(page)).toHaveCount(3)
  await page.keyboard.press('Delete')
  await expect(blocks(page)).toHaveCount(2)
  await page.keyboard.press('Control+z')
  await expect(blocks(page)).toHaveCount(3)

  // demp A2: knappen i sporhodet, lagres i prosjektet
  const mute = page.locator('[data-md-mute="1"]')
  await mute.click()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-md-mute="0"]')).toHaveAttribute('aria-pressed', 'false')

  // lagring: spor, tider, volum, fade og demping står
  await saveAndReload(page)
  await expect(blocks(page)).toHaveCount(3)
  await expect(page.locator('[data-md-mute="1"]')).toHaveAttribute('aria-pressed', 'true')
  await blocks(page).nth(1).click()
  await expect(timing(page).locator('[data-md-track]')).toHaveText('A2')
  await expect(timing(page).locator('[data-md-tm="start"]')).toHaveValue('1.50')
  await expect(insp(page).getByRole('button', { name: /^Volum: / })).toContainText('40')
  await expect(insp(page).getByRole('button', { name: /^Ton inn: / })).toContainText('2.0 s')
  expect(errors).toEqual([])
})
