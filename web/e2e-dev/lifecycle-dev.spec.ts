import crypto from 'node:crypto'
import { expect, test } from '@playwright/test'
import { api, dropOwnFactors, EMAIL, expectHub, injectBackend, mailLink, PASSWORD, rest, setupMfa, signInPassword } from './helpers'

/**
 * Hele livsløpet til en konto mot connecthub-dev, med en konto testen lager selv (kjøres av run-dev.mjs med Developer):
 * Developer med MFA lager en egen midlertidig testmenighet («E2E Testmenighet L …», slettes til slutt) og inviterer ch-test-e2e-<tid>@example.com dit → lenken fra testpostkassen godtas
 * og passord velges → Admin-rollen gis og trekkes tilbake → medlemskapet fjernes → brukeren sletter kontoen sin selv i
 * kontomenyen → innlogging avvises. Lenken, passordet og nøkkelen skrives aldri ut. Ingen ekte e-post sendes.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'staff' || !process.env.ML_DEV_MAILBOX, 'kjøres av run-dev.mjs med Developer')
test.beforeEach(async ({ page }) => injectBackend(page))

test('konto fra invitasjon til sletting: lenke, passord, rolle, medlemskap og «Slett kontoen min»', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
  const rows = ['| Steg | Resultat |', '|---|---|']
  await signInPassword(page)
  await setupMfa(page)
  const me = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string }[] }
  test.skip(!me.roles.some((r) => r.role === 'developer'), 'krever Developer')
  const temp: { id: string; name: string }[] = []
  // midlertidige testmenigheter fra en avbrutt kjøring (bare testens eget navnemønster) slettes også til slutt
  for (const o of (((await rest(page, `/rest/v1/churches?select=id,name&name=like.${encodeURIComponent('E2E Testmenighet L *')}`)).body as { id: string; name: string }[] | null) ?? [])) if (/^E2E Testmenighet L \d+$/.test(o.name)) temp.push(o)
  try {
    const made = await rest(page, '/rest/v1/churches?select=id,name', { method: 'POST', body: { name: `E2E Testmenighet L ${Date.now()}` }, headers: { Prefer: 'return=representation' } })
    const c = (made.body as { id: string; name: string }[] | null)?.[0]
    if (!c) throw new Error(`testmenigheten ble ikke laget (${made.status})`)
    temp.push(c)
    const church = c.id
    rows.push(`| Midlertidig testmenighet laget | ${made.status} |`)

    // 1. invitasjon → testpostkassen
    const addr = `ch-test-e2e-${Date.now()}@example.com`
    const inv = await api(page, 'invite.create', { email: addr, role: 'user', church_id: church })
    const link = mailLink(addr)
    rows.push(`| Invitasjon (Bruker) | ${inv.status}; lenke i testpostkassen: ${link ? 'ja' : 'nei'} |`)
    expect(inv.ok).toBe(true)
    expect(link).toBeTruthy()

    // 2. den inviterte åpner lenken i en egen nettleser, godtar og velger passord
    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL })
    const u = await ctx.newPage()
    await injectBackend(u)
    const url = new URL(link as string)
    await u.goto(url.pathname + url.search)
    await expect(u.getByRole('heading', { name: 'Velkommen til ConnectHub' })).toBeVisible({ timeout: 30_000 })
    await u.getByRole('button', { name: 'Fortsett' }).click()
    await expect(u.getByRole('heading', { name: 'Velg passord' })).toBeVisible({ timeout: 30_000 })
    const pw = crypto.randomBytes(18).toString('base64url') + 'a1!'
    await u.getByLabel('Nytt passord', { exact: true }).fill(pw)
    await u.getByLabel('Bekreft nytt passord').fill(pw)
    await u.getByRole('button', { name: 'Lagre passord' }).click()
    await u.waitForURL(/\/app\//, { timeout: 30_000 })
    await expectHub(u)
    const who = (await rest(u, '/rest/v1/rpc/whoami', { body: {} })).body as { user_id?: string; id?: string; churches: { id: string }[]; roles: { role: string }[] }
    const userId = who.user_id ?? who.id ?? ''
    rows.push(`| Lenke godtatt, passord valgt, inn i den nye appen | ja; medlem av testmenigheten: ${who.churches.some((c) => c.id === church) ? 'ja' : 'nei'} |`)
    expect(who.churches.some((c) => c.id === church)).toBe(true)
    expect(userId).toMatch(/^[0-9a-f-]{36}$/)

    // 3. rolle: Admin gis og trekkes tilbake (stab med MFA; logges)
    const ar = await rest(page, '/rest/v1/rpc/assign_role', { body: { p_user: userId, p_role: 'church_admin', p_church: church, p_reason: 'Automatisk test (e2e-dev)' } })
    const roleId = ar.body as string
    const asAdmin = ((await rest(u, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string }[] }).roles.some((r) => r.role === 'church_admin')
    const rr = await rest(page, '/rest/v1/rpc/revoke_role', { body: { p_role_id: roleId, p_reason: 'Automatisk test (e2e-dev)' } })
    const after = ((await rest(u, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string }[] }).roles.some((r) => r.role === 'church_admin')
    rows.push(`| Gi Admin / trekke tilbake | ${ar.status} (Admin: ${asAdmin ? 'ja' : 'nei'}) / ${rr.status} (Admin: ${after ? 'ja' : 'nei'}) |`)
    expect([ar.status, asAdmin, rr.status, after]).toEqual([200, true, 204, false])

    // 3b. varsler (TB-D9DE93) – testkontoen er eneste medlem, så bare dens egne varsler berøres
    // Avsenderen har en døgngrense (20 meldinger, feilkode 54000); svaret sjekkes, så en nådd grense ikke ser ut som et manglende varsel.
    const send = async (title: string) => {
      const r = await rest(page, '/rest/v1/rpc/send_church_message', { body: { p_church: church, p_title: title, p_body: 'Automatisk test' } })
      expect(r.status, `send_church_message «${title}»: ${r.code ?? r.status}${r.code === '54000' ? ' – døgngrensen for testkontoen er nådd, kjør igjen senere' : ''}`).toBe(200)
    }
    for (const n of [1, 2]) await send(`E2E-varsel ${n}`)
    await u.goto('/app/')
    await u.getByRole('button', { name: 'Konto' }).click()
    await u.getByRole('button', { name: /Varsler/ }).click()
    await expect(u.getByText('E2E-varsel 2')).toBeVisible({ timeout: 20_000 })
    await u.locator('[data-ch-notif-markall]').click()
    await expect(u.getByText('Alle varsler er merket som lest.')).toBeVisible({ timeout: 20_000 })
    await u.locator('[data-ch-notif-clearread]').click()
    await expect(u.getByText(/varsler fjernet./)).toBeVisible({ timeout: 20_000 })
    await expect(u.getByText('E2E-varsel 1')).toHaveCount(0)
    const note1 = (await u.locator('[data-ch-notif-note]').textContent()) ?? ''
    await send('E2E-varsel 3')
    await u.keyboard.press('Escape')
    await u.getByRole('button', { name: 'Konto' }).click()
    await u.getByRole('button', { name: /Varsler/ }).click()
    await expect(u.getByText('E2E-varsel 3')).toBeVisible({ timeout: 20_000 })
    u.once('dialog', (d) => void d.accept())
    await u.locator('[data-ch-notif-clearall]').click()
    await expect(u.getByText('Ingen varsler.')).toBeVisible({ timeout: 20_000 })
    rows.push(`| Varsler: merk alle som lest / fjern leste / tøm (med bekreftelse) | ja / «${note1.trim()}» / tom logg |`)
    await u.keyboard.press('Escape')

    // 4. medlemskapet fjernes (stab, med begrunnelse)
    const rm = await rest(page, '/rest/v1/rpc/remove_membership', { body: { p_user: userId, p_church: church, p_reason: 'Automatisk test (e2e-dev)', p_allow_no_admin: false } })
    const left = ((await rest(u, '/rest/v1/rpc/whoami', { body: {} })).body as { churches: { id: string }[] }).churches.some((c) => c.id === church)
    rows.push(`| Fjerne medlemskapet | ${rm.status}; fortsatt medlem: ${left ? 'ja' : 'nei'} |`)
    expect(rm.status).toBeLessThan(300)
    expect(left).toBe(false)

    // 5. brukeren sletter kontoen sin selv i kontomenyen
    await u.goto('/app/')
    await u.getByRole('button', { name: 'Konto' }).click()
    await u.getByRole('button', { name: /Konto og sikkerhet/ }).click()
    await u.getByRole('button', { name: 'Slett kontoen min' }).click()
    await u.getByRole('checkbox').check()
    await u.getByRole('button', { name: 'Slett kontoen permanent' }).click()
    await expect(u.getByLabel('E-post')).toBeVisible({ timeout: 30_000 })
    await u.getByLabel('E-post').fill(addr)
    await u.getByLabel('Passord', { exact: true }).fill(pw)
    await u.getByRole('button', { name: 'Logg inn', exact: true }).click()
    await expect(u.getByRole('alert').first()).toBeVisible({ timeout: 30_000 })
    const gone = (await rest(page, `/rest/v1/app_users?select=id&id=eq.${userId}`)).body as unknown[]
    rows.push(`| «Slett kontoen min» | utlogget; innlogging etterpå avvist; brukerraden borte: ${gone.length === 0 ? 'ja' : 'nei'} |`)
    expect(gone.length).toBe(0)
    await ctx.close()
  } finally {
    for (const c of temp) {
      await rest(page, '/rest/v1/rpc/set_church_status', { body: { p_church: c.id, p_status: 'pending_deletion' } }).catch(() => undefined)
      const p = await api(page, 'church.purge', { church_id: c.id, confirm_name: c.name }).catch(() => ({ status: 0 }))
      rows.push(`| Midlertidig testmenighet slettet | ${p.status} |`)
    }
    rows.push(`| MFA-faktor fjernet etter testen | ${(await dropOwnFactors(page)).join(', ') || '–'} |`)
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('livslop', { body: report, contentType: 'text/markdown' })
  }
})
