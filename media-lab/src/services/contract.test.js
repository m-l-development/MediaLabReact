/* Kontrakttester for dataporten (P9). Samme testsett kjøres mot den falske adapteren (alltid) og mot den ekte
   Supabase-adapteren mot connecthub-dev når CH_LIVE_EMAIL/CH_LIVE_PASSWORD/CH_LIVE_URL/CH_LIVE_KEY er satt
   (syntetisk vanlig bruker, medlem av én menighet). En ny leverandør må bestå det samme testsettet. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeData } from './adapters/fake/data.js';
import { ServiceError } from './errors.js';
import { admin } from './admin.js';
import { files } from './files.js';
import { useDataAdapter } from './port.js';

async function rejects(p, code) {
  try { await p; } catch (e) { assert.ok(e instanceof ServiceError, 'skal være ServiceError, var ' + e); assert.equal(e.code, code); return; }
  assert.fail('ble ikke avvist (forventet ' + code + ')');
}

export function contract(name, makeAdapter) {
  test(name + ': select gir bare valgte kolonner, filtrerer, sorterer og begrenser', async () => {
    const d = await makeAdapter();
    const rows = await d.select('churches', { columns: 'id, name', order: 'name' });
    assert.ok(rows.length >= 1);
    for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ['id', 'name']);
    assert.deepEqual(rows.map(r => r.name), [...rows.map(r => r.name)].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0)));
    assert.deepEqual(await d.select('churches', { columns: 'id', eq: { id: '00000000-0000-4000-8000-0000000000ff' } }), []);
    assert.ok((await d.select('churches', { columns: 'id', limit: 1 })).length <= 1);
    assert.equal((await d.select('churches', { columns: 'id', inList: { id: [rows[0].id] } })).length, 1);
  });
  test(name + ': rpc gir data, ukjent funksjon gir not_found', async () => {
    const d = await makeAdapter();
    const me = await d.rpc('whoami');
    assert.equal(typeof me.id, 'string');
    await rejects(d.rpc('finnes_ikke_' + Date.now()), 'not_found');
  });
  test(name + ': tilgang nektes med nøytrale koder (forbidden), og skjulte rader endres ikke', async () => {
    const d = await makeAdapter();
    await rejects(d.insert('churches', { name: 'Kontrakttest' }), 'forbidden');
    await rejects(d.select('invitations', { columns: 'token_hash' }), 'forbidden');
    const [c] = await d.select('churches', { columns: 'id, name' });
    assert.deepEqual(await d.update('churches', { id: c.id }, { name: 'Endret av kontrakttest' }), []);
    assert.equal((await d.select('churches', { columns: 'name', eq: { id: c.id } }))[0].name, c.name);
  });
}

/* --- falsk adapter (rettighetene speiler en vanlig bruker) --- */
const fake = () => makeFakeData({
  tables: { churches: [{ id: 'c2', name: 'B-menighet', status: 'active' }, { id: 'c1', name: 'A-menighet', status: 'active' }], invitations: [] },
  rpcs: { whoami: () => ({ id: 'u1', roles: [], churches: [] }) },
  allow: (op) => op === 'select',
  hiddenColumns: ['invitations.token_hash'],
});
contract('Falsk adapter', fake);

/* --- ekte adapter mot connecthub-dev (valgfritt) --- */
const L = process.env;
if (L.CH_LIVE_EMAIL && L.CH_LIVE_PASSWORD && L.CH_LIVE_URL && L.CH_LIVE_KEY) {
  if (!/uatpdmhnwwjgzlxaucsx/.test(L.CH_LIVE_URL)) throw new Error('Kontrakttester kjøres bare mot utviklingsprosjektet');
  let live = null;
  contract('Supabase (connecthub-dev)', async () => {
    if (live) return live;
    const { createClient } = await import('@supabase/supabase-js');
    const { makeSupabaseData } = await import('./adapters/supabase/data.js');
    const c = createClient(L.CH_LIVE_URL, L.CH_LIVE_KEY, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email: L.CH_LIVE_EMAIL, password: L.CH_LIVE_PASSWORD });
    if (error) throw new Error('innlogging: ' + error.code);
    return (live = makeSupabaseData(c));
  });
}

