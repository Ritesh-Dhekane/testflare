import { ApiError } from './errors'

// A simple fixed-window counter in KV. KV is eventually consistent, so this is a soft limit: good enough
// to slow down guessing and spam, not an exact quota.
export async function rateLimit(kv: KVNamespace, key: string, limit: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds)
  const name = `rl:${key}:${bucket}`
  const count = Number((await kv.get(name)) ?? 0) + 1
  await kv.put(name, String(count), { expirationTtl: Math.max(60, windowSeconds * 2) })
  if (count > limit)
    throw new ApiError(429, 'rate_limited', 'Too many attempts. Please wait a few minutes and try again.')
}
