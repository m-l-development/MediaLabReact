/* Tilbakemeldinger: de siste feilene på siden (høyst 10), slik at en feilrapport kan ta dem med.
   Fanger ufangede JS-feil og avviste løfter, og feil som appene selv viser (noteError). Lagrer bare melding (renset og
   avkortet), type, kode og fil/linje – aldri stakk, data, adresseparametere eller nettverkstrafikk. Bare i minnet. */
import { scrubText } from './feedback-core.js';

const LOG = [];
const push = e => { LOG.push({ time: new Date().toISOString(), ...e }); if (LOG.length > 10) LOG.shift(); };
const fileOf = s => { try { const u = new URL(s, location.href); return u.origin === location.origin ? u.pathname.slice(0, 120) : 'ekstern kilde'; } catch (e) { return ''; } };

let installed = false;
export function installErrorCapture() {
  if (installed || typeof window === 'undefined') return; installed = true;
  window.addEventListener('error', ev => {
    if (!ev || !ev.message) return;   // feil ved lasting av bilder o.l. har ingen melding – hoppes over
    push({ kind: 'JS-feil', message: scrubText(String(ev.message)).slice(0, 300), source: fileOf(ev.filename || ''), line: ev.lineno || null });
  });
  window.addEventListener('unhandledrejection', ev => {
    const r = ev && ev.reason, msg = r && (r.message || r.code) ? (r.code ? r.code + ': ' : '') + (r.message || '') : String(r);
    push({ kind: 'Ubehandlet løfte', code: r && r.code ? String(r.code).slice(0, 60) : null, message: scrubText(msg).slice(0, 300) });
  });
}
/* Feil som appen selv har vist brukeren (f.eks. ConnectHub Admin sin feilmelding). */
export function noteError(code, message) { push({ kind: 'Vist feilmelding', code: code ? String(code).slice(0, 60) : null, message: scrubText(String(message || '')).slice(0, 300) }); }
export const recentErrors = () => LOG.slice();
