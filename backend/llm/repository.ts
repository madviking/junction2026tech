// SQL for llm_usage. Only this service writes the table.
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

export type UsageStatus = 'ok' | 'provider_error' | 'invalid_output'

export interface UsageRecord {
  feature: string
  provider: string
  model: string
  status: UsageStatus
  latencyMs: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  costUsd?: number
  error?: string
  context: Record<string, string>
}

export interface UsageRow {
  id: number
  feature: string
  provider: string
  model: string
  status: UsageStatus
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  costUsd: number | null
  latencyMs: number
  error: string | null
  context: Record<string, string>
}

export interface UsageSummaryRow {
  day: string
  provider: string
  feature: string
  calls: number
  tokens: number
  costUsd: number
}

export async function insertUsage(r: UsageRecord): Promise<void> {
  await db.exec`
    INSERT INTO llm_usage (
      feature, provider, model, status, prompt_tokens, completion_tokens,
      total_tokens, cost_usd, latency_ms, error, context
    ) VALUES (
      ${r.feature}, ${r.provider}, ${r.model}, ${r.status}, ${r.promptTokens ?? null},
      ${r.completionTokens ?? null}, ${r.totalTokens ?? null}, ${r.costUsd ?? null}::float8::numeric,
      ${r.latencyMs}, ${r.error ?? null}, ${JSON.stringify(r.context)}::text::jsonb
    )`
}

export async function countUsage(feature: string, status: UsageStatus): Promise<number> {
  const row = await db.queryRow<{ n: number }>`
    SELECT count(*)::int AS n FROM llm_usage WHERE feature = ${feature} AND status = ${status}`
  return row?.n ?? 0
}

// Total recorded spend over all time (the automatic cap compares against this).
export async function totalSpendUsd(): Promise<number> {
  const row = await db.queryRow<{ usd: number }>`
    SELECT COALESCE(sum(cost_usd), 0)::float8 AS usd FROM llm_usage`
  return row?.usd ?? 0
}

// Rows written after `afterId` for one feature, oldest first (tests and proofs).
export async function usageSince(feature: string, afterId: number): Promise<UsageRow[]> {
  const rows: UsageRow[] = []
  for await (const r of db.query<UsageRow>`
    SELECT id::int AS id, feature, provider, model, status,
           prompt_tokens AS "promptTokens", completion_tokens AS "completionTokens",
           total_tokens AS "totalTokens", cost_usd::float8 AS "costUsd",
           latency_ms AS "latencyMs", error, context
    FROM llm_usage WHERE feature = ${feature} AND id > ${afterId} ORDER BY id`) {
    rows.push(r)
  }
  return rows
}

export async function maxUsageId(): Promise<number> {
  const row = await db.queryRow<{ id: number }>`SELECT COALESCE(max(id), 0)::int AS id FROM llm_usage`
  return row?.id ?? 0
}

// Last 30 days per UTC day, provider and feature; newest day first.
export async function usageSummary(): Promise<UsageSummaryRow[]> {
  const rows: UsageSummaryRow[] = []
  for await (const r of db.query<UsageSummaryRow>`
    SELECT to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           provider, feature, count(*)::int AS calls,
           COALESCE(sum(total_tokens), 0)::int AS tokens,
           COALESCE(sum(cost_usd), 0)::float8 AS "costUsd"
    FROM llm_usage
    WHERE created_at >= now() - interval '30 days'
    GROUP BY 1, provider, feature
    ORDER BY 1 DESC, provider, feature`) {
    rows.push(r)
  }
  return rows
}
