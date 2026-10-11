import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Me } from '../domain/account'
import { ServiceError } from '../services/errors'
import type { FeedbackInput } from '../services/feedback'
import { FeedbackButton } from './Feedback'
import { ServicesContext, type Services } from './services'

const me = { id: 'u1', email: 'a@b.no', full_name: 'Test', first_name: null, last_name: null, phone: null, mfa: false, roles: [], churches: [{ id: 'c1', name: 'Menighet', logo_file_id: null }] } as unknown as Me
type Submit = (input: FeedbackInput) => Promise<{ id: string; ref: string }>

function Host({ submit }: { submit: Submit }) {
  const [open, setOpen] = useState(false)
  const services = { feedback: { available: () => true, submit } } as unknown as Services
  return (
    <ServicesContext value={services}>
      <FeedbackButton me={me} fabClass={undefined} open={open} onOpen={setOpen} />
    </ServicesContext>
  )
}

describe('tilbakemeldingsknappen (PLT-21)', () => {
  it('kategori, beskrivelse og sending: hemmeligheter fjernes, teknisk kontekst og menighet følger med, referansen vises', async () => {
    const submit = vi.fn<Submit>(async () => ({ id: 'f1', ref: 'TB-ABC123' }))
    render(<Host submit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send tilbakemelding' }))
    expect(screen.getByText('Velg hva tilbakemeldingen gjelder.')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Rapporter en feil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send inn' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Skriv en beskrivelse (minst 3 tegn).')
    expect(submit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Hva skjedde? *'), { target: { value: 'Eksporten stopper. passord: Hemmelig1 og ola@x.no' } })
    fireEvent.change(screen.getByLabelText(/^Hvor alvorlig er det\?/), { target: { value: 'high' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send inn' }))
    expect(await screen.findByText('TB-ABC123')).toBeTruthy()
    const arg = submit.mock.calls[0]?.[0]
    expect(arg?.kind).toBe('bug')
    expect(arg?.description).toMatch(/^Eksporten stopper\./)
    expect(arg?.description).not.toContain('Hemmelig1')
    expect(arg?.description).not.toContain('ola@x.no')
    expect(arg?.answers).toEqual({ severity: 'high' })
    expect(arg?.churchId).toBe('c1')
    expect(Object.keys(arg?.context ?? {})).toEqual(expect.arrayContaining(['env', 'build', 'browser', 'viewport', 'errors']))
  })
  it('grensen per døgn gir egen melding, og teksten beholdes', async () => {
    const submit = vi.fn<Submit>(async () => { throw new ServiceError('rate_limited') })
    render(<Host submit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send tilbakemelding' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Annet' }))
    fireEvent.change(screen.getByLabelText('Beskriv saken *'), { target: { value: 'Noe annet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send inn' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Du har sendt mange tilbakemeldinger i dag. Prøv igjen senere.')
    expect((screen.getByLabelText('Beskriv saken *') as HTMLTextAreaElement).value).toBe('Noe annet')
  })
  it('lukking spør før skrevet tekst forkastes', () => {
    const conf = vi.fn(() => false)
    vi.stubGlobal('confirm', conf)
    render(<Host submit={vi.fn<Submit>()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send tilbakemelding' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Annet' }))
    fireEvent.change(screen.getByLabelText('Beskriv saken *'), { target: { value: 'tekst' } })
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(conf).toHaveBeenCalledWith('Forkaste teksten du har skrevet?')
    expect(screen.getByRole('dialog')).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
