#!/usr/bin/env node
// Publisering til Dev, med kvalitetssperre:
//   node web/tools/ship-dev.mjs [--e2e=<spec,…>|--no-e2e] [--verify]
//
// 1. Krever grenen connecthub, at alt som skal med er committet (ingen endrede sporede filer; usporede filer røres ikke)
//    og at origin/main er forfar (Dev bygger alltid videre på produksjon).
// 2. Kjører typekontroll, lint, enhetstester og bygg (npm run check) og Playwright (alle, eller --e2e=…).
//    Feiler noe, stopper skriptet: ingen push.
// 3. Pusher connecthub. Vercels Git-integrasjon bygger Dev (forhåndsvisning) og GitHub kjører CI – det finnes ingen
//    egen deploy herfra, så det blir aldri doble deployer.
// 4. Venter på Vercel-deployen for akkurat denne commiten (READY) og på CI (success), og skriver commit og adresse.
// --verify: hopper over 1–3 og kontrollerer bare at HEAD er publisert til Dev og at CI er grønn.
// Rører aldri main eller produksjon.
import { ciRuns, deploymentFor, DEV_BRANCH, DEV_URL, git, log, run, waitFor } from './release-lib.mjs'

const args = process.argv.slice(2)
const verifyOnly = args.includes('--verify')
const e2eArg = args.find((a) => a.startsWith('--e2e='))?.slice(6)
const noE2e = args.includes('--no-e2e')

function fail(msg) {
  log(`STOPP: ${msg}`)
  process.exit(1)
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== DEV_BRANCH) fail(`grenen er «${branch}», ikke ${DEV_BRANCH}`)
const sha = git('rev-parse', 'HEAD')
const short = sha.slice(0, 7)

if (!verifyOnly) {
  const dirty = git('status', '--porcelain', '--untracked-files=no')
  if (dirty) fail(`endringer som ikke er committet:\n${dirty}\nCommit det som skal med (bare de aktuelle filene) og kjør på nytt.`)
  git('fetch', '-q', 'origin')
  try {
    git('merge-base', '--is-ancestor', 'origin/main', 'HEAD')
  } catch {
    fail('origin/main er ikke med i connecthub (hent main inn i connecthub først)')
  }
  const ahead = git('rev-list', '--count', `origin/${DEV_BRANCH}..HEAD`)
  if (ahead === '0') log(`ingen nye commits å pushe (${short}); kontrollerer bare Dev`)
  else {
    log(`kvalitetskontroll for ${short} (${ahead} nye commits)`)
    if (run('npm', ['run', 'check']) !== 0) fail('typekontroll, lint, enhetstester eller bygg feilet')
    if (!noE2e) {
      const specs = e2eArg ? e2eArg.split(',') : []
      if (run('npx', ['playwright', 'test', '--reporter=line', ...specs]) !== 0) {
        log('e2e feilet – ny kjøring av de som feilet (last kan gi tidsavbrudd)')
        if (run('npx', ['playwright', 'test', '--reporter=line', '--last-failed']) !== 0) fail('e2e feilet også ved ny kjøring')
      }
    }
    log('alt grønt – pusher')
    git('push', '-q', 'origin', DEV_BRANCH)
  }
}

log(`venter på Dev-deployen av ${short} …`)
const dep = await waitFor('Vercel-deploy', () => {
  const d = deploymentFor(sha, 'preview')
  if (!d) return undefined
  if (d.readyState === 'ERROR' || d.readyState === 'CANCELED') return d
  return d.readyState === 'READY' ? d : undefined
}, 25 * 60_000)
if (dep.readyState !== 'READY') fail(`Dev-deployen feilet (${dep.readyState}): https://${dep.url}`)
log(`Dev-deploy READY: ${dep.uid} (https://${dep.url})`)

log('venter på CI …')
const ci = await waitFor('CI', async () => {
  const r = await ciRuns(sha)
  const c = r?.find((x) => x.name === 'CI' && x.event === 'push')
  return c && c.status === 'completed' ? c : undefined
}, 45 * 60_000, 60_000) // e2e i CI tar ~15 min; GitHub tillater 60 kall/time uten innlogging
if (ci.conclusion !== 'success') fail(`CI: ${ci.conclusion} (${ci.url})`)
log(`CI: success (${ci.url})`)
log(`FERDIG: ${short} er publisert til Dev – ${DEV_URL}`)
