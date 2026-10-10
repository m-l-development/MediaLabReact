import type { ComponentType } from 'react'
import type { AssetKind } from '../domain/asset'
import { TOOL_GROUP, TOOL_IDS, type ToolGroup, type ToolId } from '../domain/tool'

/** Livssyklus et verktøy melder inn til skallet (oppdateringsvarsel, verktøybytte, opprydding). */
export interface ToolLifecycle {
  /** Lagre arbeidet (kalles før verktøybytte og før en ny versjon lastes). */
  save?: () => Promise<void>
  /** Sant mens verktøyet gjør noe som ikke må avbrytes (eksport, AI). */
  isBusy?: () => boolean
  /** Frigjør modeller, Workers, lyttere og object-URL-er. */
  dispose?: () => void
}

export interface ToolProps {
  query: Readonly<Record<string, string>>
  registerLifecycle: (lifecycle: ToolLifecycle) => void
}

export interface ToolModule {
  id: ToolId
  group: ToolGroup
  /** Hva «Åpne i …» kan sende inn. */
  accepts: readonly AssetKind[]
  /** Mangler til verktøyet er bygget på nytt; da vises lenke til dagens versjon. */
  load?: () => Promise<{ default: ComponentType<ToolProps> }>
}

const ACCEPTS: Record<ToolId, readonly AssetKind[]> = {
  'loop-studio': ['image', 'video', 'audio'],
  'thumbnail-studio': ['image'],
  'motion-design': ['image', 'video', 'audio'],
  'photo-design': ['image'],
  'isolate-subject': ['image'],
  mockups: ['image'],
}

/**
 * Registeret over verktøy. Et verktøy som bygges på nytt, får `load: () => import('../features/<id>')` her.
 * Verktøy som ikke er bygget ennå, viser lenken til dagens versjon.
 */
const LOADERS: Partial<Record<ToolId, ToolModule['load']>> = {
  'isolate-subject': () => import('../features/isolate-subject/IsolateSubject'),
  mockups: () => import('../features/mockups/Mockups'),
}

export const TOOLS: readonly ToolModule[] = TOOL_IDS.map((id) => {
  const load = LOADERS[id]
  return { id, group: TOOL_GROUP[id], accepts: ACCEPTS[id], ...(load ? { load } : {}) }
})

export const toolById = (id: ToolId): ToolModule => {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Ukjent verktøy: ${id}`)
  return tool
}
