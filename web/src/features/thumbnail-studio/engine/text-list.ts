/**
 * Punkt- og nummerlister i tekstlag (samme regler som dagens app). En linje er et listepunkt når den starter med
 * innrykk (2 mellomrom per nivå) og et merke: •, ◦, ▪, -, *, 1. / 1) eller a. / a) (bokstav bare med innrykk).
 */
const RE = /^([ \t]*)(•|◦|▪|[-*]|\d+[.)]|[a-z][.)])[  ]+(.*)$/i
export const BULLETS = ['•', '◦', '▪', '•'] as const

export interface ListItem { lvl: number; num: boolean; body: string }

export function parseItem(line: string): ListItem | null {
  const m = RE.exec(line)
  if (!m) return null
  const [, ind = '', mark = '', body = ''] = m
  if (/^[a-z]/i.test(mark) && !ind.length) return null
  return { lvl: Math.min(3, Math.floor(ind.replace(/\t/g, '  ').length / 2)), num: /^[0-9a-z]/i.test(mark), body }
}

/** Som `parseItem`, men eldre tekstlag med `list: 'num' | 'bullet'` behandler alle ikke-tomme linjer som punkter. */
export function listItem(p: string, legacy: string): ListItem | null {
  const it = parseItem(p)
  if (it) return it
  if ((legacy === 'num' || legacy === 'bullet') && p.trim()) return { lvl: 0, num: legacy === 'num', body: p.trim() }
  return null
}

export function marker(num: boolean, lvl: number, n: number): string {
  return num ? (lvl === 1 ? String.fromCharCode(97 + ((n - 1) % 26)) : String(n)) + '.' : (BULLETS[lvl] ?? '•')
}

/** Nummererer listene på nytt og normaliserer innrykk og merker. */
export function fixList(text: string): string {
  let cnt = [0, 0, 0, 0]
  return text.split('\n').map((line) => {
    const p = parseItem(line)
    if (!p) {
      if (line.trim()) cnt = [0, 0, 0, 0]
      return line
    }
    for (let k = p.lvl + 1; k < 4; k++) cnt[k] = 0
    if (p.num) cnt[p.lvl] = (cnt[p.lvl] ?? 0) + 1
    return '  '.repeat(p.lvl) + marker(p.num, p.lvl, cnt[p.lvl] ?? 0) + ' ' + p.body
  }).join('\n')
}

/** Teksten med eventuelt eldre listeformat skrevet inn i selve teksten. */
export function bakeList(text: string, list: string): string {
  if (list !== 'num' && list !== 'bullet') return text
  return fixList(text.split('\n').map((x) => (x.trim() && !parseItem(x) ? (list === 'num' ? '1. ' : '• ') + x.trim() : x)).join('\n'))
}

export const lineStart = (text: string, li: number): number => text.split('\n').slice(0, li).reduce((n, x) => n + x.length + 1, 0)

export type ListAction = 'plain' | 'bullet' | 'num' | 'in' | 'out'

/** Bruker en listeknapp på linjene markeringen dekker. → ny tekst og ny markering. */
export function applyListAction(text: string, s0: number, s1: number, act: ListAction): { text: string; sel: [number, number] } {
  const lines = text.split('\n')
  const lineAt = (p: number) => text.slice(0, p).split('\n').length - 1
  const a = lineAt(s0)
  const b = lineAt(Math.max(s0, s1))
  const rng = lines.slice(a, b + 1).map(parseItem)
  const allType = (t: 'num' | 'bullet') => rng.every((p) => p && (t === 'num' ? p.num : !p.num))
  for (let i = a; i <= b; i++) {
    const line = lines[i] ?? ''
    const p = parseItem(line)
    let it: { lvl: number; num: boolean } | null = p ? { lvl: p.lvl, num: p.num } : null
    const body = p ? p.body : line.replace(/^\s+/, '')
    if (act === 'plain') it = null
    else if (act === 'bullet' || act === 'num') it = allType(act) ? null : { lvl: it ? it.lvl : 0, num: act === 'num' }
    else if (act === 'in') it = it ? { lvl: Math.min(3, it.lvl + 1), num: it.num } : { lvl: 0, num: false }
    else it = it && it.lvl > 0 ? { lvl: it.lvl - 1, num: it.num } : null
    lines[i] = it ? '  '.repeat(it.lvl) + (it.num ? '1.' : '•') + ' ' + body : body
  }
  const out = fixList(lines.join('\n'))
  const ol = out.split('\n')
  const st = lineStart(out, a)
  const en = st + ol.slice(a, b + 1).join('\n').length
  return { text: out, sel: a === b ? [en, en] : [st, en] }
}

/**
 * Enter i et listepunkt gir nytt punkt (tomt punkt avslutter eller går et nivå ut); Tab/Shift+Tab endrer nivå.
 * → null når tasten skal virke som vanlig.
 */
export function listKey(text: string, pos: number, posEnd: number, key: string, shift: boolean): { text: string; sel: [number, number] } | null {
  if (key !== 'Enter' && key !== 'Tab') return null
  const ls0 = text.lastIndexOf('\n', pos - 1) + 1
  const le0 = text.indexOf('\n', pos)
  const le = le0 < 0 ? text.length : le0
  const p = parseItem(text.slice(ls0, le))
  const li = text.slice(0, ls0).split('\n').length - 1
  if (key === 'Tab') return p ? applyListAction(text, pos, posEnd, shift ? 'out' : 'in') : null
  if (shift || !p || pos !== posEnd) return null
  if (!p.body.trim()) {
    const nl = p.lvl > 0 ? '  '.repeat(p.lvl - 1) + (p.num ? '1.' : '•') + ' ' : ''
    const out = fixList(text.slice(0, ls0) + nl + text.slice(le))
    const at = lineStart(out, li) + (out.split('\n')[li] ?? '').length
    return { text: out, sel: [at, at] }
  }
  const rest = text.slice(pos, le)
  const out = fixList(text.slice(0, pos) + '\n' + '  '.repeat(p.lvl) + (p.num ? '1.' : '•') + ' ' + text.slice(pos))
  const at = lineStart(out, li + 1) + (out.split('\n')[li + 1] ?? '').length - rest.length
  return { text: out, sel: [at, at] }
}
