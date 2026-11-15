/**
 * Maler etter referansevideoene (9 videotyper) og tre egne premiummaler. Alle er vanlige Motion-prosjekter bygget med
 * de samme verktøyene som i editoren (fargeklipp som plassholdere for bilder/video, tekst med animasjoner, tekstmaske,
 * tallrull, opptelling, rulletekst, bane, penselstrøk, filmstriper, overganger), så alt kan endres eller lages fra
 * bunnen av uten mal. Fargeklippene byttes med egne bilder eller videoer («Bytt» på klippet).
 */
import type { Clip, ColorClip, Overlay, TextItem } from './model'
import type { Effect } from './fx'

interface Content { clips: Clip[]; texts: TextItem[]; ov?: Overlay[] }
export interface RefTemplate { k: string; name: string; desc: string; tt: number; cat: string; motion?: 'cinematic' | 'dynamic' | 'minimal' | 'typo'; make: () => Content }

let n = 0
const fxId = () => `f${Date.now().toString(36)}${(n++).toString(36)}`
/** Filmstriper som åpner seg (effekt på klippet). */
const bars = (h = 0.12, open = 0.8): Effect[] => [{ id: fxId(), kind: 'bars', on: true, v: h, v2: open }]

const PASTEL = ['#d9e4dd', '#2f5550', '#1b3c5a', '#97cddd', '#24423d', '#efd9d4', '#f1e1c4', '#2c6a86', '#e4ded3', '#f0dcd8', '#a8c6cf', '#4b3a35']
const FLASH = ['#2f4f4a', '#7c7a12', '#5c4c55', '#c41c1c', '#0f6b5f', '#3d2b2b', '#32b27e', '#0fcc44', '#e3263f', '#7b2a8e', '#7fe20f', '#f02a17', '#ef5a0c', '#1d8d93', '#e85c97', '#244b44']

type Make = { text: (o?: Partial<TextItem>) => TextItem; colorClip: (o?: Partial<ColorClip>) => ColorClip }

