import { scrubText } from './feedback-core'

/**
 * De siste feilene på siden (høyst 10), så en feilrapport kan ta dem med (som feedback-errors.js i dagens app).
 * Bare melding (renset og avkortet), type, kode og fil/linje – aldri stakk, data, adresseparametere eller nettverkstrafikk.
 * Bare i minnet.
 */
export interface CapturedError { time: string; kind: string; message: string; code?: string | null; source?: string; line?: number | null }
const LOG: CapturedError[] = []
const push = (e: Omit<CapturedError, 'time'>) => {
  LOG.push({ time: new Date().toISOString(), ...e })
  if (LOG.length > 10) LOG.shift()
}
const fileOf = (s: string) => {
  try {
    const u = new URL(s, location.href)
    return u.origin === location.origin ? u.pathname.slice(0, 120) : 'ekstern kilde'
  } catch {
    return ''
  }
}

let installed = false
export function installErrorCapture(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (ev) => {
    if (!ev?.message) return // lasting av bilder o.l. har ingen melding
    push({ kind: 'JS-feil', message: scrubText(String(ev.message)).slice(0, 300), source: fileOf(ev.filename || ''), line: ev.lineno || null })
  })
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev?.reason as { message?: string; code?: string } | undefined
    const msg = r && (r.message || r.code) ? (r.code ? r.code + ': ' : '') + (r.message || '') : String(ev?.reason)
    push({ kind: 'Ubehandlet løfte', code: r?.code ? String(r.code).slice(0, 60) : null, message: scrubText(msg).slice(0, 300) })
  })
}
/** Feil appen selv har vist brukeren. */
export function noteError(code: string | null, message: string): void {
  push({ kind: 'Vist feilmelding', code: code ? String(code).slice(0, 60) : null, message: scrubText(String(message || '')).slice(0, 300) })
}
export const recentErrors = (): CapturedError[] => LOG.slice()
