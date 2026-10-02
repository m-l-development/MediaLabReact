/* Tilbakemeldinger (trinn 8). Alle innloggede kan sende inn; innboksen og behandlingen er bare for Moderator og
   Developer med MFA. Alt går via databasefunksjoner som selv kontrollerer rolle og MFA – ingen direkte tabelltilgang. */
import { data } from './port.js';

export const feedback = {
  /* { kind, title, description, answers, app, appName, page, view, marked, context, churchId } → { id, ref } */
  submit: f => data().rpc('submit_feedback', {
    p_kind: f.kind, p_title: f.title || null, p_description: f.description, p_answers: f.answers || {},
    p_app: f.app || null, p_app_name: f.appName || null, p_page: f.page || null, p_view: f.view || null,
    p_marked: f.marked || null, p_context: f.context || {}, p_church: f.churchId || null,
  }),
  /* archived = true gir de fjernede (arkiverte) sakene. */
  list: archived => data().rpc('feedback_list', archived ? { p_archived: true } : {}),
  /* «Fjern sak» = arkiver: saken forsvinner fra innboksen, men historikk og logg beholdes, og den kan gjenopprettes. */
  archive: (id, reason) => data().rpc('archive_feedback', { p_id: id, p_reason: reason || null }),
  restore: id => data().rpc('restore_feedback', { p_id: id }),
  events: id => data().rpc('feedback_events_for', { p_id: id }),
  setStatus: (id, status, reason) => data().rpc('set_feedback_status', { p_id: id, p_status: status, p_reason: reason || null }),
  addNote: (id, note) => data().rpc('add_feedback_note', { p_id: id, p_note: note }),
};
