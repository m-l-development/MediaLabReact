/**
 * De 13 referansevideoene som redigerbare Motion-maler (analyse: docs/motion-referansemaler.md). Hvert bilde- og
 * videofelt er en plassholder med nummer («Klipp 3») som byttes med «Bytt bilde eller video» – samme nummer flere steder
 * er samme innhold og byttes samtidig. Alt er vanlige Motion-lag (klipp med overganger, tekst med animasjoner og
 * keyframes, tekstmaske, rammer/bilde-i-bilde, filmstriper), så malene kan endres fritt eller bygges uten mal.
 */
import type { Effect } from './fx'
import type { Key } from './kf'
import type { Clip, ColorClip, Overlay, TextItem } from './model'

interface Content { clips: Clip[]; texts: TextItem[]; ov?: Overlay[] }
export interface RefTemplate { k: string; name: string; desc: string; tt: number; cat: string; bpm?: number; motion?: 'cinematic' | 'dynamic' | 'minimal' | 'typo'; make: () => Content }
type Make = { text: (o?: Partial<TextItem>) => TextItem; colorClip: (o?: Partial<ColorClip>) => ColorClip; frame: (o?: Partial<Overlay>) => Overlay }

let n = 0
const fxId = () => `f${Date.now().toString(36)}${(n++).toString(36)}`
/** Filmstriper som åpner seg fra en tynn stripe (v = høyden til slutt, open = sekunder). */
const bars = (v: number, open: number): Effect[] => [{ id: fxId(), kind: 'bars', on: true, v, v2: open }]
const K = (...a: [number, number, Key['e']?][]): Key[] => a.map(([t, v, e]) => (e ? { t, v, e } : { t, v }))

/** Pastellene og de mettede fargene originalmalene bruker på plassholderne. */
const PASTEL = ['#e7d3c3', '#263c4f', '#d5e0d3', '#ecc24f', '#e4e4e2', '#8cbfc3', '#e7aab6', '#d6c6ba', '#eeb366', '#cde0e7', '#e6d4c4', '#e9a588', '#89c3db', '#b2a9d1', '#d46a45', '#ece0cf', '#2c5d6e', '#c9b9a8']
const BOLD = ['#0e4a4f', '#808018', '#2f4a43', '#0d6b7c', '#e12a26', '#b10c18', '#888a77', '#9a6460', '#22d755', '#8c1550', '#f2bba3', '#f3ab66', '#a5f0cf', '#6b5963', '#0b4d52', '#a51219', '#2f4842', '#09838c']
/**
 * Kuttene i originalene, målt med bildeforskjell (15 bilder/s) i forhåndsvisningsfeltet: første kutt (s) og lengden på
 * hvert klipp etter det. Klippene skifter på takten i musikken (tempo målt i lydsporet) – derfor er lengdene ujevne.
 */
