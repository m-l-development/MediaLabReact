import { describe, expect, it, vi } from 'vitest'
import type { AdminService } from '../../services/admin'
import { brandOf, sectionsFor } from './access'
import { activeOf, canJoinAnother, Cancelled, isGlobal, mainRole, memberActions, nameError, removeConfirmText, roleBlocked, roleSummary, splitName, welcomeName } from './members'

/** Portert fra access.test.js og members.test.js i dagens admin (samme forventninger). */
const sec = (o: Partial<Parameters<typeof sectionsFor>[0]>) => [...sectionsFor({ dev: false, collab: false, adminOf: [], churches: [], ...o })].sort()
const A = { id: 'a' }, B = { id: 'b' }
const STAFF = ['abonnement', 'brukere', 'filer', 'foresporsler', 'invitasjoner', 'logg', 'mail', 'menigheter', 'opprydning', 'oversikt', 'samarbeid', 'tilbakemeldinger', 'tilgang']

describe('admin: seksjoner per rolle (ADM, som access.test.js)', () => {
  it('Developer, Developer+Moderator og Moderator: hele systemadministrasjonen', () => {
    expect(sec({ dev: true })).toEqual(STAFF)
    expect(sec({ dev: true, collab: true })).toEqual(STAFF)
    expect(sec({ collab: true })).toEqual(STAFF)
  })
  it('Admin: brukere, menigheter, invitasjoner, filer, abonnement og logg – ikke samarbeid, opprydning, innboks eller mail', () => {
    expect(sec({ adminOf: ['a'], churches: [A] })).toEqual(['abonnement', 'brukere', 'filer', 'invitasjoner', 'logg', 'menigheter', 'oversikt', 'tilgang'])
    const s = sectionsFor({ dev: false, collab: false, adminOf: ['a'], churches: [A, B] })
    for (const k of ['samarbeid', 'opprydning', 'tilbakemeldinger', 'mail', 'foresporsler'] as const) expect(s.has(k)).toBe(false)
  })
  it('User: menigheter og filer; uten menighet og rolle bare oversikt', () => {
    expect(sec({ churches: [A] })).toEqual(['filer', 'menigheter', 'oversikt'])
    for (const k of ['opprydning', 'tilbakemeldinger', 'mail', 'foresporsler'] as const) expect(sectionsFor({ dev: false, collab: false, adminOf: [], churches: [A] }).has(k)).toBe(false)
    expect(sec({})).toEqual(['oversikt'])
  })
  it('toppfeltet viser rollen, og ukjent rolle aldri mer enn Bruker', () => {
    expect(['developer', 'moderator', 'admin', 'user', undefined].map(brandOf)).toEqual(['CONNECTHUB · DEVELOPER', 'CONNECTHUB · MODERATOR', 'CONNECTHUB · ADMIN', 'CONNECTHUB · BRUKER', 'CONNECTHUB · BRUKER'])
  })
})

