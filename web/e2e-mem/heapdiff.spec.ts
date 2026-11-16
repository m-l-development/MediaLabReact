/**
 * Minneprofilering: hvilke objekttyper (også nettleserens egne, «native») vokser mellom runde 1 og runde 4 av et steg?
 * Sammenligner to heap-øyeblikksbilder (antall og selvstørrelse per navn) etter søppeltømming.
 *   MEM_STEP=thumbC npx playwright test -c e2e-mem/playwright.config.ts e2e-mem/heapdiff.spec.ts
 */
import { test, type CDPSession, type Page } from '@playwright/test'
import * as S from './steps'

async function snapshot(cdp: CDPSession): Promise<Map<string, { n: number; sz: number }>> {
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  const chunks: string[] = []
  const on = (e: { chunk: string }) => chunks.push(e.chunk)
  cdp.on('HeapProfiler.addHeapSnapshotChunk', on)
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  cdp.off('HeapProfiler.addHeapSnapshotChunk', on)
  const snap = JSON.parse(chunks.join('')) as { snapshot: { meta: { node_fields: string[]; node_types: (string[] | string)[] } }; nodes: number[]; strings: string[] }
  const nf = snap.snapshot.meta.node_fields, NF = nf.length
  const iName = nf.indexOf('name'), iSize = nf.indexOf('self_size'), iType = nf.indexOf('type')
  const types = snap.snapshot.meta.node_types[0] as string[]
  const out = new Map<string, { n: number; sz: number }>()
  for (let i = 0; i < snap.nodes.length; i += NF) {
    const t = types[snap.nodes[i + iType] as number] ?? ''
    const nm = `${t}:${(snap.strings[snap.nodes[i + iName] as number] ?? '').slice(0, 60)}`
    const e = out.get(nm) ?? { n: 0, sz: 0 }
    e.n++
    e.sz += snap.nodes[i + iSize] as number
    out.set(nm, e)
  }
  return out
}

test('vekst per objekttype mellom runde 1 og 4', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  const step = (S as unknown as Record<string, (p: Page) => Promise<void>>)[process.env.MEM_STEP ?? 'thumbC'] as (p: Page) => Promise<void>
  const cdp = await page.context().newCDPSession(page)
  const run = async () => { await step(page); await S.nav(page, '/app/'); await page.waitForTimeout(800) }
  await run()
  const a = await snapshot(cdp)
  for (let i = 0; i < 3; i++) await run()
  const b = await snapshot(cdp)
  const diff = [...b.entries()].map(([k, v]) => { const o = a.get(k) ?? { n: 0, sz: 0 }; return { k, dn: v.n - o.n, dsz: v.sz - o.sz } })
  for (const d of diff.filter((x) => /Blob|File|ImageBitmap|ImageData|ArrayBuffer|Image|Canvas|URL/.test(x.k) && x.dn !== 0)) console.log(`BLOB ${d.dn > 0 ? '+' : ''}${d.dn}  ${(d.dsz / 1048576).toFixed(2)} MB  ${d.k}`)
  for (const d of diff.sort((x, y) => y.dsz - x.dsz).slice(0, 15)) console.log(`DIFF ${(d.dsz / 1048576).toFixed(2)} MB  ${d.dn > 0 ? '+' : ''}${d.dn}  ${d.k}`)
})
