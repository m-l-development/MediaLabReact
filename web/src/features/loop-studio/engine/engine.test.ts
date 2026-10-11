import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __ukeloopAudioCtl, __ukeloopRendererFactory } from './player.js'
import { buildPlayerHTML } from './player-html'
import { keyOf, parse, SAMPLE, serialize } from './program.js'
import type { LoopData, LoopMedia, Slide } from './types'

/** Et 2D-lerret som godtar alle kall (happy-dom har ikke canvas). Teller kallene, så testen ser at noe ble tegnet. */
function fakeCtx() {
  const calls: Record<string, number> = {}
  const grad = { addColorStop: () => undefined }
  const state: Record<string | symbol, unknown> = { globalAlpha: 1, canvas: { width: 1920, height: 1080 } }
  const fns: Record<string, (...a: unknown[]) => unknown> = {
    measureText: (t: unknown) => ({ width: String(t).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  }
  const ctx = new Proxy(state, {
    get(t, k) {
      if (typeof k === 'string' && fns[k]) {
        const f = fns[k]
        return (...a: unknown[]) => {
          calls[k] = (calls[k] ?? 0) + 1
          return f(...a)
        }
      }
      if (k in t) return t[k]
      return (..._a: unknown[]) => {
        if (typeof k === 'string') calls[k] = (calls[k] ?? 0) + 1
      }
    },
    set(t, k, v) {
      t[k] = v
      return true
    },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const slides: Slide[] = [
  { id: 'a', type: 'day', day: 'Tirsdag', date: '25. aug', time: 'kl 19:00', title: 'Kveldsmat', place: 'Kafeen', dur: 4 },
  { id: 'b', type: 'text', kicker: 'Velkommen', pill: 'Kl 11', body: 'Hei og velkommen\nTo linjer', sub: 'Under', dur: 4 },
  { id: 'c', type: 'contact', kicker: 'Kontakt', headline: 'Bli med', text: 'Skann', email: 'post@x.no', qr: ['101', '010', '101'], dur: 4 },
  {
    id: 'd', type: 'outro', title: 'Slutt', sub: 'Alle er velkommen', dur: 4,
    ftexts: [{ text: 'Fri', x: 0.5, y: 0.5, size: 1, box: true }], fqr: { url: 'https://x.no', qr: ['11', '11'], x: 0.8, y: 0.4, size: 200, caption: 'Skann', contact: 'x' },
    vigs: [{ type: 'oval', x: 0.3, y: 0.3, amt: 1.5, soft: 0.9 }], bgFill: { mode: 'conicRep', stops: [{ c: '#112233', p: 0 }, { c: '#ffffff', p: 1 }], repeat: 4 },
  },
]
const media = (): LoopMedia => ({ images: {}, video: null, vids: {} })

describe('Loop-motoren (portert uendret)', () => {
  const R = __ukeloopRendererFactory()
  // Filmkornet tegnes på et eget lerret (document.createElement('canvas')).
  beforeEach(() => {
    const make = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = make(tag)
      if (tag === 'canvas') {
        const { ctx } = fakeCtx()
        ;(ctx as unknown as Record<string, unknown>).createImageData = (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })
        Object.defineProperty(el, 'getContext', { value: () => ctx })
      }
      return el
    }) as typeof document.createElement)
  })

  it('tegner alle slidetyper med alle overganger, teksteffekter og overlegg uten feil', () => {
    for (const transFx of ['fade', 'dip', 'slide', 'zoom', 'glitch', 'panels', 'cut'])
      for (const textFx of ['reveal', 'fade', 'slide', 'blur', 'pop', 'glitch', 'none'])
        for (const overlayFx of ['none', 'grain', 'leak', 'bokeh', 'snow', 'newyear', 'lines']) {
          const { ctx, calls } = fakeCtx()
          const data: LoopData = { cfg: { accent: '#f5b82c', header: 'Ukentlige møter', topLabel: 'Program', transFx, textFx, overlayFx, style: 'promo', duotone: true, rail: true }, slides }
          for (const t of [0.1, 3.9, 4.2, 9, 15.8]) R.drawFrame(ctx, 1920, 1080, data, media(), t)
          expect(calls.fillRect ?? 0).toBeGreaterThan(0)
        }
  })

  it('takt-effektene virker, også «glow» (ReferenceError i dagens app er rettet)', () => {
    for (const beatStyle of ['calm', 'groove', null])
      for (const fx of ['glow', 'zoom', 'step', 'shake', 'pump', 'streak', 'flash', 'bounce', 'vig']) {
        const { ctx } = fakeCtx()
        const data: LoopData = { cfg: { accent: '#f5b82c', beat: 0.5, beatFx: [fx], beatStyle, beatReframe: true, beatPolish: true, energy: [0.2, 0.8, 1], energyRate: 2, beatText: true, overlaySync: true, overlayFx: 'newyear' }, slides }
        for (const t of [0.05, 0.5, 1.01, 2.3, 6]) expect(() => R.drawFrame(ctx, 1080, 1920, data, media(), t)).not.toThrow()
      }
  })

  it('alle vignettyper og bakgrunnsfyll', () => {
    for (const vigType of ['auto', 'round', 'oval', 'bottom', 'top', 'cinema', 'sides', 'left', 'even'])
      for (const mode of ['solid', 'linear', 'mirror', 'radial', 'conic', 'mesh', 'stripes', 'wave', 'ellipse', 'corner', 'spot', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner']) {
        const { ctx } = fakeCtx()
        const s = slides.map((x) => ({ ...x, vigType, vigAmt: 1.6, vigSoft: 0.8, bgFill: { mode, stops: [{ c: '#000000', p: 0 }, { c: '#ff0000', p: 0.5, hard: true }, { c: '#ffffff', p: 1 }], angle: 45 } }))
        expect(() => R.drawFrame(ctx, 1920, 1080, { cfg: { vigType, vigs: [{ type: vigType }] }, slides: s }, media(), 1)).not.toThrow()
      }
  })

  it('locate finner slide og tid i sliden, og går rundt', () => {
    expect(R.locate([{ dur: 2 }, { dur: 3 }], 2.5)).toEqual({ i: 1, lt: 0.5, total: 5 })
    expect(R.locate([{ dur: 2 }, { dur: 3 }], 5.5)?.i).toBe(0)
    expect(R.locate([], 1)).toBeNull()
  })

  it('lydstyringen følger loop-klokken og stopper', () => {
    const started: number[] = []
    const ac = {
      state: 'running',
      currentTime: 0,
      createGain: () => ({ gain: { value: 0, setTargetAtTime: () => undefined }, connect: () => undefined }),
      createBufferSource: () => ({ connect: () => undefined, start: (_: number, p: number) => started.push(p), stop: () => undefined, disconnect: () => undefined }),
    } as unknown as BaseAudioContext
    const a = __ukeloopAudioCtl(ac, {} as AudioNode)
    a.setBuffer({ duration: 60 } as AudioBuffer)
    a.sync(true, 3, 20, { mode: 'cut', offset: 10 })
    expect(started).toEqual([13])
    a.stop()
    expect(a.duration()).toBe(60)
  })
})

describe('ukeprogrammet', () => {
  it('tolker eksempelet og skriver det tilbake likt', () => {
    const p = parse(SAMPLE)
    expect(p.days.map((d) => d.name)).toEqual(['Tirsdag', 'Torsdag', 'Fredag', 'Søndag'])
    expect(p.days[0]?.events[0]).toEqual({ time: 'kl 19:00', title: 'Kveldsmat i kafeen', place: '' })
    const back = serialize(p.days.flatMap((d) => d.events.map((e) => ({ day: d.name, date: d.date, ...e }))))
    expect(back).toBe('Tirsdag kl 19:00 Kveldsmat i kafeen\nTorsdag kl 11:00 Bønn\nFredag kl 19:00 Ungdomsmøte\nSøndag kl 11:00 Søndagsmøte')
  })

  it('dato, tidsrom, sted, ekstra og forkortede dager', () => {
    const p = parse('Tirs 25. aug 18.30-20 Basar – Kirkesalen\nEkstra: Dugnad kl 10\n3. september kl 18:30: Konsert\nsøn 11 Gudstjeneste')
    expect(p.days[0]).toMatchObject({ name: 'Tirsdag', date: '25. aug', events: [{ time: 'kl 18:30–20:00', title: 'Basar', place: 'Kirkesalen' }] })
    expect(p.days.find((d) => d.extra)?.events[0]?.title).toBe('Dugnad')
    expect(p.days.some((d) => d.name === '3. september')).toBe(true)
    expect(keyOf('Lørdag Ørn')).toBe('lordag-orn')
  })
})

describe('spiller-HTML', () => {
  it('bygger inn motoren som selvstendig kode med streng CSP', () => {
    const html = buildPlayerHTML({ W: 1920, H: 1080, title: 'Test <x>', data: { cfg: {}, slides }, media: { images: {}, video: null }, audio: null }, '@font-face{}')
    expect(html).toContain("default-src 'none'")
    expect(html).toContain('<title>Test &lt;x&gt;</title>')
    expect(html).not.toMatch(/\bexport function\b/)
    const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
    // Gyldig JavaScript uten import/eksport, og uten avhengigheter utenfor filen (kjøres med eget dokument).
    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('function __ukeloopRendererFactory()')
    expect(script).toContain('function __ukeloopAudioCtl(')
    expect(script).not.toContain('</script')
  })
})
