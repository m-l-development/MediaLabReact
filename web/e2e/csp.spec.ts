import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * PLT-13: den bygde appen (samme byggeprosess som produksjon, med utviklingsunntaket «uten backend» på, se
 * playwright.config.ts) kjører under produksjonens CSP fra media-lab/vercel.json uten brudd. Ingen CDN, ingen
 * inline-skript utenom selvreparasjonen (hashen står i CSP-en).
 */
const vercel = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../media-lab/vercel.json'), 'utf8')) as {
  headers: { has?: unknown[]; headers: { key: string; value: string }[] }[]
}
const PROD_CSP = vercel.headers.filter((h) => h.has).flatMap((h) => h.headers).find((x) => x.key === 'Content-Security-Policy')?.value ?? ''
// localhost har ikke https; resten av regelen er uendret
const CSP = PROD_CSP.replace(/;\s*upgrade-insecure-requests/, '')

test.use({ baseURL: 'http://localhost:4180' })

async function withCsp(page: Page) {
  expect(PROD_CSP).toContain("script-src 'self'")
  const violations: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      ;((window as { __csp?: string[] }).__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()) })
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const r = await route.fetch()
    await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': CSP } })
  })
  return async () => [...violations, ...((await page.evaluate(() => (window as { __csp?: string[] }).__csp ?? [])) as string[])]
}

test('bygget kjører under produksjonens CSP: forsiden, alle verktøy og Loop-editoren', async ({ page }) => {
  test.setTimeout(180_000)
  const check = await withCsp(page)
  await page.goto('/app/')
  await expect(page.getByRole('heading', { level: 1, name: 'Media Lab' })).toBeVisible()
  // inline-stilene og den selvdrevne fonten er tillatt
  expect(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.status === 'loaded') })).toBe(true)
  expect(await check()).toEqual([])
  for (const [url, ready] of [
    ['/app/photo-design', 'Photo design'], ['/app/thumbnail-studio', 'Thumbnail Studio'], ['/app/motion-design', 'Motion design'],
    ['/app/mockups', null], ['/app/isolate-subject', null], ['/app/medier', null],
  ] as const) {
    await page.goto(url)
    if (ready) await expect(page.getByRole('heading', { level: 1, name: ready })).toBeVisible()
    else await expect(page.locator('h1').first()).toBeVisible()
    expect(await check(), url).toEqual([])
  }
  // Loop-editoren: lerret, spiller og arbeidere
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(await check(), 'loop-editor').toEqual([])
})
