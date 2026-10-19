import { expect, test, type Page } from '@playwright/test'
import { EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, rest, rpc, signInAs } from './helpers'

/**
 * TB-596FE4 – endringer i en serie fra et felles grunnoppsett gikk tapt når grunnoppsettet ble lastet tregt: redigeringen
 * kunne brukes før innlastingen var ferdig, og innlastingen overskrev det som var skrevet; «Oppdater grunnoppsettet» lagret
 * da det gamle innholdet og meldte «oppdatert». Kjøres av run-dev.mjs i løpet «par» med Admin i «CH-test Menighet A».
 * Menighetens loopstudio:bases kopieres før og legges tilbake etter testen. Hentingen forsinkes med 6 s.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair', 'kjøres av run-dev.mjs med to kontoer')
test.beforeEach(async ({ page }) => injectBackend(page))

type Row = { data: Record<string, unknown>; version: number } | null
const get = async (p: Page, church: string, scope: string) => (await rpc(p, 'church_settings_get', { p_church: church, p_scope: scope })).body as Row
const churchId = async (p: Page, name: string) => ((await rest(p, `/rest/v1/churches?select=id&name=eq.${encodeURIComponent(name)}`)).body as { id: string }[])[0]?.id ?? ''

test('serie fra felles grunnoppsett: skriving mens det lastes går ikke tapt, og oppdateringen lagrer endringen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(240_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  page.on('dialog', (d) => void d.accept())
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  const church = await churchId(page, 'CH-test Menighet A')
  const snap = await get(page, church, 'loopstudio:bases')
  const name = `E2E-last-${Date.now()}`
  try {
    // et felles grunnoppsett fra demoen
    await page.goto('/app/loop-studio')
    await page.locator('[data-ch-demo-link]').click()
    await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-ch-demo-save]').click()
    const dlg = page.locator('[data-ch-base-dialog]')
    await dlg.locator('[data-ch-base-name]').fill(name)
    await dlg.locator('[data-ch-base-level="f"]').check()
    await dlg.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(page.getByText(/Grunnoppsettet er lagret og er felles for menigheten/)).toBeVisible({ timeout: 20_000 })

    // tregt nett: hentingen av menighetens oppsett tar 6 s
    await page.goto('/app/loop-studio')
    const card = page.locator(`[data-ch-loop-base="${name}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    await page.route('**/rest/v1/rpc/church_settings_get', async (r) => { await new Promise((res) => setTimeout(res, 6000)); await r.continue() })
    await card.locator('[data-ch-loop-base-open]').click()
    const prog = page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen')
    const marker = `Torsdag kl 18 Skrevet under lasting ${Date.now() % 10000}`
    // skriv så snart feltet kan brukes
    await expect(prog).toBeEditable({ timeout: 30_000 })
    await prog.fill(marker)
    await page.waitForTimeout(9000) // la innlastingen bli ferdig
    const after = await prog.inputValue()
    rows.push(`| Tekst skrevet mens grunnoppsettet lastes, står etter innlastingen | ${after.includes(marker) ? 'ja' : `**NEI** («${after.slice(0, 50)}»)`} |`)
    await page.unroute('**/rest/v1/rpc/church_settings_get')
    expect(after).toContain(marker)

    await page.getByRole('button', { name: 'Oppdater videoen' }).click()
    const v0 = (await get(page, church, 'loopstudio:bases'))?.version ?? 0
    await page.locator('[data-ch-base-update]').click()
    await expect(page.getByText('Grunnoppsettet er oppdatert.', { exact: true })).toBeVisible({ timeout: 20_000 })
    const row = await get(page, church, 'loopstudio:bases')
    const ok = JSON.stringify(row?.data ?? {}).includes(marker)
    rows.push(`| «Oppdater grunnoppsettet» lagrer endringen (versjon ${v0} → ${row?.version}) | ${ok ? 'ja' : '**NEI**'} |`)
    expect(ok).toBe(true)
  } finally {
    await page.unroute('**/rest/v1/rpc/church_settings_get').catch(() => undefined)
    await page.goto('/app/').catch(() => undefined)
    const cur = await get(page, church, 'loopstudio:bases').catch(() => null)
    if (snap && cur) {
      const r = await rpc(page, 'church_settings_save', { p_church: church, p_scope: 'loopstudio:bases', p_data: snap.data, p_version: cur.version })
      const back = await get(page, church, 'loopstudio:bases')
      rows.push(`| loopstudio:bases lagt tilbake | ${r.status}; innhold som før: ${JSON.stringify(back?.data) === JSON.stringify(snap.data) ? 'ja' : '**NEI**'} |`)
    }
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('loop-grunnoppsett-lasting', { body: report, contentType: 'text/markdown' })
  }
})
