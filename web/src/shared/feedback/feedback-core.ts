/**
 * Tilbakemeldinger – felles logikk uten DOM, portert fra media-lab/src/shared/feedback-core.js: rensing av hemmeligheter
 * (samme regler som databasen, app.feedback_scrub_*), applikasjon og side, nettleser og enhet (grovt, uten fingeravtrykk).
 */

const SECRET_RULES: [RegExp, string][] = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[fjernet: privat nøkkel]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[fjernet: token]'],
  [/sb_(secret|publishable)_[A-Za-z0-9_-]{6,}/g, '[fjernet: nøkkel]'],
  [/(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}/g, '[fjernet: nøkkel]'],
  [/([Bb]earer) +[A-Za-z0-9._~+/=-]{16,}/g, '$1 [fjernet]'],
  [/([?&#;](access_token|refresh_token|id_token|token|code|key|apikey|api_key|secret|password|passord|pwd|token_hash)=)[^&#\s"\\]+/gi, '$1[fjernet]'],
  [/(postgres(ql)?:\/\/[^:/\s"\\]+:)[^@\s"\\]+@/gi, '$1[fjernet]@'],
  [/[A-Za-z0-9_+/=]{40,}/g, '[fjernet: lang streng]'],
]
const PERSONAL_RULES: [RegExp, string][] = [
  [/(\b(passord|password|pwd|pin)\b\s*[:=]\s*)\S+/gi, '$1[fjernet]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[e-post fjernet]'],
  [/(\+47 ?)?(^|[^0-9])[49][0-9]{2} ?[0-9]{2} ?[0-9]{3}(?=[^0-9]|$)/g, '$2[telefon fjernet]'],
]
export const scrubSecrets = (t: unknown): string => SECRET_RULES.reduce((s, [re, to]) => s.replace(re, to), String(t ?? ''))
export const scrubText = (t: unknown): string => PERSONAL_RULES.reduce((s, [re, to]) => s.replace(re, to), scrubSecrets(t))
/** Rens alle tekstverdier i et objekt (teknisk kontekst og markering). */
export function scrubDeep<T>(v: T): T {
  if (typeof v === 'string') return scrubSecrets(v) as T
  if (Array.isArray(v)) return v.map(scrubDeep) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubDeep(x)])) as T
  return v
}

/** Applikasjonene, med samme ID-er som i dagens app (innboksen i admin grupperer på dem). */
export const APPS: Record<string, string> = {
  'media-lab': 'Media Lab (forsiden)', 'connecthub-admin': 'ConnectHub Admin', 'photo-design': 'Photo Design', 'motion-design': 'Motion Design',
  'thumbnail-studio': 'Thumbnail Studio', 'loop-studio': 'Loop Studio', 'loop-editor': 'Loop Studio – editor', 'studio-editor': 'Loop Studio – studio-editor',
  'isolate-subject': 'Isolate Subject', mockups: 'Mockups', login: 'Innlogging', 'media-library': 'Dine medier',
}
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Applikasjon fra stien i den nye appen: /app/ → forsiden, /app/<verktøy>, /app/medier. Loop-editoren skilles ut. */
export function appOf(pathname: string, search = '', base = '/app/'): { id: string; name: string } {
  const p = String(pathname || '/')
  const rest = p.startsWith(base) ? p.slice(base.length) : p.replace(/^\//, '')
  const seg = (rest.split('/')[0] ?? '').toLowerCase()
  let id = !seg ? 'media-lab' : seg === 'medier' ? 'media-library' : /^[a-z0-9-]{1,60}$/.test(seg) && APPS[seg] ? seg : 'ukjent'
  if (id === 'loop-studio' && /[?&](mal|disk|grunn|demo)=/.test(search)) id = 'loop-editor'
  return { id, name: APPS[id] ?? id }
}
/** Sti uten parametere og med ID-er byttet ut. */
export const cleanPath = (p: unknown): string => String(p ?? '').split(/[?#]/)[0]?.replace(UUID, ':id').slice(0, 300) ?? ''
/** Visningen: spørringen uten verdier (f.eks. «?mal=…&disk=…»), eller #-delen som i dagens app. */
export function cleanView(search: string, hash = ''): string {
  const q = String(search || '').replace(/^\?/, '')
  if (q) return ('?' + q.split('&').map((kv) => (kv.split('=')[0] ?? '') + '=…').join('&')).slice(0, 200)
  const v = String(hash || '').split('?')[0]?.replace(UUID, ':id').replace(/=[^&/]*/g, '=…') ?? ''
  return v && v !== '#' ? v.slice(0, 200) : ''
}

export function browserOf(ua = ''): { browser: string; os: string } {
  const u = String(ua)
  const pick = (re: RegExp, name: string) => { const m = re.exec(u); return m ? name + ' ' + m[1] : null }
  const browser = pick(/Edg\/(\d+)/, 'Edge') ?? pick(/OPR\/(\d+)/, 'Opera') ?? pick(/SamsungBrowser\/(\d+)/, 'Samsung Internet') ?? pick(/Firefox\/(\d+)/, 'Firefox')
    ?? pick(/CriOS\/(\d+)/, 'Chrome (iOS)') ?? pick(/Chrome\/(\d+)/, 'Chrome') ?? (/Safari\//.test(u) ? (pick(/Version\/(\d+)/, 'Safari') ?? 'Safari') : 'Ukjent nettleser')
  const os = /Windows NT 10/.test(u) ? 'Windows 10/11' : /Windows/.test(u) ? 'Windows' : /iPhone|iPad|iPod/.test(u) ? 'iOS ' + (/OS (\d+)/.exec(u)?.[1] ?? '')
    : /Android (\d+)/.test(u) ? 'Android ' + (/Android (\d+)/.exec(u)?.[1] ?? '') : /Mac OS X/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'Ukjent'
  return { browser, os: os.trim() }
}
export const deviceOf = (w: number, coarse: boolean): string => (w < 600 ? 'mobil' : w < 1024 && coarse ? 'nettbrett' : 'PC')

export type FeedbackKind = 'bug' | 'improvement' | 'feature' | 'other'
export const KINDS: FeedbackKind[] = ['bug', 'improvement', 'feature', 'other']
