// Access periods. For now each company gets one 7-day period, started from the dashboard; tiers and
// payments come later. When it ends, uploads and tokens stop but public install pages keep working.

export const TRIAL_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

export type SubscriptionState =
  { status: 'none' } | { status: 'active' | 'expired'; startsAt: number; endsAt: number; daysLeft: number }

export function trialPeriod(start: number) {
  return { startsAt: start, endsAt: start + TRIAL_DAYS * DAY }
}

export function subscriptionState(
  row: { starts_at: number; ends_at: number } | null,
  now = Date.now(),
): SubscriptionState {
  if (!row) return { status: 'none' }
  const active = now >= row.starts_at && now < row.ends_at
  return {
    status: active ? 'active' : 'expired',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    daysLeft: active ? Math.ceil((row.ends_at - now) / DAY) : 0,
  }
}
