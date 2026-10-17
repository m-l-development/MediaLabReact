import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'

/* Loop Studio: vignettdialogen (L-4), utsnitt og beskjæring av bakgrunnsbilde (L-5) og lydknappen ved avspilling (L-6). */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'Testes på PC'))

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}
async function openWeek(page: Page) {
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
}
/** Programmet gir slidene. */
async function addProgram(page: Page) {
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(500)
}
/** Fingeravtrykk av et lerret (grovt rutenett av farger), for å se om noe er tegnet annerledes. */
const print = (l: Locator) => l.evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d')
  if (!g) return ''
  const out: number[] = []
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) {
    const d = g.getImageData(Math.floor((c.width * x) / 8), Math.floor((c.height * y) / 8), 1, 1).data
    out.push(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0)
  }
  return out.join(',')
})
async function drag(page: Page, el: Locator, dx: number, dy: number, from = { x: 0.5, y: 0.5 }) {
  const b = await el.boundingBox()
  if (!b) throw new Error('fant ikke elementet')
  const x = b.x + b.width * from.x, y = b.y + b.height * from.y
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 })
  await page.mouse.move(x + dx, y + dy, { steps: 5 })
  await page.mouse.up()
}

test('L-4 vignettdialogen: dra punktet, styrke, ekstra vignett, og innstillingene huskes', async ({ page }) => {
  const errors = await errorsOf(page)
  await openWeek(page)
  // uten slides: forklaring i stedet for at ingenting skjer
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await page.getByRole('button', { name: /Rediger vignett for alle slides/ }).click()
  await expect(page.getByText(/Legg til minst én slide først/)).toBeVisible()
  await addProgram(page)
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await page.getByRole('button', { name: /Rediger vignett for alle slides/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Rediger vignett' })
  await expect(dlg).toBeVisible()
  const area = dlg.locator('[data-loop-viged]')
  const canvas = area.locator('canvas')
  await page.waitForTimeout(400)
  const before = await print(canvas)
  await drag(page, area, -120, 60, { x: 0.66, y: 0.4 })
  await page.waitForTimeout(300)
  const moved = await print(canvas)
  expect(moved).not.toBe(before)

  const strength = dlg.getByRole('slider', { name: 'Styrke' })
  await strength.fill('40')
  await page.waitForTimeout(300)
  expect(await print(canvas)).not.toBe(moved)

  await dlg.getByRole('button', { name: '+ Legg til vignett' }).click()
  await expect(dlg.getByRole('button', { name: 'Vignett 2' })).toBeVisible()
  await dlg.getByRole('button', { name: 'Ferdig' }).click()
  await expect(dlg).toBeHidden()

  // åpnes igjen: samme innstillinger
  await page.getByRole('button', { name: /Rediger vignett for alle slides/ }).click()
  await expect(dlg.getByRole('slider', { name: 'Styrke' })).toHaveValue('40')
  await expect(dlg.getByRole('button', { name: 'Vignett 2' })).toBeVisible()
  await dlg.getByRole('button', { name: 'Ferdig' }).click()
  expect(errors).toEqual([])
})

test('L-5 bakgrunnsbilde: beskjæringsdialog ved valg, og «Beskjær / flytt bilde» flytter utsnittet', async ({ page }) => {
  const errors = await errorsOf(page)
  await openWeek(page)
  await addProgram(page)
  await page.getByRole('button', { name: 'Slides', exact: true }).click()
  // venstre halvdel rød, høyre halvdel blå (bredere enn 16:9, så utsnittet kan flyttes sideveis)
  const img = png(1200, 400, (x) => (x < 600 ? [220, 30, 30, 255] : [30, 60, 220, 255]))
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]').click()
  await (await chooser).setFiles({ name: 'rod-bla.png', mimeType: 'image/png', buffer: img })
  const crop = page.getByRole('dialog').filter({ has: page.locator('[data-loop-cropbox]') })
  await expect(crop).toBeVisible()
  await crop.getByRole('button', { name: 'Bruk hele bildet' }).click()
  await expect(crop).toBeHidden()
  const canvas = page.locator('[data-loop-canvas]')
  await page.waitForTimeout(600)
  const before = await print(canvas)

  await page.getByRole('button', { name: 'Beskjær / flytt bilde' }).click()
  const ed = page.getByRole('dialog', { name: 'Rediger bilde' })
  await expect(ed).toBeVisible()
  await ed.getByRole('button', { name: 'Flytt utsnitt' }).first().click()
  const frame = ed.locator('[data-loop-panframe]')
  await expect(frame).toBeVisible()
  await drag(page, frame, -400, 0)
  await ed.getByRole('button', { name: 'Ferdig' }).click()
  await expect(ed).toBeHidden()
  await page.waitForTimeout(600)
  expect(await print(canvas)).not.toBe(before)
  expect(errors).toEqual([])
})

test('L-6 lydknappen: uten musikk til Stil, med musikk demp og slå på', async ({ page }) => {
  const errors = await errorsOf(page)
  await openWeek(page)
  const btn = page.getByRole('button', { name: /Ingen musikk ennå/ })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(page.getByRole('button', { name: 'Velg lyd…' })).toBeVisible()

  // en kort lydfil (WAV, 1 s tone) som musikk
  const rate = 8000, n = rate, wav = Buffer.alloc(44 + n * 2)
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 8000), 44 + i * 2)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg lyd…' }).click()
  await (await chooser).setFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: wav })

  const mute = page.getByRole('button', { name: 'Demp lyd i forhåndsvisningen' }).first()
  await expect(mute).toBeVisible({ timeout: 15_000 })
  await mute.click()
  const unmute = page.getByRole('button', { name: 'Slå på lyd i forhåndsvisningen' }).first()
  await expect(unmute).toBeVisible()
  await unmute.click()
  await expect(page.getByRole('button', { name: 'Demp lyd i forhåndsvisningen' }).first()).toBeVisible()
  expect(errors).toEqual([])
})
