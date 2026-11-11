/** Kontroll (laster ekte modeller, ikke i CI): bakgrunnsfjerning (Person/Objekt) kjører i AI-tråden og gir en maske. */
import { expect, test } from '@playwright/test'
import { png } from '../e2e/png'

test('Person og Objekt i AI-tråden', async ({ page }) => {
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/isolate-subject')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  // mørk sirkel midt på lys bakgrunn
  await (await ch).setFiles({ name: 'ting.png', mimeType: 'image/png', buffer: png(640, 480, (x, y) => (Math.hypot(x - 320, y - 240) < 140 ? [40, 60, 160, 255] : [235, 232, 225, 255])) })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  for (const kind of ['Objekt', 'Person']) {
    await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click()
    await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 300_000 })
    console.log('AI ' + kind + ' ok')
  }
  expect(errors).toEqual([])
})
