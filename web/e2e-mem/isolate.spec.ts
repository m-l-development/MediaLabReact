/** Minnemåling, bare Isolate Subject, steg for steg og fordelt på prosesstype (se memory.spec.ts). */
import { execSync } from 'node:child_process'
import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { png } from '../e2e/png'

const BIG = png(4000, 3000, (x, y) => [(x * 7 + y) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255, 255])

function procs(): string {
  try {
    const out = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | ForEach-Object { $t = if ($_.CommandLine -match '--type=([a-z-]+)') { $matches[1] } else { 'browser' }; '{0}={1}' -f $t, [math]::Round($_.PrivatePageCount/1MB) }"`, { encoding: 'utf8' })
    const sum: Record<string, number> = {}
    for (const l of out.trim().split(/\r?\n/)) { const [k, v] = l.split('='); if (k) sum[k] = (sum[k] ?? 0) + Number(v) }
    return Object.entries(sum).map(([k, v]) => `${k} ${v}`).join(' · ')
  } catch {
    return '?'
  }
}

async function m(page: Page, cdp: CDPSession, step: string) {
  await page.waitForTimeout(800)
  for (let i = 0; i < 2; i++) await cdp.send('HeapProfiler.collectGarbage')
  await page.waitForTimeout(400)
  const x = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((q) => [q.name, q.value]))
  console.log(`MEM ${step.padEnd(24)} heap ${(((x.JSHeapUsedSize ?? 0) / 1048576)).toFixed(1)} MB  noder ${x.Nodes}  | ${procs()}`)
}

const nav = (page: Page, p: string) => page.evaluate((q) => { history.pushState(null, '', q); dispatchEvent(new PopStateEvent('popstate')) }, p)

test('isolate steg for steg', async ({ page }) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  await m(page, cdp, 'start')
  for (let c = 1; c <= 2; c++) {
    await nav(page, '/app/isolate-subject')
    await page.waitForTimeout(500)
    await m(page, cdp, `${c} åpnet`)
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
    await (await ch).setFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
    await expect(page.getByRole('button', { name: 'Hopp over' })).toBeVisible({ timeout: 30_000 })
    await m(page, cdp, `${c} lastet (beskjæring)`)
    await page.getByRole('button', { name: 'Hopp over' }).click()
    await m(page, cdp, `${c} arbeidsvisning`)
    await page.getByRole('button', { name: /^Merk i bildet/ }).click()
    await page.locator('[data-fill-mode]').getByRole('button', { name: 'Gjør uskarp', exact: true }).click()
    const b = await page.locator('main canvas').first().boundingBox()
    if (!b) throw new Error('lerret')
    await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, { steps: 6 })
    await page.mouse.up()
    await m(page, cdp, `${c} merket`)
    await page.locator('[data-mark-apply]').click()
    await expect(page.locator('[data-effect="blur"]')).toBeVisible({ timeout: 30_000 })
    await m(page, cdp, `${c} uskarp`)
    await nav(page, '/app/')
    await m(page, cdp, `${c} lukket`)
  }
})
