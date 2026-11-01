#!/usr/bin/env node
// Release connecthub → main (kjøres av .github/workflows/release.yml og release-verify.yml med GITHUB_TOKEN; ingen
// andre nøkler). Beslutningene ligger i release-decide.mjs (testet). Se docs/publisering.md.
//
//   node web/tools/release-gate.mjs <sha>                 tørrkjøring: bare kontrollene
//   node web/tools/release-gate.mjs <sha> --pr            + pull request connecthub → main og commit-status «release-gate»
//                                                          (et menneske godkjenner og merger)
//   node web/tools/release-gate.mjs <sha> --merge         + merge gjennom beskyttelsen på main (ikke i bruk)
//   node web/tools/release-gate.mjs <sha> --after-deploy  etter Vercels produksjonsdeploy av <sha> (på main): kontroller
//                                                          produksjonen, og spol så connecthub fram (bare fast-forward)
//   node web/tools/release-gate.mjs <sha> --abort         jobben feilet/ble stoppet: «release-gate» pending → error
//
// Kontrollene før release: <sha> er toppen av connecthub, main er med, ingen nye migreringer, nyeste CI-kjøring (ci.yml,
// push til connecthub) for nøyaktig <sha> har «checks» og «e2e» = success, og Vercels nyeste Dev-deploy av <sha> er
// success. Statusen «release-gate» = success settes først når alt dette er bestått og <sha> fortsatt er toppen.
// En kjøring for en commit som ikke lenger er toppen, avslutter uten feil (status «error: erstattet»). Ingenting omgås.
import { execFileSync } from 'node:child_process'
import { activeProduction, ciRunFor, ciVerdict, currentStatus, deployVerdict, deploymentFor, fastForward, prVerdict, versionVerdict } from './release-decide.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'm-l-development/MediaLabReact'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const PROD_URL = 'https://media-lab-react-vyef.vercel.app/app/'
const PAGES = ['', 'photo-design', 'motion-design', 'mockups', 'loop-studio', 'thumbnail-studio', 'isolate-subject']
const CI_WORKFLOW = 'ci.yml'
const REQUIRED_JOBS = ['checks', 'e2e']
const STATUS_CONTEXT = 'release-gate'
const sha = process.argv[2] ?? ''
const mode = process.argv.includes('--abort') ? 'abort' : process.argv.includes('--after-deploy') ? 'after-deploy' : process.argv.includes('--merge') ? 'merge' : process.argv.includes('--pr') ? 'pr' : 'dry-run'

