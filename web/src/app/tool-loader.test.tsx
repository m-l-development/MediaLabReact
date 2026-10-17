import { fireEvent, render, screen } from '@testing-library/react'
import { Component, Suspense, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fastLazy } from './tool-loader'

/** Raskere åpning av verktøy: ingen venting når koden allerede er hentet, og riktig opprydning i utvikling (StrictMode). */
describe('fastLazy', () => {
  it('forhåndslastet modul tegnes straks uten venteskjerm', async () => {
    const lazy = fastLazy(async () => ({ default: () => <h1>Verktøy</h1> }))
    await lazy.preload()
    render(<Suspense fallback={<p>Laster</p>}><lazy.Component /></Suspense>)
    expect(screen.getByRole('heading', { name: 'Verktøy' })).toBeTruthy()
    expect(screen.queryByText('Laster')).toBe(null)
  })
  it('modul som ikke er hentet: venteskjerm, deretter verktøyet; nedlastingen startes bare én gang', async () => {
    const load = vi.fn(async () => ({ default: () => <h1>Verktøy</h1> }))
    const lazy = fastLazy(load)
    render(<Suspense fallback={<p>Laster</p>}><lazy.Component /></Suspense>)
    expect(screen.getByText('Laster')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Verktøy' })).toBeTruthy()
    await lazy.preload()
    expect(load).toHaveBeenCalledTimes(1)
  })
  it('feil ved lasting kan prøves på nytt (ny nedlasting)', async () => {
    let n = 0
    const lazy = fastLazy(async () => { if (n++ === 0) throw new Error('nett'); return { default: () => <h1>OK</h1> } })
    await expect(lazy.preload()).rejects.toThrow('nett')
    await lazy.preload()
    expect(n).toBe(2)
  })
  it('feil ved nedlasting når feilgrensen (som React.lazy), og «Prøv igjen» laster på nytt', async () => {
    let n = 0
    const lazy = fastLazy(async () => { if (n++ === 0) throw new Error('nett'); return { default: () => <h1>OK</h1> } })
    class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
      state = { error: null as unknown }
      static getDerivedStateFromError(error: unknown) { return { error } }
      render() { return this.state.error ? <button type="button" onClick={() => { lazy.retry(); this.setState({ error: null }) }}>Prøv igjen</button> : this.props.children }
    }
    render(<Boundary><Suspense fallback={<p>Laster</p>}><lazy.Component /></Suspense></Boundary>)
    fireEvent.click(await screen.findByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByRole('heading', { name: 'OK' })).toBeTruthy()
    expect(n).toBe(2)
  })
})
