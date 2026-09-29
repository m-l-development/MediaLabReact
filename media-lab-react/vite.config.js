import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ML = path.resolve(ROOT, '../media-lab');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

/* Filer som ikke er migrert ennå (bilder, manifest, andre verktøy som .dc.html) hentes fra media-lab/ */
function legacyFiles() {
  const serve = (req, res, next) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return next(); }
    if (p === '/' || /^\/(@|src\/|node_modules\/|api\/)/.test(p) || PAGES.includes(p.slice(1))) return next();
    const f = path.join(ML, p);
    if (!f.startsWith(ML + path.sep) || f.includes(`${path.sep}node_modules${path.sep}`)) return next();
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) return next();
      res.setHeader('Content-Type', TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(f).pipe(res);
    });
  };
  return { name: 'media-lab-legacy', configureServer: s => { s.middlewares.use(serve); }, configurePreviewServer: s => { s.middlewares.use(serve); } };
}

export default defineConfig({
  plugins: [react(), legacyFiles()],
  appType: 'mpa',
  publicDir: false,
  resolve: { alias: { '@ml': ML } },
  server: { port: 5173, fs: { allow: [ROOT, ML] } },
  preview: { port: 4174 },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: Object.fromEntries(PAGES.map(f => [f.replace(/\.html$/, ''), path.join(ROOT, f)])) } },
});
