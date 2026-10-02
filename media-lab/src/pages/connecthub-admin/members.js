/* Medlemskap i ConnectHub Admin: felles regler, tekster og bekreftelser for brukersiden og menighetens medlemsliste.
   Rettighetene avgjøres uansett av databasen (én menighet om gangen for User/Admin, remove_membership, RLS). */
import { admin } from '../../services/admin.js';

const tr = s => (typeof window !== 'undefined' && window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
/* Hele setninger med plassholdere ({name}, {church}) – så oversettelsen aldri består av løsrevne ordbiter. */
export const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
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
  rs.filter(r => r.role === 'church_admin').forEach(r => parts.push(fill(tr('Admin i {church}'), { church: churchName(r.church_id) })));
  return parts.length ? parts.join(', ') : tr('Bruker');
}

/* Kan brukeren legges til i en ny menighet? { ok, reason } – reason forklarer hvorfor ikke. */
export function canJoinAnother(roles, memberships, userId, churchName) {
  if (isGlobal(roles)) return { ok: true };
  const act = activeOf(memberships, userId);
  if (!act.length) return { ok: true };
  return { ok: false, reason: fill(tr('En bruker kan bare være medlem av én menighet om gangen. Fjern brukeren fra {church} først.'), { church: churchName(act[0].church_id) }) };
}

export function removeConfirmText({ name, church, isAdmin }) {
  const lines = [fill(tr('Fjerne {name} fra {church}?'), { name, church }), '',
    tr('Brukeren mister med en gang tilgang til menighetens filer, data og funksjoner. Kontoen slettes ikke, og historikken beholdes. Brukeren kan inviteres på nytt senere.')];
  if (isAdmin) lines.push('', fill(tr('{name} er Admin i {church}. Admin-rollen fjernes også, og menigheten står uten Admin til Developer eller Moderator utnevner en ny.'), { name, church }));
  return lines.join('\n');
}

/* Handlinger med bekreftelse. Returnerer meldingen som skal vises når handlingen er lagret. */
export const memberActions = {
  async remove({ userId, churchId, name, church, isAdmin }) {
    ask(removeConfirmText({ name, church, isAdmin }));
    const r = await admin.removeMembership(userId, churchId, 'Fjernet i ConnectHub Admin', isAdmin);
    return fill(tr('{name} er fjernet fra {church}.'), { name, church }) +
      (r && r.admin_role_revoked ? ' ' + tr('Menigheten har nå ingen Admin.') : '') +
      (r && r.active_memberships_left === 0 ? ' ' + tr('Brukeren har nå ingen aktiv menighet.') : '');
  },
  async disable({ userId, churchId, name, church }) {
    ask(fill(tr('Deaktivere {name} midlertidig i {church}?'), { name, church }) + '\n\n' + tr('Brukeren mister tilgang til menigheten til medlemskapet aktiveres igjen. Ingenting slettes.'));
    await admin.setMembershipStatus(userId, churchId, 'disabled');
    return tr('Medlemskapet er deaktivert.');
  },
  async revokeAdmin({ roleId, name, church }) {
    ask(fill(tr('Fjerne Admin-rollen fra {name} i {church}?'), { name, church }) + '\n\n' + tr('Brukeren blir vanlig medlem. Menigheten står uten Admin til en ny utnevnes.'));
    await admin.revokeRole(roleId, 'Admin-siden');
    return tr('Admin-rollen er fjernet.');
  },
};
