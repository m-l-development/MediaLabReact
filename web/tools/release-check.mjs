#!/usr/bin/env node
// Er en Dev-versjon klar for produksjon? BARE LESING – endrer ingenting, merger ingenting, publiserer ingenting.
//   node web/tools/release-check.mjs [<commit>]      (standard: origin/connecthub)
//
// Kontrollerer:
//  - commiten ligger på origin/connecthub og er toppen der (det som er testet i Dev, er det som slippes)
//  - origin/main er forfar (pull request connecthub → main gir ingen konflikter, main publiseres aldri fra en annen gren)
//  - CI er grønn for commiten, og Dev-deployen av akkurat denne commiten er READY
//  - nye databasemigreringer siden produksjon (krever egen godkjenning og kjøreplan før merge)
//  - miljøvariabler som finnes for Dev (preview) men ikke for produksjon (bare navn, aldri verdier)
//  - nåværende produksjonsdeploy = tilbakerullingsmål (Vercel «Instant Rollback»)
// Skriver en rapport og avslutter med 0 (klar) eller 1 (ikke klar).
import { ciRuns, currentProduction, deploymentFor, DEV_BRANCH, git, log, PROD_BRANCH, PROJECT, REPO, vercel } from './release-lib.mjs'

git('fetch', '-q', 'origin')
const sha = git('rev-parse', process.argv[2] ?? `origin/${DEV_BRANCH}`)
const short = sha.slice(0, 7)
const head = git('rev-parse', `origin/${DEV_BRANCH}`)
const problems = []
const notes = []

if (sha !== head) problems.push(`${short} er ikke toppen av origin/${DEV_BRANCH} (${head.slice(0, 7)}): slipp det som er testet i Dev`)
let ancestor = true
try {
  git('merge-base', '--is-ancestor', `origin/${PROD_BRANCH}`, sha)
} catch {
  ancestor = false
  problems.push(`origin/${PROD_BRANCH} er ikke med i ${short}: hent main inn i connecthub, test i Dev på nytt`)
}
const commits = ancestor ? git('rev-list', '--count', `origin/${PROD_BRANCH}..${sha}`) : '?'

const runs = await ciRuns(sha)
const ci = runs?.find((x) => x.name === 'CI' && x.event === 'push')
if (!ci) problems.push('ingen CI-kjøring funnet for commiten')
else if (ci.status !== 'completed' || ci.conclusion !== 'success') problems.push(`CI: ${ci.status}/${ci.conclusion ?? '–'} (${ci.url})`)

const dep = deploymentFor(sha, 'preview')
if (!dep) problems.push('ingen Dev-deploy for commiten')
else if (dep.readyState !== 'READY') problems.push(`Dev-deployen er ${dep.readyState}`)

const migrations = ancestor ? git('diff', '--name-only', '--diff-filter=AM', `origin/${PROD_BRANCH}`, sha, '--', 'supabase/migrations').split('\n').filter(Boolean) : []
if (migrations.length) problems.push(`${migrations.length} databasemigrering(er) siden produksjon – krever egen godkjenning og kjøreplan (docs/migration-runbook.md) før merge:\n    ${migrations.join('\n    ')}`)

const env = vercel(`/v9/projects/${PROJECT}/env`).envs ?? []
const names = (t) => new Set(env.filter((e) => (e.target ?? []).includes(t)).map((e) => e.key))
const prod = names('production')
const previewOnly = [...names('preview')].filter((k) => !prod.has(k)).sort()
if (previewOnly.length) notes.push(`miljøvariabler bare i Dev (sjekk om koden trenger dem i produksjon): ${previewOnly.join(', ')}`)

const cur = currentProduction()
const changed = ancestor ? git('diff', '--stat', '--shortstat', `origin/${PROD_BRANCH}`, sha) : ''

console.log(`
=== Klar for produksjon? ${short} ===
Commits siden produksjon: ${commits}   ${changed.split('\n').pop() ?? ''}
CI: ${ci ? `${ci.conclusion ?? ci.status} (${ci.url})` : '–'}
Dev-deploy: ${dep ? `${dep.readyState} ${dep.uid} https://${dep.url}` : '–'}
Produksjon nå (tilbakerullingsmål): ${cur ? `${cur.id} = ${cur.sha.slice(0, 7)} (${cur.ref}, ${cur.created})` : '–'}
${notes.map((n) => `Merk: ${n}`).join('\n')}
${problems.length ? `IKKE KLAR:\n  - ${problems.join('\n  - ')}` : `KLAR. Etter godkjenning: pull request ${DEV_BRANCH} → ${PROD_BRANCH}:
  https://github.com/${REPO}/compare/${PROD_BRANCH}...${DEV_BRANCH}  (toppen må fortsatt være ${short})
  Merge (vanlig merge-commit, som tidligere) → Vercel publiserer main til produksjon automatisk.
  Deretter: node web/tools/release-verify.mjs ${short}
  Tilbakerulling: Vercel → Deployments → ${cur?.id ?? '<forrige>'} → «Instant Rollback», deretter git revert av merge-commiten.`}
`)
log(problems.length ? 'ikke klar' : 'klar – venter på godkjenning')
process.exit(problems.length ? 1 : 0)
