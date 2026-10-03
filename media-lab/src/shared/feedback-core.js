/* Tilbakemeldinger – felles logikk uten DOM (testes i feedback-core.test.js):
   rensing av hemmeligheter, applikasjon/side, nettleser/enhet, og tekstformatet for «Kopier sak» (til bruk i Claude Code).
   Samme rensing kjøres i databasen ved lagring (app.feedback_scrub_*), i nettleseren før sending og ved kopiering. */

/* ---------- Rensing ---------- */
const SECRET_RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[fjernet: privat nøkkel]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[fjernet: token]'],
  [/sb_(secret|publishable)_[A-Za-z0-9_-]{6,}/g, '[fjernet: nøkkel]'],
  [/(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}/g, '[fjernet: nøkkel]'],
  [/([Bb]earer) +[A-Za-z0-9._~+/=-]{16,}/g, '$1 [fjernet]'],
  [/([?&#;](access_token|refresh_token|id_token|token|code|key|apikey|api_key|secret|password|passord|pwd|token_hash)=)[^&#\s"\\]+/gi, '$1[fjernet]'],
  [/(postgres(ql)?:\/\/[^:/\s"\\]+:)[^@\s"\\]+@/gi, '$1[fjernet]@'],
  [/[A-Za-z0-9_+/=]{40,}/g, '[fjernet: lang streng]'],
];
const PERSONAL_RULES = [
  [/(\b(passord|password|pwd|pin)\b\s*[:=]\s*)\S+/gi, '$1[fjernet]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[e-post fjernet]'],
  [/(\+47 ?)?(^|[^0-9])[49][0-9]{2} ?[0-9]{2} ?[0-9]{3}(?=[^0-9]|$)/g, '$2[telefon fjernet]'],
];
export const scrubSecrets = t => SECRET_RULES.reduce((s, [re, to]) => s.replace(re, to), String(t == null ? '' : t));
export const scrubText = t => PERSONAL_RULES.reduce((s, [re, to]) => s.replace(re, to), scrubSecrets(t));
/* Rens alle tekstverdier i et objekt (for teknisk kontekst og markering). */
export function scrubDeep(v) {
  if (typeof v === 'string') return scrubSecrets(v);
  if (Array.isArray(v)) return v.map(scrubDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubDeep(x)]));
  return v;
}

/* ---------- Applikasjon og side ---------- */
export const APPS = {
  'media-lab': 'Media Lab (forsiden)', 'connecthub-admin': 'ConnectHub Admin', 'photo-design': 'Photo Design', 'motion-design': 'Motion Design',
  'thumbnail-studio': 'Thumbnail Studio', 'loop-studio': 'Loop Studio', 'loop-editor': 'Loop Studio – editor', 'studio-editor': 'Loop Studio – studio-editor',
  'isolate-subject': 'Isolate Subject', mockups: 'Mockups', login: 'Innlogging',
};
import { fileFor } from '../../build/routes.js';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/* Applikasjon fra stien: /photo-design.dc.html eller den korte /photodesign → photo-design. */
export function appOf(pathname) {
  const f = fileFor(pathname);
  const m = /\/([a-z0-9-]+)(?:\.dc)?\.html$/i.exec(f ? '/' + f : String(pathname || '')) || [];
  const id = (m[1] || (String(pathname || '/') === '/' ? 'media-lab' : 'ukjent')).toLowerCase().slice(0, 60).replace(/[^a-z0-9-]/g, '') || 'ukjent';
  return { id, name: APPS[id] || id };
}
/* Sti uten parametere; visning (#-del) med ID-er erstattet av :id og uten parametere. */
export const cleanPath = p => String(p || '').split(/[?#]/)[0].replace(UUID, ':id').slice(0, 300);
export const cleanView = h => { const v = String(h || '').split('?')[0].replace(UUID, ':id').replace(/=[^&/]*/g, '=…'); return v && v !== '#' ? v.slice(0, 200) : ''; };

/* ---------- Nettleser og enhet (grovt, uten fingeravtrykk) ---------- */
export function browserOf(ua = '') {
  const u = String(ua);
  const pick = (re, name) => { const m = re.exec(u); return m ? name + ' ' + m[1] : null; };
  const browser = pick(/Edg\/(\d+)/, 'Edge') || pick(/OPR\/(\d+)/, 'Opera') || pick(/SamsungBrowser\/(\d+)/, 'Samsung Internet') || pick(/Firefox\/(\d+)/, 'Firefox')
    || pick(/CriOS\/(\d+)/, 'Chrome (iOS)') || pick(/Chrome\/(\d+)/, 'Chrome') || (/Safari\//.test(u) ? (pick(/Version\/(\d+)/, 'Safari') || 'Safari') : 'Ukjent nettleser');
  const os = /Windows NT 10/.test(u) ? 'Windows 10/11' : /Windows/.test(u) ? 'Windows' : /iPhone|iPad|iPod/.test(u) ? 'iOS ' + ((/OS (\d+)/.exec(u) || [])[1] || '')
    : /Android (\d+)/.test(u) ? 'Android ' + /Android (\d+)/.exec(u)[1] : /Mac OS X/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'Ukjent';
  return { browser, os: os.trim() };
}
export const deviceOf = (w, coarse) => (w < 600 ? 'mobil' : w < 1024 && coarse ? 'nettbrett' : 'PC');

/* ---------- Tekst for Claude Code ---------- */
export const KIND = { bug: 'Feil eller teknisk problem', improvement: 'Forslag til forbedring', feature: 'Ønske om ny funksjon', other: 'Annet' };
export const STATUS = { new: 'Ny', in_progress: 'Under behandling', needs_info: 'Trenger mer informasjon', resolved: 'Løst', rejected: 'Avvist' };
export const LEVEL = { low: 'Lav', medium: 'Middels', high: 'Høy', critical: 'Kritisk' };
const ENV = { production: 'Produksjon (main)', preview: 'ConnectHub Dev (grenen connecthub, Vercel Preview)', local: 'Lokal utvikling (connecthub-dev)' };
const NA = 'Ikke tilgjengelig';
const val = v => (v == null || v === '' ? NA : String(v));
const quote = t => String(t || '').split('\n').map(l => '> ' + l).join('\n');
const fmtTime = d => { try { return new Date(d).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'; } catch (e) { return NA; } };

const TASK = {
  bug: 'Undersøk feilen som er rapportert under. Finn relevant kode, gjenskap problemet om mulig og identifiser sannsynlig årsak.',
  improvement: 'Vurder forbedringsforslaget under. Finn koden som berøres, og foreslå en konkret og trygg forbedring.',
  feature: 'Vurder ønsket om en ny funksjon under. Finn hvor den naturlig hører hjemme i koden, og lag et forslag til løsning før du implementerer.',
  other: 'Gå gjennom tilbakemeldingen under og vurder om den krever endringer i prosjektet.',
};
const CLOSE = {
  bug: 'Undersøk denne tilbakemeldingen i prosjektet. Finn relevant kode og identifiser sannsynlig årsak. Kontroller eksisterende implementasjon og avhengigheter før du gjør endringer. Foreslå eller implementer en løsning i utviklingsgrenen (connecthub), ikke i produksjon. Ikke fjern eksisterende funksjonalitet. Legg til eller oppdater relevante tester, kjør testene og rapporter hva som er endret, hva som er testet og hva som fortsatt er usikkert. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  improvement: 'Vurder forbedringen i prosjektet. Kontroller eksisterende implementasjon og avhengigheter, og beskriv konsekvensene før du gjør endringer. Implementer bare i utviklingsgrenen (connecthub), ikke i produksjon. Ikke fjern eksisterende funksjonalitet. Legg til eller oppdater relevante tester, kjør testene og rapporter hva som er endret, testet og usikkert. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  feature: 'Vurder den nye funksjonen i prosjektet. Undersøk eksisterende struktur og gjenbruk det som finnes. Lag først en kort plan (omfang, berørte filer, tilgang og sikkerhet, tester) før implementering i utviklingsgrenen (connecthub). Ikke fjern eksisterende funksjonalitet. Ikke publiser til produksjon uten uttrykkelig godkjenning.',
  other: 'Vurder tilbakemeldingen og beskriv hva som eventuelt bør gjøres. Gjør bare endringer i utviklingsgrenen (connecthub), legg til tester ved behov, og ikke publiser til produksjon uten uttrykkelig godkjenning.',
};

/* Hvor koden for applikasjonen ligger (prosjektstrukturen: én mappe per side). */
export const codeHint = app => {
  if (!app || app === 'ukjent') return NA;
  const dir = 'media-lab/src/pages/' + (app === 'loop-editor' ? 'loop-editor' : app) + '/';
  return app === 'connecthub-admin' ? dir + ' (AdminPage.jsx, sections.jsx, ui.jsx) og media-lab/src/services/' : dir + ' (logic.js, template.jsx)';
};
const markedLines = m => {
  if (!m || typeof m !== 'object') return ['- Markering: ingen'];
  const r = m.rect || {}, e = m.element || {}, out = [];
  out.push('- Markering: ' + (m.mode === 'area' ? 'område' : 'element') + ` (x ${val(r.x)} %, y ${val(r.y)} %, bredde ${val(r.w)} %, høyde ${val(r.h)} % av synlig vindu ${val(m.viewport)})`);
  if (e.tag) out.push(`- Element: <${e.tag}>` + (e.role ? ` rolle="${e.role}"` : '') + (e.label ? ` tekst/etikett «${e.label}»` : ''));
  if (e.path) out.push('- Plassering i DOM: `' + e.path + '`');
  if (e.attrs && Object.keys(e.attrs).length) out.push('- Kjennetegn: ' + Object.entries(e.attrs).map(([k, v]) => '`' + k + '="' + v + '"`').join(', '));
  return out;
};
const errorLines = errs => (Array.isArray(errs) && errs.length
  ? errs.slice(0, 10).map(x => `- ${val(x.time && fmtTime(x.time))} · ${val(x.kind)}${x.code ? ' · kode ' + x.code : ''}: ${scrubText(x.message || '').slice(0, 300)}${x.source ? ' (' + x.source + (x.line ? ':' + x.line : '') + ')' : ''}`)
  : ['- Ingen feilmeldinger fanget opp']);

/* Én sak som Markdown. events = historikk (status og notater) – bare for Moderator/Developer. */
export function formatCase(c, events = [], { standalone = true } = {}) {
  const a = c.answers || {}, x = c.context || {}, kind = c.kind in KIND ? c.kind : 'other';
  const L = [];
  if (standalone) L.push(`# Tilbakemelding ${c.ref} – oppgave for Claude Code`, '');
  else L.push(`## Sak ${c.ref} – ${KIND[kind]}`, '');
  const H = n => (standalone ? '## ' : '### ') + n;
  L.push(H('1. Oppgave'), `- Type: ${KIND[kind]}`, `- ${TASK[kind]}`, c.title ? `- Kort oppsummering (fra brukeren): ${scrubText(c.title)}` : '- Kort oppsummering: se beskrivelsen', '');
  L.push(H('2. Saken (oppgitt av brukeren)'), `- Referanse: ${c.ref}`, `- Kategori: ${KIND[kind]}`, '- Beskrivelse:', quote(scrubText(c.description)));
  if (a.expected) L.push(`- Forventet oppførsel: ${scrubText(a.expected)}`);
  if (a.steps) L.push('- Slik kan det gjenskapes:', quote(scrubText(a.steps)));
  if (a.improve) L.push(`- Hva som bør forbedres: ${scrubText(a.improve)}`);
  if (a.feature) L.push(`- Ønsket funksjon: ${scrubText(a.feature)}`);
  if (a.where) L.push(`- Hvor i appen (brukerens ord): ${scrubText(a.where)}`);
  if (a.severity) L.push(`- Alvorlighet (brukerens vurdering): ${LEVEL[a.severity] || a.severity}`);
  if (a.importance) L.push(`- Viktighet for brukeren: ${LEVEL[a.importance] || a.importance}`);
  L.push('');
  L.push(H('3. Applikasjon og plassering (hentet automatisk)'), `- Applikasjon: ${val(c.app_name)} (\`${val(c.app)}\`)`, `- Side: \`${val(c.page)}\``,
    `- Visning: ${c.view ? '`' + c.view + '`' : NA}`, `- Kode (prosjektstruktur): ${codeHint(c.app)}`, ...markedLines(c.marked), '- Skjermbilde: ikke støttet i denne versjonen', '');
  L.push(H('4. Teknisk kontekst (hentet automatisk)'), `- Miljø: ${ENV[x.env] || val(x.env)}`, `- Versjon/bygg: ${val(x.build)}`, `- Git-commit: ${val(x.commit)}${x.branch ? ' (gren ' + x.branch + ')' : ''}`,
    `- Nettleser: ${val(x.browser)} · Operativsystem: ${val(x.os)} · Enhet: ${val(x.device)}`, `- Skjerm: ${val(x.screen)} · Vindu: ${val(x.viewport)} · Pikseltetthet: ${val(x.dpr)}`,
    `- Språk: ${val(x.lang)} · Tidssone: ${val(x.tz)}`, `- Innsendt: ${fmtTime(c.created_at)}`, `- Avsender: rolle ${val(c.role)}, intern bruker-ID ${val(c.submitter_id)}` + (c.church_id ? `, menighet-ID ${c.church_id}` : ''),
    '- Feilmeldinger fanget opp i appen (filtrert):', ...errorLines(x.errors), '');
  L.push(H('5. Oppfølging (internt, Moderator/Developer)'), `- Status: ${STATUS[c.status] || val(c.status)}` + (c.status_reason ? ` – begrunnelse: ${scrubText(c.status_reason)}` : ''));
  const ev = (events || []).filter(e => e);
  if (ev.length) for (const e of ev) L.push(e.kind === 'note' ? `- ${fmtTime(e.created_at)} notat (${val(e.actor_role)}): ${scrubText(e.text)}` : `- ${fmtTime(e.created_at)} status ${STATUS[e.old_status] || e.old_status} → ${STATUS[e.new_status] || e.new_status} (${val(e.actor_role)})${e.text ? ': ' + scrubText(e.text) : ''}`);
  else L.push('- Ingen interne notater eller statusendringer ennå');
  L.push('- Merk: årsaken er ikke fastslått med mindre det står i notatene over. Ikke behandle antakelser som fakta.', '');
  if (standalone) L.push('## 6. Instruksjon til Claude Code', CLOSE[kind]);
  return L.join('\n');
}

/* Flere saker i én tekst. Store eksporter deles i deler (hver sak hel) under maxChars. */
export function formatCases(cases, eventsById = {}, { scope = 'alle viste saker', now = new Date(), maxChars = 150000 } = {}) {
  const head = n => [`# Samlet oversikt over tilbakemeldinger i ConnectHub – for Claude Code`, '',
    `- Eksportert: ${fmtTime(now)}`, `- Utvalg: ${scope}`, `- Antall saker: ${n}`, '',
    '## Instruksjon til Claude Code',
    'Gå gjennom sakene én for én. Hver sak har eget referansenummer (TB-…) og er skilt med en linje. Ikke bland opplysninger mellom sakene. Opplysninger under «oppgitt av brukeren» er brukerens egne, «hentet automatisk» er teknisk kontekst, og «internt» er vurderinger fra Moderator/Developer. Prioriter feil foran forbedringer. For hver sak: undersøk relevant kode, beskriv sannsynlig årsak eller løsning, og foreslå eller implementer endringer bare i utviklingsgrenen (connecthub). Ikke fjern eksisterende funksjonalitet, legg til tester, og ikke publiser til produksjon uten uttrykkelig godkjenning. Rapporter per referansenummer.', ''].join('\n');
  const blocks = cases.map(c => formatCase(c, eventsById[c.id] || [], { standalone: false }));
  const parts = []; let cur = [];
  const size = arr => arr.reduce((n, b) => n + b.length + 6, 0);
  for (const b of blocks) { if (cur.length && size(cur) + b.length + head(0).length > maxChars) { parts.push(cur); cur = []; } cur.push(b); }
  if (cur.length) parts.push(cur);
  return parts.map((p, i) => head(cases.length).replace(`- Antall saker: ${cases.length}`, `- Antall saker: ${cases.length}` + (parts.length > 1 ? ` (del ${i + 1} av ${parts.length}: ${p.length} saker)` : '')) + '\n---\n\n' + p.join('\n\n---\n\n'));
}
