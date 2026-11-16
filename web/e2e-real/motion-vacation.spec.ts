/**
 * Regresjonstest med eierens eksempel (negativt eksempel, se docs/statusrevisjon «7. Motion»): Vacation-malen med samme
 * musikk som i eierens video (lydsporet hentet ut til F:\ML-testdata\vacation-music.wav – ligger ikke i repoet), profil
 * «Typografisk» som i videoen. Eksporterer HELE videoen i original lengde, 30 s, 60 s og kortere; bytter musikk og et klipp
 * etter synkroniseringen (automatisk ny synk). Videoene lagres for gjennomgang bilde for bilde (MEDIALAB_OUT).
 *   MEDIALAB_OUT=<mappe> npx playwright test -c e2e-real e2e-real/motion-vacation.spec.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { readMp4 } from '../e2e/mp4'
import { leftTab } from '../e2e/motion-helpers'

const MUSIC = 'F:/ML-testdata/vacation-music.wav'
const VIDEO = 'F:/ML-testdata/Vacation-1080p30.mp4'
const OUT = process.env.MEDIALAB_OUT ?? path.join('..', 'test-results', 'real', 'vacation')

/** Syntetisk elektronisk sang med drop (WAV), til «bytt musikk». */
function edm(sec: number): Buffer {
  const rate = 22050, n = Math.round(rate * sec), x = new Float32Array(n)
  let r = 1
  const noise = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1
  const per = 60 / 128
  for (let k = 0; k * per < sec; k++) {
    const t0 = k * per, lvl = t0 < 8 ? 0.35 : t0 < 9 ? 0.05 : 1, i0 = Math.round(t0 * rate)
    for (let i = 0; i < 0.2 * rate && i0 + i < n; i++) x[i0 + i]! += Math.sin(2 * Math.PI * (55 + 100 * Math.exp(-i / rate * 30)) * (i / rate)) * 0.9 * lvl * Math.exp(-i / rate / 0.06)
    if (k % 2 === 1) for (let i = 0; i < 0.12 * rate && i0 + i < n; i++) x[i0 + i]! += noise() * 0.4 * lvl * Math.exp(-i / rate / 0.03)
    const h = Math.round((t0 + per / 2) * rate)
    for (let i = 0; i < 0.03 * rate && h + i < n; i++) x[h + i]! += noise() * 0.15 * lvl * Math.exp(-i / rate / 0.008)
  }
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round((x[i] ?? 0) * 26000))), 44 + i * 2)
  return buf
}

