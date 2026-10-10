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
    async select<T>(table: string, opts: import('../../services/auth/types').SelectOptions = {}): Promise<T[]> {
      let q = client.from(table).select(opts.columns ?? '*')
      for (const [k, v] of Object.entries(opts.eq ?? {})) q = q.eq(k, v)
      if (opts.order) q = q.order(opts.order, { ascending: !opts.desc })
      if (opts.limit) q = q.limit(opts.limit)
      let result
      try {
        result = await q
      } catch {
        throw new ServiceError('network')
      }
      if (result.error) {
        const e = result.error as { code?: string; message?: string }
        throw new ServiceError(fromSqlState(e.code), e.message)
      }
      return (result.data ?? []) as T[]
    },
  }
}
