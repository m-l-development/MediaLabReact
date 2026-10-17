// Automatisk kontroll av en publisert versjon (Vercel-forhåndsvisning eller lokal `vite preview`), bare lesing:
//   node build/check-preview.mjs <adresse> [--commit <sha>]
// Beskyttet forhåndsvisning: sett VERCEL_AUTOMATION_BYPASS_SECRET i terminalen (Vercel → Project → Settings →
// Deployment Protection → Protection Bypass for Automation). Hemmeligheten sendes bare som header og skrives aldri ut.
// Kontrollerer: riktig commit (version.json), at den nye appen og innloggingen svarer, alle korte adresser og gamle
// .dc.html-adresser (307 til riktig mål, fra routes.js), sikkerhetshoder og CSP, hurtigbuffer, manifest og at
// serverhandlingene krever innlogging. Ingen innlogging, ingen skriving.
import { vercelRoutes } from './routes.js'

const args = process.argv.slice(2)
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/$/, '')
const commit = args.includes('--commit') ? args[args.indexOf('--commit') + 1] ?? '' : ''
if (!base) {
  console.error('Bruk: node build/check-preview.mjs <adresse> [--commit <sha>]')
  process.exit(2)
}
const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const H = secret ? { 'x-vercel-protection-bypass': secret } : {}
const https = base.startsWith('https://')
const rows = []
let failed = 0
const check = (name, ok, info = '') => {
  if (!ok) failed++
  rows.push(`| ${ok ? 'ok' : '**FEIL**'} | ${name} | ${String(info).replace(/\|/g, '/').slice(0, 140)} |`)
}
const get = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init, headers: { ...H, ...(init.headers ?? {}) } })

// 0. tilgang
const first = await get('/app/')
if (first.status === 302 && /vercel\.com\/sso|_vercel_sso/.test((first.headers.get('location') ?? '') + (first.headers.get('set-cookie') ?? ''))) {
  console.error('Forhåndsvisningen er beskyttet (Vercel-innlogging). Sett VERCEL_AUTOMATION_BYPASS_SECRET i terminalen og kjør på nytt.')
  process.exit(3)
}

// 1. riktig commit
const ver = await get('/app/version.json')
const v = ver.ok ? ((await ver.json().catch(() => ({}))).v ?? '') : ''
check('/app/version.json svarer', ver.status === 200, `${ver.status} ${v ? 'v=' + v : ''}`)
if (commit) check(`bygget fra commit ${commit.slice(0, 7)}`, v.startsWith(commit.slice(0, 10)), `v=${v}`)

// 2. den nye appen og innloggingen
const appHtml = first.status === 200 ? await first.text() : ''
check('/app/ svarer med appen', first.status === 200 && /<script[^>]+src="\/app\/assets\//.test(appHtml), first.status)
const login = await get('/login')
check('/login svarer (innloggingen)', login.status === 200 && /<html/i.test(await login.text()), login.status)

// 3. sikkerhetshoder og CSP
const h = first.headers
const csp = h.get('content-security-policy') ?? ''
check('nøyaktig én CSP', !!csp && !csp.includes(', default-src'), csp ? `${csp.length} tegn` : 'mangler')
check('CSP: default-src self, ingen unsafe-eval i script-src', /default-src 'self'/.test(csp) && !/script-src[^;]*'unsafe-eval'/.test(csp))
const host = new URL(base).host
const prodHost = host === 'media-lab-react-vyef.vercel.app'
check(prodHost ? 'CSP for produksjon (uten dev-prosjektet)' : 'CSP for forhåndsvisning (dev-prosjektet tillatt)', prodHost ? !csp.includes('uatpdmhnwwjgzlxaucsx') : csp.includes('uatpdmhnwwjgzlxaucsx'))
for (const [k, re] of [['x-content-type-options', /^nosniff$/], ['x-frame-options', /^SAMEORIGIN$/i], ['referrer-policy', /strict-origin-when-cross-origin/], ['cross-origin-opener-policy', /same-origin/], ['permissions-policy', /camera=\(\)/]]) {
  check(`header ${k}`, re.test(h.get(k) ?? ''), h.get(k) ?? 'mangler')
}
if (https) check('header strict-transport-security', /max-age=31536000/.test(h.get('strict-transport-security') ?? ''), h.get('strict-transport-security') ?? 'mangler')

// 4. hurtigbuffer og manifest
const asset = /src="(\/app\/assets\/[^"]+\.js)"/.exec(appHtml)?.[1]
if (asset) {
  const a = await get(asset)
  check('appens filer: hurtigbuffer 1 år, immutable', a.status === 200 && /max-age=31536000.*immutable/.test(a.headers.get('cache-control') ?? ''), a.headers.get('cache-control') ?? a.status)
} else check('appens filer funnet i /app/', false)
const man = await get('/app/manifest.webmanifest')
check('/app/manifest.webmanifest: riktig type, no-cache', man.status === 200 && /manifest\+json/.test(man.headers.get('content-type') ?? '') && /no-cache/.test(man.headers.get('cache-control') ?? ''), `${man.status} ${man.headers.get('content-type')}`)
check('version.json: no-cache (oppdateringsvarselet)', /no-cache/.test(ver.headers.get('cache-control') ?? ''), ver.headers.get('cache-control') ?? '')

// 5. korte adresser og gamle adresser (samme kilde som vercel.json)
const { redirects } = vercelRoutes()
let n = 0
for (const r of redirects) {
  if (/[:(*]/.test(r.source)) continue
  const res = await get(r.source)
  const loc = (res.headers.get('location') ?? '').replace(base, '')
  const ok = res.status === 307 && loc === r.destination
  if (!ok) check(`${r.source} → ${r.destination}`, false, `${res.status} ${loc}`)
  n++
}
check(`alle ${n} korte/gamle adresser gir 307 til riktig mål`, rows.every((x) => !x.includes('→ /')), `${n} kontrollert`)
const q = await get('/photodesign?x=1')
check('spørring beholdes ved omdirigering', /\/app\/photo-design\?x=1$/.test(q.headers.get('location') ?? ''), q.headers.get('location') ?? '')

// 6. serverhandlinger krever innlogging
const apiGet = await get('/api/ch?a=mail.status')
check('/api/ch med GET avvises', apiGet.status === 405, apiGet.status)
const apiAnon = await get('/api/ch?a=mail.status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
const anonBody = await apiAnon.json().catch(() => ({}))
check('/api/ch uten innlogging avvises (401)', apiAnon.status === 401 || anonBody.error === 'not_configured', `${apiAnon.status} ${anonBody.error ?? ''}`)

console.log(`\nKontroll av ${base}${commit ? ` (commit ${commit.slice(0, 7)})` : ''}\n`)
console.log('| Resultat | Kontroll | Detaljer |\n|---|---|---|\n' + rows.join('\n'))
console.log(`\n${failed ? `${failed} FEIL` : 'Alt i orden'}`)
process.exitCode = failed ? 1 : 0
