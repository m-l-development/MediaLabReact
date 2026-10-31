import { fireEvent, render, screen, within } from '@testing-library/react'
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

const open = (submit: Submit) => {
  render(<Host submit={submit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Send tilbakemelding' }))
}
const kind = (name: string) => fireEvent.click(screen.getByRole('radio', { name }))
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const labels = () => [...screen.getByRole('dialog').querySelectorAll('[data-chfb-field] > label')].map((l) => l.textContent)
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send inn' }))

describe('Send tilbakemelding', () => {
  it('bare relevante spørsmål per kategori, med påkrevd/valgfritt og et eksempel', () => {
    open(vi.fn<Submit>())
    expect(screen.getByText('Velg hva tilbakemeldingen gjelder.')).toBeTruthy()
    kind('Rapporter en feil')
    expect(labels()).toEqual(['Hva fungerer ikke som forventet? *', 'Hva gjorde du, og hva skjedde? *', 'Hva forventet du skulle skje? (valgfritt)', 'Hvordan kan feilen gjenskapes? (valgfritt)', 'Hvor mye hindrer dette deg i arbeidet? (valgfritt)'])
    expect(screen.getByText('Eksempel: Bakgrunnen blir ikke fjernet rundt håret.')).toBeTruthy()
    expect(within(screen.getByLabelText('Hvor mye hindrer dette deg i arbeidet? (valgfritt)')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Velg …', 'Liten ulempe', 'Gjør arbeidet vanskeligere', 'Stopper en viktig oppgave', 'Jeg kan ikke bruke verktøyet'])
    kind('Foreslå en forbedring')
    expect(labels()).toEqual(['Hva ønsker du å forbedre? *', 'Hvordan fungerer dette i dag? (valgfritt)', 'Hvordan ønsker du at det skal fungere? (valgfritt)', 'Hva vil forbedringen hjelpe deg med? (valgfritt)', 'Hvor viktig er dette for deg? (valgfritt)'])
    expect(screen.getByText('Eksempel: Jeg ønsker å kunne justere penselstørrelsen med musehjulet.')).toBeTruthy()
    kind('Foreslå en ny funksjon')
    expect(labels()).toEqual(['Hvilken funksjon savner du? *', 'Hva skal funksjonen hjelpe deg med? (valgfritt)', 'Hvilket problem skal den løse? (valgfritt)', 'Hvor viktig er dette for deg? (valgfritt)'])
    expect(screen.getByText('Eksempel: Automatisk kantfølging når jeg markerer et objekt.')).toBeTruthy()
    kind('Annet')
    expect(labels()).toEqual(['Hva gjelder tilbakemeldingen? *'])
    // ingen tekniske felt å fylle ut; advarselen om hemmeligheter står
    expect(screen.queryByLabelText(/Hvor i appen/)).toBeNull()
    expect(screen.getByText(/Ikke skriv passord, API-nøkler/)).toBeTruthy()
  })

  it('feil: påkrevde felt markeres hver for seg; sendingen: hemmeligheter fjernes, svarene og konteksten følger med', async () => {
    const submit = vi.fn<Submit>(async () => ({ id: 'f1', ref: 'TB-ABC123' }))
    open(submit)
    kind('Rapporter en feil')
    send()
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByText('Noen påkrevde felt mangler. Se feltene som er markert.')).toBeTruthy()
    expect(screen.getAllByText('Fyll ut dette feltet (minst 3 tegn).')).toHaveLength(2)
    expect(screen.getByLabelText('Hva fungerer ikke som forventet? *').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(screen.getByLabelText('Hva fungerer ikke som forventet? *'))
    type('Hva fungerer ikke som forventet? *', 'Eksporten stopper')
    expect(screen.getAllByText('Fyll ut dette feltet (minst 3 tegn).')).toHaveLength(1)
    type('Hva gjorde du, og hva skjedde? *', 'Trykket Eksporter. passord: Hemmelig1 og ola@x.no')
    type('Hvordan kan feilen gjenskapes? (valgfritt)', '1. Åpne. 2. Eksporter.')
    type('Hvor mye hindrer dette deg i arbeidet? (valgfritt)', 'high')
    send()
    expect(await screen.findByText('TB-ABC123')).toBeTruthy()
    const arg = submit.mock.calls[0]?.[0]
    expect(arg?.kind).toBe('bug')
    expect(arg?.title).toBe('Eksporten stopper')
    expect(arg?.description).toMatch(/^Trykket Eksporter\./)
    expect(arg?.description).not.toContain('Hemmelig1')
    expect(arg?.description).not.toContain('ola@x.no')
    expect(arg?.answers).toEqual({ steps: '1. Åpne. 2. Eksporter.', severity: 'high' })
    expect(arg?.churchId).toBe('c1')
    expect(arg?.app).toBeTruthy()
    expect(Object.keys(arg?.context ?? {})).toEqual(expect.arrayContaining(['env', 'build', 'browser', 'viewport', 'errors']))
  })

  it('bytte kategori mister ikke tekst; forbedring sendes med svarene i beskrivelsen og i «improve»', async () => {
    const submit = vi.fn<Submit>(async () => ({ id: 'f2', ref: 'TB-DEF456' }))
    open(submit)
    kind('Rapporter en feil')
    type('Hva fungerer ikke som forventet? *', 'Penselen er for stor')
    type('Hva gjorde du, og hva skjedde? *', 'Zoomet inn')
    kind('Foreslå en forbedring')
    // hovedspørsmålet følger med; teksten fra feilskjemaet er tatt vare på
    expect((screen.getByLabelText('Hva ønsker du å forbedre? *') as HTMLTextAreaElement).value).toBe('Penselen er for stor')
    expect(screen.getByText(/Teksten du skrev under en annen kategori, er tatt vare på/)).toBeTruthy()
    type('Hvordan fungerer dette i dag? (valgfritt)', 'Fast størrelse')
    type('Hvordan ønsker du at det skal fungere? (valgfritt)', 'Musehjulet endrer størrelsen')
    type('Hva vil forbedringen hjelpe deg med? (valgfritt)', 'Små detaljer')
    type('Hvor viktig er dette for deg? (valgfritt)', 'medium')
    kind('Rapporter en feil')
    expect((screen.getByLabelText('Hva gjorde du, og hva skjedde? *') as HTMLTextAreaElement).value).toBe('Zoomet inn')
    kind('Foreslå en forbedring')
    send()
    expect(await screen.findByText('TB-DEF456')).toBeTruthy()
    const arg = submit.mock.calls[0]?.[0]
    expect(arg?.kind).toBe('improvement')
    expect(arg?.title).toBe('Penselen er for stor')
    expect(arg?.description).toBe('Penselen er for stor\n\nSlik fungerer det i dag:\nFast størrelse\n\nDet vil hjelpe meg med:\nSmå detaljer')
    // bare kategoriens felt sendes (ikke «what» fra feilskjemaet)
    expect(arg?.answers).toEqual({ improve: 'Musehjulet endrer størrelsen', importance: 'medium' })
  })

  it('ny funksjon: «feature» og problemet i beskrivelsen', async () => {
    const submit = vi.fn<Submit>(async () => ({ id: 'f3', ref: 'TB-GHI789' }))
    open(submit)
    kind('Foreslå en ny funksjon')
    type('Hvilken funksjon savner du? *', 'Kantfølging')
    type('Hva skal funksjonen hjelpe deg med? (valgfritt)', 'Raskere maskering')
    type('Hvilket problem skal den løse? (valgfritt)', 'Hår forsvinner')
    send()
    expect(await screen.findByText('TB-GHI789')).toBeTruthy()
    const arg = submit.mock.calls[0]?.[0]
    expect(arg?.description).toBe('Kantfølging\n\nProblemet den skal løse:\nHår forsvinner')
    expect(arg?.answers).toEqual({ feature: 'Raskere maskering' })
  })

  it('grensen per døgn gir egen melding, og teksten beholdes', async () => {
    const submit = vi.fn<Submit>(async () => { throw new ServiceError('rate_limited') })
    open(submit)
    kind('Annet')
    type('Hva gjelder tilbakemeldingen? *', 'Noe annet')
    send()
    expect((await screen.findByRole('alert')).textContent).toBe('Du har sendt mange tilbakemeldinger i dag. Prøv igjen senere.')
    expect((screen.getByLabelText('Hva gjelder tilbakemeldingen? *') as HTMLTextAreaElement).value).toBe('Noe annet')
  })

  it('nettverksfeil gir en forståelig melding', async () => {
    open(vi.fn<Submit>(async () => { throw new ServiceError('network') }))
    kind('Annet')
    type('Hva gjelder tilbakemeldingen? *', 'Hei')
    send()
    expect((await screen.findByRole('alert')).textContent).toBe('Ingen forbindelse. Prøv igjen.')
  })

  it('lukking spør før skrevet tekst forkastes', () => {
    const conf = vi.fn(() => false)
    vi.stubGlobal('confirm', conf)
    open(vi.fn<Submit>())
    kind('Annet')
    type('Hva gjelder tilbakemeldingen? *', 'tekst')
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(conf).toHaveBeenCalledWith('Forkaste teksten du har skrevet?')
    expect(screen.getByRole('dialog')).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
