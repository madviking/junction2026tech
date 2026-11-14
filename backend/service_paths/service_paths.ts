// Public service-path endpoints: published facts only, anonymous.
import { api } from 'encore.dev/api'
import type { CompareView } from './domain/compare'
import { STAGES, type Stage } from './domain/stages'
import * as service from './service'
import type { AreaPath, AreaSummary } from './service'

export const stages = api(
  { expose: true, method: 'GET', path: '/api/service-paths/stages' },
  async (): Promise<{ stages: Stage[] }> => ({ stages: [...STAGES] }),
)

export const areas = api(
  { expose: true, method: 'GET', path: '/api/service-paths/areas' },
  async (): Promise<{ areas: AreaSummary[] }> => ({ areas: await service.listAreas() }),
)

export const area = api(
  { expose: true, method: 'GET', path: '/api/service-paths/areas/:id' },
  (req: { id: string; route?: string }): Promise<AreaPath> => service.getArea(req.id, { route: req.route ?? null }),
)

export const compare = api(
  { expose: true, method: 'GET', path: '/api/service-paths/compare' },
  (): Promise<CompareView> => service.compare(),
)
