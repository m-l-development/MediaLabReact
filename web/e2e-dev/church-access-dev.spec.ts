import { expect, test, type Page } from '@playwright/test'
import { api, dropOwnFactors, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD2, rest, rpc, setupMfa, signInAs, signInPassword } from './helpers'

/**
 * Menighetsadministrasjon mot connecthub-dev (kjøres av run-dev.mjs i løpet «tilgang»): Developer (ch-test-dev, med MFA)
 * og Admin i «CH-test Menighet A» (ch-test-admin) i hver sin nettleser.
 *   1. Developer oppretter en menighet med logo (forhåndsvisning) uten å bli medlem eller Admin, og kan ikke endre logoen.
 *   2. Developer ber om midlertidig Admin-tilgang i A; Admin godkjenner med grønn hake og varighet (1 dag) – også på mobil.
 *   3. Admin fjerner tilgangen; en ny forespørsel avslås med rød X. Developer-rollen og menighetens data er uendret.
 * Bare data testen selv lager: testmenigheten («E2E Testmenighet L …») slettes til slutt, forespørslene blir liggende som
 * historikk, og den midlertidige tilgangen fjernes. MFA-faktoren fjernes.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'access', 'kjøres av run-dev.mjs med Developer og Admin')

// 2×2 PNG
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 18, 73, 68, 65, 84, 120, 156, 99, 120, 38, 34, 242, 76, 68, 132, 1, 66, 1, 0, 32, 222, 4, 57, 4, 175, 122, 106, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
type Who = { id?: string; user_id?: string; roles: { role: string; church_id: string | null; expires_at?: string | null }[]; churches: { id: string; name: string }[] }
const whoami = async (p: Page) => (await rest(p, '/rest/v1/rpc/whoami', { body: {} })).body as Who

test('midlertidig Admin-tilgang og ny menighet med logo', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang (mobilbredden sjekkes i testen)')
  test.setTimeout(400_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  const ok = (label: string, v: boolean) => { rows.push(`| ${label} | ${v ? 'ja' : '**NEI**'} |`); expect(v, label).toBe(true) }
  page.on('dialog', (d) => void d.accept())
  await injectBackend(page)
  await signInPassword(page)
  await setupMfa(page)
  const dev = await whoami(page)
  const devId = dev.user_id ?? dev.id ?? ''
  const adm = await browser.newContext()
  const q = await adm.newPage()
  q.on('dialog', (d) => void d.accept())
  await injectBackend(q)
  await signInAs(q, EMAIL2, PASSWORD2)
  await expectHub(q)
  const a = (await whoami(q)).churches.find((c) => c.name === 'CH-test Menighet A')
  if (!a) throw new Error('Admin er ikke i CH-test Menighet A')
  const before = (await rest(q, `/rest/v1/churches?select=logo_file_id&id=eq.${a.id}`)).body as { logo_file_id: string | null }[]
  const filesBefore = ((await rest(q, `/rest/v1/files?select=id&church_id=eq.${a.id}`)).body as unknown[]).length
  const name = `E2E Testmenighet L ${Date.now()}`
  let created = ''
  try {
    // 1. ny menighet med logo
    await page.goto('/app/admin#/menigheter')
    await page.getByLabel('Navn på ny menighet').fill(name)
    await page.locator('[data-ch-newlogo-input]').setInputFiles({ name: 'e2e-logo.png', mimeType: 'image/png', buffer: PNG })
    ok('Logoen forhåndsvises før opprettelsen', await page.getByAltText('Forhåndsvisning av logoen').isVisible())
    await page.getByRole('button', { name: 'Opprett menighet' }).click()
    await expect.poll(() => /#\/menigheter\/[0-9a-f-]{36}/.test(page.url()), { timeout: 30_000 }).toBe(true)
    created = (/#\/menigheter\/([0-9a-f-]{36})/.exec(page.url()) as RegExpExecArray)[1] as string
    const c = ((await rest(page, `/rest/v1/churches?select=id,logo_file_id,created_by&id=eq.${created}`)).body as { logo_file_id: string | null; created_by: string }[])[0]
    ok('Menigheten er opprettet med logo, og oppretteren er registrert', !!c?.logo_file_id && c.created_by === devId)
    const mem = (await rest(page, `/rest/v1/memberships?select=user_id&church_id=eq.${created}`)).body as unknown[]
    const roles = (await rest(page, `/rest/v1/user_roles?select=id&church_id=eq.${created}&revoked_at=is.null`)).body as unknown[]
    ok('Oppretteren ble verken medlem eller Admin', mem.length === 0 && roles.length === 0)
    await page.goto(`/app/admin#/menigheter/${created}/innstillinger`)
    await expect(page.locator('[data-ch-logocard]')).toBeVisible({ timeout: 30_000 })
    ok('Oppretteren ser logoen, men kan ikke bytte den (forklaring i stedet for knapp)', await page.locator('[data-ch-logo-staffnote]').isVisible() && (await page.getByRole('button', { name: /Bytt logo|Last opp logo/ }).count()) === 0)
    const fake = await rpc(page, 'set_church_logo', { p_church: created, p_file: null })
    ok(`Uautorisert API-kall: oppretteren kan ikke fjerne logoen (${fake.status})`, fake.status === 403)

    // 2. forespørsel og godkjenning
    await page.goto(`/app/admin#/menigheter/${a.id}/medlemmer`)
    await page.getByRole('button', { name: 'Send forespørsel om midlertidig admin-tilgang' }).click()
    await expect(page.locator('[data-ch-tempadmin="pending"]')).toBeVisible({ timeout: 20_000 })
    ok('Developer ber om tilgang: forespørselen venter', true)
    const self = await rpc(page, 'decide_admin_access', { p_request: '00000000-0000-4000-8000-000000000000', p_approve: true, p_duration: 'indef' })
    ok(`Uautorisert API-kall: Developer kan ikke godkjenne (${self.status})`, self.status >= 400)
    // omgåelser av forespørselen (rotårsaken): eldre «legg meg til», invitasjon til seg selv, ingen rettigheter mens den venter
    const addSelf = await rpc(page, 'add_self_as_admin', { p_church: a.id })
    ok(`Omgåelse: eldre «legg meg til som Admin» er stengt (${addSelf.status})`, addSelf.status >= 400)
    const selfInv = await api(page, 'invite.create', { email: EMAIL, role: 'church_admin', church_id: a.id })
    ok(`Omgåelse: Developer kan ikke invitere seg selv som Admin (${selfInv.status})`, selfInv.status === 403)
    const wP = await whoami(page)
    ok('Mens forespørselen venter: Developer har ingen Admin-rolle i A', !wP.roles.some((r) => r.role === 'church_admin' && r.church_id === a.id))
    await q.goto(`/app/admin#/menigheter/${a.id}/medlemmer`)
    const pend = q.locator(`[data-ch-access-pending="${devId}"]`)
    await expect(pend).toBeVisible({ timeout: 30_000 })
    await q.setViewportSize({ width: 390, height: 844 })
    await pend.locator('[data-ch-access-approve]').click()
    const dlg = q.getByRole('dialog', { name: 'Godkjenn Admin-tilgang' })
    await expect(dlg).toBeVisible()
    const box = await dlg.boundingBox()
    ok('Godkjenningsdialogen viser menigheten og passer på mobil (390 px)', (await dlg.textContent())?.includes('CH-test Menighet A') === true && !!box && box.x >= 0 && box.x + box.width <= 391)
    ok('Godkjenn er låst til varighet er valgt', await dlg.locator('[data-ch-approve-confirm]').isDisabled())
    await dlg.locator('label:has([data-ch-duration="1d"])').click()
    const reloaded = page.waitForEvent('load', { timeout: 30_000 }) // avsenderens side lastes på nytt av seg selv ved godkjenning
    await dlg.locator('[data-ch-approve-confirm]').click()
    await q.setViewportSize({ width: 1280, height: 800 })
    const act = q.locator(`[data-ch-access-active="${devId}"]`)
    await expect(act).toBeVisible({ timeout: 20_000 })
    ok('Admin godkjenner med grønn hake og 1 dag: vises som aktiv med utløp', (await act.textContent())?.includes('1 dag') === true && /utløper/.test((await act.textContent()) ?? ''))
    // uten å laste siden på nytt i testen: avsenderens visning oppdateres av seg selv
    await reloaded
    await expect(page.locator('[data-ch-tempadmin="active"]')).toBeVisible({ timeout: 30_000 })
    const actText = (await page.locator('[data-ch-tempadmin]').textContent()) ?? ''
    ok('Avsenderen ser automatisk «Godkjent – du har nå midlertidig admin-tilgang» med utløpstid', actText.includes('Godkjent – du har nå midlertidig admin-tilgang') && /til \d{2}\.\d{2}\.\d{4}/.test(actText))
    const w1 = await whoami(page)
    const r1 = w1.roles.find((r) => r.role === 'church_admin' && r.church_id === a.id)
    const exp = r1?.expires_at ? Date.parse(r1.expires_at) - Date.now() : 0
    ok('Developer er Admin i A i omtrent 1 døgn (servertid), og fortsatt Developer', !!r1 && exp > 23 * 3600e3 && exp < 25 * 3600e3 && w1.roles.some((r) => r.role === 'developer'))
    ok('Den faste Admin er fortsatt Admin', (await whoami(q)).roles.some((r) => r.role === 'church_admin' && r.church_id === a.id))

    // 3. fjerning og avslag
    await act.locator('[data-ch-access-revoke]').click()
    await expect(act).toHaveCount(0, { timeout: 20_000 })
    const w2 = await whoami(page)
    const up = await rpc(page, 'can_upload', { p_church: a.id, p_folder: 'faste', p_private: false, p_size: 10 })
    ok(`Admin fjerner tilgangen: borte med en gang (Faste ${up.status}), Developer-rollen beholdt`, !w2.roles.some((r) => r.church_id === a.id) && up.status === 403 && w2.roles.some((r) => r.role === 'developer'))
    await page.reload()
    await page.getByRole('button', { name: 'Send forespørsel om midlertidig admin-tilgang' }).click()
    await expect(page.locator('[data-ch-tempadmin="pending"]')).toBeVisible({ timeout: 20_000 })
    ok('Avsenderen ser straks «Forespørsel sendt – venter på svar»', ((await page.locator('[data-ch-tempadmin]').textContent()) ?? '').includes('Forespørsel sendt – venter på svar'))
    // Admin-siden er åpen fra før: forespørselen dukker opp uten at siden lastes på nytt
    await expect(q.locator(`[data-ch-access-pending="${devId}"]`)).toBeVisible({ timeout: 30_000 })
    ok('Admin mottar forespørselen automatisk (uten å laste siden på nytt)', true)
    await q.locator(`[data-ch-access-pending="${devId}"] [data-ch-access-reject]`).click()
    await expect(q.locator(`[data-ch-access-pending="${devId}"]`)).toHaveCount(0, { timeout: 20_000 })
    ok('Ny forespørsel avslås med rød X og vises som avslått', await q.locator('[data-ch-access-recent="rejected"]').first().isVisible())
    const w3 = await whoami(page)
    ok('Avslag gir ingen Admin-rettigheter', !w3.roles.some((r) => r.church_id === a.id))
    await expect(page.locator('[data-ch-tempadmin-rejected]')).toBeVisible({ timeout: 30_000 })
    ok('Avsenderen ser automatisk «Avslått av menighetsadmin»', ((await page.locator('[data-ch-tempadmin-rejected]').textContent()) ?? '').includes('Avslått av menighetsadmin'))
    const after = (await rest(q, `/rest/v1/churches?select=logo_file_id&id=eq.${a.id}`)).body as { logo_file_id: string | null }[]
    const filesAfter = ((await rest(q, `/rest/v1/files?select=id&church_id=eq.${a.id}`)).body as unknown[]).length
    ok('Menighetens logo og filer er uendret gjennom rolleendringene', after[0]?.logo_file_id === before[0]?.logo_file_id && filesAfter === filesBefore)
  } finally {
    await rpc(page, 'revoke_admin_access', { p_church: a.id, p_user: devId }).catch(() => undefined)
    if (created) {
      const s = await rpc(page, 'set_church_status', { p_church: created, p_status: 'pending_deletion' })
      const p = await api(page, 'church.purge', { church_id: created, confirm_name: name })
      rows.push(`| Opprydding: testmenigheten slettet (${s.status}/${p.status}) | ${p.status === 200 ? 'ja' : '**NEI**'} |`)
    }
    rows.push(`| MFA-faktor fjernet etter testen | ${(await dropOwnFactors(page)).join(', ') || '–'} |`)
    await adm.close()
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('menighet-tilgang', { body: report, contentType: 'text/markdown' })
  }
})
