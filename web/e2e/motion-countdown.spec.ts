import { expect, test, type Page } from '@playwright/test'
import { center, importFiles, insp, main, recordVideo, saveAndReload, tc } from './motion-helpers'

/**
 * TB-EB63E9 (Motion Design): nedtelling på 20 minutter der bakgrunnen og teksten «Starter om» automatisk får samme
 * lengde; nedtellingen deles og en video settes inn mellom delene (andre del fortsetter der første slapp); nedtellingen
 * som overlegg i et hjørne mens videoen spiller; «Til prosjektslutt»; høyreklikkmeny; modusbytte og lagring.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

const props = (page: Page) => page.locator('[data-md-props]')
const texts = (page: Page) => page.locator('[data-row="text"] [data-block="text"]')
const tm = (page: Page, k: string) => page.locator(`[data-md-timing] [data-md-tm="${k}"]`)
const num = async (page: Page, k: string) => Number(await tm(page, k).inputValue())
const hms = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, Math.floor(s % 60)].map((v) => String(v).padStart(2, '0')).join(':')
/** Spillehodet i sekunder (tidskoden tt:mm:ss:bilde, 30 bilder per sekund). */
const now = async (page: Page) => {
  const [h, m, s, f] = ((await tc(page).textContent()) ?? '').split(':').map(Number)
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0) + (f ?? 0) / 30
}
/** Spillehodet til omtrent `sec`: visningsstart dit, og klikk ved venstre kant av linjalen. */
async function seekAbs(page: Page, sec: number) {
  const v = page.locator('[data-md-field="view"]')
  await v.fill(hms(sec))
  await v.press('Enter')
  // linjalen ligger i det rullede området: klikk rett til høyre for spornavnene (venstre kant av det som vises)
  const r = (await page.locator('[data-md-ruler]').boundingBox())!
  const h = (await page.locator('[class*="headRuler"]').boundingBox())!
  await page.mouse.click(Math.max(r.x, h.x + h.width) + 2, r.y + r.height / 2)
  await expect.poll(() => now(page)).toBeGreaterThanOrEqual(sec)
  return now(page)
}
/** Nedtellingens startverdi slik feltene viser den (minutter og sekunder). */
async function cdShown(page: Page) {
  const v = async (l: string) => Number(await props(page).locator('label', { hasText: new RegExp(`^${l}`) }).locator('input').first().inputValue())
  return (await v('Timer')) * 3600 + (await v('Minutter')) * 60 + (await v('Sekunder'))
}
async function setCd(page: Page, label: string, v: string) {
  const inp = props(page).locator('label', { hasText: new RegExp(`^${label}`) }).locator('input').first()
  await inp.fill(v)
  await inp.press('Enter')
  await inp.blur()
}
/** Velger tekstblokken som er nedtellingen (feltet «Minutter» vises). */
async function pickCountdown(page: Page, nth = 0) {
  const n = await texts(page).count()
  let hit = 0
  for (let i = 0; i < n; i++) {
    await texts(page).nth(i).click()
    if (await props(page).locator('label', { hasText: /^Minutter/ }).count()) {
      if (hit === nth) return
      hit++
    }
  }
  throw new Error('fant ikke nedtellingen')
}

