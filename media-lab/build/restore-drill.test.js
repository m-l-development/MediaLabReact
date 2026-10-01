import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, rlsTests, restore, checkAccess } from './restore-drill.mjs';

test('vanlig PostgreSQL (PGlite): alle leverandørnøytrale migreringer kjører og hele RLS-testsettet består', async () => {
  const { db, skipped } = await freshDb();
  assert.deepEqual(skipped.every(f => /_supabase_/.test(f)), true);
  const r = await rlsTests(db);
  assert.equal(r.feilet, 0, JSON.stringify(r.feil));
  assert.ok(r.bestatt >= 140);
  await db.close();
});

test('gjenoppretting av data: radantall stemmer og tilgangsregler virker på gjenopprettede data', async () => {
  const { db } = await freshDb();
  const id = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
  const dump = {
    app_users: [{ id: id(1), email: 'a@x.invalid', status: 'active' }, { id: id(2), email: 'b@x.invalid', status: 'disabled' }],
    user_identities: [{ provider: 'https://x.invalid/auth/v1', subject: 's1', user_id: id(1) }, { provider: 'https://x.invalid/auth/v1', subject: 's2', user_id: id(2) }],
    churches: [{ id: id(10), name: 'Kirke 1', status: 'active' }, { id: id(11), name: 'Kirke 2', status: 'active' }],
    memberships: [{ user_id: id(1), church_id: id(10), status: 'active' }, { user_id: id(2), church_id: id(11), status: 'active' }],
    user_roles: [], invitations: [], files: [], audit_logs: [{ id: 5, action: 'x', meta: {}, created_at: '2026-01-01T00:00:00Z' }],
  };
  const counts = await restore(db, dump);
  assert.deepEqual(counts, { app_users: 2, user_identities: 2, churches: 2, memberships: 2, user_roles: 0, invitations: 0, files: 0, audit_logs: 1 });
  const acc = await checkAccess(db, dump);
  assert.deepEqual(acc.map(a => [a.email, a.ok, a.seesUsers]), [['a@x.invalid', true, 1], ['b@x.invalid', true, 0]]);
  await db.close();
});
