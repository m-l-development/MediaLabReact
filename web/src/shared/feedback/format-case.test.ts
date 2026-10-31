import { describe, expect, it } from 'vitest'
import { formatCase, formatCases, type CaseEvent, type FeedbackCase } from './format-case'

/** Portert fra feedback-core.test.js i dagens app. */
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop'
const CASE: FeedbackCase = {
  id: 'c1', ref: 'TB-ABC123', kind: 'bug', title: 'Eksport stopper', description: `Eksporten stopper. Min e-post er ola@example.com og token ${JWT}`,
  answers: { expected: 'PNG lastes ned', steps: '1. Åpne\n2. Eksporter', severity: 'high' }, app: 'photo-design', app_name: 'Photo Design', page: '/photo-design.dc.html', view: '#/editor/:id',
  marked: { mode: 'element', rect: { x: 10, y: 20, w: 30, h: 5 }, viewport: '1440×900', element: { tag: 'button', role: 'button', label: 'Eksporter', path: 'div.panel > button.btn', attrs: { 'data-dc-tpl': '116' } } },
  context: { env: 'preview', build: 'b1', commit: 'a3a7029', branch: 'connecthub', browser: 'Chrome 140', os: 'Windows 10/11', device: 'PC', screen: '1920×1080', viewport: '1440×900', dpr: 1, lang: 'nb', tz: 'Europe/Oslo',
    errors: [{ time: '2026-10-02T10:00:00Z', kind: 'JS-feil', message: 'x is undefined', source: '/assets/photo.js', line: 12 }] },
  role: 'user', submitter_id: 'u-1', submitter_name: 'Ola Nordmann', church_id: 'ch-1', church_name: 'Menighet A', status: 'in_progress', status_reason: null, created_at: '2026-10-02T10:05:00Z',
}
const EVENTS: CaseEvent[] = [{ kind: 'status', old_status: 'new', new_status: 'in_progress', actor_role: 'moderator', created_at: '2026-10-02T11:00:00Z' }, { kind: 'note', text: 'Gjenskapt i Chrome', actor_role: 'developer', created_at: '2026-10-02T11:05:00Z' }]

describe('Kopier sak til Claude Code (ADM-12, som feedback-core.test.js)', () => {
  it('alle seksjoner, skiller bruker/automatisk/internt, ingen hemmeligheter eller navn', () => {
    const t = formatCase(CASE, EVENTS)
    for (const h of ['# Tilbakemelding TB-ABC123', '## 1. Oppgave', '## 2. Saken (oppgitt av brukeren)', '## 3. Applikasjon og plassering (hentet automatisk)', '## 4. Teknisk kontekst (hentet automatisk)', '## 5. Oppfølging (internt, Moderator/Developer)', '## 6. Instruksjon til Claude Code']) expect(t).toContain(h)
    expect(t).toMatch(/Forventet oppførsel: PNG lastes ned/)
    expect(t).toMatch(/Hvor mye det hindrer arbeidet \(brukerens vurdering\): Stopper en viktig oppgave/)
    expect(t).toMatch(/media-lab\/src\/pages\/photo-design\//)
    expect(t).toMatch(/ny app: web\/src\/features\/photo-design\//)
    expect(t).toMatch(/data-dc-tpl="116"/)
    expect(t).toMatch(/Element: <button>/)
    expect(t).toMatch(/Git-commit: a3a7029 \(gren connecthub\)/)
    expect(t).toMatch(/x is undefined \(\/assets\/photo\.js:12\)/)
    expect(t).toMatch(/Under behandling/)
    expect(t).toMatch(/notat \(developer\): Gjenskapt i Chrome/)
    expect(t).toMatch(/Ikke publiser til produksjon uten uttrykkelig godkjenning/)
    for (const bad of ['ola@example.com', 'eyJhbGci', 'Ola Nordmann', 'Menighet A']) expect(t).not.toContain(bad)
  })
  it('manglende opplysninger vises som «Ikke tilgjengelig», instruksjonen tilpasses typen', () => {
    const t = formatCase({ id: 'c2', ref: 'TB-000001', kind: 'feature', description: 'Mørk modus i eksport', status: 'new', created_at: '2026-10-02T10:00:00Z' })
    expect(t).toMatch(/Versjon\/bygg: Ikke tilgjengelig/)
    expect(t).toMatch(/Markering: ingen/)
    expect(t).toMatch(/Ingen interne notater/)
    expect(t).toMatch(/Lag først en kort plan/)
  })
  it('kopier alle saker: overskrift, dato, antall, hver sak skilt og hel; store eksporter deles uten at saker utelates', () => {
    const cases = Array.from({ length: 6 }, (_, i) => ({ ...CASE, id: 'c' + i, ref: 'TB-00000' + i, description: 'Sak nummer ' + i + ' ' + 'x'.repeat(800) }))
    const one = formatCases(cases, { c0: EVENTS }, { scope: 'test', now: new Date('2026-10-02T12:00:00Z') })
    expect(one).toHaveLength(1)
    expect(one[0]).toMatch(/Antall saker: 6/)
    expect(one[0]).toMatch(/Eksportert: 2026-10-02 12:00:00 UTC/)
    expect(one[0]?.split('\n---\n')).toHaveLength(7)
    const parts = formatCases(cases, {}, { maxChars: 5000 })
    expect(parts.length).toBeGreaterThan(1)
    const all = parts.join('\n')
    for (const c of cases) expect(all.split('## Sak ' + c.ref).length - 1).toBe(1)
    parts.forEach((p, i) => expect(p).toMatch(new RegExp('del ' + (i + 1) + ' av ' + parts.length)))
  })
})
