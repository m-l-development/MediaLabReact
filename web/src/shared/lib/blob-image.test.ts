import { describe, expect, it } from 'vitest'
import { bitmapImages, blobBitmap } from './blob-image'

describe('blob-image', () => {
  it('ImageBitmap brukes bare i Chromium (ikke Safari/iPhone, der alle nettlesere er WebKit)', () => {
    const has = typeof createImageBitmap === 'function'
    expect(bitmapImages('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')).toBe(has)
    expect(bitmapImages('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')).toBe(false)
    expect(bitmapImages('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1')).toBe(false)
    expect(bitmapImages('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/604.1')).toBe(false)
    expect(bitmapImages('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe(false)
  })

  it('SVG går aldri via ImageBitmap (vanlig <img>)', async () => {
    expect(await blobBitmap(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }))).toBeNull()
  })
})
