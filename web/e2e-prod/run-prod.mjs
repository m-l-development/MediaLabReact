#!/usr/bin/env node
// Produksjonstesten for ConnectHub / Media Lab (docs/produksjonstest.md).
//
//   node e2e-prod/run-prod.mjs                       plan og kontroller, ingen nettleser (standard)
//   node e2e-prod/run-prod.mjs --run=read,tools --ja-produksjon
//   node e2e-prod/run-prod.mjs --save-staff-session=<fil utenfor repoet>   eieren logger inn selv (med MFA) i et vindu
//
// Sikkerhet (håndheves her og i policy.ts/guard.ts):
//  - bare produksjonsadressen og prosjektet cmuienhheklcgtfmpvbe; stopper hvis bygget peker et annet sted
//  - ingen service-nøkkel, ingen Supabase-CLI, ingen direkte databasetilkobling: bare testkontoenes egne økter (RLS gjelder)
//  - bare dedikerte testkontoer (e2e i adressen) og en testmenighet med navn som begynner på «E2E »
//  - skriving bare for steg som er godkjent i ML_E2E_APPROVED_STEPS; e-post bare med ML_E2E_EMAIL_APPROVED=JA
//  - passord og økter skrives aldri ut
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://media-lab-react-vyef.vercel.app'
const REF = 'cmuienhheklcgtfmpvbe'
const DEV_REF = 'uatpdmhnwwjgzlxaucsx'
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(WEB, '..')
const win = process.platform === 'win32'
const say = (m) => console.log(`\x1b[35m[run-prod]\x1b[0m ${m}`)
const stop = (m) => { console.error(`\x1b[31m[run-prod] STOPP:\x1b[0m ${m}`); process.exit(2) }
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3)
const env = (k) => process.env[k] ?? ''

const STEPS = {
  read: { spec: '1-read.spec.ts', writes: false, text: 'Identitet, alle sider og admin-seksjoner (PC og mobil), serverkontroller som leser – for Bruker, Admin og stab' },
  tools: { spec: '2-tools.spec.ts', writes: false, text: 'Loop Studio «+ Bilde», Mockups (last ned/kopier/Dine medier), Photo Design (bytt bilde, tekst, lagre, åpne) – alt lagres i nettleseren' },
  access: { spec: '3-access.spec.ts', writes: true, approval: 'access', text: 'Admin-tilgang i testmenigheten: avslag, tilbaketrekking, godkjenning (1 dag) og fjerning' },
  cleanup: { spec: '4-cleanup.spec.ts', writes: true, approval: 'access', text: 'Fjerner ventende/aktiv Admin-tilgang for stabskontoen i testmenigheten (rester etter avbrudd), kontrollerer sluttilstanden' },
  email: { spec: '5-email.spec.ts', writes: true, email: true, text: 'Én «Send test til meg» til godkjent mottaker (stabskontoens adresse)' },
}

