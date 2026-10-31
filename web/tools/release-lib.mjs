// Felles hjelpere for ship-dev.mjs og release-check.mjs. Leser bare: git, Vercel-API (via innlogget `vercel`-CLI)
// og GitHub-API (offentlig repo, uten token). Skriver aldri hemmeligheter; miljøvariabler leses bare som navn.
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const WEB = path.join(ROOT, 'web')
export const REPO = 'm-l-development/MediaLabReact'
export const PROJECT = 'prj_ARtCtoNJv5KFUp9ACXK8xx9Gxoyu' // media-lab-react-vyef (Vercel)
export const DEV_BRANCH = 'connecthub'
export const PROD_BRANCH = 'main'
export const DEV_URL = 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app/app/'
export const PROD_URL = 'https://media-lab-react-vyef.vercel.app/app/'
const WIN = process.platform === 'win32'

export const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim()
export const log = (s) => console.log(`[publisering] ${s}`)
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Kjører en kommando med utdata i terminalen. → exit-kode. */
export function run(cmd, args, cwd = WEB, env = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: WIN, env: { ...process.env, ...env } })
  return r.status ?? 1
}

/** GET mot Vercel-API med den innloggede CLI-en (ingen token i koden). */
export function vercel(apiPath) {
  // Windows: npx.cmd krever skall, og der må adressen siteres (ellers deler & kommandoen)
  const arg = WIN ? `"${apiPath}"` : apiPath
  try {
    const out = execFileSync(WIN ? 'npx.cmd' : 'npx', ['--yes', 'vercel@latest', 'api', arg], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: WIN, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 })
    return JSON.parse(out)
  } catch (e) {
    throw new Error(`Vercel-API ${apiPath.split('?')[0]}: ${e instanceof Error ? e.message.split('\n')[0].slice(0, 160) : 'feil'}`)
  }
}

/** Vercel-deployen for en commit (nyeste først), eller null. */
export function deploymentFor(sha, target) {
  const q = `/v6/deployments?projectId=${PROJECT}&limit=40${target ? `&target=${target}` : ''}`
  const list = vercel(q).deployments ?? []
  return list.find((d) => d.meta?.githubCommitSha === sha) ?? null
}

/** Nåværende produksjonsdeploy (READY), med commit. */
export function currentProduction() {
  const d = (vercel(`/v6/deployments?projectId=${PROJECT}&target=production&state=READY&limit=1`).deployments ?? [])[0]
  return d ? { id: d.uid, sha: d.meta?.githubCommitSha ?? '', ref: d.meta?.githubCommitRef ?? '', created: new Date(d.created).toISOString() } : null
}

/** GitHub Actions-kjøringene for en commit (CI). */
export async function ciRuns(sha) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=20`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!r.ok) return null
  const j = await r.json()
  return (j.workflow_runs ?? []).map((x) => ({ name: x.name, status: x.status, conclusion: x.conclusion, event: x.event, url: x.html_url }))
}

/** Venter til `check()` gir en verdi (ikke undefined), eller tiden går ut. */
export async function waitFor(what, check, ms, every = 20_000) {
  const t0 = Date.now()
  for (;;) {
    const v = await check()
    if (v !== undefined) return v
    if (Date.now() - t0 > ms) throw new Error(`tidsavbrudd: ${what}`)
    await sleep(every)
  }
}
