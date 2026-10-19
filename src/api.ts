// Calls to the TestFlare API (same origin). Errors carry the API's code and readable message.

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new ApiError(data.error ?? 'error', data.message ?? 'Something went wrong. Please try again.')
  return data as T
}

export type Subscription =
  { status: 'none' } | { status: 'active' | 'expired'; startsAt: number; endsAt: number; daysLeft: number }

export interface Me {
  user: { id: string; email: string; name: string | null; emailVerified: boolean }
  company: { id: string; name: string; slug: string; role: 'owner' | 'admin' | 'member' } | null
  subscription: Subscription
}
