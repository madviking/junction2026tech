import { api, type Header } from 'encore.dev/api'
import { requireAdmin } from '../lib/admin_actor'
import * as service from './service'

export const signIn = api(
  { expose: true, method: 'POST', path: '/api/admin/sign-in' },
  (req: { email: string; password: string }): Promise<service.SignInResult> => service.signIn(req.email, req.password),
)

export const signOut = api(
  { expose: true, auth: true, method: 'POST', path: '/api/admin/sign-out' },
  async (req: { authorization: Header<'Authorization'> }): Promise<void> => {
    requireAdmin()
    await service.signOut(req.authorization.replace(/^Bearer\s+/, ''))
  },
)

export const me = api(
  { expose: true, auth: true, method: 'GET', path: '/api/admin/me' },
  async (): Promise<service.AdminProfile> => {
    const a = requireAdmin()
    return { id: Number(a.userID), email: a.email, displayName: a.displayName }
  },
)

export const audit = api(
  { expose: true, auth: true, method: 'GET', path: '/api/admin/audit' },
  async (req: { limit?: number }): Promise<{ entries: service.AuditEntry[] }> => {
    requireAdmin()
    return { entries: await service.listAudit(req.limit ?? 100) }
  },
)

// Internal: other services record their admin writes here (actor = signed-in email).
export const recordAudit = api(
  { expose: false, method: 'POST', path: '/internal/admin/audit' },
  async (req: { actor: string; action: string; target: string; detail: Record<string, string> }): Promise<void> => {
    await service.recordAudit(req.actor, req.action, req.target, req.detail)
  },
)
