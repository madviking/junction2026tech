// SQL for audio_blobs, audio_assets and voice_usage. Only the voice service writes them.
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

export type AudioSource = 'generated' | 'human'
export type AssetReview = 'unchecked' | 'approved'

export interface BlobRow {
  id: number
  textHash: string
  mime: string
  bytes: Buffer
}

export interface AssetRow {
  id: number
  textKey: string
  lang: string
  textHash: string
  blobId: number
  source: AudioSource
  review: AssetReview
  createdBy: string
  createdAt: Date
  approvedBy: string | null
  approvedAt: Date | null
  voiceId: string
  model: string
}

export interface UsageRow {
  provider: string
  feature: string
  model: string
  characters: number
  seconds: number
  costUsd: number
  status: string
}

export interface UsageSummaryRow {
  day: string
  provider: string
  feature: string
  characters: number
  seconds: number
  costUsd: number
}

// ---------- blobs ----------

export async function findGeneratedBlobId(textHash: string, lang: string, voiceId: string, model: string): Promise<number | null> {
  const row = await db.queryRow<{ id: string }>`
    SELECT id FROM audio_blobs
    WHERE source = 'generated' AND text_hash = ${textHash} AND lang = ${lang}
      AND voice_id = ${voiceId} AND model = ${model}`
  return row ? Number(row.id) : null
}

// Inserts a generated blob, or returns the existing one for the same key (race-safe).
export async function insertGeneratedBlob(b: { textHash: string; lang: string; voiceId: string; model: string; mime: string; bytes: Buffer }): Promise<number> {
  const row = await db.queryRow<{ id: string }>`
    INSERT INTO audio_blobs (text_hash, lang, voice_id, model, mime, bytes, source)
    VALUES (${b.textHash}, ${b.lang}, ${b.voiceId}, ${b.model}, ${b.mime}, ${b.bytes}, 'generated')
    ON CONFLICT (text_hash, lang, voice_id, model) WHERE source = 'generated' DO NOTHING
    RETURNING id`
  if (row) return Number(row.id)
  const existing = await findGeneratedBlobId(b.textHash, b.lang, b.voiceId, b.model)
  if (existing === null) throw new Error('generated blob vanished after conflict')
  return existing
}

export async function insertHumanBlob(b: { textHash: string; lang: string; mime: string; bytes: Buffer }): Promise<number> {
  const row = await db.queryRow<{ id: string }>`
    INSERT INTO audio_blobs (text_hash, lang, voice_id, model, mime, bytes, source)
    VALUES (${b.textHash}, ${b.lang}, 'human', 'human', ${b.mime}, ${b.bytes}, 'human')
    RETURNING id`
  return Number(row!.id)
}

export async function getBlob(id: number): Promise<BlobRow | null> {
  const row = await db.queryRow<{ id: string; text_hash: string; mime: string; bytes: ArrayBuffer | Uint8Array }>`
    SELECT id, text_hash, mime, bytes FROM audio_blobs WHERE id = ${id}`
  // The driver returns bytea as an ArrayBuffer.
  return row ? { id: Number(row.id), textHash: row.text_hash, mime: row.mime, bytes: Buffer.from(row.bytes as ArrayBuffer) } : null
}

// ---------- assets ----------

interface AssetDbRow {
  id: string
  text_key: string
  lang: string
  text_hash: string
  blob_id: string
  source: AudioSource
  review: AssetReview
  created_by: string
  created_at: Date
  approved_by: string | null
  approved_at: Date | null
  voice_id: string
  model: string
}

const asset = (r: AssetDbRow): AssetRow => ({
  id: Number(r.id),
  textKey: r.text_key,
  lang: r.lang,
  textHash: r.text_hash,
  blobId: Number(r.blob_id),
  source: r.source,
  review: r.review,
  createdBy: r.created_by,
  createdAt: r.created_at,
  approvedBy: r.approved_by,
  approvedAt: r.approved_at,
  voiceId: r.voice_id,
  model: r.model,
})

