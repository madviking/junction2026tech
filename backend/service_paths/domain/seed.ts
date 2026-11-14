// Parse and validate service-path seed files. Pure: callers pass file contents.
// seed/areas/<county>.yaml: one area's sources, doors, steps, screening, findings.
// seed/metrics.yaml: measured values for every area plus Finland.
// YAML keys are snake_case; records are camelCase. Errors are collected, never thrown.
import { parse } from 'yaml'
import {
  BARRIER_CODES,
  CANCERS,
  FACT_STATUSES,
  FINLAND,
  INFORMED_BY,
  METRIC_SCOPES,
  POINT_KINDS,
  ROUTE_CODES,
  STAGE_CODES,
  type Better,
  type Cancer,
  type FactStatus,
  type InformedBy,
  type MetricScope,
  type PointKind,
  type StageCode,
} from './stages'

export interface SeedSource {
  key: string
  url: string
  title: string
  publisher: string
  capturedOn: string
  brainRef: string | null
}

interface Checked {
  status: FactStatus
  verifiedOn: string | null
  source: string | null
}

export interface SeedPoint extends Checked {
  key: string
  kind: PointKind
  routes: string[]
  nameFi: string
  nameEn: string | null
  city: string | null
  phone: string | null
  hours: string | null
  contactNote: string | null
  callback: boolean | null
  walkIn: string | null
  digitalChannel: string | null
  digitalLogin: string | null
  serviceLanguages: string[] | null
  interpreterHow: string | null
  feeNote: string | null
  url: string | null
}

export interface SeedStep extends Checked {
  stage: StageCode
  point: string | null
  informedBy: InformedBy | null
  portal: string | null
  ifNothingHeard: string | null
}

export interface SeedScreening extends Checked {
  cancer: Cancer
  ages: string
  provider: string | null
  invitationChannel: string | null
  infoLanguages: string[] | null
  followupPoint: string | null
  selfSampling: boolean | null
}

export interface SeedFinding extends Checked {
  key: string
  stage: StageCode
  barrier: string | null
  finding: string
}

export interface AreaSeed {
  county: string
  name: string
  specialistProvider: string | null
  collaborationArea: string | null
  sotkanetRegionId: number | null
  sources: SeedSource[]
  points: SeedPoint[]
  steps: SeedStep[]
  screening: SeedScreening[]
  findings: SeedFinding[]
}

export interface SeedMetric {
  area: string
  stage: StageCode
  metric: string
  definition: string
  value: number
  unit: string
  period: string
  better: Better
  scope: MetricScope
  status: FactStatus
  source: string
}

export interface MetricsSeed {
  sources: SeedSource[]
  metrics: SeedMetric[]
}

type Raw = Record<string, unknown>

// Small typed readers that record an error and return a fallback.
class Reader {
  constructor(
    private readonly file: string,
    readonly errors: string[],
  ) {}

  err(where: string, msg: string): void {
    this.errors.push(`${this.file}: ${where}: ${msg}`)
  }

  str(r: Raw, field: string, where: string): string {
    const v = r[field]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
    this.err(where, `${field} is required`)
    return ''
  }

  opt(r: Raw, field: string): string | null {
    const v = r[field]
    if (v === undefined || v === null) return null
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return String(v).trim()
  }

  date(r: Raw, field: string, where: string, required: boolean): string | null {
    const v = this.opt(r, field)
    if (v === null) {
      if (required) this.err(where, `${field} is required`)
      return null
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) this.err(where, `${field} must be YYYY-MM-DD`)
    return v
  }

  bool(r: Raw, field: string, where: string): boolean | null {
    const v = r[field]
    if (v === undefined || v === null) return null
    if (typeof v === 'boolean') return v
    this.err(where, `${field} must be true, false or empty`)
    return null
  }

  list(r: Raw, field: string, where: string): string[] | null {
    const v = r[field]
    if (v === undefined || v === null) return null
    if (Array.isArray(v)) return v.map((x) => String(x))
    this.err(where, `${field} must be a list`)
    return null
  }

  code<T extends string>(value: string | null, allowed: readonly T[], label: string, where: string): T {
    if (value !== null && !allowed.includes(value as T)) this.err(where, `unknown ${label} "${value}"`)
    return value as T
  }

  rows(doc: Raw, field: string): Raw[] {
    const v = doc[field]
    if (v === undefined || v === null) return []
    if (!Array.isArray(v)) {
      this.err(field, 'must be a list')
      return []
    }
    return v.filter((x): x is Raw => typeof x === 'object' && x !== null)
  }
}

