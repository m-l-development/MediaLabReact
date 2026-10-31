#!/usr/bin/env node
// Etter en GODKJENT merge til main: kontrollerer at produksjonen faktisk kjører den nye versjonen. Bare lesing.
//   node web/tools/release-verify.mjs <connecthub-commit>
// Venter på produksjonsdeployen av main (READY), sjekker at merge-commiten på main inneholder <commit>, at
// /app/version.json i produksjon viser main-commiten, og at hovedadressene svarer. Skriver tilbakerullingsmålet.
import { currentProduction, git, log, PROD_BRANCH, PROD_URL, waitFor } from './release-lib.mjs'

const want = process.argv[2]
if (!want) {
  log('bruk: node web/tools/release-verify.mjs <connecthub-commit>')
  process.exit(2)
}
git('fetch', '-q', 'origin')
const sha = git('rev-parse', want)
const main = git('rev-parse', `origin/${PROD_BRANCH}`)
try {
  git('merge-base', '--is-ancestor', sha, main)
} catch {
  log(`STOPP: ${sha.slice(0, 7)} er ikke merget til origin/main (${main.slice(0, 7)})`)
  process.exit(1)
}
log(`venter på produksjonsdeployen av main ${main.slice(0, 7)} …`)
const dep = await waitFor('produksjonsdeploy', () => {
  const c = currentProduction()
  return c && c.sha === main ? c : undefined
}, 25 * 60_000)
log(`produksjon READY: ${dep.id}`)
const v = await (await fetch(`${PROD_URL}version.json`, { cache: 'no-store' })).json()
if (!String(v.v ?? '').startsWith(main.slice(0, 7))) {
  log(`STOPP: version.json i produksjon er ${v.v}, ikke ${main.slice(0, 7)}`)
  process.exit(1)
}
const pages = ['', 'photo-design', 'motion-design', 'mockups', 'loop-studio', 'thumbnail-studio', 'isolate-subject']
for (const p of pages) {
  const r = await fetch(`${PROD_URL}${p}`, { redirect: 'manual' })
  if (r.status >= 400) {
    log(`STOPP: ${PROD_URL}${p} svarer ${r.status}`)
    process.exit(1)
  }
}
log(`FERDIG: produksjonen kjører ${main.slice(0, 7)} (med ${sha.slice(0, 7)}), version.json og ${pages.length} adresser OK.`)
log('Tilbakerulling ved behov: Vercel → Deployments → forrige produksjon → «Instant Rollback», deretter git revert av merge-commiten.')
