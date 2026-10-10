import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ToolId } from '../domain/tool'
import { TOOLS, type ToolModule, type ToolProps } from './tools'

/**
 * Lazy-komponentene lages én gang ved oppstart (aldri under tegning), så React beholder tilstanden og hvert verktøy
 * blir en egen JS-del som lastes først når det åpnes.
 */
export const TOOL_COMPONENTS: Partial<Record<ToolId, LazyExoticComponent<ComponentType<ToolProps>>>> =
  Object.fromEntries(TOOLS.filter((t) => t.load).map((t) => [t.id, lazy(t.load as NonNullable<ToolModule['load']>)]))

/** Starter nedlastingen av et verktøy før brukeren klikker (hover/fokus). */
export function preloadTool(tool: ToolModule): void {
  void tool.load?.().catch(() => {
    // feilen vises når verktøyet faktisk åpnes
  })
}
