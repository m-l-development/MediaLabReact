import { callServer } from '../infrastructure/api/server'
import type { Block } from '../shared/mail/mail-render'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Mail-fanen (ADM-11), samme kall som media-lab/src/services/mail.js. Bare Developer og Moderator med MFA – databasen og
 * serveren avgjør. Lenkene settes alltid inn av systemet ved utsending og kan ikke endres her.
 */
export interface SavedTemplate { key: string; subject: string; blocks: Block[]; updated_at: string; updated_by_name: string | null }
export interface MailSettings { custom_logo?: boolean; notify_extra?: string[] | null }
export interface MailStatus { configured: boolean; sender?: string | undefined; error?: string | undefined }
export interface OutboxRow { id: string; to_email: string; kind: string; status: string; error_code: string | null; created_at: string }

export function createMailService(d: DataAdapter | null, token: () => Promise<string | null>, server: typeof callServer = callServer) {
  const data = () => {
    if (!d) throw new ServiceError('unavailable')
    return d
  }
  const call = async <T>(action: string, body: unknown, opts?: Parameters<typeof callServer>[3]) => server<T & Record<string, unknown>>(await token(), action, body, opts)
  return {
    /** Bare redigerte maler; mangler en, brukes standardmalen. */
    templates: async () => data().rpc<SavedTemplate[]>('mail_templates'),
    save: async (key: string, subject: string, blocks: Block[]) => data().rpc('save_mail_template', { p_key: key, p_subject: subject, p_blocks: blocks }),
    reset: async (key: string) => data().rpc('reset_mail_template', { p_key: key }),
    settings: async () => data().rpc<MailSettings | null>('mail_settings_get'),
    outbox: async () => data().rpc<OutboxRow[]>('mail_outbox_recent'),
    /** Om ConnectHub kan sende e-post (oppsettet ligger bare på serveren). */
    status: async () => call<MailStatus>('mail.status', {}),
    logoUrl: async () => (await call<{ url?: string }>('mail.logo_url', {})).url ?? null,
    uploadLogo: async (file: File) => call('mail.logo_upload', null, { raw: file, contentType: 'application/octet-stream' }),
    resetLogo: async () => call('mail.logo_reset', {}),
    /** Sender malen til egen e-postadresse med en eksempellenke. */
    test: async (key: string) => call<{ to: string }>('mail.test', { key }),
  }
}
export type MailService = ReturnType<typeof createMailService>