async function total(page: Page): Promise<number> {
  const s = (await page.locator('[data-md-time]').textContent()) ?? ''
  const m = /\/\s*(\d+):(\d+)(?:\.(\d))?/.exec(s)
  return m ? Number(m[1]) * 60 + Number(m[2]) + Number(m[3] ?? 0) / 10 : 0
}
async function synced(page: Page) {
  await expect(page.locator('[data-md-sync]')).not.toHaveAttribute('aria-busy', 'true', { timeout: 120_000 })
  await expect(page.locator('[data-md-sync-status]')).toContainText('På', { timeout: 120_000 })
}
/** Hele videoen som MP4 (720p), lagret for gjennomgang. */
async function exportAll(page: Page, name: string): Promise<{ dur: number; audio: boolean }> {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  const dl = page.waitForEvent('download', { timeout: 600_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const p = await (await dl).path()
  fs.mkdirSync(OUT, { recursive: true })
  const to = path.join(OUT, name)
  fs.copyFileSync(p!, to)
  const m = readMp4(fs.readFileSync(to))
  await page.keyboard.press('Escape')
  return { dur: m.duration, audio: m.tracks.some((t) => t.type === 'soun') }
}

test.skip(!fs.existsSync(MUSIC), 'eierens lydspor finnes ikke på denne maskinen')

test('Vacation med eierens musikk: original, 30 s, 60 s, kortere, bytte musikk og klipp – hele eksporten', async ({ page }) => {
  test.setTimeout(3_600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl-lib] [data-tpl="vacation"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await page.locator('[data-adv-toggle]').click()
  await leftTab(page, 'audio')
  const ch = page.waitForEvent('filechooser')
  await page.locator('[data-md-add-music]').click()
  await (await ch).setFiles({ name: 'alex-morgan-tiktok-trending-music.wav', mimeType: 'audio/wav', buffer: fs.readFileSync(MUSIC) })
  await expect(page.locator('[data-md-sync]')).toBeVisible({ timeout: 60_000 })
  // som i eierens video: profil «Typografisk»
  await page.locator('[data-md-sync-style]').selectOption('typo')
  await synced(page)
  const songLen = 18.88
  const t0 = await total(page)
  expect(t0, 'original: innenfor musikken').toBeLessThanOrEqual(songLen + 0.2)
  const r0 = await exportAll(page, 'vacation-typo-original.mp4')
  expect(r0.audio).toBe(true)
  expect(Math.abs(r0.dur - t0), `eksporten ${r0.dur.toFixed(2)} s, tidslinjen ${t0} s`).toBeLessThan(0.25)

  for (const [len, name] of [[30, '30s'], [60, '60s'], [12, '12s']] as const) {
    await page.locator(`[data-md-length-set="${len}"]`).count().then(async (n) => {
      if (n) await page.locator(`[data-md-length-set="${len}"]`).click()
      else { await page.locator('[data-md-length-input]').fill(String(len)); await page.locator('[data-md-length-input]').press('Enter') }
    })
    await synced(page)
    await expect.poll(() => total(page), { timeout: 60_000 }).toBeCloseTo(len, 0)
    const r = await exportAll(page, `vacation-typo-${name}.mp4`)
    expect(r.audio).toBe(true)
    expect(Math.abs(r.dur - len), `${name}: eksporten ${r.dur.toFixed(2)} s`).toBeLessThan(0.25)
    await leftTab(page, 'audio')
  }

  // tilbake til 30 s, så bytt musikk: Music Sync kjøres automatisk på nytt (lengden beholdes)
  await page.locator('[data-md-length-set="30"]').click()
  await synced(page)
  const ch2 = page.waitForEvent('filechooser')
  await page.locator('[data-md-replace-music]').click()
  await (await ch2).setFiles({ name: 'edm.wav', mimeType: 'audio/wav', buffer: edm(40) })
  await expect.poll(async () => (await page.locator('[data-md-sync-status]').textContent()) ?? '', { timeout: 120_000 }).toMatch(/128 BPM/)
  await expect.poll(() => total(page)).toBeCloseTo(30, 0)
  const r2 = await exportAll(page, 'vacation-typo-30s-ny-musikk.mp4')
  expect(Math.abs(r2.dur - 30)).toBeLessThan(0.25)
  await leftTab(page, 'audio')

  // bytt et klipp med eierens video (automatisk ny synk; feltets lengde og alt annet beholdes)
  if (fs.existsSync(VIDEO)) {
    await leftTab(page, 'media')
    const ch3 = page.waitForEvent('filechooser')
    await page.locator('[data-md-bin-import]').click()
    await (await ch3).setFiles({ name: 'vacation.mp4', mimeType: 'video/mp4', buffer: fs.readFileSync(VIDEO) })
    await expect(page.locator('[data-md-bin-item="vacation.mp4"]')).toBeVisible({ timeout: 60_000 })
    // plassholderne fylles med eierens video (innholdet byttes; feltenes lengde og timing beholdes)
    await page.locator('[data-md-fill-ph]').click()
    await page.waitForTimeout(1500)
    await leftTab(page, 'audio')
    await synced(page)
    await expect.poll(() => total(page), { timeout: 60_000 }).toBeCloseTo(30, 0)
    const r3 = await exportAll(page, 'vacation-typo-30s-eget-klipp.mp4')
    expect(Math.abs(r3.dur - 30)).toBeLessThan(0.25)
  }
  expect(errors).toEqual([])
})
