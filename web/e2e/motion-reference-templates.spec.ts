import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { framesAt } from './media-probe'
import { readMp4 } from './mp4'
import { center, importFiles, leftTab, recordVideo, seekTo, solid } from './motion-helpers'

/** Egen musikk med tydelig takt: et klikk hvert halve sekund (120 BPM) i 30 s, 22 kHz mono WAV. */
function clickTrack(sec = 30, bpm = 120): Buffer {
  const rate = 22050, n = Math.round(rate * sec), b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  const per = 60 / bpm
  for (let i = 0; i < n; i++) {
    const t = i / rate, ph = t % per
    const v = ph < 0.05 ? Math.sin(t * 2 * Math.PI * 880) * 20000 * (1 - ph / 0.05) : Math.sin(t * 2 * Math.PI * 110) * 1500
    b.writeInt16LE(Math.round(v), 44 + i * 2)
  }
  return b
}

/**
 * De 13 referansevideoene som Motion-maler (docs/motion-referansemaler.md). For hver mal: åpnes, har plassholdere,
 * er animert på flere tidspunkter, alle plassholdere fylles med eget bilde og egen video («Fyll plassholderne med mine
 * filer»), animasjonen virker etter byttet, en tekst kan redigeres, og eksporten (MP4) er lik forhåndsvisningen.
 * Kontaktark før/etter bytte lagres i test-results/motion-ref for visuell sammenligning med originalene.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

const TPL: [k: string, fmt: 'wide' | 'story', times: number[], exp: number][] = [
  ['theend', 'wide', [0.8, 2.4, 5.2, 8, 12, 18], 9],
  ['yearroll', 'wide', [0.4, 1.4, 2.6, 4.6, 6.5], 2.6],
  ['yearmontage', 'wide', [0.6, 2, 4, 6, 12], 2],
  ['october', 'wide', [0.4, 1.6, 4, 10.3, 11, 14], 6],
  ['travelvlog', 'wide', [0.6, 2, 5, 9, 15], 2.4],
  ['daycount', 'wide', [0.6, 2, 3.6, 5, 7, 12], 5.2],
  ['newyork', 'wide', [0.3, 1.2, 2.8, 3.8, 6], 2],
  ['maydump', 'wide', [0.4, 1.6, 3, 6, 12], 2.6],
  ['lyricvideo', 'wide', [1, 5.5, 9, 25, 37], 6.9],
  ['daycount916', 'story', [0.6, 2, 3.6, 5, 8], 5.2],
  ['theend916', 'story', [0.3, 4.6, 8, 11.5, 16], 2.6],
  ['vacation', 'wide', [0.5, 2.5, 4.6, 6.8, 10], 3.2],
  ['andwiththat', 'story', [0.5, 1.8, 3, 5.6, 9], 2.6],
]

const sig = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4 * 53) h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]!) | 0
  return h
})
const shot = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.7))
async function sheet(page: Page, shots: string[], file: string) {
  const url = await page.evaluate(async (list) => {
    const ims = await Promise.all(list.map((u) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u })))
    const h = 300, w = Math.round((h * ims[0]!.width) / ims[0]!.height)
    const c = document.createElement('canvas')
    c.width = w * ims.length + 4 * (ims.length - 1)
    c.height = h
    const g = c.getContext('2d')!
    ims.forEach((im, i) => g.drawImage(im, i * (w + 4), 0, w, h))
    return c.toDataURL('image/jpeg', 0.75)
  }, shots)
  const dir = process.env.ML_REF_DIR || 'test-results/motion-ref'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(`${dir}/${file}.jpg`, Buffer.from(url.split(',')[1]!, 'base64'))
}
/** Bilder og signaturer på tidspunktene (spillehodet settes med tidskoden; hele sekunder + finjustering via tastene). */
async function frames(page: Page, times: number[]) {
  const sigs: number[] = [], shots: string[] = []
  for (const t of times) {
    await seekFine(page, t)
    await page.waitForTimeout(250)
    sigs.push(await sig(page))
    shots.push(await shot(page))
  }
  return { sigs, shots }
}
async function seekFine(page: Page, t: number) {
  await seekTo(page, Math.floor(t))
  const frac = Math.round((t - Math.floor(t)) * 30)
  if (frac > 0) {
    await page.locator('[data-md-canvas]').focus()
    for (let i = 0; i < frac; i++) await page.keyboard.press('ArrowRight')
  }
}

