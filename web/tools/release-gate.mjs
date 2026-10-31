#!/usr/bin/env node
// Release connecthub → main (kjøres av .github/workflows/release.yml og release-verify.yml med GITHUB_TOKEN; ingen
// andre nøkler). Se docs/publisering.md.
//
//   node web/tools/release-gate.mjs <sha>                 tørrkjøring: bare kontrollene
//   node web/tools/release-gate.mjs <sha> --pr            + pull request connecthub → main og commit-status «release-gate»
//                                                          (anbefalt: et menneske godkjenner og merger)
//   node web/tools/release-gate.mjs <sha> --merge         + merge gjennom beskyttelsen på main (full automatikk)
//   node web/tools/release-gate.mjs <sha> --after-deploy  etter Vercels produksjonsdeploy av <sha> (på main): kontroller
//                                                          produksjonen, og spol så connecthub fram (bare fast-forward)
//
// Kontrollene (alle moduser utenom --after-deploy): <sha> er toppen av connecthub, main er med, ingen nye migreringer,
// CI «checks» + «e2e» grønne (nyeste kjøring per kontroll), Vercels Dev-deploy av <sha> grønn. Stopper (exit 1) ved
// første feil; en kjøring for en commit som ikke lenger er toppen, avslutter uten feil. Ingenting omgås.
import { execFileSync } from 'node:child_process'

const REPO = process.env.GITHUB_REPOSITORY ?? 'm-l-development/MediaLabReact'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const PROD_URL = 'https://media-lab-react-vyef.vercel.app/app/'
const PAGES = ['', 'photo-design', 'motion-design', 'mockups', 'loop-studio', 'thumbnail-studio', 'isolate-subject']
const REQUIRED_CHECKS = ['checks', 'e2e']
const STATUS_CONTEXT = 'release-gate'
const sha = process.argv[2] ?? ''
const mode = process.argv.includes('--after-deploy') ? 'after-deploy' : process.argv.includes('--merge') ? 'merge' : process.argv.includes('--pr') ? 'pr' : 'dry-run'

const log = (s) => console.log(`[release] ${s}`)
/** Synlig som annotasjon på kjøringen (offentlig lesbar uten innlogging). */
const note = (s) => console.log(`::notice::${s}`)
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

/** Commit-status «release-gate» på <sha> (kan gjøres til påkrevd kontroll på main). Bare i --pr/--merge. */
async function status(state, description) {
  if (mode !== 'pr' && mode !== 'merge') return
  const r = await gh(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state, context: STATUS_CONTEXT, description: description.slice(0, 140), target_url: process.env.RUN_URL || undefined }) })
  if (!r.ok) console.log(`::warning::kunne ikke sette status ${STATUS_CONTEXT} (${r.status})`)
}

async function fail(s) {
  console.log(`::error::${s}`)
  log(`STOPP: ${s}`)
  await status('failure', s)
  process.exit(1)
}

/** Toppen av connecthub nå (GitHub, ikke lokal kopi). */
async function connecthubHead() {
  return (await gh('/git/ref/heads/connecthub')).json?.object?.sha ?? git('rev-parse', 'origin/connecthub')
}

/** Avslutter uten feil hvis <sha> ikke lenger er toppen av connecthub (en nyere kjøring står i kø). */
async function exitIfSuperseded(when) {
  const head = await connecthubHead()
  if (head === sha) return
  log(`${sha.slice(0, 7)} er ikke lenger toppen av connecthub (${head.slice(0, 7)}) ${when} – en nyere kjøring tar over`)
  process.exit(0)
}

async function waitFor(what, fn, ms, every = 20_000) {
  const t0 = Date.now()
  for (;;) {
    const v = await fn()
    if (v !== undefined) return v
    if (Date.now() - t0 > ms) await fail(`tidsavbrudd: ${what}`)
    await sleep(every)
  }
}

/**
 * Påkrevde kontroller for commiten: for hver kontroll teller den NYESTE kjøringen (ny kjøring av en jobb, eller CI på en
 * pull request med samme commit, lager flere). Alle må være fullført og grønne.
 */
