/**
 * Minneprofilering med Chromes egen instrumentering (memory-infra): sideprosessens minne fordelt på allokator –
 * V8 (JavaScript), blink_gc (DOM-objekter), partition_alloc (strenger, buffere), malloc, skia/cc (bilder, lag),
 * discardable (dekodede bilder), font_caches, web_cache, gpu – etter hver runde gjennom editorene. Til slutt: 60 s i ro
 * (forsinket frigjøring), så simulert kritisk minnepress (bufre tømmes). Det som blir igjen etter press og vokser per
 * runde, er reell vekst; det som forsvinner, er buffer.
 *   MEM_CYCLES=15 MEM_OUT=fil.json npx playwright test -c e2e-mem/playwright.config.ts e2e-mem/profile.spec.ts
 */
import fs from 'node:fs'
import { test, type CDPSession, type Page } from '@playwright/test'
import { isolate, loop, motion, nav, photo, thumbA, thumbB, thumbC, thumbC1, thumbnail } from './steps'

const CYCLES = Number(process.env.MEM_CYCLES ?? 12)
const KEYS = ['v8', 'blink_gc', 'partition_alloc', 'partition_alloc/partitions/array_buffer', 'partition_alloc/partitions/buffer', 'partition_alloc/partitions/fast_malloc', 'partition_alloc/partitions/layout', 'malloc', 'skia', 'cc', 'discardable', 'font_caches', 'web_cache', 'gpu', 'sqlite', 'shared_memory', 'canvas']
type Dump = Record<string, number>

/** En detaljert minnedump for alle prosesser; gir sideprosessenes allokatorer summert (MB) og privat minne. */
async function dump(br: CDPSession): Promise<{ rend: Dump; other: Dump }> {
  const events: { ph?: string; pid?: number; name?: string; args?: { dumps?: { allocators?: Record<string, { attrs?: Record<string, { value?: string }> }>; process_totals?: Record<string, string> }; name?: string; labels?: string } }[] = []
  const done = new Promise<void>((ok) => br.once('Tracing.tracingComplete', () => ok()))
  const onData = (e: { value: typeof events }) => { events.push(...e.value) }
  br.on('Tracing.dataCollected', onData)
  await br.send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [] } }, transferMode: 'ReportEvents' })
  await br.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' })
  await br.send('Tracing.end')
  await done
  br.off('Tracing.dataCollected', onData)
  const kind = new Map<number, string>()
  for (const e of events) if (e.ph === 'M' && e.name === 'process_name' && e.pid !== undefined) kind.set(e.pid, e.args?.name ?? '')
  const rend: Dump = {}, other: Dump = {}
  for (const e of events) {
    if (e.ph !== 'v' || e.pid === undefined) continue
    const isR = /Renderer/i.test(kind.get(e.pid) ?? '')
    const tgt = isR ? rend : other
    const a = e.args?.dumps?.allocators ?? {}
    for (const k of KEYS) {
      const sz = a[k]?.attrs?.effective_size?.value ?? a[k]?.attrs?.size?.value
      if (sz) tgt[k] = (tgt[k] ?? 0) + parseInt(sz, 16) / 1048576
    }
    if (isR && process.env.MEM_PARTS) for (const [k, v] of Object.entries(a)) if (k.startsWith('partition_alloc/') && k.split('/').length <= 3) { const z = v.attrs?.effective_size?.value ?? v.attrs?.size?.value; if (z) tgt['P:' + k.slice(16)] = (tgt['P:' + k.slice(16)] ?? 0) + parseInt(z, 16) / 1048576 }
    const pm = e.args?.dumps?.process_totals?.private_footprint_bytes ?? e.args?.dumps?.process_totals?.resident_set_bytes
    if (pm) tgt.total = (tgt.total ?? 0) + parseInt(pm, 16) / 1048576
  }
  return { rend, other }
}

const rows: { step: string; rend: Dump; other: Dump }[] = []
async function measure(page: Page, cdp: CDPSession, br: CDPSession, step: string) {
  await page.waitForTimeout(800)
  for (let i = 0; i < 2; i++) await cdp.send('HeapProfiler.collectGarbage')
  await page.waitForTimeout(400)
  const d = await dump(br)
  rows.push({ step, ...d })
  const f = (x: Dump) => ['total', ...KEYS, ...Object.keys(x).filter((k) => k.startsWith('P:'))].filter((k) => (x[k] ?? 0) >= 0.5).map((k) => `${k} ${(x[k] ?? 0).toFixed(1)}`).join(' | ')
  console.log(`PROF ${step.padEnd(26)} SIDE ${f(d.rend)}  ||  ANDRE total ${(d.other.total ?? 0).toFixed(0)} gpu ${(d.other.gpu ?? 0).toFixed(1)}`)
}

test('minneprofil: allokatorer per runde, i ro og under minnepress', async ({ page }) => {
  test.setTimeout(3_600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const cdp = await page.context().newCDPSession(page)
  const br = await page.context().browser()!.newBrowserCDPSession()
  if (process.env.MEM_NO_AI) await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  await measure(page, cdp, br, 'start')
  const all: [string, (p: Page) => Promise<void>][] = [['photo-design', photo], ['thumbnail', thumbnail], ['motion', motion], ['loop', loop], ['isolate', isolate], ['thumbA', thumbA], ['thumbB', thumbB], ['thumbC', thumbC], ['thumbC1', thumbC1]]
  const only = process.env.MEM_ONLY?.split(',')
  const tools = only ? all.filter(([n]) => only.includes(n)) : all.slice(0, 5)
  for (let c = 1; c <= CYCLES; c++) {
    for (const [, run] of tools) {
      await run(page).catch((e: Error) => console.log('FEIL', e.message.split('\n')[0]))
      await nav(page, '/app/')
    }
    await measure(page, cdp, br, `runde ${c}`)
  }
  if (process.env.MEM_RELOAD) {
    await page.reload()
    await page.locator('main').first().waitFor()
    await measure(page, cdp, br, 'etter ny innlasting')
  }
  await page.waitForTimeout(60_000)
  await measure(page, cdp, br, 'etter 60 s i ro')
  await cdp.send('Memory.simulatePressureNotification', { level: 'critical' })
  await page.waitForTimeout(5_000)
  await measure(page, cdp, br, 'etter minnepress')
  if (process.env.MEM_OUT) fs.writeFileSync(process.env.MEM_OUT, JSON.stringify(rows, null, 1))
})
