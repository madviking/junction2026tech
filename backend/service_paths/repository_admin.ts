// SQL for admin writes to sp_* tables. Rules and validation live in admin_service.ts.
import { json, type Executor } from './repository'
import type { Better, Cancer, FactStatus, InformedBy, MetricScope, PointKind, StageCode } from './domain/stages'

interface Checked {
  status: FactStatus
  verifiedOn: string | null
  sourceId: number | null
}

export interface PointInput extends Checked {
  id: number | null
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
}

export interface StepInput extends Checked {
  county: string
  stage: StageCode
  pointId: number | null
  informedBy: InformedBy | null
  portal: string | null
  ifNothingHeard: string | null
}

export interface ScreeningInput extends Checked {
  county: string
  cancer: Cancer
  ages: string
  provider: string | null
  invitationChannel: string | null
  infoLanguages: string[] | null
  followupPointId: number | null
  selfSampling: boolean | null
}

export interface MetricInput {
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
  sourceId: number
}

export interface FindingInput extends Checked {
  id: number | null
  county: string
  key: string
  stage: StageCode
  barrier: string | null
  finding: string
}

export async function savePoint(tx: Executor, p: PointInput, actor: string): Promise<number> {
  const routes = json(p.routes)
  const langs = json(p.serviceLanguages)
  if (p.id !== null) {
    const r = await tx.queryRow<{ id: string }>`
      UPDATE sp_points SET key = ${p.key}, kind = ${p.kind}, routes = ARRAY(SELECT jsonb_array_elements_text(${routes}::text::jsonb)),
        name_fi = ${p.nameFi}, name_en = ${p.nameEn}, city = ${p.city}, phone = ${p.phone}, hours = ${p.hours},
        contact_note = ${p.contactNote}, callback = ${p.callback}, walk_in = ${p.walkIn}, digital_channel = ${p.digitalChannel},
        digital_login = ${p.digitalLogin},
        service_languages = (SELECT array_agg(x) FROM jsonb_array_elements_text(${langs}::text::jsonb) x),
        interpreter_how = ${p.interpreterHow}, fee_note = ${p.feeNote}, url = ${p.url}, status = ${p.status},
        verified_on = ${p.verifiedOn}::date, source_id = ${p.sourceId}, updated_by = ${actor}, updated_at = now()
      WHERE id = ${p.id} AND county_id = ${p.county}
      RETURNING id::text AS id`
    if (!r) throw new Error(`point ${p.id} not found in ${p.county}`)
    return Number(r.id)
  }
  const r = await tx.queryRow<{ id: string }>`
    INSERT INTO sp_points (county_id, key, kind, routes, name_fi, name_en, city, phone, hours, contact_note, callback, walk_in,
      digital_channel, digital_login, service_languages, interpreter_how, fee_note, url, status, verified_on, source_id, sort, updated_by)
    VALUES (${p.county}, ${p.key}, ${p.kind}, ARRAY(SELECT jsonb_array_elements_text(${routes}::text::jsonb)), ${p.nameFi}, ${p.nameEn},
      ${p.city}, ${p.phone}, ${p.hours}, ${p.contactNote}, ${p.callback}, ${p.walkIn}, ${p.digitalChannel}, ${p.digitalLogin},
      (SELECT array_agg(x) FROM jsonb_array_elements_text(${langs}::text::jsonb) x), ${p.interpreterHow}, ${p.feeNote}, ${p.url},
      ${p.status}, ${p.verifiedOn}::date, ${p.sourceId},
      (SELECT coalesce(max(sort), -1) + 1 FROM sp_points WHERE county_id = ${p.county}), ${actor})
    RETURNING id::text AS id`
  return Number(r!.id)
}

