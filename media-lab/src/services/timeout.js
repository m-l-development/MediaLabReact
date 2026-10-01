/* Tidsgrense for løfter (Promise) som ellers kunne henge, f.eks. ved nettverksproblemer. Gir ServiceError('timeout'). */
import { ServiceError } from './errors.js';

export function withTimeout(promise, ms, code = 'timeout') {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new ServiceError(code)), ms); })]).finally(() => clearTimeout(t));
}
