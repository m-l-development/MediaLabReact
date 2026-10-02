import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubSecrets, scrubText, scrubDeep, appOf, cleanPath, cleanView, browserOf, deviceOf, formatCase, formatCases } from './feedback-core.js';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop';

test('rensing: tokens, nøkler, passord, adresseparametere og databaseadresser fjernes', () => {
  const s = scrubSecrets(`a ${JWT} b sb_secret_abcdefghij1234 c Bearer abcdefghijklmnopqrstuv d /login?token=hemmelig123&x=1 postgres://user:pw123@host/db sk_live_abcdefghijk ${'A1'.repeat(25)}`);
  for (const bad of ['eyJhbGci', 'sb_secret_', 'abcdefghijklmnopqrstuv', 'hemmelig123', 'pw123', 'sk_live_', 'A1A1A1A1A1A1A1A1A1A1']) assert.ok(!s.includes(bad), bad);
  assert.match(s, /\[fjernet: token\]/); assert.match(s, /token=\[fjernet\]&x=1/); assert.match(s, /Bearer \[fjernet\]/);
  assert.equal(scrubSecrets('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----'), '[fjernet: privat nøkkel]');
});
test('rensing: brukerens tekst mister e-post, telefon og passord – men vanlig mening, feilkoder og adresser beholdes', () => {
  const s = scrubText('Kontakt ola.nordmann@example.com eller +47 912 34 567. passord: Hemmelig123. Feilkode: 500 på https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app/x');
  for (const bad of ['ola.nordmann', '912 34 567', 'Hemmelig123']) assert.ok(!s.includes(bad), bad);
  assert.match(s, /\[e-post fjernet\]/); assert.match(s, /\[telefon fjernet\]/); assert.match(s, /passord: \[fjernet\]/);
  assert.match(s, /Feilkode: 500/); assert.match(s, /media-lab-react-vyef-git-connecthub-media-lab3\.vercel\.app/);
  assert.equal(scrubText('Eksporten stopper på 98 % når jeg trykker «Lagre».'), 'Eksporten stopper på 98 % når jeg trykker «Lagre».');
});
test('rensing: dyp rensing av objekter', () => {
  assert.deepEqual(scrubDeep({ a: 'sb_secret_abcdefghij1234', b: [1, { c: '?code=xyz123' }], d: null }), { a: '[fjernet: nøkkel]', b: [1, { c: '?code=[fjernet]' }], d: null });
});
test('applikasjon og side: navn fra stien, sti og visning uten parametere og ID-er', () => {
  assert.deepEqual(appOf('/photo-design.dc.html'), { id: 'photo-design', name: 'Photo Design' });
  assert.deepEqual(appOf('/'), { id: 'media-lab', name: 'Media Lab (forsiden)' });
  assert.equal(appOf('/../etc/passwd').id, 'ukjent');
  assert.equal(cleanPath('/connecthub-admin.dc.html?next=/x#/brukere'), '/connecthub-admin.dc.html');
  assert.equal(cleanView('#/menigheter/44ebdf65-ebc9-4f62-846f-dfd12e271d3e/filer?token=abc'), '#/menigheter/:id/filer');
  assert.equal(cleanView('#'), '');
});
test('nettleser og enhet: grovt, uten fingeravtrykk', () => {
  assert.deepEqual(browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0'), { browser: 'Edge 140', os: 'Windows 10/11' });
  assert.deepEqual(browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'), { browser: 'Safari 18', os: 'iOS 18' });
  assert.equal(deviceOf(390, true), 'mobil'); assert.equal(deviceOf(800, true), 'nettbrett'); assert.equal(deviceOf(1440, false), 'PC');
});

const CASE = {
  id: 'c1', ref: 'TB-ABC123', kind: 'bug', title: 'Eksport stopper', description: `Eksporten stopper. Min e-post er ola@example.com og token ${JWT}`,
  answers: { expected: 'PNG lastes ned', steps: '1. Åpne\n2. Eksporter', severity: 'high' }, app: 'photo-design', app_name: 'Photo Design', page: '/photo-design.dc.html', view: '#/editor/:id',
  marked: { mode: 'element', rect: { x: 10, y: 20, w: 30, h: 5 }, viewport: '1440×900', element: { tag: 'button', role: 'button', label: 'Eksporter', path: 'div.panel > button.btn', attrs: { 'data-dc-tpl': '116' } } },
  context: { env: 'preview', build: 'b1', commit: 'a3a7029', branch: 'connecthub', browser: 'Chrome 140', os: 'Windows 10/11', device: 'PC', screen: '1920×1080', viewport: '1440×900', dpr: 1, lang: 'nb', tz: 'Europe/Oslo',
    errors: [{ time: '2026-10-02T10:00:00Z', kind: 'JS-feil', message: 'x is undefined', source: '/assets/photo.js', line: 12 }] },
  role: 'user', submitter_id: 'u-1', submitter_name: 'Ola Nordmann', church_id: 'ch-1', church_name: 'Menighet A', status: 'in_progress', status_reason: null, created_at: '2026-10-02T10:05:00Z',
};
const EVENTS = [{ kind: 'status', old_status: 'new', new_status: 'in_progress', actor_role: 'moderator', created_at: '2026-10-02T11:00:00Z' }, { kind: 'note', text: 'Gjenskapt i Chrome', actor_role: 'developer', created_at: '2026-10-02T11:05:00Z' }];

test('Kopier sak til Claude: alle seksjoner, skiller bruker/automatisk/internt, ingen hemmeligheter eller navn', () => {
  const t = formatCase(CASE, EVENTS);
  for (const h of ['# Tilbakemelding TB-ABC123', '## 1. Oppgave', '## 2. Saken (oppgitt av brukeren)', '## 3. Applikasjon og plassering (hentet automatisk)', '## 4. Teknisk kontekst (hentet automatisk)', '## 5. Oppfølging (internt, Moderator/Developer)', '## 6. Instruksjon til Claude Code']) assert.ok(t.includes(h), h);
  assert.match(t, /Forventet oppførsel: PNG lastes ned/); assert.match(t, /Alvorlighet \(brukerens vurdering\): Høy/);
  assert.match(t, /media-lab\/src\/pages\/photo-design\//); assert.match(t, /data-dc-tpl="116"/); assert.match(t, /Element: <button>/);
  assert.match(t, /Git-commit: a3a7029 \(gren connecthub\)/); assert.match(t, /x is undefined \(\/assets\/photo\.js:12\)/);
  assert.match(t, /Under behandling/); assert.match(t, /notat \(developer\): Gjenskapt i Chrome/);
  assert.match(t, /utviklingsgrenen \(connecthub\), ikke i produksjon/); assert.match(t, /Ikke publiser til produksjon uten uttrykkelig godkjenning/);
  for (const bad of ['ola@example.com', 'eyJhbGci', 'Ola Nordmann', 'Menighet A']) assert.ok(!t.includes(bad), 'skal ikke inneholde ' + bad);
});
test('Kopier sak til Claude: manglende opplysninger vises som «Ikke tilgjengelig», instruksjonen tilpasses typen', () => {
  const t = formatCase({ id: 'c2', ref: 'TB-000001', kind: 'feature', description: 'Mørk modus i eksport', status: 'new', created_at: '2026-10-02T10:00:00Z' });
  assert.match(t, /Versjon\/bygg: Ikke tilgjengelig/); assert.match(t, /Markering: ingen/); assert.match(t, /Ingen interne notater/);
  assert.match(t, /lag først en kort plan|Lag først en kort plan/);
});
test('Kopier alle saker: overskrift, dato, antall, hver sak skilt og hel; store eksporter deles uten at saker utelates', () => {
  const cases = Array.from({ length: 6 }, (_, i) => ({ ...CASE, id: 'c' + i, ref: 'TB-00000' + i, description: 'Sak nummer ' + i + ' ' + 'x'.repeat(800) }));
  const one = formatCases(cases, { c0: EVENTS }, { scope: 'test', now: new Date('2026-10-02T12:00:00Z') });
  assert.equal(one.length, 1);
  assert.match(one[0], /Samlet oversikt over tilbakemeldinger/); assert.match(one[0], /Antall saker: 6/); assert.match(one[0], /Eksportert: 2026-10-02 12:00:00 UTC/);
  assert.equal(one[0].split('\n---\n').length, 7, 'seks saker skilt med linjer');
  const parts = formatCases(cases, {}, { maxChars: 5000 });
  assert.ok(parts.length > 1, 'delt opp');
  const all = parts.join('\n');
  for (const c of cases) assert.equal(all.split('## Sak ' + c.ref).length - 1, 1, c.ref + ' finnes nøyaktig én gang');
  parts.forEach((p, i) => assert.match(p, new RegExp('del ' + (i + 1) + ' av ' + parts.length)));
});
