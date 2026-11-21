import { callServer } from '../infrastructure/api/server'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Menighetsbruker (felleskonto per menighet) og menighetens innboks. Lesing går direkte mot databasefunksjonene
 * (de avgjør tilgangen); alt som berører innloggingskontoen eller lagringen går via serveren (media-lab/server/handlers/parish.js).
 */
export interface ParishAccount {
  id: string
  church_id: string
  username: string
  status: 'active' | 'disabled'
  pw_changed_at: string
  pw_due_at: string
  created_at: string
  /** Aktive innlogginger (null når det ikke kan leses). */
  sessions: number | null
}
export interface ParishTarget { church_id: string; church_name: string; username: string }
export type InboxKind = 'image' | 'document' | 'video' | 'project' | 'other'
export interface InboxFile {
  id: string
  name: string
  mime: string
  kind: InboxKind
  size: number
  status: 'new' | 'archived'
  from_name: string
  created_at: string
  read_at: string | null
}
export type ParishAction = 'rename' | 'password' | 'revoke' | 'disable' | 'enable'

/** Samme grenser som serveren og databasen. */
export const INBOX_MAX_FILES = 20
export const INBOX_MAX_BYTES = 30 * 1024 * 1024
/** Filendelser innboksen tar imot (serveren kontrollerer innholdet). */
export const INBOX_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'mp4', 'm4v', 'mov', 'webm', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'doc', 'xls', 'ppt', 'txt', 'csv', 'json', 'zip', 'motion']
export const inboxAccept = INBOX_EXT.map((e) => '.' + e).join(',')
const extOf = (name: string) => (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? '').toLowerCase()
/** Kontroll før sending: null = ok, ellers feilkode. */
export function sendProblem(f: { name: string; size: number }): 'type' | 'size' | null {
  if (!INBOX_EXT.includes(extOf(f.name))) return 'type'
  if (f.size <= 0 || f.size > INBOX_MAX_BYTES) return 'size'
  return null
}
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,39}$/

export interface ParishService {
  get(church: string): Promise<ParishAccount | null>
  create(church: string, username: string, password: string): Promise<ParishAccount>
  manage(church: string, action: ParishAction, extra?: { username?: string; password?: string }): Promise<ParishAccount | null>
  targets(): Promise<ParishTarget[]>
  list(church: string): Promise<InboxFile[]>
  urls(ids: string[]): Promise<Record<string, string>>
  setStatus(ids: string[], status: 'new' | 'archived'): Promise<number>
  rename(id: string, name: string): Promise<void>
  remove(ids: string[]): Promise<number>
  /** Sender filene (én om gangen, direkte til lagringen); onProgress(i) etter hver fil. */
  send(church: string, files: (Blob & { name: string })[], onProgress?: (done: number) => void): Promise<number>
}

export function createParishService(d: DataAdapter | null, token: () => Promise<string | null>, server: typeof callServer = callServer, fetchImpl: typeof fetch = (...a) => fetch(...a)): ParishService {
  const data = () => {
    if (!d) throw new ServiceError('unavailable')
    return d
  }
  return {
    get: (church) => data().rpc<ParishAccount | null>('parish_account_get', { p_church: church }),
    async create(church, username, password) {
      const r = await server<{ account: ParishAccount }>(await token(), 'parish.create', { church, username, password })
      return r.account
    },
    async manage(church, action, extra = {}) {
      const r = await server<{ account: ParishAccount | null }>(await token(), 'parish.manage', { church, action, ...extra })
      return r.account
    },
    targets: async () => (await data().rpc<ParishTarget[] | null>('parish_targets')) ?? [],
    list: async (church) => (await data().rpc<InboxFile[] | null>('inbox_list', { p_church: church })) ?? [],
    async urls(ids) {
      if (!ids.length) return {}
      return (await server<{ urls?: Record<string, string> }>(await token(), 'inbox.urls', { ids: ids.slice(0, 100) })).urls ?? {}
    },
    setStatus: (ids, status) => data().rpc<number>('inbox_set_status', { p_ids: ids, p_status: status }),
    rename: async (id, name) => { await data().rpc('inbox_rename', { p_id: id, p_name: name }) },
    async remove(ids) {
      return (await server<{ deleted?: number }>(await token(), 'inbox.delete', { ids })).deleted ?? 0
    },
    async send(church, files, onProgress) {
      if (!files.length) return 0
      if (files.length > INBOX_MAX_FILES) throw new ServiceError('too_many')
      const start = await server<{ uploads: { id: string; url: string; mime: string }[] }>(await token(), 'inbox.start', {
        church, files: files.map((f) => ({ name: f.name, size: f.size })),
      })
      let done = 0
      for (const [i, u] of start.uploads.entries()) {
        const f = files[i]
        if (!f) break
        let r: Response
        try {
          r = await fetchImpl(u.url, { method: 'PUT', headers: { 'content-type': u.mime, 'x-upsert': 'false' }, body: f, signal: AbortSignal.timeout(300000) })
        } catch (e) {
          throw new ServiceError(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'network')
        }
        if (!r.ok) throw new ServiceError(r.status === 413 ? 'too_large' : 'upload_failed')
        await server(await token(), 'inbox.finish', { id: u.id })
        done++
        onProgress?.(done)
      }
      return done
    },
  }
}
