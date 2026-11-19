/**
 * Fontpopupen slik alle verktøyene i appen bruker den: samme <FontPicker> (uendret), samme fontliste (fonts.json),
 * samme base og palett. Innpakningen oversetter mellom tekstlagets lagrede verdier og popupen:
 * - fonten lagres som navn (+ bredde for Expanded), som før; popupen får id-en
 * - Bildefyll: et opplastet bilde (blob:) lagres i appens egen lagring (`storeImage`), og textStyle får referansen;
 *   «Bruk bildet i designet» lagrer designbildets referanse. Popupen og lerretet får adressen (`resolveImage`).
 */
import { useEffect, useRef } from 'react'
import FontPicker, { type FontEntry } from './FontPicker.jsx'
import { normalizeStyle, type TextStyle } from './TextStyle.jsx'
import { DEFAULT_PALETTE, FONT_BASE, FONT_CATEGORIES, FONT_LIST, fontPatch, fontValue } from './app-fonts'
import { imageUrlOf, withImageUrl } from './images'
import './app-fontpicker.css'

export interface AppFontPickerProps {
  /** Lagets font (navn) og bredde (prosent). */
  font: string
  stretch?: number | null | undefined
  onFont: (p: { font: string; stretch?: number }) => void
  /** Midlertidig font på lerretet (null = tilbake til valgt font). Lagres aldri. */
  onPreview?: ((f: FontEntry | null) => void) | undefined
  text: string
  textStyle: Partial<TextStyle> | null | undefined
  onTextStyleChange: (ts: TextStyle) => void
  color: string
  onColor?: ((c: string) => void) | undefined
  palette?: string[] | null | undefined
  /** Designets bilde (referanse) til «Bruk bildet i designet». */
  backgroundRef?: string | null | undefined
  /** Referanse → adresse (bilder i appens lagring). */
  resolveImage?: ((ref: string) => string | null) | undefined
  /** Lagrer et opplastet bilde (blob:) i appens lagring og gir referansen. */
  storeImage?: ((blob: Blob) => Promise<string | null>) | undefined
  baseSize: number
  label?: string | undefined
}

export default function AppFontPicker(p: AppFontPickerProps) {
  const latest = useRef(p)
  // popupen er ett rulleområde (app-fontpicker.css): den åpnes alltid med verktøylinjen, fanene, søket og filtrene
  // synlige øverst, også når den valgte fonten ligger langt nede i listen (den ruller seg ellers ned til fonten)
  const wrap = useRef<HTMLDivElement>(null)
  // rett etter åpningen flytter innholdet seg (til toppen) under en musepeker som står stille: fonten som havner under
  // den, skal ikke forhåndsvises på lerretet (de første 400 ms etter åpningen)
  const openedAt = useRef(0)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let had = false
    const mo = new MutationObserver(() => {
      const pop = el.querySelector<HTMLElement>('.fp-pop')
      if (pop && !had) {
        openedAt.current = performance.now()
        // valgt font rulles inn av popupen selv (etter at den er vist, senere på tregere enheter): tilbake til toppen
        // noen ganger det første halve sekundet, men aldri etter at brukeren selv har rullet, trykket eller brukt tastene
        let mine = true
        const stop = () => { mine = false }
        for (const ev of ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const) pop.addEventListener(ev, stop, { once: true, passive: true })
        const top = () => { if (mine && pop.isConnected) pop.scrollTop = 0 }
        requestAnimationFrame(() => requestAnimationFrame(top))
        for (const ms of [120, 300, 500]) setTimeout(top, ms)
      }
      had = !!pop
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])
  useEffect(() => {
    latest.current = p
  })
  const bgUrl = imageUrlOf(p.backgroundRef, p.resolveImage)
  const shown = withImageUrl(p.textStyle, p.resolveImage)
  const onStyle = (ts: TextStyle) => {
    const cur = latest.current
    const img = ts.effect?.image
    const prevRef = cur.textStyle?.effect?.image
    const prevUrl = imageUrlOf(prevRef, cur.resolveImage)
    let out: TextStyle = ts
    // Fet slått av/på: en tykkelse fra et eldre lag (weight) ville ellers overstyrt knappen
    const was = normalizeStyle(cur.textStyle ?? {})
    if (ts.weight && was.bold !== ts.bold) out = { ...out, weight: null }
    if (img && prevRef && img === prevUrl) out = { ...out, effect: { ...out.effect, image: prevRef } }
    else if (img && cur.backgroundRef && img === bgUrl) out = { ...out, effect: { ...out.effect, image: cur.backgroundRef } }
    cur.onTextStyleChange(out)
    if (img && img.startsWith('blob:') && cur.storeImage) {
      // opplastet bilde: lagres i appens lagring; textStyle får referansen (aldri en blob:-adresse som lagres)
      void fetch(img)
        .then((r) => r.blob())
        .then((b) => cur.storeImage!(b))
        .then((ref) => {
          const now = latest.current
          if (!ref || now.textStyle?.effect?.image !== img) return
          now.onTextStyleChange({ ...normalizeStyle(now.textStyle), effect: { ...normalizeStyle(now.textStyle).effect, image: ref } })
        })
        .catch(() => {})
    }
  }
  return (
    // Esc i popupen lukker bare popupen (ikke også markeringen i editoren)
    <div ref={wrap} style={{ display: 'contents' }} data-keep-color="" onKeyDown={(e) => { if (e.key === 'Escape' && (e.target as HTMLElement).closest?.('.fp-pop')) e.stopPropagation() }}>
    <FontPicker
      fonts={FONT_LIST}
      categories={FONT_CATEGORIES}
      value={fontValue(p.font, p.stretch)}
      onChange={(f) => p.onFont(fontPatch(f, p.stretch))}
      onPreview={(f) => { if (!f || !openedAt.current || performance.now() - openedAt.current > 400) p.onPreview?.(f) }}
      previewText={p.text}
      base={FONT_BASE}
      label={p.label ?? 'Font'}
      textStyle={shown}
      onTextStyleChange={onStyle}
      textColor={p.color}
      {...(p.onColor ? { onTextColorChange: p.onColor } : {})}
      palette={p.palette?.length ? p.palette : DEFAULT_PALETTE}
      backgroundImage={bgUrl}
      baseSize={p.baseSize}
    />
    </div>
  )
}
