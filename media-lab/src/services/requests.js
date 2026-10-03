/* Forespørsler om brukerkonto. Innsending (før innlogging) går rett til serveren uten innlogging; innboksen og
   behandlingen er bare for Developer og Moderator med MFA (databasen avgjør – ingen direkte tabelltilgang). */
import { data } from './port.js';
import { callServer } from './server.js';

const anon = async (action, body) => {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch('/api/ch?a=' + action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal: ac.signal });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw Object.assign(new Error('request'), { code: (j && j.error) || 'http_' + r.status });
    return j;
  } catch (e) { if (e.code) throw e; throw Object.assign(new Error('network'), { code: ac.signal.aborted ? 'timeout' : 'network' }); }
  finally { clearTimeout(tm); }
};

export const requests = {
  /* Innloggingssiden: skjemanøkkel når skjemaet åpnes, så innsending ({ name, phone, email, church, website, token }). */
  formToken: () => anon('request.form').then(r => r.token),
  submit: f => anon('request.submit', f),
  /* Innboksen. */
  list: () => data().rpc('account_requests_list'),
  events: id => data().rpc('account_request_events_for', { p_id: id }),
  setStatus: (id, status) => data().rpc('set_account_request_status', { p_id: id, p_status: status }),
  addNote: (id, note) => data().rpc('add_account_request_note', { p_id: id, p_note: note }),
  reject: (id, reason) => data().rpc('reject_account_request', { p_id: id, p_reason: reason }),
  remove: id => data().rpc('delete_account_request', { p_id: id }),
  /* mode: 'new' | 'existing' | 'none' → { invitation, email_sent }. Velkomstmailen sendes av serveren. */
  approve: (id, { mode, churchName, churchId, role }) => callServer('request.approve', { id, mode, church_name: churchName || null, church_id: churchId || null, role }),
  /* Mail-fanen: ekstra varslingsadresser (høyst 3). */
  setNotifyExtra: emails => data().rpc('set_mail_notify_extra', { p_emails: emails }),
};