function load(text: string, r: Reader): Raw {
  try {
    const doc = parse(text) as unknown
    if (typeof doc === 'object' && doc !== null) return doc as Raw
    r.err('file', 'must be a YAML mapping')
  } catch (e) {
    r.err('file', `invalid YAML: ${(e as Error).message}`)
  }
  return {}
}

function readSources(doc: Raw, r: Reader): SeedSource[] {
  const raw = doc.sources
  if (raw === undefined || raw === null) return []
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    r.err('sources', 'must be a mapping of key → source')
    return []
  }
  return Object.entries(raw as Record<string, Raw>).map(([key, s]) => {
    const where = `sources.${key}`
    const url = r.str(s, 'url', where)
    if (url && !url.startsWith('https://')) r.err(where, 'url must start with https://')
    return {
      key,
      url,
      title: r.str(s, 'title', where),
      publisher: r.str(s, 'publisher', where),
      capturedOn: r.date(s, 'captured_on', where, true) ?? '',
      brainRef: r.opt(s, 'brain_ref'),
    }
  })
}

function readChecked(row: Raw, where: string, r: Reader, sourceKeys: Set<string>): Checked {
  const status = r.code(r.opt(row, 'status') ?? 'draft', FACT_STATUSES, 'status', where)
  const verifiedOn = r.date(row, 'verified_on', where, false)
  const source = r.opt(row, 'source')
  if (source !== null && !sourceKeys.has(source)) r.err(where, `unknown source "${source}"`)
  if (status === 'published' && source === null) r.err(where, 'published needs a source')
  return { status, verifiedOn, source }
}

function requireVerified(c: Checked, where: string, r: Reader): void {
  if (c.status === 'published' && c.verifiedOn === null) r.err(where, 'published needs verified_on')
}

export function parseAreaSeed(text: string, file: string): { seed: AreaSeed; errors: string[] } {
  const r = new Reader(file, [])
  const doc = load(text, r)
  const sources = readSources(doc, r)
  const sourceKeys = new Set(sources.map((s) => s.key))

  const points = r.rows(doc, 'points').map((p, i): SeedPoint => {
    const key = r.str(p, 'key', `points[${i}]`)
    const where = `points[${i}] "${key}"`
    const checked = readChecked(p, where, r, sourceKeys)
    requireVerified(checked, where, r)
    const routes = r.list(p, 'routes', where) ?? []
    if (routes.length === 0) r.err(where, 'routes needs at least one route code')
    for (const route of routes) r.code(route, ROUTE_CODES, 'route', where)
    return {
      key,
      kind: r.code(r.str(p, 'kind', where), POINT_KINDS, 'kind', where),
      routes,
      nameFi: r.str(p, 'name_fi', where),
      nameEn: r.opt(p, 'name_en'),
      city: r.opt(p, 'city'),
      phone: r.opt(p, 'phone'),
      hours: r.opt(p, 'hours'),
      contactNote: r.opt(p, 'contact_note'),
      callback: r.bool(p, 'callback', where),
      walkIn: r.opt(p, 'walk_in'),
      digitalChannel: r.opt(p, 'digital_channel'),
      digitalLogin: r.opt(p, 'digital_login'),
      serviceLanguages: r.list(p, 'service_languages', where),
      interpreterHow: r.opt(p, 'interpreter_how'),
      feeNote: r.opt(p, 'fee_note'),
      url: r.opt(p, 'url'),
      ...checked,
    }
  })
  const pointKeys = new Set<string>()
  for (const p of points) {
    if (pointKeys.has(p.key)) r.err('points', `duplicate point key "${p.key}"`)
    pointKeys.add(p.key)
  }
  const pointRef = (key: string | null, label: string, where: string) => {
    if (key !== null && !pointKeys.has(key)) r.err(where, `unknown ${label} "${key}"`)
    return key
  }

  const steps = r.rows(doc, 'steps').map((s, i): SeedStep => {
    const where = `steps[${i}]`
    const checked = readChecked(s, where, r, sourceKeys)
    requireVerified(checked, where, r)
    return {
      stage: r.code(r.str(s, 'stage', where), STAGE_CODES, 'stage', where),
      point: pointRef(r.opt(s, 'point'), 'point', where),
      informedBy: r.code(r.opt(s, 'informed_by'), INFORMED_BY, 'informed_by', where),
      portal: r.opt(s, 'portal'),
      ifNothingHeard: r.opt(s, 'if_nothing_heard'),
      ...checked,
    }
  })
  duplicates(steps.map((s) => s.stage), 'step stage', r)

  const screening = r.rows(doc, 'screening').map((s, i): SeedScreening => {
    const where = `screening[${i}]`
    const checked = readChecked(s, where, r, sourceKeys)
    requireVerified(checked, where, r)
    return {
      cancer: r.code(r.str(s, 'cancer', where), CANCERS, 'cancer', where),
      ages: r.str(s, 'ages', where),
      provider: r.opt(s, 'provider'),
      invitationChannel: r.opt(s, 'invitation_channel'),
      infoLanguages: r.list(s, 'info_languages', where),
      followupPoint: pointRef(r.opt(s, 'followup_point'), 'followup_point', where),
      selfSampling: r.bool(s, 'self_sampling', where),
      ...checked,
    }
  })
  duplicates(screening.map((s) => s.cancer), 'screening cancer', r)

  const findings = r.rows(doc, 'findings').map((f, i): SeedFinding => {
    const key = r.str(f, 'key', `findings[${i}]`)
    const where = `findings[${i}] "${key}"`
    const checked = readChecked(f, where, r, sourceKeys)
    if (checked.source === null) r.err(where, 'a finding needs a source')
    return {
      key,
      stage: r.code(r.str(f, 'stage', where), STAGE_CODES, 'stage', where),
      barrier: r.code(r.opt(f, 'barrier'), BARRIER_CODES, 'barrier', where),
      finding: r.str(f, 'finding', where),
      ...checked,
    }
  })
  duplicates(findings.map((f) => f.key), 'finding key', r)

  const region = doc.sotkanet_region_id
  if (region !== undefined && region !== null && typeof region !== 'number') r.err('sotkanet_region_id', 'must be a number')
  const county = r.str(doc, 'county', 'area')
  if (county && !/^[a-z0-9-]+$/.test(county)) r.err('county', 'must be kebab-case ascii')
  return {
    seed: {
      county,
      name: r.str(doc, 'name', 'area'),
      specialistProvider: r.opt(doc, 'specialist_provider'),
      collaborationArea: r.opt(doc, 'collaboration_area'),
      sotkanetRegionId: typeof region === 'number' ? region : null,
      sources,
      points,
      steps,
      screening,
      findings,
    },
    errors: r.errors,
  }
}

