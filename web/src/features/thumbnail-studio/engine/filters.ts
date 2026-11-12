/**
 * Bildefiltre F01–F13 for bildelag (Thumbnail-maler del 3, «Bildeoverlays og filtre»; docs/maler-og-fonter.md, fase 2).
 * Et bildelag kan ha en liste med filtre i rekkefølge (øverste lag sist). Hvert filter kan slås av og på, justeres og
 * fjernes. Filtrene endrer aldri originalbildet: de tegnes hver gang (lerret, forhåndsvisning og eksport).
 *
 * Oppskriftene og standardverdiene er fra materialet (CSS i 1280 × 720). Mål i piksler (uskarphet, rasteravstand)
 * regnes om til dokumentets bredde (1920: × 1,5). Der materialet ikke oppgir en standardverdi (f.eks. duotone-farger,
 * papirfarge), har filteret en nøytral standard; malene setter sine egne verdier.
 */
export type FilterId = 'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09' | 'F10' | 'F11' | 'F12' | 'F13'
export type FilterParams = Record<string, number | string>
export interface ImgFilter { id: FilterId; on: boolean; p: FilterParams }

export type Param =
  | { k: string; t: 'pct'; label: string; min: number; max: number; def: number }
  | { k: string; t: 'num'; label: string; min: number; max: number; step: number; def: number; unit?: string }
  | { k: string; t: 'color'; label: string; def: string }
  | { k: string; t: 'seg'; label: string; opts: readonly (readonly [string, string])[]; def: string }

export interface FilterDef { id: FilterId; name: string; use: string; params: readonly Param[] }

/** Referansebredden i materialet (malene er tegnet i 1280 × 720). */
export const REF_W = 1280

export const FILTERS: readonly FilterDef[] = [
  { id: 'F01', name: 'Mørk bunn', use: 'Tekst nederst over foto', params: [
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 1 },
    { k: 'start', t: 'pct', label: 'Start', min: 0, max: 0.8, def: 0.4 },
    { k: 'color', t: 'color', label: 'Farge', def: '#000000' }] },
  { id: 'F02', name: 'Mørk side', use: 'Tekst på venstre/høyre side av foto', params: [
    { k: 'dir', t: 'seg', label: 'Retning', opts: [['left', 'Venstre'], ['right', 'Høyre']], def: 'left' },
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 1 },
    { k: 'width', t: 'pct', label: 'Bredde', min: 0.1, max: 1, def: 0.7 },
    { k: 'color', t: 'color', label: 'Farge', def: '#000000' }] },
  { id: 'F03', name: 'Vignett', use: 'Fokus mot midten, filmatisk', params: [
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 1 },
    { k: 'size', t: 'pct', label: 'Størrelse', min: 0, max: 0.9, def: 0.45 }] },
  { id: 'F04', name: 'Fargelag', use: 'Farge bildet i malens farge', params: [
    { k: 'color', t: 'color', label: 'Farge', def: '#f5b800' },
    { k: 'blend', t: 'seg', label: 'Blandemodus', opts: [['color', 'Farge'], ['multiply', 'Multipliser'], ['soft-light', 'Mykt lys']], def: 'color' },
    { k: 'str', t: 'pct', label: 'Styrke', min: 0.2, max: 0.8, def: 0.5 }] },
  { id: 'F05', name: 'Duotone', use: 'To-farget foto (grunge, energisk)', params: [
    { k: 'dark', t: 'color', label: 'Mørk farge', def: '#000000' },
    { k: 'light', t: 'color', label: 'Lys farge', def: '#ffffff' },
    { k: 'con', t: 'num', label: 'Kontrast', min: 0.8, max: 1.6, step: 0.05, def: 1.2 }] },
  { id: 'F06', name: 'Svart-hvitt', use: 'Taler, dokumentar, kollasj', params: [
    { k: 'con', t: 'num', label: 'Kontrast', min: 0.8, max: 1.4, step: 0.05, def: 1.1 },
    { k: 'bri', t: 'num', label: 'Lysstyrke', min: 0.5, max: 1.5, step: 0.05, def: 1 }] },
  { id: 'F07', name: 'Uskarp', use: 'Bakgrunnsfoto bak stor tekst', params: [
    { k: 'blur', t: 'num', label: 'Uskarphet', min: 0, max: 30, step: 1, def: 8, unit: 'px' },
    { k: 'bri', t: 'num', label: 'Lysstyrke', min: 0.5, max: 1.5, step: 0.05, def: 0.9 }] },
  { id: 'F08', name: 'Varm film', use: 'Kveld, stemning, nostalgi', params: [
    { k: 'warm', t: 'pct', label: 'Varme', min: 0, max: 1, def: 1 },
    { k: 'sat', t: 'num', label: 'Metning', min: 0.5, max: 2, step: 0.05, def: 1.2 }] },
  { id: 'F09', name: 'Kald natt', use: 'Kveldsmøter, stjernehimmel, ro', params: [
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 1 },
    { k: 'color', t: 'color', label: 'Farge', def: '#14285a' }] },
  { id: 'F10', name: 'Korn', use: 'Filmkorn over hele bildet', params: [
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 0.6, def: 0.35 },
    { k: 'blend', t: 'seg', label: 'Blandemodus', opts: [['overlay', 'Overlegg (mørke maler)'], ['multiply', 'Multipliser (lyse maler)']], def: 'overlay' }] },
  { id: 'F11', name: 'Lysglød', use: 'Scenelys, ovenlys, spotlight', params: [
    { k: 'color', t: 'color', label: 'Farge', def: '#ffffff' },
    { k: 'pos', t: 'seg', label: 'Posisjon', opts: [['top', 'Topp'], ['middle', 'Midt']], def: 'top' },
    { k: 'size', t: 'pct', label: 'Størrelse', min: 0.2, max: 1.2, def: 0.7 },
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 1 }] },
  { id: 'F12', name: 'Raster', use: 'Halvtone-prikker, retro/trykk', params: [
    { k: 'dot', t: 'num', label: 'Prikkstørrelse', min: 0.5, max: 4, step: 0.25, def: 1, unit: 'px' },
    { k: 'gap', t: 'num', label: 'Avstand', min: 3, max: 20, step: 1, def: 6, unit: 'px' },
    { k: 'str', t: 'pct', label: 'Styrke', min: 0, max: 1, def: 0.25 }] },
  { id: 'F13', name: 'Papir', use: 'Kollasj og papirmaler (lyse)', params: [
    { k: 'str', t: 'pct', label: 'Styrke', min: 0.3, max: 0.45, def: 0.38 },
    { k: 'paper', t: 'color', label: 'Papirfarge', def: '#f1ece2' }] },
]