const CUTS = {
  theend: { first: 6.6, iv: [0.2, 0.13, 0.33, 0.47, 0.6, 0.47, 0.53, 0.53, 0.6, 0.47, 0.53, 0.53, 0.53, 0.47, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.47, 0.6, 0.47, 0.53, 0.53, 0.53, 0.53, 0.6] },
  yearmontage: { first: 5.867, iv: [0.6, 0.6, 0.47, 0.6, 0.6, 0.53, 0.53, 0.53, 0.67, 0.47, 0.53, 0.53, 0.6, 0.6, 0.47, 0.53, 0.6, 0.6, 0.47, 0.6, 0.53, 0.53, 0.67, 0.47, 0.6, 0.47, 0.67, 0.47, 0.6, 0.53, 0.53] },
  october: { first: 2.4, iv: [0.13, 0.47, 0.73, 0.8, 0.67, 0.73, 0.73, 0.73, 0.73, 0.73, 0.67, 0.93, 0.47, 0.8, 0.73, 0.73, 0.13, 0.2, 0.2, 0.2, 0.2, 0.53, 0.67, 0.8, 0.67, 0.73, 0.73, 0.67, 0.73, 0.73, 0.73, 0.73, 0.67, 0.8, 0.73, 0.87, 0.4, 0.33, 0.67] },
  travel: { first: 7.667, iv: [0.2, 0.13, 0.2, 0.13, 0.27, 0.2, 0.2, 0.2, 0.2, 1.53, 1.53, 1.6, 1.53, 1.53, 1.53, 1.53, 1.53, 1.6, 1.53] },
  daycount: { first: 5.6, iv: [0.47, 0.13, 0.33, 0.13, 0.2, 0.13, 0.2, 0.13, 0.53, 0.13, 0.13, 0.2, 0.13, 0.2, 0.13, 0.47, 0.4, 0.13, 0.2, 0.33, 0.13, 0.2, 0.13, 0.67, 0.27, 0.2, 0.13, 0.8, 0.67, 0.2, 0.13, 0.27, 0.13, 0.27, 0.6, 0.2, 0.2, 0.13, 0.67, 0.73, 0.27, 0.2, 0.13, 0.2, 0.2, 0.8, 0.2, 0.13, 0.13, 0.2, 0.4, 0.4] },
  maydump: { first: 4.133, iv: [0.2, 1.27, 0.73, 0.6, 1.27, 1.13, 0.13, 1.07, 0.8, 0.6, 1, 1.6, 0.6, 0.6, 0.6, 0.67] },
  lyrics: { first: 6.667, iv: [4.27, 2.53, 4.27, 2.13, 1.67, 3, 3.33, 3.47, 0.8, 0.53, 0.47, 3.07, 3.07, 7.87] },
  daycount916: { first: 6.867, iv: [0.47, 0.6, 0.53, 0.6, 0.53, 0.53, 0.6, 0.53, 0.53, 0.53, 0.6, 0.53, 0.6, 0.47, 0.6, 0.53, 0.6, 0.53, 0.53, 0.53, 0.6, 0.47, 0.6, 0.6, 0.53] },
  theend916: { first: 5.933, iv: [0.93, 0.93, 0.93, 1, 1, 0.93, 0.93, 1, 0.93, 1, 0.93, 0.87, 1, 1, 0.93, 0.93, 1, 0.93, 1, 1, 0.93, 1, 0.87, 1, 1, 2.33] },
  vacation: { first: 4.8, iv: [0.13, 0.67, 0.87, 0.8, 2.47, 0.4, 0.4, 0.4, 0.4, 1.67, 0.4, 0.33, 0.93, 0.8, 0.8, 0.4, 0.13, 0.27, 0.4, 0.4, 1.67, 0.4, 0.4, 0.8] },
  andwith: { first: 6.6, iv: [0.13, 0.27, 0.47, 0.47, 0.4, 0.47, 0.4, 0.53, 1.67, 0.53, 0.33, 0.47, 0.4, 0.4, 0.47, 0.47, 1.73, 0.53, 0.33, 0.47, 0.47, 0.4, 0.53, 0.33, 0.53, 0.33, 1.33, 0.87, 0.47, 0.47, 0.47, 0.4, 0.4, 0.47, 0.4, 0.53, 0.4, 0.47, 0.33, 0.53, 0.4, 0.4, 0.53, 0.33, 0.47, 0.47, 0.47, 0.4, 0.4, 0.47, 0.4, 0.87, 0.53, 0.33, 0.47, 0.4, 0.47, 0.47, 0.4, 0.53, 0.33, 0.53, 0.4, 0.4, 0.47, 0.4, 0.53, 0.4, 0.47, 0.33, 0.47, 0.47, 0.47, 0.47, 0.33, 0.53, 0.33, 0.53, 0.4, 0.4, 0.53, 0.33, 0.6, 0.33, 0.47, 0.4, 0.53, 0.33, 0.47, 0.47] },
} as const
const FILM = ['#3b4b52', '#6e5a45', '#2d3a3f', '#8a7356', '#41505a', '#5f5245', '#2f3d38', '#7a6a58']

function shade(h: string, t: number): string {
  const v = parseInt(h.slice(1), 16)
  const f = (c: number) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)
  return '#' + [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')
}

