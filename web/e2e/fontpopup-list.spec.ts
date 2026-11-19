import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'

/**
 * Fontpopupen (Thumbnail Studio): fontlisten viser tre fonter om gangen (før ~12 px, bare «Archivo» synlig) og kan
 * rulles til bunnen; verktøylinjen, fanene, søket og filtrene står fast over. Tekstboksen i panelet dekkes ikke
 * på PC (ved siden av feltet). Mobil: øverst på skjermen (ikke plass til både tekstboksen og popupen). PC: popupen flyttes ved å dra i fanelinjen.
 */
async function openPicker(page: Page) {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await dock(page, 'add')
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
  await dock(page, 'edit')
  await page.locator('.fp-trigger').first().click()
  await expect(page.locator('.fp-pop')).toBeVisible()
}

const state = (page: Page) => page.evaluate(() => {
  const pop = document.querySelector('.fp-pop')!.getBoundingClientRect()
  const list = document.querySelector('.fp-list')!.getBoundingClientRect()
  const inPop = (s: string) => { const b = document.querySelector(s)!.getBoundingClientRect(); return b.top >= pop.top - 1 && b.bottom <= pop.bottom + 1 }
  const rows = [...document.querySelectorAll('.fp-list .fp-row')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= list.top - 1 && b.bottom <= list.bottom + 1 }).length
  const ta = [...document.querySelectorAll('textarea')].find((t) => t.offsetParent && !t.closest('.fp-pop'))
  const tb = ta?.getBoundingClientRect()
  const covered = tb ? !!document.elementFromPoint(tb.left + tb.width / 2, tb.top + 20)?.closest('.fp-pop') : null
  return { rows, covered, fixed: ['.fp-top', '.fp-head', '.fp-search', '.fp-seg', '.fp-cats', '.fp-foot'].every(inPop), left: pop.left, top: pop.top }
})

for (const [w, h] of [[1280, 640], [1440, 900]] as const) {
  test(`tre fonter synlige, tekstboksen ikke dekket, flytting med musen (${w}×${h})`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC-størrelser; mobil testes under')
    await page.setViewportSize({ width: w, height: h })
    await openPicker(page)
    await expect.poll(async () => (await state(page)).rows).toBe(3)
    const s0 = await state(page)
    expect(s0).toMatchObject({ rows: 3, covered: false, fixed: true })
    // rulling i listen: fortsatt tre, verktøylinjen står fast, og listen når bunnen
    await page.locator('.fp-list').evaluate((e) => { e.scrollTop = 65 * 7 })
    expect(await state(page)).toMatchObject({ rows: 3, fixed: true })
    await page.locator('.fp-list').evaluate((e) => { e.scrollTop = e.scrollHeight })
    await expect(page.locator('.fp-list .fp-row').last()).toBeInViewport()
    // dra i fanelinjen (ikke i knappene): popupen flytter seg
    const head = (await page.locator('.fp-pop .fp-head').boundingBox())!
    await page.mouse.move(head.x + head.width - 70, head.y + head.height / 2)
    await page.mouse.down()
    await page.mouse.move(head.x + head.width - 170, head.y + head.height / 2 + 40, { steps: 6 })
    await page.mouse.up()
    const s1 = await state(page)
    expect(Math.round(s0.left - s1.left)).toBe(100)
    expect(Math.round(s1.top - s0.top)).toBe(40)
  })
}

test('mobil og PC: åpnes med toppen synlig og tre fonter; søk og kategorier virker', async ({ page }) => {
  await openPicker(page)
  await expect.poll(async () => (await state(page)).rows).toBe(3)
  const s = await state(page)
  expect(s).toMatchObject({ rows: 3, fixed: true })
  await page.getByPlaceholder(/Søk/).fill('bebas')
  await expect(page.locator('.fp-list .fp-row', { hasText: /Bebas/i }).first()).toBeVisible()
  await page.getByPlaceholder(/Søk/).fill('')
  await page.locator('.fp-cats button', { hasText: /^Skilt/ }).click()
  await expect(page.locator('.fp-cats button.on', { hasText: /^Skilt/ })).toBeVisible()
  expect(await page.locator('.fp-list .fp-row').count()).toBeGreaterThan(0)
})
