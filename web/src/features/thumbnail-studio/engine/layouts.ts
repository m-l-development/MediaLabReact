import { emptyDoc, L, type Doc } from './model'

/* Grunnoppsettene (BASES) og standardoppsettene (LAYOUTS) fra dagens app, uendret. */
const BASES: Record<string, () => Doc> = {
  sunday: () => {
    const d = emptyDoc(); d.bg.color = '#000000'; d.vig = { on: true, amt: 0.6, size: 0.55, color: '#000000', top: false };
    d.layers = [
      L('glow', { x: -560, y: -620, w: 1500, h: 1300, color: '#f5b800', op: 0.5, soft: 0.6, lock: true }),
      L('glow', { x: 1480, y: 320, w: 1000, h: 1000, color: '#f5b800', op: 0.42, soft: 0.6, lock: true }),
      L('image', { x: 960, y: 40, w: 960, h: 1040, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('text', { text: 'Søndagsmøte', x: 150, y: 262, w: 880, h: 50, font: 'Montserrat', weight: 700, size: 40, color: '#f5b800', upper: true, ls: 0.12, role: 'theme' }),
      L('text', { text: 'Fornavn\nEtternavn', x: 150, y: 335, w: 860, h: 620, font: 'Bebas Neue', weight: 400, size: 330, lh: 0.9, upper: true, bar: true, barColor: '#f5b800', barH: 7, role: 'name' })
    ];
    return d;
  },
  kbs: () => {
    const d = emptyDoc(); d.bg.color = '#0495c0';
    d.layers = [
      L('image', { x: -626, y: -158, w: 1516, h: 1516, shape: 'ellipse', fit: 'cover', px: 0.62, py: 0.3, role: 'person' }),
      L('shape', { x: 830, y: 300, w: 900, h: 430, kind: 'rounded', radius: 64, fill: '#ffffff', shadow: 0.45 }),
      L('text', { text: 'Fornavn\nEtternavn', x: 880, y: 335, w: 800, h: 360, font: 'Montserrat', weight: 500, size: 150, lh: 1.0, color: '#111111', align: 'center', valign: 'middle', role: 'name' }),
      L('text', { text: 'Åpen bibelskolekveld', x: 830, y: 765, w: 900, h: 60, font: 'Montserrat', weight: 700, size: 46, color: '#ffffff', align: 'center', upper: true, ls: 0.06, role: 'theme' })
    ];
    return d;
  },
  youth: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#241046', c2: '#07040f', angle: 135 }); d.vig = { on: true, amt: 0.5, size: 0.55, color: '#000000', top: false };
    d.layers = [
      L('glow', { x: -300, y: 480, w: 1200, h: 1000, color: '#7b3fe4', op: 0.55, soft: 0.6, lock: true }),
      L('shape', { x: 1080, y: -220, w: 1000, h: 1520, rot: -8, kind: 'rect', fill: '#7b3fe4', fill2: '#e84393', angle: 160 }),
      L('image', { x: 940, y: 60, w: 980, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person', shadow: 0.35 }),
      L('text', { text: 'Ungdomsmøte', x: 120, y: 150, w: 800, h: 44, font: 'Montserrat', weight: 800, size: 38, color: '#e0d2ff', upper: true, ls: 0.3 }),
      L('text', { text: 'Kveldens\ntema', x: 120, y: 225, w: 880, h: 540, font: 'Bebas Neue', weight: 400, size: 290, lh: 0.9, upper: true, role: 'theme' }),
      L('text', { text: 'Fornavn Etternavn', x: 120, y: 810, w: 820, h: 70, font: 'Montserrat', weight: 700, size: 54, role: 'name' })
    ];
    return d;
  },
  blank: () => {
    const d = emptyDoc(); d.bg.color = '#111111';
    d.layers = [L('text', { text: 'Fornavn Etternavn', x: 160, y: 440, w: 1600, h: 200, font: 'Bebas Neue', weight: 400, size: 200, align: 'center', valign: 'middle', upper: true, role: 'name' })];
    return d;
  }
};
const LAYOUTS: Record<string, () => Doc> = {
  event: () => {
    const d = emptyDoc(); d.bg.color = '#1e1b4b';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
      L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#1e1b4b', op: 0.6 }),
      L('shape', { x: 120, y: 150, w: 440, h: 96, kind: 'rounded', radius: 48, fill: '#f472b6' }),
      L('text', { text: '12. oktober', x: 120, y: 150, w: 440, h: 96, font: 'Montserrat', weight: 800, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle', upper: true, ls: 0.06 }),
      L('text', { text: 'Navn på\narrangementet', x: 120, y: 300, w: 1500, h: 480, font: 'Anton', weight: 400, size: 220, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Sted · kl. 19:00', x: 120, y: 830, w: 1200, h: 70, font: 'Montserrat', weight: 600, size: 52, color: '#fbcfe8', role: 'name' })
    ];
    return d;
  },
  eventdate: () => {
    const d = emptyDoc(); d.bg.color = '#111111';
    d.layers = [
      L('image', { x: 640, y: 0, w: 1280, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
      L('shape', { x: 0, y: 0, w: 640, h: 1080, kind: 'rect', radius: 0, fill: '#e11d48' }),
      L('text', { text: '12', x: 0, y: 190, w: 640, h: 470, font: 'Anton', weight: 400, size: 470, align: 'center', valign: 'middle' }),
      L('text', { text: 'Okt', x: 0, y: 650, w: 640, h: 140, font: 'Anton', weight: 400, size: 130, color: '#ffe4e6', align: 'center', valign: 'middle', upper: true, ls: 0.1 }),
      L('shape', { x: 640, y: 780, w: 1280, h: 300, kind: 'rect', radius: 0, fill: '#000000', op: 0.55 }),
      L('text', { text: 'Navn på arrangementet', x: 700, y: 810, w: 1160, h: 150, font: 'Anton', weight: 400, size: 130, upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Sted · kl. 19:00', x: 700, y: 965, w: 1160, h: 60, font: 'Montserrat', weight: 600, size: 44, color: '#e5e5e5', role: 'name' })
    ];
    return d;
  },
  speaker: () => {
    const d = emptyDoc(); d.bg.color = '#0f766e';
    d.layers = [
      L('glow', { x: 1000, y: 120, w: 1000, h: 1000, color: '#5eead4', op: 0.4, soft: 0.6, lock: true }),
      L('image', { x: 980, y: 60, w: 940, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('text', { text: 'Kategori', x: 120, y: 230, w: 800, h: 50, font: 'Montserrat', weight: 700, size: 38, color: '#fde047', upper: true, ls: 0.2 }),
      L('text', { text: 'Tittel på\ntalen', x: 120, y: 300, w: 860, h: 460, font: 'Anton', weight: 400, size: 200, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Fornavn Etternavn', x: 120, y: 800, w: 860, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#ccfbf1', role: 'name' })
    ];
    return d;
  },
  sermon: () => {
    const d = emptyDoc(); d.bg.color = '#4c1d95';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
      L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#4c1d95', op: 0.72 }),
      L('text', { text: 'Kategori · kl. 11:00', x: 360, y: 230, w: 1200, h: 50, font: 'Montserrat', weight: 700, size: 36, color: '#f0abfc', align: 'center', upper: true, ls: 0.2 }),
      L('text', { text: 'Tittel på talen', x: 160, y: 310, w: 1600, h: 400, font: 'Bebas Neue', weight: 400, size: 300, lh: 0.9, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
      L('shape', { x: 880, y: 745, w: 160, h: 8, kind: 'rect', radius: 0, fill: '#f0abfc' }),
      L('text', { text: 'Fornavn Etternavn', x: 360, y: 790, w: 1200, h: 70, font: 'Montserrat', weight: 600, size: 50, align: 'center', role: 'name' })
    ];
    return d;
  },
  promo: () => {
    const d = emptyDoc(); d.bg.color = '#0a0a0a';
    d.layers = [
      L('image', { x: 700, y: 0, w: 1220, h: 1080, fit: 'cover', px: 0.5, py: 0.5 }),
      L('shape', { x: -420, y: -200, w: 1400, h: 1500, rot: 14, kind: 'rect', radius: 0, fill: '#7c3aed', fill2: '#db2777', angle: 135 }),
      L('shape', { x: 110, y: 220, w: 260, h: 80, kind: 'rounded', radius: 40, fill: '#ffffff' }),
      L('text', { text: 'Nyhet', x: 110, y: 220, w: 260, h: 80, font: 'Montserrat', weight: 800, size: 38, color: '#7c3aed', align: 'center', valign: 'middle', upper: true, ls: 0.12 }),
      L('text', { text: 'Stor\noverskrift', x: 110, y: 340, w: 800, h: 460, font: 'Anton', weight: 400, size: 220, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Kort undertittel', x: 110, y: 830, w: 800, h: 70, font: 'Montserrat', weight: 600, size: 48, role: 'name' })
    ];
    return d;
  },
  promocenter: () => {
    const d = emptyDoc(); d.bg.color = '#22c55e';
    d.layers = [
      L('text', { text: 'Stor overskrift', x: 120, y: 220, w: 1680, h: 420, font: 'Anton', weight: 400, size: 300, lh: 0.95, color: '#052e16', align: 'center', valign: 'middle', upper: true, role: 'theme' }),
      L('text', { text: 'Kort undertittel', x: 260, y: 650, w: 1400, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#14532d', align: 'center', role: 'name' }),
      L('shape', { x: 710, y: 790, w: 500, h: 110, kind: 'rounded', radius: 55, fill: '#052e16' }),
      L('text', { text: 'Se videoen', x: 710, y: 790, w: 500, h: 110, font: 'Montserrat', weight: 800, size: 40, color: '#bbf7d0', align: 'center', valign: 'middle', upper: true, ls: 0.06 })
    ];
    return d;
  },
  music: () => {
    const d = emptyDoc(); d.bg.color = '#000000';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
      L('shape', { x: 0, y: 0, w: 1920, h: 110, kind: 'rect', radius: 0, fill: '#06b6d4' }),
      L('shape', { x: 0, y: 970, w: 1920, h: 110, kind: 'rect', radius: 0, fill: '#06b6d4' }),
      L('text', { text: 'Artistnavn', x: 120, y: 640, w: 1200, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#67e8f9', upper: true, ls: 0.35, role: 'name' }),
      L('text', { text: 'Låttittel', x: 120, y: 700, w: 1500, h: 230, font: 'Bebas Neue', weight: 400, size: 240, upper: true, role: 'theme' })
    ];
    return d;
  },
  musiccover: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#f43f5e', c2: '#f97316', angle: 135 });
    d.layers = [
      L('image', { x: 160, y: 190, w: 700, h: 700, shape: 'rounded', radius: 24, fit: 'cover', px: 0.5, py: 0.5, shadow: 0.5 }),
      L('text', { text: 'Låttittel', x: 960, y: 330, w: 860, h: 300, font: 'Anton', weight: 400, size: 170, lh: 0.95, upper: true, valign: 'bottom', role: 'theme' }),
      L('text', { text: 'Artistnavn', x: 960, y: 660, w: 860, h: 70, font: 'Montserrat', weight: 600, size: 52, color: '#ffedd5', role: 'name' }),
      L('shape', { x: 960, y: 790, w: 860, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff', op: 0.35 }),
      L('shape', { x: 960, y: 790, w: 300, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff' })
    ];
    return d;
  },
  shorthook: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#1e3a8a', c2: '#0b1226', angle: 160 });
    d.layers = [
      L('glow', { x: 510, y: 330, w: 900, h: 900, color: '#ff5a4e', op: 0.3, soft: 0.65, lock: true }),
      L('image', { x: 460, y: 330, w: 1000, h: 750, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('shape', { x: 250, y: 70, w: 1420, h: 230, rot: -2, kind: 'rounded', radius: 14, fill: '#ff5a4e' }),
      L('text', { text: 'Dette må du se', x: 250, y: 100, w: 1420, h: 190, rot: -2, font: 'Anton', weight: 400, size: 140, color: '#ffffff', align: 'center', valign: 'middle', upper: true, role: 'theme' })
    ];
    return d;
  },
  shortsplit: () => {
    const d = emptyDoc(); d.bg.color = '#1f2937';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 600, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
      L('shape', { x: 0, y: 600, w: 1920, h: 480, kind: 'rect', radius: 0, fill: '#1f2937' }),
      L('shape', { x: 0, y: 592, w: 1920, h: 16, kind: 'rect', radius: 0, fill: '#f59e0b' }),
      L('text', { text: 'Kort og tydelig tittel', x: 120, y: 650, w: 1680, h: 250, font: 'Anton', weight: 400, size: 190, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
      L('text', { text: 'Fornavn Etternavn', x: 120, y: 920, w: 1680, h: 70, font: 'Montserrat', weight: 700, size: 44, color: '#fbbf24', align: 'center', upper: true, ls: 0.15, role: 'name' })
    ];
    return d;
  },
  shorttip: () => {
    const d = emptyDoc(); d.bg.color = '#f5f0ff';
    d.layers = [
      L('image', { x: 1000, y: 60, w: 920, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('shape', { x: 120, y: 160, w: 240, h: 240, kind: 'ellipse', fill: '#7c3aed' }),
      L('text', { text: '#3', x: 120, y: 160, w: 240, h: 240, font: 'Anton', weight: 400, size: 130, align: 'center', valign: 'middle' }),
      L('text', { text: 'Tips du kan\nbruke i dag', x: 120, y: 440, w: 900, h: 400, font: 'Anton', weight: 400, size: 170, lh: 0.95, color: '#1e1033', upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Fornavn Etternavn', x: 120, y: 870, w: 900, h: 60, font: 'Montserrat', weight: 600, size: 44, color: '#5b21b6', role: 'name' })
    ];
    return d;
  },
  interview: () => {
    const d = emptyDoc(); d.bg.color = '#0b0b0b';
    d.layers = [
      L('image', { x: 0, y: 0, w: 960, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
      L('image', { x: 960, y: 0, w: 960, h: 1080, fit: 'cover', px: 0.5, py: 0.4 }),
      L('shape', { x: 0, y: 0, w: 1920, h: 230, kind: 'rect', radius: 0, fill: '#4f46e5' }),
      L('text', { text: 'Tittel på intervjuet', x: 120, y: 55, w: 1680, h: 120, font: 'Anton', weight: 400, size: 110, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
      L('shape', { x: 80, y: 900, w: 560, h: 100, kind: 'rounded', radius: 12, fill: '#fbbf24' }),
      L('text', { text: 'Fornavn Etternavn', x: 80, y: 900, w: 560, h: 100, font: 'Montserrat', weight: 700, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle', role: 'name' }),
      L('shape', { x: 1280, y: 900, w: 560, h: 100, kind: 'rounded', radius: 12, fill: '#fbbf24' }),
      L('text', { text: 'Fornavn Etternavn', x: 1280, y: 900, w: 560, h: 100, font: 'Montserrat', weight: 700, size: 44, color: '#1e1b4b', align: 'center', valign: 'middle' })
    ];
    return d;
  },
  interviewquote: () => {
    const d = emptyDoc(); d.bg.color = '#18181b';
    d.layers = [
      L('image', { x: 0, y: 60, w: 900, h: 1020, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('text', { text: '\u201C', x: 960, y: 90, w: 300, h: 300, font: 'Montserrat', weight: 800, size: 400, color: '#facc15', fit: false }),
      L('text', { text: 'Et sterkt sitat fra intervjuet', x: 960, y: 330, w: 860, h: 420, font: 'Montserrat', weight: 800, size: 88, lh: 1.12, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Fornavn Etternavn', x: 960, y: 800, w: 860, h: 60, font: 'Montserrat', weight: 700, size: 42, color: '#facc15', upper: true, ls: 0.08, role: 'name' })
    ];
    return d;
  },
  interviewlower: () => {
    const d = emptyDoc(); d.bg.color = '#000000';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
      L('shape', { x: 100, y: 790, w: 1000, h: 120, kind: 'rect', radius: 0, fill: '#facc15' }),
      L('text', { text: 'Fornavn Etternavn', x: 140, y: 790, w: 940, h: 120, font: 'Montserrat', weight: 800, size: 64, color: '#111111', valign: 'middle', role: 'name' }),
      L('shape', { x: 100, y: 910, w: 1000, h: 80, kind: 'rect', radius: 0, fill: '#111111' }),
      L('text', { text: 'Tittel eller rolle', x: 140, y: 910, w: 940, h: 80, font: 'Montserrat', weight: 600, size: 40, color: '#facc15', valign: 'middle', upper: true, ls: 0.08, role: 'theme' })
    ];
    return d;
  },
  panelthree: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#1e293b', c2: '#0f172a', angle: 180 });
    d.layers = [L('text', { text: 'Tema for samtalen', x: 120, y: 80, w: 1680, h: 180, font: 'Anton', weight: 400, size: 150, align: 'center', valign: 'middle', upper: true, role: 'theme' })];
    [170, 740, 1310].forEach((x: number, i: number) => {
      d.layers.push(L('shape', { x: x - 15, y: 325, w: 470, h: 470, kind: 'ellipse', fill: '#38bdf8' }),
        L('image', { x, y: 340, w: 440, h: 440, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3, role: i === 0 ? 'person' : null }),
        L('text', { text: 'Fornavn Etternavn', x: x - 30, y: 830, w: 500, h: 60, font: 'Montserrat', weight: 600, size: 40, color: '#e2e8f0', align: 'center', role: i === 0 ? 'name' : null }));
    });
    return d;
  },
  panelfour: () => {
    const d = emptyDoc(); d.bg.color = '#f4f1ea';
    d.layers = [L('text', { text: 'Tema for samtalen', x: 120, y: 90, w: 1680, h: 180, font: 'Anton', weight: 400, size: 150, color: '#1c1917', valign: 'middle', upper: true, role: 'theme' })];
    [120, 560, 1000, 1440].forEach((x: number, i: number) => {
      d.layers.push(L('image', { x, y: 330, w: 400, h: 520, shape: 'rounded', radius: 24, fit: 'cover', px: 0.5, py: 0.3, role: i === 0 ? 'person' : null }),
        L('text', { text: 'Fornavn Etternavn', x, y: 880, w: 400, h: 60, font: 'Montserrat', weight: 700, size: 36, color: '#44403c', align: 'center', role: i === 0 ? 'name' : null }));
    });
    return d;
  },
  panelvs: () => {
    const d = emptyDoc(); d.bg.color = '#000000';
    d.layers = [
      L('shape', { x: 0, y: 0, w: 960, h: 1080, kind: 'rect', radius: 0, fill: '#dc2626' }),
      L('shape', { x: 960, y: 0, w: 960, h: 1080, kind: 'rect', radius: 0, fill: '#1d4ed8' }),
      L('image', { x: 0, y: 120, w: 960, h: 960, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('image', { x: 960, y: 120, w: 960, h: 960, fit: 'contain', px: 0.5, py: 1, flip: true }),
      L('shape', { x: 830, y: 390, w: 260, h: 260, kind: 'ellipse', fill: '#ffffff' }),
      L('text', { text: '&', x: 830, y: 390, w: 260, h: 260, font: 'Anton', weight: 400, size: 150, color: '#111111', align: 'center', valign: 'middle' }),
      L('shape', { x: 0, y: 900, w: 1920, h: 180, kind: 'rect', radius: 0, fill: '#000000', op: 0.6 }),
      L('text', { text: 'Tema for samtalen', x: 120, y: 910, w: 1680, h: 160, font: 'Anton', weight: 400, size: 120, align: 'center', valign: 'middle', upper: true, role: 'theme' })
    ];
    return d;
  },
  podcast: () => {
    const d = emptyDoc(); d.bg.color = '#ea580c';
    d.layers = [
      L('shape', { x: 1100, y: 140, w: 700, h: 800, kind: 'rounded', radius: 40, fill: '#7c2d12' }),
      L('image', { x: 1130, y: 170, w: 640, h: 740, shape: 'rounded', radius: 28, fit: 'cover', px: 0.5, py: 0.3, role: 'person' }),
      L('text', { text: 'Ep. 12', x: 120, y: 200, w: 700, h: 120, font: 'Anton', weight: 400, size: 110, color: '#ffedd5', upper: true }),
      L('text', { text: 'Tittel på\nepisoden', x: 120, y: 330, w: 940, h: 420, font: 'Anton', weight: 400, size: 190, lh: 0.95, upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Navn på podkasten', x: 120, y: 800, w: 940, h: 60, font: 'Montserrat', weight: 700, size: 42, color: '#ffedd5', upper: true, ls: 0.12, role: 'name' })
    ];
    return d;
  },
  podcastwave: () => {
    const d = emptyDoc(); d.bg.color = '#be123c';
    d.layers = [
      L('text', { text: 'Tittel på episoden', x: 160, y: 110, w: 1600, h: 240, font: 'Anton', weight: 400, size: 170, align: 'center', valign: 'middle', upper: true, role: 'theme' }),
      L('text', { text: 'Navn på podkasten', x: 360, y: 370, w: 1200, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#fecdd3', align: 'center', upper: true, ls: 0.15, role: 'name' }),
      L('shape', { x: 90, y: 550, w: 440, h: 440, kind: 'ellipse', fill: '#fecdd3' }),
      L('image', { x: 100, y: 560, w: 420, h: 420, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3, role: 'person' }),
      L('shape', { x: 1390, y: 550, w: 440, h: 440, kind: 'ellipse', fill: '#fecdd3' }),
      L('image', { x: 1400, y: 560, w: 420, h: 420, shape: 'ellipse', fit: 'cover', px: 0.5, py: 0.3 })
    ];
    [80, 160, 240, 120, 300, 200, 360, 260, 360, 200, 300, 120, 240, 160, 80].forEach((h: number, i: number) => {
      d.layers.push(L('shape', { x: 600 + i * 48, y: 770 - h / 2, w: 28, h, kind: 'rounded', radius: 14, fill: '#fecdd3' }));
    });
    return d;
  },
  podcastguest: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#13315c', c2: '#0b1d3a', angle: 160 });
    d.layers = [
      L('glow', { x: 560, y: 140, w: 800, h: 800, color: '#ff7a59', op: 0.35, soft: 0.6, lock: true }),
      L('text', { text: 'Navn på podkasten', x: 120, y: 90, w: 900, h: 50, font: 'Montserrat', weight: 700, size: 36, color: '#ffb4a2', upper: true, ls: 0.2 }),
      L('image', { x: 560, y: 120, w: 800, h: 960, fit: 'contain', px: 0.5, py: 1, role: 'person' }),
      L('shape', { x: 0, y: 820, w: 1920, h: 260, kind: 'rect', radius: 0, fill: '#fff7ed' }),
      L('shape', { x: 120, y: 782, w: 220, h: 76, kind: 'rounded', radius: 38, fill: '#ff6b4a' }),
      L('text', { text: 'Gjest', x: 120, y: 782, w: 220, h: 76, font: 'Montserrat', weight: 800, size: 30, align: 'center', valign: 'middle', upper: true, ls: 0.2 }),
      L('text', { text: 'Fornavn Etternavn', x: 120, y: 868, w: 1680, h: 110, font: 'Anton', weight: 400, size: 110, color: '#0b1d3a', upper: true, valign: 'middle', role: 'name' }),
      L('text', { text: 'Tittel på episoden', x: 120, y: 985, w: 1680, h: 56, font: 'Montserrat', weight: 600, size: 40, color: '#c2410c', role: 'theme' })
    ];
    return d;
  },
  eventticket: () => {
    const d = emptyDoc(); d.bg.color = '#312e81';
    d.layers = [L('text', { text: 'Navn på\narrangementet', x: 120, y: 110, w: 1680, h: 480, font: 'Anton', weight: 400, size: 220, lh: 0.95, align: 'center', valign: 'middle', upper: true, role: 'theme' })];
    ([['Dato', '12. okt'], ['Tid', '19:00'], ['Sted', 'Stedsnavn']] as const).forEach((b, i) => {
      var x = 120 + i * 580;
      d.layers.push(L('shape', { x, y: 670, w: 520, h: 250, kind: 'rounded', radius: 24, fill: '#4338ca' }),
        L('text', { text: b[0], x, y: 705, w: 520, h: 50, font: 'Montserrat', weight: 700, size: 32, color: '#c7d2fe', align: 'center', upper: true, ls: 0.2 }),
        L('text', { text: b[1], x: x + 20, y: 765, w: 480, h: 120, font: 'Anton', weight: 400, size: 100, align: 'center', valign: 'middle', upper: true }));
    });
    return d;
  },
  sundayverse: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#2563eb', c2: '#7c3aed', angle: 135 });
    d.layers = [
      L('text', { text: 'Et bibelvers eller et kort budskap', x: 200, y: 250, w: 1520, h: 460, font: 'Montserrat', weight: 800, size: 110, lh: 1.1, color: '#ffffff', align: 'center', valign: 'middle', role: 'theme' }),
      L('shape', { x: 880, y: 760, w: 160, h: 10, kind: 'rounded', radius: 5, fill: '#fde047' }),
      L('text', { text: 'Johannes 3,16', x: 460, y: 800, w: 1000, h: 60, font: 'Montserrat', weight: 800, size: 44, color: '#fde047', align: 'center', upper: true, ls: 0.15, role: 'name' })
    ];
    return d;
  },
  promoframe: () => {
    const d = emptyDoc(); d.bg.color = '#2563eb';
    d.layers = [
      L('image', { x: 60, y: 60, w: 1800, h: 960, fit: 'cover', px: 0.5, py: 0.5 }),
      L('shape', { x: 0, y: 720, w: 1200, h: 300, kind: 'rect', radius: 0, fill: '#facc15' }),
      L('text', { text: 'Stor overskrift', x: 80, y: 750, w: 1060, h: 160, font: 'Anton', weight: 400, size: 150, color: '#111111', upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: 'Kort undertittel', x: 80, y: 920, w: 1060, h: 60, font: 'Montserrat', weight: 600, size: 42, color: '#1e3a8a', role: 'name' }),
      L('shape', { x: 1560, y: 110, w: 260, h: 260, kind: 'ellipse', fill: '#ffffff' }),
      L('text', { text: 'Ny!', x: 1560, y: 110, w: 260, h: 260, rot: -10, font: 'Anton', weight: 400, size: 110, color: '#2563eb', align: 'center', valign: 'middle', upper: true })
    ];
    return d;
  },
  musiclive: () => {
    const d = emptyDoc(); d.bg.color = '#000000';
    d.layers = [
      L('image', { x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', px: 0.5, py: 0.4, role: 'person' }),
      L('shape', { x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: '#be185d', op: 0.5 }),
      L('shape', { x: 120, y: 110, w: 200, h: 80, kind: 'rounded', radius: 40, fill: '#22d3ee' }),
      L('text', { text: 'Live', x: 120, y: 110, w: 200, h: 80, font: 'Montserrat', weight: 800, size: 38, color: '#083344', align: 'center', valign: 'middle', upper: true, ls: 0.15 }),
      L('text', { text: 'Låttittel', x: 120, y: 620, w: 1680, h: 260, font: 'Anton', weight: 400, size: 260, upper: true, valign: 'bottom', role: 'theme' }),
      L('text', { text: 'Artistnavn', x: 120, y: 890, w: 1680, h: 70, font: 'Montserrat', weight: 600, size: 50, color: '#a5f3fc', upper: true, ls: 0.25, role: 'name' })
    ];
    return d;
  },
  playlisttracks: () => {
    const d = emptyDoc(); d.bg.color = '#84cc16';
    d.layers = [
      L('text', { text: 'Navn på listen', x: 120, y: 110, w: 1000, h: 220, font: 'Anton', weight: 400, size: 190, color: '#1a2e05', upper: true, valign: 'middle', role: 'theme' }),
      L('text', { text: '01   Første sang\n02   Andre sang\n03   Tredje sang\n04   Fjerde sang', x: 120, y: 390, w: 1000, h: 560, font: 'Montserrat', weight: 700, size: 64, lh: 1.55, color: '#1a2e05', fit: true }),
      L('shape', { x: 1210, y: 230, w: 620, h: 620, kind: 'rounded', radius: 32, fill: '#1a2e05' }),
      L('image', { x: 1240, y: 200, w: 620, h: 620, shape: 'rounded', radius: 32, fit: 'cover', px: 0.5, py: 0.5 }),
      L('text', { text: 'Spilleliste', x: 1210, y: 900, w: 650, h: 60, font: 'Montserrat', weight: 800, size: 40, color: '#1a2e05', align: 'center', upper: true, ls: 0.25, role: 'name' })
    ];
    return d;
  },
  playlistvinyl: () => {
    const d = emptyDoc(); d.bg.color = '#14b8a6';
    d.layers = [
      L('shape', { x: 470, y: 190, w: 700, h: 700, kind: 'ellipse', fill: '#111111' }),
      L('shape', { x: 720, y: 440, w: 200, h: 200, kind: 'ellipse', fill: '#fb7185' }),
      L('shape', { x: 805, y: 525, w: 30, h: 30, kind: 'ellipse', fill: '#111111' }),
      L('image', { x: 120, y: 190, w: 700, h: 700, shape: 'rounded', radius: 8, fit: 'cover', px: 0.5, py: 0.5, shadow: 0.45 }),
      L('shape', { x: 1250, y: 300, w: 300, h: 76, kind: 'rounded', radius: 38, fill: '#042f2e' }),
      L('text', { text: 'Spilleliste', x: 1250, y: 300, w: 300, h: 76, font: 'Montserrat', weight: 800, size: 30, color: '#99f6e4', align: 'center', valign: 'middle', upper: true, ls: 0.15, role: 'name' }),
      L('text', { text: 'Navn på\nlisten', x: 1250, y: 410, w: 600, h: 420, font: 'Anton', weight: 400, size: 180, lh: 0.95, color: '#042f2e', upper: true, valign: 'top', role: 'theme' })
    ];
    return d;
  },
  playlisttop: () => {
    const d = emptyDoc(); d.bg = Object.assign(d.bg, { type: 'gradient', c1: '#3b0764', c2: '#1e0736', angle: 150 });
    d.layers = [
      L('text', { text: '10', x: 100, y: 120, w: 760, h: 840, font: 'Anton', weight: 400, size: 760, color: '#f472b6', align: 'center', valign: 'middle' }),
      L('text', { text: 'Spilleliste', x: 900, y: 300, w: 900, h: 60, font: 'Montserrat', weight: 800, size: 40, color: '#f9a8d4', upper: true, ls: 0.25, role: 'name' }),
      L('text', { text: 'Topp sanger\nakkurat nå', x: 900, y: 370, w: 900, h: 420, font: 'Anton', weight: 400, size: 180, lh: 0.95, upper: true, valign: 'top', role: 'theme' }),
      L('shape', { x: 900, y: 830, w: 360, h: 12, kind: 'rounded', radius: 6, fill: '#f472b6' })
    ];
    return d;
  },
  blank: () => { const d = emptyDoc(); d.bg.color = '#111111'; return d; }
};

/** Standardoppsett etter nøkkel (ukjent nøkkel gir blankt). */
export function layout(key: string): Doc {
  const k = LAYOUTS[key] ? key : 'blank'
  const d = (LAYOUTS[k] as () => Doc)()
  d.lay = k
  return d
}

export const BASE_KEYS = ['sunday', 'kbs', 'youth', 'blank'] as const
export type BaseKey = (typeof BASE_KEYS)[number]
export const BASE_LABELS: Record<BaseKey, string> = { sunday: 'Søndagsmøte', kbs: 'Kveldsbibelskole', youth: 'Ungdomsmøte', blank: 'Tomt oppsett' }
export const isBaseKey = (k: unknown): k is BaseKey => typeof k === 'string' && (BASE_KEYS as readonly string[]).includes(k)

/** Kategoriens innebygde grunnoppsett. Lagene får faste ID-er (b0, b1 …) så «Tilbake til grunnoppsettets plassering» virker. */
export function base(key: string): Doc {
  const d = (BASES[key] ?? (BASES.blank as () => Doc))()
  d.layers.forEach((l, i) => {
    l.id = 'b' + i
  })
  return d
}

export const LAYOUT_KEYS = Object.keys(LAYOUTS)
