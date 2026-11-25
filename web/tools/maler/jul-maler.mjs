// Julemalene i Thumbnail Studio (2026-11-25): 20 maler i kategorien «Jul».
//   JUL-01–10: nye konsepter.  JUL-11–20: julevarianter som bygger på eksisterende maler i biblioteket (stil i spec).
//
//   node tools/maler/jul-maler.mjs          (i web/)  → tools/maler/jul-originaler.html + oppføringene i docs/maler-katalog.json
//   så: ML_TEST_NO_BACKEND=1 npx vite --port 5181 --strictPort  og  node tools/maler/convert-thumbs.mjs --src=jul --merge
//
// Samme format som originalmaterialet (1280 × 720, posisjonerte elementer, CSS og SVG): konverteringen gjør alt om til
// vanlige lag (tekst, form, bildefelt). Gjentatte detaljer (snø, stjerner, blader) er samlet i én sti per farge, så malene
// har få lag og er lette å redigere. Ingen bilder er bakt inn: bildefeltene fylles av brukeren.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '../..')

// ---------- hjelpere ----------
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const f1 = (n) => Math.round(n * 10) / 10
const circ = (cx, cy, r) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`
const starP = (cx, cy, R, r, n = 5, rot = -90) => {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180
    const k = i % 2 ? r : R
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * k)} ${f1(cy + Math.sin(a) * k)}`
  }
  return d + 'Z'
}
const leaf = (x1, y1, x2, y2, w) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1
  const nx = (-dy / L) * w, ny = (dx / L) * w
  return `M${f1(x1)} ${f1(y1)}Q${f1(mx + nx)} ${f1(my + ny)} ${f1(x2)} ${f1(y2)}Q${f1(mx - nx)} ${f1(my - ny)} ${f1(x1)} ${f1(y1)}Z`
}
const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}Z`
const flame = (cx, by, h) => `M${f1(cx)} ${f1(by - h)}C${f1(cx + h * 0.32)} ${f1(by - h * 0.45)} ${f1(cx + h * 0.36)} ${f1(by - h * 0.05)} ${f1(cx)} ${f1(by)}C${f1(cx - h * 0.36)} ${f1(by - h * 0.05)} ${f1(cx - h * 0.32)} ${f1(by - h * 0.45)} ${f1(cx)} ${f1(by - h)}Z`
/** Note (åttendedel) med hode, hals og fane. */
const note = (x, y, s) => `${circ(x, y, 6.5 * s)}${rect(x + 4.5 * s, y - 46 * s, 2.6 * s, 46 * s)}M${f1(x + 7 * s)} ${f1(y - 46 * s)}c${f1(10 * s)} ${f1(6 * s)} ${f1(16 * s)} ${f1(12 * s)} ${f1(12 * s)} ${f1(26 * s)}c${f1(-1 * s)} ${f1(-8 * s)} ${f1(-5 * s)} ${f1(-14 * s)} ${f1(-12 * s)} ${f1(-17 * s)}Z`
/** Gran (stilisert, tre etasjer) med stamme. */
const fir = (x, by, h) => {
  const w = h * 0.62
  let d = ''
  for (let i = 0; i < 3; i++) {
    const t = by - h * 0.12 - i * h * 0.27, ww = w * (1 - i * 0.24)
    d += `M${f1(x - ww / 2)} ${f1(t)}L${f1(x)} ${f1(t - h * 0.42)}L${f1(x + ww / 2)} ${f1(t)}Z`
  }
  return d + rect(x - h * 0.04, by - h * 0.13, h * 0.08, h * 0.13)
}
const snow = (n, W, H, r0, r1, y0 = 0) => { let d = ''; for (let i = 0; i < n; i++) d += circ(rnd() * W, y0 + rnd() * (H - y0), r0 + rnd() * (r1 - r0)); return d }
const svg = (box, vb, parts) => `<svg style="position:absolute;${box}" viewBox="0 0 ${vb[0]} ${vb[1]}">${parts.map(([d, fill, op]) => `<path d="${d}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`).join('')}</svg>`
const field = (style, label, bg = '#2a2420') => `<div style="position:absolute;${style};background:var(--ph),${bg};display:flex;align-items:center;justify-content:center"><span style="font:500 13px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.32)">Legg til bilde · ${label}</span></div>`
const fieldL = (style, label, bg) => `<div style="position:absolute;${style};background:var(--phd),${bg};display:flex;align-items:center;justify-content:center"><span style="font:500 13px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(0,0,0,.3)">Legg til bilde · ${label}</span></div>`
const div = (style, html = '') => `<div style="position:absolute;${style}">${html}</div>`
const grain = (op = 0.3, blend = 'overlay') => `<div style="position:absolute;inset:0;background-image:var(--grain);mix-blend-mode:${blend};opacity:${op};pointer-events:none"></div>`
const glow = (x, y, r, c) => div(`left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:radial-gradient(circle,${c},transparent 68%)`)

// ---------- adventskrans (brukes i JUL-01) ----------
function wreath(lit) {
  seed = 11
  // kransen sett skrått ovenfra: bakre blader bak lysene, fremre foran (to lag per tone)
  const back = ['', '', ''], front = ['', '', '']
  let berries = ''
  for (let i = 0; i < 130; i++) {
    const a = (i / 130) * Math.PI * 2 + rnd() * 0.06, rr = 160 + (rnd() - 0.5) * 44
    const x = 300 + Math.cos(a) * rr * 1.5, y = 235 + Math.sin(a) * rr * 0.36
    const b = a + 0.8 + rnd() * 0.7, L = 46 + rnd() * 26
    const p = leaf(x, y, x + Math.cos(b) * L, y + Math.sin(b) * L * 0.55, 10 + rnd() * 4);
    (Math.sin(a) > 0.15 ? front : back)[i % 3] += p
  }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.2; berries += circ(300 + Math.cos(a) * 238, 235 + Math.sin(a) * 58, 8) }
  const cx = [168, 256, 344, 432], heights = [150, 138, 126, 114]
  let candles = '', tops = '', flames = '', inner = ''
  cx.forEach((x, i) => {
    candles += rect(x - 22, 228 - heights[i], 44, heights[i])
    tops += `M${x - 22} ${228 - heights[i]}q22 10 44 0v8q-22 10 -44 0Z`
    if (i < lit) { flames += flame(x, 216 - heights[i], 46); inner += flame(x, 214 - heights[i], 24) }
  })
  const G = ['#1f3d26', '#2e5a36', '#4c7d48']
  return [...back.map((d, i) => [d, G[i]]), [candles, '#5b2a78'], [tops, '#7d44a0'], ...front.map((d, i) => [d, G[i]]), [berries, '#b3261e'], [flames, '#ffb547'], [inner, '#fff2c4']]
}

// ---------- malene ----------
const T = []
const add = (code, name, cat, desc, spec, bg, html) => T.push({ code, name, cat, desc, spec, bg, html })
const CAT = 'Jul'

// 01 Første søndag i advent – klassisk, lilla og gull, adventskrans med ett lys
add('JUL-01', 'Første søndag i advent', CAT, 'Adventskrans med det første lyset tent, lilla og gull', {
  Stil: 'Klassisk høytid', Fonter: 'Cinzel 600 · Cormorant Garamond 600 (104px) · Montserrat 500', Farger: '#24102f bakgrunn · #e9c98b gull · #f6eedd tekst',
  Bilde: 'Ingen (illustrert adventskrans)', Overlay: 'Ingen', Effekter: 'Varmt lys fra lyset, tynne gullstreker',
}, '#24102f', [
  div('inset:0;background:radial-gradient(ellipse 70% 80% at 50% 100%,#4a2161,#24102f 70%)'),
  glow(640, 520, 320, 'rgba(255,170,80,.22)'), glow(499, 372, 150, 'rgba(255,200,110,.55)'),
  div('left:0;right:0;top:64px;text-align:center;font:600 22px/1 \'Cinzel\',serif;letter-spacing:.42em;padding-left:.42em;color:#e9c98b', 'ADVENT · 2026'),
  div('left:540px;top:104px;width:200px;height:1px;background:#e9c98b'),
  div('left:0;right:0;top:132px;text-align:center;font:600 104px/1 \'Cormorant Garamond\',serif;color:#f6eedd', 'Første søndag i advent'),
  div('left:0;right:0;top:262px;text-align:center;font:500 26px/1 \'Montserrat\',sans-serif;letter-spacing:.08em;color:#e9c98b', 'Gudstjeneste kl. 11:00 · Velkommen'),
  svg('left:320px;top:330px;width:640px;height:341px', [600, 320], wreath(1)),
  grain(0.25),
])

// 02 Julekonsert – filmatisk, mørk med varme lyskuler, bildefelt for konsertfoto
seed = 21
add('JUL-02', 'Julekonsert', CAT, 'Elegant konsertplakat med varme lyskuler, noter og konsertfoto', {
  Stil: 'Filmatisk / elegant', Fonter: 'Great Vibes (86px) · Bodoni Moda 800 (128px) · Montserrat 500', Farger: '#0b0f1c bakgrunn · #e8c27a gull · #ffffff tekst',
  Bilde: 'Konsertfoto (kor, orkester eller instrument), høyre side, tones mot venstre', Overlay: 'Foto: F04 Fargelag #1a2a52, soft-light 35 %', Effekter: 'Uskarpe lyskuler, noter i gull',
}, '#0b0f1c', [
  field('left:560px;top:0;width:720px;height:720px', 'konsertfoto', '#1b2238'),
  div('left:520px;top:0;width:760px;height:720px;background:linear-gradient(90deg,#0b0f1c 0%,rgba(11,15,28,.85) 25%,rgba(11,15,28,0) 70%)'),
  glow(980, 160, 90, 'rgba(255,200,110,.55)'), glow(1150, 300, 60, 'rgba(255,170,80,.45)'), glow(860, 560, 110, 'rgba(255,210,140,.35)'), glow(1210, 620, 70, 'rgba(255,190,100,.4)'),
  svg('left:70px;top:72px;width:420px;height:120px', [420, 120], [[note(30, 90, 1.2) + note(110, 70, 1) + note(190, 96, 1.1) + note(300, 60, 0.9), '#e8c27a', 0.85]]),
  div('left:76px;top:212px;font:400 86px/1 \'Great Vibes\',cursive;color:#e8c27a', 'Velkommen til'),
  div('left:70px;top:300px;font:800 128px/1 \'Bodoni Moda\',serif;color:#ffffff;letter-spacing:-.01em', 'JULE-<br>KONSERT'),
  div('left:76px;top:576px;width:90px;height:3px;background:#e8c27a'),
  div('left:76px;top:602px;font:500 28px/1.3 \'Montserrat\',sans-serif;color:#f2efe8', 'Søndag 14. desember · kl. 19:00<br><span style="color:#e8c27a">Fri entré · Kollekt ved utgangen</span>'),
  grain(0.25),
])

// 03 Julekor – fotografisk, helflate, varmt lys, stor tittel nede til venstre
add('JUL-03', 'Julekor 2026', CAT, 'Helflatefoto av koret med varmt lys og stor tittel', {
  Stil: 'Fotografisk / varm', Fonter: 'DM Serif Display (190px) · Archivo 800 · Montserrat 600', Farger: '#140c08 · #ffcf86 · #ffffff',
  Bilde: 'Korfoto, hele flaten', Overlay: 'Foto: F04 Fargelag #c86a1e, soft-light 30 %', Effekter: 'Mørk toning nederst, varme lyskuler øverst',
}, '#140c08', [
  field('left:0;top:0;width:1280px;height:720px', 'korfoto', '#3a2618'),
  div('inset:0;background:linear-gradient(180deg,rgba(20,12,8,0) 30%,rgba(20,12,8,.92) 88%)'),
  glow(160, 60, 120, 'rgba(255,190,110,.45)'), glow(1100, 90, 150, 'rgba(255,170,90,.35)'),
  div('left:64px;top:404px;font:700 24px/1 \'Montserrat\',sans-serif;letter-spacing:.32em;color:#ffcf86', 'VI SYNGER JULEN INN'),
  div('left:56px;top:430px;font:400 190px/1 \'DM Serif Display\',serif;color:#ffffff', 'Julekor'),
  div('left:770px;top:470px;font:800 150px/1 \'Archivo\',sans-serif;color:transparent;-webkit-text-stroke:3px #ffcf86', '2026'),
  div('left:64px;top:640px;font:600 26px/1 \'Montserrat\',sans-serif;color:#ffffff', 'Øvelser hver torsdag kl. 18:30 · Alle er velkommen'),
])

// 04 Familiegudstjeneste – leken og inkluderende, rundt familiefoto, julepynt
seed = 41
add('JUL-04', 'Familiegudstjeneste', CAT, 'Leken og familievennlig, rundt familiefoto og julepynt', {
  Stil: 'Leken / familie', Fonter: 'Fredoka 700 (104px) · Nunito 800 · Nunito 700', Farger: '#fff4e6 bakgrunn · #c8102e rød · #0f5a3c grønn · #f2b632 gull',
  Bilde: 'Familiefoto, rund ramme', Overlay: 'Foto: ingen', Effekter: 'Julekuler, stjerner og stiplet bue',
}, '#fff4e6', [
  div('left:760px;top:60px;width:460px;height:460px;border-radius:50%;background:#c8102e'),
  fieldL('left:790px;top:90px;width:400px;height:400px;border-radius:50%', 'familie', '#e9d6bd'),
  svg('left:700px;top:0;width:580px;height:720px', [580, 720], [
    [circ(70, 420, 34) + circ(520, 600, 26), '#0f5a3c'], [circ(480, 560, 40) + circ(40, 90, 22), '#f2b632'],
    [rect(66, 340, 8, 46) + rect(476, 504, 8, 26), '#7a5a2a'], [starP(520, 70, 34, 14) + starP(120, 620, 26, 11) + starP(300, 660, 18, 8), '#f2b632'],
  ]),
  div('left:72px;top:96px;font:800 26px/1 \'Nunito\',sans-serif;letter-spacing:.2em;color:#0f5a3c', 'JUL FOR HELE FAMILIEN'),
  div('left:66px;top:140px;font:700 104px/.98 \'Fredoka\',sans-serif;color:#c8102e', 'Familie-<br>gudstjeneste'),
  div('left:72px;top:380px;font:700 34px/1.25 \'Nunito\',sans-serif;color:#2b2118', 'Søndag 14. desember kl. 11:00'),
  div('left:72px;top:450px;font:800 24px/1 \'Nunito\',sans-serif;color:#fff4e6;background:#0f5a3c;padding:16px 28px;border-radius:999px', 'Barnekor · Juleverksted · Kirkekaffe'),
  div('left:72px;top:560px;font:700 26px/1.3 \'Nunito\',sans-serif;color:#6b5b4a', 'Ta med store og små –<br>vi gleder oss til å se dere!'),
])

// 05 Julegudstjeneste – illustrert stjernenatt over Betlehem
seed = 51
add('JUL-05', 'Julegudstjeneste', CAT, 'Illustrert stjernenatt over Betlehem med stall og krybbe', {
  Stil: 'Illustrativ / klassisk', Fonter: 'Cinzel 600 (92px) · Cormorant Garamond 500 · Cinzel 600', Farger: '#081430 → #1d3466 himmel · #f6d27a stjerne · #f4efe2 tekst',
  Bilde: 'Ingen (illustrasjon)', Overlay: 'Ingen', Effekter: 'Betlehemsstjernen med stråler, stjernehimmel, by og stall i silhuett',
}, '#081430', [
  div('inset:0;background:linear-gradient(180deg,#060f26 0%,#12244c 55%,#2b3f72 100%)'),
  svg('left:0;top:0;width:1280px;height:460px', [1280, 460], [[snow(90, 1280, 460, 0.8, 2.2), '#ffffff', 0.8]]),
  glow(640, 120, 230, 'rgba(246,210,122,.45)'),
  svg('left:540px;top:20px;width:200px;height:200px', [200, 200], [[starP(100, 100, 96, 10, 4, -90), '#f6d27a', 0.55], [starP(100, 100, 52, 14, 8, -90), '#fff3c8']]),
  div('left:0;right:0;top:236px;text-align:center;font:600 22px/1 \'Cinzel\',serif;letter-spacing:.45em;padding-left:.45em;color:#f6d27a', 'JULAFTEN'),
  div('left:0;right:0;top:272px;text-align:center;font:600 92px/1 \'Cinzel\',serif;color:#f4efe2', 'Julegudstjeneste'),
  div('left:0;right:0;top:384px;text-align:center;font:500 34px/1 \'Cormorant Garamond\',serif;color:#e7e0cf', 'Onsdag 24. desember · kl. 14:00 og 16:00'),
  svg('left:0;top:470px;width:1280px;height:250px', [1280, 250], [
    ['M0 140L60 140L60 100L90 80L120 100L120 130L170 130L170 70L200 50L230 70L230 120L300 120L300 90L330 70L360 90L360 130L420 130L420 110L460 85L500 110L500 140L1280 140L1280 250L0 250Z', '#0b1636'],
    ['M780 160L780 96L880 40L980 96L980 160Z', '#0b1636'],
    ['M820 160L820 112L940 112L940 160Z', '#f6c76a', 0.9], ['M860 150q20 -16 40 0z', '#7a4a1e'],
    ['M0 170Q320 130 640 170T1280 160L1280 250L0 250Z', '#060d24'],
  ]),
  grain(0.2),
])

// 06 Vi synger julen inn – minimalistisk og elegant, notelinjer og lys
add('JUL-06', 'Vi synger julen inn', CAT, 'Minimalistisk og elegant med notelinjer og et levende lys', {
  Stil: 'Minimal / elegant', Fonter: 'Playfair Display 700 og kursiv 400 (110px) · Montserrat 600', Farger: '#f6f1e7 bakgrunn · #1f3b2d grønn · #b08a3e gull',
  Bilde: 'Ingen (illustrasjon)', Overlay: 'Ingen', Effekter: 'Fem notelinjer med noter, lys med flamme og glød',
}, '#f6f1e7', [
  svg('left:0;top:520px;width:1280px;height:120px', [1280, 120], [
    [rect(0, 10, 1280, 2) + rect(0, 32, 1280, 2) + rect(0, 54, 1280, 2) + rect(0, 76, 1280, 2) + rect(0, 98, 1280, 2), '#b08a3e', 0.6],
    [note(140, 76, 1.05) + note(250, 54, 1.05) + note(360, 98, 1.05) + note(470, 64, 1.05) + note(1120, 54, 1.05) + note(1210, 86, 1.05), '#1f3b2d'],
  ]),
  glow(1010, 250, 170, 'rgba(255,196,110,.42)'),
  svg('left:950px;top:170px;width:120px;height:330px', [120, 330], [[rect(32, 110, 56, 220), '#fbf8f1'], [rect(32, 110, 56, 220), '#d9cdb5', 0.35], [flame(60, 100, 70), '#f2a33a'], [flame(60, 96, 36), '#fff0c2'], [rect(58, 96, 4, 16), '#3b2a1a']]),
  div('left:96px;top:120px;font:600 24px/1 \'Montserrat\',sans-serif;letter-spacing:.3em;color:#b08a3e', 'ALLSANG I KIRKEN'),
  div('left:90px;top:162px;font:700 110px/1.02 \'Playfair Display\',serif;color:#1f3b2d', 'Vi synger<br><span style="font-style:italic;font-weight:400">julen inn</span>'),
  div('left:96px;top:420px;font:600 28px/1 \'Montserrat\',sans-serif;color:#1f3b2d', 'Søndag 21. desember · kl. 18:00'),
])

// 07 Juleavslutning – moderne, granbar og lysslynge
seed = 71
const bulbs = []
for (let i = 0; i <= 16; i++) { const x = 40 + i * 75; bulbs.push([x, 54 + Math.sin(i * 0.8) * 14 + (i % 2) * 18]) }
add('JUL-07', 'Juleavslutning', CAT, 'Moderne og hyggelig med granbar, lysslynge og pynt', {
  Stil: 'Moderne / varm', Fonter: 'Bricolage Grotesque 800 (150px) · Bricolage Grotesque 500 · 600', Farger: '#0f2a1e bakgrunn · #f5e6c8 tekst · #e04a3a rød · #f3c35a lys',
  Bilde: 'Ingen (illustrasjon)', Overlay: 'Ingen', Effekter: 'Lysslynge øverst, granbar i hjørnene, julekuler',
}, '#0f2a1e', [
  div('inset:0;background:radial-gradient(ellipse 80% 70% at 50% 40%,#1a3d2c,#0b1f16 80%)'),
  svg('left:0;top:0;width:1280px;height:140px', [1280, 140], [[bulbs.map(([x, y]) => rect(x - 1, y - 30, 2, 18)).join(''), '#2c4a38'], [bulbs.map(([x, y], i) => (i % 3 === 0 ? circ(x, y, 9) : '')).join(''), '#f3c35a'], [bulbs.map(([x, y], i) => (i % 3 === 1 ? circ(x, y, 9) : '')).join(''), '#e04a3a'], [bulbs.map(([x, y], i) => (i % 3 === 2 ? circ(x, y, 9) : '')).join(''), '#f5e6c8']]),
  (() => { let a = '', b = ''; for (let i = 0; i < 26; i++) { const t = i / 26, x = 1280 - t * 320, y = 720 - t * 60 - 10; a += leaf(x, y, x - 30 - rnd() * 30, y - 50 - rnd() * 30, 6); b += leaf(x, y, x - 50 - rnd() * 20, y + 10 + rnd() * 20, 6) } return svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[a, '#2f6b45'], [b, '#245a39'], [circ(1060, 640, 26) + circ(1170, 600, 20), '#e04a3a'], [circ(1110, 680, 18), '#f3c35a']]) })(),
  div('left:110px;top:200px;font:500 28px/1 \'Bricolage Grotesque\',sans-serif;color:#f3c35a', 'Velkommen til'),
  div('left:100px;top:240px;font:800 150px/.95 \'Bricolage Grotesque\',sans-serif;color:#f5e6c8;letter-spacing:-.03em', 'Juleavslutning'),
  div('left:110px;top:420px;font:600 32px/1 \'Bricolage Grotesque\',sans-serif;color:#f5e6c8', 'Torsdag 18. desember · kl. 18:00 · Menighetssalen'),
  div('left:110px;top:490px;font:600 24px/1 \'Bricolage Grotesque\',sans-serif;color:#0f2a1e;background:#f3c35a;padding:14px 26px;border-radius:999px', 'Gløgg · Pepperkaker · Allsang'),
])

// 08 Julemarked i kirken – innbydende, boder og snø i skumring
seed = 81
const stalls = (() => {
  const roofsR = [], roofsW = [], bodies = [], lights = []
  ;[[90, 230], [360, 250], [660, 230], [940, 250]].forEach(([x, w]) => {
    const y = 120
    for (let i = 0; i < 6; i++) (i % 2 ? roofsW : roofsR).push(`M${x + (i * w) / 6} ${y}L${x + ((i + 1) * w) / 6} ${y}L${x + ((i + 1) * w) / 6} ${y + 40}Q${x + ((i + 0.5) * w) / 6} ${y + 58} ${x + (i * w) / 6} ${y + 40}Z`)
    roofsR.push(`M${x - 10} ${y}L${x + w / 2} ${y - 60}L${x + w + 10} ${y}Z`)
    bodies.push(rect(x + 8, y + 40, w - 16, 150))
    for (let i = 0; i < 7; i++) lights.push(circ(x + 14 + (i * (w - 28)) / 6, y + 64, 5))
  })
  return [[bodies.join(''), '#3b2416'], [roofsR.join(''), '#b8312a'], [roofsW.join(''), '#f6ead6'], [lights.join(''), '#ffd27a']]
})()
add('JUL-08', 'Julemarked i kirken', CAT, 'Innbydende julemarked med boder, lys og snø i skumringen', {
  Stil: 'Illustrativ / varm', Fonter: 'Young Serif (120px) · Nunito 800 · Nunito 700', Farger: '#1d2a4a → #6b4a6e skumring · #f6ead6 tekst · #b8312a rød · #ffd27a lys',
  Bilde: 'Ingen (illustrasjon)', Overlay: 'Ingen', Effekter: 'Markedsboder med stripete tak og lysslynger, snøfall',
}, '#1d2a4a', [
  div('inset:0;background:linear-gradient(180deg,#16213f 0%,#3b3560 55%,#7a5470 100%)'),
  svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[snow(140, 1280, 720, 1.2, 3.6), '#ffffff', 0.75]]),
  div('left:0;right:0;top:56px;text-align:center;font:800 24px/1 \'Nunito\',sans-serif;letter-spacing:.32em;padding-left:.32em;color:#ffd27a', 'LØRDAG 6. DESEMBER · KL. 11–15'),
  div('left:0;right:0;top:94px;text-align:center;font:400 120px/1 \'Young Serif\',serif;color:#f6ead6', 'Julemarked i kirken'),
  div('left:0;right:0;top:232px;text-align:center;font:700 30px/1 \'Nunito\',sans-serif;color:#f6ead6', 'Håndverk · Julekaker · Lodd · Kafé'),
  svg('left:60px;top:400px;width:1160px;height:320px', [1240, 320], stalls),
  div('left:0;right:0;bottom:0;height:46px;background:#f2eee8'),
])

// 09 Julefortellingen – sterk, Maria, Josef og Jesusbarnet i krybben under stjernen
add('JUL-09', 'Julefortellingen', CAT, 'Maria, Josef og Jesusbarnet i krybben, i lyset fra stjernen', {
  Stil: 'Dramatisk / klassisk', Fonter: 'Cormorant Garamond 600 (112px) · Cormorant Garamond kursiv 500 · Cinzel 600', Farger: '#120b06 bakgrunn · #ffcf7a lys · #f5ead3 tekst',
  Bilde: 'Ingen (illustrasjon i silhuett)', Overlay: 'Ingen', Effekter: 'Lys fra krybben, buet stall, stjerne med stråle',
}, '#120b06', [
  div('inset:0;background:radial-gradient(ellipse 55% 75% at 50% 78%,#5a3412,#1b1008 60%,#0d0805 100%)'),
  glow(640, 560, 300, 'rgba(255,190,100,.42)'),
  div('left:630px;top:60px;width:20px;height:470px;background:linear-gradient(180deg,rgba(255,225,160,.5),rgba(255,225,160,0))'),
  svg('left:590px;top:20px;width:100px;height:100px', [100, 100], [[starP(50, 50, 48, 8, 4), '#ffe3a0'], [starP(50, 50, 24, 9, 8), '#fff6dc']]),
  svg('left:260px;top:300px;width:760px;height:420px', [760, 420], [
    ['M0 420L0 160L380 20L760 160L760 420L700 420L700 190L380 80L60 190L60 420Z', '#0a0604'],
    // Josef (stående med stav), Maria (knelende med slør), krybbe med barnet
    ['M150 420L160 250Q160 200 190 190Q175 165 186 140Q200 118 222 130Q240 145 228 172Q250 182 256 230L262 420Z' + rect(118, 150, 8, 270), '#0a0604'],
    ['M470 420L480 330Q470 270 520 250Q505 220 520 200Q545 180 565 205Q590 235 575 265Q610 290 615 350L640 420Z', '#0a0604'],
    ['M300 420L320 350L460 350L480 420L460 420L445 372L335 372L320 420Z' + 'M318 352Q390 330 462 352Z', '#0a0604'],
    [circ(370, 336, 15) + 'M345 346Q392 322 432 344L425 352Q390 340 350 354Z', '#ffe7b0'],
  ]),
  div('left:0;right:0;top:150px;text-align:center;font:600 20px/1 \'Cinzel\',serif;letter-spacing:.4em;padding-left:.4em;color:#ffcf7a', 'LUKAS 2'),
  div('left:0;right:0;top:182px;text-align:center;font:600 112px/1 \'Cormorant Garamond\',serif;color:#f5ead3', 'Julefortellingen'),
  div('left:250px;right:250px;top:310px;text-align:center;font:italic 500 30px/1.3 \'Cormorant Garamond\',serif;color:#e8d9bb', '«For i dag er det født dere en frelser i Davids by.»'),
  grain(0.3),
])

// 10 God jul fra menigheten – vinterlandskap, plass til menighetens navn
seed = 101
add('JUL-10', 'God jul fra menigheten', CAT, 'Julehilsen med vinterlandskap og plass til menighetens navn', {
  Stil: 'Klassisk-moderne / vinter', Fonter: 'Great Vibes (190px) · Cormorant Garamond 600 · Montserrat 600', Farger: '#0e2240 → #4a6e9a himmel · #ffffff snø · #f1d48a gull',
  Bilde: 'Ingen (illustrasjon)', Overlay: 'Ingen', Effekter: 'Snødekte åser, graner i silhuett, snøfall, månelys',
}, '#0e2240', [
  div('inset:0;background:linear-gradient(180deg,#0b1a33 0%,#1f3d66 50%,#5a7fae 100%)'),
  glow(1010, 150, 160, 'rgba(255,248,225,.5)'),
  svg('left:960px;top:100px;width:100px;height:100px', [100, 100], [[circ(50, 50, 44), '#fbf6e6']]),
  svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [
    [snow(120, 1280, 520, 1, 3.2), '#ffffff', 0.85],
    ['M0 560Q300 470 640 540T1280 500L1280 720L0 720Z', '#dfe9f5'],
    [fir(140, 560, 170) + fir(230, 575, 120) + fir(1110, 520, 190) + fir(1210, 530, 140) + fir(1030, 545, 110), '#123052'],
    ['M0 620Q420 560 800 640T1280 610L1280 720L0 720Z', '#ffffff'],
  ]),
  div('left:0;right:0;top:110px;text-align:center;font:400 190px/1 \'Great Vibes\',cursive;color:#ffffff;text-shadow:0 6px 30px rgba(0,0,0,.25)', 'God jul'),
  div('left:0;right:0;top:330px;text-align:center;font:600 46px/1 \'Cormorant Garamond\',serif;color:#f1d48a', 'fra oss i Menighetens navn'),
  div('left:0;right:0;top:396px;text-align:center;font:600 22px/1 \'Montserrat\',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#e6eef8', 'OG GODT NYTT ÅR'),
])

// ---------- 11–20: julevarianter av eksisterende maler ----------

// 11 ← GEN-10 Sveitsisk: rutenett, monotekst, stor Archivo-tittel; firkanten blir fire adventslys
add('JUL-11', 'Advent – sveitsisk', CAT, 'Bygger på GEN-10 Sveitsisk: fire adventsruter, ett lys til hver søndag', {
  Stil: 'Minimal (julevariant av GEN-10 Sveitsisk)', Fonter: 'JetBrains Mono 500 (22px) · Archivo 700 (138px)', Farger: '#f5f4f0 bakgrunn · #111111 tekst · #b3261e rød',
  Bilde: 'Bilde øverst til høyre (granbar, lys eller kirkerommet)', Overlay: 'Foto: ingen', Effekter: 'Strek under toppteksten, fire ruter (én fylt per søndag)',
}, '#f5f4f0', [
  div('left:80px;top:72px;right:80px;display:flex;justify-content:space-between;font:500 22px/1 \'JetBrains Mono\',monospace;color:#111', '<span>Advent 2026</span><span>Menigheten</span>'),
  div('left:80px;top:120px;right:80px;height:2px;background:#111'),
  fieldL('right:80px;top:170px;width:380px;height:250px', 'advent', '#d8d2c6'),
  div('left:72px;top:176px;font:500 22px/1 \'JetBrains Mono\',monospace;color:#b3261e', 'Første søndag i advent · kl. 11:00'),
  div('left:72px;bottom:70px;font:700 138px/.9 \'Archivo\',sans-serif;color:#111;letter-spacing:-.05em', 'Fire søndager.<br>Ett lys til.'),
  div('right:80px;bottom:80px;width:64px;height:64px;background:#b3261e'),
  div('right:164px;bottom:80px;width:64px;height:64px;border:3px solid #111;box-sizing:border-box'),
  div('right:248px;bottom:80px;width:64px;height:64px;border:3px solid #111;box-sizing:border-box'),
  div('right:332px;bottom:80px;width:64px;height:64px;border:3px solid #111;box-sizing:border-box'),
])

// 12 ← pro-24 Gospelkonsert (retro konsert): lyskjegle, sentrert Shrikhand, utvidet Archivo
add('JUL-12', 'Julekonsert – retro', CAT, 'Bygger på pro-24 Gospelkonsert: lyskjegle, «Jul» med retroskygge', {
  Stil: 'Retro / konsert (julevariant av pro-24)', Fonter: 'Hanken Grotesk 600 · Shrikhand (220px) · Archivo 900 utvidet', Farger: '#0d1f1a bakgrunn · #f5e3c0 tekst · #c8322b rød · #e9b949 gull',
  Bilde: 'Ingen', Overlay: 'Ingen', Effekter: 'Lyskjegle ovenfra, rødt og gyllent lys, korn 30 %',
}, '#0d1f1a', [
  div('inset:0;background:radial-gradient(ellipse 600px 500px at 50% 110%,#c8322b,transparent 70%),radial-gradient(ellipse 500px 400px at 50% -10%,#2f6b4f,transparent 70%),#0d1f1a'),
  div('left:240px;right:240px;top:-20px;height:760px;background:conic-gradient(from 160deg at 50% 0%,transparent 0deg,rgba(255,236,200,.18) 20deg,transparent 40deg);filter:blur(4px)'),
  div('left:0;right:0;top:120px;text-align:center;font:600 26px/1 \'Hanken Grotesk\',sans-serif;letter-spacing:.5em;padding-left:.5em;color:#e9b949', 'KORET OG ORKESTERET'),
  div('left:0;right:0;top:170px;text-align:center;font:400 220px/1 \'Shrikhand\',cursive;color:#f5e3c0;text-shadow:0 8px 0 #c8322b', 'Jule'),
  div('left:0;right:0;top:420px;text-align:center;font:900 70px/1 \'Archivo\',sans-serif;font-stretch:125%;letter-spacing:.2em;color:#f5e3c0;padding-left:.2em', 'KONSERT'),
  div('left:0;right:0;top:540px;text-align:center;font:600 30px/1 \'Hanken Grotesk\',sans-serif;color:#e9b949', 'Lørdag 13. desember · 19:00 · Billetter 150,-'),
  svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[starP(250, 260, 26, 9, 4) + starP(1030, 300, 20, 7, 4) + starP(1080, 200, 12, 4, 4) + starP(190, 380, 12, 4, 4), '#e9b949']]),
  grain(0.3),
])

// 13 ← bib-24 Pergament: dobbel ramme, fraktur-initial, to tekstspalter
add('JUL-13', 'Julegudstjeneste – pergament', CAT, 'Bygger på bib-24 Pergament: juleevangeliet med fraktur-initial', {
  Stil: 'Klassisk (julevariant av bib-24)', Fonter: 'Cormorant Garamond 600 (112px) · UnifrakturMaguntia (150px) · Cormorant Garamond 400/kursiv', Farger: '#efe3c8 pergament · #1f4a32 grønn · #7a2b1c rød · #2c2116 tekst',
  Bilde: 'Ingen', Overlay: 'Ingen', Effekter: 'Dobbel ramme, kristtornkvist i hjørnene, mørkere kanter',
}, '#EFE3C8', [
  div('inset:0;background:radial-gradient(ellipse at 50% 50%,#f4ead3,#d9c69c 95%)'),
  div('inset:40px;border:2px solid #1f4a32'),
  div('inset:50px;border:1px solid #7a2b1c'),
  (() => { let l = '', b = ''; for (const [x, y, s] of [[70, 70, 1], [1210, 70, -1], [70, 650, 1], [1210, 650, -1]]) { l += leaf(x, y, x + 46 * s, y - 14, 10) + leaf(x, y, x + 34 * s, y + 30 * (y < 360 ? 1 : -1), 10); b += circ(x + 8 * s, y + 4, 6) + circ(x + 18 * s, y + 10, 6) } return svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[l, '#1f4a32'], [b, '#b3261e']]) })(),
  div('left:0;right:0;top:92px;text-align:center;font:600 22px/1 \'Cormorant Garamond\',serif;letter-spacing:.5em;padding-left:.5em;color:#7A2B1C', 'LUKAS 2'),
  div('left:0;right:0;top:136px;text-align:center;font:600 112px/1 \'Cormorant Garamond\',serif;color:#2C2116', 'Et barn er født'),
  div('left:600px;top:282px;width:80px;height:2px;background:#7A2B1C'),
  div('left:110px;top:322px;font:700 150px/.8 \'UnifrakturMaguntia\',serif;color:#7A2B1C', 'D'),
  div('left:236px;top:332px;width:390px;font:400 29px/1.4 \'Cormorant Garamond\',serif;color:#2C2116', 'et skjedde i de dager at det gikk ut befaling fra keiser Augustus om at hele verden skulle innskrives i manntall.'),
  div('left:680px;top:332px;width:480px;font:400 29px/1.4 \'Cormorant Garamond\',serif;color:#2C2116', 'Og hun fødte sin sønn, den førstefødte, svøpte ham og la ham i en krybbe.'),
  div('left:0;right:0;top:598px;text-align:center;font:italic 500 32px/1 \'Cormorant Garamond\',serif;color:#7A2B1C', 'Julegudstjeneste · Julaften kl. 16:00'),
])

// 14 ← live-11 Scenelys: varmt scenelys ovenfra, fire sangere (bildefelt), publikum i silhuett
add('JUL-14', 'Julekor – scenelys', CAT, 'Bygger på live-11 Scenelys: koret i varmt lys, publikum i silhuett', {
  Stil: 'Moderne / konsert (julevariant av live-11)', Fonter: 'Hanken Grotesk 600 · Archivo 900 utvidet (124px)', Farger: '#0a0705 bakgrunn · #ffcf70 lys · #ffffff tekst · #c8322b rød',
  Bilde: 'Fire sangere, utklipt (PNG)', Overlay: 'Person: ingen', Effekter: 'Lysrampe øverst, publikum med hender i silhuett, stjerne',
}, '#0a0705', [
  div('left:-40px;right:-40px;top:-20px;height:90px;background:linear-gradient(90deg,#c8322b,#ffcf70,#c8322b);filter:blur(10px)'),
  div('left:0;right:0;top:0;height:520px;background:radial-gradient(ellipse 60% 70% at 50% 0,rgba(255,150,60,.55),rgba(0,0,0,0))'),
  ...[[190, 230, 230, 288, 92, 106, 69, 115, 104], [420, 250, 260, 325, 104, 120, 78, 130, 117], [690, 250, 260, 325, 104, 120, 78, 130, 117], [940, 230, 230, 288, 92, 106, 69, 115, 104]].map(([l, b, w, h, hw, hh, hl, bt, br]) =>
    div(`left:${l}px;bottom:${b}px;width:${w}px;height:${h}px`, `<div style="position:absolute;left:${hl}px;top:0;width:${hw}px;height:${hh}px;border-radius:50%;background:var(--ph),linear-gradient(#4a3424,#120c08)"></div><div style="position:absolute;left:0;right:0;top:${bt}px;bottom:0;border-radius:${br}px ${br}px 0 0;background:var(--ph),linear-gradient(#4a3424,#120c08)"></div>`)),
  div('left:-60px;right:-60px;top:500px;bottom:0;background:radial-gradient(circle at 30px 26px,#050302 18px,transparent 19px) 0 0/60px 160px repeat-x,radial-gradient(ellipse 30px 60px at 30px 100px,#050302 98%,transparent 100%) 0 0/60px 160px repeat-x,linear-gradient(transparent 100px,#050302 100px)'),
  div('left:0;right:0;top:90px;text-align:center;font:600 18px/1 \'Hanken Grotesk\',sans-serif;letter-spacing:.3em;color:rgba(255,255,255,.85)', 'BARNEKOR · UNGDOMSKOR · KIRKEKOR'),
  div('left:0;right:0;top:396px;text-align:center;font:900 124px/1 \'Archivo\',sans-serif;font-stretch:125%;color:#fff;letter-spacing:-.02em;text-shadow:0 0 40px rgba(255,180,90,.6)', 'JULEKOR'),
  svg('left:960px;top:376px;width:70px;height:70px', [70, 70], [[starP(35, 35, 35, 9, 4), '#ffcf70']]),
  div('left:0;right:0;top:530px;text-align:center;font:400 40px/1 \'Archivo\',sans-serif;font-stretch:125%;letter-spacing:.42em;color:#fff;padding-left:.42em', 'SYNGER JULEN INN'),
  div('left:0;right:0;top:610px;display:flex;justify-content:center', '<span style="font:700 26px/1 \'Hanken Grotesk\',sans-serif;color:#fff;border:2px solid #fff;border-radius:999px;padding:12px 28px">SØN 21. DES  |  18:00  |  KIRKEN</span>'),
  grain(0.4),
])

// 15 ← pro-04 Sol og sirkel: stor sirkel med rundt bilde, Unbounded-tittel, omrisset årstall, pille
add('JUL-15', 'Familiejul – sirkel', CAT, 'Bygger på pro-04 Sol og sirkel: familiegudstjeneste i rødt og grønt', {
  Stil: 'Leken / familie (julevariant av pro-04)', Fonter: 'Unbounded 900 (150px) · Unbounded 700', Farger: '#f8ecd8 bakgrunn · #c8102e rød · #14452f grønn',
  Bilde: 'Familie eller barn, rund ramme', Overlay: 'Foto: ingen', Effekter: 'Stjerner rundt sirkelen, omrisset årstall',
}, '#f8ecd8', [
  div('left:700px;top:60px;width:600px;height:600px;border-radius:50%;background:#c8102e'),
  field('left:780px;top:140px;width:440px;height:440px;border-radius:50%', 'familie', '#8e0b20'),
  svg('left:660px;top:20px;width:620px;height:680px', [620, 680], [[starP(600, 600, 24, 10) + starP(70, 600, 18, 7) + starP(560, 60, 18, 7), '#14452f']]),
  div('left:70px;top:120px;font:900 122px/.9 \'Unbounded\',sans-serif;color:#14452f;letter-spacing:-.04em', 'FAMILIE<br>JUL'),
  div('left:74px;top:390px;font:900 110px/1 \'Unbounded\',sans-serif;color:transparent;-webkit-text-stroke:3px #14452f;letter-spacing:-.02em', '2026'),
  div('left:74px;top:560px;font:700 28px/1 \'Unbounded\',sans-serif;color:#f8ecd8;background:#14452f;padding:18px 30px;border-radius:999px', 'SØN 14. DES KL 11'),
])

// 16 ← pro-11 Billett: rotert adgangskort med perforering, Archivo bred/smal
add('JUL-16', 'Julebord – billett', CAT, 'Bygger på pro-11 Billett: adgangskort til menighetens julebord', {
  Stil: 'Leken / retro (julevariant av pro-11)', Fonter: 'Space Mono 400 · Archivo 900 bred og smal (140px) · Hanken Grotesk 600', Farger: '#123b2a bakgrunn · #f3e9d6 billett · #b3261e rød · #1a1a1a tekst',
  Bilde: 'Ingen', Overlay: 'Ingen', Effekter: 'Billett rotert −3°, stiplet perforering, korn 40 %',
}, '#123b2a', [
  svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[snow(60, 1280, 720, 1, 3), '#f3e9d6', 0.35]]),
  div('left:160px;top:140px;width:960px;height:440px;transform:rotate(-3deg)', '<div style="position:absolute;inset:0;background:#f3e9d6;border-radius:20px"></div><div style="position:absolute;left:700px;top:30px;bottom:30px;border-left:4px dashed #123b2a"></div><div style="position:absolute;left:672px;top:-30px;width:60px;height:60px;border-radius:50%;background:#123b2a"></div><div style="position:absolute;left:672px;bottom:-30px;width:60px;height:60px;border-radius:50%;background:#123b2a"></div><div style="position:absolute;left:60px;top:50px;font:400 22px/1 \'Space Mono\',monospace;letter-spacing:.3em;color:#b3261e">ADGANGSKORT · NR 1224</div><div style="position:absolute;left:52px;top:90px;font:900 140px/1 \'Archivo\',sans-serif;font-stretch:125%;color:#1a1a1a;letter-spacing:-.03em">JULE</div><div style="position:absolute;left:56px;top:220px;font:900 140px/1 \'Archivo\',sans-serif;font-stretch:62%;color:#b3261e">BORD</div><div style="position:absolute;left:60px;top:370px;font:600 24px/1 \'Hanken Grotesk\',sans-serif;color:#1a1a1a">FREDAG 12. DESEMBER · KL 18:00 · MENIGHETSSALEN</div><div style="position:absolute;left:740px;right:20px;top:0;bottom:0;display:flex;align-items:center;justify-content:center"><span style="font:900 64px/1 \'Archivo\',sans-serif;color:#b3261e;transform:rotate(-90deg)">PÅMELDING</span></div>'),
  grain(0.4),
])

// 17 ← GEN-19 Magasinforside: masthead i Bodoni, person i midten, overskrifter på sidene, strekkode
add('JUL-17', 'Julehilsen – magasin', CAT, 'Bygger på GEN-19 Magasinforside: julenummer med pastorens julehilsen', {
  Stil: 'Redaksjonell (julevariant av GEN-19)', Fonter: 'Bodoni Moda 900 (200px) · Archivo 800 smal · Archivo 400 · JetBrains Mono 500', Farger: '#efe8dc bakgrunn · #b3261e rød · #1f4a32 grønn · #111111 tekst',
  Bilde: 'Person (pastor eller leder), utklipt (PNG)', Overlay: 'Person: ingen', Effekter: 'Strekkode, korn 25 % multiply, granbar ved mastheaden',
}, '#efe8dc', [
  div('left:0;right:0;top:20px;text-align:center;font:900 200px/1 \'Bodoni Moda\',serif;color:#b3261e;letter-spacing:-.03em', 'GOD JUL'),
  div('left:440px;bottom:0px;width:400px;height:500px', '<div style="position:absolute;left:120px;top:0;width:160px;height:184px;border-radius:50%;background:var(--ph),#2a2622"></div><div style="position:absolute;left:0;right:0;top:200px;bottom:0;border-radius:180px 180px 0 0;background:var(--ph),#2a2622"></div>'),
  div('left:70px;top:300px;font:800 48px/1 \'Archivo\',sans-serif;font-stretch:75%;color:#111', 'ET ÅR MED<br>TAKKNEMLIGHET'),
  div('left:70px;top:410px;font:400 24px/1.3 \'Archivo\',sans-serif;color:#111', 'Pastoren om julens<br>gode budskap'),
  div('right:70px;top:330px;text-align:right;font:800 48px/1 \'Archivo\',sans-serif;font-stretch:75%;color:#1f4a32', 'JULENS<br>PROGRAM'),
  div('left:70px;bottom:60px;font:500 20px/1 \'JetBrains Mono\',monospace;color:#b3261e', 'JULENUMMER · 2026'),
  div('right:70px;bottom:50px;width:140px;height:70px;background:#fff;padding:8px;box-sizing:border-box', '<div style="width:100%;height:100%;background:repeating-linear-gradient(90deg,#111 0 3px,#fff 3px 5px,#111 5px 6px,#fff 6px 10px)"></div>'),
  grain(0.25, 'multiply'),
])

// 18 ← live-14 Kalenderblokk: kalenderark med dato, Instrument Serif-tittel, liste med tider
add('JUL-18', 'Gudstjenester i julen', CAT, 'Bygger på live-14 Kalenderblokk: julens gudstjenester på ett ark', {
  Stil: 'Moderne / ren (julevariant av live-14)', Fonter: 'Hanken Grotesk 800 · Archivo 800 (300px) · Instrument Serif (128px) · Hanken Grotesk 400/700', Farger: '#ece7de bakgrunn · #b3261e rød · #1f4a32 grønn · #111111 tekst',
  Bilde: 'Ingen', Overlay: 'Ingen', Effekter: 'Kalenderark med skygge og hull, kvist på arket',
}, '#ece7de', [
  div('left:120px;top:100px;width:420px;height:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.15)', '<div style="height:130px;background:#b3261e;display:flex;align-items:center;justify-content:center;font:800 44px/1 \'Hanken Grotesk\',sans-serif;letter-spacing:.2em;color:#fff">JULAFTEN</div><div style="text-align:center;font:800 300px/1 \'Archivo\',sans-serif;color:#111;letter-spacing:-.05em;margin-top:10px">24</div><div style="text-align:center;font:600 30px/1 \'Hanken Grotesk\',sans-serif;letter-spacing:.3em;color:#777">DESEMBER</div>'),
  div('left:220px;top:118px;width:22px;height:22px;border-radius:50%;background:#ece7de'),
  div('left:418px;top:118px;width:22px;height:22px;border-radius:50%;background:#ece7de'),
  svg('left:430px;top:520px;width:140px;height:120px', [140, 120], [[leaf(20, 100, 90, 40, 12) + leaf(40, 90, 120, 80, 11) + leaf(30, 96, 70, 20, 10), '#1f4a32'], [circ(34, 98, 8) + circ(50, 104, 8) + circ(44, 88, 7), '#b3261e']]),
  div('left:620px;top:110px;font:400 128px/.9 \'Instrument Serif\',serif;color:#111;letter-spacing:-.02em', 'Gudstjenester<br>i julen'),
  div('left:630px;top:380px;display:flex;align-items:center;gap:12px;font:700 26px/1 \'Hanken Grotesk\',sans-serif;letter-spacing:.12em;color:#b3261e', '<span style="width:14px;height:14px;border-radius:50%;background:#b3261e"></span>VELKOMMEN'),
  div('left:630px;top:428px;font:400 30px/1.55 \'Hanken Grotesk\',sans-serif;color:#333', 'Julaften kl. 14:00 og 16:00<br>Første juledag kl. 11:00<br>Nyttårsaften kl. 23:00'),
])

// 19 ← GEN-16 Frostet glass: uskarpe fargeflekker, glasskort, sentrert tittel, roterte piller
add('JUL-19', 'Julemarked – frostet glass', CAT, 'Bygger på GEN-16 Frostet glass: julemarked i rødt, grønt og gull', {
  Stil: 'Moderne UI (julevariant av GEN-16)', Fonter: 'Bricolage Grotesque 800 (124px) · 600 · 400', Farger: '#0f1a14 bakgrunn · #c8322b · #2f8a5a · #e9b949 · #ffffff tekst',
  Bilde: 'Ingen', Overlay: 'Ingen', Effekter: 'Uskarpe fargeflekker, frostet glasskort, snø',
}, '#0f1a14', [
  div('left:60px;top:60px;width:520px;height:520px;border-radius:50%;background:#c8322b;filter:blur(80px)'),
  div('left:700px;top:-60px;width:520px;height:460px;border-radius:50%;background:#2f8a5a;filter:blur(90px);opacity:.8'),
  div('left:560px;top:360px;width:600px;height:420px;border-radius:50%;background:#e9b949;filter:blur(90px);opacity:.6'),
  svg('left:0;top:0;width:1280px;height:720px', [1280, 720], [[snow(80, 1280, 720, 1, 3), '#ffffff', 0.6]]),
  div('left:240px;top:150px;width:800px;height:420px;border-radius:36px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.35);backdrop-filter:blur(20px);box-sizing:border-box'),
  div('left:0;right:0;top:200px;display:flex;justify-content:center', '<span style="font:600 24px/1 \'Bricolage Grotesque\',sans-serif;color:#fff;border:1.5px solid rgba(255,255,255,.6);border-radius:999px;padding:12px 22px">LØRDAG 6. DES · KL 11–15</span>'),
  div('left:0;right:0;top:262px;text-align:center;font:800 124px/1 \'Bricolage Grotesque\',sans-serif;color:#fff;letter-spacing:-.04em', 'Julemarked'),
  div('left:0;right:0;top:410px;text-align:center;font:400 36px/1 \'Bricolage Grotesque\',sans-serif;color:#f4efe2', 'Håndverk, julekaker og kafé i kirken'),
  div('left:60px;top:70px;font:600 28px/1 \'Bricolage Grotesque\',sans-serif;color:#111;background:#fff;border-radius:999px;padding:16px 26px;transform:rotate(-6deg)', 'Lodd og tombola'),
  div('right:70px;top:600px;font:600 28px/1 \'Bricolage Grotesque\',sans-serif;color:#111;background:#fff;border-radius:999px;padding:16px 26px;transform:rotate(5deg)', 'Gratis inngang'),
  grain(0.3),
])

// 20 ← GEN-01 Markert ord: rutepapir, ord med markør, person i bue til høyre
add('JUL-20', 'Snart er det jul', CAT, 'Bygger på GEN-01 Markert ord: juleannonse med rød markør', {
  Stil: 'Moderne YouTube (julevariant av GEN-01)', Fonter: 'Archivo 600 (72px) · Archivo 900, stretch 78 % (150px) · Archivo 500', Farger: '#f1f0ec bakgrunn · #141414 tekst · #c8322b markør · #1f4a32 grønn',
  Bilde: 'Person, utklipt (PNG), 520×660, bue-topp', Overlay: 'Person: ingen', Effekter: 'Rutenett 64px, 6 % svart · markør rotert −2°, ujevne hjørner · stjerner',
}, '#f1f0ec', [
  div('left:0;top:0;width:1280px;height:720px;background-color:#f1f0ec;background-image:linear-gradient(rgba(0,0,0,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.06) 1px,transparent 1px);background-size:64px 64px'),
  fieldL('right:40px;bottom:0;width:520px;height:660px;border-radius:260px 260px 0 0', 'person', '#c9d6cc'),
  div('left:80px;top:200px;font:600 72px/1 \'Archivo\',sans-serif;color:#141414;letter-spacing:-.02em', 'Snart er det'),
  div('left:52px;top:310px;width:440px;height:120px;background:#c8322b;border-radius:46px 10px 56px 14px;transform:rotate(-2deg)'),
  div('left:80px;top:276px;font:900 150px/1.1 \'Archivo\',sans-serif;font-stretch:78%;color:#ffffff;letter-spacing:-.03em', 'JUL!'),
  div('left:84px;top:470px;font:500 32px/1.35 \'Archivo\',sans-serif;color:#1f4a32', 'Se hele juleprogrammet<br>for menigheten'),
  svg('left:470px;top:120px;width:200px;height:200px', [200, 200], [[starP(60, 60, 34, 13) + starP(150, 140, 22, 9), '#1f4a32']]),
])

// ---------- skriv kildefilen og katalogen ----------
const orig = fs.readFileSync(path.join(HERE, 'thumbnail-originaler.html'), 'utf8')
const head = orig.slice(0, orig.indexOf('<body>') + 6).replace(/<!--[^]*?-->/, '<!-- Julemalene (20) i Thumbnail Studio: generert av web/tools/maler/jul-maler.mjs (ikke rediger for hånd). Samme format og stil som originalmaterialet (1280 × 720). -->')
const body = T.map((t) => `<section class="tpl" data-id="${t.code.toLowerCase()}" data-code="${t.code}" data-part="4">\n<div style="position:absolute;left:0;top:0;width:1280px;height:720px;overflow:hidden;background:${t.bg}">\n${t.html.join('\n')}\n</div>\n</section>`).join('\n')
fs.writeFileSync(path.join(HERE, 'jul-originaler.html'), `${head}\n${body}\n</body></html>\n`)
const katPath = path.join(WEB, '../docs/maler-katalog.json')
const kat = JSON.parse(fs.readFileSync(katPath, 'utf8'))
kat.thumbs = kat.thumbs.filter((t) => !t.code.startsWith('JUL-')).concat(T.map((t) => ({ id: t.code.toLowerCase(), code: t.code, part: 4, cat: t.cat, name: t.name, desc: t.desc, spec: t.spec })))
fs.writeFileSync(katPath, JSON.stringify(kat, null, 1))
console.log(`${T.length} julemaler → tools/maler/jul-originaler.html og docs/maler-katalog.json`)
