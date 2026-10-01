/* Offentlig backend-konfigurasjon. __CH_BACKEND__ legges inn ved bygging av vite.config.js (connecthubEnv),
   etter kontroll i build/env-guard.js. Inneholder bare offentlige verdier: URL, publiseringsnøkkel, prosjekt-ID og mål.
   Ingen andre deler av appen skal lese miljøvariabler. */
/* global __CH_BACKEND__ */
const raw = typeof __CH_BACKEND__ !== 'undefined' ? __CH_BACKEND__ : null;

export const backend = raw && typeof raw.url === 'string' && typeof raw.key === 'string'
  ? Object.freeze({ url: raw.url, publishableKey: raw.key, projectRef: raw.ref, target: raw.target })
  : null;

export const hasBackend = () => backend !== null;
