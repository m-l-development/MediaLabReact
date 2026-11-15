import { expect, test } from '@playwright/test'

/**
 * Loop: dekorative lyseffekter (nyttårsfyrverkeri/gnister, lysstriper, bokeh) følger fargetemaet. Uten tema brukes de
 * varme originalfargene; med tema er de varme gull-/kremfargene borte og temaets aksent tar over. Formen er den samme.
 */
test('lyseffektene følger fargetemaet, og originalfargene uten tema', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'samme motor; mobil dekkes av Loop-testene')
  await page.goto('/app/loop-studio')
  const r = await page.evaluate(async () => {
    const m = await import('/app/src/features/loop-studio/engine/player.js' as string)
    const R = m.__ukeloopRendererFactory()
    const c = document.createElement('canvas')
    c.width = 640; c.height = 360
    const g = c.getContext('2d')!
    const run = (fxPal: string[] | null, fx: string) => {
      let warm = 0, blue = 0, lit = 0
      for (const t of [0.4, 0.9, 1.4, 2.1]) {
        g.clearRect(0, 0, 640, 360)
        g.fillStyle = '#000'; g.fillRect(0, 0, 640, 360)
        const data = { cfg: { accent: fxPal ? fxPal[0] : '#f5b82c', overlayFx: fx, fxAmount: 1, ovAlpha: 1, rail: false, header: '', topLabel: '', ...(fxPal ? { fxPal } : {}) }, slides: [{ id: 's1', type: 'text', title: '', dur: 5 }] }
        try { R.drawFrame(g, 640, 360, data, { images: {}, video: null }, t) } catch (e) { return { err: String(e) } }
        const d = g.getImageData(0, 0, 640, 360).data
        for (let i = 0; i < d.length; i += 16) {
          const [rr, gg, bb] = [d[i]!, d[i + 1]!, d[i + 2]!]
          if (rr + gg + bb > 90) lit++
          if (rr > 150 && gg > 100 && bb < rr - 60) warm++
          if (bb > rr + 50 && bb > 90) blue++
        }
      }
      return { warm, blue, lit }
    }
    return { std: run(null, 'newyear'), themed: run(['#0b4fd6', '#3a7bd5'], 'newyear'), stdB: run(null, 'bokeh'), themedB: run(['#0b4fd6', '#3a7bd5'], 'bokeh') }
  })
  console.log(JSON.stringify(r))
  expect((r.std as { err?: string }).err).toBeUndefined()
  // uten tema: varme gnister; med tema: ingen varme farger igjen, blå i stedet, og like mye lys (samme form)
  expect(r.std.warm ?? 0).toBeGreaterThan(20)
  expect(r.themed.warm ?? 0).toBeLessThan((r.std.warm ?? 0) * 0.05)
  expect(r.themed.blue ?? 0).toBeGreaterThan(20)
  expect(r.themed.lit ?? 0).toBeGreaterThan((r.std.lit ?? 0) * 0.6)
  expect(r.themedB.warm ?? 0).toBeLessThanOrEqual(r.stdB.warm ?? 0)
})
