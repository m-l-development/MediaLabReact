// Sikkerhetskopi av dataene uten Docker og uten databasepassord: hver tabell hentes med en ren SELECT via den innloggede
// Supabase-CLI-en (`supabase db query`, midlertidig innloggingsrolle) og skrives som JSON. Skjemaet er migreringene i repoet.
// Lagrede filer i Storage er ikke med (de ligger i bøtta og røres ikke av migreringene).
//   node supabase/checks/export-data.mjs <project-ref> <mappe-utenfor-repoet> [--produksjon-godkjent]
// Filene inneholder personopplysninger (også auth.users med passordhasher): lagres utenfor repoet og slettes når de ikke
// trengs. Mot produksjonen (cmuienhheklcgtfmpvbe) kreves flagget --produksjon-godkjent – bare etter uttrykkelig godkjenning.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROD = 'cmuienhheklcgtfmpvbe'
const [ref, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
if (!ref || !/^[a-z]{20}$/.test(ref) || !outDir) {
  console.error('Bruk: node supabase/checks/export-data.mjs <project-ref> <mappe-utenfor-repoet> [--produksjon-godkjent]')
  process.exit(2)
}
if (ref === PROD && !process.argv.includes('--produksjon-godkjent')) {
  console.error('Produksjonen: kjøres bare etter uttrykkelig godkjenning, med --produksjon-godkjent.')
  process.exit(2)
}
const out = path.resolve(outDir)
if (out === repo || out.startsWith(repo + path.sep)) {
  console.error('Mappen må ligge utenfor repoet (filene har personopplysninger).')
  process.exit(2)
}
fs.mkdirSync(out, { recursive: true })
const win = process.platform === 'win32'
const tmp = path.join(out, '.q.sql')

function query(sql) {
  fs.writeFileSync(tmp, sql)
  const r = spawnSync('npx', ['--yes', 'supabase@latest', 'db', 'query', '--linked', '--project-ref', ref, '-f', win ? `"${tmp}"` : tmp, '-o', 'json'], { encoding: 'utf8', shell: win, maxBuffer: 1e9, input: '' })
  const t = r.stdout ?? ''
  const i = t.indexOf('{')
  if (i < 0) throw new Error(`spørringen feilet: ${(r.stderr || t).slice(-300)}`)
  const j = JSON.parse(t.slice(i))
  if (j._tag === 'Error') throw new Error(j.error?.message ?? 'ukjent feil')
  return j.rows
}

const tables = query(`select table_schema as s, table_name as t from information_schema.tables
  where table_type = 'BASE TABLE' and (table_schema = 'public' or (table_schema = 'auth' and table_name in ('users', 'identities')))
  order by 1, 2;`)
const summary = []
for (const { s, t } of tables) {
  const rows = query(`select coalesce(json_agg(x), '[]'::json) as rows from ${s}."${t.replace(/"/g, '""')}" x;`)[0]?.rows ?? []
  fs.writeFileSync(path.join(out, `${s}.${t}.json`), JSON.stringify(rows))
  summary.push({ table: `${s}.${t}`, rows: rows.length })
  console.log(`${s}.${t}: ${rows.length}`)
}
const migrations = query('select version from supabase_migrations.schema_migrations order by version;').map((r) => r.version)
fs.writeFileSync(path.join(out, '_manifest.json'), JSON.stringify({ ref, at: new Date().toISOString(), migrations, tables: summary }, null, 2))
fs.rmSync(tmp, { force: true })
console.log(`\n${summary.length} tabeller, ${summary.reduce((a, b) => a + b.rows, 0)} rader, ${migrations.length} migreringer (siste ${migrations.at(-1)}) → ${out}`)
