import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { framesAt, near, rmsAt } from './media-probe'
import { readMp4 } from './mp4'
import { importFiles, insp, leftTab, main, newAdvProject, recordVideo, seekTo, solid, wav } from './motion-helpers'

/**
 * Motion Design → Avansert: ekte eksport i Chrome (H.264/AAC med WebCodecs), og kontroll av selve filen: MP4-strukturen
 * (kodek, oppløsning, varighet, antall bilder) leses i Node, og bilde og lyd dekodes i Chrome ved bestemte tider.
 */
test.use({ channel: 'chrome' })

const gray = (c: number[]) => Math.max(...c) - Math.min(...c) < 30 && (c[0] ?? 0) > 50

async function exportNow(page: Page): Promise<{ name: string; buf: Buffer }> {
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  await expect(page.getByText(/^Ferdig på/)).toBeVisible({ timeout: 30_000 })
  return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }
}

test('eksport: ekte MP4 med video, effekter, keyframes, tekst, hastighet og lyd – filen kontrolleres', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'eksport testes på PC')
  test.setTimeout(420_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page, 1600, 1000)
  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid, solid('magenta.png', [230, 20, 230]), { name: 'tone.wav', mimeType: 'audio/wav', buffer: wav(1, 0, 1, 1000, 12000) }, { name: 'dempet.wav', mimeType: 'audio/wav', buffer: wav(1, 0, 1, 700, 12000) }], 4)

  // V1: videoen på 2× (rødt/grønt/blått på ca. 1,5 s)
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await main(page).first().click()
  await insp(page, 'speed')
  await page.locator('[data-md-speed] [data-md-speedset="2"]').click()

  // V2: magenta fra 2,0 s (1,5 s), svart-hvitt, opasitet 0 → 1 over første sekund
  await seekTo(page, 2)
  await page.locator('[data-md-bin-item="magenta.png"] [data-md-to="v"]').click()
  await page.locator('[data-md-timing] [data-md-tm="dur"]').fill('1.5')
  await page.locator('[data-md-timing] [data-md-tm="dur"]').blur()
  await insp(page, 'fx')
  await page.locator('[data-md-fx-pick]').selectOption('bw')
  await page.locator('[data-md-fx-add]').click()
  await insp(page, 'anim')
  const op = page.locator('[data-md-keys] [data-md-kf="opacity"]')
  await op.locator('[data-md-kf-toggle]').click()
  await op.locator('[data-md-kfnum="opacity"]').fill('0')
  await op.locator('[data-md-kfnum="opacity"]').blur()
  await seekTo(page, 3)
  await page.locator('[data-row="ov"] [data-block="ov"]').click()
  await op.locator('[data-md-kf-toggle]').click()
  await op.locator('[data-md-kfnum="opacity"]').fill('1')
  await op.locator('[data-md-kfnum="opacity"]').blur()

  // tekst 3,5–4,5 s: rød boks midt i bildet (går forbi prosjektslutt ved 4 s)
  await seekTo(page, 3)
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight')
  await leftTab(page, 'text')
  await page.locator('[data-md-add-text]').click()
  await page.locator('[data-md-timing] [data-md-tm="dur"]').fill('1')
  await page.locator('[data-md-timing] [data-md-tm="dur"]').blur()
  const props = page.locator('[data-md-props]')
  await props.getByLabel('Tekstfarge').fill('#ff0000')
  await props.getByRole('button', { name: 'Boks', exact: true }).click()
  await props.getByLabel('Bakgrunnsfarge').fill('#ff0000')
  await props.getByLabel('Animasjon').selectOption('none')

  // lyd: tone på A1 fra 2,0 s med ton inn 0,5 s; en annen tone på A2 (2,5 s) som dempes
  await seekTo(page, 2)
  await leftTab(page, 'media')
  await page.locator('[data-md-bin-item="tone.wav"] [data-md-to="a"]').click()
  await props.locator('label', { hasText: 'Ton inn' }).locator('input[type="range"]').fill('0.5')
  await seekTo(page, 2)
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight')
  await page.locator('[data-md-bin-item="dempet.wav"] [data-md-to="a"]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('A2')
  await page.locator('[data-md-mute="1"]').click()

  // prosjektvarighet 4 s
  await page.locator('[data-md-field="dur"]').fill('00:00:04')
  await page.locator('[data-md-field="dur"]').press('Enter')
  await expect(page.locator('[data-md-dur-warn]')).toBeVisible()

  // ---------- eksport 1: hele prosjektet, 720p, 30 fps, med lyd ----------
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await expect(page.locator('[data-md-exp-codec]')).toHaveAttribute('data-md-exp-codec', 'h264')
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-fps="30"]').click()
  await expect(page.locator('[data-md-exp-sum]')).toContainText('1280×720 · 30 fps')
  const e1 = await exportNow(page)
  expect(e1.name).toMatch(/-720p30\.mp4$/)
  const m1 = readMp4(e1.buf)
  const v1 = m1.tracks.find((t) => t.type === 'vide')
  const a1 = m1.tracks.find((t) => t.type === 'soun')
  console.log('EKSPORT 1', JSON.stringify(m1))
  expect(v1?.codec, 'H.264').toBe('avc1')
  expect([v1?.width, v1?.height]).toEqual([1280, 720])
  expect(v1?.samples, '4 s × 30 fps').toBe(120)
  expect(Math.abs((v1?.duration ?? 0) - 4), 'videoens varighet = prosjektvarigheten (4 s)').toBeLessThan(0.05)
  expect(a1?.codec, 'AAC').toBe('mp4a')
  expect(Math.abs((a1?.duration ?? 0) - 4)).toBeLessThan(0.1)

  const px = (await framesAt(page, e1.buf, [0.35, 0.95, 1.3, 1.8, 2.1, 3.3, 3.75])).px
  console.log('BILDER 1', JSON.stringify(px))
  expect(near(px[0]!, [224, 16, 16]), '0,35 s: rødt (kilde 0,7 s ved 2×)').toBe(true)
  expect(near(px[1]!, [16, 192, 32]), '0,95 s: grønt (kilde 1,9 s)').toBe(true)
  expect(near(px[2]!, [16, 48, 224]), '1,3 s: blått (kilde 2,6 s)').toBe(true)
  expect(Math.max(...px[3]!), '1,8 s: svart (videoen er slutt)').toBeLessThan(30)
  expect(Math.max(...px[4]!), '2,1 s: overlegget nesten usynlig (opasitet ~0,1)').toBeLessThan(40)
  expect(gray(px[5]!), '3,3 s: overlegget helt synlig og svart-hvitt').toBe(true)
  expect(near(px[6]!, [255, 0, 0], 50), '3,75 s: rød tekstboks').toBe(true)

  const au = await rmsAt(page, e1.buf, [[0.2, 1.3], [1.7, 1.95], [2.02, 2.12], [2.6, 2.9], [3.15, 3.9]])
  console.log('LYD 1', JSON.stringify(au))
  const [vidA, gap, fadeIn, tone, after] = au.rms as [number, number, number, number, number]
  expect(Math.abs(au.dur - 4), 'lydens lengde').toBeLessThan(0.1)
  expect(vidA, 'videoens lyd 0–1,5 s').toBeGreaterThan(0.02)
  expect(gap, 'stille 1,7–1,95 s').toBeLessThan(0.005)
  expect(tone, 'tonen på A1 fra 2,0 s').toBeGreaterThan(0.1)
  expect(fadeIn, 'ton inn: svakere i starten').toBeLessThan(tone * 0.5)
  expect(after, 'etter 3,0 s: stille (A2 er dempet)').toBeLessThan(0.005)

  // ---------- eksport 2: område 2,0–3,0 s, 24 fps, uten lyd ----------
  await page.locator('[data-md-exp-fps="24"]').click()
  await page.locator('[data-md-exp-audio]').uncheck()
  await page.locator('[data-md-exp-range="custom"]').click()
  await page.locator('[data-md-field="exp-from"]').fill('00:00:02')
  await page.locator('[data-md-field="exp-from"]').press('Enter')
  await page.locator('[data-md-field="exp-to"]').fill('00:00:03')
  await page.locator('[data-md-field="exp-to"]').press('Enter')
  await expect(page.locator('[data-md-exp-sum]')).toContainText('00:00:01 · 1280×720 · 24 fps')
  const e2 = await exportNow(page)
  expect(e2.name).toMatch(/-720p24\.mp4$/)
  const m2 = readMp4(e2.buf)
  console.log('EKSPORT 2', JSON.stringify(m2))
  const v2 = m2.tracks.find((t) => t.type === 'vide')
  expect(m2.tracks.some((t) => t.type === 'soun'), 'uten lyd: ingen lydspor').toBe(false)
  expect(v2?.samples, '1 s × 24 fps').toBe(24)
  expect(Math.abs((v2?.duration ?? 0) - 1)).toBeLessThan(0.05)
  const px2 = (await framesAt(page, e2.buf, [0.05, 0.95])).px
  console.log('BILDER 2', JSON.stringify(px2))
  expect(Math.max(...px2[0]!), 'start (2,05 s): overlegget nesten usynlig').toBeLessThan(40)
  expect(gray(px2[1]!), 'slutt (2,95 s): overlegget nesten helt synlig').toBe(true)
  // prosjektet er urørt av eksporten (teksten går fortsatt til 4,5 s)
  await page.getByRole('button', { name: 'Lukk', exact: true }).click()
  await expect(page.locator('[data-md-content]')).toContainText('00:00:04.5')
  expect(errors).toEqual([])
})
