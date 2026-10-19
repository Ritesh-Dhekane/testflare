import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { auditStatement } from '../lib/audit'
import { hashPassword, verifyPassword } from '../lib/crypto'
import { ApiError } from '../lib/errors'
import { clientIp, readJson } from '../lib/http'
import { rateLimit } from '../lib/rateLimit'
import { endSession, requireUser, startSession } from '../lib/session'
import { subscriptionState } from '../lib/subscription'
import { passesTurnstile } from '../lib/turnstile'
import * as v from '../lib/validate'

export const auth = new Hono<AppEnv>()

async function uniqueSlug(db: D1Database, name: string) {
  const base = v.slugify(name)
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    if (!(await db.prepare('SELECT 1 FROM companies WHERE slug = ?').bind(slug).first())) return slug
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

// Sign up: creates the user, their company (they are its owner) and a session.
auth.post('/signup', async (c) => {
  const ip = clientIp(c)
  await rateLimit(c.env.KV, `signup:${ip}`, 10, 60 * 60)
  const body = await readJson(c)
  const email = v.email(body.email)
  const password = v.password(body.password)
  const name = v.text(body.name, 'name', { max: 80 })
  const companyName = v.text(body.companyName, 'company name', { min: 2, max: 60 })
  if (!(await passesTurnstile(body.turnstileToken, c.env.TURNSTILE_SECRET, ip))) {
    throw new ApiError(400, 'bot_check_failed', 'Please complete the security check and try again.')
  }

  const db = c.env.DB
  if (await db.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) {
    throw new ApiError(409, 'email_taken', 'An account with this email already exists. Sign in instead.')
  }
  const now = Date.now()
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()
  await db.batch([
    db
      .prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, email, name, await hashPassword(password), now),
    db
      .prepare('INSERT INTO companies (id, name, slug, created_at) VALUES (?, ?, ?, ?)')
      .bind(companyId, companyName, await uniqueSlug(db, companyName), now),
    db
      .prepare("INSERT INTO memberships (company_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)")
      .bind(companyId, userId, now),
    auditStatement(db, { action: 'user.signup', companyId, userId, ip }),
  ])
  await startSession(c, userId)
  return c.json({ ok: true }, 201)
})

auth.post('/login', async (c) => {
  const ip = clientIp(c)
  const body = await readJson(c)
  const email = v.email(body.email)
  await rateLimit(c.env.KV, `login:${ip}:${email}`, 10, 15 * 60)
  if (!(await passesTurnstile(body.turnstileToken, c.env.TURNSTILE_SECRET, ip))) {
    throw new ApiError(400, 'bot_check_failed', 'Please complete the security check and try again.')
  }
  const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; password_hash: string | null }>()
  const ok =
    user?.password_hash &&
    typeof body.password === 'string' &&
    (await verifyPassword(body.password, user.password_hash))
  if (!user || !ok) throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.')
  await auditStatement(c.env.DB, { action: 'user.login', userId: user.id, ip }).run()
  await startSession(c, user.id)
  return c.json({ ok: true })
})

auth.post('/logout', async (c) => {
  await endSession(c)
  return c.json({ ok: true })
})

// Who is signed in, their company and its access period.
auth.get('/me', requireUser, async (c) => {
  const user = c.get('user')
  const company = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.slug, m.role FROM memberships m JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = ? ORDER BY m.created_at LIMIT 1`,
  )
    .bind(user.id)
    .first<{ id: string; name: string; slug: string; role: string }>()
  const subscription = company
    ? await c.env.DB.prepare(
        'SELECT starts_at, ends_at FROM subscriptions WHERE company_id = ? ORDER BY ends_at DESC LIMIT 1',
      )
        .bind(company.id)
        .first<{ starts_at: number; ends_at: number }>()
    : null
  return c.json({ user, company, subscription: subscriptionState(subscription) })
})
