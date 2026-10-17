import { createElement, type ComponentType } from 'react'
import type { ToolId } from '../domain/tool'
import { TOOLS, type ToolModule, type ToolProps } from './tools'

/**
 * Som React.lazy, men uten unødvendig venting: er modulen allerede hentet (f.eks. forhåndslastet ved hover), tegnes den
 * straks. React.lazy venter alltid én gang, og React viser ventet innhold tidligst etter ca. 300 ms – det gjorde at hvert
 * verktøy brukte minst 0,3 s på å åpne, også når koden lå klar. Er modulen ikke hentet ennå, venter vi på den som før.
 */
export function fastLazy<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let mod: ComponentType<P> | null = null
  let pending: Promise<void> | null = null
  /** Feilen fra siste nedlasting: går til feilgrensen («Prøv igjen» og selvreparasjon) til retry() kalles. */
  let failed: { error: unknown } | null = null
  const preload = (): Promise<void> => {
    pending ??= load().then(
      (m) => { mod = m.default },
      (e: unknown) => { pending = null; failed = { error: e }; throw e },
    )
    return pending
  }
  function FastLazy(props: P) {
    // Utenfor React Compiler: modulen (mod) endres etter nedlastingen. Løftet kastes (Suspense-protokollen React.lazy
    // bruker); use() ble aldri ferdig ved første montering i en ny Suspense-grense (kontrollert i tool-loader.test.tsx).
    'use no memo'
    // feilen står (som React.lazy) til «Prøv igjen» ber om et nytt forsøk med retry()
    if (failed) throw failed.error
    if (!mod) throw preload().catch(() => undefined)
    return createElement(mod, props)
  }
  /** Nytt forsøk etter feil: neste tegning laster modulen på nytt. */
  const retry = () => {
    failed = null
  }
  return { Component: FastLazy, preload, retry }
}

/** Én per verktøy, laget ved oppstart (aldri under tegning), så React beholder tilstanden; hvert verktøy er en egen JS-del. */
const LAZY: Partial<Record<ToolId, ReturnType<typeof fastLazy<ToolProps>>>> = Object.fromEntries(
  TOOLS.filter((t) => t.load).map((t) => [t.id, fastLazy<ToolProps>(t.load as NonNullable<ToolModule['load']>)]),
)
export const TOOL_COMPONENTS: Partial<Record<ToolId, ComponentType<ToolProps>>> = Object.fromEntries(Object.entries(LAZY).map(([id, l]) => [id, l.Component]))

/** «Prøv igjen» i verktøyets feilvisning: glem feilede nedlastinger så de hentes på nytt. */
export function retryToolLoads(): void {
  for (const l of Object.values(LAZY)) l?.retry()
}

/** Ved «spar data» eller svært treg forbindelse hoppes forhåndslastingen over (som prefetch.js i dagens app). */
export function slowConnection(c: { saveData?: boolean; effectiveType?: string } | undefined = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection): boolean {
  return !!c && (!!c.saveData || /(^|-)2g$/.test(c.effectiveType ?? ''))
}

/** Starter nedlastingen av et verktøy før brukeren klikker (peker, berøring eller fokus). */
export function preloadTool(tool: ToolModule): void {
  if (slowConnection()) return
  void LAZY[tool.id]?.preload().catch(() => {
    // feilen vises når verktøyet faktisk åpnes
  })
}
