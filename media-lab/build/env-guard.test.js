import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REFS, ENV_NAMES, DEV_SITE, targetOf, refFromUrl, classifyKey, resolveSupabaseEnv, scanText } from './env-guard.js';
import { SITE } from '../server/lib/backend.js';

test('ConnectHub Dev-adressen: samme som serverens Preview-adresse, ikke produksjon, uten prosjekt-ID', () => {
  assert.equal(DEV_SITE, SITE.preview);
  assert.notEqual(DEV_SITE, SITE.production);
  assert.match(DEV_SITE, /^https:\/\/[a-z0-9-]+\.vercel\.app$/);
  assert.deepEqual(scanText(DEV_SITE, { target: 'production' }), [], 'byggevakten godtar adressen i produksjonsbygget');
  assert.ok(!DEV_SITE.includes(REFS.preview) && !DEV_SITE.includes(REFS.production));
});

const PUB = 'sb_publishable_TESTtestTEST1234567890';
const url = ref => `https://${ref}.supabase.co`;
const jwt = payload => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'c2lnbmF0dXJlLXRlc3Q'].join('.');
const env = (target, u, k) => { const n = ENV_NAMES[target], e = { [n.url]: u, [n.key]: k }; if (target !== 'local') e.VERCEL_ENV = target; return e; };

test('targetOf: Vercel-miljø, ellers lokalt', () => {
  assert.equal(targetOf({ VERCEL_ENV: 'production' }), 'production');
  assert.equal(targetOf({ VERCEL_ENV: 'preview' }), 'preview');
  assert.equal(targetOf({ VERCEL_ENV: 'development' }), 'local');
  assert.equal(targetOf({}), 'local');
});

test('refFromUrl godtar bare https://<20 tegn>.supabase.co', () => {
  assert.equal(refFromUrl(url(REFS.preview)), REFS.preview);
  assert.equal(refFromUrl(url(REFS.preview) + '/'), REFS.preview);
  assert.equal(refFromUrl('http://' + REFS.preview + '.supabase.co'), null);
  assert.equal(refFromUrl('https://evil.example.com'), null);
  assert.equal(refFromUrl(url(REFS.preview) + '.evil.com'), null);
});

test('classifyKey skiller offentlige og hemmelige nøkler', () => {
  assert.equal(classifyKey(PUB), 'publishable');
  assert.equal(classifyKey('sb_secret_abcdefghijklmnop'), 'secret');
  assert.equal(classifyKey(jwt({ role: 'service_role' })), 'service_role');
  assert.equal(classifyKey(jwt({ role: 'anon' })), 'anon');
  assert.equal(classifyKey('noe-annet'), 'unknown');
});

test('gyldig oppsett for Preview og Production', () => {
  const p = resolveSupabaseEnv(env('preview', url(REFS.preview), PUB));
  assert.deepEqual(p.public, { url: url(REFS.preview), key: PUB, ref: REFS.preview, target: 'preview' });
  const q = resolveSupabaseEnv(env('production', url(REFS.production), PUB));
  assert.equal(q.public.ref, REFS.production);
});

test('Preview som peker mot produksjon stoppes', () => {
  assert.throws(() => resolveSupabaseEnv(env('preview', url(REFS.production), PUB)), /preview peker til prosjekt/);
});

test('Production som peker mot utvikling stoppes', () => {
  assert.throws(() => resolveSupabaseEnv(env('production', url(REFS.preview), PUB)), /production peker til prosjekt/);
});

test('lokalt kan aldri peke mot produksjon', () => {
  assert.throws(() => resolveSupabaseEnv(env('local', url(REFS.production), PUB)), /local peker til prosjekt/);
});

test('hemmelige og eldre nøkler stoppes, uten at nøkkelen står i feilmeldingen', () => {
  for (const k of ['sb_secret_abcdefghijklmnop', jwt({ role: 'service_role' }), jwt({ role: 'anon' }), 'QZX-testnokkel-9187']) {
    assert.throws(() => resolveSupabaseEnv(env('preview', url(REFS.preview), k)), e => /Bygget stoppes/.test(e.message) && !e.message.includes(k));
  }
});

test('manglende variabler: feil på Vercel, advarsel lokalt', () => {
  assert.throws(() => resolveSupabaseEnv({ VERCEL_ENV: 'preview' }), /mangler miljøvariabel for preview/);
  assert.throws(() => resolveSupabaseEnv({ VERCEL_ENV: 'production' }), /mangler miljøvariabel for production/);
  const l = resolveSupabaseEnv({});
  assert.equal(l.public, null);
  assert.equal(l.warnings.length, 1);
});

test('variabler for feil miljø blir ikke brukt (Preview leser ikke produksjonsnavnene)', () => {
  const e = { VERCEL_ENV: 'preview', [ENV_NAMES.production.url]: url(REFS.production), [ENV_NAMES.production.key]: PUB };
  assert.throws(() => resolveSupabaseEnv(e), /mangler miljøvariabel for preview/);
});

test('scanText finner kjente hemmelighetsmønstre', () => {
  assert.deepEqual(scanText('const a = "hei";'), []);
  assert.ok(scanText('x="sb_secret_abcdefghijklmnop"').includes('sb_secret_-nøkkel'));
  assert.ok(scanText('postgres://user:pass@db.example.com:5432/x').includes('PostgreSQL-URL med passord'));
  assert.ok(scanText('x="CONNECTHUB_SMTP_PASSWORD"').includes('variabelnavn CONNECTHUB_SMTP_PASSWORD'));
  const hit = scanText('a="abcd-efgh-ijkl-mnop"', { secrets: [['CONNECTHUB_SMTP_PASSWORD', 'abcd-efgh-ijkl-mnop']] });
  assert.deepEqual(hit, ['verdien av CONNECTHUB_SMTP_PASSWORD']); assert.ok(!hit.join().includes('abcd'), 'verdien vises aldri i funnet');
  assert.ok(scanText('k="' + jwt({ role: 'service_role', iss: 'supabase' }) + '"').includes('JWT med service_role'));
  assert.deepEqual(scanText('k="' + jwt({ role: 'anon', iss: 'supabase' }) + '"'), []);
  assert.ok(scanText('SUPABASE_SERVICE_ROLE_KEY').length === 1);
  assert.ok(scanText('ref ' + REFS.production, { target: 'preview' }).length === 1);
  assert.ok(scanText('ref ' + REFS.preview, { target: 'production' }).length === 1);
  assert.deepEqual(scanText('ref ' + REFS.preview, { target: 'preview' }), []);
});
