import { expect, test, type Page } from '@playwright/test'

/**
 * TB-95F738: statusmerkene i Admin → Brukere er lesbare i lys og mørk modus, målt i nettleseren på ekte data i Dev:
 * tekstfargen mot merkets faktiske bakgrunn (merkets tonede farge lagt over flaten bak) skal ha minst 4,5:1 (WCAG AA).
 * Bare lesing; den syntetiske admin-kontoen fra run-dev.mjs.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

/** Kontrast for hvert merke (ok/warn/bad) i gjeldende tema, regnet ut fra de beregnede fargene. */
const measure = (page: Page) => page.evaluate(() => {
  const parse = (s: string): number[] => {
    const m = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/.exec(s)
    if (m) return [+m[1]! * 255, +m[2]! * 255, +m[3]! * 255, m[4] ? +m[4] : 1]
    const r = /rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)/.exec(s)
    return r ? [+r[1]!, +r[2]!, +r[3]!, r[4] ? +r[4] : 1] : [0, 0, 0, 0]
  }
  const over = (a: number[], b: number[]) => [0, 1, 2].map((i) => a[i]! * a[3]! + b[i]! * (1 - a[3]!))
  const under = (el: Element): number[] => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor)
      if (c[3]! > 0.99) return c
      if (c[3]! > 0) return over(c, under(e))
    }
    return [255, 255, 255, 1]
  }
  const lum = (c: number[]) => {
    const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!)
  }
  const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const out: { v: string; n: number; min: number; text: string }[] = []
  for (const v of ['ok', 'warn', 'bad']) {
    const els = [...document.querySelectorAll(`.ch-badge.${v}`)]
    if (!els.length) continue
    const rs = els.map((el) => {
      const cs = getComputedStyle(el)
      const bg = over(parse(cs.backgroundColor), under(el))
      return ratio(parse(cs.color).slice(0, 3), bg)
    })
    out.push({ v, n: els.length, min: Math.round(Math.min(...rs) * 100) / 100, text: (els[0]!.textContent ?? '').trim().slice(0, 20) })
  }
  return { theme: document.documentElement.dataset.theme ?? 'dark', out }
})

test('statusmerker i Admin → Brukere: lesbare i lys og mørk modus (målt)', async ({ page }) => {
  await signIn(page)
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => localStorage.setItem('medialab.theme', t), theme)
    await page.goto('/app/admin#/brukere')
    // samme adresse med # laster ikke siden på nytt: last inn slik at temaet leses fra lagringen
    await page.reload()
    await expect(page.locator('.ch-badge.ok').first()).toBeVisible({ timeout: 30_000 })
    const r = await measure(page)
    console.log(`[merker] ${theme}: ${JSON.stringify(r)}`)
    expect(r.theme === 'light').toBe(theme === 'light')
    expect(r.out.some((x) => x.v === 'ok')).toBe(true)
    for (const x of r.out) expect(x.min, `${theme}: .ch-badge.${x.v} («${x.text}»)`).toBeGreaterThanOrEqual(4.5)
  }
})
