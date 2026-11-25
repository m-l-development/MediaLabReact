/**
 * Minnemåling for Thumbnail Studio (Mac/Safari-rapporten 2026-11-25): gjentatte arbeidsøkter i samme side – ny mal, stort
 * bilde, filter, dra laget (tegning per bilde), bytte bilde, eksportdialog (1080p og 4K), tilbake til biblioteket.
 * Måler totalt privat minne for nettleserens prosesser etter hver økt (Windows), og JS-heap i Chromium.
 *   MEM_BROWSER=webkit|chromium (standard chromium)  MEM_CYCLES=6
 *   npx playwright test -c e2e-mem/playwright.config.ts thumbnail-session
 */
import fs from 'node:fs'
import { devices, expect, test, type Page } from '@playwright/test'
import { BIG, nav, pick, TALL } from './steps'
import { canvasMB, procMB, sampleTop, trackCanvases } from './canvas-track'

const WEBKIT = process.env.MEM_BROWSER === 'webkit'
const CYCLES = Number(process.env.MEM_CYCLES ?? 5)
if (WEBKIT) test.use({ ...devices['Desktop Safari'], browserName: 'webkit', launchOptions: {} })

async function session(page: Page, i: number) {
  await nav(page, '/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  // stort bildelag (valgt)
  await pick(page, page.getByRole('button', { name: 'Bilde', exact: true }).first(), { name: `a${i}.png`, mimeType: 'image/png', buffer: i % 2 ? BIG : TALL })
  const sel = page.locator('[data-ts-sel]')
  await expect(sel).toBeVisible({ timeout: 60_000 })
  // filtre på bildelaget (midlertidige lerreter per tegning)
  await page.getByRole('combobox', { name: 'Legg til filter …' }).selectOption('F06')
  await page.getByRole('combobox', { name: 'Legg til filter …' }).selectOption('F10')
  // dra laget fram og tilbake (én tegning per bevegelse)
  const b = await sel.boundingBox()
  if (b) {
    for (let r = 0; r < 3; r++) {
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width / 2 + 80, b.y + b.height / 2 + 20, { steps: 25 })
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 })
      await page.mouse.up()
    }
  }
  // Avansert modus: dra justeringer (hver verdi tegner bildet justert)
  const adv = page.locator('[data-adv-toggle]')
  if ((await adv.getAttribute('aria-checked')) !== 'true') await adv.click()
  for (const key of ['exp', 'warm']) {
    const r = page.locator(`[data-adv-key="${key}"]`).first()
    if (!(await r.count())) continue
    await r.focus()
    for (let k = 0; k < 20; k++) await page.keyboard.press('ArrowRight')
  }
  // bytt bilde
  const swap = page.getByRole('button', { name: 'Bytt bilde' }).first()
  if (await swap.count()) await pick(page, swap, { name: `b${i}.png`, mimeType: 'image/png', buffer: i % 2 ? TALL : BIG })
  else console.log('MEM (ingen «Bytt bilde»)')
  await page.waitForTimeout(1500)
  // eksportdialogen: 1080p, så 4K
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 60_000 })
  await exp.getByRole('button', { name: /4K/ }).click()
  await page.waitForTimeout(500)
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 60_000 })
  await exp.getByRole('button', { name: 'Avbryt' }).click()
  await expect(exp).toBeHidden()
  // tilbake til biblioteket (editoren lukkes)
  await nav(page, '/app/thumbnail-studio?cat=sunday')
  await page.waitForTimeout(300)
}

test('minne: gjentatte arbeidsøkter i Thumbnail Studio', async ({ page, browserName }) => {
  test.setTimeout(1_800_000)
  await page.addInitScript(trackCanvases)
  if (process.env.MEM_CV_DEBUG) page.on('console', (m) => { if (m.text().startsWith('CV ')) console.log('MEM ' + m.text()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null
  if (cdp) await cdp.send('Performance.enable')
  const rows: { step: string; procMB: number; heapMB: number | null; topMB?: number; canvasWaitingMB?: number; canvasMadeMB?: number }[] = []
  const measure = async (step: string) => {
    await page.waitForTimeout(3000)
    let heap: number | null = null
    if (cdp) {
      for (let k = 0; k < 2; k++) await cdp.send('HeapProfiler.collectGarbage')
      await page.waitForTimeout(500)
      const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
      heap = Math.round(((m.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10
    }
    const r = { step, procMB: procMB(), heapMB: heap }
    rows.push(r)
    console.log(`MEM ${browserName} ${step.padEnd(12)} prosesser ${r.procMB} MB${heap != null ? `  heap ${heap} MB` : ''}`)
  }
  await page.goto('/app/thumbnail-studio?cat=sunday')
  await expect(page.getByRole('button', { name: /Ny mal/ })).toBeVisible({ timeout: 60_000 })
  await measure('start')
  let peak = 0
  for (let i = 1; i <= CYCLES; i++) {
    sampleTop(true)
    await session(page, i)
    const top = sampleTop(false)
    await measure(`økt ${i}`)
    rows.at(-1)!.topMB = top
    const cv = await canvasMB(page)
    Object.assign(rows.at(-1)!, { canvasWaitingMB: cv.waiting, canvasMadeMB: cv.made })
    console.log(`MEM ${browserName} økt ${i} lerreter: laget ${cv.made} MB, venter på søppeltømming ${cv.waiting} MB (${cv.count} stk)`)
    console.log(`MEM ${browserName} økt ${i} topp under økten ${top} MB`)
    peak = Math.max(peak, rows.at(-1)!.procMB)
  }
  if (process.env.MEM_OUT) fs.writeFileSync(process.env.MEM_OUT, JSON.stringify({ browserName, rows }, null, 2))
  console.log(`MEM ${browserName} vekst økt 2→${CYCLES}: ${rows.at(-1)!.procMB - rows[Math.min(2, rows.length - 1)]!.procMB} MB, topp ${peak} MB`)
})
