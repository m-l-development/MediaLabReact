import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Tilbakemeldinger (samme databasefunksjon som dagens app, `submit_feedback`). Alle innloggede kan sende inn; databasen
 * kontrollerer innlogging, rensing og grensen (20 per døgn). Innboksen og behandlingen hører til admin.
 */
export interface FeedbackInput {
  kind: string
  title: string
  description: string
  answers: Record<string, string>
  app: string
  appName: string
  page: string
  view: string
  marked: unknown
  context: Record<string, unknown>
  churchId: string | null
}

export function createFeedbackService(data: DataAdapter | null) {
  return {
    available: () => !!data,
    async submit(f: FeedbackInput): Promise<{ id: string; ref: string }> {
      if (!data) throw new ServiceError('unavailable')
      const r = await data.rpc<{ id?: string; ref?: string } | null>('submit_feedback', {
        p_kind: f.kind, p_title: f.title || null, p_description: f.description, p_answers: f.answers,
        p_app: f.app || null, p_app_name: f.appName || null, p_page: f.page || null, p_view: f.view || null,
        p_marked: f.marked ?? null, p_context: f.context, p_church: f.churchId,
      })
      if (!r?.ref) throw new ServiceError('unknown')
      return { id: String(r.id ?? ''), ref: r.ref }
    },
  }
}
export type FeedbackService = ReturnType<typeof createFeedbackService>
