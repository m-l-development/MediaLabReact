import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSupabaseEnv, scanText, SCAN_EXT } from './build/env-guard.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/* ConnectHub: bare to navngitte offentlige verdier legges inn i koden (__CH_BACKEND__). Vite sin automatiske
   eksponering av miljøvariabler låses med et prefiks ingen variabel bruker, så verken VITE_- eller integrasjonsvariabler
   kan lekke. Etter bygging søkes dist/ for hemmelighetsmønstre. Reglene og tester: build/env-guard.js. */
const connecthubEnv = () => {
  let target = 'local', outDir = 'dist', building = false;
  return {
    name: 'connecthub-env',
    config(_, { mode, command }) {
      building = command === 'build';
      const r = resolveSupabaseEnv({ ...loadEnv(mode, ROOT, ''), ...process.env });
      target = r.target;
      r.warnings.forEach(w => console.warn('\x1b[33m' + w + '\x1b[0m'));
      if (r.public) console.log(`ConnectHub-backend: ${r.public.ref} (${r.target})`);
      return { envPrefix: 'CONNECTHUB_NEVER_EXPOSED_', define: { __CH_BACKEND__: JSON.stringify(r.public) } };
    },
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const dir = path.resolve(ROOT, outDir); if (!building || !fs.existsSync(dir)) return;
      const hits = [], walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else if (SCAN_EXT.test(e.name)) scanText(fs.readFileSync(p, 'utf8'), { target }).forEach(f => hits.push(path.relative(dir, p) + ': ' + f));
      });
      walk(dir);
      if (hits.length) throw new Error('ConnectHub: mulige hemmeligheter i bygget – bygget stoppes:\n' + hits.join('\n'));
      console.log('ConnectHub: sikkerhetssøk i bygget – ingen funn.');
    },
  };
};
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

/* Selvreparasjon: Vercel sender «immutable» også på 404 under /assets/. Får nettleseren en 404 like mens en ny versjon
   publiseres, husker den feilen og siden blir svart. Feiler en fil under /assets/, hentes alle sidens filer på nytt forbi
   cachen og siden lastes én gang til. Flagget i sessionStorage hindrer løkker; mountPage (dc.jsx) fjerner det når siden har startet. */
const HEAL = `(function(){var K='medialab.heal',d=false;function heal(){if(d)return;d=true;try{if(sessionStorage.getItem(K))return;sessionStorage.setItem(K,'1')}catch(e){return}
var u=[].map.call(document.querySelectorAll('script[type=module][src],link[rel=modulepreload][href],link[rel=stylesheet][href*="/assets/"]'),function(e){return e.src||e.href});
Promise.all(u.map(function(x){return fetch(x,{cache:'reload',credentials:'same-origin'}).catch(function(){})})).then(function(){location.reload()})}
addEventListener('error',function(e){var t=e.target;if(t&&t!==window&&(t.tagName==='SCRIPT'||t.tagName==='LINK')&&/\\/assets\\//.test(t.src||t.href||''))heal()},true);
addEventListener('vite:preloadError',function(e){e.preventDefault();heal()})})();`;
const selfHeal = () => ({ name: 'media-lab-self-heal', apply: 'build', transformIndexHtml: () => [{ tag: 'script', children: HEAL, injectTo: 'head-prepend' }] });

/* ConnectHub-API-et lokalt (vite dev/preview), med samme kode som på Vercel (server/handlers/ch.js).
   Den hemmelige nøkkelen leses BARE fra skallets miljø (CONNECTHUB_SUPABASE_SECRET_KEY), aldri fra .env-filer.
   CH_TEST_MAILBOX (bare lokalt, for tester): invitasjonslenker skrives til denne filen i stedet for å sendes på e-post. */
const chApiLocal = () => {
  const add = s => { s.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/api/ch')) return next();
    try {
      const { handle } = await import('./server/handlers/ch.js');
      const fileEnv = loadEnv('development', ROOT, 'CONNECTHUB_'); delete fileEnv.CONNECTHUB_SUPABASE_SECRET_KEY;
      const env = { ...fileEnv, ...process.env }; delete env.VERCEL_ENV;
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request('http://' + req.headers.host + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      const deps = process.env.CH_TEST_MAILBOX ? { deliver: async (email, link) => { fs.appendFileSync(process.env.CH_TEST_MAILBOX, JSON.stringify({ email, link }) + '\n'); return { kind: 'test' }; } } : {};
      const r = await handle(request, env, deps);
      res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.statusCode = 500; res.end('{"ok":false,"error":"local_api"}'); }
  }); };
  return { name: 'connecthub-api-local', configureServer: add, configurePreviewServer: add };
};

export default defineConfig({
  plugins: [react(), csp(), mockupIndex(), buildVersion(), selfHeal(), connecthubEnv(), chApiLocal()],
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
