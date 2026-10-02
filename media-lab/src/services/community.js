/* P10: samarbeidsområder, abonnement (uten betaling), varsler, personvern og menighetens livsløp.
   Rettighetene håndheves i databasen (RLS og funksjoner); serveren brukes bare der servernøkkel trengs. */
import { data } from './port.js';
import { callServer } from './server.js';

export const spaces = {
  list: () => data().select('spaces', { columns: 'id, name, description, owner_church_id, status, created_at', order: 'name' }),
  members: spaceId => data().select('space_members', { columns: 'space_id, church_id, status, created_at', eq: { space_id: spaceId } }),
  files: spaceId => data().select('space_files', { columns: 'space_id, file_id, created_at', eq: { space_id: spaceId } }),
  directory: () => data().rpc('church_directory'),
  create: (name, ownerChurch) => data().rpc('create_space', ownerChurch ? { p_name: name, p_owner: ownerChurch } : { p_name: name }),
  setStatus: (spaceId, status) => data().rpc('set_space_status', { p_space: spaceId, p_status: status }),
  update: (spaceId, name, description) => data().rpc('update_space', { p_space: spaceId, p_name: String(name || '').trim(), p_description: String(description || '').trim() || null }),
  /* Sletter området, deltakerne og delingene (filene beholdes). confirm = områdets navn. */
  remove: (spaceId, confirm) => data().rpc('delete_space', { p_space: spaceId, p_confirm: confirm }),
  invite: (spaceId, churchId) => data().rpc('invite_to_space', { p_space: spaceId, p_church: churchId }),
  setMembership: (spaceId, churchId, status) => data().rpc('set_space_membership', { p_space: spaceId, p_church: churchId, p_status: status }),
  share: (fileId, spaceId, on = true) => data().rpc('share_file_to_space', { p_file: fileId, p_space: spaceId, p_share: on }),
};

/* Koblinger mellom nøyaktig to menigheter med egen Samarbeidsfiler-mappe (trinn 18). Bare Moderator oppretter, avslutter
   og gjenåpner; medlemmer ser koblinger for egne menigheter. Databasen avgjør alt (RLS og funksjoner). */
export const links = {
  /* [{ id, church_a, church_a_name, church_b, church_b_name, status, created_at, ended_at, my_church }] */
  mine: () => data().rpc('my_links'),
  directory: () => data().rpc('church_directory'),
  create: (church1, church2) => data().rpc('create_link', { p_church1: church1, p_church2: church2 }),
  end: id => data().rpc('end_link', { p_link: id }),
  reopen: id => data().rpc('reopen_link', { p_link: id }),
  /* Bare Developer/Moderator: filnavn og metadata, aldri innhold. */
  filesMeta: id => data().rpc('link_files_meta', { p_link: id }),
  /* Sletter en AVSLUTTET kobling og kopiene i den (via serveren, som også fjerner kopiene fra lagringen). */
  remove: id => callServer('link.delete', { link_id: id }),
};
/* Visningsnavn for en kobling: «Menighet A – Menighet B» (eller den andre menigheten sett fra egen menighet). */
export const linkName = l => [l.church_a_name, l.church_b_name].map(n => n || '(slettet menighet)').join(' – ');
export const otherChurch = (l, mine) => (l.church_a === mine ? l.church_b_name : l.church_a_name) || '(slettet menighet)';

export const subscriptions = {
  /* Plannavn og pris (alle innloggede). Planenes veiledende lagring kan bare Developer lese (plansAdmin). */
  plans: () => data().select('plans', { columns: 'code, name, price_nok_month, active', order: 'code' }),
  /* Trinn 21 – bare Developer med MFA: planene med veiledende lagring. Den gir aldri menighetene mer plass. */
  plansAdmin: () => data().rpc('plans_admin'),
  current: churchId => data().select('church_subscriptions', { columns: 'church_id, plan, free_of_charge, status, updated_at', ...(churchId ? { eq: { church_id: churchId } } : {}) }),
  requests: churchId => data().select('subscription_requests', { columns: 'id, church_id, plan, free_of_charge, reason, status, decision_note, created_at, decided_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 100 }),
  request: (churchId, plan, free, reason) => data().rpc('request_subscription', { p_church: churchId, p_plan: plan, p_free: !!free, p_reason: reason || null }),
  withdraw: id => data().rpc('withdraw_subscription_request', { p_id: id }),
  decide: (id, approve, note) => data().rpc('decide_subscription_request', { p_id: id, p_approve: !!approve, p_note: note || null }),
  /* Trinn 19/21 – bare Developer med MFA (databasen avgjør). Endrer bare planen (veiledende lagring og pris), aldri
     menighetenes kvote. Pris tom/null = «Avtales». Alt loggføres med gammel og ny verdi. */
  updatePlan: (code, quotaMb, priceNokMonth) => data().rpc('update_plan', { p_plan: code, p_quota_mb: quotaMb, p_price_nok_month: priceNokMonth == null || priceNokMonth === '' ? null : Number(priceNokMonth), p_update_churches: false }),
};

export const notifications = {
  list: () => data().select('notifications', { columns: 'id, kind, title, body, link, church_id, read_at, created_at', order: 'created_at', desc: true, limit: 50 }),
  markRead: id => data().update('notifications', { id }, { read_at: new Date().toISOString() }),
  async markAllRead(list) { for (const n of list.filter(x => !x.read_at)) await notifications.markRead(n.id); },
  sendToChurch: (churchId, title, body) => data().rpc('send_church_message', { p_church: churchId, p_title: title, p_body: body || null }),
};

export const privacy = {
  exportMine: () => data().rpc('export_my_data'),
  deleteMe: () => callServer('privacy.delete_me', { confirm: 'SLETT' }),
};

export const churchLife = {
  setStatus: (churchId, status) => data().rpc('set_church_status', { p_church: churchId, p_status: status }),
  export: async churchId => (await callServer('church.export', { church_id: churchId })).export,
  purge: (churchId, confirmName) => callServer('church.purge', { church_id: churchId, confirm_name: confirmName }),
};

/* Laster ned et objekt som JSON-fil. */
export function downloadJson(obj, name) {
  const a = document.createElement('a'), u = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
}
