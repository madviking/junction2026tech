// Every admin endpoint starts with requireAdmin(): the gateway's auth handler already
// rejects anonymous HTTP calls; this also covers in-process calls and gives the actor
// for the audit log.
import { APIError } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'

export interface AdminActor {
  userID: string
  email: string
  displayName: string
}

export function requireAdmin(): AdminActor {
  const a = getAuthData()
  if (!a) throw APIError.unauthenticated('sign in required')
  return a
}
