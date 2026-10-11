/**
 * Hjelpere for visningen i Loop Studio (samme oppførsel som media-lab/src/shared/dc.jsx, som den gamle malen brukte).
 */
import { createElement, isValidElement, type CSSProperties, type ReactNode } from 'react'

const kebabToCamel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
/** Deler på «;», men ikke inne i url(…) eller anførselstegn (data-adresser har «;base64»). */
function splitDecls(s: string): string[] {
  const out: string[] = []
  let cur = '', depth = 0, q = ''
  for (const ch of s) {
    if (q) { if (ch === q) q = '' }
    else if (ch === '"' || ch === "'") q = ch
    else if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ';' && !depth) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}
const cssCache = new Map<string, CSSProperties>()
/** style="…" som tekst → stilobjekt (mellomlagret, siden de samme stilene tegnes hver gang). */
export function css(str: string): CSSProperties {
  const hit = cssCache.get(str)
  if (hit) return hit
  const o: Record<string, string> = {}
  for (const decl of splitDecls(str)) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (!prop) continue
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim()
  }
  if (cssCache.size > 4000) cssCache.clear()
  cssCache.set(str, o as CSSProperties)
  return o as CSSProperties
}
/** {{ uttrykk }} i tekst: elementer som de er, null/boolsk = ingenting, ellers oversatt tekst i <span>. */
export function interp(v: unknown, tx: (s: unknown) => string): ReactNode {
  if (v === undefined || v === null || typeof v === 'boolean') return null
  if (isValidElement(v) || Array.isArray(v)) return v as ReactNode
  return createElement('span', { className: 'sc-interp' }, tx(String(v)))
}
export const val = <T,>(v: T | undefined): T | '' => (v === undefined ? '' : v)
export const chk = (v: boolean | undefined): boolean => (v === undefined ? false : v)
export const list = <T,>(v: readonly T[] | undefined | null): readonly T[] => (Array.isArray(v) ? v : [])
