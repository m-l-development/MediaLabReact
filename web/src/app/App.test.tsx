import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAuthService } from '../services/auth/auth-service'
import { createCommunityService } from '../services/community'
import { App } from './App'
import { createRouter } from './router'

function setup(path = '/app/') {
  history.replaceState(null, '', path)
  const router = createRouter()
  const services = { auth: createAuthService({ auth: null, data: null, dev: true }), community: createCommunityService(null), router }
  render(<App services={services} />)
  return services
}

describe('App (lokal utvikling uten backend)', () => {
  it('viser oversikten med alle verktøyene', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 1, name: 'Velkommen' })).toBeTruthy()
    for (const name of ['Loop Studio', 'Thumbnail Studio', 'Motion design', 'Photo design', 'Isolate Subject', 'Mockups']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('navigerer til et verktøy uten sideinnlasting og viser ærlig status med lenke til dagens versjon', async () => {
    setup()
    const link = (await screen.findAllByRole('link', { name: /Mockups/ }))[0]
    if (!link) throw new Error('fant ikke lenken')
    await act(async () => {
      fireEvent.click(link)
    })
    expect(location.pathname).toBe('/app/mockups')
    expect(await screen.findByRole('heading', { name: /Mockups er ikke bygget/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Åpne dagens versjon/ }).getAttribute('href')).toBe('/mockup')
  })

  it('direkte adresse til et verktøy og ukjent adresse', async () => {
    setup('/app/isolate-subject')
    expect(await screen.findByRole('heading', { name: /Isolate Subject er ikke bygget/ })).toBeTruthy()
  })

  it('ukjent adresse gir «Siden finnes ikke»', async () => {
    setup('/app/tull')
    expect(await screen.findByRole('heading', { name: 'Siden finnes ikke' })).toBeTruthy()
  })

  it('bytter språk og tema og husker valget', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Språk / Language' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeTruthy()
    expect(localStorage.getItem('medialab.lang')).toBe('en')
    fireEvent.click(screen.getByRole('button', { name: 'Switch between light and dark' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('medialab.theme')).toBe('light')
    fireEvent.click(screen.getByRole('button', { name: 'Språk / Language' }))
  })
})
