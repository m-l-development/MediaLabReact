import { useState, type FormEvent } from 'react'
import type { MemberUsage } from '../../services/admin'
import { useAdmin } from './context'
import { isFull, useMemberUsage } from './member-limit'
import { Btn, Card, Field } from './ui'

/** «Brukere i menigheten: 7 av 10 (inkludert ventende invitasjoner: 2)», og varsel når grensen er nådd. */
export function MemberUsageNote({ usage }: { usage: MemberUsage | null }) {
  const { t } = useAdmin()
  if (!usage) return null
  return (
    <div data-ch-member-usage={`${usage.count}/${usage.limit}`}>
      <p className="ch-muted">
        {t('Brukere i menigheten')}: <b>{usage.count} {t('av')} {usage.limit}</b>
        {usage.pending > 0 && <> ({t('inkludert ventende invitasjoner')}: {usage.pending})</>}
      </p>
      {isFull(usage) && <p className="ch-note warn" role="status">{t('Grensen er nådd. Fjern en bruker eller trekk tilbake en invitasjon før du inviterer flere.')}</p>}
    </div>
  )
}

function UsageFor({ churchId }: { churchId: string }) {
  return <MemberUsageNote usage={useMemberUsage(churchId)} />
}

/** Admin: brukere i egen menighet mot grensen. */
export function MemberUsageCard({ churchId }: { churchId: string }) {
  return <Card title="Brukergrense"><UsageFor churchId={churchId} /></Card>
}

/** Stab (Developer/Moderator med MFA): hev eller senk grensen for én menighet, med påkrevd begrunnelse. Logges. */
export function MemberLimitCard({ churchId }: { churchId: string }) {
  const { admin, act, say, t } = useAdmin()
  const [saved, setSaved] = useState(0)
  const [limit, setLimit] = useState('')
  const [reason, setReason] = useState('')
  const save = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      await admin.setMemberLimit(churchId, Math.max(1, Math.min(1000, parseInt(limit, 10) || 0)), reason.trim())
      say(t('Brukergrensen er endret.'))
      setReason('')
      setLimit('')
      setSaved((x) => x + 1)
    })()
  }
  return (
    <Card title="Brukergrense">
      {/* hentes på nytt etter hver lagring */}
      <UsageFor key={saved} churchId={churchId} />
      <p className="ch-muted">{t('Grensen gjelder aktive medlemmer og ventende invitasjoner. Standard er 10. Å heve den er et særtilfelle: begrunnelsen og endringen logges.')}</p>
      <form className="ch-form" onSubmit={save} data-ch-member-limit="">
        <Field label="Ny grense (1–1000)"><input className="ch-input" type="number" min={1} max={1000} required value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        <Field label="Begrunnelse (påkrevd, 10–500 tegn)"><input className="ch-input" minLength={10} maxLength={500} required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Btn type="submit">{t('Lagre brukergrense')}</Btn>
      </form>
    </Card>
  )
}
