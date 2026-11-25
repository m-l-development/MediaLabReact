/**
 * Minnemåling for alle verktøyene med bildebehandling (2026-11-25): gjentatte økter i samme side – åpne verktøyet, stort
 * bilde, redigere (maske/pensel, filtre, lag, angre/gjør om, dra), lukke (tilbake til forsiden) – i Chromium og WebKit.
 * Måler etter hver økt: prosessminne (Windows), topp under økten, JS-heap (Chromium, etter tvungen søppeltømming) og
 * lerretsregnskapet (lerreter som venter på søppeltømming – det Safari på Mac holder som GPU-minne).
 *   MEM_BROWSER=webkit|chromium  MEM_CYCLES=3  MEM_ONLY=photo,mockups …  MEM_NO_AI=1 (AI-nedlastinger stoppes)
 *   npx playwright test -c e2e-mem/playwright.config.ts apps-session
 */
import fs from 'node:fs'
import { devices, expect, test, type Page } from '@playwright/test'
import { BIG, isolate, loop, motion, nav, photo, pick, thumbnail } from './steps'
import { canvasMB, procMB, sampleTop, trackCanvases } from './canvas-track'

const CYCLES = Number(process.env.MEM_CYCLES ?? 3)
if (process.env.MEM_BROWSER === 'webkit') test.use({ ...devices['Desktop Safari'], browserName: 'webkit', launchOptions: {} })

/** Mockups: stort design på TV-en, dra designet rundt (ny tegning og ny maske per bevegelse), endre lys. */
async function mockups(page: Page) {
  await nav(page, '/app/mockups?mockup=tv-wall')
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 })
  await pick(page, page.getByRole('button', { name: /Last opp design|Bytt design/ }).first(), { name: 'design.png', mimeType: 'image/png', buffer: BIG })
  await page.locator('[data-mk-design-edit]').click()
  const handles = page.locator('[class*="designHandle"]')
  await expect(handles).toHaveCount(8, { timeout: 30_000 })
  const h = await handles.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] }))
  const mid = [h.reduce((s, p) => s + p[0]!, 0) / h.length, h.reduce((s, p) => s + p[1]!, 0) / h.length] as const
  for (let r = 0; r < 2; r++) {
    await page.mouse.move(mid[0], mid[1])
    await page.mouse.down()
    await page.mouse.move(mid[0] + 60, mid[1] + 30, { steps: 20 })
    await page.mouse.move(mid[0], mid[1], { steps: 20 })
    await page.mouse.up()
  }
  await page.locator('[data-mk-design-edit]').click()
}

const ALL: [string, (p: Page) => Promise<void>][] = [['photo', photo], ['isolate', isolate], ['motion', motion], ['loop', loop], ['mockups', mockups], ['thumbnail', thumbnail]]

test('minne: gjentatte økter i alle bildeverktøyene', async ({ page, browserName }) => {
  test.setTimeout(3_600_000)
  await page.addInitScript(trackCanvases)
  await page.setViewportSize({ width: 1440, height: 900 })
  if (process.env.MEM_NO_AI) await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null
  if (cdp) await cdp.send('Performance.enable')
  const rows: Record<string, unknown>[] = []
  const heap = async () => {
    if (!cdp) return null
    for (let k = 0; k < 2; k++) await cdp.send('HeapProfiler.collectGarbage')
    await page.waitForTimeout(500)
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
    return Math.round(((m.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10
  }
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  await canvasMB(page)
  rows.push({ app: 'start', i: 0, procMB: procMB(), heapMB: await heap() })
  const only = process.env.MEM_ONLY?.split(',')
  for (const [name, run] of ALL.filter(([n]) => !only || only.includes(n))) {
    for (let i = 1; i <= CYCLES; i++) {
      sampleTop(true)
      let err = ''
      await run(page).catch((e: Error) => {
        const m = e.message.split('\n')
        err = [m[0], m.find((l) => l.includes('waiting for'))].filter(Boolean).join(' – ')
      })
      await nav(page, '/app/')
      await page.waitForTimeout(3000)
      const top = sampleTop(false)
      const h = await heap()
      const cv = await canvasMB(page)
      const r = { app: name, i, procMB: procMB(), topMB: top, heapMB: h, canvasWaitingMB: cv.waiting, canvasMadeMB: cv.made, err }
      rows.push(r)
      console.log(`MEM ${browserName} ${name.padEnd(9)} økt ${i}  prosesser ${r.procMB} MB (topp ${top})${h != null ? `  heap ${h} MB` : ''}  lerreter laget ${cv.made} MB, venter ${cv.waiting} MB${err ? `  FEIL: ${err}` : ''}`)
    }
  }
  if (process.env.MEM_OUT) fs.writeFileSync(process.env.MEM_OUT, JSON.stringify({ browserName, rows }, null, 2))
})
