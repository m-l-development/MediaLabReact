/**
 * Prosjektfilen `.motion`: 8 byte hode («VFY1» + lengden på JSON, little-endian), JSON med prosjektet og fillisten,
 * deretter filene etter hverandre. Byte for byte samme format som dagens app (motion-engine.js pack/unpack),
 * så filer kan åpnes i begge.
 */
import { normalize, uid, type Project } from './model'

export interface PackFile { id: string; name: string; type: string; size: number; off: number }

/** Lager prosjektfilen. `open` henter innholdet til en mediefil (null = filen mangler og hoppes over). */
export async function pack(p: Project, open: (mediaId: string) => Promise<{ blob: Blob; name: string } | null>): Promise<Blob> {
  const files: PackFile[] = []
  const blobs: Blob[] = []
  let off = 0
  for (const m of p.media) {
    const r = await open(m.id)
    if (!r) continue
    files.push({ id: m.id, name: r.name, type: r.blob.type, size: r.blob.size, off })
    off += r.blob.size
    blobs.push(r.blob)
  }
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, app: 'motiondesign', project: p, files }))
  const head = new Uint8Array(8)
  head.set([86, 70, 89, 49])
  new DataView(head.buffer).setUint32(4, json.length, true)
  return new Blob([head, json, ...blobs], { type: 'application/octet-stream' })
}

/** Filtype ut fra navnet når nettleseren ikke oppgir den (f.eks. .mov på Windows). */
export function inferType(name: string, type: string): string {
  if (type && type !== 'application/octet-stream') return type
  const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? '').toLowerCase()
  const map: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', webm: 'video/webm',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/x-m4a', aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac',
  }
  return map[ext] ?? type
}

/**
 * Leser en prosjektfil. `put` lagrer en mediefil og gir den nye media-ID-en (null = kunne ikke lagres).
 * Klipp, overlegg og musikk som peker på filer som mangler, tas ut (som i dagens app).
 */
export async function unpack(file: Blob, put: (blob: Blob, name: string) => Promise<string | null>): Promise<Project> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (head.length < 8 || head[0] !== 86 || head[1] !== 70 || head[2] !== 89 || head[3] !== 49) throw new Error('Filen er ikke en Motion design-prosjektfil.')
  const n = new DataView(head.buffer).getUint32(4, true)
  if (n < 2 || n > 30e6 || 8 + n > file.size) throw new Error('Prosjektfilen er skadet.')
  let meta: unknown
  try {
    meta = JSON.parse(new TextDecoder().decode(await file.slice(8, 8 + n).arrayBuffer()))
  } catch {
    throw new Error('Prosjektfilen er skadet.')
  }
  const M = meta as { app?: unknown; files?: unknown; project?: unknown } | null
  if (!M || (M.app !== 'motiondesign' && M.app !== 'videofy') || !Array.isArray(M.files)) throw new Error('Prosjektfilen er skadet.')
  const p = normalize(M.project)
  const base = 8 + n
  const map: Record<string, string> = {}
  for (const f of M.files as Record<string, unknown>[]) {
    if (!f || typeof f !== 'object') continue
    const off = Number(f.off)
    const sz = Number(f.size)
    if (typeof f.id !== 'string' || !Number.isFinite(off) || !Number.isFinite(sz) || off < 0 || sz < 0 || base + off + sz > file.size) continue
    const name = typeof f.name === 'string' ? f.name.slice(0, 200) : 'Fil'
    const type = inferType(name, typeof f.type === 'string' && /^(video|image|audio)\/[\w.+-]+$/.test(f.type) ? f.type : '')
    const nid = await put(file.slice(base + off, base + off + sz, type), name).catch(() => null)
    if (nid) map[f.id] = nid
  }
  const seen = new Set<string>()
  p.id = uid('p')
  p.updated = Date.now()
  p.media = p.media.filter((m) => map[m.id]).map((m) => ({ ...m, id: map[m.id] ?? m.id })).filter((m) => !seen.has(m.id) && !!seen.add(m.id))
  p.clips = p.clips.filter((c) => c.kind === 'color' || map[c.media]).map((c) => (c.kind === 'color' ? c : { ...c, media: map[c.media] ?? c.media }))
  p.music = p.music.filter((m) => map[m.media]).map((m) => ({ ...m, media: map[m.media] ?? m.media }))
  p.ov = p.ov.filter((m) => map[m.media]).map((m) => ({ ...m, media: map[m.media] ?? m.media }))
  if (p.logo.src && !/^images\//.test(p.logo.src)) p.logo.src = map[p.logo.src] ?? ''
  return p
}