/* --- tjenestelaget mot falsk adapter --- */
test('admin.members: slår sammen medlemskap, brukere og admin-roller, sortert på navn', async () => {
  useDataAdapter(makeFakeData({ tables: {
    memberships: [{ user_id: 'u1', church_id: 'c1', status: 'active' }, { user_id: 'u2', church_id: 'c1', status: 'disabled' }, { user_id: 'u3', church_id: 'c2', status: 'active' }],
    user_roles: [{ id: 'r1', user_id: 'u2', role: 'church_admin', church_id: 'c1', revoked_at: null }, { id: 'r0', user_id: 'u1', role: 'church_admin', church_id: 'c1', revoked_at: '2026-01-01' }],
    app_users: [{ id: 'u1', email: 'b@x.no', full_name: 'Bjørn' }, { id: 'u2', email: 'a@x.no', full_name: 'Anne' }, { id: 'u3', email: 'c@x.no', full_name: 'Cato' }],
  } }));
  const m = await admin.members('c1');
  assert.deepEqual(m.map(x => [x.user.full_name, x.status, !!x.admin]), [['Anne', 'disabled', true], ['Bjørn', 'active', false]]);
  useDataAdapter(null);
});

test('files.upload: video, feil type og for store filer stoppes før noe sendes', async () => {
  const f = (name, type, size) => ({ name, type, size });
  await rejects(files.upload(f('klipp.mp4', 'video/mp4', 10), { churchId: 'c1' }), 'video_not_allowed');
  await rejects(files.upload(f('bilde.png', 'video/quicktime', 10), { churchId: 'c1' }), 'video_not_allowed');
  await rejects(files.upload(f('KLIPP.MOV', '', 10), { churchId: 'c1' }), 'video_not_allowed');
  await rejects(files.upload(f('x.svg', 'image/svg+xml', 10), { churchId: 'c1' }), 'type_not_allowed');
  await rejects(files.upload(f('x.png', 'image/png', 5 * 1024 * 1024), { churchId: 'c1' }), 'too_large');
});

test('trinn 19: kvote og pris endres bare via loggførte databasefunksjoner – aldri ved direkte skriving', async () => {
  const calls = [];
  const rpcs = Object.fromEntries(['update_plan', 'plan_change_preview', 'set_church_quota', 'follow_plan_quota'].map(fn => [fn, a => { calls.push([fn, a]); return fn === 'update_plan' ? { ok: true, churches_updated: 0 } : []; }]));
  const fake = makeFakeData({ tables: { churches: [{ id: 'c1', storage_quota_mb: 200 }], plans: [] }, rpcs });
  const upd = fake.update.bind(fake); let direct = 0; fake.update = (...a) => { direct++; return upd(...a); };
  useDataAdapter(fake);
  const { subscriptions } = await import('./community.js');
  await admin.setQuota('c1', 777);
  await admin.followPlanQuota('c1');
  await subscriptions.updatePlan('standard', 2048, '', true);
  await subscriptions.updatePlan('utvidet', 5120, '990', false);
  await subscriptions.planPreview('standard', 2048);
  assert.equal(direct, 0, 'ingen direkte oppdatering av tabeller');
  assert.deepEqual(calls.map(c => c[0]), ['set_church_quota', 'follow_plan_quota', 'update_plan', 'update_plan', 'plan_change_preview']);
  assert.deepEqual(calls[2][1], { p_plan: 'standard', p_quota_mb: 2048, p_price_nok_month: null, p_update_churches: true }, 'tom pris = «Avtales» (null)');
  assert.equal(calls[3][1].p_price_nok_month, 990);
  useDataAdapter(null);
});
