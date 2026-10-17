import { expect, test, type Page } from '@playwright/test'
import { appears, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, rest, rpc, signInAs } from './helpers'

/**
 * TB-596FE4 og TB-BB67CB – Loop Studio delt i menigheten, med Admin (A) og Bruker (B) i «CH-test Menighet A» samtidig
 * (kjøres av run-dev.mjs i løpet «par»). Menighetens oppsett (loopstudio:bases og loopstudio:week) kopieres før
 * testen og legges tilbake etterpå (innholdet blir som før; versjonsnummeret øker).
 * 1. Felles grunnoppsett: A lagrer et grunnoppsett «felles» fra demoen → B ser det, lager en serie fra det, endrer
 *    og oppdaterer grunnoppsettet → A får Bs endring.
 * 2. Felles malsoppsett (loopstudio:week): A endrer overskriften i ukeprogrammet → B (åpent samtidig) får endringen.
 * 3. Isolering: B kan ikke lese en annen menighets oppsett.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair', 'kjøres av run-dev.mjs med to kontoer')
test.beforeEach(async ({ page }) => injectBackend(page))

type Row = { data: Record<string, unknown>; version: number } | null
const get = async (p: Page, church: string, scope: string) => (await rpc(p, 'church_settings_get', { p_church: church, p_scope: scope })).body as Row
const churchId = async (p: Page, name: string) => ((await rest(p, `/rest/v1/churches?select=id&name=eq.${encodeURIComponent(name)}`)).body as { id: string }[])[0]?.id ?? ''

test('Loop Studio delt i menigheten: grunnoppsett, malsoppsett og isolering', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(400_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  const ctxB = await browser.newContext({ baseURL: info.project.use.baseURL })
  const b = await ctxB.newPage()
  await injectBackend(b)
  for (const p of [page, b]) p.on('dialog', (d) => void d.accept())
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  await signInAs(b, EMAIL2, PASSWORD2)
  await expectHub(b)
  const church = await churchId(page, 'CH-test Menighet A')
  const snap = { bases: await get(page, church, 'loopstudio:bases'), week: await get(page, church, 'loopstudio:week') }
  rows.push(`| Kopi av menighetens oppsett før testen | bases v${snap.bases?.version ?? '–'}, week v${snap.week?.version ?? '–'} |`)
  const name = `E2E-delt-${Date.now()}`
  try {
    // ---------- 1. felles grunnoppsett ----------
    await b.goto('/app/loop-studio') // B har Loop Studio-siden åpen før A lagrer
    await page.goto('/app/loop-studio')
    await page.locator('[data-ch-demo-link]').click()
    await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-ch-demo-save]').click()
    const dlg = page.locator('[data-ch-base-dialog]')
    await dlg.locator('[data-ch-base-name]').fill(name)
    await dlg.locator('[data-ch-base-level="f"]').check()
    await dlg.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(page.getByText(/Grunnoppsettet er lagret og er felles for menigheten/)).toBeVisible({ timeout: 20_000 })
    rows.push('| A lagrer grunnoppsett «felles for menigheten» | ja |')
    // B: ser det uten å laste siden på nytt? (siden henter listen når den åpnes)
    const live = await appears(b.locator(`[data-ch-loop-base="${name}"]`), 35_000)
    rows.push(`| B ser det nye grunnoppsettet uten ny innlasting (inntil 35 s) | ${live ? 'ja' : '**NEI**'} |`)
    expect(live).toBe(true)
    await b.goto('/app/loop-studio')
    const card = b.locator(`[data-ch-loop-base="${name}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toContainText('Felles for menigheten')
    rows.push('| B ser grunnoppsettet etter å ha åpnet Loop Studio | ja |')
    // B: ny serie fra det, endrer og oppdaterer grunnoppsettet
    await card.locator('[data-ch-loop-base-open]').click()
    await expect(b.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    const prog = b.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen')
    const marker = `Torsdag kl 18 Endret av B ${Date.now() % 10000}`
    await prog.fill(marker)
    await b.getByRole('button', { name: 'Oppdater videoen' }).click()
    await b.locator('[data-ch-base-update]').click()
    await expect(b.getByText('Grunnoppsettet er oppdatert.')).toBeVisible({ timeout: 20_000 })
    rows.push('| B lager serie fra det, endrer og oppdaterer grunnoppsettet | ja |')
    const stored = JSON.stringify((await get(page, church, 'loopstudio:bases'))?.data ?? {})
    rows.push(`| Bs endring lagret i menighetens grunnoppsett (databasen) | ${stored.includes(marker) ? 'ja' : '**NEI**'} |`)
    // A: får Bs endring
    await page.goto('/app/loop-studio')
    const cardA = page.locator(`[data-ch-loop-base="${name}"]`)
    await expect(cardA).toBeVisible({ timeout: 20_000 })
    await cardA.locator('[data-ch-loop-base-open]').click()
    await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    const t0 = Date.now()
    const progA = page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen')
    await expect.poll(() => progA.inputValue(), { timeout: 15_000 }).toContain(marker).catch(() => undefined)
    const seen = await progA.inputValue()
    rows.push(`| (tid til grunnoppsettet var lastet hos A) | ${Date.now() - t0} ms |`)
    if (!seen.includes(marker)) rows.push(`| (diagnose) A ser programtekst | «${seen.slice(0, 80)}» |`)
    rows.push(`| A åpner grunnoppsettet og ser Bs endring | ${seen.includes(marker) ? 'ja' : '**NEI**'} |`)
    expect(seen).toContain(marker)

    // ---------- 2. felles malsoppsett (ukeprogrammet) ----------
    await page.goto('/app/loop-studio?mal=week')
    await b.goto('/app/loop-studio?mal=week')
    for (const p of [page, b]) await expect(p.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'Stil', exact: true }).click()
    const header = page.locator('label, div').filter({ hasText: /^Overskrift \(«Ukentlige møter»\)/ }).locator('input').first()
    const head = `E2E-overskrift ${Date.now() % 10000}`
    await header.fill(head)
    await expect.poll(async () => JSON.stringify((await get(page, church, 'loopstudio:week'))?.data ?? {}).includes(head), { timeout: 20_000 }).toBe(true)
    rows.push('| A endrer overskriften i ukeprogrammet → lagret for menigheten | ja |')
    const upd = b.getByText('Grunnoppsettet er oppdatert med endringer fra menigheten.').first()
    let got = await appears(upd, 35_000) // B oppdateres hvert 30. sekund
    if (!got) {
      await b.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
      got = await appears(upd, 10_000)
    }
    await b.getByRole('button', { name: 'Stil', exact: true }).click()
    const bHead = await b.locator('label, div').filter({ hasText: /^Overskrift \(«Ukentlige møter»\)/ }).locator('input').first().inputValue()
    rows.push(`| B (åpen samtidig) får endringen | ${got && bHead === head ? 'ja' : `**NEI** (melding: ${got ? 'ja' : 'nei'}, overskrift hos B: «${bHead}»)`} |`)
    expect(bHead).toBe(head)

    // ---------- 3. isolering ----------
    const other = await churchId(b, 'CH-test Menighet B')
    const iso = await rpc(b, 'church_settings_get', { p_church: other || '00000000-0000-4000-8000-000000000000', p_scope: 'loopstudio:bases' })
    rows.push(`| B leser en annen menighets oppsett | ${iso.status} ${iso.code ?? ''} (forventet nektet) |`)
    expect(iso.status).toBeGreaterThanOrEqual(400)
  } finally {
    await b.goto('/app/').catch(() => undefined)
    await page.goto('/app/').catch(() => undefined)
    for (const [scope, orig] of [['loopstudio:bases', snap.bases], ['loopstudio:week', snap.week]] as const) {
      const cur = await get(page, church, scope).catch(() => null)
      if (orig && cur) {
        const r = await rpc(page, 'church_settings_save', { p_church: church, p_scope: scope, p_data: orig.data, p_version: cur.version })
        const back = await get(page, church, scope)
        rows.push(`| ${scope} lagt tilbake | ${r.status}; innhold som før: ${JSON.stringify(back?.data) === JSON.stringify(orig.data) ? 'ja' : '**NEI**'} |`)
      }
    }
    await ctxB.close()
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('loop-deling', { body: report, contentType: 'text/markdown' })
  }
})
