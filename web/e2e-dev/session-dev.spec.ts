import { expect, test, type Page } from '@playwright/test'
import { EMAIL, expectHub, injectBackend, PASSWORD, signInPassword, signOut } from './helpers'

/**
 * Innloggingsøkten mot connecthub-dev (run-dev.mjs, løpet «okt»): hvor økten ligger og hvor lenge, informasjonskapselen
 * `ch_at` (levetid og flagg), fornyelse når tilgangstokenet er utløpt (brukeren forblir innlogget), og utlogging
 * (økten fjernes lokalt, informasjonskapselen slettes, og det gamle refresh-tokenet avvises av Supabase).
 * Ingen tokenverdier skrives ut – bare lengder, tidspunkter og statuskoder.
 */
test.skip(!EMAIL || !PASSWORD, 'kjøres av run-dev.mjs')
test.beforeEach(async ({ page }) => injectBackend(page))

interface Stored { access_token?: string; refresh_token?: string; expires_at?: number }
/** Tidsfelt i tilgangstokenet (JWT-nyttelasten, ikke signaturen; selve tokenet skrives aldri ut). */
const claims = (jwt: string): { exp?: number; iat?: number; amr?: { method: string }[]; session_id?: string } => JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8'))
const stored = (page: Page) => page.evaluate(() => { const v = localStorage.getItem('ch.auth'); return v ? (JSON.parse(v) as Stored) : null })

test('økt: levetid, informasjonskapsel, fornyelse og utlogging', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'én gang')
  test.setTimeout(300_000)
  await signInPassword(page)
  await expectHub(page)
  const s0 = await stored(page)
  expect(s0?.refresh_token?.length ?? 0, 'refresh-token lagret i nettleseren').toBeGreaterThan(8)
  const c0 = claims(s0?.access_token ?? '')
  console.log(`OKT JWT: levetid ${((c0.exp ?? 0) - (c0.iat ?? 0)) / 60} min, innloggingsmetode ${(c0.amr ?? []).map((a) => a.method).join(',')}`)
  expect((c0.exp ?? 0) - (c0.iat ?? 0), 'tilgangstokenet utstedes for én time').toBe(3600)
  const ttl = (s0?.expires_at ?? 0) - Date.now() / 1000
  expect(ttl, 'tilgangstokenet varer omtrent én time').toBeGreaterThan(50 * 60)
  expect(ttl).toBeLessThan(65 * 60)
  const ck = (await context.cookies()).find((c) => c.name === 'ch_at')
  expect(ck, 'informasjonskapselen ch_at finnes').toBeTruthy()
  expect(ck?.sameSite).toBe('Lax')
  expect((ck?.expires ?? 0) - Date.now() / 1000, 'ch_at følger tilgangstokenets levetid').toBeLessThan(65 * 60)
  console.log(`OKT tilgangstoken ${Math.round(ttl / 60)} min, ch_at ${Math.round(((ck?.expires ?? 0) - Date.now() / 1000) / 60)} min, sameSite ${ck?.sameSite}, secure ${ck?.secure}, httpOnly ${ck?.httpOnly}`)

  // fornyelse: tilgangstokenet gjøres «utløpt» – appen fornyer ved neste lasting, og brukeren er fortsatt innlogget
  const oldRefresh = s0?.refresh_token ?? ''
  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem('ch.auth') ?? '{}') as Stored
    v.expires_at = Math.floor(Date.now() / 1000) - 60
    localStorage.setItem('ch.auth', JSON.stringify(v))
  })
  await page.reload()
  await expectHub(page)
  await expect.poll(async () => ((await stored(page))?.expires_at ?? 0) - Date.now() / 1000, { timeout: 30_000, message: 'nytt tilgangstoken etter fornyelse' }).toBeGreaterThan(50 * 60)
  const s1 = await stored(page)
  expect(s1?.access_token === s0?.access_token, 'nytt tilgangstoken').toBe(false)
  console.log('OKT fornyet: innlogget etter utløpt tilgangstoken')

  // utlogging: lokalt borte, informasjonskapsel slettet, refresh-tokenet avvises på serveren
  const current = s1?.refresh_token ?? ''
  await signOut(page)
  expect(await stored(page), 'økten er fjernet fra nettleseren').toBeNull()
  expect((await context.cookies()).find((c) => c.name === 'ch_at' && c.value), 'ch_at er slettet').toBeFalsy()
  const url = process.env.ML_DEV_SUPABASE_URL ?? ''
  const key = process.env.ML_DEV_PUBLISHABLE_KEY ?? ''
  const reuse = async (rt: string) => (await page.request.post(`${url}/auth/v1/token?grant_type=refresh_token`, { headers: { apikey: key, 'content-type': 'application/json' }, data: { refresh_token: rt } })).status()
  const a = await reuse(current), b = await reuse(oldRefresh)
  console.log(`OKT etter utlogging: siste refresh-token → ${a}, første refresh-token → ${b}`)
  expect(a, 'refresh-tokenet virker ikke etter utlogging').toBeGreaterThanOrEqual(400)
  expect(b, 'det første (allerede brukte) refresh-tokenet virker ikke').toBeGreaterThanOrEqual(400)

  // rotasjon og gjenbruk: ny innlogging, fornyelse, så det gamle refresh-tokenet brukes på nytt etter 11 s
  await signInPassword(page)
  await expectHub(page)
  const r0 = (await stored(page))?.refresh_token ?? ''
  const sid0 = claims((await stored(page))?.access_token ?? '').session_id
  const fresh = await page.request.post(`${url}/auth/v1/token?grant_type=refresh_token`, { headers: { apikey: key, 'content-type': 'application/json' }, data: { refresh_token: r0 } })
  expect(fresh.status(), 'fornyelse med gyldig refresh-token').toBe(200)
  const r1 = ((await fresh.json()) as { refresh_token?: string }).refresh_token ?? ''
  expect(r1 && r1 !== r0, 'nytt refresh-token ved hver fornyelse (rotasjon)').toBe(true)
  await page.waitForTimeout(11_000)
  const again = await reuse(r0)
  const after = await reuse(r1)
  console.log(`OKT rotasjon: brukt token etter 11 s → ${again}; det nyeste tokenet etterpå → ${after} (økt ${sid0 ? 'med id' : 'uten id'})`)
  await page.waitForTimeout(60_000)
  const late = await reuse(r0)
  console.log(`OKT rotasjon: brukt token etter 71 s → ${late}`)
  // dev: et brukt refresh-token godtas fortsatt etter 11 s (gjenbruksvinduet er lengre enn Supabases standard 10 s),
  // men avvises etter 71 s – se docs/statusrevisjon (innlogging)
  expect(late, 'et brukt refresh-token avvises når gjenbruksvinduet er ute').toBeGreaterThanOrEqual(400)
  test.info().annotations.push({ type: 'gjenbruk', description: `11 s: ${again}, 71 s: ${late}` })
})
