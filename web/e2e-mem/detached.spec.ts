/**
 * Minnemåling: frakoblede DOM-noder som lever etter at en editor er lukket (MEM_STEP = photo|thumbnail|motion|loop|
 * isolate, to ganger). Skriver ut antall per type og de vanligste kjedene som holder dem.
 */
import { test, type Page } from '@playwright/test'
import * as S from './steps'

test('frakoblede noder', async ({ page }) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  const step = (S as unknown as Record<string, (p: Page) => Promise<void>>)[process.env.MEM_STEP ?? 'photo'] as (p: Page) => Promise<void>
  for (let i = 0; i < 2; i++) {
    await step(page)
    await S.nav(page, '/app/')
    await page.waitForTimeout(800)
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('HeapProfiler.collectGarbage')
  const chunks: string[] = []
  cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk))
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  const snap = JSON.parse(chunks.join('')) as { snapshot: { meta: { node_fields: string[]; edge_fields: string[]; edge_types: string[][] } }; nodes: number[]; edges: number[]; strings: string[] }
  const nf = snap.snapshot.meta.node_fields, NF = nf.length, ef = snap.snapshot.meta.edge_fields, EF = ef.length
  const iName = nf.indexOf('name'), iEC = nf.indexOf('edge_count'), iDet = nf.indexOf('detachedness')
  const eTo = ef.indexOf('to_node'), eName = ef.indexOf('name_or_index'), eType = ef.indexOf('type')
  const etypes = snap.snapshot.meta.edge_types[0] as string[]
  const N = snap.nodes.length / NF
  const name = (n: number) => snap.strings[snap.nodes[n * NF + iName] as number] ?? ''
  const ret: number[][] = Array.from({ length: N }, () => [])
  const via: string[][] = Array.from({ length: N }, () => [])
  for (let n = 0, e = 0; n < N; n++) {
    const ec = snap.nodes[n * NF + iEC] as number
    for (let k = 0; k < ec; k++, e += EF) {
      const et = etypes[snap.edges[e + eType] as number]
      if (et === 'weak') continue
      const to = (snap.edges[e + eTo] as number) / NF
      ret[to]?.push(n)
      via[to]?.push(et === 'element' || et === 'hidden' ? String(snap.edges[e + eName]) : snap.strings[snap.edges[e + eName] as number] ?? '')
    }
  }
  const detached: number[] = []
  const byType: Record<string, number> = {}
  for (let n = 0; n < N; n++) {
    if ((snap.nodes[n * NF + iDet] as number) !== 2) continue
    detached.push(n)
    const t = name(n).split(' ')[0] ?? ''
    byType[t] = (byType[t] ?? 0) + 1
  }
  console.log(`DET ${process.env.MEM_STEP ?? 'photo'}: ${detached.length} frakoblede; ` + Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '))
  // fra hver frakoblede node: bredde-først oppover til første vanlige JS-objekt (ikke DOM/intern), og kjeden videre
  const isDom = (x: number) => (snap.nodes[x * NF + iDet] as number) !== 0 || /^(<|HTML|SVG|Text|Comment|cppgc|blink|CSS|system|InternalNode|DocumentFragment|\(|NamedNodeMap|Attr|DOMTokenList|EventListener|V8EventListener)/.test(name(x))
  const chains: Record<string, number> = {}
  const done = new Set<number>()
  for (const d of detached) {
    const q: number[] = [d]
    const prev = new Map<number, number>([[d, -1]])
    let hit = -1
    while (q.length && hit < 0 && prev.size < 4000) {
      const cur = q.shift() as number
      for (const x of ret[cur] ?? []) {
        if (prev.has(x)) continue
        prev.set(x, cur)
        if (!isDom(x)) { hit = x; break }
        q.push(x)
      }
    }
    if (hit < 0 || done.has(hit)) continue
    done.add(hit)
    const out: string[] = []
    let cur = hit
    const seen = new Set<number>([hit])
    out.push(name(hit).slice(0, 40))
    for (let k = 0; k < 10; k++) {
      const r = ret[cur] ?? []
      const i = r.findIndex((x) => !seen.has(x) && !/^\(GC roots/.test(name(x)))
      if (i < 0) break
      const x = r[i] as number
      seen.add(x)
      out.push(`${(via[cur] ?? [])[i]} ← ${name(x).slice(0, 36)}`)
      cur = x
    }
    const key = out.join(' | ')
    chains[key] = (chains[key] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(chains).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`DET ${v}× ${k}`)
})
