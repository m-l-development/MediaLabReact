import type { Page } from '@playwright/test'

/**
 * Kontroll av eksporterte filer slik de faktisk spilles: filen spilles av i nettleseren, og hvert bilde som vises leses
 * sammen med tidsstempelet (requestVideoFrameCallback). For hver tid brukes bildet som vises da. `last` er tiden til det
 * siste bildet (WebM fra MediaRecorder har ofte ingen varighet i filen).
 */
export async function framesAt(page: Page, file: Buffer, times: number[], mime = 'video/mp4'): Promise<{ px: number[][]; last: number }> {
  return page.evaluate(async ({ b64, ts, type }) => {
    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const v = document.createElement('video')
    v.muted = true
    v.playbackRate = 0.5
    v.src = URL.createObjectURL(new Blob([bin], { type }))
    await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error('video kan ikke spilles')) })
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    const seen: [number, number[]][] = []
    await new Promise<void>((r) => {
      const step = (_: number, m: VideoFrameCallbackMetadata) => {
        g.drawImage(v, 0, 0)
        const d = g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data
        seen.push([m.mediaTime, [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]])
        if (!v.ended) v.requestVideoFrameCallback(step)
      }
      v.requestVideoFrameCallback(step)
      v.onended = () => r()
      void v.play()
    })
    return {
      px: ts.map((t) => (seen.filter(([mt]) => mt <= t + 1e-3).pop() ?? seen[0] ?? [0, [0, 0, 0]])[1]),
      last: seen.length ? Math.max(...seen.map(([mt]) => mt)) : 0,
    }
  }, { b64: file.toString('base64'), ts: times, type: mime })
}

/** Lydstyrke (RMS) i vinduene [fra, til] i filens lyd, dekodet av nettleseren. */
export async function rmsAt(page: Page, file: Buffer, wins: [number, number][]): Promise<{ dur: number; rms: number[] }> {
  return page.evaluate(async ({ b64, ws }) => {
    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const ac = new AudioContext()
    const ab = await ac.decodeAudioData(bin.buffer)
    const d = ab.getChannelData(0)
    const rms = ws.map(([a, b]) => {
      const i0 = Math.floor(a * ab.sampleRate)
      const i1 = Math.min(d.length, Math.floor(b * ab.sampleRate))
      let s = 0
      for (let i = i0; i < i1; i++) s += (d[i] ?? 0) ** 2
      return Math.sqrt(s / Math.max(1, i1 - i0))
    })
    await ac.close()
    return { dur: ab.duration, rms }
  }, { b64: file.toString('base64'), ws: wins })
}

export const near = (c: number[], rgb: number[], tol = 70) => c.every((v, i) => Math.abs(v - (rgb[i] ?? 0)) <= tol)
