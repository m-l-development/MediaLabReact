import { useEffect, useState } from 'react'
import type { AuditRow } from '../../services/admin'
import { useAdmin } from './context'
import { actionName, fmt, norm, ROLE } from './lib'
import { List, Search, Select } from './ui'

/** Logg (ADM-10), portert fra LogView i dagens sections.jsx: de siste 200 hendelsene, søk og type. Kan ikke endres. */
const KIND: Record<string, string> = { churches: 'Menigheter', memberships: 'Medlemskap', user_roles: 'Roller', invitations: 'Invitasjoner', app_users: 'Brukere', files: 'Filer', message: 'Meldinger', spaces: 'Samarbeid', plans: 'Abonnement', subscription_requests: 'Abonnement', church_subscriptions: 'Abonnement', account: 'Kontoer', audit_logs: 'Logg' }

export function LogView({ churchId }: { churchId: string | null }) {
  const { churchName, userName, act, admin, t } = useAdmin()
  const [log, setLog] = useState<AuditRow[]>([]), [q, setQ] = useState(''), [kind, setKind] = useState('all')
  useEffect(() => { void act(async () => setLog(await admin.audit(churchId)))() }, [act, admin, churchId])
  const kinds = [...new Set(log.map((l) => l.action.split('.')[0] ?? ''))]
  const list = log.filter((l) => (kind === 'all' || l.action.startsWith(kind + '.'))
    && (!q || norm(t(actionName(l.action)) + ' ' + userName(l.actor_user_id) + ' ' + (l.church_id ? churchName(l.church_id) : '') + ' ' + (l.reason || '')).includes(norm(q))))
  return (
    <>
      <div className="ch-row">
        <Search value={q} onChange={setQ} placeholder="Søk i loggen …" />
        <Select label="Type" value={kind} onChange={setKind} options={[['all', 'Alle typer'], ...kinds.map((k) => [k, KIND[k] ?? k] as const)]} />
      </div>
      <List cols="minmax(120px,auto) minmax(140px,1fr) minmax(160px,1.5fr) minmax(100px,1fr)" head={['Tid', 'Hvem', 'Hendelse', 'Menighet']} empty="Ingen hendelser."
        rows={list.map((l) => {
          const role = typeof l.meta?.role === 'string' ? l.meta.role : null
          return { key: l.id, cells: [<span key="t" className="ch-muted">{fmt(l.created_at)}</span>, userName(l.actor_user_id),
            <span key="h">{t(actionName(l.action))}{[role && t(ROLE[role] ?? role), l.reason].filter(Boolean).map((x, i) => <span key={i} className="ch-muted"> · {x}</span>)}</span>,
            <span key="c" className="ch-muted">{l.church_id ? churchName(l.church_id) : '–'}</span>] }
        })} />
      <p className="ch-muted">{t('Loggen kan ikke endres eller slettes. Den viser de siste 200 hendelsene.')}</p>
    </>
  )
}
