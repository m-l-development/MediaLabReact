import { callServer, directUpload } from '../infrastructure/api/server'
import { ServiceError } from './errors'
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
  uploaded_by?: string | null
  /** Lastet opp direkte i Samarbeidsmappen (ikke en kopi). */
  link_upload?: boolean | null
}

/** Samme grenser som serveren og databasen: bilder og filer høyst 30 MB, logoer (mappen «logoer») høyst 10 MB. */
export const UPLOAD_MAX_BYTES = 30 * 1024 * 1024
export const LOGO_MAX_BYTES = 10 * 1024 * 1024
const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Rask kontroll i nettleseren for god tilbakemelding (video avvises alltid); serveren kontrollerer innholdet på nytt. */
export function precheckUpload(file: { type: string; size: number; name?: string }, opts: { logo?: boolean } = {}): void {
  if (/^video\//i.test(file.type || '') || /\.(mp4|m4v|mov|webm|mkv|avi|wmv|mpe?g|3gp|flv|ogv|mts|m2ts)$/i.test(file.name || '')) throw new ServiceError('video_not_allowed')
  if (!UPLOAD_TYPES.includes(file.type)) throw new ServiceError('type_not_allowed')
  if (opts.logo && file.size > LOGO_MAX_BYTES) throw new ServiceError('logo_too_large')
  if (file.size > UPLOAD_MAX_BYTES) throw new ServiceError('too_large')
}

const COLS = 'id, church_id, file_name, mime_type, file_size, folder, visibility, uploaded_by, created_at'

export interface FilesService {
  available(): boolean
  list(folder: CloudFolder, churchId?: string): Promise<CloudFile[]>
  listCollab(): Promise<CloudFile[]>
  /** Korttidsadresser (signerte) for filene. */
  urls(ids: string[]): Promise<Record<string, string>>
  /** Henter selve filen (for import til Dine medier eller bruk i et verktøy). */
  blob(id: string): Promise<Blob | null>
  /** Laster opp et bilde som deles med menigheten (Fellesmappe). Store filer lastes opp direkte til lagringen (se directUpload). */
  upload(file: File, opts: { churchId: string; folder?: CloudFolder }): Promise<CloudFile>
  /** Samarbeidsmappen i én gruppe (kopier og direkte opplastinger). */
  listLink(linkId: string): Promise<CloudFile[]>
  /** Sletter en fil (serveren og databasen avgjør om brukeren har lov). */
  remove(id: string): Promise<void>
  /** Legger en kopi i Samarbeidsmappen; originalen blir liggende. */
  copyToLink(fileId: string, linkId: string): Promise<void>
  /** Direkte opplasting til Samarbeidsmappen; filen tilhører egen menighet og teller i dens kvote. */
  uploadToLink(file: File, opts: { linkId: string; churchId: string }): Promise<CloudFile>
}

export function createFilesService(data: DataAdapter | null, token: () => Promise<string | null>): FilesService {
  const urls = async (ids: string[]) => {
    if (!ids.length) return {}
    const r = await callServer<{ urls?: Record<string, string> }>(await token(), 'file.urls', { ids: ids.slice(0, 100) })
    return r.urls ?? {}
  }
  return {
    available: () => !!data,
    async list(folder, churchId) {
      if (!data) return []
      return data.select<CloudFile>('files', { columns: COLS, eq: { ...(churchId ? { church_id: churchId } : {}), folder }, order: 'created_at', desc: true, limit: 500 })
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
    async upload(file, { churchId, folder = 'bilder' }) {
      precheckUpload(file, { logo: folder === 'logoer' })
      const r = await directUpload<{ file: CloudFile }>(token, { kind: 'file', church: churchId, folder }, file)
      return r.file
    },
    async listLink(linkId) {
      if (!data) return []
      return data.select<CloudFile>('files', { columns: `${COLS}, link_id, source_folder, link_upload`, eq: { link_id: linkId }, order: 'created_at', desc: true, limit: 500 })
    },
    async remove(id) {
      await callServer(await token(), 'file.delete', { id })
    },
    async copyToLink(fileId, linkId) {
      await callServer(await token(), 'file.copy_to_link', { file_id: fileId, link_id: linkId })
    },
    async uploadToLink(file, { linkId, churchId }) {
      precheckUpload(file)
      const r = await directUpload<{ file: CloudFile }>(token, { kind: 'link', link: linkId, church: churchId }, file)
      return r.file
    },
  }
}
