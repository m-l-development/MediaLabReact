import { describe, expect, it, vi } from 'vitest'
import { createRouter, hrefFor, parseLocation } from './router'

describe('parseLocation', () => {
  it('gir oversikten for /app/ og /app', () => {
    expect(parseLocation('/app/', '')).toEqual({ name: 'hub' })
    expect(parseLocation('/app', '')).toEqual({ name: 'hub' })
  })

  it('gir verktøy med spørringsparametre', () => {
    expect(parseLocation('/app/mockups', '?asset=abc')).toEqual({ name: 'tool', tool: 'mockups', query: { asset: 'abc' } })
    expect(parseLocation('/app/loop-studio/', '')).toEqual({ name: 'tool', tool: 'loop-studio', query: {} })
  })

  it('gir ikke-funnet for ukjente stier', () => {
    expect(parseLocation('/app/finnes-ikke', '').name).toBe('not-found')
    expect(parseLocation('/annet', '').name).toBe('not-found')
  })

  it('lager adresser som kan leses tilbake', () => {
    const route = { name: 'tool' as const, tool: 'photo-design' as const, query: { project: '1' } }
    const href = hrefFor(route)
    expect(href).toBe('/app/photo-design?project=1')
    const [path, search] = href.split('?')
    expect(parseLocation(path ?? '', `?${search}`)).toEqual(route)
  })
})

describe('createRouter', () => {
  it('navigerer med History API og følger tilbake/fram', async () => {
    history.replaceState(null, '', '/app/')
    const router = createRouter()
    await router.navigate({ name: 'tool', tool: 'mockups', query: {} })
    expect(location.pathname).toBe('/app/mockups')
    expect(router.route.get()).toMatchObject({ name: 'tool', tool: 'mockups' })

    history.replaceState(null, '', '/app/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(router.route.get()).toEqual({ name: 'hub' })
    router.dispose()
  })

  it('respekterer vakten (f.eks. ulagrede endringer)', async () => {
    history.replaceState(null, '', '/app/')
    const router = createRouter()
    const guard = vi.fn().mockResolvedValue(false)
    router.setGuard(guard)
    await router.navigate({ name: 'tool', tool: 'mockups', query: {} })
    expect(guard).toHaveBeenCalled()
    expect(router.route.get()).toEqual({ name: 'hub' })
    router.dispose()
  })
})
