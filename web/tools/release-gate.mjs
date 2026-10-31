#!/usr/bin/env node
// Automatisk release connecthub → main (kjøres av .github/workflows/release.yml med GITHUB_TOKEN; ingen andre nøkler).
//   node web/tools/release-gate.mjs <sha> [--merge]
//
// Uten --merge (tørrkjøring): bare kontrollene. Med --merge: pull request connecthub → main og merge (vanlig
// merge-commit) GJENNOM beskyttelsen på main (påkrevd kontroll «checks» må være grønn), deretter venter den på Vercels
// produksjonsdeploy av merge-commiten og sjekker /app/version.json og hovedadressene.
// Stopper (exit 1) ved første feil: grønne kontroller, Dev-deploy og release-kravene omgås aldri.
import { execFileSync } from 'node:child_process'

const REPO = process.env.GITHUB_REPOSITORY ?? 'm-l-development/MediaLabReact'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const PROD_URL = 'https://media-lab-react-vyef.vercel.app/app/'
const REQUIRED_CHECKS = ['checks', 'e2e']
const sha = process.argv[2] ?? ''
const merge = process.argv.includes('--merge')

const log = (s) => console.log(`[release] ${s}`)
/** Synlig som annotasjon på kjøringen (offentlig lesbar uten innlogging). */
const note = (s) => console.log(`::notice::${s}`)
const fail = (s) => {
  console.log(`::error::${s}`)
  log(`STOPP: ${s}`)
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()

async function gh(path, init = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  const text = await r.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: r.status, ok: r.ok, json }
}

async function waitFor(what, fn, ms, every = 20_000) {
  const t0 = Date.now()
  for (;;) {
    const v = await fn()
    if (v !== undefined) return v
    if (Date.now() - t0 > ms) fail(`tidsavbrudd: ${what}`)
    await sleep(every)
  }
}

/** Påkrevde kontroller (CI-jobbene) for commiten: alle må være fullført og grønne. */
async function checksGreen(s) {
  return waitFor('CI-kontroller', async () => {
    const r = await gh(`/commits/${s}/check-runs?per_page=100`)
    const runs = r.json?.check_runs ?? []
    const by = new Map()
    for (const c of runs) if (REQUIRED_CHECKS.includes(c.name)) by.set(c.name, c)
    if (by.size < REQUIRED_CHECKS.length || [...by.values()].some((c) => c.status !== 'completed')) return undefined
    const bad = [...by.values()].filter((c) => c.conclusion !== 'success')
    if (bad.length) fail(`CI: ${bad.map((c) => `${c.name}=${c.conclusion}`).join(', ')}`)
    return [...by.values()].map((c) => `${c.name}=success`).join(', ')
  }, 75 * 60_000)
}

/** Vercels deploy (rapportert til GitHub) for commiten i miljøet, med status success. */
async function deployGreen(s, envName) {
  return waitFor(`Vercel ${envName}`, async () => {
    const r = await gh(`/deployments?sha=${s}&per_page=20`)
    const dep = (r.json ?? []).find((d) => d.environment === envName)
    if (!dep) return undefined
    const st = (await gh(`/deployments/${dep.id}/statuses?per_page=5`)).json?.[0]
    if (!st || st.state === 'pending' || st.state === 'in_progress' || st.state === 'queued') return undefined
    if (st.state !== 'success') fail(`Vercel ${envName}: ${st.state}`)
    return st.environment_url ?? st.target_url ?? '(ok)'
  }, 30 * 60_000)
}

