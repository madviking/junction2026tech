// SQL for sp_* tables (migration 10): reads and seed inserts. Only service_paths uses them.
// Arrays travel as JSON text (jsonb_array_elements_text / to_jsonb) so no driver array
// support is needed. Dates are read as YYYY-MM-DD text.
import { SQLDatabase } from 'encore.dev/storage/sqldb'
import type { SourceRef } from './domain/compare'
import type { AreaSeed, SeedMetric, SeedSource } from './domain/seed'
import type { Better, Cancer, FactStatus, InformedBy, MetricScope, PointKind, StageCode } from './domain/stages'

const db = SQLDatabase.named('silta')

// A transaction. Encore only allows `db` in direct calls, so writes run in one.
export type Executor = Pick<SQLDatabase, 'queryRow' | 'queryAll' | 'exec'>

export const json = (v: unknown): string | null => (v === null || v === undefined ? null : JSON.stringify(v))

export interface AreaRow {
  id: string
  name: string
  specialistProvider: string | null
  collaborationArea: string | null
  sotkanetRegionId: number | null
}

export interface PointRow {
  id: number
  county: string
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
  status: FactStatus
  verifiedOn: string | null
  source: SourceRef | null
  updatedBy: string
}

export interface StepRow {
  county: string
  stage: StageCode
  pointId: number | null
  pointName: string | null
  informedBy: InformedBy | null
  portal: string | null
  ifNothingHeard: string | null
  status: FactStatus
  verifiedOn: string | null
  source: SourceRef | null
}

export interface ScreeningRow {
  county: string
  cancer: Cancer
  ages: string
  provider: string | null
  invitationChannel: string | null
  infoLanguages: string[] | null
  followupPointId: number | null
  followupPointName: string | null
  selfSampling: boolean | null
  status: FactStatus
  verifiedOn: string | null
  source: SourceRef | null
}

export interface MetricRow {
  id: number
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
  source: SourceRef
}

export interface FindingRow {
  id: number
  county: string
  key: string
  stage: StageCode
  barrier: string | null
  finding: string
  status: FactStatus
  verifiedOn: string | null
  source: SourceRef
}

type RawSource = { source_id: string | null; source_url: string | null; source_title: string | null; source_publisher: string | null; source_captured_on: string | null }

function sourceOf(r: RawSource): SourceRef | null {
  if (r.source_id === null) return null
  return { id: Number(r.source_id), url: r.source_url ?? '', title: r.source_title ?? '', publisher: r.source_publisher ?? '', capturedOn: r.source_captured_on ?? '' }
}

// ---------- reads ----------

export async function listAreas(): Promise<AreaRow[]> {
  const rows: AreaRow[] = []
  for await (const r of db.query<{ id: string; name: string; specialist_provider: string | null; collaboration_area: string | null; sotkanet_region_id: number | null }>`
    SELECT c.id, c.name, a.specialist_provider, a.collaboration_area, a.sotkanet_region_id
    FROM sp_areas a JOIN counties c ON c.id = a.county_id ORDER BY c.name`) {
    rows.push({ id: r.id, name: r.name, specialistProvider: r.specialist_provider, collaborationArea: r.collaboration_area, sotkanetRegionId: r.sotkanet_region_id })
  }
  return rows
}

export async function statusCounts(): Promise<{ county: string; status: FactStatus; count: number }[]> {
  return (
    await db.queryAll<{ county: string; status: FactStatus; count: string }>`
      SELECT county_id AS county, status, count(*)::text AS count FROM (
        SELECT county_id, status FROM sp_points
        UNION ALL SELECT county_id, status FROM sp_steps
        UNION ALL SELECT county_id, status FROM sp_screening
        UNION ALL SELECT county_id, status FROM sp_findings
      ) x GROUP BY county_id, status ORDER BY county_id, status`
  ).map((r) => ({ ...r, count: Number(r.count) }))
}

