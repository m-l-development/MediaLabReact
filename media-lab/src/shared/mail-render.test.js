import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMail, templateProblem, DEFAULT_TEMPLATES, TEMPLATE_KEYS, safeLink } from './mail-render.js';

const LINK = 'https://example.test/login.dc.html?flow=recovery&token_hash=abc&type=recovery';

test('standardmalene er gyldige og gir HTML og tekst med lenken', () => {
  for (const k of TEMPLATE_KEYS) {
    assert.equal(templateProblem(DEFAULT_TEMPLATES[k]), null, k);
    const m = renderMail(DEFAULT_TEMPLATES[k], { link: LINK });
    assert.ok(m.html.includes('href="https://example.test/login.dc.html?flow=recovery&amp;token_hash=abc&amp;type=recovery"'), k + ': lenken står i knappen');
    assert.ok(m.text.includes(LINK), k + ': lenken står i tekstversjonen');
    assert.ok(m.html.includes('src="cid:medialab-logo"'), k + ': logo som innebygd vedlegg');
    assert.ok(m.subject.length > 0);
  }
});

test('all tekst escapes – ingen HTML eller skript fra malen', () => {
  const t = { subject: 'Hei <b>{epost}</b>', blocks: [
    { t: 'h', text: '<script>alert(1)</script>' }, { t: 'p', text: '<img src=x onerror=alert(1)> **fet** *kursiv*\nlinje 2' },
    { t: 'link', label: '"><a href="https://ond.test">' }, { t: 'small', text: 'javascript:alert(1)' }] };
  const m = renderMail(t, { link: LINK, vars: { epost: '<i>x@y.no</i>' } });
  assert.ok(!/<script|<img src=x|<a href="https:\/\/ond/i.test(m.html), 'ingen injiserte tagger');
  assert.ok(m.html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'teksten vises som tekst');
  assert.ok(m.html.includes('&lt;script&gt;') && m.html.includes('<strong>fet</strong>') && m.html.includes('<em>kursiv</em>') && m.html.includes('<br>'));
  assert.equal(m.subject, 'Hei <b><i>x@y.no</i></b>', 'emnet er ren tekst (e-postklienter tolker ikke HTML i emnet)');
  assert.ok(!m.html.includes('<i>x@y.no</i>'), 'flettefelt escapes i HTML');
});

test('lenken kan ikke styres av malen, og bare trygge adresser godtas', () => {
  assert.throws(() => renderMail(DEFAULT_TEMPLATES.password, { link: 'javascript:alert(1)' }));
  assert.throws(() => renderMail(DEFAULT_TEMPLATES.password, { link: 'https://x.test/" onclick="x' }));
  assert.equal(safeLink('https://a.test/x?y=1'), 'https://a.test/x?y=1');
  const withUrl = { subject: 'S', blocks: [{ t: 'p', text: 'https://ond.test' }, { t: 'link', label: 'Gå', href: 'https://ond.test' }] };
  const m = renderMail(withUrl, { link: LINK });
  assert.ok(!m.html.includes('href="https://ond.test"'), 'et eget href-felt i blokken ignoreres');
});

test('kontroll: nøyaktig én lenkeboks, kjente blokker, lengder og emne på én linje', () => {
  assert.match(templateProblem({ subject: 'S', blocks: [{ t: 'p', text: 'x' }] }), /lenkeboks/);
  assert.match(templateProblem({ subject: 'S', blocks: [{ t: 'link', label: 'a' }, { t: 'link', label: 'b' }] }), /lenkeboks/);
  assert.match(templateProblem({ subject: 'S', blocks: [{ t: 'html', text: '<b>' }, { t: 'link', label: 'a' }] }), /blokktype/);
  assert.match(templateProblem({ subject: 'S\nBcc: x@y', blocks: [{ t: 'link', label: 'a' }] }), /Emnet/);
  assert.match(templateProblem({ subject: 'S', blocks: [{ t: 'p', text: 'x'.repeat(2001) }, { t: 'link', label: 'a' }] }), /avsnitt/);
  assert.match(templateProblem({ subject: 'S', blocks: [{ t: 'logo' }, { t: 'logo' }, { t: 'link', label: 'a' }] }), /logo/);
  assert.equal(templateProblem({ subject: 'S', blocks: [{ t: 'link', label: 'a' }] }), null);
});
