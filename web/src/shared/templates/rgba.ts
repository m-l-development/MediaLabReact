import { hexRgb } from './theme'

/** «#rrggbb» + gjennomsiktighet → CSS rgba(). */
export function rgba(c: string, a: number): string {
  const [r, g, b] = hexRgb(c)
  return `rgba(${r},${g},${b},${a})`
}
