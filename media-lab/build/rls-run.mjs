/* Kjører alle leverandørnøytrale migreringer og RLS-testsettet i PGlite og skriver ut resultatet (feilede tester eller
   SQL-feil). Brukes under utvikling: node build/rls-run.mjs */
import { freshDb, rlsTests } from './restore-drill.mjs';

let db;
try { ({ db } = await freshDb()); } catch (e) { console.log(e.message); process.exit(1); }
try {
  const r = await rlsTests(db);
  const o = r && (r.resultat || r);
  console.log('bestått', o.bestatt, 'feilet', o.feilet);
  for (const f of o.feil || []) console.log(' ✖', f.test, '—', f.info);
} catch (e) {
  console.log('SQL-feil:', e.message, e.position ? '(posisjon ' + e.position + ')' : '');
}
