import { callServer } from '../infrastructure/api/server'
import type { DataAdapter } from './auth/types'

/**
 * ConnectHub-filer (bare bilder; video avvises av serveren). Samme kontrakt som media-lab/src/services/files.js:
 * metadata fra tabellen `files` (RLS), korttidsadresser fra `/api/ch?a=file.urls`.
 */
export const CLOUD_FOLDERS = ['bilder', 'logoer', 'bakgrunner', 'mockups', 'faste'] as const
export type CloudFolder = (typeof CLOUD_FOLDERS)[number]

export interface CloudFile {
  id: string
  church_id: string
  file_name: string
  mime_type: string
  file_size: number
  folder: string
  visibility: string
  created_at: string
  link_id?: string | null
  source_folder?: string | null
}

const COLS = 'id, church_id, file_name, mime_type, file_size, folder, visibility, uploaded_by, created_at'

export interface FilesService {
  available(): boolean
  list(folder: CloudFolder): Promise<CloudFile[]>
  listCollab(): Promise<CloudFile[]>
  /** Korttidsadresser (signerte) for filene. */
  urls(ids: string[]): Promise<Record<string, string>>
  /** Henter selve filen (for import til Dine medier eller bruk i et verktøy). */
  blob(id: string): Promise<Blob | null>
}

export function createFilesService(data: DataAdapter | null, token: () => Promise<string | null>): FilesService {
  const urls = async (ids: string[]) => {
    if (!ids.length) return {}
    const r = await callServer<{ urls?: Record<string, string> }>(await token(), 'file.urls', { ids: ids.slice(0, 100) })
    return r.urls ?? {}
  }
  return {
    available: () => !!data,
    async list(folder) {
      if (!data) return []
      return data.select<CloudFile>('files', { columns: COLS, eq: { folder }, order: 'created_at', desc: true, limit: 500 })
    },
    async listCollab() {
      if (!data) return []
      return data.select<CloudFile>('files', { columns: `${COLS}, link_id, source_folder`, eq: { folder: 'samarbeid' }, order: 'created_at', desc: true, limit: 500 })
    },
    urls,
    async blob(id) {
      const u = (await urls([id]))[id]
      if (!u) return null
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) })
      return r.ok ? r.blob() : null
    },
  }
}
