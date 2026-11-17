/**
 * Tekstlag tegnet med den ekte <StyledText> (TextStyle.jsx, uendret) og gjort om til et bilde, så lerretene i appen
 * (Thumbnail, Photo, Motion, Loop) kan tegne det inn i riktig lagrekkefølge – likt i visning og eksport.
 *
 * Slik virker det:
 * 1. <StyledText> tegnes i en skjult beholder i dokumentet (samme nettleser, samme fonter, samme CSS/SVG).
 * 2. html-to-image (MIT) lager et SVG-bilde med <foreignObject> av det ferdige resultatet. Fonten (bare snittene
 *    teksten trenger) og bilder (Bildefyll) bakes inn som data:-adresser, så bildet er selvstendig.
 * 3. SVG-bildet tegnes i et <canvas> i ønsket oppløsning og beskjæres til det som faktisk er synlig.
 *
 * Testet i Chromium og WebKit (Safari-motoren): lerretet blir ikke «tainted», så toBlob/VideoFrame virker.
 * Safari tegner av og til innebygde bilder først ved andre tegning – derfor tegnes bilder med Bildefyll to ganger,
 * og et helt tomt resultat for en tekst med innhold prøves på nytt.
 */
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { toSvg } from 'html-to-image'
import { LAYER_FX, StyledText, type TextStyle } from './TextStyle.jsx'
import { loadFont, type FontEntry } from './FontPicker.jsx'
import { FONT_BASE } from './app-fonts'

export interface StyledSpec {
  text: string
  font: FontEntry
  /** Lagets tekststørrelse i px (textStyle.size overstyrer, som i <StyledText>). */
  size: number
  color: string
  /** Normalisert stil (normalizeStyle), med fet/kursiv bare når fonten har snittet. */
  style: TextStyle
  width: number
  height: number
  palette?: string[] | undefined
  /** CSS font-stretch (f.eks. '125%'). */
  stretch?: string | undefined
  /** «Tilpass til boksen»: største størrelse (≤ valgt) der teksten får plass i boksen. */
  fit?: boolean | undefined
}

export interface Box { x: number; y: number; w: number; h: number }
/** Én bokstav i tegningen (lagets px, relativt til boksen). */
export interface Glyph extends Box { i: number; ch: string; line: number; word: number }

export interface StyledImage {
  /** Det beskårne bildet. */
  img: HTMLCanvasElement
  /** Der bildet ligger, i lagets px relativt til boksens øvre venstre hjørne. */
  box: Box
  /** Oppløsningen bildet er tegnet i (bildepiksler per lagpiksel). */
  scale: number
  /** Selve teksten (uten effekter rundt), i lagets px – til «Tilpass til boksen», strek under o.l. */
  content: Box | null
  /** Bokstavene (bare når de er bedt om – animasjoner bokstav for bokstav). */
  glyphs: Glyph[] | null
  /** Boksen bildet ble tegnet for (lagets bredde og høyde). */
  bw: number
  bh: number
  /** Tekststørrelsen som ble brukt (mindre enn valgt når «Tilpass til boksen» måtte krympe teksten). */
  size: number
}

const IMAGE_FX = new Set(['imagefill'])

// ---------- skjult beholder ----------
let hostDiv: HTMLDivElement | null = null
function host(): HTMLDivElement {
  if (hostDiv && hostDiv.isConnected) return hostDiv
  if (!document.getElementById('ml-styled-css')) {
    const st = document.createElement('style')
    st.id = 'ml-styled-css'
    // nettleserens standardoppførsel inne i beholderen (appens globale regler – box-sizing, svg som blokk – skal ikke
    // endre hvordan <StyledText> ser ut)
    st.textContent = '.ml-styled-host{all:initial;position:fixed;left:-100000px;top:0;display:block;pointer-events:none}' +
      '.ml-styled-host *,.ml-styled-host *::before,.ml-styled-host *::after{box-sizing:content-box}' +
      '.ml-styled-host svg{display:inline;max-width:none}'
    document.head.appendChild(st)
  }
  hostDiv = document.createElement('div')
  hostDiv.className = 'ml-styled-host'
  hostDiv.setAttribute('aria-hidden', 'true')
  document.body.appendChild(hostDiv)
  return hostDiv
}

const frame = () => new Promise<void>((r) => {
  let done = false
  const f = () => {
    if (!done) {
      done = true
      r()
    }
  }
  requestAnimationFrame(f)
  setTimeout(f, 34)
})

