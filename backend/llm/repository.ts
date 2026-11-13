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
  error?: string
  context: Record<string, string>
}

export async function insertUsage(r: UsageRecord): Promise<void> {
  await db.exec`
    INSERT INTO llm_usage (
      feature, provider, model, status, prompt_tokens, completion_tokens,
      total_tokens, latency_ms, error, context
    ) VALUES (
      ${r.feature}, ${r.provider}, ${r.model}, ${r.status}, ${r.promptTokens ?? null},
      ${r.completionTokens ?? null}, ${r.totalTokens ?? null}, ${r.latencyMs},
      ${r.error ?? null}, ${JSON.stringify(r.context)}::text::jsonb
    )`
}

export async function countUsage(feature: string, status: UsageStatus): Promise<number> {
  const row = await db.queryRow<{ n: number }>`
    SELECT count(*)::int AS n FROM llm_usage WHERE feature = ${feature} AND status = ${status}`
  return row?.n ?? 0
}
