// Gjør de 100 Photo Design-malene i originalmaterialet om til maler i appen (docs/maler-og-fonter.md, fase 5).
//
//   1. Start utviklingsserveren uten backend:  ML_TEST_NO_BACKEND=1 npx vite --port 5181 --strictPort   (i web/)
//   2. node tools/maler/convert-photos.mjs [--cmp <mappe>] [NUMMER …]                                  (i web/)
//
// Leser tools/maler/photo-originaler.html og docs/maler-katalog.json, skriver
// src/features/photo-design/engine/templates/photos.json. Med --cmp sammenlignes hver mal piksel for piksel med
// originalen (Photo-motoren mot Chromium; bildefelt utenom), og side-om-side-bilder skrives til mappen.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '../..')
const BASE = process.env.ML_BASE ?? 'http://localhost:5181'
const OUT = path.join(WEB, 'src/features/photo-design/engine/templates/photos.json')
const catalog = JSON.parse(fs.readFileSync(path.join(WEB, '../docs/maler-katalog.json'), 'utf8')).photo
const fonts = JSON.parse(fs.readFileSync(path.join(WEB, 'src/shared/fonts/catalog.json'), 'utf8'))
const args = process.argv.slice(2)
const ci = args.indexOf('--cmp')
const cmpDir = ci >= 0 ? args[ci + 1] : null
const only = args.filter((a, i) => !a.startsWith('--') && (ci < 0 || i !== ci + 1))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()) })
for (let i = 0; ; i++) {
  await page.goto(`${BASE}/app/tools/maler/photo-originaler.html`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  if (await page.evaluate(() => !!document.querySelector('.tpl')).catch(() => false)) break
  if (i > 4) throw new Error('originalene kunne ikke lastes')
}
const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tpl *')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')))])
const missing = []
for (const fam of used) {
  const f = fonts.find((x) => x.name.toLowerCase() === fam.toLowerCase())
  if (f) await page.addStyleTag({ url: f.css })
  else missing.push(fam)
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
const t = Date.now()
await page.addScriptTag({ type: 'module', content: `
  import { convertOne } from '/app/tools/maler/dom-to-layers.js?t=${t}'
  import { mapDoc } from '/app/tools/maler/photo-map.js?t=${t}'
  import { render, docFonts } from '/app/src/features/photo-design/engine/render.ts'
  window.__convert = (num, o) => {
    const sec = document.querySelector('.tpl[data-id="' + num + '"]')
    const st = sec.firstElementChild
    const r = st.getBoundingClientRect()
    const td = convertOne(sec, { K: 1, fieldSel: '.ph', noUnder: true, person: o.person, code: num })
    const m = mapDoc(td, r.width, r.height, { grain: st.classList.contains('grain'), grunge: 1, gray: o.gray })
    return { w: Math.round(r.width), h: Math.round(r.height), ...m }
  }
  window.__cmp = async (num, doc, origB64, outW) => {
    await docFonts(doc)
    const k = Math.min(1, 800 / Math.max(doc.w, doc.h))
    const W = Math.round(doc.w * k), H = Math.round(doc.h * k)
    const app = document.createElement('canvas'); app.width = W; app.height = H
    render(app.getContext('2d'), doc, k, { media: new Map(), masks: new Map() }, { noPh: true, full: true })
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + origB64)).blob())
    const o = document.createElement('canvas'); o.width = W; o.height = H
    o.getContext('2d').drawImage(bmp, 0, 0, W, H)
    const m = document.createElement('canvas'); m.width = W; m.height = H
    const mg = m.getContext('2d'); mg.fillStyle = '#fff'
    for (const l of doc.layers) if (l.type === 'image') { mg.save(); mg.translate(l.x * k, l.y * k); mg.rotate((l.rot || 0) * Math.PI / 180); mg.fillRect(-l.w / 2 * k - 3, -l.h / 2 * k - 3, l.w * k + 6, l.h * k + 6); mg.restore() }
    const A = o.getContext('2d').getImageData(0, 0, W, H).data, B = app.getContext('2d').getImageData(0, 0, W, H).data, Mk = mg.getImageData(0, 0, W, H).data
    const d = document.createElement('canvas'); d.width = W; d.height = H
    const dg = d.getContext('2d'); const D = dg.createImageData(W, H)
    let sum = 0, n = 0, bad = 0
    for (let i = 0; i < A.length; i += 4) {
      if (Mk[i + 3] > 0) { D.data[i + 2] = 90; D.data[i + 3] = 255; continue }
      const e = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3
      sum += e; n++; if (e > 48) bad++
      D.data[i] = Math.min(255, e * 3); D.data[i + 1] = Math.min(255, e); D.data[i + 3] = 255
    }
    dg.putImageData(D, 0, 0)
    let png = null
    if (outW) {
      const s = document.createElement('canvas'); const sh = Math.round(outW * H / W); s.width = outW * 3; s.height = sh
      const sg = s.getContext('2d'); sg.drawImage(o, 0, 0, outW, sh); sg.drawImage(app, outW, 0, outW, sh); sg.drawImage(d, outW * 2, 0, outW, sh)
      png = s.toDataURL('image/png').split(',')[1]
    }
    return { mean: sum / Math.max(1, n), bad: bad / Math.max(1, n), png }
  }
  window.__ready = true` })
await page.waitForFunction(() => window.__ready === true)

const out = []
const rows = []
const nums = await page.evaluate(() => [...document.querySelectorAll('.tpl')].map((s) => s.dataset.id))
if (cmpDir) fs.mkdirSync(cmpDir, { recursive: true })
for (const num of nums) {
  if (only.length && !only.includes(num)) continue
  const meta = catalog.find((x) => x.id === num)
  const spec = meta?.spec ?? {}
  const person = /utklipt|silhuett/i.test(spec.Bildefelt ?? '')
  const gray = /grayscale|svart-hvitt|\bS\/H\b|gråtone/i.test(`${spec.Bildefelt ?? ''} ${spec.Effekter ?? ''}`)
  const m = await page.evaluate(({ num, person, gray }) => window.__convert(num, { person, gray }), { num, person, gray })
  const doc = { id: 'tpl-' + num, name: meta?.name ?? num, w: m.w, h: m.h, bg: m.bg, layers: m.layers, created: 0, updated: 0, tplK: 'lib:' + num }
  out.push({ id: num, name: meta?.name ?? num, cat: meta?.cat ?? '', format: meta?.format ?? '', doc })
  if (cmpDir) {
    const orig = (await page.locator(`.tpl[data-id="${num}"] > .t`).screenshot()).toString('base64')
    const r = await page.evaluate(({ num, doc, orig }) => window.__cmp(num, doc, orig, 360), { num, doc, orig })
    if (r.png) fs.writeFileSync(path.join(cmpDir, `${num}.png`), Buffer.from(r.png, 'base64'))
    rows.push({ num, name: doc.name, mean: r.mean, bad: r.bad })
  }
}
await browser.close()
if (!only.length) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out, (_k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)) + '\n')
  console.log(`${out.length} maler → ${path.relative(WEB, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
}
if (rows.length) {
  rows.sort((a, b) => b.bad - a.bad)
  for (const r of rows.slice(0, 25)) console.log(`${r.num} ${(r.bad * 100).toFixed(2).padStart(6)} %  snitt ${r.mean.toFixed(2).padStart(5)}  ${r.name}`)
  console.log(`${rows.filter((r) => r.bad < 0.02).length} av ${rows.length} under 2 %, ${rows.filter((r) => r.bad < 0.05).length} under 5 %, snitt ${(rows.reduce((a, r) => a + r.bad, 0) / rows.length * 100).toFixed(2)} %`)
  fs.writeFileSync(path.join(cmpDir, 'rapport.json'), JSON.stringify(rows, null, 1))
}
if (missing.length) console.log('Fonter som ikke finnes i biblioteket:', missing.join(', '))
if (errors.length) console.log('Feil/advarsler:\n' + [...new Set(errors)].slice(0, 20).join('\n'))