const log = (s) => console.log(`[release] ${s}`)
/** Synlig som annotasjon på kjøringen (offentlig lesbar uten innlogging). */
const note = (s) => console.log(`::notice::${s}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** Avslutter etter en kort pause, så åpne nettverkstilkoblinger rekker å lukkes (process.exit midt i en lukking krasjer Node 24 på Windows). */
async function exit(code) {
  await sleep(250)
  process.exit(code)
}
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()
/** Alle commits i repoet som begynner med prefikset (for å kontrollere at et forkortet versjonsnummer er entydig). */
const commitsWithPrefix = (prefix) => {
  let objs = []
  try {
    objs = git('rev-parse', `--disambiguate=${prefix}`).split(/\s+/).filter(Boolean)
  } catch {
    objs = []
  }
  return objs.filter((o) => { try { return git('cat-file', '-t', o) === 'commit' } catch { return false } })
}

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

/** Commit-status «release-gate» på <sha> (påkrevd kontroll på main). Bare i --pr/--merge. */
async function status(state, description) {
  if (mode !== 'pr' && mode !== 'merge' && mode !== 'abort') return null
  const r = await gh(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state, context: STATUS_CONTEXT, description: description.slice(0, 140), target_url: process.env.RUN_URL || undefined }) })
  if (!r.ok) console.log(`::warning::kunne ikke sette status ${STATUS_CONTEXT} (${r.status})`)
  return r.ok ? r.json : null
}

/** Gjeldende «release-gate» på <sha> (den nyeste; GitHub viser den nyeste per kontekst). */
async function gateStatus() {
  return currentStatus((await gh(`/commits/${sha}/statuses?per_page=100`)).json, STATUS_CONTEXT)
}

async function fail(s) {
  console.log(`::error::${s}`)
  log(`STOPP: ${s}`)
  await status('failure', s)
  await exit(1)
}

/** Toppen av en gren nå (GitHub, ikke lokal kopi). */
async function headOf(branch) {
  const r = await gh(`/git/ref/heads/${branch}`)
  if (!r.ok) await fail(`kunne ikke lese toppen av ${branch} (${r.status})`)
  return r.json.object.sha
}

/** Avslutter uten feil hvis <sha> ikke lenger er toppen av connecthub (en nyere kjøring står i kø). */
async function exitIfSuperseded(when) {
  const head = await headOf('connecthub')
  if (head === sha) return
  log(`${sha.slice(0, 7)} er ikke lenger toppen av connecthub (${head.slice(0, 7)}) ${when} – en nyere kjøring tar over`)
  await status('error', `erstattet av ${head.slice(0, 7)}`)
  await exit(0)
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

/** Nyeste CI-kjøring (push til connecthub) for nøyaktig <s>, jobbene i nyeste forsøk: alle påkrevde = success. */
async function ciGreen(s) {
  return waitFor('CI', async () => {
    const runs = (await gh(`/actions/workflows/${CI_WORKFLOW}/runs?head_sha=${s}&event=push&per_page=50`)).json?.workflow_runs
    const run = ciRunFor(runs, s, 'connecthub', REPO)
    if (!run || run.status !== 'completed') return undefined
    const jobs = (await gh(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).json?.jobs
    const v = ciVerdict(run, jobs, REQUIRED_JOBS)
    if (v.state === 'wait') return undefined
    if (v.state === 'fail') {
      await exitIfSuperseded(v.cancelled ? '(CI ble avbrutt av en nyere push)' : '')
      await fail(`${v.text} – ${run.html_url ?? ''}`)
    }
    return v.text
  }, 75 * 60_000)
}

/** Vercels nyeste deploy (rapportert til GitHub) av <s> i miljøet er success. */
async function deployGreen(s, environment) {
  return waitFor(`Vercel ${environment}`, async () => {
    const dep = deploymentFor((await gh(`/deployments?sha=${s}&per_page=30`)).json, s, environment)
    if (!dep) return undefined
    const v = deployVerdict((await gh(`/deployments/${dep.id}/statuses?per_page=10`)).json)
    if (v.state === 'wait') return undefined
    if (v.state === 'fail') await fail(`Vercel ${environment} for ${s.slice(0, 7)}: ${v.text}`)
    return `${v.url || '(ok)'} (deployment ${dep.id})`
  }, 30 * 60_000)
}

/** Produksjonen kjører <s>: nyeste produksjonsdeploy av <s> er success, version.json er <s>, hovedadressene svarer. */
async function verifyProduction(s, rollback) {
  log(`produksjon (Vercel Production): ${await deployGreen(s, 'Production')}`)
  const v = await waitFor('produksjonens version.json', async () => {
    const j = await (await fetch(`${PROD_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })).json().catch(() => null)
    const vv = versionVerdict(j?.v, s, commitsWithPrefix)
    if (vv.state === 'ambiguous') await fail(`version.json (${j.v}) er ikke entydig: ${vv.count} commits begynner med de samme 10 tegnene`)
    return vv.state === 'ok' ? j.v : undefined
  }, 10 * 60_000, 15_000)
  for (const p of PAGES) {
    const r = await fetch(`${PROD_URL}${p}`, { redirect: 'manual' })
    if (r.status >= 400) await fail(`produksjon: ${PROD_URL}${p} svarer ${r.status} – vurder Vercel «Instant Rollback»${rollback ? ` til ${rollback}` : ''}`)
  }
  // Den aktive produksjonen: nyeste produksjonsdeploy (alle commits) er denne commiten, og den er fortsatt success
  const latest = (await gh('/deployments?environment=Production&per_page=1')).json?.[0]
  const act = activeProduction(latest, latest ? (await gh(`/deployments/${latest.id}/statuses?per_page=10`)).json : [], s)
  if (act.state !== 'ok') await fail(`produksjonen er uklar: ${act.state === 'fail' ? act.text : 'ingen avsluttet status'}`)
  note(`PRODUKSJON VERIFISERT: ${String(v).slice(0, 10)} (aktiv deploy ${latest.id} success, version.json entydig, ${PAGES.length} adresser)`)
}

