/**
 * Hurtigtastene i hver app, slik de faktisk er bundet i koden (PhotoDesign.tsx, ThumbnailStudio.tsx, motion-design/
 * controller.onKey, loop-studio/controller.onKey, Mockups.tsx, shared/mask/MaskEditor, shared/lib/useStageNav).
 * Vises i snarveipanelet (ShortcutsPanel: «?» eller Ctrl/⌘+Shift+?, som i Figma). «Mod» = Ctrl på Windows, ⌘ på macOS.
 * Hold listen i takt med tastene når de endres; e2e/shortcuts-panel.spec.ts kontrollerer et utvalg mot appene.
 */
import type { Lang } from '../i18n/i18n'

export interface Shortcut {
  keys: string
  label: readonly [no: string, en: string]
}
export interface ShortcutGroup {
  title: readonly [no: string, en: string]
  items: readonly Shortcut[]
}

const s = (keys: string, no: string, en: string): Shortcut => ({ keys, label: [no, en] })
const g = (no: string, en: string, items: Shortcut[]): ShortcutGroup => ({ title: [no, en], items })

/** Arbeidsflaten (lerret): samme i Photo Design, Thumbnail Studio og maskeredigeringen. */
const canvas = g('Arbeidsflaten', 'Canvas', [
  s('Hjul / to fingre opp–ned', 'Zoom rundt pekeren', 'Zoom at the pointer'),
  s('Knip', 'Jevn zoom', 'Smooth zoom'),
  s('Shift + hjul / to fingre sidelengs', 'Rull sideveis', 'Scroll sideways'),
  s('Mellomrom + dra', 'Panorer (midlertidig hånd)', 'Pan (temporary hand)'),
  s('Midtknapp + dra', 'Panorer', 'Pan'),
  s('+ / −', 'Zoom inn / ut', 'Zoom in / out'),
  s('0 / Shift+1', 'Tilpass til vinduet', 'Fit to window'),
  s('Shift+0', '100 %', '100%'),
  s('Alt+0', 'Forrige visning', 'Previous view'),
  s('Høyreklikk / Shift+F10', 'Meny for det som er under pekeren / valgt', 'Menu for what is under the pointer / selected'),
])

const editing = g('Redigering', 'Editing', [
  s('Mod+Z', 'Angre', 'Undo'),
  s('Mod+Shift+Z / Mod+Y', 'Gjør om', 'Redo'),
  s('Mod+C / Mod+X / Mod+V', 'Kopier / klipp ut / lim inn lag', 'Copy / cut / paste layers'),
  s('Mod+D', 'Dupliser', 'Duplicate'),
  s('Delete / Backspace', 'Slett valgte', 'Delete selection'),
  s('Piltaster (Shift: ×10)', 'Flytt valgte', 'Nudge selection'),
  s('Escape', 'Avbryt draing / fjern markering', 'Cancel drag / deselect'),
])

const values = g('Tallverdier', 'Values', [
  s('Klikk / Enter / F2', 'Skriv inn verdien', 'Type the value'),
  s('Pil opp / ned (Shift: ×10)', 'Endre med ett steg', 'Change by one step'),
  s('Enter / Escape', 'Godta / forkast', 'Accept / discard'),
])

const help = g('Hjelp', 'Help', [s('? / Mod+Shift+?', 'Vis hurtigtastene', 'Show shortcuts')])