export function refTemplates13({ text, colorClip, frame }: Make): RefTemplate[] {
  /** Plassholder nr. i: pastellflate med svak loddrett gradient og nummer (som originalens «Clip N»). */
  const ph = (i: number, dur: number, col: string, tr = 'none', td = 0.2, o: Partial<ColorClip> = {}): ColorClip =>
    colorClip({ ph: `Klipp ${i}`, dur, c1: shade(col, -0.05), c2: shade(col, 0.07), grad: 'linear', ang: 90, trans: { type: tr, dur: td }, ...o })
  /** Montasje med originalens rytme: plassholdere fra nr. i0 med lengdene i `iv`, og et siste klipp på `last` s. */
  const cutSeq = (i0: number, iv: readonly number[], pal: readonly string[], last: number): Clip[] =>
    [...iv, last].map((d, j) => ph(i0 + j, d, pal[(i0 + j) % pal.length] as string))
  /** Bilde-i-bilde-ramme som plassholder (spretter inn; kan vokse til fullskjerm med keyframes). */
  const pip = (i: string, o: Partial<Overlay>): Overlay =>
    frame({ ph: `Klipp ${i}`, name: `Klipp ${i}`, radius: 0, border: 0, shadow: true, anim: 'pop', shape: { fill: (o.shape?.fill ?? '#c8b8a8'), fill2: null, ang: 90 }, ...o })
  const CREDITS = 'CLASS OF\n2026\n\nDIRECTOR\n[YOUR NAME]\n\nPRODUCER\n[CLASS / SECTION]\n\nSTORY BY\n[SCHOOL YEAR 2026]\n\nSTUDENTS\n[CLASSMATES NAMES]\n\nTEACHERS\n[TEACHER NAMES]\n\nSUBJECTS SURVIVED\n[MATH / SCIENCE / ENGLISH / ETC.]\n\nPROJECTS COMPLETED\n[PLATES / ACTIVITIES / FINALS]\n\nEXAMS TAKEN\n[MIDTERMS / FINALS]\n\nMEMORIES MADE\n[LAUGHS / STRESS / MOMENTS]\n\nCHALLENGES FACED\n[LATE NIGHTS / DEADLINES]\n\nLESSONS LEARNED\n[GROWTH / EXPERIENCES]\n\nSPECIAL THANKS\n[FRIENDS / FAMILY / TEACHERS]\n\nFILMED ON\n[PHONE / CAMERA]\n\nLOCATION\n[SCHOOL NAME]\n\nCLASS OF 2026'
  /** «Zoom gjennom bokstavene»: tekststørrelsen holdes og vokser så til teksten fyller bildet. */
  const zoomThrough = (size: number, t0: number, t1: number) => ({ size: K([0, size], [t0, size, 'in'], [t1, 14000]) })
  /** Årstall som ruller (sifre fra venstre, tilfeldige tall først) med video i sifrene og zoom gjennom. */
  const yearRoll = (y: number, size: number, zoom0: number, zoom1: number) => text({
    start: 0, dur: zoom1 + 0.2, text: '2026', rollFrom: '7318', rollSpin: 2, rollLtr: true, rollStag: 0.45, font: 'Anton', weight: 400, size, y,
    anim: 'roll', knock: 'solid', knockColor: '#000000', kf: zoomThrough(size, zoom0, zoom1),
  })
  /** Dagteller → nytt år (felles for 16:9 og 9:16). */
  const dayCounter = (bg: string, x: number, align: 'left' | 'center', big: number, small: number, cut: { first: number; iv: readonly number[] }, gx: number, ys = 0.29, yb = 0.55): Content => ({
    clips: [colorClip({ dur: cut.first, c1: bg, c2: bg, grad: 'none', trans: { type: 'none', dur: 0.2 } }), ...cutSeq(1, cut.iv, PASTEL, 0.5)],
    texts: [
      text({ start: 0, dur: 2.4, text: '{n}/365', countdown: true, cdFrom: 1, cdTo: 360, cdDur: 2.3, font: 'Oswald', weight: 300, size: small, x, y: ys, align, anim: 'none' }),
      text({ start: 2.4, dur: 1.4, text: '360/365', font: 'Oswald', weight: 300, size: small, x, y: ys, align, anim: 'none' }),
      text({ start: 0, dur: 3.2, text: '{n}', countdown: true, cdFrom: 0, cdTo: 2026, cdDur: 2.3, font: 'Bebas Neue', weight: 400, size: big, x, y: yb, align, anim: 'none' }),
      text({ start: 2.4, dur: 1.6, text: 'GOODBYE', font: 'Oswald', weight: 700, size: small * 0.95, track: 0.08, x: x + gx, y: ys, align: 'left', anim: 'letters' }),
      text({ start: 3.2, dur: 1.2, text: '2027', rollFrom: '2026', font: 'Bebas Neue', weight: 400, size: big, x, y: yb, align, anim: 'roll' }),
      text({ start: 4.4, dur: cut.first - 4.4, text: 'WELCOME', font: 'Oswald', weight: 700, size: small * 0.95, track: 0.6, x, y: ys, align, anim: 'ldrop' }),
      text({ start: 4.4, dur: cut.first - 4.4, text: '2027', font: 'Bebas Neue', weight: 400, size: big, x, y: yb, align, anim: 'none' }),
    ],
  })
  return [
    {
      k: 'theend', motion: 'dynamic', bpm: 113, name: 'THE END – rulletekst', desc: 'Video i bokstavene, zoom gjennom tittelen, montasje med rulletekst i høyre kolonne', tt: 9, cat: 'Rulletekst og avslutning',
      make: () => {
        const intro = text({ start: 0, dur: 6, text: 'THE END', font: 'Anton', weight: 400, size: 320, y: 0.45, anim: 'ldrop', knock: 'solid', knockColor: '#050505', kf: zoomThrough(320, 4.2, 5.9) })
        return {
          clips: [ph(1, CUTS.theend.first, '#5a4632'), ...cutSeq(2, CUTS.theend.iv, FILM, 0.6)],
          ov: [frame({ name: 'Mørk side', fill: true, x: 0.5, y: 0.5, scale: 1, start: 7, dur: 15.2, anim: 'fade', radius: 0, border: 0, shadow: false, shape: { fill: '#000000', fill2: '#000000', ang: 0, a1: 0, a2: 0.78 } })],
          texts: [
            intro,
            // tittel og rulletekst ruller sammen (samme fart), rulleteksten starter rett under tittelen
            text({ start: 7.2, dur: 14.8, text: 'THE END', font: 'Anton', weight: 400, size: 96, color: '#f2dfb6', x: 0.84, y: 0.28, anim: 'fade', kf: { y: K([0.8, 0.28], [14.8, -1.45]) } }),
            text({ start: 7.2, dur: 14.8, text: CREDITS, font: 'Oswald', weight: 400, size: 24, upper: true, lh: 1.12, x: 0.84, y: 0.36, valign: 'top', maxW: 0.3, anim: 'fade', kf: { y: K([0.8, 0.36], [14.8, -1.37]) } }),
          ],
        }
      },
    },
    {
      k: 'yearroll', motion: 'cinematic', bpm: 88.6, name: 'Årstall som ruller', desc: 'Sifrene ruller inn ett og ett med video i tallene, så zoom gjennom til videoen', tt: 2.4, cat: 'Kinetisk typografi',
      make: () => ({ clips: [ph(1, 8, '#c9762e')], texts: [yearRoll(0.4, 450, 3.8, 5.2)] }),
    },
    {
      k: 'yearmontage', motion: 'dynamic', bpm: 109, name: 'Årstall og montasje', desc: 'Rullende årstall med video i tallene, zoom gjennom og taktfast montasje', tt: 2.2, cat: 'Montasje og musikk',
      make: () => ({ clips: [ph(1, CUTS.yearmontage.first, PASTEL[0] as string), ...cutSeq(2, CUTS.yearmontage.iv, PASTEL, 0.6)], texts: [yearRoll(0.43, 460, 3.6, 5.6)] }),
    },
    {
      k: 'october', motion: 'dynamic', bpm: 83, name: 'Life in October', desc: 'Rød tittel med glød som skifter font, montasje og bilde-i-bilde som vokser til fullskjerm', tt: 1.6, cat: 'Tittel og intro',
      make: () => {
        const clips = [ph(1, CUTS.october.first, '#0e4a4f'), ...cutSeq(2, CUTS.october.iv, BOLD, 0.7)]
        // bilde-i-bilde (målt i originalen): tre stående fliser spretter inn, så et liggende felt som vokser til fullskjerm
        const t0 = 9.9
        const ov: Overlay[] = [
          pip('8a', { start: t0, dur: 1.6, x: 0.18, y: 0.46, scale: 0.27, ar: 1.33, shape: { fill: '#3a0a0e', fill2: null, ang: 90 } }),
          pip('8b', { start: t0 + 0.25, dur: 1.35, x: 0.5, y: 0.46, scale: 0.27, ar: 1.33, shape: { fill: '#e2245e', fill2: null, ang: 90 } }),
          pip('8c', { start: t0 + 0.5, dur: 1.1, x: 0.82, y: 0.46, scale: 0.27, ar: 1.33, shape: { fill: '#9a27b4', fill2: null, ang: 90 } }),
          pip('9', { start: t0 + 0.6, dur: 0.9, x: 0.5, y: 0.47, scale: 0.55, ar: 0.5625, lane: 1, kf: { scale: K([0, 0.55, 'out'], [0.65, 1.0, 'in']) }, shape: { fill: '#f4c6cf', fill2: null, ang: 90 } }),
          pip('11a', { start: 12.9 + 0.3, dur: 0.35, x: 0.5, y: 0.47, scale: 0.5, ar: 0.5625, shape: { fill: '#5ff512', fill2: null, ang: 90 } }),
          pip('11b', { start: 12.9 + 0.65, dur: 0.6, x: 0.5, y: 0.47, scale: 0.6, ar: 0.5625, anim: 'none', kf: { scale: K([0, 0.6], [0.6, 0.82, 'out']) }, shape: { fill: '#f0402f', fill2: null, ang: 90 } }),
        ]
        return {
          clips, ov,
          texts: [
            text({ start: 0, dur: 2.4, text: 'LIFE IN', font: 'Montserrat', weight: 600, size: 30, track: 0.6, y: 0.3, anim: 'fade' }),
            text({ start: 0.3, dur: 2.1, text: 'OCTOBER', font: 'Caveat', fonts: ['Anton', 'Anton', 'Permanent Marker', 'Pacifico', 'Dancing Script'], fontRate: 0.3, weight: 700, size: 190, color: '#e3161b', glow: 0.7, y: 0.45, anim: 'pop' }),
          ],
        }
      },
    },
    {
      k: 'travelvlog', motion: 'cinematic', bpm: 155, name: 'Reisevlogg', desc: 'Stedsnavn som trekkes sammen, overtittel og håndskrift i bane over bakgrunnsvideo', tt: 2.4, cat: 'Tittel og intro',
      make: () => ({
        clips: [ph(1, CUTS.travel.first, '#2f7f86'), ...cutSeq(2, CUTS.travel.iv, ['#2b6f80', '#c88a54', '#1f4f66', '#3d8e93', '#a8783f', '#24495a', '#4aa3a4', '#d19a62'], 1.5)],
        texts: [
          text({ start: 0.3, dur: CUTS.travel.first - 0.3, text: 'YOUR LOCATION', font: 'Anton', weight: 400, size: 165, color: '#f2d68a', y: 0.5, maxW: 1.6, anim: 'fade', kf: { track: K([0, 0.9, 'out'], [1.5, 0.02, 'out']), y: K([0, 0.45], [6.9, 0.53]) } }),
          text({ start: 1.5, dur: CUTS.travel.first - 1.5, text: 'TRAVEL VLOG', font: 'Montserrat', weight: 700, size: 24, track: 0.45, color: '#f2e6c8', y: 0.37, anim: 'fade', kf: { y: K([0, 0.36], [5.7, 0.43]) } }),
          text({ start: 0.2, dur: CUTS.travel.first - 0.2, text: 'PARAM', font: 'Permanent Marker', weight: 400, size: 34, x: 0.5, y: 0.46, anim: 'orbit', orbitR: 0.2, orbitV: 0.07 }),
        ],
      }),
    },
    {
      k: 'daycount', motion: 'dynamic', bpm: 120.6, name: 'Dagteller → nytt år', desc: 'Dager og årstall teller opp, GOODBYE/WELCOME, så lynrask montasje', tt: 1.6, cat: 'Montasje og musikk',
      make: () => dayCounter('#233f38', 0.27, 'left', 480, 105, CUTS.daycount, 0.25),
    },
    {
      k: 'newyork', motion: 'cinematic', bpm: 110, name: 'By i bokstavene – dugget vindu', desc: 'Regn på vinduet, byvideo i bokstavene og penselstrøk som tørker glasset', tt: 2, cat: 'Tittel og intro',
      make: () => {
        const title = text({ start: 0.35, dur: 3.95, text: 'NEW YORK', font: 'Anton', weight: 400, size: 300, y: 0.48, anim: 'slide' })
        return {
          clips: [ph(1, 4.3, '#8d9ba6'), ph(2, 4.5, '#c47a45', 'fade', 0.3)],
          ov: [frame({ ph: 'Klipp 2', name: 'Klipp 2', fill: true, x: 0.5, y: 0.5, scale: 1, start: 0, dur: 4.3, anim: 'none', radius: 0, border: 0, shadow: false, shape: { fill: '#c47a45', fill2: '#24425e', ang: 90 }, matte: { text: title.id, brush: { t0: 1.95, dur: 2.05, x: 0.16, y: 0.18, w: 0.69, h: 0.59 } } })],
          texts: [title],
        }
      },
    },
    {
      k: 'maydump', motion: 'cinematic', bpm: 126, name: 'Månedsdump', desc: 'Filmstriper åpner seg, kapittel, gull serif-tittel bokstav for bokstav og filmatisk montasje', tt: 2.6, cat: 'Tittel og intro',
      make: () => ({
        clips: [ph(1, CUTS.maydump.first, '#b39a5e', 'none', 0.2, { effects: bars(0, 1.1) }), ...cutSeq(2, CUTS.maydump.iv, FILM, 0.7)],
        texts: [
          text({ start: 1.1, dur: CUTS.maydump.first - 1.1, text: 'Chapter 05 of 12', font: 'Montserrat', weight: 500, size: 20, y: 0.13, anim: 'fade' }),
          text({ start: 1.2, dur: CUTS.maydump.first - 1.2, text: 'May\nDump', font: 'Playfair Display', weight: 400, size: 126, lh: 0.88, color: '#ecd497', y: 0.5, anim: 'letters' }),
          text({ start: 1.4, dur: CUTS.maydump.first - 1.4, text: 'ARCHIVED BY YOUR NAME', font: 'Montserrat', weight: 700, size: 17, track: 0.06, y: 0.89, anim: 'fade' }),
        ],
      }),
    },
    {
      k: 'lyricvideo', motion: 'typo', bpm: 116, name: 'Sangtekst (kinetisk)', desc: 'Serif-ord for ord i ulike størrelser og plasser, ny farge per frase', tt: 6, cat: 'Musikk og lovsang',
      make: () => {
        const cols = ['#a80000', '#5b4f53', '#035460', '#007070', '#827613', '#123631', '#7f7f66', '#9a5c50', '#2a0606', '#f5527e', '#f5e9b6', '#7aa3b0', '#a7bec8', '#3e6b7c', '#874b4a']
        const L = [CUTS.lyrics.first, ...CUTS.lyrics.iv, 4]
        const clips = cols.map((c, i) => ph(i + 1, L[i] ?? 3, c))
        const at = (i: number) => L.slice(0, i).reduce((a, b) => a + b, 0)
        const serif = { font: 'Playfair Display', weight: 400, color: '#ffffff' } as const
        const w = (i: number, s: string, o: Partial<TextItem>) => text({ ...serif, start: at(i) + (o.start ?? 0.15), dur: (L[i] ?? 3) - (o.start ?? 0.15) - 0.1, text: s, anim: 'words', ...o, ...(o.start !== undefined ? { start: at(i) + o.start } : {}) })
        return {
          clips,
          texts: [
            text({ start: 0.3, dur: CUTS.lyrics.first - 0.5, text: 'JUSTIN', font: 'Oswald', weight: 200, size: 150, track: 0.04, y: 0.48, anim: 'glitch' }),
            w(1, 'show you\noff', { size: 101, x: 0.49, y: 0.48, align: 'left' }),
            w(2, 'I', { size: 88, x: 0.34, y: 0.33 }), w(2, 'wanna', { size: 88, x: 0.5, y: 0.4, start: 0.5 }), w(2, 'show', { size: 88, x: 0.45, y: 0.48, start: 0.9 }),
            w(3, 'what you got', { size: 88, y: 0.5 }),
            w(4, 'a\nbillion', { size: 123, x: 0.58, y: 0.3, lh: 1.0 }), w(4, 'could', { size: 57, x: 0.4, y: 0.62, start: 1.1 }),
            w(5, 'we gonna', { size: 92, y: 0.5 }),
            w(6, 'party\nlike', { size: 119, x: 0.55, y: 0.28, lh: 1.0 }), w(6, "it's 30 12", { size: 62, x: 0.45, y: 0.62, start: 1.1 }),
            w(7, 'I wanna\nshow you all', { size: 88, x: 0.5, y: 0.47, align: 'left' }),
            w(8, 'so', { size: 88, x: 0.72, y: 0.5 }),
            w(9, "about the\nworld we're", { size: 97, x: 0.38, y: 0.52, align: 'left' }),
            w(10, "I'm coming\nfor", { size: 97, x: 0.45, y: 0.52, align: 'left' }),
            w(11, 'CAUSE', { size: 97, track: 0.2, y: 0.52, anim: 'scatter', color: '#fffbe9' }),
            w(12, 'ALL', { size: 374, y: 0.5, anim: 'pop', start: 0.4 }),
            w(13, 'I need', { size: 88, x: 0.47, y: 0.52 }),
            w(14, 'is\na', { size: 119, x: 0.6, y: 0.3, lh: 1.0 }), w(14, 'beauty and', { size: 66, x: 0.47, y: 0.62, start: 1.1 }),
            w(15, 'who\ncan', { size: 119, x: 0.58, y: 0.27, lh: 1.0 }), w(15, 'make my life complete', { size: 79, x: 0.55, y: 0.6, start: 1.2 }),
          ],
        }
      },
    },
    {
      k: 'daycount916', motion: 'dynamic', bpm: 109, name: 'Dagteller (stående)', desc: 'Dagteller → nytt år for 9:16, lilla flate og montasje i takt', tt: 1.6, cat: 'Montasje og musikk',
      make: () => dayCounter('#4d404b', 0.28, 'left', 280, 66, CUTS.daycount916, 0.25, 0.405, 0.48),
    },
    {
      k: 'theend916', motion: 'minimal', bpm: 125, name: 'THE END (stående)', desc: 'Video i bokstavene, montasje, tittel som stiger opp og midtstilt rulletekst – for 9:16', tt: 2.6, cat: 'Rulletekst og avslutning',
      make: () => ({
        clips: [ph(1, CUTS.theend916.first, '#3e4b45'), ...cutSeq(2, CUTS.theend916.iv, FILM, 1)],
        texts: [
          text({ start: 0, dur: 5.2, text: 'THE END', font: 'Anton', weight: 400, size: 230, y: 0.5, anim: 'ldrop', knock: 'solid', knockColor: '#050505', kf: zoomThrough(230, 3.6, 5.1) }),
          // tittelen stiger opp nedenfra, så ruller den og rulleteksten (rett under) sammen oppover
          text({ start: 10.5, dur: 20, text: 'THE END', font: 'Anton', weight: 400, size: 180, y: 0.42, anim: 'fade', kf: { y: K([0, 1.05, 'out'], [1.1, 0.42], [20, -1.3]) } }),
          text({ start: 10.5, dur: 20, text: CREDITS, font: 'Oswald', weight: 400, size: 26, upper: true, lh: 1.12, y: 0.47, valign: 'top', maxW: 0.7, anim: 'fade', kf: { y: K([0, 1.1, 'out'], [1.1, 0.47], [20, -1.25]) } }),
        ],
      }),
    },
    {
      k: 'vacation', motion: 'dynamic', bpm: 147, name: 'Vacation', desc: 'Rød tittel med glød, filmstriper som åpner seg og montasje med bilde-i-bilde', tt: 3.2, cat: 'Montasje og musikk',
      make: () => {
        return {
          clips: [ph(1, CUTS.vacation.first, '#2f403a', 'none', 0.2, { effects: bars(0, 3.4) }), ...cutSeq(2, CUTS.vacation.iv, BOLD, 0.8)],
          ov: [
            // bilde-i-bilde som vokser til fullskjerm (målt i originalen)
            pip('4b', { start: 6.6, dur: 0.95, x: 0.5, y: 0.47, scale: 0.6, ar: 0.5625, kf: { scale: K([0, 0.6, 'out'], [0.9, 1.0, 'in']) }, shape: { fill: '#0b4d52', fill2: null, ang: 90 } }),
            pip('13b', { start: 17.1, dur: 0.75, x: 0.5, y: 0.47, scale: 0.8, ar: 0.5625, kf: { scale: K([0, 0.8, 'out'], [0.7, 1.0, 'in']) }, shape: { fill: '#e6331a', fill2: null, ang: 90 } }),
          ],
          texts: [text({ start: 0.15, dur: 4.9, text: 'VACATION', font: 'Montserrat', weight: 800, size: 260, color: '#e8141c', glow: 0.55, y: 0.38, anim: 'fade' })],
        }
      },
    },
    {
      k: 'andwiththat', motion: 'dynamic', bpm: 137, name: 'And with that … (stående)', desc: 'Serif-ord stables i ulike størrelser, «Good Night.» og rask montasje med fliser – for 9:16', tt: 2.6, cat: 'Kinetisk typografi',
      make: () => {
        const sf = { font: 'Playfair Display', weight: 500, anim: 'rise' } as const
        const end = 4.9
        return {
          clips: [colorClip({ dur: CUTS.andwith.first, c1: '#4a3f4b', c2: '#4a3f4b', grad: 'none', trans: { type: 'none', dur: 0.2 } }), ...cutSeq(1, CUTS.andwith.iv, PASTEL, 0.47)],
          ov: [
            pip('9b', { start: 10.1, dur: 1.6, x: 0.3, y: 0.18, scale: 0.4, ar: 1.17, anim: 'slide', shape: { fill: '#6e3b2b', fill2: null, ang: 90 } }),
            pip('33b', { start: 21.3, dur: 1.4, x: 0.5, y: 0.2, scale: 0.35, ar: 1.47, anim: 'none', kf: { y: K([0, -0.3, 'out'], [0.5, 0.2]) }, shape: { fill: '#10293b', fill2: null, ang: 90 } }),
            pip('33c', { start: 21.5, dur: 1.2, x: 0.5, y: 0.82, scale: 0.35, ar: 1.47, anim: 'none', kf: { y: K([0, 1.3, 'out'], [0.5, 0.82]) }, shape: { fill: '#d5e1d6', fill2: null, ang: 90 } }),
          ],
          texts: [
            text({ ...sf, start: 0.3, dur: end - 0.3, text: 'And', size: 150, y: 0.21 }),
            text({ ...sf, start: 0.6, dur: end - 0.6, text: 'With', size: 200, y: 0.29 }),
            text({ ...sf, start: 0.9, dur: end - 0.9, text: 'that', size: 90, x: 0.33, y: 0.365 }),
            text({ ...sf, start: 1.2, dur: end - 1.2, text: 'The', size: 170, x: 0.62, y: 0.36 }),
            text({ ...sf, start: 1.5, dur: end - 1.5, text: '2026', size: 250, y: 0.45 }),
            text({ ...sf, start: 1.8, dur: end - 1.8, text: 'season...', size: 70, x: 0.4, y: 0.525 }),
            text({ ...sf, start: 5, dur: CUTS.andwith.first - 5, text: 'Good\nNight.', size: 180, lh: 0.86, y: 0.4 }),
          ],
        }
      },
    },
  ]
}
