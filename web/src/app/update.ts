/**
 * Varsel om ny versjon (PLT-04), samme regler som media-lab/src/shared/ml-update.js:
 * - Hvert bygg har et nummer (BUILD) og filen version.json. Siden sjekker omtrent hvert minutt og når fanen blir synlig.
 * - Ved ny versjon lagres arbeidet (verktøyets livssyklus) og et kort med «Oppdater nå» / «Senere» vises.
 * - «Senere» skjuler kortet i 10 minutter. Ingen tvungen omlasting. Mens verktøyet er opptatt (eksport, AI), ventes det.
 * - I utvikling (BUILD = «dev») er sjekken av, med mindre en test slår den på (sessionStorage `ml.updateCheck`).
 */
import { createStore, type Store } from '../shared/lib/store'

export const EVERY = 60 * 1000
export const SNOOZE = 10 * 60 * 1000

export type UpdatePhase = 'saving' | 'saved' | 'failed' | 'nothing'
export interface UpdateState { open: boolean; phase: UpdatePhase }

export interface UpdateDeps {
  build: string
  /** Versjonsnummeret som ligger ute nå (null ved nettverksfeil). */
  fetchVersion(): Promise<string | null>
  /** Lagrer det åpne verktøyets arbeid: true = lagret, false = kunne ikke lagre, null = ingenting å lagre. */
  save(): Promise<boolean | null>
  busy(): boolean
  hidden(): boolean
  now(): number
  enabled: boolean
}

export interface UpdateWatcher {
  state: Store<UpdateState>
  /** Én sjekk (kalles av tidtakeren og når fanen blir synlig). */
  check(): Promise<void>
  later(): void
  /** Verktøyet som er åpent nå (lagring og «opptatt»). */
  setTool(tool: Pick<UpdateDeps, 'save' | 'busy'>): void
  /** «Oppdater nå»: lagrer og laster siden på nytt. */
  updateNow(reload: () => void): Promise<void>
}

export function createUpdateWatcher(d: UpdateDeps): UpdateWatcher {
  const state = createStore<UpdateState>({ open: false, phase: 'nothing' })
  let snoozeUntil = 0
  let checking = false

  async function check() {
    if (!d.enabled) return
    if (checking || state.get().open || d.hidden() || d.now() < snoozeUntil) return
    checking = true
    try {
      const v = await d.fetchVersion()
      if (!v || v === d.build || state.get().open || d.busy()) return
      state.set({ open: true, phase: 'saving' })
      const r = await d.save()
      state.set({ open: true, phase: r === true ? 'saved' : r === false ? 'failed' : 'nothing' })
    } finally {
      checking = false
    }
  }

  return {
    state,
    check,
    setTool(tool) {
      d.save = tool.save
      d.busy = tool.busy
    },
    later() {
      snoozeUntil = d.now() + SNOOZE
      state.set({ open: false, phase: 'nothing' })
    },
    async updateNow(reload) {
      state.set({ open: true, phase: 'saving' })
      await d.save()
      reload()
    },
  }
}
