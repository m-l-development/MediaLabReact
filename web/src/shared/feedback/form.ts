import type { Translate } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { scrubText, type FeedbackKind } from './feedback-core'

/**
 * Spørsmålene per kategori. `main` er felles for alle kategorier (teksten følger med ved bytte). Databasen tar imot
 * svarene expected, steps, improve, feature, severity og importance; de øvrige valgfrie svarene legges som egne avsnitt
 * i beskrivelsen (se buildFeedback), så backend og innboksen er uendret.
 */
export type Field = { key: string; label: MessageKey; help?: MessageKey; req?: true; type: 'line' | 'text' | 'sev' | 'imp' }
export const FIELDS: Record<FeedbackKind, Field[]> = {
  bug: [
    { key: 'main', label: 'fb.q.bug.main', req: true, type: 'line' },
    { key: 'what', label: 'fb.q.bug.what', help: 'fb.h.bug.what', req: true, type: 'text' },
    { key: 'expected', label: 'fb.q.bug.expected', type: 'text' },
    { key: 'steps', label: 'fb.q.bug.steps', help: 'fb.h.bug.steps', type: 'text' },
    { key: 'severity', label: 'fb.q.bug.severity', type: 'sev' },
  ],
  improvement: [
    { key: 'main', label: 'fb.q.imp.main', req: true, type: 'text' },
    { key: 'now', label: 'fb.q.imp.now', type: 'text' },
    { key: 'improve', label: 'fb.q.imp.wanted', type: 'text' },
    { key: 'benefit', label: 'fb.q.imp.benefit', type: 'text' },
    { key: 'importance', label: 'fb.q.priority', type: 'imp' },
  ],
  feature: [
    { key: 'main', label: 'fb.q.feat.main', req: true, type: 'text' },
    { key: 'feature', label: 'fb.q.feat.helps', type: 'text' },
    { key: 'problem', label: 'fb.q.feat.problem', type: 'text' },
    { key: 'importance', label: 'fb.q.priority', type: 'imp' },
  ],
  other: [{ key: 'main', label: 'fb.q.other.main', req: true, type: 'text' }],
}
export const LEVELS: Record<'sev' | 'imp', [string, MessageKey][]> = {
  sev: [['', 'fb.level.choose'], ['low', 'fb.sev.low'], ['medium', 'fb.sev.medium'], ['high', 'fb.sev.high'], ['critical', 'fb.sev.critical']],
  imp: [['', 'fb.level.choose'], ['low', 'fb.imp.low'], ['medium', 'fb.imp.medium'], ['high', 'fb.imp.high'], ['critical', 'fb.imp.critical']],
}
const firstLine = (s: string) => (s.trim().split('\n')[0] ?? '').trim().slice(0, 140)

/** Overskrift, beskrivelse og svar til databasen ut fra kategorien og feltene (bare feltene i kategorien brukes). */
export function buildFeedback(kind: FeedbackKind, v: Record<string, string>, t: Translate): { title: string; description: string; answers: Record<string, string> } {
  const g = (k: string) => (v[k] ?? '').trim()
  const sec = (h: MessageKey, k: string) => (g(k) ? `${t(h)}\n${g(k)}` : '')
  const answers: Record<string, string> = {}
  const put = (k: string) => { if (g(k)) answers[k] = /^(importance|severity)$/.test(k) ? g(k) : scrubText(g(k)).slice(0, 2000) }
  if (kind === 'bug') {
    for (const k of ['expected', 'steps', 'severity']) put(k)
    return { title: firstLine(g('main')), description: g('what'), answers }
  }
  if (kind === 'improvement') {
    for (const k of ['improve', 'importance']) put(k)
    return { title: firstLine(g('main')), description: [g('main'), sec('fb.desc.now', 'now'), sec('fb.desc.benefit', 'benefit')].filter(Boolean).join('\n\n'), answers }
  }
  if (kind === 'feature') {
    for (const k of ['feature', 'importance']) put(k)
    return { title: firstLine(g('main')), description: [g('main'), sec('fb.desc.problem', 'problem')].filter(Boolean).join('\n\n'), answers }
  }
  return { title: firstLine(g('main')), description: g('main'), answers }
}
