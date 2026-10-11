/**
 * Mediefilene i et Motion design-prosjekt: i «Dine medier» (nettleseren) eller i en prosjektmappe på PC-en.
 * Samme regler som dagens app (media-lab/src/shared/project-folder.js):
 * - Har prosjektet en mappe med tilgang, skrives nye filer dit og kontrolleres; nettleseren får bare en henvisning.
 * - «Kopier til prosjektmappe» kopierer og kontrollerer, men sletter aldri kopien i nettleseren.
 * - «Frigjør plass i nettleseren» er et eget, bekreftet valg, og gjelder bare filer som er kontrollert i mappen.
 * Ingenting sendes over nett.
 */
import type { StorageLocation } from '../../domain/asset'
import {
  folderAccess, PROJECT_JSON, readFolderFile, safeFileName, verifyFolderFile, writeFolderFile, writeFolderText,
  type DirHandle, type FolderRegistry,
} from '../../infrastructure/fs/project-folders'
import type { AssetService } from '../../services/assets/asset-service'
import { normalize, type Media, type Project } from './engine/model'
import { inferType } from './engine/packfile'
import { assetOf, mediaIdOf } from './repo'

export interface FolderStatus { folder: string | null; access: boolean; inBrowser: number; notCopied: number }

type FolderLoc = Extract<StorageLocation, { type: 'project-folder' }>

export class MotionFiles {
  private assets: AssetService
  private folders: FolderRegistry

  constructor(assets: AssetService, folders: FolderRegistry) {
    this.assets = assets
    this.folders = folders
  }

  folderId = (p: Pick<Project, 'id'>): string => `motion:${p.id}`

  /** Lagrer en ny fil i prosjektet. → media-ID-en (`m-<AssetId>`). */
  async add(p: Pick<Project, 'id'>, file: Blob, name: string): Promise<string> {
    const typed = file.type ? file : new File([file], name, { type: inferType(name, '') })
    const fid = this.folderId(p)
    const dir = await this.folders.dir(fid)
    if (!dir) return mediaIdOf((await this.assets.register(typed, { name })).id)
    const path = await writeFolderFile(dir, 'media', `${crypto.randomUUID()}-${safeFileName(name)}`, typed)
    if (!(await verifyFolderFile(dir, path, typed.size))) throw new Error('Filen kunne ikke lagres i prosjektmappen.')
    const a = await this.assets.registerAt(typed, { type: 'project-folder', folderId: fid, path }, { name })
    return mediaIdOf(a.id)
  }

  /** Innholdet til en mediefil (fra nettleseren eller prosjektmappen). */
  async open(mediaId: string): Promise<Blob | null> {
    const id = assetOf(mediaId)
    return id ? this.assets.open(id).catch(() => null) : null
  }

  async name(mediaId: string): Promise<string | null> {
    const id = assetOf(mediaId)
    return id ? ((await this.assets.get(id))?.name ?? null) : null
  }

  async status(p: Project): Promise<FolderStatus> {
    const f = await this.folders.get(this.folderId(p))
    if (!f) return { folder: null, access: false, inBrowser: 0, notCopied: 0 }
    const access = await folderAccess(f.handle, false)
    let inBrowser = 0
    let notCopied = 0
    for (const m of p.media) {
      const id = assetOf(m.id)
      if (!id) continue
      if (await this.assets.hasLocalCopy(id)) inBrowser++
      const a = await this.assets.get(id)
      if (!a?.locations.some((l) => l.type === 'project-folder' && l.folderId === this.folderId(p))) notCopied++
    }
    return { folder: f.name, access, inBrowser, notCopied }
  }

  /** Ber om tilgang til prosjektmappen (krever et klikk fra brukeren). */
  async requestAccess(p: Pick<Project, 'id'>): Promise<boolean> {
    const f = await this.folders.get(this.folderId(p))
    return folderAccess(f?.handle, true)
  }

  private folderLoc(asset: { locations: StorageLocation[] }, folderId: string): FolderLoc | null {
    return (asset.locations.find((l) => l.type === 'project-folder' && l.folderId === folderId) as FolderLoc | undefined) ?? null
  }

  /** Kopierer alle filene til en (ny) prosjektmappe og kontrollerer dem. Kopien i nettleseren beholdes. */
  async copyToFolder(p: Project, dir: DirHandle, onStep?: (n: number, total: number) => void): Promise<void> {
    if (!(await folderAccess(dir, true))) throw new Error('Ingen tilgang til mappen.')
    const fid = this.folderId(p)
    let n = 0
    for (const m of p.media) {
      const id = assetOf(m.id)
      const a = id ? await this.assets.get(id) : undefined
      if (!id || !a) continue
      const loc = this.folderLoc(a, fid)
      if (loc && (await verifyFolderFile(dir, loc.path, a.content.size))) {
        onStep?.(++n, p.media.length)
        continue
      }
      const blob = await this.assets.open(id).catch(() => null)
      if (!blob) throw new Error(`Filen «${a.name}» finnes ikke og kan ikke kopieres.`)
      const path = await writeFolderFile(dir, 'media', `${m.id}-${safeFileName(a.name)}`, blob)
      if (!(await verifyFolderFile(dir, path, blob.size))) throw new Error(`Kontrollen av «${a.name}» i mappen feilet. Ingenting er slettet.`)
      if (!loc || loc.path !== path) await this.assets.addLocation(id, { type: 'project-folder', folderId: fid, path })
      onStep?.(++n, p.media.length)
    }
    await this.folders.set(fid, dir)
    await this.writeProject(p)
  }

