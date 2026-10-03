import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteUrl, publicOrigin, SITE } from './backend.js';

test('nettadresse for e-postlenker: standard per miljø uten overstyring', () => {
  assert.equal(siteUrl({ VERCEL_ENV: 'production' }), SITE.production);
  assert.equal(siteUrl({ VERCEL_ENV: 'preview' }), SITE.preview);
  assert.equal(publicOrigin({ VERCEL_ENV: 'production' }, 'https://hva-som-helst.example/x'), SITE.production, 'forespørselens vert brukes aldri på Vercel');
});
test('nettadresse: CONNECTHUB_SITE_URL brukes bare når den er https og et rent vertsnavn', () => {
  assert.equal(siteUrl({ VERCEL_ENV: 'production', CONNECTHUB_SITE_URL: 'https://connecthub.no/' }), 'https://connecthub.no');
  for (const bad of ['http://connecthub.no', 'https://connecthub.no/sti', 'https://user@connecthub.no', 'https://*.vercel.app', 'https://connecthub', 'javascript:alert(1)', 'https://connecthub.no?x=1', ''])
    assert.equal(siteUrl({ VERCEL_ENV: 'production', CONNECTHUB_SITE_URL: bad }), SITE.production, bad);
});
test('nettadresse lokalt: bare localhost', () => {
  assert.equal(publicOrigin({}, 'http://localhost:4174/x'), 'http://localhost:4174');
  assert.equal(publicOrigin({}, 'https://evil.example/x'), null);
});