function duplicates(values: string[], label: string, r: Reader): void {
  const seen = new Set<string>()
  for (const v of values) {
    if (seen.has(v)) r.err(label, `duplicate ${label} "${v}"`)
    seen.add(v)
  }
}

export function parseMetricsSeed(text: string, file: string, areas: readonly string[]): { seed: MetricsSeed; errors: string[] } {
  const r = new Reader(file, [])
  const doc = load(text, r)
  const sources = readSources(doc, r)
  const sourceKeys = new Set(sources.map((s) => s.key))
  const known = new Set([...areas, FINLAND])
  const seen = new Set<string>()
  const metrics = r.rows(doc, 'metrics').map((m, i): SeedMetric => {
    const where = `metrics[${i}]`
    const area = r.str(m, 'area', where)
    if (area && !known.has(area)) r.err(where, `unknown area "${area}"`)
    const metric = r.str(m, 'metric', where)
    const period = r.str(m, 'period', where)
    const id = `${area} ${metric} ${period}`
    if (seen.has(id)) r.err(where, `duplicate metric ${id}`)
    seen.add(id)
    const value = m.value
    if (typeof value !== 'number' || !Number.isFinite(value)) r.err(where, 'value must be a number')
    const source = r.str(m, 'source', where)
    if (source && !sourceKeys.has(source)) r.err(where, `unknown source "${source}"`)
    return {
      area,
      stage: r.code(r.str(m, 'stage', where), STAGE_CODES, 'stage', where),
      metric,
      definition: r.str(m, 'definition', where),
      value: typeof value === 'number' ? value : 0,
      unit: r.str(m, 'unit', where),
      period,
      better: r.code(r.str(m, 'better', where), ['lower', 'higher'] as const, 'better', where),
      scope: r.code(r.str(m, 'scope', where), METRIC_SCOPES, 'scope', where),
      status: r.code(r.opt(m, 'status') ?? 'draft', FACT_STATUSES, 'status', where),
      source,
    }
  })
  return { seed: { sources, metrics }, errors: r.errors }
}
