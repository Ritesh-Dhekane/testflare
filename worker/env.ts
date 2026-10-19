// Cloudflare bindings (wrangler.jsonc) and secrets (.dev.vars locally, `wrangler secret put` in production).
export interface Env {
  DB: D1Database
  BUILDS: R2Bucket
  KV: KVNamespace
  TURNSTILE_SECRET: string
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
}

export type AppEnv = { Bindings: Env; Variables: { user: SessionUser } }
