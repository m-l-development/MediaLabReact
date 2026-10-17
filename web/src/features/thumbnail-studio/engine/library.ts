import type { LayerType } from './model'

/** «Flere elementer»: ferdige tekster, bokser, former og bildefelt (samme som dagens app). */
export type Spec = [LayerType, Record<string, unknown>]
export interface LibItem {
  key: string
  label: string
  /** Lagene, gitt aksentfargen `a` og tekstfargen `k` som syns på den. Det første laget er «roten» de andre kobles til. */
  make: ((a: string, k: string) => Spec[]) | null
  /** 'rect' | 'rounded' | 'ellipse' | 'line' = enkel form; 'back' = legges nederst. */
  mode?: string
}

const T = (p: Record<string, unknown>): Spec => ['text', { font: 'Montserrat', weight: 700, size: 60, color: '#ffffff', align: 'center', valign: 'middle', ...p }]
const R = (p: Record<string, unknown>): Spec => ['shape', { kind: 'rect', radius: 0, ...p }]
const I = (p: Record<string, unknown>): Spec => ['image', { fit: 'cover', px: 0.5, py: 0.5, ...p }]
const A = (p: Record<string, unknown>): Spec => T({ font: 'Anton', weight: 400, upper: true, ...p })

const WAVE = [80, 160, 240, 120, 300, 200, 360, 260, 360, 200, 300, 120, 240, 160, 80]

