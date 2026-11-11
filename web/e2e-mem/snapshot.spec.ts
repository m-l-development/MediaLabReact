/**
 * Minnemåling: heap-øyeblikksbilde etter at Isolate er lukket. Teller lerreter og store buffere som fortsatt lever,
 * og skriver ut kjeden av objekter som holder dem (for å finne hvem som ikke slipper).
 */
import { expect, test, type Page } from '@playwright/test'
import { png } from '../e2e/png'

const BIG = png(4000, 3000, (x, y) => [(x * 7 + y) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255, 255])
const nav = (page: Page, p: string) => page.evaluate((q) => { history.pushState(null, '', q); dispatchEvent(new PopStateEvent('popstate')) }, p)

test('hvem holder på lerretene etter Isolate', async ({ page }) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  await nav(page, process.env.MEM_TOOL ?? '/app/isolate-subject')
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await ch).setFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await page.locator('[data-fill-mode]').getByRole('button', { name: 'Gjør uskarp', exact: true }).click()
  const b = await page.locator('main canvas').first().boundingBox()
  if (!b) throw new Error('lerret')
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-mark-apply]').click()
  await expect(page.locator('[data-effect="blur"]')).toBeVisible({ timeout: 30_000 })
  if (!process.env.MEM_OPEN) await nav(page, '/app/')
  await page.waitForTimeout(1000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('HeapProfiler.collectGarbage')
  const chunks: string[] = []
  cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk))
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  const snap = JSON.parse(chunks.join('')) as { snapshot: { meta: { node_fields: string[]; node_types: string[][]; edge_fields: string[]; edge_types: string[][] } }; nodes: number[]; edges: number[]; strings: string[] }
  const nf = snap.snapshot.meta.node_fields, NF = nf.length
  const ef = snap.snapshot.meta.edge_fields, EF = ef.length
  const iName = nf.indexOf('name'), iSize = nf.indexOf('self_size'), iEC = nf.indexOf('edge_count'), iType = nf.indexOf('type')
  const eTo = ef.indexOf('to_node'), eName = ef.indexOf('name_or_index'), eType = ef.indexOf('type')
  const types = snap.snapshot.meta.node_types[0] as string[], etypes = snap.snapshot.meta.edge_types[0] as string[]
  const N = snap.nodes.length / NF
  const name = (n: number) => snap.strings[snap.nodes[n * NF + iName] as number] ?? ''
  // kanter og hvem som peker på hvem
  const firstEdge = new Int32Array(N)
  for (let n = 0, e = 0; n < N; n++) { firstEdge[n] = e; e += (snap.nodes[n * NF + iEC] as number) * EF }
  const retainers: number[][] = Array.from({ length: N }, () => [])
  const via: string[][] = Array.from({ length: N }, () => [])
  for (let n = 0; n < N; n++) {
    const e0 = firstEdge[n] as number, ec = snap.nodes[n * NF + iEC] as number
    for (let k = 0; k < ec; k++) {
      const e = e0 + k * EF, to = (snap.edges[e + eTo] as number) / NF
      const et = etypes[snap.edges[e + eType] as number]
      if (et === 'weak') continue
      const en = et === 'element' || et === 'hidden' ? String(snap.edges[e + eName]) : snap.strings[snap.edges[e + eName] as number]
      retainers[to]?.push(n)
      via[to]?.push(en ?? '')
    }
  }
  const big: { n: number; what: string; size: number }[] = []
  let canvases = 0
  for (let n = 0; n < N; n++) {
    const nm = name(n), sz = snap.nodes[n * NF + iSize] as number, ty = types[snap.nodes[n * NF + iType] as number]
    if (/HTMLCanvasElement/.test(nm)) { canvases++ }
    else if (/^(IsolateController|PhotoDesignController|ThumbController|LoopController|MotionController|AiSegmenter|FillRunner)$/.test(nm) && ty === 'object') big.push({ n, what: 'KONTROLLER ' + nm, size: 1e9 })
    else if (sz > 4_000_000) big.push({ n, what: `${ty}:${nm}`, size: sz })
  }
  console.log(`SNAP lerreter: ${canvases}, store objekter: ${big.length}`)
  const path = (n: number) => {
    const out: string[] = []
    let cur = n
    const seen = new Set<number>()
    for (let d = 0; d < 30; d++) {
      const r = retainers[cur] ?? []
      const i = r.findIndex((x) => !seen.has(x) && !/^\(GC roots|^\(Document DOM trees/.test(name(x)))
      if (i < 0) break
      seen.add(cur)
      out.push(`${(via[cur] ?? [])[i]} ← ${name(r[i] as number).slice(0, 40)}`)
      cur = r[i] as number
    }
    return out.join(' | ')
  }
  for (const x of big.sort((a, b) => b.size - a.size).slice(0, 14)) console.log(`SNAP ${x.what.slice(0, 40)} ${(x.size / 1048576).toFixed(1)} MB :: ${path(x.n)}`)
})
