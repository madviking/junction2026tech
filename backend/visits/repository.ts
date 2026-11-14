// SQL for visits and visit_events. Only the visits service writes them.
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

// A transaction. Encore only allows `db` in direct calls, so every query runs in one.
export type Executor = Pick<SQLDatabase, 'queryRow' | 'queryAll' | 'exec'>

export type Actor = 'resident' | 'clinician'
export type EventKind = 'outcome' | 'symptoms' | 'clinician_answer' | 'clinician_move'

// Codes only, never free text.
export interface EventPayload {
  symptoms?: string[]
  lane?: string
  route?: string
  visitDate?: string
  // clinician_move: the stage the clinician moved the visit to.
  to?: string
}

export interface VisitRow {
  id: number
  lang: string
  county: string
  stage: string
  createdAt: Date
  expiresAt: Date
}

export interface EventRow {
  id: number
  at: Date
  actor: Actor
  kind: EventKind
  stage: string
  outcome: string
  payload: EventPayload
}

export interface NewEvent {
  actor: Actor
  kind: EventKind
  stage: string
  outcome: string
  payload: EventPayload
  at: Date
}

interface RawVisit {
  id: string | number
  lang: string
  county: string
  stage: string
  created_at: Date
  expires_at: Date
}

const toVisit = (r: RawVisit): VisitRow => ({
  id: Number(r.id),
  lang: r.lang,
  county: r.county,
  stage: r.stage,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
})

export async function inTx<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  const tx = await db.begin()
  try {
    const result = await fn(tx)
    await tx.commit()
    return result
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

export async function insertVisit(tx: Executor, v: { codeHash: string; lang: string; county: string; stage: string }): Promise<VisitRow> {
  const r = await tx.queryRow<RawVisit>`
    INSERT INTO visits (code_hash, lang, county, stage)
    VALUES (${v.codeHash}, ${v.lang}, ${v.county}, ${v.stage})
    RETURNING id, lang, county, stage, created_at, expires_at`
  return toVisit(r!)
}

// A live (not expired) visit by code hash; `lock` serializes concurrent taps on one visit.
export async function findVisit(tx: Executor, codeHash: string, lock: boolean): Promise<VisitRow | null> {
  const r = lock
    ? await tx.queryRow<RawVisit>`
        SELECT id, lang, county, stage, created_at, expires_at FROM visits
        WHERE code_hash = ${codeHash} AND expires_at > now() FOR UPDATE`
    : await tx.queryRow<RawVisit>`
        SELECT id, lang, county, stage, created_at, expires_at FROM visits
        WHERE code_hash = ${codeHash} AND expires_at > now()`
  return r ? toVisit(r) : null
}

export async function updateVisit(tx: Executor, id: number, v: { lang: string; stage: string }): Promise<void> {
  await tx.exec`UPDATE visits SET lang = ${v.lang}, stage = ${v.stage} WHERE id = ${id}`
}

export async function deleteVisit(tx: Executor, id: number): Promise<void> {
  await tx.exec`DELETE FROM visits WHERE id = ${id}`
}

export async function listEvents(tx: Executor, visitId: number): Promise<EventRow[]> {
  const rows = await tx.queryAll<{
    id: string | number
    at: Date
    actor: Actor
    kind: EventKind
    stage: string
    outcome: string
    payload: EventPayload | string
  }>`
    SELECT id, at, actor, kind, stage, outcome, payload FROM visit_events
    WHERE visit_id = ${visitId} ORDER BY id`
  return rows.map((r) => ({
    id: Number(r.id),
    at: r.at,
    actor: r.actor,
    kind: r.kind,
    stage: r.stage,
    outcome: r.outcome,
    payload: typeof r.payload === 'string' ? (JSON.parse(r.payload) as EventPayload) : r.payload,
  }))
}

export async function insertEvent(tx: Executor, visitId: number, e: NewEvent): Promise<void> {
  await tx.exec`
    INSERT INTO visit_events (visit_id, at, actor, kind, stage, outcome, payload)
    VALUES (${visitId}, ${e.at}, ${e.actor}, ${e.kind}, ${e.stage}, ${e.outcome}, ${JSON.stringify(e.payload)}::jsonb)`
}

export interface StageCount {
  lang: string
  stage: string
  count: number
}

export interface OutcomeCount extends StageCount {
  outcome: string
}

// Anonymous aggregates for one county: no codes, no timestamps.
export async function countyCounts(tx: Executor, county: string): Promise<{ total: number; byStage: StageCount[]; byOutcome: OutcomeCount[] }> {
  const total = await tx.queryRow<{ n: number }>`
    SELECT count(*)::int AS n FROM visits WHERE county = ${county} AND expires_at > now()`
  const byStage = await tx.queryAll<StageCount>`
    SELECT lang, stage, count(*)::int AS count FROM visits
    WHERE county = ${county} AND expires_at > now()
    GROUP BY lang, stage ORDER BY lang, stage`
  const byOutcome = await tx.queryAll<OutcomeCount>`
    SELECT v.lang, e.stage, e.outcome, count(*)::int AS count
    FROM visit_events e JOIN visits v ON v.id = e.visit_id
    WHERE v.county = ${county} AND v.expires_at > now() AND e.kind = 'outcome'
    GROUP BY v.lang, e.stage, e.outcome ORDER BY v.lang, e.stage, e.outcome`
  return { total: total?.n ?? 0, byStage, byOutcome }
}
