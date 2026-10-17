import { scrubText } from './feedback-core'

/**
 * «Kopier sak» / «Kopier alle saker» i Tilbakemeldinger (ADM-12): strukturert Markdown til Claude Code, portert fra
 * formatCase/formatCases i media-lab/src/shared/feedback-core.js. Skiller det brukeren oppga, det som ble hentet
 * automatisk og det som er internt. Hemmeligheter og personopplysninger renses på nytt; avsenderens navn tas ikke med.
 */
export const KIND: Record<string, string> = { bug: 'Feil eller teknisk problem', improvement: 'Forslag til forbedring', feature: 'Ønske om ny funksjon', other: 'Annet' }
export const STATUS: Record<string, string> = { new: 'Ny', in_progress: 'Under behandling', needs_info: 'Trenger mer informasjon', resolved: 'Løst', rejected: 'Avvist' }
export const LEVEL: Record<string, string> = { low: 'Lav', medium: 'Middels', high: 'Høy', critical: 'Kritisk' }
const ENV: Record<string, string> = { production: 'Produksjon (main)', preview: 'ConnectHub Dev (grenen connecthub, Vercel Preview)', local: 'Lokal utvikling (connecthub-dev)' }
const NA = 'Ikke tilgjengelig'

type Kind = 'bug' | 'improvement' | 'feature' | 'other'
export interface CaseError { time?: string; kind?: string; code?: string; message?: string; source?: string; line?: number }
export interface CaseMark { mode?: string; rect?: { x?: number; y?: number; w?: number; h?: number }; viewport?: string; element?: { tag?: string; role?: string; label?: string; path?: string; attrs?: Record<string, string> } | null }
export interface FeedbackCase {
  id: string
  ref: string
  kind: string
  title?: string | null
  description: string
  answers?: Record<string, string> | null
  app?: string | null
  app_name?: string | null
  page?: string | null
  view?: string | null
  marked?: CaseMark | null
  context?: { env?: string; build?: string; commit?: string; branch?: string; browser?: string; os?: string; device?: string; screen?: string; viewport?: string; dpr?: number; lang?: string; tz?: string; errors?: CaseError[] } | null
  role?: string | null
  submitter_id?: string | null
  submitter_name?: string | null
  church_id?: string | null
  church_name?: string | null
  status: string
  status_reason?: string | null
  created_at: string
  archived_at?: string | null
  archive_reason?: string | null
  note_count?: number
}
export interface CaseEvent { id?: string; kind: string; text?: string | null; old_status?: string; new_status?: string; actor_role?: string | null; actor_name?: string | null; created_at: string }

const val = (v: unknown) => (v == null || v === '' ? NA : String(v))
const quote = (t: string) => t.split('\n').map((l) => '> ' + l).join('\n')
const fmtTime = (d: string | Date | undefined) => {
  try {
    return d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : NA
  } catch {
    return NA
  }
}
const TASK: Record<Kind, string> = {
  bug: 'Undersøk feilen som er rapportert under. Finn relevant kode, gjenskap problemet om mulig og identifiser sannsynlig årsak.',
  improvement: 'Vurder forbedringsforslaget under. Finn koden som berøres, og foreslå en konkret og trygg forbedring.',
  feature: 'Vurder ønsket om en ny funksjon under. Finn hvor den naturlig hører hjemme i koden, og lag et forslag til løsning før du implementerer.',
  other: 'Gå gjennom tilbakemeldingen under og vurder om den krever endringer i prosjektet.',
}
const CLOSE: Record<Kind, string> = {
  bug: 'Undersøk denne tilbakemeldingen i prosjektet. Finn relevant kode og identifiser sannsynlig årsak. Kontroller eksisterende implementasjon og avhengigheter før du gjør endringer. Foreslå eller implementer en løsning i utviklingsgrenen (connecthub), ikke i produksjon. Ikke fjern eksisterende funksjonalitet. Legg til eller oppdater relevante tester, kjør testene og rapporter hva som er endret, hva som er testet og hva som fortsatt er usikkert. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  improvement: 'Vurder forbedringen i prosjektet. Kontroller eksisterende implementasjon og avhengigheter, og beskriv konsekvensene før du gjør endringer. Implementer bare i utviklingsgrenen (connecthub), ikke i produksjon. Ikke fjern eksisterende funksjonalitet. Legg til eller oppdater relevante tester, kjør testene og rapporter hva som er endret, testet og usikkert. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  feature: 'Vurder den nye funksjonen i prosjektet. Undersøk eksisterende struktur og gjenbruk det som finnes. Lag først en kort plan (omfang, berørte filer, tilgang og sikkerhet, tester) før implementering i utviklingsgrenen (connecthub). Ikke fjern eksisterende funksjonalitet. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  other: 'Vurder tilbakemeldingen og beskriv hva som eventuelt bør gjøres. Gjør bare endringer i utviklingsgrenen (connecthub), legg til tester ved behov, og ikke publiser til produksjon uten uttrykkelig godkjenning.',
}

