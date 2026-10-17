/* Gjenopprettingsøvelse (P9): ConnectHub i en vanlig PostgreSQL uten Supabase.
   PGlite (@electric-sql/pglite, devDependency) er en ekte PostgreSQL kompilert til WebAssembly som kjører i Node uten
   installasjon, Docker eller nett. Øvelsen:
     1. Oppretter rollene som API-et bruker (anon, authenticated, service_role) – det samme må gjøres hos en ny leverandør.
     2. Kjører alle migreringene i rekkefølge, unntatt de som er merket Supabase-spesifikke (*_supabase_*.sql).
     3. Kjører hele RLS-testsettet (supabase/tests/rls_test.sql) – det skal bestå uendret.
     4. Valgfritt: gjenoppretter data fra en JSON-eksport (node build/restore-drill.mjs <eksport.json>) og kontrollerer
        radantall og at tilgangsreglene virker på de gjenopprettede dataene.
   Bruk: npm run drill  [-- <eksport.json>] */
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const MIG = path.join(ROOT, 'supabase', 'migrations');
export const TABLES = ['app_users', 'user_identities', 'churches', 'memberships', 'user_roles', 'invitations', 'files', 'audit_logs'];

export async function freshDb() {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;`);
  const files = fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort();
  const skipped = [];
  for (const f of files) {
    if (/_supabase_/.test(f)) { skipped.push(f); continue; }
    try { await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8')); }
    catch (e) { throw new Error('Migrering ' + f + ' feilet: ' + e.message); }
  }
  return { db, applied: files.length - skipped.length, skipped };
}

export async function rlsTests(db) {
  const res = await db.exec(fs.readFileSync(path.join(ROOT, 'supabase', 'tests', 'rls_test.sql'), 'utf8'));
  const row = [...res].reverse().find(r => r.rows && r.rows[0] && r.rows[0].resultat);
  return row.rows[0].resultat;
}

/* PostgreSQL-tabell-literal fra en JSON-liste (tekst i anførselstegn, null som NULL). */
const pgArray = (a) => '{' + a.map(x => (x === null ? 'NULL' : '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')).join(',') + '}';

/* Gjenoppretter rader fra { tabell: [rader] } uten å kjøre triggere (som ved pg_restore), og sjekker antall. */
export async function restore(db, dump, tables = TABLES) {
  await db.exec('set session_replication_role = replica');
  const counts = {};
  for (const t of tables) {
    const rows = dump[t] || [];
    // kolonnetyper: tabellkolonner (text[] o.l.) som PostgreSQL-tabeller, json som tekst; identitetskolonner beholder id-ene
    const meta = (await db.query(`select column_name, data_type, identity_generation from information_schema.columns where table_schema = 'public' and table_name = $1`, [t])).rows;
    const arrays = new Set(meta.filter(m => m.data_type === 'ARRAY').map(m => m.column_name));
    const always = meta.filter(m => m.identity_generation === 'ALWAYS').map(m => m.column_name);
    // sikkerhetskopien er fasiten: standardrader fra migreringene (f.eks. mail_settings) erstattes
    await db.exec(`delete from public.${t}`);
    for (const r of rows) {
      const cols = Object.keys(r);
      const vals = cols.map(c => (r[c] === null ? null : arrays.has(c) ? pgArray(r[c]) : typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c]));
      const override = cols.some(c => always.includes(c)) ? ' overriding system value' : '';
      await db.query(`insert into public.${t} (${cols.map(c => '"' + c + '"').join(',')})${override} values (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, vals);
    }
    // sekvensene etter de gjenopprettede id-ene, så nye rader ikke kolliderer
    for (const c of meta.filter(m => m.identity_generation).map(m => m.column_name)) {
      await db.query(`select setval(pg_get_serial_sequence('public.${t}', '${c}'), coalesce((select max("${c}") from public.${t}), 0) + 1, false)`);
    }
    counts[t] = (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
  }
  await db.exec('set session_replication_role = origin');
  return counts;
}

/* Sjekker at RLS virker på gjenopprettede data: hver bruker med identitet ser via whoami sine egne aktive menigheter. */
export async function checkAccess(db, dump) {
  const out = [];
  for (const i of (dump.user_identities || []).slice(0, 20)) {
    const u = (dump.app_users || []).find(x => x.id === i.user_id); if (!u) continue;
    const expected = (dump.memberships || []).filter(m => m.user_id === u.id && m.status === 'active')
      .map(m => (dump.churches || []).find(c => c.id === m.church_id)).filter(c => c && c.status === 'active').map(c => c.name).sort();
    await db.exec('begin');
    await db.exec('set local role authenticated');
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ iss: i.provider, sub: i.subject, aal: 'aal1' })]);
    const me = (await db.query('select public.whoami() as me')).rows[0].me;
    const seen = await db.query('select count(*)::int as n from public.app_users');
    await db.exec('rollback');
    const got = me ? me.churches.map(c => c.name).sort() : null;
    out.push({ email: u.email, status: u.status, ok: u.status === 'active' ? JSON.stringify(got) === JSON.stringify(expected) : got === null, seesUsers: seen.rows[0].n });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('build', 'restore-drill.mjs'))) {
  const t0 = Date.now();
  const { db, applied, skipped } = await freshDb();
  console.log(`Migreringer i vanlig PostgreSQL (PGlite ${(await db.query('select version()')).rows[0].version.split(' ')[1]}): ${applied} kjørt, hoppet over Supabase-spesifikke: ${skipped.join(', ') || 'ingen'}`);
  const r = await rlsTests(db);
  console.log(`RLS-testsett: ${r.bestatt} bestått, ${r.feilet} feilet` + (r.feilet ? '\n' + JSON.stringify(r.feil, null, 1) : ''));
  const dumpFile = process.argv[2];
  if (dumpFile) {
    // én JSON-fil { tabell: [rader] }, eller en mappe fra supabase/checks/export-data.mjs (public.<tabell>.json per tabell)
    const isDir = fs.statSync(dumpFile).isDirectory();
    const dump = isDir ? Object.fromEntries(fs.readdirSync(dumpFile).filter(n => /^public\..+\.json$/.test(n)).map(n => [n.slice(7, -5), JSON.parse(fs.readFileSync(path.join(dumpFile, n), 'utf8'))])) : JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
    const tables = isDir ? Object.keys(dump).sort() : TABLES;
    const counts = await restore(db, dump, tables);
    const mismatch = tables.filter(t => counts[t] !== (dump[t] || []).length);
    console.log('Gjenopprettet ' + tables.length + ' tabeller, ' + tables.reduce((a, t) => a + counts[t], 0) + ' rader: ' + tables.map(t => t + '=' + counts[t]).join(', ') + (mismatch.length ? '  AVVIK: ' + mismatch.join(', ') : '  (alle radantall stemmer)'));
    const acc = await checkAccess(db, dump);
    console.log('Tilgang etter gjenoppretting: ' + acc.filter(a => a.ok).length + '/' + acc.length + ' brukere riktig' + (acc.some(a => !a.ok) ? '\n' + JSON.stringify(acc.filter(a => !a.ok)) : ''));
    if (mismatch.length || acc.some(a => !a.ok)) process.exitCode = 1;
  }
  if (r.feilet) process.exitCode = 1;
  console.log('Tid: ' + Math.round((Date.now() - t0) / 1000) + ' s');
  await db.close();
}
