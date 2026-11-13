import { api } from 'encore.dev/api'
import { getHealth, type HealthStatus } from './service'

// Liveness plus dependency status. Always 200 so the container stays up while degraded.
export const get = api(
  { expose: true, method: 'GET', path: '/api/health' },
  (): Promise<HealthStatus> => getHealth(),
)