export async function saveStep(tx: Executor, s: StepInput, actor: string): Promise<void> {
  await tx.exec`
    INSERT INTO sp_steps (county_id, stage, point_id, informed_by, portal, if_nothing_heard, status, verified_on, source_id, updated_by)
    VALUES (${s.county}, ${s.stage}, ${s.pointId}, ${s.informedBy}, ${s.portal}, ${s.ifNothingHeard}, ${s.status},
      ${s.verifiedOn}::date, ${s.sourceId}, ${actor})
    ON CONFLICT (county_id, stage) DO UPDATE SET point_id = EXCLUDED.point_id, informed_by = EXCLUDED.informed_by,
      portal = EXCLUDED.portal, if_nothing_heard = EXCLUDED.if_nothing_heard, status = EXCLUDED.status,
      verified_on = EXCLUDED.verified_on, source_id = EXCLUDED.source_id, updated_by = EXCLUDED.updated_by, updated_at = now()`
}

export async function saveScreening(tx: Executor, s: ScreeningInput, actor: string): Promise<void> {
  await tx.exec`
    INSERT INTO sp_screening (county_id, cancer, ages, provider, invitation_channel, info_languages, followup_point_id,
      self_sampling, status, verified_on, source_id, updated_by)
    VALUES (${s.county}, ${s.cancer}, ${s.ages}, ${s.provider}, ${s.invitationChannel},
      (SELECT array_agg(x) FROM jsonb_array_elements_text(${json(s.infoLanguages)}::text::jsonb) x), ${s.followupPointId},
      ${s.selfSampling}, ${s.status}, ${s.verifiedOn}::date, ${s.sourceId}, ${actor})
    ON CONFLICT (county_id, cancer) DO UPDATE SET ages = EXCLUDED.ages, provider = EXCLUDED.provider,
      invitation_channel = EXCLUDED.invitation_channel, info_languages = EXCLUDED.info_languages,
      followup_point_id = EXCLUDED.followup_point_id, self_sampling = EXCLUDED.self_sampling, status = EXCLUDED.status,
      verified_on = EXCLUDED.verified_on, source_id = EXCLUDED.source_id, updated_by = EXCLUDED.updated_by, updated_at = now()`
}

export async function saveMetric(tx: Executor, m: MetricInput, actor: string): Promise<void> {
  await tx.exec`
    INSERT INTO sp_metrics (area, stage, metric, definition, value, unit, period, better, scope, status, source_id, updated_by)
    VALUES (${m.area}, ${m.stage}, ${m.metric}, ${m.definition}, ${m.value}, ${m.unit}, ${m.period}, ${m.better}, ${m.scope},
      ${m.status}, ${m.sourceId}, ${actor})
    ON CONFLICT (area, metric, period) DO UPDATE SET stage = EXCLUDED.stage, definition = EXCLUDED.definition,
      value = EXCLUDED.value, unit = EXCLUDED.unit, better = EXCLUDED.better, scope = EXCLUDED.scope,
      status = EXCLUDED.status, source_id = EXCLUDED.source_id, updated_by = EXCLUDED.updated_by, updated_at = now()`
}

export async function saveFinding(tx: Executor, f: FindingInput, actor: string): Promise<number> {
  const r = await tx.queryRow<{ id: string }>`
    INSERT INTO sp_findings (county_id, key, stage, barrier, finding, status, verified_on, source_id, updated_by)
    VALUES (${f.county}, ${f.key}, ${f.stage}, ${f.barrier}, ${f.finding}, ${f.status}, ${f.verifiedOn}::date, ${f.sourceId}, ${actor})
    ON CONFLICT (county_id, key) DO UPDATE SET stage = EXCLUDED.stage, barrier = EXCLUDED.barrier, finding = EXCLUDED.finding,
      status = EXCLUDED.status, verified_on = EXCLUDED.verified_on, source_id = EXCLUDED.source_id,
      updated_by = EXCLUDED.updated_by, updated_at = now()
    RETURNING id::text AS id`
  return Number(r!.id)
}