  /** Fjerner kopiene i nettleseren for filer som er kontrollert i mappen. → antall frigjorte filer. */
  async freeBrowserCopies(p: Project): Promise<number> {
    const fid = this.folderId(p)
    const dir = await this.folders.dir(fid)
    if (!dir) throw new Error('Ingen tilgang til prosjektmappen.')
    let n = 0
    for (const m of p.media) {
      const id = assetOf(m.id)
      const a = id ? await this.assets.get(id) : undefined
      if (!id || !a || !(await this.assets.hasLocalCopy(id))) continue
      const loc = this.folderLoc(a, fid)
      if (!loc || !(await verifyFolderFile(dir, loc.path, a.content.size))) continue
      if (await this.assets.dropLocalCopy(id)) n++
    }
    return n
  }

  /** Skriver prosjektet (uten miniatyr) til prosjekt.motion.json i mappen, hvis prosjektet har mappe med tilgang. */
  async writeProject(p: Project): Promise<boolean> {
    const fid = this.folderId(p)
    const dir = await this.folders.dir(fid)
    if (!dir) return false
    const files: { id: string; path: string; name: string; type: string; size: number }[] = []
    for (const m of p.media) {
      const id = assetOf(m.id)
      const a = id ? await this.assets.get(id) : undefined
      const loc = a ? this.folderLoc(a, fid) : null
      if (a && loc) files.push({ id: m.id, path: loc.path, name: a.name, type: a.content.mime, size: a.content.size })
    }
    const proj: Partial<Project> = { ...p }
    delete proj.thumb
    try {
      await writeFolderText(dir, PROJECT_JSON, JSON.stringify({ v: 1, app: 'motiondesign', saved: new Date().toISOString(), project: proj, files }, null, 1))
      return true
    } catch {
      return false
    }
  }

  /** Åpner et prosjekt fra en mappe (også fra en annen PC). Filene leses der de ligger; ingenting kopieres til nettleseren. */
  async openFromFolder(dir: DirHandle): Promise<Project> {
    if (!(await folderAccess(dir, true))) throw new Error('Ingen tilgang til mappen.')
    let meta: { app?: unknown; project?: unknown; files?: unknown }
    try {
      meta = JSON.parse(await (await (await dir.getFileHandle(PROJECT_JSON)).getFile()).text()) as typeof meta
    } catch {
      throw new Error(`Mappen inneholder ikke et Motion design-prosjekt (${PROJECT_JSON}).`)
    }
    if (!meta || meta.app !== 'motiondesign' || !meta.project || !Array.isArray(meta.files)) throw new Error('Prosjektfilen i mappen er skadet.')
    const p = normalize(meta.project)
    const fid = this.folderId(p)
    await this.folders.set(fid, dir)
    const map: Record<string, string> = {}
    for (const f of meta.files as Record<string, unknown>[]) {
      if (typeof f?.id !== 'string' || typeof f.path !== 'string' || !/^media\/[^/\\]+$/.test(f.path)) continue
      const file = await readFolderFile(dir, f.path).catch(() => null)
      if (!file) continue
      const name = typeof f.name === 'string' ? f.name.slice(0, 200) : file.name
      const typed = file.type ? file : new File([file], name, { type: inferType(name, typeof f.type === 'string' ? f.type : '') })
      try {
        const a = await this.assets.registerAt(typed, { type: 'project-folder', folderId: fid, path: f.path }, { name })
        map[f.id] = mediaIdOf(a.id)
      } catch {
        // filtypen støttes ikke; klippet vises tomt
      }
    }
    return remapMedia(p, map)
  }

  async forget(p: Pick<Project, 'id'>): Promise<void> {
    await this.folders.forget(this.folderId(p))
  }

  async hasFolder(p: Pick<Project, 'id'>): Promise<string | null> {
    return (await this.folders.get(this.folderId(p)))?.name ?? null
  }
}

/** Bytter media-ID-er i hele prosjektet (filer som ikke finnes i `map`, beholder ID-en sin). */
export function remapMedia(p: Project, map: Record<string, string>): Project {
  const to = (id: string) => map[id] ?? id
  const seen = new Set<string>()
  const media: Media[] = []
  for (const m of p.media) {
    const id = to(m.id)
    if (seen.has(id)) continue
    seen.add(id)
    media.push({ ...m, id })
  }
  return {
    ...p,
    media,
    clips: p.clips.map((c) => (c.kind === 'color' ? c : { ...c, media: to(c.media) })),
    ov: p.ov.map((o) => ({ ...o, media: to(o.media) })),
    music: p.music.map((m) => ({ ...m, media: to(m.media) })),
    logo: { ...p.logo, src: p.logo.src && !p.logo.src.startsWith('images/') ? to(p.logo.src) : p.logo.src },
  }
}
