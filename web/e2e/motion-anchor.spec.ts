import { expect, test, type Page } from '@playwright/test'
import { centerIs, importFiles, insp, isColor, main, newAdvProject, saveAndReload, seekTo, solid } from './motion-helpers'

/** Motion Design → Avansert → Animasjon: ankerpunkt (rotasjon skjer rundt ankerpunktet), kan keyframes, lagres. */

const prop = (page: Page, k: string) => page.locator(`[data-md-keys] [data-md-kf="${k}"]`)
async function setVal(page: Page, k: string, v: string) {
  const inp = prop(page, k).locator(`[data-md-kfnum="${k}"]`)
  await inp.fill(v)
  await inp.blur()
}

test('ankerpunkt: rotasjon rundt ankerpunktet i forhåndsvisningen, lagres med prosjektet', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  await importFiles(page, [solid('rod.png', [220, 30, 30])], 1)
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await seekTo(page, 1)
  await main(page).first().click()
  await insp(page, 'anim')
  await expect(prop(page, 'ax')).toBeVisible()
  await expect(prop(page, 'ay')).toBeVisible()

  // halv størrelse og 180° rundt midten: midten er fortsatt rød
  await setVal(page, 'scale', '0.5')
  await setVal(page, 'rot', '180')
  await centerIs(page, (c) => isColor(c, 0), 'rotasjon rundt midten: rødt i midten')
  // ankerpunkt ved høyre kant: 180° rundt kanten flytter klippet bort fra midten
  await setVal(page, 'ax', '0.5')
  await centerIs(page, (c) => !isColor(c, 0), 'rotasjon rundt høyre kant: klippet er flyttet ut av midten')
  // uten rotasjon gjør ankerpunktet ingenting
  await setVal(page, 'rot', '0')
  await centerIs(page, (c) => isColor(c, 0), 'uten rotasjon: rødt i midten')
  await setVal(page, 'rot', '180')
  await centerIs(page, (c) => !isColor(c, 0), 'igjen flyttet')

  await saveAndReload(page)
  await seekTo(page, 1)
  await main(page).first().click()
  await insp(page, 'anim')
  await expect(prop(page, 'ax').locator('[data-md-kfnum="ax"]')).toHaveValue('0.50')
  await expect(prop(page, 'ax')).toBeVisible()
  await centerIs(page, (c) => !isColor(c, 0), 'etter gjenåpning: samme bilde')
  expect(errors).toEqual([])
})
