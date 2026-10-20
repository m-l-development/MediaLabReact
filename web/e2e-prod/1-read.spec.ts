import { expect, test } from '@playwright/test'
import { assertClean, CFG, configured, guardedContext, rest, sharedScope, signIn, staffContext, verifyIdentity, type Guarded } from './guard'

/**
 * Steg «lesing» (ingen produksjonsskriving utover selve innloggingen): for hver testkonto kontrolleres identiteten, alle
 * sider og admin-seksjoner åpnes på PC og mobil uten feil, og serveren/RLS gir bare det rollen skal ha.
 */
test.skip(!configured, 'kjøres av run-prod.mjs / run-dev.mjs')

const TOOLS = ['loop-studio', 'thumbnail-studio', 'motion-design', 'photo-design', 'isolate-subject', 'mockups']
const ALL = ['oversikt', 'brukere', 'menigheter', 'tilgang', 'invitasjoner', 'filer', 'samarbeid', 'abonnement', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail', 'logg']
const STAFF_ONLY = ['samarbeid', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail']
const NOBODY = '00000000-0000-4000-8000-000000000000'

async function crawl(g: Guarded, kind: 'user' | 'admin' | 'staff', info: import('@playwright/test').TestInfo) {
  const { page } = g
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`konsoll: ${m.text().slice(0, 160)}`) })
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')}`) })
  const rows: string[] = []
  for (const [w, size] of [['desktop', { width: 1440, height: 900 }], ['mobil', { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(size)
    const visit = async (label: string, url: string) => {
      const before = problems.length
      await page.goto(url)
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
      await page.waitForTimeout(600)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      const crashed = await page.getByRole('heading', { name: 'Noe gikk galt' }).count()
      const found = problems.slice(before)
      if (crashed) found.push('feilsiden «Noe gikk galt»')
      if (size.width < 500 && over > 1) found.push(`vannrett rulling ${over}px`)
      rows.push(`| ${kind} | ${w} | ${label} | ${found.join('; ') || 'ok'} |`)
      return found
    }
    const fails: string[] = []
    for (const [l, u] of [['forsiden', '/app/'], ['Medier', '/app/medier'], ...TOOLS.map((t) => [t, `/app/${t}`])]) fails.push(...(await visit(l!, u!)))
    await page.goto('/app/admin')
    await expect(page.locator('.ch-nav')).toBeVisible({ timeout: 45_000 })
    const nav = await page.locator('.ch-nav a[href*="#/"]').evaluateAll((as) => [...new Set(as.map((a) => (a.getAttribute('href') ?? '').replace(/^.*#\//, '').split('/')[0]))])
    const want = kind === 'staff' ? ALL : kind === 'admin' ? ALL.filter((s) => !STAFF_ONLY.includes(s)) : ['oversikt', 'menigheter', 'filer']
    expect([...nav].sort(), `${w}: admin-menyen for ${kind}`).toEqual([...want].sort())
    for (const sec of ALL) {
      fails.push(...(await visit(`#/${sec}`, `/app/admin#/${sec}`)))
      const h1 = ((await page.locator('main h1').first().textContent()) ?? '').trim()
      if (!nav.includes(sec) && sec !== 'oversikt') expect(h1, `${w} #/${sec} skal gi «Ingen tilgang»`).toBe('Ingen tilgang')
    }
    expect(fails, `${w}: feil på sidene`).toEqual([])
  }
  await info.attach(`sider-${kind}`, { body: ['| Konto | Bredde | Side | Resultat |', '|---|---|---|---|', ...rows].join('\n'), contentType: 'text/markdown' })
}

/** Serverkontroller som bare leser: hva rollen får og ikke får. */
async function serverChecks(g: Guarded, kind: 'user' | 'admin' | 'staff') {
  const { page } = g
  const ov = await rest(page, '/rest/v1/rpc/admin_access_overview', { p_church: CFG.church.id })
  if (kind === 'user') expect(ov.status, 'Bruker får ikke Admin-tilgang-oversikten').toBeGreaterThanOrEqual(400)
  else expect(ov.status, `${kind} får oversikten for testmenigheten`).toBe(200)
  const foreign = await rest(page, '/rest/v1/rpc/admin_access_overview', { p_church: NOBODY })
  if (kind !== 'staff') expect(foreign.status, `${kind}: oversikt for en annen menighet avvises`).toBeGreaterThanOrEqual(400)
  const churches = await rest(page, '/rest/v1/churches?select=id')
  expect(churches.status).toBe(200)
  const ids = (churches.body as { id: string }[]).map((c) => c.id)
  if (kind !== 'staff') expect(ids, `${kind} ser bare testmenigheten`).toEqual([CFG.church.id])
  const users = await rest(page, '/rest/v1/app_users?select=id')
  if (kind === 'user') expect((users.body as unknown[] | null)?.length ?? 0, 'Bruker ser bare seg selv').toBeLessThanOrEqual(1)
  const roles = await rest(page, '/rest/v1/user_roles?select=church_id')
  if (kind !== 'staff') for (const r of (roles.body as { church_id: string | null }[] | null) ?? []) expect(r.church_id, `${kind}: roller bare i testmenigheten`).toBe(CFG.church.id)
}

/** Sperretest: forbudte skrivinger stoppes i nettleseren (de når aldri serveren) og registreres. Fjernes fra listen etterpå. */
async function guardSelfTest(g: Guarded) {
  const before = g.blocked.length
  const tries = [
    await rest(g.page, '/rest/v1/rpc/church_settings_save', { p_church: CFG.church.id, p_scope: 'e2e', p_data: {}, p_version: 0 }),
    await rest(g.page, '/rest/v1/rpc/assign_role', { p_user: NOBODY, p_role: 'church_admin', p_church: CFG.church.id, p_reason: 'sperretest' }),
    await g.page.evaluate(async () => (await fetch('/api/ch?a=invite.create', { method: 'POST', body: '{}' }).catch(() => null))?.status ?? -1),
  ]
  expect(tries.map((t) => (typeof t === 'number' ? t : t.status)), 'forbudte skrivinger når aldri serveren').toEqual([-1, -1, -1])
  expect(g.blocked.length - before, 'alle tre er registrert av sperren').toBe(3)
  g.blocked.splice(before)
}

for (const kind of ['user', 'admin', 'staff'] as const) {
  test(`lesing: ${kind} – identitet, sider, admin-seksjoner og serverkontroller`, async ({ browser }, info) => {
    test.skip(kind === 'staff' ? !CFG.staff.storage : !CFG[kind].email, `ingen ${kind}-testkonto oppgitt`)
    const shared = sharedScope()
    const g = kind === 'staff' ? await staffContext(browser, shared) : await guardedContext(browser, shared)
    try {
      if (kind !== 'staff') await signIn(g, kind)
      await verifyIdentity(g, kind)
      await guardSelfTest(g)
      await serverChecks(g, kind)
      await crawl(g, kind, info)
      assertClean(g, kind)
    } finally {
      await info.attach(`kall-${kind}`, { body: g.log.map((x) => `${x.d.allow ? 'ok ' : 'STOPP'} ${x.d.kind} ${x.method} ${x.url} – ${x.d.reason}`).join('\n'), contentType: 'text/plain' })
      await g.context.close()
    }
  })
}
