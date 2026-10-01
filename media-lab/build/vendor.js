/* Lokale kopier av tredjeparts nettleserfiler og fonter (P8). Ingen skript eller fonter hentes fra CDN ved kjøring.
   Ved bygging hentes nøyaktig fastsatte pakkeversjoner fra npm-registeret (`npm pack`, som npm kontrollerer mot registerets
   integritet), og bare filene nettleseren trenger kopieres til dist/vendor/ og dist/fonts/. Alle utfiler kontrolleres mot
   build/vendor-lock.json (SHA-384) – avvik stopper bygget. Ny versjon: endre listen og kjør `npm run vendor:lock`.
   Modeller (Hugging Face) og brukerdata hentes fortsatt ved bruk; det er data, ikke kode, og står i CSP connect-src. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const PACKAGES = [
  { spec: '@huggingface/transformers@3.5.1', dir: 'transformers-3.5.1', files: ['dist/transformers.min.js', 'dist/ort-wasm-simd-threaded.jsep.mjs', 'dist/ort-wasm-simd-threaded.jsep.wasm', 'LICENSE'] },
  { spec: 'tesseract.js@5.1.1', dir: 'tesseract-5.1.1', files: ['dist/tesseract.min.js', 'dist/worker.min.js', 'LICENSE.md'] },
  { spec: 'tesseract.js-core@5.1.1', dir: 'tesseract-core-5.1.1', files: ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'LICENSE'] },
  { spec: '@tesseract.js-data/nor@1.0.0', dir: 'tessdata', files: [['4.0.0_best_int/nor.traineddata.gz', 'nor.traineddata.gz']] },
  { spec: 'mp4-muxer@5.1.3', dir: 'mp4-muxer-5.1.3', files: ['build/mp4-muxer.js', 'LICENSE'] },
  { spec: 'qrcode-generator@1.4.4', dir: 'qrcode-generator-1.4.4', files: ['qrcode.js', 'LICENSE'] },
];
export const FONTS = [
  { spec: '@fontsource-variable/archivo@5.3.0', css: ['wdth.css', 'wdth-italic.css'], family: 'Archivo', slug: 'archivo' },
  { spec: '@fontsource-variable/montserrat@5.3.0', css: ['wght.css', 'wght-italic.css'], family: 'Montserrat', slug: 'montserrat' },
  { spec: '@fontsource-variable/league-spartan@5.3.0', css: ['wght.css'], family: 'League Spartan', slug: 'league-spartan' },
  { spec: '@fontsource-variable/oswald@5.3.0', css: ['wght.css'], family: 'Oswald', slug: 'oswald' },
  { spec: '@fontsource-variable/playfair-display@5.3.0', css: ['wght.css', 'wght-italic.css'], family: 'Playfair Display', slug: 'playfair-display' },
  { spec: '@fontsource-variable/space-grotesk@5.3.0', css: ['wght.css'], family: 'Space Grotesk', slug: 'space-grotesk' },
  { spec: '@fontsource/bebas-neue@5.3.0', css: ['400.css'], family: 'Bebas Neue', slug: 'bebas-neue' },
  { spec: '@fontsource/anton@5.3.0', css: ['400.css'], family: 'Anton', slug: 'anton' },
  { spec: '@fontsource/dm-serif-display@5.3.0', css: ['400.css'], family: 'DM Serif Display', slug: 'dm-serif-display' },
];
const SUBSET = /-(latin|latin-ext)-[a-z0-9-]+\.woff2$/;

const sha384 = buf => 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
const win = process.platform === 'win32';

function fetchPkg(spec, cache) {
  const dir = path.join(cache, spec.replace(/[@/]/g, '_'));
  if (fs.existsSync(path.join(dir, 'package', 'package.json'))) return path.join(dir, 'package');
  fs.mkdirSync(dir, { recursive: true });
  const out = execFileSync(win ? 'npm.cmd' : 'npm', ['pack', spec, '--silent', '--pack-destination', dir], { encoding: 'utf8', shell: win }).trim().split(/\r?\n/).pop();
  execFileSync('tar', ['-xzf', out], { cwd: dir });
  return path.join(dir, 'package');
}

/* Parser Fontsource-CSS: beholder latin/latin-ext, gir vanlig familienavn og peker på /fonts/<fil>. */
export function fontCss(css, family) {
  const out = [], files = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1], url = (body.match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1];
    if (!url || !SUBSET.test(url)) continue;
    const keep = body.split(';').map(s => s.trim()).filter(Boolean).filter(s => !/^(font-family|src)\s*:/.test(s));
    out.push('@font-face{font-family:\'' + family + '\';' + keep.join(';') + ';src:url(/fonts/' + url + ') format(\'woff2\')}');
    files.push(url);
  }
  return { css: out.join('\n') + '\n', files };
}

/* Lager alle filer i outDir (vendor/ og fonts/). Returnerer { relPath: Buffer }. */
export function build(cache) {
  const files = {};
  for (const p of PACKAGES) {
    const root = fetchPkg(p.spec, cache);
    for (const f of p.files) {
      const [src, dst] = Array.isArray(f) ? f : [f, path.basename(f)];
      if (/^LICENSE/.test(dst) && !fs.existsSync(path.join(root, src))) continue;   /* noen pakker har lisensen bare i filhodet */
      files['vendor/' + p.dir + '/' + dst] = fs.readFileSync(path.join(root, src));
    }
  }
  const all = [];
  for (const f of FONTS) {
    const root = fetchPkg(f.spec, cache); let css = '';
    for (const c of f.css) {
      const r = fontCss(fs.readFileSync(path.join(root, c), 'utf8'), f.family); css += r.css;
      for (const w of r.files) files['fonts/' + w] = fs.readFileSync(path.join(root, 'files', w));
    }
    files['fonts/' + f.slug + '.css'] = Buffer.from(css); all.push(css);
    files['fonts/LICENSE-' + f.slug + '.txt'] = fs.readFileSync(path.join(root, 'LICENSE'));
  }
  files['fonts/fonts.css'] = Buffer.from('/* Selvdrevne fonter (OFL-1.1, se LICENSE-*.txt). Generert av build/vendor.js. */\n' + all.join(''));
  return files;
}

export function lockOf(files) { return Object.fromEntries(Object.keys(files).sort().map(k => [k, sha384(files[k])])); }

/* Kontroll mot låsen. Returnerer liste over avvik (tom = ok). */
export function verify(files, lock) {
  const bad = [];
  for (const [k, buf] of Object.entries(files)) if (lock[k] !== sha384(buf)) bad.push(k + (lock[k] ? ' (endret)' : ' (ikke i låsen)'));
  for (const k of Object.keys(lock)) if (!files[k]) bad.push(k + ' (mangler)');
  return bad;
}

export function writeOut(files, outDir) {
  for (const [k, buf] of Object.entries(files)) { const p = path.join(outDir, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); }
}

/* CLI: node build/vendor.js --lock  (skriver build/vendor-lock.json etter gjennomgang) */
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  const files = build(path.join(ROOT, 'node_modules', '.ch-vendor'));
  if (process.argv.includes('--lock')) { fs.writeFileSync(path.join(ROOT, 'build', 'vendor-lock.json'), JSON.stringify(lockOf(files), null, 1) + '\n'); console.log('vendor-lock.json skrevet (' + Object.keys(files).length + ' filer)'); }
  else { const bad = verify(files, JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'vendor-lock.json'), 'utf8'))); console.log(bad.length ? 'AVVIK:\n' + bad.join('\n') : 'Alle ' + Object.keys(files).length + ' filer stemmer med låsen.'); process.exitCode = bad.length ? 1 : 0; }
}
