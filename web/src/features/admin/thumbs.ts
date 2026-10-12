import { ServiceError } from '../../services/errors'
import type { FilesService } from '../../services/files'

/**
 * Miniatyrbilder i filvisningene, portert fra dagens thumbs.jsx: hentes først når de nærmer seg skjermen, lenkene hentes
 * samlet (ett serverkall per bunke), skaleres ned i nettleseren og huskes resten av besøket. Nedlasting henter alltid originalen.
 */
const SIZE = 360, MAX = 800
const cache = new Map<string, string>()
const waiting = new Map<string, ((u: string | null) => void)[]>()
let queue = new Set<string>(), timer: ReturnType<typeof setTimeout> | 0 = 0, svc: FilesService | null = null

async function shrink(blob: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null
  const bmp = await createImageBitmap(blob)
  try {
    const k = Math.min(1, SIZE / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')?.drawImage(bmp, 0, 0, w, h)
    // nettlesere uten WebP-koding gir PNG (beholder gjennomsiktighet)
    return await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.82))
  } finally {
    bmp.close()
  }
}
async function fetchThumb(url: string): Promise<string | null> {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!r.ok) return null
  const b = await r.blob()
  let small: Blob | null = null
  try { small = b.size > 60000 ? await shrink(b) : null } catch { small = null }
  return URL.createObjectURL(small ?? b)
}
function done(id: string, u: string | null) {
  if (u) {
    cache.set(id, u)
    while (cache.size > MAX) {
      const first = cache.entries().next().value
      if (!first) break
      URL.revokeObjectURL(first[1])
      cache.delete(first[0])
    }
  }
  for (const f of waiting.get(id) ?? []) f(u)
  waiting.delete(id)
}
function flush() {
  timer = 0
  const ids = [...queue], files = svc
  queue = new Set()
  if (!files) { ids.forEach((id) => done(id, null)); return }
  for (let i = 0; i < ids.length; i += 60) {
    const part = ids.slice(i, i + 60)
    files.urls(part).then(
      (urls) => part.forEach((id) => { const u = urls[id]; (u ? fetchThumb(u) : Promise.resolve(null)).then((x) => done(id, x), () => done(id, null)) }),
      () => part.forEach((id) => done(id, null)),
    )
  }
}

export const peekThumb = (id: string): string | null => cache.get(id) ?? null
export function thumbUrl(files: FilesService, id: string): Promise<string | null> {
  const hit = cache.get(id)
  if (hit) return Promise.resolve(hit)
  svc = files
  return new Promise((res) => {
    const w = waiting.get(id)
    if (w) { w.push(res); return }
    waiting.set(id, [res])
    queue.add(id)
    if (!timer) timer = setTimeout(flush, 30)
  })
}

/** Lagrer en blob som fil (nedlasting i nettleseren). */
export function saveBlob(blob: Blob, name: string): void {
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(u), 60000)
}
/** Original til nedlasting (ny lenke hver gang, så den aldri er utløpt). */
export async function downloadOriginal(files: FilesService, id: string, name: string): Promise<void> {
  const u = (await files.urls([id]))[id]
  if (!u) throw new ServiceError('not_found')
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) })
  if (!r.ok) throw new ServiceError('network')
  saveBlob(await r.blob(), name || 'bilde')
}
