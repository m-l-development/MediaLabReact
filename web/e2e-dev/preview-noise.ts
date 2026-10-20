/**
 * Kjent støy i Vercel-forhåndsvisninger: Vercel legger inn sitt eget verktøylinjeskript (vercel.live), og appens CSP
 * blokkerer det, som den skal. Det finnes ikke i produksjonen. Bare akkurat den blokkeringen ignoreres, og bare mot en
 * forhåndsvisning; andre CSP-brudd, konsollfeil og HTTP-feil (4xx/5xx) telles som før.
 */

/** Forhåndsvisninger av media-lab-react-vyef – samme mønster som `run-dev.mjs --remote` (aldri produksjonsadressen). */
export const PREVIEW_RE = /^https:\/\/media-lab-react-vyef-[a-z0-9-]+-media-lab3\.vercel\.app$/

export const isPreview = (base: string): boolean => PREVIEW_RE.test(base.replace(/\/$/, ''))

/** Chromes melding når CSP blokkerer Vercels verktøylinjeskript. */
const VERCEL_LIVE_CSP = /^Loading the script 'https:\/\/vercel\.live\/[^'\s]*' violates the following Content Security Policy directive: "script-src /

/** Konsollmeldingen er den kjente vercel.live-blokkeringen i en forhåndsvisning. */
export const isVercelLiveCsp = (base: string, text: string): boolean => isPreview(base) && VERCEL_LIVE_CSP.test(text)

/** Forespørselen som ble blokkert, gikk til vercel.live (og vi er i en forhåndsvisning). */
export function isVercelLiveRequest(base: string, url: string): boolean {
  if (!isPreview(base)) return false
  try {
    return new URL(url).hostname === 'vercel.live'
  } catch {
    return false
  }
}
