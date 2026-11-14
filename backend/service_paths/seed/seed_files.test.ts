// The real seed files parse without errors (pure, no database).
// Run alone while editing a seed file: npx vitest run service_paths/seed
import { describe, expect, it } from 'vitest'
import { loadSeed } from './load'

const AREAS = ['etela-pohjanmaa', 'helsinki', 'kymenlaakso', 'lansi-uusimaa', 'pohjois-pohjanmaa']

describe('service_paths seed files', () => {
  const seed = loadSeed()

  it('have no validation errors', () => {
    expect(seed.errors).toEqual([])
  })

  it('cover the five areas, each with doors, a contact step and screening', () => {
    expect(seed.areas.map((a) => a.county)).toEqual(AREAS)
    for (const a of seed.areas) {
      expect(a.points.length, a.county).toBeGreaterThan(0)
      expect(a.steps.some((s) => s.stage === 'contact'), a.county).toBe(true)
      expect(a.screening.map((s) => s.cancer).sort(), a.county).toEqual(['breast', 'cervical', 'colorectal'])
      expect(a.points.some((p) => p.routes.includes('A1') && p.status === 'published'), a.county).toBe(true)
    }
  })

  it('give every area and Finland the core comparison metrics', () => {
    for (const area of [...AREAS, 'finland']) {
      const metrics = new Set(seed.metrics.metrics.filter((m) => m.area === area).map((m) => m.metric))
      for (const m of ['sotkanet:6411', 'sotkanet:6410', 'cancer_registry:fit_no_colonoscopy']) {
        expect(metrics.has(m), `${area} ${m}`).toBe(true)
      }
    }
  })
})