describe('admin: medlemskap og navn (som members.test.js)', () => {
  const name = (id: string | null) => ({ a: 'Menighet A', b: 'Menighet B' } as Record<string, string>)[id ?? ''] ?? '–'
  const M = [{ user_id: 'u', church_id: 'a', status: 'active' }, { user_id: 'u', church_id: 'b', status: 'removed' }, { user_id: 'v', church_id: 'b', status: 'disabled' }]
  it('navn: forslag fra visningsnavnet, validering og velkomstnavn', () => {
    expect(splitName({ full_name: 'Ola Kristian Nordmann' })).toEqual({ first: 'Ola Kristian', last: 'Nordmann' })
    expect(splitName({ first_name: 'Kari', last_name: null, full_name: 'X Y' })).toEqual({ first: 'Kari', last: '' })
    expect(splitName({ full_name: '' })).toEqual({ first: '', last: '' })
    expect([nameError(' ', ''), nameError('x'.repeat(61), ''), nameError('<b>', 'N'), nameError('Kari', '')]).toEqual(['Skriv fornavn eller etternavn.', 'Navnet er for langt (maks 60 tegn).', 'Navnet inneholder ugyldige tegn.', null])
    expect(welcomeName({ first_name: 'Kari', last_name: 'Nordmann', full_name: 'K' })).toBe('Kari Nordmann')
    expect(welcomeName({ full_name: 'Ola N' })).toBe('Ola N')
    expect(welcomeName({ email: 'ola.nordmann@example.com' })).toBe('ola.nordmann')
    expect(mainRole([{ role: 'church_admin', church_id: 'a' }, { role: 'moderator', church_id: null }])).toBe('Moderator')
    expect(mainRole([])).toBe('Bruker')
  })
  it('medlemskap: bare aktive teller, Developer/Moderator er globale', () => {
    expect(activeOf(M, 'u').map((m) => m.church_id)).toEqual(['a'])
    expect(activeOf(M, 'v')).toEqual([])
    expect(isGlobal([{ role: 'developer', church_id: null }])).toBe(true)
    expect(isGlobal([{ role: 'moderator', church_id: null, revoked_at: '2026-10-01' }])).toBe(false)
    expect(isGlobal([{ role: 'church_admin', church_id: 'a' }])).toBe(false)
  })
  it('rolleoppsummering og én menighet om gangen', () => {
    expect(roleSummary([], name)).toBe('Bruker')
    expect(roleSummary([{ role: 'church_admin', church_id: 'a' }], name)).toBe('Admin i Menighet A')
    expect(roleSummary([{ role: 'developer', church_id: null }, { role: 'moderator', church_id: null }], name)).toBe('Developer, Moderator')
    const r = canJoinAnother([], M, 'u', name)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/Menighet A/)
    expect(canJoinAnother([], M, 'v', name).ok).toBe(true)
    expect(canJoinAnother([{ role: 'moderator', church_id: null }], M, 'u', name).ok).toBe(true)
  })
  it('global rolle blokkeres når den er den siste og brukeren har flere aktive medlemskap', () => {
    const dev = { id: 'r1', role: 'developer', church_id: null }, mod = { id: 'r2', role: 'moderator', church_id: null }
    expect([roleBlocked([dev], dev, 2), roleBlocked([dev], dev, 1), roleBlocked([dev], dev, 0), roleBlocked([dev, mod], dev, 3), roleBlocked([dev, { ...mod, revoked_at: 'x' }], dev, 2)]).toEqual([true, false, false, false, true])
  })
  it('bekreftelsen for fjerning nevner menigheten, og Admin-varsel når brukeren er Admin', () => {
    const t = removeConfirmText({ name: 'Ola', church: 'Menighet A', isAdmin: false })
    expect(t).toMatch(/Fjerne Ola fra Menighet A\?/)
    expect(t).toMatch(/Kontoen slettes ikke/)
    expect(t).not.toMatch(/står uten Admin/)
    expect(removeConfirmText({ name: 'Kari', church: 'Menighet A', isAdmin: true })).toMatch(/står uten Admin/)
  })
  it('handlingene spør først; avbrutt = ingen endring; meldingen forteller hva som skjedde', async () => {
    const admin = { removeMembership: vi.fn(async () => ({ admin_role_revoked: true, active_memberships_left: 0 })), setMembershipStatus: vi.fn(), revokeRole: vi.fn() } as unknown as AdminService
    const target = { userId: 'u', churchId: 'a', name: 'Ola', church: 'Menighet A', isAdmin: true, roleId: 'r1' }
    await expect(memberActions(admin, undefined, () => false).remove(target)).rejects.toBeInstanceOf(Cancelled)
    expect(admin.removeMembership).not.toHaveBeenCalled()
    expect(await memberActions(admin, undefined, () => true).remove(target)).toBe('Ola er fjernet fra Menighet A. Menigheten har nå ingen Admin. Brukeren har nå ingen aktiv menighet.')
    expect(admin.removeMembership).toHaveBeenCalledWith('u', 'a', 'Fjernet i ConnectHub Admin', true)
  })
})
