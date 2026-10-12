/* Bygger den nye appen (../web) inn i dist/app, så Vercel publiserer begge fra media-lab (samme domene, samme innlogging).
   Kjøres etter `vite build` (package.json «build»). Samme miljø (VERCEL_ENV, nøkler ved navn) går videre til web-bygget,
   som bruker de samme byggesperrene (build/env-guard.js: riktig prosjekt per miljø, søk etter hemmeligheter i bygget).
   Mangler ../web (f.eks. fordi Vercel ikke tar med filer utenfor rotmappen), stopper bygget med en tydelig feil i stedet
   for å publisere stille uten /app/. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WEB = path.resolve(ROOT, '../web');
export const OUT = path.join(ROOT, 'dist', 'app');

export function plan(env = process.env) {
  if (!fs.existsSync(path.join(WEB, 'package.json'))) {
    return { error: 'Fant ikke ../web/package.json. Den nye appen (/app/) kan ikke bygges. På Vercel: slå på «Include files outside the root directory» for prosjektet.' };
  }
  const steps = [];
  if (!fs.existsSync(path.join(WEB, 'node_modules', 'vite'))) steps.push({ cmd: 'npm', args: ['ci', '--no-audit', '--no-fund'], cwd: WEB });
  steps.push({ cmd: 'npx', args: ['vite', 'build', '--outDir', OUT, '--emptyOutDir'], cwd: WEB });
  return { steps, env: { ...env, ML_TEST_NO_BACKEND: '' } };
}

if (process.argv.includes('--run')) {
  const p = plan();
  if (p.error) {
    console.error(`\x1b[31m${p.error}\x1b[0m`);
    process.exit(1);
  }
  for (const s of p.steps) {
    console.log(`web-app: ${s.cmd} ${s.args.join(' ')}`);
    execFileSync(s.cmd, s.args, { cwd: s.cwd, env: p.env, stdio: 'inherit', shell: process.platform === 'win32' });
  }
  if (!fs.existsSync(path.join(OUT, 'index.html'))) {
    console.error('\x1b[31mweb-app: dist/app/index.html mangler etter bygging\x1b[0m');
    process.exit(1);
  }
  console.log('web-app: den nye appen er bygget til dist/app');
}
