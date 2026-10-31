import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { framesAt, near, rmsAt } from './media-probe'
import { readMp4 } from './mp4'
import { importFiles, main, newAdvProject, recordVideo } from './motion-helpers'

/**
 * Motion Design → eksport i nettlesere uten H.264: reserveløsningene kjøres i ekte Chrome ved at testsiden skjuler
 * kodere (som i nettlesere som mangler dem). 1) Uten H.264/AAC: MP4 med VP9 og Opus via WebCodecs. 2) Uten WebCodecs:
 * prosjektet tas opp i sanntid med MediaRecorder. Filen kontrolleres i begge tilfeller – ikke dialogteksten.
 */
test.use({ channel: 'chrome' })

/** Skjuler H.264- og AAC-koderne (isConfigSupported svarer «nei»), slik Firefox gjør på enkelte systemer. */
const NO_H264 = () => {
  const ve = VideoEncoder.isConfigSupported.bind(VideoEncoder)
  VideoEncoder.isConfigSupported = (c: VideoEncoderConfig) => (c.codec.startsWith('avc1') ? Promise.resolve({ supported: false, config: c }) : ve(c))
  const ae = AudioEncoder.isConfigSupported.bind(AudioEncoder)
  AudioEncoder.isConfigSupported = (c: AudioEncoderConfig) => (c.codec.startsWith('mp4a') ? Promise.resolve({ supported: false, config: c }) : ae(c))
}
/** Fjerner WebCodecs helt, slik eldre nettlesere mangler det. */
const NO_WEBCODECS = () => {
  const w = window as unknown as Record<string, unknown>
  delete w.VideoEncoder
  delete w.VideoFrame
  delete w.AudioEncoder
  delete w.AudioData
}

/** Prosjekt: ekte video (rødt, grønt, blått à 1 s, med lyd) på V1, prosjektvarighet 3 s. */
async function project(page: Page) {
  await newAdvProject(page, 1600, 1000)
  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid], 1)
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await expect(main(page)).toHaveCount(1)
  // prosjektvarighet 3 s (opptaket av testvideoen kan bli litt lengre)
  await page.locator('[data-md-field="dur"]').fill('00:00:03')
  await page.locator('[data-md-field="dur"]').press('Enter')
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-fps="30"]').click()
}

async function exportNow(page: Page): Promise<{ name: string; buf: Buffer }> {
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  await expect(page.getByText(/^Ferdig på/)).toBeVisible({ timeout: 30_000 })
  return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }
}

const RGB = [[224, 16, 16], [16, 192, 32], [16, 48, 224]]

test('eksport uten H.264: MP4 med VP9 og Opus – filen kontrolleres', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'eksport testes på PC')
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(NO_H264)
  await project(page)
  await expect(page.locator('[data-md-exp-codec]')).toHaveAttribute('data-md-exp-codec', 'vp9')
  await expect(page.locator('[data-md-exp-codec]')).toContainText('VP9')
  const e = await exportNow(page)
  await expect(page.getByText(/^Ferdig på/)).toContainText('VP9')
  expect(e.name).toMatch(/-720p30\.mp4$/)
  const m = readMp4(e.buf)
  console.log('VP9', JSON.stringify(m))
  const v = m.tracks.find((t) => t.type === 'vide')
  const a = m.tracks.find((t) => t.type === 'soun')
  expect(v?.codec, 'VP9 i MP4').toBe('vp09')
  expect([v?.width, v?.height]).toEqual([1280, 720])
  expect(v?.samples, '3 s × 30 fps').toBe(90)
  expect(Math.abs((v?.duration ?? 0) - 3)).toBeLessThan(0.05)
  expect(a?.codec, 'Opus i MP4').toBe('Opus')
  const { px } = await framesAt(page, e.buf, [0.5, 1.5, 2.5])
  console.log('BILDER VP9', JSON.stringify(px))
  px.forEach((c, i) => expect(near(c, RGB[i]!), `bilde ved ${i + 0.5} s`).toBe(true))
  const au = await rmsAt(page, e.buf, [[0.2, 2.8]])
  console.log('LYD VP9', JSON.stringify(au))
  expect(Math.abs(au.dur - 3)).toBeLessThan(0.1)
  expect(au.rms[0], 'videoens lyd er med').toBeGreaterThan(0.02)
  expect(errors).toEqual([])
})

test('eksport uten WebCodecs: sanntidsopptak med MediaRecorder – filen kontrolleres', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'eksport testes på PC')
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(NO_WEBCODECS)
  await project(page)
  await expect(page.locator('[data-md-exp-codec]')).toHaveAttribute('data-md-exp-codec', 'none')
  const e = await exportNow(page)
  const isMp4 = /\.mp4$/.test(e.name)
  expect(e.name).toMatch(/-720p30\.(mp4|webm)$/)
  console.log('SANNTID', e.name, e.buf.length)
  // filtypen stemmer med innholdet
  if (isMp4) expect(e.buf.toString('latin1', 4, 8)).toBe('ftyp')
  else expect(e.buf.readUInt32BE(0)).toBe(0x1a45dfa3)
  // sanntidsopptak: under last kan bildene forskyves litt i tid, så hver farge må finnes et sted i sitt sekund
  const TS = [0.3, 0.5, 0.7, 1.3, 1.5, 1.7, 2.3, 2.5, 2.7]
  const { px, last } = await framesAt(page, e.buf, TS, isMp4 ? 'video/mp4' : 'video/webm')
  console.log('BILDER SANNTID', JSON.stringify(px), 'siste bilde', last)
  expect(last, 'opptaket varer omtrent hele prosjektet (3 s)').toBeGreaterThan(2.5)
  expect(last).toBeLessThan(3.6)
  RGB.forEach((rgb, s) => expect(px.slice(s * 3, s * 3 + 3).some((c) => near(c, rgb)), `farge i sekund ${s + 1}`).toBe(true))
  const au = await rmsAt(page, e.buf, [[0.3, 2.5]])
  console.log('LYD SANNTID', JSON.stringify(au))
  expect(au.rms[0], 'videoens lyd er med').toBeGreaterThan(0.02)
  expect(errors).toEqual([])
})
