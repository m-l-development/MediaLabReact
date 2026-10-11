import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const IMAGE = path.resolve(import.meta.dirname, '../../media-lab/public/images/fredag.jpeg')

/** Samler konsollfeil, så en side med skjulte feil ikke regnes som godkjent. */
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Hver test starter med tom lagring (ny nettleserprofil per test i Playwright).
    if (!sessionStorage.getItem('e2e-started')) sessionStorage.setItem('e2e-started', '1')
  })
})

test('oversikten vises uten konsollfeil, i dagens visuelle uttrykk', async ({ page }, info) => {
  const errors = collectErrors(page)
  await page.goto('/app/')
  await expect(page.getByRole('heading', { level: 1, name: 'Media Lab' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Dine medier/ })).toBeVisible()
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  expect(bg).toBe('rgb(0, 0, 0)')
  // Archivo (selvdrevet font) må faktisk være lastet, ellers ser appen ikke ut som Media Lab.
  const archivo = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Archivo' && f.status === 'loaded') })
  expect(archivo).toBe(true)
  await page.waitForTimeout(600)
  await page.screenshot({ path: info.outputPath('ny-forside-mork.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('lys modus og engelsk huskes etter ny innlasting', async ({ page }, info) => {
  await page.goto('/app/')
  await page.getByRole('button', { name: 'Bytt mellom lys og mørk' }).click()
  await page.getByRole('button', { name: 'EN' }).click()
  await page.reload()
  await expect(page.getByRole('link', { name: /Your media/ })).toBeVisible()
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  expect(bg).toBe('rgb(228, 225, 218)')
  await page.screenshot({ path: info.outputPath('ny-forside-lys.png'), fullPage: true })
})

test('opplastet bilde lagres i nettleseren med miniatyr og finnes etter ny innlasting', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/app/medier')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Last opp' }).click()
  await (await chooser).setFiles(IMAGE)
  await expect(page.getByRole('status')).toContainText('1 fil(er) lagt til')
  const card = page.locator('li', { hasText: 'fredag.jpeg' })
  await expect(card).toBeVisible()
  const thumb = card.locator('img')
  await expect(thumb).toBeVisible()
  expect(await thumb.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // Samme fil på nytt gir ikke duplikat.
  const again = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Last opp' }).click()
  await (await again).setFiles(IMAGE)
  await expect(page.locator('li', { hasText: 'fredag.jpeg' })).toHaveCount(1)

  await page.reload()
  await expect(page.locator('li', { hasText: 'fredag.jpeg' })).toBeVisible()
  await expect(page.locator('li', { hasText: 'fredag.jpeg' }).locator('img')).toBeVisible()
  expect(errors).toEqual([])
})

test('mappene, verktøy-lenker og tilbake/fram i nettleseren', async ({ page }) => {
  await page.goto('/app/')
  await page.getByRole('button', { name: /Tools/ }).click()
  await expect(page).toHaveURL(/#tools$/)
  await page.getByRole('link', { name: /Mockups/ }).click()
  await expect(page).toHaveURL(/\/app\/mockups$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Mockups' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/#tools$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Media Lab' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible()
})

test('dagens forside (visuell fasit) – skjermbilde til sammenligning', async ({ page }, info) => {
  await page.goto('http://localhost:5190/home')
  await expect(page.getByRole('heading', { name: /Media Lab/i })).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: info.outputPath('dagens-forside-mork.png'), fullPage: true })
})

test('ny versjon: arbeidet lagres, «Senere» skjuler, «Oppdater nå» laster inn igjen uten tap (PLT-04)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Samme kode på mobil')
  const errors = collectErrors(page)
  await page.addInitScript(() => sessionStorage.setItem('ml.updateCheck', '1'))
  let v = 'dev'
  await page.route('**/app/version.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ v }) }))
  await page.goto('/app/loop-studio?mal=week')
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Onsdag kl 18 Lagret før oppdatering')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  const fire = () => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await fire()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-ml-update]')).toHaveCount(0)
  v = 'ny-versjon'
  await fire()
  const card = page.getByRole('alertdialog', { name: 'Ny versjon av Media Lab er klar' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Arbeidet ditt er lagret.')
  await card.getByRole('button', { name: 'Senere' }).click()
  await expect(card).toHaveCount(0)
  await fire()
  await page.waitForTimeout(500)
  await expect(card).toHaveCount(0)
  // «Oppdater nå» etter at utsettelsen er over (ny side = ny utsettelse)
  await page.reload()
  await fire()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Oppdater nå' }).click()
  await page.waitForLoadState('load')
  await expect(page.locator('[data-loop-card]')).toHaveCount(1)
  await expect(page.locator('[data-loop-card]').first()).toContainText('Lagret før oppdatering')
  expect(errors).toEqual([])
})

