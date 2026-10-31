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
export function ciRunFor(runs, sha, branch, repo) {
  return newest((runs ?? []).filter((r) => r.head_sha === sha && r.event === 'push' && r.head_branch === branch && (!repo || r.head_repository?.full_name === repo)), 'created_at')
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

/**
 * Pull requesten er den forventede: åpen, base = main i dette repoet, head = connecthub i dette repoet, og head-commit =
 * <sha>. 'moved' = head er en annen commit (nyere push, eller GitHub har ikke oppdatert pull requesten ennå).
 * @returns {{ state: 'ok' } | { state: 'moved', head: string } | { state: 'fail', text: string }}
 */
export function prVerdict(pr, { sha, repo, base, branch }) {
  if (!pr) return { state: 'fail', text: 'pull requesten finnes ikke' }
  if (pr.state !== 'open' || pr.merged) return { state: 'fail', text: `pull request #${pr.number} er ikke åpen` }
  if (pr.base?.ref !== base || pr.base?.repo?.full_name !== repo) return { state: 'fail', text: `pull request #${pr.number} har base ${pr.base?.repo?.full_name}:${pr.base?.ref}, ikke ${repo}:${base}` }
  if (pr.head?.ref !== branch || pr.head?.repo?.full_name !== repo) return { state: 'fail', text: `pull request #${pr.number} har head ${pr.head?.repo?.full_name}:${pr.head?.ref}, ikke ${repo}:${branch}` }
  if (pr.head?.sha !== sha) return { state: 'moved', head: pr.head?.sha ?? '' }
  return { state: 'ok' }
}

/** Gjeldende status for en kontekst på en commit: den nyeste (GitHub viser den nyeste per kontekst). */
export function currentStatus(statuses, context) {
  return newest((statuses ?? []).filter((s) => s.context === context), 'created_at')
}

/**
 * version.json mot forventet commit. Filen har bare de første 10 tegnene; de må stemme med <sha> og være entydige i
 * repoet (`commitsWithPrefix` gir alle commits som begynner med prefikset).
 * @returns {{ state: 'ok' } | { state: 'other' } | { state: 'unclear' } | { state: 'ambiguous', count: number }}
 */
export function versionVerdict(v, sha, commitsWithPrefix) {
  if (typeof v !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) return { state: 'unclear' }
  const prefix = v.slice(0, VERSION_PREFIX)
  if (!/^[0-9a-f]{10}$/.test(prefix)) return { state: 'unclear' }
  if (!sha.startsWith(prefix)) return { state: 'other' }
  const all = commitsWithPrefix(prefix)
  if (all.length !== 1 || all[0] !== sha) return { state: 'ambiguous', count: all.length }
  return { state: 'ok' }
}

/**
 * Er produksjonsdeployen av <sha> den aktive? Nyeste produksjonsdeploy (alle commits) må være for <sha>, og dens nyeste
 * status success. En eldre vellykket deploy, en nyere deploy av en annen commit, eller «inactive» er ikke godkjent.
 * @returns {{ state: 'ok' } | { state: 'wait' } | { state: 'fail', text: string }}
 */
export function activeProduction(latestProduction, statusesOfLatest, sha) {
  if (!latestProduction) return { state: 'wait' }
  if (latestProduction.sha !== sha) return { state: 'fail', text: `nyeste produksjonsdeploy er ${String(latestProduction.sha).slice(0, 7)}, ikke ${sha.slice(0, 7)}` }
  const v = deployVerdict(statusesOfLatest)
  if (v.state === 'wait') return { state: 'wait' }
  if (v.state === 'fail') return { state: 'fail', text: `produksjonsdeployen av ${sha.slice(0, 7)} er ${v.text}` }
  return { state: 'ok' }
}
