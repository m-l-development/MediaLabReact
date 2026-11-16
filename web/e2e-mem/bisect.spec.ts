/**
 * Minne: deler opp bildeveien når et bilde settes inn (≈ 4 MB vekst per bilde i sideprosessen, se statusdokumentet).
 * Hvert ledd kjøres alene N ganger i en ny side med samme bilde som i profileringen (TALL, ≈ 3 MB PNG), og
 * sideprosessens allokatorer måles før og etter (etter GC og minnepress). Ledd:
 *   file     – bare lage File-objektet
 *   hash     – sha256 (crypto.subtle.digest over hele filen)
 *   probe    – browserProbe.probe (mål + miniatyr)
 *   img      – blob:-adresse + <img> dekoding + revoke
 *   bitmap / fetchbitmap – createImageBitmap direkte / etter fetch av blob:-adressen (Motion)
 *   imgnodecode, imgclear, datauri – varianter av <img>
 *   register – hele assets.register (hash, IndexedDB, probe, miniatyr)
 *   getblob  – innholdet hentet tilbake fra IndexedDB (som ImageCache gjør ved hver åpning) + <img>
 *   MEM_N=8 npx playwright test -c e2e-mem/bisect.config.ts
 */
import { test, type CDPSession, type Page } from '@playwright/test'
import { TALL } from './steps'

const N = Number(process.env.MEM_N ?? 8)
const PARTS = (process.env.MEM_BISECT ?? 'file,hash,probe,img,register,getblob').split(',')

async function rendererMB(br: CDPSession): Promise<{ total: number; pa: number; blink: number; v8: number }> {
  const events: { ph?: string; pid?: number; name?: string; args?: { name?: string; dumps?: { allocators?: Record<string, { attrs?: Record<string, { value?: string }> }>; process_totals?: Record<string, string> } } }[] = []
  const done = new Promise<void>((ok) => br.once('Tracing.tracingComplete', () => ok()))
  const on = (e: { value: typeof events }) => { events.push(...e.value) }
  br.on('Tracing.dataCollected', on)
  await br.send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [] } }, transferMode: 'ReportEvents' })
  await br.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' })
  await br.send('Tracing.end')
  await done
  br.off('Tracing.dataCollected', on)
  const kind = new Map<number, string>()
  for (const e of events) if (e.ph === 'M' && e.name === 'process_name' && e.pid !== undefined) kind.set(e.pid, e.args?.name ?? '')
  const r = { total: 0, pa: 0, blink: 0, v8: 0 }
  const sz = (a: Record<string, { attrs?: Record<string, { value?: string }> }>, k: string) => parseInt(a[k]?.attrs?.effective_size?.value ?? a[k]?.attrs?.size?.value ?? '0', 16) / 1048576
  for (const e of events) {
    if (e.ph !== 'v' || e.pid === undefined || !/Renderer/i.test(kind.get(e.pid) ?? '')) continue
    const a = e.args?.dumps?.allocators ?? {}
    r.pa += sz(a, 'partition_alloc')
    r.blink += sz(a, 'blink_gc')
    r.v8 += sz(a, 'v8')
    const pm = e.args?.dumps?.process_totals?.private_footprint_bytes
    if (pm) r.total += parseInt(pm, 16) / 1048576
  }
  return r
}

async function settle(page: Page, cdp: CDPSession) {
  await page.waitForTimeout(500)
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('Memory.simulatePressureNotification', { level: 'critical' })
  await page.waitForTimeout(1500)
  await cdp.send('HeapProfiler.collectGarbage')
}

for (const part of PARTS) {
  test(`bildeveien: ${part}`, async ({ page }) => {
    test.setTimeout(600_000)
    const cdp = await page.context().newCDPSession(page)
    const br = await page.context().browser()!.newBrowserCDPSession()
    await page.goto('/app/')
    await page.locator('main').first().waitFor()
    // bildet overføres én gang; hver runde lager et nytt File-objekt av det (som ved et nytt filvalg)
    await page.evaluate(async (b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      ;(window as unknown as { __src: Blob }).__src = new Blob([bin], { type: 'image/png' })
      const W = window as unknown as Record<string, unknown>
      W.__hash = (await import('/app/src/services/assets/hash.ts' as string)).sha256
      W.__probe = (await import('/app/src/infrastructure/media/probe.ts' as string)).browserProbe
      const ws = await (await import('/app/src/app/workspace-factory.ts' as string)).createWorkspace(null)
      W.__assets = ws.workspace.assets
    }, TALL.toString('base64'))
    await settle(page, cdp)
    const a = await rendererMB(br)
    for (let i = 0; i < N; i++) {
      await page.evaluate(async (p) => {
        const W = window as unknown as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
        const file = new File([W.__src as Blob], 'person.png', { type: 'image/png' })
        const show = (b: Blob) => new Promise<void>((ok) => { const u = URL.createObjectURL(b); const im = new Image(); im.onload = im.onerror = () => { void im.decode?.().catch(() => undefined); URL.revokeObjectURL(u); ok() }; im.src = u })
        if (p === 'fetchbitmap') { const u = URL.createObjectURL(file); const bm = await createImageBitmap(await (await fetch(u)).blob()); bm.close(); URL.revokeObjectURL(u) }
        else if (p === 'bitmap') { const bm = await createImageBitmap(file); bm.close() }
        else if (p === 'imgnodecode') await new Promise<void>((ok) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = im.onerror = () => { URL.revokeObjectURL(u); ok() }; im.src = u })
        else if (p === 'imgclear') await new Promise<void>((ok) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = im.onerror = () => { URL.revokeObjectURL(u); im.src = 'data:,'; ok() }; im.src = u })
        else if (p === 'datauri') await new Promise<void>((ok) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = r.result as string }; r.readAsDataURL(file) })
        else if (p === 'hash') await W.__hash(file)
        else if (p === 'probe') await W.__probe.probe(file, 'image')
        else if (p === 'img') await show(file)
        else if (p === 'register') await W.__assets.register(file)
        else if (p === 'getblob') {
          const as = await W.__assets.register(file)
          const blob = await W.__assets.getContent?.(as.id) ?? await W.__assets.open?.(as.id)
          if (blob) await show(blob as Blob)
        }
      }, part)
    }
    await settle(page, cdp)
    const b = await rendererMB(br)
    const d = (k: keyof typeof a) => ((b[k] - a[k]) / N).toFixed(2)
    console.log(`BISECT ${part.padEnd(9)} per runde: total ${d('total')} MB | partition_alloc ${d('pa')} | blink_gc ${d('blink')} | v8 ${d('v8')}   (før total ${a.total.toFixed(0)}, etter ${b.total.toFixed(0)})`)
  })
}