export async function listPoints(county: string | null): Promise<PointRow[]> {
  const rows = await db.queryAll<RawSource & Record<string, unknown>>`
    SELECT p.id::text AS id, p.county_id, p.key, p.kind, to_jsonb(p.routes) AS routes, p.name_fi, p.name_en, p.city,
           p.phone, p.hours, p.contact_note, p.callback, p.walk_in, p.digital_channel, p.digital_login,
           to_jsonb(p.service_languages) AS service_languages, p.interpreter_how, p.fee_note, p.url, p.status,
           to_char(p.verified_on, 'YYYY-MM-DD') AS verified_on, p.updated_by,
           s.id::text AS source_id, s.url AS source_url, s.title AS source_title, s.publisher AS source_publisher,
           to_char(s.captured_on, 'YYYY-MM-DD') AS source_captured_on
    FROM sp_points p LEFT JOIN sp_sources s ON s.id = p.source_id
    WHERE ${county}::text IS NULL OR p.county_id = ${county}
    ORDER BY p.county_id, p.sort, p.id`
  return rows.map((r) => ({
    id: Number(r.id),
    county: r.county_id as string,
    key: r.key as string,
    kind: r.kind as PointKind,
    routes: r.routes as string[],
    nameFi: r.name_fi as string,
    nameEn: r.name_en as string | null,
    city: r.city as string | null,
    phone: r.phone as string | null,
    hours: r.hours as string | null,
    contactNote: r.contact_note as string | null,
    callback: r.callback as boolean | null,
    walkIn: r.walk_in as string | null,
    digitalChannel: r.digital_channel as string | null,
    digitalLogin: r.digital_login as string | null,
    serviceLanguages: r.service_languages as string[] | null,
    interpreterHow: r.interpreter_how as string | null,
    feeNote: r.fee_note as string | null,
    url: r.url as string | null,
    status: r.status as FactStatus,
    verifiedOn: r.verified_on as string | null,
    source: sourceOf(r),
    updatedBy: r.updated_by as string,
  }))
}

export async function listSteps(county: string | null): Promise<StepRow[]> {
  const rows = await db.queryAll<RawSource & Record<string, unknown>>`
    SELECT st.county_id, st.stage, st.point_id::text AS point_id, p.name_fi AS point_name, st.informed_by, st.portal,
           st.if_nothing_heard, st.status, to_char(st.verified_on, 'YYYY-MM-DD') AS verified_on,
           s.id::text AS source_id, s.url AS source_url, s.title AS source_title, s.publisher AS source_publisher,
           to_char(s.captured_on, 'YYYY-MM-DD') AS source_captured_on
    FROM sp_steps st LEFT JOIN sp_points p ON p.id = st.point_id LEFT JOIN sp_sources s ON s.id = st.source_id
    WHERE ${county}::text IS NULL OR st.county_id = ${county}
    ORDER BY st.county_id, st.stage`
  return rows.map((r) => ({
    county: r.county_id as string,
    stage: r.stage as StageCode,
    pointId: r.point_id === null ? null : Number(r.point_id),
    pointName: r.point_name as string | null,
    informedBy: r.informed_by as InformedBy | null,
    portal: r.portal as string | null,
    ifNothingHeard: r.if_nothing_heard as string | null,
    status: r.status as FactStatus,
    verifiedOn: r.verified_on as string | null,
    source: sourceOf(r),
  }))
}

export async function listScreening(county: string | null): Promise<ScreeningRow[]> {
  const rows = await db.queryAll<RawSource & Record<string, unknown>>`
    SELECT sc.county_id, sc.cancer, sc.ages, sc.provider, sc.invitation_channel, to_jsonb(sc.info_languages) AS info_languages,
           sc.followup_point_id::text AS followup_point_id, p.name_fi AS followup_point_name, sc.self_sampling, sc.status,
           to_char(sc.verified_on, 'YYYY-MM-DD') AS verified_on,
           s.id::text AS source_id, s.url AS source_url, s.title AS source_title, s.publisher AS source_publisher,
           to_char(s.captured_on, 'YYYY-MM-DD') AS source_captured_on
    FROM sp_screening sc LEFT JOIN sp_points p ON p.id = sc.followup_point_id LEFT JOIN sp_sources s ON s.id = sc.source_id
    WHERE ${county}::text IS NULL OR sc.county_id = ${county}
    ORDER BY sc.county_id, sc.cancer`
  return rows.map((r) => ({
    county: r.county_id as string,
    cancer: r.cancer as Cancer,
    ages: r.ages as string,
    provider: r.provider as string | null,
    invitationChannel: r.invitation_channel as string | null,
    infoLanguages: r.info_languages as string[] | null,
    followupPointId: r.followup_point_id === null ? null : Number(r.followup_point_id),
    followupPointName: r.followup_point_name as string | null,
    selfSampling: r.self_sampling as boolean | null,
    status: r.status as FactStatus,
    verifiedOn: r.verified_on as string | null,
    source: sourceOf(r),
  }))
}

