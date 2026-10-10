import type { Asset } from '../../domain/asset'
import type { MediaProbe } from '../../services/assets/types'

const THUMB_SIZE = 320

function canvasBlob(canvas: HTMLCanvasElement, type = 'image/webp', quality = 0.82): Promise<Blob | undefined> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? undefined), type, quality))
}

function drawThumb(source: CanvasImageSource, w: number, h: number): Promise<Blob | undefined> {
  if (!w || !h) return Promise.resolve(undefined)
  const s = Math.min(1, THUMB_SIZE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * s))
  canvas.height = Math.max(1, Math.round(h * s))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(undefined)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvasBlob(canvas)
}

function finite(n: number): number | undefined {
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function withMedia<T>(blob: Blob, make: (url: string) => Promise<T>): Promise<T> {
  const url = URL.createObjectURL(blob)
  return make(url).finally(() => URL.revokeObjectURL(url))
}

async function probeImage(blob: Blob): Promise<{ meta: Asset['meta']; thumb?: Blob }> {
  const bitmap = await createImageBitmap(blob)
  try {
    const thumb = await drawThumb(bitmap, bitmap.width, bitmap.height)
    return { meta: { width: bitmap.width, height: bitmap.height }, ...(thumb ? { thumb } : {}) }
  } finally {
    bitmap.close()
  }
}

function probeVideo(blob: Blob): Promise<{ meta: Asset['meta']; thumb?: Blob }> {
  return withMedia(blob, (url) => new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const done = async () => {
      const meta: Asset['meta'] = {}
      const duration = finite(video.duration)
      if (video.videoWidth) meta.width = video.videoWidth
      if (video.videoHeight) meta.height = video.videoHeight
      if (duration) meta.duration = duration
      const thumb = await drawThumb(video, video.videoWidth, video.videoHeight).catch(() => undefined)
      video.removeAttribute('src')
      video.load()
      resolve({ meta, ...(thumb ? { thumb } : {}) })
    }
    video.onloadedmetadata = () => {
      // Et bilde litt inn i videoen gir bedre miniatyr enn det første (ofte svarte) bildet.
      video.currentTime = Math.min(0.5, (finite(video.duration) ?? 1) / 2)
    }
    video.onseeked = () => void done()
    video.onerror = () => reject(new Error('Videoen kunne ikke leses'))
    video.src = url
  }))
}

function probeAudio(blob: Blob): Promise<{ meta: Asset['meta'] }> {
  return withMedia(blob, (url) => new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = finite(audio.duration)
      resolve({ meta: duration ? { duration } : {} })
    }
    audio.onerror = () => reject(new Error('Lydfilen kunne ikke leses'))
    audio.src = url
  }))
}

/** Leser størrelse/varighet og lager miniatyr (WebP, maks 320 px) i nettleseren. */
export const browserProbe: MediaProbe = {
  probe(blob, kind) {
    if (kind === 'image') return probeImage(blob)
    if (kind === 'video') return probeVideo(blob)
    return probeAudio(blob)
  },
}
