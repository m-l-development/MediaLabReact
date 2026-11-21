import { expect, test, type Page } from '@playwright/test'
import { api, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, rpc, signInAs, signOut } from './helpers'

/**
 * Menighetsbruker (felleskonto) ende til ende mot connecthub-dev (run-dev.mjs, løpet «menighet»): Admin (A) og Bruker (B)
 * i «CH-test Menighet A», og et medlem av en annen menighet som kontroll. Testen lager selv kontoen «e2e-menighet-<tid>»
 * og sletter den (og innboksens filer) til slutt; menighetens eksisterende Menighetsbruker (om den finnes) røres ikke –
 * da hopper testen over.
 *  1. Admin oppretter Menighetsbrukeren i Brukere (brukernavn + passord, ingen e-post); nummer to avvises.
 *  2. Innlogging med brukernavn (eget valg «Menighetsbruker»), merket som felleskonto; ingen «Bytt passord» eller sletting.
 *  3. Vedvarende økt: ny nettleserkontekst med samme lagrede økt (= nettleser lukket / PC startet på nytt) er fortsatt innlogget.
 *  4. B sender to filer samtidig fra «Send til menighet»; Menighetsbrukeren ser avsender og tid, åpner og laster ned; filene
 *     finnes etter ny innlogging. Medlem av en annen menighet får verken liste eller lenker.
 *  5. Årlig passordbytte: passordtidspunktet settes 13 måneder tilbake (dev-nøkkel) → popupen; ulike passord gir feil;
 *     riktig bytte gir tilgang; ny periode registrert. «parish.rotate» avvises når passordet ikke er forfalt.
 *  6. Admin endrer passordet → gamle økter avvises; Admin logger ut alle; Admin deaktiverer → innlogging avvises; aktiverer.
 */
test.skip(!EMAIL || !EMAIL2 || process.env.ML_DEV_ROLE !== 'pair' || !process.env.ML_DEV_SERVICE_KEY, 'kjøres av run-dev.mjs (løpet «menighet»)')
test.beforeEach(async ({ page }) => injectBackend(page))

const SUPA = process.env.ML_DEV_SUPABASE_URL ?? ''
const KEY = process.env.ML_DEV_SERVICE_KEY ?? ''
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const svc = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(`${SUPA}${path}`, { ...init, headers: { ...H, ...(init.headers as Record<string, string> | undefined) } })
  return { status: r.status, body: (await r.json().catch(() => null)) as unknown }
}
const PW1 = `Menighet${Date.now() % 100000}a1`
const PW2 = `Nytt${Date.now() % 100000}passord9`
const PW3 = `Admin${Date.now() % 100000}satt7`

/** Fjerner testens egne Menighetsbrukere («e2e-menighet-*») i menigheten: innboksfilene «*-e2e.*», kontoen, brukeren og
 *  innloggingskontoen. Kjøres før (rester etter en avbrutt kjøring) og etter testen. Rører aldri andre kontoer. */
async function cleanup(church: string) {
  const accs = (await svc(`/rest/v1/parish_accounts?select=id,user_id&church_id=eq.${church}&username=like.e2e-menighet-*`)).body as { id: string; user_id: string | null }[] | null
  if (!accs?.length) return
  const inbox = (await svc(`/rest/v1/parish_inbox?select=storage_key&church_id=eq.${church}&file_name=like.*-e2e.*`)).body as { storage_key: string }[] | null
  if (inbox?.length) await svc('/storage/v1/object/ch-inbox', { method: 'DELETE', body: JSON.stringify({ prefixes: inbox.map((i) => i.storage_key) }) })
  await svc(`/rest/v1/parish_inbox?church_id=eq.${church}&file_name=like.*-e2e.*`, { method: 'DELETE' })
  for (const x of accs) {
    const ident = x.user_id ? ((await svc(`/rest/v1/user_identities?select=provider,subject&user_id=eq.${x.user_id}`)).body as { provider: string; subject: string }[] | null) ?? [] : []
    await svc(`/rest/v1/parish_accounts?id=eq.${x.id}`, { method: 'DELETE' })
    for (const i of ident) {
      await svc('/rest/v1/rpc/delete_account', { method: 'POST', body: JSON.stringify({ p_issuer: i.provider, p_subject: i.subject }) })
      await svc(`/auth/v1/admin/users/${i.subject}`, { method: 'DELETE' })
    }
  }
}

