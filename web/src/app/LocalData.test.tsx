import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../domain/account'
import { shouldAsk } from '../infrastructure/local-user'
import { AppShell } from './AppShell'
import { AdoptPrompt } from './LocalData'
import { ServicesContext, type Services } from './services'

const U = '00000000-0000-4000-8000-000000000004'
const me = { id: U, email: 'a@b.no', full_name: 'Test Testesen', first_name: 'Test', last_name: 'Testesen', phone: null, mfa: false, roles: [], churches: [] } as unknown as Me
const create = (name: string) => new Promise<void>((res) => {
  const r = indexedDB.open(name, 1)
  r.onupgradeneeded = () => r.result.createObjectStore('x')
  r.onsuccess = () => { r.result.close(); res() }
})
const drop = (name: string) => new Promise<void>((res) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = () => res() })

beforeEach(async () => {
  localStorage.clear()
  for (const d of await indexedDB.databases()) if (d.name) await drop(d.name)
})

describe('lokale data i grensesnittet (PLT-17)', () => {
  it('spør om eierløse data skal knyttes til kontoen, og «De er ikke mine» huskes', async () => {
    await create('photodesign')
    render(<AdoptPrompt userId={U} />)
    const dlg = await screen.findByRole('dialog', { name: 'Prosjekter fra før innlogging' })
    expect(dlg.textContent).toContain('ingenting flyttes, kopieres eller slettes')
    fireEvent.click(screen.getByRole('button', { name: 'De er ikke mine' }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(shouldAsk(U)).toBe(false)
    expect(localStorage.getItem('ch.local.owner')).toBe(null)
  })
  it('spør ikke når det ikke finnes gamle data', async () => {
    render(<AdoptPrompt userId={U} />)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog')).toBe(null)
  })
  it('kontomenyen: «Logg ut og fjern mine lokale data» forklarer, fjerner brukerens data og logger ut', async () => {
    localStorage.setItem('photodesign.cats@' + U, 'meg')
    localStorage.setItem('medialab.theme', 'light')
    const signOut = vi.fn(async () => undefined)
    const services = { feedback: { available: () => true, submit: vi.fn() } } as unknown as Services
    render(
      <ServicesContext value={services}>
        <AppShell route={{ name: 'hub' }} me={me} onSignOut={signOut}><p>innhold</p></AppShell>
      </ServicesContext>,
    )
    fireEvent.click(screen.getByTitle('Test Testesen'))
    fireEvent.click(screen.getByRole('button', { name: 'Logg ut og fjern mine lokale data' }))
    expect(screen.getByText('Fjern lokale data?')).toBeTruthy()
    expect(screen.getByText(/Dette blir liggende: alt i ConnectHub/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(signOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Logg ut og fjern mine lokale data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fjern lokale data og logg ut' }))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(localStorage.getItem('photodesign.cats@' + U)).toBe(null)
    expect(localStorage.getItem('medialab.theme')).toBe('light')
  })
})
