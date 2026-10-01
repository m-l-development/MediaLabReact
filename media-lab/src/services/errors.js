/* Nøytrale feilkoder for tjenestelaget. Adaptere oversetter leverandørens feil hit, så sidene aldri ser leverandørkoder. */
export class ServiceError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
/* PostgreSQL SQLSTATE (felles for alle PostgreSQL-baserte leverandører) → nøytral kode. */
export function fromSqlState(state) {
  return { '42501': 'forbidden', '23505': 'conflict', '22023': 'invalid', '23514': 'invalid', '22P02': 'invalid', '54000': 'rate_limited', PGRST116: 'not_found' }[state] || 'unknown';
}