export const SHORTCUTS: Record<string, readonly ShortcutGroup[]> = {
  'photo-design': [
    canvas,
    editing,
    g('Lag og verktøy', 'Layers and tools', [
      s('Mod+A', 'Velg alle lag', 'Select all layers'),
      s('Mod+G', 'Grupper / del opp', 'Group / ungroup'),
      s('V', 'Flytt', 'Move'),
      s('C', 'Beskjær (bildelag)', 'Crop (image layer)'),
      s('B', 'Pensel for utklipp (bildelag)', 'Cut-out brush (image layer)'),
      s('Mod+S', 'Lagre', 'Save'),
      s('← / → (bildeserie)', 'Forrige / neste bilde', 'Previous / next image'),
    ]),
    values,
    help,
  ],
  'thumbnail-studio': [
    canvas,
    editing,
    g('Lag', 'Layers', [
      s('Shift+H / Shift+V', 'Speilvend vannrett / loddrett', 'Flip horizontal / vertical'),
      s('Enter / Escape (beskjæring)', 'Bruk / avbryt beskjæring', 'Apply / cancel crop'),
    ]),
    values,
    help,
  ],
  'motion-design': [
    g('Tidslinjen', 'Timeline', [
      s('Hjul / to fingre opp–ned', 'Rull mellom spor', 'Scroll between tracks'),
      s('Shift + hjul / to fingre sidelengs', 'Rull i tid', 'Scroll in time'),
      s('Mod + hjul / Alt + hjul / knip', 'Zoom i tid rundt pekeren', 'Zoom in time at the pointer'),
      s('+ / − (Avansert)', 'Zoom i tid rundt spillehodet', 'Zoom in time around the playhead'),
      s('Shift+Z (Avansert)', 'Tilpass hele tidslinjen', 'Fit the whole timeline'),
      s('Mellomrom', 'Spill av / pause', 'Play / pause'),
      s('← / → (Shift: 1 s)', 'Ett bilde / ett sekund', 'One frame / one second'),
      s('Home / End', 'Til start / slutt', 'To start / end'),
    ]),
    g('Klipp', 'Clips', [
      s('S', 'Del ved spillehodet', 'Split at the playhead'),
      s('Q / W (Avansert)', 'Trim start / slutt til spillehodet', 'Trim start / end to the playhead'),
      s('Alt + ← / → (Avansert)', 'Flytt klippet', 'Move the clip'),
      s('Alt + ↑ / ↓ (Avansert)', 'Flytt til spor over / under', 'Move to track above / below'),
      s('M', 'Sett / fjern markør', 'Add / remove marker'),
      s('Mod+L / Mod+Shift+L', 'Koble / løs opp bilde og lyd', 'Link / unlink video and audio'),
      s('Mod+Alt+C / Mod+Alt+V', 'Kopier / lim inn farge og lyd', 'Copy / paste colour and audio'),
      s('Høyreklikk / Shift+F10', 'Meny for klipp og spor', 'Clip and track menu'),
    ]),
    editing,
    values,
    help,
  ],
  'loop-studio': [
    g('Loop', 'Loop', [
      s('Mellomrom', 'Spill av / pause', 'Play / pause'),
      s('Mod+Z / Mod+Shift+Z', 'Angre / gjør om', 'Undo / redo'),
      s('Alt + ← / → / Home / End', 'Flytt valgt slide', 'Move the selected slide'),
      s('Hjul over forhåndsvisningen', 'Zoom rundt pekeren', 'Zoom at the pointer'),
    ]),
    values,
    help,
  ],
  mockups: [
    g('Mockups', 'Mockups', [
      s('Mod+Z / Mod+Shift+Z', 'Angre / gjør om', 'Undo / redo'),
      s('Delete / Backspace', 'Fjern designet', 'Remove the design'),
      s('← / →', 'Forrige / neste mockup', 'Previous / next mockup'),
      s('Escape', 'Avslutt plassering / lukk', 'Finish placing / close'),
      s('Høyreklikk / Shift+F10', 'Meny for designet', 'Design menu'),
    ]),
    values,
    help,
  ],
  'isolate-subject': [
    g('Maskeredigering («Finjuster masken»)', 'Mask editing («Refine the mask»)', [
      s('B / R / E / L / V', 'Pensel / rektangel / ellipse / lasso / velg objekt', 'Brush / rectangle / ellipse / lasso / select object'),
      s('X', 'Bytt mellom Behold og Fjern', 'Switch Keep and Remove'),
      s('[ / ]', 'Mindre / større pensel', 'Smaller / larger brush'),
      s('Alt + hjul', 'Penselstørrelse', 'Brush size'),
      s('Mod+Z / Mod+Shift+Z', 'Angre / gjør om', 'Undo / redo'),
      s('Escape (under strøk)', 'Avbryt strøket', 'Cancel the stroke'),
    ]),
    canvas,
    values,
    help,
  ],
}

export const isMac = (): boolean => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** «Mod+Shift+Z» → «Ctrl+Shift+Z» (Windows) / «⌘⇧Z» (macOS). */
export function formatKeys(keys: string, mac = isMac()): string {
  if (!mac) return keys.replace(/\bMod\b/g, 'Ctrl')
  return keys.replace(/\bMod\+/g, '⌘').replace(/\bShift\+/g, '⇧').replace(/\bAlt\+/g, '⌥').replace(/\bMod\b/g, '⌘').replace(/\bAlt\b/g, '⌥')
}

export const pick = (p: readonly [string, string], lang: Lang): string => (lang === 'en' ? p[1] : p[0])
