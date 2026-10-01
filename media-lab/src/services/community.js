/* P10: samarbeidsområder, abonnement (uten betaling), varsler, personvern og menighetens livsløp.
   Rettighetene håndheves i databasen (RLS og funksjoner); serveren brukes bare der servernøkkel trengs. */
import { data } from './port.js';
import { callServer } from './server.js';

export const spaces = {
  list: () => data().select('spaces', { columns: 'id, name, owner_church_id, status, created_at', order: 'name' }),
  members: spaceId => data().select('space_members', { columns: 'space_id, church_id, status, created_at', eq: { space_id: spaceId } }),
  files: spaceId => data().select('space_files', { columns: 'space_id, file_id, created_at', eq: { space_id: spaceId } }),
  directory: () => data().rpc('church_directory'),
  create: (name, ownerChurch) => data().rpc('create_space', ownerChurch ? { p_name: name, p_owner: ownerChurch } : { p_name: name }),
  setStatus: (spaceId, status) => data().rpc('set_space_status', { p_space: spaceId, p_status: status }),
  invite: (spaceId, churchId) => data().rpc('invite_to_space', { p_space: spaceId, p_church: churchId }),
  setMembership: (spaceId, churchId, status) => data().rpc('set_space_membership', { p_space: spaceId, p_church: churchId, p_status: status }),
  share: (fileId, spaceId, on = true) => data().rpc('share_file_to_space', { p_file: fileId, p_space: spaceId, p_share: on }),
};

export const subscriptions = {
  plans: () => data().select('plans', { columns: 'code, name, storage_quota_mb, price_nok_month, active', order: 'storage_quota_mb' }),
  current: churchId => data().select('church_subscriptions', { columns: 'church_id, plan, free_of_charge, status, updated_at', ...(churchId ? { eq: { church_id: churchId } } : {}) }),
  requests: churchId => data().select('subscription_requests', { columns: 'id, church_id, plan, free_of_charge, reason, status, decision_note, created_at, decided_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 100 }),
  request: (churchId, plan, free, reason) => data().rpc('request_subscription', { p_church: churchId, p_plan: plan, p_free: !!free, p_reason: reason || null }),
  withdraw: id => data().rpc('withdraw_subscription_request', { p_id: id }),
  decide: (id, approve, note) => data().rpc('decide_subscription_request', { p_id: id, p_approve: !!approve, p_note: note || null }),
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