async function checksGreen(s) {
  return waitFor('CI-kontroller', async () => {
    const runs = (await gh(`/commits/${s}/check-runs?per_page=100`)).json?.check_runs ?? []
    const by = new Map()
    for (const c of runs) {
      if (!REQUIRED_CHECKS.includes(c.name)) continue
      const prev = by.get(c.name)
      if (!prev || Date.parse(c.started_at ?? 0) > Date.parse(prev.started_at ?? 0) || (c.started_at === prev.started_at && c.id > prev.id)) by.set(c.name, c)
    }
    if (by.size < REQUIRED_CHECKS.length || [...by.values()].some((c) => c.status !== 'completed')) return undefined
    const bad = [...by.values()].filter((c) => c.conclusion !== 'success')
    if (bad.length) {
      await exitIfSuperseded('(CI ble avbrutt av en nyere push)')
      await fail(`CI: ${bad.map((c) => `${c.name}=${c.conclusion}`).join(', ')}`)
    }
    return [...by.values()].map((c) => `${c.name}=success`).join(', ')
  }, 75 * 60_000)
}

/** Vercels nyeste deploy (rapportert til GitHub) av commiten i miljøet, med status success. */
async function deployGreen(s, envName) {
  return waitFor(`Vercel ${envName}`, async () => {
    const dep = ((await gh(`/deployments?sha=${s}&per_page=20`)).json ?? []).find((d) => d.environment === envName)
    if (!dep) return undefined
    const st = (await gh(`/deployments/${dep.id}/statuses?per_page=5`)).json?.[0]
    if (!st || st.state === 'pending' || st.state === 'in_progress' || st.state === 'queued') return undefined
    if (st.state !== 'success') await fail(`Vercel ${envName}: ${st.state}`)
    return st.environment_url ?? st.target_url ?? '(ok)'
  }, 30 * 60_000)
}

/** Produksjonen kjører <s>: version.json på produksjonsadressen og hovedadressene svarer. */
async function verifyProduction(s, rollback) {
  log(`produksjon (Vercel Production): ${await deployGreen(s, 'Production')}`)
  const v = await waitFor('produksjonens version.json', async () => {
    const j = await (await fetch(`${PROD_URL}version.json`, { cache: 'no-store' })).json().catch(() => null)
    return j && String(j.v).startsWith(s.slice(0, 7)) ? j.v : undefined
  }, 10 * 60_000, 15_000)
  for (const p of PAGES) {
    const r = await fetch(`${PROD_URL}${p}`, { redirect: 'manual' })
    if (r.status >= 400) await fail(`produksjon: ${PROD_URL}${p} svarer ${r.status} – vurder Vercel «Instant Rollback»${rollback ? ` til ${rollback}` : ''}`)
  }
  note(`PRODUKSJON VERIFISERT: ${String(v).slice(0, 7)} (deploy success, version.json, ${PAGES.length} adresser)`)
}

/**
 * Spoler connecthub fram til <s> – bare fast-forward (GitHub avviser alt annet med force: false), så nyere arbeid på
 * connecthub aldri overskrives. Kalles bare etter verifyProduction.
 */
async function fastForwardConnecthub(s) {
  const ff = await gh('/git/refs/heads/connecthub', { method: 'PATCH', body: JSON.stringify({ sha: s, force: false }) })
  if (ff.ok) log(`connecthub spolt fram til ${s.slice(0, 7)}`)
  else console.log(`::warning::connecthub ble ikke spolt fram (${ff.status}: ${ff.json?.message ?? ''}) – nyere arbeid på connecthub? Kjør «git merge origin/main» på connecthub før neste ship-dev`)
}

if (!/^[0-9a-f]{40}$/.test(sha)) await fail('mangler commit (sha)')
git('fetch', '-q', 'origin', 'main', 'connecthub')

// ---- etter produksjonsdeploy (release-verify.yml, utløst av Vercels deployment_status) ----
if (mode === 'after-deploy') {
  const main = git('rev-parse', 'origin/main')
  if (main !== sha) {
    log(`${sha.slice(0, 7)} er ikke toppen av main (${main.slice(0, 7)}) – ingenting å gjøre (ny deploy av en eldre commit, eller main har gått videre)`)
    process.exit(0)
  }
  await verifyProduction(sha, null)
  await fastForwardConnecthub(sha)
  process.exit(0)
}

