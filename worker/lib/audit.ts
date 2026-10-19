// One row per security-relevant action (sign-ups, sign-ins, access changes), for company admins later.
export function auditStatement(
  db: D1Database,
  entry: { action: string; companyId?: string | null; userId?: string | null; detail?: unknown; ip?: string },
) {
  return db
    .prepare('INSERT INTO audit_log (company_id, user_id, action, detail, ip, at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(
      entry.companyId ?? null,
      entry.userId ?? null,
      entry.action,
      entry.detail === undefined ? null : JSON.stringify(entry.detail),
      entry.ip ?? null,
      Date.now(),
    )
}
