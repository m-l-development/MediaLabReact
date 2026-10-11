import { describe, expect, it } from 'vitest'
import {
  colorClip, create, duckAt, exportSize, fixLanes, fmtCount, FORMATS, fromSrt, layout, mediaClip, normalize, ovDur, overlay,
  srcTime, TEMPLATES, text, toSrt, totalDur, type Media, type Project,
} from './model'
import { inferType, pack, unpack } from './packfile'
import { curveEval, hasCurve } from './render'

const sq = FORMATS[0] ?? { k: 'sq', name: '', ratio: '', w: 1080, h: 1080 }
const vid: Media = { id: 'm-v1', name: 'klipp.mp4', kind: 'video', dur: 10, w: 1920, h: 1080, thumb: '' }

describe('maler og formater', () => {
  it('5 formater og 8 maler, alle gir gyldige prosjekter', () => {
    expect(FORMATS.map((f) => f.ratio)).toEqual(['1:1', '4:5', '9:16', '16:9', '2,63:1'])
    expect(TEMPLATES).toHaveLength(8)
    for (const t of TEMPLATES) {
      const p = create(sq, t.k)
      expect(p.w).toBe(1080)
      expect(normalize(JSON.parse(JSON.stringify(p)))).toEqual(p)
    }
    expect(create(sq, 'blank').name).toBe('Nytt prosjekt')
    expect(create(sq, 'count').texts[1]?.countdown).toBe(true)
  })

  it('egendefinert størrelse holdes innenfor 240–4096 og blir partall', () => {
    const p = normalize({ w: 5000, h: 101 })
    expect([p.w, p.h]).toEqual([4096, 240])
    expect(normalize({ w: 1001, h: 999 }).w % 2).toBe(0)
  })
})

describe('validering', () => {
  it('ukjente verdier settes til standard, og gamle overgangsnavn oversettes', () => {
    const p = normalize({ clips: [{ kind: 'color', trans: { type: 'slide', dur: 9 }, c1: 'rød' }], texts: [{ anim: 'tull', font: 'Comic Sans' }] })
    const c = p.clips[0]
    expect(c?.trans).toEqual({ type: 'cover-l', dur: 3 })
    expect(c?.kind === 'color' && c.c1).toBe('#111111')
    expect(p.texts[0]?.anim).toBe('fade')
    expect(p.texts[0]?.font).toBe('Archivo')
  })

  it('logo godtar bare innebygde bilder og prosjektets egne filer', () => {
    expect(normalize({ logo: { src: 'm-123e4567-e89b-42d3-a456-426614174000' } }).logo.src).toBe('m-123e4567-e89b-42d3-a456-426614174000')
    expect(normalize({ logo: { src: 'https://evil.example/x.png' } }).logo.src).toBe('')
    expect(() => normalize(null)).toThrow()
  })
})

describe('tidslinjen', () => {
  it('overganger overlapper klippene, og totaltiden tar med tekst og overlegg', () => {
    const p = normalize({ clips: [colorClip({ dur: 4, trans: { type: 'none', dur: 0.5 } }), colorClip({ dur: 4, trans: { type: 'fade', dur: 1 } })], texts: [text({ start: 6, dur: 5 })] })
    const L = layout(p)
    expect(L[1]?.start).toBe(3)
    expect(L[1]?.tr).toBe(1)
    expect(totalDur(p)).toBe(11)
  })

  it('videoklipp: varighet etter fart, og kildetid baklengs', () => {
    const c = mediaClip(vid, { in: 2, out: 8, speed: 2 })
    const p = normalize({ clips: [c] })
    expect(layout(p)[0]?.dur).toBe(3)
    expect(srcTime({ ...c, rev: false }, 1)).toBe(4)
    expect(srcTime({ ...c, rev: true }, 1)).toBeCloseTo(5.98)
    expect(ovDur(overlay(vid, { in: 0, out: 6, speed: 0.5 }))).toBe(12)
  })

  it('overlappende tekster flyttes til neste lag; det som lå der fra før, blir liggende', () => {
    const a = text({ id: 'a', start: 0, dur: 4 })
    const b = text({ id: 'b', start: 2, dur: 4 })
    const p = fixLanes(normalize({ texts: [a, b] }))
    expect(p.texts.map((x) => x.lane)).toEqual([0, 1])
    expect(p.lanes.text).toBe(2)
    // «a» er nettopp lagt til (pin) i laget der «b» ligger: «b» blir liggende, «a» flyttes ned.
    const q = fixLanes({ ...p, texts: [{ ...a, lane: 0 }, { ...b, lane: 0 }] }, new Set(['a']))
    expect(q.texts.find((x) => x.id === 'b')?.lane).toBe(0)
    expect(q.texts.find((x) => x.id === 'a')?.lane).toBe(1)
  })
})

