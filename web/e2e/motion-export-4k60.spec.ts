import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { readMp4 } from './mp4'
import { png } from './png'

/**
 * Motion, standardvisningen: «4K · 60 fps» ved siden av de andre valgene. Filen kontrolleres: 3840 × 2160 og 60 bilder
 * per sekund. Kan nettleseren ikke kode 4K i 60 fps, eksporteres 4K · 30 fps med beskjed (ikke tungt sanntidsopptak).
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'eksport testes på PC'))

/** Skjuler 60 fps-koding i 4K (isConfigSupported svarer «nei»), som på maskiner uten slik maskinvarekoder. */
const NO_4K60 = () => {
  const ve = VideoEncoder.isConfigSupported.bind(VideoEncoder)
  VideoEncoder.isConfigSupported = (c: VideoEncoderConfig) => ((c.width ?? 0) >= 3840 && (c.framerate ?? 0) > 30 ? Promise.resolve({ supported: false, config: c }) : ve(c))
}

async function project(page: Page) {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Last opp video, bilder eller lyd' }).click()
  await (await ch).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(64, 64, () => [230, 20, 20, 255]) })
  await page.locator('[data-media="image"]').getByRole('button', { name: 'Legg til' }).click()
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1)
  // ett sekund, så eksporten går raskt
  await page.locator('[data-block="clip"]').click({ position: { x: 10, y: 10 } })
  await page.getByLabel('Varighet (s)').fill('1')
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Eksporter video' })).toBeVisible()
}

async function exportFile(page: Page) {
  const dl = page.waitForEvent('download', { timeout: 240000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  return { name: d.suggestedFilename(), buf: fs.readFileSync((await d.path())!) }
}

test('4K · 60 fps: eget valg, de andre valgene er uendret, og filen er 3840 × 2160 i 60 fps', async ({ page }) => {
  test.setTimeout(300000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await project(page)
  for (const l of ['1080p · 30 fps', '1080p · 60 fps', '4K · 30 fps', '4K · 60 fps']) await expect(page.getByRole('button', { name: new RegExp(l) })).toBeVisible()
  await expect(page.getByRole('button', { name: /4K · 60 fps/ })).toContainText('3840 × 2160')
  await page.getByRole('button', { name: /4K · 60 fps/ }).click()
  await expect(page.getByRole('button', { name: /4K · 60 fps/ })).toHaveAttribute('aria-pressed', 'true')
  const e = await exportFile(page)
  expect(e.name).toMatch(/-4k60\.mp4$/)
  const v = readMp4(e.buf).tracks.find((t) => t.type === 'vide')
  expect([v?.width, v?.height], 'oppløsning').toEqual([3840, 2160])
  expect(v?.samples, '1 s × 60 bilder').toBe(60)
  expect(Math.abs((v?.duration ?? 0) - 1), 'varighet 1 s').toBeLessThan(0.05)
  expect((v?.samples ?? 0) / (v?.duration ?? 1), 'bilder per sekund').toBeCloseTo(60, 0)
  await expect(page.getByText(/^Ferdig på/)).toBeVisible()
  expect(errors).toEqual([])
})

test('4K · 60 fps uten støtte i nettleseren: eksporteres i 4K · 30 fps med beskjed', async ({ page }) => {
  test.setTimeout(300000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(NO_4K60)
  await project(page)
  await page.getByRole('button', { name: /4K · 60 fps/ }).click()
  const e = await exportFile(page)
  expect(e.name).toMatch(/-4k30\.mp4$/)
  const v = readMp4(e.buf).tracks.find((t) => t.type === 'vide')
  expect([v?.width, v?.height]).toEqual([3840, 2160])
  expect(v?.samples, '1 s × 30 bilder').toBe(30)
  await expect(page.getByText(/4K · 60 fps støttes ikke i denne nettleseren/)).toBeVisible()
  // 4K · 30 fps og de andre valgene er uendret
  await page.getByRole('button', { name: /4K · 30 fps/ }).click()
  await expect(page.getByRole('button', { name: /4K · 30 fps/ })).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})
