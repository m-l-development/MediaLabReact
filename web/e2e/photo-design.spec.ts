import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function size(page: Page, file: string): Promise<{ w: number; h: number; red: number }> {
  const b64 = fs.readFileSync(file).toString('base64')
  const kind = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
  return page.evaluate(async ({ data, mime }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:${mime};base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 64) if ((d[i] ?? 0) > 180 && (d[i + 1] ?? 0) < 80 && (d[i + 2] ?? 0) < 80) n++
    return { w: bmp.width, h: bmp.height, red: n / (d.length / 64) }
  }, { data: b64, mime: kind })
}

test('startsiden: formater, de 19 malene og sikkerhetskopi', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  await expect(page.getByRole('heading', { level: 1, name: 'Photo design' })).toBeVisible()
  await expect(page.locator('[data-tpl]')).toHaveCount(19)
  await page.getByRole('button', { name: /Story 9:16/ }).click()
  await expect(page.getByRole('button', { name: /Story 9:16/ })).toHaveAttribute('aria-pressed', 'true')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned sikkerhetskopi' }).click()
  const j = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8')) as { app: string; projects: unknown[] }
  expect(j.app).toBe('photodesign')
  expect(errors).toEqual([])
})

test('nytt prosjekt fra mal: bilde, tekst, lagre og eksporter PNG, JPG og PDF', async ({ page }, info) => {
  test.slow()
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await expect(page.getByText('Lag', { exact: true }).first()).toBeVisible()

  // Bilde inn i den tomme bildeplassen (valgt) via filvelgeren
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bytt bilde' }).click()
  await (await chooser).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(300, 300, () => [230, 20, 20, 255]) })
  // Den tomme bildeplassen får bildet og filnavnet (som i dagens app)
  await expect(page.locator('[data-layer]').filter({ hasText: 'rod' })).toBeVisible()
  await expect(page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' })).toHaveCount(0)

  // Ny tekst
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await expect(page.locator('textarea[data-pd-text]')).toHaveValue('Skriv her')
  await page.locator('textarea[data-pd-text]').fill('Hei verden')

  // Lagre (autolagring er av som standard)
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()

  // PNG
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  let dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  let file = info.outputPath('ut.png')
  await (await dl).saveAs(file)
  const r = await size(page, file)
  expect([r.w, r.h]).toEqual([1080, 1080])
  expect(r.red).toBeGreaterThan(0.2)

  // JPG 2×
  await page.getByRole('button', { name: 'JPG', exact: true }).click()
  await page.getByRole('button', { name: /^2×/ }).click()
  dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  file = info.outputPath('ut.jpg')
  await (await dl).saveAs(file)
  expect((await size(page, file)).w).toBe(2160)

  // PDF trykk
  await page.getByRole('button', { name: 'PDF trykk' }).click()
  dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  file = info.outputPath('ut.pdf')
  await (await dl).saveAs(file)
  const pdf = fs.readFileSync(file, 'latin1')
  expect(pdf.startsWith('%PDF-1.4')).toBe(true)
  expect(pdf).toContain('/DeviceCMYK')

  // Tilbake: prosjektet ligger under «Mine prosjekter» og overlever omlasting
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await expect(page.getByText('Mine prosjekter')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-project]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('angre, grupper og slett med tastaturet', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Tastatursnarveier er for PC')
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  const layers = page.locator('[data-layer]')
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await page.getByRole('button', { name: 'Form', exact: true }).click()
  await expect(layers).toHaveCount(2)
  await page.locator('[data-pd-wrap]').click({ position: { x: 3, y: 3 } })
  await page.keyboard.press('Control+a')
  await expect(page.getByText('2 lag valgt')).toBeVisible()
  await page.keyboard.press('Control+g')
  await expect(page.getByText('Lagene er gruppert. De flyttes og skaleres nå sammen.')).toBeVisible()
  await page.keyboard.press('Delete')
  await expect(layers).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(layers).toHaveCount(2)
})

test('effekter i avansert modus blir egne lag', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Effekter', exact: true }).click()
  await page.getByRole('switch', { name: 'Avansert modus' }).click()
  await expect(page.getByText(/^[0-9 ]+ forhåndsvalg$/)).toBeVisible()
  await page.locator('[data-fx]').first().click()
  await expect(page.locator('[data-layer]')).toHaveCount(1)
})

/** Andel piksler i lerretet (forhåndsvisningen av en mal) som er tydelig blå (paletten «Hvit og blå»). */
const blueIn = (page: Page, k: string) => page.locator(`[data-tpl="${k}"] canvas`).evaluate((c: HTMLCanvasElement) => {
  const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 16) if ((d[i + 2] ?? 0) > 150 && (d[i] ?? 0) < 60) n++
  return n / (d.length / 16)
})