/** Malene; fabrikkfunksjonene for tekst og fargeklipp kommer fra model.ts (unngår at modulene importerer hverandre). */
export function refTemplates({ text, colorClip }: Make): RefTemplate[] {
  /** Montasje: korte fargeklipp (plassholdere) etter hverandre, f.eks. i takt med musikken. */
  const montage = (cols: readonly string[], dur: number, trans: string, tdur = 0.25): Clip[] =>
    cols.map((c, i) => colorClip({ dur, c1: c, c2: c, grad: 'none', trans: { type: i ? trans : 'none', dur: tdur } }))
  return [
  {
    k: 'credits', name: 'Rulletekst «THE END»', desc: 'Video i bokstavene, så rulletekst ved siden av klippene', tt: 1.6, cat: 'Rulletekst og avslutning',
    make: () => ({
      clips: [colorClip({ dur: 3.2, c1: '#4b3b2a', c2: '#a37a4c', ang: 20, spin: 8, trans: { type: 'none', dur: 0.5 } }),
        ...montage(['#6d5a48', '#3e4a52', '#8b7d6b', '#2f3b33', '#9a8c7a', '#4e5560'], 2.2, 'fade', 0.5)],
      texts: [
        text({ start: 0, dur: 3.2, text: 'THE END', font: 'Anton', weight: 400, size: 230, anim: 'zoomout', knock: 'solid', knockColor: '#0b0b0b' }),
        text({ start: 3.4, dur: 12.6, text: 'THE END', font: 'Anton', weight: 400, size: 110, x: 0.78, y: 0.24, anim: 'fade', shadow: true }),
        text({ start: 3.8, dur: 12.2, text: 'CLASS OF 2026\n\nDIRECTOR\n[DITT NAVN]\n\nPRODUCER\n[KLASSE]\n\nSTORY BY\n[SKOLEÅR]\n\nSTUDENTS\n[NAVN PÅ ELEVENE]\n\nTEACHERS\n[NAVN PÅ LÆRERNE]\n\nSPECIAL THANKS\n[VENNER · FAMILIE]\n\nFILMED ON\n[MOBIL]', size: 30, weight: 600, upper: true, track: 0.12, lh: 1.25, x: 0.78, y: 0.5, maxW: 0.36, anim: 'scroll', shadow: true }),
      ],
    }),
  },
  {
    k: 'yearroll', name: 'Årstall som ruller', desc: 'Sifrene ruller som en teller, og bildet synes i tallene', tt: 3.4, cat: 'Kinetisk typografi',
    make: () => ({
      clips: [colorClip({ dur: 4, c1: '#000000', c2: '#000000', grad: 'none', trans: { type: 'none', dur: 0.5 } }),
        colorClip({ dur: 4, c1: '#2a1206', c2: '#f39a3d', ang: 90, spin: 4, trans: { type: 'flash', dur: 0.3 } })],
      texts: [
        text({ start: 0, dur: 4, text: '2026', rollFrom: '2025', font: 'Bebas Neue', weight: 400, size: 300, anim: 'roll' }),
        text({ start: 4, dur: 4, text: '26', font: 'Anton', weight: 400, size: 520, anim: 'zoomout', knock: 'solid', knockColor: '#000000' }),
      ],
    }),
  },
  {
    k: 'daycount', name: 'Dagteller → nytt år', desc: 'Teller dagene, ruller over til nytt år og går over i en rask bildemontasje', tt: 4.6, cat: 'Montasje og musikk',
    make: () => ({
      clips: [colorClip({ dur: 5.6, c1: '#1f3a33', c2: '#1f3a33', grad: 'none', trans: { type: 'none', dur: 0.5 } }), ...montage(PASTEL, 0.35, 'none')],
      texts: [
        text({ start: 0, dur: 2.6, text: '{n}/365', countdown: true, cdFrom: 124, cdTo: 360, cdDur: 2.3, size: 34, weight: 500, y: 0.4, anim: 'fade' }),
        text({ start: 0, dur: 2.6, text: '{n}', countdown: true, cdFrom: 34, cdTo: 360, cdDur: 2.3, font: 'Bebas Neue', weight: 400, size: 200, y: 0.52, anim: 'fade' }),
        text({ start: 2.6, dur: 1.4, text: 'GOODBYE', size: 30, weight: 700, track: 0.4, y: 0.4, anim: 'fade' }),
        text({ start: 2.6, dur: 1.4, text: '2026', font: 'Bebas Neue', weight: 400, size: 200, y: 0.52, anim: 'none' }),
        text({ start: 4, dur: 1.6, text: 'WELCOME', size: 30, weight: 700, track: 0.4, y: 0.4, anim: 'spread' }),
        text({ start: 4, dur: 1.6, text: '2027', rollFrom: '2026', font: 'Bebas Neue', weight: 400, size: 200, y: 0.52, anim: 'roll' }),
      ],
    }),
  },
  {
    k: 'flashmontage', name: 'Tittel med blitsmontasje', desc: 'Kraftig tittel, filmstriper som åpner seg og raske fargeblink i takt', tt: 1.4, cat: 'Montasje og musikk',
    make: () => ({
      clips: [colorClip({ dur: 3, c1: '#2f4f4a', c2: '#2f4f4a', grad: 'none', effects: bars(0.22, 1.2), trans: { type: 'none', dur: 0.5 } }), ...montage(FLASH, 0.32, 'flash', 0.12)],
      texts: [text({ start: 0.3, dur: 2.7, text: 'VACATION', font: 'Anton', weight: 400, size: 190, color: '#e3262b', anim: 'pop' })],
    }),
  },
  {
    k: 'travel', name: 'Reisevlogg', desc: 'Stor stedstittel, liten overtittel og tekst som går i bane', tt: 2.2, cat: 'Tittel og intro',
    make: () => ({
      clips: [colorClip({ dur: 5, c1: '#0e5a6b', c2: '#d98b4a', ang: 35, spin: 5, trans: { type: 'none', dur: 0.5 } }),
        ...montage(['#14506b', '#d9773a', '#2fa3b5', '#0d3d55', '#e9b07a', '#1f7c8a', '#0a2d3f', '#c96a3b'], 1.6, 'whip', 0.35)],
      texts: [
        text({ start: 0.2, dur: 4.8, text: 'TRAVEL VLOG', size: 30, weight: 600, track: 0.35, y: 0.42, anim: 'fade' }),
        text({ start: 0.4, dur: 4.6, text: 'YOUR LOCATION', font: 'Bebas Neue', weight: 400, size: 170, color: '#f5c25b', y: 0.52, anim: 'spread', shadow: true }),
        text({ start: 0.8, dur: 4.2, text: 'PARADISE · PARADISE · PARADISE ·', size: 28, weight: 700, track: 0.1, anim: 'orbit', orbitR: 0.34, orbitV: 0.08, x: 0.5, y: 0.5 }),
      ],
    }),
  },
  {
    k: 'fogreveal', name: 'Penselavsløring (dugget glass)', desc: 'Teksten blir et vindu som tørkes frem med penselstrøk', tt: 3.2, cat: 'Tittel og intro',
    make: () => ({
      clips: [colorClip({ dur: 7, c1: '#1c2a3d', c2: '#e3a36a', ang: 160, spin: 3, trans: { type: 'none', dur: 0.5 } })],
      texts: [text({ start: 0.4, dur: 6.6, text: 'NEW YORK', font: 'Anton', weight: 400, size: 210, anim: 'brush', knock: 'blur', knockColor: '#dfe6ec' })],
    }),
  },
  {
    k: 'monthdump', name: 'Månedsdump (redaksjonell)', desc: 'Serif-tittel med kapittel og signatur, filmstriper og montasje', tt: 2.4, cat: 'Tittel og intro',
    make: () => ({
      clips: [colorClip({ dur: 4, c1: '#3a3326', c2: '#8a7550', ang: 70, spin: 3, effects: bars(0.16, 1), trans: { type: 'none', dur: 0.5 } }),
        ...montage(['#6b5d48', '#4a5560', '#8d7f6a', '#30393d', '#a08c6e', '#575d4c', '#2e3438', '#7a6a55', '#45505a', '#958467'], 1.2, 'fade', 0.3)],
      texts: [
        text({ start: 0.8, dur: 3.2, text: 'Chapter 05 of 12', size: 18, weight: 500, track: 0.15, color: '#efe3c2', y: 0.33, anim: 'fade' }),
        text({ start: 1, dur: 3, text: 'May\nDump', font: 'Playfair Display', weight: 500, size: 150, lh: 0.9, color: '#e8d39a', anim: 'blur' }),
        text({ start: 1.4, dur: 2.6, text: 'ARCHIVED BY YOUR NAME', size: 14, weight: 700, track: 0.25, color: '#efe3c2', y: 0.7, anim: 'fade' }),
      ],
    }),
  },
  {
    k: 'lyrics', name: 'Kinetisk sangtekst', desc: 'Ord for ord i spredt serif, ny bakgrunnsfarge for hver linje', tt: 1.6, cat: 'Kinetisk typografi',
    make: () => {
      const lines: [string, string, number, number, number][] = [
        ['#a50d0d', 'JUSTIN', 0.5, 0.5, 90], ['#5a5254', 'show you\noff', 0.52, 0.5, 46], ['#08505f', 'I\nwanna\nshow\nyou\noff', 0.55, 0.42, 40],
        ['#7d6a12', 'what you', 0.62, 0.48, 38], ['#123e36', 'a\nbillion', 0.55, 0.36, 46], ['#a35d4f', 'party\nlike', 0.62, 0.32, 44],
      ]
      const d = 3.2
      return {
        clips: lines.map(([c], i) => colorClip({ dur: d, c1: c, c2: c, grad: 'none', trans: { type: i ? 'none' : 'none', dur: 0.3 } })),
        texts: lines.map(([, s, x, y, size], i) => text({ start: i * d + 0.2, dur: d - 0.3, text: s, font: 'Playfair Display', weight: 500, size, x, y, lh: 1, anim: 'words', align: 'center' })),
      }
    },
  },
  {
    k: 'recap', name: 'Årsoppsummering (ordstabel)', desc: 'Ord i ulike størrelser stables, så en rolig bildemontasje', tt: 2.8, cat: 'Kinetisk typografi',
    make: () => {
      const W = (start: number, s: string, size: number, x: number, y: number) => text({ start, dur: 5.6 - start, text: s, font: 'Playfair Display', weight: 500, size, x, y, anim: 'rise' })
      return {
        clips: [colorClip({ dur: 5.6, c1: '#5a4652', c2: '#5a4652', grad: 'none', trans: { type: 'none', dur: 0.5 } }),
          ...montage(['#2e5a55', '#24423d', '#b85a45', '#efd0cd', '#b44c39', '#97cddd', '#d9e4dd', '#a8d4e0', '#173040', '#6b3c33', '#123446', '#efdfd9'], 0.9, 'fade', 0.15)],
        texts: [W(0.2, 'And', 140, 0.5, 0.24), W(0.6, 'With', 170, 0.5, 0.34), W(1, 'that', 48, 0.3, 0.44), W(1.1, 'The', 170, 0.56, 0.44), W(1.5, '2026', 190, 0.42, 0.56),
          W(2.6, 'Comes', 170, 0.5, 0.7), W(3, 'to an', 48, 0.3, 0.8), W(3.1, 'End', 170, 0.58, 0.8)],
      }
    },
  },
  // ---------- tre egne premiummaler ----------
  {
    k: 'launch', motion: 'dynamic', name: 'Premium: Lansering', desc: 'Mørk scene, nedtelling med tallrull, glitch-tittel og blitsmontasje', tt: 4.2, cat: 'Premium',
    make: () => ({
      clips: [colorClip({ dur: 6, c1: '#07040f', c2: '#3b1d6e', grad: 'radial', effects: bars(0.1, 0.6), trans: { type: 'none', dur: 0.5 } }),
        ...montage(['#3b1d6e', '#e53fbf', '#120a24', '#29c4d6', '#5a2bb0', '#f5b82c'], 0.45, 'flash', 0.12),
        colorClip({ dur: 4, c1: '#07040f', c2: '#3b1d6e', grad: 'radial', trans: { type: 'zoom-in', dur: 0.6 } })],
      texts: [
        text({ start: 0.2, dur: 2.6, text: 'LANSERING OM', size: 30, weight: 700, track: 0.4, color: '#c9b8ff', y: 0.38, anim: 'spread' }),
        text({ start: 0.2, dur: 2.6, text: '{n}', countdown: true, cdFrom: 10, cdTo: 1, cdDur: 2.4, font: 'Bebas Neue', weight: 400, size: 260, y: 0.54, anim: 'none', grad: true, color: '#ffffff', color2: '#e53fbf' }),
        text({ start: 3, dur: 3, text: 'NY SESONG', font: 'Anton', weight: 400, size: 180, anim: 'glitch', shadow: true }),
        text({ start: 3.6, dur: 2.4, text: '14. september · kl. 19', size: 40, weight: 600, y: 0.64, anim: 'rise', color: '#c9b8ff' }),
        text({ start: 8.7, dur: 4, text: 'VELKOMMEN', font: 'Anton', weight: 400, size: 200, anim: 'zoomout', knock: 'solid', knockColor: '#07040f' }),
      ],
    }),
  },
  {
    k: 'chapters', motion: 'cinematic', name: 'Premium: Kapitler', desc: 'Elegant serif med kapitteltall som ruller og visk-overganger', tt: 2.2, cat: 'Premium',
    make: () => {
      const C = ['#f1e9dc', '#e6d3c0', '#d9e1d6']
      const T = ['Velkommen', 'Fellesskap', 'Håp']
      return {
        clips: C.map((c, i) => colorClip({ dur: 4, c1: c, c2: c, grad: 'none', trans: { type: i ? 'wipe-r' : 'none', dur: 0.7 } })),
        texts: T.flatMap((s, i) => [
          text({ start: i * 4 + 0.2, dur: 3.6, text: `0${i + 1}`, rollFrom: i ? `0${i}` : '00', font: 'Bebas Neue', weight: 400, size: 70, color: '#8a5a3b', y: 0.34, anim: 'roll' }),
          text({ start: i * 4 + 0.5, dur: 3.3, text: s, font: 'Playfair Display', weight: 500, italic: false, size: 140, color: '#1d1a17', y: 0.5, anim: 'letters' }),
          text({ start: i * 4 + 1, dur: 2.8, text: 'Søndag kl. 11 · Alle er velkommen', size: 30, weight: 500, color: '#5b4a3f', y: 0.64, anim: 'fade' }),
        ]),
      }
    },
  },
  {
    k: 'kinetic', motion: 'typo', name: 'Premium: Kinetisk promo', desc: 'Store ord som slår inn i takt, tekstmaske og fartsfylte overganger', tt: 1.8, cat: 'Premium',
    make: () => {
      const words: [string, string, string][] = [['STERKERE', '#ff5a36', '#1a1a1a'], ['SAMMEN', '#1a1a1a', '#f5b82c'], ['HVER', '#f5b82c', '#1a1a1a'], ['UKE', '#1a1a1a', '#ff5a36']]
      return {
        clips: [...words.map(([, bg], i) => colorClip({ dur: 1.2, c1: bg, c2: bg, grad: 'none', trans: { type: i ? 'push-u' : 'none', dur: 0.25 } })),
          colorClip({ dur: 4, c1: '#ff5a36', c2: '#f5b82c', ang: 120, spin: 20, trans: { type: 'zoom-in', dur: 0.4 } })],
        texts: [...words.map(([w, , fg], i) => text({ start: i * 1.2 + 0.05, dur: 1.1, text: w, font: 'Anton', weight: 400, size: 230, color: fg, anim: i % 2 ? 'drop' : 'pop' })),
          text({ start: 4.9, dur: 4, text: 'UNGDOM', font: 'Anton', weight: 400, size: 260, anim: 'brush', knock: 'solid', knockColor: '#111111' }),
          text({ start: 5.6, dur: 3.3, text: 'Fredager kl. 19', size: 44, weight: 700, y: 0.68, anim: 'rise' })],
      }
    },
  },
  ]
}
