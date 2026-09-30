// Lager testfilene i tests/fixtures/ (kjør: node tests/fixtures/lag.mjs). Bruker macOS «say» til tale og Chrome (Playwright)
// til bilder og video. Filene sjekkes inn, så testene ikke er avhengige av at dette kan kjøres.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const f = n => path.join(DIR, n);

/* ukeprogram som tekst og CSV */
const PROGRAM = ['Tirsdag kl 19:00 Kveldsmat i kafeen', 'Torsdag kl 11:00 Bønn', 'Fredag kl 19:00 Ungdomsmøte', 'Søndag kl 11:00 Søndagsmøte'];
fs.writeFileSync(f('program.txt'), PROGRAM.join('\n') + '\n');
fs.writeFileSync(f('program.csv'), 'Dag;Tid;Navn\nTirsdag;19:00;Kveldsmat i kafeen\nTorsdag;11:00;Bønn\nFredag;19:00;Ungdomsmøte\nSøndag;11:00;Søndagsmøte\n');

/* musikk med tydelig takt: 120 BPM, bassdunk på hvert slag, 12 s, 44,1 kHz mono 16-bit */
{
  const sr = 44100, sek = 12, n = sr * sek, d = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, slag = t % 0.5, env = Math.exp(-slag * 18);
    d[i] = Math.round(0.6 * 32767 * (env * Math.sin(2 * Math.PI * (60 + 40 * Math.exp(-slag * 30)) * slag) + 0.15 * Math.sin(2 * Math.PI * 220 * t) * 0.3));
  }
  const h = Buffer.alloc(44), len = n * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + len, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(len, 40);
  fs.writeFileSync(f('takt.wav'), Buffer.concat([h, Buffer.from(d.buffer)]));
}

/* norsk tale (Whisper-undertekster) */
execFileSync('say', ['-v', 'Nora', '-o', f('tale.aiff'), 'Velkommen til søndagsmøte. I dag skal vi snakke om håp og fellesskap. Takk for at du kom.']);
execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', f('tale.aiff'), f('tale.wav')]);
fs.unlinkSync(f('tale.aiff'));

const br = await chromium.launch({ channel: 'chrome' });
const p = await br.newPage();

/* bilde av ukeprogrammet (tekstgjenkjenning) og et stort bilde over 4,4 MB (Admin-grensen) */
const bilde = await p.evaluate(linjer => {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 700; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1400, 700); g.fillStyle = '#111111'; g.font = 'bold 54px Arial';
  g.fillText('UKENS PROGRAM', 80, 120); g.font = '44px Arial'; linjer.forEach((l, i) => g.fillText(l, 80, 230 + i * 100));
  return c.toDataURL('image/png');
}, PROGRAM);
fs.writeFileSync(f('program.png'), Buffer.from(bilde.split(',')[1], 'base64'));
const stor = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1600; const g = c.getContext('2d'), im = g.createImageData(1600, 1600);
  for (let i = 0; i < im.data.length; i += 65536) crypto.getRandomValues(im.data.subarray(i, Math.min(i + 65536, im.data.length)));
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = 255;
  g.putImageData(im, 0, 0); return c.toDataURL('image/png');
});
fs.writeFileSync(f('stor.png'), Buffer.from(stor.split(',')[1], 'base64'));

/* kort video med bevegelse og lyd (tale), tatt opp med MediaRecorder */
const tale = fs.readFileSync(f('tale.wav')).toString('base64');
const video = await p.evaluate(async wav => {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d');
  const ac = new AudioContext(), buf = await ac.decodeAudioData(Uint8Array.from(atob(wav), ch => ch.charCodeAt(0)).buffer);
  const src = ac.createBufferSource(); src.buffer = buf; const dst = ac.createMediaStreamDestination(); src.connect(dst);
  const st = new MediaStream([...c.captureStream(30).getTracks(), ...dst.stream.getTracks()]);
  const rec = new MediaRecorder(st, { mimeType: 'video/webm;codecs=vp8,opus' }), biter = [];
  rec.ondataavailable = e => biter.push(e.data);
  const ferdig = new Promise(r => { rec.onstop = r; });
  rec.start(); src.start(); const t0 = performance.now();
  await new Promise(r => { const tegn = () => { const t = (performance.now() - t0) / 1000; g.fillStyle = `hsl(${t * 60 % 360},60%,40%)`; g.fillRect(0, 0, 640, 360); g.fillStyle = '#fff'; g.font = 'bold 48px Arial'; g.fillText('Testvideo ' + t.toFixed(1), 60 + 40 * Math.sin(t), 200); if (t < Math.min(6, buf.duration + 0.5)) requestAnimationFrame(tegn); else r(); }; tegn(); });
  rec.stop(); await ferdig;
  const b = new Blob(biter, { type: 'video/webm' }), a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s);
}, tale);
fs.writeFileSync(f('video.webm'), Buffer.from(video, 'base64'));
await br.close();
for (const n of fs.readdirSync(DIR).filter(n => n !== 'lag.mjs')) console.log(n.padEnd(14), (fs.statSync(f(n)).size / 1024).toFixed(0) + ' KB');
