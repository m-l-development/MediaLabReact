/* Brukergrense per menighet (docs/plan-brukergrense.md): aktive medlemmer + ventende invitasjoner, standard 10.
   Samme visning som i den nye appen (web/src/features/admin/MemberLimit.tsx). Bare til hjelp – grensen håndheves i
   databasen (CH013 → «member_limit»), uansett hvilken app som brukes. */
import React from 'react';
import { admin } from '../../services/admin.js';
import { T, Btn, Card, Field } from './ui.jsx';
import { useAdmin } from './AdminPage.jsx';

export const isFull = u => !!u && u.count >= u.limit;

export function useMemberUsage(churchId, refresh = 0) {
  const [usage, setUsage] = React.useState(null);
  React.useEffect(() => {
    if (!churchId) { setUsage(null); return undefined; }
    let live = true;
    admin.memberUsage(churchId).then(v => { if (live) setUsage(v ? { church: churchId, v } : null); }, () => { if (live) setUsage(null); });
    return () => { live = false; };
  }, [churchId, refresh]);
  return usage && usage.church === churchId ? usage.v : null;
}

export function MemberUsageNote({ usage }) {
  if (!usage) return null;
  return <div data-ch-member-usage={usage.count + '/' + usage.limit}>
    <p className="ch-muted">{T('Brukere i menigheten')}: <b>{usage.count} {T('av')} {usage.limit}</b>
      {usage.pending > 0 && <> ({T('inkludert ventende invitasjoner')}: {usage.pending})</>}</p>
    {isFull(usage) && <p className="ch-note warn" role="status">{T('Grensen er nådd. Fjern en bruker eller trekk tilbake en invitasjon før du inviterer flere.')}</p>}
  </div>;
}

/* Admin: brukere i egen menighet mot grensen. Stab (Developer/Moderator med MFA): også overstyring med begrunnelse. */
export function MemberLimitCard({ churchId }) {
  const { staff, act, say } = useAdmin();
  const [saved, setSaved] = React.useState(0);
  const usage = useMemberUsage(churchId, saved);
  const [limit, setLimit] = React.useState('');
  const [reason, setReason] = React.useState('');
  const save = act(async e => {
    e.preventDefault();
    await admin.setMemberLimit(churchId, Math.max(1, Math.min(1000, parseInt(limit, 10) || 0)), reason.trim());
    say(T('Brukergrensen er endret.'));
    setLimit(''); setReason(''); setSaved(n => n + 1);
  });
  return <Card title="Brukergrense">
    <MemberUsageNote usage={usage} />
    {staff && <>
      <p className="ch-muted">{T('Grensen gjelder aktive medlemmer og ventende invitasjoner. Standard er 10. Å heve den er et særtilfelle: begrunnelsen og endringen logges.')}</p>
      <form className="ch-form" onSubmit={save} data-ch-member-limit>
        <Field label="Ny grense (1–1000)"><input className="ch-input" type="number" min={1} max={1000} required value={limit} onChange={e => setLimit(e.target.value)} /></Field>
        <Field label="Begrunnelse (påkrevd, 10–500 tegn)"><input className="ch-input" minLength={10} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} /></Field>
        <Btn onClick={e => e.currentTarget.form.requestSubmit()}>{T('Lagre brukergrense')}</Btn>
      </form>
    </>}
  </Card>;
}
