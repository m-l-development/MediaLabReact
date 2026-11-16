/**
 * Kontrollmåling uten appen: holder nettleseren selv på minne når et bilde (ca. 4 MB fil) gjentatte ganger
 * (a) lagres i IndexedDB under samme nøkkel, eller (b) vises via en blob:-adresse som frigjøres etterpå?
 * Skiller nettleserens egne bufre fra lekkasjer i appen. MEM_MODE=idb|img.
 *   MEM_MODE=img npx playwright test -c e2e-mem/playwright.config.ts e2e-mem/browser-baseline.spec.ts
 */
import { test } from '@playwright/test'

test('nettleserens grunnlinje: IndexedDB og blob-bilder', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/app/')
  const br = await page.context().browser()!.newBrowserCDPSession()
  const cdp = await page.context().newCDPSession(page)
  const alloc = async () => {
    for (let i = 0; i < 2; i++) await cdp.send('HeapProfiler.collectGarbage')
    const ev: { ph?: string; pid?: number; name?: string; args?: { name?: string; dumps?: { allocators?: Record<string, { attrs?: Record<string, { value?: string }> }> } } }[] = []
    const done = new Promise<void>((ok) => br.once('Tracing.tracingComplete', () => ok()))
    const on = (e: { value: typeof ev }) => { ev.push(...e.value) }
    br.on('Tracing.dataCollected', on)
    await br.send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [] } }, transferMode: 'ReportEvents' })
    await br.send('Tracing.requestMemoryDump', { deterministic: true, levelOfDetail: 'detailed' })
    await br.send('Tracing.end')
    await done
    br.off('Tracing.dataCollected', on)
    const kind = new Map<number, string>()
    for (const e of ev) if (e.ph === 'M' && e.name === 'process_name' && e.pid !== undefined) kind.set(e.pid, e.args?.name ?? '')
    let mb = 0
    for (const e of ev) if (e.ph === 'v' && /Renderer/.test(kind.get(e.pid ?? -1) ?? '')) { const v = e.args?.dumps?.allocators?.['partition_alloc/allocated_objects']?.attrs?.size?.value; if (v) mb += parseInt(v, 16) / 1048576 }
    return mb.toFixed(1)
  }
  const mode = process.env.MEM_MODE ?? 'img'
  for (let r = 0; r <= 6; r++) {
    if (r) {
      await page.evaluate(async (mode) => {
        // ca. 4 MB PNG med mønster (samme innhold hver gang)
        const c = document.createElement('canvas')
        c.width = 2400
        c.height = 3600
        const g = c.getContext('2d')!
        const id = g.createImageData(2400, 3600)
        for (let i = 0; i < id.data.length; i += 4) { const p = i / 4, x = p % 2400, y = (p / 2400) | 0; id.data[i] = (x * 3) & 255; id.data[i + 1] = (x + y * 2) & 255; id.data[i + 2] = (y * 7) & 255; id.data[i + 3] = 255 }
        g.putImageData(id, 0, 0)
        const b = await new Promise<Blob>((ok) => c.toBlob((x) => ok(x!), 'image/png'))
        c.width = 0
        if (mode === 'idb') {
          const db = await new Promise<IDBDatabase>((ok, no) => { const q = indexedDB.open('ml-baseline', 1); q.onupgradeneeded = () => q.result.createObjectStore('b'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error) })
          await new Promise<void>((ok, no) => { const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').put(b, 'k'); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error) })
          db.close()
        } else if (mode === 'full') {
          // som Thumbnail: lagre i IndexedDB, hent ut igjen, blob:-adresse, Image (ikke i siden), tegn på 1280×720, frigjør
          const db = await new Promise<IDBDatabase>((ok, no) => { const q = indexedDB.open('ml-baseline', 1); q.onupgradeneeded = () => q.result.createObjectStore('b'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error) })
          await new Promise<void>((ok, no) => { const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').put(b, 'k' + Math.random()); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error) })
          const keys = await new Promise<IDBValidKey[]>((ok) => { const q = db.transaction('b').objectStore('b').getAllKeys(); q.onsuccess = () => ok(q.result) })
          const got = await new Promise<Blob>((ok) => { const q = db.transaction('b').objectStore('b').get(keys[keys.length - 1]!); q.onsuccess = () => ok(q.result as Blob) })
          db.close()
          const u = URL.createObjectURL(got)
          const im = new Image()
          im.decoding = 'async'
          await new Promise((ok) => { im.onload = ok; im.src = u })
          const cv = document.createElement('canvas')
          cv.width = 1280
          cv.height = 720
          cv.getContext('2d')!.drawImage(im, 0, 0, 1280, 720)
          await new Promise((ok) => setTimeout(ok, 300))
          cv.width = 0
          URL.revokeObjectURL(u)
        } else {
          const u = URL.createObjectURL(b)
          const im = new Image()
          im.src = u
          await im.decode()
          document.body.append(im)
          await new Promise((ok) => setTimeout(ok, 300))
          im.remove()
          URL.revokeObjectURL(u)
        }
      }, mode)
    }
    console.log(`BASE ${mode} runde ${r}: allocated_objects ${await alloc()} MB`)
  }
})
