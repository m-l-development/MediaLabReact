import { expect, test } from '@playwright/test'
import { assertClean, CFG, configured, guardedContext, rest, sharedScope, signIn, staffContext, verifyIdentity, whoami, type Guarded } from './guard'

/**
 * Steg «access» (PRODUKSJONSSKRIVING, krever godkjenning): Admin-tilgang i testmenigheten mellom stabsøkten og
 * Admin-testkontoen. Avslag → ny forespørsel trekkes tilbake → ny forespørsel godkjennes (1 dag) → Admin fjerner tilgangen.
 * Skriver bare admin_access_requests og user_roles for testkontoene i testmenigheten (pluss revisjonslogg og varsler i
 * appen; ingen e-post). Stopper før første skriving hvis noe ikke stemmer.
 */
test.skip(!configured || !CFG.steps.has('access') || !CFG.admin.email || !CFG.staff.storage, 'krever godkjent steg «access», Admin-testkonto og stabsøkt')

test('Admin-tilgang: avslag, tilbaketrekking, godkjenning med varighet og fjerning', async ({ browser }, info) => {
  const shared = sharedScope()
  const staff = await staffContext(browser, shared)
  const admin = await guardedContext(browser, shared)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  const ok = (k: string, v: boolean) => { rows.push(`| ${k} | ${v ? 'ja' : '**NEI**'} |`); expect(v, k).toBe(true) }
  staff.page.on('dialog', (d) => void d.accept())
  admin.page.on('dialog', (d) => void d.accept())
  try {
    // 0. identitet og utgangspunkt – ingen skriving før dette stemmer
    const sw = await verifyIdentity(staff, 'staff')
    await signIn(admin, 'admin')
    await verifyIdentity(admin, 'admin')
    const staffId = sw.user_id ?? sw.id ?? ''
    ok('Stabskontoen er ikke allerede Admin i testmenigheten', !sw.roles.some((r) => r.role === 'church_admin' && r.church_id === CFG.church.id))
    const ov0 = (await rest(admin.page, '/rest/v1/rpc/admin_access_overview', { p_church: CFG.church.id })).body as { pending: { user_id: string }[]; active: { user_id: string }[] }
    ok('Ingen ventende eller aktiv tilgang for stabskontoen i testmenigheten', !ov0.pending.some((p) => p.user_id === staffId) && !ov0.active.some((a) => a.user_id === staffId))

    const card = `/app/admin#/menigheter/${CFG.church.id}/medlemmer`
    const send = async () => {
      await staff.page.goto(card)
      await staff.page.getByRole('button', { name: 'Send forespørsel om midlertidig admin-tilgang' }).click()
      await expect(staff.page.locator('[data-ch-tempadmin="pending"]')).toBeVisible({ timeout: 20_000 })
    }
    const pending = admin.page.locator(`[data-ch-access-pending="${staffId}"]`)
    const openSection = async () => { await admin.page.goto('/app/admin#/tilgang'); await expect(admin.page.getByRole('heading', { level: 1, name: 'Admin-tilgang' })).toBeVisible({ timeout: 30_000 }) }

    // 1. avslag
    await send()
    await openSection()
    await expect(pending).toBeVisible({ timeout: 30_000 })
    await pending.locator('[data-ch-access-reject]').click()
    await expect(pending).toHaveCount(0, { timeout: 20_000 })
    await expect(staff.page.locator('[data-ch-tempadmin-rejected]')).toBeVisible({ timeout: 30_000 })
    ok('Avslag: Admin ser det i historikken, stabskontoen ser «Avslått av menighetsadmin»', await admin.page.locator('[data-ch-access-recent="rejected"]').first().isVisible())

    // 2. tilbaketrekking
    await send()
    await expect(pending).toBeVisible({ timeout: 30_000 })
    await staff.page.locator('[data-ch-tempadmin-withdraw]').click()
    await expect(staff.page.locator('[data-ch-tempadmin-cancelled]')).toBeVisible({ timeout: 20_000 })
    await expect(pending).toHaveCount(0, { timeout: 30_000 })
    ok('Tilbaketrekking: forsvinner hos Admin og vises som «Trukket tilbake»', await admin.page.locator('[data-ch-access-recent="cancelled"]').first().isVisible())

    // 3. godkjenning med varighet (1 dag), status etter ny innlasting
    await send()
    await expect(pending).toBeVisible({ timeout: 30_000 })
    await pending.locator('[data-ch-access-approve]').click()
    const dlg = admin.page.getByRole('dialog', { name: 'Godkjenn Admin-tilgang' })
    await expect(dlg).toBeVisible()
    ok('Godkjenn er låst til varighet er valgt', await dlg.locator('[data-ch-approve-confirm]').isDisabled())
    await dlg.locator('label:has([data-ch-duration="1d"])').click()
    await dlg.locator('[data-ch-approve-confirm]').click()
    const act = admin.page.locator(`[data-ch-access-active="${staffId}"]`)
    await expect(act).toBeVisible({ timeout: 20_000 })
    await staff.page.reload()
    await expect(staff.page.locator('[data-ch-tempadmin="active"]')).toBeVisible({ timeout: 30_000 })
    const r1 = (await whoami(staff.page)).roles.find((r) => r.role === 'church_admin' && r.church_id === CFG.church.id)
    const left = r1?.expires_at ? Date.parse(r1.expires_at) - Date.now() : 0
    ok('Godkjent i omtrent 1 døgn (servertid), og varer etter ny innlasting', left > 23 * 3600e3 && left < 25 * 3600e3)

    // 4. fjerning
    await act.locator('[data-ch-access-revoke]').click()
    await expect(act).toHaveCount(0, { timeout: 20_000 })
    const w2 = await whoami(staff.page)
    ok('Fjernet: stabskontoen er ikke lenger Admin i testmenigheten, stabsrollen er beholdt', !w2.roles.some((r) => r.role === 'church_admin' && r.church_id === CFG.church.id) && w2.roles.some((r) => r.role === 'developer' || r.role === 'moderator'))
    await admin.page.reload()
    await expect(admin.page.getByRole('heading', { level: 1, name: 'Admin-tilgang' })).toBeVisible({ timeout: 30_000 })
    await expect.poll(() => admin.page.locator('[data-ch-access-recent]').count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3) // listen lastes etter overskriften
    ok('Historikken etter ny innlasting viser avslag, tilbaketrekking og godkjenning', (await admin.page.locator('[data-ch-access-recent="rejected"]').count()) > 0 && (await admin.page.locator('[data-ch-access-recent="cancelled"]').count()) > 0)
    assertClean(staff, 'stab')
    assertClean(admin, 'Admin')
  } finally {
    await info.attach('admin-tilgang', { body: rows.join('\n'), contentType: 'text/markdown' })
    for (const g of [staff, admin] as Guarded[]) {
      await info.attach('kall', { body: g.log.map((x) => `${x.d.allow ? 'ok ' : 'STOPP'} ${x.d.kind} ${x.method} ${x.url} – ${x.d.reason}`).join('\n'), contentType: 'text/plain' })
      await g.context.close()
    }
  }
})