// ---- kontrollene før release ----
await exitIfSuperseded('')
try {
  git('merge-base', '--is-ancestor', 'origin/main', sha)
} catch {
  await fail('origin/main er ikke med i connecthub: hent main inn i connecthub først')
}
const migrations = git('diff', '--name-only', '--diff-filter=AM', 'origin/main', sha, '--', 'supabase/migrations').split('\n').filter(Boolean)
if (migrations.length) await fail(`nye databasemigreringer krever egen godkjenning og kjøreplan (docs/migration-runbook.md): ${migrations.join(', ')}`)
const ahead = git('rev-list', '--count', `origin/main..${sha}`)
if (ahead === '0') {
  log('ingenting nytt å slippe (main har allerede alt)')
  process.exit(0)
}
await status('pending', 'venter på CI og Dev-deploy')
log(`kontroller for ${sha.slice(0, 7)} (${ahead} commits foran main) …`)
const ci = await checksGreen(sha)
log(`CI: ${ci}`)
const dev = await deployGreen(sha, 'Preview')
log(`Dev (Vercel Preview): ${dev}`)
await exitIfSuperseded('mens kontrollene gikk')
const prod = (await gh('/deployments?environment=Production&per_page=1')).json?.[0]
const rollback = prod?.sha?.slice(0, 7) ?? '?'
log(`produksjon nå (tilbakerullingsmål): ${rollback} (Vercel → Deployments → «Instant Rollback»)`)

if (mode === 'dry-run') {
  note(`TØRRKJØRING ${sha.slice(0, 7)}: CI, Dev-deploy, migreringer og main-forfar bestått – ingen pull request eller merge. Tilbakerullingsmål: ${rollback}`)
  process.exit(0)
}

// ---- pull request connecthub → main (gjenbrukes hvis den finnes) ----
const owner = REPO.split('/')[0]
const body = [
  `Release-sperren har kontrollert **${sha.slice(0, 7)}** (${ahead} commits foran main):`,
  '',
  `- CI: ${ci}`,
  `- Dev-deploy (Vercel Preview): ${dev}`,
  '- Ingen nye databasemigreringer; main er med i connecthub',
  `- Produksjon nå / tilbakerullingsmål: ${rollback}`,
  '',
  mode === 'pr'
    ? `Godkjenn bare hvis toppen av pull requesten fortsatt er ${sha.slice(0, 7)} og statusen «${STATUS_CONTEXT}» er grønn. Merge med «Create a merge commit». Etter produksjonsdeployen kontrollerer release-verify.yml produksjonen og spoler connecthub fram.`
    : 'Merges automatisk av release.yml (AUTO_MERGE).',
  '',
  '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
].join('\n')
let pr = (await gh(`/pulls?state=open&base=main&head=${owner}:connecthub`)).json?.[0]
if (!pr) {
  const c = await gh('/pulls', { method: 'POST', body: JSON.stringify({ title: `Release connecthub ${sha.slice(0, 7)}`, head: 'connecthub', base: 'main', body }) })
  if (!c.ok) await fail(`kunne ikke lage pull request (${c.status}): ${c.json?.message ?? ''} – sjekk «Allow GitHub Actions to create and approve pull requests» i repoets innstillinger`)
  pr = c.json
} else {
  await gh(`/pulls/${pr.number}`, { method: 'PATCH', body: JSON.stringify({ title: `Release connecthub ${sha.slice(0, 7)}`, body }) })
}
await status('success', `CI, Dev-deploy og release-kravene bestått for ${sha.slice(0, 7)}`)
note(`PULL REQUEST #${pr.number} klar for ${sha.slice(0, 7)} (${ahead} commits). Tilbakerullingsmål: ${rollback}`)
if (mode === 'pr') process.exit(0)

// ---- full automatikk: merge gjennom beskyttelsen (påkrevde kontroller og ev. godkjenninger gjelder fortsatt) ----
const m = await gh(`/pulls/${pr.number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'merge', sha }) })
if (!m.ok && m.status === 405 && /review|approv/i.test(m.json?.message ?? '')) {
  // Beskyttelsen på main krever menneskelig godkjenning: pull requesten venter på den. Etter merge kontrollerer
  // release-verify.yml produksjonen og spoler connecthub fram.
  note(`VENTER PÅ GODKJENNING: pull request #${pr.number} (${sha.slice(0, 7)}) – ${m.json?.message ?? ''}`)
  process.exit(0)
}
if (!m.ok) await fail(`merge avvist (${m.status}): ${m.json?.message ?? ''}`)
const mergeSha = m.json?.sha
log(`merget: ${mergeSha?.slice(0, 7)}`)
await verifyProduction(mergeSha, rollback)
await fastForwardConnecthub(mergeSha)
