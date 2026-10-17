import { expect, test, type Page } from '@playwright/test'
import { appears, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, signInAs, signOut } from './helpers'

/**
 * PLT-17 – lokale data per bruker på samme PC, mot connecthub-dev (Admin og Bruker i samme nettleserprofil; kjøres av
 * run-dev.mjs i løpet «par»). Ingenting lagres på serveren: alt ligger i nettleserprofilen til testen, som forkastes.
 * 1. Eierløse data fra før innlogging (dagens apps nøkkel photodesign.cats) → konto 1 får spørsmålet og velger «Knytt til meg».
 * 2. Konto 1 lagrer et prosjekt i Photo Design og logger ut. Konto 2 logger inn i samme nettleser: får ikke spørsmålet,
 *    ser verken de eierløse dataene eller konto 1s prosjekt, og lagrer sitt eget.
 * 3. Konto 2 velger «Fjern mine lokale data» → logges ut. Konto 1 logger inn igjen: alt sitt er der.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair', 'kjøres av run-dev.mjs med to kontoer')
test.beforeEach(async ({ page }) => injectBackend(page))

const LEGACY_CAT = 'Eierløs kategori fra før'

async function projectNames(p: Page) {
  await p.goto('/app/photo-design')
  await expect(p.getByRole('heading', { level: 1, name: 'Photo design' })).toBeVisible({ timeout: 30_000 })
  await p.waitForTimeout(800)
  return p.locator('[data-project]').evaluateAll((els) => els.map((e) => e.getAttribute('data-project') ?? ''))
}
async function hasLegacyCat(p: Page) {
  await p.goto('/app/photo-design')
  await expect(p.getByRole('heading', { level: 1, name: 'Photo design' })).toBeVisible({ timeout: 30_000 })
  return appears(p.getByText(LEGACY_CAT).first(), 3_000)
}
async function saveProject(p: Page) {
  await p.goto('/app/photo-design')
  await p.locator('[data-tpl="photo"]').click()
  await expect(p.locator('[data-pd-view="edit"]')).toBeVisible({ timeout: 30_000 })
  await p.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(p.getByText('Prosjektet er lagret.')).toBeVisible({ timeout: 20_000 })
}

test('PLT-17: to brukere på samme PC – «Knytt til meg», adskilte data og «Fjern mine lokale data»', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
  const rows = ['| Steg | Resultat |', '|---|---|']
  try {
    // 0. eierløse data fra før innlogging (samme nøkkel som dagens app bruker)
    await page.goto('/login')
    await page.evaluate((cat) => localStorage.setItem('photodesign.cats', JSON.stringify([cat, 'Søndagsmøte'])), LEGACY_CAT)

    // 1. konto 1 (Admin): spørsmålet vises → «Knytt til meg»
    await signInAs(page, EMAIL, PASSWORD)
    const ask = page.getByRole('dialog', { name: 'Prosjekter fra før innlogging' })
    const asked = await appears(ask, 30_000)
    rows.push(`| Konto 1: spørsmål om data fra før innlogging | ${asked ? 'vist' : '**ikke vist**'} |`)
    expect(asked).toBe(true)
    // appen laster siden på nytt etter et øyeblikk, så verktøyene leser dataene med de nye navnene
    const reloaded = page.waitForEvent('load', { timeout: 15_000 })
    await ask.getByRole('button', { name: 'Knytt til meg' }).click()
    await reloaded
    await expectHub(page)
    const own1 = await hasLegacyCat(page)
    rows.push(`| Konto 1 ser de eierløse dataene etter «Knytt til meg» | ${own1 ? 'ja' : '**nei**'} |`)
    if (!own1) {
      console.log('DIAG', JSON.stringify(await page.evaluate(() => Object.keys(localStorage).filter((k) => /photodesign|ch.local/.test(k)).map((k) => [k.replace(/[0-9a-f-]{36}/, '<id>'), (localStorage.getItem(k) ?? '').slice(0, 80)]))))
      console.log('DIAG chips', JSON.stringify(await page.locator('button[aria-pressed]').allTextContents()))
      await page.screenshot({ path: info.outputPath('plt17.png'), fullPage: true })
    }
    expect(own1).toBe(true)
    await saveProject(page)
    const p1 = await projectNames(page)
    rows.push(`| Konto 1 lagret et prosjekt | ${p1.length} prosjekt(er) |`)
    expect(p1.length).toBeGreaterThan(0)
    await signOut(page)

    // 2. konto 2 (Bruker) i samme nettleser
    await signInAs(page, EMAIL2, PASSWORD2)
    await expectHub(page)
    const asked2 = await appears(page.getByRole('dialog', { name: 'Prosjekter fra før innlogging' }), 4_000)
    const sees = await hasLegacyCat(page)
    const p2before = await projectNames(page)
    rows.push(`| Konto 2: spørsmål / ser eierløse data / ser konto 1s prosjekter | ${asked2 ? '**vist**' : 'ikke vist'} / ${sees ? '**ja**' : 'nei'} / ${p2before.length ? `**${p2before.length}**` : '0'} |`)
    expect([asked2, sees, p2before.length]).toEqual([false, false, 0])
    await saveProject(page)
    const p2 = await projectNames(page)
    rows.push(`| Konto 2 lagret sitt eget prosjekt | ${p2.length} prosjekt(er) |`)
    expect(p2.length).toBe(1)

    // 3. konto 2: «Fjern mine lokale data» → logges ut
    await page.getByRole('button', { name: 'Konto' }).click()
    await page.getByRole('button', { name: /Konto og sikkerhet/ }).click()
    await page.locator('[data-ch-wipe]').click()
    await page.locator('[data-ch-wipe-go]').click()
    await expect(page.getByLabel('E-post').or(page.getByRole('button', { name: 'Bruk en annen konto' })).first()).toBeVisible({ timeout: 30_000 })
    rows.push('| Konto 2: «Fjern mine lokale data» → utlogget | ja |')

    // konto 2 inn igjen: egne data borte
    await signInAs(page, EMAIL2, PASSWORD2)
    await expectHub(page)
    const p2after = await projectNames(page)
    rows.push(`| Konto 2 etter fjerning | ${p2after.length} prosjekt(er) |`)
    expect(p2after.length).toBe(0)
    await signOut(page)

    // konto 1 inn igjen: alt sitt er der
    await signInAs(page, EMAIL, PASSWORD)
    await expectHub(page)
    const p1after = await projectNames(page)
    const own1after = await hasLegacyCat(page)
    rows.push(`| Konto 1 etterpå: prosjekter / eierløse data | ${p1after.length} / ${own1after ? 'ja' : '**nei**'} |`)
    expect([p1after.length, own1after]).toEqual([p1.length, true])
  } finally {
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('plt17', { body: report, contentType: 'text/markdown' })
  }
})
