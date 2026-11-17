/**
 * Lager fontlisten til fontpopupen (web/src/components/fontpicker/fonts.json) i formatet fra
 * fontpopup/eksempel/fonts.eksempel.json, fra fontene appen har i dag (web/src/shared/fonts/catalog.json).
 *
 * - navn = familienavnet i @font-face (samme som katalogen og stilarkene bruker)
 * - stiler = snittene fonten faktisk har (katalogens «snitt», lest fra fontfilene av fonts-gen.mjs)
 * - css = stilarket relativt til base "/" (katalogen har "/fonts/x.css" → "fonts/x.css", aldri dobbel /)
 * - kategorier = fontvelgerens 12 kategorier, avledet av katalogens bruksområder og stil
 * - fonter med bredde-akse som går til 125 % får i tillegg en «Expanded»-variant (bredde 125) under «Bred og kvadratisk»
 * - iMalene = fonten brukes i appens maler; anbefalt = fontene verktøyene i dag viser øverst
 * - Helvetica (systemfont, brukt av Loop Studio) er med uten css (lastes ikke, finnes i systemet)
 *
 * Kjør: node web/tools/fontpopup-fonts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const cat = JSON.parse(fs.readFileSync(path.join(WEB, 'src/shared/fonts/catalog.json'), 'utf8'))
const OUT = path.join(WEB, 'src/components/fontpicker/fonts.json')
const FONTS_DIR = path.join(WEB, '..', 'media-lab', 'dist', 'fonts')

const KATEGORIER = ['Titler', 'Bred og kvadratisk', 'Brødtekst', 'Logo', 'Elegant', 'Sitat', 'Håndskrift', 'Retro', 'Effekt', 'Moro', 'Teknisk', 'Skilt']
const USE_CAT = { T: 'Titler', L: 'Logo', S: 'Skilt', B: 'Brødtekst', U: 'Brødtekst', V: 'Sitat', E: 'Elegant', F: 'Moro', K: 'Teknisk', R: 'Retro' }
const STYLE_CAT = { script: 'Håndskrift', eff: 'Effekt', dek: 'Effekt', retro: 'Retro', tek: 'Teknisk', mono: 'Teknisk' }
const STYLE_NAME = { sans: 'Sans-serif', mod: 'Moderne / grotesk', disp: 'Display', rund: 'Rund / vennlig', serif: 'Serif', script: 'Håndskrift', dek: 'Dekorativ', retro: 'Retro', eff: 'Effekt', tek: 'Teknisk', mono: 'Monospace' }
const FALLBACK = { sans: 'system-ui, sans-serif', mod: 'system-ui, sans-serif', disp: 'Impact, sans-serif', rund: 'system-ui, sans-serif', serif: 'Georgia, serif', script: 'cursive', dek: 'sans-serif', retro: 'sans-serif', eff: 'sans-serif', tek: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' }
const CAT_WORDS = {
  Titler: 'tittel titler overskrift thumbnail youtube stor fet headline',
  'Bred og kvadratisk': 'bred bredt wide extended expanded kvadratisk firkantet square',
  Brødtekst: 'brødtekst tekst lesbar undertekst video ui body',
  Logo: 'logo merkevare brand',
  Elegant: 'elegant invitasjon bryllup luksus fin',
  Sitat: 'sitat bibelvers vers bibel quote',
  Håndskrift: 'håndskrift skrift script kalligrafi pensel signatur',
  Retro: 'retro vintage gammel 70 80 neon western',
  Effekt: 'effekt dekorativ tema spesiell',
  Moro: 'moro barn fest gøy lek tegneserie',
  Teknisk: 'teknisk gaming futuristisk kode mono',
  Skilt: 'skilt plakat poster sjablong',
}

// fontene verktøyene i dag viser øverst (Photo/Motion FONTS, Loop Studio fontTop)
const TOP = new Set(['Archivo', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'League Spartan', 'Playfair Display', 'DM Serif Display', 'Space Grotesk'])

// fonter brukt i malene (alle verktøyene)
const used = new Set()
const scan = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) scan(p)
    else if (/\.(ts|json|js)$/.test(e.name) && !/\.test\./.test(e.name)) {
      const t = fs.readFileSync(p, 'utf8')
      for (const m of t.matchAll(/["']?font["']?\s*:\s*["']([^"']+)["']/g)) used.add(m[1])
    }
  }
}
for (const f of ['thumbnail-studio/engine', 'photo-design/engine', 'motion-design/engine', 'loop-studio/engine']) scan(path.join(WEB, 'src/features', f))

/** Bredde-aksen fra stilarket (font-stretch: 62% 125%), eller null. */
function widthAxis(css) {
  const file = path.join(FONTS_DIR, path.basename(css))
  if (!fs.existsSync(file)) return null
  const m = /font-stretch\s*:\s*([\d.]+)%\s+([\d.]+)%/.exec(fs.readFileSync(file, 'utf8'))
  return m ? [+m[1], +m[2]] : null
}

