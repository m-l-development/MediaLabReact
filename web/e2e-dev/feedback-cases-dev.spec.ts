import { expect, test, type Page } from '@playwright/test'
import { check } from '../e2e/theme-scan'

/**
 * De sju tilbakemeldingssakene i Dev (produksjonsbygg), innlogget med den syntetiske testkontoen. Kontrollerer
 * brukerflytene direkte: Thumbnail Studio (fri plassering, piltaster), Motion Design (nedtelling 20 min følger bakgrunnen,
 * deling fortsetter), Loop Studio (dra-og-slipp mellom dager), Photo Design (lys modus overalt, kategorier) .
 * Admin-merkene (TB-95F738) og Mockups-innlastingen (TB-4416C4) har egne Dev-tester. Testprosjekt i Photo slettes.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
  const v = (await page.evaluate(async () => (await (await fetch('/app/version.json', { cache: 'no-store' })).json()) as { v: string })).v.slice(0, 7)
  console.log(`[saker-dev] Dev-versjon: ${v}`)
}

test('TB-2D9264 Thumbnail Studio: snapping av, fri plassering og piltaster (1 px / 10 px)', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.evaluate(() => localStorage.setItem('medialab.snap', '0'))
  await page.reload()
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  const sel = page.locator('[data-ts-sel]')
  const cv = page.locator('[data-ts-overlay]')
  await expect(page.locator('[data-snap-toggle]')).toHaveAttribute('aria-pressed', 'false')
  const b = (await sel.boundingBox())!
  const c = (await cv.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(c.x + c.width / 2 + 7, b.y + b.height / 2 + 23, { steps: 8 })
  await page.mouse.up()
  const a = (await sel.boundingBox())!
  expect(Math.abs(a.x + b.width / 2 - (c.x + c.width / 2) - 7), 'ikke festet til midtlinjen').toBeLessThan(1.5)
  const k = c.width / 1920
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  const a2 = (await sel.boundingBox())!
  expect(Math.abs(a2.x - a.x - 5 * k)).toBeLessThan(0.6)
  expect(Math.abs(a2.y - a.y - 10 * k)).toBeLessThan(0.6)
  console.log('[saker-dev] TB-2D9264: fri plassering og piltaster OK')
})

test('TB-EB63E9 Motion Design: nedtelling 20 min følger bakgrunnen; deling fortsetter nedtellingen', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="count"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  const props = page.locator('[data-md-props]')
  const field = (l: string) => props.locator('label', { hasText: new RegExp(`^${l}`) }).locator('input').first()
  const texts = page.locator('[data-row="text"] [data-block="text"]')
  for (let i = 0; i < 2; i++) {
    await texts.nth(i).click()
    if (await field('Minutter').count()) break
  }
  for (const [l, v] of [['Minutter', '20'], ['Sekunder', '0']] as const) {
    await field(l).fill(v)
    await field(l).press('Enter')
  }
  await expect(page.locator('[data-md-time]')).toContainText('20:00')
  await page.locator('[data-adv-toggle]').click()
  await page.locator('[data-row="video"] [data-block="clip"]').first().click()
  expect(Number(await page.locator('[data-md-timing] [data-md-tm="dur"]').inputValue()), 'bakgrunnen følger').toBeCloseTo(1200, 1)
  // del nedtellingen ved 1 min: andre del fortsetter fra 19:00
  for (let i = 0; i < 2; i++) {
    await texts.nth(i).click()
    if (await field('Minutter').count()) break
  }
  await page.locator('[data-md-tc]').click()
  await page.keyboard.press('Home')
  for (let i = 0; i < 60; i++) await page.keyboard.press('Shift+ArrowRight')
  for (let i = 0; i < 2; i++) {
    await texts.nth(i).click()
    if (await field('Minutter').count()) break
  }
  await page.keyboard.press('s')
  await expect(texts).toHaveCount(3)
  expect(Number(await field('Minutter').inputValue()) * 60 + Number(await field('Sekunder').inputValue()), 'andre del: 19:00').toBe(1140)
  console.log('[saker-dev] TB-EB63E9: 20 min følger bakgrunnen, delt nedtelling fortsetter OK')
})

test('TB-2CD75B Loop Studio: slide mellom mandag og tirsdag; tirsdag forblir tirsdag', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  const cards = page.locator('[data-loop-card]')
  await expect(cards).toHaveCount(3)
  const day = () => cards.evaluateAll((els) => els.map((e) => /MANDAG|TIRSDAG|ONSDAG/i.exec(e.textContent ?? '')?.[0]?.toUpperCase() ?? '?'))
  // onsdag mellom mandag og tirsdag
  const tue = (await cards.nth(1).boundingBox())!
  await cards.nth(2).hover()
  await page.mouse.down()
  await page.mouse.move(tue.x + 20, tue.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect.poll(day).toEqual(['MANDAG', 'ONSDAG', 'TIRSDAG'])
  console.log('[saker-dev] TB-2CD75B: dra-og-slipp mellom dager, dagene følger slidene OK')
})

/** Sletter alle «Dev-kat …»-prosjekter på testkontoen (også fra tidligere kjøringer). Dialogene godtas av testens håndtering. */
async function cleanupPhoto(page: Page) {
  const all = page.locator('[data-pd-projects] [data-pd-projcat="*"]')
  if (await all.count()) await all.click()
  const cards = page.locator('[data-pd-projects] [data-project^="Dev-kat "]')
  let n = 0
  for (let i = 0; i < 10 && (await cards.count()); i++) {
    const before = await cards.count()
    await cards.first().getByRole('button', { name: 'Slett prosjekt' }).click()
    await expect(cards).toHaveCount(before - 1, { timeout: 15_000 })
    n++
  }
  console.log(`[saker-dev] opprydding: ${n} Dev-kat-prosjekt(er) slettet`)
}