test('nedtelling 20 min: bakgrunn følger, delt med video imellom, hjørne over video, lagring', async ({ page }) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="count"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()

  // Standard: nedtellingen settes til 20 minutter – tekstene og bakgrunnen følger med
  await pickCountdown(page)
  await setCd(page, 'Minutter', '20')
  await setCd(page, 'Sekunder', '0')
  expect(await cdShown(page)).toBe(1200)
  await expect(page.locator('[data-md-time]')).toContainText('20:00')

  // Avansert: alle tre varer 20 minutter
  await page.locator('[data-adv-toggle]').click()
  await main(page).first().click()
  expect(await num(page, 'dur'), 'bakgrunnen i V1').toBeCloseTo(1200, 1)
  for (let i = 0; i < 2; i++) {
    await texts(page).nth(i).click()
    expect(await num(page, 'dur'), `tekst ${i + 1}`).toBeCloseTo(1200, 1)
  }

  // video inn mellom delene ved 5 minutter: bakgrunnen deles, videoen settes inn etter første del
  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid], 1)
  const t = await seekAbs(page, 300)
  await main(page).first().click()
  await page.keyboard.press('s')
  await expect(main(page)).toHaveCount(2)
  await main(page).first().click()
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await expect(main(page)).toHaveCount(3)
  await main(page).nth(1).click()
  const vd = await num(page, 'dur')
  expect(vd).toBeGreaterThan(2)

  // nedtellingen deles ved samme tid (S); andre del flyttes til etter videoen og fortsetter der første slapp
  await pickCountdown(page)
  await page.keyboard.press('s')
  const s2 = await num(page, 'start')
  expect(Math.abs(s2 - t)).toBeLessThan(0.05)
  expect(Math.abs((await cdShown(page)) - (1200 - s2)), 'andre del fortsetter (starter ikke på 20:00)').toBeLessThanOrEqual(1)
  await tm(page, 'start').fill(String(Math.round((t + vd) * 100) / 100))
  await tm(page, 'start').blur()
  const second = await cdShown(page)
  // første del beholder 20:00
  await pickCountdown(page, 0)
  expect(await cdShown(page)).toBe(1200)
  expect(second).toBeLessThan(1200)

  // under videoen: videoens farge midt i bildet (nedtellingen står stille mellom delene)
  await seekAbs(page, Math.ceil(t) + 1)
  // (bakgrunnen er nesten svart; videoen er mettet rød, grønn eller blå)
  await expect.poll(async () => { const c = await center(page); return Math.max(...c) > 150 && Math.min(...c) < 90 }, { message: 'videoen vises mellom delene' }).toBe(true)

  // nedtellingen som overlegg i hjørnet mens videoen spiller: andre del flyttes inn over videoen, øverst til høyre
  await pickCountdown(page, 1)
  await tm(page, 'start').fill(String(Math.round(t * 100) / 100))
  await tm(page, 'start').blur()
  await page.locator('[data-md-place="tr"]').click()
  await props(page).locator('label', { hasText: /^Størrelse/ }).locator('input[type="range"]').fill('90')
  await seekAbs(page, Math.ceil(t) + 1)
  const corner = await page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext('2d') as CanvasRenderingContext2D
    const d = g.getImageData(Math.floor(c.width * 0.6), 0, Math.floor(c.width * 0.4), Math.floor(c.height * 0.25)).data
    let white = 0
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 220 && d[i + 1]! > 220 && d[i + 2]! > 220) white++
    const m = g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data
    return { white, mid: [m[0], m[1], m[2]] }
  })
  expect(corner.white, 'hvite tall i hjørnet').toBeGreaterThan(50)
  expect(Math.max(...(corner.mid as number[])) > 150 && Math.min(...(corner.mid as number[])) < 90, 'videoen midt i bildet').toBe(true)

  // høyreklikk på nedtellingen: kontekstmeny med del
  await texts(page).last().click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: /Del ved spillehodet/ })).toBeVisible()
  await page.keyboard.press('Escape')

  // «Til prosjektslutt» (prosjektvarighet 21:00): siste bakgrunnsdel forlenges
  await page.locator('[data-md-field="dur"]').fill('00:21:00')
  await page.locator('[data-md-field="dur"]').press('Enter')
  await main(page).last().click()
  await page.locator('[data-md-act="to-end"]').click()
  await expect.poll(async () => Math.abs((await num(page, 'start')) + (await num(page, 'dur')) - 1260)).toBeLessThan(0.05)

  // modusbytte og lagring: alt står
  await page.locator('[data-adv-toggle]').click()
  await expect(texts(page)).toHaveCount(3)
  await page.locator('[data-adv-toggle]').click()
  await saveAndReload(page)
  await expect(main(page)).toHaveCount(3)
  await pickCountdown(page, 1)
  expect(await cdShown(page)).toBe(second)
  await insp(page, 'clip')
  expect(errors).toEqual([])
})
