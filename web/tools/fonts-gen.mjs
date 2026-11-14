/**
 * Genererer fontlisten for det felles fontbiblioteket (docs/maler-og-fonter.md, fase 1).
 *
 * Kilde: docs/fontkatalog.json (hentet fra artefakten «Fontbibliotek for designappen»: navn, stil, bruksområder,
 * kilde, lisens, snitt). For hver Google-font med åpen lisens finnes Fontsource-pakken på npm (variabel versjon
 * foretrukket: alle vekter i én fil), nyeste versjon som er minst 14 dager gammel. Pakken hentes med `npm pack` til
 * samme hurtigbuffer som media-lab/build/vendor.js bruker, og CSS-filene leses for å finne snittene som faktisk finnes.
 *
 * Utdata:
 * - media-lab/build/vendor-fonts.json – nye linjer til vendor.js (samme mekanisme og lås som før; lastes ved bruk)
 * - web/src/shared/fonts/catalog.json  – katalogen fontvelgeren og lasteren bruker
 * Fonter uten fontfil (ikke på Fontsource) tas ikke med i appen og skrives ut som «mangler».
 *
 * Kjør: node web/tools/fonts-gen.mjs   (deretter `npm run vendor:lock` i media-lab)
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..')
const CACHE = path.join(ROOT, 'media-lab', 'node_modules', '.ch-vendor')
const win = process.platform === 'win32'
const MIN_AGE = 14 * 864e5
const NOW = Date.now()

// fontene som allerede er i vendor.js (rør ikke versjonene deres)
const vendor = await import(new URL('file:///' + path.join(ROOT, 'media-lab', 'build', 'vendor.js').replace(/\\/g, '/')))
const HAVE = new Map(vendor.FONTS.filter((f) => !f.lazy).map((f) => [f.family, f]))

const slug = (n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function meta(pkg) {
  const r = await fetch('https://registry.npmjs.org/' + pkg.replace('/', '%2F'))
  if (!r.ok) return null
  const j = await r.json()
  const ok = Object.keys(j.time ?? {}).filter((v) => /^\d+\.\d+\.\d+$/.test(v) && NOW - Date.parse(j.time[v]) >= MIN_AGE)
  ok.sort((a, b) => Date.parse(j.time[b]) - Date.parse(j.time[a]))
  return ok[0] ? { pkg, version: ok[0] } : null
}

function fetchPkg(spec) {
  const dir = path.join(CACHE, spec.replace(/[@/]/g, '_'))
  if (fs.existsSync(path.join(dir, 'package', 'package.json'))) return path.join(dir, 'package')
  fs.mkdirSync(dir, { recursive: true })
  const out = execFileSync(win ? 'npm.cmd' : 'npm', ['pack', spec, '--silent', '--pack-destination', dir], { encoding: 'utf8', shell: win }).trim().split(/\r?\n/).pop()
  execFileSync('tar', ['-xzf', out], { cwd: dir })
  return path.join(dir, 'package')
}

/** Snittene i en CSS-fil (latin): vektområde og om det er kursiv. */
function faces(css) {
  const out = []
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const b = m[1]
    if (!/-latin-[a-z0-9-]+\.woff2/.test(b)) continue
    const w = (b.match(/font-weight:\s*([0-9]+)(?:\s+([0-9]+))?/) || [])
    const lo = Number(w[1] || 400), hi = Number(w[2] || w[1] || 400)
    out.push({ lo, hi, italic: /font-style:\s*italic/.test(b) })
  }
  return out
}

const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'fontkatalog.json'), 'utf8'))
const extra = []
const catalog = []
const missing = []
// Google-fonter, og de åpne fontene utenfor Google («Last ned selv») som finnes som Fontsource-pakke med lisensfil og en
// lisens som tillater å legge fonten ved appen. Uten slik pakke tas fonten ikke med (lisensen gjettes aldri).
const queue = rows.filter((r) => r.lic === 'ok' && (r.src === 'g' || r.src === 'o'))
const OPEN_LIC = new Set(['OFL-1.1', 'CC0-1.0', 'Unlicense', 'Apache-2.0', 'MIT'])
const skipped = []
// åpne fonter uten Æ, Ø og Å (målt i Chromium 2026-11-14: tegnene faller tilbake til reservefonten); vises i fontvelgeren
const NO_AEOA = new Set(['Bagnard', 'Bagnard Sans', 'Ostrich Sans'])

