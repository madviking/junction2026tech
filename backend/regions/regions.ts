import { api } from 'encore.dev/api'
import * as service from './service'
import type { CountyView } from './service'

// Public: county figures and anonymous visit counts (no codes, no timestamps).
export const county = api(
  { expose: true, method: 'GET', path: '/api/regions/counties/:id' },
  (req: { id: string }): Promise<CountyView> => service.getCounty(req.id),
)
