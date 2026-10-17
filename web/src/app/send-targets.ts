import type { AssetKind } from '../domain/asset'
import type { ToolId } from '../domain/tool'
import { TOOLS, type ToolModule } from './tools'

/**
 * Verktøyene et resultat kan sendes videre til («Bruk i …», SHR-02): alle andre bygde verktøy som tar imot filtypen.
 * Mottakeren åpnes med `?asset=<id>` fra Dine medier, så filen lastes ikke opp på nytt.
 */
export function sendTargets(from: ToolId, kind: AssetKind): ToolModule[] {
  return TOOLS.filter((tool) => tool.id !== from && !!tool.load && tool.accepts.includes(kind))
}
