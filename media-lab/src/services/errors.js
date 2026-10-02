/* Nøytrale feilkoder for tjenestelaget. Adaptere oversetter leverandørens feil hit, så sidene aldri ser leverandørkoder. */
export class ServiceError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
/* PostgreSQL SQLSTATE (felles for alle PostgreSQL-baserte leverandører) → nøytral kode. */
export function fromSqlState(state) {
  return { '42501': 'forbidden', '23505': 'conflict', CH001: 'already_member_elsewhere', CH003: 'last_admin', CH004: 'role_blocked_memberships', CH005: 'cleanup_not_ready', CH006: 'cleanup_changed', CH007: 'group_min_members', CH008: 'group_full', CH009: 'group_member_exists','22023': 'invalid', '23514': 'invalid', '22P02': 'invalid', '54000': 'rate_limited', PGRST116: 'not_found', PGRST202: 'not_found', PGRST205: 'not_found', '42P01': 'not_found', '42883': 'not_found' }[state] || 'unknown';
}