/** Den nye appens mappe for hver applikasjon (web/src/features). */
const FEATURE: Record<string, string> = {
  'media-lab': 'hub', 'connecthub-admin': 'admin', 'loop-editor': 'loop-studio', 'studio-editor': 'loop-studio', 'media-library': 'media-library', login: 'auth',
}
/** Hvor koden for applikasjonen ligger: dagens app (én mappe per side) og den nye appen (én mappe per funksjon). */
export function codeHint(app: string | null | undefined): string {
  if (!app || app === 'ukjent') return NA
  const legacy = 'media-lab/src/pages/' + app + '/' + (app === 'connecthub-admin' ? ' (AdminPage.jsx, sections.jsx, ui.jsx) og media-lab/src/services/' : ' (logic.js, template.jsx)')
  return legacy + '; ny app: web/src/features/' + (FEATURE[app] ?? app) + '/'
}
function markedLines(m: CaseMark | null | undefined): string[] {
  if (!m || typeof m !== 'object') return ['- Markering: ingen']
  const r = m.rect ?? {}, e = m.element ?? {}, out: string[] = []
  out.push('- Markering: ' + (m.mode === 'area' ? 'område' : 'element') + ` (x ${val(r.x)} %, y ${val(r.y)} %, bredde ${val(r.w)} %, høyde ${val(r.h)} % av synlig vindu ${val(m.viewport)})`)
  if (e.tag) out.push(`- Element: <${e.tag}>` + (e.role ? ` rolle="${e.role}"` : '') + (e.label ? ` tekst/etikett «${e.label}»` : ''))
  if (e.path) out.push('- Plassering i DOM: `' + e.path + '`')
  if (e.attrs && Object.keys(e.attrs).length) out.push('- Kjennetegn: ' + Object.entries(e.attrs).map(([k, v]) => '`' + k + '="' + v + '"`').join(', '))
  return out
}
const errorLines = (errs: CaseError[] | undefined) => (Array.isArray(errs) && errs.length
  ? errs.slice(0, 10).map((x) => `- ${val(x.time && fmtTime(x.time))} · ${val(x.kind)}${x.code ? ' · kode ' + x.code : ''}: ${scrubText(x.message || '').slice(0, 300)}${x.source ? ' (' + x.source + (x.line ? ':' + x.line : '') + ')' : ''}`)
  : ['- Ingen feilmeldinger fanget opp'])

