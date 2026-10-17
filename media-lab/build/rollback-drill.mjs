/* Tilbakeføringsøvelse for lanseringens to migreringer, i PGlite (ekte PostgreSQL i Node, ingen nett):
     A = alle migreringer til og med 20261017100000_file_in_use (produksjonen i dag, 38)
     B = alle migreringer (40), deretter supabase/checks/rollback_20261018110000.sql og rollback_20261018100000.sql
   Kontrollerer at B etter tilbakeføringen har samme funksjoner (med identisk definisjon), triggere og rettigheter som A,
   og at de eneste forskjellene er de to kolonnene som bevisst beholdes (churches.member_limit, churches.legacy_defaults).
   Bruk: node build/rollback-drill.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const MIG = path.join(ROOT, 'supabase', 'migrations');
const CHK = path.join(ROOT, 'supabase', 'checks');
const LAST_PROD = '20261017100000';

async function build(upTo) {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;`);
  for (const f of fs.readdirSync(MIG).filter((x) => x.endsWith('.sql') && !/_supabase_/.test(x)).sort()) {
    if (upTo && f.slice(0, 14) > upTo) continue;
    await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8'));
  }
  return db;
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
async function snapshot(db) {
  const q = async (sql) => (await db.query(sql)).rows;
  const funcs = await q(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name,
      pg_get_functiondef(p.oid) as def, coalesce(array_to_string(p.proacl, ','), '') as acl, p.prosecdef as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'app') and p.prokind = 'f'`);
  const triggers = await q(`select c.relname || '.' || t.tgname as name, pg_get_triggerdef(t.oid) as def
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname in ('public', 'app')`);
  const cols = await q(`select table_name || '.' || column_name as name, data_type as def from information_schema.columns where table_schema = 'public'`);
  const colAcl = await q(`select table_name || '.' || column_name || ':' || grantee || ':' || privilege_type as name from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated')`);
  const policies = await q(`select tablename || '.' || policyname as name, coalesce(qual, '') || '|' || coalesce(with_check, '') as def from pg_policies where schemaname = 'public'`);
  return { funcs: new Map(funcs.map((f) => [f.name, norm(f.def) + ' ACL=' + f.acl + ' DEF=' + f.definer])), triggers: new Map(triggers.map((t) => [t.name, norm(t.def)])), cols: new Map(cols.map((c) => [c.name, c.def])), colAcl: new Map(colAcl.map((c) => [c.name, ''])), policies: new Map(policies.map((p) => [p.name, norm(p.def)])) };
}
function diff(a, b) {
  const out = { onlyA: [], onlyB: [], changed: [] };
  for (const [k, v] of a) { if (!b.has(k)) out.onlyA.push(k); else if (b.get(k) !== v) out.changed.push(k); }
  for (const k of b.keys()) if (!a.has(k)) out.onlyB.push(k);
  return out;
}

const A = await build(LAST_PROD);
const B = await build(null);
const before = await snapshot(B);
const rb = [];
for (const f of ['rollback_20261018110000.sql', 'rollback_20261018100000.sql']) {
  const r = await B.exec(fs.readFileSync(path.join(CHK, f), 'utf8'));
  rb.push(f + ': ' + JSON.stringify(r.at(-1)?.rows?.[0] ?? {}));
}
const sa = await snapshot(A), sb = await snapshot(B);
const report = {};
let ok = true;
for (const k of ['funcs', 'triggers', 'cols', 'colAcl', 'policies']) {
  const d = diff(sa[k], sb[k]);
  report[k] = d;
  const allowedOnlyB = k === 'cols' ? ['churches.member_limit', 'churches.legacy_defaults'] : [];
  const unexpected = d.onlyA.length || d.changed.length || d.onlyB.some((x) => !allowedOnlyB.includes(x));
  if (unexpected) ok = false;
}
// appens kall etter tilbakeføringen: whoami virker (uten legacy_defaults), member_usage finnes ikke
const who = await B.query(`select public.whoami() is null as anon_null`);
const mu = (await B.query(`select count(*)::int as n from pg_proc where proname in ('member_usage', 'set_member_limit', 'member_limit_guard')`)).rows[0].n;
console.log('Tilbakeføring kjørt:\n  ' + rb.join('\n  '));
console.log(`Før tilbakeføring: ${before.funcs.size} funksjoner, ${before.triggers.size} triggere. Etter: ${sb.funcs.size} / ${sb.triggers.size}. Utgangspunkt (38 migreringer): ${sa.funcs.size} / ${sa.triggers.size}.`);
for (const [k, d] of Object.entries(report)) console.log(`${k}: bare i utgangspunktet ${JSON.stringify(d.onlyA)}, bare etter tilbakeføring ${JSON.stringify(d.onlyB)}, ulik definisjon ${JSON.stringify(d.changed)}`);
console.log(`whoami uten innlogging gir null: ${who.rows[0].anon_null}; brukergrensefunksjoner igjen: ${mu}`);
if (mu) ok = false;
console.log(ok ? 'RESULTAT: tilbakeføringen gir samme skjema som i dag (bortsett fra de to kolonnene som beholdes)' : 'RESULTAT: AVVIK – se over');
process.exitCode = ok ? 0 : 1;
