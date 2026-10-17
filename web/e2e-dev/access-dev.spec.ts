import { expect, test, type Page } from '@playwright/test'
import { injectBackend } from './helpers'

/**
 * Tilgang håndheves i databasen, ikke bare i grensesnittet (connecthub-dev, ekte testkonto, bare lesing).
 * Etter innlogging kalles databasen direkte med brukerens egen økt – utenom appens knapper – og svarene sammenlignes med
 * reglene i migreringene (supabase/migrations). Token, passord og persondata skrives aldri ut; bare antall og feilkoder.
 *
 * Forventninger (fra koden):
 * - system_status, mail_settings_get, cleanup_overview, feedback_list (tilbakemeldingsinnboksen): bare stab (Developer/Moderator) → ellers 42501 «Ingen tilgang»
 * - export_church(egen menighet): bare menighetens admin eller stab; export_church(fremmed id): bare stab
 * - user_roles og invitations: vanlig bruker ser bare egne roller og ingen invitasjoner fra andre menigheter
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')
test.beforeEach(async ({ page }) => injectBackend(page))

type Probe = { status: number; code?: string | undefined; rows?: number | undefined; ok: boolean }

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

/** Kaller Supabase direkte i nettleseren med brukerens økt. Returnerer bare status, feilkode og antall rader. */
function probe(page: Page, path: string, body?: unknown): Promise<Probe & { data?: unknown }> {
  return page.evaluate(async ({ p: url, b: payload }) => {
    const cfg = (globalThis as { __CH_BACKEND__?: { url: string; key: string } }).__CH_BACKEND__
    const session = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!cfg || !session?.access_token) return { status: 0, code: 'ingen økt', ok: false }
    const r = await fetch(`${cfg.url}${url}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    })
    const j: unknown = await r.json().catch(() => null)
    const code = !r.ok && j && typeof j === 'object' && 'code' in j ? String((j as { code: unknown }).code) : undefined
    return { status: r.status, code, rows: Array.isArray(j) ? j.length : undefined, ok: r.ok, data: /whoami|user_roles|invitations|churches|memberships|audit_logs/.test(url) ? j : undefined }
  }, { p: path, b: body })
}

test('tilgang håndheves i databasen for innlogget testkonto (bare lesing)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'samme regler; kjøres én gang')
  await signIn(page)
  const who = (await probe(page, '/rest/v1/rpc/whoami', {})).data as { id: string; roles: { role: string; church_id: string | null }[]; churches: { id: string }[] }
  const roles = who.roles.map((r) => r.role)
  const staff = roles.includes('developer') || roles.includes('moderator')
  const adminOf = who.roles.filter((r) => r.role === 'church_admin').map((r) => r.church_id)
  const own = who.churches.map((c) => c.id)
  const kind = staff ? 'stab' : adminOf.length ? 'admin' : 'vanlig bruker'
  test.skip(staff, 'kontoen er Developer/Moderator; denne testen gjelder vanlig bruker og Admin')

  const rows: string[] = ['| Kall | Forventet | Svar | Riktig |', '|---|---|---|---|']
  const check = (name: string, expected: 'nektet' | 'tillatt', p: Probe) => {
    const got = p.ok ? `tillatt (${p.status}${p.rows != null ? `, ${p.rows} rader` : ''})` : `nektet (${p.status} ${p.code ?? ''})`
    const right = expected === 'tillatt' ? p.ok : !p.ok && (p.code === '42501' || p.status === 401 || p.status === 403)
    rows.push(`| ${name} | ${expected} | ${got} | ${right ? 'ja' : '**NEI**'} |`)
    return right
  }
  const results: boolean[] = []
  for (const fn of ['system_status', 'mail_settings_get', 'cleanup_overview', 'feedback_list']) results.push(check(`rpc ${fn}`, 'nektet', await probe(page, `/rest/v1/rpc/${fn}`, {})))
  if (own[0]) results.push(check('rpc export_church (egen menighet)', adminOf.includes(own[0]) ? 'tillatt' : 'nektet', await probe(page, '/rest/v1/rpc/export_church', { p_church: own[0] })))
  results.push(check('rpc export_church (fremmed id)', 'nektet', await probe(page, '/rest/v1/rpc/export_church', { p_church: '00000000-0000-4000-8000-0000000000ff' })))

  // Tabeller: bare egne rader / egne menigheter
  const ur = await probe(page, '/rest/v1/user_roles?select=user_id,church_id,role&limit=500')
  const urRows = (ur.data as { user_id: string; church_id: string | null }[] | null) ?? []
  const urOk = urRows.every((r) => r.user_id === who.id || (r.church_id != null && adminOf.includes(r.church_id)))
  rows.push(`| user_roles | bare egne${adminOf.length ? ' / egen menighet' : ''} | ${urRows.length} rader | ${urOk ? 'ja' : '**NEI**'} |`)
  results.push(urOk)
  const inv = await probe(page, '/rest/v1/invitations?select=church_id&limit=500')
  const invRows = (inv.data as { church_id: string | null }[] | null) ?? []
  const invOk = invRows.every((r) => r.church_id != null && adminOf.includes(r.church_id))
  rows.push(`| invitations | ${adminOf.length ? 'bare egen menighet' : 'ingen'} | ${invRows.length} rader${inv.ok ? '' : ` (${inv.status} ${inv.code ?? ''})`} | ${invOk ? 'ja' : '**NEI**'} |`)
  results.push(invOk)
  // Tabeller med menighets-ID: bare egne menigheter (church_id null = systemhendelse, telles for seg)
  for (const t of ['churches', 'memberships', 'audit_logs']) {
    const col = t === 'churches' ? 'id' : 'church_id'
    const p = await probe(page, `/rest/v1/${t}?select=${col}&limit=1000`)
    const list = ((p.data as Record<string, string | null>[] | undefined) ?? []).map((r) => r[col] ?? null)
    const outside = list.filter((id) => id != null && !own.includes(id)).length
    const nulls = list.filter((id) => id == null).length
    const okScope = p.ok && outside === 0
    rows.push(`| ${t} | bare egne menigheter | ${p.ok ? `${list.length} rader, ${outside} utenfor egne${nulls ? `, ${nulls} uten menighet` : ''}` : `nektet (${p.status} ${p.code ?? ''})`} | ${okScope ? 'ja' : '**NEI**'} |`)
    results.push(okScope)
  }
  const au = await probe(page, '/rest/v1/app_users?select=id&limit=1000')
  rows.push(`| app_users | (registreres) | ${au.ok ? `${au.rows} rader` : `nektet (${au.status} ${au.code ?? ''})`} | – |`)

  // Grensesnittet: admin-seksjoner for stab skal ikke vises for denne kontoen
  await page.goto('/app/admin#/logg')
  await page.waitForTimeout(1500)
  const logHeading = (await page.locator('main h1, main h2').first().textContent().catch(() => '–'))?.trim()
  rows.push(`| UI /app/admin#/logg | ikke stabsinnhold | overskrift «${logHeading}» | (se skjermbilde) |`)
  await page.screenshot({ path: info.outputPath('admin-logg.png') })

  const report = `Konto: ${kind} (${own.length} menighet(er))\n\n${rows.join('\n')}`
  console.log(`\n${report}\n`)
  await info.attach('tilgang', { body: report, contentType: 'text/markdown' })
  expect(results.every(Boolean), 'minst ett kall fikk tilgang det ikke skulle hatt (eller ble nektet uventet)').toBe(true)
})
