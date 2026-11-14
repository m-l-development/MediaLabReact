import type { PdDoc } from '../model'

/**
 * Ferdige maler fra «Designmalsamling for fotoverktøy – Alle maler 001–100» (docs/maler-og-fonter.md, fase 5).
 * Generert av web/tools/maler/convert-photos.mjs fra originalene (tools/maler/photo-originaler.html) – ikke rediger
 * photos.json for hånd. Alt er vanlige lag, og fargevalget virker på dem som på de andre malene.
 */
export interface LibPhoto {
  /** Nummer i materialet (001–100). */
  id: string
  name: string
  cat: string
  format: string
  doc: PdDoc
}

/** Kategoriene i materialets rekkefølge (20 maler hver). */
export const LIB_CATS = ['Arrangement og plakater', 'Program, ukeplan og kalender', 'Festival og konsert', 'Bibelvers, sitat og typografi', 'Hverdag, kafé, info og sosiale medier'] as const

let lib: Promise<LibPhoto[]> | null = null
/** Malene lastes først når de trengs (egen fil). */
export function loadLibrary(): Promise<LibPhoto[]> {
  lib ??= import('./photos.json').then((m) => m.default as unknown as LibPhoto[])
  return lib
}
