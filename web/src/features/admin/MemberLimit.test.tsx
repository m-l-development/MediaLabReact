import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServiceError } from '../../services/errors'
import { ChurchDetail } from './Churches'
import { ADM, DEV, setupAdmin } from './testkit'

/** Brukergrense per menighet (docs/plan-brukergrense.md). Grensen håndheves i databasen; her vises og brukes den. */
const sections = { menigheter: ({ id, sub }: { id?: string | undefined; sub?: string | undefined }) => (id ? <ChurchDetail id={id} tab={sub} /> : null) }
const usage = (count: number, limit = 10, pending = 0) => (fn: string) => (fn === 'member_usage' ? { count, limit, pending } : undefined)
afterEach(() => vi.unstubAllGlobals())

describe('Brukergrense', () => {
  it('Admin: ser «10 av 10» med ventende invitasjoner og varsel, men ikke overstyringen', async () => {
    setupAdmin(ADM, { hash: '#/menigheter/c1/innstillinger', sections, rpc: usage(10, 10, 2) })
    const box = await screen.findByText(/Brukere i menigheten/)
    expect(box.textContent).toContain('10 av 10')
    expect(box.textContent).toContain('inkludert ventende invitasjoner: 2')
    expect(screen.getByText(/Grensen er nådd/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lagre brukergrense' })).toBe(null)
  })

  it('Ny invitasjon: knappen er sperret når grensen er nådd', async () => {
    const { server } = setupAdmin(ADM, { hash: '#/menigheter/c1/innstillinger', sections, rpc: usage(10) })
    await screen.findByText(/Brukere i menigheten/)
    fireEvent.click(screen.getByRole('button', { name: '+ Ny invitasjon' }))
    const dlg = screen.getByRole('dialog', { name: 'Ny invitasjon' })
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Send invitasjon' })).toHaveProperty('disabled', true))
    expect(within(dlg).getByText(/Grensen er nådd/)).toBeTruthy()
    expect(server).not.toHaveBeenCalled()
  })

  it('Ny invitasjon åpnet før menighetene er lastet: menigheten i listen brukes (teller og invitasjon)', async () => {
    let done = () => undefined as void
    const loaded = new Promise<void>((r) => { done = r })
    const { server } = setupAdmin(ADM, { hash: '#/invitasjoner', rpc: usage(3), loaded })
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '+ Ny invitasjon' }))
    done()
    const dlg = screen.getByRole('dialog', { name: 'Ny invitasjon' })
    expect((await within(dlg).findByText(/Brukere i menigheten/)).textContent).toContain('3 av 10')
    fireEvent.change(within(dlg).getByLabelText('E-postadresse'), { target: { value: 'ny@b.no' } })
    fireEvent.click(within(dlg).getByRole('button', { name: 'Send invitasjon' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'invite.create', expect.objectContaining({ church_id: 'c1' })))
  })

  it('databasen avviser likevel (f.eks. samtidig invitasjon): tydelig melding', async () => {
    setupAdmin(ADM, {
      hash: '#/menigheter/c1/innstillinger', sections, rpc: usage(9),
      server: (action) => { if (action === 'invite.create') throw new ServiceError('member_limit'); return undefined },
    })
    await screen.findByText(/Brukere i menigheten/)
    fireEvent.click(screen.getByRole('button', { name: '+ Ny invitasjon' }))
    const dlg = screen.getByRole('dialog', { name: 'Ny invitasjon' })
    fireEvent.change(within(dlg).getByLabelText('E-postadresse'), { target: { value: 'nr11@b.no' } })
    await waitFor(() => expect(within(dlg).getByRole('button', { name: 'Send invitasjon' })).toHaveProperty('disabled', false))
    fireEvent.click(within(dlg).getByRole('button', { name: 'Send invitasjon' }))
    expect((await screen.findByText(/har nådd grensen for antall brukere/)).textContent).toContain('trekk tilbake en invitasjon')
  })

  it('stab: hever grensen med begrunnelse (databasen krever MFA og logger)', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/innstillinger', sections, rpc: usage(10) })
    expect(await screen.findByRole('button', { name: 'Lagre brukergrense' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Ny grense (1–1000)'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Begrunnelse (påkrevd, 10–500 tegn)'), { target: { value: 'Avtalt særtilfelle med menigheten' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre brukergrense' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_member_limit', { p_church: 'c1', p_limit: 12, p_reason: 'Avtalt særtilfelle med menigheten' }))
    expect((await screen.findByText('Brukergrensen er endret.')).textContent).toBeTruthy()
  })
})
