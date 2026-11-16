import { useEffect, useRef } from 'react'
import type { Pic } from '../lib/blob-image'

/**
 * Liten forhåndsvisning av et bilde i et panel. Er bildet et ImageBitmap (Chromium, se `shared/lib/blob-image.ts`),
 * tegnes det på et lite lerret – et `<img>` med blob:-adressen ville lagt hele filen i nettleserens minne igjen.
 * Ellers vanlig `<img>`. Bildet passes inn i boksen (som `object-fit: contain`).
 */
export function PicThumb({ pic, url, w = 184, h = 116 }: { pic: Pic | null; url: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bitmap = !!pic && typeof ImageBitmap !== 'undefined' && pic instanceof ImageBitmap
  useEffect(() => {
    const cv = ref.current
    if (!cv || !pic || !bitmap) return
    const g = cv.getContext('2d')
    if (!g) return
    const k = Math.min(w / pic.naturalWidth, h / pic.naturalHeight)
    const dw = pic.naturalWidth * k, dh = pic.naturalHeight * k
    g.clearRect(0, 0, w, h)
    g.imageSmoothingQuality = 'high'
    try {
      g.drawImage(pic, (w - dw) / 2, (h - dh) / 2, dw, dh)
    } catch {
      // bildet er allerede frigjort (verktøyet lukkes)
    }
  }, [pic, bitmap, w, h])
  if (bitmap) return <canvas ref={ref} width={w} height={h} data-pic-thumb="" />
  return url ? <img src={url} alt="" /> : null
}
