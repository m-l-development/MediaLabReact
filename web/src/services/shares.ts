import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Send en mal til et annet medlem i samme menighet (TB-09177E, migrering 20261108100000_item_shares.sql). Databasen
 * kontrollerer medlemskap (avsender og mottaker), at bildene er menighetens felles filer, grensene og at bare mottakeren
 * kan godta eller avslå. Mottakeren får et varsel i kontomenyen.
 */
export interface Peer { id: string; name: string }
export interface IncomingShare { id: string; name: string; kind: string; church_id: string; from_name: string; created_at: string }

export function createSharesService(data: DataAdapter | null) {
  const need = () => {
    if (!data) throw new ServiceError('unavailable')
    return data
  }
  return {
    available: () => !!data,
    peers: async (churchId: string) => (await need().rpc<Peer[] | null>('church_peers', { p_church: churchId })) ?? [],
    send: async (churchId: string, to: string, name: string, payload: Record<string, unknown>) =>
      need().rpc<string>('send_item_share', { p_church: churchId, p_to: to, p_app: 'thumbnail-studio', p_kind: 'template', p_name: name.slice(0, 80), p_payload: payload }),
    incoming: async () => (await need().rpc<IncomingShare[] | null>('my_item_shares', { p_app: 'thumbnail-studio' })) ?? [],
    /** Godta gir innholdet; avslå gir bare navnet. */
    respond: async (id: string, accept: boolean) => need().rpc<{ name: string; payload?: Record<string, unknown> }>('respond_item_share', { p_id: id, p_accept: accept }),
  }
}
export type SharesService = ReturnType<typeof createSharesService>
