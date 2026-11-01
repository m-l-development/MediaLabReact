import { expect, test } from '@playwright/test'
import { png } from './png'

/**
 * Redigerbare tallverdier (shared/ui/NumField, og Loop Studios merking i controller.setupNumEdit):
 * klikk på tallet gir et felt med verdien markert; Enter godtar, Escape forkaster, pil opp/ned endrer; desimalkomma og
 * enhet godtas; ugyldig tekst gir en beskjed og siste gyldige verdi beholdes; slider og tall viser det samme.
 */
test.skip(({ isMobile }) => isMobile, 'tastaturinnskriving testes på PC')

test('Photo Design: tallet ved en slider kan skrives inn, Escape forkaster, ugyldig tekst avvises, pil opp endrer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await ch).setFiles({ name: 'bilde.png', mimeType: 'image/png', buffer: png(400, 300, (x, y) => [80 + (x % 100), 90, 120 + (y % 80), 255]) })
  await page.getByRole('button', { name: 'Farge', exact: true }).click()
  const slider = page.getByRole('slider', { name: 'Lysstyrke' })
  const num = page.getByRole('button', { name: /^Lysstyrke: / })
  await expect(num).toHaveText('0')
  await expect(num).toHaveCSS('text-decoration-style', 'dotted') // synlig at den kan redigeres

  // klikk: feltet får fokus med hele verdien markert, så den kan erstattes direkte
  await num.click()
  const field = page.getByRole('textbox', { name: 'Lysstyrke' })
  await expect(field).toBeFocused()
  expect(await field.evaluate((i: HTMLInputElement) => [i.selectionStart, i.selectionEnd, i.value.length])).toEqual([0, 1, 1])
  await page.keyboard.type('25')
  await page.keyboard.press('Enter')
  await expect(slider).toHaveValue('25')
  await expect(num).toHaveText('+25')

  // Escape forkaster; snarveier på arbeidsflaten (0 = tilpass, Delete) reagerer ikke mens man skriver
  const layers = await page.locator('[data-layer]').count()
  await num.click()
  await page.keyboard.type('0')
  await page.keyboard.press('Delete')
  await page.keyboard.press('Escape')
  await expect(slider).toHaveValue('25')
  expect(await page.locator('[data-layer]').count()).toBe(layers)

  // ugyldig: beskjed, feltet blir stående; klikk utenfor gir siste gyldige verdi
  await num.click()
  await page.keyboard.type('mye')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: 'Skriv et tall' })).toBeVisible()
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await field.evaluate((i: HTMLInputElement) => i.blur())
  await expect(slider).toHaveValue('25')

  // desimalkomma, minus, enhet og grenser (−100…100)
  await num.click()
  await page.keyboard.type('−7,0')
  await page.keyboard.press('Enter')
  await expect(slider).toHaveValue('-7')
  await num.click()
  await page.keyboard.type('400')
  await page.keyboard.press('Enter')
  await expect(slider).toHaveValue('100')

  // pil ned på tallet (uten å åpne feltet): ett steg; Shift: ti
  await num.focus()
  await page.keyboard.press('ArrowDown')
  await expect(slider).toHaveValue('99')
  await page.keyboard.press('Shift+ArrowDown')
  await expect(slider).toHaveValue('89')

  // slideren endrer tallet
  await slider.fill('-40')
  await expect(num).toHaveText('-40')

  // zoom i verktøylinjen kan også skrives inn
  const zoom = page.getByRole('button', { name: /^Zoom: / })
  await zoom.click()
  await page.keyboard.type('200')
  await page.keyboard.press('Enter')
  await expect(zoom).toHaveText('200 %')
})

test('Loop Studio: tallene ved glidebryterne er merket, kan klikkes, skrives inn med komma og forkastes med Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/loop-studio?mal=week')
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  const nums = page.locator('[data-loop-editor] [data-num-edit][tabindex="0"]')
  await expect(nums.first()).toBeVisible({ timeout: 20000 })
  const num = nums.first()
  await expect(num).toHaveAttribute('role', 'button')
  await expect(num).toHaveAttribute('aria-label', /: /)
  const range = num.locator('xpath=ancestor::*[count(.//input[@type="range"])=1][1]//input[@type="range"]')
  const v0 = await range.inputValue()
  const before = (await num.textContent())!.trim()

  // Escape forkaster
  await num.click()
  const field = page.locator('[data-num-input]')
  await expect(field).toBeFocused()
  await page.keyboard.type('3')
  await page.keyboard.press('Escape')
  await expect(field).toHaveCount(0)
  expect(await range.inputValue()).toBe(v0)
  await expect(num).toBeFocused()

  // ny verdi med Enter: innenfor grensene, slideren følger
  const [mn, mx] = await range.evaluate((r: HTMLInputElement) => [Number(r.min), Number(r.max)])
  const shownFactor = Number(before.replace(',', '.').replace(/[^\d.-]/g, '')) / Number(v0) || 1
  const target = Math.round(mn + (mx - mn) * 0.5)
  await num.press('Enter')
  await expect(field).toBeFocused()
  await page.keyboard.type(String(Math.round(target * (Number.isFinite(shownFactor) ? Math.pow(10, Math.round(Math.log10(Math.abs(shownFactor)))) : 1))).replace('.', ','))
  await page.keyboard.press('Enter')
  await expect.poll(async () => Math.abs(Number(await range.inputValue()) - target)).toBeLessThanOrEqual(Number(await range.getAttribute('step')) || 1)

  // ugyldig tekst: beskjed og verdien står
  const v1 = await range.inputValue()
  await num.click()
  await page.keyboard.type('abc')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: 'Skriv et tall' })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await range.inputValue()).toBe(v1)
})
