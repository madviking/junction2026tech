// Comparison matrix (pure).
import { describe, expect, it } from 'vitest'
import { buildCompare, type CompareInput } from './compare'

const src = { id: 1, url: 'https://sotkanet.fi/x', title: 'Sotkanet', publisher: 'THL / Sotkanet', capturedOn: '2026-11-14' }
const m = (area: string, value: number, period: string) => ({
  area,
  stage: 'primary_visit' as const,
  metric: 'sotkanet:6411',
  definition: 'Doctor visits waiting over 7 days',
  value,
  unit: '%',
  period,
  better: 'lower' as const,
  scope: area === 'finland' ? ('national' as const) : ('area' as const),
  source: src,
})

const input: CompareInput = {
  areas: [
    { id: 'helsinki', name: 'Helsinki' },
    { id: 'kymenlaakso', name: 'Kymenlaakso' },
    { id: 'lansi-uusimaa', name: 'Länsi-Uusimaa' },
  ],
  metrics: [m('helsinki', 66.5, '2024'), m('helsinki', 75.9, '2025'), m('kymenlaakso', 61.8, '2025'), m('finland', 54.7, '2025'), m('lansi-uusimaa', 36.3, '2024')],
  steps: [{ county: 'kymenlaakso', stage: 'screening_followup', pointName: 'Seulontahoitaja', informedBy: 'phone', ifNothingHeard: 'Call on Friday', source: src }],
}

describe('buildCompare', () => {
  const view = buildCompare(input)

  it('lists every stage with its national limits, the same for every area', () => {
    expect(view.stages.map((s) => s.code)).toContain('referral_processing')
    expect(view.stages.find((s) => s.code === 'referral_processing')?.limits[0]).toMatchObject({ limit: '3 weeks from arrival', basis: 'legal' })
  })

  it('compares the latest Finland period and flags each area against Finland', () => {
    const row = view.metrics.find((r) => r.metric === 'sotkanet:6411')!
    expect(row.period).toBe('2025')
    expect(row.finland).toMatchObject({ value: 54.7, period: '2025' })
    const cell = (id: string) => row.cells.find((c) => c.area === id)!
    expect(cell('helsinki')).toMatchObject({ value: 75.9, period: '2025', vsFinland: 'worse' })
    expect(cell('kymenlaakso')).toMatchObject({ value: 61.8, vsFinland: 'worse' })
  })

  it('falls back to an older period without comparing it, and marks missing data', () => {
    const row = buildCompare({ ...input, areas: [...input.areas, { id: 'etela-pohjanmaa', name: 'Etelä-Pohjanmaa' }] }).metrics[0]
    expect(row.cells.find((c) => c.area === 'lansi-uusimaa')).toMatchObject({ value: 36.3, period: '2024', vsFinland: null })
    expect(row.cells.find((c) => c.area === 'etela-pohjanmaa')).toMatchObject({ value: null, period: null, source: null })
  })

  it('puts area steps on one row per stage with an empty cell where an area has none', () => {
    const row = view.steps.find((s) => s.stage === 'screening_followup')!
    expect(row.cells.map((c) => c.area)).toEqual(['helsinki', 'kymenlaakso', 'lansi-uusimaa'])
    expect(row.cells[1]).toMatchObject({ pointName: 'Seulontahoitaja', informedBy: 'phone' })
    expect(row.cells[0]).toMatchObject({ pointName: null, source: null })
  })

  it('higher-is-better metrics flip the comparison', () => {
    const v = buildCompare({
      ...input,
      metrics: [
        { ...m('helsinki', 69.6, '2024'), metric: 'sotkanet:6103', better: 'higher', stage: 'screening_result' },
        { ...m('finland', 73.5, '2024'), metric: 'sotkanet:6103', better: 'higher', stage: 'screening_result' },
      ],
    })
    expect(v.metrics[0].cells[0].vsFinland).toBe('worse')
  })
})
