// Kjører hele e2e-dev mot connecthub-dev uten at noen må skrive passord (godkjent 2026-10-17):
//  1. henter dev-prosjektets service_role-nøkkel via den innloggede Supabase-CLI-en – bare i minnet, aldri skrevet ut
//  2. bygger publiseringsbygget (media-lab `npm run build`, med /app) mot connecthub-dev
//  3. starter `vite preview` (samme ruter og /api som på Vercel) med nøkkelen og testpostkassen (e-post skrives til fil,
//     sendes aldri)
//  4. gir de syntetiske testkontoene nye tilfeldige passord (aldri vist eller lagret) og fjerner MFA-faktorer på stab
//  5. kjører testene per rolle, og gir kontoene nye ukjente passord til slutt
// Bare connecthub-dev: stopper hvis .env.local eller nøkkelen gjelder et annet prosjekt.
//   node e2e-dev/run-dev.mjs [--no-build] [--only=user,admin,dev,mod,livslop]
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REF = 'uatpdmhnwwjgzlxaucsx'
const SUPA = `https://${REF}.supabase.co`
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY = path.resolve(WEB, '../media-lab')
const PORT = 5191
const BASE = `http://localhost:${PORT}`
const win = process.platform === 'win32'
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const say = (m) => console.log(`\x1b[36m[run-dev]\x1b[0m ${m}`)

function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: win, maxBuffer: 1e8, ...opts })
  return r.stdout ?? ''
}

// 0. bare dev
const envLocal = fs.readFileSync(path.join(LEGACY, '.env.local'), 'utf8')
if (!envLocal.includes(`${REF}.supabase.co`)) throw new Error('media-lab/.env.local peker ikke på connecthub-dev – stopper')
// offentlig nøkkel (publishable) til testenes direktekall; produksjonsbygget har ingen global for den
const PUBLISHABLE = /^CONNECTHUB_SUPABASE_PUBLISHABLE_KEY=(.+)$/m.exec(envLocal)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!PUBLISHABLE?.startsWith('sb_publishable_')) throw new Error('fant ikke den offentlige nøkkelen i media-lab/.env.local')

// 1. nøkkel (legacy service_role-JWT for dev; kontrollert mot prosjekt og rolle)
const keysOut = capture('npx', ['--yes', 'supabase@latest', 'projects', 'api-keys', '--project-ref', REF, '-o', 'json'])
const keys = JSON.parse(keysOut.slice(keysOut.search(/[[{]/)))
const KEY = (Array.isArray(keys) ? keys : keys.keys ?? []).find((k) => k.id === 'service_role')?.api_key
if (!KEY) throw new Error('fant ikke nøkkelen for dev (er Supabase-CLI-en innlogget?)')
const claims = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64url').toString())
if (claims.ref !== REF || claims.role !== 'service_role') throw new Error('nøkkelen gjelder ikke connecthub-dev – stopper')
say('nøkkel for connecthub-dev hentet (bare i minnet)')

// 2. bygg
if (!process.argv.includes('--no-build')) {
  say('bygger publiseringsbygget (media-lab npm run build)')
  const b = spawnSync('npm', ['run', 'build'], { cwd: LEGACY, stdio: 'inherit', shell: win, env: { ...process.env, ML_TEST_NO_BACKEND: '' } })
  if (b.status !== 0) throw new Error('bygget feilet')
}

// 3. server
// utenfor test-results: Playwright tømmer den mappen ved hver kjøring
const MAILBOX = path.join(os.tmpdir(), `ch-dev-mailbox-${process.pid}.jsonl`)
fs.mkdirSync(path.dirname(MAILBOX), { recursive: true })
fs.writeFileSync(MAILBOX, '')
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: LEGACY, shell: win, stdio: 'ignore', env: { ...process.env, CONNECTHUB_SUPABASE_SECRET_KEY: KEY, CH_TEST_MAILBOX: MAILBOX },
})
const stopServer = () => { if (win) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); else server.kill() }
process.on('exit', stopServer)
for (let i = 0; ; i++) {
  try { if ((await fetch(`${BASE}/login`)).ok) break } catch { /* starter */ }
  if (i > 120) throw new Error('serveren startet ikke')
  await new Promise((r) => setTimeout(r, 500))
}
say(`publiseringsbygget kjører på ${BASE} (connecthub-dev, testpostkasse)`)

// 4. testkontoer
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'connecthub-dev-e2e' }
async function admin(p, init = {}) {
  const r = await fetch(`${SUPA}/auth/v1/admin${p}`, { ...init, headers: H })
  if (!r.ok) throw new Error(`Auth admin ${init.method ?? 'GET'} ${p.replace(/[0-9a-f-]{36}/g, '…')}: ${r.status}`)
  return r.status === 204 ? null : r.json()
}
const all = (await admin('/users?page=1&per_page=1000')).users
const userId = (email) => all.find((u) => u.email === email)?.id
async function newPassword(id) {
  const pw = crypto.randomBytes(18).toString('base64url') + 'a1'
  await admin(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ password: pw }) })
  return pw
}
async function dropFactors(id) {
  const u = await admin(`/users/${id}`)
  for (const f of u.factors ?? []) await admin(`/users/${id}/factors/${f.id}`, { method: 'DELETE' })
  return (u.factors ?? []).length
}

