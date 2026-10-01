/* Røyktest av statisk hosting (P9): serverer dist/ med en vanlig Node-server og headerne fra vercel.json, uten Vercel.
   Viser at bygget er vanlige statiske filer som kan flyttes til enhver vert (nginx, Netlify, Cloudflare Pages, S3 + CDN).
   NB: uten Vercel kjører verken middleware.js (sperren foran sidene) eller api/. Innlogging håndheves da av porten i
   nettleseren og av RLS; en ny vert må koble server/lib/gate.js og server/handlers/ch.js inn i sine tilsvarende mekanismer.
   Bruk: node build/static-serve.mjs [port]   (standard 4180) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DIST = path.join(ROOT, 'dist');
const RULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers.map(h => ({ re: new RegExp('^' + h.source + '$'), headers: h.headers }));
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2', wasm: 'application/wasm', gz: 'application/gzip', webmanifest: 'application/manifest+json', txt: 'text/plain', md: 'text/plain' };

export function serve(port = 4180) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x'); let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(DIST, p));
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('404'); }
    for (const r of RULES) if (r.re.test(p)) for (const h of r.headers) res.setHeader(h.key, h.key === 'Content-Security-Policy' ? h.value.replace(/;\s*upgrade-insecure-requests/, '') : h.value);
    res.setHeader('content-type', TYPES[p.split('.').pop()] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }).listen(port);
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('build', 'static-serve.mjs'))) {
  const port = Number(process.argv[2]) || 4180; serve(port);
  console.log('Statisk server for dist/ på http://localhost:' + port + ' (headere fra vercel.json)');
}