// ---------- økt for stab: eieren logger inn selv ----------
const saveTo = arg('save-staff-session')
if (saveTo) {
  const file = path.resolve(saveTo)
  if (file.startsWith(REPO + path.sep)) stop('øktfilen skal ligge utenfor repoet')
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  const ctx = await browser.newContext({ serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login?next=%2Fapp%2F`)
  say('logg inn med stabs-testkontoen i vinduet (inkludert MFA). Venter på forsiden i opptil 10 minutter …')
  await page.getByRole('heading', { name: 'Media Lab' }).waitFor({ timeout: 600_000 })
  await ctx.storageState({ path: file })
  await browser.close()
  say(`økten er lagret i ${file} (inneholder innloggingstoken: slett filen etter testen)`)
  process.exit(0)
}

// ---------- kontroller ----------
const wanted = (arg('run') || '').split(',').filter(Boolean)
for (const s of wanted) if (!STEPS[s]) stop(`ukjent steg «${s}» (gyldige: ${Object.keys(STEPS).join(', ')})`)
const problems = []
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const church = { id: env('ML_E2E_CHURCH_ID'), name: env('ML_E2E_CHURCH_NAME') }
if (!uuid.test(church.id)) problems.push('ML_E2E_CHURCH_ID mangler eller er ikke en uuid')
if (!/^E2E /.test(church.name)) problems.push('ML_E2E_CHURCH_NAME må begynne med «E2E » (testmenigheten)')
const acc = { user: env('ML_E2E_USER_EMAIL').toLowerCase(), admin: env('ML_E2E_ADMIN_EMAIL').toLowerCase(), staff: env('ML_E2E_STAFF_EMAIL').toLowerCase() }
for (const [k, e] of Object.entries(acc)) if (e && !/^[^@]*e2e[^@]*@/.test(e)) problems.push(`${k}-kontoen (${e.replace(/^(.).*@/, '$1…@')}) er ikke en dedikert testkonto («e2e» i adressen)`)
if (new Set(Object.values(acc).filter(Boolean)).size !== Object.values(acc).filter(Boolean).length) problems.push('testkontoene må være tre forskjellige kontoer')
const staffStorage = env('ML_E2E_STAFF_STORAGE')
if (staffStorage) {
  const f = path.resolve(staffStorage)
  if (!fs.existsSync(f)) problems.push('ML_E2E_STAFF_STORAGE finnes ikke')
  else if (f.startsWith(REPO + path.sep)) problems.push('stabsøkten ligger i repoet – flytt den ut')
  else if (!JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')).origins ?? []).includes(BASE)) problems.push('stabsøkten er ikke fra produksjonsadressen')
}
const approved = new Set(env('ML_E2E_APPROVED_STEPS').split(',').filter(Boolean))
for (const a of approved) if (a !== 'access') problems.push(`ukjent godkjenning «${a}» i ML_E2E_APPROVED_STEPS`)
const emailOk = env('ML_E2E_EMAIL_APPROVED') === 'JA' && !!env('ML_E2E_EMAIL_TO')
for (const s of wanted) {
  const st = STEPS[s]
  if (st.approval && !approved.has(st.approval)) problems.push(`steget «${s}» skriver i produksjonen og er ikke godkjent (ML_E2E_APPROVED_STEPS=${st.approval})`)
  if (st.email && !emailOk) problems.push('e-posttesten er ikke godkjent (ML_E2E_EMAIL_APPROVED=JA og ML_E2E_EMAIL_TO)')
  if (st.email && env('ML_E2E_EMAIL_TO').toLowerCase() !== acc.staff) problems.push('ML_E2E_EMAIL_TO må være stabs-testkontoens adresse (testmailen går til den innloggede)')
  if (['read', 'tools'].includes(s) && s === 'tools' && !(acc.user && env('ML_E2E_USER_PASSWORD'))) problems.push('steget «tools» trenger Bruker-testkontoen (ML_E2E_USER_EMAIL/PASSWORD)')
  if (['access', 'cleanup', 'email'].includes(s) && !staffStorage) problems.push(`steget «${s}» trenger stabsøkten (--save-staff-session)`)
  if (['access', 'cleanup'].includes(s) && !(acc.admin && env('ML_E2E_ADMIN_PASSWORD'))) problems.push(`steget «${s}» trenger Admin-testkontoen (ML_E2E_ADMIN_EMAIL/PASSWORD)`)
}

// produksjonsbygget: versjon og hvilket Supabase-prosjekt det peker på (bare offentlige filer)
let version = '?', key = ''
try {
  version = JSON.stringify(await (await fetch(`${BASE}/app/version.json?t=${Date.now()}`)).json())
  // /app/ krever innlogging (307 til /login); innloggingssiden testkontoene bruker, har samme oppsett i sine filer
  const html = await (await fetch(`${BASE}/login`)).text()
  const js = [...html.matchAll(/(?:src|href)="(\/(?:app\/)?assets\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 40)
  const re = /url:[`"']https:\/\/([a-z0-9]+)\.supabase\.co[`"'],key:[`"']([^`"']+)[`"'],ref:[`"']([a-z0-9]+)[`"']/
  let found = null
  for (const p of js) { const m = (await (await fetch(BASE + p)).text()).match(re); if (m) { found = m; break } }
  if (!found) problems.push('fant ikke Supabase-oppsettet i produksjonsbygget')
  else {
    if (found[1] !== REF || found[3] !== REF) problems.push(`produksjonsbygget peker på ${found[1]}, ikke ${REF}`)
    if (found[1] === DEV_REF) problems.push('produksjonsbygget peker på connecthub-dev')
    if (!found[2].startsWith('sb_publishable_')) problems.push('nøkkelen i bygget er ikke en publiseringsnøkkel')
    key = found[2]
  }
} catch (e) { problems.push(`produksjonen svarte ikke (${e.message})`) }

// ---------- plan ----------
say(`mål: ${BASE} · prosjekt ${REF} · versjon ${version}`)
say(`testmenighet: ${church.id ? church.id.slice(0, 8) + '…' : '(mangler)'} «${church.name || '(mangler)'}»`)
say(`testkontoer: Bruker ${acc.user ? 'ja' : 'nei'}, Admin ${acc.admin ? 'ja' : 'nei'}, stab ${staffStorage ? 'økt' : 'nei'} · godkjent skriving: ${[...approved].join(', ') || 'ingen'} · e-post: ${emailOk ? 'godkjent' : 'nei'}`)
for (const [k, s] of Object.entries(STEPS)) say(`  ${wanted.includes(k) ? '▶' : ' '} ${k.padEnd(8)} ${s.writes ? (s.email ? 'E-POST ' : 'SKRIVER') : 'leser  '} ${s.text}`)
if (problems.length) { for (const p of problems) console.error(`  - ${p}`); stop('kontrollene over må være i orden') }
if (!wanted.length) { say('bare plan (ingen --run): ingenting er kjørt'); process.exit(0) }
if (!process.argv.includes('--ja-produksjon')) stop('legg til --ja-produksjon for å kjøre mot produksjonen')

// ---------- kjør (én test om gangen, stopp ved første feil) ----------
const order = ['read', 'tools', 'access', 'cleanup', 'email'].filter((s) => wanted.includes(s))
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/SECRET|SERVICE_ROLE|SUPABASE_ACCESS_TOKEN|ML_DEV_/i.test(k)))
const r = spawnSync('npx', ['playwright', 'test', '-c', 'e2e-prod', ...order.map((s) => STEPS[s].spec)], {
  cwd: WEB, stdio: 'inherit', shell: win,
  env: {
    ...childEnv, ML_E2E_TARGET: 'prod', ML_E2E_BASE: BASE, ML_E2E_REF: REF, ML_E2E_PUBLISHABLE_KEY: key,
    ML_E2E_STEPS: [...approved].join(','), ML_E2E_EMAIL: emailOk ? 'JA' : '', ML_E2E_EMAIL_TO: emailOk ? env('ML_E2E_EMAIL_TO') : '', ML_E2E_CLEANUP: '',
  },
})
say(r.status === 0 ? 'alle valgte steg bestått' : `FEILET (rc ${r.status}) – se rapporten over; ingenting kjøres videre`)
process.exitCode = r.status ?? 1
