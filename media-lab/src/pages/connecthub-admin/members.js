/* Medlemskap i ConnectHub Admin: felles regler, tekster og bekreftelser for brukersiden og menighetens medlemsliste.
   Rettighetene avgjøres uansett av databasen (én menighet om gangen for User/Admin, remove_membership, RLS). */
import { admin } from '../../services/admin.js';

const tr = s => (typeof window !== 'undefined' && window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const cancelled = () => Object.assign(new Error('cancel'), { code: 'cancel' });
const ask = text => { if (typeof confirm === 'function' && !confirm(text)) throw cancelled(); };

/* Developer og Moderator kan være medlem av flere menigheter; alle andre bare én om gangen. */
export const isGlobal = roles => (roles || []).some(r => !r.church_id && (r.role === 'developer' || r.role === 'moderator') && !r.revoked_at);
export const activeOf = (memberships, userId) => (memberships || []).filter(m => m.user_id === userId && m.status === 'active');

/* Kort rolleoppsummering for én bruker: «Developer», «Moderator», «Admin i X», ellers «Bruker». */
export function roleSummary(roles, churchName) {
  const rs = (roles || []).filter(r => !r.revoked_at);
  const parts = [];
  if (rs.some(r => r.role === 'developer' && !r.church_id)) parts.push(tr('Developer'));
  if (rs.some(r => r.role === 'moderator' && !r.church_id)) parts.push(tr('Moderator'));
  rs.filter(r => r.role === 'church_admin').forEach(r => parts.push(tr('Admin i') + ' ' + churchName(r.church_id)));
  return parts.length ? parts.join(', ') : tr('Bruker');
}

/* Kan brukeren legges til i en ny menighet? { ok, reason } – reason forklarer hvorfor ikke. */
export function canJoinAnother(roles, memberships, userId, churchName) {
  if (isGlobal(roles)) return { ok: true };
  const act = activeOf(memberships, userId);
  if (!act.length) return { ok: true };
  return { ok: false, reason: tr('En bruker kan bare være medlem av én menighet om gangen. Fjern brukeren fra') + ' ' + churchName(act[0].church_id) + ' ' + tr('først.') };
}

export function removeConfirmText({ name, church, isAdmin }) {
  const lines = [tr('Fjerne') + ' ' + name + ' ' + tr('fra') + ' ' + church + '?', '',
    tr('Brukeren mister med en gang tilgang til menighetens filer, data og funksjoner. Kontoen slettes ikke, og historikken beholdes. Brukeren kan inviteres på nytt senere.')];
  if (isAdmin) lines.push('', name + ' ' + tr('er Admin i') + ' ' + church + '. ' + tr('Admin-rollen fjernes også, og menigheten står uten Admin til Developer eller Moderator utnevner en ny.'));
  return lines.join('\n');
}

/* Handlinger med bekreftelse. Returnerer meldingen som skal vises når handlingen er lagret. */
export const memberActions = {
  async remove({ userId, churchId, name, church, isAdmin }) {
    ask(removeConfirmText({ name, church, isAdmin }));
    const r = await admin.removeMembership(userId, churchId, 'Fjernet i ConnectHub Admin', isAdmin);
    return name + ' ' + tr('er fjernet fra') + ' ' + church + '.' +
      (r && r.admin_role_revoked ? ' ' + tr('Menigheten har nå ingen Admin.') : '') +
      (r && r.active_memberships_left === 0 ? ' ' + tr('Brukeren har nå ingen aktiv menighet.') : '');
  },
  async disable({ userId, churchId, name, church }) {
    ask(tr('Deaktivere') + ' ' + name + ' ' + tr('midlertidig i') + ' ' + church + '?\n\n' + tr('Brukeren mister tilgang til menigheten til medlemskapet aktiveres igjen. Ingenting slettes.'));
    await admin.setMembershipStatus(userId, churchId, 'disabled');
    return tr('Medlemskapet er deaktivert.');
  },
  async revokeAdmin({ roleId, name, church }) {
    ask(tr('Fjerne Admin-rollen fra') + ' ' + name + ' ' + tr('i') + ' ' + church + '?\n\n' + tr('Brukeren blir vanlig medlem. Menigheten står uten Admin til en ny utnevnes.'));
    await admin.revokeRole(roleId, 'Admin-siden');
    return tr('Admin-rollen er fjernet.');
  },
};