/**
 * Spoler connecthub fram til <s>: bare etter verifyProduction, bare når <s> fortsatt er toppen av main (lest på nytt nå)
 * og connecthub ligger bak <s>, og med force: false (GitHub avviser alt annet enn fast-forward). Nyere arbeid på
 * connecthub overskrives aldri.
 */
async function fastForwardConnecthub(s) {
  const [mainHead, chHead] = [await headOf('main'), await headOf('connecthub')]
  const compare = (await gh(`/compare/${chHead}...${s}`)).json?.status
  const d = fastForward({ mainHead, sha: s, compare })
  if (d === 'noop') return log(`connecthub er allerede ${s.slice(0, 7)}`)
  if (d === 'skip') return console.log(`::warning::connecthub ble ikke spolt fram (main=${mainHead.slice(0, 7)}, connecthub=${chHead.slice(0, 7)}, sammenligning=${compare}) – hent main inn i connecthub («git merge origin/main») før neste ship-dev`)
  const ff = await gh('/git/refs/heads/connecthub', { method: 'PATCH', body: JSON.stringify({ sha: s, force: false }) })
  if (ff.ok) log(`connecthub spolt fram til ${s.slice(0, 7)}`)
  else console.log(`::warning::connecthub ble ikke spolt fram (${ff.status}: ${ff.json?.message ?? ''}) – hent main inn i connecthub før neste ship-dev`)
}

if (!/^[0-9a-f]{40}$/.test(sha)) await fail('mangler commit (sha)')
git('fetch', '-q', 'origin', 'main', 'connecthub')

// ---- jobben feilet eller ble stoppet (release.yml, if: failure() || cancelled()) ----
// En «pending» som blir hengende, gjøres til «error»; en ferdig status (success/failure/error) røres ikke.
if (mode === 'abort') {
  const cur = await gateStatus()
  if (cur?.state === 'pending') {
    await status('error', 'release-kjøringen ble avbrutt eller feilet før kontrollene var ferdige')
    log(`${STATUS_CONTEXT} for ${sha.slice(0, 7)}: pending → error`)
  } else log(`${STATUS_CONTEXT} for ${sha.slice(0, 7)} er ${cur?.state ?? 'ikke satt'} – uendret`)
  await exit(0)
}

// ---- etter produksjonsdeploy (release-verify.yml, utløst av Vercels deployment_status) ----
if (mode === 'after-deploy') {
  const main = await headOf('main')
  if (main !== sha) {
    log(`${sha.slice(0, 7)} er ikke toppen av main (${main.slice(0, 7)}) – ingenting å gjøre (eldre deploy, eller main har gått videre)`)
    await exit(0)
  }
  await verifyProduction(sha, null)
  await fastForwardConnecthub(sha)
  await exit(0)
}

// ---- kontrollene før release ----
await exitIfSuperseded('')
try {
  git('merge-base', '--is-ancestor', 'origin/main', sha)
} catch {
  await fail('origin/main er ikke med i connecthub: hent main inn i connecthub først')
}
const migrations = git('diff', '--name-only', '--no-renames', '--diff-filter=AM', 'origin/main', sha, '--', 'supabase/migrations').split('\n').filter(Boolean)
if (migrations.length) await fail(`nye databasemigreringer krever egen godkjenning og kjøreplan (docs/migration-runbook.md): ${migrations.join(', ')}`)
const ahead = git('rev-list', '--count', `origin/main..${sha}`)
if (ahead === '0') {
  log('ingenting nytt å slippe (main har allerede alt)')
  await exit(0)
}
await status('pending', 'venter på CI og Dev-deploy')
log(`kontroller for ${sha.slice(0, 7)} (${ahead} commits foran main) …`)
const ci = await ciGreen(sha)
log(ci)
const dev = await deployGreen(sha, 'Preview')
log(`Dev (Vercel Preview): ${dev}`)
await exitIfSuperseded('mens kontrollene gikk')
const prod = (await gh('/deployments?environment=Production&per_page=1')).json?.[0]
const rollback = prod?.sha?.slice(0, 7) ?? '?'
log(`produksjon nå (tilbakerullingsmål): ${rollback} (Vercel → Deployments → «Instant Rollback»)`)

