import { api } from 'encore.dev/api'
import * as service from './service'
import type { CountyCounts, CreateVisitParams, EventParams } from './service'
import type { ClinicianSummary, NextStep, VisitView } from './views'

interface EventRequest extends EventParams {
  code: string
}

// Public and anonymous: whoever holds the code can read and act on the visit.

export const create = api(
  { expose: true, method: 'POST', path: '/api/visits' },
  (req: CreateVisitParams): Promise<VisitView> => service.createVisit(req),
)

export const get = api(
  { expose: true, method: 'GET', path: '/api/visits/:code' },
  (req: { code: string; lang?: string }): Promise<VisitView> => service.getVisit(req.code, req.lang),
)

export const addEvent = api(
  { expose: true, method: 'POST', path: '/api/visits/:code/events' },
  ({ code, ...req }: EventRequest): Promise<VisitView> => service.addEvent(code, req),
)

// The clinician's one-screen summary, always in Finnish.
export const summary = api(
  { expose: true, method: 'GET', path: '/api/visits/:code/summary' },
  (req: { code: string }): Promise<ClinicianSummary> => service.getSummary(req.code),
)

export const clinicianAnswers = api(
  { expose: true, method: 'POST', path: '/api/visits/:code/clinician' },
  (req: { code: string; answers: string[] }): Promise<ClinicianSummary> => service.addClinicianAnswers(req.code, req.answers),
)

export const nextSteps = api(
  { expose: true, method: 'GET', path: '/api/visits/:code/next-steps' },
  (req: { code: string; lang?: string }): Promise<{ steps: NextStep[] }> => service.getNextSteps(req.code, req.lang),
)

export const remove = api(
  { expose: true, method: 'DELETE', path: '/api/visits/:code' },
  (req: { code: string }): Promise<void> => service.deleteVisit(req.code),
)

// Internal: anonymous counts for the county view (no codes, no timestamps).
export const countyCounts = api(
  { expose: false, method: 'GET', path: '/internal/visits/county-counts' },
  (req: { county: string }): Promise<CountyCounts> => service.countyCounts(req.county),
)
