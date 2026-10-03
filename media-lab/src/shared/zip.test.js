import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, zipParts, uniqueNames, safeName } from './zip.js';

const join = parts => { const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

/* Leser arkivet tilbake via sentralkatalogen (som en vanlig utpakker gjør) og kontrollerer innholdet. */
function unzip(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), end = buf.length - 22, dec = new TextDecoder();
  assert.equal(v.getUint32(end, true), 0x06054b50);
  const count = v.getUint16(end + 10, true); let p = v.getUint32(end + 16, true); const out = [];
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const flags = v.getUint16(p + 8, true), crc = v.getUint32(p + 16, true), size = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
    assert.equal(v.getUint32(off, true), 0x04034b50); const lnl = v.getUint16(off + 26, true);
    const data = buf.subarray(off + 30 + lnl, off + 30 + lnl + size);
    assert.equal(crc32(data), crc, 'CRC stemmer'); assert.equal(flags & 0x0800, 0x0800, 'UTF-8-flagg');
    out.push({ name, data: [...data] }); p += 46 + nl;
  }
  return out;
}

test('crc32: kjent verdi', () => { assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926); });

test('zip: filene kan leses tilbake med riktige navn (også æøå) og innhold', () => {
  const files = [{ name: 'påske.png', data: new Uint8Array([1, 2, 3]) }, { name: 'logo.jpg', data: new Uint8Array([9, 8]) }, { name: 'tom.gif', data: new Uint8Array([]) }];
  const r = unzip(join(zipParts(files, new Date(2026, 9, 3, 12, 30, 10))));
  assert.deepEqual(r.map(x => x.name), ['påske.png', 'logo.jpg', 'tom.gif']);
  assert.deepEqual(r.map(x => x.data), [[1, 2, 3], [9, 8], []]);
});

test('zip: like navn blir unike, og farlige navn gjøres trygge (ingen mapper eller ../)', () => {
  assert.deepEqual(uniqueNames(['a.png', 'A.png', 'a.png', 'b']), ['a.png', 'A (2).png', 'a (3).png', 'b']);
  assert.equal(safeName('../../etc/passwd'), '_.._etc_passwd');
  assert.equal(safeName('C:\\x\\y.png'), 'C__x_y.png');
  assert.equal(safeName('...'), 'fil');
  const r = unzip(join(zipParts([{ name: '../hemmelig.png', data: new Uint8Array([1]) }])));
  assert.ok(!r[0].name.includes('/'), 'ingen mapper i arkivet');
});
