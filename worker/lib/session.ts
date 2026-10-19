import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { AppEnv, SessionUser } from '../env'
import { randomToken, sha256 } from './crypto'
import { ApiError } from './errors'

// Sessions: a random token in an HTTP-only cookie; the database keeps only its SHA-256.
const COOKIE = 'tf_session'
const SESSION_DAYS = 30

export async function startSession(c: Context<AppEnv>, userId: string) {
  const token = randomToken()
  const now = Date.now()
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now + maxAge * 1000, now)
    .run()
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge })
}

export async function currentUser(c: Context<AppEnv>): Promise<SessionUser | null> {
  const token = getCookie(c, COOKIE)
  if (!token) return null
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.email_verified_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), Date.now())
    .first<{ id: string; email: string; name: string | null; email_verified_at: number | null }>()
  return row
    ? { id: row.id, email: row.email, name: row.name, emailVerified: row.email_verified_at !== null }
    : null
}

export async function endSession(c: Context<AppEnv>) {
  const token = getCookie(c, COOKIE)
  if (token)
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
      .bind(await sha256(token))
      .run()
  deleteCookie(c, COOKIE, { path: '/', secure: true })
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const user = await currentUser(c)
  if (!user) throw new ApiError(401, 'unauthenticated', 'Please sign in.')
  c.set('user', user)
  await next()
})
