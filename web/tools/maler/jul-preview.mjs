// Oversiktsbilde av julemalene slik de er tegnet i kildefilen (før konverteringen), med appens egne fonter.
//   ML_BASE=http://127.0.0.1:5173 node tools/maler/jul-preview.mjs <ut.png> [JUL-01,JUL-02 …]     (utviklingsserveren må kjøre)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BASE = process.env.ML_BASE ?? 'http://localhost:5181'
const [out, list] = process.argv.slice(2)
const fonts = JSON.parse(fs.readFileSync(path.join(WEB, 'src/shared/fonts/catalog.json'), 'utf8'))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2400, height: 1400 } })
await page.goto(`${BASE}/app/tools/maler/jul-originaler.html`, { waitUntil: 'networkidle' })
const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tpl *')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')))])
for (const fam of used) {
  const f = fonts.find((x) => x.name.toLowerCase() === fam.toLowerCase())
  if (f) await page.addStyleTag({ url: f.css })
  else console.log('mangler font:', fam)
}
await page.evaluate(async (only) => {
  const keep = only ? only.split(',') : null
  const secs = [...document.querySelectorAll('.tpl')].filter((s) => !keep || keep.includes(s.dataset.code))
  const grid = document.createElement('div')
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,576px);gap:12px;padding:12px;background:#222'
  for (const s of secs) {
    const cell = document.createElement('div')
    cell.style.cssText = 'width:576px;height:324px;overflow:hidden;position:relative'
    s.style.cssText += ';transform:scale(.45);transform-origin:0 0;margin:0'
    cell.appendChild(s)
    const tag = document.createElement('div')
    tag.textContent = s.dataset.code
    tag.style.cssText = 'position:absolute;left:4px;top:4px;font:700 12px monospace;color:#fff;background:#000a;padding:2px 4px'
    cell.appendChild(tag)
    grid.appendChild(cell)
  }
  document.body.replaceChildren(grid)
  for (const e of document.querySelectorAll('*')) if (e.textContent.trim()) void document.fonts.load(`${getComputedStyle(e).fontWeight} 40px ${getComputedStyle(e).fontFamily}`)
  await document.fonts.ready
}, list ?? null)
await page.waitForTimeout(800)
await page.locator('body > div').screenshot({ path: out })
await browser.close()
console.log('→', out)
