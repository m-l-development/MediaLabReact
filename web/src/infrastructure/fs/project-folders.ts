/**
 * Prosjektmapper på brukerens egen PC (File System Access API, Chrome og Edge). Samme regler som dagens app
 * (media-lab/src/shared/project-folder.js): filer skrives til <mappe>/media/, prosjektet til <mappe>/prosjekt.motion.json,
 * og INGENTING sendes over nett. Mappehåndtakene lagres i brukerens database (innstillinger), med nøkkelen
 * `folder:<folderId>`. Kopien i nettleseren slettes aldri automatisk.
 */

/** De delene av File System Access API-et som brukes (finnes ikke i TypeScripts standardtyper). */
interface PermissionHandle {
  queryPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
}
export type DirHandle = FileSystemDirectoryHandle & PermissionHandle

type DirPicker = (o: { id?: string; mode: 'readwrite'; startIn?: string }) => Promise<DirHandle>

export interface FolderRecord { handle: DirHandle; name: string; at: number }

export interface KeyValue {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

export const PROJECT_JSON = 'prosjekt.motion.json'

export const foldersSupported = (): boolean =>
  typeof window !== 'undefined' && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'

/** Lar brukeren velge en mappe. → null hvis brukeren avbryter. */
export async function pickDirectory(opts: { id?: string; startIn?: string } = {}): Promise<DirHandle | null> {
  const pick = (window as unknown as { showDirectoryPicker?: DirPicker }).showDirectoryPicker
  if (!pick) return null
  try {
    return await pick({ ...opts, mode: 'readwrite' })
  } catch {
    return null
  }
}

/** Tilgang til mappen. `ask` ber om tilgang (krever et klikk fra brukeren). */
export async function folderAccess(handle: DirHandle | null | undefined, ask: boolean): Promise<boolean> {
  if (!handle) return false
  const o = { mode: 'readwrite' as const }
  try {
    if ((await handle.queryPermission?.(o)) === 'granted') return true
    if (ask && (await handle.requestPermission?.(o)) === 'granted') return true
  } catch {
    // ingen tilgang
  }
  return false
}

export const safeFileName = (s: string): string =>
  [...String(s || 'fil')].map((c) => (c.charCodeAt(0) < 32 ? '_' : c)).join('').replace(/[\\/:*?"<>|]+/g, '_').replace(/^\.+/, '_').slice(0, 120) || 'fil'

async function resolveFile(dir: DirHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  let d: FileSystemDirectoryHandle = dir
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p)
  return d.getFileHandle(parts[parts.length - 1] ?? '')
}

export async function readFolderFile(dir: DirHandle, path: string): Promise<File> {
  return (await resolveFile(dir, path)).getFile()
}

/** Skriver en fil til <mappe>/<sub>/<name>. → stien i mappen. */
export async function writeFolderFile(dir: DirHandle, sub: string, name: string, blob: Blob): Promise<string> {
  const d = await dir.getDirectoryHandle(sub, { create: true })
  const fh = await d.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  await w.write(blob)
  await w.close()
  return `${sub}/${name}`
}

export async function writeFolderText(dir: DirHandle, name: string, text: string): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  await w.write(text)
  await w.close()
}

/** Kontrollerer at filen finnes i mappen med riktig størrelse. */
export async function verifyFolderFile(dir: DirHandle, path: string, size: number): Promise<boolean> {
  try {
    return (await readFolderFile(dir, path)).size === size
  } catch {
    return false
  }
}

/** Registeret over prosjektmapper (håndtakene ligger i brukerens database). */
export class FolderRegistry {
  private kv: KeyValue

  constructor(kv: KeyValue) {
    this.kv = kv
  }

  async get(folderId: string): Promise<FolderRecord | null> {
    return (await this.kv.get<FolderRecord>(`folder:${folderId}`).catch(() => undefined)) ?? null
  }

  async set(folderId: string, handle: DirHandle): Promise<void> {
    await this.kv.set(`folder:${folderId}`, { handle, name: handle.name, at: Date.now() } satisfies FolderRecord)
  }

  async forget(folderId: string): Promise<void> {
    await this.kv.set(`folder:${folderId}`, null)
  }

  /** Mappen hvis den er registrert og tilgangen allerede er gitt (spør ikke brukeren). */
  async dir(folderId: string): Promise<DirHandle | null> {
    const f = await this.get(folderId)
    return f && (await folderAccess(f.handle, false)) ? f.handle : null
  }

  /** Leser en fil fra en prosjektmappe (for AssetService.open). */
  async read(loc: { folderId: string; path: string }): Promise<Blob | undefined> {
    const dir = await this.dir(loc.folderId)
    if (!dir) return undefined
    return readFolderFile(dir, loc.path).catch(() => undefined)
  }
}
