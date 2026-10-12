import type { ReactNode } from 'react'
import type { Me } from '../../domain/account'
import { AdminPage } from './AdminPage'
import { ChurchDetail, ChurchesView, InvitesView } from './Churches'
import { CleanupView } from './Cleanup'
import { ChurchPicker, Head } from './common'
import { useAdmin } from './context'
import { FeedbackView } from './Feedback'
import { FilesView } from './Folders'
import { LinksView } from './Links'
import { LogView } from './Log'
import { MailView } from './Mail'
import { RequestsView } from './Requests'
import { SubsView } from './Subs'
import { Card, Empty } from './ui'

/** Inngangen til ConnectHub Admin (egen JS-del): alle seksjonene registreres her. */

/** Filer vises bare i menigheter der brukeren selv er medlem (A1) – også for Developer og Moderator. */
function FilesSection({ area }: { area: string | undefined }) {
  const { me, adminOf, d, ctxChurch, t } = useAdmin()
  const mine = [...new Set([...me.churches.map((c) => c.id), ...adminOf])]
  const church = ctxChurch && mine.includes(ctxChurch) ? ctxChurch : d.churches.find((c) => mine.includes(c.id) && c.status === 'active')?.id ?? mine[0] ?? null
  return (
    <>
      <Head title="Filer" sub="Fellesmappe, Samarbeidsmappe og faste ressurser. Video kan aldri lastes opp." right={<ChurchPicker onlyMine />} />
      {church ? <FilesView key={church} churchId={church} area={area ?? ''} /> : <Card><Empty>{t('Du er ikke medlem av noen menighet. Filer vises bare for medlemmer – også for Developer og Moderator.')}</Empty></Card>}
    </>
  )
}
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
  filer: ({ id }) => <FilesSection area={id} />,
  samarbeid: () => <><Head title="Samarbeid" sub="Samarbeidsgrupper med to eller flere menigheter. Hver gruppe har sin egen Samarbeidsmappe." /><LinksView /></>,
  abonnement: () => <SubsSection />,
  logg: () => <LogSection />,
  tilbakemeldinger: ({ id }) => <FeedbackView selected={id} />,
  // utvalget nullstilles når en annen menighet velges
  opprydning: ({ id }) => <CleanupView key={id ?? ''} churchId={id} />,
  foresporsler: ({ id }) => <RequestsView selected={id} />,
  mail: () => <MailView />,
}

export default function AdminRoute({ me, testRole }: { me: Me; testRole: string | null }) {
  return <AdminPage me={me} testRole={testRole} sections={SECTIONS} />
}
