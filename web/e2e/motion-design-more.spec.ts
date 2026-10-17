import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/*
 * Motion design: funksjonene som tidligere var uprøvd. Kjøres på PC.
 * - Prosjektmappe: nettleserens mappevelger kan ikke styres i en test, så showDirectoryPicker gir en ekte mappe i
 *   nettleserens private filsystem (OPFS). Alt etter valget (kopiering, tilgang, frigjøring, åpning) er appens egen kode.
 * - Voiceover: Chrome med falsk mikrofon (--use-fake-device-for-media-stream).
 */
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'Testes på PC'))

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}
async function newProject(page: Page) {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
}
async function dropVideo(page: Page, secs: number) {
  await page.evaluate(async (s) => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 180
    const g = c.getContext('2d')
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination()
    osc.connect(dst)
    osc.start()
    const stream = c.captureStream(30)
    for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start(100)
    const t0 = performance.now()
    await new Promise<void>((r) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000
        if (g) { g.fillStyle = `hsl(${(t * 120) % 360}, 80%, 50%)`; g.fillRect(0, 0, 320, 180) }
        if (t < s) requestAnimationFrame(draw)
        else r()
      }
      draw()
    })
    rec.stop()
    await done
    osc.stop()
    void ac.close()
    const dt = new DataTransfer()
    dt.items.add(new File(chunks, 'klipp.webm', { type: 'video/webm' }))
    const ed = document.querySelector('[data-md-editor]')
    ed?.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    ed?.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, secs)
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1, { timeout: 15000 })
}

/** Bildefrekvens og størrelse fra MP4-filen (mdhd-tidsskala, stts og tkhd i videosporet). */
function mp4Info(b: Buffer): { w: number; h: number; fps: number } {
  const find = (type: string, from = 0) => b.indexOf(Buffer.from(type, 'latin1'), from)
  const tk = find('tkhd')
  const ver = b[tk + 4] ?? 0
  const wOff = tk + 4 + (ver === 1 ? 88 : 76)
  const w = b.readUInt32BE(wOff) / 65536, h = b.readUInt32BE(wOff + 4) / 65536
  const md = find('mdhd')
  const mver = b[md + 4] ?? 0
  const scale = b.readUInt32BE(md + 4 + (mver === 1 ? 20 : 12))
  const st = find('stts')
  const delta = b.readUInt32BE(st + 4 + 4 + 4 + 4)
  return { w, h, fps: Math.round(scale / delta) }
}

test('prosjektmappe: kopier dit, frigjør plass i nettleseren og åpne fra mappen igjen', async ({ page }) => {
  test.setTimeout(120000)
  const errors = await errorsOf(page)
  page.on('dialog', (d) => void d.accept())
  await page.addInitScript(() => {
    ;(window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle('Mitt prosjekt', { create: true })
  })
  await newProject(page)
  await dropVideo(page, 2)
  await page.locator('[class*="folderBtn"]').click()
  await page.getByRole('button', { name: 'Kopier til prosjektmappe …' }).click()
  await expect(page.getByText(/Prosjektet ligger nå i mappen «Mitt prosjekt»/)).toBeVisible({ timeout: 30000 })
  const files = await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Mitt prosjekt')
    const out: string[] = []
    for await (const [n, h] of (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (h.kind === 'directory') for await (const [m] of (h as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) out.push(n + '/' + m)
      else out.push(n)
    }
    return out.sort()
  })
  expect(files).toContain('prosjekt.motion.json')
  expect(files.some((f) => f.startsWith('media/'))).toBe(true)

  // dialogen står åpen etter kopieringen
  await page.getByRole('button', { name: 'Frigjør plass i nettleseren' }).click()
  await expect(page.getByText(/1 filer er fjernet fra nettleseren/)).toBeVisible()
  // etter omlasting hentes videoen fra mappen
  await page.reload()
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1, { timeout: 15000 })
  await expect(page.getByText(/filer mangler og vises tomme/)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('voiceover med mikrofon legges på lydsporet', async ({ page }) => {
  const errors = await errorsOf(page)
  await newProject(page)
  await dropVideo(page, 3)
  await page.getByRole('tab', { name: 'Musikk' }).click()
  await page.getByRole('button', { name: /Ta opp voiceover/ }).click()
  await expect(page.getByRole('button', { name: /Stopp opptak/ })).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Stopp opptak/ }).click()
  await expect(page.locator('[data-block="music"], [data-block="audio"], [data-block="vo"]')).toHaveCount(1, { timeout: 10000 })
  await expect(page.getByText(/Voiceover \d\d\.\d\d\.wav/).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('eksport 1080p60 og 4K30 (bildefrekvens og størrelse kontrollert i filen)', async ({ page }) => {
  test.setTimeout(300000)
  const errors = await errorsOf(page)
  await newProject(page)
  await dropVideo(page, 1)
  for (const [label, want] of [['1080p · 60 fps', { w: 1920, h: 1080, fps: 60 }], ['4K · 30 fps', { w: 3840, h: 2160, fps: 30 }]] as const) {
    if (!(await page.getByRole('dialog', { name: 'Eksporter video' }).isVisible())) await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
    await page.getByRole('button', { name: new RegExp(label.replace(/[·.]/g, '.')) }).click()
    const dl = page.waitForEvent('download', { timeout: 240000 })
    await page.getByRole('button', { name: 'Eksporter MP4' }).click()
    const d = await dl
    const buf = fs.readFileSync(await d.path())
    expect(buf.subarray(4, 8).toString('latin1')).toBe('ftyp')
    expect(mp4Info(buf)).toEqual(want)
    await expect(page.getByText(/^Ferdig på/)).toBeVisible()
  }
  expect(errors).toEqual([])
})