const BY_ID = new Map(FILTERS.map((f) => [f.id, f]))
export const filterDef = (id: string): FilterDef | null => BY_ID.get(id as FilterId) ?? null

/** Nytt filter med standardverdiene (pluss eventuelle egne verdier, f.eks. fra en mal). */
export function newFilter(id: FilterId, p: FilterParams = {}): ImgFilter {
  const d = filterDef(id)
  const base: FilterParams = {}
  for (const x of d?.params ?? []) base[x.k] = x.def
  return { id, on: true, p: { ...base, ...p } }
}

const HEX = /^#[0-9a-f]{6}$/i
const clampN = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)

/** Rydder filterlisten fra et lagret prosjekt (ukjente filtre og verdier utenfor området forkastes). */
export function cleanFilters(v: unknown): ImgFilter[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: ImgFilter[] = []
  for (const x of v.slice(0, 13)) {
    const d = x && typeof x === 'object' ? filterDef((x as { id?: string }).id ?? '') : null
    if (!d) continue
    const raw = ((x as { p?: unknown }).p ?? {}) as Record<string, unknown>
    const p: FilterParams = {}
    for (const q of d.params) {
      const r = raw[q.k]
      p[q.k] = q.t === 'color' ? (typeof r === 'string' && HEX.test(r) ? r : q.def) : q.t === 'seg' ? (q.opts.some(([o]) => o === r) ? (r as string) : q.def) : clampN(r, q.min, q.max, q.def)
    }
    out.push({ id: d.id, on: (x as { on?: unknown }).on !== false, p })
  }
  return out
}

/** Filtrene som er slått på, ryddet (lagrede prosjekter valideres ikke ved lasting; ukjente verdier gir standardverdien). */
export const activeFilters = (fs: readonly ImgFilter[] | null | undefined): ImgFilter[] => (cleanFilters(fs) ?? []).filter((f) => f.on)

const n = (f: ImgFilter, k: string) => Number(f.p[k])
const c = (f: ImgFilter, k: string) => String(f.p[k])

