// Lager public/images/mockups/index.json fra bildene i public/images/mockups/ ved deploy på Vercel.
import { readdirSync, writeFileSync, statSync } from 'node:fs';
const dir = 'public/images/mockups';
const files = readdirSync(dir)
  .filter(f => /\.(jpe?g|png|webp)$/i.test(f) && /^[\w .()\-æøåÆØÅ]+$/.test(f))
  .filter(f => statSync(dir + '/' + f).size <= 25 * 1048576)
  .map(f => 'images/mockups/' + f) // adressen på nettsiden (public/ er roten)
  .sort((a, b) => a.localeCompare(b, 'nb'));
writeFileSync(dir + '/index.json', JSON.stringify({ generated: new Date().toISOString(), files }, null, 1) + '\n');
console.log('images/mockups/index.json: ' + files.length + ' bilder');
