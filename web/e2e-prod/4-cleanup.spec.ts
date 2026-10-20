import { expect, test } from '@playwright/test'
import { assertClean, CFG, configured, guardedContext, rest, sharedScope, signIn, staffContext, verifyIdentity } from './guard'

/**
 * Steg «cleanup» (krever godkjent steg «access» for å fjerne rester): sørger for at stabskontoen ikke har ventende
 * forespørsel eller aktiv Admin-tilgang i testmenigheten (f.eks. etter en avbrutt kjøring), og kontrollerer sluttilstanden.
 * Sletter ingenting: historikk (forespørsler, revisjonslogg, varsler) beholdes slik appen gjør det. Sletting av
 * testmenigheten og testkontoene er egne, manuelle steg (docs/produksjonstest.md).
 */
test.skip(!configured || !CFG.admin.email || !CFG.staff.storage, 'krever Admin-testkonto og stabsøkt')

test('opprydding: ingen ventende eller aktiv Admin-tilgang for stabskontoen i testmenigheten', async ({ browser }) => {
  const shared = sharedScope()
  const staff = await staffContext(browser, shared)
  const admin = await guardedContext(browser, shared)
  staff.page.on('dialog', (d) => void d.accept())
  admin.page.on('dialog', (d) => void d.accept())
  try {
    const sw = await verifyIdentity(staff, 'staff')
    await signIn(admin, 'admin')
    await verifyIdentity(admin, 'admin')
    const staffId = sw.user_id ?? sw.id ?? ''
    const overview = async () => (await rest(admin.page, '/rest/v1/rpc/admin_access_overview', { p_church: CFG.church.id })).body as { pending: { id: string; user_id: string }[]; active: { user_id: string }[] }
    let ov = await overview()
    if (CFG.steps.has('access')) {
      for (const p of ov.pending.filter((x) => x.user_id === staffId)) {
        const r = await rest(staff.page, '/rest/v1/rpc/withdraw_admin_access', { p_request: p.id })
        expect(r.status, 'trekke tilbake rest-forespørsel').toBe(200)
      }
      if (ov.active.some((a) => a.user_id === staffId)) {
        const r = await rest(admin.page, '/rest/v1/rpc/revoke_admin_access', { p_church: CFG.church.id, p_user: staffId })
        expect(r.status, 'fjerne rest-tilgang').toBeLessThan(300)
      }
      ov = await overview()
    }
    expect(ov.pending.filter((x) => x.user_id === staffId), 'ingen ventende forespørsel').toEqual([])
    expect(ov.active.filter((x) => x.user_id === staffId), 'ingen aktiv Admin-tilgang').toEqual([])
    assertClean(staff, 'stab')
    assertClean(admin, 'Admin')
  } finally {
    await staff.context.close()
    await admin.context.close()
  }
})