if (!/^[0-9a-f]{40}$/.test(sha)) fail('mangler commit (sha)')
git('fetch', '-q', 'origin', 'main', 'connecthub')
const head = git('rev-parse', 'origin/connecthub')
if (head !== sha) {
  log(`${sha.slice(0, 7)} er ikke lenger toppen av connecthub (${head.slice(0, 7)}) – en nyere kjøring tar over`)
  process.exit(0)
}
try {
  git('merge-base', '--is-ancestor', 'origin/main', sha)
} catch {
  fail('origin/main er ikke med i connecthub: hent main inn i connecthub først')
}
const migrations = git('diff', '--name-only', '--diff-filter=AM', 'origin/main', sha, '--', 'supabase/migrations').split('\n').filter(Boolean)
if (migrations.length) fail(`nye databasemigreringer krever egen godkjenning og kjøreplan (docs/migration-runbook.md): ${migrations.join(', ')}`)
const ahead = git('rev-list', '--count', `origin/main..${sha}`)
if (ahead === '0') {
  log('ingenting nytt å slippe (main har allerede alt)')
  process.exit(0)
}
log(`kontroller for ${sha.slice(0, 7)} (${ahead} commits foran main) …`)
log(`CI: ${await checksGreen(sha)}`)
log(`Dev (Vercel Preview): ${await deployGreen(sha, 'Preview')}`)
if (git('rev-parse', 'origin/connecthub') !== sha) {
  log('connecthub er flyttet mens kontrollene gikk – en nyere kjøring tar over')
  process.exit(0)
}
const prod = (await gh('/deployments?environment=Production&per_page=1')).json?.[0]
log(`produksjon nå (tilbakerullingsmål): ${prod?.sha?.slice(0, 7) ?? '?'} (Vercel → Deployments → «Instant Rollback»)`)

if (!merge) {
  note(`TØRRKJØRING ${sha.slice(0, 7)}: CI, Dev-deploy, migreringer og main-forfar bestått – ingen pull request eller merge (AUTO_MERGE er av). Tilbakerullingsmål: ${prod?.sha?.slice(0, 7) ?? '?'}`)
  process.exit(0)
}

// pull request connecthub → main (gjenbrukes hvis den finnes)
const owner = REPO.split('/')[0]
let pr = (await gh(`/pulls?state=open&base=main&head=${owner}:connecthub`)).json?.[0]
if (!pr) {
  const c = await gh('/pulls', { method: 'POST', body: JSON.stringify({ title: `Release connecthub ${sha.slice(0, 7)}`, head: 'connecthub', base: 'main', body: `Automatisk release (release.yml): CI ${REQUIRED_CHECKS.join(' + ')} grønn, Dev-deploy grønn, ingen migreringer.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)` }) })
  if (!c.ok) fail(`kunne ikke lage pull request (${c.status}): ${c.json?.message ?? ''} – sjekk «Allow GitHub Actions to create and approve pull requests» i repoets innstillinger`)
  pr = c.json
}
log(`pull request #${pr.number}`)
const m = await gh(`/pulls/${pr.number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'merge', sha }) })
if (!m.ok) fail(`merge avvist (${m.status}): ${m.json?.message ?? ''}`)
const mergeSha = m.json?.sha
log(`merget: ${mergeSha?.slice(0, 7)}`)

// produksjon: Vercel deployer main automatisk; vent og kontroller
log(`produksjon (Vercel Production): ${await deployGreen(mergeSha, 'Production')}`)
const v = await waitFor('produksjonens version.json', async () => {
  const j = await (await fetch(`${PROD_URL}version.json`, { cache: 'no-store' })).json().catch(() => null)
  return j && String(j.v).startsWith(mergeSha.slice(0, 7)) ? j.v : undefined
}, 10 * 60_000, 15_000)
for (const p of ['', 'photo-design', 'motion-design', 'mockups', 'loop-studio', 'thumbnail-studio', 'isolate-subject']) {
  const r = await fetch(`${PROD_URL}${p}`, { redirect: 'manual' })
  if (r.status >= 400) fail(`produksjon: ${PROD_URL}${p} svarer ${r.status} – rull tilbake (Vercel «Instant Rollback» til ${prod?.sha?.slice(0, 7)})`)
}
note(`FERDIG: produksjonen kjører ${String(v).slice(0, 7)} (version.json og 7 adresser OK). Tilbakerullingsmål: ${prod?.sha?.slice(0, 7) ?? '?'}`)
