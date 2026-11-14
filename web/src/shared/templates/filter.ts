import type { TplSort } from './theme'

/** Én mal i biblioteket. `order` = rekkefølgen malene kom inn i (høyere = nyere). */
export interface TplItem {
  id: string
  name: string
  desc?: string
  cat: string
  order: number
}

/** «Alle maler». */
export const ALL = '*'

/** Filtrering, søk og sortering (ren funksjon, så den kan testes). */
export function filterTemplates<T extends TplItem>(items: readonly T[], o: { cat: string; q: string; sort: TplSort; cats: readonly string[] }): T[] {
  const q = o.q.trim().toLowerCase()
  const out = items.filter((t) => (o.cat === ALL || t.cat === o.cat) && (!q || `${t.name} ${t.desc ?? ''} ${t.id} ${t.cat}`.toLowerCase().includes(q)))
  const ci = (c: string) => { const i = o.cats.indexOf(c); return i < 0 ? 1e6 : i }
  if (o.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  else if (o.sort === 'cat') out.sort((a, b) => ci(a.cat) - ci(b.cat) || a.name.localeCompare(b.name, 'nb'))
  else if (o.sort === 'new') out.sort((a, b) => b.order - a.order)
  return out
}

