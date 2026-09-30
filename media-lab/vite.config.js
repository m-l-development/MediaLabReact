import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
/* samme CSP lokalt som på Vercel (uten upgrade-insecure-requests, som krever https), så det som ville blitt blokkert, vises med en gang */
const CSP = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value.replace(/;\s*upgrade-insecure-requests/, ''); } catch { return ''; } })();
const csp = () => {
  const add = s => { s.middlewares.use((req, res, next) => { if (CSP) res.setHeader('Content-Security-Policy', CSP); next(); }); };
  return { name: 'media-lab-csp', configureServer: add, configurePreviewServer: add };
};

export default defineConfig({
  plugins: [react(), csp()],
  appType: 'mpa',
  publicDir: 'public',
  resolve: { alias: { '@ml': path.join(ROOT, 'src/legacy') } },
  server: { port: 5173 },
  preview: { port: 4174 },
  build: {
    outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500,
    rollupOptions: { input: Object.fromEntries(PAGES.map(f => [f.replace(/(\.dc)?\.html$/, ''), path.join(ROOT, f)])) },
  },
});