// Kontoer som testene selv lager (ch-test-e2e-<tall>@example.com): en invitasjon via testpostkassen lager en innloggings-
// konto hos Supabase (generateLink). Blir de liggende (ubrukt invitasjon, eller en test som stoppet), fjernes de som ved
// «Slett kontoen min»: delete_account (appens data via koblingen i user_identities), deretter innloggingskontoen.
async function cleanupInvited() {
  const list = (await admin('/users?page=1&per_page=1000')).users
  const users = list.filter((u) => /^ch-test-e2e-\d+@example\.com$/.test(u.email ?? ''))
  say(`opprydding: ${list.length} kontoer i dev, ${users.length} fra testene`)
  for (const u of users) {
    const r = await fetch(`${SUPA}/rest/v1/user_identities?select=provider&subject=eq.${u.id}`, { headers: H })
    if (!r.ok) throw new Error(`user_identities: ${r.status}`)
    for (const i of await r.json()) {
      const d = await fetch(`${SUPA}/rest/v1/rpc/delete_account`, { method: 'POST', headers: H, body: JSON.stringify({ p_issuer: i.provider, p_subject: u.id }) })
      if (!d.ok) throw new Error(`delete_account: ${d.status}`)
    }
    await admin(`/users/${u.id}`, { method: 'DELETE' })
  }
  return users.length
}

const RUNS = [
  { name: 'user', email: 'ch-test-user@example.com', role: 'user', specs: ['integration-dev', 'admin-dev', 'access-dev', 'server-dev', 'photo-dev', 'feedback-dev'], env: { ML_DEV_ALLOW_FEEDBACK: 'JA' } },
  { name: 'admin', email: 'ch-test-admin@example.com', role: 'admin', specs: ['admin-dev', 'access-dev', 'server-dev', 'member-limit-dev', 'admin-write-dev', 'sources-dev'] },
  { name: 'dev', email: 'ch-test-dev@example.com', role: 'staff', specs: ['staff-dev'] },
  { name: 'mod', email: 'ch-test-mod@example.com', role: 'staff', specs: ['staff-dev'] },
  { name: 'livslop', email: 'ch-test-dev@example.com', role: 'staff', specs: ['lifecycle-dev'] },
].filter((r) => !only.length || only.includes(r.name))

const results = []
try {
  for (const run of RUNS) {
    const id = userId(run.email)
    if (!id) { results.push([run.name, 'mangler kontoen']); continue }
    const pw = await newPassword(id)
    if (run.role === 'staff') say(`${run.name}: ${await dropFactors(id)} MFA-faktor(er) fjernet før testen`)
    say(`${run.name}: kjører ${run.specs.join(', ')}`)
    const r = spawnSync('npx', ['playwright', 'test', '-c', 'e2e-dev', ...run.specs], {
      cwd: WEB, stdio: 'inherit', shell: win,
      env: { ...process.env, ML_DEV_BASE: BASE, ML_DEV_EMAIL: run.email, ML_DEV_PASSWORD: pw, ML_DEV_ROLE: run.role, ML_DEV_MAILBOX: MAILBOX, ML_DEV_SUPABASE_URL: SUPA, ML_DEV_PUBLISHABLE_KEY: PUBLISHABLE, ...(run.env ?? {}) },
    })
    results.push([run.name, r.status === 0 ? 'bestått' : `FEILET (rc ${r.status})`])
  }
} finally {
  for (const run of RUNS) { const id = userId(run.email); if (id) await newPassword(id).catch(() => undefined) }
  for (const run of RUNS.filter((x) => x.role === 'staff')) { const id = userId(run.email); if (id) await dropFactors(id).catch(() => undefined) }
  // invitasjoner via testpostkassen lager en innloggingskonto hos Supabase (generateLink); de som aldri ble godtatt
  // (ingen brukerprofil), og bare med testenes egne adresser, fjernes igjen
  say(`opprydding: ${await cleanupInvited().catch((e) => `feilet (${e.message})`)} testkonto(er) laget av testene fjernet`)
  stopServer()
}
say(`e-poster i testpostkassen: ${fs.readFileSync(MAILBOX, 'utf8').split('\n').filter(Boolean).length}`)
// postkassen har lenker (invitasjon, «Glemt passord»): slettes etter kjøringen
fs.rmSync(MAILBOX, { force: true })
for (const [n, s] of results) say(`${n}: ${s}`)
process.exitCode = results.every(([, s]) => s === 'bestått') ? 0 : 1
