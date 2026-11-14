// Service-path admin endpoints. Every endpoint needs a signed-in admin; writes are audited
// (admin_service.ts).
import { api, APIError } from 'encore.dev/api'
import { requireAdmin, requireAdminView } from '../lib/admin_actor'
import * as svc from './admin_service'
import type { AdminAreaView, SourceInput } from './admin_service'
import type { FactStatus } from './domain/stages'
import type { FindingInput, MetricInput, PointInput, ScreeningInput, StatusTarget, StepInput } from './repository_admin'

export const adminArea = api(
  { expose: true, auth: true, method: 'GET', path: '/api/service-paths/admin/areas/:id' },
  async (req: { id: string }): Promise<AdminAreaView> => {
    requireAdminView()
    return svc.adminArea(req.id)
  },
)

export const adminSavePoint = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/service-paths/admin/points' },
  async (req: PointInput): Promise<{ id: number }> => ({ id: await svc.savePoint(requireAdmin().email, req) }),
)

export const adminSaveStep = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/service-paths/admin/steps' },
  async (req: StepInput): Promise<void> => svc.saveStep(requireAdmin().email, req),
)

export const adminSaveScreening = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/service-paths/admin/screening' },
  async (req: ScreeningInput): Promise<void> => svc.saveScreening(requireAdmin().email, req),
)

export const adminSaveMetric = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/service-paths/admin/metrics' },
  async (req: MetricInput): Promise<void> => svc.saveMetric(requireAdmin().email, req),
)

export const adminSaveFinding = api(
  { expose: true, auth: true, method: 'PUT', path: '/api/service-paths/admin/findings' },
  async (req: FindingInput): Promise<{ id: number }> => ({ id: await svc.saveFinding(requireAdmin().email, req) }),
)

export const adminAddSource = api(
  { expose: true, auth: true, method: 'POST', path: '/api/service-paths/admin/sources' },
  async (req: SourceInput): Promise<{ id: number }> => ({ id: await svc.addSource(requireAdmin().email, req) }),
)

export type StatusKind = 'point' | 'finding' | 'metric' | 'step' | 'screening'

export interface StatusRequest {
  kind: StatusKind
  // point, finding, metric
  id?: number
  // step, screening
  county?: string
  // stage (step) or cancer (screening)
  ref?: string
  status: FactStatus
  // Stamp verified_on with today.
  verify?: boolean
}

export function statusTarget(req: StatusRequest): StatusTarget {
  if (req.kind === 'step' || req.kind === 'screening') {
    if (!req.county || !req.ref) throw APIError.invalidArgument('county and ref are required')
    return req.kind === 'step' ? { kind: 'step', county: req.county, stage: req.ref } : { kind: 'screening', county: req.county, cancer: req.ref }
  }
  if (req.id === undefined) throw APIError.invalidArgument('id is required')
  return { kind: req.kind, id: req.id }
}

export const adminSetStatus = api(
  { expose: true, auth: true, method: 'POST', path: '/api/service-paths/admin/status' },
  async (req: StatusRequest): Promise<void> => {
    const actor = requireAdmin()
    await svc.setStatus(actor.email, statusTarget(req), req.status, req.verify ?? false)
  },
)
