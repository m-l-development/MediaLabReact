/**
 * Logo oppå mockupen. Plasseringen lagres som andeler av mockup-bildet (x, y = øvre venstre hjørne, w = bredde),
 * så den er den samme i forhåndsvisningen (uansett zoom og vindusstørrelse) og i eksporten i full oppløsning.
 * SVG holdes som SVG hele veien: i redigeringen vises filen som vektor (<img> med SVG-en), og først ved eksport
 * gjengis den – direkte i eksportens pikselstørrelse. PNG/WebP/JPEG tegnes som de er.
 */
export interface LogoPlacement { x: number; y: number; w: number }

export interface Logo {
  /** blob:-adresse til originalfilen (SVG eller bilde) – vises i <img>. */
  url: string
  name: string
  /** SVG-kilden (tekst) når logoen er SVG, ellers null. */
  svg: string | null
  /** Bredde/høyde (proporsjoner) fra filen. */
  aspect: number
  /** «ch:<id>» når logoen er valgt fra menighetens filer (ingen kopi), ellers null. */
  ref: string | null
}

export type LogoResult = { ok: true; logo: Logo } | { ok: false; error: 'type' | 'size' | 'unreadable' }

const MAX_BYTES = 10e6
const RASTER = /^image\/(png|jpeg|webp|gif)$/
export const MIN_W = 0.02

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const num = (s: string | null) => {
  const m = /^\s*([\d.]+)\s*(px)?\s*$/.exec(s ?? '')
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Proporsjoner fra SVG-roten (viewBox, ellers width/height), og om den mangler viewBox men har mål. */
export function svgBox(svg: string): { aspect: number | null; vb: [number, number] | null } {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return { aspect: null, vb: null }
  const vb = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (vb.length === 4 && vb[2]! > 0 && vb[3]! > 0) return { aspect: vb[2]! / vb[3]!, vb: null }
  const w = num(root.getAttribute('width')), h = num(root.getAttribute('height'))
  return w && h ? { aspect: w / h, vb: [w, h] } : { aspect: null, vb: null }
}

/**
 * SVG-en med eksplisitt størrelse i piksler (viewBox beholdes/legges til, proporsjonene bevares), så nettleseren
 * gjengir vektordataene direkte i eksportens oppløsning.
 */
export function svgAtSize(svg: string, w: number, h: number): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement
  const { vb } = svgBox(svg)
  if (!root.getAttribute('viewBox') && vb) root.setAttribute('viewBox', `0 0 ${vb[0]} ${vb[1]}`)
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  root.setAttribute('width', String(Math.max(1, Math.round(w))))
  root.setAttribute('height', String(Math.max(1, Math.round(h))))
  if (!root.getAttribute('preserveAspectRatio')) root.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  return new XMLSerializer().serializeToString(root)
}

const loadImg = (url: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image()
  img.onload = () => res(img)
  img.onerror = () => rej(new Error('img'))
  img.src = url
})

/** Leser en logo (SVG eller PNG/WebP/JPEG/GIF). SVG beholdes som tekst og vises som vektor. */
export async function readLogo(blob: Blob, name: string, ref: string | null = null): Promise<LogoResult> {
  if (blob.size > MAX_BYTES) return { ok: false, error: 'size' }
  const isSvg = blob.type === 'image/svg+xml' || /\.svg$/i.test(name)
  if (!isSvg && !RASTER.test(blob.type)) return { ok: false, error: 'type' }
  const svg = isSvg ? await blob.text() : null
  if (svg !== null && !svgBox(svg).aspect && !/<svg[\s>]/i.test(svg)) return { ok: false, error: 'unreadable' }
  const url = URL.createObjectURL(isSvg ? new Blob([svg ?? ''], { type: 'image/svg+xml' }) : blob)
  try {
    const img = await loadImg(url)
    const aspect = (svg !== null ? svgBox(svg).aspect : null) ?? (img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1)
    return { ok: true, logo: { url, name: name.slice(0, 80), svg, aspect, ref } }
  } catch {
    URL.revokeObjectURL(url)
    return { ok: false, error: 'unreadable' }
  }
}

/** Høyden som andel av bildets høyde. */
export const heightOf = (p: LogoPlacement, aspect: number, imgAspect: number) => (p.w * imgAspect) / aspect

/** Standard: 18 % av bredden, 5 % fra toppen og 5 % fra høyre kant. */
export function defaultPlacement(aspect: number, imgAspect: number): LogoPlacement {
  const w = Math.min(0.18, 0.5 * aspect / imgAspect)
  return { x: 1 - 0.05 - w, y: 0.05, w }
}

/** Holder logoen innenfor bildet (minst litt synlig) og med rimelig størrelse. */
export function clampPlacement(p: LogoPlacement, aspect: number, imgAspect: number): LogoPlacement {
  const w = clamp(p.w, MIN_W, Math.max(MIN_W, Math.min(1, aspect / imgAspect))) // høyst hele bredden og hele høyden
  const h = heightOf({ ...p, w }, aspect, imgAspect)
  return { w, x: clamp(p.x, -w * 0.9, 1 - w * 0.1), y: clamp(p.y, -h * 0.9, 1 - h * 0.1) }
}

/**
 * Proporsjonal skalering fra et hjørne (0 = øvre venstre, 1 = øvre høyre, 2 = nedre høyre, 3 = nedre venstre).
 * Motsatt hjørne står stille; (px, py) er pekerens posisjon som andel av bildet.
 */
export function resizeFrom(start: LogoPlacement, corner: number, px: number, py: number, aspect: number, imgAspect: number): LogoPlacement {
  const h0 = heightOf(start, aspect, imgAspect)
  const right = corner === 1 || corner === 2, bottom = corner === 2 || corner === 3
  const ax = right ? start.x : start.x + start.w, ay = bottom ? start.y : start.y + h0
  // bredden fra den største av horisontal og (omregnet) vertikal avstand, så skaleringen blir proporsjonal
  const byX = Math.abs(px - ax), byY = (Math.abs(py - ay) * aspect) / imgAspect
  const w = clamp(Math.max(byX, byY), MIN_W, 2)
  const h = heightOf({ ...start, w }, aspect, imgAspect)
  return { w, x: right ? ax : ax - w, y: bottom ? ay : ay - h }
}

/** Tegner logoen i eksporten. SVG gjengis først her, i nøyaktig eksportstørrelse. */
export async function drawLogo(g: CanvasRenderingContext2D, W: number, H: number, logo: Logo, p: LogoPlacement): Promise<void> {
  const w = p.w * W, h = heightOf(p, logo.aspect, W / H) * H
  if (w < 1 || h < 1) return
  let url = logo.url, temp = false
  if (logo.svg !== null) {
    url = URL.createObjectURL(new Blob([svgAtSize(logo.svg, w, h)], { type: 'image/svg+xml' }))
    temp = true
  }
  try {
    const img = await loadImg(url)
    g.save()
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, p.x * W, p.y * H, w, h)
    g.restore()
  } finally {
    if (temp) URL.revokeObjectURL(url)
  }
}