/** Venter til tegningen er ferdig (fonter lastet, buer tilpasset lengden – innholdet slutter å endre seg). */
async function settle(el: HTMLElement) {
  let prev = ''
  for (let i = 0; i < 12; i++) {
    await frame()
    const h = el.innerHTML
    if (h === prev) return
    prev = h
  }
}

// ---------- fonter bakt inn ----------
const fileUrl = new Map<string, Promise<string>>()
function dataUrl(url: string): Promise<string> {
  let p = fileUrl.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => new Promise<string>((ok, no) => {
        const fr = new FileReader()
        fr.onload = () => ok(String(fr.result))
        fr.onerror = () => no(fr.error)
        fr.readAsDataURL(b)
      }))
      .catch(() => '')
    fileUrl.set(url, p)
  }
  return p
}
const sheets = new Map<string, Promise<string>>()
function sheet(url: string): Promise<string> {
  let p = sheets.get(url)
  if (!p) {
    p = fetch(url).then((r) => (r.ok ? r.text() : '')).catch(() => '')
    sheets.set(url, p)
  }
  return p
}
function inRange(range: string, cps: Set<number>): boolean {
  for (const part of range.split(',')) {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim())
    if (!m) continue
    const a = parseInt((m[1] ?? '0').replace(/\?/g, '0'), 16)
    const b = m[2] ? parseInt(m[2], 16) : (m[1] ?? '').includes('?') ? parseInt((m[1] ?? '0').replace(/\?/g, 'F'), 16) : a
    for (const c of cps) if (c >= a && c <= b) return true
  }
  return false
}
/** @font-face for fonten med fontfilene som data:-adresser – bare delene (unicode-range) teksten bruker. */
async function fontCss(font: FontEntry, text: string): Promise<string> {
  if (!font.css) return ''
  const href = new URL(FONT_BASE + font.css, location.href).href
  const css = await sheet(href)
  const cps = new Set<number>()
  for (const ch of text + ' ') cps.add(ch.codePointAt(0) ?? 32)
  const out: string[] = []
  for (const face of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const ur = /unicode-range\s*:\s*([^;}]+)/.exec(face)?.[1]
    if (ur && !inRange(ur, cps)) continue
    const urls = [...face.matchAll(/url\((['"]?)([^'")]+)\1\)/g)]
    let f = face
    for (const u of urls) {
      const abs = new URL(u[2] ?? '', href).href
      const d = await dataUrl(abs)
      if (d) f = f.split(u[0]).join(`url("${d}")`)
    }
    out.push(f)
  }
  return out.join('\n')
}

// ---------- mål ----------
function union(rs: DOMRect[], o: DOMRect): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rs) {
    if (!(r.width > 0 && r.height > 0)) continue
    x0 = Math.min(x0, r.left - o.left)
    y0 = Math.min(y0, r.top - o.top)
    x1 = Math.max(x1, r.right - o.left)
    y1 = Math.max(y1, r.bottom - o.top)
  }
  return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
}
function contentOf(inner: HTMLElement): Box | null {
  const o = inner.getBoundingClientRect()
  const rs: DOMRect[] = []
  inner.querySelectorAll('span, text').forEach((e) => rs.push(e.getBoundingClientRect()))
  return union(rs, o)
}

/** Bokstavene i rekkefølge med plassering (HTML-tekst via Range, SVG-tekst via getExtentOfChar). */
function glyphsOf(inner: HTMLElement): Glyph[] {
  const o = inner.getBoundingClientRect()
  const out: Glyph[] = []
  let line = 0, word = 0, lastTop = NaN
  const push = (ch: string, r: { left: number; top: number; width: number; height: number }) => {
    if (/\s/.test(ch)) {
      word++
      return
    }
    if (!Number.isNaN(lastTop) && Math.abs(r.top - lastTop) > r.height * 0.6) line++
    lastTop = r.top
    out.push({ i: out.length, ch, line, word, x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height })
  }
  // lagvise effekter (kopier av teksten) har hovedteksten øverst (zIndex 1): bruk det siste tekstelementet med innhold
  const spans = [...inner.querySelectorAll('span')].filter((s) => s.textContent)
  const texts = [...inner.querySelectorAll('text')]
  if (texts.length) {
    // SVG: alle <text>-elementene i den siste <svg> (form/warp/ordsky)
    const svgs = [...inner.querySelectorAll('svg')].filter((s) => s.querySelector('text'))
    const svg = svgs[svgs.length - 1]
    for (const t of svg ? [...svg.querySelectorAll('text')] : []) {
      const el = t as SVGTextElement
      const n = el.getNumberOfChars()
      const str = el.textContent ?? ''
      const chars = Array.from(str)
      const m = el.getScreenCTM()
      if (n === chars.length && m) {
        for (let i = 0; i < n; i++) {
          const e = el.getExtentOfChar(i)
          const p1 = new DOMPoint(e.x, e.y).matrixTransform(m)
          const p2 = new DOMPoint(e.x + e.width, e.y + e.height).matrixTransform(m)
          const p3 = new DOMPoint(e.x + e.width, e.y).matrixTransform(m)
          const p4 = new DOMPoint(e.x, e.y + e.height).matrixTransform(m)
          const xs = [p1.x, p2.x, p3.x, p4.x], ys = [p1.y, p2.y, p3.y, p4.y]
          const l = Math.min(...xs), tp = Math.min(...ys)
          push(chars[i] ?? '', { left: l, top: tp, width: Math.max(...xs) - l, height: Math.max(...ys) - tp })
        }
      } else {
        const r = el.getBoundingClientRect()
        push(str, r)
      }
      if (!/\s$/.test(str) && texts.length > 1 && str.length > 1) word++
    }
    return out
  }
  const main = spans[spans.length - 1]
  if (!main) return out
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
  const rg = document.createRange()
  for (let nd = walker.nextNode(); nd; nd = walker.nextNode()) {
    const s = nd.textContent ?? ''
    let off = 0
    for (const ch of Array.from(s)) {
      rg.setStart(nd, off)
      rg.setEnd(nd, off + ch.length)
      off += ch.length
      if (ch === '\n') {
        word++
        continue
      }
      const rs = rg.getClientRects()
      const r = rs[0]
      if (r) push(ch, r)
    }
  }
  return out
}

function margins(s: StyledSpec): { mx: number; my: number } {
  const fs = s.style.size || s.size
  let mx = fs * 1.5 + 24
  let my = fs * 1.5 + 24
  const fx = String(s.style.effect?.type ?? 'none')
  if (LAYER_FX.includes(fx)) my += s.height * 2
  if (fx === 'dust') mx += fs * 2.5
  if (s.style.rotate) {
    const d = (Math.hypot(s.width, s.height) - Math.min(s.width, s.height)) / 2
    mx += d
    my += d
  }
  return { mx: Math.ceil(mx), my: Math.ceil(my) }
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => {
    const im = new Image()
    im.decoding = 'sync'
    im.onload = () => {
      im.decode().then(() => ok(im), () => ok(im))
    }
    im.onerror = () => no(new Error('svg'))
    im.src = url
  })
}

const SVG_PREFIX = 'data:image/svg+xml;charset=utf-8,'
/**
 * WebKit (Safari) gir i den beregnede stilen også egenskaper som overstyrer de riktige når stilen leses inn igjen:
 * - `stroke-color` er WebKits alias for -webkit-text-stroke-color; den kommer etter og gjør konturen gjennomsiktig
 *   (Gjenta/Lag/Kontur-kopier ble borte)
 * - kortformen `mask` (uten bilde) kommer etter mask-image og nullstiller masken (Speiling, Brettet)
 * De fjernes fra style-attributtene; resten er uendret. Chromium gir ikke disse, så der endres ingenting.
 */
export function fixSvg(url: string): string {
  if (!url.startsWith(SVG_PREFIX)) return url
  const xml = decodeURIComponent(url.slice(SVG_PREFIX.length))
  const fixed = xml.replace(/style="([^"]*)"/g, (_m, css: string) => `style="${css.replace(/(^|;)\s*(?:stroke-color|mask)\s*:[^;]*/g, '$1')}"`)
  return fixed === xml ? url : SVG_PREFIX + encodeURIComponent(fixed)
}