for (const [k, fmt, times, expAt] of TPL) {
  test(`referansemal ${k}: åpnes, er animert, alle felt byttes med eget bilde/video, tekst redigeres, eksport = forhåndsvisning`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC (mobil dekkes av motion-reference-mobile)')
    test.setTimeout(420_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/app/motion-design')
    await page.locator('[data-md-new]').click()
    await page.locator(`[data-format="${fmt}"]`).click()
    await page.locator(`[data-tpl-lib] [data-tpl="${k}"]`).click()
    await expect(page.locator('[data-md-canvas]')).toBeVisible()
    await page.locator('[data-adv-toggle]').click()
    await expect(page.locator('[data-md-bin]')).toBeVisible()
    // lagstruktur: flere klipp på hovedsporet og tekstlag
    expect(await page.locator('[data-row="video"] [data-block="clip"]').count(), 'klipp på V1').toBeGreaterThan(0)
    expect(await page.locator('[data-row="text"] [data-block]').count(), 'tekstlag').toBeGreaterThan(0)
    // plassholdere: knappen for å fylle dem finnes
    await expect(page.locator('[data-md-fill-ph]')).toBeVisible()
    // animert: ulike bilder på tidspunktene gjennom videoen
    const before = await frames(page, times)
    await sheet(page, before.shots, `${k}-mal`)
    expect(new Set(before.sigs).size, 'bildet endrer seg gjennom videoen').toBeGreaterThan(Math.min(4, times.length - 1))
    // et felt i forhåndsvisningen: klikk gir «Last opp bilde eller video …» (ingen leting i tidslinjen)
    await seekFine(page, times[times.length - 1]!)
    await page.locator('[data-md-canvas]').click({ position: { x: 30, y: 30 } })
    await expect(page.getByRole('menuitem', { name: 'Last opp bilde eller video …' })).toBeVisible()
    await page.keyboard.press('Escape')
    // eget materiale: et bilde og en video; alle plassholdere fylles
    const vid = await recordVideo(page, 'egen.webm', ['#1060d0', '#20b040', '#d03020'], 0.7)
    // fire egne bilder i ulike farger og en video (montasjene skal vise ulikt innhold på ulike tidspunkt)
    await importFiles(page, [solid('eget1.png', [235, 190, 40], 320, 180), vid, solid('eget2.png', [40, 120, 230], 320, 180), solid('eget3.png', [220, 60, 140], 320, 180), solid('eget4.png', [40, 200, 120], 320, 180)], 5)
    await page.locator('[data-md-fill-ph]').click()
    await expect(page.getByText(/plassholdere er fylt med dine filer/)).toBeVisible()
    await expect(page.locator('[data-md-fill-ph]')).toHaveCount(0)
    const after = await frames(page, times)
    await sheet(page, after.shots, `${k}-eget`)
    // de egne filene går igjen i montasjen (fem filer på mange felt), så noen tidspunkt kan vise samme fil
    expect(new Set(after.sigs).size, 'animasjonen virker etter byttet').toBeGreaterThan(2)
    expect(after.sigs, 'bildene er byttet').not.toEqual(before.sigs)
    // egen musikk og Music Sync: malen tilpasses musikken (120 BPM)
    await leftTab(page, 'audio')
    const ch = page.waitForEvent('filechooser')
    await page.locator('[data-md-add-music]').click()
    await (await ch).setFiles({ name: 'min-sang.wav', mimeType: 'audio/wav', buffer: clickTrack() })
    await expect(page.locator('[data-md-sync]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-md-sync]').click()
    const status = page.locator('[data-md-sync-status]')
    await expect(status).toContainText('På', { timeout: 30_000 })
    const bpm = Number(/(\d+) BPM/.exec((await status.textContent()) ?? '')?.[1])
    expect([120, 240, 60].some((b) => Math.abs(bpm - b) < 3), `takten i min sang (${bpm} BPM)`).toBe(true)
    await leftTab(page, 'media')
    // tekst kan redigeres
    // en vanlig tekst (ikke en teller) kan redigeres
    const blocks = page.locator('[data-row="text"] [data-block]')
    const ta = page.locator('[data-md-props] textarea').first()
    for (let i = (await blocks.count()) - 1; i >= 0; i--) {
      await blocks.nth(i).click()
      if (await ta.isVisible().catch(() => false)) break
    }
    await expect(ta).toBeVisible()
    await ta.fill('MIN TEKST')
    await expect(ta).toHaveValue('MIN TEKST')
    // eksport: gyldig MP4, og bildet ved expAt er likt forhåndsvisningen
    await seekFine(page, expAt)
    await page.waitForTimeout(400)
    const pv = await center(page)
    await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
    await page.locator('[data-md-exp-res="720"]').click()
    await page.locator('[data-md-exp-fps="30"]').click()
    await page.locator('[data-md-exp-range="custom"]').click()
    const from = Math.max(0, Math.floor(expAt) - 1)
    await page.locator('[data-md-field="exp-from"]').fill(`00:00:${String(from).padStart(2, '0')}`)
    await page.locator('[data-md-field="exp-from"]').press('Enter')
    await page.locator('[data-md-field="exp-to"]').fill(`00:00:${String(from + 3).padStart(2, '0')}`)
    await page.locator('[data-md-field="exp-to"]').press('Enter')
    const dl = page.waitForEvent('download', { timeout: 240_000 })
    await page.getByRole('button', { name: 'Eksporter MP4' }).click()
    const buf = fs.readFileSync(await (await dl).path())
    const m = readMp4(buf)
    const v = m.tracks.find((x) => x.type === 'vide')
    expect(v?.width).toBe(fmt === 'wide' ? 1280 : 720)
    expect(m.tracks.some((x) => x.type === 'soun'), 'musikken er med i eksporten').toBe(true)
    const px = (await framesAt(page, buf, [expAt - from + 0.02])).px[0]!
    const d = Math.abs(px[0]! - pv[0]!) + Math.abs(px[1]! - pv[1]!) + Math.abs(px[2]! - pv[2]!)
    expect(d, `eksporten (${px}) = forhåndsvisningen (${pv}) ved ${expAt} s`).toBeLessThan(70)
    expect(errors).toEqual([])
  })
}

test('mobil: alle 13 referansemalene åpnes, tegnes og har plassholdere som kan fylles', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'mobil')
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const [k, fmt] of TPL) {
    await page.goto('/app/motion-design')
    await page.locator('[data-md-new]').click()
    await page.locator(`[data-format="${fmt}"]`).click()
    await page.locator(`[data-tpl-lib] [data-tpl="${k}"]`).scrollIntoViewIfNeeded()
    await page.locator(`[data-tpl-lib] [data-tpl="${k}"]`).click()
    const cv = page.locator('[data-md-canvas]')
    await expect(cv, k).toBeVisible()
    // tegnet: flere farger enn én flate
    await expect.poll(() => cv.evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      const s = new Set<number>()
      for (let i = 0; i < d.length; i += 4 * 97) s.add((d[i]! >> 4) * 256 + (d[i + 1]! >> 4) * 16 + (d[i + 2]! >> 4))
      return s.size
    }), { message: k }).toBeGreaterThan(['maydump', 'vacation', 'andwiththat'].includes(k) ? 0 : 1) // de starter med lukkede filmstriper eller tom flate, som originalen
    // knappen «Fyll plassholderne med mine filer» finnes i mediepanelet
    expect(await page.locator('[data-md-fill-ph]').count(), k).toBeGreaterThan(0)
  }
  expect(errors).toEqual([])
})
