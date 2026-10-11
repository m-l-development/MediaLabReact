import { expect, test } from '@playwright/test'

/* AI-undertekster (Whisper i nettleseren). Krever nett første gang (talemodellen lastes ned fra Hugging Face).
   Lyden her er en tone, ikke tale: testen viser at modellen lastes og kjører helt gjennom, ikke hvor god teksten blir. */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil' || !process.env.RUN_AI, 'Kjøres bare med RUN_AI=1 (nett og lang tid). I hodeløs Chrome ble tolkingen ikke ferdig (2026-10-11), se docs/gjenoppretting.md'))

test('AI-undertekster: talemodellen lastes og kjøres på klippets lyd @nett', async ({ page }) => {
  test.setTimeout(600000)
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 90
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination()
    osc.connect(dst); osc.start()
    const stream = c.captureStream(15); for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' }); const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data); const done = new Promise((r) => (rec.onstop = r))
    rec.start(100); const g = c.getContext('2d'); const t0 = performance.now()
    await new Promise<void>((r) => { const draw = () => { if (g) { g.fillStyle = 'hsl(' + ((performance.now() - t0) / 10 % 360) + ',70%,50%)'; g.fillRect(0, 0, 160, 90) } if (performance.now() - t0 < 2500) requestAnimationFrame(draw); else r() }; draw() })
    rec.stop(); await done; osc.stop()
    const dt = new DataTransfer(); dt.items.add(new File(chunks, 'tale.webm', { type: 'video/webm' }))
    const ed = document.querySelector('[data-md-editor]')
    ed?.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    ed?.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1, { timeout: 15000 })
  await page.getByRole('tab', { name: 'Undertekst' }).click()
  await page.getByRole('button', { name: 'Lag undertekster med AI' }).click()
  await expect(page.getByText(/undertekster er laget|Fant ingen tale i klippene|Klarte ikke å lage undertekster/)).toBeVisible({ timeout: 540000 })
  await expect(page.getByText(/Klarte ikke å lage undertekster/)).toHaveCount(0)
})
