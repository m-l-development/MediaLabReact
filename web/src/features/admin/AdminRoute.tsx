import type { ReactNode } from 'react'
import type { Me } from '../../domain/account'
import { AdminPage } from './AdminPage'
import { ChurchDetail, ChurchesView, InvitesView } from './Churches'
import { ChurchPicker, Head } from './common'
import { useAdmin } from './context'
import { CleanupView } from './Cleanup'
import { FeedbackView } from './Feedback'
import { LinksView } from './Links'
import { LogView } from './Log'
import { RequestsView } from './Requests'
import { SubsView } from './Subs'

/**
 * Inngangen til ConnectHub Admin (egen JS-del). Seksjonene som er flyttet, registreres her; de andre viser
 * «ikke flyttet ennå» med lenke til dagens admin (se docs/gjenoppretting.md, ADM-*).
 */
function SubsSection() {
  const { staff, ctxChurch } = useAdmin()
  return <><Head title="Abonnement" sub="Ingen betaling ennå – Developer eller Moderator godkjenner forespørsler." right={!staff && <ChurchPicker />} /><SubsView churchId={staff ? null : ctxChurch} /></>
}
function LogSection() {
  const { staff, ctxChurch } = useAdmin()
  return <><Head title="Logg" sub="Kan ikke endres eller slettes." right={!staff && <ChurchPicker />} /><LogView churchId={staff ? null : ctxChurch} /></>
}

const SECTIONS: Partial<Record<string, (p: { id?: string | undefined; sub?: string | undefined }) => ReactNode>> = {
  menigheter: ({ id, sub }) => (id ? <ChurchDetail id={id} tab={sub} /> : <ChurchesView />),
  invitasjoner: () => <InvitesView />,
  samarbeid: () => <><Head title="Samarbeid" sub="Samarbeidsgrupper med to eller flere menigheter. Hver gruppe har sin egen Samarbeidsmappe." /><LinksView /></>,
  abonnement: () => <SubsSection />,
  logg: () => <LogSection />,
  tilbakemeldinger: ({ id }) => <FeedbackView selected={id} />,
  // utvalget nullstilles når en annen menighet velges
  opprydning: ({ id }) => <CleanupView key={id ?? ''} churchId={id} />,
  foresporsler: ({ id }) => <RequestsView selected={id} />,
}

export default function AdminRoute({ me, testRole }: { me: Me; testRole: string | null }) {
  return <AdminPage me={me} testRole={testRole} sections={SECTIONS} />
}
