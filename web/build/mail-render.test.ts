// @vitest-environment node
import { describe, expect, it } from 'vitest'
import * as legacy from '../../media-lab/src/shared/mail-render.js'
import * as ported from '../src/shared/mail/mail-render.ts'

/**
 * Forhåndsvisningen i den nye Mail-fanen (ADM-11) må vise nøyaktig det serveren sender. Serveren bruker
 * media-lab/src/shared/mail-render.js; denne testen sammenligner den porterte koden med den for alle standardmaler og
 * for tekst som skal escapes, flettefelt, ugyldige maler og ugyldige lenker.
 */
type Render = (t: unknown, o: unknown) => { subject: string; html: string; text: string }
const L = legacy as unknown as { renderMail: Render; templateProblem: (t: unknown) => string | null; DEFAULT_TEMPLATES: Record<string, unknown>; TEMPLATE_KEYS: string[]; TEMPLATE_NAMES: Record<string, string>; LIMITS: unknown }
const opts = { link: 'https://x.no/login.dc.html?token_hash=abc&type=invite', vars: { navn: 'Ola <script>', epost: 'ola@b.no', menighet: 'Menighet "A"', rolle: 'Bruker' }, logoSrc: 'data:image/png;base64,AAAA' }

describe('e-postmalene i den nye appen er identiske med serverens (ADM-11)', () => {
  it('samme maler, navn og grenser', () => {
    expect(ported.DEFAULT_TEMPLATES).toEqual(L.DEFAULT_TEMPLATES)
    expect([...ported.TEMPLATE_KEYS]).toEqual(L.TEMPLATE_KEYS)
    expect(ported.TEMPLATE_NAMES).toEqual(L.TEMPLATE_NAMES)
    expect(ported.LIMITS).toEqual(L.LIMITS)
  })
  it('samme HTML og tekst for alle standardmaler og for tekst med formatering, flettefelt og spesialtegn', () => {
    const extra = { subject: 'Hei {navn}', blocks: [{ t: 'h', text: '**Fet** og *kursiv* {menighet}' }, { t: 'p', text: 'Linje 1\nLinje 2 <b>&</b>' }, { t: 'hr' }, { t: 'link', label: 'Gå {rolle}' }, { t: 'small', text: "Ikke 'svar'" }] }
    for (const tpl of [...Object.values(ported.DEFAULT_TEMPLATES), extra]) expect(ported.renderMail(tpl, opts)).toEqual(L.renderMail(tpl, opts))
  })
  it('samme avvisning av ugyldige maler og lenker', () => {
    const bad = [null, {}, { subject: 'x', blocks: [] }, { subject: 'a\nb', blocks: [{ t: 'link', label: 'x' }] }, { subject: 'x', blocks: [{ t: 'p', text: 'uten lenke' }] },
      { subject: 'x', blocks: [{ t: 'link', label: 'a' }, { t: 'link', label: 'b' }] }, { subject: 'x', blocks: [{ t: 'script' }, { t: 'link', label: 'a' }] }]
    for (const t of bad) expect(ported.templateProblem(t)).toBe(L.templateProblem(t))
    const tpl = ported.DEFAULT_TEMPLATES.welcome
    for (const link of ['javascript:alert(1)', 'https://x.no/"><script>', '']) {
      expect(() => ported.renderMail(tpl, { ...opts, link })).toThrow('Ugyldig lenke')
      expect(() => L.renderMail(tpl, { ...opts, link })).toThrow('Ugyldig lenke')
    }
  })
})
