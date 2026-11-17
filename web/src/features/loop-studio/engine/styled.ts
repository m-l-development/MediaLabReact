/**
 * Overskrift og kicker med fontpopupens stil i Loop Studio (cfg.ts.title / cfg.ts.kicker): player.js spør kroken
 * (`setStyled`) om et tekstbilde i referanseenheter og tegner det med samme avsløring som før (ord for ord, linje for
 * linje). I appen og videoeksporten lages bildet av <StyledText> (felles tegnemotor); i den frittstående HTML-spilleren
 * ligger de ferdige bildene i filen (`bakeStyled`), fordi spilleren ikke har React.
 */
import type { FontEntry } from '../../../components/fontpicker/FontPicker.jsx'
import { DEFAULT_PALETTE } from '../../../components/fontpicker/app-fonts'
import { spritesOf, wordsOf, type Sprite } from '../../../components/fontpicker/glyph-sprites'
import { styledSpec } from '../../../components/fontpicker/styled-layer'
import { StyledLayers, type StyledImage, type StyledSpec } from '../../../components/fontpicker/styled-raster'
import type { TextStyle } from '../../../components/fontpicker/TextStyle.jsx'

export interface StyQ { role: 'title' | 'kicker'; text: string; w: number; h: number; size: number; color: string; font: string; ts: TextStyle; k: number; key: string }
interface R4 { x: number; y: number; w: number; h: number }
export interface StyOut { img: CanvasImageSource; k: number; bx: number; by: number; bw: number; bh: number; cx: number; cw: number; words: R4[]; lines: R4[] }

export const loopStyled = new StyledLayers(300)
let preview: FontEntry | null = null

/** Forhåndsvist font i fontpopupen (bare i visningen). */
export function setLoopPreview(f: FontEntry | null): void {
  preview = f
}

function specOf(q: StyQ, prev: FontEntry | null): StyledSpec {
  return styledSpec({ text: q.text, font: q.font, size: q.size, color: q.color, textStyle: q.ts, width: q.w, height: q.h, fit: true, palette: DEFAULT_PALETTE, preview: prev })
}

const union = (ps: readonly Sprite[]): R4 => {
  const x0 = Math.min(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y))
  return { x: x0, y: y0, w: Math.max(...ps.map((p) => p.x + p.w)) - x0, h: Math.max(...ps.map((p) => p.y + p.h)) - y0 }
}

const outs = new WeakMap<StyledImage, StyOut>()
/** Tekstbildet i formen player.js bruker (referanseenheter, relativt til tekstboksen). */
function toOut(im: StyledImage): StyOut {
  let o = outs.get(im)
  if (o) return o
  const sp = spritesOf(im)
  const byLine = new Map<number, Sprite[]>()
  for (const q of sp) byLine.set(q.line, [...(byLine.get(q.line) ?? []), q])
  const c = im.content
  o = {
    img: im.img, k: im.scale, bx: im.box.x, by: im.box.y, bw: im.box.w, bh: im.box.h, cx: c?.x ?? 0, cw: c?.w ?? 0,
    words: wordsOf(sp).map(union),
    lines: [...byLine.keys()].sort((a, b) => a - b).map((l) => union(byLine.get(l) ?? [])),
  }
  outs.set(im, o)
  return o
}

/** Kroken i appen og videoeksporten: bildet når det er klart (ellers null; player.js tegner da ingenting for teksten). */
export function appStyled(q: StyQ): StyOut | null {
  const im = loopStyled.get(q.key + (preview ? '|' + preview.id : ''), specOf(q, preview), q.k, true)
  return im ? toOut(im) : null
}

interface Rend {
  drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, data: unknown, media: unknown, t: number): unknown
  setStyled(f: ((q: StyQ) => StyOut | null) | null): void
}

/**
 * Tekstbildene til den frittstående HTML-spilleren: hver slide tegnes noen ganger (kroken registrerer alle tekstene den
 * blir spurt om), bildene lages, og legges i filen som PNG-data-adresser med ord- og linjeboksene.
 */
export async function bakeStyled(R: Rend, data: { slides?: { dur?: number | null | undefined }[] }, W: number, H: number, media: unknown): Promise<Record<string, Omit<StyOut, 'img'> & { src: string }>> {
  const qs = new Map<string, StyQ>()
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  if (!ctx) return {}
  R.setStyled((q) => {
    qs.set(q.key, q)
    return null
  })
  try {
    let st = 0
    for (const s of data.slides ?? []) {
      const d = s.dur ?? 0
      for (const f of [0.35, 0.6, 0.9]) R.drawFrame(ctx, W, H, data, media, st + d * f)
      st += d
    }
  } finally {
    R.setStyled(appStyled)
  }
  const out: Record<string, Omit<StyOut, 'img'> & { src: string }> = {}
  for (const q of qs.values()) {
    try {
      const im = await loopStyled.cache.load(specOf(q, null), q.k, true)
      const { img: _img, ...rest } = toOut(im)
      void _img
      out[q.key] = { ...rest, src: im.img.toDataURL('image/png') }
    } catch {
      // teksten tegnes da ikke i spilleren
    }
  }
  return out
}