test('TB-905D74 og TB-8E2793 Photo Design: lys modus overalt, kategorier for prosjekter', async ({ page }) => {
  // én håndtering av nettleserens dialoger: navn fra køen, bekreftelser godtas
  const queue: string[] = []
  page.on('dialog', (d) => void (d.type() === 'prompt' ? d.accept(queue.shift() ?? '') : d.accept()))
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => localStorage.setItem('medialab.theme', 'light'))
  await page.goto('/app/photo-design')
  await page.reload()
  await expect(page.locator('[data-tpl="photo"]')).toBeVisible({ timeout: 30_000 })
  await cleanupPhoto(page)
  const problems: string[] = []
  await check(page, 'startside', problems)
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await check(page, 'editor', problems)
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await check(page, 'stil', problems)
  console.log(`[saker-dev] TB-905D74 funn: ${problems.join(' | ') || '(ingen)'}`)
  expect(problems).toEqual([])

  // kategori: nytt prosjekt i en ny kategori, vises under kategorien på startsiden; slettes til slutt
  const name = `Dev-kat ${Date.now()}`
  await page.getByLabel('Prosjektnavn').fill(name)
  queue.push('Dev-test-kategori')
  await page.getByRole('button', { name: 'Ny kategori for prosjektet' }).click()
  await expect(page.locator('[data-pd-doc-cat]')).toHaveValue('Dev-test-kategori')
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText(/^Lagret/).first()).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  const card = page.locator(`[data-pd-projects] [data-project="${name}"]`)
  try {
    await page.locator('[data-pd-projects] [data-pd-projcat="Dev-test-kategori"]').click()
    await expect(card).toBeVisible()
    await expect(card.locator('[data-pd-proj-cat]')).toHaveValue('Dev-test-kategori')
    console.log('[saker-dev] TB-8E2793: prosjekt i ny kategori, filter OK')
  } finally {
    await cleanupPhoto(page)
    await expect(card).toHaveCount(0)
  }
})
