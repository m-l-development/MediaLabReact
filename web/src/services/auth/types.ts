import type { Me } from '../../domain/account'
import type { MessageKey } from '../../shared/i18n/messages'

/** Nøytral økt – aldri leverandørens objekt. */
export interface Session {
  accessToken: string
  /** Unix-sekunder. */
  expiresAt: number
  userId: string
  email: string | null
  sessionId: string | null
  aal: string | null
}

export type AuthResult = { ok: true } | { ok: false; error: string }

export interface MfaStatus {
  current: string | null
  next: string | null
  factors: { id: string; name: string }[]
}

export type MfaEnrollment = { ok: true; factorId: string; qr: string; secret: string } | { ok: false; error: string }

/** Grensesnittet en innloggingsleverandør må oppfylle (implementert i infrastructure/supabase). */
export interface AuthAdapter {
  getSession(): Promise<Session | null>
  onChange(listener: (session: Session | null) => void): () => void
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<AuthResult>
  mfaStatus(): Promise<MfaStatus>
  mfaEnroll(): Promise<MfaEnrollment>
  mfaVerify(factorId: string, code: string): Promise<AuthResult>
  /** Nytt passord for innlogget bruker (leverandøren krever fersk innlogging, og aal2 når kontoen har MFA). */
  setPassword(password: string): Promise<AuthResult>
  /** Logger ut alle andre økter enn denne. */
  signOutOthers(): Promise<AuthResult>
}

/** Dataporten (databasefunksjoner). Feil kastes som ServiceError med nøytral kode. */
export interface SelectOptions {
  columns?: string
  eq?: Record<string, string | number | boolean>
  order?: string
  desc?: boolean
  limit?: number
}

export interface DataAdapter {
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T>
  /** Tabelloppslag med likhetsfiltre. Tilgangen avgjøres av RLS i databasen. */
  select<T = Record<string, unknown>>(table: string, opts?: SelectOptions): Promise<T[]>
  /** Oppdatering med likhetsfiltre (f.eks. varsel lest). Tilgangen avgjøres av RLS. */
  update<T = Record<string, unknown>>(table: string, match: Record<string, string | number | boolean>, patch: Record<string, unknown>): Promise<T[]>
}

export type AuthState =
  | { status: 'checking' }
  | { status: 'no-backend'; dev: boolean }
  | { status: 'signed-out'; error?: MessageKey }
  | { status: 'mfa-verify'; factorId: string; error?: MessageKey }
  | { status: 'mfa-setup'; enrollment?: { factorId: string; qr: string; secret: string }; error?: MessageKey }
  | { status: 'not-linked' }
  | { status: 'offline' }
  | { status: 'ready'; me: Me | null; realMe?: Me | null; testRole?: string | null }
