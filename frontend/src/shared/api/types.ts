import type { components } from '@/shared/api/generated/openapi'

// Short names for generated schemas. Add aliases here, never hand-written shapes.
export type Schemas = components['schemas']
export type HealthStatus = Schemas['HealthStatus']
export type DependencyCheck = Schemas['DependencyCheck']
