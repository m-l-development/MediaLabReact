import { expect, test } from '@playwright/test'
import { EMAIL, PASSWORD, expectHub } from './helpers'

/**
 * Publiseringsbygget mot connecthub-dev (media-lab `npm run build` med /app, servert av `vite preview` med samme ruter og
 * /api som på Vercel; kjøres av e2e-dev/run-dev.mjs). Korte adresser og gamle sider går til den nye appen (lanseringen
 * 2026-10-17); /login og e-postlenkene er fortsatt dagens innloggingsside.
 */
test.skip(!EMAIL || !PASSWORD || !process.env.ML_DEV_BASE, 'kjøres av run-dev.mjs mot publiseringsbygget')

const REDIRECTS: [string, RegExp][] = [
  ['/', /\/app\/$/], ['/home', /\/app\/$/], ['/loopstudio', /\/app\/loop-studio$/], ['/thumbnailstudio', /\/app\/thumbnail-studio$/],
  ['/photodesign', /\/app\/photo-design$/], ['/motiondesign', /\/app\/motion-design$/], ['/isolate', /\/app\/isolate-subject$/],
  ['/mockup', /\/app\/mockups$/], ['/admin', /\/app\/admin$/], ['/media-lab.dc.html', /\/app\/$/], ['/isolate-subject.dc.html', /\/app\/isolate-subject$/],
  ['/fellesmappe', /\/app\/admin#\/filer\/felles$/],
]

test('adresser: korte adresser og gamle sider sendes til den nye appen; /login.dc.html til /login', async ({ request }) => {
  for (const [from, to] of REDIRECTS) {
    const r = await request.get(from, { maxRedirects: 0 })
    expect(r.status(), from).toBe(307)
    expect(r.headers().location ?? '', from).toMatch(to)
  }
  const l = await request.get('/login.dc.html?token_hash=abc&type=recovery', { maxRedirects: 0 })
  expect(l.headers().location).toBe('/login?token_hash=abc&type=recovery')
  expect((await request.get('/login')).status()).toBe(200)
  expect((await request.get('/app/manifest.webmanifest')).status()).toBe(200)
})

test('innlogging via dagens innloggingsside (som i produksjonen) og videre inn i den nye appen', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))
  await page.goto('/login?next=%2Fapp%2Fadmin')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/admin/, { timeout: 30_000 })
  await expect(page.locator('main h1, main h2').first()).toBeVisible({ timeout: 30_000 })
  // samme økt i hele appen: korte adresser fører rett inn uten ny innlogging
  for (const p of ['/home', '/photodesign', '/isolate']) {
    await page.goto(p)
    await expect(page).toHaveURL(/\/app\//)
    if (p === '/home') await expectHub(page)
  }
  expect(errors, `sidefeil (${info.project.name})`).toEqual([])
})