/** Beskjærer til de synlige pikslene. */
function trim(c: HTMLCanvasElement): { c: HTMLCanvasElement; x: number; y: number } | null {
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  const { width: W, height: H } = c
  const d = g.getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) {
    const row = y * W * 4
    for (let x = 0; x < W; x++) {
      if (d[row + x * 4 + 3]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        y1 = y
      }
    }
  }
  if (x1 < 0) return null
  x0 = Math.max(0, x0 - 1)
  y0 = Math.max(0, y0 - 1)
  x1 = Math.min(W - 1, x1 + 1)
  y1 = Math.min(H - 1, y1 + 1)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')?.drawImage(c, -x0, -y0)
  return { c: out, x: x0, y: y0 }
}

/** Største bilde (piksler) et lerret kan ha i Safari (16,7 MP); vi holder oss godt under. */
const MAX_PX = 14e6

/** Laster fonten (snittet teksten bruker) og venter til den er klar. */
export async function prepareFont(s: StyledSpec): Promise<void> {
  const w = s.style.weight || (s.style.bold ? 700 : 400)
  try {
    await loadFont(s.font, w, s.style.italic ? 'italic' : 'normal', FONT_BASE)
  } catch {
    /* systemfont/ukjent: tegnes med reserven */
  }
}

/** Tegner <StyledText> som bilde i oppløsningen `scale` (bildepiksler per lagpiksel). */
export async function rasterStyled(s: StyledSpec, scale: number, want: { glyphs?: boolean } = {}): Promise<StyledImage> {
  await prepareFont(s)
  let { mx, my } = margins(s)
  // hold bildet innenfor nettleserens grense: mindre marg først, deretter lavere oppløsning
  const area = () => (s.width + 2 * mx) * (s.height + 2 * my) * scale * scale
  while (area() > MAX_PX && (mx > 24 || my > 24)) {
    mx = Math.max(24, Math.floor(mx * 0.8))
    my = Math.max(24, Math.floor(my * 0.8))
  }
  let k = scale
  if (area() > MAX_PX) k = Math.sqrt(MAX_PX / ((s.width + 2 * mx) * (s.height + 2 * my)))
  const W2 = Math.ceil(s.width + 2 * mx)
  const H2 = Math.ceil(s.height + 2 * my)
  const outer = document.createElement('div')
  outer.style.cssText = `position:relative;display:block;width:${W2}px;height:${H2}px;overflow:visible`
  const inner = document.createElement('div')
  inner.style.cssText = `position:absolute;left:${mx}px;top:${my}px;width:${s.width}px;height:${s.height}px;display:block`
  outer.appendChild(inner)
  host().appendChild(outer)
  const root = createRoot(inner)
  try {
    const size = fitIn(s, root, inner)
    await settle(inner)
    const content = contentOf(inner)
    const glyphs = want.glyphs ? glyphsOf(inner) : null
    const fontEmbedCSS = await fontCss(s.font, s.text)
    const url = await toSvg(outer, { width: W2, height: H2, fontEmbedCSS, cacheBust: false, skipAutoScale: true, pixelRatio: 1 })
    const img = await loadImg(fixSvg(url))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(W2 * k))
    c.height = Math.max(1, Math.round(H2 * k))
    const g = c.getContext('2d')
    if (!g) throw new Error('canvas')
    const paint = () => {
      g.clearRect(0, 0, c.width, c.height)
      g.drawImage(img, 0, 0, c.width, c.height)
    }
    paint()
    // Safari: innebygde bilder (Bildefyll) kommer noen ganger først med ved andre tegning
    if (IMAGE_FX.has(String(s.style.effect?.type))) {
      await frame()
      paint()
    }
    let t = trim(c)
    for (let i = 0; !t && s.text.trim() && i < 3; i++) {
      await frame()
      paint()
      t = trim(c)
    }
    const empty = document.createElement('canvas')
    empty.width = empty.height = 1
    const r = t ?? { c: empty, x: 0, y: 0 }
    return { img: r.c, box: { x: r.x / k - mx, y: r.y / k - my, w: r.c.width / k, h: r.c.height / k }, scale: k, content, glyphs, bw: s.width, bh: s.height, size }
  } finally {
    root.unmount()
    outer.remove()
  }
}

