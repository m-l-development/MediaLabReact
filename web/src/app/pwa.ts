/**
 * Media Lab som web-app (PLT-07), samme regler som media-lab/src/legacy/ml-pwa.js:
 * - Chrome/Edge/Android: installasjonsprompten (`beforeinstallprompt`) fanges, og kortet vises etter 2,5 s.
 * - iPhone/iPad i Safari: kortet forklarer «Legg til på Hjem-skjerm» etter 3 s.
 * - «Ikke nå» (og «OK» på iPhone, og avbrutt installasjon) skjuler kortet i 14 dager (`medialab.pwa.later`).
 * - Aldri når siden allerede kjører som installert app.
 */
import { createStore, type Store } from '../shared/lib/store'

export const LATER_KEY = 'medialab.pwa.later'
export const DAYS = 14

export interface InstallEvent extends Event {
  prompt(): Promise<void> | void
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export type PwaMode = 'install' | 'ios' | null

export interface PwaDeps {
  ua: string
  platform: string
  touchPoints: number
  standalone: boolean
  now(): number
  storage: { get(k: string): string | null; set(k: string, v: string): void }
  setTimeout(fn: () => void, ms: number): void
}

export function isIosSafari(ua: string, platform: string, touchPoints: number): boolean {
  const ios = /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && touchPoints > 1)
  return ios && !/crios|fxios|edgios|opios/i.test(ua)
}

export interface Pwa {
  mode: Store<PwaMode>
  /** Fra `beforeinstallprompt`. */
  onPrompt(e: InstallEvent): void
  onInstalled(): void
  /** «Åpne i web-app»: viser nettleserens installasjonsdialog. */
  install(): Promise<void>
  /** «Ikke nå» / «OK»: skjul i 14 dager. */
  later(): void
  start(): void
}

export function createPwa(d: PwaDeps): Pwa {
  const mode = createStore<PwaMode>(null)
  const ios = isIosSafari(d.ua, d.platform, d.touchPoints)
  let deferred: InstallEvent | null = null
  const snoozed = () => d.now() - (Number(d.storage.get(LATER_KEY)) || 0) < DAYS * 864e5
  const snooze = () => d.storage.set(LATER_KEY, String(d.now()))
  return {
    mode,
    onPrompt(e) {
      e.preventDefault()
      deferred = e
      if (!d.standalone && !snoozed()) d.setTimeout(() => { if (deferred && !mode.get()) mode.set('install') }, 2500)
    },
    onInstalled() {
      deferred = null
      mode.set(null)
    },
    async install() {
      const e = deferred
      deferred = null
      if (!e) { mode.set(null); return }
      await e.prompt()
      const r = await (e.userChoice ?? Promise.resolve(null))
      if (r?.outcome !== 'accepted') snooze()
      mode.set(null)
    },
    later() {
      snooze()
      mode.set(null)
    },
    start() {
      if (ios && !d.standalone && !snoozed()) d.setTimeout(() => { if (!mode.get()) mode.set('ios') }, 3000)
    },
  }
}