// Status change by row kind. `verify` also stamps verified_on with today.
// Returns false when no row matched.
export type StatusTarget =
  | { kind: 'point'; id: number }
  | { kind: 'finding'; id: number }
  | { kind: 'metric'; id: number }
  | { kind: 'step'; county: string; stage: string }
  | { kind: 'screening'; county: string; cancer: string }

export async function setStatus(tx: Executor, t: StatusTarget, status: FactStatus, verify: boolean, actor: string): Promise<boolean> {
  let r: { n: string } | null = null
  switch (t.kind) {
    case 'point':
      r = await tx.queryRow<{ n: string }>`
        UPDATE sp_points SET status = ${status}, verified_on = CASE WHEN ${verify} THEN current_date ELSE verified_on END,
          updated_by = ${actor}, updated_at = now() WHERE id = ${t.id} RETURNING '1' AS n`
      break
    case 'finding':
      r = await tx.queryRow<{ n: string }>`
        UPDATE sp_findings SET status = ${status}, verified_on = CASE WHEN ${verify} THEN current_date ELSE verified_on END,
          updated_by = ${actor}, updated_at = now() WHERE id = ${t.id} RETURNING '1' AS n`
      break
    case 'metric':
      r = await tx.queryRow<{ n: string }>`
        UPDATE sp_metrics SET status = ${status}, updated_by = ${actor}, updated_at = now() WHERE id = ${t.id} RETURNING '1' AS n`
      break
    case 'step':
      r = await tx.queryRow<{ n: string }>`
        UPDATE sp_steps SET status = ${status}, verified_on = CASE WHEN ${verify} THEN current_date ELSE verified_on END,
          updated_by = ${actor}, updated_at = now() WHERE county_id = ${t.county} AND stage = ${t.stage} RETURNING '1' AS n`
      break
    case 'screening':
      r = await tx.queryRow<{ n: string }>`
        UPDATE sp_screening SET status = ${status}, verified_on = CASE WHEN ${verify} THEN current_date ELSE verified_on END,
          updated_by = ${actor}, updated_at = now() WHERE county_id = ${t.county} AND cancer = ${t.cancer} RETURNING '1' AS n`
      break
  }
  return r !== null
}

// A published row must carry a source and a check date; used before a status change.
export async function rowCheckable(tx: Executor, t: StatusTarget): Promise<{ hasSource: boolean; verifiedOn: string | null } | null> {
  switch (t.kind) {
    case 'point':
      return tx.queryRow<{ hasSource: boolean; verifiedOn: string | null }>`
        SELECT source_id IS NOT NULL AS "hasSource", to_char(verified_on, 'YYYY-MM-DD') AS "verifiedOn" FROM sp_points WHERE id = ${t.id}`
    case 'finding':
      return tx.queryRow<{ hasSource: boolean; verifiedOn: string | null }>`
        SELECT true AS "hasSource", to_char(verified_on, 'YYYY-MM-DD') AS "verifiedOn" FROM sp_findings WHERE id = ${t.id}`
    case 'metric':
      return tx.queryRow<{ hasSource: boolean; verifiedOn: string | null }>`
        SELECT true AS "hasSource", 'n/a' AS "verifiedOn" FROM sp_metrics WHERE id = ${t.id}`
    case 'step':
      return tx.queryRow<{ hasSource: boolean; verifiedOn: string | null }>`
        SELECT source_id IS NOT NULL AS "hasSource", to_char(verified_on, 'YYYY-MM-DD') AS "verifiedOn"
        FROM sp_steps WHERE county_id = ${t.county} AND stage = ${t.stage}`
    case 'screening':
      return tx.queryRow<{ hasSource: boolean; verifiedOn: string | null }>`
        SELECT source_id IS NOT NULL AS "hasSource", to_char(verified_on, 'YYYY-MM-DD') AS "verifiedOn"
        FROM sp_screening WHERE county_id = ${t.county} AND cancer = ${t.cancer}`
  }
}
