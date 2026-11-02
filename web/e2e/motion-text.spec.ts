import { expect, test, type Page } from '@playwright/test'
import { leftTab, newAdvProject, saveAndReload, seekTo } from './motion-helpers'

/** Motion Design → Avansert: tekst og undertekster som tidslinjeelementer (tid, plassering, lag, lagring). */

/** Antall piksler (av et rutenett) som er «rødt» eller «blått», og tyngdepunktet deres (0–1). */
const stats = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const d = g.getImageData(0, 0, c.width, c.height).data
  const out = { red: 0, blue: 0, white: 0, rx: 0, ry: 0, wy: 0 }
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
    const i = (y * c.width + x) * 4
    const r = d[i] ?? 0, gg = d[i + 1] ?? 0, b = d[i + 2] ?? 0
    if (r > 180 && gg < 80 && b < 80) { out.red++; out.rx += x / c.width; out.ry += y / c.height }
    else if (b > 180 && r < 80 && gg < 80) out.blue++
    else if (r > 200 && gg > 200 && b > 200) { out.white++; out.wy += y / c.height }
  }
  if (out.red) { out.rx /= out.red; out.ry /= out.red }
  if (out.white) out.wy /= out.white
  return out
})

const insp = (page: Page) => page.locator('[data-md-props]')
const blocks = (page: Page) => page.locator('[data-row="text"] [data-block="text"]')

async function styleText(page: Page, color: string) {
  await insp(page).getByLabel('Tekstfarge').fill(color)
  await insp(page).getByRole('slider', { name: 'Størrelse' }).fill('260')
  const anim = insp(page).getByLabel('Animasjon')
  if (await anim.count()) await anim.selectOption('none')
}

test('tekst og undertekster: tid, plassering, lagrekkefølge og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)

  // tekst fra 2 s (4 s lang) på T1, rød og stor, uten animasjon
  await seekTo(page, 2)
  // fanen Tekst i venstre panel
  await leftTab(page, 'text')
  await page.locator('[data-md-add-text]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('T1')
  await expect(page.locator('[data-md-timing] [data-md-tm="start"]')).toHaveValue('2.00')
  await styleText(page, '#ff0000')

  // vises bare innenfor sitt tidsrom
  await seekTo(page, 1)
  await expect.poll(async () => (await stats(page)).red, { message: 'før teksten: ingenting' }).toBe(0)
  await seekTo(page, 3)
  await expect.poll(async () => (await stats(page)).red, { message: 'teksten vises' }).toBeGreaterThan(50)
  await seekTo(page, 7)
  await expect.poll(async () => (await stats(page)).red, { message: 'etter teksten: ingenting' }).toBe(0)

  // plassering: øverst til venstre og nederst til høyre
  await seekTo(page, 3)
  await blocks(page).first().click()
  await page.locator('[data-md-place="tl"]').click()
  await expect(page.locator('[data-md-place="tl"]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => { const s = await stats(page); return s.rx < 0.45 && s.ry < 0.4 }, { message: 'øverst til venstre' }).toBe(true)
  await page.locator('[data-md-place="br"]').click()
  await expect.poll(async () => { const s = await stats(page); return s.rx > 0.55 && s.ry > 0.6 }, { message: 'nederst til høyre' }).toBe(true)
  await page.locator('[data-md-place="mc"]').click()

  // ny tekst samtidig (blå, samme sted) havner på T2 – T1 ligger øverst
  await seekTo(page, 2)
  await page.locator('[data-md-add-text]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('T2')
  await styleText(page, '#0000ff')
  await page.locator('[data-md-place="mc"]').click()
  await seekTo(page, 3)
  await expect.poll(async () => { const s = await stats(page); return s.red > s.blue }, { message: 'T1 (rød) ligger over T2 (blå)' }).toBe(true)
  // flytt den blå til sporet over (Alt+↑): nå ligger blått øverst
  await blocks(page).nth(1).click()
  await page.keyboard.press('Alt+ArrowUp')
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('T1')
  await expect.poll(async () => { const s = await stats(page); return s.blue > s.red }, { message: 'blå øverst etter flytting' }).toBe(true)

  // undertekst fra 8 s (2,5 s), nederst i bildet, bare i sitt tidsrom
  await seekTo(page, 8)
  await leftTab(page, 'subs')
  await page.locator('[data-md-add-sub]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('UT')
  await expect(page.locator('[data-md-timing] [data-md-tm="start"]')).toHaveValue('8.00')
  await expect(page.locator('[data-md-timing] [data-md-tm="dur"]')).toHaveValue('2.50')
  await seekTo(page, 9)
  await expect.poll(async () => { const s = await stats(page); return s.white > 10 && s.wy > 0.7 }, { message: 'undertekst nederst' }).toBe(true)
  await seekTo(page, 11)
  await expect.poll(async () => (await stats(page)).white, { message: 'etter underteksten: ingenting' }).toBe(0)

  // lagring: begge tekstene, rekkefølgen og underteksten står
  await saveAndReload(page)
  await expect(blocks(page)).toHaveCount(2)
  await expect(page.locator('[data-row="subs"] [data-block="sub"]')).toHaveCount(1)
  await seekTo(page, 3)
  await expect.poll(async () => { const s = await stats(page); return s.blue > s.red }, { message: 'rekkefølgen er lagret' }).toBe(true)
  expect(errors).toEqual([])
})
