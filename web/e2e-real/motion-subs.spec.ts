import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * MD-11 – AI-undertekster (Whisper i nettleseren) med ekte tale, i ekte Chrome med WebGPU. Talen er laget lokalt med
 * Windows' talesyntese (engelsk stemme, `fixtures/tale-en.wav`): «Welcome to the Sunday meeting. Today we will talk
 * about hope and community.» Klippet lages i nettleseren (bilde + talen), slippes i Motion design, og undertekstene
 * skal inneholde ordene som ble sagt.
 */
const WAV = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'tale-en.wav')).toString('base64')
const WORDS = ['welcome', 'sunday', 'meeting', 'hope', 'community']

test('Motion design: AI-undertekster av ekte tale (Whisper, engelsk)', async ({ page }, info) => {
  test.setTimeout(600_000)
  const log: string[] = []
  page.on('console', (m) => { if (/webgpu|wasm|whisper|error/i.test(m.text())) log.push(m.text().slice(0, 160)) })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()

  // videoklipp med talen som lyd, tatt opp i sanntid i nettleseren
  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const ac = new AudioContext()
    const buf = await ac.decodeAudioData(bytes.buffer)
    const dst = ac.createMediaStreamDestination()
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(dst)
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 180
    const g = c.getContext('2d')
    const stream = c.captureStream(15)
    for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start(100)
    src.start()
    const ms = buf.duration * 1000 + 700, t0 = performance.now()
    await new Promise<void>((r) => {
      const draw = () => {
        if (g) {
          g.fillStyle = `hsl(${((performance.now() - t0) / 20) % 360},60%,45%)`
          g.fillRect(0, 0, 320, 180)
        }
        if (performance.now() - t0 < ms) requestAnimationFrame(draw)
        else r()
      }
      draw()
    })
    rec.stop()
    await done
    const dt = new DataTransfer()
    dt.items.add(new File(chunks, 'tale.webm', { type: 'video/webm' }))
    const ed = document.querySelector('[data-md-editor]')
    ed?.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    ed?.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, WAV)
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1, { timeout: 15_000 })

  await page.getByRole('tab', { name: 'Undertekst' }).click()
  await page.getByRole('button', { name: 'Engelsk', exact: true }).click()
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Lag undertekster med AI' }).click()
  const result = page.getByText(/undertekster er laget|Fant ingen tale i klippene|Klarte ikke å lage undertekster/).first()
  await expect(result).toBeVisible({ timeout: 540_000 })
  const secs = Math.round((Date.now() - t0) / 1000)
  const msg = ((await result.textContent()) ?? '').trim()
  const text = (await page.locator('[data-md-editor]').evaluate((el) => {
    const parts: string[] = []
    el.querySelectorAll('textarea, input[type="text"]').forEach((x) => parts.push((x as HTMLInputElement).value))
    return parts.join(' ') + ' ' + (el.textContent ?? '')
  })).toLowerCase()
  const found = WORDS.filter((w) => text.includes(w))
  const report = [
    '| Kontroll | Resultat |', '|---|---|',
    `| Melding | «${msg}» etter ${secs} s |`,
    `| Ord som ble sagt og står i undertekstene | ${found.length} av ${WORDS.length}: ${found.join(', ') || '–'} |`,
    `| Konsoll (WebGPU/WASM/feil) | ${log.slice(0, 4).join(' · ') || '–'} |`,
  ].join('\n')
  console.log(`\n${report}\n`)
  await info.attach('md11', { body: report, contentType: 'text/markdown' })
  expect(msg).toMatch(/undertekster er laget/)
  expect(found.length).toBeGreaterThanOrEqual(3)
})
