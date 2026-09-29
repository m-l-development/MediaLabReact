import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LEGACY = path.join(ROOT, 'src/legacy');        // felles skript og motorer (uendrede filer)
const ORIGINAL = path.join(ROOT, 'legacy-dc');       // originalsidene med dc-runtime, bare for sammenligning
const PUBLIC = path.join(ROOT, 'public');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const CSP = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value.replace(/;\s*upgrade-insecure-requests/, ''); } catch { return ''; } })();

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

/* Bare i dev/preview (testene): /_original/<fil> gir originalsiden fra legacy-dc/, og filene den ber om
   (skript, bilder) hentes fra legacy-dc/, src/legacy/ eller public/. Ingenting av dette blir med i dist/. */
function originals() {
  const find = p => [ORIGINAL, LEGACY, PUBLIC].map(d => path.join(d, p)).find(f => f.startsWith(path.dirname(f)) && fs.existsSync(f) && fs.statSync(f).isFile());
  const serve = (req, res, next) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return next(); }
    const orig = p.startsWith('/_original/');
    /* React-sidene får samme CSP som på Vercel (uten upgrade-insecure-requests, som krever https), så testene
       avslører alt som ville blitt blokkert. Originalene trenger den gamle, løsere CSP-en og får ingen. */
    if (!orig && CSP) res.setHeader('Content-Security-Policy', CSP);
    if (orig) p = p.slice('/_original'.length);
    else if (p === '/' || /^\/(@|src\/|node_modules\/|api\/|assets\/)/.test(p) || PAGES.includes(p.slice(1)) || fs.existsSync(path.join(PUBLIC, p))) return next();
    if (p.includes('..')) return next();
    const f = find(p); if (!f) return next();
    res.setHeader('Content-Type', TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  };
  return { name: 'media-lab-originals', configureServer: s => { s.middlewares.use(serve); }, configurePreviewServer: s => { s.middlewares.use(serve); } };
}

export default defineConfig({
  plugins: [react(), originals()],
  appType: 'mpa',
  publicDir: 'public',
  resolve: { alias: { '@ml': LEGACY } },
  server: { port: 5173 },
  preview: { port: 4174 },
  build: {
    outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500,
    rollupOptions: { input: Object.fromEntries(PAGES.map(f => [f.replace(/(\.dc)?\.html$/, ''), path.join(ROOT, f)])) },
  },
});
