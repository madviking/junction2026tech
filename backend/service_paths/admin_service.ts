// Admin rules for service paths: validate codes and references, write, audit.
// A row may become 'published' only with a source and a check date (verified_on).
import { APIError } from 'encore.dev/api'
import { admin } from '~encore/clients'
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
  type FactStatus,
} from './domain/stages'
import * as repo from './repository'
import * as write from './repository_admin'
import type { FindingInput, MetricInput, PointInput, ScreeningInput, StatusTarget, StepInput } from './repository_admin'
import { ensureSeeded, getArea, type AreaPath } from './service'

export interface SourceInput {
  url: string
  title: string
  publisher: string
  capturedOn: string
  brainRef: string | null
}

export interface SourceView {
  id: number
  url: string
  title: string
  publisher: string
  capturedOn: string
  brainRef: string | null
}

export interface AdminAreaView extends AreaPath {
  sources: SourceView[]
}

const bad = (msg: string) => APIError.invalidArgument(msg)

function oneOf(value: string | null, allowed: readonly string[], label: string): void {
  if (value !== null && !allowed.includes(value)) throw bad(`unknown ${label} "${value}"`)
}

function required(value: string, label: string): void {
  if (!value || !value.trim()) throw bad(`${label} is required`)
}

function date(value: string | null, label: string): void {
  if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw bad(`${label} must be YYYY-MM-DD`)
}

function checked(r: { status: FactStatus; verifiedOn: string | null; sourceId: number | null }): void {
  oneOf(r.status, FACT_STATUSES, 'status')
  date(r.verifiedOn, 'verifiedOn')
  if (r.status === 'published' && (r.sourceId === null || r.verifiedOn === null)) {
    throw bad('a published row needs a source and verifiedOn')
  }
}

async function knownCounty(county: string): Promise<void> {
  await ensureSeeded()
  if (!(await repo.listAreas()).some((a) => a.id === county)) throw APIError.notFound(`unknown area ${county}`)
}

async function audit(actor: string, action: string, target: string, detail: Record<string, string>): Promise<void> {
  await admin.recordAudit({ actor, action: `service_paths.${action}`, target, detail })
}

async function inTx<T>(fn: (tx: repo.Executor) => Promise<T>): Promise<T> {
  const tx = await repo.begin()
  try {
    const out = await fn(tx)
    await tx.commit()
    return out
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

export async function adminArea(id: string): Promise<AdminAreaView> {
  const [area, sources] = await Promise.all([getArea(id, { includeDrafts: true }), repo.listSources()])
  return { ...area, sources }
}

export async function savePoint(actor: string, p: PointInput): Promise<number> {
  await knownCounty(p.county)
  required(p.key, 'key')
  required(p.nameFi, 'nameFi')
  oneOf(p.kind, POINT_KINDS, 'kind')
  if (p.routes.length === 0) throw bad('routes needs at least one route code')
  for (const r of p.routes) oneOf(r, ROUTE_CODES, 'route')
  checked(p)
  const id = await inTx((tx) => write.savePoint(tx, p, actor))
  await audit(actor, 'point.save', `${p.county}/${p.key}`, { id: String(id), status: p.status })
  return id
}

export async function saveStep(actor: string, s: StepInput): Promise<void> {
  await knownCounty(s.county)
  oneOf(s.stage, STAGE_CODES, 'stage')
  oneOf(s.informedBy, INFORMED_BY, 'informedBy')
  checked(s)
  await inTx((tx) => write.saveStep(tx, s, actor))
  await audit(actor, 'step.save', `${s.county}/${s.stage}`, { status: s.status })
}

export async function saveScreening(actor: string, s: ScreeningInput): Promise<void> {
  await knownCounty(s.county)
  oneOf(s.cancer, CANCERS, 'cancer')
  required(s.ages, 'ages')
  checked(s)
  await inTx((tx) => write.saveScreening(tx, s, actor))
  await audit(actor, 'screening.save', `${s.county}/${s.cancer}`, { status: s.status })
}

export async function saveMetric(actor: string, m: MetricInput): Promise<void> {
  await ensureSeeded()
  if (m.area !== FINLAND) await knownCounty(m.area)
  oneOf(m.stage, STAGE_CODES, 'stage')
  oneOf(m.better, ['lower', 'higher'], 'better')
  oneOf(m.scope, METRIC_SCOPES, 'scope')
  oneOf(m.status, FACT_STATUSES, 'status')
  for (const [v, label] of [[m.metric, 'metric'], [m.definition, 'definition'], [m.unit, 'unit'], [m.period, 'period']] as const) required(v, label)
  if (!Number.isFinite(m.value)) throw bad('value must be a number')
  await inTx((tx) => write.saveMetric(tx, m, actor))
  await audit(actor, 'metric.save', `${m.area}/${m.metric}/${m.period}`, { value: String(m.value), status: m.status })
}

export async function saveFinding(actor: string, f: FindingInput): Promise<number> {
  await knownCounty(f.county)
  required(f.key, 'key')
  required(f.finding, 'finding')
  oneOf(f.stage, STAGE_CODES, 'stage')
  oneOf(f.barrier, BARRIER_CODES, 'barrier')
  if (f.sourceId === null) throw bad('a finding needs a source')
  checked(f)
  const id = await inTx((tx) => write.saveFinding(tx, f, actor))
  await audit(actor, 'finding.save', `${f.county}/${f.key}`, { id: String(id), status: f.status })
  return id
}

export async function addSource(actor: string, s: SourceInput): Promise<number> {
  if (!s.url.startsWith('https://')) throw bad('url must start with https://')
  required(s.title, 'title')
  required(s.publisher, 'publisher')
  date(s.capturedOn, 'capturedOn')
  await ensureSeeded()
  const id = await inTx((tx) => repo.ensureSource(tx, { key: '', ...s }))
  await audit(actor, 'source.add', s.url, { id: String(id) })
  return id
}

export async function setStatus(actor: string, target: StatusTarget, status: FactStatus, verify: boolean): Promise<void> {
  oneOf(status, FACT_STATUSES, 'status')
  await ensureSeeded()
  await inTx(async (tx) => {
    const row = await write.rowCheckable(tx, target)
    if (!row) throw APIError.notFound(`no ${target.kind} matches`)
    if (status === 'published' && (!row.hasSource || (row.verifiedOn === null && !verify))) {
      throw bad('a published row needs a source and a check date (pass verify)')
    }
    await write.setStatus(tx, target, status, verify, actor)
  })
  const ref = 'id' in target ? String(target.id) : `${target.county}/${'stage' in target ? target.stage : target.cancer}`
  await audit(actor, `${target.kind}.status`, ref, { status, verify: String(verify) })
}
