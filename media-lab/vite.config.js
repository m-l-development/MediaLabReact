import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
/* samme CSP lokalt som på Vercel (uten upgrade-insecure-requests, som krever https), så det som ville blitt blokkert, vises med en gang */
const CSP = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value.replace(/;\s*upgrade-insecure-requests/, ''); } catch { return ''; } })();
const csp = () => {
  const add = s => { s.middlewares.use((req, res, next) => { if (CSP) res.setHeader('Content-Security-Policy', CSP); next(); }); };
  return { name: 'media-lab-csp', configureServer: add, configurePreviewServer: add };
};

/* public/images/mockups/index.json lages fra bildene i mappen ved hvert bygg (også på Vercel);
   filen skrives bare når listen endres, så git ikke får nye tidsstempler for ingenting */
const mockupIndex = () => ({
  name: 'media-lab-mockup-index', apply: 'build',
  buildStart() {
    const dir = path.join(PUBLIC, 'images/mockups'), out = path.join(dir, 'index.json');
    const files = fs.readdirSync(dir)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f) && /^[\w .()\-æøåÆØÅ]+$/.test(f))
      .filter(f => fs.statSync(path.join(dir, f)).size <= 25 * 1048576)
      .map(f => 'images/mockups/' + f) // adressen på nettsiden (public/ er roten)
      .sort((a, b) => a.localeCompare(b, 'nb'));
    let old = null; try { old = JSON.parse(fs.readFileSync(out, 'utf8')).files; } catch {}
    if (JSON.stringify(old) !== JSON.stringify(files)) fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), files }, null, 1) + '\n');
    console.log('images/mockups/index.json: ' + files.length + ' bilder');
  },
});

/* versjonsnummer per bygg: bakes inn som __ML_BUILD__ og skrives til dist/version.json (src/shared/ml-update.js sammenligner dem) */
const buildVersion = () => {
  let id = 'dev';
  return {
    name: 'media-lab-version',
    config(_, { command }) {
      if (command === 'build') id = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 10) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return { define: { __ML_BUILD__: JSON.stringify(id) } };
    },
    generateBundle() { if (id !== 'dev') this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: id }) + '\n' }); },
  };
};

export default defineConfig({
  plugins: [react(), csp(), mockupIndex(), buildVersion()],
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