if (mode === 'dry-run') {
  note(`TØRRKJØRING ${sha.slice(0, 7)}: CI, Dev-deploy, migreringer og main-forfar bestått – ingen pull request eller merge. Tilbakerullingsmål: ${rollback}`)
  await exit(0)
}

// ---- pull request connecthub → main (gjenbrukes hvis den finnes) ----
const owner = REPO.split('/')[0]
const body = [
  `Release-sperren har kontrollert **${sha.slice(0, 7)}** (${ahead} commits foran main):`,
  '',
  `- ${ci}`,
  `- Dev-deploy (Vercel Preview): ${dev}`,
  '- Ingen nye databasemigreringer; main er med i connecthub',
  `- Produksjon nå / tilbakerullingsmål: ${rollback}`,
  '',
  mode === 'pr'
    ? `Godkjenn bare hvis toppen av pull requesten er ${sha.slice(0, 7)} og statusen «${STATUS_CONTEXT}» er grønn. Merge med «Create a merge commit». Etter produksjonsdeployen kontrollerer release-verify.yml produksjonen og spoler connecthub fram.`
    : 'Merges av release.yml (AUTO_MERGE) gjennom beskyttelsen på main.',
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
// Pull requesten må være den forventede (base main, head connecthub i dette repoet) og vise nøyaktig <sha>. GitHub
// oppdaterer head litt etter en push; har connecthub flyttet seg, er kjøringen foreldet.
await waitFor('pull requestens head', async () => {
  const v = prVerdict((await gh(`/pulls/${pr.number}`)).json, { sha, repo: REPO, base: 'main', branch: 'connecthub' })
  if (v.state === 'fail') await fail(v.text)
  if (v.state === 'moved') {
    await exitIfSuperseded('(pull requesten viser en nyere commit)')
    return undefined
  }
  return true
}, 2 * 60_000, 5_000)
// Siste kontroll før grønn status: commiten er fortsatt toppen. En pull request er ikke en godkjenning: statusen betyr
// bare at kontrollene før merge er bestått for akkurat denne commiten.
await exitIfSuperseded('før status')
const set = await status('success', `CI (checks, e2e), Dev-deploy og release-kravene bestått for ${sha.slice(0, 7)}`)
const now = await gateStatus()
if (!set || now?.id !== set.id || now.state !== 'success') await fail(`statusen ${STATUS_CONTEXT} ble ikke stående som success (nå: ${now?.state ?? 'ingen'}) – ny eller samtidig oppdatering`)
note(`PULL REQUEST #${pr.number} klar for menneskelig godkjenning: ${sha.slice(0, 7)} (${ahead} commits). Tilbakerullingsmål: ${rollback}`)
if (mode === 'pr') await exit(0)

// ---- full automatikk (ikke i bruk): merge gjennom beskyttelsen; sha låser commiten ----
const m = await gh(`/pulls/${pr.number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'merge', sha }) })
if (!m.ok && m.status === 405 && /review|approv/i.test(m.json?.message ?? '')) {
  note(`VENTER PÅ GODKJENNING: pull request #${pr.number} (${sha.slice(0, 7)}) – ${m.json?.message ?? ''}`)
  await exit(0)
}
if (!m.ok) await fail(`merge avvist (${m.status}): ${m.json?.message ?? ''}`)
const mergeSha = m.json?.sha
log(`merget: ${mergeSha?.slice(0, 7)}`)
await verifyProduction(mergeSha, rollback)
await fastForwardConnecthub(mergeSha)
