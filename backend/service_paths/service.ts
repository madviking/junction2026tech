// Service paths: seed sync, public area views and the comparison matrix.
// Public views show only published rows. Stage limits come from domain/stages.ts and are
// the same for every area (design rule 1).
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { buildCompare, type CompareView } from './domain/compare'
import { STAGES, type FactStatus, type Stage } from './domain/stages'
import * as repo from './repository'
import type { AreaRow, FindingRow, MetricRow, PointRow, ScreeningRow, StepRow } from './repository'
import { loadSeed } from './seed/load'

export const SEED_ACTOR = 'seed'

let seeded: Promise<void> | null = null

// Inserts seed rows that are missing; never overwrites rows (admin edits win).
export function ensureSeeded(): Promise<void> {
  if (!seeded) {
    seeded = syncSeed().catch((err) => {
      seeded = null
      throw err
    })
  }
  return seeded
}

async function syncSeed(): Promise<void> {
  const seed = loadSeed()
  if (seed.errors.length) {
    log.error('service_paths seed invalid', { errors: seed.errors.slice(0, 20).join(' | ') })
    throw APIError.internal(`service_paths seed invalid: ${seed.errors[0]}`)
  }
  const tx = await repo.begin()
  try {
    for (const area of seed.areas) {
      const ids = new Map<string, number>()
      for (const s of area.sources) ids.set(s.key, await repo.ensureSource(tx, s))
      await repo.seedArea(tx, area, ids, SEED_ACTOR)
    }
    const ids = new Map<string, number>()
    for (const s of seed.metrics.sources) ids.set(s.key, await repo.ensureSource(tx, s))
    for (const m of seed.metrics.metrics) await repo.seedMetric(tx, m, ids.get(m.source)!, SEED_ACTOR)
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

export interface StatusCounts {
  draft: number
  published: number
  disputed: number
  stale: number
}

export interface AreaSummary extends AreaRow {
  counts: StatusCounts
}

export interface AreaPath {
  area: AreaRow
  stages: Stage[]
  points: PointRow[]
  steps: StepRow[]
  screening: ScreeningRow[]
  metrics: MetricRow[]
  findings: FindingRow[]
}

export async function listAreas(): Promise<AreaSummary[]> {
  await ensureSeeded()
  const [areas, counts] = await Promise.all([repo.listAreas(), repo.statusCounts()])
  return areas.map((a) => {
    const c: StatusCounts = { draft: 0, published: 0, disputed: 0, stale: 0 }
    for (const r of counts) if (r.county === a.id) c[r.status] = r.count
    return { ...a, counts: c }
  })
}

const published = <T extends { status: FactStatus }>(rows: T[]) => rows.filter((r) => r.status === 'published')

// includeDrafts: admin view. route: only doors serving that access route.
export async function getArea(id: string, opts: { route?: string | null; includeDrafts?: boolean } = {}): Promise<AreaPath> {
  await ensureSeeded()
  const area = (await repo.listAreas()).find((a) => a.id === id)
  if (!area) throw APIError.notFound(`unknown area ${id}`)
  const [points, steps, screening, metrics, findings] = await Promise.all([
    repo.listPoints(id),
    repo.listSteps(id),
    repo.listScreening(id),
    repo.listMetrics(id),
    repo.listFindings(id),
  ])
  const keep = <T extends { status: FactStatus }>(rows: T[]) => (opts.includeDrafts ? rows : published(rows))
  const route = opts.route ?? null
  return {
    area,
    stages: [...STAGES],
    points: keep(points).filter((p) => route === null || p.routes.includes(route)),
    steps: keep(steps),
    screening: keep(screening),
    metrics: keep(metrics),
    findings: keep(findings),
  }
}

export async function compare(): Promise<CompareView> {
  await ensureSeeded()
  const [areas, metrics, steps] = await Promise.all([repo.listAreas(), repo.listMetrics(null), repo.listSteps(null)])
  return buildCompare({
    areas: areas.map((a) => ({ id: a.id, name: a.name })),
    metrics: published(metrics),
    steps: published(steps).map((s) => ({
      county: s.county,
      stage: s.stage,
      pointName: s.pointName,
      informedBy: s.informedBy,
      ifNothingHeard: s.ifNothingHeard,
      source: s.source,
    })),
  })
}
