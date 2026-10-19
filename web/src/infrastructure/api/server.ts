import { ServiceError } from '../../services/errors'

/**
 * Kall til ConnectHub-API-et (media-lab/api/ch.js → server/handlers/ch.js). Uendret kontrakt:
 * POST /api/ch?a=<handling>, Bearer-token, svar { ok, ... } eller { ok: false, error, detail }.
 */
export interface ServerCallOptions {
  raw?: BodyInit
  contentType?: string
  query?: Record<string, string>
  fetchImpl?: typeof fetch
}

export async function callServer<T = Record<string, unknown>>(
  accessToken: string | null,
  action: string,
  body?: unknown,
  opts: ServerCallOptions = {},
): Promise<T> {
  if (!accessToken) throw new ServiceError('unauthorized')
  const doFetch = opts.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.raw !== undefined ? 90000 : 30000)
  const qs = opts.query ? `&${new URLSearchParams(opts.query)}` : ''
  let response: Response
  try {
    response = await doFetch(`/api/ch?a=${encodeURIComponent(action)}${qs}`, {
      method: 'POST',
      headers: { 'content-type': opts.contentType ?? 'application/json', authorization: `Bearer ${accessToken}` },
      body: opts.raw !== undefined ? opts.raw : JSON.stringify(body ?? {}),
      signal: controller.signal,
    })
  } catch {
    throw new ServiceError(controller.signal.aborted ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
  type ServerJson = { ok?: boolean; error?: string; detail?: string }
  let json = null as ServerJson | null
  try {
    json = (await response.json()) as ServerJson
  } catch {
    // tomt eller ugyldig svar håndteres under
  }
  if (!response.ok || !json || json.ok === false) {
    throw new ServiceError(json?.error ?? `http_${response.status}`, json?.detail)
  }
  return json as T
}

/**
 * Handlinger før innlogging (serverens `route.anonymous`): «Glemt passord» (`auth.recover`) og forespørsel om konto
 * (`request.form`, `request.submit`). Uten token; serveren har egne grenser per IP og e-post. Samme kontrakt som i dag.
 */
export async function callAnonymous<T = Record<string, unknown>>(action: string, body?: unknown, fetchImpl: typeof fetch = fetch, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetchImpl(`/api/ch?a=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    })
  } catch {
    throw new ServiceError(controller.signal.aborted ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
  const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (!response.ok || !json || !json.ok) throw new ServiceError(json?.error ?? `http_${response.status}`)
  return json as T
}

/** Hva som lastes opp direkte til lagringen (serverens `upload.start`). */
export type DirectUploadTarget =
  | { kind: 'file'; church: string; folder: string }
  | { kind: 'link'; link: string; church: string }
  | { kind: 'church_logo'; church_name: string }

/**
 * Store filer (bilder og filer høyst 30 MB, logoer 10 MB) går ikke gjennom serveren – Vercel tar imot høyst 4,5 MB per
 * forespørsel. 1) `upload.start`: serveren kontrollerer type, størrelse, rettighet og kvote og gir en kortlivet signert
 * lenke til én nøkkel. 2) Nettleseren laster opp direkte til lagringen. 3) `upload.finish`: serveren kontrollerer innholdet
 * og registrerer filen (eller sletter den). `finish` er ekstra felt til steg 3 (navnet på en ny menighet).
 */
export async function directUpload<T = Record<string, unknown>>(
  token: () => Promise<string | null>,
  target: DirectUploadTarget,
  blob: Blob & { name?: string },
  finish: Record<string, string> = {},
  opts: { server?: typeof callServer; fetchImpl?: typeof fetch } = {},
): Promise<T> {
  const server = opts.server ?? callServer
  const doFetch = opts.fetchImpl ?? fetch
  const start = await server<{ id: string; url: string; mime: string }>(await token(), 'upload.start', { ...target, name: blob.name || 'bilde', mime: blob.type, size: blob.size })
  let r: Response
  try {
    r = await doFetch(start.url, { method: 'PUT', headers: { 'content-type': start.mime, 'x-upsert': 'false' }, body: blob, signal: AbortSignal.timeout(300000) })
  } catch (e) {
    throw new ServiceError(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'network')
  }
  if (!r.ok) throw new ServiceError(r.status === 413 ? 'too_large' : 'upload_failed')
  return server<T>(await token(), 'upload.finish', { id: start.id, ...finish })
}
