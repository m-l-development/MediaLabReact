/**
 * Minne: blob:-adresser som aldri frigjøres (URL.createObjectURL uten revokeObjectURL) holder filinnholdet i
 * nettleserens minne til siden lastes på nytt – utenfor JavaScript-heapen. Teller åpne adresser per kodested (kallstakk)
 * etter at et steg (MEM_STEP) er gjentatt og verktøyet lukket.
 */
import { test, type Page } from '@playwright/test'
import * as S from './steps'

test('åpne blob:-adresser per kodested', async ({ page }) => {
  test.setTimeout(600_000)
  await page.addInitScript(() => {
    const open = new Map<string, { st: string; size: number }>()
    const mk = URL.createObjectURL.bind(URL)
    const rv = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (o: Blob | MediaSource) => {
      const u = mk(o)
      const st = (new Error().stack ?? '').split('\n').slice(2, 6).map((l) => l.trim().replace(/\(?https?:\/\/[^/]+\/(app\/)?/, '').replace(/\?[^:]*/, '')).join(' < ')
      open.set(u, { st, size: (o as Blob).size ?? 0 })
      return u
    }
    URL.revokeObjectURL = (u: string) => { open.delete(u); rv(u) }
    ;(window as unknown as { __blobs: () => { st: string; n: number; mb: number }[] }).__blobs = () => {
      const g = new Map<string, { n: number; mb: number }>()
      for (const { st, size } of open.values()) { const e = g.get(st) ?? { n: 0, mb: 0 }; e.n++; e.mb += size / 1048576; g.set(st, e) }
      return [...g.entries()].map(([st, v]) => ({ st, ...v })).sort((a, b) => b.mb - a.mb)
    }
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/')
  await page.locator('main').first().waitFor()
  const step = (S as unknown as Record<string, (p: Page) => Promise<void>>)[process.env.MEM_STEP ?? 'thumbC'] as (p: Page) => Promise<void>
  for (let i = 0; i < 3; i++) { await step(page); await S.nav(page, '/app/'); await page.waitForTimeout(800) }
  const list = await page.evaluate(() => (window as unknown as { __blobs: () => { st: string; n: number; mb: number }[] }).__blobs())
  for (const x of list.slice(0, 12)) console.log(`BLOB ${x.n}× ${x.mb.toFixed(2)} MB  ${x.st.slice(0, 300)}`)
  if (!list.length) console.log('BLOB ingen åpne adresser')
})
