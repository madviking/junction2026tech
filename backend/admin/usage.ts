// Admin usage page: paid provider spend by provider, feature and day (llm + voice).
import { api } from 'encore.dev/api'
import { llm, voice } from '~encore/clients'
import { requireAdmin } from '../lib/admin_actor'

export interface UsageRow {
  day: string
  service: 'llm' | 'voice'
  provider: string
  feature: string
  calls: number
  tokens: number
  characters: number
  seconds: number
  costUsd: number
}

export interface UsageTotal {
  provider: string
  costUsd: number
}

export interface UsageReport {
  rows: UsageRow[]
  totals: UsageTotal[]
  totalUsd: number
}

export const usage = api(
  { expose: true, auth: true, method: 'GET', path: '/api/admin/usage' },
  async (): Promise<UsageReport> => {
    requireAdmin()
    const [l, v] = await Promise.all([llm.usageSummary(), voice.usageSummary()])
    const rows: UsageRow[] = [
      ...l.rows.map((r) => ({ day: r.day, service: 'llm' as const, provider: r.provider, feature: r.feature, calls: r.calls, tokens: r.tokens, characters: 0, seconds: 0, costUsd: r.costUsd })),
      ...v.rows.map((r) => ({ day: r.day, service: 'voice' as const, provider: r.provider, feature: r.feature, calls: 0, tokens: 0, characters: r.characters, seconds: r.seconds, costUsd: r.costUsd })),
    ].sort((a, b) => b.day.localeCompare(a.day) || a.provider.localeCompare(b.provider) || a.feature.localeCompare(b.feature))
    const byProvider = new Map<string, number>()
    for (const r of rows) byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + r.costUsd)
    const totals = [...byProvider].map(([provider, costUsd]) => ({ provider, costUsd })).sort((a, b) => b.costUsd - a.costUsd)
    return { rows, totals, totalUsd: totals.reduce((s, t) => s + t.costUsd, 0) }
  },
)
