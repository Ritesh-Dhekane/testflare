import type { Context } from 'hono'
import { ApiError } from './errors'

/**
 * Reads a JSON body. Requiring `application/json` also blocks cross-site form posts (a browser can't
 * send that content type to another site without a CORS preflight), which protects the cookie routes.
 * The body is always read first, even when it's refused: an unread body can break the next request on
 * the same connection.
 */
export async function readJson(c: Context): Promise<Record<string, unknown>> {
  const raw = await c.req.text()
  if (!c.req.header('content-type')?.includes('application/json')) {
    throw new ApiError(415, 'json_required', 'Send the request as JSON.')
  }
  try {
    const body: unknown = JSON.parse(raw || '{}')
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body is not valid JSON.')
  }
}

export const clientIp = (c: Context) => c.req.header('CF-Connecting-IP') ?? 'local'