/** Én sak som Markdown. events = historikk (status og notater) – bare for Moderator/Developer. */
export function formatCase(c: FeedbackCase, events: CaseEvent[] = [], { standalone = true } = {}): string {
  const a = c.answers ?? {}, x = c.context ?? {}, kind: Kind = c.kind in KIND ? (c.kind as Kind) : 'other'
  const L: string[] = []
  if (standalone) L.push(`# Tilbakemelding ${c.ref} – oppgave for Claude Code`, '')
  else L.push(`## Sak ${c.ref} – ${KIND[kind]}`, '')
  const H = (n: string) => (standalone ? '## ' : '### ') + n
  L.push(H('1. Oppgave'), `- Type: ${KIND[kind]}`, `- ${TASK[kind]}`, c.title ? `- Kort oppsummering (fra brukeren): ${scrubText(c.title)}` : '- Kort oppsummering: se beskrivelsen', '')
  L.push(H('2. Saken (oppgitt av brukeren)'), `- Referanse: ${c.ref}`, `- Kategori: ${KIND[kind]}`, '- Beskrivelse:', quote(scrubText(c.description)))
  if (a.expected) L.push(`- Forventet oppførsel: ${scrubText(a.expected)}`)
  if (a.steps) L.push('- Slik kan det gjenskapes:', quote(scrubText(a.steps)))
  if (a.improve) L.push(`- Hva som bør forbedres: ${scrubText(a.improve)}`)
  if (a.feature) L.push(`- Ønsket funksjon: ${scrubText(a.feature)}`)
  if (a.where) L.push(`- Hvor i appen (brukerens ord): ${scrubText(a.where)}`)
  if (a.severity) L.push(`- Alvorlighet (brukerens vurdering): ${LEVEL[a.severity] ?? a.severity}`)
  if (a.importance) L.push(`- Viktighet for brukeren: ${LEVEL[a.importance] ?? a.importance}`)
  L.push('')
  L.push(H('3. Applikasjon og plassering (hentet automatisk)'), `- Applikasjon: ${val(c.app_name)} (\`${val(c.app)}\`)`, `- Side: \`${val(c.page)}\``,
    `- Visning: ${c.view ? '`' + c.view + '`' : NA}`, `- Kode (prosjektstruktur): ${codeHint(c.app)}`, ...markedLines(c.marked), '- Skjermbilde: ikke støttet i denne versjonen', '')
  L.push(H('4. Teknisk kontekst (hentet automatisk)'), `- Miljø: ${(x.env && ENV[x.env]) || val(x.env)}`, `- Versjon/bygg: ${val(x.build)}`, `- Git-commit: ${val(x.commit)}${x.branch ? ' (gren ' + x.branch + ')' : ''}`,
    `- Nettleser: ${val(x.browser)} · Operativsystem: ${val(x.os)} · Enhet: ${val(x.device)}`, `- Skjerm: ${val(x.screen)} · Vindu: ${val(x.viewport)} · Pikseltetthet: ${val(x.dpr)}`,
    `- Språk: ${val(x.lang)} · Tidssone: ${val(x.tz)}`, `- Innsendt: ${fmtTime(c.created_at)}`, `- Avsender: rolle ${val(c.role)}, intern bruker-ID ${val(c.submitter_id)}` + (c.church_id ? `, menighet-ID ${c.church_id}` : ''),
    '- Feilmeldinger fanget opp i appen (filtrert):', ...errorLines(x.errors), '')
  L.push(H('5. Oppfølging (internt, Moderator/Developer)'), `- Status: ${STATUS[c.status] ?? val(c.status)}` + (c.status_reason ? ` – begrunnelse: ${scrubText(c.status_reason)}` : ''))
  const ev = events.filter(Boolean)
  if (ev.length) {
    for (const e of ev) {
      L.push(e.kind === 'note'
        ? `- ${fmtTime(e.created_at)} notat (${val(e.actor_role)}): ${scrubText(e.text ?? '')}`
        : `- ${fmtTime(e.created_at)} status ${STATUS[e.old_status ?? ''] ?? e.old_status} → ${STATUS[e.new_status ?? ''] ?? e.new_status} (${val(e.actor_role)})${e.text ? ': ' + scrubText(e.text) : ''}`)
    }
  } else L.push('- Ingen interne notater eller statusendringer ennå')
  L.push('- Merk: årsaken er ikke fastslått med mindre det står i notatene over. Ikke behandle antakelser som fakta.', '')
  if (standalone) L.push('## 6. Instruksjon til Claude Code', CLOSE[kind])
  return L.join('\n')
}

/** Flere saker i én tekst. Store eksporter deles i deler (hver sak hel) under maxChars. */
export function formatCases(cases: FeedbackCase[], eventsById: Record<string, CaseEvent[]> = {}, { scope = 'alle viste saker', now = new Date(), maxChars = 150000 } = {}): string[] {
  const head = (n: number) => ['# Samlet oversikt over tilbakemeldinger i ConnectHub – for Claude Code', '',
    `- Eksportert: ${fmtTime(now)}`, `- Utvalg: ${scope}`, `- Antall saker: ${n}`, '',
    '## Instruksjon til Claude Code',
    'Gå gjennom sakene én for én. Hver sak har eget referansenummer (TB-…) og er skilt med en linje. Ikke bland opplysninger mellom sakene. Opplysninger under «oppgitt av brukeren» er brukerens egne, «hentet automatisk» er teknisk kontekst, og «internt» er vurderinger fra Moderator/Developer. Prioriter feil foran forbedringer. For hver sak: undersøk relevant kode, beskriv sannsynlig årsak eller løsning, og foreslå eller implementer endringer bare i utviklingsgrenen (connecthub). Ikke fjern eksisterende funksjonalitet, legg til tester, og ikke publiser til produksjon uten uttrykkelig godkjenning. Rapporter per referansenummer.', ''].join('\n')
  const blocks = cases.map((c) => formatCase(c, eventsById[c.id] ?? [], { standalone: false }))
  const parts: string[][] = []
  let cur: string[] = []
  const size = (arr: string[]) => arr.reduce((n, b) => n + b.length + 6, 0)
  for (const b of blocks) {
    if (cur.length && size(cur) + b.length + head(0).length > maxChars) { parts.push(cur); cur = [] }
    cur.push(b)
  }
  if (cur.length) parts.push(cur)
  return parts.map((p, i) => head(cases.length).replace(`- Antall saker: ${cases.length}`, `- Antall saker: ${cases.length}` + (parts.length > 1 ? ` (del ${i + 1} av ${parts.length}: ${p.length} saker)` : '')) + '\n---\n\n' + p.join('\n\n---\n\n'))
}