export async function listMetrics(area: string | null): Promise<MetricRow[]> {
  const rows = await db.queryAll<RawSource & Record<string, unknown>>`
    SELECT m.id::text AS id, m.area, m.stage, m.metric, m.definition, m.value::text AS value, m.unit, m.period, m.better,
           m.scope, m.status,
           s.id::text AS source_id, s.url AS source_url, s.title AS source_title, s.publisher AS source_publisher,
           to_char(s.captured_on, 'YYYY-MM-DD') AS source_captured_on
    FROM sp_metrics m JOIN sp_sources s ON s.id = m.source_id
    WHERE ${area}::text IS NULL OR m.area = ${area}
    ORDER BY m.metric, m.area, m.period`
  return rows.map((r) => ({
    id: Number(r.id),
    area: r.area as string,
    stage: r.stage as StageCode,
    metric: r.metric as string,
    definition: r.definition as string,
    value: Number(r.value),
    unit: r.unit as string,
    period: r.period as string,
    better: r.better as Better,
    scope: r.scope as MetricScope,
    status: r.status as FactStatus,
    source: sourceOf(r) as SourceRef,
  }))
}

export async function listFindings(county: string | null): Promise<FindingRow[]> {
  const rows = await db.queryAll<RawSource & Record<string, unknown>>`
    SELECT f.id::text AS id, f.county_id, f.key, f.stage, f.barrier, f.finding, f.status,
           to_char(f.verified_on, 'YYYY-MM-DD') AS verified_on,
           s.id::text AS source_id, s.url AS source_url, s.title AS source_title, s.publisher AS source_publisher,
           to_char(s.captured_on, 'YYYY-MM-DD') AS source_captured_on
    FROM sp_findings f JOIN sp_sources s ON s.id = f.source_id
    WHERE ${county}::text IS NULL OR f.county_id = ${county}
    ORDER BY f.county_id, f.id`
  return rows.map((r) => ({
    id: Number(r.id),
    county: r.county_id as string,
    key: r.key as string,
    stage: r.stage as StageCode,
    barrier: r.barrier as string | null,
    finding: r.finding as string,
    status: r.status as FactStatus,
    verifiedOn: r.verified_on as string | null,
    source: sourceOf(r) as SourceRef,
  }))
}

export async function listSources(): Promise<(SourceRef & { brainRef: string | null })[]> {
  return (
    await db.queryAll<{ id: string; url: string; title: string; publisher: string; captured_on: string; brain_ref: string | null }>`
      SELECT id::text AS id, url, title, publisher, to_char(captured_on, 'YYYY-MM-DD') AS captured_on, brain_ref
      FROM sp_sources ORDER BY publisher, title`
  ).map((r) => ({ id: Number(r.id), url: r.url, title: r.title, publisher: r.publisher, capturedOn: r.captured_on, brainRef: r.brain_ref }))
}

// ---------- seed: insert what is missing, never overwrite ----------

export async function ensureSource(tx: Executor, s: SeedSource): Promise<number> {
  const r = await tx.queryRow<{ id: string }>`
    INSERT INTO sp_sources (url, title, publisher, captured_on, brain_ref)
    VALUES (${s.url}, ${s.title}, ${s.publisher}, ${s.capturedOn}::date, ${s.brainRef})
    ON CONFLICT (url) DO UPDATE SET url = EXCLUDED.url
    RETURNING id::text AS id`
  return Number(r!.id)
}

