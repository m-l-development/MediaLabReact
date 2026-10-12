import { useEffect, useState } from 'react'
import type { MemberUsage } from '../../services/admin'
import { useAdmin } from './context'

/**
 * Brukergrense per menighet (docs/plan-brukergrense.md): aktive medlemmer + ventende invitasjoner, standard 10.
 * Visningen er bare til hjelp – grensen håndheves i databasen (CH013 → «member_limit»).
 */
export function useMemberUsage(churchId: string | null | undefined): MemberUsage | null {
  const { admin } = useAdmin()
  const [usage, setUsage] = useState<{ church: string; v: MemberUsage } | null>(null)
  useEffect(() => {
    if (!churchId) return
    let live = true
    admin.memberUsage(churchId).then((v) => { if (live) setUsage({ church: churchId, v }) }, () => undefined)
    return () => { live = false }
  }, [admin, churchId])
  return usage && usage.church === churchId ? usage.v : null
}

export const isFull = (u: MemberUsage | null): boolean => !!u && u.count >= u.limit
