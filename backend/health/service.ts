import { appMeta } from 'encore.dev'
import log from 'encore.dev/log'
import * as repository from './repository'

export type CheckState = 'ok' | 'unavailable'

export interface DependencyCheck {
  name: string
  state: CheckState
  detail?: string
}

export interface HealthStatus {
  status: 'ok' | 'degraded'
  environment: string
  checks: DependencyCheck[]
}

async function check(name: string, probe: () => Promise<boolean>): Promise<DependencyCheck> {
  try {
    return { name, state: (await probe()) ? 'ok' : 'unavailable' }
  } catch (err) {
    const detail = err instanceof Error ? err.name : 'UnknownError'
    log.warn('health check failed', { name, detail })
    return { name, state: 'unavailable', detail }
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const checks = [
    await check('postgres', repository.pingDatabase),
    await check('pgvector', repository.hasVectorExtension),
  ]
  return {
    status: checks.every((c) => c.state === 'ok') ? 'ok' : 'degraded',
    environment: appMeta().environment.name,
    checks,
  }
}
