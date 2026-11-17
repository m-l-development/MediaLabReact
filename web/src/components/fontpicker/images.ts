/**
 * Bildefyll: textStyle lagrer en referanse til bildet i appens lagring (f.eks. `m:<id>`), eller en data:-adresse
 * (popupens eksempelbilde). <StyledText> og popupen trenger adressen bildet vises med.
 */
import type { TextStyle } from './TextStyle.jsx'

const isUrl = (v: string) => /^(data:|blob:|https?:)/.test(v)

/** Adressen et lagret Bildefyll-bilde vises med. */
export function imageUrlOf(ref: string | null | undefined, resolve?: (ref: string) => string | null): string | undefined {
  if (!ref) return undefined
  if (isUrl(ref)) return ref
  return resolve?.(ref) ?? undefined
}

/** textStyle med Bildefyll-referansen byttet til adressen (til <StyledText> og popupen). */
export function withImageUrl(ts: Partial<TextStyle> | null | undefined, resolve?: (ref: string) => string | null): Partial<TextStyle> | null | undefined {
  const img = ts?.effect?.image
  if (!ts || !img || !ts.effect) return ts
  const url = imageUrlOf(img, resolve)
  return url === img ? ts : { ...ts, effect: { ...ts.effect, image: url ?? '' } }
}

/** Referansen (ikke adresse) til et Bildefyll-bilde i appens lagring, eller null. */
export function imageRefOf(ts: Partial<TextStyle> | null | undefined): string | null {
  const img = ts?.effect?.type === 'imagefill' ? ts.effect.image : null
  return img && !isUrl(img) ? img : null
}

/**
 * Kontroll av et lagret textStyle (fra fil, database eller sikkerhetskopi): et vanlig JSON-objekt av rimelig størrelse,
 * ellers null. Bildefyll-bildet går gjennom `mapImage` (referanse → ny referanse, eller null når bildet ikke finnes);
 * blob:-adresser lagres aldri. Resten sendes uendret tilbake til popupen.
 */
export function cleanTextStyle(v: unknown, mapImage: (img: string) => string | null): TextStyle | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  let o: TextStyle
  try {
    const j = JSON.stringify(v)
    if (j.length > 4_000_000) return null
    o = JSON.parse(j) as TextStyle
  } catch {
    return null
  }
  const img = o.effect && typeof o.effect === 'object' ? o.effect.image : undefined
  if (typeof img === 'string' && img) {
    const keep = img.startsWith('data:image/') ? img : img.startsWith('blob:') || /^https?:/.test(img) ? null : mapImage(img)
    o.effect = { ...o.effect, image: keep ?? '' }
  }
  return o
}
