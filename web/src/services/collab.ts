import { callServer } from '../infrastructure/api/server'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Samarbeidsgrupper, abonnement og menighetens livsløp (ADM-03, ADM-08, ADM-09), samme kall som
 * media-lab/src/services/community.js. Rettighetene håndheves i databasen; serveren brukes bare der servernøkkel trengs.
 */
export interface GroupMember { church_id: string; name: string; status: 'active' | 'left' | string; joined_at?: string; left_at?: string | null; copies?: number; bytes?: number }
export interface Group { id: string; name: string | null; description: string | null; status: string; created_at: string; ended_at: string | null; my_church: boolean; members: GroupMember[]; copies?: number; bytes?: number; hidden_copies?: number }
export interface SubscriptionRequest { id: string; church_id: string; plan: string; free_of_charge: boolean; reason: string | null; status: string; decision_note: string | null; created_at: string; decided_at: string | null }
export interface ChurchSubscription { church_id: string; plan: string; free_of_charge: boolean; status: string; updated_at: string }
export interface Plan { code: string; name: string; price_nok_month: number | null; active: boolean; quota_mb?: number }

export const MAX_GROUP_CHURCHES = 20
export const linkName = (l: Pick<Group, 'name'> | null): string => l?.name || '(uten navn)'
export const activeMembers = (l: Pick<Group, 'members'> | null): GroupMember[] => (l?.members ?? []).filter((m) => m.status === 'active')
export const otherChurches = (l: Pick<Group, 'members'> | null, mine: string): GroupMember[] => activeMembers(l).filter((m) => m.church_id !== mine)
export const memberName = (l: Pick<Group, 'members'> | null, churchId: string): string => (l?.members ?? []).find((m) => m.church_id === churchId)?.name || '(slettet menighet)'

export function createCollabService(d: DataAdapter | null, token: () => Promise<string | null>, server: typeof callServer = callServer) {
  const data = () => {
    if (!d) throw new ServiceError('unavailable')
    return d
  }
  const call = async <T>(action: string, body: unknown) => server<T & Record<string, unknown>>(await token(), action, body)
  return {
    links: {
      mine: async () => {
        const rows = await data().rpc<unknown>('my_groups')
        return Array.isArray(rows) ? (rows as Group[]) : []
      },
      directory: async () => data().rpc<{ id: string; name: string; status?: string }[]>('church_directory'),
      create: async (name: string, description: string, churches: string[]) => data().rpc('create_group', { p_name: name.trim(), p_description: description.trim() || null, p_churches: churches }),
      update: async (id: string, name: string, description: string) => data().rpc('update_group', { p_link: id, p_name: name.trim(), p_description: description.trim() || null }),
      /** Legger til en menighet, eller melder den inn igjen (kopiene den delte før, vises igjen). */
      addChurch: async (id: string, churchId: string) => data().rpc('add_group_church', { p_link: id, p_church: churchId }),
      /** Fjerner en menighet: kopiene den har delt, skjules (slettes ikke). Minst to må bli igjen. */
      removeChurch: async (id: string, churchId: string) => data().rpc('remove_group_church', { p_link: id, p_church: churchId }),
      end: async (id: string) => data().rpc('end_link', { p_link: id }),
      reopen: async (id: string) => data().rpc('reopen_link', { p_link: id }),
      /** Bare Developer/Moderator: filnavn og metadata, aldri innhold. */
      filesMeta: async (id: string) => data().rpc<Record<string, unknown>[]>('link_files_meta', { p_link: id }),
      /** Sletter en AVSLUTTET gruppe og alle kopiene (serveren fjerner også kopiene fra lagringen). */
      remove: async (id: string) => call('link.delete', { link_id: id }),
    },
    subscriptions: {
      plans: async () => data().select<Plan>('plans', { columns: 'code, name, price_nok_month, active', order: 'code' }),
      /** Bare Developer med MFA: planene med veiledende lagring. Gir aldri menighetene mer plass. */
      plansAdmin: async () => data().rpc<Plan[]>('plans_admin'),
      current: async (churchId: string | null) => data().select<ChurchSubscription>('church_subscriptions', { columns: 'church_id, plan, free_of_charge, status, updated_at', ...(churchId ? { eq: { church_id: churchId } } : {}) }),
      requests: async (churchId: string | null) =>
        data().select<SubscriptionRequest>('subscription_requests', { columns: 'id, church_id, plan, free_of_charge, reason, status, decision_note, created_at, decided_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 100 }),
      request: async (churchId: string, plan: string, free: boolean, reason: string) => data().rpc('request_subscription', { p_church: churchId, p_plan: plan, p_free: free, p_reason: reason || null }),
      withdraw: async (id: string) => data().rpc('withdraw_subscription_request', { p_id: id }),
      decide: async (id: string, approve: boolean, note: string) => data().rpc('decide_subscription_request', { p_id: id, p_approve: approve, p_note: note || null }),
      /** Bare Developer med MFA: endrer planen (veiledende lagring og pris), aldri menighetenes kvote. Tom pris = «Avtales». */
      updatePlan: async (code: string, quotaMb: number, price: number | null) => data().rpc('update_plan', { p_plan: code, p_quota_mb: quotaMb, p_price_nok_month: price, p_update_churches: false }),
    },
    churchLife: {
      setStatus: async (churchId: string, status: string) => data().rpc('set_church_status', { p_church: churchId, p_status: status }),
      /** Eksport med signerte lenker til filene (gyldige 1 time). */
      export: async (churchId: string) => (await call<{ export: Record<string, unknown> }>('church.export', { church_id: churchId })).export,
      /** Endelig sletting av en menighet som står til sletting: stab med MFA, og navnet må bekreftes. */
      purge: async (churchId: string, confirmName: string) => call('church.purge', { church_id: churchId, confirm_name: confirmName }),
    },
    /** Melding til alle i en menighet (varsel i kontomenyen). */
    sendToChurch: async (churchId: string, title: string, body: string) => data().rpc('send_church_message', { p_church: churchId, p_title: title, p_body: body || null }),
  }
}
export type CollabService = ReturnType<typeof createCollabService>
