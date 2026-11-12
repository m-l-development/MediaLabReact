import type { Doc } from '../model'

/**
 * Ferdige maler fra designsamlingen «Thumbnail-maler for videoer» (del 1–3, 151 maler; docs/maler-og-fonter.md, fase 3).
 * Generert av web/tools/maler/convert-thumbs.mjs fra originalene (tools/maler/thumbnail-originaler.html) – ikke rediger
 * thumbs.json for hånd. Alt er vanlige lag (tekst, bilde, form), så malene kan endres som andre maler.
 */
export interface LibTemplate {
  id: string
  code: string
  part: number
  /** Kategori i materialet: Generell video, Bibelvideo, Direktesending, Promo, Trailer, Teaser. */
  cat: string
  name: string
  desc: string
  doc: Doc
}

/** Kategoriene i materialets rekkefølge. */
export const LIB_CATS = ['Generell video', 'Bibelvideo', 'Direktesending', 'Promo', 'Trailer', 'Teaser'] as const

let lib: Promise<LibTemplate[]> | null = null
/** Malene lastes først når de trengs (egen fil, ca. 100 kB komprimert). */
export function loadLibrary(): Promise<LibTemplate[]> {
  lib ??= import('./thumbs.json').then((m) => m.default as unknown as LibTemplate[])
  return lib
}