/**
 * Tegner <StyledText> i `root` (synkront) og gir tekststørrelsen. Med «Tilpass til boksen»: største størrelse (≤ valgt)
 * der selve teksten får plass i boksen – målt i den ekte tegningen (fonten er lastet, så målingen er synkron).
 */
function fitIn(s: StyledSpec, root: ReturnType<typeof createRoot>, inner: HTMLElement): number {
  const max = s.style.size || s.size
  const draw = (sz: number) => flushSync(() => root.render(
    <StyledText text={s.text} fontFamily={s.font.familie} fontStretch={s.stretch} fontSize={sz} color={s.color}
      textStyle={{ ...s.style, size: sz }} width={s.width} height={s.height} {...(s.palette ? { palette: s.palette } : {})} />,
  ))
  const fits = () => {
    const b = contentOf(inner)
    return !b || (b.w <= s.width + 0.5 && b.h <= s.height + 0.5)
  }
  draw(max)
  if (!s.fit || fits()) return max
  let lo = 4
  let hi = max
  for (let i = 0; i < 12 && hi - lo > 0.25; i++) {
    const m = (lo + hi) / 2
    draw(m)
    if (fits()) lo = m
    else hi = m
  }
  draw(lo)
  return lo
}

/** Bare tekststørrelsen «Tilpass til boksen» gir (uten bilde). */
export async function measureFit(s: StyledSpec): Promise<number> {
  await prepareFont(s)
  const inner = document.createElement('div')
  inner.style.cssText = `position:absolute;left:0;top:0;width:${s.width}px;height:${s.height}px;display:block`
  host().appendChild(inner)
  const root = createRoot(inner)
  try {
    return fitIn(s, root, inner)
  } finally {
    root.unmount()
    inner.remove()
  }
}

