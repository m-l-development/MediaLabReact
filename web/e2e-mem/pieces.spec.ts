/** Minnemåling: enkeltoperasjoner i Isolate på et 4000×3000-bilde, hver for seg (se isolate.spec.ts). */
import { execSync } from 'node:child_process'
import { test } from '@playwright/test'

const renderer = () => Math.round(Number(execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' -and $_.CommandLine -like '*--type=renderer*' } | Measure-Object -Property PrivatePageCount -Sum).Sum"`, { encoding: 'utf8' }).trim()) / 1048576)

test('deler', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  const cdp = await page.context().newCDPSession(page)
  const gc = async () => { await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(600) }
  await gc()
  console.log('MEM start ' + renderer())
  for (const step of ['canvas', 'rgba', 'blur', 'blur', 'distance']) {
    await page.evaluate(async (s) => {
      const R = await import('/app/src/features/isolate-subject/engine/raster.ts' as string)
      const B = await import('/app/src/features/isolate-subject/engine/blur.ts' as string)
      const I = await import('/app/src/features/isolate-subject/engine/inpaint.ts' as string)
      const W = 4000, H = 3000
      const w = window as unknown as { keep?: unknown[] }
      w.keep ??= []
      const c = R.makeCanvas(W, H)
      if (s === 'canvas') { w.keep.push(c); return }
      const rgba = R.rgbaOf(c)
      if (s === 'rgba') return
      const m = new Uint8ClampedArray(W * H)
      for (let y = 900; y < 1800; y++) for (let x = 1200; x < 2400; x++) m[y * W + x] = 255
      if (s === 'blur') { B.blurArea(rgba, W, H, m, 50, 13); return }
      I.distance(Uint8Array.from(m), W, H)
    }, step)
    await gc()
    console.log('MEM etter ' + step + ' ' + renderer())
  }
})