export async function insertAsset(a: { textKey: string; lang: string; textHash: string; blobId: number; source: AudioSource; review: AssetReview; createdBy: string }): Promise<AssetRow> {
  // Generated assets are unique per key+lang+blob; a repeat returns the existing row.
  await db.exec`
    INSERT INTO audio_assets (text_key, lang, text_hash, blob_id, source, review, created_by)
    VALUES (${a.textKey}, ${a.lang}, ${a.textHash}, ${a.blobId}, ${a.source}, ${a.review}, ${a.createdBy})
    ON CONFLICT (text_key, lang, blob_id) WHERE source = 'generated' DO NOTHING`
  const row = await db.queryRow<AssetDbRow>`
    SELECT a.*, b.voice_id, b.model FROM audio_assets a JOIN audio_blobs b ON b.id = a.blob_id
    WHERE a.text_key = ${a.textKey} AND a.lang = ${a.lang} AND a.blob_id = ${a.blobId} AND a.source = ${a.source}
    ORDER BY a.id DESC LIMIT 1`
  return asset(row!)
}

export async function getAsset(id: number): Promise<AssetRow | null> {
  const row = await db.queryRow<AssetDbRow>`
    SELECT a.*, b.voice_id, b.model FROM audio_assets a JOIN audio_blobs b ON b.id = a.blob_id WHERE a.id = ${id}`
  return row ? asset(row) : null
}

// All assets for a key in a language, newest first.
export async function assetsFor(textKey: string, lang: string): Promise<AssetRow[]> {
  const out: AssetRow[] = []
  for await (const r of db.query<AssetDbRow>`
    SELECT a.*, b.voice_id, b.model FROM audio_assets a JOIN audio_blobs b ON b.id = a.blob_id
    WHERE a.text_key = ${textKey} AND a.lang = ${lang} ORDER BY a.id DESC`) {
    out.push(asset(r))
  }
  return out
}

// All assets in a language, newest first (admin list).
export async function assetsForLang(lang: string): Promise<AssetRow[]> {
  const out: AssetRow[] = []
  for await (const r of db.query<AssetDbRow>`
    SELECT a.*, b.voice_id, b.model FROM audio_assets a JOIN audio_blobs b ON b.id = a.blob_id
    WHERE a.lang = ${lang} ORDER BY a.id DESC`) {
    out.push(asset(r))
  }
  return out
}

export async function approveAsset(id: number, actor: string, at: Date): Promise<void> {
  await db.exec`
    UPDATE audio_assets SET review = 'approved', approved_by = ${actor}, approved_at = ${at} WHERE id = ${id}`
}

// ---------- usage ----------

export async function insertUsage(u: UsageRow): Promise<void> {
  await db.exec`
    INSERT INTO voice_usage (provider, feature, model, characters, seconds, cost_usd, status)
    VALUES (${u.provider}, ${u.feature}, ${u.model}, ${u.characters}, ${u.seconds}, ${u.costUsd}, ${u.status})`
}

export async function totalSpendUsd(): Promise<number> {
  const row = await db.queryRow<{ usd: string | null }>`SELECT sum(cost_usd)::text AS usd FROM voice_usage`
  return Number(row?.usd ?? 0)
}

export async function usageSummary(): Promise<UsageSummaryRow[]> {
  const out: UsageSummaryRow[] = []
  for await (const r of db.query<{ day: string; provider: string; feature: string; characters: string; seconds: number; cost: string }>`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, provider, feature,
           sum(characters)::text AS characters, sum(seconds)::float8 AS seconds, sum(cost_usd)::text AS cost
    FROM voice_usage GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`) {
    out.push({ day: r.day, provider: r.provider, feature: r.feature, characters: Number(r.characters), seconds: r.seconds, costUsd: Number(r.cost) })
  }
  return out
}

// Tests only: removes the rows a test inserted under its own status marker.
export async function deleteUsageWithStatus(status: string): Promise<void> {
  await db.exec`DELETE FROM voice_usage WHERE status = ${status}`
}

export async function countUsage(feature: string, status: string): Promise<number> {
  const row = await db.queryRow<{ n: number }>`
    SELECT count(*)::int AS n FROM voice_usage WHERE feature = ${feature} AND status = ${status}`
  return row?.n ?? 0
}

// Column names of the voice tables (the transcript-not-stored test reads these).
export async function voiceTableColumns(): Promise<string[]> {
  const out: string[] = []
  for await (const r of db.query<{ c: string }>`
    SELECT table_name || '.' || column_name AS c FROM information_schema.columns
    WHERE table_name IN ('audio_blobs', 'audio_assets', 'voice_usage') ORDER BY 1`) {
    out.push(r.c)
  }
  return out
}