/** Nøkkel som endres når noe som påvirker tegningen endres. */
export function specKey(s: StyledSpec, scale: number, glyphs = false): string {
  return JSON.stringify([s.text, s.font.id, s.font.familie, s.size, s.color, s.style, s.width, s.height, s.palette ?? null, s.stretch ?? null, !!s.fit, Math.round(scale * 1000), glyphs])
}

// ---------- hurtigbuffer ----------
interface Slot { key: string; img: StyledImage | null; spec: StyledSpec | null; scale: number; want: string; busy: boolean; glyphs: boolean }

/**
 * Bildene til tekstlagene. `get` er synkron (tegning): gir bildet når det er klart – ellers forrige bilde for laget
 * mens det nye lages – og varsler med `onLoad` når et nytt bilde er ferdig. `load` venter på det eksakte bildet (eksport).
 */
export class StyledCache {
  private slots = new Map<string, Slot>()
  private done = new Map<string, StyledImage>()
  private inflight = new Map<string, Promise<StyledImage>>()
  private listeners = new Set<() => void>()
  private chain: Promise<unknown> = Promise.resolve()
  private limit: number

  constructor(limit = 80) {
    this.limit = limit
  }

  onLoad(f: () => void): () => void {
    this.listeners.add(f)
    return () => {
      this.listeners.delete(f)
    }
  }

  private notify() {
    for (const f of [...this.listeners]) {
      try {
        f()
      } catch {
        /* lytteren selv */
      }
    }
  }

  private remember(key: string, img: StyledImage) {
    this.done.delete(key)
    this.done.set(key, img)
    while (this.done.size > this.limit) {
      const first = this.done.keys().next().value
      if (first === undefined) break
      this.done.delete(first)
    }
  }

  /** Eksakt bilde (venter). Lages én gang per nøkkel; flere lag tegnes etter hverandre. */
  load(s: StyledSpec, scale: number, glyphs = false): Promise<StyledImage> {
    const key = specKey(s, scale, glyphs)
    const hit = this.done.get(key)
    if (hit) return Promise.resolve(hit)
    let p = this.inflight.get(key)
    if (!p) {
      const run = () => rasterStyled(s, scale, { glyphs })
      p = this.chain.then(run, run)
      this.chain = p.catch(() => null)
      this.inflight.set(key, p)
      p.then((img) => this.remember(key, img), () => {}).finally(() => this.inflight.delete(key))
    }
    return p
  }

  /** Synkront oppslag for laget `slot`. Eksakt bilde, eller forrige bilde for laget (exact = false) mens det nye lages. */
  get(slot: string, s: StyledSpec, scale: number, glyphs = false): { img: StyledImage | null; exact: boolean } {
    const key = specKey(s, scale, glyphs)
    const hit = this.done.get(key)
    let sl = this.slots.get(slot)
    if (!sl) {
      sl = { key: '', img: null, spec: null, scale, want: '', busy: false, glyphs }
      this.slots.set(slot, sl)
    }
    if (hit) {
      sl.key = key
      sl.img = hit
      return { img: hit, exact: true }
    }
    sl.want = key
    sl.spec = s
    sl.scale = scale
    sl.glyphs = glyphs
    this.pump(sl)
    return { img: sl.img, exact: false }
  }