test('fargepalett over malene: samme valg som i Thumbnail Studio, oppdaterer forhåndsvisningene og beholdes', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  const btn = page.locator('[data-pd-pal-btn]')
  // velgeren står over malene
  const yBtn = (await btn.boundingBox())?.y ?? 0
  const yTpl = (await page.locator('[data-tpl]').first().boundingBox())?.y ?? 0
  expect(yBtn).toBeLessThan(yTpl)
  await expect(btn).toContainText('Standard')
  await expect.poll(() => blueIn(page, 'bold')).toBeLessThan(0.05)
  await btn.click()
  await expect(page.locator('[data-pd-pal]')).toHaveCount(11)
  await page.locator('[data-pd-pal="wbl"]').click()
  await expect(page.locator('[data-pd-pal]')).toHaveCount(0) // menyen lukkes
  await expect(btn).toContainText('Hvit og blå')
  // forhåndsvisningen tegnes på nytt med en gang
  await expect.poll(() => blueIn(page, 'bold')).toBeGreaterThan(0.5)
  // malen åpnes i paletten
  await page.locator('[data-tpl="bold"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  page.once('dialog', (d) => void d.dismiss())
  // paletten er beholdt etter bytte av mal og etter ny innlasting
  await expect(page.locator('[data-pd-pal-btn]')).toContainText('Hvit og blå')
  await page.reload()
  await expect(page.locator('[data-pd-pal-btn]')).toContainText('Hvit og blå')
  await expect.poll(() => blueIn(page, 'countdown')).toBeGreaterThan(0.3)
  // tilbake til standard med tastaturet: Escape lukker menyen
  await page.locator('[data-pd-pal-btn]').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-pd-pal]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('nytt bilde fyller malens tomme bildeplass (uten at den er valgt), og teksten ligger fortsatt over', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="split"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  const n = await page.locator('[data-layer]').count()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await chooser).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(300, 200, () => [230, 20, 20, 255]) })
  await expect(page.locator('[data-layer]').filter({ hasText: 'rod' })).toBeVisible()
  // samme antall lag: bildet gikk inn i bildeplassen i stedet for et nytt lag øverst
  await expect(page.locator('[data-layer]')).toHaveCount(n)
  const names = (await page.locator('[data-layer]').allTextContents()).map((t) => t.trim())
  expect(names.at(-1)).toContain('rod') // nederst i lista = nederst i bildet
  expect(names[0]).not.toContain('rod')
  expect(errors).toEqual([])
})

test('de 10 nye malene åpnes i editoren med lagene sine', async ({ page }) => {
  test.slow()
  const errors = await errorsOf(page)
  for (const k of ['split', 'verse', 'series', 'countdown', 'news', 'poster', 'thanks', 'facts', 'staff', 'minimal']) {
    await page.goto('/app/photo-design')
    await page.locator(`[data-tpl="${k}"]`).click()
    await expect(page.locator('[data-pd-view="edit"]'), k).toBeVisible()
    expect(await page.locator('[data-layer]').count(), k).toBeGreaterThan(2)
  }
  expect(errors).toEqual([])
})

test('alle malene vises på lerretet, også når de åpnes etter hverandre (skriftene allerede lastet)', async ({ page }) => {
  test.slow()
  const errors = await errorsOf(page)
  page.on('dialog', (d) => void d.dismiss())
  await page.goto('/app/photo-design')
  await expect(page.locator('[data-tpl]')).toHaveCount(19)
  const keys = await page.locator('[data-tpl]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tpl') as string))
  expect(keys).toHaveLength(19)
  for (const k of keys) {
    await page.locator(`[data-tpl="${k}"]`).click()
    const cv = page.locator('[data-pd-view="edit"] canvas').first()
    // lerretets oppløsning følger visningen (ikke 10 × 10), og malen er tegnet (flere farger enn bakgrunnen)
    await expect.poll(() => cv.evaluate((c: HTMLCanvasElement, key: string) => {
      const r = c.getBoundingClientRect()
      const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data
      const s = new Set<number>()
      for (let i = 0; i < d.length; i += 4 * 31) s.add(((d[i] ?? 0) >> 4) * 256 + ((d[i + 1] ?? 0) >> 4) * 16 + ((d[i + 2] ?? 0) >> 4))
      return c.width >= r.width * 0.9 && (key === 'blank' || s.size > 3)
    }, k), k).toBe(true)
    await page.getByRole('button', { name: /Prosjekter/ }).first().click()
    await expect(page.locator('[data-tpl]').first()).toBeVisible()
  }
  expect(errors).toEqual([])
})
