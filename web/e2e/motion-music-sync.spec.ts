import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { readMp4 } from './mp4'
import { leftTab, saveAndReload } from './motion-helpers'

/**
 * Music Sync i Motion: samme mal med sakte, rask og musikk med pause/drop – malen tilpasser seg (kortere klipp med rask
 * musikk), lastetilstand og status med tempo, profil kan byttes (filmatisk roligere enn dynamisk), Music Sync kan slås
 * av (malens egen timing tilbake) og brukes på nytt, manuelle justeringer etterpå beholdes og lagres, og eksporten har
 * musikken. Flere maler (rulletekst, sangtekst, stående ordstabel) med samme motor.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

/** Syntetisk sang (22 kHz mono WAV): tromme på slagene, hi-hat på åttedeler; deler [fra, til, bpm, nivå]. */
function song(parts: [number, number, number, number][]): Buffer {
  const rate = 22050, end = Math.max(...parts.map((p) => p[1])), n = Math.round(rate * end)
  const x = new Float32Array(n)
  let r = 1
  const noise = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (const [a, b, bpm, lvl] of parts) {
    const per = 60 / bpm
    for (let k = 0; a + k * per < b; k++) {
      const t0 = a + k * per, i0 = Math.round(t0 * rate)
      for (let i = 0; i < 0.18 * rate && i0 + i < n; i++) x[i0 + i]! += Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-i / rate * 30)) * (i / rate)) * 0.85 * lvl * Math.exp(-i / rate / 0.045)
      const h = Math.round((t0 + per / 2) * rate)
      for (let i = 0; i < 0.03 * rate && h + i < n; i++) x[h + i]! += noise() * 0.12 * lvl * Math.exp(-i / rate / 0.008)
    }
  }
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round((x[i] ?? 0) * 26000))), 44 + i * 2)
  return buf
}
const SLOW = song([[0, 45, 76, 1]])
const FAST = song([[0, 45, 152, 1]])
const DROP = song([[0, 9, 120, 0.3], [9, 10.5, 120, 0], [10.5, 45, 120, 1]])

/** Total lengde (s) fra tidsvisningen «00:00 / 00:22». */
async function total(page: Page): Promise<number> {
  const s = (await page.locator('[data-md-time]').textContent()) ?? ''
  const m = /\/\s*(\d+):(\d+)(?:\.(\d))?/.exec(s)
  return m ? Number(m[1]) * 60 + Number(m[2]) + Number(m[3] ?? 0) / 10 : 0
}
async function open(page: Page, k: string, fmt: string) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator(`[data-format="${fmt}"]`).click()
  await page.locator(`[data-tpl-lib] [data-tpl="${k}"]`).click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await page.locator('[data-adv-toggle]').click()
  await leftTab(page, 'audio')
}
async function addMusic(page: Page, name: string, buf: Buffer, replace = false) {
  const ch = page.waitForEvent('filechooser')
  await page.locator(replace ? '[data-md-replace-music]' : '[data-md-add-music]').click()
  await (await ch).setFiles({ name, mimeType: 'audio/wav', buffer: buf })
  await expect(page.locator('[data-md-sync]')).toBeVisible({ timeout: 30_000 })
}
async function sync(page: Page) {
  await page.locator('[data-md-sync]').click()
  await expect(page.locator('[data-md-sync-status]')).toContainText('På', { timeout: 30_000 })
  await expect(page.locator('[data-md-sync]')).toBeEnabled()
}

test('Music Sync: sakte, rask og musikk med drop; profil, av/på, manuell justering, lagring og eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.setTimeout(420_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page, 'theend', 'wide')
  const T0 = await total(page)
  // sakte musikk
  await addMusic(page, 'sakte.wav', SLOW)
  await expect(page.locator('[data-md-sync-status]')).toContainText('Av')
  await sync(page)
  await expect(page.locator('[data-md-sync-box]')).toHaveAttribute('data-on', '1')
  const tSlow = await total(page)
  // rask musikk (bytt musikk, bruk på nytt): kortere klipp, kortere video
  await addMusic(page, 'rask.wav', FAST, true)
  await sync(page)
  const tFast = await total(page)
  expect(tFast, `rask (${tFast} s) kortere enn sakte (${tSlow} s)`).toBeLessThan(tSlow * 0.8)
  // profil: filmatisk er roligere (lengre klipp) enn malens egen (dynamisk)
  await page.locator('[data-md-sync-style]').selectOption('cinematic')
  await expect(page.locator('[data-md-sync-status]')).toContainText('Filmatisk', { timeout: 30_000 })
  const tCine = await total(page)
  expect(tCine).toBeGreaterThan(tFast)
  // musikk med pause og drop
  await addMusic(page, 'drop.wav', DROP, true)
  await page.locator('[data-md-sync-style]').selectOption('dynamic')
  await expect(page.locator('[data-md-sync-status]')).toContainText('Dynamisk', { timeout: 30_000 })
  // av: malens egen timing tilbake
  await page.locator('[data-md-sync-off]').click()
  await expect(page.locator('[data-md-sync-status]')).toContainText('Av')
  expect(Math.abs((await total(page)) - T0)).toBeLessThan(0.2)
  // på igjen, så en manuell justering (første klipp blir lengre) som beholdes og lagres
  await sync(page)
  const tSync = await total(page)
  await page.locator('[data-row="video"] [data-block="clip"]').first().click()
  const dur = page.locator('[data-md-props]').getByLabel('Varighet (s)').first()
  const v0 = Number(await dur.inputValue())
  await dur.fill(String(Math.round((v0 + 2) * 10) / 10))
  await dur.press('Enter')
  await expect.poll(() => total(page)).toBeGreaterThan(tSync + 1.5)
  const tMan = await total(page)
  await saveAndReload(page)
  await expect.poll(() => total(page)).toBeCloseTo(tMan, 0)
  await leftTab(page, 'audio')
  await expect(page.locator('[data-md-sync-status]')).toContainText('På')
  // eksport med musikken
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-range="custom"]').click()
  await page.locator('[data-md-field="exp-from"]').fill('00:00:00')
  await page.locator('[data-md-field="exp-from"]').press('Enter')
  await page.locator('[data-md-field="exp-to"]').fill('00:00:03')
  await page.locator('[data-md-field="exp-to"]').press('Enter')
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const m = readMp4(fs.readFileSync(await (await dl).path()))
  expect(m.tracks.some((x) => x.type === 'soun'), 'musikken er med').toBe(true)
  expect(errors).toEqual([])
})

for (const [k, fmt] of [['lyricvideo', 'wide'], ['andwiththat', 'story'], ['newyork', 'wide']] as const) {
  test(`Music Sync på ${k}: samme motor, malens egen profil, av og på`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC')
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await open(page, k, fmt)
    const T0 = await total(page)
    await addMusic(page, 'rask.wav', FAST)
    await sync(page)
    const t1 = await total(page)
    expect(t1).toBeGreaterThan(1)
    expect(Math.abs(t1 - T0)).toBeGreaterThan(0.2)
    await page.locator('[data-md-sync-off]').click()
    await expect.poll(() => total(page)).toBeCloseTo(T0, 0)
    expect(errors).toEqual([])
  })
}
