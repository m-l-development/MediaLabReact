import { POINTS as FREDAG } from './fredag-points'

/**
 * Målepunkter i prosjektets egne bilder (media-lab/public/images), valgt i forstørrede utsnitt: [navn, x, y, skal beholdes].
 * Dekker hår (krøllete, mørkt mot lys vegg), hender og fingre, tatoveringer, briller, mikrofoner, mørke klær mot mørk
 * bakgrunn – og bakgrunn og gjenstander som ikke er personen (vegg, lysslynge, tallerken, appelsiner, tekst, logo).
 */
export type Pt = [string, number, number, boolean]
export const IMAGES: { file: string; w: number; h: number; mime: string; points: Pt[] }[] = [
  { file: 'fredag.jpeg', w: 1440, h: 1800, mime: 'image/jpeg', points: FREDAG },
  {
    file: 'tirsdag.png', w: 2560, h: 1707, mime: 'image/png', points: [
      ['krøllete hår', 1790, 280, true],
      ['øret', 1875, 445, true],
      ['skjorta', 1940, 670, true],
      ['fingre på gaffelen', 1550, 755, true],
      ['pekefinger', 1510, 735, true],
      ['tatovering', 1680, 760, true],
      ['finger på kniven', 1630, 900, true],
      ['vegg ved hodet', 1970, 370, false],
      ['vegg ved halsen', 1970, 470, false],
      ['vegg', 2190, 520, false],
      ['vegg mellom hånd og skjorte', 1600, 680, false],
      ['tallerken', 1550, 940, false],
      ['bordbrikke', 1725, 920, false],
      ['knute (hår)', 630, 430, true],
      ['hårkant', 520, 560, true],
      ['ansikt', 700, 610, true],
      ['fingre med negler', 940, 860, true],
      ['vegg ved knuten', 420, 480, false],
      ['vegg ved ansiktet', 820, 530, false],
      ['lysslynge (tynn ledning i bakgrunnen)', 410, 430, false],
      ['appelsiner', 960, 730, false],
      ['hår (mannen foran)', 450, 730, true],
      ['mørkt hår mot lys vegg', 2250, 700, true],
      ['hårtupper mot veggen', 2430, 1070, true],
      ['vegg ved håret', 2500, 950, false],
      ['trelist', 2450, 800, false],
    ],
  },
  {
    file: 'torsdag.png', w: 2560, h: 1707, mime: 'image/png', points: [
      ['fingertupp', 2200, 280, true],
      ['fingertupp høyre', 2270, 370, true],
      ['knoke', 2060, 630, true],
      ['håndbak', 1800, 1050, true],
      ['underarm', 1650, 1300, true],
      ['bakgrunn ved fingrene', 2350, 500, false],
      ['bakgrunn mellom fingrene', 2350, 800, false],
      ['bakgrunn', 2250, 1200, false],
      ['tekst (B)', 384, 422, false],
      ['logo', 384, 1344, false],
    ],
  },
]
