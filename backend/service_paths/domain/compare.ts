// Area × stage comparison for the report and the admin Compare tab. Pure.
// Metric rows compare each area against Finland in the latest Finland period; an area
// without that period shows its latest older value, never compared. Missing data stays
// null so the UI can say "not published" instead of showing a zero.
import { FINLAND, STAGES, type Better, type InformedBy, type MetricScope, type Stage, type StageCode } from './stages'

export interface SourceRef {
  id: number
  url: string
  title: string
  publisher: string
  capturedOn: string
}

export interface MetricFact {
  area: string
  stage: StageCode
  metric: string
  definition: string
  value: number
  unit: string
  period: string
  better: Better
  scope: MetricScope
  source: SourceRef
}

export interface StepFact {
  county: string
  stage: StageCode
  pointName: string | null
  informedBy: InformedBy | null
  ifNothingHeard: string | null
  source: SourceRef | null
}

export interface CompareInput {
  areas: { id: string; name: string }[]
  metrics: MetricFact[]
  steps: StepFact[]
}

export type VsFinland = 'better' | 'worse' | 'same'

export interface MetricCell {
  area: string
  value: number | null
  period: string | null
  scope: MetricScope | null
  vsFinland: VsFinland | null
  source: SourceRef | null
}

export interface MetricRow {
  metric: string
  stage: StageCode
  definition: string
  unit: string
  better: Better
  period: string
  finland: MetricCell
  cells: MetricCell[]
}

export interface StepCell {
  area: string
  pointName: string | null
  informedBy: InformedBy | null
  ifNothingHeard: string | null
  source: SourceRef | null
}

export interface StepRow {
  stage: StageCode
  cells: StepCell[]
}

export interface CompareView {
  areas: { id: string; name: string }[]
  stages: Stage[]
  metrics: MetricRow[]
  steps: StepRow[]
}

const stageIndex = (code: string) => STAGES.findIndex((s) => s.code === code)

function emptyCell(area: string): MetricCell {
  return { area, value: null, period: null, scope: null, vsFinland: null, source: null }
}

function cellFor(area: string, facts: MetricFact[], period: string): MetricCell {
  const own = facts.filter((f) => f.area === area)
  const exact = own.find((f) => f.period === period)
  const latest = exact ?? own.filter((f) => f.period < period).sort((a, b) => b.period.localeCompare(a.period))[0]
  if (!latest) return emptyCell(area)
  return { area, value: latest.value, period: latest.period, scope: latest.scope, vsFinland: null, source: latest.source }
}

function compare(value: number, base: number, better: Better): VsFinland {
  if (value === base) return 'same'
  return (value < base) === (better === 'lower') ? 'better' : 'worse'
}

export function buildCompare(input: CompareInput): CompareView {
  const byMetric = new Map<string, MetricFact[]>()
  for (const f of input.metrics) byMetric.set(f.metric, [...(byMetric.get(f.metric) ?? []), f])

  const metrics: MetricRow[] = [...byMetric.entries()].map(([metric, facts]) => {
    const periods = facts.filter((f) => f.area === FINLAND).map((f) => f.period)
    const period = (periods.length ? periods : facts.map((f) => f.period)).sort().at(-1)!
    const first = facts[0]
    const finland = cellFor(FINLAND, facts, period)
    const cells = input.areas.map((a) => {
      const c = cellFor(a.id, facts, period)
      if (c.value !== null && c.period === period && finland.value !== null && finland.period === period) {
        c.vsFinland = compare(c.value, finland.value, first.better)
      }
      return c
    })
    return { metric, stage: first.stage, definition: first.definition, unit: first.unit, better: first.better, period, finland, cells }
  })
  metrics.sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage) || a.metric.localeCompare(b.metric))

  const steps: StepRow[] = STAGES.map((s) => ({
    stage: s.code,
    cells: input.areas.map((a): StepCell => {
      const f = input.steps.find((x) => x.county === a.id && x.stage === s.code)
      return f
        ? { area: a.id, pointName: f.pointName, informedBy: f.informedBy, ifNothingHeard: f.ifNothingHeard, source: f.source }
        : { area: a.id, pointName: null, informedBy: null, ifNothingHeard: null, source: null }
    }),
  })).filter((row) => row.cells.some((c) => c.pointName !== null || c.informedBy !== null || c.ifNothingHeard !== null))

  return { areas: input.areas, stages: [...STAGES], metrics, steps }
}