export const LIBRARY: readonly { title: string; items: LibItem[] }[] = [
  { title: 'Overskrifter', items: [
    { key: 'hbig', label: 'Stor overskrift', make: () => [A({ text: 'Stor overskrift', x: 260, y: 380, w: 1400, h: 300, size: 220 })] },
    { key: 'hnarrow', label: 'Smal overskrift', make: () => [A({ text: 'Smal overskrift', font: 'Bebas Neue', x: 260, y: 380, w: 1400, h: 320, size: 280, lh: 0.9 })] },
    { key: 'hsub', label: 'Undertittel', make: () => [T({ text: 'Undertittel', x: 460, y: 500, w: 1000, h: 80, weight: 600, size: 56, color: '#e5e5e5' })] },
    { key: 'hlabel', label: 'Liten etikett', make: (a) => [T({ text: 'Etikett', x: 560, y: 510, w: 800, h: 60, size: 38, color: a, upper: true, ls: 0.2 })] },
    { key: 'hquote', label: 'Sitat', make: (a) => [T({ text: 'Et kort sitat som fanger oppmerksomheten', x: 360, y: 420, w: 1200, h: 320, weight: 800, size: 88, lh: 1.12, align: 'left' }), T({ text: '“', x: 360, y: 150, w: 300, h: 300, weight: 800, size: 400, color: a, align: 'left', valign: 'top', fit: false })] },
    { key: 'hnum', label: 'Stort tall', make: (a) => [A({ text: '5', x: 710, y: 190, w: 500, h: 700, size: 700, color: a, upper: false })] },
    { key: 'hlist', label: 'Nummerert liste', make: () => [T({ text: '1. Første punkt\n2. Andre punkt\n  a. Underpunkt\n3. Tredje punkt', x: 560, y: 330, w: 800, h: 420, size: 64, lh: 1.55, align: 'left', valign: 'top' })] },
    { key: 'hbullet', label: 'Punktliste', make: () => [T({ text: '• Første punkt\n• Andre punkt\n  ◦ Underpunkt\n• Tredje punkt', x: 560, y: 330, w: 800, h: 420, size: 64, lh: 1.55, align: 'left', valign: 'top' })] },
  ] },
  { title: 'Bokser og merker', items: [
    { key: 'bpill', label: 'Merkelapp', make: (a, k) => [R({ x: 810, y: 500, w: 300, h: 80, kind: 'rounded', radius: 40, fill: a }), T({ text: 'Nyhet', x: 810, y: 500, w: 300, h: 80, weight: 800, size: 36, color: k, upper: true, ls: 0.12 })] },
    { key: 'bbox', label: 'Tekst i boks', make: (a, k) => [R({ x: 460, y: 430, w: 1000, h: 220, fill: a }), A({ text: 'Tekst i boks', x: 480, y: 440, w: 960, h: 200, size: 150, color: k })] },
    { key: 'btilt', label: 'Skrå tekstboks', make: (a, k) => [R({ x: 460, y: 430, w: 1000, h: 220, rot: -3, kind: 'rounded', radius: 20, fill: a }), A({ text: 'Skrå tekstboks', x: 480, y: 445, w: 960, h: 190, rot: -3, size: 140, color: k })] },
    { key: 'blower', label: 'Navneskilt', make: (a, k) => [R({ x: 100, y: 790, w: 1000, h: 120, fill: '#ffffff' }), T({ text: 'Fornavn Etternavn', x: 140, y: 790, w: 940, h: 120, weight: 800, size: 64, color: '#111111', align: 'left' }), R({ x: 100, y: 910, w: 1000, h: 80, fill: a }), T({ text: 'Tittel eller rolle', x: 140, y: 910, w: 940, h: 80, weight: 600, size: 40, color: k, align: 'left', upper: true, ls: 0.08 })] },
    { key: 'bbadge', label: 'Rundt merke', make: (a, k) => [R({ x: 830, y: 410, w: 260, h: 260, kind: 'ellipse', fill: a }), A({ text: 'Ny!', x: 830, y: 410, w: 260, h: 260, rot: -10, size: 110, color: k })] },
    { key: 'bbutton', label: 'Knapp', make: (a, k) => [R({ x: 710, y: 485, w: 500, h: 110, kind: 'rounded', radius: 55, fill: a }), T({ text: 'Se videoen', x: 710, y: 485, w: 500, h: 110, weight: 800, size: 40, color: k, upper: true, ls: 0.06 })] },
    { key: 'bdate', label: 'Datoboks', make: (a, k) => [R({ x: 740, y: 492, w: 440, h: 96, kind: 'rounded', radius: 48, fill: a }), T({ text: '12. oktober', x: 740, y: 492, w: 440, h: 96, weight: 800, size: 44, color: k, upper: true, ls: 0.06 })] },
    { key: 'binfo', label: 'Infoboks', make: (a, k) => [R({ x: 700, y: 415, w: 520, h: 250, kind: 'rounded', radius: 24, fill: a }), T({ text: 'Dato', x: 700, y: 450, w: 520, h: 50, size: 32, color: k, upper: true, ls: 0.2, valign: 'top' }), A({ text: '12. okt', x: 720, y: 510, w: 480, h: 120, size: 100, color: k })] },
    { key: 'bnum', label: 'Nummer i sirkel', make: (a, k) => [R({ x: 840, y: 420, w: 240, h: 240, kind: 'ellipse', fill: a }), A({ text: '#3', x: 840, y: 420, w: 240, h: 240, size: 130, color: k, upper: false })] },
  ] },
  { title: 'Former og felt', items: [
    { key: 'srect', label: 'Firkant', make: null, mode: 'rect' },
    { key: 'srounded', label: 'Avrundet', make: null, mode: 'rounded' },
    { key: 'sellipse', label: 'Sirkel', make: null, mode: 'ellipse' },
    { key: 'sline', label: 'Strek', make: null, mode: 'line' },
    { key: 'sstripe', label: 'Skrå stripe', make: (a) => [R({ x: 250, y: 440, w: 1420, h: 200, rot: -2, fill: a })] },
    { key: 'spanel', label: 'Halvt fargefelt', make: (a) => [R({ x: 0, y: 0, w: 960, h: 1080, fill: a })], mode: 'back' },
    { key: 'sdiag', label: 'Skrå fargeblokk', make: (a) => [R({ x: -300, y: -200, w: 1350, h: 1500, rot: 12, fill: a })], mode: 'back' },
    { key: 'sband', label: 'Mørkt felt nederst', make: () => [R({ x: 0, y: 700, w: 1920, h: 380, fill: '#000000', op: 0.55 })] },
    { key: 'soverlay', label: 'Fargetone over alt', make: (a) => [R({ x: 0, y: 0, w: 1920, h: 1080, fill: a, op: 0.45 })] },
    { key: 'sbars', label: 'Svarte kanter', make: () => [R({ x: 0, y: 0, w: 1920, h: 110, fill: '#000000' }), R({ x: 0, y: 970, w: 1920, h: 110, fill: '#000000' })] },
    { key: 'sdivider', label: 'Midtstrek', make: (a) => [R({ x: 952, y: 0, w: 16, h: 1080, fill: a })] },
    { key: 'swave', label: 'Lydbølge', make: (a) => WAVE.map((h, i) => R({ x: 600 + i * 48, y: 540 - h / 2, w: 28, h, kind: 'rounded', radius: 14, fill: a })) },
    { key: 'sprogress', label: 'Avspillingslinje', make: (a) => [R({ x: 530, y: 535, w: 860, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff', op: 0.3 }), R({ x: 530, y: 535, w: 300, h: 10, kind: 'rounded', radius: 5, fill: a })] },
    { key: 'svinyl', label: 'Vinylplate', make: (a) => [R({ x: 610, y: 190, w: 700, h: 700, kind: 'ellipse', fill: '#111111' }), R({ x: 860, y: 440, w: 200, h: 200, kind: 'ellipse', fill: a }), R({ x: 945, y: 525, w: 30, h: 30, kind: 'ellipse', fill: '#111111' })] },
  ] },
  { title: 'Bildefelt', items: [
    { key: 'irect', label: 'Bildefelt', make: () => [I({ x: 560, y: 240, w: 800, h: 600 })] },
    { key: 'irounded', label: 'Avrundet bilde', make: () => [I({ x: 660, y: 240, w: 600, h: 600, shape: 'rounded', radius: 28 })] },
    { key: 'iround', label: 'Rundt bilde', make: () => [I({ x: 660, y: 240, w: 600, h: 600, shape: 'ellipse', py: 0.3 })] },
    { key: 'iringed', label: 'Rundt bilde med ring', make: (a) => [R({ x: 645, y: 225, w: 630, h: 630, kind: 'ellipse', fill: a }), I({ x: 660, y: 240, w: 600, h: 600, shape: 'ellipse', py: 0.3 })] },
    { key: 'iperson', label: 'Personutklipp', make: () => [I({ x: 510, y: 120, w: 900, h: 960, fit: 'contain', py: 1 })] },
    { key: 'ifull', label: 'Helbilde', make: () => [I({ x: 0, y: 0, w: 1920, h: 1080, py: 0.4 })], mode: 'back' },
    { key: 'ihalf', label: 'Halvt bilde', make: () => [I({ x: 960, y: 0, w: 960, h: 1080, py: 0.4 })], mode: 'back' },
    { key: 'igrid', label: 'Rutenett 2 × 2', make: () => [[510, 90], [970, 90], [510, 550], [970, 550]].map(([x, y]) => I({ x, y, w: 440, h: 440, shape: 'rounded', radius: 20 })) },
  ] },
]

/** Standardoppsettene i «Ny mal» / «Bytt oppsett» (rekkefølge, navn og beskrivelse som i dag). */
export const LAYOUT_LIST: readonly { k: string; name: string; desc: string }[] = [
  { k: 'blank', name: 'Blank', desc: 'Helt tom flate' },
  { k: 'shorthook', name: 'Stor krok', desc: 'Stor tekst på en gul stripe over personen' },
  { k: 'shortsplit', name: 'Delt i høyden', desc: 'Bilde øverst, farget tekstfelt nederst' },
  { k: 'shorttip', name: 'Nummerert tips', desc: 'Nummer i en sirkel, overskrift og person' },
  { k: 'interview', name: 'To personer', desc: 'To bilder side om side med navneskilt' },
  { k: 'interviewquote', name: 'Sitat og person', desc: 'Personen til venstre, sitat til høyre' },
  { k: 'interviewlower', name: 'Navneskilt', desc: 'Helbilde med navn og rolle nederst' },
  { k: 'panelthree', name: 'Tre i panel', desc: 'Tre runde portretter med navn' },
  { k: 'panelfour', name: 'Fire i panel', desc: 'Fire portretter på rad under temaet' },
  { k: 'panelvs', name: 'Ansikt til ansikt', desc: 'To personer på hver sin farge' },
  { k: 'podcast', name: 'Episode', desc: 'Episodenummer, tittel og vertens bilde' },
  { k: 'podcastwave', name: 'Lydbølge', desc: 'To verter og en lydbølge i midten' },
  { k: 'podcastguest', name: 'Gjest', desc: 'Gjesten i midten, navn i et lyst felt' },
  { k: 'event', name: 'Plakat', desc: 'Bilde i bakgrunnen, dato, tittel og sted' },
  { k: 'eventdate', name: 'Stor dato', desc: 'Datoen i et fargefelt, bilde til høyre' },
  { k: 'eventticket', name: 'Infobokser', desc: 'Tittel og tre bokser for dato, tid og sted' },
  { k: 'speaker', name: 'Person og tittel', desc: 'Personen til høyre, stor tittel til venstre' },
  { k: 'sermon', name: 'Tittel i midten', desc: 'Tittelen i midten over et dempet bilde' },
  { k: 'sundayverse', name: 'Bibelvers', desc: 'Et vers eller budskap i midten på varm bakgrunn' },
  { k: 'promo', name: 'Skrå fargeflate', desc: 'Merkelapp, stor overskrift og bilde' },
  { k: 'promocenter', name: 'Sterk farge', desc: 'Stor overskrift og en «Se videoen»-knapp' },
  { k: 'promoframe', name: 'Bilde med ramme', desc: 'Bilde i hvit ramme, tekstfelt og rundt merke' },
  { k: 'music', name: 'Film', desc: 'Helbilde med svarte kanter, artist og låt' },
  { k: 'musiccover', name: 'Cover', desc: 'Kvadratisk cover med låttittel og artist' },
  { k: 'musiclive', name: 'Live', desc: 'Helbilde med fargetone, live-merke og låttittel' },
  { k: 'playlisttracks', name: 'Sangliste', desc: 'Navn på listen, nummererte sanger og et cover' },
  { k: 'playlistvinyl', name: 'Vinyl', desc: 'Cover med en vinylplate bak og navn på listen' },
  { k: 'playlisttop', name: 'Toppliste', desc: 'Stort tall og navn på listen' },
]
