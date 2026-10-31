import { expect, test, type Page } from '@playwright/test'

/**
 * TB-2CD75B: slides flyttes med dra-og-slipp (innsettingsmarkør), tastatur og «Først/Sist». Ukedagen følger sliden,
 * og rekkefølgen overlever «Oppdater videoen», angre/gjør om og ny innlasting.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'dra-og-slipp og tastatur testes på PC'))

const PROGRAM = 'Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen'
const order = (page: Page) => page.locator('[data-loop-card]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)))
const titles = async (page: Page) => (await order(page)).map((t) => /BØNN|UNGDOM|KOR|SKRIV TEKSTEN/i.exec(t)?.[0].toUpperCase() ?? t)

async function setup(page: Page) {
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder(PROGRAM).fill('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(3)
  await page.waitForTimeout(900)
  // ny tekstslide (havner etter den valgte, dvs. etter mandag) – flyttes så til slutten for å ha noe å dra
  await page.getByRole('button', { name: /^Slides/ }).first().click()
  await page.locator('[data-loop-card]').first().locator('button').first().click()
  await page.getByRole('button', { name: '+ Tekst', exact: true }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(4)
  await page.getByRole('button', { name: 'Sist ⇥' }).click()
  await page.waitForTimeout(900)
  expect(await titles(page)).toEqual(['BØNN', 'UNGDOM', 'KOR', 'SKRIV TEKSTEN'])
}

test('dra-og-slipp: tekstslide mellom mandag og tirsdag; tirsdag forblir tirsdag; rekkefølgen overlever oppdatering og angre', async ({ page }) => {
  await setup(page)
  const cards = page.locator('[data-loop-card]')
  // dra den siste sliden til venstre halvdel av tirsdagskortet → innsettingsmarkør før tirsdag
  const tue = (await cards.nth(1).boundingBox())!
  await cards.nth(3).hover()
  await page.mouse.down()
  await page.mouse.move(tue.x + 20, tue.y + 40, { steps: 8 })
  await expect(page.locator('[data-loop-drop]')).toHaveCount(1)
  await page.mouse.up()
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'SKRIV TEKSTEN', 'UNGDOM', 'KOR'])
  await expect(page.locator('[data-loop-drop]')).toHaveCount(0)
  await expect(cards.nth(2)).toContainText(/Tirsdag/i)

  // angre og gjør om flyttingen (eget angre-steg; fokus utenfor tekstfelt)
  await page.waitForTimeout(900)
  await page.locator('[data-loop-canvas]').click()
  await page.keyboard.press('Control+z')
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'UNGDOM', 'KOR', 'SKRIV TEKSTEN'])
  await page.keyboard.press('Control+y')
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'SKRIV TEKSTEN', 'UNGDOM', 'KOR'])

  // «Oppdater videoen» igjen: rekkefølgen og ukedagene beholdes
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(900)
  expect(await titles(page)).toEqual(['BØNN', 'SKRIV TEKSTEN', 'UNGDOM', 'KOR'])
  await expect(cards.nth(2)).toContainText(/Tirsdag/i)

  // ny innlasting: rekkefølgen er lagret
  await page.waitForTimeout(3000)
  await page.reload()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'SKRIV TEKSTEN', 'UNGDOM', 'KOR'])
})

test('tastatur: Alt + piltast og Alt + Home/End flytter den valgte sliden', async ({ page }) => {
  await setup(page)
  const last = page.locator('[data-loop-card]').nth(3)
  await last.locator('button').first().focus()
  await page.keyboard.press('Alt+ArrowLeft')
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'UNGDOM', 'SKRIV TEKSTEN', 'KOR'])
  await page.locator('[data-loop-card]').nth(2).locator('button').first().focus()
  await page.keyboard.press('Alt+Home')
  await expect.poll(() => titles(page)).toEqual(['SKRIV TEKSTEN', 'BØNN', 'UNGDOM', 'KOR'])
  await page.locator('[data-loop-card]').nth(0).locator('button').first().focus()
  await page.keyboard.press('Alt+End')
  await expect.poll(() => titles(page)).toEqual(['BØNN', 'UNGDOM', 'KOR', 'SKRIV TEKSTEN'])
})
