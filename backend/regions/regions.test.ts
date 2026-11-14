// County view against Encore's test database (migration 7 seed, no mocks).
import { describe, expect, it } from 'vitest'
import { county } from './regions'

describe('GET /api/regions/counties/:id', () => {
  it('returns the Helsinki figures, top languages and anonymous counts', async () => {
    const c = await county({ id: 'helsinki' })
    expect(c.name).toBe('Helsingin kaupunki / City of Helsinki')
    expect(c.figures[0]).toMatchObject({ value: 21.2, unit: '%', year: 2025 })
    expect(c.figures.map((f) => f.value)).toEqual([21.2, 147482, 74.3, 71.4, 69.6, 75.9, 80])
    expect(c.figures.every((f) => f.source.length > 0)).toBe(true)
    expect(c.topLanguages).toEqual(['Russian', 'Somali', 'Arabic', 'English', 'Estonian'])
    expect(c.counts.total).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(c.counts.byStage)).toBe(true)
    expect(Number.isNaN(Date.parse(c.generatedAt))).toBe(false)
  })

  it('unknown county → not found', async () => {
    await expect(county({ id: 'atlantis' })).rejects.toMatchObject({ code: 'not_found' })
  })
})
