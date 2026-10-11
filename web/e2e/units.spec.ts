import { expect, test, type Page } from '@playwright/test'

/** Enhetsvalget (PLT-19): klikkbar enhet ved tallfeltene, husket per felt i `medialab.units` som i dagens app. */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'Mobil har enkel visning uten tallfelt med enhet (som i dag)'))

const unitButtons = (page: Page) => page.locator('button[title^="Trykk for å bytte enhet"]:not([disabled])').filter({ visible: true })

async function newThumbText(page: Page) {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await expect(page.locator('[data-ts-sel]')).toBeVisible()
}

test('Thumbnail Studio: enheten byttes ved klikk, tallet regnes om, og valget huskes', async ({ page }) => {
  await newThumbText(page)
  const btn = unitButtons(page).first()
  await expect(btn).toBeVisible()
  const u0 = (await btn.textContent())?.trim()
  const field = btn.locator('xpath=preceding-sibling::input[1]')
  const v0 = await field.inputValue()
  await btn.click()
  const u1 = (await btn.textContent())?.trim()
  expect(u1).not.toBe(u0)
  expect(await field.inputValue()).not.toBe(v0)
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('medialab.units'))) ?? '{}') as Record<string, string>
  expect(Object.values(saved)).toContain(u1)
  // ny visning: samme felt starter med valgt enhet
  await newThumbText(page)
  await expect(unitButtons(page).first()).toHaveText(u1 ?? '')
})

test('Loop Studio: enheten for tittelstørrelse byttes (% ↔ ×) og huskes etter ny innlasting', async ({ page }) => {
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  await page.getByRole('button', { name: 'Stil', exact: true }).first().click()
  const btn = unitButtons(page).first()
  await expect(btn).toBeVisible()
  const field = btn.locator('xpath=preceding-sibling::input[1]')
  const seen = [[(await btn.textContent())?.trim(), await field.inputValue()]]
  await btn.click()
  seen.push([(await btn.textContent())?.trim(), await field.inputValue()])
  await btn.click()
  seen.push([(await btn.textContent())?.trim(), await field.inputValue()])
  // to enheter i ring (som i dagens app): 100 % = 1 ×, og tilbake til start
  expect(seen).toEqual([['%', '100'], ['×', '1'], ['%', '100']])
  await btn.click()
  const chosen = (await btn.textContent())?.trim()
  await page.reload()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  await page.getByRole('button', { name: 'Stil', exact: true }).first().click()
  await expect(unitButtons(page).first()).toHaveText(chosen ?? '')
})