function rgba(hex: string, a: number): string {
  const m = HEX.exec(hex) ? hex : '#000000'
  const v = parseInt(m.slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.max(0, Math.min(1, a))})`
}

/**
 * Canvas-filteret for selve bildet (svart-hvitt, duotone, uskarp, varm film, kald natt), i listens rekkefølge.
 * `k` = dokumentbredde / 1280, `s` = tegneskala (uskarphet regnes i lerretets piksler).
 */
export function pixelFilter(fs: readonly ImgFilter[], k: number, s: number): string {
  const out: string[] = []
  for (const f of fs) {
    if (f.id === 'F05') out.push(`grayscale(1) contrast(${n(f, 'con')})`)
    else if (f.id === 'F06') out.push(`grayscale(1) contrast(${n(f, 'con')}) brightness(${n(f, 'bri')})`)
    else if (f.id === 'F07') out.push(`blur(${(n(f, 'blur') * k * s).toFixed(2)}px) brightness(${n(f, 'bri')})`)
    else if (f.id === 'F08') out.push(`sepia(${0.25 * n(f, 'warm')}) saturate(${n(f, 'sat')}) contrast(${1 + 0.05 * n(f, 'warm')})`)
    else if (f.id === 'F09') out.push(`saturate(${1 - 0.2 * n(f, 'str')}) brightness(${1 - 0.2 * n(f, 'str')})`)
  }
  return out.join(' ')
}

/** Uskarp (F07) forstørrer bildet 6 % så kantene ikke blir lyse. */
export const blurScale = (fs: readonly ImgFilter[]): number => (fs.some((f) => f.id === 'F07' && n(f, 'blur') > 0) ? 1.06 : 1)

// kornet i materialet: SVG feTurbulence (fractalNoise, baseFrequency .85, 3 oktaver), rute på 240 px
const GRAIN_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>"
let grain: HTMLImageElement | null = null
let grainReady: Promise<void> | null = null

/** Laster kornruten (én gang). Tegning før den er klar hopper over kornet; eksporten venter på den. */
export function loadGrain(): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve()
  grainReady ??= new Promise<void>((res) => {
    const im = new Image()
    im.onload = () => { grain = im; res() }
    im.onerror = () => res()
    im.src = GRAIN_SVG
  })
  return grainReady
}

/** Kornruten (null til den er lastet med `loadGrain`). Brukes også av malingen (engine/paint.ts). */
export const grainImage = (): HTMLImageElement | null => grain

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function grainFill(g: Ctx, w: number, h: number, k: number, blend: GlobalCompositeOperation, a: number) {
  if (!grain) return
  const pat = g.createPattern(grain, 'repeat')
  if (!pat) return
  // ruten er 240 px i 1280-bredden: samme kornstørrelse i forhold til bildet
  pat.setTransform(new DOMMatrix().scale(k, k))
  g.save()
  g.globalCompositeOperation = blend
  g.globalAlpha = a
  g.fillStyle = pat
  g.fillRect(0, 0, w, h)
  g.restore()
}

/** Lagene over bildet (mørk bunn/side, vignett, farge, duotone-farger, korn, lysglød, raster, papir), i rekkefølge. */
export function drawOverlays(g: Ctx, fs: readonly ImgFilter[], w: number, h: number, k: number) {
  const fill = (style: string | CanvasGradient | CanvasPattern, blend: GlobalCompositeOperation = 'source-over', a = 1) => {
    g.save()
    g.globalCompositeOperation = blend
    g.globalAlpha = a
    g.fillStyle = style
    g.fillRect(0, 0, w, h)
    g.restore()
  }
  for (const f of fs) {
    switch (f.id) {
      case 'F01': {
        // linear-gradient(180deg, transparent <start>, rgba(farge, .85))
        const gr = g.createLinearGradient(0, 0, 0, h)
        gr.addColorStop(0, rgba(c(f, 'color'), 0))
        gr.addColorStop(Math.min(0.999, n(f, 'start')), rgba(c(f, 'color'), 0))
        gr.addColorStop(1, rgba(c(f, 'color'), 0.85 * n(f, 'str')))
        fill(gr)
        break
      }
      case 'F02': {
        // linear-gradient(90deg, rgba(farge, .85), transparent <bredde>), fra valgt side
        const left = c(f, 'dir') !== 'right'
        const gr = g.createLinearGradient(left ? 0 : w, 0, left ? w : 0, 0)
        gr.addColorStop(0, rgba(c(f, 'color'), 0.85 * n(f, 'str')))
        gr.addColorStop(Math.min(1, n(f, 'width')), rgba(c(f, 'color'), 0))
        gr.addColorStop(1, rgba(c(f, 'color'), 0))
        fill(gr)
        break
      }
      case 'F03': {
        // radial-gradient(ellipse at center, transparent <størrelse>, rgba(0,0,0,.75)) – ellipse som følger formatet
        g.save()
        g.translate(w / 2, h / 2)
        g.scale(w / 2, h / 2)
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2)
        gr.addColorStop(0, 'rgba(0,0,0,0)')
        gr.addColorStop(Math.min(0.999, n(f, 'size') / Math.SQRT2), 'rgba(0,0,0,0)')
        gr.addColorStop(1, rgba('#000000', 0.75 * n(f, 'str')))
        g.fillStyle = gr
        g.fillRect(-1, -1, 2, 2)
        g.restore()
        break
      }
      case 'F04':
        fill(c(f, 'color'), c(f, 'blend') as GlobalCompositeOperation, n(f, 'str'))
        break
      case 'F05':
        // lys farge multiply, mørk farge lighten
        fill(c(f, 'light'), 'multiply')
        fill(c(f, 'dark'), 'lighten')
        break
      case 'F08':
        fill(rgba('#ff8c3c', 0.18 * n(f, 'warm')), 'soft-light')
        break
      case 'F09':
        fill(rgba(c(f, 'color'), 0.45 * n(f, 'str')), 'multiply')
        break
      case 'F10':
        grainFill(g, w, h, k, c(f, 'blend') === 'multiply' ? 'multiply' : 'overlay', n(f, 'str'))
        break
      case 'F11': {
        // radial-gradient(ellipse at 50% 0%, <farge>, transparent 70%), screen
        const cy = c(f, 'pos') === 'middle' ? h / 2 : 0
        g.save()
        g.translate(w / 2, cy)
        g.scale(w / 2, h / 2)
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.01, n(f, 'size')))
        gr.addColorStop(0, rgba(c(f, 'color'), n(f, 'str')))
        gr.addColorStop(1, rgba(c(f, 'color'), 0))
        g.globalCompositeOperation = 'screen'
        g.fillStyle = gr
        g.fillRect(-1, cy ? -1 : 0, 2, 2)
        g.restore()
        break
      }
      case 'F12': {
        // radial-gradient(rgba(0,0,0,.25) 1px, transparent 1.5px) 0 0 / 6px 6px, multiply
        const gap = Math.max(2, n(f, 'gap') * k), r = n(f, 'dot') * k
        const t = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(gap), Math.ceil(gap)) : Object.assign(document.createElement('canvas'), { width: Math.ceil(gap), height: Math.ceil(gap) })
        const tg = t.getContext('2d') as Ctx | null
        if (!tg) break
        const gr = tg.createRadialGradient(0, 0, 0, 0, 0, r * 1.5)
        gr.addColorStop(0, rgba('#000000', n(f, 'str')))
        gr.addColorStop(2 / 3, rgba('#000000', n(f, 'str')))
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        tg.fillStyle = gr
        // prikken sitter i hjørnet av ruten, som i CSS (0 0)
        for (const [x, y] of [[0, 0], [gap, 0], [0, gap], [gap, gap]] as const) {
          tg.save()
          tg.translate(x, y)
          tg.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3)
          tg.restore()
        }
        const pat = g.createPattern(t as CanvasImageSource, 'repeat')
        if (pat) fill(pat, 'multiply')
        break
      }
      case 'F13': {
        // korn multiply 30–45 % + svak vignett i papirfargen
        grainFill(g, w, h, k, 'multiply', n(f, 'str'))
        g.save()
        g.translate(w / 2, h / 2)
        g.scale(w / 2, h / 2)
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2)
        gr.addColorStop(0, rgba(c(f, 'paper'), 0))
        gr.addColorStop(0.55, rgba(c(f, 'paper'), 0))
        gr.addColorStop(1, rgba(c(f, 'paper'), 0.5))
        g.fillStyle = gr
        g.fillRect(-1, -1, 2, 2)
        g.restore()
        break
      }
    }
  }
}
