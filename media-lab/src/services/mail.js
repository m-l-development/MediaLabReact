/* Mail-fanen (bare Developer og Moderator med MFA – databasen og serveren avgjør). Maler lagres som strukturerte blokker
   (se src/shared/mail-render.js); lenkene settes alltid inn av systemet ved utsending og kan ikke endres her. */
import { data } from './port.js';
import { callServer } from './server.js';

export const mail = {
  /* [{ key, subject, blocks, updated_at, updated_by_name }] – bare redigerte maler; mangler en, brukes standardmalen. */
  templates: () => data().rpc('mail_templates'),
  save: (key, subject, blocks) => data().rpc('save_mail_template', { p_key: key, p_subject: subject, p_blocks: blocks }),
  reset: key => data().rpc('reset_mail_template', { p_key: key }),
  settings: () => data().rpc('mail_settings_get'),
  outbox: () => data().rpc('mail_outbox_recent'),
  /* { configured, sender, error } – om ConnectHub kan sende e-post (oppsettet ligger bare på serveren). */
  status: () => callServer('mail.status', {}),
  logoUrl: () => callServer('mail.logo_url', {}).then(r => r.url),
  uploadLogo: file => callServer('mail.logo_upload', null, { raw: file, contentType: 'application/octet-stream' }),
  resetLogo: () => callServer('mail.logo_reset', {}),
  /* Sender malen til egen e-postadresse med en eksempellenke. */
  test: key => callServer('mail.test', { key }),
};
