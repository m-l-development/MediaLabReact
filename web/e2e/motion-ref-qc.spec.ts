import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { readMp4 } from './mp4'
import { importFiles, leftTab } from './motion-helpers'

/**
 * Visuell kvalitetskontroll av de 13 referansemalene (kjøres bare med ML_REF_QC=<mappe>; mappen må ha media/ med
 * bilde1-5.jpg og video1.webm). For hver mal eksporteres hele videoen to ganger: (A) slik malen er (plassholdere), og
 * (B) med egne bilder/video, egen musikk og Music Sync. MP4-ene sammenlignes etterpå bilde for bilde med originalene.
 */
test.use({ channel: 'chrome' })
const QC = process.env.ML_REF_QC ?? ''
const TPL: [string, 'wide' | 'story'][] = [
  ['theend', 'wide'], ['yearroll', 'wide'], ['yearmontage', 'wide'], ['october', 'wide'], ['travelvlog', 'wide'], ['daycount', 'wide'], ['newyork', 'wide'],
  ['maydump', 'wide'], ['lyricvideo', 'wide'], ['daycount916', 'story'], ['theend916', 'story'], ['vacation', 'wide'], ['andwiththat', 'story'],
]
const ONLY = process.env.ML_REF_ONLY?.split(',')

/** Syntetisk sang med trommer (22 kHz mono WAV): bass på slagene, skarp på 2 og 4, hi-hat på åttedeler. */
function song(sec: number, bpm: number): Buffer {
  const rate = 22050, n = Math.round(rate * sec), x = new Float32Array(n)
  let r = 1
  const noise = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1
  const per = 60 / bpm
  for (let k = 0; k * per < sec; k++) {
    const i0 = Math.round(k * per * rate)
    for (let i = 0; i < 0.2 * rate && i0 + i < n; i++) x[i0 + i]! += Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-i / rate * 30)) * (i / rate)) * 0.8 * Math.exp(-i / rate / 0.05)
    if (k % 2 === 1) for (let i = 0; i < 0.12 * rate && i0 + i < n; i++) x[i0 + i]! += noise() * 0.35 * Math.exp(-i / rate / 0.03)
    const h = Math.round((k + 0.5) * per * rate)
    for (let i = 0; i < 0.03 * rate && h + i < n; i++) x[h + i]! += noise() * 0.12 * Math.exp(-i / rate / 0.008)
  }
  for (let i = 0; i < n; i++) x[i]! += Math.sin(2 * Math.PI * 110 * (i / rate)) * 0.05
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round((x[i] ?? 0) * 24000))), 44 + i * 2)
  return buf
}

async function exportAll(page: Page, file: string) {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.locator('[data-md-exp-res="720"]').click()
  await page.locator('[data-md-exp-fps="30"]').click()
  await page.locator('[data-md-exp-range="all"]').click()
  const dl = page.waitForEvent('download', { timeout: 600_000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  await (await dl).saveAs(file)
  await page.keyboard.press('Escape')
  return readMp4(fs.readFileSync(file))
}

for (const [k, fmt] of TPL) {
  test(`QC ${k}`, async ({ page }, info) => {
    test.skip(!QC || info.project.name === 'mobil' || (!!ONLY && !ONLY.includes(k)), 'kun manuell kvalitetskontroll')
    test.setTimeout(1_200_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/app/motion-design')
    await page.locator('[data-md-new]').click()
    await page.locator(`[data-format="${fmt}"]`).click()
    await page.locator(`[data-tpl-lib] [data-tpl="${k}"]`).click()
    await expect(page.locator('[data-md-canvas]')).toBeVisible()
    await page.locator('[data-adv-toggle]').click()
    const a = await exportAll(page, path.join(QC, `${k}-A.mp4`))
    expect(a.tracks.some((x) => x.type === 'vide')).toBe(true)
    // eget materiale
    const m = (f: string, mimeType: string) => ({ name: f, mimeType, buffer: fs.readFileSync(path.join(QC, 'media', f)) })
    await importFiles(page, [m('bilde1.jpg', 'image/jpeg'), m('video1.webm', 'video/webm'), m('bilde2.jpg', 'image/jpeg'), m('bilde3.jpg', 'image/jpeg'), m('bilde4.jpg', 'image/jpeg'), m('bilde5.jpg', 'image/jpeg')], 6)
    await page.locator('[data-md-fill-ph]').click()
    await expect(page.getByText(/plassholdere er fylt med dine filer/)).toBeVisible()
    fs.writeFileSync(path.join(QC, `${k}-fill.txt`), (await page.locator('[data-md-time]').textContent()) ?? '')
    if (process.env.ML_REF_STOP) {
      await page.locator('[data-md-props]').waitFor()
      const info = await page.evaluate(() => JSON.stringify((window as unknown as { __mdProj?: unknown }).__mdProj ?? null))
      fs.writeFileSync(path.join(QC, `${k}-proj.json`), info)
      return
    }
    await leftTab(page, 'audio')
    const ch = page.waitForEvent('filechooser')
    await page.locator('[data-md-add-music]').click()
    await (await ch).setFiles({ name: 'sang.wav', mimeType: 'audio/wav', buffer: song(70, 112) })
    await expect(page.locator('[data-md-sync]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-md-sync]').click()
    await expect(page.locator('[data-md-sync-status]')).toContainText('På', { timeout: 60_000 })
    fs.writeFileSync(path.join(QC, `${k}-B.txt`), ((await page.locator('[data-md-sync-status]').textContent()) ?? '') + ' | ' + ((await page.locator('[data-md-time]').textContent()) ?? ''))
    const b = await exportAll(page, path.join(QC, `${k}-B.mp4`))
    expect(b.tracks.some((x) => x.type === 'soun')).toBe(true)
    expect(errors).toEqual([])
  })
}
