// Admin sign-in rules: seeded local users, scrypt password hashes, bearer sessions, audit.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { appMeta } from 'encore.dev'
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { parse } from 'yaml'
import * as repo from './repository'
import type { AdminUser } from './repository'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>
const SESSION_HOURS = 12

export interface AdminProfile {
  id: number
  email: string
  displayName: string
}

export interface SignInResult {
  token: string
  expiresAt: string
  user: AdminProfile
}

export interface AuditEntry {
  id: number
  at: string
  actor: string
  action: string
  target: string
  detail: string
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 32)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const profile = (u: AdminUser): AdminProfile => ({ id: u.id, email: u.email, displayName: u.displayName })

// Local test admins come from admin/seed/admin-users.local.yaml (found from the
// working directory, like the content seed). Existing users are never overwritten.
let seeded: Promise<void> | null = null
export function ensureAdminsSeeded(): Promise<void> {
  seeded ??= (async () => {
    // Local test admins never reach production; real admins are created another way.
    if (appMeta().environment.type === 'production') {
      log.warn('admin seed skipped in production')
      return
    }
    const file = [path.resolve(process.cwd(), 'admin/seed/admin-users.local.yaml'), path.resolve(process.cwd(), 'backend/admin/seed/admin-users.local.yaml')].find(existsSync)
    if (!file) {
      log.warn('no local admin seed file; no admin users created')
      return
    }
    const raw = parse(readFileSync(file, 'utf8')) as { users?: { email: string; name: string; password: string }[] }
    for (const u of raw.users ?? []) await repo.insertUserIfMissing(u.email.toLowerCase(), u.name, await hashPassword(u.password))
  })().catch((err) => {
    seeded = null
    throw err
  })
  return seeded
}

// Failed sign-ins per email in the last window (in memory; one process). Enough to stop
// password guessing on a small admin team; replace with a shared store if scaled out.
const FAIL_WINDOW_MS = 15 * 60_000
const MAX_FAILS = 5
const failures = new Map<string, number[]>()
let dummyHash: Promise<string> | null = null

function recentFailures(email: string, now: number): number[] {
  const list = (failures.get(email) ?? []).filter((t) => now - t < FAIL_WINDOW_MS)
  failures.set(email, list)
  return list
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  await ensureAdminsSeeded()
  const normalized = email.trim().toLowerCase()
  const now = Date.now()
  if (recentFailures(normalized, now).length >= MAX_FAILS) {
    throw APIError.resourceExhausted('too many failed sign-ins; try again in 15 minutes')
  }
  const user = await repo.userByEmail(normalized)
  // Unknown users get the same scrypt work and the same error as a wrong password.
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash), false)
  if (!user || !ok) {
    recentFailures(normalized, now).push(now)
    await recordAudit('anonymous', 'admin.sign_in_failed', normalized.slice(0, 200), {})
    throw APIError.unauthenticated('wrong email or password')
  }
  failures.delete(normalized)
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000)
  await repo.insertSession(tokenHash(token), user.id, expiresAt)
  await recordAudit(user.email, 'admin.sign_in', user.email, {})
  return { token, expiresAt: expiresAt.toISOString(), user: profile(user) }
}

export async function userForToken(token: string): Promise<AdminProfile | null> {
  const user = await repo.userBySession(tokenHash(token))
  return user ? profile(user) : null
}

export async function signOut(token: string): Promise<void> {
  await repo.deleteSession(tokenHash(token))
}

export async function recordAudit(actor: string, action: string, target: string, detail: Record<string, unknown>): Promise<void> {
  await repo.insertAudit(actor, action, target, detail)
}

export async function listAudit(limit: number): Promise<AuditEntry[]> {
  const rows = await repo.listAudit(Math.min(Math.max(limit, 1), 500))
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }))
}
