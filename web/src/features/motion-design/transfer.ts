/**
 * Henter prosjekter fra Motion design i dagens app (kopi; dagens data endres aldri). Kan kjøres flere ganger:
 * prosjekter som allerede er hentet, hoppes over.
 * - Filer i nettleseren legges i «Dine medier».
 * - Filer i en prosjektmappe blir liggende der (henvisning), men krever at nettleseren har tilgang til mappen.
 *   Prosjekter i mapper uten tilgang venter til brukeren gir tilgang (se `grantLegacyFolders`).
 */
import { folderAccess, type FolderRegistry } from '../../infrastructure/fs/project-folders'
import { readLegacyMotion, type LegacyMotion } from '../../infrastructure/legacy-import/motiondesign'
import type { AssetService } from '../../services/assets/asset-service'
import { normalize } from './engine/model'
import { inferType } from './engine/packfile'
import { remapMedia } from './files'
import { mediaIdOf, type MdRepo } from './repo'

export interface LegacyImportResult { added: number; waiting: { pid: string; name: string }[] }

async function convert(raw: Record<string, unknown>, L: LegacyMotion, assets: AssetService, folders: FolderRegistry, done: Map<string, string>): Promise<ReturnType<typeof normalize> | 'waiting' | null> {
  let p
  try {
    p = normalize(raw)
  } catch {
    return null
  }
  const fid = `motion:${p.id}`
  const folder = await L.folder(p.id)
  const dir = folder && (await folderAccess(folder.handle, false)) ? folder.handle : null
  const map: Record<string, string> = {}
  for (const m of p.media) {
    const hit = done.get(m.id)
    if (hit) {
      map[m.id] = hit
      continue
    }
    const r = await L.media(m.id)
    if (!r) continue
    const name = r.name || m.name
    try {
      if (r.blob) {
        const b = r.blob.type ? r.blob : new Blob([r.blob], { type: inferType(name, r.type) })
        const a = await assets.register(b, { name, legacy: { source: 'motiondesign', id: m.id } })
        // Filen er også kopiert til prosjektmappen: husk stedet, så kopien i nettleseren senere kan frigjøres.
        if (r.path && folder) await assets.addLocation(a.id, { type: 'project-folder', folderId: fid, path: r.path })
        map[m.id] = mediaIdOf(a.id)
      } else if (r.path) {
        if (!folder) continue
        if (!dir) return 'waiting'
        const file = await (await (await dir.getDirectoryHandle('media')).getFileHandle(r.path.slice(6))).getFile()
        const typed = file.type ? file : new File([file], name, { type: inferType(name, r.type) })
        const a = await assets.registerAt(typed, { type: 'project-folder', folderId: fid, path: r.path }, { name, legacy: { source: 'motiondesign', id: m.id } })
        map[m.id] = mediaIdOf(a.id)
      }
    } catch {
      // filen kunne ikke leses eller støttes ikke; klippet vises tomt
    }
    const to = map[m.id]
    if (to) done.set(m.id, to)
  }
  if (folder) await folders.set(fid, folder.handle)
  return remapMedia(p, map)
}

export async function importLegacyMotion(userId: string | null, assets: AssetService, folders: FolderRegistry, repo: MdRepo): Promise<LegacyImportResult> {
  const L = await readLegacyMotion(userId)
  if (!L) return { added: 0, waiting: [] }
  const res: LegacyImportResult = { added: 0, waiting: [] }
  try {
    await repo.list()
    const done = new Map<string, string>()
    for (const raw of L.projects) {
      const id = typeof raw.id === 'string' ? raw.id : ''
      if (!id || repo.findLegacy(id)) continue
      const p = await convert(raw, L, assets, folders, done)
      if (p === 'waiting') {
        res.waiting.push({ pid: id, name: typeof raw.name === 'string' ? raw.name : id })
        continue
      }
      if (!p) continue
      await repo.save(null, p, { legacy: { source: 'motiondesign', id }, ...(typeof raw.created === 'number' ? { createdAt: raw.created } : {}) })
      res.added++
    }
  } finally {
    L.close()
  }
  return res
}

/** Ber om tilgang til mappene til prosjektene som venter (krever et klikk). → om alle fikk tilgang. */
export async function grantLegacyFolders(userId: string | null, pids: readonly string[]): Promise<boolean> {
  const L = await readLegacyMotion(userId)
  if (!L) return false
  let all = true
  try {
    for (const pid of pids) {
      const f = await L.folder(pid)
      if (!(await folderAccess(f?.handle, true))) all = false
    }
  } finally {
    L.close()
  }
  return all
}
