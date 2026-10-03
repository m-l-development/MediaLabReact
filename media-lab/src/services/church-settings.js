/* Felles grunnoppsett per menighet (church_settings). Databasen kontrollerer medlemskap, versjon (CH011 → settings_conflict),
   Admin-felt og bildereferanser. Sidene bruker src/shared/shared-setup.js, som også slår sammen samtidige endringer. */
import { data } from './port.js';

export const churchSettings = {
  /* → null (ikke lagret ennå) eller { data, version, updated_at, updated_by_name, can_admin, admin_keys } */
  get: (churchId, scope) => data().rpc('church_settings_get', { p_church: churchId, p_scope: scope }),
  /* version = versjonen endringen bygger på (0 = første lagring). → { version, updated_at } */
  save: (churchId, scope, value, version) => data().rpc('church_settings_save', { p_church: churchId, p_scope: scope, p_data: value, p_version: version }),
};
