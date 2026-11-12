// Gjør de 151 Thumbnail-malene i originalmaterialet om til maler i appen (docs/maler-og-fonter.md, fase 3).
//
//   1. Start utviklingsserveren uten backend:  ML_TEST_NO_BACKEND=1 npx vite --port 5181 --strictPort   (i web/)
//   2. node tools/maler/convert-thumbs.mjs                                                             (i web/)
//
// Leser  tools/maler/thumbnail-originaler.html  (flatene fra materialet), docs/maler-katalog.json (navn, kategori,
// spesifikasjon) og tools/maler/bildefelt.json (bildefelt som er tegnet som illustrasjon i materialet).
// Skriver src/features/thumbnail-studio/engine/templates/thumbs.json. Målingen gjøres i Chromium med de samme
// selvdrevne fontene som appen bruker.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { cleanFilters, newFilter } from '../../src/features/thumbnail-studio/engine/filters.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '../..')
const BASE = process.env.ML_BASE ?? 'http://localhost:5181'
const OUT = path.join(WEB, 'src/features/thumbnail-studio/engine/templates/thumbs.json')
const catalog = JSON.parse(fs.readFileSync(path.join(WEB, '../docs/maler-katalog.json'), 'utf8')).thumbs
const fonts = JSON.parse(fs.readFileSync(path.join(WEB, 'src/shared/fonts/catalog.json'), 'utf8'))
const fields = JSON.parse(fs.readFileSync(path.join(HERE, 'bildefelt.json'), 'utf8'))
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))

/** Bildefiltrene i spesifikasjonens «Overlay» (delen «Foto: F07 Uskarp 8px + F04 Fargelag #E0601E, color 60 %»). */
function specFilters(overlay) {
  const seg = String(overlay || '').split(' · ')[0] ?? ''
  const i = seg.indexOf(':')
  if (i < 0) return []
  const out = []
  for (const part of seg.slice(i + 1).split(/\s\+\s/)) {
    const m = /\b(F\d\d)\b(.*)$/.exec(part.trim())
    if (!m) continue
    const id = m[1]
    const rest = m[2]
    const p = {}
    const pct = /(\d+(?:[.,]\d+)?)\s*%/.exec(rest)
    const px = /(\d+(?:[.,]\d+)?)\s*px/.exec(rest)
    const hex = [...rest.matchAll(/#[0-9a-f]{6}\b/gi)].map((x) => x[0].toLowerCase())
    const v = pct ? parseFloat(pct[1].replace(',', '.')) / 100 : null
    if (id === 'F04') {
      if (hex.length) p.color = hex
      const bl = /\b(color|multiply|soft-light)\b/.exec(rest)
      if (bl) p.blend = bl[1]
      if (v != null) p.str = v
    } else if (id === 'F07') {
      if (px) p.blur = parseFloat(px[1])
    } else if (id === 'F10') {
      if (v != null) p.str = v
      if (/multiply/.test(rest)) p.blend = 'multiply'
    } else if (id === 'F02') {
      if (/høyre/i.test(rest)) p.dir = 'right'
      if (v != null) p.str = v
    } else if (['F01', 'F03', 'F09', 'F11', 'F12', 'F13'].includes(id)) {
      if (v != null) p.str = v
      if (id === 'F09' && hex[0]) p.color = hex[0]
      if (id === 'F11' && hex[0]) p.color = hex[0]
    } else if (id === 'F05' && hex.length >= 2) {
      p.dark = hex[0]
      p.light = hex[1]
    }
    out.push({ id, p })
  }
  return out
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const warnings = []
page.on('console', (m) => {
  if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text())
})
// Vite kan laste siden på nytt rett etter start (avhengigheter optimaliseres): vent til den står stille
for (let i = 0; ; i++) {
  await page.goto(`${BASE}/app/tools/maler/thumbnail-originaler.html`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  if (await page.evaluate(() => document.readyState === 'complete' && !!document.querySelector('.tpl')).catch(() => false)) break
  if (i > 4) throw new Error('originalene kunne ikke lastes')
}
// fontene malene bruker, fra appens egne filer
const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tpl *')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')))])
const missing = []
for (const fam of used) {
  const f = fonts.find((x) => x.name.toLowerCase() === fam.toLowerCase())
  if (!f) {
    missing.push(fam)
    continue
  }
  await page.addStyleTag({ url: f.css })
}
await page.evaluate(async () => {
  const combos = new Set()
  for (const e of document.querySelectorAll('.tpl *')) {
    if (!e.textContent.trim()) continue
    const cs = getComputedStyle(e)
    combos.add(`${cs.fontStyle === 'normal' ? '' : 'italic '}${cs.fontWeight} ${cs.fontStretch} 40px ${cs.fontFamily}`)
  }
  await Promise.all([...combos].map((c) => document.fonts.load(c, 'ÆØÅ æøå Hg').catch(() => null)))
  await document.fonts.ready
})
await page.addScriptTag({ type: 'module', content: `import { convertOne } from '/app/tools/maler/dom-to-layers.js?t=${Date.now()}'; window.__convert = convertOne; window.__ready = true` })
await page.waitForFunction(() => window.__ready === true)

const out = []
const fakeItalic = []
const codes = await page.evaluate(() => [...document.querySelectorAll('.tpl')].map((s) => s.dataset.code))
for (const code of codes) {
  if (only.length && !only.includes(code)) continue
  const meta = catalog.find((t) => t.code === code)
  const f = fields[code] ?? {}
  const doc = await page.evaluate(({ code, f, person }) => window.__convert(document.querySelector(`.tpl[data-code="${code}"]`), { code, fields: f.fields, skip: f.skip, full: f.full, person }), { code, f, person: /utklipt|silhuett/i.test(meta?.spec?.Bilde ?? '') })
  const fl = specFilters(meta?.spec?.Overlay)
  const imgs = doc.layers.filter((l) => l.type === 'image')
  imgs.forEach((l, n) => {
    // motorens egne standardverdier for parametere materialet ikke oppgir, og verdiene innenfor grensene
    const list = cleanFilters(fl.map((x) => newFilter(x.id, { ...x.p, ...(Array.isArray(x.p.color) ? { color: x.p.color[n % x.p.color.length] } : {}) })))
    if (list?.length) l.filters = list
    delete l._label
  })
  // ingen kunstig kursiv: fonter uten ekte kursiv tegnes rett (avvik fra originalen, se docs/maler-og-fonter.md)
  for (const l of doc.layers) {
    const fe = fonts.find((x) => x.name === l.font)
    if (l.type === 'text' && l.italic && !(fe?.italic || fe?.snitt?.i)) {
      delete l.italic
      fakeItalic.push(`${code}: ${l.font}`)
    }
  }
  out.push({ id: meta?.id ?? code.toLowerCase(), code, part: meta?.part ?? 0, cat: meta?.cat ?? '', name: meta?.name ?? code, desc: meta?.desc ?? '', doc })
}
await browser.close()
if (!only.length) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n')
  console.log(`${out.length} maler → ${path.relative(WEB, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
} else console.log(JSON.stringify(out, null, 1))
if (fakeItalic.length) console.log('Kursiv tatt bort (fonten har ingen ekte kursiv):', [...new Set(fakeItalic)].join(', '))
if (missing.length) console.log('Fonter som ikke finnes i biblioteket:', missing.join(', '))
if (warnings.length) console.log('Advarsler:\n' + [...new Set(warnings)].join('\n'))