export async function seedArea(tx: Executor, a: AreaSeed, sourceIds: Map<string, number>, actor: string): Promise<void> {
  const src = (key: string | null) => (key === null ? null : (sourceIds.get(key) ?? null))
  await tx.exec`
    INSERT INTO sp_areas (county_id, specialist_provider, collaboration_area, sotkanet_region_id)
    VALUES (${a.county}, ${a.specialistProvider}, ${a.collaborationArea}, ${a.sotkanetRegionId})
    ON CONFLICT (county_id) DO NOTHING`
  for (const [i, p] of a.points.entries()) {
    await tx.exec`
      INSERT INTO sp_points (county_id, key, kind, routes, name_fi, name_en, city, phone, hours, contact_note, callback,
        walk_in, digital_channel, digital_login, service_languages, interpreter_how, fee_note, url, status, verified_on,
        source_id, sort, updated_by)
      VALUES (${a.county}, ${p.key}, ${p.kind}, ARRAY(SELECT jsonb_array_elements_text(${json(p.routes)}::text::jsonb)),
        ${p.nameFi}, ${p.nameEn}, ${p.city}, ${p.phone}, ${p.hours}, ${p.contactNote}, ${p.callback}, ${p.walkIn},
        ${p.digitalChannel}, ${p.digitalLogin}, (SELECT array_agg(x) FROM jsonb_array_elements_text(${json(p.serviceLanguages)}::text::jsonb) x),
        ${p.interpreterHow}, ${p.feeNote}, ${p.url}, ${p.status}, ${p.verifiedOn}::date, ${src(p.source)}, ${i}, ${actor})
      ON CONFLICT (county_id, key) DO NOTHING`
  }
  const pointId = async (key: string | null): Promise<number | null> => {
    if (key === null) return null
    const r = await tx.queryRow<{ id: string }>`SELECT id::text AS id FROM sp_points WHERE county_id = ${a.county} AND key = ${key}`
    return r ? Number(r.id) : null
  }
  for (const s of a.steps) {
    await tx.exec`
      INSERT INTO sp_steps (county_id, stage, point_id, informed_by, portal, if_nothing_heard, status, verified_on, source_id, updated_by)
      VALUES (${a.county}, ${s.stage}, ${await pointId(s.point)}, ${s.informedBy}, ${s.portal}, ${s.ifNothingHeard},
        ${s.status}, ${s.verifiedOn}::date, ${src(s.source)}, ${actor})
      ON CONFLICT (county_id, stage) DO NOTHING`
  }
  for (const s of a.screening) {
    await tx.exec`
      INSERT INTO sp_screening (county_id, cancer, ages, provider, invitation_channel, info_languages, followup_point_id,
        self_sampling, status, verified_on, source_id, updated_by)
      VALUES (${a.county}, ${s.cancer}, ${s.ages}, ${s.provider}, ${s.invitationChannel},
        (SELECT array_agg(x) FROM jsonb_array_elements_text(${json(s.infoLanguages)}::text::jsonb) x),
        ${await pointId(s.followupPoint)}, ${s.selfSampling}, ${s.status}, ${s.verifiedOn}::date, ${src(s.source)}, ${actor})
      ON CONFLICT (county_id, cancer) DO NOTHING`
  }
  for (const f of a.findings) {
    await tx.exec`
      INSERT INTO sp_findings (county_id, key, stage, barrier, finding, status, verified_on, source_id, updated_by)
      VALUES (${a.county}, ${f.key}, ${f.stage}, ${f.barrier}, ${f.finding}, ${f.status}, ${f.verifiedOn}::date,
        ${src(f.source)}, ${actor})
      ON CONFLICT (county_id, key) DO NOTHING`
  }
}

export async function seedMetric(tx: Executor, m: SeedMetric, sourceId: number, actor: string): Promise<void> {
  await tx.exec`
    INSERT INTO sp_metrics (area, stage, metric, definition, value, unit, period, better, scope, status, source_id, updated_by)
    VALUES (${m.area}, ${m.stage}, ${m.metric}, ${m.definition}, ${m.value}, ${m.unit}, ${m.period}, ${m.better},
      ${m.scope}, ${m.status}, ${sourceId}, ${actor})
    ON CONFLICT (area, metric, period) DO NOTHING`
}

export async function begin() {
  return db.begin()
}
