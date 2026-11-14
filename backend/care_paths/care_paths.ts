import { api } from 'encore.dev/api'
import type { CarePath } from './domain/compose'
import * as service from './service'

// All lane, route, profile and barrier codes with their wording, in display order.
export const options = api(
  { expose: true, method: 'GET', path: '/api/care-paths/options' },
  (req: { lang: string }): Promise<service.CarePathOptions> => service.listOptions(req.lang),
)

// One person's care path: door, Finnish script, clocks, adaptations, steps, review flags.
export const composePath = api(
  { expose: true, method: 'POST', path: '/api/care-paths/compose' },
  (req: service.ComposeParams): Promise<CarePath> => service.composePath(req),
)
