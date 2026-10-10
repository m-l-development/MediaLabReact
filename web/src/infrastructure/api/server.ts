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
