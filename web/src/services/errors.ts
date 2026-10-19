/**
 * Nøytrale feilkoder for tjenestelaget. Adaptere oversetter leverandørens feil hit, så verktøyene aldri ser
 * leverandørkoder. Samme koder som media-lab/src/services/errors.js.
 */
export class ServiceError extends Error {
  readonly code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'ServiceError'
    this.code = code
  }
}

const SQL_STATE: Record<string, string> = {
  '42501': 'forbidden',
  '23505': 'conflict',
  CH001: 'already_member_elsewhere',
  CH003: 'last_admin',
  CH004: 'role_blocked_memberships',
  CH005: 'cleanup_not_ready',
  CH006: 'cleanup_changed',
  CH007: 'group_min_members',
  CH008: 'group_full',
  CH009: 'group_already_member',
  CH010: 'has_account',
  CH011: 'settings_conflict',
  CH012: 'file_in_use',
  CH013: 'member_limit',
  CH020: 'request_handled',
  CH021: 'staff_use_request',
  CH030: 'too_large',
  CH031: 'logo_too_large',
  // som media-lab/src/services/errors.js
  '22023': 'invalid',
  '23514': 'invalid',
  '22P02': 'invalid',
  '54000': 'rate_limited',
  PGRST116: 'not_found',
  PGRST202: 'not_found',
  PGRST205: 'not_found',
  '42P01': 'not_found',
  '42883': 'not_found',
}

/** PostgreSQL SQLSTATE (felles for alle PostgreSQL-baserte leverandører) → nøytral kode. */
export function fromSqlState(state: string | undefined): string {
  return (state && SQL_STATE[state]) || 'invalid'
}

export function withTimeout<T>(promise: Promise<T>, ms: number, code = 'timeout'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ServiceError(code)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}
