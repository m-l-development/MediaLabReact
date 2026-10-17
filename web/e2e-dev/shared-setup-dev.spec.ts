import { expect, test, type Page } from '@playwright/test'
import { appears, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, rest, rpc, signInAs } from './helpers'

/**
 * SHR-07 – felles grunnoppsett ved samtidige endringer, mot connecthub-dev med to ekte økter samtidig (Admin og Bruker i
 * «CH-test Menighet A»; kjøres av run-dev.mjs i løpet «par»).
 * 1. Databasen, i et eget testområde (e2etest:shr07-<tid>, fjernes av run-dev.mjs): versjonskontroll, samtidig lagring,
 *    en eldre versjon kan aldri overskrive en nyere, sammenslåing etter konflikt.
 * 2. Grensesnittet: Thumbnail Studio åpent hos begge; Admin og Bruker endrer hver sin kategori uten å ha sett den andres
 *    endring. Begge endringene skal være med i menighetens oppsett etterpå. Oppsettet (thumbstudio:cats) kopieres før
 *    testen og legges tilbake etterpå (innholdet blir som før; versjonsnummeret øker).
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair', 'kjøres av run-dev.mjs med to kontoer')
test.beforeEach(async ({ page }) => injectBackend(page))

type Row = { data: Record<string, unknown>; version: number } | null
const get = async (p: Page, church: string, scope: string) => (await rpc(p, 'church_settings_get', { p_church: church, p_scope: scope })).body as Row
const save = (p: Page, church: string, scope: string, data: unknown, version: number) => rpc(p, 'church_settings_save', { p_church: church, p_scope: scope, p_data: data, p_version: version })

test('SHR-07: samtidige endringer i felles grunnoppsett (database og Thumbnail Studio)', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  const ctxB = await browser.newContext({ baseURL: info.project.use.baseURL })
  const b = await ctxB.newPage()
  await injectBackend(b)
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  await signInAs(b, EMAIL2, PASSWORD2)
  await expectHub(b)
  const ch = (await rest(page, `/rest/v1/churches?select=id&name=eq.${encodeURIComponent('CH-test Menighet A')}`)).body as { id: string }[]
  const church = ch[0]?.id ?? ''
  expect(church).toMatch(/^[0-9a-f-]{36}$/)

  // ---------- 1. databasen (eget testområde) ----------
  const scope = `e2etest:shr07-${Date.now()}`
  const s1 = await save(page, church, scope, { a: 'start', b: 'start' }, 0)
  const v1 = (s1.body as { version: number }).version
  rows.push(`| Første lagring (Admin) | ${s1.status}, versjon ${v1} |`)
  expect([s1.status, v1]).toEqual([200, 1])
  const seenB = await get(b, church, scope)
  expect(seenB?.version).toBe(1)

  // samtidig: begge lagrer mot versjon 1 i samme øyeblikk – nøyaktig én skal lykkes
  const [ra, rb] = await Promise.all([save(page, church, scope, { a: 'A', b: 'start' }, 1), save(b, church, scope, { a: 'start', b: 'B' }, 1)])
  const ok = [ra, rb].filter((r) => r.status === 200).length
  const loser = ra.status === 200 ? rb : ra
  rows.push(`| Samtidig lagring mot samme versjon | Admin ${ra.status} ${ra.code ?? ''}, Bruker ${rb.status} ${rb.code ?? ''}; lyktes: ${ok} av 2 |`)
  expect(ok).toBe(1)
  expect(loser.code).toBe('CH011')

  // den som tapte, henter nyeste og lagrer sammenslått – begge endringene med
  const loserPage = ra.status === 200 ? b : page
  const now = await get(loserPage, church, scope)
  const merged = { a: 'A', b: 'B' }
  const s3 = await save(loserPage, church, scope, { ...now?.data, ...(ra.status === 200 ? { b: 'B' } : { a: 'A' }) }, now?.version ?? 0)
  const fin = await get(page, church, scope)
  rows.push(`| Etter konflikt: hent nyeste og lagre på nytt | ${s3.status}, versjon ${fin?.version}, innhold ${JSON.stringify(fin?.data)} |`)
  expect(fin?.data).toEqual(merged)

  // en eldre versjon kan aldri overskrive en nyere
  const stale = await save(b, church, scope, { a: 'gammel', b: 'gammel' }, 1)
  const after = await get(page, church, scope)
  rows.push(`| Lagring med gammel versjon (1) | ${stale.status} ${stale.code ?? ''}; innholdet uendret: ${JSON.stringify(after?.data) === JSON.stringify(fin?.data) ? 'ja' : 'nei'} |`)
  expect(stale.code).toBe('CH011')
  expect(after?.data).toEqual(fin?.data)

  // ---------- 2. grensesnittet: Thumbnail Studio hos begge ----------
  const SCOPE = 'thumbstudio:cats'
  const original = await get(page, church, SCOPE)
  rows.push(`| Menighetens kategorier før testen | versjon ${original?.version ?? 'ingen'} (kopi tatt) |`)
  const stamp = Date.now()
  try {
    for (const p of [page, b]) {
      await p.goto('/app/thumbnail-studio')
      await expect(p.getByRole('heading', { level: 1, name: 'Thumbnail Studio' })).toBeVisible({ timeout: 30_000 })
    }
    await page.waitForTimeout(1500)
    const rename = async (p: Page, idx: number, name: string) => {
      await p.getByRole('button', { name: 'Rediger kategorier' }).click()
      await p.getByRole('textbox', { name: 'Navn på kategori' }).nth(idx).fill(name)
      await p.getByRole('button', { name: 'Ferdig' }).click()
    }
    const nameA = `E2E-A-${stamp}`, nameB = `E2E-B-${stamp}`
    await rename(page, 0, nameA)
    await expect.poll(async () => JSON.stringify((await get(page, church, SCOPE))?.data ?? {}).includes(nameA), { timeout: 20_000 }).toBe(true)
    rows.push('| Admin endret kategori 1, lagret for menigheten | ja |')
    // Bruker har ikke hentet Admins endring (ingen ny innlasting) og endrer kategori 2
    await rename(b, 1, nameB)
    const msg = b.getByText(/slått sammen|Noen andre endret det samme/).first()
    const shown = (await appears(msg, 20_000)) ? (await msg.textContent())?.trim() : '–'
    await expect.poll(async () => JSON.stringify((await get(page, church, SCOPE))?.data ?? {}).includes(nameB), { timeout: 20_000 }).toBe(true).catch(() => undefined)
    const final = JSON.stringify((await get(page, church, SCOPE))?.data ?? {})
    const both = final.includes(nameA) && final.includes(nameB)
    rows.push(`| Bruker endret kategori 2 samtidig | melding: «${shown}» |`)
    rows.push(`| Begge endringene i menighetens oppsett | ${both ? 'ja' : `**NEI** (Admin: ${final.includes(nameA) ? 'ja' : 'nei'}, Bruker: ${final.includes(nameB) ? 'ja' : 'nei'})`} |`)
    // Admin ser Brukers endring etter ny henting (fanen synlig igjen)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    const updated = await appears(page.getByText('Grunnoppsettet er oppdatert med endringer fra menigheten.').first(), 20_000)
    rows.push(`| Admin får melding om oppdatering fra menigheten | ${updated ? 'ja' : '**nei**'} |`)
    await page.getByRole('button', { name: 'Rediger kategorier' }).click()
    const seenByA = await page.getByRole('textbox', { name: 'Navn på kategori' }).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
    await page.getByRole('button', { name: 'Ferdig' }).click()
    rows.push(`| Admin ser Brukers endring etter oppdatering | ${seenByA.includes(nameB) ? 'ja' : 'nei'} |`)
    expect(both).toBe(true)
    expect(seenByA).toContain(nameB)
  } finally {
    // legger menighetens oppsett tilbake (bare hvis det fantes; ellers rydder run-dev.mjs ikke – se testloggen)
    await b.close().catch(() => undefined)
    await page.goto('/app/').catch(() => undefined)
    const cur = await get(page, church, SCOPE)
    if (original && cur) {
      const r = await save(page, church, SCOPE, original.data, cur.version)
      const back = await get(page, church, SCOPE)
      rows.push(`| Oppsettet lagt tilbake | ${r.status}; innhold som før: ${JSON.stringify(back?.data) === JSON.stringify(original.data) ? 'ja' : 'NEI'} (versjon ${back?.version}) |`)
    }
    await ctxB.close()
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('shr07', { body: report, contentType: 'text/markdown' })
  }
})
