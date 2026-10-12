import type { ReactNode } from 'react'
import type { Me } from '../../domain/account'
import { AdminPage } from './AdminPage'
import { ChurchDetail, ChurchesView, InvitesView } from './Churches'

/**
 * Inngangen til ConnectHub Admin (egen JS-del). Seksjonene som er flyttet, registreres her; de andre viser
 * «ikke flyttet ennå» med lenke til dagens admin (se docs/gjenoppretting.md, ADM-*).
 */
const SECTIONS: Partial<Record<string, (p: { id?: string | undefined; sub?: string | undefined }) => ReactNode>> = {
  menigheter: ({ id, sub }) => (id ? <ChurchDetail id={id} tab={sub} /> : <ChurchesView />),
  invitasjoner: () => <InvitesView />,
}

export default function AdminRoute({ me, testRole }: { me: Me; testRole: string | null }) {
  return <AdminPage me={me} testRole={testRole} sections={SECTIONS} />
}
