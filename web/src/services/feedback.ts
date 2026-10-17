import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'
import type { CaseEvent, FeedbackCase } from '../shared/feedback/format-case'

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
  const need = () => {
    if (!data) throw new ServiceError('unavailable')
    return data
  }
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
    /** Innboksen (ADM-12): bare Moderator og Developer med MFA – databasefunksjonene kontrollerer rolle og MFA selv. */
    inbox: {
      list: async (archived: boolean) => need().rpc<FeedbackCase[]>('feedback_list', archived ? { p_archived: true } : {}),
      /** «Fjern sak» = arkiver: saken forsvinner fra innboksen, men historikk og logg beholdes, og den kan gjenopprettes. */
      archive: async (id: string, reason: string) => need().rpc('archive_feedback', { p_id: id, p_reason: reason || null }),
      restore: async (id: string) => need().rpc('restore_feedback', { p_id: id }),
      events: async (id: string) => need().rpc<CaseEvent[]>('feedback_events_for', { p_id: id }),
      setStatus: async (id: string, status: string, reason: string) => need().rpc('set_feedback_status', { p_id: id, p_status: status, p_reason: reason || null }),
      addNote: async (id: string, note: string) => need().rpc('add_feedback_note', { p_id: id, p_note: note }),
    },
  }
}
export type FeedbackService = ReturnType<typeof createFeedbackService>
