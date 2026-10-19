import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** An error the client is meant to see: a stable code for the UI plus a readable message. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
