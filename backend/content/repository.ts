// SQL for content_releases and content_live. Only the content service writes them.
import { SQLDatabase } from 'encore.dev/storage/sqldb'
import type { ContentDoc } from '../care_paths/domain/types'

const db = SQLDatabase.named('silta')

// A transaction. Encore only allows `db` in direct calls, so every query runs in one.
export type Executor = Pick<SQLDatabase, 'queryRow' | 'queryAll' | 'exec'>

export interface ReleaseRow {
  id: number
  version: number | null
  status: 'draft' | 'published'
  seedFingerprint: string | null
  basedOn: number | null
  note: string | null
  createdBy: string
  createdAt: Date
  publishedAt: Date | null
}

export interface ReleaseWithDoc extends ReleaseRow {
  doc: ContentDoc
}

interface RawRow {
  id: string | number
  version: number | null
  status: 'draft' | 'published'
  seed_fingerprint: string | null
  based_on: string | number | null
  note: string | null
  created_by: string
  created_at: Date
  published_at: Date | null
  doc?: string
}

const toRow = (r: RawRow): ReleaseRow => ({
  id: Number(r.id),
  version: r.version,
  status: r.status,
  seedFingerprint: r.seed_fingerprint,
  basedOn: r.based_on === null ? null : Number(r.based_on),
  note: r.note,
  createdBy: r.created_by,
  createdAt: r.created_at,
  publishedAt: r.published_at,
})
const withDoc = (r: RawRow): ReleaseWithDoc => ({ ...toRow(r), doc: JSON.parse(r.doc!) as ContentDoc })

// Runs fn in a transaction.
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

// Runs fn in a transaction holding the content advisory lock, so seeding and
// publishing never race (also across processes).
export function inLock<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  return inTx(async (tx) => {
    await tx.exec`SELECT pg_advisory_xact_lock(77001)`
    return fn(tx)
  })
}

export async function liveReleaseId(ex: Executor): Promise<number | null> {
  const row = await ex.queryRow<{ release_id: string | number }>`SELECT release_id FROM content_live WHERE id`
  return row ? Number(row.release_id) : null
}

export async function getRelease(ex: Executor, id: number): Promise<ReleaseWithDoc | null> {
  const row = await ex.queryRow<RawRow>`SELECT * FROM content_releases WHERE id = ${id}`
  return row ? withDoc(row) : null
}

export async function getByVersion(ex: Executor, version: number): Promise<ReleaseRow | null> {
  const row = await ex.queryRow<RawRow>`
    SELECT id, version, status, seed_fingerprint, based_on, note, created_by, created_at, published_at
    FROM content_releases WHERE version = ${version}`
  return row ? toRow(row) : null
}

export async function getDraft(ex: Executor): Promise<ReleaseWithDoc | null> {
  const row = await ex.queryRow<RawRow>`SELECT * FROM content_releases WHERE status = 'draft'`
  return row ? withDoc(row) : null
}

export async function listPublished(ex: Executor): Promise<ReleaseRow[]> {
  const rows = await ex.queryAll<RawRow>`
    SELECT id, version, status, seed_fingerprint, based_on, note, created_by, created_at, published_at
    FROM content_releases WHERE status = 'published' ORDER BY version DESC`
  return rows.map(toRow)
}

export async function insertPublished(
  ex: Executor,
  r: { doc: ContentDoc; createdBy: string; note: string | null; seedFingerprint: string | null; basedOn: number | null },
): Promise<ReleaseRow> {
  const row = await ex.queryRow<RawRow>`
    INSERT INTO content_releases (version, status, doc, seed_fingerprint, based_on, note, created_by, published_at)
    VALUES (
      (SELECT COALESCE(MAX(version), 0) + 1 FROM content_releases),
      'published', ${JSON.stringify(r.doc)}, ${r.seedFingerprint}, ${r.basedOn}, ${r.note}, ${r.createdBy}, now()
    )
    RETURNING id, version, status, seed_fingerprint, based_on, note, created_by, created_at, published_at`
  return toRow(row!)
}

export async function setLive(ex: Executor, releaseId: number, by: string): Promise<void> {
  await ex.exec`
    INSERT INTO content_live (id, release_id, updated_by) VALUES (true, ${releaseId}, ${by})
    ON CONFLICT (id) DO UPDATE SET release_id = EXCLUDED.release_id, updated_by = EXCLUDED.updated_by, updated_at = now()`
}

export async function saveDraft(ex: Executor, doc: ContentDoc, basedOn: number, by: string): Promise<void> {
  await ex.exec`
    INSERT INTO content_releases (status, doc, based_on, created_by)
    VALUES ('draft', ${JSON.stringify(doc)}, ${basedOn}, ${by})
    ON CONFLICT (status) WHERE status = 'draft' DO UPDATE SET doc = EXCLUDED.doc, created_by = EXCLUDED.created_by`
}

export async function deleteDraft(ex: Executor): Promise<void> {
  await ex.exec`DELETE FROM content_releases WHERE status = 'draft'`
}
