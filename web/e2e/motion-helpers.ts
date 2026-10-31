import { expect, type Page } from '@playwright/test'
import { png } from './png'

/** Felles hjelpere for Motion Design → Avansert-testene. */

/** Enkel WAV (mono, 8 kHz, 16 bit): tone fra `from` til `to` sekunder, ellers stille. */
export function wav(sec: number, from = 0, to = sec, hz = 440, amp = 8000): Buffer {
  const rate = 8000
  const n = Math.round(rate * sec)
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const t = i / rate
    b.writeInt16LE(t >= from && t < to ? Math.round(Math.sin(t * 2 * Math.PI * hz) * amp) : 0, 44 + i * 2)
  }
  return b
}

export const solid = (name: string, rgb: [number, number, number], w = 160, h = 90) => ({ name, mimeType: 'image/png', buffer: png(w, h, () => [...rgb, 255]) })

export async function newAdvProject(page: Page, w = 1440, h = 900) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-bin]')).toBeVisible()
}

export async function importFiles(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[], expectCount: number) {
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles(files)
  await expect(page.locator('[data-md-bin-item]')).toHaveCount(expectCount, { timeout: 30_000 })
}

export const tc = (page: Page) => page.locator('[data-md-tc]')

/** Spillehodet til `sec` hele sekunder (Home + Shift+→). */
export async function seekTo(page: Page, sec: number) {
  await tc(page).click()
  await page.keyboard.press('Home')
  for (let i = 0; i < sec; i++) await page.keyboard.press('Shift+ArrowRight')
  await expect(tc(page)).toHaveText(`00:00:${String(sec).padStart(2, '0')}:00`)
}

/** Fargen midt i forhåndsvisningen. */
export const center = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const d = g.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]
})

/** Venter til fargen midt i forhåndsvisningen oppfyller `ok`. */
export async function centerIs(page: Page, ok: (c: number[]) => boolean, message: string) {
  await expect.poll(async () => ok(await center(page)), { message }).toBe(true)
}

export const isColor = (c: number[], k: 0 | 1 | 2) => (c[k] ?? 0) > 150 && c.every((v, i) => i === k || v < 90)
export const isGray = (c: number[]) => Math.max(...c) - Math.min(...c) < 8
export const main = (page: Page) => page.locator('[data-row="video"] [data-block="clip"]')

export async function saveAndReload(page: Page) {
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  // prosjektet åpnes direkte igjen etter omlasting (adressen husker det)
  await page.reload()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
}

/**
 * Ekte videofil (WebM fra MediaRecorder, med lyd): fargesegmenter etter hverandre, ett sekund hvert som standard
 * (f.eks. rødt 0–1 s, grønt 1–2 s, blått 2–3 s) og en tone (440 Hz) hele veien. Tas opp i nettleseren i sanntid.
 */
export async function recordVideo(page: Page, name: string, colors: string[], segSec = 1): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const b64 = await page.evaluate(async ({ cols, seg }) => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 180
    const g = c.getContext('2d') as CanvasRenderingContext2D
    const ac = new AudioContext()
    const osc = ac.createOscillator()
    osc.frequency.value = 440
    const dst = ac.createMediaStreamDestination()
    osc.connect(dst)
    osc.start()
    const stream = c.captureStream(30)
    for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    g.fillStyle = cols[0] ?? '#000'
    g.fillRect(0, 0, 320, 180)
    rec.start(100)
    const t0 = performance.now()
    const total = cols.length * seg
    await new Promise<void>((r) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000
        g.fillStyle = cols[Math.min(cols.length - 1, Math.floor(t / seg))] ?? '#000'
        g.fillRect(0, 0, 320, 180)
        if (t < total + 0.15) requestAnimationFrame(draw)
        else r()
      }
      draw()
    })
    rec.stop()
    await done
    osc.stop()
    await ac.close()
    const buf = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return btoa(s)
  }, { cols: colors, seg: segSec })
  return { name, mimeType: 'video/webm', buffer: Buffer.from(b64, 'base64') }
}
