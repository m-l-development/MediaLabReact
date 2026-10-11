// Kildeteksten (Vite ?raw) – oxlint kjenner ikke spørringen.
// oxlint-disable-next-line import/default
import playerSrc from './player.js?raw'
import type { PlayerPayload } from './player'

/**
 * Fullskjerm-spilleren (.html): én fil med motoren, data, bilder, video, skrift og lyd. Motoren bygges inn som den
 * uendrede kildeteksten til player.js (samme kode som forhåndsvisningen), så spilleren ser helt lik ut og ikke
 * avhenger av byggets minifisering. CSP-en tillater bare innebygd innhold (ingen nettverk).
 */
const ENGINE = playerSrc.replace(/^export function /gm, 'function ')

/** Linje- og avsnittsskille (U+2028/U+2029) er gyldige i JSON, men avslutter en linje i et skript. */
const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const BS = String.fromCharCode(92)

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

export function buildPlayerHTML(p: PlayerPayload, fontCSS: string, lang = 'no'): string {
  const json = JSON.stringify(p).replaceAll('<', BS + 'u003c').replaceAll(LS, BS + 'u2028').replaceAll(PS, BS + 'u2029')
  return (
    `<!doctype html>\n<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src data:">` +
    `<meta name="referrer" content="no-referrer"><title>${esc(p.title || 'Ukeprogram')}</title><style>${fontCSS}html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}</style></head>` +
    `<body><canvas id="c"></canvas><script>\nvar P=${json};\n${ENGINE}\nvar R=__ukeloopRendererFactory();\n__ukeloopPlayerBoot(P,R);\n</script></body></html>`
  )
}