test('et verktøy som ikke kunne lastes, repareres ved å hente filene på nytt (PLT-05)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Samme kode på mobil')
  let n = 0
  await page.route('**/src/features/mockups/Mockups.tsx*', (r) => (n++ === 0 ? r.abort() : r.continue()))
  await page.goto('/app/mockups')
  await expect(page.getByRole('heading', { level: 1, name: 'Mockups' })).toBeVisible({ timeout: 15000 })
  expect(n).toBeGreaterThan(1)
  expect(await page.evaluate(() => sessionStorage.getItem('medialab.heal'))).toBe('1')
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('medialab.heal')), { timeout: 6000 }).toBeNull()
})

test('web-app: manifest og ikoner, kortet ved installasjonsprompt, «Ikke nå» i 14 dager (PLT-07)', async ({ page, request }, info) => {
  const m = await (await request.get('/app/manifest.webmanifest')).json() as { start_url: string; scope: string; icons: { src: string }[] }
  expect([m.start_url, m.scope]).toEqual(['/app/', '/app/'])
  for (const i of m.icons) expect((await request.get(i.src)).headers()['content-type']).toBe('image/png')
  await page.addInitScript(() => {
    // Nettleserens installasjonsprompt kan ikke utløses i en test; samme hendelse sendes med en registrert prompt().
    addEventListener('load', () => {
      const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): void; userChoice: Promise<unknown> }
      e.prompt = () => { (window as { prompted?: number }).prompted = ((window as { prompted?: number }).prompted ?? 0) + 1 }
      e.userChoice = Promise.resolve({ outcome: 'dismissed' })
      dispatchEvent(e)
    })
  })
  await page.goto('/app/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/app/manifest.webmanifest')
  const card = page.getByRole('dialog', { name: 'Media Lab som web-app' })
  await expect(card).toBeVisible({ timeout: 6000 })
  await expect(card).toContainText('Åpne Media Lab i eget vindu')
  await page.waitForTimeout(400)
  await page.screenshot({ path: info.outputPath('pwa-mork.png') })
  await card.getByRole('button', { name: 'Åpne i web-app' }).click()
  expect(await page.evaluate(() => (window as { prompted?: number }).prompted)).toBe(1)
  await expect(card).toBeHidden()
  // avbrutt installasjon = «Ikke nå»: ikke vist igjen etter ny innlasting
  await page.reload()
  await page.waitForTimeout(3500)
  await expect(card).toBeHidden()
  // etter 14 dager vises det igjen, også i lyst tema og på engelsk
  await page.evaluate(() => { localStorage.setItem('medialab.pwa.later', String(Date.now() - 15 * 864e5)) })
  await page.getByRole('button', { name: 'Bytt mellom lys og mørk' }).click()
  await page.getByRole('button', { name: 'EN' }).click()
  await page.reload()
  const en = page.getByRole('dialog', { name: 'Media Lab as a web app' })
  await expect(en).toBeVisible({ timeout: 6000 })
  expect(await en.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe('rgba(214, 213, 208, 0.95)')
  await page.waitForTimeout(400)
  await page.screenshot({ path: info.outputPath('pwa-lys-en.png') })
  await en.getByRole('button', { name: 'Not now' }).click()
  await expect(en).toBeHidden()
  expect(Number(await page.evaluate(() => localStorage.getItem('medialab.pwa.later')))).toBeGreaterThan(Date.now() - 60_000)
})
