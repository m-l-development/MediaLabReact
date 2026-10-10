import type { SupabaseClient } from '@supabase/supabase-js'
import { fromSqlState, ServiceError } from '../../services/errors'
import type { DataAdapter } from '../../services/auth/types'

/** Databasefunksjoner via Supabase (PostgREST). Feil oversettes til nøytrale koder. */
export function createSupabaseDataAdapter(client: SupabaseClient): DataAdapter {
  return {
    async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
      let result
      try {
        result = await client.rpc(fn, args ?? {})
      } catch {
        throw new ServiceError('network')
      }
      if (result.error) {
        const e = result.error as { code?: string; message?: string }
        throw new ServiceError(fromSqlState(e.code), e.message)
      }
      return result.data as T
    },
  }
}
