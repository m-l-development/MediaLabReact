import { createContext, use } from 'react'
import type { Me } from '../../domain/account'
import type { AdminService, AppUser, Church, Invitation, Membership, RoleRow, SystemStatus } from '../../services/admin'
import type { CollabService } from '../../services/collab'
import type { FilesService } from '../../services/files'
import type { Kind, Section } from './access'

export interface AdminData {
  churches: Church[]
  users: AppUser[]
  memberships: Membership[]
  roles: RoleRow[]
  invites: Invitation[]
  status: SystemStatus | null
  pendingSubs: number
  loaded: boolean
}

/** Felles for alle admin-visningene (som Ctx i dagens AdminPage.jsx). */
export interface AdminCtx {
  me: Me
  kind: Kind
  isUser: boolean
  /** Developer eller Moderator med MFA (systemadministrasjon). */
  staff: boolean
  /** Bare Developer med MFA. */
  dev: boolean
  /** Bare Moderator med MFA. */
  collab: boolean
  staffNoMfa: boolean
  adminOf: string[]
  allowed: Set<Section>
  d: AdminData
  reload: () => Promise<void>
  /** Kjører en handling: feil vises som melding, «avbrutt» gir ingen melding. */
  act: <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => (...a: A) => Promise<R | undefined>
  say: (text: string, ok?: boolean) => void
  t: (s: string) => string
  churchName: (id: string | null) => string
  userById: (id: string) => AppUser | undefined
  userName: (id: string | null | undefined) => string
  canManage: (churchId: string) => boolean
  openInvite: (p?: { church?: string | null }) => void
  ctxChurch: string | null
  setCtxChurch: (id: string | null) => void
  admin: AdminService
  collabSvc: CollabService
  files: FilesService
  testRole: string | null
}

export const Ctx = createContext<AdminCtx | null>(null)
export function useAdmin(): AdminCtx {
  const c = use(Ctx)
  if (!c) throw new Error('useAdmin() må brukes inne i admin')
  return c
}
