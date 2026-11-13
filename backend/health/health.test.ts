import { describe, expect, it } from 'vitest'
import { get } from './health'

describe('GET /api/health', () => {
  it('reports postgres and pgvector as ok on the migrated database', async () => {
    const health = await get()

    expect(health.status).toBe('ok')
    expect(health.checks).toEqual([
      { name: 'postgres', state: 'ok' },
      { name: 'pgvector', state: 'ok' },
    ])
  })
})
