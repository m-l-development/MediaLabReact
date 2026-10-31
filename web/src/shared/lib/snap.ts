import { localStore } from './storage'
import { createStore } from './store'

/**
 * Snapping (hjelpelinjer) i designeditorene – felles valg for Thumbnail Studio og Photo Design (TB-2D9264). Før var
 * snapping alltid på og kunne bare slås av ved å holde Alt, så lag «klistret» seg til hverandre. Nå kan det slås av og på,
 * valget huskes på enheten, og Alt snur det midlertidig mens man drar. Mockups har egen festing til skjermen i
 * fotografiet (selve plasseringen), og er bevisst ikke med.
 */
const KEY = 'medialab.snap'

export const snapPref = createStore<boolean>(localStore.get(KEY) !== '0')

export function setSnap(on: boolean): void {
  snapPref.set(on)
  localStore.set(KEY, on ? '1' : '0')
}

/** Skal det snappes nå? Alt (Option på Mac) snur valget mens man drar. */
export const snapActive = (alt: boolean): boolean => snapPref.get() !== alt
