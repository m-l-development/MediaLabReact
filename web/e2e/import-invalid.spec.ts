import { expect, test, type Page } from '@playwright/test'

/**
 * Ugyldige filer i alle verktøyene (PC og mobil): et ødelagt bilde eller en fil som ikke er en sikkerhetskopi gir en
 * forståelig beskjed, legger ikke inn noe, og krasjer ikke. Før ble et ødelagt bilde i Thumbnail Studio et tomt
 * bildelag uten beskjed, et ødelagt egne-mockup-bilde ble lagret, og Thumbnail spurte om å erstatte alt før filen ble lest.
 */
test.describe.configure({ timeout: 120000 })

const BAD_PNG = { name: 'ødelagt.png', mimeType: 'image/png', buffer: Buffer.from('dette er ikke et bilde') }
const BAD_JSON = { name: 'kopi.json', mimeType: 'application/json', buffer: Buffer.from('{ikke json') }
const mobile = () => test.info().project.name === 'mobil'
const press = async (l: ReturnType<Page['locator']>) => (mobile() ? l.tap() : l.click())

async function watch(page: Page) {
  const errors: string[] = []
  const dialogs: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => {
    if (d.type() !== 'beforeunload') dialogs.push(d.message())
    void d.accept()
  })
  return { errors, dialogs }
}
async function upload(page: Page, l: ReturnType<Page['locator']>, f: typeof BAD_PNG) {
  const ch = page.waitForEvent('filechooser')
  await press(l)
  await (await ch).setFiles(f)
}
/** Beskjeden i en statusmelding (toast) eller en dialog. */
async function said(page: Page, w: { dialogs: string[] }, re: RegExp) {
  await expect.poll(async () => {
    const t = await page.locator('[role=status],[role=alert],[aria-live]').allTextContents()
    return [...t, ...w.dialogs].join(' | ')
  }, { timeout: 10000 }).toMatch(re)
}

test('Photo Design: ødelagt sikkerhetskopi og ødelagt bilde', async ({ page }) => {
  const w = await watch(page)
  await page.goto('/app/photo-design')
  await upload(page, page.getByRole('button', { name: 'Gjenopprett fra fil' }), BAD_JSON)
  await said(page, w, /kunne ikke leses/)
  await press(page.locator('[data-tpl="blank"]'))
  if (mobile()) await page.locator('[data-dock-tab="add"]').tap()
  await upload(page, page.getByRole('button', { name: 'Bilde', exact: true }).first(), BAD_PNG)
  await said(page, w, /Bildet kunne ikke leses/)
  if (mobile()) await page.locator('[data-dock-tab="layers"]').tap()
  await expect(page.locator('[data-layer]')).toHaveCount(0)
  expect(w.errors).toEqual([])
})

test('Thumbnail Studio: ødelagt sikkerhetskopi avvises før spørsmålet, ødelagt bilde gir ikke tomt lag', async ({ page }) => {
  const w = await watch(page)
  await page.goto('/app/thumbnail-studio')
  await upload(page, page.getByRole('button', { name: 'Gjenopprett fra fil' }), BAD_JSON)
  await said(page, w, /Filen kunne ikke leses/)
  expect(w.dialogs.some((d) => /Gjenopprette fra filen/.test(d)), 'ikke spurt om å erstatte alt').toBe(false)
  await press(page.getByRole('button', { name: /Ungdomsmøte/ }).first())
  await press(page.getByRole('button', { name: /Ny mal/ }))
  await press(page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]'))
  await upload(page, page.getByRole('button', { name: 'Bilde', exact: true }).first(), BAD_PNG)
  await said(page, w, /Klarte ikke å lese bildet/)
  await expect(page.locator('[data-ts-sel]')).toHaveCount(0)
  expect(w.errors).toEqual([])
})

test('Motion, Loop, Mockups og Isolate: ødelagt bilde gir beskjed', async ({ page }) => {
  const w = await watch(page)
  await page.goto('/app/motion-design')
  await press(page.getByRole('button', { name: 'Nytt prosjekt' }))
  await press(page.locator('[data-format="wide"]'))
  await press(page.locator('[data-tpl="blank"]'))
  await upload(page, page.getByRole('button', { name: /Last opp video, bilder eller lyd/ }).first(), BAD_PNG)
  await said(page, w, /kunne ikke brukes/)

  await page.goto('/app/loop-studio')
  await press(page.getByRole('link', { name: /Ukeprogram/ }))
  if (mobile()) await press(page.getByRole('button', { name: 'Rediger', exact: true }))
  await press(page.getByRole('button', { name: /^Slides/ }).first())
  await upload(page, page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]'), BAD_PNG)
  await said(page, w, /Klarte ikke å lese bildet/)

  await page.goto('/app/mockups')
  await upload(page, page.getByRole('button', { name: /Last opp design|Bytt design/ }).first(), BAD_PNG)
  await said(page, w, /Bildet kunne ikke leses/)
  await upload(page, page.getByRole('button', { name: /Legg til egne mockup-bilder/ }).first(), BAD_PNG)
  await said(page, w, /Bruk PNG, JPG eller WebP/)

  await page.goto('/app/isolate-subject')
  await page.locator('input[type=file]').first().setInputFiles(BAD_PNG)
  await said(page, w, /Klarte ikke å lese bildet/)
  expect(w.errors).toEqual([])
})
