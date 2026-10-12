import { describe, expect, it } from 'vitest'
import { ServiceError } from './errors'
import { precheckUpload, UPLOAD_MAX_BYTES } from './files'

/** Fellesmappe: bare bilder i skyen (SHR-05); video avvises alltid (SHR-08). Serveren kontrollerer innholdet på nytt. */
const code = (f: { type: string; size: number; name?: string }) => {
  try {
    precheckUpload(f)
    return 'ok'
  } catch (e) {
    return e instanceof ServiceError ? e.code : String(e)
  }
}

describe('precheckUpload', () => {
  it('godtar PNG, JPEG, WebP og GIF opp til 4 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) expect(code({ type, size: UPLOAD_MAX_BYTES, name: 'a' })).toBe('ok')
  })
  it('video avvises, både etter type og etter filnavn (også med feil eller tom type)', () => {
    expect(code({ type: 'video/mp4', size: 10 })).toBe('video_not_allowed')
    expect(code({ type: '', size: 10, name: 'klipp.MOV' })).toBe('video_not_allowed')
    expect(code({ type: 'image/png', size: 10, name: 'lurt.mp4' })).toBe('video_not_allowed')
    expect(code({ type: 'application/octet-stream', size: 10, name: 'opptak.mkv' })).toBe('video_not_allowed')
  })
  it('andre typer og for store filer avvises', () => {
    expect(code({ type: 'image/svg+xml', size: 10, name: 'a.svg' })).toBe('type_not_allowed')
    expect(code({ type: 'audio/mpeg', size: 10, name: 'a.mp3' })).toBe('type_not_allowed')
    expect(code({ type: 'image/png', size: UPLOAD_MAX_BYTES + 1, name: 'a.png' })).toBe('too_large')
  })
})
