// The app's one auth handler: every endpoint with `auth: true` requires a signed-in admin.
// Resident, clinician and county endpoints stay anonymous (auth: false).
import { APIError, Gateway, type Header } from 'encore.dev/api'
import { authHandler } from 'encore.dev/auth'
import type { AdminRole } from '../lib/admin_actor'
import { userForToken } from './service'

interface AuthParams {
  authorization: Header<'Authorization'>
}

export interface AuthData {
  userID: string
  email: string
  displayName: string
  role: AdminRole
}

export const auth = authHandler<AuthParams, AuthData>(async ({ authorization }) => {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : ''
  if (!token) throw APIError.unauthenticated('sign in required')
  const user = await userForToken(token)
  if (!user) throw APIError.unauthenticated('session expired or invalid')
  return { userID: String(user.id), email: user.email, displayName: user.displayName, role: user.role }
})

export const gateway = new Gateway({ authHandler: auth })
