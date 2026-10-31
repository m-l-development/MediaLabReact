import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/** Motion Design → Avansert: mediebibliotek, spor, plassering, flytting, trim, deling, sletting, forhåndsvisning og lagring. */

/** Enkel WAV (mono, 8 kHz, 16 bit) med en sinustone. */
function wav(sec: number): Buffer {
  const rate = 8000
  const n = Math.round(rate * sec)
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 8000), 44 + i * 2)
  return b
}

/** Fargen midt i forhåndsvisningen. */
const center = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const d = g.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]
})
const isColor = (c: number[], k: 0 | 1 | 2) => (c[k] ?? 0) > 150 && c.every((v, i) => i === k || v < 90)

const main = (page: Page) => page.locator('[data-row="video"] [data-block="clip"]')
const tc = (page: Page) => page.locator('[data-md-tc]')

/** Spillehodet til `sec` (Home + Shift+→ per sekund). */
async function seekTo(page: Page, sec: number) {
  await tc(page).click()
  await page.keyboard.press('Home')
  for (let i = 0; i < sec; i++) await page.keyboard.press('Shift+ArrowRight')
  await expect(tc(page)).toHaveText(`00:00:${String(sec).padStart(2, '0')}:00`)
}

test('Avansert tidslinje: import, spor, flytt, trim, del, slett, forhåndsvisning og lagring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'tidslinjen redigeres på PC; mobil har egen test')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await expect(page.locator('[data-md-bin]')).toHaveCount(0)
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-bin]')).toBeVisible()
  await expect(page.locator('[data-md-lane="V1 · Hoved"]')).toBeVisible()

  // mediebibliotek: flere filer på én gang, også en som ikke kan brukes
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([
    { name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) },
    { name: 'blaa.png', mimeType: 'image/png', buffer: png(160, 90, () => [20, 40, 230, 255]) },
    { name: 'gronn.png', mimeType: 'image/png', buffer: png(160, 90, () => [20, 210, 40, 255]) },
    { name: 'lyd.wav', mimeType: 'audio/wav', buffer: wav(2) },
    { name: 'notat.txt', mimeType: 'text/plain', buffer: Buffer.from('ikke media') },
  ])
  await expect(page.locator('[data-md-bin-item]')).toHaveCount(4, { timeout: 20_000 })
  await expect(page.locator('[data-md-bin-err]')).toContainText('notat.txt')
  await expect(page.locator('[data-md-bin-err]')).toContainText('Formatet støttes ikke')
  await expect(page.locator('[data-md-bin-item="rod.png"] [data-md-bin-meta]')).toHaveText('Bilde · ingen varighet · 160×90')
  await expect(page.locator('[data-md-bin-item="lyd.wav"] [data-md-bin-meta]')).toHaveText('Lyd · 00:00:02:00')

  // V1: rød og blå etter hverandre (4 s hver, toning 0,5 s)
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await page.locator('[data-md-bin-item="blaa.png"] [data-md-to="v1"]').click()
  await expect(main(page)).toHaveCount(2)
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('V1')
  await seekTo(page, 2)
  await expect.poll(async () => isColor(await center(page), 0)).toBe(true)
  await seekTo(page, 5)
  await expect.poll(async () => isColor(await center(page), 2)).toBe(true)

  // nytt videospor øverst ved spillehodet: dekker V1 (sporprioritet)
  await page.locator('[data-md-bin-item="gronn.png"] [data-md-to="v"]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('V2')
  await expect(page.locator('[data-md-timing] [data-md-tm="start"]')).toHaveValue('5.00')
  await expect.poll(async () => isColor(await center(page), 1)).toBe(true)
  // flytt i tid (nøyaktig start) og trim slutten til spillehodet (W)
  await page.locator('[data-md-timing] [data-md-tm="start"]').fill('2')
  await expect(page.locator('[data-md-timing] [data-md-tm="end"]')).toHaveText('6.00')
  await tc(page).click()
  await page.keyboard.press('w')
  await expect(page.locator('[data-md-timing] [data-md-tm="dur"]')).toHaveValue('3.00')
  await expect(page.locator('[data-md-timing] [data-md-tm="end"]')).toHaveText('5.00')
  await expect.poll(async () => isColor(await center(page), 2), { message: 'V2 er trimmet til 5 s: V1 (blå) vises' }).toBe(true)
  await seekTo(page, 4)
  await expect.poll(async () => isColor(await center(page), 1), { message: 'innenfor V2: grønn' }).toBe(true)

  // lydspor ved spillehodet
  await page.locator('[data-md-bin-item="lyd.wav"] [data-md-to="a"]').click()
  await expect(page.locator('[data-row="music"] [data-block="music"]')).toHaveCount(1)
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('A1')
  await expect(page.locator('[data-md-timing] [data-md-tm="start"]')).toHaveValue('4.00')

  // del det blå klippet ved 6 s, slett den nye delen, angre og gjør om
  await seekTo(page, 6)
  await main(page).nth(1).click({ position: { x: 8, y: 30 } })
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('V1')
  await page.keyboard.press('s')
  await expect(main(page)).toHaveCount(3)
  await page.keyboard.press('Delete')
  await expect(main(page)).toHaveCount(2)
  await page.keyboard.press('Control+z')
  await expect(main(page)).toHaveCount(3)

  // flytt i V1 med musa: rødt klipp dras bak det blå (ny rekkefølge i prosjektet)
  await page.locator('[data-md-fit]').click()
  const a = await main(page).nth(0).boundingBox()
  const b = await main(page).nth(1).boundingBox()
  if (!a || !b) throw new Error('klippene mangler')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width - 4, a.y + a.height / 2, { steps: 12 })
  await page.mouse.up()
  console.log('REKKEFØLGE', await main(page).allInnerTexts(), JSON.stringify(a), JSON.stringify(b), JSON.stringify(await page.locator('[data-md-canvas]').boundingBox()))
  await seekTo(page, 1)
  await expect.poll(async () => isColor(await center(page), 2), { message: 'blått klipp først etter flytting' }).toBe(true)

  // lagre, last inn på nytt: spor, tider og rekkefølge er bevart
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  // etter omlasting åpnes prosjektet direkte igjen (adressen husker det)
  await page.reload()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await expect(main(page)).toHaveCount(3)
  await expect(page.locator('[data-row="ov"] [data-block="ov"]')).toHaveCount(1)
  await expect(page.locator('[data-row="music"] [data-block="music"]')).toHaveCount(1)
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await expect(page.locator('[data-md-timing] [data-md-tm="start"]')).toHaveValue('2.00')
  await expect(page.locator('[data-md-timing] [data-md-tm="dur"]')).toHaveValue('3.00')
  await seekTo(page, 1)
  await expect.poll(async () => isColor(await center(page), 2)).toBe(true)

  // tilbake til Standard: ingen avanserte kontroller, men alle data er der
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-bin]')).toHaveCount(0)
  await expect(page.locator('[data-md-timing]')).toHaveCount(0)
  await expect(page.locator('[data-md-tc]')).toHaveCount(0)
  await expect(main(page)).toHaveCount(3)
  await expect(page.locator('[data-row="ov"] [data-block="ov"]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('Avansert på mobil: mediebibliotek og tidslinje uten vannrett rulling', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'mobilvisningen')
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="story"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-tc]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})
