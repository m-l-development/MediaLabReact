// Rene beslutninger for release-sperren (web/tools/release-gate.mjs). Ingen nettverk, ingen sideeffekter, så de kan
// testes (release-decide.test.ts). Se docs/publisering.md.

/** Lengden på commit-prefikset i /app/version.json (web/vite.config.ts: VERCEL_GIT_COMMIT_SHA.slice(0, 10) + tid). */
export const VERSION_PREFIX = 10

const time = (s) => (s ? Date.parse(s) : 0)
/** Nyeste element etter tidspunkt, deretter id (GitHub-id-er øker). */
function newest(list, at) {
  let best = null
  for (const x of list) {
    if (!best || time(x[at]) > time(best[at]) || (time(x[at]) === time(best[at]) && x.id > best.id)) best = x
  }
  return best
}

/**
 * CI-kjøringen som gjelder for commiten: nyeste kjøring av CI-workflowen ved push til grenen for nøyaktig denne commiten.
 * En eldre vellykket kjøring kan dermed aldri skjule en nyere som feilet eller ble avbrutt.
 */
export function ciRunFor(runs, sha, branch) {
  return newest((runs ?? []).filter((r) => r.head_sha === sha && r.event === 'push' && r.head_branch === branch), 'created_at')
}

/**
 * Vurderer CI-kjøringen og jobbene i det nyeste forsøket (jobs?filter=latest).
 * @returns {{ state: 'wait' } | { state: 'ok', text: string } | { state: 'fail', text: string, cancelled: boolean }}
 */
export function ciVerdict(run, jobs, required) {
  if (!run || run.status !== 'completed') return { state: 'wait' }
  const found = []
  for (const name of required) {
    const job = newest((jobs ?? []).filter((j) => j.name === name), 'started_at')
    if (!job) return { state: 'fail', text: `CI-kjøring ${run.id} mangler jobben «${name}»`, cancelled: false }
    if (job.status !== 'completed') return { state: 'wait' }
    found.push(job)
  }
  const bad = found.filter((j) => j.conclusion !== 'success')
  const cancelled = run.conclusion === 'cancelled' || bad.some((j) => j.conclusion === 'cancelled')
  if (bad.length || run.conclusion !== 'success') {
    const what = bad.length ? bad.map((j) => `${j.name}=${j.conclusion}`).join(', ') : `kjøringen=${run.conclusion}`
    return { state: 'fail', text: `CI (kjøring ${run.id}, forsøk ${run.run_attempt ?? 1}): ${what}`, cancelled }
  }
  return { state: 'ok', text: `CI kjøring ${run.id} forsøk ${run.run_attempt ?? 1}: ${found.map((j) => `${j.name}=success`).join(', ')}` }
}

/** Nyeste GitHub-deployment fra Vercel for commiten i miljøet («Preview» eller «Production»). */
export function deploymentFor(deployments, sha, environment) {
  return newest((deployments ?? []).filter((d) => d.sha === sha && d.environment === environment), 'created_at')
}

/**
 * Status for en deployment (statusene nyeste først, som GitHub returnerer dem).
 * @returns {{ state: 'wait' } | { state: 'ok', url: string } | { state: 'fail', text: string }}
 */
export function deployVerdict(statuses) {
  const st = newest(statuses ?? [], 'created_at')
  if (!st || ['pending', 'queued', 'in_progress'].includes(st.state)) return { state: 'wait' }
  if (st.state === 'success') return { state: 'ok', url: st.environment_url || st.target_url || '' }
  return { state: 'fail', text: st.state }
}

/** /app/version.json tilhører commiten (de første 10 tegnene i commit-id-en). */
export function versionMatches(v, sha) {
  return typeof v === 'string' && /^[0-9a-f]{40}$/.test(sha) && v.startsWith(sha.slice(0, VERSION_PREFIX))
}

/**
 * Skal connecthub spoles fram til <sha>? Bare når <sha> fortsatt er toppen av main, og connecthub er forfar til <sha>
 * (GitHubs sammenligning connecthub...sha = «ahead»). «identical» = allerede der; alt annet (nyere arbeid på connecthub,
 * avvikende historikk, main har gått videre) = la være.
 * @returns {'ff' | 'noop' | 'skip'}
 */
export function fastForward({ mainHead, sha, compare }) {
  if (mainHead !== sha) return 'skip'
  if (compare === 'identical') return 'noop'
  return compare === 'ahead' ? 'ff' : 'skip'
}
