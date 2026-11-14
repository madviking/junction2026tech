// SQL for admin_users, admin_sessions and audit_log. Only the admin service writes them.
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

export interface AdminUser {
  id: number
  email: string
  displayName: string
  passwordHash: string
}

interface UserRow {
  id: string | number
  email: string
  display_name: string
  password_hash: string
}
const toUser = (r: UserRow): AdminUser => ({ id: Number(r.id), email: r.email, displayName: r.display_name, passwordHash: r.password_hash })

export async function insertUserIfMissing(email: string, displayName: string, passwordHash: string): Promise<void> {
  await db.exec`
    INSERT INTO admin_users (email, display_name, password_hash) VALUES (${email}, ${displayName}, ${passwordHash})
    ON CONFLICT (email) DO NOTHING`
}

// Creates the account or resets its name and password (the public demo account, whose
// password lives in code and may change).
export async function upsertUser(email: string, displayName: string, passwordHash: string): Promise<void> {
  await db.exec`
    INSERT INTO admin_users (email, display_name, password_hash) VALUES (${email}, ${displayName}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash`
}

export async function userByEmail(email: string): Promise<AdminUser | null> {
  const row = await db.queryRow<UserRow>`SELECT id, email, display_name, password_hash FROM admin_users WHERE email = ${email}`
  return row ? toUser(row) : null
}

export async function insertSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void> {
  await db.exec`INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expiresAt})`
}

export async function userBySession(tokenHash: string): Promise<AdminUser | null> {
  const row = await db.queryRow<UserRow>`
    SELECT u.id, u.email, u.display_name, u.password_hash
    FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()`
  return row ? toUser(row) : null
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await db.exec`DELETE FROM admin_sessions WHERE token_hash = ${tokenHash}`
}

export async function insertAudit(actor: string, action: string, target: string, detail: Record<string, unknown>): Promise<void> {
  await db.exec`
    INSERT INTO audit_log (actor, action, target, detail)
    VALUES (${actor}, ${action}, ${target}, ${JSON.stringify(detail)}::text::jsonb)`
}

export interface AuditRow {
  id: number
  at: Date
  actor: string
  action: string
  target: string
  detail: string
}

export async function listAudit(limit: number): Promise<AuditRow[]> {
  const rows = await db.queryAll<{ id: string | number; at: Date; actor: string; action: string; target: string; detail: unknown }>`
    SELECT id, at, actor, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT ${limit}`
  return rows.map((r) => ({ ...r, id: Number(r.id), detail: typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail) }))
}