const fonter = []
for (const f of cat) {
  const kat = new Set()
  for (const u of f.uses) if (USE_CAT[u]) kat.add(USE_CAT[u])
  if (STYLE_CAT[f.style]) kat.add(STYLE_CAT[f.style])
  if (!kat.size) kat.add('Brødtekst')
  const kategorier = KATEGORIER.filter((k) => kat.has(k))
  const base = {
    id: f.id,
    navn: f.name,
    familie: `'${f.name}', ${FALLBACK[f.style] ?? 'sans-serif'}`,
    stil: STYLE_NAME[f.style] ?? 'Sans-serif',
    kategorier,
    anbefalt: TOP.has(f.name),
    iMalene: used.has(f.name),
    status: 'klar',
    css: f.css.replace(/^\/+/, ''),
    stiler: { regular: !!f.snitt.r, bold: !!f.snitt.b, italic: !!f.snitt.i, boldItalic: !!f.snitt.bi },
    variabel: !!f.variable,
    ...(f.variable && f.weights?.length ? { vekter: `${Math.min(...f.weights)}-${Math.max(...f.weights)}` } : {}),
    lisens: f.license,
    sok: [f.name.toLowerCase(), (STYLE_NAME[f.style] ?? '').toLowerCase(), ...kategorier.map((k) => CAT_WORDS[k])].join(' '),
    harAeOeAa: !f.noAeoa,
  }
  fonter.push(base)
  const ax = widthAxis(f.css)
  if (ax && ax[1] >= 125) {
    const kw = ['Bred og kvadratisk', ...kategorier.filter((k) => k !== 'Bred og kvadratisk')]
    fonter.push({
      ...base,
      id: `${f.id}-expanded`,
      navn: f.name,
      familie: base.familie,
      kategorier: kw,
      anbefalt: false,
      iMalene: false,
      sok: `${base.sok} ${CAT_WORDS['Bred og kvadratisk']} ${f.name.toLowerCase()} expanded (bredde 125)`,
      bredde: 125,
      stil: 'Bred – Expanded 125 %',
      bredder: `${ax[0]}% ${ax[1]}%`,
    })
  }
}
fonter.push({
  id: 'helvetica', navn: 'Helvetica', familie: 'Helvetica, Arial, sans-serif', stil: 'Systemfont', kategorier: ['Titler', 'Brødtekst', 'Logo'],
  anbefalt: false, iMalene: used.has('Helvetica'), status: 'klar',
  stiler: { regular: true, bold: true, italic: true, boldItalic: true }, variabel: false, lisens: 'System',
  sok: 'helvetica arial system sans-serif ' + CAT_WORDS.Brødtekst, harAeOeAa: true,
})

fs.writeFileSync(OUT, JSON.stringify({ versjon: 1, kategorier: KATEGORIER, fonter }, null, 2) + '\n')
const exp = fonter.filter((f) => f.bredde).map((f) => f.id)
console.log(`${fonter.length} fonter (${exp.length} Expanded: ${exp.join(', ')}) → ${path.relative(WEB, OUT)}`)
for (const k of KATEGORIER) console.log(k.padEnd(20), fonter.filter((f) => f.kategorier.includes(k)).length)