for (const r of queue) {
  const s = r.src === 'o' && r.dl ? r.dl : slug(r.name)
  const have = HAVE.get(r.name)
  let spec, css, root
  if (have) {
    spec = have.spec
    root = fetchPkg(spec)
    css = have.css
  } else {
    const m = (await meta('@fontsource-variable/' + s)) ?? (await meta('@fontsource/' + s))
    if (!m) { (r.src === 'o' ? skipped : missing).push(r.name); continue }
    spec = m.pkg + '@' + m.version
    root = fetchPkg(spec)
    // lisensen fra pakken: kjent åpen lisens og lisensfil som følger fonten
    const pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    if (!OPEN_LIC.has(pj.license) || !fs.existsSync(path.join(root, 'LICENSE'))) { skipped.push(r.name + ' (lisens ' + pj.license + ')'); continue }
    r.pkgLicense = pj.license
    const files = fs.readdirSync(root).filter((f) => f.endsWith('.css'))
    if (m.pkg.startsWith('@fontsource-variable/')) {
      // alle akser når fonten har flere (bredde, optisk størrelse, SOFT/WONK …), ellers vekt
      // bredde-aksen (wdth.css har både vekt og bredde) når det ikke finnes en fil med alle aksene: malene bruker eksakte bredder
      const base = files.includes('full.css') ? 'full' : files.includes('wdth.css') ? 'wdth' : files.includes('wght.css') ? 'wght' : files.includes('index.css') ? 'index' : null
      if (!base) { missing.push(r.name + ' (ingen CSS)'); continue }
      css = [base + '.css', ...(files.includes(base + '-italic.css') ? [base + '-italic.css'] : [])]
    } else {
      css = files.filter((f) => /^\d{3}(-italic)?\.css$/.test(f))
      if (!css.length) css = ['index.css']
    }
  }
  const fs0 = css.flatMap((c) => faces(fs.readFileSync(path.join(root, c), 'utf8')))
  if (!fs0.length) { missing.push(r.name + ' (ingen latin-filer)'); continue }
  const has = (w, it) => fs0.some((f) => f.italic === it && f.lo <= w && f.hi >= w)
  const weights = [...new Set(fs0.filter((f) => !f.italic).flatMap((f) => [100, 200, 300, 400, 500, 600, 700, 800, 900].filter((w) => f.lo <= w && f.hi >= w)))].sort((a, b) => a - b)
  if (!have) extra.push({ spec, css, family: r.name, slug: s, lazy: true })
  catalog.push({
    id: s, name: r.name, style: r.style, uses: r.uses.split(''), source: r.src === 'o' ? 'open' : 'google', note: r.note,
    weights, italic: fs0.some((f) => f.italic),
    // ekte snitt: Regular, Bold, Italic, Bold Italic (B/I-knappene i editoren)
    snitt: { r: has(400, false) || weights.length > 0, b: has(700, false), i: has(400, true), bi: has(700, true) },
    css: '/fonts/' + (have ? have.slug : s) + '.css', variable: spec.startsWith('@fontsource-variable/'),
    license: r.pkgLicense ?? 'OFL-1.1',
    ...(NO_AEOA.has(r.name) ? { noAeoa: true } : {}),
  })
  process.stdout.write('.')
}

fs.writeFileSync(path.join(ROOT, 'media-lab', 'build', 'vendor-fonts.json'), JSON.stringify(extra, null, 1) + '\n')
fs.mkdirSync(path.join(ROOT, 'web', 'src', 'shared', 'fonts'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'web', 'src', 'shared', 'fonts', 'catalog.json'), JSON.stringify(catalog, null, 1) + '\n')
console.log(`\n${catalog.length} fonter i katalogen (${extra.length} nye i vendor.js). Mangler på Fontsource: ${missing.length}`)
if (missing.length) console.log(missing.join(', '))
console.log(`Åpne fonter uten pakke med lisensfil (ikke tatt med): ${skipped.length}`)
fs.writeFileSync(path.join(ROOT, 'docs', 'fonter-ikke-med.json'), JSON.stringify(skipped, null, 1) + '\n')
