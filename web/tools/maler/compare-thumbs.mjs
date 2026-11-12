// Sammenligner hver konverterte mal med originalen, piksel for piksel (docs/maler-og-fonter.md, fase 3).
// Originalen (HTML) tegnes av Chromium, malen av appens egen motor (engine/render.ts) i samme størrelse (1280 × 720).
// Bildefeltene holdes utenfor (der står plassholdere i materialet og brukerens bilde i appen).
//
//   (utviklingsserveren må kjøre, se convert-thumbs.mjs)
//   node tools/maler/compare-thumbs.mjs [--out <mappe>] [KODE …]
//
// Skriver en rapport (avvik per mal) og, med --out, side-om-side-bilder (original | app | forskjell).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '../..')
const BASE = process.env.ML_BASE ?? 'http://localhost:5181'
const args = process.argv.slice(2)
const oi = args.indexOf('--out')
const outDir = oi >= 0 ? args[oi + 1] : null
const only = args.filter((a, i) => !a.startsWith('--') && (oi < 0 || i !== oi + 1))
const tpls = JSON.parse(fs.readFileSync(path.join(WEB, 'src/features/thumbnail-studio/engine/templates/thumbs.json'), 'utf8'))
const fonts = JSON.parse(fs.readFileSync(path.join(WEB, 'src/shared/fonts/catalog.json'), 'utf8'))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
// Vite kan laste siden på nytt rett etter start (avhengigheter optimaliseres): vent til den står stille
for (let i = 0; ; i++) {
  await page.goto(`${BASE}/app/tools/maler/thumbnail-originaler.html`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  if (await page.evaluate(() => document.readyState === 'complete' && !!document.querySelector('.tpl')).catch(() => false)) break
  if (i > 4) throw new Error('originalene kunne ikke lastes')
}
const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tpl *')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')))])
for (const fam of used) {
  const f = fonts.find((x) => x.name.toLowerCase() === fam.toLowerCase())
  if (f) await page.addStyleTag({ url: f.css })
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
await page.addScriptTag({
  type: 'module',
  content: `
    import { Renderer, ensureFonts } from '/app/src/features/thumbnail-studio/engine/render.ts'
    import { ImageCache } from '/app/src/features/thumbnail-studio/engine/images.ts'
    const r = new Renderer(new ImageCache(() => null))
    window.__draw = async (doc) => {
      await ensureFonts(doc)
      const c = document.createElement('canvas')
      c.width = 1280; c.height = 720
      r.render(c.getContext('2d'), doc, { s: 1280 / 1920, edit: false })
      return c
    }
    window.__cmp = async (origB64, doc, outW) => {
      const app = await window.__draw(doc)
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + origB64)).blob())
      const o = document.createElement('canvas'); o.width = 1280; o.height = 720
      o.getContext('2d').drawImage(bmp, 0, 0, 1280, 720)
      // maske: bildefeltene (deres omsluttende boks, rotert) holdes utenfor
      const m = document.createElement('canvas'); m.width = 1280; m.height = 720
      const mg = m.getContext('2d')
      mg.fillStyle = '#fff'
      const k = 1280 / 1920
      for (const l of doc.layers) {
        if (l.type !== 'image') continue
        mg.save(); mg.translate((l.x + l.w / 2) * k, (l.y + l.h / 2) * k); mg.rotate((l.rot || 0) * Math.PI / 180)
        mg.fillRect(-l.w / 2 * k - 4, -l.h / 2 * k - 4, l.w * k + 8, l.h * k + 8); mg.restore()
      }
      const A = o.getContext('2d').getImageData(0, 0, 1280, 720).data
      const B = app.getContext('2d').getImageData(0, 0, 1280, 720).data
      const Mk = mg.getImageData(0, 0, 1280, 720).data
      const d = document.createElement('canvas'); d.width = 1280; d.height = 720
      const dg = d.getContext('2d'); const D = dg.createImageData(1280, 720)
      let sum = 0, n = 0, bad = 0
      for (let i = 0; i < A.length; i += 4) {
        if (Mk[i + 3] > 0) { D.data[i] = 40; D.data[i + 1] = 40; D.data[i + 2] = 90; D.data[i + 3] = 255; continue }
        const e = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3
        sum += e; n++
        if (e > 48) bad++
        const v = Math.min(255, e * 3)
        D.data[i] = v; D.data[i + 1] = v * 0.3; D.data[i + 2] = 0; D.data[i + 3] = 255
      }
      dg.putImageData(D, 0, 0)
      let png = null
      if (outW) {
        const s = document.createElement('canvas'); s.width = outW * 3; s.height = Math.round(outW * 9 / 16)
        const sg = s.getContext('2d')
        sg.drawImage(o, 0, 0, outW, s.height); sg.drawImage(app, outW, 0, outW, s.height); sg.drawImage(d, outW * 2, 0, outW, s.height)
        png = s.toDataURL('image/png').split(',')[1]
      }
      return { mean: sum / Math.max(1, n), bad: bad / Math.max(1, n), png }
    }
    window.__ready = true`,
})
await page.waitForFunction(() => window.__ready === true)
if (outDir) fs.mkdirSync(outDir, { recursive: true })
const rows = []
for (const t of tpls) {
  if (only.length && !only.includes(t.code)) continue
  const orig = (await page.locator(`.tpl[data-code="${t.code}"] > div`).screenshot()).toString('base64')
  const r = await page.evaluate(({ o, d, w }) => window.__cmp(o, d, w), { o: orig, d: t.doc, w: outDir ? 640 : 0 })
  if (r.png) fs.writeFileSync(path.join(outDir, `${t.code}.png`), Buffer.from(r.png, 'base64'))
  rows.push({ code: t.code, name: t.name, mean: r.mean, bad: r.bad })
}
await browser.close()
rows.sort((a, b) => b.bad - a.bad)
const fmt = (r) => `${r.code.padEnd(8)} ${(r.bad * 100).toFixed(2).padStart(6)} %  snitt ${r.mean.toFixed(2).padStart(5)}  ${r.name}`
console.log('Avvik (andel piksler med tydelig forskjell, utenom bildefelt):')
for (const r of rows) console.log(fmt(r))
const ok = rows.filter((r) => r.bad < 0.02).length
console.log(`\n${ok} av ${rows.length} under 2 % avvik.`)
if (errors.length) console.log('Feil i siden:\n' + [...new Set(errors)].join('\n'))
fs.writeFileSync(path.join(outDir ?? HERE, 'rapport.json'), JSON.stringify(rows, null, 1))
