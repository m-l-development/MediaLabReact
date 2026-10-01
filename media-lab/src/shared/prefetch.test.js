import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageOf, assetsOf } from './prefetch.js';

const here = { href: 'https://app.example/media-lab.dc.html', origin: 'https://app.example', pathname: '/media-lab.dc.html' };

test('forhåndslasting: bare andre sider i appen, aldri eksterne adresser eller samme side', () => {
  assert.equal(pageOf('photo-design.dc.html', here), '/photo-design.dc.html');
  assert.equal(pageOf('media-lab.dc.html#some', here), null, 'samme side');
  assert.equal(pageOf('https://evil.example/x.dc.html', here), null);
  assert.equal(pageOf('#/filer', here), null);
  assert.equal(pageOf('javascript:alert(1)', here), null);
  assert.equal(pageOf('/api/ch?a=x', here), null);
  assert.equal(pageOf('blob:https://app.example/1', here), null);
});

test('forhåndslasting: finner bare egne skript og stilark i den bygde siden', () => {
  const html = '<script type="module" crossorigin src="/assets/a-1.js"></script><link rel="modulepreload" crossorigin href="/assets/b-2.js">'
    + '<link rel="stylesheet" crossorigin href="/assets/c-3.css"><script src="https://cdn.example/x.js"></script><link rel="icon" href="/favicon.ico"><script src="/assets/a-1.js"></script>';
  assert.deepEqual(assetsOf(html), [{ path: '/assets/a-1.js', kind: 'js' }, { path: '/assets/b-2.js', kind: 'js' }, { path: '/assets/c-3.css', kind: 'css' }]);
});
