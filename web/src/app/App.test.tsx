import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAuthService } from '../services/auth/auth-service'
import { createCommunityService } from '../services/community'
import { createFilesService } from '../services/files'
import { createChurchSettings } from '../services/shared-setup'
import { App } from './App'
import { createRouter } from './router'

function setup(path = '/app/') {
  history.replaceState(null, '', path)
  const router = createRouter()
  const auth = createAuthService({ auth: null, data: null, dev: true })
  const services = { auth, community: createCommunityService(null), files: createFilesService(null, () => auth.accessToken()), churchSettings: createChurchSettings(null), router }
  render(<App services={services} />)
  return services
}

describe('App (lokal utvikling uten backend)', () => {
  it('viser forsiden som i dag: tittel, kortene og snarveien til «Dine medier»', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 1, name: 'Media Lab' })).toBeTruthy()
    for (const name of ['Loop Studio', 'Thumbnail Studio']) expect(screen.getByText(name)).toBeTruthy()
    expect(screen.getByRole('button', { name: /SoMe/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tools/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Dine medier/ }).getAttribute('href')).toBe('/app/medier')
  })

  it('åpner mappene SoMe og Tools (#some/#tools) med verktøyene inni', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /SoMe/ }))
    expect(location.hash).toBe('#some')
    expect(await screen.findByRole('heading', { level: 1, name: 'SoMe' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Motion design/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Photo design/ })).toBeTruthy()
  })

  it('navigerer til et verktøy uten sideinnlasting, med «← Media Lab» til forsiden og ærlig status', async () => {
    setup('/app/#some')
    const link = await screen.findByRole('link', { name: /Motion design/ })
    await act(async () => {
      fireEvent.click(link)
    })
    expect(location.pathname).toBe('/app/motion-design')
    expect(await screen.findByRole('heading', { name: /Motion design er ikke bygget/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Åpne dagens versjon/ }).getAttribute('href')).toBe('/motiondesign')
    expect(screen.getByRole('link', { name: /Media Lab/ }).getAttribute('href')).toBe('/app/')
  })

  it('direkte adresse til et verktøy som er bygget (Isolate Subject) og ett som ikke er det', async () => {
    setup('/app/isolate-subject')
    expect(await screen.findByRole('heading', { level: 1, name: 'Isolate Subject' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Slipp et bilde her/ })).toBeTruthy()
  })

  it('«Dine medier» har egen side', async () => {
    setup('/app/medier')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dine medier' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Last opp' })).toBeTruthy()
  })

  it('ukjent adresse gir «Siden finnes ikke»', async () => {
    setup('/app/tull')
    expect(await screen.findByRole('heading', { name: 'Siden finnes ikke' })).toBeTruthy()
  })

  it('bytter språk (NO/EN) og tema, og husker valget', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'EN' }))
    expect(await screen.findByRole('link', { name: /Your media/ })).toBeTruthy()
    expect(localStorage.getItem('medialab.lang')).toBe('en')
    fireEvent.click(screen.getByRole('button', { name: 'Switch between light and dark' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('medialab.theme')).toBe('light')
    fireEvent.click(screen.getByRole('button', { name: 'NO' }))
  })
})
