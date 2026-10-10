/**
 * Offentlig backend-konfigurasjon, lagt inn ved bygging av vite.config.ts etter kontroll i
 * media-lab/build/env-guard.js. Inneholder bare URL, publiseringsnøkkel, prosjekt-ID og mål. Ingen andre deler av
 * appen leser miljøvariabler.
 */
declare const __CH_BACKEND__: { url: string; key: string; ref: string; target: string } | null

export interface BackendConfig {
  readonly url: string
  readonly publishableKey: string
  readonly projectRef: string
  readonly target: 'local' | 'preview' | 'production' | string
}

function read(): BackendConfig | null {
  const raw = typeof __CH_BACKEND__ !== 'undefined' ? __CH_BACKEND__ : null
  if (!raw || typeof raw.url !== 'string' || typeof raw.key !== 'string') return null
  return Object.freeze({ url: raw.url, publishableKey: raw.key, projectRef: raw.ref, target: raw.target })
}

export const backend: BackendConfig | null = read()
