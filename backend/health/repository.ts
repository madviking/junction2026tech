import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

export async function pingDatabase(): Promise<boolean> {
  const row = await db.queryRow<{ ok: number }>`SELECT 1 AS ok`
  return row?.ok === 1
}

export async function hasVectorExtension(): Promise<boolean> {
  const row = await db.queryRow<{ n: number }>`
    SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'vector'`
  return row?.n === 1
}
