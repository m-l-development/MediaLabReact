/**
 * Minnemåling: hva holder frakoblede lerreter/bilder i live etter at en editor er lukket? Korteste sterke sti fra
 * GC-røttene (bredde først over ikke-svake kanter) til frakoblede <canvas>/<img>, og hvor mye pikselminne de holder.
 * Kjøres med MEM_STEP=photo|thumbnail|motion|loop|isolate (to runder) og ev. MEM_NO_AI=1.
 *   npx playwright test -c e2e-mem/playwright.config.ts e2e-mem/retain.spec.ts
 */
import { test, type Page } from '@playwright/test'
import * as S from './steps'

test('hva holder frakoblede lerreter og bilder', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  if (process.env.MEM_NO_AI) await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  page.on('console', (m) => { if (m.args().length && /input|HTML|Element|object/i.test(m.text())) console.log('KONSOLL', m.type(), m.text().slice(0, 200)) })
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  const step = (S as unknown as Record<string, (p: Page) => Promise<void>>)[process.env.MEM_STEP ?? 'isolate'] as (p: Page) => Promise<void>
  for (let i = 0; i < 2; i++) {
    await step(page).catch((e: Error) => console.log('STEG', e.message.split('\n')[0]))
    console.log('LASTET', await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`).join(' ')))
    await S.nav(page, '/app/')
    await page.waitForTimeout(800)
  }
  const cdp = await page.context().newCDPSession(page)
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  const chunks: string[] = []
  cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk))
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  const snap = JSON.parse(chunks.join('')) as { snapshot: { meta: { node_fields: string[]; edge_fields: string[]; edge_types: string[][]; node_types: string[][] } }; nodes: number[]; edges: number[]; strings: string[] }
  const nf = snap.snapshot.meta.node_fields, NF = nf.length, ef = snap.snapshot.meta.edge_fields, EF = ef.length
  const iName = nf.indexOf('name'), iEC = nf.indexOf('edge_count'), iDet = nf.indexOf('detachedness'), iSize = nf.indexOf('self_size')
  const eTo = ef.indexOf('to_node'), eName = ef.indexOf('name_or_index'), eType = ef.indexOf('type')
  const etypes = snap.snapshot.meta.edge_types[0] as string[]
  const N = snap.nodes.length / NF
  const name = (n: number) => snap.strings[snap.nodes[n * NF + iName] as number] ?? ''
  const first: number[] = new Array(N)
  for (let n = 0, e = 0; n < N; n++) { first[n] = e; e += (snap.nodes[n * NF + iEC] as number) * EF }
  // bredde først fra roten (node 0) over sterke kanter
  const prev = new Int32Array(N).fill(-2), pe = new Int32Array(N).fill(-1)
  prev[0] = -1
  const q = [0]
  for (let h = 0; h < q.length; h++) {
    const n = q[h] as number
    const ec = snap.nodes[n * NF + iEC] as number
    for (let k = 0, e = first[n] as number; k < ec; k++, e += EF) {
      const et = etypes[snap.edges[e + eType] as number]
      if (et === 'weak' || et === 'shortcut') continue
      const to = (snap.edges[e + eTo] as number) / NF
      if (prev[to] !== -2) continue
      prev[to] = n
      pe[to] = e
      q.push(to)
    }
  }
  const edgeName = (e: number) => { const et = etypes[snap.edges[e + eType] as number]; return et === 'element' || et === 'hidden' ? `[${snap.edges[e + eName]}]` : snap.strings[snap.edges[e + eName] as number] ?? '' }
  const targets: number[] = []
  let canv = 0, imgs = 0, other = 0
  for (let n = 0; n < N; n++) {
    if ((snap.nodes[n * NF + iDet] as number) !== 2) continue
    const nm = name(n)
    if (/canvas|HTMLCanvas|<img|HTMLImage/i.test(nm)) { targets.push(n); if (/canvas/i.test(nm)) canv++; else imgs++ } else other++
  }
  console.log(`RET ${process.env.MEM_STEP}: frakoblede lerreter ${canv}, bilder ${imgs}, andre noder ${other}`)
  const paths: Record<string, number> = {}
  for (const t of targets.slice(0, 40)) {
    if (prev[t] === -2) continue
    const p: string[] = []
    let cur = t
    while (cur > 0 && p.length < 40) { p.push(`${name(cur).slice(0, 48)} (${edgeName(pe[cur] as number)})`); cur = prev[cur] as number }
    // fra roten mot målet; de første leddene (rot, globale objekter) er de interessante
    const key = p.reverse().slice(0, 14).join(' → ')
    paths[key] = (paths[key] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`RET ${v}× ${k}`)
  void iSize
})
