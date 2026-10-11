import { describe, expect, it, vi } from 'vitest'
import { createPwa, isIosSafari, LATER_KEY, type InstallEvent, type PwaDeps } from './pwa'

const DAY = 864e5
function setup(over: Partial<PwaDeps> = {}) {
  const store = new Map<string, string>()
  const timers: (() => void)[] = []
  let now = 100 * DAY
  const d: PwaDeps = {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0', platform: 'Win32', touchPoints: 0, standalone: false,
    now: () => now, storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v) },
    setTimeout: (fn) => void timers.push(fn), ...over,
  }
  return { pwa: createPwa(d), store, run: () => timers.splice(0).forEach((f) => f()), tick: (ms: number) => { now += ms } }
}
const event = (outcome: 'accepted' | 'dismissed') => ({ preventDefault: vi.fn(), prompt: vi.fn(async () => undefined), userChoice: Promise.resolve({ outcome }) }) as unknown as InstallEvent & { prompt: ReturnType<typeof vi.fn> }

describe('web-app (PLT-07, som ml-pwa.js)', () => {
  it('installasjonsprompten fanges og kortet vises etter en pause; «Åpne i web-app» viser nettleserens dialog', async () => {
    const s = setup(), e = event('accepted')
    s.pwa.onPrompt(e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(s.pwa.mode.get()).toBe(null)
    s.run()
    expect(s.pwa.mode.get()).toBe('install')
    await s.pwa.install()
    expect(e.prompt).toHaveBeenCalled()
    expect(s.pwa.mode.get()).toBe(null)
    expect(s.store.has(LATER_KEY)).toBe(false)
  })
  it('avbrutt installasjon og «Ikke nå» skjuler kortet i 14 dager', async () => {
    const s = setup()
    s.pwa.onPrompt(event('dismissed'))
    s.run()
    await s.pwa.install()
    expect(s.store.get(LATER_KEY)).toBeTruthy()
    s.tick(13 * DAY)
    s.pwa.onPrompt(event('dismissed'))
    s.run()
    expect(s.pwa.mode.get()).toBe(null)
    s.tick(2 * DAY)
    s.pwa.onPrompt(event('dismissed'))
    s.run()
    expect(s.pwa.mode.get()).toBe('install')
    s.pwa.later()
    expect(s.pwa.mode.get()).toBe(null)
    expect(Number(s.store.get(LATER_KEY))).toBe(115 * DAY)
  })
  it('iPhone i Safari får forklaringen; installert app og andre nettlesere på iPhone får ingenting', () => {
    const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1'
    expect(isIosSafari(ios, 'iPhone', 5)).toBe(true)
    expect(isIosSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 'MacIntel', 5)).toBe(true)
    expect(isIosSafari(ios.replace('Version/18.1', 'CriOS/140.0'), 'iPhone', 5)).toBe(false)
    const a = setup({ ua: ios, platform: 'iPhone', touchPoints: 5 })
    a.pwa.start()
    a.run()
    expect(a.pwa.mode.get()).toBe('ios')
    const b = setup({ ua: ios, platform: 'iPhone', touchPoints: 5, standalone: true })
    b.pwa.start()
    b.pwa.onPrompt(event('accepted'))
    b.run()
    expect(b.pwa.mode.get()).toBe(null)
  })
  it('installert (appinstalled) skjuler kortet', () => {
    const s = setup()
    s.pwa.onPrompt(event('accepted'))
    s.run()
    s.pwa.onInstalled()
    expect(s.pwa.mode.get()).toBe(null)
  })
})
