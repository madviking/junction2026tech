import { useSyncExternalStore } from 'react'
import type { AdminProfile, AdminSignInResult } from '@/features/admin-auth/types'

/**
 * The signed-in admin session for this browser tab.
 *
 * Decision (README): the bearer token is kept in `sessionStorage` as a UI convenience so a
 * reload does not sign the admin out. It dies with the tab, expires with the server session
 * (12 h) and is cleared on sign-out and on any 401. Storage access is wrapped in try/catch
 * (private mode, blocked storage): without storage the session simply lives in memory.
 */
export interface AdminSession {
  token: string
  expiresAt: string
  user: AdminProfile
}

const STORAGE_KEY = 'silta.admin.session'

type Listener = () => void
const listeners = new Set<Listener>()

function storage(): Storage | null {
  try {
    // eslint-disable-next-line no-restricted-properties -- documented UI convenience: admin bearer token for this tab only (see README)
    return window.sessionStorage
  } catch {
    return null
  }
}

function isSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.token === 'string' && typeof v.expiresAt === 'string' && !!v.user && typeof v.user === 'object'
}

function isExpired(session: AdminSession) {
  const at = Date.parse(session.expiresAt)
  return Number.isFinite(at) && at <= Date.now()
}

function load(): AdminSession | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) && !isExpired(parsed) ? parsed : null
  } catch {
    return null
  }
}

let current: AdminSession | null = load()

function emit() {
  listeners.forEach((listener) => listener())
}

function persist(session: AdminSession | null) {
  try {
    const store = storage()
    if (!store) return
    if (session) store.setItem(STORAGE_KEY, JSON.stringify(session))
    else store.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked or full: the session still works in memory for this page.
  }
}

/** The current session, or null when signed out or expired. */
export function getAdminSession(): AdminSession | null {
  if (current && isExpired(current)) clearAdminSession()
  return current
}

/** Stores the result of a successful sign-in. */
export function setAdminSession(result: AdminSignInResult) {
  current = { token: result.token, expiresAt: result.expiresAt, user: result.user }
  persist(current)
  emit()
}

/** Forgets the session (sign-out, 401, expiry). */
export function clearAdminSession() {
  if (current === null) return
  current = null
  persist(null)
  emit()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Re-renders when the session changes (sign-in, sign-out, a 401 anywhere in the admin). */
export function useAdminSession(): AdminSession | null {
  return useSyncExternalStore(subscribe, getAdminSession, getAdminSession)
}

/** Test helper: re-reads storage (module state survives between tests). */
export function reloadAdminSessionForTests() {
  current = load()
  emit()
}