  private pump(sl: Slot) {
    if (sl.busy || !sl.spec || sl.want === sl.key) return
    sl.busy = true
    const want = sl.want
    this.load(sl.spec, sl.scale, sl.glyphs)
      .then((img) => {
        sl.key = want
        sl.img = img
        this.notify()
      }, (e: unknown) => {
        // laget beholder forrige bilde; feilen vises i konsollen (ikke stille)
        console.warn('Tekstbildet kunne ikke lages:', e)
        sl.key = want
      })
      .finally(() => {
        sl.busy = false
        if (sl.want !== sl.key) this.pump(sl)
      })
  }

  /** Glemmer lag som ikke finnes lenger. */
  keep(slots: Iterable<string>) {
    const k = new Set(slots)
    for (const id of [...this.slots.keys()]) if (!k.has(id)) this.slots.delete(id)
  }

  clear() {
    this.slots.clear()
    this.done.clear()
  }
}

/** Tegner et ferdig tekstbilde i lagets boks (lagets koordinater: boksen starter i 0,0 og er w × h). */
export function drawStyled(g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, im: StyledImage, w: number, h: number): void {
  // forrige bilde mens et nytt lages: skaleres til boksens nye størrelse
  const kx = im.bw > 0 ? w / im.bw : 1
  const ky = im.bh > 0 ? h / im.bh : 1
  g.drawImage(im.img, im.box.x * kx, im.box.y * ky, im.box.w * kx, im.box.h * ky)
}

/** Oppløsningen tekstbildet tegnes i for lerretsskalaen `s` (avrundet, så små zoomendringer ikke gir nye bilder). */
export function rasterScale(s: number): number {
  return Math.max(0.25, Math.ceil(s * 4 - 1e-6) / 4)
}

type G2 = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Tekstlagene i én editor: hurtigbuffer, synkron tegning i lagets boks, venting før eksport og siste kjente størrelse
 * (til «Tilpass til boksen»-merknader, strek under o.l.). Alle editorene bruker denne – bare koblingen er deres egen.
 */
export class StyledLayers {
  readonly cache: StyledCache
  private last = new Map<string, StyledImage>()
  /** Bilder som manglet ved siste tegning (eksport: tegn bildet på nytt når de er klare – se `flush`). */
  private miss: Promise<unknown>[] = []

  constructor(limit = 80) {
    this.cache = new StyledCache(limit)
  }

  onLoad(f: () => void): () => void {
    return this.cache.onLoad(f)
  }

  /** Siste ferdige bilde for laget (ikke forhåndsvisning). */
  lastOf(id: string): StyledImage | null {
    return this.last.get(id) ?? null
  }

  /**
   * Tegner laget `id` i boksen (0, 0, w, h) i gjeldende transform. `s` = lerretets skala (bildepiksler per lagpiksel).
   * Gir bildet som ble tegnet (eller null mens det første lages). `preview` = forhåndsvist font (huskes ikke).
   */
  draw(g: G2, id: string, spec: StyledSpec, s: number, w: number, h: number, preview = false, glyphs = false): StyledImage | null {
    const img = this.get(id, spec, s, glyphs)
    if (!img) return null
    if (!preview) this.last.set(id, img)
    drawStyled(g, img, w, h)
    return img
  }

  /** Bildet for laget uten å tegne det (f.eks. bokstavbiter i animasjoner). */
  get(id: string, spec: StyledSpec, s: number, glyphs = false): StyledImage | null {
    const k = rasterScale(s)
    const { img, exact } = this.cache.get(id, spec, k, glyphs)
    if (!exact) this.miss.push(this.cache.load(spec, k, glyphs).catch(() => null))
    return img
  }

  /**
   * Venter på bildene som manglet ved siste tegning. `true` = noe manglet (og er nå klart): tegn bildet på nytt.
   * Brukes av eksport (video bilde for bilde), så hvert bilde har riktig tekst – også når teksten endres underveis
   * (nedtelling, tallrull, fontskifte).
   */
  async flush(): Promise<boolean> {
    const m = this.miss
    this.miss = []
    if (!m.length) return false
    await Promise.all(m)
    return true
  }

  /** Venter til alle lagene er ferdige i oppløsningen `s` (før eksport, skisser og videobilder). */
  async ready(items: readonly { id: string; spec: StyledSpec }[], s: number, glyphs = false): Promise<void> {
    const k = rasterScale(s)
    await Promise.all(items.map((x) => this.cache.load(x.spec, k, glyphs).then((img) => {
      this.last.set(x.id, img)
      // også synkront oppslag for laget gir nå det eksakte bildet
      this.cache.get(x.id, x.spec, k, glyphs)
    }, () => null)))
  }
}
