// Every admin endpoint starts with a guard: the gateway's auth handler already rejects
// anonymous HTTP calls; the guard also covers in-process calls and gives the actor for the
// audit log.
//
// Fail closed: requireAdmin() refuses view-only users (the public demo account), so every
// endpoint can change things only for editors unless it explicitly opts into
// requireAdminView(). Only endpoints that change nothing may use requireAdminView()
// (checked by admin/admin.test.ts, "view-only guard coverage").
import { APIError } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'

export type AdminRole = 'editor' | 'viewer'

export interface AdminActor {
  userID: string
  email: string
  displayName: string
  role: AdminRole
}

export const VIEW_ONLY_MESSAGE = 'This is a view-only demo account: you can look at everything, but changes are not saved.'

export function assertCanEdit(actor: { role: AdminRole }): void {
  if (actor.role !== 'editor') throw APIError.permissionDenied(VIEW_ONLY_MESSAGE)
}

/** Any signed-in admin, view-only included. Only for endpoints that change nothing. */
export function requireAdminView(): AdminActor {
  const a = getAuthData()
  if (!a) throw APIError.unauthenticated('sign in required')
  return a
}

/** A signed-in admin who may change things. The default guard for every admin endpoint. */
export function requireAdmin(): AdminActor {
  const a = requireAdminView()
  assertCanEdit(a)
  return a
}
