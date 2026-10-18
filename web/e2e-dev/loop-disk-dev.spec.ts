import { expect, test, type Page } from '@playwright/test'
import { appears, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, rest, rpc, signInAs } from './helpers'

/**
 * TB-BB67CB – Loop Studio: menighetens disk, med Admin (A) og Bruker (B) i «CH-test Menighet A» samtidig
 * (kjøres av run-dev.mjs i løpet «par»). Bare looper testen lager selv («E2E-disk-<tid>») berøres; de slettes til slutt.
 * 1. A lagrer en loop på menighetens disk → B ser den (uten slett-knapp), åpner, endrer og lagrer → versjon 2.
 * 2. A har fortsatt versjon 1 åpen og lagrer → avvist (eldre kopi overskriver ikke B), Bs endring står.
 * 3. B kan ikke slette; video avvises; ingen av dem kan lese eller lagre i en annen menighet.
 * 4. A (Admin) sletter loopen fra startsiden.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair', 'kjøres av run-dev.mjs med to kontoer')
test.beforeEach(async ({ page }) => injectBackend(page))

type Disk = { id: string; name: string; version: number; data: unknown }
const churchId = async (p: Page, name: string) => ((await rest(p, `/rest/v1/churches?select=id&name=eq.${encodeURIComponent(name)}`)).body as { id: string }[])[0]?.id ?? ''
const rowsNamed = async (p: Page, like: string) => ((await rest(p, `/rest/v1/loop_disk?select=id,name,version,data&name=like.${encodeURIComponent(like)}`)).body as Disk[] | null) ?? []

test('Loop Studio – menighetens disk: to brukere, versjoner, Admin-sletting og isolering', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
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
  const name = `E2E-disk-${Date.now()}`
  try {
    // ---------- 1. A lagrer, B ser, åpner, endrer og lagrer ----------
    await b.goto('/app/loop-studio') // B har startsiden åpen før A lagrer
    await page.goto('/app/loop-studio?mal=week')
    await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Lagre på Disk' }).click()
    await page.locator('[data-ch-save-target="f"]').click()
    await page.getByPlaceholder('F.eks. Påskemøte 2026').fill(name)
    await page.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(page.getByText(`Lagret på menighetens disk som «${name}»`)).toBeVisible({ timeout: 30_000 })
    const [v1] = await rowsNamed(page, name)
    rows.push(`| A lagrer på menighetens disk | ${v1 ? `ja, versjon ${v1.version}` : '**NEI**'} |`)
    expect(v1?.version).toBe(1)
    const clean = !/"(vid-|aud-|img-|blob:|data:)/.test(JSON.stringify(v1?.data ?? {}))
    rows.push(`| Lagret innhold uten video, lyd og lokale filer | ${clean ? 'ja' : '**NEI**'} |`)
    expect(clean).toBe(true)

    const item = b.locator(`[data-ch-loop-shared-item="${name}"]`)
    const live = await appears(item, 35_000)
    rows.push(`| B ser loopen uten ny innlasting (inntil 35 s) | ${live ? 'ja' : '**NEI**'} |`)
    expect(live).toBe(true)
    const noDel = (await item.locator('[data-ch-loop-shared-del]').count()) === 0
    rows.push(`| B (Bruker) har ingen slett-knapp | ${noDel ? 'ja' : '**NEI**'} |`)
    expect(noDel).toBe(true)
    await item.locator('[data-ch-loop-shared-open]').click()
    await expect(b.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
    const marker = `Torsdag kl 18 Endret av B ${Date.now() % 10000}`
    await b.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill(marker)
    await b.getByRole('button', { name: 'Oppdater videoen' }).click()
    await b.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(b.locator('[data-ch-save-target="f"]')).toHaveAttribute('aria-pressed', 'true')
    await b.getByRole('button', { name: 'Lagre endringer' }).click()
    await expect(b.getByText(`Lagret på menighetens disk som «${name}»`)).toBeVisible({ timeout: 30_000 })
    const [v2] = await rowsNamed(page, name)
    const hasB = JSON.stringify(v2?.data ?? {}).includes(marker)
    rows.push(`| B åpner, endrer og lagrer → versjon / Bs endring i databasen | ${v2?.version ?? '–'} / ${hasB ? 'ja' : '**NEI**'} |`)
    expect([v2?.version, hasB]).toEqual([2, true])

    // ---------- 2. A lagrer fra en eldre versjon ----------
    await page.getByRole('button', { name: 'Lagre', exact: true }).click()
    await page.getByRole('button', { name: 'Lagre endringer' }).click()
    await expect(page.getByText(/Loopen er endret av en annen i menigheten/)).toBeVisible({ timeout: 20_000 })
    const [v3] = await rowsNamed(page, name)
    const kept = v3?.version === 2 && JSON.stringify(v3.data).includes(marker)
    rows.push(`| A lagrer fra versjon 1 → avvist med melding; Bs endring står | ${kept ? 'ja' : '**NEI**'} |`)
    expect(kept).toBe(true)

    // ---------- 3. tilgang ----------
    const del = await rpc(b, 'loop_disk_delete', { p_id: v1?.id })
    rows.push(`| B (Bruker) sletter via databasen | ${del.status} ${del.code ?? ''} (forventet nektet) |`)
    expect(del.status).toBe(403)
    const vid = await rpc(b, 'loop_disk_save', { p_church: church, p_id: null, p_name: name + '-v', p_base: 'week', p_data: { programText: '', slides: [{ vid: 'vid-1' }], cfg: {} }, p_version: null })
    rows.push(`| Loop med video lagres via databasen | ${vid.status} ${vid.code ?? ''} (forventet avvist) |`)
    expect(vid.status).toBe(400)
    const other = await churchId(page, 'CH-test Menighet B')
    rows.push(`| «CH-test Menighet B» synlig for A | ${other ? 'ja' : 'nei (en tilfeldig id prøves)'} |`)
    const otherId = other || '00000000-0000-4000-8000-000000000000'
    const empty = { programText: '', slides: [], cfg: {} }
    for (const [who, p] of [['A', page], ['B', b]] as const) {
      const read = ((await rest(p, `/rest/v1/loop_disk?select=id&church_id=eq.${otherId}`)).body as unknown[] | null) ?? []
      const save = await rpc(p, 'loop_disk_save', { p_church: otherId, p_id: null, p_name: name + '-x', p_base: 'week', p_data: empty, p_version: null })
      const into = await rpc(p, 'loop_disk_save', { p_church: otherId, p_id: v1?.id, p_name: name, p_base: 'week', p_data: empty, p_version: 2 })
      rows.push(`| ${who}: leser / lagrer ny / endrer loopen som annen menighet | ${read.length} rader / ${save.status} ${save.code ?? ''} / ${into.status} ${into.code ?? ''} |`)
      expect(read.length).toBe(0)
      expect(save.status).toBe(403)
      expect(into.status).toBe(403)
    }

    // ---------- 4. A (Admin) sletter fra startsiden ----------
    await page.goto('/app/loop-studio')
    const aItem = page.locator(`[data-ch-loop-shared-item="${name}"]`)
    await expect(aItem).toBeVisible({ timeout: 20_000 })
    await aItem.locator('[data-ch-loop-shared-del]').click()
    await expect(aItem).toHaveCount(0, { timeout: 20_000 })
    const gone = (await rowsNamed(page, name)).length === 0
    rows.push(`| A (Admin) sletter fra startsiden (med bekreftelse) | ${gone ? 'ja, borte i databasen' : '**NEI**'} |`)
    expect(gone).toBe(true)
  } finally {
    // bare testens egne looper (også fra en avbrutt kjøring)
    let n = 0
    for (const r of await rowsNamed(page, 'E2E-disk-*')) if (/^E2E-disk-\d+(-[vx])?$/.test(r.name) && (await rpc(page, 'loop_disk_delete', { p_id: r.id })).status < 300) n++
    rows.push(`| Testens looper slettet til slutt | ${n} |`)
    await ctxB.close()
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('loop-disk', { body: report, contentType: 'text/markdown' })
  }
})