describe('tekst og lyd', () => {
  it('nedtelling i alle visninger', () => {
    expect(fmtCount(9.2, 'auto')).toBe('10')
    expect(fmtCount(75, 'auto')).toBe('1:15')
    expect(fmtCount(75, 'mmss')).toBe('01:15')
    expect(fmtCount(3725, 'hhmmss')).toBe('01:02:05')
    expect(fmtCount(90061, 'ddhhmmss')).toBe('01:01:01:01')
  })

  it('musikken senkes under tale og kommer gradvis tilbake', () => {
    const p: Project = normalize({ clips: [mediaClip(vid, { in: 0, out: 4 })], mix: { duck: true, duckAmt: 0.5 } })
    expect(duckAt(p, 2)).toBe(0.5)
    expect(duckAt(p, 4.3)).toBeCloseTo(0.75)
    expect(duckAt(p, 6)).toBe(1)
    expect(duckAt({ ...p, mix: { ...p.mix, duck: false } }, 2)).toBe(1)
  })

  it('kurver: identitet, monotoni og gjennom punktene', () => {
    expect(hasCurve({ cS: 0, cM: 0, cH: 0, curves: { m: [[0, 0], [1, 1]] } })).toBe(false)
    expect(hasCurve({ cS: 0, cM: 0.2, cH: 0, curves: null })).toBe(true)
    const pts: [number, number][] = [[0, 0], [0.5, 0.7], [1, 1]]
    expect(curveEval(pts, 0.5)).toBeCloseTo(0.7)
    let last = -1
    for (let x = 0; x <= 1; x += 0.05) {
      const y = curveEval(pts, x)
      expect(y).toBeGreaterThanOrEqual(last)
      last = y
    }
  })
})

describe('filer', () => {
  it('.srt fram og tilbake', () => {
    const subs = [{ id: 's1', start: 1.5, end: 3.25, text: 'Hei' }, { id: 's2', start: 3661.001, end: 3662, text: 'To\nlinjer' }]
    const srt = toSrt(subs)
    expect(srt).toContain('00:00:01,500 --> 00:00:03,250')
    expect(srt).toContain('01:01:01,001 --> 01:01:02,000')
    expect(fromSrt(srt).map((s) => [s.start, s.end, s.text])).toEqual([[1.5, 3.25, 'Hei'], [3661.001, 3662, 'To\nlinjer']])
    expect(fromSrt('1\r\n00:00:01.5 --> 00:00:02,0\r\n<i>kursiv</i>\r\n')[0]?.text).toBe('kursiv')
  })

  it('.motion: samme binære format, filene får nye ID-er og manglende filer tas ut', async () => {
    const img: Media = { id: 'm-i1', name: 'bilde.png', kind: 'image', dur: 0, w: 10, h: 10, thumb: '' }
    const p = normalize({ name: 'Test', media: [vid, img], clips: [mediaClip(vid), mediaClip(img), colorClip()], logo: { src: 'm-i1', on: true } })
    const data: Record<string, Blob> = { 'm-v1': new Blob(['VIDEO'], { type: 'video/mp4' }), 'm-i1': new Blob(['PNG'], { type: 'image/png' }) }
    const file = await pack(p, async (id) => (data[id] ? { blob: data[id], name: id === 'm-v1' ? 'klipp.mp4' : 'bilde.png' } : null))
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    expect([...head]).toEqual([86, 70, 89, 49])
    const stored: Record<string, string> = {}
    const q = await unpack(file, async (b, name) => {
      if (name === 'bilde.png') return null
      stored[name] = await b.text()
      return 'm-ny'
    })
    expect(stored).toEqual({ 'klipp.mp4': 'VIDEO' })
    expect(q.media.map((m) => m.id)).toEqual(['m-ny'])
    expect(q.clips.map((c) => c.kind)).toEqual(['video', 'color'])
    expect(q.logo.src).toBe('')
    await expect(unpack(new Blob(['tull og tøys']), async () => null)).rejects.toThrow('ikke en Motion design-prosjektfil')
  })

  it('filtype ut fra navnet når nettleseren ikke oppgir den', () => {
    expect(inferType('Film.MOV', '')).toBe('video/quicktime')
    expect(inferType('lyd.mp3', 'application/octet-stream')).toBe('audio/mpeg')
    expect(inferType('x.png', 'image/png')).toBe('image/png')
  })

  it('eksportstørrelse: 1080p og 4K på kortsiden, partall', () => {
    expect(exportSize({ w: 1920, h: 1080 }, '1080')).toEqual({ w: 1920, h: 1080 })
    expect(exportSize({ w: 1080, h: 1920 }, '4k')).toEqual({ w: 2160, h: 3840 })
    expect(exportSize({ w: 1640, h: 624 }, '1080')).toEqual({ w: 1920, h: 730 })
  })
})
