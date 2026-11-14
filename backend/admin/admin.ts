import { api, type Header } from 'encore.dev/api'
import { requireAdminView } from '../lib/admin_actor'
import * as service from './service'

export const signIn = api(
  { expose: true, method: 'POST', path: '/api/admin/sign-in' },
  (req: { email: string; password: string }): Promise<service.SignInResult> => service.signIn(req.email, req.password),
)

// Public: the view-only demo account, shown on the sign-in page.
export const demoAccount = api(
  { expose: true, method: 'GET', path: '/api/admin/demo' },
  async (): Promise<service.DemoAccount> => service.DEMO_VIEWER,
)

export const signOut = api(
  { expose: true, auth: true, method: 'POST', path: '/api/admin/sign-out' },
  async (req: { authorization: Header<'Authorization'> }): Promise<void> => {
    requireAdminView()
    await service.signOut(req.authorization.replace(/^Bearer\s+/, ''))
  },
)

export const me = api(
  { expose: true, auth: true, method: 'GET', path: '/api/admin/me' },
  async (): Promise<service.AdminProfile> => {
    const a = requireAdminView()
    return { id: Number(a.userID), email: a.email, displayName: a.displayName, role: a.role }
  },
)

export const audit = api(
  { expose: true, auth: true, method: 'GET', path: '/api/admin/audit' },
  async (req: { limit?: number }): Promise<{ entries: service.AuditEntry[] }> => {
    requireAdminView()
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
