/**
 * Minnemåling (ikke en del av de vanlige testene): åpner og lukker hver editor flere ganger i samme side (navigering i
 * appen, ingen omlasting), med store bilder, og måler etter tvungen søppeltømming:
 * - JS-heap, DOM-noder, lyttere og dokumenter (Chrome DevTools-protokollen)
 * - totalt minne for nettleserens prosesser (Windows: sum av privat minne for Playwright-nettleserens prosesser)
 * Kjøres med `npx playwright test -c e2e-mem/playwright.config.ts`. Resultatet skrives som tabell og som JSON (MEM_OUT).
 */
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { test, type CDPSession, type Page } from '@playwright/test'
import { isolate, loop, motion, nav, photo, thumbnail } from './steps'

const CYCLES = Number(process.env.MEM_CYCLES ?? 3)

interface Sample { step: string; heapMB: number; nodes: number; listeners: number; docs: number; procMB: number; rendMB: number; gpuMB: number; layout: number }
const rows: Sample[] = []

/** Privat minne (MB) for nettleserens prosesser: totalt, sideprosessene (renderer) og GPU-prosessen (lerreter, bilder). */
function procMB(): { all: number; rend: number; gpu: number } {
  try {
    const out = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | ForEach-Object { '{0} {1}' -f $_.PrivatePageCount, ($_.CommandLine -replace '.*--type=([a-z-]+).*', '$1') }"`, { encoding: 'utf8' })
    let all = 0, rend = 0, gpu = 0
    for (const l of out.trim().split(/\r?\n/)) {
      const [n, t] = l.trim().split(' ')
      const mb = Number(n) / 1048576
      if (!Number.isFinite(mb)) continue
      all += mb
      if (t === 'renderer') rend += mb
      if (t === 'gpu-process') gpu += mb
    }
    return { all: Math.round(all), rend: Math.round(rend), gpu: Math.round(gpu) }
  } catch {
    return { all: -1, rend: -1, gpu: -1 }
  }
}

async function measure(page: Page, cdp: CDPSession, step: string) {
  await page.waitForTimeout(800)
  for (let i = 0; i < 2; i++) await cdp.send('HeapProfiler.collectGarbage')
  await page.waitForTimeout(400)
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const p = procMB()
  const r: Sample = { step, heapMB: Math.round(((m.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10, nodes: m.Nodes ?? 0, listeners: m.JSEventListeners ?? 0, docs: m.Documents ?? 0, procMB: p.all, rendMB: p.rend, gpuMB: p.gpu, layout: m.LayoutObjects ?? 0 }
  rows.push(r)
  console.log(`MEM ${step.padEnd(28)} heap ${String(r.heapMB).padStart(6)} MB  noder ${String(r.nodes).padStart(6)}  lyttere ${String(r.listeners).padStart(5)}  dok ${r.docs}  prosesser ${r.procMB} MB (side ${r.rendMB}, GPU ${r.gpuMB})  layout ${r.layout}`)
}

test('minne: åpne og lukke editorene, bytte apper, stå i ro', async ({ page }) => {
  test.setTimeout(1_800_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  await measure(page, cdp, 'start (forsiden)')
  const all: [string, (p: Page) => Promise<void>][] = [['photo-design', photo], ['thumbnail', thumbnail], ['motion', motion], ['loop', loop], ['isolate', isolate]]
  // MEM_ONLY=isolate,loop … måler bare de verktøyene; MEM_NO_AI=1 stenger AI-nedlastingene ute (skiller modellminnet fra resten)
  const only = process.env.MEM_ONLY?.split(',')
  const tools = only ? all.filter(([n]) => only.includes(n)) : all
  if (process.env.MEM_NO_AI) await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  for (let c = 1; c <= CYCLES; c++) {
    for (const [name, run] of tools) {
      try {
        await run(page)
        await measure(page, cdp, `${name} ${c} (åpen)`)
      } catch (e) {
        console.log(`FEIL ${name} ${c}: ${(e as Error).message.split('\n')[0]}`)
      }
      await nav(page, '/app/')
      await measure(page, cdp, `${name} ${c} (lukket)`)
    }
  }
  await page.waitForTimeout(60_000)
  await measure(page, cdp, 'etter 60 s i ro')
  if (process.env.MEM_OUT) fs.writeFileSync(process.env.MEM_OUT, JSON.stringify(rows, null, 1))
})