async function parishLogin(page: Page, username: string, password: string) {
  await page.goto('/app/')
  const kind = page.locator('[data-ch-kind="parish"]')
  await expect(kind).toBeVisible({ timeout: 30_000 })
  await kind.click()
  await page.locator('[data-ch-parish-username]').fill(username)
  // /login stopper en fjerde videresending innen 15 s (vern mot rundgang); testen logger inn raskere enn et menneske
  await page.evaluate(() => { try { sessionStorage.removeItem('ch.loop') } catch { /* ingen lagring */ } })
  await page.getByLabel('Passord', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Logg inn som menighetsbruker' }).click()
}

test('Menighetsbruker: opprettelse, innlogging, innboks, årlig passord, økter og deaktivering', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang (mobilvisningen testes i del 4)')
  test.setTimeout(480_000)
  const username = `e2e-menighet-${Date.now() % 1000000}`
  page.on('dialog', (d) => void d.accept())
  // fremdrift og feil fra siden i loggen (feilsøking)
  const step = (n: string) => console.log(new Date().toISOString().slice(11, 19), 'STEG', n)
  page.on('console', (m) => { if (m.type() === 'error') console.log('KONSOLL', m.text().slice(0, 300)) })
  page.on('response', (r) => { if (r.status() >= 400 && /\/(rest|auth)\/v1\/|\/api\/ch/.test(r.url())) console.log('SVAR', r.status(), r.url().replace(/https:\/\/[^/]+/, '').slice(0, 120)) })
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  const church = ((await rpc(page, 'whoami', {})).body as { churches: { id: string; name: string }[] }).churches[0]
  expect(church?.name).toBe('CH-test Menighet A')
  // rester fra en tidligere avbrutt kjøring (bare testens egne kontoer «e2e-menighet-*»)
  await cleanup(church!.id)
  const existing = (await rpc(page, 'parish_account_get', { p_church: church!.id })).body
  test.skip(!!existing, 'menigheten har en ekte Menighetsbruker – testen rører den ikke')
  try {
    // ---------- 1. Admin oppretter ----------
    step('1 opprett')
    await page.goto('/app/admin#/brukere')
    const card = page.locator(`[data-ch-parish-card="${church!.id}"]`)
    await expect(card).toBeVisible({ timeout: 30_000 })
    await card.locator('[data-ch-parish-create]').click()
    await card.locator('[data-ch-parish-user]').fill(username)
    await card.locator('[data-ch-parish-pw]').fill(PW1)
    await card.locator('[data-ch-parish-pw2]').fill(PW1)
    await expect(card.locator('input[type=email]'), 'ingen e-postfelt').toHaveCount(0)
    await card.getByRole('button', { name: 'Opprett menighetsbruker' }).click()
    await expect(card.locator('[data-ch-parish-username]')).toHaveText(username, { timeout: 30_000 })
    const acc = (await rpc(page, 'parish_account_get', { p_church: church!.id })).body as { id: string; username: string; status: string }
    expect(acc).toMatchObject({ username, status: 'active' })
    const second = await api(page, 'parish.create', { church: church!.id, username: username + 'x', password: PW1 })
    expect(second.error, 'nummer to i samme menighet').toBe('parish_exists')
    const row = (await svc(`/rest/v1/parish_accounts?select=user_id,login_email&id=eq.${acc.id}`)).body as { user_id: string; login_email: string }[]
    expect(row[0]!.login_email).toMatch(/@menighetsbruker\.invalid$/)
    const mem = (await svc(`/rest/v1/memberships?select=church_id,status&user_id=eq.${row[0]!.user_id}`)).body as { church_id: string; status: string }[]
    expect(mem).toEqual([{ church_id: church!.id, status: 'active' }])
    await signOut(page)

    // ---------- 2. Innlogging med brukernavn ----------
    step('2 innlogging')
    await parishLogin(page, username, 'feil-passord1')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 })
    await parishLogin(page, username, PW1)
    await expectHub(page)
    await expect(page.locator('[data-ch-inbox-link]')).toBeVisible()
    await page.getByRole('button', { name: 'Konto' }).click()
    await expect(page.locator('[data-ch-parish-who]')).toContainText('Felleskonto')
    await expect(page.locator('[data-ch-parish-who]')).toContainText('CH-test Menighet A')
    await page.getByRole('button', { name: 'Konto og sikkerhet' }).click()
    await expect(page.locator('[data-ch-pwchange]')).toHaveCount(0)
    await expect(page.locator('[data-ch-delete]')).toHaveCount(0)
    await page.keyboard.press('Escape')
    expect((await api(page, 'parish.rotate', { password: PW2 })).error, 'ingen vanlig passordendring').toBe('not_due')
    expect((await api(page, 'privacy.delete_me', { confirm: 'SLETT' })).status).toBe(403)

    // ---------- 3. Vedvarende økt ----------
    step('3 vedvarende økt')
    const state = await page.context().storageState()
    const again = await browser.newContext({ baseURL: info.project.use.baseURL, storageState: state })
    const p2 = await again.newPage()
    await injectBackend(p2)
    await p2.goto('/app/')
    await expectHub(p2)
    await again.close()

    // ---------- 4. Filer fra B ----------
    step('4 filer')
    const ctxB = await browser.newContext({ baseURL: info.project.use.baseURL })
    const b = await ctxB.newPage()
    await injectBackend(b)
    await signInAs(b, EMAIL2, PASSWORD2)
    await expectHub(b)
    await b.goto('/app/innboks')
    await b.locator('[data-ch-send-open]').click()
    await expect(b.locator('[data-ch-send-to]')).toContainText('CH-test Menighet A')
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0f01f0005000201a5f5d4f20000000049454e44ae426082', 'hex')
    await b.locator('[data-ch-send-input]').setInputFiles([
      { name: 'plakat-e2e.png', mimeType: 'image/png', buffer: png },
      { name: 'program-e2e.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%e2e\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') },
    ])
    await b.locator('[data-ch-send-go]').click()
    await expect(b.locator('[data-ch-send-done]')).toBeVisible({ timeout: 60_000 })

    await page.goto('/app/innboks')
    const item = page.locator('[data-ch-inbox-item="plakat-e2e.png"]')
    await expect(item).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-ch-inbox-item="program-e2e.pdf"]')).toBeVisible()
    await expect(item.locator('[data-ch-inbox-from]')).toContainText('Fra ')
    const files = (await rpc(page, 'inbox_list', { p_church: church!.id })).body as { id: string; name: string }[]
    const ids = files.filter((f) => /-e2e\./.test(f.name)).map((f) => f.id)
    expect(ids).toHaveLength(2)
    const urls = await api(page, 'inbox.urls', { ids })
    expect(Object.keys((urls.body as { urls: Record<string, string> }).urls)).toHaveLength(2)
    const dl = page.waitForEvent('download')
    await item.getByRole('button', { name: 'Last ned' }).click()
    expect((await dl).suggestedFilename()).toBe('plakat-e2e.png')
    // et vanlig medlem (B) kan sende, men ikke lese innboksen eller få lenker (isolering mellom menigheter: supabase/tests/rls_test.sql)
    expect((await rpc(b, 'inbox_list', { p_church: church!.id })).status).toBeGreaterThanOrEqual(400)
    expect((await api(b, 'inbox.urls', { ids })).body).toMatchObject({ urls: {} })
    await ctxB.close()
    await signOut(page)
    await parishLogin(page, username, PW1)
    await expectHub(page)
    await page.goto('/app/innboks')
    await expect(page.locator('[data-ch-inbox-item="plakat-e2e.png"]'), 'filene finnes etter ny innlogging').toBeVisible({ timeout: 30_000 })

    // ---------- 5. Årlig passordbytte ----------
    step('5 årlig passord')
    const back = new Date(Date.now() - 396 * 86400_000).toISOString()
    expect((await svc(`/rest/v1/parish_accounts?id=eq.${acc.id}`, { method: 'PATCH', body: JSON.stringify({ pw_changed_at: back }) })).status).toBeLessThan(300)
    await page.goto('/app/')
    await expect(page.getByRole('heading', { name: 'Nå er det tid for å bytte passord' })).toBeVisible({ timeout: 30_000 })
    expect((await rpc(page, 'inbox_list', { p_church: church!.id })).status, 'ingen tilgang før byttet').toBeGreaterThanOrEqual(400)
    await page.locator('[data-ch-parish-pw1]').fill(PW2)
    await page.locator('[data-ch-parish-pw2]').fill(PW2 + 'x')
    await page.getByRole('button', { name: 'Lagre nytt passord' }).click()
    await expect(page.getByRole('alert')).toContainText('ikke like')
    await page.locator('[data-ch-parish-pw2]').fill(PW2)
    await page.getByRole('button', { name: 'Lagre nytt passord' }).click()
    await expectHub(page)
    const after = (await svc(`/rest/v1/parish_accounts?select=pw_changed_at&id=eq.${acc.id}`)).body as { pw_changed_at: string }[]
    expect(Date.now() - Date.parse(after[0]!.pw_changed_at)).toBeLessThan(10 * 60_000)

    // ---------- 6. Admin: nytt passord, utlogging, deaktivering ----------
    step('6 admin')
    const ctxA = await browser.newContext({ baseURL: info.project.use.baseURL })
    const a = await ctxA.newPage()
    await injectBackend(a)
    a.on('dialog', (d) => void d.accept())
    await signInAs(a, EMAIL, PASSWORD)
    await expectHub(a)
    expect((await api(a, 'parish.manage', { church: church!.id, action: 'password', password: PW3 })).ok).toBe(true)
    // den gamle økten (side 1) avvises nå av databasen
    expect((await rpc(page, 'inbox_list', { p_church: church!.id })).status).toBeGreaterThanOrEqual(400)
    await page.goto('/app/')
    await expect(page.locator('[data-ch-kind="parish"]').or(page.getByText('Menighetsbrukeren er sperret'))).toBeVisible({ timeout: 30_000 })
    await parishLogin(page, username, PW3)
    await expectHub(page)
    expect((await api(a, 'parish.manage', { church: church!.id, action: 'revoke' })).ok).toBe(true)
    expect((await rpc(page, 'inbox_list', { p_church: church!.id })).status, 'utlogget av Admin').toBeGreaterThanOrEqual(400)
    expect((await api(a, 'parish.manage', { church: church!.id, action: 'disable' })).ok).toBe(true)
    await parishLogin(page, username, PW3)
    await expect(page.getByRole('alert')).toContainText('deaktivert', { timeout: 30_000 })
    expect((await api(a, 'parish.manage', { church: church!.id, action: 'enable' })).ok).toBe(true)
    await parishLogin(page, username, PW3)
    await expectHub(page)
    await ctxA.close()

    // ---------- Mobil: innboksen og innloggingen i telefonbredde (ingen vannrett rulling) ----------
    step('7 mobil')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/app/innboks')
    await expect(page.locator('[data-ch-inbox-item="plakat-e2e.png"]')).toBeVisible({ timeout: 30_000 })
    const overflow = async () => {
      const r = await page.evaluate(() => {
        const over = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} r=${Math.round(e.getBoundingClientRect().right)} w=${Math.round(e.getBoundingClientRect().width)}`)
        const chain: string[] = []
        for (let e: Element | null = document.querySelector('h1'); e; e = e.parentElement) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); chain.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} x=${Math.round(r.left)} w=${Math.round(r.width)} pad=${cs.paddingLeft} disp=${cs.display}`) }
        return { d: document.documentElement.scrollWidth - window.innerWidth, over: [...over, ...chain] }
      })
      if (r.d > 1) console.log('BREDDE', r.d, JSON.stringify(r.over))
      return r.d
    }
    expect(await overflow(), 'innboksen får plass i telefonbredde').toBeLessThanOrEqual(1)
    await signOut(page)
    await expect(page.locator('[data-ch-kind="parish"]')).toBeVisible()
    await expect(page.locator('[data-ch-parish-badge]'), 'felleskontoen er et eget, merket innloggingsvalg').toBeVisible()
    expect(await overflow(), 'innloggingen får plass i telefonbredde').toBeLessThanOrEqual(1)

    // ---------- Den offentlige innloggingssiden (/login – dit sperren sender utloggede besøk i produksjon) ----------
    step('8 /login')
    await page.goto('/login')
    await expect(page.locator('[data-ch-kind="parish"][aria-checked="true"]'), 'felleskontoen er valgt på denne PC-en').toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-ch-parish-badge]')).toBeVisible()
    expect(await overflow(), '/login får plass i telefonbredde').toBeLessThanOrEqual(1)
    await expect(page.locator('[data-ch-parish-username]')).toHaveValue(username)
    await page.getByLabel('Passord', { exact: true }).fill(PW3)
    await page.getByRole('button', { name: 'Logg inn som menighetsbruker' }).click()
    await expectHub(page)
    await expect(page.locator('[data-ch-inbox-link]')).toBeVisible()
  } finally {
    await cleanup(church!.id)
  }
})
