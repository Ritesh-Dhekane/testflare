import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { auditStatement } from '../lib/audit'
import { ApiError } from '../lib/errors'
import { clientIp, readJson } from '../lib/http'
import { requireUser } from '../lib/session'
import { subscriptionState, trialPeriod } from '../lib/subscription'

export const company = new Hono<AppEnv>()
company.use(requireUser)

// Starts the company's 7-day access period. Owners and admins only; once per company for now.
company.post('/subscription/start', async (c) => {
  await readJson(c)
  const user = c.get('user')
  const db = c.env.DB
  const membership = await db
    .prepare('SELECT company_id, role FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1')
    .bind(user.id)
    .first<{ company_id: string; role: string }>()
  if (!membership) throw new ApiError(404, 'no_company', 'You are not part of a company.')
  if (membership.role === 'member') {
    throw new ApiError(403, 'forbidden', 'Only the company owner or an admin can start access.')
  }
  if (
    await db.prepare('SELECT 1 FROM subscriptions WHERE company_id = ?').bind(membership.company_id).first()
  ) {
    throw new ApiError(409, 'already_started', 'Your 7-day access has already been used.')
  }
  const now = Date.now()
  const period = trialPeriod(now)
  await db.batch([
    db
      .prepare(
        "INSERT INTO subscriptions (id, company_id, plan, starts_at, ends_at, created_at) VALUES (?, ?, 'trial', ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), membership.company_id, period.startsAt, period.endsAt, now),
    auditStatement(db, {
      action: 'subscription.start',
      companyId: membership.company_id,
      userId: user.id,
      ip: clientIp(c),
    }),
  ])
  return c.json(
    { subscription: subscriptionState({ starts_at: period.startsAt, ends_at: period.endsAt }, now) },
    201,
  )
})
